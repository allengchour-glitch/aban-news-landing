#!/usr/bin/env python3
"""Kommentar-CSV lokal auswerten; Antwortentwürfe und manuelle Prüffälle ausgeben."""
import argparse
import csv
import json
from pathlib import Path
import re
from assistent import tabellenwert

PLATTFORMEN = {"instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "threads", "andere"}


def wissen_lesen(pfad):
    if Path(pfad).stat().st_size > 100000:
        raise ValueError("FAQ-Datei ist zu gross.")
    data = json.loads(Path(pfad).read_text(encoding="utf-8"))
    faq = data.get("faq") if isinstance(data, dict) else None
    if not isinstance(faq, list) or len(faq) > 100:
        raise ValueError("FAQ-Datei braucht eine Liste faq mit höchstens 100 Einträgen.")
    for item in faq:
        if not isinstance(item, dict):
            raise ValueError("Ungültiger FAQ-Eintrag.")
        keys, antwort = item.get("stichwoerter"), item.get("antwort")
        if (not isinstance(keys, list) or not keys or len(keys) > 20
                or any(not isinstance(k, str) or not k.strip() or len(k) > 80 for k in keys)
                or not isinstance(antwort, str) or not antwort.strip() or len(antwort) > 1500):
            raise ValueError("FAQ braucht Stichwörter und eine Antwort mit höchstens 1500 Zeichen.")
    return faq


def beurteilen(text, faq):
    t = text.casefold()
    # Persönliche Daten nie in einer vorgeschlagenen öffentlichen Antwort wiederholen.
    if re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+\d[\d ()/-]{7,}\d)|\b(?:0\d[\d ()/-]{7,}\d)", t) or re.search(r"\b(bestellnummer|auftragsnummer|telefonnummer|meine adresse|meine anschrift|iban)\b", t):
        return "persoenliche_daten", "Manuell prüfen", ""
    if re.search(r"\b(betrug|abzocke|reklamation|beschwerde|defekt|kaputt|enttäuscht|schlecht)\b|nicht zufrieden|nicht gut|nie angekommen", t):
        return "beschwerde", "Manuell prüfen", "Danke für deinen Hinweis. Bitte kontaktiere uns über einen privaten Kontaktweg, damit wir den Fall zuordnen können."
    if re.search(r"https?://", t) and re.search(r"gratis geld|verdiene|krypto|gewinnspiel", t):
        return "spamverdacht", "Manuell prüfen", ""
    treffer = [i for i in faq if any(re.search(r"(?<!\w)" + re.escape(k.strip().casefold()) + r"(?!\w)", t) for k in i["stichwoerter"])]
    if len(treffer) == 1:
        return "faq", "Entwurf prüfen", treffer[0]["antwort"]
    if len(treffer) > 1:
        return "mehrere_fragen", "Manuell prüfen", ""
    if "?" in t or re.search(r"\b(preis|kosten|lieferung|versand|wann|wo|wie|warum|welche|welcher|wieviel)\b", t):
        return "offene_frage", "Manuell prüfen", ""
    if re.search(r"\b(danke|super|toll|klasse|grossartig|großartig)\b", t):
        return "lob", "Entwurf prüfen", "Vielen Dank für dein Feedback!"
    return "unklar", "Manuell prüfen", ""


def verarbeiten(eingabe, ausgabe, wissen):
    faq = wissen_lesen(wissen)
    with Path(eingabe).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not {"id", "plattform", "text"}.issubset(reader.fieldnames or []):
            raise ValueError("CSV braucht id, plattform und text.")
        rows, ids = [], set()
        for nummer, row in enumerate(reader, 2):
            if nummer > 5001:
                raise ValueError("Höchstens 5000 Kommentare pro Stapel.")
            if None in row or any(not isinstance(row.get(k), str) or not row[k].strip() for k in ("id", "plattform", "text")):
                raise ValueError(f"Ungültige CSV-Zeile {nummer}.")
            ident, plattform = row["id"].strip(), row["plattform"].strip().casefold()
            if ident in ids or len(ident) > 200 or len(row["text"]) > 10000 or plattform not in PLATTFORMEN:
                raise ValueError(f"Kennung, Text oder Plattform in Zeile {nummer} ungültig.")
            ids.add(ident)
            kat, status, antwort = beurteilen(row["text"], faq)
            rows.append({"id": ident, "plattform": plattform, "kategorie": kat, "status": status, "antwortentwurf": antwort})
    if not rows:
        raise ValueError("Keine Kommentare enthalten.")
    out = Path(ausgabe)
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; neuen Ordner wählen.")
    out.mkdir(parents=True)
    with (out / "antwortentwuerfe.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows({k: tabellenwert(v) for k, v in r.items()} for r in rows)
    bericht = {"kommentare": len(rows), "entwurf_pruefen": sum(r["status"] == "Entwurf prüfen" for r in rows),
               "manuell_pruefen": sum(r["status"] == "Manuell prüfen" for r in rows), "veroeffentlicht": 0,
               "verfahren": "Feste Regeln und bereitgestellte FAQ; kein Sprachmodell"}
    (out / "bericht.json").write_text(json.dumps(bericht, ensure_ascii=False, indent=2), encoding="utf-8")
    return bericht


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("eingabe", type=Path)
    parser.add_argument("ausgabe", type=Path)
    parser.add_argument("--wissen", required=True, type=Path)
    args = parser.parse_args()
    try:
        bericht = verarbeiten(args.eingabe, args.ausgabe, args.wissen)
    except (ValueError, OSError, csv.Error) as e:
        parser.exit(2, "Abbruch: " + str(e) + "\n")
    print(json.dumps(bericht, ensure_ascii=False))
