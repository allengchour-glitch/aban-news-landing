#!/usr/bin/env python3
"""Misst für das KI-Büro, was ohne Anmeldung lesbar ist: Läufe der GitHub-Workflows, Dateien auf main, das Release des Cockpit-Pakets.
Gibt alles kompakt aus (einige Dutzend Zeilen statt vieler Rohantworten). Nur lesen, nichts wird geändert.

Aufruf: python3 -I tools/buero/messen.py [Ausgabe.json]
Die Zeiten stehen in UTC (ISO) und in Schweizer Zeit. Kennt die Umgebung GITHUB_TOKEN, wird er benutzt (höheres Limit), sonst läuft es anonym
(60 Anfragen je Stunde und Adresse; das Skript braucht rund 13). Ein Fehler wird als Zeile «FEHLER ...» ausgegeben, das Skript bricht nicht ab.
Was hiermit NICHT gemessen wird: Bestellungen (Shopify), geplante Aufgaben und Claude-Sitzungen (Plattform-Werkzeuge), Metricool (Planer).
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

REPO = "allengchour-glitch/aban-news-landing"
API = f"https://api.github.com/repos/{REPO}"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/"
CH = ZoneInfo("Europe/Zurich")

WORKFLOWS = [
    "auswahl-lauf.yml", "gmc-schaufenster.yml", "lager-waechter.yml", "shop-autopilot.yml", "fortura-bestand.yml",
    "printful-tracking.yml", "tages-update.yml", "krypto-paket.yml", "social-comment-moderate.yml", "social-comment-reply.yml",
]
DATEIEN = ["data/krypto-scalping-labor.json", "data/krypto-satellit-schatten.json"]
FREIGABEN = ["dropship/FORTURA-BESTAND-FREI.txt", "dropship/LAGER-WAECHTER-FREI.txt", "dropship/GMC-SCHAUFENSTER-TAEGLICH-FREI.txt"]


def holen(url):
    """(Statuscode, Text). Bei Netzfehlern (0, Fehlertext)."""
    kopf = {"User-Agent": "ki-buero-messen", "Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN") and "api.github.com" in url:
        kopf["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=kopf), timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001 - jede Störung wird nur gemeldet
        return 0, str(e)[:120]


def ch(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(CH).strftime("%d.%m. %H:%M")


def main():
    aus = {"gemessen_iso": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "workflows": {}, "dateien": {}, "freigaben": {}, "release": None}
    print("Messung", aus["gemessen_iso"], "UTC")
    for wf in WORKFLOWS:
        code, text = holen(f"{API}/actions/workflows/{wf}/runs?per_page=3")
        if code != 200:
            print(f"FEHLER {wf}: HTTP {code} {text}")
            aus["workflows"][wf] = {"fehler": code}
            continue
        d = json.loads(text)
        laeufe = [{"start_iso": r["run_started_at"] or r["created_at"], "event": r["event"], "ergebnis": r["conclusion"] or r["status"]} for r in d["workflow_runs"]]
        aus["workflows"][wf] = {"gesamt": d["total_count"], "laeufe": laeufe}
        zeilen = " | ".join(f"{ch(x['start_iso'])} {x['event']} {x['ergebnis']}" for x in laeufe) or "keine Läufe"
        print(f"{wf:30} gesamt {d['total_count']:>3} | {zeilen}")
    code, text = holen(f"{API}/releases/tags/krypto-latest")
    if code == 200:
        d = json.loads(text)
        aus["release"] = {"veroeffentlicht_iso": d["published_at"], "name": d["name"], "text_anfang": (d.get("body") or "")[:200]}
        print(f"Release krypto-latest: {ch(d['published_at'])} | {d['name']} | {(d.get('body') or '')[:110]!r}")
    else:
        print(f"FEHLER Release krypto-latest: HTTP {code} {text}")
    for pfad in DATEIEN:
        code, text = holen(RAW + pfad)
        if code != 200:
            print(f"FEHLER {pfad}: HTTP {code} {text}")
            continue
        d = json.loads(text)
        feld = {k: d[k] for k in ("letzter_lauf", "letzter_stand", "stand", "zuletzt") if k in d}
        aus["dateien"][pfad] = feld
        print(f"{pfad}: {json.dumps(feld, ensure_ascii=False)[:160]}")
    for pfad in FREIGABEN:
        code, _ = holen(RAW + pfad)
        aus["freigaben"][pfad] = {200: "da", 404: "fehlt"}.get(code, f"unklar ({code})")
        print(f"Freigabe {pfad}: {aus['freigaben'][pfad]}")
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8") as f:
            json.dump(aus, f, ensure_ascii=False, indent=1)
        print("geschrieben:", sys.argv[1])


if __name__ == "__main__":
    main()
