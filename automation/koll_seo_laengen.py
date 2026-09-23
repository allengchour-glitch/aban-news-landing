#!/usr/bin/env python3
"""koll_seo_laengen.py — Kollektions-SEO auf Google-Mass (Befund 29, Audit 23.09.2026).

WARUM: Google kürzt Titel ab etwa 60 Zeichen und Snippets ab etwa 155–160. Gemessen 23.09.2026 über
alle 518 Kollektionen (351 im Onlineshop): 38 veröffentlichte SEO-Beschreibungen über 160 Zeichen,
19 SEO-Titel über 70 («LED & Ambiente-Beleuchtung – Stimmungslicht, RGB-Strips & Sternenhimmel-
Projektoren | LuxeStyle» = 95, live so im <title>), 51 veröffentlichte Kollektionen ganz ohne
SEO-Titel (darunter t-shirts-tops, viral-hits, jeans-denim, leggings). Abgeschnitten fehlt genau die
Schlussaussage «Gratis-Versand ab CHF 50»; ohne SEO-Titel zeigt Google «Leggings – LuxeStyle» ohne
Suchbegriff.

WAS ES TUT (nur Kollektionen, die im Onlineshop veröffentlicht sind; ALLE=1 nimmt alle):
  1. seo.description > 160 → ≤ 155. Nicht blind abschneiden: der Text wird in Sätze und Teilaussagen
     zerlegt, dann fallen die schwächsten Teile zuerst (CTA «Jetzt … entdecken», «Nach Preis sortiert»,
     «Schweizer Shop», WELCOME10, Rückgabe), die Versand-Aussage «Gratis-Versand ab CHF 50» bleibt so
     lange wie möglich. Reicht das nicht, wird die Aufzählung im ersten Satz an einer Komma-Grenze
     gekürzt (nie mitten in «Stand-, Tisch- & Akku-…», nie in einer Markenliste «von A, B & C»).
     Ist danach Platz und fehlt jede CHF-50-Aussage, kommt «Gratis-Versand ab CHF 50.» dazu
     (die Schwelle ist am lebenden Warenkorb geprüft; kein anderes Versprechen wird ergänzt).
  2. seo.title > 70 → ≤ 65: Kopf bleibt, die Aufzählung verliert Glieder von hinten, die Marke
     «| LuxeStyle …» bleibt nur, wenn Platz ist (Inhalt vor Marke).
  3. seo.title leer → «<Titel> kaufen | LuxeStyle Schweiz» (≤ 65, Emojis und Klammern weg).
     ⚠️ Nicht raten, wo das Muster Unsinn ergibt: «Hunde kaufen», «Kinder & Baby kaufen»,
     «Halloween kaufen», «Sale kaufen», «Für Ihn kaufen» — solche Titel stehen in UEBERSTEUERT
     (aus der eigenen Kollektionsbeschreibung abgeleitet) oder werden als MANUELL gemeldet.

Sicherungen: Onlineshop-Publikation per Name gesucht (genau eine, sonst Abbruch); Vollständigkeit
gegen collectionsCount(limit:null) EXACT (sonst kein Schreiben); jeder Wert LIVE gelesen, nach dem
Schreiben erneut gelesen und verglichen; Eimer-Etikette nach jeder Antwort; Laufsperre.
Ledger dropship/_koll_seo_laengen.txt (TSV: Zeit, Handle, Feld, alt, neu) — erkennt Zombies
(ein Wert, den wir schon gekürzt haben, ist wieder zu lang → Meldung «ZOMBIE»).

  python3 automation/koll_seo_laengen.py --selbsttest
  DRY=1 python3 automation/koll_seo_laengen.py          # zeigt Vorher/Nachher, schreibt nichts
  python3 automation/koll_seo_laengen.py                # schreibt + liest zurück
Letzte Zeile (für Ampel/Aufseher): «KOLL-SEO: …».
"""
import fcntl
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf  # noqa: E402
from seo_desc_kuerzen import kuerzen as kuerzen_notfall  # noqa: E402

SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2026-01/graphql.json"
REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_koll_seo_laengen.txt")
SPERRE = "/tmp/lock_koll_seo_laengen.lock"

DESC_GRENZE, DESC_ZIEL = 160, 155
TITEL_GRENZE, TITEL_ZIEL = 70, 65
USP = "Gratis-Versand ab CHF 50."
MARKEN = [" | LuxeStyle Schweiz", " | LuxeStyle CH", " | LuxeStyle"]

