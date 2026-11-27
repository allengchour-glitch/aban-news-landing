#!/usr/bin/env python3
"""pdp_vertrauen_reihenfolge_2711.py — Produktseite: Vertrauen direkt unter den Kaufknopf (27.11.2026, «push für mehr einkäufe»).

ANLASS (Workflow mehr-einkaeufe-push, Browser 390×844): Warenkorb-Knopf y≈1665, Vertrauenszeile y≈2099, Klarna/TWINT
y≈2173 — dazwischen Mengenrabatt, Merkliste, Anlass-Hinweis. Der Weihnachts-Hinweis («Lieferung vor Weihnachten nicht
garantiert») stand UNTER dem Knopf. Neu (nur Reihenfolge, kein Inhalt, kein neuer Block):
  … lux_delivery, lux_anlass_hinweis, buy_buttons_eYQEYi, lux_trust, lux_zahlungsarten, lux_mengenrabatt, lux_wish_pdp, accordion …
Gilt für product.json, product.viele-varianten.json, product.lxszene.json (NICHT product.luxe-studio.json / Editor).

  python3 automation/pdp_vertrauen_reihenfolge_2711.py            # Trockenlauf
  SCHARF=1 python3 automation/pdp_vertrauen_reihenfolge_2711.py   # sichern, schreiben, zurücklesen
  python3 automation/pdp_vertrauen_reihenfolge_2711.py --zurueck  # Sicherungen zurückschreiben (nur bei unveränderter Live-Datei)
"""
import hashlib, json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

DATEIEN = ["templates/product.json", "templates/product.viele-varianten.json", "templates/product.lxszene.json"]
SICH = lambda f: os.path.join(HIER, "..", "theme_backup", f.replace("/", "__") + ".vor-vertrauen-2711")
VORHER = ['lux_delivery', 'buy_buttons_eYQEYi', 'lux_mengenrabatt', 'lux_wish_pdp', 'lux_anlass_hinweis', 'lux_trust', 'lux_zahlungsarten']
NACHHER = ['lux_delivery', 'lux_anlass_hinweis', 'buy_buttons_eYQEYi', 'lux_trust', 'lux_zahlungsarten', 'lux_mengenrabatt', 'lux_wish_pdp']


def lesen(th):
    n = gql('query($i:ID!,$f:[String!]!){theme(id:$i){files(filenames:$f){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"i": th, "f": DATEIEN})["theme"]["files"]["nodes"]
    return {x["filename"]: (x["body"]["content"], x["checksumMd5"]) for x in n}


def zerlegen(raw):
    i = raw.find("{", raw.find("*/") if "*/" in raw else 0)
    return raw[:i], json.loads(raw[i:])


def umstellen(order):
    a = order.index(VORHER[0])
    if order[a:a + len(VORHER)] != VORHER:
        raise SystemExit(f"unerwartete Reihenfolge: {order}")
    return order[:a] + NACHHER + order[a + len(VORHER):]


def schreiben(th, f, inhalt):
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": th, "files": [{"filename": f, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit(f"{f}: userErrors {r['userErrors']}")


def main():
    th = gid()
    live = lesen(th)
    if "--zurueck" in sys.argv:
        for f in DATEIEN:
            alt = open(SICH(f), encoding="utf-8").read()
            vor = open(SICH(f) + ".md5-nachher").read().strip()
            if live[f][1] != vor:
                print(f"{f}: Live-Datei seit dem Umbau verändert — übersprungen"); continue
            schreiben(th, f, alt); print(f"{f}: zurückgeschrieben", hashlib.md5(alt.encode()).hexdigest())
        return 0
    plan = {}
    for f in DATEIEN:
        raw, md5 = live[f]
        kopf, j = zerlegen(raw)
        m = j["sections"]["main"]["blocks"]["product-details"]
        if m["block_order"][m["block_order"].index("lux_delivery") + 1] == "lux_anlass_hinweis":
            print(f"{f}: schon umgestellt"); continue
        m["block_order"] = umstellen(m["block_order"])
        plan[f] = (raw, md5, kopf + json.dumps(j, ensure_ascii=False, indent=2))
        print(f"{f}: → {m['block_order']}")
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    ok_alle = True
    for f, (raw, md5, neu) in plan.items():
        open(SICH(f), "w", encoding="utf-8").write(raw)
        schreiben(th, f, neu)
        for _ in range(5):
            time.sleep(3)
            raw2, md5_2 = lesen(th)[f]
            ok = zerlegen(raw2)[1]["sections"]["main"]["blocks"]["product-details"]["block_order"] == zerlegen(neu)[1]["sections"]["main"]["blocks"]["product-details"]["block_order"]
            if ok:
                break
        open(SICH(f) + ".md5-nachher", "w").write(md5_2)
        print(f"{f}: " + ("RÜCKGELESEN ✓" if ok else "⚠️ RÜCKLESEN FEHLT") + f" md5 {md5} → {md5_2}")
        ok_alle &= ok
    return 0 if ok_alle else 1


if __name__ == "__main__":
    sys.exit(main())
