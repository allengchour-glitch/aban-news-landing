#!/usr/bin/env python3
"""kassen_lieferdatum_wache.py — verspricht die Kasse ein früheres Lieferdatum, als die Ware braucht? (10.10.2026)

ANLASS (Kaufweg-Test am Handy, tools/kaufweg_handy.mjs): Produktseite «Lieferung voraussichtlich 26. Okt. – 9. Nov.», Kasse
«Voraussichtliche Zustellung Di., 20. Okt». Das Kassen-Datum entsteht aus `deliveryPromiseSettings.processingTime` (stand P1D) +
Transitzeit des Tarifs. Die TikTok-Lernkampagne brachte 6 Besucherinnen bis in die Kasse, 0 kauften. Schreibbar ist die
Bearbeitungszeit NUR im Admin (Einstellungen → Versand und Zustellung) — auch `unstable` hat dafür keine Mutation.
NACHTRAG 10.10. 17:30 (Handy-Bilder des Betreibers): Modus stand auf «Automatisiert» = Prognose aus dem Fulfillment-Verlauf, ERSETZT die
Transportzeit. Richtig ist «Manuell» (Fulfillment-Zeit + Transportzeit 10–20 T). Der Modus ist per API NICHT lesbar; P3D belegt die Umstellung.

MISST: Bearbeitungszeit (Shopify) gegen die echte Versanddauer = Werktage von Bestellung bis zur ersten Sendung mit
Sendungsnummer, über die letzten Bestellungen mit CJ-Ware (SKU CJ…/Zusteller CJPacket/YunExpress; ohne Druck-auf-Bestellung,
ohne CH-Lager). Liegt die Einstellung unter dem Median, ist das Kassen-Datum zu früh.
Schreibt dropship/_kassen_lieferdatum.json (liest betreiber_ampel.kassen_lieferdatum). Ändert NICHTS im Shop.

NACHTRAG 13.10.2026 abends (A7, Verbesserungsrunde Spur A): Produktseite (templates/product.json, Block lux_delivery) und
Warenkorb (templates/cart.json, Block lux_cart_trust) rechnen das Lieferdatum seit heute wie die Kasse (Marke LUX-KASSENDATUM):
Werktage Mo–Fr, Annahmeschluss 12 Uhr, Bearbeitung + Transit. Die Zahlen sind im Theme FEST eingebaut: «N | plus: lx_tmin» =
Bearbeitung (seit 13.10. 17:00 P1D, davor P3D), CH-Lager lx_tmin/lx_tmax 1/2 = Profil «CH-Lager» CH 2–3 minus Bearbeitung, Asien
9/19 = Zone CH 10–20 minus Bearbeitung (automation/data/versand_transit_regel.json). Das kurze CH-Lager-Datum gilt nur mit Tag
«profil-ch-lager» (setzt ch_lager_profil.py; ohne Zeichen rechnet die Kasse das General profile = Asien-Zeiten). Ändert jemand die Bearbeitungszeit (Admin) oder die Transitregel, wird
die Seite still falsch → diese Wache liest beide Live-Dateien und meldet «⚠️ KASSEN-DATUM THEME» (Ampel).
  python3 automation/kassen_lieferdatum_wache.py
  python3 automation/kassen_lieferdatum_wache.py --selbsttest   # Theme-Prüfung offline: P3D ok, P2D je Datei ⚠️

NACHTRAG 13.10.2026 spät (VERB-M1, Prüfung «ZUSAGE CH-LAGER»): Die Kasse rechnet für Ware im Profil «CH-Lager» Bearbeitung
P1D + Transit 1–2 = 2–3 Werktage (profile_zonen in data/versand_transit_regel.json). Versandrichtlinie, KB-Fakt, 23 Seiten, 22
Artikel, 13 Kollektionsfelder, das Theme (Startseiten-Meta in snippets/meta-tags.liquid, FAQ in templates/collection.json) und
1'611 Fortura-Produkttexte versprachen noch «1–2 Werktage». Diese Prüfung liest die Soll-Spanne aus profile_zonen und sucht
jede kürzere Zusage in Richtlinien, Seiten (Text + SEO), Artikeln (Text, Auszug, SEO), Kollektionen (Text + SEO), KB-Metaobjekten,
Theme (meta-tags.liquid, templates/*.json, sections/*.liquid — ohne Kommentare), Social-Vorlagen (wartende Bildposts + Laden-Zeile)
und den Fortura-Importern. Ampel nur bei Treffer (Feld «zusage_ch_lager» in _kassen_lieferdatum.json).
Produkttexte mit Tag «profil-ch-lager» korrigiert die Wache SELBST in Tageschargen (höchstens 300, Zeitbudget, gemeinsames
Text-Schloss /tmp/lock_produkttext.lock, Ledger dropship/_lieferzeit_ch_lager_ledger.jsonl mit Altwert = Rückweg). Ware OHNE
das Zeichen (Stufe 1/2, Google-Kanal) bleibt bis Stufe 3 von ch_lager_profil.py unberührt — dann trägt sie das Zeichen und
fällt von selbst in die Charge (jedes Produkt wird nur EINMAL geändert). ZUSAGE_CHARGE=0 schaltet das Schreiben ab.
  python3 automation/kassen_lieferdatum_wache.py --zusage-liste            # nur lesen: jede Fundstelle (Trockenlauf-Liste)
  python3 automation/kassen_lieferdatum_wache.py --zusage-charge [N]       # nur lesen: was die Charge schreiben würde
  SCHARF=1 python3 automation/kassen_lieferdatum_wache.py --zusage-charge N  # Charge von Hand
  python3 automation/kassen_lieferdatum_wache.py --zusage-zurueck            # Rückweg aus dem Ledger (nur mit SCHARF=1)
"""
import datetime as dt, fcntl, json, os, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

STAND = os.path.join(REPO, "dropship", "_kassen_lieferdatum.json")
CJ_SKU = re.compile(r"^CJ", re.I)
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
MARKE = "LUX-KASSENDATUM"
# 13.10.2026 abends: CH-Lager-Ware AUSSERHALB des Profils «CH-Lager» (Stufe 1/2: Google-Kanal) rechnet die Kasse mit dem
# General profile (Direktversand-Zeiten). Das Theme darf das kurze Datum nur Produkten mit diesem Zeichen zeigen;
# ch_lager_profil.py setzt/entfernt es passend zum Profil-Inhalt.
PROFIL_ZEICHEN = "profil-ch-lager"
THEME_DATEIEN = ("templates/product.json", "templates/cart.json")
TRANSIT_REGEL = os.path.join(HIER, "data", "versand_transit_regel.json")
# Liquid-Stellen (13.10.2026): Bearbeitung · CH-Lager-Zweig (Stufe ≥ 1, sonst General profile) · Asien-Zweig
RE_VON = re.compile(r"assign lx_von = (\d+) \| plus: lx_tmin")
RE_CH = re.compile(r"lx_stufe >= 1 -%\}\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}"
                   r"\{%- else -%\}\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}")