# Leere SEO-Titel, bei denen «<Titel> kaufen» falsch oder schief wäre. Jeder Text ist aus der
# SEO-Beschreibung der Kollektion abgeleitet (gelesen 23.09.2026), nichts dazuerfunden.
UEBERSTEUERT = {
    "haustier-hunde": "Hundezubehör kaufen – Geschirre, Näpfe & Pflege | LuxeStyle",
    "haustier-katzen": "Katzenzubehör kaufen – Kratzbäume & Katzentoiletten | LuxeStyle",
    "sub-baby-kids": "Baby- & Kinderartikel kaufen | LuxeStyle Schweiz",
    "sub-haustier": "Haustierbedarf online kaufen | LuxeStyle Schweiz",
    "halloween": "Halloween-Kostüme, Masken & Deko kaufen | LuxeStyle Schweiz",
    "schulstart": "Schulstart 2026 – Schulrucksäcke & Lunchtaschen | LuxeStyle",
    "querbeet": "Aus allen Welten – Mode, Wohnen & Technik | LuxeStyle Schweiz",
    "ft-maske": "Fasnacht- & Party-Masken kaufen | LuxeStyle Schweiz",
    "ft-kostuem-hut": "Kostümhüte & Kopfbedeckungen kaufen | LuxeStyle Schweiz",
    "mikrofone": "Mikrofone & Streaming-Zubehör kaufen | LuxeStyle Schweiz",
    "spass-elektronik": "RC-Autos, Drohnen & Spass-Elektronik kaufen | LuxeStyle",
    "geschirr-servieren": "Geschirr & Servierzubehör kaufen | LuxeStyle Schweiz",
    "licht-nachtlicht-projektor": "Nachtlichter & Sternenhimmel-Projektoren kaufen | LuxeStyle",
}

# Wörter, bei denen «<Titel> kaufen» Unsinn ergibt (Lebewesen, Anlässe, Tätigkeiten).
# Besteht der Titel NUR aus solchen Wörtern, wird nicht geraten → MANUELL.
NICHT_KAUFBAR = {w.lower() for w in """
    Hund Hunde Katze Katzen Kind Kinder Baby Babys Kids Vögel Vogel Fische Fisch Pferde Pferd
    Kaninchen Hamster Nager Reptilien Tiere Haustiere Damen Herren Frauen Männer Mädchen Jungen Jungs
    Paare Mama Papa Senioren Teens Ihn Sie
    Halloween Weihnachten Ostern Valentinstag Muttertag Vatertag Schulstart Fasnacht Fasching Silvester
    Advent Geburtstag Hochzeit Taufe Black Friday Cyber Monday Sale Angebote Deals Aktion Aktionen
    Bestseller Geschenke Geschenkideen Sommer Winter Herbst Frühling Saison
    Kochen Backen Grillen Reisen Schlafen Wohnen Trinken Essen Basteln Nähen Stricken Malen Schwimmen
    Wandern Campen Camping Laufen Spielen Lernen Arbeiten Gaming Streaming Servieren Styling Wellness
    Selfcare Sport Fitness Garten Party
""".split()}
PRAEPOSITION = re.compile(r"^(für|fürs|aus|ab|unter|bis|mit|von|zum|zur|im|in|am|an|auf|bei|nach)\b", re.I)

EMOJI = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF"
                   "\U00002B00-\U00002BFF\uFE0F\u200D\u20E3]")
MONATE = r"(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)"
# Abkürzungen und Einzelbuchstaben («z. B.») vor dem Punkt — aber «Rain-X.» IST ein Satzende.
ABK = re.compile(r"(?:^|\s)(?:Mio|Mrd|Stk|ca|bzw|inkl|exkl|evtl|usw|etc|Nr|Tel|Std|Min|max|min|vgl|St|"
                 r"[A-Za-zÄÖÜäöü])$")

# Teilaussagen der Beschreibung und ihr Gewicht (höher = bleibt länger stehen).
AUSSAGEN = [
    (re.compile(r"WELCOME10"), 40),
    (re.compile(r"gratis[- ]?versand|versand\b[^.]*\bgratis|gratis ab CHF|versandkostenfrei", re.I), 90),
    (re.compile(r"\b\d+\s*Tage\s+Rückgabe|Rückgaberecht", re.I), 50),
    (re.compile(r"klarna|twint|auf Rechnung", re.I), 45),
    (re.compile(r"in 1[–-]2 Werktagen", re.I), 55),
    (re.compile(r"Lieferung in die (ganze )?Schweiz|Schweizer (Online-?)?Shop|Schweizer Onlineshop|"
                r"Versand in die Schweiz", re.I), 35),
    # unbelegte Sammelversprechen (für CJ-Ware aus China ist «EU-Versand»/«Blitzversand» falsch) → Rauschen
    (re.compile(r"geprüfte (Ware|Qualität)|Marken-Qualität|EU-Versand|Blitzversand", re.I), 24),
    (re.compile(r"(^|\s)jetzt\b.*\b(entdecken|bestellen|kaufen|shoppen)\b", re.I), 25),
    (re.compile(r"nach Preis sortiert", re.I), 20),
]
BESCHREIBEND = 60
STARK = re.compile(r"(\s+[–—·|]\s+)")


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def ohne_emoji(s):
    return norm(EMOJI.sub("", s or ""))


