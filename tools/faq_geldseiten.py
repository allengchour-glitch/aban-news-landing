#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Häufige Fragen auf die vier Verkaufsseiten ohne FAQ — jede Antwort aus der Seite belegt.

    python3 tools/faq_geldseiten.py          # idempotent (Marke data-aban-faq)

⚠️ WOZU. tools/aeo_bestand.mjs (2026-09-04): beratung.html, produkte.html, vorlagen-set.html
   und ki-schnellstart.html sind die Seiten, die verkaufen — und die einzigen im Geldbereich
   ohne einen einzigen Frage-Antwort-Block (faq 0/14). Für Käufer sind das offene Einwände
   („Muss ich mich binden?", „Kann ich vorher reinschauen?"); für Antwort-Maschinen ist ein
   FAQ eines der stärksten Signale. Beides in einem.

   REGEL: Keine Antwort behauptet etwas, das nicht auf der Seite, in den AGB oder im
   Impressum steht. Keine Liefer- oder Garantie-Versprechen darüber hinaus.

   ki-schnellstart.html wird ERZEUGT (generate_schnellstart.py) — dort wird die Vorlage
   geändert, nicht die Seite, sonst ist es beim nächsten Lauf weg.
"""
import html as _h
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKE = "data-aban-faq"

FAQ = {
    "beratung.html": [
        ("Was kostet die Zusammenarbeit?",
         "Drei Formate, alle als Richtpreise: der Strategie-Call (60 Minuten) CHF 290, der KI-Setup-Sprint "
         "(halber Tag, remote) CHF 990, das Monats-Sparring CHF 490 pro Monat. Je nach Umfang anpassbar. "
         "Mehrwertsteuer kommt keine dazu — aban news ist nicht MWST-pflichtig."),
        ("Wie fange ich an?",
         "Mit einer kurzen Mail: wo du stehst und was du erreichen willst. Die Antwort kommt meist innerhalb "
         "eines Werktags, mit einer ehrlichen Einschätzung, ob und wie ich helfen kann."),
        ("Muss ich mich langfristig binden?",
         "Nein. Strategie-Call und Setup-Sprint sind einmalig. Nur das Monats-Sparring läuft monatlich, mit "
         "zwei Calls à 45 Minuten und Fragen zwischendurch."),
        ("Findet das vor Ort statt?",
         "Nein, alles läuft remote — Calls per Video, der Setup-Sprint als halber Tag am Bildschirm, "
         "an deinem eigenen Setup."),
        ("Kann ich online buchen und bezahlen?",
         "Noch nicht. Bis dahin läuft alles per Mail: kurz anfragen, Termin abstimmen, Rechnung nach "
         "der Leistung."),
        ("Was habe ich nach dem Strategie-Call in der Hand?",
         "Eine priorisierte Drei-Schritte-Liste für deinen konkreten Stack: was du zuerst angehst, was "
         "später kommt und was du getrost ignorieren kannst."),
        ("Für wen ist das nichts?",
         "Für alle, die ein Hochglanz-Deck, ein Zehnfach-Versprechen oder eine Komplett-Auslagerung "
         "erwarten. Ich baue mit dir, nicht für dich im Verborgenen — und sage es, wenn ein Tool für "
         "deinen Fall wenig bringt."),
    ],
    "produkte.html": [
        ("Gibt es etwas Kostenloses zum Reinschnuppern?",
         "Ja, das DACH-KI-Starter-Kit: sieben kopierfertige Prompts plus ein kurzer Datenresidenz-Check "
         "für DSGVO-konforme Tool-Auswahl. Ohne Login, ohne E-Mail-Gate."),
        ("Was kosten die Produkte?",
         "Der Notfall-Ordner 19 €, das E-Book „KI-Geld 2026“ CHF 19, das Toolkit Pro CHF 19, der "
         "Automatisierungs-Guide CHF 39 und das Bundle aus Toolkit Pro und Guide CHF 49. Alles "
         "Richtpreise, bewusst rund gehalten."),
        ("In welchem Format bekomme ich sie?",
         "Als PDF — der Notfall-Ordner als ausfüllbares PDF, das Toolkit Pro zusätzlich als "
         "Notion-Vorlage. Alle Produkte sind einmalige Käufe, kein Abo."),
        ("Kann ich ein Produkt zurückgeben?",
         "Beim E-Book „KI-Geld 2026“ gilt 30 Tage Geld-zurück. Für alle digitalen Produkte gilt das "
         "Widerrufsrecht, wie in den AGB beschrieben: es erlischt, sobald der Download mit deiner "
         "Zustimmung begonnen hat."),
        ("Für wen sind die Produkte gemacht?",
         "Für Solo-Selbstständige und kleine Teams im deutschsprachigen Raum, die eine konkrete Aufgabe "
         "schneller erledigen wollen — keine Theorie, keine Tool-Listen, die in zwei Wochen veraltet sind."),
    ],
    "vorlagen-set.html": [
        ("Was ist im Vorlagen-Set drin?",
         "26 Vorlagen in sechs Bereichen: Kundenkommunikation, Akquise, Social Media, Termine und "
         "Organisation, Geld und Rechnung sowie Checklisten — jeweils auf Deutsch und Englisch."),
        ("Was kostet das Set?",
         "19 € einmalig, als PDF. Einmal zahlen, immer wieder nutzen."),
        ("Kann ich vorher reinschauen?",
         "Ja. Es gibt einen kostenlosen Auszug auf Deutsch und ein Sample auf Englisch, beide als PDF."),
        ("Wie bezahle ich, und bekomme ich eine Rechnung?",
         "Die Zahlung läuft über Lemon Squeezy mit Karte oder PayPal. Die Mehrwertsteuer wird automatisch "
         "berechnet, eine Rechnung ist inklusive."),
        ("Wie benutze ich eine Vorlage?",
         "Die Platzhalter in eckigen Klammern ausfüllen, Ton prüfen, abschicken. Viele Vorlagen haben "
         "einen kurzen Profi-Hinweis dazu, warum sie so funktionieren."),
        ("Gibt es die Vorlagen auch auf Englisch?",
         "Ja, jede Vorlage liegt auf Deutsch und auf Englisch vor — für Kundinnen und Kunden in beiden Sprachen."),
    ],
    # ki-schnellstart: __PREIS__ ist der Platzhalter der Vorlage und wird vom Generator ersetzt.
    "ki-schnellstart.html": [
        ("Für wen ist der KI-Schnellstart gedacht?",
         "Für Selbstständige und kleine Teams, die KI im Betrieb einführen wollen, aber weder Zeit für "
         "Experimente noch Lust auf Datenschutz-Risiken haben."),
        ("Was ist drin?",
         "Ein 30-Tage-Plan in vier Wochenblöcken, Datenschutz-Leitplanken als Checkliste, eine "
         "Tool-Auswahl-Hilfe und ein kurzes Team-Onboarding mit Richtlinie und ersten Prompts. "
         "Workbook und Checklisten kommen als bearbeitbare Dateien."),
        ("Was kostet es?",
         "__PREIS__ einmalig, sofort als Download. Die Abwicklung läuft über Lemon Squeezy oder Stripe, "
         "eine Rechnung ist inklusive."),
        ("Wie lange dauert die Einführung?",
         "30 Tage: Woche eins Orientierung und Datenschutz, dann erste Anwendungsfälle, dann Tools und "
         "Richtlinie, zuletzt verankern und messen."),
        ("Ersetzt das eine Datenschutz- oder Rechtsberatung?",
         "Nein. Das Workbook gibt Leitplanken und Checklisten; Datenschutzfragen vor dem Einsatz "
         "fachkundig prüfen zu lassen, bleibt deine Aufgabe."),
        ("Was, wenn wir kaum Zeit haben?",
         "Dann erst recht nur ein bis zwei echte Abläufe verbessern. Der Plan ist darauf gebaut: lieber "
         "zwei Dinge richtig als zehn halb — er verspricht kein Wunder, sondern macht das Machbare machbar."),
    ],
}


def block(fragen):
    teile = [f'<section id="faq" {MARKE} class="faq"><div class="wrap"><h2>Häufige Fragen</h2>']
    for q, a in fragen:
        teile.append(f"<h3>{_h.escape(q)}</h3><p>{_h.escape(a)}</p>")
    teile.append("</div></section>")
    return "\n".join(teile)


def ld(fragen):
    return ('<script type="application/ld+json" ' + MARKE + '>' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in fragen]},
        ensure_ascii=False, separators=(",", ":")) + "</script>")


CSS = ("<style " + MARKE + ">.faq h3{font-size:1.05rem;margin:18px 0 4px}"
       ".faq p{margin:0 0 6px}.faq h2{margin-bottom:6px}</style>")


def einsetzen(text, fragen, vor):
    """Block vor dem Anker `vor` (Regex) einsetzen, JSON-LD + Stil vor </head>."""
    if MARKE in text:
        return text, False
    m = re.search(vor, text)
    if not m:
        return text, None
    text = text[:m.start()] + block(fragen) + "\n" + text[m.start():]
    text = text.replace("</head>", ld(fragen) + "\n" + CSS + "\n</head>", 1)
    return text, True


ANKER = {
    "beratung.html": r'<section id="anfragen">',
    "produkte.html": r'</main>',
    "vorlagen-set.html": r'</main>',
}


def main():
    for datei, anker in ANKER.items():
        p = os.path.join(ROOT, datei)
        t = open(p, encoding="utf-8").read()
        neu, ok = einsetzen(t, FAQ[datei], anker)
        if ok is None:
            sys.exit(f"✗ Anker nicht gefunden in {datei}: {anker}")
        if ok:
            open(p, "w", encoding="utf-8").write(neu)
        print(("✓ eingesetzt" if ok else "· schon da  ") + f"  {datei} ({len(FAQ[datei])} Fragen)")

    # Generator-Vorlage für ki-schnellstart.html
    gp = os.path.join(ROOT, "generate_schnellstart.py")
    g = open(gp, encoding="utf-8").read()
    if MARKE not in g:
        anker = "  <p class=\"more\">Schon weiter?"
        if anker not in g:
            anker_re = re.search(r"\n\s*<p[^>]*>Schon weiter\?", g)
            if not anker_re:
                sys.exit("✗ Anker 'Schon weiter?' in generate_schnellstart.py nicht gefunden")
            anker = g[anker_re.start() + 1:anker_re.end()]
        blk = block(FAQ["ki-schnellstart.html"]).replace("{", "{{").replace("}", "}}") \
            if "f\"\"\"" in g else block(FAQ["ki-schnellstart.html"])
        kopf = (ld(FAQ["ki-schnellstart.html"]) + "\n" + CSS).replace("{", "{{").replace("}", "}}") \
            if "f\"\"\"" in g else ld(FAQ["ki-schnellstart.html"]) + "\n" + CSS
        g = g.replace(anker, blk + "\n" + anker, 1)
        g = g.replace("</head>", kopf + "\n</head>", 1)
        open(gp, "w", encoding="utf-8").write(g)
        print("✓ eingesetzt  generate_schnellstart.py (Vorlage)")
    else:
        print("· schon da    generate_schnellstart.py")
    r = subprocess.run([sys.executable, gp], capture_output=True, text=True, cwd=ROOT)
    print(("✓ " if r.returncode == 0 else "✗ ") + "generate_schnellstart.py: " + (r.stdout + r.stderr).strip()[-160:])


if __name__ == "__main__":
    main()
