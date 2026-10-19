#!/usr/bin/env python3
"""story_bauen.py — Instagram-/Facebook-Stories aus Produkten bauen und einreihen (30.09.2026).

ANLASS: Betreiber 30.09. «reels stories etc auch machen». GEMESSEN: social/story_queue.csv hat 10 Zeilen, alle `posted`,
die letzte am 11.06.2026 — der Poster (automation/story-autopost-meta.mjs) hing an einem GitHub-Actions-Zeitplan
(pausiert seit 13.06., Cron-Nulldiät), und niemand erzeugte neue Stories. Seit 3½ Monaten: 0 Stories.

Was dieses Skript tut (je Lauf N Stories, Standard 1):
  1. Kandidaten aus dem Shop: ACTIVE, Tag hype-jetzt / nachfrage-liebling / kunden-liebling / ch-lager, ≥ 2 Bilder, ab CHF 19,
     kaufbar — und NIE gepostet (Regel 10, plattformübergreifend): weder `slug:<handle>` noch der Namensschlüssel im
     Produkt-Ledger dropship/_posted_produkte.txt, noch der Handle in einer Bild-/Reel-Queue.
  2. Karte 1080×1920 (PIL, kein ffmpeg-drawtext): unscharfer Hintergrund aus dem Produktbild, Produkt gross in der Mitte,
     Marke oben, Kurztitel + LIVE-Preis unten, «luxestyle.ch · Klarna · TWINT». Stories erlauben per API keinen
     Link-Sticker und keine Caption — die Marke steckt im Bild.
  3. Gemini-Jury (`--typ bild`, Caption «Kurztitel» + Preis) — nur bestandene Karten werden eingereiht.
  4. Ablage social/stories/story_<handle>.jpg (öffentliches Repo; Dateispeicher voll bis Grow-Plan — wie social/reels/),
     Zeile in social/story_queue.csv (status ready), Produkt-Ledger `slug:<handle>` + Namensschlüssel, git_sichern.sh
     (die Adresse muss auf origin liegen, bevor Instagram sie abholt).
  Trockenlauf (Standard): zeigt Kandidaten, baut die Karte nach /tmp, keine Jury, nichts eingereiht.

19.10.2026 (Betreiber «tiktok stories verbessern»): LOOK v2 = TikTok-Stil statt grauer Karte. GEMESSEN: (a) echte TikTok-Stories gehen NICHT
automatisch — das Metricool-Schema kennt `STORY` nur für facebookData/instagramData, die TikTok-Content-Posting-API listet keine Stories;
(b) die alte Karte hatte einen Layoutfehler (zweizeiliger Titel ragte in den weissen Bildrahmen, y 1400 gegen Rahmenende 1378) und ein
Produkt ohne Zugkraft kam durch (Pfand-Jetons, Tag ch-lager); (c) Story-Insights liefert Metricool nicht (IGST-Abfrage 30 T = 0 Zeilen
bei 28 veröffentlichten Stories) — Wirkung der neuen Karte ist daher BEHAUPTUNG, nicht gemessen. v2: Produkt auf abgerundeter Karte mit Schatten,
EIN Hook als Frage/Saisonzeile über dem Titel (Auswahl nach Handle, keine Heilzusage, keine Zahl), Preis als Goldpille, Sicherheitszonen
(oben 250 px Profil/Fortschritt, unten 340 px Antwortfeld). `STORY_LOOK=v1` stellt die alte Karte wieder her. `--selbsttest`: Kästen
überlappen nicht, nichts in den Sicherheitszonen, Hook-Auswahl stabil.

  python3 automation/story_bauen.py                 → Trockenlauf
  SCHARF=1 N=1 python3 automation/story_bauen.py    → bauen, Jury, einreihen, pushen
"""
import io, json, os, re, subprocess, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw          # gql() mit Grund bei Fehlern
from fremdtext import woerter_url as fremdtext_woerter, GRENZE as FREMDTEXT_GRENZE
from queue_csv import anhaengen as queue_anhaengen   # 14.10.2026: EIN Weg, die geteilte Story-Queue zu schreiben
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
SCHARF = os.environ.get("SCHARF") == "1"
N = int(os.environ.get("N", "1"))
BRANCH = "claude/luxestyle-status-tztnn1"
RAW = f"https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/{BRANCH}/social/stories/"
QUEUE = "social/story_queue.csv"
P_LEDGER = "dropship/_posted_produkte.txt"
TAGS = ["nachfrage-liebling", "kunden-liebling", "hype-jetzt", "ch-lager"]
F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
GOLD, WEISS, DUNKEL = (212, 175, 55), (255, 255, 255), (18, 18, 18)
MODEL = re.compile(r"(^|[^a-z])(kundin-\d\d|luxestyle-model-(clean|musik)|tati-model|tatjana)", re.I)   # wie post_guard.MODEL_MEDIEN
MODEL_HANDLE = "@tatjanalarsinamoira"
LOOK = os.environ.get("STORY_LOOK", "v2")
# 19.10.2026: Ware ohne Zugkraft als Story (Pfand-Jetons CHF 21.90 kamen über das Tag ch-lager durch; Jury liess sie passieren)
NICHT_STORY = re.compile(r"\b(jeton|jetons|wertmarke|wertmarken|pfandmarke|pfandmarken)\b", re.I)
# Hooks: nur Fragen/neutrale Zeilen, keine Heilzusage, keine Zahl, kein «alle fragen danach» (unbelegt). Auswahl stabil nach Handle,
# damit dieselbe Karte bei jedem Lauf gleich ausfällt; saisonale Zeilen nur im passenden Zeitraum.
HOOKS_NEUTRAL = ["Kennst du das schon?", "Dein neues Lieblingsteil?", "Schon entdeckt?", "Neu bei LuxeStyle"]
SAISON = [  # (Muster im Titel, erstes Datum, letztes Datum, Hook)
    (re.compile(r"halloween|skelett|totenkopf|kürbis|kuerbis|spinne|vampir|hexe|geist|gruse", re.I), "2026-10-01", "2026-10-31", "Bereit für Halloween?"),
    (re.compile(r"weihnacht|advent|nikolaus|christbaum|lichterkette|zuckerstange", re.I), "2026-11-01", "2026-12-24", "Schon an Weihnachten gedacht?"),
]


