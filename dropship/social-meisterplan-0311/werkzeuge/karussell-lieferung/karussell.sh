#!/usr/bin/env bash
# Karussell «Ehrlich erklärt: so liefern wir» für Instagram/Facebook (LuxeStyle CH).
# Sechs Typografie-Karten, JPG 1080x1350 (4:5), ohne Produktfotos, ohne Stimme/Musik (stehendes Bild).
# Das Skript schreibt NUR lokale Dateien nach OUT_DIR (Vorgabe: /tmp/sm-lieferung/karussell). Kein Upload, keine Queue, kein Git, kein Shopify.
#
# Schrift: DejaVu Serif (Titel/Hauptaussage, Wortmarke fett) und DejaVu Sans (Nebentext) = dieselben Dateien wie dropship/reel-vorlage/reel_karte.sh.
# Farben (orientiert an luxestyle.ch, gemessen am Bildschirmfoto sirene_fold1.png: Text 2d2d2d, Akzent .ch = 8b7355; Reel-Vorlage: Beige f3eee7, Braungrau 302a25):
#   Hintergrund f3eee7 · Text 302a25 · Nebentext 544a40 · Akzent 8b7355 (gross) / 766043 (kleine Zeilen, bessere Lesbarkeit) · Rahmen c8bca9
# Mindestgrössen (Besitzervorgabe): Titel >= 88 px, Hauptaussage >= 64 px, Nebentext >= 44 px. Das Skript bricht ab, wenn eine Zeile darunter fällt.
# Rendern mit Pillow (nicht drawtext): Doppelpunkt, Guillemets und Gedankenstrich sind darum erlaubt. Keine Emoji im Bild.
# Aussagen und Belege: siehe Beleg-Liste im Bericht (Produktseiten und /pages/versand-lieferung, gelesen am 3.11.2026).
set -euo pipefail
OUT_DIR="${OUT_DIR:-/tmp/sm-lieferung/karussell}"
LOG="${LOG:-/tmp/sm-lieferung/karussell_textlog.json}"
fail() { echo "FEHLER: $*" >&2; exit 2; }
for cmd in ffprobe; do command -v "$cmd" >/dev/null || fail "$cmd fehlt"; done
for f in DejaVuSerif DejaVuSerif-Bold DejaVuSans; do [ -f "/usr/share/fonts/truetype/dejavu/$f.ttf" ] || fail "Schrift $f fehlt"; done
PY=""
for c in python3 /usr/bin/python3; do
  if command -v "$c" >/dev/null && "$c" -I -c 'import PIL.Image, PIL.ImageDraw, PIL.ImageFont' 2>/dev/null; then PY="$c"; break; fi
done
[ -n "$PY" ] || fail "kein python3 mit Pillow gefunden (getestet: python3, /usr/bin/python3)"
mkdir -p "$OUT_DIR"

"$PY" -I - "$OUT_DIR" "$LOG" <<'PY'
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

OUT, LOG = sys.argv[1], sys.argv[2]
W, H = 1080, 1350
FD = "/usr/share/fonts/truetype/dejavu/"
THEMES = {  # hell = Vorgabe; dunkel = Wechsel für Folie 4 und 6 (wie die dunkle Mittelkarte der Reel-Vorlage: Braungrau 302a25, Beige f3eee7, Rahmen 796c5d)
    "hell":   {"BG": (243, 238, 231), "FG": (48, 42, 37),    "SUB": (84, 74, 64),    "ACC": (139, 115, 85),  "ACC_D": (118, 96, 67),  "FR": (200, 188, 169)},
    "dunkel": {"BG": (48, 42, 37),    "FG": (243, 238, 231), "SUB": (214, 203, 186), "ACC": (205, 176, 130), "ACC_D": (205, 176, 130), "FR": (121, 108, 93)},
}
MIN = {"titel": 88, "haupt": 64, "neben": 44}
FILES = ["01_titel.jpg", "02_direktversand.jpg", "03_schweizer-lager.jpg", "04_versand.jpg", "05_bezahlen.jpg", "06_fragen.jpg"]
_fonts = {}
def font(key, size):
    k = (key, size)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(FD + {"serif": "DejaVuSerif", "serifb": "DejaVuSerif-Bold", "sans": "DejaVuSans"}[key] + ".ttf", size)
    return _fonts[k]

textlog = []
def cap(f): return -f.getbbox("H", anchor="ls")[1]          # Versalhöhe über der Grundlinie
def width(s, f, track=0): return sum(f.getlength(c) + track for c in s) - track if track else f.getlength(s)

