# -*- coding: utf-8 -*-
"""Google-Kategorie: offensichtlich falsche OBERKLASSE korrigieren (Diffuser als Kleidung, Napf als Küche).
Gemessen 03.09.2026: 4'565 Produkte mit Nicht-Kleidungs-Nomen im Titel geprüft, 19 offensichtlich falsch — die Klasse
ist klein und stammt aus der handkuratierten Ur-Ware. Beweislast beim Alarm: SCHUTZ-Wörter (Uhr, Nagel, Haustier …)
und productType halten alles zurück, was trotz Nomen richtig sein kann. DRY=1 (Standard) zeigt nur; DRY=0 schreibt.
Braucht /tmp/gtax.txt (Google-Taxonomie) und shop_gql aus dem Scratchpad ODER automation/google_kategorie_pruefen.gql.
"""
import sys, re, json, os, time
sys.path.insert(0, "/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad")
sys.path.insert(0, "/home/user/aban-news-landing/automation")
try:
    from shop_gql import gql
except ImportError:
    from google_kategorie_pruefen import gql
os.environ.setdefault("TAXONOMIE", "/tmp/gtax.txt")
import google_kategorie as GK
from google_kategorie_pruefen import taxonomie_laden, korrigieren
GUELTIG, NUMMERN = taxonomie_laden()
DRY = os.environ.get("DRY", "1") == "1"
LEDGER = "/home/user/aban-news-landing/dropship/_gkategorie_oberklasse.txt"
done = set(l.split("\t")[0] for l in open(LEDGER, encoding="utf-8")) if os.path.exists(LEDGER) else set()

# Nomen im Titel, die die Ware EINDEUTIG als Nicht-Kleidung/Nicht-Schmuck ausweisen, mit Zielpfad.
NOMEN = [
 (r'\b\w*(napf|futterbar|trinkbrunnen|kratzbaum|hundebett|katzenbett|hundeleine|katzenspielzeug|hundespielzeug)\b', "Animals & Pet Supplies > Pet Supplies"),
 (r'\b\w*(rucksack)\b', "Luggage & Bags > Backpacks"),
 (r'\b\w*(kochtopf|pfanne|wasserkessel|fl[öo]tenkessel|gem[üu]seschneider|abtropf\w*|sp[üu]lbecken)\b', "Home & Garden > Kitchen & Dining"),
 (r'[äa]therische\w* [öo]le?\b', "Home & Garden > Decor > Home Fragrances > Fragrance Oil"),
 (r'(aroma|duft|ultraschall|holz|reed)[- ]?diff?us(er|or)|diffusor\b|\bdiffuser\b', "Home & Garden > Decor > Home Fragrance Accessories"),
 (r'\b\w*(lichterkette|leuchte|lampe|nachtlicht|lichtleiste)\b', "Home & Garden > Lighting"),
 (r'\b\w*(speaker|lautsprecher|kopfh[öo]rer|earbuds|headset)\b', "Electronics > Audio"),
 (r'\b\w*(powerbank|ladeger[äa]t|ladestation|ladekabel|usb-kabel|netzteil)\b', "Electronics > Electronics Accessories"),
 (r'\b\w*(vase|kerzenhalter|wandbild|wandteppich|bilderrahmen)\b', "Home & Garden > Decor"),
 (r'\b\w*(teppich|badematte|fussmatte)\b', "Home & Garden > Decor > Rugs"),
]
NOMEN = [(re.compile(p, re.I), z) for p, z in NOMEN]
# Bestehende Pfade, die trotz Nomen richtig sein können → nie anfassen
SCHUTZ = re.compile(r'\b(herrenuhr|damenuhr|armbanduhr|quarzuhr|holzarmbanduhr|halskette|anh[äa]nger|ohrring|armband|ring|kleid|shirt|hoodie|jacke|hose|schuh|tasche|handtasche|geldb[öo]rse|brille|uhr|smartwatch|kost[üu]m|socken|n[äa]gel|nail|wimpern|maniküre|gel-?n[äa]gel|hund|katze|haustier|halsband|leine|tier|hut|m[üu]tze|schal|haar|gesicht|maske)\w*', re.I)
def offensichtlich_falsch(alt, titel, ziel):
    oben_alt = alt.split(" > ")[0]; oben_ziel = ziel.split(" > ")[0]
    if oben_alt == oben_ziel: return False
    if ziel.startswith("Animals"):  # Napf/Kratzbaum unter Spielzeug/Kleidung
        return not alt.startswith("Animals")
    if alt.startswith(("Apparel & Accessories > Clothing", "Apparel & Accessories > Jewelry")):
        return True
    if alt.startswith("Health & Beauty > Personal Care > Cosmetics") and ziel.startswith(("Home & Garden > Lighting","Home & Garden > Decor > Home Fragrance","Electronics")):
        return True
    if alt.startswith("Toys & Games") and ziel.startswith(("Home & Garden","Electronics")):
        return True
    return False

