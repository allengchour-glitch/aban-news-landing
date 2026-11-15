#!/usr/bin/env python3
"""Liest im Google Merchant Center die Artikelprobleme und listet die Bildprobleme (nur lesen).

Zweck (11.11.2026, Besitzer: Werbetext von Produktbildern entfernen, zu kleine Bilder hochrechnen): Google meldete
im Merchant Center rund 357 Artikel mit «Werbeeinblendung im Bild» und 43 mit «Bild zu klein». Dieses Skript holt die
betroffenen Artikel, damit die Bilder gezielt bereinigt werden können.

Gibt KEINE Merchant-Nummer aus (Actions-Protokolle sind öffentlich): das Konto kommt aus der Kontoliste des
Dienstkontos. Ausgegeben werden Zählungen je Problemcode, je Bild-Problem die Zeile «BILD|<code>|<offer_id>|<titel>»
und je übriges Problem (ohne die Massencodes in MASSE) die Zeile «FEHLER|<code>|<attribut>|<offer_id>|<titel>»,
dazu die Datei bildprobleme.json (Workflow-Artefakt). Schreibt nichts im Merchant Center.
"""
import json, os, sys, time
from collections import Counter
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPE = "https://www.googleapis.com/auth/content"
BILD = ("image", "overlay", "small")
# Diese Codes betreffen fast alle Artikel und werden nur gezählt, nicht einzeln ausgegeben.
MASSE = ("missing_shipping_no_shipping_service_defined_for_country", "item_limit_reached_ads_css")


def sauber(t, n=70):
    return " ".join(str(t or "").replace("|", "/").split())[:n]


def zeile(pv, iss):
    """Ausgabezeile für ein Problem oder None (Massencode)."""
    typ = iss.get("type") or {}
    code = typ.get("code") or "?"
    if any(w in code.lower() for w in BILD):
        return f"BILD|{code}|{pv.get('offerId', '')}|{sauber(pv.get('title'))}"
    if code in MASSE:
        return None
    return f"FEHLER|{code}|{typ.get('canonicalAttribute', '')}|{pv.get('offerId', '')}|{sauber(pv.get('title'))}"


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
            r = None
            for versuch in range(6):
                try:
                    r = requests.post(url, headers=h, json=body, timeout=120)
                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                    # Lauf vom 11.11. 21:39 UTC brach an einem einzigen Lesefehler ab: Netzfehler wie 429/5xx wiederholen
                    print(f"... Seite {seite + 1}: {type(e).__name__}, Versuch {versuch + 1} von 6", flush=True)
                    r = None
                    time.sleep(2 ** versuch * 3); continue
                if r.status_code in (429, 500, 502, 503, 504):
                    time.sleep(2 ** versuch * 3); continue
                break
            if r is None:
                print(f"ABBRUCH: reports:search {version}: Seite {seite + 1} nach 6 Versuchen nicht lesbar"); sys.exit(4)
            if r.status_code == 404 and seite == 0:
                break  # diese Version gibt es nicht: nächste probieren
            if r.status_code != 200:
                print(f"ABBRUCH: reports:search {version} HTTP {r.status_code}: {r.text[:300]}"); sys.exit(4)
            j = r.json()
            neu = j.get("results") or []
            zeilen += neu
            seite += 1
            for z in neu:  # Treffer sofort ausgeben, damit auch ein abgebrochener Lauf etwas liefert
                pv = z.get("productView") or {}
                for iss in pv.get("itemIssues") or []:
                    t = zeile(pv, iss)
                    if t:
                        print(t, flush=True)
            if seite % 20 == 0:
                print(f"... Seite {seite}, {len(zeilen)} Zeilen", flush=True)
            token = j.get("nextPageToken")
            if not token:
                print(f"reports {version}: {seite} Seiten, {len(zeilen)} Zeilen")
                return zeilen
    print("ABBRUCH: keine Reports-Version erreichbar"); sys.exit(4)


# Proben für MODUS=quellen (11.11.): Angebote aus der zweiten Quelle ohne Preis, Angebote mit reiner Nummer
# (Preis, Verfügbarkeit, Bild) und ein Angebot der Google-App zum Vergleich. Angebots-IDs sind öffentlich
# (Produkt-ID und SKU stehen im Shop); Konto-Nummern werden nie ausgegeben.
PROBEN = ["15495230718337_cj-cjyd285445402by", "15497428402561_cj-cjns259100719sh",
          "15496264679809_cj-cjpb139647947uf", "2381394981998237883", "4785933318456622497",
          "1712380121484223412", "13406024595176656169", "16882423843509892988",
          "5516027656239708718", "6668478736552488073"]


