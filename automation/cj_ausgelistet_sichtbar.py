#!/usr/bin/env python3
"""cj_ausgelistet_sichtbar.py — prüft die SICHTBAR beworbene CJ-Ware erneut darauf, ob CJ sie ausgelistet hat (27.09.2026).

ANLASS #1019: «Leuchtender Halloween-Schaukelgeist» wurde um 21:27 verkauft; CJ lehnte den Auftrag ab («Produkt
entfernt», API 1602002 «removed from shelves»). cj_verfuegbarkeit.py prüft jedes Produkt nur EINMAL (Ledger: 49'097
«schon geprüft») — ein Artikel, der beim Import lieferbar war und später ausgelistet wird, bleibt dort für immer grün.
Dieser Wächter prüft täglich die Kollektionen, die wir gerade bewerben (Startseite, Saison, Social), neu.

Regel: CJ antwortet 1602002 (ausgelistet) → DRAFT + Tags cj-entfernt / cj-entfernt-<datum> (tagsAdd, nie tags: ersetzen —
productUpdate(tags:) löscht alle anderen Tags, eigener Fehler 27.09.). Jede andere Antwort (Netz, Drossel, unklar) = kein Urteil.
Bericht: dropship/CJ-AUSGELISTET-SICHTBAR.md.   DRY=1 meldet nur.
"""
import datetime, json, os, re, subprocess, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from cj_takt import takt  # noqa: E402  (1/s-Drossel, gemeinsam mit allen CJ-Skripten)

SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
KOLLEKTIONEN = ["halloween", "herbst-favoriten", "hype-jetzt", "bestseller", "neu-eingetroffen", "weihnachten-2026"]
BERICHT = os.path.join(REPO, "dropship", "CJ-AUSGELISTET-SICHTBAR.md")
PRO_KOLLEKTION = int(os.environ.get("PRO_KOLLEKTION", "200"))


def stok():
    return (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()


def gql(q, v=None):
    for a in range(5):
        r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                   headers={"X-Shopify-Access-Token": stok(), "Content-Type": "application/json"})
        try:
            j = json.load(urllib.request.urlopen(r, timeout=60))
            if j.get("data"):
                return j["data"]
        except Exception:
            pass
        time.sleep(3 * (a + 1))
    raise SystemExit("Shopify nicht erreichbar")


def cj_status(pid, tok):
    """'weg' (1602002), 'ok' (Produkt geliefert) oder None (kein Urteil)."""
    for a in range(3):
        takt()
        out = subprocess.run(["curl", "-s", "--max-time", "40", "-H", f"CJ-Access-Token: {tok}",
                              f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={pid}"], capture_output=True, text=True).stdout
        try:
            j = json.loads(out)
        except Exception:
            time.sleep(3); continue
        if j.get("code") == 1602002:
            return "weg"
        if j.get("code") in (200, 0) and (j.get("data") or {}).get("pid"):
            return "ok"
        if j.get("code") == 1600200:
            time.sleep(8); continue
        return None
    return None


def main():
    tok = open("/tmp/_cjtok").read().strip() if os.path.exists("/tmp/_cjtok") else ""
    if not tok:
        print("⛔ Kein CJ-Token (/tmp/_cjtok) — KEIN Urteil (kein «0 ausgelistet»)"); sys.exit(2)
    ware = {}
    for h in KOLLEKTIONEN:
        cur = None
        while True:
            d = gql('query($h:String!,$c:String){collectionByHandle(handle:$h){products(first:100,after:$c){pageInfo{hasNextPage endCursor} '
                    'nodes{id handle title status variants(first:1){nodes{sku}}}}}}', {"h": h, "c": cur})
            c = d.get("collectionByHandle")
            if not c:
                break
            for p in c["products"]["nodes"]:
                sku = (p["variants"]["nodes"][0]["sku"] or "") if p["variants"]["nodes"] else ""
                m = re.match(r"^CJ-([0-9A-Za-z-]{6,})$", sku)
                if p["status"] == "ACTIVE" and m:
                    ware[p["id"]] = (m.group(1), p["handle"], p["title"], h)
            if not c["products"]["pageInfo"]["hasNextPage"] or sum(1 for v in ware.values() if v[3] == h) >= PRO_KOLLEKTION:
                break   # nur die ersten PRO_KOLLEKTION (was man sieht); neu-eingetroffen hat Zehntausende
            cur = c["products"]["pageInfo"]["endCursor"]
    print(f"Start | {len(ware)} aktive CJ-Produkte in {len(KOLLEKTIONEN)} beworbenen Kollektionen | DRY={DRY}", flush=True)
    weg, unklar = [], 0
    for gid, (pid, handle, titel, koll) in ware.items():
        s = cj_status(pid, tok)
        if s is None:
            unklar += 1; continue
        if s == "weg":
            weg.append((handle, titel, koll, pid))
            print(f"  ⛔ ausgelistet: {titel[:60]} ({koll}, pid {pid})", flush=True)
            if not DRY:
                heute = datetime.date.today().isoformat()
                gql('mutation($id:ID!){productUpdate(product:{id:$id,status:DRAFT}){userErrors{message}}}', {"id": gid})
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": gid, "t": ["cj-entfernt", f"cj-entfernt-{heute}"]})
    zeit = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    zeilen = [f"# CJ ausgelistet — beworbene Ware (Stand {zeit})", "",
              f"Geprüft: {len(ware)} aktive CJ-Produkte in {', '.join(KOLLEKTIONEN)} · ausgelistet: **{len(weg)}** · kein Urteil: {unklar}",
              "", "| Produkt | Kollektion | CJ-pid |", "|---|---|---|"] + [f"| {t} (`{h}`) | {k} | {p} |" for h, t, k, p in weg]
    if not DRY:
        open(BERICHT, "w", encoding="utf-8").write("\n".join(zeilen) + "\n")
    print(f"FERTIG: {len(ware)} geprüft, {len(weg)} ausgelistet{' (DRY)' if DRY else ' → DRAFT'}, {unklar} ohne Urteil")


if __name__ == "__main__":
    main()
