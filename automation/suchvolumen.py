#!/usr/bin/env python3
"""suchvolumen.py — echte Schweizer Suchvolumen aus der Semrush-Ernte (Testabo 02.–09.10.2026) für alle Werkzeuge.

Daten (bleiben nach dem Abo nutzbar): dropship/semrush/kategorie_suchvolumen_ch_2026-10-02.csv (Begriff;Volumen;KD;CPC;Absicht)
und kategorie_zu_suchbegriff_2026-10-02.json (Kollektionstitel → 1–2 Suchanfragen, von Gemini formuliert).
  volumen("hundebett") → 4400 · fuer_kollektion("🐶 Hundebetten & Kissen") → höchstes Volumen ihrer Suchbegriffe (0 = unbekannt)
  python3 automation/suchvolumen.py [begriff …]
"""
import csv, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
ORDNER = os.path.join(os.path.dirname(HIER), "dropship", "semrush")
_VOL, _MAP = None, None


def _laden():
    global _VOL, _MAP
    if _VOL is not None:
        return
    _VOL, _MAP = {}, {}
    for name in sorted(os.listdir(ORDNER)) if os.path.isdir(ORDNER) else []:
        p = os.path.join(ORDNER, name)
        if name.startswith("kategorie_suchvolumen_ch_") and name.endswith(".csv"):
            for z in csv.DictReader(open(p, encoding="utf-8"), delimiter=";"):
                try:
                    _VOL[z["Keyword"].strip().lower()] = (int(z["Search Volume"]), float(z["Keyword Difficulty Index"] or 0))
                except (KeyError, ValueError):
                    pass
        elif name.startswith("kategorie_zu_suchbegriff_") and name.endswith(".json"):
            for k, v in json.load(open(p, encoding="utf-8")).get("map", {}).items():
                _MAP[kategorie_schluessel(k)] = v     # Gemini schrieb die Schlüssel mit eigener Leerzeichen-Form


def kategorie_schluessel(titel):
    """Gleiche Normalisierung wie bei der Ernte (Emoji/Satzzeichen weg, & → Leerzeichen, klein)."""
    t = re.sub(r"[^\wäöüÄÖÜß&\- ]", " ", titel)
    return re.sub(r"\s+", " ", t.replace("&", " ")).strip().lower()


def volumen(begriff):
    _laden()
    return (_VOL.get(begriff.strip().lower()) or (0, 0))[0]


def schwierigkeit(begriff):
    _laden()
    return (_VOL.get(begriff.strip().lower()) or (0, 0))[1]


def suchbegriffe(titel):
    _laden()
    return _MAP.get(kategorie_schluessel(titel), [])


def fuer_kollektion(titel):
    return max([volumen(b) for b in suchbegriffe(titel)] or [0])


if __name__ == "__main__":
    for b in sys.argv[1:] or ["hundebett", "ballerinas", "gibt es nicht"]:
        print(b, volumen(b), schwierigkeit(b))
    print("Kollektion «Hundebetten & Kissen»:", suchbegriffe("Hundebetten & Kissen"), fuer_kollektion("Hundebetten & Kissen"))