MANIFEST = "dropship/gmc_schaufenster_manifest.jsonl"
# Proben für MODUS=autofeed (15.11.): beanstandete Angebote, deren Shop-Bild am 11.11. ersetzt wurde. Welches Bild hat
# Google? Der Lauf vom 15.11. meldete «zu klein» für Bilder mit 1024 und 1254 Pixeln, also wohl einen alten Stand.
BILDPROBEN = ["shopify_ZZ_15507580649857_56147913113985", "shopify_ZZ_15448882938241_55878125060481",
              "shopify_ZZ_15522213986689_56204490834305", "15491103850881_cjlx304288901az",
              "15450832765313_cj-cjjjcfcf00032-brown", "15493873893761_cjyd225388502by"]


def herkunft(off):
    """Angebotsformat: Shopify-App «shopify_ZZ_<pid>_<vid>», Googles Autofeed «<pid>_<sku>» oder reine Nummer."""
    off = str(off or "")
    if off.startswith("shopify_"):
        return "shopify-app"
    if "_" in off and off.split("_")[0].isdigit():
        return "autofeed-produkt-sku"
    return "autofeed-nummer" if off.isdigit() else "andere"


def produkt_id(off):
    """Shopify-Produkt-ID aus einer Angebots-ID; None bei reiner Nummer oder unbekanntem Format."""
    off = str(off or "")
    art = herkunft(off)
    if art == "shopify-app":
        teile = off.split("_")
        return teile[2] if len(teile) >= 4 and teile[2].isdigit() else None
    if art == "autofeed-produkt-sku":
        return off.split("_")[0]
    return None


def gesperrte_produkte(zeilen):
    """Produkt-IDs, die das Schaufenster vom Google-Kanal genommen hat: die letzte Manifest-Aktion ist nicht «auf»
    (gleiche Regel wie automation/lib/gmc_schaufenster.mjs, «ab-versucht» zählt wie «ab»)."""
    letzte = {}
    for z in zeilen:
        z = z.strip()
        if not z:
            continue
        try:
            d = json.loads(z)
        except ValueError:
            continue
        gid = str(d.get("id", ""))
        if gid.startswith("gid://shopify/Product/"):
            letzte[gid.rsplit("/", 1)[-1]] = d.get("aktion", "ab")
    return {pid for pid, a in letzte.items() if a != "auf"}


def autofeed_zaehlen(offer_ids, gesperrt):
    """Zählung für den Entscheid «Autofeed aus?»: wie viele Zeilen und Produkte der Autofeed bringt und wie viele
    davon das Schaufenster absichtlich vom Google-Kanal genommen hat."""
    zeilen = Counter()
    app_pid, auto_pid = set(), set()
    auto_gesperrt = app_gesperrt = 0
    for off in offer_ids:
        art = herkunft(off)
        zeilen[art] += 1
        pid = produkt_id(off)
        if not pid:
            continue
        if art == "shopify-app":
            app_pid.add(pid)
            app_gesperrt += pid in gesperrt
        else:
            auto_pid.add(pid)
            auto_gesperrt += pid in gesperrt
    nur_auto = auto_pid - app_pid
    return {"zeilen": dict(zeilen), "produkte_app": len(app_pid), "produkte_autofeed": len(auto_pid),
            "autofeed_zeilen_gesperrt": auto_gesperrt, "autofeed_produkte_gesperrt": len(auto_pid & gesperrt),
            "app_zeilen_gesperrt": app_gesperrt, "app_produkte_gesperrt": len(app_pid & gesperrt),
            "nur_autofeed": len(nur_auto), "nur_autofeed_gesperrt": len(nur_auto & gesperrt),
            "beispiele_gesperrt": sorted(auto_pid & gesperrt)[:5]}


def leistung_je_herkunft(zeilen, gesperrt):
    """Klicks und Einblendungen je Angebotsformat; beim Autofeed getrennt nach vom Schaufenster genommen oder nicht."""
    summe = {}
    for x in zeilen:
        pv = x.get("productPerformanceView") or {}
        off = pv.get("offerId", "")
        art = herkunft(off)
        if art != "shopify-app":
            art += "-gesperrt" if produkt_id(off) in gesperrt else ""
        s = summe.setdefault(art, {"klicks": 0, "einblendungen": 0, "angebote_mit_klick": 0})
        k = int(pv.get("clicks") or 0)
        s["klicks"] += k
        s["einblendungen"] += int(pv.get("impressions") or 0)
        s["angebote_mit_klick"] += k > 0
    return summe


