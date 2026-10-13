#!/usr/bin/env python3
"""bild_reel.py — Reel aus den ORIGINAL-Produktbildern EINES Produkts, gross im Bild, mit Sprecherstimme (05.10.2026).

Betreiber 05.10.: «orginal video oder bilder bearbeiten mit stimme» + «mann sieht die bilder und videos sehr klein».
Gemessen vorher: in den Reels füllte das Produkt 23–32 % der Fläche (Fenster 600×780 bzw. 1080×608 auf 1080×1920).

Weg: Produktbilder (Shopify, ACTIVE, Preis live) → Ken-Burns-Diashow 1080×1920 (PIL, Sub-Pixel-Ausschnitt, Bild füllt
1080 breit bzw. 1060 hoch, unscharfer Grund aus demselben Bild) → Stimme über reel/voiceover.py (Azure, Werbelizenz;
ohne Schlüssel = ohne Stimme) → reel/make_reel.sh (Kopf, Hook, Titel, Preis, Musik, Ducking, -14 LUFS) →
meisterwerk_tor.py (Preis im Bild = PREIS_SOLL). Ergebnis + Kontaktbogen zum ANSEHEN; in die Queue erst mit --freigeben.

13.10.2026 (R2): Auswahl, Hook (Produktwort ≤ 24 Zeichen), Gemini-Jury und Freigabe macht automation/bild_reel_auswahl.py
(A/B-Test Bild- gegen Video-Reels, Tagesdeckel). Hier neu: Länge nach Bildzahl (dauer_fuer), gesprochener Hook ohne
Namenswiederholung, Titelzeilen ohne «…», Caption aus EINER Funktion (caption_fuer).

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


def freisteller(im, rand=0.06, schwelle=0.80):
    """Katalog-Freisteller = weisser Grund: am Bildrand sind mindestens `schwelle` der Pixel fast weiss (alle Kanaele >= 235).
    REEL-REGELN Regel 1 (03.06.2026): «KEINE weissen Katalog-Freisteller». Gemessen 11.10. am Sneaker-Reel: 0–4 s und 9–11 s
    zeigten Freisteller auf weissem Grund; die Model-Fotos dazwischen nicht."""
    g = im.convert("RGB").resize((120, 120))
    b = max(1, int(120 * rand)); px = g.load()
    rahmen = [px[x, y] for y in range(120) for x in range(120) if x < b or x >= 120 - b or y < b or y >= 120 - b]
    return sum(1 for p in rahmen if min(p) >= 235) / len(rahmen) >= schwelle


def produkt(handle, text_grenze=FREMDTEXT_GRENZE):
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
    # 13.10.2026: --text-grenze (Auswahl-Skript: 2) — «Green and Yellow» (3 Wörter) und Mass-Grafiken («Wide 140CM», «Long
    # 300CM»: 2 Wörter) lagen unter 4 und liessen die Hängematte bei der Jury durchfallen (4.33, «zusammengewürfelt»).
    bilder = [b for b in bilder if (lambda n: n is None or n < text_grenze)(fremdtext_woerter(b["url"]))]
    if len(bilder) < vorher:
        print(f"  {handle}: {vorher - len(bilder)} Bild(er) mit montiertem Text ausgelassen")
    # 11.10.2026: Katalog-Freisteller (weisser Grund) raus — REEL-REGELN Regel 1. Gilt vor dem Mindestwert von 2 Bildern.
    vorher = len(bilder)
    bilder = [b for b in bilder if not freisteller(lade(b["url"]))]
    if len(bilder) < vorher:
        print(f"  {handle}: {vorher - len(bilder)} Freisteller (weisser Grund) ausgelassen")
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


def dauer_fuer(n, wunsch=11):
    """13.10.2026 (R2, Bild-Reels als zweite Quelle): Länge nach Bildzahl. Das Tor verlangt Bewegung in jeder Sekunde
    (STILL ≤ 50 %); der Zoom-Weg wächst nur bis 0.38 je Bild — ein Bild länger als ~3.8 s steht praktisch still
    (Journal 05.10.: «≥ 0,1 Zoom je Sekunde»). Darum: übrige Bilder höchstens 3.5 s, Reel mindestens 8 s (Tor ≥ 6 s,
    Stimme braucht Platz), ganze Sekunden (make_reel.sh rechnet $((DUR-1))). n=3 → 8, n=4 → 8, n ≥ 5 → 11."""
    kurz = 1.0 if n >= 4 else 0.5
    return int(max(8, min(int(wunsch), kurz + 3.5 * max(1, n - (2 if n >= 4 else 1)))))


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


PRAEP_ENDE = re.compile(r"^(mit|für|fuer|fürs|aus|zum|zur|zu|in|im|ins|ohne|und|von|vom|gegen|bei|als|auf|an|am|unter|über|nach|je|pro|oder|&)$", re.I)


def zeilen(titel):
    """13.10.2026 (wie R9 Schritt 3 im Reel-Motor): Zeile 2 endet am letzten GANZEN Wort statt mit «…» (die Jury rügt
    «abgeschnitten»), und keine Zeile endet auf einer Präposition («Leselupe mit»)."""
    t = re.split(r"\s[–—·|]\s|,", titel)[0].strip()
    w, a, b = t.split(), "", ""
    for x in w:
        if (len((a + " " + x).strip()) <= 26 or not a) and not b:
            a = (a + " " + x).strip()
        elif len((b + " " + x).strip()) <= 30:
            b = (b + " " + x).strip()
        else:
            break

    def sauber(z):
        ws = z.rstrip(" ,;:–—-").split()
        while len(ws) > 1 and PRAEP_ENDE.match(ws[-1]):
            ws.pop()
        return " ".join(ws)
    wa = a.split()
    if b and len(wa) > 1 and PRAEP_ENDE.match(wa[-1]) and len(wa[-1] + " " + b) <= 30:
        b = wa.pop() + " " + b
        a = " ".join(wa)
    return sauber(a), sauber(b)


def sprech_hook(hook, name):
    """Wie sprechHook() im Reel-Motor (13.10.): der Produkt-Hook wiederholt oft den Namen («Leselupe mit LED-Licht» /
    «XXL Leselupe mit LED-Licht») — dann sagt die Stimme ihn nicht, sonst hört man den Namen zweimal."""
    n = name.lower()
    return "" if any(len(x) >= 4 and x.lower() in n for x in hook.split()) else hook


def caption_fuer(d, preis, handle):
    """Queue-Caption eines Bild-Reels. EINE Quelle für --freigeben und die Vor-Jury in bild_reel_auswahl.py: die Jury
    cacht sha1(Datei) + Caption, der Poster fragt mit der Queue-Caption — gleiche Caption = kein zweiter Gemini-Aufruf."""
    return (f"{d['title']}\nCHF {preis:.2f} · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭\n"
            f"🔗 luxestyle.ch/products/{handle} (Link in Bio)")


def musik_wahl(wunsch):
    gesperrt = {z.split("\t")[0] for z in open(os.path.join(REPO, "automation/music/_gesperrt.txt"), encoding="utf-8") if z.strip() and not z.startswith("#")}
    m = wunsch or "luxe-epic-elegant.wav"
    if m in gesperrt:
        sys.exit(f"⛔ Musik {m} gesperrt")
    ein = json.load(open(os.path.join(REPO, "automation/music/_einstiege.json"))).get(m, {}).get("einstiege", [0])
    return m, ein[0] if ein else 0


def render(a):
    d, bilder = produkt(a.handle, a.text_grenze)
    preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
    z1, z2 = zeilen(d["title"])
    os.makedirs(a.out_dir, exist_ok=True)
    out = os.path.join(a.out_dir, f"bildreel_{a.handle[:60]}.mp4")
    with tempfile.TemporaryDirectory() as td:
        weg = {int(x) for x in a.weg.split(",") if x.strip()}   # Sichtprüfung: Bildindex raus (Fremdmarke, Textbild)
        bilder = [b for i, b in enumerate(bilder) if i not in weg]
        ims = [lade(b["url"]) for b in bilder[:a.max_bilder]]
        dauer = dauer_fuer(len(ims), a.dauer)   # 13.10.: wenige Bilder = kürzer, sonst steht ein Bild > 3.8 s still (Tor STILL)
        src = os.path.join(td, "src.mp4")
        diashow(ims, dauer, src)
        env = dict(os.environ, DUR=str(dauer), LAUTHEIT_2PASS="1")
        stimme = {}
        if not a.ohne_stimme:
            wav = os.path.join(td, "vo.wav")
            name = re.split(r"\s[–—·|]\s", d["title"])[0]
            r = subprocess.run([sys.executable, os.path.join(HIER, "voiceover.py"), "--out", wav, "--hook", sprech_hook(a.hook, name),
                                "--name", name, "--preis", f"{preis:.2f}", "--motor", "azure",
                                "--stimme", a.stimme, "--max", str(dauer - 1.5)], capture_output=True, text=True)
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
    print(json.dumps({"datei": out, "titel": d["title"], "preis": preis, "bilder": min(len(bilder), a.max_bilder), "dauer": dauer, "musik": m,
                      "musik_start": ein, "stimme_name": a.stimme if stimme.get("ok") else None,
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
    cap = caption_fuer(d, preis, a.handle)
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
    ap.add_argument("--text-grenze", type=int, default=FREMDTEXT_GRENZE, help="Bild raus ab so vielen OCR-Wörtern (Standard 4)")
    ap.add_argument("--weg", default="", help="Bildindizes (product.media, nur Bilder ≥ 600 px) weglassen, z. B. 4,5")
    ap.add_argument("--freigeben", default="")
    a = ap.parse_args()
    if a.freigeben:
        return freigeben(a)
    return render(a)


if __name__ == "__main__":
    sys.exit(main() or 0)
