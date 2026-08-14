#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
beschreibung_lieferantencode.py — Lieferantencode aus Beschreibung und SEO-Text entfernen
==========================================================================================

BEFUND
------
Nicht im Bericht gemeldet, beim Aufräumen der Alt-Texte gefunden: Derselbe Lieferantencode,
der im Alt-Text stand (FEHLERSUCHE-14-08.md, [alt-texte]) und in der URL, steht bei 10 dieser
Produkte auch im BESCHREIBUNGSTEXT und in der SEO-Beschreibung:

    «Das Titan-Schneidebrett AS-CJ41X27T ist eine robuste und hygienische Wahl für Ihre Küche.»
    «Titan-Schneidebrett AS-CJ41X27T – jetzt bei LuxeStyle CH bestellen.»  (SEO, steht im Google-Treffer)

Damit ist es das VIERTE Feld derselben Angabe: Titel (11.08. gesäubert), Alt-Text und Handle
(14.08. gesäubert), Beschreibung/SEO (hier). Genau die Fehlerklasse, die das Projektgedächtnis
schon dreimal notiert hat — wer eine Angabe aus einem Feld entfernt, muss prüfen, welches
ANDERE Feld sie trägt. Die SEO-Beschreibung wiegt am schwersten: sie ist der Text, den Google
im Suchergebnis anzeigt.

BETROFFEN: 10 aktive Produkte (6 davon im Google-Kanal), 17 Textstellen.

FEHLTREFFER / GEFAHR AUS DEM PROBELAUF — DER GRUND FÜR DIE SONDERREGEL
-----------------------------------------------------------------------
Ein blindes Herausschneiden des Codes hätte bei 2 von 10 Produkten eine SATZRUINE erzeugt,
weil der Code dort das grammatische Subjekt ist:

    «Die YSM8004 ist eine randlose Sonnenbrille…»   →  «Die ist eine randlose Sonnenbrille…»  ✗
    «Das MARS-1000 ist ein leistungsstarkes Velo-Frontlicht…» → «Das ist ein leistungsstarkes…» ✗

Das ist exakt der Schaden, den die Marken-Bereinigung vom 12.08. angerichtet hat
(«Lenkradblende für -Benz», «Rundhals-Spitzentop im -Stil») — eine Reparatur, die einen
kundensichtbaren Textfehler HINTERLÄSST, ist keine Reparatur. Deshalb zwei getrennte Regeln:

  Regel 1 (8 Fälle): Der Code ist eine Beifügung neben dem Produktnamen
      «Das Titan-Schneidebrett AS-CJ41X27T ist…»  →  «Das Titan-Schneidebrett ist…»
      «Das Modell KA-P412-01 überzeugt…»          →  «Das Modell überzeugt…»
      → Code entfernen, doppelte Leerzeichen glätten. Nur an den Rändern, nie innen.

  Regel 2 (2 Fälle): Auf den Code folgt direkt «ist/sind/war» — der Code IST das Subjekt
      «Die YSM8004 ist eine randlose Sonnenbrille…» → «Dies ist eine randlose Sonnenbrille…»
      → Artikel + Code zusammen durch «Dies» ersetzen. Ergebnis ist grammatisch und behauptet
        nichts Neues.

WEITERE FEHLTREFFER, DIE AUSGESCHLOSSEN SIND
--------------------------------------------
* «36MP HD Infrarot-Wildkamera PR2000» — «36MP» ist die Auflösung und bleibt; nur «PR2000» geht.
* «Velo-Frontlicht mit 1000 Lumen» — die «1000» in «1000 Lumen» ist eine Leistungsangabe.
  Deshalb wird ausschliesslich das NAMENTLICH BENANNTE Code-Token ersetzt, nie eine
  Ziffernfolge gesucht. Die Zuordnung Produkt→Code steht fest in PAARE.
* Codes, die im Titel stehen bleiben sollen (CLAUDE.md: «Taillierte Jeansjacke – Y110S» ist
  das einzige Unterscheidungsmerkmal), sind hier nicht enthalten — PAARE listet nur die 10
  Produkte, deren Titel bereits gesäubert wurde.

AUFRUF
------
    python3 automation/beschreibung_lieferantencode.py           # DRY, zeigt jeden Satz vorher/nachher
    python3 automation/beschreibung_lieferantencode.py --scharf

