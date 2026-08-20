"""Stellt qualifizierte Produkte im Google-Kanal wieder her.

WAS SCHIEFLIEF (ehrlich, 2026-08-09/10): `gfeed_apply.py` hat den Google-Kanal auf die
besten 5'000 Produkte zusammengestrichen. Der Gedanke war richtig — schwache Artikel raus,
damit Merchant den Feed nicht als Ganzes ablehnt. Die Umsetzung war es nicht: die Grenze
KEEP=5000 war willkürlich. Von den rund 18'200 Produkten, die alle Qualitätshürden bestanden
hatten, flogen ~13'200 allein deshalb raus, weil sie auf Rang 5'001+ standen.

Bei bezahlten Anzeigen wäre eine enge Auswahl vertretbar. Der Google-Kanal speist aber auch
die **kostenlosen Einträge** — dort kostet ein zusätzliches Produkt nichts und bringt nur
Reichweite. Genau diese Reichweite ist laut Projekt-Memory der wichtigste Gratis-Hebel. Der
Einbruch von 152'820 auf 72'956 Merchant-Artikeln ist die Folge.

WAS DIESES SKRIPT TUT: es publiziert ausschliesslich die Produkte zurück, die im Scoring
eine positive Bewertung hatten (`score > 0`) — also 3+ Bilder, Preis >= 15, saubere Titel,
Lieferanten-SKU, kein Kostüm-/Erotik-/Refurb-Sortiment. Die 8'410 Artikel mit harter
Disqualifikation (`score == -1`) bleiben draussen; sie würden von Google ohnehin abgelehnt
und ziehen im Zweifel das ganze Konto mit.

Vor dem Publizieren wird der aktuelle Status geprüft: Produkte, die inzwischen DRAFT sind
(Duplikate, ausverkauft, Richtlinienverstoss), werden übersprungen — sonst holt dieses
Skript genau die Ware zurück, die andere Reiniger bewusst entfernt haben.

ZWEITE KORREKTUR (2026-08-11): Zwei der sechs Ausschlussgründe sind **Anzeigen-Regeln, die
versehentlich auf die kostenlosen Einträge angewendet wurden**:
  • `preis-unter-15`  (2'881 Artikel) — Google Merchant kennt keine Preisuntergrenze.
  • `unter-3-bildern` (2'166 Artikel) — verlangt wird genau EIN `image_link`.
Für bezahlte Anzeigen sind beide Hürden sinnvoll (billige Ware verbrennt Klickbudget, ein
einzelnes Bild verkauft schlecht). Für Gratis-Einträge kosten sie nur Reichweite — und Google
ist der einzige Kanal mit belegten Verkäufen (4 von 10 Bestellungen; TikTok bislang keine).
Beispiel aus der Stichprobe: ein Handyhalter mit **sechs** Bildern flog allein am Preis
(CHF 14.90) raus.

Die anderen vier Gründe bleiben draussen, und zwar aus je eigenem Grund: `kein-werbe-sortiment`
(Kostüm/Erotik/Refurb) riskiert eine Konto-Sperre, `code-im-titel`/`code-in-variante` liefern
unlesbare Anzeigentexte, und `keine-lieferanten-sku` ist die Risikoklasse der Bestellung #1008
— unprüfbare Ware, die man nicht bewerben sollte, bevor man sie liefern kann.

⚠️ Die Gründe werden in `gfeed_score.py` per `elif` geprüft, also **nur der erste zählt**. Ein
Artikel mit dem Etikett `unter-3-bildern` kann zusätzlich einen zu tiefen Preis ODER gar keine
Lieferanten-SKU haben — das wurde nie geprüft, weil die Kette vorher abbrach. Beim Zurückholen
werden die restlichen Bedingungen deshalb **live neu geprüft**, statt dem Etikett zu vertrauen.
Insbesondere: mindestens ein Bild (0 Bilder = sichere Merchant-Ablehnung) und eine
Lieferanten-SKU.

  DRY=1                                  meldet nur.
  AUCH=preis-unter-15,unter-3-bildern    holt zusätzlich diese Ausschlussgründe zurück.
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from google_sperrliste import gesperrte_ids, id_zahl, tag_gesperrt

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
GOOG = "gid://shopify/Publication/302872297857"
SCORES = os.environ.get("SCORES", "/tmp/gfeed_scores.json")
LEDGER = "dropship/_gfeed_restore.txt"

# ⛔ NACHKONTROLLE 14.08.2026: Dieses Skript hat 14 Produkte zurück in den Google-Kanal
# publiziert, die `merchant_issue_fix.py` fünf Tage zuvor wegen von GOOGLE SELBST gemeldeter
# Richtlinienverstösse dort herausgenommen hatte (Ledger-Zeilen «zurueck-im-google-kanal» für
# 15448825659777, 15449431441793, 15485060841857 …). Der Grund: geprüft wurde nur der STATUS.
# Ein Produkt, das aus einem einzelnen KANAL gesperrt, im eigenen Shop aber weiter verkäuflich
# ist, sieht dabei aus wie ein vergessenes Produkt. Wiederholte Verstösse nach einer bereits
# erfolgten Meldung sind der Standardweg zur Merchant-Kontosperre — und Google ist der einzige
# Kanal mit belegten Verkäufen. Ab hier gilt: gesperrt heisst gesperrt, Ledger UND Tag.


def lieferantenref(sku):
    """Hat dieses Produkt eine Referenz, mit der man beim Lieferanten bestellen kann?

    ⚠️ Die ursprüngliche Prüfung war `sku.startswith(("CJ-","bb-","fortura-"))` — und damit
    zu eng. Eine Zählung über alle 29'046 aktiven Produkte am 11.08. zeigte 919 angebliche
    Artikel «ohne Lieferanten-SKU». Tatsächlich unprüfbar sind davon nur 74:

        472  Printful (POD)         SKU-Form «5599797_4012» — Druck auf Bestellung
        346  CJ-Varianten-SKU       «CJYD…», «CJLY…», «CJLX…» — gültige CJ-Referenz
         15  eigenes Bündel         «LX-BUNDLE-…» — aus eigenen Artikeln zusammengestellt
         12  BigBuy-Referenz        «BB-V0100921» — gültig, nur gross geschrieben
         74  wirklich unprüfbar     «WATCH-001», «cool-sharp», «14:691;5:200000990» …

    Die CJ-Varianten-SKU ist dieselbe Form, die `cj_versand_ch_guard.py` längst als eine von
    drei gültigen SKU-Formen behandelt. Sie hier nicht zu kennen, hat 346 verkäufliche
    Produkte grundlos aus dem Google-Kanal gehalten.
    """
    s = (sku or "").strip()
    if not s:
        return False
    if "_" in s and s.split("_")[0].isdigit():
        return True                                   # Printful: <produkt>_<variante>
    # ⚠️ 20.08.2026: `^CJ` war zu grosszügig — das Präfix ist frei tippbar. Der Juni-Import
    # legte Slugs wie «CJ-ANTIGRAV-HUMID» und «cj-bag-capri» an, die diese Prüfung bestanden
    # und dadurch im Google-Kanal landeten; bei CJ existiert dahinter nichts (1602001).
    # Geprüft wird deshalb die FORM hinter dem Präfix, nicht das Präfix selbst.
    # Gegen 1'003 aktive Produkte / 6'052 SKUs gegengeprüft: verwirft keine gültige Referenz.
    kern = re.sub(r'^cj-', '', s, flags=re.I)
    if re.match(r'^CJ[A-Z]{2}[0-9A-Z]{6,}', kern, re.I):
        return True                                   # CJ-Varianten-SKU: CJYD…/CJLY…/CJBQ…
    if re.match(r'^\d{9,}', kern):
        return True                                   # CJ-pid (lange Zahl)
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-', kern, re.I):
        return True                                   # UUID (CJ und Gelato-POD)
    if re.match(r'^bb[-_]?[SV0-9]', s, re.I):
        return True                                   # BigBuy, gross wie klein
    if re.match(r'^fortura', s, re.I):
        return True
    if re.match(r'^(LX|LXSCH)[-_]', s, re.I):
        return True                                   # eigenes Bündel aus eigener Ware
    return False


def gql(q, v=None):
    with open("/tmp/_gr.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gr.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(3)
    return {}


def main():
    rows = json.load(open(SCORES))
    qualifiziert = [r[0] for r in rows if r[1] > 0]
    auch = {g.strip() for g in os.environ.get("AUCH", "").split(",") if g.strip()}
    nachzuegler = set()
    if auch:
        nachzuegler = {r[0] for r in rows if r[1] == -1 and r[2] in auch}
        qualifiziert = qualifiziert + sorted(nachzuegler)
        print(f"zusätzlich freigegebene Gründe: {', '.join(sorted(auch))} "
              f"→ {len(nachzuegler)} Artikel", flush=True)
    print(f"bewertet {len(rows)} | qualifiziert {len(qualifiziert)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [g for g in qualifiziert if g not in done]
    print(f"noch zu prüfen: {len(offen)}", flush=True)

    sperr = gesperrte_ids()
    vorher = len(offen)
    offen = [g for g in offen if id_zahl(g) not in sperr]
    if vorher != len(offen):
        print(f"⛔ Google-Sperrliste: {vorher - len(offen)} gemeldete Richtlinienverstösse "
              f"bleiben draussen", flush=True)

    f = open(LEDGER, "a")
    zurueck = schon_drin = uebersprungen = gesperrt = 0
    gruende = {}
    for i in range(0, len(offen), 100):
        teil = offen[i:i + 100]
        d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status tags '
                'mediaCount{count} '
                'priceRangeV2{minVariantPrice{amount}} variants(first:1){nodes{sku}} '
                'g:publishedOnPublication(publicationId:"%s")}}}' % GOOG, {"ids": teil})
        for n in (d.get("data") or {}).get("nodes") or []:
            if not n:
                continue
            if tag_gesperrt(n.get("tags")):
                # Zweite Schicht neben der Ledger-Prüfung: fängt auch Produkte, die ein
                # späterer Lauf gesperrt hat und die noch in keinem Ledger stehen.
                # ⚠️ NICHT quittieren — die Sperre kann mit Unterlagen aufgehoben werden,
                # ein Ledger-Eintrag würde das Produkt für immer aus dem Kanal halten.
                gesperrt += 1
                continue
            if n["status"] != "ACTIVE":
                # Ein anderer Reiniger hat das Produkt bewusst aus dem Verkauf genommen.
                # ⚠️ Übersprungene NICHT in den Ledger schreiben — weder im Probelauf noch
                # scharf. Ein DRAFT kann morgen wieder ACTIVE sein, eine fehlende SKU kann
                # nachgetragen werden; ein Ledger-Eintrag würde das Produkt für immer
                # unsichtbar machen. Die erneute Prüfung kostet nichts, sie hängt ohnehin
                # an der Sammelabfrage.
                uebersprungen += 1
                continue
            if n["id"] in nachzuegler:
                # Etikett nicht vertrauen — die `elif`-Kette in gfeed_score.py hat die
                # übrigen Bedingungen bei diesen Artikeln nie geprüft (siehe Modulkommentar).
                bilder = ((n.get("mediaCount") or {}).get("count")) or 0
                preis = float(n["priceRangeV2"]["minVariantPrice"]["amount"])
                vs = (n.get("variants") or {}).get("nodes") or []
                sku = (vs[0].get("sku") if vs else "") or ""
                fehlt = None
                if bilder < 1:
                    fehlt = "ohne-bild"          # Merchant lehnt ohne image_link sicher ab
                elif preis <= 0:
                    fehlt = "ohne-preis"
                elif not lieferantenref(sku):
                    fehlt = "keine-lieferanten-sku"
                if fehlt:
                    uebersprungen += 1
                    gruende[fehlt] = gruende.get(fehlt, 0) + 1
                    continue
            if n["g"]:
                schon_drin += 1
                f.write(f"{n['id']}\tschon-im-kanal\n")
                continue
            if DRY:
                zurueck += 1
                continue
            r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,'
                    'input:$p){userErrors{message}}}',
                    {"id": n["id"], "p": [{"publicationId": GOOG}]})
            errs = ((r.get("data") or {}).get("publishablePublish") or {}).get("userErrors")
            if errs:
                print(f"  ⚠️ {n['id']}: {errs[0].get('message')}", flush=True)
                continue
            zurueck += 1
            f.write(f"{n['id']}\tzurueck-im-google-kanal\n")
            time.sleep(0.12)
        f.flush()
        print(f"  … {i + len(teil)}/{len(offen)} | zurück {zurueck} | "
              f"schon drin {schon_drin} | übersprungen {uebersprungen}", flush=True)
    print(f"{'(DRY) ' if DRY else ''}FERTIG: {zurueck} zurück im Google-Kanal, "
          f"{schon_drin} waren schon drin, {uebersprungen} bewusst draussen gelassen, "
          f"{gesperrt} wegen Google-Sperr-Tag draussen")
    for g, n in sorted(gruende.items(), key=lambda x: -x[1]):
        print(f"  draussen wegen {g}: {n}")


if __name__ == "__main__":
    main()
