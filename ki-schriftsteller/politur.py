#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - autonome Qualitaetsschleife (Gutachten -> Ueberarbeitung).

Schliesst die Luecke zwischen lektor.py (kritisiert, schreibt nichts) und
ueberarbeiten.py (schreibt um, braucht aber Feedback von Hand). politur.py
verbindet beide zu einem geschlossenen Kreis und treibt ein Kapitel
selbsttaetig auf eine Qualitaetsschwelle:

  1. LOKALER VOR-FILTER (gratis): qualitaet.analysiere() misst handwerkliche
     Schwaechen ohne API. Ergebnisse fliessen ins Feedback ein.
  2. GUTACHTEN (API, Structured Outputs): Claude bewertet das Kapitel mit einem
     Score 0-100, listet blockierende Maengel und gibt EIN umsetzbares Feedback.
  3. SCHWELLE: Score >= --schwelle UND keine Blocker UND lokal sauber -> fertig.
  4. SONST UEBERARBEITEN: ueberarbeite_kapitel() schreibt das Kapitel mit dem
     gesammelten Feedback neu; danach zurueck zu Schritt 1 - bis die Schwelle
     erreicht ist oder --max-runden ausgeschoepft sind.

Architektur:
  - Reine Wiederverwendung: baue_plotbibel/lade_roman (schreibe_roman),
    ueberarbeite_kapitel/finde_kapitel (ueberarbeiten), analysiere (qualitaet),
    Pfad-/Band-Logik (roman_util). Kein dupliziertes Wissen.
  - Prompt-Caching: dieselbe Plot-Bibel als stabiler System-Praefix wie ueberall
    sonst -> der Cache bleibt warm ueber Schreiben, Lektorat, Politur hinweg.
  - Structured Outputs fuers Gutachten -> garantiert parsebares JSON.
  - Sicherheit: vor der ersten Ueberarbeitung wird die Original-Fassung als
    kapitel-NN.politur-orig.md gesichert.

Voraussetzung:
  pip install anthropic            (oder: pip install -r requirements.txt)
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  python3 politur.py --kapitel 1
  python3 politur.py --roman roman-drama-trilogie.json --band 1 --kapitel 3
  python3 politur.py --band 1                      # alle Kapitel von Band 1
  python3 politur.py --kapitel 1 --schwelle 90 --max-runden 4
  python3 politur.py --kapitel 1 --trocken         # nur bewerten, nicht umschreiben
