"""Nimmt Geräte mit medizinischer ZWECKBESTIMMUNG aus dem Verkauf — erkannt am Text, nicht am Namen.

BEFUND (14.08.2026, dropship/FEHLERSUCHE-14-08.md §medizin): Acht im August neu importierte
Geräte standen ACTIVE im Shop UND in allen sechs Kanälen, darunter «Google & YouTube» — dem
einzigen Kanal mit belegten Verkäufen (52 Klicks, +206 %, praktisch alles organisch):

  15493810356609  Smartes Temperaturpflaster für Kinder    «kontinuierliche Überwachung der
                  Körpertemperatur Ihres Kindes über 24 Stunden … besonders nützlich, wenn Ihr
                  Kind krank ist … bei 38 °C ein intelligenter Alarm» — ein klinisches
                  Thermometer mit Messfunktion, verkauft als Gadget. Bleibt der Alarm aus, ist
                  das kein Merchant-Problem mehr, sondern ein Produkthaftungsfall.
  15484629811585  2-in-1 Schlafgerät, CHF 19.90            CES (Cranial Electrotherapy
                  Stimulation) — Mikrostrom durch den Kopf.
  15483933491585  Einschlafhilfe mit EMS-Mikrostrom        Elektrostimulation, ausdrücklich
                  «für Menschen mit Stress, Angstzuständen und Schlafstörungen», dazu die
                  Aussage «ohne Nebenwirkungen».
  15481799737729  3-in-1 Ohrenschmalzentferner mit Kamera  5,5-mm-Sonde, «den Gehörgang präzise
                  zu untersuchen» — ein Endoskop für eine Körperöffnung.
  15493848367489  Korrektur-Set für eingewachsene Nägel    «Behandlung von eingewachsenen
  15493828641153  Nagelkorrektur-Pflaster-Set              Nägeln», Stärke «Severe» für «starke
                  Beschwerden» — Unguis incarnatus ist ein Krankheitsbild.
  15493851971969  Elektrisches Zahnpflege-Set              Zahnsteinentfernung in Laienhand.
  15493861998977  Baby-Pflegeset (0–6 Jahre)               enthält ein «elektronisches
                  Thermometer», einen Nasensauger und «Medikationshilfen»; stand ausgerechnet
                  unter den Tags heimwerken/werkzeug.

Dieselbe Regel fand drei ältere Ultraschall-Zahnsteinentferner (15449177457025, 15453809869185,
15454270554497, alle Juli, alle im Google-Kanal). Sie sind dasselbe Gerät wie das August-Set;
den einen zu drafte­n und die drei stehen zu lassen, wäre willkürlich gewesen.

WARUM DER ALTE WÄCHTER SIE DURCHLIESS: `medizinprodukte_guard.py` sucht Produktnamen
(«Hörgerät», «Stirnthermometer»). Er lief am 12.08. über genau diese August-Ware und draftete
vier Artikel — alle vier hiessen so, wie sein Muster sie erwartete. Die acht oben tragen ihren
Zweck nur im Beschreibungstext und heissen nach aussen «Gadget», «Beauty», «Haushalt».

QUELLE MITREPARIERT (sonst ist die Arbeit in einem Tag wieder weg): Die Muster liegen in
`automation/medizin_zweck.json` und werden von ZWEI Seiten gelesen — von hier für den Bestand
und von `automation/medizin_zweck.mjs`, das `cj_category_fill.mjs` VOR dem Anlegen aufruft.
Trifft es dort zu, wird das Produkt als DRAFT mit Tag `medizinprodukt-pruefen` angelegt und
NICHT in die Kanäle publiziert. Ware geht nicht verloren, sie wird nur nicht verkauft.

PROBELAUF über 31'398 aktive Produkte, drei Runden:
  Runde 1: 30 Treffer, 22 falsch — und drei echte blockiert.  Runde 2: 16 Treffer, 6 falsch.
  Runde 3: 10 Treffer, 0 falsch.
Aussortierte Fehltreffer (Begründung je Muster in medizin_zweck.json):
  • «Ab-hörgerät» steckt in 3 Wanzen-/Spionage-Detektoren      • Bluetooth-Ohrhörer, von der
  • «Stethoskop-Herz-Anhänger» ist eine Halskette                Maschine als «trendiges
  • «Stethoskop» Marke Widmann, «Dr. Fasnacht» = Kostüm          Hörgerät» angepriesen
  • 4 Hunde-Kauspielzeuge «reduziert Zahnstein»                • Reinigungsset FÜR Hörgeräte
  • Glättbürste «Heizmethode: PTC-Fieber» (发热 = Wärme)        • Erste-Hilfe-Set (Beatmungsmaske)
  • Luftbefeuchter/Terrarium arbeiten mit «Vernebler»          • Silberoxid-Knopfzellen nennen
  • 4 Beauty-Mikrostromgeräte (Falten, Augenpartie)              Blutzuckermessgeräte als
  • EMS-Bauchtrainer (Fitness, keine Krankheit)                  Einsatzzweck der BATTERIE
  • Ultraschallreiniger für Zahnspangen (reinigt ausserhalb des Mundes)
  • Elektrische Zahnbürste, die «Zahnstein entfernt» — zu grosses Versprechen, kein Scaler

BEWUSST NICHT ANGEFASST: Smartwatches und Armbänder, die Körpertemperatur, EKG oder Blutdruck
anzeigen. Das ist eine eigene, im Gedächtnis seit dem 12.08. notierte Baustelle (135 aktive
Wearables). Nähme dieses Muster sie mit, drafte­te ein Lauf die halbe Uhrenabteilung.

DRY=1 meldet nur. Ledger wird nach JEDER Zeile geflusht.
"""
import json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = os.path.join(HIER, "..", "dropship", "_medizin_zweck.txt")
TAG = "medizinprodukt-pruefen"
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"

