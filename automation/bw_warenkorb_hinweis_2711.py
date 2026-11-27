#!/usr/bin/env python3
"""bw_warenkorb_hinweis_2711.py — Black-Week-Hinweis im Warenkorb (27.11.2026, Betreiber «push für mehr einkäufe»).

ANLASS (Workflow mehr-einkaeufe-push): Rabatt «Black Week: 15 % ab CHF 80» seit 24.11. aktiv, asyncUsageCount 0;
snippets/cart-summary.liquid erwähnte die Aktion nicht. Neu unter dem Gratisversand-Hinweis (nur bis Mo 30.11.
22:59:59 UTC, Unix 1796079599, danach rendert der Block nichts mehr):
  - Rabatt angewendet  → «🖤 Black-Week-Rabatt 15 % ist aktiv»
  - Warenwert ≥ CHF 40 → «🖤 Noch CHF X bis 15 % Black-Week-Rabatt (automatisch, bis Mo 30.11.)»
  - darunter nichts (der Gratisversand-Hinweis bleibt allein).

  python3 automation/bw_warenkorb_hinweis_2711.py            # Trockenlauf
  SCHARF=1 python3 automation/bw_warenkorb_hinweis_2711.py   # Live holen, sichern, einfügen, zurücklesen
  python3 automation/bw_warenkorb_hinweis_2711.py --zurueck  # Block entfernen (nur der markierte Teil)
"""
import os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

DATEI = "snippets/cart-summary.liquid"
SICHERUNG = os.path.join(HIER, "..", "theme_backup", "snippets__cart-summary.liquid.vor-bw-hinweis-2711")
ANKER = "(ab CHF 50 nach Rabatt)</span>\n        {%- endif -%}\n      </div>\n"
START, ENDE = "{%- comment -%} LUX-BW-HINWEIS-2711 {%- endcomment -%}", "{%- comment -%} /LUX-BW-HINWEIS-2711 {%- endcomment -%}"
BLOCK = (START + "\n"
         "      {%- assign lux_jetzt = 'now' | date: '%s' | plus: 0 -%}\n"
         "      {%- if lux_jetzt < 1796079599 -%}\n"
         "        {%- assign lux_bw_an = false -%}\n"
         "        {%- for d in cart.cart_level_discount_applications -%}{%- if d.title contains 'Black Week' -%}{%- assign lux_bw_an = true -%}{%- endif -%}{%- endfor -%}\n"
         "        {%- if lux_bw_an -%}\n"
         "          <div class=\"cart-totals__item cart-primary-typography\" style=\"font-size:0.92em;justify-content:center;text-align:center;\"><span>🖤 Black-Week-Rabatt 15 % ist aktiv</span></div>\n"
         "        {%- elsif cart.items_subtotal_price >= 4000 -%}\n"
         "          {%- assign lux_bw_rest = 8000 | minus: cart.items_subtotal_price -%}\n"
         "          <div class=\"cart-totals__item cart-primary-typography\" style=\"font-size:0.92em;justify-content:center;text-align:center;\"><span>🖤 Noch <strong>{{ lux_bw_rest | money }}</strong> bis 15 % Black-Week-Rabatt (automatisch, bis Mo 30.11.)</span></div>\n"
         "        {%- endif -%}\n"
         "      {%- endif -%}\n"
         "      " + ENDE + "\n")


def lesen(th):
    n = gql('query($i:ID!){theme(id:$i){files(filenames:["%s"]){nodes{checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % DATEI,
            {"i": th})["theme"]["files"]["nodes"][0]
    return n["body"]["content"], n["checksumMd5"]


def schreiben(th, inhalt):
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": th, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit(f"userErrors: {r['userErrors']}")


def main():
    th = gid()
    raw, md5 = lesen(th)
    zurueck = "--zurueck" in sys.argv
    if zurueck:
        if START not in raw:
            print("Block nicht drin"); return 0
        a = raw.index(START); e = raw.index(ENDE) + len(ENDE) + 1
        neu = raw[:a] + raw[e:].lstrip(" ") if raw[e - 1] == "\n" else raw[:a] + raw[e:]
    else:
        if START in raw:
            print("schon drin"); return 0
        if raw.count(ANKER) != 1:
            raise SystemExit(f"Anker {raw.count(ANKER)}× (erwartet 1)")
        neu = raw.replace(ANKER, ANKER + "      " + BLOCK, 1)
    print(("ENTFERNE" if zurueck else "FÜGE EIN") + f" ({len(raw)} → {len(neu)} Zeichen, md5 {md5})")
    if os.environ.get("SCHARF") != "1" and not zurueck:
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    if not zurueck:
        open(SICHERUNG, "w", encoding="utf-8").write(raw)
    schreiben(th, neu)
    for _ in range(5):
        time.sleep(3)
        raw2, md5_2 = lesen(th)
        ok = (START in raw2) != zurueck
        if ok:
            break
    print(("RÜCKGELESEN ✓ " if ok else "⚠️ RÜCKLESEN FEHLT ") + f"md5 {md5} → {md5_2}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
