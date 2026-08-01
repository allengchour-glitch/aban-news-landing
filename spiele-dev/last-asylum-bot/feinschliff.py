#!/usr/bin/env python3
"""Fällige Feinkorrekturen an der Konfiguration - geprüft und committet.

Warum es dieses Werkzeug gibt: `config/last-asylum.json` ist rund 180 KB
gross. Claude kann sie über die GitHub-Schnittstelle nicht sicher ersetzen -
ein Übertragungsfehler dort legt den ganzen Bot lahm. Von Hand ändern geht
zwar, blockiert aber den nächsten `git pull` des Bots ("local changes would
be overwritten"), und dann bekommt er nie wieder eine neue Fassung.

Dieses Skript ändert nur einzelne Zahlen, prüft die Konfiguration danach und
schiebt sie ins Repository. Damit bleibt alles in einer Linie.

    python feinschliff.py            # zeigt, was sich ändern würde
    python feinschliff.py --anwenden # ändert, prüft und committet

Jede Korrektur greift nur, wenn der aktuelle Wert der erwartete ist. Wurde
schon geändert, wird sie übersprungen - das Skript lässt sich also gefahrlos
mehrfach ausführen.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

KONFIG = os.path.join(HIER, "config", "last-asylum.json")


def regel(daten: dict, name: str) -> dict:
    for r in daten.get("rules", []):
        if r.get("name") == name:
            return r
    raise SystemExit(f"Regel '{name}' steht nicht in der Konfiguration.")


def farbwert_setzen(daten, regelname, feld, alt, neu):
    """Einen Wert im farbknopf einer Regel setzen - nur wenn er noch `alt` ist."""
    fk = regel(daten, regelname)["match"]["farbknopf"]
    jetzt = fk.get(feld)
    if jetzt == neu:
        return None, f"{regelname}.{feld} steht schon auf {neu}"
    if jetzt != alt:
        return None, (f"{regelname}.{feld} ist {jetzt}, erwartet war {alt} - "
                      "nicht angefasst")
    fk[feld] = neu
    return f"{regelname}.{feld}: {alt} -> {neu}", None


# Jede Korrektur: (Kurzname, Begruendung, Funktion)
KORREKTUREN = [
    (
        "rote-abzeichen",
        "Ein Kreis fuellt sein Rechteck nur zu 78 Prozent, und eine weisse Zahl "
        "darin nimmt weitere 10 bis 20 weg. Mit 0.75 fielen ausgerechnet die "
        "Abzeichen MIT Zahl durch - und die sagen ja, wie viel dort wartet. "
        "Gegen Endlosschleifen hilft seit 6dad0a7 die Schleifen-Bremse, dafuer "
        "muss der Fuellgrad nicht mehr herhalten.",
        lambda d: farbwert_setzen(d, "roter-punkt-pruefen", "min_fuellung", 0.75, 0.62),
    ),
    (
        "sammelknoepfe",
        "'Alles abholen' im Allianz-Geschenk und 'Allen helfen' in der "
        "Allianz-Hilfe messen beide 6,7 Prozent der Bildhoehe, die kleinen "
        "'Abholen' daneben nur 3,9. Mit max_h 0.06 fielen genau die beiden "
        "durch, die eine ganze Liste auf einmal erledigen.",
        lambda d: farbwert_setzen(d, "gruener-knopf-generisch", "max_h", 0.06, 0.08),
    ),
]


def pruefen() -> bool:
    """Konfiguration einlesen und validieren - wie `bot.py check`."""
    from laa.config import Config, ConfigError

    try:
        cfg = Config.load(KONFIG)
        probleme = cfg.validate()
    except ConfigError as exc:
        print(f"  Konfiguration kaputt: {exc}", file=sys.stderr)
        return False
    if probleme:
        for p in probleme:
            print(f"  {p}", file=sys.stderr)
        return False
    print(f"  Konfiguration lauffaehig: {len(cfg.rules)} Regeln, {len(cfg.tasks)} Aufgaben")
    return True


def hochladen(zusammenfassung: str) -> bool:
    def git(*rest):
        return subprocess.run(["git", "-C", HIER, *rest], capture_output=True, timeout=180)

    git("add", "--", KONFIG)
    botschaft = "Feinkorrekturen an der Konfiguration\n\n" + zusammenfassung
    ergebnis = git("commit", "-m", botschaft)
    if ergebnis.returncode != 0 and b"nothing to commit" not in ergebnis.stdout:
        print(ergebnis.stdout.decode("utf-8", "replace")[:400], file=sys.stderr)
        return False
    schub = git("push")
    if schub.returncode != 0:
        print("Hochladen fehlgeschlagen:",
              schub.stderr.decode("utf-8", "replace").strip()[:300], file=sys.stderr)
        print("Die Aenderung liegt lokal vor. Wichtig: sie blockiert den naechsten",
              file=sys.stderr)
        print("git pull des Bots, bis sie gepusht ist.", file=sys.stderr)
        return False
    return True


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--anwenden", action="store_true",
                   help="wirklich aendern, pruefen und committen")
    args = p.parse_args()

    with open(KONFIG, "r", encoding="utf-8") as fh:
        daten = json.load(fh)

    getan, offen = [], []
    for name, grund, wirkung in KORREKTUREN:
        geaendert, hinweis = wirkung(daten)
        if geaendert:
            getan.append((name, geaendert, grund))
            print(f"  aendert: {geaendert}")
        else:
            offen.append((name, hinweis))
            print(f"  laesst:  {hinweis}")

    if not getan:
        print("\nNichts zu tun - alles steht schon richtig.")
        return 0

    if not args.anwenden:
        print(f"\n{len(getan)} Korrektur(en) waeren faellig."
              "\nUebernehmen mit:  python feinschliff.py --anwenden")
        return 0

    with open(KONFIG, "w", encoding="utf-8") as fh:
        json.dump(daten, fh, ensure_ascii=False, indent=2)
    print("\nGeschrieben. Pruefe ...")
    if not pruefen():
        print("\nDie Pruefung ist fehlgeschlagen. Zuruecknehmen mit:", file=sys.stderr)
        print("    git checkout -- config/last-asylum.json", file=sys.stderr)
        return 1

    zusammenfassung = "\n\n".join(f"{g}\n{grund}" for _n, g, grund in getan)
    if hochladen(zusammenfassung):
        print("\nHochgeladen. Der Bot holt es sich beim naechsten Durchgang selbst.")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
