#!/usr/bin/env python3
"""Fällige Feinkorrekturen an der Konfiguration - geprüft und committet.

Warum es dieses Werkzeug gibt: `config/last-asylum.json` ist rund 180 KB
gross. Über eine Schnittstelle lässt sich so eine Datei nur vollständig
ersetzen - und ein Übertragungsfehler dabei legt den ganzen Bot lahm. Von
Hand ändern geht zwar, blockiert aber den nächsten `git pull` des Bots
("local changes would be overwritten"), und dann bekommt er nie wieder eine
neue Fassung.

Dieses Skript ändert einzelne Werte, prüft die Konfiguration danach wie
`bot.py check` und schiebt sie ins Repository. Damit bleibt alles in einer
Linie, egal wer die Änderung angestossen hat.

    python feinschliff.py            # zeigt, was sich ändern würde
    python feinschliff.py --anwenden # ändert, prüft und committet

Jede Korrektur greift nur, wenn der aktuelle Wert der erwartete ist. Wurde
schon geändert, wird sie übersprungen - das Skript lässt sich gefahrlos
mehrfach ausführen, und erledigte Einträge dürfen stehenbleiben.

Neue Korrektur eintragen: einen Eintrag an KORREKTUREN anhängen. Die
Bausteine darunter decken ab, was bisher gebraucht wurde - Werte in Regeln
und Aufgaben setzen, Aufgaben ein- und ausschalten.
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


# ------------------------------------------------------------------ Bausteine
def _finde(daten: dict, gruppe: str, name: str) -> dict:
    for eintrag in daten.get(gruppe, []):
        if eintrag.get("name") == name:
            return eintrag
    raise SystemExit(f"'{name}' steht nicht unter {gruppe} in der Konfiguration.")


def _tiefe(wurzel: dict, pfad: str):
    """Zum vorletzten Glied laufen; gibt (Behälter, letzter Schlüssel) zurück."""
    teile = pfad.split(".")
    stelle = wurzel
    for glied in teile[:-1]:
        if glied not in stelle:
            raise SystemExit(f"Pfad '{pfad}' fehlt bei '{glied}'.")
        stelle = stelle[glied]
    return stelle, teile[-1]


def setze(gruppe: str, name: str, pfad: str, alt, neu):
    """Wert in einer Regel oder Aufgabe setzen - nur wenn er noch `alt` ist.

    `pfad` ist mit Punkten geschrieben, z. B. "match.farbknopf.min_fuellung".
    Der Zugriff läuft immer über den Namen, damit gleichnamige Felder anderer
    Regeln unberührt bleiben - `max_h` etwa kommt an vier Stellen vor.
    """
    def wirkung(daten):
        behaelter, schluessel = _tiefe(_finde(daten, gruppe, name), pfad)
        jetzt = behaelter.get(schluessel)
        if jetzt == neu:
            return None, f"{name}.{pfad} steht schon auf {neu}"
        if jetzt != alt:
            return None, f"{name}.{pfad} ist {jetzt}, erwartet war {alt} - nicht angefasst"
        behaelter[schluessel] = neu
        return f"{name}.{pfad}: {alt} -> {neu}", None
    return wirkung


def schalte(name: str, an: bool):
    """Eine Aufgabe ein- oder ausschalten."""
    def wirkung(daten):
        aufgabe = _finde(daten, "tasks", name)
        jetzt = aufgabe.get("enabled", True)
        if jetzt == an:
            return None, f"Aufgabe {name} ist schon {'an' if an else 'aus'}"
        aufgabe["enabled"] = an
        return f"Aufgabe {name}: {'aus -> an' if an else 'an -> aus'}", None
    return wirkung


# ----------------------------------------------------------------- Korrekturen
# (Kurzname, Begruendung, Wirkung)
KORREKTUREN = [
    (
        "rote-abzeichen",
        "Ein Kreis fuellt sein umschliessendes Rechteck nur zu 78 Prozent, und "
        "eine weisse Zahl darin nimmt weitere 10 bis 20 weg. Mit 0.75 fielen "
        "ausgerechnet die Abzeichen MIT Zahl durch - und die sagen ja, wie viel "
        "dort wartet. Gegen Endlosschleifen hilft seit 6dad0a7 die "
        "Schleifen-Bremse, dafuer muss der Fuellgrad nicht mehr herhalten.",
        setze("rules", "roter-punkt-pruefen",
              "match.farbknopf.min_fuellung", 0.75, 0.62),
    ),
    (
        "sammelknoepfe",
        "'Alles abholen' im Allianz-Geschenk und 'Allen helfen' in der "
        "Allianz-Hilfe messen beide 6,7 Prozent der Bildhoehe, die kleinen "
        "'Abholen' daneben nur 3,9. Mit max_h 0.06 fielen genau die beiden "
        "durch, die eine ganze Liste auf einmal erledigen.",
        setze("rules", "gruener-knopf-generisch", "match.farbknopf.max_h", 0.06, 0.08),
    ),
    (
        "blasen-fehltreffer",
        "Im Lauf vom 01.08. griff blasen-einsammeln-ohne-vorlage im "
        "Minutentakt, immer mit 0.60, und meldete jedes Mal 'Eingesammelt: 6 "
        "Stueck' - sechs Stellen, die nach dem Antippen nicht verschwinden. Das "
        "ist feste Bedienung mit demselben hellen Ring, nicht Ertrag. Eine "
        "Blase ist ein ausgefuellter Kreis und kommt auf rund 0.78; die "
        "Fehltreffer lagen samt und sonders bei 0.59 bis 0.60. Mit 0.66 fallen "
        "sie heraus. Der Weg ueber die Vorlagen faengt das ohnehin ab - "
        "hud/bubble_holz hat sich im selben Lauf selbst vermessen (0.618 -> "
        "0.87) und sammelt seitdem sauber.",
        setze("rules", "blasen-einsammeln-ohne-vorlage",
              "match.farbknopf.min_fuellung", 0.45, 0.66),
    ),
]


# ---------------------------------------------------------------------- Ablauf
def pruefen() -> bool:
    from laa.config import Config, ConfigError

    try:
        cfg = Config.load(KONFIG)
        probleme = cfg.validate()
    except ConfigError as exc:
        print(f"  Konfiguration kaputt: {exc}", file=sys.stderr)
        return False
    except json.JSONDecodeError as exc:
        print(f"  JSON kaputt: {exc}", file=sys.stderr)
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
    ergebnis = git("commit", "-m", "Feinkorrekturen an der Konfiguration\n\n" + zusammenfassung)
    if ergebnis.returncode != 0 and b"nothing to commit" not in ergebnis.stdout:
        print(ergebnis.stdout.decode("utf-8", "replace")[:400], file=sys.stderr)
        return False
    schub = git("push")
    if schub.returncode != 0:
        print("Hochladen fehlgeschlagen:",
              schub.stderr.decode("utf-8", "replace").strip()[:300], file=sys.stderr)
        print("Die Aenderung liegt lokal vor - und blockiert den naechsten",
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

    getan = []
    for name, grund, wirkung in KORREKTUREN:
        geaendert, hinweis = wirkung(daten)
        if geaendert:
            getan.append((geaendert, grund))
            print(f"  aendert: {geaendert}")
        else:
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

    if hochladen("\n\n".join(f"{g}\n{grund}" for g, grund in getan)):
        print("\nHochgeladen. Der Bot holt es sich beim naechsten Durchgang selbst.")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
