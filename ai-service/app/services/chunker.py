from __future__ import annotations

import re


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """
    Sliding-window chunker that splits on whitespace boundaries.

    chunk_size  — target character count per chunk (not a hard max — we never
                  cut mid-word, so chunks may slightly exceed it)
    overlap     — characters of overlap between consecutive chunks so context
                  doesn't fall entirely off at boundaries
    """
    # Normalise whitespace runs to single spaces, strip
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    words = text.split(" ")
    chunks: list[str] = []
    start = 0

    while start < len(words):
        # Accumulate words until we reach chunk_size characters
        end = start
        char_count = 0
        while end < len(words) and char_count < chunk_size:
            char_count += len(words[end]) + 1  # +1 for the space
            end += 1

        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)

        # Advance start, stepping back by overlap amount
        overlap_words = 0
        overlap_chars = 0
        for i in range(end - 1, start - 1, -1):
            overlap_chars += len(words[i]) + 1
            if overlap_chars >= overlap:
                break
            overlap_words += 1

        start = end - overlap_words
        if start <= 0 or start >= end:
            # Safety: ensure we always advance to avoid infinite loop
            start = end

    return [c for c in chunks if c]
