#!/usr/bin/env python3
"""
generate_sichtbarkeit_buch.py — Ratgeber „Von KI gefunden werden".

Eigenständiges, verkaufsfertiges eBook (DE + EN), KDP-tauglich. Nutzt die
Layout-Helfer aus generate_ebook.py (gleiche Marke, gleiches Print-Format).
Inhalt ist von Hand geschrieben (anti-hype, du-Form), keine erfundenen Zahlen —
Aussagen über KI-Suche sind als Einschätzung/Prinzip formuliert, nicht als Statistik.

Bauen:  python3 generate_sichtbarkeit_buch.py            # DE + EN -> downloads/
        python3 generate_sichtbarkeit_buch.py de         # nur DE
"""
import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

# Marken-Layout + Helfer aus dem bestehenden Buch-Generator wiederverwenden.
from generate_ebook import (make_styles, footer_canvas, render_blocks,
                            OUT_DIR, AMBER, DARK)

TITLE = {
    "de": "Von KI gefunden werden",
    "en": "Found by AI",
}
SUBTITLE = {
    "de": "Wie lokale Anbieter in ChatGPT, Perplexity & Google AI auftauchen",
    "en": "How local businesses show up in ChatGPT, Perplexity & Google AI",
}


def book_de():
    return {
        "title": TITLE["de"], "subtitle": SUBTITLE["de"],
        "subject": "KI-Sichtbarkeit für lokale Anbieter",
        "keywords": "KI-Sichtbarkeit, ChatGPT, Perplexity, Google AI, lokale SEO, AEO, GEO, DACH",
        "edition": "1. Auflage · 2026",
        "toc_title": "Inhalt",
        "toc_note": ("Dieses Buch ist ein Arbeitsbuch. Lies es einmal durch, dann arbeite "
                     "Kapitel 12 als 30-Tage-Plan ab. Kein Hype, keine Garantien — nur die "
                     "Hebel, die du selbst in der Hand hast."),
        "chapters": CH_DE,
    }


def book_en():
    return {
        "title": TITLE["en"], "subtitle": SUBTITLE["en"],
        "subject": "AI visibility for local businesses",
        "keywords": "AI visibility, ChatGPT, Perplexity, Google AI, local SEO, AEO, GEO",
        "edition": "1st edition · 2026",
        "toc_title": "Contents",
        "toc_note": ("This is a workbook. Read it once, then run chapter 12 as a 30-day plan. "
                     "No hype, no guarantees — only the levers you actually control."),
        "chapters": CH_EN,
    }


