#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Zweitmeinung - holt eine UNABHAENGIGE Kritik eines Kapitels von mehreren
KI-Modellen ein und stellt sie nebeneinander.

Idee: Ein einzelnes Modell hat blinde Flecken. Wer dasselbe Kapitel von Claude,
ChatGPT und Gemini parallel beurteilen laesst, bekommt diverses, teils
widerspruechliches Feedback - genau das, was eine Autorin/ein Autor zum
Ueberarbeiten braucht. Anders als der 'lektor.py' (handwerkliche Detailpruefung
mit Zitaten) ist die Zweitmeinung bewusst zugespitzt: jedes Modell agiert als
fordernder Verlagslektor und gibt eine kurze, meinungsstarke Einschaetzung -
Staerken, die drei groessten Schwaechen, ein Urteil.

Drei Anbieter, jeweils hinter einer kleinen Funktion, die einen deutschen
Kritik-String zurueckgibt:
  - review_claude(...)  PFLICHT  - Anthropic SDK, claude-opus-4-8, adaptives Denken.
  - review_openai(...)  OPTIONAL - nur wenn OPENAI_API_KEY gesetzt UND 'openai'
                                   importierbar ist. Faellt sonst sauber zurueck.
  - review_gemini(...)  OPTIONAL - nur wenn GEMINI_API_KEY/GOOGLE_API_KEY gesetzt
                                   UND 'google.generativeai' importierbar ist.

WICHTIG: openai und google werden NICHT vorausgesetzt und stehen in KEINER
requirements-Datei. Ihre Imports liegen LAZY in den jeweiligen Funktionen. Das
Skript laeuft mit AUSSCHLIESSLICH installiertem 'anthropic' - die anderen beiden
melden dann hoeflich "nicht verfuegbar".

Voraussetzung:
  pip install anthropic           # Pflicht (Claude ist die Basis-Zweitmeinung)
  pip install openai              # optional, fuer ChatGPT
  pip install google-generativeai # optional, fuer Gemini
  export ANTHROPIC_API_KEY="sk-ant-..."   # Pflicht
  export OPENAI_API_KEY="sk-..."          # optional
  export GEMINI_API_KEY="..."             # optional (oder GOOGLE_API_KEY)

Verwendung:
  python3 zweitmeinung.py --kapitel 1
  python3 zweitmeinung.py --kapitel 2 --modelle claude,openai
  python3 zweitmeinung.py --kapitel 3 --roman mein.json --kapitel-dir kapitel/
