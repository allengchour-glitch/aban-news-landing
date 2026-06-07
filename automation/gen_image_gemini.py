#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Bild-Generierung via Gemini (no-op-sicher, reine Standardbibliothek).

Erzeugt zu einem Hook/Thema eine markenkonforme, EDITORIALE Illustration (kein Stockfoto-
Fake) im warmen aban-Kaffee/Amber-Stil. Guardrails im Prompt: keine realen Gesichter,
keine erfundenen Diagramme/Zahlen/Screenshots, kein eingebetteter Text/Logo.

No-op ohne GEMINI_API_KEY (Exit 0). Bei API-Fehler: Exit 0 (Aufrufer nutzt dann den
Text-Karten-Fallback aus gen_card.py).

CLI:  python3 automation/gen_image_gemini.py "Thema/Hook" out.png
API:  from gen_image_gemini import make_image; make_image("Hook", "out.png")  # -> Pfad oder None
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "imagen-3.0-generate-002")
ASPECT = os.environ.get("GEMINI_IMAGE_ASPECT", "1:1")

# Imagen erlaubt nur diese Seitenverhältnisse.
_ALLOWED_ASPECTS = {"1:1", "3:4", "4:3", "9:16", "16:9"}


def set_aspect(ratio: str) -> None:
    """Seitenverhältnis zur Laufzeit setzen (pro Kanal). _imagen/_vertex lesen das
    Modul-Global ASPECT erst beim Aufruf → reicht, um es vorher umzustellen."""
    global ASPECT
    if ratio and ratio in _ALLOWED_ASPECTS:
        ASPECT = ratio

PROMPT_TMPL = (
    "Erzeuge eine editoriale, minimalistische Illustration im warmen Kaffee-/Amber-Stil "
    "(cremeweißer Hintergrund, Amber/Orange-Akzent #d97706, ruhig, viel Weißraum, flaches "
    "edles Vektor-Gefühl). Thema: {hook}. "
    "STRIKT: kein Text, keine Buchstaben, keine Logos, keine realen Gesichter/erkennbaren Personen, "
    "keine erfundenen Diagramme, Zahlen, Screenshots oder Marken. Abstrakt-konzeptionell, seriös, "
    "nicht reißerisch."
)

BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def _save(out_path, b64):
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))
    print(f"✓ Bild erzeugt: {out_path} (Modell {MODEL})")
    return out_path


def _imagen(api_key, prompt, out_path):
    url = f"{BASE}/{MODEL}:predict?key={api_key}"
    body = {"instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": ASPECT}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))
    preds = data.get("predictions") or []
    for p in preds:
        b64 = p.get("bytesBase64Encoded") or p.get("image", {}).get("imageBytes")
        if b64:
            return _save(out_path, b64)
    print(f"::warning::Imagen ohne Bilddaten: {str(data)[:200]}")
    return None


def _gemini(api_key, prompt, out_path):
    url = f"{BASE}/{MODEL}:generateContent?key={api_key}"
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))
    for p in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        inline = p.get("inlineData") or p.get("inline_data")
        if inline and inline.get("data"):
            return _save(out_path, inline["data"])
    print(f"::warning::Keine Bilddaten (generateContent): {str(data)[:150]}")
    return None


def _vertex(prompt, out_path):
    """Vertex AI Imagen (:predict) mit Service-Account-Auth. None bei Fehler."""
    info = os.environ.get("GCP_SA_KEY", "").strip()
    project = os.environ.get("GCP_PROJECT", "").strip()
    if not info or not project:
        return None
    # .get(default) greift nicht, wenn die Var als LEERER String gesetzt ist
    # (z. B. ${{ vars.GCP_LOCATION }} ohne hinterlegte Variable) → `or` fängt das ab.
    location = (os.environ.get("GCP_LOCATION") or "us-central1").strip()
    model = (os.environ.get("VERTEX_IMAGE_MODEL") or "imagen-3.0-generate-002").strip()
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests as gatr
    except Exception:  # noqa: BLE001
        print("::warning::google-auth fehlt (pip install google-auth requests) → Karte als Fallback.")
        return None
    try:
        creds = service_account.Credentials.from_service_account_info(
            json.loads(info), scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(gatr.Request())
        token = creds.token
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Vertex-Auth fehlgeschlagen: {e}")
        return None
    url = (f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}"
           f"/locations/{location}/publishers/google/models/{model}:predict")
    # personGeneration=dont_allow → KEINE Personen/Gesichter (Marken-Guardrail + weniger
    # Rechtsrisiko). SynthID-Wasserzeichen setzt Vertex bei Imagen ohnehin automatisch.
    body = {"instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": ASPECT,
                           "personGeneration": "dont_allow"}}
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {token}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"::warning::Vertex HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return None
    except Exception as e:  # noqa: BLE001  (URLError/DNS/Timeout → Karte als Fallback statt Crash)
        print(f"::warning::Vertex-Aufruf fehlgeschlagen ({location}/{model}): {e}")
        return None
    for p in data.get("predictions", []):
        b64 = p.get("bytesBase64Encoded") or p.get("image", {}).get("imageBytes")
        if b64:
            print(f"(Vertex {model} @ {location})")
            return _save(out_path, b64)
    print(f"::warning::Vertex ohne Bilddaten: {str(data)[:200]}")
    return None


def make_image(hook: str, out_path: str):
    """Bild erzeugen. Reihenfolge: Vertex AI (GCP_SA_KEY) → Gemini-API (GEMINI_API_KEY) → None.
    None ⇒ Aufrufer nutzt die Marken-Karte als Fallback."""
    # Kill-Switch: ein GitHub-Variable/Env schaltet die (kostenpflichtige) KI-Bild-
    # Erzeugung sofort ab → Pillow-Karte als Fallback, ohne Secrets anzufassen.
    if os.environ.get("ABAN_DISABLE_IMAGE_GEN", "").strip().lower() in ("1", "true", "yes", "on"):
        print("ABAN_DISABLE_IMAGE_GEN gesetzt → kein KI-Bild (Karte als Fallback).")
        return None

    prompt = PROMPT_TMPL.format(hook=hook[:300])

    if os.environ.get("GCP_SA_KEY"):
        r = _vertex(prompt, out_path)
        if r:
            return r

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Kein GCP_SA_KEY/GEMINI_API_KEY → kein KI-Bild (Karte als Fallback).")
        return None
    try:
        if MODEL.startswith("imagen"):
            return _imagen(api_key, prompt, out_path)
        return _gemini(api_key, prompt, out_path)
    except urllib.error.HTTPError as e:
        print(f"::warning::Image HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Image-Aufruf fehlgeschlagen: {e}")
        return None


if __name__ == "__main__":
    hook = sys.argv[1] if len(sys.argv) > 1 else "Täglicher KI-Newsletter für DACH-Profis"
    out = sys.argv[2] if len(sys.argv) > 2 else "gemini-image.png"
    res = make_image(hook, out)
    sys.exit(0 if res or not os.environ.get("GEMINI_API_KEY") else 0)