def gewicht(text):
    for rx, w in AUSSAGEN:
        if rx.search(text):
            return w
    return None


# ---------------------------------------------------------------- Beschreibung
def _saetze(s):
    """Zerlegt in (Text ohne Schlusszeichen, Schlusszeichen). «16 Mio. Farben», «z. B.», «1. August»
    sind keine Satzenden."""
    out, start = [], 0
    for m in re.finditer(r"[.!?](?=\s+[A-ZÄÖÜ0-9–−+-]|\s*$)", s):
        vor = s[start:m.start()]
        if m.group(0) == "." and ABK.search(vor.rstrip()):
            continue
        if m.group(0) == "." and re.search(r"(?:^|\s)\d{1,2}$", vor) and re.match(r"\s+" + MONATE, s[m.end():]):
            continue
        out.append((vor.strip(), m.group(0)))
        start = m.end()
    rest = s[start:].strip()
    if rest:
        out.append((rest, ""))
    return out


def _zerlegen(s):
    """Liste von Sätzen; Satz = {'ende', 'teile': [{'sep', 'einheiten': [{'text','w','pos','kern'}]}]}."""
    saetze, pos = [], 0
    for si, (satz, ende) in enumerate(_saetze(s)):
        stuecke = STARK.split(satz)
        teile, sep = [], None
        for st in stuecke:
            if STARK.fullmatch(st):
                sep = st
                continue
            st = st.strip()
            if not st:
                continue
            kommas = st.split(", ")
            i = next((k for k, p in enumerate(kommas) if gewicht(p) is not None), None)
            if i is None:
                roh = [st]
            else:
                roh = ([", ".join(kommas[:i])] if i > 0 else []) + kommas[i:]
            einheiten = []
            for r in roh:
                w = gewicht(r)
                einheiten.append({"text": r, "w": BESCHREIBEND if w is None else w, "pos": pos, "kern": False})
                pos += 1
            teile.append({"sep": sep, "einheiten": einheiten})
            sep = None
        if teile:
            saetze.append({"ende": ende, "teile": teile})
    if saetze:
        saetze[0]["teile"][0]["einheiten"][0]["kern"] = True
    return saetze


def _bauen(saetze, weg):
    out = []
    for s in saetze:
        stuecke = []
        for t in s["teile"]:
            txt = ", ".join(e["text"] for e in t["einheiten"] if e["pos"] not in weg)
            if txt:
                stuecke.append((t["sep"], txt))
        if not stuecke:
            continue
        satz = stuecke[0][1] + "".join((sep or ", ") + txt for sep, txt in stuecke[1:])
        satz = satz[:1].upper() + satz[1:]
        satz = satz.rstrip(" ,;:–—·|")
        out.append(satz + (s["ende"] or "."))
    return " ".join(out)


RAUSCHEN = 25  # «Jetzt … entdecken», «Nach Preis sortiert»: fällt beim Kürzen immer


def _auswahl(saetze, usp_schuetzen):
    """Beste Teilmenge der Teilaussagen, die ≤ ZIEL passt: grösste Gewichtssumme, dann längster Text.
    Kern bleibt immer; die Versand-Aussage bleibt, wenn usp_schuetzen. Rauschen fällt immer.
    Gibt (text, usp_da) zurück oder (None, False), wenn nichts passt."""
    alle = [e for s in saetze for t in s["teile"] for e in t["einheiten"]]
    fest = {e["pos"] for e in alle if e["kern"] or (usp_schuetzen and e["w"] == 90)}
    rauschen = {e["pos"] for e in alle if e["w"] <= RAUSCHEN and e["pos"] not in fest}
    frei = [e for e in alle if e["pos"] not in fest and e["pos"] not in rauschen]
    if len(frei) > 14:  # Sicherung gegen Kombinatorik — kommt bei Kollektionstexten nicht vor
        frei, rauschen = frei[:14], rauschen | {e["pos"] for e in frei[14:]}
    bestes = None
    for maske in range(1 << len(frei)):
        weg = set(rauschen)
        summe = 0
        for i, e in enumerate(frei):
            if maske >> i & 1:
                summe += e["w"]
            else:
                weg.add(e["pos"])
        text = _bauen(saetze, weg)
        if len(text) > DESC_ZIEL:
            continue
        schluessel = (summe, len(text))
        if bestes is None or schluessel > bestes[0]:
            usp_da = any(e["w"] == 90 and e["pos"] not in weg for e in alle)
            bestes = (schluessel, text, usp_da)
    return (bestes[1], bestes[2]) if bestes else (None, False)