RE_ASIEN = re.compile(r"\{%- else -%\}\s*\{%- assign lx_tmin = (\d+) -%\}\{%- assign lx_tmax = (\d+) -%\}\s*"
                      r"\{%- assign (?:lager|lux_lager) = 'Direktversand")


def tage(iso):
    m = re.fullmatch(r"P(\d+)D", iso or "")
    return int(m.group(1)) if m else None


def theme_soll(bearb, regel):
    """Was im Theme stehen muss: Transit = Zusage (versand_transit_regel.json) − Bearbeitung."""
    ch = ((regel.get("profile_zonen") or {}).get("CH-Lager") or {}).get("CH") or {}
    z = regel["zonen"]["CH"]
    return {"bearb": bearb,
            "ch_lager": (ch["min_tage"] - bearb, ch["max_tage"] - bearb) if ch else None,
            "asien": (z["min_tage"] - bearb, z["max_tage"] - bearb)}


def marken_text(datei_text):
    """Alle Liquid-Strings einer Theme-JSON-Datei mit der Marke (Kommentarkopf /* … */ wird übersprungen)."""
    k = datei_text.find("{", datei_text.find("*/") + 2 if datei_text.lstrip().startswith("/*") else 0)
    gefunden = []

    def lauf(x):
        if isinstance(x, dict):
            for v in x.values():
                lauf(v)
        elif isinstance(x, list):
            for v in x:
                lauf(v)
        elif isinstance(x, str) and MARKE in x:
            gefunden.append(x)
    lauf(json.loads(datei_text[k:]))
    return "\n".join(gefunden)


def theme_pruefen(texte, bearb, regel):
    """texte = {dateiname: Rohtext der Live-Datei}. → Liste Befunde (leer = Seite rechnet wie die Kasse)."""
    soll = theme_soll(bearb, regel)
    befunde = []
    for name in THEME_DATEIEN:
        roh = texte.get(name)
        if roh is None:
            befunde.append(f"{name}: nicht lesbar"); continue
        try:
            t = marken_text(roh)
        except Exception as e:  # noqa: BLE001
            befunde.append(f"{name}: JSON unlesbar ({type(e).__name__})"); continue
        if not t:
            befunde.append(f"{name}: Marke {MARKE} fehlt (Theme-Editor/Update überschrieben?)"); continue
        if PROFIL_ZEICHEN not in t:
            befunde.append(f"{name}: Zeichen «{PROFIL_ZEICHEN}» fehlt — CH-Lager-Ware ausserhalb des Profils zeigt ein zu frühes Datum")
        von = [int(x) for x in RE_VON.findall(t)]
        if len(von) != 1:
            befunde.append(f"{name}: Bearbeitungs-Stelle «N | plus: lx_tmin» {len(von)}× (erwartet 1)")
        elif von[0] != bearb:
            befunde.append(f"{name}: Theme rechnet Bearbeitung {von[0]} T, Shop-Einstellung P{bearb}D")
        ch = RE_CH.findall(t)
        if len(ch) != 1:
            befunde.append(f"{name}: CH-Lager-Zweig {len(ch)}× (erwartet 1)")
        else:
            a, b, ga, gb = map(int, ch[0])
            if soll["ch_lager"] and (a, b) != soll["ch_lager"]:
                befunde.append(f"{name}: CH-Lager Transit {a}/{b} T, Profil «CH-Lager» verlangt {soll['ch_lager'][0]}/{soll['ch_lager'][1]}")
            if (ga, gb) != soll["asien"]:
                befunde.append(f"{name}: CH-Lager ohne Profil (Stufe 0) {ga}/{gb} T, Zone CH verlangt {soll['asien'][0]}/{soll['asien'][1]}")
        asien = RE_ASIEN.findall(t)
        if len(asien) != 1:
            befunde.append(f"{name}: Asien-Zweig {len(asien)}× (erwartet 1)")
        elif tuple(map(int, asien[0])) != soll["asien"]:
            befunde.append(f"{name}: Asien Transit {asien[0][0]}/{asien[0][1]} T, Zone CH verlangt {soll['asien'][0]}/{soll['asien'][1]}")
    return befunde


