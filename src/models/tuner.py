"""
Hyperparameter tuning engine for AviSafe.
"""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

import pandas as pd
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV

from src.core.logger import LoggerManager

from .registry import ModelRegistry


@dataclass(slots=True)
class TuningResult:
    """
    Stores the result of hyperparameter tuning.
    """

    model_name: str

    estimator: Any

    best_parameters: dict[str, Any]

    best_score: float

    tuning_time: float


class HyperparameterTuner:
    """
    Tunes machine learning models using Grid Search
    or Randomized Search.
    """

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def tune(
        self,
        model_name: str,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        parameter_grid: dict[str, list],
        *,
        method: str = "grid",
        cv: int = 5,
        scoring: str = "accuracy",
        n_iter: int = 20,
        sample_weight=None,
        **overrides,
    ) -> TuningResult:
        """
        Tune a machine learning model.

        Args:
            model_name:
                Registry identifier.

            X_train:
                Training features.

            y_train:
                Training labels.

            parameter_grid:
                Hyperparameter search space.

            method:
                grid or random.

            cv:
                Number of CV folds.

            scoring:
                Evaluation metric.

            n_iter:
                Used by Randomized Search.

            sample_weight:
                Optional per-sample weights (e.g. from
                sklearn.utils.class_weight.compute_sample_weight),
                correctly sliced per fold by scikit-learn's CV search.

            overrides:
                Optional model parameter overrides.
        """

        definition = ModelRegistry.get(model_name)

        estimator = ModelRegistry.create(
            model_name,
            **overrides,
        )

        self.logger.info(
            "Hyperparameter tuning: %s",
            definition.name,
        )

        start = perf_counter()

        if method == "grid":

            search = GridSearchCV(
                estimator=estimator,
                param_grid=parameter_grid,
                scoring=scoring,
                cv=cv,
                n_jobs=-1,
            )

        elif method == "random":

            search = RandomizedSearchCV(
                estimator=estimator,
                param_distributions=parameter_grid,
                scoring=scoring,
                cv=cv,
                n_iter=n_iter,
                random_state=42,
                n_jobs=-1,
            )

        else:
            raise ValueError(
                "method must be 'grid' or 'random'"
            )

        fit_kwargs = (
            {"sample_weight": sample_weight}
            if sample_weight is not None
            else {}
        )

        search.fit(
            X_train,
            y_train,
            **fit_kwargs,
        )

        elapsed = perf_counter() - start

        self.logger.info(
            "%s tuning completed in %.2f seconds.",
            definition.name,
            elapsed,
        )

        return TuningResult(
            model_name=definition.name,
            estimator=search.best_estimator_,
            best_parameters=search.best_params_,
            best_score=search.best_score_,
            tuning_time=elapsed,
        )

    def tune_all(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        tuning_grids: dict[str, dict[str, list]],
        *,
        method: str = "grid",
        scoring: str = "accuracy",
        cv: int = 5,
    ) -> list[TuningResult]:
        """
        Tune all registered models that have a
        corresponding parameter grid.
        """

        results: list[TuningResult] = []

        for model_name in ModelRegistry.names():

            if model_name not in tuning_grids:
                continue

            result = self.tune(
                model_name=model_name,
                X_train=X_train,
                y_train=y_train,
                parameter_grid=tuning_grids[model_name],
                method=method,
                scoring=scoring,
                cv=cv,
            )

            results.append(result)

        return results