#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - lokaler Prosa-Qualitaetscheck (OHNE API, deterministisch).

Das billige Gate VOR dem teuren Lektorat. Liest die geschriebenen Kapitel und
misst handwerkliche Schwaechen, die man maschinell zuverlaessig erkennt - bevor
ein einziges API-Token fuer ein Lektorat ausgegeben wird:

  - Wortzahl pro Kapitel + Abweichung vom Zielband (Default 1200-2000).
  - Fuellwort-Dichte (eigentlich, irgendwie, ziemlich, ...).
  - Adverb-am-Inquit ("sagte er leise" -> tell statt show).
  - Satzlaengen-Varianz (zu monoton = ermuedend).
  - Satzanfang-Monotonie (zu oft "Er ..."/"Sie ...").
  - Nahe Wortwiederholungen markanter Woerter.
  - Abgegriffene Klischee-Phrasen ("die Zeit stand still", ...).
  - Dialoganteil (nur Info, kein Fehler).

Architektur:
  - Reine Standardbibliothek. Keine Abhaengigkeit, kein Netz, kein Schluessel.
  - Teilt sich die Roman-/Pfad-Logik mit dem Rest (roman_util) - also dieselbe
    Sicht auf Einzelbuch vs. Trilogie wie schreibe_roman.py.
  - analysiere() gibt ein dict zurueck und wird von politur.py als Vor-Filter
    wiederverwendet (eine Quelle der Wahrheit fuer die Metriken).
  - Exit-Code: 0 = alle geprueften Kapitel sauber, 1 = mindestens ein Befund.
    So taugt es als CI-Schritt und als Tor in der Automatik-Schleife.

Verwendung:
  python3 qualitaet.py                                  # roman.json, alle Kapitel
  python3 qualitaet.py --roman roman-drama-trilogie.json --band 1
  python3 qualitaet.py --roman ... --band 1 --kapitel 3
  python3 qualitaet.py --kapitel-dir kapitel-en --json   # maschinenlesbar
  python3 qualitaet.py --ziel-min 1500 --ziel-max 2500   # eigenes Laengenband