def autofeed(h, name):
    """Nur lesen: Autofeed-Schalter, Umfang des Autofeeds gegen das Schaufenster und Bildproben (ohne Konto-Nummer)."""
    r = requests.get(f"https://merchantapi.googleapis.com/accounts/v1/{name}/autofeedSettings", headers=h, timeout=30)
    if r.status_code == 200:
        j = r.json()
        print(f"Autofeed-Schalter: enableProducts={j.get('enableProducts')} eligible={j.get('eligible')}")
    else:
        print(f"Autofeed-Schalter: HTTP {r.status_code} " + r.text[:200].replace(name, "<konto>"))
    try:
        with open(MANIFEST, encoding="utf-8") as f:
            gesperrt = gesperrte_produkte(f)
    except FileNotFoundError:
        gesperrt = set()
        print("HINWEIS: Schaufenster-Manifest fehlt im Checkout")
    print(f"Schaufenster: {len(gesperrt)} Produkte vom Google-Kanal genommen (Manifest)")
    zeilen = suchen(h, name, "SELECT id, offer_id FROM product_view")
    z = autofeed_zaehlen([(x.get("productView") or {}).get("offerId", "") for x in zeilen], gesperrt)
    print("AUTOFEED " + json.dumps(z, ensure_ascii=False))
    # Bringt der Autofeed Besucher? Klicks und Einblendungen der letzten 28 Tage je Herkunft (vor einem Abschalten)
    bis = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 86400))
    von = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 28 * 86400))
    leistung = suchen(h, name, f"SELECT offer_id, clicks, impressions FROM product_performance_view "
                               f"WHERE date BETWEEN '{von}' AND '{bis}'")
    print("LEISTUNG " + json.dumps(leistung_je_herkunft(leistung, gesperrt), ensure_ascii=False) + f" (Zeitraum {von} bis {bis})")
    liste = ",".join("'" + p + "'" for p in BILDPROBEN)
    for x in suchen(h, name, f"SELECT id, offer_id, item_issues FROM product_view WHERE offer_id IN ({liste})"):
        pv = x.get("productView") or {}
        teile = str(pv.get("id", "")).split("~")                # kanal~sprache~label~angebot
        pname = "~".join(teile[1:]) if len(teile) == 4 else pv.get("id", "")
        bild = "?"
        for version in ("v1", "v1beta"):
            rp = requests.get(f"https://merchantapi.googleapis.com/products/{version}/{name}/products/{pname}",
                              headers=h, timeout=60)
            if rp.status_code == 200:
                j = rp.json()
                attr = j.get("productAttributes") or j.get("attributes") or {}
                bild = str(attr.get("imageLink", "")).split("?")[0].rsplit("/", 1)[-1][:60] or "-"
                break
            bild = f"HTTP {rp.status_code}"
        codes = ",".join(sorted({(i.get("type") or {}).get("code", "?") for i in pv.get("itemIssues") or []}))
        print(f"  BILDPROBE {pv.get('offerId', '')} | {herkunft(pv.get('offerId'))} | Label {teile[2] if len(teile) == 4 else '-'}"
              f" | Google-Bild {bild} | Probleme {codes or '-'}")
    return 0


