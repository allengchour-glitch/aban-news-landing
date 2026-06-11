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
    "osteopathen":         ("Osteopathen",         ["Praxis-Orga & Mails,", "nicht die Behandlung"]),
    "masseure":            ("Masseure",            ["Termine & Texte,", "nicht die Massage"]),
    "tierheilpraktiker":   ("Tierheilpraktiker",   ["Halter-Mails & Orga,", "nicht die Behandlung"]),
    "orthopaedieschuhtechnik": ("Orthopädie-Schuhtechnik", ["Angebote & Mails,", "nicht die Maßarbeit"]),
    "tierphysiotherapie":  ("Tierphysiotherapie",  ["Halter-Texte & Orga,", "nicht die Therapie"]),
    "kinderbetreuung":     ("Kinderbetreuung",     ["Eltern-Infos & Orga,", "nicht die Pädagogik"]),
    "detektei":            ("Detekteien",          ["Büro & Mandanten-", "Mails, nicht die Ermittlung"]),
    "textilreinigung":     ("Textilreinigung",     ["Kundentexte & Orga,", "nicht das Reinigen"]),
    "personaldienstleister": ("Personaldienstleister", ["Texte & Kommunikation,", "nicht die Auswahl"]),
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
    "rohrreinigung":       ("Rohrreinigung",        ["Notdienst & Angebote,", "nicht die Befahrung"]),
    "industriereinigung":  ("Industriereinigung",   ["Angebote & Planung,", "nicht das Handling"]),
    "holzhausbau":         ("Holzhausbau",          ["Angebote & Förder-Infos,", "nicht die Statik"]),
    "glasreinigung":       ("Glasreinigung",        ["Angebote & Tourenplanung,", "nicht die Höhenarbeit"]),
    "winterdienst":        ("Winterdienst",         ["Verträge & Touren,", "nicht der Räumeinsatz"]),
    "graffitientfernung":  ("Graffitientfernung",   ["Angebote & Schnell-Orga,", "nicht der Untergrund-Test"]),
    "kanalsanierung":      ("Kanalsanierung",       ["Angebote & Doku,", "nicht die TV-Auswertung"]),
    "containerdienst":     ("Containerdienst",      ["Buchung & Angebote,", "nicht die Abfuhr"]),
    "spielplatzbau":       ("Spielplatzbau",        ["Angebote & Wartungs-Orga,", "nicht die Sicherheitsprüfung"]),
    "sicherheitstechnik":  ("Sicherheitstechnik",   ["Angebote & Wartungs-Orga,", "nicht die Risikoanalyse"]),
    "tiefbau":             ("Tiefbau",              ["Angebote & Bautagebuch,", "nicht der Verbau"]),
    "abbruch":             ("Abbruch",              ["Angebote & Doku,", "nicht die Statik"]),
    "hausnotruf":          ("Hausnotruf",           ["Angebote & Zuschuss-Kram,", "nicht der Notruf"]),
    "baumaschinenvermietung": ("Baumaschinen-Vermietung", ["Buchung & Angebote,", "nicht die Einweisung"]),
    "partyverleih":        ("Partyverleih",         ["Angebote & Buchung,", "nicht der Aufbau"]),
    "autoaufbereitung":    ("Autoaufbereitung",     ["Pakete & Termine,", "nicht die Politur"]),
    "autoglas":            ("Autoglas-Service",     ["Versicherungs-Kram,", "nicht die Kalibrierung"]),
    "reifenservice":       ("Reifenservice",        ["Termine & Einlagerung,", "nicht die Montage"]),
    "abschleppdienst":     ("Abschleppdienst",      ["Abrechnung & Disposition,", "nicht die Bergung"]),
    "motorradwerkstatt":   ("Motorradwerkstätten",  ["Termine & Angebote,", "nicht die Diagnose"]),
    "wohnmobilservice":    ("Wohnmobil-Service",    ["Termine & Angebote,", "nicht die Gasprüfung"]),
    "kfz-gutachter":       ("Kfz-Gutachter",        ["Doku & Korrespondenz,", "nicht die Begutachtung"]),
    "fahrzeugfolierung":   ("Fahrzeugfolierung",    ["Angebote & Design-Infos,", "nicht die Verklebung"]),
    "bootsservice":        ("Bootsservice",         ["Saison-Orga & Angebote,", "nicht die Diagnose"]),
    "konditorei":          ("Konditoreien",         ["Bestell-Mails & Social,", "nicht das Dekorieren"]),
    "hundeschule":         ("Hundeschulen",         ["Anmeldungen & Infos,", "nicht das Training"]),
    "weinhandlung":        ("Weinhandlungen",       ["Produkttexte & Newsletter,", "nicht die Verkostung"]),
    "barbershop":          ("Barbershops",          ["Buchung & Social,", "nicht der Haarschnitt"]),
    "sonnenstudio":        ("Sonnenstudios",        ["Buchung & Tarife,", "nicht die Hauttyp-Beratung"]),
    "tierpension":         ("Tierpensionen",        ["Buchung & Belegung,", "nicht die Betreuung"]),
    "foodtruck":           ("Foodtrucks",           ["Event-Anfragen & Social,", "nicht das Kochen"]),
    "juwelier":            ("Juweliere",            ["Produkttexte & Social,", "nicht die Echtheitsprüfung"]),
    "kaffeeroesterei":     ("Kaffeeröstereien",     ["Produkttexte & Shop,", "nicht das Rösten"]),
    "feinkost":            ("Feinkostgeschäfte",    ["Produkttexte & Social,", "nicht die Theke"]),
    "wimpernstudio":       ("Wimpernstudios",       ["Buchung & Social,", "nicht die Behandlung"]),
    "osteopathie":         ("Osteopathie-Praxen",   ["Termine & Orga,", "nicht die Behandlung"]),
    "yogastudio":          ("Yogastudios",          ["Kursplan & Social,", "nicht das Anleiten"]),
    "fischhandel":         ("Fischhandel",          ["Angebote & Rezepte,", "nicht die Frischeprüfung"]),
    "spielwarengeschaeft": ("Spielwarengeschäfte",  ["Produkttexte & Social,", "nicht die Beratung"]),
    "kampfsportschule":    ("Kampfsportschulen",    ["Anmeldungen & Social,", "nicht das Training"]),
    "schwimmschule":       ("Schwimmschulen",       ["Anmeldungen & Orga,", "nicht die Wasseraufsicht"]),
    "reitschule":          ("Reitschulen",          ["Buchung & Orga,", "nicht der Unterricht"]),
    "skischule":           ("Skischulen",           ["Buchung & Gäste-Infos,", "nicht der Unterricht"]),
    "tauchschule":         ("Tauchschulen",         ["Buchung & Packlisten,", "nicht die Tauchaufsicht"]),
    "kletterhalle":        ("Kletterhallen",        ["Buchung & Events,", "nicht die Sicherung"]),
    "segelschule":         ("Segelschulen",         ["Buchung & Theorie-Infos,", "nicht die Navigation"]),
    "bioladen":            ("Bioläden",             ["Produkttexte & Social,", "nicht die Theke"]),
    "schreibwarengeschaeft": ("Schreibwarengeschäfte", ["Produkttexte & Aktionen,", "nicht die Beratung"]),
    "flugschule":          ("Flugschulen",          ["Buchung & Theorie-Infos,", "nicht der Flugbetrieb"]),
    "kochschule":          ("Kochschulen",          ["Buchung & Kurstexte,", "nicht das Kochen"]),
    "hofladen":            ("Hofläden",             ["Saison-Posts & Schilder,", "nicht die Theke"]),
    "unverpacktladen":     ("Unverpackt-Läden",     ["Produkttexte & Social,", "nicht das Abfüllen"]),
    "imkerei":             ("Imkereien",            ["Etiketten & Storys,", "nicht die Bienenpflege"]),
    "weingut":             ("Weingüter",            ["Wein-Texte & Events,", "nicht die Verkostung"]),
    "brennerei":           ("Brennereien",          ["Brand-Texte & Tastings,", "nicht das Destillieren"]),
    "kunstgalerie":        ("Kunstgalerien",        ["Werk-Texte & Vernissagen,", "nicht die Kuratierung"]),
    "eisdiele":            ("Eisdielen",            ["Sorten-Texte & Social,", "nicht die Eisherstellung"]),
    "chocolaterie":        ("Chocolaterien",        ["Sorten-Texte & Aktionen,", "nicht die Herstellung"]),
    "teeladen":            ("Teeläden",             ["Sorten-Texte & Social,", "nicht die Verkostung"]),
    "antiquariat":         ("Antiquariate",         ["Katalog-Texte & Listings,", "nicht die Bewertung"]),
    "kaesefachgeschaeft":  ("Käsefachgeschäfte",    ["Sorten-Texte & Pairing,", "nicht die Theke"]),
    "secondhandladen":     ("Secondhand-Läden",     ["Listings & Social,", "nicht der Ankauf"]),
    "plattenladen":        ("Plattenläden",         ["Listings & Social,", "nicht die Bewertung"]),
    "comicladen":          ("Comicläden",           ["Reihen-Texte & Social,", "nicht die Sammler-Beratung"]),
    "wollladen":           ("Wollläden",            ["Garn-Texte & Kurse,", "nicht die Beratung"]),
    "stoffgeschaeft":      ("Stoffgeschäfte",       ["Stoff-Texte & Projekte,", "nicht der Zuschnitt"]),
    "modellbaugeschaeft":  ("Modellbau-Geschäfte",  ["Bausatz-Texte & Social,", "nicht die Technik-Beratung"]),
    "bastelladen":         ("Bastelläden",          ["DIY-Ideen & Social,", "nicht die Beratung"]),
    "kuenstlerbedarf":     ("Künstlerbedarf",       ["Material-Texte & Kurse,", "nicht die Fachberatung"]),
    "bilderrahmung":       ("Bilderrahmung",        ["Angebote & Auftrags-Texte,", "nicht das Einrahmen"]),
    "naehatelier":         ("Nähateliers",          ["Angebote & Anfragen,", "nicht das Nähen"]),
    "haushaltsaufloesung": ("Haushaltsauflösung",   ["Angebote & Anfragen,", "nicht die Besichtigung"]),
    "sattlerei":           ("Sattlereien",          ["Angebote & Auftrags-Texte,", "nicht die Lederarbeit"]),
    "vinothek":            ("Vinotheken",           ["Wein-Texte & Tastings,", "nicht die Verkostung"]),
    "graveur":             ("Graveure",             ["Angebote & Gravur-Texte,", "nicht die Gravur"]),
    "buchbinderei":        ("Buchbindereien",       ["Angebote & Auftrags-Texte,", "nicht das Binden"]),
    "siebdruckerei":       ("Siebdruckereien",      ["Angebote & Anfragen,", "nicht das Drucken"]),
    "stickerei":           ("Stickereien",          ["Angebote & Anfragen,", "nicht das Sticken"]),
    "schneiderei":         ("Maßschneidereien",     ["Angebote & Anfragen,", "nicht das Schneidern"]),
    "keramikwerkstatt":    ("Keramikwerkstätten",   ["Produkttexte & Kurse,", "nicht das Töpfern"]),
    "kunstschmied":        ("Kunstschmieden",       ["Angebote & Referenzen,", "nicht das Schmieden"]),
    "vergolder":           ("Vergolder",            ["Angebote & Referenzen,", "nicht das Vergolden"]),
    "geigenbau":           ("Geigenbau",            ["Angebote & Anfragen,", "nicht der Bau"]),
    "glasblaeserei":       ("Glasbläsereien",       ["Produkttexte & Kurse,", "nicht das Glasblasen"]),
    "drechslerei":         ("Drechslereien",        ["Produkttexte & Kurse,", "nicht das Drechseln"]),
    "orgelbau":            ("Orgelbau",             ["Angebote & Referenzen,", "nicht der Orgelbau"]),
    "klavierstimmer":      ("Klavierstimmer",       ["Termine & Anfragen,", "nicht das Stimmen"]),
    "holzbildhauer":       ("Holzbildhauer",        ["Werk-Texte & Anfragen,", "nicht das Schnitzen"]),
    "seifenmanufaktur":    ("Seifenmanufakturen",   ["Produkttexte & Social,", "nicht das Sieden"]),
    "kerzenmanufaktur":    ("Kerzenmanufakturen",   ["Produkttexte & Social,", "nicht das Giessen"]),
    "korbflechterei":      ("Korbflechtereien",     ["Produkttexte & Kurse,", "nicht das Flechten"]),
    "glasmalerei":         ("Glasmalerei",          ["Angebote & Referenzen,", "nicht der Entwurf"]),
    "hutmacher":           ("Hutmacher",            ["Modell-Texte & Anfragen,", "nicht die Anprobe"]),
    "steinbildhauer":      ("Steinbildhauer",       ["Werk-Texte & Anfragen,", "nicht das Bildhauen"]),
    "messermacher":        ("Messermacher",         ["Produkttexte & Anfragen,", "nicht das Schmieden"]),
    "goldschmied":         ("Goldschmiede",         ["Anfertigungs-Texte & Anfragen,", "nicht das Fassen"]),
    "lederwerkstatt":      ("Lederwerkstätten",     ["Produkttexte & Anfragen,", "nicht der Zuschnitt"]),
    "kalligraphie":        ("Kalligrafie-Ateliers", ["Angebote & Text-Ideen,", "nicht die Handschrift"]),
    "buchhandlung":        ("Buchhandlungen",       ["Empfehlungstexte & Events,", "nicht die Beratung"]),
    "ofenbauer":           ("Ofenbauer",            ["Angebote & Anfragen,", "nicht der Brandschutz"]),
    "pflasterer":          ("Pflasterer",           ["Angebote & Anfragen,", "nicht das Pflastern"]),
    "abbruchunternehmen":  ("Abbruchunternehmen",   ["Angebote & Anfragen,", "nicht die Vor-Ort-Beurteilung"]),
    "wintergartenbau":     ("Wintergartenbau",      ["Angebote & Anfragen,", "nicht die Statik"]),
    "terrassenueberdachung": ("Terrassenüberdachung", ["Angebote & Anfragen,", "nicht die Statik"]),
    "balkonbau":           ("Balkonbau",            ["Angebote & Anfragen,", "nicht die Statik"]),
    "natursteinarbeiten":  ("Natursteinarbeiten",   ["Angebote & Anfragen,", "nicht die Verlegung"]),
    "holzterrassenbau":    ("Holzterrassenbau",     ["Angebote & Anfragen,", "nicht der Bau"]),
    "reetdachdecker":      ("Reetdachdecker",       ["Angebote & Anfragen,", "nicht das Dachdecken"]),
    "zimmerei":            ("Zimmereien",           ["Angebote & Anfragen,", "nicht die Statik"]),
    "gewaechshausbau":     ("Gewächshausbau",       ["Angebote & Anfragen,", "nicht die Statik"]),
    "gabionenbau":         ("Gabionenbau",          ["Angebote & Anfragen,", "nicht die Statik"]),
    "muenzhandel":         ("Münzhandel",           ["Listings & Beschreibungen,", "nicht die Bewertung"]),
    "reformhaus":          ("Reformhäuser",         ["Produkttexte & Social,", "keine Heilversprechen"]),
    "aquaristik":          ("Aquaristik",           ["Pflegetexte & Listings,", "nicht die Ferndiagnose"]),
    "gartenbaumschule":    ("Baumschulen",          ["Pflanzentexte & Saison,", "nicht die Standortberatung"]),
    "fotofachhandel":      ("Fotofachhandel",       ["Produkttexte & Service,", "nicht die Reparatur-Diagnose"]),
    "zoofachhandel":       ("Zoofachhandel",        ["Produkttexte & Social,", "nicht die Tierberatung"]),
    "musikfachhandel":     ("Musikfachhandel",      ["Produkttexte & Listings,", "nicht das Klangurteil"]),
    "teppichhandel":       ("Teppichhandel",        ["Beschreibungen & Listings,", "nicht die Bewertung"]),
    "gewuerzhandel":       ("Gewürzhandel",         ["Produkttexte & Rezepte,", "keine Heilversprechen"]),
    "bettenfachgeschaeft": ("Bettenfachgeschäft",   ["Produkttexte & Social,", "nicht das Probeliegen"]),
    "lampengeschaeft":     ("Lampengeschäfte",      ["Produkttexte & Lichttipps,", "nicht die Installation"]),
    "briefmarkenhandel":   ("Briefmarkenhandel",    ["Beschreibungen & Listings,", "nicht die Echtheitsprüfung"]),
    "fahrradladen":        ("Fahrradläden",         ["Produkttexte & Service,", "nicht die Reparatur-Diagnose"]),
    "parfuemerie":         ("Parfümerien",          ["Dufttexte & Social,", "nicht die Hautberatung"]),
    "naehmaschinenhandel": ("Nähmaschinen",         ["Produkttexte & Service,", "nicht die Reparatur-Diagnose"]),
    "angelladen":          ("Angelfachgeschäfte",   ["Produkttexte & Social,", "keine Rechtsauskunft"]),
    "wollgeschaeft":       ("Wollgeschäfte",        ["Garntexte & Kurse,", "nicht die Maschenprobe"]),
    "lederwaren":          ("Lederwaren",           ["Produkt- & Pflegetexte,", "nicht die Materialprüfung"]),
    "brautmodengeschaeft": ("Brautmoden",           ["Kollektion & Termine,", "nicht die Anprobe"]),
    "weltladen":           ("Weltläden",            ["Produkttexte & Aktionen,", "nicht die Fairtrade-Prüfung"]),
    "schuhmacherei":       ("Schuhmacherei",        ["Service- & Pflegetexte,", "nicht die Reparatur-Diagnose"]),
    "schluesseldienst":    ("Schlüsseldienste",     ["Service- & Preistexte,", "keine Türöffnungs-Anleitung"]),
    "rahmenwerkstatt":     ("Rahmenwerkstätten",    ["Service- & Beratungstexte,", "nicht die Konservierung"]),
    "haushaltswaren":      ("Haushaltswaren",       ["Produkttexte & Social,", "nicht die Beratung"]),
    "schaedlingsbekaempfung": ("Schädlingsbekämpfung", ["Texte & Berichte,", "nicht die Diagnose"]),
    "gravurservice":       ("Gravurservice",        ["Service- & Anlasstexte,", "nicht die Rechteprüfung"]),
    "zeitschriftenhandel": ("Zeitschriftenhandel",  ["Sortiment & Profil,", "keine Tabak-/Lotto-Werbung"]),
    "drogerie":            ("Drogerien",            ["Produkttexte & Social,", "keine Gesundheitsberatung"]),
    "tabakwaren":          ("Tabakfachgeschäfte",   ["Interne Texte & Orga,", "keine Tabakwerbung"]),
    "kuerschner":          ("Kürschner",            ["Service- & Restyling-Texte,", "nicht die Materialprüfung"]),
    "baumfaellung":        ("Baumfällung",          ["Angebote & Anfragen,", "nicht die Genehmigung"]),
    "elektrofachhandel":   ("Elektrofachhandel",    ["Produkttexte & Service,", "nicht die Reparatur-Diagnose"]),
    "gartenmoebel":        ("Gartenmöbel",          ["Produkttexte & Social,", "nicht die Materialberatung"]),
    "fahrradverleih":      ("Fahrradverleih",       ["Angebote & Touren,", "nicht die Übergabe"]),
    "koffergeschaeft":     ("Koffergeschäfte",      ["Produkttexte & Reisetipps,", "nicht die Airline-Regeln"]),
    "antiquitaetenhandel": ("Antiquitätenhandel",   ["Beschreibungen & Listings,", "nicht die Echtheitsprüfung"]),
    "pfandhaus":           ("Pfandhäuser",          ["Erklär- & Service-Texte,", "nicht die Wertschätzung"]),
    "gartenpflege":        ("Gartenpflege",         ["Angebote & Saisontipps,", "nicht die Vor-Ort-Arbeit"]),
    "sportfachhandel":     ("Sportfachhandel",      ["Produkttexte & Service,", "nicht das Fitting"]),
    "schuhgeschaeft":      ("Schuhgeschäfte",       ["Produkttexte & Social,", "nicht die Passform"]),
    "eismanufaktur":       ("Eismanufaktur",        ["Sorten- & Social-Texte,", "keine Heilversprechen"]),
    "kaeserei":            ("Käsereien",            ["Produkttexte & Shop,", "nicht die Kennzeichnung"]),
    "trachtengeschaeft":   ("Trachtengeschäfte",    ["Produkt- & Anlasstexte,", "nicht die Anprobe"]),
    "teppichreinigung":    ("Teppichreinigung",     ["Service- & Pflegetexte,", "nicht die Materialprüfung"]),
    "gebrauchtwarenhandel": ("Gebrauchtwaren",      ["Beschreibungen & Listings,", "nicht die Zustandsprüfung"]),
    "schokoladenmanufaktur": ("Schokoladen-Manufaktur", ["Produkttexte & Shop,", "keine Heilversprechen"]),
    "spieleladen":         ("Spieleläden",          ["Produkttexte & Events,", "nicht die Spielberatung"]),
    "fahrschule":          ("Fahrschulen",          ["Info & Termine,", "nicht der Unterricht"]),
    "tanzschule":          ("Tanzschulen",          ["Kurse & Termine,", "nicht der Unterricht"]),
    "reitstall":           ("Reitställe",           ["Angebote & Orga,", "nicht der Unterricht"]),
    "gardinengeschaeft":   ("Gardinengeschäfte",    ["Produkttexte & Service,", "nicht das Aufmaß"]),
    "skiservice":          ("Skiservice",           ["Service- & Verleihtexte,", "nicht die Bindung"]),
    "sammelkartenladen":   ("Sammelkartenläden",    ["Listings & Events,", "nicht die Echtheitsprüfung"]),
    "sprachschule":        ("Sprachschulen",        ["Kurse & Orga,", "nicht der Unterricht"]),
    "musikschule":         ("Musikschulen",         ["Kurse & Orga,", "nicht der Unterricht"]),
    "bootsverleih":        ("Bootsverleih",         ["Angebote & Texte,", "nicht die Einweisung"]),
    "campingplatz":        ("Campingplätze",        ["Gäste-Texte & Orga,", "nicht der Betrieb"]),
    "ferienwohnung":       ("Ferienwohnungen",      ["Inserate & Gäste-Mails,", "nicht die Pflichten"]),
    "obsthof":             ("Obsthöfe",             ["Produkt- & Saisontexte,", "nicht die Kennzeichnung"]),
    "metzgerei":           ("Metzgereien",          ["Theke & Party-Service,", "nicht die Hygiene"]),
    "eventlocation":       ("Eventlocations",       ["Texte & Anfragen,", "nicht die Sicherheit"]),
    "jugendherberge":      ("Jugendherbergen",      ["Gäste-Texte & Orga,", "nicht die Aufsicht"]),
    "reiseveranstalter":   ("Reiseveranstalter",    ["Reise-Texte & Anfragen,", "nicht die Reisefakten"]),
    "kletterwald":         ("Kletterwälder",        ["Angebote & Texte,", "nicht die Sicherung"]),
    "pizzeria":            ("Pizzerien",            ["Speisekarte & Social,", "nicht die Hygiene"]),
    "nudelmanufaktur":     ("Nudelmanufaktur",      ["Produkttexte & Shop,", "nicht die Kennzeichnung"]),
    "getraenkemarkt":      ("Getränkemärkte",       ["Produkt- & Liefertexte,", "nicht der Jugendschutz"]),
    "waschsalon":          ("Waschsalons",          ["Preis- & Service-Texte,", "nicht die Wartung"]),
    "schneideratelier":    ("Schneiderateliers",    ["Service- & Anlasstexte,", "nicht die Anprobe"]),
    "coworking-space":     ("Coworking-Spaces",     ["Texte & Events,", "nicht die Verträge"]),
    "escape-room":         ("Escape-Rooms",         ["Texte & Buchung,", "keine Spoiler"]),
    "imbiss":              ("Imbisse",              ["Speisekarte & Social,", "nicht die Hygiene"]),
    "spirituosenhandel":   ("Spirituosenhandel",    ["Produkt- & Tastingtexte,", "nicht der Jugendschutz"]),
    "bowlingcenter":       ("Bowlingcenter",        ["Angebote & Events,", "nicht der Betrieb"]),
    "hochzeitsplaner":     ("Hochzeitsplaner",      ["Texte & Orga,", "nicht der grosse Tag"]),
    "tierbestattung":      ("Tierbestattung",       ["Würdevolle Texte,", "nicht der Beistand"]),
    "seniorenbetreuung":   ("Seniorenbetreuung",    ["Texte & Orga,", "nicht die Zuwendung"]),
    "saunabetrieb":        ("Saunabetriebe",        ["Angebote & Aufguss,", "nicht die Hygiene"]),
    "minigolfanlage":      ("Minigolfanlagen",      ["Angebote & Saison,", "nicht die Aufsicht"]),
    "lasertag":            ("Lasertag-Arenen",      ["Angebote & Events,", "nicht das Briefing"]),
    "gnadenhof":           ("Gnadenhöfe",           ["Porträts & Spenden,", "nicht die Tierpflege"]),
    "surfschule":          ("Surfschulen",          ["Kurse & Camps,", "nicht die Wassersicherheit"]),
    "nagelstudio":         ("Nagelstudios",         ["Leistungen & Social,", "nicht die Hygiene"]),
    "indoorspielplatz":    ("Indoorspielplätze",    ["Angebote & Geburtstage,", "nicht die Aufsicht"]),
    "trampolinpark":       ("Trampolinparks",       ["Angebote & Events,", "nicht die Sicherheit"]),
    "bauernhofcafe":       ("Bauernhofcafés",       ["Karte & Saison,", "nicht die Hygiene"]),
    "hochzeitsfotograf":   ("Hochzeitsfotografen",  ["Pakete & Anfragen,", "nicht das Foto"]),
    "hundephysiotherapie": ("Hundephysiotherapie",  ["Texte & Orga,", "nicht die Diagnose"]),
    "imkereibedarf":       ("Imkereibedarf",        ["Produkttexte & Listings,", "keine Bienenberatung"]),
    "mosterei":            ("Mostereien",           ["Produkttexte & Lohnmost,", "nicht die Kennzeichnung"]),
    "oelmuehle":           ("Ölmühlen",             ["Produkttexte & Shop,", "keine Heilversprechen"]),
    "fischzucht":          ("Fischzuchten",         ["Produkttexte & Hofverkauf,", "nicht das Tierwohl"]),
    "destillerie":         ("Destillerien",         ["Produkttexte & Orga,", "keine Alkoholwerbung"]),
    "freibad":             ("Freibäder",            ["Gäste-Infos & Saison,", "nicht die Aufsicht"]),
    "pilzzucht":           ("Pilzzucht",            ["Produkttexte & Gastro,", "keine Pilzbestimmung"]),
    "alpakahof":           ("Alpakahöfe",           ["Angebote & Shop,", "nicht die Tierpflege"]),
    "straussenfarm":       ("Straußenfarmen",       ["Führungen & Produkte,", "nicht die Tierhaltung"]),
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