M = json.load(open(os.path.join(HIER, "medizin_zweck.json"), encoding="utf-8"))
SPERRE = [(x["n"], re.compile(x["re"], re.I)) for x in M["sperre"]]
TREFFER = [(x["n"], re.compile(x["re"], re.I),
            re.compile(x["nicht"], re.I) if x.get("nicht") else None) for x in M["treffer"]]
TAGS = re.compile(r"<[^>]+>")


def medizin_zweck(titel, text):
    """Gibt (grund, fundstelle) zurück oder None. Gleiche Logik wie medizin_zweck.mjs."""
    klar = TAGS.sub(" ", f"{titel or ''} || {text or ''}")
    klar = klar.replace("&nbsp;", " ").replace("&amp;", "&")
    klar = re.sub(r"\s+", " ", klar)
    for _, c in SPERRE:
        if c.search(klar):
            return None
    for name, c, nicht in TREFFER:
        if nicht and nicht.search(klar):
            continue                      # Sperre gilt NUR für diese Regel
        m = c.search(klar)
        if m:
            return name, klar[max(0, m.start() - 60):m.start() + 130]
    return None


def gql(q, v):
    """Gibt die Antwort zurück oder None. ⚠️ Eine gescheiterte Anfrage ist KEIN Ergebnis —
    None heisst «offen», der Fall kommt beim nächsten Lauf wieder dran und darf NICHT ins
    Ledger."""
    open("/tmp/_mz.json", "w").write(json.dumps({"query": q, "variables": v}))
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", URL,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_mz.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5 + 3 * versuch)
            continue
        if d.get("errors") or not d.get("data"):
            time.sleep(5 + 3 * versuch)
            continue
        return d["data"]
    return None


