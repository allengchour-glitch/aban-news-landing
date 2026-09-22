"""Eimer-Etikette fuer Massen-Schreiber (22.09.2026).

GEMESSEN 22.09. 20:27 UTC: Eimer 95 von 2'000 Punkten, waehrend vier Dauerlaeufer schrieben
(produkttexte_du_form, fortura_image_backfill, cj_reviews_import, cj_video_reel_engine). Zwei
Tages-Waechter starben in derselben Stunde mit «12x gedrosselt (Eimer dauerhaft leer)»:
cj_versand_ch_guard (Ghost-Sale-Klasse) und lagerstand_hygiene. Jeder Schreiber war fuer sich
hoeflich (schlief bei THROTTLED) — zusammen liefen sie den Eimer auf null und liessen ihn dort.
Die Schranke begrenzt, wie viele STARTEN; sie begrenzt nicht, wie viel ein Laufender TRINKT.

Regel: Wer in Masse schreibt, laesst dem Eimer einen Boden. Nach JEDER Antwort den
throttleStatus lesen; liegt currentlyAvailable unter BODEN, warten, bis ZIEL wieder erreicht ist
(aus restoreRate gerechnet, hoechstens DECKEL Sekunden). Tages-Waechter (leicht, kurz) brauchen
das nicht — sie sollen den Boden VORFINDEN.

Nutzung:  from eimer_etikette import nachlauf ; d = <Antwort-JSON> ; nachlauf(d)
Umgebung: EIMER_BODEN (Standard 600), EIMER_ZIEL (1000), EIMER_DECKEL (20 s), EIMER_AUS=1 schaltet ab.
"""
import os, time

BODEN = float(os.environ.get("EIMER_BODEN", "600"))
ZIEL = float(os.environ.get("EIMER_ZIEL", "1000"))
DECKEL = float(os.environ.get("EIMER_DECKEL", "20"))
AUS = os.environ.get("EIMER_AUS") == "1"
_gewartet = {"n": 0, "s": 0.0}


def nachlauf(d):
    """Liest throttleStatus aus einer GraphQL-Antwort; wartet, wenn der Eimer unter dem Boden liegt.
    Gibt die gewartete Zeit in Sekunden zurueck (0 = nichts zu tun)."""
    if AUS or not isinstance(d, dict):
        return 0.0
    ts = (((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {})
    try:
        avail = float(ts.get("currentlyAvailable")); rate = float(ts.get("restoreRate") or 0)
    except (TypeError, ValueError):
        return 0.0
    if avail >= BODEN or rate <= 0:
        return 0.0
    warte = min(DECKEL, max(1.0, (ZIEL - avail) / rate))
    _gewartet["n"] += 1; _gewartet["s"] += warte
    time.sleep(warte)
    return warte


def bilanz():
    return f"Eimer-Etikette: {_gewartet['n']}x gewartet, {_gewartet['s']:.0f} s gesamt"
