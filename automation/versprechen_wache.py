#!/usr/bin/env python3
"""versprechen_wache.py — Liefer- und Eigenversprechen ohne Beleg aus Titel, Text und Google-Feldern (08.10.2026).

ANLASS (Betreiber 08.10. «verbessere alles und sauber»): Die Seite mit dem meisten Kaufwillen ohne Kauf (Leinen-Set
«Provence», 41 Sitzungen, 2 Warenkörbe, 0 Käufe) verspricht in der Google-Beschreibung «Schweizer Shop, schnelle
Lieferung» — auf derselben Seite steht «Lieferzeit Schweiz: 10–20 Werktage». GEMESSEN am SEO-Export (51'652 aktive):
106 solche Beschreibungen (100 CJ 10–20 Werktage, 6 Poster 7–14), dazu der Titel «Zigarettenhalter mit Band – Sofort
Lieferbar» (CJ-Neuimport; der Fix vom 12.08. traf ein älteres Produkt, der Importer brachte die Wendung zurück),
4× «Schweizer Shop · Qualität geprüft» (seit 02.09. heisst der Baustein «Geprüfte Angaben» — prüfen tun wir die
Angaben, nicht die Ware) und 6× «meistverkauft» (3 Verkäufe in 30 Tagen).

Wer «schnell» liest und 15 Werktage wartet, schreibt eine Mail oder storniert (Hängematte, 12.08.). Lieferversprechen
bleiben nur bei Ware mit Schweizer Lager stehen (Tag `ch-lager`, Fortura) — für alle anderen ersetzt durch die
wahre, neutrale Aussage «Lieferung in die ganze Schweiz».

REGEL: automation/data/versprechen_regel.json — EINE Datei, auch für die Importer (cj_copy_prompt.mjs versprechenSicher).
Schreibt Titel, Beschreibung, SEO-Titel/-Beschreibung (immer BEIDE SEO-Felder, Lehre 30.09.) und Bild-Alt-Texte (seit
08.10. abends: nach dem Diamant-Lauf trugen die Bilder noch «… mit Diamanten – Bild 2», live gesehen), liest zurück.
Handles bleiben (Umbenennen braucht 301) — sie stehen im Bericht.
DRY=1 zeigt nur. CACHE_NUTZEN=1 nimmt den letzten Export. --selbsttest prüft die Kanarien.

NACHTRAG 14.10.2026 13:45 (Prüfung S3, Runde 3): «Ware-Hinweis» wacht jetzt auch über jede Ware, die ein R9-Ersatztext NENNT
(kollektion.ware_im_text, «im Ersatztext genannt», Muster trifft Text UND aktiven Titel); unveröffentlichte Kollektionen mit rotem
Fund stehen im Bericht mit ihren Kanälen (kollektion.kanaele; Abschnitt «Nicht im Onlineshop, aber in anderen Kanälen»).

NACHTRAG 14.10.2026 abends (Prüfung S3, eine Regelquelle mit automation/kollektion_versprechen_s3.py): Kollektionsteil zählt R6 nur,
wenn KEIN Land-Beleg in der Nähe der Gratis-Aussage steht (land + land_naehe; «Schweizer Shop», «LuxeStyle Schweiz», «Schweizer Lager»
sind kein Beleg); R4 zählt nur Tempo-Wörter und Werktage — der Lager-Ort allein ist kein Fund. Funde in Titel/SEO-Titel heissen
«manuell», Funde in Premium-Kollektionen «Premium-Hinweis» (PREMIUM_VOLL aus): beide stehen mit Handle im Bericht, zählen aber nicht
in die Rot-Zahl der Zeile. Stand für die Ampel: /tmp/koll_versprechen_stand.json (KOLL_STAND=<pfad> leitet um). Bericht
dropship/KOLL-VERSPRECHEN.md nur im Normallauf; DRY=1 ohne KOLL_BERICHT=<pfad> schreibt KEINE Repo-Datei.

NACHTRAG 13.10.2026 spät (Kauf-Strecke Klassen 5/7/16, Abschnitt «editor_rueckgabe»): Zeile «EDITOR-RÜCKGABE: n von m
Editor-Produkten ohne Ausschluss-Satz · Theme ok/FEHLT» — zählt Editor-Produkte (lspod-designer) ohne Rückgabe-Ausschluss im Text
(Schreiber: automation/editor_rueckgabe_satz.py) und prüft die Pflicht-Zeichenfolgen in templates/product.json + cart.json
(Leiste/Akkordeon/Korb «Ersatz bei Druckfehlern», Brotkrumen trend/Doppel/Damen-Kette, Liefergebiet). Schreibt nichts.

NACHTRAG 13.10.2026 (Kauf-Strecke Klasse 12, Abschnitt «kosmetik_beleg» der Regeldatei) — zwei ZÄHL-Regeln, schreiben nichts:
  · «Geprüfte Angaben ohne Beleg»: Kosmetik (Hautpflege/Make-up/Haarpflege) ohne Inhaltsstoff-Liste im Text (Marker
    INCI · «Inhaltsstoffe:» · «Ingredients:» · «Zutaten:» — dieselben Zeichenfolgen prüft die Theme-Bedingung). Gemessen 13.10.:
    1'769 von 1'773 ohne Liste. Sichtbar ist «Geprüfte Angaben» dort nur, solange die Theme-Bedingung (Marker
    «kosmetik-inci-bedingung» in templates/product.json) fehlt → Zeile «GEPRÜFT-OHNE-INCI: n Kosmetik ohne Liste · sichtbar m».
  · «Reinstoff-Titel gegen INCI»: Titel nennt einen Reinstoff («Tunmate Rizinusöl», «… Arganöl», «Shea Butter»), der Text belegt
    eine Mischung (Mineral Oil, Paraffin, Fragrance/Duftstoff, «Ölmischung») → Meldung im Bericht. Reinstoff-Titel OHNE Liste
    stehen ebenfalls im Bericht (Karton im Bild zweimal lesen, erst dann Titel ändern). NUR=kosmetik zählt ohne den Rest.
"""
import json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "versprechen_regel.json"), encoding="utf-8"))
DRY = os.environ.get("DRY") == "1"
CACHE = "/tmp/versprechen_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_versprechen_wache.tsv")
BERICHT = os.path.join(REPO, "dropship", "VERSPRECHEN-WACHE.md")
K_BERICHT = os.path.join(REPO, "dropship", "KOSMETIK-BELEG.md")
BULK = ('{ products(query: "status:active") { edges { node { id handle title productType tags descriptionHtml seo { title description } '
        'variants(first: 1) { edges { node { sku } } } media(first: 40) { edges { node { id alt } } } } } } }')
ALT_LEDGER = os.path.join(REPO, "dropship", "_versprechen_alt.tsv")
M_ALT = ('mutation($id:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$id,media:$m){media{id alt} '
         'mediaUserErrors{message}}}')


def _regeln(name, flags=re.I):
    return [(re.compile(a, flags), b) for a, b in REGEL.get(name, [])]


LIEFER_TITEL, LIEFER_SEO, LIEFER_TEXT = _regeln("liefer_titel"), _regeln("liefer_seo"), _regeln("liefer_text")
EIGEN_TEXT, EIGEN_GROSS = _regeln("eigen_text"), _regeln("eigen_text_gross", 0)


def _glätten(neu, alt):
    if neu == alt:
        return alt
    neu = re.sub(r"[ \t]{2,}", " ", neu)
    neu = re.sub(r"\s+([.,;:!?])", r"\1", neu)
    neu = re.sub(r"\s*[–—·-]\s*(?=</|$)", "", neu)            # nackter Gedankenstrich am Ende
    neu = re.sub(r"([.,;:])\1+", r"\1", neu)
    return neu.strip() if alt == alt.strip() else neu


def anwenden(regeln, t):
    neu = t or ""
    for rx, ers in regeln:
        neu = rx.sub(ers, neu)
    return _glätten(neu, t or "")


def titel(t):
    neu = anwenden(LIEFER_TITEL, t)
    # Ränder nur glätten, wenn eine Regel gegriffen hat — «… Passendes Halsketten-» (abgeschnittener Titel) ist kein Befund
    return neu.strip(" –—·-:") if neu != (t or "") else (t or "")


def seo(t):
    return anwenden(LIEFER_SEO, t)


def text_liefer(t):
    return anwenden(LIEFER_TEXT, t)


def text_eigen(t):
    return anwenden(EIGEN_GROSS, anwenden(EIGEN_TEXT, t))


# ── «Diamanten» bei Modeschmuck/Uhren/Taschen (08.10. «weiter sauber machen») ─────────────────────────────────────────
# Gemessen: 622 aktive mit «Diamant», teuerstes CHF 150.90 (Moissanit) — echte Diamanten führt der Shop nicht. Ersetzt wird
# nur die Verzierung («mit funkelnden Diamanten», «Diamant-Zifferblatt»); Vergleiche («brillanter als Diamant»), Formen
# («Diamant-Design»), Diamond Painting, Bausteine, Schleifwerkzeug und Karat/VVS/Moissanit-Angaben bleiben unberührt.
D = REGEL.get("diamant") or {}


