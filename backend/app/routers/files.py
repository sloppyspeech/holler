"""File management API endpoints."""

import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
import aiofiles

from ..config import DATA_DIR
from ..database import (
    get_all_files,
    get_file_by_id,
    delete_file,
    delete_embedding,
    delete_all_embeddings,
    reset_embeddings_table,
    search_files,
    insert_file_metadata,
    insert_file_contents,
    update_embedding,
    get_files_without_embeddings
)
from ..models import (
    FileMetadataResponse,
    FileDetailResponse,
    SearchResultResponse,
    BatchProcessRequest,
    ProcessingResult
)
from ..services.parser import process_file, find_markdown_files
from ..services.embeddings import generate_embedding, get_current_model
from ..services.logger import get_logger


# Initialize logger
logger = get_logger("files")


router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=list[FileMetadataResponse])
async def list_files():
    """List all files with metadata."""
    files = get_all_files()
    return files


@router.get("/search", response_model=list[SearchResultResponse])
async def search(q: str = Query(..., min_length=1)):
    """Search files by keyword in title or summary."""
    results = search_files(q)
    return results


@router.get("/debug/find")
async def debug_find(q: str = Query(..., min_length=1)):
    """Debug endpoint to find files by title keyword and check embedding status."""
    files = get_all_files()
    matches = [f for f in files if q.lower() in (f.get('video_title') or '').lower()]
    return [{
        "id": f.get('id'),
        "video_title": f.get('video_title'),
        "has_embedding": f.get('has_embedding'),
        "model_used": f.get('model_used'),
        "calc_date": f.get('calc_date')
    } for f in matches]


@router.get("/debug/embeddings")
async def debug_embeddings():
    """Debug endpoint to show all file_ids in the embeddings table."""
    from ..database import get_embedding_file_ids
    file_ids = get_embedding_file_ids()
    return {"count": len(file_ids), "file_ids": sorted(file_ids)}


@router.get("/debug/distance/{file_id}")
async def debug_distance(file_id: int, q: str = Query(..., min_length=1)):
    """Debug: Check the distance of a specific file_id for a given query."""
    from ..database import vector_search
    from ..services.embeddings import generate_embedding
    
    query_embedding = generate_embedding(q)
    if not query_embedding:
        return {"error": "Failed to generate query embedding"}
    
    # Search with high k to find where this file_id ranks
    results = vector_search(query_embedding, top_k=200)
    
    for i, r in enumerate(results):
        if r.get('file_id') == file_id:
            return {
                "file_id": file_id,
                "rank": i + 1,
                "distance": r.get('distance'),
                "title": r.get('video_title'),
                "query": q
            }
    
    return {"error": f"file_id {file_id} not found in vector search results (checked top 200)"}


