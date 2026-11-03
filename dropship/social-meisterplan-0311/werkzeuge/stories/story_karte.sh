#!/usr/bin/env bash
# Story-Karte: ein Instagram-/Facebook-Story-Bild, JPG 1080x1920 (sRGB, Qualität 92). Ohne Stimme, ohne Musik; ALLES steht im Bild.
# Das Skript schreibt NUR die lokale JPG. Keine Queue, kein Upload, kein Git, keine Konten.
#
# Aufruf:   story_karte.sh QUELLE HOOK ZUSATZ LAYOUT AUSGABE
#   QUELLE   https-Bildadresse (wird auf HTTP 200 geprüft, SHA-256 wird gemeldet) oder lokale Datei
#   HOOK     gross, höchstens 2 Zeilen je höchstens 16 Zeichen, mindestens 96 px; Zeilenwechsel mit | (sonst automatisch); KEIN Produktname
#   ZUSATZ   darunter, mindestens 56 px, höchstens 28 Zeichen je Zeile (höchstens 2 Zeilen, Wechsel mit |): ein belegter Fakt aus dem Produkttext
#   LAYOUT   1 = Hook oben (zentriert)  ·  2 = Hook unten links  ·  3 = Karte mit halbtransparentem Balken (zentriert)
#   AUSGABE  Zieldatei .jpg
# Unten klein: «LuxeStyle · luxestyle.ch/ig» (46 px; «.ch» im Gold-Braun der Marke).
# Optionen (Umgebung):
#   TON=hell|dunkel     hell = beiges Verlaufs-/Kartenband, dunkle Schrift  ·  dunkel = braungraues Band, beige Schrift (Vorgabe: Layout 3 hell, sonst dunkel)
#   MODUS=auto|fill|fit auto: Zuschnitt auf 9:16 (fill) nur, wenn das Foto dafür höchstens 1,55-fach hochgezogen werden muss UND mindestens 700 px kurze Seite hat;
#                       sonst fit = Foto auf Breite eingepasst, Rest unscharf GESPIEGELT hinterlegt (nahtlos, Foto-Kanten weich ausgeblendet)
#   FOKUS_X FOKUS_Y     0..1, Zuschnitt-Schwerpunkt im fill-Modus (Vorgabe 0.5)   ·   FOTO_Y  Mittelpunkt des Fotos im fit-Modus in px (Vorgabe je Layout)
#   CROP=x:y:breite:hoehe   Ausschnitt im QUELLBILD vorab (z. B. um winzige Fremdschrift am Rand wegzulassen)
#   FITW  Fotobreite im fit-Modus in px (Vorgabe 1080)   ·   BODEN=dunkel|hell  ruhiges Band unter der Karte (Layout 3)
#   MIRROR  Breite des gespiegelten Randbands in px (Vorgabe 150; kleiner, wenn Produktteile nahe am Fotorand sonst als Fleck erscheinen)
#   BGMIX  Anteil der Gesamtfarbe in der Hinterlegung 0..1 (Vorgabe 0.30; 0 bei reinweissem Freisteller)
#   BLUR (Vorgabe 56)   FOOTER (Vorgabe «LuxeStyle · luxestyle.ch/ig»; muss «luxestyle.ch» enthalten)   PRODUKT  Produktname (nur Warnung, wenn ein Hook-Wort darin vorkommt)
#   SHA  erwartete SHA-256 der Quelle (Abbruch bei Abweichung)   ·   TROCKEN=1  nur prüfen (Text, Lint, Geometrie), nichts schreiben
# NEU in v2 (alle optional, ohne sie ist die Ausgabe bitgleich zur ersten Fassung):
#   ZUS_SIZE=54   feste Zusatz-Schriftgrösse in px (Vorgabe: grösste von 60..56, die in 900 px passt)  ·  LUFT=20  Mindestabstand der zentrierten Texte zu x 90 und x 990
#   HOOKW=820     höchste Breite einer Hook-Zeile in px (Vorgabe 900)  ·  CARD_X=90  Abstand der Karte (Layout 3) zum Bildrand (Vorgabe 60)  ·  CARD_B=1570  Unterkante der Karte (Vorgabe 1560)
#   BGKLAR=1      Hinterlegung nur aus dem Rand des Fotos (Coons-Fläche aus den vier Rändern, glatt) statt aus dem ganzen Foto: kein Produktschatten oben/unten
#   BGFARBE=auto|R,G,B   einfarbige Hinterlegung (auto = Median der obersten 24 Zeilen des Fotos, also die Wandfarbe)
#   FEDER=72      Breite der weichen Foto-Kante oben/seitlich in px (Vorgabe 36)  ·  FEDER_U  dasselbe unten (Vorgabe = FEDER)
# NEU in Runde 2 (alle optional):
#   ACC_FOOT=R,G,B   Farbe des «.ch» in der Fusszeile (Vorgabe = Akzentfarbe; fuer 4,5:1 auf hellem Grund dunkler waehlen)  ·  FUSS_Y=1568  Grundlinie der Fusszeile in px (Layout 1 und 2; Vorgabe 1548)
#   SCRIM_U=y0:y1:alpha   unterer Verlauf in Layout 1 (Vorgabe 1330:1640:0.88)  ·  CONTRAST_MIN=4.5  Abbruch (Exit 2), wenn «.ch» oder die Fusszeile im schlechtesten Pixel des Hintergrunds darunter liegt
#   FOTO_BIS=y     das scharfe Foto wird ab Zeile y hart abgeschnitten (darunter nur Hinterlegung): y = Kartenoberkante, damit nichts durch die halbtransparente Karte schimmert (Layout 3)
#   Kontrast: das Skript misst fuer jede Textzeile (und «.ch» einzeln) den WCAG-Kontrast gegen jedes Hintergrundpixel der Textbox (schlechtestes Pixel / Median) und gibt ihn aus.
# Text-Lint (Exit 2): Preis, CHF, Rabatt, Prozent, Lieferung, Tage, Werktage, Sterne, Bewertung, gratis, wasserdicht, gesund, Schlaf, Augen, Limited, Designer, Echt
#   (+ Versand, kostenlos, Garantie, Rückgabe, geprüft, Schweizer, Liechtenstein, Fasnacht, Weihnacht, DPD, Bestseller, einzig, Euro/Dollar-Zeichen, Ziffern mit Einheit).
#   Verboten ausserdem: ' : % \ " und Emoji (Schrift kennt sie nicht). Sicherheitsrand Instagram: oben 250, unten 340, links/rechts 90 px: alle Texte y 250..1580 (Exit 2 sonst).
set -euo pipefail
fail() { echo "FEHLER: $*" >&2; exit 2; }
[ "$#" -eq 5 ] || fail "Aufruf: story_karte.sh QUELLE HOOK ZUSATZ LAYOUT AUSGABE"
QUELLE="$1"; HOOK="$2"; ZUSATZ="$3"; LAYOUT="$4"; AUSGABE="$5"
case "$LAYOUT" in 1|2|3) ;; *) fail "LAYOUT muss 1, 2 oder 3 sein: «$LAYOUT»" ;; esac
case "$AUSGABE" in *.jpg|*.jpeg) ;; *) fail "AUSGABE muss auf .jpg enden" ;; esac
for cmd in ffprobe curl sha256sum; do command -v "$cmd" >/dev/null || fail "$cmd fehlt"; done
[ -f /usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf ] && [ -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf ] || fail "DejaVu-Schriften fehlen (wie reel_karte.sh)"
PY=""
for c in /usr/bin/python3; do command -v "$c" >/dev/null 2>&1 && "$c" -c 'import PIL.Image, PIL.ImageCms, numpy' >/dev/null 2>&1 && { PY="$c"; break; }; done
[ -n "$PY" ] || fail "kein /usr/bin/python3 mit Pillow und numpy gefunden"
work="$(mktemp -d)"; trap 'rm -rf -- "$work"' EXIT
quelle_datei="$work/quelle"
case "$QUELLE" in
  https://*)
    code="$(curl --location --silent --show-error --max-time 60 --output "$quelle_datei" --write-out '%{http_code}' "$QUELLE")" || fail "Download fehlgeschlagen: $QUELLE"
    [ "$code" = 200 ] || fail "Bildadresse liefert HTTP $code (erwartet 200): $QUELLE" ;;
  *) [ -f "$QUELLE" ] || fail "Quelldatei fehlt: $QUELLE"; cp -- "$QUELLE" "$quelle_datei" ;;
