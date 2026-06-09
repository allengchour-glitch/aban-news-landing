#!/usr/bin/env python3
"""Aban News — Märkte-KI-Sentiment (Claude).

Liest data/markets.json (Kurse + News von markets_fetch.py) und ergänzt pro Wert
ein experimentelles Sentiment (bullish/neutral/bearish) + kurze Begründung + Signal-
Text — ausschliesslich auf Basis der aktuellen Nachrichtenlage und 24h-Bewegung.

WICHTIG: KEINE Anlageberatung. Der System-Prompt zwingt zu sachlicher Einordnung,
nie zu Kauf-/Verkaufsempfehlungen.

No-op-sicher: ohne ANTHROPIC_API_KEY passiert nichts (CI bricht nie). Modell: claude-opus-4-8.

Nutzung:
    ANTHROPIC_API_KEY=... python automation/markets_ai.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "markets.json"
MODEL = os.environ.get("MARKETS_AI_MODEL", "claude-opus-4-8")

SYSTEM = (
    "Du bist ein nüchterner Finanz-Markt-Analyst für die deutschsprachige News-Seite "
    "aban news. Deine Aufgabe: pro Wert die AKTUELLE Nachrichten- und Kurslage zu einer "
    "Stimmung zusammenfassen — bullish, neutral oder bearish — mit kurzer, sachlicher "
    "Begründung auf Deutsch (du-Form, ohne Hype).\n\n"
    "STRIKTE REGELN:\n"
    "- KEINE Anlageberatung. Niemals 'kaufen', 'verkaufen', 'einsteigen' o.ä. empfehlen.\n"
    "- 'signal' ist eine kurze, neutrale Lage-Einordnung (max. 12 Wörter), KEIN Handelsbefehl.\n"
    "- 'rationale' nennt den Grund aus der Nachrichten-/Kurslage (1-2 Sätze).\n"
    "- 'confidence' (0-1) drückt aus, wie klar die Nachrichtenlage ist — nicht wie sicher ein Kurs steigt.\n"
    "- Bleib bei den Fakten der gelieferten News; erfinde nichts.\n"
    "- Bei dünner Datenlage: sentiment 'neutral', confidence niedrig."
)

SCHEMA = {
    "type": "object",
    "properties": {
        "assets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "sentiment": {"type": "string", "enum": ["bullish", "neutral", "bearish"]},
                    "confidence": {"type": "number"},
                    "rationale": {"type": "string"},
                    "signal": {"type": "string"},
                },
                "required": ["id", "sentiment", "confidence", "rationale", "signal"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["assets"],
    "additionalProperties": False,
}


def build_prompt(data: dict) -> str:
    lines = ["Werte (id · Name · Typ · Preis · 24h%):"]
    for a in data.get("assets", []):
        price = a.get("price")
        chg = a.get("change_24h")
        lines.append(
            f"- {a['id']} · {a.get('name')} ({a.get('symbol')}) · {a.get('type')} · "
            f"{price if price is not None else 'n/a'} {a.get('currency','usd').upper()} · "
            f"{chg if chg is not None else 'n/a'}%"
        )
    lines.append("\nAktuelle Finanz-News-Schlagzeilen:")
    for n in data.get("news", [])[:10]:
        lines.append(f"- [{n.get('source')}] {n.get('title')}")
    lines.append(
        "\nGib für JEDEN Wert (gleiche id) ein Objekt im vorgegebenen Schema zurück. "
        "Ordne die News den passenden Werten zu; News ohne klaren Bezug ignorieren."
    )
    return "\n".join(lines)


def main() -> int:
    if not DATA.exists():
        sys.stderr.write(f"Fehlt: {DATA}\n")
        return 1
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Kein ANTHROPIC_API_KEY → KI-Sentiment übersprungen (No-op).")
        return 0

    try:
        import anthropic
    except ImportError:
        sys.stderr.write("anthropic SDK nicht installiert (pip install anthropic) → No-op.\n")
        return 0

    data = json.loads(DATA.read_text(encoding="utf-8"))
    if not data.get("assets"):
        print("Keine Assets in markets.json → nichts zu tun.")
        return 0

    client = anthropic.Anthropic()
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            system=SYSTEM,
            thinking={"type": "adaptive"},
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": SCHEMA},
            },
            messages=[{"role": "user", "content": build_prompt(data)}],
        )
    except Exception as ex:
        sys.stderr.write(f"Claude-Aufruf fehlgeschlagen ({ex}) → Daten unverändert.\n")
        return 0

    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        sys.stderr.write("Keine Textantwort von Claude → Daten unverändert.\n")
        return 0

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as ex:
        sys.stderr.write(f"Antwort nicht parsebar ({ex}) → Daten unverändert.\n")
        return 0

    by_id = {a["id"]: a for a in parsed.get("assets", [])}
    updated = 0
    for a in data["assets"]:
        r = by_id.get(a["id"])
        if not r:
            continue
        sent = r.get("sentiment")
        if sent in ("bullish", "neutral", "bearish"):
            a["sentiment"] = sent
        conf = r.get("confidence")
        if isinstance(conf, (int, float)):
            a["confidence"] = max(0.0, min(1.0, float(conf)))
        if r.get("rationale"):
            a["rationale"] = r["rationale"].strip()
        if r.get("signal"):
            a["signal"] = r["signal"].strip()
        updated += 1

    # News-Sentiment grob aus Asset-Stimmungen ableiten? Nein — News bleibt neutral,
    # ausser Claude liefert später explizit etwas. Wir markieren nur die Engine.
    data["ai_engine"] = MODEL
    data["last_updated"] = date.today().isoformat()
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KI-Sentiment aktualisiert: {updated}/{len(data['assets'])} Werte (Modell {MODEL}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
