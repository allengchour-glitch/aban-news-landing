#!/usr/bin/env python3
"""promo_montage.py — Werbe-Montage aus ECHTEN Shopify-Produktbildern (9:16, 1080x1920, 15 s, 30 fps).

Gebaut 23.09.2026 fuer die Hoodie-Session (Betreiber: «mach was mit printful eine coole webungsvideo,
oder sonstige cj hoodies»). Kein Produktvideo noetig: gemessen hatten 0 von 558 aktiven Hoodies ein
Video-Medium, also Ken-Burns auf den Produktbildern (PIL, Sub-Pixel per Image.EXTENT — ruhiger als
ffmpeg-zoompan, das auf ganze Pixel rundet und zittert).

Was das Skript garantiert:
  * Jedes Produkt wird VOR dem Rendern live bei Shopify gelesen: ACTIVE + onlineStoreUrl, Preis aus
    priceRangeV2 (nie aus dem Kopf), Bilder aus product.media. Der Anzeigename muss aus Woertern des
    Shopify-Titels bestehen (keine erfundenen Eigenschaften). Marken-/Lizenzmotive -> Abbruch.
  * Schnitte liegen auf dem Beat: Tempo + Phase werden am Musikstueck gemessen (Spektralfluss +
    Autokorrelation), Einstieg aus automation/music/_einstiege.json.
  * Text nur in der sicheren Zone 200-1440 px (overlay.py, Betreiber-Screenshot 23.09.), Preis und
    Name links der Knopfleiste (Mitte CX_FUSS).
  * Ton zweistufig auf -14 LUFS (TP -1.5), 48 kHz Stereo — wie make_reel.sh LAUTHEIT_2PASS.
  * Die Preisbehauptungen des Videos stehen als JSON im MP4 (Metadatum «comment»). `--pruefen`
    liest sie zurueck und vergleicht mit dem Live-Shop — Pflicht vor jedem Post, denn der Reel-Poster
    kann bei Sammel-Reels (ID ohne cjreel-<pid>) den Produktstatus nicht selbst pruefen.

Aufrufe:
  python3 automation/reel/promo_montage.py --variante a,b [--out-dir social/reels]   # rendern + messen
  python3 automation/reel/promo_montage.py --variante a --dry                        # pruefen + 4 Probebilder, kein MP4
  python3 automation/reel/promo_montage.py --messen social/reels/promo_hoodie_herbst_a.mp4
  python3 automation/reel/promo_montage.py --pruefen social/reels/promo_hoodie_herbst_a.mp4   # Exit 0 ok / 3 veraltet
Umgebung: SHOPIFY_ADMIN_TOKEN (sonst /tmp/cj_shop_token.txt), SHOPIFY_SHOP (au3j0y-hq.myshopify.com).
"""
import argparse, hashlib, io, json, math, os, random, re, subprocess, sys, tempfile, time, urllib.request
from datetime import datetime, timezone

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", ".."))
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(REPO, "automation"))
import overlay as ov  # noqa: E402  (Fonts, Farben, sichere Zone, wrap/spaced)
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(_d):
        return 0.0

W, H, FPS, DAUER = 1080, 1920, 30, 15.0
SHOP = os.environ.get("SHOPIFY_SHOP", "au3j0y-hq.myshopify.com")
API = "2026-01"
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
GOLD = (245, 214, 122)
CREME = (238, 228, 212)
CACHE = "/tmp/promo_montage_cache"

# ---------------------------------------------------------------- Varianten (Auswahl 23.09.2026, gemessen)
# Auswahlregeln: aktiv + im Onlineshop, >= 2 Bilder, ab CHF 29, keine Marken-/Lizenzmotive, Bild >= 560 px,
# Bild zeigt das Produkt ohne Lieferanten-Werbetext. Kontaktbogen-Pruefung per Vision (HOODIE-SESSION.md).
# «bilder» = Index in product.media (nur Bilder), Reihenfolge = Schnittfolge.
VARIANTEN = {
    "a": {
        "datei": "promo_hoodie_herbst_a.mp4",
        "musik": "luxe-lounge-sax.wav", "einstieg": 0,
        "hook": ("Herbst ist", "Hoodie-Zeit"), "emoji": "\U0001F342",
        "produkte": [
            {"handle": "relaxed-fit-hoodie-cosy-mit-fell-panel-kordelzug", "name": "Relaxed-Fit Hoodie «Cosy»", "bilder": [3, 2]},
            {"handle": "damen-hoodie-aus-nerzimitat-fell-637200", "name": "Damen Hoodie aus Nerzimitat-Fell", "bilder": [2, 0]},
            {"handle": "vielseitiger-hoodie-mit-langen-armeln-634100", "name": "Vielseitiger Hoodie mit langen Ärmeln", "bilder": [2, 0]},
            {"handle": "kapuzen-sweatshirt-im-american-streetwear-stil-637100", "name": "Kapuzen-Sweatshirt im Streetwear-Stil", "bilder": [2, 3]},
            {"handle": "recycelter-unisex-allover-hoodie-selbst-gestalten", "name": "Allover-Hoodie selbst gestalten", "bilder": [1, 0], "pod": True},
        ],
    },
    "b": {
        "datei": "promo_hoodie_herbst_b.mp4",
        "musik": "luxe-house2.wav", "einstieg": 0,
        "hook": ("Herbst ist", "Hoodie-Zeit"), "emoji": "\U0001F342",
        "produkte": [
            {"handle": "grauer-wende-hoodie-mit-reissverschluss-615700", "name": "Wende-Hoodie mit Reissverschluss", "bilder": [3, 0]},
            {"handle": "heavyweight-hoodie-mit-verstarkter-kapuze-639000", "name": "Heavyweight Hoodie mit verstärkter Kapuze", "bilder": [2, 3]},
            {"handle": "loose-fit-hoodie-mit-sternenhimmel-muster-611500", "name": "Loose-Fit Hoodie mit Sternenhimmel-Muster", "bilder": [2, 0]},
            {"handle": "casual-sport-hoodie-616800", "name": "Casual Sport-Hoodie", "bilder": [2, 0]},
        ],
    },
}

