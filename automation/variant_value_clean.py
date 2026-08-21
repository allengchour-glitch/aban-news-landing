"""variant_value_clean.py — raeumt Lieferanten-Kauderwelsch aus der Varianten-Auswahl.

DER BEFUND (21.08.2026): In Auswahlfeldern standen rohe Lieferanten-Variantenschluessel —
«JJF91889color-Kid 3to4Y», «JJF328204 Red-Dad 3XL», «Milky White-Default Item-Default Item».
Das Auswahlfeld ist das Letzte, was jemand vor dem Kauf anklickt. 351 aktive Produkte
betroffen.

⚠️ DIESES WERKZEUG STAND IN KEINEM KEEPALIVE. Es lief einmal von Hand, seinen Fortschritt
legte es unter /tmp ab — beides weg beim naechsten Container-Wipe. Genau die Lehre vom
19.08.: «Ein Waechter, der nicht selbst bewacht wird, ist keiner.» Jetzt im fixer_keepalive
registriert, Ledger im Repo.

⚠️ NIE OHNE DRY=1 STARTEN. clean() ist absichtlich scharf (Token-weise, verwirft Codes);
was es falsch trifft, steht in 351 Auswahlfeldern gleichzeitig.

DRY=1 python3 automation/variant_value_clean.py   → meldet nur, schreibt nichts
"""
import json,subprocess,time,re,os
TOK=open("/tmp/cj_shop_token.txt").read().strip()
DRY=os.environ.get("DRY")=="1"
LEDGER="dropship/_variant_value_clean.txt"
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(4):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(3)
    return {}
M='''mutation($pid:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){
 productOptionUpdate(productId:$pid, option:$o, optionValuesToUpdate:$u, variantStrategy:LEAVE_AS_IS){ userErrors{message} }}'''
COL={"black":"Schwarz","white":"Weiss","red":"Rot","blue":"Blau","green":"Grün","yellow":"Gelb","pink":"Pink","purple":"Lila",
"gray":"Grau","grey":"Grau","brown":"Braun","orange":"Orange","beige":"Beige","navy":"Marineblau","khaki":"Khaki","gold":"Gold",
"silver":"Silber","apricot":"Apricot","wine":"Weinrot","coffee":"Kaffeebraun","army":"Armee","dark":"Dunkel","light":"Hell",
"sky":"Himmel","rose":"Rosé","ivory":"Elfenbein","champagne":"Champagner","burgundy":"Bordeaux","turquoise":"Türkis",
"leather":"Leder","surface":"","double":"","mesh":"Mesh","emerald":"Smaragd","lavender":"Lavendel","mint":"Mint","cream":"Creme","camel":"Camel","olive":"Oliv","teal":"Petrol",
"vermilion":"Zinnoberrot","and":"/","stripe":"gestreift","stripes":"gestreift","plaid":"kariert","check":"kariert",
"floral":"geblümt","print":"bedruckt","velvet":"Samt","fleece":"Fleece","lined":"gefüttert","matte":"matt","color":"","colour":"","style":"","size":"","yards":"","us":"","about":"","mm":"","generation":"","suit":"","top":"","set":"Set"}
# ⚠️⚠️ DIE ALTE REGEL HAT GROESSEN GEFRESSEN (21.08.2026, im Probelauf gefunden, NIE gelaufen).
# `CODE=^[A-Z]{0,6}\d[\w.-]*$` trifft JEDES Token mit einer Ziffer — und loeschte es. Der
# Probelauf zeigte: «110 cm»→«cm», «Girl 2Y»→«Girl», «Dad 3XL»→«Dad», «48pc», «1L», «180x70»,
# «45x45cm», «2XL», «XXXXL» — und bei einer Lesebrille «100 degrees-…»→«degrees …», also die
# Dioptrienzahl. Das sind genau die Angaben, wegen derer jemand das Auswahlfeld ueberhaupt
# oeffnet. Ueber 351 Produkte angewandt waere das schlimmer gewesen als der Lieferantencode.
#
# Deshalb loescht dieses Werkzeug keine Tokens mehr «auf Verdacht». Es macht nur noch drei
# Dinge, die nachweislich nichts wegnehmen:
#   1. CJ-Platzhalter «Default Item» entfernen (reines Rauschen),
#   2. einen vorangestellten Lieferantenschluessel abschneiden («JJF91889color-Kid 3to4Y»),
#   3. doppelte Leerzeichen und Trennzeichen-Reste glaetten.
# Farbwoerter uebersetzt es NICHT — dafuer gibt es farbwerte_uebersetzen.py mit der
# gemeinsamen Tabelle (automation/farben_de.json). Zwei Werkzeuge, die denselben Text
# gegenlaeufig anfassen, sind eine eigene Fehlerklasse (Lehre vom 11.08.).

