#!/usr/bin/env python3
"""bild_formate.py — Produktbild → Fassung je Plattform (Pinterest 2:3, Instagram-Feed 4:5).

ANLASS (23.09.2026, Betreiber «Bilder auf höchstem Niveau»), GEMESSEN vor dem Bau:
  - social/posts_image.csv, 65 wartende Bild-Posts: 55 quadratisch, 0 im IG-Format 4:5, 41 mit kurzer
    Seite unter 1080 px, 5 unter 600 px (u. a. 209×666, 393×394).
  - Pinterest, alle 138 Pins seit Juni (Metricool getPins, Originalbilder vermessen): 0 im Pinterest-Format
    2:3. Bild-Pins 1:1 → 5.1 Impressionen je Pin (76 Pins), 4:5 → 14.0 (27 Pins). Hochformat bekommt
    auf beiden Plattformen mehr Fläche im Feed; ein Quadrat verschenkt sie.
  - Die sechs zuletzt gepinnten Produkte (Hetzner-Quittungen + Ledger): Hauptbild 5× 1:1 (786–1448 px), 1× 0.57.

WAS ES TUT (je Produkt, nichts wird beschnitten):
  1. Hauptbild laden (EXIF-Drehung, Transparenz auf Weiss), kurze Seite < 600 px → ABGELEHNT (Hochskalieren
     macht Matsch sichtbar). Sonst Lanczos auf das Zielfeld, nach Vergrösserung leicht nachgeschärft.
  2. Motiv VOLLSTÄNDIG ins Zielfeld (contain). Die freien Streifen werden je Kante weich erweitert:
     einfarbige Kante (Freisteller, ≥96 % der Randpixel nah am Median) → exakt diese Farbe, nahtlos;
     sonst die gespiegelte Randzone, stark weichgezeichnet und nach aussen zur Mittelfarbe beruhigt.
  3. Pinterest 1000×1500: unten ein ruhiges Band (Markenfarben Anthrazit/Gold/Creme wie Titelbild):
     Produktname (max. 2 Zeilen) + «CHF xx.xx» («ab CHF …», wenn Varianten verschieden kosten).
     Keine Rabatt-/Knappheitsfloskel, kein Code, keine erfundene Eigenschaft — nur Name und Preis.
     Instagram 1080×1350: ohne Text (Preis steht in der Caption).
  4. JPEG progressiv, ≤ 300 KB (Qualität stufenweise 88 → 64), atomar geschrieben.
     Manifest social/pins/_index.tsv hält je Datei Preis, Quellbild, SHA-1 und Zeitpunkt — damit ein
     Poster nur eine Fassung nimmt, deren Preis und Bild noch dem Shop entsprechen.

AUFRUF
  python3 automation/bild_formate.py <handle> [<handle> …]         Pinterest + IG je Produkt (Shopify)
  python3 automation/bild_formate.py --url URL --name NAME [--titel T --preis 25.90]   ohne Shopify
  python3 automation/bild_formate.py --posts-ready N               IG-4:5 für die ersten N wartenden Bild-Posts
  Optionen: --formate pin,ig45 · --bogen PFAD.png (Kontaktbogen) · DRY=1 (misst und rendert im Speicher,
  schreibt nichts nach OUT_DIR) · OUT_DIR=… (Standard social/pins; IG-Fassung in OUT_DIR/ig45/)
Ausgabe: social/pins/<handle>.jpg (Pinterest), social/pins/ig45/<handle>.jpg (Instagram).
Öffentlich erst nach Push (raw.githubusercontent.com) — metricool_pinterest_pin.mjs prüft HTTP 200 + SHA-1.
"""
import argparse, csv, hashlib, io, json, os, re, sys, time, urllib.request
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
try:
    from eimer_etikette import nachlauf
except Exception:  # Etikette fehlt → nicht warten, aber weiterarbeiten
    def nachlauf(_d):
        return 0.0