def theme_live(bearb):
    """Beide Live-Dateien aus MAIN lesen und prüfen → (befunde, md5)."""
    r = gql('query($id:ID!,$f:[String!]!){theme(id:$id){role files(filenames:$f,first:5){nodes{filename checksumMd5 '
            'body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"id": THEME, "f": list(THEME_DATEIEN)})["theme"]
    texte = {n["filename"]: n["body"]["content"] for n in r["files"]["nodes"]}
    md5 = {n["filename"]: n["checksumMd5"] for n in r["files"]["nodes"]}
    befunde = [] if r["role"] == "MAIN" else [f"Theme nicht MAIN ({r['role']})"]
    if bearb is None:
        return befunde + ["Bearbeitungszeit nicht lesbar"], md5
    return befunde + theme_pruefen(texte, bearb, json.load(open(TRANSIT_REGEL, encoding="utf-8"))), md5


# ---------------------------------------------------------------- ZUSAGE CH-LAGER (13.10.2026, VERB-M1)
ZUSAGE_LEDGER = os.path.join(REPO, "dropship", "_lieferzeit_ch_lager_ledger.jsonl")
TEXT_SCHLOSS = "/tmp/lock_produkttext.lock"          # EIN Schloss für alle Schreiber auf descriptionHtml (03.09.2026)
ZUSAGE_THEME = ["snippets/meta-tags.liquid", "templates/*.json", "sections/*.liquid"]
ZUSAGE_SOCIAL = (os.path.join("social", "posts_image.csv"),)
ZUSAGE_QUELLTEXT = ("automation/bild_queue_captions_ehrlich.py", "automation/tiktok_karussell.py", "automation/queue_new_products.mjs",
                    "automation/fortura_import.mjs", "automation/fortura_import_grouped.mjs", "automation/fortura_enrich_live.mjs",
                    "automation/fortura_cat.mjs", "automation/reel/promo_montage.py")
_ZB = r'(?:–|-|‑|−|—|&ndash;|&#8211;|\\u2013|bis)'
_ZZ = r'(?<!\d)(?<!\d[.,])([1-9])\s*' + _ZB + r'\s*([1-9])(?!\d|[.,]\d)'
_ZT = r'(?:\s|</?(?:strong|b|em|span)[^>]*>|&nbsp;)*'
_ZKONTEXT = re.compile(r'Schweizer\s+Lager|CH-Lager|CH-Lieferung|aus\s+der\s+Schweiz|Blitzversand|Swiss\s+warehouse|stock\s+suisse|'
                       r'magazzino\s+svizzero|in\s+der\s+Schweiz\s+liegen', re.I)
_ZNICHT = re.compile(r'Antwort|antworten|Rückmeldung|Bearbeitung|melden uns|Akku', re.I)   # Zeiten, die keine Lieferzusage sind
ZUSAGE_RE = [
    # 1) «1–2 Werktage» / «<strong>1&ndash;2 Werktage</strong>» / «1-2 business days» / «1–2 jours ouvrés» (nie «… länger»)
    re.compile(_ZZ + _ZT + r'(?:Werktag|business\s+day|jours?\s+ouvr|giorni\s+lavorativ)(?!\w*' + _ZT + r'länger)', re.I),
    # 2) «in 1–2 Tagen» / «in nur 1–2 Werktagen»
    re.compile(r'\bin' + _ZT + r'(?:nur' + _ZT + r')?' + _ZZ + _ZT + r'(?:Werk)?[Tt]agen?\b(?!' + _ZT + r'länger)'),
    # 3) «1–2 bis 10–20 Werktage» / «1–2 bis 20 Werktage»
    re.compile(_ZZ + r'\s*bis\s*(?:\d{1,2}\s*(?:–|-|&ndash;)\s*)?\d{1,2}' + _ZT + r'(?:Werk)?[Tt]age'),
    # 4) «CH-Lager, 1–2 Tage» / «(1–2 from our Swiss warehouse)» / «ab Schweizer Lager 1–2, sonst …» — nur mit CH-Lager-Wort daneben
    re.compile(_ZZ + r'(?=' + _ZT + r'(?:Tage\b|Tagen\b|days?\b|jours?\b|giorni\b|from\b|depuis\b|dal\b|,\s*sonst|\)))'),
]


# 5) ausgeschrieben (Sprechertext der Reels): «in ein bis zwei Werktagen»
_ZWORT = re.compile(r'\bein(?:em)?\s+bis\s+zwei\s+(?:Werk)?[Tt]agen?\b(?!\s+länger)')


def zusage_soll(regel=None):
    """(min, max) Werktage, die die Kasse für Ware im Profil «CH-Lager» zeigt (profile_zonen, Gesamt-Zusage)."""
    regel = regel or json.load(open(TRANSIT_REGEL, encoding="utf-8"))
    ch = ((regel.get("profile_zonen") or {}).get("CH-Lager") or {}).get("CH") or {}
    return (int(ch.get("min_tage", 2)), int(ch.get("max_tage", 3)))


def zusage_treffer(text, soll=(2, 3)):
    """Alle Stellen, die ab CH-Lager eine KÜRZERE Lieferzeit versprechen als die Kasse (erste Zahl unter soll[0])."""
    t = text or ""
    gef = []
    for i, r in enumerate(ZUSAGE_RE):
        for m in r.finditer(t):
            # Treffer nur, wenn die GANZE Spanne höchstens beim Kassen-Minimum liegt («1–2» bei Soll 2–3) — «1–3 Werktage, bis das
            # Paket unterwegs ist» (Bearbeitung Direktversand, /pages/tracking) und «2–3» bleiben draussen.
            if int(m.group(1)) >= soll[0] or int(m.group(2)) > soll[0] or int(m.group(2)) < int(m.group(1)):
                continue
            vor = t[max(0, m.start() - 45):m.start()]
            if _ZNICHT.search(vor):
                continue
            if i == 3:
                if not _ZKONTEXT.search(t[max(0, m.start() - 80):m.end() + 60]):
                    continue
                if re.match(_ZT + r'(?:Tage|Tagen)\b' + _ZT + r'länger', t[m.end():]):
                    continue
            gef.append((m.start(1), re.sub(r'\s+', ' ', t[max(0, m.start() - 45):m.end() + 35])))   # Ort der Zahl (dedupe)
    if soll[0] >= 2:
        for m in _ZWORT.finditer(t):
            if not _ZNICHT.search(t[max(0, m.start() - 45):m.start()]):
                gef.append((m.start(), re.sub(r'\s+', ' ', t[max(0, m.start() - 45):m.end() + 35])))
    aus, gesehen = [], []
    for s, c in sorted(gef):
        if any(abs(s - x) < 6 for x in gesehen):
            continue
        gesehen.append(s); aus.append(c)
    return aus


FORTURA_ALT_RE = re.compile(r'<strong>Versand aus der Schweiz</strong>\s*(?:–|-|&ndash;)\s*Lieferung in nur ' + _ZZ + r' Werktagen \(DPD\)')
FORTURA_ALT = '<strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)'   # Importer-Satz bis 13.10.2026


def fortura_neu(soll=(2, 3)):
    """Der Satz, den die Fortura-Importer seit 13.10.2026 schreiben (fortura_import*.mjs, fortura_enrich_live.mjs)."""
    return f'<strong>Versand ab Schweizer Lager</strong> mit DPD, meist in {soll[0]}–{soll[1]} Werktagen bei dir'


def _fortura_ersetzen(t, soll):
    return FORTURA_ALT_RE.sub(lambda m: fortura_neu(soll) if int(m.group(1)) < soll[0] else m.group(0), t or "")


def zusage_ersetzen(text, soll=(2, 3)):
    """Produkttext (Fortura + Einzelfälle) auf die Kassen-Spanne. Gibt den neuen Text zurück (unverändert, wenn nichts passt)."""
    t = _fortura_ersetzen(text, soll)
    # Einzelfälle: «(Lieferung) in (der Regel in) 1–2 Werktagen» → «meist in 2–3 Werktagen»
    return re.sub(r'(?<!meist )\b(?:in der Regel )?in (?:nur )?' + _ZZ + r' Werktagen',
                  lambda m: f'meist in {soll[0]}–{soll[1]} Werktagen' if int(m.group(1)) < soll[0] else m.group(0), t)


def _ohne_kommentare(name, text):
    """Unsichtbares raus: Liquid-Kommentare, JSON-Kopfkommentar, HTML-Kommentare (dort steht Geschichte, keine Zusage)."""
    t = text or ""
    if name.endswith(".json") and t.lstrip().startswith("/*"):
        t = t[t.find("*/") + 2:]
    t = re.sub(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}', ' ', t, flags=re.S)
    t = re.sub(r'<!--.*?-->', ' ', t, flags=re.S)
    if name.endswith(".liquid"):
        t = re.sub(r'\{%-?\s*#[^%]*%\}', ' ', t)
    return t


def _quelltext_ohne_kommentare(pfad):
    """Quellcode der Vorlagen ohne Kommentarzeilen/Docstrings (dort steht die Geschichte «1–2»)."""
    roh = open(os.path.join(REPO, pfad), encoding="utf-8").read()
    if pfad.endswith(".py"):
        roh = re.sub(r'"""[\s\S]*?"""', ' ', roh)
        zeilen = [z for z in roh.splitlines() if not z.lstrip().startswith("#")]
        zeilen = [re.sub(r'\s#\s.*$', '', z) for z in zeilen]
    else:
        roh = re.sub(r'/\*[\s\S]*?\*/', ' ', roh)
        zeilen = [re.sub(r'(?<!:)//.*$', '', z) for z in roh.splitlines()]
    return "\n".join(zeilen)


def _alle(g, q, key, v=None):
    after = None
    while True:
        d = g(q, {**(v or {}), "a": after})[key]
        yield from d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return
        after = d["pageInfo"]["endCursor"]


def zusage_quellen(g):
    """→ (quelle, kennung, text) für alles ausser Produkten."""
    for p in g('{shop{shopPolicies{type body}}}')["shop"]["shopPolicies"]:
        yield "Richtlinie", p["type"], p["body"]
    for n in _alle(g, 'query($a:String){pages(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{handle isPublished body '
                      'd:metafield(namespace:"global",key:"description_tag"){value} t:metafield(namespace:"global",key:"title_tag"){value}}}}', "pages"):
        q = "Seite" if n["isPublished"] else "Seite (unveröff.)"
        yield q, n["handle"], n["body"]
        yield q + " SEO", n["handle"], " | ".join(x["value"] for x in (n["d"], n["t"]) if x and x.get("value"))
    for n in _alle(g, 'query($a:String){articles(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{handle body summary blog{handle} '
                      'd:metafield(namespace:"global",key:"description_tag"){value}}}}', "articles"):
        k = f'{n["blog"]["handle"]}/{n["handle"]}'
        yield "Artikel", k, n["body"]
        yield "Artikel Auszug/SEO", k, " | ".join(x for x in (n.get("summary"), (n["d"] or {}).get("value")) if x)
    for n in _alle(g, 'query($a:String){collections(first:200,after:$a){pageInfo{hasNextPage endCursor} nodes{handle descriptionHtml seo{title description}}}}',
                   "collections"):
        yield "Kollektion", n["handle"], n["descriptionHtml"]
        yield "Kollektion SEO", n["handle"], " | ".join(x for x in ((n["seo"] or {}).get("title"), (n["seo"] or {}).get("description")) if x)
    for n in g('{metaobjects(type:"shopify--knowledge-base-fact",first:100){nodes{handle fields{key value}}}}')["metaobjects"]["nodes"]:
        yield "KB-Fakt", n["handle"], " | ".join(f["value"] or "" for f in n["fields"])
    for muster in ZUSAGE_THEME:
        for n in _theme_dateien(g, muster):
            yield "Theme", n["filename"], _ohne_kommentare(n["filename"], (n.get("body") or {}).get("content") or "")
    for pfad in ZUSAGE_SOCIAL:
        import csv
        try:
            rows = list(csv.DictReader(open(os.path.join(REPO, pfad), encoding="utf-8", newline="")))
        except FileNotFoundError:
            continue
        for r in rows:
            if (r.get("status") or "").strip() == "ready":
                yield "Social-Warteschlange", f'{pfad}:{(r.get("id") or "")[-40:]}', r.get("caption") or ""
    for pfad in ZUSAGE_QUELLTEXT:
        if os.path.exists(os.path.join(REPO, pfad)):
            yield "Vorlage (Quelltext)", pfad, _quelltext_ohne_kommentare(pfad)


def _theme_dateien(g, muster):
    after = None
    while True:
        d = g('query($id:ID!,$f:[String!]!,$a:String){theme(id:$id){files(filenames:$f,first:50,after:$a){pageInfo{hasNextPage endCursor} '
              'nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}', {"id": THEME, "f": [muster], "a": after})["theme"]["files"]
        yield from d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return
        after = d["pageInfo"]["endCursor"]


def zusage_pruefen(g, soll):
    """Alle Quellen ausser Produkten → {treffer, je_quelle, liste}."""
    liste = []
    for quelle, kennung, text in zusage_quellen(g):
        for c in zusage_treffer(text, soll):
            liste.append({"quelle": quelle, "kennung": kennung, "stelle": c})
    je = {}
    for x in liste:
        je[x["quelle"]] = je.get(x["quelle"], 0) + 1
    return {"treffer": len(liste), "je_quelle": je, "liste": liste}


def _ledger(eintrag):
    with open(ZUSAGE_LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps({"zeit": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), **eintrag}, ensure_ascii=False) + "\n")
        f.flush(); os.fsync(f.fileno())


