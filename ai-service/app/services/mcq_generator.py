from __future__ import annotations

import logging
import uuid

from app.services.chunker import chunk_text
from app.services.document_parser import parse_document
from app.services.llm_client import generate_mcqs
from app.services.mcq_validator import validate_and_clean
from app.services.vector_store import (
    add_chunks,
    create_collection_for_material,
    sample_chunks_by_index,
)

logger = logging.getLogger(__name__)

_DEFAULT_DIFFICULTY_MIX = {"easy": 0.3, "medium": 0.5, "hard": 0.2}


def generate_mcq_set(
    file_bytes: bytes,
    filename: str,
    num_questions: int = 10,
    difficulty_distribution: dict | None = None,
    topic_hint: str | None = None,
) -> dict:
    """
    Full RAG-MCQ pipeline:
      parse → chunk → embed+store → sample chunks → LLM generate → validate

    Returns a result dict with:
      material_id, filename, questions, total_chunks,
      questions_generated, questions_dropped
    """
    difficulty_mix = difficulty_distribution or _DEFAULT_DIFFICULTY_MIX
    material_id = str(uuid.uuid4())

    # ── Step 1: Parse document ────────────────────────────────────────────────
    logger.info("Parsing document: %s", filename)
    text = parse_document(filename, file_bytes)

    # ── Step 2: Chunk ─────────────────────────────────────────────────────────
    chunks = chunk_text(text)
    total_chunks = len(chunks)
    logger.info("Produced %d chunks from '%s'", total_chunks, filename)

    if total_chunks == 0:
        raise ValueError("Document produced no text chunks — it may be empty or unreadable.")

    # ── Step 3: Embed and store in ChromaDB ───────────────────────────────────
    create_collection_for_material(material_id)
    add_chunks(material_id, chunks)

    # ── Step 4: Sample context chunks for generation ──────────────────────────
    # We sample by index rather than querying by one topic so we get broad
    # document coverage rather than clustering around a single concept.
    # num_questions * 3 gives ~3 context chunks per question — enough signal
    # without exceeding the LLM's context window.
    context_chunks = sample_chunks_by_index(material_id, sample_count=num_questions * 3)
    if not context_chunks:
        raise ValueError("Could not retrieve context chunks from the vector store.")

    # ── Step 5: Generate via LLM ──────────────────────────────────────────────
    logger.info("Generating %d MCQs via LLM for material %s", num_questions, material_id)
    raw_questions = generate_mcqs(
        context_chunks=context_chunks,
        topic_hint=topic_hint,
        num_questions=num_questions,
        difficulty_mix=difficulty_mix,
    )

    # ── Step 6: Validate ──────────────────────────────────────────────────────
    validated = validate_and_clean(raw_questions)
    questions_dropped = len(raw_questions) - len(validated)

    logger.info(
        "MCQ set complete: %d generated, %d dropped, %d final",
        len(raw_questions), questions_dropped, len(validated),
    )

    return {
        "material_id": material_id,
        "filename": filename,
        "questions": validated,
        "total_chunks": total_chunks,
        "questions_generated": len(raw_questions),
        "questions_dropped": questions_dropped,
    }
