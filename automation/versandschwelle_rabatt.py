#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
versandschwelle_rabatt.py — «Gratis-Versand ab CHF 50» auch dann einhalten,
wenn der Automatik-Rabatt den Warenkorb rechnerisch unter 50 drueckt.

BEFUND (FEHLERSUCHE-14-08.md, Abschnitt [rabatte], live nachgeprueft 2026-08-14)
------------------------------------------------------------------------------
Die Ankuendigungsleiste und rund 31'000 Produkt-, Kollektions- und Blogtexte
versprechen «Gratis-Versand ab CHF 50». Die Versandregel im Profil «General
profile» / Zone Domestic (CH) lautet aber TOTAL_PRICE >= CHF 50.00, und
TOTAL_PRICE ist bei Shopify der Betrag NACH Abzug aller Rabatte. Der
Automatik-Rabatt «Bundle: 2+ Artikel -10%» (ACTIVE seit 01.06.2026, gilt fuer
jeden Korb ab 2 Artikeln, ohne Zutun der Kundin) zieht 10 % ab. Damit entsteht
eine Totzone: Warenwert CHF 50.00 bis 55.55 -> nach Rabatt unter CHF 50 ->
keine Gratis-Versand-Zeile, die Kasse verlangt CHF 7.00.

Es gibt in Shopify KEINE Einstellung, die eine Versandbedingung auf den Wert
VOR Rabatt stellt: DeliveryCondition kennt nur TOTAL_PRICE (= nach Rabatt) und
WEIGHT. Ein Shopify-Function-«Delivery Customization» koennte Tarife nur
ausblenden, nicht zusaetzlich einblenden, und braeuchte eine eigene App.
Der saubere Weg ohne App ist deshalb: die Bedingung um genau den hoechsten
AUTOMATIK-Rabatt absenken, also 50.00 x (1 - 0.10) = CHF 45.00.
Danach gilt fuer jeden Korb: Warenwert >= 50  ==>  nach Rabatt >= 45  ==>
Gratis-Versand. Das Versprechen kann nicht mehr gebrochen werden.

LIVE-MESSUNGEN VOR DER AENDERUNG (Storefront-API-Warenkorb, CH/8001 Zuerich;
dieselbe Rechnung, die die Kasse anstellt — inkl. Automatik-Rabatten):
  1x CHF 27.50            Ware 27.50  Rabatt 0.00  -> Versand 7.00  -> 34.50
  2x CHF 27.50            Ware 55.00  Rabatt 5.50  -> Versand 7.00  -> 56.50  <-- TOTZONE
  24.90 + 27.50           Ware 52.40  Rabatt 5.24  -> Versand 7.00  -> 54.16  <-- TOTZONE
  27.50 + 29.90           Ware 57.40  Rabatt 5.74  -> Versand 0.00  -> 51.66
  3x CHF 27.50            Ware 82.50  Rabatt 8.25  -> Versand 0.00  -> 74.25
Wer fuer 55.00 einkauft, zahlt 56.50; wer fuer 57.40 einkauft, zahlt 51.66 —
mehr Ware, weniger Endpreis.

FEHLTREFFER / VERWORFENE ANNAHMEN AUS DEM PROBELAUF
---------------------------------------------------
1) Der Befund stuetzte sich auf /cart/shipping_rates.json. Dieser Endpunkt
   zeigt nur TARIFE und kennt Versand-RABATTE nicht. Es gibt aber einen
   aktiven Automatik-Versandrabatt «Gratis-Versand ab CHF 49» (CH, Mindest-
   Zwischensumme 49). Der Befund haette also falsch sein koennen. Gegenprobe
   ueber den echten Storefront-Warenkorb (totalAmount): 2x 27.50 = 56.50 —
   der Befund stimmt. Grund: «Bundle: 2+ Artikel -10%» hat
   combinesWith.shippingDiscounts = false und schaltet den Versandrabatt ab,
   sobald er selbst greift. Bei 1x 49.90 (kein Bundle-Rabatt) greift der
   Versandrabatt dagegen sichtbar (Rabatt 7.00, zu zahlen 49.90).
   -> Nur eine Messung am echten Warenkorb-Total zaehlt, nicht am Tarif.
2) Erster Entwurf: Schwelle auf 37.50 senken, damit auch Codes mit 25 %
   (INFLUENCER25, WEDDING25 …) das Versprechen halten. VERWORFEN — dann
   bekaeme ein Ein-Artikel-Korb von CHF 37.50 ohne jeden Rabatt Gratis-Versand;
   bei Bestellwerten von bisher CHF 14.90-34.90 waere das ein Dauerverlust.
   Rabattcodes tippt die Kundin bewusst ein und sieht den Abzug; der
   Automatik-Rabatt passiert ungefragt. Nur der Automatik-Rabatt wird
   ausgeglichen. (Nachlaufkosten der 45.00: Ein-Artikel-Koerbe zwischen
   CHF 45.00 und 48.99 bekommen den Versand geschenkt — die Spanne 49.00-49.99
   verschenkte der Versandrabatt schon vorher.)
