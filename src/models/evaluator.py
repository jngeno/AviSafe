"""
Model evaluation engine for AviSafe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    matthews_corrcoef,
    precision_score,
    recall_score,
    roc_auc_score,
)

from src.core.logger import LoggerManager


@dataclass(slots=True)
class EvaluationResult:
    """
    Stores evaluation metrics for a trained model.
    """

    model_name: str

    accuracy: float

    balanced_accuracy: float

    precision: float

    recall: float

    f1_score: float

    roc_auc: float | None

    matthews_cc: float

    cohen_kappa: float

    confusion_matrix: np.ndarray

    classification_report: dict[str, Any]


class Evaluator:
    """
    Evaluates classification models.
    """

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def evaluate(
        self,
        *,
        model_name: str,
        y_true: pd.Series,
        predictions: np.ndarray,
        probabilities: np.ndarray | None = None,
    ) -> EvaluationResult:
        """
        Evaluate a classification model.
        """

        self.logger.info(
            "Evaluating %s",
            model_name,
        )

        accuracy = accuracy_score(
            y_true,
            predictions,
        )

        balanced_accuracy = balanced_accuracy_score(
            y_true,
            predictions,
        )

        precision = precision_score(
            y_true,
            predictions,
            average="weighted",
            zero_division=0,
        )

        recall = recall_score(
            y_true,
            predictions,
            average="weighted",
            zero_division=0,
        )

        f1 = f1_score(
            y_true,
            predictions,
            average="weighted",
            zero_division=0,
        )

        mcc = matthews_corrcoef(
            y_true,
            predictions,
        )

        kappa = cohen_kappa_score(
            y_true,
            predictions,
        )

        matrix = confusion_matrix(
            y_true,
            predictions,
        )

        report = classification_report(
            y_true,
            predictions,
            output_dict=True,
            zero_division=0,
        )

        auc = None

        if probabilities is not None:

            try:

                if probabilities.ndim == 2 and probabilities.shape[1] == 2:

                    auc = roc_auc_score(
                        y_true,
                        probabilities[:, 1],
                    )

                elif probabilities.ndim == 2:

                    auc = roc_auc_score(
                        y_true,
                        probabilities,
                        multi_class="ovr",
                    )

                else:

                    auc = roc_auc_score(
                        y_true,
                        probabilities,
                    )

            except ValueError:

                auc = None

        return EvaluationResult(
            model_name=model_name,
            accuracy=accuracy,
            balanced_accuracy=balanced_accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1,
            roc_auc=auc,
            matthews_cc=mcc,
            cohen_kappa=kappa,
            confusion_matrix=matrix,
            classification_report=report,
        )

    @staticmethod
    def comparison_table(
        evaluations: list[EvaluationResult],
    ) -> pd.DataFrame:
        """
        Convert evaluation results into a comparison table.
        """

        rows = []

        for result in evaluations:

            rows.append(
                {
                    "Model": result.model_name,
                    "Accuracy": result.accuracy,
                    "Balanced Accuracy": result.balanced_accuracy,
                    "Precision": result.precision,
                    "Recall": result.recall,
                    "F1 Score": result.f1_score,
                    "ROC AUC": result.roc_auc,
                    "Matthews CC": result.matthews_cc,
                    "Cohen Kappa": result.cohen_kappa,
                }
            )

        dataframe = pd.DataFrame(rows)

        return dataframe.sort_values(
            by="F1 Score",
            ascending=False,
        ).reset_index(drop=True)