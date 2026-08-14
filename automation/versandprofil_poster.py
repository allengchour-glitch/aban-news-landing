#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
versandprofil_poster.py — Versand-Versprechen und Versand-Berechnung zur Deckung bringen
========================================================================================

BEFUND (FEHLERSUCHE-14-08.md, Abschnitt [warenkorb], live nachgestellt am 14.08.2026)
------------------------------------------------------------------------------------
10 aktive «Schweiz-Poster» (CHF 14.90, Gelato-Print-on-Demand) lagen im eigenen
Versandprofil «Gelato: Small Posters». Dessen einzige für die Schweiz erreichbare Zone
(«EFTA Zone», CH/IS/LI) trug genau EINEN Tarif: «EFTA Flat Rate» CHF 10.23, ohne jede
Gratis-Versand-Bedingung. Das Standardprofil («General profile», Zone Domestic/CH)
dagegen kennt «Standard» CHF 7.00 und «Kostenloser Versand» CHF 0.00 ab CHF 50.

Shopify ADDIERT bei einem Korb aus mehreren Profilen die Tarife der beteiligten Profile.
Ein einziges Poster im Korb hat deshalb den Gratis-Versand der GANZEN Bestellung
aufgehoben — obwohl auf derselben Produktseite die Ankündigungsleiste
«🚚 Gratis-Versand ab CHF 50», der Vertrauensblock «Gratis ab CHF 50» und der
Warenkorb-Fortschrittsbalken («🎉 Gratis-Versand gesichert!») das Gegenteil versprechen.

MESSUNG VORHER (draftOrderCalculate, Lieferadresse Bahnhofstrasse 1, 8001 Zürich, CH):
  1x Poster                 14.90 -> nur «EFTA Flat Rate» CHF 10.23
  4x Poster                 59.60 -> nur «EFTA Flat Rate» CHF 10.23   (über CHF 50!)
  4x Organizer (ohne Poster) 63.60 -> «Kostenloser Versand» 0.00 + «Standard» 7.00
  4x Organizer + 1x Poster  78.50 -> nur «Versand» CHF 10.23          (Gratis weg)

ZAHL: 10 Produkte / 10 Varianten. Alle ACTIVE, alle CHF 14.90, alle Tag «gelato».

PROBELAUF UND FEHLTREFFER
-------------------------
Der Probelauf hat ALLE 20 Versandprofile des Shops auf Zonen abgeklopft, die die
Schweiz enthalten (nur der CH-Markt ist überhaupt aktiviert — `markets` liefert genau
einen aktiven Markt «Switzerland», also ist jede andere Zone unerreichbar):

  Zendrop                    53 Var.  [Zendrop — Worldwide Zone]  0.00 -> KEIN Fehltreffer
  Gelato: Small Posters      10 Var.  EFTA Zone                  10.23 -> der Befund
  16 weitere Gelato-Profile   0 Var.  EFTA Zone            8.85–58.81 -> leer, aber scharf

