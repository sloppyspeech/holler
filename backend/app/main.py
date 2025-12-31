"""Holler Summary Manager - FastAPI Main Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import API_PREFIX, CORS_ORIGINS, DEBUG
from .database import init_database
from .routers import files, search, chat, models, logs
from .services.logger import get_logger


# Initialize logger for main module
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: Initialize database
    init_database()
    
    if DEBUG:
        logger.info("Debug mode is ENABLED - verbose logging active")
    else:
        logger.info("Debug mode is disabled - set HOLLER_DEBUG=true to enable")
    
    logger.info("Holler Summary Manager started", f"Debug={DEBUG}")
    print("🚀 Holler Summary Manager started" + (" (DEBUG MODE)" if DEBUG else ""))
    yield
    # Shutdown
    logger.info("Holler Summary Manager stopped")
    print("👋 Holler Summary Manager stopped")


app = FastAPI(
    title="Holler Summary Manager",
    description="A local-first application for managing YouTube video summaries with RAG capabilities",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(files.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(models.router, prefix=API_PREFIX)
app.include_router(logs.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Holler Summary Manager",
        "version": "1.0.0",
        "status": "running",
        "debug": DEBUG,
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    from .services.embeddings import check_ollama_connection
    
    return {
        "status": "healthy",
        "debug": DEBUG,
        "ollama_connected": check_ollama_connection()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