def _drx(liste):
    return [(re.compile(r[0]), r[1].replace("$1", r"\1"), r[2] if len(r) > 2 else None, r[3] if len(r) > 3 else None)
            for r in liste]


D_STRASS, D_ZIRKONIA = _drx(D.get("strass", [])), _drx(D.get("zirkonia", []))
D_PRODUKT = re.compile(D.get("ausnahme_produkt") or r"(?!x)x", re.I)
D_KONTEXT = re.compile(D.get("ausnahme_kontext") or r"(?!x)x", re.I)
D_ZIRKON = re.compile(D.get("zirkon_beleg") or r"(?!x)x", re.I)
D_DATIV = re.compile(D.get("dativ_vor") or r"(?!x)x", re.I)
D_SINGULAR = re.compile(D.get("singular_vor") or r"(?!x)x", re.I)


def diamant(t, produkt=""):
    """Dekorative «Diamanten» → Strasssteine (Zirkonia, wenn Titel/Text Zirkonia nennen). produkt = Titel + Text."""
    t = t or ""
    if "iamant" not in t:
        return t
    ganz = f"{t} {produkt}"
    if D_PRODUKT.search(ganz):
        return t
    neu = t
    for rx, ers, dativ, einzahl in (D_ZIRKONIA if D_ZIRKON.search(ganz) else D_STRASS):
        def tausch(m, ers=ers, dativ=dativ, einzahl=einzahl):
            s = m.string
            if D_KONTEXT.search(s[max(0, m.start() - 50):m.end() + 50]):
                return m.group(0)
            e = ers
            vor = re.split(r"[.!?;:<>]", s[max(0, m.start() - 80):m.start()])[-1]
            if einzahl and D_SINGULAR.search(vor):
                e = einzahl
            elif dativ and D_DATIV.search(vor):
                e = dativ
            return m.expand(e)
        neu = rx.sub(tausch, neu)
    return neu


def schweiz_lager(tags, sku):
    tl = {x.lower() for x in tags or []}
    return bool(tl & set(REGEL["schweiz_lager"]["tags"])) or any(
        (sku or "").lower().startswith(p) for p in REGEL["schweiz_lager"]["sku_praefix"])


# ── Kosmetik: Inhaltsstoff-Beleg und Reinstoff-Titel (13.10.2026, Kauf-Strecke Klasse 12) ──────────────────────────────────
K = REGEL.get("kosmetik_beleg") or {}
K_TYPEN = set(K.get("typen") or [])
K_INCI = tuple(K.get("inci_marker") or ())
K_REIN = re.compile(K.get("reinstoff") or r"(?!x)x", re.I)
K_FORM = re.compile(K.get("reinstoff_form") or r"(?!x)x", re.I)
K_MISCH = re.compile(K.get("mischung_beleg") or r"(?!x)x", re.I)


def ist_kosmetik(p):
    return (p.get("productType") or "") in K_TYPEN


def inci_beleg(html):
    """Steht eine Inhaltsstoff-LISTE im Text? Dieselben Zeichenfolgen wie die Theme-Bedingung («contains» in Liquid) — ein
    «pflegende Inhaltsstoffe wie Honig» (62 Texte) ist keine Liste und zählt nicht."""
    return any(m in (html or "") for m in K_INCI)


def reinstoff_titel(t):
    """Titel verspricht einen Reinstoff: Stoffname ist das Produkt selbst, kein «Serum mit …», «Lippenbalsam mit Kokosöl»."""
    t = t or ""
    return bool(K_REIN.search(t)) and not K_FORM.search(K_REIN.sub(" ", t))


def mischung_beleg(html):
    return bool(K_MISCH.search(re.sub(r"<[^>]+>", " ", html or "")))


def theme_bedingung():
    """True/False: trägt templates/product.json im Haupt-Theme den Marker der INCI-Bedingung? None = nicht lesbar."""
    try:
        d = gql('{ themes(first: 1, roles: [MAIN]) { nodes { files(filenames: ["templates/product.json"]) { nodes { body { '
                '... on OnlineStoreThemeFileBodyText { content } } } } } } }')
        inhalt = d["themes"]["nodes"][0]["files"]["nodes"][0]["body"]["content"]
        return (K.get("theme_marker") or "kosmetik-inci-bedingung") in inhalt
    except Exception as e:  # Zählung bleibt gültig, nur «sichtbar» ist dann unklar
        print(f"   Theme nicht lesbar: {str(e)[:120]}", flush=True)
        return None


E = REGEL.get("editor_rueckgabe") or {}


def editor_ohne_satz(html):
    """Editor-Produkt (lspod-designer im Text) ohne Rückgabe-Ausschluss-Satz → True."""
    h = html or ""
    return (E.get("editor_marker") or "lspod-designer") in h and not any(x in h for x in E.get("satz") or [])


def theme_klassen():
    """13.10.2026 (Kauf-Strecke 5/7/16): Pflicht-Zeichenfolgen in den Live-Dateien → Liste fehlender Stellen (None = unlesbar)."""
    pflicht, verboten = E.get("theme_pflicht") or {}, E.get("theme_verboten") or {}
    namen = sorted(set(pflicht) | set(verboten))
    if not namen:
        return []
    try:
        d = gql('query($f:[String!]!){ themes(first: 1, roles: [MAIN]) { nodes { files(filenames: $f) { nodes { filename body { '
                '... on OnlineStoreThemeFileBodyText { content } } } } } } }', {"f": namen})
        t = {x["filename"]: x["body"]["content"] for x in d["themes"]["nodes"][0]["files"]["nodes"]}
    except Exception as e:  # noqa: BLE001
        print(f"   Theme nicht lesbar: {str(e)[:120]}", flush=True)
        return None
    fehlt = [f"{n.split('/')[-1]} ohne «{x}»" for n in pflicht for x in pflicht[n] if x not in t.get(n, "")]
    fehlt += [f"{n.split('/')[-1]} mit «{x[:40]}»" for n in verboten for x in verboten[n] if x in t.get(n, "")]
    return fehlt


