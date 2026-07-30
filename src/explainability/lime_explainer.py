"""
LIME explainability module for AviSafe.

Provides local explanations for individual predictions using
LIME (Local Interpretable Model-agnostic Explanations).
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

# Dynamically import LIME's LimeTabularExplainer from either
# 'lime.lime_tabular' (package) or 'lime_tabular' (module).
LimeTabularExplainer = None
_lime_module = None
try:
    _lime_module = importlib.import_module("lime.lime_tabular")
except ImportError:
    try:
        _lime_module = importlib.import_module("lime_tabular")
    except ImportError:
        _lime_module = None

if _lime_module is not None:
    LimeTabularExplainer = getattr(_lime_module, "LimeTabularExplainer")
else:
    # Provide a clear runtime error if LIME is not installed when used.
    class _MissingLimeExplainer:
        def __init__(self, *args, **kwargs):
            raise ImportError(
                "LIME is required for LIMEExplainer but could not be imported. "
                "Install 'lime' package via pip."
            )

    LimeTabularExplainer = _MissingLimeExplainer

from src.core.logger import LoggerManager
from src.explainability.base_explainer import BaseExplainer


@dataclass(slots=True)
class LIMEExplanation:
    """
    Structured LIME explanation.
    """

    record_index: int

    predicted_class: Any

    probabilities: np.ndarray | None

    explanation: list[tuple[str, float]]


class LIMEExplainer(BaseExplainer):
    """
    LIME implementation for AviSafe.
    """

    def __init__(self) -> None:

        self.logger = LoggerManager.get_logger(__name__)

        self.model = None

        self.explainer = None

        self.training_data = None

        self.feature_names = None

        self.class_names = None

    @property
    def name(self) -> str:

        return "LIME"

    def fit(
        self,
        model: Any,
        X_train: pd.DataFrame,
        class_names: list[str] | None = None,
    ) -> None:
        """
        Build the LIME explainer.
        """

        self.logger.info(
            "Initializing LIME explainer."
        )

        self.model = model

        self.training_data = X_train

        self.feature_names = list(X_train.columns)

        self.class_names = class_names

        self.explainer = LimeTabularExplainer(

            training_data=X_train.values,

            feature_names=self.feature_names,

            class_names=class_names,

            mode="classification",

            discretize_continuous=True,

            random_state=42,

        )

    def explain(
        self,
        X: pd.DataFrame,
    ):
        """
        Explain the first observation.

        Required by BaseExplainer.
        """

        return self.explain_instance(X, 0)

    def explain_instance(
        self,
        X: pd.DataFrame,
        index: int,
        num_features: int = 10,
    ) -> LIMEExplanation:
        """
        Explain one prediction.
        """

        self.logger.info(
            "Generating LIME explanation for record %d",
            index,
        )

        row = X.iloc[index]

        explanation = self.explainer.explain_instance(

            data_row=row.values,

            predict_fn=self.model.predict_proba,

            num_features=num_features,

        )

        prediction = self.model.predict(
            row.to_frame().T
        )[0]

        probabilities = None

        if hasattr(
            self.model,
            "predict_proba",
        ):

            probabilities = self.model.predict_proba(
                row.to_frame().T
            )[0]

        return LIMEExplanation(

            record_index=index,

            predicted_class=prediction,

            probabilities=probabilities,

            explanation=explanation.as_list(),

        )

    def summary(self):
        """
        LIME does not produce a global summary.
        """

        raise NotImplementedError(
            "LIME generates local explanations only."
        )

    @staticmethod
    def to_dataframe(
        explanation: LIMEExplanation,
    ) -> pd.DataFrame:
        """
        Convert explanation into a dataframe.
        """

        return pd.DataFrame(

            explanation.explanation,

            columns=[

                "Feature",

                "Contribution",

            ],

        ).sort_values(

            "Contribution",

            key=lambda s: s.abs(),

            ascending=False,

        ).reset_index(drop=True)