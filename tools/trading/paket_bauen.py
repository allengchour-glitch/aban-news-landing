#!/usr/bin/env python3
"""Baut das Programmpaket für den Auto-Update des PCs (tools/trading/krypto_bot/autoupdate.py).

  python3 tools/trading/paket_bauen.py --out build                  # aus den von Git verfolgten Dateien unter tools/trading
  python3 tools/trading/paket_bauen.py --out build --hinweis "…"    # Satz für die Anzeige im Cockpit («Neu: …»)

Schreibt nach --out:
  krypto-paket-<Version>.zip   nur Dateien unter tools/trading/ (ohne daten/ und ohne die Not-Aus-Dateien), dazu VERSION.json und PAKET-DATEIEN.json
  paket.json         die Beschreibung, die der PC zuerst holt: Version, Commit, Bauzeit, Prüfsumme, Grösse

Das ZIP ist reproduzierbar (feste Zeitstempel, sortierte Einträge). .bat und .vbs müssen Windows-Zeilenenden (CRLF) haben, sonst bricht der Bau ab.
Am Ende prüft dieses Skript das fertige ZIP mit derselben Funktion wie der PC (autoupdate.zip_lesen): was der PC ablehnen würde, wird nie veröffentlicht.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER / "krypto_bot"))
import autoupdate as AU  # noqa: E402

def zip_name(version):
    """Der Dateiname enthält die Version: ein neues Paket überschreibt nie das alte, das ein PC gerade lädt. Erst das ZIP hochladen, dann paket.json."""
    return f"krypto-paket-{version}.zip"


FEST = (2026, 1, 1, 0, 0, 0)


def sammeln(repo_root):
    """Alle von Git verfolgten Dateien unter tools/trading → {Pfad: Inhalt}."""
    r = subprocess.run(["git", "ls-files", "-z", "--", "tools/trading"], cwd=str(repo_root), capture_output=True, check=True)
    namen = [n.decode("utf-8") for n in r.stdout.split(b"\0") if n]
    return {n: (Path(repo_root) / n).read_bytes() for n in namen}


def zip_bauen(dateien, commit, gebaut, hinweis="", datum=None):
    """→ (ZIP-Bytes, Beschreibung als Dict). dateien: {Pfad: Inhalt}. Wirft ValueError, wenn etwas nicht stimmt.
    Die Versionsnummer ist «Datum des Commits.Kurzform des Commits»: derselbe Commit ergibt immer dieselbe Nummer (ein erneuter Bau löst kein Update aus)."""
    if not isinstance(commit, str) or len(commit) < 7:
        raise ValueError("commit fehlt")
    nutz, uebersprungen = {}, []
    for rel, inhalt in dateien.items():
        if rel in (AU.VERSION_REL, AU.LISTE_REL) or "__pycache__" in rel.split("/") or rel.endswith(".pyc") or AU.geschuetzt(rel):
            continue
        if PurePosixPath(rel).suffix.lower() not in AU.ERLAUBTE_ENDUNGEN:
            uebersprungen.append(rel)
            continue
        if not AU._name_ok(rel):
            raise ValueError(f"unzulässiger Pfad: {rel!r}")
        if PurePosixPath(rel).suffix.lower() in AU.SKRIPT_ENDUNGEN and inhalt.count(b"\n") != inhalt.count(b"\r\n"):
            raise ValueError(f"{rel} hat keine reinen Windows-Zeilenenden (CRLF) — cmd.exe springt sonst falsch")
        nutz[rel] = inhalt
    version = f"{datum or gebaut[:10]}.{commit[:7]}"
    liste = {"format": 1, "version": version, "dateien": {rel: hashlib.sha256(nutz[rel]).hexdigest() for rel in sorted(nutz)}}
    nutz[AU.VERSION_REL] = (json.dumps({"version": version, "commit": commit, "gebaut": gebaut}, ensure_ascii=False, indent=1) + "\n").encode("utf-8")
    nutz[AU.LISTE_REL] = (json.dumps(liste, ensure_ascii=False, indent=1) + "\n").encode("utf-8")
    puffer = io.BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in sorted(nutz):
            zi = zipfile.ZipInfo(rel, date_time=FEST)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, nutz[rel])
    daten = puffer.getvalue()
    manifest = {"format": 1, "version": version, "commit": commit, "gebaut": gebaut, "datei": zip_name(version),
                "sha256": hashlib.sha256(daten).hexdigest(), "groesse": len(daten), "dateien": len(nutz),
                "hinweis": " ".join(str(hinweis or "").split())[:200]}
    AU.zip_lesen(daten, AU.manifest_pruefen(manifest))          # derselbe Test wie auf dem PC
    manifest["uebersprungen"] = sorted(uebersprungen)
    return daten, manifest


def commit_datum(wurzel, commit):
    """Datum (UTC) des Commits als 2026-11-03, oder None."""
    try:
        r = subprocess.run(["git", "show", "-s", "--format=%ct", commit], cwd=str(wurzel), capture_output=True, text=True, check=True)
        return datetime.fromtimestamp(int(r.stdout.strip()), timezone.utc).strftime("%Y-%m-%d")
    except Exception:  # noqa: BLE001
        return None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="Zielordner für krypto-paket.zip und paket.json")
    ap.add_argument("--wurzel", default=str(HIER.parents[1]), help="Wurzel des Repos (Standard: zwei Ebenen über diesem Skript)")
    ap.add_argument("--commit", help="Commit (Standard: HEAD)")
    ap.add_argument("--gebaut", help="Bauzeit UTC, Format 2026-11-03T21:00:00Z (Standard: jetzt)")
    ap.add_argument("--hinweis", default="", help="ein Satz, im Cockpit als «Neu: …» angezeigt")
    a = ap.parse_args(argv)
    commit = a.commit or subprocess.run(["git", "rev-parse", "HEAD"], cwd=a.wurzel, capture_output=True, text=True, check=True).stdout.strip()
    gebaut = a.gebaut or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    daten, manifest = zip_bauen(sammeln(a.wurzel), commit, gebaut, a.hinweis, datum=commit_datum(a.wurzel, commit))
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / manifest["datei"]).write_bytes(daten)
    (out / "paket.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    gross = f"{manifest['groesse']:,}".replace(",", "'")
    print(f"Paket {manifest['version']}: {manifest['dateien']} Dateien, {gross} Bytes, sha256 {manifest['sha256'][:16]}…")
    for rel in manifest["uebersprungen"]:
        print(f"::warning::übersprungen (Dateiart nicht erlaubt): {rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