# ============================================================
# Inhalt — Deutsch
# ============================================================
CH_DE = [
    {"title": "1 · Die Suche hat sich verschoben", "blocks": [
        ("lead", "Deine Kund:innen googeln nicht mehr nur. Sie fragen."),
        ("p", "„Welche Steuerberatung in Bern ist gut?“ „Wer macht Wärmepumpen in meiner Nähe?“ "
              "Diese Fragen landen heute oft direkt in ChatGPT, Perplexity oder der KI-Übersicht "
              "von Google — und bekommen dort eine fertige Antwort mit zwei, drei Namen. Wenn dein "
              "Name fehlt, existierst du für diese Person in dem Moment nicht."),
        ("p", "Das ist kein Weltuntergang und kein Hype. Es ist eine Verschiebung: weg von „zehn "
              "blaue Links, such dir was aus“ hin zu „hier sind die drei, die ich empfehle“. Wer "
              "empfohlen wird, gewinnt. Wer nicht genannt wird, taucht gar nicht erst auf."),
        ("h3", "Für wen dieses Buch ist"),
        ("ul", ["Lokale Dienstleister: Kanzleien, Praxen, Handwerk, Werkstätten, Studios.",
                "Solo-Selbstständige und kleine Betriebe ohne Marketing-Abteilung.",
                "Alle, die wissen wollen, ob KI sie nennt — und was sie konkret tun können."]),
        ("callout", "Versprechen vorweg: Sichtbarkeit in KI ist beeinflussbar, aber nicht kaufbar. "
                    "Niemand kann dir einen Platz in ChatGPTs Antwort garantieren. Wer das verspricht, "
                    "verkauft dir Luft. Dieses Buch zeigt die echten Hebel."),
    ]},
    {"title": "2 · Wie eine KI-Antwort entsteht (ohne Technik-Kauderwelsch)", "blocks": [
        ("lead", "Du musst nicht verstehen, wie ein Sprachmodell rechnet. Du musst verstehen, woher es seine Namen nimmt."),
        ("p", "Vereinfacht gibt es zwei Quellen. Erstens das, was das Modell beim Training gelesen "
              "hat — riesige Mengen Text aus dem offenen Netz. Zweitens, bei Tools wie Perplexity "
              "oder Google AI, eine Live-Suche im Moment der Frage. Beide stützen sich auf das, was "
              "über dich öffentlich auffindbar und konsistent ist."),
        ("p", "Daraus folgt das ganze Buch: Du wirst genannt, wenn über dich klare, widerspruchsfreie, "
              "an den richtigen Stellen auffindbare Informationen existieren. Nicht, weil du am lautesten "
              "schreist, sondern weil du am eindeutigsten zuzuordnen bist."),
        ("h3", "Drei Dinge, die Modelle mögen"),
        ("ul", ["Klarheit: eine Frage, eine direkte Antwort — nicht in Marketing-Nebel verpackt.",
                "Konsistenz: dein Name, Ort und deine Leistung überall gleich geschrieben.",
                "Bestätigung von außen: andere erwähnen dich, nicht nur du selbst."]),
        ("callout", "Merksatz: Maschinen belohnen Eindeutigkeit. Alles, was dich eindeutiger macht, "
                    "hilft. Alles, was Verwirrung stiftet (drei verschiedene Firmennamen, alte Adressen), schadet."),
    ]},
    {"title": "3 · Kassensturz: Wirst du schon genannt?", "blocks": [
        ("lead", "Bevor du etwas änderst, miss den Ist-Zustand. Sonst rätselst du nur."),
        ("p", "Nimm dir 20 Minuten. Öffne nacheinander ChatGPT, Perplexity und Google (mit der "
              "KI-Übersicht). Stell die Fragen, mit denen ein:e Kund:in dich suchen würde — wörtlich, "
              "ohne deinen Firmennamen zu nennen. Schreib bei jeder Antwort mit, ob du vorkommst, an "
              "welcher Stelle, und ob die Angaben stimmen."),
        ("h3", "Die Prompts (Vorlage zum Anpassen)"),
        ("ul", ["„Welche [Branche] in [Ort] kannst du empfehlen?“",
                "„Ich suche eine gute [Branche] in [Ort] — wen schlägst du vor?“",
                "„Beste [Branche] in [Ort]: worauf sollte ich achten?“",
                "„Wer bietet [deine Hauptleistung] in [Ort] an?“",
                "„[Branche] in [Ort] mit guten Bewertungen?“"]),
        ("h3", "Wie du das Ergebnis liest"),
        ("ul", ["Null Treffer überall: KI kennt dich noch nicht — fang bei Kapitel 4 an.",
                "Genannt, aber falsche Angaben: Daten-Konsistenz reparieren (Kapitel 6).",
                "Vereinzelt genannt: dranbleiben, Bewertungen und Drittquellen ausbauen (Kapitel 8–9).",
                "Regelmäßig oben: gut — halte es und prüfe monatlich (Kapitel 10)."]),
        ("callout", "Notiere auch, welche Wettbewerber genannt werden. Das ist deine echte "
                    "KI-Konkurrenz — und eine Fundgrube: Wo sind die gelistet, wo du fehlst?"),
    ]},
    {"title": "4 · Deine Website: für Menschen und Maschinen", "blocks": [
        ("lead", "Deine Seite ist die wichtigste Quelle über dich, die du voll kontrollierst."),
        ("p", "Die meisten Websites von kleinen Betrieben sagen, wie toll sie sind — aber nicht "
              "nüchtern, was sie für wen, wo und zu welchen Bedingungen tun. Genau das aber sucht "
              "eine Maschine. Schreib so, dass die Antwort auf eine Kund:innen-Frage wörtlich auf "
              "deiner Seite steht."),
        ("h3", "Das Frage-Antwort-Prinzip"),
        ("p", "Nimm die Prompts aus Kapitel 3. Leg für die wichtigsten je einen klaren Abschnitt "
              "oder eine FAQ-Frage an, die sie direkt beantwortet — mit Branche, Ort und Leistung "
              "im Klartext. Beispiel: Überschrift „Wärmepumpen-Installation in Belp und Umgebung“, "
              "darunter zwei Sätze, was du machst, für wen, ab wann."),
        ("ul", ["Eine Aussage pro Absatz, kurze Sätze, keine Schachtelsätze.",
                "Ort und Leistung ausschreiben — nicht „Region“ oder „diverse Services“.",
                "Eine echte FAQ mit den Fragen, die Kund:innen wirklich stellen.",
                "Preise oder Preisrahmen, wo möglich — Klarheit schlägt Geheimnis."]),
        ("callout", "Test: Lies einen Absatz vor und frag dich — beantwortet das eine konkrete "
                    "Kund:innen-Frage? Wenn nein, ist es Deko, kein Signal."),
    ]},
    {"title": "5 · Strukturierte Daten: der Dolmetscher für Maschinen", "blocks": [
        ("lead", "Schema.org ist unsichtbarer Text, der Maschinen sagt, wer du bist."),
        ("p", "Strukturierte Daten (JSON-LD nach schema.org) sind ein kleiner Code-Block im "
              "Quelltext deiner Seite. Für Besucher unsichtbar, für Maschinen glasklar: Name, "
              "Adresse, Telefon, Öffnungszeiten, Leistungen, Bewertungen. Du übersetzt dein "
              "Angebot in ein Format, das KI und Suchmaschinen direkt verstehen."),
        ("h3", "Was du mindestens hinterlegst"),
        ("ul", ["LocalBusiness: Name, Adresse, Geo, Telefon, Öffnungszeiten, Website.",
                "Die konkreten Leistungen (services) mit klaren Bezeichnungen.",
                "FAQPage: deine FAQ aus Kapitel 4 auch maschinenlesbar.",
                "Wenn vorhanden: echte Bewertungen (keine erfundenen — das fliegt auf)."]),
        ("p", "Du brauchst dafür keine Programmierkenntnisse. Viele Website-Baukästen und "
              "WordPress-Plugins erzeugen das auf Knopfdruck. Wichtig ist nur: Die Angaben im "
              "Schema müssen exakt zu denen auf der Seite passen."),
        ("callout", "Prüf dein Schema mit dem „Rich Results Test“ von Google (kostenlos). Er sagt "
                    "dir, ob die Maschine deine Daten sauber liest."),
    ]},
    {"title": "6 · Ein Signal, überall gleich (NAP)", "blocks": [
        ("lead", "Name, Adresse, Telefon — überall identisch. Das klingt banal und ist der häufigste Fehler."),
        ("p", "NAP steht für Name, Address, Phone. Wenn dein Betrieb auf der Website „Müller "
              "Heizungsbau GmbH“ heißt, bei Google „Müller Sanitär & Heizung“ und im Branchenbuch "
              "„H. Müller Installationen“, dann sieht eine Maschine drei mögliche Firmen — und ist "
              "sich bei keiner sicher. Unsicherheit führt dazu, dass du nicht genannt wirst."),
        ("h3", "Aufräumen in vier Schritten"),
        ("ul", ["Leg eine Master-Schreibweise fest: ein Name, eine Adresse, eine Telefonnummer.",
                "Liste alle Orte, wo du auftauchst (Website, Google, Verzeichnisse, Social).",
                "Korrigiere jeden Ort auf die Master-Schreibweise — auch alte Einträge.",
                "Schließe oder aktualisiere doppelte/veraltete Profile."]),
        ("callout", "Konsistenz ist unsexy, aber sie ist die billigste und wirksamste Maßnahme in "
                    "diesem Buch. Einen Nachmittag Arbeit, dauerhafter Effekt."),
    ]},
    {"title": "7 · Google-Unternehmensprofil & Karten", "blocks": [
        ("lead", "Das Google-Unternehmensprofil ist für lokale Anbieter die halbe Miete."),
        ("p", "Google AI-Übersichten und Karten ziehen stark aus dem Unternehmensprofil (früher "
              "„Google My Business“). Es ist kostenlos, du verifizierst dich einmal, und dann "
              "kontrollierst du, was Google — und damit auch viele KI-Antworten — über dich weiß."),
        ("h3", "Pflichtprogramm"),
        ("ul", ["Kategorie korrekt und so spezifisch wie möglich wählen.",
                "Leistungen, Gebiet, Öffnungszeiten vollständig ausfüllen.",
                "Echte Fotos hochladen — sie schaffen Vertrauen und Aktivität.",
                "Fragen-&-Antworten-Bereich selbst mit echten Fragen befüllen.",
                "Regelmäßig einen kurzen Beitrag posten — zeigt: der Laden lebt."]),
        ("callout", "Vollständigkeit schlägt Tricks. Ein zu 100 % ausgefülltes, gepflegtes Profil "
                    "wirkt mehr als jede „Geheim-Taktik“."),
    ]},
    {"title": "8 · In die Quellen, die KI liest", "blocks": [
        ("lead", "Modelle nennen oft Anbieter, die sie in seriösen Listen gefunden haben."),
        ("p", "Wenn eine KI nach „guten Anbietern“ gefragt wird, greift sie gern auf Verzeichnisse, "
              "Vergleichsseiten und Bewertungsplattformen zurück — weil dort mehrere Anbieter "
              "strukturiert nebeneinander stehen. Bist du dort gelistet, steigt die Chance, genannt "
              "zu werden. Fehlst du, fehlst du auch in der Antwort."),
        ("h3", "Wo du hingehörst"),
        ("ul", ["Die zwei, drei wichtigsten Branchenverzeichnisse deiner Nische.",
                "Regionale Verzeichnisse (Stadt, Handelskammer, lokale Portale).",
                "Bewertungsplattformen, die in deiner Branche zählen.",
                "Fachspezifische Listen — dort, wo Kund:innen ohnehin vergleichen."]),
        ("h3", "Bewertungen: Menge und Aktualität"),
        ("p", "Bewertungen sind ein starkes Signal — nicht nur die Sterne, auch wie viele und wie "
              "frisch. Bitte zufriedene Kund:innen aktiv und freundlich um eine kurze Bewertung. "
              "Nicht kaufen, nicht fälschen: Beides fliegt auf und schadet mehr, als es nützt."),
        ("callout", "Eine ehrliche Bitte direkt nach erledigter Arbeit wirkt am besten: „Wenn Sie "
                    "zufrieden waren, hilft mir eine kurze Bewertung sehr.“"),
    ]},
    {"title": "9 · Von Dritten erwähnt werden", "blocks": [
        ("lead", "Was andere über dich schreiben, wiegt schwerer als das, was du über dich schreibst."),
        ("p", "Eine Erwähnung in der Lokalzeitung, einem Fachblog, einer Partner-Seite oder einem "
              "Branchen-Newsletter ist Gold: Maschinen werten unabhängige Quellen höher als "
              "Eigenwerbung. Du musst dafür keine PR-Agentur engagieren — kleine, echte Anlässe reichen."),
        ("h3", "Realistische Wege"),
        ("ul", ["Lokale Medien bei einem echten Anlass anschreiben (Neueröffnung, Aktion, Expertise).",
                "Mit Partnern gegenseitig verlinken (Lieferanten, ergänzende Betriebe).",
                "Einen Gastbeitrag oder ein Experten-Zitat in einem Fachmedium anbieten.",
                "Bei lokalen Vereinen/Initiativen sichtbar sein, die online erwähnt werden."]),
        ("callout", "Qualität vor Masse: Eine echte Erwähnung auf einer relevanten Seite ist mehr "
                    "wert als hundert wertlose Linktausch-Einträge — die schaden inzwischen eher."),
    ]},
    {"title": "10 · Messen und dranbleiben", "blocks": [
        ("lead", "KI-Sichtbarkeit ist kein Projekt mit Enddatum, sondern ein Rhythmus."),
        ("p", "KI-Antworten ändern sich — durch neue Trainingsstände, neue Konkurrenz, neue "
              "Quellen. Was zählt, ist die Entwicklung über Monate, nicht eine Momentaufnahme. "
              "Richte dir einen einfachen Monats-Check ein, der zehn Minuten dauert."),
        ("h3", "Dein Monats-Check"),
        ("ul", ["Dieselben Prompts aus Kapitel 3 erneut stellen — immer gleich, damit vergleichbar.",
                "Notieren: genannt ja/nein, an welcher Stelle, Angaben korrekt?",
                "Eine Sache verbessern, die der Check aufgedeckt hat.",
                "Neue Wettbewerber-Nennungen prüfen: Wo sind die gelistet?"]),
        ("p", "Wenn du das nicht selbst machen willst: Genau dafür gibt es Monitoring-Dienste, die "
              "den Check automatisch fahren und dir die Veränderung schicken. Aber das Prinzip "
              "bleibt — regelmäßig messen, eine Sache verbessern, wiederholen."),
        ("callout", "Tracker-Tipp: Eine simple Tabelle mit Monat, Prompt, „genannt?“ und Notiz "
                    "reicht völlig. Der Wert liegt in der Linie, nicht im Werkzeug."),
    ]},
    {"title": "11 · Was nicht funktioniert (und Geld kostet)", "blocks": [
        ("lead", "Wo neue Sichtbarkeit entsteht, sind die Abzocker nicht weit. Ein paar klare Warnzeichen."),
        ("ul", ["„Wir garantieren Platz 1 in ChatGPT.“ — Unmöglich. Niemand kontrolliert die Ausgabe.",
                "„Geheime KI-SEO-Methode.“ — Es gibt keine Geheimnisse, nur saubere Grundlagenarbeit.",
                "Gekaufte Bewertungen/Backlinks im großen Stil. — Fliegt auf, schadet langfristig.",
                "Text mit Keywords vollstopfen. — Maschinen erkennen das und werten es ab.",
                "Hunderte Verzeichnis-Einträge auf einmal. — Nur die relevanten zählen, der Rest ist Lärm."]),
        ("p", "Die unbequeme Wahrheit: Es gibt keine Abkürzung. Die Hebel in diesem Buch wirken, "
              "weil sie dich für Maschinen eindeutig und für Menschen vertrauenswürdig machen — "
              "nicht, weil sie ein System austricksen."),
        ("callout", "Faustregel: Wenn ein Angebot „garantiert“, „geheim“ oder „über Nacht“ verspricht, "
                    "ist es das Geld nicht wert. Steck die Zeit lieber in die Grundlagen."),
    ]},
    {"title": "12 · Dein 30-Tage-Plan", "blocks": [
        ("lead", "Lesen reicht nicht. Hier ist die Reihenfolge, in der du es abarbeitest."),
        ("h3", "Woche 1 — Bestandsaufnahme & Aufräumen"),
        ("ul", ["Kassensturz machen (Kapitel 3): Prompts testen, notieren.",
                "NAP vereinheitlichen (Kapitel 6): eine Schreibweise, überall.",
                "Google-Unternehmensprofil vervollständigen (Kapitel 7)."]),
        ("h3", "Woche 2 — Website schärfen"),
        ("ul", ["Pro Top-Frage einen klaren Abschnitt/FAQ-Eintrag schreiben (Kapitel 4).",
                "Strukturierte Daten einbauen oder erzeugen lassen (Kapitel 5).",
                "Mit dem Rich-Results-Test prüfen."]),
        ("h3", "Woche 3 — Quellen & Bewertungen"),
        ("ul", ["In die 3–5 relevanten Verzeichnisse eintragen (Kapitel 8).",
                "Bewertungs-Bitte als festen Ablauf nach jedem Auftrag etablieren.",
                "Eine Drittquelle anstoßen: Medium, Partner, Verein (Kapitel 9)."]),
        ("h3", "Woche 4 — Messen & verstetigen"),
        ("ul", ["Monats-Check einrichten (Kapitel 10): Tabelle, Termin im Kalender.",
                "Prompts erneut testen, Veränderung notieren.",
                "Den Rhythmus festlegen: einmal im Monat, eine Sache verbessern."]),
        ("callout", "Du musst nicht alles perfekt machen. Wenn du nur NAP-Konsistenz, ein "
                    "vollständiges Google-Profil und drei gute Verzeichnis-Einträge schaffst, bist "
                    "du den meisten lokalen Anbietern in deiner Nische voraus."),
        ("p", "Viel Erfolg — und denk dran: Sichtbarkeit ist beeinflussbar, nicht kaufbar. Du hast "
              "die Hebel jetzt in der Hand. — Aban"),
    ]},
    {"title": "13 · Kopier-Vorlagen zum Anpassen", "blocks": [
        ("lead", "Damit du nicht bei null anfängst: fertige Bausteine. Pass die eckigen Klammern an und nutze sie."),
        ("h3", "FAQ-Eintrag (Frage-Antwort, klar)"),
        ("callout", "Frage: Wer macht [Leistung] in [Ort]? — Antwort: Wir sind [Firma], "
                    "[Betriebsart] in [Ort]. Wir machen [Leistung 1], [Leistung 2] und [Leistung 3] "
                    "für [Zielgruppe]. Termine in der Regel innerhalb von [Zeitraum]. Kontakt: "
                    "[Telefon] oder [E-Mail]."),
        ("h3", "Strukturierte Daten (LocalBusiness, Grundgerüst)"),
        ("p", "Diesen Block (oder ein passendes Plugin) in den Kopf deiner Seite einbauen, die "
              "eckigen Klammern ausfüllen, dann mit Googles Rich-Results-Test prüfen:"),
        ("src", ["{ \"@context\": \"https://schema.org\", \"@type\": \"LocalBusiness\",",
                 "  \"name\": \"[Firma]\", \"telephone\": \"[Telefon]\",",
                 "  \"address\": { \"@type\": \"PostalAddress\", \"streetAddress\": \"[Strasse]\",",
                 "    \"postalCode\": \"[PLZ]\", \"addressLocality\": \"[Ort]\" },",
                 "  \"url\": \"[Website]\", \"areaServed\": \"[Ort/Region]\",",
                 "  \"openingHours\": \"Mo-Fr 08:00-17:00\" }"]),
        ("h3", "Bewertungs-Bitte (nach erledigtem Auftrag)"),
        ("callout", "„Hallo [Name], danke für Ihr Vertrauen. Wenn Sie mit unserer Arbeit zufrieden "
                    "waren, hilft mir eine kurze Bewertung auf [Plattform] sehr — sie ist in zwei "
                    "Minuten erledigt: [Link]. Vielen Dank und beste Grüße, [dein Name].“"),
        ("h3", "Presse-/Partner-Anschreiben (lokaler Anlass)"),
        ("callout", "„Guten Tag [Redaktion/Name], wir sind [Firma] aus [Ort] und haben gerade "
                    "[konkreter Anlass: Neueröffnung / Aktion / Projekt]. Falls das für Ihre "
                    "Leser:innen interessant ist, stelle ich gern Infos und ein Foto bereit. "
                    "Beste Grüße, [Name], [Kontakt].“"),
        ("h3", "Verzeichnis-Startliste (allgemein)"),
        ("ul", ["Google-Unternehmensprofil (Pflicht).",
                "Das wichtigste Branchenverzeichnis deiner Nische.",
                "Ein bis zwei regionale Portale (Stadt/Region/Kammer).",
                "Die Bewertungsplattform, die in deiner Branche zählt.",
                "Branchenbuch/Apple Karten/Bing Places für Vollständigkeit."]),
    ]},
    {"title": "14 · Branchen-Schnellstart", "blocks": [
        ("lead", "Dieselben Prinzipien, auf gängige lokale Betriebe heruntergebrochen. Such dir deins."),
        ("h3", "Handwerk (Heizung, Elektro, Sanitär, Bau)"),
        ("ul", ["Gebiet klar benennen: nicht „Region“, sondern die Orte, die du wirklich anfährst.",
                "Notdienst/Verfügbarkeit angeben — danach wird oft gefragt.",
                "Vorher-/Nachher-Fotos und echte Projekte zeigen."]),
        ("h3", "Gesundheit (Praxen, Therapie, Pflege)"),
        ("ul", ["Leistungen und Schwerpunkte konkret nennen (nicht nur „allgemein“).",
                "Termin-/Aufnahmehinweise klar machen (neue Patient:innen ja/nein).",
                "Heikle Daten sparsam — kein Tracking, DSGVO ernst nehmen."]),
        ("h3", "Beratung (Kanzlei, Steuer, Coaching)"),
        ("ul", ["Für wen du arbeitest (Zielgruppe) und für wen nicht — schafft Eindeutigkeit.",
                "Erstgespräch/Ablauf transparent beschreiben.",
                "Fachbeiträge oder Erklärstücke veröffentlichen — gute Drittquellen-Kandidaten."]),
        ("h3", "Gastro & lokaler Handel"),
        ("ul", ["Öffnungszeiten penibel aktuell halten — der häufigste Frust-Punkt.",
                "Speisekarte/Sortiment maschinenlesbar (Text, nicht nur Bild-PDF).",
                "Aktualität zeigen: regelmäßig posten, frische Fotos, aktuelle Angebote."]),
        ("callout", "Egal welche Branche: NAP-Konsistenz, vollständiges Google-Profil und drei "
                    "relevante Verzeichnisse sind immer die ersten drei Schritte. Der Rest ist Kür."),
    ]},
]

