#!/usr/bin/env python3
"""bild_reel.py — Reel aus den ORIGINAL-Produktbildern EINES Produkts, gross im Bild, mit Sprecherstimme (05.10.2026).

Betreiber 05.10.: «orginal video oder bilder bearbeiten mit stimme» + «mann sieht die bilder und videos sehr klein».
Gemessen vorher: in den Reels füllte das Produkt 23–32 % der Fläche (Fenster 600×780 bzw. 1080×608 auf 1080×1920).

Weg: Produktbilder (Shopify, ACTIVE, Preis live) → Ken-Burns-Diashow 1080×1920 (PIL, Sub-Pixel-Ausschnitt, Bild füllt
1080 breit bzw. 1060 hoch, unscharfer Grund aus demselben Bild) → Stimme über reel/voiceover.py (Azure, Werbelizenz;
ohne Schlüssel = ohne Stimme) → reel/make_reel.sh (Kopf, Hook, Titel, Preis, Musik, Ducking, -14 LUFS) →
meisterwerk_tor.py (Preis im Bild = PREIS_SOLL). Ergebnis + Kontaktbogen zum ANSEHEN; in die Queue erst mit --freigeben.

Aufrufe:
  python3 automation/reel/bild_reel.py --handle <h> --hook "Kurz & stark" [--out-dir DIR] [--musik datei.wav]
  python3 automation/reel/bild_reel.py --freigeben DIR/bildreel_<h>.mp4 --handle <h>   # CDN + reels_seed.csv (ready)
"""
import argparse, io, json, os, re, subprocess, sys, tempfile, urllib.request

from PIL import Image, ImageFilter, ImageEnhance

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", ".."))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette eingebaut)
from fremdtext import woerter_url as fremdtext_woerter, GRENZE as FREMDTEXT_GRENZE  # noqa: E402

W, H, FPS = 1080, 1920, 30
BOX_W, BOX_H, MITTE_Y = 1080, 1060, 740      # Produktfeld 210–1270 (Kopf 200–380 und Infofeld 1170–1440 liegen darüber)
BLENDE = 0.35


def produkt(handle):
    d = gql('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title status onlineStoreUrl tags '
            'priceRangeV2{minVariantPrice{amount}} media(first:10){nodes{mediaContentType ... on MediaImage{image{url width height}}}} } }',
            {"h": handle})["productByIdentifier"]
    if not d or d["status"] != "ACTIVE" or not d["onlineStoreUrl"]:
        sys.exit(f"⛔ {handle}: nicht aktiv/nicht im Onlineshop")
    bilder = [m["image"] for m in d["media"]["nodes"] if m["mediaContentType"] == "IMAGE" and m.get("image")
              and min(m["image"]["width"], m["image"]["height"]) >= 600]
    # 07.10.2026 (Betreiber «das bild ist verzogen?»): Lieferanten-Infografiken mit englischem Text sind oft auf 800x800
    # gestaucht → raus (fremdtext.py, >= 4 Wörter); OCR nicht verfügbar → Bild bleibt.
    vorher = len(bilder)
    bilder = [b for b in bilder if (lambda n: n is None or n < FREMDTEXT_GRENZE)(fremdtext_woerter(b["url"]))]
    if len(bilder) < vorher:
        print(f"  {handle}: {vorher - len(bilder)} Bild(er) mit montiertem Text ausgelassen")
    if len(bilder) < 2:
        sys.exit(f"⛔ {handle}: weniger als 2 Bilder ≥ 600 px ohne montierten Text")
    return d, bilder


def lade(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")


def grund(im):
    g = im.copy()
    s = max(W / g.width, H / g.height)
    g = g.resize((int(g.width * s) + 2, int(g.height * s) + 2), Image.BICUBIC)
    x, y = (g.width - W) // 2, (g.height - H) // 2
    g = g.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(28))
    return ImageEnhance.Brightness(g).enhance(0.62)


