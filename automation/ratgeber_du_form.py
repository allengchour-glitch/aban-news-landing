# ratgeber_du_form.py — Ratgeber elementweise von Sie auf du (Groq gpt-oss-20b). NUR MIT GEGENLESEN (Lehre 02.09.):
# das Modell duzt auch die dritte Person («Sie strahlt» → «du strahlst») und macht aus Imperativen Fragen
# («Legen Sie sich» → «Legst du dich»). Ohne WRITE=1 landet das Ergebnis in /tmp/du_form_<handle>.html; von dort
# werden die Fehler per exakter Ersetzung korrigiert und der ganze Text einmal GELESEN, bevor geschrieben wird.
import sys,re,json,os,urllib.request,difflib,time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from shop_gql import gql
KEY=re.search(r'GROQ_API_KEY=["\']?([^"\'\s]+)',open('/tmp/dienste.env').read()).group(1)
SIE=re.compile(r'\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b')
def groq(txt):
    prompt=("Ändere in diesem deutschen HTML-Fragment NUR die Anrede von «Sie» auf «du» (du/dich/dir/dein…), inklusive der zugehörigen Verbformen "
            "(sollten→solltest, stellen Sie→stellst du, achten Sie→achte). Alles andere bleibt WÖRTLICH gleich: Fakten, Zahlen, Preise, Links, HTML-Tags, "
            "Reihenfolge, Schweizer ss. Kein Satz hinzu, keiner weg. «Sie» als Personalpronomen für eine dritte Person (sie/die Lampe) bleibt unverändert. "
            "Gib NUR das geänderte Fragment zurück, ohne Erklärung, ohne Code-Fences.\n\n"+txt)
    for i in range(3):
        try:
            req=urllib.request.Request('https://api.groq.com/openai/v1/chat/completions',data=json.dumps({'model':'openai/gpt-oss-20b','temperature':0.1,'reasoning_effort':'low','max_tokens':2500,'messages':[{'role':'user','content':prompt}]}).encode(),headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json','User-Agent':'luxestyle-du-form/1.0'})
            j=json.loads(urllib.request.urlopen(req,timeout=60).read())
            c=(j.get('choices') or [{}])[0].get('message',{}).get('content','') or ''
            c=re.sub(r'^```\w*\n?|```$','',c.strip()).strip()
            if c: return c
        except Exception as e: time.sleep(2)
    return None
def norm(s): return re.sub(r'\s+',' ',s).strip()
def ok(alt,neu):
    if not neu: return 'leer'
    if re.findall(r'<[^>]+>',alt)!=re.findall(r'<[^>]+>',neu): return 'tags'
    if re.findall(r'\d+[.,]?\d*',alt)!=re.findall(r'\d+[.,]?\d*',neu): return 'zahlen'
    if re.findall(r'href="[^"]*"',alt)!=re.findall(r'href="[^"]*"',neu): return 'links'
    r=len(neu)/max(1,len(alt))
    if r<0.85 or r>1.18: return f'laenge {r:.2f}'
    if 'ß' in neu and 'ß' not in alt: return 'ß'
    return None
handle=sys.argv[1]; WRITE=os.environ.get('WRITE')=='1'
r=gql('query($q:String!){ articles(first:1, query:$q){ nodes{ id body summary } } }',{'q':'handle:'+handle})
a=r['data']['articles']['nodes'][0]; b=a['body']
# Elemente: <p>…</p>, <li>…</li>, <h2>…</h2>, <h3>…</h3> (ohne Verschachtelung von Blöcken)
parts=re.split(r'(<(?:p|li|h2|h3)\b[^>]*>.*?</(?:p|li|h2|h3)>)',b,flags=re.S)
out=[]; n_ge=0; n_ab=0; n_sie=0
for seg in parts:
    if seg.startswith('<') and re.match(r'<(p|li|h2|h3)\b',seg) and SIE.search(re.sub(r'<[^>]+>','',seg)):
        n_sie+=1
        neu=groq(seg); grund=ok(seg,neu)
        rest=len(SIE.findall(re.sub(r'<[^>]+>','',neu or '')))
        if grund or rest>1:
            n_ab+=1; print(f'  ⛔ behalten ({grund or "Sie-Rest "+str(rest)}): {norm(re.sub(r"<[^>]+>","",seg))[:90]}'); out.append(seg); continue
        n_ge+=1; out.append(neu)
        if not WRITE:
            for d in difflib.unified_diff(norm(re.sub(r'<[^>]+>','',seg)).split(' '),norm(re.sub(r'<[^>]+>','',neu)).split(' '),lineterm='',n=0):
                if d.startswith(('-','+')) and not d.startswith(('---','+++')): print('     ',d,end=' | ')
            print()
    else: out.append(seg)
neu_body=''.join(out)
print(f'{handle}: Elemente mit Sie {n_sie} · umgestellt {n_ge} · behalten {n_ab} · Sie-Rest im Text {len(SIE.findall(re.sub(r"<[^>]+>","",neu_body)))}')
if WRITE and n_ge:
    m=gql('mutation($id:ID!,$a:ArticleUpdateInput!){ articleUpdate(id:$id, article:$a){ article{ body } userErrors{ message } } }',{'id':a['id'],'a':{'body':neu_body}})
    print('WRITE', m['data']['articleUpdate']['userErrors'])
else:
    open('/tmp/du_form_'+handle+'.html','w').write(neu_body)
