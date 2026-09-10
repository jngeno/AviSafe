"""
Dataset splitting utilities for AviSafe.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split

from src.core.config import Config
from src.core.logger import LoggerManager


@dataclass(slots=True)
class DataSplit:
    """
    Stores the result of a dataset split.
    """

    X_train: pd.DataFrame
    X_validation: pd.DataFrame
    X_test: pd.DataFrame

    y_train: pd.Series
    y_validation: pd.Series
    y_test: pd.Series


class DataSplitter:
    """
    Responsible for splitting datasets for machine learning.

    Supports:

    - Train / Validation / Test
    - Stratified sampling
    - K-Fold Cross Validation
    """

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()
        self.logger = LoggerManager.get_logger(__name__)

    def split(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        stratify: bool = True,
    ) -> DataSplit:
        """
        Split dataset into train, validation and test sets.

        Args:
            X:
                Feature matrix.

            y:
                Target labels.

            stratify:
                Whether to preserve class distribution.

        Returns:
            DataSplit
        """

        self.logger.info("Creating dataset split.")

        stratify_target = y if stratify else None

        X_train, X_temp, y_train, y_temp = train_test_split(
            X,
            y,
            test_size=self.config.test_size + self.config.validation_size,
            random_state=self.config.random_state,
            stratify=stratify_target,
        )

        validation_ratio = (
            self.config.validation_size
            / (self.config.test_size + self.config.validation_size)
        )

        stratify_temp = y_temp if stratify else None

        X_validation, X_test, y_validation, y_test = train_test_split(
            X_temp,
            y_temp,
            test_size=1 - validation_ratio,
            random_state=self.config.random_state,
            stratify=stratify_temp,
        )

        self.logger.info(
            "Training samples: %d",
            len(X_train),
        )

        self.logger.info(
            "Validation samples: %d",
            len(X_validation),
        )

        self.logger.info(
            "Test samples: %d",
            len(X_test),
        )

        return DataSplit(
            X_train=X_train,
            X_validation=X_validation,
            X_test=X_test,
            y_train=y_train,
            y_validation=y_validation,
            y_test=y_test,
        )

    def cross_validator(
        self,
    ) -> StratifiedKFold:
        """
        Create a reusable Stratified K-Fold object.

        Returns:
            StratifiedKFold
        """

        return StratifiedKFold(
            n_splits=self.config.cv_folds,
            shuffle=True,
            random_state=self.config.random_state,
        )