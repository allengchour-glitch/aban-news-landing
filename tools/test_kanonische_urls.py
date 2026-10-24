#!/usr/bin/env python3
# Tests zu kanonische_urls.py. Wichtig sind die Gegenproben in die ANDERE
# Richtung: ein Werkzeug, das zu viel anfasst, sieht wie ein Erfolg aus.
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kanonische_urls as K

fehler = []


def pruef(name, ist, soll):
    if ist != soll:
        fehler.append(f"{name}\n   ist : {ist!r}\n   soll: {soll!r}")


# --- kanonisch(): das Begradigen selbst -------------------------------------
pruef("html weg", K.kanonisch("https://abannews.com/shop.html"), "https://abannews.com/shop")
pruef("index weg", K.kanonisch("https://abannews.com/minispiele/index.html"),
      "https://abannews.com/minispiele/")
pruef("tiefer Pfad", K.kanonisch("https://abannews.com/en/about.html"), "https://abannews.com/en/about")
pruef("Startseite bleibt", K.kanonisch("https://abannews.com/"), "https://abannews.com/")

# Gegenproben: was NICHT angefasst werden darf.
pruef("schon ohne .html bleibt", K.kanonisch("https://abannews.com/shop"), "https://abannews.com/shop")
pruef("fremde Domain bleibt", K.kanonisch("https://example.com/shop.html"),
      "https://example.com/shop.html")
pruef("Shop-Domain bleibt", K.kanonisch("https://luxestyle.ch/products/x.html"),
      "https://luxestyle.ch/products/x.html")
pruef("Ordner bleibt", K.kanonisch("https://abannews.com/vergleich/"), "https://abannews.com/vergleich/")
pruef("kein html-Ende", K.kanonisch("https://abannews.com/feed.xml"), "https://abannews.com/feed.xml")
# Eine Datei, die nur „html" im Namen trägt, ist keine .html-Adresse.
pruef("html im Namen", K.kanonisch("https://abannews.com/htmlkurs"), "https://abannews.com/htmlkurs")

# --- seite(): nur canonical und og:url ------------------------------------
html = (
    '<link rel="canonical" href="https://abannews.com/shop.html">'
    '<meta property="og:url" content="https://abannews.com/shop.html">'
    '<a href="https://abannews.com/shop.html">Shop</a>'
    '<link rel="alternate" href="https://abannews.com/en/shop.html">'
)
neu, n = K.seite(html)
pruef("zwei Stellen geaendert", n, 2)
pruef("canonical begradigt", 'rel="canonical" href="https://abannews.com/shop"' in neu, True)
pruef("og:url begradigt", 'content="https://abannews.com/shop"' in neu, True)
# Gegenproben: Links und alternate bleiben, wie sie sind.
pruef("normaler Link bleibt", '<a href="https://abannews.com/shop.html">' in neu, True)
pruef("alternate bleibt", 'rel="alternate" href="https://abannews.com/en/shop.html"' in neu, True)

# Umgekehrte Attribut-Reihenfolge kommt in den Dateien vor.
neu2, n2 = K.seite('<link href="https://abannews.com/a.html" rel="canonical">')
pruef("href vor rel", n2, 1)
pruef("href vor rel Inhalt", 'href="https://abannews.com/a"' in neu2, True)

# Einfache Anfuehrungszeichen.
neu3, n3 = K.seite("<link rel='canonical' href='https://abannews.com/b.html'>")
pruef("einfache Anfuehrungszeichen", n3, 1)

# Gegenprobe: eine Seite ohne etwas zu tun darf NICHTS melden.
neu4, n4 = K.seite('<link rel="canonical" href="https://abannews.com/schon-gut">')
pruef("nichts zu tun", n4, 0)
pruef("nichts zu tun unveraendert", neu4, '<link rel="canonical" href="https://abannews.com/schon-gut">')

