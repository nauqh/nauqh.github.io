"""Logging setup.

Everything logs to the console. When ``LOG_DIR`` is set, the bot also keeps rotating files:
``bot.log`` for everything, and ``track.log`` for the tracks that were played.
"""

from __future__ import annotations

import logging.config
import os
from typing import Any

CONSOLE_FORMAT = (
    "%(log_color)s%(bold)s%(levelname)-1.1s%(thin)s %(asctime)23.23s %(bold)s%(name)s: %(thin)s%(message)s%(reset)s"
)
FILE_FORMAT = "%(asctime)s %(levelname)s %(name)s.%(funcName)s:%(lineno)d: %(message)s"
TRACK_FORMAT = "%(asctime)s: %(message)s"


def build_config(level: str = "INFO", log_dir: str | None = None) -> dict[str, Any]:
    """
    Build a `logging.config.dictConfig` mapping.

    Args:
        level: The level for MusicCat's own loggers and the root logger.
        log_dir: Directory to write log files into. No files are written when this is `None`.
    """
    handlers: dict[str, Any] = {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "console",
            "stream": "ext://sys.stdout",
        },
    }
    root_handlers = ["console"]
    track_handlers = ["console"]

    if log_dir is not None:
        os.makedirs(log_dir, exist_ok=True)
        handlers["bot_file"] = {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "file",
            "filename": os.path.join(log_dir, "bot.log"),
            "encoding": "utf-8",
            "when": "midnight",
            "backupCount": 10,
            "utc": False,
        }
        handlers["track_file"] = {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "track",
            "filename": os.path.join(log_dir, "track.log"),
            "encoding": "utf-8",
            "when": "midnight",
            "backupCount": 10,
            "utc": False,
        }
        root_handlers.append("bot_file")
        track_handlers.append("track_file")

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "root": {"handlers": root_handlers, "level": level},
        "loggers": {
            "musiccat": {"level": level},
            "musiccat.track": {"handlers": track_handlers, "level": "INFO", "propagate": False},
            "hikari": {"level": "INFO"},
            "lavalink": {"level": "INFO"},
        },
        "handlers": handlers,
        "formatters": {
            "console": {"()": "colorlog.ColoredFormatter", "format": CONSOLE_FORMAT},
            "file": {"format": FILE_FORMAT},
            "track": {"format": TRACK_FORMAT},
        },
    }


def configure(level: str = "INFO", log_dir: str | None = None) -> None:
    """Apply the logging configuration."""
    logging.config.dictConfig(build_config(level, log_dir))
