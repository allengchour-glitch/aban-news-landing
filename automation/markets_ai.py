#!/usr/bin/env python3
"""Aban News — Märkte-KI-Sentiment (Gemini).

Liest data/markets.json (Kurse + wert-spezifische News von markets_fetch.py) und
ergänzt pro Wert ein experimentelles Sentiment (bullish/neutral/bearish) + kurze
Begründung + Signal-Text — auf Basis der wert-spezifischen Nachrichtenlage.

Nutzt den vorhandenen Gemini-Helper (automation/gemini_text.py → Vertex/Developer-API,
GEMINI_API_KEY bzw. GCP_SA_KEY). KEIN neuer Key nötig, praktisch gratis.

WICHTIG: KEINE Anlageberatung. Der Prompt zwingt zu sachlicher Einordnung,
nie zu Kauf-/Verkaufsempfehlungen.

No-op-sicher: ohne Gemini-Credentials passiert nichts (CI bricht nie).

Nutzung:
    GEMINI_API_KEY=... python automation/markets_ai.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "markets.json"
sys.path.insert(0, str(HERE))  # Geschwister-Modul gemini_text

SYSTEM = (
    "Du bist ein nüchterner Finanz-Markt-Analyst für die deutschsprachige News-Seite "
    "aban news. Fasse pro Wert die AKTUELLE wert-spezifische Nachrichtenlage zu einer "
    "Stimmung zusammen — bullish, neutral oder bearish — mit kurzer, sachlicher Begründung "
    "auf Deutsch (du-Form, ohne Hype).\n"
    "STRIKTE REGELN:\n"
    "- KEINE Anlageberatung. Niemals 'kaufen', 'verkaufen', 'einsteigen' o.ä. empfehlen.\n"
    "- 'signal' = kurze, neutrale Lage-Einordnung (max. 12 Wörter), KEIN Handelsbefehl.\n"
    "- 'rationale' = 1-2 Sätze, konkret auf die wert-spezifischen News bezogen (für die Übersichtskarte).\n"
    "- 'analysis' = 3 KURZE, tiefere Stichpunkte für die Detailseite, jeweils mit Präfix: "
    "'Treiber: …' (was die Lage gerade bewegt), 'Risiko: …' (was dagegen spricht/Unsicherheit), "
    "'Einordnung: …' (nüchterne Gesamtsicht, keine Empfehlung). Konkret auf die News bezogen.\n"
    "- 'confidence' (0-1) = wie klar die Nachrichtenlage ist (nicht: wie sicher ein Kurs steigt).\n"
    "- Bleib bei den gelieferten News; erfinde nichts. Bei dünner Lage: 'neutral', niedrige confidence, "
    "und in 'analysis' ehrlich vermerken, dass die Nachrichtenlage dünn ist."
)

JSON_HINT = (
    "\n\nAntworte AUSSCHLIESSLICH mit gültigem JSON in GENAU dieser Form "
    "(keine Markdown-Codeblöcke, kein Text drumherum):\n"
    '{"assets":[{"id":"<id>","sentiment":"bullish|neutral|bearish","confidence":0.0,'
    '"rationale":"...","signal":"...","analysis":["Treiber: …","Risiko: …","Einordnung: …"]}],'
    '"news":[{"index":0,"sentiment":"bullish|neutral|bearish"}]}'
)


def build_prompt(data: dict) -> str:
    lines = [SYSTEM, "", "Werte (id · Name · Typ · Preis · 24h%) — je mit wert-spezifischen News:"]
    for a in data.get("assets", []):
        price = a.get("price")
        chg = a.get("change_24h")
        lines.append(
            f"\n● {a['id']} · {a.get('name')} ({a.get('symbol')}) · {a.get('type')} · "
            f"{price if price is not None else 'n/a'} {a.get('currency', 'usd').upper()} · "
            f"{chg if chg is not None else 'n/a'}%"
        )
        for n in a.get("asset_news", [])[:5]:
            lines.append(f"   - {n.get('title')}")
    lines.append("\nAllgemeine Finanz-News-Schlagzeilen (mit Index):")
    for i, n in enumerate(data.get("news", [])[:10]):
        lines.append(f"{i}. [{n.get('source')}] {n.get('title')}")
    lines.append(
        "\nAufgabe:\n"
        "1) 'assets': für JEDEN Wert (gleiche id) ein Objekt. Jedes Objekt MUSS das Feld 'analysis' mit GENAU 3 Stichpunkten (Treiber/Risiko/Einordnung) enthalten — das ist PFLICHT, nicht weglassen. Stütze dich PRIMÄR auf die "
        "wert-spezifischen News, ergänzend auf 24h-Bewegung. rationale konkret auf diese News beziehen.\n"
        "2) 'news': pro allgemeiner Schlagzeile (gleicher index) ein Sentiment für den Gesamtmarkt; "
        "ohne klaren Bezug 'neutral'."
    )
    lines.append(JSON_HINT)
    return "\n".join(lines)


def parse_json(text: str):
    """Robust: entfernt ggf. ```json-Fences und extrahiert das erste JSON-Objekt."""
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.S)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", t, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


def main() -> int:
    if not DATA.exists():
        sys.stderr.write(f"Fehlt: {DATA}\n")
        return 1
    if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GCP_SA_KEY")):
        print("Keine Gemini-Credentials (GEMINI_API_KEY/GCP_SA_KEY) → KI-Sentiment übersprungen (No-op).")
        return 0

    try:
        from gemini_text import generate
    except Exception as ex:  # noqa: BLE001
        sys.stderr.write(f"gemini_text nicht ladbar ({ex}) → No-op.\n")
        return 0

    data = json.loads(DATA.read_text(encoding="utf-8"))
    if not data.get("assets"):
        print("Keine Assets → nichts zu tun.")
        return 0

    # thinking_budget=0 → volles Output-Budget, günstig/schnell für diese Batch-Aufgabe.
    text = generate(build_prompt(data), max_tokens=16000, temperature=0.3, thinking_budget=0)
    if not text:
        sys.stderr.write("Gemini lieferte keinen Text → Daten unverändert.\n")
        return 0

    parsed = parse_json(text)
    if not parsed:
        sys.stderr.write("Antwort nicht als JSON parsebar → Daten unverändert.\n")
        return 0

    by_id = {a.get("id"): a for a in parsed.get("assets", []) if isinstance(a, dict)}
    updated = 0
    for a in data["assets"]:
        r = by_id.get(a["id"])
        if not r:
            continue
        if r.get("sentiment") in ("bullish", "neutral", "bearish"):
            a["sentiment"] = r["sentiment"]
        conf = r.get("confidence")
        if isinstance(conf, (int, float)):
            a["confidence"] = max(0.0, min(1.0, float(conf)))
        if r.get("rationale"):
            a["rationale"] = str(r["rationale"]).strip()
        if r.get("signal"):
            a["signal"] = str(r["signal"]).strip()
        if isinstance(r.get("analysis"), list):
            a["analysis"] = [str(x).strip() for x in r["analysis"] if str(x).strip()][:4]
        updated += 1

    news = data.get("news", [])
    for item in parsed.get("news", []):
        if not isinstance(item, dict):
            continue
        idx, sent = item.get("index"), item.get("sentiment")
        if isinstance(idx, int) and 0 <= idx < len(news) and sent in ("bullish", "neutral", "bearish"):
            news[idx]["sentiment"] = sent

    model = (os.environ.get("GEMINI_MODEL") or os.environ.get("VERTEX_TEXT_MODEL")
             or "gemini-2.5-flash")
    data["ai_engine"] = model
    data["last_updated"] = date.today().isoformat()
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KI-Sentiment aktualisiert: {updated}/{len(data['assets'])} Werte (Gemini: {model}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
