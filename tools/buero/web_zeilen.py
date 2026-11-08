#!/usr/bin/env python3
"""Holt die Zeilen der öffentlichen Webansicht des KI-Büros (https://abannews.com/ki-buero) und schreibt sie als JSON-Liste.

Wozu: Die Berichte des Entwickler- und des YouTube-Studios entstehen nur in der Cloud (GitHub-Läufe) und lassen sich dort nicht ohne Anmeldung herunterladen.
Die Webansicht trägt dieselben Zeilen mit dem Stand der letzten Cloud-Messung; make_buero.py --web-zeilen übernimmt daraus nur die Zeilen des Entwickler- und des YouTube-Studios.
Aufruf: python3 -I tools/buero/web_zeilen.py <web_zeilen.json> [Quelle]; Quelle ist eine Adresse oder eine lokale HTML-Datei (Vorgabe: die öffentliche Seite).
Nur lesen. Bricht mit Exit 2 ab, wenn die Zeilen nicht gefunden werden (Seitenaufbau geändert): dann bleibt der Stand der Zeilen, wie make_buero.py ihn setzt.
"""
import json
import sys
import urllib.request

URL = "https://abannews.com/ki-buero"


def lesen(quelle):
    if quelle.startswith("https://"):
        kopf = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) ki-buero-web-zeilen"}
        with urllib.request.urlopen(urllib.request.Request(quelle, headers=kopf), timeout=40) as r:
            return r.read().decode("utf-8", "replace")
    with open(quelle, encoding="utf-8") as f:
        return f.read()


def zeilen(html):
    i = html.find('"id": "auswahl"')
    if i < 0:
        i = html.find('"id":"auswahl"')
    if i < 0:
        raise ValueError("Zeilen nicht gefunden")
    j = html.rfind("[", 0, i)
    liste, _ = json.JSONDecoder().raw_decode(html[j:])
    if not isinstance(liste, list) or not liste or not all(isinstance(z, dict) and "id" in z and "status" in z for z in liste):
        raise ValueError("Zeilen haben eine unbekannte Form")
    return liste


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    try:
        liste = zeilen(lesen(sys.argv[2] if len(sys.argv) > 2 else URL))
    except (OSError, ValueError) as e:
        print("FEHLER Web-Zeilen:", type(e).__name__, str(e)[:120])
        return 2
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(liste, f, ensure_ascii=False, indent=1)
    print("Web-Zeilen:", len(liste), "|", ", ".join(z["id"] for z in liste))
    return 0


if __name__ == "__main__":
    sys.exit(main())
