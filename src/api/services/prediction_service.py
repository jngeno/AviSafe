"""
Live single-record prediction service.

Loads a trained model from disk, encodes a raw feature dict using the
categorical encodings captured at training time (see
TrainingPipeline._build_feature_matrix), predicts, computes a local
SHAP explanation, and logs the result.

Known simplification: the SHAP explainer is fit using the single input
row as its own "background" reference. For tree ensembles (the usual
winners here) this doesn't matter -- SHAPExplainer uses TreeExplainer
with feature_perturbation="tree_path_dependent", which ignores the
background dataset entirely. For a non-tree fallback model (e.g.
Logistic Regression), a one-row background is a weaker reference than
the real training set would give; this is an accepted tradeoff against
persisting full training data per experiment.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from src.core.logger import LoggerManager
from src.database import models
from src.database.repositories import PredictionRepository
from src.explainability.shap_explainer import SHAPExplainer

logger = LoggerManager.get_logger(__name__)


class PredictionError(Exception):
    """Raised when a prediction request cannot be fulfilled."""


def encode_features(
    raw_features: dict[str, Any],
    feature_names: list[str],
    categorical_encodings: dict[str, dict[str, int]],
) -> pd.DataFrame:
    """
    Build a single-row, model-ready feature DataFrame from raw input.

    Categorical columns are looked up in the training-time encoding
    map; a category never seen during training falls back to -1
    (consistent with how feature_engineering.py encodes unrecognized
    weather/damage values). Missing features default to 0.
    """

    row: dict[str, Any] = {}

    for name in feature_names:

        if name in categorical_encodings:

            value = raw_features.get(name)

            row[name] = categorical_encodings[name].get(str(value), -1)

        else:

            row[name] = raw_features.get(name, 0)

    return pd.DataFrame([row], columns=feature_names)


def predict(
    db,
    experiment: models.Experiment,
    raw_features: dict[str, Any],
) -> models.PredictionLog:
    """
    Run a live prediction against the given experiment's persisted
    model and log the result.
    """

    model_file = Path(experiment.model_path) / "model.joblib"

    try:
        model = joblib.load(model_file)
    except FileNotFoundError as exc:
        raise PredictionError(
            f"Model artifact not found at {model_file}"
        ) from exc

    X = encode_features(
        raw_features, experiment.feature_names, experiment.categorical_encodings
    )

    predicted_code = model.predict(X)[0]

    label_map = experiment.target_label_map or {}

    predicted_class = label_map.get(str(predicted_code), str(predicted_code))

    classes = list(getattr(model, "classes_", []))

    class_index = classes.index(predicted_code) if predicted_code in classes else None

    probabilities: dict[str, float] = {}

    if hasattr(model, "predict_proba"):

        proba = model.predict_proba(X)[0]

        probabilities = {
            label_map.get(str(cls), str(cls)): float(p)
            for cls, p in zip(classes, proba, strict=True)
        }

    explainer = SHAPExplainer()

    explainer.fit(model, X)

    explainer.explain(X)

    local = explainer.local_explanation(0, class_index=class_index)

    shap_explanation = local.head(10).to_dict(orient="records")

    logger.info(
        "Predicted %s for experiment %s",
        predicted_class,
        experiment.experiment_id,
    )

    return PredictionRepository.create(
        db,
        experiment_id=experiment.id,
        input_features=raw_features,
        predicted_class=predicted_class,
        probabilities=probabilities,
        shap_explanation=shap_explanation,
    )
