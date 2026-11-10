"""Zeitlich korrekte News-Merkmale für Offline-Forschung, niemals Brokeraufträge."""
from datetime import datetime, timedelta, timezone
import math
import re
import unicodedata


def zeit(value):
    if not isinstance(value, str):
        raise ValueError("Zeitstempel muss eine ISO-Zeichenkette sein")
    z = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if z.tzinfo is None or z.utcoffset() is None:
        raise ValueError("Zeitstempel braucht eine explizite Zeitzone")
    return z.astimezone(timezone.utc)


def _inhalt(row):
    """Gleiche normalisierte Überschrift zählt auch quellenübergreifend nur einmal."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", row["headline"]).casefold()).strip()


def pruefen(rows, entscheidungszeit, symbol, max_alter_stunden=72):
    """Wählt nur damals bekannte Artikel desselben Modells und derselben Wertschrift.

    Klassifikationswerte müssen bereits vorliegen; kein Modell wird geladen oder
    als kalibriert behauptet. Das Mittel deduplizierter Einzelwahrscheinlichkeiten
    ist keine Gewinnwahrscheinlichkeit und erteilt keine Handelsfreigabe.
    """
    if not isinstance(rows, list) or not isinstance(symbol, str) or not symbol.strip():
        raise ValueError("Nachrichtenliste und Symbol erforderlich")
    if (isinstance(max_alter_stunden, bool) or not isinstance(max_alter_stunden, (int, float))
            or not math.isfinite(max_alter_stunden) or not 0 < max_alter_stunden <= 8760):
        raise ValueError("Ungültiges Nachrichten-Altersfenster")
    jetzt = zeit(entscheidungszeit)
    grenze = jetzt - timedelta(hours=max_alter_stunden)
    verworfen = {k: 0 for k in ("ungueltig", "anderes_symbol", "zukunft", "zu_alt", "duplikat")}
    valid = []
    klassen = ("positive", "negative", "neutral")
    for row in rows:
        try:
            if not isinstance(row, dict):
                raise ValueError("Nachricht ist kein Objekt")
            for feld in ("id", "headline", "symbol", "source", "model_id"):
                if not isinstance(row.get(feld), str) or not row[feld].strip():
                    raise ValueError("Fehlende Nachrichtenherkunft")
            publ, empfang = zeit(row.get("published_at")), zeit(row.get("available_at"))
            bewertet, trainiert = zeit(row.get("scored_at")), zeit(row.get("model_trained_until"))
            if empfang < publ or bewertet < empfang or trainiert > bewertet:
                raise ValueError("Unmögliche Reihenfolge von Veröffentlichung, Empfang, Modell und Bewertung")
            probs = row.get("probabilities")
            if not isinstance(probs, dict) or set(probs) != set(klassen):
                raise ValueError("Drei Klassenwahrscheinlichkeiten erforderlich")
            if any(isinstance(v, bool) or not isinstance(v, (int, float))
                   or not math.isfinite(v) or not 0 <= v <= 1 for v in probs.values()):
                raise ValueError("Ungültige Klassenwahrscheinlichkeit")
            if not math.isclose(sum(probs.values()), 1, abs_tol=1e-6, rel_tol=0):
                raise ValueError("Klassenwahrscheinlichkeiten müssen sich zu 1 summieren")
            if row["symbol"] != symbol:
                verworfen["anderes_symbol"] += 1
            elif publ > jetzt or empfang > jetzt or bewertet > jetzt or trainiert > jetzt:
                verworfen["zukunft"] += 1
            elif publ < grenze:
                verworfen["zu_alt"] += 1
            else:
                valid.append((bewertet, publ, row))
        except (ValueError, TypeError, OverflowError):
            verworfen["ungueltig"] += 1
    # Chronologische erste Beobachtung gewinnt; Inputreihenfolge darf nicht wählen.
    valid.sort(key=lambda x: (x[0], x[1], x[2]["source"], x[2]["id"], x[2]["model_id"], _inhalt(x[2]),
                              tuple(x[2]["probabilities"][k] for k in klassen)))
    ids, headlines, genutzt = set(), set(), []
    for _, _, row in valid:
        key, headline = (row["source"], row["id"]), _inhalt(row)
        if key in ids or headline in headlines:
            verworfen["duplikat"] += 1
            continue
        ids.add(key)
        headlines.add(headline)
        genutzt.append(row)
    modelle = sorted({r[2]["model_id"] for r in valid})
    gemischt = len(modelle) > 1
    probs = ({k: sum(r["probabilities"][k] for r in genutzt) / len(genutzt) for k in klassen}
             if genutzt and not gemischt else None)
    return {"status": "verschiedene_modelle_nicht_vergleichbar" if gemischt else
                      "historisches_merkmal" if genutzt else "keine_verwendbaren_nachrichten",
            "entscheidungszeit_utc": jetzt.isoformat(), "symbol": symbol,
            "verwendet": len(genutzt), "verworfen": verworfen, "modelle": modelle,
            "mittel_klassenwahrscheinlichkeiten": probs,
            "stimmungswert": probs["positive"] - probs["negative"] if probs else None,
            "belege": [{k: r[k] for k in ("id", "source", "published_at", "available_at", "scored_at", "model_trained_until", "model_id")}
                       for r in genutzt],
            "handelsfreigabe": False,
            "grenze": "Keine kalibrierte Kurs-/Gewinnprognose. Deklarierte Zeitstempel geprüft, Modellprovenienz nicht bewiesen. Semantische Duplikate nicht vollständig erkannt."}
