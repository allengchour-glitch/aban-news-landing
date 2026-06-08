#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""cf_preflight.py — Cloudflare-API-Token & Pages-Setup prüfen ("in Betrieb nehmen").

Stellt fest, ob der CLOUDFLARE_API_TOKEN wirklich alles kann, was für die
API-Deploys (Pages Direct-Upload + Custom-Domains/DNS) gebraucht wird — und
welche Pages-Projekte/Zonen vorhanden sind. Reine stdlib (urllib), kein Deploy,
ändert NICHTS. Gibt einen klaren ✅/⚠️/❌-Report aus.

ENV:
  CLOUDFLARE_API_TOKEN   (Pflicht)
  CLOUDFLARE_ACCOUNT_ID  (optional — wird sonst aus /accounts ermittelt)

Exit: 0 = Token nutzbar (mind. Account-Auth ok), 1 = Token fehlt/ungültig.
Mit --strict: Exit 1, sobald eine für den Deploy nötige Berechtigung fehlt.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
BASE_DOMAIN = "abannews.com"
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
STRICT = "--strict" in sys.argv

OK, WARN, BAD = "✅", "⚠️ ", "❌"


def call(method, path, body=None):
    """Return (status_code, parsed_json|None)."""
    url = path if path.startswith("http") else API + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:  # noqa: BLE001
            return e.code, None
    except Exception as e:  # noqa: BLE001
        print(f"{BAD} Netzwerkfehler bei {method} {path}: {e}")
        return 0, None


def errs(payload):
    if not payload:
        return ""
    out = []
    for e in (payload.get("errors") or []):
        out.append(f"[{e.get('code')}] {e.get('message')}")
    return "; ".join(out)