VARIANTEN["kuscheltiere"] = {
    # 23.09.2026, Betreiber «probiere mal mit stimme video zu machen für fortura spielsachen»: Fortura-Plüschtiere ab CH-Lager
    # (Tags ch-lager/schweiz-versand; Produktseite sagt «Versand aus der Schweiz – Lieferung in nur 1–2 Werktagen»).
    "datei": "promo_kuscheltiere_a.mp4",
    "musik": "luxe-orchestra.wav", "einstieg": 0,
    "hook": ("Kuschelzeit für", "Klein & Gross"), "emoji": "\U0001F9F8", "gattung": "Plüschtiere", "deko": "sterne",
    "titel": "LuxeStyle Kuscheltiere",
    "stimme": {"text": "Kuschelzeit! Berner Sennenhund, Hochlandrind, Waschbär, Alpaka und Adler – ab einundzwanzig Franken, "
                       "aus dem Schweizer Lager in ein bis zwei Werktagen bei dir. Jetzt bei LuxeStyle.",
               "stimme": "de-CH-JanNeural", "start": 0.7},
    "produkte": [
        {"handle": "liegender-plusch-berner-sennenhund-fga88255", "name": "Liegender Plüsch Berner Sennenhund", "bilder": [0, 1]},
        {"handle": "plusch-hochlandrind-fga59641", "name": "Plüsch Hochlandrind", "bilder": [0, 1]},
        {"handle": "plusch-waschbar-fga41332", "name": "Plüsch Waschbär", "bilder": [0, 2]},
        {"handle": "plusch-alpaka-fga41331", "name": "Plüsch Alpaka", "bilder": [0]},
        {"handle": "plusch-adler-fga85734", "name": "Plüsch Adler", "bilder": [0]},
    ],
}

MARKE = re.compile(r"\b(nike|adidas|puma|supreme|gucci|louis ?vuitton|chanel|dior|balenciaga|off[- ]?white|st[uü]ssy|carhartt|"
                   r"north face|champion|jordan|disney|marvel|anime|naruto|one piece|pok[eé]mon|hello kitty|star wars|harry potter|"
                   r"batman|spider-?man|mickey|sanrio|kuromi|barbie|nasa|bape|fear of god|palm angels|chrome hearts|hellstar|"
                   r"sp5der|corteiz|trapstar|nba|nfl|ferrari|bmw|porsche|playboy)\b", re.I)


# ---------------------------------------------------------------- Shopify
def token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
    if not t and os.path.exists("/tmp/cj_shop_token.txt"):
        t = open("/tmp/cj_shop_token.txt").read().strip()
    if not t:
        sys.exit("Kein Shopify-Token (SHOPIFY_ADMIN_TOKEN oder /tmp/cj_shop_token.txt) — nichts gerendert.")
    return t


def gql(q, v=None):
    tok, err = token(), None
    for a in range(6):
        try:
            req = urllib.request.Request(f"https://{SHOP}/admin/api/{API}/graphql.json",
                                         data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                         headers={"Content-Type": "application/json", "X-Shopify-Access-Token": tok})
            d = json.load(urllib.request.urlopen(req, timeout=60))
            nachlauf(d)
            if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
                time.sleep(3 * (a + 1)); continue
            if d.get("errors"):
                raise RuntimeError(json.dumps(d["errors"])[:300])
            return d["data"]
        except Exception as e:  # Netz/DNS-Blips
            err = e; time.sleep(2 * (a + 1))
    raise RuntimeError(f"Shopify nicht erreichbar: {err}")


Q_PRODUKT = """query($h:String!){ productByHandle(handle:$h){ id title handle status onlineStoreUrl tags
  priceRangeV2{ minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode} }
  media(first:40){ nodes{ mediaContentType ... on MediaImage{ image{ url width height } } } } } }"""


def preis_text(p):
    lo = float(p["priceRangeV2"]["minVariantPrice"]["amount"]); hi = float(p["priceRangeV2"]["maxVariantPrice"]["amount"])
    return (f"CHF {lo:.2f}" if abs(hi - lo) < 0.005 else f"ab CHF {lo:.2f}"), lo, hi


def norm(s):
    s = s.lower().replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")
    return re.sub(r"[«»·–—,.:;!?()\"']", " ", s)


def name_aus_titel(name, titel):
    """Jedes Wort des Anzeigenamens muss im Shopify-Titel stehen (Teilwort genuegt: «Streetwear-Stil» in
    «American Streetwear-Stil»). Verhindert erfundene Eigenschaften im Video."""
    t = norm(titel)
    fehlt = [w for w in norm(name).split() if len(w) > 1 and w not in t]
    return fehlt


def lade_produkte(var, streng=True):
    produkte, fehler = [], []
    for cfg in var["produkte"]:
        p = gql(Q_PRODUKT, {"h": cfg["handle"]})["productByHandle"]
        if not p:
            fehler.append(f"{cfg['handle']}: existiert nicht"); continue
        if p["status"] != "ACTIVE" or not p["onlineStoreUrl"]:
            fehler.append(f"{cfg['handle']}: nicht kaufbar (status {p['status']}, onlineStoreUrl {'ja' if p['onlineStoreUrl'] else 'nein'})")
        if MARKE.search(p["title"] + " " + " ".join(p["tags"])):
            fehler.append(f"{cfg['handle']}: Marken-/Lizenzwort im Titel/Tags")
        fehlt = name_aus_titel(cfg["name"], p["title"])
        if fehlt:
            fehler.append(f"{cfg['handle']}: Anzeigename-Woerter nicht im Titel: {fehlt}")
        bilder = [m["image"] for m in p["media"]["nodes"] if m["mediaContentType"] == "IMAGE" and m.get("image")]
        wahl = []
        for i in cfg["bilder"]:
            if i < len(bilder) and min(bilder[i]["width"], bilder[i]["height"]) >= 560:
                wahl.append(bilder[i])
            else:
                fehler.append(f"{cfg['handle']}: Bild {i} fehlt oder < 560 px")
        pt, lo, hi = preis_text(p)
        produkte.append({**cfg, "id": p["id"], "titel": p["title"], "url": p["onlineStoreUrl"], "preis": pt,
                         "preis_min": lo, "preis_max": hi, "bild_urls": [b["url"] for b in wahl]})
    if fehler and streng:
        for f in fehler:
            print("  ⛔", f)
        sys.exit(3)
    return produkte, fehler