DRY = os.environ.get("DRY") == "1"
OUT = os.environ.get("OUT_DIR") or os.path.join(REPO, "social", "pins")
INDEX_NAME = "_index.tsv"
SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2026-01/graphql.json"
MIN_PX = 600
MAX_BYTES = 300 * 1024
FORMATE = {"pin": (1000, 1500), "ig45": (1080, 1350)}
BAND_H = 270                      # Pinterest-Band unten; Bildfeld darüber = 1000×1230
PAD = 56
INK, GOLD, CREAM, MUTED = (27, 26, 28), (196, 154, 90), (245, 241, 234), (168, 160, 150)
F_SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
F_SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
F_FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
UA = {"User-Agent": "Mozilla/5.0 (LuxeStyle bild_formate)"}


# ---------------------------------------------------------------- Bildtext (OCR) — Prüfer 23.09.2026 22:58
# social/pins/aufblasbarer-leuchtender-fga975036.jpg trug «LIGHT-UP AIRBLOWN INFLATABLES INDOOR & OUTDOOR USE»: englischer
# Lieferantentext im Pin. GEMESSEN an allen 11 Pin-Quellbildern des Manifests: das Aufblas-Bild liest bildtext_pruefen.woerter()
# bei 1× mit 3 Wörtern (UNTER der Schwelle 4), bei 2× mit 4; alle zehn sauberen Bilder lesen 0 bei 1× UND 2×. Darum ZWEI
# Lesarten (1× und 2×, längste Kante ≤ 3200 px) und das Maximum — ab WORTGRENZE (4) wird das Bild verworfen und das nächste
# Produktbild versucht; trägt jedes Bild Text, wird das Produkt übersprungen (Vermerk social/pins/_uebersprungen.tsv).
# Jede Messung steht in social/pins/_bildtext.tsv (name, url ohne ?v=, woerter, geprueft); der Pinner liest sie, damit er für
# ein Text-Hauptbild NICHT aufs Rohbild zurückfällt. Ohne tesseract (bildtext_pruefen beendet sich beim Import mit exit 0)
# wird nichts verworfen und nichts als «sauber» eingetragen — −1 heisst unbekannt, nicht sauber.
def _ocr_laden():
    try:
        os.environ.setdefault("ZWEILESARTEN", "1")     # Maximum aus 1× und 2× — die Lesart steht in bildtext_pruefen.woerter()
        import bildtext_pruefen as bp
        return bp.woerter, int(bp.WORTGRENZE)
    except (ImportError, SystemExit, Exception):
        return None, 4


_OCR_WOERTER, WORTGRENZE = _ocr_laden()
BILDTEXT_NAME, UEBERSPRUNGEN_NAME = "_bildtext.tsv", "_uebersprungen.tsv"
BT_SPALTEN = ["name", "url", "woerter", "geprueft"]
_jetzt = lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def bildtext_lesen():
    p = os.path.join(OUT, BILDTEXT_NAME)
    if not os.path.exists(p):
        return {}
    with open(p, newline="", encoding="utf-8") as fh:
        return {r["url"]: r for r in csv.DictReader(fh, delimiter="\t")}


def bildtext_schreiben(bt):
    p = os.path.join(OUT, BILDTEXT_NAME)
    os.makedirs(OUT, exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=BT_SPALTEN, delimiter="\t", lineterminator="\n")
        w.writeheader()
        for k in sorted(bt):
            w.writerow({c: bt[k].get(c, "") for c in BT_SPALTEN})
    os.replace(tmp, p)


def bildtext_woerter(im, url, name, bt):
    """Grösste Wortzahl aus zwei Lesarten (1×, 2×); −1 = nicht messbar. Ergebnis je URL (ohne ?v=) gemerkt."""
    key = url.split("?")[0]
    if key in bt:
        try:
            return int(bt[key]["woerter"])
        except (TypeError, ValueError):
            pass
    if _OCR_WOERTER is None:
        return -1
    try:
        n = len(_OCR_WOERTER(im))
    except Exception:
        return -1
    bt[key] = {"name": name, "url": key, "woerter": str(n), "geprueft": _jetzt()}
    if not DRY:
        bildtext_schreiben(bt)
    return n


