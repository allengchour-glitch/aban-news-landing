#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - plant neue Kapitel-Outlines mit Claude.

Erweitert eine bestehende Plot-Bibel (roman.json) um zusaetzliche
Kapitel-Eintraege. Statt jeden Kapitelplan von Hand zu schreiben, nutzt
dieses Werkzeug Claude, um aus Praemisse, Ton, Welt und Figuren passende
neue Kapitel (Nummer, Titel, Ziel, Beats) zu entwerfen, die sich an die
bereits geplanten Kapitel anschliessen und einen Spannungsbogen aufbauen.

Architektur:
  - Modell: claude-opus-4-8, adaptives Denken.
  - Structured Outputs: Das Ergebnis ist garantiert gueltiges JSON nach dem
    kapitel-Schema (output_config={"format": {"type": "json_schema", ...}}).
    Darum kann der erste Textblock direkt mit json.loads geparst werden.
  - Kontext: Die gesamte Plot-Bibel inklusive bereits vorhandener Kapitel
    geht in den System-Prompt, damit die neuen Kapitel inhaltlich passen.

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  python3 plane_kapitel.py                       # 5 neue Kapitel vorschlagen (nur anzeigen)
  python3 plane_kapitel.py --anzahl 3            # 3 neue Kapitel
  python3 plane_kapitel.py --ab 10               # ab Kapitel 10 nummerieren
  python3 plane_kapitel.py --schreiben           # neue Kapitel in roman.json schreiben
  python3 plane_kapitel.py --roman mein.json --anzahl 4 --schreiben
