#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Content-Studio: EIN Einstieg für alle Content-Tools.

Macht die einzelnen Bausteine später bequem nutzbar — ein Befehl statt vieler Skripte.

  python3 automation/studio.py card  "Deine Headline"        out.jpg     # Marken-Textkarte (immer)
  python3 automation/studio.py image "Thema/Hook"            out.png     # KI-Bild (braucht GEMINI_API_KEY)
  python3 automation/studio.py chart  daten.json             out.png     # Diagramm aus ECHTEN Zahlen
  python3 automation/studio.py chart-template                daten.json  # leere Vorlage zum Ausfüllen
  python3 automation/studio.py draft                                     # Ausgaben-Entwurf (Gemini)
  python3 automation/studio.py daily                                     # ganze Pipeline 1x (Sammeln→Posts→Entwurf)
  python3 automation/studio.py status                                    # Queues/Keys/Entwürfe auf einen Blick
  python3 automation/studio.py help

Ehrlichkeit: 'chart' rendert NUR von dir gelieferte Zahlen (mit Pflicht-Quelle). KI 'malt'
keine Daten. 'image' ist abstrakt/editorial (keine Fake-Gesichter/Zahlen/Screenshots).
Alle KI-Funktionen sind no-op ohne Key.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

CHART_TEMPLATE = {
    "title": "Kurzer, ehrlicher Titel",
    "source": "Quelle: [Anbieter/Studie, Jahr, Link]",
    "unit": "%",
    "data": [["Label A", 0], ["Label B", 0], ["Label C", 0]],
}


def main(argv):
    if not argv or argv[0] in ("help", "-h", "--help"):
        print(__doc__)
        return 0
    cmd = argv[0]

    if cmd == "card":
        from gen_card import make_card
        text = argv[1] if len(argv) > 1 else "aban news — KI in 5 Minuten"
        out = argv[2] if len(argv) > 2 else "card.jpg"
        print("Karte:", make_card(text, out))
        return 0

    if cmd == "image":
        from gen_image_gemini import make_image
        hook = argv[1] if len(argv) > 1 else "Täglicher KI-Newsletter für DACH"
        out = argv[2] if len(argv) > 2 else "image.png"
        p = make_image(hook, out)
        print("Bild:", p or "(kein Key / kein Output)")
        return 0

    if cmd == "chart":
        if len(argv) < 2 or not argv[1].endswith(".json"):
            print("Nutzung: studio.py chart daten.json out.png"); return 1
        from gen_chart import make_chart
        spec = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
        data = [(d[0], float(d[1])) for d in spec["data"]]
        out = argv[2] if len(argv) > 2 else "chart.png"
        print("Diagramm:", make_chart(spec.get("title", ""), data, spec.get("source", ""),
                                      out, unit=spec.get("unit", "")))
        return 0

    if cmd == "chart-template":
        out = argv[1] if len(argv) > 1 else "chart-daten.json"
        Path(out).write_text(json.dumps(CHART_TEMPLATE, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")
        print(f"Vorlage geschrieben: {out} — echte Zahlen + Quelle eintragen, dann: studio.py chart {out} out.png")
        return 0

    if cmd == "draft":
        import draft_with_gemini
        return draft_with_gemini.main()

    if cmd == "status":
        import os
        import glob
        REPO = Path(__file__).resolve().parent.parent
        def ready(q):
            p = REPO / "social" / q
            if not p.exists():
                return "—"
            items = json.loads(p.read_text(encoding="utf-8"))
            r = sum(1 for e in items if e.get("status") == "ready")
            return f"{r} ready / {len(items)} gesamt"
        print("📊 aban news — System-Status\n")
        print("Autopost-Queues:")
        print("  Telegram :", ready("telegram_queue.json"))
        print("  LinkedIn :", ready("linkedin_queue.json"))
        drafts = sorted(glob.glob(str(REPO / "automation" / "entwurf-gemini-*.md")))
        print("Wartende Entwürfe:", len(drafts), (("· neuester: " + Path(drafts[-1]).name) if drafts else ""))
        print("\nSecrets/Keys gesetzt (in dieser Umgebung):")
        for k in ["GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL",
                  "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"]:
            print(f"  {'✓' if os.environ.get(k) else '—'} {k}")
        print("\n(Hinweis: GitHub-Secrets sind hier nicht sichtbar — das ist nur die lokale Umgebung.)")
        return 0

    if cmd == "daily":
        import subprocess
        AUT = Path(__file__).resolve().parent
        steps = [
            ("Rohmaterial sammeln", [sys.executable, str(AUT / "news_aggregator.py")]),
            ("Posts erzeugen (Gemini→Linter→Queue)", [sys.executable, str(AUT / "gemini_generate_posts.py"), "--n", "3"]),
            ("Ausgaben-Entwurf (Gemini)", [sys.executable, str(AUT / "draft_with_gemini.py")]),
        ]
        for name, c in steps:
            print(f"\n=== {name} ===")
            subprocess.run(c)
        print("\n✓ Daily-Lauf fertig. Status: studio.py status")
        return 0

    print(f"Unbekannter Befehl: {cmd}\n")
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
