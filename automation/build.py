#!/usr/bin/env python3
"""Ein-Befehl-Build für aban news.

Lässt alle Generatoren/Injektoren in der richtigen Reihenfolge laufen und
validiert am Ende. Alle Schritte sind idempotent — mehrfaches Ausführen ist
sicher und erzeugt (wenn nichts Neues dazukam) keinen Diff.

    python3 automation/build.py            # voller Build + Validierung
    python3 automation/build.py --no-validate
    python3 automation/build.py --validate-only
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "automation"

# Reihenfolge respektiert Abhängigkeiten (Bilder -> RSS -> Injektoren -> Queue)
STEPS = [
    ("Header-SVGs + Archiv-Thumbnails", "generate_issue_heroes.py"),
    ("OG-Bilder (Ausgaben)", "generate_og_images.py"),
    ("OG-Bilder (Seiten)", "generate_page_og.py"),
    ("RSS-Feed", "generate_rss.py"),
    ("Subscribe-Box + Share (Ausgaben)", "inject_issue_cta.py"),
    ("SEO: Weiterlesen + Breadcrumbs", "inject_seo.py"),
    ("PWA-Manifest + Icons", "inject_pwa.py"),
    ("Modern-Layer (CSS/Reveal)", "inject_modern.py"),
    ("Exit-Intent-Prompt", "inject_exit_prompt.py"),
    ("Social-Queue", "build_social_queue.py"),
]
VALIDATORS = [
    ("Daten-Integrität", "data_integrity.py"),
    ("Site-Validierung", "validate_site.py"),
]


def run(script):
    p = A / script
    if not p.exists():
        print(f"  ! {script} fehlt — übersprungen")
        return True
    r = subprocess.run([sys.executable, str(p)], capture_output=True, text=True)
    out = (r.stdout or "").strip().splitlines()
    tail = out[-1] if out else ""
    print(f"  {'✓' if r.returncode == 0 else '✗'} {script}: {tail}")
    if r.returncode != 0 and r.stderr:
        print("    " + r.stderr.strip().splitlines()[-1])
    return r.returncode == 0


def main():
    args = sys.argv[1:]
    ok = True
    if "--validate-only" not in args:
        print("== Build ==")
        for label, script in STEPS:
            print(f"[{label}]")
            ok = run(script) and ok
    if "--no-validate" not in args:
        print("\n== Validierung ==")
        for label, script in VALIDATORS:
            print(f"[{label}]")
            ok = run(script) and ok
    print("\n" + ("✅ Build sauber." if ok else "❌ Build mit Fehlern — siehe oben."))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
