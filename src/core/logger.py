from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.core.config import Config


class LoggerManager:
    """
    Creates and manages application loggers.

    A singleton-like cache is used to prevent duplicate handlers
    from being attached to the same logger.
    """

    _configured_loggers: dict[str, logging.Logger] = {}

    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Return a configured logger.

        Args:
            name:
                Name of the logger.

        Returns:
            Configured logger instance.
        """
        if name in cls._configured_loggers:
            return cls._configured_loggers[name]

        config = Config()

        logger = logging.getLogger(name)
        logger.setLevel(logging.INFO)
        logger.propagate = False

        if logger.handlers:
            return logger

        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        log_file = config.logs_dir / "avisafe.log"

        file_handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=5 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )

        file_handler.setFormatter(formatter)

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

        cls._configured_loggers[name] = logger

        return logger