def zusage_produkte(g, soll, limit=300, budget_s=150.0, schreiben=False):
    """Produkte mit Tag profil-ch-lager: zählen und (schreiben=True) höchstens `limit` korrigieren, solange das Zeitbudget reicht.
    → {gelesen, offen_vorher, geschrieben, unloesbar, fehler, offen_nachher, beispiele}."""
    t0 = time.time()
    kand, gelesen, unloesbar = [], 0, []
    for p in _alle(g, 'query($a:String){products(first:100,after:$a,query:"tag:profil-ch-lager AND status:active"){pageInfo{hasNextPage endCursor} '
                      'nodes{id title descriptionHtml seo{title description}}}}', "products"):
        gelesen += 1
        h = p["descriptionHtml"] or ""; sd = (p["seo"] or {}).get("description") or ""
        if not (zusage_treffer(h, soll) or zusage_treffer(sd, soll)):
            continue
        nh, nsd = zusage_ersetzen(h, soll), zusage_ersetzen(sd, soll)
        if zusage_treffer(nh, soll) or zusage_treffer(nsd, soll):
            unloesbar.append(p["id"]); continue
        kand.append(p)
    erg = {"gelesen": gelesen, "offen_vorher": len(kand) + len(unloesbar), "geschrieben": 0, "unloesbar": len(unloesbar),
           "fehler": 0, "beispiele": [k["id"].split("/")[-1] for k in kand[:3]]}
    if not schreiben or not kand or limit <= 0:
        erg["offen_nachher"] = erg["offen_vorher"]
        return erg
    try:
        schloss = open(TEXT_SCHLOSS, "w")
        for _ in range(12):                                   # bis 60 s auf das gemeinsame Text-Schloss warten
            try:
                fcntl.flock(schloss, fcntl.LOCK_EX | fcntl.LOCK_NB); break
            except BlockingIOError:
                time.sleep(5)
        else:
            erg["offen_nachher"] = erg["offen_vorher"]; erg["schloss"] = "belegt — Charge morgen"
            return erg
    except OSError as e:
        erg["offen_nachher"] = erg["offen_vorher"]; erg["schloss"] = f"unklar ({e})"
        return erg
    sperre = threading.Lock()
    FR = 'query($id:ID!){product(id:$id){descriptionHtml seo{title description} tags}}'
    M = ('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{descriptionHtml seo{description}} userErrors{field message}}}')

    def einer(p):
        if time.time() - t0 > budget_s:
            return
        try:
            f = g(FR, {"id": p["id"]})["product"]
            if "profil-ch-lager" not in (f.get("tags") or []):
                return                                         # Zeichen inzwischen weg → nicht anfassen
            h, sd = f["descriptionHtml"] or "", (f["seo"] or {}).get("description") or ""
            nh, nsd = zusage_ersetzen(h, soll), zusage_ersetzen(sd, soll)
            if nh == h and nsd == sd:
                return
            eingabe = {"id": p["id"]}
            if nh != h:
                eingabe["descriptionHtml"] = nh
            if nsd != sd:
                eingabe["seo"] = {"title": (f["seo"] or {}).get("title"), "description": nsd}
            r = g(M, {"p": eingabe})["productUpdate"]
            ist = r.get("product") or {}
            ok = not r["userErrors"] and not zusage_treffer(ist.get("descriptionHtml") or "", soll) \
                and not zusage_treffer((ist.get("seo") or {}).get("description") or "", soll)
        except Exception as e:  # noqa: BLE001
            with sperre:
                erg["fehler"] += 1
            print(f"   ✗ {p['id'].split('/')[-1]}: {type(e).__name__} {str(e)[:80]}", file=sys.stderr)
            return
        with sperre:
            if not ok:
                erg["fehler"] += 1; return
            erg["geschrieben"] += 1
            # Nur der Fortura-Satz getauscht → Muster genügt als Rückweg (spart 1'611 × 5 KB im Repo); sonst Volltext.
            nur_fortura = nsd == sd and h.count(FORTURA_ALT) == 1 and nh == h.replace(FORTURA_ALT, fortura_neu(soll))
            _ledger({"quelle": "Produkt", "id": p["id"], "titel": p["title"][:60],
                     **({"muster": "fortura-dpd", "alt": FORTURA_ALT, "neu": fortura_neu(soll)} if nur_fortura else
                        {"alt_text": h if nh != h else None, "alt_seo": sd if nsd != sd else None}),
                     "rueckweg": "python3 automation/kassen_lieferdatum_wache.py --zusage-zurueck (SCHARF=1)"})
    try:
        with ThreadPoolExecutor(max_workers=4) as ex:
            list(ex.map(einer, kand[:limit]))
    finally:
        fcntl.flock(schloss, fcntl.LOCK_UN); schloss.close()
    erg["offen_nachher"] = erg["offen_vorher"] - erg["geschrieben"]
    return erg


