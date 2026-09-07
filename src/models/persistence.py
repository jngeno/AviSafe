"""
Persistence utilities for AviSafe.

Responsible for saving and loading complete model packages.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib

from src.core.logger import LoggerManager

from .experiment import Experiment


class ModelPersistence:
    """
    Saves and loads trained AviSafe models together with
    all metadata required for reproducibility.
    """

    MODEL_FILENAME = "model.joblib"
    METADATA_FILENAME = "metadata.json"
    EXPERIMENT_FILENAME = "experiment.json"

    def __init__(self) -> None:
        self.logger = LoggerManager.get_logger(__name__)

    def save(
        self,
        *,
        model: Any,
        experiment: Experiment,
        feature_names: list[str],
        destination: Path,
        preprocessing: dict[str, Any] | None = None,
        risk_engineering: dict[str, Any] | None = None,
        version: str = "1.0.0",
    ) -> None:
        """
        Save a complete model package.

        Args:
            model:
                Trained estimator.

            experiment:
                Experiment metadata.

            feature_names:
                Ordered feature names.

            destination:
                Output directory.

            preprocessing:
                Preprocessing configuration.

            risk_engineering:
                Risk engineering configuration.

            version:
                Model package version.
        """

        destination.mkdir(
            parents=True,
            exist_ok=True,
        )

        joblib.dump(
            model,
            destination / self.MODEL_FILENAME,
        )

        metadata = {
            "saved_at": datetime.now(UTC).isoformat(),
            "model_name": experiment.model_name,
            "version": version,
            "feature_count": len(feature_names),
        }

        self._write_json(
            destination / self.METADATA_FILENAME,
            metadata,
        )

        self._write_json(
            destination / self.EXPERIMENT_FILENAME,
            asdict(experiment),
        )

        self._write_json(
            destination / "feature_names.json",
            feature_names,
        )

        self._write_json(
            destination / "preprocessing.json",
            preprocessing or {},
        )

        self._write_json(
            destination / "risk_engineering.json",
            risk_engineering or {},
        )

        self._write_json(
            destination / "version.json",
            {
                "version": version,
            },
        )

        self.logger.info(
            "Model package saved to %s",
            destination,
        )

    def load(
        self,
        model_directory: Path,
    ) -> dict[str, Any]:
        """
        Load a complete model package.

        Args:
            model_directory:
                Directory containing the saved model.

        Returns:
            Dictionary containing the model package.
        """

        package = {
            "model": joblib.load(
                model_directory / self.MODEL_FILENAME
            ),
            "metadata": self._read_json(
                model_directory / self.METADATA_FILENAME
            ),
            "experiment": self._read_json(
                model_directory / self.EXPERIMENT_FILENAME
            ),
            "feature_names": self._read_json(
                model_directory / "feature_names.json"
            ),
            "preprocessing": self._read_json(
                model_directory / "preprocessing.json"
            ),
            "risk_engineering": self._read_json(
                model_directory / "risk_engineering.json"
            ),
            "version": self._read_json(
                model_directory / "version.json"
            ),
        }

        self.logger.info(
            "Loaded model package from %s",
            model_directory,
        )

        return package

    @staticmethod
    def _write_json(
        path: Path,
        data: Any,
    ) -> None:
        """
        Write JSON to disk.
        """

        with open(
            path,
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                data,
                file,
                indent=4,
                default=str,
            )

    @staticmethod
    def _read_json(
        path: Path,
    ) -> Any:
        """
        Read JSON from disk.
        """

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)