FEHLTREFFER, die ich bewusst NICHT angefasst habe:
 * «Zendrop» (53 Varianten) sieht auf den ersten Blick nach demselben Fehler aus — ein
   zweites Profil, eigene Zone, eigener Tarif. Sein Tarif ist aber CHF 0.00 ohne
   Bedingung und addiert deshalb NICHTS. Live gegengeprüft: Organizer 63.60 + Zendrop
   34.90 = 98.50 -> «Versand 0.00»; Organizer 15.90 + Zendrop 34.90 = 50.80 -> 0.00.
   Das Versprechen hält dort exakt. Anfassen wäre eine Verschlechterung gewesen.
 * «Shopify Collective» (4 Varianten): alle vier Produkte sind DRAFT (Parfums
   «Lost Nomade», «Untold Story», «Discovery-Set», «Angel's Love») und damit für
   Kundinnen unerreichbar. Kein Warenkorb kann sie enthalten -> nicht angefasst.
 * Die 15 übrigen Zonen jedes Gelato-Profils (US/DE/GB/JP/…): unerreichbar, weil der
   Shop nur den Markt Schweiz führt. Nicht angefasst.

ENTSCHEIDUNG
------------
(1) HAUPTREPARATUR: die 10 Poster-Varianten aus «Gelato: Small Posters» lösen. Sie
    fallen damit ins Standardprofil zurück und unterliegen exakt denselben Regeln wie
    die übrigen 31'000 Produkte — CHF 7.00, gratis ab CHF 50. Danach gibt es für einen
    Schweizer Korb nur noch EINE Tarifquelle, also keine Additions-Arithmetik mehr, die
    mit einem einzigen shopweiten Versprechen je wieder auseinanderlaufen kann.

    Verworfene Alternative A: im Gelato-Profil eine eigene «Gratis ab 50»-Regel
    nachbauen. Das repariert nur den reinen Poster-Korb; im MISCHKORB unter CHF 50
    addierte Shopify weiterhin 7.00 + 7.00 = CHF 14.00, also ein NEUER Widerspruch zur
    Zusage «sonst CHF 7.00».
    Verworfene Alternative B: die Poster auf DRAFT setzen. Ein Konfigurationsfehler
    rechtfertigt es nicht, 10 einwandfreie Produkte aus dem Verkauf zu nehmen.

(2) QUELLE (Regel 7 — wer schreibt das Feld beim NÄCHSTEN Produkt?): Die Zuordnung
    stammt nicht von einem Importer dieses Repos, sondern von der Gelato-App, die jedes
    neue POD-Produkt automatisch in ihr Grössen-Profil legt. Ein Nachfüllen allein wäre
    also am nächsten Poster wieder hinfällig. Deshalb wird zusätzlich der CH-erreichbare
    Tarif in «Gelato: Small Posters» auf CHF 0.00 gesetzt. Ein 0.00-Tarif addiert nichts
    (empirisch am Zendrop-Profil belegt, s.o.) — ein künftig dort einsortiertes Poster
    kann das Versprechen damit nicht mehr brechen, sondern erbt still die Regeln des
    Standardprofils. Die 16 LEEREN Gelato-Profile bleiben unverändert; stattdessen meldet
    dieses Skript sie bei jedem Lauf als «scharf», und der Sweep unten holt jede aktive
    Variante, die dort auftaucht, ins Standardprofil zurück. Skript ist idempotent und
    gehört in den täglichen Keepalive.

    NICHT Aufgabe dieses Skripts: dass ein Poster mit Einstandspreis CHF 7.54 bei
    CHF 14.90 und CHF 0–7 Versand knapp kalkuliert ist. Das ist eine Preisfrage und
    gehört zu preisboden.py, nicht ins Versandprofil.

Aufruf:  python3 automation/versandprofil_poster.py            # Probelauf (nur zeigen)
         python3 automation/versandprofil_poster.py --scharf   # schreiben
"""
import json
import os
import sys
import urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN_DATEI = "/tmp/cj_shop_token.txt"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "dropship", "_versandprofil_poster.txt")

STANDARDPROFIL = "gid://shopify/DeliveryProfile/132124180865"   # «General profile»
SCHARF = "--scharf" in sys.argv


def gql(query, variables=None):
    """Eine Anfrage. Regel 6: eine gescheiterte Anfrage ist KEIN Ergebnis —
    wir werfen, statt ein leeres Resultat als «nichts gefunden» durchzureichen."""
    with open(TOKEN_DATEI) as f:
        token = f.read().strip()
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(SHOP, data=body, headers={
        "X-Shopify-Access-Token": token, "Content-Type": "application/json"})
    for versuch in range(4):
        try:
            antwort = json.loads(urllib.request.urlopen(req, timeout=60).read())
        except Exception as e:
            if versuch == 3:
                raise RuntimeError("Shopify nicht erreichbar: %s" % e)
            continue
        if antwort.get("errors"):
            raise RuntimeError("GraphQL-Fehler: %s" % json.dumps(antwort["errors"])[:400])
        return antwort["data"]
    raise RuntimeError("unerreichbar")


def ledger(zeile):
    """Regel 5: nach JEDER Zeile flushen — der Prozess kann jederzeit sterben."""
    with open(LEDGER, "a") as f:
        f.write(zeile + "\n")
        f.flush()
        os.fsync(f.fileno())


# first:25 / 20 / 5 statt grosszügiger Werte: Shopify deckelt eine Einzelabfrage bei
# Kosten 1000, und deliveryProfiles multipliziert Profil x Zone x Tarif.
# ACHTUNG: der Shop hat mehr als 25 Versandprofile (die Gelato-App legt pro Produkt-
# format eines an). Ein Lauf ohne Blättern hat im Probelauf die letzten Profile still
# abgeschnitten — deshalb pageInfo und die Schleife in profile_alle().
PROFIL_Q = """query($cursor:String){ deliveryProfiles(first:25, after:$cursor){
  pageInfo { hasNextPage endCursor }
  nodes { id name default
  productVariantsCount{count}
  profileLocationGroups { locationGroup { id }
    locationGroupZones(first:20){ nodes {
      zone { id name countries { code { countryCode } } }
      methodDefinitions(first:5){ nodes { id name active
        rateProvider { ... on DeliveryRateDefinition { id price { amount currencyCode } } }
        methodConditions { field operator
          conditionCriteria { ... on MoneyV2 { amount currencyCode } } } } } } } } } } }"""

ITEMS_Q = """query($id:ID!){ deliveryProfile(id:$id){ name
  profileItems(first:250){ nodes { product { id title status }
    variants(first:100){ nodes { id price } } } } } }"""


def profile_alle():
    """ALLE Versandprofile, über alle Seiten. Eine abgeschnittene Liste wäre ein
    Ergebnis, das aussieht wie Vollständigkeit."""
    alle, cursor = [], None
    while True:
        seite = gql(PROFIL_Q, {"cursor": cursor})["deliveryProfiles"]
        alle.extend(seite["nodes"])
        if not seite["pageInfo"]["hasNextPage"]:
            return alle
        cursor = seite["pageInfo"]["endCursor"]


def ch_zonen(profil):
    """Alle Zonen eines Profils, die die Schweiz enthalten. Nur die sind erreichbar —
    der Shop führt genau einen aktiven Markt (Switzerland)."""
    for lg in profil["profileLocationGroups"]:
        for z in lg["locationGroupZones"]["nodes"]:
            codes = [c["code"]["countryCode"] for c in z["zone"]["countries"]]
            if "CH" in codes:
                yield lg["locationGroup"]["id"], z


def main():
    maerkte = gql("{ markets(first:20){ nodes { name enabled regions(first:30){ nodes { "
                  "... on MarketRegionCountry { code } } } } } }")["markets"]["nodes"]
    aktiv = [m for m in maerkte if m["enabled"]]
    print("Aktive Märkte: %s" % ", ".join(
        "%s(%s)" % (m["name"], ",".join(r.get("code") or "?" for r in m["regions"]["nodes"]))
        for m in aktiv))

    profile = profile_alle()
    print("Versandprofile insgesamt: %d" % len(profile))
    zu_loesen, scharfe_profile, neutral = [], [], []

    for p in profile:
        if p["default"]:
            continue
        for _lgid, z in ch_zonen(p):
            for m in z["methodDefinitions"]["nodes"]:
                rp = m["rateProvider"] or {}
                preis = rp.get("price") or {}
                betrag = float(preis.get("amount", "0") or 0)
                if betrag == 0:
                    neutral.append((p["name"], m["name"]))
                    continue
                scharfe_profile.append((p, z, m, betrag))

    print("\n--- PROBELAUF ---")
    print("Neutrale Zweitprofile (Tarif 0.00, addieren nichts, NICHT anfassen):")
    for name, m in neutral:
        print("   ok   %-28s %s" % (name, m))

    print("\nZweitprofile mit CH-Tarif > 0 (brechen das Gratis-Versand-Versprechen):")
    for p, z, m, betrag in scharfe_profile:
        anz = p["productVariantsCount"]["count"]
        marke = "MIT PRODUKTEN" if anz else "leer"
        print("   !!   %-46s %-13s %-16s CHF %s" % (p["name"], marke, m["name"], betrag))
        if anz == 0:
            continue
        daten = gql(ITEMS_Q, {"id": p["id"]})["deliveryProfile"]
        for n in daten["profileItems"]["nodes"]:
            prod = n["product"]
            for v in n["variants"]["nodes"]:
                if prod["status"] != "ACTIVE":
                    print("        uebersprungen (%s, fuer Kundinnen unerreichbar): %s"
                          % (prod["status"], prod["title"]))
                    continue
                zu_loesen.append((p, prod, v))

    print("\nWürde ins Standardprofil zurückholen: %d Varianten" % len(zu_loesen))
    for p, prod, v in zu_loesen:
        print("   -> %-22s CHF %-7s %s" % (v["id"].split("/")[-1], v["price"], prod["title"]))

    if not SCHARF:
        print("\nProbelauf. Mit --scharf schreiben.")
        return

    # ---- 1) Varianten ins Standardprofil zurückholen -------------------------
    nach_profil = {}
    for p, prod, v in zu_loesen:
        nach_profil.setdefault(p["id"], []).append((prod, v))

    geaendert = 0
    for pid, eintraege in nach_profil.items():
        vids = [v["id"] for _prod, v in eintraege]
        d = gql("""mutation($id:ID!,$p:DeliveryProfileInput!){
                     deliveryProfileUpdate(id:$id, profile:$p){
                       profile { id name } userErrors { field message } } }""",
                {"id": pid, "p": {"variantsToDissociate": vids}})
        fehler = d["deliveryProfileUpdate"]["userErrors"]
        if fehler:
            raise RuntimeError("dissociate fehlgeschlagen: %s" % fehler)
        for prod, v in eintraege:
            geaendert += 1
            ledger("varianten-geloest\t%s\t%s\t%s" % (v["id"], prod["id"], prod["title"]))
        print("gelöst aus %s: %d Varianten -> Standardprofil" % (pid, len(vids)))

    # ---- 2) Quelle entschärfen: CH-Tarif der Profile MIT Produkten auf 0.00 --
    #     Ein 0.00-Tarif addiert nichts; ein künftig von der Gelato-App dort
    #     einsortiertes Produkt erbt still die Regeln des Standardprofils.
    for p, z, m, betrag in scharfe_profile:
        if p["productVariantsCount"]["count"] == 0:
            continue  # leere Profile bleiben unverändert, der Sweep oben fängt sie ab
        lgid = None
        for lg_id, zone in ch_zonen(p):
            if zone["zone"]["id"] == z["zone"]["id"]:
                lgid = lg_id
        rp = m["rateProvider"] or {}
        d = gql("""mutation($id:ID!,$p:DeliveryProfileInput!){
                     deliveryProfileUpdate(id:$id, profile:$p){
                       profile { id } userErrors { field message } } }""",
                {"id": p["id"], "p": {"locationGroupsToUpdate": [{
                    "id": lgid,
                    "zonesToUpdate": [{
                        "id": z["zone"]["id"],
                        "methodDefinitionsToUpdate": [{
                            "id": m["id"], "name": m["name"], "active": True,
                            "rateDefinition": {"id": rp.get("id"),
                                               "price": {"amount": "0.0",
                                                         "currencyCode": "CHF"}}}]}]}]}})
        fehler = d["deliveryProfileUpdate"]["userErrors"]
        if fehler:
            raise RuntimeError("Tarif-Neutralisierung fehlgeschlagen: %s" % fehler)
        ledger("tarif-neutralisiert\t%s\t%s\t%s\tCHF %s -> 0.00"
               % (p["id"], z["zone"]["id"], m["name"], betrag))
        print("neutralisiert: %s / %s / %s  CHF %s -> 0.00"
              % (p["name"], z["zone"]["name"], m["name"], betrag))

    print("\nFertig. %d Varianten ins Standardprofil zurückgeholt." % geaendert)


if __name__ == "__main__":
    main()