def zusage_zurueck(g, scharf):
    """Rückweg: Produkte aus dem Ledger auf den Altwert (Fortura-Muster rückwärts bzw. gespeicherter Volltext)."""
    n = 0
    for z in open(ZUSAGE_LEDGER, encoding="utf-8"):
        e = json.loads(z)
        if e.get("quelle") != "Produkt":
            continue
        f = g('query($id:ID!){product(id:$id){descriptionHtml seo{title description}}}', {"id": e["id"]})["product"]
        if e.get("muster") == "fortura-dpd":
            eingabe = {"id": e["id"], "descriptionHtml": (f["descriptionHtml"] or "").replace(e["neu"], e["alt"])}
        else:
            eingabe = {"id": e["id"]}
            if e.get("alt_text"):
                eingabe["descriptionHtml"] = e["alt_text"]
            if e.get("alt_seo"):
                eingabe["seo"] = {"title": (f["seo"] or {}).get("title"), "description": e["alt_seo"]}
        n += 1
        print(("ZURÜCK " if scharf else "würde zurück ") + e["id"])
        if scharf:
            g('mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{message}}}', {"p": eingabe})
    print(f"Rückweg: {n} Produkte {'zurückgesetzt' if scharf else '(trocken)'}")


def zusage_zeile(z):
    """Eine Zeile für das Log. ⚠️ nur bei Treffern ausserhalb der Produkte (Produkte korrigiert die Charge selbst)."""
    p = z.get("produkte") or {}
    if p.get("fehler"):
        pteil = f" · Produkte (Profil CH-Lager) unklar ({p['fehler'][:60]})"
    else:
        pteil = (f" · Produkte (Profil CH-Lager) {p.get('offen_vorher')} offen, heute {p.get('geschrieben')} korrigiert"
                 + (f", {p['unloesbar']} unlösbar" if p.get("unloesbar") else "") + (f", {p['schloss']}" if p.get("schloss") else "")) if p else ""
    if z.get("fehler"):
        return f"⚠️ ZUSAGE CH-LAGER: unklar ({z['fehler']})"
    if not z.get("treffer"):
        return f"ZUSAGE CH-LAGER: 0 Stellen versprechen weniger als {z['soll']} Werktage{pteil}"
    bsp = "; ".join(f"{x['quelle']} {x['kennung']}" for x in z["liste"][:3])
    return (f"⚠️ ZUSAGE CH-LAGER: {z['treffer']} Stellen versprechen ab Schweizer Lager weniger als die Kasse ({z['soll']} Werktage) — "
            f"{bsp}{pteil} → python3 automation/kassen_lieferdatum_wache.py --zusage-liste")


