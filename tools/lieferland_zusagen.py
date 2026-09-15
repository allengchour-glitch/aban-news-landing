#!/usr/bin/env python3
"""lieferland_zusagen.py — findet Texte, die Lieferung ausserhalb der Schweiz versprechen.

Warum: Der Shop liefert NUR in die Schweiz (Versandprofil: eine Zone «Domestic»). Am 15.09.2026
stand in der Meta-Beschreibung der Startseite trotzdem «mit schnellem Versand in die Schweiz und
nach Deutschland» — der Satz unter jedem Google-Treffer. Eine Zusage, die wir nicht halten können,
ist teurer als eine fehlende: sie erzeugt Bestellungen, die storniert werden müssen.

  python3 tools/lieferland_zusagen.py messen           # nur lesen, Befunde je Fläche
  python3 tools/lieferland_zusagen.py --selbsttest     # Muster gegen Beispielsätze prüfen

Flächen: Produkte (Text + SEO), Kollektionen, Seiten, Blogartikel, Theme-Dateien, shop.description.

⚠️ FALSCHE TREFFER, die das Muster BEWUSST nicht meldet (Lehre 9b, Wortgrenzen):
  «Made in Germany», «deutsche Marke», «aus Deutschland importiert»  → Herkunft, keine Zusage
  «Widerrufsbelehrung Deutschland», «deutsches Recht»                → Rechtstext, keine Zusage
  «deutschsprachig», «auf Deutsch»                                   → Sprache
Gemeldet wird nur, wo ein LIEFER-Wort und ein NICHT-CH-LAND im selben Satz stehen.
"""
import json, os, re, sys

LIEFERWORT = r"(?:Versand|Lieferung|liefern|liefert|geliefert|verschicken|versenden|verschickt|versendet|Zustellung)"
# ⚠️ Der erste Entwurf suchte nur LIEFERWORT + LAND im selben Satz. Das meldete 30 Fehltreffer:
# «Weltweite Spannungsanpassung (100-240V) … 🚚 Lieferung 10–20 Werktage» — eine Spannungsangabe
# neben dem Standard-Lieferhinweis. Auch «UPS, einer der weltweit führenden Versand-Dienstleister»
# (Beschreibung eines Spielzeug-LKW) und «Radsocken für Auto Deutschland» (Produktname!).
# Deshalb wird jetzt eine RICHTUNG verlangt: das Land muss das ZIEL der Lieferung sein.
ZIEL_RICHTUNG = (
    r"(?:nach\s+(?:Deutschland|Österreich|Oesterreich|Europa|Italien|Frankreich)"
    r"|in\s+die\s+(?:EU|BRD)\b"
    r"|(?:europaweit|EU-weit|weltweit)(?:er|e|en)?\s+" + LIEFERWORT +
    r"|" + LIEFERWORT + r"\s+(?:europaweit|EU-weit|weltweit)\b"
    r"|(?:liefern|versenden|verschicken)\s+wir\s+(?:auch\s+)?(?:europaweit|weltweit|EU-weit))")
MUSTER = re.compile(rf"(?:{LIEFERWORT}[^.!?;]{{0,90}}?{ZIEL_RICHTUNG}|{ZIEL_RICHTUNG})", re.I)
# Herkunft, Produktion, Recht, Sprache, Produktname — keine Lieferzusagen.
AUSNAHME = re.compile(
    r"(Made in Germany|deutsche[rsn]? (Marke|Qualität|Hersteller|Traditionsmarke)"
    r"|Widerrufsbelehrung|deutsche[msn]? Recht|Gerichtsstand"
    r"|deutschsprachig|auf Deutsch|Sprache"
    r"|gedruckt|Druck (erfolgt|und Versand)|produziert|Herstellung"
    r"|Spannung|Volt|\b\d{2,3}\s*-\s*\d{2,3}\s*V\b|Einsatz|Nutzung|Steckdose"
    r"|führend|operierend|Dienstleister)", re.I)

def satz_um(text, treffer):
    """Gibt den ganzen Satz zurück, in dem der Treffer steht — sonst ist nicht beurteilbar, was gemeint ist."""
    a = text.rfind(".", 0, treffer.start()) + 1
    b = text.find(".", treffer.end())
    return text[a: b + 1 if b > 0 else len(text)].strip()

def befunde(text):
    """Liste der beanstandeten Sätze. Leer, wenn nur Ausnahmen drin sind."""
    if not text: return []
    roh = re.sub(r"<[^>]+>", " ", text)
    roh = re.sub(r"\s+", " ", roh)
    out = []
    for m in MUSTER.finditer(roh):
        s = satz_um(roh, m)
        if AUSNAHME.search(s): continue
        if s not in out: out.append(s)
    return out

