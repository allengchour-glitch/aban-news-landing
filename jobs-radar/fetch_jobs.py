#!/usr/bin/env python3
"""KI-Jobs Radar — fetch AI/KI jobs from the free Arbeitnow API into jobs.json.

Runs in CI (GitHub Actions) before the generator. No API key required.
Filters the public job board for AI/ML-relevant roles. Idempotent: if the fetch
fails (network/API down), it leaves the existing jobs.json untouched so the
build still succeeds with the last good data (or the committed seed).

Usage:
    python fetch_jobs.py            # fetch + write jobs.json
    python fetch_jobs.py --keep     # only write if fetch succeeds (default behaviour)
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

API = "https://www.arbeitnow.com/api/job-board-api"
HERE = Path(__file__).resolve().parent
OUT = HERE / "jobs.json"

# AI/KI relevance: match in title/tags/description (word-ish, case-insensitive).
KEYWORDS = [
    "ki", "k.i.", "künstliche intelligenz", "ai", "a.i.", "artificial intelligence",
    "machine learning", "maschinelles lernen", "ml engineer", "deep learning",
    "data scientist", "data science", "llm", "genai", "generative ai",
    "nlp", "computer vision", "mlops", "prompt", "neural",
]
_KW_RE = re.compile(r"(?<![a-z])(" + "|".join(re.escape(k) for k in KEYWORDS) + r")(?![a-z])",
                    re.IGNORECASE)


def is_ai_job(job: dict) -> bool:
    hay = " ".join([
        job.get("title", ""),
        " ".join(job.get("tags", []) or []),
        " ".join(job.get("job_types", []) or []),
        (job.get("description", "") or "")[:600],
    ])
    return bool(_KW_RE.search(hay))


def clean(job: dict) -> dict:
    return {
        "title": (job.get("title") or "").strip(),
        "company": (job.get("company_name") or "").strip(),
        "location": (job.get("location") or "").strip(),
        "remote": bool(job.get("remote")),
        "url": job.get("url") or "",
        "tags": [t for t in (job.get("tags") or []) if t][:6],
        "types": [t for t in (job.get("job_types") or []) if t][:3],
        "slug": job.get("slug") or "",
        "created_at": job.get("created_at"),
    }


def fetch_arbeitnow() -> list[dict]:
    req = urllib.request.Request(API, headers={"User-Agent": "ki-jobs-radar/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    return [clean(j) for j in data.get("data", []) if is_ai_job(j)]


# Second free source (no key): Remotive. Global, so we keep only DACH/EU/worldwide
# remote roles to stay relevant for a DACH audience.
REMOTIVE = "https://remotive.com/api/remote-jobs?search=AI"
_DACH_EU = ("germany", "deutschland", "austria", "österreich", "switzerland", "schweiz",
            "europe", "european", "emea", "worldwide", "anywhere", "dach", "eu")


def _remotive_relevant(loc: str) -> bool:
    loc = (loc or "").lower()
    return (not loc) or any(k in loc for k in _DACH_EU)


def fetch_remotive() -> list[dict]:
    req = urllib.request.Request(REMOTIVE, headers={"User-Agent": "ki-jobs-radar/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    out = []
    for j in data.get("jobs", []):
        if not _remotive_relevant(j.get("candidate_required_location", "")):
            continue
        norm = {
            "title": j.get("title", ""), "company_name": j.get("company_name", ""),
            "location": j.get("candidate_required_location", "") or "Remote",
            "remote": True, "url": j.get("url", ""),
            "tags": j.get("tags", []), "job_types": [j.get("job_type", "")],
            "slug": "remotive-" + str(j.get("id", "")),
            "description": j.get("description", ""),
        }
        try:
            from datetime import datetime
            norm_created = int(datetime.fromisoformat(
                j.get("publication_date", "").replace("Z", "")).timestamp())
        except Exception:
            norm_created = None
        c = clean(norm)
        c["created_at"] = norm_created
        if is_ai_job(norm):
            out.append(c)
    return out


def fetch() -> list[dict]:
    jobs = []
    for src in (fetch_arbeitnow, fetch_remotive):
        try:
            jobs += src()
        except Exception as ex:  # one source down shouldn't kill the other
            sys.stderr.write(f"fetch_jobs: {src.__name__} failed ({ex})\n")
    # Dedup by slug, then by (title, company) to catch cross-source duplicates.
    seen_slug, seen_tc, out = set(), set(), []
    for j in jobs:
        tc = (j["title"].lower().strip(), j["company"].lower().strip())
        if j["title"] and j["url"] and j["slug"] not in seen_slug and tc not in seen_tc:
            seen_slug.add(j["slug"])
            seen_tc.add(tc)
            out.append(j)
    return out


def main() -> int:
    try:
        jobs = fetch()
    except Exception as ex:  # network / API hiccup → keep existing file
        sys.stderr.write(f"fetch_jobs: fetch failed ({ex}); keeping existing jobs.json\n")
        return 0
    if not jobs:
        sys.stderr.write("fetch_jobs: 0 AI jobs returned; keeping existing jobs.json\n")
        return 0
    payload = {"source": "arbeitnow.com + remotive.com", "fetched": date.today().isoformat(),
               "count": len(jobs), "jobs": jobs}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"fetch_jobs: wrote {len(jobs)} AI jobs to {OUT.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
