#!/usr/bin/env python3
"""video-pipeline/tool_reel.py — „KI-Tool des Tages" als fertiges Reel.

Macht aus einem echten Eintrag in data/tools.json (Abans eigene Urteile —
worth_it_score, aban_note, dsgvo_note) ein markengetreues 9:16-Reel
(„Lohnt sich {Tool}? Ehrlich, in 20 Sekunden") und rendert es direkt via
mediakit.reel. Treibt Traffic auf radar.abannews.com (Affiliate) + Newsletter.

    python3 tool_reel.py                 # Tool des Tages (deterministisch per Datum)
    python3 tool_reel.py <tool-id>       # bestimmtes Tool (z. B. claude)
    python3 tool_reel.py --voice         # mit ElevenLabs-Stimme + Karaoke (Key XI)

Nur echte Daten, keine erfundenen Zahlen. Output (ausgabe/tool-<id>/) git-ignored.
"""
import datetime
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(REPO))   # mediakit importierbar

from mediakit import brand, reel
from mediakit.brand import AMBER_DK, STRIKE

OUT = ROOT / "ausgabe"
SITE = "abannews.com"
RADAR = "radar.abannews.com"


def _short(text, n):
    text = " ".join(str(text or "").split())
    if len(text) <= n:
        return text
    return text[:n].rsplit(" ", 1)[0] + " …"


def _score_str(s):
    return f"{s:g}/10" if isinstance(s, (int, float)) else "—"


def tool_script(t):
    """5 Sätze (mappen auf die 4 Slides: Slide 3 = Urteil+DSGVO)."""
    cats = ", ".join(t.get("category", [])[:3])
    uses = ", ".join(t.get("use_cases", [])[:3])
    return [
        f"Lohnt sich {t['name']}?",
        f"{t['name']} von {t.get('vendor','')} — {cats}. Gut für: {uses}.",
        f"Aban-Score {_score_str(t.get('worth_it_score'))}. {_short(t.get('aban_note',''), 200)}",
        f"DSGVO: {_short(t.get('dsgvo_note',''), 160)}" if t.get("dsgvo_note") else "Ehrlich bewertet, ohne Affiliate-Bias.",
        f"Voller Vergleich, Preis und Alternativen auf {RADAR}. Ehrliche KI-Tipps im Newsletter auf {SITE}.",
    ]


def srt(lines):
    out, tn = [], 0.0
    for i, line in enumerate(lines, 1):
        dur = max(2.0, len(line.split()) / 2.6)
        out.append(f"{i}\n{brand._ts(tn)} --> {brand._ts(tn + dur)}\n{line}\n")
        tn += dur
    return "\n".join(out)


def caption(t):
    return (
        f"Lohnt sich {t['name']}? Ehrliche Einschätzung in 20 Sekunden.\n\n"
        f"Aban-Score {_score_str(t.get('worth_it_score'))} — voller Vergleich + Alternativen:\n"
        f"https://{RADAR}/\n\n#KI #Tools #{t['name'].replace(' ','')} #aban"
    )


def build_slides(t):
    d = OUT / f"tool-{t['id']}"
    d.mkdir(parents=True, exist_ok=True)
    cats = " · ".join(t.get("category", [])[:3])
    uses = ", ".join(t.get("use_cases", [])[:4])
    score = t.get("worth_it_score")
    # rot bei schwachem Score, sonst Amber — visuell ehrlich
    accent = STRIKE if isinstance(score, (int, float)) and score < 6 else AMBER_DK

    brand.slide(d / "slide_01.png", kicker="KI-TOOL", headline=f"Lohnt sich {t['name']}?",
                body="", footer=RADAR)
    brand.slide(d / "slide_02.png", kicker="WAS IST DAS", headline=t["name"],
                body=f"{t.get('vendor','')} · {cats}\nGut für: {uses}", footer=RADAR)
    brand.slide(d / "slide_03.png", kicker="ABAN-URTEIL", headline=_score_str(score),
                body=_short(t.get("aban_note", ""), 240), accent=accent, footer=RADAR)
    brand.slide(d / "slide_04.png", kicker="MEHR DAVON", headline="Ehrlicher KI-Tool-Vergleich",
                body=f"{RADAR} · Newsletter auf {SITE}", footer=RADAR)

    lines = tool_script(t)
    (d / "skript.txt").write_text("\n\n".join(lines), encoding="utf-8")
    (d / "untertitel.srt").write_text(srt(lines), encoding="utf-8")
    (d / "post.txt").write_text(caption(t), encoding="utf-8")
    return d


def tool_of_the_day(tools):
    """Deterministisch rotierend: hochbewertete zuerst, kein Wiederholen für viele Tage."""
    ranked = sorted(tools, key=lambda t: (-(t.get("worth_it_score") or 0), t["id"]))
    idx = (datetime.date.today() - datetime.date(2026, 1, 1)).days % len(ranked)
    return ranked[idx]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    voice = "--voice" in sys.argv
    data = json.loads((REPO / "data" / "tools.json").read_text(encoding="utf-8"))
    tools = data["tools"] if isinstance(data, dict) else data

    if args:
        sel = [t for t in tools if t["id"] == args[0]]
        if not sel:
            print(f"Tool '{args[0]}' nicht in data/tools.json."); sys.exit(1)
        t = sel[0]
    else:
        t = tool_of_the_day(tools)

    print(f"KI-Tool-Reel: {t['name']} (Score {_score_str(t.get('worth_it_score'))})")
    build_slides(t)
    reel.render(f"tool-{t['id']}", voice=voice)


if __name__ == "__main__":
    main()