class Card:
    def __init__(self, idx, dark=False):
        self.idx, self.t = idx, THEMES["dunkel" if dark else "hell"]
        self.im = Image.new("RGB", (W, H), self.t["BG"])
        self.d = ImageDraw.Draw(self.im)
        self.frame(); self.wordmark(); self.dots()
    def frame(self):
        self.d.rectangle([56, 56, W - 57, H - 57], outline=self.t["FR"], width=2)
    def wordmark(self):
        fb = font("serifb", 48); a, b = "LuxeStyle", ".ch"
        x0 = (W - (fb.getlength(a) + fb.getlength(b))) / 2; y = 150
        self.d.text((x0, y), a, font=fb, fill=self.t["FG"], anchor="ls"); self.d.text((x0 + fb.getlength(a), y), b, font=fb, fill=self.t["ACC"], anchor="ls")
        self.log("neben", 48, "LuxeStyle.ch")
    def dots(self):
        cy, r, gap = H - 112, 9, 40
        x0 = W / 2 - gap * 2.5
        for i in range(6):
            cx = x0 + i * gap
            box = [cx - r, cy - r, cx + r, cy + r]
            if i == self.idx: self.d.ellipse(box, fill=self.t["ACC"])
            else: self.d.ellipse(box, outline=self.t["FR"], width=2)
    def log(self, role, size, text):
        assert size >= MIN[role], f"Folie {self.idx+1}: {role} {size}px < {MIN[role]}px: {text}"
        textlog.append({"folie": self.idx + 1, "rolle": role, "px": size, "text": text})
    def text_line(self, s, key, size, fill, base, role, track=0, maxw=None, cx=W / 2):
        fill = self.t[fill] if isinstance(fill, str) else fill
        f = font(key, size)
        while maxw and width(s, f, track) > maxw and size > MIN[role]:
            size -= 2; f = font(key, size)
        assert not maxw or width(s, f, track) <= maxw + 1, f"Folie {self.idx+1}: «{s}» passt nicht in {maxw}px bei {size}px"
        assert size >= MIN[role], f"Folie {self.idx+1}: {role} {size}px < {MIN[role]}px: {s}"
        if track:
            x = cx - width(s, f, track) / 2
            for c in s:
                self.d.text((x, base), c, font=f, fill=fill, anchor="ls"); x += f.getlength(c) + track
        else:
            self.d.text((cx, base), s, font=f, fill=fill, anchor="ms")
        self.log(role, size, s)
        return size
    def stack(self, items, top=215, bottom=1135, shift=-10):
        """items: ('t', [zeilen], key, size, fill, role, kw) | ('g', px) | ('rule', breite, dicke, fill) | ('hl', breite). Vertikal mittig, gemessen von Versalkante bis Grundlinie."""
        def height(it):
            if it[0] == "g": return it[1]
            if it[0] == "rule": return it[2]
            if it[0] == "hl": return 2
            _, lines, key, size, fill, role, kw = it
            f = font(key, size); pitch = kw.get("pitch", 1.2) * size
            return cap(f) + pitch * (len(lines) - 1)
        total = sum(height(i) for i in items)
        y = top + (bottom - top - total) / 2 + shift
        self.stack_top, self.stack_bottom = y, y + total
        for it in items:
            if it[0] == "g": y += it[1]
            elif it[0] == "rule":
                self.d.rectangle([W / 2 - it[1] / 2, y, W / 2 + it[1] / 2, y + it[2] - 1], fill=self.t[it[3]]); y += it[2]
            elif it[0] == "hl":
                self.d.rectangle([W / 2 - it[1] / 2, y, W / 2 + it[1] / 2, y + 1], fill=self.t["FR"]); y += 2
            else:
                _, lines, key, size, fill, role, kw = it
                f = font(key, size); pitch = kw.get("pitch", 1.2) * size; base = y + cap(f)
                for ln in lines:
                    self.text_line(ln, key, size, fill, base, role, track=kw.get("track", 0), maxw=kw.get("maxw", 940))
                    base += pitch
                y += height(it)
    def save(self):
        p = os.path.join(OUT, FILES[self.idx])
        self.im.save(p, "JPEG", quality=95, subsampling=0, optimize=True, dpi=(72, 72))
        return p

def T(lines, key, size, fill, role, **kw):
    return ("t", lines if isinstance(lines, list) else [lines], key, size, fill, role, kw)
LABEL = lambda s: T(s, "sans", 44, "ACC_D", "neben", track=4)

cards = []
# Folie 1: Titel
c = Card(0)
c.stack([
    T("Ehrlich erklärt:", "serif", 116, "FG", "titel", maxw=940), ("g", 34),
    T("so liefern wir", "serif", 116, "ACC", "titel", maxw=940), ("g", 70),
    ("rule", 120, 3, "ACC"), ("g", 64),
    T(["Lieferung, Versand und Bezahlen", "auf einen Blick"], "sans", 48, "SUB", "neben", pitch=1.4),
])
# Hinweis «Wischen» + gezeichneter Pfeil (kein Textzeichen)
f44 = font("sans", 44); wsw = f44.getlength("Wischen"); ax = 62; x0 = W / 2 - (wsw + 28 + ax) / 2; by = 1190
c.d.text((x0, by), "Wischen", font=f44, fill=c.t["ACC_D"], anchor="ls"); c.log("neben", 44, "Wischen")
ay = by - cap(f44) / 2; xa = x0 + wsw + 28
c.d.line([xa, ay, xa + ax, ay], fill=c.t["ACC_D"], width=3); c.d.line([xa + ax - 16, ay - 13, xa + ax, ay], fill=c.t["ACC_D"], width=3); c.d.line([xa + ax - 16, ay + 13, xa + ax, ay], fill=c.t["ACC_D"], width=3)
cards.append(c)

