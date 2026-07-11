# Stellt ALLE aktiven BigBuy-Produkte auf tracked+DENY mit echter Feed-Lagermenge (Ghost-Sale-Schutz).
import json,subprocess,os,time
tok=open('/tmp/shopify_tok.txt').read().strip()
DRY=os.environ.get('DRY','1')=='1'
LOC='gid://shopify/Location/109350125953'
LEDGER='dropship/_bb_track_done.txt'
done=set(open(LEDGER).read().split()) if os.path.exists(LEDGER) else set()
instock=json.load(open('/tmp/bb_instock.json'))            # {ref: qty}
instock={str(k).upper():v for k,v in instock.items()}
try: id2ref={str(k):str(v).upper() for k,v in json.load(open('/tmp/bb_id2ref_full.json')).items()}
except: id2ref={}
def refresh():
    r=subprocess.run(['curl','-s','-X','POST','https://au3j0y-hq.myshopify.com/admin/oauth/access_token','-H','Content-Type: application/json','-d',json.dumps({'client_id':os.environ['SHOPIFY_CLIENT_ID'],'client_secret':os.environ['SHOPIFY_CLIENT_SECRET'],'grant_type':'client_credentials'})],capture_output=True,text=True)
    return json.loads(r.stdout)['access_token']
def gql(q,v=None):
    global tok
    for _ in range(4):
        r=subprocess.run(['curl','-s','https://au3j0y-hq.myshopify.com/admin/api/2025-01/graphql.json','-H','X-Shopify-Access-Token: '+tok,'-H','Content-Type: application/json','-d',json.dumps({'query':q,'variables':v or {}})],capture_output=True,text=True)
        try: d=json.loads(r.stdout)
        except: time.sleep(2); continue
        if d.get('data'): return d
        if 'Throttled' in json.dumps(d.get('errors','')): time.sleep(3); continue
        tok=refresh(); time.sleep(1)
    return {}
def stock_for(sku):
    s=sku.upper().replace('BB-','')
    if s in instock: return int(instock[s])
    ref=id2ref.get(s) or id2ref.get(s.lstrip('SV'))
    if ref and ref in instock: return int(instock[ref])
    return 0   # nicht im Feed = ausverkauft → qty 0 (DENY macht es unkaufbar)
cursor=None; upd=0; instk=0; zero=0; seen=0
while True:
    q='''query($c:String){products(first:60,after:$c,query:"sku:BB-* status:active"){pageInfo{hasNextPage endCursor} edges{node{id variants(first:1){edges{node{id inventoryPolicy inventoryItem{id sku tracked}}}}}}}}'''
    r=gql(q,{'c':cursor}); p=r.get('data',{}).get('products')
    if not p: break
    for e in p['edges']:
        seen+=1; pid=e['node']['id']
        if pid in done: continue
        v=e['node']['variants']['edges']
        if not v: continue
        vn=v[0]['node']; inv=vn['inventoryItem']; sku=inv.get('sku') or ''
        if not sku.upper().startswith('BB-'): continue
        qty=stock_for(sku)
        if DRY:
            (instk if qty>0 else zero); 
            if qty>0: instk+=1
            else: zero+=1
            upd+=1
            if upd<=8: print(f'[DRY] {sku} tracked→true DENY qty={qty}')
            continue
        if qty<=0:
            # ausverkauft beim Lieferanten → DRAFT (nicht mehr zeigen) + Tag
            gql('mutation($id:ID!){productUpdate(product:{id:$id,status:DRAFT}){userErrors{message}}}',{'id':pid})
            gql('mutation($id:ID!){tagsAdd(id:$id,tags:["ausverkauft-lieferant"]){userErrors{message}}}',{'id':pid})
            zero+=1
        else:
            gql('mutation($id:ID!){inventoryItemUpdate(id:$id,input:{tracked:true}){userErrors{message}}}',{'id':inv['id']})
            gql('mutation($pid:ID!,$vid:ID!){productVariantsBulkUpdate(productId:$pid,variants:[{id:$vid,inventoryPolicy:DENY}]){userErrors{message}}}',{'pid':pid,'vid':vn['id']})
            gql('mutation($iid:ID!,$loc:ID!,$q:Int!){inventorySetQuantities(input:{name:"available",reason:"correction",ignoreCompareQuantity:true,quantities:[{inventoryItemId:$iid,locationId:$loc,quantity:$q}]}){userErrors{message}}}',{'iid':inv['id'],'loc':LOC,'q':qty})
            instk+=1
        open(LEDGER,'a').write(pid+'\n'); upd+=1
        time.sleep(0.15)
    if not p['pageInfo']['hasNextPage']: break
    cursor=p['pageInfo']['endCursor']
print(f"{'DRY ' if DRY else ''}umgestellt={upd} | lagernd(qty>0)={instk} | ausverkauft(qty0,unkaufbar)={zero} | geprüft={seen}")
