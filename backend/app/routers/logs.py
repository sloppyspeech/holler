"""Logs API endpoints for debug mode."""

from fastapi import APIRouter

from ..services.logger import get_logs, get_all_logs, clear_logs, is_debug_enabled


router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/status")
async def get_debug_status():
    """Get debug mode status."""
    return {
        "debug_enabled": is_debug_enabled(),
        "message": "Debug mode is " + ("enabled" if is_debug_enabled() else "disabled")
    }


@router.get("")
async def list_logs(count: int = 100):
    """Get recent logs."""
    logs = get_logs(count)
    return {
        "debug_enabled": is_debug_enabled(),
        "count": len(logs),
        "logs": logs
    }


@router.get("/all")
async def list_all_logs():
    """Get all logs in buffer."""
    logs = get_all_logs()
    return {
        "debug_enabled": is_debug_enabled(),
        "count": len(logs),
        "logs": logs
    }


@router.delete("")
async def delete_logs():
    """Clear all logs."""
    clear_logs()
    return {"message": "Logs cleared"}
