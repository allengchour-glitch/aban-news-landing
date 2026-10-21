#!/usr/bin/env python3
"""Prozessübergreifende Sperre: Pilot-Lauf, Cockpit-Knopf, Aufgabenplanung und Not-Aus handeln nie gleichzeitig.

Zwei Läufe, die beide «Position 0» lesen, bevor einer kauft, würden sonst beide den vollen Betrag kaufen (doppelter Hebel).
Die Sperre ist eine Datei in data/, angelegt mit O_EXCL (gelingt nur einem Prozess). Der Halter frischt sie alle HERZSCHLAG
Sekunden auf. Bleibt sie nach einem Absturz oder einem hart beendeten Lauf liegen, gilt sie nach ALT_NACH Sekunden (Standard)
bzw. alt_nach als verwaist und wird übernommen — Nachkontrolle, Not-Aus und Tageslauf von Pilot 2.0 nehmen ALT_NACH_TOT (fünf
verpasste Herzschläge): ohne Herzschlag ist der Lauf tot.
Die Datei trägt eine Marke des Halters: der Herzschlag frischt nur die EIGENE Sperre auf und überlebt vorübergehende Zugriffsfehler
(Windows: Virenscanner, OneDrive), und wer die Sperre nicht mehr hält (ein anderer Lauf hat sie übernommen, z. B. nach dem Ruhezustand
des Rechners), löscht die fremde nicht.
"""
from __future__ import annotations

import os
import sys
import threading
import time
from contextlib import contextmanager
from pathlib import Path

ORDNER = Path(__file__).resolve().parents[3] / "data"
ALT_NACH = 900
# (16. Prüfung) Der lebende Lauf frischt die Sperre alle HERZSCHLAG Sekunden auf: nach ALT_NACH_TOT Sekunden ohne Lebenszeichen (fünf verpasste Schläge) ist er tot.
# Nachkontrolle, Not-Aus und Tageslauf übernehmen dann, statt bis zu ALT_NACH (900 s) zu warten — nach einem harten Abbruch (Prozess beendet, Zeitlimit des
# Cockpits, Stromausfall) lief die Nachkontrolle sonst gar nicht und der Markt blieb bis zum nächsten Tageslauf ungeprüft.
HERZSCHLAG = 30
ALT_NACH_TOT = 150
# (Nachprüfung der 16. Folge-Runde) Übernahme einer toten Sperre: zwei Prozesse, die sie zugleich als verwaist sehen, löschten nacheinander — der zweite die FRISCH angelegte des ersten, und beide hielten die Sperre.
# Jetzt prüft, löscht und legt nur der Inhaber einer kurzlebigen Wache (<sperre>.uebernahme, O_EXCL) neu an; eine liegen gebliebene Wache (Prozess starb mitten in der Übernahme) gilt nach WACHE_ALT Sekunden als verwaist (kürzer als die Wartezeit der Buch-Sperre, 15 s).
WACHE_ALT = 10


def _haken(was):  # noqa: ARG001 — nur für Tests: hält einen Prozess an einer Stelle der Übernahme an
    return None


class Besetzt(RuntimeError):
    """Ein anderer Lauf hält die Sperre."""


class SperreVerloren(RuntimeError):
    """Eine Sperre, die dieser Prozess hält, gehört inzwischen einem anderen Lauf (sie wurde als tot übernommen — z. B. nach dem Ruhezustand des Rechners, einem Uhrensprung oder einem langen Stillstand)."""


# (17. Prüfung W3) Die Sperren, die DIESER Prozess gerade hält (Pfad → Marke). Ein eingefrorener Lauf (Ruhezustand: Herzschlag und Lauf stehen) merkte nach dem Aufwachen nicht, dass Nachkontrolle oder Not-Aus seine
# Sperre als tot übernommen hatten, und führte seinen veralteten Plan aus (Abweichung bis 12'318 USDT Netto, das Vorzeichen kippte in 15 Fällen). pruefen() liest vor jedem schreibenden Auftrag die Marke.
_gehalten = {}
_gehalten_sperre = threading.Lock()


def pruefen():
    """Gehören alle Sperren, die dieser Prozess hält, noch ihm? Sonst SperreVerloren. Eine kurz nicht lesbare Datei (Virenscanner, OneDrive) zählt als «unbekannt» und lässt den Auftrag zu."""
    with _gehalten_sperre:
        gehalten = list(_gehalten.items())
    for pfad, marke in gehalten:
        datei = Path(pfad)
        try:
            inhalt = datei.read_text()
        except FileNotFoundError:
            inhalt = None
        except OSError:
            continue
        if inhalt == marke:
            continue
        # (18. Prüfung K3) Die Liste oben ist eine Momentaufnahme: gibt ein anderer Thread (Cockpit) diese Sperre genau zwischen Kopie und Lesen ORDNUNGSGEMÄSS frei, ist sie nicht verloren
        with _gehalten_sperre:
            if _gehalten.get(pfad) != marke:
                continue
        if inhalt is None:
            raise SperreVerloren(f"Die Sperre {datei.name} ist weg (übernommen und wieder freigegeben?) — kein Auftrag mehr.")
        raise SperreVerloren(f"Die Sperre {datei.name} gehört inzwischen einem anderen Lauf (als tot übernommen) — kein Auftrag mehr.")


