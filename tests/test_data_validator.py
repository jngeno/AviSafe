"""
Tests for src.data.data_validator.DataValidator.
"""

from __future__ import annotations

import pandas as pd

from src.data.data_validator import DataValidator


def test_passes_when_required_columns_present():
    df = pd.DataFrame({"A": [1], "B": [2]})

    result = DataValidator().validate(df, required_columns=["A", "B"])

    assert result.passed
    assert result.errors == []


def test_fails_when_required_columns_missing():
    df = pd.DataFrame({"A": [1]})

    result = DataValidator().validate(df, required_columns=["A", "B"])

    assert not result.passed
    assert result.errors


def test_warns_on_duplicates_and_missing_values():
    df = pd.DataFrame({"A": [1, 1, None]})

    result = DataValidator().validate(df, required_columns=["A"])

    assert result.summary["duplicates"] >= 1
    assert result.summary["missing_values"] >= 1
    assert len(result.warnings) == 2
