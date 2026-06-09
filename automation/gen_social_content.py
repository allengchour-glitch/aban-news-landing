#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Social-Content-Queue aus vorhandenen Inhalten generieren.

Baut fertige, anti-hype Post-Texte (LinkedIn/Instagram/Threads) aus Glossar,
Tool-Vergleichen, Tool-Tipps und Prompts → social/aban-content-queue.csv.
NICHT mit dem Autopost verdrahtet — reine Vorlagen-Sammlung zum Reviewen/Posten.
Reine stdlib.  Run: python3 automation/gen_social_content.py
"""
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

HASH = "#KI #KünstlicheIntelligenz #DACH #abannews"


def glossar_posts():
    from generate_ki_glossar import TERMS  # importierbar (Write ist geguardet)
    out = []
    for term, defi, klar, hype in TERMS:
        t = f"🧠 KI-Begriff erklärt: {term}\n\n{defi}\n\nKlartext: {klar}"
        if hype:
            t += f"\n\n⚠️ {hype}"
        out.append(("Glossar", t, "https://abannews.com/ki-glossar.html", HASH + " #KIerklärt"))
    return out


def load_tools():
    d = json.load(open(os.path.join(ROOT, "data", "tools.json"), encoding="utf-8"))
    return d.get("tools") or [v for v in d.values() if isinstance(v, list)][0]


def tool_posts(tools):
    out = []
    for t in sorted(tools, key=lambda x: x.get("worth_it_score", 0), reverse=True)[:14]:
        if not t.get("aban_note"):
            continue
        txt = (f"🛠️ Tool-Tipp: {t['name']} ({t.get('vendor','')}) — Worth-it {t.get('worth_it_score','?')}/10\n\n"
               f"{t['aban_note']}\n\nEhrlich getestet, kein Affiliate-Hype.")
        out.append(("Tool-Tipp", txt, "https://abannews.com/welche-ki-fuer-was.html", HASH + " #KITools"))
    return out


def compare_posts(tools):
    by = {t["id"]: t for t in tools}
    seen, out = set(), []
    for t in tools:
        for alt in (t.get("alternatives") or []):
            if alt in by:
                a, b = sorted([t["id"], alt])
                if (a, b) in seen:
                    continue
                seen.add((a, b))
    pairs = [(a, b) for (a, b) in seen if by[a].get("worth_it_score") and by[b].get("worth_it_score")]
    pairs.sort(key=lambda p: by[p[0]]["worth_it_score"] + by[p[1]]["worth_it_score"], reverse=True)
    for a, b in pairs[:14]:
        A, B = by[a], by[b]
        sa, sb = A["worth_it_score"], B["worth_it_score"]
        win = A if sa >= sb else B
        txt = (f"⚔️ {A['name']} vs {B['name']} — ehrlich verglichen.\n\n"
               f"Worth-it: {A['name']} {sa}/10 · {B['name']} {sb}/10.\n"
               f"Fürs Gros: {win['name']}. Aber es kommt auf deinen Anwendungsfall an.")
        out.append(("Vergleich", txt, f"https://abannews.com/vergleich/{a}-vs-{b}.html", HASH + " #KITools"))
    return out


def prompt_posts():
    f = os.path.join(ROOT, "prompts-bibliothek", "data", "prompts.json")
    d = json.load(open(f, encoding="utf-8"))
    items = d if isinstance(d, list) else (d.get("prompts") or [v for v in d.values() if isinstance(v, list)][0])
    out = []
    for p in items[:8]:
        txt = (f"💡 Prompt zum Kopieren: {p.get('titel','')}\n\n"
               f"„{p.get('prompt_text','')[:400]}\"\n\n"
               f"Tipp: {p.get('tipp','Passe die Platzhalter an.')}")
        out.append(("Prompt", txt, "https://abannews.com/prompt-baukasten.html", HASH + " #Prompt #Promptengineering"))
    return out


def main():
    tools = load_tools()
    rows = []
    rows += glossar_posts()
    rows += tool_posts(tools)
    rows += compare_posts(tools)
    rows += prompt_posts()
    out = os.path.join(ROOT, "social", "aban-content-queue.csv")
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["typ", "text", "link", "hashtags", "status"])
        for typ, text, link, tags in rows:
            w.writerow([typ, text, link, tags, "entwurf"])
    print(f"✓ {len(rows)} Post-Vorlagen → social/aban-content-queue.csv (Status: entwurf, NICHT auto-gepostet)")


if __name__ == "__main__":
    main()