def _komma_schnitte(kern):
    """Kürzere Fassungen des ersten Satzteils, an Komma-Grenzen, längste zuerst (≥ 70 Zeichen).
    Nie nach einem Ergänzungsstrich («Stand-, Tisch-»), nie in einer Marken- oder Materialliste
    («von Sonax, Turtle Wax», «Marken wie Casio, …», «Näpfe aus Edelstahl, Keramik»)."""
    out = []
    stellen = [m.start() for m in re.finditer(r", ", kern)]
    for p in reversed(stellen):
        if p < 70 or kern[p - 1] == "-":
            continue
        bereich_ab = kern.rfind(": ", 0, p) + 2 if kern.rfind(": ", 0, p) >= 0 else 0
        if re.search(r"\s(von|wie|aus)\s", kern[bereich_ab:p]):
            continue
        v = kern[:p]
        # Letztes Komma der Aufzählung zu «&», wenn die Aufzählung noch keine Konjunktion hat
        bereich = v[bereich_ab:]
        oben_konj = re.search(r"(?<!-) (&|und|sowie|oder) ", bereich)
        letzte = [m.start() for m in re.finditer(r"(?<!-), ", bereich)]
        if letzte and not oben_konj:
            k = bereich_ab + letzte[-1]
            v = v[:k] + " &" + v[k + 1:]
        out.append(v)
    return out


def kuerzen_beschreibung(s):
    s = norm(s)
    if len(s) <= DESC_GRENZE:
        return s
    saetze = _zerlegen(s)
    if not saetze:
        return kuerzen_notfall(s)
    hatte_usp = any(e["w"] == 90 for x in saetze for t in x["teile"] for e in t["einheiten"])
    kern = saetze[0]["teile"][0]["einheiten"][0]
    original = kern["text"]
    varianten = [original] + _komma_schnitte(original)
    bestes = None
    try:
        # 1. Versand-Aussage halten: längster Kern, mit dem sie noch Platz hat
        if hatte_usp:
            for v in varianten:
                kern["text"] = v
                text, _ = _auswahl(saetze, True)
                if text:
                    bestes = text
                    break
        # 2. sonst: längster Kern, der überhaupt passt (Versand-Aussage darf fallen)
        if bestes is None:
            for v in varianten:
                kern["text"] = v
                text, _ = _auswahl(saetze, False)
                if text:
                    bestes = text
                    break
    finally:
        kern["text"] = original
    if bestes is None:
        return kuerzen_notfall(s)
    if not re.search(r"CHF\s*50", bestes) and len(bestes) + 1 + len(USP) <= DESC_ZIEL:
        bestes = f"{bestes} {USP}"
    return bestes


# ---------------------------------------------------------------- Titel
MARKE_RX = re.compile(r"\s*[|–—]\s*LuxeStyle(?:\.ch)?(?:\s+(?:CH|Schweiz))?\s*$")


def _glieder(liste):
    teile = re.split(r"(,\s+|\s+&\s+|\s+und\s+)", liste)
    items, i = [], 0
    while i < len(teile):
        cur = teile[i]
        while cur.endswith("-") and i + 2 < len(teile):  # «Stand-, Turm- & Akku-Ventilator» bleibt EIN Glied
            cur = cur + teile[i + 1] + teile[i + 2]
            i += 2
        items.append(cur.strip())
        i += 2
    return [x for x in items if x]


def _liste(items):
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " & " + items[-1]


def kuerzen_titel(t, ziel=TITEL_ZIEL):
    t = ohne_emoji(t)
    if len(t) <= TITEL_GRENZE:
        return t
    m = MARKE_RX.search(t)
    marke = " | " + m.group(0).strip(" |–—") if m else None
    kern = t[:m.start()] if m else t
    marken = [x for x in ([marke] if marke else []) + MARKEN if x] + [""]
    marken = list(dict.fromkeys(marken))
    sm = re.search(r"\s[–—|]\s|:\s", kern)
    if sm:
        kopf, sep, liste = kern[:sm.start()].strip(), sm.group(0), kern[sm.end():].strip()
        sep = ": " if sep.strip() == ":" else f" {sep.strip()} "
        items = _glieder(liste)
    else:
        kopf, sep, items = kern.strip(), "", []
    for k in range(len(items), 0, -1):
        liste_k = liste if k == len(items) else _liste(items[:k])  # volle Liste im Originalwortlaut
        for mk in marken:
            c = f"{kopf}{sep}{liste_k}{mk}"
            if len(c) <= ziel:
                return c
    for mk in marken:
        c = kopf + mk
        if len(c) <= ziel:
            return c
    c = kopf[:ziel + 1]
    c = c[:c.rfind(" ")] if " " in c else kopf[:ziel]
    return re.sub(r"(\s+(&|und|für|mit|–|—|\|))+$", "", c).rstrip(" ,;:–—|-")


