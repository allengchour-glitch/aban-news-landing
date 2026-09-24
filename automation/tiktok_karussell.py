#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_karussell — baut mehrseitige TikTok-Foto-Posts (Karussell) aus echter Shop-Ware.

WARUM DIESES WERKZEUG:
TikToks Content-Posting-API steht fuer diesen Shop weiter in Review (`unauthorized_client`),
die Ads-API kann keine Beitraege veroeffentlichen. Der einzige Weg, der HEUTE funktioniert, ist
tiktok.com/tiktokstudio/upload von Hand. Dieses Werkzeug baut deshalb das FERTIGE Material:
nummerierte Slides plus eine Caption, die nur noch hochgeladen werden muss.

ZWEI MODI (der Betreiber wollte «karussell oder mehrere miteinander»):
  MODUS=produkt  Ein Produkt, mehrere Slides aus SEINEN EIGENEN Bildern (CJ liefert 4-8).
  MODUS=top      Mehrere Produkte in EINEM Karussell, eines je Slide (Top-Liste).

⚠️ WAS HIER BEWUSST NICHT PASSIERT — jede dieser Regeln ist im Projekt teuer bezahlt worden:
 1. KEINE erfundenen Aussagen. Auf den Slides steht ausschliesslich, was im Shop steht:
    Produkttitel und Preis. Kein Nutzenversprechen, das nicht belegt ist.
 2. KEINE Lieferzeit in der Caption. Es gab in diesem Shop sieben widerspruechliche Angaben;
    eine achte in einem Social-Post waere die naechste. Die Lieferzeit steht auf der Produktseite.
 3. KEIN Streichpreis, kein «statt CHF …». Die konstruierten Vergleichspreise wurden am
    24.08. entfernt (PBV Art. 16) — sie duerfen hier nicht durch die Hintertuer zurueck.
 4. KEIN Rabattcode ausser WELCOME10. Der ist bis Ende 2027 gueltig und live geprueft;
    fuenf Seiten bewarben monatelang den abgelaufenen PAPA25.
 5. KEIN Produkt mit Wirk-/Heilversprechen im Titel (Wachstum, gegen Pigmentflecken, Anti-Falten).
    Auf einer Produktseite ist das reguliert, in einem Social-Post ist es Werbung damit.
 6. KEIN Produkt zweimal — auch nicht plattformuebergreifend. Geprueft wird gegen das eigene
    Ledger UND gegen automation/reels_seed.csv (Doppelpost-Verbot des Betreibers).

⚠️ Dieses Werkzeug POSTET NICHTS. Es schreibt Dateien. Der Stopp-Riegel dropship/_SOCIAL_STOPP
   betrifft die Poster, nicht die Produktion — aber solange er liegt, wird auch nichts gepostet.

ENV: MODUS (produkt|top, Default produkt) · QUELLE (Kollektions-Handle, Default hype-jetzt)
     ANZAHL (Karussells je Lauf, Default 1) · SLIDES (Default 6) · DRY=1 (nur melden)
     NUR_HANDLES=a,b,c  (23.09.2026, Halloween-Auftritt) — Produkt-VORGABE in dieser Reihenfolge statt
        «erster freier Kandidat der Kollektion». Alle Wachen (ACTIVE, Sperr-Tags, Claim/Topisch, Preis,
        Bildzahl, schon beworben) gelten weiter; ein Handle, der daran scheitert, wird gemeldet, nicht erzwungen.
     MAX_PREIS (nur top): Kandidaten ueber diesem Preis bleiben draussen (z. B. «unter CHF 25»).
     KICKER (produkt, Default «Neu im Shop») · TOP_KICKER (top, Default «Gerade im Trend») ·
     TOP_WORT (top, Default «Trend-Teile» → «4 Trend-Teile unter CHF 20») · CAPTION_VORSPANN (vor Zeile 1 der Caption)
     ⚠️ «Neu im Shop» auf Ware vom Juli waere eine Behauptung — fuer Saisonware den KICKER setzen (z. B. «Halloween-Deko»).
