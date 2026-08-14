import json, random, re, sys, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import subprocess

SHOP="au3j0y-hq.myshopify.com"
prods=[]
for line in open('/tmp/export.jsonl',encoding='utf-8'):
    d=json.loads(line)
    if d.get('status')=='ACTIVE' and d.get('os'):
        pid=d['id'].split('/')[-1]
        prods.append((pid, d['title'], d['handle']))
random.seed(int(sys.argv[2]) if len(sys.argv)>2 else 7)
N=int(sys.argv[1]) if len(sys.argv)>1 else 200
sample=random.sample(prods, N)

def fetch(p):
    pid,title,handle=p
    url=f"https://judge.me/reviews/reviews_for_widget?url={SHOP}&shop_domain={SHOP}&platform=shopify&page=1&per_page=10&product_id={pid}"
    try:
        out=subprocess.run(['curl','-s','--max-time','25',url],capture_output=True,timeout=40).stdout
        d=json.loads(out)
    except Exception as e:
        return None
    revs=d.get('reviews') or []
    if not revs: return (pid,title,handle,0,0,0,[])
    ali=[]; eng=0
    for r in revs:
        for u in (r.get('pictures_urls') or []):
            o=u.get('original','')
            if 'aliexpress' in o: ali.append(o)
    return (pid,title,handle,d.get('number_of_reviews',0),len(revs),len(ali),ali[:2])

res=[]
with ThreadPoolExecutor(max_workers=8) as ex:
    for r in ex.map(fetch, sample):
        if r: res.append(r)
mit_rev=[r for r in res if r[3]>0]
mit_ali=[r for r in res if r[5]>0]
print('geprüft',len(res),'mit Bewertungen',len(mit_rev),'mit AliExpress-Bildern',len(mit_ali))
for r in mit_ali[:12]:
    print(f"  {r[1][:55]} | {r[2]} | id {r[0]} | rev {r[3]} | ali-bilder {r[5]} | {r[6][:1]}")