# Selbsttest: die Liquid-Zeilen so, wie sie am 13.10.2026 live stehen (gekürzt auf die geprüften Stellen).
_PROBE_PRODUKT = ("{%- comment -%} LUX-KASSENDATUM (Spur A) {%- endcomment -%}\n"
                  "{%- unless closest.product.tags contains 'profil-ch-lager' -%}{%- assign lx_stufe = 0 -%}{%- endunless -%}\n"
                  "{%- if closest.product.tags contains 'ch-lager' -%}\n"
                  "  {%- if lx_stufe >= 1 -%}{%- assign lx_tmin = 1 -%}{%- assign lx_tmax = 2 -%}{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- endif -%}\n"
                  "{%- else -%}\n  {%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}\n"
                  "  {%- assign lager = 'Direktversand vom Hersteller in Asien — deshalb die längere Lieferzeit' -%}\n{%- endif -%}\n"
                  "{%- if lx_tmin > 0 -%}\n  {%- assign lx_von = 3 | plus: lx_tmin -%}\n{%- endif -%}")
_PROBE_KORB = ("{%- when 0 -%}{%- assign lx_stufe = 1 -%}{%- if lux_ohne_marke -%}{%- assign lx_stufe = 0 -%}{%- endif -%}"
               "{%- unless t contains 'profil-ch-lager' -%}{%- assign lux_ohne_marke = true -%}{%- endunless -%}{%- if lx_stufe >= 1 -%}{%- assign lx_tmin = 1 -%}{%- assign lx_tmax = 2 -%}"
               "{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- endif -%}{%- assign lux_lager = 'aus dem Schweizer Lager' -%}\n"
               "{%- else -%}{%- assign lx_tmin = 7 -%}{%- assign lx_tmax = 17 -%}{%- assign lux_lager = 'Direktversand aus Asien' -%}\n"
               "{%- comment -%} LUX-KASSENDATUM {%- endcomment -%}\n{%- assign lx_von = 3 | plus: lx_tmin -%}")


def _probe_datei(liquid, wo):
    j = {"sections": {"x": {"settings": {"custom_liquid": liquid}}}} if wo == "korb" else \
        {"sections": {"main": {"blocks": {"product-details": {"blocks": {"lux_delivery": {"settings": {"custom_liquid": liquid}}}}}}}}
    return "/*\n * Kopf\n */\n" + json.dumps(j, ensure_ascii=False, indent=2)


def selbsttest():
    # feste Testregel passend zu den Proben (Stand P3D: CJ 10–20, CH-Lager 4–5) — der Selbsttest darf nicht von der
    # Live-Regel abhängen (13.10.: nach P1D + CH-Lager 2–3 fiel er auf 2/7, obwohl die Prüfung richtig rechnete)
    regel = {"zonen": {"CH": {"min_tage": 10, "max_tage": 20}, "LI": {"min_tage": 15, "max_tage": 45},
                       "REST": {"min_tage": 10, "max_tage": 20}},
             "profile_zonen": {"CH-Lager": {"CH": {"min_tage": 4, "max_tage": 5}}}, "abzug_bearbeitung": True}
    gut = {"templates/product.json": _probe_datei(_PROBE_PRODUKT, "produkt"), "templates/cart.json": _probe_datei(_PROBE_KORB, "korb")}
    faelle = [
        ("P3D, Theme wie live", gut, 3, regel, set()),
        ("P2D → beide Dateien ⚠️", gut, 2, regel, {"templates/product.json", "templates/cart.json"}),
        ("P2D nur product.json geprüft", {**gut, "templates/cart.json": _probe_datei(_PROBE_KORB.replace("3 | plus", "2 | plus")
                                                                                            .replace("tmin = 1 ", "tmin = 2 ").replace("tmax = 2 ", "tmax = 3 ")
                                                                                            .replace("tmin = 7 ", "tmin = 8 ").replace("tmax = 17 ", "tmax = 18 "), "korb")},
         2, regel, {"templates/product.json"}),
        ("P2D nur cart.json geprüft", {**gut, "templates/product.json": _probe_datei(_PROBE_PRODUKT.replace("3 | plus", "2 | plus")
                                                                                              .replace("tmin = 1 ", "tmin = 2 ").replace("tmax = 2 ", "tmax = 3 ")
                                                                                              .replace("tmin = 7 ", "tmin = 8 ").replace("tmax = 17 ", "tmax = 18 "), "produkt")},
         2, regel, {"templates/cart.json"}),
        ("Marke fehlt in cart.json", {**gut, "templates/cart.json": _probe_datei(_PROBE_KORB.replace(MARKE, "X"), "korb")}, 3, regel, {"templates/cart.json"}),
        ("Asien 8/17 in product.json", {**gut, "templates/product.json": _probe_datei(_PROBE_PRODUKT.replace(
            "{%- else -%}\n  {%- assign lx_tmin = 7 -%}", "{%- else -%}\n  {%- assign lx_tmin = 8 -%}"), "produkt")}, 3, regel, {"templates/product.json"}),
        ("Profil-Zeichen fehlt in product.json", {**gut, "templates/product.json": _probe_datei(_PROBE_PRODUKT.replace(
            "profil-ch-lager", "X"), "produkt")}, 3, regel, {"templates/product.json"}),
        ("Regel CH-Lager 5–6 → beide ⚠️", gut, 3, {**regel, "profile_zonen": {"CH-Lager": {"CH": {"min_tage": 5, "max_tage": 6}}}},
         {"templates/product.json", "templates/cart.json"}),
    ]
    fehler = 0
    for name, texte, bearb, rg, soll_dateien in faelle:
        b = theme_pruefen(texte, bearb, rg)
        ist = {d for d in THEME_DATEIEN if any(x.startswith(d) for x in b)}
        ok = ist == soll_dateien
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {name}: {'⚠️ ' + ' | '.join(b) if b else 'ok'}")
    print(f"KASSEN-DATUM THEME Selbsttest {len(faelle) - fehler}/{len(faelle)}")
    return fehler == 0 and zusage_selbsttest()


# Kanarien der Prüfung «ZUSAGE CH-LAGER» (Soll 2–3 = P1D + Transit 1–2). Mit Treffer / ohne Treffer / Ersetzung.
ZUSAGE_KANARIEN_JA = ["1–2 Werktage ab Schweizer Lager", "1&ndash;2 Werktage", "<strong>1–2 Werktage</strong>", "in 1–2 Tagen",
                      "ab Schweizer Lager 1–2, sonst 10–20 Werktage", "Schnelle CH-Lieferung 1–2 Tage.", "je nach Artikel 1–2 bis 10–20 Werktage",
                      "(1–2 from our Swiss warehouse)", "1–2 jours depuis notre stock suisse", "1-2 business days from our Swiss warehouse",
                      FORTURA_ALT, "aus dem Schweizer Lager in ein bis zwei Werktagen bei dir"]