esac
sha="$(sha256sum "$quelle_datei" | cut -d' ' -f1)"
[ -z "${SHA:-}" ] || [ "$SHA" = "$sha" ] || fail "SHA-256 weicht ab: erwartet $SHA, gefunden $sha"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$quelle_datei" >/dev/null || fail "Quelle ist kein Bild"
echo "Quelle: $QUELLE"; echo "SHA-256: $sha"
mkdir -p "$(dirname -- "$AUSGABE")"
STORY_QUELLE="$quelle_datei" STORY_HOOK="$HOOK" STORY_ZUSATZ="$ZUSATZ" STORY_LAYOUT="$LAYOUT" STORY_OUT="$AUSGABE" "$PY" -I - <<'PYEOF'
import os, sys, re, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops, ImageOps, ImageCms

def fail(msg):
    sys.stderr.write("FEHLER: %s\n" % msg); sys.exit(2)

W, H = 1080, 1920
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 90, 990, 250, 1580
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BEIGE, DARK = (243, 238, 231), (48, 42, 37)
GOLD_L, GOLD_D = (139, 115, 85), (201, 171, 124)   # .ch auf Hell (am Shop-Logo gemessen, rund 8B7355) / aufgehellt auf Dunkel

env = os.environ
hook_in, zusatz_in = env["STORY_HOOK"], env["STORY_ZUSATZ"]
layout = int(env["STORY_LAYOUT"])
footer = env.get("FOOTER") or "LuxeStyle · luxestyle.ch/ig"
ton = env.get("TON") or ("hell" if layout == 3 else "dunkel")
modus = env.get("MODUS") or "auto"
if ton not in ("hell", "dunkel"): fail("TON muss hell oder dunkel sein")
if modus not in ("auto", "fill", "fit"): fail("MODUS muss auto, fill oder fit sein")
import numpy as np
zus_fix = int(env["ZUS_SIZE"]) if env.get("ZUS_SIZE") else None
luft = int(env.get("LUFT", 0))
hookw = int(env.get("HOOKW", 900))
card_x = int(env.get("CARD_X", 60))
card_b_env = int(env.get("CARD_B", 1560))
fuss_y_env = int(env["FUSS_Y"]) if env.get("FUSS_Y") else None
cmin = float(env.get("CONTRAST_MIN", 0))
acc_foot_env = tuple(int(v) for v in env["ACC_FOOT"].split(",")) if env.get("ACC_FOOT") else None
scrim_u = [float(v) for v in env.get("SCRIM_U", "1330:1640:0.88").split(":")]

