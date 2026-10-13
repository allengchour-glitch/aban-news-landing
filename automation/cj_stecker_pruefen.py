#!/usr/bin/env python3
"""cj_stecker_pruefen — Netzgeraete mit EINER Shop-Variante gegen CJs Stecker-Varianten halten.

BEFUND (14.09.2026): Die «Golden Rice Dampfglaettbuerste» stand mit EINER Variante «Default
Title» in der Hype-Reihe; CJ fuehrt sie nur als CN / US / UK — es gibt gar keine EU-Version.
Eine Kundin in der Schweiz haette ein Netzgeraet mit einem Stecker bekommen, der in keine
Steckdose passt, und niemand haette es vor dem Auspacken gemerkt. Das ist die Klasse von
Bestellung #1018 (Ladegeraet, vier Steckerversionen, eine Shop-Variante) — nur dass es dort
wenigstens eine EU-Version gab.

WAS DAS WERKZEUG TUT: Kandidaten sind aktive CJ-Produkte mit EINER Variante, deren Titel ein
Netzgeraete-Wort traegt. Je Kandidat EINE CJ-Abfrage (10 Punkte); aus den CJ-Varianten werden
die Steckerkennungen gelesen (CN/US/UK/AU/EU/JP/KR/BR/IN als eigenes Token am Ende von
variantNameEn oder als variantKey).
  - Stecker-Varianten vorhanden, KEINE EU-Version   -> DRAFT + Tag `stecker-unpassend-ch`
  - EU-Version vorhanden, unsere SKU IST die EU-SKU  -> in Ordnung (Quittung)
  - EU-Version vorhanden, unsere SKU ist die PRODUKT-SKU oder eine andere Version
                                                      -> MELDEN (STECKER-UNKLAR.md), nichts schreiben:
    welche Version CJ schickt, ist nicht belegt — eine Titelaussage «EU-Stecker» waere geraten.
  - keine Steckerkennung in den Varianten            -> Quittung `kein-stecker-merkmal`
Es faellt NIE ein Produkt auf Verdacht: ohne CJ-Antwort keine Quittung («nicht erreicht» ist
nicht «hat keinen Stecker», Lehre 20.08.). CJ-Drosselung wird ausgesessen, 16900500 beendet den
Lauf mit PAUSE. Ledger: dropship/_cj_stecker_geprueft.txt.

Nutzung: DRY=1 CAP=40 python3 automation/cj_stecker_pruefen.py
"""
import json, os, re, ssl, sys, time, urllib.request, urllib.error
import os as _os_takt, sys as _sys_takt
_sys_takt.path.insert(0, _os_takt.path.dirname(_os_takt.path.abspath(__file__)))
from cj_takt import takt   # EIN Takt fuer alle CJ-Verbraucher (21.09.)


EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_cj_stecker_geprueft.txt"
BERICHT = "dropship/STECKER-UNKLAR.md"
CAP = int(os.environ.get("CAP", "200"))
DRY = os.environ.get("DRY") == "1"
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
TOK = open("/tmp/cj_shop_token.txt").read().strip()
HEUTE = time.strftime("%Y-%m-%d")

# ⚠️ Nur Geraete, die ans NETZ gehen. USB-Lampen, Diffuser und Powerbanks haben keinen Stecker,
# den man falsch liefern koennte — sie hier mitzunehmen kostet 10 Punkte je Produkt fuer nichts.
MAINS = re.compile(r"Gl[äa]tt(eisen|b[üu]rste)|Lockenstab|Haartrockner|F[öo]hn|Wasserkocher|Kaffeemaschine|"
                   r"Toaster|B[üu]geleisen|Dampfglätt|Dampfreiniger|Heizl[üu]fter|Heizdecke|Heizkissen|"
                   r"Fritteuse|Standmixer|Entsafter|Staubsauger|Netzteil|Ladeger[äa]t|Waffeleisen|"
                   r"Sandwichmaker|Reiskocher|N[äa]hmaschine|L[öo]tkolben|Airfryer|Hei(ss|ß)luft|"
                   r"Kontaktgrill|Eismaschine|Popcornmaschine|Stehlampe|Deckenleuchte|Epilierer|"
                   r"IPL|Haarschneider|Warmluftb[üu]rste|Schallzahnb[üu]rste|"
                   # 13.10.2026 (Gegenpruefung): Lade-/Netzgeraete-Woerter fehlten — «Ladestation», «Charger», «Adapter»,
                   # «Ladegeraet» (ae-Schreibung) kamen nie in den Einzel-Modus (gemessen: 217 ungepruefte Ein-Varianten-Produkte).
                   r"Ladestation|Lade-?st[äa]nder|Ladedock|Ladeschale|Charger|Ladegeraet|Netz-?adapter|"
                   r"Lade-?adapter|Strom-?adapter|Power-?adapter|Adapter", re.I)
NICHT = re.compile(r"Auto-?Ladeger|KFZ|Zigarettenanz|Kabel\b|Ladekabel|Akku-?Staubsauger|Solar|f[üu]rs Auto\b", re.I)
PLUG = {"CN", "US", "UK", "AU", "EU", "JP", "KR", "BR", "IN", "EUPLUG", "USPLUG", "UKPLUG", "AUPLUG"}
NEU_TAGE = int(os.environ.get("NEU_TAGE", "0") or 0)   # >0: zuerst die in den letzten N Tagen angelegten Produkte (Shopify direkt)


def sgql(q, v=None):
    for _ in range(10):
        req = urllib.request.Request(
            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        d = json.loads(urllib.request.urlopen(req, context=CTX).read())
        if d.get("data") is not None:
            return d
        errs = d.get("errors") or []
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in errs):
            ts = d.get("extensions", {}).get("cost", {}).get("throttleStatus", {})
            time.sleep(max(2, (d["extensions"]["cost"].get("requestedQueryCost", 50) - ts.get("currentlyAvailable", 0)) / max(ts.get("restoreRate", 50), 1) + 1))
            continue
        raise RuntimeError(f"Shopify: {errs}")
    raise RuntimeError("Shopify dauerhaft gedrosselt")


def cj_token():
    t = json.load(open("/tmp/cj_token.json"))
    return t.get("accessToken") or t.get("data", {}).get("accessToken")


def cj(url):
    """None = nicht erreicht (KEINE Quittung). dict = Antwort. SystemExit bei Tagesbudget."""
    tk = cj_token()
    for i in range(8):
        takt()                                   # prozessuebergreifend 1 Anfrage/s (cj_takt)
        try:
            d = json.loads(urllib.request.urlopen(
                urllib.request.Request(url, headers={"CJ-Access-Token": tk}), context=CTX, timeout=40).read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + 2 * i); continue
            return None
        except Exception:
            time.sleep(2 + 2 * i); continue
        code = d.get("code")
        if code == 1600200 or "QPS" in str(d.get("message", "")):
            time.sleep(2 + 2 * i); continue
        if code == 16900500:
            time.sleep(45)
            if i >= 4:
                raise SystemExit("PAUSE: CJ-Tagesbudget erschoepft (16900500)")
            continue
        return d
    return None


def cj_url(sku):
    # 09.10.2026: «cj-CJLX2935543» (klein geschrieben) und «CJ-CJJJJTJT22925-default» gaben None — 22 von 812 besuchten
    # Ein-Varianten-Seiten; auswahl_fehlt_messen rief cj(None) achtmal und brach den GANZEN Lauf ab.
    s = re.sub(r"^CJ-", "", (sku or "").strip(), flags=re.I)
    if re.fullmatch(r"\d{10,}", s):
        return f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={s}"
    # CJ-<UUID>: die pid-Form der aelteren Importe (zehntausende Produkte) — vorher als «keine
    # CJ-SKU» uebersprungen, obwohl product/query sie kennt (gemessen 14.09. an der Hype-Reihe).
    if re.fullmatch(r"[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}", s):
        return f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={s}"
    m = re.fullmatch(r"(CJ[A-Z]{2}\d{7,})(\d{2}[A-Z]{2})?", s)
    if m:
        return f"https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku={m.group(1)}"
    if re.fullmatch(r"CJ[A-Z]{2}\d+", s):
        return f"https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku={s[:13]}"
    # Produkt-SKU mit längerem Buchstabenteil («CJJJJTJT22925», «CJSJSJSJ00250»), auch mit Varianten-Anhang («-default»,
    # «-Brown», «-EU plug»): productSku = der Kern (gemessen 09.10.: CJJJJTJT22925 → «Wood grain aroma diffuser», 16 Varianten)
    m = re.fullmatch(r"(CJ[A-Z]{2}\d{7})(?:\d{2}[A-Z]{2})?-.+", s) or re.fullmatch(r"(CJ[A-Z]{3,10}\d{3,})(?:-.+)?", s)
    if m:
        return f"https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku={m.group(1)}"
    return None


