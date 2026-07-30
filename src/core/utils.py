"""
Common utility functions used throughout the AviSafe project.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Iterable

import joblib
import pandas as pd

from src.core.exceptions import DatasetNotFoundError


def timestamp() -> str:
    """
    Generate a timestamp suitable for filenames.

    Returns:
        Formatted timestamp.
    """
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def ensure_directory(directory: Path) -> Path:
    """
    Ensure that a directory exists.

    Args:
        directory:
            Directory path.

    Returns:
        The directory path.
    """
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def validate_file_exists(file_path: Path) -> Path:
    """
    Validate that a file exists.

    Args:
        file_path:
            File path.

    Returns:
        The validated file path.

    Raises:
        DatasetNotFoundError:
            If the file does not exist.
    """
    if not file_path.exists():
        raise DatasetNotFoundError(
            f"File not found: {file_path}"
        )

    return file_path


def save_dataframe(
    dataframe: pd.DataFrame,
    destination: Path,
    index: bool = False,
) -> None:
    """
    Save a dataframe as CSV.

    Args:
        dataframe:
            DataFrame to save.

        destination:
            Output CSV path.

        index:
            Whether to save the index.
    """
    ensure_directory(destination.parent)

    dataframe.to_csv(
        destination,
        index=index,
    )


def load_dataframe(file_path: Path) -> pd.DataFrame:
    """
    Load a CSV file into a DataFrame.

    Args:
        file_path:
            CSV file.

    Returns:
        Loaded DataFrame.
    """
    validate_file_exists(file_path)

    return pd.read_csv(file_path)


def save_model(
    model: object,
    destination: Path,
) -> None:
    """
    Save a trained model.

    Args:
        model:
            Trained model.

        destination:
            Output path.
    """
    ensure_directory(destination.parent)

    joblib.dump(model, destination)


def load_model(
    model_path: Path,
) -> object:
    """
    Load a serialized model.

    Args:
        model_path:
            Model file.

    Returns:
        Loaded model.
    """
    validate_file_exists(model_path)

    return joblib.load(model_path)


def percentage(
    numerator: float,
    denominator: float,
    decimals: int = 2,
) -> float:
    """
    Calculate a percentage safely.

    Args:
        numerator:
            Numerator.

        denominator:
            Denominator.

        decimals:
            Decimal places.

    Returns:
        Percentage value.
    """
    if denominator == 0:
        return 0.0

    return round((numerator / denominator) * 100, decimals)


def missing_columns(
    dataframe: pd.DataFrame,
    required_columns: Iterable[str],
) -> list[str]:
    """
    Identify missing columns.

    Args:
        dataframe:
            Input dataframe.

        required_columns:
            Required columns.

    Returns:
        List of missing columns.
    """
    return [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]


def file_size_mb(file_path: Path) -> float:
    """
    Return file size in megabytes.

    Args:
        file_path:
            File path.

    Returns:
        File size in MB.
    """
    validate_file_exists(file_path)

    return round(file_path.stat().st_size / (1024 * 1024), 2)