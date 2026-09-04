#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Brotkrumen und Rücklinks als NAVIGATION auszeichnen — nicht als Fliesstext.

    python3 tools/nav_landmarken.py --probe     # nur zählen, nichts ändern
    python3 tools/nav_landmarken.py             # anwenden (idempotent)

⚠️ WOZU. Gemessen am 2026-09-03: 150 Seiten beginnen ihren <main> mit einem Rücklink
   („← Alle Gratis-Tools") als <p>, sieben weitere mit einer Brotkrume
   („Startseite › Beratung") als <p>. Beides ist Navigation, steht aber als normaler
   Absatz im Inhalt. Zwei Folgen, beide echt:

   1. BARRIEREFREIHEIT: Screenreader kündigen <nav> als Navigations-Landmarke an und
      können sie überspringen. Als <p> ist der Rücklink Fliesstext — man hört ihn auf
      jeder Seite mitten im Inhalt.
   2. AUFFINDBARKEIT: Antwort-Maschinen (und die eigene Engine, functions/_aeo-engine.mjs)
      lesen den Inhaltsbereich. Der erste „Satz" von beratung.html war die Brotkrume,
      nicht die Kernaussage — die Seite bekam 3 von 18 Punkten bei „Antwort zuerst",
      obwohl ihr zweiter Absatz genau die gewünschte direkte Aussage ist.

   Der Eingriff ist bewusst minimal: der vorhandene <p> bleibt samt Stil erhalten und
   wird nur von einem <nav aria-label="…"> umschlossen. Kein Layout ändert sich.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKE = "data-aban-navland"

# 1) Rücklink zum Hub, direkt nach <main>: <p data-aban-hublink …>← <a …>Alle Gratis-Tools</a></p>
HUB = re.compile(r'(?is)(<main\b[^>]*>\s*)(<p\b[^>]*data-aban-hublink[^>]*>.*?</p>)')
# 2) Brotkrume: <p …><a href="/">Startseite</a> › <span>Beratung</span></p>
KRUME = re.compile(
    r'(?is)(<p\b[^>]*>\s*<a\b[^>]*href="/"[^>]*>[^<]{0,30}</a>\s*(?:&rsaquo;|›)\s*'
    r'(?:<a\b[^>]*>[^<]{0,40}</a>\s*(?:&rsaquo;|›)\s*)*<span>[^<]{0,60}</span>\s*</p>)')


def umschliessen(text, muster, label, mit_gruppen):
    """Setzt <nav> um den Treffer.

    ⚠️ Idempotenz kostete einen Anlauf: der Brotkrumen-Ausdruck trifft den <p> auch dann
    noch, wenn er bereits in einem <nav> steckt — ein zweiter Lauf hätte <nav><nav>
    verschachtelt. Python kennt keinen Rückblick variabler Länge, darum wird der Text
    unmittelbar VOR dem Treffer geprüft."""
    def ersatz(m):
        davor = text[max(0, m.start() - 80):m.start()]
        if MARKE in davor and davor.rstrip().endswith(">"):
            return m.group(0)
        vor = m.group(1) if mit_gruppen else ""
        block = m.group(2) if mit_gruppen else m.group(1)
        return f'{vor}<nav {MARKE} aria-label="{label}">{block}</nav>'
    neu, n = muster.subn(ersatz, text)
    return neu, neu.count(f'aria-label="{label}"') - text.count(f'aria-label="{label}"')


# 3) Ergänzende Bereiche (<aside>) ohne Namen. html-validate meldet dafür „unique-landmark":
#    mehrere Landmarken derselben Art brauchen unterscheidbare Namen, sonst hört jemand mit
#    Screenreader dreimal „Ergänzung" und weiss nicht, was ihn erwartet. Die drei Bausteine
#    sind maschinell gesetzt und tragen bereits eine Marke — daran hängt der Name.
ASIDES = {
    "data-aban-aff": "Anzeige",
    "data-aban-news-cta": "Newsletter-Hinweis",
    "data-aban-premium": "Premium-Hinweis",
}


def asides_benennen(text):
    n = 0
    for marke, label in ASIDES.items():
        muster = re.compile(r'(?is)<aside\s+' + re.escape(marke) + r'(?![^>]*aria-label)')
        text, k = muster.subn(f'<aside {marke} aria-label="{label}"', text)
        n += k
    return text, n


def main():
    nur_probe = "--probe" in sys.argv
    hub_n = krume_n = aside_n = seiten = 0
    for pfad in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        h = open(pfad, encoding="utf-8", errors="ignore").read()
        neu = h
        # Schon ausgezeichnete Stellen nicht doppelt einpacken: die Marke sitzt am <nav>,
        # und HUB/KRUME greifen nur auf nackte <p>-Blöcke — ein bereits umschlossener
        # Block steht hinter <nav …>, der HUB-Ausdruck verlangt aber <main> direkt davor.
        neu, a = umschliessen(neu, HUB, "Übergeordnete Seite", True)
        neu, b = umschliessen(neu, KRUME, "Brotkrume", False)
        neu, c = asides_benennen(neu)
        if a or b or c:
            hub_n += a
            krume_n += b
            aside_n += c
            seiten += 1
            if not nur_probe:
                open(pfad, "w", encoding="utf-8").write(neu)
    was = "gefunden" if nur_probe else "ausgezeichnet"
    print(f"{'🔍' if nur_probe else '✓'} {hub_n} Rücklinks, {krume_n} Brotkrumen und "
          f"{aside_n} Ergänzungs-Bereiche {was} auf {seiten} Seiten.")


if __name__ == "__main__":
    main()
