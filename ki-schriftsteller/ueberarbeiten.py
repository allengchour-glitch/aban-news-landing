#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - ueberarbeitet ein bereits geschriebenes Kapitel mit Claude.

Statt ein Kapitel von Grund auf zu schreiben (siehe schreibe_roman.py), nimmt
dieses CLI ein VORHANDENES Kapitel und ueberarbeitet es anhand von Feedback -
zum Beispiel: "mehr Subtext im Dialog", "Ende straffen", "die Aschefelder
sinnlicher schildern". Das Ergebnis bleibt kontinuitaets- und stiltreu.

Architektur (analog zu schreibe_roman.py):
  - Modell: claude-opus-4-8 (Prosa), adaptives Denken, Streaming.
  - Prompt-Caching: Es wird DIESELBE Plot-Bibel wie beim Schreiben verwendet
    (baue_plotbibel aus schreibe_roman). Sie ist der STABILE System-Praefix mit
    cache_control "ephemeral" - so bleibt der Cache mit dem Writer geteilt und
    der Ton konsistent. Das Variable (alter Text, Plan, Feedback) steht NACH dem
    Cache-Breakpoint in der User-Nachricht.
  - Sicherheit: Vor dem Ueberschreiben wird ein Backup kapitel-NN.bak.md angelegt.

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  # Feedback als Argument:
  python3 ueberarbeiten.py --kapitel 2 --feedback "Mehr Subtext in Renns Dialog."

  # Feedback ueber stdin (z. B. aus einer Datei):
  python3 ueberarbeiten.py --kapitel 2 < feedback.txt

  # Mit Ziellaenge und eigenem Roman/Ordner:
  python3 ueberarbeiten.py --kapitel 1 --ziel-woerter 1800 \
      --roman mein.json --out kapitel/ --feedback "Den Einstieg straffen."
