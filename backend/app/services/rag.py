"""RAG (Retrieval-Augmented Generation) service."""

import uuid
import time
import json
from typing import Optional
from datetime import datetime

import ollama

from ..config import OLLAMA_HOST, CHAT_MODEL, TOP_K_RESULTS
from ..database import (
    vector_search, 
    save_chat_message, 
    get_session_messages,
    delete_chat_session,
    get_all_chat_sessions
)
from .embeddings import generate_embedding


# Initialize Ollama client
client = ollama.Client(host=OLLAMA_HOST)

# Database should handle sessions now
def get_or_create_session(session_id: Optional[str] = None) -> tuple[str, list[dict]]:
    """Get existing session messages or create a new session ID."""
    if session_id:
        messages = get_session_messages(session_id)
        if messages:
            return session_id, messages
    
    new_session_id = str(uuid.uuid4())
    return new_session_id, []


from .logger import get_logger
logger = get_logger("rag")

def retrieve_context(query: str, top_k: int = TOP_K_RESULTS) -> list[dict]:
    """
    Retrieve relevant context using hybrid search:
    1. Vector search for semantic similarity
    2. Keyword search for title matches
    Results are merged with title matches boosted to the top.
    """
    try:
        logger.info(f"Retrieving context for query: {query[:50]}...")
        
        # Get keyword matches from titles using word-based matching
        from ..database import get_all_files, get_file_by_id
        
        # Extract significant words (ignore short words and punctuation)
        import re
        words = re.findall(r'\b[a-zA-Z]{3,}\b', query.lower())
        logger.debug(f"Search words: {words}")
        
        # Find files with titles containing any of these words
        all_files = get_all_files()
        keyword_results = []
        for f in all_files:
            title = (f.get('video_title') or '').lower()
            # Count how many query words appear in the title
            matches = sum(1 for w in words if w in title)
            if matches >= 2:  # Require at least 2 matching words
                keyword_results.append({
                    'id': f.get('id'),
                    'video_title': f.get('video_title'),
                    'summary': f.get('summary') if 'summary' in f else None,
                    'match_score': matches,
                    'has_embedding': f.get('has_embedding')
                })
        
        # Sort by match score (most matches first)
        keyword_results.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        logger.info(f"Keyword search found {len(keyword_results)} matches")
        
        # Generate embedding for vector search
        query_embedding = generate_embedding(query)
        
        vector_results = []
        if query_embedding:
            # Search the vector database with more results to merge
            vector_results = vector_search(query_embedding, top_k * 2)
            logger.info(f"Vector search found {len(vector_results)} matches")
        else:
            logger.warning("Failed to generate query embedding, using keyword results only")
        
        # Merge results: prioritize keyword title matches
        seen_ids = set()
        merged = []
        
        # First add files that match query keywords in title (highest priority)
        for kw in keyword_results[:top_k]:
            file_id = kw.get('id')
            if file_id not in seen_ids:
                # Get full file info including summary
                file_info = get_file_by_id(file_id)
                if file_info and file_info.get('has_embedding'):
                    merged.append({
                        'file_id': file_id,
                        'video_title': file_info.get('video_title'),
                        'summary': file_info.get('summary'),  # Use full summary from file_info
                        'distance': 0  # Keyword matches get best score
                    })
                    seen_ids.add(file_id)
        
        # Then add vector results that weren't already included
        for vr in vector_results:
            file_id = vr.get('file_id')
            if file_id not in seen_ids and len(merged) < top_k:
                merged.append(vr)
                seen_ids.add(file_id)
        
        logger.info(f"Hybrid search returning {len(merged)} results")
        return merged[:top_k]
        
    except Exception as e:
        logger.error("Error in retrieve_context", str(e))
        import traceback
        logger.debug("Traceback", traceback.format_exc())
        return []


