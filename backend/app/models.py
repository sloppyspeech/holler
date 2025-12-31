"""Pydantic models for API request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# Request models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


class BatchProcessRequest(BaseModel):
    directory_path: str


class ModelUpdateRequest(BaseModel):
    model_name: str


# Response models
class FileMetadataResponse(BaseModel):
    id: int
    actual_file_name: str
    site_name: str
    video_title: Optional[str]
    extract_date: Optional[str]
    created_at: Optional[str]
    model_used: Optional[str]
    calc_date: Optional[str]
    has_embedding: bool


class FileDetailResponse(FileMetadataResponse):
    transcript: Optional[str]
    summary: Optional[str]
    mind_map: Optional[str]
    key_takeaway: Optional[str]
    raw_content: Optional[str] = None


class SearchResultResponse(BaseModel):
    id: int
    actual_file_name: str
    site_name: str
    video_title: Optional[str]
    extract_date: Optional[str]
    summary: Optional[str]
    has_embedding: bool


class VectorSearchResult(BaseModel):
    file_id: int
    distance: float
    video_title: Optional[str]
    summary: Optional[str]


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    context_sources: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    message: str
    context_sources: list[dict]
    session_id: str
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None


class ModelInfo(BaseModel):
    name: str
    is_current: bool
    is_app_current: bool


class ProcessingResult(BaseModel):
    success: bool
    message: str
    processed_count: int
    failed_count: int
    errors: list[str]