# ⚠️ BLINDER FLECK (gemessen 23.09. 23:30): Das Ersatzbild 975036_2.jpg (Verpackungskarton mit «Light-Up Airblown Inflatable
# Grim Reaper», «SUITABLE FOR OUTDOOR USE», Widmann-Logo in Schmuckschrift) liest Tesseract mit 0 Wörtern an der Quelle, 1 auf
# dem Pin. Das Tor erkennt gesetzte Textzeilen, NICHT stilisierte Packungsschrift — der Kontaktbogen (--bogen) bleibt Pflicht,
# und ein Sichtbefund gehört als Zeile in _uebersprungen.tsv (name, grund, geprueft): Produkte darin werden hier NICHT mehr
# gerendert (sonst käme der Karton beim nächsten Lauf wieder) und vom Pinner nicht gepinnt. FORCE=1 hebt das für einen Lauf auf.
def uebersprungen_lesen():
    p = os.path.join(OUT, UEBERSPRUNGEN_NAME)
    if not os.path.exists(p):
        return {}
    with open(p, newline="", encoding="utf-8") as fh:
        return {r["name"]: r for r in csv.DictReader(fh, delimiter="\t")}


def uebersprungen_merken(name, grund):
    if DRY:
        return
    p = os.path.join(OUT, UEBERSPRUNGEN_NAME)
    os.makedirs(OUT, exist_ok=True)
    neu = not os.path.exists(p)
    with open(p, "a", encoding="utf-8") as fh:
        if neu:
            fh.write("name\tgrund\tgeprueft\n")
        fh.write(f"{name}\t{grund}\t{_jetzt()}\n")


def font(pfad, px):
    try:
        return ImageFont.truetype(pfad, px)
    except OSError:
        return ImageFont.truetype(F_FALLBACK, px)


# ---------------------------------------------------------------- Shopify / Netz
def shop_token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
    if not t and os.path.exists("/tmp/cj_shop_token.txt"):
        t = open("/tmp/cj_shop_token.txt").read().strip()
    return t


