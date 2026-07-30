"""
Feature engineering pipeline for AviSafe.

This module creates machine learning features from cleaned
aviation accident data. It does not compute aviation risk
scores, which are handled separately by risk_engineering.py.
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from src.core.logger import LoggerManager


class FeatureEngineer:
    """
    Creates engineered features for machine learning.
    """

    CURRENT_YEAR = datetime.now().year

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def run(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        Execute the feature engineering pipeline.

        Args:
            dataframe:
                Cleaned dataset.

        Returns:
            Dataset with engineered features.
        """

        df = dataframe.copy()

        self.logger.info("Starting feature engineering.")

        df = self._aircraft_age(df)
        df = self._aircraft_age_group(df)
        df = self._event_date_features(df)
        df = self._total_injuries(df)
        df = self._fatal_accident(df)
        df = self._damage_encoding(df)
        df = self._weather_encoding(df)
        df = self._flight_phase_encoding(df)

        self.logger.info("Feature engineering completed.")

        return df

    def _aircraft_age(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Calculate aircraft age.
        """

        if "Aircraft_Year" not in dataframe.columns:
            return dataframe

        dataframe["Aircraft_Age"] = (
            self.CURRENT_YEAR - dataframe["Aircraft_Year"]
        ).clip(lower=0)

        return dataframe

    def _aircraft_age_group(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Categorize aircraft age.
        """

        if "Aircraft_Age" not in dataframe.columns:
            return dataframe

        dataframe["Aircraft_Age_Group"] = pd.cut(
            dataframe["Aircraft_Age"],
            bins=[-1, 5, 15, 30, 100],
            labels=[
                "New",
                "Modern",
                "Midlife",
                "Old",
            ],
        )

        return dataframe

    def _event_date_features(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Extract calendar features.
        """

        if "Event_Date" not in dataframe.columns:
            return dataframe

        dataframe["Event_Year"] = dataframe["Event_Date"].dt.year
        dataframe["Event_Month"] = dataframe["Event_Date"].dt.month
        dataframe["Event_Day"] = dataframe["Event_Date"].dt.day
        dataframe["Event_Weekday"] = dataframe["Event_Date"].dt.day_name()

        return dataframe

    def _total_injuries(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Calculate total injuries.
        """

        injury_columns = [
            "Total_Fatal_Injuries",
            "Total_Serious_Injuries",
            "Total_Minor_Injuries",
            "Total_Uninjured",
        ]

        available = [
            column
            for column in injury_columns
            if column in dataframe.columns
        ]

        if available:
            dataframe["Total_Injuries"] = dataframe[
                available
            ].sum(axis=1)

        return dataframe

    def _fatal_accident(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Create a binary fatal accident flag.
        """

        if "Total_Fatal_Injuries" not in dataframe.columns:
            return dataframe

        dataframe["Fatal_Accident"] = (
            dataframe["Total_Fatal_Injuries"] > 0
        ).astype(int)

        return dataframe

    def _damage_encoding(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Encode aircraft damage.
        """

        if "Aircraft_Damage" not in dataframe.columns:
            return dataframe

        mapping = {
            "Minor": 1,
            "Substantial": 2,
            "Destroyed": 3,
        }

        dataframe["Damage_Level"] = (
            dataframe["Aircraft_Damage"]
            .map(mapping)
            .fillna(0)
        )

        return dataframe

    def _weather_encoding(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Encode weather conditions.
        """

        if "Weather_Condition" not in dataframe.columns:
            return dataframe

        mapping = {
            "VMC": 0,
            "IMC": 1,
        }

        dataframe["Weather_Code"] = (
            dataframe["Weather_Condition"]
            .map(mapping)
            .fillna(-1)
        )

        return dataframe

    def _flight_phase_encoding(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Encode flight phase.
        """

        if "Broad_Phase_Of_Flight" not in dataframe.columns:
            return dataframe

        dataframe["Flight_Phase_Code"] = (
            dataframe["Broad_Phase_Of_Flight"]
            .astype("category")
            .cat.codes
        )

        return dataframe