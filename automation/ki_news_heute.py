#!/usr/bin/env python3
"""KI-News heute — schreibt data/ki-news.json fuer den Block auf der Startseite.

Holt die Feeds aus automation/news_aggregator.py (dieselben Quellen, derselbe KI-Filter) und
waehlt die neuesten Meldungen aus. ERFINDET NICHTS und schreibt nichts um: Titel und Anriss
stehen so da, wie die Quelle sie veroeffentlicht; jeder Eintrag verlinkt auf das Original.

Auswahl: nur Meldungen der letzten 72 Stunden, neueste zuerst, hoechstens 2 pro Quelle
(sonst fuellt ein fleissiger Feed den ganzen Block), insgesamt hoechstens 10.

No-op-sicher: kommen weniger als 3 Meldungen zusammen (Netz weg, Feeds kaputt), bleibt die
alte Datei stehen. Die Startseite zeigt dann ehrlich das alte Datum statt „heute".

    python3 automation/ki_news_heute.py            # schreibt data/ki-news.json
    python3 automation/ki_news_heute.py --dry      # nur anzeigen
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from news_aggregator import FEEDS, fetch, parse  # noqa: E402

OUT = HERE.parent / "data" / "ki-news.json"
DEUTSCH = {"heise", "Golem", "t3n", "netzpolitik.org", "BSI"}
FENSTER_H = 72
PRO_QUELLE = 2
MAX = 10
MIN = 3


def zeit(pub: str) -> datetime | None:
    """RSS (RFC 822) oder Atom (ISO 8601) -> UTC. Unlesbar -> None (dann faellt der Eintrag raus)."""
    if not pub:
        return None
    try:
        d = parsedate_to_datetime(pub)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc)


def sammeln(jetzt: datetime) -> tuple[list[dict], list[str], list[str]]:
    items, ok, fehlt = [], [], []
    for quelle, url in FEEDS.items():
        try:
            geholt = parse(fetch(url), quelle, 8)
        except Exception as ex:  # ein kaputter Feed darf den Rest nicht stoppen
            fehlt.append(quelle)
            sys.stderr.write(f"  {quelle}: nicht erreichbar ({ex})\n")
            continue
        ok.append(quelle)
        for it in geholt:
            d = zeit(it["pub"])
            if not d or d > jetzt + timedelta(hours=2) or jetzt - d > timedelta(hours=FENSTER_H):
                continue
            items.append({**it, "_d": d})
    return items, ok, fehlt


def auswaehlen(items: list[dict]) -> list[dict]:
    items.sort(key=lambda x: x["_d"], reverse=True)
    gesehen, pro, aus = set(), {}, []
    for it in items:
        schluessel = re.sub(r"\W+", "", it["title"].lower())[:60]
        if not schluessel or schluessel in gesehen or pro.get(it["source"], 0) >= PRO_QUELLE:
            continue
        if not it["link"].startswith("https://"):
            continue
        gesehen.add(schluessel)
        pro[it["source"]] = pro.get(it["source"], 0) + 1
        aus.append({
            "t": it["title"],
            "u": it["link"],
            "q": it["source"],
            "d": it["_d"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "s": it["desc"],
            "sprache": "de" if it["source"] in DEUTSCH else "en",
        })
        if len(aus) >= MAX:
            break
    return aus


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()
    jetzt = datetime.now(timezone.utc)
    roh, ok, fehlt = sammeln(jetzt)
    auswahl = auswaehlen(roh)
    print(f"{len(roh)} Meldungen der letzten {FENSTER_H} h aus {len(ok)} Quellen, {len(auswahl)} ausgewaehlt"
          + (f" · nicht erreichbar: {', '.join(fehlt)}" if fehlt else ""))
    for it in auswahl:
        print(f"  {it['d'][:16]}  {it['q']:<16} {it['t'][:80]}")
    if args.dry:
        return 0
    if len(auswahl) < MIN:
        print(f"Nur {len(auswahl)} Meldungen — data/ki-news.json bleibt unveraendert.")
        return 0
    daten = {"stand": jetzt.strftime("%Y-%m-%dT%H:%M:%SZ"), "quellen": ok, "nicht_erreichbar": fehlt,
             "fenster_h": FENSTER_H, "items": auswahl}
    OUT.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"→ {OUT.relative_to(HERE.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
