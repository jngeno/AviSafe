"""
End-to-end smoke test for the training pipeline.

Builds a small synthetic dataset matching the real NTSB.csv schema and
runs it through TrainingPipeline.run() for both supported targets, with
a single fast model candidate to keep the test quick. This exercises
load -> validate -> preprocess -> feature engineer -> risk engineer ->
label -> build feature matrix -> split -> tune (CV) -> evaluate ->
persist -> SHAP/LIME -> pattern discovery -> recommendations, without
asserting on specific metric values (which are not meaningful on tiny
synthetic data) -- only that the pipeline completes and returns a
well-formed PipelineResults.
"""

from __future__ import annotations

import random

import pandas as pd
import pytest

from src.pipeline.train_pipeline import ACCIDENT_CATEGORY_TARGET, TrainingPipeline

_NARRATIVES = {
    "CFIT": [
        "The airplane collided with mountainous terrain in low ceilings and rain.",
        "The pilot flew into rising terrain during a night approach in poor visibility.",
    ],
    "LOC-I": [
        "The pilot reported a loss of control during a practice stall maneuver.",
        "The aircraft entered a spin and the pilot was unable to recover before impact.",
    ],
    "Runway Excursion": [
        "On landing roll, the airplane veered right and departed the right side of the runway.",
        "The airplane bounced on landing and ran off the end of the runway.",
    ],
}

_COUNTRIES = ["United States", "Canada", "Brazil"]
_PHASES = ["Landing", "Takeoff", "Cruise", "Approach", "Maneuvering"]
_WEATHER = ["VMC", "IMC"]


def _build_synthetic_dataset(rows_per_category: int = 40) -> pd.DataFrame:
    rng = random.Random(42)

    records = []

    event_id = 0

    for category, templates in _NARRATIVES.items():

        for _ in range(rows_per_category):

            event_id += 1

            fatal = rng.choice([0, 0, 1])

            records.append(
                {
                    "Event Id": f"EVT{event_id:05d}",
                    "Investigation Type": "Accident",
                    "Country": rng.choice(_COUNTRIES),
                    "Aircraft Damage": rng.choice(["Minor", "Substantial", "Destroyed"]),
                    "Aircraft Category": rng.choice(["fixed wing single engine", "helicopter"]),
                    "Make": rng.choice(["cessna", "piper", "beech"]),
                    "Model": rng.choice(["172", "pa28", "b58"]),
                    "Amateur Built": "No",
                    "Number Of Engines": rng.choice([1, 2]),
                    "Engine Type": rng.choice(["reciprocating", "turbo prop"]),
                    "Far Description": "part 91: general aviation",
                    "Schedule": "UNK",
                    "Purpose Of Flight": rng.choice(["Personal", "Instructional"]),
                    "Total Fatal Injuries": fatal,
                    "Total Serious Injuries": 0,
                    "Total Minor Injuries": 0,
                    "Total Uninjured": 1 - fatal,
                    "Weather Condition": rng.choice(_WEATHER),
                    "Broad Phase Of Flight": rng.choice(_PHASES),
                    "Analysis": rng.choice(templates),
                    "City": "Anytown",
                    "Longitude": rng.uniform(-120, -80),
                    "Latitude": rng.uniform(25, 45),
                    "Address": "",
                    "geometry": "",
                    "Place": "Anytown, ST",
                    "Number Of Seats": rng.choice([2, 4, 6]),
                    "Type Aircraft": "Airplane",
                    "Type Engine": "Reciprocating",
                    "Total Person": 1,
                    "Far Description Factorized": 1,
                    "Schedule Factorized": 1,
                    "Purpose Of Flight Factorized": rng.choice([1, 2]),
                    "Make Factorized": rng.choice([1, 2, 3]),
                    "Model Factorized": rng.choice([1, 2, 3]),
                    "Event Year": rng.choice([2015, 2018, 2021]),
                    "Publication Year": 2022,
                    "Event Month": rng.choice(range(1, 13)),
                    "Publication Month": 1,
                    "Event Day": rng.choice(range(1, 28)),
                    "Publication Day": 1,
                    "Date Difference": rng.choice([30, 60, 90]),
                    "Publication Month Name": "January",
                    "Event Month Name": "June",
                    "Season": rng.choice(["Winter", "Summer"]),
                }
            )

    return pd.DataFrame(records)


@pytest.fixture(scope="module")
def synthetic_csv_path(tmp_path_factory):

    path = tmp_path_factory.mktemp("data") / "synthetic_ntsb.csv"

    _build_synthetic_dataset().to_csv(path, index=False)

    return path


def test_pipeline_runs_end_to_end_for_accident_category(synthetic_csv_path, tmp_path):

    pipeline = TrainingPipeline()

    results = pipeline.run(
        str(synthetic_csv_path),
        target_column=ACCIDENT_CATEGORY_TARGET,
        model_candidates=["random_forest"],
        models_dir=tmp_path / "models",
    )

    assert results.best_model_name
    assert 0.0 <= results.test_metrics["accuracy"] <= 1.0
    assert set(results.feature_importance.columns) == {"Feature", "Importance"}
    assert "Category" in results.patterns.columns
    assert (results.model_path / "model.joblib").exists()


def test_pipeline_runs_end_to_end_for_fatal_accident(synthetic_csv_path, tmp_path):

    pipeline = TrainingPipeline()

    results = pipeline.run(
        str(synthetic_csv_path),
        model_candidates=["random_forest"],
        models_dir=tmp_path / "models",
    )

    assert results.best_model_name
    assert 0.0 <= results.test_metrics["accuracy"] <= 1.0
