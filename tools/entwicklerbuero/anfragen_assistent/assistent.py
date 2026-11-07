#!/usr/bin/env python3
"""Lokaler Anfragen-Assistent: CSV lesen, sortieren und Antwortentwürfe erstellen."""
import argparse
import csv
import json
import re
from pathlib import Path

VERSION = "0.1.0"
REGELN = [
    ("reklamation", r"\b(reklamation|beschwerde|mangel|defekt|kaputt|retoure|rückgabe)\b"),
    ("rechnung", r"\b(rechnung|zahlung|mahnung|gutschrift)\b"),
    ("offerte", r"\b(offerte|angebot|kostenvoranschlag|preis|kosten)\b"),
    ("termin", r"\b(termin|besichtigung|verfügbarkeit|reservierung)\b"),
]
FRAGEN = {
    "reklamation": "Bitte beschreiben Sie den Mangel und nennen Sie die Auftragsnummer. Ein Foto kann bei der Prüfung helfen.",
    "rechnung": "Bitte nennen Sie die Rechnungsnummer und beschreiben Sie, welche Position oder Zahlung geklärt werden soll.",
    "offerte": "Bitte nennen Sie den gewünschten Leistungsumfang, den Ausführungsort und Ihren Wunschzeitraum.",
    "termin": "Bitte nennen Sie den gewünschten Ort und zwei passende Zeitfenster.",
    "allgemein": "Bitte beschreiben Sie kurz Ihr Anliegen und den gewünschten nächsten Schritt.",
}


def einordnen(betreff, nachricht):
    text = (betreff + " " + nachricht).casefold()
    kategorie = next((name for name, regex in REGELN if re.search(regex, text)), "allgemein")
    # Markiert Formulierungen nur zur Sichtung, bewertet keine tatsächliche Gefahr.
    dringend = bool(re.search(r"\b(dringend|notfall|wasserschaden|stromausfall|heute|sofort)\b", text))
    return kategorie, "zuerst prüfen" if dringend else "normal"


def entwurf(kategorie, firma):
    # Keine erfundenen Zusagen, Verfügbarkeiten, Rabatte oder Zahlungsbestätigungen.
    return ("Guten Tag\n\nVielen Dank für Ihre Nachricht.\n\n" + FRAGEN[kategorie]
            + "\n\nFreundliche Grüsse\n" + firma
            + "\n\n[Entwurf: Anliegen und bereits vorhandene Angaben vor dem Versand prüfen.]")


def lesen(pfad):
    with Path(pfad).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not {"id", "betreff", "nachricht"}.issubset(reader.fieldnames or []):
            raise ValueError("CSV braucht die Spalten id, betreff und nachricht.")
        rows, ids = [], set()
        for nummer, row in enumerate(reader, 2):
            if nummer > 5001:
                raise ValueError("Höchstens 5000 Anfragen pro Datei.")
            if None in row or any(row.get(k) is None for k in ("id", "betreff", "nachricht")):
                raise ValueError(f"Ungültige CSV-Zeile {nummer}.")
            ident = row["id"].strip()
            if not ident or ident in ids:
                raise ValueError(f"Leere oder doppelte Kennung in Zeile {nummer}.")
            if len(row["betreff"] + row["nachricht"]) > 20000:
                raise ValueError(f"Anfrage in Zeile {nummer} zu lang.")
            ids.add(ident)
            rows.append({"id": ident, "betreff": row["betreff"], "nachricht": row["nachricht"]})
        if not rows:
            raise ValueError("CSV enthält keine Anfragen.")
        return rows


def tabellenwert(text):
    # Unvertrauenswürdiger CSV-Inhalt darf beim Öffnen keine Tabellenformel werden.
    text = str(text)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) or text.startswith(("\t", "\r", "\n")) else text


def verarbeiten(eingabe, ausgabe, firma):
    if not firma.strip() or len(firma) > 120 or "\n" in firma or "\r" in firma:
        raise ValueError("Firmenname braucht 1 bis 120 Zeichen in einer Zeile.")
    rows = lesen(eingabe)  # Alles prüfen, bevor eine Ausgabe angelegt wird.
    out = Path(ausgabe)
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; bitte einen neuen wählen.")
    out.mkdir(parents=True)
    resultate = []
    for nummer, row in enumerate(rows, 1):
        kat, prioritaet = einordnen(row["betreff"], row["nachricht"])
        # Dateinamen stammen nie aus fremden Kennungen oder Betreffzeilen.
        datei = f"entwurf-{nummer:04d}.txt"
        (out / datei).write_text(entwurf(kat, firma), encoding="utf-8")
        resultate.append({"id": row["id"], "betreff": row["betreff"], "kategorie": kat,
                          "prioritaet": prioritaet, "entwurf": datei, "status": "Mensch prüft"})
    resultate.sort(key=lambda r: r["prioritaet"] != "zuerst prüfen")
    with (out / "uebersicht.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(resultate[0]))
        writer.writeheader()
        writer.writerows({k: tabellenwert(v) for k, v in row.items()} for row in resultate)
    bericht = {"version": VERSION, "anfragen": len(rows), "entwuerfe": len(resultate),
               "zur_sichtung": sum(r["prioritaet"] == "zuerst prüfen" for r in resultate),
               "versendet": 0, "verfahren": "Feste Wortregeln und Vorlagen; kein Sprachmodell"}
    (out / "bericht.json").write_text(json.dumps(bericht, ensure_ascii=False, indent=2), encoding="utf-8")
    return bericht


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("eingabe", type=Path)
    parser.add_argument("ausgabe", type=Path)
    parser.add_argument("--firma", required=True)
    args = parser.parse_args()
    try:
        bericht = verarbeiten(args.eingabe, args.ausgabe, args.firma)
    except (ValueError, OSError, csv.Error) as e:
        # Keine Anfrageinhalte im Terminal ausgeben.
        parser.exit(2, "Abbruch: " + str(e) + "\n")
    print(json.dumps(bericht, ensure_ascii=False))


if __name__ == "__main__":
    main()
