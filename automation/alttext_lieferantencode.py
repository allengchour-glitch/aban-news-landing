#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
alttext_lieferantencode.py — Lieferanten-/Artikelcodes aus kundensichtbaren Bild-Alt-Texten entfernen
=====================================================================================================

BEFUND (FEHLERSUCHE-14-08.md, Abschnitt [alt-texte])
----------------------------------------------------
Gemeldet waren 24 Bilder in 4 Produkten mit der CJ-Lieferanten-SKU im Alt-Text
(«Ärmelloser Jumpsuit mit weitem Bein – Ref. CJ-CJYD294848201AZ»). Der Alt-Text ist
kundensichtbarer Text: Screenreader lesen ihn vor, Google indexiert ihn für die Bildersuche,
und bei einem Ladefehler steht er anstelle des Bildes auf der Seite.

DIE GEMELDETE ZAHL WAR ZU KLEIN — WARUM
---------------------------------------
Der Befund suchte nach der Schreibweise, die er schon kannte («Ref. CJ-»). Gesucht wurde
deshalb nicht nach dem Fehler, sondern nach der eigenen Spur. Eine Suche nach dem, was die
Kundin SIEHT — irgendein Maschinencode im Alt-Text — findet den doppelten Umfang:

    gemeldet:   4 Produkte /  24 Bilder   (nur «Ref. CJ-…» und «AS-CJ…»)
    tatsächlich: 12 Produkte /  78 Bilder

Die zusätzlichen 8 Produkte tragen den Code in einer anderen Schreibweise, ohne «Ref.»:
«YSM8003 Rahmenlose Sonnenbrille…», «Casual Swimwear KA-P412-01», «SF3500 Handheld-Konsole…»,
«MARS-1000 Velo-Frontlicht…», «36MP HD Infrarot-Wildkamera PR2000».

URSACHE (dieselbe Klasse wie schon zweimal im Gedächtnis notiert)
-----------------------------------------------------------------
`automation/titelcode_entfernen.py` hat am 11.08. 81 Artikelnummern aus TITELN gestrichen.
Der Alt-Text wurde beim Import aus dem UNGEREINIGTEN Titel gebaut und nie nachgezogen.
Wieder gilt: Wer eine Angabe aus einem Feld entfernt, muss prüfen, welches ANDERE Feld sie trägt.
Prüfmerkmal ist deshalb nicht die Schreibweise des Codes, sondern die Abweichung:
ein Code steht im Alt-Text, aber NICHT (mehr) im Titel — er ist verwaist.

FEHLTREFFER AUS DEM PROBELAUF (allesamt ausgeschlossen)
-------------------------------------------------------
Ein erster, breiter Entwurf lieferte 30–90 % Müll; die Ausschlüsse stehen jetzt fest im Code:

1. «Ref» ohne Punkt trifft «Anti-Ref-lex».  Der erste Lauf meldete 141 Bilder in 17 Produkten,
   Spitzenreiter «AR Anti-Reflex Brille» — `\bRef` steht mitten im Wort «Reflex».
   Exakt die dokumentierte Falle «IPL steckt in L-IPL-iner». → Muster verlangt jetzt «Ref. »
   mit Punkt UND Leerzeichen.
2. Batterietypen sind ECHTE ANGABEN, keine Artikelnummern: CR2032, CR2025, CR1225, CR123A,
   LR1130, AG10, SR626SW. «5er-Pack CR2025 Lithium-Knopfzellen» ist genau die Information,
   wegen der die Kundin kauft.  → Schutzliste `ECHTE_ANGABE`.
3. Masse und Leistung sehen aus wie Codes: 20-35L / 36-55L (Rucksackvolumen), 2000LM (Lumen),
   36MP (Megapixel), D-VVS1 (Reinheitsgrad eines Moissanit-Steins), 1080P, 4K, 128GB.
   → ebenfalls Schutzliste.
