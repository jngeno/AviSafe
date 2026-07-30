"""
Base interface for explainability modules.

All explainability implementations in AviSafe must inherit
from this abstract base class.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import pandas as pd


class BaseExplainer(ABC):
    """
    Abstract interface for model explainers.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Return the explainer name.
        """
        ...

    @abstractmethod
    def fit(
        self,
        model: Any,
        X_train: pd.DataFrame,
    ) -> None:
        """
        Initialize the explainer.

        Args:
            model:
                Trained machine learning model.

            X_train:
                Training dataset used to build the explainer.
        """
        ...

    @abstractmethod
    def explain(
        self,
        X: pd.DataFrame,
    ) -> Any:
        """
        Generate explanations.

        Args:
            X:
                Samples to explain.

        Returns:
            Explanation object.
        """
        ...

    @abstractmethod
    def summary(self) -> Any:
        """
        Return a global explanation summary.
        """
        ...