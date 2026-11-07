#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — LinkedIn-Queue als Import-Datei für Buffer/Publer & Co. exportieren.

Liest social/linkedin_queue.json (alle noch nicht geposteten Einträge) und schreibt:
  social/linkedin_page_export.csv   — Spalten Date, Time, Content (Publer/SocialBee-tauglich)
  social/linkedin_page_posts.txt    — Klartext, Posts durch Trennlinie getrennt (manuell/Buffer)

Terminplan: 1 Post je Werktag (Mo–Fr) ab morgen, 09:00. Reine stdlib.
Aufruf: python3 automation/export_page_queue.py [HH:MM]
"""
import csv
import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "social", "linkedin_queue.json")
CSV_OUT = os.path.join(ROOT, "social", "linkedin_page_export.csv")
TXT_OUT = os.path.join(ROOT, "social", "linkedin_page_posts.txt")


def weekdays_from(start, n):
    """Liefert n Werktags-Daten (Mo–Fr) ab start (inkl.)."""
    out, d = [], start
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d += dt.timedelta(days=1)
    return out


def main():
    time_str = sys.argv[1] if len(sys.argv) > 1 else "09:00"
    q = json.load(open(QUEUE, encoding="utf-8"))
    posts = [it["text"] for it in q if it.get("status") != "posted" and it.get("text")]
    start = dt.date.today() + dt.timedelta(days=1)
    dates = weekdays_from(start, len(posts))

    with open(CSV_OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Date", "Time", "Content"])
        for d, text in zip(dates, posts):
            w.writerow([d.isoformat(), time_str, text])

    with open(TXT_OUT, "w", encoding="utf-8") as f:
        for i, text in enumerate(posts, 1):
            f.write(f"--- Post {i} ---\n{text}\n\n")

    print(f"✓ {len(posts)} Posts exportiert")
    print(f"  • {CSV_OUT}  (Date/Time/Content — Import in Publer/SocialBee)")
    print(f"  • {TXT_OUT}  (Klartext — manuell / Buffer-Queue)")
    print(f"  Plan: {dates[0]} bis {dates[-1]}, je Werktag {time_str}")


if __name__ == "__main__":
    main()
