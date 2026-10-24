#!/usr/bin/env python3
# =============================================================================
#  kanonische_urls.py — macht aus jeder selbst gemeldeten Adresse die Adresse,
#  die auch mit 200 antwortet.
# -----------------------------------------------------------------------------
#  ⚠️ WARUM ES DAS GIBT (gemessen 2026-10-24 an der echten Seite):
#  Cloudflare Pages beantwortet JEDE Adresse mit `.html` am Ende mit einer
#  Umleitung (308) auf die Adresse OHNE `.html`. Gemessen an allen 2667
#  Sitemap-Einträgen: 2662 antworteten mit 308, nur 5 mit 200.
#  Gleichzeitig trug jede Seite in `rel="canonical"` genau die `.html`-Adresse
#  ein (2687 Dateien) und die Sitemap ebenso. Die Seite sagte Google also
#  zweimal eine Adresse, die es so nicht gibt. Googles Regel dazu ist klar:
#  eine kanonische Adresse muss mit 200 antworten, sonst gilt die Angabe nicht.
#
#  Darum wird hier NICHT die Quelle umgeschrieben (2687 Dateien, 51 Generatoren,
#  die alle wieder `.html` schreiben würden), sondern nur das Bau-Ergebnis in
#  `_site`. Das deckt auch jede Seite ab, die ein Generator morgen neu anlegt.
#
#  Angefasst werden AUSSCHLIESSLICH `rel="canonical"`, `og:url` und die `<loc>`
#  der Sitemap. Gewöhnliche Links bleiben unberührt — sie funktionieren über die
#  Umleitung, und je weniger angefasst wird, desto kleiner der Schaden, falls
#  diese Annahme je kippt.
#
#  Aufruf:  python3 tools/kanonische_urls.py _site
# =============================================================================

import os, re, sys

BASIS = "https://abannews.com"


def regeln_lesen(datei):
    """Die festen Umleitungen aus `_redirects` lesen (ohne Platzhalter-Regeln).

    ⚠️ Nötig, weil 8 der 2667 Adressen NICHT auf sich selbst ohne `.html`
    zeigen: `/about` wird z. B. auf `/ueber-aban.html` umgeleitet. Ein blosses
    Abschneiden von `.html` würde dort eine Adresse eintragen, die wieder
    umleitet — genau der Fehler, den dieses Werkzeug behebt."""
    regeln = {}
    try:
        text = open(datei, encoding="utf-8", errors="ignore").read()
    except Exception:
        return regeln
    for zeile in text.splitlines():
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#"):
            continue
        teile = zeile.split()
        if len(teile) < 2:
            continue
        von, nach = teile[0], teile[1]
        # Platzhalter und Ziele auf fremde Domains sind hier nicht auflösbar.
        if "*" in von or "*" in nach or ":" in nach or not von.startswith("/"):
            continue
        regeln[von] = nach
    return regeln


def _kuerzen(pfad):
    if pfad.endswith("/index.html"):
        return pfad[: -len("index.html")]
    if pfad.endswith(".html"):
        return pfad[: -len(".html")]
    return pfad


def kanonisch(url, regeln=None):
    """Aus einer eigenen Adresse die Adresse machen, die mit 200 antwortet.

    Fremde Domains bleiben unberührt — wir haben nur für die eigene gemessen,
    wie der Server antwortet."""
    if not url.startswith(BASIS + "/") and url != BASIS:
        return url
    pfad = url[len(BASIS):] or "/"
    regeln = regeln or {}
    # Höchstens ein paar Schritte, dann ist es ein Kreis (gemessen an `/press`:
    # `/press` → `/press.html` → `/press` …). Bei einem Kreis bleibt die
    # ursprüngliche Angabe stehen — raten wäre schlimmer als nichts tun.
    gesehen = set()
    for _ in range(6):
        if pfad in gesehen:
            return url
        gesehen.add(pfad)
        kurz = _kuerzen(pfad)
        ziel = regeln.get(kurz)
        if ziel is not None:
            # Ein Kreis: die Regel zeigt genau auf die Adresse zurück, die der
            # Server gleich wieder kürzt (gemessen an `/press` → `/press.html`
            # → `/press` …). Dann ist KEINE der beiden Adressen eine 200-Adresse;
            # die Angabe bleibt stehen, statt dass hier geraten wird.
            if _kuerzen(ziel) == kurz:
                return url
            pfad = ziel
            continue
        return BASIS + kurz
    return url


