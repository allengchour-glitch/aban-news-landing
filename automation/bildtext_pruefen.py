"""Erkennt eingebrannten Werbetext in Produktbildern — die Wache, die dem Bild-Backfill fehlte.

WARUM: Ein Kontaktbogen über 24 Bilder, die ich soeben selbst ergänzt hatte, zeigte bei ACHT
davon englischen Werbetext IM BILD: «Deepened pot body design · Saves oil and prevents
splashing», «Dog Grinding Teeth», «HD obstacle avoidance drone · T6 DRONE», «Shock-absorbing
knee pads for safe running», «Smart gesture sensing», «95cm Extended stainless steel rod».
Der Backfill hat also einen echten Mangel behoben (ein Bild statt fünf) und dabei einen neuen
angelegt — genau das Muster, das an diesem Tag schon mehrfach aufgetreten ist.

Zwei Gründe, warum das zählt:
 • Google verbietet Werbetext und Wasserzeichen im Produktbild. Für Anzeigen ist das ein
   Ablehnungsgrund, für die Gratis-Einträge ein Qualitätsabzug — und die Gratis-Einträge sind
   der einzige Kanal mit belegten Verkäufen.
 • Englischer Marketingtext in einem Schweizer Shop sieht nach Weiterverkauf aus, nicht nach
   Marke. Er sagt der Kundin, wo die Ware herkommt.

WIE GEMESSEN WIRD: Tesseract liest das Bild, und gezählt wird nur, was auch wirklich Text ist —
zusammenhängende Wörter aus mindestens drei Buchstaben, die Tesseract mit ausreichender
Sicherheit erkennt. Das ist der entscheidende Unterschied zu einer Heuristik: hier wird nicht
geschätzt, dass Text da sein könnte, sondern gelesen, was dasteht.

⚠️ NICHT JEDER TEXT IST WERBUNG. Der Kontaktbogen zeigte auch «20cm/7.87in» an einer
Kosmetiktasche — eine Massangabe. Die ist zulässig und für die Kundin nützlich. Verworfen wird
deshalb erst ab mehreren echten WÖRTERN, nicht ab der ersten Zahl. Ebenso wenig ist ein Wort
auf dem Produkt selbst ein Grund (Markenschriftzug auf einem Schuh, Zifferblatt einer Uhr) —
solche Funde bleiben unter der Schwelle, weil sie klein und vereinzelt sind.

⚠️ 13.10.2026 — ALS HAUPTBILD GILT EINE MASSANGABE NICHT ALS SAUBER (Kauf-Strecke Klasse 13).
hauptbild_ohne_text.py hat beim Tunmate-Rizinusöl den KARTON mit Masslinien («4.33in/11cm», «1.57in/4cm») nach vorn
gestellt: Masszeilen bestehen aus Ziffern und zählen hier als 0 Wörter (WORT verlangt 3 Buchstaben). Als Zusatzbild ist
eine Massangabe nützlich (siehe oben), als Hauptbild ist sie ein Karton-/Massbild statt eines Produktfotos.
masse()/von_url_hauptbild()/hauptbild_tauglich(): Zahl+Einheit (in, inch, cm, mm, ml, oz — auch «4.33in/11cm»,
«60ml/2.02fl oz») schliesst ein Bild als NEUES Hauptbild aus. «2 in 1» zählt nicht (Einheit «in» nur ohne Leerzeichen).
Selbsttest: python3 automation/bildtext_pruefen.py --selbsttest (Tunmate-Karton = «nicht sauber»).

DIESES SKRIPT ÄNDERT NICHTS. Es liefert `hat_werbetext(pfad_oder_bytes)` für den Backfill und
misst auf Wunsch eine Stichprobe, damit die Schwelle belegt ist statt geraten.
"""
import io, os, re, subprocess, sys
# 30.09.2026: Tesseract mit OpenMP nahm unter Last alle 4 Kerne je Aufruf (Load 50, 11 verwaiste Prozesse bis 826 s) —
# ein Thread je Aufruf; OCR_TIMEOUT beendet den Aufruf selbst (pytesseract killt sein Kind), statt dass ein äusseres
# `timeout` nur Python beendet und tesseract als Waise weiterläuft. Zeitüberschreitung = RuntimeError (kein stilles «sauber»).
os.environ.setdefault("OMP_THREAD_LIMIT", "1")
OCR_TIMEOUT = int(os.environ.get("OCR_TIMEOUT", "90"))