4. Steht der Code AUCH IM TITEL, ist er kein Leck, sondern eine bewusste Entscheidung.
   «Sonnenbrille mit UV-Schutz · TR1002» führt den Code im Titel — dort ist er laut
   CLAUDE.md das einzige Unterscheidungsmerkmal zwischen sonst wortgleichen Artikeln.
   → nur VERWAISTE Codes werden angefasst (Code im Alt, nicht im Titel).
5. Die CLAUDE.md-Schutzliste UV400 / TR90 / RF433 / SR626SW / Modelljahr 2025|2026 ist
   übernommen — das sind Aussagen (UV-Schutz, Rahmenmaterial, Funkfrequenz), keine Nummern.

ENTSCHEIDUNG
------------
Der Alt-Text wird nicht «geputzt» (Code herausschneiden hinterlässt Textnarben wie das
bereits vorhandene «… im -Stil»), sondern AUS DEM BEREITS GEPFLEGTEN PRODUKTTITEL NEU GEBAUT.
Das vorhandene Zählsuffix bleibt unverändert erhalten, damit der Hausstil des Shops steht:
    27'306 Bilder enden auf «– Ansicht N»
    21'979 Bilder enden auf «– Bild N | LuxeStyle»
Nebenwirkung, bewusst mitgenommen: drei Bademode-Produkte trugen im Alt-Text englische
Lieferantensprache («Casual Swimwear»), obwohl der Titel längst deutsch ist — der Neubau
aus dem Titel repariert das mit.

NICHT ANGEFASST
---------------
* Codes, die auch im Titel stehen (Punkt 4) — dort ist die Entscheidung schon getroffen.
* Der Titel «Casual Bademode · Damen» (15448076124545) bleibt wie er ist: der Alt-Text wird
  aus dem Titel gebaut, nicht umgekehrt. Das halb-englische Wort im TITEL ist ein eigener
  Befund und gehört nicht in diesen Reiniger.
