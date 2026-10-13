#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gratis_schwelle_setzen.py — Gratis-Tarif «Kostenloser Versand» CH in ALLEN Profilen mit CH-Zone auf eine Schwelle
(13.10.2026, Betreiber-Entscheid D «D ja», dropship/BETREIBER-ENTSCHEIDE-2026-10-13.md).

ANLASS (Kassen-Prüfung 13.10., gemessen per draftOrderCalculate): Sirène 49.90 mit WELCOME10 → 44.91 Ware + CHF 7 Versand
= 51.91, ohne Code 49.90. Der Tarif prüft den Betrag NACH Rabatt; mit Code kostete der Kauf CHF 2.01 MEHR. Entscheid:
Schwelle 45.00 → 40.50 (= 45 × 0,9), dann ist jeder Einzelartikel ab 45 auch mit einem 10-%-Code versandfrei.
Gilt GLEICH in General profile, «CH-Lager» (ch_lager_profil.py) und «Druck auf Bestellung» (druck_profil.py): gleichnamige
Tarife verschiedener Profile werden addiert, eine Abweichung liesse Mischkörbe ohne «Kostenloser Versand».
LI bleibt (General 14.90, Zusatzprofile 0.00) — hier wird nur die CH-Zone angefasst.

WEG (versandschwelle_rabatt.py, gemessen 14.08.): `conditionsToUpdate` meldet keinen Fehler, schreibt den Betrag aber NICHT.
Gangbar: neue Versandart «Kostenloser Versand» 0.00 mit der neuen Bedingung anlegen und die alte in DERSELBEN Mutation auf
active=false setzen (bleibt im Profil, mit einem Klick zurückholbar). Die Transitzeit der neuen Versandart setzt danach
`python3 automation/versand_transit_wache.py --scharf` (Regel je Profil/Zone).

  python3 automation/gratis_schwelle_setzen.py              # Probelauf: Ist je Profil
  python3 automation/gratis_schwelle_setzen.py --scharf     # setzen, zurücklesen, Ledger dropship/_gratis_schwelle.tsv
  python3 automation/gratis_schwelle_setzen.py --zurueck --scharf   # Rückweg: alte Versandart an, neue aus (laut Ledger)

STAND 13.10.2026 23:1x UTC: Probelauf ok (3 Profile 45.00 → 40.50), der --scharf-Lauf wurde vom Auto-Modus-Klassifikator der
Sitzung ABGELEHNT (Live-Versandtarife) → wartet auf ausdrückliche Freigabe/Start durch den Betreiber. Danach in dieser Reihenfolge:
  1. python3 automation/gratis_schwelle_setzen.py --scharf
  2. python3 automation/versand_transit_wache.py --scharf          (Transitzeit der neuen Versandarten)
  3. automation/ch_lager_profil.py: GRATIS_AB_CH = 40.50           (eine Quelle für alle Wächter + JSON-LD)
  4. Theme: 4500 → 4050 (cart-summary, theme.liquid, product.json lux_trust/lux_delivery: «ohne Gutschein» ab 4050,
     ohne Zusatz ab 4500), warenkorb_einig.TARIF = 4050 — Bauplan im Bericht dropship/GRATISVERSAND-CH-LAGER-UND-4050-2026-10-13.md
  5. PHASE=nachher python3 tools/gratis_testkoerbe.py && python3 tools/gratis_testkoerbe.py --vergleich (niemand zahlt mehr)