def name_key(text):
    """wie post_guard.produktKey: «…» (2–40 Zeichen) → name:<klein, nur a-zäöüß0-9>"""
    return "name:" + re.sub(r"[^a-zäöüß0-9]", "", text.lower())


def kurztitel(t):
    t = re.sub(r"\s*[|–—-]\s.*$", "", t).strip()
    return t if len(t) <= 40 else t[:40].rsplit(" ", 1)[0]


def gepostet_mengen():
    led = set(l.strip() for l in open(P_LEDGER, encoding="utf-8")) if os.path.exists(P_LEDGER) else set()
    namen = [k[5:] for k in led if k.startswith("name:") and len(k) > 10]
    handles_q = set()
    for f in ("social/posts_image.csv", "automation/reels_seed.csv", QUEUE):
        if os.path.exists(f):
            handles_q |= set(re.findall(r"/products/([a-z0-9-]+)", open(f, encoding="utf-8").read()))
            handles_q |= set(re.findall(r"story_([a-z0-9-]+)\.jpg", open(f, encoding="utf-8").read()))
    # Jury-Sperre steht als «story-<handle[:74]>,…,jury-skip» in der Queue (Bindestrich, ohne .jpg) — die beiden
    # Muster oben fanden sie nie: 04.10.2026 prüfte jeder Lauf dieselben 4 Durchfaller, 25 h keine Story.
    if os.path.exists(QUEUE):
        handles_q |= {"sperre:" + h for h in re.findall(r"^story-([a-z0-9-]+),", open(QUEUE, encoding="utf-8").read(), re.M)}
    return led, namen, handles_q


