#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
marken_nachahmung_bereinigen.py — «im Chanel-Stil» & Co. aus Titel, Beschreibung, SEO-Feldern
und Produkt-URL entfernen (Befund [marken] + [google-heikel] der Fehlersuche vom 14.08.2026).

BEFUND
------
Aktive Produkte bewerben sich als Nachahmung fremder Luxusmarken («im Chanel-Stil»,
«Dr.-Martens-Stil», «Birkenstock-inspiriert»). Die Bereinigung vom 12.08.
(google_kanal_saeubern.py / _saeubern2.py) hat NUR den Titel angefasst — Beschreibung,
SEO-Titel, SEO-Beschreibung und Handle trugen die Behauptung unverändert weiter. Zusätzlich
hat der Titel-Schnitt sechs Titel zu Satzruinen gemacht («… im -Stil», «Lenkradblende für
-Benz»), weil in google_kanal_saeubern2.py der Markenname aus dem Titel geschnitten wurde,
ohne die Bauform drumherum zu reparieren.

ZAHLEN AUS DEM PROBELAUF (live gegen den Shop, nicht gegen den Export)
---------------------------------------------------------------------
Rohsuche nach 80 Markennamen über alle 31'500 aktiven Produkte:  407 Treffer
Nach Wortgrenzen + Ausnahmeliste:                                 48 Treffer
Aus dem Ledger _google_kanal_gesaeubert*.txt nachgezogen:         + 2 Produkte
Tatsächlich geändert:                                             43 Produkte
  · 43× Text/Titel/SEO/URL   · 27 Bild-Alt-Texte in 5 Produkten
  ·  3 Varianten-Optionswerte ·  15 Judge.me-Zwischenspeicher
Davon im Google-Kanal: 37.

DIE AUSSAGE LAG IN ACHT FELDERN, NICHT IN EINEM
-----------------------------------------------
Erst die Live-Nachkontrolle mit curl auf die echte Produktseite hat gezeigt, wie weit die
Behauptung gestreut war. Nach jedem «fertig» stand «Chanel» weiter im gerenderten HTML:
  1. Titel            2. Beschreibung      3. SEO-Titel        4. SEO-Beschreibung
  5. Handle (URL)     6. Varianten-Optionswert
  7. Bild-Alt-Text (aus dem alten Titel erzeugt, 27 Bilder)
  8. Metafeld judgeme.review_widget_data (Zwischenspeicher der Bewertungs-App)
Wer nur prüft, was er selbst geändert hat, hält 1–4 für die ganze Arbeit. Erst die Suche
nach dem, was die KUNDIN SIEHT, findet 5–8.

FEHLTREFFER, die der erste Entwurf erwischt hätte (alle NICHT angefasst)
-----------------------------------------------------------------------
Deutsche Zusammensetzungen — ohne Wortgrenze frisst der Markenname das Wort:
  «KochtechNIKEn»            → Nike        (81 Produkte!)
  «OcCASIOn» (Casual-Occasion)→ Casio       (12 Produkte)
  «VakuumELEGOldveredelung»  → Lego        (1)
Ganz normale deutsche/englische Wörter, die zufällig Marken heissen:
  «OMEGA-Fettsäuren» im Hundeöl, «Off-White» als Farbe (227 Produkte!),
  «Vans» als Mehrzahl von Van (Starthilfe-Powerbank für «Autos, Vans, SUVs»),
  «Tiffany Blau» als Farbbezeichnung.
Marke als Fremd-Modellnummer:
  15495112491393 «Der YSL-STK-7007F1 Bluetooth Controller» — Typenbezeichnung des
  Herstellers, nicht Yves Saint Laurent. Nicht angefasst.
Echte Markenware mit Lieferantennachweis (SKU bb-…, BigBuy) — 9 Produkte, bleiben komplett
unberührt: Michael Kors, Jimmy Choo, Puma Ferrari, Adidas (2×), New Balance, Converse,
Tommy Hilfiger, Nike. Der Markenname steht dort zu Recht.
Kompatibilitätsangaben bleiben ebenfalls: «für Apple Watch», «Adapter für Dyson», «für
Mercedes-Benz», «für BMW». Bei zwei davon hat der Lauf vom 12.08. die Kompatibilität aus
dem Titel geschnitten — die wird hier WIEDERHERGESTELLT, nicht entfernt.

