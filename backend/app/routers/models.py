"""Model management API endpoints."""

from fastapi import APIRouter, HTTPException

from ..models import ModelUpdateRequest, ModelInfo
from ..services.embeddings import (
    list_available_models,
    get_current_model,
    set_current_model,
    get_default_app_model,
    set_default_app_model,
    check_ollama_connection
)


router = APIRouter(prefix="/models", tags=["models"])


@router.get("/status")
async def get_status():
    """Check Ollama connection status."""
    connected = check_ollama_connection()
    return {
        "connected": connected,
        "current_model": get_current_model(),
        "default_app_model": get_default_app_model()
    }


@router.get("", response_model=list[ModelInfo])
async def list_models():
    """List all available Ollama models."""
    models = list_available_models()
    current = get_current_model()
    
    return [
        ModelInfo(
            name=model['name'],
            is_current=model['is_current'],
            is_app_current=model['is_app_current']
        )
        for model in models
    ]


@router.get("/current")
async def get_current():
    """Get the currently configured embedding model."""
    return {"model": get_current_model()}


@router.put("/current")
async def update_current(request: ModelUpdateRequest):
    """Set the embedding model to use."""
    # Verify the model exists
    models = list_available_models()
    model_names = [m['name'] for m in models]
    
    if request.model_name not in model_names:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{request.model_name}' not found. Available: {model_names}"
        )
    
    set_current_model(request.model_name)
    return {"message": f"Embedding model set to {request.model_name}", "model": request.model_name}


@router.get("/app")
async def get_app_current():
    """Get the currently configured default app model."""
    return {"model": get_default_app_model()}


@router.put("/app")
async def update_app_current(request: ModelUpdateRequest):
    """Set the default app model to use."""
    # Verify the model exists
    models = list_available_models()
    model_names = [m['name'] for m in models]
    
    if request.model_name not in model_names:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{request.model_name}' not found. Available: {model_names}"
        )
    
    set_default_app_model(request.model_name)
    return {"message": f"App model set to {request.model_name}", "model": request.model_name}
