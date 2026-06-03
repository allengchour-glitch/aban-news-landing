#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - schreibt einen Roman Kapitel fuer Kapitel mit Claude.

Liest eine Plot-Bibel (roman.json: Konzept, Welt, Figuren, Kapitelplan) und
generiert deutschen Fantasy-/Drama-Prosatext - ein Kapitel pro API-Aufruf.

Architektur:
  - Modell: claude-opus-4-8 (Prosa), adaptives Denken, Streaming (lange Kapitel).
  - Prompt-Caching: Die Plot-Bibel ist der STABILE Praefix (System-Prompt) und
    wird mit cache_control gecacht. Jeder Kapitel-Aufruf liest sie aus dem Cache
    (~0.1x Kosten) statt sie neu zu bezahlen. Das Variable (welches Kapitel,
    Synopse der bisherigen Kapitel) steht NACH dem Cache-Breakpoint.
  - Kontinuitaet: Bereits geschriebene Kapitel werden als kurze Synopsis
    mitgegeben, damit Figuren und Handlung konsistent bleiben, ohne die volle
    Prosa erneut zu bezahlen.

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  python3 schreibe_roman.py                 # alle Kapitel schreiben
  python3 schreibe_roman.py --kapitel 2     # nur Kapitel 2
  python3 schreibe_roman.py --roman mein.json --out kapitel/
  python3 schreibe_roman.py --neu           # vorhandene Kapitel ueberschreiben
