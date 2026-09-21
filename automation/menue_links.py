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
    # 12 statt 6 Versuche: GEMESSEN 21.09., der Aufseher startet acht Waechter
    # GLEICHZEITIG, und der Shopify-Eimer stand dabei auf 23 von 2000. Sechs Versuche
    # reichen dann nicht, egal wie klein die Abfrage ist — die anderen saugen schneller
    # nach, als 100/s nachfuellen. Dieser Waechter laeuft einmal taeglich; er darf ein
    # paar Minuten geduldig sein, statt 15 von 16 Laeufen blind zu bleiben.
    for i in range(12):
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
            d = None
        # ⚠️ 21.09.2026: DIESER WAECHTER WAR 15 VON 16 LAEUFEN BLIND.
        # Gemessen: die Abfrage (20 Kollektionen à productsCount + 10 Publications) kostet
        # 240 Punkte; im Eimer waren 35 bei restoreRate 100/s. Shopify antwortet dann
        # «THROTTLED» — und weil die Wache THROTTLED absichtlich NICHT als Fehler meldet
        # (sonst wuerde jede Drossel wie ein Befund aussehen), lief sie stumm in die
        # 6 Versuche und gab auf. Im Log stand nur «PAUSE», 15×, und niemand las es.
        # Blindes 2**i wartet zufaellig; Shopify SAGT, wie lange es dauert. Also fragen:
        wartezeit = 2 ** i
        try:
            t = (d or {}).get("extensions", {}).get("cost", {}).get("throttleStatus") or {}
            fehlt = float((d or {}).get("extensions", {}).get("cost", {})
                          .get("requestedQueryCost", 0)) - float(t.get("currentlyAvailable", 0))
            rate = float(t.get("restoreRate") or 0)
            if fehlt > 0 and rate > 0:
                wartezeit = min(30.0, fehlt / rate + 0.5)   # +0.5 s Sicherheit
        except Exception:
            pass
        time.sleep(wartezeit)
    return None


def menue_links():
    """Alle Menues, nicht nur das Hauptmenue.

    ⚠️ 15.09.2026: Diese Funktion las `if m["handle"] == "main-menu"` — der FOOTER wurde nie
    geprueft. Dort stand «Alle Kategorien» auf `/en/pages/alle-kategorien`, und weil die
    englische Sprache NICHT veroeffentlicht ist (`shopLocales`: de primaer+publiziert, en/fr/it
    unpubliziert), antwortete die Seite mit HTTP 404 — derselbe Befund wie bei den sechs
    Hauptmenue-Links am selben Morgen, nur eine Etage tiefer. Ein Waechter, der nur seine
    eigene Liste prueft, meldet sie zuverlaessig als gruen.
    """
    d = gql('{ menus(first:20){ nodes{ handle items{ title url items{ title url '
            'items{ title url } } } } } }')
    if d is None:
        return None
    raus = []

    def sammel(items, pfad=""):
        for x in items:
            raus.append((pfad + x["title"], x.get("url") or ""))
            sammel(x.get("items") or [], pfad + x["title"] + " › ")

    for m in d["data"]["menus"]["nodes"]:
        sammel(m["items"], f"[{m['handle']}] ")
    return raus


