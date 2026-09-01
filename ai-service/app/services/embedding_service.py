from __future__ import annotations

import logging
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Loaded once at module import — subsequent imports reuse the cached module object.
# all-MiniLM-L6-v2: 22M params, ~80MB on disk, fast CPU inference, good quality.
_MODEL_NAME = "all-MiniLM-L6-v2"
logger.info("Loading sentence-transformer model: %s", _MODEL_NAME)
_model = SentenceTransformer(_MODEL_NAME)
logger.info("Model loaded.")


def batch_embed(texts: List[str]) -> np.ndarray:
    """Return a 2-D numpy array of shape (len(texts), embedding_dim)."""
    return _model.encode(texts, convert_to_numpy=True, show_progress_bar=False)


def compute_similarity(text_a: str, text_b: str) -> float:
    """Cosine similarity between two strings, returned as a float in [0, 1]."""
    embeddings = batch_embed([text_a, text_b])
    score: float = cosine_similarity(embeddings[0:1], embeddings[1:2])[0][0]
    return float(np.clip(score, 0.0, 1.0))
