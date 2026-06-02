#!/usr/bin/env python3
"""LuxeStyle - STL-Generator fuer personalisierte 3D-Produkte.

Erzeugt aus einem Text eine druckfertige STL-Datei ueber OpenSCAD.

Voraussetzung: OpenSCAD installiert -> https://openscad.org/downloads.html
(Windows / Mac / Linux, kostenlos, Open Source.)

Modelle: keychain, nameplate, caketopper

Beispiele:
    python3 make.py keychain "Mia"
    python3 make.py nameplate "Familie Mueller"
    python3 make.py caketopper "Happy Birthday" --size 20
    python3 make.py keychain "Test" --dry-run     # nur Befehl zeigen
"""
from __future__ import annotations

import argparse
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

MODELS = {
    "keychain": "keychain.scad",
    "nameplate": "nameplate.scad",
    "caketopper": "caketopper.scad",
}


def slugify(text: str) -> str:
    """Macht aus einem Text einen sicheren Dateinamen-Teil."""
    slug = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return slug or "ausgabe"


def find_openscad() -> str | None:
    for cand in ("openscad", "openscad-nightly"):
        found = shutil.which(cand)
        if found:
            return found
    mac_app = Path("/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD")
    if mac_app.exists():
        return str(mac_app)
    return None


def build_command(openscad: str, scad: Path, text: str,
                  out: Path, size: float | None) -> list[str]:
    cmd = [openscad, "-o", str(out), "-D", f'txt="{text}"']
    if size is not None:
        cmd += ["-D", f"text_size={size}"]
    cmd.append(str(scad))
    return cmd


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Personalisierte 3D-Produkte als druckfertige STL erzeugen."
    )
    parser.add_argument("model", choices=sorted(MODELS), help="Produkt-Vorlage")
    parser.add_argument("text", help='Wunschtext, z. B. "Mia"')
    parser.add_argument("--out", type=Path, default=None,
                        help="Ziel-STL (Standard: <modell>_<text>.stl)")
    parser.add_argument("--size", type=float, default=None,
                        help="Schrifthoehe in mm (sonst Vorlagen-Standard)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Nur den Befehl zeigen, nichts rendern")
    args = parser.parse_args(argv)

    scad = HERE / MODELS[args.model]
    if not scad.exists():
        print(f"FEHLER: Vorlage nicht gefunden: {scad}", file=sys.stderr)
        return 2

    text = args.text.strip()
    if not text:
        print("FEHLER: Text ist leer.", file=sys.stderr)
        return 2
    if len(text) > 24:
        print("WARNUNG: Text ist sehr lang - das Teil wird breit.", file=sys.stderr)

    out = args.out or (HERE / f"{args.model}_{slugify(text)}.stl")
    openscad = find_openscad()

    if args.dry_run or openscad is None:
        cmd = build_command(openscad or "openscad", scad, text, out, args.size)
        printable = shlex.join(cmd)
        if openscad is None and not args.dry_run:
            print("OpenSCAD ist nicht installiert. "
                  "Installiere es von https://openscad.org/downloads.html",
                  file=sys.stderr)
            print("Danach erzeugt dieser Befehl die STL:", file=sys.stderr)
        print(printable)
        return 0 if args.dry_run else 1

    cmd = build_command(openscad, scad, text, out, args.size)
    print("Rendere:", " ".join(cmd))
    result = subprocess.run(cmd)
    if result.returncode == 0:
        print(f"Fertig: {out}")
    else:
        print("OpenSCAD-Render fehlgeschlagen.", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