def schon_gepostet(p, led, namen, handles_q):
    if f"slug:{p['handle']}" in led or p["handle"] in handles_q or "sperre:" + p["handle"][:74] in handles_q:
        return True
    voll = re.sub(r"[^a-zäöüß0-9]", "", p["title"].lower())
    return name_key(kurztitel(p["title"])) in led or any(n in voll for n in namen if len(n) >= 8)


def kandidaten():
    q = " OR ".join(f"tag:{t}" for t in TAGS)
    r = hw.gql('query($q:String!){products(first:150, query:$q, sortKey:UPDATED_AT, reverse:true){nodes{handle title status tags '
               'totalInventory tracksInventory priceRangeV2{minVariantPrice{amount}} '
               'media(first:4){nodes{... on MediaImage{image{url width height}}}}}}}', {"q": f"status:active AND ({q})"})
    nodes = ((r.get("data") or {}).get("products") or {}).get("nodes")
    if nodes is None:
        raise RuntimeError(f"Shopify-Abfrage ohne Daten: {str(r)[:200]}")
    led, namen, handles_q = gepostet_mengen()
    out = []
    for p in nodes:
        bilder = [m["image"]["url"] for m in p["media"]["nodes"] if (m or {}).get("image")]
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        if p["status"] != "ACTIVE" or len(bilder) < 2 or preis < 19:
            continue
        if p["tracksInventory"] and (p["totalInventory"] or 0) <= 0:
            continue
        if NICHT_STORY.search(p["title"]):
            continue
        if schon_gepostet(p, led, namen, handles_q):
            continue
        rang = min(TAGS.index(t) for t in TAGS if t in p["tags"])
        out.append(dict(handle=p["handle"], title=p["title"], preis=preis, bild=bilder[0], bilder=bilder, rang=rang))
    out.sort(key=lambda x: x["rang"])
    return out


def laden(url):
    r = subprocess.run(["curl", "-sL", "--max-time", "40", url], capture_output=True)
    return Image.open(io.BytesIO(r.stdout)).convert("RGB")


def zeilen(text, font, breite, d):
    w, out = text.split(), [""]
    for x in w:
        t = (out[-1] + " " + x).strip()
        if d.textlength(t, font=font) <= breite:
            out[-1] = t
        else:
            out.append(x)
    return out[:2]


def hook_fuer(p, heute=None):
    """Eine Zeile über dem Titel. Saisonzeile, wenn Titel und Datum passen, sonst stabil nach Handle aus HOOKS_NEUTRAL."""
    heute = heute or time.strftime("%Y-%m-%d")
    for muster, von, bis, zeile in SAISON:
        if von <= heute <= bis and muster.search(p["title"]):
            return zeile
    h = sum(ord(c) for c in p["handle"])
    return HOOKS_NEUTRAL[h % len(HOOKS_NEUTRAL)]


def passend(text, font_pfad, d, breite, start, ziel_min, zeilen_max=1):
    """Grösste Schrift (start … ziel_min), bei der text in zeilen_max Zeilen à breite passt → (font, zeilen)."""
    for gr in range(start, ziel_min - 1, -2):
        f = ImageFont.truetype(font_pfad, gr)
        zl = zeilen_voll(text, f, breite, d)
        if len(zl) <= zeilen_max:
            return f, zl
    f = ImageFont.truetype(font_pfad, ziel_min)
    return f, zeilen_voll(text, f, breite, d)[:zeilen_max]


def zeilen_voll(text, font, breite, d):
    w, out = text.split(), [""]
    for x in w:
        t = (out[-1] + " " + x).strip()
        if d.textlength(t, font=font) <= breite or not out[-1]:
            out[-1] = t
        else:
            out.append(x)
    return out


