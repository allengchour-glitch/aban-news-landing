#!/usr/bin/env python3
"""bild_reel_auswahl.py — Bild-Reels als zweite, dauerhafte Reel-Quelle, zuerst als A/B-Test (R2, 13.10.2026).

WARUM (Gutachten Reel-Nachschub 13.10., Eintrag R2): Der CJ-Video-Weg liefert auf Dauer etwa 1,5–2 postbare Reels pro Tag
(VERMUTUNG), Ziel sind ~9. Bild-Reels kosten 0 CJ-Punkte. GEMESSEN: Pool 50'096 aktive Produkte ab CHF 14.90 mit ≥ 4 Medien;
Jury 7 von 9 bestanden (handverlesen, 06.10.); Wirkung je 1 Video: TikTok 260 (Median 271), YouTube 170 (169,5), IG 2 (28).
Das Format hat der Betreiber am 05.10. bestellt («orginal video oder bilder bearbeiten mit stimme», Kopf von reel/bild_reel.py).

WAS: wählt Produkte (liest nur) und ruft reel/bild_reel.py auf. Es wird NICHTS gepostet, keine Kadenz geändert. Kette je Produkt:
  Auswahl → bild_reel.py (Diashow mit Schnitten in Sekunde 1, Stimme nach STIMME_ANTEIL, make_reel.sh, meisterwerk_tor)
  → Kontaktbogen (reel/schnitt.py --kontaktbogen) → Gemini-Jury (gemini_jury.py, dieselbe Caption wie später in der Queue)
  → nur bei Jury-Exit 0: bild_reel.py --freigeben (Shopify-CDN + Zeile «ready» in automation/reels_seed.csv)
  → Zeile in social/_musik_verlauf.txt mit Spalte 8 «quelle:bild» (Lernschleife social_lernen.mjs, Musik-Rotation).

AUSWAHL (jede Bedingung muss gelten):
  - Reihenfolge: zuerst dropship/_social_vorrang.txt (Saison, Datum ≥ heute, Reihenfolge der Datei), danach die Kollektionen
    hype-jetzt, bestseller, neu-eingetroffen
  - ACTIVE, im Onlineshop, mindestens eine Variante kaufbar, ab CHF 14.90
  - keine SPERR-Tags, keine HEIL-Wörter, keine Lizenzfigur im Titel (Listen wie metricool_pinterest_pin.mjs),
    kein Model-Material (post_guard.mjs MODEL_MEDIEN — sie wird nur mit Markierung gezeigt)
  - ≥ 3 Bilder ≥ 600 px OHNE montierten Text (fremdtext.woerter_url, hier schon ab 2 Wörtern statt 4) und OHNE weissen
    Freisteller (bild_reel.freisteller).
    bild_reel.py selbst verlangt 2 — mit 2 Bildern steht eines > 3,8 s still und das Tor meldet STILL.
  - Hook mit Produktwort ≤ 24 Zeichen (produkt_hook = Port von produktHook() aus cj_video_reel_engine.mjs, R9) — sonst kein Reel
  - nie zweimal (Regel 10): post_guard.produktGepostet (Name, Shopify-ID, Handle), kein Produktbild in dropship/_posted_media.txt,
    nicht in _pinterest_pins.txt, _ig_karussell.txt, _tiktok_karussell.txt, social/ig_karussell.csv, social/posts_image.csv,
    nicht in automation/reels_seed.csv (weder bildreel-<handle> noch ein anderes Reel, dessen Caption das Produkt verlinkt)
  - nicht schon in dropship/_bild_reel_auswahl.tsv: ready/tor/jury/ungeeignet = nie wieder; kein-urteil/fehler/set-einzelteil = am Folgetag neu

A/B-TEST (Gutachten R2, Schritte 4–6):
  - Tagesdeckel: höchstens MAX_TAG (3) neue ready-Bild-Reels und RENDER_TAG (6) Renders je UTC-Tag (gezählt im Ledger).
  - Dauer 7–10 Tage ab 14.10.2026: je Plattform (TikTok, YouTube, IG) 10 Bild- gegen 10 Video-Reels. Das Merkmal quelle:bild|video
    schreibt social_lernen.mjs als «quelle» und «quelle_je_kanal» (Median-Score je Kanal, nur Posts ab 48 h) in social/_lernen.json.
  - ABBRUCH 1: Jury-Quote der Bild-Reels < 40 % (ab 10 Urteilen in diesem Ledger) → das Skript baut nichts mehr (Exit 5).
  - ABBRUCH 2: Median der Bild-Reels < 0,7 × Video-Median auf einer Plattform (je ≥ 10 Posts) → dort keine Bild-Reels mehr.
    Die Poster haben dafür noch keinen Plattform-Filter (offen) → bis dahin stoppt dieses Skript GANZ (Exit 5).
  - Hält beides nach dem Test: Tagesmenge = max(0, 10 − Video-Zugang der letzten 3 Tage), höchstens 8 Renders/Tag, Gemini-
    Aufrufe im Budget — umgesetzt durch Hochsetzen von MAX_TAG/RENDER_TAG, nicht vorher.
  - Messung danach: Jury-Quote (Ausgang 7/9 handverlesen), Median-Aufrufe je Plattform und Quelle nach 48 h, 0 Bild-Reels mit
    nicht-ACTIVE-Produkt gepostet, 0 Produkte doppelt in dropship/_posted_produkte.txt.

Läuft nur im Container (Hostname nicht ubuntu-4gb-*): der Server fährt denselben Runner, zwei Rechner würden dasselbe Produkt
bauen (Abstimmung = R8). BILD_REEL_SERVER=1 hebt das auf. Liegt dropship/_SOCIAL_STOPP, baut es nichts (wie engine_keepalive).
Kosten: 0 CJ-Aufrufe; Gemini-Jury ~0,1 Rappen je Reel (gemini-2.5-flash, Regel 11: kein Veo); Azure-Stimme Gratis-Stufe.

Aufrufe:
  python3 automation/bild_reel_auswahl.py --dry [--n 10] [--json-out f]   # Kandidaten mit Begründung, nichts gebaut
  python3 automation/bild_reel_auswahl.py --scharf [--max 1] [--bogen-dir D] # bauen (Deckel gilt), Kontaktbögen nach D
  python3 automation/bild_reel_auswahl.py --stand                           # Tageszähler, Jury-Quote, Abbruch-Prüfung
  python3 automation/bild_reel_auswahl.py --selbsttest                      # Kanarien ohne Netz
Exit: 0 ok (auch «Deckel erreicht» / «nichts zu tun»), 1 Fehler, 5 Abbruchregel greift.
ENV: MAX_TAG=3 · RENDER_TAG=6 · STIMME_ANTEIL (Runner: 0.5 mit Azure-Schlüssel, sonst 0; ohne ENV gilt dieselbe Regel)
"""
import argparse, csv, fcntl, json, os, re, socket, subprocess, sys, time
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(HIER, "reel"))

LEDGER = os.path.join(REPO, "dropship", "_bild_reel_auswahl.tsv")
VERLAUF = os.path.join(REPO, "social", "_musik_verlauf.txt")
LERNEN = os.path.join(REPO, "social", "_lernen.json")
BILD_REEL = os.path.join(HIER, "reel", "bild_reel.py")
MAX_TAG = int(os.environ.get("MAX_TAG", "3"))
RENDER_TAG = int(os.environ.get("RENDER_TAG", "6"))
MIN_PREIS = 14.90
MIN_BILDER = 3
# 13.10.2026: strenger als fremdtext.GRENZE (4) — die Hängematte (Jury 4.33) trug «Green and Yellow» (3 Wörter) und eine
# Mass-Grafik «Wide … Long» (2 Wörter). Gilt in der Auswahl UND im Render (bild_reel.py --text-grenze).
TEXT_GRENZE = int(os.environ.get("TEXT_GRENZE", "2"))
ENDGUELTIG = {"ready", "tor", "jury", "ungeeignet"}
JURY_MIN_N, JURY_MIN_QUOTE = 10, 0.40
AB_MIN_N, AB_FAKTOR = 10, 0.7
KOLLEKTIONEN = ["hype-jetzt", "bestseller", "neu-eingetroffen"]
FETCH_MAX = int(os.environ.get("FETCH_MAX", "600"))     # höchstens so viele Produkte je Lauf bei Shopify nachschlagen

# ---------------------------------------------------------------- Regeln (Kopien, Quelle jeweils dabei)
# JS-Regex ohne u-Flag: \b ist ASCII-basiert (ä gilt als Nicht-Wortzeichen), Python-\b ist Unicode → nachbauen.
_W = "A-Za-z0-9_"
_JSB = f"(?:(?<=[{_W}])(?![{_W}])|(?<![{_W}])(?=[{_W}]))"


def jsre(muster, flags=0):
    return re.compile(muster.replace(r"\b", _JSB), flags)


# metricool_pinterest_pin.mjs Z. 75–83
SPERR = {"nicht-bewerben", "nur-onlineshop", "18plus", "raucher", "erotik", "kostuem", "kostüm", "refurbished",
         "medizinprodukt-pruefen", "marken-pruefen", "lizenz-risiko", "lizenz-nicht-bewerben", "adult-nicht-bewerben", "gmc-adult-pull",
         "messer-nicht-bewerben", "smoke-zubehoer", "waffe-pruefen", "verdeckte-ueberwachung", "google-policy-flag", "arzneimittel-ohne-zulassung"}
