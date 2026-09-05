import json,subprocess,time,sys,os
TOK=open('/tmp/cj_shop_token.txt').read().strip(); SHOP='au3j0y-hq.myshopify.com'
CJT=json.load(open('/tmp/cj_token.json'))['accessToken']
done=set(l.strip() for l in open('dropship/cj_reviews_done.txt') if l.strip())
cache=json.load(open('dropship/_cj_pid_cache.json')) if os.path.exists('dropship/_cj_pid_cache.json') else {}
def sh(q,v=None):
    for i in range(8):
        p=subprocess.run(['curl','-s','-X','POST',f'https://{SHOP}/admin/api/2024-10/graphql.json',
            '-H',f'X-Shopify-Access-Token: {TOK}','-H','Content-Type: application/json',
            '--data-binary',json.dumps({'query':q,'variables':v or {}})],capture_output=True,text=True)
        try: j=json.loads(p.stdout)
        except Exception: time.sleep(2); continue
        if 'errors' in j and any('hrottl' in str(e) for e in j['errors']): time.sleep(3); continue
        return j.get('data') or {}
    return {}
def cj(url):
    for i in range(10):
        p=subprocess.run(['curl','-s','-H',f'CJ-Access-Token: {CJT}',url],capture_output=True,text=True)
        try: j=json.loads(p.stdout)
        except Exception: time.sleep(2); continue
        if j.get('code')==1600200: time.sleep(1.5+i*0.5); continue   # QPS geteilt — warten, nicht abbrechen
        if j.get('code')==16900500: print('CJ-Tagesbudget leer'); sys.exit(0)
        return j
    return {}
B='https://developers.cjdropshipping.com/api2.0/v1'
Q='''query($q:String!,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor}
 nodes{id handle variants(first:1){nodes{sku}}}}}'''
for name,q in [("product_type:Schmuck","status:active AND product_type:Schmuck"),
               ("product_type:Uhren","status:active AND product_type:Uhren")]:
    c=None; kand=[]
    while len(kand)<40:
        d=sh(Q,{'q':q,'c':c}); p=d.get('products') or {}
        if not p: break
        for nd in p['nodes']:
            if nd['id'].split('/')[-1] in done: continue
            sk=(nd['variants']['nodes'] or [{}])[0].get('sku') or ''
            if sk: kand.append((nd['handle'],sk))
        if not p['pageInfo']['hasNextPage']: break
        c=p['pageInfo']['endCursor']
    kand=kand[:40]
    mit=0; komm=0; ohne_pid=0
    for h,sk in kand:
        pid=cache.get(sk)
        if not pid:
            s=sk[3:] if sk.startswith('CJ-') else sk
            j=cj(f'{B}/product/query?pid={s}') if s.isdigit() else cj(f'{B}/product/query?productSku={s}')
            pid=((j.get('data') or {}) or {}).get('pid')
            if not pid: ohne_pid+=1; continue
            cache[sk]=pid
        j=cj(f'{B}/product/productComments?pid={pid}&pageNum=1&pageSize=20')
        lst=((j.get('data') or {}) or {}).get('list') or []
        if lst: mit+=1; komm+=len(lst)
    print(f'{name:22} {len(kand):2} nie gefragt · {mit:2} mit Kommentaren ({100*mit//max(len(kand),1)}%) · {komm} Kommentare · {ohne_pid} ohne pid',flush=True)
json.dump(cache,open('dropship/_cj_pid_cache.json','w'))