# Nur diese drei Stellen melden die eigene Adresse an Google.
MUSTER = [
    # <link rel="canonical" href="…">  (beide Reihenfolgen kommen vor)
    (re.compile(r'(<link\b[^>]*\brel=["\']canonical["\'][^>]*\bhref=["\'])([^"\']+)', re.I), 2),
    (re.compile(r'(<link\b[^>]*\bhref=["\'])([^"\']+)(["\'][^>]*\brel=["\']canonical["\'])', re.I), 2),
    # <meta property="og:url" content="…">
    (re.compile(r'(<meta\b[^>]*\b(?:property|name)=["\']og:url["\'][^>]*\bcontent=["\'])([^"\']+)', re.I), 2),
    (re.compile(r'(<meta\b[^>]*\bcontent=["\'])([^"\']+)(["\'][^>]*\b(?:property|name)=["\']og:url["\'])', re.I), 2),
    # <link rel="alternate" hreflang="de" href="…">
    # ⚠️ Muss mit: nach dem Begradigen sagt die Seite „ich bin /en/about", die
    # hreflang-Angabe aber „/en/about.html". Google verlangt in hreflang die
    # kanonische Adresse und verwirft das Paar, wenn beides auseinanderläuft —
    # die Angabe wäre dann schlechter als vorher. Gemessen: 1701 Dateien.
    # `hreflang` muss im Treffer vorkommen, damit RSS-Alternativen
    # (`rel="alternate" type="application/rss+xml"`) nicht erfasst werden.
    (re.compile(r'(<link\b[^>]*\bhreflang=["\'][^"\']*["\'][^>]*\bhref=["\'])([^"\']+)', re.I), 2),
    (re.compile(r'(<link\b[^>]*\bhref=["\'])([^"\']+)(["\'][^>]*\bhreflang=["\'])', re.I), 2),
]


def seite(html, regeln=None):
    """Gibt (neues_html, anzahl_geaenderter_stellen) zurück."""
    geaendert = 0

    def ersetze(m):
        nonlocal geaendert
        teile = list(m.groups())
        alt = teile[1]
        neu = kanonisch(alt, regeln)
        if neu != alt:
            geaendert += 1
        teile[1] = neu
        return "".join(t for t in teile if t is not None)

    for muster, _ in MUSTER:
        html = muster.sub(ersetze, html)
    return html, geaendert


def sitemap(xml, regeln=None):
    """<loc> auf die 200-Adresse ziehen und danach entstandene Dubletten entfernen.

    Dubletten entstehen echt: `/about.html` und `/ueber-aban.html` zeigen auf
    dasselbe Ziel, sobald beide kanonisiert sind."""
    geaendert = [0]

    def ersetze(m):
        alt = m.group(1)
        neu = kanonisch(alt, regeln)
        if neu != alt:
            geaendert[0] += 1
        return "<loc>" + neu + "</loc>"

    xml = re.sub(r"<loc>(.*?)</loc>", ersetze, xml)

    gesehen, weg = set(), [0]

    def einer(m):
        block = m.group(0)
        loc = re.search(r"<loc>(.*?)</loc>", block)
        if not loc:
            return block
        if loc.group(1) in gesehen:
            weg[0] += 1
            return ""
        gesehen.add(loc.group(1))
        return block

    xml = re.sub(r"[ \t]*<url>.*?</url>\n?", einer, xml, flags=re.S)
    return xml, geaendert[0], weg[0]


def main():
    ziel = sys.argv[1] if len(sys.argv) > 1 else "_site"
    if not os.path.isdir(ziel):
        print(f"kanonische_urls: {ziel} gibt es nicht — übersprungen")
        return 0

    regeln = regeln_lesen(os.path.join(ziel, "_redirects"))
    dateien = stellen = 0
    for wurzel, _, namen in os.walk(ziel):
        for name in namen:
            if not name.endswith(".html"):
                continue
            pfad = os.path.join(wurzel, name)
            try:
                alt = open(pfad, encoding="utf-8", errors="ignore").read()
            except Exception:
                continue
            neu, n = seite(alt, regeln)
            if n:
                open(pfad, "w", encoding="utf-8").write(neu)
                dateien += 1
                stellen += n

    sm = os.path.join(ziel, "sitemap.xml")
    smtext = ""
    if os.path.isfile(sm):
        alt = open(sm, encoding="utf-8", errors="ignore").read()
        neu, n, weg = sitemap(alt, regeln)
        if n or weg:
            open(sm, "w", encoding="utf-8").write(neu)
        smtext = f" · Sitemap: {n} Adressen begradigt, {weg} Dubletten entfernt"

    print(f"kanonische Adressen: {stellen} Stellen in {dateien} Seiten begradigt{smtext}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
