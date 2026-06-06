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

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-preview-image-generation")

PROMPT_TMPL = (
    "Erzeuge eine editoriale, minimalistische Illustration im warmen Kaffee-/Amber-Stil "
    "(cremeweißer Hintergrund, Amber/Orange-Akzent #d97706, ruhig, viel Weißraum, flaches "
    "edles Vektor-Gefühl). Thema: {hook}. "
    "STRIKT: kein Text, keine Buchstaben, keine Logos, keine realen Gesichter/erkennbaren Personen, "
    "keine erfundenen Diagramme, Zahlen, Screenshots oder Marken. Abstrakt-konzeptionell, seriös, "
    "nicht reißerisch."
)


def make_image(hook: str, out_path: str):
    """Gibt out_path zurück (Bild erzeugt) oder None (no-op/Fehler)."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY nicht gesetzt → kein Bild (no-op).")
        return None

    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={api_key}")
    body = {
        "contents": [{"parts": [{"text": PROMPT_TMPL.format(hook=hook[:300])}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"::warning::Gemini-Image HTTP {e.code}: {e.read().decode('utf-8','ignore')[:300]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Gemini-Image-Aufruf fehlgeschlagen: {e}")
        return None

    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        print(f"::warning::Unerwartete Gemini-Antwort: {str(data)[:200]}")
        return None

    for p in parts:
        inline = p.get("inlineData") or p.get("inline_data")
        if inline and inline.get("data"):
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(inline["data"]))
            print(f"✓ Bild erzeugt: {out_path} (Modell {MODEL})")
            return out_path
    print("::warning::Keine Bilddaten in der Antwort (Modell evtl. ohne Bild-Output/Freischaltung).")
    return None


if __name__ == "__main__":
    hook = sys.argv[1] if len(sys.argv) > 1 else "Täglicher KI-Newsletter für DACH-Profis"
    out = sys.argv[2] if len(sys.argv) > 2 else "gemini-image.png"
    res = make_image(hook, out)
    sys.exit(0 if res or not os.environ.get("GEMINI_API_KEY") else 0)