def titel_fuellen(handle, titel):
    """Gibt (seo_titel, None) zurück oder (None, Grund) für MANUELL."""
    if handle in UEBERSTEUERT:
        return UEBERSTEUERT[handle], None
    t = ohne_emoji(titel)
    t = norm(re.sub(r"\s*\([^)]*\)", "", t))
    if not t:
        return None, "leerer Titel"
    if PRAEPOSITION.match(t):
        return None, "beginnt mit Präposition"
    woerter = [w for w in re.split(r"[\s&,/+-]+", t) if w and not re.fullmatch(r"\d+", w)
               and w.lower() not in {"und", "the", "für"}]
    if woerter and all(w.lower() in NICHT_KAUFBAR for w in woerter):
        return None, "«… kaufen» ergäbe Unsinn (Lebewesen/Anlass/Tätigkeit)"
    kern = t if re.search(r"\bkaufen$", t) else f"{t} kaufen"
    marken = [" | LuxeStyle"] if re.search(r"\bSchweiz", t) else MARKEN
    for mk in marken + [""]:
        if len(kern + mk) <= TITEL_ZIEL:
            return kern + mk, None
    return kuerzen_titel(kern + " | LuxeStyle", TITEL_ZIEL), None


# ---------------------------------------------------------------- Shopify
def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    letzte = None
    for i in range(8):
        r = urllib.request.Request(API, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
            letzte = str(e)[:120]
            time.sleep(3 + 3 * i)
            continue
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in d.get("errors") or []):
            letzte = "THROTTLED"
            time.sleep(5 + 3 * i)
            continue
        nachlauf(d)
        if d.get("errors") and not d.get("data"):
            raise RuntimeError(f"GraphQL-Fehler: {str(d['errors'])[:200]}")
        return d
    raise RuntimeError(f"Shopify antwortet nicht ({letzte}) — Abbruch, damit nichts falsch quittiert wird")


def onlineshop_id():
    d = gql("{publications(first:50){nodes{id name}}}")
    treffer = [p["id"] for p in d["data"]["publications"]["nodes"] if p["name"] == "Online Store"]
    if len(treffer) != 1:
        raise RuntimeError(f"Onlineshop-Publikation nicht eindeutig: {treffer}")
    return treffer[0]


def alle_kollektionen(pub):
    alle, cur = [], None
    while True:
        d = gql("query($c:String,$p:ID!){collections(first:100,after:$c){pageInfo{hasNextPage endCursor} "
                "nodes{id handle title seo{title description} os:publishedOnPublication(publicationId:$p)}}}",
                {"c": cur, "p": pub})
        c = d["data"]["collections"]
        alle += c["nodes"]
        if not c["pageInfo"]["hasNextPage"]:
            break
        cur = c["pageInfo"]["endCursor"]
    z = gql("{collectionsCount(limit:null){count precision}}")["data"]["collectionsCount"]
    if z["precision"] != "EXACT" or z["count"] != len(alle):
        raise RuntimeError(f"Unvollständig gelesen: {len(alle)} statt {z}")
    return alle


def ledger_lesen():
    stand = {}
    try:
        for zeile in open(LEDGER, encoding="utf-8"):
            f = zeile.rstrip("\n").split("\t")
            if len(f) >= 5:
                stand[(f[1], f[2])] = f[4]
    except FileNotFoundError:
        pass
    return stand


def ledger_schreiben(handle, feld, alt, neu):
    zeit = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([zeit, handle, feld, norm(alt).replace("\t", " "), norm(neu).replace("\t", " ")]) + "\n")
        f.flush()
        os.fsync(f.fileno())