# ── Kollektionen: unbelegte Versprechen ZÄHLEN (S3, 14.10.2026 — Schritte 11, offen[10]) ────────────────────────────────────
# Regel: Abschnitt «kollektion» der Regeldatei. Keine Schreibwege auf Kollektionen: Ersetzen geschieht nur über feste Satzpaare
# in einem eigenen Werkzeug (S3 Schritte 1–7). Hier: Finder R1 «✔ Geprüfte …», R3 «Geprüft…», R4 Tempo/Lager ohne belegtes
# CH-Lager (Anteil profil-ch-lager LIVE, nur für Kollektionen mit Treffer), R5 «Premium-Marken/-Qualität» ausserhalb der
# Premium-Kollektionen, R6 «ab CHF 50» ohne Land im Satzteil. Dazu Theme: Organization-JSON-LD genau 1×, kein Slogan,
# verbotene Zeichenfolgen in theme.liquid / collection.json.
KO = REGEL.get("kollektion") or {}
_KF = KO.get("finder") or {}
KO_RX = {r: re.compile(v["muster"], re.I) for r, v in _KF.items()}
# 14.10.2026 abends (Prüfung S3): Land-Beleg = «in/innerhalb/für/nach/durch (der/die) (ganze) Schweiz», «schweizweit», «CH» — NICHT
# «Schweizer Shop», «LuxeStyle Schweiz», «Schweizer Lager». Eine Quelle mit kollektion_versprechen_s3.py (liest dieselbe Zeile).
KO_LAND = re.compile((_KF.get("R6") or {}).get("land") or r"(?!x)x")       # ohne Flag i: «CH» nur gross (nicht «.ch»)
KO_NAEHE = int((_KF.get("R6") or {}).get("land_naehe") or 25)             # Land höchstens so weit vor/hinter der Gratis-Aussage
KO_TRENN = re.compile(KO.get("satzteil_trenner") or r"[.!?;·|•\n]")
KT = KO.get("tempo") or {}
KT_HART = [re.compile(x, re.I) for x in KT.get("hart") or []]
KT_WEICH = [re.compile(x, re.I) for x in KT.get("weich") or []]             # nur Werktage — der Lager-Ort allein ist kein Fund
# 14.10.2026 spät (Prüfung S3): Gegensatz zur übrigen Ware mit Werktage-Angabe («Der übrige Katalog kommt direkt ab Werk (10–20 Werktage)»)
# = implizites «diese hier sind schneller» → zählt wie ein hartes Tempo-Wort
KT_KONTRAST = [re.compile(x, re.I) for x in KT.get("kontrast") or []]
KT_QUAL = re.compile(KT.get("qualifiziert") or r"(?!x)x", re.I)
KT_QUAL_NICHT = re.compile(KT.get("qualifiziert_nicht") or r"(?!x)x", re.I)   # «Alles …» hebt die Einschränkung auf
KO_PREMIUM = set(KO.get("premium_kollektionen") or [])
KO_PREMIUM_RX = re.compile(KO.get("premium_handle") or r"(?!x)x", re.I)
KO_PREMIUM_NICHT = set(KO.get("premium_handle_ausnahme") or [])
KO_MANUELL = tuple(KO.get("manuell_felder") or ("title", "seo.title"))
KO_VERWANDT = re.compile(r"<!--\s*ls-verwandt\s*-->.*?<!--\s*/ls-verwandt\s*-->", re.S)
KO_JSONLD = re.compile((KO.get("jsonld") or {}).get("muster") or r"(?!x)x")
KOLL_BERICHT = os.path.join(REPO, "dropship", "KOLL-VERSPRECHEN.md")
# Stand für die Ampel (betreiber_ampel.koll_versprechen): nur im Normallauf; KOLL_STAND=<pfad> leitet um (Tests)
KOLL_STAND = os.environ.get("KOLL_STAND") or "/tmp/koll_versprechen_stand.json"
KO_REGELN = ("R1", "R3", "R4", "R5", "R6", "R9")
# 14.10.2026 spät (Prüfung S3): R9 «Marke ohne Ware» — Markennamen ohne ein einziges aktives Produkt im Shop (Liste in der Regeldatei,
# gross/klein zählt). Mit frischem Produkt-Export (< 48 h) zählt eine Marke, die wieder aktive Ware hat, NICHT (Bericht: «wieder aktiv»).
KO_MARKEN = list((KO.get("marken_ohne_ware") or {}).get("muster") or [])
KO_MARKEN_RX = [(m, re.compile(r"(?<![\w])(?:" + m + r")(?![\w])")) for m in KO_MARKEN]
# Hinweis-Klasse «Ware im Text nicht aktiv» (zählt nicht rot): [handle, muster, was] — Titel der aktiven Produkte DIESER Kollektion
KO_WARE = [(h, re.compile(m), w) for h, m, w in (KO.get("ware_im_text") or {}).get("liste") or []]
# Prüfung S3 14.10. 13:36 (Befund 3): unveröffentlichte Kollektionen mit rotem Fund — in welchen ANDEREN Kanälen stehen sie? (Bericht)
KO_KANAL_NICHT = set((KO.get("kanaele") or {}).get("nicht_schaufenster") or [])


def koll_klartext(h):
    """Sichtbarer Text eines Kollektions-HTML: ohne den ls-verwandt-Block (Produktnamen, gehört interne_links.py), ohne
    Kommentare und Tags, Absatz-/Zeilenenden als Satzgrenze, Entities dekodiert — dieselbe Zählweise wie die S3-Messung."""
    import html as _html
    h = KO_VERWANDT.sub(" ", h or "")
    h = re.sub(r"<!--.*?-->", " ", h, flags=re.S)
    h = re.sub(r"<(?:br|/p|/li|/div|/h\d)[^>]*>", ". ", h, flags=re.I)
    t = _html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"\s+", " ", t).strip()


def satzteile(t):
    return [s.strip() for s in KO_TRENN.split(t or "") if s.strip()]


def land_nah(s, a, e, naehe=None):
    """True, wenn im Satzteil s ein Land-Beleg höchstens `naehe` Zeichen vor a oder hinter e steht (oder in s[a:e])."""
    n = KO_NAEHE if naehe is None else naehe
    return any(m.end() >= a - n and m.start() <= e + n for m in KO_LAND.finditer(s or ""))


def ab50_ohne_land(t):
    """R6: Satzteile (Klartext) mit einer Gratis-/Versandkostenfrei-Zusage «ab CHF 50», bei der KEIN Land-Beleg nah genug steht
    (land_nah; 14.10.2026 abends: «… für alle Bestellungen in der Schweiz» am Satzende belegt die Zusage nicht mehr).
    Auch von versand_band_wache.py Regel 3 benutzt (eine Quelle)."""
    rx = KO_RX.get("R6")
    if not rx or "50" not in (t or ""):
        return []
    return [s for s in satzteile(t) if any(not land_nah(s, m.start(), m.end()) for m in rx.finditer(s))]


def premium_kollektion(handle):
    h = handle or ""
    return h in KO_PREMIUM or (bool(KO_PREMIUM_RX.search(h)) and h not in KO_PREMIUM_NICHT)


def tempo_treffer(t):
    """R4-Kandidaten: [(satzteil, hart, qualifiziert)] — hart = Tempo-Wort mit Liefer-Substantiv, sonst Lager-/Werktage-Angabe."""
    out = []
    for s in satzteile(t):
        hart = any(r.search(s) for r in KT_HART) or any(r.search(s) for r in KT_KONTRAST)
        if hart or any(r.search(s) for r in KT_WEICH):
            out.append((s, hart, bool(KT_QUAL.search(s)) and not KT_QUAL_NICHT.search(s)))
    return out


def tempo_fund(treffer, anteil):
    """R4: Satzteile, die der Anteil profil-ch-lager NICHT belegt. anteil None = nicht gemessen = kein Beleg."""
    voll, teil = float(KT.get("voll", 0.95)), float(KT.get("teil", 0.5))
    a = 0.0 if anteil is None else anteil
    if a >= voll:
        return []
    return [s for s, hart, qual in treffer if a < teil or hart or not qual]


def marken_im_text(s, aktiv=None):
    """R9: Marken aus marken_ohne_ware im Satzteil s; aktiv = Menge der Listen-Einträge, die wieder aktive Ware haben (zählen nicht)."""
    return [m for m, rx in KO_MARKEN_RX if (not aktiv or m not in aktiv) and rx.search(s)]


def koll_funde(felder, handle, anteil=None, marken_aktiv=None):
    """felder = {feld: Klartext} → {Regel: [(feld, satzteil)]}. R4 nur mit gemessenem anteil sinnvoll (None = kein Beleg).
    R9 «Marke ohne Ware»: marken_aktiv = Listen-Einträge mit aktiver Ware (aus dem Export) — zählen nicht."""
    f = {}
    premium = premium_kollektion(handle)
    for feld, t in felder.items():
        if not t:
            continue
        for s in satzteile(t):
            for r in ("R1", "R3", "R5"):
                rx = KO_RX.get(r)
                if rx and not (r == "R5" and premium) and rx.search(s):
                    f.setdefault(r, []).append((feld, s))
            if marken_im_text(s, marken_aktiv):
                f.setdefault("R9", []).append((feld, s))
        for s in ab50_ohne_land(t):
            f.setdefault("R6", []).append((feld, s))
        for s in tempo_fund(tempo_treffer(t), anteil):
            f.setdefault("R4", []).append((feld, s))
    return f


def koll_felder(c):
    s = c.get("seo") or {}
    return {"title": c.get("title") or "", "descriptionHtml": koll_klartext(c.get("descriptionHtml")),
            "seo.title": s.get("title") or "", "seo.description": s.get("description") or ""}


def onlineshop_pub():
    d = gql("{ publications(first: 50) { nodes { id name } } }")
    ids = [p["id"] for p in d["publications"]["nodes"] if p["name"] in ("Online Store", "Onlineshop")]
    if len(ids) != 1:
        raise RuntimeError(f"Onlineshop-Publikation nicht eindeutig: {ids}")
    return ids[0]