def karte_v2(p, ziel, kaesten=None):
    """TikTok-Stil (19.10.2026). Von oben: Marke (y 240) · Produktkarte (rund, Schatten, y 320–1200) · Hook · Titel · Preis-Pille ·
    Fusszeile. Sicherheitszonen: oben 250 px (Profil/Fortschritt), unten ~340 px (Antwortfeld) — Text/Preis enden vor y 1600, nur
    die Fusszeile (Marke, nicht kaufentscheidend) liegt tiefer wie schon in v1. `kaesten` (Liste) bekommt (name, x0, y0, x1, y1)."""
    W, H = 1080, 1920
    img = laden(p["bild"])
    bg = img.copy()
    sk = max(W / bg.width, H / bg.height)
    bg = bg.resize((int(bg.width * sk) + 1, int(bg.height * sk) + 1)).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(46))
    bg = Image.blend(bg, Image.new("RGB", (W, H), DUNKEL), 0.62)
    # Verlauf: oben und unten dunkler, damit Marke und Preis lesbar bleiben, Mitte lebendiger
    ver = Image.new("L", (1, H))
    for y in range(H):
        t = abs(y - H * 0.5) / (H * 0.5)
        ver.putpixel((0, y), int(150 * t ** 2.2))
    bg = Image.composite(Image.new("RGB", (W, H), DUNKEL), bg, ver.resize((W, H)))
    d = ImageDraw.Draw(bg)

    def merke(name, box):
        if kaesten is not None:
            kaesten.append((name,) + tuple(int(v) for v in box))

    # Marke
    f_marke = ImageFont.truetype(F_SERIF, 60)
    d.text((W / 2, 240), "L U X E S T Y L E", font=f_marke, fill=GOLD, anchor="mm")
    b = d.textbbox((W / 2, 240), "L U X E S T Y L E", font=f_marke, anchor="mm"); merke("marke", b)
    d.line((W / 2 - 170, 290, W / 2 + 170, 290), fill=GOLD, width=3)

    # Produktkarte: weiss, abgerundet, Schatten
    kx0, ky0, kx1, ky1 = 70, 330, W - 70, 1200
    schatten = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(schatten).rounded_rectangle((kx0, ky0 + 22, kx1, ky1 + 22), radius=44, fill=(0, 0, 0, 150))
    schatten = schatten.filter(ImageFilter.GaussianBlur(26))
    bg = bg.convert("RGBA"); bg.alpha_composite(schatten); bg = bg.convert("RGB")
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((kx0, ky0, kx1, ky1), radius=44, fill=WEISS)
    fg = img.copy(); fg.thumbnail((kx1 - kx0 - 60, ky1 - ky0 - 60))
    bg.paste(fg, (kx0 + (kx1 - kx0 - fg.width) // 2, ky0 + (ky1 - ky0 - fg.height) // 2))
    merke("karte", (kx0, ky0, kx1, ky1))

    # Hook (eine Zeile, so gross wie möglich)
    hook = hook_fuer(p)
    f_hook, hz = passend(hook, F_BOLD, d, 940, 84, 54, 1)
    d.text((W / 2, 1268), hz[0], font=f_hook, fill=WEISS, anchor="mm", stroke_width=4, stroke_fill=DUNKEL)
    merke("hook", d.textbbox((W / 2, 1268), hz[0], font=f_hook, anchor="mm", stroke_width=4))

    # Titel (höchstens 2 Zeilen, automatisch kleiner)
    kt = kurztitel(p["title"])
    f_t, tz = passend(kt, F_REG, d, 940, 50, 38, 2)
    ty = 1338
    for z in tz:
        d.text((W / 2, ty), z, font=f_t, fill=(235, 235, 235), anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
        merke("titel", d.textbbox((W / 2, ty), z, font=f_t, anchor="mm", stroke_width=2))
        ty += f_t.size + 12
    # Preis-Pille
    txt = f"CHF {p['preis']:.2f}"
    f_p = ImageFont.truetype(F_BOLD, 92)
    tw = d.textlength(txt, font=f_p)
    py = max(ty + 70, 1500)
    ph = 128
    d.rounded_rectangle((W / 2 - tw / 2 - 52, py - ph / 2, W / 2 + tw / 2 + 52, py + ph / 2), radius=ph // 2, fill=GOLD)
    d.text((W / 2, py + 2), txt, font=f_p, fill=DUNKEL, anchor="mm")
    merke("preis", (W / 2 - tw / 2 - 52, py - ph / 2, W / 2 + tw / 2 + 52, py + ph / 2))
    # Fusszeile
    f_fuss = ImageFont.truetype(F_REG, 40)
    d.text((W / 2, 1730), "luxestyle.ch  ·  Klarna  ·  TWINT", font=f_fuss, fill=WEISS, anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
    merke("fuss", d.textbbox((W / 2, 1730), "luxestyle.ch  ·  Klarna  ·  TWINT", font=f_fuss, anchor="mm", stroke_width=2))
    if MODEL.search(p["bild"]):
        d.text((W / 2, 1790), f"Model: {MODEL_HANDLE}", font=f_fuss, fill=GOLD, anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
        merke("model", d.textbbox((W / 2, 1790), f"Model: {MODEL_HANDLE}", font=f_fuss, anchor="mm", stroke_width=2))
    bg.save(ziel, "JPEG", quality=90)
    return kt


def karte(p, ziel):
    return karte_v1(p, ziel) if LOOK == "v1" else karte_v2(p, ziel)


def karte_v1(p, ziel):
    W, H = 1080, 1920
    img = laden(p["bild"])
    bg = img.copy()
    s = max(W / bg.width, H / bg.height)
    bg = bg.resize((int(bg.width * s) + 1, int(bg.height * s) + 1)).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.blend(bg, Image.new("RGB", (W, H), DUNKEL), 0.45)
    fg = img.copy(); fg.thumbnail((940, 1040))
    x, y = (W - fg.width) // 2, 330 + (1040 - fg.height) // 2
    rahmen = Image.new("RGB", (fg.width + 16, fg.height + 16), WEISS)
    bg.paste(rahmen, (x - 8, y - 8)); bg.paste(fg, (x, y))
    d = ImageDraw.Draw(bg)
    f_marke, f_titel, f_preis, f_fuss = (ImageFont.truetype(F_SERIF, 64), ImageFont.truetype(F_BOLD, 58),
                                         ImageFont.truetype(F_BOLD, 96), ImageFont.truetype(F_REG, 40))
    # Marke oben (Instagram legt die Fortschrittsleiste + Profil in die obersten ~200 px → Marke darunter)
    d.text((W / 2, 240), "L U X E S T Y L E", font=f_marke, fill=GOLD, anchor="mm")
    d.line((W / 2 - 170, 290, W / 2 + 170, 290), fill=GOLD, width=3)
    # Titel + Preis unten (unterste ~250 px = Antwort-Feld → Text bis y 1640)
    kt = kurztitel(p["title"])
    zl = zeilen(kt, f_titel, 960, d)
    ty = 1430 if len(zl) == 1 else 1400          # 30.09.: zweizeilig stiess der Preis an die Fusszeile (Probekarte Hoodie)
    for z in zl:
        d.text((W / 2, ty), z, font=f_titel, fill=WEISS, anchor="mm", stroke_width=3, stroke_fill=DUNKEL); ty += 72
    d.text((W / 2, ty + 55), f"CHF {p['preis']:.2f}", font=f_preis, fill=GOLD, anchor="mm", stroke_width=4, stroke_fill=DUNKEL)
    d.text((W / 2, 1730), "luxestyle.ch  ·  Klarna  ·  TWINT", font=f_fuss, fill=WEISS, anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
    if MODEL.search(p["bild"]):             # 30.09.: Stories haben keinen Text → Markierung ins Bild (Betreiber «immer sie markieren»)
        d.text((W / 2, 1790), f"Model: {MODEL_HANDLE}", font=f_fuss, fill=GOLD, anchor="mm", stroke_width=2, stroke_fill=DUNKEL)
    bg.save(ziel, "JPEG", quality=90)
    return kt


def jury(datei, caption):
    r = subprocess.run(["python3", "automation/gemini_jury.py", datei, "--caption", caption, "--typ", "bild"],
                       capture_output=True, text=True, timeout=400)
    try:
        v = json.loads(r.stdout.strip().split("\n")[-1])
    except Exception:
        v = {"grund": (r.stdout + r.stderr)[-200:]}
    return r.returncode, v


def einreihen(p, datei, kt):
    # 14.10.2026 (Lost-Update-Klasse): queue_csv.anhaengen — gemeinsame Sperre mit story-autopost-meta.mjs & Co., frisch
    # lesen, atomar über eine Nachbardatei je Prozess (vorher eigenes Lesen + feste story_queue.csv.tmp ohne Sperre).
    # Steht die id schon drin (paralleler Lauf), wird sie nicht doppelt angehängt.
    if not queue_anhaengen(QUEUE, [[f"story-{p['handle']}"[:80], time.strftime("%Y-%m-%d"), "image",
                                    RAW + os.path.basename(datei), "instagram,facebook", "ready", "", ""]]):
        print(f"  ⚠️ {p['handle']}: story-{p['handle'][:74]} steht schon in der Queue — nicht doppelt eingereiht", flush=True)
    with open(P_LEDGER, "a", encoding="utf-8") as f:
        f.write(f"slug:{p['handle']}\n{name_key(kt)}\n")


def selbsttest():
    """Ohne Netz/Shopify: Karte v2 mit künstlichen Bildern. Prüft Kästen (keine Überlappung, Sicherheitszonen), Hook-Auswahl, Filter."""
    global laden
    echt_laden = laden
    fehler, n = [], 0

    def pruefe(name, ok, info=""):
        nonlocal n
        n += 1
        if not ok:
            fehler.append(f"{name} {info}")

    def kuenstlich(w, h, farbe):
        img = Image.new("RGB", (w, h), (255, 255, 255))
        ImageDraw.Draw(img).rectangle((w * 0.2, h * 0.2, w * 0.8, h * 0.8), fill=farbe)
        return img

    faelle = [
        ("quadrat", dict(handle="einhornskelett-18-cm-fga910992", title="Einhornskelett 18 cm", preis=21.9, bild="x"), (800, 800)),
        ("hoch", dict(handle="langer-titel", title="Hochelastische Hunde-Doppeltraktionsleine für zwei Hunde gleichzeitig", preis=123.5, bild="x"), (600, 1400)),
        ("breit", dict(handle="jacke", title="Retro-Jacke für Herren mit Revers und Kapuze", preis=28.9, bild="x"), (1600, 500)),
        ("gross", dict(handle="uhr", title="Mechanische Skelett-Herrenuhr", preis=199.0, bild="x"), (3000, 3000)),
    ]
    for name, p, (w, h) in faelle:
        laden = lambda url, w=w, h=h: kuenstlich(w, h, (200, 30, 30))
        kaesten = []
        ziel = f"/tmp/_story_selbsttest_{name}.jpg"
        karte_v2(p, ziel, kaesten)
        bild = Image.open(ziel)
        pruefe(f"{name}: Format", bild.size == (1080, 1920), str(bild.size))
        k = {}
        for nm, x0, y0, x1, y1 in kaesten:
            k.setdefault(nm, []).append((x0, y0, x1, y1))
        for nm in ("marke", "karte", "hook", "titel", "preis", "fuss"):
            pruefe(f"{name}: {nm} vorhanden", nm in k)
        if not all(nm in k for nm in ("marke", "karte", "hook", "titel", "preis", "fuss")):
            continue
        pruefe(f"{name}: Marke unter den obersten 180 px", k["marke"][0][1] >= 180, str(k["marke"][0]))
        pruefe(f"{name}: Karte beginnt nach der Marke", k["karte"][0][1] > k["marke"][0][3] + 8)
        reihe = [("karte", k["karte"][0]), ("hook", k["hook"][0])] + [("titel", t) for t in k["titel"]] + [("preis", k["preis"][0]), ("fuss", k["fuss"][0])]
        for (a, ba), (b, bb) in zip(reihe, reihe[1:]):
            pruefe(f"{name}: {a}→{b} überlappen nicht (≥ 8 px Abstand)", bb[1] >= ba[3] + 8, f"{ba} / {bb}")
        pruefe(f"{name}: höchstens 2 Titelzeilen", len(k["titel"]) <= 2, str(len(k["titel"])))
        pruefe(f"{name}: Preis endet vor y 1620 (Antwortfeld)", k["preis"][0][3] <= 1620, str(k["preis"][0]))
        for nm in ("hook", "titel", "preis"):
            for (x0, y0, x1, y1) in k[nm]:
                pruefe(f"{name}: {nm} innerhalb der Breite", x0 >= 40 and x1 <= 1040, f"{x0}-{x1}")
        # Das Produkt steckt wirklich auf der Karte (rote Fläche mittig)
        px = bild.getpixel((540, 765))
        pruefe(f"{name}: Produkt mittig auf der Karte", px[0] > 150 and px[1] < 90, str(px))
    laden = echt_laden
    # Hook-Auswahl
    a = hook_fuer(dict(handle="abc", title="Etwas"), "2026-10-20")
    pruefe("Hook stabil", a == hook_fuer(dict(handle="abc", title="Etwas"), "2026-10-20") and a in HOOKS_NEUTRAL)
    pruefe("Hook Halloween im Zeitraum", hook_fuer(dict(handle="x", title="Teddybär Skelett 15 cm"), "2026-10-20") == "Bereit für Halloween?")
    pruefe("Hook Halloween nach dem 31.10. neutral", hook_fuer(dict(handle="x", title="Teddybär Skelett 15 cm"), "2026-11-05") in HOOKS_NEUTRAL)
    pruefe("Hook Weihnachten ab 1.11.", hook_fuer(dict(handle="x", title="Weihnachtskranz Zuckerstangen"), "2026-11-05") == "Schon an Weihnachten gedacht?")
    pruefe("Hook Weihnachten im Oktober neutral", hook_fuer(dict(handle="x", title="Weihnachtskranz"), "2026-10-20") in HOOKS_NEUTRAL)
    alle = HOOKS_NEUTRAL + [z for _, _, _, z in SAISON]
    pruefe("Hooks ohne Zahl/Preis/Heilwort", not any(re.search(r"\d|chf|heil|lindert|garantiert|wasserdicht", h, re.I) for h in alle))
    pruefe("Hooks höchstens 30 Zeichen", all(len(h) <= 30 for h in alle))
    verteilt = {hook_fuer(dict(handle=f"produkt-{i}", title="Etwas"), "2026-10-20") for i in range(40)}
    pruefe("Hooks wechseln (alle 4 neutralen kommen vor)", verteilt == set(HOOKS_NEUTRAL), str(verteilt))
    # Filter
    pruefe("Filter: Jetons raus", bool(NICHT_STORY.search("Jetons Wertmarken Pfand grün")))
    pruefe("Filter: Pfandflaschenhalter bleibt", not NICHT_STORY.search("Pfandflaschen-Halter aus Metall"))
    pruefe("Filter: Einhornskelett bleibt", not NICHT_STORY.search("Einhornskelett 18 cm"))
    print(f"story_bauen Selbsttest: {n - len(fehler)}/{n}")
    for f in fehler:
        print("  FAIL", f)
    return not fehler


def vorschau(handles):
    """Probekarten alt (v1) und neu (v2) für bestimmte Handles nach /tmp/story_vorschau_<handle>_<look>.jpg — kein Einreihen, keine Jury."""
    global LOOK
    for h in handles:
        r = hw.gql('query($h:String!){productByHandle(handle:$h){handle title priceRangeV2{minVariantPrice{amount}} '
                   'media(first:4){nodes{... on MediaImage{image{url}}}}}}', {"h": h})
        pr = ((r.get("data") or {}).get("productByHandle"))
        if not pr:
            print(f"  – {h}: nicht gefunden"); continue
        bilder = [m["image"]["url"] for m in pr["media"]["nodes"] if (m or {}).get("image")]
        sauber = next((u for u in bilder if (lambda n: n is None or n < FREMDTEXT_GRENZE)(fremdtext_woerter(u))), bilder[0] if bilder else None)
        p = dict(handle=pr["handle"], title=pr["title"], preis=float(pr["priceRangeV2"]["minVariantPrice"]["amount"]), bild=sauber)
        for look, f in (("v1", karte_v1), ("v2", karte_v2)):
            f(p, f"/tmp/story_vorschau_{h[:60]}_{look}.jpg")
        print(f"  Vorschau {h}: /tmp/story_vorschau_{h[:60]}_v1.jpg, _v2.jpg · Hook «{hook_fuer(p)}»")


def main():
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: Stories bauen · N={N} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    ks = kandidaten()
    print(f"Kandidaten (nie gepostet, ≥2 Bilder, ≥ CHF 19, kaufbar): {len(ks)}", flush=True)
    gebaut, versucht = [], 0
    os.makedirs("social/stories", exist_ok=True)
    for p in ks:
        if len(gebaut) >= N or versucht >= N + 3:
            break
        versucht += 1
        # 07.10.2026 (Betreiber «das bild ist verzogen?» → «für die nächsten verbessern»): CJ-Bild 1 ist oft eine englische
        # Infografik, auf 800x800 gestaucht → erstes Bild ohne montierten Text (fremdtext.py); keins sauber → nächstes Produkt.
        sauber = next((u for u in p["bilder"] if (lambda n: n is None or n < FREMDTEXT_GRENZE)(fremdtext_woerter(u))), None)
        if not sauber:
            print(f"  – {p['handle']}: alle Bilder mit montiertem Text — ausgelassen", flush=True); continue
        p["bild"] = sauber
        endung = "-markiert" if MODEL.search(p["bild"]) else ""     # post_guard.modelSperre(…, null) verlangt «markiert»
        datei = f"social/stories/story_{p['handle'][:70]}{endung}.jpg" if SCHARF else f"/tmp/story_{p['handle'][:70]}{endung}.jpg"
        try:
            kt = karte(p, datei)
        except Exception as e:
            print(f"  ⚠️ {p['handle']}: Karte gescheitert — {type(e).__name__}: {str(e)[:120]}", file=sys.stderr); continue
        cap = f"«{kt}» CHF {p['preis']:.2f}"
        if not SCHARF:
            print(f"  TROCKEN {p['handle']} → {datei} · {cap}"); gebaut.append(datei); continue
        rc, v = jury(datei, cap)
        if rc != 0:
            print(f"  ⛔ Jury {'durchgefallen' if rc == 4 else 'ohne Urteil'}: {p['handle']} · {str(v.get('gruende') or v.get('grund'))[:150]}")
            if os.path.exists(datei):   # 06.10.: fehlte die Karte schon, brach der Lauf ab, bevor die Sperre geschrieben war
                os.unlink(datei)
            if rc == 4:   # nicht wieder versuchen: Produkt-Ledger nicht, aber Story-Sperre über die Queue-Zeile
                # 14.10.2026: über queue_csv.anhaengen (Sperre, frisch, atomar) statt Anhängen ohne Sperre; gleiche Zeile wie
                # bisher, eine schon vorhandene Sperre derselben id wird nicht verdoppelt.
                try:
                    queue_anhaengen(QUEUE, [[f"story-{p['handle'][:74]}", time.strftime("%Y-%m-%d"), "image", "",
                                             "instagram", "jury-skip", "", ""]])
                except RuntimeError as e:
                    print(f"  ⚠️ Story-Sperre {p['handle']} nicht geschrieben — {e}", file=sys.stderr)
            continue
        einreihen(p, datei, kt)
        gebaut.append(datei)
        print(f"  ✅ {p['handle']} · {cap} · Jury {v.get('schnitt')}")
    if SCHARF and gebaut:
        subprocess.run(["bash", "automation/git_sichern.sh", f"Stories: {len(gebaut)} gebaut [skip ci]", *gebaut, QUEUE, P_LEDGER])
    print(f"FERTIG: {len(gebaut)} {'eingereiht' if SCHARF else 'Probekarten'} · {versucht} versucht", flush=True)
    return 0 if gebaut else 3


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if "--vorschau" in sys.argv:
        vorschau([h for h in sys.argv[sys.argv.index("--vorschau") + 1:] if not h.startswith("--")])
        sys.exit(0)
    sys.exit(main())
