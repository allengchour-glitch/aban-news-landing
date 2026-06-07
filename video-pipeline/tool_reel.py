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


_CAT_FOOTAGE = [
    ("chat", "artificial intelligence neural network glowing"),
    ("cod", "programmer code screen dark"), ("develop", "software developer typing code"),
    ("image", "creative digital art studio"), ("design", "graphic design workspace"),
    ("video", "video editing timeline screen"), ("voice", "recording studio microphone"),
    ("audio", "sound waves studio"), ("writ", "writing on laptop desk"),
    ("content", "content creation desk"), ("automat", "automation technology flow"),
    ("data", "data dashboard analytics screen"), ("analyt", "analytics charts screen"),
    ("market", "marketing laptop office"), ("seo", "search analytics laptop"),
    ("api", "server data center blue light"),
]


def _footage_for(t):
    cats = " ".join(c.lower() for c in t.get("category", [])) + " " + \
           " ".join(u.lower() for u in t.get("use_cases", []))
    for key, q in _CAT_FOOTAGE:
        if key in cats:
            return q
    return "modern technology laptop work"


def tool_queries(t):
    """4 Pexels-Suchbegriffe (pro Slide) — passend, dezent, ruhig."""
    return [
        "futuristic technology abstract dark motion",
        _footage_for(t),
        "focused person working laptop office",
        "coffee laptop morning desk minimal",
    ]


def build_slides(t):
    d = OUT / f"tool-{t['id']}"
    d.mkdir(parents=True, exist_ok=True)
    cats = " · ".join(t.get("category", [])[:3])
    uses = ", ".join(t.get("use_cases", [])[:4])
    score = t.get("worth_it_score")
    # rot bei schwachem Score, sonst Amber — visuell ehrlich
    accent = STRIKE if isinstance(score, (int, float)) and score < 6 else AMBER_DK

    # 4 Slide-Specs einmal definieren → daraus deckende Slides + transparente Overlays
    specs = [
        dict(kicker="KI-TOOL", headline=f"Lohnt sich {t['name']}?", body=""),
        dict(kicker="WAS IST DAS", headline=t["name"], body=f"{t.get('vendor','')} · {cats}\nGut für: {uses}"),
        dict(kicker="ABAN-URTEIL", headline=_score_str(score), body=_short(t.get("aban_note", ""), 240), accent=accent),
        dict(kicker="MEHR DAVON", headline="Ehrlicher KI-Tool-Vergleich", body=f"{RADAR} · Newsletter auf {SITE}"),
    ]
    for i, s in enumerate(specs, 1):
        brand.slide(d / f"slide_0{i}.png", footer=RADAR, **s)
        brand.slide_overlay(d / f"overlay_0{i}.png", footer=RADAR, **s)

    lines = tool_script(t)
    (d / "skript.txt").write_text("\n\n".join(lines), encoding="utf-8")
    (d / "untertitel.srt").write_text(srt(lines), encoding="utf-8")
    (d / "post.txt").write_text(caption(t), encoding="utf-8")
    (d / "queries.txt").write_text("\n".join(tool_queries(t)), encoding="utf-8")
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
    # broll=True → mit PEXELS-Key Stockclip-Look, sonst sauberer Zoom-Fallback
    reel.render(f"tool-{t['id']}", voice=voice, broll=True)


if __name__ == "__main__":
    main()