def plan(alle, nur_os=True):
    aufgaben, manuell = [], []
    for c in alle:
        if nur_os and not c["os"]:
            continue
        seo = c["seo"] or {}
        t_alt, d_alt = seo.get("title") or "", seo.get("description") or ""
        t_neu, d_neu, felder = t_alt, d_alt, []
        if len(d_alt) > DESC_GRENZE:
            d_neu = kuerzen_beschreibung(d_alt)
            if d_neu != d_alt:
                felder.append("beschreibung")
        if len(t_alt) > TITEL_GRENZE:
            t_neu = kuerzen_titel(t_alt)
            if t_neu != t_alt:
                felder.append("titel")
        elif not t_alt.strip() and c["os"]:
            t_neu, grund = titel_fuellen(c["handle"], c["title"])
            if t_neu:
                felder.append("titel-neu")
            else:
                t_neu = t_alt
                manuell.append((c["handle"], c["title"], grund))
        if felder:
            aufgaben.append({"c": c, "t_alt": t_alt, "t_neu": t_neu, "d_alt": d_alt, "d_neu": d_neu, "felder": felder})
    return aufgaben, manuell


def main():
    dry = os.environ.get("DRY") == "1"
    nur_os = os.environ.get("ALLE") != "1"
    sperre = open(SPERRE, "w")
    try:
        fcntl.flock(sperre, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("KOLL-SEO: läuft schon (Sperre belegt) — nichts getan")
        return 0
    pub = onlineshop_id()
    alle = alle_kollektionen(pub)
    n_os = sum(1 for c in alle if c["os"])
    print(f"Kollektionen: {len(alle)} (EXACT) · im Onlineshop: {n_os}")
    aufgaben, manuell = plan(alle, nur_os)
    ledger = ledger_lesen()
    zombies = []
    for a in aufgaben:
        h = a["c"]["handle"]
        for feld, alt in (("beschreibung", a["d_alt"]), ("titel", a["t_alt"])):
            if feld in a["felder"] and (h, feld) in ledger and ledger[(h, feld)] != alt:
                zombies.append((h, feld))
    n_d = sum("beschreibung" in a["felder"] for a in aufgaben)
    n_t = sum("titel" in a["felder"] for a in aufgaben)
    n_n = sum("titel-neu" in a["felder"] for a in aufgaben)
    print(f"Plan: {n_d} Beschreibungen kürzen · {n_t} Titel kürzen · {n_n} Titel füllen · "
          f"{len(manuell)} manuell · {len(zombies)} Zombie")
    # Doppelte SEO-Titel nach dem Plan (gegen alle bestehenden)
    kuenftig = {c["id"]: ((c["seo"] or {}).get("title") or "") for c in alle}
    for a in aufgaben:
        kuenftig[a["c"]["id"]] = a["t_neu"]
    zaehl = {}
    for cid, t in kuenftig.items():
        if t:
            zaehl.setdefault(t.lower(), []).append(cid)
    neu_ids = {a["c"]["id"] for a in aufgaben if a["t_neu"] != a["t_alt"]}
    doppelt = [t for t, ids in zaehl.items() if len(ids) > 1 and neu_ids & set(ids)]
    for t in doppelt:
        print(f"  ⚠️ doppelter SEO-Titel nach Plan: «{t}»")
    for a in aufgaben:
        h = a["c"]["handle"]
        print(f"\n  {h}  [{', '.join(a['felder'])}]")
        if a["t_neu"] != a["t_alt"]:
            print(f"    TITEL  {len(a['t_alt']):>3}: «{a['t_alt']}»\n        → {len(a['t_neu']):>3}: «{a['t_neu']}»")
        if a["d_neu"] != a["d_alt"]:
            print(f"    BESCHR {len(a['d_alt']):>3}: «{a['d_alt']}»\n        → {len(a['d_neu']):>3}: «{a['d_neu']}»")
    for h, t, g in manuell:
        print(f"  MANUELL {h} «{t}»: {g}")
    for h, f in zombies:
        print(f"  ZOMBIE {h} {f}: schon einmal gekürzt, jetzt wieder zu lang — wer schreibt zurück?")
    if dry:
        print(f"\nKOLL-SEO (DRY): {len(aufgaben)} Kollektionen geplant · {len(manuell)} manuell · "
              f"{len(zombies)} Zombie · 0 geschrieben")
        return 0
    ok = fehl = 0
    for a in aufgaben:
        c = a["c"]
        seo = {}
        if a["t_neu"]:
            seo["title"] = a["t_neu"]
        if a["d_neu"]:
            seo["description"] = a["d_neu"]
        try:
            r = gql("mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}",
                    {"i": {"id": c["id"], "seo": seo}})
            errs = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
            if errs is None or errs:
                fehl += 1
                print(f"  ✗ {c['handle']}: {errs}")
                continue
            z = gql("query($id:ID!){collection(id:$id){seo{title description}}}", {"id": c["id"]})
            live = (z["data"]["collection"] or {}).get("seo") or {}
        except RuntimeError as e:
            fehl += 1
            print(f"  ✗ {c['handle']}: {e}")
            continue
        if norm(live.get("title")) != norm(a["t_neu"]) or norm(live.get("description")) != norm(a["d_neu"]):
            fehl += 1
            print(f"  ✗ {c['handle']}: Rücklesen weicht ab: {live}")
            continue
        ok += 1
        if a["t_neu"] != a["t_alt"]:
            ledger_schreiben(c["handle"], "titel", a["t_alt"], a["t_neu"])
        if a["d_neu"] != a["d_alt"]:
            ledger_schreiben(c["handle"], "beschreibung", a["d_alt"], a["d_neu"])
    print(f"\nKOLL-SEO: {ok} geschrieben+rückgelesen · {fehl} Fehler · {len(manuell)} manuell · "
          f"{len(zombies)} Zombie (von {n_os} im Onlineshop)")
    return 1 if fehl else 0


# ---------------------------------------------------------------- Selbsttest
def selbsttest():
    t = []
    a = ("LED- & Ambiente-Beleuchtung für dein Zuhause: Sternenhimmel-Projektoren, Sunset-Stimmungslichter, "
         "RGB-LED-Strips & Lichtleisten. App-gesteuert, 16 Mio. Farben. Jetzt bei LuxeStyle CH entdecken.")
    k = kuerzen_beschreibung(a)
    t.append(("«16 Mio.» ist kein Satzende", "16 Mio." not in k or "16 Mio. Farben" in k))
    t.append(("≤155", len(k) <= 155))
    b = ("Halsketten online kaufen in der Schweiz: feine Ketten, Anhänger & Statement-Ketten aus Edelstahl, teils "
         "wasserfest & anlauffrei. Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · -10% mit WELCOME10.")
    k = kuerzen_beschreibung(b)
    t.append(("Versand-Aussage bleibt stehen", "Gratis-Versand ab CHF 50" in k and len(k) <= 155))
    c = ("Auto-Pflege & Reinigung bei LuxeStyle: Autoshampoo, Reifen- & Felgenreiniger, Armaturenbrett-Pflege, "
         "Autowachs, Politur & Auto-Staubsauger von Sonax, Turtle Wax & Rain-X. Gratis-Versand ab CHF 50.")
    k = kuerzen_beschreibung(c)
    t.append(("Kern an Komma gekürzt, nie in Markenliste, USP bleibt",
              k.endswith("Gratis-Versand ab CHF 50.") and "von Sonax" not in k and len(k) <= 155))
    d = ("Ringe für Damen bei LuxeStyle Schweiz: funkelnde Zirkonia-Ringe als günstige Diamant-Alternative, "
         "verstellbare Blumenringe, Statement-, Herz- & Stapelringe aus Edelstahl, hautfreundlich. Gratis-Versand ab CHF 50.")
    k = kuerzen_beschreibung(d)
    t.append(("kein Schnitt nach Ergänzungsstrich", "Statement-." not in k and "Statement- &" not in k and len(k) <= 155))
    e = ("Clevere Küchenhelfer: elektrische Zerkleinerer, Gemüseschneider, Milchaufschäumer & praktische Gadgets. "
         "Geprüfte Ware, EU-Versand, 30 Tage Rückgabe. −10% mit WELCOME10.")
    k = kuerzen_beschreibung(e)
    t.append(("Floskeln («Geprüfte Ware», «EU-Versand») fallen zuerst, Rückgabe bleibt",
              "Geprüfte Ware" not in k and "EU-Versand" not in k and "Rückgabe" in k and len(k) <= 155))
    g = ("Wasserfester Edelstahl-Schmuck: läuft nicht an beim Duschen, Schwimmen & am See. Ketten, Ohrringe, "
         "Armbänder. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. –10% mit Code WELCOME10.")
    k = kuerzen_beschreibung(g)
    t.append(("WELCOME10 fällt vor Rückgabe", "WELCOME10" not in k and "Rückgabe" in k and len(k) <= 155))
    h = ("Futter & Näpfe bei LuxeStyle: Futterautomaten, Futterspender, Trinkbrunnen sowie Näpfe aus Edelstahl, "
         "Keramik & Silikon für Hund und Katze. Nach Preis sortiert. Gratis-Versand ab CHF 50.")
    k = kuerzen_beschreibung(h)
    t.append(("Materialliste «aus Edelstahl, Keramik» wird nicht zerschnitten, Rauschen fällt",
              "Keramik & Silikon" in k and "Nach Preis" not in k and len(k) <= 155))
    i2 = ("Gesichtssaunen, Poren-Tools, Gesichtsroller & Gua Sha online kaufen bei LuxeStyle. Gesichtspflege-Geräte "
          "für einen frischen Teint. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.")
    k = kuerzen_beschreibung(i2)
    t.append(("Auswahl nutzt den Platz (Rückgabe passt noch dazu)", "Rückgabe" in k and len(k) <= 155))
    t.append(("≤160 bleibt unverändert", kuerzen_beschreibung("Kurz. Gratis-Versand ab CHF 50.") == "Kurz. Gratis-Versand ab CHF 50."))
    t.append(("idempotent", kuerzen_beschreibung(kuerzen_beschreibung(b)) == kuerzen_beschreibung(b)))
    f = "Ab dem 1. August gibt es Fahnen, Lampions und Deko in grosser Auswahl für den Nationalfeiertag bei uns im Shop. " * 2
    t.append(("«1. August» ist kein Satzende", "1. August gibt" in kuerzen_beschreibung(f)))
    # Titel
    tt = "LED & Ambiente-Beleuchtung – Stimmungslicht, RGB-Strips & Sternenhimmel-Projektoren | LuxeStyle"
    k = kuerzen_titel(tt)
    t.append(("Titel ≤65, Kopf bleibt", len(k) <= 65 and k.startswith("LED & Ambiente-Beleuchtung")))
    tt = "Ventilatoren & Klimageräte kaufen – Stand-, Turm- & Akku-Ventilator | LuxeStyle CH"
    k = kuerzen_titel(tt)
    t.append(("Ergänzungsstrich-Glied bleibt ganz", "Stand-" not in k or "Stand-, Turm- & Akku-Ventilator" in k))
    tt = "Make-up online kaufen – Lippenstift, Mascara, Foundation & Sets | LuxeStyle CH"
    k = kuerzen_titel(tt)
    t.append(("Inhalt vor Marke", k == "Make-up online kaufen – Lippenstift, Mascara, Foundation & Sets"))
    t.append(("volle Liste bleibt im Wortlaut", kuerzen_titel(
        "Portemonnaie & Geldbörse kaufen – Damen & Herren, RFID-Schutz | LuxeStyle CH")
        == "Portemonnaie & Geldbörse kaufen – Damen & Herren, RFID-Schutz"))
    t.append(("Titel ≤70 unverändert", kuerzen_titel("Schuhe online kaufen | LuxeStyle CH") == "Schuhe online kaufen | LuxeStyle CH"))
    # Füllen
    t.append(("Emoji + Schweiz-Doppelung", titel_fuellen("x", "Kostüme ab Schweizer Lager 🇨🇭")[0] == "Kostüme ab Schweizer Lager kaufen | LuxeStyle"))
    t.append(("Klammer weg", titel_fuellen("x", "Sonnenbrillen (alle)")[0] == "Sonnenbrillen kaufen | LuxeStyle Schweiz"))
    t.append(("Kanarienvogel «Hunde» wird nicht geraten", titel_fuellen("neu-x", "Hunde")[0] is None))
    t.append(("Kanarienvogel «Kinder & Baby» wird nicht geraten", titel_fuellen("neu-x", "Kinder & Baby")[0] is None))
    t.append(("Kanarienvogel «Für Ihn» wird nicht geraten", titel_fuellen("neu-x", "Für Ihn")[0] is None))
    t.append(("Kanarienvogel «Sale» wird nicht geraten", titel_fuellen("neu-x", "Sale")[0] is None))
    t.append(("«Kinderschuhe» ist kein Kind", titel_fuellen("x", "Kinderschuhe")[0] == "Kinderschuhe kaufen | LuxeStyle Schweiz"))
    t.append(("«Damen-Mode» ist erlaubt", titel_fuellen("x", "Damen-Mode")[0] == "Damen-Mode kaufen | LuxeStyle Schweiz"))
    t.append(("«Rain-X.» ist ein Satzende", len(_saetze("Politur von Rain-X. Gratis-Versand ab CHF 50.")) == 2))
    t.append(("«z. B.» ist keines", len(_saetze("Deko, z. B. Kerzen. Gratis-Versand ab CHF 50.")) == 2))
    t.append(("«Handschuhe» bleibt Handschuhe", titel_fuellen("x", "Handschuhe")[0] == "Handschuhe kaufen | LuxeStyle Schweiz"))
    t.append(("alle Übersteuerungen ≤65 ohne Emoji",
              all(len(v) <= 65 and not EMOJI.search(v) for v in UEBERSTEUERT.values())))
    ok = True
    for n, cnd in t:
        print(("✓ " if cnd else "✗ ") + n)
        ok &= bool(cnd)
    print("SELBSTTEST", "BESTANDEN" if ok else "FEHLGESCHLAGEN")
    return 0 if ok else 1


if __name__ == "__main__":
    if sys.argv[1:] and sys.argv[1] == "--selbsttest":
        sys.exit(selbsttest())
    sys.exit(main())
