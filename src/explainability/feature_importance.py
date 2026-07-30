"""
Global feature importance analysis for AviSafe.

Aggregates SHAP values into interpretable feature rankings
for global and accident-specific analysis.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from src.core.logger import LoggerManager
from src.explainability.shap_explainer import SHAPExplanation


@dataclass(slots=True)
class FeatureImportanceResult:
    """
    Stores feature importance rankings.
    """

    rankings: pd.DataFrame

    top_features: pd.DataFrame

    feature_count: int


class FeatureImportanceAnalyzer:
    """
    Performs global feature importance analysis
    using SHAP values.
    """

    def __init__(self) -> None:

        self.logger = LoggerManager.get_logger(__name__)

    def global_importance(
        self,
        explanation: SHAPExplanation,
    ) -> FeatureImportanceResult:
        """
        Compute global feature importance.
        """

        self.logger.info(
            "Computing global SHAP importance."
        )

        values = explanation.shap_values

        if values.ndim == 3:
            values = np.mean(
                np.abs(values),
                axis=2,
            )

        importance = np.abs(values).mean(axis=0)

        dataframe = pd.DataFrame(
            {
                "Feature": explanation.feature_names,
                "Importance": importance,
            }
        )

        dataframe = dataframe.sort_values(
            "Importance",
            ascending=False,
        ).reset_index(drop=True)

        return FeatureImportanceResult(
            rankings=dataframe,
            top_features=dataframe.head(20),
            feature_count=len(dataframe),
        )

    def category_importance(
        self,
        explanation: SHAPExplanation,
        labels: pd.Series,
        category: str,
    ) -> pd.DataFrame:
        """
        Compute feature importance for a
        specific accident category.
        """

        self.logger.info(
            "Computing feature importance for %s",
            category,
        )

        mask = labels == category

        values = explanation.shap_values[mask]

        if values.ndim == 3:
            values = np.mean(
                np.abs(values),
                axis=2,
            )

        importance = np.abs(values).mean(axis=0)

        dataframe = pd.DataFrame(
            {
                "Feature": explanation.feature_names,
                "Importance": importance,
            }
        )

        return dataframe.sort_values(
            "Importance",
            ascending=False,
        ).reset_index(drop=True)

    def compare_models(
        self,
        model_results: dict[str, SHAPExplanation],
    ) -> pd.DataFrame:
        """
        Compare feature importance across models.

        Parameters
        ----------
        model_results
            Dictionary mapping model name to SHAP explanation.

        Returns
        -------
        pd.DataFrame
        """

        comparison = None

        for model_name, explanation in model_results.items():

            values = explanation.shap_values

            if values.ndim == 3:
                values = np.mean(
                    np.abs(values),
                    axis=2,
                )

            importance = np.abs(values).mean(axis=0)

            dataframe = pd.DataFrame(
                {
                    "Feature": explanation.feature_names,
                    model_name: importance,
                }
            )

            if comparison is None:

                comparison = dataframe

            else:

                comparison = comparison.merge(
                    dataframe,
                    on="Feature",
                    how="outer",
                )

        return comparison.fillna(0)

    def stable_features(
        self,
        comparison_table: pd.DataFrame,
        top_n: int = 15,
    ) -> pd.DataFrame:
        """
        Identify consistently important features
        across all models.
        """

        numeric = comparison_table.drop(
            columns="Feature"
        )

        comparison_table["MeanImportance"] = numeric.mean(
            axis=1
        )

        comparison_table["StdImportance"] = numeric.std(
            axis=1
        )

        return comparison_table.sort_values(
            "MeanImportance",
            ascending=False,
        ).head(top_n).reset_index(drop=True)