"""
import argparse
import json
import os
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

# Bausteine aus den Geschwister-Werkzeugen - eine Quelle der Wahrheit.
from schreibe_roman import lade_roman, baue_plotbibel, MODELL
from ueberarbeiten import ueberarbeite_kapitel, finde_kapitel
from roman_util import baende_aus_roman, ist_trilogie, kapitel_pfad
from qualitaet import analysiere

HIER = os.path.dirname(os.path.abspath(__file__))

# Structured-Output-Schema des Gutachtens: erzwingt genau die Felder, die die
# Schleife auswertet (Score, Blocker, ein konsolidiertes Feedback).
GUTACHTEN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["score", "verdict", "blocker", "feedback"],
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "verdict": {"type": "string"},
        "blocker": {"type": "array", "items": {"type": "string"}},
        "feedback": {"type": "string"},
    },
}


# ------------------------------------------------------------------
# Gutachten-Auftrag (der variable Teil, NACH dem Cache-Breakpoint)
# ------------------------------------------------------------------
def baue_gutachten_auftrag(roman, kap, kapiteltext, lokale_befunde):
    """Strenger, belegpflichtiger Bewertungsauftrag fuer ein Kapitel."""
    z = []
    z.append("Du bist ein strenger Literaturlektor. Bewerte das folgende Kapitel "
             "handwerklich und gib das Ergebnis als JSON-Objekt nach Schema zurueck.")
    z.append("")
    z.append("Bewertungsmassstab (streng, kein Gefaelligkeits-Lob):")
    z.append("- Haelt jede Figur ihre Stimme? Sitzt Ton und Perspektive?")
    z.append("- Show statt Tell, kein Klischee, kein Fuellwort-Ballast.")
    z.append("- Rhythmus/Satzlaengen variiert? Dialog mit Subtext?")
    z.append("- Erfuellt das Kapitel sein Ziel und seine Beats glaubwuerdig?")
    z.append("")
    z.append("Felder:")
    z.append("- score: 0-100. >=85 nur, wenn das Kapitel veroeffentlichungsreif ist.")
    z.append("- blocker: knappe Liste der MUSS-Korrekturen (leer, wenn keine).")
    z.append("- feedback: EIN konkreter, umsetzbarer Ueberarbeitungs-Auftrag in "
             "Prosa - so formuliert, dass eine Ueberarbeitung ihn direkt umsetzen "
             "kann (benenne Stellen, sag was zu tun ist). Keine Reinschrift.")
    z.append("- verdict: ein Satz Gesamturteil.")
    z.append("")
    z.append("== STILREGELN (Soll) ==")
    for regel in roman.get("stilregeln", []):
        z.append("- " + regel)
    z.append("")
    z.append("== FIGUREN-STIMMEN (Soll) ==")
    for f in roman.get("figuren", []):
        z.append("- %s: %s" % (f["name"], f["stimme"]))
    z.append("")
    z.append("== ZIEL & BEATS DIESES KAPITELS ==")
    z.append("Kapitel %d - %s" % (kap["nummer"], kap["titel"]))
    z.append("Ziel: " + kap.get("ziel", ""))
    for i, beat in enumerate(kap.get("beats", []), 1):
        z.append("  %d. %s" % (i, beat))
    z.append("")
    if lokale_befunde:
        # Die gratis gemessenen Schwaechen mitgeben - der Lektor soll sie pruefen
        # und, wo berechtigt, in Blocker/Feedback aufnehmen.
        z.append("== MASCHINELL GEMESSENE AUFFAELLIGKEITEN (pruefe, gewichte) ==")
        for b in lokale_befunde:
            z.append("- " + b)
        z.append("")
    z.append("== ZU BEWERTENDES KAPITEL ==")
    z.append(kapiteltext)
    return "\n".join(z)


# ------------------------------------------------------------------
# Gutachten erstellen (Structured Outputs + gecachte Plot-Bibel)
# ------------------------------------------------------------------
def erstelle_gutachten(client, plotbibel, auftrag):
    """Ruft Claude auf und gibt das geparste Gutachten-dict zurueck."""
    antwort = client.messages.create(
        model=MODELL,
        max_tokens=4000,
        thinking={"type": "adaptive"},
        system=[{
            "type": "text",
            "text": plotbibel,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": auftrag}],
        output_config={"format": {"type": "json_schema", "schema": GUTACHTEN_SCHEMA}},
    )
    text = ""
    for block in antwort.content:
        if getattr(block, "type", None) == "text":
            text = block.text
            break
    return json.loads(text)


# ------------------------------------------------------------------
# Eine Schleife fuer EIN Kapitel
# ------------------------------------------------------------------
def poliere_kapitel(client, roman, plotbibel, kap, pfad, einzelbuch,
                    schwelle, max_runden, ziel_min, ziel_max, trocken):
    """Treibt ein Kapitel bis zur Schwelle. Gibt den finalen Score zurueck."""
    with open(pfad, "r", encoding="utf-8") as f:
        text = f.read().strip()
    if not text:
        print("! Kapiteldatei leer, ueberspringe: %s" % pfad)
        return None

    orig_gesichert = False
    runde = 0
    while True:
        lokal = analysiere(text, ziel_min, ziel_max)
        auftrag = baue_gutachten_auftrag(roman, kap, text, lokal["befunde"])
        gut = erstelle_gutachten(client, plotbibel, auftrag)
        score = gut["score"]
        blocker = gut.get("blocker", [])

        print("  Runde %d: Score %d/100 | %s" % (runde, score, gut.get("verdict", "")))
        for b in blocker:
            print("    [Blocker] " + b)
        for b in lokal["befunde"]:
            print("    [lokal]   " + b)

        fertig = score >= schwelle and not blocker and lokal["sauber"]
        if fertig:
            print("  -> Schwelle erreicht (>= %d), keine Blocker. Fertig." % schwelle)
            return score
        if trocken:
            print("  -> Trockenlauf: keine Ueberarbeitung. (wuerde umschreiben)")
            return score
        if runde >= max_runden:
            print("  -> Maximalrunden (%d) erreicht, finaler Score %d. Stoppe."
                  % (max_runden, score))
            return score

        # Feedback fuer die Ueberarbeitung buendeln: Lektor-Feedback + Blocker +
        # die berechtigten lokalen Befunde.
        teile = [gut.get("feedback", "").strip()]
        if blocker:
            teile.append("Behebe zwingend:\n- " + "\n- ".join(blocker))
        if lokal["befunde"]:
            teile.append("Maschinell gemessen (wo berechtigt beheben):\n- "
                         + "\n- ".join(lokal["befunde"]))
        feedback = "\n\n".join(t for t in teile if t)

        # Original einmalig sichern, bevor zum ersten Mal ueberschrieben wird.
        if not orig_gesichert:
            # Neben der Kapiteldatei: kapitel-NN.politur-orig.md (Pfad robust ableiten).
            basis, _ = os.path.splitext(pfad)
            orig = basis + ".politur-orig.md"
            with open(orig, "w", encoding="utf-8") as f:
                f.write(text + "\n")
            print("    [Backup] Original gesichert: %s" % orig)
            orig_gesichert = True

        print("    -> ueberarbeite (Runde %d)..." % (runde + 1))
        neu, _cache = ueberarbeite_kapitel(client, plotbibel, kap, text, feedback)
        with open(pfad, "w", encoding="utf-8") as f:
            f.write(neu + "\n")
        text = neu.strip()
        runde += 1


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(
        description="Autonome Qualitaetsschleife: Gutachten -> Ueberarbeitung bis zur Schwelle.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    p.add_argument("--out", "--kapitel-dir", dest="kapitel_dir",
                   default=os.path.join(HIER, "kapitel"),
                   help="Ordner mit den Kapitel-Dateien (Default: kapitel/)")
    p.add_argument("--band", type=int, default=None,
                   help="Bei Trilogie: Band (Nummer). Ohne --kapitel: ganzer Band.")
    p.add_argument("--kapitel", type=int, default=None,
                   help="Nur dieses Kapitel polieren (sonst alle im Band/Buch)")
    p.add_argument("--schwelle", type=int, default=85,
                   help="Ziel-Score 0-100 (Default 85)")
    p.add_argument("--max-runden", dest="max_runden", type=int, default=3,
                   help="Maximale Ueberarbeitungs-Runden pro Kapitel (Default 3)")
    p.add_argument("--ziel-min", dest="ziel_min", type=int, default=1200)
    p.add_argument("--ziel-max", dest="ziel_max", type=int, default=2000)
    p.add_argument("--trocken", action="store_true",
                   help="Nur bewerten, nichts umschreiben (Kosten-/Vorschau-Lauf)")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")
    if not os.path.exists(args.roman):
        sys.exit("! Plot-Bibel nicht gefunden: %s" % args.roman)

    roman = lade_roman(args.roman)
    plotbibel = baue_plotbibel(roman)
    einzelbuch = not ist_trilogie(roman)
    baende = baende_aus_roman(roman)

    if not einzelbuch and args.band is None:
        sys.exit("! Diese Bibel ist eine Trilogie. Gib mit --band N den Band an.")

    # Zielkapitel sammeln (mit Band-Nummer am Plan-Eintrag fuer das Backup).
    ziele = []
    for b in baende:
        if args.band is not None and b["nummer"] != args.band:
            continue
        for k in b["kapitel"]:
            if args.kapitel is not None and k["nummer"] != args.kapitel:
                continue
            k = dict(k, _band_nr=b["nummer"])
            ziele.append((b, k))
    if not ziele:
        sys.exit("! Auswahl trifft kein Kapitel (pruefe --band / --kapitel).")

    client = anthropic.Anthropic()
    print("== Politur: %s ==" % roman["titel"])
    print("Modell: %s | Schwelle: %d | max. Runden: %d%s\n"
          % (MODELL, args.schwelle, args.max_runden,
             " | TROCKENLAUF" if args.trocken else ""))

    bilanz = []
    for b, k in ziele:
        band_nr = 1 if einzelbuch else b["nummer"]
        pfad = kapitel_pfad(args.kapitel_dir, band_nr, k["nummer"], einzelbuch)
        label = ("Kapitel %d" % k["nummer"]) if einzelbuch \
            else ("Band %d, Kapitel %d" % (b["nummer"], k["nummer"]))
        print("----- %s: %s -----" % (label, k["titel"]))
        if not os.path.exists(pfad):
            print("  ! noch nicht geschrieben (%s) - ueberspringe.\n" % pfad)
            bilanz.append((label, None))
            continue
        score = poliere_kapitel(
            client, roman, plotbibel, k, pfad, einzelbuch,
            args.schwelle, args.max_runden, args.ziel_min, args.ziel_max, args.trocken)
        bilanz.append((label, score))
        print()

    print("== Bilanz ==")
    for label, score in bilanz:
        if score is None:
            print("  %s: uebersprungen" % label)
        else:
            ok = "OK" if score >= args.schwelle else "offen"
            print("  %s: Score %d [%s]" % (label, score, ok))


if __name__ == "__main__":
    main()
