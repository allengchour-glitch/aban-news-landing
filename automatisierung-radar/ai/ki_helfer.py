#!/usr/bin/env python3
"""Automatisierungs-Radar — KI-Helfer (Claude API, Aban-Voice, erfindet nichts).

Drei Werkzeuge unter einem Dach. Alle nutzen das Anthropic-SDK (Modell
claude-opus-4-8) mit einem STABILEN, gecachten System-Präfix (Aban-Voice +
Integritätsregeln), damit wiederholte Aufrufe günstig bleiben.

  recherche   Entwirft für ein reales Tool (Name + offizielle URL) die Faktenfelder
              — Kategorie, Themen, Integrationen, Preismodell, EU-Hosting-Einschätzung.
              Alles als '[Redaktion: prüfen]'-Entwurf; Preis & Bewertung bleiben null.
  content     Generiert Marketing-Bausteine aus den echten Daten (Newsletter-Teaser,
              'Tool des Monats', Social-Post) in Aban-Voice (anti-hype, du-Form).
  audit       Daten-Wächter: erzeugt je Tool eine Prüf-Checkliste (Fragen, KEINE
              Behauptungen) — was könnte veraltet sein? Schreibt data/_audit.json.

WICHTIG (Markenregel): Die KI erfindet keine Preise, Bewertungen oder Fakten. Sie
liefert Entwürfe und Prüf-Fragen; ein Mensch verifiziert und schaltet erst dann live.

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY="sk-ant-..."

Beispiele:
    python3 ai/ki_helfer.py recherche --name "Zoho Flow" --url https://www.zoho.com/flow/
    python3 ai/ki_helfer.py recherche --name "Nintex" --url https://www.nintex.com/ --add
    python3 ai/ki_helfer.py content --typ newsletter
    python3 ai/ki_helfer.py content --typ tool-des-monats --id n8n
    python3 ai/ki_helfer.py audit
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA = ROOT / "data" / "anbieter.json"

MODELL = "claude-opus-4-8"

# Stabiler System-Präfix → wird per cache_control gecacht (günstige Wiederholungen).
ABAN_VOICE = """Du bist Redaktions-Assistent für „aban news" und den Automatisierungs-Radar
(automatisierung.abannews.com), einen ehrlichen DACH-Vergleich von KI- & Workflow-
Automatisierungs-Tools.

Aban-Voice (zwingend):
- Pragmatisch, direkt, anti-hype. Keine Buzzwords, keine Superlative, keine Hype-Floskeln
  („revolutionär", „bahnbrechend", „nahtlos", „kinderleicht", „Game-Changer", „disruptiv").
- Durchgehend die du-Form. Keine Mehrfach-Ausrufezeichen.
- Lieber konkret und nüchtern als werblich. Nenne auch Grenzen/Nachteile ehrlich.

Integritätsregeln (zwingend, nicht verhandelbar):
- Erfinde NIE Preise, Bewertungen oder konkrete Konditionen. Wenn du etwas nicht sicher
  weißt, lass das Feld leer/null oder markiere es mit „[Redaktion: prüfen]".
- EU-Hosting (eu_lager) und deutsche Oberfläche (deutsche_oberflaeche) nur auf true/false
  setzen, wenn du dir sehr sicher bist — sonst null.
