"""
Experiment tracking for AviSafe.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from src.core.logger import LoggerManager


@dataclass(slots=True)
class Experiment:

    experiment_id: str

    model_name: str

    dataset_name: str

    target_column: str

    started_at: str

    finished_at: str

    training_time: float

    random_state: int

    parameters: dict[str, Any]

    metrics: dict[str, float]

    feature_names: list[str]

    notes: str = ""


class ExperimentManager:

    """
    Responsible for creating and storing experiments.
    """

    def __init__(self):

        self.logger = LoggerManager.get_logger(__name__)

    def create(

        self,

        model_name: str,

        dataset_name: str,

        target_column: str,

        parameters: dict[str, Any],

        feature_names: list[str],

        random_state: int,

    ) -> Experiment:

        return Experiment(

            experiment_id=str(uuid.uuid4()),

            model_name=model_name,

            dataset_name=dataset_name,

            target_column=target_column,

            started_at=datetime.now().isoformat(),

            finished_at="",

            training_time=0,

            random_state=random_state,

            parameters=parameters,

            metrics={},

            feature_names=feature_names,

        )

    def complete(

        self,

        experiment: Experiment,

        metrics: dict[str, float],

        training_time: float,

    ) -> Experiment:

        experiment.finished_at = datetime.now().isoformat()

        experiment.training_time = training_time

        experiment.metrics = metrics

        return experiment

    def save(

        self,

        experiment: Experiment,

        destination: Path,

    ) -> None:

        destination.parent.mkdir(

            parents=True,

            exist_ok=True,

        )

        with open(

            destination,

            "w",

            encoding="utf-8",

        ) as file:

            json.dump(

                asdict(experiment),

                file,

                indent=4,

            )

        self.logger.info(

            "Experiment saved to %s",

            destination,

        )