#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bild_kontaktbogen_liste.py — Kontaktbogen aus einer LISTE, nicht aus einer Kollektion.

WOFÜR: `bild_kontaktbogen.py` kann nur die Hauptbilder einer bestehenden Kollektion
abbilden. Genau deshalb wurde die Bildprüfung bei der Hype-Reihe nie bei der AUFNAHME
gemacht, sondern immer erst danach — und am 15.08.2026 standen vier Produkte mit
Schaufensterpuppe, chinesischem Wasserzeichen und englischer Infografik drei Tage lang
auf der Startseite, weil sie nach Zahlen tadellos aussahen.

Dieses Werkzeug nimmt beliebige Bild-URLs entgegen: Kandidaten VOR der Aufnahme, oder
alle Bilder eines Produkts, um das beste nach vorn zu holen (`productReorderMedia`).

Nutzung:  python3 automation/bild_kontaktbogen_liste.py <liste.json> [name]
          liste.json = [{"url": "...", "titel": "...", "id": "..."}, …]
Ergebnis: /tmp/kontaktbogen_<name>.png  +  gleichnamiges .json mit der Nummerierung.
Danach mit dem Read-Werkzeug ANSEHEN — das ist der ganze Sinn.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

PROXY = os.environ.get('HTTPS_PROXY', '')
daten = json.load(open(sys.argv[1]))
name = sys.argv[2] if len(sys.argv) > 2 else 'kandidaten'
os.makedirs('/tmp/kbogen', exist_ok=True)

gut = []
for i, n in enumerate(daten):
    if not n.get('url'):
        continue
    f = f'/tmp/kbogen/{name}_{i}.jpg'
    if not os.path.exists(f):
        subprocess.run(['curl', '-sS', '--max-time', '25', '-x', PROXY, '-o', f,
                        n['url'] + '&width=400'], capture_output=True)
    try:
        gut.append((Image.open(f).convert('RGB'), n))
    except Exception:
        pass
if not gut:
    print("kein Bild ladbar"); sys.exit(2)

S, PAD, Z = 300, 22, 6
reihen = (len(gut) + Z - 1) // Z
blatt = Image.new('RGB', (Z * S, reihen * (S + PAD)), 'white')
d = ImageDraw.Draw(blatt)
try:
    fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception:
    fnt = ImageFont.load_default()
for k, (im, n) in enumerate(gut):
    r_, c_ = divmod(k, Z)
    im.thumbnail((S, S))
    blatt.paste(im, (c_ * S + (S - im.width) // 2, r_ * (S + PAD) + (S - im.height) // 2))
    d.text((c_ * S + 4, r_ * (S + PAD) + S + 3), str(k + 1), fill='black', font=fnt)
out = f'/tmp/kontaktbogen_{name}.png'
blatt.save(out)
json.dump([{'nr': k + 1, 'titel': n.get('titel'), 'id': n.get('id'), 'pid': n.get('pid')}
           for k, (im, n) in enumerate(gut)],
          open(f'/tmp/kontaktbogen_{name}.json', 'w'), ensure_ascii=False, indent=1)
print(f"{len(gut)} Bilder → {out}")