ZUSAGE_KANARIEN_NEIN = ["2–3 Werktage", "Feiertage kann 1–2 Tage länger dauern", "Akkulaufzeit 1-2 Tage", "Kostüm Rentier 1-2 Jahre – schnelle CH-Lieferung",
                        "Tag 1-2: Versand ab Werk", "Wir bearbeiten deine Bestellung (1-2 Tage)", "10–20 Werktage", "Unterwäsche (plus 1-2 Reserve)",
                        "meist 2–3 Werktage ab Schweizer Lager", "Antwort in 1–2 Werktagen", fortura_neu((2, 3)),
                        "Lieferantenlager und Druck auf Bestellung brauchen 1–3 Werktage, bis das Paket unterwegs ist"]


def zusage_selbsttest():
    fehler = 0
    for k in ZUSAGE_KANARIEN_JA:
        ok = bool(zusage_treffer(k, (2, 3)))
        fehler += not ok
        if not ok:
            print(f"  ✗ ZUSAGE: kein Treffer bei «{k}»")
    for k in ZUSAGE_KANARIEN_NEIN:
        ok = not zusage_treffer(k, (2, 3))
        fehler += not ok
        if not ok:
            print(f"  ✗ ZUSAGE: Fehltreffer bei «{k}»")
    # Ersetzung: Fortura-Satz und Einzelfälle werden 2–3, danach 0 Treffer; Soll 1–2 (P0D) → «1–2» ist dann richtig
    ers = [(f"<li>🇨🇭 {FORTURA_ALT}</li>", f"<li>🇨🇭 {fortura_neu((2, 3))}</li>"),
           ("Ab Schweizer Lager, Lieferung in 1–2 Werktagen.", "Ab Schweizer Lager, Lieferung meist in 2–3 Werktagen."),
           ("ist in der Regel in 1–2 Werktagen bei dir (DPD)", "ist meist in 2–3 Werktagen bei dir (DPD)"),
           ("Akkulaufzeit 1-2 Tage", "Akkulaufzeit 1-2 Tage")]
    for a, soll in ers:
        ist = zusage_ersetzen(a, (2, 3))
        ok = ist == soll and not zusage_treffer(ist, (2, 3))
        fehler += not ok
        if not ok:
            print(f"  ✗ ZUSAGE-Ersetzung: «{a}» → «{ist}» (erwartet «{soll}»)")
    ok = not zusage_treffer("1–2 Werktage ab Schweizer Lager", (1, 2))
    fehler += not ok
    n = len(ZUSAGE_KANARIEN_JA) + len(ZUSAGE_KANARIEN_NEIN) + len(ers) + 1
    print(f"ZUSAGE CH-LAGER Selbsttest {n - fehler}/{n}")
    return fehler == 0


