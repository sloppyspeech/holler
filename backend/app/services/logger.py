"""Logging service for Holler Summary Manager with in-memory log storage."""

import logging
from datetime import datetime
from collections import deque
from typing import Optional
from dataclasses import dataclass, field, asdict
import threading

from ..config import DEBUG


@dataclass
class LogEntry:
    """A single log entry."""
    timestamp: str
    level: str
    source: str
    message: str
    details: Optional[str] = None


class LogBuffer:
    """Thread-safe in-memory log buffer with max size."""
    
    def __init__(self, maxsize: int = 500):
        self.buffer = deque(maxlen=maxsize)
        self.lock = threading.Lock()
    
    def add(self, entry: LogEntry):
        with self.lock:
            self.buffer.append(entry)
    
    def get_all(self) -> list[dict]:
        with self.lock:
            return [asdict(e) for e in self.buffer]
    
    def get_recent(self, count: int = 100) -> list[dict]:
        with self.lock:
            entries = list(self.buffer)[-count:]
            return [asdict(e) for e in entries]
    
    def clear(self):
        with self.lock:
            self.buffer.clear()


# Global log buffer
log_buffer = LogBuffer()


class HollerLogger:
    """Custom logger that stores logs in memory for API access."""
    
    def __init__(self, name: str):
        self.name = name
        self.debug_enabled = DEBUG
        
        # Also set up standard Python logging
        self.logger = logging.getLogger(name)
        if DEBUG:
            self.logger.setLevel(logging.DEBUG)
        else:
            self.logger.setLevel(logging.INFO)
        
        # Add console handler if not already present
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def _log(self, level: str, message: str, details: Optional[str] = None):
        entry = LogEntry(
            timestamp=datetime.now().isoformat(),
            level=level,
            source=self.name,
            message=message,
            details=details
        )
        log_buffer.add(entry)
        
        # Also log to standard output
        log_message = f"[{self.name}] {message}"
        if details:
            log_message += f" | Details: {details}"
        
        if level == "DEBUG":
            self.logger.debug(log_message)
        elif level == "INFO":
            self.logger.info(log_message)
        elif level == "WARNING":
            self.logger.warning(log_message)
        elif level == "ERROR":
            self.logger.error(log_message)
    
    def debug(self, message: str, details: Optional[str] = None):
        if self.debug_enabled:
            self._log("DEBUG", message, details)
    
    def info(self, message: str, details: Optional[str] = None):
        self._log("INFO", message, details)
    
    def warning(self, message: str, details: Optional[str] = None):
        self._log("WARNING", message, details)
    
    def error(self, message: str, details: Optional[str] = None):
        self._log("ERROR", message, details)


def get_logger(name: str) -> HollerLogger:
    """Get a logger instance for a module."""
    return HollerLogger(name)


def get_logs(count: int = 100) -> list[dict]:
    """Get recent logs from the buffer."""
    return log_buffer.get_recent(count)


def get_all_logs() -> list[dict]:
    """Get all logs from the buffer."""
    return log_buffer.get_all()


def clear_logs():
    """Clear the log buffer."""
    log_buffer.clear()


def is_debug_enabled() -> bool:
    """Check if debug mode is enabled."""
    return DEBUG
