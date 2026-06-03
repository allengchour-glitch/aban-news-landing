#!/usr/bin/env python3
"""Aban News — Werkbank: Ausgaben-Entwurf + Voice-Check + Social-Repurposing.

Verbindet das Newsletter-Projekt mit dem Aban-Netzwerk (KI-Tools/Förder/Jobs-Radar).
Erzeugt aus den echten Daten einen fertigen Ausgaben-ENTWURF, prüft Text gegen die
Aban-Brand-Voice und leitet Social-Posts ab. Pure stdlib.

WICHTIG: Erzeugt nur ENTWÜRFE. Versand bleibt beim Menschen (beehiiv). Keine
erfundenen Fakten — es werden nur vorhandene, kuratierte Daten verwendet.

Befehle:
    python automation/werkbank.py issue        # Ausgaben-Entwurf (Markdown) -> stdout/Datei
    python automation/werkbank.py check  <datei>   # Brand-Voice-Check (Score + Hinweise)
    python automation/werkbank.py social <datei>   # Social-Posts aus einem Ausgaben-Entwurf
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# --- Brand-Voice: Forbidden-Phrasen (gespiegelt aus brand-voice-validator-api.py) ---
FORBIDDEN = [
    (r"\brevolution(?:aer|äre|är|ary)?\w*", "revolutionär"),
    (r"\bdisrupt(?:iv|ive|s|ed|ion)?\w*", "disruptiv"),
    (r"\bgame[- ]?changer\w*", "game-changer"),
    (r"\bcutting[- ]?edge\w*", "cutting-edge"),
    (r"\bleverag(?:e|ing|ed)\w*", "leverage"),
    (r"\bbahnbrech(?:end|ende|ender)\w*", "bahnbrechend"),
    (r"\bAI[- ]?powered\b", "AI-powered"),
    (r"\bnahtlos\w*", "nahtlos"),
    (r"\bmühelos\w*", "mühelos"),
    (r"\bin sekundenschnelle\b", "in Sekundenschnelle"),
]
SUGGEST = {
    "revolutionär": "→ 'neu', 'anders', 'die erste, die …'",
    "disruptiv": "→ konkret beschreiben, was sich ändert",
    "game-changer": "→ weglassen, Nutzen zeigen",
    "AI-powered": "→ 'mit KI' oder konkret nennen",
    "nahtlos": "→ 'funktioniert mit X' (konkret)",
    "mühelos": "→ ehrlich: 'in wenigen Schritten'",
}


def voice_check(text: str) -> dict:
    """0–10 Score + gefundene Hype-Phrasen (ehrliche, simple Heuristik)."""
    hits, penalty = [], 0.0
    for pat, name in FORBIDDEN:
        for m in re.finditer(pat, text, re.IGNORECASE):
            hits.append((name, m.group(0)))
            penalty += 1.5
    # leichte Boni/Mali für Stil
    excl = text.count("!")
    if excl > 3:
        penalty += (excl - 3) * 0.3
    score = max(0.0, 10.0 - penalty)
    return {"score": round(score, 1), "hits": hits, "exclamations": excl}


def cmd_check(path_str: str) -> int:
    text = Path(path_str).read_text(encoding="utf-8")
    r = voice_check(text)
    print(f"Brand-Voice-Check: {path_str}")
    print(f"  Score: {r['score']}/10  ({'OK' if r['score'] >= 7 else 'überarbeiten'})")
    if r["hits"]:
        print("  Hype-Phrasen gefunden:")
        for name, match in r["hits"]:
            tip = SUGGEST.get(name, "→ neutraler formulieren")
            print(f"    - {match!r}  {tip}")
    else:
        print("  Keine Hype-Phrasen — gut.")
    if r["exclamations"] > 3:
        print(f"  Hinweis: {r['exclamations']} Ausrufezeichen — ruhiger wirkt seriöser.")
    return 0 if r["score"] >= 7 and not r["hits"] else 1


def _load(path):
    p = REPO / path
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def cmd_issue() -> int:
    """Erzeugt einen Ausgaben-Entwurf aus den Netzwerk-Daten (Tools/Förder/Jobs)."""
    tools = (_load("data/tools.json") or {}).get("tools", [])
    foerder = (_load("foerder-radar/foerderungen.json") or {}).get("programme", [])
    jobs = (_load("jobs-radar/jobs.json") or {}).get("jobs", [])

    # 1 Tool im Fokus (höchste Bewertung, das diese Woche noch nicht „dran" war — hier: Top)
    top = sorted(tools, key=lambda t: (t.get("worth_it_score", 0),
                                       t.get("dach_relevance", 0)), reverse=True)
    feat = top[0] if top else None
    runner = top[1:4]
    foe = sorted(foerder, key=lambda p: p.get("region", ""))[:3]
    job = jobs[:3]
    today = date.today().isoformat()

    md = []
    md.append(f"# Aban News — Ausgaben-Entwurf ({today})")
    md.append("\n> ENTWURF — vor Versand prüfen & kürzen. Brand-Voice: ehrlich, kein Hype.\n")
    md.append("**Betreff (Vorschlag):** "
              + (f"{feat['name']}: lohnt sich das wirklich?" if feat else "KI-Briefing"))
    md.append("\n---\n")
    md.append("Hi,\n\nhier dein KI-Briefing für heute — 3–5 Minuten, kein Hype.\n")

    if feat:
        note = feat.get("aban_note") or "—"
        md.append(f"## 🔧 Tool im Fokus: {feat['name']}")
        md.append(f"*{feat.get('vendor','')} · Bewertung {feat.get('worth_it_score','—')}/10 · "
                  f"DACH-Relevanz {feat.get('dach_relevance','—')}/10*\n")
        md.append(f"{note}\n")
        if feat.get("dsgvo_note"):
            md.append(f"**DSGVO:** {feat['dsgvo_note']}\n")
        md.append(f"→ Mehr im KI-Tools Radar: https://radar.abannews.com/tool/{feat['id']}.html\n")

    if runner:
        md.append("## 📰 Kurz notiert")
        for t in runner:
            md.append(f"- **{t['name']}** ({t.get('worth_it_score','—')}/10) — "
                      f"{(t.get('aban_note') or '').split('.')[0]}.")
        md.append("")

    if foe:
        md.append("## 🧭 Förder-Tipp der Woche")
        for p in foe[:1]:
            md.append(f"- **{p['name']}** ({p.get('traeger','')}) — {p.get('kurz','')}")
        md.append("→ Alle Programme: https://foerder.abannews.com\n")

    if job:
        md.append("## 💼 KI-Jobs")
        for j in job:
            loc = j.get("location") or ("Remote" if j.get("remote") else "")
            md.append(f"- {j.get('title','')} – {j.get('company','')} ({loc})")
        md.append("→ Mehr: https://jobs.abannews.com\n")

    md.append("---\n")
    md.append("Bis morgen,\nAlleng\n")
    md.append("*Aban News · abgemeldet ist nur einen Klick entfernt · "
              "[Top-30-KI-Tools-PDF](https://abannews.com/gratis-ki-tools.html)*")
    out = "\n".join(md)

    dst = REPO / "automation" / f"entwurf-{today}.md"
    dst.write_text(out, encoding="utf-8")
    # Selbst-Check
    r = voice_check(out)
    print(out)
    print(f"\n--- gespeichert: {dst.relative_to(REPO)} · Voice-Score {r['score']}/10 "
          f"{'(OK)' if r['score']>=7 and not r['hits'] else '(prüfen)'} ---", file=sys.stderr)
    return 0


def cmd_social(path_str: str) -> int:
    """Leitet aus einem Ausgaben-Entwurf 3 kurze Social-Posts ab (Entwürfe)."""
    text = Path(path_str).read_text(encoding="utf-8")
    # Sehr simple Extraktion: Überschriften + erste Sätze
    feat = re.search(r"## 🔧 Tool im Fokus: (.+)", text)
    foe = re.search(r"## 🧭 Förder-Tipp der Woche\n- \*\*(.+?)\*\*", text)
    posts = []
    if feat:
        posts.append(f"🔧 Tool im Fokus diese Woche: {feat.group(1).strip()}\n\n"
                     f"Ehrlich getestet, mit DSGVO-Blick. Lohnt sich das? Mein Fazit im Newsletter.\n\n"
                     f"👉 https://abannews.com")
    if foe:
        posts.append(f"🧭 Förder-Tipp: {foe.group(1).strip()}\n\n"
                     f"Eines von 63 Programmen in meinem Förder-Radar (DE/AT/CH/EU).\n\n"
                     f"👉 https://foerder.abannews.com")
    posts.append("📬 Heute neu im Aban-News-Newsletter: 1 Tool, kurz & ehrlich getestet, "
                 "plus Förder- und Job-Tipp.\n\n3–5 Min, kein Hype 👉 https://abannews.com")
    print(json.dumps({"posts": [{"id": f"issue-{date.today().isoformat()}-{i+1}",
                                 "sent": False, "text": p} for i, p in enumerate(posts)]},
                     ensure_ascii=False, indent=2))
    print(f"\n--- {len(posts)} Social-Entwürfe. Zum Versand in social/posts.json einfügen. ---",
          file=sys.stderr)
    return 0


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("issue", "check", "social"):
        print(__doc__)
        return 2
    cmd = sys.argv[1]
    if cmd == "issue":
        return cmd_issue()
    if len(sys.argv) < 3:
        sys.stderr.write(f"'{cmd}' braucht eine Datei.\n")
        return 2
    return cmd_check(sys.argv[2]) if cmd == "check" else cmd_social(sys.argv[2])


if __name__ == "__main__":
    sys.exit(main())
