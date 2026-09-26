"""Cursor fuer Katalog-Reiniger, die den ganzen Bestand in Etappen abgehen.

⚠️ 25.09.2026 — warum es das gibt: bild_klein_fix, default_variant_fix und
promo_aus_beschreibung schrieben nach jeder Seite den Cursor, setzten ihn am
Katalogende aber NIE zurueck. Ab dem 14.09. stand er auf dem letzten Produkt;
jeder Lauf danach fragte «nach dem letzten», bekam 0 Produkte und schrieb
«FERTIG: 0 gescannt» — 180 Mal in elf Tagen, ohne Fehler, ohne Ampel.
Ein Reiniger, der nur noch Produkte hinter dem letzten sieht, prueft den
Bestand nie wieder (und neue Ware kommt seit der Grind-Pause keine).

Vertrag:
  cur = start(PFAD)       -> Cursor oder None; beendet den Prozess mit «PAUSE»,
                             wenn die letzte VOLLE Runde juenger als TAGE ist
  weiter(PFAD, cursor)    -> nach jeder Seite
  fertig(PFAD)            -> am Katalogende: Cursor weg; Stempel nur, wenn diese
                             Runde wirklich am Anfang begonnen hat
"""
import os
import sys
import time


def _stempel(pfad):
    return pfad + ".vollrunde"


def _begonnen(pfad):
    return pfad + ".begonnen"


def start(pfad, tage=None):
    tage = float(os.environ.get("VOLLRUNDE_TAGE", tage if tage is not None else 7))
    if os.path.exists(pfad):
        cur = open(pfad).read().strip() or None
        if cur:
            return cur
    st = _stempel(pfad)
    if os.path.exists(st):
        try:
            t = float(open(st).read().strip() or 0)
        except ValueError:
            t = 0
        alter = time.time() - t
        if alter < tage * 86400:
            naechste = time.strftime("%Y-%m-%d %H:%M", time.gmtime(t + tage * 86400))
            print(f"PAUSE: letzte volle Runde {alter / 86400:.1f} Tage alt, naechste ab {naechste} UTC",
                  flush=True)
            sys.exit(0)
    open(_begonnen(pfad), "w").write(str(time.time()))
    return None


def weiter(pfad, cursor):
    open(pfad, "w").write(cursor)


def fertig(pfad):
    """Am Katalogende. Ohne Anfangsmarke (z. B. ein seit Tagen haengender Cursor)
    zaehlt die Runde nicht als voll: der Cursor faellt weg, der naechste Lauf
    beginnt vorne — und erst DER darf den Stempel setzen."""
    voll = os.path.exists(_begonnen(pfad))
    for f in (pfad, _begonnen(pfad)):
        if os.path.exists(f):
            os.remove(f)
    if voll:
        open(_stempel(pfad), "w").write(str(time.time()))
    else:
        # Markierung fuer nullrunden_wache.py: die folgende «FERTIG: 0» ist die Freigabe eines
        # haengenden Cursors, keine blinde Runde. Ohne sie meldete der Waechter die drei
        # Reiniger nach der Freigabe vom 25.09. weiter — in der Cloud, wo der Container nach
        # jeder Routine nur ~5 min lebt, womoeglich fuer immer.
        print("CURSOR-FREI: haengender Cursor geloest, naechster Lauf beginnt vorne", flush=True)
    return voll
