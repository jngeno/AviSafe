"""
Tests for src.data.risk_engineering.RiskEngineer.
"""

from __future__ import annotations

import pandas as pd

from src.data.risk_engineering import RiskEngineer


def test_weather_risk_mapping():
    df = pd.DataFrame({"Weather_Condition": ["VMC", "IMC", "Other"]})

    result = RiskEngineer().run(df)

    assert result["Weather_Risk"].tolist() == [0, 5, 2]


def test_flight_phase_risk_mapping():
    df = pd.DataFrame(
        {"Broad_Phase_Of_Flight": ["Cruise", "Landing", "Unmapped"]}
    )

    result = RiskEngineer().run(df)

    assert result["Flight_Phase_Risk"].tolist() == [1, 5, 2]


def test_cfit_risk_combines_weather_and_phase():
    df = pd.DataFrame(
        {
            "Weather_Condition": ["IMC"],
            "Broad_Phase_Of_Flight": ["Approach"],
        }
    )

    result = RiskEngineer().run(df)

    assert result["CFIT_Risk"].iloc[0] == 5 + 5


def test_runway_excursion_risk_scales_phase_risk():
    df = pd.DataFrame({"Broad_Phase_Of_Flight": ["Landing"]})

    result = RiskEngineer().run(df)

    assert result["Runway_Excursion_Risk"].iloc[0] == 5 * 1.5


def test_missing_source_columns_are_a_no_op():
    df = pd.DataFrame({"Unrelated": [1, 2, 3]})

    result = RiskEngineer().run(df)

    assert list(result.columns) == ["Unrelated"]
