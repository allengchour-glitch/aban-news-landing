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
def baue_markdown(gesamttitel, genre, gruppen):
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
    z.append("von [Autor]")
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
    """Macht aus den Prosa-Absaetzen eine Folge von <p>-Elementen."""
    return "\n".join("<p>%s</p>" % _esc(a) for a in absaetze)


EPUB_CSS = """body{font-family:Georgia,'Times New Roman',serif;line-height:1.7;margin:5%;color:#1f2937}
h1{color:#b45309;font-size:2em;line-height:1.2}
h2{color:#b45309;font-size:1.4em;margin-top:1.6em}
p{margin:0 0 1em 0;text-align:justify}
.cover{text-align:center;margin-top:30%}
.cover .t{font-size:2.6em;font-weight:bold;color:#d97706}
.cover .g{font-size:1.2em;color:#1f2937;margin-top:.4em;font-style:italic}
.cover .a{color:#6b7280;margin-top:2em;font-size:1em}
.banddivider{text-align:center;margin-top:30%}
.banddivider h1{color:#d97706}"""


def _xhtml_seite(lang, titel, body):
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
        '<head><meta charset="utf-8"/><title>%s</title>'
        '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
        '<body>%s</body></html>' % (lang, _esc(titel), body)
    )


def baue_epub(gesamttitel, genre, gruppen, pfad):
    """Baut ein valides EPUB3 ausschliesslich mit der Standardbibliothek.

    Bei mehreren Gruppen mit bandtitel wird je Band eine Trennseite in den Spine
    gelegt und das Inhaltsverzeichnis nach Baenden geschachtelt; Kapitel-IDs sind
    dann band-eindeutig (Einzelbuch behaelt das schlichte ch01-Schema).
    """
    lang = "de"
    bookid = "urn:abannews:ki-schriftsteller:%s" % slugify(gesamttitel)
    mehrband = any(g["bandtitel"] for g in gruppen)

    files = {}
    files["cover.xhtml"] = _xhtml_seite(
        lang, gesamttitel,
        '<div class="cover"><div class="t">%s</div>'
        '<div class="g">%s</div><div class="a">von [Autor]</div></div>'
        % (_esc(gesamttitel), _esc(genre or "")))

    spine_ids = ["cover"]
    nav_eintraege = []  # je Eintrag fertiges <li>...</li> (ggf. mit verschachtelter <ol>)

    for gi, g in enumerate(gruppen, 1):
        kap_nav = []
        if g["bandtitel"]:
            bid = "band%02d" % gi
            spine_ids.append(bid)
            files["%s.xhtml" % bid] = _xhtml_seite(
                lang, g["bandtitel"],
                '<div class="banddivider"><h1>%s</h1></div>' % _esc(g["bandtitel"]))

        for kap in g["kapitel"]:
            ueberschrift = _ueberschrift_fuer(kap)
            _, absaetze = teile_kapitel(kap["text"])
            cid = ("b%02dch%02d" % (gi, kap["nummer"])) if mehrband else ("ch%02d" % kap["nummer"])
            spine_ids.append(cid)
            kap_nav.append('<li><a href="%s.xhtml">%s</a></li>' % (cid, _esc(ueberschrift)))
            files["%s.xhtml" % cid] = _xhtml_seite(
                lang, ueberschrift,
                "<h2>%s</h2>\n%s" % (_esc(ueberschrift), absaetze_zu_xhtml(absaetze)))

        if g["bandtitel"]:
            nav_eintraege.append('<li><a href="band%02d.xhtml">%s</a><ol>%s</ol></li>'
                                 % (gi, _esc(g["bandtitel"]), "".join(kap_nav)))
        else:
            nav_eintraege.extend(kap_nav)

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
    spine = []
    for sid in spine_ids:
        manifest.append('<item id="%s" href="%s.xhtml" media-type="application/xhtml+xml"/>'
                        % (sid, sid))
        spine.append('<itemref idref="%s"/>' % sid)
    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        '<dc:identifier id="BookID">%s</dc:identifier>'
        '<dc:title>%s</dc:title>'
        '<dc:language>%s</dc:language>'
        '<dc:creator>[Autor]</dc:creator>'
        '<dc:subject>%s</dc:subject>'
        '<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>'
        '</metadata><manifest>%s</manifest><spine>%s</spine></package>'
        % (bookid, _esc(gesamttitel), lang, _esc(genre or ""),
           "".join(manifest), "".join(spine))
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
        for name, content in files.items():
            z.writestr("OEBPS/%s" % name, content)


# ------------------------------------------------------------------
# Ein Artefakt-Paar (Markdown + EPUB) schreiben
# ------------------------------------------------------------------
def schreibe_artefakte(out_dir, slug, gesamttitel, genre, gruppen):
    md_pfad = os.path.join(out_dir, "%s.md" % slug)
    with open(md_pfad, "w", encoding="utf-8") as f:
        f.write(baue_markdown(gesamttitel, genre, gruppen))
    print("OK Markdown geschrieben: %s" % md_pfad)

    epub_pfad = os.path.join(out_dir, "%s.epub" % slug)
    baue_epub(gesamttitel, genre, gruppen, epub_pfad)
    print("OK EPUB geschrieben: %s" % epub_pfad)


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
    args = parser.parse_args()

    roman = lade_roman(args.roman)
    baende = baende_aus_roman(roman)
    einzelbuch = not ist_trilogie(roman)
    slug = slugify(roman["titel"])
    genre = roman.get("genre", "")

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
        schreibe_artefakte(args.out, slug, roman["titel"], genre, gruppen)
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
        schreibe_artefakte(args.out, bandslug, bandtitel, genre, gruppen)

    # --- Trilogie: Gesamtausgabe (Omnibus) mit Band-Trennseiten ---
    omnibus_gruppen = [{"bandtitel": b["titel"], "kapitel": band_kapitel[b["nummer"]]}
                       for b in baende if band_kapitel[b["nummer"]]]
    schreibe_artefakte(args.out, "%s-gesamt" % slug, roman["titel"], genre, omnibus_gruppen)

    print("== %s: %d Kapitel in %d Band/Baenden kompiliert ==" %
          (roman["titel"], gesamt, len(omnibus_gruppen)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
