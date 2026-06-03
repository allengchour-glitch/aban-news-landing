#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KI-Schriftsteller - AUTOPILOT: entwirft autonom ein markt-faehiges Buchkonzept
und schreibt den ganzen Roman mit einem einzigen Befehl.

Die Pipeline laeuft in fuenf Stufen, alle ueber das Anthropic SDK
(Modell claude-opus-4-8, adaptives Denken). Wo das Ergebnis maschinell
weiterverarbeitet werden muss, kommen Structured Outputs zum Einsatz
(output_config={"format": {"type": "json_schema", "schema": ...}}), damit das
Resultat garantiert gueltiges JSON nach Schema ist.

  1. analysiere_markt(genre_hint)  -> kurze deutsche Markt-/Genre-Analyse (Text).
  2. entwirf_konzepte(analyse, n)  -> n eigenstaendige Buchkonzepte (JSON).
  3. waehle_bestes(konzepte)       -> waehlt das aussichtsreichste Konzept (JSON).
  4. baue_roman_json(konzept)      -> vollstaendige, schema-konforme roman.json (JSON).
  5. subprocess -> schreibe_roman.py schreibt die Kapitel (Streaming durchgereicht).

================================================================================
RECHTLICHER / ETHISCHER RAHMEN  (verbindlich, in JEDEM Prompt verankert)
================================================================================
Dieses Werkzeug lernt ausschliesslich ALLGEMEINE MUSTER und KONVENTIONEN
erfolgreicher Buecher und Genres - also Struktur, Pacing, Tropes, Ton und
Erwartungen der Zielgruppe -, um daraus ein EIGENSTAENDIGES, ORIGINELLES Werk
zu schaffen.

Es darf NIEMALS ein konkretes, urheberrechtlich geschuetztes Buch reproduzieren,
eng paraphrasieren oder eine abgeleitete Bearbeitung (derivative work) davon
erstellen. Es darf KEINE realen Buchtitel oder Autorennamen als Vorlage zum
Kopieren verwenden. Originalitaet ist Pflicht. Die folgende Instruktion wird
darum woertlich in jeden Generierungs-Prompt gegeben:

  "Lerne allgemeine Genre-Muster und Marktkonventionen, kopiere niemals
   konkrete Werke; das Ergebnis muss eigenstaendig sein."

================================================================================

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."

Verwendung:
  python3 autopilot.py                                 # voll-autonom: Konzept + Roman
  python3 autopilot.py --genre "Cozy Mystery"          # mit Genre-Hinweis
  python3 autopilot.py --konzepte 5                     # 5 Konzepte zur Auswahl
  python3 autopilot.py --nur-konzept                    # nur roman-auto.json bauen
  python3 autopilot.py --ja                             # ohne Bestaetigungs-Pause
  python3 autopilot.py --konzept-out mein.json --kapitel-dir kapitel-x/
