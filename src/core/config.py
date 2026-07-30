from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Final


@dataclass(slots=True)
class Config:
    """
    Central configuration for the AviSafe project.

    This class manages project directories, dataset locations,
    model storage, reporting locations, and global constants.
    """

    project_root: Path = field(
        default_factory=lambda: Path(__file__).resolve().parents[2]
    )

    random_state: int = 42
    test_size: float = 0.20
    validation_size: float = 0.10
    cv_folds: int = 5

    raw_data_dir: Path = field(init=False)
    processed_data_dir: Path = field(init=False)
    external_data_dir: Path = field(init=False)

    models_dir: Path = field(init=False)

    reports_dir: Path = field(init=False)
    figures_dir: Path = field(init=False)
    metrics_dir: Path = field(init=False)
    exports_dir: Path = field(init=False)

    notebooks_dir: Path = field(init=False)
    docs_dir: Path = field(init=False)

    logs_dir: Path = field(init=False)

    supported_file_extensions: Final[tuple[str, ...]] = (
        ".csv",
        ".xlsx",
        ".xls",
        ".parquet",
    )

    def __post_init__(self) -> None:
        """Initialize all project paths."""

        data_dir = self.project_root / "data"

        self.raw_data_dir = data_dir / "raw"
        self.processed_data_dir = data_dir / "processed"
        self.external_data_dir = data_dir / "external"

        self.models_dir = self.project_root / "models"

        self.reports_dir = self.project_root / "reports"
        self.figures_dir = self.reports_dir / "figures"
        self.metrics_dir = self.reports_dir / "metrics"
        self.exports_dir = self.reports_dir / "exports"

        self.notebooks_dir = self.project_root / "notebooks"
        self.docs_dir = self.project_root / "docs"

        self.logs_dir = self.project_root / "logs"

        self._create_directories()

    def _create_directories(self) -> None:
        """Create required project directories if they do not exist."""

        directories = [
            self.raw_data_dir,
            self.processed_data_dir,
            self.external_data_dir,
            self.models_dir,
            self.reports_dir,
            self.figures_dir,
            self.metrics_dir,
            self.exports_dir,
            self.notebooks_dir,
            self.docs_dir,
            self.logs_dir,
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    @property
    def default_dataset(self) -> Path:
        """
        Return the default dataset location.

        Returns:
            Path: Default aviation dataset.
        """
        return self.raw_data_dir / "aviation_accidents.csv"

    def dataset_exists(self) -> bool:
        """
        Check whether the default dataset exists.

        Returns:
            bool: True if the dataset exists.
        """
        return self.default_dataset.exists()


config = Config()