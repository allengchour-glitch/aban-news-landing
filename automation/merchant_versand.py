#!/usr/bin/env python3
"""Versanddienst für Liechtenstein im Google Merchant Center (Merchant API, Dienstkonto GCP_SA_KEY).

Anlass (11.11.2026): Merchant Center meldet «Für einige Länder fehlen Versandinformationen» bei 256 228 Artikeln
(79,6 %). Der Shop verkauft nach Liechtenstein (Shopify-Versandprofil «Allgemeines Profil», Zone «Liechtenstein»,
Tarif «Standard Liechtenstein» CHF 14.90, ohne Bedingung, gemessen 11.11.), im Merchant Center fehlt dafür ein Dienst.
Entscheid des Besitzers 10.11.: Variante A (Dienst anlegen, CHF 14.90, kein Gratisversand). Auftrag 11.11.: «das dannach mal fix».

MODUS (Umgebung): pruefen (Vorgabe: lesen und Trockenlauf), schreiben (Dienst anlegen, dann frisch zurücklesen),
zurueck (nur den hier angelegten Dienst wieder entfernen). Gibt keine Merchant-Nummer aus.
"""
import copy, json, os, sys
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"
NAME = "Standard Liechtenstein"
TARIF_MICROS = "14900000"  # CHF 14.90 wie im Shopify-Versandprofil


def anmelden():
    info = json.loads(os.environ["GCP_SA_KEY"])
    cred = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    cred.refresh(Request())
    return {"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"}


def konto(h):
    r = requests.get("https://merchantapi.googleapis.com/accounts/v1/accounts?pageSize=50", headers=h, timeout=30)
    r.raise_for_status()
    k = r.json().get("accounts") or []
    if len(k) != 1:
        print(f"ABBRUCH: {len(k)} Konten sichtbar"); sys.exit(3)
    return k[0]["name"]


def lesen(h, name):
    r = requests.get(f"https://merchantapi.googleapis.com/accounts/v1/{name}/shippingSettings", headers=h, timeout=30)
    if r.status_code == 404:
        return {"services": []}
    if r.status_code != 200:
        print(f"ABBRUCH: shippingSettings lesen HTTP {r.status_code}: {r.text[:300]}"); sys.exit(4)
    return r.json()


def zeigen(titel, s):
    print(titel)
    for d in s.get("services") or []:
        rg = d.get("rateGroups") or []
        tarife = []
        for g in rg:
            sv = g.get("singleValue") or {}
            fr = sv.get("flatRate")
            tarife.append(f"{int(fr['amountMicros'])/1e6:.2f} {fr.get('currencyCode','')}" if fr else
                          ("kein Versand" if sv.get("noShipping") else "Tabelle/anders"))
        mov = d.get("minimumOrderValue")
        dt = d.get("deliveryTime") or {}
        print(f"  - {d.get('serviceName')!r} aktiv={d.get('active')} Länder={d.get('deliveryCountries')} "
              f"Währung={d.get('currencyCode')} Tarife={tarife} Mindestbestellwert={mov} "
              f"Bearbeitung={dt.get('minHandlingDays')}-{dt.get('maxHandlingDays')} "
              f"Transit={dt.get('minTransitDays')}-{dt.get('maxTransitDays')} Typ={d.get('shipmentType')}")
    print(f"  Lager: {len(s.get('warehouses') or [])}, etag vorhanden: {bool(s.get('etag'))}")


def li_vorhanden(s):
    return [d for d in s.get("services") or [] if "LI" in (d.get("deliveryCountries") or []) and d.get("active")]


def neuer_dienst(s):
    ch = [d for d in s.get("services") or [] if "CH" in (d.get("deliveryCountries") or []) and d.get("active")]
    if not ch:
        print("ABBRUCH: kein aktiver Schweizer Dienst als Vorlage für Lieferzeiten"); sys.exit(5)
    vorlage = ch[0]
    dienst = {
        "serviceName": NAME,
        "active": True,
        "deliveryCountries": ["LI"],
        "currencyCode": "CHF",
        "deliveryTime": copy.deepcopy(vorlage.get("deliveryTime") or {}),
        "rateGroups": [{"name": NAME, "applicableShippingLabels": [],
                        "singleValue": {"flatRate": {"amountMicros": TARIF_MICROS, "currencyCode": "CHF"}}}],
    }
    if vorlage.get("shipmentType"):
        dienst["shipmentType"] = vorlage["shipmentType"]
    return dienst


def einfuegen(h, name, s):
    body = {k: v for k, v in s.items() if k in ("services", "warehouses", "etag")}
    r = requests.post(f"https://merchantapi.googleapis.com/accounts/v1/{name}/shippingSettings:insert", headers=h,
                      json=body, timeout=60)
    if r.status_code != 200:
        print(f"ABBRUCH: shippingSettings:insert HTTP {r.status_code}: {r.text[:500]}"); sys.exit(6)
    try:
        antwort = r.json()
        print("insert-Antwort, Dienste:", [d.get("serviceName") for d in antwort.get("services") or []])
    except Exception:
        print("insert-Antwort ohne JSON")


def ohne_name(s):
    return {k: v for k, v in s.items() if k != "name"}


def main():
    modus = os.environ.get("MODUS", "pruefen").strip() or "pruefen"
    h = anmelden()
    name = konto(h)
    vorher = lesen(h, name)
    zeigen("Merchant-Versanddienste jetzt:", vorher)
    with open("versand_vorher.json", "w") as f:
        json.dump(ohne_name(vorher), f, ensure_ascii=False, indent=1)
    if modus == "zurueck":
        rest = [d for d in vorher.get("services") or [] if d.get("serviceName") != NAME]
        if len(rest) == len(vorher.get("services") or []):
            print("ERGEBNIS: kein Dienst «Standard Liechtenstein» vorhanden, nichts zu tun"); return 0
        neu = dict(vorher); neu["services"] = rest
        einfuegen(h, name, neu)
        zeigen("Nach der Rücknahme:", lesen(h, name)); print("ERGEBNIS: Rücknahme ausgeführt"); return 0
    if li_vorhanden(vorher):
        print("ERGEBNIS: Liechtenstein hat schon einen aktiven Dienst, nichts zu tun"); return 0
    dienst = neuer_dienst(vorher)
    print("Geplanter neuer Dienst:", json.dumps(dienst, ensure_ascii=False))
    if modus != "schreiben":
        print("ERGEBNIS: Trockenlauf, nichts geschrieben"); return 0
    neu = copy.deepcopy(vorher)
    neu["services"] = (neu.get("services") or []) + [dienst]
    einfuegen(h, name, neu)
    nach = lesen(h, name)
    zeigen("Frisch zurückgelesen:", nach)
    alt_ok = all(any(json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True) for b in nach.get("services") or [])
                 for a in vorher.get("services") or [])
    li_ok = any(d.get("serviceName") == NAME and d.get("deliveryCountries") == ["LI"] for d in nach.get("services") or [])
    print("ERGEBNIS:", "GLEICH (alte Dienste unverändert, Liechtenstein angelegt)" if alt_ok and li_ok else
          f"WEICHT AB (alte unverändert={alt_ok}, Liechtenstein={li_ok})")
    return 0 if alt_ok and li_ok else 7


if __name__ == "__main__":
    sys.exit(main())
