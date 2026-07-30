"""
SHAP explainability module for AviSafe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
import shap

from src.core.logger import LoggerManager
from src.explainability.base_explainer import BaseExplainer


@dataclass(slots=True)
class SHAPExplanation:
    """
    Structured SHAP explanation.
    """

    shap_values: np.ndarray

    expected_value: Any

    feature_names: list[str]

    data: pd.DataFrame


class SHAPExplainer(BaseExplainer):
    """
    Explain trained machine learning models using SHAP.
    """

    def __init__(self) -> None:

        self.logger = LoggerManager.get_logger(__name__)

        self.model = None

        self.explainer = None

        self.training_data = None

        self._cached_explanations = None

    @property
    def name(self) -> str:

        return "SHAP"

    def fit(
        self,
        model: Any,
        X_train: pd.DataFrame,
    ) -> None:
        """
        Initialize SHAP.
        """

        self.logger.info(
            "Initializing SHAP explainer."
        )

        self.model = model

        self.training_data = X_train

        try:
            # Tree-path-dependent TreeSHAP: exact, doesn't need a
            # background dataset, and is the only feature_perturbation
            # mode SHAP currently supports for XGBoost/LightGBM models
            # whose trees contain categorical splits.
            self.explainer = shap.TreeExplainer(
                model,
                feature_perturbation="tree_path_dependent",
            )
        except Exception:
            self.explainer = shap.Explainer(
                model,
                X_train,
            )

    def explain(
        self,
        X: pd.DataFrame,
    ) -> SHAPExplanation:
        """
        Compute SHAP values.
        """

        self.logger.info(
            "Computing SHAP values."
        )

        explanation = self.explainer(X)

        self._cached_explanations = explanation

        return SHAPExplanation(

            shap_values=explanation.values,

            expected_value=explanation.base_values,

            feature_names=list(X.columns),

            data=X,

        )

    def summary(self):

        """
        Return mean absolute SHAP values.
        """

        if self._cached_explanations is None:

            raise RuntimeError(
                "No SHAP explanation available."
            )

        values = np.abs(
            self._cached_explanations.values
        )

        importance = values.mean(axis=0)

        dataframe = pd.DataFrame(
            {
                "Feature": self.training_data.columns,
                "MeanAbsSHAP": importance,
            }
        )

        return dataframe.sort_values(
            "MeanAbsSHAP",
            ascending=False,
        ).reset_index(drop=True)

    def local_explanation(
        self,
        index: int,
        class_index: int | None = None,
    ) -> pd.DataFrame:
        """
        Return SHAP values for one record.

        For multiclass models, shap_values has shape
        (n_samples, n_features, n_classes). class_index selects which
        class's contributions to report -- pass the predicted class's
        index for a "why did the model predict this" explanation. If
        omitted, contributions are averaged across classes.
        """

        if self._cached_explanations is None:

            raise RuntimeError(
                "Explain the dataset first."
            )

        values = self._cached_explanations.values[index]

        if values.ndim == 2:

            values = (
                values[:, class_index]
                if class_index is not None
                else values.mean(axis=1)
            )

        dataframe = pd.DataFrame(
            {
                "Feature": self.training_data.columns,
                "Contribution": values,
            }
        )

        dataframe["Absolute"] = (
            dataframe["Contribution"]
            .abs()
        )

        return dataframe.sort_values(
            "Absolute",
            ascending=False,
        )

    def top_features(
        self,
        top_n: int = 20,
    ) -> pd.DataFrame:
        """
        Return top globally important features.
        """

        summary = self.summary()

        return summary.head(top_n)

    def interaction_values(
        self,
    ) -> Any:
        """
        Compute SHAP interaction values when supported.
        """

        if hasattr(
            self.explainer,
            "shap_interaction_values",
        ):

            return self.explainer.shap_interaction_values(
                self.training_data
            )

        return None