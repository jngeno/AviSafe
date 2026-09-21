"""
Central explanation engine for AviSafe.

Coordinates SHAP and LIME explainers and produces
a unified explanation object for downstream analysis.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import pandas as pd

from src.core.logger import LoggerManager
from src.explainability.lime_explainer import (
    LIMEExplainer,
    LIMEExplanation,
)
from src.explainability.shap_explainer import (
    SHAPExplainer,
    SHAPExplanation,
)


@dataclass(slots=True)
class UnifiedExplanation:
    """
    Combined SHAP and LIME explanation.
    """

    model_name: str

    record_index: int

    prediction: Any

    probability: float | None

    shap: SHAPExplanation

    lime: LIMEExplanation

    agreement_score: float

    generated_at: datetime


class ExplanationEngine:
    """
    Coordinates all explainability modules.
    """

    def __init__(
        self,
        shap_explainer: SHAPExplainer,
        lime_explainer: LIMEExplainer,
    ) -> None:

        self.logger = LoggerManager.get_logger(__name__)

        self.shap = shap_explainer

        self.lime = lime_explainer

    def explain_record(
        self,
        model,
        X_test: pd.DataFrame,
        index: int,
    ) -> UnifiedExplanation:
        """
        Generate a unified explanation for one record.
        """

        self.logger.info(
            "Generating explanation for record %d",
            index,
        )

        shap_result = self.shap.explain(X_test)

        lime_result = self.lime.explain_instance(
            X_test,
            index=index,
        )

        prediction = model.predict(
            X_test.iloc[[index]]
        )[0]

        probability = None

        if hasattr(model, "predict_proba"):

            probability = float(
                model.predict_proba(
                    X_test.iloc[[index]]
                ).max()
            )

        agreement = self.compute_agreement(
            shap_result,
            lime_result,
            index=index,
        )

        return UnifiedExplanation(

            model_name=model.__class__.__name__,

            record_index=index,

            prediction=prediction,

            probability=probability,

            shap=shap_result,

            lime=lime_result,

            agreement_score=agreement,

            generated_at=datetime.utcnow(),

        )

    def compute_agreement(
        self,
        shap_result: SHAPExplanation,
        lime_result: LIMEExplanation,
        *,
        index: int,
        top_n: int = 10,
    ) -> float:
        """
        Compute SHAP-LIME agreement using Jaccard similarity.
        """

        shap_local = self.shap.local_explanation(index)

        shap_features = set(
            shap_local.head(top_n)["Feature"]
        )

        lime_features = set(
            feature
            for feature, _ in lime_result.explanation
        )

        union = shap_features | lime_features

        if not union:
            return 0.0

        intersection = shap_features & lime_features

        return len(intersection) / len(union)

    def batch_explanations(
        self,
        model,
        X_test: pd.DataFrame,
    ) -> list[UnifiedExplanation]:
        """
        Explain every record in the dataset.
        """

        explanations = []

        for i in range(len(X_test)):

            explanations.append(

                self.explain_record(
                    model,
                    X_test,
                    i,
                )

            )

        return explanations