"""
import argparse
import os
import re
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

# Gemeinsame Helfer (eine Quelle der Wahrheit). lade_roman wird hierueber auch
# fuer lektor.py / ueberarbeiten.py verfuegbar, die es aus schreibe_roman importieren.
from roman_util import lade_roman, baende_aus_roman, ist_trilogie, kapitel_pfad

MODELL = "claude-opus-4-8"
HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Plot-Bibel in einen stabilen System-Prompt giessen
# ------------------------------------------------------------------
def baue_plotbibel(roman):
    """Rendert die statische Plot-Bibel als deterministischen Text.

    WICHTIG fuers Caching: Dieser Text muss bei jedem Kapitel BYTE-IDENTISCH
    sein. Darum keine Zeitstempel, keine Zufalls-IDs, sortierte Ausgabe.
    """
    z = []
    z.append("Du bist ein preisgekroenter Romanautor und schreibst einen "
             "zusammenhaengenden Roman auf literarischem Niveau.")
    z.append("")
    z.append("== ECKDATEN ==")
    z.append("Titel: %s" % roman["titel"])
    z.append("Genre: %s" % roman["genre"])
    z.append("Sprache: %s" % roman["sprache"])
    z.append("Erzaehlperspektive: %s" % roman["erzaehlperspektive"])
    z.append("")
    z.append("== PRAEMISSE ==")
    z.append(roman["praemisse"])
    z.append("")
    z.append("== TON ==")
    z.append(roman["ton"])
    z.append("")
    z.append("== STILREGELN ==")
    for regel in roman["stilregeln"]:
        z.append("- " + regel)
    z.append("")
    welt = roman["welt"]
    z.append("== WELT: %s ==" % welt["name"])
    z.append("Magiesystem: " + welt["regeln_der_magie"])
    z.append("Zentraler Konflikt: " + welt["konflikt"])
    z.append("Orte:")
    for ort in welt["orte"]:
        z.append("  - " + ort)
    z.append("")
    z.append("== FIGUREN ==")
    for f in roman["figuren"]:
        z.append("%s (%s, %d Jahre) - %s" % (f["name"], f["rolle"], f["alter"], f["beschreibung"]))
        z.append("  Wunsch: %s" % f["wunsch"])
        z.append("  Geheimnis (nur dir bekannt, nicht ausplaudern): %s" % f["geheimnis"])
        z.append("  Stimme: %s" % f["stimme"])
    z.append("")
    # Trilogie: der Gesamtbogen ueber alle Baende gehoert in den stabilen
    # System-Praefix (er aendert sich pro Kapitel nicht -> Cache bleibt warm).
    # Bei Einzelbuechern bleibt dieser Block aus -> Prompt byte-identisch zu vorher.
    if ist_trilogie(roman):
        baende = baende_aus_roman(roman)
        z.append("== BAENDE (TRILOGIE, Gesamtbogen) ==")
        z.append("Dieser Roman erscheint in %d Baenden. Du schreibst einen "
                 "zusammenhaengenden Bogen ueber alle Baende - Figuren, Motive "
                 "und offene Faeden tragen weiter." % len(baende))
        for b in baende:
            zeile = "Band %d: %s" % (b["nummer"], b["titel"])
            if b.get("untertitel"):
                zeile += " - " + b["untertitel"]
            z.append(zeile)
        z.append("")
    z.append("== AUFTRAG ==")
    z.append("Schreibe jeweils EIN vollstaendiges Kapitel als fertige Prosa. "
             "Halte dich an Perspektive, Ton und Stilregeln. Nutze die "
             "Figurenstimmen konsequent. Erfinde keine neuen Hauptfiguren ohne "
             "Not. Schreibe ausschliesslich den Romantext - keine Vorbemerkung, "
             "keine Meta-Kommentare, keine Ueberschrift ausser dem Kapiteltitel.")
    return "\n".join(z)


# ------------------------------------------------------------------
# Kapitel-spezifischer Auftrag (der variable Teil, NACH dem Cache)
# ------------------------------------------------------------------
def baue_kapitel_auftrag(kap, synopsen, band=None):
    z = []
    if synopsen:
        z.append("== WAS BISHER GESCHAH (zur Kontinuitaet) ==")
        for label, syn in synopsen:
            z.append("%s: %s" % (label, syn))
        z.append("")
    # Bei Mehrband-Romanen den aktuellen Band benennen, damit Claude weiss,
    # an welcher Stelle des Gesamtbogens es schreibt.
    if band is not None:
        bandzeile = "Band %d - %s" % (band["nummer"], band["titel"])
        if band.get("untertitel"):
            bandzeile += " (%s)" % band["untertitel"]
        z.append("== AKTUELLER BAND ==")
        z.append(bandzeile)
        z.append("")
    z.append("== SCHREIBE JETZT: KAPITEL %d - %s ==" % (kap["nummer"], kap["titel"]))
    z.append("Ziel dieses Kapitels: " + kap["ziel"])
    z.append("Erzaehle diese Beats in dieser Reihenfolge, organisch verwoben:")
    for i, beat in enumerate(kap["beats"], 1):
        z.append("  %d. %s" % (i, beat))
    z.append("")
    z.append("Beginne mit der Zeile 'Kapitel %d - %s' und dann die Prosa. "
             "Ziellaenge: 1200-2000 Woerter. Ende mit der vorgesehenen "
             "Spannung." % (kap["nummer"], kap["titel"]))
    return "\n".join(z)


def kurz_synopse(text, max_woerter=70):
    """Erste Saetze eines Kapitels als grobe Synopse (lokal, ohne API)."""
    sauber = re.sub(r"\s+", " ", text).strip()
    worte = sauber.split(" ")
    if len(worte) <= max_woerter:
        return sauber
    return " ".join(worte[:max_woerter]) + " [...]"


# ------------------------------------------------------------------
# Ein Kapitel schreiben (Streaming + Prompt-Caching)
# ------------------------------------------------------------------
def schreibe_kapitel(client, plotbibel, kap, synopsen, band=None):
    auftrag = baue_kapitel_auftrag(kap, synopsen, band)
    teile = []
    # Plot-Bibel als System-Block mit cache_control -> stabiler Praefix,
    # wird ab dem 2. Kapitel aus dem Cache gelesen.
    with client.messages.stream(
        model=MODELL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        system=[{
            "type": "text",
            "text": plotbibel,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": auftrag}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            teile.append(text)
        final = stream.get_final_message()
    print()
    u = final.usage
    cache_info = "cache_read=%s, cache_write=%s, input=%s, output=%s" % (
        getattr(u, "cache_read_input_tokens", 0),
        getattr(u, "cache_creation_input_tokens", 0),
        u.input_tokens, u.output_tokens,
    )
    return "".join(teile).strip(), cache_info


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="KI-Schriftsteller: Roman Kapitel fuer Kapitel.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    p.add_argument("--out", default=os.path.join(HIER, "kapitel"),
                   help="Ausgabeordner fuer die Kapitel (Default: kapitel/)")
    p.add_argument("--band", type=int, default=None,
                   help="Nur diesen Band schreiben (Trilogie; Nummer)")
    p.add_argument("--kapitel", type=int, default=None,
                   help="Nur dieses eine Kapitel schreiben (Nummer; bei Trilogie "
                        "innerhalb von --band)")
    p.add_argument("--neu", action="store_true",
                   help="Vorhandene Kapiteldateien ueberschreiben")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")

    roman = lade_roman(args.roman)
    plotbibel = baue_plotbibel(roman)
    os.makedirs(args.out, exist_ok=True)
    client = anthropic.Anthropic()

    # Normalisieren: Einzelbuch -> ein Band, Trilogie -> deklarierte Baende.
    baende = baende_aus_roman(roman)
    einzelbuch = not ist_trilogie(roman)

    if args.band is not None:
        if einzelbuch:
            sys.exit("! --band gilt nur fuer Mehrband-Romane (baende). "
                     "Diese Bibel ist ein Einzelbuch.")
        if not any(b["nummer"] == args.band for b in baende):
            sys.exit("! Band %d steht nicht in der Bibel." % args.band)

    # Flache Arbeitsliste in Erzaehlreihenfolge: (band, kapitel). So bleibt die
    # Kontinuitaet ueber Bandgrenzen hinweg konsistent (frueherer Band -> spaeter).
    plan = [(b, k) for b in baende for k in b["kapitel"]]

    def label(b, k):
        return ("Band %d, Kapitel %d" % (b["nummer"], k["nummer"])
                if not einzelbuch else "Kapitel %d" % k["nummer"])

    def soll_schreiben(b, k):
        if args.band is not None and b["nummer"] != args.band:
            return False
        if args.kapitel is not None and k["nummer"] != args.kapitel:
            return False
        return True

    ziele = [(b, k) for (b, k) in plan if soll_schreiben(b, k)]
    if not ziele:
        sys.exit("! Auswahl trifft kein Kapitel (pruefe --band / --kapitel).")

    print("== %s ==" % roman["titel"])
    print("Modell: %s | zu schreiben: %s\n" %
          (MODELL, ", ".join(label(b, k) for (b, k) in ziele)))

    # Ein einziger geordneter Durchlauf: vorhandene Kapitel liefern Synopsen fuer
    # spaetere; Ziel-Kapitel werden geschrieben und ebenfalls als Synopse angehaengt.
    synopsen = []
    for b, k in plan:
        pfad = kapitel_pfad(args.out, b["nummer"], k["nummer"], einzelbuch)

        if not soll_schreiben(b, k):
            # Nicht ausgewaehlt: vorhandenen Text nur als Kontinuitaets-Synopse nutzen.
            if os.path.exists(pfad):
                with open(pfad, "r", encoding="utf-8") as f:
                    synopsen.append((label(b, k), kurz_synopse(f.read())))
            continue

        if os.path.exists(pfad) and not args.neu and args.kapitel is None:
            print("= %s existiert schon, ueberspringe (--neu zum Ueberschreiben).\n"
                  % label(b, k))
            with open(pfad, "r", encoding="utf-8") as f:
                synopsen.append((label(b, k), kurz_synopse(f.read())))
            continue

        print("----- %s: %s -----" % (label(b, k), k["titel"]))
        band = None if einzelbuch else b
        text, cache_info = schreibe_kapitel(client, plotbibel, k, synopsen, band)
        os.makedirs(os.path.dirname(pfad), exist_ok=True)
        with open(pfad, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        woerter = len(text.split())
        print("\n[OK] %s (%d Woerter) | %s\n" % (pfad, woerter, cache_info))
        synopsen.append((label(b, k), kurz_synopse(text)))

    print("Fertig. Kapitel liegen in: %s" % args.out)


if __name__ == "__main__":
    main()