def bild(url):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".img")
    if not (os.path.exists(f) and os.path.getsize(f) > 2000):
        err = None
        for a in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "luxestyle-promo/1"}), timeout=60).read()
                open(f, "wb").write(data); break
            except Exception as e:
                err = e; time.sleep(2 * (a + 1))
        else:
            raise RuntimeError(f"Bild nicht ladbar: {url[:80]} ({err})")
    return ImageOps.exif_transpose(Image.open(f)).convert("RGB")


# ---------------------------------------------------------------- Musik + Beat
def musik_plan(var):
    datei = os.path.join(REPO, "automation", "music", var["musik"])
    ein = json.load(open(os.path.join(REPO, "automation", "music", "_einstiege.json")))
    info = ein.get(var["musik"], {})
    starts = [s for s in info.get("einstiege", [0.0]) if s + DAUER + 0.6 <= info.get("dauer", 1e9)] or [0.0]
    start = starts[min(var.get("einstieg", 0), len(starts) - 1)]
    sr = 22050
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(DAUER), "-i", datei, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop, n = 256, 1024
    fr = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    S = np.log1p(10 * np.abs(np.fft.rfft(fr, axis=1)))
    flux = np.concatenate([[0], np.maximum(0, np.diff(S, axis=0)).sum(axis=1)])
    flux = np.maximum(flux - np.convolve(flux, np.ones(16) / 16, "same"), 0)
    fps = sr / hop
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    idx = np.arange(len(ac))
    bpm = max(np.arange(90, 165, 0.25), key=lambda b: sum(np.interp(60 / b * fps * k, idx, ac) for k in (1, 2, 4)))
    per = 60 / bpm
    tl = len(flux) / fps
    phase = max(np.arange(0, per, 0.005), key=lambda ph: np.interp(np.arange(ph, tl, per) * fps, np.arange(len(flux)), flux).sum())
    # Musik so anschneiden, dass ein Beat genau auf t=0 faellt → alle Schnitte liegen auf k*per
    return {"datei": datei, "name": var["musik"], "einstieg": float(start), "start": float(start + phase), "bpm": float(bpm), "periode": float(per)}


def zeitplan(n_prod, per, bilder_je):
    intro_beats = max(3, round(1.95 / per))
    frei = DAUER - 2.6 - intro_beats * per
    bpp = max(3, int(frei / per / n_prod))
    szenen = [("intro", 0.0, intro_beats * per, {})]
    for k in range(n_prod):
        b0 = intro_beats + k * bpp
        t0, t1 = b0 * per, (b0 + bpp) * per
        schalt = [t0] + ([(b0 + math.ceil(bpp / 2)) * per] if bilder_je[k] > 1 else [])
        szenen.append(("produkt", t0, t1, {"k": k, "bildwechsel": schalt}))
    szenen.append(("outro", (intro_beats + n_prod * bpp) * per, DAUER, {}))
    return szenen


# ---------------------------------------------------------------- Grafik-Bausteine
def ease(u):
    u = min(1.0, max(0.0, u)); return 1 - (1 - u) ** 3


