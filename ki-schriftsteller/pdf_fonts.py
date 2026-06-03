#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pdf_fonts - registriert einen einbettbaren Serif-Font fuer reportlab.

KDP verlangt, dass *alle* Fonts in der Druck-PDF eingebettet sind. Die
PDF-Standardfonts (Times-Roman/Bold/Italic, Helvetica) werden von reportlab
NICHT eingebettet. Dieses Modul sucht einen passenden TrueType-Serif auf dem
System (bevorzugt **Liberation Serif** - metrisch Times-kompatibel), registriert
Regular/Bold/Italic/BoldItalic als Familie und gibt die Font-Namen zurueck.

Findet sich kein TTF, fallen wir bewusst auf die Standardfonts zurueck (damit der
Build nie crasht) und melden embedded=False, damit der Aufrufer warnen kann.

Verwendung:
    from pdf_fonts import register_serif
    F = register_serif()        # {"roman","bold","italic","bolditalic","embedded"}
    style.fontName = F["roman"]
"""
import os

try:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    _HAVE_RL = True
except ImportError:
    _HAVE_RL = False

# (Familienname, regular, bold, italic, bolditalic) - in Praeferenz-Reihenfolge.
_CANDIDATES = [
    ("LiberationSerif",
     "LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf",
     "LiberationSerif-Italic.ttf", "LiberationSerif-BoldItalic.ttf"),
    ("DejaVuSerif",
     "DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf",
     "DejaVuSerif-Italic.ttf", "DejaVuSerif-BoldItalic.ttf"),
    ("FreeSerif",
     "FreeSerif.ttf", "FreeSerifBold.ttf",
     "FreeSerifItalic.ttf", "FreeSerifBoldItalic.ttf"),
]

_SEARCHDIRS = [
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts/truetype/liberation2",
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/freefont",
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    os.path.expanduser("~/.fonts"),
    "/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
]

_FALLBACK = {"roman": "Times-Roman", "bold": "Times-Bold",
             "italic": "Times-Italic", "bolditalic": "Times-BoldItalic",
             "embedded": False}

_cache = None


def _find(fname):
    for d in _SEARCHDIRS:
        p = os.path.join(d, fname)
        if os.path.exists(p):
            return p
    for d in _SEARCHDIRS:
        if os.path.isdir(d):
            for root, _dirs, files in os.walk(d):
                if fname in files:
                    return os.path.join(root, fname)
    return None


def register_serif():
    """Registriert einen einbettbaren Serif-Font und gibt die Namen zurueck.

    Idempotent (cached): mehrfacher Aufruf registriert nur einmal.
    """
    global _cache
    if _cache is not None:
        return _cache
    if not _HAVE_RL:
        _cache = dict(_FALLBACK)
        return _cache

    for fam, reg, bold, ital, bi in _CANDIDATES:
        pr, pb, pi, pbi = _find(reg), _find(bold), _find(ital), _find(bi)
        if pr and pb and pi and pbi:
            try:
                pdfmetrics.registerFont(TTFont(fam, pr))
                pdfmetrics.registerFont(TTFont(fam + "-Bold", pb))
                pdfmetrics.registerFont(TTFont(fam + "-Italic", pi))
                pdfmetrics.registerFont(TTFont(fam + "-BoldItalic", pbi))
                pdfmetrics.registerFontFamily(
                    fam, normal=fam, bold=fam + "-Bold",
                    italic=fam + "-Italic", boldItalic=fam + "-BoldItalic")
            except Exception:
                continue
            _cache = {"roman": fam, "bold": fam + "-Bold",
                      "italic": fam + "-Italic", "bolditalic": fam + "-BoldItalic",
                      "embedded": True, "family": fam}
            return _cache

    _cache = dict(_FALLBACK)
    return _cache


def canvas_maker():
    """Liefert eine Canvas-Klasse, deren Default-Font der eingebettete Serif ist.

    reportlab setzt sonst Helvetica (nicht eingebettet) als Canvas-Default und
    deklariert es in den Seiten-Ressourcen. Durch Setzen des eingebetteten Fonts
    direkt bei der Canvas-Erzeugung bleibt kein nicht-eingebetteter Font uebrig.
    Faellt auf die Standard-Canvas zurueck, wenn reportlab fehlt oder kein TTF da.
    """
    if not _HAVE_RL:
        return None
    from reportlab.pdfgen import canvas as _canvas
    F = register_serif()
    if not F.get("embedded"):
        return _canvas.Canvas
    fam = F["roman"]

    class EmbeddedFontCanvas(_canvas.Canvas):
        def __init__(self, *a, **k):
            _canvas.Canvas.__init__(self, *a, **k)
            try:
                self.setFont(fam, 10)
            except Exception:
                pass

    return EmbeddedFontCanvas
