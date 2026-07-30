"""
Custom exceptions used throughout the AviSafe project.
"""

from __future__ import annotations


class AviSafeError(Exception):
    """
    Base exception for all AviSafe-specific errors.
    """

    def __init__(self, message: str = "An AviSafe error occurred.") -> None:
        super().__init__(message)


class ConfigurationError(AviSafeError):
    """
    Raised when there is an invalid project configuration.
    """


class DatasetError(AviSafeError):
    """
    Raised when dataset loading or validation fails.
    """


class DatasetNotFoundError(DatasetError):
    """
    Raised when a dataset cannot be located.
    """


class InvalidDatasetError(DatasetError):
    """
    Raised when a dataset has an invalid structure.
    """


class ValidationError(AviSafeError):
    """
    Raised when data validation fails.
    """


class FeatureEngineeringError(AviSafeError):
    """
    Raised during feature engineering failures.
    """


class RiskEngineeringError(AviSafeError):
    """
    Raised when aviation risk engineering cannot be completed.
    """


class ModelError(AviSafeError):
    """
    Base exception for machine learning errors.
    """


class ModelTrainingError(ModelError):
    """
    Raised when model training fails.
    """


class ModelEvaluationError(ModelError):
    """
    Raised when model evaluation fails.
    """


class ModelPersistenceError(ModelError):
    """
    Raised when saving or loading a trained model fails.
    """


class ExplainabilityError(AviSafeError):
    """
    Raised when SHAP or LIME explanations fail.
    """


class RecommendationError(AviSafeError):
    """
    Raised when recommendation generation fails.
    """


class DatabaseError(AviSafeError):
    """
    Raised when a database operation fails.
    """


class ReportGenerationError(AviSafeError):
    """
    Raised when generating reports fails.
    """