"""Prüft, ob CJ-Ware überhaupt in die Schweiz versendet werden kann — und nimmt den Rest raus.

BELEG FÜR DIE NOTWENDIGKEIT: Das negative Auszahlungsguthaben vom 10.08. (−CHF 32.69) ist die
Rechnung für fünf Bestellungen über zusammen CHF 955, die alle erstattet werden mussten, weil
die Ware nicht lieferbar war. Die Zahlungsgebühren (CHF 31.22) bleiben beim Shop hängen, und
fünf Kundinnen und Kunden haben bezahlt und nichts bekommen.

Für BigBuy gibt es diese Prüfung längst (`bigbuy_viability_guard.mjs`, «404 No shipping options
= nie in die CH versendbar»). Für CJ fehlte sie — obwohl CJ inzwischen den weitaus grössten
Teil des Sortiments stellt.

METHODE, und warum sie belastbar ist: `logistic/freightCalculate` liefert für einen 500-g-
Artikel **11 Versandoptionen** (USD 13–15, 5–17 Tage), für einen 18-kg-Kletterbaum dagegen
**null Optionen — bei identischem `code: 200`**. Die leere Liste ist also eine echte Aussage
(«nicht versendbar») und kein Fehler. Diese Gegenprobe ist Pflicht: Bei erschöpftem Punkte-
budget antwortet CJ ebenfalls mit leerer Liste, dann aber mit `code 16900500`. Ohne die
Unterscheidung würde das Skript bei leerem Budget den halben Katalog draften.

Geprüft wird von teuer nach günstig — dort ist der Schaden pro Fehlbestellung am grössten und
das Gewicht am ehesten kritisch.

DRY=1 meldet nur. REVIVE=1 holt zurück, was inzwischen wieder versendbar ist.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
CJT = open("/tmp/cj_token_shared.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
REVIVE = os.environ.get("REVIVE") == "1"
MINPREIS = float(os.environ.get("MINPREIS", "100"))
LEDGER = "dropship/_cj_versand_ch.txt"
TAG = "cj-nicht-versendbar-ch"
USD_CHF = float(os.environ.get("USD_CHF", "0.81"))
# Anteil des Verkaufspreises, den die Fracht höchstens ausmachen darf. 50 % lässt bei der
# üblichen CJ-Marge noch Luft; darüber ist jeder Verkauf ein sicheres Minus.
FRACHT_ANTEIL = float(os.environ.get("FRACHT_ANTEIL", "0.5"))


def gql(q, v=None):
    with open("/tmp/_cv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_cv.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def cj(pfad, body=None):
    """Gibt (code, data) zurück. Der Code MUSS ausgewertet werden — siehe Modulkommentar."""
    basis = "https://developers.cjdropshipping.com/api2.0/v1"
    cmd = ["curl", "-s", "--max-time", "45", basis + pfad, "-H", "CJ-Access-Token: " + CJT]
    if body is not None:
        with open("/tmp/_cjb.json", "w") as f:
            f.write(json.dumps(body))
        cmd += ["-X", "POST", "-H", "Content-Type: application/json",
                "--data-binary", "@/tmp/_cjb.json"]
    # 01.09.: 3 Versuche verlieren gegen 4 Grind-Runner (geteiltes 1-req/s-Limit) zu oft
    # das Rennen — 8 Versuche wie in der Fulfill-Engine (Lehre 22.08.).
    for _ in range(8):
        r = subprocess.run(cmd, capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            code = int(d.get("code") or 0)
            if code == 1600200:            # QPS-Drossel: 1 Anfrage/Sekunde
                time.sleep(3); continue
            return code, d.get("data"), str(d.get("message") or "")
        except Exception:
            time.sleep(3)
    return 0, None, "keine Antwort"


def versandfaehig(sku):
    """True / False / None(unklar). None heisst ausdrücklich «nicht entscheidbar» — dann wird
    NICHTS unternommen. Ein Produkt wegen eines API-Fehlers zu draften wäre schlimmer als es
    stehen zu lassen."""
    v = re.sub(r'^CJ-', '', (sku or '').strip(), flags=re.I)
    if not v:
        return None, "keine SKU"
    # ⚠️ DREI SKU-FORMEN (dieselbe Falle wie beim Bestell-Motor, 2026-08-09): rein numerische
    # pid, Varianten-SKU (CJLY…/CJYD…) und UUID-pid. Wer nur `variantSku` abfragt, bekommt für
    # zwei von drei Formen «Product not found» — und hielte das fälschlich für ein totes Produkt.
    if re.fullmatch(r'\d{10,}', v) or re.fullmatch(
            r'[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}', v, re.I):
        pid = v
    else:
        # 01.09.: «CJPB2903732» ist eine PRODUKT-SKU — als `variantSku=` gefragt antwortet
        # CJ «Product not found», und eine ECHTE Auslistung (1602002 auf `productSku=`,
        # live belegt an drei Gaming-Tastaturen) versteckte sich hinter «unklar».
        # Varianten-SKUs erkennt man am Anhang zwei Ziffern + zwei GROSSbuchstaben
        # (Lehre 22.08.); deren Produkt-SKU ist der Stamm ohne Anhang.
        if re.search(r'\d{2}[A-Z]{2}$', v):
            versuche = [("variantSku", v), ("productSku", re.sub(r'\d{2}[A-Z]{2}$', '', v))]
        else:
            versuche = [("productSku", v), ("variantSku", v)]
        pid = None
        for param, wert in versuche:
            code, data, msg = cj(f"/product/query?{param}={wert}")
            if code == 1602002:
                return False, "vom Lieferanten ausgelistet"
            if code == 200 and data:
                pid = data.get("pid")
                break
            if code != 1602001:
                # Transienter Ausfall (Drossel ausgereizt, Netz): NICHT zum nächsten
                # Parameter durchfallen — dessen «not found» würde ein echtes 1602002
                # überdecken (genau so blieb die ausgelistete Alu-Tastatur «unklar»).
                # Dieser Lauf: unklar; der nächste prüft neu.
                return None, f"Produkt nicht abrufbar ({code} {msg[:40]})"
            time.sleep(1.2)
        if not pid:
            return None, f"Produkt nicht abrufbar ({code} {msg[:40]})"
    time.sleep(1.2)
    code, vs, msg = cj(f"/product/variant/query?pid={pid}")
    if code == 1602002:
        return False, "vom Lieferanten ausgelistet"
    if code != 200 or not vs:
        return None, f"Varianten nicht abrufbar ({code} {msg[:40]})"
    vid = vs[0].get("vid")
    gewicht = vs[0].get("variantWeight")
    time.sleep(1.2)
    code, opts, msg = cj("/logistic/freightCalculate",
                         {"startCountryCode": "CN", "endCountryCode": "CH",
                          "products": [{"quantity": 1, "vid": vid}]})
    if code != 200:
        return None, f"Fracht nicht berechenbar ({code} {msg[:40]})"
    if not opts:
        return False, f"KEINE Versandoption (Gewicht {gewicht} g)"
    guenstigste = min(float(o.get("logisticPrice") or 9999) for o in opts)
    return True, (f"{len(opts)} Optionen, ab USD {guenstigste:.2f}", guenstigste)


def main():
    if REVIVE:
        query = f"status:DRAFT AND tag:{TAG}"
    else:
        # ⚠️ NICHT nach `tag:cj-real` filtern. Der Tag fehlt bei einem Teil der CJ-Ware —
        # das «Ovale Pflanzgefäss» (CHF 529.90, 15 kg, nachweislich NICHT in die CH versendbar)
        # trug nur `heimwerken,neu,werkzeug` und blieb deshalb ausserhalb der Prüfung live.
        # Massgeblich ist die SKU, nicht das Etikett.
        query = "status:ACTIVE"
    cur, kandidaten, gescannt, luecken = None, [], 0, 0
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){'
                'pageInfo{hasNextPage endCursor} nodes{id title '
                'priceRangeV2{minVariantPrice{amount}} variants(first:1){nodes{sku}}}}}',
                {"c": cur, "q": query})
        pg = (d.get("data") or {}).get("products")
        if not pg:
            # ⚠️ NICHT einfach abbrechen. Genau das hat die Prüfliste stillschweigend von 125 auf
            # 13 Produkte verkürzt: eine einzelne gedrosselte Seite beendete die Paginierung, und
            # der Rest des Katalogs wurde nie angesehen — ohne jede Meldung. Eine stille
            # Teilprüfung ist gefährlicher als gar keine, weil sie wie ein Ergebnis aussieht.
            luecken += 1
            if luecken > 3:
                print(f"  ⚠️ Abbruch nach {luecken} Fehlversuchen — Liste ist UNVOLLSTÄNDIG "
                      f"({gescannt} Produkte gesehen)", flush=True)
                break
            time.sleep(10)
            continue
        gescannt += len(pg["nodes"])
        luecken = 0
        for p in pg["nodes"]:
            preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
            sku = (p["variants"]["nodes"][0]["sku"] if p["variants"]["nodes"] else "") or ""
            if preis >= MINPREIS and re.match(r'^CJ-', sku or '', re.I):
                kandidaten.append((p["id"], p["title"], preis, sku))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    kandidaten.sort(key=lambda x: -x[2])            # teuerste zuerst
    print(f"{gescannt} aktive Produkte durchgesehen | zu prüfen (ab CHF {MINPREIS:.0f}, "
          f"CJ-SKU): {len(kandidaten)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    raus = ok = unklar = 0
    for gid, titel, preis, sku in kandidaten:
        if gid in done and not REVIVE:
            continue
        zustand, warum = versandfaehig(sku)
        if zustand is True and isinstance(warum, tuple):
            text, fracht_usd = warum
            fracht_chf = fracht_usd * USD_CHF
            # Eine Versandoption zu HABEN genügt nicht. Beim «Smarten Hantel-Set» (CHF 319.90)
            # kostet der einzige Versandweg USD 373 — jeder Verkauf wäre ein Verlust von
            # Hunderten Franken. Solche Artikel sind so unverkäuflich wie gar nicht versendbare.
            if fracht_chf > preis * FRACHT_ANTEIL:
                zustand = False
                warum = (f"Fracht CHF {fracht_chf:.2f} bei Preis CHF {preis:.2f} "
                         f"= {100*fracht_chf/preis:.0f} % — unrentabel")
            else:
                warum = text
        if zustand is None:
            unklar += 1
            print(f"  ❔ unklar: {titel[:44]} — {warum}", flush=True)
            continue
        if zustand:
            ok += 1
            print(f"  ✅ CHF {preis:>6.2f} {titel[:40]} — {warum}", flush=True)
            if REVIVE and not DRY:
                gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": gid, "status": "ACTIVE"}})
                gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t)'
                    '{userErrors{message}}}', {"id": gid, "t": [TAG]})
            elif not REVIVE and not DRY:
                # NICHT im Probelauf schreiben: sonst merkt sich der Ledger ein «ok», das nie
                # geprüft wurde, und der scharfe Lauf überspringt das Produkt stillschweigend.
                f.write(f"{gid}\tok\t{titel}\n"); f.flush()
            continue
        raus += 1
        print(f"  ⛔ CHF {preis:>6.2f} {titel[:40]} — {warum}", flush=True)
        if DRY or REVIVE:
            continue
        gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
            {"i": {"id": gid, "status": "DRAFT"}})
        gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
            {"id": gid, "t": [TAG]})
        f.write(f"{gid}\tnicht-versendbar\t{titel}\n"); f.flush()
        time.sleep(0.3)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {ok} versendbar, {raus} nicht versendbar, "
          f"{unklar} unklar (unangetastet)")


if __name__ == "__main__":
    main()
