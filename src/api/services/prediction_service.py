"""
Live single-record and batch prediction service.

Loads a trained model from disk, encodes a raw feature dict using the
categorical encodings captured at training time (see
TrainingPipeline._build_feature_matrix), predicts, computes a local
SHAP explanation, and logs the result.

Known simplification: the SHAP explainer is fit using the single input
row as its own "background" reference. For tree ensembles (the usual
winners here) this doesn't matter -- SHAPExplainer uses TreeExplainer
with feature_perturbation="tree_path_dependent", which ignores the
background dataset entirely. For a non-tree fallback model (e.g. SVM),
a one-row background is a weaker reference than the real training set
would give; this is an accepted tradeoff against persisting full
training data per experiment.
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

# Batch CSV import is meant for small, hand-curated samples exercised
# through the UI, not bulk scoring -- capped to keep per-row SHAP
# computation (and the resulting number of prediction_logs rows) bounded.
MAX_BATCH_ROWS = 200


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
            # Try to coerce numeric-like values into numbers. If the value is
            # a non-empty string (likely an unencoded categorical) fall back
            # to -1 so tree models treat it as an unknown category. Empty
            # strings and missing values default to 0 (consistent with
            # training-time handling when features were absent).
            val = raw_features.get(name, 0)

            if isinstance(val, (int, float)):
                row[name] = val
            else:
                try:
                    # Accept numeric strings like "0" or "3.14"
                    row[name] = float(val)
                except Exception:
                    if val is None or (isinstance(val, str) and val.strip() == ""):
                        row[name] = 0
                    else:
                        # Unknown categorical not present in stored encodings
                        # - use -1 as a sentinel for 'unseen' which matches
                        # the pipeline's handling of unexpected categories.
                        row[name] = -1

    return pd.DataFrame([row], columns=feature_names)


def _load_model(experiment: models.Experiment) -> Any:
    """Load model with robust fallback logic.

    Tries these locations in order:
    1. <experiment.model_path>/model.joblib (expected behavior)
    2. <experiment.model_path> if it's a file (direct path to joblib)
    3. A matching subfolder under the repository's models/ directory that contains model.joblib
    4. Any models/*/model.joblib as a final fallback

    Raises PredictionError listing attempted paths if none are found.
    """

    tried = []

    base = Path(experiment.model_path)

    # 1) directory + model.joblib
    tried_path = base / "model.joblib"
    tried.append(tried_path)
    if tried_path.exists():
        try:
            return joblib.load(tried_path)
        except Exception as exc:
            raise PredictionError(f"Failed to load model at {tried_path}: {exc}") from exc

    # 2) experiment.model_path directly (maybe it was stored as a file)
    if base.exists() and base.is_file():
        tried.append(base)
        try:
            return joblib.load(base)
        except Exception as exc:
            raise PredictionError(f"Failed to load model at {base}: {exc}") from exc

    # 3) search for a matching folder under models/ that contains model.joblib
    repo_models_dir = Path("models")
    if repo_models_dir.exists():
        # try a folder that matches the experiment name
        name_slug = experiment.model_name.lower().replace(" ", "_")
        candidate = repo_models_dir / name_slug
        candidate_model = candidate / "model.joblib"
        if candidate_model.exists():
            tried.append(candidate_model)
            try:
                return joblib.load(candidate_model)
            except Exception as exc:
                raise PredictionError(f"Failed to load model at {candidate_model}: {exc}") from exc

        # fallback: any model.joblib under models/
        for p in repo_models_dir.rglob("model.joblib"):
            tried.append(p)
            try:
                return joblib.load(p)
            except Exception:
                # keep trying
                continue

    # If we get here, nothing was found
    raise PredictionError(f"Model artifact not found. Tried: {', '.join(str(p) for p in tried)}")


def _predict_row(
    model: Any,
    experiment: models.Experiment,
    raw_features: dict[str, Any],
) -> tuple[str, dict[str, float], list[dict[str, Any]]]:
    """
    Run one row through an already-loaded model. Returns
    (predicted_class, probabilities, shap_explanation).
    """

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

    return predicted_class, probabilities, shap_explanation


def predict(
    db,
    experiment: models.Experiment,
    raw_features: dict[str, Any],
) -> models.PredictionLog:
    """
    Run a live prediction against the given experiment's persisted
    model and log the result.
    """

    model = _load_model(experiment)

    predicted_class, probabilities, shap_explanation = _predict_row(
        model, experiment, raw_features
    )

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


def predict_many(
    db,
    experiment: models.Experiment,
    rows: list[dict[str, Any]],
) -> tuple[list[models.PredictionLog], list[dict[str, Any]]]:
    """
    Run a batch of raw feature dicts (e.g. parsed from an uploaded CSV)
    through the given experiment's model, loading it once and reusing
    it across all rows. Rows that fail to predict (bad values, etc.)
    are collected as errors rather than aborting the whole batch.

    Returns (successful PredictionLog records, per-row error details).
    """

    model = _load_model(experiment)

    results: list[models.PredictionLog] = []

    errors: list[dict[str, Any]] = []

    for index, raw_features in enumerate(rows):

        try:
            predicted_class, probabilities, shap_explanation = _predict_row(
                model, experiment, raw_features
            )

        except Exception as exc:  # noqa: BLE001 -- isolate bad rows, don't abort the batch

            errors.append({"row": index, "error": str(exc)})

            continue

        record = PredictionRepository.create(
            db,
            experiment_id=experiment.id,
            input_features=raw_features,
            predicted_class=predicted_class,
            probabilities=probabilities,
            shap_explanation=shap_explanation,
        )

        results.append(record)

    logger.info(
        "Batch predicted %d/%d rows for experiment %s",
        len(results),
        len(rows),
        experiment.experiment_id,
    )

    return results, errors
