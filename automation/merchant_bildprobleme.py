#!/usr/bin/env python3
"""Liest im Google Merchant Center die Artikelprobleme und listet die Bildprobleme (nur lesen).

Zweck (11.11.2026, Besitzer: Werbetext von Produktbildern entfernen, zu kleine Bilder hochrechnen): Google meldete
im Merchant Center rund 357 Artikel mit «Werbeeinblendung im Bild» und 43 mit «Bild zu klein». Dieses Skript holt die
betroffenen Artikel, damit die Bilder gezielt bereinigt werden können.

Gibt KEINE Merchant-Nummer aus (Actions-Protokolle sind öffentlich): das Konto kommt aus der Kontoliste des
Dienstkontos. Ausgegeben werden Zählungen je Problemcode und je Bild-Problem die Zeile
«BILD|<code>|<offer_id>|<titel>», dazu die Datei bildprobleme.json (Workflow-Artefakt). Schreibt nichts im Merchant Center.
"""
import json, os, sys, time
from collections import Counter
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"
BILD = ("image", "overlay", "small")


def anmelden():
    roh = os.environ.get("GCP_SA_KEY", "")
    if not roh.strip():
        print("ABBRUCH: GCP_SA_KEY fehlt"); sys.exit(2)
    cred = service_account.Credentials.from_service_account_info(json.loads(roh), scopes=[SCOPE])
    cred.refresh(Request())
    return {"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"}


def konto(h):
    r = requests.get("https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50", headers=h, timeout=30)
    r.raise_for_status()
    konten = r.json().get("accounts") or []
    if len(konten) != 1:
        print(f"ABBRUCH: {len(konten)} Konten sichtbar, erwartet genau 1"); sys.exit(3)
    return konten[0]["name"]  # «accounts/<nummer>», wird nie ausgegeben


def suchen(h, name, abfrage):
    zeilen, token, seite = [], None, 0
    for version in ("v1", "v1beta"):
        url = f"https://merchantapi.googleapis.com/reports/{version}/{name}/reports:search"
        zeilen, token, seite = [], None, 0
        while True:
            body = {"query": abfrage, "pageSize": 1000}
            if token:
                body["pageToken"] = token
            for versuch in range(4):
                r = requests.post(url, headers=h, json=body, timeout=60)
                if r.status_code in (429, 500, 503):
                    time.sleep(2 ** versuch * 3); continue
                break
            if r.status_code == 404 and seite == 0:
                break  # diese Version gibt es nicht: nächste probieren
            if r.status_code != 200:
                print(f"ABBRUCH: reports:search {version} HTTP {r.status_code}: {r.text[:300]}"); sys.exit(4)
            j = r.json()
            zeilen += j.get("results") or []
            seite += 1
            token = j.get("nextPageToken")
            if not token:
                print(f"reports {version}: {seite} Seiten, {len(zeilen)} Zeilen")
                return zeilen
    print("ABBRUCH: keine Reports-Version erreichbar"); sys.exit(4)


def main():
    h = anmelden()
    name = konto(h)
    zeilen = suchen(h, name, "SELECT id, offer_id, title, item_issues FROM product_view")
    codes, treffer = Counter(), []
    beispiel = None
    for z in zeilen:
        pv = z.get("productView") or {}
        for iss in pv.get("itemIssues") or []:
            code = ((iss.get("type") or {}).get("code") or "?")
            codes[code] += 1
            if any(w in code.lower() for w in BILD):
                beispiel = beispiel or iss
                sev = (iss.get("severity") or {}).get("aggregatedSeverity", "")
                treffer.append({"code": code, "offer_id": pv.get("offerId", ""), "titel": (pv.get("title") or "")[:80],
                                "schwere": sev})
    print("Problemcodes (alle Artikel):")
    for c, n in codes.most_common(40):
        print(f"  {n:6d}  {c}")
    if beispiel:
        print("Beispiel eines Bildproblems (Struktur):", json.dumps(beispiel)[:600])
    for t in sorted(treffer, key=lambda t: (t["code"], t["offer_id"])):
        print(f"BILD|{t['code']}|{t['schwere']}|{t['offer_id']}|{t['titel']}")
    print(f"ERGEBNIS: {len(zeilen)} Artikel gelesen, {len(treffer)} Bildprobleme")
    with open("bildprobleme.json", "w") as f:
        json.dump({"gelesen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "codes": dict(codes), "bild": treffer}, f,
                  ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
