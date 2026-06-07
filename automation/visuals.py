#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — gemeinsame Bild-Erzeugung für Social-Posts (no-op-sicher, stdlib + Pillow).

EINE Stelle für die Logik, die früher dupliziert in `telegram_post.py` und
`linkedin_post.py` stand: KI-Bild (Vertex/Imagen → Gemini) bevorzugt, sonst
markeneigene Pillow-Karte, sonst None (Aufrufer postet dann ohne Bild).

- Pro Kanal passendes Seitenverhältnis (Imagen erlaubt nur 1:1, 3:4, 4:3, 9:16, 16:9).
- Kill-Switch `ABAN_DISABLE_IMAGE_GEN=1` → überspringt das kostenpflichtige KI-Bild
  und nutzt sofort die GRATIS Pillow-Karte. Ein Schalter, sofort wirksam, ohne Secrets.
"""
from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # Geschwister-Module
try:
    from gen_image_gemini import make_image, set_aspect  # KI-Bild (optional, braucht Key)
except Exception:  # noqa: BLE001
    make_image = None
    set_aspect = None
try:
    from pexels_image import fetch_image  # echtes Stockfoto (optional, braucht PEXELS_API_KEY)
except Exception:  # noqa: BLE001
    fetch_image = None
try:
    from gen_card import make_card  # markeneigene Text-Karte (Fallback, immer verfügbar)
except Exception:  # noqa: BLE001
    make_card = None

_ALLOWED_ASPECTS = {"1:1", "3:4", "4:3", "9:16", "16:9"}
# Pexels-Orientierung je Seitenverhältnis
_ORIENT = {"1:1": "square", "16:9": "landscape", "4:3": "landscape",
           "9:16": "portrait", "3:4": "portrait"}


def _hook(text: str) -> str:
    """Erste echte Textzeile als Bild-Thema (überspringt Markdown-Überschriften)."""
    return next((l.strip() for l in text.splitlines()
                 if l.strip() and not l.startswith("#")), text[:120])


def build_visual(text: str, *, aspect: str = "1:1", channel: str = "generic"):
    """KI-Bild bevorzugt, sonst Marken-Karte. Gibt Dateipfad oder None zurück.

    aspect : gewünschtes Seitenverhältnis (auf Imagen-erlaubte Werte begrenzt).
    channel: nur fürs Dateinamen-Präfix (telegram/linkedin/…).
    """
    hook = _hook(text)
    tmp = Path(tempfile.gettempdir())
    disabled = os.environ.get("ABAN_DISABLE_IMAGE_GEN", "").strip().lower() in (
        "1", "true", "yes", "on")
    # Bildquelle: "pexels" | "ai" | "auto". `or` fängt leere Env-Vars ab
    # (GitHub übergibt ${{ vars.X }} als "" wenn die Variable nicht existiert).
    source = (os.environ.get("ABAN_IMAGE_SOURCE") or "auto").strip().lower()

    # 1) Echtes Stockfoto via Pexels (wenn gewünscht + Key vorhanden)
    if fetch_image and not disabled and source in ("auto", "pexels"):
        p = fetch_image(hook, str(tmp / f"aban-{channel}-{uuid.uuid4().hex}.jpg"),
                        orientation=_ORIENT.get(aspect, "square"))
        if p:
            return p

    # 2) KI-Bild via Imagen/Vertex
    if make_image and not disabled and source in ("auto", "ai", "pexels"):
        if set_aspect and aspect in _ALLOWED_ASPECTS:
            set_aspect(aspect)
        p = make_image(hook, str(tmp / f"aban-{channel}-{uuid.uuid4().hex}.png"))
        if p:
            return p

    # 3) Marken-Karte (immer verfügbar)
    if make_card:
        try:
            return make_card(text, str(tmp / f"aban-{channel}-{uuid.uuid4().hex}.jpg"))
        except Exception as e:  # noqa: BLE001
            print(f"::warning::Karten-Fallback fehlgeschlagen: {e}")
    return None