def verlauf():
    y = np.linspace(0, 1, H)[:, None]
    oben, unten = np.array([34, 20, 14]), np.array([92, 44, 18])
    arr = np.zeros((H, W, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = oben[c] + (unten[c] - oben[c]) * (y[:, 0] ** 1.3)[:, None]
    # Vignette
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.7)) ** 2)
    arr *= np.clip(1.15 - 0.55 * d, 0.45, 1.1)[:, :, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")


def hintergrund(basis, src):
    bl = ImageOps.fit(src, (W // 4, H // 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10)).resize((W, H), Image.BILINEAR)
    bl = Image.eval(bl, lambda v: int(v * 0.5))
    return Image.blend(basis.convert("RGB"), bl, 0.38).convert("RGBA")


def runde_maske(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius=r * 2, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def schatten(w, h, r, blur=26, alpha=150):
    pad = blur * 3
    s = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((pad, pad + 14, pad + w, pad + h + 14), radius=r, fill=(0, 0, 0, alpha))
    return s.filter(ImageFilter.GaussianBlur(blur)), pad


def emoji_bild(e, hoehe):
    f = ImageFont.truetype(EMOJI_FONT, 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((8, 8), e, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    return im.resize((max(1, int(im.width * hoehe / im.height)), hoehe), Image.LANCZOS)


def blatt_gezeichnet(w, h, farbe):
    S = 4; Wb, Hb = w * S, h * S
    b = Image.new("RGBA", (Wb, Hb), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    pts = []
    for k in range(0, 181, 3):
        t = math.radians(k)
        pts.append((Wb / 2 + math.sin(t) * Wb * 0.42 * (1 - 0.15 * math.cos(t)), Hb * 0.05 + (1 - math.cos(t)) / 2 * Hb * 0.85))
    pts += [(Wb - x, y) for x, y in reversed(pts)]
    d.polygon(pts, fill=farbe + (255,))
    dk = tuple(int(c * 0.68) for c in farbe) + (255,)
    d.line([(Wb / 2, Hb * 0.05), (Wb / 2, Hb * 0.98)], fill=dk, width=S * 2)
    for k in range(1, 5):
        y0 = Hb * (0.18 + k * 0.15)
        d.line([(Wb / 2, y0), (Wb / 2 - Wb * 0.28, y0 - Hb * 0.1)], fill=dk, width=S)
        d.line([(Wb / 2, y0), (Wb / 2 + Wb * 0.28, y0 - Hb * 0.1)], fill=dk, width=S)
    return b.resize((w, h), Image.LANCZOS)


def tint(im, faktor):
    r, g, b, a = im.split()
    return Image.merge("RGBA", tuple(ch.point(lambda v, f=f: int(min(255, v * f))) for ch, f in zip((r, g, b), faktor)) + (a,))


class Laub:
    """Fallende Herbstblaetter, durchgehend ueber alle Schnitte (globale Zeit) — Kontinuitaet statt Diashow."""

    def __init__(self, seed, art="laub"):
        rnd = random.Random(seed)
        if art == "sterne":   # 23.09.: Kuscheltiere — Funkeln statt Herbstlaub
            stern, funkel = emoji_bild("\u2B50", 100), emoji_bild("\u2728", 100)
            sprites = [stern, funkel, tint(funkel, (1.0, 0.95, 0.75)), tint(stern, (1.0, 0.9, 0.8))]
        else:
            ahorn = emoji_bild("\U0001F341", 100)
            sprites = [ahorn, tint(ahorn, (0.85, 0.62, 0.5)), tint(ahorn, (1.0, 1.05, 0.7)),
                       blatt_gezeichnet(64, 96, (214, 92, 32)), blatt_gezeichnet(64, 96, (186, 58, 28)),
                       blatt_gezeichnet(64, 96, (232, 150, 40)), blatt_gezeichnet(64, 96, (150, 70, 30))]
        self.blaetter = []
        for i in range(17):
            vorne = i >= 13
            sp = rnd.choice(sprites)
            gr = rnd.uniform(44, 64) if vorne else rnd.uniform(30, 58)
            sp = sp.resize((max(8, int(sp.width * gr / sp.height)), int(gr)), Image.LANCZOS)
            if not vorne:
                sp = sp.filter(ImageFilter.GaussianBlur(rnd.uniform(0.6, 2.2)))
            a = sp.split()[3].point(lambda v, k=(0.92 if vorne else rnd.uniform(0.45, 0.7)): int(v * k))
            sp.putalpha(a)
            self.blaetter.append({"sp": sp, "vorne": vorne, "x0": rnd.uniform(-40, W + 40), "y0": rnd.uniform(0, H + 240),
                                  "vy": rnd.uniform(110, 190) if vorne else rnd.uniform(60, 130),
                                  "amp": rnd.uniform(25, 70), "f": rnd.uniform(0.25, 0.6), "ph": rnd.uniform(0, 6.28),
                                  "rot0": rnd.uniform(0, 360), "vrot": rnd.uniform(-90, 90)})

    def zeichne(self, img, t, vorne):
        for b in self.blaetter:
            if b["vorne"] != vorne:
                continue
            y = (b["y0"] + b["vy"] * t) % (H + 240) - 120
            x = b["x0"] + b["amp"] * math.sin(2 * math.pi * b["f"] * t + b["ph"])
            sp = b["sp"].rotate(b["rot0"] + b["vrot"] * t, expand=True, resample=Image.BICUBIC)
            ix, iy = int(x - sp.width / 2), int(y - sp.height / 2)
            if -sp.width < ix < W and -sp.height < iy < H:
                ov_alpha(img, sp, ix, iy)


def ov_alpha(dst, src, x, y):
    """alpha_composite mit Clipping (PIL verlangt dest innerhalb des Bildes)."""
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(dst.width, x + src.width), min(dst.height, y + src.height)
    if x1 <= x0 or y1 <= y0:
        return
    dst.alpha_composite(src.crop((x0 - x, y0 - y, x1 - x, y1 - y)), (x0, y0))


def kenburns(src, groesse, u, richtung, punch=0.0, fokus_y=0.42):
    """Quadratischer Ausschnitt mit weichem Zoom/Pan (Sub-Pixel). u in [0,1], punch = kurzer Zoom-Stoss am Schnitt."""
    sw, sh = src.size
    seite = min(sw, sh)
    z = 1.0 + 0.075 * (u if richtung % 2 == 0 else 1 - u) + punch
    c = seite / z
    cx = sw / 2 + (0.03 * seite * (u - 0.5) * (1 if richtung % 3 else -1))
    cy = (sh / 2 if sh <= sw else sh * fokus_y + (seite / 2) * (1 - 2 * fokus_y)) + 0.02 * seite * (u - 0.5)
    cx = min(max(cx, c / 2), sw - c / 2); cy = min(max(cy, c / 2), sh - c / 2)
    return src.transform((groesse, groesse), Image.EXTENT, (cx - c / 2, cy - c / 2, cx + c / 2, cy + c / 2), resample=Image.BICUBIC)


def font(p, s):
    return ImageFont.truetype(p, s)


def text_breite(d, s, f):
    return d.textlength(s, font=f)


# ---------------------------------------------------------------- Szenen-Ebenen (einmal gerendert)
KARTE = 820
KX, KY = (W - KARTE) // 2, 350          # Karte 350..1170, Fussfeld 1180..1440 (sichere Zone)
FUSS_Y = 1180


def kopfleiste(n=None, gesamt=None):
    im = Image.new("RGBA", (W, 130), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 130), fill=(18, 12, 8, 150))
    tmp = Image.new("RGBA", (W, 130), (0, 0, 0, 0)); ov_spaced(ImageDraw.Draw(tmp), 26, "LUXESTYLE", font(ov.F_SERIF, 44))
    im.alpha_composite(tmp)
    d.rectangle((W / 2 - 60, 92, W / 2 + 60, 96), fill=GOLD + (255,))
    if n is not None:
        f = font(ov.F_BOLD, 28); s = f"{n}/{gesamt}"
        tw = d.textlength(s, font=f)
        d.rounded_rectangle((W - 60 - tw - 28, 42, W - 60, 88), radius=23, outline=GOLD + (255,), width=2)
        d.text((W - 60 - tw - 14, 48), s, font=f, fill=GOLD + (255,))
    return im


def ov_spaced(d, y, s, f, sp=8):
    w = sum(d.textlength(ch, font=f) + sp for ch in s) - sp
    x = (W - w) / 2
    for ch in s:
        d.text((x + 2, y + 3), ch, font=f, fill=(0, 0, 0, 150)); d.text((x, y), ch, font=f, fill=(255, 255, 255, 255))
        x += d.textlength(ch, font=f) + sp


def fussfeld(p):
    im = Image.new("RGBA", (W, 1440 - FUSS_Y), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, im.height), fill=(18, 12, 8, 175))
    d.rectangle((ov.CX_FUSS - 100, 14, ov.CX_FUSS + 100, 18), fill=GOLD + (255,))
    fT = font(ov.F_BOLD, 46)
    zeilen = ov.wrap(d, p["name"], fT, 800, 2)
    y = 30 if len(zeilen) == 2 else 52
    for z in zeilen:
        ov.text_cx(d, ov.CX_FUSS, y, z, fT, (255, 255, 255, 255)); y += 56
    fP = font(ov.F_BOLD, 68)
    ov.text_cx(d, ov.CX_FUSS, y + 6, p["preis"], fP, GOLD + (255,))
    return im, zeilen


def alpha_stufen(im, n=7):
    a = im.split()[3]
    out = []
    for i in range(1, n + 1):
        k = ease(i / n)
        c = im.copy(); c.putalpha(a.point(lambda v, k=k: int(v * k))); out.append(c)
    return out


def intro_ebene(var, produkte, grund):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    z1, z2 = var["hook"]
    f1 = font(ov.F_SERIF, 92)
    ov.text_c(d, 392, z1, f1, (255, 255, 255, 255))
    em_h = 104
    em = emoji_bild(var["emoji"], em_h)
    gr = 124
    while True:
        f2 = font(ov.F_BOLD, gr)
        breite = d.textlength(z2, font=f2) + 18 + em.width
        if breite <= 940 or gr <= 80:
            break
        gr -= 4
    x = (W - breite) / 2
    d.text((x + 3, 505 + 4), z2, font=f2, fill=(0, 0, 0, 170)); d.text((x, 505), z2, font=f2, fill=GOLD + (255,))
    im.alpha_composite(em, (int(x + d.textlength(z2, font=f2) + 18), 505 + (gr - em_h) // 2 + 8))
    # «ab» statt Spanne: die Obergrenze kaeme aus Uebergroessen (POD 2XL+ CHF 105.90) und wirkte wie der Normalpreis
    lo = min(p["preis_min"] for p in produkte)
    unter = f"{len(produkte)} {var.get('gattung', 'Hoodies')} ab CHF {lo:.2f}"
    ov.text_c(d, 682, unter, font(ov.F_REG, 40), CREME + (255,))
    return im


def outro_ebenen(produkte, bilder0):
    zeilen = []
    def zeile(y, s, f, farbe, schatten=True):
        im = Image.new("RGBA", (W, f.size + 30), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        ov.text_c(d, 6, s, f, farbe + (255,), shadow=schatten); zeilen.append((y, im))
    zeile(420, "Gratis Versand", font(ov.F_BOLD, 80), (255, 255, 255))
    zeile(520, "ab CHF 50", font(ov.F_BOLD, 112), GOLD)
    zeile(690, "luxestyle.ch", font(ov.F_SERIF, 84), (255, 255, 255))
    zeile(800, "30 Tage Rückgabe · TWINT · Klarna", font(ov.F_REG, 38), CREME, False)
    # «Link in Bio» mit Emoji
    f = font(ov.F_BOLD, 44); em = emoji_bild("\U0001F517", 44)
    im = Image.new("RGBA", (W, 80), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    s = "Link in Bio"; tw = d.textlength(s, font=f); x = (W - (tw + 14 + em.width)) / 2
    im.alpha_composite(em, (int(x), 14)); d.text((x + em.width + 14 + 2, 12), s, font=f, fill=(0, 0, 0, 150))
    d.text((x + em.width + 14, 10), s, font=f, fill=GOLD + (255,))
    zeilen.append((868, im))
    # Mosaik der gezeigten Produkte (links der Knopfleiste: x <= 920)
    n = len(bilder0); gap = 14
    t = int(min(200, (880 - gap * (n - 1)) / n))
    x0 = int(ov.CX_FUSS - (n * t + (n - 1) * gap) / 2)
    kacheln = []
    m = runde_maske(t, t, 18)
    for i, b in enumerate(bilder0):
        k = kenburns(b, t, 0.5, 0).convert("RGBA"); k.putalpha(m)
        kacheln.append((x0 + i * (t + gap), 1040, k))
    return zeilen, kacheln, t


# ---------------------------------------------------------------- Stimme (23.09.2026)
def stimme_rendern(var, tmp):
    """Sprecherstimme nur ueber Azure (Werbelizenz) via reel/voiceover.py. Kein Schluessel → Video ohne Stimme,
    laut gemeldet. Die Stimme muss VOR dem Videoende enden (DAUER - start - 0.6), sonst Abbruch statt Abschneiden."""
    s = var.get("stimme")
    if not s:
        return None
    if not os.environ.get("AZURE_SPEECH_KEY") and os.path.exists("/tmp/azure_speech.env"):
        for z in open("/tmp/azure_speech.env"):
            if "=" in z and not z.startswith("#"):
                k, v = z.strip().split("=", 1); os.environ.setdefault(k, v)
    if not os.environ.get("AZURE_SPEECH_KEY"):
        print("   ⚠️ Stimme gewuenscht, aber kein AZURE_SPEECH_KEY → ohne Stimme"); return None
    wav = os.path.join(tmp, "stimme.wav")
    env = {**os.environ, "STIMME_MOTOR": "azure", "STIMME_PIP": "0"}
    r = subprocess.run([sys.executable, os.path.join(HIER, "voiceover.py"), "--out", wav, "--text", s["text"], "--motor", "azure",
                        "--stimme", s.get("stimme", "de-CH-JanNeural"), "--max", str(DAUER)], capture_output=True, text=True, env=env)
    try:
        j = json.loads(r.stdout.strip().split("\n")[-1])
    except Exception:
        j = {"ok": False, "fehler": (r.stdout + r.stderr)[-300:]}
    if not j.get("ok"):
        print(f"   ⚠️ Stimme fehlgeschlagen ({str(j.get('fehler'))[:120]}) → ohne Stimme"); return None
    dauer = float(j.get("dauer") or 0)
    if dauer + float(s.get("start", 0.9)) > DAUER - 0.6:
        sys.exit(f"   ⛔ Stimme zu lang: {dauer:.1f} s + Start {s.get('start', 0.9)} s > {DAUER - 0.6:.1f} s — Text kuerzen")
    print(f"   🎙 Stimme {j.get('stimme')} {dauer:.1f} s, {j.get('lufs')} LUFS")
    return wav


# ---------------------------------------------------------------- Renderer
def render(var_name, var, out_dir, dry=False, probe_dir=None):
    print(f"── Variante {var_name}: {var['datei']}")
    produkte, _ = lade_produkte(var)
    for p in produkte:
        print(f"   ✓ {p['preis']:>14}  {p['name']}  ({p['url']})")
    mu = musik_plan(var)
    print(f"   ♪ {mu['name']} ab {mu['start']:.2f} s (Einstieg {mu['einstieg']}), {mu['bpm']:.2f} BPM, Beat {mu['periode']:.3f} s")
    szenen = zeitplan(len(produkte), mu["periode"], [len(p["bild_urls"]) for p in produkte])
    for s in szenen:
        print(f"   {s[1]:5.2f}–{s[2]:5.2f} s  {s[0]}" + (f" #{s[3]['k'] + 1} Schnitte {[round(x, 2) for x in s[3]['bildwechsel']]}" if s[0] == "produkt" else ""))

    # Quellen + Ebenen
    quellen = [[bild(u) for u in p["bild_urls"]] for p in produkte]
    grund = verlauf()
    bgs = [hintergrund(grund, q[0]) for q in quellen]
    maske = runde_maske(KARTE, KARTE, 34)
    sch, pad = schatten(KARTE, KARTE, 34)
    rahmen = Image.new("RGBA", (KARTE, KARTE), (0, 0, 0, 0))
    ImageDraw.Draw(rahmen).rounded_rectangle((1, 1, KARTE - 2, KARTE - 2), radius=34, outline=GOLD + (200,), width=3)
    koepfe = [kopfleiste(i + 1, len(produkte)) for i in range(len(produkte))]
    kopf0 = kopfleiste()
    fuesse = []
    for p in produkte:
        f, zl = fussfeld(p)
        if any(z.endswith("…") for z in zl):
            sys.exit(f"   ⛔ Name passt nicht in 2 Zeilen: {p['name']}")
        fuesse.append(alpha_stufen(f))
    intro = intro_ebene(var, produkte, grund)
    fan = []
    for i, (q, rot, cx, cy) in enumerate(zip([quellen[0][0], quellen[1][0], quellen[2 % len(quellen)][0]], (-8, 8, 0), (330, 750, 540), (1080, 1080, 1020))):
        k = kenburns(q, 430, 0.5, 0).convert("RGBA"); k.putalpha(runde_maske(430, 430, 26))
        rr = Image.new("RGBA", (430, 430), (0, 0, 0, 0)); ImageDraw.Draw(rr).rounded_rectangle((1, 1, 428, 428), radius=26, outline=GOLD + (220,), width=3)
        k.alpha_composite(rr)
        s2, p2 = schatten(430, 430, 26, 18, 160); s2.alpha_composite(k, (p2, p2))
        fan.append((s2.rotate(rot, expand=True, resample=Image.BICUBIC), cx, cy, rot))
    oz, okacheln, okt = outro_ebenen(produkte, [q[0] for q in quellen])
    laub = Laub(var_name, var.get("deko", "laub"))

    def frame(t):
        typ, t0, t1, info = next(s for s in szenen if s[1] <= t < s[2] or s is szenen[-1])
        if typ == "intro":
            img = grund.copy(); laub.zeichne(img, t, False)
            u = t / max(0.01, t1)
            for j in (0, 1, 2):  # mittlere Karte zuletzt (oben)
                sp, cx, cy, rot = fan[j]
                dx = (-1 if rot < 0 else 1 if rot > 0 else 0) * 26 * ease(u)
                dy = -14 * math.sin(math.pi * u) - (10 * ease(u) if rot == 0 else 0)
                ov_alpha(img, sp, int(cx + dx - sp.width / 2), int(cy + dy - sp.height / 2))
            img.alpha_composite(intro); img.alpha_composite(kopf0, (0, ov.KOPF_Y))
            laub.zeichne(img, t, True)
            return img
        if typ == "outro":
            img = grund.copy(); laub.zeichne(img, t, False)
            dt = t - t0
            for i, (y, z) in enumerate(oz):
                st = ease((dt - i * 0.09) / 0.22)
                if st > 0:
                    zz = z if st >= 1 else z.copy()
                    if st < 1:
                        zz.putalpha(z.split()[3].point(lambda v, k=st: int(v * k)))
                    ov_alpha(img, zz, 0, int(y + 26 * (1 - st)))
            for i, (x, y, k) in enumerate(okacheln):
                st = ease((dt - 0.25 - i * 0.07) / 0.25)
                if st > 0:
                    kk = k if st >= 1 else k.copy()
                    if st < 1:
                        kk.putalpha(k.split()[3].point(lambda v, s=st: int(v * s)))
                    ov_alpha(img, kk, x, int(y + 40 * (1 - st)))
            img.alpha_composite(kopf0, (0, ov.KOPF_Y))
            laub.zeichne(img, t, True)
            return img
        k = info["k"]; wechsel = info["bildwechsel"]
        bi = max(i for i, x in enumerate(wechsel) if x <= t + 1e-6)
        b0 = wechsel[bi]; b1 = wechsel[bi + 1] if bi + 1 < len(wechsel) else t1
        img = bgs[k].copy(); laub.zeichne(img, t, False)
        u = (t - b0) / max(0.01, b1 - b0)
        dts = t - b0
        punch = 0.06 * (1 - ease(dts / 0.22)) if dts < 0.22 else 0.0
        karte = kenburns(quellen[k][bi], KARTE, u, k * 2 + bi, punch).convert("RGBA")
        karte.putalpha(maske); karte.alpha_composite(rahmen)
        img.alpha_composite(sch, (KX - pad, KY - pad)); img.alpha_composite(karte, (KX, KY))
        img.alpha_composite(koepfe[k], (0, ov.KOPF_Y))
        stufe = fuesse[k][min(len(fuesse[k]) - 1, int((t - t0) * FPS))]
        yoff = int(22 * (1 - ease((t - t0) / 0.23)))
        ov_alpha(img, stufe, 0, FUSS_Y + yoff)
        laub.zeichne(img, t, True)
        return img

    manifest = {"v": 1, "variante": var_name, "erstellt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "musik": {"datei": mu["name"], "start": round(mu["start"], 3), "bpm": round(mu["bpm"], 2)},
                "produkte": [{"handle": p["handle"], "id": p["id"].rsplit("/", 1)[1], "name": p["name"], "preis": p["preis"],
                              "pod": bool(p.get("pod"))} for p in produkte]}

    if dry:
        probe_dir = probe_dir or os.path.join(tempfile.gettempdir(), "promo_montage_dry")
        os.makedirs(probe_dir, exist_ok=True)
        zeiten = [0.0, szenen[1][1] + 0.5, szenen[len(szenen) // 2][1] + 0.9, DAUER - 0.5]
        for tt in zeiten:
            f = os.path.join(probe_dir, f"{var_name}_{tt:05.2f}.png"); frame(tt).convert("RGB").save(f); print("   Probe:", f)
        t0 = time.time(); frame(szenen[1][1] + 0.3); print(f"   Renderzeit je Bild ~{(time.time() - t0) * 1000:.0f} ms")
        print("   [DRY] kein MP4 geschrieben. Manifest:", json.dumps(manifest, ensure_ascii=False)[:300])
        return None

    os.makedirs(out_dir, exist_ok=True)
    ziel = os.path.join(out_dir, var["datei"])
    tmp = tempfile.mkdtemp(prefix="promo_")
    # Ton: Anschnitt auf Beat, Ein-/Ausblenden, zweistufig auf -14 LUFS (TP -1.5), 48 kHz Stereo
    roh, norm_wav = os.path.join(tmp, "mix.wav"), os.path.join(tmp, "mixn.wav")
    musik_af = f"aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.04,afade=t=out:st={DAUER - 1.4:.2f}:d=1.4,apad"
    stimme_wav = stimme_rendern(var, tmp)
    if stimme_wav:
        # Musik unter der Stimme absenken (Sidechain-Kompressor, gesteuert von der Stimme), dann beide mischen.
        # Die Stimme wird zweimal gebraucht (Steuersignal + Mischung) → asplit. Erst danach die gewohnte -14-LUFS-Stufe.
        st = max(0.0, float(var["stimme"].get("start", 0.9)))
        fc = (f"[0:a]{musik_af}[m];"
              f"[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(st * 1000)}|{int(st * 1000)},apad,volume=1.6,asplit=2[v1][v2];"
              f"[m][v1]sidechaincompress=threshold=0.035:ratio=7:attack=12:release=420:makeup=1:level_sc=1[md];"
              f"[md][v2]amix=inputs=2:duration=first:normalize=0[out]")
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{mu['start']:.3f}", "-t", f"{DAUER}", "-i", mu["datei"],
                        "-i", stimme_wav, "-filter_complex", fc, "-map", "[out]", "-t", f"{DAUER}", "-ar", "48000", "-ac", "2", roh], check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{mu['start']:.3f}", "-i", mu["datei"],
                        "-af", musik_af, "-t", f"{DAUER}", "-ar", "48000", "-ac", "2", roh], check=True)
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", roh, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = json.loads(e[e.rindex("{"): e.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", roh, "-af", ln + ",aresample=48000", "-ar", "48000", "-ac", "2", norm_wav], check=True)
    teil = ziel + ".teil.mp4"
    enc = subprocess.Popen(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-i", norm_wav, "-map", "0:v", "-map", "1:a",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-profile:v", "high",
                            "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart",
                            "-metadata", "comment=" + json.dumps(manifest, ensure_ascii=False), "-metadata", "title=" + var.get("titel", "LuxeStyle Hoodie-Promo " + var_name.upper()),
                            "-t", f"{DAUER}", "-shortest", teil], stdin=subprocess.PIPE)
    n = int(round(DAUER * FPS)); t_start = time.time()
    for i in range(n):
        enc.stdin.write(frame(i / FPS).convert("RGB").tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        sys.exit("   ⛔ ffmpeg-Fehler beim Kodieren")
    os.replace(teil, ziel)
    print(f"   ✅ {ziel} ({n} Bilder in {time.time() - t_start:.0f} s)")
    return ziel


# ---------------------------------------------------------------- Messen + Pruefen
def medien_info(pfad):
    """Stream-Daten + Manifest ueber ffmpeg selbst. ⚠️ /usr/local/bin/ffprobe ist hier ein Ersatzskript
    (automation/ffprobe_ersatz.py), das NUR die Dauer ausgibt — gemessen 23.09.: `-of json` lieferte «15.000000».
    `ffmpeg -i` kuerzt lange Metadaten in der Anzeige; das Manifest kommt deshalb aus `-f ffmetadata`."""
    kopf = subprocess.run(["ffmpeg", "-hide_banner", "-i", pfad], capture_output=True, text=True).stderr
    info = {"dauer_s": None, "video": None, "audio": None, "breite": 0, "hoehe": 0, "fps": None, "manifest": None}
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", kopf)
    if m:
        info["dauer_s"] = round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)), 3)
    m = re.search(r"Video: (\w+).*?, (\d{2,5})x(\d{2,5})[, ].*?([\d.]+) fps", kopf)
    if m:
        info.update(video=f"{m.group(1)} {m.group(2)}x{m.group(3)} @ {m.group(4)} fps", breite=int(m.group(2)), hoehe=int(m.group(3)), fps=float(m.group(4)))
    m = re.search(r"Audio: (\w+).*?, (\d+) Hz, (\w+)", kopf)
    if m:
        info["audio"] = f"{m.group(1)} {m.group(2)} Hz {m.group(3)}"
    meta = subprocess.run(["ffmpeg", "-v", "error", "-i", pfad, "-f", "ffmetadata", "-"], capture_output=True, text=True).stdout
    for z in meta.splitlines():
        if z.startswith("comment="):
            try:
                info["manifest"] = json.loads(re.sub(r"\\(.)", r"\1", z[len("comment="):]))
            except Exception:
                info["manifest"] = None
    return info


def messen(pfad, frames_dir=None):
    i = medien_info(pfad)
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", pfad, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", e); tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)
    erg = {"datei": os.path.relpath(pfad, REPO), "dauer_s": i["dauer_s"], "groesse_mb": round(os.path.getsize(pfad) / 1e6, 2),
           "video": i["video"], "audio": i["audio"], "lufs": float(lufs[-1]) if lufs else None,
           "true_peak_dbfs": float(tp[-1]) if tp else None, "manifest_produkte": len((i["manifest"] or {}).get("produkte", []))}
    erg["ok"] = bool(i["dauer_s"] and abs(i["dauer_s"] - DAUER) < 0.1 and i["breite"] == W and i["hoehe"] == H and i["fps"] == FPS
                     and erg["lufs"] is not None and abs(erg["lufs"] + 14) <= 1.0
                     and (erg["true_peak_dbfs"] is None or erg["true_peak_dbfs"] <= -0.9) and erg["manifest_produkte"] > 0)
    if frames_dir:
        os.makedirs(frames_dir, exist_ok=True)
        base = os.path.splitext(os.path.basename(pfad))[0]
        erg["frames"] = []
        for tt in (0.6, 6.2, 13.9):
            f = os.path.join(frames_dir, f"{base}_{tt:04.1f}s.png")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(tt), "-i", pfad, "-frames:v", "1", f], check=True)
            erg["frames"].append(f)
    print(json.dumps(erg, ensure_ascii=False, indent=1))
    return erg


