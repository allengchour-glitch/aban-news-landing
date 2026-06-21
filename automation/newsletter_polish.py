#!/usr/bin/env python3
# =============================================================================
#  newsletter_polish — schleift DEINEN Newsletter-Text mit der Gratis-KI
# -----------------------------------------------------------------------------
#  Markenkonform & ehrlich: verbessert nur Sprache/Struktur deines eigenen Textes
#  und ERFINDET KEINE Fakten, Zahlen, Namen oder Quellen. Liefert zusätzlich
#  3 nüchterne Betreffzeilen und optional eine englische Übersetzung.
#
#  🔐 API-Key NUR aus der Umgebung (z. B. GROQ_API_KEY, gratis). Keine Pakete.
#
#  Aufruf:
#    GROQ_API_KEY=… python3 automation/newsletter_polish.py entwurf.md
#    echo "Roh-Text" | python3 automation/newsletter_polish.py - --en
#    python3 automation/newsletter_polish.py entwurf.md --out fertig.md
# =============================================================================

import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import freegen_ai

NO_INVENT = ("WICHTIG: Erfinde KEINE Fakten, Zahlen, Daten, Namen, Preise oder Quellen. "
             "Verwende ausschliesslich Informationen aus dem gegebenen Text. Wenn etwas fehlt, "
             "erfinde es NICHT, sondern lass es weg. Anti-Hype, ehrlich, du-Form, klares Deutsch.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="Textdatei oder '-' für stdin")
    ap.add_argument("--out", help="Ergebnis zusätzlich in Datei schreiben")
    ap.add_argument("--en", action="store_true", help="zusätzlich englische Übersetzung")
    a = ap.parse_args()

    text = sys.stdin.read() if a.input == "-" else open(a.input, encoding="utf-8").read()
    text = text.strip()
    if not text:
        sys.exit("❌ Kein Text.")
    if not freegen_ai.available():
        sys.exit("❌ Kein LLM-Key in der Umgebung. Setz z. B. GROQ_API_KEY (gratis).")

    prov = (freegen_ai.provider() or ["?"])[0]
    parts = []

    polished = freegen_ai.chat(
        "Verbessere den folgenden Newsletter-Text: klarer, flüssiger, anti-hype, gleiche Sprache. "
        + NO_INVENT + " Gib NUR den überarbeiteten Text zurück.\n\n\"\"\"\n" + text + "\n\"\"\"",
        system="Du bist erfahrener deutscher Newsletter-Redakteur (anti-hype, ehrlich).")
    parts.append("## Überarbeiteter Text\n\n" + (polished or "(KI nicht erreichbar)"))

    subjects = freegen_ai.chat(
        "Schreibe 3 nüchterne, ehrliche Betreffzeilen (je max 60 Zeichen, kein Clickbait, keine "
        "erfundenen Zahlen) für diesen Newsletter. Nur die 3 Zeilen, je eine pro Zeile.\n\n"
        + (polished or text)[:2500],
        system="Du schreibst sachliche E-Mail-Betreffzeilen.", max_tokens=200)
    if subjects:
        parts.append("## Betreff-Varianten\n\n" + subjects.strip())

    if a.en:
        en = freegen_ai.chat(
            "Übersetze den folgenden Newsletter natürlich ins Englische (nicht wörtlich), gleiche "
            "Fakten, anti-hype. " + NO_INVENT + " Gib nur die Übersetzung.\n\n\"\"\"\n"
            + (polished or text) + "\n\"\"\"",
            system="You are a professional DE→EN newsletter translator.")
        parts.append("## English version\n\n" + (en or "(KI nicht erreichbar)"))

    result = ("\n\n".join(parts)).strip()
    print(f"\n— newsletter_polish · {prov} —\n")
    print(result)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(result + "\n")
        print(f"\n✅ gespeichert: {a.out}")


if __name__ == "__main__":
    main()
