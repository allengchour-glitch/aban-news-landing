"""CJ-Bestell-Automatik — ersetzt die kaputte CJ-Shopify-Produktverbindung.

HINTERGRUND (2026-08-09): CJs Connector kann Bestellungen nur bepreisen, wenn jedes Shopify-
Produkt in der CJ-Weboberflaeche manuell mit dem CJ-Produkt "verbunden" wurde. Unsere ~23'000
Produkte wurden per Shopify-API angelegt, sind also unverbunden -> CJ legt fuer jede Bestellung
nur eine leere Huelle an (vid: null, productAmount: 0.0), die nie bezahlbar ist. Eine API zum
Verbinden existiert nicht (alle Endpunkte: "Interface not found").

Dieser Engine geht den anderen Weg: Die CJ-pid steckt bereits in unserer SKU (CJ-<pid>), also
kann die Bestellung direkt per createOrderV2 angelegt werden — ganz ohne Verbindung.

Ablauf je bezahlter, unfulfillter Shopify-Bestellung:
  1. SKU -> CJ-pid -> vid (product/variant/query)
  2. Fracht rechnen (logistic/freightCalculate), guenstigste Option waehlen, die das
     Lieferversprechen haelt; Vollkosten gegen den Verkaufspreis pruefen
  3. createOrderV2 mit orderNumber LX<Nr>  -> Bestellung liegt bezahlbereit im CJ-Warenkorb
  4. Betrag + CJ-ID melden (Bezahlen bleibt der eine manuelle Schritt — CJs payBalance
     akzeptiert die Order-IDs nicht, und Guthaben laedt ohnehin nur der User auf)

Idempotent ueber dropship/_cj_orders_done.txt (Shopify-Bestellnummer -> CJ-Order-ID).
DRY=1 rechnet nur durch, ohne bei CJ anzulegen.
"""
import json, subprocess, time, os, re, sys

CJTOK = open("/tmp/_cjtok").read().strip()
STOK  = open("/tmp/cj_shop_token.txt").read().strip()
SHOP  = "au3j0y-hq.myshopify.com"
DRY   = os.environ.get("DRY") == "1"
LEDGER = "dropship/_cj_orders_done.txt"

MAX_TAGE = int(os.environ.get("MAX_TAGE", "20"))       # Obergrenze fuers Lieferversprechen


def usd_chf():
    """Kurs live holen — geschaetzte Kurse verfaelschen die Margenrechnung sofort:
    mit 0.85 statt der echten 0.810 wurde eine Bestellung als Minusgeschaeft ausgewiesen,
    die in Wahrheit knapp im Plus lag."""
    if os.environ.get("USD_CHF"):
        return float(os.environ["USD_CHF"])
    for u in ("https://api.frankfurter.dev/v1/latest?base=USD&symbols=CHF",
              "https://open.er-api.com/v6/latest/USD"):
        try:
            out = subprocess.run(["curl", "-s", "--max-time", "20", u],
                                 capture_output=True, text=True).stdout
            r = (json.loads(out).get("rates") or {}).get("CHF")
            if r:
                return float(r)
        except Exception:
            pass
    raise SystemExit("Kein USD→CHF-Kurs abrufbar — lieber abbrechen als mit geratenem Kurs rechnen.")


USD_CHF = usd_chf()


def cj(path, body=None):
    a = ["curl", "-s", "--max-time", "45", "-H", "CJ-Access-Token: " + CJTOK]
    if body is not None:
        a += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(body)]
    a.append("https://developers.cjdropshipping.com" + path)
    for att in range(4):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception:
            time.sleep(4); continue
        # CJ drosselt getAccessToken/Suchen; bei Drossel kurz warten statt aufgeben
        if str(d.get("code")) in ("1600200", "1600201"):
            time.sleep(8 * (att + 1)); continue
        return d
    return {}


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + STOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def offene_bestellungen():
    q = '''{orders(first:25, query:"financial_status:paid AND fulfillment_status:unfulfilled",
             sortKey:CREATED_AT, reverse:true){nodes{
      id name createdAt totalPriceSet{shopMoney{amount}}
      shippingAddress{name address1 address2 city zip provinceCode province countryCodeV2 phone}
      customer{ defaultAddress{phone} phone }
      lineItems(first:20){nodes{ title quantity sku variantTitle
        originalUnitPriceSet{shopMoney{amount}} }}
    }}}'''
    return ((gql(q).get("data") or {}).get("orders") or {}).get("nodes") or []


