"""Database setup and management with SQLite and sqlite-vec."""

import sqlite3
import struct
from pathlib import Path
from typing import Optional
import sqlite_vec

from .config import DB_PATH, EMBEDDING_DIMENSION


def get_connection() -> sqlite3.Connection:
    """Get a database connection with sqlite-vec enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def serialize_embedding(embedding: list[float]) -> bytes:
    """Serialize a list of floats to bytes for storage."""
    return struct.pack(f'{len(embedding)}f', *embedding)


def deserialize_embedding(data: bytes) -> list[float]:
    """Deserialize bytes to a list of floats."""
    n = len(data) // 4  # 4 bytes per float32
    return list(struct.unpack(f'{n}f', data))


def init_database():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create file_metadata table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actual_file_name TEXT NOT NULL UNIQUE,
            site_name TEXT NOT NULL,
            video_title TEXT,
            extract_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create file_contents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_contents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL UNIQUE,
            transcript TEXT,
            summary TEXT,
            mind_map TEXT,
            key_takeaway TEXT,
            model_used TEXT,
            calc_date DATETIME,
            FOREIGN KEY (file_id) REFERENCES file_metadata(id) ON DELETE CASCADE
        )
    """)
    
    # Create virtual table for vector search using sqlite-vec
    cursor.execute(f"""
        CREATE VIRTUAL TABLE IF NOT EXISTS file_embeddings USING vec0(
            file_id INTEGER PRIMARY KEY,
            embedding float[{EMBEDDING_DIMENSION}]
        )
    """)

    # Create chat_sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create chat_messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model_used TEXT,
            response_time_ms INTEGER,
            context_sources TEXT, -- JSON string of sources
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def drop_tables():
    """Drop all tables (for development/reset)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS file_embeddings")
    cursor.execute("DROP TABLE IF EXISTS file_contents")
    cursor.execute("DROP TABLE IF EXISTS file_metadata")
    conn.commit()
    conn.close()


def reset_embeddings_table():
    """Drop and recreate the embeddings virtual table."""
    from .config import EMBEDDING_DIMENSION
    conn = get_connection()
    cursor = conn.cursor()
    
    # Drop existing virtual table
    cursor.execute("DROP TABLE IF EXISTS file_embeddings")
    
    # Clear calc info from file_contents
    cursor.execute("""
        UPDATE file_contents 
        SET model_used = NULL, calc_date = NULL
    """)
    
    # Recreate the virtual table
    cursor.execute(f"""
        CREATE VIRTUAL TABLE IF NOT EXISTS file_embeddings USING vec0(
            file_id INTEGER PRIMARY KEY,
            embedding float[{EMBEDDING_DIMENSION}]
        )
    """)
    
    conn.commit()
    conn.close()


# File operations
def insert_file_metadata(
    actual_file_name: str,
    site_name: str,
    video_title: Optional[str],
    extract_date: Optional[str]
) -> int:
    """Insert file metadata and return the new ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO file_metadata (actual_file_name, site_name, video_title, extract_date)
        VALUES (?, ?, ?, ?)
    """, (actual_file_name, site_name, video_title, extract_date))
    file_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return file_id


def insert_file_contents(
    file_id: int,
    transcript: Optional[str],
    summary: Optional[str],
    mind_map: Optional[str],
    key_takeaway: Optional[str]
):
    """Insert file contents."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO file_contents (file_id, transcript, summary, mind_map, key_takeaway)
        VALUES (?, ?, ?, ?, ?)
    """, (file_id, transcript, summary, mind_map, key_takeaway))
    conn.commit()
    conn.close()


def update_embedding(file_id: int, embedding: list[float], model_used: str):
    """Update the embedding for a file."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Update calc_date and model_used in file_contents
    cursor.execute("""
        UPDATE file_contents 
        SET model_used = ?, calc_date = CURRENT_TIMESTAMP
        WHERE file_id = ?
    """, (model_used, file_id))
    
    # Delete existing embedding if any
    cursor.execute("DELETE FROM file_embeddings WHERE file_id = ?", (file_id,))
    
    # Insert new embedding
    embedding_bytes = serialize_embedding(embedding)
    cursor.execute("""
        INSERT INTO file_embeddings (file_id, embedding) VALUES (?, ?)
    """, (file_id, embedding_bytes))
    
    conn.commit()
    conn.close()


def delete_embedding(file_id: int):
    """Delete only the embedding for a file (not the file itself)."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Clear the model_used and calc_date in file_contents
    cursor.execute("""
        UPDATE file_contents 
        SET model_used = NULL, calc_date = NULL
        WHERE file_id = ?
    """, (file_id,))
    
    # Delete the embedding
    cursor.execute("DELETE FROM file_embeddings WHERE file_id = ?", (file_id,))
    
    conn.commit()
    conn.close()


def delete_all_embeddings():
    """Delete all embeddings from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Clear all model_used and calc_date in file_contents
    cursor.execute("""
        UPDATE file_contents 
        SET model_used = NULL, calc_date = NULL
    """)
    
    # Delete all embeddings
    cursor.execute("DELETE FROM file_embeddings")
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count


