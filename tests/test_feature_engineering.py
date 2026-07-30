"""
Tests for src.data.feature_engineering.FeatureEngineer.

Columns are passed in already-normalized (underscore) form, matching
what Preprocessor.run() produces upstream in the real pipeline.
"""

from __future__ import annotations

import pandas as pd

from src.data.feature_engineering import FeatureEngineer


def test_fatal_accident_flag():
    df = pd.DataFrame({"Total_Fatal_Injuries": [0, 1, 2]})

    result = FeatureEngineer().run(df)

    assert result["Fatal_Accident"].tolist() == [0, 1, 1]


def test_total_injuries_sums_all_injury_columns():
    df = pd.DataFrame(
        {
            "Total_Fatal_Injuries": [1],
            "Total_Serious_Injuries": [2],
            "Total_Minor_Injuries": [0],
            "Total_Uninjured": [3],
        }
    )

    result = FeatureEngineer().run(df)

    assert result["Total_Injuries"].iloc[0] == 6


def test_damage_level_encoding():
    df = pd.DataFrame({"Aircraft_Damage": ["Minor", "Substantial", "Destroyed", "Unknown"]})

    result = FeatureEngineer().run(df)

    assert result["Damage_Level"].tolist() == [1, 2, 3, 0]


def test_weather_code_encoding():
    df = pd.DataFrame({"Weather_Condition": ["VMC", "IMC", "Other"]})

    result = FeatureEngineer().run(df)

    assert result["Weather_Code"].tolist() == [0, 1, -1]


def test_missing_source_columns_are_a_no_op():
    # None of the expected raw columns are present -- the engineer
    # should not raise, just skip every derived feature.
    df = pd.DataFrame({"Unrelated": [1, 2, 3]})

    result = FeatureEngineer().run(df)

    assert "Fatal_Accident" not in result.columns
    assert list(result.columns) == ["Unrelated"]