def pruefen(pfad):
    man = medien_info(pfad)["manifest"]
    if not man or not man.get("produkte"):
        print("⛔ Kein Manifest im Video — Preise nicht pruefbar, nicht posten."); return 3
    befunde = []
    for p in man["produkte"]:
        try:
            q = gql(Q_PRODUKT, {"h": p["handle"]})["productByHandle"]
        except Exception as e:
            befunde.append(f"{p['handle']}: Shopify nicht erreichbar ({e})"); continue
        if not q:
            befunde.append(f"{p['handle']}: existiert nicht mehr"); continue
        if q["status"] != "ACTIVE" or not q["onlineStoreUrl"]:
            befunde.append(f"{p['handle']}: nicht kaufbar (status {q['status']})")
        pt = preis_text(q)[0]
        if pt != p["preis"]:
            befunde.append(f"{p['handle']}: Video sagt «{p['preis']}», Shop sagt «{pt}»")
    if befunde:
        print("⛔ Video veraltet — NICHT posten:"); [print("   -", b) for b in befunde]; return 3
    print(f"✅ {os.path.basename(pfad)}: {len(man['produkte'])} Produkte aktiv, alle Preise wie im Video."); return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--variante", default="")
    ap.add_argument("--out-dir", default=os.path.join(REPO, "social", "reels"))
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--messen"); ap.add_argument("--pruefen")
    ap.add_argument("--frames-dir", default=os.path.join(tempfile.gettempdir(), "promo_montage_frames"))
    a = ap.parse_args()
    if a.pruefen:
        sys.exit(pruefen(a.pruefen))
    if a.messen:
        sys.exit(0 if messen(a.messen, a.frames_dir)["ok"] else 2)
    namen = [v.strip().lower() for v in a.variante.split(",") if v.strip()] or list(VARIANTEN)
    fehl = 0
    for n in namen:
        if n not in VARIANTEN:
            sys.exit(f"Unbekannte Variante {n} (bekannt: {', '.join(VARIANTEN)})")
        z = render(n, VARIANTEN[n], a.out_dir, dry=a.dry)
        if z:
            fehl += 0 if messen(z, a.frames_dir)["ok"] else 1
    sys.exit(2 if fehl else 0)


if __name__ == "__main__":
    main()
