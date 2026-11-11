#!/usr/bin/env python3
"""Probe: kann das Dienstkonto GCP_SA_KEY das Google Merchant Center lesen? (nur lesen, nur Statuscodes)

Gibt KEINE Konto-Nummern aus (das Repo ist öffentlich, Actions-Logs ebenso), nur Statuscodes,
Fehlergründe und Anzahlen. Schreibt nichts.
"""
import json, os, sys, hashlib
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"

def kurz(t):
    return hashlib.sha256(str(t).encode()).hexdigest()[:8]

def fehlergrund(r):
    try:
        e = r.json().get("error", {})
    except Exception:
        return r.text[:120].replace("\n", " ")
    teile = [str(e.get("status", "")), str(e.get("message", ""))[:160]]
    for d in e.get("details", []) or []:
        if d.get("reason"):
            teile.append("reason=" + d["reason"])
        meta = d.get("metadata") or {}
        if meta.get("activationUrl"):
            teile.append("aktivieren: " + meta["activationUrl"])
    return " | ".join(t for t in teile if t)

def main():
    roh = os.environ.get("GCP_SA_KEY", "")
    if not roh.strip():
        print("ERGEBNIS: GCP_SA_KEY fehlt in Actions"); return 2
    info = json.loads(roh)
    print("Dienstkonto:", info.get("client_email", "?"), "| Projekt:", info.get("project_id", "?"))
    cred = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    cred.refresh(Request())
    h = {"Authorization": "Bearer " + cred.token}
    befunde = {}
    proben = [
        ("merchantapi_accounts_v1", "https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50"),
        ("merchantapi_accounts_v1beta", "https://merchantapi.googleapis.com/accounts/v1beta/accounts?pageSize=50"),
        ("content_authinfo", "https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo"),
    ]
    for name, url in proben:
        try:
            r = requests.get(url, headers=h, timeout=30)
        except Exception as ex:
            print(f"{name}: NETZFEHLER {type(ex).__name__}"); befunde[name] = ("netz", 0); continue
        if r.status_code == 200:
            j = r.json()
            konten = j.get("accounts") or j.get("accountIdentifiers") or []
            ids = [k.get("accountId") or k.get("merchantId") or k.get("aggregatorId") or k.get("name") for k in konten]
            print(f"{name}: HTTP 200, Konten sichtbar: {len(konten)} (Kennungen gekürzt: {[kurz(i) for i in ids]})")
            befunde[name] = ("ok", len(konten))
        else:
            print(f"{name}: HTTP {r.status_code} | {fehlergrund(r)}")
            befunde[name] = ("http", r.status_code)
    sichtbar = any(art == "ok" and n > 0 for art, n in befunde.values())
    print("ERGEBNIS:", "Zugang vorhanden" if sichtbar else "kein Konto sichtbar (API aus oder Dienstkonto nicht im Merchant Center eingetragen)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
