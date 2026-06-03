#!/usr/bin/env python3
"""Aban News — Newsletter-Scheduler (Redaktionsplan-Queue).

Verwaltet eine einfache JSON-Queue geplanter Newsletter-Ausgaben und kann zu
einem geplanten Termin einen Ausgaben-ENTWURF erzeugen. Pure Standardbibliothek
(kein pip-Paket, kein Tracking).

WICHTIG: Erzeugt nur ENTWÜRFE. Versand bleibt beim Menschen (beehiiv). Es werden
keine Fakten erfunden — der Entwurf stammt aus der vorhandenen Werkbank-Logik,
die nur kuratierte Projektdaten verwendet.

Queue-Datei: automation/newsletter-queue.json
  Struktur: {"_readme": "...", "queue": [ {datum, tool_id, foerder_id, thema, status}, ... ]}
  status: "geplant" | "entwurf" | "versendet"

Befehle:
    python3 automation/newsletter_scheduler.py list
    python3 automation/newsletter_scheduler.py add --datum 2026-06-10 --tool-id claude \
        --thema "Claude im Praxistest" [--foerder-id kfw-gruenderkredit]
    python3 automation/newsletter_scheduler.py next
    python3 automation/newsletter_scheduler.py generate-for --datum 2026-06-10

`generate-for` ruft die vorhandene Werkbank (automation/werkbank.py issue) per
Subprocess auf, hängt den Queue-Kontext (Thema/IDs) als Kopf-Notiz an und schreibt
das Ergebnis nach automation/entwurf-scheduled.md. Best effort: schlägt die
Werkbank fehl, wird ein klarer Platzhalter-Entwurf mit Hinweis geschrieben statt
zu crashen. Falls ein Voice-Linter verfügbar ist, wird ein Score-Hinweis angehängt.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
QUEUE_PATH = HERE / "newsletter-queue.json"
DRAFT_PATH = HERE / "entwurf-scheduled.md"
WERKBANK = HERE / "werkbank.py"

DRAFT_HEADER = "<!-- ENTWURF — automatisch geplant, vor Versand prüfen -->"

_DEFAULT_README = (
    "Newsletter-Planungs-Queue für automation/newsletter_scheduler.py. Liste von "
    "Einträgen {datum (YYYY-MM-DD), tool_id, foerder_id, thema, status}. "
    "status: 'geplant' | 'entwurf' | 'versendet'. Bearbeiten via: "
    "python3 automation/newsletter_scheduler.py add/list/next/generate-for."
)

# Beispiel-Gerüst, falls die Queue-Datei noch nicht existiert. Klar als BEISPIEL
# markiert (Datum weit in der Zukunft, Hinweis im thema-Text) — keine echten Daten.
_SEED = {
    "_readme": _DEFAULT_README + " Die folgenden Einträge sind BEISPIELE — ersetzen oder löschen.",
    "queue": [
        {"datum": "2099-01-05", "tool_id": "claude", "foerder_id": None,
         "thema": "BEISPIEL — bitte ersetzen oder löschen", "status": "geplant"},
        {"datum": "2099-01-06", "tool_id": "deepl", "foerder_id": "kfw-gruenderkredit",
         "thema": "BEISPIEL — Tool + Förder-Tipp kombinieren", "status": "geplant"},
        {"datum": "2099-01-07", "tool_id": "n8n", "foerder_id": None,
         "thema": "BEISPIEL — Automatisierung ehrlich einordnen", "status": "geplant"},
    ],
}


def _valid_datum(s: str) -> bool:
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except (ValueError, TypeError):
        return False


def load_queue() -> dict:
    """Lädt die Queue-Datei; legt ein Beispiel-Gerüst an, falls sie fehlt."""
    if not QUEUE_PATH.exists():
        save_queue(_SEED)
        sys.stderr.write(f"Queue-Datei angelegt (mit Beispielen): {QUEUE_PATH.name}\n")
        return json.loads(json.dumps(_SEED))  # Kopie
    try:
        data = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    except Exception as ex:  # noqa: BLE001 — kaputte Datei darf nicht crashen
        sys.stderr.write(f"Queue nicht lesbar ({ex}) — nutze leeres Gerüst.\n")
        return {"_readme": _DEFAULT_README, "queue": []}
    if not isinstance(data, dict) or not isinstance(data.get("queue"), list):
        sys.stderr.write("Queue-Format unerwartet — nutze leeres Gerüst.\n")
        return {"_readme": _DEFAULT_README, "queue": []}
    return data


def save_queue(data: dict) -> None:
    QUEUE_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _sorted_entries(data: dict) -> list[dict]:
    return sorted(data.get("queue", []), key=lambda e: str(e.get("datum", "")))


def _fmt_entry(e: dict) -> str:
    parts = [
        e.get("datum", "????-??-??"),
        f"[{e.get('status', '?')}]",
        e.get("thema", "(ohne Thema)"),
    ]
    extra = []
    if e.get("tool_id"):
        extra.append(f"tool={e['tool_id']}")
    if e.get("foerder_id"):
        extra.append(f"foerder={e['foerder_id']}")
    line = "  ".join(parts)
    if extra:
        line += "  (" + ", ".join(extra) + ")"
    return line


def cmd_list(_args) -> int:
    data = load_queue()
    entries = _sorted_entries(data)
    if not entries:
        print("Queue ist leer. Mit 'add' Einträge anlegen.")
        return 0
    print(f"Newsletter-Queue ({len(entries)} Einträge, nach Datum):\n")
    for e in entries:
        print("  " + _fmt_entry(e))
    return 0


def cmd_add(args) -> int:
    if not _valid_datum(args.datum):
        sys.stderr.write(f"Ungültiges Datum: {args.datum!r} (erwartet YYYY-MM-DD).\n")
        return 2
    data = load_queue()
    entry = {
        "datum": args.datum,
        "tool_id": args.tool_id,
        "foerder_id": args.foerder_id,
        "thema": args.thema,
        "status": "geplant",
    }
    data.setdefault("queue", []).append(entry)
    save_queue(data)
    print("Hinzugefügt:")
    print("  " + _fmt_entry(entry))
    return 0


def cmd_next(_args) -> int:
    data = load_queue()
    today = date.today().isoformat()
    upcoming = [
        e for e in _sorted_entries(data)
        if str(e.get("datum", "")) >= today and e.get("status") != "versendet"
    ]
    if not upcoming:
        print("Kein anstehender Eintrag (Datum >= heute, noch nicht versendet).")
        return 0
    nxt = upcoming[0]
    print("Nächster anstehender Eintrag:")
    print("  " + _fmt_entry(nxt))
    return 0


def _find_entry(data: dict, datum: str) -> dict | None:
    for e in data.get("queue", []):
        if str(e.get("datum", "")) == datum:
            return e
    return None


def _run_werkbank_issue() -> tuple[bool, str]:
    """Ruft 'werkbank.py issue' per Subprocess auf. Rückgabe: (ok, stdout-Text).

    Subprocess statt Import, weil cmd_issue() direkt nach stdout druckt und eine
    datierte Datei schreibt — als Modul-Import schwer sauber abzugreifen. Der
    Entwurf landet auf stdout; den fangen wir ab.
    """
    if not WERKBANK.exists():
        return False, ""
    try:
        proc = subprocess.run(
            [sys.executable, str(WERKBANK), "issue"],
            cwd=str(REPO),
            capture_output=True,
            text=True,
            timeout=120,
        )
    except Exception as ex:  # noqa: BLE001 — Werkbank-Fehler darf nicht crashen
        sys.stderr.write(f"Werkbank-Aufruf fehlgeschlagen ({ex}).\n")
        return False, ""
    out = proc.stdout or ""
    # Werkbank gibt den Markdown-Entwurf auf stdout aus; brauchbar, wenn nicht leer.
    if proc.returncode == 0 and out.strip():
        return True, out
    sys.stderr.write(
        f"Werkbank lieferte keinen verwertbaren Entwurf (rc={proc.returncode}).\n"
    )
    return False, out


def _voice_hint(text: str) -> str | None:
    """Best-effort Voice-Score-Hinweis. Nutzt werkbank.voice_check, sonst nichts."""
    try:
        sys.path.insert(0, str(HERE))
        import importlib.util

        spec = importlib.util.spec_from_file_location("werkbank_mod", str(WERKBANK))
        if spec is None or spec.loader is None:
            return None
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, "voice_check"):
            return None
        r = mod.voice_check(text)
        status = "OK" if r["score"] >= 7 and not r["hits"] else "prüfen"
        hint = f"Voice-Score (Heuristik): {r['score']}/10 ({status})"
        if r["hits"]:
            phrases = ", ".join(sorted({h[0] for h in r["hits"]}))
            hint += f" — Hype-Phrasen: {phrases}"
        return hint
    except Exception as ex:  # noqa: BLE001 — Voice-Check ist optional
        sys.stderr.write(f"Voice-Hinweis übersprungen ({ex}).\n")
        return None


def _context_note(entry: dict, datum: str) -> str:
    lines = [
        DRAFT_HEADER,
        "",
        f"<!-- Geplant für: {datum} -->",
        f"<!-- Thema: {entry.get('thema', '(ohne Thema)')} -->",
    ]
    if entry.get("tool_id"):
        lines.append(f"<!-- Vorgesehenes Tool: {entry['tool_id']} -->")
    if entry.get("foerder_id"):
        lines.append(f"<!-- Vorgesehene Förderung: {entry['foerder_id']} -->")
    lines.append("")
    return "\n".join(lines)


def _placeholder_draft(entry: dict, datum: str) -> str:
    return "\n".join([
        _context_note(entry, datum),
        "# Aban News — Ausgaben-Entwurf (Platzhalter)",
        "",
        "> Die Werkbank konnte keinen Entwurf erzeugen (z. B. fehlende Daten oder",
        "> kein Netz). Bitte den Entwurf manuell schreiben — Kontext steht oben im",
        "> Kommentar. Es wurden bewusst KEINE Inhalte erfunden.",
        "",
        f"**Geplantes Thema:** {entry.get('thema', '(ohne Thema)')}",
        "",
    ])


def cmd_generate_for(args) -> int:
    if not _valid_datum(args.datum):
        sys.stderr.write(f"Ungültiges Datum: {args.datum!r} (erwartet YYYY-MM-DD).\n")
        return 2
    data = load_queue()
    entry = _find_entry(data, args.datum)
    if entry is None:
        sys.stderr.write(f"Kein Queue-Eintrag für {args.datum}. Erst mit 'add' anlegen.\n")
        return 1

    ok, werkbank_out = _run_werkbank_issue()
    if ok:
        body = _context_note(entry, args.datum) + werkbank_out
    else:
        body = _placeholder_draft(entry, args.datum)

    hint = _voice_hint(body)
    if hint:
        body = body.rstrip("\n") + "\n\n---\n" + hint + "\n"

    try:
        DRAFT_PATH.write_text(body, encoding="utf-8")
    except Exception as ex:  # noqa: BLE001
        sys.stderr.write(f"Konnte Entwurf nicht schreiben ({ex}).\n")
        return 2

    # Status in der Queue auf 'entwurf' setzen (nur wenn noch nicht versendet).
    if entry.get("status") != "versendet":
        entry["status"] = "entwurf"
        save_queue(data)

    print(f"Entwurf geschrieben: {DRAFT_PATH.relative_to(REPO)}")
    if hint:
        print("  " + hint)
    if not ok:
        print("  (Platzhalter — Werkbank lieferte keinen Entwurf; bitte manuell prüfen.)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Aban News Newsletter-Scheduler (Redaktionsplan-Queue)."
    )
    sub = ap.add_subparsers(dest="cmd")

    sub.add_parser("list", help="Queue sortiert nach Datum anzeigen")
    sub.add_parser("next", help="nächsten anstehenden Eintrag anzeigen")

    p_add = sub.add_parser("add", help="Eintrag hinzufügen")
    p_add.add_argument("--datum", required=True, help="YYYY-MM-DD")
    p_add.add_argument("--tool-id", dest="tool_id", default=None, help="Tool-ID (data/tools.json)")
    p_add.add_argument("--foerder-id", dest="foerder_id", default=None, help="Förder-ID (optional)")
    p_add.add_argument("--thema", required=True, help="Thema/Notiz")

    p_gen = sub.add_parser("generate-for", help="Entwurf für ein geplantes Datum erzeugen")
    p_gen.add_argument("--datum", required=True, help="YYYY-MM-DD")

    args = ap.parse_args()
    if not args.cmd:
        ap.print_help()
        return 2

    dispatch = {
        "list": cmd_list,
        "next": cmd_next,
        "add": cmd_add,
        "generate-for": cmd_generate_for,
    }
    return dispatch[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