def stecker(v):
    """Steckerkennung einer CJ-Variante oder None."""
    key = (v.get("variantKey") or "").strip().upper()
    if key in PLUG:
        return key.replace("PLUG", "")
    name = (v.get("variantNameEn") or "").strip()
    m = re.search(r"\b(CN|US|UK|AU|EU|JP|KR|BR|IN)(?:\s*plug)?\s*$", name, re.I)
    if m:
        return m.group(1).upper()
    m = re.search(r"\b(CN|US|UK|AU|EU|JP|KR|BR|IN)[\s-]*plug\b", name, re.I)
    if m:
        return m.group(1).upper()
    # 13.10.2026: Langform im variantKey («American Standard», «Chinese plug», «National Standard») — NUR im Key, denn
    # variantNameEn beginnt mit dem Produktnamen («65W GaN Charger With US-standard Conversion Plug …»).
    cs = {c for c in stecker_text(key) if c != "UNIVERSAL"}
    if len(cs) == 1:
        c = cs.pop()
        return "EU" if c in EU_GLEICH else c
    return None


def neue_produkte(tage):
    """Aktive Produkte, die in den letzten `tage` Tagen angelegt wurden — direkt aus Shopify (der Export /tmp/export.jsonl
    kann einen Tag alt sein; die Neuimporte sind genau die, die der Waechter nicht verpassen darf)."""
    ab = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - tage * 86400))
    out, cur = [], None
    for _ in range(200):
        d = sgql("""query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor}
                    nodes{id title status}}}""", {"q": f"status:active created_at:>={ab}", "c": cur})["data"]["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    return out


def main():
    fertig = {z.split("\t")[0] for z in open(LEDGER)} if os.path.exists(LEDGER) else set()
    kand, gesehen = [], set()
    def nimm(p):
        t = p.get("title") or ""
        if p.get("status") != "ACTIVE" or not MAINS.search(t) or NICHT.search(t) or REISE.search(t):
            return   # Reiseadapter: der fremde Stecker ist dort der Zweck (13.10.)
        pid = p["id"].split("/")[-1]
        if pid in fertig or pid in gesehen:
            return
        gesehen.add(pid)
        kand.append((pid, t))
    if NEU_TAGE > 0:
        for p in neue_produkte(NEU_TAGE):     # Neuimporte ZUERST — CAP trifft sonst die Altlast vor ihnen
            nimm(p)
        print(f"Neuimporte der letzten {NEU_TAGE} Tage im Kandidatenkreis: {len(kand)}")
    if os.path.exists(EXPORT):
        for ln in open(EXPORT):
            nimm(json.loads(ln))
    else:
        print(f"⚠️ Export {EXPORT} fehlt — nur Neuimporte geprueft")
    print(f"Kandidaten (Titel, aktiv, nicht quittiert): {len(kand)} · CAP {CAP} · DRY {DRY}")
    unklar, gedraftet, ok, ohne, nicht_erreicht, mehrvar = [], [], 0, 0, 0, 0
    geprueft = 0
    fh = None if DRY else open(LEDGER, "a")
    for i in range(0, len(kand), 25):
        if geprueft >= CAP:
            break
        block = kand[i:i + 25]
        q = "{nodes(ids:[%s]){... on Product{id title status tags variantsCount{count} variants(first:1){nodes{sku}}}}}" % ",".join(
            f'"gid://shopify/Product/{p}"' for p, _ in block)
        for n in sgql(q)["data"]["nodes"]:
            if not n or n["status"] != "ACTIVE":
                continue
            if geprueft >= CAP:
                break
            pid = n["id"].split("/")[-1]
            if (n.get("variantsCount") or {}).get("count", 0) != 1:
                mehrvar += 1
                if fh: fh.write(f"{pid}\tmehrere-varianten\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            sku = (n["variants"]["nodes"] or [{}])[0].get("sku") or ""
            url = cj_url(sku)
            if not url:
                if fh: fh.write(f"{pid}\tkeine-cj-sku\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            geprueft += 1
            d = cj(url)
            time.sleep(1.1)   # 1 req/s ueber ALLE Prozesse
            if d is None:
                nicht_erreicht += 1; continue
            if d.get("code") == 1602002:
                # «Product has been removed from shelves» — bei CJ AUSGELISTET, bei uns aktiv: die
                # #1008-Klasse (bezahlt, nie lieferbar). Nebenbefund des ersten Laufs (14.09.: 2 von 50).
                print(f"  ⛔ {pid} {n['title'][:50]} — bei CJ ausgelistet (1602002) → DRAFT cj-abgekuendigt")
                if not DRY:
                    sgql("mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}", {"id": n["id"]})
                    sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": n["id"], "t": ["cj-abgekuendigt"]})
                    fh.write(f"{pid}\tdraft-cj-ausgelistet\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            if d.get("code") != 200:
                if fh: fh.write(f"{pid}\tcj-{d.get('code')}\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            vs = (d.get("data") or {}).get("variants") or []
            st = {}
            for v in vs:
                s = stecker(v)
                if s:
                    st[s] = v.get("variantSku")
            if not st:
                ohne += 1
                if fh: fh.write(f"{pid}\tkein-stecker-merkmal\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            eigene = re.sub(r"^CJ-", "", sku)
            if set(st) == {"EU"}:
                # CJ fuehrt NUR die EU-Version — egal welche SKU wir tragen, es kommt die EU-Version
                ok += 1
                if fh: fh.write(f"{pid}\tnur-eu-version\t{HEUTE}\t{n['title'][:60]}\n")
                continue
            if "EU" not in st:
                print(f"  ⛔ {pid} {n['title'][:50]} — CJ nur {sorted(st)} → DRAFT")
                if not DRY:
                    r = sgql("mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}", {"id": n["id"]})
                    e = r["data"]["productUpdate"]["userErrors"]
                    if e:
                        print("    ⛔ Fehler", e); continue
                    sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}", {"id": n["id"], "t": ["stecker-unpassend-ch"]})
                    fh.write(f"{pid}\tdraft-kein-eu-stecker:{'/'.join(sorted(st))}\t{HEUTE}\t{n['title'][:60]}\n")
                gedraftet.append((pid, n["title"], sorted(st)))
            elif eigene == st["EU"]:
                ok += 1
                if fh: fh.write(f"{pid}\teu-variante-belegt\t{HEUTE}\t{n['title'][:60]}\n")
            else:
                print(f"  ⚠️ {pid} {n['title'][:50]} — CJ {sorted(st)}, unsere SKU {sku} ist nicht die EU-SKU {st['EU']}")
                unklar.append((pid, n["title"], sorted(st), sku, st["EU"]))
                if fh: fh.write(f"{pid}\tunklar-eu-vorhanden:{'/'.join(sorted(st))}\t{HEUTE}\t{n['title'][:60]}\n")
        if fh: fh.flush()
    if fh: fh.close()
    print(f"\ngeprueft {geprueft} · gedraftet {len(gedraftet)} · unklar {len(unklar)} · EU belegt {ok} · "
          f"ohne Steckermerkmal {ohne} · mehrere Varianten {mehrvar} · nicht erreicht {nicht_erreicht}")
    if unklar or gedraftet:
        alt = open(BERICHT).read() if os.path.exists(BERICHT) else ""
        out = [f"# Netzstecker unklar — Stand {HEUTE}\n",
               "CJ fuehrt diese Geraete in mehreren Steckerversionen; unser Shop hat EINE Variante, deren SKU "
               "nicht die EU-Version ist. Welche Version CJ schickt, ist damit nicht belegt. Entscheidung: "
               "Variante auf die EU-SKU umstellen (Betreiber) oder DRAFT.\n"]
        for pid, t, st, sku, eu in unklar:
            out.append(f"- `{pid}` {t[:60]} — CJ {'/'.join(st)} · unsere SKU `{sku}` · EU-SKU `{eu}`")
        if gedraftet:
            out.append("\n## Auf DRAFT (keine EU-Version bei CJ)\n")
            for pid, t, st in gedraftet:
                out.append(f"- `{pid}` {t[:60]} — nur {'/'.join(st)}")
        if alt:
            out.append("\n---\n" + alt)
        if not DRY:
            open(BERICHT, "w").write("\n".join(out) + "\n")
    rest = len(kand) - geprueft
    # 13.10.: «geprueft» zaehlt nur CJ-Abfragen; quittierte Mehr-Varianten/ohne-SKU kosten keinen CAP → Rest nie negativ melden
    print("FERTIG: Klasse durchgeprueft" if geprueft < CAP else f"FORTSETZUNG: noch {max(rest, 1)} Kandidaten")


# ════════════════════════════════════════════════════════════════════════════════════════════════
# MEHR-VARIANTEN-MODUS (13.10.2026, Gegenpruefung B10)
# BEFUND: «3-in-1 Wireless Ladestation» (61 Varianten) stand ACTIVE, ALLE Varianten kaufbar — US 28, AU 9, UK 4, EU 3,
# ohne Kennung 17. Der Einzel-Modus oben ueberspringt jedes Produkt mit mehr als einer Variante («mehrere-varianten»,
# 80 Quittungen) und kannte das Wort «Ladestation» nicht. Eine Kundin in der Schweiz haette ein Netzteil mit US-Stecker
# waehlen koennen (Klasse #1018).
# REGEL (umkehrbar, nichts loeschen):
#   * Stecker je Variante aus Variantentitel + Varianten-SKU (CJ-Key steckt meist in der SKU); fehlt beides, liest der
#     Waechter die CJ-Variante (variantKey/variantNameEn) — EINMAL je Produkt (Ledger, 10 Punkte).
#   * mind. 1 EU-/CH-Variante  → nur die nicht-EU-Varianten sperren: tracked=true, Bestand 0, inventoryPolicy DENY.
#   * keine EU-Variante, alle Varianten mit fremdem Stecker → DRAFT + Tag stecker-unpassend-ch (wie Einzel-Modus).
#   * keine EU-Variante, aber Varianten OHNE Kennung → nur die fremden sperren, die ohne Kennung bleiben (Bericht).
#   * Varianten ohne Kennung, mit Doppelkennung («EU+US») oder Reiseadapter (Zweck: Stecker fuers Ausland) → NIE anfassen.
#   * Jede Sperre landet mit Altwerten im Ledger dropship/_cj_stecker_varianten.tsv → `--rueckweg <pid>` stellt her.
#   * Der Lauf ist zugleich der Waechter: eine gesperrte Variante, die ein anderer Automat wieder kaufbar macht, wird
#     beim naechsten Lauf erneut gesperrt (Kriterium ist availableForSale, nicht das Ledger).
# Nutzung:
#   python3 automation/cj_stecker_pruefen.py --selbsttest
#   python3 automation/cj_stecker_pruefen.py --klasse [TSV]      # nur messen (Bulk-Export), Liste als TSV
#   DRY=1 python3 automation/cj_stecker_pruefen.py --varianten   # Trockenlauf
#   python3 automation/cj_stecker_pruefen.py --varianten [NUR_PID=…]
#   KEIN_DRAFT=1 LISTE=<tsv> …--varianten   # ohne EU: sperren + melden statt DRAFT; LISTE = jede Sperre/jede EU-Variante
#   CAP=150 NEU_TAGE=3 python3 automation/cj_stecker_pruefen.py  # Einzel-Modus, Neuimporte der letzten 3 Tage zuerst
#   python3 automation/cj_stecker_pruefen.py --rueckweg <pid>
# ════════════════════════════════════════════════════════════════════════════════════════════════
VAR_LEDGER = "dropship/_cj_stecker_varianten.tsv"
VAR_CJ_LEDGER = "dropship/_cj_stecker_varianten_cj.txt"
VAR_BERICHT = "dropship/STECKER-VARIANTEN.md"
VAR_CJ_CAP = int(os.environ.get("VAR_CJ_CAP", "40"))
EU_GLEICH = {"EU", "CH", "EURO"}
# Code + Wort «plug/Stecker/standard» (auch zusammengeschrieben: «AUplug»); Codes NUR gross geschrieben («plus», «2 in 1»).
PLUG_FEST = re.compile(r"(?<![A-Za-z])(US|UK|AU|EU|CN|JP|KR|BR|IN|CH|EURO|Euro)[\s_-]*(?i:plug|stecker|standard(?![\s_-]*size))")
# Freistehender Code (gross): «Schwarz UK-Samsung», «Samsung AU», «JP-9W-220to240W» — «USB» faellt durch die Grenze,
# «Silver US Size / 36» (Schuhgroesse, gemessen 13.10. an «Schlichte Sandalen») durch den Groessen-Ausschluss.
PLUG_LOSE = re.compile(r"(?<![A-Za-z0-9])(US|UK|AU|EU|CN|JP|KR|AUS|Cn)(?![A-Za-z0-9])(?![\s_/-]*(?i:size|gr[öo](?:ss|ß)e|gr\.))")
# 13.10.: «White-AUS» (Nageltrockner), «Beige-Cn-1PCS» (Mini-Dampfbuegel), «2GB/32GBUK» (TV-Box, Code an «GB» geklebt)
LOSE_GEKLEBT = re.compile(r"(?<=\dGB)(US|UK|AU|EU)\s*$")
LOSE_NORM = {"AUS": "AU", "Cn": "CN"}
EURO_WORT = re.compile(r"\bEuro-?(?:stecker|plug)\b", re.I)
UNIVERSAL = re.compile(r"\bUniversal-?(?:stecker|plug)\b|\bmulti-?plug\b", re.I)
# ── LANGFORMEN (13.10.2026, Gegenpruefung der Varianten-Sperre) ─────────────────────────────────────────────────────
# GEMESSEN 13.10.: Die Regeln oben kannten nur Kuerzel (US/UK/AU/EU/CN/JP). CJ schreibt den Stecker oft aus, und diese
# Varianten waren LIVE kaufbar: Babyphone «American Standard»/«British Standard»/«Australian Regulations», Retro-Konsole,
# LED-Maske «National Standard» (= chinesische GB-Norm), Luftbefeuchter «Blue flame bead-Chinese plug», Regensystem
# «Miao Si GB Plug»/«English American Standard Plug», Vulkan-Luftbefeuchter «Japanese specifications».
# Regel: Laenderwort + Stecker-Wort DIREKT dahinter (standard/regulations/specifications/gauge/plug/Stecker/Norm/Vorschriften).
# ⚠️ Wortfallen (alle im Bestand gemessen): «C10 Full English Version» / «Englische Version» (Sprache), «Blue-Chinese» /
# «Englisch» allein (Verpackung), «China Red» (Farbe), «French Classic» (Duft), «European Code» / «Euro Size» (Schuhgroesse),
# «Army green-American version» (Radio-Frequenzband), «K3082 English Double Disk» (kein Stecker-Wort → ungeklaert, NIE sperren),
# «64GB Plug and Play». Darum: Sprache/Verpackung zaehlt nie; «… version» nur bei Netzgeraeten und nie fuer Englisch/Chinesisch.
LANG_WORT = (r"American|America|USA|British|Britain|English|England|Australian|Australia|European|Europe|Euro|German|Germany|"
             r"Chinese|China|National|Japanese|Japan|Korean|Korea|Swiss|Switzerland|"
             r"Amerikanisch\w*|Britisch\w*|Englisch\w*|Australisch\w*|Europ[äa]isch\w*|Deutsch\w*|Chinesisch\w*|"
             r"Japanisch\w*|Koreanisch\w*|Schweizer\w*")
PLUG_LANG = re.compile(r"(?<![A-Za-z0-9])((?i:" + LANG_WORT + r")|GB)[\s_-]*"
                       r"(?i:standard(?![\s_-]*(?:size|edition|gr[öo]))|regulations?|specifications?|specs?\b|gauge|"
                       r"plugs?(?![\s_-]*(?:and|&|n)[\s_-]*play)|stecker|norm(?:en)?\b|vorschriften?)")
# Schwach: «US version» / «European version» — nur bei Netzgeraeten (Titel), nie Englisch/Chinesisch (= Sprache).
PLUG_VERSION = re.compile(r"(?<![A-Za-z0-9])((?i:American|USA|British|Australian|European|Euro)|US|UK|AU|EU)[\s_-]*(?i:version)\b")
# Lose Langform am ENDE («Cat Style China», «Blue-USA») — zaehlt wie ein loses Kuerzel nur bei Netzgeraeten.
LOSE_LANG = re.compile(r"(?<![A-Za-z0-9])(USA|China)\s*$")
# Spannung neben dem Code («Suit 9 US 110V», «Netzstecker-220 V US», «Schwarz-Gold-110 V US») = fester Stecker-Beleg.
VOLT = re.compile(r"(?<![A-Za-z0-9])(?:US|UK|AU|EU|CN|JP)[\s_-]*\d{3}\s*V(?![A-Za-z])|"
                  r"(?<![0-9])\d{3}\s*V[\s_-]*(?:US|UK|AU|EU|CN|JP)(?![A-Za-z0-9])")
_LANG_KURZ = {"usa": "US", "gb": "UK", "national": "CN", "china": "CN", "japan": "JP", "korea": "KR"}
_LANG_PRAEFIX = (("americ", "US"), ("amerik", "US"), ("brit", "UK"), ("engl", "UK"), ("austral", "AU"), ("europ", "EU"),
                 ("euro", "EU"), ("german", "EU"), ("deutsch", "EU"), ("chin", "CN"), ("jap", "JP"), ("kor", "KR"),
                 ("swiss", "CH"), ("switz", "CH"), ("schweiz", "CH"))


def lang_code(wort):
    """Laenderwort → Steckercode («American» → US, «National» → CN, «Swiss» → CH, «German» → EU)."""
    w = (wort or "").lower()
    if w in _LANG_KURZ:
        return _LANG_KURZ[w]
    if w in ("us", "uk", "au", "eu"):
        return w.upper()
    for pre, code in _LANG_PRAEFIX:
        if w.startswith(pre):
            return code
    return None


def ist_fest(s):
    """Fester Stecker-Beleg im Text: Code/Langform + Stecker-Wort oder Code neben einer Spannung."""
    s = s or ""
    return bool(PLUG_FEST.search(s) or PLUG_LANG.search(s) or VOLT.search(s))


# Positions-Code fuer die Stecker-ACHSE: Code am Ende («Weiss-US», «Cat AU», «2GB/32GB US») oder am Anfang mit Bindestrich
# («AU-New Blue», «US-Weiss»). Eine Zahl direkt davor («38 / EU», «UK 8») ist eine Groesse, keine Achse.
ACHSE_ENDE = re.compile(r"(?<![A-Za-z0-9])(US|UK|AU|EU|CN|JP|KR|USA|China)\s*$")
ACHSE_ANFANG = re.compile(r"^(US|UK|AU|EU|CN|JP|KR)-(?=[A-Za-z])")


def stecker_achse(varianten):
    """Netzgeraete-Beleg aus der Variantenstruktur (13.10.2026): mindestens zwei VERSCHIEDENE Laendercodes in Steckerposition
    (z. B. «Weiss-US» + «Weiss-EU»). GEMESSEN: 3D-Druckstifte, UV-Nageltrockner 120 W, Waffelmaker, TV-Box, Raumheizer,
    Heizkamm («Cat Style China/UK/AU/US», kein EU) standen als «kein Netzgeraet» kaufbar, weil der Titel kein Geraetewort
    traegt. Kleider («US 2 / US10»), Ringe («US 7»), Schuhe («UK7 / UK 12»), Bettwaesche («US Twin») bilden keine Achse."""
    codes = set()
    for v in varianten:
        for s in (v.get("title") or "", sku_rest(v.get("sku"))):
            s = s.strip()
            m = ACHSE_ENDE.search(s)
            if m and re.search(r"\d\s*[/·,-]?\s*$", s[:m.start()]):
                m = None                         # «38 / EU», «Rot-US 7»: Groesse
            m = m or ACHSE_ANFANG.search(s)
            if m:
                c = {"USA": "US", "China": "CN"}.get(m.group(1), m.group(1))
                codes.add("EU" if c in EU_GLEICH else c)
    return len(codes) >= 2
# Netzgeraete-Woerter fuer FREISTEHENDE Codes (bei «US-Stecker»/«US plug» genuegt der Code selbst).
NETZ_TITEL = re.compile(MAINS.pattern + r"|Ladestation|Lade-?st[äa]nder|Ladedock|Ladepad|Ladeschale|Charger|Adapter|"
                        r"Lampe|Leuchte|(?<![Ss]ch)licht|Projektor|Beamer|Luftbefeuchter|Diffuser|Luftreiniger|Ventilator|Massage|"
                        r"Rasierer|Trimmer|Haarglätter|Netzger|Steckdose|Wireless|Kabellos|Ladegeraet|Netzgeraet|"
                        # 13.10.2026: Geraete, die als «kein Netzgeraet» durchfielen (gemessen, siehe stecker_achse)
                        r"Heiz(?:er|ung|kamm|stab|platte|matte|ger)|Elektrisch|Trockner|Phototherap|Lichttherap|"
                        r"Luftentfeuchter|Dampfb[üu]gel|Saugroboter|Spielkonsole|TV-?Box", re.I)
# Reiseadapter: ein US-/UK-Stecker ist dort der ZWECK (Reise ins Ausland) — nie sperren, nur melden.
REISE = re.compile(r"Reise-?(?:adapter|stecker)|Travel|Weltreise|Steckdosen-?adapter|Stecker-?adapter|Adapter-?stecker|"
                   r"Reisenetzteil|Länderadapter|Laenderadapter", re.I)


def stecker_text(s):
    """Steckercodes in einem Shop-Text (Variantentitel, SKU-Rest) → Menge, z. B. {'US'} oder {'EU','US'}."""
    s = s or ""
    if UNIVERSAL.search(s):
        return {"UNIVERSAL"}
    codes = {m.group(1).upper() for m in PLUG_FEST.finditer(s)} | {LOSE_NORM.get(m.group(1), m.group(1)) for m in PLUG_LOSE.finditer(s)}
    codes |= {m.group(1) for m in LOSE_GEKLEBT.finditer(s)}
    # 13.10.: Langformen («American Standard», «Chinese plug», «GB Plug») + lose Langform am Ende («Cat Style China»)
    codes |= {lang_code(m.group(1)) for m in PLUG_LANG.finditer(s)} | {lang_code(m.group(1)) for m in LOSE_LANG.finditer(s)}
    codes.discard(None)
    if EURO_WORT.search(s):
        codes.add("EURO")
    return {"EU" if c in ("EURO",) else c for c in codes}


def sku_rest(sku):
    """Varianten-Anhang einer SKU ohne «CJ-» und ohne CJ-Produktcode («CJ-CJSJSJSJ00914-Black UK-Samsung» → «Black UK-Samsung»)."""
    s = re.sub(r"^CJ-", "", (sku or "").strip(), flags=re.I)
    s = re.sub(r"^CJ[A-Z]{2,10}\d{3,}(?:\d{2}[A-Z]{2})?", "", s)
    s = re.sub(r"^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}", "", s)
    s = re.sub(r"^\d{10,}", "", s)
    return s.strip(" -_")


def variante_stecker(titel, sku, netz=False):
    """Stecker einer Shop-Variante: 'EU' / fremder Code / 'MEHRFACH' / None (keine Kennung).
    netz=True (Titel ist ein Netzgeraet): zusaetzlich «US version»/«European version» werten (13.10.)."""
    codes = stecker_text(titel) | stecker_text(sku_rest(sku))
    if not codes and netz:
        codes = {lang_code(m.group(1)) for t in (titel or "", sku_rest(sku)) for m in PLUG_VERSION.finditer(t)} - {None}
    if not codes:
        return None
    if "UNIVERSAL" in codes or (len(codes) > 1 and codes & EU_GLEICH):
        return "MEHRFACH"                       # «US+EU»: EU-Stecker liegt bei → passt, nie sperren
    if len(codes) > 1:
        return "/".join(sorted(codes))          # «US/CN»: zwei fremde Stecker → fremd
    c = codes.pop()
    return "EU" if c in EU_GLEICH else c


def produkt_urteil(titel, ptyp, varianten, cj_codes=None):
    """Entscheidung fuer EIN Produkt. varianten: [{id,title,sku,availableForSale,...}].
    cj_codes: {variant_id: code|None} aus der CJ-Abfrage fuer Varianten ohne Shop-Kennung (optional).
    → dict(art=…, sperren=[varianten], eu=[…], fremd=[…], ohne=[…], mehrfach=[…])."""
    cj_codes = cj_codes or {}
    eu, fremd, ohne, mehrfach = [], [], [], []
    hat_fest = False
    text = f"{titel} {ptyp or ''}"
    netz_titel = bool(NETZ_TITEL.search(text))
    for v in varianten:
        st = variante_stecker(v.get("title"), v.get("sku"), netz=netz_titel)
        if st is None and v["id"] in cj_codes and cj_codes[v["id"]]:
            st = cj_codes[v["id"]]
            st = "EU" if st in EU_GLEICH else st
        # Fest-Stecker-Test: Kuerzel + Stecker-Wort, Langform + Stecker-Wort (13.10.) oder Code neben Spannung
        if ist_fest(v.get("title")) or ist_fest(sku_rest(v.get("sku"))):
            hat_fest = True
        (eu if st == "EU" else ohne if st is None else mehrfach if st == "MEHRFACH" else fremd).append((v, st))
    r = {"eu": eu, "fremd": fremd, "ohne": ohne, "mehrfach": mehrfach, "sperren": [], "art": "keine-klasse"}
    if not fremd:
        return r
    if REISE.search(text):
        r["art"] = "reiseadapter-ausgenommen"
        return r
    if not hat_fest and not netz_titel and not stecker_achse(varianten):
        r["art"] = "kein-netzgeraet"           # freistehendes «UK» in einem Nicht-Geraet (z. B. Groesse) → nicht Klasse
        return r
    if NICHT.search(titel or "") and not hat_fest:
        r["art"] = "kein-netzgeraet"
        return r
    offen = [v for v, _ in fremd if v.get("availableForSale")]
    if eu:
        r["art"] = "sperren" if offen else "ok-gesperrt"
        r["sperren"] = offen
    elif not ohne and not mehrfach:
        r["art"] = "draft-kein-eu"
        r["sperren"] = offen
    else:
        r["art"] = "sperren-ohne-eu" if offen else "ok-gesperrt"
        r["sperren"] = offen
    return r


VAR_BULK = """{ products(query:"status:active") { edges { node { id handle title productType status
  variants { edges { node { id title sku availableForSale inventoryPolicy inventoryQuantity inventoryItem { id tracked } } } } } } } }"""


def varianten_export():
    """Alle aktiven Produkte mit Varianten — eigener Bulk (nur die EIGENE ID abfragen, Lehre 07.10.)."""
    d = sgql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id status} userErrors{field message}}}",
             {"q": VAR_BULK})
    ue = d["data"]["bulkOperationRunQuery"]["userErrors"]
    if ue:
        raise RuntimeError("Bulk abgelehnt: " + json.dumps(ue))
    bid = d["data"]["bulkOperationRunQuery"]["bulkOperation"]["id"]
    url = None
    for _ in range(240):
        time.sleep(10)
        c = sgql("query($i:ID!){node(id:$i){... on BulkOperation{status url errorCode objectCount}}}", {"i": bid})["data"]["node"]
        if c["status"] == "COMPLETED":
            url = c["url"]
            break
        if c["status"] in ("FAILED", "CANCELED"):
            raise RuntimeError(f"Bulk {c['status']}: {c.get('errorCode')}")
    if not url:
        raise RuntimeError("Bulk lief in die Zeitgrenze")
    produkte = {}
    with urllib.request.urlopen(urllib.request.Request(url), context=CTX, timeout=600) as fh:
        for z in fh:
            if not z.strip():
                continue
            o = json.loads(z)
            if o.get("__parentId"):
                if o["__parentId"] in produkte:
                    produkte[o["__parentId"]]["variants"].append(o)
            elif o.get("id", "").startswith("gid://shopify/Product/"):
                o["variants"] = []
                produkte[o["id"]] = o
    soll = sgql('{a:productsCount(query:"status:active",limit:null){count}}')["data"]["a"]["count"]
    if len(produkte) < 0.97 * soll:
        raise RuntimeError(f"Export unvollstaendig: {len(produkte)} von {soll} aktiven Produkten — unklar, nichts geschrieben")
    return list(produkte.values())


def _cj_codes_fuer(p, cj_fertig):
    """Varianten ohne Shop-Kennung: CJ-Variante lesen (EINMAL je Produkt). → ({vid: code|None}, notiz)."""
    pid = p["id"].split("/")[-1]
    ohne = [v for v in p["variants"] if variante_stecker(v.get("title"), v.get("sku")) is None]
    if not ohne:
        return {}, ""
    if pid in cj_fertig:                       # schon gelesen → gespeicherte Codes weiterverwenden (kein neuer Abruf)
        return {f"gid://shopify/ProductVariant/{k}": c for k, c in cj_fertig[pid].items()}, "cj-aus-ledger"
    url = None
    for v in p["variants"]:
        url = cj_url(v.get("sku"))
        if url:
            break
    if not url:
        return {}, "keine-cj-sku"
    d = cj(url)
    if d is None or d.get("code") != 200:
        return None, f"cj-{(d or {}).get('code')}"
    vs = (d.get("data") or {}).get("variants") or []
    per_sku = {}
    for cv in vs:
        k = re.sub(r"\s+", "", (cv.get("variantSku") or "")).upper()
        txt = f"{cv.get('variantKey') or ''} {cv.get('variantNameEn') or ''}"
        cs = stecker_text(cv.get("variantKey") or "") or ({stecker(cv)} if stecker(cv) else set())
        if not cs:
            code = None
        elif "UNIVERSAL" in cs or (len(cs) > 1 and cs & EU_GLEICH):
            code = "MEHRFACH"
        else:
            code = "/".join(sorted(cs))
        per_sku[k] = (code, txt)
    out = {}
    for v in ohne:
        k = re.sub(r"\s+", "", re.sub(r"^CJ-", "", v.get("sku") or "", flags=re.I)).upper()
        if k in per_sku:
            out[v["id"]] = per_sku[k][0]
    return out, f"cj-gelesen:{len(vs)}"


def varianten_sperren(p, sperren, grund):
    """tracked=true, Bestand 0, DENY — Altwerte vorher ins Ledger, danach zuruecklesen. → (ok, fehler)."""
    pid = p["id"].split("/")[-1]
    fh = open(VAR_LEDGER, "a")
    for v in sperren:
        fh.write("\t".join([HEUTE, pid, v["id"].split("/")[-1], (v.get("sku") or "").replace("\t", " "),
                            (v.get("title") or "").replace("\t", " "), grund, v.get("inventoryPolicy") or "",
                            str((v.get("inventoryItem") or {}).get("tracked")), str(v.get("inventoryQuantity")),
                            "sperre-geplant"]) + "\n")
    fh.close()
    r = sgql("""mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){
                 userErrors{field message}}}""",
             {"p": p["id"], "v": [{"id": v["id"], "inventoryPolicy": "DENY", "inventoryItem": {"tracked": True}} for v in sperren]})
    ue = r["data"]["productVariantsBulkUpdate"]["userErrors"]
    if ue:
        return False, json.dumps(ue)[:300]
    # Bestand 0 je Lagerort (meist schon 0; nur setzen, wo nicht)
    for v in sperren:
        lv = sgql("""query($i:ID!){productVariant(id:$i){inventoryItem{id inventoryLevels(first:10){nodes{location{id}
                     quantities(names:["available"]){quantity}}}}}}""", {"i": v["id"]})["data"]["productVariant"]["inventoryItem"]
        qs = [{"inventoryItemId": lv["id"], "locationId": n["location"]["id"], "quantity": 0}
              for n in lv["inventoryLevels"]["nodes"] if (n["quantities"][0]["quantity"] or 0) != 0]
        if qs:
            r2 = sgql("""mutation($in:InventorySetQuantitiesInput!){inventorySetQuantities(input:$in){userErrors{field message}}}""",
                      {"in": {"name": "available", "reason": "correction", "ignoreCompareQuantity": True, "quantities": qs}})
            if r2["data"]["inventorySetQuantities"]["userErrors"]:
                return False, json.dumps(r2["data"]["inventorySetQuantities"]["userErrors"])[:300]
    # Zuruecklesen: jede gesperrte Variante muss availableForSale=false sein
    ids = [v["id"] for v in sperren]
    nicht = []
    for i in range(0, len(ids), 50):
        for n in sgql("query($ids:[ID!]!){nodes(ids:$ids){... on ProductVariant{id availableForSale inventoryPolicy "
                      "inventoryQuantity inventoryItem{tracked}}}}", {"ids": ids[i:i + 50]})["data"]["nodes"]:
            if not n or n["availableForSale"] or n["inventoryPolicy"] != "DENY" or not n["inventoryItem"]["tracked"]:
                nicht.append(n and n["id"])
    fh = open(VAR_LEDGER, "a")
    for v in sperren:
        fh.write("\t".join([HEUTE, pid, v["id"].split("/")[-1], (v.get("sku") or "").replace("\t", " "),
                            (v.get("title") or "").replace("\t", " "), grund, "DENY", "True", "0",
                            "ruecklesen-FEHLT" if v["id"] in nicht else "gesperrt-belegt"]) + "\n")
    fh.close()
    return (not nicht), ("" if not nicht else f"{len(nicht)} nicht gesperrt: {nicht[:3]}")


def rueckweg(pid):
    """Stellt die Altwerte (Policy, tracked) aller Varianten eines Produkts aus dem Ledger wieder her."""
    alt = {}
    for z in open(VAR_LEDGER):
        f = z.rstrip("\n").split("\t")
        if len(f) >= 10 and f[1] == pid and f[9] == "sperre-geplant" and f[2] not in alt:
            alt[f[2]] = (f[6], f[7] == "True")
    if not alt:
        print("Kein Ledger-Eintrag fuer", pid); return
    v = [{"id": f"gid://shopify/ProductVariant/{vid}", "inventoryPolicy": pol, "inventoryItem": {"tracked": tr}}
         for vid, (pol, tr) in alt.items()]
    r = sgql("mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}",
             {"p": f"gid://shopify/Product/{pid}", "v": v})
    print("Rueckweg", pid, len(v), "Varianten", r["data"]["productVariantsBulkUpdate"]["userErrors"] or "ok")
    with open(VAR_LEDGER, "a") as fh:
        for vid in alt:
            fh.write("\t".join([HEUTE, pid, vid, "", "", "rueckweg", alt[vid][0], str(alt[vid][1]), "", "zurueckgesetzt"]) + "\n")


def ein_produkt(pid):
    """Ein Produkt im Format des Exports (fuer NUR_PID — ohne den grossen Bulk)."""
    p = sgql("""query($i:ID!){product(id:$i){id handle title productType status variants(first:250){nodes{id title sku
                availableForSale inventoryPolicy inventoryQuantity inventoryItem{id tracked}}}}}""",
             {"i": f"gid://shopify/Product/{pid}"})["data"]["product"]
    if not p or p["status"] != "ACTIVE":
        return []
    p["variants"] = p["variants"]["nodes"]
    return [p]


def varianten_lauf(nur_messen=False, tsv=None):
    nur = os.environ.get("NUR_PID")
    alle = ein_produkt(nur) if nur else varianten_export()
    cj_fertig = {}
    if os.path.exists(VAR_CJ_LEDGER):
        for z in open(VAR_CJ_LEDGER):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 4 and f[1].startswith("cj-gelesen"):
                try:
                    cj_fertig[f[0]] = json.loads(f[3])
                except ValueError:
                    pass
    zeilen, zaehl, cj_n = [], {}, 0
    gesperrt_v, gedraftet, fehler = 0, [], []
    # 13.10.2026 (Betreiber-Auftrag): KEIN_DRAFT=1 → Produkte ohne EU-Version nicht draften, sondern die fremden Varianten
    # sperren und das Produkt MELDEN (Liste «ohne kaufbare Variante»). LISTE=<datei> schreibt jede Sperre + jede bleibende
    # EU-Variante einzeln (Pruefliste fuer den Trockenlauf: jede Sperre muss einen fremden Stecker tragen).
    kein_draft = os.environ.get("KEIN_DRAFT") == "1"
    liste, ohne_kaufbar = [], []
    for p in alle:
        if len(p["variants"]) < 2:
            continue
        vor = produkt_urteil(p["title"], p.get("productType"), p["variants"])
        if vor["art"] in ("keine-klasse", "kein-netzgeraet"):
            continue
        cj_codes, notiz = {}, ""
        pid = p["id"].split("/")[-1]
        if vor["ohne"] and pid in cj_fertig:
            cj_codes, notiz = _cj_codes_fuer(p, cj_fertig)
        elif vor["ohne"] and not nur_messen and cj_n < VAR_CJ_CAP:
            cj_n += 1
            cj_codes, notiz = _cj_codes_fuer(p, cj_fertig)
            if cj_codes is None:
                cj_codes = {}               # CJ nicht erreicht: KEINE Quittung, naechster Lauf fragt erneut
            elif not DRY and notiz.startswith("cj-gelesen"):
                with open(VAR_CJ_LEDGER, "a") as fh:
                    fh.write(f"{pid}\t{notiz}\t{HEUTE}\t{json.dumps({k.split('/')[-1]: c for k, c in cj_codes.items()})}\n")
        u = produkt_urteil(p["title"], p.get("productType"), p["variants"], cj_codes)
        zaehl[u["art"]] = zaehl.get(u["art"], 0) + 1
        def cnt(lst):
            out = {}
            for _, st in lst:
                out[st] = out.get(st, 0) + 1
            return ",".join(f"{k}:{n}" for k, n in sorted(out.items()))
        zeilen.append([p["id"].split("/")[-1], p.get("handle") or "", p["title"][:70], p.get("productType") or "", u["art"],
                       str(len(p["variants"])), str(len(u["eu"])), cnt(u["fremd"]), str(len(u["ohne"])), str(len(u["mehrfach"])),
                       str(len(u["sperren"])), notiz])
        if nur_messen or not u["sperren"]:
            continue
        gesp = {v["id"] for v in u["sperren"]}
        for v, st in u["fremd"]:
            if v["id"] in gesp:
                liste.append([p["id"].split("/")[-1], v["id"].split("/")[-1], "SPERREN", st, v.get("title") or "", v.get("sku") or "", p["title"][:60]])
        for v, st in u["eu"] + u["mehrfach"]:
            liste.append([p["id"].split("/")[-1], v["id"].split("/")[-1], "BLEIBT", st, v.get("title") or "", v.get("sku") or "", p["title"][:60]])
        rest = [v for v in p["variants"] if v.get("availableForSale") and v["id"] not in gesp]
        if not rest:
            ohne_kaufbar.append((p["id"].split("/")[-1], p["title"], u["art"]))
        if u["art"] == "draft-kein-eu" and kein_draft:
            print(f"  🔒⚠️ {p['title'][:55]} — nur fremde Stecker {cnt(u['fremd'])} → sperren statt DRAFT (KEIN_DRAFT), melden")
            u["art"] = "kein-eu-gesperrt"
        if u["art"] == "draft-kein-eu":
            print(f"  ⛔ {p['title'][:55]} — nur fremde Stecker {cnt(u['fremd'])} → DRAFT")
            if not DRY:
                r = sgql("mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}", {"id": p["id"]})
                if r["data"]["productUpdate"]["userErrors"]:
                    fehler.append((p["id"], r["data"]["productUpdate"]["userErrors"])); continue
                sgql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                     {"id": p["id"], "t": ["stecker-unpassend-ch"]})
                with open(VAR_LEDGER, "a") as fh:
                    fh.write("\t".join([HEUTE, p["id"].split("/")[-1], "", "", p["title"][:60], "draft-kein-eu", "", "", "",
                                        "draft"]) + "\n")
            gedraftet.append(p)
            continue
        print(f"  🔒 {p['title'][:55]} — {len(u['sperren'])} fremde Varianten sperren (EU {len(u['eu'])}, ohne Kennung {len(u['ohne'])})")
        if DRY:
            gesperrt_v += len(u["sperren"]); continue
        ok, err = varianten_sperren(p, u["sperren"], u["art"])
        if ok:
            gesperrt_v += len(u["sperren"])
        else:
            fehler.append((p["id"], err))
    kopf = ["pid", "handle", "titel", "typ", "urteil", "varianten", "eu", "fremd_kaufbar_oder_nicht", "ohne_kennung",
            "mehrfach", "zu_sperren_kaufbar", "cj"]
    if tsv:
        with open(tsv, "w") as fh:
            fh.write("\t".join(kopf) + "\n")
            for z in zeilen:
                fh.write("\t".join(c.replace("\t", " ") for c in z) + "\n")
    offen = sum(int(z[10]) for z in zeilen)
    print(f"\nKlasse (aktiv, ≥2 Varianten, fremder Stecker): {len(zeilen)} Produkte · {zaehl}")
    print(f"kaufbare fremde Varianten vor dem Lauf: {offen} · {'(DRY) ' if DRY else ''}gesperrt {gesperrt_v} · "
          f"gedraftet {len(gedraftet)} · CJ-Abfragen {cj_n} · Fehler {len(fehler)}")
    for f in fehler[:10]:
        print("   ⛔", f)
    if ohne_kaufbar:
        print(f"\nOHNE kaufbare Variante nach diesem Lauf ({len(ohne_kaufbar)}) — {'nicht gedraftet, nur gemeldet' if kein_draft else 'gedraftet'}:")
        for pid, t, art in ohne_kaufbar:
            print(f"   ⚠️ {pid} {t[:60]} ({art})")
    if os.environ.get("LISTE"):
        with open(os.environ["LISTE"], "w") as fh:
            fh.write("pid\tvid\taktion\tstecker\tvariante\tsku\tprodukt\n")
            for z in liste:
                fh.write("\t".join(str(c).replace("\t", " ") for c in z) + "\n")
    if not nur_messen and not DRY:
        b = [f"# Netzstecker je Variante — Stand {HEUTE}\n",
             "Waechter `automation/cj_stecker_pruefen.py --varianten` (taeglich im Aufseher). Klasse: aktive Produkte mit "
             "≥ 2 Varianten, von denen mindestens eine einen fremden Stecker (US/UK/AU/CN/JP …) traegt.\n",
             f"- Produkte in der Klasse: **{len(zeilen)}** · Urteile: {zaehl}",
             f"- in diesem Lauf gesperrt: **{gesperrt_v}** Varianten · gedraftet: **{len(gedraftet)}** · Fehler: {len(fehler)}",
             "- Varianten OHNE Steckerkennung werden nie angefasst (welche Version CJ schickt, ist nicht belegt).",
             "- Rueckweg je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (Ledger `dropship/_cj_stecker_varianten.tsv`).\n",
             "| Produkt | Urteil | EU | fremd | ohne Kennung |", "|---|---|---|---|---|"]
        for z in sorted(zeilen, key=lambda z: z[4]):
            b.append(f"| `{z[0]}` {z[2][:50]} | {z[4]} | {z[6]} | {z[7]} | {z[8]} |")
        if ohne_kaufbar:
            b.append(f"\n## Ohne kaufbare Variante nach diesem Lauf ({len(ohne_kaufbar)})\n")
            b += [f"- `{pid}` {t[:60]} ({art})" for pid, t, art in ohne_kaufbar]
        open(VAR_BERICHT, "w").write("\n".join(b) + "\n")
    print("FERTIG: Varianten-Klasse gemessen" if nur_messen else "FERTIG: Varianten-Lauf")