# Ein Lieferantenschluessel: mindestens zwei Buchstaben, dann mindestens DREI Ziffern
# (JJF91889color, BXW820, CD88000SWY6, JS001). Drei Ziffern schliesst Groessen wie «2XL»,
# «3XL» und Alter wie «2Y» sicher aus.
LIEFCODE = re.compile(r'^[A-Za-z]{2,}\d{3,}[A-Za-z]*$')
# Vorangestellter Schluessel samt Trenner: «JJF328204 Red-Dad 3XL» / «JJF91889color-Kid 3to4Y»
PREFIX   = re.compile(r'^[A-Za-z]{2,}\d{3,}[A-Za-z]*(?=[\s-])[\s-]+')
DEFITEM  = re.compile(r'(?:\s*-\s*Default Item)+\s*$', re.I)

def clean(v):
    o = v or ''
    n = DEFITEM.sub('', o)
    n = PREFIX.sub('', n)
    # einzeln stehende Schluessel-Tokens entfernen — aber nur, wenn danach noch etwas bleibt
    toks = [t for t in re.split(r'\s+', n) if t]
    rest = [t for t in toks if not LIEFCODE.match(t.strip('-'))]
    if rest: toks = rest
    n = ' '.join(toks)
    n = re.sub(r'\s{2,}', ' ', n)          # «Army  Green» → «Army Green»
    n = re.sub(r'\s*-\s*-+\s*', ' - ', n)
    n = n.strip(' -,;/\t')
    if not n or len(n) < 2: return None     # nichts Brauchbares uebrig → unveraendert lassen
    if n == o: return None
    return n[:60]
state="/tmp/varval_cursor.txt"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
sc=fx=0
# ⚠️ «Default Item» und doppelte Leerzeichen fehlten hier (21.08.2026): «Milky White-Default
# Item-Default Item» und «Army  Green» trugen kein Codemuster, also fasste der Reiniger das
# ganze Auswahlfeld nicht an. 77 Produkte mit doppelten Leerzeichen blieben so stehen.
BAD=re.compile(r'^[A-Z]{2,}\d{2,}|^[A-Z0-9]{7,}$|US Size|\bYards\b|Generation \d|About \d+mm|Surface-'
               r'|Default Item|\S\s{2,}\S')
while True:
    d=gql('query($c:String){products(first:60,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor} nodes{id options{id name optionValues{id name}}}}}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        for o in p["options"]:
            vals=o["optionValues"]
            if not any(BAD.search(v["name"] or "") for v in vals): continue
            # ⚠️ KOLLISIONS-WACHE. Der alte Code liess bei zwei gleichen Ergebnissen einfach
            # das zweite aus — die Option waere dann halb bereinigt und halb roh gewesen,
            # und Shopify beantwortet ein doppeltes Ergebnis ohnehin mit «Option value
            # already exists» (dieselbe Falle wie bei den Farbwerten). Kollidiert etwas,
            # bleibt die GANZE Option unberuehrt: lieber ein Lieferantencode als eine
            # Auswahl, in der zwei Zeilen dasselbe heissen.
            neu_namen={}
            for v in vals:
                n=clean(v["name"] or "")
                neu_namen[v["id"]] = n if n else (v["name"] or "")
            endwerte=[x.strip().lower() for x in neu_namen.values()]
            if len(set(endwerte)) != len(endwerte):
                continue
            upd=[{"id":v["id"],"name":neu_namen[v["id"]]}
                 for v in vals if neu_namen[v["id"]] != (v["name"] or "")]
            if not upd: continue
            if DRY:
                fx+=1
                print(f'  ~ {p["id"].split("/")[-1]} [{o["name"]}] '
                      + ' · '.join(f'{v["name"]!r}->{n["name"]!r}'
                                   for v in vals for n in upd if n["id"]==v["id"])[:200],
                      flush=True)
                continue
            r=gql(M,{"pid":p["id"],"o":{"id":o["id"]},"u":upd})
            e=(r.get("data") or {}).get("productOptionUpdate",{}).get("userErrors")
            if e:
                print(f'  X {p["id"].split("/")[-1]}: {e[0]["message"][:70]}',flush=True)
            else:
                fx+=1
                with open(LEDGER,"a",encoding="utf-8") as lf:
                    lf.write(f'{p["id"]}\t{o["name"]}\t{len(upd)}\n')
            time.sleep(0.3)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%600<60: print(f"gescannt {sc} | Varianten-Werte bereinigt {fx}",flush=True)
print(f"FERTIG: {sc} gescannt, {fx} Optionen bereinigt")