# ---------- Text prüfen ----------
VERBOTEN = ["preis", "chf", "rabatt", "prozent", "lieferung", "tage", "werktage", "stern", "bewertung", "gratis", "wasserdicht", "gesund",
            "schlaf", "augen", "limited", "designer", "echt",
            "versand", "kostenlos", "garantie", "rückgabe", "rueckgabe", "geprüft", "geprueft", "schweizer", "liechtenstein", "fasnacht",
            "weihnacht", "dpd", "bestseller", "einzig", "€", "$", "euro", "dollar"]
def lint(name, s):
    low = s.lower()
    for w in VERBOTEN:
        if w in low: fail("%s enthält das verbotene Wort «%s»: «%s»" % (name, w, s))
    if re.search(r"\d\s*(%|chf|fr\b|\.-|tage|tagen|std|stunden|monat|jahr|woche)", low): fail("%s enthält Zahl mit Einheit/Preis/Frist: «%s»" % (name, s))
    for ch in s:
        if ch in "':%\\\"": fail("%s enthält das verbotene Zeichen %r: «%s»" % (name, ch, s))
        if ord(ch) > 0x2FFF or (0x2190 <= ord(ch) <= 0x2BFF): fail("%s enthält ein Emoji/Sonderzeichen: %r" % (name, ch))
        if ch == "ß": fail("%s: Schweizer Rechtschreibung, ss statt ß: «%s»" % (name, s))
for n, s in (("HOOK", hook_in), ("ZUSATZ", zusatz_in), ("FOOTER", footer)): lint(n, s)
if "luxestyle.ch" not in footer.lower(): fail("FOOTER muss luxestyle.ch enthalten")

def split_lines(s, maxc, name, maxlines, auto=True):
    if "|" in s: lines = [x.strip() for x in s.split("|")]
    elif len(s) <= maxc: lines = [s.strip()]
    elif not auto: fail("%s länger als %d Zeichen (%d): «%s» (zwei Zeilen nur mit | angeben)" % (name, maxc, len(s), s))
    else:
        best = None
        for i, ch in enumerate(s):
            if ch == " ":
                a, b = s[:i].strip(), s[i + 1:].strip()
                if len(a) <= maxc and len(b) <= maxc and (best is None or abs(len(a) - len(b)) < abs(len(best[0]) - len(best[1]))): best = (a, b)
        if best is None: fail("%s lässt sich nicht in %d Zeilen zu je höchstens %d Zeichen teilen: «%s»" % (name, maxlines, maxc, s))
        lines = list(best)
    if not 1 <= len(lines) <= maxlines or any(not x for x in lines): fail("%s: 1 bis %d nichtleere Zeilen erlaubt: «%s»" % (name, maxlines, s))
    for x in lines:
        if len(x) > maxc: fail("%s: Zeile länger als %d Zeichen (%d): «%s»" % (name, maxc, len(x), x))
    return lines
