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
Mit Salt: Katalog- und Paketfehler brechen mit Exit 1 ab. Erst nach vollständig
geprüftem ZIP-Satz werden Dateien übernommen; der Deploy darf Fehler nicht ignorieren.

    DOWNLOAD_SALT=… python3 automation/build_kit_zips.py
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "automation"))

from build_product_pack import (  # noqa: E402
    build_single, build_bundle,
)

KITS = REPO / "downloads" / "kits"


def dl_hash(slug: str, salt: str) -> str:
    return hashlib.sha256(f"{slug}:{salt}".encode("utf-8")).hexdigest()[:24]


def build_for(catalog_path: Path, lang: str, salt: str, target: Path) -> int:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    if not isinstance(catalog, list) or any(not isinstance(k, dict) or not isinstance(k.get("slug"), str) or not k["slug"] for k in catalog):
        raise ValueError("Ungültiger Kit-Katalog")
    slugs = [k["slug"] for k in catalog]
    if len(slugs) != len(set(slugs)):
        raise ValueError("Doppelte Kit-Zuordnung")
    bundles = {k["slug"] for k in catalog if k.get("bundle")}
    standalone = {k["slug"] for k in catalog if k.get("standalone")}
    members = [s for s in slugs if s not in bundles and s not in standalone]
    n = 0
    # Einzel-Pakete zuerst (Bundle braucht sie).
    for slug in [s for s in slugs if s not in bundles] + [s for s in slugs if s in bundles]:
        try:
            zip_path = build_bundle(slug, members, lang) if slug in bundles else build_single(slug, lang)
            with zipfile.ZipFile(zip_path) as archive:
                if not any(not item.is_dir() for item in archive.infolist()) or archive.testzip() is not None:
                    raise zipfile.BadZipFile("Leeres oder beschädigtes Paket")
            shutil.copy2(zip_path, target / f"{dl_hash(slug, salt)}.zip")
            n += 1
        except Exception as e:  # noqa: BLE001
            # Keine internen Dateinamen, Hashes oder Inhalte in öffentliche Logs.
            print(f"::error::Kit {slug} ({lang}) fehlgeschlagen ({type(e).__name__}).")
            raise
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
    try:
        # automation/ wird vom öffentlichen Build ausgeschlossen. Erst alle Pakete
        # prüfen, dann ersetzen; ein Paketfehler darf bestehende ZIPs nicht löschen.
        with tempfile.TemporaryDirectory(prefix=".kit-bau-", dir=REPO / "automation") as tmp:
            target = Path(tmp)
            total = build_for(REPO / "data" / "kit-catalog.json", "de", salt, target)
            total += build_for(REPO / "data" / "kit-catalog-en.json", "en", salt, target)
            files = list(target.glob("*.zip"))
            names = {p.name for p in files}
            if not total or len(names) != total:
                raise ValueError("Kein vollständiger eindeutiger ZIP-Satz")
            KITS.mkdir(parents=True, exist_ok=True)
            for p in files:
                p.replace(KITS / p.name)
            # Alte Salt-Dateien erst nach vollständigem Bau und Übernahme entfernen.
            for p in KITS.glob("*.zip"):
                if p.name not in names:
                    p.unlink()
    except Exception as e:  # noqa: BLE001
        print(f"::error::Kit-Bau abgebrochen ({type(e).__name__}); keine Freigabe für den Deploy.")
        return 1
    print(f"✓ {total} Kit-ZIP(s) mit aktuellem DOWNLOAD_SALT gehasht in downloads/kits/ abgelegt.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