def build_context_prompt(context_docs: list[dict]) -> str:
    """Build a context string from retrieved documents."""
    if not context_docs:
        return "No relevant context found in the database."
    
    context_parts = []
    for i, doc in enumerate(context_docs, 1):
        title = doc.get('video_title') or doc.get('actual_file_name', 'Unknown')
        summary = doc.get('summary') or ''
        # Truncate summary if too long
        if summary and len(summary) > 1000:
            summary = summary[:1000] + "..."
        context_parts.append(f"[{i}] {title}:\n{summary}")
    
    return "\n\n".join(context_parts)


def generate_response(
    query: str,
    session_id: Optional[str] = None,
    model: str = CHAT_MODEL
) -> tuple[str, list[dict], str]:
    """
    Generate a RAG response for the user's query.
    """
    try:
        logger.info(f"Generating session {session_id} for model {model}")
        # Get or create session
        session_id, history = get_or_create_session(session_id)
        
        # Retrieve relevant context
        logger.info("Starting context retrieval...")
        context_docs = retrieve_context(query)
        context_prompt = build_context_prompt(context_docs)
        
        # Build the system prompt
        system_prompt = """You are a helpful assistant that answers questions about YouTube video summaries. 
    Use the provided context to answer questions accurately. If the context doesn't contain relevant information, 
    say so clearly. Always cite which summary you're drawing information from when possible."""
        
        # Build the user prompt with context
        user_prompt = f"""Context from video summaries:
    {context_prompt}
    
    User Question: {query}
    
    Please provide a helpful answer based on the context above. If the information isn't in the context, let the user know."""
        
        # Add to history
        history.append({
            "role": "user",
            "content": query,
            "timestamp": datetime.now().isoformat()
        })
        
        # Build messages for Ollama
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add recent history (last 10 exchanges)
        for msg in history[-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Replace the last user message with the context-enhanced version
        messages[-1]["content"] = user_prompt
        
        # Prepare title if it's the first message
        session_title = None
        if len(history) == 1:
            session_title = query[:50] + "..." if len(query) > 50 else query
            
        # Save user message to DB
        save_chat_message(
            session_id=session_id,
            role="user",
            content=query,
            title=session_title
        )
        
        logger.info(f"Calling Ollama chat with model: {model}")
        
        # Track start time
        start_time = time.time()
        
        # Generate response
        response = client.chat(
            model=model,
            messages=messages
        )
        
        # Calculate duration in ms
        duration_ms = int((time.time() - start_time) * 1000)
        assistant_message = response['message']['content']
        logger.info(f"Successfully received response from Ollama in {duration_ms}ms")

        # Format context sources
        formatted_sources = [{
            "file_id": doc.get("file_id"),
            "title": doc.get("video_title", "Unknown"),
            "distance": doc.get("distance", 0)
        } for doc in context_docs]

        # Save assistant message to DB
        save_chat_message(
            session_id=session_id,
            role="assistant",
            content=assistant_message,
            model_used=model,
            response_time_ms=duration_ms,
            context_sources=json.dumps(formatted_sources)
        )
        
        return assistant_message, formatted_sources, session_id, model, duration_ms
        
    except Exception as e:
        logger.error(f"Error in generate_response for model {model}", str(e))
        import traceback
        logger.debug("Traceback", traceback.format_exc())
        error_msg = f"Error generating response: {str(e)}"
        # Return docs if available, else empty list
        docs = locals().get('context_docs', [])
        return error_msg, docs, session_id or "new-session", model, 0


def get_chat_history(session_id: str) -> list[dict]:
    """Get the chat history for a session from DB."""
    messages = get_session_messages(session_id)
    # Deserialize context_sources JSON
    for msg in messages:
        if msg.get("context_sources"):
            try:
                msg["context_sources"] = json.loads(msg["context_sources"])
            except:
                msg["context_sources"] = []
    return messages


def list_sessions():
    """List all chat sessions from DB."""
    return get_all_chat_sessions()


def clear_session(session_id: str):
    """Clear a chat session (delete from DB)."""
    delete_chat_session(session_id)


if __name__ == "__main__":
    # Test RAG
    test_query = "What videos discuss Python programming?"
    response, sources, session = generate_response(test_query)
    print(f"Query: {test_query}")
    print(f"Response: {response}")
    print(f"Sources: {len(sources)}")
    print(f"Session: {session}")
