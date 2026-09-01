from __future__ import annotations

import logging
import os

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.services.embedding_service import batch_embed

logger = logging.getLogger(__name__)

_CHROMA_DATA_DIR = os.environ.get("CHROMA_DATA_DIR", "./chroma_data")

# Single persistent client — created once at module import
_client = chromadb.PersistentClient(
    path=_CHROMA_DATA_DIR,
    settings=ChromaSettings(anonymized_telemetry=False),
)


def _collection_name(material_id: str) -> str:
    # ChromaDB collection names must be 3-63 chars, alphanumeric + underscores/hyphens
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in material_id)
    return f"mat_{safe}"[:63]


def create_collection_for_material(material_id: str) -> None:
    """Create (or reset) the ChromaDB collection for a given material_id."""
    name = _collection_name(material_id)
    try:
        _client.delete_collection(name)
    except Exception:
        pass  # Collection didn't exist yet — that's fine
    _client.create_collection(name=name, metadata={"hnsw:space": "cosine"})
    logger.info("Created ChromaDB collection '%s'", name)


def add_chunks(material_id: str, chunks: list[str]) -> None:
    """Embed and store all chunks for a material."""
    if not chunks:
        return

    name = _collection_name(material_id)
    collection = _client.get_collection(name)

    embeddings = batch_embed(chunks).tolist()
    ids = [f"chunk_{i}" for i in range(len(chunks))]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
    )
    logger.info("Stored %d chunks in collection '%s'", len(chunks), name)


def retrieve_relevant_chunks(
    material_id: str,
    query: str,
    top_k: int = 5,
) -> list[str]:
    """Return the top-k chunks most semantically similar to query."""
    name = _collection_name(material_id)
    collection = _client.get_collection(name)

    query_embedding = batch_embed([query]).tolist()[0]
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents"],
    )
    return results["documents"][0] if results["documents"] else []


def sample_chunks_by_index(material_id: str, sample_count: int = 15) -> list[str]:
    """
    Return chunks distributed evenly across the document by index, rather than
    clustering around one semantic query. This ensures broad coverage when the
    goal is whole-document MCQ generation rather than targeted search.
    """
    name = _collection_name(material_id)
    collection = _client.get_collection(name)
    total = collection.count()
    if total == 0:
        return []

    step = max(1, total // sample_count)
    ids = [f"chunk_{i}" for i in range(0, total, step)][:sample_count]

    results = collection.get(ids=ids, include=["documents"])
    return results["documents"] if results["documents"] else []
