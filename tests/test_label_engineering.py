"""
Tests for src.data.label_engineering.AccidentCategoryLabeler.
"""

from __future__ import annotations

import pandas as pd

from src.data.label_engineering import AccidentCategoryLabeler


def _label(texts: list[str]) -> list:
    df = pd.DataFrame({"Analysis": texts})
    return AccidentCategoryLabeler().label(df)["Accident_Category"].tolist()


def test_detects_cfit():
    texts = [
        "The airplane collided with mountainous terrain in low ceilings and rain.",
    ]
    assert _label(texts) == ["CFIT"]


def test_detects_loc_i():
    texts = [
        "The pilot reported a loss of control during a practice stall maneuver.",
    ]
    assert _label(texts) == ["LOC-I"]


def test_detects_runway_excursion():
    texts = [
        "On landing roll, the airplane veered right and departed the right side of the runway.",
    ]
    assert _label(texts) == ["Runway Excursion"]


def test_unmatched_narrative_is_unlabelled():
    texts = ["The engine experienced a loss of power due to fuel exhaustion."]
    result = _label(texts)
    assert result[0] is None or pd.isna(result[0])


def test_mechanical_failure_excludes_cfit_false_positive():
    # Regression test: an engine-failure forced landing that happens to
    # strike terrain is not CFIT (the aircraft was not airworthy/under
    # normal control), even though "collided with terrain" appears.
    texts = [
        "The engine lost power. An emergency landing was attempted, "
        "but the airplane clipped trees and collided with terrain short of the runway."
    ]
    assert _label(texts) == [None]


def test_runway_excursion_takes_priority_over_loc_i_language():
    # "lost control" and a runway departure often co-occur; the physical
    # outcome (departed the runway) should win.
    texts = [
        "The student lost control prior to adding power for a touch and go. "
        "The aircraft ran off the runway and collided with a pile of gravel."
    ]
    assert _label(texts) == ["Runway Excursion"]


def test_loc_i_takes_priority_over_cfit_language():
    # CFIT requires a controlled, airworthy aircraft; if loss-of-control
    # language is present, terrain impact language should not win.
    texts = [
        "The pilot lost control of the aircraft in turbulence and it collided with terrain."
    ]
    assert _label(texts) == ["LOC-I"]


def test_raises_when_text_column_missing():
    df = pd.DataFrame({"Other": ["x"]})
    import pytest

    with pytest.raises(KeyError):
        AccidentCategoryLabeler().label(df)
