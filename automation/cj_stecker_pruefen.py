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
                   r"IPL|Haarschneider|Warmluftb[üu]rste|Schallzahnb[üu]rste", re.I)
NICHT = re.compile(r"Auto-?Ladeger|KFZ|Zigarettenanz|Kabel\b|Ladekabel|Akku-?Staubsauger|Solar", re.I)
PLUG = {"CN", "US", "UK", "AU", "EU", "JP", "KR", "BR", "IN", "EUPLUG", "USPLUG", "UKPLUG", "AUPLUG"}


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
    s = re.sub(r"^CJ-", "", sku or "")
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
    return m.group(1).upper() if m else None


def main():
    fertig = {z.split("\t")[0] for z in open(LEDGER)} if os.path.exists(LEDGER) else set()
    kand = []
    for ln in open(EXPORT):
        p = json.loads(ln)
        if p.get("status") != "ACTIVE" or not MAINS.search(p["title"]) or NICHT.search(p["title"]):
            continue
        pid = p["id"].split("/")[-1]
        if pid in fertig:
            continue
        kand.append((pid, p["title"]))
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
    print("FERTIG: Klasse durchgeprueft" if rest <= 0 and geprueft < CAP else f"FORTSETZUNG: noch {rest} Kandidaten")


if __name__ == "__main__":
    main()
