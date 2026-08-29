"""Stellt die Hype-Reihe der Startseite zusammen — und räumt sie von selbst wieder ab.

AUFTRAG DES BETREIBERS (12.08.2026, wörtlich): «informiere dich immer über neuste hype
produkte und so und mache auch in startseite ganz gross irgendwo paar coolen produkten, aber
wen hype vorbei produkt ändern.»

Der zweite Halbsatz ist der schwierige. Eine Trend-Reihe anzulegen ist leicht; das Problem ist,
dass sie ein halbes Jahr später immer noch dieselben Artikel zeigt. Deshalb trägt jedes
Produkt hier ein DATUM: `hype-seit-JJJJ-MM-TT`. Läuft dieses Skript erneut, verliert alles,
was älter ist als HYPE_TAGE (Vorgabe 21), den Tag `hype-jetzt` und verschwindet aus der Reihe —
ohne dass jemand daran denken muss. Die Ware bleibt im Shop, sie führt nur nicht mehr die
Startseite an.

WOHER DIE THEMEN KOMMEN: aus einer Recherche, die zu jedem Lauf gehört (Web-Suche nach
aktuellen TikTok-/Dropshipping-Trends). Die Liste unten ist der Stand vom 12.08.2026:
Beauty-Geräte, Schnecken-/Serum-Hautpflege, Mini-Beamer, «aesthetic» Ordnungshelfer,
Shapewear, 3-in-1-Ladestationen. Wer sie ändert, trägt das Datum in QUELLE nach — sonst weiss
die nächste Session nicht, wie alt der Stand ist.

⚠️ NICHT JEDES TREFFERPRODUKT TAUGT FÜR DIE STARTSEITE. Verlangt werden: mindestens zwei
Bilder (sonst kein Karussell auf der Karte), Preis ab CHF 19 (darunter wirkt die Reihe wie ein
Ramschtisch und liegt zu nahe am Preisboden), im Google-Kanal, und keine der Warengruppen, die
schon einmal aus der Startreihe genommen wurden (Kostüm, Spielzeug, Partydeko).

DRY=1 meldet nur.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
HEUTE = os.environ.get("HEUTE") or time.strftime("%Y-%m-%d")
HYPE_TAGE = int(os.environ.get("HYPE_TAGE", "21"))
PRO_THEMA = int(os.environ.get("PRO_THEMA", "2"))
TAG = "hype-jetzt"
HANDLE = "hype-jetzt"
LEDGER = "dropship/_hype_verlauf.txt"

QUELLE = "Web-Recherche 27.08.2026 (CJ «20 Viral TikTok Products 2026» + sellthetrend September-Liste: tragbare Smoothie-Mixer, Karaoke-/Ansteckmikrofone, Ringlichter, Tierhaar-Fusselrollen und Futterautomaten neu aufgenommen; Sunset-Lampe, Mini-Beamer, 3-in-1-Ladestation, Heatless Curls, Snail/Serum, LED-Maske und Haustier-Fellpflege von beiden Quellen bestaetigt. Hals-Ventilator laeuft aus (Herbstanfang CH). Seifenblasenpistole bewusst NICHT: faellt unter Spielzeug (RAUS_TYP). Supplements/Lebensmittel weiterhin NICHT: Heilversprechen-Klasse)"
THEMEN = {
    # ⚠️ «IPL» ohne Wortgrenze steckt in «L-IPL-iner»: der erste Lauf setzte einen
    # «Peel-Off Lipliner» als Beauty-GERÄT auf die Startseite. Dieselbe Falle wie «rock» in
    # «GT Line ROCK» aus dem Projektgedächtnis — bei Abkürzungen immer \b.
    # 25.08.: Spätaugust-Listen ergänzen Ice Roller, Kopfhaut-Massage und EMS-GESICHTS-Toner.
    # ⚠️ «EMS» allein bleibt draussen — EMS-Bauchtrainer ist Fitness (Abgrenzung im
    # medizin_zweck-Gedächtnis); nur mit Gesichts-Anker. «Scalp» braucht Massage-Anker.
    "Beauty-Gerät": re.compile(
        r'\bIPL\b|Mikrostrom|LED-Maske|Gesichtsreinigungsb[üu]rste|Dermaroller|Gua Sha|'
        r'Jade Roller|Haarentfernungs|Ice[- ]?Roller|Eisroller|'
        r'Kopfhaut[- ]?Massage|Scalp[- ]?Massag|EMS[- ]?(?:Gesicht|Face)|Face[- ]?(?:EMS|Toner)', re.I),
    "Hautpflege-Serum": re.compile(
        r'Schneckencreme|Snail|Serum|Ampullen|Retinol|Hyalurons[äa]ure', re.I),
    "Mini-Beamer": re.compile(r'Mini-?\s?(?:Beamer|Projektor)|Smart Mini Beamer', re.I),
    "Ordnung & Aesthetic": re.compile(
        r'Organizer|Aufbewahrungskorb|Aufbewahrungsbox|Ordnungssystem', re.I),
    "Shapewear": re.compile(r'Shapewear|Body Shaper|Figurformend|Taillenformer', re.I),
    "Ladestation 3-in-1": re.compile(r'\d-in-\d[- ]?(?:Wireless )?Ladestation|MagSafe|'
                                     r'Magnet-Ladestation|Wireless Powerbank', re.I),
    # Neu 15.08.: Blush-Balms/Cream-Blush sind laut August-Trendberichten die
    # meistgehypte Makeup-Kategorie auf TikTok (günstig, breite Zielgruppe).
    "Blush & Lippen-Balm": re.compile(
        r'Blush[- ]?(?:Balm|Stick)|Cream[- ]?Blush|Rouge[- ]?Stick|Wangenr[öo]te|'
        r'Lip[- ]?(?:Balm|Tint)|Lippenbalsam.*(?:T[öo]nung|Farbe)', re.I),
    # Neu 19.08.: Face-/Lifting-Tapes («Invisible Lifting Tape») und Haarglätter/Multistyler
    # tauchen in mehreren August-Trendlisten auf; Hals-Ventilatoren tragen den Spätsommer.
    # «Tape» allein wäre eine Falle (Klebeband/Washi-Tape) → Lifting/Face als Pflicht-Anker.
    "Lifting-Tape": re.compile(
        r'(?:Lifting|Face|Gesichts?)[- ]?Tape|Gesichtsstraffungs|V-?Face[- ]?(?:Band|Tape)', re.I),
    "Haarglätter & Styler": re.compile(
        r'Haargl[äa]tter|Gl[äa]tteisen|Multi-?styler|Warmluftb[üu]rste|Airstyler|'
        r'Lockenstab|Gl[äa]ttb[üu]rste', re.I),
    # Neu 23.08.: Die August-Listen nennen durchgehend Kerzenwärmer, Aroma-Diffusoren und
    # kleine Küchen-/Ordnungshelfer («home and kitchen gadgets», «aesthetic living»). Für die
    # Schweiz passt das zum Herbstanfang — der Hals-Ventilator läuft dafür aus (er verliert
    # den Tag nach HYPE_TAGE von selbst, es muss ihn niemand entfernen).
    # ⚠️ «Aroma» allein wäre eine Falle (Aroma-Öl in der Küche, «Aroma» in Lebensmitteln) →
    # Diffusor/Wärmer/Duftlampe ist Pflicht-Anker. Dieselbe Regel wie bei «IPL» und «Tape».
    "Kerzenwärmer & Duft": re.compile(
        r'Kerzenw[äa]rmer|Candle[- ]?Warmer|Aroma[- ]?Diffus|Duftdiffus|Duftlampe|'
        r'Aromatherapie[- ]?(?:Diffusor|Lampe)|[ÖO]l[- ]?Diffusor', re.I),
    # ⚠️ «Bürste» allein trifft Haarbürsten, «Trimmer» trifft Bartschneider → Tier-Anker Pflicht.
    "Haustier-Fellpflege": re.compile(
        r'(?:Haustier|Hunde|Katzen|Tierhaar|Fell)[- ]?(?:b[üu]rste|k[äa]mm|Trimmer|'
        r'Schermaschine|Pflegehandschuh)|Fellpflege|Entfilzungs', re.I),
    # ⚠️ «Sealer» allein trifft Fugen-/Lacksiegel → Beutel/Folie als Anker.
    "Beutelverschliesser": re.compile(
        r'Beutelverschlie|Beutelversiegel|Folienschwei[sß]|Bag[- ]?Sealer|'
        r'T[üu]tenverschlie|Vakuumierer', re.I),
    "Hals-Ventilator": re.compile(
        r'(?:Hals|Nacken|Neck)[- ]?(?:Ventilator|Fan|K[üu]hler)|Tragbarer Mini-?Ventilator', re.I),
    # Neu 26.08.: Sunset-Lampen («sunset glow» auf Wand/Decke) nennen zwei August-Listen
    # unabhängig; Heatless-Curls-Sets (Locken ohne Hitze) und Decken-/Oversized-Hoodies
    # tragen den Herbst. ⚠️ «Oversized» allein träfe halbe Damenmode → Hoodie-Anker Pflicht;
    # «Lockenwickler» bleibt mit Heatless/Seide/Set verankert, sonst greift jede Drogerie-Rolle.
    "Sunset-Lampe": re.compile(
        r'Sunset[- ]?(?:Lampe|Lamp|Projekt)|Sonnenuntergangs?[- ]?(?:lampe|projektor|licht)', re.I),
    "Heatless Curls": re.compile(
        r'Heatless[- ]?(?:Curl|Locken)|Locken ohne Hitze|Seiden?[- ]?Lockenwickler|'
        r'Lockenwickler[- ]?(?:Set|Band)|Curling[- ]?(?:Rod|Ribbon)', re.I),
    # Neu 27.08.: CJs eigene «20 Viral TikTok Products 2026» und die September-Liste von
    # sellthetrend nennen uebereinstimmend tragbare Mixer, Mini-/Karaoke-Mikrofone, Ringlichter
    # und Haustier-Helfer (Fusselrolle, Futterautomat). Der Hals-Ventilator laeuft dafuer aus —
    # Ende August ist in der Schweiz Herbstanfang; er verliert seinen Tag von selbst.
    # ⚠️ «Mixer» allein ist eine Falle: Tattoo-Mixer (aus dem Shaker-Fehlgriff vom 21.08.),
    # Handmixer, DJ-Mixer → Smoothie/tragbar/Becher ist Pflicht-Anker.
    "Smoothie-Mixer": re.compile(
        r'Smoothie[- ]?(?:Mixer|Maker|Becher|Blender)|Mixbecher|'
        r'Tragbarer?[- ]?(?:Mini-?)?(?:Mixer|Blender)|Standmixer[- ]?to[- ]?go', re.I),
    # ⚠️ «Mikrofon» allein traefe Studio-, PC- und Konferenzmikrofone → Karaoke/Anstecker
    # als Anker. «Mini» allein sowieso nicht.
    "Karaoke-Mikrofon": re.compile(
        r'Karaoke|Ansteckmikrofon|Ansteck[- ]?Mikro|Funkmikrofon|Lavalier|'
        r'Mini-?Mikrofon(?:[- ]?Set)?', re.I),
    # ⚠️ «Ring» steckt in «MonitoRING» und «ContouRING» (Tag-Fehlgriff vom 27.08.) —
    # deshalb nur die vollstaendigen Woerter, nie «Ring» allein.
    "Ringlicht": re.compile(r'Ringlicht|Ring[- ]?Light|Selfie[- ]?(?:Licht|Ring)|'
                            r'Beauty[- ]?Ringleuchte', re.I),
    # ⚠️ «Roller» allein trifft Ice Roller, Jade Roller, Farbroller und Tretroller →
    # Fussel/Tierhaar als Pflicht-Anker.
    "Tierhaar-Fusselrolle": re.compile(
        r'Fusselrolle|Fusselb[üu]rste|Tierhaarentferner|Tierhaar[- ]?(?:Rolle|B[üu]rste)|'
        r'Pet[- ]?Hair[- ]?Remover', re.I),
    "Futterautomat": re.compile(
        r'Futterautomat|Futterspender|Automatischer?[- ]?(?:Futter|Napf)|'
        r'Wasserspender[- ]?(?:f[üu]r )?(?:Katze|Hund|Haustier)', re.I),
    "Hoodie-Decke": re.compile(
        r'Oversized?[- ]?Hoodie|Hoodie[- ]?Decke|Decken[- ]?Hoodie|Wearable Blanket|'
        r'Sherpa[- ]?Hoodie|Doppelseitig(?:er)?[- ]?Hoodie', re.I),
}
# Warengruppen, die schon einmal aus der Startreihe genommen wurden.
RAUS_TYP = {"Spielzeug & Spiele", "Partydeko & Ballone", "Kostüme & Verkleidung"}
# Die Startseite ist die Fläche, die jede Besucherin ungefragt sieht — auch die, die mit einem
# Kind daneben sitzt. Der erste Lauf hätte ein «Intim-Pflegeserum für Frauen» dorthin gestellt.
# Das Produkt ist völlig in Ordnung, der Platz ist es nicht.
NICHT_STARTSEITE = re.compile(r'Intim|Erotik|Vaginal|Menstruation|H[äa]morrhoid|Anti-?Pilz|'
                              r'Nagelpilz|Warzen|Hemorrhoid', re.I)

# ⚠️ DIE BILDPRÜFUNG KANN KEIN MUSTER ERSETZEN — sie braucht einen Blick.
# Der erste Lauf wählte zwölf Produkte, die nach Zahlen tadellos waren: genug Bilder, richtiger
# Preis, im Google-Kanal, kein Tag auffällig. Der Kontaktbogen zeigte dann bei VIER, was keine
# Kennzahl verrät:
#   • ein Kleid an der Schaufensterpuppe statt an einem Model,
#   • ein chinesisches Lieferanten-Wasserzeichen mitten im Bild (广州…),
#   • eine englische Infografik mit Wirkversprechen statt eines Produktfotos,
#   • ein eingebrannter Bildtext «Samsung UK three-pin» — der falsche Markt für einen CH-Shop.
# Sie standen auf der prominentesten Fläche des Shops. Aussortierte bekommen deshalb dauerhaft
# `hype-bild-schwach` und werden nie wieder gewählt.
# PFLICHT für jeden Lauf: `KONTAKT=1 python3 automation/hype_kuratieren.py` baut den
# Kontaktbogen der aktuellen Reihe — vor dem Veröffentlichen ansehen (Projektregel 5, Vision-QA).
AUSGEMUSTERT = "hype-bild-schwach"


def gql(q, v=None):
    with open("/tmp/_hy.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hy.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def tage_her(datum):
    try:
        return (time.mktime(time.strptime(HEUTE, "%Y-%m-%d"))
                - time.mktime(time.strptime(datum, "%Y-%m-%d"))) / 86400
    except Exception:
        return 999


def abgelaufene_raeumen():
    """Nimmt den Tag von allem, was länger als HYPE_TAGE in der Reihe steht."""
    cur, alle = None, []
    while True:
        d = gql('query($c:String){products(first:250,after:$c,query:"tag:%s")'
                '{pageInfo{hasNextPage endCursor} nodes{id title tags}}}' % TAG, {"c": cur})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            print("  ⚠️ Bestandsliste unvollständig — nichts geräumt", flush=True)
            return 0
        alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]

    raus = []
    for p in alle:
        seit = next((t.split("hype-seit-")[1] for t in p["tags"] if t.startswith("hype-seit-")),
                    None)
        # Ohne Datum ist der Eintrag von Hand gesetzt worden — dann bleibt er.
        if seit and tage_her(seit) > HYPE_TAGE:
            raus.append((p, seit))
    print(f"In der Reihe: {len(alle)} | abgelaufen (>{HYPE_TAGE} Tage): {len(raus)}", flush=True)
    for p, seit in raus[:8]:
        print(f"   seit {seit}: {p['title'][:52]}", flush=True)
    if DRY:
        return len(raus)
    for p, seit in raus:
        gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
            {"id": p["id"], "t": [TAG, "hype-seit-" + seit]})
        time.sleep(0.25)
    return len(raus)


def kollektion_sichern():
    d = gql('query($q:String!){collections(first:1,query:$q){nodes{id handle}}}',
            {"q": f"handle:{HANDLE}"})
    knoten = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if knoten:
        return knoten[0]["id"]
    if DRY:
        print("  (DRY) Kollektion würde angelegt", flush=True)
        return None
    r = gql('mutation($i:CollectionInput!){collectionCreate(input:$i)'
            '{collection{id} userErrors{message}}}',
            {"i": {"title": "🔥 Gerade im Trend", "handle": HANDLE,
                   "descriptionHtml": "<p>Was gerade wirklich läuft — von uns geprüft, mit "
                                      "Bildern, echtem Preis und Lieferung in die Schweiz. "
                                      "Die Auswahl wechselt regelmässig.</p>",
                   "seo": {"title": "Trend-Produkte 2026 – aktuell beliebt | LuxeStyle CH",
                           "description": "Aktuell gefragte Produkte im Schweizer Shop: "
                                          "geprüfte Auswahl, Gratis-Versand ab CHF 50, "
                                          "30 Tage Rückgabe."},
                   "ruleSet": {"appliedDisjunctively": False,
                               "rules": [{"column": "TAG", "relation": "EQUALS",
                                          "condition": TAG}]}}})
    cid = (((r.get("data") or {}).get("collectionCreate") or {}).get("collection") or {}).get("id")
    e = ((r.get("data") or {}).get("collectionCreate") or {}).get("userErrors")
    if e:
        print(f"  ⚠️ Kollektion: {e[0]['message']}", flush=True)
        return None
    # ⚠️ Per API angelegte Kollektionen sind NICHT automatisch im Onlineshop sichtbar — genau
    # daran sind am 12.06. alle Menü-Links auf 404 gelaufen.
    for pub in ("301970915713", "301971014017", "302032716161", "302566834561",
                "302872297857", "302994456961"):
        gql('mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i)'
            '{userErrors{message}}}',
            {"id": cid, "i": [{"publicationId": f"gid://shopify/Publication/{pub}"}]})
        time.sleep(0.2)
    print(f"  Kollektion «🔥 Gerade im Trend» angelegt und in 6 Kanälen veröffentlicht",
          flush=True)
    return cid


def kontaktbogen():
    """Baut ein Bildraster der aktuellen Reihe — zum Ansehen, bevor sie live geht."""
    import os as _os
    from PIL import Image, ImageDraw
    d = gql('{c:collections(first:1,query:"handle:%s"){nodes{products(first:24)'
            '{nodes{title featuredMedia{... on MediaImage{image{url}}}}}}}}' % HANDLE)
    knoten = ((d.get("data") or {}).get("c") or {}).get("nodes") or []
    if not knoten:
        print("Kollektion nicht gefunden.", flush=True)
        return
    ps = knoten[0]["products"]["nodes"]
    _os.makedirs("/tmp/hype", exist_ok=True)
    bilder = []
    for i, p in enumerate(ps):
        u = ((p.get("featuredMedia") or {}).get("image") or {}).get("url")
        if not u:
            continue
        f = f"/tmp/hype/{i:02d}.jpg"
        subprocess.run(["curl", "-s", "--max-time", "40", "-o", f,
                        u.split("?")[0] + "?width=500"])
        bilder.append((f, p["title"]))
    S, SPALTEN = 340, 4
    zeilen = (len(bilder) + SPALTEN - 1) // SPALTEN
    bl = Image.new("RGB", (SPALTEN * S, max(1, zeilen) * (S + 30)), "white")
    zeichner = ImageDraw.Draw(bl)
    for i, (f, t) in enumerate(bilder):
        try:
            im = Image.open(f).convert("RGB").resize((S, S))
        except Exception:
            continue
        x, y = (i % SPALTEN) * S, (i // SPALTEN) * (S + 30)
        bl.paste(im, (x, y))
        zeichner.text((x + 4, y + S + 8), f"{i + 1}. {t[:44]}", fill="black")
    bl.save("/tmp/hype_kontakt.png")
    print(f"Kontaktbogen mit {len(bilder)} Bildern: /tmp/hype_kontakt.png\n"
          f"→ ansehen! Wasserzeichen, Infografiken, Schaufensterpuppen und fremdsprachige\n"
          f"  Bildtexte fallen nur hier auf. Untaugliche mit «{AUSGEMUSTERT}» markieren.",
          flush=True)


def main():
    if os.environ.get("KONTAKT") == "1":
        kontaktbogen()
        return
    print(f"Quelle der Themen: {QUELLE}\n", flush=True)
    abgelaufene_raeumen()
    # ⚠️ NUR_RAEUMEN=1 (16.08.2026): Der tägliche Aufseher-Lauf räumt NUR Abgelaufenes ab und
    # nimmt NICHTS Neues auf. Grund, teuer gelernt am 15.08.: Die Zahlenprüfung ersetzt keinen
    # Blick — fünf Produkte mit untauglichen Bildern (Lieferanten-Collage, englische Infografik,
    # Negligé-Optik) standen drei Tage auf der Startseite, weil der unbeaufsichtigte Lauf sie
    # aufgenommen hatte. Neuaufnahme passiert nur noch in betreuten Runden (Kontaktbogen ansehen,
    # Ausschuss -> hype-bild-schwach, dann Lauf ohne NUR_RAEUMEN).
    if os.environ.get("NUR_RAEUMEN") == "1":
        print("NUR_RAEUMEN aktiv — keine Neuaufnahme in diesem Lauf.", flush=True)
        return

    kandidaten = {k: [] for k in THEMEN}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or not p.get("g"):
            continue
        if (p.get("productType") or "") in RAUS_TYP or NICHT_STARTSEITE.search(p["title"]):
            continue
        if (p.get("mediaCount") or {}).get("count", 0) < 2:
            continue
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        if preis < 19:
            continue
        tags = p.get("tags") or []
        if TAG in tags:
            continue                       # steht schon in der Reihe
        if AUSGEMUSTERT in tags:
            continue                       # Bild schon einmal als untauglich befunden
        for thema, muster in THEMEN.items():
            if muster.search(p["title"]):
                kandidaten[thema].append(
                    (p["id"], p["title"], preis, (p.get("mediaCount") or {}).get("count", 0)))
                break

    gewaehlt = []
    for thema, liste in kandidaten.items():
        # Meiste Bilder zuerst — die Karte lebt vom Karussell.
        liste.sort(key=lambda x: -x[3])
        gewaehlt += [(thema,) + k for k in liste[:PRO_THEMA]]

    print(f"\nNeu in die Reihe: {len(gewaehlt)}", flush=True)
    for thema, _, t, preis, mc in gewaehlt:
        print(f"   [{thema:<20}] CHF {preis:>6.2f}  {mc:>2} Bilder  {t[:46]}", flush=True)
    if DRY:
        kollektion_sichern()
        return
    if not gewaehlt:
        print("Keine neuen Kandidaten — Reihe bleibt, wie sie ist.", flush=True)
        return

    kollektion_sichern()
    f = open(LEDGER, "a")
    n = 0
    for thema, gid, t, preis, _ in gewaehlt:
        # ⚠️ LIVE GEGENPRÜFEN, nicht dem Export glauben. Der Export ist ein Schnappschuss;
        # `hype-bild-schwach` wird nach einer Bildprüfung gesetzt, also fast immer NACH dem
        # letzten Export. Ohne diese Abfrage holt der nächste Lauf genau die Produkte zurück,
        # die man eben wegen ihres Bildes aussortiert hat.
        d = gql('query($id:ID!){node(id:$id){... on Product{tags status}}}', {"id": gid})
        knoten = (d.get("data") or {}).get("node") or {}
        live_tags = knoten.get("tags") or []
        # ⚠️ DEN GRUND NENNEN (27.08.2026). Beide Fälle druckten dieselbe Zeile
        # «übersprungen (live)» — dabei heisst der eine «wurde nach einer Bildprüfung
        # dauerhaft aussortiert» und der andere «steht nicht mehr aktiv im Shop». Wer das
        # Log liest, kann sonst nicht unterscheiden, ob die Reihe an der Bildqualität oder
        # am Katalog scheitert. Dieselbe Klasse wie «PAUSE (Tagesmenge erreicht)» beim
        # Kosten-Backfill: eine Meldung, die den falschen Grund nennt, ist schlimmer als keine.
        if AUSGEMUSTERT in live_tags:
            print(f"   übersprungen (Bild zu schwach): {t[:48]}", flush=True)
            continue
        if knoten.get("status") != "ACTIVE":
            print(f"   übersprungen (nicht aktiv: {knoten.get('status')}): {t[:48]}", flush=True)
            continue
        # ⚠️ AUCH DEN TAG SELBST LIVE PRÜFEN (teuer gelernt 15.08.): Der Export ist älter als
        # die Reihe, also fehlt `hype-jetzt` dort bei allem, was nach dem Export aufgenommen
        # wurde. Ohne diese Zeile stempelte der Tageslauf dieselben Produkte jeden Tag mit
        # einem frischen hype-seit-Datum — und die 21-Tage-Ablauflogik lief NIE ab (die
        # Ladestation trug nach drei Tagen drei Datums-Tags).
        if TAG in live_tags:
            print(f"   übersprungen (live, schon in der Reihe): {t[:48]}", flush=True)
            continue
        r = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [TAG, "hype-seit-" + HEUTE]})
        if ((r.get("data") or {}).get("tagsAdd") or {}).get("userErrors"):
            continue
        n += 1
        f.write(f"{HEUTE}\t{thema}\t{gid}\t{t}\n")
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n} Produkte in die Hype-Reihe aufgenommen (Ablauf in {HYPE_TAGE} Tagen)")


if __name__ == "__main__":
    main()