def gql(query, variables=None):
    tok = shop_token()
    if not tok:
        raise SystemExit("Kein Shop-Token (/tmp/cj_shop_token.txt) → Abbruch.")
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    for versuch in range(5):
        try:
            req = urllib.request.Request(API, data=body, headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:  # Netz-Blip
            if versuch == 4:
                raise
            time.sleep(3 * (versuch + 1)); continue
        nachlauf(d)
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
            time.sleep(4 * (versuch + 1)); continue
        if d.get("errors"):
            raise RuntimeError(json.dumps(d["errors"])[:300])
        return d["data"]
    raise RuntimeError("Shopify gedrosselt")


def produkte(handles):
    """Handle → {title, status, url, min, max, bild{url,width,height}} (None = gibt es nicht)."""
    aus = {}
    for i in range(0, len(handles), 20):
        teil = handles[i:i + 20]
        felder = " ".join(
            f'p{j}: productByIdentifier(identifier:{{handle:{json.dumps(h)}}}){{ handle title status onlineStoreUrl '
            f'priceRangeV2{{ minVariantPrice{{amount}} maxVariantPrice{{amount}} }} images(first:6){{ nodes{{ url width height }} }} }}'
            for j, h in enumerate(teil))
        d = gql("query{ " + felder + " }")
        for j, h in enumerate(teil):
            p = d.get(f"p{j}")
            if not p:
                aus[h] = None; continue
            n = p["images"]["nodes"]
            aus[h] = {"title": p["title"], "status": p["status"], "url": p["onlineStoreUrl"],
                      "min": float(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                      "max": float(p["priceRangeV2"]["maxVariantPrice"]["amount"]),
                      "bild": n[0] if n else None, "bilder": n}   # bilder: Hauptbild zuerst, bis 5 Ersatzbilder (OCR-Tor)
    return aus


def laden(url):
    for versuch in range(3):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
            im = Image.open(io.BytesIO(b))
            im.load()
            return im
        except Exception:
            if versuch == 2:
                raise
            time.sleep(2 * (versuch + 1))


# ---------------------------------------------------------------- Bild
def vorbereiten(im):
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        weiss = Image.new("RGBA", im.size, (255, 255, 255, 255))
        weiss.alpha_composite(im)
        im = weiss
    return im.convert("RGB")


def rahmen_weg(im, tiefe=3, schwelle=5):
    """Schneidet 1–3 px Rahmenlinie weg, die heller/dunkler als der Rand dahinter ist (Lieferantenbilder haben oft
    eine Kante 249 über Fläche 241). Ohne diesen Schnitt zieht die Farb-Erweiterung darüber eine sichtbare Linie."""
    w, h = im.size
    if min(w, h) < 40:
        return im
    med = lambda box: ImageStat.Stat(im.crop(box)).median
    schnitt = {}
    for seite in ("oben", "unten", "links", "rechts"):
        linie = {"oben": lambda i: (0, i, w, i + 1), "unten": lambda i: (0, h - 1 - i, w, h - i),
                 "links": lambda i: (i, 0, i + 1, h), "rechts": lambda i: (w - 1 - i, 0, w - i, h)}[seite]
        innen = {"oben": (0, tiefe + 1, w, tiefe + 9), "unten": (0, h - tiefe - 9, w, h - tiefe - 1),
                 "links": (tiefe + 1, 0, tiefe + 9, h), "rechts": (w - tiefe - 9, 0, w - tiefe - 1, h)}[seite]
        ref = med(innen)
        n = 0
        for i in range(tiefe):
            if max(abs(a - b) for a, b in zip(med(linie(i)), ref)) > schwelle:
                n = i + 1
        schnitt[seite] = n
    if not any(schnitt.values()):
        return im
    return im.crop((schnitt["links"], schnitt["oben"], w - schnitt["rechts"], h - schnitt["unten"]))


def einpassen(im, bw, bh):
    w, h = im.size
    s = min(bw / w, bh / h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    # Rundung: eine Achse muss das Feld exakt füllen, sonst bleibt ein 1-px-Spalt
    if abs(nw - bw) <= 1: nw = bw
    if abs(nh - bh) <= 1: nh = bh
    out = im.resize((nw, nh), Image.LANCZOS, reducing_gap=3.0 if s < 0.5 else None)
    if s > 1.05:  # vergrössert → leicht nachschärfen
        out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
    return out, s


def kante(im, seite, d=6):
    """Median-Farbe der Randzone und Anteil der Pixel nahe daran (≥0.96 = einfarbig)."""
    w, h = im.size
    d = max(1, min(d, w // 4, h // 4))
    box = {"oben": (0, 0, w, d), "unten": (0, h - d, w, h), "links": (0, 0, d, h), "rechts": (w - d, 0, w, h)}[seite]
    zone = im.crop(box)
    zone.thumbnail((400, 400))
    px = list(zone.get_flattened_data() if hasattr(zone, "get_flattened_data") else zone.getdata())
    med = tuple(sorted(c[k] for c in px)[len(px) // 2] for k in range(3))
    nah = sum(1 for c in px if max(abs(c[k] - med[k]) for k in range(3)) <= 14) / len(px)
    return med, nah


def spiegel_streifen(im, seite, g):
    """Gespiegelte Randzone, stark weichgezeichnet, nach aussen zur Mittelfarbe beruhigt."""
    w, h = im.size
    if seite in ("oben", "unten"):
        t = min(g, h)
        z = im.crop((0, 0, w, t) if seite == "oben" else (0, h - t, w, h)).transpose(Image.FLIP_TOP_BOTTOM)
        if t < g:
            z = z.resize((w, g), Image.BILINEAR)
    else:
        t = min(g, w)
        z = im.crop((0, 0, t, h) if seite == "links" else (w - t, 0, w, h)).transpose(Image.FLIP_LEFT_RIGHT)
        if t < g:
            z = z.resize((g, h), Image.BILINEAR)
    # Unschärfe wächst mit dem Abstand zur Naht: an der Naht leicht (r=3, kein harter Schärfe-Sprung zum
    # Original), ab 45 % der Lücke voll (r≥18). Ganz aussen zusätzlich Richtung Mittelfarbe beruhigt (bis 170/255).
    leicht = z.filter(ImageFilter.GaussianBlur(3))
    stark = z.filter(ImageFilter.GaussianBlur(max(18, g // 5)))
    abstand = rampe(z.size, seite)  # 0 an der Naht → 255 ganz aussen
    z = Image.composite(stark, leicht, abstand.point(lambda v: min(255, int(v / 0.45))))
    mittel = tuple(int(v) for v in ImageStat.Stat(stark).mean)
    flach = Image.new("RGB", z.size, mittel)
    return Image.composite(flach, z, abstand.point(lambda v: int(v * 170 / 255)))


def rampe(groesse, seite):
    """Maske 0 an der Naht (dort, wo die Lücke das Motiv berührt) → 255 am äusseren Rand."""
    if seite in ("oben", "unten"):
        m = Image.linear_gradient("L").resize(groesse)  # 0 oben → 255 unten
        return m.transpose(Image.FLIP_TOP_BOTTOM) if seite == "oben" else m  # oben: Naht unten
    m = Image.linear_gradient("L").rotate(90, expand=True).resize(groesse)  # 0 links → 255 rechts (gemessen)
    return m.transpose(Image.FLIP_LEFT_RIGHT) if seite == "links" else m  # links: Naht rechts


def feld(im, bw, bh):
    """Motiv vollständig in bw×bh, Rest weich erweitert. Gibt (Bild, Protokoll) zurück."""
    fit, s = einpassen(im, bw, bh)
    fw, fh = fit.size
    x0, y0 = (bw - fw) // 2, (bh - fh) // 2
    leinwand = Image.new("RGB", (bw, bh), (255, 255, 255))
    modus = []
    luecken = []
    if fh < bh:
        luecken += [("oben", y0), ("unten", bh - fh - y0)]
    if fw < bw:
        luecken += [("links", x0), ("rechts", bw - fw - x0)]
    for seite, g in luecken:
        if g <= 0:
            continue
        med, nah = kante(fit, seite)
        if nah >= 0.96:
            block = Image.new("RGB", (fw, g) if seite in ("oben", "unten") else (g, fh), med)
            modus.append(f"{seite}=farbe")
        else:
            block = spiegel_streifen(fit, seite, g)
            modus.append(f"{seite}=spiegel")
        pos = {"oben": (x0, 0), "unten": (x0, y0 + fh), "links": (0, y0), "rechts": (x0 + fw, y0)}[seite]
        leinwand.paste(block, pos)
    leinwand.paste(fit, (x0, y0))
    return leinwand, {"skala": round(s, 3), "modus": ",".join(modus) or "voll"}


def saubere_zeile(t):
    t = re.sub(r"[\U00010000-\U0010FFFF☀-➿️‍]", "", t or "")
    return re.sub(r"\s+", " ", t).strip()


def umbrechen(draw, text, f, maxw, maxzeilen=2):
    woerter, zeilen, cur = text.split(), [], ""
    for w in woerter:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= maxw:
            cur = t
        else:
            if cur:
                zeilen.append(cur)
            cur = w
    if cur:
        zeilen.append(cur)
    passt = len(zeilen) <= maxzeilen and all(draw.textlength(z, font=f) <= maxw for z in zeilen)
    if len(zeilen) > maxzeilen:
        zeilen = zeilen[:maxzeilen]
        z = zeilen[-1]
        while z and draw.textlength(z + " …", font=f) > maxw:
            z = z.rsplit(" ", 1)[0] if " " in z else z[:-1]
        zeilen[-1] = z.rstrip(" ,·–-") + " …"
    return zeilen, passt


def preis_text(pmin, pmax):
    f = lambda x: f"{x:,.2f}".replace(",", "'")
    return f"ab CHF {f(pmin)}" if pmax - pmin >= 0.01 else f"CHF {f(pmin)}"


def gesperrt(draw, xy, text, f, fill, sp):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += draw.textlength(ch, font=f) + sp
    return x


def pinterest(im, titel, preis):
    W, H = FORMATE["pin"]
    oben, log = feld(im, W, H - BAND_H)
    bild = Image.new("RGB", (W, H), INK)
    bild.paste(oben, (0, 0))
    d = ImageDraw.Draw(bild)
    y0 = H - BAND_H
    d.line((0, y0, W, y0), fill=GOLD, width=2)
    titel = saubere_zeile(titel)
    for gr in (46, 43, 40, 37, 34):
        ft = font(F_SANS_B, gr)
        zeilen, passt = umbrechen(d, titel, ft, W - 2 * PAD)
        if passt:
            break
    fp = font(F_SANS_B, 52)
    fm = font(F_SERIF_B, 21)
    # Block = Versalhöhe Titel + weitere Zeilen + Abstand + Versalhöhe Preis, senkrecht im Band zentriert
    # (Grundlinien-Anker; die erste Fassung rechnete mit Schriftgrösse statt Versalhöhe → Preis am Rand).
    cap = lambda f: f.getbbox("H", anchor="ls")[3] - f.getbbox("H", anchor="ls")[1]
    zh, luecke = int(gr * 1.2), 40
    block = cap(ft) + (len(zeilen) - 1) * zh + luecke + cap(fp)
    y = y0 + (BAND_H - block) // 2 + cap(ft)  # erste Grundlinie
    for i, z in enumerate(zeilen):
        d.text((PAD, y + i * zh), z, font=ft, fill=CREAM, anchor="ls")
    yb = y + (len(zeilen) - 1) * zh + luecke + cap(fp)
    d.text((PAD, yb), preis, font=fp, fill=GOLD, anchor="ls")
    marke = "LUXESTYLE"
    sp = 5
    mb = sum(d.textlength(c, font=fm) + sp for c in marke) - sp
    gesperrt(d, (W - PAD - mb, yb), marke, fm, MUTED, sp)
    log["zeilen"] = len(zeilen); log["schrift"] = gr
    return bild, log


def instagram(im):
    W, H = FORMATE["ig45"]
    return feld(im, W, H)


def jpeg(bild):
    for q in (88, 85, 82, 79, 76, 72, 68, 64):
        buf = io.BytesIO()
        bild.save(buf, "JPEG", quality=q, optimize=True, progressive=True, subsampling="4:2:0")
        if buf.tell() <= MAX_BYTES:
            return buf.getvalue(), q
    return None, None


# ---------------------------------------------------------------- Manifest
def index_lesen():
    p = os.path.join(OUT, INDEX_NAME)
    if not os.path.exists(p):
        return {}
    with open(p, newline="", encoding="utf-8") as fh:
        return {(r["name"], r["format"]): r for r in csv.DictReader(fh, delimiter="\t")}


# hauptbild (23.09. abends): das Hauptbild des Shops zur Renderzeit — `bild` ist die tatsächlich genutzte Quelle (kann nach dem
# OCR-Tor ein Ersatzbild sein). Der Pinner prüft «Hauptbild getauscht?» gegen hauptbild, sonst gälte jede Ersatz-Fassung als alt.
SPALTEN = ["name", "format", "datei", "preis_min", "preis_max", "preis_text", "bild", "hauptbild", "quelle_px", "modus", "kb", "sha1", "erstellt"]


def index_schreiben(idx):
    p = os.path.join(OUT, INDEX_NAME)
    tmp = p + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=SPALTEN, delimiter="\t", lineterminator="\n")
        w.writeheader()
        for k in sorted(idx):
            w.writerow({c: idx[k].get(c, "") for c in SPALTEN})
    os.replace(tmp, p)


def schreiben(daten, rel):
    ziel = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    tmp = ziel + ".tmp"
    with open(tmp, "wb") as fh:
        fh.write(daten)
    os.replace(tmp, ziel)
    return ziel


# ---------------------------------------------------------------- Ablauf
def verarbeiten(name, bilder, titel, pmin, pmax, formate, idx, ergebnisse, bt=None):
    """`bilder`: Liste {url[,width,height]} — Hauptbild zuerst. Das erste Bild, das gross genug ist UND kein Lieferantentext
    trägt (OCR-Tor, Prüfer 23.09.), wird gerendert; die Gründe der verworfenen stehen im Log."""
    name = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-")[:120]
    bt = {} if bt is None else bt
    hauptbild = (bilder[0]["url"] if bilder else "").split("?")[0]
    im, quelle, gruende = None, None, []
    for k, b in enumerate(bilder, 1):
        u = b["url"]
        px = (b.get("width"), b.get("height")) if b.get("width") and b.get("height") else None
        if px and min(px) < MIN_PX:
            gruende.append(f"Bild {k} {px[0]}×{px[1]} < {MIN_PX} px"); continue
        try:
            kand = vorbereiten(laden(u))
        except Exception as e:
            gruende.append(f"Bild {k} nicht ladbar ({str(e)[:60]})"); continue
        if min(kand.size) < MIN_PX:
            gruende.append(f"Bild {k} {kand.size[0]}×{kand.size[1]} < {MIN_PX} px"); continue
        n = bildtext_woerter(kand, u, name, bt)
        if n >= WORTGRENZE:
            print(f"  ✗ {name}: Bild {k} trägt Text ({n} Wörter, OCR) → nächstes Bild")
            gruende.append(f"Bild {k} Text ({n} Wörter)"); continue
        im, quelle = kand, u
        if k > 1:
            print(f"  ↷ {name}: Bild {k} statt Hauptbild ({'; '.join(gruende)})")
        break
    if im is None:
        grund = "; ".join(gruende) or "kein Bild"
        status = ("bildtext" if any("Text" in g for g in gruende) else
                  "abgelehnt" if any(" px" in g for g in gruende) else "fehler")
        print(f"  ✗ {name}: übersprungen — {grund}")
        if status == "bildtext":
            uebersprungen_merken(name, grund)
        ergebnisse.append({"name": name, "status": status}); return
    im = rahmen_weg(im)  # nach der Grössenprüfung: 1–3 px Rahmen dürfen ein 600er-Bild nicht durchfallen lassen
    for fmt in formate:
        if fmt == "pin":
            if titel is None or pmin is None:
                print(f"  – {name}: Pinterest braucht Titel und Preis → übersprungen"); continue
            pt = preis_text(pmin, pmax)
            bild, log = pinterest(im, titel, pt)
            rel = f"{name}.jpg"
        else:
            bild, log = instagram(im)
            pt = preis_text(pmin, pmax) if pmin is not None else ""
            rel = f"ig45/{name}.jpg"
        daten, q = jpeg(bild)
        if not daten:
            print(f"  ✗ {name} [{fmt}]: über {MAX_BYTES // 1024} KB auch bei Qualität 64"); continue
        sha = hashlib.sha1(daten).hexdigest()[:16]
        kb = round(len(daten) / 1024)
        zeile = f"  ✓ {name} [{fmt}] {bild.size[0]}×{bild.size[1]} q{q} {kb} KB · Quelle {im.size[0]}×{im.size[1]} · ×{log['skala']} · {log['modus']}"
        if not DRY:
            schreiben(daten, rel)
            idx[(name, fmt)] = {"name": name, "format": fmt, "datei": rel, "preis_min": f"{pmin:.2f}" if pmin is not None else "",
                                "preis_max": f"{pmax:.2f}" if pmax is not None else "", "preis_text": pt,
                                "bild": quelle.split("?")[0], "hauptbild": hauptbild, "quelle_px": f"{im.size[0]}x{im.size[1]}", "modus": log["modus"],
                                "kb": str(kb), "sha1": sha, "erstellt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
        else:
            zeile += " [DRY, nicht geschrieben]"
        print(zeile)
        ergebnisse.append({"name": name, "status": "ok", "format": fmt, "bild": bild, "px": im.size, "kb": kb, "modus": log["modus"]})


def kontaktbogen(ergebnisse, pfad):
    """Alle erzeugten Fassungen nebeneinander (Breite 320 je Bild), Beschriftung darunter — zum Prüfen per Auge."""
    ok = [e for e in ergebnisse if e["status"] == "ok"]
    if not ok:
        print("Kontaktbogen: nichts zu zeigen"); return
    CW, LAB = 320, 44
    hoehe = lambda e: round(CW * e["bild"].size[1] / e["bild"].size[0])
    H = max(hoehe(e) for e in ok)
    bogen = Image.new("RGB", (len(ok) * (CW + 10) + 30, H + LAB + 20), (236, 234, 230))
    d = ImageDraw.Draw(bogen)
    f = font(F_SANS_B, 14)
    x, vorher = 20, None
    for e in ok:
        if vorher and e["name"] != vorher:
            x += 10  # Abstand zwischen Produkten
        bogen.paste(e["bild"].resize((CW, hoehe(e)), Image.LANCZOS), (x, 10))
        d.text((x, 10 + H + 6), f"{e['format']} {e['kb']} KB · {e['px'][0]}×{e['px'][1]}", font=f, fill=(40, 40, 40))
        d.text((x, 10 + H + 24), e["modus"][:44], font=f, fill=(90, 90, 90))
        x += CW + 10
        vorher = e["name"]
    bogen = bogen.crop((0, 0, x + 10, bogen.size[1]))
    bogen.save(pfad, quality=90)
    print(f"Kontaktbogen: {pfad} ({len({e['name'] for e in ok})} Motive, {len(ok)} Fassungen)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("handles", nargs="*")
    ap.add_argument("--formate", default="pin,ig45")
    ap.add_argument("--url"); ap.add_argument("--name"); ap.add_argument("--titel"); ap.add_argument("--preis", type=float)
    ap.add_argument("--posts-ready", type=int, default=0)
    ap.add_argument("--bogen")
    a = ap.parse_args()
    formate = [f for f in a.formate.split(",") if f in FORMATE]
    idx = index_lesen()
    bt = bildtext_lesen()
    erg = []
    print(f"bild_formate {'DRY ' if DRY else ''}→ {OUT} · Formate {','.join(formate)} · OCR-Tor {'aktiv' if _OCR_WOERTER else 'NICHT messbar'}")
    if a.url:
        if not a.name:
            ap.error("--url braucht --name")
        verarbeiten(a.name, [{"url": a.url}], a.titel, a.preis, a.preis, formate, idx, erg, bt)
    if a.posts_ready:
        pfad = os.path.join(REPO, "social", "posts_image.csv")
        with open(pfad, newline="", encoding="utf-8") as fh:
            zeilen = [r for r in csv.DictReader(fh) if r.get("status") == "ready"][: a.posts_ready]
        for r in zeilen:
            verarbeiten(r["id"], [{"url": r["image_url"]}], None, None, None, ["ig45"], idx, erg, bt)
    if a.handles:
        info = produkte(a.handles)
        ueb = {} if os.environ.get("FORCE") == "1" else uebersprungen_lesen()
        for h in a.handles:
            if h in ueb:
                print(f"  – {h}: übersprungen laut {UEBERSPRUNGEN_NAME} ({ueb[h].get('grund', '')[:90]}) — FORCE=1 hebt das auf")
                erg.append({"name": h, "status": "uebersprungen"}); continue
            p = info.get(h)
            if not p:
                print(f"  ✗ {h}: Produkt nicht gefunden"); erg.append({"name": h, "status": "fehlt"}); continue
            if p["status"] != "ACTIVE" or not p["url"]:
                print(f"  ✗ {h}: {p['status']}, {'ohne' if not p['url'] else 'mit'} Onlineshop → übersprungen"); erg.append({"name": h, "status": "nicht-aktiv"}); continue
            if not p["bild"]:
                print(f"  ✗ {h}: kein Bild"); erg.append({"name": h, "status": "kein-bild"}); continue
            verarbeiten(h, p["bilder"], p["title"], p["min"], p["max"], formate, idx, erg, bt)
    if not DRY and any(e["status"] == "ok" for e in erg):
        os.makedirs(OUT, exist_ok=True)
        index_schreiben(idx)
    if a.bogen:
        kontaktbogen(erg, a.bogen)
    zaehl = {}
    for e in erg:
        zaehl[e["status"]] = zaehl.get(e["status"], 0) + 1
    print("FERTIG", json.dumps(zaehl, ensure_ascii=False))


if __name__ == "__main__":
    main()