def norm(s):
    s = (s or "").lower()
    for a, b in (("ä","ae"),("ö","oe"),("ü","ue"),("ß","ss")):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]', '', s)


# Farbnamen DE->EN, damit die Shopify-Variante gegen CJs englische variantKey matchbar ist
FARBE_EN = {"schwarz":"black","weiss":"white","rot":"red","blau":"blue","gruen":"green",
            "gelb":"yellow","rosa":"pink","pink":"pink","lila":"purple","violett":"purple",
            "grau":"gray","braun":"brown","orange":"orange","beige":"beige","gold":"gold",
            "silber":"silver","marineblau":"navy","tuerkis":"turquoise","weinrot":"wine"}


def vid_fuer(sku, variant_title):
    """Shopify-SKU + gewaehlte Variante -> passende CJ-Varianten-ID.

    ⚠️ Frueher wurde blind vs[0] genommen. Bei den 133 CJ-Produkten mit Farb-/Groessenvarianten
    haette der Kunde damit IMMER die erste Variante bekommen — falsche Farbe, falsche Groesse.

    Es gibt ZWEI SKU-Formen im Katalog:
      a) 'CJ-<pid>'          (numerisch) -> Produkt-ID, Variante muss ueber den Titel gesucht werden
      b) '<CJ-variantSku>'   z.B. CJLY291603001AZ -> identifiziert die Variante EXAKT
    Form (b) ist der Normalfall bei Variantenprodukten und wird direkt aufgeloest — kein Raten.
    Nur bei (a) mit mehreren Varianten wird ueber den Variantentitel gematcht; ist die Zuordnung
    nicht eindeutig, wird NICHT bestellt, sondern gemeldet. Lieber ein Mensch schaut drauf,
    als dass das falsche Paket beim Kunden landet."""
    s = (sku or "").strip()
    m = re.match(r'^CJ-([0-9]{10,})$', s.upper())

    if not m:
        # Form (b): CJ-eigene variantSku -> exakte Variante
        vsku = re.sub(r'^CJ-', '', s, flags=re.I)
        if not re.fullmatch(r'[A-Za-z0-9._-]{6,40}', vsku):
            return None, f"SKU «{s}» passt zu keinem CJ-Schema"
        d = cj(f"/api2.0/v1/product/query?variantSku={vsku}")
        data = d.get("data")
        vs = (data or {}).get("variants") or [] if isinstance(data, dict) else []
        if not vs:
            return None, f"variantSku «{vsku}» bei CJ nicht gefunden"
        exakt = [v for v in vs if (v.get("variantSku") or "").upper() == vsku.upper()]
        if len(exakt) == 1:
            return exakt[0], None
        return None, f"variantSku «{vsku}» nicht eindeutig ({len(exakt)} Treffer)"

    # Form (a): numerische pid
    d = cj(f"/api2.0/v1/product/variant/query?pid={m.group(1)}")
    vs = d.get("data") or []
    if not vs:
        return None, "keine-variante-bei-cj"
    if len(vs) == 1:
        return vs[0], None

    vt = (variant_title or "").strip()
    if not vt or vt.lower() in ("default title", "standard", "einheitsgrösse", "einheitsgroesse"):
        return None, f"{len(vs)} CJ-Varianten, aber Bestellung ohne Variantenangabe — manuell prüfen"

    # Kundenwahl "Schwarz / M" -> jeder Teil muss im CJ-variantKey vorkommen,
    # deutsche Farbe ersatzweise auch in ihrer englischen Entsprechung.
    teile = [t for t in re.split(r'\s*/\s*', vt) if t.strip()]

    def teil_passt(teil, key):
        n = norm(teil)
        if n and n in key:
            return True
        en = FARBE_EN.get(n)
        return bool(en and norm(en) in key)

    treffer = [v for v in vs
               if all(teil_passt(t, norm(v.get("variantKey"))) for t in teile)]
    if len(treffer) == 1:
        return treffer[0], None
    keys = ", ".join(str(v.get("variantKey")) for v in vs[:6])
    return None, (f"Variante «{vt}» nicht eindeutig zuzuordnen "
                  f"({len(treffer)} Treffer unter {len(vs)}: {keys}) — manuell bestellen")


