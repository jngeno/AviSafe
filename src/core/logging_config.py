"""Logging configuration for the AviSafe platform."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.core.config import CONFIG


@dataclass(frozen=True, slots=True)
class LoggingConfig:
    """Configuration values for application logging.

    Attributes:
        log_dir: Directory where log files are stored.
        log_file: Full path to the active application log file.
        level: Logging threshold used by the root application logger.
        max_bytes: Maximum size of a log file before rotation.
        backup_count: Number of rotated log files retained.
        date_format: Timestamp format used in log records.
        message_format: Structured text format used for log records.
    """

    log_dir: Path = CONFIG.logs_dir
    log_file: Path = CONFIG.logs_dir / "avisafe.log"
    level: int = logging.INFO
    max_bytes: int = 5_000_000
    backup_count: int = 5
    date_format: str = "%Y-%m-%d %H:%M:%S"
    message_format: str = (
        "%(asctime)s | %(levelname)s | %(name)s | "
        "%(filename)s:%(lineno)d | %(message)s"
    )


def configure_logging(config: LoggingConfig | None = None) -> None:
    """Configure application-wide logging handlers.

    Args:
        config: Optional logging configuration. When omitted, default AviSafe
            logging settings are used.
    """

    active_config = config or LoggingConfig()
    active_config.log_dir.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(
        fmt=active_config.message_format,
        datefmt=active_config.date_format,
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(active_config.level)

    file_handler = RotatingFileHandler(
        filename=active_config.log_file,
        maxBytes=active_config.max_bytes,
        backupCount=active_config.backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(active_config.level)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(active_config.level)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for an AviSafe module.

    Args:
        name: Logger name, normally the caller's ``__name__``.

    Returns:
        Configured logger instance.
    """

    return logging.getLogger(name)