def kollektionen_holen():
    """ALLE Kollektionen (paginiert, 100 je Seite) mit Text, SEO und Onlineshop-Status."""
    pub, out, c = onlineshop_pub(), [], None
    while True:
        d = gql('query($c:String,$p:ID!){ collections(first: 100, after: $c) { pageInfo { hasNextPage endCursor } nodes { id handle '
                'title descriptionHtml seo { title description } os: publishedOnPublication(publicationId: $p) } } }',
                {"c": c, "p": pub})["collections"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def profil_gesamt():
    """Aktive Produkte mit dem Zeichen profil-ch-lager im ganzen Shop (obere Schranke für jede Kollektion)."""
    marke = KT.get("marke") or "profil-ch-lager"
    return gql('query($q:String!){ productsCount(query: $q, limit: null) { count } }',
               {"q": f"status:active tag:'{marke}'"})["productsCount"]["count"]


def aktive_zahlen(cids):
    """{Kollektions-ID: aktive Produkte} — productsCount mit collection_id (gemessen 14.10. = Abblättern: 251/303/195/225)."""
    out = {}
    for i in range(0, len(cids), 25):
        teil = cids[i:i + 25]
        q = "{ " + " ".join(f'a{j}: productsCount(query: "collection_id:{cid.split("/")[-1]} status:active", limit: null) {{ count }}'
                            for j, cid in enumerate(teil)) + " }"
        d = gql(q)
        for j, cid in enumerate(teil):
            out[cid] = d[f"a{j}"]["count"]
    return out


def _entschieden(lo, hi, braucht_teil):
    voll, teil = float(KT.get("voll", 0.95)), float(KT.get("teil", 0.5))
    if lo >= voll:
        return True
    return hi < voll and (not braucht_teil or hi < teil or lo >= teil)


def _wert(lo, hi, braucht_teil):
    """Ein Anteil, der in tempo_fund() dieselbe Entscheidung trifft wie der genaue Wert."""
    voll, teil = float(KT.get("voll", 0.95)), float(KT.get("teil", 0.5))
    return lo if (lo >= voll or (braucht_teil and lo >= teil)) else hi


def lager_anteil(cid, n_aktiv, p_gesamt, braucht_teil):
    """Anteil profil-ch-lager an den aktiven Produkten → (Wert, Text, genau). «collection_id:… tag:…» liefert in der Produktsuche
    immer 0 (gemessen 14.10.: ft-herrenkostuem 0 statt 251), darum: obere Schranke p_gesamt/n_aktiv, sonst abblättern (250 je
    Seite, nur status + tags) und aufhören, sobald die Entscheidung (≥ voll? ≥ teil?) feststeht. braucht_teil = es gibt einen
    qualifizierten weichen Treffer (nur dann zählt die Schwelle teil)."""
    marke = KT.get("marke") or "profil-ch-lager"
    if not n_aktiv:
        return 0.0, "0 aktive", True
    obere = min(1.0, p_gesamt / n_aktiv)
    if _entschieden(0.0, obere, braucht_teil):
        return _wert(0.0, obere, braucht_teil), f"≤ {p_gesamt}/{n_aktiv} (Schranke)", False
    mit = ohne = 0
    c = None
    while True:
        d = gql('query($i:ID!,$c:String){ collection(id: $i) { products(first: 250, after: $c) { pageInfo { hasNextPage endCursor } '
                'nodes { status tags } } } }', {"i": cid, "c": c})["collection"]["products"]
        for p in d["nodes"]:
            if p["status"] == "ACTIVE":
                if marke in (p.get("tags") or []):
                    mit += 1
                else:
                    ohne += 1
        if not d["pageInfo"]["hasNextPage"]:
            n = mit + ohne
            return (mit / n if n else 0.0), f"{mit}/{n}", True
        lo, hi = mit / n_aktiv, min(obere, max(0.0, (n_aktiv - ohne) / n_aktiv))
        if _entschieden(lo, hi, braucht_teil):
            voll, teil = float(KT.get("voll", 0.95)), float(KT.get("teil", 0.5))
            stufe = (f"≥ {voll:.0%}" if lo >= voll else (f"{teil:.0%}–{voll:.0%}" if braucht_teil and lo >= teil else
                     (f"< {teil:.0%}" if braucht_teil else f"< {voll:.0%}")))
            return _wert(lo, hi, braucht_teil), f"{mit}+?/{n_aktiv} ({stufe}, nach {mit + ohne} abgebrochen)", False
        c = d["pageInfo"]["endCursor"]


def theme_kollektion():
    """Live-Dateien des Haupt-Themes: Organization-JSON-LD-Zahl, Slogan, verbotene Zeichenfolgen (Abschnitt kollektion).
    → dict oder None (nicht lesbar)."""
    jl = KO.get("jsonld") or {}
    verboten = KO.get("theme_verboten") or {}
    namen = sorted(set(jl.get("dateien") or []) | set(verboten))
    try:
        d = gql('query($f:[String!]!){ themes(first: 1, roles: [MAIN]) { nodes { id files(filenames: $f) { nodes { filename body { '
                '... on OnlineStoreThemeFileBodyText { content } } } } } } }', {"f": namen})
        th = d["themes"]["nodes"][0]
        t = {x["filename"]: x["body"]["content"] for x in th["files"]["nodes"]}
    except Exception as e:  # noqa: BLE001
        print(f"   Theme nicht lesbar: {str(e)[:120]}", flush=True)
        return None
    fehlen = [n for n in namen if n not in t]
    org = sum(len(KO_JSONLD.findall(t.get(n, ""))) for n in jl.get("dateien") or [])
    slogan = [n.split("/")[-1] for n in jl.get("dateien") or [] if jl.get("slogan") and jl["slogan"] in t.get(n, "")]
    treffer = [f"{n.split('/')[-1]} mit «{x[:60]}»" for n in verboten for x in verboten[n] if x in t.get(n, "")
               and not (jl.get("slogan") and x == jl["slogan"])]          # Slogan steht schon in «Slogan FEHLT»
    return {"theme": th["id"], "org": org, "slogan": slogan, "verboten": treffer, "fehlen": fehlen}


def marken_aktiv_export(pfad=None, max_alter=48 * 3600):
    """R9-Gegenprobe: {Listen-Eintrag: aktive Produkte} für Marken aus marken_ohne_ware, die im Produkt-Export (Titel oder Tags) WIEDER
    vorkommen. None = kein Export jünger als max_alter (dann zählt jede gelistete Marke)."""
    pfad = pfad or CACHE
    try:
        if time.time() - os.path.getmtime(pfad) > max_alter:
            return None
    except OSError:
        return None
    gesamt = re.compile("|".join(f"(?:{rx.pattern})" for _, rx in KO_MARKEN_RX)) if KO_MARKEN_RX else None
    zahl = {}
    if not gesamt:
        return zahl
    for z in open(pfad, encoding="utf-8"):
        if '"handle"' not in z:
            continue
        o = json.loads(z)
        if "__parentId" in o:
            continue
        t = " | ".join([o.get("title") or ""] + list(o.get("tags") or []))
        if not gesamt.search(t):
            continue
        for m, rx in KO_MARKEN_RX:
            if rx.search(t):
                zahl[m] = zahl.get(m, 0) + 1
    return zahl


def ware_titel_holen(handles):
    """{handle: [Titel der AKTIVEN Produkte]} live für die Kollektionen der Hinweis-Liste (nur lesen)."""
    out = {}
    for h in sorted(handles):
        titel, c = [], None
        while True:
            d = gql('query($h:String!,$c:String){ collectionByHandle(handle: $h) { products(first: 250, after: $c) { pageInfo { '
                    'hasNextPage endCursor } nodes { status title } } } }', {"h": h, "c": c})["collectionByHandle"]
            if not d:
                break
            p = d["products"]
            titel += [n["title"] for n in p["nodes"] if n["status"] == "ACTIVE"]
            if not p["pageInfo"]["hasNextPage"]:
                break
            c = p["pageInfo"]["endCursor"]
        out[h] = titel
    return out


def kanaele_holen(handles):
    """{handle: [Namen der Kanäle, in denen die Kollektion veröffentlicht ist]} live (nur lesen), 20 Kollektionen je Abfrage."""
    out, hs = {}, sorted(handles)
    for i in range(0, len(hs), 20):
        teil = hs[i:i + 20]
        q = ("query(" + ",".join(f"$h{j}:String!" for j in range(len(teil))) + "){ "
             + " ".join(f"k{j}: collectionByHandle(handle: $h{j}) {{ resourcePublications(first: 30, onlyPublished: true) "
                        f"{{ nodes {{ publication {{ name }} }} }} }}" for j in range(len(teil))) + " }")
        d = gql(q, {f"h{j}": h for j, h in enumerate(teil)})
        for j, h in enumerate(teil):
            k = d.get(f"k{j}") or {}
            out[h] = sorted({n["publication"]["name"] for n in (k.get("resourcePublications") or {}).get("nodes") or []
                             if n.get("publication")})
    return out


def andere_kanaele(kanaele, handles):
    """{handle: [Kanäle ausser nicht_schaufenster]} — nur Kollektionen, die dort wirklich stehen."""
    out = {h: [k for k in (kanaele or {}).get(h, []) if k not in KO_KANAL_NICHT] for h in handles}
    return {h: v for h, v in out.items() if v}


def ware_hinweise(feld_von_handle, titel_von):
    """«Ware im Text nicht aktiv»: [(handle, was, felder)] — muster steht im Text, aber in KEINEM aktiven Produkttitel der Kollektion.
    feld_von_handle = {handle: {feld: Klartext}}; titel_von = {handle: [Titel]} (fehlt ein Handle: nicht geprüft)."""
    out = []
    for h, rx, was in KO_WARE:
        fe = feld_von_handle.get(h)
        if not fe or h not in titel_von:
            continue
        felder = [f for f, t in fe.items() if t and rx.search(t)]
        if felder and not any(rx.search(t) for t in titel_von[h]):
            out.append((h, was, felder))
    return out


def koll_lauf(koll=None, anteile=None, marken_aktiv=None, ware_titel=None, kanaele=None):
    """Zählt alle Kollektionen → (Zeile, Info). koll/anteile ({handle: Anteil}), marken_aktiv ({Marke: n}), ware_titel ({handle:
    [Titel]}) und kanaele ({handle: [Kanal]}) nur für Tests von aussen (sonst live bzw. aus dem Export; mit koll von aussen und ohne
    kanaele werden keine Kanäle gelesen)."""
    t0 = time.time()
    test = koll is not None
    koll = koll if koll is not None else kollektionen_holen()
    feld_von = {c["id"]: koll_felder(c) for c in koll}
    treffer_von = {cid: [x for t in fe.values() for x in tempo_treffer(t)] for cid, fe in feld_von.items()}
    anteile = dict(anteile or {})
    belege = {}
    offen = [c for c in koll if treffer_von[c["id"]] and c["handle"] not in anteile]
    if offen:
        p_gesamt = profil_gesamt()
        n_von = aktive_zahlen([c["id"] for c in offen])
        for c in offen:
            braucht_teil = any(not hart and qual for _, hart, qual in treffer_von[c["id"]])
            wert, text, _ = lager_anteil(c["id"], n_von[c["id"]], p_gesamt, braucht_teil)
            anteile[c["handle"]], belege[c["handle"]] = wert, text
    if marken_aktiv is None and not test:
        marken_aktiv = marken_aktiv_export()
    m_aktiv = set(marken_aktiv or {})
    zahl = {"pub": {r: set() for r in KO_REGELN}, "unpub": {r: set() for r in KO_REGELN}}
    alle = {"pub": set(), "unpub": set()}
    # 14.10.2026 abends: GETRENNT ausgewiesen, nicht in der Rot-Zahl — «manuell» (Titel/SEO-Titel: schreibt das Werkzeug nicht) und
    # «Premium-Hinweis» (Premium-Kollektionen: dort nur Satzpaare, solange PREMIUM_VOLL aus ist — Betreiber-Entscheid)
    manuell = {"pub": set(), "unpub": set()}
    premium = {"pub": set(), "unpub": set()}
    details = []
    for c in koll:
        f = koll_funde(feld_von[c["id"]], c["handle"], anteile.get(c["handle"]) if treffer_von[c["id"]] else None, m_aktiv)
        if not f:
            continue
        g = "pub" if c.get("os") else "unpub"
        rot, man, prem = koll_klassen(f, c["handle"])
        if rot:
            alle[g].add(c["handle"])
            for r in rot:
                zahl[g][r].add(c["handle"])
        if man:
            manuell[g].add(c["handle"])
        if prem:
            premium[g].add(c["handle"])
        details.append((g, c["handle"], f, belege.get(c["handle"]), rot, man, prem))
    # Hinweis-Klasse «Ware im Text nicht aktiv» (zählt nicht rot): nur Kollektionen der Liste, deren Text das Muster trägt
    fv_h = {c["handle"]: feld_von[c["id"]] for c in koll}
    os_von = {c["handle"]: bool(c.get("os")) for c in koll}
    kand = {h for h, rx, _ in KO_WARE if h in fv_h and any(t and rx.search(t) for t in fv_h[h].values())}
    if ware_titel is None:
        try:
            ware_titel = ware_titel_holen(kand) if kand else {}
        except Exception as e:  # noqa: BLE001 — Hinweis darf die Zählung nicht kippen
            print(f"   Ware-Hinweis nicht messbar: {str(e)[:120]}", flush=True)
            ware_titel = None
    ware = ware_hinweise(fv_h, ware_titel) if ware_titel is not None else None
    # Unveröffentlicht mit rotem Fund: Kanäle lesen (nur Bericht — die Ampel zählt den Onlineshop)
    if kanaele is None and not test and alle["unpub"]:
        try:
            kanaele = kanaele_holen(alle["unpub"])
        except Exception as e:  # noqa: BLE001 — Kanäle sind Zusatz, die Zählung darf nicht kippen
            print(f"   Kanäle nicht lesbar: {str(e)[:120]}", flush=True)
            kanaele = None
    andere = andere_kanaele(kanaele, alle["unpub"]) if kanaele is not None else None
    ware_g = {"pub": sorted({h for h, _, _ in ware or [] if os_von.get(h)}),
              "unpub": sorted({h for h, _, _ in ware or [] if not os_von.get(h)})}
    th = theme_kollektion()
    soll = int((KO.get("jsonld") or {}).get("soll", 1))
    teile = [f"KOLL-VERSPRECHEN: {len(alle['pub'])} veröffentlicht / {len(alle['unpub'])} unveröffentlicht ("
             + " · ".join(f"{r} {len(zahl['pub'][r])}/{len(zahl['unpub'][r])}" for r in KO_REGELN) + ")"
             + f" · manuell {len(manuell['pub'])}/{len(manuell['unpub'])} · Premium-Hinweis {len(premium['pub'])}/{len(premium['unpub'])}"
             + (" · Ware-Hinweis ?" if ware is None else f" · Ware-Hinweis {len(ware_g['pub'])}/{len(ware_g['unpub'])}")
             + (f" · Marke wieder aktiv: {', '.join(sorted(m_aktiv))}" if m_aktiv else "")
             + (f" · unveröffentlicht, aber in anderen Kanälen: {len(andere)}" if andere else "")]
    if th is None:
        teile.append("JSON-LD Organization ? (Theme nicht lesbar) · Slogan ?")
    else:
        teile.append(f"JSON-LD Organization {th['org']} (Soll {soll})")
        teile.append("Slogan ok" if not th["slogan"] else f"Slogan FEHLT: «{(KO.get('jsonld') or {}).get('slogan')}» steht noch in "
                     + ", ".join(th["slogan"]))
        if th["verboten"] or th["fehlen"]:
            teile.append("Theme FEHLT: " + "; ".join(th["verboten"] + [f"{n} nicht lesbar" for n in th["fehlen"]]))
    warn = alle["pub"] or alle["unpub"] or th is None or th["org"] != soll or th["slogan"] or th["verboten"] or th["fehlen"]
    zeile = ("⚠️ " if warn else "") + " · ".join(teile)
    return zeile, {"details": details, "theme": th, "anteile": anteile, "gemessen": len(offen), "n": len(koll),
                   "n_pub": sum(1 for c in koll if c.get("os")), "dauer": time.time() - t0,
                   "rot": {g: sorted(v) for g, v in alle.items()}, "manuell": {g: sorted(v) for g, v in manuell.items()},
                   "premium": {g: sorted(v) for g, v in premium.items()},
                   "ware": ware, "ware_g": ware_g, "marken_aktiv": dict(marken_aktiv or {}),
                   "kanaele": dict(kanaele or {}), "andere_kanaele": andere,
                   "theme_ok": th is not None and th["org"] == soll and not th["slogan"] and not th["verboten"] and not th["fehlen"]}


def koll_klassen(f, handle):
    """{Regel: [(feld, satz)]} → (rot, manuell, premium), je {Regel: [(feld, satz)]}. Premium-Kollektion: alles Hinweis (das Werkzeug
    setzt dort nur Satzpaare, PREMIUM_VOLL aus); sonst Titel/SEO-Titel (manuell_felder) → manuell, der Rest zählt rot."""
    rot, man, prem = {}, {}, {}
    pk = premium_kollektion(handle)
    for r, liste in f.items():
        for fe, s in liste:
            ziel = prem if pk else (man if fe in KO_MANUELL else rot)
            ziel.setdefault(r, []).append((fe, s))
    return rot, man, prem


def koll_bericht(zeile, info, pfad=None):
    pfad = pfad or KOLL_BERICHT
    th = info.get("theme") or {}
    with open(pfad, "w", encoding="utf-8") as f:
        f.write(f"# Kollektionen: Versprechen ohne Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n{zeile}\n\n"
                f"Geprüft: {info['n']} Kollektionen ({info['n_pub']} im Onlineshop veröffentlicht, {info['n'] - info['n_pub']} nicht — "
                "die meisten davon hängen an «Luxe Style Headless», «Shop» oder «Google & YouTube»). Anteil profil-ch-lager live "
                f"gemessen für {info['gemessen']} Kollektionen mit Tempo-/Werktage-Angabe. Theme {th.get('theme', '?')}. Regel: "
                "`automation/data/versprechen_regel.json` → `kollektion` (S3, 14.10.2026). Der Wächter schreibt nichts; ersetzt wird "
                "mit `automation/kollektion_versprechen_s3.py` (feste Satzpaare, dieselben Finder).\n\n"
                "R1 «✔ Geprüfte …» · R3 «Geprüft…» · R4 Tempo/Werktage ohne belegtes CH-Lager (Anteil < 95 %; 50–94 % nur Werktage "
                "in qualifiziertem Satzteil; der Lager-Ort allein ist kein Fund) · R5 «Premium-Marken/-Qualität» ausserhalb "
                "Premium-Kollektionen · R6 «ab CHF 50» ohne Land in der Nähe der Zusage · R9 Markenname ohne ein aktives Produkt im Shop "
                "(Liste `marken_ohne_ware`). «manuell» = Titel/SEO-Titel (das Werkzeug "
                "schreibt sie nicht), «Premium-Hinweis» = Premium-Kollektion (dort nur Satzpaare, PREMIUM_VOLL aus) — beide zählen "
                "nicht in die Rot-Zahl, stehen aber unten mit Handle. «Ware-Hinweis» = im Text genannte Ware, die in der Kollektion "
                "kein aktives Produkt hat (Liste `ware_im_text`, zählt nicht rot).\n")
        for g, titel in (("pub", "Im Onlineshop veröffentlicht"), ("unpub", "Nicht im Onlineshop veröffentlicht")):
            zeilen = [d for d in info["details"] if d[0] == g and d[4]]
            f.write(f"\n## {titel} ({len(zeilen)})\n\n")
            for _, h, _f, ant, rot, _m, _p in sorted(zeilen, key=lambda d: d[1]):
                a = f" · CH-Lager {ant}" if ant else ""
                if g == "pub":       # veröffentlicht: je Regel bis 2 Stellen; unveröffentlicht: je Regel 1 Stelle, kürzer
                    teil = " · ".join(f"{r} {fe}: «{s[:110]}»" for r in KO_REGELN for fe, s in rot.get(r, [])[:2])
                else:
                    teil = " · ".join(f"{r} «{rot[r][0][1][:60]}»" for r in KO_REGELN if rot.get(r))
                    kn = (info.get("kanaele") or {}).get(h)
                    if kn is not None:
                        teil += " · Kanäle: " + (", ".join(kn) if kn else "keine")
                f.write(f"- `{h}`{a} — {teil}\n")
        for idx, titel in ((5, "Manuell (Titel / SEO-Titel)"), (6, "Premium-Hinweis (Premium-Kollektionen, PREMIUM_VOLL aus)")):
            zeilen = [d for d in info["details"] if d[idx]]
            f.write(f"\n## {titel} ({len(zeilen)})\n\n")
            for d in sorted(zeilen, key=lambda d: (d[0], d[1])):
                teil = " · ".join(f"{r} {fe}: «{s[:90]}»" for r in KO_REGELN for fe, s in d[idx].get(r, [])[:2])
                f.write(f"- `{d[1]}` ({'veröffentlicht' if d[0] == 'pub' else 'unveröffentlicht'}) — {teil}\n")
        andere = info.get("andere_kanaele")
        f.write(f"\n## Nicht im Onlineshop, aber in anderen Kanälen veröffentlicht ({'?' if andere is None else len(andere)}) — "
                "Betreiber-Entscheid\n\nRoter Fund in einer Kollektion, die im Onlineshop unveröffentlicht ist, aber in anderen "
                "Verkaufskanälen steht (ohne " + ", ".join(sorted(KO_KANAL_NICHT)) + "). Ob diese Kanäle den Kollektionstext anzeigen, "
                "ist nicht geprüft; die Ampel zählt nur den Onlineshop.\n\n")
        for h in sorted(andere or {}):
            rot = next((d[4] for d in info["details"] if d[1] == h), {})
            f.write(f"- `{h}` — {', '.join(andere[h])} · " + " · ".join(f"{r} «{rot[r][0][1][:60]}»" for r in KO_REGELN if rot.get(r))
                    + "\n")
        ware = info.get("ware")
        f.write(f"\n## Ware-Hinweis (im Text genannt, kein aktives Produkt in der Kollektion) ({'?' if ware is None else len(ware)})\n\n")
        for h, was, felder in sorted(ware or []):
            f.write(f"- `{h}` — {was} · {', '.join(felder)}\n")
        if info.get("marken_aktiv"):
            f.write("\n## Marke wieder aktiv (aus `marken_ohne_ware` nehmen)\n\n")
            for m, n in sorted(info["marken_aktiv"].items()):
                f.write(f"- {m}: {n} aktive Produkte\n")


def koll_stand_schreiben(zeile, info, pfad=None):
    """Stand für die Ampel: Zeit, Rot-Zahlen, manuell/Premium getrennt. Atomar (tmp + rename)."""
    pfad = pfad or KOLL_STAND
    d = {"zeit": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "zeile": zeile,
         "pub": len(info["rot"]["pub"]), "unpub": len(info["rot"]["unpub"]),
         "pub_handles": info["rot"]["pub"][:20], "manuell": info["manuell"], "premium": info["premium"],
         "ware": info.get("ware_g"), "andere_kanaele": info.get("andere_kanaele"),
         "theme_ok": info["theme_ok"], "n": info["n"]}
    tmp = pfad + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, pfad)


