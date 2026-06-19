#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — geschützte Kit-ZIPs aus DOWNLOAD_SALT bauen (deploy-tauglich).

Baut für JEDEN Kit (DE + EN, inkl. Bundle) das Paket und legt es unter dem
gehashten Namen `downloads/kits/<sha256(slug:DOWNLOAD_SALT)[:24]>.zip` ab —
exakt der Name, den `functions/api/kit-download.js` nach verifizierter Stripe-
Zahlung ausliefert. Damit funktioniert der Download mit JEDEM dauerhaften Salt,
ohne GitHub Actions: einfach `DOWNLOAD_SALT` im Cloudflare-Pages-Env setzen — der
Build (build-pages.sh) ruft dieses Skript und erzeugt die passenden ZIPs.

No-op ohne DOWNLOAD_SALT (Exit 0) — vorhandene ZIPs bleiben unangetastet.

    DOWNLOAD_SALT=… python3 automation/build_kit_zips.py
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "automation"))

from build_product_pack import (  # noqa: E402
    build_single, build_bundle, _bundle_slugs, _standalone_slugs,
)

KITS = REPO / "downloads" / "kits"


def dl_hash(slug: str, salt: str) -> str:
    return hashlib.sha256(f"{slug}:{salt}".encode("utf-8")).hexdigest()[:24]


def build_for(catalog_path: Path, lang: str, salt: str) -> int:
    if not catalog_path.exists():
        return 0
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    slugs = [k["slug"] for k in catalog]
    bundles = _bundle_slugs(catalog_path)
    standalone = _standalone_slugs(catalog_path)
    members = [s for s in slugs if s not in bundles and s not in standalone]
    n = 0
    # Einzel-Pakete zuerst (Bundle braucht sie).
    for slug in [s for s in slugs if s not in bundles]:
        try:
            zip_path = build_single(slug, lang)
            shutil.copy(zip_path, KITS / f"{dl_hash(slug, salt)}.zip")
            n += 1
        except Exception as e:  # noqa: BLE001
            print(f"::warning::Kit {slug} ({lang}): {e}")
    for slug in [s for s in slugs if s in bundles]:
        try:
            zip_path = build_bundle(slug, members, lang)
            shutil.copy(zip_path, KITS / f"{dl_hash(slug, salt)}.zip")
            n += 1
        except Exception as e:  # noqa: BLE001
            print(f"::warning::Bundle {slug} ({lang}): {e}")
    return n


def main() -> int:
    salt = os.environ.get("DOWNLOAD_SALT", "").strip()
    if not salt:
        print("DOWNLOAD_SALT nicht gesetzt → no-op (vorhandene Kit-ZIPs bleiben).")
        return 0
    # Deploy-Build soll deterministisch, schnell & gratis sein: KEINE KI-Calls beim
    # Bauen (gen_prompts fällt sonst je Kit auf Gemini zurück → 44× Netz/Tokens/Deploy).
    # Wir leeren die KI-Keys nur für DIESEN Prozess → garantierte Fallback-Prompts.
    for k in ("GCP_SA_KEY", "GCP_PROJECT", "GEMINI_API_KEY", "VERTEX_TEXT_MODEL", "GEMINI_MODEL"):
        os.environ.pop(k, None)
    KITS.mkdir(parents=True, exist_ok=True)
    total = 0
    total += build_for(REPO / "data" / "kit-catalog.json", "de", salt)
    total += build_for(REPO / "data" / "kit-catalog-en.json", "en", salt)
    print(f"✓ {total} Kit-ZIP(s) mit aktuellem DOWNLOAD_SALT gehasht in downloads/kits/ abgelegt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