Ledger: dropship/_beschreibung_code_bereinigt.txt (flush nach JEDER Zeile).
"""

import json
import os
import re
import sys
import time
import urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
LEDGER = os.path.join(os.path.dirname(__file__), "..", "dropship",
                      "_beschreibung_code_bereinigt.txt")

# Produkt -> genau ein Code-Token. Feste Zuordnung statt Suchmuster (siehe Fehltreffer oben).
PAARE = [
    ("15447909695873", "YSM8003"),
    ("15447909859713", "YSM8004"),
    ("15448076124545", "KA-P402-01"),
    ("15448076321153", "KA-P412-01"),
    ("15448076386689", "KA-P670-09"),
    ("15448838472065", "AS-CJ41X27T"),
    ("15448838504833", "AS-CJ45X28T"),
    ("15448847090049", "SF3500"),
    ("15448958075265", "MARS-1000"),
    ("15449128894849", "PR2000"),
]


def code_entfernen(text: str, code: str) -> str:
    """Regel 2 zuerst (Subjekt), dann Regel 1 (Beifügung)."""
    if not text:
        return text
    c = re.escape(code)
    # Regel 2: «Die/Das/Der <CODE> ist/sind/war …» -> «Dies ist …»
    text = re.sub(r"\b(?:Die|Das|Der)\s+" + c + r"\s+(?=(?:ist|sind|war)\b)",
                  "Dies ", text, flags=re.I)
    # Regel 1: Code als Beifügung entfernen
    text = re.sub(r"\s*\b" + c + r"\b", "", text)
    # Nur an den Rändern glätten: doppelte Leerzeichen, Leerzeichen vor Satzzeichen
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    # Stand der Code am ANFANG, bleibt sein Trennzeichen als führendes Leerzeichen stehen
    # (Probelauf: SEO-Text «YSM8003 Rahmenlose…» wurde zu « Rahmenlose…»).
    text = re.sub(r"(<(?:p|h[1-6]|li|td|div)[^>]*>)[ \t]+", r"\1", text)
    return text.strip()


def gql(query, variables=None, versuche=5):
    """Regel 6: eine gescheiterte Anfrage ist kein Ergebnis."""
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
        except Exception as e:                                   # noqa: BLE001
            letzter = e; time.sleep(2 * (n + 1))
    raise RuntimeError(f"GraphQL nach {versuche} Versuchen erfolglos: {letzter}")


Q = ('{ p: product(id:"gid://shopify/Product/%s"){ title descriptionHtml '
     'seo{ title description } } }')
M = ('mutation($i:ProductInput!){productUpdate(input:$i){product{id} '
     'userErrors{field message}}}')
WS = re.compile(r"\s+")


def ausschnitt(txt, code):
    m = re.search(re.escape(code), txt or "", re.I)
    if not m:
        return ""
    return WS.sub(" ", txt[max(0, m.start() - 80):m.end() + 55])


def main():
    scharf = "--scharf" in sys.argv
    print("MODUS:", "SCHARF (schreibt)" if scharf else "DRY (zeigt nur)")

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[0] for z in open(LEDGER) if z.strip()}

    ledger = open(LEDGER, "a", buffering=1) if scharf else None
    n_prod = n_stellen = 0

    for pid, code in PAARE:
        if pid in erledigt:
            continue
        p = gql(Q % pid)["data"]["p"]
        if not p:
            print(f"  !! {pid} nicht gefunden — bleibt OFFEN")
            continue
        seo = p.get("seo") or {}
        neu_desc = code_entfernen(p.get("descriptionHtml") or "", code)
        neu_seot = code_entfernen(seo.get("title") or "", code)
        neu_seod = code_entfernen(seo.get("description") or "", code)

        felder, eingabe = [], {"id": f"gid://shopify/Product/{pid}"}
        if neu_desc != (p.get("descriptionHtml") or ""):
            felder.append(("BESCHREIBUNG", p["descriptionHtml"], neu_desc))
            eingabe["descriptionHtml"] = neu_desc
        if neu_seot != (seo.get("title") or "") or neu_seod != (seo.get("description") or ""):
            if neu_seot != (seo.get("title") or ""):
                felder.append(("SEO-TITEL", seo.get("title"), neu_seot))
            if neu_seod != (seo.get("description") or ""):
                felder.append(("SEO-BESCHREIBUNG", seo.get("description"), neu_seod))
            eingabe["seo"] = {"title": neu_seot or None, "description": neu_seod or None}

        if not felder:
            continue
        n_prod += 1
        print(f"\n{pid} [{code}]  «{p['title'][:48]}»")
        for name, alt, neu in felder:
            n_stellen += 1
            print(f"   {name}")
            print(f"     VORHER : …{ausschnitt(alt, code)}…")
            m = re.search(r".{0,80}Dies |.{0,80}", neu)
            print(f"     NACHHER: …{WS.sub(' ', neu[:190])}…" if name != 'BESCHREIBUNG'
                  else f"     NACHHER: …{WS.sub(' ', neu[:190])}…")

        if scharf:
            r = gql(M, {"i": eingabe})
            e = r["data"]["productUpdate"]["userErrors"]
            if e:
                print(f"   !! FEHLER {e} — bleibt OFFEN")
                continue
            ledger.write(f"{pid}\t{code}\t{'+'.join(f[0] for f in felder)}\n")
            time.sleep(0.4)

    print(f"\nProdukte: {n_prod} | Textstellen: {n_stellen}")
    if ledger:
        ledger.close()


if __name__ == "__main__":
    main()