def main():
    print("── Cloudflare-Preflight ───────────────────────────────")
    if not TOKEN:
        print(f"{BAD} CLOUDFLARE_API_TOKEN ist nicht gesetzt.")
        print("   → Repo-Secret setzen: Settings → Secrets and variables → Actions.")
        sys.exit(1)
    print(f"   Token-Länge: {len(TOKEN)} Zeichen (Wert wird nie ausgegeben)")

    missing = []  # für --strict

    # 1) Token aktiv?  (Token-Verify; braucht keine Extra-Permission)
    st, pl = call("GET", "/user/tokens/verify")
    if pl and pl.get("success") and (pl.get("result") or {}).get("status") == "active":
        print(f"{OK} Token ist aktiv und gültig.")
    elif st == 0:
        sys.exit(1)
    else:
        print(f"{BAD} Token-Verify fehlgeschlagen (HTTP {st}). {errs(pl)}")
        print("   → Token ist abgelaufen/ungültig. Neuen Token erstellen.")
        sys.exit(1)

    # 2) Account auflösen  (Account-Liste = Token sieht Account)
    acc_id, acc_name = ACCOUNT_ID, ""
    st, pl = call("GET", "/accounts")
    accounts = (pl or {}).get("result") or []
    if accounts:
        if not acc_id:
            acc_id = accounts[0]["id"]
        acc_name = next((a["name"] for a in accounts if a["id"] == acc_id), accounts[0]["name"])
        print(f"{OK} Account erreichbar: {acc_name}  (ID {acc_id[:6]}…)")
        if len(accounts) > 1 and not ACCOUNT_ID:
            print(f"{WARN}Token sieht {len(accounts)} Accounts — CLOUDFLARE_ACCOUNT_ID besser explizit setzen.")
    elif acc_id:
        print(f"{WARN}Account-Liste leer, nutze CLOUDFLARE_ACCOUNT_ID={acc_id[:6]}…")
    else:
        print(f"{BAD} Kein Account ermittelbar. {errs(pl)}  → CLOUDFLARE_ACCOUNT_ID setzen.")
        missing.append("account")
        acc_id = None

    # 3) Pages-Zugriff  (Projekte listen = Pages:Read; Edit nötig zum Deployen)
    pages_ok = False
    if acc_id:
        st, pl = call("GET", f"/accounts/{acc_id}/pages/projects")
        if pl and pl.get("success"):
            pages_ok = True
            projs = pl.get("result") or []
            print(f"{OK} Cloudflare Pages erreichbar — {len(projs)} Projekt(e):")
            main_proj = None
            for p in projs:
                doms = ", ".join(p.get("domains") or []) or "—"
                sub = (p.get("subdomain") or "")
                star = ""
                if BASE_DOMAIN in (p.get("domains") or []) or any(
                        d == BASE_DOMAIN for d in (p.get("domains") or [])):
                    main_proj = p["name"]
                    star = "  ← Haupt-Site (abannews.com)"
                print(f"     • {p['name']:<24} {sub:<22} [{doms}]{star}")
            if main_proj:
                print(f"{OK} Haupt-Site-Projekt erkannt: \"{main_proj}\"")
                print(f"     → Repo-Variable setzen:  CF_PAGES_PROJECT = {main_proj}")
            else:
                print(f"{WARN}Kein Projekt mit Domain {BASE_DOMAIN} gefunden "
                      f"(Haupt-Site evtl. über Git-Integration mit anderem Namen).")
        elif st in (401, 403) or "10000" in errs(pl):
            print(f"{BAD} Pages-Zugriff verweigert (Auth-Fehler). {errs(pl)}")
            print("   → Token fehlt die Berechtigung »Account · Cloudflare Pages · Edit«.")
            missing.append("pages")
        else:
            print(f"{BAD} Pages-Abfrage fehlgeschlagen (HTTP {st}). {errs(pl)}")
            missing.append("pages")

    # 4) Zone/DNS  (für Custom-Domains der Radar-Subdomains)
    st, pl = call("GET", f"/zones?name={BASE_DOMAIN}")
    zones = (pl or {}).get("result") or []
    if zones:
        zid = zones[0]["id"]
        print(f"{OK} Zone {BASE_DOMAIN} erreichbar (Zone · Read).")
        st2, pl2 = call("GET", f"/zones/{zid}/dns_records?per_page=1")
        if pl2 and pl2.get("success"):
            print(f"{OK} DNS-Records lesbar (Zone · DNS · Read; für CNAME-Anlage zusätzlich Edit nötig).")
        else:
            print(f"{WARN}DNS-Records nicht lesbar. {errs(pl2)} → »Zone · DNS · Edit« fehlt evtl.")
            missing.append("dns")
    elif st in (401, 403):
        print(f"{BAD} Zone-Zugriff verweigert. → »Zone · DNS · Edit« für die {BASE_DOMAIN}-Zone fehlt.")
        missing.append("dns")
    else:
        print(f"{WARN}Zone {BASE_DOMAIN} nicht gefunden (HTTP {st}). {errs(pl)}")

    # Fazit
    print("── Fazit ──────────────────────────────────────────────")
    if not missing:
        print(f"{OK} Token ist voll einsatzbereit: Pages-Deploy + DNS möglich.")
        print("   Nächster Schritt: Repo-Variable CF_DIRECT_DEPLOY=true setzen,")
        print("   dann deployt der Workflow »Cloudflare Pages« automatisch.")
    else:
        need = {
            "pages": "Account · Cloudflare Pages · Edit",
            "dns":   "Zone · DNS · Edit  (Zone: abannews.com)",
            "account": "Account-ID prüfen / CLOUDFLARE_ACCOUNT_ID setzen",
        }
        print("Es fehlt noch:")
        for m in missing:
            print(f"  {BAD} {need.get(m, m)}")
        print("   → Token unter https://dash.cloudflare.com/profile/api-tokens")
        print("     um diese Berechtigungen erweitern (oder neu erstellen) und Secret aktualisieren.")
        if STRICT:
            sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
