#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_kanal_luecke.py — findet Ware, die NUR im Google-Kanal fehlt.

WARUM: Google & YouTube ist der einzige Kanal mit belegten Verkäufen. Am 22.08.2026 gezählt:
Von 4'779 seit dem 19.08. neu angelegten aktiven Produkten stehen 100 % im Online Store,
99,9 % in TikTok/Facebook/Pinterest — aber nur 98,1 % bei Google. 85 Produkte fehlen dort,
und NUR dort.

✅ DIE URSACHE IST GEFUNDEN (22.08.2026, über die Shopify-Ereignisliste eines Einzelfalls).
Beim Polohemd 15508310557057 steht lückenlos: «included on Online Store» 02:11:21 ·
«Shop» 02:11:21 · «TikTok» 02:11:22 · «Facebook & Instagram» 02:11:23 · «Pinterest» 02:11:24
— Google & YouTube fehlt, und es gibt auch KEIN «removed». Das Produkt wurde also nie
publiziert, nicht später entfernt. `cj_sku_import.mjs` und `cj_trending_import.mjs` riefen
`publishablePublish` auf, ohne die Antwort je zu lesen; fiel eine einzelne Publikation aus,
landete das Produkt in fünf von sechs Kanälen und niemand merkte es. `cj_category_fill.mjs`
hatte dafür längst `publishVerified()` — die beiden Geschwister blieben ungepatcht. Beide
haben die geprüfte Fassung jetzt, der NACHSCHUB ist damit gestoppt.

Dieser Wächter bleibt trotzdem: Er ist der Beweis, dass die Reparatur hält, und er fängt
jede künftige Publish-Lücke — egal, welcher Schreiber sie erzeugt.

⚠️ ER PUBLIZIERT NICHTS. Ein Teil der Ausschlüsse IST gewollt (Kostüm, Erotik, Refurb,
Klingen), und ein Fehlgriff im Google-Kanal riskiert die Merchant-Sperre — also genau den
Kanal, der verkauft. Das Nachpublizieren macht `google_kanal_luecke_schliessen.py`, und
zwar nur für Ware, die dieselben Regeln wie `google_kanal_nachziehen.py` besteht — LIVE
geprüft, mit Quittung, und mit `DRY=1` erst zum Lesen.

ENV: SEIT=JJJJ-MM-TT (Default: die letzten 7 Tage)
"""
import json, os, subprocess, time, datetime, re

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
BERICHT = "dropship/GOOGLE-KANAL-LUECKE.md"
SEIT = os.environ.get("SEIT") or (
    datetime.date.today() - datetime.timedelta(days=7)).isoformat()

# Tags, die einen Ausschluss ERKLÄREN — solche Produkte sind kein Befund.
SPERR = {"nicht-bewerben", "nur-onlineshop", "waffengesetz-verboten", "medizinprodukt-pruefen",
         "18plus", "raucher", "erotik", "kostuem", "kostüm", "refurbished"}
# Dieselbe Hausregel wie in den Importern: Klingen gehören nicht in den Google-Kanal.
KLINGE = re.compile(r"\b(messer|klinge\w*|dolch|machete|axt|beil|schwert|katana)", re.I)
KLINGE_AUSN = re.compile(r"jeans|kleid|hose|shirt|hoodie|wasch|deko|figur|anhänger|"
                         r"halskette|ohrring|spielzeug|plüsch|kostüm", re.I)


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors"):
                if "THROTTL" in json.dumps(d["errors"]).upper():
                    time.sleep(4 + i * 3); continue
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:170], flush=True)
                return None
        except Exception:
            pass
        time.sleep(3 + i)
    return None


def main():
    cur, ges, treffer = None, 0, []
    while True:
        d = gql('query($c:String){ products(first:30, after:$c, '
                'query:"status:active created_at:>=' + SEIT + '"){ '
                'pageInfo{hasNextPage endCursor} nodes{ id title tags '
                'resourcePublications(first:8){ nodes{ isPublished publication{ name } } } } } }',
                {"c": cur})
        # ⚠️ Eine gescheiterte Abfrage ist KEIN Befund. Sie darf weder einen Bericht
        # erzeugen noch FERTIG melden — sonst meldet der Waechter erfundene Luecken
        # (beim Bau dieses Skripts genau so passiert: eine leere Antwort haette ALLE
        # Produkte als «fehlt bei Google» ausgegeben).
        if d is None:
            print(f"PAUSE (Shopify antwortet nicht — bei {ges} Produkten, kein Befund)")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            ges += 1
            pubs = {n["publication"]["name"]: n["isPublished"]
                    for n in p["resourcePublications"]["nodes"]}
            if pubs.get("Google & YouTube"):
                continue
            if not pubs.get("Online Store"):
                continue                       # gar nicht im Shop -> anderes Thema
            tg = {t.lower() for t in p["tags"]}
            if tg & SPERR or any(t.startswith("google-kanal-") for t in tg):
                continue                       # Ausschluss ist erklaert
            t = p["title"] or ""
            if KLINGE.search(t) and not KLINGE_AUSN.search(t):
                continue                       # Hausregel Klingen
            treffer.append((p["id"].split("/")[-1], t))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        time.sleep(0.8)

    print(f"Geprueft: {ges} aktive Produkte seit {SEIT}", flush=True)
    if treffer:
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write("# Ware, die NUR im Google-Kanal fehlt\n\n")
            f.write(f"Stand {datetime.date.today().isoformat()} · geprüft seit {SEIT} · "
                    f"{ges} aktive Produkte\n\n")
            f.write("Google & YouTube ist der einzige Kanal mit belegten Verkäufen. Diese "
                    "Produkte stehen im Online Store, tragen **kein** Sperr-Tag, sind in "
                    "keinem Säuberungs-Ledger vermerkt und fallen nicht unter die "
                    "Klingen-Hausregel — trotzdem fehlen sie bei Google.\n\n")
            f.write("⚠️ Vor dem Nachpublizieren einzeln ansehen: Ein Fehlgriff im "
                    "Google-Kanal riskiert die Merchant-Sperre.\n\n")
            for pid, t in treffer:
                f.write(f"- `{pid}` — {t}\n")
        print(f"⚠️ {len(treffer)} Produkte fehlen nur bei Google -> {BERICHT}")
        for pid, t in treffer[:10]:
            print(f"   {pid}  {t[:56]}")
    else:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
            print(f"  Bericht {BERICHT} entfernt (keine Luecke mehr)")
        print("  Keine Luecke: alle neuen Produkte ohne Sperrgrund stehen im Google-Kanal.")
    # FERTIG haengt an «nichts zu TUN». Gemeldetes ist ein Rueckstand fuer den Betreiber,
    # keine offene Arbeit dieses Laufs (Lehre 21.08.: ein Melde-Waechter wird sonst nie fertig).
    print("FERTIG")


main()
