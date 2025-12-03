import json
from typing import List

import requests
from openai import OpenAI


ESCO_SEARCH_URL = "https://ec.europa.eu/esco/api/search"
ESCO_OCC_RESOURCE_URL = "https://ec.europa.eu/esco/api/resource/occupation"

_llm_client: OpenAI | None = None


def _get_llm() -> OpenAI:
    """
    Lazy-init OpenAI client for ESCO-related tools.
    Uses default env-based configuration (OPENAI_API_KEY etc.).
    """
    global _llm_client
    if _llm_client is None:
        _llm_client = OpenAI()
    return _llm_client


def fetch_esco_role_skills(title: str, language: str = "en", limit: int = 20) -> dict:
    """
    Tool 1: fetch hot skills for a role title using ESCO.

    1) Search ESCO for an occupation by title.
    2) Call the ESCO occupation resource API with the occupation URI to get linked skills.
    3) Optionally run skills through an LLM to produce modern, resume-friendly labels.

    Returns:
      {
        "occupation_uri": str | None,
        "preferred_label": str | None,
        "skills": [str],           # rewritten labels
        "raw_skills": [str],       # original ESCO titles
      }
    """
    resp = requests.get(
        ESCO_SEARCH_URL,
        params={
            "text": title,
            "type": "occupation",
            "language": language,
            "limit": 10,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    results = data.get("_embedded", {}).get("results", [])
    if not results:
        return {
            "occupation_uri": None,
            "preferred_label": None,
            "skills": [],
            "raw_skills": [],
        }

    occ = results[0]
    uri = occ.get("uri")
    label = occ.get("preferredLabel", {}).get(language)

    if not uri:
        return {
            "occupation_uri": None,
            "preferred_label": label,
            "skills": [],
            "raw_skills": [],
        }

    occ_resp = requests.get(
        ESCO_OCC_RESOURCE_URL,
        params={"uri": uri, "language": language},
        headers={"Accept": "application/json"},
        timeout=10,
    )
    occ_resp.raise_for_status()
    occ_data = occ_resp.json()

    skills: List[str] = []
    links = occ_data.get("_links", {})

    def _extract_title(rel: dict) -> str | None:
        raw = rel.get("title")
        if isinstance(raw, dict):
            return raw.get(language) or raw.get("en")
        if isinstance(raw, str):
            return raw
        return None

    for rel in links.get("hasEssentialSkill", []):
        name = _extract_title(rel)
        if name and name not in skills:
            skills.append(name)

    for rel in links.get("hasOptionalSkill", []):
        name = _extract_title(rel)
        if name and name not in skills:
            skills.append(name)

    raw_skills = skills[:limit]
    pretty = rewrite_skill_labels(raw_skills)

    return {
        "occupation_uri": uri,
        "preferred_label": label,
        "skills": pretty,
        "raw_skills": raw_skills,
    }


def rewrite_skill_labels(skills: List[str]) -> List[str]:
    """
    Use the LLM to rewrite raw ESCO skill names into modern, resume-friendly labels.
    Returns a list aligned with the input order.
    """
    if not skills:
        return skills

    client = _get_llm()

    system_prompt = (
        "You are a career coach and tech industry expert.\n"
        "Given a list of skill names from a taxonomy (like ESCO), rewrite each one into a modern, "
        "concise, resume-friendly label that would look good on a 2025 tech CV.\n"
        "Keep the meaning, but you may:\n"
        "- Make names more concrete (e.g. 'Programming principles' -> 'Software design principles').\n"
        "- Use common industry terms (e.g. 'Relational database management systems' -> 'SQL & relational databases').\n"
        "Do NOT invent skills that weren't in the input, and don't make them longer than ~60 characters.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        "{ \"skills\": [ { \"original\": \"...\", \"label\": \"...\" }, ... ] }\n"
    )

    user_payload = {"skills": skills}

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
            response_format={"type": "json_object"},
            max_tokens=400,
            temperature=0.4,
        )
        content = resp.choices[0].message.content or "{}"
        parsed = json.loads(content)
        mapping = {
            item.get("original", "").strip(): item.get("label", "").strip()
            for item in parsed.get("skills", [])
            if isinstance(item, dict) and item.get("original")
        }
        return [mapping.get(s, s) for s in skills]
    except Exception:
        return skills


def generate_attitude_suggestions(role: str, skills: List[str]) -> List[str]:
    """
    Tool 2: generate generic interview attitude/behaviour suggestions for a given role.
    Uses the LLM directly and returns a list of short tips.
    """
    client = _get_llm()

    system_prompt = (
        "You are a senior hiring manager and interview coach.\n"
        "Given a target role and a list of hot skills in that domain, "
        "write concise interview attitude / behaviour suggestions to perform well.\n"
        "Focus on mindset, communication style, ownership, problem‑solving, and collaboration.\n"
        "Connect suggestions to the skills when relevant (e.g. how to talk about ML projects).\n"
        "Be concrete and practical, not fluffy. 1–2 short sentences per tip.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        "{ \"tips\": [\"...\", \"...\", ...] }\n"
    )

    user_payload = {"role": role, "skills": skills}

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
            response_format={"type": "json_object"},
            max_tokens=400,
            temperature=0.4,
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)
        tips = data.get("tips") or []
        return [t for t in tips if isinstance(t, str) and t.strip()]
    except Exception:
        return []