"""
import argparse
import json
import os
import re
import sys

from roman_util import lade_roman, baende_aus_roman, ist_trilogie, kapitel_pfad

HIER = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------------
# Wortlisten (bewusst klein und kuratiert - lieber wenige sichere Treffer
# als ein Rauschen aus Fehlalarmen). Alles klein, Vergleich case-insensitiv.
# ------------------------------------------------------------------
FUELLWOERTER = {
    "eigentlich", "irgendwie", "irgendwas", "irgendwann", "ziemlich",
    "sozusagen", "gewissermassen", "gewissermaßen", "quasi", "praktisch",
    "letztendlich", "letztlich", "durchaus", "halt", "eben", "wohl",
    "vielleicht", "anscheinend", "offenbar", "natuerlich", "natürlich",
    "schliesslich", "schließlich", "regelrecht", "buchstaeblich", "buchstäblich",
}

# Abgegriffene Wendungen. Als Teilstrings gesucht (case-insensitiv).
KLISCHEES = [
    "die zeit stand still", "die zeit schien stillzustehen",
    "das herz schlug bis zum hals", "herz bis zum hals",
    "ein kalter schauer", "schauer lief über den rücken",
    "schauer lief ueber den ruecken", "das blut gefror",
    "wie aus dem nichts", "mit einem schlag", "ein stein fiel vom herzen",
    "ohne mit der wimper zu zucken", "in null komma nichts",
    "wie ein offenes buch", "schmetterlinge im bauch", "ein kloß im hals",
    "ein kloss im hals", "wie versteinert", "die welt brach zusammen",
    "tränen schossen", "traenen schossen", "totenstille",
]

# Inquit-Verben (Redebegleiter). Ein Adverb direkt dahinter ist meist "tell".
INQUIT = r"(?:sagte|fragte|rief|flüsterte|fluesterte|murmelte|raunte|" \
         r"erwiderte|entgegnete|antwortete|brüllte|bruellte|zischte|" \
         r"stammelte|seufzte|lachte|schrie)"


def _tokenize_woerter(text):
    """Alle Wort-Token (inkl. Umlaute/ß) in Kleinschreibung."""
    return re.findall(r"[A-Za-zÀ-ÿäöüÄÖÜß]+", text.lower())


def _saetze(text):
    """Grobe Satzsegmentierung an . ! ? (fuer Prosa robust genug)."""
    # Kapiteltitel-Zeile (erste Zeile) nicht als Satz zaehlen.
    teile = re.split(r"[.!?]+(?:\s|$)", text)
    return [s.strip() for s in teile if s.strip()]


def analysiere(text, ziel_min=1200, ziel_max=2000, naehe=45):
    """Misst ein Kapitel und gibt Metriken + Befunde als dict zurueck.

    Wird sowohl von der CLI als auch von politur.py (Vor-Filter) genutzt.
    'befunde' ist eine Liste menschenlesbarer Strings; 'sauber' ist True,
    wenn keine blockierenden Befunde vorliegen.
    """
    # Titelzeile abtrennen, damit sie Metriken nicht verfaelscht.
    zeilen = text.strip().splitlines()
    korpus = "\n".join(zeilen[1:]).strip() if len(zeilen) > 1 else text

    woerter = _tokenize_woerter(korpus)
    n = len(woerter)
    saetze = _saetze(korpus)
    satzlaengen = [len(_tokenize_woerter(s)) for s in saetze] or [0]
    schnitt = sum(satzlaengen) / len(satzlaengen)
    varianz = (sum((x - schnitt) ** 2 for x in satzlaengen) / len(satzlaengen)) ** 0.5

    # Fuellwoerter
    fuell = [w for w in woerter if w in FUELLWOERTER]
    fuell_dichte = (len(fuell) / n * 1000) if n else 0  # pro 1000 Woerter

    # Adverb-am-Inquit: Redebegleiter + Adverb auf -lich/-end direkt dahinter
    inquit_adverb = re.findall(
        INQUIT + r"\s+(?:\w+\s+)?(\w+(?:lich|end))\b", korpus, flags=re.IGNORECASE)

    # Klischees
    low = korpus.lower()
    klischees = [k for k in KLISCHEES if k in low]

    # Nahe Wortwiederholung markanter Woerter (>=6 Zeichen, kein Fuellwort)
    positionen = {}
    for i, w in enumerate(woerter):
        if len(w) >= 6 and w not in FUELLWOERTER:
            positionen.setdefault(w, []).append(i)
    wiederholungen = []
    for w, pos in positionen.items():
        for a, b in zip(pos, pos[1:]):
            if b - a <= naehe:
                wiederholungen.append((w, b - a))
                break
    wiederholungen.sort(key=lambda t: t[1])

    # Satzanfang-Monotonie: erstes Wort jedes Satzes
    anfaenge = {}
    for s in saetze:
        toks = _tokenize_woerter(s)
        if toks:
            anfaenge[toks[0]] = anfaenge.get(toks[0], 0) + 1
    mono = sorted(((w, c) for w, c in anfaenge.items() if c >= 4),
                  key=lambda t: -t[1])

    # Dialoganteil (Anteil Zeichen in Anfuehrungszeichen) - nur Info
    dialog_zeichen = sum(len(m) for m in re.findall(r"[„»\"][^“«\"]*[“«\"]", korpus))
    dialog_anteil = (dialog_zeichen / len(korpus) * 100) if korpus else 0

    # --- Befunde ableiten (was blockiert, was nur ein Hinweis ist) ---
    befunde = []   # blockierend
    hinweise = []  # nur Info

    if n < ziel_min:
        befunde.append("Zu kurz: %d Woerter (Ziel >= %d)." % (n, ziel_min))
    elif n > ziel_max:
        befunde.append("Zu lang: %d Woerter (Ziel <= %d)." % (n, ziel_max))

    if klischees:
        befunde.append("Klischee-Phrasen: " + ", ".join("„%s“" % k for k in klischees))

    if len(inquit_adverb) >= 3:
        befunde.append("Adverb-am-Inquit (tell statt show), %dx: %s"
                       % (len(inquit_adverb), ", ".join(sorted(set(inquit_adverb))[:6])))

    if fuell_dichte > 12:
        befunde.append("Hohe Fuellwort-Dichte: %.1f/1000 Woerter (%d Stueck)."
                       % (fuell_dichte, len(fuell)))

    if varianz < 4 and n > 200:
        befunde.append("Monotone Satzlaenge: Varianz %.1f (Ziel > 4) - "
                       "Rhythmus zu gleichfoermig." % varianz)

    if mono:
        w, c = mono[0]
        hinweise.append("Satzanfang „%s“ %dx - Einstiege variieren." % (w.capitalize(), c))

    if wiederholungen:
        eng = wiederholungen[:4]
        hinweise.append("Nahe Wortwiederholung: "
                        + ", ".join("„%s“ (%d W.)" % (w, d) for w, d in eng))

    return {
        "woerter": n,
        "saetze": len(saetze),
        "satzlaenge_schnitt": round(schnitt, 1),
        "satzlaenge_varianz": round(varianz, 1),
        "fuellwort_dichte_pro1000": round(fuell_dichte, 1),
        "inquit_adverb": len(inquit_adverb),
        "klischees": klischees,
        "dialog_anteil_prozent": round(dialog_anteil, 1),
        "befunde": befunde,
        "hinweise": hinweise,
        "sauber": not befunde,
    }


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(
        description="Lokaler Prosa-Qualitaetscheck (ohne API). Exit 0 = sauber, 1 = Befunde.")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    p.add_argument("--out", "--kapitel-dir", dest="kapitel_dir",
                   default=os.path.join(HIER, "kapitel"),
                   help="Ordner mit den Kapitel-Dateien (Default: kapitel/)")
    p.add_argument("--band", type=int, default=None,
                   help="Bei Trilogie: nur diesen Band pruefen (Nummer)")
    p.add_argument("--kapitel", type=int, default=None,
                   help="Nur dieses eine Kapitel pruefen (Nummer)")
    p.add_argument("--ziel-min", dest="ziel_min", type=int, default=1200,
                   help="Untere Wortzahl-Grenze (Default 1200)")
    p.add_argument("--ziel-max", dest="ziel_max", type=int, default=2000,
                   help="Obere Wortzahl-Grenze (Default 2000)")
    p.add_argument("--json", action="store_true",
                   help="Maschinenlesbar (JSON) statt Markdown-Report ausgeben")
    args = p.parse_args()

    if not os.path.exists(args.roman):
        sys.exit("! Plot-Bibel nicht gefunden: %s" % args.roman)

    roman = lade_roman(args.roman)
    einzelbuch = not ist_trilogie(roman)
    baende = baende_aus_roman(roman)

    # Arbeitsliste: (band, kapitel), gefiltert nach --band/--kapitel.
    plan = [(b, k) for b in baende for k in b["kapitel"]
            if (args.band is None or b["nummer"] == args.band)
            and (args.kapitel is None or k["nummer"] == args.kapitel)]
    if not plan:
        sys.exit("! Auswahl trifft kein Kapitel (pruefe --band / --kapitel).")

    ergebnisse = []
    fehlend = []
    for b, k in plan:
        pfad = kapitel_pfad(args.kapitel_dir, b["nummer"], k["nummer"], einzelbuch)
        if not os.path.exists(pfad):
            fehlend.append((b, k, pfad))
            continue
        with open(pfad, "r", encoding="utf-8") as f:
            text = f.read()
        m = analysiere(text, args.ziel_min, args.ziel_max)
        label = ("B%d K%d" % (b["nummer"], k["nummer"])) if not einzelbuch \
            else ("Kapitel %d" % k["nummer"])
        m["label"] = label
        m["titel"] = k["titel"]
        ergebnisse.append(m)

    if args.json:
        print(json.dumps({"ergebnisse": ergebnisse,
                          "fehlend": [x[2] for x in fehlend]},
                         ensure_ascii=False, indent=2))
    else:
        print("# Qualitaetscheck: %s\n" % roman["titel"])
        for m in ergebnisse:
            mark = "OK " if m["sauber"] else "!! "
            print("## %s%s - %s" % (mark, m["label"], m["titel"]))
            print("- %d Woerter, %d Saetze, ⌀ %.1f W./Satz (Varianz %.1f), "
                  "Dialog %.0f%%, Fuellwoerter %.1f/1000"
                  % (m["woerter"], m["saetze"], m["satzlaenge_schnitt"],
                     m["satzlaenge_varianz"], m["dialog_anteil_prozent"],
                     m["fuellwort_dichte_pro1000"]))
            for b in m["befunde"]:
                print("  - [Befund] " + b)
            for h in m["hinweise"]:
                print("  - [Hinweis] " + h)
            print()
        if fehlend:
            print("## Fehlende Kapitel (noch nicht geschrieben)")
            for b, k, pfad in fehlend:
                print("  - %s" % pfad)
            print()
        sauber = sum(1 for m in ergebnisse if m["sauber"])
        print("Zusammenfassung: %d/%d Kapitel sauber, %d mit Befund."
              % (sauber, len(ergebnisse), len(ergebnisse) - sauber))

    # Exit-Code: 1, wenn irgendein gepruefte Kapitel Befunde hat.
    if any(not m["sauber"] for m in ergebnisse):
        sys.exit(1)


if __name__ == "__main__":
    main()