"""
import argparse
import json
import os
import subprocess
import sys

try:
    import anthropic
except ImportError:
    sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")

MODELL = "claude-opus-4-8"
HIER = os.path.dirname(os.path.abspath(__file__))

# Diese Instruktion steht WOERTLICH in jedem Generierungs-Prompt (s. Rahmen oben).
ORIGINALITAET = (
    "Lerne allgemeine Genre-Muster und Marktkonventionen, kopiere niemals "
    "konkrete Werke; das Ergebnis muss eigenstaendig sein. Reproduziere oder "
    "paraphrasiere kein konkretes, urheberrechtlich geschuetztes Buch und "
    "verwende keine realen Buchtitel oder Autorennamen als Vorlage zum Kopieren. "
    "Erschaffe ein vollstaendig originelles Werk."
)


# ------------------------------------------------------------------
# Kleine Helfer
# ------------------------------------------------------------------
def _text_aus_antwort(antwort):
    """Gibt den ersten Textblock einer Antwort zurueck (Thinking-Bloecke ueberspringen)."""
    for block in antwort.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


def _json_aus_antwort(antwort):
    """Parst den ersten Textblock als JSON (bei Structured Outputs garantiert gueltig)."""
    return json.loads(_text_aus_antwort(antwort))


# ------------------------------------------------------------------
# Schemata fuer Structured Outputs
# ------------------------------------------------------------------
# Stufe 2: Liste von Konzepten. additionalProperties:false + required erzwingen
# exakt die gewuenschten Felder.
SCHEMA_KONZEPTE = {
    "type": "object",
    "additionalProperties": False,
    "required": ["konzepte"],
    "properties": {
        "konzepte": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "titel", "genre", "praemisse", "zielgruppe",
                    "usp", "potenzial_score", "begruendung",
                ],
                "properties": {
                    "titel": {"type": "string"},
                    "genre": {"type": "string"},
                    "praemisse": {"type": "string"},
                    "zielgruppe": {"type": "string"},
                    "usp": {"type": "string"},
                    "potenzial_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                    },
                    "begruendung": {"type": "string"},
                },
            },
        }
    },
}

# Stufe 3: Auswahl des besten Konzepts (Index in die Liste + Begruendung).
SCHEMA_AUSWAHL = {
    "type": "object",
    "additionalProperties": False,
    "required": ["index", "begruendung"],
    "properties": {
        "index": {"type": "integer", "minimum": 0},
        "begruendung": {"type": "string"},
    },
}

# Stufe 4: vollstaendige roman.json nach dem etablierten Schema
# (vgl. roman.json / schreibe_roman.py / plane_kapitel.py).
SCHEMA_ROMAN = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "titel", "genre", "sprache", "praemisse", "ton",
        "erzaehlperspektive", "stilregeln", "welt", "figuren", "kapitel",
    ],
    "properties": {
        "titel": {"type": "string"},
        "genre": {"type": "string"},
        "sprache": {"type": "string"},
        "praemisse": {"type": "string"},
        "ton": {"type": "string"},
        "erzaehlperspektive": {"type": "string"},
        "stilregeln": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
        },
        "welt": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "regeln_der_magie", "orte", "konflikt"],
            "properties": {
                "name": {"type": "string"},
                # 'regeln_der_magie' wird je nach Genre passend umgewidmet:
                # bei nicht-fantastischen Stoffen die tragenden Welt-/Spielregeln
                # (soziale Ordnung, Ermittlungsregeln, Technik, Milieu-Logik).
                "regeln_der_magie": {"type": "string"},
                "orte": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                },
                "konflikt": {"type": "string"},
            },
        },
        "figuren": {
            "type": "array",
            "minItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "name", "rolle", "alter", "beschreibung",
                    "wunsch", "geheimnis", "stimme",
                ],
                "properties": {
                    "name": {"type": "string"},
                    "rolle": {"type": "string"},
                    "alter": {"type": "integer"},
                    "beschreibung": {"type": "string"},
                    "wunsch": {"type": "string"},
                    "geheimnis": {"type": "string"},
                    "stimme": {"type": "string"},
                },
            },
        },
        "kapitel": {
            "type": "array",
            "minItems": 6,
            "maxItems": 8,
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
                        "minItems": 4,
                        "maxItems": 5,
                    },
                },
            },
        },
    },
}


# ------------------------------------------------------------------
# Stufe 1: Marktanalyse (Klartext)
# ------------------------------------------------------------------
def analysiere_markt(client, genre_hint=None):
    """Liefert eine kurze deutsche Markt-/Genre-Analyse als Klartext.

    EHRLICHE EINSCHRAENKUNG: Es gibt hier KEINEN Live-Webzugriff und keine
    aktuellen Verkaufs-/Bestsellerdaten. Das Modell argumentiert allein aus
    seinem allgemeinen Wissen ueber Genre-Konventionen und Lesererwartungen
    (Stand des Trainings). Die Analyse ist daher eine fundierte Einschaetzung,
    keine belegte Marktstatistik.
    """
    system = (
        "Du bist eine erfahrene Verlagslektorin und Markt-Analystin fuer "
        "Belletristik. Du kennst Genre-Konventionen, typische Tropes, Pacing "
        "und Lesererwartungen sehr genau. " + ORIGINALITAET
    )
    auftrag = []
    if genre_hint:
        auftrag.append("Fokus-Genre / Hinweis: %s." % genre_hint)
    auftrag.append(
        "Schreibe eine KURZE Markt- und Genre-Analyse auf Deutsch (etwa "
        "200-300 Woerter). Benenne konkret:")
    auftrag.append(
        "1) ein Sub-Genre samt Zielgruppe, das aktuell Potenzial hat (und warum),")
    auftrag.append(
        "2) die praegenden Konventionen/Tropes, die dieses Sub-Genre ausmachen,")
    auftrag.append(
        "3) was die Leserschaft konkret erwartet (Versprechen des Genres).")
    auftrag.append(
        "Begruende aus allgemeinem Genre-Wissen. WICHTIG: Du hast keinen "
        "Live-Webzugriff und keine aktuellen Verkaufszahlen - formuliere darum "
        "als fundierte Einschaetzung, nicht als belegte Statistik, und nenne "
        "keine konkreten realen Buchtitel als Vorlage.")
    auftrag.append("")
    auftrag.append(ORIGINALITAET)

    antwort = client.messages.create(
        model=MODELL,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": "\n".join(auftrag)}],
    )
    return _text_aus_antwort(antwort).strip()


# ------------------------------------------------------------------
# Stufe 2: Konzepte entwerfen (Structured Outputs)
# ------------------------------------------------------------------
def entwirf_konzepte(client, analyse, anzahl=3):
    """Erzeugt `anzahl` eigenstaendige, originelle Buchkonzepte als JSON-Liste."""
    system = (
        "Du bist eine kreative Programm-Macherin in einem Belletristik-Verlag "
        "und entwickelst tragfaehige, ORIGINELLE Buchkonzepte. " + ORIGINALITAET
    )
    auftrag = []
    auftrag.append("== MARKTANALYSE (Kontext) ==")
    auftrag.append(analyse)
    auftrag.append("")
    auftrag.append("== AUFTRAG ==")
    auftrag.append(
        "Entwirf %d klar UNTERSCHIEDLICHE, eigenstaendige Buchkonzepte, die zu "
        "den oben beschriebenen Marktchancen passen. Jedes Konzept braucht:"
        % anzahl)
    auftrag.append("- titel: ein origineller Arbeitstitel (kein realer Buchtitel),")
    auftrag.append("- genre: das (Sub-)Genre,")
    auftrag.append("- praemisse: 1-3 Saetze, die den Kern-Konflikt fassen,")
    auftrag.append("- zielgruppe: fuer wen das Buch ist,")
    auftrag.append("- usp: was dieses Buch einzigartig macht,")
    auftrag.append("- potenzial_score: ganze Zahl 1-10 (Markt- und Erzaehlpotenzial),")
    auftrag.append("- begruendung: warum dieser Score, kurz.")
    auftrag.append("")
    auftrag.append(ORIGINALITAET)
    auftrag.append("Gib ausschliesslich das geforderte JSON-Objekt zurueck.")

    antwort = client.messages.create(
        model=MODELL,
        max_tokens=6000,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": "\n".join(auftrag)}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_KONZEPTE}},
    )
    return _json_aus_antwort(antwort)["konzepte"]


# ------------------------------------------------------------------
# Stufe 3: Bestes Konzept waehlen (Score + Claude-Urteil)
# ------------------------------------------------------------------
def waehle_bestes(client, konzepte):
    """Waehlt das aussichtsreichste Konzept: Score-Vorfilter + finales Claude-Urteil.

    Vorfilter: hoechster potenzial_score. Da mehrere Konzepte gleich hoch liegen
    koennen und Score allein nicht alles ist, faellt Claude die finale
    Entscheidung (Index in die Liste) per Structured Output.
    """
    if not konzepte:
        raise ValueError("Keine Konzepte zur Auswahl erhalten.")
    if len(konzepte) == 1:
        return konzepte[0]

    system = (
        "Du bist Verlagsleiterin und triffst die finale Programmentscheidung. "
        "Du waegst Markt-Potenzial, Originalitaet und erzaehlerische Tragfaehigkeit "
        "fuer einen ganzen Roman ab. " + ORIGINALITAET
    )
    zeilen = ["== KONZEPTE ZUR AUSWAHL =="]
    for i, k in enumerate(konzepte):
        zeilen.append(
            "[%d] %s (%s) | Score %s\n    Praemisse: %s\n    Zielgruppe: %s\n    USP: %s"
            % (i, k.get("titel", ""), k.get("genre", ""), k.get("potenzial_score", "?"),
               k.get("praemisse", ""), k.get("zielgruppe", ""), k.get("usp", "")))
    zeilen.append("")
    zeilen.append(
        "Waehle EIN Konzept, das sich am besten zu einem fesselnden, "
        "eigenstaendigen Roman ausbauen laesst. Beruecksichtige den "
        "potenzial_score, aber entscheide letztlich nach Gesamturteil. "
        "Gib den 0-basierten Index und eine kurze Begruendung als JSON zurueck.")
    zeilen.append(ORIGINALITAET)

    antwort = client.messages.create(
        model=MODELL,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": "\n".join(zeilen)}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_AUSWAHL}},
    )
    wahl = _json_aus_antwort(antwort)
    idx = wahl.get("index", 0)
    if not isinstance(idx, int) or idx < 0 or idx >= len(konzepte):
        # Fallback: bestes nach Score (bei Gleichstand das erste).
        idx = max(range(len(konzepte)),
                  key=lambda i: konzepte[i].get("potenzial_score", 0))
    gewaehlt = konzepte[idx]
    gewaehlt["_auswahl_begruendung"] = wahl.get("begruendung", "")
    return gewaehlt


# ------------------------------------------------------------------
# Stufe 4: vollstaendige roman.json bauen (Structured Outputs)
# ------------------------------------------------------------------
def baue_roman_json(client, konzept):
    """Baut aus dem gewaehlten Konzept eine vollstaendige, schema-konforme roman.json."""
    system = (
        "Du bist Romandramaturg und Plot-Architekt. Du baust aus einem "
        "Buchkonzept eine vollstaendige Plot-Bibel auf literarischem Niveau. "
        + ORIGINALITAET
    )
    auftrag = []
    auftrag.append("== GEWAEHLTES KONZEPT ==")
    auftrag.append("Titel: %s" % konzept.get("titel", ""))
    auftrag.append("Genre: %s" % konzept.get("genre", ""))
    auftrag.append("Praemisse: %s" % konzept.get("praemisse", ""))
    auftrag.append("Zielgruppe: %s" % konzept.get("zielgruppe", ""))
    auftrag.append("USP: %s" % konzept.get("usp", ""))
    auftrag.append("")
    auftrag.append("== AUFTRAG: VOLLSTAENDIGE PLOT-BIBEL (roman.json) ==")
    auftrag.append("Erzeuge ein JSON-Objekt mit GENAU diesen Feldern:")
    auftrag.append("- titel, genre, sprache (\"Deutsch\"),")
    auftrag.append("- praemisse: praeziser Kern-Konflikt,")
    auftrag.append("- ton: konkrete Beschreibung von Stimmung und Satzrhythmus,")
    auftrag.append("- erzaehlperspektive: z. B. dritte Person personal, Praeteritum,")
    auftrag.append("- stilregeln: 5 konkrete, umsetzbare Regeln,")
    auftrag.append(
        "- welt: { name, regeln_der_magie, orte (mind. 3), konflikt }. "
        "WICHTIG: Das Feld 'regeln_der_magie' GENRE-GERECHT umwidmen - bei "
        "fantastischen Stoffen das Magiesystem, bei realistischen Stoffen die "
        "tragenden Welt-/Spielregeln (z. B. soziale Ordnung, Ermittlungslogik, "
        "Technik, Milieu-Regeln). Das Feld muss aber bestehen bleiben.")
    auftrag.append(
        "- figuren: MINDESTENS 3, je { name, rolle, alter (ganze Zahl), "
        "beschreibung, wunsch, geheimnis, stimme },")
    auftrag.append(
        "- kapitel: 6 bis 8 Eintraege, je { nummer (fortlaufend ab 1), titel, "
        "ziel, beats (4-5 KONKRETE Handlungsschritte) }. Baue einen klaren "
        "Spannungsbogen mit Zuspitzung und Aufloesung.")
    auftrag.append("")
    auftrag.append(ORIGINALITAET)
    auftrag.append("Gib ausschliesslich das geforderte JSON-Objekt zurueck.")

    antwort = client.messages.create(
        model=MODELL,
        max_tokens=12000,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": "\n".join(auftrag)}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_ROMAN}},
    )
    return _json_aus_antwort(antwort)


# ------------------------------------------------------------------
# Stufe 5: Kapitel schreiben (delegiert an schreibe_roman.py via subprocess)
# ------------------------------------------------------------------
def schreibe_alle_kapitel(konzept_pfad, kapitel_dir):
    """Ruft schreibe_roman.py als Subprozess auf und reicht dessen Ausgabe durch.

    Bewusst ueber subprocess statt Import: schreibe_roman.py bleibt die eine
    Quelle der Wahrheit fuers Schreiben (Caching, Streaming, Kontinuitaet), und
    wir profitieren ohne Code-Duplizierung. Ausgefuehrt aus dem
    ki-schriftsteller-Verzeichnis (HIER).
    """
    befehl = [
        sys.executable,
        os.path.join(HIER, "schreibe_roman.py"),
        "--roman", konzept_pfad,
        "--out", kapitel_dir,
    ]
    print("\n>> %s\n" % " ".join(befehl))
    # check=False: Rueckgabecode selbst auswerten, damit wir sauber beenden.
    ergebnis = subprocess.run(befehl, cwd=HIER)
    return ergebnis.returncode


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(
        description="KI-Schriftsteller Autopilot: Konzept autonom entwerfen und "
                    "ganzen Roman schreiben.")
    p.add_argument("--genre", default=None,
                   help="Optionaler Genre-Hinweis, z. B. \"Cozy Mystery\".")
    p.add_argument("--konzepte", type=int, default=3,
                   help="Wie viele Konzepte zur Auswahl entworfen werden (Default: 3).")
    p.add_argument("--konzept-out", default="roman-auto.json",
                   help="Zieldatei fuer die generierte Plot-Bibel (Default: roman-auto.json).")
    p.add_argument("--kapitel-dir", default="kapitel-auto",
                   help="Ausgabeordner fuer die Kapitel (Default: kapitel-auto/).")
    p.add_argument("--nur-konzept", action="store_true",
                   help="Nach dem Schreiben der Plot-Bibel stoppen (keine Kapitel).")
    p.add_argument("--ja", action="store_true",
                   help="Bestaetigungs-Pause vor dem Schreiben aller Kapitel ueberspringen.")
    args = p.parse_args()

    if args.konzepte < 1:
        sys.exit("! --konzepte muss mindestens 1 sein.")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY=\"sk-ant-...\"")

    # Pfade aufloesen (relative Pfade beziehen sich auf das ki-schriftsteller-Verzeichnis).
    konzept_pfad = args.konzept_out
    if not os.path.isabs(konzept_pfad):
        konzept_pfad = os.path.join(HIER, konzept_pfad)
    kapitel_dir = args.kapitel_dir
    if not os.path.isabs(kapitel_dir):
        kapitel_dir = os.path.join(HIER, kapitel_dir)

    client = anthropic.Anthropic()

    # --- Stufe 1: Marktanalyse ---
    print("== AUTOPILOT ==")
    print("Modell: %s\n" % MODELL)
    print("[1/5] Markt- und Genre-Analyse%s ...\n"
          % (" (Hinweis: %s)" % args.genre if args.genre else ""))
    analyse = analysiere_markt(client, args.genre)
    print(analyse)
    print()

    # --- Stufe 2: Konzepte entwerfen ---
    print("[2/5] Entwerfe %d Konzept(e) ...\n" % args.konzepte)
    konzepte = entwirf_konzepte(client, analyse, args.konzepte)
    for i, k in enumerate(konzepte):
        print("[%d] %s (%s) - Score %s"
              % (i, k.get("titel", ""), k.get("genre", ""), k.get("potenzial_score", "?")))
        print("    Praemisse: %s" % k.get("praemisse", ""))
        print("    USP: %s" % k.get("usp", ""))
    print()

    # --- Stufe 3: bestes Konzept waehlen ---
    print("[3/5] Waehle das aussichtsreichste Konzept ...\n")
    bestes = waehle_bestes(client, konzepte)
    print("Gewaehlt: %s (%s) - Score %s"
          % (bestes.get("titel", ""), bestes.get("genre", ""),
             bestes.get("potenzial_score", "?")))
    if bestes.get("_auswahl_begruendung"):
        print("Begruendung: %s" % bestes["_auswahl_begruendung"])
    print()

    # --- Stufe 4: vollstaendige roman.json bauen ---
    print("[4/5] Baue vollstaendige Plot-Bibel (roman.json) ...\n")
    roman = baue_roman_json(client, bestes)
    with open(konzept_pfad, "w", encoding="utf-8") as f:
        json.dump(roman, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Plot-Bibel geschrieben: %s" % konzept_pfad)
    print("  Titel:   %s" % roman.get("titel", ""))
    print("  Genre:   %s" % roman.get("genre", ""))
    print("  Figuren: %d | Kapitel: %d"
          % (len(roman.get("figuren", [])), len(roman.get("kapitel", []))))
    print()

    if args.nur_konzept:
        print("--nur-konzept: stoppe nach der Plot-Bibel. "
              "Kapitel schreiben mit:\n"
              "    python3 schreibe_roman.py --roman %s --out %s"
              % (konzept_pfad, kapitel_dir))
        return

    # --- Stufe 5: Kapitel schreiben ---
    if not args.ja:
        print("Bereit, alle Kapitel zu schreiben. ENTER zum Fortfahren, "
              "Strg-C zum Abbrechen.")
        try:
            input()
        except (EOFError, KeyboardInterrupt):
            print("\nAbgebrochen. Die Plot-Bibel liegt bereit unter %s." % konzept_pfad)
            return

    print("[5/5] Schreibe Kapitel ...")
    code = schreibe_alle_kapitel(konzept_pfad, kapitel_dir)
    if code != 0:
        sys.exit("! schreibe_roman.py endete mit Fehlercode %d." % code)
    print("\nFertig. Plot-Bibel: %s | Kapitel: %s" % (konzept_pfad, kapitel_dir))


if __name__ == "__main__":
    main()
