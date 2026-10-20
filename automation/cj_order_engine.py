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

13.10.2026 (Hetzner-Plan Schritt 3, Doppelbestellung): Der Automat laeuft auf ZWEI Rechnern (Server ubuntu-4gb-*
und Cloud-Container), die flock-Sperre gilt nur je Rechner. Deshalb: der Server legt sofort an, die Cloud erst,
wenn die Shopify-Bestellung aelter als CLOUD_WARTE_MIN (45) Minuten ist; und JEDER Rechner liest die CJ-Liste
direkt vor createOrderV2 noch einmal. Von Hand sofort anlegen in der Cloud: CLOUD_WARTE_MIN=0 — ⚠️ NUR wenn feststeht,
dass der Server die Bestellung nicht schon anlegt (Server aus, oder LX<nr> nicht in der CJ-Liste UND kein Server-Lauf
in den letzten 20 min); sonst schuetzt nur noch der zweite Blick (~2 s Fenster + unbekannter Verzug der CJ-Liste).
createOrderV2 wird NIE wiederholt, wenn die Antwort verloren geht (cj(..., einmal=True)) — Ergebnis «unklar», Push
«nicht bezahlen, bis cj_zahlung_offen geprueft hat». Nach der Anlage liest der Automat die CJ-Liste nochmals: liegen
fuer LX<nr> zwei verschiedene Auftraege (cjOrderId-Staemme), geht statt des Zahl-Pushes eine ⛔-Warnung OHNE Link raus.
`--selbsttest` prueft das ohne einen einzigen echten CJ- oder Shopify-Aufruf.
"""
import json, subprocess, time, os, re, sys, socket
import datetime as dt
import urllib.parse
import os as _os_takt, sys as _sys_takt
_sys_takt.path.insert(0, _os_takt.path.join(_os_takt.environ.get('REPO', '/home/user/aban-news-landing'), 'automation'))
from cj_takt import takt  # 21.09.: reservierte Startzeiten gegen CJs 1/s-Drossel
import cj_sku  # 20.10.2026: EINE Quelle für «ist das eine CJ-SKU?» (siehe dort)
# 07.10.2026 (Betreiber «bei bestellung sofort alles erledigen und mir den paylink schicken»): jede Bestellung, die
# den Betreiber braucht (bezahlen ODER Fehler), geht sofort als Handy-Nachricht raus (ntfy, einmal je Schlüssel).
try:
    from betreiber_push import senden as _push, CJ_BESTELLUNGEN
except Exception:          # Push darf den Bestell-Automaten nie aufhalten
    _push, CJ_BESTELLUNGEN = None, "https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5"


def melde(schluessel, titel, text, mit_link=True, **kw):
    """mit_link=False: Warnung OHNE Klick auf die CJ-Zahlliste (13.10.2026: Doppel-Auftrag darf keinen Zahllink haben)."""
    if _push and not DRY:
        try:
            _push(schluessel, titel, text, klick=CJ_BESTELLUNGEN if mit_link else None, **kw)
        except Exception as e:
            print(f"    (Push gescheitert: {type(e).__name__})", flush=True)

# 13.10.2026: Selbsttest ohne Token-Dateien und ohne Kurs-Abruf (kein Netz, kein CJ).
SELBSTTEST = __name__ == "__main__" and "--selbsttest" in sys.argv
CJTOK = "" if SELBSTTEST else open("/tmp/_cjtok").read().strip()
STOK  = "" if SELBSTTEST else open("/tmp/cj_shop_token.txt").read().strip()
SHOP  = "au3j0y-hq.myshopify.com"
DRY   = os.environ.get("DRY") == "1"
LEDGER = "dropship/_cj_orders_done.txt"

MAX_TAGE = int(os.environ.get("MAX_TAGE", "20"))       # Obergrenze fuers Lieferversprechen

# 13.10.2026 (Hetzner-Plan Schritt 3): zeitliche Trennung Server/Cloud gegen eine doppelte CJ-Bestellung (echtes Geld).
# 13.10.2026 abends (Pruefer-Befund): 15 min war KUERZER als der gemessene Server-Zyklus. Gemessen in den Takt-Berichten
# dropship/_cj_takt_ubuntu-4gb-nbg1-1.json (09–20 UTC): cj_order_engine auf dem Server 6–12 CJ-Aufrufe/h bei 2 Aufrufen je
# Leerlauf = 3–6 Laeufe/h, also alle 10–20 min (17-Uhr-Fenster: 20 min); die Cloud ~20–22 Aufrufe/h = alle ~5,5 min.
# Der Server holt eine neue Bestellung also oft erst nach 12–20 min ab — mit 15 min legte die Cloud im selben Fenster an.
# 45 min = 2 volle Server-Zyklen + Reserve; faellt der Server aus, kommt die Bestellung trotzdem nach ~45 min zu CJ.
CLOUD_WARTE_MIN = float(os.environ.get("CLOUD_WARTE_MIN", "45"))
# Legt der Server an, schreibt ER die Ledger-Zeile mit SD-Nummer (kommt per git). Eine zusaetzliche «(bereits-bei-cj)»-
# Zeile der Cloud waere im Ledger ein falscher Doppel-Treffer — die Cloud schreibt sie erst, wenn die Bestellung
# aelter als LEDGER_NACHZUG_MIN ist (dann ist der Server vermutlich zwischen Anlage und Ledger gestorben).
# Muss groesser sein als Cloud-Wartezeit + Server-Zyklus + git-Verzug (45 + 20 + ~10–20) → 90 (13.10.2026, vorher 60).
LEDGER_NACHZUG_MIN = float(os.environ.get("LEDGER_NACHZUG_MIN", "90"))


def ist_server(host=None):
    """Hetzner-Server = Hostname ubuntu-4gb-* (wie engine_keepalive.sh); alles andere ist die Cloud."""
    return (host if host is not None else socket.gethostname()).startswith("ubuntu-4gb-")


def alter_min(created_at, jetzt=None):
    """Shopify createdAt («2026-10-12T15:57:03Z») → Minuten seit der Bestellung; None, wenn unlesbar."""
    try:
        t = dt.datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
    except Exception:
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return ((jetzt or dt.datetime.now(dt.timezone.utc)) - t).total_seconds() / 60


def cloud_wartet(o, server, jetzt=None):
    """'' = dieser Rechner darf anlegen; sonst der Grund, warum die Cloud (noch) nicht anlegt."""
    if server or CLOUD_WARTE_MIN <= 0:
        return ""
    a = alter_min(o.get("createdAt"), jetzt)
    if a is None:
        return f"createdAt «{o.get('createdAt')}» unlesbar — Cloud legt nicht an, der Server übernimmt"
    if a < CLOUD_WARTE_MIN:
        return f"erst {a:.0f} min alt — Cloud wartet {CLOUD_WARTE_MIN:.0f} min, der Server legt an"
    return ""


try:  # 03.10.2026: Eimer-Etikette im gemeinsamen gql-Helfer (Regel «helfer-ohne-eimer»)
    from eimer_etikette import nachlauf as _nachlauf
except Exception:  # pragma: no cover
    def _nachlauf(d):
        return 0


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


USD_CHF = 0.80 if SELBSTTEST else usd_chf()


UNKLAR = "unklar"


def cj(path, body=None, einmal=False):
    """einmal=True (13.10.2026, Pflicht fuer createOrderV2): bei leerer/unlesbarer Antwort NICHT nochmals senden — die
    Anlage kann bei CJ angekommen sein (curl --max-time 45 schneidet nur die Antwort ab). Gegenprobe des Pruefers: ohne
    diese Sperre 4 POSTs = 4 Auftraege fuer dieselbe LX. → {'code': 'unklar', ...}; der naechste Lauf sieht in der
    CJ-Liste, ob der Auftrag existiert. Drossel-Codes 1600200/1600201 = CJ hat abgewiesen → Wiederholen ist sicher."""
    a = ["curl", "-s", "--max-time", "45", "-H", "CJ-Access-Token: " + CJTOK]
    if body is not None:
        a += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(body)]
    a.append("https://developers.cjdropshipping.com" + path)
    letzte = {}
    for att in range(4):
        takt()
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
            if not isinstance(d, dict):
                raise ValueError("keine JSON-Objekt-Antwort")
        except Exception:
            if einmal:
                return {"code": UNKLAR, "message": "Antwort leer/unlesbar — Anlage unklar, nächster Lauf prüft die CJ-Liste"}
            time.sleep(4); continue
        # CJ drosselt getAccessToken/Suchen; bei Drossel kurz warten statt aufgeben
        if str(d.get("code")) in ("1600200", "1600201"):
            letzte = d
            time.sleep(8 * (att + 1)); continue
        return d
    return letzte if einmal else {}


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for versuch in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + STOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        grund = "unbekannt"
        try:
            d = json.loads(r.stdout)
            _nachlauf(d)
            if "data" in d:
                return d
            # ⚠️ 17.09.2026: Hier stand `except Exception: pass` und darunter `return {}`.
            # Der Grund wurde verschluckt UND der Aufrufer bekam ein leeres Ergebnis — ein
            # Waechter, der damit `.get(...)` weiterrechnet, meldet «0 Produkte». Eine Null,
            # die wie eine Messung aussieht und ein Ausfall ist. Deshalb: Grund benennen
            # und LAUT scheitern, statt still eine Null zu liefern.
            grund = str(d.get("errors") or d)[:300]
            if "THROTTLED" in grund.upper():
                # Shopifys Eimer fuellt sich mit restoreRate — kurz warten hilft nicht.
                time.sleep(12)
                continue
        except Exception as e:
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + (r.stdout or "")[:200]
        time.sleep(3)
    raise RuntimeError("Shopify antwortet nicht (" + str(versuch + 1)
                       + " Versuche). Letzter Grund: " + grund)


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


AUSGELISTET = "⛔ bei CJ AUSGELISTET (1602002) — nicht lieferbar: Ersatz (z. B. Fortura) oder Rückerstattung, Produkt → DRAFT"


def zuordnung_vid(sku):
    """01.10.2026: belegte Zuordnung Shop-SKU → CJ-vid aus dropship/_cj_varianten_zuordnung.tsv (auch für Artikel ohne
    CJ-SKU, z. B. hand-kuratierte LX-Produkte mit freigegebenem CJ-Ersatz wie das Kristall-Set #1020). None = kein Eintrag."""
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_cj_varianten_zuordnung.tsv")
    if not os.path.exists(pfad):
        return None
    for z in open(pfad, encoding="utf-8"):
        f = z.rstrip("\n").split("\t")
        if len(f) >= 2 and not z.startswith("#") and f[0].strip().upper() == (sku or "").strip().upper():
            return f[1].strip()
    return None


def ist_cj_sku(sku):
    """Gehört diese Shop-SKU zu CJ? «CJ-…»-Präfix, eine CJ-Form hinter dem Präfix ODER eine belegte Zuordnung.

    20.10.2026 (Vollmessung über 552'927 Varianten): die frühere Regel ^CJ[A-Z]{2}\\d{6,} verfehlte 3'466 nackte CJ-SKUs
    («CJYDQXHB00011-BROWN-39», «CJJJJTJT22925»). Eine Bestellung mit so einer Zeile galt als «anderer Lieferant» und wurde
    übersprungen — der Kunde hätte bezahlt, bei CJ wäre nichts bestellt worden. Die Form prüft jetzt cj_sku.ist_cj_form()."""
    u = (sku or "").strip().upper()
    return u.startswith("CJ-") or cj_sku.ist_cj_form(sku) or bool(zuordnung_vid(sku))


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
    zv = zuordnung_vid(s)
    if zv and not s.upper().startswith("CJ"):
        # Nicht-CJ-SKU mit freigegebenem Ersatz (Kristall-Set #1020): Variante direkt per vid, Auslistung prüfen.
        d = cj(f"/api2.0/v1/product/variant/queryByVid?vid={urllib.parse.quote(zv)}")
        v = d.get("data") if isinstance(d.get("data"), dict) else None
        if v and (v.get("vid") or "").upper() == zv.upper():
            chk = cj(f"/api2.0/v1/product/query?pid={v.get('pid')}")
            if str(chk.get("code")) == "1602002":
                return None, AUSGELISTET
            return v, None
        return None, f"Ersatz-Zuordnung {zv} bei CJ nicht (mehr) gefunden — manuell prüfen"
    # 01.10.2026 (#1021): CJ-pids gibt es auch als UUID («CJ-65D5329E-AA72-…») — das alte Muster kannte nur Ziffern,
    # hielt die UUID für eine variantSku und meldete «bei CJ nicht gefunden»; die Kundin wartete.
    m = re.match(r'^CJ-([0-9]{10,}|[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})$', s.upper())

    if not m:
        # Form (b): CJ-eigene variantSku -> exakte Variante
        vsku = re.sub(r'^CJ-', '', s, flags=re.I)
        # CJ-Varianten-SKUs koennen ein Leerzeichen tragen («CJBJMRJF00040-EU plug», Stecker-
        # Varianten, 14.09.) — ohne quote() waere die URL kaputt und die Bestellung stuende still.
        if not re.fullmatch(r'[A-Za-z0-9._ -]{6,40}', vsku):
            return None, f"SKU «{s}» passt zu keinem CJ-Schema"
        d = cj(f"/api2.0/v1/product/query?variantSku={urllib.parse.quote(vsku)}")
        if str(d.get("code")) == "1602002":
            return None, AUSGELISTET
        data = d.get("data")
        vs = (data or {}).get("variants") or [] if isinstance(data, dict) else []
        if not vs:
            return None, f"variantSku «{vsku}» bei CJ nicht gefunden"
        exakt = [v for v in vs if (v.get("variantSku") or "").upper() == vsku.upper()]
        if len(exakt) == 1:
            return exakt[0], None
        return None, f"variantSku «{vsku}» nicht eindeutig ({len(exakt)} Treffer)"

    # Form (a): numerische pid
    # 27.09.2026 (#1019): variant/query liefert auch für AUSGELISTETE Produkte noch Varianten — LX1019 wurde angelegt,
    # CJ lehnte erst beim Übergeben ab («Produkt entfernt»). Deshalb zuerst product/query: 1602002 = ausgelistet.
    chk = cj(f"/api2.0/v1/product/query?pid={m.group(1)}")
    if str(chk.get("code")) == "1602002":
        return None, AUSGELISTET
    d = cj(f"/api2.0/v1/product/variant/query?pid={m.group(1)}")
    vs = d.get("data") or []
    if not vs:
        return None, "keine-variante-bei-cj"
    if len(vs) == 1:
        return vs[0], None

    # 01.10.2026 (#1021): Shop-Produkt mit EINER Variante, CJ mit mehreren → belegte Zuordnung aus
    # dropship/_cj_varianten_zuordnung.tsv (Bildvergleich), statt raten oder liegen lassen.
    zuordnung = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_cj_varianten_zuordnung.tsv")
    if os.path.exists(zuordnung):
        for z in open(zuordnung, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 2 and not z.startswith("#") and f[0].strip().upper() == s.upper():
                treffer = [v for v in vs if (v.get("vid") or "").upper() == f[1].strip().upper()]
                if len(treffer) == 1:
                    return treffer[0], None
                return None, f"Zuordnung {f[1]} passt zu keiner aktuellen CJ-Variante — manuell prüfen"

    vt = (variant_title or "").strip()
    if not vt or vt.lower() in ("default title", "standard", "einheitsgrösse", "einheitsgroesse"):
        # 01.10.2026: ~72 % der Einzelvarianten-Produkte (Stichprobe 29/40) haben bei CJ mehrere Varianten →
        # Bildvergleich Shop-Hauptbild vs. CJ-Variantenbilder, Gemini UND ChatGPT müssen sich einig und sicher sein.
        try:
            import cj_variante_bild as cvb
            d = gql('{productVariants(first:1, query:"sku:\\"%s\\""){nodes{product{featuredMedia{preview{image{url}}}}}}}' % s)
            n = (((d.get("data") or {}).get("productVariants") or {}).get("nodes") or [])
            url = ((((n[0].get("product") or {}).get("featuredMedia") or {}).get("preview") or {}).get("image") or {}).get("url") if n else None
            if url:
                v, beleg = cvb.waehlen(url, vs)
                if v:
                    cvb.zuordnung_schreiben(s, v, beleg)
                    print(f"    🖼️ {s}: {beleg[:160]}", flush=True)
                    return v, None
                return None, f"{len(vs)} CJ-Varianten, Shop ohne Variante — {beleg[:200]}"
        except Exception as ex:
            return None, f"{len(vs)} CJ-Varianten, Bildvergleich-Fehler ({type(ex).__name__}: {str(ex)[:80]}) — manuell prüfen"
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


LAENDER = {"CH": ("Switzerland", "Bern"), "LI": ("Liechtenstein", "Liechtenstein")}   # 09.10.2026: Markt CH + LI


def fracht(produkte, land="CH"):
    """Fracht fuer ALLE Artikel der Bestellung zusammen.
    09.10.2026: Ziel = Lieferland der Bestellung. Liechtenstein ist seit heute im Markt; CJ fuehrt dorthin andere
    Linien (gemessen: 4 Optionen ab USD 13.89, 15–60 Tage) als in die Schweiz (16 ab USD 8.66) — mit festem «CH»
    haette der Automat eine Linie gewaehlt, die es nach Vaduz gar nicht gibt.
    ⚠️ Frueher wurde nur der erste Artikel uebergeben — bei Mehrpositions-Bestellungen war die
    Fracht dadurch zu niedrig angesetzt, die Marge zu optimistisch, und CJ verlangte spaeter den
    echten (hoeheren) Betrag."""
    d = cj("/api2.0/v1/logistic/freightCalculate",
           {"startCountryCode": "CN", "endCountryCode": land, "products": produkte})
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


def cj_bestellnummern(streng=False):
    """Die WAHRHEIT liegt bei CJ, nicht im lokalen Ledger. Ein Lauf, der zwischen Anlage und
    Ledger-Schreiben stirbt (passiert hier staendig), wuerde die Bestellung sonst ein zweites
    Mal anlegen — dieselbe Falle wie beim Social-Doppelpost, nur kostet sie hier echtes Geld.
    Darum vor jeder Anlage die komplette CJ-Bestellliste gegenpruefen.
    13.10.2026: streng=True → None, wenn CJ die Liste nicht liefert (sonst sieht ein Ausfall aus wie «leer»)."""
    alle = cj_liste(streng)
    if alle is None:
        return None
    return {n.lstrip("#").upper() for n in ((o.get("orderNum") or "").strip() for o in alle) if n}


def cj_liste(streng=False):
    """Alle CJ-Auftraege (Eintraege mit orderNum, cjOrderId, orderId, orderStatus …); streng=True → None bei Ausfall."""
    alle, seite = [], 1
    while seite <= 10:
        d = cj(f"/api2.0/v1/shopping/order/list?pageNum={seite}&pageSize=100")
        if streng and str(d.get("code")) != "200":
            return None
        lst = (d.get("data") or {}).get("list") or []
        if not lst:
            break
        alle += lst
        if len(lst) < 100:
            break
        seite += 1
        time.sleep(0.5)
    return alle


# 13.10.2026: dieselbe Regel wie cj_zahlung_offen.stamm()/TOT (dort gemessen an LX1013: CJ teilt einen Auftrag VOR dem
# Bezahlen in SD…, SD…-2 — Teile sind kein Doppel; ein zweites createOrderV2 bekommt eine eigene SD-Nummer).
try:
    from cj_zahlung_offen import stamm as _stamm, TOT as _TOT
except Exception:          # pragma: no cover — der Bestell-Automat darf an diesem Import nie scheitern
    _TOT = {"TRASH", "CANCELLED"}

    def _stamm(o):
        c = str(o.get("cjOrderId") or "").strip().upper()
        return re.sub(r"-\d+$", "", c) if c else "orderId " + str(o.get("orderId") or id(o))


def staemme_nach_anlage(nr, cjid, lesen=None):
    """13.10.2026: CJ-Liste NACH createOrderV2 streng neu lesen → Menge der Auftrags-Staemme fuer LX<nr>, None = unlesbar.
    Der eben angelegte Auftrag zaehlt immer mit (die Liste kann ihm hinterherhinken); er wird ueber cjOrderId/orderId
    wiedererkannt, damit er nicht doppelt zaehlt. ≥ 2 Staemme = echtes Doppel → kein Zahl-Push."""
    alle = (lesen or (lambda: cj_liste(streng=True)))()
    if not alle:          # leer ist bei CJ nie echt (28 Auftraege) → wie unlesbar
        return None
    eigene = [o for o in alle if str(o.get("orderNum") or "").strip().lstrip("#").upper() == f"LX{nr}".upper()
              and o.get("orderStatus") not in _TOT]
    staemme = {_stamm(o) for o in eigene}
    ids = {str(o.get(k) or "").strip().upper() for o in eigene for k in ("cjOrderId", "orderId")}
    c = str(cjid or "").strip().upper()
    if c and c not in ids:
        staemme.add(re.sub(r"-\d+$", "", c))
    return staemme


def vor_anlage(nr, lesen=None):
    """13.10.2026 (Hetzner-Plan Schritt 3): CJ-Liste DIREKT vor createOrderV2 neu lesen. Am Laufbeginn gelesen ist sie
    nach Varianten- und Frachtabfragen Minuten alt — in der Zeit kann der andere Rechner LX<nr> angelegt haben.
    → ('frei', '') | ('bereits', Grund) | ('unlesbar', Grund). `lesen` = Testhaken für den Selbsttest."""
    nums = (lesen or (lambda: cj_bestellnummern(streng=True)))()
    # 13.10.2026 (Pruefer): auch eine «erfolgreiche» LEERE Liste (code 200, list []) ist unlesbar — bei CJ liegen
    # 28 Auftraege, leer ist nie echt; als «frei» gewertet waere sie ein Freibrief fuers Doppel-Anlegen.
    if nums is None or not nums:
        return "unlesbar", "CJ-Bestellliste gerade nicht lesbar — lieber nächster Lauf als Doppelbestellung"
    if f"LX{nr}".upper() in nums:
        return "bereits", f"LX{nr} liegt inzwischen bei CJ (anderer Rechner war schneller) — kein Doppel-Anlegen"
    return "frei", ""


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


def main(host=None):
    if not token_pruefen():
        return
    server = ist_server(host)      # 13.10.2026: Server legt sofort an, Cloud erst nach CLOUD_WARTE_MIN
    done = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            t = l.strip().split("\t")
            if t: done[t[0]] = t[1] if len(t) > 1 else ""
    bei_cj = cj_bestellnummern()
    print(f"CJ kennt bereits {len(bei_cj)} Bestellnummern", flush=True)
    f = open(LEDGER, "a")
    bestellungen = offene_bestellungen()
    print(f"offene bezahlte Bestellungen: {len(bestellungen)} | schon angelegt: {len(done)} | DRY={DRY} | "
          f"Rechner: {'Server (legt sofort an)' if server else f'Cloud (wartet {CLOUD_WARTE_MIN:.0f} min)'}", flush=True)

    for o in bestellungen:
        nr = o["name"].lstrip("#")
        if o["name"] in done:
            print(f"  {o['name']}: schon angelegt ({done[o['name']]})", flush=True)
            continue
        if f"LX{nr}".upper() in bei_cj:
            a = alter_min(o.get("createdAt"))
            if not server and a is not None and a < LEDGER_NACHZUG_MIN:
                # 13.10.2026: die Ledger-Zeile mit SD-Nummer schreibt der Rechner, der angelegt hat (kommt per git)
                print(f"  {o['name']}: ⏭️ LX{nr} liegt bereits bei CJ — Ledger-Zeile kommt vom anlegenden Rechner", flush=True)
                continue
            print(f"  {o['name']}: ⏭️ LX{nr} liegt bereits bei CJ — kein Doppel-Anlegen", flush=True)
            f.write(f"{o['name']}\t(bereits-bei-cj)\tLX{nr}\n"); f.flush()
            continue
        warte = cloud_wartet(o, server)
        if warte:
            # 13.10.2026 (Hetzner-Plan Schritt 3): VOR Varianten-/Frachtabfragen — eine wartende Bestellung kostet keine CJ-Punkte.
            print(f"  {o['name']}: ⏳ {warte}", flush=True)
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
            melde(f"{o['name']}-tel", f"⚠️ Bestellung {o['name']}: Telefonnummer fehlt", "CJ nimmt die Bestellung ohne Telefonnummer nicht an — bitte in Shopify ergänzen.")
            continue

        alle = o["lineItems"]["nodes"]
        # ⚠️ Es gibt CJ-SKUs OHNE das «CJ-»-Präfix im Katalog («CJLS291603531EV», Bestellung
        # #1014) — die nackte CJ-Varianten-SKU. Der Präfix-Test allein liess den Lauf sie als
        # «anderer Lieferant» überspringen, obwohl vid_fuer() genau diese Form (b) längst kann.
        ist_cj = ist_cj_sku   # 20.10.2026: modulweit, damit der Selbsttest dieselbe Prüfung ausführt wie die Bestellschleife
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
            melde(f"{o['name']}-gemischt", f"⚠️ Bestellung {o['name']}: gemischt", f"Enthält auch Nicht-CJ-Ware ({', '.join(str(x) for x in fremd)[:120]}) — bitte manuell aufteilen.")
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
            melde(f"{o['name']}-variante", f"⚠️ Bestellung {o['name']}: Variante nicht gefunden", f"{fehler[:180]}")
            continue

        land = (sa.get("countryCodeV2") or "CH").upper()
        if land not in LAENDER:
            print(f"  {o['name']}: ⚠️ Lieferland {land} ist nicht freigegeben", flush=True)
            melde(f"{o['name']}-land", f"⚠️ Bestellung {o['name']}: Lieferland {land}", "Nur CH und LI sind freigegeben — manuell prüfen.")
            continue
        opts = fracht(produkte, land)
        if not opts:
            print(f"  {o['name']}: ⚠️ keine Versandoption nach {land}", flush=True)
            melde(f"{o['name']}-versand", f"⚠️ Bestellung {o['name']}: kein CJ-Versand nach {LAENDER[land][0]}", f"CJ bietet für diese Ware keine Versandoption nach {LAENDER[land][0]} — Kunde informieren oder erstatten.")
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
            "shippingCountryCode": land,
            "shippingCountry": LAENDER[land][0],
            "shippingProvince": sa.get("province") or LAENDER[land][1],
            "shippingCity": sa.get("city") or "",
            "shippingAddress": " ".join(x for x in [sa.get("address1"), sa.get("address2")] if x),
            "shippingCustomerName": sa.get("name") or "",
            "shippingPhone": tel,
            "remark": f"Shopify {o['name']}",
            "fromCountryCode": "CN",
            "logisticName": wahl["logisticName"],
            "products": produkte,
        }
        # 13.10.2026 (Hetzner-Plan Schritt 3): zweiter Blick auf die CJ-Liste unmittelbar vor dem Anlegen. Keine
        # Ledger-Zeile bei «bereits» — die schreibt der Rechner, der angelegt hat; der nächste Lauf prüft erneut.
        stand, grund = vor_anlage(nr)
        if stand != "frei":
            print(f"  {o['name']}: ⏭️ {grund}", flush=True)
            continue
        # 13.10.2026 (Pruefer-Befund): einmal=True — geht die Antwort verloren, wird NICHT nochmals angelegt.
        r = cj("/api2.0/v1/shopping/order/createOrderV2", body, einmal=True)
        if r.get("code") == UNKLAR:
            # Keine Ledger-Zeile: der naechste Lauf (dieser oder der andere Rechner) sieht in der CJ-Liste, ob LX<nr>
            # existiert, und schreibt dann «(bereits-bei-cj)». Bezahlt wird erst, wenn cj_zahlung_offen EINEN Auftrag zeigt.
            print(f"    ⚠️ Anlage unklar: {r.get('message')}", flush=True)
            melde(f"{o['name']}-anlage-unklar", f"⚠️ Bestellung {o['name']}: Anlage bei CJ unklar",
                  f"createOrderV2 für LX{nr} ohne lesbare Antwort — nicht bezahlen, bis cj_zahlung_offen geprüft hat "
                  f"(zeigt genau EINEN Auftrag LX{nr} unter «Zu bezahlen»). Kein zweiter Versuch, damit kein Doppel entsteht.",
                  mit_link=False, tags="warning")
            continue
        if r.get("code") != 200:
            print(f"    ❌ CJ lehnt ab: {r.get('message')}", flush=True)
            melde(f"{o['name']}-abgelehnt", f"❌ Bestellung {o['name']}: CJ lehnt ab", f"{str(r.get('message'))[:180]}")
            continue
        d = r.get("data") or {}
        cjid = d.get("orderId") or ""
        f.write(f"{o['name']}\t{cjid}\tLX{nr}\t${gesamt:.2f}\n"); f.flush()
        print(f"    ✅ angelegt LX{nr} ({cjid}) — liegt im CJ-Warenkorb, zu zahlen ${gesamt:.2f}", flush=True)
        # 13.10.2026 (Pruefer-Befund): vor dem Zahl-Push die CJ-Liste streng neu lesen. Zwei verschiedene Auftraege
        # (Staemme) fuer LX<nr> = Doppel (beide Rechner gleichzeitig) → ⛔-Warnung OHNE Zahllink statt «bezahlen».
        staemme = staemme_nach_anlage(nr, cjid)
        if staemme is not None and len(staemme) >= 2:
            print(f"    ⛔ DOPPELT bei CJ: LX{nr} hat {len(staemme)} Aufträge ({', '.join(sorted(staemme))}) — kein Zahl-Push", flush=True)
            melde(f"LX{nr}-doppelt-angelegt", f"⛔ DOPPELT bei CJ: LX{nr} — NICHTS bezahlen",
                  f"Für {o['name']} liegen {len(staemme)} Aufträge bei CJ ({', '.join(sorted(staemme))}). Nichts bezahlen, "
                  f"bis cj_zahlung_offen genau EINEN zum Bezahlen vorlegt; die anderen erst prüfen (Betrag/Artikel), dann "
                  f"in der CJ-Konsole löschen.", mit_link=False, tags="warning")
        else:
            sd = cjid or "(SD-Nummer fehlt — erst cj_zahlung_offen prüfen)"
            melde(f"LX{nr}-angelegt", f"💳 Bestellung {o['name']} bezahlen: nur {sd} · ${gesamt:.2f}",
                  f"CJ-Auftrag LX{nr} ({sd}) liegt bezahlbereit im Warenkorb — nur {sd} bezahlen. Kunde zahlte "
                  f"CHF {vk:.2f}, Marge ≈ CHF {marge:.2f}, Versand {wahl['logisticName']} ({wahl['logisticAging']} Tage). "
                  f"Tippen → CJ → Bestellungen → LX{nr} → {sd} → Pay."
                  + (" (CJ-Liste nach der Anlage nicht lesbar — Doppel-Prüfung macht cj_zahlung_offen.)" if staemme is None else ""))
        time.sleep(1)


def selbsttest_cj_einmal():
    """13.10.2026: cj() selbst, mit gefälschtem curl (subprocess) — kein Netz. «Antwort verloren» → genau 1 POST."""
    import types
    g = globals()
    alt = {k: g[k] for k in ("subprocess", "time", "takt")}
    faelle = [  # (Name, Antworten von curl der Reihe nach, einmal, soll Anzahl Aufrufe, soll code)
        ("Antwort verloren → genau 1 POST",       ["", "", "", ""],                                   True,  1, UNKLAR),
        ("Antwort unlesbar (HTML) → genau 1 POST", ["<html>502</html>", "", "", ""],                   True,  1, UNKLAR),
        ("Drossel 1600200, dann OK → 2 POSTs",     ['{"code":1600200}', '{"code":200,"data":{}}'],     True,  2, 200),
        ("Drossel 4× → abgewiesen, kein unklar",   ['{"code":1600201}'] * 4,                           True,  4, 1600201),
        ("Lesen ohne einmal: leer → 4 Versuche",   ["", "", "", ""],                                   False, 4, None),
    ]
    fehler = 0
    try:
        for name, antworten, einmal, soll_n, soll_code in faelle:
            aufrufe = []

            def run(a, **kw):
                aufrufe.append(a)
                return types.SimpleNamespace(stdout=antworten[len(aufrufe) - 1] if len(aufrufe) <= len(antworten) else "")
            g.update(subprocess=types.SimpleNamespace(run=run), time=types.SimpleNamespace(sleep=lambda s: None),
                     takt=lambda: None)
            r = cj("/api2.0/v1/shopping/order/createOrderV2", {"orderNumber": "LX9001"}, einmal=einmal)
            ok = len(aufrufe) == soll_n and r.get("code") == soll_code
            fehler += not ok
            print(f"  {'OK  ' if ok else 'FEHL'} cj(): {name}: Aufrufe={len(aufrufe)} code={r.get('code')}")
    finally:
        g.update(alt)
    return fehler


def selbsttest():
    """13.10.2026 (Hetzner-Plan Schritt 3): main() mit gefälschtem CJ/Shopify/Push — KEIN echter Aufruf, kein Push.
    Je Fall: Rechner, Alter der Shopify-Bestellung, was die CJ-Liste beim 1./2./3. Lesen zeigt (3. = nach der Anlage),
    Antwort von createOrderV2 → angelegt ja/nein, Ledger-Zeile, Text im Log, Push (Titel-Teil, mit Zahllink ja/nein)."""
    import tempfile, io, contextlib
    g = globals()
    alt = {k: g[k] for k in ("cj", "offene_bestellungen", "vid_fuer", "fracht", "token_pruefen", "LEDGER", "DRY", "_push")}
    jetzt = dt.datetime.now(dt.timezone.utc)
    SV, CL = "ubuntu-4gb-nbg1-1", "vm"
    EIGEN = {"orderNum": "LX9001", "cjOrderId": "SDTESTLX9001", "orderId": "SDTESTLX9001", "orderStatus": "UNPAID"}
    ANDERER = {"orderNum": "LX9001", "cjOrderId": "SDANDERS0001", "orderId": "SDANDERS0001", "orderStatus": "UNPAID"}
    TEIL2 = dict(EIGEN, cjOrderId="SDTESTLX9001-2", orderId="SDTESTLX9001-2")
    VERW = dict(ANDERER, orderStatus="TRASH")
    OK200 = None   # createOrderV2 → code 200 mit SDTEST<LX>
    ZAHL = ("bezahlen: nur SDTESTLX9001", True)
    faelle = [  # (Name, Host, Alter, Liste 1, 2, 3, createOrderV2-Antwort, soll angelegt, soll Ledger, Text im Log, soll Push)
        ("frisch, Cloud wartet",            CL, 5,   [],         None,                None,              OK200, False, None, "Cloud wartet 45 min", None),
        ("30 min alt, Cloud wartet noch",   CL, 30,  [],         None,                None,              OK200, False, None, "Cloud wartet 45 min", None),
        ("alt, Cloud legt an",              CL, 50,  [],         ["LX1000"],          ["LX1000", EIGEN], OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        ("frisch, Server legt sofort an",   SV, 1,   [],         ["LX1000"],          ["LX1000", EIGEN], OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        ("LX schon bei CJ (Laufbeginn)",    CL, 50,  ["LX9001"], None,                None,              OK200, False, None, "Ledger-Zeile kommt", None),
        ("LX schon bei CJ, Server",         SV, 1,   ["LX9001"], None,                None,              OK200, False, "(bereits-bei-cj)", "kein Doppel", None),
        ("LX bei CJ seit > 90 min, Cloud",  CL, 120, ["LX9001"], None,                None,              OK200, False, "(bereits-bei-cj)", "kein Doppel", None),
        ("LX taucht vor Anlage auf",        CL, 50,  [],         ["LX1000", "LX9001"], None,             OK200, False, None, "anderer Rechner war schneller", None),
        ("CJ-Liste vor Anlage unlesbar",    CL, 50,  [],         "FEHLER",            None,              OK200, False, None, "nicht lesbar", None),
        ("2. Lesen leer (code 200) → nicht anlegen", CL, 50, [], [],                  None,              OK200, False, None, "nicht lesbar", None),
        ("Antwort verloren → unklar, kein Ledger", SV, 1, [],    ["LX1000"],          None,              "UNKLAR", True, None, "Anlage unklar",
         ("Anlage bei CJ unklar", False)),
        ("Doppel nach Anlage → ⛔ ohne Link", SV, 1, [],         ["LX1000"],          [EIGEN, ANDERER],  OK200, True,  "SD",  "DOPPELT bei CJ",
         ("DOPPELT bei CJ: LX9001", False)),
        ("CJ-Teilung SD…-2 ist kein Doppel", SV, 1, [],          ["LX1000"],          [EIGEN, TEIL2],    OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        ("verworfener Zweitauftrag zählt nicht", SV, 1, [],      ["LX1000"],          [EIGEN, VERW],     OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        ("Liste hinkt nach (eigener fehlt)", SV, 1, [],          ["LX1000"],          ["LX1000"],        OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        ("Liste nach Anlage unlesbar → Zahl-Push mit SD", SV, 1, [], ["LX1000"],      "FEHLER",          OK200, True,  "SD",  "angelegt LX9001", ZAHL),
        # 20.10.2026: nackte CJ-SKUs mit Optionsanhang / langem Buchstabenstamm (3'466 Varianten) wurden als «anderer Lieferant» übersprungen
        ("nackte SKU mit Anhang «CJYDQXHB00011-BROWN-39»", SV, 1, [], ["LX1000"], ["LX1000", EIGEN], OK200, True, "SD", "angelegt LX9001", ZAHL,
         "CJYDQXHB00011-BROWN-39"),
        ("nackter Stamm «CJJJJTJT22925»", SV, 1, [], ["LX1000"], ["LX1000", EIGEN], OK200, True, "SD", "angelegt LX9001", ZAHL, "CJJJJTJT22925"),
        ("Leerzeichen im Anhang «CJBJPFMZ00313-S0482A813 STYLE-Q10PCS»", SV, 1, [], ["LX1000"], ["LX1000", EIGEN], OK200, True, "SD", "angelegt LX9001",
         ZAHL, "CJBJPFMZ00313-S0482A813 STYLE-Q10PCS"),
        ("Fremd-SKU «fortura-1234» bleibt «anderer Lieferant»", SV, 1, [], None, None, OK200, False, None, "keine CJ-Artikel (anderer Lieferant)", None,
         "fortura-1234"),
    ]
    fehler = selbsttest_cj_einmal()
    try:
        for fall in faelle:
            name, host, alter, liste1, liste2, liste3, antwort, soll_an, soll_ledger, soll_text, soll_push = fall[:11]
            fall_sku = fall[11] if len(fall) > 11 else "CJ-1234567890123"
            lesungen, angelegt, pushes = [liste1, liste2, liste3], [], []

            def fake_cj(path, body=None, einmal=False):
                if "shopping/order/list" in path:
                    l = lesungen.pop(0) if lesungen else None
                    if l is None:
                        raise AssertionError("CJ-Liste öfter gelesen als erwartet")
                    if l == "FEHLER":
                        return {"code": 1600100, "message": "Testausfall"}
                    return {"code": 200, "data": {"list": [x if isinstance(x, dict) else {"orderNum": x, "cjOrderId": "SDX" + x}
                                                           for x in l]}}
                if "createOrderV2" in path:
                    if not einmal:
                        raise AssertionError("createOrderV2 ohne einmal=True")
                    angelegt.append(body["orderNumber"])
                    if antwort == "UNKLAR":
                        return {"code": UNKLAR, "message": "Testausfall: Antwort verloren"}
                    return {"code": 200, "data": {"orderId": "SDTEST" + body["orderNumber"]}}
                raise AssertionError("unerwarteter CJ-Aufruf im Selbsttest: " + path)

            created = (jetzt - dt.timedelta(minutes=alter)).strftime("%Y-%m-%dT%H:%M:%SZ")
            bestellung = {"name": "#9001", "createdAt": created, "totalPriceSet": {"shopMoney": {"amount": "40.00"}},
                          "shippingAddress": {"name": "Test", "address1": "Weg 1", "city": "Bern", "zip": "3000",
                                              "countryCodeV2": "CH", "phone": "+41 79 000 00 00"},
                          "customer": {}, "lineItems": {"nodes": [{"title": "T", "quantity": 1, "sku": fall_sku,
                                                                    "variantTitle": None}]}}
            ledger = tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt"); ledger.close()
            g.update(cj=fake_cj, offene_bestellungen=lambda: [bestellung], token_pruefen=lambda: True,
                     vid_fuer=lambda sku, vt: ({"vid": "V1", "variantSellPrice": 5}, None),
                     fracht=lambda p, land="CH": [{"logisticName": "CJPacket", "logisticPrice": 6.0, "logisticAging": "6-10"}],
                     LEDGER=ledger.name, DRY=False,
                     _push=lambda schl, titel, text, klick=None, **kw: pushes.append((titel, text, klick)))
            log = io.StringIO()
            try:
                with contextlib.redirect_stdout(log):
                    main(host=host)
            except Exception as ex:          # z. B. CJ-Liste öfter gelesen als erwartet → Fall gilt als FEHL
                log.write(f"\nAUSNAHME {type(ex).__name__}: {ex}")
                angelegt.append("AUSNAHME")
            zeilen = open(ledger.name).read().splitlines()
            os.unlink(ledger.name)
            ist_ledger = None if not zeilen else zeilen[0].split("\t")[1]
            if soll_push is None:
                push_ok = not pushes
            else:
                push_ok = (len(pushes) == 1 and soll_push[0] in pushes[0][0] and bool(pushes[0][2]) == soll_push[1]
                           and (soll_push[1] or "nicht" in pushes[0][1].lower() or "nichts" in pushes[0][0].lower()))
            ok = ((bool(angelegt) == soll_an) and len(angelegt) <= 1 and len(zeilen) <= 1
                  and (ist_ledger is None if soll_ledger is None else (ist_ledger or "").startswith(soll_ledger))
                  and soll_text in log.getvalue() and push_ok)
            fehler += not ok
            print(f"  {'OK  ' if ok else 'FEHL'} {name}: angelegt={angelegt or '—'} Ledger={zeilen or '—'} "
                  f"Push={[(p[0], 'Link' if p[2] else 'ohne Link') for p in pushes] or '—'}")
            if not ok:
                print("       Log: " + log.getvalue().strip().replace("\n", "\n            "))
    finally:
        g.update(alt)
    print("SELBSTTEST", "OK" if not fehler else f"FEHLER ({fehler})")
    return 0 if not fehler else 1


if __name__ == "__main__":
    if SELBSTTEST:
        sys.exit(selbsttest())
    main()