def selbsttest():
    ok = True
    def t(name, ist, soll):
        nonlocal ok
        good = ist == soll
        ok &= good
        print(("✅" if good else "❌"), name, "→", ist, "" if good else f"(soll {soll})")
    # Kanarien aus der Ladestation (13.10.) + Fallen
    t("EU-Stecker", variante_stecker("Schwarz-Apple EU-Stecker", "CJ-CJSJSJSJ00914-Black-Apple EU plug"), "EU")
    t("AUplug zusammen", variante_stecker("Black 3pcs-Apple AUplug", "CJ-CJSJSJSJ00914-Black 3pcs-Apple AUplug"), "AU")
    t("UK mitten", variante_stecker("Schwarz UK-Samsung", "CJ-CJSJSJSJ00914-Black UK-Samsung"), "UK")
    t("AU am Ende", variante_stecker("Schwarz · 3 Stück-Samsung AU", "CJ-CJSJSJSJ00914-Black 3pcs-Samsung AU"), "AU")
    t("US-Stecker Set", variante_stecker("Weiss Set 1-Apple US-Stecker", "CJ-CJSJSJSJ00914-White Set1-Apple US plug"), "US")
    t("ohne Kennung", variante_stecker("Schwarz-Apple", "CJ-CJSJSJSJ00914-Black-Apple"), None)
    t("ohne Kennung 2 Stück", variante_stecker("Weiss-Apple · 2 Stück", "CJ-CJSJSJSJ00914-White-Apple2pc"), None)
    t("USB ist kein US", variante_stecker("USB-Kabel Schwarz", "CJ-CJXX1234567-USB Black"), None)
    t("plus ist kein US", variante_stecker("Plus Schwarz", "CJ-CJXX1234567-plus"), None)
    t("2 in 1 ist kein IN", variante_stecker("2 in 1 plug", "CJ-CJXX1234567"), None)
    t("Doppelkennung", variante_stecker("EU+US Stecker", ""), "MEHRFACH")
    t("CH-Stecker = EU", variante_stecker("Weiss CH-Stecker", ""), "EU")
    t("Euro-Stecker = EU", variante_stecker("Schwarz Euro-Stecker", ""), "EU")
    t("Universalstecker", variante_stecker("Universal-Stecker", ""), "MEHRFACH")
    t("CJ-Produktcode ohne Treffer", variante_stecker("Default Title", "CJ-CJUS1234567"), None)
    t("UUID-SKU", variante_stecker("Rot", "CJ-ACD5F972-439D-41E3-B2F2-6071439B0C4E"), None)
    t("Schuko/UK-Netzteil", variante_stecker("UK plug", ""), "UK")
    t("Schuhgroesse «US Size» ist kein Stecker", variante_stecker("Silver US Size / 36", "CJ-CJYD243792601AZ"), None)
    t("US/CN = fremd (nicht Doppel mit EU)", variante_stecker("White-US/CN", "CJ-CJSJ275589401AZ"), "CN/US")
    t("US+EU = Doppel mit EU", variante_stecker("Weiss-US+EU", "CJ-CJSJ275589402BY"), "MEHRFACH")
    t("JP-Stecker Naehmaschine", variante_stecker("JP-9W-220to240W", "CJ-CJYD238041404DW"), "JP")
    t("US Standard (Stecker)", variante_stecker("K3082 US Standard Double Plate", "CJ-CJYD214378210JQ"), "US")
    t("USB plug in version", variante_stecker("Black-USB plug in version", "CJ-CJJT138669301AZ"), None)

    def V(i, title, sku="", afs=True):
        return {"id": f"gid://shopify/ProductVariant/{i}", "title": title, "sku": sku, "availableForSale": afs}
    u = produkt_urteil("3-in-1 Wireless Ladestation", "Elektronik",
                       [V(1, "Schwarz-Apple EU-Stecker"), V(2, "Schwarz-Apple US-Stecker"), V(3, "Schwarz-Apple"),
                        V(4, "Black-Apple AUplug"), V(5, "Weiss UK-Apple", afs=False)])
    t("Ladestation: Urteil", u["art"], "sperren")
    t("Ladestation: sperrt nur US+AU (UK schon zu)", sorted(v["id"][-1] for v in u["sperren"]), ["2", "4"])
    t("Ladestation: EU bleibt", [v["id"][-1] for v, _ in u["eu"]], ["1"])
    t("Ladestation: ohne Kennung unberuehrt", [v["id"][-1] for v, _ in u["ohne"]], ["3"])
    u = produkt_urteil("Haartrockner Ionen", "", [V(1, "Schwarz US-Stecker"), V(2, "Weiss UK-Stecker")])
    t("nur fremde Stecker → DRAFT", u["art"], "draft-kein-eu")
    u = produkt_urteil("Haartrockner Ionen", "", [V(1, "Schwarz US-Stecker"), V(2, "Weiss")])
    t("fremd + ohne Kennung, kein EU → nur sperren", (u["art"], [v["id"][-1] for v in u["sperren"]]), ("sperren-ohne-eu", ["1"]))
    u = produkt_urteil("Reiseadapter Weltweit", "Adapter", [V(1, "US-Stecker"), V(2, "EU-Stecker")])
    t("Reiseadapter ausgenommen", u["art"], "reiseadapter-ausgenommen")
    u = produkt_urteil("Schlichte Sandalen", "Damenschuhe", [V(1, "Silver US Size / 36"), V(2, "Golden Size / 36"),
                                                               V(3, "Silver UK / 37")])
    t("«Schlichte» ist kein «Licht»", u["art"], "kein-netzgeraet")
    u = produkt_urteil("Sommerkleid Blumen", "Kleid", [V(1, "UK 8"), V(2, "UK 10")])
    t("Kleid «UK 8» keine Klasse", u["art"], "kein-netzgeraet")
    u = produkt_urteil("Ladegeraet 20W", "", [V(1, "EU-Stecker"), V(2, "US-Stecker", afs=False)])
    t("schon gesperrt → ok", (u["art"], u["sperren"]), ("ok-gesperrt", []))
    u = produkt_urteil("Ladegeraet 20W", "", [V(1, "Schwarz"), V(2, "Weiss"), V(3, "Rot UK-Stecker")],
                       {"gid://shopify/ProductVariant/2": "US"})
    t("CJ-Kennung fuer Variante ohne Shop-Kennung", (u["art"], sorted(v["id"][-1] for v in u["sperren"])), ("sperren-ohne-eu", ["2", "3"]))
    u = produkt_urteil("Ladegeraet 20W", "", [V(1, "Schwarz"), V(2, "Weiss")])
    t("ohne jede Kennung keine Klasse (keine CJ-Abfrage)", u["art"], "keine-klasse")

    # ── Langformen (13.10.2026) — alle Texte live im Bestand gemessen ──
    t("L American Standard", variante_stecker("American Standard", "CJ-CJYD219271802BY"), "US")
    t("L British Standard-1PCS", variante_stecker("British Standard-1PCS", "CJ-CJYD212305603CX"), "UK")
    t("L Australian Regulations", variante_stecker("Australian Regulations-White", "CJ-CJYD247388804DW"), "AU")
    t("L National Standard = CN", variante_stecker("National Standard-White", "CJ-CJYD247388803CX"), "CN")
    t("L Chinese plug", variante_stecker("Blue flame bead-Chinese plug", "CJ-CJJT154703028BY"), "CN")
    t("L Japanese specifications", variante_stecker("V21a white-Japanese specifications", "CJ-CJJT161379105EV"), "JP")
    t("L GB Plug", variante_stecker("Miao Si GB Plug", "CJ-CJYD224110401AZ"), "UK")
    t("L Englisch GB Stecker", variante_stecker("Englisch GB Stecker", "CJ-CJYD224110404DW"), "UK")
    t("L English American Standard Plug", variante_stecker("English American Standard Plug", "CJ-CJYD224110405EV"), "US")
    t("L English European Standard Plug = EU", variante_stecker("English European Standard Plug", "CJ-CJYD224110406FU"), "EU")
    t("L European Standard = EU", variante_stecker("Wood Grain White-European Standard", "CJ-CJJT188575002BY"), "EU")
    t("L Swiss plug = EU (passt)", variante_stecker("Weiss Swiss plug", ""), "EU")
    t("L Schweizer Stecker = EU (passt)", variante_stecker("Schweizer Stecker", ""), "EU")
    t("L American gauge", variante_stecker("Black American gauge", ""), "US")
    t("L US-standard + EU = Doppel", variante_stecker("American Standard + European Standard", ""), "MEHRFACH")
    t("L lose «Cat Style China»", variante_stecker("Cat Style China", "CJ-CJJF223947301AZ"), "CN")
    t("L lose «Blue-USA»", variante_stecker("Blue-USA", "CJ-CJJSBGSD00004-Blue-USA"), "US")
    t("L lose «White-AUS»", variante_stecker("White-AUS", "CJ-CJZJ25718660003"), "AU")
    t("L lose «Beige-Cn-1PCS»", variante_stecker("Beige-Cn-1PCS", "CJ-CJYD194254025YB"), "CN")
    t("L geklebt «2GB/32GBUK»", variante_stecker("2GB/32GBUK", "CJ-CJYD204139303CX"), "UK")
    # Wortfallen: Sprache / Verpackung / Farbe / Groesse sind KEIN Stecker
    t("F «C10 Full English Version» (Sprache)", variante_stecker("C10 Full English Version", "CJ-CJYD254751502BY", netz=True), None)
    t("F «C10 Full Chinese Version» (Sprache)", variante_stecker("C10 Full Chinese Version", "CJ-CJYD254751501AZ", netz=True), None)
    t("F «Englische Version»", variante_stecker("Englische Version", ""), None)
    t("F «Blau-Englisch» (Verpackung)", variante_stecker("Blau-Englisch", "CJ-CJBJMRDD00195-Blue-English"), None)
    t("F «Blue-Chinese»", variante_stecker("Blue-Chinese", "CJ-CJBJMRDD00195-Blue-Chinese"), None)
    t("F «English Manual-Black-1PC»", variante_stecker("English Manual-Black-1PC", ""), None)
    t("F «K3082 English Double Disk» ungeklaert", variante_stecker("K3082 English Double Disk", "CJ-CJYD214378209IR"), None)
    t("F «China Red» Farbe", variante_stecker("China Red-38mm40mm41mm", ""), None)
    t("F «French Classic» Duft", variante_stecker("Citrus-Best wishes-French Classic", ""), None)
    t("F «European Code» Schuhgroesse", variante_stecker("Black-36 European Code", ""), None)
    t("F «European Standard Size»", variante_stecker("European Standard Size / 38", ""), None)
    t("F «64GB Plug and Play»", variante_stecker("USB Stick 64GB Plug and Play", ""), None)
    t("F «Whiteset-German» ohne Stecker-Wort", variante_stecker("Whiteset-German", ""), None)
    t("F «American version» ohne Netzgeraet", variante_stecker("Army green-American version 4000 mah", ""), None)
    t("S «American version» bei Netzgeraet", variante_stecker("Army green-American version 4000 mah", "", netz=True), "US")
    t("Spannung «Suit 9 US 110V» fest", ist_fest("Suit 9 US 110V"), True)
    t("Spannung «Schwarz-Gold-110 V US» fest", ist_fest("Schwarz-Gold-110 V US"), True)
    t("«Rot 220V» kein Stecker-Beleg", ist_fest("Rot 220V"), False)
    t("Achse 3D-Stift USA/UK/EU", stecker_achse([V(1, "Blue-USA"), V(2, "Weiss-UK"), V(3, "Weiss-EU")]), True)
    t("Achse Anfang «AU-New Blue»/«EU-New Blue»", stecker_achse([V(1, "AU-New Blue Waist"), V(2, "EU-New Blue Waist")]), True)
    t("keine Achse: Kleid «US 2 / US10»", stecker_achse([V(1, "Marineblau-US 2 / US10"), V(2, "Marineblau-UK 4 / US10")]), False)
    t("keine Achse: Schuh «38 / EU», «7 / US»", stecker_achse([V(1, "38 / EU"), V(2, "7 / US")]), False)
    t("keine Achse: «US-4G-3 Million»", stecker_achse([V(1, "US-4G-3 Million"), V(2, "EU-4G-3 Million")]), False)
    u = produkt_urteil("Babyphone mit HD-Kamera und App-Zugriff", "Gadget",
                       [V(1, "European Standard"), V(2, "American Standard"), V(3, "British Standard"), V(4, "Australian Regulations")])
    t("Babyphone: EU bleibt, US/UK/AU sperren", (u["art"], sorted(v["id"][-1] for v in u["sperren"])), ("sperren", ["2", "3", "4"]))
    u = produkt_urteil("Festplatten-Dockingstation mit Klonfunktion", "Gadget",
                       [V(1, "K3082 Euro Double Disk Reading"), V(2, "K3082 English Double Disk"), V(3, "K3082 US Standard Double Plate")])
    t("Dockingstation: nur US Standard, «English Double Disk» bleibt", (u["art"], [v["id"][-1] for v in u["sperren"]],
                                                                       [v["id"][-1] for v, _ in u["ohne"]]), ("sperren-ohne-eu", ["3"], ["1", "2"]))
    u = produkt_urteil("Elektrischer Heizkamm für vielseitiges Styling", "Beauty-Tools",
                       [V(1, "Cat Style China"), V(2, "Cat Style UK"), V(3, "Cat AU"), V(4, "Cat US")])
    t("Heizkamm CN/UK/AU/US ohne EU → draft-kein-eu", (u["art"], len(u["sperren"])), ("draft-kein-eu", 4))
    u = produkt_urteil("3D Mal- und Graffiti-Stift", "3D-Druck", [V(1, "Blue-USA"), V(2, "Grün-EU"), V(3, "Weiss-UK")])
    t("3D-Stift ueber die Achse (Titel ohne Geraetewort)", (u["art"], sorted(v["id"][-1] for v in u["sperren"])), ("sperren", ["1", "3"]))
    u = produkt_urteil("Notfallradio mit Solar- und Handkurbel", "Elektronik",
                       [V(1, "Army green-American version 4000 mah"), V(2, "Army green-European version 4000 mah")])
    t("Radio-Frequenzband «American version» keine Klasse", u["art"], "keine-klasse")
    u = produkt_urteil("Silikon-Schalldusche fürs Gesicht", "Beauty-Tools", [V(1, "Blau-Englisch"), V(2, "Blue-Chinese")])
    t("Verpackungssprache keine Klasse", u["art"], "keine-klasse")
    u = produkt_urteil("Elegantes Abendkleid mit Rüschen", "Damenmode", [V(1, "Schwarz-US 6 / US10"), V(2, "Schwarz-US 8 / US10")])
    t("Kleid «US 6 / US10» kein Netzgeraet", u["art"], "kein-netzgeraet")
    # Einzel-Modus: neue Netzgeraete-Woerter (13.10.) + CJ-Key-Langform
    t("MAINS Ladestation", bool(MAINS.search("3-in-1 Desktop Wireless Ladestation")), True)
    t("MAINS Charger", bool(MAINS.search("Qi 15W Fast Wireless Charger")), True)
    t("MAINS Ladegeraet (ae)", bool(MAINS.search("Magnetischer 4-in-1-Ladegeraet")), True)
    t("MAINS Ladeadapter", bool(MAINS.search("65W USB-C PD Laptop Ladeadapter")), True)
    t("MAINS Stromadapter", bool(MAINS.search("Stromadapter mit Ladefunktion")), True)
    t("MAINS Netzteil", bool(MAINS.search("Universal Netzteil 12V")), True)
    t("NICHT Auto-Ladeadapter", bool(NICHT.search("4-in-1 USB-Schnellladeadapter fürs Auto")), True)
    t("REISE Reiseadapter bleibt draussen", bool(REISE.search("Universal Reiseadapter Weltweit")), True)
    t("CJ-Key «American Standard»", stecker({"variantKey": "American Standard", "variantNameEn": "Baby Monitor American Standard"}), "US")
    t("CJ-Key «Swiss plug» = EU", stecker({"variantKey": "Swiss plug", "variantNameEn": ""}), "EU")
    t("CJ-Key «K3082 English Double Disk» ungeklaert", stecker({"variantKey": "K3082 English Double Disk",
                                                              "variantNameEn": "Hard Disk Dock K3082 English Double Disk"}), None)
    t("CJ-Name mit Produkt-«US-standard» zaehlt nicht", stecker({"variantKey": "White-Model A",
                                                                "variantNameEn": "65W GaN Charger With US-standard Conversion Plug White-Model A"}), None)
    print("SELBSTTEST", "OK" if ok else "FEHLER")
    return ok


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    elif "--rueckweg" in sys.argv:
        rueckweg(sys.argv[sys.argv.index("--rueckweg") + 1])
    elif "--klasse" in sys.argv:
        i = sys.argv.index("--klasse")
        varianten_lauf(nur_messen=True, tsv=sys.argv[i + 1] if len(sys.argv) > i + 1 else None)
    elif "--varianten" in sys.argv:
        if not selbsttest():
            raise SystemExit("Selbsttest rot — kein Lauf")
        varianten_lauf(nur_messen=False, tsv=os.environ.get("TSV"))
    else:
        main()