def _inhalt(datei):
    """Inhalt der Sperrdatei, None wenn sie fehlt oder gerade nicht lesbar ist (Windows: kurz von einem Virenscanner gehalten)."""
    try:
        return datei.read_text()
    except OSError:
        return None


def _wache(datei):
    """Wache für die Übernahme einer verwaisten Sperre nehmen. → Pfad der Wache, oder None (ein anderer Prozess übernimmt gerade)."""
    w = datei.with_name(datei.name + ".uebernahme")
    try:
        os.close(os.open(str(w), os.O_CREAT | os.O_EXCL | os.O_WRONLY))
        return w
    except FileExistsError:
        try:
            if abs(time.time() - w.stat().st_mtime) > WACHE_ALT:  # (20. Prüfung, klein 6) auch eine Wache «aus der Zukunft» (der Halter starb, danach sprang die Uhr zurück): sonst blockierte sie jede Übernahme für Δ + WACHE_ALT
                w.unlink()  # vergessen (der Prozess starb mitten in der Übernahme)
        except OSError:
            pass
        return None
    except OSError:  # Windows: kurz gehalten
        return None


@contextmanager
def lauf_sperre(name="krypto-lauf", warten=0.0, ordner=None, alt_nach=ALT_NACH):
    datei = Path(ordner or ORDNER) / f"{name}.lock"
    datei.parent.mkdir(parents=True, exist_ok=True)
    start = time.time()
    while True:
        try:
            fd = os.open(str(datei), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            marke = f"{os.getpid()} {time.time():.0f} {os.urandom(4).hex()}\n"  # nur dieser Halter kennt sie: der Herzschlag und das Löschen erkennen daran die EIGENE Sperre
            os.write(fd, marke.encode())
            os.close(fd)
            break
        except FileExistsError:
            try:
                alter = time.time() - datei.stat().st_mtime
            except FileNotFoundError:
                continue  # gerade freigegeben: nochmals versuchen
            if alter > alt_nach or alter < -alt_nach:  # (19. Prüfung, klein 3) auch eine Sperre «aus der Zukunft»: der Halter starb, danach sprang die Uhr zurück — sonst gälte sie erst nach Δ + alt_nach als tot
                _haken("vor_wache")
                wache = _wache(datei)
                if wache is None:  # ein anderer Prozess übernimmt gerade
                    if time.time() - start >= warten:
                        raise Besetzt("Ein anderer Lauf übernimmt gerade die verwaiste Sperre.") from None
                    time.sleep(0.05)
                    continue
                try:
                    try:  # unter der Wache nochmals prüfen: ist es IMMER NOCH die verwaiste Sperre? (ein anderer kann sie inzwischen übernommen und neu angelegt haben)
                        alter = time.time() - datei.stat().st_mtime
                    except FileNotFoundError:
                        continue
                    if alter > alt_nach or alter < -alt_nach:
                        _haken("vor_loeschen")
                        try:
                            datei.unlink()
                        except FileNotFoundError:
                            pass
                        except OSError:  # kurz gehalten (Windows: Virenscanner, OneDrive): noch ein Versuch, solange wir warten dürfen
                            if time.time() - start >= warten:
                                raise Besetzt(f"Die verwaiste Sperre (seit {alter:.0f} s) lässt sich nicht löschen.") from None
                            time.sleep(0.25)
                finally:
                    try:
                        wache.unlink()
                    except OSError:
                        pass
                continue
            if time.time() - start >= warten:
                raise Besetzt(f"Ein anderer Lauf handelt gerade (seit {alter:.0f} s).") from None
            time.sleep(0.25)
    with _gehalten_sperre:
        _gehalten[str(datei)] = marke
    # Lebenszeichen: solange der Lauf dauert, wird die Sperre alle HERZSCHLAG Sekunden «angefasst» — ein langer Lauf (z. B. langsame
    # Kursquellen) gilt so nie als verwaist, und ein zweiter Lauf startet nicht mittendrin.
    fertig = threading.Event()

    def auffrischen():
        while not fertig.wait(HERZSCHLAG):
            try:
                if _inhalt(datei) not in (None, marke):
                    return  # die Sperre gehört einem anderen Lauf (er hat sie übernommen): nicht anfassen — sonst hielte unser Herzschlag SEINE Sperre am Leben
                os.utime(datei)
            except FileNotFoundError:
                return  # die Sperre ist weg (übernommen und wieder freigegeben): nicht neu anlegen
            except OSError:
                continue  # vorübergehend nicht möglich (Virenscanner, OneDrive): beim nächsten Schlag nochmals — ein toter Herzschlag liesse den lebenden Lauf nach ALT_NACH_TOT als tot gelten

    threading.Thread(target=auffrischen, daemon=True).start()
    try:
        yield
    finally:
        with _gehalten_sperre:
            if _gehalten.get(str(datei)) == marke:
                del _gehalten[str(datei)]
        fertig.set()
        for _versuch in range(10):  # Windows: die Datei kann kurz gehalten sein — ein erfolgreicher Lauf soll daran nicht scheitern
            try:
                if _inhalt(datei) in (None, marke):
                    datei.unlink()
                else:
                    print("Warnung: die Lauf-Sperre gehörte zuletzt einem anderen Lauf (eine tote Sperre wurde übernommen) — die fremde bleibt stehen.", file=sys.stderr)
                break
            except FileNotFoundError:
                break
            except OSError:
                time.sleep(0.2)
