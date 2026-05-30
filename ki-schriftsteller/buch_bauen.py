#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Buch-Bauen - kompiliert die geschriebenen Kapitel zu lieferbaren Buchdateien.

Reiner Stdlib-Compiler (KEINE anthropic-/pip-Abhaengigkeit): liest die
Plot-Bibel (roman.json) und alle vorhandenen Kapitel-Dateien
(kapitel/kapitel-NN.md) in Reihenfolge und erzeugt zwei Artefakte im
Ausgabe-Verzeichnis:

  1. <titel-slug>.md    - ein zusammengefuegtes Markdown-Manuskript mit
                          Titelseite, Inhaltsverzeichnis und allen Kapiteln.
  2. <titel-slug>.epub  - ein valides EPUB3, gebaut nur mit zipfile
                          (mimetype zuerst und unkomprimiert, container.xml,
                          content.opf, nav.xhtml, je eine XHTML-Datei pro
                          Kapitel plus Titelseite).

Der EPUB-Aufbau folgt bewusst exakt dem Muster aus generate_ebook.py
(build_epub / blocks_to_xhtml / EPUB_CSS / mimetype-zuerst-Trick), ist hier
aber lokal neu implementiert, weil generate_ebook.py von reportlab abhaengt.

Verwendung:
  python3 buch_bauen.py
  python3 buch_bauen.py --roman roman.json --kapitel-dir kapitel/ --out ausgabe/
"""
import argparse
import json
import os
import re
import sys
import zipfile

HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Hilfsfunktionen
# ------------------------------------------------------------------
def lade_roman(pfad):
    """Liest die Plot-Bibel (roman.json) und gibt das dict zurueck."""
    with open(pfad, "r", encoding="utf-8") as f:
        return json.load(f)


def slugify(text):
    """Macht aus einem Titel einen dateisystem-tauglichen Slug.

    Umlaute werden transliteriert, alles andere auf [a-z0-9-] reduziert.
    """
    text = text.lower()
    ersetzungen = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
        "á": "a", "à": "a", "â": "a", "é": "e", "è": "e", "ê": "e",
        "í": "i", "ó": "o", "ô": "o", "ú": "u", "ñ": "n", "ç": "c",
    }
    for alt, neu in ersetzungen.items():
        text = text.replace(alt, neu)
    # Alles, was kein Buchstabe/Ziffer ist, wird zu einem Bindestrich.
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "roman"


def lies_kapitel(kapitel_dir, kapitel_plan):
    """Liest alle vorhandenen kapitel-NN.md in der Reihenfolge des Plans.

    Greift auf den Kapitelplan aus roman.json zu (Nummer + geplanter Titel)
    und liest die zugehoerige Datei kapitel-%02d.md, falls vorhanden.
    Gibt eine Liste von dicts zurueck: {nummer, plan_titel, text}.
    """
    kapitel = []
    for k in kapitel_plan:
        nummer = k["nummer"]
        pfad = os.path.join(kapitel_dir, "kapitel-%02d.md" % nummer)
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
    "Kapitel 1 - Titel". Sie wird als Ueberschrift verwendet; der Rest ist
    der Fliesstext, der in leerzeilen-getrennte Absaetze zerlegt wird.
    """
    zeilen = text.split("\n", 1)
    ueberschrift = zeilen[0].strip().lstrip("#").strip()
    rest = zeilen[1].strip() if len(zeilen) > 1 else ""
    # Absaetze werden durch Leerzeilen getrennt.
    absaetze = [a.strip() for a in re.split(r"\n\s*\n", rest) if a.strip()]
    return ueberschrift, absaetze


