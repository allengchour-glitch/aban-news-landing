"""
aban news — OG-Image-Generator für die Branchen-Hubs (1200×630, Pillow).

Erzeugt die Open-Graph-Bilder img/og/ki-fuer-<branche>.png für die
ki-fuer-*.html-Branchen-Guides — im gleichen Markendesign wie
generate_og_images.py (Cream-Ellipse, Amber-Balken, Kaffee-Logo, Badge).

Run:  python3 generate_branchen_og.py
Dep:  pip install pillow

Idempotent: überschreibt vorhandene PNGs. Titel wird automatisch auf die
verfügbare Breite skaliert, damit auch lange Branchennamen passen.
"""
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "img", "og")

AMBER = (217, 119, 6)
AMBER_DK = (180, 83, 9)
CREAM = (254, 243, 199)
INK = (31, 41, 55)
MUTED = (107, 114, 128)
BG = (255, 251, 245)

# Branche-Slug (= Dateiname ohne ki-fuer-/.png) → (Titel, [Untertitel-Zeilen])
BRANCHEN = {
    "zahnaerzte":          ("Zahnärzte",          ["Termin- und Patienten-", "kommunikation, ehrlich"]),
    "finanzberater":       ("Finanzberater",       ["Der Schriftkram —", "nicht die Beratung"]),
    "friseure":            ("Friseure",            ["Weniger Zettel,", "mehr Zeit am Stuhl"]),
    "psychotherapeuten":   ("Therapeut:innen",     ["Admin ja —", "in der Sitzung nein"]),
    "kfz-werkstaetten":    ("KFZ-Werkstätten",     ["Kostenvoranschlag und", "Bericht, nicht die Reparatur"]),
    "fotografen":          ("Fotografen",          ["Das Drumherum —", "nicht das Bild"]),
    "versicherungsmakler": ("Versicherungsmakler", ["Anfragen sortieren,", "nicht beraten"]),
    "nachhilfe":           ("Nachhilfe",           ["Material & Eltern-", "Kommunikation"]),
    "unternehmensberater": ("Unternehmensberatung", ["Entwürfe & Recherche,", "nicht die Strategie"]),
    "physiotherapeuten":   ("Physiotherapie",      ["Praxis-Organisation,", "nicht die Therapie"]),
    "hotels":              ("Hotels & Gästehäuser", ["Gast-Mails —", "nicht Gastfreundschaft"]),
    "eventplaner":         ("Eventplanung",        ["Organisation,", "nicht die Show"]),
    "werbeagenturen":      ("Werbeagenturen",      ["Rohfassungen —", "nicht die Idee"]),
    "vereine":             ("Vereine",             ["Verwaltung & Förderer-", "Kommunikation"]),
    "architekten":         ("Architekturbüros",    ["Schriftkram & Behörden,", "nicht der Entwurf"]),
    "hausverwaltungen":    ("Hausverwaltungen",    ["Mieter-Kommunikation", "und Schriftkram"]),
    "reinigungsfirmen":    ("Gebäudereinigung",    ["Angebote & Kommunikation,", "nicht das Putzen"]),
    "pflegedienste":       ("Pflegedienste",       ["Orga & Kommunikation,", "nicht die Pflege"]),
    "tierarztpraxen":      ("Tierarztpraxen",      ["Termine & Besitzer-", "Kommunikation"]),
    "apotheken":           ("Apotheken",           ["Kundeninfos & Orga,", "nicht die Beratung"]),
    "fitnessstudios":      ("Fitnessstudios",      ["Mitglieder-Mails,", "nicht das Training"]),
    "garten-landschaftsbau": ("Garten- & Landschaftsbau", ["Angebote & Kundenkram,", "nicht die Arbeit"]),
    "uebersetzer":         ("Übersetzer:innen",    ["Das Drumherum,", "nicht die Fachübersetzung"]),
    "autohaendler":        ("Autohäuser",          ["Inserate & Anfragen,", "nicht der Verkauf"]),
    "baeckereien":         ("Bäckereien",          ["Theke & Social,", "nicht das Backen"]),
    "reisebueros":         ("Reisebüros",          ["Angebote & Kommunikation,", "nicht die Beratung"]),
    "it-dienstleister":    ("IT-Dienstleister",    ["Angebote, Doku & Tickets,", "nicht die Technik"]),
    "logopaeden":          ("Logopädie-Praxen",    ["Orga & Elterninfos,", "nicht die Therapie"]),
    "ergotherapeuten":     ("Ergotherapie-Praxen", ["Organisation,", "nicht die Behandlung"]),
    "bestatter":           ("Bestattungsinstitute",["Formalitäten & Texte,", "nicht der Beistand"]),
    "winzer":              ("Winzer & Weingüter",  ["Shop-Texte & Kommunikation,", "nicht der Wein"]),
    "kosmetikstudios":     ("Kosmetikstudios",     ["Termine & Social,", "nicht die Behandlung"]),
    "cateringservice":     ("Catering-Services",   ["Angebote & Anfragen,", "nicht das Kochen"]),
    "spedition":           ("Speditionen",         ["Angebote & Kommunikation,", "nicht der Transport"]),
    "maler":               ("Maler & Lackierer",   ["Angebote & Kommunikation,", "nicht das Streichen"]),
    "dachdecker":          ("Dachdecker",          ["Angebote & Schriftkram,", "nicht das Dach"]),
    "schreiner":           ("Schreiner & Tischler",["Angebote & Kundenkram,", "nicht die Werkstatt"]),
    "optiker":             ("Augenoptiker",        ["Termine & Social,", "nicht die Sehprüfung"]),
    "hebammen":            ("Hebammen",            ["Orga & Elterninfos,", "nicht die Geburtshilfe"]),
    "ernaehrungsberatung": ("Ernährungsberatung",  ["Kundeninfos & Social,", "nicht die Fachberatung"]),
    "tonstudios":          ("Tonstudios",          ["Anfragen & Texte,", "nicht der Mix"]),
    "floristen":           ("Floristik",           ["Social & Bestellungen,", "nicht der Strauß"]),
    "brauereien":          ("Brauereien",          ["Shop-Texte & Events,", "nicht das Bier"]),
    "goldschmiede":        ("Goldschmiede",        ["Texte & Anfragen,", "nicht die Werkstatt"]),
}


