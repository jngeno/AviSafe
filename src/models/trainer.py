"""
Training engine for AviSafe.

Responsible for training machine learning models,
recording execution metadata, and returning a standardized
training result.
"""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

import pandas as pd
from .registry import ModelRegistry

from src.core.logger import LoggerManager


@dataclass(slots=True)
class TrainingResult:
    """
    Stores the outcome of model training.
    """

    model_name: str

    estimator: Any

    training_time: float

    predictions: Any

    probabilities: Any | None


class Trainer:
    """
    Central training engine.

    This class is responsible only for fitting models.
    Evaluation is handled separately.
    """

    def __init__(self) -> None:

        self.logger = LoggerManager.get_logger(__name__)

    def train(
        self,
        model_name: str,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_validation: pd.DataFrame,
        **parameters,
    ) -> TrainingResult:
        """
        Train a model.

        Args:
            model_name:
                Registry identifier.

            X_train:
                Training features.

            y_train:
                Training labels.

            X_validation:
                Validation feature matrix.

            parameters:
                Optional parameter overrides.

        Returns:
            TrainingResult
        """

        definition = ModelRegistry.get(model_name)

        model = ModelRegistry.create(
            model_name,
            **parameters,
        )

        self.logger.info(
            "Training %s...",
            definition.name,
        )

        start = perf_counter()

        model.fit(
            X_train,
            y_train,
        )

        training_time = perf_counter() - start

        predictions = model.predict(
            X_validation
        )

        probabilities = None

        if definition.supports_probability:

            probabilities = model.predict_proba(
                X_validation
            )

        self.logger.info(
            "%s trained in %.2f seconds.",
            definition.name,
            training_time,
        )

        return TrainingResult(
            model_name=definition.name,
            estimator=model,
            training_time=training_time,
            predictions=predictions,
            probabilities=probabilities,
        )

    def train_all(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_validation: pd.DataFrame,
    ) -> list[TrainingResult]:
        """
        Train every registered model.

        Returns:
            List of TrainingResult objects.
        """

        results = []

        for identifier in ModelRegistry.names():

            result = self.train(
                identifier,
                X_train,
                y_train,
                X_validation,
            )

            results.append(result)

        return results