def koll_zeile():
    """Kollektionsteil für main(): zählen, Bericht + Stand schreiben, Zeile drucken. Fehler → «unklar», nie «0».
    Bericht: im Normallauf dropship/KOLL-VERSPRECHEN.md; KOLL_BERICHT=<pfad> leitet um; unter DRY=1 ohne KOLL_BERICHT entsteht KEINE
    Repo-Datei (Prüfung S3 14.10.: eine Messung erzeugte sonst über den Autocommitter einen Commit). Stand für die Ampel: KOLL_STAND
    (Standard /tmp/koll_versprechen_stand.json), unter DRY nur, wenn KOLL_STAND gesetzt ist."""
    try:
        zeile, info = koll_lauf()
        ziel = os.environ.get("KOLL_BERICHT") or (None if DRY else KOLL_BERICHT)
        if ziel:
            koll_bericht(zeile, info, ziel)
        if not DRY or os.environ.get("KOLL_STAND"):
            koll_stand_schreiben(zeile, info)
        zeile += f" [{info['n']} Kollektionen, Anteil {info['gemessen']}× gemessen, {info['dauer']:.0f} s]"
    except Exception as e:  # noqa: BLE001 — die Produkt-Zeile soll trotzdem erscheinen
        zeile = f"⚠️ KOLL-VERSPRECHEN: unklar ({type(e).__name__}: {str(e)[:100]})"
    print(zeile, flush=True)
    return zeile