def main():
    s = gql('query{deliveryPromiseSettings{deliveryDatesEnabled processingTime}}')["deliveryPromiseSettings"]
    d = gql('''query{orders(first:60,query:"fulfillment_status:shipped",sortKey:CREATED_AT,reverse:true){nodes{name createdAt
             fulfillments{createdAt trackingInfo{company number}} lineItems(first:5){nodes{sku}}}}}''')["orders"]["nodes"]
    werte = []
    for o in d:
        skus = [l["sku"] or "" for l in o["lineItems"]["nodes"]]
        if not any(CJ_SKU.match(x) for x in skus):
            continue                                          # nur CJ-Ware (Druck/CH-Lager haben eigene Zeiten)
        mit_nummer = [f for f in o["fulfillments"] if any(t.get("number") for t in f["trackingInfo"])]
        if not mit_nummer:
            continue
        c = dt.datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00")).date()
        f = min(dt.datetime.fromisoformat(x["createdAt"].replace("Z", "+00:00")).date() for x in mit_nummer)
        werte.append((o["name"], int(np.busday_count(c, f))))
        if len(werte) >= 12:
            break
    zahlen = sorted(w for _, w in werte)
    median = float(np.median(zahlen)) if zahlen else None
    p80 = float(np.percentile(zahlen, 80)) if zahlen else None
    einstellung = tage(s.get("processingTime"))
    zu_frueh = bool(s.get("deliveryDatesEnabled") and einstellung is not None and median is not None and einstellung < median)
    # 13.10.2026 (Betreiber stellte P3D → P1D, «entscheide du sauber»): Seit 12.10. zieht versand_transit_wache die Bearbeitung
    # von der Transitzeit ab («abzug_bearbeitung») — die Kasse zeigt Bearbeitung + Transit = Zusage (CJ 10–20 Werktage),
    # egal wie die Bearbeitung allein steht. Die alte Regel «Bearbeitung < CJ-Versand-Median = zu früh» meldete danach
    # Fehlalarm («empfohlen 3 Werktage») und hätte den Betreiber zurück auf P3D geschickt. Zu früh ist die Kasse nur, wenn
    # Bearbeitung + kürzeste Transitzeit unter dem gemessenen Versand (80 %) + 1 Werktag Zustellung läge.
    try:
        _r = json.load(open(TRANSIT_REGEL, encoding="utf-8"))
        if _r.get("abzug_bearbeitung") and einstellung is not None and p80 is not None:
            zusage_min = _r["zonen"]["CH"]["min_tage"]                    # = Bearbeitung + min Transit (Wache hält das)
            zu_frueh = bool(s.get("deliveryDatesEnabled") and zusage_min < p80 + 1)
    except Exception:
        pass
    stand = {"stand": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "datum_in_kasse": s.get("deliveryDatesEnabled"),
             "bearbeitungszeit_tage": einstellung, "versand_werktage": werte, "median": median, "p80": p80,
             "empfohlen": int(np.ceil(p80)) if p80 is not None else None, "zu_frueh": zu_frueh}
    # 13.10.2026 (Kassen-Prüfung wf_2a13fa79, Richter Platz 1): Ware ab CH-Lager (Fortura, 1–2 Tage) liegt im SELBEN
    # Versandprofil wie CJ-Ware (10–20 Werktage) → die Kasse zeigt für ein Halloween-Kostüm ab Schweizer Lager «28. Okt–11. Nov»,
    # die Produktseite «14.–16. Okt». Ein eigenes Profil würde gemischte Körbe doppelt verrechnen (CHF 14 statt 7) → Betreiber.
    # Gemessen wird nur, ob CH-Lager- und CJ-Ware dasselbe Profil teilen; neue Fortura-Ware fällt über den Tag hinein.
    try:
        prof = {}
        for name, q in (("ch_lager", "tag:ch-lager AND status:active"), ("cj", "sku:CJ* AND status:active")):
            r = gql('query($q:String!){products(first:5,query:$q){nodes{variants(first:1){nodes{deliveryProfile{id name}}}}} '
                    'c:productsCount(query:$q,limit:null){count}}', {"q": q})
            ids = {((n["variants"]["nodes"] or [{}])[0].get("deliveryProfile") or {}).get("name") for n in r["products"]["nodes"]}
            prof[name] = {"profile": sorted(x for x in ids if x), "anzahl": r["c"]["count"]}
        stand["ch_lager_profil"] = prof
        stand["ch_lager_im_asien_profil"] = bool(set(prof["ch_lager"]["profile"]) & set(prof["cj"]["profile"]))
    except Exception as e:
        stand["ch_lager_profil"] = {"fehler": str(e)[:160]}
    # 13.10.2026 (A7): rechnet das Theme noch mit derselben Bearbeitung + Transit wie die Kasse?
    try:
        tb, md5 = theme_live(einstellung)
        stand["theme_kassendatum"] = {"befunde": tb, "md5": md5}
    except Exception as e:  # noqa: BLE001
        tb = [f"unklar ({type(e).__name__}: {str(e)[:100]})"]
        stand["theme_kassendatum"] = {"befunde": tb}
    # 13.10.2026 (VERB-M1): verspricht irgendwo noch ein Text «ab Schweizer Lager» weniger als die Kasse? Produkte mit dem Zeichen
    # profil-ch-lager korrigiert die Wache selbst in Tageschargen (Zeitbudget: Aufseher-Timeout 300 s für den ganzen Lauf).
    try:
        from kaufwille_zeile import gql as gql_k             # mit Eimer-Etikette (Massen-Schreiber)
        soll = zusage_soll()
        z = {"soll": f"{soll[0]}–{soll[1]}"}
        z.update(zusage_pruefen(gql_k, soll))
        z["liste"] = z["liste"][:40]
    except Exception as e:  # noqa: BLE001
        z = {"fehler": f"{type(e).__name__}: {str(e)[:100]}"}
    stand["zusage_ch_lager"] = z
    json.dump(stand, open(STAND, "w"), ensure_ascii=False, indent=1)   # Stand VOR der Charge sichern (Aufseher-Timeout 300 s)
    if "fehler" not in z:
        try:
            rest = max(0.0, 240.0 - (time.time() - T_START))
            z["produkte"] = zusage_produkte(gql_k, soll, limit=int(os.environ.get("ZUSAGE_LIMIT", "300")), budget_s=rest,
                                            schreiben=os.environ.get("ZUSAGE_CHARGE", "1") != "0")
        except Exception as e:  # noqa: BLE001
            z["produkte"] = {"fehler": f"{type(e).__name__}: {str(e)[:100]}"}
        json.dump(stand, open(STAND, "w"), ensure_ascii=False, indent=1)
    print(zusage_zeile(z))
    print("⚠️ KASSEN-DATUM THEME: " + " · ".join(tb) if tb else
          f"KASSEN-DATUM THEME: Produktseite + Warenkorb rechnen wie die Kasse (Bearbeitung {einstellung} T)")
    print(f"KASSEN-DATUM: Bearbeitungszeit {einstellung} T · gemessen bis Versand Median {median} / 80 % {p80} Werktage "
          f"({len(werte)} CJ-Bestellungen) → {'⚠️ Kasse verspricht zu früh (Zusage-Minimum unter gemessenem Versand), empfohlen %s Werktage' % stand['empfohlen'] if zu_frueh else 'ok (Zusage über Transit gehalten)'}")
    # 13.10.2026: Entscheid umgesetzt — automation/ch_lager_profil.py ordnet stufenweise zu (Stufe 1/2 lässt Google-Ware
    # bewusst im General profile). Diese Stichprobe meldet deshalb erst ab Stufe 3; vorher meldet die Ampel-Zeile CH-LAGER-PROFIL.
    try:
        stufe = int(json.load(open(os.path.join(REPO, "dropship", "_ch_lager_profil_stufe.json"))).get("stufe", 1))
    except Exception:
        stufe = 3
    if stand.get("ch_lager_im_asien_profil") and stufe >= 3:
        print(f"KASSEN-DATUM CH-LAGER: {stand['ch_lager_profil']['ch_lager']['anzahl']} aktive Produkte ab Schweizer Lager im selben "
              f"Versandprofil wie CJ-Ware → Kasse zeigt das Asien-Lieferfenster")


T_START = time.time()

if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if "--zusage-liste" in sys.argv:                 # Trockenlauf-Liste: jede Fundstelle ausser Produkten + Produkt-Zählung
        from kaufwille_zeile import gql as gql_k
        _s = zusage_soll()
        _z = {"soll": f"{_s[0]}–{_s[1]}", **zusage_pruefen(gql_k, _s)}
        for x in _z["liste"]:
            print(f"  {x['quelle']:24s} {x['kennung'][:60]:60s} | {x['stelle']}")
        print(json.dumps(_z["je_quelle"], ensure_ascii=False))
        _z["produkte"] = zusage_produkte(gql_k, _s, schreiben=False)
        print(zusage_zeile(_z))
        sys.exit(0)
    if "--zusage-charge" in sys.argv:
        from kaufwille_zeile import gql as gql_k
        _i = sys.argv.index("--zusage-charge")
        _n = int(sys.argv[_i + 1]) if len(sys.argv) > _i + 1 and sys.argv[_i + 1].isdigit() else 300
        _e = zusage_produkte(gql_k, zusage_soll(), limit=_n, budget_s=float(os.environ.get("ZUSAGE_BUDGET", "1800")),
                             schreiben=os.environ.get("SCHARF") == "1")
        print(json.dumps(_e, ensure_ascii=False))
        sys.exit(0)
    if "--zusage-zurueck" in sys.argv:
        from kaufwille_zeile import gql as gql_k
        zusage_zurueck(gql_k, os.environ.get("SCHARF") == "1")
        sys.exit(0)
    main()
