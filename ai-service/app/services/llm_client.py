from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

_ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
_MODEL = "claude-sonnet-4-5"

if not _ANTHROPIC_API_KEY:
    logger.warning(
        "ANTHROPIC_API_KEY is not set — MCQ generation will fail at runtime. "
        "Set this environment variable before starting the service."
    )

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not _ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY environment variable is not set. "
                "Cannot call the Anthropic API."
            )
        _client = anthropic.Anthropic(api_key=_ANTHROPIC_API_KEY)
    return _client


_SYSTEM_PROMPT = """\
You are an expert exam question writer for government training programmes.
Your task is to generate multiple-choice questions (MCQs) based EXCLUSIVELY on the provided context passages.

STRICT RULES:
1. Every question must be answerable from the context alone — never use external knowledge.
2. Output valid JSON only — no markdown fences, no prose, no explanation outside the JSON.
3. Each question object must have exactly these keys:
   - "question": string (the question text, non-empty)
   - "options": array of exactly 4 strings (A, B, C, D — non-empty, plausible distractors)
   - "correct_option_index": integer 0-3 (0=A, 1=B, 2=C, 3=D)
   - "explanation": string (one sentence explaining why the correct answer is right, citing context)
   - "difficulty": string — exactly one of "easy", "medium", or "hard"
4. No duplicate questions. No trick questions. Exactly one unambiguously correct answer per question.

EXAMPLE OUTPUT (2 questions):
[
  {
    "question": "What is the primary purpose of stratified random sampling?",
    "options": [
      "To reduce the cost of data collection",
      "To ensure proportional representation of subgroups in the sample",
      "To eliminate non-sampling errors",
      "To increase the speed of the survey"
    ],
    "correct_option_index": 1,
    "explanation": "Stratified sampling divides the population into subgroups and samples from each, ensuring all groups are proportionally represented.",
    "difficulty": "medium"
  },
  {
    "question": "According to the passage, which institution is responsible for conducting the National Sample Survey in India?",
    "options": [
      "Reserve Bank of India",
      "Planning Commission of India",
      "National Statistical Office",
      "Ministry of Finance"
    ],
    "correct_option_index": 2,
    "explanation": "The context explicitly states that the National Statistical Office (NSO) under MOSPI conducts the National Sample Survey.",
    "difficulty": "easy"
  }
]
"""


def _build_user_prompt(
    context_chunks: list[str],
    topic_hint: Optional[str],
    num_questions: int,
    difficulty_mix: dict,
) -> str:
    context_text = "\n\n---\n\n".join(context_chunks)

    easy_n = round(num_questions * difficulty_mix.get("easy", 0.3))
    medium_n = round(num_questions * difficulty_mix.get("medium", 0.5))
    hard_n = num_questions - easy_n - medium_n

    topic_line = f"\nFocus topic hint: {topic_hint}\n" if topic_hint else ""

    return (
        f"Generate exactly {num_questions} MCQs from the context below.\n"
        f"Difficulty distribution: {easy_n} easy, {medium_n} medium, {hard_n} hard.\n"
        f"{topic_line}"
        f"\nCONTEXT:\n{context_text}\n\n"
        f"Output ONLY the JSON array of {num_questions} question objects. Nothing else."
    )


def _strip_fences(text: str) -> str:
    """Remove markdown code fences that some models add despite instructions."""
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def generate_mcqs(
    context_chunks: list[str],
    topic_hint: Optional[str],
    num_questions: int,
    difficulty_mix: dict,
) -> list[dict]:
    """
    Call the Anthropic API and return a parsed list of question dicts.
    Raises ValueError if the LLM output cannot be parsed as valid JSON.
    """
    client = _get_client()
    user_prompt = _build_user_prompt(context_chunks, topic_hint, num_questions, difficulty_mix)

    message = client.messages.create(
        model=_MODEL,
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = message.content[0].text
    logger.debug("LLM raw response length: %d chars", len(raw_text))

    cleaned = _strip_fences(raw_text)
    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM did not return valid JSON. Parse error: {exc}. "
            f"Raw output (first 500 chars): {cleaned[:500]}"
        ) from exc

    if not isinstance(questions, list):
        raise ValueError(
            f"LLM output was valid JSON but not a list. Got: {type(questions).__name__}"
        )

    return questions
