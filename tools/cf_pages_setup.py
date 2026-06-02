#!/usr/bin/env python3
"""
cf_pages_setup.py — Cloudflare-Pages-Projekte per API anlegen (statt Dashboard-Klick).

Legt für ein Radar-/Subdomain-Projekt automatisch an:
  1. das Cloudflare-Pages-Projekt (Git-verbunden, Build-Command + Output-Dir),
  2. die Custom-Domain (z. B. video.abannews.com),
  3. den DNS-CNAME in der Zone (proxied) — falls noch nicht vorhanden,
  4. optional einen ersten Production-Deploy.

Alles **idempotent**: existiert etwas schon, wird es übersprungen, nicht doppelt
angelegt. Reine Python-stdlib (urllib) — keine Abhängigkeiten, passt zum Repo.

Voraussetzungen
---------------
- Umgebungsvariablen:
    CLOUDFLARE_API_TOKEN   — Token mit den Rechten:
                             Account · Cloudflare Pages · Edit
                             Zone · DNS · Edit  (für die abannews.com-Zone)
    CLOUDFLARE_ACCOUNT_ID  — optional; wird sonst automatisch ermittelt,
                             falls der Token genau einen Account sieht.
- **Einmalig** muss die GitHub-App-Verbindung auf dem Cloudflare-Account
  autorisiert sein (CF ↔ GitHub-OAuth). Das lässt sich per API NICHT herstellen
  — einmal im Dashboard „Connect to Git" bestätigen, danach klappt alles per API.
  (Quelle der Wahrheit für Repo/Branch bleibt unten REPO_OWNER/REPO_NAME.)

Beispiele
---------
    export CLOUDFLARE_API_TOKEN=...        # Pages-Edit + DNS-Edit
    python3 tools/cf_pages_setup.py video             # nur video-radar
    python3 tools/cf_pages_setup.py video kurse prompts
    python3 tools/cf_pages_setup.py --all-pending     # alle noch nicht live
    python3 tools/cf_pages_setup.py video --dry-run   # nur zeigen, nichts tun
    python3 tools/cf_pages_setup.py video --no-deploy # ohne ersten Deploy

Exit-Codes: 0 = alles ok / nichts zu tun, 1 = Fehler.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
REPO_OWNER = "allengchour-glitch"
REPO_NAME = "aban-news-landing"
BASE_DOMAIN = "abannews.com"
PRODUCTION_BRANCH = "main"
PYTHON_VERSION = "3.11"

# Registry aller Subdomain-Projekte. key = CLI-Kürzel, dir = Repo-Ordner,
# sub = Subdomain-Label. build/output werden aus dir abgeleitet (einheitliches
# Muster: `cd <dir> && python generate.py` -> `<dir>/dist`).
# live=True markiert bereits geschaltete Projekte (werden nur angefasst mit --force).
RADARS = {
    "radar":           {"dir": "ki-tools-radar",        "sub": "radar",           "live": True},
    "foerder":         {"dir": "foerder-radar",         "sub": "foerder"},
    "jobs":            {"dir": "jobs-radar",            "sub": "jobs"},
    "kurse":           {"dir": "kurse-radar",           "sub": "kurse"},
    "prompts":         {"dir": "prompts-bibliothek",    "sub": "prompts"},
    "agenturen":       {"dir": "agenturen-radar",       "sub": "agenturen"},
    "dropshipping":    {"dir": "dropshipping-radar",    "sub": "dropshipping"},
    "newsletter":      {"dir": "newsletter-radar",      "sub": "newsletter"},
    "buchhaltung":     {"dir": "buchhaltung-radar",     "sub": "buchhaltung"},
    "chatbot":         {"dir": "chatbot-radar",         "sub": "chatbot"},
    "voice":           {"dir": "voice-radar",           "sub": "voice"},
    "video":           {"dir": "video-radar",           "sub": "video"},
    "musik":           {"dir": "musik-radar",           "sub": "musik"},
    "automatisierung": {"dir": "automatisierung-radar", "sub": "automatisierung"},
    "handwerk":        {"dir": "handwerk-radar",        "sub": "handwerk"},
    "tools":           {"dir": "ki-verzeichnis",        "sub": "tools"},
    "shop":            {"dir": "pod-shop",              "sub": "shop"},
}


def cfg(key: str) -> dict:
    r = RADARS[key]
    d = r["dir"]
    return {
        "key": key,
        "project": d,                         # Pages-Projektname = Ordnername
        "build_command": f"cd {d} && python generate.py",
        "destination_dir": f"{d}/dist",
        "domain": f"{r['sub']}.{BASE_DOMAIN}",
        "subdomain_label": r["sub"],
        "pages_dev": f"{d}.pages.dev",
        "live": r.get("live", False),
    }


class CFError(Exception):
    pass


class Client:
    def __init__(self, token: str, dry_run: bool = False):
        self.token = token
        self.dry_run = dry_run

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = f"{API}{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read().decode())
            except Exception:
                raise CFError(f"{method} {path} -> HTTP {e.code}") from None
            errs = "; ".join(
                f"{x.get('code')}: {x.get('message')}" for x in payload.get("errors", [])
            ) or f"HTTP {e.code}"
            raise CFError(f"{method} {path} -> {errs}")
        except urllib.error.URLError as e:
            raise CFError(f"{method} {path} -> Netzwerkfehler: {e.reason}") from None
        if not payload.get("success", False):
            errs = "; ".join(
                f"{x.get('code')}: {x.get('message')}" for x in payload.get("errors", [])
            )
            raise CFError(f"{method} {path} -> {errs or 'unbekannter API-Fehler'}")
        return payload.get("result")

    # Lesende Calls laufen auch im Dry-Run (harmlos); schreibende werden geloggt.
    def get(self, path: str) -> dict:
        return self._request("GET", path)

    def write(self, method: str, path: str, body: dict, what: str):
        if self.dry_run:
            print(f"    [dry-run] würde {method} {path}  ({what})")
            return None
        return self._request(method, path, body)


def resolve_account_id(cl: Client) -> str:
    env = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    if env:
        return env
    accounts = cl.get("/accounts?per_page=50") or []
    if len(accounts) == 1:
        aid = accounts[0]["id"]
        print(f"  Account automatisch erkannt: {accounts[0].get('name')} ({aid})")
        return aid
    if not accounts:
        raise CFError("Token sieht keinen Account — Rechte prüfen.")
    names = ", ".join(f"{a.get('name')} ({a['id']})" for a in accounts)
    raise CFError(
        "Token sieht mehrere Accounts — CLOUDFLARE_ACCOUNT_ID setzen. "
        f"Verfügbar: {names}"
    )


def ensure_project(cl: Client, account: str, c: dict, mode: str = "git") -> bool:
    """True, wenn das Projekt danach (existiert oder) angelegt ist.

    mode="git":    Git-verbunden (braucht die einmalige CF↔GitHub-OAuth-Verbindung;
                   CF baut + deployt bei jedem main-Push selbst).
    mode="direct": Direct-Upload-Projekt **ohne** Git-Source — keine OAuth-Verbindung
                   nötig. Deployt wird per Wrangler aus einem GitHub-Action
                   (siehe .github/workflows/cf-pages-deploy.yml).
    """
    proj = c["project"]
    try:
        existing = cl.get(f"/accounts/{account}/pages/projects/{proj}")
        print(f"  ✓ Projekt '{proj}' existiert bereits "
              f"(Subdomain {existing.get('subdomain', '—')})")
        return True
    except CFError:
        pass  # nicht gefunden -> anlegen

    if mode == "direct":
        body = {"name": proj, "production_branch": PRODUCTION_BRANCH}
        what = f"Direct-Upload-Projekt '{proj}' anlegen (Deploy per Wrangler)"
    else:
        body = {
            "name": proj,
            "production_branch": PRODUCTION_BRANCH,
            "source": {
                "type": "github",
                "config": {
                    "owner": REPO_OWNER,
                    "repo_name": REPO_NAME,
                    "production_branch": PRODUCTION_BRANCH,
                    "pr_comments_enabled": False,
                    "deployments_enabled": True,
                    "production_deployments_enabled": True,
                    "preview_deployment_setting": "none",
                },
            },
            "build_config": {
                "build_command": c["build_command"],
                "destination_dir": c["destination_dir"],
                "root_dir": "",
                "build_caching": True,
            },
            "deployment_configs": {
                "production": {
                    "environment_variables": {
                        "PYTHON_VERSION": {"value": PYTHON_VERSION},
                    },
                },
            },
        }
        what = f"Pages-Projekt '{proj}' anlegen (Build: {c['build_command']})"
    cl.write("POST", f"/accounts/{account}/pages/projects", body, what)
    if not cl.dry_run:
        print(f"  ✓ Projekt '{proj}' angelegt ({mode})")
    return True


def ensure_domain(cl: Client, account: str, c: dict):
    proj, domain = c["project"], c["domain"]
    if not cl.dry_run:
        try:
            domains = cl.get(f"/accounts/{account}/pages/projects/{proj}/domains") or []
            if any(d.get("name") == domain for d in domains):
                print(f"  ✓ Custom-Domain '{domain}' bereits verknüpft")
                return
        except CFError:
            pass
    cl.write("POST", f"/accounts/{account}/pages/projects/{proj}/domains",
             {"name": domain}, f"Custom-Domain '{domain}' verknüpfen")
    if not cl.dry_run:
        print(f"  ✓ Custom-Domain '{domain}' verknüpft")


def ensure_dns(cl: Client, c: dict):
    domain, target, label = c["domain"], c["pages_dev"], c["subdomain_label"]
    zones = cl.get(f"/zones?name={BASE_DOMAIN}") or []
    if not zones:
        print(f"  ⚠ Zone '{BASE_DOMAIN}' nicht im Account — DNS-CNAME bitte manuell: "
              f"{domain} CNAME {target} (proxied)")
        return
    zone_id = zones[0]["id"]
    if not cl.dry_run:
        existing = cl.get(
            f"/zones/{zone_id}/dns_records?name={domain}&type=CNAME"
        ) or []
        if existing:
            cur = existing[0].get("content")
            print(f"  ✓ DNS-CNAME '{domain}' existiert (→ {cur})")
            return
    cl.write("POST", f"/zones/{zone_id}/dns_records",
             {"type": "CNAME", "name": label, "content": target,
              "proxied": True, "ttl": 1},
             f"DNS-CNAME {domain} → {target} (proxied)")
    if not cl.dry_run:
        print(f"  ✓ DNS-CNAME {domain} → {target} angelegt")


def trigger_deploy(cl: Client, account: str, c: dict):
    proj = c["project"]
    cl.write("POST", f"/accounts/{account}/pages/projects/{proj}/deployments",
             {}, f"ersten Production-Deploy für '{proj}' auslösen")
    if not cl.dry_run:
        print(f"  ✓ Deploy für '{proj}' angestoßen "
              f"(Fortschritt im CF-Dashboard / Pages → {proj})")


def setup_one(cl: Client, account: str, key: str, *, deploy: bool, force: bool,
              mode: str = "git", no_project: bool = False):
    c = cfg(key)
    print(f"\n▶ {key}  →  https://{c['domain']}  (Projekt: {c['project']}, mode={mode})")
    if c["live"] and not force:
        print("  ↷ als bereits live markiert — übersprungen (--force zum Erzwingen).")
        return
    if no_project:
        print("  ↷ Projekt-Anlage übersprungen (--no-project; z. B. von Wrangler erstellt).")
    else:
        ensure_project(cl, account, c, mode=mode)
    ensure_domain(cl, account, c)
    ensure_dns(cl, c)
    if deploy and mode == "git":
        trigger_deploy(cl, account, c)
    elif mode == "direct":
        print("  ↷ Deploy per Wrangler (Direct Upload) — nicht über diese API.")
    else:
        print("  ↷ Deploy übersprungen (--no-deploy). CF deployt beim nächsten "
              "Push auf main automatisch.")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        description="Cloudflare-Pages-Projekte per API anlegen (idempotent).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Bekannte Radars: " + ", ".join(RADARS),
    )
    p.add_argument("radars", nargs="*",
                   help="Radar-Kürzel (z. B. video kurse). Leer + --all-pending = alle offenen.")
    p.add_argument("--all-pending", action="store_true",
                   help="alle noch nicht live geschalteten Radars")
    p.add_argument("--dry-run", action="store_true",
                   help="nur zeigen, was passieren würde — nichts ändern")
    p.add_argument("--no-deploy", action="store_true",
                   help="kein erster Deploy (CF deployt sonst beim nächsten main-Push)")
    p.add_argument("--mode", choices=("git", "direct"), default="git",
                   help="git = Git-verbunden (braucht CF↔GitHub-OAuth); "
                        "direct = Direct-Upload-Projekt ohne OAuth (Deploy per Wrangler)")
    p.add_argument("--no-project", action="store_true",
                   help="Projekt nicht anlegen (nur Domain+DNS verknüpfen, z. B. nachdem "
                        "Wrangler das Projekt erstellt hat)")
    p.add_argument("--force", action="store_true",
                   help="auch als live markierte Projekte anfassen")
    p.add_argument("--list", action="store_true", help="bekannte Radars auflisten und beenden")
    args = p.parse_args(argv)

    if args.list:
        for k in RADARS:
            c = cfg(k)
            flag = " (live)" if c["live"] else ""
            print(f"  {k:16s} → {c['domain']:32s} [{c['project']}]{flag}")
        return 0

    if args.all_pending:
        keys = [k for k in RADARS if not RADARS[k].get("live")]
    else:
        keys = args.radars
    if not keys:
        p.error("Kein Radar angegeben. Beispiel: cf_pages_setup.py video  (oder --all-pending)")
    unknown = [k for k in keys if k not in RADARS]
    if unknown:
        p.error(f"Unbekannte Radars: {', '.join(unknown)}. Bekannt: {', '.join(RADARS)}")

    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        print("FEHLER: CLOUDFLARE_API_TOKEN nicht gesetzt.\n"
              "  Token erstellen (Account · Cloudflare Pages · Edit + Zone · DNS · Edit) und:\n"
              "    export CLOUDFLARE_API_TOKEN=...\n"
              "  Tipp: erst mit --dry-run testen.", file=sys.stderr)
        return 1

    cl = Client(token, dry_run=args.dry_run)
    if args.dry_run:
        print("== DRY-RUN — es wird nichts geändert ==")
    try:
        account = resolve_account_id(cl)
        for k in keys:
            setup_one(cl, account, k, deploy=not args.no_deploy, force=args.force,
                      mode=args.mode, no_project=args.no_project)
    except CFError as e:
        print(f"\nFEHLER: {e}", file=sys.stderr)
        return 1
    print("\nFertig." + ("" if args.dry_run else " Status im CF-Dashboard → Workers & Pages."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
