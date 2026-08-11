"""
Tests for src.explainability.report_generator.SafetyReportGenerator.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.explainability.report_generator import SafetyReportGenerator
from src.models.experiment import Experiment
from src.pipeline.train_pipeline import PipelineResults


def _fake_results() -> PipelineResults:

    experiment = Experiment(
        experiment_id="test-experiment-id",
        model_name="XGBoost",
        dataset_name="NTSB.csv",
        target_column="Accident_Category",
        started_at="2026-01-01T00:00:00",
        finished_at="2026-01-01T00:10:00",
        training_time=42.0,
        random_state=42,
        parameters={"max_depth": 3, "n_estimators": 300, "gamma": None},
        metrics={},
        feature_names=["Weather_Condition", "Broad_Phase_Of_Flight"],
    )

    causal_pattern_map = pd.DataFrame(
        [
            {
                "Category": "CFIT",
                "SHAP Top Features": "Weather_Condition, Broad_Phase_Of_Flight",
                "LIME Top Features": "Weather_Condition, Country",
                "Consensus Features": "Weather_Condition",
                "Agreement": 0.5,
                "Occurrences": 71,
                "SHAP Confidence": 0.6,
            }
        ]
    )

    recommendations = pd.DataFrame(
        [
            {
                "Category": "CFIT",
                "Priority": "High",
                "Recommendation": "Strengthen terrain awareness training.",
                "Stakeholder": "Flight Operations",
                "Confidence": 0.6,
                "Evidence": "Weather_Condition, Broad_Phase_Of_Flight",
            }
        ]
    )

    return PipelineResults(
        best_model_name="XGBoost",
        best_model=object(),
        cv_metrics={"f1_weighted_mean": 0.65},
        test_metrics={
            "accuracy": 0.672,
            "balanced_accuracy": 0.66,
            "precision": 0.7,
            "recall": 0.67,
            "f1_score": 0.677,
            "roc_auc": 0.825,
            "matthews_cc": 0.456,
            "cohen_kappa": 0.45,
        },
        model_path=Path("models/xgboost"),
        feature_importance=pd.DataFrame(
            {"Feature": ["Weather_Condition"], "Importance": [0.3]}
        ),
        patterns=pd.DataFrame(),
        causal_pattern_map=causal_pattern_map,
        recommendations=recommendations,
        experiment=experiment,
        categorical_encodings={},
        target_label_map=None,
    )


def test_generate_includes_all_sections():

    report = SafetyReportGenerator().generate(_fake_results())

    for heading in [
        "# AviSafe Safety Recommendations Report",
        "## Executive Summary",
        "## Methodology",
        "## Model Performance",
        "## Unified Causal Pattern Map",
        "## Safety Recommendations",
        "## Limitations",
    ]:
        assert heading in report


def test_generate_grounds_recommendations_in_evidence():

    report = SafetyReportGenerator().generate(_fake_results())

    assert "Strengthen terrain awareness training." in report
    assert "Weather_Condition" in report
    # the consensus feature should appear attached to its category
    assert "Consensus (both methods agree):** Weather_Condition" in report


def test_save_writes_file(tmp_path):

    destination = tmp_path / "reports" / "safety_report.md"

    written = SafetyReportGenerator().save(_fake_results(), destination)

    assert written == destination
    assert destination.exists()
    assert "AviSafe Safety Recommendations Report" in destination.read_text(encoding="utf-8")
