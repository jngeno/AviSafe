"""
Unified SHAP + LIME causal pattern map.

Addresses AviSafe Aim 2 / O6: "Synthesise SHAP and LIME findings into a
unified causal pattern map per accident category."

PatternDiscovery already ranks each category's dominant features from
SHAP alone. This module independently re-derives per-category feature
importance from LIME local explanations over the same records, then
merges the two into a single map: features both methods flag are
promoted to a "consensus" set, which is materially stronger evidence
for a regulator-facing causal claim than either method alone. This is
a direct, practical answer to the "Clever Hans" caution the AviSafe
literature review raises (Lapuschkin et al., 2019) about trusting a
single explainability method's ranking as ground truth -- SHAP and
LIME make different approximations (game-theoretic attribution vs.
local surrogate-model coefficients), so agreement between them is
evidence the signal is real rather than an artifact of one method.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from src.core.logger import LoggerManager
from src.explainability.lime_explainer import LIMEExplainer
from src.explainability.pattern_discovery import AviationPattern


@dataclass(slots=True)
class UnifiedCausalPattern:
    """
    One accident category's causal pattern, cross-validated across
    SHAP and LIME.
    """

    accident_category: str

    shap_top_features: list[str]

    lime_top_features: list[str]

    consensus_features: list[str]

    agreement_ratio: float  # |consensus| / |union of both top-N sets|

    occurrences: int

    shap_confidence: float


class CausalPatternMapBuilder:
    """
    Builds a unified, SHAP+LIME cross-validated causal pattern map.
    """

    def __init__(
        self,
        lime_samples_per_category: int = 25,
        top_n: int = 5,
    ) -> None:

        self.lime_samples_per_category = lime_samples_per_category

        self.top_n = top_n

        self.logger = LoggerManager.get_logger(__name__)

    def build(
        self,
        shap_patterns: list[AviationPattern],
        lime_explainer: LIMEExplainer,
        X: pd.DataFrame,
        labels: pd.Series,
        random_state: int = 42,
    ) -> list[UnifiedCausalPattern]:
        """
        Args:
            shap_patterns:
                Output of PatternDiscovery.discover().

            lime_explainer:
                A LIMEExplainer already fit() on the trained model.

            X:
                Feature rows to sample from for LIME, aligned by index
                with `labels` -- pass the same explain-sample SHAP's
                patterns were derived from, so both methods speak to
                the identical population of records.

            labels:
                Category label per row in X.
        """

        self.logger.info("Building unified SHAP+LIME causal pattern map.")

        unified: list[UnifiedCausalPattern] = []

        for pattern in shap_patterns:

            category_rows = X.loc[labels == pattern.accident_category]

            sample_size = min(self.lime_samples_per_category, len(category_rows))

            sample = category_rows.sample(n=sample_size, random_state=random_state)

            lime_importance = self._lime_feature_importance(lime_explainer, sample)

            lime_top = sorted(
                lime_importance, key=lime_importance.get, reverse=True
            )[: self.top_n]

            shap_top = pattern.dominant_features[: self.top_n]

            consensus = sorted(set(shap_top) & set(lime_top))

            union = set(shap_top) | set(lime_top)

            agreement_ratio = len(consensus) / len(union) if union else 0.0

            self.logger.info(
                "%s: SHAP/LIME agreement %.0f%% on %s (n=%d LIME samples)",
                pattern.accident_category,
                agreement_ratio * 100,
                consensus or "no shared top features",
                sample_size,
            )

            unified.append(
                UnifiedCausalPattern(
                    accident_category=pattern.accident_category,
                    shap_top_features=shap_top,
                    lime_top_features=lime_top,
                    consensus_features=consensus,
                    agreement_ratio=agreement_ratio,
                    occurrences=pattern.occurrence_count,
                    shap_confidence=pattern.confidence,
                )
            )

        return unified

    @staticmethod
    def _lime_feature_importance(
        lime_explainer: LIMEExplainer,
        sample: pd.DataFrame,
    ) -> dict[str, float]:

        weights: dict[str, list[float]] = {}

        for position in range(len(sample)):

            explanation = lime_explainer.explain_instance(
                sample, position, num_features=10
            )

            for description, weight in explanation.explanation:

                feature_name = _base_feature_name(description)

                weights.setdefault(feature_name, []).append(abs(weight))

        return {
            feature: float(np.mean(values)) for feature, values in weights.items()
        }

    @staticmethod
    def to_dataframe(patterns: list[UnifiedCausalPattern]) -> pd.DataFrame:

        rows = [
            {
                "Category": p.accident_category,
                "SHAP Top Features": ", ".join(p.shap_top_features),
                "LIME Top Features": ", ".join(p.lime_top_features),
                "Consensus Features": ", ".join(p.consensus_features) or "(none)",
                "Agreement": p.agreement_ratio,
                "Occurrences": p.occurrences,
                "SHAP Confidence": p.shap_confidence,
            }
            for p in patterns
        ]

        return pd.DataFrame(rows)


def _base_feature_name(description: str) -> str:
    """
    LIME describes a condition on a discretized feature, e.g.
    "Number_Of_Seats <= 4.00" or "2.00 < Weather_Risk <= 5.00". Extract
    just the feature name so it can be compared directly against
    SHAP's plain feature names.
    """

    for token in description.split():

        if token in {"<=", "<", ">=", ">", "="}:
            continue

        stripped = token.replace(".", "", 1).replace("-", "", 1)

        if stripped.isdigit():
            continue

        return token

    return description
