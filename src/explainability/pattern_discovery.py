"""
Pattern discovery engine for AviSafe.

Aggregates SHAP explanations across accident records to
identify recurring aviation safety patterns.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from src.core.logger import LoggerManager
from src.explainability.shap_explainer import SHAPExplanation


@dataclass(slots=True)
class AviationPattern:
    """
    Represents a discovered aviation safety pattern.
    """

    accident_category: str

    dominant_features: list[str]

    average_importance: float

    occurrence_count: int

    confidence: float


class PatternDiscovery:
    """
    Mines aviation safety patterns from SHAP explanations.
    """

    def __init__(self):

        self.logger = LoggerManager.get_logger(__name__)

    def discover(

        self,

        explanation: SHAPExplanation,

        labels: pd.Series,

        top_n: int = 5,

    ) -> list[AviationPattern]:

        """
        Discover recurring feature patterns
        for every accident category.
        """

        self.logger.info(
            "Discovering aviation safety patterns."
        )

        patterns = []

        for category in sorted(labels.unique()):

            mask = labels == category

            values = explanation.shap_values[mask]

            if values.ndim == 3:

                values = values.mean(axis=2)

            importance = abs(values).mean(axis=0)

            dataframe = pd.DataFrame(
                {
                    "Feature": explanation.feature_names,
                    "Importance": importance,
                }
            )

            dataframe = dataframe.sort_values(
                "Importance",
                ascending=False,
            )

            top_features = dataframe.head(top_n)

            confidence = (
                top_features["Importance"].mean()
                / dataframe["Importance"].max()
            )

            patterns.append(

                AviationPattern(

                    accident_category=category,

                    dominant_features=top_features[
                        "Feature"
                    ].tolist(),

                    average_importance=float(
                        top_features[
                            "Importance"
                        ].mean()
                    ),

                    occurrence_count=int(mask.sum()),

                    confidence=float(confidence),

                )

            )

        return patterns

    def to_dataframe(

        self,

        patterns: list[AviationPattern],

    ) -> pd.DataFrame:
        """
        Convert discovered patterns into a table.
        """

        rows = []

        for pattern in patterns:

            rows.append(

                {

                    "Category": pattern.accident_category,

                    "Top Features": ", ".join(
                        pattern.dominant_features
                    ),

                    "Average Importance":
                        pattern.average_importance,

                    "Occurrences":
                        pattern.occurrence_count,

                    "Confidence":
                        pattern.confidence,

                }

            )

        return pd.DataFrame(rows)

    def dominant_feature_frequency(

        self,

        patterns: list[AviationPattern],

    ) -> pd.DataFrame:
        """
        Count how often each feature appears
        across discovered patterns.
        """

        frequency = {}

        for pattern in patterns:

            for feature in pattern.dominant_features:

                frequency[feature] = (
                    frequency.get(feature, 0) + 1
                )

        dataframe = pd.DataFrame(

            {

                "Feature": list(frequency.keys()),

                "Frequency": list(frequency.values()),

            }

        )

        return dataframe.sort_values(

            "Frequency",

            ascending=False,

        ).reset_index(drop=True)