# ------------------------------------------------------------------
# Markdown-Manuskript
# ------------------------------------------------------------------
def baue_markdown(roman, kapitel):
    """Setzt das kombinierte Markdown-Manuskript zusammen.

    Aufbau: Titelseite (Titel, Genre, Autoren-Platzhalter),
    Inhaltsverzeichnis, dann jedes Kapitel.
    """
    z = []
    # --- Titelseite ---
    z.append("# %s" % roman["titel"])
    z.append("")
    z.append("*%s*" % roman.get("genre", ""))
    z.append("")
    z.append("von [Autor]")
    z.append("")
    z.append("---")
    z.append("")
    # --- Inhaltsverzeichnis ---
    z.append("## Inhaltsverzeichnis")
    z.append("")
    for kap in kapitel:
        ueberschrift, _ = teile_kapitel(kap["text"])
        if not ueberschrift:
            ueberschrift = "Kapitel %d - %s" % (kap["nummer"], kap["plan_titel"])
        z.append("%d. %s" % (kap["nummer"], ueberschrift))
    z.append("")
    z.append("---")
    z.append("")
    # --- Kapitel ---
    for kap in kapitel:
        ueberschrift, absaetze = teile_kapitel(kap["text"])
        if not ueberschrift:
            ueberschrift = "Kapitel %d - %s" % (kap["nummer"], kap["plan_titel"])
        z.append("## %s" % ueberschrift)
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
.cover .a{color:#6b7280;margin-top:2em;font-size:1em}"""


def baue_epub(roman, kapitel, pfad):
    """Baut ein valides EPUB3 ausschliesslich mit der Standardbibliothek.

    Struktur (identisch zum Muster in generate_ebook.py):
      mimetype (zuerst, unkomprimiert) + META-INF/container.xml +
      OEBPS/{content.opf, nav.xhtml, style.css, cover.xhtml, chNN.xhtml}.
    """
    lang = "de"
    titel = roman["titel"]
    genre = roman.get("genre", "")
    bookid = "urn:abannews:ki-schriftsteller:%s" % slugify(titel)

    # --- XHTML-Dateien sammeln ---
    files = {}

    # Titelseite / Cover
    files["cover.xhtml"] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
        '<head><meta charset="utf-8"/><title>%s</title>'
        '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
        '<body><div class="cover"><div class="t">%s</div>'
        '<div class="g">%s</div><div class="a">von [Autor]</div>'
        '</div></body></html>' % (lang, _esc(titel), _esc(titel), _esc(genre))
    )

    spine_ids = ["cover"]
    nav_items = []
    for kap in kapitel:
        ueberschrift, absaetze = teile_kapitel(kap["text"])
        if not ueberschrift:
            ueberschrift = "Kapitel %d - %s" % (kap["nummer"], kap["plan_titel"])
        cid = "ch%02d" % kap["nummer"]
        spine_ids.append(cid)
        nav_items.append('<li><a href="%s.xhtml">%s</a></li>'
                         % (cid, _esc(ueberschrift)))
        files["%s.xhtml" % cid] = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="%s">'
            '<head><meta charset="utf-8"/><title>%s</title>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            '<body><h2>%s</h2>\n%s</body></html>'
            % (lang, _esc(ueberschrift), _esc(ueberschrift),
               absaetze_zu_xhtml(absaetze))
        )

    # --- nav.xhtml (Inhaltsverzeichnis) ---
    nav = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" lang="%s">'
        '<head><meta charset="utf-8"/><title>Inhaltsverzeichnis</title></head><body>'
        '<nav epub:type="toc" id="toc"><h1>Inhaltsverzeichnis</h1><ol>%s</ol></nav>'
        '</body></html>' % (lang, "".join(nav_items))
    )

    # --- content.opf (Manifest + Spine) ---
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
        % (bookid, _esc(titel), lang, _esc(genre),
           "".join(manifest), "".join(spine))
    )

    # --- container.xml ---
    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
                 '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                 '<rootfiles><rootfile full-path="OEBPS/content.opf" '
                 'media-type="application/oebps-package+xml"/></rootfiles></container>')

    # --- ZIP schreiben ---
    with zipfile.ZipFile(pfad, "w", zipfile.ZIP_DEFLATED) as z:
        # mimetype zuerst, unkomprimiert (EPUB-Spec)
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container)
        z.writestr("OEBPS/content.opf", opf)
        z.writestr("OEBPS/nav.xhtml", nav)
        z.writestr("OEBPS/style.css", EPUB_CSS)
        for name, content in files.items():
            z.writestr("OEBPS/%s" % name, content)


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Kompiliert geschriebene Kapitel zu Markdown + EPUB3.")
    parser.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                        help="Pfad zur Plot-Bibel (Standard: roman.json)")
    parser.add_argument("--kapitel-dir", default=os.path.join(HIER, "kapitel"),
                        help="Verzeichnis mit kapitel-NN.md (Standard: kapitel/)")
    parser.add_argument("--out", default=os.path.join(HIER, "ausgabe"),
                        help="Ausgabe-Verzeichnis (Standard: ausgabe/)")
    args = parser.parse_args()

    roman = lade_roman(args.roman)
    kapitel = lies_kapitel(args.kapitel_dir, roman["kapitel"])

    # Sauber abbrechen, wenn noch keine Kapitel geschrieben wurden.
    if not kapitel:
        print("Noch keine Kapitel in %s gefunden - nichts zu bauen. "
              "Schreibe erst Kapitel mit schreibe_roman.py." % args.kapitel_dir)
        return 0

    os.makedirs(args.out, exist_ok=True)
    slug = slugify(roman["titel"])

    # 1) Markdown-Manuskript
    md_pfad = os.path.join(args.out, "%s.md" % slug)
    with open(md_pfad, "w", encoding="utf-8") as f:
        f.write(baue_markdown(roman, kapitel))
    print("OK Markdown geschrieben: %s" % md_pfad)

    # 2) EPUB3
    epub_pfad = os.path.join(args.out, "%s.epub" % slug)
    baue_epub(roman, kapitel, epub_pfad)
    print("OK EPUB geschrieben: %s" % epub_pfad)

    print("== %s: %d Kapitel kompiliert ==" % (roman["titel"], len(kapitel)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
