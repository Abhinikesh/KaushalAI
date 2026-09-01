import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.mcq_generator import generate_mcq_set

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal")

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",  # some clients send this for binary files
}
_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/mcq/generate")
async def mcq_generate(
    file: Annotated[UploadFile, File(description="PDF, PPTX, or DOCX document")],
    num_questions: Annotated[int, Form()] = 10,
    easy_pct: Annotated[float, Form()] = 0.3,
    medium_pct: Annotated[float, Form()] = 0.5,
    hard_pct: Annotated[float, Form()] = 0.2,
    topic_hint: Annotated[str | None, Form()] = None,
):
    """
    Internal endpoint — called by the Node server on behalf of an authenticated trainer.
    The Node server is responsible for auth; this endpoint does not perform its own auth.
    """
    file_bytes = await file.read()

    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File exceeds 20MB limit ({len(file_bytes)} bytes received)")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    difficulty_mix = {
        "easy": easy_pct,
        "medium": medium_pct,
        "hard": hard_pct,
    }

    try:
        result = generate_mcq_set(
            file_bytes=file_bytes,
            filename=file.filename or "upload",
            num_questions=num_questions,
            difficulty_distribution=difficulty_mix,
            topic_hint=topic_hint or None,
        )
    except ValueError as exc:
        # Parser errors, empty documents, unsupported file types
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        # LLM config errors (missing API key etc)
        logger.error("LLM runtime error: %s", exc)
        raise HTTPException(status_code=503, detail="AI generation service is not configured. Contact the system administrator.") from exc
    except Exception as exc:
        logger.exception("Unexpected error during MCQ generation: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Could not generate questions from this document. Please try again or use a different file.",
        ) from exc

    return result
