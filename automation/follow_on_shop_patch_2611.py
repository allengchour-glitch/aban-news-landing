#!/usr/bin/env python3
"""follow_on_shop_patch_2611.py — Knopf «Follow on Shop» in die Fusszeile (26.11.2026, «shop campagne aufpimpen und shop app»).

ANLASS: Die Shop-App ist Kanal Nr. 2 (4 Bestellungen über Shop Campaigns, 07.–26.11.). Follower bekommen in der Shop-App
Empfehlungen und Benachrichtigungen. Horizon hat den Block `blocks/follow-on-shop.liquid` (rendert nur bei
`shop.features.follow_on_shop?`), die Fusszeile nutzte ihn nicht. Neu: Block `follow_on_shop_lx` in der Sektion
footer_m9NzUG direkt nach dem Newsletter-Feld.

  python3 automation/follow_on_shop_patch_2611.py            # Trockenlauf
  SCHARF=1 python3 automation/follow_on_shop_patch_2611.py   # Live-Datei holen, sichern, schreiben, zurücklesen
  python3 automation/follow_on_shop_patch_2611.py --zurueck  # Block wieder entfernen (nur dieser Block, Rest bleibt)
"""
import json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

DATEI = "sections/footer-group.json"
SICHERUNG = os.path.join(HIER, "..", "theme_backup", "footer-group.json.vor-follow-on-shop-2611")
SEKTION, BLOCK, NACH = "footer_m9NzUG", "follow_on_shop_lx", "email_signup_crihX7"
NEU = {"type": "follow-on-shop", "settings": {"padding-block-start": 8, "padding-block-end": 0,
                                              "padding-inline-start": 0, "padding-inline-end": 0}}


def lesen(th):
    n = gql('query($i:ID!){theme(id:$i){files(filenames:["%s"]){nodes{checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % DATEI,
            {"i": th})["theme"]["files"]["nodes"][0]
    return n["body"]["content"], n["checksumMd5"]


def zerlegen(raw):
    i = raw.find("{", raw.find("*/") if "*/" in raw else 0)
    return raw[:i], json.loads(raw[i:])


def schreiben(th, inhalt):
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": th, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit(f"userErrors: {r['userErrors']}")


def drin(j):
    s = j["sections"][SEKTION]
    return BLOCK in s.get("blocks", {}) and BLOCK in s.get("block_order", [])


def main():
    th = gid()
    raw, md5 = lesen(th)
    kopf, j = zerlegen(raw)
    s = j["sections"][SEKTION]
    zurueck = "--zurueck" in sys.argv
    if zurueck:
        if not drin(j):
            print("Block nicht drin — nichts zu tun"); return 0
        s["blocks"].pop(BLOCK); s["block_order"].remove(BLOCK)
    else:
        if drin(j):
            print("schon drin"); return 0
        if NACH not in s["block_order"]:
            raise SystemExit(f"Anker {NACH} fehlt in block_order {s['block_order']}")
        s["blocks"][BLOCK] = NEU
        s["block_order"].insert(s["block_order"].index(NACH) + 1, BLOCK)
    neu = kopf + json.dumps(j, ensure_ascii=False, indent=2)
    json.loads(neu[len(kopf):])
    print(("ENTFERNE" if zurueck else "FÜGE EIN"), BLOCK, "→ block_order", s["block_order"])
    if os.environ.get("SCHARF") != "1" and not zurueck:
        print(f"TROCKEN — SCHARF=1 schreibt (md5 {md5})"); return 0
    if not zurueck:
        os.makedirs(os.path.dirname(SICHERUNG), exist_ok=True)
        open(SICHERUNG, "w", encoding="utf-8").write(raw)
    schreiben(th, neu)
    for _ in range(5):   # das erste Rücklesen direkt nach dem Schreiben kann noch den alten Text liefern (26.11. gemessen)
        time.sleep(3)
        raw2, md5_2 = lesen(th)
        ok = drin(zerlegen(raw2)[1]) != zurueck
        if ok:
            break
    print(("RÜCKGELESEN ✓ " if ok else "⚠️ RÜCKLESEN FEHLT ") + f"md5 {md5} → {md5_2}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
