"""
Scenario-driven recommendation simulation.

Runs a live prediction for a hypothetical (not-yet-happened) scenario and
matches its SHAP-dominant features against the same rule base
`RecommendationEngine` uses for training-time pattern discovery -- the
only difference is the "pattern" here comes from a single hypothetical
record's SHAP explanation instead of an aggregated across-test-set
pattern. Nothing is persisted; this is a preview a user can then choose
to save via `RecommendationRepository.create()`.
"""

from __future__ import annotations

from typing import Any

from src.database import models
from src.explainability.pattern_discovery import AviationPattern
from src.explainability.recommendation_engine import (
    RecommendationEngine,
    SafetyRecommendation,
)

from .prediction_service import _load_model, _predict_row

_engine = RecommendationEngine()


def simulate(
    experiment: models.Experiment,
    raw_features: dict[str, Any],
    top_n: int = 5,
) -> tuple[str, dict[str, float], list[str], list[SafetyRecommendation]]:
    """
    Returns (predicted_class, probabilities, dominant_features, recommendations).
    """

    model = _load_model(experiment)

    predicted_class, probabilities, shap_explanation = _predict_row(
        model, experiment, raw_features
    )

    ranked = sorted(
        shap_explanation, key=lambda row: row["Absolute"], reverse=True
    )

    top = ranked[:top_n]

    dominant_features = [row["Feature"] for row in top]

    average_importance = (
        sum(row["Absolute"] for row in top) / len(top) if top else 0.0
    )

    max_importance = ranked[0]["Absolute"] if ranked else 0.0

    # Same confidence definition PatternDiscovery uses: how much the top
    # features dominate relative to the single most important one.
    confidence = (
        average_importance / max_importance if max_importance else 0.0
    )

    pattern = AviationPattern(
        accident_category=predicted_class,
        dominant_features=dominant_features,
        average_importance=average_importance,
        occurrence_count=1,
        confidence=confidence,
    )

    recommendations = _engine.generate([pattern])

    return predicted_class, probabilities, dominant_features, recommendations
