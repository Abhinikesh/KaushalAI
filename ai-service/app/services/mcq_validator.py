from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_REQUIRED_FIELDS = {"question", "options", "correct_option_index", "explanation", "difficulty"}
_VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _validate_one(q: dict) -> tuple[bool, str]:
    """Return (is_valid, reason). Reason is empty string if valid."""
    if not isinstance(q, dict):
        return False, "not a dict"

    missing = _REQUIRED_FIELDS - q.keys()
    if missing:
        return False, f"missing keys: {missing}"

    if not isinstance(q["options"], list) or len(q["options"]) != 4:
        return False, f"options must be a list of exactly 4 items, got {len(q.get('options', []))}"

    if not isinstance(q["correct_option_index"], int) or q["correct_option_index"] not in range(4):
        return False, f"correct_option_index must be int 0-3, got {q['correct_option_index']!r}"

    if not isinstance(q["question"], str) or not q["question"].strip():
        return False, "question is empty"

    for i, opt in enumerate(q["options"]):
        if not isinstance(opt, str) or not opt.strip():
            return False, f"option[{i}] is empty"

    if not isinstance(q["explanation"], str) or not q["explanation"].strip():
        return False, "explanation is empty"

    if q["difficulty"] not in _VALID_DIFFICULTIES:
        return False, f"difficulty must be one of {_VALID_DIFFICULTIES}, got {q['difficulty']!r}"

    return True, ""


def validate_and_clean(raw_questions: list[dict]) -> list[dict]:
    """
    Validate each question dict and drop invalid ones.
    Also removes exact-duplicate question text within the batch.
    Logs a summary of any dropped questions.
    """
    valid: list[dict] = []
    seen_questions: set[str] = set()
    dropped_reasons: list[str] = []

    for idx, q in enumerate(raw_questions):
        ok, reason = _validate_one(q)
        if not ok:
            dropped_reasons.append(f"  Q{idx}: {reason}")
            continue

        normalised_text = q["question"].strip().lower()
        if normalised_text in seen_questions:
            dropped_reasons.append(f"  Q{idx}: duplicate question text")
            continue

        seen_questions.add(normalised_text)
        valid.append(q)

    if dropped_reasons:
        logger.warning(
            "MCQ validator dropped %d question(s):\n%s",
            len(dropped_reasons),
            "\n".join(dropped_reasons),
        )
    else:
        logger.info("MCQ validator: all %d questions passed", len(valid))

    return valid
