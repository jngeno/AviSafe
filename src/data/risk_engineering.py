"""
Aviation risk engineering for AviSafe.

This module transforms engineered aviation features into
domain-specific risk indices that are later used by the
machine learning and explainability pipelines.
"""

from __future__ import annotations

import pandas as pd

from src.core.logger import LoggerManager


class RiskEngineer:
    """
    Creates aviation-specific risk indices.
    """

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def run(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Execute the complete risk engineering pipeline.

        Args:
            dataframe:
                Feature engineered dataset.

        Returns:
            Dataset with aviation risk scores.
        """

        df = dataframe.copy()

        self.logger.info("Starting aviation risk engineering.")

        df = self._weather_risk(df)
        df = self._damage_risk(df)
        df = self._flight_phase_risk(df)
        df = self._human_severity_risk(df)
        df = self._cfit_risk(df)
        df = self._loci_risk(df)
        df = self._runway_excursion_risk(df)
        df = self._operational_risk(df)

        self.logger.info("Risk engineering completed.")

        return df

    def _weather_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Compute weather risk.

        VMC = 0
        IMC = 5
        Unknown = 2
        """

        if "Weather_Condition" not in dataframe.columns:
            return dataframe

        mapping = {
            "VMC": 0,
            "IMC": 5,
        }

        dataframe["Weather_Risk"] = (
            dataframe["Weather_Condition"]
            .map(mapping)
            .fillna(2)
        )

        return dataframe

    def _damage_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Compute aircraft damage risk.
        """

        if "Damage_Level" not in dataframe.columns:
            return dataframe

        dataframe["Damage_Risk"] = (
            dataframe["Damage_Level"] * 2
        )

        return dataframe

    def _flight_phase_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Compute flight phase risk.
        """

        if "Broad_Phase_Of_Flight" not in dataframe.columns:
            return dataframe

        mapping = {
            "Takeoff": 4,
            "Initial Climb": 4,
            "Cruise": 1,
            "Approach": 5,
            "Landing": 5,
            "Taxi": 1,
        }

        dataframe["Flight_Phase_Risk"] = (
            dataframe["Broad_Phase_Of_Flight"]
            .map(mapping)
            .fillna(2)
        )

        return dataframe

    def _human_severity_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Compute human severity risk.
        """

        if "Total_Injuries" not in dataframe.columns:
            return dataframe

        dataframe["Human_Severity_Risk"] = (
            dataframe["Total_Injuries"] / 5
        ).clip(upper=5)

        return dataframe

    def _cfit_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Controlled Flight Into Terrain risk.
        """

        if {
            "Weather_Risk",
            "Flight_Phase_Risk",
        }.issubset(dataframe.columns):

            dataframe["CFIT_Risk"] = (
                dataframe["Weather_Risk"]
                + dataframe["Flight_Phase_Risk"]
            )

        return dataframe

    def _loci_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Loss of Control In-flight risk.
        """

        required = {
            "Damage_Risk",
            "Human_Severity_Risk",
        }

        if required.issubset(dataframe.columns):

            dataframe["LOCI_Risk"] = (
                dataframe["Damage_Risk"]
                + dataframe["Human_Severity_Risk"]
            )

        return dataframe

    def _runway_excursion_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Runway excursion risk.
        """

        if "Flight_Phase_Risk" not in dataframe.columns:
            return dataframe

        dataframe["Runway_Excursion_Risk"] = (
            dataframe["Flight_Phase_Risk"] * 1.5
        )

        return dataframe

    def _operational_risk(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Overall operational risk.
        """

        required = [
            "Weather_Risk",
            "Damage_Risk",
            "Flight_Phase_Risk",
            "Human_Severity_Risk",
        ]

        available = [
            column
            for column in required
            if column in dataframe.columns
        ]

        if available:

            dataframe["Operational_Risk"] = (
                dataframe[available]
                .mean(axis=1)
            )

        return dataframe