# ⚠️ 15.09.2026: Hier stand ein nacktes `import pytesseract`. In DIESEM Container gibt es
# weder das Modul noch das Programm `tesseract` selbst, und pip erreicht files.pythonhosted.org
# nicht (Read timed out). Der Waechter hinterliess deshalb taeglich einen ModuleNotFoundError
# im Log — ein Traceback, der wie ein reparierbarer Fehler aussieht, aber eine fehlende
# Systemvoraussetzung ist. Jetzt sagt er das, statt abzustuerzen: wer die Logs nach echten
# Fehlern durchsieht, soll nicht jedes Mal an dieser Stelle haengen bleiben.
try:
    import pytesseract
    _OCR = subprocess.run(["which", "tesseract"], capture_output=True, text=True).returncode == 0
except ImportError:
    pytesseract, _OCR = None, False
if not _OCR:
    print("OCR steht in diesem Container nicht zur Verfuegung (pytesseract/tesseract fehlen, "
          "pip erreicht den Index nicht) — Bildtext-Pruefung uebersprungen, nichts geaendert.",
          flush=True)
    sys.exit(0)

from PIL import Image

# Mindestens so viele echte Wörter, damit ein Bild als «Werbetext» gilt. Der Wert ist unten
# an einer Stichprobe belegt, nicht gesetzt worden, weil er plausibel klingt.
WORTGRENZE = int(os.environ.get("WORTGRENZE", "4"))
# Tesseract gibt je Wort eine Sicherheit. Alles darunter ist meist Bildrauschen, das als
# Buchstabe gelesen wurde — Spitzlichter auf Metall werden gern zu «I» oder «l».
SICHERHEIT = 60
WORT = re.compile(r'^[A-Za-zÄÖÜäöüß]{3,}$')


# 23.09.2026 22:58 (Prüfer, Pinterest): das Quellbild «LIGHT-UP AIRBLOWN INFLATABLES INDOOR & OUTDOOR USE» (1441×1575) liest die
# 1×-Lesart mit nur 3 sicheren Wörtern — UNTER der Schwelle 4 — die 2×-Lesart mit 4; alle zehn sauberen Pin-Quellbilder lesen
# 0 bei 1× UND 2×. ZWEILESARTEN=1 nimmt das Maximum aus 1× und 2× (längste Kante ≤ 3200 px). Opt-in, damit die anderen
# Wächter (Queue-Reiniger, Bild-Backfill) ihre geeichte 1×-Lesart behalten. Nutzer: bild_formate.py, metricool_pinterest_pin.mjs.
ZWEILESARTEN = os.environ.get("ZWEILESARTEN") == "1"


# 13.10.2026: Massangaben (Zahl+Einheit). «in»/«inch» nur direkt an der Zahl («4.33in»), damit «2 in 1» frei bleibt.
MASS = re.compile(r"(?i)(?<![A-Za-z])\d+(?:[.,]\d+)?(?:in(?:ch(?:es)?)?\b|\s*(?:inch(?:es)?|cm|mm|ml|oz)\b)")
MASS_SICHERHEIT = 50
_LETZTE_MASSE = []


def _masse_aus(d):
    """Massangaben aus einer image_to_data-Lesung (Wörter ab MASS_SICHERHEIT, zeilenweise verbunden)."""
    zeilen = {}
    for i, wort in enumerate(d["text"]):
        try:
            k = float(d["conf"][i])
        except (TypeError, ValueError):
            continue
        w = (wort or "").strip()
        if not w or k < MASS_SICHERHEIT:
            continue
        zeilen.setdefault((d["block_num"][i], d["par_num"][i], d["line_num"][i]), []).append(w)
    raus = []
    for ws in zeilen.values():
        raus += MASS.findall(" ".join(ws))
    return raus


def _lese(g):
    d = pytesseract.image_to_data(g, output_type=pytesseract.Output.DICT, timeout=OCR_TIMEOUT)
    _LETZTE_MASSE[:] = _masse_aus(d)
    raus = []
    for wort, konf in zip(d["text"], d["conf"]):
        try:
            k = float(konf)
        except (TypeError, ValueError):
            continue
        w = (wort or "").strip()
        if k >= SICHERHEIT and WORT.match(w):
            raus.append(w)
    return raus