BEISPIELE = [
    # (Satz, soll gemeldet werden?) — die NEIN-Fälle sind echte Fehltreffer des ersten Entwurfs.
    ("Entdecke kuratierte Produkte mit schnellem Versand in die Schweiz und nach Deutschland.", True),
    ("Versand 7-14 Tage — auch nach Deutschland & Österreich", True),
    ("Wir liefern europaweit innerhalb von 5 Tagen.", True),
    ("Weltweiter Versand ab CHF 50.", True),
    ("Versand nach Österreich möglich.", True),
    ("Weltweite Spannungsanpassung (100-240V) · 🚚 Lieferung 10–20 Werktage", False),
    ("Universal-Steckdosen mit 110-220 V für weltweiten Einsatz · Lieferung 10–20 Werktage", False),
    ("Auch UPS, einer der weltweit führenden Versand-Dienstleister, setzt auf den Sprinter.", False),
    ("Radsocken für Auto Deutschland – schnelle CH-Lieferung, Gratis-Versand ab CHF 50.", False),
    ("Der Druck erfolgt in Europa, geliefert wird in die Schweiz.", False),
    ("Dieser Artikel wird ausserhalb Europas gedruckt — Druck und Versand dauern länger.", False),
    ("Unsere Produkte stammen von internationalen Herstellern und werden für die Schweiz geliefert.", False),
    ("Made in Germany — geliefert ab unserem Schweizer Lager.", False),
    ("Widerrufsbelehrung Deutschland: Die Rücksendung erfolgt auf unsere Kosten.", False),
    ("Gratis-Versand ab CHF 50 in der ganzen Schweiz.", False),
]

def selbsttest():
    fehler = 0
    for satz, soll in BEISPIELE:
        ist = bool(befunde(satz))
        if ist != soll:
            fehler += 1
            print(f"  FEHLER: {'sollte melden' if soll else 'sollte NICHT melden'}: {satz}")
    print(f"Selbsttest: {len(BEISPIELE)-fehler}/{len(BEISPIELE)} richtig")
    return fehler == 0

if __name__ == "__main__" and "--selbsttest" in sys.argv:
    sys.exit(0 if selbsttest() else 1)

# ---------------------------------------------------------------- Messung
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def messen():
    from verkehrsseiten_messen import gql
    gefunden = []

    def melde(flaeche, wer, text, url=""):
        for s in befunde(text):
            gefunden.append((flaeche, wer, s, url))

    # 1) Startseiten-Meta-Beschreibung
    d = gql("{ shop { description } }")
    melde("SHOP-META", "Startseite (Onlineshop → Einstellungen)", d["data"]["shop"]["description"])

    # 2) Seiten
    cur = None
    while True:
        q = """query($c:String){ pages(first:100, after:$c){ pageInfo{hasNextPage endCursor}
               nodes{ handle title body } } }"""
        r = gql(q, {"c": cur})["data"]["pages"]
        for p in r["nodes"]:
            melde("SEITE", f"/pages/{p['handle']}", (p.get("body") or "") + " " + (p.get("title") or ""))
        if not r["pageInfo"]["hasNextPage"]: break
        cur = r["pageInfo"]["endCursor"]

    # 3) Kollektionen (Text + SEO)
    cur = None
    while True:
        q = """query($c:String){ collections(first:100, after:$c){ pageInfo{hasNextPage endCursor}
               nodes{ handle title descriptionHtml seo{description} } } }"""
        r = gql(q, {"c": cur})["data"]["collections"]
        for c in r["nodes"]:
            melde("KOLLEKTION", f"/collections/{c['handle']}", c.get("descriptionHtml") or "")
            melde("KOLLEKTION-SEO", f"/collections/{c['handle']}", (c.get("seo") or {}).get("description") or "")
        if not r["pageInfo"]["hasNextPage"]: break
        cur = r["pageInfo"]["endCursor"]

    # 4) Blogartikel
    q = """{ articles(first:250){ nodes{ handle title body blog{handle} } } }"""
    for a in gql(q)["data"]["articles"]["nodes"]:
        melde("ARTIKEL", f"/blogs/{a['blog']['handle']}/{a['handle']}", a.get("body") or "")

    # 5) Produkte — gezielt suchen statt 52'000 lesen
    for wort in ("Deutschland", "Österreich", "europaweit", "weltweit", "EU-weit"):
        cur = None
        while True:
            q = """query($c:String,$q:String!){ products(first:100, after:$c, query:$q){
                   pageInfo{hasNextPage endCursor} nodes{ handle status descriptionHtml seo{description} } } }"""
            r = gql(q, {"c": cur, "q": f"status:active AND {wort}"})["data"]["products"]
            for p in r["nodes"]:
                melde("PRODUKT", f"/products/{p['handle']}", p.get("descriptionHtml") or "")
                melde("PRODUKT-SEO", f"/products/{p['handle']}", (p.get("seo") or {}).get("description") or "")
            if not r["pageInfo"]["hasNextPage"]: break
            cur = r["pageInfo"]["endCursor"]

    # Ausgabe, nach Fläche gruppiert
    from collections import defaultdict
    nach = defaultdict(list)
    for f, w, s, _ in gefunden: nach[f].append((w, s))
    print(f"\n=== {len(gefunden)} Befunde über {len(nach)} Flächen ===\n")
    for f in sorted(nach):
        eintraege = nach[f]
        print(f"--- {f}: {len(eintraege)} ---")
        gesehen = set()
        for w, s in eintraege:
            if w in gesehen: continue
            gesehen.add(w)
            print(f"  {w}\n      «{s[:190]}»")
        print()
    return gefunden

if __name__ == "__main__" and "messen" in sys.argv:
    messen()
