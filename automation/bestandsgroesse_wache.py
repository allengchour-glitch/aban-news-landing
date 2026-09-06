#!/usr/bin/env python3
"""Misst die GRÖSSE des aktiven Katalogs und meldet einen Einbruch.

Warum es diesen Wächter gibt (06.09.2026, teuer gelernt): Am 05.09. um 09:50 UTC hat ein
fremder Lauf **20'953 Produkte auf Entwurf** gesetzt — Kriterium «trägt nicht den Tag
`bild-ok`», also die Quittung EINES Laufs vom 16.06. Der aktive Katalog fiel von rund
53'300 auf 35'144 Produkte, und **32 Landeseiten mit gemessenem Verkehr wurden zu 404** —
darunter die grösste Produkt-Landeseite des ganzen Shops.

**Keine der 194 Wachen hat es gemeldet.** Sie prüfen alle Klassen INNERHALB der aktiven
Ware (tote Links, leere Kollektionen, Versandaussagen, Google-Kanal) — keine prüft die
ZAHL der aktiven Ware selbst. Gefunden habe ich es durch Zufall über den Trichter, einen
Tag später. Ein Zustand, den niemand misst, ist ein Zustand, den niemand bemerkt.

⚠️ ZÄHLFALLE: `productsCount` deckelt bei **10'000** (`precision: AT_LEAST`). Wer den
Katalog mit einer Abfrage zählen will, bekommt für 35'000 und für 53'000 dieselbe Zahl.
Gezählt wird deshalb in PREISBÄNDERN, deren Summe exakt ist — dieselbe Technik wie beim
Preisboden-Lauf vom 22.08.

Der Wächter MELDET NUR. Ein Einbruch kann legitim sein (ein Wächter draftet eine ganze
Risiko-Klasse); die Entscheidung, ob zurückgeholt wird, gehört dem Betreiber. Er nennt
deshalb zusätzlich die Tags, die bei den frisch gedrafteten Produkten am häufigsten
vorkommen — damit steht der URHEBER im Bericht und nicht nur der Schaden.

⚠️ Bei fehlender API-Antwort endet der Lauf mit PAUSE, nie mit FERTIG (Lehre 21.08.):
Ein Wächter, der bei toter Quelle Vollzug meldet, ist tagelang unsichtbar.
"""
import json, os, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
STAND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_bestandsgroesse.json")
BERICHT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "BESTANDSGROESSE.md")
# Ab wie viel Prozent Rückgang gegenüber dem letzten Stand ist es ein Befund.
SCHWELLE = float(os.environ.get("SCHWELLE", "5"))

# Preisbänder. Ihre Summe ist exakt, solange KEIN Band die 10'000 erreicht — der Lauf
# prüft das und teilt ein zu volles Band selbst weiter auf.
BAENDER = [(0, 15), (15, 17), (17, 19), (19, 21), (21, 25), (25, 32),
           (32, 45), (45, 70), (70, 120), (120, None)]


def token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN")
    if t:
        return t.strip()
    try:
        return open("/tmp/cj_shop_token.txt").read().strip()
    except Exception:
        return ""


TOK = token()