"""

import csv
import json
import os
import re
import subprocess
import time

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# ⚠️ «Link in Bio» wird nicht behauptet, sondern am Profil GEPRUEFT:
# das Konto hat keinen Bio-Link (kein Business-Konto, 560 Follower — TikTok
# gibt das Website-Feld auf Privatkonten erst ab 1'000 frei). Siehe
# automation/tiktok_biolink.py. Faellt die Abfrage aus, greift die
# vorsichtige Fassung ohne die Zusage.
from tiktok_biolink import cta_zeile, cta_slide
from eimer_etikette import nachlauf

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()

MODUS = os.environ.get("MODUS", "produkt")
QUELLE = os.environ.get("QUELLE", "hype-jetzt")
ANZAHL = int(os.environ.get("ANZAHL", "1"))
# 24.09.2026 (Betreiber: «warum nicht mehr bilder in karusell»): Instagram erlaubt 20 Slides, gebaut wurden hoechstens 6
# (Hook + 4 Produktbilder + CTA). Fuer FORMAT=ig jetzt bis 8; TikTok bleibt bei 6.
SLIDES = int(os.environ.get("SLIDES") or ("8" if os.environ.get("FORMAT") == "ig" else "6"))
DRY = os.environ.get("DRY") == "1"
NUR_HANDLES = [h.strip() for h in os.environ.get("NUR_HANDLES", "").split(",") if h.strip()]
MAX_PREIS = float(os.environ.get("MAX_PREIS") or 0) or None
KICKER = os.environ.get("KICKER", "Neu im Shop")
TOP_KICKER = os.environ.get("TOP_KICKER", "Gerade im Trend")
TOP_WORT = os.environ.get("TOP_WORT", "Trend-Teile")
CAPTION_VORSPANN = os.environ.get("CAPTION_VORSPANN", "")
# NEU_BAUEN=1 (23.09.2026): ein Set, das schon «ready» in der Queue steht, mit den aktuellen Regeln neu rendern —
# gleicher Slug, gleicher Ordner, Queue-Zeile wird ersetzt statt angehaengt, Ledger unveraendert. Nur mit NUR_HANDLES.
# Fuer top-Sets muss SLUGZEIT denselben Slug ergeben wie beim Erstbau.
NEU_BAUEN = os.environ.get("NEU_BAUEN") == "1"

# 23.09.2026 (Betreiber «insta karusell brauchen»): FORMAT=ig baut dieselben Slides in 4:5 (1080x1350) —
# Instagram nimmt in Karussells nur 4:5 bis 1.91:1, ein 9:16-Slide wuerde abgelehnt oder beschnitten.
# Eigener Ordner, eigene Queue, eigenes Ledger; der Poster ist automation/ig_karussell_post.mjs.
FORMAT = os.environ.get("FORMAT", "tiktok")
if FORMAT == "ig":
    AUS = os.path.join(ROOT, "social", "instagram")
    QUEUE = os.path.join(ROOT, "social", "ig_karussell.csv")
    LEDGER = os.path.join(ROOT, "dropship", "_ig_karussell.txt")
    B, H = 1080, 1350                  # Instagram-Karussell 4:5
else:
    AUS = os.path.join(ROOT, "social", "tiktok")
    QUEUE = os.path.join(ROOT, "social", "tiktok_karussell.csv")
    LEDGER = os.path.join(ROOT, "dropship", "_tiktok_karussell.txt")
    B, H = 1080, 1920                  # TikTok-Fotos werden 9:16 vollflaechig gezeigt
REELS = os.path.join(HIER, "reels_seed.csv")


def _ig_website():
    """Instagram-Profilfeld `website` (Graph-API, Token /tmp/meta_page_token). Leer = nicht messbar."""
    try:
        ig = open("/tmp/meta_ig_id").read().strip()
        tok = open("/tmp/meta_page_token").read().strip()
        r = subprocess.run(["curl", "-s", "--max-time", "20",
                            f"https://graph.facebook.com/v21.0/{ig}?fields=website&access_token={tok}"],
                           capture_output=True, text=True)
        return (json.loads(r.stdout).get("website") or "").strip()
    except Exception:
        return ""


# 23.09.2026: cta_zeile()/cta_slide() aus tiktok_biolink pruefen das TIKTOK-Profil (kein Bio-Link). Fuer FORMAT=ig
# zaehlt das INSTAGRAM-Profil — dort ist `website` gesetzt (gemessen 22.09. und heute: luxestyle.ch). Also wird
# «Link in Bio» je Format am richtigen Profil gemessen, nicht behauptet.
_IG_LINK = bool(_ig_website()) if FORMAT == "ig" else None


def cta_text(vorspann="Jetzt im Shop 🇨🇭 "):
    if _IG_LINK is None:
        return cta_zeile(vorspann)
    return f"{vorspann}luxestyle.ch" + (" — Link in Bio" if _IG_LINK else "")


def cta_abschluss():
    if _IG_LINK is None:
        return cta_slide()
    return "Link in Bio" if _IG_LINK else ""
# Bildfenster je Format (Anteil der Hoehe) — 4:5 hat 30 % weniger Hoehe, das 9:16-Fenster (20–80 %)
# schob den Titel ins Produktbild (Probe 23.09.: Titel ueber dem EMS-Geraet). Werte am Kontaktbogen gemessen.
if FORMAT == "ig":
    HOOK_OBEN, HOOK_HOEHE, HOOK_UNTEN = 0.10, 0.40, 200     # Slide 1: Bild 135–675, Text ab ~830
    PROD_OBEN, PROD_HOEHE, PROD_UNTEN = 0.12, 0.46, 330     # Slides 2..n: Bild 162–783, Text ab ~800
else:
    HOOK_OBEN, HOOK_HOEHE, HOOK_UNTEN = 0.125, 0.46, 250
    PROD_OBEN, PROD_HOEHE, PROD_UNTEN = 0.20, 0.60, 400

INK = (24, 24, 26)
GOLD = (193, 154, 91)
WEISS = (255, 255, 255)
CREME = (246, 242, 235)

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# --- Ausschluesse -----------------------------------------------------------
# Wirk- und Heilversprechen im TITEL. Auf der Produktseite reguliert, im Social-Post beworben.
CLAIM = re.compile(
    r"wachstum|(?:haar|bart|wimpern|nagel|brust)wuchs|gegen\s+pigment|pigmentflecken|anti[- ]?falten|faltenreduz|straff|"
    r"blutzucker|blutdruck|\bekg\b|abnehm|schlankheit|heil|therapie|schmerz",
    re.I)
# Tags, die ein Produkt aus jeder Werbung heraushalten.
SPERR_TAGS = {"bild-zu-klein", "medizinprodukt-pruefen", "18plus", "raucher",
              "waffengesetz-verboten", "nicht-bewerben", "nicht-live-moebel-sperrig",
              "niedrig-bewertet-nicht-bewerben", "nur-onlineshop", "duplikat-auto-draft"}
MIN_KANTE = 700        # unter 700 px sieht ein 1080er Slide ausgefranst aus
# 24.09.2026: Die Kuerbis-Suessigkeitenschale hat 12 Dateien = 6 Motive; drei Motive (Kerzen-Szene, Unterseite, Massfoto)
# gibt es NUR als 600x600 — sie fielen raus, das Karussell hatte 4 statt 7 Slides. Bilder ab MIN_KANTE_NOTFALL fuellen
# jetzt auf, stehen aber immer HINTER allen grossen (der Hook-Slide bleibt ein grosses Bild).
MIN_KANTE_NOTFALL = int(os.environ.get("MIN_KANTE_NOTFALL", "600"))
MIN_PREIS = 15.0


def gql(q, v=None):
    p = "/tmp/_ttk.json"
    with open(p, "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    # ⚠️ 23.09.2026 (Verbesserungsrunde 6): Hier zaehlte jede Drosselung als Fehlversuch mit festen 6 s —
    # 8 × 6 s = 48 s. Um 02:11 starten die Tages-Waechter gleichzeitig, der Eimer war laenger leer, und der
    # Bauer starb im Top-Modus (die Abfrage selbst kostet 99 Punkte). Derselbe Baustein speist tiktok_meisterwerk
    # und seit heute die Instagram-Karussells. Jetzt wie google_kanal_saeubern (21.09.): Drosseln zaehlen nicht,
    # gewartet wird so lange, wie throttleStatus sagt; nach jeder Antwort die Eimer-Etikette.
    versuche, drossel, grund = 0, 0, "kein Versuch"
    while versuche < 8:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@" + p], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            versuche += 1; grund = "kein JSON"; time.sleep(5); continue
        fehler = json.dumps(d.get("errors") or "")
        if ("Throttled" in fehler or "THROTTLED" in fehler) and drossel < 40:
            drossel += 1
            k = (d.get("extensions") or {}).get("cost") or {}; t = k.get("throttleStatus") or {}
            fehlt = float(k.get("requestedQueryCost") or 100) - float(t.get("currentlyAvailable") or 0)
            rate = float(t.get("restoreRate") or 0)
            time.sleep(min(30.0, fehlt / rate + 1.0) if (fehlt > 0 and rate > 0) else 12.0)
            continue
        if d.get("data") is not None:
            nachlauf(d)
            return d
        versuche += 1; grund = fehler[:200]
        time.sleep(5)
    # ⚠️ 17.09.2026: Hier stand `return {}` — dieselbe stille Null wie in 15
    # Geschwister-Wächtern, nur ohne verschluckten except-Zweig. Der Aufrufer
    # rechnet mit `.get(...)` weiter und meldet ein saubere Ergebnis über null
    # Datensätze, obwohl Shopify nur gedrosselt hat. Gegenprobe an dup_scan.py:
    # mit falschem Token Abbruch mit Exit 1 statt «0 Produkte».
    raise RuntimeError(
        "Shopify hat auf keinen Versuch mit Daten geantwortet. FRÜHER gab diese"
        " Funktion hier ein leeres Ergebnis zurück und der Aufrufer meldete «0» —"
        " das ist keine Messung, sondern ein Ausfall. Letzter Grund: " + grund)


def hole(handle):
    q = """query($h:String!,$c:String){
      collectionByHandle(handle:$h){
        products(first:60, after:$c){
          pageInfo{hasNextPage endCursor}
          nodes{ id title handle status tags
            priceRangeV2{minVariantPrice{amount}}
            media(first:12){nodes{... on MediaImage{image{url width height}}}}
          }}}}"""
    aus, cur = [], None
    while True:
        d = gql(q, {"h": handle, "c": cur})
        c = (((d.get("data") or {}).get("collectionByHandle") or {}).get("products") or {})
        if not c:
            break
        aus += c.get("nodes") or []
        if not (c.get("pageInfo") or {}).get("hasNextPage"):
            break
        cur = c["pageInfo"]["endCursor"]
    return aus


def bilder(p):
    """Taugliche Slide-Bilder, BESTE ZUERST.

    ⚠️ Die Reihenfolge des Lieferanten ist keine Qualitaetsreihenfolge. Der erste Probelauf
    machte aus einer CJ-Infografik (Pfeile, Comic-Wolken, 899x685 PNG) den Haupt-Slide eines
    Karussells — genau die Klasse «montierter Fremdtext im Bild» vom 21.08.
    Gemessen an drei Beispielen unterscheidet das Format die beiden Sorten zuverlaessig:
      · JPG, nahezu quadratisch (800x800 / 1500x1500 / 1920x1920) → Studiofoto
      · PNG oder schiefes Format (899x685, 470x485, 745x806)      → Grafik oder Collage
    Das ist eine HEURISTIK, kein Beweis — sie sortiert nur um und verwirft nichts ausser
    zu kleinen Bildern. Wo nichts Besseres da ist, wird das Vorhandene genommen.
    """
    bewertet = []
    for i, m in enumerate((p.get("media") or {}).get("nodes") or []):
        im = (m or {}).get("image") or {}
        u, w, h = im.get("url"), im.get("width") or 0, im.get("height") or 0
        if not u or min(w, h) < MIN_KANTE_NOTFALL:
            continue
        ist_jpg = ".png" not in u.split("?")[0].lower()
        quadrat = 0.95 <= (w / h) <= 1.05
        rang = (2 if ist_jpg and quadrat else 1 if ist_jpg else 0) + (3 if min(w, h) >= MIN_KANTE else 0)
        bewertet.append((-rang, i, u))
    bewertet.sort()
    return [u for _, _, u in bewertet]


# Topische Kosmetik (Creme/Serum/Maske zum Auftragen) wird NICHT beworben — Betreiber-
# Entscheid 30.08. («gesichts creme passt nicht wen aus china kommt»). Im Shop FUEHREN ist
# etwas anderes als BEWERBEN (dieselbe Trennung wie bei Wirkversprechen, 28.08.).
# Geraete (Roller, Buersten, Lockenstab) bleiben bewerbbar — die Regel trifft nur, was auf
# die Haut aufgetragen wird.
# 24.09.2026: Lizenzfiguren (Batman, Wednesday, Mickey …) bewerben wir nicht selbst — die Fortura-Ware ist echt und darf
# verkauft werden, aber ein eigener Post mit einer geschützten Figur ist Marken-/Urheberrecht des Rechteinhabers. Am Titel,
# nicht am Tag: 23 solche Artikel tragen weder «kostuem» noch einen Lizenz-Tag (Plüsch, Ballone, Perücken).
LIZENZ_FIGUR = re.compile(r"\b(?:batman|joker|superman|supergirl|spider-?man|marvel|avengers|deadpool|harley quinn|disney|mickey|minnie|pok[eé]mon|hello kitty|sanrio|kuromi|barbie|star wars|harry potter|hogwarts|gryffindor|slytherin|wednesday|addams|morticia|naruto|super mario|sonic (?:the hedgehog|classic|movie|shadow)|minecraft|paw patrol|labubu)\b", re.I)
TOPISCH = re.compile(r'Creme|Serum|Hautpflege|Lotion|Gesichtsmaske|Augenmaske|Ampulle|'
                     r'Peeling|Balsam|Salbe|[ÖO]l\b.*(?:Gesicht|Haut)|Essence', re.I)


def geeignet(p, mindest_bilder):
    if p.get("status") != "ACTIVE":
        return False
    if SPERR_TAGS & set(t.lower() for t in (p.get("tags") or [])):
        return False
    if CLAIM.search(p.get("title") or ""):
        return False
    if TOPISCH.search(p.get("title") or ""):
        return False
    if LIZENZ_FIGUR.search(p.get("title") or ""):
        return False
    try:
        if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) < MIN_PREIS:
            return False
    except Exception:
        return False
    # 24.09.2026: Kleine Bilder (MIN_KANTE_NOTFALL) duerfen nur AUFFUELLEN — mindestens ein Bild ab MIN_KANTE muss
    # da sein, sonst waere der Hook-Slide ein hochgezogenes 600er-Bild.
    gross = sum(1 for m in ((p.get("media") or {}).get("nodes") or [])
                if min(((m or {}).get("image") or {}).get("width") or 0,
                       ((m or {}).get("image") or {}).get("height") or 0) >= MIN_KANTE)
    return gross >= 1 and len(bilder(p)) >= mindest_bilder


def schon_verwendet():
    """Handles, die bereits beworben wurden — eigenes Ledger UND die Reel-Queue."""
    benutzt = set()
    if os.path.exists(LEDGER):
        for z in open(LEDGER):
            t = z.split("\t")
            if t:
                benutzt.add(t[0].strip())
    if os.path.exists(REELS):
        try:
            for r in csv.DictReader(open(REELS)):
                for feld in ("handle", "product_handle", "slug", "name"):
                    if r.get(feld):
                        benutzt.add(r[feld].strip())
        except Exception:
            pass
    return benutzt


def lade(url, ziel):
    r = subprocess.run(["curl", "-sL", "--max-time", "60", "-o", ziel, url],
                       capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(ziel) and os.path.getsize(ziel) > 4000


def f(pfad, groesse):
    return ImageFont.truetype(pfad, groesse)


def _teile(w):
    """«Kürbis-Süssigkeitenschale» → ['Kürbis-', 'Süssigkeitenschale']: der Bindestrich bleibt am Zeilenende."""
    kern = w.strip("-")
    if "-" not in kern:
        return [w]
    st = w.split("-")
    return [s + "-" for s in st[:-1] if s] + [st[-1]]


def umbrechen(d, text, schrift, breite):
    """Greedy-Umbruch an Leerzeichen; ein Wort, das allein nicht in die Breite passt, wird am Bindestrich
    gebrochen (Prüfer 23.09.: «Kürbis-Süssigkeitenschale» lief auf dem CTA-Slide von x=0 bis x=1079 über den
    Goldrahmen hinaus, weil nur an Leerzeichen gebrochen wurde). Passt auch ein Teil nicht, bleibt die Zeile
    breiter als `breite` — der Aufrufer prüft das mit passt_breite() und verkleinert die Schrift, nie abschneiden."""
    zeilen, zeile = [], ""
    passt = lambda s: d.textlength(s, font=schrift) <= breite
    for w in text.split():
        probe = (zeile + " " + w).strip()
        if passt(probe):
            zeile = probe
            continue
        teile = _teile(w)
        if len(teile) == 1 or passt(w):            # ganzes Wort auf die naechste Zeile, wenn es dort Platz hat
            if zeile:
                zeilen.append(zeile)
            zeile = w
            continue
        klebt = False                              # nach einem «Kürbis-» folgt der Rest ohne Leerzeichen
        for t in teile:
            probe = (zeile + t) if klebt else (zeile + " " + t).strip()
            if passt(probe):
                zeile = probe
            else:
                if zeile:
                    zeilen.append(zeile)
                zeile = t
            klebt = True
    if zeile:
        zeilen.append(zeile)
    return zeilen


def passt_breite(d, zeilen, schrift, breite):
    return all(d.textlength(z, font=schrift) <= breite for z in zeilen)


def grund(bildpfad, oben=0.20, hoehe=0.60):
    """Unscharfer, formatfuellender Hintergrund + scharfes Produktbild darueber.

    Ein quadratisches Produktfoto auf 9:16 zu beschneiden schneidet die Ware an; der
    unscharfe Fuellgrund ist der Standardweg und laesst das Bild vollstaendig.
    """
    q = Image.open(bildpfad).convert("RGB")
    v = max(B / q.width, H / q.height)
    hg = q.resize((int(q.width * v) + 2, int(q.height * v) + 2), Image.LANCZOS)
    hg = hg.crop(((hg.width - B) // 2, (hg.height - H) // 2,
                  (hg.width - B) // 2 + B, (hg.height - H) // 2 + H))
    hg = hg.filter(ImageFilter.GaussianBlur(38))
    hg = ImageEnhance.Brightness(hg).enhance(0.62)

    v2 = min((B - 120) / q.width, (H * hoehe) / q.height)
    vg = q.resize((int(q.width * v2), int(q.height * v2)), Image.LANCZOS)
    vg = ImageEnhance.Color(ImageEnhance.Contrast(vg).enhance(1.06)).enhance(1.05)
    hg.paste(vg, ((B - vg.width) // 2, int(H * oben)))
    return hg


def scrim(img, oben=True, unten=True):
    """Sanfte Verlaeufe, damit Text auf jedem Foto lesbar bleibt."""
    lage = Image.new("RGBA", (B, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lage)
    if oben:
        for y in range(0, 360):
            d.line([(0, y), (B, y)], fill=(0, 0, 0, int(150 * (1 - y / 360))))
    if unten:
        for y in range(H - 620, H):
            a = (y - (H - 620)) / 620
            d.line([(0, y), (B, y)], fill=(0, 0, 0, int(215 * a)))
    return Image.alpha_composite(img.convert("RGBA"), lage).convert("RGB")


def marke(d, nummer=None, gesamt=None):
    d.text((60, 74), "L U X E S T Y L E", font=f(SANSB, 30), fill=WEISS)
    d.line([(60, 122), (322, 122)], fill=GOLD, width=3)
    if nummer:
        t = f"{nummer}/{gesamt}"
        d.text((B - 60 - d.textlength(t, font=f(SANSB, 30)), 74), t,
               font=f(SANSB, 30), fill=GOLD)


def preis_pille(d, x, y, text):
    br = d.textlength(text, font=f(SANSB, 44)) + 64
    d.rounded_rectangle([x, y, x + br, y + 88], radius=44, fill=GOLD)
    d.text((x + 32, y + 20), text, font=f(SANSB, 44), fill=(30, 24, 12))


def slide_hook(bildpfad, kicker, gross, titel, nummer, gesamt, wisch=True):
    """Erster Slide. Der PREIS ist der Anker, nicht der Titel.

    Grund steht in der eigenen Auswertung: eine Caption mit Preis-Anker schlug die generische
    Fassung um das Zwanzigfache. Der Titel darunter erklaert, was es ist.
    """
    img = scrim(grund(bildpfad, oben=HOOK_OBEN, hoehe=HOOK_HOEHE))
    d = ImageDraw.Draw(img)
    marke(d, nummer, gesamt)

    schrift_t = f(SANS, 40)
    zeilen = umbrechen(d, titel, schrift_t, B - 130)[:2]
    unterkante = H - HOOK_UNTEN
    y = unterkante - len(zeilen) * 52
    for z in zeilen:
        d.text((66, y + 3), z, font=schrift_t, fill=(0, 0, 0))
        d.text((64, y), z, font=schrift_t, fill=CREME)
        y += 52

    schrift_g = f(SERIF, 122)
    while d.textlength(gross, font=schrift_g) > B - 130 and schrift_g.size > 60:
        schrift_g = f(SERIF, schrift_g.size - 6)
    yg = unterkante - len(zeilen) * 52 - schrift_g.size - 34
    d.text((68, yg + 5), gross, font=schrift_g, fill=(0, 0, 0))
    d.text((64, yg), gross, font=schrift_g, fill=WEISS)

    d.text((64, yg - 62), kicker.upper(), font=f(SANSB, 34), fill=GOLD)
    d.line([(64, unterkante + 34), (254, unterkante + 34)], fill=GOLD, width=6)
    if wisch:
        d.text((64, unterkante + 62), "→ weiterwischen", font=f(SANSB, 36), fill=CREME)
    return img


def slide_produkt(bildpfad, titel, preis, nummer, gesamt, zeile=None):
    img = scrim(grund(bildpfad, oben=PROD_OBEN, hoehe=PROD_HOEHE))
    d = ImageDraw.Draw(img)
    marke(d, nummer, gesamt)
    groesse = 60
    while True:                                    # Prüfer 23.09.: dieselbe Breiten-Wache wie auf dem CTA-Slide
        schrift = f(SERIF, groesse)
        zeilen = umbrechen(d, titel, schrift, B - 130)[:3]
        if passt_breite(d, zeilen, schrift, B - 130) or groesse <= 36:
            break
        groesse -= 4
    y = H - PROD_UNTEN - len(zeilen) * 74
    for z in zeilen:
        d.text((66, y + 3), z, font=schrift, fill=(0, 0, 0))
        d.text((64, y), z, font=schrift, fill=WEISS)
        y += 74
    if zeile:
        d.text((64, y + 8), zeile, font=f(SANS, 38), fill=CREME)
        y += 58
    preis_pille(d, 64, y + 24, preis)
    return img


def slide_cta(titelzeile):
    img = Image.new("RGB", (B, H), INK)
    d = ImageDraw.Draw(img)
    for i in range(3):
        d.rectangle([54 + i, 54 + i, B - 54 - i, H - 54 - i], outline=GOLD)
    # 23.09.2026 (Halloween-Top-Set, Kontaktbogen): die festen Pixelwerte stammen aus 9:16 (1920). Im 4:5-Format (1350)
    # rutschte bei einem DREIzeiligen Titel «Kleiner Schweizer Shop aus Belp» an die Unterkante und «30 Tage Rückgabe»
    # aus dem Bild. Jetzt Hoehen anteilig, und die Schrift schrumpft, bis der ganze Block (Titel + 330 px Fuss) in H passt.
    d.text((B / 2, int(H * 0.245)), "L U X E S T Y L E", font=f(SANSB, 46), fill=WEISS, anchor="mm")
    d.line([(B / 2 - 150, int(H * 0.281)), (B / 2 + 150, int(H * 0.281))], fill=GOLD, width=3)
    y0 = int(H * 0.396)
    groesse = 74
    while True:
        schrift = f(SERIF, groesse)
        zeilen = umbrechen(d, titelzeile, schrift, B - 220)
        hoehe_ok = y0 + len(zeilen) * (groesse + 18) + 330 + 60 <= H
        # Prüfer 23.09. 22:58: BREITE zuerst — kein Wortteil darf ueber den Goldrahmen (x 55/1025) laufen. Passt ein Teil
        # auch nach dem Bindestrich-Umbruch nicht in B-220, schrumpft die Schrift weiter (bis 30 px) statt abzuschneiden.
        breite_ok = passt_breite(d, zeilen, schrift, B - 220)
        if (breite_ok and (hoehe_ok or groesse <= 48)) or groesse <= 30:
            break
        groesse -= 6
    y = y0
    for z in zeilen:
        d.text((B / 2, y), z, font=schrift, fill=CREME, anchor="mm")
        y += groesse + 18
    d.text((B / 2, y + 90), "luxestyle.ch", font=f(SANSB, 62), fill=GOLD, anchor="mm")
    _cta = cta_abschluss()
    if _cta:
        d.text((B / 2, y + 176), _cta, font=f(SANS, 40), fill=WEISS, anchor="mm")
    # 05.09.2026: Kundenfeedback «zu fest KI gemacht, wie Scam». Die Rabattcode-Pille war
    # exakt das Muster, das Scam-Konten fahren (Preis + Code + #fyp auf jedem Beitrag).
    # Statt Rabatt-Druck stehen hier die pruefbaren Fakten des Ladens.
    d.text((B / 2, y + 270), "Kleiner Schweizer Shop aus Belp",
           font=f(SANSB, 38), fill=WEISS, anchor="mm")
    d.text((B / 2, y + 330), "30 Tage Rückgabe · TWINT & Rechnung",
           font=f(SANS, 34), fill=CREME, anchor="mm")
    return img


def chf(p):
    return "CHF " + f"{float(p):.2f}".replace(".00", ".–")


def laden_zeile(tags=None):
    """Ehrliche Laden-Zeile statt Rabatt-Push (Kundenfeedback 05.09.: «zu fest KI, wie Scam»).
    Lieferzeit nur nennen, wenn sie fuer DIESES Produkt belegt ist (Tag ch-lager = 1–2 Werktage,
    CJ = 10–20 Werktage); bei gemischten Beitraegen steht sie auf jeder Produktseite."""
    t = {x.lower() for x in (tags or [])}
    if tags is None:
        liefer = "Lieferzeit steht auf jeder Produktseite"
    elif "ch-lager" in t:
        liefer = "Versand ab Schweizer Lager in 1–2 Werktagen"
    else:
        liefer = "Lieferung 10–20 Werktage, dafür ehrlich angeschrieben"
    return (f"Kleiner Schweizer Shop aus Belp, kein Konzern. {liefer} · "
            "30 Tage Rückgabe · TWINT oder Rechnung.\nFragen? Schreib sie in die Kommentare 👇")


def hashtags(tags):
    fest = ["#schweiz", "#luxestyle"]   # 05.09.: #fyp raus — das Massen-Tag ist ein Scam-Signal
    karte = {"beauty": "#beauty", "skincare": "#skincare", "pflege": "#selfcare",
             "haustier": "#petsoftiktok", "katze": "#katze", "hund": "#hund",
             "mode": "#outfit", "damen": "#fashion", "kueche": "#kitchenhacks",
             "gadget": "#gadgets", "tech": "#tech", "wohnen": "#interior",
             "aufbewahrung": "#ordnung", "organizer": "#ordnung",
             # 23.09.2026 Saison: Halloween-Ware traegt die Tags halloween/kuerbis/dekoration (gemessen am Bestand)
             "halloween": "#halloween", "kuerbis": "#halloweendeko", "dekoration": "#deko", "herbst": "#herbst"}
    extra = []
    for t in tags:
        h = karte.get(t.lower())
        if h and h not in extra:
            extra.append(h)
    return " ".join(fest + extra[:3])


def schreibe(slug, bilder_liste, caption, produkte):
    ordner = os.path.join(AUS, slug)
    os.makedirs(ordner, exist_ok=True)
    for alt in os.listdir(ordner):            # NEU_BAUEN: alte Slides raus, sonst bleibt ein 06.jpg neben 5 neuen liegen
        if re.fullmatch(r"\d\d\.jpg", alt):
            os.remove(os.path.join(ordner, alt))
    pfade = []
    for i, im in enumerate(bilder_liste, 1):
        p = os.path.join(ordner, f"{i:02d}.jpg")
        im.save(p, "JPEG", quality=92, optimize=True)
        pfade.append(os.path.relpath(p, ROOT))
    with open(os.path.join(ordner, "caption.txt"), "w") as fh:
        fh.write(caption + "\n")
    if NEU_BAUEN:
        # Bestehende ready-Zeile desselben Slugs ERSETZEN (Slides/Caption), keine zweite Zeile (der Poster nimmt die
        # erste ready-Zeile; eine zweite waere ein Doppelpost), keine neuen Ledger-Zeilen (Handle steht schon drin).
        with open(QUEUE, newline="") as fh:
            zeilen = list(csv.reader(fh))
        kopf, rest = zeilen[0], zeilen[1:]
        i_slug, i_st = kopf.index("slug"), kopf.index("status")
        treffer = [r for r in rest if r[i_slug] == slug and r[i_st] == "ready"]
        if len(treffer) != 1:
            raise RuntimeError(f"NEU_BAUEN {slug}: {len(treffer)} ready-Zeilen in der Queue (erwartet 1) — nichts geschrieben")
        r = treffer[0]
        r[kopf.index("slides")] = str(len(pfade))
        r[kopf.index("caption")] = caption.replace("\n", " ⏎ ")
        with open(QUEUE, "w", newline="") as fh:
            w = csv.writer(fh, lineterminator="\n")
            w.writerow(kopf); w.writerows(rest)
        return ordner, pfade
    neu = not os.path.exists(QUEUE)
    with open(QUEUE, "a", newline="") as fh:
        w = csv.writer(fh, lineterminator="\n")
        if neu:
            w.writerow(["slug", "modus", "slides", "ordner", "produkte", "caption", "status"])
        w.writerow([slug, MODUS, len(pfade), os.path.relpath(ordner, ROOT),
                    " ".join(produkte), caption.replace("\n", " ⏎ "), "ready"])
    with open(LEDGER, "a") as fh:
        for h in produkte:
            fh.write(f"{h}\t{slug}\t{MODUS}\n")
    return ordner, pfade


def _ahash(pfad):
    """8x8-Mittelwert-Hash (64 Bit). Zwei Slides mit Hamming-Abstand <= 6 zeigen dasselbe Motiv."""
    try:
        g = Image.open(pfad).convert("L").resize((8, 8), Image.LANCZOS)
        px = list(g.tobytes()); m = sum(px) / 64
        return sum((1 << i) for i, v in enumerate(px) if v >= m)
    except Exception:
        return None


def _farbe(pfad):
    """Mittlere Farbe der Bildmitte (RGB). 24.09.2026: aHash rechnet in Graustufen — das Kleid in Blau, Weinrot, Braun
    und Aprikose (gleiche Pose) galt als EIN Motiv, das Karussell hatte 2 statt 7 Produktbilder."""
    try:
        im = Image.open(pfad).convert("RGB")
        w, h = im.size
        return im.crop((w // 4, h // 4, 3 * w // 4, 3 * h // 4)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    except Exception:
        return None


def _gleich(a, b):
    """Doppel nur, wenn Form (aHash <= 6) UND Farbe (Abstand <= 12) gleich sind."""
    (ha, fa), (hb, fb) = a, b
    if ha is None or hb is None or bin(ha ^ hb).count("1") > 6:
        return False
    if fa is None or fb is None:
        return True
    return sum((x - y) ** 2 for x, y in zip(fa, fb)) ** 0.5 <= 12   # gemessen: echte Doppel 0–4, Weinrot vs. Braun 25


def bau_produkt(p, benutzt):
    # 23.09.2026 (Kontaktbogen Süssigkeitenschale): Slide 2 und 3 waren dasselbe CJ-Motiv unter zwei Dateinamen —
    # die Dateiname-Wache sieht das nicht. Deshalb mehr Bilder holen als gebraucht und nahezu gleiche (aHash <= 6)
    # auslassen; so tragen «mehrere Bilder» auch mehrere Ansichten.
    urls = bilder(p)[:SLIDES * 2 + 2]      # Doppel-Motive sind haeufig (Kuerbisschale: 12 Dateien, 6 Motive)
    tmp, hashes = [], []
    for i, u in enumerate(urls):
        if len(tmp) >= SLIDES - 1:
            break
        z = f"/tmp/_ttk_{i}.img"
        if not lade(u, z):
            continue
        h = (_ahash(z), _farbe(z))
        if any(_gleich(h, x) for x in hashes):
            print(f"      (Bild {i + 1} gleicht einem frueheren Slide — ausgelassen)")
            continue
        hashes.append(h)
        tmp.append(z)
    if len(tmp) < 3:
        return None
    preis = chf(p["priceRangeV2"]["minVariantPrice"]["amount"])
    titel = p["title"]
    gesamt = len(tmp) + 1
    slides = [slide_hook(tmp[0], KICKER, preis, titel, 1, gesamt)]
    for i, z in enumerate(tmp[1:], 2):
        slides.append(slide_produkt(z, titel, preis, i, gesamt))
    slides.append(slide_cta(titel))
    slug = re.sub(r"[^a-z0-9]+", "-", p["handle"].lower()).strip("-")  # NIE kuerzen: Slug==Handle ist die Vertragsbasis der Live-Pruefung
    cap = (f"{CAPTION_VORSPANN}{titel} · {preis}\n"
           f"{laden_zeile(p.get('tags') or [])}\n"
           f"{cta_text()}\n\n{hashtags(p.get('tags') or [])}")
    return slug, slides, cap, [p["handle"]]


def bau_top(kandidaten):
    wahl = kandidaten[:SLIDES - 2]
    if len(wahl) < 3:
        return None
    tmp = []
    for i, p in enumerate(wahl):
        z = f"/tmp/_ttk_top_{i}.img"
        if lade(bilder(p)[0], z):
            tmp.append((p, z))
    if len(tmp) < 3:
        return None
    hoechst = max(float(p["priceRangeV2"]["minVariantPrice"]["amount"]) for p, _ in tmp)
    grenze = int((int(hoechst) // 10 + 1) * 10)   # naechste Zehnerstufe, bleibt wahr
    gesamt = len(tmp) + 2
    hook = f"{len(tmp)} {TOP_WORT} unter CHF {grenze}"
    slides = [slide_hook(tmp[0][1], TOP_KICKER, str(len(tmp)),
                         f"{TOP_WORT} unter CHF {grenze}", 1, gesamt)]
    for i, (p, z) in enumerate(tmp, 2):
        slides.append(slide_produkt(
            z, p["title"], chf(p["priceRangeV2"]["minVariantPrice"]["amount"]),
            i, gesamt, zeile=f"Nr. {i - 1}"))
    slides.append(slide_cta(hook))
    tage = os.environ.get("SLUGZEIT", "")
    slug = re.sub(r"[^a-z0-9]+", "-", f"top-{len(tmp)}-unter-{grenze}-{tage}").strip("-")
    liste = "\n".join(f"{i}. {p['title']} · {chf(p['priceRangeV2']['minVariantPrice']['amount'])}"
                      for i, (p, _) in enumerate(tmp, 1))
    alle_tags = [t for p, _ in tmp for t in (p.get("tags") or [])]
    cap = (f"{CAPTION_VORSPANN}{hook} 🇨🇭\n\n{liste}\n\n"
           f"{laden_zeile()}\n{cta_text('Alles auf ')}\n\n"
           f"{hashtags(alle_tags)}")
    return slug, slides, cap, [p["handle"] for p, _ in tmp]


def main():
    prod = hole(QUELLE)
    if not prod:
        print("PAUSE: keine Produkte aus der Kollektion geholt (Shopify?)")
        return
    benutzt = schon_verwendet()
    mind = 3 if MODUS == "produkt" else 1
    frei = [p for p in prod if geeignet(p, mind) and p["handle"] not in benutzt]
    print(f"{len(prod)} in «{QUELLE}» | geeignet und noch nie beworben: {len(frei)}")
    if MAX_PREIS:
        frei = [p for p in frei if float(p["priceRangeV2"]["minVariantPrice"]["amount"]) <= MAX_PREIS]
        print(f"   MAX_PREIS {MAX_PREIS:.2f}: {len(frei)} bleiben")
    if NUR_HANDLES:
        # Vorgabe in Reihenfolge; was die Wachen nicht passiert, wird genannt (nicht erzwungen).
        if NEU_BAUEN:   # beim Neurendern ist «schon beworben» kein Ausschluss — genau diese Handles sind gemeint
            frei = [p for p in prod if geeignet(p, mind) and (not MAX_PREIS or float(p["priceRangeV2"]["minVariantPrice"]["amount"]) <= MAX_PREIS)]
        nach = {p["handle"]: p for p in frei}
        fehlt = [h for h in NUR_HANDLES if h not in nach]
        for h in fehlt:
            grund = ("nicht in der Kollektion" if not any(p["handle"] == h for p in prod)
                     else "schon beworben" if h in benutzt else "Wache (Status/Tag/Claim/Preis/Bilder)")
            print(f"   ⛔ NUR_HANDLES {h}: {grund}")
        frei = [nach[h] for h in NUR_HANDLES if h in nach]
        print(f"   NUR_HANDLES: {len(frei)} von {len(NUR_HANDLES)} vorgegebenen Handles nutzbar")
    if not frei:
        print("FERTIG: 0 Karussells gebaut (nichts Neues verfügbar)")
        return
    if DRY:
        for p in frei[:12]:
            print("   +", p["title"], chf(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                  f"({len(bilder(p))} taugliche Bilder)")
        print(f"FERTIG (DRY): {len(frei)} Kandidaten, nichts geschrieben")
        return

    gebaut = 0
    for _ in range(ANZAHL):
        if MODUS == "top":
            r = bau_top(frei)
            if not r:
                break
            frei = [p for p in frei if p["handle"] not in r[3]]
        else:
            if not frei:
                break
            r = bau_produkt(frei.pop(0), benutzt)
            if not r:
                continue
        slug, slides, cap, handles = r
        ordner, pfade = schreibe(slug, slides, cap, handles)
        gebaut += 1
        print(f"   ✔ {slug}: {len(pfade)} Slides → {os.path.relpath(ordner, ROOT)}")
    print(f"FERTIG: {gebaut} Karussells gebaut, Queue {os.path.relpath(QUEUE, ROOT)}")


if __name__ == "__main__":
    main()