"""
import argparse
import os
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

# Schreiber-Bausteine wiederverwenden: dieselbe Plot-Bibel/JSON-Sicht wie
# Schreiber und Lektor, damit jedes Modell denselben Welt-/Voice-Kontext kennt.
from schreibe_roman import lade_roman, baue_plotbibel, MODELL

HIER = os.path.dirname(os.path.abspath(__file__))

# Modellbezeichner der optionalen Drittanbieter (zentral, leicht anpassbar).
OPENAI_MODELL = "gpt-4o"
GEMINI_MODELL = "gemini-1.5-pro"


# ------------------------------------------------------------------
# Gemeinsamer Pruefauftrag (modellunabhaengig)
# ------------------------------------------------------------------
def baue_zweitmeinung_auftrag(roman, kap_nummer, kapiteltext):
    """Baut den zugespitzten Zweitmeinungs-Auftrag fuer EIN Kapitel.

    Bewusst anders gerahmt als 'lektor.py': keine seitenlange Detailpruefung,
    sondern eine scharfe, meinungsstarke Verlagseinschaetzung in fester
    Gliederung (Staerken / drei groesste Schwaechen / Urteil). Derselbe Text
    geht an alle Modelle, damit die Antworten vergleichbar bleiben.
    """
    z = []
    z.append("Du bist ein fordernder, erfahrener Verlagslektor und gibst eine "
             "ZWEITMEINUNG zu einem Romankapitel ab. Du kennst den Autor nicht "
             "und schonst ihn nicht. Sei ehrlich, konkret und meinungsstark - "
             "aber begruende jeden Punkt.")
    z.append("")
    z.append("WICHTIG:")
    z.append("- Schreibe das Kapitel NICHT um, liefere KEINE Reinschrift.")
    z.append("- Fasse dich kurz und pointiert; keine Hoeflichkeitsfloskeln, "
             "kein Lob ohne Beleg, keine Werbe- oder Hype-Sprache.")
    z.append("- Antworte auf Deutsch in sauberem Markdown, durchgehend per 'du'.")
    z.append("")
    z.append("== KONTEXT: ECKDATEN ==")
    z.append("Titel: %s | Genre: %s | Ton: %s"
             % (roman.get("titel", "?"), roman.get("genre", "?"),
                roman.get("ton", "?")))
    z.append("")
    z.append("== ZU BEURTEILENDES KAPITEL %d ==" % kap_nummer)
    z.append(kapiteltext)
    z.append("")
    z.append("== GIB DEINE ZWEITMEINUNG IN GENAU DIESER GLIEDERUNG AUS ==")
    z.append("# Zweitmeinung: Kapitel %d" % kap_nummer)
    z.append("")
    z.append("## Staerken")
    z.append("Was traegt das Kapitel? Nenne 2-3 konkrete Staerken mit kurzem Beleg.")
    z.append("")
    z.append("## Die drei groessten Schwaechen")
    z.append("Eine nummerierte Liste (1-3) der gravierendsten Probleme - "
             "Handlung, Figuren, Sprache, Tempo oder Aufbau. Jede mit kurzem "
             "Beleg und einem Satz, was konkret zu tun ist.")
    z.append("")
    z.append("## Urteil")
    z.append("Ein klares Gesamturteil in 2-3 Saetzen: traegt das Kapitel das "
             "Buch, oder muss es ueberarbeitet werden? Wuerdest du weiterlesen?")
    return "\n".join(z)


# ------------------------------------------------------------------
# 1) Claude - PFLICHT, immer verfuegbar (Anthropic SDK)
# ------------------------------------------------------------------
def review_claude(plotbibel, auftrag):
    """Holt die Zweitmeinung von Claude (claude-opus-4-8, adaptives Denken).

    Die Plot-Bibel ist der gecachte System-Praefix (kennt Welt + Stimmen),
    der Pruefauftrag samt Kapiteltext steht als User-Nachricht dahinter. So
    teilt sich dieser Aufruf den Prompt-Cache mit Schreiber und Lektor.
    """
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=MODELL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        system=[{
            "type": "text",
            "text": plotbibel,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": auftrag}],
    )
    # Nur die Text-Bloecke einsammeln (Thinking-Bloecke ueberspringen).
    teile = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    return "".join(teile).strip()


# ------------------------------------------------------------------
# 2) ChatGPT / OpenAI - OPTIONAL, faellt sauber zurueck
# ------------------------------------------------------------------
def review_openai(plotbibel, auftrag):
    """Holt die Zweitmeinung von ChatGPT (OpenAI), wenn moeglich.

    Bedingungen: OPENAI_API_KEY gesetzt UND Paket 'openai' importierbar. Import
    liegt absichtlich LAZY in dieser Funktion, damit das Modul ohne 'openai'
    laedt. Bei fehlendem Paket/Key oder API-Fehler kommt ein klarer Hinweis-
    String zurueck - die Funktion wirft NIE eine Exception nach aussen.
    """
    if not os.environ.get("OPENAI_API_KEY"):
        return "(OpenAI nicht verfuegbar: kein OPENAI_API_KEY gesetzt)"
    try:
        from openai import OpenAI
    except ImportError:
        return ("(OpenAI nicht verfuegbar: Paket fehlt - optional nachruesten mit "
                "'pip install openai')")
    try:
        client = OpenAI()
        resp = client.chat.completions.create(
            model=OPENAI_MODELL,
            messages=[
                {"role": "system", "content": plotbibel},
                {"role": "user", "content": auftrag},
            ],
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return "(OpenAI nicht verfuegbar: %s)" % e


# ------------------------------------------------------------------
# 3) Gemini / Google - OPTIONAL, faellt sauber zurueck
# ------------------------------------------------------------------
def review_gemini(plotbibel, auftrag):
    """Holt die Zweitmeinung von Gemini (Google), wenn moeglich.

    Bedingungen: GEMINI_API_KEY oder GOOGLE_API_KEY gesetzt UND Paket
    'google.generativeai' importierbar. Import liegt LAZY in dieser Funktion.
    Bei fehlendem Paket/Key oder API-Fehler kommt ein klarer Hinweis-String
    zurueck - nie eine Exception nach aussen.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return "(Gemini nicht verfuegbar: weder GEMINI_API_KEY noch GOOGLE_API_KEY gesetzt)"
    try:
        import google.generativeai as genai
    except ImportError:
        return ("(Gemini nicht verfuegbar: Paket fehlt - optional nachruesten mit "
                "'pip install google-generativeai')")
    try:
        genai.configure(api_key=api_key)
        modell = genai.GenerativeModel(GEMINI_MODELL)
        # Plot-Bibel und Auftrag in einen Prompt giessen (Gemini hat keinen
        # separaten System-Slot wie die anderen beiden SDKs).
        prompt = plotbibel + "\n\n" + auftrag
        resp = modell.generate_content(prompt)
        return (resp.text or "").strip()
    except Exception as e:
        return "(Gemini nicht verfuegbar: %s)" % e


