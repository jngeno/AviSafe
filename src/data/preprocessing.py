"""
Dataset preprocessing pipeline for AviSafe.
"""

from __future__ import annotations

import pandas as pd

from src.core.logger import LoggerManager


class Preprocessor:
    """
    Cleans and standardizes aviation datasets.

    This class performs preprocessing only.
    It does not create engineered features.
    """

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def run(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        Execute the preprocessing pipeline.

        Args:
            dataframe:
                Raw dataset.

        Returns:
            Cleaned dataset.
        """

        df = dataframe.copy()

        self.logger.info("Starting preprocessing pipeline.")

        df = self._normalize_column_names(df)
        df = self._remove_empty_rows(df)
        df = self._remove_duplicates(df)
        df = self._convert_data_types(df)
        df = self._handle_missing_values(df)
        df = self._standardize_categories(df)
        df = self._parse_dates(df)

        self.logger.info("Preprocessing completed.")

        return df

    def _normalize_column_names(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Normalize column names.
        """

        dataframe.columns = (
            dataframe.columns
            .str.strip()
            .str.replace(" ", "_", regex=False)
        )

        return dataframe

    def _remove_empty_rows(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Remove rows where every value is missing.
        """

        before = len(dataframe)

        dataframe = dataframe.dropna(how="all")

        removed = before - len(dataframe)

        if removed:
            self.logger.info(
                "Removed %d completely empty rows.",
                removed,
            )

        return dataframe

    def _remove_duplicates(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Remove duplicate rows.
        """

        before = len(dataframe)

        dataframe = dataframe.drop_duplicates()

        removed = before - len(dataframe)

        if removed:
            self.logger.info(
                "Removed %d duplicate rows.",
                removed,
            )

        return dataframe

    def _convert_data_types(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Convert obvious numeric columns to numeric types.
        """

        for column in dataframe.columns:

            try:
                dataframe[column] = pd.to_numeric(
                    dataframe[column]
                )
            except (ValueError, TypeError):
                continue

        return dataframe

    def _handle_missing_values(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Handle missing values.

        Numeric columns are filled using the median.
        Text columns are filled with 'Unknown'.
        """

        numeric_columns = dataframe.select_dtypes(
            include="number"
        ).columns

        object_columns = dataframe.select_dtypes(
            include=["object", "str"]
        ).columns

        for column in numeric_columns:
            dataframe[column] = dataframe[column].fillna(
                dataframe[column].median()
            )

        for column in object_columns:
            dataframe[column] = dataframe[column].fillna(
                "Unknown"
            )

        return dataframe

    def _standardize_categories(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Standardize text values.
        """

        object_columns = dataframe.select_dtypes(
            include=["object", "str"]
        ).columns

        for column in object_columns:

            dataframe[column] = (
                dataframe[column]
                .astype(str)
                .str.strip()
            )

        return dataframe

    def _parse_dates(
        self,
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Convert date columns to datetime objects.
        """

        date_columns = [
            column
            for column in dataframe.columns
            if "date" in column.lower()
            and not pd.api.types.is_numeric_dtype(dataframe[column])
        ]

        for column in date_columns:

            dataframe[column] = pd.to_datetime(
                dataframe[column],
                errors="coerce",
            )

        return dataframe