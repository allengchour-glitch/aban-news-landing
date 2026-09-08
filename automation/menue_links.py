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
    offen = []          # (handle, id, productsCount) — Aktiv-Pruefung folgt
    for i in range(0, len(handles), 20):
        teil = handles[i:i + 20]
        felder = " ".join(
            f'k{j}: collectionByHandle(handle:"{h}"){{ id handle productsCount{{count}} '
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
            else:
                offen.append((h, c["id"].split("/")[-1], c["productsCount"]["count"]))
        time.sleep(0.6)

    # ⚠️ 29.08.2026 — ZWEITE Runde: hat die Kollektion ueberhaupt KAUFBARE Ware?
    # `productsCount` zaehlt ENTWUERFE MIT: «Angebote & Deals» meldete 351 und hatte
    # ueber 300 geprueft NULL aktive Produkte. Der Waechter sah sie als gefuellt an,
    # waehrend die Kundin ein leeres Regal fand.
    # ⚠️ Und die Stichprobe `products(first:30)` taugt NICHT als Ersatz: sie folgt der
    # Sortierung der Kollektion, und die kann Entwuerfe voranstellen. Genau so hat dieser
    # Waechter «Damen-Strick & Pullover» als leer gemeldet — nachgemessen sind 280 von 400
    # aktiv. Ein Melder, der einen Fall ERFINDET, ist schlimmer als einer, der einen uebersieht.
    # Belastbar ist der Wurzel-Filter `collection_id:<id> AND status:active`; er wurde in
    # beide Richtungen gegengeprueft (mit `status:draft` liefert er andere Produkte).
    for i in range(0, len(offen), 15):
        teil = offen[i:i + 15]
        felder = " ".join(
            f'a{j}: products(first:3, query:"collection_id:{cid} AND status:active"){{ nodes{{ id }} }}'
            for j, (_h, cid, _n) in enumerate(teil))
        d = gql("{ " + felder + " }")
        if d is None:
            print("PAUSE (Aktiv-Pruefung fehlgeschlagen — kein Befund daraus)")
            break
        for j, (h, _cid, anzahl) in enumerate(teil):
            knoten = ((d["data"] or {}).get(f"a{j}") or {}).get("nodes") or []
            if not knoten:
                befund.append((h, f"veroeffentlicht, aber KEIN kaufbares Produkt "
                                  f"(productsCount meldet {anzahl} — zaehlt Entwuerfe mit)"))
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


# ⚠️ 08.09.2026: Ohne diese Wache startet ein blosser `import` den Lauf — heute beim
# Messen an versand_jenachland passiert, am 03.09. schon einmal beim Melder.
# Ein Werkzeug, das man zum Messen importiert, darf beim Importieren nichts tun.
if __name__ == "__main__":
    main()
