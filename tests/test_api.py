"""
End-to-end test of the FastAPI application against the real database.

Runs a full training job through the API (synchronously, bypassing
BackgroundTasks so the test can assert on the outcome directly), then
exercises the experiment-detail and live-prediction endpoints against
the resulting model. This is the regression test for the multiclass
local_explanation bug: predicting against a 3-class model previously
crashed with "Per-column arrays must each be 1-dimensional".

Uses the real PostgreSQL database configured via .env (there is no
separate test database in this environment) -- every row the test
creates is deleted in the fixture teardown so it doesn't pollute
whatever experiments already exist there.
"""

from __future__ import annotations

import random

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from src.api.main import app
from src.api.services.training_service import run_training_job
from src.database.base import SessionLocal
from src.database.repositories import TrainingJobRepository

client = TestClient(app)

_NARRATIVES = {
    "CFIT": ["The airplane collided with mountainous terrain in low ceilings and rain."],
    "LOC-I": ["The pilot reported a loss of control during a practice stall maneuver."],
    "Runway Excursion": [
        "On landing roll, the airplane veered right and departed the right side of the runway."
    ],
}


def _build_synthetic_dataset(rows_per_category: int = 30) -> pd.DataFrame:
    rng = random.Random(7)
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
                    "Country": rng.choice(["United States", "Canada"]),
                    "Aircraft Damage": rng.choice(["Minor", "Substantial", "Destroyed"]),
                    "Aircraft Category": rng.choice(["fixed wing single engine", "helicopter"]),
                    "Make": rng.choice(["cessna", "piper"]),
                    "Model": rng.choice(["172", "pa28"]),
                    "Amateur Built": "No",
                    "Number Of Engines": 1,
                    "Engine Type": rng.choice(["reciprocating", "turbo prop"]),
                    "Far Description": "part 91: general aviation",
                    "Schedule": "UNK",
                    "Purpose Of Flight": "Personal",
                    "Total Fatal Injuries": fatal,
                    "Total Serious Injuries": 0,
                    "Total Minor Injuries": 0,
                    "Total Uninjured": 1 - fatal,
                    "Weather Condition": rng.choice(["VMC", "IMC"]),
                    "Broad Phase Of Flight": rng.choice(["Landing", "Takeoff", "Cruise"]),
                    "Analysis": rng.choice(templates),
                    "City": "Anytown",
                    "Longitude": rng.uniform(-120, -80),
                    "Latitude": rng.uniform(25, 45),
                    "Address": "",
                    "geometry": "",
                    "Place": "Anytown, ST",
                    "Number Of Seats": rng.choice([2, 4]),
                    "Type Aircraft": "Airplane",
                    "Type Engine": "Reciprocating",
                    "Total Person": 1,
                    "Far Description Factorized": 1,
                    "Schedule Factorized": 1,
                    "Purpose Of Flight Factorized": 1,
                    "Make Factorized": rng.choice([1, 2]),
                    "Model Factorized": rng.choice([1, 2]),
                    "Event Year": 2020,
                    "Publication Year": 2021,
                    "Event Month": rng.choice(range(1, 13)),
                    "Publication Month": 1,
                    "Event Day": rng.choice(range(1, 28)),
                    "Publication Day": 1,
                    "Date Difference": 30,
                    "Publication Month Name": "January",
                    "Event Month Name": "June",
                    "Season": "Summer",
                }
            )

    return pd.DataFrame(records)


@pytest.fixture
def synthetic_csv_path(tmp_path):
    path = tmp_path / "synthetic_ntsb.csv"
    _build_synthetic_dataset().to_csv(path, index=False)
    return path


@pytest.fixture
def trained_experiment_id(synthetic_csv_path, tmp_path, monkeypatch):
    """
    Run a real training job synchronously (bypassing BackgroundTasks,
    which TestClient does not execute) and yield the resulting
    experiment id. Deletes the experiment (and its persisted model
    directory) on teardown.
    """

    monkeypatch.chdir(tmp_path)

    db = SessionLocal()
    job = TrainingJobRepository.create(db, "Accident_Category", ["random_forest"])
    job_id = job.id
    db.close()

    run_training_job(job_id, str(synthetic_csv_path), "Accident_Category", ["random_forest"])

    db = SessionLocal()
    job = TrainingJobRepository.get(db, job_id)
    assert job.status == "completed", job.error_message
    experiment_id = job.experiment_id
    db.close()

    yield experiment_id

    db = SessionLocal()
    db.execute(text("DELETE FROM prediction_logs WHERE experiment_id = :id"), {"id": experiment_id})
    db.execute(text("DELETE FROM training_jobs WHERE id = :id"), {"id": job_id})
    db.execute(text("DELETE FROM experiments WHERE id = :id"), {"id": experiment_id})
    db.commit()
    db.close()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_experiment_detail_and_prediction(trained_experiment_id):

    detail = client.get(f"/experiments/{trained_experiment_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["target_column"] == "Accident_Category"
    assert len(body["feature_importances"]) > 0

    prediction = client.post(
        "/predictions",
        json={
            "experiment_id": trained_experiment_id,
            "features": {
                "Weather_Condition": "IMC",
                "Broad_Phase_Of_Flight": "Landing",
                "Country": "United States",
            },
        },
    )

    assert prediction.status_code == 200
    payload = prediction.json()
    assert payload["predicted_class"] in {"CFIT", "LOC-I", "Runway Excursion"}
    assert set(payload["probabilities"]) == {"CFIT", "LOC-I", "Runway Excursion"}
    assert len(payload["shap_explanation"]) > 0


def test_prediction_against_missing_experiment_is_404():
    response = client.post(
        "/predictions", json={"experiment_id": 10**9, "features": {}}
    )
    assert response.status_code == 404


def test_batch_prediction_from_csv(trained_experiment_id, tmp_path):

    csv_path = tmp_path / "batch.csv"
    csv_path.write_text(
        "Weather_Condition,Broad_Phase_Of_Flight,Country\n"
        "IMC,Landing,United States\n"
        "VMC,Cruise,Canada\n"
        ",Takeoff,\n"  # sparse row -- missing columns should default, not error
    )

    with open(csv_path, "rb") as fh:
        response = client.post(
            "/predictions/batch",
            data={"experiment_id": trained_experiment_id},
            files={"file": ("batch.csv", fh, "text/csv")},
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 3
    assert body["errors"] == []
    for row in body["results"]:
        assert row["predicted_class"] in {"CFIT", "LOC-I", "Runway Excursion"}
        assert row["input_features"]


def test_batch_prediction_rejects_non_csv(trained_experiment_id, tmp_path):

    txt_path = tmp_path / "notacsv.txt"
    txt_path.write_text("hello")

    with open(txt_path, "rb") as fh:
        response = client.post(
            "/predictions/batch",
            data={"experiment_id": trained_experiment_id},
            files={"file": ("notacsv.txt", fh, "text/plain")},
        )

    assert response.status_code == 422