CH_EN = [
    {"title": "1 · Search has shifted", "blocks": [
        ("lead", "Your customers don't just google anymore. They ask."),
        ("p", "„Which accountant in Bristol is any good?“ „Who installs heat pumps near me?“ These "
              "questions now often go straight into ChatGPT, Perplexity or Google's AI overview — "
              "and come back as a finished answer naming two or three businesses. If your name isn't "
              "in it, you don't exist for that person in that moment."),
        ("p", "This isn't doom, and it isn't hype. It's a shift: from „ten blue links, pick one“ to "
              "„here are the three I recommend“. Whoever gets recommended wins. Whoever isn't named "
              "never even shows up."),
        ("h3", "Who this book is for"),
        ("ul", ["Local service providers: firms, practices, trades, workshops, studios.",
                "Solo operators and small businesses without a marketing department.",
                "Anyone who wants to know whether AI names them — and what to do about it."]),
        ("callout", "A promise up front: AI visibility can be influenced, but not bought. Nobody can "
                    "guarantee you a spot in ChatGPT's answer. Anyone who promises that is selling air. "
                    "This book shows the real levers."),
    ]},
    {"title": "2 · How an AI answer is built (no jargon)", "blocks": [
        ("lead", "You don't need to understand how a language model computes. You need to understand where it gets its names."),
        ("p", "Simplified, there are two sources. First, what the model read during training — huge "
              "amounts of text from the open web. Second, with tools like Perplexity or Google AI, a "
              "live search at the moment of the question. Both rely on what is publicly findable and "
              "consistent about you."),
        ("p", "That's the whole book in one sentence: you get named when clear, contradiction-free, "
              "findable information about you exists in the right places. Not because you shout "
              "loudest, but because you're the easiest to identify."),
        ("h3", "Three things models like"),
        ("ul", ["Clarity: one question, one direct answer — not wrapped in marketing fog.",
                "Consistency: your name, location and service spelled the same everywhere.",
                "Outside confirmation: others mention you, not just yourself."]),
        ("callout", "Remember: machines reward unambiguity. Anything that makes you clearer helps. "
                    "Anything that causes confusion (three company names, old addresses) hurts."),
    ]},
    {"title": "3 · Reality check: are you already named?", "blocks": [
        ("lead", "Before you change anything, measure where you stand. Otherwise you're just guessing."),
        ("p", "Take 20 minutes. Open ChatGPT, Perplexity and Google (with the AI overview) one after "
              "another. Ask the questions a customer would use to find you — literally, without naming "
              "your company. For each answer, note whether you appear, in which position, and whether "
              "the details are correct."),
        ("h3", "The prompts (template to adapt)"),
        ("ul", ["„Which [industry] in [town] would you recommend?“",
                "„I'm looking for a good [industry] in [town] — who would you suggest?“",
                "„Best [industry] in [town]: what should I look out for?“",
                "„Who offers [your main service] in [town]?“",
                "„[Industry] in [town] with good reviews?“"]),
        ("h3", "How to read the result"),
        ("ul", ["Zero hits everywhere: AI doesn't know you yet — start at chapter 4.",
                "Named, but wrong details: fix your data consistency (chapter 6).",
                "Occasionally named: keep going, build reviews and third-party sources (chapters 8–9).",
                "Regularly on top: good — hold it and check monthly (chapter 10)."]),
        ("callout", "Also note which competitors get named. That's your real AI competition — and a "
                    "goldmine: where are they listed that you're missing?"),
    ]},
    {"title": "4 · Your website: for humans and machines", "blocks": [
        ("lead", "Your site is the most important source about you that you fully control."),
        ("p", "Most small-business websites say how great they are — but not, plainly, what they do, "
              "for whom, where and on what terms. Yet that's exactly what a machine is looking for. "
              "Write so that the answer to a customer's question is literally on your page."),
        ("h3", "The question-and-answer principle"),
        ("p", "Take the prompts from chapter 3. For the most important ones, create a clear section "
              "or FAQ entry that answers them directly — with industry, town and service in plain "
              "words. Example: heading „Heat-pump installation in and around Belp“, followed by two "
              "sentences on what you do, for whom, and your lead time."),
        ("ul", ["One statement per paragraph, short sentences, no nesting.",
                "Spell out town and service — not „region“ or „various services“.",
                "A real FAQ with the questions customers actually ask.",
                "Prices or price ranges where possible — clarity beats mystery."]),
        ("callout", "Test: read a paragraph aloud and ask — does this answer a concrete customer "
                    "question? If not, it's decoration, not signal."),
    ]},
    {"title": "5 · Structured data: the translator for machines", "blocks": [
        ("lead", "Schema.org is invisible text that tells machines who you are."),
        ("p", "Structured data (JSON-LD per schema.org) is a small code block in your page's source. "
              "Invisible to visitors, crystal clear to machines: name, address, phone, opening hours, "
              "services, reviews. You translate your offer into a format AI and search engines read "
              "directly."),
        ("h3", "What to include at minimum"),
        ("ul", ["LocalBusiness: name, address, geo, phone, opening hours, website.",
                "Your concrete services with clear labels.",
                "FAQPage: your chapter-4 FAQ in machine-readable form.",
                "If you have them: real reviews (never fake ones — it backfires)."]),
        ("p", "You don't need coding skills. Many website builders and WordPress plugins generate "
              "this at the click of a button. The only thing that matters: the schema must match the "
              "page exactly."),
        ("callout", "Check your schema with Google's free „Rich Results Test“. It tells you whether "
                    "the machine reads your data cleanly."),
    ]},
    {"title": "6 · One signal, the same everywhere (NAP)", "blocks": [
        ("lead", "Name, address, phone — identical everywhere. Sounds trivial, and it's the most common mistake."),
        ("p", "NAP stands for Name, Address, Phone. If your business is „Miller Heating Ltd“ on the "
              "website, „Miller Plumbing & Heating“ on Google and „H. Miller Installations“ in a "
              "directory, a machine sees three possible companies — and isn't sure about any of them. "
              "Uncertainty means you don't get named."),
        ("h3", "Clean up in four steps"),
        ("ul", ["Set one master spelling: one name, one address, one phone number.",
                "List every place you appear (website, Google, directories, social).",
                "Correct each one to the master spelling — including old entries.",
                "Close or update duplicate/outdated profiles."]),
        ("callout", "Consistency is unsexy, but it's the cheapest and most effective measure in this "
                    "book. One afternoon of work, a lasting effect."),
    ]},
    {"title": "7 · Google Business Profile & maps", "blocks": [
        ("lead", "For local businesses, the Google Business Profile is half the battle."),
        ("p", "Google AI overviews and maps pull heavily from the Business Profile (formerly „Google "
              "My Business“). It's free, you verify once, and then you control what Google — and "
              "therefore many AI answers — knows about you."),
        ("h3", "The essentials"),
        ("ul", ["Choose your category correctly and as specifically as possible.",
                "Fill in services, area, opening hours completely.",
                "Upload real photos — they build trust and signal activity.",
                "Populate the Q&A section yourself with real questions.",
                "Post a short update regularly — it shows the business is alive."]),
        ("callout", "Completeness beats tricks. A 100%-filled, maintained profile does more than any "
                    "„secret tactic“."),
    ]},
    {"title": "8 · Into the sources AI reads", "blocks": [
        ("lead", "Models often name businesses they found in reputable lists."),
        ("p", "When an AI is asked for „good providers“, it likes to fall back on directories, "
              "comparison sites and review platforms — because several providers sit there side by "
              "side in a structured way. If you're listed, your chance of being named rises. If "
              "you're missing, you're missing from the answer too."),
        ("h3", "Where you belong"),
        ("ul", ["The two or three most important industry directories in your niche.",
                "Regional directories (city, chamber of commerce, local portals).",
                "Review platforms that matter in your industry.",
                "Niche-specific lists — where customers compare anyway."]),
        ("h3", "Reviews: volume and freshness"),
        ("p", "Reviews are a strong signal — not just the stars, but how many and how recent. Ask "
              "satisfied customers, actively and kindly, for a short review. Don't buy them, don't "
              "fake them: both get found out and hurt more than they help."),
        ("callout", "An honest ask right after the job works best: „If you were happy, a short review "
                    "would help me a lot.“"),
    ]},
    {"title": "9 · Getting mentioned by others", "blocks": [
        ("lead", "What others write about you weighs more than what you write about yourself."),
        ("p", "A mention in the local paper, a trade blog, a partner's site or an industry newsletter "
              "is gold: machines weigh independent sources higher than self-promotion. You don't need "
              "a PR agency for this — small, genuine occasions are enough."),
        ("h3", "Realistic routes"),
        ("ul", ["Contact local media on a real occasion (opening, campaign, expertise).",
                "Link reciprocally with partners (suppliers, complementary businesses).",
                "Offer a guest post or an expert quote to a trade outlet.",
                "Be visible in local clubs/initiatives that get mentioned online."]),
        ("callout", "Quality over quantity: one real mention on a relevant site is worth more than a "
                    "hundred worthless link-exchange entries — which now tend to hurt."),
    ]},
    {"title": "10 · Measure and keep at it", "blocks": [
        ("lead", "AI visibility isn't a project with an end date, it's a rhythm."),
        ("p", "AI answers change — through new training, new competition, new sources. What counts is "
              "the trend over months, not a single snapshot. Set up a simple monthly check that takes "
              "ten minutes."),
        ("h3", "Your monthly check"),
        ("ul", ["Ask the same prompts from chapter 3 again — always the same, so they're comparable.",
                "Note: named yes/no, in which position, details correct?",
                "Improve one thing the check revealed.",
                "Check new competitor mentions: where are they listed?"]),
        ("p", "If you don't want to do it yourself: that's exactly what monitoring services are for — "
              "they run the check automatically and send you the change. But the principle stays the "
              "same — measure regularly, improve one thing, repeat."),
        ("callout", "Tracker tip: a simple table with month, prompt, „named?“ and a note is plenty. "
                    "The value is in the trend line, not the tool."),
    ]},
    {"title": "11 · What doesn't work (and costs money)", "blocks": [
        ("lead", "Where new visibility appears, the scammers aren't far. A few clear warning signs."),
        ("ul", ["„We guarantee #1 in ChatGPT.“ — Impossible. Nobody controls the output.",
                "„Secret AI-SEO method.“ — There are no secrets, only clean fundamentals.",
                "Bought reviews/backlinks at scale. — Gets found out, hurts long term.",
                "Stuffing text with keywords. — Machines spot it and downrank it.",
                "Hundreds of directory entries at once. — Only the relevant ones count, the rest is noise."]),
        ("p", "The uncomfortable truth: there's no shortcut. The levers in this book work because "
              "they make you unambiguous to machines and trustworthy to humans — not because they "
              "trick a system."),
        ("callout", "Rule of thumb: if an offer promises „guaranteed“, „secret“ or „overnight“, it's "
                    "not worth the money. Put the time into the fundamentals instead."),
    ]},
    {"title": "12 · Your 30-day plan", "blocks": [
        ("lead", "Reading isn't enough. Here's the order to work through it."),
        ("h3", "Week 1 — audit & clean-up"),
        ("ul", ["Do the reality check (chapter 3): test prompts, take notes.",
                "Unify NAP (chapter 6): one spelling, everywhere.",
                "Complete your Google Business Profile (chapter 7)."]),
        ("h3", "Week 2 — sharpen the website"),
        ("ul", ["Write one clear section/FAQ entry per top question (chapter 4).",
                "Add structured data or have it generated (chapter 5).",
                "Verify with the Rich Results Test."]),
        ("h3", "Week 3 — sources & reviews"),
        ("ul", ["Get listed in the 3–5 relevant directories (chapter 8).",
                "Make a review request a fixed step after every job.",
                "Trigger one third-party source: outlet, partner, club (chapter 9)."]),
        ("h3", "Week 4 — measure & sustain"),
        ("ul", ["Set up the monthly check (chapter 10): table, calendar reminder.",
                "Test the prompts again, note the change.",
                "Lock in the rhythm: once a month, improve one thing."]),
        ("callout", "You don't have to do everything perfectly. If you only manage NAP consistency, a "
                    "complete Google profile and three good directory entries, you're ahead of most "
                    "local providers in your niche."),
        ("p", "Good luck — and remember: visibility can be influenced, not bought. The levers are in "
              "your hands now. — Aban"),
    ]},
    {"title": "13 · Copy-and-adapt templates", "blocks": [
        ("lead", "So you don't start from zero: ready-made building blocks. Fill in the brackets and use them."),
        ("h3", "FAQ entry (question-answer, clear)"),
        ("callout", "Question: Who does [service] in [town]? — Answer: We are [company], a "
                    "[business type] in [town]. We do [service 1], [service 2] and [service 3] for "
                    "[target group]. Appointments usually within [time frame]. Contact: [phone] or "
                    "[email]."),
        ("h3", "Structured data (LocalBusiness, skeleton)"),
        ("p", "Put this block (or a suitable plugin) in your page head, fill the brackets, then check "
              "with Google's Rich Results Test:"),
        ("src", ["{ \"@context\": \"https://schema.org\", \"@type\": \"LocalBusiness\",",
                 "  \"name\": \"[Company]\", \"telephone\": \"[Phone]\",",
                 "  \"address\": { \"@type\": \"PostalAddress\", \"streetAddress\": \"[Street]\",",
                 "    \"postalCode\": \"[ZIP]\", \"addressLocality\": \"[Town]\" },",
                 "  \"url\": \"[Website]\", \"areaServed\": \"[Town/Region]\",",
                 "  \"openingHours\": \"Mo-Fr 08:00-17:00\" }"]),
        ("h3", "Review request (after a completed job)"),
        ("callout", "„Hi [Name], thank you for your trust. If you were happy with our work, a short "
                    "review on [platform] would help me a lot — it takes two minutes: [link]. Thanks "
                    "and best regards, [your name].“"),
        ("h3", "Press/partner outreach (local occasion)"),
        ("callout", "„Hello [editor/name], we're [company] from [town] and have just [concrete "
                    "occasion: opening / campaign / project]. If that's of interest to your readers, "
                    "I'm happy to provide details and a photo. Best regards, [name], [contact].“"),
        ("h3", "Directory starter list (general)"),
        ("ul", ["Google Business Profile (mandatory).",
                "The most important industry directory in your niche.",
                "One or two regional portals (city/region/chamber).",
                "The review platform that matters in your industry.",
                "Apple Maps / Bing Places for completeness."]),
    ]},
    {"title": "14 · Industry quick-start", "blocks": [
        ("lead", "The same principles, broken down for common local businesses. Find yours."),
        ("h3", "Trades (heating, electrical, plumbing, construction)"),
        ("ul", ["Name your area clearly: not „region“, but the towns you actually serve.",
                "State emergency/availability — it's a frequent question.",
                "Show before/after photos and real projects."]),
        ("h3", "Health (practices, therapy, care)"),
        ("ul", ["Name services and specialisms concretely (not just „general“).",
                "Make intake clear (accepting new patients yes/no).",
                "Be sparing with sensitive data — no tracking, take privacy seriously."]),
        ("h3", "Advisory (firms, accounting, coaching)"),
        ("ul", ["Who you work for (and who you don't) — creates clarity.",
                "Describe the first meeting/process transparently.",
                "Publish articles or explainers — good third-party-source candidates."]),
        ("h3", "Hospitality & local retail"),
        ("ul", ["Keep opening hours meticulously current — the biggest frustration point.",
                "Make your menu/range machine-readable (text, not just an image PDF).",
                "Show you're active: post regularly, fresh photos, current offers."]),
        ("callout", "Whatever the industry: NAP consistency, a complete Google profile and three "
                    "relevant directories are always the first three steps. The rest is bonus."),
    ]},
]