3) Erster Entwurf: den Automatik-Rabatt «Bundle: 2+ Artikel -10%» auf
   combinesWith.shippingDiscounts = true stellen, damit der Versandrabatt
   «ab CHF 49» wieder greift. VERWORFEN als alleinige Loesung — dessen
   Mindestbetrag von 49 wird ebenfalls nach Rabatt gemessen, die Totzone
   schruempfte nur von [50.00, 55.55] auf [50.00, 54.44] statt zu verschwinden.
4) Die veraltete Zweitregel «Standard CHF 0.00 ab TOTAL_PRICE >= 65.00» wurde
   NICHT angefasst. Sie ist ein Rest der alten CHF-65-Kommunikation, richtet
   aber keinen Schaden an: sie setzt oberhalb 65 den Standard-Tarif auf 0.00,
   verspricht also nichts Falsches. Loeschen von Versandkonfiguration ohne
   Not — siehe Hausregel «niemals loeschen».

ZWEITER TEIL: DIE LEISTE IM WARENKORB
-------------------------------------
layout/theme.liquid rechnet den Fortschrittsbalken gegen cart.total_price,
also ebenfalls gegen den Wert NACH Rabatt. Bei Ware fuer CHF 55.00 stand dort
«Noch CHF 0.50 bis zum Gratis-Versand» — fuer die Kundin unverstaendlich, weil
im selben Warenkorb CHF 55.00 Ware liegt. Der Balken rechnet jetzt gegen
cart.items_subtotal_price (Warenwert VOR Rabatt), also gegen genau die Zahl,
die in allen Texten beworben wird. Zusammen mit der 45.00-Regel gilt danach:
sagt der Balken «gesichert», ist der Versand auch wirklich gratis; unterhalb
von CHF 50 kann die Kasse hoechstens guenstiger sein als angekuendigt, nie
teurer.

QUELLE (Hausregel 7: wer schreibt das Feld beim naechsten Mal?)
--------------------------------------------------------------
Die Regel bricht wieder, sobald jemand einen AUTOMATIK-Rabatt ueber 10 %
anlegt (Codes sind unkritisch). Dieses Skript ist deshalb auch die Wache:
ohne --scharf liest es die Lage live, rechnet die noetige Schwelle neu und
meldet jede Abweichung mit Rueckgabewert 1. Aufruf im Keepalive:
    python3 automation/versandschwelle_rabatt.py --pruefen

AUFRUFE
-------
    python3 automation/versandschwelle_rabatt.py              # DRY, zeigt alles
    python3 automation/versandschwelle_rabatt.py --scharf     # setzt Tarif + Leiste
    python3 automation/versandschwelle_rabatt.py --pruefen    # nur Wache (exit 1 bei Drift)