def selbsttest():
    f = 0
    for art, ein, soll in REGEL["kanarien"]:
        ist = {"seo": seo, "titel": titel, "text": text_liefer, "eigen": text_eigen}[art](ein)
        if ist != soll:
            f += 1
            print(f"  ✗ {art}: {ein!r}\n      ist  {ist!r}\n      soll {soll!r}")
    for ein, produkt, soll in D.get("kanarien", []):
        ist = diamant(ein, produkt)
        if ist != soll:
            f += 1
            print(f"  ✗ diamant: {ein!r}\n      ist  {ist!r}\n      soll {soll!r}")
    for art, fn in (("reinstoff", reinstoff_titel), ("inci", inci_beleg), ("mischung", mischung_beleg)):
        for ein, soll in K.get(f"kanarien_{art}", []):
            if fn(ein) != soll:
                f += 1
                print(f"  ✗ {art}: {ein!r} → {fn(ein)} (soll {soll})")
    for ein, soll in (('<div class="lspod-designer"></div><p>x</p>', True),
                      ('<div class="lspod-designer"></div><div class="ls-pod-retoure">…</div>', False),
                      ('<p>eine Rückgabe aus Meinungsänderung ist darum ausgeschlossen</p><div class="lspod-designer">', False),
                      ('<p>Normales Produkt, 30 Tage Rückgabe</p>', False)):
        if editor_ohne_satz(ein) != soll:
            f += 1
            print(f"  ✗ editor_ohne_satz: {ein!r} → {editor_ohne_satz(ein)} (soll {soll})")
    # 14.10.2026 (S3): Kollektions-Finder R1/R3/R4/R5/R6, Premium-Ausnahme, Klartext ohne ls-verwandt, JSON-LD-Zähler
    for ein, anteil, soll in KO.get("kanarien", []):
        ist = sorted(koll_funde({"text": ein}, "test-kollektion", anteil))
        if ist != sorted(soll):
            f += 1
            print(f"  ✗ kollektion: {ein!r} (Anteil {anteil}) → {ist} (soll {sorted(soll)})")
    for ein, handle, soll in KO.get("kanarien_premium", []):
        ist = sorted(koll_funde({"text": ein}, handle, None))
        if ist != sorted(soll):
            f += 1
            print(f"  ✗ kollektion-premium: {ein!r} in {handle} → {ist} (soll {sorted(soll)})")
    weitere = [
        ("klartext", koll_klartext('<p>Mode</p><!-- ls-verwandt --><p><a href="/x">Premium-Qualität Set</a></p><!-- /ls-verwandt -->'
                                   '<p>Gratis-Versand ab CHF 50</p><!--gd2-->'), "Mode. Gratis-Versand ab CHF 50."),
        ("jsonld", len(KO_JSONLD.findall('{"@type":"Organization"} {"@type": "Organization"} {"@type":"OrganizationRole"} '
                                         '{"@type":"WebSite"}')), 2),
        ("ab50", ab50_ohne_land("Gratis-Versand ab CHF 50 · 30 Tage. Versand innerhalb der Schweiz, gratis ab CHF 50. Set ab CHF 50"),
         ["Gratis-Versand ab CHF 50"]),
        ("dezimal", ab50_ohne_land("Bundle für CHF 99.00 – versandkostenfrei ab CHF 50. Mehr"),   # «99.00» trennt keinen Satzteil
         ["Bundle für CHF 99.00 – versandkostenfrei ab CHF 50"]),
        # 14.10.2026 abends: Nähe — 25 Zeichen hinter der Zusage zählt, 26 nicht; vor der Zusage ebenso
        ("naehe-25", ab50_ohne_land("Gratis-Versand ab CHF 50 " + "y" * 23 + " in der Schweiz"), []),
        ("naehe-26", len(ab50_ohne_land("Gratis-Versand ab CHF 50 " + "y" * 24 + " in der Schweiz")), 1),
        ("naehe-vor", ab50_ohne_land("Versand innerhalb der Schweiz, gratis ab CHF 50"), []),
        ("klassen-manuell", tuple(sorted(x) for x in koll_klassen({"R4": [("title", "a")], "R6": [("descriptionHtml", "b")]},
                                                                  "herren-jacken")), (["R6"], ["R4"], [])),
        ("klassen-seo-titel", sorted(koll_klassen({"R4": [("seo.title", "a")]}, "x")[1]), ["R4"]),
        ("klassen-premium", tuple(sorted(x) for x in koll_klassen({"R1": [("descriptionHtml", "a")], "R6": [("title", "b")]},
                                                                  "luxus-highend")), ([], [], ["R1", "R6"])),
        ("klassen-premium-handle", premium_kollektion("premium-marken-lager") and premium_kollektion("x-highend-y")
         and not premium_kollektion("premium-geschenke"), True),
        # 14.10.2026 spät (Prüfung S3): R9 mit Export-Gegenprobe, Kontrast, Ware-Hinweis
        ("r9-wieder-aktiv", sorted(koll_funde({"descriptionHtml": "Reiniger von Sonax und Turtle Wax"}, "x", None, {"Sonax", "Turtle Wax"})),
         []),
        ("r9-teil-aktiv", sorted(koll_funde({"descriptionHtml": "Reiniger von Sonax und Turtle Wax"}, "x", None, {"Sonax"})), ["R9"]),
        ("r9-titel-manuell", tuple(sorted(x) for x in koll_klassen(koll_funde({"title": "Hot Wheels Modelle"}, "x"), "x")),
         ([], ["R9"], [])),
        ("kontrast-voll", tempo_fund(tempo_treffer("Der übrige Katalog kommt direkt ab Werk (10–20 Werktage)."), 0.97), []),
        ("ware-hinweis", ware_hinweise({"strand": {"descriptionHtml": "Schlauchboote und Bollerwagen", "title": "Strand"}},
                                       {"strand": ["Luftmatratze Ananas", "Bollerwagen faltbar"]}),
         [("strand", "Schlauchboote (0/7)", ["descriptionHtml"])]),
        ("ware-nicht-geprueft", ware_hinweise({"strand": {"descriptionHtml": "Schlauchboote"}}, {}), []),
        # Runde 3 (Prüfung S3 14.10. 13:36): «genannt»-Einträge — Muster trifft den Beispieltitel (genannt_beleg); fällt die Ware weg
        # (keine aktiven Titel), meldet der Wächter genau diesen Eintrag; Kanäle ohne Schaufenster zählen nicht als «andere»
        ("ware-genannt-beleg", [(h, w) for h, w, t in (KO.get("ware_im_text") or {}).get("genannt_beleg") or []
                                if not t or ware_hinweise({h: {"descriptionHtml": t}}, {h: [t]})
                                or (h, w, ["descriptionHtml"]) not in ware_hinweise({h: {"descriptionHtml": t}}, {h: []})], []),
        ("ware-genannt-anzahl", len((KO.get("ware_im_text") or {}).get("genannt_beleg") or []) >= 100, True),
        ("ware-genannt-kleid", ware_hinweise({"top-5-start": {"descriptionHtml": "Stücke: luftige Sommerkleider."}},
                                             {"top-5-start": ["Sonnenbrille Retro"]})[0][:2][0], "top-5-start"),
        ("kanaele-andere", andere_kanaele({"a": ["Headless", "Shop"], "b": ["Inbox", "Luxe Style Headless"], "c": []}, {"a", "b", "c"}),
         {"a": ["Shop"]}),
    ]
    for name, ist, soll in weitere:
        if ist != soll:
            f += 1
            print(f"  ✗ {name}: {ist!r} (soll {soll!r})")
    n = 4 + len(REGEL["kanarien"]) + len(D.get("kanarien", [])) + sum(len(K.get(f"kanarien_{a}", [])) for a in ("reinstoff", "inci", "mischung")) \
        + len(KO.get("kanarien", [])) + len(KO.get("kanarien_premium", [])) + len(weitere)
    print(f"Selbsttest: {n - f}/{n} ok")
    return f == 0


