"""
Load aviation datasets into pandas DataFrames.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.core.config import Config
from src.core.exceptions import (
    DatasetNotFoundError,
    InvalidDatasetError,
)
from src.core.logger import LoggerManager


class DataLoader:
    """
    Loads aviation datasets from disk.

    This class is responsible only for loading datasets.
    It performs no cleaning or feature engineering.
    """

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()
        self.logger = LoggerManager.get_logger(__name__)

    def load(self, dataset_path: Path | None = None) -> pd.DataFrame:
        """
        Load a dataset.

        Args:
            dataset_path:
                Optional dataset path.

        Returns:
            Loaded DataFrame.

        Raises:
            DatasetNotFoundError:
                If the dataset does not exist.

            InvalidDatasetError:
                If the file extension is unsupported.
        """

        path = dataset_path or self.config.default_dataset

        if not path.exists():
            raise DatasetNotFoundError(
                f"Dataset not found: {path}"
            )

        if path.suffix.lower() not in self.config.supported_file_extensions:
            raise InvalidDatasetError(
                f"Unsupported file format: {path.suffix}"
            )

        self.logger.info("Loading dataset: %s", path)

        if path.suffix == ".csv":
            dataframe = pd.read_csv(path)

        elif path.suffix == ".parquet":
            dataframe = pd.read_parquet(path)

        elif path.suffix in {".xlsx", ".xls"}:
            dataframe = pd.read_excel(path)

        else:
            raise InvalidDatasetError(
                f"Unsupported file format: {path.suffix}"
            )

        self.logger.info(
            "Dataset loaded successfully (%d rows, %d columns).",
            len(dataframe),
            len(dataframe.columns),
        )

        return dataframe

    @staticmethod
    def dataset_summary(dataframe: pd.DataFrame) -> dict:
        """
        Return basic dataset statistics.

        Args:
            dataframe:
                Input DataFrame.

        Returns:
            Dataset summary.
        """

        return {
            "rows": len(dataframe),
            "columns": len(dataframe.columns),
            "missing_values": int(
                dataframe.isna().sum().sum()
            ),
            "duplicate_rows": int(
                dataframe.duplicated().sum()
            ),
            "memory_mb": round(
                dataframe.memory_usage(deep=True).sum()
                / (1024 * 1024),
                2,
            ),
        }

    @staticmethod
    def column_names(dataframe: pd.DataFrame) -> list[str]:
        """
        Return dataset column names.

        Args:
            dataframe:
                Input DataFrame.

        Returns:
            List of column names.
        """

        return dataframe.columns.tolist()