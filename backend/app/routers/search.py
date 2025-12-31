"""Search API endpoints."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..database import search_files, vector_search
from ..models import SearchResultResponse, VectorSearchResult
from ..services.embeddings import generate_embedding


router = APIRouter(prefix="/search", tags=["search"])


class VectorSearchRequest(BaseModel):
    query: str
    top_k: int = 5


@router.get("", response_model=list[SearchResultResponse])
async def keyword_search(q: str = Query(..., min_length=1)):
    """Search files by keyword in title or summary."""
    results = search_files(q)
    return results


@router.post("/vector", response_model=list[VectorSearchResult])
async def semantic_search(request: VectorSearchRequest):
    """Search files using vector similarity."""
    # Generate embedding for the query
    query_embedding = generate_embedding(request.query)
    
    if not query_embedding:
        return []
    
    # Perform vector search
    results = vector_search(query_embedding, request.top_k)
    
    return results