def gql(q, v=None):
    if not TOK:
        return {}
    with open("/tmp/_bgw.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_bgw.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d["data"]
            errs = d.get("errors") or []
            if any("Throttled" in str(e.get("message", "")) for e in errs):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus", {})
                fehlt = (((d.get("extensions") or {}).get("cost") or {}).get("requestedQueryCost", 100)
                         - ts.get("currentlyAvailable", 0))
                time.sleep(min(30, max(1.0, fehlt / max(1, ts.get("restoreRate", 100))) + 0.5))
                continue
            if errs:
                print("GQL-Fehler:", str(errs[:1])[:160], file=sys.stderr)
                return {}
        except Exception:
            pass
        time.sleep(2)
    return {}


def zaehle(bedingung):
    """Exakte Zahl über Preisbänder. None, wenn die API nicht antwortet."""
    summe = 0
    offen = list(BAENDER)
    while offen:
        lo, hi = offen.pop(0)
        q = bedingung + f" AND price:>={lo}" + (f" AND price:<{hi}" if hi is not None else "")
        d = gql("query($q:String!){ productsCount(query:$q){count precision} }", {"q": q})
        pc = (d or {}).get("productsCount")
        if not pc:
            return None
        if pc.get("precision") != "EXACT":
            # Band zu voll → in der Mitte teilen. Ohne Obergrenze in Zehnerschritten weiter.
            if hi is None:
                offen.insert(0, (lo + 100, None))
                offen.insert(0, (lo, lo + 100))
            else:
                m = round((lo + hi) / 2, 2)
                if m <= lo or m >= hi:
                    return None            # nicht weiter teilbar — lieber keine Zahl als eine falsche
                offen.insert(0, (m, hi))
                offen.insert(0, (lo, m))
            continue
        summe += pc["count"]
        time.sleep(0.15)
    return summe


def frisch_gedraftet_tags(seit_tage=2, limit=250):
    """Welche Tags tragen die zuletzt gedrafteten Produkte? Nennt den Urheber, nicht nur die Zahl."""
    q = f"status:draft AND updated_at:>-{seit_tage}d"
    d = gql("query($q:String!){ products(first:50, query:$q){ nodes{ tags } } }", {"q": q})
    haeufig = {}
    for n in ((d or {}).get("products") or {}).get("nodes", []):
        for t in n.get("tags", []):
            haeufig[t] = haeufig.get(t, 0) + 1
    return sorted(haeufig.items(), key=lambda kv: -kv[1])[:8]


def main():
    aktiv = zaehle("status:active")
    if aktiv is None:
        print("PAUSE (Shopify antwortet nicht — keine Zahl ist besser als eine falsche)")
        return
    stand = {"verlauf": []}
    if os.path.exists(STAND):
        try:
            stand = json.load(open(STAND, encoding="utf-8"))
        except Exception:
            pass
    verlauf = stand.get("verlauf", [])
    letzte = verlauf[-1]["aktiv"] if verlauf else None

    heute = time.strftime("%Y-%m-%d %H:%M", time.gmtime())
    verlauf.append({"stand": heute, "aktiv": aktiv})
    stand["verlauf"] = verlauf[-120:]
    os.makedirs(os.path.dirname(STAND), exist_ok=True)
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    if letzte is None:
        print(f"ERSTE MESSUNG: {aktiv} aktive Produkte — ab dem nächsten Lauf wird verglichen.")
        print("FERTIG")
        return

    diff = aktiv - letzte
    proz = (diff / letzte * 100) if letzte else 0
    print(f"aktive Produkte: {aktiv} (vorher {letzte}, {diff:+d} = {proz:+.1f} %)")

    if proz > -SCHWELLE:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)      # ein Bericht ohne Befund gehört gelöscht, nicht stehengelassen
        print("FERTIG")
        return

    tags = frisch_gedraftet_tags()
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Bestandsgrösse — Einbruch gemeldet ({heute} UTC)\n\n")
        f.write(f"**Aktive Produkte: {aktiv}** — vorher {letzte} ({diff:+d}, {proz:+.1f} %).\n\n")
        f.write("Gezählt in Preisbändern, weil `productsCount` bei 10'000 deckelt.\n\n")
        if tags:
            f.write("## Häufigste Tags bei der zuletzt gedrafteten Ware\n\n")
            f.write("Wer einen Massen-Draft fährt, hinterlässt fast immer eine Marke. "
                    "Steht hier ein Tag mit einem Datum darin, ist das der Urheber:\n\n")
            for t, n in tags:
                f.write(f"- `{t}` — {n}×\n")
            f.write("\n")
        f.write("## Was jetzt zu tun ist\n\n")
        f.write("1. **Nicht pauschal zurückholen.** Erst die Schnittmenge des Marken-Tags mit den "
                "absichtlichen Draft-Gründen messen (`waffengesetz-verboten`, `medizinprodukt-pruefen`, "
                "`keine-lieferanten-ref`, `nicht-lieferbar-ch`, `ausverkauft-lieferant`, "
                "`duplikat-auto-draft`). Ist sie 0, ist der Tag eine saubere Rückgängig-Marke.\n")
        f.write("2. **Landeseiten mit Verkehr zuerst:** ShopifyQL `FROM sessions … GROUP BY "
                "landing_page_path` holen und jeden Pfad live prüfen. Eine tote Seite mit Besuchern "
                "kostet sofort, eine ohne Besucher kostet nichts.\n")
        f.write("3. Ein Massenschritt in der Gegenrichtung gehört dem Betreiber — melden, nicht ausführen.\n")
    print(f"⛔ EINBRUCH: {proz:+.1f} % — Bericht: dropship/BESTANDSGROESSE.md")
    print("FERTIG")


if __name__ == "__main__":
    main()