def main():
    links = menue_links()
    if links is None:
        print("PAUSE (Menue nicht lesbar — kein Befund ableitbar)")
        return
    import re, urllib.parse
    handles = []
    befund = []
    # ⚠️ 15.09.2026, zwei Fehler dieses Werkzeugs am selben Morgen gefunden:
    # (1) Der Handle kam PROZENT-KODIERT aus dem Menue («%F0%9F%92%8E-premium-ab-chf-80»),
    #     Shopify kennt ihn aber nur dekodiert («💎-premium-ab-chf-80»). Ohne unquote() meldete
    #     der Wächter JEDE Emoji-Kategorie als «existiert nicht» — zwei Fehlalarme, beide Seiten
    #     liefern live HTTP 200 mit korrektem Titel. Ein Wächter, der falschen Alarm schlägt,
    #     kostet dasselbe wie einer, der schweigt: man glaubt ihm nicht mehr.
    # (2) Die Regex greift MITTEN im Pfad. «/en/collections/premium-schmuck» ergab den Handle
    #     «premium-schmuck» — der existiert mit 124 Produkten, also kein Befund. Die Kundin
    #     bekommt auf dem /en/-Pfad aber HTTP 404 (gemessen). Geprueft wird jetzt der PFAD,
    #     den sie anklickt, nicht nur der Handle, den er enthaelt.
    # (3) 15.09.2026 nachmittags: Punkt (2) prueft NUR Kollektions-Links. Im Footer stand
    #     «Alle Kategorien» auf /en/pages/alle-kategorien — eine SEITE, also griff die Regex
    #     gar nicht, und der tote Link blieb liegen. Der Sprachpfad-Test gehoert deshalb VOR
    #     die Kollektions-Logik und gilt fuer jeden Link. Welche Sprachen es wirklich gibt,
    #     wird gemessen, nicht geraten.
    gl = gql("{ shopLocales { locale published } }")
    # ⚠️ 17.09.2026: hier stand nur `(gl or {})`. Scheitert die Abfrage, ist `lebend`
    # LEER — und dann gilt JEDER Sprachpfad als unveroeffentlicht, also jeder Link mit
    # /de/, /en/ … als 404. Der Bericht waere nicht etwa unvollstaendig, sondern voll
    # frei erfundener Befunde, und jemand haette danach Links «reparieren» wollen, die
    # in Ordnung sind. Genau das ist mir heute Morgen an der Versandschwelle beinahe
    # passiert. Ein Wert, der die Grundlage einer Aussage ist, darf nicht still zu
    # einer leeren Menge werden: ohne Messung wird die Pruefung UEBERSPRUNGEN.
    tot_durch_sprache = set()
    if gl is None:
        print("HINWEIS: Sprachen nicht messbar (shopLocales ohne Antwort) — "
              "Sprachpfad-Pruefung uebersprungen, KEIN Befund daraus.", flush=True)
        lebend = None
    else:
        lebend = {x["locale"] for x in (gl.get("data") or {}).get("shopLocales", []) if x["published"]}
    for _t, u in links:
        if lebend is None:
            break
        mo2 = re.match(r"/([a-z]{2})(?:-[A-Z]{2})?/", u or "")
        if mo2 and mo2.group(1) not in lebend:
            tot_durch_sprache.add(u)
            befund.append((u.split("?")[0],
                           f"Sprachpfad /{mo2.group(1)}/ ist nicht veroeffentlicht → HTTP 404"))

    for _t, u in links:
        if u in tot_durch_sprache:
            continue          # schon gemeldet — sonst steht derselbe Link zweimal im Bericht
        mo = re.search(r"/collections/([^/?#]+)", u)
        if not mo:
            continue
        if not u.split("?")[0].startswith("/collections/"):
            befund.append((u.split("?")[0], "Pfad-Praefix vor /collections/ — liefert 404 "
                                            "(Sprachpfad wie /en/ existiert nicht)"))
            continue
        h = urllib.parse.unquote(mo.group(1))
        if h not in handles and h != "all":
            handles.append(h)
    print(f"Hauptmenue: {len(links)} Eintraege, {len(handles)} Kollektionen", flush=True)

    offen = []          # (handle, id, productsCount) — Aktiv-Pruefung folgt
    # 6 statt 20 Kollektionen je Abfrage: 240 Punkte auf einmal sind zu viel, wenn die
    # anderen Waechter denselben Eimer teilen (gemessen 21.09.: 35 von 2000 frei).
    for i in range(0, len(handles), 6):
        teil = handles[i:i + 6]
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
                # Pfad-Befunde tragen den ganzen Pfad, Handle-Befunde nur den Handle.
                pfad = h if h.startswith("/") else f"/collections/{h}"
                f.write(f"- `{pfad}` — {w}\n")
        print(f"⚠️ {len(befund)} Menuelinks mit Befund -> {BERICHT}")
        for h, w in befund:
            print(f"   {h if h.startswith('/') else '/collections/' + h}: {w}")
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
