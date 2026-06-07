#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Gemini-Textgenerierung, robust gegen Modell-Deprecation + 404.

Probiert mehrere aktuelle Modelle der Reihe nach, je Modell zuerst **Vertex AI**
(Service-Account `GCP_SA_KEY`) und dann die **Developer-API** (`GEMINI_API_KEY`).
Hintergrund: `gemini-2.0-flash` wurde abgeschaltet → wir testen neuere Namen automatisch.

    from gemini_text import generate
    text = generate(prompt, max_tokens=4000, temperature=0.4)  # -> str | None
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

# Reihenfolge: Env-Override zuerst, dann aktuelle Kandidaten (robust gegen Deprecation).
_BASE_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash-001", "gemini-1.5-flash"]


def _candidates() -> list[str]:
    env = (os.environ.get("VERTEX_TEXT_MODEL") or os.environ.get("GEMINI_MODEL") or "").strip()
    out = ([env] if env else []) + [m for m in _BASE_MODELS if m != env]
    return out


def _parse(data: dict) -> str | None:
    try:
        parts = data["candidates"][0]["content"]["parts"]
        txt = "".join(p.get("text", "") for p in parts).strip()
        return txt or None
    except Exception:  # noqa: BLE001
        return None


def _gencfg(max_tokens: int, temperature: float, thinking_budget):
    cfg = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if thinking_budget is not None:
        cfg["thinkingConfig"] = {"thinkingBudget": thinking_budget}
    return cfg


def _vertex(prompt: str, model: str, max_tokens: int, temperature: float,
            thinking_budget=None) -> str | None:
    info = os.environ.get("GCP_SA_KEY", "").strip()
    project = os.environ.get("GCP_PROJECT", "").strip()
    if not info or not project:
        return None
    location = (os.environ.get("GCP_LOCATION") or "us-central1").strip()
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests as gatr
    except Exception:  # noqa: BLE001
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
            "generationConfig": _gencfg(max_tokens, temperature, thinking_budget)}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out = _parse(json.loads(r.read().decode("utf-8")))
        if out:
            print(f"(Vertex-Text {model} @ {location})")
        return out
    except urllib.error.HTTPError as e:
        print(f"::warning::Vertex-Text {model} HTTP {e.code}: {e.read().decode('utf-8','ignore')[:120]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Vertex-Text {model} Fehler: {e}")
        return None


def _dev(prompt: str, model: str, max_tokens: int, temperature: float,
         thinking_budget=None) -> str | None:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": _gencfg(max_tokens, temperature, thinking_budget)}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out = _parse(json.loads(r.read().decode("utf-8")))
        if out:
            print(f"(Developer-API {model})")
        return out
    except urllib.error.HTTPError as e:
        print(f"::warning::Developer-API {model} HTTP {e.code}: {e.read().decode('utf-8','ignore')[:120]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Developer-API {model} Fehler: {e}")
        return None


def generate(prompt: str, max_tokens: int = 4000, temperature: float = 0.4,
             thinking_budget=None) -> str | None:
    """Text erzeugen: je Kandidaten-Modell Vertex → Developer-API. Erstes Ergebnis gewinnt.
    thinking_budget=0 schaltet das interne 'Thinking' der 2.5-Modelle ab (volles Output-Budget)."""
    for model in _candidates():
        out = _vertex(prompt, model, max_tokens, temperature, thinking_budget)
        if out:
            return out
        out = _dev(prompt, model, max_tokens, temperature, thinking_budget)
        if out:
            return out
    print("::warning::Kein Modell lieferte Text (alle Kandidaten 404/Fehler).")
    return None