def quellen(h, name):
    """Nur lesen: Datenquellen des Kontos und die Herkunft der Proben (ohne Konto-Nummer)."""
    r = requests.get(f"https://merchantapi.googleapis.com/datasources/v1/{name}/dataSources?pageSize=100",
                     headers=h, timeout=60)
    print(f"Datenquellen: HTTP {r.status_code}")
    namen = {}
    if r.status_code == 200:
        for d in r.json().get("dataSources") or []:
            art = "primär" if "primaryProductDataSource" in d else "ergänzend" if "supplementalProductDataSource" in d \
                else "andere:" + ",".join(k for k in d if k.endswith("DataSource"))
            teil = d.get("primaryProductDataSource") or d.get("supplementalProductDataSource") or {}
            dsid = str(d.get("dataSourceId", ""))
            namen[dsid] = d.get("displayName", "")
            abruf = ((d.get("fileInput") or {}).get("fetchSettings") or {}).get("fetchUri", "")
            host = abruf.split("/")[2] if abruf.count("/") >= 2 else ""
            print(f"  Quelle …{dsid[-4:]}: «{d.get('displayName', '')}» · Eingang {d.get('input', '')} · {art}"
                  f" · Sprache {teil.get('contentLanguage', '-')} · Label {teil.get('feedLabel', '-')}"
                  f" · Länder {','.join(teil.get('countries') or []) or '-'}" + (f" · Abruf von {host}" if host else ""))
    else:
        print("  " + r.text[:300].replace(name, "<konto>"))
    liste = ",".join("'" + p + "'" for p in PROBEN)
    zeilen = suchen(h, name, f"SELECT id, offer_id, title, price, availability, feed_label, language_code "
                             f"FROM product_view WHERE offer_id IN ({liste})")
    for z in zeilen:
        pv = z.get("productView") or {}
        rid = pv.get("id", "")                                   # channel~sprache~label~angebot
        teile = rid.split("~")
        pname = "~".join(teile[1:]) if len(teile) == 4 else rid
        q = "?"
        for version, pid in (("v1", pname), ("v1beta", rid)):
            rp = requests.get(f"https://merchantapi.googleapis.com/products/{version}/{name}/products/{pid}",
                              headers=h, timeout=60)
            if rp.status_code == 200:
                ds = str(rp.json().get("dataSource", ""))
                q = namen.get(ds.rsplit("/", 1)[-1], "…" + ds[-4:])
                break
            q = f"HTTP {rp.status_code}"
        preis = pv.get("price") or {}
        print(f"  PROBE {pv.get('offerId', '')} | {sauber(pv.get('title'), 50)} | Quelle «{q}» | Preis "
              f"{preis.get('amountMicros', '-')} {preis.get('currencyCode', '')} | Verfügbarkeit {pv.get('availability', '-')}"
              f" | Label {pv.get('feedLabel', '-')}")
    return 0


def main():
    h = anmelden()
    name = konto(h)
    if os.environ.get("MODUS", "bilder") == "quellen":
        return quellen(h, name)
    if os.environ.get("MODUS", "bilder") == "autofeed":
        return autofeed(h, name)
    zeilen = suchen(h, name, "SELECT id, offer_id, title, item_issues FROM product_view")
    codes, treffer, fehler, attribute = Counter(), [], [], Counter()
    beispiel = None
    for z in zeilen:
        pv = z.get("productView") or {}
        for iss in pv.get("itemIssues") or []:
            typ = iss.get("type") or {}
            code = typ.get("code") or "?"
            codes[code] += 1
            sev = (iss.get("severity") or {}).get("aggregatedSeverity", "")
            eintrag = {"code": code, "offer_id": pv.get("offerId", ""), "titel": (pv.get("title") or "")[:80], "schwere": sev}
            if any(w in code.lower() for w in BILD):
                beispiel = beispiel or iss
                treffer.append(eintrag)
            elif code not in MASSE:
                eintrag["attribut"] = typ.get("canonicalAttribute", "")
                attribute[(code, eintrag["attribut"])] += 1
                fehler.append(eintrag)
    print("Problemcodes (alle Artikel):")
    for c, n in codes.most_common(40):
        print(f"  {n:6d}  {c}")
    print("Übrige Probleme nach Code und Attribut:")
    for (c, a), n in attribute.most_common(60):
        print(f"  {n:6d}  {c}  {a}")
    if beispiel:
        print("Beispiel eines Bildproblems (Struktur):", json.dumps(beispiel)[:600])
    # Zeilen je Angebotsformat: Shopify-App «shopify_ZZ_…», Googles Autofeed als «<Produkt-ID>_<sku>» oder reine Nummer
    # (Befund 11.11., dropship/merchant-fehler-1111/README.md). Zeilen, nicht Angebote: de und fr zählen je einmal.
    formate = Counter(herkunft((z.get("productView") or {}).get("offerId", "")) for z in zeilen)
    print("Zeilen je Angebotsformat:", ", ".join(f"{k} {v}" for k, v in formate.most_common()))
    print(f"ERGEBNIS: {len(zeilen)} Artikel gelesen, {len(treffer)} Bildprobleme, {len(fehler)} übrige Probleme")
    with open("bildprobleme.json", "w") as f:
        json.dump({"gelesen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "codes": dict(codes), "bild": treffer,
                   "fehler": fehler}, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
