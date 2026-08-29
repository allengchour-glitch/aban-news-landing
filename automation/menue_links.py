#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""menue_links.py — prüft die HAUPTNAVIGATION gegen den Live-Bestand.

WARUM EIGENS: `tote_kollektionslinks.py` prüft Links in Seiten und Artikeln. Das Menü prüft
es NICHT — dabei ist es die Navigation, die jede Besucherin benutzt. Am 21.08.2026 wurden
20 Kollektionen zurückgezogen; wäre eine davon im Menü verlinkt gewesen, stünde dort seither
ein 404 an der prominentesten Stelle des Shops, und niemand hätte es gemerkt.

GEPRÜFT WIRD, WAS DIE KUNDIN ERLEBT — drei Dinge, denn jedes einzeln reicht nicht:
  1. Existiert die Kollektion überhaupt?
  2. Ist sie im **Online Store** veröffentlicht? (Die dokumentierte Publish-Falle: Eine
     Kollektion kann mit Hunderten Produkten existieren und trotzdem 404 liefern, weil sie
     nie publiziert wurde.)
  3. Führt sie kaufbare Ware? Eine leere Kategorie ist kein 404, aber eine Sackgasse.

⚠️ `publishedOnCurrentPublication` ist mit unserem Token NICHT lesbar («Your app doesn't have
a publication for this shop»). Der erste Entwurf lief damit auf eine leere Antwort und hätte
ALLE 79 Menü-Kollektionen als «existiert nicht» gemeldet — ein Vollalarm aus einer
gescheiterten Abfrage. Gelesen wird deshalb `resourcePublications`, und eine fehlgeschlagene
Abfrage führt zu PAUSE, nie zu einem Befund.

Meldet nur, ändert nichts: Ob ein Menüpunkt entfernt oder die Kollektion gefüllt wird, ist
eine Entscheidung über die Navigation.
"""
import json, os, subprocess, time
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shop_kanal import im_onlineshop

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
BERICHT = "dropship/MENUE-TOTE-LINKS.md"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors") and "THROTTL" not in json.dumps(d["errors"]).upper():
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:180], flush=True)
                return None
        except Exception:
            pass
        time.sleep(2 ** i)
    return None


def menue_links():
    d = gql('{ menus(first:5){ nodes{ handle items{ title url items{ title url '
            'items{ title url } } } } } }')
    if d is None:
        return None
    raus = []

    def sammel(items, pfad=""):
        for x in items:
            raus.append((pfad + x["title"], x.get("url") or ""))
            sammel(x.get("items") or [], pfad + x["title"] + " › ")

    for m in d["data"]["menus"]["nodes"]:
        if m["handle"] == "main-menu":
            sammel(m["items"])
    return raus


def main():
    links = menue_links()
    if links is None:
        print("PAUSE (Menue nicht lesbar — kein Befund ableitbar)")
        return
    import re
    handles = []
    for _t, u in links:
        mo = re.search(r"/collections/([^/?#]+)", u)
        if mo and mo.group(1) not in handles and mo.group(1) != "all":
            handles.append(mo.group(1))
    print(f"Hauptmenue: {len(links)} Eintraege, {len(handles)} Kollektionen", flush=True)

    befund = []
    for i in range(0, len(handles), 20):
        teil = handles[i:i + 20]
        felder = " ".join(
            f'k{j}: collectionByHandle(handle:"{h}"){{ handle productsCount{{count}} '
            f'resourcePublications(first:10){{ nodes{{ isPublished publication{{ name }} }} }} }}'
            for j, h in enumerate(teil))
        d = gql("{ " + felder + " }")
        if d is None:
            print("PAUSE (Abfrage fehlgeschlagen — Rest ungeprueft, kein Befund)")
            return
        for j, h in enumerate(teil):
            c = (d["data"] or {}).get(f"k{j}")
            if not c:
                befund.append((h, "existiert nicht")); continue
            pubs = {n["publication"]["name"]: n["isPublished"]
                    for n in c["resourcePublications"]["nodes"]}
            if not im_onlineshop(pubs):
                befund.append((h, "nicht im Online Store veroeffentlicht -> 404"))
            elif c["productsCount"]["count"] == 0:
                befund.append((h, "veroeffentlicht, aber LEER"))
        time.sleep(0.6)

    if befund:
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write("# Tote oder leere Links in der Hauptnavigation\n\n")
            f.write("Das Menü ist die Navigation, die jede Besucherin benutzt. Diese "
                    "Einträge führen ins Leere oder in eine leere Kategorie.\n\n")
            for h, w in befund:
                f.write(f"- `/collections/{h}` — {w}\n")
        print(f"⚠️ {len(befund)} Menuelinks mit Befund -> {BERICHT}")
        for h, w in befund:
            print(f"   /collections/{h}: {w}")
    else:
        # Kein Befund -> alten Bericht wegraeumen, sonst listet er auf ewig Erledigtes.
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
            print(f"  Bericht {BERICHT} entfernt (kein Befund mehr)")
        print("  Alle Menuelinks fuehren auf veroeffentlichte, gefuellte Kollektionen.")
    # FERTIG haengt an «nichts zu TUN» — Gemeldetes ist ein Rueckstand, keine offene Arbeit.
    print("FERTIG")


main()