"""
import os
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from ch_lager_profil import GRATIS_AB_CH as IST_KONSTANTE, gql  # noqa: E402

# Ziel-Schwelle dieses Laufs (Entscheid D). Bewusst NICHT ch_lager_profil.GRATIS_AB_CH: die Konstante beschreibt den IST-Stand
# und wird erst NACH einem erfolgreichen --scharf-Lauf auf 40.50 gestellt (sonst stellt versandschwelle_rabatt nur General um).
GRATIS_AB_CH = float(os.environ.get("SOLL", "40.50"))

PROFILE = ["General profile", "CH-Lager", "Druck auf Bestellung"]
NAME = "Kostenloser Versand"
LEDGER = os.path.join(REPO, "dropship", "_gratis_schwelle.tsv")
SCHARF = "--scharf" in sys.argv

Q = """query($id:ID!){deliveryProfile(id:$id){id name profileLocationGroups{locationGroup{id}
 locationGroupZones(first:20){nodes{zone{id name countries{code{countryCode}}}
  methodDefinitions(first:20){nodes{id name active rateProvider{... on DeliveryRateDefinition{price{amount}}}
   methodConditions{field operator conditionCriteria{... on MoneyV2{amount}}}}}}}}}}"""
M = "mutation($id:ID!,$p:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$p){profile{id} userErrors{field message}}}"


def profile_ids():
    aus, nach = {}, None
    while True:
        d = gql("query($n:String){deliveryProfiles(first:50,after:$n){pageInfo{hasNextPage endCursor} nodes{id name}}}",
                {"n": nach})["deliveryProfiles"]
        aus.update({p["name"]: p["id"] for p in d["nodes"] if p["name"] in PROFILE})
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def gratis_methoden(pid):
    """[(location_group, zone, methode, schwelle, aktiv)] — Versandart NAME, Preis 0, CH-Zone."""
    p = gql(Q, {"id": pid}, ver="unstable")["deliveryProfile"]
    aus = []
    for g in p["profileLocationGroups"]:
        for zn in g["locationGroupZones"]["nodes"]:
            if "CH" not in [c["code"]["countryCode"] for c in zn["zone"]["countries"]]:
                continue
            for m in zn["methodDefinitions"]["nodes"]:
                preis = float(((m.get("rateProvider") or {}).get("price") or {}).get("amount") or -1)
                ab = [float((c.get("conditionCriteria") or {}).get("amount") or 0) for c in m["methodConditions"]
                      if c["field"] == "TOTAL_PRICE" and c["operator"] == "GREATER_THAN_OR_EQUAL_TO"]
                if m["name"] == NAME and preis == 0 and ab:
                    aus.append((g["locationGroup"]["id"], zn["zone"]["id"], m["id"], min(ab), m["active"]))
    return aus


def ledger(*teile):
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        if neu:
            f.write("zeit\taktion\tprofil\tprofil_id\tlocation_group\tzone\tmethode_alt\tschwelle_alt\tmethode_neu\tschwelle_neu\n")
        f.write("\t".join(str(t) for t in (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),) + teile) + "\n")
        f.flush()
        os.fsync(f.fileno())


def setzen():
    ids = profile_ids()
    fehler = 0
    for name in PROFILE:
        pid = ids.get(name)
        if not pid:
            print(f"⚠️ Profil «{name}» nicht gefunden"); fehler += 1; continue
        aktiv = [x for x in gratis_methoden(pid) if x[4]]
        if len(aktiv) != 1:
            print(f"⚠️ {name}: {len(aktiv)} aktive «{NAME}» in CH — von Hand prüfen {aktiv}"); fehler += 1; continue
        lg, zone, alt, ab, _ = aktiv[0]
        if abs(ab - GRATIS_AB_CH) < 0.005:
            print(f"✓ {name}: schon ab {ab:.2f}"); continue
        print(f"{'SETZE' if SCHARF else 'würde setzen'} {name}: {ab:.2f} → {GRATIS_AB_CH:.2f} (alte Versandart {alt} wird inaktiv)")
        if not SCHARF:
            continue
        p = {"locationGroupsToUpdate": [{"id": lg, "zonesToUpdate": [{"id": zone,
             "methodDefinitionsToUpdate": [{"id": alt, "active": False}],
             "methodDefinitionsToCreate": [{"name": NAME, "active": True,
                                            "rateDefinition": {"price": {"amount": "0.00", "currencyCode": "CHF"}},
                                            "priceConditionsToCreate": [{"criteria": {"amount": f"{GRATIS_AB_CH:.2f}",
                                                                                      "currencyCode": "CHF"},
                                                                         "operator": "GREATER_THAN_OR_EQUAL_TO"}]}]}]}]}
        r = gql(M, {"id": pid, "p": p}, ver="unstable")["deliveryProfileUpdate"]
        if r["userErrors"]:
            print(f"✗ {name}: {r['userErrors']}"); fehler += 1; continue
        nachher = gratis_methoden(pid)
        neu = [x for x in nachher if x[4]]
        alt_jetzt = [x for x in nachher if x[2] == alt]
        ok = len(neu) == 1 and abs(neu[0][3] - GRATIS_AB_CH) < 0.005 and neu[0][2] != alt and \
            (not alt_jetzt or not alt_jetzt[0][4])
        ledger("setzen" if ok else "setzen-unklar", name, pid, lg, zone, alt, f"{ab:.2f}",
               neu[0][2] if neu else "", f"{neu[0][3]:.2f}" if neu else "")
        print(f"{'✓' if ok else '✗'} {name}: zurückgelesen aktiv {[(x[2], x[3]) for x in neu]} · alt {alt_jetzt}")
        fehler += not ok
    if SCHARF:
        print("Weiter: python3 automation/versand_transit_wache.py --scharf · dann ch_lager_profil.GRATIS_AB_CH "
              f"(jetzt {IST_KONSTANTE:.2f}) auf {GRATIS_AB_CH:.2f} + Theme 4500 → {round(GRATIS_AB_CH * 100)} (siehe Kopf)")
    return fehler


def zurueck():
    if not os.path.exists(LEDGER):
        print("kein Ledger — nichts zurückzunehmen"); return 0
    zeilen = [z.rstrip("\n").split("\t") for z in open(LEDGER, encoding="utf-8")][1:]
    letzte = {}
    for z in zeilen:
        if z[1] == "setzen":
            letzte[z[2]] = z
    fehler = 0
    for name, z in letzte.items():
        _, _, _, pid, lg, zone, alt, ab_alt, neu, ab_neu = z
        print(f"{'ZURÜCK' if SCHARF else 'würde zurück'} {name}: {neu} (ab {ab_neu}) aus, {alt} (ab {ab_alt}) an")
        if not SCHARF:
            continue
        p = {"locationGroupsToUpdate": [{"id": lg, "zonesToUpdate": [{"id": zone, "methodDefinitionsToUpdate": [
             {"id": alt, "active": True}, {"id": neu, "active": False}]}]}]}
        r = gql(M, {"id": pid, "p": p}, ver="unstable")["deliveryProfileUpdate"]
        ok = not r["userErrors"]
        ledger("zurueck" if ok else f"zurueck-fehler {r['userErrors']}", name, pid, lg, zone, alt, ab_alt, neu, ab_neu)
        fehler += not ok
    return fehler


if __name__ == "__main__":
    sys.exit(1 if (zurueck() if "--zurueck" in sys.argv else setzen()) else 0)
