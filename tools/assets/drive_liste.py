# -*- coding: utf-8 -*-
"""Oeffentlichen Google-Drive-Ordner auflisten (ohne Anmeldung, ohne API-Schluessel).

WOZU: Quaternius (CC0) verteilt seine Packs als oeffentliche Drive-Ordner. itch.io ist
ueber den Proxy nicht ladbar, Drive schon. Die Ordnerseite enthaelt die Dateiliste als
JSON im Skript-Block `window['_DRIVE_ivd']` — diese Liste wird hier ausgelesen.

Aufruf:  python3 tools/assets/drive_liste.py <ordner-id>
         → je Zeile: Name | Datei-ID | MIME-Typ (Unterordner werden bis Tiefe 3 geoeffnet)
Laden:   https://drive.google.com/uc?export=download&id=<Datei-ID>
         (kleine Dateien direkt; ueber ~100 MB fragt Drive nach einer Bestaetigung)
Beispiel: Quaternius Cars Pack = 1fKlbDry77iY8KlEoxzUxIAZQL_XhzWlA (Charge 50)
"""
import sys, re, json, urllib.request


def liste(fid):
    req = urllib.request.Request("https://drive.google.com/drive/folders/" + fid,
                                 headers={"User-Agent": "Mozilla/5.0"})
    h = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    m = re.search(r"window\['_DRIVE_ivd'\]\s*=\s*'(.*?)';", h, re.S)
    if not m:
        return []
    # \x22 → " und \x5b → [ — nur die Escapes aufloesen, NICHT ueber unicode_escape
    # (das liest UTF-8-Bytes als Latin-1: „Straße" wuerde „StraÃŸe", Code-Review)
    roh = re.sub(r"\\x([0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})",
                 lambda mm: chr(int(mm.group(1) or mm.group(2), 16)), m.group(1))
    roh = roh.replace("\\/", "/").replace("\\\\", "\\")
    daten = json.loads(roh)
    return [(e[0], e[2], e[3]) for e in (daten[0] or [])]


def gehe(fid, einzug="", tiefe=0):
    for i, name, mime in liste(fid):
        print(einzug + name, "|", i, "|", mime)
        if "folder" in mime and tiefe < 3:
            gehe(i, einzug + "  ", tiefe + 1)


if __name__ == "__main__":
    gehe(sys.argv[1])
