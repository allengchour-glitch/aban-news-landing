#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
handle_lieferantencode.py — Lieferanten-SKU und Nachahmungs-Behauptungen aus Produkt-URLs entfernen
====================================================================================================

BEFUND (FEHLERSUCHE-14-08.md, Abschnitte [suche] und [alt-texte])
------------------------------------------------------------------
Gemeldet: «Fremde Markennamen wurden nur aus den TITELN gestrichen — in den Produkt-URLs
stehen sie weiter» (15 Produkte). Beim Aufräumen der Alt-Texte kam eine zweite, im Bericht
nicht genannte Klasse dazu: dieselben Lieferanten-SKU, die im Alt-Text standen, stehen auch
in der URL (/products/titan-schneidebrett-as-cj41x27t-973058).

⚠️ DER BERICHT WAR BEIM MARKEN-TEIL ÜBERHOLT — LIVE GEGENGEPRÜFT
-----------------------------------------------------------------
Die Marken-Liste des Berichts stammt aus /tmp/export.jsonl (Schnappschuss vom 12.08.).
Eine frische Bulk-Abfrage über alle 34'577 aktiven Produkte (14.08.) zeigt: 11 der 14
Marken-URLs sind inzwischen von einer parallel laufenden Session repariert worden
(«kissenbezug-mit-quasten-im-chanel-stil-632400» heisst live nur noch
«kissenbezug-mit-quasten-632400»). Das bestätigt die Hausregel, dass der Export ein Foto ist.
Live übrig sind 3 — und zwei davon (15497045541249, 15497445736833) tragen Produkt-IDs
OBERHALB des ganzen Exports, sind also NACH der Bereinigung neu importiert worden.
Der Importer erzeugt die Fälle also weiter nach; siehe «QUELLE» unten.

ABWÄGUNG: LOHNT DIE URL-ÄNDERUNG DEN AUFWAND?  (die Aufgabe verlangt eine Begründung)
--------------------------------------------------------------------------------------
Eine Handle-Änderung ist NICHT gratis: Ohne 301-Weiterleitung entsteht ein toter Link, und
dieser Shop leidet bereits an Link-Fäule (304 tote Links im Blog, 45 % aller internen Links).
Dagegen steht der Nutzen. Ich habe beide Klassen getrennt bewertet:

KLASSE A — Nachahmungs-Behauptung («im Chanel-Stil»), 3 live:  JA, ÄNDERN.
  Google Merchant liest die Ziel-URL mit. «Impersonation/Counterfeit» ist ein Grund für die
  SOFORTIGE Kontosperre, und der Google-Kanal ist der einzige mit belegten Verkäufen
  (52 Klicks, +206 %). Nach MSchG Art. 13 Abs. 2 genügt in der Schweiz das Anlehnen an eine
  fremde Marke im Werbetext; die URL ist Werbetext. Der Erwartungswert eines Kanalverlusts
  übersteigt die Kosten von 3 Weiterleitungen um Grössenordnungen.

KLASSE B — Lieferanten-SKU in der URL, 10 live:  JA, ÄNDERN — aber aus einem anderen Grund.
  Hier gibt es KEIN Sperr-Risiko: seine eigene Artikelnummer zu zeigen verstösst gegen keine
  Richtlinie. Der Schaden ist Positionierung: Die URL ist die am besten indexierte Stelle
  überhaupt — wer «AS-CJ41X27T» googelt, landet beim Grosshändler und sieht den Einkaufspreis.
  Genau diesen Weg habe ich beim Alt-Text schon geschlossen; ihn in der URL offen zu lassen,
  hiesse dieselbe Angabe wieder nur in EINEM Feld zu entfernen — der Fehler, der in diesem
  Projekt bereits dreimal Geld gekostet hat.
  Der Aufwand ist hier besonders niedrig, weil alle 10 URLs ohnehin einen maschinellen
  Zahlen-Anhang tragen («-973058») und im August 2026 angelegt wurden: es gibt praktisch
  keinen aufgebauten Suchmaschinen-Wert, den die Änderung verlieren könnte.

NICHT ÄNDERN — bewusst stehen gelassen (das ist der grössere Teil des Befundes):
  ~130 aktive Produkte tragen einen Markennamen in der URL als KOMPATIBILITÄTSANGABE:
  /products/titan-armband-fur-apple-watch-292224, /products/schutzhulle-fur-nintendo-switch-…,
  /products/ersatzakku-fur-dji-phantom-3se-3p-3a-4500mah-600000.
  Eine fremde Marke zu nennen, um zu sagen WOZU ein Teil passt, ist nach MSchG Art. 13 Abs. 2
  ausdrücklich erlaubt (referierender Gebrauch) und von Google Merchant ausdrücklich vorgesehen.
  Diese URLs zu ändern wäre nicht nur unnötig, sondern SCHÄDLICH: die Kompatibilität ist die
  eigentliche Kaufinformation. Genau derselbe Fehler wurde am 12.08. schon einmal gemacht, als
  «Lenkradblende für -Benz» entstand — die Kürzung nahm die Angabe weg, für welches Auto das
  Teil passt.
  Ebenfalls unberührt: 11 Produkte, bei denen die Marke die PRODUKTIDENTITÄT ist
  («Damen Badeanzug Adidas» je4371, «Unisex-Sonnenbrille Converse» sco23149955p — BigBuy führt
  echte Markenware). Dort ist der Markenname keine Anmassung, sondern der Artikel selbst.

