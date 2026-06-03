#!/usr/bin/env python3
"""
produkt-imperium/generate_guide.py — Ratgeber-Fabrik.

Macht aus einem Thema (themen-backlog.json) einen KDP-tauglichen Sachbuch-Ratgeber:
Gliederung → Kapitel für Kapitel, im Aban-Voice (anti-hype, du-Form). Nutzt Claude
(Modell claude-opus-4-8) mit gecachtem System-Präfix; ohne ANTHROPIC_API_KEY läuft
es im Trockenlauf und schreibt nur die Gliederung als Gerüst.

WICHTIG (Markenversprechen):
- Die KI liefert ENTWÜRFE. Jeder Entwurf trägt den Marker „[Redaktion: prüfen]".
- Keine erfundenen Zahlen/Statistiken/Quellen als Fakt — Fakten verifiziert ein Mensch
  vor der Veröffentlichung. Output ist git-ignored (ausgabe/).

Aufruf:
    python3 generate_guide.py                  # listet das Backlog
    python3 generate_guide.py <thema-id>       # baut einen Ratgeber
    python3 generate_guide.py <thema-id> --dry # nur Gliederung, ohne API
"""
import json
import os
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKLOG = ROOT / "themen-backlog.json"
OUT = ROOT / "ausgabe"
MODELL = "claude-opus-4-8"

# Gecachter System-Präfix: die Marken-Stimme. Bleibt über alle Kapitel stabil
# (Prompt-Caching spart Tokens), darum bewusst lang und konkret.
ABAN_VOICE = (
    "Du schreibst Sachbuch-Ratgeber für aban news. Ton: pragmatisch, direkt, "
    "anti-hype, durchgehend die du-Form. Verboten sind Buzzwords und Floskeln "
    "(revolutionär, disruptiv, game-changer, bahnbrechend, einzigartig, nahtlos, "
    "10x, next-level, mühelos), Superlative und übertriebene Versprechen sowie "
    "Mehrfach-Ausrufezeichen. Schreib in klaren, kurzen Sätzen, mit konkreten "
    "Beispielen aus dem DACH-Arbeitsalltag. Erfinde KEINE Zahlen, Studien, Zitate "
    "oder Quellen; wo eine Zahl oder ein Beleg nötig wäre, schreib stattdessen "
    "‚[Redaktion: prüfen]‘ als Platzhalter. Sei ehrlich über Grenzen von KI."
)


def load_backlog():
    return json.loads(BACKLOG.read_text(encoding="utf-8"))


def slug(s):
    import re
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def list_backlog():
    data = load_backlog()
    print("Themen-Backlog:\n")
    for t in data["themen"]:
        print(f"  [{t['status']:13}] {t['id']}")
        print(f"      {t['titel']} — {t['zielgruppe']} ({t.get('umfang_kapitel', '?')} Kap.)")
    print("\nAufruf: python3 generate_guide.py <thema-id> [--dry]")


def find_topic(tid):
    for t in load_backlog()["themen"]:
        if t["id"] == tid:
            return t
    return None


def outline_only(topic):
    """Trockenlauf: deterministische Gliederung ohne API."""
    n = topic.get("umfang_kapitel", 7)
    lines = [f"# {topic['titel']}", "",
             f"> Ratgeber-GERÜST (Trockenlauf, ohne KI) · {date.today().isoformat()}",
             f"> Zielgruppe: {topic['zielgruppe']}",
             f"> Versprechen: {topic['versprechen']}", "",
             "## Gliederung (Vorschlag)", ""]
    lines.append("1. Einleitung — worum es geht und für wen [Redaktion: prüfen]")
    for i in range(2, n):
        lines.append(f"{i}. Kapitel {i} — Thema noch ausarbeiten [Redaktion: prüfen]")
    lines.append(f"{n}. Fazit & nächste Schritte [Redaktion: prüfen]")
    lines += ["", "_Mit gesetztem ANTHROPIC_API_KEY schreibt die Fabrik die Kapitel aus._"]
    return "\n".join(lines)


def build_with_ai(topic):
    import anthropic
    client = anthropic.Anthropic()
    cached_system = [{
        "type": "text", "text": ABAN_VOICE,
        "cache_control": {"type": "ephemeral"},
    }]

    # 1) Gliederung
    n = topic.get("umfang_kapitel", 7)
    plan_req = (
        f"Entwirf die Gliederung für einen Ratgeber.\n"
        f"Titel: {topic['titel']}\nZielgruppe: {topic['zielgruppe']}\n"
        f"Versprechen: {topic['versprechen']}\nKapitelzahl: {n}\n\n"
        "Gib NUR JSON zurück: {\"kapitel\": [{\"nr\":1,\"titel\":\"...\",\"ziel\":\"1 Satz\"}, ...]}."
    )
    resp = client.messages.create(
        model=MODELL, max_tokens=1500, system=cached_system,
        messages=[{"role": "user", "content": plan_req}],
    )
    raw = _text(resp)
    import re
    m = re.search(r"\{[\s\S]*\}", raw)
    plan = json.loads(m.group(0) if m else raw)
    kapitel = plan.get("kapitel", [])

    parts = [f"# {topic['titel']}", "",
             f"> Ratgeber-ENTWURF (KI-generiert, ungeprüft) · {date.today().isoformat()}",
             f"> Zielgruppe: {topic['zielgruppe']}",
             "> Vor Veröffentlichung: alle [Redaktion: prüfen]-Stellen verifizieren.", ""]

    # 2) Kapitel für Kapitel
    for k in kapitel:
        print(f"  schreibe Kapitel {k.get('nr')}: {k.get('titel')}")
        kap_req = (
            f"Schreib Kapitel {k.get('nr')} mit dem Titel: {k.get('titel')!r}. "
            f"Der Ratgeber heißt {topic['titel']!r}, Zielgruppe: {topic['zielgruppe']}.\n"
            f"Ziel des Kapitels: {k.get('ziel', '')}\n"
            "Umfang: 500–900 Wörter. Konkrete Beispiele, klare Schritte. "
            "Keine erfundenen Zahlen/Quellen — sonst [Redaktion: prüfen]."
        )
        r = client.messages.create(
            model=MODELL, max_tokens=2500, system=cached_system,
            messages=[{"role": "user", "content": kap_req}],
        )
        parts += [f"## {k.get('nr')}. {k.get('titel')}", "", _text(r).strip(), ""]
    return "\n".join(parts)


def _text(resp):
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    if not args:
        list_backlog()
        return
    topic = find_topic(args[0])
    if not topic:
        print(f"Thema '{args[0]}' nicht im Backlog. 'python3 generate_guide.py' listet alle.")
        sys.exit(1)

    OUT.mkdir(exist_ok=True)
    if dry or not os.environ.get("ANTHROPIC_API_KEY"):
        if not dry:
            print("Kein ANTHROPIC_API_KEY gesetzt — Trockenlauf (nur Gliederung).")
        text = outline_only(topic)
    else:
        print("Baue Ratgeber " + repr(topic["titel"]) + " mit " + MODELL + " ...")
        text = build_with_ai(topic)

    path = OUT / f"{slug(topic['titel'])}.md"
    path.write_text(text, encoding="utf-8")
    print(f"→ geschrieben: {path}")
    print("Nächster Schritt: Fakten ([Redaktion: prüfen]) verifizieren, dann KDP-Layout bauen.")


if __name__ == "__main__":
    main()
