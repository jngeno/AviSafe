"""
Recommendation engine for AviSafe.

Generates evidence-based aviation safety recommendations
from discovered accident patterns.
"""

from __future__ import annotations

from dataclasses import dataclass
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

                }

            )

        return pd.DataFrame(rows)