def get_all_files():
    """Get all files with metadata and embedding status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            m.id,
            m.actual_file_name,
            m.site_name,
            m.video_title,
            m.extract_date,
            m.created_at,
            c.model_used,
            c.calc_date,
            CASE WHEN e.file_id IS NOT NULL THEN 1 ELSE 0 END as has_embedding
        FROM file_metadata m
        LEFT JOIN file_contents c ON m.id = c.file_id
        LEFT JOIN file_embeddings e ON m.id = e.file_id
        ORDER BY m.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_file_by_id(file_id: int):
    """Get a single file with all its content."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            m.id,
            m.actual_file_name,
            m.site_name,
            m.video_title,
            m.extract_date,
            m.created_at,
            c.transcript,
            c.summary,
            c.mind_map,
            c.key_takeaway,
            c.model_used,
            c.calc_date,
            CASE WHEN e.file_id IS NOT NULL THEN 1 ELSE 0 END as has_embedding
        FROM file_metadata m
        LEFT JOIN file_contents c ON m.id = c.file_id
        LEFT JOIN file_embeddings e ON m.id = e.file_id
        WHERE m.id = ?
    """, (file_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_file(file_id: int):
    """Delete a file and all its associated data."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM file_embeddings WHERE file_id = ?", (file_id,))
    cursor.execute("DELETE FROM file_contents WHERE file_id = ?", (file_id,))
    cursor.execute("DELETE FROM file_metadata WHERE id = ?", (file_id,))
    conn.commit()
    conn.close()


def search_files(query: str):
    """Search files by keyword in title or summary."""
    conn = get_connection()
    cursor = conn.cursor()
    search_term = f"%{query}%"
    cursor.execute("""
        SELECT 
            m.id,
            m.actual_file_name,
            m.site_name,
            m.video_title,
            m.extract_date,
            c.summary,
            CASE WHEN e.file_id IS NOT NULL THEN 1 ELSE 0 END as has_embedding
        FROM file_metadata m
        LEFT JOIN file_contents c ON m.id = c.file_id
        LEFT JOIN file_embeddings e ON m.id = e.file_id
        WHERE m.video_title LIKE ? OR c.summary LIKE ?
        ORDER BY m.created_at DESC
    """, (search_term, search_term))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def vector_search(query_embedding: list[float], top_k: int = 5):
    """Search for similar files using vector similarity."""
    from .services.logger import get_logger
    logger = get_logger("vector_search")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    embedding_bytes = serialize_embedding(query_embedding)
    
    cursor.execute(f"""
        SELECT 
            e.file_id,
            e.distance,
            m.video_title,
            c.summary
        FROM file_embeddings e
        INNER JOIN file_metadata m ON e.file_id = m.id
        INNER JOIN file_contents c ON e.file_id = c.file_id
        WHERE embedding MATCH ? AND k = ?
        ORDER BY distance
    """, (embedding_bytes, top_k))
    
    rows = cursor.fetchall()
    conn.close()
    
    results = [dict(row) for row in rows]
    
    # Log the results for debugging
    logger.info(f"Vector search returned {len(results)} results")
    for i, r in enumerate(results):
        logger.debug(f"  [{i+1}] file_id={r.get('file_id')}, distance={r.get('distance'):.4f}, title={r.get('video_title', 'N/A')[:50]}")
    
    return results


def get_embedding_file_ids():
    """Debug: Get all file_ids that have entries in the embeddings table."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_id FROM file_embeddings")
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]


def get_files_without_embeddings():
    """Get files that don't have embeddings yet."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            m.id,
            m.video_title,
            c.summary
        FROM file_metadata m
        INNER JOIN file_contents c ON m.id = c.file_id
        LEFT JOIN file_embeddings e ON m.id = e.file_id
        WHERE e.file_id IS NULL AND c.summary IS NOT NULL
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# Chat History Persistence
def save_chat_message(
    session_id: str,
    role: str,
    content: str,
    model_used: Optional[str] = None,
    response_time_ms: Optional[int] = None,
    context_sources: Optional[str] = None,
    title: Optional[str] = None
):
    """Save a chat message to the database and update session info."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure session exists
    cursor.execute("SELECT id FROM chat_sessions WHERE id = ?", (session_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO chat_sessions (id, title) VALUES (?, ?)",
            (session_id, title or (content[:50] + "...") if role == "user" else "New Chat")
        )
    else:
        # Update timestamp and title if it's the first message and title is provided
        if title:
             cursor.execute(
                "UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (title, session_id)
            )
        else:
             cursor.execute(
                "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (session_id,)
            )

    # Insert message
    cursor.execute("""
        INSERT INTO chat_messages (session_id, role, content, model_used, response_time_ms, context_sources)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (session_id, role, content, model_used, response_time_ms, context_sources))
    
    conn.commit()
    conn.close()


def get_session_messages(session_id: str):
    """Get all messages for a specific chat session."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT role, content, model_used, response_time_ms, context_sources, timestamp
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY timestamp ASC
    """, (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_all_chat_sessions():
    """Get all chat sessions, ordered by most recent activity."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        ORDER BY updated_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_chat_session(session_id: str):
    """Delete a chat session and its messages."""
    conn = get_connection()
    cursor = conn.cursor()
    # Explicitly delete messages since ON DELETE CASCADE requires PRAGMA foreign_keys = ON
    cursor.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


def update_chat_session_title(session_id: str, title: str):
    """Update the title of a chat session."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE chat_sessions SET title = ? WHERE id = ?",
        (title, session_id)
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_database()
