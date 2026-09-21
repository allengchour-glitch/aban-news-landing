#!/usr/bin/env python3
"""Schliesst die Lücke im Google-Kanal — dem einzigen Kanal mit belegten Verkäufen.

Gemessen 16.09.2026: 2'497 aktive Produkte lagen NICHT im Google-Kanal. Davon sind
~1'600 Kostüme (bewusst draussen, Merchant-Kontosperre-Risiko) und 7 Klingen
(korrekt). Übrig: 890 ohne erkennbaren Grund — das ist Gratis-Reichweite, die
brachliegt.

⚠️ ZWEI UNABHÄNGIGE PRÜFUNGEN, weil ein Tag fehlen kann:
  1. Tags (was der Katalog über das Produkt sagt)
  2. TITEL (was draufsteht) — fängt Ware, der ein Tag fehlt

⚠️ WORTGRENZEN SIND PFLICHT (Hausregel 9b, hier zum x-ten Mal teuer bestätigt):
   «Unisex» enthält *sex*, «Aromatherapie» enthält *therapie*. Eine Regel ohne
   Grenzen hätte saubere Sonnenbrillen und Auto-Diffuser aussortiert.

Im Zweifel DRAUSSEN: ein bisschen weniger Reichweite kostet fast nichts,
eine Merchant-Sperre kostet den einzigen Kanal, der verkauft.

Aufruf:  python3 automation/google_kanal_luecke.py          # Trockenlauf
         WRITE=1 python3 automation/google_kanal_luecke.py  # publiziert
"""
import json, os, re, sys, time, urllib.request, urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
GOOGLE_PUB = "gid://shopify/Publication/302872297857"
WRITE = os.environ.get("WRITE") == "1"

# --- Risiko-Muster ------------------------------------------------------------
# ⚠️ DEUTSCHE ZUSAMMENSETZUNGEN TRAGEN DAS GRUNDWORT HINTEN. «Hexenkostüm»,
#    «Kräutertabak», «Taschenmesser» — ein führendes \b findet keines davon.
#    Deshalb: erlaubte Buchstaben VOR dem Grundwort, harte Grenze DAHINTER.
#    Die Grenze dahinter ist das, was «Beilagenschale» (Beil+agen) und
#    «Hanfseil» rettet.
# ⚠️ Umgekehrt braucht «sex» eine Sperre NACH VORNE, sonst trifft es «Unisex».
W = r"[\wäöüßÄÖÜ]"          # Wortzeichen inkl. Umlaute
def _hinten(*stämme):
    """Grundwort darf am ENDE einer Zusammensetzung stehen."""
    return r"(?:%s)*(?:%s)(?!%s)" % (W, "|".join(stämme), W)

RISIKO = [
    ("Tabak/Rauchen",   _hinten(r"tabak\w*", r"shisha\w*", r"grinder", r"bong", r"vape\w*",
                                r"zigarette\w*", r"wasserpfeife\w*", r"pfeifenkopf")
                        + r"|(?<!%s)(?:cbd|joint|e-zigarette\w*)(?!%s)" % (W, W)),
    ("Heilversprechen", r"(?:licht|photo|foto|laser|magnet|elektro|physio|akupunktur|infrarot)"
                        r"therapie" + r"|(?<!%s)(?:therapieger[äa]t\w*|heilt|medizinprodukt\w*|"
                        r"heilung)(?!%s)" % (W, W)),
    ("Erotik",          r"(?<!%s)(?:sex\w*|erotik\w*|dessous|vibrator\w*|fetisch\w*|"
                        r"bondage|strapon)(?!%s)" % (W, W)),
    ("Kostüm",          _hinten(r"kost[üu]m\w*") + r"|(?<!%s)(?:faschings?\w*|karnevals?\w*|"
                        r"cosplay\w*)(?!%s)" % (W, W)),
    ("Refurb/Replik",   r"(?<!%s)(?:refurbished|generalüberholt|restauriert|replik\w*|"
                        r"nachbildung\w*|f[äa]lschung\w*)(?!%s)" % (W, W)),
]
RISIKO = [(n, re.compile(p, re.I)) for n, p in RISIKO]

# Klingen NICHT neu erfinden — die Hausregel ist seit dem 16.09. gehärtet und
# getestet (automation/handklingenregel_test.py). Eine zweite Kopie liefe
# auseinander.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klingenregel import ist_klinge  # noqa: E402

TAG_RISIKO = ("kostuem", "kostüm", "erotik", "refurb", "duplikat", "ausverkauft",
              "nicht-lieferbar", "klinge", "messer", "unrentabel",
              "keine-lieferanten", "entwurf", "medizin", "waffe", "tabak")