def fracht(produkte):
    """Fracht fuer ALLE Artikel der Bestellung zusammen.
    ⚠️ Frueher wurde nur der erste Artikel uebergeben — bei Mehrpositions-Bestellungen war die
    Fracht dadurch zu niedrig angesetzt, die Marge zu optimistisch, und CJ verlangte spaeter den
    echten (hoeheren) Betrag."""
    d = cj("/api2.0/v1/logistic/freightCalculate",
           {"startCountryCode": "CN", "endCountryCode": "CH", "products": produkte})
    return [o for o in (d.get("data") or []) if o.get("logisticPrice") is not None]


def max_tage(aging):
    m = re.findall(r'\d+', aging or "")
    return int(m[-1]) if m else 999


def waehle_versand(opts, ware_usd, vk_chf):
    """Schnellste Option, die rentabel bleibt UND das Lieferversprechen haelt.
    Gibt zusaetzlich zurueck, welche der beiden Bedingungen ggf. verletzt wird —
    'zu langsam' und 'Verlust' sind verschiedene Probleme und duerfen nicht als
    dasselbe gemeldet werden."""
    def rentabel(o): return (ware_usd + o["logisticPrice"]) * USD_CHF <= vk_chf
    def schnell(o):  return max_tage(o.get("logisticAging")) <= MAX_TAGE

    beides = [o for o in opts if rentabel(o) and schnell(o)]
    if beides:
        # ⚠️ GÜNSTIGSTE, NICHT SCHNELLSTE (15.08.2026, Bestellung #1014). «Schnellste
        # rentable» wählte DHL für $37.19 — Marge CHF 3.77 —, obwohl CJPacket dasselbe
        # Lieferversprechen (10–20 Werktage laut Produktseite) für einen Bruchteil hält.
        # Schnelligkeit ÜBER dem Versprechen ist kein Kundenwert, den der Shop bezahlt
        # bekommt; sie war hier nur ein Geschenk an den Frachtführer. Bei Preisgleichheit
        # entscheidet die Laufzeit.
        return min(beides, key=lambda o: (o["logisticPrice"], max_tage(o.get("logisticAging")))), []
    nur_rentabel = [o for o in opts if rentabel(o)]
    if nur_rentabel:
        # lieber rentabel und langsam als Verlust — aber deutlich melden
        o = min(nur_rentabel, key=lambda o: max_tage(o.get("logisticAging")))
        return o, [f"langsamer als {MAX_TAGE} Tage ({o.get('logisticAging')})"]
    o = min(opts, key=lambda x: x["logisticPrice"])
    hin = ["Verlust: keine Option bleibt unter dem Verkaufspreis"]
    if not schnell(o):
        hin.append(f"zusätzlich langsam ({o.get('logisticAging')})")
    return o, hin


def cj_bestellnummern():
    """Die WAHRHEIT liegt bei CJ, nicht im lokalen Ledger. Ein Lauf, der zwischen Anlage und
    Ledger-Schreiben stirbt (passiert hier staendig), wuerde die Bestellung sonst ein zweites
    Mal anlegen — dieselbe Falle wie beim Social-Doppelpost, nur kostet sie hier echtes Geld.
    Darum vor jeder Anlage die komplette CJ-Bestellliste gegenpruefen."""
    nums, seite = set(), 1
    while seite <= 10:
        d = cj(f"/api2.0/v1/shopping/order/list?pageNum={seite}&pageSize=100")
        lst = (d.get("data") or {}).get("list") or []
        if not lst:
            break
        for o in lst:
            n = (o.get("orderNum") or "").strip()
            if n:
                nums.add(n.lstrip("#").upper())
        if len(lst) < 100:
            break
        seite += 1
        time.sleep(0.5)
    return nums


