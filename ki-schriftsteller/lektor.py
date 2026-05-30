#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Lektor - prueft ein geschriebenes Kapitel handwerklich mit Claude.

Anders als 'schreibe_roman.py' schreibt der Lektor NICHTS um. Er liest ein
fertiges Kapitel (kapitel/kapitel-NN.md) und liefert eine strukturierte,
konkrete Kritik, mit der die Autorin/der Autor das Kapitel selbst ueberarbeiten
kann.

Die Kritik deckt ab:
  1. Stimmen-Konsistenz pro Figur (haelt jede Figur ihre 'stimme'?)
  2. Einhaltung der Stilregeln und des Tons
  3. Show-vs-Tell-Stellen mit konkreten Zitaten aus dem Kapitel
  4. Tempo und Spannung
  5. Konkrete, nummerierte Verbesserungsvorschlaege

Architektur:
  - Modell: claude-opus-4-8, adaptives Denken, optionales Streaming.
  - Prompt-Caching: Dieselbe Plot-Bibel wie beim Schreiben (via baue_plotbibel)
    bildet den STABILEN System-Praefix mit cache_control. So kennt der Lektor
    Welt, Figuren und Stimmen - und teilt sich den Cache mit dem Schreiber.
  - Wiederverwendung: lade_roman() und baue_plotbibel() kommen unveraendert aus
    schreibe_roman.py.

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  python3 lektor.py --kapitel 1
  python3 lektor.py --kapitel 2 --roman mein.json --kapitel-dir kapitel/
