#!/usr/bin/env python3
"""Schaltet Googles Autofeed (Produkt-Crawling von luxestyle.ch) im Merchant Center ein oder aus.

Zweck (15.11.2026): Der Autofeed legt neben der Shopify-App eigene Einträge an. Messung (Lauf 43769734396):
8 398 der 8 681 Autofeed-Produkte hat das Schaufenster (`automation/gmc_schaufenster.mjs`) absichtlich vom
Google-Kanal genommen; aus dem Autofeed kommen auch die meisten Merchant-Fehler (Preis fehlt, alte Bilder).

Modus aus der Umgebung MODUS: «pruefen» (Vorgabe, nur lesen), «aus» (enableProducts=false), «ein» (Rücknahme).
Nach dem Schreiben wird frisch gelesen (die Merchant API zeigt Änderungen teils erst nach rund einer Minute).
Gibt KEINE Merchant-Nummer aus (Actions-Protokolle sind öffentlich).
Exitcodes: 0 gut, 2 Zugang fehlt, 3 Rücklesen weicht ab, 4 Schnittstelle antwortet nicht wie erwartet.
"""
import json, os, sys, time
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"
BASIS = "https://merchantapi.googleapis.com/accounts/v1"


def soll_wert(modus):
    """Gewünschter Wert für enableProducts je Modus; None = nur lesen."""
    return {"pruefen": None, "aus": False, "ein": True}.get(modus, "unbekannt")


def anmelden():
    roh = os.environ.get("GCP_SA_KEY", "")
    if not roh.strip():
        print("ABBRUCH: GCP_SA_KEY fehlt"); sys.exit(2)
    cred = service_account.Credentials.from_service_account_info(json.loads(roh), scopes=[SCOPE])
    cred.refresh(Request())
    return {"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"}


def konto(h):
    r = requests.get(f"{BASIS}/accounts?pageSize=50", headers=h, timeout=30)
    r.raise_for_status()
    konten = r.json().get("accounts") or []
    if len(konten) != 1:
        print(f"ABBRUCH: {len(konten)} Konten sichtbar, erwartet genau 1"); sys.exit(3)
    return konten[0]["name"]  # «accounts/<nummer>», wird nie ausgegeben


def lesen(h, name):
    r = requests.get(f"{BASIS}/{name}/autofeedSettings", headers=h, timeout=30)
    if r.status_code != 200:
        print(f"ABBRUCH: Lesen HTTP {r.status_code} " + r.text[:200].replace(name, "<konto>")); sys.exit(4)
    return werte(r.json())


def werte(j):
    """Schalter aus der Antwort. Die Merchant API lässt Felder mit dem Wert false weg (proto3-JSON): ein fehlendes
    enableProducts heisst also «aus» (gemessen 15.11.: nach dem Abschalten fehlte das Feld beim Rücklesen)."""
    return bool(j.get("enableProducts", False)), bool(j.get("eligible", False))


def main():
    modus = os.environ.get("MODUS", "pruefen").strip()
    soll = soll_wert(modus)
    if soll == "unbekannt":
        print(f"ABBRUCH: unbekannter Modus «{modus}» (pruefen, aus, ein)"); return 2
    h = anmelden()
    name = konto(h)
    an, berechtigt = lesen(h, name)
    print(f"VORHER: enableProducts={an} eligible={berechtigt}")
    if soll is None:
        print("ERGEBNIS: nur gelesen"); return 0
    if an is soll:
        print(f"ERGEBNIS: steht schon auf enableProducts={soll}, nichts zu tun"); return 0
    r = requests.patch(f"{BASIS}/{name}/autofeedSettings?updateMask=enableProducts", headers=h,
                       json={"name": f"{name}/autofeedSettings", "enableProducts": soll}, timeout=30)
    print(f"SCHREIBEN: HTTP {r.status_code}" + ("" if r.status_code == 200 else " " + r.text[:300].replace(name, "<konto>")))
    if r.status_code != 200:
        return 4
    for warte in (5, 60):
        time.sleep(warte)
        an, berechtigt = lesen(h, name)
        print(f"NACHHER (+{warte} s): enableProducts={an} eligible={berechtigt}")
        if an is soll:
            print(f"ERGEBNIS: enableProducts={soll} gesetzt und zurückgelesen. Rücknahme: MODUS={'ein' if soll is False else 'aus'}")
            return 0
    print("ERGEBNIS: Rücklesen weicht ab"); return 3


if __name__ == "__main__":
    sys.exit(main())