"""
import argparse
import json
import os
import shutil
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

from roman_util import lade_roman, ist_trilogie

MODELL = "claude-opus-4-8"
HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Ziel-Kapitelliste bestimmen (Einzelbuch: top-level; Trilogie: ein Band)
# ------------------------------------------------------------------
def finde_band(roman, band_nr):
    """Liefert den baende-Eintrag mit dieser Nummer oder None."""
    for b in roman.get("baende", []):
        if b.get("nummer") == band_nr:
            return b
    return None


# ------------------------------------------------------------------
# JSON-Schema fuer die strukturierte Ausgabe (kapitel-Schema)
# ------------------------------------------------------------------
# Beschreibt ein Objekt {"kapitel": [ {nummer, titel, ziel, beats[]} ]}.
# additionalProperties:false und required erzwingen exakt die Felder, die
# auch roman.json verwendet - so passt das Resultat 1:1 ins kapitel-Array.
SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["kapitel"],
    "properties": {
        "kapitel": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["nummer", "titel", "ziel", "beats"],
                "properties": {
                    "nummer": {"type": "integer"},
                    "titel": {"type": "string"},
                    "ziel": {"type": "string"},
                    "beats": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
            },
        }
    },
}


# ------------------------------------------------------------------
# System-Prompt aus der Plot-Bibel bauen
# ------------------------------------------------------------------
def baue_system_prompt(roman):
    """Rendert Praemisse, Ton, Welt und Figuren als Kontext fuer die Planung."""
    z = []
    z.append("Du bist ein erfahrener Romandramaturg und planst die Kapitel "
             "eines zusammenhaengenden Romans auf literarischem Niveau.")
    z.append("")
    z.append("== ECKDATEN ==")
    z.append("Titel: %s" % roman.get("titel", ""))
    z.append("Genre: %s" % roman.get("genre", ""))
    z.append("Sprache: %s" % roman.get("sprache", "Deutsch"))
    z.append("Erzaehlperspektive: %s" % roman.get("erzaehlperspektive", ""))
    z.append("")
    z.append("== PRAEMISSE ==")
    z.append(roman.get("praemisse", ""))
    z.append("")
    z.append("== TON ==")
    z.append(roman.get("ton", ""))
    z.append("")
    if roman.get("stilregeln"):
        z.append("== STILREGELN ==")
        for regel in roman["stilregeln"]:
            z.append("- " + regel)
        z.append("")
    welt = roman.get("welt", {})
    if welt:
        z.append("== WELT: %s ==" % welt.get("name", ""))
        if welt.get("regeln_der_magie"):
            z.append("Magiesystem: " + welt["regeln_der_magie"])
        if welt.get("konflikt"):
            z.append("Zentraler Konflikt: " + welt["konflikt"])
        if welt.get("orte"):
            z.append("Orte:")
            for ort in welt["orte"]:
                z.append("  - " + ort)
        z.append("")
    if roman.get("figuren"):
        z.append("== FIGUREN ==")
        for f in roman["figuren"]:
            z.append("%s (%s, %s Jahre) - %s" % (
                f.get("name", ""), f.get("rolle", ""),
                f.get("alter", "?"), f.get("beschreibung", "")))
            if f.get("wunsch"):
                z.append("  Wunsch: %s" % f["wunsch"])
            if f.get("geheimnis"):
                z.append("  Geheimnis (treibt den Plot, behutsam enthuellen): %s" % f["geheimnis"])
            if f.get("stimme"):
                z.append("  Stimme: %s" % f["stimme"])
        z.append("")
    z.append("== AUFTRAG ==")
    z.append("Entwirf neue Kapitel-Outlines, die nahtlos an den bisherigen "
             "Plan anschliessen. Jedes Kapitel braucht: eine fortlaufende "
             "Nummer, einen praegnanten Titel, ein klares dramaturgisches "
             "Ziel und 4-5 KONKRETE Beats (konkrete Handlungsschritte, keine "
             "vagen Absichtserklaerungen). Baue einen Spannungsbogen ueber die "
             "Kapitel hinweg: steigere den Einsatz, vertiefe Figuren und ihre "
             "Geheimnisse, fuehre auf eine Zuspitzung zu. Bleibe konsequent in "
             "Welt, Ton und Figurenstimmen. Schreibe in der du-Form, "
             "sachlich-praezise, ohne Werbe- oder Hype-Floskeln.")
    return "\n".join(z)


# ------------------------------------------------------------------
# Bereits vorhandene Kapitel als Kontext fuer die Fortsetzung
# ------------------------------------------------------------------
def baue_user_prompt(vorhandene, anzahl, ab_nummer):
    """Beschreibt den vorhandenen Kapitelplan und den konkreten Planungsauftrag."""
    z = []
    if vorhandene:
        z.append("== BISHERIGER KAPITELPLAN ==")
        for k in vorhandene:
            z.append("Kapitel %s - %s" % (k.get("nummer", "?"), k.get("titel", "")))
            z.append("  Ziel: %s" % k.get("ziel", ""))
            for beat in k.get("beats", []):
                z.append("  - " + beat)
        z.append("")
    else:
        z.append("== BISHERIGER KAPITELPLAN ==")
        z.append("(noch keine Kapitel geplant)")
        z.append("")

    letzte = ab_nummer + anzahl - 1
    z.append("== PLANE JETZT ==")
    z.append("Entwirf %d NEUE Kapitel mit den fortlaufenden Nummern %d bis %d."
             % (anzahl, ab_nummer, letzte))
    z.append("Sie muessen logisch an das bisher Geplante anschliessen und den "
             "Bogen weiterspinnen - keine Wiederholung bereits abgehandelter "
             "Beats.")
    z.append("Gib ausschliesslich das geforderte JSON-Objekt zurueck.")
    return "\n".join(z)


# ------------------------------------------------------------------
# Kapitel von Claude planen lassen (Structured Outputs)
# ------------------------------------------------------------------
def plane_kapitel(client, system_prompt, user_prompt):
    """Ruft Claude auf und gibt die geparste Liste neuer Kapitel zurueck."""
    antwort = client.messages.create(
        model=MODELL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    # Bei Structured Outputs ist der erste Textblock garantiert gueltiges JSON.
    text = ""
    for block in antwort.content:
        if getattr(block, "type", None) == "text":
            text = block.text
            break
    daten = json.loads(text)
    return daten["kapitel"]


# ------------------------------------------------------------------
# Ausgabe / Speichern
# ------------------------------------------------------------------
def zeige_kapitel(kapitel):
    """Druckt die geplanten Kapitel lesbar in die Konsole."""
    for k in kapitel:
        print("----- Kapitel %s: %s -----" % (k["nummer"], k["titel"]))
        print("Ziel: %s" % k["ziel"])
        for beat in k["beats"]:
            print("  - " + beat)
        print()


def schreibe_zurueck(pfad, roman, zielliste, neue_kapitel):
    """Sichert die Bibel (.bak) und haengt die neuen Kapitel an die Zielliste.

    zielliste ist das konkrete kapitel-Array (Einzelbuch: roman["kapitel"],
    Trilogie: das kapitel-Array des gewaehlten Bandes) - eine Referenz, die im
    roman-dict haengt, sodass das Dump die Ergaenzung enthaelt.
    """
    backup = pfad + ".bak"
    shutil.copyfile(pfad, backup)
    print("Backup angelegt: %s" % backup)
    zielliste.extend(neue_kapitel)
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(roman, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("%d neue Kapitel in %s geschrieben." % (len(neue_kapitel), pfad))


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(
        description="KI-Schriftsteller: neue Kapitel-Outlines aus der Idee planen.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    p.add_argument("--band", type=int, default=None,
                   help="Bei Trilogie: in welchen Band die neuen Kapitel geplant werden (Nummer)")
    p.add_argument("--anzahl", type=int, default=5,
                   help="Wie viele NEUE Kapitel generiert werden sollen (Default: 5)")
    p.add_argument("--ab", type=int, default=None,
                   help="Startnummer der neuen Kapitel "
                        "(Default: schliesst an vorhandene Kapitel an)")
    p.add_argument("--schreiben", action="store_true",
                   help="Neue Kapitel in das kapitel-Array von roman.json schreiben "
                        "(legt vorher roman.json.bak an)")
    args = p.parse_args()

    if args.anzahl < 1:
        sys.exit("! --anzahl muss mindestens 1 sein.")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")

    roman = lade_roman(args.roman)

    # Zielliste bestimmen: Einzelbuch -> roman["kapitel"]; Trilogie -> ein Band.
    if ist_trilogie(roman):
        if args.band is None:
            sys.exit("! Diese Bibel ist eine Trilogie. Waehle mit --band N, in "
                     "welchen Band geplant werden soll.")
        band = finde_band(roman, args.band)
        if band is None:
            sys.exit("! Band %d steht nicht in der Bibel." % args.band)
        zielliste = band.setdefault("kapitel", [])
        kontext = "Band %d - %s" % (band.get("nummer"), band.get("titel", ""))
    else:
        if args.band is not None:
            sys.exit("! --band gilt nur fuer Trilogien. Diese Bibel ist ein Einzelbuch.")
        zielliste = roman.setdefault("kapitel", [])
        kontext = roman.get("titel", "Roman")

    # Startnummer bestimmen: an vorhandene Kapitel anschliessen, falls nicht gesetzt.
    if args.ab is not None:
        ab_nummer = args.ab
    elif zielliste:
        ab_nummer = max(k.get("nummer", 0) for k in zielliste) + 1
    else:
        ab_nummer = 1

    system_prompt = baue_system_prompt(roman)
    user_prompt = baue_user_prompt(zielliste, args.anzahl, ab_nummer)

    print("== %s | %s ==" % (roman.get("titel", "Roman"), kontext))
    print("Modell: %s | Plane %d neue Kapitel (ab Nr. %d)\n"
          % (MODELL, args.anzahl, ab_nummer))

    client = anthropic.Anthropic()
    neue_kapitel = plane_kapitel(client, system_prompt, user_prompt)

    zeige_kapitel(neue_kapitel)

    if args.schreiben:
        schreibe_zurueck(args.roman, roman, zielliste, neue_kapitel)
    else:
        print("(Nur Vorschau - mit --schreiben in die Bibel uebernehmen.)")


if __name__ == "__main__":
    main()
