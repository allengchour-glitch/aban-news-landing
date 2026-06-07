#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Gemini-Textgenerierung, robust: Vertex AI zuerst, dann Developer-API.

Hintergrund: der Developer-API-Key (`generativelanguage`) liefert für manche Modelle 404;
die Vertex-AI-Anbindung (Service-Account `GCP_SA_KEY`) funktioniert dagegen zuverlässig
(gleiche Auth wie bei den Bildern). Reihenfolge: **Vertex (GCP_SA_KEY) → Developer-API (GEMINI_API_KEY) → None**.

    from gemini_text import generate
    text = generate(prompt, max_tokens=4000, temperature=0.4)  # -> str | None
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


def _parse(data: dict) -> str | None:
    try:
        parts = data["candidates"][0]["content"]["parts"]
        txt = "".join(p.get("text", "") for p in parts).strip()
        return txt or None
    except Exception:  # noqa: BLE001
        return None


def _vertex(prompt: str, max_tokens: int, temperature: float) -> str | None:
    info = os.environ.get("GCP_SA_KEY", "").strip()
    project = os.environ.get("GCP_PROJECT", "").strip()
    if not info or not project:
        return None
    location = (os.environ.get("GCP_LOCATION") or "us-central1").strip()
    model = (os.environ.get("VERTEX_TEXT_MODEL") or "gemini-2.0-flash").strip()
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests as gatr
    except Exception:  # noqa: BLE001
        print("::warning::google-auth fehlt (pip install google-auth requests).")
        return None
    try:
        creds = service_account.Credentials.from_service_account_info(
            json.loads(info), scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(gatr.Request())
        token = creds.token
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Vertex-Text-Auth fehlgeschlagen: {e}")
        return None
    url = (f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}"
           f"/locations/{location}/publishers/google/models/{model}:generateContent")
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {token}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"::warning::Vertex-Text HTTP {e.code}: {e.read().decode('utf-8','ignore')[:200]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Vertex-Text-Aufruf fehlgeschlagen: {e}")
        return None
    out = _parse(data)
    if out:
        print(f"(Vertex-Text {model} @ {location})")
    return out


def _dev(prompt: str, max_tokens: int, temperature: float) -> str | None:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        return None
    model = (os.environ.get("GEMINI_MODEL") or "gemini-2.0-flash").strip()
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}")
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return _parse(json.loads(r.read().decode("utf-8")))
    except urllib.error.HTTPError as e:
        print(f"::warning::Developer-API HTTP {e.code}: {e.read().decode('utf-8','ignore')[:200]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Developer-API-Aufruf fehlgeschlagen: {e}")
        return None


def generate(prompt: str, max_tokens: int = 4000, temperature: float = 0.4) -> str | None:
    """Text erzeugen: Vertex (GCP_SA_KEY) → Developer-API (GEMINI_API_KEY) → None."""
    return _vertex(prompt, max_tokens, temperature) or _dev(prompt, max_tokens, temperature)
