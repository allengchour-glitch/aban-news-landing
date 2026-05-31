#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Buch-Bauen - kompiliert die geschriebenen Kapitel zu lieferbaren Buchdateien.

Reiner Stdlib-Compiler (KEINE anthropic-/pip-Abhaengigkeit): liest die
Plot-Bibel und alle vorhandenen Kapitel-Dateien in Reihenfolge und erzeugt
Markdown- und EPUB3-Artefakte im Ausgabe-Verzeichnis.

Einzelbuch (flaches "kapitel"):
  ausgabe/<titel-slug>.md  + ausgabe/<titel-slug>.epub      (wie bisher)

Trilogie ("baende"):
  pro Band  ausgabe/<titel-slug>-band-0N.md / .epub
  Gesamt    ausgabe/<titel-slug>-gesamt.md / .epub  (Omnibus, Band-Trennseiten)

Der EPUB-Aufbau folgt bewusst exakt dem Muster aus generate_ebook.py
(mimetype zuerst und unkomprimiert, container.xml, content.opf, nav.xhtml, je
eine XHTML-Datei pro Kapitel plus Titelseite), ist hier aber lokal
implementiert, weil generate_ebook.py von reportlab abhaengt.

Verwendung:
  python3 buch_bauen.py
  python3 buch_bauen.py --roman roman-drama-trilogie.json --kapitel-dir kapitel/ --out ausgabe/
