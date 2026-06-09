#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Social-Content-Queue im aban-LinkedIn-Stil generieren.

Baut aus Glossar / Tool-Vergleichen / Tool-Tipps / Prompts fertige Post-Texte in der
ETABLIERTEN aban-Stimme (persönlich, anti-hype, du-Form, Hook → Payoff → ehrlicher CTA,
Hashtags #KI #DACH #Newsletter #abannews) → social/aban-content-queue.csv.
NICHT mit dem Autopost verdrahtet — reine Vorlagen-Sammlung.  Reine stdlib.

  python3 automation/gen_social_content.py            # CSV schreiben
  python3 automation/gen_social_content.py --queue    # zusätzlich kuratierte Auswahl in social/linkedin_queue.json
"""
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
HASH = "#KI #DACH #Newsletter #abannews"


def glossar_posts():
    from generate_ki_glossar import TERMS
    out = []
    for term, defi, klar, hype in TERMS:
        t = (f"„{term}“ — das Wort fällt ständig. Kurz und ehrlich, was es WIRKLICH heißt:\n\n"
             f"{defi}\n\nKlartext: {klar}")
        if hype:
            t += f"\n\n⚠️ {hype}"
        t += f"\n\nMehr Begriffe ohne Hype erklärt → {{link}}\n\n{HASH}"
        out.append(("Glossar", t, "https://abannews.com/ki-glossar.html"))
    return out


def load_tools():
    d = json.load(open(os.path.join(ROOT, "data", "tools.json"), encoding="utf-8"))
    return d.get("tools") or [v for v in d.values() if isinstance(v, list)][0]


def tool_posts(tools):
    out = []
    for t in sorted(tools, key=lambda x: x.get("worth_it_score", 0), reverse=True):
        if not t.get("aban_note"):
            continue
        txt = (f"Tool-Check: {t['name']}. Mein ehrliches Urteil — {t.get('worth_it_score','?')}/10:\n\n"
               f"{t['aban_note']}\n\nKein Affiliate-Link, keine PR. 175 Tools so bewertet → {{link}}\n\n{HASH}")
        out.append(("Tool-Tipp", txt, "https://abannews.com/welche-ki-fuer-was.html"))
    return out


def compare_posts(tools):
    by = {t["id"]: t for t in tools}
    seen = set()
    for t in tools:
        for alt in (t.get("alternatives") or []):
            if alt in by:
                a, b = sorted([t["id"], alt])
                seen.add((a, b))
    pairs = [(a, b) for (a, b) in seen if by[a].get("worth_it_score") and by[b].get("worth_it_score")]
    pairs.sort(key=lambda p: by[p[0]]["worth_it_score"] + by[p[1]]["worth_it_score"], reverse=True)
    out = []
    for a, b in pairs:
        A, B = by[a], by[b]
        sa, sb = A["worth_it_score"], B["worth_it_score"]
        win = A if sa >= sb else B
        txt = (f"{A['name']} oder {B['name']}? Die ehrliche Kurzfassung:\n\n"
               f"Worth-it: {A['name']} {sa}/10 · {B['name']} {sb}/10.\n"
               f"Fürs Gros: {win['name']}. Aber ehrlich — es kommt auf deinen Use Case an.\n\n"
               f"Voller Vergleich (Preis, DSGVO, Urteil) → {{link}}\n\n{HASH}")
        out.append(("Vergleich", txt, f"https://abannews.com/vergleich/{a}-vs-{b}.html"))
    return out


def prompt_posts():
    f = os.path.join(ROOT, "prompts-bibliothek", "data", "prompts.json")
    d = json.load(open(f, encoding="utf-8"))
    items = d if isinstance(d, list) else (d.get("prompts") or [v for v in d.values() if isinstance(v, list)][0])
    out = []
    for p in items:
        txt = (f"Ein Prompt, der wirklich funktioniert — {p.get('titel','')}:\n\n"
               f"{p.get('prompt_text','')[:340]}\n\n"
               f"Tipp aus der Praxis: {p.get('tipp','Pass die Platzhalter an, statt raten zu lassen.')}\n\n"
               f"Mehr davon → {{link}}\n\n{HASH}")
        out.append(("Prompt", txt, "https://abannews.com/prompt-baukasten.html"))
    return out


def all_rows():
    tools = load_tools()
    rows = []
    rows += glossar_posts()
    rows += tool_posts(tools)
    rows += compare_posts(tools)
    rows += prompt_posts()
    return [(typ, text.replace("{link}", link), link) for typ, text, link in rows]


def write_csv(rows):
    out = os.path.join(ROOT, "social", "aban-content-queue.csv")
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["typ", "text", "link", "status"])
        for typ, text, link in rows:
            w.writerow([typ, text, link, "entwurf"])
    print(f"✓ {len(rows)} Post-Vorlagen → social/aban-content-queue.csv")


def update_queue(rows):
    """Kuratierte Auswahl in social/linkedin_queue.json anhängen — status ready, postet 1/Tag
    NACH den bestehenden Einträgen. Idempotent über id-Präfix 'aban-auto-'."""
    qf = os.path.join(ROOT, "social", "linkedin_queue.json")
    q = json.load(open(qf, encoding="utf-8"))
    q = [it for it in q if not str(it.get("id", "")).startswith("aban-auto-")]
    per = {"Glossar": 8, "Tool-Tipp": 8, "Vergleich": 8, "Prompt": 4}
    picked, cnt = [], {}
    for typ, text, link in rows:
        if cnt.get(typ, 0) < per.get(typ, 0):
            picked.append(text); cnt[typ] = cnt.get(typ, 0) + 1
    for i, text in enumerate(picked, 1):
        q.append({"id": f"aban-auto-{i:03d}", "status": "ready", "text": text})
    json.dump(q, open(qf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✓ {len(picked)} kuratierte Posts → linkedin_queue.json ({len(q)} gesamt, postet 1/Tag)")


def main():
    rows = all_rows()
    write_csv(rows)
    if "--queue" in sys.argv:
        update_queue(rows)


if __name__ == "__main__":
    main()