@router.get("/{file_id}", response_model=FileDetailResponse)
async def get_file(file_id: int):
    """Get a single file with all its content."""
    file = get_file_by_id(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Also read the original file content from disk
    try:
        file_path = DATA_DIR / file['actual_file_name']
        if file_path.exists():
            async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                file['raw_content'] = await f.read()
        else:
            file['raw_content'] = "Original file not found on disk."
    except Exception as e:
        logger.error(f"Error reading original file {file['actual_file_name']}", str(e))
        file['raw_content'] = f"Error reading original file: {str(e)}"
        
    return file


@router.delete("/{file_id}")
async def remove_file(file_id: int):
    """Delete a file from the database."""
    file = get_file_by_id(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    delete_file(file_id)
    return {"message": "File deleted successfully"}


@router.post("/{file_id}/recalculate")
async def recalculate_embedding(file_id: int):
    """Recalculate the embedding for a file."""
    logger.info(f"Recalculate embedding requested for file ID: {file_id}")
    file = get_file_by_id(file_id)
    if not file:
        logger.warning(f"File ID {file_id} not found for recalculation")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get the summary text for embedding
    summary = file.get('summary')
    if not summary:
        logger.warning(f"File ID {file_id} ('{file.get('video_title')}') has no summary to embed")
        raise HTTPException(status_code=400, detail="No summary content to embed")
    
    # Generate new embedding - include title for better search relevance
    title = file.get('video_title') or file.get('actual_file_name', '')
    embed_text = f"{title}\n\n{summary}"
    logger.debug(f"Generating new embedding for file {file_id}")
    embedding = generate_embedding(embed_text)
    if not embedding:
        logger.error(f"Failed to generate embedding for file {file_id}")
        raise HTTPException(status_code=500, detail="Failed to generate embedding")
    
    # Update in database
    model_used = get_current_model()
    update_embedding(file_id, embedding, model_used)
    logger.info(f"Successfully recalculated embedding for file {file_id}", f"Model: {model_used}")
    
    return {"message": "Embedding recalculated successfully", "model": model_used}


@router.delete("/{file_id}/embedding")
async def remove_embedding(file_id: int):
    """Delete only the embedding for a file (keep the file)."""
    file = get_file_by_id(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not file.get('has_embedding'):
        raise HTTPException(status_code=400, detail="File has no embedding to delete")
    
    delete_embedding(file_id)
    return {"message": "Embedding deleted successfully"}


@router.delete("/embeddings/all")
async def remove_all_embeddings():
    """Delete all embeddings from the database."""
    logger.info("Deleting all embeddings")
    deleted_count = delete_all_embeddings()
    logger.info(f"Deleted {deleted_count} embeddings")
    return {"message": f"Deleted {deleted_count} embeddings successfully", "deleted_count": deleted_count}


@router.post("/reset-embeddings")
async def reset_embeddings():
    """Drop and recreate the embeddings table. Use when virtual table is corrupted."""
    logger.info("Resetting embeddings table - dropping and recreating")
    reset_embeddings_table()
    logger.info("Embeddings table reset complete")
    return {"message": "Embeddings table has been reset. Please run Vectorize All to regenerate embeddings."}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a single .md file."""
    logger.info(f"Upload requested: {file.filename}")
    
    if not file.filename.endswith('.md'):
        logger.warning(f"Rejected non-md file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only .md files are allowed")
    
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logger.debug(f"Data directory: {DATA_DIR}")
    
    # Save file to data directory
    file_path = DATA_DIR / file.filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    logger.debug(f"File saved to: {file_path}", f"Size: {len(content)} bytes")
    
    # Process the file
    try:
        logger.debug(f"Processing file: {file_path}")
        metadata, file_content = process_file(file_path)
        
        logger.debug(f"Parsed metadata", f"Title: {metadata.video_title}, Site: {metadata.site_name}, Date: {metadata.extract_date}")
        logger.debug(f"Parsed content", f"Summary: {len(file_content.summary or '')} chars, Transcript: {len(file_content.transcript or '')} chars")
        
        # Insert into database
        file_id = insert_file_metadata(
            actual_file_name=metadata.actual_file_name,
            site_name=metadata.site_name,
            video_title=metadata.video_title,
            extract_date=metadata.extract_date
        )
        logger.debug(f"Inserted metadata with ID: {file_id}")
        
        insert_file_contents(
            file_id=file_id,
            transcript=file_content.transcript,
            summary=file_content.summary,
            mind_map=file_content.mind_map,
            key_takeaway=file_content.key_takeaway
        )
        logger.debug(f"Inserted contents for file ID: {file_id}")
        
        logger.info(f"Upload successful: {file.filename}", f"ID={file_id}")
        
        return {
            "message": "File uploaded and processed successfully",
            "file_id": file_id,
            "video_title": metadata.video_title
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {file.filename}", str(e))
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/batch", response_model=ProcessingResult)
async def batch_process(request: BatchProcessRequest):
    """Batch process all .md files in a directory."""
    directory = Path(request.directory_path)
    
    if not directory.exists():
        raise HTTPException(status_code=400, detail="Directory does not exist")
    
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    # Find all markdown files
    md_files = find_markdown_files(directory)
    
    if not md_files:
        return ProcessingResult(
            success=True,
            message="No .md files found in directory",
            processed_count=0,
            failed_count=0,
            errors=[]
        )
    
    processed = 0
    failed = 0
    errors = []
    
    for file_path in md_files:
        try:
            metadata, file_content = process_file(file_path)
            
            file_id = insert_file_metadata(
                actual_file_name=metadata.actual_file_name,
                site_name=metadata.site_name,
                video_title=metadata.video_title,
                extract_date=metadata.extract_date
            )
            
            insert_file_contents(
                file_id=file_id,
                transcript=file_content.transcript,
                summary=file_content.summary,
                mind_map=file_content.mind_map,
                key_takeaway=file_content.key_takeaway
            )
            
            processed += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"{file_path.name}: {str(e)}")
    
    return ProcessingResult(
        success=failed == 0,
        message=f"Processed {processed} files, {failed} failed",
        processed_count=processed,
        failed_count=failed,
        errors=errors
    )


@router.post("/vectorize-all")
async def vectorize_all():
    """Generate embeddings for all files without embeddings."""
    logger.info("Starting batch vectorization for all pending files")
    files = get_files_without_embeddings()
    processed = 0
    failed = 0
    
    if not files:
        logger.info("No files need embeddings")
        return {"message": "No files to vectorize", "processed": 0, "failed": 0}
    
    logger.info(f"Found {len(files)} files to vectorize")
    
    for file in files:
        file_id = file.get('id')
        title = file.get('video_title') or file.get('actual_file_name')
        summary = file.get('summary')
        
        if not summary:
            logger.warning(f"Skipping file {file_id} ('{title}'): No summary content found")
            failed += 1
            continue
            
        try:
            logger.info(f"Vectorizing file {file_id}: '{title}'")
            # Include title in embedding text for better search relevance
            embed_text = f"{title}\n\n{summary}"
            embedding = generate_embedding(embed_text)
            if embedding:
                model_used = get_current_model()
                update_embedding(file_id, embedding, model_used)
                logger.info(f"Successfully vectorized file {file_id}", f"Model: {model_used}")
                processed += 1
            else:
                logger.error(f"Failed to generate embedding for file {file_id}")
                failed += 1
        except Exception as e:
            logger.error(f"Error vectorizing file {file_id}", str(e))
            failed += 1
            
    logger.info(f"Batch vectorization complete: {processed} successful, {failed} failed")
    return {
        "message": "Vectorization complete",
        "processed": processed,
        "failed": failed
    }
