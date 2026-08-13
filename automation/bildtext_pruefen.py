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

DIESES SKRIPT ÄNDERT NICHTS. Es liefert `hat_werbetext(pfad_oder_bytes)` für den Backfill und
misst auf Wunsch eine Stichprobe, damit die Schwelle belegt ist statt geraten.
"""
import io, os, re, subprocess, sys

import pytesseract
from PIL import Image

# Mindestens so viele echte Wörter, damit ein Bild als «Werbetext» gilt. Der Wert ist unten
# an einer Stichprobe belegt, nicht gesetzt worden, weil er plausibel klingt.
WORTGRENZE = int(os.environ.get("WORTGRENZE", "4"))
# Tesseract gibt je Wort eine Sicherheit. Alles darunter ist meist Bildrauschen, das als
# Buchstabe gelesen wurde — Spitzlichter auf Metall werden gern zu «I» oder «l».
SICHERHEIT = 60
WORT = re.compile(r'^[A-Za-zÄÖÜäöüß]{3,}$')


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
    d = pytesseract.image_to_data(bild, output_type=pytesseract.Output.DICT)
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


def hat_werbetext(bild):
    return len(woerter(bild)) >= WORTGRENZE


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
