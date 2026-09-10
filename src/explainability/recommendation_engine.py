"""
Recommendation engine for AviSafe.

Generates evidence-based aviation safety recommendations from
discovered accident patterns, each classified against Reason's (1990)
Swiss Cheese Model layer and Shappell & Wiegmann's (2000, 2003) HFACS
taxonomy -- both already surveyed in the AviSafe literature review --
plus the specific ICAO document each recommendation is grounded in.
This is real domain classification of the existing rule content, not
new data: every {layer, HFACS category, ICAO reference} below is a
literal reading of the recommendation text against the published
frameworks, not invented metadata.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from src.core.logger import LoggerManager
from src.explainability.pattern_discovery import AviationPattern


@dataclass(slots=True)
class SafetyRecommendation:
    """
    Represents a generated safety recommendation.
    """

    accident_category: str

    priority: str

    recommendation: str

    evidence: list[str]

    stakeholder: str

    confidence: float

    icao_reference: str = ""

    hfacs_classification: str = ""

    swiss_cheese_layer: str = ""

    status: str = "Open"

    assigned_officer: str | None = None

    due_date: str | None = None
    
    # Enhanced depth fields
    impact_assessment: str = ""
    
    implementation_steps: list[str] = None
    
    affected_systems: list[str] = None
    
    regulatory_framework: str = ""
    
    industry_precedent: str = ""
    
    risk_mitigation_factor: float = 0.0
    
    related_accidents_count: int = 0

    def __post_init__(self):
        if self.implementation_steps is None:
            self.implementation_steps = []
        if self.affected_systems is None:
            self.affected_systems = []


class RecommendationEngine:
    """
    Generates safety recommendations from discovered
    aviation accident patterns.
    """

    def __init__(self) -> None:

        self.logger = LoggerManager.get_logger(__name__)

        self.rule_base = self._build_rule_base()

    def generate(
        self,
        patterns: List[AviationPattern],
    ) -> List[SafetyRecommendation]:
        """
        Generate recommendations from patterns.
        """

        recommendations = []

        for pattern in patterns:

            rules = self.rule_base.get(
                pattern.accident_category,
                [],
            )

            for rule in rules:

                if any(
                    feature in pattern.dominant_features
                    for feature in rule["features"]
                ):

                    recommendations.append(

                        SafetyRecommendation(

                            accident_category=pattern.accident_category,

                            priority=rule["priority"],

                            recommendation=rule["recommendation"],

                            evidence=pattern.dominant_features,

                            stakeholder=rule["stakeholder"],

                            confidence=pattern.confidence,

                            icao_reference=rule.get("icao_reference", ""),

                            hfacs_classification=rule.get("hfacs_classification", ""),

                            swiss_cheese_layer=rule.get("swiss_cheese_layer", ""),

                        )

                    )

        return recommendations

    @staticmethod
    def _build_rule_base():
        """
        NOTE on "features" lists: SHAP tends to surface a risk
        factor's raw/coded representation (e.g. Weather_Condition,
        Broad_Phase_Of_Flight) ahead of the hand-engineered composite
        risk score built from it (Weather_Risk, Flight_Phase_Risk) --
        both name the same underlying signal, so each entry lists both
        forms. "Terrain_Risk", "Runway_Surface", and "Wind_Speed" have
        no corresponding column anywhere in the pipeline (no terrain
        elevation or runway/wind data exists in the source NTSB
        export), so those specific rules cannot currently fire; they
        are left in place as a marker for what additional data would
        unlock. "Human_Severity_Risk" and "Aircraft_Age" are similarly
        dormant by design: the former is an accident-outcome variable
        deliberately excluded from the feature set (see
        _OUTCOME_COLUMNS in train_pipeline.py), and the latter
        requires an aircraft-year field the source dataset lacks.

        NOTE on classification fields: every rule below fixes a gap in
        training, procedure, or organizational resourcing rather than
        describing a specific pilot's in-the-moment action, so each is
        classified under HFACS's "Organizational Influences" tier
        (Shappell & Wiegmann, 2000) -- the Swiss Cheese Model's
        outermost, most systemic layer (Reason, 1990) -- except the
        two currently-dormant environmental rules (CFIT High, Runway
        Excursion High), which describe physical-environment
        conditions and are classified under "Preconditions for Unsafe
        Acts" accordingly.

        NOTE on the geographic/temporal/phase rules added below (2026-08):
        the original six rules above were written before this project ran
        a 7-year-recent-data split, and on that split's SHAP output,
        `Country`, `Latitude`, `Longitude`, and `Event_Year` are top-5
        dominant features for all three categories, while `Weather_*` and
        `Aircraft_Age` are not -- meaning LOC-I in particular had zero
        matching rule (see O6 addition / notebook Step 14 gap). These new
        rules cover that gap directly. Unlike the six above, this text is
        new authored content, not a pre-existing rule re-classified
        against the frameworks -- the ICAO references are a best-effort
        match and should be spot-checked against the actual document
        text before being treated as citation-grade.
        """

        return {

            "CFIT": [

                {

                    "features": [

                        "Terrain_Risk",

                        "Weather_Risk",

                        "Weather_Condition",

                        "Weather_Code",

                    ],

                    "priority": "High",

                    "stakeholder": "Flight Operations",

                    "recommendation":
                        (
                            "Strengthen terrain awareness "
                            "training and instrument "
                            "approach procedures."
                        ),

                    "icao_reference": "ICAO Doc 9859 (SMM); Annex 6 Part I (TAWS/EGPWS equipage)",

                    "hfacs_classification": "Preconditions for Unsafe Acts -- Environmental Factors (Physical Environment)",

                    "swiss_cheese_layer": "Preconditions for Unsafe Acts",

                },

                {

                    "features": [

                        "Flight_Phase_Risk",

                        "Broad_Phase_Of_Flight",

                        "Flight_Phase_Code",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Training Department",

                    "recommendation":
                        (
                            "Review approach phase SOPs "
                            "and stabilized approach "
                            "criteria."
                        ),

                    "icao_reference": "ICAO Doc 8168 (PANS-OPS) -- stabilized approach criteria",

                    "hfacs_classification": "Organizational Influences -- Procedural Guidance",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Country",

                        "Latitude",

                        "Longitude",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Regulatory Affairs",

                    "recommendation":
                        (
                            "Analyze CFIT accident geographic "
                            "concentration to identify "
                            "jurisdiction- or terrain-specific "
                            "regulatory, charting, or "
                            "infrastructure gaps (e.g. missing "
                            "instrument approach procedures, "
                            "inadequate obstacle charting)."
                        ),

                    "icao_reference": "ICAO Annex 4 (charting); Annex 15 (Aeronautical Information Services)",

                    "hfacs_classification": "Organizational Influences -- Regulatory/Resource Gaps",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Event_Year",

                    ],

                    "priority": "Low",

                    "stakeholder": "Safety Data & Analytics",

                    "recommendation":
                        (
                            "Investigate the temporal trend in "
                            "CFIT rate to determine whether it "
                            "reflects fleet/avionics composition "
                            "changes, regulatory changes, or "
                            "reporting practice shifts over the "
                            "analyzed period."
                        ),

                    "icao_reference": "ICAO Doc 9859 (SMM) -- safety trend monitoring",

                    "hfacs_classification": "Organizational Influences -- Safety Data Analysis",

                    "swiss_cheese_layer": "Organizational Influences",

                },

            ],

            "LOC-I": [

                {

                    "features": [

                        "Human_Severity_Risk",

                        "Weather_Risk",

                        "Weather_Condition",

                        "Weather_Code",

                    ],

                    "priority": "High",

                    "stakeholder": "Training Department",

                    "recommendation":
                        (
                            "Increase upset prevention "
                            "and recovery training."
                        ),

                    "icao_reference": "ICAO Doc 10011 (Manual on Aeroplane Upset Prevention and Recovery Training)",

                    "hfacs_classification": "Organizational Influences -- Training Program Issues",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Aircraft_Age",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Maintenance",

                    "recommendation":
                        (
                            "Review ageing aircraft "
                            "inspection programmes."
                        ),

                    "icao_reference": "ICAO Annex 6 Part I -- Continuing Airworthiness",

                    "hfacs_classification": "Organizational Influences -- Resource Management (Maintenance)",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Flight_Phase_Risk",

                        "Broad_Phase_Of_Flight",

                        "Flight_Phase_Code",

                    ],

                    "priority": "High",

                    "stakeholder": "Training Department",

                    "recommendation":
                        (
                            "Target upset-prevention and "
                            "recovery training specifically at "
                            "the flight phases most associated "
                            "with LOC-I events (e.g. "
                            "maneuvering, initial climb, "
                            "go-around), not only generic "
                            "recurrent training."
                        ),

                    "icao_reference": "ICAO Doc 10011 (UPRT Manual) -- phase-specific application",

                    "hfacs_classification": "Organizational Influences -- Training Program Issues",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Country",

                        "Latitude",

                        "Longitude",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Regulatory Affairs",

                    "recommendation":
                        (
                            "Analyze LOC-I geographic "
                            "concentration to identify whether "
                            "specific operating environments "
                            "(mountainous/high-density-altitude "
                            "regions, specific national "
                            "training pipelines) are "
                            "over-represented."
                        ),

                    "icao_reference": "ICAO Annex 6 Part I; Doc 9859 (SMM) -- regional risk analysis",

                    "hfacs_classification": "Organizational Influences -- Regulatory/Resource Gaps",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Event_Year",

                    ],

                    "priority": "Low",

                    "stakeholder": "Safety Data & Analytics",

                    "recommendation":
                        (
                            "Investigate the temporal trend in "
                            "LOC-I rate to determine whether it "
                            "reflects changes in fleet "
                            "automation/envelope-protection "
                            "equipage, training standards, or "
                            "reporting practice over the "
                            "analyzed period."
                        ),

                    "icao_reference": "ICAO Doc 9859 (SMM) -- safety trend monitoring",

                    "hfacs_classification": "Organizational Influences -- Safety Data Analysis",

                    "swiss_cheese_layer": "Organizational Influences",

                },

            ],

            "Runway Excursion": [

                {

                    "features": [

                        "Runway_Surface",

                        "Wind_Speed",

                    ],

                    "priority": "High",

                    "stakeholder": "Airport Authority",

                    "recommendation":
                        (
                            "Improve runway condition "
                            "monitoring and braking "
                            "action reporting."
                        ),

                    "icao_reference": "ICAO Annex 14; Global Reporting Format (GRF) for runway surface condition",

                    "hfacs_classification": "Preconditions for Unsafe Acts -- Environmental Factors (Physical Environment)",

                    "swiss_cheese_layer": "Preconditions for Unsafe Acts",

                },

                {

                    "features": [

                        "Flight_Phase_Risk",

                        "Broad_Phase_Of_Flight",

                        "Flight_Phase_Code",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Flight Operations",

                    "recommendation":
                        (
                            "Review landing performance "
                            "calculations and stabilized "
                            "approach policy."
                        ),

                    "icao_reference": "ICAO Doc 8168 (PANS-OPS) -- landing performance assessment",

                    "hfacs_classification": "Organizational Influences -- Procedural Guidance",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Country",

                        "Latitude",

                        "Longitude",

                    ],

                    "priority": "Medium",

                    "stakeholder": "Regulatory Affairs",

                    "recommendation":
                        (
                            "Analyze runway excursion "
                            "geographic concentration to "
                            "identify whether specific "
                            "airports/jurisdictions are "
                            "over-represented, pointing at "
                            "local runway infrastructure or "
                            "procedural gaps rather than a "
                            "generic fleet-wide issue."
                        ),

                    "icao_reference": "ICAO Annex 14; Doc 9859 (SMM) -- regional risk analysis",

                    "hfacs_classification": "Organizational Influences -- Regulatory/Resource Gaps",

                    "swiss_cheese_layer": "Organizational Influences",

                },

                {

                    "features": [

                        "Event_Year",

                    ],

                    "priority": "Low",

                    "stakeholder": "Safety Data & Analytics",

                    "recommendation":
                        (
                            "Investigate the temporal trend in "
                            "runway excursion rate to determine "
                            "whether it reflects changes in "
                            "runway infrastructure/reporting "
                            "(e.g. Global Reporting Format "
                            "adoption), fleet braking "
                            "technology, or reporting practice "
                            "over the analyzed period."
                        ),

                    "icao_reference": "ICAO Doc 9859 (SMM) -- safety trend monitoring",

                    "hfacs_classification": "Organizational Influences -- Safety Data Analysis",

                    "swiss_cheese_layer": "Organizational Influences",

                },

            ],

        }

    @staticmethod
    def to_dataframe(
        recommendations: List[SafetyRecommendation],
    ):

        import pandas as pd

        rows = []

        for recommendation in recommendations:

            rows.append(

                {

                    "Category":
                        recommendation.accident_category,

                    "Priority":
                        recommendation.priority,

                    "Recommendation":
                        recommendation.recommendation,

                    "Stakeholder":
                        recommendation.stakeholder,

                    "Confidence":
                        recommendation.confidence,

                    "Evidence":
                        ", ".join(
                            recommendation.evidence
                        ),

                    "ICAO Reference":
                        recommendation.icao_reference,

                    "HFACS Classification":
                        recommendation.hfacs_classification,

                    "Swiss Cheese Layer":
                        recommendation.swiss_cheese_layer,

                    "Status":
                        recommendation.status,

                    "Assigned Officer":
                        recommendation.assigned_officer or "",

                    "Due Date":
                        recommendation.due_date or "",

                }

            )

        return pd.DataFrame(rows)