hook_lines = split_lines(hook_in, 16, "HOOK", 2)
zusatz_lines = split_lines(zusatz_in, 28, "ZUSATZ", 2, auto=False)
prod = env.get("PRODUKT", "")
if prod:
    pw = set(re.findall(r"[a-zäöüß]{4,}", prod.lower()))
    gem = [w for w in re.findall(r"[a-zäöüß]{4,}", " ".join(hook_lines).lower()) if w in pw]
    if gem: sys.stderr.write("HINWEIS: Hook-Wort(e) stehen im Produktnamen: %s\n" % ", ".join(gem))

def F(path, size): return ImageFont.truetype(path, size)
def width(f, s): return f.getlength(s)
def cap(f): return -f.getbbox("H", anchor="ls")[1]
# Hook: grösste Schrift 96..112 px, bei der jede Zeile in 900 px passt
hook_size = None
for sz in range(112, 95, -2):
    f = F(SERIF, sz)
    if all(width(f, l) <= hookw for l in hook_lines): hook_size = sz; break
if hook_size is None: fail("HOOK passt nicht in %d px bei mindestens 96 px (kürzere Wörter wählen): %r" % (hookw, hook_lines))
hf = F(SERIF, hook_size)
zus_size = None
for sz in ([zus_fix] if zus_fix else range(60, 55, -1)):
    f = F(SANS, sz)
    if all(width(f, l) <= SAFE_R - SAFE_L - 2 * luft for l in zusatz_lines): zus_size = sz; break
if zus_size is None: fail("ZUSATZ passt nicht in %d px bei der verlangten Schriftgrösse: %r" % (SAFE_R - SAFE_L - 2 * luft, zusatz_lines))
zf = F(SANS, zus_size)
foot_size = None
for sz in range(48, 43, -1):
    f = F(SERIF, sz)
    if width(f, footer) <= SAFE_R - SAFE_L: foot_size = sz; break
if foot_size is None: fail("FOOTER passt nicht in 900 px bei mindestens 44 px")
ff = F(SERIF, foot_size)

# ---------- Foto laden ----------
src = Image.open(env["STORY_QUELLE"]); src = ImageOps.exif_transpose(src)
if src.mode in ("RGBA", "LA", "P"):
    src = src.convert("RGBA"); bgw = Image.new("RGBA", src.size, (255, 255, 255, 255)); src = Image.alpha_composite(bgw, src)
src = src.convert("RGB")
if env.get("CROP"):
    m = re.fullmatch(r"(\d+):(\d+):(\d+):(\d+)", env["CROP"])
    if not m: fail("CROP muss x:y:breite:hoehe sein")
    x, y, w, h = map(int, m.groups())
    if x + w > src.width or y + h > src.height: fail("CROP liegt ausserhalb des Bildes (%dx%d)" % src.size)
    src = src.crop((x, y, x + w, y + h))
sw, sh = src.size
fill_scale = max(W / sw, H / sh)
if modus == "auto": modus = "fill" if (fill_scale <= 1.55 and min(sw, sh) >= 700) else "fit"
if modus == "fill" and min(sw, sh) < 700: fail("fill mit einem Bild unter 700 px kurzer Seite ist nicht erlaubt (fit verwenden)")
print("Quellbild %dx%d, Modus %s (Hochzieh-Faktor fill %.2f)" % (sw, sh, modus, fill_scale))

def unsharp_if_up(im, s):
    return im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2)) if s > 1.15 else im

if modus == "fill":
    s = fill_scale
    im = src.resize((math.ceil(sw * s), math.ceil(sh * s)), Image.LANCZOS); im = unsharp_if_up(im, s)
    fx, fy = float(env.get("FOKUS_X", 0.5)), float(env.get("FOKUS_Y", 0.5))
    left = int(round(min(max(fx * im.width - W / 2, 0), im.width - W))); top = int(round(min(max(fy * im.height - H / 2, 0), im.height - H)))
    canvas = im.crop((left, top, left + W, top + H))