def token_pruefen():
    """Ein abgelaufener CJ-Token laesst die Automatik STILL sterben: alle Aufrufe scheitern,
    aber es sieht aus wie 'nichts zu tun'. Darum bei jedem Lauf laut melden, wie lange er noch
    gilt — und rechtzeitig daran erinnern, dass nur der User ihn erneuern kann
    (/tmp/cj_email + /tmp/cj_apikey gingen beim Container-Wipe verloren)."""
    d = cj("/api2.0/v1/setting/get")
    if d.get("code") != 200:
        print(f"🔴 CJ-Token wird nicht akzeptiert ({d.get('message')}) — "
              f"E-Mail + API-Key vom User nötig, sonst läuft nichts.", flush=True)
        return False
    try:
        exp = json.load(open("/tmp/cj_token.json")).get("exp")
        if exp:
            rest = (exp / 1000 - time.time()) / 86400
            if rest < 3:
                print(f"🔴 CJ-Token läuft in {rest:.1f} Tagen ab — /tmp/cj_email + /tmp/cj_apikey "
                      f"fehlen, ohne sie stoppt die Bestell-Automatik.", flush=True)
            elif rest < 7:
                print(f"⚠️ CJ-Token noch {rest:.1f} Tage gültig.", flush=True)
    except Exception:
        pass
    return True