def gql(q, v=None):
    from kollektionstexte_nachbessern import gql as g        # Client-Credentials-Token, Retry, lauter Abbruch
    return g(q, v)


def export():
    m = gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } userErrors { message } } }' % BULK)
    r = m["bulkOperationRunQuery"]
    if r["userErrors"]:
        raise SystemExit(f"Bulk-Start fehlgeschlagen: {r['userErrors']}")
    bid = r["bulkOperation"]["id"]                          # Status nur über die EIGENE Bulk-ID (Regel fremder-bulk)
    while True:
        time.sleep(15)
        b = gql('query($i:ID!){node(id:$i){... on BulkOperation{status objectCount url errorCode}}}', {"i": bid})["node"]
        print("   bulk:", b["status"], b["objectCount"], flush=True)
        if b["status"] == "COMPLETED":
            subprocess.run(["curl", "-sS", "-o", CACHE, b["url"]], check=True)
            return
        if b["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {b['status']} {b.get('errorCode')}")


def produkte():
    alle, sku, medien = {}, {}, {}
    for z in open(CACHE, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o:
            if "/ProductVariant/" in o.get("id", ""):
                sku.setdefault(o["__parentId"], o.get("sku") or "")
            elif "alt" in o:
                medien.setdefault(o["__parentId"], []).append(o)
        elif "handle" in o:
            alle[o["id"]] = o
    for pid, p in alle.items():
        p["_sku"] = sku.get(pid, "")
        p["_medien"] = medien.get(pid, [])
        yield p


def alts_schreiben(p, aend):
    """Bild-Alt-Texte (Schema «<Titel> – Bild N | LuxeStyle») — dieselbe Regel wie der Titel; Rücklesen auf Gleichheit."""
    r = gql(M_ALT, {"id": p["id"], "m": [{"id": i, "alt": n} for i, _, n in aend]})["productUpdateMedia"]
    live = {x["id"]: x["alt"] for x in (r.get("media") or [])}
    ok = 0
    with open(ALT_LEDGER, "a", encoding="utf-8") as f:
        for i, a, n in aend:
            gut = not r.get("mediaUserErrors") and live.get(i) == n
            ok += gut
            f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), p["id"], i, (a or "").replace("\t", " "), n,
                                "ok" if gut else f"FEHLER {str(r.get('mediaUserErrors'))[:60]}"]) + "\n")
    return ok, len(aend) - ok


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if os.environ.get("NUR") == "kollektion":            # 14.10.2026 (S3): nur Kollektionen + Theme zählen, kein Produkt-Export
        ko_zeile = koll_zeile()
        print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: nur Kollektionen · {ko_zeile}")
        return
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        export()
    n = fix = fehl = 0
    zaehl, handles, beispiele, echt = {}, [], [], []
    nur_k = os.environ.get("NUR") == "kosmetik"
    kos_n = kos_ohne = 0
    rein_widerspruch, rein_offen = [], []
    ed_n, ed_ohne = 0, []
    for p in produkte():
        n += 1
        if (E.get("editor_marker") or "lspod-designer") in (p.get("descriptionHtml") or ""):   # 13.10.2026 Klasse 7
            ed_n += 1
            if editor_ohne_satz(p.get("descriptionHtml")):
                ed_ohne.append(p["handle"])
        lager = schweiz_lager(p.get("tags"), p["_sku"])
        s = p.get("seo") or {}
        neu = {}
        h = p.get("descriptionHtml") or ""
        if ist_kosmetik(p):                     # 13.10.2026: zählen, nichts schreiben (Klasse 12)
            kos_n += 1
            beleg = inci_beleg(h)
            kos_ohne += not beleg
            if reinstoff_titel(p["title"]):
                if mischung_beleg(h):
                    rein_widerspruch.append((p["handle"], p["title"]))
                elif not beleg:
                    rein_offen.append((p["handle"], p["title"]))
        if nur_k:
            continue
        ctx = f"{p['title']} {h}"
        t_neu = diamant(p["title"] if lager else titel(p["title"]), ctx)
        if t_neu != p["title"] and t_neu:
            neu["title"] = t_neu
        h_neu = diamant(text_eigen(h if lager else text_liefer(h)), ctx)
        if h_neu != h:
            neu["descriptionHtml"] = h_neu
        st, sd = s.get("title"), s.get("description")
        st_neu = st if not st else diamant(st if lager else seo(st), ctx)
        sd_neu = sd if not sd else diamant(sd if lager else seo(sd), ctx)
        if (st_neu, sd_neu) != (st, sd):
            neu["seo"] = {"title": st_neu, "description": sd_neu}
        alt_aend = []
        for m in p.get("_medien") or []:
            a = m.get("alt") or ""
            if a:
                a_neu = diamant(a if lager else titel(a), ctx)
                if a_neu != a and a_neu:
                    alt_aend.append((m["id"], a, a_neu))
        if alt_aend:
            zaehl["alt"] = zaehl.get("alt", 0) + len(alt_aend)
            if DRY:
                print(f"  {p['handle'][:55]:55} {len(alt_aend)} Alt-Texte", flush=True)
            else:
                a_ok, a_fehl = alts_schreiben(p, alt_aend)
                fehl += a_fehl
                if a_fehl:
                    print(f"    ⛔ Alt-Texte {p['handle']}: {a_fehl} Fehler", flush=True)
        if re.search(r"[Dd]iamant", ctx) and re.search(r"vvs|karat|\bct\b|lab[- ]?grown|labor", ctx, re.I) \
                and not re.search(r"moissanit", ctx, re.I):
            echt.append((p["handle"], p["title"]))
        if re.search(r"sofort-lieferbar|schnell-lieferbar", p["handle"]) and not lager:
            handles.append((p["handle"], p["title"]))
        if not neu:
            continue
        for k in neu:
            zaehl[k] = zaehl.get(k, 0) + 1
        if "iamant" in json.dumps(p, ensure_ascii=False) and any(
                "Strass" in json.dumps(v, ensure_ascii=False) or "Zirkonia" in json.dumps(v, ensure_ascii=False) for v in neu.values()):
            zaehl["diamant"] = zaehl.get("diamant", 0) + 1
        if len(beispiele) < 40:
            beispiele.append((p["handle"], {k: (v if k != "descriptionHtml" else "…") for k, v in neu.items()}))
        print(f"  {p['handle'][:55]:55} {'+'.join(neu)}", flush=True)
        if DRY:
            fix += 1
            continue
        eingabe = {"id": p["id"], **neu}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title descriptionHtml seo{title description}} "
                "userErrors{message}}}", {"p": eingabe})["productUpdate"]
        got = r.get("product") or {}
        ok = not r.get("userErrors")
        if ok and "title" in neu:
            ok = got.get("title") == neu["title"]
        if ok and "descriptionHtml" in neu:
            # Shopify normalisiert HTML leicht — verglichen wird, dass KEIN Versprechen mehr drinsteht
            gh = got.get("descriptionHtml") or ""
            ok = text_eigen(gh) == gh and diamant(gh, f"{got.get('title') or ''} {gh}") == gh
        if ok and "seo" in neu:
            g = got.get("seo") or {}
            # SEO-Titel gleich Produkttitel speichert Shopify als null (heisst: Produkttitel gilt)
            ok = (g.get("description") or "") == (neu["seo"]["description"] or "") and \
                 ((g.get("title") or "") == (neu["seo"]["title"] or "") or (g.get("title") is None))
        if not ok:
            fehl += 1
            print("    ⛔", r.get("userErrors"), flush=True)
            continue
        fix += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d')}\t{p['id']}\t{'+'.join(neu)}\t{p['handle']}\n")
    sichtbar = theme_bedingung()
    k_zeile = (f"GEPRÜFT-OHNE-INCI: {kos_ohne} von {kos_n} Kosmetik ohne Inhaltsstoff-Liste · sichtbar "
               f"{0 if sichtbar else (kos_ohne if sichtbar is False else '?')} (Theme-Bedingung {'aktiv' if sichtbar else ('fehlt' if sichtbar is False else 'unklar')}) "
               f"· Reinstoff-Titel mit Mischung {len(rein_widerspruch)} · ohne Liste {len(rein_offen)}")
    print(k_zeile, flush=True)
    tk = theme_klassen()
    e_zeile = (f"EDITOR-RÜCKGABE: {len(ed_ohne)} von {ed_n} Editor-Produkten ohne Ausschluss-Satz"
               + (f" ({', '.join(ed_ohne[:4])} → python3 automation/editor_rueckgabe_satz.py --scharf)" if ed_ohne else "")
               + " · Theme " + ("unklar" if tk is None else ("ok (Klassen 5/7/16)" if not tk else "FEHLT: " + "; ".join(tk[:4]))))
    if ed_ohne or tk:
        e_zeile = "⚠️ " + e_zeile
    print(e_zeile, flush=True)
    k_zeile = k_zeile + " · " + e_zeile
    with open(K_BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Kosmetik: Inhaltsstoff-Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n{k_zeile}\n\n"
                "Regel: `automation/data/versprechen_regel.json` → `kosmetik_beleg` (Kauf-Strecke Klasse 12, 13.10.2026). "
                "Liste = einer der Marker " + " · ".join(f"«{m}»" for m in K_INCI) + " im Beschreibungstext. Der Wächter schreibt nichts: "
                "INCI nur vom Karton (zweimal unabhängig gelesen) oder aus der CJ-Beschreibung nachtragen, Titel nur mit Beleg ändern "
                "(Rückweg-Ledger `dropship/_kosmetik_produktwahrheit.tsv`).\n\n"
                f"## Reinstoff-Titel, deren Text eine Mischung belegt ({len(rein_widerspruch)}) — Titel anpassen\n\n")
        for hd, t in rein_widerspruch:
            f.write(f"- `{hd}` — {t}\n")
        f.write(f"\n## Reinstoff-Titel ohne Inhaltsstoff-Liste ({len(rein_offen)}) — Karton im Bild prüfen\n\n")
        for hd, t in rein_offen:
            f.write(f"- `{hd}` — {t}\n")
    if nur_k:
        print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {n} geprüft (nur Kosmetik) · {k_zeile}")
        return
    ko_zeile = koll_zeile()                               # 14.10.2026 (S3): zählt nur, eigener Bericht KOLL-VERSPRECHEN.md
    k_zeile = k_zeile + " · " + ko_zeile
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Versprechen ohne Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Kollektionen und Theme (zählt nur, Liste `dropship/KOLL-VERSPRECHEN.md`): {ko_zeile}\n\n"
                f"Regel: `automation/data/versprechen_regel.json` (Lieferversprechen nur bei Schweizer Lager; «Qualität geprüft», "
                f"«meistverkauft», «unser Bestseller» nie; dekorative «Diamanten» = Strasssteine bzw. Zirkonia). Geprüft: {n} aktive · {'zu ändern' if DRY else 'geändert'}: {fix} "
                f"({', '.join(f'{k} {v}' for k, v in sorted(zaehl.items()))}) · Fehler: {fehl}\n\n## Beispiele\n\n")
        for hd, nn in beispiele:
            f.write(f"- `{hd}` — {json.dumps(nn, ensure_ascii=False)[:300]}\n")
        f.write(f"\n## «Diamant» mit Echtheitsangabe (Karat/VVS/Labor, ohne Moissanit) — Einzelprüfung ({len(echt)})\n\n"
                "Der Wächter lässt diese Produkte unberührt: eine Karat- oder Reinheitsangabe ist entweder wahr (dann darf «Diamant» "
                "stehen) oder eine Echtheitsbehauptung ohne Beleg (dann Produkt prüfen, nicht Wörter tauschen).\n\n")
        for hd, t in echt:
            f.write(f"- `{hd}` — {t}\n")
        f.write(f"\n## Handles mit Lieferversprechen ({len(handles)}) — Umbenennen nur mit 301\n\n")
        for hd, t in handles:
            f.write(f"- `{hd}` — {t}\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {n} geprüft, {fix} {'zu ändern' if DRY else 'geändert'} "
          f"{zaehl}, {fehl} Fehler, {len(handles)} Handles gemeldet · {k_zeile}")


if __name__ == "__main__":
    main()
