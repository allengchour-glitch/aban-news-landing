#!/usr/bin/env python3
# Vision-QA-Kontaktbogen: neueste N ACTIVE-Produkte (Tag cj-real) → PIL-Grid mit Titel-Overlay.
import os, json, urllib.request, io, sys
from PIL import Image, ImageDraw, ImageFont
N = int(os.environ.get('N', '15'))
TAG = os.environ.get('TAG', 'cj-real')
SHOP = 'au3j0y-hq.myshopify.com'
def token():
    cid=os.environ['SHOPIFY_CLIENT_ID']; cs=os.environ['SHOPIFY_CLIENT_SECRET']
    d=json.dumps({'client_id':cid,'client_secret':cs,'grant_type':'client_credentials'}).encode()
    r=urllib.request.Request(f'https://{SHOP}/admin/oauth/access_token',d,{'Content-Type':'application/json'})
    return json.load(urllib.request.urlopen(r))['access_token']
def gql(q,tok):
    r=urllib.request.Request(f'https://{SHOP}/admin/api/2025-01/graphql.json',
        json.dumps({'query':q}).encode(),{'Content-Type':'application/json','X-Shopify-Access-Token':tok})
    return json.load(urllib.request.urlopen(r))
tok=token()
q='''{ products(first:%d, sortKey:CREATED_AT, reverse:true, query:"tag:%s status:active") {
  edges { node { title createdAt featuredImage { url } } } } }''' % (N, TAG)
data=gql(q,tok)
edges=data.get('data',{}).get('products',{}).get('edges',[])
print(f'{len(edges)} Produkte')
cols=3; cell=340; pad=8; th=52
rows=(len(edges)+cols-1)//cols
sheet=Image.new('RGB',(cols*cell, rows*(cell+th)),(24,24,28))
dr=ImageDraw.Draw(sheet)
try: fnt=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
except: fnt=ImageFont.load_default()
for i,e in enumerate(edges):
    n=e['node']; r,c=divmod(i,cols); x=c*cell; y=r*(cell+th)
    dr.rectangle([x,y,x+cell,y+th],fill=(40,40,48))
    dr.text((x+6,y+4),f"#{i+1} "+n['title'][:38],font=fnt,fill=(255,255,255))
    url=(n.get('featuredImage') or {}).get('url')
    if url:
        try:
            img=Image.open(io.BytesIO(urllib.request.urlopen(url,timeout=15).read())).convert('RGB')
            img.thumbnail((cell-2*pad,cell-2*pad))
            sheet.paste(img,(x+pad,y+th+pad))
        except Exception as ex: dr.text((x+10,y+th+10),f"IMG ERR",font=fnt,fill=(255,80,80))
out=os.environ.get('OUT','/tmp/qa_sheet.png'); sheet.save(out)
print('saved',out)
with open('/tmp/qa_titles.txt','w') as f:
    for i,e in enumerate(edges): f.write(f"#{i+1} {e['node']['title']}\n")