SAMPLE_CTA = {
    "de": {"title": "Weiterlesen", "blocks": [
        ("lead", "Das war der Gratis-Auszug (Kapitel 1–3)."),
        ("p", "Die vollständige Ausgabe hat 14 Kapitel inklusive Website-Schärfung, strukturierten "
              "Daten zum Kopieren, Verzeichnis- und Bewertungs-Strategie, dem 30-Tage-Plan und "
              "fertigen Vorlagen (Schema-Code, Bewertungs-Bitte, Presse-Mail) sowie einem "
              "Branchen-Schnellstart."),
        ("callout", "Vollversion holen: abannews.com/ki-sichtbarkeit-buch — 9,99 €, PDF & ePub, "
                    "ohne Abo. Oder als Taschenbuch/Kindle bei Amazon."),
    ]},
    "en": {"title": "Keep reading", "blocks": [
        ("lead", "That was the free excerpt (chapters 1–3)."),
        ("p", "The full edition has 14 chapters including website sharpening, copy-paste structured "
              "data, directory and review strategy, the 30-day plan and ready-made templates "
              "(schema code, review request, press email) plus an industry quick-start."),
        ("callout", "Get the full version: abannews.com/ki-sichtbarkeit-buch — €9.99, PDF & ePub, "
                    "no subscription. Or as paperback/Kindle on Amazon."),
    ]},
}