# Folie 2: Direktversand aus Asien
c = Card(1)
c.stack([
    LABEL("DIREKTVERSAND AUS ASIEN"), ("g", 66),
    T("Lieferung", "serif", 76, "FG", "haupt"), ("g", 62),
    T("10–20", "serif", 236, "FG", "haupt", maxw=900), ("g", 46),
    T("Werktage", "serif", 104, "ACC", "haupt"), ("g", 66),
    ("rule", 120, 3, "ACC"), ("g", 56),
    T(["Das voraussichtliche Datum steht", "auf der Produktseite."], "sans", 48, "SUB", "neben", pitch=1.4), ("g", 62),
    T("Richtwert, kein garantierter Termin.", "sans", 44, "ACC_D", "neben", maxw=940),
])
cards.append(c)

# Folie 3: Artikel ab Schweizer Lager
c = Card(2)
c.stack([
    LABEL("AB SCHWEIZER LAGER"), ("g", 70),
    T("Das Lieferdatum", "serif", 96, "FG", "haupt"), ("g", 40),
    T("steht beim Artikel", "serif", 96, "ACC", "haupt", maxw=940), ("g", 70),
    ("rule", 120, 3, "ACC"), ("g", 54),
    T(["Zu erkennen an der Angabe", "«Ab Schweizer Lager»", "auf der Produktseite."], "sans", 48, "SUB", "neben", pitch=1.4),
])
cards.append(c)

# Folie 4: Versand in der Schweiz
c = Card(3, dark=True)
c.stack([
    LABEL("VERSAND IN DER SCHWEIZ"), ("g", 66),
    T("CHF 7", "serif", 270, "FG", "haupt", maxw=900), ("g", 66),
    ("rule", 120, 3, "ACC"), ("g", 64),
    T("ab CHF 50 gratis", "serif", 92, "ACC", "haupt", maxw=940), ("g", 66),
    T("Der Bestellwert zählt nach Rabatt.", "sans", 48, "SUB", "neben", maxw=940),
])
cards.append(c)

# Folie 5: Bezahlen
c = Card(4)
c.stack([
    T("Bezahlen mit", "serif", 72, "SUB", "haupt"), ("g", 62),
    T("TWINT", "serif", 104, "FG", "haupt"), ("g", 40), ("hl", 360), ("g", 52),
    T("Klarna", "serif", 104, "FG", "haupt"), ("g", 40),
    T("auf Rechnung", "sans", 48, "ACC_D", "neben"), ("g", 40), ("hl", 360), ("g", 52),
    T("Karte", "serif", 104, "FG", "haupt"), ("g", 40), ("hl", 360), ("g", 52),
    T("PayPal", "serif", 104, "FG", "haupt"),
])
cards.append(c)

# Folie 6: Fragen
c = Card(5, dark=True)
c.stack([
    T("Fragen?", "serif", 156, "FG", "haupt"), ("g", 70),
    ("rule", 120, 3, "ACC"), ("g", 70),
    T("info@luxestyle.ch", "serif", 76, "FG", "haupt", maxw=940), ("g", 50),
    T("luxestyle.ch/ig", "serif", 76, "ACC", "haupt", maxw=940),
])
cards.append(c)

paths = [c.save() for c in cards]

# Wächter: verbotene Aussagen dürfen in keiner Zeile stehen (Besitzervorgabe 3.11.2026)
VERBOTEN = r"DPD|Kasse|Einzige|Liechtenstein|Rückgabe|Rueckgabe|30 Tage|Weihnacht|Bestellschluss|Fasnacht|geprüft|Schweizer (?:Online-)?Shop|Online-Shop|Stern|wasserdicht|\bGarantie\b|Halloween"
alles = " | ".join(t["text"] for t in textlog)
treffer = re.findall(VERBOTEN, alles, flags=re.I)
assert not treffer, f"verbotene Begriffe im Bildtext: {treffer}"
assert not re.search(r"[\U0001F000-\U0001FFFF☀-➿]", alles), "Emoji im Bildtext"
json.dump(textlog, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("OK", len(paths), "Dateien;", len(textlog), "Textzeilen; kleinste Schrift je Rolle:",
      {r: min(t["px"] for t in textlog if t["rolle"] == r) for r in MIN if any(t["rolle"] == r for t in textlog)})
PY

# Nachprüfung der Dateien: JPEG, 1080x1350, 4:5
n=0
for f in 01_titel 02_direktversand 03_schweizer-lager 04_versand 05_bezahlen 06_fragen; do
  p="$OUT_DIR/$f.jpg"; [ -s "$p" ] || fail "$p fehlt"
  got="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$p")"
  [ "$got" = "mjpeg,1080,1350" ] || fail "$p hat $got statt mjpeg,1080,1350"
  n=$((n+1)); printf '%s  %s  %s Bytes\n' "$f.jpg" "$got" "$(stat -c %s "$p")"
done
echo "fertig: $n JPG in $OUT_DIR"