"""
import argparse
import os
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

# Schreiber-Bausteine wiederverwenden: Plot-Bibel und JSON-Laden teilen sich
# beide Werkzeuge, damit der Lektor exakt dieselbe Welt-/Voice-Sicht hat.
from schreibe_roman import lade_roman, baue_plotbibel, MODELL

HIER = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------
# Lektor-Auftrag (der variable Teil, NACH dem Cache-Breakpoint)
# ------------------------------------------------------------------
def baue_lektorat_auftrag(roman, kap_nummer, kapiteltext):
    """Baut den konkreten Pruefauftrag fuer ein einzelnes Kapitel.

    Listet die Figuren mit ihrer Soll-Stimme und die Stilregeln noch einmal
    explizit auf - so kann der Lektor Punkt fuer Punkt dagegen pruefen und
    muss nicht aus dem System-Praefix raten.
    """
    z = []
    z.append("Du bist ein erfahrener, ehrlicher Lektor. Deine Aufgabe ist es, "
             "das folgende Kapitel handwerklich zu PRUEFEN - NICHT umzuschreiben. "
             "Liefere eine konkrete, belegte Kritik, mit der die Autorin das "
             "Kapitel selbst ueberarbeiten kann.")
    z.append("")
    z.append("WICHTIG:")
    z.append("- Schreibe das Kapitel NICHT neu und liefere KEINE Reinschrift.")
    z.append("- Belege jeden Befund mit einem WOERTLICHEN Zitat aus dem Kapitel "
             "(in Anfuehrungszeichen), damit der Bezug eindeutig ist.")
    z.append("- Sei konkret und nuechtern, keine pauschalen Floskeln, kein Lob "
             "ohne Beleg, keine Werbe- oder Hype-Sprache.")
    z.append("- Antworte auf Deutsch in sauberem Markdown.")
    z.append("")
    z.append("== ZU PRUEFENDE FIGUREN-STIMMEN (Soll) ==")
    for f in roman["figuren"]:
        z.append("- %s: %s" % (f["name"], f["stimme"]))
    z.append("")
    z.append("== ZU PRUEFENDE STILREGELN (Soll) ==")
    for regel in roman["stilregeln"]:
        z.append("- " + regel)
    z.append("")
    z.append("== ZU PRUEFENDER TON (Soll) ==")
    z.append(roman["ton"])
    z.append("")
    z.append("== ZU PRUEFENDES KAPITEL %d ==" % kap_nummer)
    z.append(kapiteltext)
    z.append("")
    z.append("== GIB DEINE KRITIK IN GENAU DIESER GLIEDERUNG AUS ==")
    z.append("# Lektorat: Kapitel %d" % kap_nummer)
    z.append("")
    z.append("## 1. Stimmen-Konsistenz pro Figur")
    z.append("Pruefe fuer JEDE oben gelistete Figur, die im Kapitel auftritt, ob "
             "ihre Dialoge und ihr Verhalten zur Soll-Stimme passen. Zitiere "
             "passende und unpassende Stellen woertlich.")
    z.append("")
    z.append("## 2. Stilregeln und Ton")
    z.append("Gehe die Stilregeln einzeln durch (eingehalten / verletzt) und "
             "belege Abweichungen mit Zitaten. Bewerte, ob der Ton getroffen ist.")
    z.append("")
    z.append("## 3. Show vs. Tell")
    z.append("Benenne konkrete Stellen, an denen Gefuehle/Zustaende benannt statt "
             "gezeigt werden. Zitiere die jeweilige Stelle woertlich und sage "
             "knapp, was gezeigt werden koennte.")
    z.append("")
    z.append("## 4. Tempo und Spannung")
    z.append("Wo zieht sich der Text, wo ist er gehetzt? Sitzt die "
             "Kapitel-Schlusswendung? Belege mit Zitaten.")
    z.append("")
    z.append("## 5. Konkrete Verbesserungsvorschlaege")
    z.append("Eine nummerierte Liste klarer, umsetzbarer Aenderungen - jeweils "
             "mit Bezug auf eine konkrete Stelle. Keine allgemeinen Ratschlaege.")
    return "\n".join(z)


# ------------------------------------------------------------------
# Lektorat erstellen (Prompt-Caching + adaptives Denken, Streaming)
# ------------------------------------------------------------------
def erstelle_lektorat(client, plotbibel, auftrag):
    """Ruft Claude auf und gibt das Lektorat als Markdown-String zurueck.

    Die Plot-Bibel ist der gecachte System-Praefix (kennt Welt + Stimmen),
    der Pruefauftrag samt Kapiteltext steht als User-Nachricht dahinter.
    """
    teile = []
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
        description="KI-Lektor: prueft ein geschriebenes Kapitel handwerklich (ohne es umzuschreiben).")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    # --out und --kapitel-dir meinen denselben Ordner; --out ist das Pendant
    # zum Schreiber, --kapitel-dir der sprechende Alias.
    p.add_argument("--out", "--kapitel-dir", dest="kapitel_dir",
                   default=os.path.join(HIER, "kapitel"),
                   help="Ordner mit den Kapitel-Dateien (Default: kapitel/)")
    p.add_argument("--kapitel", type=int, required=True,
                   help="Nummer des zu pruefenden Kapitels (Pflicht)")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")

    if not os.path.exists(args.roman):
        sys.exit("! Plot-Bibel nicht gefunden: %s" % args.roman)

    kap_pfad = os.path.join(args.kapitel_dir, "kapitel-%02d.md" % args.kapitel)
    if not os.path.exists(kap_pfad):
        sys.exit("! Kapitel %d nicht gefunden: %s\n"
                 "  (Erst schreiben mit:  python3 schreibe_roman.py --kapitel %d)"
                 % (args.kapitel, kap_pfad, args.kapitel))

    with open(kap_pfad, "r", encoding="utf-8") as f:
        kapiteltext = f.read().strip()
    if not kapiteltext:
        sys.exit("! Kapitel %d ist leer: %s" % (args.kapitel, kap_pfad))

    roman = lade_roman(args.roman)
    plotbibel = baue_plotbibel(roman)
    auftrag = baue_lektorat_auftrag(roman, args.kapitel, kapiteltext)
    client = anthropic.Anthropic()

    print("== Lektorat: %s, Kapitel %d ==" % (roman["titel"], args.kapitel))
    print("Modell: %s | Quelle: %s\n" % (MODELL, kap_pfad))

    lektorat, cache_info = erstelle_lektorat(client, plotbibel, auftrag)

    # Lektorat neben dem Kapitel ablegen: kapitel-NN.lektorat.md
    ziel = os.path.join(args.kapitel_dir, "kapitel-%02d.lektorat.md" % args.kapitel)
    with open(ziel, "w", encoding="utf-8") as f:
        f.write(lektorat + "\n")
    print("\n[OK] Lektorat gespeichert: %s | %s" % (ziel, cache_info))


if __name__ == "__main__":
    main()