"""
import argparse
import os
import re
import sys
import zipfile

from roman_util import lade_roman, slugify, baende_aus_roman, ist_trilogie, kapitel_pfad

HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Kapitel einer Band lesen
# ------------------------------------------------------------------
def lies_kapitel(kapitel_dir, band, einzelbuch):
    """Liest die vorhandenen Kapiteldateien einer Band in Planreihenfolge.

    Gibt eine Liste von dicts zurueck: {nummer, plan_titel, text}.
    """
    kapitel = []
    for k in band["kapitel"]:
        nummer = k["nummer"]
        pfad = kapitel_pfad(kapitel_dir, band["nummer"], nummer, einzelbuch)
        if not os.path.exists(pfad):
            continue
        with open(pfad, "r", encoding="utf-8") as f:
            text = f.read().strip()
        if not text:
            continue
        kapitel.append({
            "nummer": nummer,
            "plan_titel": k.get("titel", ""),
            "text": text,
        })
    return kapitel


def teile_kapitel(text):
    """Trennt die erste Zeile (Kapitelueberschrift) vom restlichen Prosatext.

    Konvention (siehe schreibe_roman.py): die erste Zeile lautet etwa
    "Kapitel 1 - Titel". Sie wird als Ueberschrift verwendet; der Rest ist der
    Fliesstext, der an Leerzeilen in Absaetze zerlegt wird.
    """
    zeilen = text.split("\n", 1)
    ueberschrift = zeilen[0].strip().lstrip("#").strip()
    rest = zeilen[1].strip() if len(zeilen) > 1 else ""
    absaetze = [a.strip() for a in re.split(r"\n\s*\n", rest) if a.strip()]
    return ueberschrift, absaetze


def _ueberschrift_fuer(kap):
    """Kapitelueberschrift aus dem Text oder, als Fallback, aus dem Plan."""
    ueberschrift, _ = teile_kapitel(kap["text"])
    if not ueberschrift:
        ueberschrift = "Kapitel %d - %s" % (kap["nummer"], kap["plan_titel"])
    return ueberschrift


# ------------------------------------------------------------------
# Markdown-Manuskript (gruppiert: optional mit Band-Trennseiten)
# ------------------------------------------------------------------
def baue_markdown(gesamttitel, genre, gruppen, autor="aban news"):
    """Setzt das kombinierte Markdown-Manuskript zusammen.

    gruppen ist eine Liste von {"bandtitel": str|None, "kapitel": [...]}.
    Ohne bandtitel (Einzelbuch / Einzelband) entsteht das schlichte Layout:
    Titelseite, Inhaltsverzeichnis, Kapitel. Mit bandtitel wird je Gruppe eine
    Band-Trennueberschrift gesetzt.
    """
    z = []
    z.append("# %s" % gesamttitel)
    z.append("")
    z.append("*%s*" % (genre or ""))
    z.append("")
    z.append("von %s" % autor)
    z.append("")
    z.append("---")
    z.append("")
    z.append("## Inhaltsverzeichnis")
    z.append("")
    for g in gruppen:
        if g["bandtitel"]:
            z.append("")
            z.append("**%s**" % g["bandtitel"])
        for kap in g["kapitel"]:
            z.append("%d. %s" % (kap["nummer"], _ueberschrift_fuer(kap)))
    z.append("")
    z.append("---")
    z.append("")
    for g in gruppen:
        if g["bandtitel"]:
            z.append("# %s" % g["bandtitel"])
            z.append("")
        for kap in g["kapitel"]:
            _, absaetze = teile_kapitel(kap["text"])
            z.append("## %s" % _ueberschrift_fuer(kap))
            z.append("")
            for absatz in absaetze:
                z.append(absatz)
                z.append("")
            z.append("---")
            z.append("")
    return "\n".join(z).rstrip() + "\n"


# ------------------------------------------------------------------
# EPUB3 (reines zipfile, Muster aus generate_ebook.py)
# ------------------------------------------------------------------
def _esc(s):
    """Nur & escapen - der Kapiteltext ist reine Prosa ohne Inline-HTML."""
    return s.replace("&", "&amp;")


def absaetze_zu_xhtml(absaetze):
    """Prosa-Absaetze als <p>. Der erste bekommt class="first" (Initiale + kein Einzug)."""
    out = []
    for i, a in enumerate(absaetze):
        cls = ' class="first"' if i == 0 else ''
        out.append("<p%s>%s</p>" % (cls, _esc(a)))
    return "\n".join(out)


# Premium-Buch-Typografie: Serifen, eingezogene Absaetze ohne Durchschuss,
# Initiale (Drop Cap) am Kapitelanfang, Vollbild-Cover, Titel- und Kolophonseite.
EPUB_CSS = """body{font-family:Georgia,'Times New Roman',serif;line-height:1.62;margin:5%;color:#1f2937;hyphens:auto}
h1{color:#b45309;font-size:2em;line-height:1.2}
h2{color:#b45309;font-size:1.35em;margin:0 0 1.1em;line-height:1.25;text-align:center;font-variant:small-caps;letter-spacing:.02em}
p{margin:0;text-align:justify;text-indent:1.3em}
p.first{text-indent:0}
p.first::first-letter{font-size:3.1em;line-height:.82;font-weight:bold;color:#b45309;float:left;padding:.02em .09em 0 0}
.orn{text-align:center;color:#b45309;font-size:1.05em;letter-spacing:.55em;margin:.2em 0 .8em;padding-left:.55em}
.coverimg{margin:0;padding:0;text-align:center}
.coverimg img{max-width:100%;height:100%;object-fit:contain}
.titlepage{text-align:center;margin-top:22%}
.titlepage .t{font-size:2.4em;font-weight:bold;color:#d97706;line-height:1.15}
.titlepage .g{font-size:1.15em;color:#1f2937;margin-top:.5em;font-style:italic}
.titlepage .a{margin-top:2.4em;font-size:1.05em;color:#1f2937}
.titlepage .pub{margin-top:.25em;font-size:.85em;color:#6b7280}
.banddivider{text-align:center;margin-top:34%}
.banddivider .bl{font-variant:small-caps;letter-spacing:.18em;color:#b45309;font-size:1em}
.banddivider h1{color:#d97706;font-size:2.1em;margin:.3em 0}
.banddivider .be{font-style:italic;color:#6b7280}
.colophon{margin-top:30%;font-size:.86em;color:#6b7280;text-align:center}
.colophon h2{color:#b45309;font-size:1.05em;font-variant:small-caps}
.colophon p{text-indent:0;text-align:center;margin:.5em 0}"""


def _xhtml_seite(lang, titel, body):
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
        '<head><meta charset="utf-8"/><title>%s</title>'
        '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
        '<body>%s</body></html>' % (lang, _esc(titel), body)
    )


def baue_epub(gesamttitel, genre, gruppen, pfad, autor="aban news", cover_pfad=None):
    """Baut ein valides, hochwertiges EPUB3 mit der Standardbibliothek.

    Premium: Vollbild-Cover (falls cover_pfad gesetzt), separate Titelseite,
    Band-Trennseiten mit Label/Epoche, Initialen am Kapitelanfang, Kolophon.
    Bei mehreren Gruppen mit bandtitel wird das TOC nach Baenden geschachtelt;
    Kapitel-IDs sind dann band-eindeutig (Einzelbuch behaelt ch01).
    """
    lang = "de"
    bookid = "urn:abannews:ki-schriftsteller:%s" % slugify(gesamttitel)
    mehrband = any(g["bandtitel"] for g in gruppen)

    cover_bytes = None
    if cover_pfad and os.path.exists(cover_pfad):
        with open(cover_pfad, "rb") as cf:
            cover_bytes = cf.read()

    files = {}
    # Cover: Bild (Vollbild) wenn vorhanden, sonst textbasiert.
    if cover_bytes is not None:
        files["cover.xhtml"] = _xhtml_seite(
            lang, gesamttitel,
            '<div class="coverimg"><img src="cover.jpg" alt="%s"/></div>' % _esc(gesamttitel))
    else:
        files["cover.xhtml"] = _xhtml_seite(
            lang, gesamttitel,
            '<div class="titlepage"><div class="t">%s</div><div class="g">%s</div>'
            '<div class="a">%s</div></div>' % (_esc(gesamttitel), _esc(genre or ""), _esc(autor)))

    # Eigene Titelseite (Buch-Standard, auch hinter dem Bild-Cover).
    files["titlepage.xhtml"] = _xhtml_seite(
        lang, gesamttitel,
        '<div class="titlepage"><div class="t">%s</div>'
        '<div class="g">%s</div>'
        '<div class="a">%s</div>'
        '<div class="pub">geschrieben mit Claude Opus · aban news</div></div>'
        % (_esc(gesamttitel), _esc(genre or ""), _esc(autor)))

    spine_ids = ["cover", "titlepage"]
    nav_eintraege = []

    for gi, g in enumerate(gruppen, 1):
        kap_nav = []
        if g["bandtitel"]:
            bid = "band%02d" % gi
            spine_ids.append(bid)
            inner = ''
            if g.get("label"):
                inner += '<div class="bl">%s</div>' % _esc(g["label"])
            inner += '<h1>%s</h1>' % _esc(g["bandtitel"])
            if g.get("epoch"):
                inner += '<div class="be">%s</div>' % _esc(g["epoch"])
            files["%s.xhtml" % bid] = _xhtml_seite(
                lang, g["bandtitel"], '<div class="banddivider">%s</div>' % inner)

        for kap in g["kapitel"]:
            ueberschrift = _ueberschrift_fuer(kap)
            _, absaetze = teile_kapitel(kap["text"])
            cid = ("b%02dch%02d" % (gi, kap["nummer"])) if mehrband else ("ch%02d" % kap["nummer"])
            spine_ids.append(cid)
            kap_nav.append('<li><a href="%s.xhtml">%s</a></li>' % (cid, _esc(ueberschrift)))
            files["%s.xhtml" % cid] = _xhtml_seite(
                lang, ueberschrift,
                '<div class="orn">···</div>\n<h2>%s</h2>\n%s'
                % (_esc(ueberschrift), absaetze_zu_xhtml(absaetze)))

        if g["bandtitel"]:
            nav_eintraege.append('<li><a href="band%02d.xhtml">%s</a><ol>%s</ol></li>'
                                 % (gi, _esc(g["bandtitel"]), "".join(kap_nav)))
        else:
            nav_eintraege.extend(kap_nav)

    # Kolophon / Impressum.
    files["colophon.xhtml"] = _xhtml_seite(
        lang, "Kolophon",
        '<div class="colophon"><h2>Über dieses Buch</h2>'
        '<p><em>%s</em></p>'
        '<p>Ein Schreib-Experiment von aban news, Kapitel für Kapitel mit '
        'Claude Opus verfasst und redigiert.</p>'
        '<p>Riedmatt, der Stausee und alle Figuren sind erfunden; '
        'Ähnlichkeiten mit realen Orten oder Personen sind Zufall.</p>'
        '<p>© 2026 aban news · Allen Chour, Belp (CH) · abannews.com</p></div>'
        % _esc(gesamttitel))
    spine_ids.append("colophon")

    nav = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" lang="%s">'
        '<head><meta charset="utf-8"/><title>Inhaltsverzeichnis</title></head><body>'
        '<nav epub:type="toc" id="toc"><h1>Inhaltsverzeichnis</h1><ol>%s</ol></nav>'
        '</body></html>' % (lang, "".join(nav_eintraege))
    )

    manifest = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                '<item id="css" href="style.css" media-type="text/css"/>']
    if cover_bytes is not None:
        manifest.append('<item id="cover-img" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>')
    spine = []
    for sid in spine_ids:
        manifest.append('<item id="%s" href="%s.xhtml" media-type="application/xhtml+xml"/>'
                        % (sid, sid))
        spine.append('<itemref idref="%s"/>' % sid)

    cover_meta = '<meta name="cover" content="cover-img"/>' if cover_bytes is not None else ''
    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="BookID">%s</dc:identifier>'
        '<dc:title>%s</dc:title>'
        '<dc:language>%s</dc:language>'
        '<dc:creator>%s</dc:creator>'
        '<dc:publisher>aban news</dc:publisher>'
        '<dc:subject>%s</dc:subject>'
        '%s'
        '<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>'
        '</metadata><manifest>%s</manifest><spine>%s</spine></package>'
        % (bookid, _esc(gesamttitel), lang, _esc(autor), _esc(genre or ""),
           cover_meta, "".join(manifest), "".join(spine))
    )

    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
                 '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                 '<rootfiles><rootfile full-path="OEBPS/content.opf" '
                 'media-type="application/oebps-package+xml"/></rootfiles></container>')

    with zipfile.ZipFile(pfad, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container)
        z.writestr("OEBPS/content.opf", opf)
        z.writestr("OEBPS/nav.xhtml", nav)
        z.writestr("OEBPS/style.css", EPUB_CSS)
        if cover_bytes is not None:
            z.writestr("OEBPS/cover.jpg", cover_bytes)
        for name, content in files.items():
            z.writestr("OEBPS/%s" % name, content)


# ------------------------------------------------------------------
# Ein Artefakt-Paar (Markdown + EPUB) schreiben
# ------------------------------------------------------------------
def schreibe_artefakte(out_dir, slug, gesamttitel, genre, gruppen,
                       autor="aban news", cover_pfad=None):
    md_pfad = os.path.join(out_dir, "%s.md" % slug)
    with open(md_pfad, "w", encoding="utf-8") as f:
        f.write(baue_markdown(gesamttitel, genre, gruppen, autor))
    print("OK Markdown geschrieben: %s" % md_pfad)

    epub_pfad = os.path.join(out_dir, "%s.epub" % slug)
    baue_epub(gesamttitel, genre, gruppen, epub_pfad, autor, cover_pfad)
    cov = " (+Cover)" if cover_pfad and os.path.exists(cover_pfad) else ""
    print("OK EPUB geschrieben: %s%s" % (epub_pfad, cov))


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Kompiliert geschriebene Kapitel zu Markdown + EPUB3.")
    parser.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                        help="Pfad zur Plot-Bibel (Standard: roman.json)")
    parser.add_argument("--kapitel-dir", default=os.path.join(HIER, "kapitel"),
                        help="Verzeichnis mit den Kapiteldateien (Standard: kapitel/)")
    parser.add_argument("--out", default=os.path.join(HIER, "ausgabe"),
                        help="Ausgabe-Verzeichnis (Standard: ausgabe/)")
    parser.add_argument("--cover-dir", default=os.path.join(HIER, "..", "img", "covers"),
                        help="Verzeichnis mit Cover-JPEGs <slug>.jpg (Standard: ../img/covers)")
    args = parser.parse_args()

    roman = lade_roman(args.roman)
    baende = baende_aus_roman(roman)
    einzelbuch = not ist_trilogie(roman)
    slug = slugify(roman["titel"])
    genre = roman.get("genre", "")
    autor = roman.get("autor", "aban news")
    LABELS = {1: "Erster Band", 2: "Zweiter Band", 3: "Dritter Band"}

    def cover_fuer(artslug):
        p = os.path.join(args.cover_dir, "%s.jpg" % artslug)
        return p if os.path.exists(p) else None

    # Pro Band die geschriebenen Kapitel einlesen.
    band_kapitel = {b["nummer"]: lies_kapitel(args.kapitel_dir, b, einzelbuch)
                    for b in baende}
    gesamt = sum(len(v) for v in band_kapitel.values())
    if gesamt == 0:
        print("Noch keine Kapitel in %s gefunden - nichts zu bauen. "
              "Schreibe erst Kapitel mit schreibe_roman.py." % args.kapitel_dir)
        return 0

    os.makedirs(args.out, exist_ok=True)

    if einzelbuch:
        gruppen = [{"bandtitel": None, "kapitel": band_kapitel[baende[0]["nummer"]]}]
        schreibe_artefakte(args.out, slug, roman["titel"], genre, gruppen,
                           autor, cover_fuer(slug))
        print("== %s: %d Kapitel kompiliert ==" % (roman["titel"], gesamt))
        return 0

    # --- Trilogie: je Band ein Artefakt-Paar ---
    for b in baende:
        kaps = band_kapitel[b["nummer"]]
        if not kaps:
            print("= Band %d (%s): noch keine Kapitel, ueberspringe." % (b["nummer"], b["titel"]))
            continue
        bandslug = "%s-band-%02d" % (slug, b["nummer"])
        bandtitel = "%s - %s" % (roman["titel"], b["titel"])
        gruppen = [{"bandtitel": None, "kapitel": kaps}]
        schreibe_artefakte(args.out, bandslug, bandtitel, genre, gruppen,
                           autor, cover_fuer(bandslug))

    # --- Trilogie: Gesamtausgabe (Omnibus) mit Band-Trennseiten (Label + Epoche) ---
    omnibus_gruppen = [{"bandtitel": b["titel"],
                        "label": LABELS.get(b["nummer"], "Band %d" % b["nummer"]),
                        "epoch": b.get("untertitel", ""),
                        "kapitel": band_kapitel[b["nummer"]]}
                       for b in baende if band_kapitel[b["nummer"]]]
    schreibe_artefakte(args.out, "%s-gesamt" % slug, roman["titel"], genre, omnibus_gruppen,
                       autor, cover_fuer("%s-gesamt" % slug))

    print("== %s: %d Kapitel in %d Band/Baenden kompiliert ==" %
          (roman["titel"], gesamt, len(omnibus_gruppen)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
