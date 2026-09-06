"""
Alert computation for the Alert Centre.

Alerts are not a stored table -- they are computed live, on every
request, from conditions already present in real data across the
recommendations, safety actions, risk register, and incidents tables.
Each alert carries a deterministic `alert_key` (derived from its
source table + row id) so acknowledgement can be recorded against it
in `alert_acknowledgements` without persisting the alert itself, which
would risk drifting out of sync with the data that produced it.

Severity and the recommended action are fixed, rule-based mappings
per alert category -- not an AI-generated summary -- so they are
exactly as trustworthy as the row that triggered them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import models


@dataclass(slots=True)
class AlertItem:
    alert_key: str
    category: str
    severity: str
    title: str
    description: str
    recommended_action: str
    source_type: str
    source_id: int
    relevant_date: date | None = None
    context: dict = field(default_factory=dict)


def _priority_severity(priority: str) -> str:
    if priority in ("Critical",):
        return "Critical"
    if priority in ("High",):
        return "High"
    if priority in ("Medium",):
        return "Moderate"
    return "Low"


def _risk_level_severity(risk_level: str) -> str:
    return risk_level  # Already Low/Moderate/High/Critical


def compute_alerts(db: Session, *, today: date | None = None) -> list[AlertItem]:
    """
    Evaluate every alert-worthy condition against live data and return
    the full set, newest/most-severe first is left to the caller.
    """
    today = today or date.today()
    alerts: list[AlertItem] = []

    # 1. Overdue recommendations
    stmt = select(models.SafetyRecommendationRecord).where(
        models.SafetyRecommendationRecord.due_date.is_not(None),
        models.SafetyRecommendationRecord.due_date < today,
        models.SafetyRecommendationRecord.status.notin_(["Completed", "Dismissed"]),
    )
    for rec in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"overdue_recommendation:{rec.id}",
                category="Overdue recommendation",
                severity=_priority_severity(rec.priority),
                title=f"Recommendation #{rec.id} is overdue",
                description=rec.recommendation[:200],
                recommended_action=f"Follow up with {rec.stakeholder or 'the assigned stakeholder'} or update its due date in the Safety Recommendation Centre.",
                source_type="recommendation",
                source_id=rec.id,
                relevant_date=rec.due_date,
            )
        )

    # 2. Overdue safety actions
    stmt = select(models.SafetyActionRecord).where(
        models.SafetyActionRecord.due_date.is_not(None),
        models.SafetyActionRecord.due_date < today,
        models.SafetyActionRecord.status != "Closed",
    )
    for act in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"overdue_action:{act.id}",
                category="Overdue safety action",
                severity=_priority_severity(act.priority),
                title=f"Safety action #{act.id} is overdue",
                description=act.title,
                recommended_action=f"Follow up with {act.owner or 'the assigned owner'} on Safety Actions, or update its due date.",
                source_type="safety_action",
                source_id=act.id,
                relevant_date=act.due_date,
            )
        )

    # 3. Overdue risk register reviews
    stmt = select(models.RiskRegisterEntry).where(
        models.RiskRegisterEntry.review_date.is_not(None),
        models.RiskRegisterEntry.review_date < today,
        models.RiskRegisterEntry.status != "Closed",
    )
    for risk in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"overdue_risk_review:{risk.id}",
                category="Overdue risk review",
                severity=_risk_level_severity(risk.risk_level),
                title=f"Risk review overdue: {risk.title}",
                description=f"Risk score {risk.risk_score} ({risk.risk_level}) - review was due {risk.review_date}.",
                recommended_action=f"Re-assess with {risk.owner or 'the risk owner'} on the Risk Register and set a new review date.",
                source_type="risk_register",
                source_id=risk.id,
                relevant_date=risk.review_date,
            )
        )

    # 4. Unaddressed high/critical risks (still at "Identified", never
    #    progressed toward mitigation)
    stmt = select(models.RiskRegisterEntry).where(
        models.RiskRegisterEntry.risk_level.in_(["Critical", "High"]),
        models.RiskRegisterEntry.status == "Identified",
    )
    for risk in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"unaddressed_risk:{risk.id}",
                category="Unaddressed high risk",
                severity=risk.risk_level,
                title=f"{risk.risk_level} risk not yet triaged: {risk.title}",
                description=f"Risk score {risk.risk_score} - still at 'Identified', no mitigation started.",
                recommended_action="Assign an owner and move this risk into mitigation on the Risk Register.",
                source_type="risk_register",
                source_id=risk.id,
                relevant_date=None,
            )
        )

    # 5. Incidents flagged Action Required
    stmt = select(models.IncidentRecord).where(
        models.IncidentRecord.status == "Action Required",
    )
    for inc in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"incident_action_required:{inc.id}",
                category="Incident needs action",
                severity=inc.severity,
                title=f"Incident #{inc.id} flagged Action Required: {inc.title}",
                description=inc.description[:200],
                recommended_action="Determine and log the corrective action in Incident Management, or open a Safety Action.",
                source_type="incident",
                source_id=inc.id,
                relevant_date=inc.occurred_at,
            )
        )

    # 6. High/Critical severity incidents with no investigator assigned
    stmt = select(models.IncidentRecord).where(
        models.IncidentRecord.severity.in_(["Critical", "High"]),
        models.IncidentRecord.assigned_investigator == "",
        models.IncidentRecord.status.notin_(["Resolved", "Closed"]),
    )
    for inc in db.execute(stmt).scalars().all():
        alerts.append(
            AlertItem(
                alert_key=f"unassigned_incident:{inc.id}",
                category="Unassigned high-severity incident",
                severity=inc.severity,
                title=f"{inc.severity}-severity incident unassigned: {inc.title}",
                description=inc.description[:200],
                recommended_action="Assign an investigator in Incident Management.",
                source_type="incident",
                source_id=inc.id,
                relevant_date=inc.occurred_at,
            )
        )

    return alerts


_SEVERITY_ORDER = {"Critical": 0, "High": 1, "Moderate": 2, "Low": 3}


def sort_alerts(alerts: list[AlertItem]) -> list[AlertItem]:
    return sorted(alerts, key=lambda a: _SEVERITY_ORDER.get(a.severity, 9))