- Keine Quellen erfinden. Beziehe dich nur auf allgemein bekannte, überprüfbare Fakten."""


def get_client():
    try:
        import anthropic
    except ImportError:
        sys.exit("! Paket fehlt. Installiere es mit:  pip install anthropic")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit('! Kein API-Key. Setze ihn:\n    export ANTHROPIC_API_KEY="sk-ant-..."')
    return anthropic.Anthropic()


def cached_system(extra: str = ""):
    """System als Block-Liste: Aban-Voice gecacht, optionaler Kontext angehängt."""
    blocks = [{"type": "text", "text": ABAN_VOICE, "cache_control": {"type": "ephemeral"}}]
    if extra:
        blocks.append({"type": "text", "text": extra})
    return blocks


def load_db():
    return json.loads(DATA.read_text(encoding="utf-8"))


def first_text(antwort):
    for block in antwort.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


# ---------------------------------------------------------------- recherche -----

def cmd_recherche(args):
    db = load_db()
    kategorien = db.get("kategorien", [])
    fokus = db.get("fokus", [])
    client = get_client()

    schema = {
        "type": "object",
        "additionalProperties": False,
        "required": ["anbieter", "sprache", "fokus", "kategorie", "themen", "format",
                     "integration", "deutsche_oberflaeche", "eu_lager", "preismodell",
                     "aban_note"],
        "properties": {
            "anbieter": {"type": "string", "description": "Firmenname hinter dem Tool, sonst '[Redaktion: prüfen]'"},
            "sprache": {"type": "array", "items": {"type": "string"}},
            "fokus": {"type": "string", "enum": fokus},
            "kategorie": {"type": "array", "items": {"type": "string", "enum": kategorien}, "minItems": 1},
            "themen": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
            "format": {"type": "string"},
            "integration": {"type": "array", "items": {"type": "string"}, "maxItems": 7},
            "deutsche_oberflaeche": {"type": ["boolean", "null"]},
            "eu_lager": {"type": ["boolean", "null"]},
            "preismodell": {"type": ["string", "null"],
                            "description": "z.B. 'pro Task', 'pro Operation', 'nach Laufzeit', 'Credits', 'auf Anfrage', 'Self-Hosting / Abo'"},
            "aban_note": {"type": "string", "description": "1-2 Sätze, ehrliche Einordnung in Aban-Voice (anti-hype, du-Form), inkl. einer Grenze/Einschränkung"},
        },
    }
    user = (f"Tool: {args.name}\nOffizielle URL: {args.url}\n\n"
            f"Entwirf die Faktenfelder für diesen realen Anbieter. Nutze nur, was du mit "
            f"hoher Sicherheit weißt. Unsichere boolesche Felder → null. Preis/Bewertung "
            f"werden NICHT abgefragt (bleiben null). Wähle Kategorie(n) und Fokus aus den "
            f"erlaubten Werten.")
    antwort = client.messages.create(
        model=MODELL, max_tokens=2000, thinking={"type": "adaptive"},
        system=cached_system(), messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}})
    draft = json.loads(first_text(antwort))

    def slug(s):
        s = s.lower()
        for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
            s = s.replace(a, b)
        import re
        return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "x"

    stub = {
        "id": slug(args.name), "name": args.name,
        "anbieter": draft.get("anbieter") or "[Redaktion: prüfen]",
        "url": args.url, "sprache": draft.get("sprache", []),
        "fokus": draft.get("fokus"), "kategorie": draft.get("kategorie", []),
        "themen": draft.get("themen", []), "format": draft.get("format", "[Redaktion: prüfen]"),
        "integration": draft.get("integration", []),
        "deutsche_oberflaeche": draft.get("deutsche_oberflaeche"),
        "eu_lager": draft.get("eu_lager"),
        "preis_eur": None,
        "preis_hinweis": "[Redaktion: prüfen] — Preis beim Anbieter verifizieren, nicht schätzen.",
        "preismodell": draft.get("preismodell"),
        "worth_it_score": None,
        "aban_note": "[Redaktion: prüfen] — " + (draft.get("aban_note") or "").strip(),
    }
    print(json.dumps(stub, ensure_ascii=False, indent=2))
    print("\n# Entwurf — vor dem Live-Schalten prüfen (eu_lager, deutsche_oberflaeche, "
          "Preismodell, Integrationen). Preis/Bewertung bleiben null.", file=sys.stderr)

    if args.add:
        out = ROOT / "data" / "_vorschlaege.json"
        payload = json.loads(out.read_text(encoding="utf-8")) if out.exists() else \
            {"_hinweis": "KI-Entwürfe — Mensch prüft.", "vorschlaege": []}
        payload.setdefault("vorschlaege", [])
        if any(v.get("id") == stub["id"] for v in payload["vorschlaege"]):
            print(f"\n(schon in _vorschlaege.json: {stub['id']})", file=sys.stderr)
        else:
            payload["vorschlaege"].append({**stub, "_quelle": "ki_helfer recherche"})
            payload["generated"] = date.today().isoformat()
            payload["offen"] = len(payload["vorschlaege"])
            out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"\n→ ergänzt in {out}", file=sys.stderr)


# ------------------------------------------------------------------ content -----

def cmd_content(args):
    db = load_db()
    tools = db.get("anbieter", [])
    client = get_client()
    # Kompakte, faktische Datengrundlage (kein Preis/Score → kann nichts erfinden).
    compact = [{k: t.get(k) for k in ("name", "anbieter", "fokus", "kategorie",
                                      "eu_lager", "deutsche_oberflaeche", "preismodell")}
               for t in tools]
    if args.id:
        compact = [t for t in compact if t["name"] and
                   any(x.get("id") == args.id for x in tools if x["name"] == t["name"])] or compact
        sel = next((t for t in tools if t.get("id") == args.id), None)
        if not sel:
            sys.exit(f"! Tool-id '{args.id}' nicht gefunden.")
    data_block = ("Datengrundlage (nur diese Fakten verwenden, nichts hinzuerfinden):\n"
                  + json.dumps(compact, ensure_ascii=False))
    aufgaben = {
        "newsletter": "Schreibe einen kurzen Newsletter-Teaser (max. 90 Wörter), der den "
                      "Automatisierungs-Radar vorstellt und Lust macht, reinzuschauen. "
                      "Betone den ehrlichen DACH-/EU-Hosting-Blickwinkel.",
        "tool-des-monats": f"Schreibe einen Abschnitt 'Tool des Monats' um das Tool mit id "
                           f"'{args.id}'. 60-110 Wörter, ehrlich, mit einer konkreten Stärke "
                           f"und einer Einschränkung. Keine erfundenen Zahlen.",
        "social": "Schreibe 2 kurze LinkedIn-Posts (je max. 70 Wörter) über die Auswahl des "
                  "richtigen Automatisierungs-Tools, die auf den Radar verweisen. Maximal 3 "
                  "Hashtags pro Post, keine Hype-Sprache.",
    }
    user = f"{data_block}\n\nAufgabe: {aufgaben[args.typ]}"
    antwort = client.messages.create(
        model=MODELL, max_tokens=1500, thinking={"type": "adaptive"},
        system=cached_system(), messages=[{"role": "user", "content": user}])
    print(first_text(antwort).strip())
    print("\n# Entwurf — vor dem Veröffentlichen gegen die Aban-Sperrliste prüfen:\n"
          "#   python3 ../tools/brand-voice-linter.py DATEI.md --strict", file=sys.stderr)


# -------------------------------------------------------------------- audit -----

def cmd_audit(args):
    db = load_db()
    tools = db.get("anbieter", [])
    client = get_client()
    compact = [{k: t.get(k) for k in ("id", "name", "anbieter", "url", "fokus",
                                      "kategorie", "eu_lager", "deutsche_oberflaeche",
                                      "preismodell")} for t in tools]
    schema = {
        "type": "object", "additionalProperties": False, "required": ["pruefliste"],
        "properties": {"pruefliste": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["id", "risiko", "zu_pruefen"],
            "properties": {
                "id": {"type": "string"},
                "risiko": {"type": "string", "enum": ["niedrig", "mittel", "hoch"]},
                "zu_pruefen": {"type": "array", "items": {"type": "string"}, "maxItems": 4,
                               "description": "konkrete Verifikations-FRAGEN, keine Behauptungen"},
            }}}},
    }
    user = ("Hier die aktuellen Stammdaten der gelisteten Tools (ohne Preis/Score):\n"
            + json.dumps(compact, ensure_ascii=False)
            + "\n\nDu bist Daten-Wächter. Erzeuge je Tool eine kurze PRÜF-Checkliste: Welche "
              "Angaben könnten veraltet/falsch sein und sollten gegen die offizielle Seite "
              "geprüft werden (z. B. Anbieter umbenannt/übernommen, EU-Hosting geändert, "
              "Preismodell gewechselt, Produkt eingestellt)? Formuliere FRAGEN, keine "
              "Behauptungen. Behaupte nichts, was du nicht sicher weißt. 'risiko' grob "
              "einschätzen. Nur Tools mit echtem Prüfbedarf aufnehmen.")
    antwort = client.messages.create(
        model=MODELL, max_tokens=4000, thinking={"type": "adaptive"},
        system=cached_system(), messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}})
    result = json.loads(first_text(antwort))
    payload = {"_hinweis": "KI-Prüf-Checkliste (Fragen, keine Fakten). Mensch verifiziert "
                           "gegen die offizielle Anbieterseite.",
               "generated": date.today().isoformat(),
               "pruefliste": result.get("pruefliste", [])}
    out = Path(args.out)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    n = len(payload["pruefliste"])
    print(f"Daten-Wächter: {n} Tools mit Prüfbedarf → {out}")
    for e in payload["pruefliste"]:
        print(f"  [{e['risiko']}] {e['id']}: " + "; ".join(e["zu_pruefen"]))


def main():
    ap = argparse.ArgumentParser(description="Automatisierungs-Radar KI-Helfer (Claude API)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("recherche", help="Faktenfelder für ein reales Tool entwerfen")
    p.add_argument("--name", required=True)
    p.add_argument("--url", required=True)
    p.add_argument("--add", action="store_true", help="Entwurf an data/_vorschlaege.json anhängen")
    p.set_defaults(func=cmd_recherche)

    p = sub.add_parser("content", help="Marketing-Baustein aus den Daten generieren")
    p.add_argument("--typ", choices=["newsletter", "tool-des-monats", "social"], required=True)
    p.add_argument("--id", help="Tool-id (für tool-des-monats)")
    p.set_defaults(func=cmd_content)

    p = sub.add_parser("audit", help="Daten-Wächter: Prüf-Checkliste erzeugen")
    p.add_argument("--out", default=str(ROOT / "data" / "_audit.json"))
    p.set_defaults(func=cmd_audit)

    args = ap.parse_args()
    if args.cmd == "content" and args.typ == "tool-des-monats" and not args.id:
        ap.error("--id wird für --typ tool-des-monats benötigt")
    args.func(args)


if __name__ == "__main__":
    main()
