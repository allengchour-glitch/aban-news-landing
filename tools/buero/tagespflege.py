#!/usr/bin/env python3
"""Prüft lokale Sitemap-Seiten, liest GitHub-Laufstände und meldet Änderungen optional an IndexNow."""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit, quote
from urllib.request import Request, HTTPRedirectHandler, build_opener
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

REPO = "allengchour-glitch/aban-news-landing"
HOST = "abannews.com"
WORKFLOWS = {
    "auswahl": "auswahl-lauf.yml", "schaufenster": "gmc-schaufenster.yml",
    "waechter": "lager-waechter.yml", "autopilot": "shop-autopilot.yml",
    "fortura": "fortura-bestand.yml", "printful": "printful-tracking.yml",
    "tagesupdate": "tages-update.yml", "paket": "krypto-paket.yml",
    "social_meta": "social-meta-autopost.yml", "social_pinterest": "pinterest-publish.yml",
    "social_linkedin": "linkedin-autopost.yml",
}


class KeineWeiterleitung(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http(method, url, headers=None, data=None):
    req = Request(url, data=data, headers={"User-Agent": "Aban-Buero-Tagespflege/1", **(headers or {})}, method=method)
    try:
        with build_opener(KeineWeiterleitung()).open(req, timeout=20) as response:
            return response.status, response.read(2 * 1024 * 1024 + 1)
    except HTTPError as e:
        return e.code, b""
    except (URLError, OSError):
        return 0, b""


def sichere_url(url):
    p = urlsplit(url)
    if (p.scheme != "https" or p.netloc != HOST or p.username or p.password
            or p.query or p.fragment or any(ord(c) <= 32 for c in url)):
        raise ValueError("Nur öffentliche HTTPS-Seiten von abannews.com ohne Query oder Fragment sind erlaubt.")
    return p


class Seitenkopf(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title, self.in_title, self.description, self.noindex, self.canonical = "", False, "", False, ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            name, value = a.get("name", "").lower(), a.get("content", "")
            if name == "description":
                self.description = value.strip()
            if name in ("robots", "googlebot", "bingbot") and "noindex" in re.split(r"[\s,]+", value.lower()):
                self.noindex = True
        if tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonical = a.get("href", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def seiten_pruefen(root):
    root = Path(root).resolve()
    raw = (root / "sitemap.xml").read_bytes()
    if len(raw) > 50 * 1024 * 1024 or b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("Sitemap zu gross oder mit unzulässigen XML-Deklarationen.")
    tree = ET.fromstring(raw)
    if tree.tag != "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset":
        raise ValueError("Eine einzelne urlset-Sitemap wird benötigt; Sitemap-Index hier nicht unterstützt.")
    urls = [e.text.strip() for e in tree.findall("{*}url/{*}loc") if e.text]
    if not urls or len(urls) > 50000:
        raise ValueError("Sitemap leer oder über 50000 URLs.")
    robots = RobotFileParser()
    if (root / "robots.txt").exists():
        robots.parse((root / "robots.txt").read_text(encoding="utf-8").splitlines())
    else:
        robots.parse(["User-agent: *", "Allow: /"])
    findings, inventar, seen = [], {}, set()
    for url in urls:
        if url in seen:
            findings.append({"url": url, "problem": "Doppelter Sitemap-Eintrag", "schritt": "Doppelten Eintrag entfernen."})
            continue
        seen.add(url)
        try:
            p = sichere_url(url)
            rel = unquote(p.path).lstrip("/")
            if not rel or rel.endswith("/"):
                rel += "index.html"
            local = (root / rel).resolve()
            if not local.is_relative_to(root) or not local.is_file() or local.suffix.lower() != ".html":
                raise ValueError("Keine passende lokale HTML-Datei")
            if local.stat().st_size > 4 * 1024 * 1024:
                raise ValueError("HTML-Datei grösser als 4 MiB")
            content = local.read_bytes()
        except (ValueError, OSError):
            findings.append({"url": url, "problem": "Datei oder URL nicht prüfbar", "schritt": "Sitemap-Eintrag und vollständigen Checkout prüfen."})
            continue
        head = Seitenkopf()
        head.feed(content.decode("utf-8", errors="replace"))
        blockiert = not robots.can_fetch("googlebot", url) or not robots.can_fetch("bingbot", url)
        for condition, problem, step in [
            (blockiert, "Robots sperrt Sitemap-Seite", "Absicht prüfen: interne Seite aus Sitemap entfernen; öffentliche Seite gegebenenfalls freigeben."),
            (not head.title.strip(), "Seitentitel fehlt", "Einen passenden, konkreten Seitentitel ergänzen."),
            (not head.description, "Beschreibung fehlt", "Eine zutreffende Kurzbeschreibung der Seite ergänzen."),
            (head.canonical != url, "Canonical fehlt oder weicht ab", "Bevorzugte URL prüfen und Canonical bzw. Sitemap angleichen."),
            (head.noindex, "Noindex-Seite in Sitemap", "Absicht prüfen: interne Seite aus Sitemap entfernen oder versehentliches noindex korrigieren."),
        ]:
            if condition:
                findings.append({"url": url, "problem": problem, "schritt": step})
        if not blockiert and not head.noindex and head.canonical == url:
            inventar[url] = hashlib.sha256(content).hexdigest()
    unklar = sum(f["problem"] == "Datei oder URL nicht prüfbar" for f in findings)
    return {"sitemap_urls": len(urls), "html_geprueft": len(seen) - unklar,
            "nicht_pruefbar": unklar, "inhaltshinweise": len(findings) - unklar,
            "befunde": findings, "inventar": inventar}


def github_lesen(root, token, call=http):
    if not token:
        return {ident: {"fehler": "GitHub-Zugang fehlt"} for ident in WORKFLOWS}
    result, gebremst = {}, False
    for ident, filename in WORKFLOWS.items():
        if gebremst:
            result[ident] = {"fehler": "Nach gesperrtem oder gedrosseltem Abruf nicht mehr abgefragt"}
            continue
        status, raw = call("GET", f"https://api.github.com/repos/{REPO}/actions/workflows/{filename}/runs?branch=main&per_page=1",
                           {"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"})
        if status != 200:
            result[ident] = {"fehler": "GitHub-Abruf nicht messbar", "http": status}
            gebremst = status in (403, 429)
            continue
        try:
            runs = json.loads(raw)["workflow_runs"]
            if not runs:
                result[ident] = {"fehler": "Kein Workflow-Lauf vorhanden"}
                continue
            r = runs[0]
            config = (Path(root) / ".github/workflows" / filename).read_text(encoding="utf-8")
            geplant = bool(re.search(r"^  schedule:\s*$", config, re.M) and re.search(r"^    - cron:", config, re.M))
            result[ident] = {"workflow": filename, "status": r["status"], "conclusion": r.get("conclusion"),
                             "zeit": r.get("run_started_at") or r["created_at"], "geplant": geplant}
        except (ValueError, KeyError, TypeError, IndexError, OSError):
            result[ident] = {"fehler": "GitHub-Antwort oder Workflow-Datei nicht auswertbar"}
    return result


def indexnow(inventar, state, key, melden=False, limit=100, call=http):
    if not 1 <= limit <= 1000:
        raise ValueError("IndexNow-Limit muss zwischen 1 und 1000 liegen.")
    # Nur bestätigte Meldungen desselben Hosts zählen als bereits erledigt.
    if not isinstance(state, dict):
        raise ValueError("Ungültiger IndexNow-Zustand.")
    ack = state.get("bestaetigt", {}) if state.get("host") == HOST else {}
    if not isinstance(ack, dict):
        raise ValueError("Ungültiger IndexNow-Zustand.")
    for url in inventar:
        sichere_url(url)
    offen = [url for url, digest in inventar.items() if ack.get(url) != digest]
    chosen = sorted(offen)[:limit]
    report = {"geaendert_oder_neu": len(offen), "ausgewaehlt": len(chosen), "gemeldet": 0,
              "indexierung": "Nicht gemessen", "status": "Trockenlauf"}
    if not chosen:
        report["status"] = "Keine Änderungen"
        return report, state
    if not melden:
        return report, state
    if not key:
        report["status"] = "Einrichtung fehlt: IndexNow-Schlüssel und öffentliche Schlüsseldatei"
        return report, state
    if not re.fullmatch(r"[a-zA-Z0-9-]{8,128}", key):
        raise ValueError("IndexNow-Schlüssel hat ein ungültiges Format.")
    key_url = f"https://{HOST}/{key}.txt"
    status, body = call("GET", key_url)
    if status != 200 or body.decode("utf-8-sig", errors="replace").strip() != key:
        report["status"] = "Schlüsseldatei nicht verifiziert; nichts gemeldet"
        return report, state
    payload = json.dumps({"host": HOST, "key": key, "keyLocation": key_url, "urlList": chosen}).encode()
    status, _ = call("POST", "https://api.indexnow.org/indexnow", {"Content-Type": "application/json; charset=utf-8"}, payload)
    report["http"] = status
    if status == 200:
        report.update({"status": "URLs gemeldet; Indexierung nicht bestätigt", "gemeldet": len(chosen)})
        return report, {**state, "host": HOST, "bestaetigt": {**ack, **{u: inventar[u] for u in chosen}}}
    report["status"] = "Empfangen; Schlüsselprüfung ausstehend" if status == 202 else "Meldung nicht bestätigt; kein automatischer Wiederholungsversuch"
    return report, state


def google_token(credentials_json):
    # Optionale Abhängigkeit nur im eingerichteten Live-Lauf. Schlüssel bleiben im Speicher.
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request as GoogleRequest
    info = json.loads(credentials_json)
    # Kein frei wählbarer Token-Endpunkt aus einer fremden JSON-Datei.
    if info.get("token_uri") != "https://oauth2.googleapis.com/token":
        raise ValueError("Unbekannter Google-Token-Endpunkt.")
    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/webmasters"])
    credentials.refresh(GoogleRequest())
    return credentials.token


def google_sitemap(sitemap, inventar, state, credentials_json, melden=False, call=http, token_loader=google_token):
    fingerprint = hashlib.sha256(sitemap + json.dumps(inventar, sort_keys=True).encode()).hexdigest()
    report = {"status": "Trockenlauf", "gemeldet": False, "indexierung": "Nicht gemessen"}
    if state.get("host") == HOST and state.get("google_sitemap") == fingerprint:
        report["status"] = "Keine Änderungen"
        return report, state
    if not melden:
        return report, state
    if not credentials_json:
        report["status"] = "Einrichtung fehlt: Google-Dienstkonto mit Search-Console-Zugriff"
        return report, state
    # Nur die tatsächlich veröffentlichte Sitemap melden, keine unveröffentlichten Entwürfe.
    status, body = call("GET", "https://" + HOST + "/sitemap.xml")
    if status != 200 or body != sitemap:
        report["status"] = "Veröffentlichte Sitemap nicht bestätigt oder abweichend; nichts gemeldet"
        return report, state
    try:
        token = token_loader(credentials_json)
        if not token:
            raise ValueError("Kein Token")
    except Exception:
        report["status"] = "Google-Anmeldung fehlgeschlagen; nichts gemeldet"
        return report, state
    endpoint = ("https://www.googleapis.com/webmasters/v3/sites/" + quote("sc-domain:" + HOST, safe="")
                + "/sitemaps/" + quote("https://" + HOST + "/sitemap.xml", safe=""))
    status, _ = call("PUT", endpoint, {"Authorization": "Bearer " + token})
    report["http"] = status
    if status in (200, 204):
        report.update({"status": "Sitemap gemeldet; Indexierung nicht bestätigt", "gemeldet": True})
        return report, {**state, "host": HOST, "google_sitemap": fingerprint}
    report["status"] = "Google-Meldung nicht bestätigt; kein automatischer Wiederholungsversuch"
    return report, state


def lauf(root, out, state_path=None, github=False, melden=False, call=http):
    root, out = Path(root), Path(out)
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; neuen Ordner wählen.")
    scan = seiten_pruefen(root)
    state = json.loads(Path(state_path).read_text()) if state_path and Path(state_path).exists() else {}
    index, neu = indexnow(scan["inventar"], state, os.environ.get("INDEXNOW_KEY", ""), melden, call=call)
    google, neu = google_sitemap((root / "sitemap.xml").read_bytes(), scan["inventar"], neu,
                                 os.environ.get("GOOGLE_SEARCH_CONSOLE_CREDENTIALS", ""), melden, call=call)
    report = {"version": 1, "gemessen": datetime.now(timezone.utc).isoformat(),
              "seite": HOST, "seiten": {k: v for k, v in scan.items() if k != "inventar"},
              "indexnow": index, "github": github_lesen(root, os.environ.get("GITHUB_TOKEN", ""), call) if github else {},
              "google": google,
              "grenze": "Repository-Dateien geprüft. Live-HTTP, Suchindex, Bestellungen, lokale Bots und Claude-Sitzungen nicht neu gemessen."}
    out.mkdir(parents=True)
    (out / "pflege.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# Tägliche Seitenpflege", "", f"Gemessen: {report['gemessen']}", "",
             f"HTML geprüft: {scan['html_geprueft']} · Inhaltshinweise: {scan['inhaltshinweise']} · Lokal nicht prüfbar: {scan['nicht_pruefbar']}", "",
             "IndexNow: " + index["status"], "", "Google: " + google["status"], "", report["grenze"], ""]
    for item in sorted(scan["befunde"], key=lambda f: f["problem"] == "Datei oder URL nicht prüfbar")[:100]:
        lines.append(f"- {item['url']}: {item['problem']}. Nächster Schritt: {item['schritt']}")
    (out / "bericht.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if state_path and neu != state:
        target = Path(state_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_suffix(target.suffix + ".tmp")
        temp.write_text(json.dumps(neu, ensure_ascii=False, indent=2), encoding="utf-8")
        temp.replace(target)
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument("--ausgabe", required=True, type=Path)
    p.add_argument("--state", type=Path)
    p.add_argument("--github", action="store_true")
    p.add_argument("--melden", action="store_true")
    a = p.parse_args()
    try:
        r = lauf(a.root, a.ausgabe, a.state, a.github, a.melden)
    except (ValueError, OSError, ET.ParseError) as e:
        p.exit(2, "Tagespflege abgebrochen: " + type(e).__name__ + "\n")
    print(json.dumps({"html_geprueft": r["seiten"]["html_geprueft"], "inhaltshinweise": r["seiten"]["inhaltshinweise"], "nicht_pruefbar": r["seiten"]["nicht_pruefbar"],
                      "indexnow": r["indexnow"]["status"], "google": r["google"]["status"]}, ensure_ascii=False))
