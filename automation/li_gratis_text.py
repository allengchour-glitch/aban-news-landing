#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""li_gratis_text.py — «Gratis-Versand ab CHF 50» gilt nur für die Schweiz (12.10.2026).

ANLASS. Liechtenstein ist seit 09.10. Lieferland, bekommt aber KEINEN Gratisversand (14,90 CHF, gemessen).
Im Bestand standen 3'704 aktive Produkte mit dem Fusszeilen-Satz «Gratis-Versand ab CHF 50» — für eine
Kundin in Vaduz ist das falsch. Der Satz bekommt die Ortsangabe: «Gratis-Versand in der Schweiz ab CHF 50».

REGEL. «Gratis-Versand ab CHF N» → «Gratis-Versand in der Schweiz ab CHF N». Schon ergänzte Stellen bleiben
unverändert (Lookbehind), der Lauf ist idempotent und darf jederzeit wiederholt werden.

  python3 automation/li_gratis_text.py          # Trockenlauf (Standard): zählt und zeigt Beispiele
  SCHARF=1 python3 automation/li_gratis_text.py # schreibt, liest jedes Produkt zurück, Ledger dropship/_li_gratis_text.tsv

Der Lauf liest jedes Produkt LIVE (nodes-Abfrage, 100 je Aufruf) und ersetzt nur im Live-Text — ein Export von
vor 36 Minuten wird NIE als Vorlage zum Schreiben benutzt (sonst überschreibt man Änderungen von heute).
Theme-Dateien (Fusszeile, Startseite, Warenkorb-Balken) sind NICHT Teil dieses Laufs: das aktive Theme wird
hier nicht geschrieben (Sicherheitsregel, siehe shopify-publizieren).
"""
import os, re, sys, time, json
from concurrent.futures import ThreadPoolExecutor
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from seo_autopilot import gql  # noqa: E402
import versand_band_wache as vbw  # Voll-Export (eigener Vorgang, nie fremde abbrechen)

LEDGER = os.path.join(REPO, "dropship", "_li_gratis_text.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
RE = re.compile(r"(?<!in der Schweiz )Gratis-Versand ab CHF (\d+)")
ERSETZ = r"Gratis-Versand in der Schweiz ab CHF \1"
WORKERS = int(os.environ.get("WORKERS", "4"))


def kandidaten(zeilen):
    """Vorauswahl aus dem Export: nur Produkte, deren Export-Text den Satz trägt."""
    out = []
    for o in zeilen:
        h = o.get("descriptionHtml") or ""
        if RE.search(h):
            out.append((o["id"], o.get("handle", "")))
    return out


def live_texte(ids):
    """Live-Text je Produkt-ID, 100 IDs je Abfrage."""
    q = "query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id handle descriptionHtml } } }"
    res = {}
    for i in range(0, len(ids), 100):
        d = gql(q, {"ids": ids[i:i + 100]})
        for n in d["nodes"] or []:
            if n and n.get("id"):
                res[n["id"]] = (n.get("handle", ""), n.get("descriptionHtml") or "")
    return res


def schreiben(pid, neu):
    """productUpdate mit Rücklesen. Gibt (ok, Grund) zurück."""
    d = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id descriptionHtml } userErrors{ field message } } }',
            {"i": {"id": pid, "descriptionHtml": neu}})["productUpdate"]
    if d["userErrors"]:
        return False, f"Shopify: {d['userErrors']}"
    zurueck = d["product"]["descriptionHtml"]
    if RE.search(zurueck) or "in der Schweiz ab CHF" not in zurueck:
        return False, "Rücklesen stimmt nicht"
    return True, "zurückgelesen"


def ledger(zeile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join(zeile) + "\n")


def main():
    zeilen = vbw.voll_export()
    print(f"Voll-Export: {len(zeilen)} aktive Produkte")
    kand = kandidaten(zeilen)
    print(f"Export-Vorauswahl (Satz «Gratis-Versand ab CHF N» ohne Ortsangabe): {len(kand)}")
    ids = [k[0] for k in kand]
    live = live_texte(ids)
    fund = []
    for pid, _ in kand:
        if pid not in live:
            continue
        handle, text = live[pid]
        if RE.search(text):
            fund.append((pid, handle, text, RE.sub(ERSETZ, text), len(RE.findall(text))))
    stellen = sum(f[4] for f in fund)
    print(f"Live bestätigt: {len(fund)} Produkte, {stellen} Stellen")
    for pid, handle, _, neu, n in fund[:3]:
        i = neu.find("Gratis-Versand in der Schweiz ab CHF")
        print(f"  Beispiel {handle}: …{re.sub(r'<[^>]+>', ' ', neu[max(0, i - 60):i + 60])}…")
    if not SCHARF:
        print("Trockenlauf — nichts geschrieben. SCHARF=1 zum Schreiben.")
        return 0
    ok = fehl = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        ergebnisse = list(ex.map(lambda f: (f, *schreiben(f[0], f[3])), fund))
    for (pid, handle, _, _, n), gut, grund in ergebnisse:
        ledger([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), handle, str(n), "ok" if gut else "fehler", grund])
        ok += gut
        fehl += not gut
    print(f"geschrieben: {ok} · Fehler: {fehl}")
    return 0 if fehl == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
