# Bereitet die Eingaben vor: Beschreibungen in Stapeln zu 30, dazu Wörterbuch-Eingabe (Positionen, Optionstitel, Optionswerte, Techniken)
import json,glob,collections
T='/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/theme/'
prods=[];pl=collections.Counter();ot=collections.Counter();ov=collections.Counter();te=collections.Counter()
for f in sorted(glob.glob(T+'assets__luxe-clothing-details-s*.json')):
    sh=json.load(open(f))
    for pid,p in sh['products'].items():
        prods.append(p)
        for x in p.get('files') or []: pl[x.get('title','')]+=1
        for o in p.get('options') or []:
            ot[o.get('title','')]+=1
            v=o.get('values'); vals=list(v.values()) if isinstance(v,dict) else (v or [])
            for x in vals: ov[x if isinstance(x,str) else json.dumps(x,ensure_ascii=False)]+=1
        for t in p.get('techniques') or []: te[t.get('display_name','')]+=1
prods.sort(key=lambda p:((p.get('productType') or {}).get('id') or '',p['id']))
items=[{'id':p['id'],'titel':p.get('title'),'typ':(p.get('productType') or {}).get('id'),'description':p['description']} for p in prods if p.get('description')]
B=30
for i in range(0,len(items),B):
    json.dump(items[i:i+B],open('in/b_%02d.json'%(i//B+1),'w'),ensure_ascii=False,indent=1)
print('Beschreibungen',len(items),'Stapel',(len(items)+B-1)//B)
json.dump({'positionen':[{'en':k,'vorkommen':v} for k,v in pl.most_common()],'optionstitel':[{'en':k,'vorkommen':v} for k,v in ot.most_common()],'optionswerte':[{'en':k,'vorkommen':v} for k,v in ov.most_common()],'techniken':[{'en':k,'vorkommen':v} for k,v in te.most_common()]},open('in/woerter.json','w'),ensure_ascii=False,indent=1)
print('Wörter: Positionen',len(pl),'Optionstitel',len(ot),'Optionswerte',len(ov),'Techniken',len(te))
