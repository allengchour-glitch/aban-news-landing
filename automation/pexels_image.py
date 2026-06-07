#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — echte Stockfotos via Pexels (gratis API, no-op-sicher, stdlib).

Lädt zu einem Hook/Thema ein echtes, lizenzfreies Foto von Pexels (warm/professionell,
markenkonform). No-op ohne PEXELS_API_KEY (return None) → Aufrufer nutzt dann KI-Bild
oder die Marken-Karte. Pexels-Lizenz: kommerzielle Nutzung erlaubt, Namensnennung
erwünscht aber nicht Pflicht.

Key gratis: https://www.pexels.com/api/  →  GitHub-Secret PEXELS_API_KEY.

CLI:  python3 automation/pexels_image.py "Thema" out.jpg [square|landscape|portrait]
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# Kuratierte, warm/ruhig/professionelle Suchbegriffe (objekt-/arbeitsplatz-lastig,
# damit es zur Marke passt und nicht nach beliebigem Menschen-Stockfoto aussieht).
QUERIES = [
    "warm minimalist workspace desk",
    "laptop and coffee on wooden desk",
    "modern office still life warm light",
    "open notebook and pen flat lay",
    "technology abstract warm tones",
    "books and coffee cozy morning light",
    "smartphone on desk minimal",
    "soft morning light home office",
]
API = "https://api.pexels.com/v1/search"


def _idx(seed: str, n: int) -> int:
    return int(hashlib.md5(seed.encode("utf-8")).hexdigest(), 16) % max(1, n)


def fetch_image(hook: str, out_path: str, orientation: str = "square"):
    """Echtes Pexels-Foto laden. Gibt Pfad oder None (no-op/Fehler)."""
    key = os.environ.get("PEXELS_API_KEY", "").strip()
    if not key:
        return None
    if orientation not in ("square", "landscape", "portrait"):
        orientation = "square"
    query = QUERIES[_idx(hook + "q", len(QUERIES))]
    url = API + "?" + urllib.parse.urlencode(
        {"query": query, "per_page": 15, "orientation": orientation})
    req = urllib.request.Request(url, headers={"Authorization": key})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"::warning::Pexels HTTP {e.code}: {e.read().decode('utf-8','ignore')[:160]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Pexels-Aufruf fehlgeschlagen: {e}")
        return None

    photos = data.get("photos") or []
    if not photos:
        print(f"::warning::Pexels: keine Treffer für '{query}'.")
        return None
    photo = photos[_idx(hook, len(photos))]
    src = photo.get("src", {})
    img_url = src.get("large2x") or src.get("large") or src.get("original")
    if not img_url:
        return None
    try:
        with urllib.request.urlopen(img_url, timeout=60) as r:
            blob = r.read()
        with open(out_path, "wb") as f:
            f.write(blob)
    except Exception as e:  # noqa: BLE001
        print(f"::warning::Pexels-Download fehlgeschlagen: {e}")
        return None
    photographer = photo.get("photographer", "Pexels")
    print(f"✓ Pexels-Foto: {out_path} (Suche '{query}', Foto von {photographer})")
    return out_path


if __name__ == "__main__":
    hook = sys.argv[1] if len(sys.argv) > 1 else "KI-Newsletter für DACH-Profis"
    out = sys.argv[2] if len(sys.argv) > 2 else "pexels.jpg"
    orient = sys.argv[3] if len(sys.argv) > 3 else "square"
    r = fetch_image(hook, out, orient)
    sys.exit(0)