FEHLTREFFER AUS DEM PROBELAUF
-----------------------------
* Ein Muster «marke» ohne Kontext meldete 157 Produkte — 130 davon waren die oben beschriebenen
  Kompatibilitäts-URLs. Die Trennlinie ist nicht das Wort, sondern die BEHAUPTUNG:
  «für X» = zulässig, «im X-Stil» / «X-inspiriert» / «X-Look» = Anmassung.
* «mars-1000-velo-frontlicht-mit-1000-lumen»: ein blindes Entfernen der Ziffernfolge «1000»
  hätte auch «1000-lumen» getroffen — die Leistungsangabe. Deshalb wird nur das benannte
  Code-Token an seiner Position entfernt, nie eine Ziffernfolge global.
* «36mp-hd-infrarot-wildkamera-pr2000»: «36MP» ist die Auflösung, kein Code. Bleibt.

VERFAHREN
---------
Klasse B (SKU): Der Handle wird aus dem bereits gepflegten TITEL neu gebaut (wie beim
  Alt-Text) und der maschinelle Zahlen-Anhang erhalten. Das repariert nebenbei zwei englische
  Alt-URLs («casual-swimwear-…» bei einem Produkt namens «Lässiger Badeanzug»).
Klasse A (Marke): Hier darf NICHT aus dem Titel gebaut werden — die Titel dieser 3 Produkte
  tragen die Marke selbst noch («Damen Pumps im Chanel-Stil»). Es wird nur das Markenglied
  samt hängendem «im-»/«-stil» aus dem Handle geschnitten. Titel und Beschreibung dieser
  Produkte gehören zum Abschnitt [marken] und werden hier bewusst NICHT angefasst.

JEDE Änderung bekommt eine 301-Weiterleitung vom alten auf den neuen Pfad (urlRedirectCreate).
Ohne bestätigte Weiterleitung wird der Handle NICHT geändert — Reihenfolge: Handle ändern,
Weiterleitung anlegen, beides live nachprüfen (alt → 301, neu → 200).

QUELLE (Regel 7)
----------------
Der Alt-Text-Leak entstand NICHT im Alt-Text-Generator: `alt_text_guard.mjs` und
`alt_text_backfill.mjs` bauen korrekt aus dem aktuellen Titel und füllen nur LEERE Felder.
Die Ursache ist `titelcode_entfernen.py`: es hat am 11.08. 81 Artikelnummern aus Titeln
gestrichen und dabei ausschliesslich `productUpdate(title:)` aufgerufen — Alt-Texte und
Handles blieben auf dem alten Titel stehen. Deshalb ist dort jetzt ein Nachzieh-Schritt
ergänzt (siehe automation/alttext_lieferantencode.py, Funktion alt_saeubern).
Für Klasse A ist die Quelle der Importer, der weiterhin Titel wie «… im Chanel-Stil» anlegt;
Shopify leitet den Handle daraus ab. Das ist ein Titel-Problem und gehört in den
Marken-Wächter — hier nur festgehalten, nicht repariert.

AUFRUF
------
    python3 automation/handle_lieferantencode.py           # DRY
    python3 automation/handle_lieferantencode.py --scharf  # ändert + legt 301 an