# Registry: Name -> Funktion. Reihenfolge bestimmt die Ausgabe-Reihenfolge.
REVIEWER = {
    "claude": ("Claude (%s)" % MODELL, review_claude),
    "openai": ("ChatGPT (%s)" % OPENAI_MODELL, review_openai),
    "gemini": ("Gemini (%s)" % GEMINI_MODELL, review_gemini),
}


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(
        description="KI-Zweitmeinung: unabhaengige Kapitel-Kritik von mehreren "
                    "Modellen nebeneinander (Claude Pflicht, ChatGPT/Gemini optional).")
    p.add_argument("--roman", default=os.path.join(HIER, "roman.json"),
                   help="Pfad zur Plot-Bibel (Default: roman.json)")
    # --out und --kapitel-dir meinen denselben Ordner (wie in lektor.py).
    p.add_argument("--out", "--kapitel-dir", dest="kapitel_dir",
                   default=os.path.join(HIER, "kapitel"),
                   help="Ordner mit den Kapitel-Dateien (Default: kapitel/)")
    p.add_argument("--kapitel", type=int, required=True,
                   help="Nummer des zu beurteilenden Kapitels (Pflicht)")
    p.add_argument("--modelle", default="claude,openai,gemini",
                   help="Komma-Liste der Modelle (Default: claude,openai,gemini). "
                        "Nur Modelle mit Key/Paket laufen wirklich.")
    args = p.parse_args()

    # Claude ist die Basis-Zweitmeinung - ohne dessen Key macht das Tool keinen Sinn.
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

    # Gewuenschte Modelle parsen, Reihenfolge der Registry beibehalten.
    gewuenscht = [m.strip().lower() for m in args.modelle.split(",") if m.strip()]
    unbekannt = [m for m in gewuenscht if m not in REVIEWER]
    if unbekannt:
        sys.exit("! Unbekannte Modelle: %s\n  Erlaubt: %s"
                 % (", ".join(unbekannt), ", ".join(REVIEWER)))
    aktive = [m for m in REVIEWER if m in gewuenscht]
    if not aktive:
        sys.exit("! Keine Modelle ausgewaehlt. Beispiel: --modelle claude,openai")

    roman = lade_roman(args.roman)
    plotbibel = baue_plotbibel(roman)
    auftrag = baue_zweitmeinung_auftrag(roman, args.kapitel, kapiteltext)

    print("== Zweitmeinung: %s, Kapitel %d ==" % (roman.get("titel", "?"), args.kapitel))
    print("Quelle: %s" % kap_pfad)
    print("Modelle: %s\n" % ", ".join(REVIEWER[m][0] for m in aktive))

    # Jede Kritik einsammeln und sowohl ausgeben als auch fuer die kombinierte
    # Datei zwischenspeichern.
    abschnitte = []
    for name in aktive:
        label, funktion = REVIEWER[name]
        kopf = "===== %s =====" % label
        print(kopf)
        try:
            kritik = funktion(plotbibel, auftrag)
        except Exception as e:
            # Defensive Notbremse - die optionalen Reviewer fangen selbst ab,
            # aber falls doch etwas durchrutscht, soll kein Modell den Lauf killen.
            kritik = "(%s nicht verfuegbar: %s)" % (label, e)
        print(kritik)
        print()
        abschnitte.append("## %s\n\n%s" % (label, kritik))

    # Kombinierte Datei neben dem Kapitel ablegen: kapitel-NN.zweitmeinung.md
    ziel = os.path.join(args.kapitel_dir, "kapitel-%02d.zweitmeinung.md" % args.kapitel)
    kopf = "# Zweitmeinung zu Kapitel %d - %s\n\n" % (args.kapitel, roman.get("titel", "?"))
    with open(ziel, "w", encoding="utf-8") as f:
        f.write(kopf + "\n\n".join(abschnitte) + "\n")
    print("[OK] Zweitmeinung gespeichert: %s" % ziel)


if __name__ == "__main__":
    main()