# 25.09.2026 (Betreiber-Screenshot IG-Profil): «LED multifunctional desk lamp · Three levels of brightness» und «Beige/BEIGE»
# standen gut lesbar im Bild — die Ganzbild-Lesart las 0 Wörter (1× wie 2×): Tesseracts Seitenaufteilung scheitert an
# hellem Text auf unruhigem Fotohintergrund. Derselbe Text, als Ausschnitt vergrössert (psm 6), las sich sofort.
# KACHELN=1 liest zusätzlich 2×2 überlappende Kacheln (je auf ≥1400 px vergrössert, psm 6) und zählt die Vereinigung.
# Opt-in wie ZWEILESARTEN: die Queue-/Backfill-Wächter behalten ihre geeichte Lesart. Nutzer: Bild-Poster (Social).
KACHELN = os.environ.get("KACHELN") == "1"

def _kacheln(g):
    gef = []
    w, h = g.size
    for (x0, y0) in ((0, 0), (0.45, 0), (0, 0.45), (0.45, 0.45)):
        k = g.crop((int(x0 * w), int(y0 * h), int((x0 + 0.55) * w), int((y0 + 0.55) * h)))
        s = max(1.0, 1400 / max(k.size))
        k = k.resize((int(k.width * s), int(k.height * s)), Image.LANCZOS)
        d = pytesseract.image_to_data(k, config="--psm 6", output_type=pytesseract.Output.DICT, timeout=OCR_TIMEOUT)
        for wort, konf in zip(d["text"], d["conf"]):
            try:
                kf = float(konf)
            except (TypeError, ValueError):
                continue
            wt = (wort or "").strip()
            if kf >= SICHERHEIT and WORT.match(wt):
                gef.append(wt)
    return gef

def woerter(bild):
    """Gibt die sicher gelesenen Wörter zurück (mind. 3 Buchstaben)."""
    if isinstance(bild, (bytes, bytearray)):
        bild = Image.open(io.BytesIO(bild))
    elif isinstance(bild, str):
        bild = Image.open(bild)
    bild = bild.convert("L")
    # Kleine Bilder hochskalieren — Tesseract liest unter ~20 px Zeilenhöhe schlecht.
    if max(bild.size) < 900:
        f = 900 / max(bild.size)
        bild = bild.resize((int(bild.width * f), int(bild.height * f)))
    raus = _lese(bild)
    if ZWEILESARTEN:
        s = min(2.0, 3200 / max(bild.size))
        if s > 1.05:
            zwei = _lese(bild.resize((int(bild.width * s), int(bild.height * s)), Image.LANCZOS))
            if len(zwei) > len(raus):
                raus = zwei
    if KACHELN:
        # Vereinigung ohne Doppelzählung überlappender Kacheln (gleiches Wort, gleiche Schreibung)
        k = list(dict.fromkeys(_kacheln(bild)))
        if len(k) > len(raus):
            raus = k
    return raus


def hat_werbetext(bild):
    return len(woerter(bild)) >= WORTGRENZE


def masse(bild):
    """Massangaben im Bild → (woerter, masse). Zusätzlich zur 1×-Lesung von woerter() eine Lesung mit psm 11
    (verstreuter Text): Masslinien stehen einzeln neben dem Produkt, die Seitenaufteilung übersieht sie sonst
    (gemessen 13.10. an der Stichprobe: Fahrradtasche «38cm», Holzauto «8cm» nur mit psm 11; saubere Fotos 0)."""
    if isinstance(bild, (bytes, bytearray)):
        bild = Image.open(io.BytesIO(bild))
    elif isinstance(bild, str):
        bild = Image.open(bild)
    w = woerter(bild)
    ms = list(_LETZTE_MASSE)
    g = bild.convert("L")
    if max(g.size) < 900:
        f = 900 / max(g.size)
        g = g.resize((int(g.width * f), int(g.height * f)))
    d = pytesseract.image_to_data(g, config="--psm 11", output_type=pytesseract.Output.DICT, timeout=OCR_TIMEOUT)
    for x in _masse_aus(d):
        if x not in ms:
            ms.append(x)
    return w, ms


