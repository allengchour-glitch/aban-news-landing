#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Zählt im Traumhaus, was „KI-generiert" aussehen lässt — Vorher/Nachher in Zahlen.

    python3 spiele-dev/tools/th-handschrift.py

⚠️ WOZU. User 2026-09-05: „mach das Spiel cooler und nicht so KI generiert." Zwei
   unabhängige Gutachten (reports/design/spiel-review-*.md) nennen dieselben Muster:
   ein eigener Farbverlauf je Knopf (keine Palette), Betriebssystem-Emoji als Ikonen,
   Hinweise im Ausrufezeichen-Ton, acht Pastell-Fassaden im Zyklus, doppelte Vignette.
   Dieses Werkzeug zählt genau das, damit jede Änderung eine Zahl hat.
"""
import re, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "traumhaus.html")
h = open(p, encoding="utf-8").read()
EMO = re.compile(r'[\U0001F300-\U0001FAFF☀-➿]')
css = h[h.find("<style>"):h.find("</style>")]
btn_inline = re.findall(r'<button[^>]*style="[^"]*linear-gradient\(([^)]*)\)', h)
css_grad = re.findall(r'linear-gradient\(([^)]*)\)', css)
buttons = re.findall(r'<button[^>]*>(.*?)</button>', h, re.S)
hints = re.findall(r'hint\(\s*"((?:[^"\\]|\\.){0,160})"', h)
print(f"{'Muster':44} {'Wert':>6}")
print(f"{'Farbverläufe auf Knöpfen (inline)':44} {len(btn_inline):>6}   verschieden: {len(set(btn_inline))}")
print(f"{'Farbverläufe im HUD-CSS':44} {len(css_grad):>6}")
print(f"{'Knöpfe mit Emoji':44} {sum(1 for b in buttons if EMO.search(b)):>6}   von {len(buttons)}")
emo_hints = sum(1 for t in hints if EMO.match(t.lstrip()) or t.startswith(chr(92)+"u"))
print(f"{'hint()-Texte, die mit Emoji beginnen':44} {emo_hints:>6}   von {len(hints)}")
print(f"{'hint()-Texte mit Ausrufezeichen':44} {sum(1 for t in hints if '!' in t):>6}")
wandf = re.search(r'WANDF=\[([^\]]*)\]', h)
print(f"{'Fassadenfarben (WANDF)':44} {len(wandf.group(1).split(',')) if wandf else 0:>6}")
vign = len(re.findall(r'id="vign"', h)) + len(re.findall(r'var _vig=', h))
print(f"{'Vignetten-Schichten':44} {vign:>6}")
stdmat = len(re.findall(r'stdMat\(', h))
print(f"{'stdMat()-Aufrufe (ein Material für alles)':44} {stdmat:>6}")

# ── Die Kopfzeile: was dauerhaft auf dem Bild steht ──────────────────────────
#   Nicht die Overlays (dort ist ein Emoji Inhalt, z. B. die Erfolgsliste), sondern
#   die Anzeigen, die IMMER sichtbar sind: Geld, Uhr, Wohnstufe, Familie/Fertig-
#   keiten, Tacho, Stick-Knopf. Sie trugen Betriebssystem-Emoji — auf iOS, Android
#   und im Emulator drei verschiedene Bilder, farbig gegen die eine Palette.
def _block(name):
    i = h.find("function " + name + "(")
    if i < 0: return ""
    tiefe, j, start = 0, h.index("{", i), None
    for k in range(j, min(j + 8000, len(h))):
        if h[k] == "{":
            tiefe += 1
            if start is None: start = k
        elif h[k] == "}":
            tiefe -= 1
            if tiefe == 0: return h[i:k]
    return h[i:i + 4000]
kopf = _block("updHUD") + _block("stufeHudUpd")
for zeile in h.split("\n"):
    if 'id="speedo"' in zeile or 'id="geld"' in zeile or 'id="uhr"' in zeile or "joyKnob" in zeile:
        kopf += zeile
kopf = re.sub(r"/\*.*?\*/", "", kopf, flags=re.S)   # Kommentare sieht niemand
print(f"{'Emoji in der Kopfzeile (immer sichtbar)':44} {len(EMO.findall(kopf)):>6}")
print(f"{'Strich-Ikonen im Sprite':44} {h.count(chr(60) + chr(115) + chr(121) + chr(109) + chr(98) + chr(111) + chr(108) + chr(32)):>6}")