ENTSCHEIDUNG
------------
Der Markenbezug wird aus Titel, descriptionHtml, seo.title, seo.description, den
Varianten-Optionswerten und dem Handle entfernt. Kein Produkt wird gelöscht oder gedraftet
— die Ware selbst ist verkäuflich, nur die Werbeaussage war es nicht. Weil ein blindes
Löschen des Markennamens genau die Satzruinen erzeugt, die diesen Lauf nötig gemacht haben,
arbeitet das Skript mit einer Regeltabelle je SATZBAUFORM (nicht je Wort) und prüft nach
jedem Schreibvorgang live nach, dass kein Markenname übrig blieb; erst dann geht die Zeile
ins Ledger (Regel 6: eine gescheiterte Anfrage ist kein Ergebnis).
Handle-Wechsel immer mit redirectNewHandle=true → die alte URL bleibt per 301 erreichbar.

QUELLE (Regel 7)
----------------
Die Texte stammen aus der maschinellen Übersetzung der CJ-Lieferantenbeschreibung; der
Importer übernimmt «Chanel style» aus dem chinesischen Listing ungeprüft. Deshalb liegt
die Regeltabelle als importierbare Funktion `markenbezug_entfernen(text)` vor, und
`automation/marken_nachahmung_guard.py` ruft sie beim Import auf.

Aufruf:  python3 automation/marken_nachahmung_bereinigen.py        (Probelauf, schreibt nichts)
         GO=1 python3 automation/marken_nachahmung_bereinigen.py   (schreibt)
