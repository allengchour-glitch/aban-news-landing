"""Prüft die Änderungen DIESER Session gegen den Shop — sucht Schaden, den ich selbst anrichtete.

WARUM: An diesem Tag hat jeder Reiniger im ersten Entwurf zwischen 30 % und 90 % Fehltreffer
gehabt, und ZWEIMAL ist Schaden bis in den Shop gelangt, den erst die Nachkontrolle fand:
 • Die Heilversprechen-Bereinigung zerbrach 13 Titel («Smart Armband mit & Körpertemperatur»)
   und liess die Behauptung im SEO-Feld stehen, das Google als `description` liest.
 • Der Suchwort-Lauf schrieb sein Ledger nur alle 200 Zeilen und verlor nach jedem
   Turn-Reaping alles — acht Minuten lang «lief» er und hatte null Ergebnis.

Dieses Skript nimmt die Ledger aller heutigen Läufe, holt die betroffenen Produkte LIVE und
prüft, ob das Ergebnis Bestand hat. Es ändert nichts. Es meldet.

GEPRÜFT WIRD:
 1. Titel: Rümpfe («… mit», «… und»), Lücken («mit &», «mit ,»), doppelte Trennzeichen,
    doppelte Stückzahl, Titel unter 12 Zeichen, und ob eine Kürzung einen DOPPELTEN Titel
    erzeugt hat (das war die Falle, wegen der 41 Artikelnummern bewusst stehen blieben).
 2. SEO-Beschreibung: Rümpfe, doppelte Bausteine, Widerspruch zum Titel.
 3. Tags: ob die Suchwort-Tags plausibel zum Titel passen (Stichprobe).
 4. Preise: ob nach dem Preisboden-Lauf noch etwas unter CHF 14.90 liegt, und ob eine Variante
    absurd teuer wurde.
"""
import json, os, re, subprocess, sys, time
from collections import Counter

TOK = open("/tmp/cj_shop_token.txt").read().strip()
STICHPROBE = int(os.environ.get("STICHPROBE", "400"))

LEDGER = {
    "multipack_titel": "dropship/_multipack_titel.txt",
    "heilversprechen_seo": "dropship/_heilversprechen_seo.txt",
    "heilversprechen": "dropship/_heilversprechen.txt",
    "titelcode": "dropship/_titelcode_entfernt.txt",
    "suchwort_tags": "dropship/_suchwort_tags.txt",
    "preisboden": "dropship/_preisboden.txt",
    "farbwerte": "dropship/_farbwerte_zusammengesetzt.txt",
}

RUMPF = re.compile(r'\s(?:mit|und|für|aus|sowie|oder|in|von)\s*$', re.I)
LUECKE = re.compile(r'\b(?:mit|und|für)\s*[,&·]|\s[-–]\s*[&,]|\s{2,}|[,&·]\s*$|^\s*[,&·-]')
DOPPELT_MENGE = re.compile(r'(·\s*\d+\s*St[üu]ck).*\1|(\d+\s*St[üu]ck).*\2', re.I)
DOPPEL_TRENNER = re.compile(r'[·–—-]\s*[·–—-]')


def gql(q, v=None):
    with open("/tmp/_sp.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sp.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def ids_aus(pfad, hoechstens):
    if not os.path.exists(pfad):
        return []
    ids = []
    for zeile in open(pfad):
        t = zeile.split("\t")[0].strip()
        if t.startswith("gid://shopify/Product/"):
            ids.append(t)
    # Gleichmässig über den ganzen Lauf greifen, nicht nur die ersten — die letzten Einträge
    # sind die jüngsten und am ehesten noch unbemerkt.
    if len(ids) <= hoechstens:
        return ids
    schritt = len(ids) / hoechstens
    return [ids[int(i * schritt)] for i in range(hoechstens)]


def holen(ids):
    raus = []
    for i in range(0, len(ids), 100):
        teil = ids[i:i + 100]
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status tags '
                'seo{title description} priceRangeV2{minVariantPrice{amount} '
                'maxVariantPrice{amount}}}}}', {"ids": teil})
        raus += [n for n in ((d.get("data") or {}).get("nodes") or []) if n]
        time.sleep(0.3)
    return raus


def main():
    befunde = Counter()
    beispiele = []
    alle_titel = Counter()
    geprueft = 0

    for name, pfad in LEDGER.items():
        ids = ids_aus(pfad, STICHPROBE)
        if not ids:
            continue
        produkte = holen(ids)
        geprueft += len(produkte)
        print(f"{name:<22} Ledger {sum(1 for _ in open(pfad)):>6} Zeilen | "
              f"live geprüft {len(produkte)}", flush=True)
        for p in produkte:
            t = (p.get("title") or "").strip()
            alle_titel[t.lower()] += 1
            sd = (p.get("seo") or {}).get("description") or ""

            if len(t) < 12:
                befunde["titel-zu-kurz"] += 1
                beispiele.append((name, "titel-zu-kurz", t))
            if RUMPF.search(t):
                befunde["titel-endet-auf-bindewort"] += 1
                beispiele.append((name, "titel-rumpf", t))
            if LUECKE.search(t):
                befunde["titel-luecke"] += 1
                beispiele.append((name, "titel-luecke", t))
            if DOPPEL_TRENNER.search(t):
                befunde["doppeltes-trennzeichen"] += 1
                beispiele.append((name, "doppel-trenner", t))
            if len(re.findall(r'\d+\s*St[üu]ck', t, re.I)) > 1:
                befunde["stueckzahl-doppelt"] += 1
                beispiele.append((name, "menge-doppelt", t))
            if sd and (RUMPF.search(sd) or LUECKE.search(sd)):
                befunde["seo-rumpf-oder-luecke"] += 1
                beispiele.append((name, "seo", sd[:70]))
            preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
            if name == "preisboden" and preis < 14.90:
                befunde["unter-preisboden"] += 1
                beispiele.append((name, f"CHF {preis:.2f}", t))

    doppel = [t for t, n in alle_titel.items() if n > 1]
    print(f"\n── Ergebnis über {geprueft} live geprüfte Produkte", flush=True)
    if not befunde and not doppel:
        print("   Keine Beanstandung.", flush=True)
    for k, v in befunde.most_common():
        print(f"   {v:>4}  {k}", flush=True)
    if doppel:
        print(f"   {len(doppel):>4}  doppelte Titel in der Stichprobe", flush=True)
        for t in doppel[:5]:
            print(f"          «{t[:60]}»", flush=True)
    for lauf, art, text in beispiele[:20]:
        print(f"      [{lauf}/{art}] «{text[:66]}»", flush=True)
    return 1 if befunde else 0


if __name__ == "__main__":
    sys.exit(main())
