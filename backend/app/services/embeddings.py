"""Embedding service using Ollama."""

import ollama
from typing import Optional

from ..config import OLLAMA_HOST, EMBEDDING_MODEL, CHAT_MODEL
from .logger import get_logger

# Initialize logger
logger = get_logger("embeddings")

# Initialize Ollama client
client = ollama.Client(host=OLLAMA_HOST)

# Current embedding model (mutable for runtime switching)
_current_model = EMBEDDING_MODEL

# Default app/chat model (mutable for runtime switching)
_default_app_model = CHAT_MODEL


def get_current_model() -> str:
    """Get the currently configured embedding model."""
    return _current_model


def set_current_model(model_name: str):
    """Set the embedding model to use."""
    global _current_model
    _current_model = model_name
    logger.info(f"Embedding model set to: {model_name}")


def get_default_app_model() -> str:
    """Get the default model for chat/UI."""
    return _default_app_model


def set_default_app_model(model_name: str):
    """Set the default model for chat/UI."""
    global _default_app_model
    _default_app_model = model_name
    logger.info(f"App/Chat model set to: {model_name}")


def generate_embedding(text: str) -> Optional[list[float]]:
    """
    Generate an embedding vector for the given text using Ollama.
    
    Args:
        text: The text to embed
        
    Returns:
        List of floats representing the embedding, or None if failed
    """
    if not text or not text.strip():
        logger.warning("Empty text provided for embedding")
        return None
    
    text_snippet = text[:50] + "..." if len(text) > 50 else text
    logger.info(f"Generating embedding for: {text_snippet}")
    logger.debug(f"Full text length: {len(text)} characters")
    
    try:
        logger.debug(f"Calling Ollama API (model={_current_model})")
        response = client.embeddings(
            model=_current_model,
            prompt=text
        )
        embedding = response['embedding']
        logger.debug(f"Successfully generated embedding (dim={len(embedding)})")
        return embedding
    except Exception as e:
        logger.error(f"Error generating embedding with model {_current_model}", str(e))
        return None


def generate_embeddings_batch(texts: list[str]) -> list[Optional[list[float]]]:
    """
    Generate embeddings for multiple texts.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embeddings (None for failed ones)
    """
    logger.info(f"Generating batch of {len(texts)} embeddings")
    embeddings = []
    for i, text in enumerate(texts):
        logger.debug(f"Processing item {i+1}/{len(texts)}")
        embedding = generate_embedding(text)
        embeddings.append(embedding)
    return embeddings


def list_available_models() -> list[dict]:
    """
    List all available Ollama models.
    
    Returns:
        List of model info dictionaries
    """
    try:
        response = client.list()
        # The ollama-python library version might return objects instead of dicts
        # or have different keys depending on version.
        models_list = response.get('models', [])
        models = []
        
        for m in models_list:
            # Handle both dict-like and object-like access
            try:
                if isinstance(m, dict):
                    name = m.get('name')
                    size = m.get('size', 0)
                    modified_at = m.get('modified_at', '')
                else:
                    # Try attribute access
                    name = getattr(m, 'model', getattr(m, 'name', None))
                    size = getattr(m, 'size', 0)
                    modified_at = str(getattr(m, 'modified_at', ''))
                
                if name:
                    models.append({
                        'name': name,
                        'size': size,
                        'modified_at': modified_at,
                        'is_current': name == _current_model,
                        'is_app_current': name == _default_app_model
                    })
            except Exception as e:
                logger.warning(f"Failed to parse model entry: {m}", str(e))
                
        return models
    except Exception as e:
        logger.error("Error listing Ollama models", str(e))
        return []


def check_ollama_connection() -> bool:
    """Check if Ollama is accessible."""
    try:
        client.list()
        return True
    except Exception as e:
        logger.warning("Failed to connect to Ollama", str(e))
        return False


if __name__ == "__main__":
    # Test embedding generation
    print(f"Ollama connection: {check_ollama_connection()}")
    print(f"Current model: {get_current_model()}")
    
    test_text = "This is a test summary about Python programming."
    embedding = generate_embedding(test_text)
    
    if embedding:
        print(f"Embedding dimension: {len(embedding)}")
        print(f"First 5 values: {embedding[:5]}")
    else:
        print("Failed to generate embedding")