def bild_frame(im, bg, u, richtung, rein=True, amp=0.22):
    """u 0..1 im Segment. Zoom 1.00 ↔ 1.22 (abwechselnd rein/raus) + Schwenk; Ausschnitt mit Gleitkomma-Box (ruhig, kein
    Pixelzittern). 05.10.: 1.00→1.07 fiel durch das Meisterwerk-Tor (HOOK 0.1 < 3, STILL 64 % — «Diashow aus Standbildern»)."""
    s = min(BOX_W / im.width, BOX_H / im.height)
    tw, th = int(im.width * s) // 2 * 2, int(im.height * s) // 2 * 2
    e = u * u * (3 - 2 * u)
    z = 1.0 + amp * (e if rein else 1 - e)
    cw, ch = im.width / z, im.height / z
    dx = (im.width - cw) * (0.5 + 0.45 * richtung * (e - 0.5))
    dy = (im.height - ch) * 0.42
    fg = im.resize((tw, th), Image.BICUBIC, box=(dx, dy, dx + cw, dy + ch))
    f = bg.copy()
    f.paste(fg, ((W - tw) // 2, MITTE_Y - th // 2))
    return f


def plan(n, dauer):
    """Erste Sekunde = zwei schnelle Schnitte (0.5 s, das Tor misst Bewegung in Sekunde 1), danach jedes übrige Bild
    einmal, gleich lang. Kein Bild doppelt, solange es genug gibt."""
    kurz = [0.5, 0.5] if n >= 4 else [0.5]
    rest = dauer - sum(kurz)
    m = n - len(kurz)
    lang = [rest / m] * m
    t, out = 0.0, []
    for i, d in enumerate(kurz + lang):
        out.append((i, t, t + d)); t += d
    return out


def diashow(bilder, dauer, out):
    n = len(bilder)
    segs = plan(n, dauer)
    bgs = [grund(b) for b in bilder]
    p = subprocess.Popen(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                          "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for k in range(int(round(dauer * FPS))):
        t = k / FPS
        i, t0, t1 = next((x for x in segs if x[1] <= t < x[2]), segs[-1])
        u = min(1.0, (t - t0) / (t1 - t0))
        # Zoom-Weg mit der Segmentlänge: bei 5 Bildern (3.3 s) war 0.22 zu ruhig (Leselupe STILL 64 %, weisser Grund)
        f = bild_frame(bilder[i], bgs[i], u, 1 if i % 2 == 0 else -1, rein=i % 2 == 0, amp=min(0.38, max(0.22, 0.1 * (t1 - t0))))
        if i + 1 < n and t1 - t0 > 1.0 and t > t1 - BLENDE:   # Kreuzblende nur zwischen langen Segmenten
            a = (t - (t1 - BLENDE)) / BLENDE
            f = Image.blend(f, bild_frame(bilder[i + 1], bgs[i + 1], 0.0, -1 if i % 2 == 0 else 1, rein=(i + 1) % 2 == 0), max(0, min(1, a)))
        p.stdin.write(f.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit("⛔ ffmpeg Diashow")


def zeilen(titel):
    t = re.split(r"\s[–—·|]\s|,", titel)[0].strip()
    w, a, b = t.split(), "", ""
    for x in w:
        if len((a + " " + x).strip()) <= 26 and not b:
            a = (a + " " + x).strip()
        else:
            b = (b + " " + x).strip()
    return a, (b[:29] + "…") if len(b) > 30 else b


def musik_wahl(wunsch):
    gesperrt = {z.split("\t")[0] for z in open(os.path.join(REPO, "automation/music/_gesperrt.txt"), encoding="utf-8") if z.strip() and not z.startswith("#")}
    m = wunsch or "luxe-epic-elegant.wav"
    if m in gesperrt:
        sys.exit(f"⛔ Musik {m} gesperrt")
    ein = json.load(open(os.path.join(REPO, "automation/music/_einstiege.json"))).get(m, {}).get("einstiege", [0])
    return m, ein[0] if ein else 0


def render(a):
    d, bilder = produkt(a.handle)
    preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
    z1, z2 = zeilen(d["title"])
    os.makedirs(a.out_dir, exist_ok=True)
    out = os.path.join(a.out_dir, f"bildreel_{a.handle[:60]}.mp4")
    with tempfile.TemporaryDirectory() as td:
        weg = {int(x) for x in a.weg.split(",") if x.strip()}   # Sichtprüfung: Bildindex raus (Fremdmarke, Textbild)
        bilder = [b for i, b in enumerate(bilder) if i not in weg]
        ims = [lade(b["url"]) for b in bilder[:a.max_bilder]]
        src = os.path.join(td, "src.mp4")
        diashow(ims, a.dauer, src)
        env = dict(os.environ, DUR=str(int(a.dauer)), LAUTHEIT_2PASS="1")
        stimme = {}
        if not a.ohne_stimme:
            wav = os.path.join(td, "vo.wav")
            r = subprocess.run([sys.executable, os.path.join(HIER, "voiceover.py"), "--out", wav, "--hook", a.hook,
                                "--name", re.split(r"\s[–—·|]\s", d["title"])[0], "--preis", f"{preis:.2f}", "--motor", "azure",
                                "--stimme", a.stimme, "--max", str(a.dauer - 1.5)], capture_output=True, text=True)
            try:
                stimme = json.loads(r.stdout.strip().split("\n")[-1])
            except Exception:
                stimme = {"ok": False, "fehler": r.stderr[-200:]}
            if stimme.get("ok") and os.path.exists(wav):
                env["STIMME"] = wav
        m, ein = musik_wahl(a.musik)
        env["MUSIK_START"] = str(ein)
        subprocess.run(["bash", os.path.join(HIER, "make_reel.sh"), src, out, z1, z2, f"CHF {preis:.2f}", a.hook,
                        os.path.join(REPO, "automation/music", m)], check=True, env=env, stdin=subprocess.DEVNULL)  # ffmpeg frisst sonst stdin einer Schleife
    tor = subprocess.run([sys.executable, os.path.join(REPO, "automation/meisterwerk_tor.py"), out], capture_output=True, text=True,
                         env=dict(os.environ, PREIS_SOLL=f"{preis:.2f}"))
    tj = {}
    try:
        tj = json.loads(tor.stdout.strip().split("\n")[-1])
    except Exception:
        pass
    print(json.dumps({"datei": out, "titel": d["title"], "preis": preis, "bilder": min(len(bilder), a.max_bilder), "musik": m,
                      "stimme": stimme.get("text") if stimme.get("ok") else None, "tor_ok": tj.get("ok"),
                      "tor_gruende": tj.get("gruende")}, ensure_ascii=False))
    return 0 if tj.get("ok") else 4


def freigeben(a):
    """Erst nach Sichtprüfung: Shopify-CDN-Upload + Zeile in automation/reels_seed.csv (ready, instagram,facebook)."""
    d, _ = produkt(a.handle)
    preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    env = dict(os.environ, SHOPIFY_SHOP="au3j0y-hq.myshopify.com", SHOPIFY_ADMIN_TOKEN=tok)
    env.pop("SHOPIFY_CLIENT_ID", None); env.pop("SHOPIFY_CLIENT_SECRET", None)
    url = subprocess.run(["/opt/node22/bin/node", os.path.join(REPO, "automation/upload_to_shopify_cdn.mjs"), a.freigeben,
                          f"Bild-Reel {d['title'][:60]}"], capture_output=True, text=True, env=env, timeout=300).stdout.strip().split("\n")[-1]
    if not url.startswith("https://cdn.shopify.com/"):
        sys.exit(f"⛔ CDN-Upload gescheitert: {url[:120]}")
    rid = f"bildreel-{a.handle}"
    csvp = os.path.join(REPO, "automation/reels_seed.csv")
    csv = open(csvp, encoding="utf-8").read()
    if re.search("^" + re.escape(rid) + ",", csv, re.M):
        sys.exit(f"(steht schon in der Queue: {rid})")
    tags = subprocess.run(["/opt/node22/bin/node", "-e",
                           "import('./automation/lib/hashtags.mjs').then(m=>console.log(m.hashtagText(process.argv[1])))", d["title"]],
                          capture_output=True, text=True, cwd=REPO).stdout.strip() or "#luxestyle #shoppingschweiz"
    cap = (f"{d['title']}\nCHF {preis:.2f} · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭\n"
           f"🔗 luxestyle.ch/products/{a.handle} (Link in Bio)")
    esc = lambda x: '"' + x.replace('"', '""') + '"' if re.search(r'[",\n]', x) else x
    from datetime import date
    if not csv.endswith("\n"):
        csv += "\n"
    csv += ",".join([rid, date.today().isoformat(), url, esc(cap), esc(tags), esc("instagram,facebook"), "ready", "", ""]) + "\n"
    open(csvp, "w", encoding="utf-8").write(csv)
    print(json.dumps({"id": rid, "url": url}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--handle", required=True)
    ap.add_argument("--hook", default="Schon gesehen?")
    ap.add_argument("--musik", default="")
    ap.add_argument("--stimme", default="de-CH-JanNeural")
    ap.add_argument("--dauer", type=float, default=11.0)
    ap.add_argument("--max-bilder", type=int, default=7)
    ap.add_argument("--out-dir", default="/tmp/bildreel")
    ap.add_argument("--ohne-stimme", action="store_true")
    ap.add_argument("--weg", default="", help="Bildindizes (product.media, nur Bilder ≥ 600 px) weglassen, z. B. 4,5")
    ap.add_argument("--freigeben", default="")
    a = ap.parse_args()
    if a.freigeben:
        return freigeben(a)
    return render(a)


if __name__ == "__main__":
    sys.exit(main() or 0)
