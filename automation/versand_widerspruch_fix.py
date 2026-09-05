import json,subprocess,time,re,os
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(4):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
PATS=[
 (re.compile(r'<p>\s*Versand:\s*ca\.\s*\d+\s*[–-]\s*\d+\s*Tage\.?\s*</p>',re.I),""),          # doppelte Versandzeile
 (re.compile(r'Versand:\s*ca\.\s*\d+\s*[–-]\s*\d+\s*Tage\.?',re.I),""),
 # ⚠️ RICHTUNG UMGEDREHT (11.08.2026). Diese beiden Regeln schrieben «ab CHF 50» auf
 # «ab CHF 65» — sie stammen aus der Zeit, als 65 die geltende Schwelle war. Inzwischen ist
 # 50 richtig (am lebenden Warenkorb geprüft: gratis ab 50.00, sonst CHF 7.00). Dieser
 # Reiniger arbeitete also gegen `seo_versandschwelle_fix.py`: der eine setzte 65 → 50, der
 # andere 50 → 65, und je nachdem, wer zuletzt lief, stand im Shop mal das eine, mal das
 # andere. Zwei Reiniger mit gegensätzlichem Ziel sind schlimmer als gar keiner, weil das
 # Ergebnis vom Zufall abhängt und niemand den Widerspruch im Log sieht.
 (re.compile(r'Gratis[- ]Versand ab CHF 65(?![0-9])',re.I),"Gratis-Versand ab CHF 50"),
 (re.compile(r'Kostenloser Versand ab CHF 65(?![0-9])',re.I),"Gratis-Versand ab CHF 50"),
 (re.compile(r'Abholung bei TK und TEMU[^<.]*\.?',re.I),""),
 (re.compile(r'\bTEMU\b',re.I),""),
 (re.compile(r'Bei Fragen bitte den Händler kontaktieren\.?',re.I),""),
 (re.compile(r'Verpackungsmethode:\s*',re.I),"Lieferumfang: "),
]
state="/tmp/versand_cursor.txt"
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
sc=fx=0
while True:
    d=gql('query($c:String){ products(first:100,after:$c,query:"status:ACTIVE"){ pageInfo{hasNextPage endCursor} nodes{id descriptionHtml} }}',{"c":cur})
    pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        h=p["descriptionHtml"] or ""; n=h
        for pat,rep in PATS: n=pat.sub(rep,n)
        n=re.sub(r'<p>\s*</p>','',n)
        n=re.sub(r'\s{3,}',' ',n)
        if n!=h:
            gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',{"i":{"id":p["id"],"descriptionHtml":n}})
            fx+=1; time.sleep(0.18)
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]; open(state,"w").write(cur)
    if sc%500<100: print(f"gescannt {sc}, korrigiert {fx}",flush=True)
print(f"FERTIG: {sc} gescannt, {fx} korrigiert")