"""

import json
import os
import sys
import urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
THEME = "gid://shopify/OnlineStoreTheme/187533001089"

PROFIL = "gid://shopify/DeliveryProfile/132124180865"
STANDORTGRUPPE = "gid://shopify/DeliveryLocationGroup/134126436737"
ZONE_CH = "gid://shopify/DeliveryZone/608365379969"
NAME_GRATIS = "Kostenloser Versand"

# ⚠️ WEG ZUM SETZEN — zwei Sackgassen, damit sie niemand nochmal sucht:
#  (a) deliveryProfileUpdate(... conditionsToUpdate:[{id, criteria}]) meldet KEINEN Fehler,
#      legt die Bedingung sogar unter neuer ID an — schreibt den neuen Betrag aber NICHT.
#      Mit und ohne field/operator, mit Float und Integer geprueft: bleibt bei 50.00.
#      Eine Mutation ohne userErrors ist hier also KEIN Beleg (Hausregel 6) — immer
#      danach live nachlesen.
#  (b) Die Bedingung loeschen und neu anlegen scheitert an
#      «Method definition cannot save conditions with the same operator»; ausserdem
#      loeschen wir nichts (Hausregel 2).
#  Gangbar ist: eine ZWEITE Versandart mit der richtigen Schwelle anlegen und die alte
#  auf active=false setzen. Sie bleibt im Profil stehen und ist mit einem Klick zurueckholbar.

BEWORBEN = 50.00          # das, was in Leiste, Produkt-, Kollektions- und Blogtexten steht
LEDGER = "dropship/_versandschwelle_rabatt.txt"


def token():
    return open(TOKEN_DATEI).read().strip()


def gql(query, variables=None):
    """Eine gescheiterte Anfrage ist kein Ergebnis (Hausregel 6) -> Ausnahme."""
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        SHOP, data=body,
        headers={"X-Shopify-Access-Token": token(), "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    if "errors" in d:
        raise RuntimeError(json.dumps(d["errors"], ensure_ascii=False))
    return d["data"]


def notiere(zeile):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, "a") as f:            # Hausregel 5: jede Zeile sofort auf Platte
        f.write(zeile + "\n")
        f.flush()
        os.fsync(f.fileno())


# ---------------------------------------------------------------- Lage lesen

Q_RABATTE = """{ automaticDiscountNodes(first:100){ nodes{ id automaticDiscount{
  __typename
  ... on DiscountAutomaticBasic { title status
      customerGets{ value{ ... on DiscountPercentage{percentage}
                           ... on DiscountAmount{amount{amount}} } } }
  ... on DiscountAutomaticFreeShipping { title status } } } } }"""

Q_TARIFE = """{ deliveryProfile(id:"%s"){ profileLocationGroups{ locationGroupZones(first:20){ nodes{
  zone{ id name }
  methodDefinitions(first:20){ nodes{ id name active
    rateProvider{ ... on DeliveryRateDefinition{ price{amount} } }
    methodConditions{ id field operator
      conditionCriteria{ ... on MoneyV2 { amount } } } } } } } } } }""" % PROFIL


def hoechster_automatik_rabatt():
    """Nur PROZENT-Automatikrabatte auf die Bestellung; Betrags-Rabatte melden wir separat."""
    d = gql(Q_RABATTE)
    prozent, betrag = 0.0, []
    for n in d["automaticDiscountNodes"]["nodes"]:
        a = n["automaticDiscount"]
        if a.get("status") != "ACTIVE":
            continue
        wert = (a.get("customerGets") or {}).get("value") or {}
        if "percentage" in wert:
            prozent = max(prozent, float(wert["percentage"]))
        elif "amount" in wert:
            betrag.append((a.get("title"), wert["amount"]["amount"]))
    return prozent, betrag


def gratis_versandart():
    """Die AKTIVE Gratis-Versandart der CH-Zone (ueber Preis 0 gesucht, nicht ueber eine
    fest notierte ID — die ID wechselt bei jedem Setzen)."""
    d = gql(Q_TARIFE)
    for lg in d["deliveryProfile"]["profileLocationGroups"]:
        for z in lg["locationGroupZones"]["nodes"]:
            if z["zone"]["id"] != ZONE_CH:
                continue
            for m in z["methodDefinitions"]["nodes"]:
                if not m["active"] or m["name"] != NAME_GRATIS:
                    continue
                preis = float((m.get("rateProvider") or {}).get("price", {}).get("amount", "-1"))
                if preis != 0.0:
                    continue
                for c in m["methodConditions"]:
                    if c["field"] == "TOTAL_PRICE":
                        return m["id"], float(c["conditionCriteria"]["amount"])
    raise RuntimeError("Aktive Gratis-Versandart in Zone Domestic nicht gefunden")


# ------------------------------------------------------------------ Schreiben

M_TARIF = """mutation($id:ID!,$p:DeliveryProfileInput!){
  deliveryProfileUpdate(id:$id, profile:$p){
    profile{id} userErrors{field message} } }"""


def setze_schwelle(alte_methode, neu):
    """Neue Gratis-Versandart mit der richtigen Schwelle anlegen und die alte in EINER
    Mutation stilllegen. Schlaegt etwas fehl, bleibt alles wie es war."""
    p = {"locationGroupsToUpdate": [{
        "id": STANDORTGRUPPE,
        "zonesToUpdate": [{
            "id": ZONE_CH,
            "methodDefinitionsToUpdate": [{"id": alte_methode, "active": False}],
            "methodDefinitionsToCreate": [{
                "name": NAME_GRATIS,
                "active": True,
                "rateDefinition": {"price": {"amount": "0.0", "currencyCode": "CHF"}},
                "priceConditionsToCreate": [{
                    "criteria": {"amount": "%.2f" % neu, "currencyCode": "CHF"},
                    "operator": "GREATER_THAN_OR_EQUAL_TO"}],
            }],
        }],
    }]}
    d = gql(M_TARIF, {"id": PROFIL, "p": p})
    fehler = d["deliveryProfileUpdate"]["userErrors"]
    if fehler:
        raise RuntimeError(json.dumps(fehler, ensure_ascii=False))


ALT_LEISTE = "var rest=SCHWELLE-cart.total_price;"
NEU_LEISTE = ("var ware=(cart.items_subtotal_price!=null?cart.items_subtotal_price:cart.total_price);\n"
              "    // 2026-08-14: gegen den Warenwert VOR Rabatt rechnen. Der Automatik-Rabatt\n"
              "    // '2+ Artikel -10%' senkte cart.total_price, sodass die Leiste bei CHF 55.00\n"
              "    // Ware noch 'Noch CHF 0.50' anzeigte. Die Versandregel steht passend dazu auf\n"
              "    // 45.00 = 50.00 x 0.9, damit ab CHF 50 Ware der Versand wirklich gratis ist.\n"
              "    var rest=SCHWELLE-ware;")
ALT_BREITE = "Math.round(cart.total_price/SCHWELLE*100)"
NEU_BREITE = "Math.round(ware/SCHWELLE*100)"

Q_THEME = """{ node(id:"%s"){ ... on OnlineStoreTheme { files(first:1, filenames:["layout/theme.liquid"]){
  nodes{ body{ ... on OnlineStoreThemeFileBodyText{content} } } } } } }""" % THEME

M_THEME = """mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){
  themeFilesUpsert(themeId:$id, files:$files){
    upsertedThemeFiles{filename} userErrors{filename message} } }"""


def leiste_lesen():
    d = gql(Q_THEME)
    return d["node"]["files"]["nodes"][0]["body"]["content"]


def leiste_schreiben(inhalt):
    d = gql(M_THEME, {"id": THEME, "files": [{
        "filename": "layout/theme.liquid",
        "body": {"type": "TEXT", "value": inhalt}}]})
    fehler = d["themeFilesUpsert"]["userErrors"]
    if fehler:
        raise RuntimeError(json.dumps(fehler, ensure_ascii=False))


# ---------------------------------------------------------------------- Lauf

def main():
    scharf = "--scharf" in sys.argv
    nur_wache = "--pruefen" in sys.argv

    prozent, betrags_rabatte = hoechster_automatik_rabatt()
    methode, ist = gratis_versandart()
    soll = round(BEWORBEN * (1 - prozent) + 1e-9, 2)

    print("Beworbene Schwelle .............. CHF %.2f" % BEWORBEN)
    print("Hoechster AUTOMATIK-Rabatt ...... %.0f %%" % (prozent * 100))
    print("Noetige Versandbedingung ........ CHF %.2f" % soll)
    print("Aktuelle Versandbedingung ....... CHF %.2f" % ist)
    if betrags_rabatte:
        print("!! Automatik-Rabatte mit FESTBETRAG (nicht verrechenbar, von Hand pruefen):",
              betrags_rabatte)

    inhalt = leiste_lesen()
    leiste_offen = ALT_LEISTE in inhalt

    if abs(ist - soll) < 0.005 and not leiste_offen:
        print("OK — Tarif und Leiste stimmen ueberein, nichts zu tun.")
        return 0

    if abs(ist - soll) >= 0.005:
        print("AENDERUNG Tarif: %.2f -> %.2f   (Totzone heute: Warenwert CHF %.2f bis %.2f)"
              % (ist, soll, BEWORBEN, round(ist / (1 - prozent) - 0.01, 2) if prozent else BEWORBEN))
    if leiste_offen:
        print("AENDERUNG Leiste: rechnet gegen cart.total_price -> kuenftig items_subtotal_price")

    if nur_wache:
        print("WACHE: Abweichung gefunden.")
        return 1
    if not scharf:
        print("\nDRY — nichts geschrieben. Mit --scharf ausfuehren.")
        return 0

    if abs(ist - soll) >= 0.005:
        setze_schwelle(methode, soll)
        _, nachher = gratis_versandart()
        if abs(nachher - soll) >= 0.005:
            raise RuntimeError("Tarif nicht uebernommen: %.2f" % nachher)
        notiere("tarif %.2f -> %.2f" % (ist, soll))
        print("Tarif gesetzt, live nachgelesen: CHF %.2f" % nachher)

    if leiste_offen:
        neu = inhalt.replace(ALT_LEISTE, NEU_LEISTE).replace(ALT_BREITE, NEU_BREITE)
        if neu == inhalt or ALT_LEISTE in neu:
            raise RuntimeError("Leisten-Block nicht sauber ersetzt — nichts geschrieben")
        leiste_schreiben(neu)
        if ALT_LEISTE in leiste_lesen():
            raise RuntimeError("Theme nicht uebernommen")
        notiere("leiste total_price -> items_subtotal_price")
        print("Leiste gesetzt und live nachgelesen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
