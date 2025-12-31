"""Configuration settings for Holler Summary Manager."""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "holler.db"

# Debug mode - set via environment variable
# Can be set with: HOLLER_DEBUG=true or DEBUG=true
_debug_env = os.environ.get("HOLLER_DEBUG", os.environ.get("DEBUG", "false"))
DEBUG = _debug_env.lower() in ("true", "1", "yes")

# Print debug status on startup for visibility
print(f"🔍 Debug mode: {'ENABLED' if DEBUG else 'DISABLED'} (HOLLER_DEBUG={_debug_env})")

# Ollama settings
OLLAMA_HOST = "http://localhost:11435"
EMBEDDING_MODEL = "nomic-embed-text:latest"
CHAT_MODEL = "gemma3:1b"

# API settings
API_PREFIX = "/api"
CORS_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
]

# Vector search settings
EMBEDDING_DIMENSION = 768  # nomic-embed-text dimension
TOP_K_RESULTS = 7  # Number of results for vector search