else:
    s = min((int(env['FITW']) if env.get('FITW') else W) / sw, 1.4)
    pw_, ph_ = max(1, round(sw * s)), max(1, round(sh * s))
    p = src.resize((pw_, ph_), Image.LANCZOS); p = unsharp_if_up(p, s)
    cy = int(env.get("FOTO_Y") or {1: 1090, 2: 690, 3: 640}[layout])
    px, py = (W - pw_) // 2, cy - ph_ // 2
    # Hinterlegung: Foto-Rand GESPIEGELT (MIRROR px breit, nahtlos), danach die letzte gespiegelte Zeile/Spalte gestreckt bis zum Kartenrand
    # (so entstehen keine Geisterbilder des Produkts), dann stark unscharf und leicht zur Gesamtfarbe hin gemischt.
    MIRROR = int(env.get("MIRROR", 150))
    def extend_h(im, left, right):
        w_, h_ = im.size; out = Image.new("RGB", (left + w_ + right, h_)); out.paste(im, (left, 0))
        m = min(MIRROR, w_)
        if left > 0:
            band = ImageOps.mirror(im.crop((0, 0, min(m, left), h_))); out.paste(band, (left - band.width, 0))
            if left > band.width: out.paste(band.crop((0, 0, 1, h_)).resize((left - band.width, h_)), (0, 0))
        if right > 0:
            band = ImageOps.mirror(im.crop((w_ - min(m, right), 0, w_, h_))); out.paste(band, (left + w_, 0))
            if right > band.width: out.paste(band.crop((band.width - 1, 0, band.width, h_)).resize((right - band.width, h_)), (left + w_ + band.width, 0))
        return out
    def extend_v(im, top, bottom):
        w_, h_ = im.size; out = Image.new("RGB", (w_, top + h_ + bottom)); out.paste(im, (0, top))
        m = min(MIRROR, h_)
        if top > 0:
            band = ImageOps.flip(im.crop((0, 0, w_, min(m, top)))); out.paste(band, (0, top - band.height))
            if top > band.height: out.paste(band.crop((0, 0, w_, 1)).resize((w_, top - band.height)), (0, 0))
        if bottom > 0:
            band = ImageOps.flip(im.crop((0, h_ - min(m, bottom), w_, h_))); out.paste(band, (0, top + h_))
            if bottom > band.height: out.paste(band.crop((0, band.height - 1, w_, band.height)).resize((w_, bottom - band.height)), (0, top + h_ + band.height))
        return out
    def coons(im, k=41):
        # glatte Flaeche nur aus den vier Fotorändern (je 3 äusserste Pixellinien gemittelt, entlang des Rands geglättet): enthält nichts vom Produkt
        a = np.asarray(im).astype(float); h_, w_ = a.shape[:2]
        def sm1(v):
            pad = k // 2; vp = np.concatenate([np.repeat(v[:1], pad, 0), v, np.repeat(v[-1:], pad, 0)])
            c = np.cumsum(np.vstack([np.zeros((1, 3)), vp]), axis=0); return (c[k:] - c[:-k]) / k
        T, B = sm1(a[:3].mean(axis=0)), sm1(a[-3:].mean(axis=0)); Lf, Rt = sm1(a[:, :3].mean(axis=1)), sm1(a[:, -3:].mean(axis=1))
        u = np.linspace(0, 1, w_)[None, :, None]; v = np.linspace(0, 1, h_)[:, None, None]
        p00, p10, p01, p11 = (T[0] + Lf[0]) / 2, (T[-1] + Rt[0]) / 2, (B[0] + Lf[-1]) / 2, (B[-1] + Rt[-1]) / 2
        C = (1 - v) * T[None] + v * B[None] + (1 - u) * Lf[:, None] + u * Rt[:, None] - ((1 - u) * (1 - v) * p00 + u * (1 - v) * p10 + (1 - u) * v * p01 + u * v * p11)
        return Image.fromarray(C.clip(0, 255).round().astype("uint8"))
    pb = coons(p) if env.get("BGKLAR") == "1" else p
    wide = extend_h(pb, px, W - px - pw_)
    tall = extend_v(wide, max(py, 0), max(H - py - ph_, 0))
    if py < 0: tall = tall.crop((0, -py, W, -py + H))
    elif tall.height > H: tall = tall.crop((0, 0, W, H))
    bgb = tall.filter(ImageFilter.GaussianBlur(int(env.get("BLUR", 56))))
    bg = Image.blend(bgb, bgb.filter(ImageFilter.GaussianBlur(170)), float(env.get("BGMIX", 0.30)))
    if env.get("BGFARBE"):
        if env["BGFARBE"] == "auto": col = tuple(int(v) for v in np.median(np.asarray(p)[:24].reshape(-1, 3), axis=0))
        else: col = tuple(int(v) for v in env["BGFARBE"].split(","))
        bg = Image.new("RGB", (W, H), col); print("Hinterlegung einfarbig", col)
    # scharfes Foto mit weich ausgeblendeten Kanten (nur dort, wo es nicht am Rand der Karte endet)
    mask = Image.new("L", (pw_, ph_), 255); md = ImageDraw.Draw(mask)
    feather = int(env.get("FEDER", 36)); feather_u = int(env.get("FEDER_U", feather))   # FEDER: oben/seitlich, FEDER_U: unten (Vorgabe 36 px, wie in der ersten Fassung)
    for k in range(max(feather, feather_u)):
        a = int(255 * (k + 1) / feather); au = int(255 * (k + 1) / feather_u)
        if k < feather: md.line([(0, k), (pw_, k)], fill=min(a, 255))
        if k < feather_u: md.line([(0, ph_ - 1 - k), (pw_, ph_ - 1 - k)], fill=min(au, 255))
        if pw_ < W and k < feather:
            md.line([(k, 0), (k, ph_)], fill=min(mask.getpixel((k, ph_ // 2)), a)); md.line([(pw_ - 1 - k, 0), (pw_ - 1 - k, ph_)], fill=min(mask.getpixel((pw_ - 1 - k, ph_ // 2)), a))
    if env.get("FOTO_BIS"):
        cut = int(env["FOTO_BIS"]) - py
        if 0 <= cut < ph_: md.rectangle([0, cut, pw_, ph_], fill=0)
        FOTO_BIS = int(env["FOTO_BIS"])
    canvas = bg.copy(); canvas.paste(p, (px, py), mask)
    print("Foto %dx%d bei y=%d..%d (Faktor %.2f)" % (pw_, ph_, py, py + ph_, s))

canvas = canvas.convert("RGBA")
if ton == "hell": scrim_c, txt_c, acc_c = BEIGE, DARK, GOLD_L
else: scrim_c, txt_c, acc_c = DARK, BEIGE, GOLD_D
acc_f = acc_foot_env or acc_c   # Farbe des «.ch» in der Fusszeile

def smooth(t): t = min(max(t, 0.0), 1.0); return t * t * (3 - 2 * t)
def vgrad(y0, a0, y1, a1):
    col = Image.new("L", (1, H))
    col.putdata([int(255 * (a0 + (a1 - a0) * smooth((y - y0) / float(y1 - y0)))) for y in range(H)])
    return col.resize((W, H))
def add_scrim(im, mask):
    layer = Image.new("RGBA", (W, H), scrim_c + (0,)); layer.putalpha(mask); return Image.alpha_composite(im, layer)

# ---------- Geometrie ----------
hcap, zcap, fcap = cap(hf), cap(zf), cap(ff)
hpitch, zpitch = round(hook_size * 1.13), round(zus_size * 1.26)
RULE_W, RULE_H = 96, 4
centered = layout in (1, 3)
items = []   # (text, font, color, x, baseline)
rules = []   # (x0, y0, x1, y1, color_rgba)
def xpos(f, s, left_x):
    return (W - width(f, s)) / 2 if centered else left_x

if layout == 1:
    top = 292
    hb = [top + hcap + i * hpitch for i in range(len(hook_lines))]
    rule_y = hb[-1] + 46
    zb = [rule_y + RULE_H + 40 + zcap + i * zpitch for i in range(len(zusatz_lines))]
    fb = fuss_y_env or 1548; left_x = SAFE_L
    canvas = add_scrim(canvas, ImageChops.lighter(vgrad(0, 0.80, zb[-1] + 170, 0.0), vgrad(int(scrim_u[0]), 0.0, int(scrim_u[1]), scrim_u[2])))
elif layout == 2:
    left_x = SAFE_L; fb = fuss_y_env or 1548
    zb_last = fb - fcap - 78
    zb = [zb_last - (len(zusatz_lines) - 1 - i) * zpitch for i in range(len(zusatz_lines))]
    rule_y = zb[0] - zcap - 40 - RULE_H
    hb_last = rule_y - 46
    hb = [hb_last - (len(hook_lines) - 1 - i) * hpitch for i in range(len(hook_lines))]
    htop = hb[0] - hcap
    canvas = add_scrim(canvas, vgrad(htop - 190, 0.0, htop + 30, 0.90))
else:
    left_x = SAFE_L; card_b = card_b_env; fb = card_b - 64
    hair_y = fb - fcap - 36
    zb_last = hair_y - 42
    zb = [zb_last - (len(zusatz_lines) - 1 - i) * zpitch for i in range(len(zusatz_lines))]
    rule_y = zb[0] - zcap - 40 - RULE_H
    hb_last = rule_y - 46
    hb = [hb_last - (len(hook_lines) - 1 - i) * hpitch for i in range(len(hook_lines))]
    card_t = hb[0] - hcap - 66
    if env.get("FOTO_BIS") and int(env["FOTO_BIS"]) != card_t: print("HINWEIS: FOTO_BIS=%s, Kartenoberkante liegt bei y %d (abweichend)" % (env["FOTO_BIS"], card_t))
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rectangle([card_x, card_t, W - card_x, card_b], fill=scrim_c + (int(255 * 0.88),))
    cd.rectangle([card_x + 16, card_t + 16, W - card_x - 16, card_b - 16], outline=acc_c + (235,), width=2)
    canvas = Image.alpha_composite(canvas, card)
    if env.get("BODEN") in ("dunkel", "hell"):   # ruhiger Boden unter der Karte
        bc = DARK if env["BODEN"] == "dunkel" else BEIGE
        gl = Image.new("RGBA", (W, H), bc + (0,)); gl.putalpha(vgrad(card_b - 10, 0.0, card_b + 190, 0.94)); canvas = Image.alpha_composite(canvas, gl)

for i, l in enumerate(hook_lines): items.append((l, hf, txt_c, xpos(hf, l, left_x), hb[i], "Hook"))
for i, l in enumerate(zusatz_lines): items.append((l, zf, txt_c if ton == "hell" else txt_c, xpos(zf, l, left_x), zb[i], "Zusatz"))
rx = (W - RULE_W) / 2 if centered else left_x
rules.append((rx, rule_y, rx + RULE_W, rule_y + RULE_H, acc_c + (255,)))
if layout == 3: rules.append((card_x + 50, hair_y, W - card_x - 50, hair_y + 2, acc_c + (150,)))
if layout == 2: rules.append((left_x, fb - fcap - 46, left_x + 900, fb - fcap - 46 + 2, acc_c + (140,)))

# Fussleile: «.ch» in der Akzentfarbe
parts = []
low = footer.lower(); k = low.find("luxestyle.ch")
a, b, c = footer[:k + len("luxestyle")], footer[k + len("luxestyle"):k + len("luxestyle.ch")], footer[k + len("luxestyle.ch"):]
fw_total = width(ff, footer)
fx0 = (W - fw_total) / 2 if centered else left_x
parts = [(a, txt_c, fx0), (b, acc_f, fx0 + width(ff, a)), (c, txt_c, fx0 + width(ff, a + b))]

# ---------- Sicherheitsrand prüfen ----------
def check_box(name, f, s, x, base):
    l, t, r, bt = f.getbbox(s, anchor="ls")
    L, T, R, B = x + l, base + t, x + r, base + bt
    if luft and centered and (L < SAFE_L + luft - 0.5 or R > SAFE_R - luft + 0.5):
        fail("%s «%s» hat weniger als %d px Luft zu x %d / x %d (x %.0f..%.0f)" % (name, s, luft, SAFE_L, SAFE_R, L, R))
    if luft and layout == 3 and (L < card_x + 16 + 20 or R > W - card_x - 16 - 20):
        fail("%s «%s» liegt weniger als 20 px vom inneren Kartenrahmen (x %.0f..%.0f, Rahmen %d..%d)" % (name, s, L, R, card_x + 16, W - card_x - 16))
    if L < SAFE_L - 0.5 or R > SAFE_R + 0.5 or T < SAFE_T - 0.5 or B > SAFE_B + 0.5:
        fail("%s «%s» verletzt den Sicherheitsrand (x %.0f..%.0f, y %.0f..%.0f; erlaubt x %d..%d, y %d..%d)" % (name, s, L, R, T, B, SAFE_L, SAFE_R, SAFE_T, SAFE_B))
    return (L, T, R, B)
boxes = [check_box(n, f, s, x, bl) for (s, f, col, x, bl, n) in items]
boxes.append(check_box("Fusszeile", ff, footer, fx0, fb))
for (s_, f_, col_, x_, bl_, n_), b_ in zip(items, boxes): print("  Box %-6s x %.0f..%.0f  y %.0f..%.0f  (%s)" % (n_, b_[0], b_[2], b_[1], b_[3], s_))
print("  Box Fuss   x %.0f..%.0f  y %.0f..%.0f" % (boxes[-1][0], boxes[-1][2], boxes[-1][1], boxes[-1][3]))
for (x0, y0, x1, y1, _) in rules:
    if y0 < SAFE_T or y1 > SAFE_B: fail("Linie ausserhalb des Sicherheitsrands")
if layout == 3: print("Karte x %d..%d, y %.0f..%d%s" % (card_x, W - card_x, card_t, card_b, "" if card_x >= SAFE_L else "  HINWEIS: Karte ragt ueber den Sicherheitsrand 90..990 hinaus"))
print("Hook %d px (%s), Zusatz %d px (%s), Fuss %d px | Layout %d, Ton %s" % (hook_size, " / ".join(hook_lines), zus_size, " / ".join(zusatz_lines), foot_size, layout, ton))
print("Textbereich y %.0f..%.0f (erlaubt %d..%d), x %.0f..%.0f (erlaubt %d..%d)" % (min(b[1] for b in boxes), max(b[3] for b in boxes), SAFE_T, SAFE_B, min(b[0] for b in boxes), max(b[2] for b in boxes), SAFE_L, SAFE_R))
if env.get("TROCKEN") == "1": print("TROCKEN=1: nichts geschrieben"); sys.exit(0)

# ---------- Kontrast messen (WCAG 2.x, Textfarbe gegen jedes Hintergrundpixel der Textbox, vor dem Zeichnen des Textes) ----------
def _lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def _lum(rgb): return 0.2126 * _lin(rgb[..., 0]) + 0.7152 * _lin(rgb[..., 1]) + 0.0722 * _lin(rgb[..., 2])
_bg = np.asarray(canvas.convert("RGB")).astype(float)
_bgL = _lum(_bg)
def kontrast(name, f, s, x, base, col):
    l, t_, r, bt = f.getbbox(s, anchor="ls")
    x0, x1, y0, y1 = int(math.floor(x + l)), int(math.ceil(x + r)), int(math.floor(base + t_)), int(math.ceil(base + bt))
    reg = _bgL[y0:y1, x0:x1]
    lt = float(_lum(np.array(col, dtype=float)))
    hi, lo = np.maximum(reg, lt), np.minimum(reg, lt)
    cr = (hi + 0.05) / (lo + 0.05)
    worst, med = float(cr.min()), float(np.median(cr))
    print("  Kontrast %-10s worst %.2f  Median %.2f  (Box x %d..%d, y %d..%d)" % (name, worst, med, x0, x1, y0, y1))
    return worst
_cw = []
for (s, f, col, x, bl, n) in items: kontrast(n, f, s, x, bl, col)
for (s, col, x) in parts:
    if s.strip(): _cw.append(kontrast("Fuss«%s»" % s.strip()[:6], ff, s, x, fb, col))
if cmin and min(_cw) < cmin: fail("Kontrast der Fusszeile im schlechtesten Pixel %.2f liegt unter %.2f" % (min(_cw), cmin))

# ---------- Zeichnen ----------
tl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(tl)
for (x0, y0, x1, y1, col) in rules: td.rectangle([round(x0), round(y0), round(x1) - 1, round(y1) - 1], fill=col)
for (s, f, col, x, bl, n) in items: td.text((x, bl), s, font=f, fill=col + (255,), anchor="ls")
for (s, col, x) in parts:
    if s: td.text((x, fb), s, font=ff, fill=col + (255,), anchor="ls")
if ton == "dunkel" and layout != 3:   # feiner Schatten, damit helle Schrift auf bewegtem Foto sitzt
    sh_ = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh_.putalpha(tl.getchannel("A").filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.45)))
    canvas = Image.alpha_composite(canvas, ImageChops.offset(sh_, 0, 3))
canvas = Image.alpha_composite(canvas, tl).convert("RGB")
if canvas.size != (W, H): fail("interner Fehler: Grösse %r" % (canvas.size,))
icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
canvas.save(env["STORY_OUT"], "JPEG", quality=92, subsampling=0, optimize=True, icc_profile=icc, dpi=(72, 72))
print("geschrieben:", env["STORY_OUT"])
PYEOF
[ "${TROCKEN:-0}" = 1 ] || ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt:format=size -of default=nw=1 "$AUSGABE"
