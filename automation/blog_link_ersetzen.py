#!/usr/bin/env python3
"""blog_link_ersetzen.py — EIN totes Produkt-Linkziel in allen Blog-Artikeln durch ein von Hand geprüftes Ersatzprodukt
ersetzen (09.10.2026; erster Fall: «Seidenkissenbezug aus 100% Maulbeerseide», CJ ausgelistet, in 8 Artikeln).

Die Wache `blog_linkziele_wache.py` meldet tote Ziele (Ampel «BLOG-LINKS: N tote Ziele», /tmp/blog_linkziele.json) und
schreibt nichts. Den ERSATZ wählt ein Mensch bzw. die Session — vorher prüfen (Lehre 09.10.):
  1. Jede Angabe der Artikel stimmt auch für den Ersatz (Material, Momme, beidseitig …) — Beschreibung lesen.
  2. Hat der Ersatz bei CJ mehrere Varianten, aber im Shop keine Auswahl? `LISTE=… python3 automation/auswahl_fehlt_messen.py`,
     dann `NUR_HANDLE=… automation/auswahl_nachruesten.py` (eigener BERICHT=, sonst wird der Tagesbericht überschrieben).
     Alle vier Seidenkissen-Kandidaten hatten dieses Loch — ein Blog-Link auf so ein Produkt ergibt eine Bestellung,
     die der Bestell-Automat nicht ausführen kann.
Je Artikel: href tauschen, Preis im selben Absatz/Listenpunkt (sonst in der h3 direkt davor) auf den LIVE-Preis
(«ab CHF …», sobald die Varianten verschieden kosten). Rücklesen je Artikel, Ledger dropship/_blog_tote_links.txt,
Vorher-Bodies dropship/_blog_preise_vorher/. Schreibt nur unter dem Blog-Lock (articleUpdate ersetzt den ganzen Body):
  ALT=/products/<alt> NEU=/products/<neu> python3 automation/blog_link_ersetzen.py            # trocken
  (exec 9>/tmp/lock_blog_preise.lock; flock -w 300 9 && ALT=… NEU=… bash automation/shopify_schranke.sh \
      python3 automation/blog_link_ersetzen.py --scharf)
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALT = os.environ.get("ALT") or sys.exit("ALT=/products/<handle> fehlt")
NEU = os.environ.get("NEU") or sys.exit("NEU=/products/<handle> fehlt")
HEUTE = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
SCHARF = "--scharf" in sys.argv
LEDGER = f"{REPO}/dropship/_blog_tote_links.txt"
VORHER = f"{REPO}/dropship/_blog_preise_vorher"

p = gql('query($q:String){products(first:1,query:$q){nodes{status handle onlineStoreUrl '
        'priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}}', {"q": "handle:" + NEU.rsplit("/", 1)[1]})["products"]["nodes"][0]
assert p["status"] == "ACTIVE" and p["onlineStoreUrl"], p
lo, hi = (float(p["priceRangeV2"][k]["amount"]) for k in ("minVariantPrice", "maxVariantPrice"))
PREIS = ("ab " if hi > lo else "") + f"CHF {lo:.2f}"
print("Ersatz", NEU, PREIS)

H = json.load(open("/tmp/blog_linkziele.json"))["tote"].get(ALT, {}).get("artikel", [])
if not H:
    sys.exit(f"{ALT} steht nicht unter «tote» in /tmp/blog_linkziele.json — erst blog_linkziele_wache.py laufen lassen")
r = gql('query($q:String){articles(first:50,query:$q){nodes{id handle body}}}', {"q": " OR ".join("handle:" + h for h in H)})
arts = [a for a in r["articles"]["nodes"] if ALT in a["body"]]
print(len(arts), "Artikel mit dem toten Link")
M = "mutation($id:ID!,$b:HTML!){articleUpdate(id:$id,article:{body:$b}){userErrors{field message} article{id}}}"
PREIS_RX = re.compile(r"(?:für\s+|ab\s+)?CHF\s*\d+\.\d{2}")   # «für CHF 21.90» → «ab CHF 31.90»
ok = 0
for a in arts:
    b = a["body"]
    neu = b
    aend = []
    for m in list(re.finditer(re.escape(ALT), b))[::-1]:
        # Block um den Link: vom letzten Blockanfang davor bis zum Blockende danach
        start = max(b.rfind("<p", 0, m.start()), b.rfind("<li", 0, m.start()))
        ende_p = [x for x in (b.find("</p>", m.end()), b.find("</li>", m.end())) if x != -1]
        ende = min(ende_p) if ende_p else len(b)
        block = b[start:ende]
        preise = PREIS_RX.findall(block)
        neuer = block.replace(ALT, NEU)
        if preise:
            neuer = PREIS_RX.sub(PREIS, neuer)
        neu = neu[:start] + neuer + neu[ende:]          # rückwärts: Positionen davor bleiben gültig
        if not preise:
            # Preis steht in der Überschrift davor («<h3>2. … — CHF 21.90</h3>»), direkt vor dem Absatz
            h = b.rfind("<h3", 0, start)
            he = b.find("</h3>", h)
            if h != -1 and he != -1 and he < start and b[he:start].strip() == "</h3>" and PREIS_RX.search(b[h:he]):
                kopf = b[h:he]
                neu = neu[:h] + PREIS_RX.sub(PREIS, kopf) + neu[he:]
                aend.append(f"h3 {PREIS_RX.findall(kopf)}→{PREIS}")
        aend.append(f"{preise}→{PREIS if preise else '-'}")
    if ALT in neu:
        print("  ⚠️ Rest-Link in", a["handle"]); continue
    print(f"  {a['handle'][:60]:60} {aend}")
    if not SCHARF:
        continue
    os.makedirs(VORHER, exist_ok=True)
    vp = f"{VORHER}/{a['handle']}_{HEUTE}_linkersatz.html"
    if not os.path.exists(vp):                       # Lehre 05.10.: eine Vorher-Datei nie mit dem Nachher-Stand überschreiben
        with open(vp, "w", encoding="utf-8") as f:
            f.write(b)
    rr = gql(M, {"id": a["id"], "b": neu})["articleUpdate"]
    if rr["userErrors"]:
        print("  FEHLER", rr["userErrors"]); continue
    zurueck = gql('query($i:ID!){article(id:$i){body}}', {"i": a["id"]})["article"]["body"]
    if ALT in zurueck or NEU not in zurueck:
        print("  RÜCKLESEN ABWEICHEND", a["handle"]); continue
    ok += 1
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"artikel\t{a['id']}\t{a['handle']}\t{ALT}=>{NEU};{'/'.join(aend)}\t{HEUTE}\n")
    time.sleep(0.5)
print("FERTIG", "SCHARF" if SCHARF else "TROCKEN", ok, "geschrieben")