# --- sitemap(): Adressen + Dubletten ---------------------------------------
xml = (
    '<urlset>\n'
    '  <url><loc>https://abannews.com/shop.html</loc></url>\n'
    '  <url><loc>https://abannews.com/shop</loc></url>\n'
    '  <url><loc>https://abannews.com/minispiele/index.html</loc></url>\n'
    '</urlset>\n'
)
neu, n, weg = K.sitemap(xml)
pruef("sitemap begradigt", n, 2)
pruef("sitemap Dublette weg", weg, 1)
pruef("sitemap Ergebnis", neu.count("<loc>"), 2)
pruef("sitemap Ordner-Index", "<loc>https://abannews.com/minispiele/</loc>" in neu, True)

# Gegenprobe: eine schon saubere Sitemap wird nicht angefasst.
sauber = '<urlset>\n  <url><loc>https://abannews.com/shop</loc></url>\n</urlset>\n'
neu5, n5, weg5 = K.sitemap(sauber)
pruef("saubere Sitemap bleibt", (n5, weg5, neu5), (0, 0, sauber))

if fehler:
    print(f"❌ {len(fehler)} Test(s) fehlgeschlagen:")
    for f in fehler:
        print("  " + f)
    sys.exit(1)
print("✅ alle Tests grün (kanonische_urls)")

# --- Umleitungen aus _redirects folgen -------------------------------------
# Gemessen: 8 von 2667 Adressen zeigen nicht auf sich selbst ohne `.html`.
R = {"/about": "/ueber-aban.html", "/press": "/press.html",
     "/zinseszins-rechner": "/sparplan-statt-trading.html"}

fehler2 = []
def p2(name, ist, soll):
    if ist != soll:
        fehler2.append(f"{name}\n   ist : {ist!r}\n   soll: {soll!r}")

p2("Umleitung gefolgt", K.kanonisch("https://abannews.com/about.html", R),
   "https://abannews.com/ueber-aban")
p2("Umleitung mit anderem Namen", K.kanonisch("https://abannews.com/zinseszins-rechner.html", R),
   "https://abannews.com/sparplan-statt-trading")
# Gegenprobe Kreis: /press -> /press.html -> /press … → Angabe bleibt stehen,
# statt zu raten. Ohne diese Schranke läuft das Werkzeug ewig.
p2("Kreis bleibt unangetastet", K.kanonisch("https://abannews.com/press.html", R),
   "https://abannews.com/press.html")
# Gegenprobe: ohne Regeln bleibt es beim blossen Abschneiden.
p2("ohne Regeln", K.kanonisch("https://abannews.com/about.html", {}),
   "https://abannews.com/about")
# Gegenprobe: eine Adresse ohne Regel ist unberührt vom Regelwerk.
p2("Adresse ohne Regel", K.kanonisch("https://abannews.com/shop.html", R),
   "https://abannews.com/shop")

# regeln_lesen(): Platzhalter und fremde Ziele dürfen NICHT übernommen werden.
import tempfile
with tempfile.NamedTemporaryFile("w", suffix="_redirects", delete=False, encoding="utf-8") as fh:
    fh.write("# Kommentar\n/a  /b.html  301\n/alt/*  /neu/:splat  301\n/x  https://fremd.example/y  301\n\n")
    name = fh.name
gelesen = K.regeln_lesen(name)
p2("Regel gelesen", gelesen.get("/a"), "/b.html")
p2("Platzhalter ignoriert", "/alt/*" in gelesen, False)
p2("fremdes Ziel ignoriert", "/x" in gelesen, False)
p2("nur die eine Regel", len(gelesen), 1)
p2("fehlende Datei = keine Regeln", K.regeln_lesen("/gibt/es/nicht"), {})

if fehler2:
    print(f"❌ {len(fehler2)} Test(s) fehlgeschlagen (Umleitungen):")
    for f in fehler2:
        print("  " + f)
    sys.exit(1)
print("✅ alle Tests grün (Umleitungen)")
