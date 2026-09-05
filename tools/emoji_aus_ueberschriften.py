#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Emoji aus H1/H2 entfernen — Überschriften sind Text, keine Icon-Leisten.

    python3 tools/emoji_aus_ueberschriften.py --probe    # zählen
    python3 tools/emoji_aus_ueberschriften.py            # anwenden (idempotent)

⚠️ WOZU. Drei unabhängige Design-Gutachten (2026-09-05) nennen dasselbe erste Muster für
   „sieht nach KI gemacht aus": ein Emoji vor fast jeder Überschrift — „🍟 Airfryer kaufen
   Schweiz", „🔥 Top-Angebote", „💡 Prompt zum Kopieren". Gemessen (tools/ki_look.py):
   112 H1 und 466 H2 auf 500 von 1132 Seiten. Redaktionelle Seiten setzen Überschriften
   ohne Piktogramm; das Emoji bleibt dort erlaubt, wo es Bedienelement ist (Buttons,
   Badges, Chips) — die werden hier nicht angefasst.

   Ausgenommen: die Spiele (eigene Oberflächen) und der Newsletter-Ausgabenbau.
   Nur Text direkt in <h1>/<h2>; innere Tags bleiben stehen. Ein Emoji, das das ganze
   Überschriften-Wort ist (Überschrift bestünde danach nur aus Leerraum), bleibt.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMO = re.compile(r'(?:[\U0001F300-\U0001FAFF☀-➿⭐⭕⌚-⏿⤴⤵〰〽㊗㊙]️?(?:‍[\U0001F300-\U0001FAFF☀-➿]️?)*[\U0001F3FB-\U0001F3FF]?)')
H = re.compile(r'(?is)(<h[12]\b[^>]*>)(.*?)(</h[12]\s*>)')
AUSNAHME = re.compile(r'^(neon-|wort|traumhaus|spiele|lebenspfad|klick-|arcade|tracker)')


def bereinigen(inner):
    # Nur Textknoten anfassen: Tags unverändert lassen.
    teile = re.split(r'(<[^>]+>)', inner)
    neu = []
    for t in teile:
        if t.startswith('<'):
            neu.append(t)
        else:
            t2 = EMO.sub('', t)
            t2 = re.sub(r'[ \t]{2,}', ' ', t2)
            neu.append(t2)
    out = ''.join(neu)
    # Führende Leerzeichen nach dem Emoji-Abzug entfernen, Text muss übrig bleiben
    if not re.sub(r'<[^>]+>', '', out).strip():
        return inner
    return re.sub(r'^\s+', '', out) if not inner.startswith(('\n', ' ')) else out.lstrip(' ')


def main():
    probe = "--probe" in sys.argv
    n_ueb = n_seiten = 0
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(p)
        if AUSNAHME.match(name):
            continue
        h = open(p, encoding="utf-8", errors="ignore").read()
        k = 0

        def ersatz(m):
            nonlocal k
            inner = m.group(2)
            if not EMO.search(re.sub(r'<[^>]+>', '', inner)):
                return m.group(0)
            neu = bereinigen(inner)
            if neu != inner:
                k += 1
            return m.group(1) + neu + m.group(3)
        neu = H.sub(ersatz, h)
        if k:
            n_ueb += k
            n_seiten += 1
            if not probe:
                open(p, "w", encoding="utf-8").write(neu)
    print(("🔍 " if probe else "✓ ") + f"{n_ueb} Überschriften auf {n_seiten} Seiten" + (" gefunden" if probe else " bereinigt"))


if __name__ == "__main__":
    main()
