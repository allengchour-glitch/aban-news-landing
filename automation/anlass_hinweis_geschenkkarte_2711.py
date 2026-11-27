#!/usr/bin/env python3
"""anlass_hinweis_geschenkkarte_2711.py — Weihnachts-Lieferhinweis: Geschenkkarte als Ausweg (27.11.2026, Betreiber «3 ja»).

Der Block lux_anlass_hinweis (custom-liquid in templates/product*.json) zeigt auf Asien-Ware mit Tag «weihnachten»
«Lieferung vor Weihnachten nicht garantiert». Neu:
  (a) nie auf der Geschenkkarte selbst (closest.product.gift_card?) — sie trägt den Tag weihnachten für die Kollektionen;
  (b) eine zweite Zeile «Oder die Geschenkkarte – kommt sofort per E-Mail →» (/products/luxestyle-gutschein).
  python3 automation/anlass_hinweis_geschenkkarte_2711.py            # Trockenlauf
  SCHARF=1 python3 automation/anlass_hinweis_geschenkkarte_2711.py   # sichern, schreiben, zurücklesen
"""
import json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

DATEIEN = ["templates/product.json", "templates/product.viele-varianten.json", "templates/product.lxszene.json"]
SICH = lambda f: os.path.join(HIER, "..", "theme_backup", f.replace("/", "__") + ".vor-geschenkkarte-2711")
MARKE = "LX-GESCHENKKARTE-2711"
A1 = "{%- unless lx_pt contains 'profil-ch-lager' or"
N1 = "{%- comment -%} " + MARKE + " {%- endcomment -%}{%- unless closest.product.gift_card? or lx_pt contains 'profil-ch-lager' or"
A2 = "</span>\n</div>\n{%- break -%}"
N2 = ("<br><a href=\"/products/luxestyle-gutschein\" style=\"color:#6b4a0f;font-weight:600;text-decoration:underline;\">"
      "Oder die Geschenkkarte &ndash; kommt sofort per E-Mail &rarr;</a>\n</span>\n</div>\n{%- break -%}")


def lesen(th):
    n = gql('query($i:ID!,$f:[String!]!){theme(id:$i){files(filenames:$f){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"i": th, "f": DATEIEN})["theme"]["files"]["nodes"]
    return {x["filename"]: (x["body"]["content"], x["checksumMd5"]) for x in n}


def zerlegen(raw):
    i = raw.find("{", raw.find("*/") if "*/" in raw else 0)
    return raw[:i], json.loads(raw[i:])


def main():
    th = gid(); live = lesen(th); plan = {}
    for f in DATEIEN:
        raw, md5 = live[f]; kopf, j = zerlegen(raw)
        b = j["sections"]["main"]["blocks"]["product-details"]["blocks"]["lux_anlass_hinweis"]["settings"]
        c = b["custom_liquid"]
        if MARKE in c:
            print(f, "schon drin"); continue
        if c.count(A1) != 1 or c.count(A2) != 1:
            raise SystemExit(f"{f}: Anker {c.count(A1)}/{c.count(A2)}")
        b["custom_liquid"] = c.replace(A1, N1, 1).replace(A2, N2, 1)
        plan[f] = (raw, md5, kopf + json.dumps(j, ensure_ascii=False, indent=2))
        print(f, "→ ersetzt (2 Stellen)")
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    ok_alle = True
    for f, (raw, md5, neu) in plan.items():
        open(SICH(f), "w", encoding="utf-8").write(raw)
        r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){userErrors{field message}}}",
                {"id": th, "files": [{"filename": f, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
        if r["userErrors"]:
            raise SystemExit(f"{f}: {r['userErrors']}")
        for _ in range(5):
            time.sleep(3)
            ok = MARKE in lesen(th)[f][0]
            if ok:
                break
        print(f, "RÜCKGELESEN ✓" if ok else "⚠️ RÜCKLESEN FEHLT"); ok_alle &= ok
    return 0 if ok_alle else 1


if __name__ == "__main__":
    sys.exit(main())
