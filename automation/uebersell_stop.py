"""Verhindert Verkäufe von Grössen, die nachweislich nicht mehr am Lager sind.

DER BEFUND (11.08.2026): Von 316'146 Varianten mit Bestand 0 sind fast alle **ungetrackt** —
bei ihnen bedeutet die 0 nichts, Shopify verkauft sie ohnehin unbegrenzt weiter. Genau
**26 Varianten** in **drei** Produkten sind dagegen `tracked: true` UND stehen zugleich auf
`CONTINUE`. Das ist die gefährliche Mischung: Der Bestand wird gepflegt, sagt «leer» — und
Shopify verkauft trotzdem. Das ist die Fehlerklasse der Bestellung #1009 (bezahlt, nicht
lieferbar, erstattet).

Dass es nur 26 sind, ist die gute Nachricht: die Bestandsführung im Katalog ist im Grossen
sauber. Es lohnt sich trotzdem, denn beide betroffenen CJ-Artikel sind Kleidung mit echtem,
synchronisiertem Bestand (2'186 bzw. 16'001 Stück über alle Grössen) — es fehlen also nur
einzelne Grössen, und genau die darf man nicht mehr verkaufen. Die Umstellung auf `DENY`
nimmt nur diese Grössen aus dem Verkauf; das Produkt selbst bleibt kaufbar.

Gesetzt wird auf ALLEN Varianten der betroffenen Produkte, nicht nur auf den heute leeren:
Eine Grösse, die morgen leer läuft, hätte sonst dasselbe Problem.

DAS DRITTE PRODUKT — und warum die naheliegende Annahme falsch war: Beim «Unisex T-Shirt –
Selbst gestalten» (Printful, Druck auf Bestellung) stehen acht Grössen auf 9999 («immer da»),
nur 5XL auf 0. Das sah nach einem vergessenen Wert aus, und der erste Entwurf dieses Skripts
wollte die 0 deshalb auf 9999 heben. **Die Nachfrage beim Lieferanten hat das widerlegt:**

    4012 (M)   US=in_stock, EU=in_stock, EU_LV, EU_ES, CA, UK, AU
    5309 (4XL) US=in_stock, EU=in_stock, EU_LV, UK
    12872 (5XL) US=in_stock          ← sonst nichts

5XL gibt es nur im US-Lager. Der Shop liefert in die Schweiz; eine 5XL-Bestellung wäre also
nicht oder nur über den Atlantik erfüllbar. Die 0 ist keine Nachlässigkeit, sondern die
Wahrheit für diesen Markt — Printful hat sie bewusst so gesetzt. Richtig ist deshalb auch hier
`DENY`: die Grösse verschwindet aus dem Verkauf, die acht lieferbaren bleiben. Der Editor
bleibt unangetastet.

Merke: Bevor man einen Lagerstand «korrigiert», fragt man den Lieferanten. Eine 0 kann ein
vergessener Wert sein — oder eine Aussage.

DRY=1 meldet nur.
"""
import json, os, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
POD_TITEL = "Unisex T-Shirt – Selbst gestalten"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


def main():
    treffer = json.load(open(os.environ.get("QUELLE", "/tmp/uebersell.json")))
    pids = sorted({t[1] for t in treffer})
    print(f"betroffene Produkte: {len(pids)}", flush=True)

    d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title '
            'variants(first:100){nodes{id title inventoryQuantity inventoryPolicy '
            'inventoryItem{id}}}}}}', {"ids": pids})
    for n in (d.get("data") or {}).get("nodes") or []:
        if not n:
            continue
        vs = n["variants"]["nodes"]
        if n["title"].strip() == POD_TITEL:
            # Nur die leere Grösse sperren — die acht lieferbaren bleiben auf CONTINUE, damit
            # der Editor bei Druckware nie an einer Bestandszahl scheitert.
            offen = [v for v in vs
                     if (v["inventoryQuantity"] or 0) <= 0 and v["inventoryPolicy"] != "DENY"]
        else:
            offen = [v for v in vs if v["inventoryPolicy"] != "DENY"]
        leer = sum(1 for v in vs if (v["inventoryQuantity"] or 0) <= 0)
        print(f"{n['title'][:50]} — {len(offen)} von {len(vs)} Varianten auf DENY "
              f"({leer} davon aktuell leer)", flush=True)
        if DRY or not offen:
            continue
        for i in range(0, len(offen), 25):
            teil = [{"id": v["id"], "inventoryPolicy": "DENY"} for v in offen[i:i + 25]]
            r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate('
                    'productId:$p,variants:$v){userErrors{message}}}', {"p": n["id"], "v": teil})
            errs = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
            if errs:
                print(f"   ⚠️ {errs[0]['message']}", flush=True)
            time.sleep(0.4)
        print("   gesetzt", flush=True)


if __name__ == "__main__":
    main()