def quelle():
    """Liefert (id, titel, datum, beschreibung) je aktivem Produkt.

    ⚠️ Der Voll-Export ist ein SCHNAPPSCHUSS. Beim ersten Lauf am 14.08. war er vom 12.08. —
    in den zwei Tagen dazwischen hatte der Importer ein «Kabelloses WiFi Otoskop» angelegt, das
    im Export gar nicht vorkam und live im Google-Kanal stand. Mit `SEIT=JJJJ-MM-TT` liest der
    Wächter deshalb direkt aus dem Shop statt aus der Datei; das ist der Modus für den
    täglichen Lauf, der Export nur der für den einmaligen Vollstreifzug.
    """
    seit = os.environ.get("SEIT")
    if not seit:
        for zeile in open(EXPORT, encoding="utf-8"):
            p = json.loads(zeile)
            if p.get("status") == "ACTIVE":
                yield p["id"], p["title"], p["createdAt"][:10], p.get("descriptionHtml")
        return
    q = ("query($c:String,$q:String!){products(first:100,after:$c,query:$q){"
         "pageInfo{hasNextPage endCursor} nodes{id title createdAt descriptionHtml}}}")
    cursor = None
    while True:
        d = gql(q, {"c": cursor, "q": f"status:active created_at:>={seit}"})
        if d is None:
            # Eine gescheiterte Anfrage ist KEIN Ergebnis: lieber abbrechen, als eine
            # unvollständige Liste für «nichts gefunden» zu halten.
            sys.exit("⛔ Shopify antwortet nicht — Lauf abgebrochen, nichts geändert.")
        for p in d["products"]["nodes"]:
            yield p["id"], p["title"], p["createdAt"][:10], p.get("descriptionHtml")
        if not d["products"]["pageInfo"]["hasNextPage"]:
            return
        cursor = d["products"]["pageInfo"]["endCursor"]
        time.sleep(0.3)


def main():
    kandidaten = []
    aktiv = 0
    for gid, titel, dat, html in quelle():
        aktiv += 1
        t = medizin_zweck(titel, html)
        if t:
            kandidaten.append((gid, titel, dat, t[0], t[1]))
    kandidaten.sort(key=lambda x: x[2])
    print(f"Aktive Produkte geprüft: {aktiv}   → medizinische Zweckbestimmung: {len(kandidaten)}\n",
          flush=True)
    for gid, titel, dat, grund, stelle in kandidaten:
        print(f"{dat}  {gid.split('/')[-1]}  [{grund}]  {titel[:58]}", flush=True)
        print(f"          …{stelle.strip()[:150]}…", flush=True)
    if DRY:
        print("\nDRY — nichts geschrieben.")
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    f = open(LEDGER, "a", encoding="utf-8")
    n = offen = 0
    for gid, titel, dat, grund, _ in kandidaten:
        if gid in done:
            continue
        # 1. auf DRAFT — damit fällt das Produkt aus ALLEN Kanälen, auch aus Google.
        d = gql("mutation($i:ProductInput!){productUpdate(input:$i)"
                "{product{id status} userErrors{field message}}}",
                {"i": {"id": gid, "status": "DRAFT"}})
        if not d or d["productUpdate"]["userErrors"] or \
           d["productUpdate"]["product"]["status"] != "DRAFT":
            print(f"  ⚠️ offen (kein DRAFT): {titel[:50]}", flush=True)
            offen += 1
            continue
        # 2. Tag — erst NACH der bestätigten Statusänderung, sonst trägt ein aktives
        #    Produkt die Marke «geprüft», ohne dass etwas passiert ist.
        d2 = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t)"
                 "{userErrors{field message}}}",
                 {"id": gid, "t": [TAG, "medizin-zweck-" + grund]})
        if not d2 or d2["tagsAdd"]["userErrors"]:
            print(f"  ⚠️ DRAFT gesetzt, Tag offen: {titel[:44]}", flush=True)
            offen += 1
            continue
        f.write(f"{gid}\t{grund}\t{dat}\t{titel}\n")
        f.flush()          # nach JEDER Zeile — der Prozess wird hier jederzeit abgebrochen
        os.fsync(f.fileno())
        n += 1
        print(f"  ⛔ DRAFT: {titel[:60]}", flush=True)
        time.sleep(0.35)
    print(f"\nFERTIG: {n} auf DRAFT + Tag `{TAG}`"
          f"{f', {offen} offen (nächster Lauf versucht erneut)' if offen else ''}")


if __name__ == "__main__":
    main()
