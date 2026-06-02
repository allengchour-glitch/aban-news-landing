#!/usr/bin/env python3
"""Aban News — Link-Checker (Qualitätssicherung für ausgehende Links).

Sammelt alle http(s)-URLs aus den Projekt-Daten und prüft sie auf Erreichbarkeit.
Ziel: tote/umgeleitete Links in Tool-Daten, Social-Posts und News-Rohmaterial
früh finden — bevor sie im Newsletter oder auf einer Radar-Seite landen.

Reine Standardbibliothek (urllib), keine Abhängigkeiten, kein Tracking.
Defensiv: ohne Netz oder bei einzelnen Fehlern kein Crash — es wird ein Report
ausgegeben und (ohne --fail-on-broken) mit Exit 0 beendet.

Quellen, die durchsucht werden:
  - data/tools.json            (alle http(s)-URL-Felder, rekursiv)
  - social/posts.json          (falls vorhanden)
  - automation/news-roh-*.md   (neuestes File: Markdown-Links + nackte URLs)

Beispielaufrufe:
    python3 tools/link_checker.py
    python3 tools/link_checker.py --out link-report.md
    python3 tools/link_checker.py --fail-on-broken        # Exit 1 bei toten Links (CI)
    python3 tools/link_checker.py --timeout 5 --workers 4
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

USER_AGENT = "aban-news linkcheck (+https://abannews.com)"

# URL aus Markdown/Text: nackte http(s)-URLs (Klammern/Anführungszeichen begrenzen).
URL_RE = re.compile(r"https?://[^\s<>()\"'\]]+")
# Markdown-Link [text](url)
MD_LINK_RE = re.compile(r"\]\((https?://[^)\s]+)\)")


def _clean_url(url: str) -> str:
    """Entfernt nachgestellte Satzzeichen und Fragment-Anker."""
    url = url.strip()
    url = url.split("#", 1)[0]
    # Häufige Markdown-/Satz-Reste am Ende abschneiden
    while url and url[-1] in ".,;:!?»\"'>)*":
        url = url[:-1]
    return url


def _is_checkable(url: str) -> bool:
    if not url:
        return False
    low = url.lower()
    if low.startswith(("mailto:", "tel:")):
        return False
    return low.startswith(("http://", "https://"))


def _walk_json(node, sink: set[str]) -> None:
    """Sammelt rekursiv alle http(s)-String-Werte aus einer JSON-Struktur."""
    if isinstance(node, dict):
        for v in node.values():
            _walk_json(v, sink)
    elif isinstance(node, list):
        for v in node:
            _walk_json(v, sink)
    elif isinstance(node, str):
        # Direkter URL-Wert ODER eingebettete URLs (z. B. in Social-Post-Texten)
        for m in URL_RE.finditer(node):
            u = _clean_url(m.group(0))
            if _is_checkable(u):
                sink.add(u)


def collect_from_json(path: Path) -> set[str]:
    urls: set[str] = set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as ex:  # noqa: BLE001 — Datei fehlt/kaputt darf nicht crashen
        sys.stderr.write(f"  Hinweis: {path.name} nicht lesbar ({ex})\n")
        return urls
    _walk_json(data, urls)
    return urls


def collect_from_markdown(path: Path) -> set[str]:
    urls: set[str] = set()
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as ex:  # noqa: BLE001
        sys.stderr.write(f"  Hinweis: {path.name} nicht lesbar ({ex})\n")
        return urls
    for m in MD_LINK_RE.finditer(text):
        u = _clean_url(m.group(1))
        if _is_checkable(u):
            urls.add(u)
    for m in URL_RE.finditer(text):
        u = _clean_url(m.group(0))
        if _is_checkable(u):
            urls.add(u)
    return urls


def latest_news_roh() -> Path | None:
    """Neuestes automation/news-roh-*.md (nach Name sortiert, -aktuell zuletzt)."""
    candidates = sorted((REPO / "automation").glob("news-roh-*.md"))
    if not candidates:
        return None
    # 'news-roh-aktuell.md' bevorzugen, sonst das datums-höchste.
    aktuell = REPO / "automation" / "news-roh-aktuell.md"
    if aktuell.exists():
        return aktuell
    return candidates[-1]


def gather_sources() -> dict[str, set[str]]:
    """Mappt jede gefundene URL auf ihre Quelle(n) (für die Report-Spalte)."""
    sources: dict[str, set[str]] = {}

    def add(urls: set[str], label: str) -> None:
        for u in urls:
            sources.setdefault(u, set()).add(label)

    tools = REPO / "data" / "tools.json"
    if tools.exists():
        add(collect_from_json(tools), "tools.json")

    posts = REPO / "social" / "posts.json"
    if posts.exists():
        add(collect_from_json(posts), "posts.json")

    news = latest_news_roh()
    if news is not None:
        add(collect_from_markdown(news), news.name)

    return sources


def check_url(url: str, timeout: float) -> tuple[str, int | None, str]:
    """Prüft eine URL. Rückgabe: (status_label, http_code|None, detail).

    HEAD zuerst; bei 405/501 (oder fehlendem HEAD-Support) Fallback auf GET mit
    kleinem Read. Redirects werden von urllib automatisch verfolgt.
    """

    def _request(method: str) -> tuple[int, str]:
        req = urllib.request.Request(
            url, method=method, headers={"User-Agent": USER_AGENT, "Range": "bytes=0-1023"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if method == "GET":
                resp.read(2048)  # nur ein kleines Stück lesen
            return resp.getcode() or 0, resp.geturl()

    try:
        try:
            code, _ = _request("HEAD")
            if code in (405, 501):
                code, _ = _request("GET")
        except urllib.error.HTTPError as he:
            if he.code in (403, 405, 501):  # manche Server mögen HEAD/Bots nicht
                code, _ = _request("GET")
            else:
                raise
    except urllib.error.HTTPError as he:
        label = "OK" if 200 <= he.code < 400 else "BROKEN"
        return label, he.code, f"HTTP {he.code}"
    except urllib.error.URLError as ue:
        return "BROKEN", None, f"URL-Fehler: {ue.reason}"
    except Exception as ex:  # noqa: BLE001 — Timeout/SSL/sonstiges: nie crashen
        return "BROKEN", None, f"{type(ex).__name__}: {ex}"

    label = "OK" if 200 <= code < 400 else "BROKEN"
    return label, code, f"HTTP {code}"


def build_report(rows: list[tuple[str, str, str, str]], offline_hint: bool) -> str:
    """rows: (url, status_label, detail, sources_str). Liefert Markdown."""
    ok = sum(1 for r in rows if r[1] == "OK")
    broken = sum(1 for r in rows if r[1] == "BROKEN")
    lines = [
        "# Link-Report — Aban News",
        "",
        f"Geprüft: {len(rows)} eindeutige Links · OK: {ok} · defekt: {broken}",
        "",
    ]
    if offline_hint:
        lines += [
            "> Hinweis: Es konnte kein Link erfolgreich geprüft werden. "
            "Vermutlich kein Netzwerkzugriff (z. B. Sandbox/CI ohne Egress). "
            "Der Report ist dann nur eine Inventarliste.",
            "",
        ]
    lines += ["| Status | Link | Detail | Quelle |", "|---|---|---|---|"]
    # defekte zuerst, danach alphabetisch
    for url, status, detail, src in sorted(rows, key=lambda r: (r[1] != "BROKEN", r[0])):
        mark = "BROKEN" if status == "BROKEN" else "OK"
        safe_url = url.replace("|", "%7C")
        lines.append(f"| {mark} | {safe_url} | {detail} | {src} |")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Prüft ausgehende Links der Aban-News-Daten.")
    ap.add_argument("--out", default=None, help="Markdown-Report zusätzlich in diese Datei schreiben")
    ap.add_argument("--timeout", type=float, default=10.0, help="HTTP-Timeout je Link (Sekunden)")
    ap.add_argument("--workers", type=int, default=8, help="parallele Prüfungen (max ~8 sinnvoll)")
    ap.add_argument("--fail-on-broken", action="store_true",
                    help="Exit 1, wenn defekte Links gefunden wurden (für CI)")
    args = ap.parse_args()

    sources = gather_sources()
    urls = sorted(sources)
    if not urls:
        sys.stderr.write("Keine URLs gefunden — nichts zu prüfen.\n")
        print("# Link-Report — Aban News\n\nKeine URLs gefunden.")
        return 0

    workers = max(1, min(args.workers, 8))
    rows: list[tuple[str, str, str, str]] = []
    any_ok = False

    def _job(u: str) -> tuple[str, str, str, str]:
        status, _code, detail = check_url(u, args.timeout)
        src = ", ".join(sorted(sources[u]))
        return (u, status, detail, src)

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for row in pool.map(_job, urls):
                rows.append(row)
                if row[1] == "OK":
                    any_ok = True
    except Exception as ex:  # noqa: BLE001 — Pool/Setup darf nicht crashen
        sys.stderr.write(f"Prüfung abgebrochen ({ex}) — gebe Inventar aus.\n")
        rows = [(u, "BROKEN", "nicht geprüft", ", ".join(sorted(sources[u]))) for u in urls]

    # offline_hint, wenn KEIN einziger Link OK war (deutet auf fehlenden Netzzugang)
    offline_hint = not any_ok and len(rows) > 0
    report = build_report(rows, offline_hint)
    print(report)

    if args.out:
        try:
            Path(args.out).write_text(report, encoding="utf-8")
            sys.stderr.write(f"Report geschrieben: {args.out}\n")
        except Exception as ex:  # noqa: BLE001
            sys.stderr.write(f"Konnte Report nicht schreiben ({ex}).\n")

    broken = sum(1 for r in rows if r[1] == "BROKEN")
    if args.fail_on_broken and broken and not offline_hint:
        sys.stderr.write(f"{broken} defekte Links gefunden.\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