def main():
    if not token_pruefen():
        return
    done = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            t = l.strip().split("\t")
            if t: done[t[0]] = t[1] if len(t) > 1 else ""
    bei_cj = cj_bestellnummern()
    print(f"CJ kennt bereits {len(bei_cj)} Bestellnummern", flush=True)
    f = open(LEDGER, "a")
    bestellungen = offene_bestellungen()
    print(f"offene bezahlte Bestellungen: {len(bestellungen)} | schon angelegt: {len(done)} | DRY={DRY}", flush=True)

    for o in bestellungen:
        nr = o["name"].lstrip("#")
        if o["name"] in done:
            print(f"  {o['name']}: schon angelegt ({done[o['name']]})", flush=True)
            continue
        if f"LX{nr}".upper() in bei_cj:
            print(f"  {o['name']}: ⏭️ LX{nr} liegt bereits bei CJ — kein Doppel-Anlegen", flush=True)
            f.write(f"{o['name']}\t(bereits-bei-cj)\tLX{nr}\n"); f.flush()
            continue
        sa = o.get("shippingAddress") or {}
        cust = o.get("customer") or {}
        tel = (sa.get("phone") or cust.get("phone")
               or ((cust.get("defaultAddress") or {}).get("phone")) or "")
        if not re.fullmatch(r'[\d +\-()]{6,32}', tel or ""):
            # ⚠️ HÄNDLER-NUMMER ALS RÜCKFALL (15.08.2026, Bestellung #1014). Die Kundin hatte
            # keine Nummer hinterlegt und CJ lehnt Bestellungen ohne ab — der Lauf stand.
            # Für die Zustellung in die Schweiz ruft ohnehin niemand an; als Kontakt gehört
            # dann der HÄNDLER hinein, nicht eine erfundene Nummer. Die Nummer des Betreibers
            # stammt aus seinen eigenen Bestellungen (#1010/#1013).
            tel = os.environ.get("FALLBACK_TEL", "+41795382814")
            print(f"  {o['name']}: ℹ️ keine Kunden-Telefonnummer — Händler-Nummer als Kontakt", flush=True)
        if not re.fullmatch(r'[\d +\-()]{6,32}', tel or ""):
            print(f"  {o['name']}: ⚠️ keine brauchbare Telefonnummer — CJ lehnt das ab, User fragen", flush=True)
            continue

        alle = o["lineItems"]["nodes"]
        # ⚠️ Es gibt CJ-SKUs OHNE das «CJ-»-Präfix im Katalog («CJLS291603531EV», Bestellung
        # #1014) — die nackte CJ-Varianten-SKU. Der Präfix-Test allein liess den Lauf sie als
        # «anderer Lieferant» überspringen, obwohl vid_fuer() genau diese Form (b) längst kann.
        def ist_cj(sku):
            u = (sku or "").upper()
            return u.startswith("CJ-") or bool(re.match(r'^CJ[A-Z]{2}\d{6,}', u))
        items = [li for li in alle if ist_cj(li.get("sku"))]
        if not items:
            print(f"  {o['name']}: keine CJ-Artikel (anderer Lieferant)", flush=True)
            continue
        if len(items) != len(alle):
            # Gemischte Bestellung: der Nicht-CJ-Teil muss separat beim anderen Lieferanten
            # bestellt werden. Automatisch nur den CJ-Teil anzulegen wuerde spaeter beim
            # Fulfillment eine "versendet"-Mail fuer Ware ausloesen, die nie bestellt wurde.
            fremd = [li.get("sku") for li in alle if li not in items]
            print(f"  {o['name']}: ⚠️ gemischte Bestellung (auch {fremd}) — manuell aufteilen", flush=True)
            continue

        produkte, ware_usd, fehler = [], 0.0, None
        for li in items:
            v, err = vid_fuer(li["sku"], li.get("variantTitle"))
            if err:
                fehler = f"{li['sku']}: {err}"; break
            produkte.append({"vid": v["vid"], "quantity": li["quantity"]})
            ware_usd += float(v.get("variantSellPrice") or 0) * li["quantity"]
            time.sleep(0.5)
        if fehler:
            print(f"  {o['name']}: ⚠️ {fehler}", flush=True)
            continue

        opts = fracht(produkte)
        if not opts:
            print(f"  {o['name']}: ⚠️ keine Versandoption in die CH", flush=True)
            continue
        vk = float(o["totalPriceSet"]["shopMoney"]["amount"])
        wahl, hinweise = waehle_versand(opts, ware_usd, vk)
        gesamt = ware_usd + wahl["logisticPrice"]
        marge = vk - gesamt * USD_CHF
        flag = ("  ⚠️ " + " · ".join(hinweise)) if hinweise else ""
        print(f"  {o['name']}: Ware ${ware_usd:.2f} + {wahl['logisticName']} ${wahl['logisticPrice']:.2f}"
              f" = ${gesamt:.2f} | VK CHF {vk} → Marge CHF {marge:.2f} ({wahl['logisticAging']} Tage){flag}", flush=True)
        if DRY:
            continue

        body = {
            "orderNumber": f"LX{nr}",
            "shippingZip": sa.get("zip") or "",
            "shippingCountryCode": sa.get("countryCodeV2") or "CH",
            "shippingCountry": "Switzerland",
            "shippingProvince": sa.get("province") or "Bern",
            "shippingCity": sa.get("city") or "",
            "shippingAddress": " ".join(x for x in [sa.get("address1"), sa.get("address2")] if x),
            "shippingCustomerName": sa.get("name") or "",
            "shippingPhone": tel,
            "remark": f"Shopify {o['name']}",
            "fromCountryCode": "CN",
            "logisticName": wahl["logisticName"],
            "products": produkte,
        }
        r = cj("/api2.0/v1/shopping/order/createOrderV2", body)
        if r.get("code") != 200:
            print(f"    ❌ CJ lehnt ab: {r.get('message')}", flush=True)
            continue
        d = r.get("data") or {}
        cjid = d.get("orderId") or ""
        f.write(f"{o['name']}\t{cjid}\tLX{nr}\t${gesamt:.2f}\n"); f.flush()
        print(f"    ✅ angelegt LX{nr} ({cjid}) — liegt im CJ-Warenkorb, zu zahlen ${gesamt:.2f}", flush=True)
        time.sleep(1)


if __name__ == "__main__":
    main()