* Leere Alt-Texte (24'841 Produkte). Der Befund dazu ist widerlegt: das Theme rendert dort
  den Produkttitel, die Storefront ist in Ordnung.

QUELLE MITREPARIERT (Regel 7)
-----------------------------
Ein Nachfüllen ohne Quellenkorrektur hält nur bis zum nächsten Import. Der Alt-Text entsteht
in `automation/cj_category_fill.mjs` (altFor()) und in den übrigen Importern aus dem Rohtitel
des Lieferanten. Die Funktion `alt_saeubern()` unten ist die gemeinsame Regel; die
JS-Entsprechung wird im selben Commit in cj_category_fill.mjs eingesetzt, damit der NÄCHSTE
importierte Artikel den Code gar nicht erst in den Alt-Text bekommt.

AUFRUF
------
    python3 automation/alttext_lieferantencode.py           # DRY  — zeigt jede Änderung
    python3 automation/alttext_lieferantencode.py --scharf  # schreibt

Ledger: dropship/_alttext_code_bereinigt.txt (eine Zeile je Bild, flush nach JEDER Zeile —
der Prozess wird hier regelmässig abgebrochen).
"""

import json
import os
import re
import sys
import time
import urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
LEDGER = os.path.join(os.path.dirname(__file__), "..", "dropship", "_alttext_code_bereinigt.txt")

# --------------------------------------------------------------------------------------
# Muster
# --------------------------------------------------------------------------------------

# Maschinencode-Verdacht: >=6 Zeichen, mischt Grossbuchstaben UND Ziffern
CODE_TOKEN = re.compile(r"\b(?=[A-Z0-9\-_]{6,}\b)(?=[^ ]*[A-Z])(?=[^ ]*\d)[A-Z0-9\-_]{6,}\b")

# Echte Aussagen, die wie ein Code AUSSEHEN — niemals entfernen (Fehltreffer 2, 3, 5)
ECHTE_ANGABE = re.compile(
    r"^("
    r"CR\d{4}|CR\d{3}[A-Z]|LR\d{3,4}|AG\d{1,2}|SR\d+[A-Z]*|"          # Batterietypen
    r"UV400|TR90|RF433|"                                               # CLAUDE.md-Schutzliste
    r"\d+[-–]\d+L|\d+L|\d+LM|\d+MP|\d+MM|\d+CM|\d+ML|\d+MAH|"     # Masse / Leistung
    r"\d+GB|\d+TB|\d+W|\d+V|\d+HZ|\d{4}K|"
    r"D-VVS\d|D-VS\d|D-IF|"                                            # Steinreinheit
    r"E\d{2}|GU\d{2}|IP\d{2}|4K|8K|1080P|720P|"                        # Fassung / Schutzart
    r"20\d{2}"                                                          # Modell-/Saisonjahr
    r")$"
)

# Hausstil-Suffix am Ende des Alt-Textes, das erhalten bleiben muss
SUFFIX = re.compile(r"(\s*[–\-]\s*(?:Ansicht|Bild)\s*\d+(?:\s*\|\s*LuxeStyle(?:\s*Schweiz)?)?)\s*$")


def verwaiste_codes(alt: str, titel: str):
    """Codes, die im Alt-Text stehen, aber NICHT im Titel — nur die sind ein Leck."""
    titel_norm = titel.upper().replace("–", "-").replace("—", "-")
    treffer = []
    for tok in CODE_TOKEN.findall(alt):
        if ECHTE_ANGABE.match(tok):
            continue                     # echte Angabe, keine Artikelnummer
        if tok in titel_norm:
            continue                     # steht auch im Titel = bewusste Entscheidung
        treffer.append(tok)
    return treffer


def alt_saeubern(alt: str, titel: str):
    """
    Baut den Alt-Text aus dem gepflegten Titel neu und behält das Zählsuffix.
    Gibt None zurück, wenn nichts zu tun ist.
    """
    if not verwaiste_codes(alt, titel):
        return None
    m = SUFFIX.search(alt)
    suffix = m.group(1).strip() if m else ""
    neu = f"{titel} {suffix}".strip() if suffix else titel
    return neu if neu != alt else None


# --------------------------------------------------------------------------------------
# Shopify
# --------------------------------------------------------------------------------------

def gql(query, variables=None, versuche=5):
    """Regel 6: Eine gescheiterte Anfrage ist KEIN Ergebnis — hier wird echt wiederholt."""
    token = open(TOKEN_DATEI).read().strip()
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    letzter = None
    for n in range(versuche):
        try:
            req = urllib.request.Request(
                SHOP, data=body,
                headers={"X-Shopify-Access-Token": token, "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode())
            if d.get("errors"):
                letzter = d["errors"]
                time.sleep(2 * (n + 1))
                continue
            return d
        except Exception as e:                                    # noqa: BLE001
            letzter = e
            time.sleep(2 * (n + 1))
    raise RuntimeError(f"GraphQL nach {versuche} Versuchen erfolglos: {letzter}")


Q_PRODUKT = """
query($id: ID!) {
  product(id: $id) {
    id title status
    media(first: 60) { edges { node { ... on MediaImage { id alt } } } }
  }
}
"""

M_ALT = """
mutation($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) {
    files { ... on MediaImage { id alt } }
    userErrors { field message }
  }
}
"""

# Die 12 betroffenen Produkte des ersten Laufs (Bulk-Scan über alle 34'574 aktiven Produkte).
# Für den Dauerbetrieb NICHT diese Liste pflegen, sondern `--alle` benutzen (siehe unten).
PRODUKTE = [
    "15447909695873", "15447909859713", "15448076124545", "15448076321153",
    "15448076386689", "15448531927425", "15448713494913", "15448838472065",
    "15448838504833", "15448847090049", "15448958075265", "15449128894849",
]

# --------------------------------------------------------------------------------------
# --alle : ganzen Katalog prüfen (Regel 7 — der NÄCHSTE Artikel soll auch erfasst sein)
# --------------------------------------------------------------------------------------
BULK_START = """
mutation($q: String!) {
  bulkOperationRunQuery(query: $q) {
    bulkOperation { id status } userErrors { field message }
  }
}
"""
BULK_STAND = "{ currentBulkOperation(type: QUERY) { status url errorCode } }"
BULK_ABFRAGE = ('{ products(query: "status:active") { edges { node { id title '
                'media(first: 60) { edges { node { ... on MediaImage { id alt } } } } } } } }')


def katalog_scannen():
    """Sucht im GANZEN Katalog nach verwaisten Codes und liefert die Produkt-IDs."""
    gql(BULK_START, {"q": BULK_ABFRAGE})
    url = None
    for _ in range(60):
        time.sleep(10)
        st = gql(BULK_STAND)["data"]["currentBulkOperation"]
        if st["status"] == "COMPLETED":
            url = st["url"]; break
        if st["status"] in ("FAILED", "CANCELED"):
            raise RuntimeError(f"Bulk fehlgeschlagen: {st}")   # Regel 6: kein Ergebnis = offen
    if not url:
        raise RuntimeError("Bulk lief nicht fertig — Fälle bleiben OFFEN")
    titel, treffer = {}, set()
    with urllib.request.urlopen(url, timeout=300) as r:
        for zeile in r.read().decode().splitlines():
            if not zeile.strip():
                continue
            d = json.loads(zeile)
            if "handle" in d or ("title" in d and "__parentId" not in d):
                titel[d["id"]] = d.get("title", "")
            elif d.get("alt") and d.get("__parentId"):
                if verwaiste_codes(d["alt"], titel.get(d["__parentId"], "")):
                    treffer.add(d["__parentId"].split("/")[-1])
    print(f"Katalog-Scan: {len(titel)} Produkte geprüft, {len(treffer)} mit verwaistem Code")
    return sorted(treffer)


def main():
    scharf = "--scharf" in sys.argv
    alle = "--alle" in sys.argv
    print("MODUS:", "SCHARF (schreibt)" if scharf else "DRY (zeigt nur)",
          "| UMFANG:", "ganzer Katalog" if alle else "bekannte Liste")

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[0] for z in open(LEDGER) if z.strip()}

    ledger = open(LEDGER, "a", buffering=1) if scharf else None   # zeilengepuffert
    geaendert = geprueft = 0

    for pid in (katalog_scannen() if alle else PRODUKTE):
        d = gql(Q_PRODUKT, {"id": f"gid://shopify/Product/{pid}"})
        p = d["data"]["product"]
        if not p:
            print(f"  !! {pid}: nicht gefunden — bleibt OFFEN")
            continue
        titel = p["title"]
        aenderungen = []
        for e in p["media"]["edges"]:
            n = e["node"]
            if not n or not n.get("alt"):
                continue
            geprueft += 1
            neu = alt_saeubern(n["alt"], titel)
            if neu and n["id"] not in erledigt:
                aenderungen.append((n["id"], n["alt"], neu))

        if not aenderungen:
            continue
        print(f"\n{pid}  «{titel}»  — {len(aenderungen)} Bilder")
        for mid, alt, neu in aenderungen:
            print(f"    ALT : {alt}")
            print(f"    NEU : {neu}")

        if scharf:
            for i in range(0, len(aenderungen), 20):
                teil = aenderungen[i:i + 20]
                r = gql(M_ALT, {"files": [{"id": m, "alt": neu} for m, _, neu in teil]})
                fehler = r["data"]["fileUpdate"]["userErrors"]
                if fehler:
                    print("    !! FEHLER:", fehler, "— bleibt OFFEN")
                    continue
                for mid, alt, neu in teil:
                    ledger.write(f"{mid}\t{pid}\t{alt}\t{neu}\n")   # flush je Zeile
                    geaendert += 1
                time.sleep(0.4)

    print(f"\nGeprüft: {geprueft} Alt-Texte | Geändert: {geaendert}")
    if ledger:
        ledger.close()


if __name__ == "__main__":
    main()