def font(size, bold=True):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def fit_font(draw, text, max_width, start=112, min_size=52):
    """Größte Schrift wählen, bei der der Titel in max_width passt."""
    size = start
    while size > min_size:
        f = font(size)
        bb = draw.textbbox((0, 0), text, font=f)
        if bb[2] - bb[0] <= max_width:
            return f
        size -= 4
    return font(min_size)


def make(slug, title, subs):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.ellipse([W - 520, -260, W + 260, 360], fill=CREAM)
    d.rectangle([0, 0, 16, H], fill=AMBER)
    d.text((70, 70), "☕  aban news", font=font(34), fill=AMBER_DK)

    badge = "BRANCHEN-GUIDE"
    bf = font(24)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle([70, 140, 70 + bw + 44, 140 + bh + 26], radius=18, fill=CREAM)
    d.text((92, 152), badge, font=bf, fill=AMBER_DK)

    tf = fit_font(d, title, max_width=W - 140)
    d.text((70, 210), title, font=tf, fill=INK)
    th = d.textbbox((0, 0), title, font=tf)[3]
    y = 210 + th + 34

    sf = font(42)
    for ln in subs:
        d.text((70, y), ln, font=sf, fill=AMBER_DK)
        y += 58

    d.text((70, H - 78), "abannews.com  ·  konkret, ehrlich, ohne Hype",
           font=font(26, bold=False), fill=MUTED)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "ki-fuer-%s.png" % slug)
    img.save(out, "PNG")
    print("✓ img/og/ki-fuer-%s.png" % slug)


def build():
    for slug, (title, subs) in BRANCHEN.items():
        make(slug, title, subs)


if __name__ == "__main__":
    build()