HEIL = re.compile(r"schmerz|heil|migräne|krampfader|fettverbrenn|abnehmen|cellulite|arthr|rheuma|diabetes|entgift|detox|blutdruck|haarausfall|schnarch|inkontinenz", re.I)
LIZENZ_FIGUR = jsre(r"\b(?:batman|joker|superman|supergirl|spider-?man|marvel|avengers|deadpool|harley quinn|disney|mickey|minnie|pok[eé]mon|hello kitty|sanrio|kuromi|barbie|star wars|harry potter|hogwarts|gryffindor|slytherin|wednesday|addams|morticia|naruto|super mario|sonic (?:the hedgehog|classic|movie|shadow)|minecraft|paw patrol|labubu|eisk[oö]nigin|frozen|elsa|olaf|top gun|pennywise|pj masks|ninja turtles|squid game|wonder ?woman|catwoman|batgirl|pikachu|hagrid|dumbledore|voldemort)\b", re.I)
# post_guard.mjs MODEL_MEDIEN
MODEL_MEDIEN = re.compile(r"(^|[^a-z])(kundin-\d\d|luxestyle-model-(clean|musik)|tati-model|tatjana)", re.I)

# cj_video_reel_engine.mjs thema() (Stand 13.10.2026)
_THEMEN = [
    ("haustier", jsre(r"hund|katze|haustier|welpe|\bpet\b")),
    ("fitness", jsre(r"fitness|yoga|training|hantel|widerstand|faszien|sport")),
    ("kueche", jsre(r"küche|kuchen|mixer|kaffee|\btee(?!licht)|entsafter|grill|messbecher|topf|pfanne")),
    ("kinder", jsre(r"kind|baby|kleinkind|spielzeug|lern")),
    ("home", jsre(r"lampe|licht|\bled\b|deko|vase|kerze|diffuser|aroma|kissen|decke|organizer|regal")),
    ("gadget", jsre(r"beamer|projektor|kopfhörer|kopfhoerer|lautsprecher|ladegerät|kabel|usb|bluetooth|smart|kamera|drohne|gadget|tracker|hülle|huelle")),
    ("beauty", jsre(r"serum|\bgua\b|roller|creme|pflege|haar|nagel|wimper|augenbraue|makeup|make-up|massage|beauty|glätt|lidschatten|lippenstift|lipgloss|lippen|rouge|mascara|eyeliner|lidstrich|parfum|palette|puder")),
    ("schmuck", jsre(r"kette|ohrring|ohrhänger|armreif|armband|\bring\b|schmuck|anhänger|uhr")),
    # 13.10.2026: (?<!hand)schuh + Mode-Handschuhe nur mit Mode-Wort davor, wie die Engine — «Reinigungshandschuhe» ist keine Mode (CLAUDE.md 16d)
    ("mode", jsre(r"kleid|rock\b|bluse|hose|jacke|mantel|hoodie|shirt|hemd|pullover|cardigan|strick|sneaker|(?<!hand)schuh|(?:leder|winter|strick|kaschmir|touchscreen|fleece|plüsch|damen|ski|thermo)[-\s]?handschuh|stiefel|sandal|ballerina|tasche|rucksack|gürtel|schal|cap\b|mütze")),
]


def thema(t):
    s = t.lower()
    return next((k for k, r in _THEMEN if r.search(s)), "allgemein")


# cj_video_reel_engine.mjs produktHook() und Helfer (R9, 13.10.2026) — Port, Gleichlauf per Selbsttest gegen Engine-Ausgaben
HOOK_MAX = 24
FARBE_MASS = re.compile(r"^(schwarz|weiss|weiß|rot|blau|grün|gruen|gelb|orange|rosa|pink|lila|violett|grau|braun|beige|gold|silber|bunt|multicolor|mehrfarbig|transparent|damen|herren|unisex|paar|stück|stueck|stk|pack|packung|grösse|größe|farbe|farben|edelstahl|holz|bambus|leder|baumwolle|kunststoff|silikon|glas|keramik|metall|aluminium|satin|seide|samt|wolle|neu)$", re.I)
ADJ_FEST = re.compile(r"^[^-]+(bar|los|voll|frei|dicht|fest|sicher|tauglich)$", re.I)
ADJ_FLEX = re.compile(r"(ig|isch|lich|end|haft|sam|förmig|farbig|teilig|seitig|köpfig|stufig|bar|los|voll|frei|dicht|fest|sicher|tauglich)(e|er|es|en|em)$", re.I)
NOMEN_AUSNAHME = re.compile(r"(reiniger|spender|kalender|sender|wender|ständer)$", re.I)
PRAEP = re.compile(r"^(mit|für|fuer|fürs|aus|zum|zur|zu|in|im|ins|ohne|und|&|\+|von|vom|gegen|bei|beim|als|auf|an|am|ans|unter|über|ueber|nach|je|pro|per|inkl\.?|inklusive|oder|/|–|—|-)$", re.I)
RAUM_FREMD = re.compile(r"auto|kfz|fahrzeug|reise|outdoor|camping|garten|büro|buero|unterwegs|wander|fahrrad|velo|bike|strand|rucksack|tasche", re.I)
HOOK_HEIL = re.compile(r"therap|heilung|genesung|medizin|linder", re.I)
NUTZEN_STRENG = {
    "kueche": jsre(r"küche|kueche|koch|back|pfanne|kochtopf|gewürz|kaffee|\btee\b|mixer|entsafter|schneidebrett|besteck|geschirr|dörr|abtropf|schüssel|teller", re.I),
    "home": re.compile(r"lampe|leuchte|deko|vase|kerze|diffuser|aroma|kissen|decke|teppich|regal|organizer|vorhang|bettwäsche|wohn", re.I),
    "beauty": re.compile(r"gerät|roller|bürste|massage|lockenstab|glätteisen|föhn|epilierer|rasierer|trimmer|schleuder", re.I),
    "kinder": re.compile(r"kind|baby|spielzeug", re.I), "schmuck": re.compile(r"."), "mode": re.compile(r"^(?!.*(teig|küche|form\b)).*", re.I),
}
NUTZEN_STRENG["mode"] = jsre(r"^(?!.*(teig|küche|form\b)).*", re.I)


def kurz_titel(title):
    t = re.sub(r"\s*[·•|]\s*.*$", "", title, count=1)
    t = re.sub(r"\s+[–—-]\s+.*$", "", t, count=1)
    t = re.sub(r":.*$", "", t, count=1).strip()
    return t if len(t) >= 12 else title.strip()


def _ist_nomen(x, letztes):
    return (bool(re.match(r"^[A-ZÄÖÜ0-9]", x)) and not x.endswith("-") and len(re.sub(r"[^A-Za-zÄÖÜäöüß]", "", x)) >= 3
            and not ADJ_FEST.search(x.split("-")[-1]) and (letztes or NOMEN_AUSNAHME.search(x) or not ADJ_FLEX.search(x))
            and not FARBE_MASS.search(x) and not re.match(r"^[A-ZÄÖÜ0-9-]{2,5}$", x))


def produkt_wort(title):
    t = re.sub(r"\([^)]*\)|\"[^\"]*\"|«[^»]*»|„[^“]*“", " ", kurz_titel(str(title or "")))
    t = re.sub(r"\s+", " ", t).strip()
    woerter = t.split(" ")
    stopp = next((i for i, x in enumerate(woerter) if PRAEP.match(x)
                  and not (re.match(r"^(und|oder)$", x, re.I) and (woerter[i - 1] if i > 0 else "").endswith("-"))), -1)
    kopf_teil = " ".join(woerter if stopp < 0 else woerter[:stopp])
    satz = ""
    if stopp >= 0 and re.match(r"^(mit|für|fuer)$", woerter[stopp], re.I):
        nach = re.sub(r"\s*&\s*", " & ", " ".join(woerter[stopp + 1:]))
        nach = [x for x in re.split(r"\s*[,;]\s*", nach)[0].split(" ") if x]
        ende = next((i for i, x in enumerate(nach) if PRAEP.match(x)), -1)
        if ende >= 0 and re.match(r"^(und|oder|&)$", nach[ende], re.I):
            satz = ""
        else:
            satz = re.sub(r"[.;:!?]+$", "", " ".join([woerter[stopp]] + (nach if ende < 0 else nach[:ende]))).strip()
        if len(satz.split(" ")) < 2:
            satz = ""
    teile = re.split(r"\s*,\s*", kopf_teil)
    for ti, teil in enumerate(teile):
        w = [x for x in (re.sub(r"[.;:!?]+$", "", y) for y in teil.split(" ")) if x]
        for i in range(len(w) - 1, -1, -1):
            if not _ist_nomen(w[i], ti == len(teile) - 1 and i == len(w) - 1):
                continue
            vor = ""
            if (i > 0 and re.match(r"^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{2,}$", w[i - 1]) and not w[i - 1].endswith("-")
                    and not FARBE_MASS.search(w[i - 1]) and not PRAEP.match(w[i - 1])):
                vor = w[i - 1]
            st, kurz = w[i].split("-"), ""
            for j in range(len(st) - 1, 0, -1):
                k = "-".join(st[j:])
                if len(k) >= 6:
                    kurz = k
                    break
            return {"wort": w[i], "kurz": kurz, "vor": vor, "kopf": " ".join(w[:i + 1]), "satz": satz}
    return None


def _gross1(s):
    return s[0].upper() + s[1:] if s else s


