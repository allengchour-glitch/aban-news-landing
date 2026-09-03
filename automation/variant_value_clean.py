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
    """Fragt Shopify. Gibt {} NUR zurueck, wenn es wirklich nicht geht.

    ⚠️ Der Ausgangs-Proxy antwortet sporadisch mit HTTP 502 «policy context unavailable»
    (21.08.2026 gemessen: 2 von 3 Versuchen, Sekunden spaeter wieder 200). Mit vier
    Versuchen a 3 s lief das Werkzeug in diese Luecke, gab {} zurueck — und die Schleife
    unten deutete das als Katalog-Ende und meldete FERTIG nach 56 Produkten.
    Eine Drosselung oder ein Netzfehler ist nie ein Grund aufzuhoeren; er sagt nur, wie
    lange zu warten ist (dieselbe Lehre wie beim Kosten-Backfill).
    """
    p=json.dumps({"query":q,"variables":v or {}})
    for versuch in range(8):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
        except Exception:
            time.sleep(min(30, 2 ** versuch)); continue
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
            st=((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
            fehlt=max(0,(d["extensions"]["cost"].get("requestedQueryCost") or 100)-(st.get("currentlyAvailable") or 0))
            time.sleep(min(20, 1+fehlt/(st.get("restoreRate") or 100))); continue
        if "data" in d: return d
        time.sleep(min(30, 2 ** versuch))
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
# ⚠️ 29.08.2026 — «3 style», «4 style», «12 style»: CJs Nummerierung fuer Muster oder Ausfuehrung.
# Fuer die Kundin steht im Auswahlfeld dann «Farbe: 3 style» — eine Angabe, die nichts sagt.
# Gefunden am «Wasserdichten Dry Bag mit Blumenprint» (8 von 8 Werten), auf den seit heute die
# zweitgroesste Suchseite des Shops weiterleitet. Die BAD-Regel unten kannte das Muster nicht,
# der Reiniger fasste solche Optionen also gar nicht erst an.
# ⚠️ Die Nummer wird BEHALTEN, nicht weggeworfen: sie unterscheidet die Ausfuehrungen und ist
# die einzige Information, die es dazu gibt. Aus «3 style» wird «Muster 3» — geraten wird nichts.
# 03.09.2026: auch die Mehrzahl — «5 Styles» stand als einziger Wert roh zwischen
# «Muster 1» bis «Muster 6». CJ schreibt beides.
STYLENR  = re.compile(r'^\s*(\d{1,3})\s*styles?\s*$', re.I)

def clean(v):
    o = v or ''
    m = STYLENR.match(o)
    if m:
        return f'Muster {m.group(1)}'
    n = DEFITEM.sub('', o)
    n = PREFIX.sub('', n)
    # einzeln stehende Schluessel-Tokens entfernen — aber nur, wenn danach noch etwas bleibt
    toks = [t for t in re.split(r'\s+', n) if t]
    rest = [t for t in toks if not LIEFCODE.match(t.strip('-'))]
    if rest: toks = rest
    n = ' '.join(toks)
    n = re.sub(r'\s{2,}', ' ', n)          # «Army  Green» → «Army Green»
    # Ein Tabulator hinter dem Trennstrich («Green-\tWomen S») wurde sonst zu «Green- Women S».
    # Die Geschwisterwerte heissen «Green-Men S» — also den Strich direkt anschliessen.
    n = re.sub(r'(\w)-\s+(\w)', r'\1-\2', n)
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
               # ⚠️ 03.09.2026: Dieses Vorfilter-Muster ist gross-/kleinschreibungsEMPFINDLICH,
               # die Regel STYLENR dahinter nicht (re.I). «3 style» wurde deshalb repariert,
               # «3Style», «10 Style» und «1Style» nie — sie kamen am Tor gar nicht vorbei.
               # 115 Produkte trugen so weiter Lieferantencodes im Auswahlfeld. Das Tor und
               # die Regel muessen dieselbe Frage stellen; sonst prueft man zwei Dinge.
               r'|Default Item|\S\s{2,}\S|(?i:^\d{1,3}\s*style?s?\s*$)')
while True:
    d=gql('query($c:String){products(first:60,after:$c,query:"status:ACTIVE"){pageInfo{hasNextPage endCursor} nodes{id options{id name optionValues{id name}}}}}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg:
        # ⚠️ KEIN FERTIG. Eine ausgefallene Abfrage ist kein Katalog-Ende. Meldete das
        # Werkzeug hier FERTIG, traegt der Aufseher es als erledigt ab und startet es NIE
        # wieder — der Rest des Katalogs bliebe fuer immer ungeprueft. Mit PAUSE laeuft es
        # in einer Stunde weiter, der Cursor steht ja.
        print(f"PAUSE (Shopify antwortet nicht — bei {sc} Produkten, Cursor bleibt)",flush=True)
        raise SystemExit(0)
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