def grund(titel, tags):
    """Nennt den ERSTEN Grund, warum das Produkt nicht in den Google-Kanal darf."""
    for t in tags:
        tl = t.lower()
        for k in TAG_RISIKO:
            if k in tl:
                return f"Tag «{t}»"
    for name, rx in RISIKO:
        m = rx.search(titel or "")
        if m:
            return f"{name} im Titel («{m.group(0)}»)"
    if ist_klinge(titel or ""):
        return "Waffe/Klinge (Hausregel klingenregel.py)"
    return None


# --- Shopify ------------------------------------------------------------------
def _tok():
    p = "/tmp/cj_shop_token.txt"
    if os.path.exists(p):
        return open(p).read().strip()
    sys.exit("Kein Shopify-Token in /tmp/cj_shop_token.txt")


def gql(q, v=None, tok=None):
    d = json.dumps({"query": q, "variables": v or {}}).encode()
    r = urllib.request.Request(f"https://{SHOP}/admin/api/2024-10/graphql.json", data=d,
                               headers={"X-Shopify-Access-Token": tok,
                                        "Content-Type": "application/json"})
    for _ in range(16):              # 21.09.: 6 → 16, Drosseln brauchen Geduld
        try:
            j = json.loads(urllib.request.urlopen(r, timeout=60).read())
            if any("THROTTL" in str(e.get("extensions", {})) for e in j.get("errors") or []):
                # 21.09.2026: Wartezeit aus Shopifys throttleStatus statt fester 3 s.
                _k = (j.get("extensions") or {}).get("cost") or {}; _t = _k.get("throttleStatus") or {}
                _f = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                _r = float(_t.get("restoreRate") or 0)
                time.sleep(min(30.0, _f / _r + 0.5) if (_f > 0 and _r > 0) else 12.0); continue
            return j
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(3); continue
            raise
    raise RuntimeError("dauerhaft gedrosselt")


LISTE = '''query($c:String){ products(first:100, after:$c,
  query:"status:active AND -publication_ids:302872297857"){
  pageInfo{hasNextPage endCursor}
  nodes{ id title tags
    media(first:1){nodes{... on MediaImage{id}}}
    variants(first:1){nodes{sku price}} } } }'''

PUB = '''mutation($id:ID!,$pub:ID!){
  publishablePublish(id:$id, input:{publicationId:$pub}){
    userErrors{field message} } }'''


def main():
    tok = _tok()
    cur, alle = None, []
    while True:
        d = gql(LISTE, {"c": cur}, tok)["data"]["products"]
        alle += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]; time.sleep(0.35)

    gruende, kandidaten = {}, []
    for p in alle:
        g = grund(p["title"], p["tags"])
        if not g:
            if not p["media"]["nodes"]:
                g = "0 Bilder (Merchant lehnt sicher ab)"
            elif not (p["variants"]["nodes"] and p["variants"]["nodes"][0]["sku"]):
                g = "keine Lieferanten-SKU"
        if g:
            gruende[g] = gruende.get(g, 0) + 1
        else:
            kandidaten.append(p)

    print(f"Ausserhalb des Google-Kanals: {len(alle):,}")
    print(f"Davon mit gutem Grund draussen: {len(alle)-len(kandidaten):,}")
    for g, n in sorted(gruende.items(), key=lambda x: -x[1])[:12]:
        print(f"    {n:>6,}  {g}")
    print(f"\nPUBLIZIERBAR: {len(kandidaten):,}")
    for p in kandidaten[:10]:
        print(f"    · {p['title'][:70]}")

    if not WRITE:
        print("\n(Trockenlauf — mit WRITE=1 publizieren)")
        return
    ok = fehler = 0
    for i, p in enumerate(kandidaten, 1):
        r = gql(PUB, {"id": p["id"], "pub": GOOGLE_PUB}, tok)
        ue = (((r.get("data") or {}).get("publishablePublish") or {}).get("userErrors")) or []
        if r.get("errors") or ue:
            fehler += 1
            if fehler <= 5:
                print(f"  ⚠ {p['title'][:50]}: {r.get('errors') or ue}")
        else:
            ok += 1
        if i % 100 == 0:
            print(f"  … {i:,}/{len(kandidaten):,} (ok {ok:,}, Fehler {fehler:,})")
        time.sleep(0.25)
    print(f"\nFERTIG: {ok:,} publiziert, {fehler:,} Fehler")


if __name__ == "__main__":
    main()
