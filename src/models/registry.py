"""
Model registry for AviSafe.

The registry provides a centralized location for all supported
machine learning algorithms and their configurations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from lightgbm import LGBMClassifier
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier


@dataclass(slots=True, frozen=True)
class ModelDefinition:
    """
    Represents a registered machine learning model.
    """

    name: str
    estimator: type
    supports_probability: bool
    supports_feature_importance: bool
    supports_shap: bool
    default_parameters: dict[str, Any]


class ModelRegistry:
    """
    Central registry for all supported machine learning models.
    """

    _MODELS: dict[str, ModelDefinition] = {
        "random_forest": ModelDefinition(
            name="Random Forest",
            estimator=RandomForestClassifier,
            supports_probability=True,
            supports_feature_importance=True,
            supports_shap=True,
            default_parameters={
                "n_estimators": 300,
                "max_depth": None,
                "random_state": 42,
                # Single-threaded: HyperparameterTuner already parallelizes
                # across CV folds/candidates at the search level (n_jobs=-1
                # in RandomizedSearchCV/GridSearchCV). Also giving the
                # estimator itself n_jobs=-1 nests two parallel pools inside
                # each other, oversubscribing every core many times over and
                # making tuning dramatically *slower*, not faster.
                "n_jobs": 1,
            },
        ),
        "extra_trees": ModelDefinition(
            name="Extra Trees",
            estimator=ExtraTreesClassifier,
            supports_probability=True,
            supports_feature_importance=True,
            supports_shap=True,
            default_parameters={
                "n_estimators": 300,
                "random_state": 42,
                # See random_forest above: avoid nested parallelism with
                # the search-level n_jobs=-1.
                "n_jobs": 1,
            },
        ),
        "xgboost": ModelDefinition(
            name="XGBoost",
            estimator=XGBClassifier,
            supports_probability=True,
            supports_feature_importance=True,
            supports_shap=True,
            default_parameters={
                "n_estimators": 300,
                "learning_rate": 0.05,
                "max_depth": 6,
                "random_state": 42,
                "eval_metric": "logloss",
                # XGBoost defaults to all-core internal threading; pin to 1
                # to avoid nesting under the search's own n_jobs=-1 (see
                # random_forest above).
                "n_jobs": 1,
            },
        ),
        "lightgbm": ModelDefinition(
            name="LightGBM",
            estimator=LGBMClassifier,
            supports_probability=True,
            supports_feature_importance=True,
            supports_shap=True,
            default_parameters={
                "n_estimators": 300,
                "learning_rate": 0.05,
                "random_state": 42,
                # Same nested-parallelism reasoning as xgboost above.
                "n_jobs": 1,
            },
        ),
        "logistic_regression": ModelDefinition(
            name="Logistic Regression",
            estimator=LogisticRegression,
            supports_probability=True,
            supports_feature_importance=False,
            supports_shap=True,
            default_parameters={
                "max_iter": 1000,
                "random_state": 42,
            },
        ),
        "svm": ModelDefinition(
            name="Support Vector Machine",
            estimator=SVC,
            supports_probability=True,
            supports_feature_importance=False,
            supports_shap=True,
            default_parameters={
                "kernel": "rbf",
                "probability": True,
                "random_state": 42,
                # Same reasoning as logistic_regression's max_iter above:
                # bound the solver so a single pathological fit (unscaled
                # features can make libsvm's SMO converge very slowly)
                # can't run indefinitely inside a parallel search.
                "max_iter": 5000,
            },
        ),
    }

    @classmethod
    def names(cls) -> list[str]:
        """
        Return all registered model identifiers.
        """
        return sorted(cls._MODELS.keys())

    @classmethod
    def definitions(cls) -> list[ModelDefinition]:
        """
        Return all registered model definitions.
        """
        return list(cls._MODELS.values())

    @classmethod
    def get(cls, identifier: str) -> ModelDefinition:
        """
        Retrieve a model definition.

        Args:
            identifier:
                Registry key.

        Raises:
            KeyError:
                If the model is not registered.
        """
        if identifier not in cls._MODELS:
            available = ", ".join(cls.names())
            raise KeyError(
                f"Unknown model '{identifier}'. "
                f"Available models: {available}"
            )

        return cls._MODELS[identifier]

    @classmethod
    def create(
        cls,
        identifier: str,
        **overrides: Any,
    ) -> Any:
        """
        Create a model instance.

        Args:
            identifier:
                Registry key.

            overrides:
                Parameter overrides.

        Returns:
            Instantiated estimator.
        """

        definition = cls.get(identifier)

        parameters = {
            **definition.default_parameters,
            **overrides,
        }

        return definition.estimator(**parameters)