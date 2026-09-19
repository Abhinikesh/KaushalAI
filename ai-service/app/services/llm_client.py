from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

def _get_api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "") or getattr(settings, "anthropic_api_key", "")
    return key.strip()

_MODEL = "claude-3-5-sonnet-20241022"

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    api_key = _get_api_key()
    if not api_key or api_key.startswith("sk-ant-your-key"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not configured with a valid API key. "
            "Cannot call the Anthropic API."
        )
    if _client is None:
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


_SYSTEM_PROMPT = """\
You are an expert exam question writer for government and higher technical training programmes.
Your task is to generate multiple-choice questions (MCQs) based EXCLUSIVELY on the provided context passages.

STRICT RULES:
1. Every question must be answerable from the context alone — never use external or fabricated knowledge.
2. Maintain strict chronological document progression: generate questions in the exact order topics appear in the text chunks.
3. Group questions logically by section and topic (e.g. Python Basics first, then Data Handling, then Advanced Modeling). Do NOT mix topics together randomly.
4. Output valid JSON only — no markdown fences, no prose, no explanation outside the JSON.
5. Each question object must have exactly these keys:
   - "question": string (the question text, non-empty)
   - "options": array of exactly 4 strings (A, B, C, D — non-empty, plausible distractors)
   - "correct_option_index": integer 0-3 (0=A, 1=B, 2=C, 3=D)
   - "explanation": string (concise explanation citing context facts)
   - "difficulty": string — exactly one of "easy", "medium", or "hard"
   - "section": string (e.g., "Section 1: Python Fundamentals", "Section 2: Data Manipulation")
   - "topic": string (specific subtopic e.g., "Pandas DataFrames", "List Comprehensions")
   - "learning_objective": string (competency tested)
6. No duplicate questions. Exactly one unambiguously correct answer per question.

EXAMPLE OUTPUT:
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
    "difficulty": "medium",
    "section": "Section 1: Sampling Methodologies",
    "topic": "Stratified Sampling",
    "learning_objective": "Understand probability sampling distributions"
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
        f"Generate exactly {num_questions} MCQs strictly following the sequence of topics in the context below.\n"
        f"Difficulty distribution: {easy_n} easy, {medium_n} medium, {hard_n} hard.\n"
        f"Keep questions segmented into chronological sections (e.g. Section 1, Section 2) based on the material order.\n"
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


def deterministic_recommendations_fallback(payload: dict) -> dict:
    """
    Deterministically ranks eligible courses based on priority of gaps addressed.
    Used when Anthropic API key is not configured, invalid, or during transient network/API issues.
    """
    gaps = payload.get("skill_gaps", [])
    courses = payload.get("eligible_courses", [])
    role = payload.get("role", "Officer")

    # Map gap priority
    high_gaps = {g.get("competency", "").lower(): g for g in gaps if g.get("priority") == "high"}
    med_gaps = {g.get("competency", "").lower(): g for g in gaps if g.get("priority") == "medium"}
    all_gaps = {g.get("competency", "").lower(): g for g in gaps}

    scored_courses = []
    for c in courses:
        cid = str(c.get("course_id", ""))
        title = c.get("title", "")
        addressed = [str(x).lower() for x in c.get("competencies_addressed", [])]

        score = 0
        reasons = []

        for comp_name in addressed:
            # Check exact or partial match
            matched_gap = None
            for g_name, g_info in all_gaps.items():
                if g_name in comp_name or comp_name in g_name:
                    matched_gap = g_info
                    break

            if matched_gap:
                g_prio = matched_gap.get("priority", "low")
                c_name = matched_gap.get("competency", "Core Competency")
                curr = matched_gap.get("current", 1)
                tgt = matched_gap.get("target", 3)

                if g_prio == "high":
                    score += 15
                    reasons.append(f"Directly targets your high-priority gap in {c_name} (Level {curr} to {tgt})")
                elif g_prio == "medium":
                    score += 8
                    reasons.append(f"Strengthens moderate gap in {c_name} (Level {curr} to {tgt})")
                else:
                    score += 2

        # Tiebreaker: preferred difficulty
        if c.get("difficulty") == "intermediate":
            score += 1

        primary_reason = (
            reasons[0] + f" to fulfill {role} competency standards."
            if reasons
            else f"Builds foundational competencies required for {role} cadre duties."
        )

        scored_courses.append({
            "course_id": cid,
            "title": title,
            "score": score,
            "reason": primary_reason,
        })

    # Sort descending by score
    scored_courses.sort(key=lambda x: -x["score"])

    # Limit to top 10
    top_resources = []
    for idx, item in enumerate(scored_courses[:10], start=1):
        top_resources.append({
            "course_id": item["course_id"],
            "reason": item["reason"],
            "priority_rank": idx,
        })

    priority_skills = list(high_gaps.keys()) if high_gaps else list(all_gaps.keys())[:3]

    return {
        "priority_skills": priority_skills,
        "recommended_resources": top_resources,
    }


def generate_course_recommendations(payload: dict) -> dict:
    """
    Ranks eligible courses using Anthropic Claude with defensive fallback.
    """
    api_key = _get_api_key()
    if not api_key or api_key.startswith("sk-ant-your-key"):
        logger.info("[Recommendations] ANTHROPIC_API_KEY is not configured or placeholder. Using deterministic ranking fallback.")
        return deterministic_recommendations_fallback(payload)

    system_prompt = (
        "You are an expert civil service competency advisor for the Ministry of Statistics & Programme Implementation (MoSPI).\n"
        "Your task is to rank the provided eligible courses by how effectively and directly they address the officer's highest-priority skill gaps.\n\n"
        "STRICT INSTRUCTIONS:\n"
        "1. Prioritize courses addressing 'high' priority gaps first, then 'medium' priority gaps.\n"
        "2. Output ONLY valid JSON — absolutely NO markdown fences, no ```json ``` blocks, no commentary.\n"
        "3. The response MUST strictly adhere to this JSON structure:\n"
        "{\n"
        '  "priority_skills": ["competency_name_1", "competency_name_2"],\n'
        '  "recommended_resources": [\n'
        "    {\n"
        '      "course_id": "<exact course_id from eligible_courses>",\n'
        '      "reason": "<1-2 sentence concise explanation grounded in their specific gap and role>",\n'
        '      "priority_rank": 1\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    try:
        client = _get_client()
        message = client.messages.create(
            model=_MODEL,
            max_tokens=2048,
            temperature=0.2,
            system=system_prompt,
            messages=[{"role": "user", "content": json.dumps(payload, indent=2)}],
        )
        raw_text = message.content[0].text
        cleaned = _strip_fences(raw_text)
        data = json.loads(cleaned)

        if isinstance(data, dict) and isinstance(data.get("recommended_resources"), list) and len(data["recommended_resources"]) > 0:
            logger.info("[Recommendations] Successfully generated %d AI course recommendations via Anthropic API.", len(data["recommended_resources"]))
            return data
        else:
            logger.warning("[Recommendations] Anthropic response lacked recommended_resources. Falling back to deterministic ranking.")
            return deterministic_recommendations_fallback(payload)

    except Exception as exc:
        logger.warning("[Recommendations] Anthropic API call failed (%s). Falling back to deterministic ranking.", exc)
        return deterministic_recommendations_fallback(payload)

