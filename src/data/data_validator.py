"""
Dataset validation utilities for AviSafe.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from src.core.logger import LoggerManager


@dataclass(slots=True)
class ValidationResult:
    """
    Stores the outcome of dataset validation.
    """

    passed: bool
    errors: list[str]
    warnings: list[str]
    summary: dict[str, int | float]


class DataValidator:
    """
    Validates datasets before preprocessing.

    This class performs validation only and never modifies
    the dataset.
    """

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def validate(
        self,
        dataframe: pd.DataFrame,
        required_columns: list[str],
    ) -> ValidationResult:
        """
        Validate a dataset.

        Args:
            dataframe:
                Dataset to validate.

            required_columns:
                Required column names.

        Returns:
            ValidationResult.
        """

        errors: list[str] = []
        warnings: list[str] = []

        missing_columns = [
            column
            for column in required_columns
            if column not in dataframe.columns
        ]

        if missing_columns:
            errors.append(
                f"Missing required columns: {missing_columns}"
            )

        duplicate_rows = int(dataframe.duplicated().sum())

        if duplicate_rows > 0:
            warnings.append(
                f"{duplicate_rows} duplicate rows detected."
            )

        missing_values = int(dataframe.isna().sum().sum())

        if missing_values > 0:
            warnings.append(
                f"{missing_values} missing values detected."
            )

        summary = {
            "rows": len(dataframe),
            "columns": len(dataframe.columns),
            "duplicates": duplicate_rows,
            "missing_values": missing_values,
        }

        passed = len(errors) == 0

        if passed:
            self.logger.info("Dataset validation passed.")
        else:
            self.logger.error("Dataset validation failed.")

        return ValidationResult(
            passed=passed,
            errors=errors,
            warnings=warnings,
            summary=summary,
        )

    @staticmethod
    def validate_column_types(
        dataframe: pd.DataFrame,
        expected_types: dict[str, str],
    ) -> list[str]:
        """
        Validate dataset column data types.

        Args:
            dataframe:
                Dataset.

            expected_types:
                Mapping of column names to expected pandas dtypes.

        Returns:
            List of validation errors.
        """

        errors: list[str] = []

        for column, expected_type in expected_types.items():

            if column not in dataframe.columns:
                continue

            actual_type = str(dataframe[column].dtype)

            if actual_type != expected_type:
                errors.append(
                    f"{column}: expected {expected_type}, "
                    f"found {actual_type}"
                )

        return errors

    @staticmethod
    def validation_report(
        result: ValidationResult,
    ) -> None:
        """
        Print a validation report.

        Args:
            result:
                Validation result.
        """

        print("\nDataset Validation Report")
        print("-" * 40)

        print(f"Passed: {result.passed}")

        print("\nSummary")

        for key, value in result.summary.items():
            print(f"{key}: {value}")

        if result.errors:
            print("\nErrors")

            for error in result.errors:
                print(f"• {error}")

        if result.warnings:
            print("\nWarnings")

            for warning in result.warnings:
                print(f"• {warning}")