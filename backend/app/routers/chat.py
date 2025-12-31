"""Chat API endpoints for RAG functionality."""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from ..models import ChatRequest, ChatResponse, ChatMessage
from ..services.rag import generate_response, get_chat_history, clear_session, list_sessions


router = APIRouter(prefix="/chat", tags=["chat"])


from ..services.logger import get_logger
logger = get_logger("chat_router")

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get a RAG-enhanced response."""
    try:
        logger.info(f"Received chat request: {request.message[:50]}...")
        # Use provided model or the default app model
        from ..services.embeddings import get_default_app_model
        target_model = request.model or get_default_app_model()
        logger.info(f"Using model: {target_model}")
        
        response_text, sources, session_id, model_used, duration_ms = generate_response(
            query=request.message,
            session_id=request.session_id,
            model=target_model
        )
        logger.info("RAG response generated successfully")
    except Exception as e:
        logger.error("Fatal error in chat endpoint", str(e))
        import traceback
        logger.debug("Traceback", traceback.format_exc())
        # Re-raise to let FastAPI handle it if it's truly a fatal system error
        # but normally generate_response catches most things.
        raise
    
    return ChatResponse(
        message=response_text,
        context_sources=sources,
        session_id=session_id,
        model_used=model_used,
        response_time_ms=duration_ms
    )


@router.get("/history/{session_id}", response_model=list[ChatMessage])
async def get_history(session_id: str):
    """Get chat history for a session."""
    history = get_chat_history(session_id)
    return [
        ChatMessage(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg.get("timestamp"),
            model_used=msg.get("model_used"),
            response_time_ms=msg.get("response_time_ms"),
            context_sources=msg.get("context_sources")
        )
        for msg in history
    ]


@router.delete("/session/{session_id}")
async def delete_session_endpoint(session_id: str):
    """Clear a chat session."""
    clear_session(session_id)
    return {"message": "Session cleared"}


@router.get("/sessions")
async def get_sessions():
    """List all chat sessions."""
    return list_sessions()