def hauptbild_tauglich(bild):
    """Darf dieses Bild ein NEUES Hauptbild werden? Kein Werbetext UND keine Massangabe (Karton-/Massbild)."""
    w, m = masse(bild)
    return len(w) < WORTGRENZE and not m


def von_url_hauptbild(u):
    """Wie von_url, aber → (wortzahl, masse). (-1, None) = nicht lesbar (NICHT «sauber»)."""
    raw = subprocess.run(["curl", "-sL", "--max-time", "30", u], capture_output=True).stdout
    if not raw:
        return -1, None
    try:
        w, m = masse(raw)
        return len(w), m
    except Exception:
        return -1, None


# Tunmate Rizinus-Haaröl, Karton mit «4.33in/11cm» + «1.57in/4cm» (13.10.: von hauptbild_ohne_text nach vorn gestellt).
SELBSTTEST_KARTON = ("https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
                     "9f9c7336-67ad-4fd6-8b9e-c66d5b458dec.jpg")


def selbsttest():
    from PIL import ImageDraw, ImageFont
    fehler = 0
    for text, soll in (("4.33in/11cm", True), ("60ml/2.02fl oz", True), ("Breite 20 cm", True),
                       ("2 in 1", False), ("Rot", False)):
        ok = bool(MASS.findall(text)) == soll
        fehler += not ok
        print(f"{'ok ' if ok else 'FEHLER'} Regel {text!r}: Mass={'ja' if soll else 'nein'} erwartet")
    try:
        fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 64)
    except Exception:
        fnt = None
    g = Image.new("L", (1200, 400), 255)
    ImageDraw.Draw(g).text((60, 150), "4.33in/11cm", fill=0, font=fnt)
    ok = not hauptbild_tauglich(g)
    fehler += not ok
    print(f"{'ok ' if ok else 'FEHLER'} Bild mit «4.33in/11cm» = nicht sauber als Hauptbild")
    ok = hauptbild_tauglich(Image.new("L", (900, 900), 255))
    fehler += not ok
    print(f"{'ok ' if ok else 'FEHLER'} leeres Bild = sauber")
    n, m = von_url_hauptbild(SELBSTTEST_KARTON)
    if n == -1:
        print("?? Tunmate-Karton nicht ladbar (Netz) — Bildtest übersprungen")
    else:
        ok = bool(m) or n >= WORTGRENZE
        fehler += not ok
        print(f"{'ok ' if ok else 'FEHLER'} Tunmate-Karton: {n} Wörter, Masse {m} → "
              f"{'nicht sauber' if ok else 'SAUBER (falsch)'}")
    print(f"SELBSTTEST: {'bestanden' if not fehler else str(fehler) + ' Fehler'}")
    return 1 if fehler else 0


def von_url(u):
    """Lädt ein Bild und gibt die Wortzahl zurück; -1, wenn es nicht gelesen werden konnte.
    ⚠️ −1 heisst «unbekannt», NICHT «sauber». Der Aufrufer muss den Unterschied machen —
    genau diese Verwechslung von «keine Antwort» mit «keine Daten» hat den Bild-Backfill
    heute schon einmal 548 Produkte fälschlich abhaken lassen."""
    raw = subprocess.run(["curl", "-sL", "--max-time", "30", u],
                         capture_output=True).stdout
    if not raw:
        return -1
    try:
        return len(woerter(raw))
    except Exception:
        return -1


def main():
    """Ohne Argumente: nichts. Mit --url <URL>: Wortzahl auf die Standardausgabe (für den
    Node-Backfill). Mit Dateipfaden: die Messung, mit der die Schwelle geeicht wurde."""
    if "--selbsttest" in sys.argv:
        raise SystemExit(selbsttest())
    if len(sys.argv) > 2 and sys.argv[1] == "--url":
        print(von_url(sys.argv[2]))
        return
    pfade = sys.argv[1:]
    if not pfade:
        print("Aufruf: bildtext_pruefen.py <bild> [<bild> …]  |  --url <URL>")
        return
    for p in pfade:
        w = woerter(p)
        print(f"{len(w):>3} Wörter  {'WERBETEXT' if len(w) >= WORTGRENZE else 'sauber   '}  "
              f"{os.path.basename(p)[:40]:<42} {' '.join(w[:8])}")


if __name__ == "__main__":
    main()