Ledger: dropship/_handle_bereinigt.txt (alt→neu, flush nach JEDER Zeile).
"""

import json
import os
import re
import sys
import time
import urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
LEDGER = os.path.join(os.path.dirname(__file__), "..", "dropship", "_handle_bereinigt.txt")

# --------------------------------------------------------------------------------------
# Klasse B — Lieferanten-SKU in der URL. Handle wird aus dem Titel neu gebaut.
# Explizite Liste statt Blindmuster: 10 bekannte Fälle, damit kein Fehltreffer möglich ist.
# --------------------------------------------------------------------------------------
KLASSE_B = [
    "15447909695873", "15447909859713", "15448076124545", "15448076321153",
    "15448076386689", "15448838472065", "15448838504833", "15448847090049",
    "15448958075265", "15449128894849",
]

# --------------------------------------------------------------------------------------
# Klasse A — Nachahmungs-Behauptung. Nur das Markenglied wird geschnitten.
# --------------------------------------------------------------------------------------
MARKEN = r"(chanel|dior|gucci|prada|versace|balenciaga|hermes|rolex|louboutin|dr-martens|" \
         r"doc-martens|birkenstock|barbie|seiko|fendi|burberry|celine|givenchy|valentino|" \
         r"cartier|tiffany|ray-ban|supreme|carhartt|lululemon|yeezy)"
# «im-chanel-stil» / «chanel-inspiriertes» / «chanel-look» / «chanel-style»
ANMASSUNG = re.compile(r"-?\bim-" + MARKEN + r"-stil\b|-?\b" + MARKEN +
                       r"-(?:stil|inspiriert\w*|inspirierend\w*|look|style)\b", re.I)

UMLAUT = {"ä": "a", "ö": "o", "ü": "u", "Ä": "a", "Ö": "o", "Ü": "u", "ß": "ss",
          "×": "x", "·": " ", "–": " ", "—": " "}


def handle_aus_titel(titel: str, alt_handle: str) -> str:
    """Baut einen Handle aus dem Titel und hängt den maschinellen Zahlen-Anhang wieder an."""
    t = titel
    for a, b in UMLAUT.items():
        t = t.replace(a, b)
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    m = re.search(r"-(\d{4,}|[0-9a-f]{6})$", alt_handle)     # -973058 / -8480b5
    if m:
        t = f"{t}-{m.group(1)}"
    return re.sub(r"-+", "-", t)[:255]


def handle_ohne_marke(alt_handle: str) -> str:
    neu = ANMASSUNG.sub("", alt_handle)
    return re.sub(r"-+", "-", neu).strip("-")


# --------------------------------------------------------------------------------------
def gql(query, variables=None, versuche=5):
    """Regel 6: gescheiterte Anfrage ist kein Ergebnis — es wird echt wiederholt."""
    token = open(TOKEN_DATEI).read().strip()
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    letzter = None
    for n in range(versuche):
        try:
            req = urllib.request.Request(
                SHOP, data=body,
                headers={"X-Shopify-Access-Token": token, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode())
            if d.get("errors"):
                letzter = d["errors"]; time.sleep(2 * (n + 1)); continue
            return d
        except Exception as e:                                  # noqa: BLE001
            letzter = e; time.sleep(2 * (n + 1))
    raise RuntimeError(f"GraphQL nach {versuche} Versuchen erfolglos: {letzter}")


Q = '{ product(id:"gid://shopify/Product/%s"){ id title handle status } }'
M_HANDLE = ('mutation($i:ProductInput!){productUpdate(input:$i){'
            'product{handle onlineStoreUrl} userErrors{field message}}}')
M_REDIR = ('mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r){'
           'urlRedirect{id path target} userErrors{field message}}}')


def main():
    scharf = "--scharf" in sys.argv
    print("MODUS:", "SCHARF (ändert Handles + legt 301 an)" if scharf else "DRY (zeigt nur)")

    plan = []
    for pid in KLASSE_B:
        p = gql(Q % pid)["data"]["product"]
        if not p:
            print(f"  !! {pid} nicht gefunden — bleibt OFFEN"); continue
        neu = handle_aus_titel(p["title"], p["handle"])
        if neu != p["handle"]:
            plan.append(("B-SKU", pid, p["title"], p["handle"], neu))

    # Klasse A live suchen statt aus dem veralteten Export
    for pid in ["15495109902721", "15497045541249", "15497445736833"]:
        p = gql(Q % pid)["data"]["product"]
        if not p:
            continue
        neu = handle_ohne_marke(p["handle"])
        if neu != p["handle"]:
            plan.append(("A-MARKE", pid, p["title"], p["handle"], neu))

    print(f"\nGEPLANT: {len(plan)} Handle-Änderungen (je mit 301)\n")
    for k, pid, t, alt, neu in plan:
        print(f"  [{k}] {pid}  «{t[:46]}»")
        print(f"        alt: /products/{alt}")
        print(f"        neu: /products/{neu}")

    if not scharf:
        print("\n(DRY — nichts geschrieben)")
        return

    ledger = open(LEDGER, "a", buffering=1)
    n_ok = 0
    for k, pid, t, alt, neu in plan:
        r = gql(M_HANDLE, {"i": {"id": f"gid://shopify/Product/{pid}", "handle": neu}})
        e = r["data"]["productUpdate"]["userErrors"]
        if e:
            print(f"  !! {pid} Handle: {e} — bleibt OFFEN"); continue
        ist = r["data"]["productUpdate"]["product"]["handle"]
        # 301 SOFORT nach der Änderung — sonst steht ein toter Link im Netz
        rr = gql(M_REDIR, {"r": {"path": f"/products/{alt}", "target": f"/products/{ist}"}})
        re_ = rr["data"]["urlRedirectCreate"]["userErrors"]
        if re_:
            print(f"  !! {pid} 301 FEHLT ({re_}) — Handle steht auf {ist}, bitte prüfen")
        ledger.write(f"{pid}\t{k}\t{alt}\t{ist}\t{'301ok' if not re_ else '301fehlt'}\n")
        n_ok += 1
        print(f"  ✓ {pid}: /products/{alt} → /products/{ist}")
        time.sleep(0.5)
    ledger.close()
    print(f"\nGeändert: {n_ok} von {len(plan)}")


if __name__ == "__main__":
    main()