def build_lang(lang, data, sample=False):
    styles = make_styles()
    suffix = "" if lang == "de" else "-" + lang
    if sample:
        data = dict(data)
        data["chapters"] = data["chapters"][:3] + [SAMPLE_CTA[lang]]
        data["edition"] = data["edition"] + (" · Leseprobe" if lang == "de" else " · Sample")
        suffix += "-sample" if False else ""
    filename = "ki-sichtbarkeit-buch%s%s.pdf" % (suffix, "-sample" if sample else "")
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, filename), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2.2 * cm,
        title="%s — %s" % (data["title"], data["subtitle"]),
        author="Aban / aban news", subject=data["subject"],
        keywords=data["keywords"], creator="aban news — abannews.com",
    )
    story = []
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("&#128269;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=58, alignment=TA_CENTER, textColor=AMBER)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=16,
        alignment=TA_CENTER, textColor=DARK, spaceAfter=24)))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(data["title"], styles["CoverTitle"]))
    story.append(Paragraph(data["subtitle"], styles["CoverSub"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(data["edition"], styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())
    story.append(Paragraph(data["toc_title"], styles["Chapter"]))
    for i, ch in enumerate(data["chapters"], 1):
        story.append(Paragraph(
            '<font color="#d97706"><b>%02d</b></font>&nbsp;&nbsp;%s' % (i, ch["title"]),
            styles["TocItem"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(data["toc_note"], styles["Lead"]))
    story.append(PageBreak())
    for ch in data["chapters"]:
        story.append(Paragraph(ch["title"], styles["Chapter"]))
        render_blocks(story, styles, ch["blocks"])
        story.append(PageBreak())
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print("✓ downloads/%s erstellt (%d Kapitel)" % (filename, len(data["chapters"])))


def build(langs=None):
    books = {"de": book_de, "en": book_en}
    for lang in (langs or ["de", "en"]):
        data = books[lang]()
        if not data["chapters"]:
            print("(%s übersprungen — kein Inhalt)" % lang)
            continue
        build_lang(lang, data, sample=False)   # Vollversion (git-ignored -> KDP/Lemon Squeezy)
        build_lang(lang, data, sample=True)    # Gratis-Leseprobe (committet)


if __name__ == "__main__":
    build(sys.argv[1:] or None)
