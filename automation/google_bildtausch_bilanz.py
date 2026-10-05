#!/usr/bin/env python3
"""google_bildtausch_bilanz.py — Trefferquote des Google-Bildtauschs JE LEDGER-ART (05.10.2026, Prüfer).

Frage: Wie viele der getauschten Produkte stehen nach dem jüngsten Google-Vollscan (`google_feedback_wache.py`,
Stand `dropship/_google_feedback_stand.json`) noch in einer Bild-/Adult-Klasse? Getrennt nach Art, denn die Urteile haben
verschiedene Grundlagen: `tausch` = Gemini + ChatGPT einig · `tausch-g` = Gemini allein · `tausch-q` = Groq-Vision allein ·
`kontrolle`/`uneinig` = unberührt (Vergleichsgruppe). Zählt nur Tausche, die VOR dem Scan-Stand lagen (ein Tausch nach dem
Scan kann noch nicht gemessen sein). Schreibt nichts. Eine Zeile «BILDTAUSCH-QUOTE …» für den Aufseher.
"""
import datetime as dt, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bildtausch_sperre as bs

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
KLASSEN = ("Inappropriate image", "Restricted adult content", "Personalized advertising: Sexual interests", "Promotional overlay on image")
ARTEN = ("tausch", "tausch-g", "tausch-q", "nachgesetzt", "rueckweg", "kontrolle", "uneinig", "behalten")


def main():
    stand = json.load(open(STAND))
    scan = stand["stand"][:10]
    blockiert = set()
    for k in KLASSEN:
        blockiert |= set(stand["handles"].get(k) or [])
    letzte = bs.letzte_zeilen()
    # «nachgesetzt» (Rücklese 05.10.) trägt die ursprüngliche Art und das Datum in Spalte 6: «… (tausch-g vom 2026-10-03)»
    import re
    for h, f in letzte.items():
        if f[2] == "nachgesetzt" and len(f) > 5:
            m = re.search(r"\((tausch[^ ]*) vom (\d{4}-\d\d-\d\d)\)", f[5])
            if m:
                f[2], f[1] = m.group(1), m.group(2)
    teile = []
    for art in ARTEN:
        hs = [h for h, f in letzte.items() if f[2] == art and f[1] < scan]      # nur Tausche vor dem Scan-Tag
        if not hs:
            continue
        frei = sum(h not in blockiert for h in hs)
        teile.append(f"{art} {frei}/{len(hs)} frei ({100 * frei // len(hs)} %)")
    spaet = sum(1 for h, f in letzte.items() if f[2] in bs.GETAUSCHT and f[1] >= scan)
    print(f"BILDTAUSCH-QUOTE (Scan {stand['stand']}): " + " · ".join(teile) + (f" · {spaet} Tausche nach dem Scan, noch ungemessen" if spaet else ""))


if __name__ == "__main__":
    main()
