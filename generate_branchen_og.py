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
    "elektriker":          ("Elektriker",          ["Angebote & Schriftkram,", "nicht die Installation"]),
    "sanitaer-heizung":    ("Sanitär & Heizung",   ["Angebote & Kundenkram,", "nicht die Montage"]),
    "fliesenleger":        ("Fliesenleger",        ["Aufmaß-Texte & Angebote,", "nicht das Verlegen"]),
    "trockenbau":          ("Trockenbau",          ["Angebote & Kommunikation,", "nicht die Wand"]),
    "glaser":              ("Glasereien",          ["Angebote & Anfragen,", "nicht der Zuschnitt"]),
    "metallbauer":         ("Metallbau & Schlosser", ["Angebote & Doku,", "nicht die Werkstatt"]),
    "zimmerer":            ("Zimmerer & Holzbau",  ["Angebote & Schriftkram,", "nicht der Dachstuhl"]),
    "geruestbau":          ("Gerüstbau",           ["Angebote & Kommunikation,", "nicht das Gerüst"]),
    "raumausstatter":      ("Raumausstatter",      ["Angebote & Beratungstexte,", "nicht die Polsterung"]),
    "schornsteinfeger":    ("Schornsteinfeger",    ["Termine & Berichte,", "nicht die Kehrung"]),
    "heilpraktiker":       ("Heilpraktiker",       ["Praxis-Orga & Mails,", "nicht die Behandlung"]),
    "hoerakustiker":       ("Hörakustiker",        ["Termine & Nachsorge,", "nicht die Anpassung"]),
    "podologen":           ("Podologie",           ["Orga & Schriftkram,", "nicht die Behandlung"]),
    "zahntechniker":       ("Zahntechnik",         ["Angebote & Aufträge,", "nicht der Zahnersatz"]),
    "sanitaetshaeuser":    ("Sanitätshäuser",      ["Kunden & Rezept-Kram,", "nicht die Versorgung"]),
    "kieferorthopaeden":   ("Kieferorthopädie",    ["Termine & Eltern-Mails,", "nicht die Behandlung"]),
    "notare":              ("Notariate",           ["Schriftkram & Termine,", "nicht die Beurkundung"]),
    "wirtschaftspruefer":  ("Wirtschaftsprüfer",   ["Mandantenkram & Entwürfe,", "nicht das Testat"]),
    "sachverstaendige":    ("Sachverständige",     ["Orga & Rohtexte,", "nicht das Gutachten"]),
    "hausmeisterservice":  ("Hausmeisterservice",  ["Angebote & Kommunikation,", "nicht die Arbeit"]),
    "sicherheitsdienste":  ("Sicherheitsdienste",  ["Angebote & Dienstpläne,", "nicht die Streife"]),
    "umzugsunternehmen":   ("Umzüge",              ["Angebote & Kunden-Mails,", "nicht das Tragen"]),
    "schluesseldienste":   ("Schlüsseldienste",    ["Anfragen & Preise,", "nicht die Türöffnung"]),
    "entruempelung":       ("Entrümpelung",        ["Angebote & Kommunikation,", "nicht das Räumen"]),
    "schaedlingsbekaempfer": ("Schädlingsbekämpfung", ["Angebote & Doku,", "nicht der Einsatz"]),
    "metzgereien":         ("Metzgereien",         ["Theke & Social,", "nicht die Wurst"]),
    "eisdielen":           ("Eisdielen",           ["Social & Aushänge,", "nicht das Eis"]),
    "cafes":               ("Cafés",               ["Social & Karte,", "nicht der Kaffee"]),
    "buchhandlungen":      ("Buchhandlungen",      ["Newsletter & Social,", "nicht die Empfehlung"]),
    "fahrradlaeden":       ("Fahrradläden",        ["Service-Mails & Texte,", "nicht die Werkstatt"]),
    "sportgeschaefte":     ("Sportgeschäfte",      ["Produkttexte & Social,", "nicht die Beratung"]),
    "modeboutiquen":       ("Modeboutiquen",       ["Social & Shop-Texte,", "nicht die Stilberatung"]),
    "getraenkehandel":     ("Getränkehandel",      ["Angebote & Sortiment,", "nicht die Lieferung"]),
    "fahrschulen":         ("Fahrschulen",         ["Anmeldung & Orga,", "nicht die Fahrstunde"]),
    "musikschulen":        ("Musikschulen",        ["Anmeldung & Orga,", "nicht der Unterricht"]),
    "tanzschulen":         ("Tanzschulen",         ["Kurse & Social,", "nicht der Unterricht"]),
    "sprachschulen":       ("Sprachschulen",       ["Anfragen & Material,", "nicht der Unterricht"]),
    "nagelstudios":        ("Nagelstudios",        ["Termine & Social,", "nicht die Behandlung"]),
    "tattoostudios":       ("Tattoostudios",       ["Anfragen & Social,", "nicht das Tattoo"]),
    "hochzeitsfotografen": ("Hochzeitsfotografen", ["Angebote & Paar-Mails,", "nicht das Foto"]),
    "solarteure":          ("Solarteure",          ["Angebote & Anmeldung,", "nicht die Montage"]),
    "waermepumpen":        ("Wärmepumpen",         ["Angebote & Förder-Kram,", "nicht die Heizlast"]),
    "energieberater":      ("Energieberater",      ["Berichte & Akquise,", "nicht das Testat"]),
    "smart-home":          ("Smart-Home",          ["Angebote & Support,", "nicht die Installation"]),
    "vermessungsbuero":    ("Vermessungsbüros",    ["Berichte & Orga,", "nicht die Messung"]),
    "hundesalon":          ("Hundesalons",         ["Termine & Social,", "nicht die Fellpflege"]),
    "estrichleger":        ("Estrichleger",        ["Angebote & Bau-Kommunikation,", "nicht der Estrich"]),
    "bodenleger":          ("Bodenleger",          ["Angebote & Pflegeinfos,", "nicht das Verlegen"]),
    "ingenieurbuero":      ("Ingenieurbüros",      ["Berichte & Orga,", "nicht die Statik"]),
    "ladestationen":       ("Ladestationen",       ["Angebote & Förder-Kram,", "nicht die Montage"]),
    "rollladenbauer":      ("Rollladenbauer",      ["Angebote & Service,", "nicht der Einbau"]),
    "schneidereien":       ("Änderungsschneidereien", ["Anfragen & Preisliste,", "nicht die Naht"]),
    "uhrmacher":           ("Uhrmacher",            ["Anfragen & Kostenvoranschlag,", "nicht das Uhrwerk"]),
    "druckereien":         ("Druckereien",          ["Angebote & Auftrags-Mails,", "nicht der Druck"]),
    "werbetechnik":        ("Werbetechnik",         ["Angebote & Text-Ideen,", "nicht die Montage"]),
    "brandschutz":         ("Brandschutz",          ["Angebote & Wartungs-Orga,", "nicht die Prüfung"]),
    "aufzugswartung":      ("Aufzugswartung",       ["Verträge & Disposition,", "nicht die Wartung"]),
    "polsterei":           ("Polsterei",            ["Anfragen & Kostenvoranschlag,", "nicht das Beziehen"]),
    "gartencenter":        ("Gartencenter",         ["Tipps & Newsletter,", "nicht die Aufzucht"]),
    "parkettleger":        ("Parkettleger",         ["Angebote & Pflegeinfos,", "nicht das Verlegen"]),
    "kaelteanlagenbau":    ("Kälteanlagenbau",      ["Verträge & Disposition,", "nicht der Kältekreis"]),
    "brunnenbau":          ("Brunnenbau",           ["Angebote & Anträge,", "nicht die Bohrung"]),
    "wintergarten":        ("Wintergarten",         ["Angebote & Anfragen,", "nicht die Statik"]),
    "zaunbau":             ("Zaunbau",              ["Angebote & Material-Infos,", "nicht die Montage"]),
    "saunabau":            ("Saunabau",             ["Angebote & Anfragen,", "nicht der Anschluss"]),
    "pflasterbau":         ("Pflasterbau",          ["Angebote & Pflegeinfos,", "nicht das Verlegen"]),
    "natursteinbetrieb":   ("Natursteinbetriebe",   ["Angebote & Stein-Infos,", "nicht der Zuschnitt"]),
    "treppenbau":          ("Treppenbau",           ["Angebote & Anfragen,", "nicht die Montage"]),
    "ofenbau":             ("Ofen- & Kaminbau",     ["Angebote & Service,", "nicht der Abgasweg"]),
    "baumpflege":          ("Baumpflege",           ["Angebote & Anträge,", "nicht die Fällung"]),
    "spenglerei":          ("Spenglerei",           ["Angebote & Material-Infos,", "nicht die Kantarbeit"]),
    "abdichtungstechnik":  ("Abdichtungstechnik",   ["Angebote & Anfragen,", "nicht die Diagnose"]),
    "poolbau":             ("Poolbau",              ["Angebote & Pflegeinfos,", "nicht die Wasserchemie"]),
    "schimmelsanierung":   ("Schimmelsanierung",    ["Anfragen & Vorsorge-Infos,", "nicht die Diagnose"]),
    "betonsanierung":      ("Betonsanierung",       ["Angebote & Doku,", "nicht die Statik"]),
    "lueftungsbau":        ("Lüftungsbau",          ["Verträge & Planung,", "nicht die Auslegung"]),
    "entkernung":          ("Entkernung",           ["Angebote & Doku,", "nicht der Rückbau"]),
    "fassadenbau":         ("Fassadenbau",          ["Angebote & Förder-Infos,", "nicht die Montage"]),
    "blitzschutz":         ("Blitzschutz",          ["Angebote & Prüf-Orga,", "nicht die Auslegung"]),
    "fensterbau":          ("Fensterbau",           ["Angebote & Förder-Infos,", "nicht der Einbau"]),
    "markisenbau":         ("Markisenbau",          ["Angebote & Stoff-Infos,", "nicht die Montage"]),
    "denkmalpflege":       ("Denkmalpflege",        ["Anträge & Doku,", "nicht die Befundung"]),
    "torbau":              ("Torbau",               ["Angebote & Wartungs-Orga,", "nicht die Montage"]),
    "akustikbau":          ("Akustikbau",           ["Angebote & Produkt-Infos,", "nicht die Messung"]),
    "wasseraufbereitung":  ("Wasseraufbereitung",   ["Angebote & Service,", "nicht die Analyse"]),
    "kuechenstudio":       ("Küchenstudios",        ["Angebote & Geräte-Infos,", "nicht das Aufmaß"]),
    "wasserschadensanierung": ("Wasserschaden-Sanierung", ["Versicherungs-Kram,", "nicht die Leckortung"]),
    "terrassenbau":        ("Terrassenbau",         ["Angebote & Pflegeinfos,", "nicht das Verlegen"]),
    "carportbau":          ("Carportbau",           ["Angebote & Bauantrag,", "nicht die Statik"]),
    "treppenlift":         ("Treppenlifte",         ["Angebote & Zuschuss-Kram,", "nicht das Aufmaß"]),
    "gartenteichbau":      ("Gartenteichbau",       ["Angebote & Pflegeinfos,", "nicht der Aushub"]),
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