"""
import argparse
import os
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

# Plot-Bibel und Roman-Loader aus dem Writer wiederverwenden - eine Quelle der
# Wahrheit, damit Ueberarbeitung und Erstschrift denselben Kontext teilen.
from schreibe_roman import lade_roman, baue_plotbibel
from roman_util import baende_aus_roman, ist_trilogie, kapitel_pfad

MODELL = "claude-opus-4-8"
HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Kapitel-Plan in der Bibel finden (Einzelbuch oder ein Trilogie-Band)
# ------------------------------------------------------------------
def finde_kapitel(roman, nummer, band_nr):
    """Liefert den Plan-Eintrag (ziel + beats) fuer die Kapitelnummer oder None.

    Bei Trilogien wird nur im angegebenen Band gesucht, damit gleiche
    Kapitelnummern in verschiedenen Baenden nicht kollidieren.
    """
    for b in baende_aus_roman(roman):
        if b["nummer"] != band_nr:
            continue
        for k in b["kapitel"]:
            if k["nummer"] == nummer:
                return k
    return None


# ------------------------------------------------------------------
# Ueberarbeitungs-Auftrag (der variable Teil, NACH dem Cache)
# ------------------------------------------------------------------
def baue_ueberarbeitungs_auftrag(kap, alter_text, feedback, ziel_woerter=None):
    z = []
    z.append("== AUFGABE: KAPITEL UEBERARBEITEN ==")
    z.append("Du ueberarbeitest ein bereits geschriebenes Kapitel. Behalte die "
             "Kontinuitaet, die Erzaehlperspektive, den Ton und die "
             "Figurenstimmen exakt bei. Aendere nur, was das Feedback verlangt - "
             "und was noetig ist, damit das Kapitel danach in sich stimmig bleibt.")
    z.append("")
    z.append("== KAPITELPLAN (verbindlich, nicht aus den Augen verlieren) ==")
    z.append("Kapitel %d - %s" % (kap["nummer"], kap["titel"]))
    z.append("Ziel dieses Kapitels: " + kap["ziel"])
    z.append("Geplante Beats:")
    for i, beat in enumerate(kap["beats"], 1):
        z.append("  %d. %s" % (i, beat))
    z.append("")
    z.append("== AKTUELLER KAPITELTEXT (zu ueberarbeiten) ==")
    z.append(alter_text)
    z.append("")
    z.append("== UEBERARBEITUNGS-FEEDBACK ==")
    z.append(feedback)
    z.append("")
    z.append("== AUSGABE ==")
    hinweis = ("Gib das VOLLSTAENDIG ueberarbeitete Kapitel als fertige Prosa "
               "zurueck. Beginne mit der Zeile 'Kapitel %d - %s' und dann der "
               "Prosa. Schreibe ausschliesslich den Romantext - keine "
               "Vorbemerkung, keine Erklaerung, was du geaendert hast, keine "
               "Meta-Kommentare." % (kap["nummer"], kap["titel"]))
    if ziel_woerter:
        hinweis += " Ziellaenge: etwa %d Woerter." % ziel_woerter
    z.append(hinweis)
    return "\n".join(z)


# ------------------------------------------------------------------
# Ein Kapitel ueberarbeiten (Streaming + Prompt-Caching)
# ------------------------------------------------------------------
def ueberarbeite_kapitel(client, plotbibel, kap, alter_text, feedback, ziel_woerter=None):
    auftrag = baue_ueberarbeitungs_auftrag(kap, alter_text, feedback, ziel_woerter)
    teile = []
    # Plot-Bibel als System-Block mit cache_control -> stabiler Praefix, der mit
    # dem Writer geteilt wird (gleicher Text -> Cache-Treffer, ~0.1x Kosten).
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
    p = argparse.ArgumentParser(
        description="KI-Schriftsteller: ein vorhandenes Kapitel anhand von Feedback ueberarbeiten.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    p.add_argument("--out", default=os.path.join(HIER, "kapitel"),
                   help="Ordner mit den Kapiteldateien (Default: kapitel/)")
    p.add_argument("--band", type=int, default=None,
                   help="Bei Trilogie: Band des Kapitels (Nummer)")
    p.add_argument("--kapitel", type=int, required=True,
                   help="Welches Kapitel ueberarbeitet werden soll (Nummer)")
    p.add_argument("--feedback", default=None,
                   help="Ueberarbeitungs-Anweisungen. Fehlt das Argument, wird von stdin gelesen.")
    p.add_argument("--ziel-woerter", dest="ziel_woerter", type=int, default=None,
                   help="Optionale Ziellaenge des ueberarbeiteten Kapitels in Woertern.")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")

    # Feedback besorgen: Argument hat Vorrang, sonst von stdin lesen.
    feedback = args.feedback
    if feedback is None:
        if sys.stdin.isatty():
            sys.exit("! Kein Feedback. Nutze --feedback \"...\" oder leite Text ueber stdin ein.")
        feedback = sys.stdin.read()
    feedback = feedback.strip()
    if not feedback:
        sys.exit("! Das Feedback ist leer. Bitte gib Ueberarbeitungs-Anweisungen an.")

    roman = lade_roman(args.roman)
    plotbibel = baue_plotbibel(roman)

    einzelbuch = not ist_trilogie(roman)
    if not einzelbuch and args.band is None:
        sys.exit("! Diese Bibel ist eine Trilogie. Gib mit --band N den Band an.")
    band_nr = 1 if einzelbuch else args.band

    kap = finde_kapitel(roman, args.kapitel, band_nr)
    if kap is None:
        sys.exit("! Kapitel %d steht nicht im Plan (%s)." % (args.kapitel, args.roman))

    pfad = kapitel_pfad(args.out, band_nr, args.kapitel, einzelbuch)
    if not os.path.exists(pfad):
        sys.exit("! Kapiteldatei fehlt: %s\n  Schreibe es zuerst mit:  "
                 "python3 schreibe_roman.py --kapitel %d" % (pfad, args.kapitel))

    with open(pfad, "r", encoding="utf-8") as f:
        alter_text = f.read().strip()
    if not alter_text:
        sys.exit("! Die Kapiteldatei ist leer: %s" % pfad)

    client = anthropic.Anthropic()

    print("== %s ==" % roman["titel"])
    print("Ueberarbeite Kapitel %d: %s" % (kap["nummer"], kap["titel"]))
    print("Modell: %s | Quelle: %s\n" % (MODELL, pfad))

    text, cache_info = ueberarbeite_kapitel(
        client, plotbibel, kap, alter_text, feedback, args.ziel_woerter)

    # Erst Backup, dann ueberschreiben - so geht die alte Fassung nie verloren.
    backup = kapitel_pfad(args.out, band_nr, args.kapitel, einzelbuch, suffix="bak.md")
    with open(backup, "w", encoding="utf-8") as f:
        f.write(alter_text + "\n")
    with open(pfad, "w", encoding="utf-8") as f:
        f.write(text + "\n")

    woerter = len(text.split())
    print("\n[OK] %s (%d Woerter) | %s" % (pfad, woerter, cache_info))
    print("[Backup] Alte Fassung gesichert in: %s" % backup)


if __name__ == "__main__":
    main()