def suche(wort):
    cur=None; out=[]
    while True:
        d=gql('''query($q:String!,$c:String){products(first:100,query:$q,after:$c){pageInfo{hasNextPage endCursor}
          nodes{id title handle productType tags mf:metafield(namespace:"mm-google-shopping",key:"google_product_category"){id value}}}}''',
          {"q":f"status:active AND {wort}","c":cur})
        p=d["data"]["products"]; out+=p["nodes"]
        if not p["pageInfo"]["hasNextPage"] or len(out)>=1500: break
        cur=p["pageInfo"]["endCursor"]
    return out

WORTE = ["Diffuser","Diffusor","Lichterkette","Leuchte","Lampe","Nachtlicht","Speaker","Lautsprecher","Kopfhörer","Powerbank","Ladegerät","Ladestation","Kochtopf","Gemüseschneider","Vase","Napf","Trinkbrunnen","Rucksack","Teppich","Wandteppich","Kessel"]
gesehen=set(); plan=[]
for w in WORTE:
    ps=suche(w)
    for p in ps:
        if p["id"] in gesehen: continue
        gesehen.add(p["id"])
        alt=(p["mf"] or {}).get("value") or ""
        if not alt: continue
        ziel=None
        for m,z in NOMEN:
            if m.search(p["title"]): ziel=z; break
        if not ziel: continue
        if not ziel.startswith("Animals") and SCHUTZ.search(p["title"]): continue
        if ziel.startswith("Home & Garden > Lighting") and re.search(r'nagel|nail|beauty|haut|kosmetik|wimpern', p["productType"] or "", re.I): continue
        if not offensichtlich_falsch(alt, p["title"], ziel): continue
        k=GK.kategorie(p["title"], p["tags"], p["productType"])
        if k and k in GUELTIG and k.split(" > ")[0]==ziel.split(" > ")[0] and len(k)>len(ziel): ziel=k
        if ziel not in GUELTIG:
            ziel=korrigieren(ziel, GUELTIG, NUMMERN) or ziel
        if ziel not in GUELTIG: continue
        plan.append((p,alt,ziel))
print(f"geprüft {len(gesehen)} · zu korrigieren {len(plan)}")
for p,alt,ziel in plan[:80]:
    print(f"- {p['title'][:60]} | {p['productType']} | {alt} → {ziel}")
if DRY: print("DRY — nichts geschrieben"); sys.exit()
n=0
with open(LEDGER,"a",encoding="utf-8") as L:
    for p,alt,ziel in plan:
        if p["id"] in done: continue
        r=gql('''mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{value} userErrors{message}}}''',
          {"m":[{"ownerId":p["id"],"namespace":"mm-google-shopping","key":"google_product_category","type":"single_line_text_field","value":ziel}]})
        ms=r.get("data",{}).get("metafieldsSet",{})
        if ms.get("userErrors") or not ms.get("metafields") or ms["metafields"][0]["value"]!=ziel:
            print("⛔",p["title"][:50],ms); continue
        L.write(f"{p['id']}\t{p['handle']}\t{alt}\t{ziel}\n"); n+=1; time.sleep(0.3)
print("geschrieben",n)
