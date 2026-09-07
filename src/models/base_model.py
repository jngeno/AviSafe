"""
Base machine learning model interface for AviSafe.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd


class BaseModel(ABC):
    """
    Abstract base class for all machine learning models.

    Every model implementation must provide methods for
    training, prediction, probability estimation,
    evaluation, and parameter retrieval.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Return the model name.
        """
        ...

    @abstractmethod
    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
    ) -> None:
        """
        Train the model.
        """
        ...

    @abstractmethod
    def predict(
        self,
        X: pd.DataFrame,
    ):
        """
        Predict target labels.
        """
        ...

    @abstractmethod
    def predict_proba(
        self,
        X: pd.DataFrame,
    ):
        """
        Predict class probabilities.
        """
        ...

    @abstractmethod
    def get_params(self) -> dict:
        """
        Return model parameters.
        """
        ...

    @abstractmethod
    def set_params(self, **params):
        """
        Update model parameters.
        """
        ...