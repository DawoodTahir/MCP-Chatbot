import json
import requests
from typing import List

from utils import _create_openai_client

ESCO_SEARCH_URL = "https://ec.europa.eu/esco/api/search"
ESCO_OCC_RESOURCE_URL = "https://ec.europa.eu/esco/api/resource/occupation"


_llm_client = None


def _get_llm():
    """Lazy‑init OpenAI client using the helper from utils.py."""
    global _llm_client
    if _llm_client is None:
        _llm_client = _create_openai_client()
    return _llm_client


def fetch_esco_role_skills(title: str, language: str = "en", limit: int = 20) -> dict:
    """
    1) Search ESCO for an occupation by title.
    2) Call the ESCO occupation resource API with the occupation URI to get linked skills.
    Returns: {"occupation_uri": str, "preferred_label": str, "skills": [str]}
    """
    # 1) Search occupations
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

    # Check doc for exact structure; typically '_embedded.results'
    results = data.get("_embedded", {}).get("results", [])
    if not results:
        return {"occupation_uri": None, "preferred_label": None, "skills": []}

    occ = results[0]
    uri = occ.get("uri")
    label = occ.get("preferredLabel", {}).get(language)

    if not uri:
        return {"occupation_uri": None, "preferred_label": label, "skills": []}

    # 2) Fetch occupation details via ESCO resource API (JSON), not the LOD URL.
    occ_resp = requests.get(
        ESCO_OCC_RESOURCE_URL,
        params={"uri": uri, "language": language},
        headers={"Accept": "application/json"},
        timeout=10,
    )
    occ_resp.raise_for_status()
    occ_data = occ_resp.json()

    # ESCO exposes related skills via hypermedia links (e.g. _links.hasEssentialSkill / hasOptionalSkill)
    skills: list[str] = []
    links = occ_data.get("_links", {})

    def _extract_title(rel: dict) -> str | None:
        raw = rel.get("title")
        # In most cases this is a dict like {"en": "...", "fr": "..."} but sometimes it's a plain string.
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

    # Optionally run skills through an LLM to produce more modern/catchy labels.
    pretty_skills = rewrite_skill_labels(skills[:limit])

    return {
        "occupation_uri": uri,
        "preferred_label": label,
        "skills": pretty_skills,
    }


def rewrite_skill_labels(skills: List[str]) -> List[str]:
    """
    Use the LLM to rewrite raw ESCO skill names into more modern, resume-friendly labels.
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
            temperature=0.5,
        )
        content = resp.choices[0].message.content or "{}"
        parsed = json.loads(content)
        mapping = {
            item.get("original", "").strip(): item.get("label", "").strip()
            for item in parsed.get("skills", [])
            if isinstance(item, dict) and item.get("original")
        }
        # Preserve input order; fall back to original if no rewritten label
        return [mapping.get(s, s) for s in skills]
    except Exception as exc:
        print(f"[rewrite_skill_labels] Fallback to original skills due to error: {exc}")
        return skills


print(fetch_esco_role_skills(title="software engineer"))