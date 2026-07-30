"""
Tests for src.data.preprocessing.Preprocessor.
"""

from __future__ import annotations

import pandas as pd

from src.data.preprocessing import Preprocessor


def test_normalizes_column_names():
    df = pd.DataFrame({"Aircraft Damage": ["Minor"], "Weather Condition": ["VMC"]})

    result = Preprocessor().run(df)

    assert "Aircraft_Damage" in result.columns
    assert "Weather_Condition" in result.columns


def test_drops_fully_empty_rows():
    df = pd.DataFrame({"A": [1, None], "B": [2, None]})

    result = Preprocessor().run(df)

    assert len(result) == 1


def test_drops_duplicate_rows():
    df = pd.DataFrame({"A": [1, 1], "B": ["x", "x"]})

    result = Preprocessor().run(df)

    assert len(result) == 1


def test_coerces_numeric_looking_columns():
    df = pd.DataFrame({"Count": ["1", "2", "3"], "Label": ["a", "b", "c"]})

    result = Preprocessor().run(df)

    assert pd.api.types.is_numeric_dtype(result["Count"])
    assert not pd.api.types.is_numeric_dtype(result["Label"])


def test_numeric_column_named_date_is_not_corrupted():
    # Regression test: a naive substring match on "date" (e.g.
    # "Date_Difference") previously fed a plain integer/day-count column
    # into pd.to_datetime, silently corrupting it into timestamps.
    df = pd.DataFrame({"Date Difference": [1, 5, 10, 20]})

    result = Preprocessor().run(df)

    assert pd.api.types.is_numeric_dtype(result["Date_Difference"])
    assert result["Date_Difference"].tolist() == [1, 5, 10, 20]


def test_fills_missing_values():
    # Num and Text are missing on different rows -- if both were missing
    # on the same row, dropna(how="all") would remove it entirely before
    # the fill logic ever runs.
    df = pd.DataFrame(
        {
            "Num": [1.0, None, 3.0],
            "Text": ["a", "b", None],
        }
    )

    result = Preprocessor().run(df)

    assert result["Num"].isna().sum() == 0
    assert (result["Text"] == "Unknown").sum() == 1
