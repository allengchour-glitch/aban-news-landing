#!/usr/bin/env python3
"""Erzeugt RELEASE-PLAN.md + schedule.csv: 1 Video alle 2 Tage.
Aufruf aus video-prototypes/:  python3 scripts/make_schedule.py [START=YYYY-MM-DD]"""
import json, csv, datetime, sys

START = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date(2026, 6, 4)
STEP = 2
WD = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
HASH = "#gehirnhacks #psychologie #produktivität #mindset #selbstoptimierung #reels #shorts"

sc = json.load(open('scripts.json'))
rows = []
for i, s in enumerate(sc):
    d = START + datetime.timedelta(days=STEP * i)
    rows.append(dict(n=i + 1, date=d.isoformat(), wd=WD[d.weekday()], key=s['key'],
                     title=s['title'], file=f"output/clipfilm_{s['key']}.mp4",
                     hook=s['vo'].split('.')[0].strip() + '.'))

with open('RELEASE-PLAN.md', 'w') as f:
    f.write("# Veröffentlichungs-Plan — GEHIRN-HACKS\n\n")
    f.write("**Rhythmus:** 1 Video alle 2 Tage · **Start:** %s · **Uhrzeit-Empfehlung:** 18:00\n\n" % START.isoformat())
    f.write("15 Clips → %s bis %s.\n\n" % (rows[0]['date'], rows[-1]['date']))
    f.write("| # | Datum | Wochentag | Szene | Titel | Datei |\n|---|---|---|---|---|---|\n")
    for r in rows:
        f.write("| %d | %s | %s | %s | %s | `%s` |\n" % (r['n'], r['date'], r['wd'], r['key'], r['title'], r['file']))
    f.write("\n## Hinweis zum automatischen Posten\n\n")
    f.write("Diese Datei ist der Redaktionsplan. Für **automatisches Veröffentlichen** alle 2 Tage:\n\n")
    f.write("1. **Scheduler-Import (empfohlen, kein Code):** `schedule.csv` in Buffer / Later / Metricool / Meta Business Suite importieren.\n")
    f.write("2. **Vollautomatisch via API:** benötigt verbundenen Plattform-Account (Instagram Graph / TikTok Content Posting / YouTube Data API) mit Token.\n")

with open('schedule.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['date', 'time', 'scene', 'title', 'file', 'caption', 'hashtags'])
    for r in rows:
        w.writerow([r['date'], '18:00', r['key'], r['title'], r['file'], f"{r['title']} — {r['hook']}", HASH])

print("geschrieben: RELEASE-PLAN.md, schedule.csv (%s … %s)" % (rows[0]['date'], rows[-1]['date']))