"""
import json
import os
import re
import subprocess
import sys
import time
import unicodedata

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
GO = os.environ.get("GO") == "1"
LEDGER = "dropship/_marken_nachahmung.txt"

# ── Markennamen, die als Nachahmungs-Behauptung auftreten ────────────────────
# Wortgrenzen von Hand, weil \b vor «-» und deutschen Umlauten nicht das tut, was man denkt.
MARKEN = (r"Chanel|Gucci|Prada|Dior|Louis\s?Vuitton|Herm[eè]s|Hermes|Rolex|Balenciaga|"
          r"Versace|Burberry|Fendi|Givenchy|Valentino|Bottega\s?Veneta|Cartier|"
          r"Dr\.?\s?Martens|Doc\s?Martens|Birkenstock|Crocs|Converse|Supreme|Swarovski|"
          r"Bulgari|Bvlgari|Chopard|Louboutin|Jimmy\s?Choo|Michael\s?Kors|Tommy\s?Hilfiger|"
          r"New\s?Balance|Nike|Adidas|Puma|Timberland|Lululemon|Ray-?Ban|Moncler|"
          # «Barbie» erst nach der Live-Nachkontrolle ergänzt: die Handkorrektur für das
          # Nagelpuder-Set fasste nur SEO + URL an, im Fliesstext stand «Box im Barbie-Stil»
          # weiter. Die rechte Wortgrenze schützt den «Barbier» (Rasierbedarf im Sortiment).
          r"Barbie")
M = r"(?:" + MARKEN + r")"
G = r"(?<![\wäöüßÄÖÜ])"          # linke Wortgrenze, umlautfest
GR = r"(?![\wäöüßÄÖÜ])"         # rechte Wortgrenze

# ── Regeltabelle: je SATZBAUFORM eine Regel, Reihenfolge = Vorrang ──────────
# Die spezifischen Formen stehen oben; eine allgemeine Lösch-Regel ganz unten würde
# sonst «Er ist inspiriert von Chanel und besteht aus Polyester» zu
# «Er ist besteht aus Polyester» verstümmeln — genau der Fehler vom 12.08.
REGELN = [
    # ── Satzbau: Marke trägt das Verb/die Konjunktion mit ──────────────────
    (rf"{G}pr[äa]sentieren sich im\s+{M}[-\s]?Stil und\s+", ""),
    (rf",\s*d(?:ie|as|er) an den ikonischen\s+{M}[-\s]?Stil erinnert", ""),
    (rf"{G}ist inspiriert von\s+{M}\s+und\s+", ""),
    (rf"{G}ist von\s+{M}\s+inspiriert und\s+", ""),
    (rf",\s*inspiriert von\s+{M}{GR}", ""),
    (rf"{G}Inspiriert vom\s+{M}[-\s]?Stil,\s*verleiht sie{GR}", "Sie verleiht"),
    (rf"{G}von den klassischen\s+{M}-Designs inspiriert{GR}",
     "von klassischen Designs inspiriert"),
    # ── «X-inspiriert» in seinen Beugungen ────────────────────────────────
    (rf"{G}Klassisches\s+{M}-inspiriertes Design{GR}", "Klassisches Design"),
    (rf"{G}{M}-inspirierte und minimalistische{GR}", "klassische und minimalistische"),
    (rf"{G}{M}-inspiriertes Design{GR}", "Elegantes Design"),
    (rf"{G}{M}-inspirierter Stil{GR}", "Zeitloser Stil"),
    (rf"{G}f[üu]r\s+{M}-inspirierte Mode{GR}", "für elegante Mode"),
    (rf",\s*{M}-inspiriert(?=[<.\s]|$)", ""),
    (rf",\s*{M}-inspirierte[nmrs]{GR}", ""),
    (rf"{G}{M}-inspirier\w*\s+", ""),
    (rf"{G}{M}-[äa]hnliche[nmrs]?\s+", ""),
    # ── «im X-Stil» samt optionalem Adjektiv davor ────────────────────────
    (rf"\s*{G}im\s+(?:[\wäöüß]+en\s+)?{M}[-\s]?Stil{GR}", ""),
    (rf"\s*{G}im\s+(?:[\wäöüß]+en\s+)?{M}[-\s]?Style{GR}", ""),
    # ── Marke als Muster-/Farb-/Duftname in Aufzählungen ──────────────────
    (rf"{G}{M}[-\s]?Stil\s+(?=[a-zäöü])", ""),      # «Chanel-Stil vertikale Streifen»
    (rf"{G}{M}[-\s]?Design,\s*", ""),               # «Perlenkette, Chanel-Design, …»
    (rf",\s*{M}(?=,)", ""),                          # «Relief, Chopard, Schachbrett»
    (rf"{G}{M}\s+(?=(?:Orange|Schwarz|Blau|Gr[üu]n|Rot|Weiss|Wei[sß]|Gelb|Rosa|Lila|"
     rf"Braun|Grau|Silber|Gold|Beige|Night|Blossom))", ""),
]
REGELN = [(re.compile(a, re.I), b) for a, b in REGELN]

# Marken, die als Modellnummer/Fremdbezeichnung auftreten → nie anfassen (Regel 3/4).
AUSNAHMEN = re.compile(r"YSL[-\s]?STK|Off[-\s]?White|Tiffany\s?Blau|\bVans\b|"
                       r"Omega[-\s]?Fetts[äa]uren", re.I)


def markenbezug_entfernen(text):
    """Wendet die Regeltabelle an und räumt NUR die Nahtstelle auf (nie das Wortinnere, Regel 3).

    ⚠️ Fällt keine Regel, wird der Text unverändert zurückgegeben. Der erste Entwurf liess die
    Glättung über JEDE Beschreibung laufen — damit hätte der Lauf auch 9 Produkte umgeschrieben,
    an denen gar nichts zu beanstanden war (u. a. den YSL-STK-Controller aus der Ausnahmeliste).
    """
    if not text:
        return text
    n = text
    for rx, ersatz in REGELN:
        n = rx.sub(ersatz, n)
    if n == text:
        return text
    n = re.sub(r"[ \t]{2,}", " ", n)
    n = re.sub(r"[ \t]+([,.;:!?])", r"\1", n)
    n = re.sub(r"<(li|p)>[ \t]+", r"<\1>", n)
    n = re.sub(r"[ \t]+</(li|p)>", r"</\1>", n)
    # Stand der Markenname am Anfang eines Aufzählungspunktes («Dr. Martens-Stil mit
    # Schnürung …»), beginnt der Punkt nach dem Schnitt klein. Nur dort gross schreiben.
    n = re.sub(r"(<li>)([a-zäöü])", lambda m: m.group(1) + m.group(2).upper(), n)
    return n


# ── Handkorrekturen: Titel, die der Lauf vom 12.08. zerschnitten hat ────────
# Alle sechs sind live kundensichtbar kaputt. Die beiden Auto-Teile bekommen ihre
# KOMPATIBILITÄTSANGABE zurück (zulässig) — sie war der informative Teil des Titels.
TITEL_NEU = {
    "15447618978177": "Kissenbezug mit Quasten",                  # war «… im -Stil»
    "15448659755393": "Rundhals-Spitzentop",                      # war «… im -Stil»
    "15448704811393": "Warmer Strick-Cardigan",                   # war «… im -Stil»
    "15449113166209": "Herren Übergangsjacke",                    # war «… im -Stil»
    "15479377133953": "Lenkradblende für Mercedes-Benz",          # war «… für -Benz»
    "15479636787585": "TPU Silikon Schlüsselhülle für BMW",       # war «… für»
    "15455759565185": "Westenkleid mit Perlenblüten-Brosche",     # war «Look Perlenblüten-…»
    "15485407691137": "Damenbluse mit langen Ärmeln · Slim Fit",  # war «… im Chanel-Stil»
}

# Sätze, bei denen eine Regel den Satz zerstören würde → wörtlicher Austausch.
TEXT_SONDERFALL = {
    # «Die Farben reichen von Zebra-Weiss über Sketch Lines, Velvet Lines bis hin zu
    #  Chanel Style.» — Löschen liesse «bis hin zu .» stehen. Letztes Listenglied entfällt.
    "15484424520065": [("Sketch Lines, Velvet Lines bis hin zu Chanel Style",
                        "Sketch Lines bis hin zu Velvet Lines")],
}

# ── Nachtrag: das FÜNFTE Feld, das niemand geprüft hat ───────────────────────
# Die erste Live-Nachkontrolle (curl auf die Produktseite) fand «Chanel» weiter im
# gerenderten HTML — in den BILD-ALT-TEXTEN. Die werden aus dem Produkttitel erzeugt
# («<Titel> – Ansicht 3»), also trugen sie den alten, markenhaltigen Titel weiter.
# 27 Bilder in 5 Produkten. Alt-Texte liest Google Images, und der Merchant-Crawler
# sieht sie im Quelltext. Genau die Lehre aus CLAUDE.md, eine Feldebene tiefer.

# ── Nachtrag 2: zwei Produkte aus dem Ledger vom 12.08. ──────────────────────
# _google_kanal_gesaeubert*.txt listet 13 «fremde-marke-im-titel». Bei diesen beiden
# wurde der Titel gesäubert, Handle und SEO-Felder blieben stehen. Sie stehen NICHT in
# der allgemeinen Regeltabelle, weil «Mercedes-Benz» dort nicht auftauchen darf: bei der
# Lenkradblende ist es eine zulässige Kompatibilitätsangabe. Bei einer Ledertasche ist
# «Mercedes-Benz» dagegen eine Markenanmassung. Deshalb hier namentlich, mit festen Werten.
ZUSATZ = {
    "15485009953153": {          # «Mercedes-Benz Echtleder Umhängetasche» → Tasche, kein Autoteil
        "seoTitle": "Echtleder Umhängetasche für Herren | LuxeStyle CH",
        "seoDesc": "Echtleder Umhängetasche für Herren – bei LuxeStyle Schweiz. "
                   "Gratis-Versand ab CHF 50, 30 Tage Rückgabe.",
        "handle": "echtleder-umhaengetasche-fuer-herren-612500",
    },
    "15493476516225": {          # «12 Neon-Nagelpuder im Barbie-Stil Set»
        "seoDesc": "12 Neon-Nagelpuder Set – bei LuxeStyle Schweiz. "
                   "Gratis-Versand ab CHF 50, 30 Tage Rückgabe.",
        "handle": "12-neon-nagelpuder-set-623300",
    },
}
# Alt-Texte dieser beiden zusätzlich gegen ihre eigenen Marken prüfen.
ALT_ZUSATZ = re.compile(r"(?<![\wäöüß])(Mercedes[- ]?Benz|Barbie)(?![\wäöüß])", re.I)

# Varianten-Optionswerte, die den Markennamen im Kaufblock tragen.
OPTIONSWERT_NEU = {
    "15455745180033": {"Chanel style": "Tweed-Optik"},
    "15467043094913": {"Hermes Orange": "Orange"},
    "15448876220801": {"Hermes-38mm40mm41mm": "Ledergeflecht-38mm40mm41mm"},
}

# Echte Markenware mit Lieferantennachweis — nie anfassen.
def echte_markenware(p):
    return any((v.get("sku") or "").lower().startswith("bb-")
               for v in p["variants"]["nodes"])


def gql(q, v=None, versuche=6):
    with open("/tmp/_mnb.json", "w") as f:
        json.dump({"query": q, "variables": v or {}}, f)
    for _ in range(versuche):
        r = subprocess.run(["curl", "-s", "--max-time", "70", URL,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mnb.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if d.get("data") is not None and not d.get("errors"):
            return d
        if d.get("errors") and "THROTTLED" not in json.dumps(d["errors"]).upper():
            return d
        time.sleep(7)
    return None            # Regel 6: keine Antwort ist kein Ergebnis


def slug(t):
    s = unicodedata.normalize("NFKD", t.lower())
    s = (s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:70].strip("-")


RX_MARKE = re.compile(rf"{G}{M}{GR}", re.I)


def marke_drin(text):
    if not text:
        return []
    t = AUSNAHMEN.sub(" ", text)
    return sorted({m.group(0) for m in RX_MARKE.finditer(t)})


Q_HOLEN = """query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title handle status
  descriptionHtml seo{title description} options{id name optionValues{id name}}
  variants(first:5){nodes{sku}} media(first:30){nodes{ id alt }} } } }"""

Q_ALT = """mutation($f:[FileUpdateInput!]!){ fileUpdate(files:$f){
  userErrors{ field message } } }"""


Q_MF = """query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title
  metafields(first:30){nodes{ id namespace key value type }} } } }"""

Q_MF_SET = """mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){
  userErrors{ field message } } }"""


def judgeme_cache_bereinigen(live, erledigt):
    """Das SECHSTE Feld: judgeme.review_widget_data.

    Die zweite Live-Nachkontrolle fand «Chanel» weiter im gerenderten HTML — diesmal in
    einem Metafeld, das die Judge.me-App auf dem Produkt zwischenspeichert und das der
    Bewertungs-Baustein wörtlich in die Seite schreibt. Judge.mes eigener Datensatz war zu
    diesem Zeitpunkt schon korrekt (per API geprüft), nur der Zwischenspeicher im Shop war
    zwei Tage alt — bei «Flache Damen-Stiefeletten im Dr. Martens Stil» sogar seit dem
    12.08. Nur das Feld product_name wird ersetzt, der Rest des JSON bleibt unangetastet;
    schreibt Judge.me den Speicher später neu, schreibt es ohnehin den richtigen Titel.
    """
    plan = []
    for pid, p in sorted(live.items()):
        if p["status"] != "ACTIVE" or echte_markenware(p) or ("jdgm:" + pid) in erledigt:
            continue
        for mf in p.get("_mf", []):
            if mf["namespace"] != "judgeme" or mf["key"] != "review_widget_data":
                continue
            try:
                daten = json.loads(mf["value"])
            except Exception:
                continue
            alt_name = daten.get("product_name") or ""
            if alt_name == p["title"] or not (marke_drin(alt_name)
                                              or ALT_ZUSATZ.search(alt_name)):
                continue
            daten["product_name"] = p["title"]
            plan.append((pid, alt_name, p["title"],
                         json.dumps(daten, ensure_ascii=False), mf["type"]))
    return plan


def alt_texte_bereinigen(live, erledigt):
    """Bild-Alt-Texte tragen den alten Titel weiter — eigener Durchgang, eigenes Ledger."""
    plan = []
    for pid, p in sorted(live.items()):
        if p["status"] != "ACTIVE" or echte_markenware(p) or ("alt:" + pid) in erledigt:
            continue
        neu = []
        for md in p["media"]["nodes"]:
            a = md.get("alt")
            if not a:
                continue
            n = markenbezug_entfernen(a)
            n = ALT_ZUSATZ.sub("", n) if pid in ZUSATZ else n
            n = re.sub(r"[ \t]{2,}", " ", n).strip(" ·–-")
            if n != a:
                neu.append((md["id"], a, n))
        if neu:
            plan.append((pid, p["title"], neu))
    return plan

Q_SCHREIBEN = """mutation($in:ProductInput!){ productUpdate(input:$in){
  product{ id title handle seo{title description} } userErrors{ field message } } }"""

Q_OPTION = """mutation($p:ID!,$o:ID!,$vals:[OptionValueUpdateInput!]){
  productOptionUpdate(productId:$p, option:{id:$o}, optionValuesToUpdate:$vals){
    userErrors{ field message } } }"""


def main():
    ids = sorted(set(json.load(open(sys.argv[1] if len(sys.argv) > 1
                                    else "/tmp/marken_ids.json"))))
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[0] for z in open(LEDGER) if z.strip()}

    live = {}
    for i in range(0, len(ids), 20):
        d = gql(Q_HOLEN, {"ids": ["gid://shopify/Product/" + x for x in ids[i:i + 20]]})
        if not d:
            print("ABBRUCH: Shopify antwortet nicht — nichts geschrieben.")
            return 1
        for n in d["data"]["nodes"]:
            if n:
                live[n["id"].split("/")[-1]] = n
    for i in range(0, len(ids), 10):                      # Metafelder separat (Kostenlimit)
        d = gql(Q_MF, {"ids": ["gid://shopify/Product/" + x for x in ids[i:i + 10]]})
        if not d:
            print("ABBRUCH: Metafelder nicht lesbar — nichts geschrieben.")
            return 1
        for n in d["data"]["nodes"]:
            if n and n["id"].split("/")[-1] in live:
                live[n["id"].split("/")[-1]]["_mf"] = n["metafields"]["nodes"]

    plan, uebersprungen = [], []
    for pid, p in sorted(live.items()):
        if pid in erledigt:
            continue
        if p["status"] != "ACTIVE":
            uebersprungen.append((pid, p["title"], "nicht aktiv"))
            continue
        if echte_markenware(p):
            uebersprungen.append((pid, p["title"], "echte Markenware (bb-SKU)"))
            continue

        alt = {"title": p["title"], "descriptionHtml": p["descriptionHtml"],
               "seoTitle": (p["seo"] or {}).get("title") or "",
               "seoDesc": (p["seo"] or {}).get("description") or ""}
        neu = dict(alt)

        for such, ers in TEXT_SONDERFALL.get(pid, []):
            neu["descriptionHtml"] = neu["descriptionHtml"].replace(such, ers)
        neu["descriptionHtml"] = markenbezug_entfernen(neu["descriptionHtml"])
        neu["title"] = TITEL_NEU.get(pid) or markenbezug_entfernen(alt["title"])

        # SEO-Beschreibung folgt einer Vorlage «<Titel> – <Versprechen>» bzw.
        # «<Titel>: jetzt im …» → Kopf durch den neuen Titel ersetzen, Rest behalten.
        for feld, muster in (("seoDesc", r"^(.*?)(\s+[–-]\s+(?:bei|jetzt)\s.*|:\s+jetzt\s.*)$"),):
            wert = alt[feld]
            if not wert:
                continue
            m = re.match(muster, wert, re.S)
            if m and marke_drin(m.group(1)):
                neu[feld] = neu["title"] + " " + m.group(2).strip()
            else:
                neu[feld] = markenbezug_entfernen(wert)
        if alt["seoTitle"]:
            neu["seoTitle"] = (neu["title"] + " | LuxeStyle CH"
                               if marke_drin(alt["seoTitle"])
                               else markenbezug_entfernen(alt["seoTitle"]))

        # Handle: Markenglied raus, Zahlensuffix behalten (garantiert Eindeutigkeit).
        neu_handle = p["handle"]
        if marke_drin(p["handle"].replace("-", " ")):
            suffix = re.search(r"-(\d{3,})$", p["handle"])
            neu_handle = slug(neu["title"]) + (suffix.group(0) if suffix else "")

        for feld, wert in ZUSATZ.get(pid, {}).items():   # namentliche Festwerte
            if feld == "handle":
                neu_handle = wert
            else:
                neu[feld] = wert

        opt = OPTIONSWERT_NEU.get(pid, {})
        aenderungen = {k: (alt[k], neu[k]) for k in alt if alt[k] != neu[k]}
        if neu_handle != p["handle"]:
            aenderungen["handle"] = (p["handle"], neu_handle)
        if not aenderungen and not opt:
            uebersprungen.append((pid, p["title"], "keine Markenstelle mehr (bereits sauber)"))
            continue
        plan.append((pid, p, alt, neu, neu_handle, opt, aenderungen))

    # ── Probelauf-Ausgabe: jede Änderung im Satz zeigen ────────────────────
    print(f"\n{'=' * 78}\nPLAN: {len(plan)} Produkte ändern · "
          f"{len(uebersprungen)} bewusst übersprungen\n{'=' * 78}")
    for pid, p, alt, neu, nh, opt, ae in plan:
        print(f"\n── {pid}  {p['title'][:60]}")
        for feld, (a, b) in ae.items():
            if feld == "descriptionHtml":
                for satz_a, satz_b in _diffsaetze(a, b):
                    print(f"   TEXT  – {satz_a}")
                    print(f"         + {satz_b}")
            else:
                print(f"   {feld:12s} – {a[:110]}")
                print(f"   {'':12s} + {b[:110]}")
        for k, v in opt.items():
            print(f"   OPTION       – {k}\n   {'':12s} + {v}")
        rest = (marke_drin(neu["title"]) + marke_drin(neu["descriptionHtml"])
                + marke_drin(neu["seoTitle"]) + marke_drin(neu["seoDesc"])
                + marke_drin(nh.replace("-", " ")))
        if rest:
            print(f"   ⚠️  REST NACH REGELN: {sorted(set(rest))}")
    altplan = alt_texte_bereinigen(live, erledigt)
    print(f"\n── Bild-Alt-Texte: {len(altplan)} Produkte · "
          f"{sum(len(x[2]) for x in altplan)} Bilder " + "─" * 20)
    for pid, titel, neu in altplan:
        print(f"   {pid}  {titel[:45]}")
        for _, a, n in neu[:3]:
            print(f"      – {a[:95]}\n      + {n[:95]}")

    jdgmplan = judgeme_cache_bereinigen(live, erledigt)
    print(f"\n── Judge.me-Zwischenspeicher: {len(jdgmplan)} Produkte " + "─" * 25)
    for pid, alt_n, neu_n, _, _ in jdgmplan:
        print(f"   {pid}  – {alt_n[:70]}\n   {'':14s}+ {neu_n[:70]}")

    print("\n── bewusst NICHT angefasst " + "─" * 45)
    for pid, t, grund in uebersprungen:
        print(f"   {pid}  {t[:52]:54s} {grund}")

    if not GO:
        print(f"\nPROBELAUF — nichts geschrieben. Mit GO=1 scharf schalten.")
        return 0

    # ── Scharf ────────────────────────────────────────────────────────────
    led = open(LEDGER, "a")
    ok = fehler = 0
    for pid, p, alt, neu, nh, opt, ae in plan:
        eingabe = {"id": p["id"], "title": neu["title"],
                   "descriptionHtml": neu["descriptionHtml"]}
        if neu["seoTitle"] or neu["seoDesc"]:
            eingabe["seo"] = {}
            if alt["seoTitle"]:
                eingabe["seo"]["title"] = neu["seoTitle"]
            if alt["seoDesc"]:
                eingabe["seo"]["description"] = neu["seoDesc"]
        if nh != p["handle"]:
            eingabe["handle"] = nh
            eingabe["redirectNewHandle"] = True      # alte URL bleibt per 301 erreichbar
        d = gql(Q_SCHREIBEN, {"in": eingabe})
        if not d or d["data"]["productUpdate"]["userErrors"]:
            print(f"✗ {pid}: {d and d['data']['productUpdate']['userErrors']}")
            fehler += 1
            continue

        for o in p["options"]:
            treffer = [{"id": ov["id"], "name": opt[ov["name"]]}
                       for ov in o["optionValues"] if ov["name"] in opt]
            if treffer:
                r = gql(Q_OPTION, {"p": p["id"], "o": o["id"], "vals": treffer})
                ue = (r or {}).get("data", {}).get("productOptionUpdate", {}).get("userErrors")
                if ue:
                    print(f"  ⚠️ Optionswert {pid}: {ue}")

        # Regel 6: erst gegenprüfen, dann quittieren.
        v = gql(Q_HOLEN, {"ids": [p["id"]]})
        if not v:
            print(f"  ⚠️ {pid} geschrieben, aber Nachkontrolle ohne Antwort → nicht quittiert")
            fehler += 1
            continue
        n = v["data"]["nodes"][0]
        rest = (marke_drin(n["title"]) + marke_drin(n["descriptionHtml"])
                + marke_drin((n["seo"] or {}).get("title"))
                + marke_drin((n["seo"] or {}).get("description"))
                + marke_drin(n["handle"].replace("-", " ")))
        if rest:
            print(f"  ⚠️ {pid} noch Markenrest live: {sorted(set(rest))} → nicht quittiert")
            fehler += 1
            continue
        led.write(f"{pid}\t{n['title']}\t{n['handle']}\n")
        led.flush()                                   # Regel 5
        os.fsync(led.fileno())
        ok += 1
        print(f"✓ {pid}  {n['title'][:55]}")
        time.sleep(0.3)

    # ── Bild-Alt-Texte ────────────────────────────────────────────────────
    for pid, titel, neu in altplan:
        r = gql(Q_ALT, {"f": [{"id": mid, "alt": n} for mid, _, n in neu]})
        ue = (r or {}).get("data", {}).get("fileUpdate", {}).get("userErrors")
        if not r or ue:
            print(f"✗ ALT {pid}: {ue if r else 'keine Antwort'}")
            fehler += 1
            continue
        v = gql(Q_HOLEN, {"ids": ["gid://shopify/Product/" + pid]})
        if not v:
            print(f"  ⚠️ ALT {pid} ohne Nachkontrolle → nicht quittiert")
            fehler += 1
            continue
        rest = [a for a in (m.get("alt") for m in v["data"]["nodes"][0]["media"]["nodes"])
                if a and (marke_drin(a) or ALT_ZUSATZ.search(a))]
        if rest:
            print(f"  ⚠️ ALT {pid} noch Markenrest: {rest[:2]} → nicht quittiert")
            fehler += 1
            continue
        led.write(f"alt:{pid}\t{len(neu)} Bilder\t{titel}\n")
        led.flush()
        os.fsync(led.fileno())
        ok += 1
        print(f"✓ ALT {pid}  {len(neu)} Bilder  {titel[:45]}")
        time.sleep(0.3)

    # ── Judge.me-Zwischenspeicher ─────────────────────────────────────────
    for pid, alt_n, neu_n, wert, typ in jdgmplan:
        r = gql(Q_MF_SET, {"mf": [{"ownerId": "gid://shopify/Product/" + pid,
                                   "namespace": "judgeme", "key": "review_widget_data",
                                   "type": typ or "json", "value": wert}]})
        ue = (r or {}).get("data", {}).get("metafieldsSet", {}).get("userErrors")
        if not r or ue:
            print(f"✗ JDGM {pid}: {ue if r else 'keine Antwort'}")
            fehler += 1
            continue
        v = gql(Q_MF, {"ids": ["gid://shopify/Product/" + pid]})
        if not v:
            print(f"  ⚠️ JDGM {pid} ohne Nachkontrolle → nicht quittiert")
            fehler += 1
            continue
        rest = [m["value"] for m in v["data"]["nodes"][0]["metafields"]["nodes"]
                if m["key"] == "review_widget_data"
                and (marke_drin(m["value"]) or ALT_ZUSATZ.search(m["value"]))]
        if rest:
            print(f"  ⚠️ JDGM {pid} noch Markenrest → nicht quittiert")
            fehler += 1
            continue
        led.write(f"jdgm:{pid}\t{alt_n}\t→ {neu_n}\n")
        led.flush()
        os.fsync(led.fileno())
        ok += 1
        print(f"✓ JDGM {pid}  {neu_n[:50]}")
        time.sleep(0.3)
    led.close()
    print(f"\nFertig: {ok} bereinigt · {fehler} offen (werden beim nächsten Lauf erneut versucht)")
    return 0


def _diffsaetze(a, b):
    """Zeigt nur die Sätze, die sich unterscheiden — nicht die ganze Beschreibung."""
    def saetze(x):
        x = re.sub(r"<[^>]+>", "\n", x)
        return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n", x) if s.strip()]
    sa, sb = saetze(a), saetze(b)
    raus = []
    for s in sa:
        if s not in sb:
            treffer = [t for t in sb if t not in sa and _aehnlich(s, t)]
            raus.append((s[:150], (treffer[0][:150] if treffer else "‹Satz entfällt›")))
    return raus[:4]


def _aehnlich(a, b):
    wa, wb = set(a.lower().split()), set(b.lower().split())
    return len(wa & wb) >= max(2, min(len(wa), len(wb)) // 3)


if __name__ == "__main__":
    sys.exit(main())