def nutzen_kurz(th, title):
    s, fremd = title.lower(), bool(RAUM_FREMD.search(title))
    if th == "haustier":
        if jsre(r"für\s+(hunde?|welpen)\b").search(s) and "katze" not in s:
            return "für Hunde"
        if jsre(r"für\s+(katzen?|kitten)\b").search(s) and "hund" not in s:
            return "für Katzen"
        return "für Vierbeiner" if jsre(r"für\s+(haustiere?|vierbeiner|hunde?|katzen?)\b").search(s) else ""
    if th == "fitness":
        return "für zuhause" if not fremd and re.search(r"yoga|hantel|training|widerstand|faszien|matte|trainer", s) else ""
    n = {"kueche": "" if fremd else "für die Küche", "kinder": "für Kinder", "home": "" if fremd else "fürs Zuhause",
         "beauty": "" if fremd else "für zuhause", "schmuck": "für jeden Tag", "mode": "für jeden Tag"}.get(th, "")
    return n if n and th in NUTZEN_STRENG and NUTZEN_STRENG[th].search(title) else ""


def produkt_hook(th, title):
    pw = produkt_wort(title)
    if not pw:
        return ""
    besch = list(dict.fromkeys(x for x in [pw["kopf"], f"{pw['vor']} {pw['wort']}" if pw["vor"] else ""] if x and x != pw["wort"]))
    voll = besch + [pw["wort"]]
    kurz = [pw["kurz"]] if pw["kurz"] else []
    n = nutzen_kurz(th, title)

    def plus(f, z):
        if not z:
            return ""
        ws = [x for x in z.split(" ") if len(x) >= 4 and not re.match(r"^fürs?$", x, re.I)]
        return "" if any(x.lower()[:4] in f.lower() for x in ws) else f"{f} {z}"
    kand = ([plus(f, pw["satz"]) for f in voll] + [plus(f, pw["satz"]) for f in kurz] + [plus(f, n) for f in besch] + besch
            + [plus(pw["wort"], n), pw["wort"]] + [plus(f, n) for f in kurz] + kurz)
    for h in (_gross1(re.sub(r"\s+", " ", x).strip()) for x in kand if x):
        if 4 <= len(h) <= HOOK_MAX and not HEIL.search(h) and not HOOK_HEIL.search(h):
            return h
    return ""


def num(p):
    """Wie num() im Reel-Motor: stabile Zahl aus einem Text (für Musik/Stimme je Produkt). JS nimmt je Code-Punkt
    charCodeAt(0) = die erste UTF-16-Einheit."""
    h = 0
    for c in str(p):
        o = ord(c)
        h = (h * 31 + (o if o < 0x10000 else 0xD800 + ((o - 0x10000) >> 10))) & 0xFFFFFFFF
    return h


def media_key(u):
    """post_guard.mediaKey: Basename klein; nackte Nummern-Namen (01.jpg) mit Ordner."""
    teile = [t.lower().strip() for t in (u or "").split("?")[0].split("/")]
    name = teile.pop() if teile else ""
    return f"{teile.pop()}/{name}" if re.match(r"^\d{1,3}\.(?:jpe?g|png|webp|mp4)$", name) and teile else name


# ---------------------------------------------------------------- Ledger und Abbruchregeln
def jetzt():
    return datetime.now(timezone.utc)


