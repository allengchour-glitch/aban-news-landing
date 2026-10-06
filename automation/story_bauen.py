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

  python3 automation/story_bauen.py                 → Trockenlauf
  SCHARF=1 N=1 python3 automation/story_bauen.py    → bauen, Jury, einreihen, pushen
"""
import csv, io, json, os, re, subprocess, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw          # gql() mit Grund bei Fehlern
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
        if schon_gepostet(p, led, namen, handles_q):
            continue
        rang = min(TAGS.index(t) for t in TAGS if t in p["tags"])
        out.append(dict(handle=p["handle"], title=p["title"], preis=preis, bild=bilder[0], rang=rang))
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


def karte(p, ziel):
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
    rows = list(csv.reader(open(QUEUE, newline="", encoding="utf-8")))
    rows.append([f"story-{p['handle']}"[:80], time.strftime("%Y-%m-%d"), "image", RAW + os.path.basename(datei),
                 "instagram,facebook", "ready", "", ""])
    buf = io.StringIO(); csv.writer(buf, lineterminator="\n").writerows(rows)
    with open(QUEUE + ".tmp", "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())
    os.replace(QUEUE + ".tmp", QUEUE)
    with open(P_LEDGER, "a", encoding="utf-8") as f:
        f.write(f"slug:{p['handle']}\n{name_key(kt)}\n")


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
                with open(QUEUE, "a", encoding="utf-8") as f:
                    f.write(f"story-{p['handle'][:74]},{time.strftime('%Y-%m-%d')},image,,instagram,jury-skip,,\n")
            continue
        einreihen(p, datei, kt)
        gebaut.append(datei)
        print(f"  ✅ {p['handle']} · {cap} · Jury {v.get('schnitt')}")
    if SCHARF and gebaut:
        subprocess.run(["bash", "automation/git_sichern.sh", f"Stories: {len(gebaut)} gebaut [skip ci]", *gebaut, QUEUE, P_LEDGER])
    print(f"FERTIG: {len(gebaut)} {'eingereiht' if SCHARF else 'Probekarten'} · {versucht} versucht", flush=True)
    return 0 if gebaut else 3


if __name__ == "__main__":
    sys.exit(main())
