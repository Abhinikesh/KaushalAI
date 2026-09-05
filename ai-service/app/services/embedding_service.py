from __future__ import annotations

import logging
import os
from typing import List

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
_model = None
_use_fallback = False


def _get_model():
    global _model, _use_fallback
    if _use_fallback:
        return None
    if _model is None:
        try:
            logger.info("Lazy loading sentence-transformer model: %s", _MODEL_NAME)
            # Enforce single-thread CPU execution to prevent memory spikes in < 512MB RAM
            os.environ["OMP_NUM_THREADS"] = "1"
            os.environ["MKL_NUM_THREADS"] = "1"
            os.environ["TOKENIZERS_PARALLELISM"] = "false"
            import torch
            torch.set_num_threads(1)
            torch.set_grad_enabled(False)
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(_MODEL_NAME)
            logger.info("Sentence-transformer model loaded successfully.")
        except Exception as exc:
            logger.warning("Could not load SentenceTransformer (%s). Falling back to memory-safe vectorizer.", exc)
            _use_fallback = True
            _model = None
    return _model


def _fallback_embed(texts: List[str]) -> np.ndarray:
    """
    Lightweight, deterministic fallback embedding using scikit-learn HashingVectorizer.
    Produces a 384-dimensional unit-norm float32 vector array.
    Consumes < 2MB RAM, enabling instant response and zero OOM risk on 512MB hosts.
    """
    from sklearn.feature_extraction.text import HashingVectorizer
    vec = HashingVectorizer(n_features=384, alternate_sign=False, norm="l2")
    sparse_mat = vec.transform(texts)
    return sparse_mat.toarray().astype(np.float32)


def batch_embed(texts: List[str]) -> np.ndarray:
    """Return a 2-D numpy array of shape (len(texts), embedding_dim)."""
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    model = _get_model()
    if model is not None:
        try:
            return model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        except Exception as exc:
            logger.warning("Error during model.encode (%s). Using fallback embeddings.", exc)
    return _fallback_embed(texts)


def compute_similarity(text_a: str, text_b: str) -> float:
    """Cosine similarity between two strings, returned as a float in [0, 1]."""
    embeddings = batch_embed([text_a, text_b])
    score: float = cosine_similarity(embeddings[0:1], embeddings[1:2])[0][0]
    return float(np.clip(score, 0.0, 1.0))