def ledger_lesen(pfad=LEDGER):
    z = []
    if os.path.exists(pfad):
        for l in open(pfad, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 3 and t[1]:
                z.append(t)
    return z


def merken(handle, ergebnis, detail=""):
    d = re.sub(r"[\t\r\n]+", " ", str(detail))[:400]
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{jetzt().strftime('%Y-%m-%dT%H:%M:%SZ')}\t{handle}\t{ergebnis}\t{d}\n")


def tageszahlen(zeilen, tag):
    heute = [z for z in zeilen if z[0][:10] == tag]
    return sum(1 for z in heute if z[2] == "ready"), sum(1 for z in heute if z[2] not in ("ungeeignet", "set-einzelteil"))


def abbruch(zeilen, lernen=None):
    """'' = weiter, sonst Grund. Regel 1: Jury-Quote < 40 % ab 10 Urteilen. Regel 2: Bild-Median < 0,7 × Video je Plattform."""
    ja = sum(1 for z in zeilen if z[2] == "ready")
    nein = sum(1 for z in zeilen if z[2] == "jury")
    if ja + nein >= JURY_MIN_N and ja / (ja + nein) < JURY_MIN_QUOTE:
        return f"ABBRUCH 1: Jury-Quote {ja}/{ja + nein} = {ja / (ja + nein):.0%} < {JURY_MIN_QUOTE:.0%}"
    q = (lernen or {}).get("quelle_je_kanal") or {}
    for kanal in ("tiktok", "youtube", "instagram"):
        b, v = q.get(f"{kanal} bild") or {}, q.get(f"{kanal} video") or {}
        if b.get("n", 0) >= AB_MIN_N and v.get("n", 0) >= AB_MIN_N and b.get("median_score", 0) < AB_FAKTOR * v.get("median_score", 0):
            return (f"ABBRUCH 2: {kanal} Bild-Median {b['median_score']} < {AB_FAKTOR} × Video-Median {v['median_score']} "
                    f"(n {b['n']}/{v['n']}) — Poster brauchen einen Plattform-Filter, bis dahin keine Bild-Reels")
    return ""


# ---------------------------------------------------------------- Sperrlisten (nur lesen)
def _zeilen(pfad):
    p = os.path.join(REPO, pfad)
    return open(p, encoding="utf-8").read().split("\n") if os.path.exists(p) else []


def _csv(pfad):
    p = os.path.join(REPO, pfad)
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# 13.10.2026 (Prüfer R2): posts_image.csv-Zeilen ohne «/products/»-Link und ohne Shopify-ID am Ende blieben unerkannt (196 von 632,
# davon 126 gepostet) — die Zeilen-ID ist dort meist der Handle mit Erzeuger-Präfix (img-<handle>, ki-…, post-…) und evtl. Datum.
ID_PRAEFIX = re.compile(r"^(?:img|ki|kimi|post|clip|auto|edit|fresh\d*|meta-auto)-", re.I)
ID_DATUM = re.compile(r"-(?:\d{4}-\d{2}-\d{2}|\d{8})$")


def id_handle(zid):
    """Zeilen-ID → vermuteter Handle (Präfix und Datum am Ende weg). '' wenn nichts Brauchbares (< 6 Zeichen)."""
    h = ID_DATUM.sub("", ID_PRAEFIX.sub("", (zid or "").strip().lower()))
    return h if len(h) >= 6 and re.fullmatch(r"[a-z0-9-]+", h) else ""


def sperrlisten():
    s = {"handles": {}, "pids": set(), "medien": set(), "reel_pids": set()}

    def h(x, quelle):
        x = (x or "").strip().lower()
        if x and x not in s["handles"]:
            s["handles"][x] = quelle
    for r in _csv("automation/reels_seed.csv"):
        rid = (r.get("id") or "").strip()
        if rid.startswith("bildreel-"):
            h(rid[9:], "reels_seed.csv (bildreel)")
        for m in re.findall(r"/products/([a-z0-9-]+)", r.get("caption") or ""):
            h(m, f"reels_seed.csv ({rid[:30]})")
        # 13.10.2026 (Prüfer R2, Regel 10): Video-Reels sperren über den Caption-Link (532 von 534 cjreel-Zeilen); die 2 übrigen
        # sind v1-Reels «cjreel-<Shopify-ID>» ohne Link → über die ID.
        m = re.fullmatch(r"cjreel-(\d{12,15})", rid)
        if m:
            s["reel_pids"].add(m.group(1))
    for r in _csv("social/posts_image.csv"):
        for m in re.findall(r"/products/([a-z0-9-]+)", r.get("caption") or ""):
            h(m, "posts_image.csv")
        m = re.search(r"(\d{12,})\s*$", r.get("id") or "")
        if m:
            s["pids"].add(m.group(1))
        else:
            h(id_handle(r.get("id")), "posts_image.csv (Zeilen-ID)")
    for r in _csv("social/ig_karussell.csv"):
        for x in re.split(r"[\s,;|]+", (r.get("produkte") or "") + " " + (r.get("slug") or "")):
            h(x, "ig_karussell.csv")
    for z in _zeilen("dropship/_pinterest_pins.txt"):
        t = z.split("\t")
        if len(t) > 1:
            h(t[1], "_pinterest_pins.txt")
    for f in ("dropship/_ig_karussell.txt", "dropship/_tiktok_karussell.txt"):
        for z in _zeilen(f):
            h(z.split("\t")[0], f.split("/")[-1])
    s["medien"] = {z.strip() for z in _zeilen("dropship/_posted_media.txt") if z.strip()}
    return s


def vorrang_handles():
    heute = jetzt().strftime("%Y-%m-%d")
    aus = []
    for z in _zeilen("dropship/_social_vorrang.txt"):
        t = z.split("\t")
        if t[0].strip() and (len(t) < 2 or not t[1].strip() or t[1].strip() >= heute):
            aus.append(t[0].strip().lower())
    return list(dict.fromkeys(aus))


def gepostet(paare):
    """post_guard.produktGepostet für [(caption, zeilenId), …] in EINEM node-Aufruf — exakt dieselbe Schlüssel-Logik."""
    if not paare:
        return []
    js = ("import('./automation/post_guard.mjs').then(m=>{const p=JSON.parse(require('fs').readFileSync(0,'utf8'));"
          "console.log(JSON.stringify(p.map(([c,i])=>m.produktGepostet(c,i))))})")
    try:
        r = subprocess.run(["/opt/node22/bin/node", "-e", js], input=json.dumps(paare), capture_output=True, text=True, cwd=REPO, timeout=60)
        aus = json.loads(r.stdout.strip().split("\n")[-1])
        if len(aus) == len(paare):
            return aus
    except Exception:
        pass
    print("⚠️ produktGepostet nicht prüfbar (node) — diese Kandidaten gelten als gepostet.")
    return [True] * len(paare)                                   # kein Urteil ist kein Ja (Regel 10)


# ---------------------------------------------------------------- Shopify
# 13.10.2026: maxVariantPrice + Variantentitel/-preise (50) für preis_anzeige/set_einzelteil (reel/bild_reel.py); Kosten gemessen 157/330
FELDER = ("id handle title status onlineStoreUrl tags priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} "
          "variants(first:50){nodes{availableForSale title price}} "
          "media(first:10){nodes{mediaContentType ... on MediaImage{image{url width height}}}}")


def hole_handles(handles):
    from kaufwille_zeile import gql
    q = "query{" + " ".join(f"p{i}: productByIdentifier(identifier:{{handle:{json.dumps(h)}}}){{{FELDER}}}" for i, h in enumerate(handles)) + "}"
    d = gql(q)
    return [d.get(f"p{i}") for i in range(len(handles))]


def hole_kollektion(handle):
    from kaufwille_zeile import gql
    d = gql("query($h:String!){ collectionByHandle(handle:$h){ products(first:35, sortKey:BEST_SELLING){ nodes{ %s } } } }" % FELDER, {"h": handle})
    return ((d.get("collectionByHandle") or {}).get("products") or {}).get("nodes") or []


def bilder_gross(p):
    return [m["image"] for m in ((p.get("media") or {}).get("nodes") or [])
            if m.get("mediaContentType") == "IMAGE" and m.get("image") and min(m["image"]["width"], m["image"]["height"]) >= 600]


def vorpruefen(p, sp, led, heute):
    """Billige Prüfungen ohne Bild-Download. '' = weiter."""
    if not p:
        return "nicht gefunden"
    h = p["handle"].lower()
    tags = {t.lower() for t in p.get("tags") or []}
    preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
    alle_bilder = [m["image"]["url"] for m in (p.get("media") or {}).get("nodes") or [] if m.get("image")]
    final = {z[1]: z[2] for z in led if z[2] in ENDGUELTIG}
    heute_versucht = {z[1] for z in led if z[0][:10] == heute}
    if p["status"] != "ACTIVE":
        return "nicht aktiv"
    if not p.get("onlineStoreUrl"):
        return "nicht im Onlineshop"
    if not any(v.get("availableForSale") for v in (p.get("variants") or {}).get("nodes") or []):
        return "keine Variante kaufbar"
    if preis < MIN_PREIS:
        return f"unter CHF {MIN_PREIS:.2f}"
    import bild_reel
    mn, mx = bild_reel.preise(p)
    g = bild_reel.set_einzelteil(p["title"], (p.get("variants") or {}).get("nodes"), mn, mx)
    if g:
        return g
    if tags & SPERR:
        return f"Sperr-Tag {sorted(tags & SPERR)[0]}"
    if HEIL.search(p["title"]):
        return "Heilwort im Titel"
    if LIZENZ_FIGUR.search(p["title"]):
        return "Lizenzfigur im Titel"
    if MODEL_MEDIEN.search(h) or any(MODEL_MEDIEN.search(u) for u in alle_bilder):
        return "Model-Material (nur mit Markierung)"
    if h in final:
        return f"schon versucht: {final[h]}"
    if h in heute_versucht:
        return "heute schon versucht"
    if h in sp["handles"]:
        return f"schon in {sp['handles'][h]}"
    if p["id"].split("/")[-1] in sp["pids"]:
        return "schon als Bild-Post (posts_image.csv)"
    if p["id"].split("/")[-1] in sp.get("reel_pids", ()):
        return "schon als Video-Reel (reels_seed.csv, cjreel-<Shopify-ID>)"
    if any(media_key(u) in sp["medien"] for u in alle_bilder):
        return "Produktbild schon gepostet (_posted_media.txt)"
    if len(bilder_gross(p)) < MIN_BILDER:
        return f"< {MIN_BILDER} Bilder ≥ 600 px"
    if not produkt_hook(thema(p["title"]), p["title"]):
        return f"kein Produkt-Hook ≤ {HOOK_MAX} Zeichen"
    return ""


def bildpruefung(p):
    """Wie bild_reel.produkt(): Bilder ≥ 600 px ohne montierten Text und ohne weissen Freisteller. → (saubere, Gründe)"""
    import bild_reel
    from fremdtext import woerter_url
    sauber, gruende = 0, []
    for b in bilder_gross(p):
        n = woerter_url(b["url"])
        if n is not None and n >= TEXT_GRENZE:
            gruende.append(f"Text({n})")
            continue
        try:
            if bild_reel.freisteller(bild_reel.lade(b["url"])):
                gruende.append("Freisteller")
                continue
        except Exception as e:
            gruende.append(f"Download({type(e).__name__})")
            continue
        sauber += 1
    return sauber, gruende


TAGESCACHE = "/tmp/bild_reel_vorpruefung_{}.json"   # billige Absagen des Tages (spart Shopify-Abfragen im Stundentakt)


def cache_lesen(tag):
    try:
        return json.load(open(TAGESCACHE.format(tag), encoding="utf-8"))
    except Exception:
        return {}


def cache_schreiben(tag, cache):
    try:
        json.dump(cache, open(TAGESCACHE.format(tag), "w", encoding="utf-8"), ensure_ascii=False)
    except OSError:
        pass


def kandidaten(sp, led, heute, protokoll, cache, dauerhaft_merken=False):
    """Erzeugt (produkt, quelle, platz) nach Vorrang; prüft billig (vorpruefen), dann produktGepostet im Batch.
    dauerhaft_merken (nur scharf): «Set-Titel …»-Absagen kommen als «ungeeignet» ins Ledger (Preisaufbau ändert sich kaum)."""
    final = {z[1]: z[2] for z in led if z[2] in ENDGUELTIG}
    gesehen = set()

    def pruefe(batch):
        frisch = []
        for p, q, platz in batch:
            hh = p["handle"].lower()
            if hh in gesehen:
                continue
            gesehen.add(hh)
            g = vorpruefen(p, sp, led, heute)
            if g:
                protokoll.append((hh, g))
                cache[hh] = g
                # 13.10. abends (Prüfer «Empfohlen» 3): Set-Absagen NICHT mehr dauerhaft («ungeeignet») — nur Tagescache
                # (+ Ledger «set-einzelteil», am Folgetag neu): Preise/Varianten ändern sich, die Regel kann sich irren.
                if dauerhaft_merken and g.startswith("Set-Titel"):
                    merken(p["handle"], "set-einzelteil", g)
            else:
                frisch.append((p, q, platz))
        if not frisch:
            return []
        paare = []
        for p, _, _ in frisch:
            pid = p["id"].split("/")[-1]
            paare += [(f"«{kurz_titel(p['title'])}»", ""), (p["title"], ""), ("", p["handle"]), ("", f"x-{pid}"), ("", f"bildreel-{p['handle']}")]
        g = gepostet(paare)
        aus = []
        for k, (p, q, platz) in enumerate(frisch):
            if any(g[k * 5:(k + 1) * 5]):
                protokoll.append((p["handle"].lower(), "Produkt schon gepostet (_posted_produkte.txt)"))
                cache[p["handle"].lower()] = "Produkt schon gepostet"
            else:
                aus.append((p, q, platz))
        return aus

    vr = vorrang_handles()
    offen = []
    for i, h in enumerate(vr):
        grund = (f"lokal: schon in {sp['handles'][h]}" if h in sp["handles"] else f"lokal: schon versucht: {final[h]}" if h in final
                 else f"lokal: {cache[h]} (Tagescache)" if h in cache else "")
        if grund:
            protokoll.append((h, grund))
        else:
            offen.append((h, i + 1))
    for i in range(0, min(len(offen), FETCH_MAX), 15):
        teil = offen[i:i + 15]
        ps = hole_handles([h for h, _ in teil])
        for (h, _), p in zip(teil, ps):
            if p is None:
                protokoll.append((h, "nicht gefunden"))
                cache[h] = "nicht gefunden"
        yield from pruefe([(p, "vorrang", platz) for (h, platz), p in zip(teil, ps) if p])
    if len(offen) > FETCH_MAX:
        protokoll.append(("", f"Abfrage-Deckel {FETCH_MAX} im Saison-Vorrang erreicht"))
    for k in KOLLEKTIONEN:
        try:
            ps = hole_kollektion(k)
        except Exception as e:
            protokoll.append(("", f"Kollektion {k}: {e}"))
            continue
        yield from pruefe([(p, k, i + 1) for i, p in enumerate(ps)
                           if p["handle"].lower() not in cache and p["handle"].lower() not in final])


# ---------------------------------------------------------------- Musik und Stimme
def _winterzeit(stimm):
    """Winterstück nur 15.11.–10.01. (automation/music/_stimmung.json), wie im Reel-Motor."""
    import datetime
    w = (stimm or {}).get("winter")
    if not w:
        return True
    t = datetime.datetime.utcnow(); md = t.month * 100 + t.day
    am, ad = map(int, w["ab"].split("-")); bm, bd = map(int, w["bis"].split("-"))
    return md >= am * 100 + ad or md <= bm * 100 + bd


def _musik_pool(th=None):
    """Epische Stücke wie der Reel-Motor (EPISCH aus cj_video_reel_engine.mjs gelesen), ohne Sperrliste, mit CREDITS-Zeile.
    18.10.2026: Stimmungs-Pool je Warengruppe (automation/music/_stimmung.json) und das am längsten nicht benutzte Stück
    (letzte 80 Verlaufszeilen) statt «nicht unter den letzten 5»."""
    src = open(os.path.join(HIER, "cj_video_reel_engine.mjs"), encoding="utf-8").read()
    m = re.search(r"const EPISCH = \[([^\]]*)\]", src)
    pool = re.findall(r"'([^']+)'", m.group(1)) if m else ["luxe-epic-elegant.wav", "luxe-epic-hero.wav", "luxe-orchestra.wav"]
    gesperrt = {z.split("\t")[0].strip() for z in _zeilen("automation/music/_gesperrt.txt") if z.strip() and not z.startswith("#")}
    credits = "\n".join(_zeilen("automation/music/CREDITS.txt"))
    pool = [x for x in pool if x not in gesperrt and os.path.exists(os.path.join(HIER, "music", x)) and x in credits]
    try:
        import json as _json
        stimm = _json.load(open(os.path.join(HIER, "music", "_stimmung.json"), encoding="utf-8"))
    except Exception:
        stimm = None
    if stimm:
        w = stimm.get("winter") or {}
        if th and (stimm.get("pools") or {}).get(th):
            eng = [x for x in stimm["pools"][th] if x in pool]
            if w and _winterzeit(stimm) and th in (w.get("gilt_fuer") or []) and w.get("datei") in pool and w["datei"] not in eng:
                eng.append(w["datei"])
            pool = eng or pool
        elif w and not _winterzeit(stimm):
            pool = [x for x in pool if x != w.get("datei")] or pool
    return pool


FENSTER_ABSTAND, RUHE_STUNDEN, NIE = 9.0, 14 * 24, 1e6


def waehle(pool, pid, verlauf, fenster, jetzt_ms):
    """Regel v3 — Gegenstück zu automation/lib/musik_wahl.mjs (gleiche Antworten, Parität im Selbsttest).
    pool: [datei] · verlauf: [(t_ms, datei, start)] nach Zeit sortiert · fenster: {datei: [start]} → (datei, start)."""
    if not pool:
        return "", 0.0
    letzte2 = [v[1] for v in verlauf[-2:]]
    kand = [m for m in pool if m not in letzte2] if len(pool) >= 3 else list(pool)
    kand = kand or list(pool)

    def std(zeiten):
        return min((jetzt_ms - zeiten[-1]) / 3.6e6, RUHE_STUNDEN) if zeiten else NIE

    n30 = lambda m: sum(1 for v in verlauf if v[1] == m and jetzt_ms - v[0] <= 30 * 86400e3)
    s = {m: min(std([v[0] for v in verlauf if v[1] == m]), RUHE_STUNDEN) for m in kand}
    beste = max(s.values())
    frei = sorted([m for m in kand if s[m] >= beste - 1e-9], key=lambda m: (n30(m), m))
    wahl = frei[num(pid) % len(frei)]
    ws = fenster.get(wahl) or [0.0]
    fz = {w: min(std([v[0] for v in verlauf if v[1] == wahl and abs(v[2] - w) < FENSTER_ABSTAND]), RUHE_STUNDEN) for w in ws}
    bf = max(fz.values())
    ff = [w for w in ws if fz[w] >= bf - 1e-9]
    return wahl, ff[(num(pid) // 7) % len(ff)]


def _verlauf_zeit():
    import calendar
    out = []
    for z in _zeilen("social/_musik_verlauf.txt"):
        f = z.split("\t")
        if len(f) < 5:
            continue
        try:
            out.append((calendar.timegm(time.strptime(f[0][:19], "%Y-%m-%dT%H:%M:%S")) * 1000.0, f[1].strip(), float(f[2] or 0)))
        except ValueError:
            pass
    return sorted(out)


def _fenster_lesen():
    import json as _json
    try:
        return _json.load(open(os.path.join(HIER, "music", "_fenster.json"), encoding="utf-8"))
    except (OSError, ValueError):
        try:
            return {k: (v.get("einstiege") or [0]) for k, v in _json.load(open(os.path.join(HIER, "music", "_einstiege.json"), encoding="utf-8")).items()}
        except (OSError, ValueError):
            return {}


def musik_waehle(handle, th=None):
    """18.10.2026 (Betreiber «immer das gleiche ist nervend»): → (datei, start). Stück UND Fenster rotieren (vorher: nur das Stück,
    der Einstieg war bei Bild-Reels immer einstiege[0])."""
    return waehle(_musik_pool(th), handle, _verlauf_zeit(), _fenster_lesen(), time.time() * 1000)


def musik_fuer(handle, th=None):
    return musik_waehle(handle, th)[0]


def stimme_fuer(handle):
    if not os.environ.get("AZURE_SPEECH_KEY"):
        return None
    anteil = float(os.environ.get("STIMME_ANTEIL", "0.5") or 0)
    if (num(handle) % 1000) / 1000 >= anteil:
        return None
    return "de-CH-LeniNeural" if num(handle) % 2 else "de-CH-JanNeural"


# ---------------------------------------------------------------- Ablauf
def plan_fuer(p, q, platz, sauber, gruende):
    import bild_reel
    th = thema(p["title"])
    hook = produkt_hook(th, p["title"])
    n = min(sauber, 7)
    st = stimme_fuer(p["handle"])
    mn, mx = bild_reel.preise(p)
    return {"handle": p["handle"], "titel": p["title"], "preis": mn, "preis_max": mx,
            "quelle": q, "platz": platz, "thema": th, "hook": hook, "bilder_sauber": sauber, "bilder_gross": len(bilder_gross(p)),
            "ausgelassen": gruende, "dauer": bild_reel.dauer_fuer(n), "musik": musik_fuer(p["handle"], th), "stimme": st,
            "begruendung": (f"{'Saison-Vorrang Platz ' + str(platz) if q == 'vorrang' else 'Kollektion ' + q + ' Platz ' + str(platz)}; "
                            f"{sauber} saubere Bilder ≥ 600 px (Diashow {bild_reel.dauer_fuer(n)} s, Schnitt bei 0,5 s); "
                            f"Hook «{hook}» ({len(hook)} Z.) aus dem Produktwort; {bild_reel.preis_anzeige(mn, mx)}; "
                            f"nirgends gepostet/geplant")}


def auswaehlen(n, protokoll, led=None, ungeeignet_merken=False):
    """Bis n Kandidaten, die auch die Bildprüfung bestehen. ungeeignet_merken (nur scharf): zu wenige saubere Bilder kommen als
    «ungeeignet» ins Ledger — sonst würde jede Stunde dieselbe OCR laufen."""
    led = ledger_lesen() if led is None else led
    heute = jetzt().strftime("%Y-%m-%d")
    sp = sperrlisten()
    cache = cache_lesen(heute)
    aus = []
    try:
        for p, q, platz in kandidaten(sp, led, heute, protokoll, cache, dauerhaft_merken=ungeeignet_merken):
            sauber, gruende = bildpruefung(p)
            if sauber < MIN_BILDER:
                g = f"nur {sauber} saubere Bilder ({', '.join(gruende)})"
                protokoll.append((p["handle"].lower(), g))
                cache[p["handle"].lower()] = g
                if ungeeignet_merken:
                    merken(p["handle"], "ungeeignet", g)
                continue
            aus.append(plan_fuer(p, q, platz, sauber, gruende))
            if len(aus) >= n:
                break
    finally:
        cache_schreiben(heute, cache)
    return aus


def lauf(cmd, timeout):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO, timeout=timeout, stdin=subprocess.DEVNULL)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return 124, "", f"Zeitlimit {timeout} s"


def letzte_json(text):
    for z in reversed((text or "").strip().split("\n")):
        try:
            return json.loads(z)
        except Exception:
            continue
    return {}


def bauen(k, bogen_dir, out_dir):
    """Ein Bild-Reel bauen, prüfen, freigeben. → (ergebnis, detail, bogen)"""
    import bild_reel
    h = k["handle"]
    # Musik erst JETZT wählen (13.10.: beim Planen gewählt bekamen drei Reels eines Laufs dasselbe Stück wie der parallel
    # laufende Reel-Motor — luxe-epic-winter 3× hintereinander im Verlauf)
    k["musik"], k["musik_start"] = musik_waehle(h, k.get("thema"))   # 18.10.: mit Warengruppen-Pool (F1) und rotierendem Fenster (F2)
    cmd = [sys.executable, BILD_REEL, "--handle", h, "--hook", k["hook"], "--out-dir", out_dir, "--dauer", str(k["dauer"]),
           "--text-grenze", str(TEXT_GRENZE)]
    if k["musik"]:
        cmd += ["--musik", k["musik"], "--musik-start", str(k["musik_start"])]
    cmd += ["--stimme", k["stimme"]] if k["stimme"] else ["--ohne-stimme"]
    rc, so, se = lauf(cmd, 1500)
    res = letzte_json(so)
    datei = res.get("datei") or os.path.join(out_dir, f"bildreel_{h[:60]}.mp4")
    bogen = ""
    try:
        if rc == 4:
            return "tor", f"meisterwerk_tor: {res.get('tor_gruende')}", ""
        if rc != 0 or not os.path.exists(datei):
            txt = (so + se).strip().split("\n")
            meld = next((z for z in reversed(txt) if "⛔" in z), txt[-1] if txt else f"Exit {rc}")
            if "⛔" in meld and "Einzelteil" in meld:
                return "set-einzelteil", meld[:200], ""      # Tagescache, nicht endgültig (13.10. abends)
            return ("ungeeignet" if "⛔" in meld and re.search(r"nicht aktiv|weniger als 2 Bilder", meld) else "fehler"), meld[:200], ""
        os.makedirs(bogen_dir, exist_ok=True)
        bogen = os.path.join(bogen_dir, f"bildreel_{h[:60]}.jpg")
        lauf([sys.executable, os.path.join(HIER, "reel", "schnitt.py"), "--kontaktbogen", datei, "--bogen-out", bogen], 300)
        if not os.path.exists(bogen):
            bogen = ""
        cap = bild_reel.caption_fuer({"title": res.get("titel") or k["titel"]}, float(res.get("preis") or k["preis"]), h,
                                     float(res.get("preis_max") or k.get("preis_max") or 0) or None)
        rc, so, se = lauf([sys.executable, os.path.join(HIER, "gemini_jury.py"), datei, "--caption", cap, "--typ", "reel"], 450)
        j = letzte_json(so)
        note = f"Jury {j.get('schnitt')} {','.join(j.get('ko') or [])} {str(j.get('gruende') or j.get('grund') or '')[:120]}".strip()
        if rc == 4:
            return "jury", note, bogen
        if rc != 0:
            return "kein-urteil", note or (se.strip()[-160:]), bogen
        rc, so, se = lauf([sys.executable, BILD_REEL, "--freigeben", datei, "--handle", h], 900)
        fr = letzte_json(so)
        if rc != 0 or not str(fr.get("url", "")).startswith("https://cdn.shopify.com/"):
            meld = (so + se).strip().split("\n")[-1][:200]
            if "steht schon in der Queue" in meld:
                return "ungeeignet", meld, bogen
            return "fehler", f"Freigabe: {meld}", bogen
        ja = bool(res.get("stimme"))
        grund = f"azure:{res.get('stimme_name')}" if ja else ("fehler" if k["stimme"] else "anteil")
        with open(VERLAUF, "a", encoding="utf-8") as f:
            f.write(f"{jetzt().strftime('%Y-%m-%dT%H:%M:%S.000Z')}\t{res.get('musik', k['musik'])}\t{res.get('musik_start', 0)}\t{k['thema']}\t"
                    f"bildreel-{h}\tstimme:{'ja' if ja else 'nein'}\t{grund}\tquelle:bild\n")
        return "ready", f"{fr['url']} · {note} · {res.get('musik')} · {res.get('dauer')} s · {res.get('bilder')} Bilder", bogen
    finally:
        for x in (datei, datei + ".schnitt.json"):
            try:
                os.remove(x)
            except OSError:
                pass


def stand(ausgabe=True):
    led = ledger_lesen()
    heute = jetzt().strftime("%Y-%m-%d")
    r, n = tageszahlen(led, heute)
    try:
        lj = json.load(open(LERNEN, encoding="utf-8"))
    except Exception:
        lj = {}
    ab = abbruch(led, lj)
    ja = sum(1 for z in led if z[2] == "ready")
    nein = sum(1 for z in led if z[2] == "jury")
    if ausgabe:
        print(f"BILD-REELS heute {heute}: {r}/{MAX_TAG} ready, {n}/{RENDER_TAG} Renders · gesamt ready {ja}, Jury nein {nein}"
              f"{f' (Quote {ja / (ja + nein):.0%})' if ja + nein else ''} · {ab or 'keine Abbruchregel greift'}")
        q = lj.get("quelle_je_kanal") or {}
        if q:
            print("  A/B (Median-Score, Posts ≥ 48 h): " + " · ".join(f"{k} n={v.get('n')} {v.get('median_score')}" for k, v in sorted(q.items())))
    return led, r, n, ab


def selbsttest():
    ok = fehl = 0

    def pr(name, bed):
        nonlocal ok, fehl
        ok, fehl = ok + bool(bed), fehl + (not bed)
        print(("  ok   " if bed else "  FEHL ") + name)
    # 1. Hook-Port = Engine (13.10.2026: Funktionen aus cj_video_reel_engine.mjs gezogen, 1'151 Shop-Titel, 0 Abweichungen)
    ref = [("Gestreifter Kissenbezug aus Baumwoll-Leinen-Mix", "home", "Gestreifter Kissenbezug"),
           ("Dynamische Reflexion Keramik-Kaffeetasse", "kueche", "Keramik-Kaffeetasse"),
           ("Wärmeplatte für den Heimgebrauch", "allgemein", "Wärmeplatte"),
           ("VR-Ständer für Headset & 2 Controller", "beauty", "VR-Ständer für zuhause"),
           ("Smartwatch KT58 mit Herzfrequenz", "gadget", "Smartwatch"),
           ("JAKEHOE Lüfter-Reinigungsspray", "allgemein", "Lüfter-Reinigungsspray")] + SELBSTTEST_REF
    for t, th, hk in ref:
        pr(f"Hook «{t[:40]}» → {th}/«{hk}»", thema(t) == th and produkt_hook(th, t) == hk)
    pr("Hook ≤ 24 Zeichen, kein Heilwort", all(len(produkt_hook(thema(t), t)) <= 24 for t, _, _ in ref))
    pr("thema: \\b ASCII wie JS («LED-Rucksack» → home)", thema("LED-Rucksack") == "home")
    pr("thema: «Teelicht» ist keine Küche", thema("Teelicht-Halter") != "kueche")
    # 13.10.2026 (Prüfer R3): Handschuh ≠ Schuh (CLAUDE.md 16d) — Kanarien + Gleichlauf py↔js gegen die ECHTE Engine-Funktion
    hs = {"Hitzebeständige Reinigungshandschuhe": False, "Silikon-Spülhandschuhe mit Bürstenfunktion": False, "Arbeitshandschuh": False,
          "Damen Sneaker Schuhe": True, "Damen Schuhe aus Leder": True, "Unisex Lederhandschuhe Winter": True,
          "Warme Touchscreen-Handschuhe mit Fleecefutter": True}
    pr("thema: Reinigungs-/Spül-/Arbeitshandschuh ≠ mode, Schuhe/Winterhandschuhe = mode",
       all((thema(t) == "mode") == soll for t, soll in hs.items()))
    js = ("const fs=require('fs');const src=fs.readFileSync('automation/cj_video_reel_engine.mjs','utf8');"
          "const th=new Function(/function thema\\(t\\) \\{[\\s\\S]*?\\n\\}/.exec(src)[0]+';return thema;')();"
          "Promise.all([import('./automation/post_guard.mjs'),import('./automation/lib/reel-category.mjs')]).then(([m,rc])=>{"
          "const t=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify({"
          "kat:['Hitzebeständige Reinigungshandschuhe','Silikon-Ofenhandschuhe','Unisex Lederhandschuhe Winter','Arbeitshandschuhe aus Nitril','Gartenhandschuhe mit Krallen','Einweghandschuhe 100 Stück','Boxhandschuhe 12 oz','Velo-Handschuhe Halbfinger','Auto-Waschhandschuh Mikrofaser','Touchscreen Strickhandschuhe Damen'].map(x=>rc.catKey(x)),"
          "thema:t.map(x=>th(x)),anzeige:[m.preisAnzeige(20.9,41.9),m.preisAnzeige(21.9,21.9)],"
          "veraltet:[m.preisVeraltet('X\\nab CHF 20.90 · Gratis Versand ab CHF 50',20.9,41.9),m.preisVeraltet('ab CHF 24.90',20.9,41.9),"
          "m.preisVeraltet('CHF 24.90',20.9,41.9)],"
          "keys:[m.produktKey('','x-15449432916353'),m.produktKey('','hoodie-jogginghose-set-im-partnerlook-637400')]}))})")
    titel = list(hs) + [t for t, _, _ in ref]
    try:
        r = subprocess.run(["/opt/node22/bin/node", "-e", js], input=json.dumps(titel), capture_output=True, text=True, cwd=REPO, timeout=60)
        jj = json.loads(r.stdout.strip().split("\n")[-1])
    except Exception as e:
        jj = {"fehler": str(e)[:80]}
    pr(f"Gleichlauf thema() py = js ({len(titel)} Titel)", jj.get("thema") == [thema(t) for t in titel])
    # 13.10.2026 (Prüfer R2, Preis-Wahrheit): «ab» bei Variantenspanne, Poster prüft «ab X» = Mindestpreis
    import bild_reel
    pr("preis_anzeige py = preisAnzeige js («ab CHF 20.90» / «CHF 21.90»)",
       [bild_reel.preis_anzeige(20.9, 41.9), bild_reel.preis_anzeige(21.9, 21.9)] == ["ab CHF 20.90", "CHF 21.90"] == jj.get("anzeige"))
    pr("preisVeraltet: «ab CHF 20.90» = Mindestpreis ok, «ab CHF 24.90» nicht, nacktes «CHF 24.90» in der Spanne ok",
       (jj.get("veraltet") or [None])[0] == "" and bool((jj.get("veraltet") or ["", ""])[1]) and (jj.get("veraltet") or ["", "", "x"])[2] == "")
    pr("Hashtag-Gruppe (lib/reel-category catKey): Reinigungs-/Ofenhandschuh = kueche, Lederhandschuh = mode, Arbeits-/"
       "Einweg-/Velo-/Auto-Waschhandschuh ≠ mode, Garten = home, Box = fitness, Strick = mode",
       jj.get("kat") == ["kueche", "kueche", "mode", "allgemein", "home", "allgemein", "fitness", "allgemein", "allgemein", "mode"])
    pr("Reel-Poster-Schlüssel = Prüfschlüssel der Auswahl (pid:<Shopify-ID>, slug:<Handle ohne Ziffernende>)",
       jj.get("keys") == ["pid:15449432916353", "slug:hoodie-jogginghose-set-im-partnerlook"])
    hood = [{"title": "Gray Sweater / S", "price": "24.90"}, {"title": "Gray Trousers / S", "price": "20.90"},
            {"title": "Grey Suit / M", "price": "40.90"}, {"title": "Set1 / L", "price": "41.90"}]
    pr("Set-Regel: Hoodie-Set (20.90 = Hose, Set 41.90) → auslassen",
       bild_reel.set_einzelteil("Hoodie & Jogginghose Set im Partnerlook", hood, 20.9, 41.9).startswith("Set-Titel"))
    pr("Set-Regel: günstigste Variante ist selbst ein Set / Spanne < 30 % / kein Set-Titel → bleibt",
       bild_reel.set_einzelteil("Pyjama-Set", [{"title": "Set Rot / S", "price": "20.90"}], 20.9, 41.9) == ""
       and bild_reel.set_einzelteil("Partnerlook Hoodie", [{"title": "Hose / S", "price": "30.90"}], 30.9, 41.9) == ""
       and bild_reel.set_einzelteil("Damen Strickpullover", [{"title": "Grau / S", "price": "21.90"}], 21.9, 41.9) == ""
       and bild_reel.set_einzelteil("Headset mit Mikrofon", [{"title": "Schwarz", "price": "15.90"}], 15.9, 39.9) == "")
    pr("Set-Regel eng (13.10. abends): Grössen-/Farb-/Mengenspanne ist kein Einzelteil (Familien-Pyjama, Kissen-6er-Set, "
       "Nagellack einzeln/5er) · Bauteil «Hose» schon",
       bild_reel.set_einzelteil("Familien-Pyjama-Set Weihnachten", [{"title": "Baby / 3M", "price": "14.90"},
                                {"title": "Dad / XL", "price": "34.90"}], 14.9, 34.9) == ""
       and bild_reel.set_einzelteil("Samt-Lendenkissenbezug (6er-Set)", [{"title": "30x50cm", "price": "12.90"},
                                    {"title": "45x45cm", "price": "24.90"}], 12.9, 24.9) == ""
       and bild_reel.set_einzelteil("3-in-1 Nagellackstift · einzeln oder 5er-Set", [{"title": "Einzeln", "price": "9.90"},
                                    {"title": "5er-Set", "price": "29.90"}], 9.9, 29.9) == ""
       and bild_reel.set_einzelteil("Zweiteiler Set Damen", [{"title": "Schwarz / Hose / M", "price": "15.90"},
                                    {"title": "Schwarz / Set / M", "price": "39.90"}], 15.9, 39.9).startswith("Set-Titel")
       and bild_reel.set_einzelteil("Partnerlook Set", [{"title": f"Rot / {g}", "price": "39.90"} for g in "SML"], 15.9, 39.9) == ""
       and bild_reel.set_einzelteil("Partnerlook Set", [{"title": "Top / S", "price": "39.90"}], 15.9, 39.9).startswith("Set-Titel"))
    pr("Set-Absage ist nicht endgültig (Tagescache): «set-einzelteil» nicht in ENDGUELTIG und zählt nicht als Render",
       "set-einzelteil" not in ENDGUELTIG and tageszahlen([["2026-10-13T01:00:00Z", "h", "set-einzelteil", ""]], "2026-10-13") == (0, 0))
    pr("Caption Bild-Reel: «ab CHF 16.90» bei Spanne, sonst nackt",
       "\nab CHF 16.90 · " in bild_reel.caption_fuer({"title": "Wickel"}, 16.9, "h", 22.9)
       and "\nCHF 16.90 · " in bild_reel.caption_fuer({"title": "Wickel"}, 16.9, "h"))
    # 2. Sperren
    pr("HEIL: «Schmerzlinderung»", bool(HEIL.search("Wärmepflaster zur Schmerzlinderung")))
    pr("Lizenzfigur: «Spider-Man»", bool(LIZENZ_FIGUR.search("Spider-Man Rucksack")))
    pr("Lizenzfigur: «Disneyland» nicht (Wortgrenze)", not LIZENZ_FIGUR.search("Disneyland Ticket"))
    pr("Lizenzfigur: «Kinderkostüm Eiskönigin»", bool(LIZENZ_FIGUR.search("Kinderkostüm Eiskönigin Prinzessin")))
    pr("Lizenzfigur: «Top Gun Bomberjacke»", bool(LIZENZ_FIGUR.search("Top Gun Maverick Bomberjacke")))
    pr("Lizenzfigur: Wortgrenze «Elsass»/«Frozen» in «Unfrozen» nicht", not LIZENZ_FIGUR.search("Elsass Wanderkarte") and not LIZENZ_FIGUR.search("Unfrozen Drink"))
    pr("Model-Material: tati-model", bool(MODEL_MEDIEN.search("https://cdn.shopify.com/x/tati-model-03.jpg")))
    pr("Model-Material: «Rotatiere» nicht", not MODEL_MEDIEN.search("rotatiere.jpg"))
    pr("media_key: Nummern-Name mit Ordner", media_key("https://x/y/Set-A/01.JPG?v=1") == "set-a/01.jpg")
    pr("media_key: Basename klein", media_key("https://cdn/x/ABC_1.jpg?v=2") == "abc_1.jpg")
    p = {"handle": "kleid-test", "id": "gid://shopify/Product/123456789012345", "title": "Midikleid mit Blumenprint", "status": "ACTIVE",
         "onlineStoreUrl": "https://x", "tags": ["neu"], "priceRangeV2": {"minVariantPrice": {"amount": "29.90"}},
         "variants": {"nodes": [{"availableForSale": True}]},
         "media": {"nodes": [{"mediaContentType": "IMAGE", "image": {"url": f"https://cdn/x/k{i}.jpg", "width": 800, "height": 1000}} for i in range(4)]}}
    sp0 = {"handles": {}, "pids": set(), "medien": set()}
    pr("vorpruefen: sauberer Kandidat", vorpruefen(p, sp0, [], "2026-10-13") == "")
    pr("vorpruefen: Kostüm-Tag", vorpruefen({**p, "tags": ["Kostuem"]}, sp0, [], "2026-10-13").startswith("Sperr-Tag"))
    pr("vorpruefen: CHF 14.80", vorpruefen({**p, "priceRangeV2": {"minVariantPrice": {"amount": "14.80"}}}, sp0, [], "x").startswith("unter"))
    pr("vorpruefen: DRAFT", vorpruefen({**p, "status": "DRAFT"}, sp0, [], "x") == "nicht aktiv")
    pr("vorpruefen: nichts kaufbar", vorpruefen({**p, "variants": {"nodes": [{"availableForSale": False}]}}, sp0, [], "x") == "keine Variante kaufbar")
    pr("vorpruefen: schon im Pin-Ledger", vorpruefen(p, {**sp0, "handles": {"kleid-test": "_pinterest_pins.txt"}}, [], "x").startswith("schon in"))
    pr("vorpruefen: Bild schon gepostet", vorpruefen(p, {**sp0, "medien": {"k2.jpg"}}, [], "x").startswith("Produktbild"))
    pr("vorpruefen: Bild-Post-ID", vorpruefen(p, {**sp0, "pids": {"123456789012345"}}, [], "x").startswith("schon als Bild-Post"))
    # 13.10.2026: v1-Video-Reel «cjreel-<Shopify-ID>» ohne Caption-Link sperrt; Hoodie-Fall fällt in der Vorprüfung
    pr("vorpruefen: Video-Reel über Shopify-ID", vorpruefen(p, {**sp0, "reel_pids": {"123456789012345"}}, [], "x").startswith("schon als Video-Reel"))
    pv = {**p, "title": "Hoodie & Jogginghose Set im Partnerlook", "priceRangeV2": {"minVariantPrice": {"amount": "20.9"}, "maxVariantPrice": {"amount": "41.9"}},
          "variants": {"nodes": [{"availableForSale": True, "title": "Gray Trousers / S", "price": "20.90"},
                                 {"availableForSale": True, "title": "Grey Suit / M", "price": "41.90"}]}}
    pr("vorpruefen: Hoodie-Set mit Einzelteil-Mindestpreis → Set-Titel", vorpruefen(pv, sp0, [], "x").startswith("Set-Titel"))
    # 13.10.2026 (Prüfer R2): posts_image-Zeilen-ID als Handle (Präfix + Datum weg)
    pr("id_handle: img-/edit-…-Datum/nackter Handle/zu kurz",
       [id_handle("img-herrenuhr-edelstahl"), id_handle("edit-plateau-sandale-20260610"), id_handle("rizinusol-wickel-bauch-nacken"),
        id_handle("ki-uhr"), id_handle("post-damen-mantel-2026-09-01")]
       == ["herrenuhr-edelstahl", "plateau-sandale", "rizinusol-wickel-bauch-nacken", "", "damen-mantel"])
    pr("vorpruefen: 2 grosse Bilder reichen nicht", vorpruefen({**p, "media": {"nodes": p["media"]["nodes"][:2]}}, sp0, [], "x").startswith("<"))
    pr("vorpruefen: Ledger endgültig", vorpruefen(p, sp0, [["2026-10-01T00:00:00Z", "kleid-test", "jury", ""]], "x").startswith("schon versucht"))
    pr("vorpruefen: kein-urteil heute = morgen neu", vorpruefen(p, sp0, [["2026-10-13T01:00:00Z", "kleid-test", "kein-urteil", ""]], "2026-10-13") == "heute schon versucht"
       and vorpruefen(p, sp0, [["2026-10-12T01:00:00Z", "kleid-test", "kein-urteil", ""]], "2026-10-13") == "")
    # 3. Deckel und Abbruch
    led = [["2026-10-13T0%d:00:00Z" % i, f"h{i}", e, ""] for i, e in enumerate(["ready", "ready", "tor", "ungeeignet", "jury"])]
    pr("Tageszahlen: 2 ready, 4 Renders (ungeeignet zählt nicht)", tageszahlen(led, "2026-10-13") == (2, 4))
    pr("Abbruch 1 greift: 3/10", abbruch([["t", f"h{i}", "ready" if i < 3 else "jury", ""] for i in range(10)]).startswith("ABBRUCH 1"))
    pr("Abbruch 1 nicht: 4/10", abbruch([["t", f"h{i}", "ready" if i < 4 else "jury", ""] for i in range(10)]) == "")
    pr("Abbruch 1 nicht unter 10 Urteilen", abbruch([["t", f"h{i}", "jury", ""] for i in range(9)]) == "")
    lj = {"quelle_je_kanal": {"tiktok bild": {"n": 10, "median_score": 150}, "tiktok video": {"n": 12, "median_score": 250}}}
    pr("Abbruch 2 greift: TikTok 150 < 0,7 × 250", abbruch([], lj).startswith("ABBRUCH 2: tiktok"))
    lj["quelle_je_kanal"]["tiktok bild"]["median_score"] = 180
    pr("Abbruch 2 nicht: 180 ≥ 175", abbruch([], lj) == "")
    lj["quelle_je_kanal"]["tiktok bild"] = {"n": 9, "median_score": 1}
    pr("Abbruch 2 nicht unter n=10", abbruch([], lj) == "")
    # 4. Länge, Zeilen, Musik
    import bild_reel
    pr("dauer_fuer: 3 → 8, 4 → 8, 5 → 11, 9 → 11", [bild_reel.dauer_fuer(n) for n in (3, 4, 5, 9)] == [8, 8, 11, 11])
    z = bild_reel.zeilen("Multifunktions-Haarklammern-Set für Damen und Mädchen mit Perlen und Glitzer")
    pr("zeilen: kein «…», keine leere erste Zeile, ≤ 26/30", "…" not in "".join(z) and z[0] and len(z[0]) <= 31 and len(z[1]) <= 30)
    pr("zeilen: keine Präposition am Ende", not re.search(r"\s(mit|für|und)$", z[0] + "|" + z[1]))
    pr("sprech_hook: Name nicht doppelt", bild_reel.sprech_hook("Leselupe mit LED-Licht", "XXL Leselupe mit LED-Licht") == "")
    m = musik_fuer("kleid-test")
    gesperrt = {z.split("\t")[0] for z in _zeilen("automation/music/_gesperrt.txt") if z and not z.startswith("#")}
    letzte = [z.split("\t")[1] for z in _zeilen("social/_musik_verlauf.txt") if z.count("\t") >= 4][-5:]
    pr(f"Musik «{m}»: vorhanden, nicht gesperrt, nicht unter den letzten 5", bool(m) and m not in gesperrt
       and os.path.exists(os.path.join(HIER, "music", m)) and m not in letzte)
    pr("num() wie JS (\"abc\" → 96354)", num("abc") == 96354)
    print(f"Selbsttest: {ok}/{ok + fehl} ok")
    return 0 if not fehl else 1


# Weitere Referenzpaare (Titel, Thema, Hook) aus der Engine am 13.10.2026 — siehe selbsttest()
SELBSTTEST_REF = [("Langarm-Top «Dentelle» – Spitzen-Panel, Colorblock", "allgemein", "Langarm-Top"),
                  ("Retro Jacquard Pullover mit Rundhalsausschnitt", "mode", "Retro Jacquard Pullover"),
                  ("Tasse «Buenzli»", "allgemein", "Tasse"),
                  ("Wireless Controller Ladestation mit LED-Anzeige", "home", "Controller Ladestation"),
                  ("High-Waist Yoga Leggings mit Shaping-Effekt – Schwarz", "fitness", "High-Waist Yoga Leggings"),
                  ("Plüschtier mit Quietscher für Hunde", "haustier", "Plüschtier für Hunde"),
                  ("Interaktiver Hunde-Spielball aus E-TPU", "haustier", "Hunde-Spielball"),
                  ("Randlose Sonnenbrille mit Metall-Details", "allgemein", "Randlose Sonnenbrille")]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--scharf", action="store_true")
    ap.add_argument("--stand", action="store_true")
    ap.add_argument("--selbsttest", action="store_true")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--max", type=int, default=1)
    ap.add_argument("--json-out", default="")
    ap.add_argument("--bogen-dir", default="/tmp/bildreel_auswahl/boegen")
    ap.add_argument("--out-dir", default="/tmp/bildreel_auswahl")
    a = ap.parse_args()
    if a.selbsttest:
        return selbsttest()
    if a.stand:
        return 5 if stand()[3] else 0
    if not (a.dry or a.scharf):
        ap.print_help()
        return 1
    led, r, n, ab = stand()
    if a.dry:
        import bild_reel
        protokoll = []
        aus = auswaehlen(a.n, protokoll, led)
        for i, k in enumerate(aus, 1):
            print(f"{i:2}. {k['handle'][:58]} · {bild_reel.preis_anzeige(k['preis'], k.get('preis_max'))} · {k['bilder_sauber']}/{k['bilder_gross']} Bilder · Hook «{k['hook']}» · "
                  f"{k['musik']} · {'Stimme ' + k['stimme'] if k['stimme'] else 'ohne Stimme'}\n    {k['begruendung']}"
                  f"{' · ausgelassen: ' + ', '.join(k['ausgelassen']) if k['ausgelassen'] else ''}")
        gr = {}
        for _, g in protokoll:
            key = re.sub(r"\d+", "N", re.sub(r"\s*\(.*|:.*", "", g)).strip()
            gr[key] = gr.get(key, 0) + 1
        print(f"Ausgeschieden: {sum(gr.values())} — " + " · ".join(f"{k} {v}" for k, v in sorted(gr.items(), key=lambda x: -x[1])))
        if a.json_out:
            json.dump({"kandidaten": aus, "ausgeschieden": protokoll}, open(a.json_out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        return 0
    # scharf
    if socket.gethostname().startswith("ubuntu-4gb") and os.environ.get("BILD_REEL_SERVER") != "1":
        print("Bild-Reels bauen nur im Container (Server = derselbe Runner, Doppelbau-Gefahr; BILD_REEL_SERVER=1 hebt das auf).")
        return 0
    if os.path.exists(os.path.join(REPO, "dropship", "_SOCIAL_STOPP")):
        print("dropship/_SOCIAL_STOPP liegt — keine Bild-Reels.")
        return 0
    if ab:
        print(ab)
        return 5
    sperre = open("/tmp/bild_reel_auswahl.lock", "w")
    try:
        fcntl.flock(sperre, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("Bild-Reel-Auswahl läuft bereits.")
        return 0
    frei = min(a.max, MAX_TAG - r, RENDER_TAG - n)
    if frei <= 0:
        print(f"Tagesdeckel erreicht ({r}/{MAX_TAG} ready, {n}/{RENDER_TAG} Renders).")
        return 0
    k0 = subprocess.run([sys.executable, os.path.join(HIER, "gemini_jury.py"), "x", "--kontingent"], cwd=REPO, capture_output=True, timeout=90)
    if k0.returncode == 0:
        print("Jury-Kontingent leer (alle Bildmodelle) — ohne Urteil kein ready, also heute kein Render.")
        return 0
    gebaut = versuche = 0
    protokoll = []
    aus = auswaehlen(min(frei + 2, RENDER_TAG - n), protokoll, ledger_lesen(), ungeeignet_merken=True)
    if not aus:
        print("Keine Kandidaten (Gründe: " + "; ".join(sorted({g.split(' (')[0] for _, g in protokoll if not g.startswith('lokal')}))[:300] + ").")
    for k in aus:
        if gebaut >= frei or versuche >= RENDER_TAG - n:
            break
        versuche += 1
        t0 = time.time()
        print(f"→ {k['handle']} · Hook «{k['hook']}» · {k['bilder_sauber']} Bilder · {k['musik']} · {k['stimme'] or 'ohne Stimme'}", flush=True)
        erg, detail, bogen = bauen(k, a.bogen_dir, a.out_dir)
        merken(k["handle"], erg, detail)
        led = ledger_lesen()
        print(f"   {erg} ({time.time() - t0:.0f} s): {detail[:220]}{' · Bogen ' + bogen if bogen else ''}", flush=True)
        if erg == "ready":
            gebaut += 1
        r2, n2 = tageszahlen(led, jetzt().strftime("%Y-%m-%d"))
        if r2 >= MAX_TAG or n2 >= RENDER_TAG:
            break
        if abbruch(led):
            print(abbruch(led))
            return 5
    print(f"Bild-Reels: {gebaut} ready in diesem Lauf ({versuche} Versuche).")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
