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


def make_image(hook: str, out_path: str):
    """Gibt out_path zurück (Bild erzeugt) oder None (no-op/Fehler).
    imagen-* → :predict, sonst → :generateContent."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY nicht gesetzt → kein Bild (no-op).")
        return None
    prompt = PROMPT_TMPL.format(hook=hook[:300])
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
