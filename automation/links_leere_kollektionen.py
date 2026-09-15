import sys,json,re,os; sys.path.insert(0,'tools')
import verkehrsseiten_messen as V
KARTE={'premium-beauty':'beauty-pflege','naturkosmetik-beauty':'beauty-pflege',
 'beauty-marken':'beauty-pflege','smart-home-sub':'elektronik-technik',
 'bar-wein':'camping-kueche','haustier-tech':'sub-haustier','topseller':'bestseller',
 'herren-duefte':'parfum-duefte','spielzeug-puzzles':'spielzeug','wandkunst':'wohnen-dekoration',
 'tiktok-viral':'viral-hits','wellness-bundles':'beauty-pflege'}
DRY = os.environ.get('DRY')=='1'
def hole(typ):
    aus=[];cur=None
    fld='pages' if typ=='page' else 'articles'
    while True:
        d=V.gql('query($c:String){%s(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle body}}}'%fld,{'c':cur})['data'][fld]
        aus+=d['nodes']
        if not d['pageInfo']['hasNextPage']: break
        cur=d['pageInfo']['endCursor']
    return aus
ges=0
for typ in ('page','article'):
    for p in hole(typ):
        b=p['body'] or ''; neu=b; n=0
        for alt,zi in KARTE.items():
            m=re.subn(r'/collections/%s(?![a-z0-9\-])'%re.escape(alt), '/collections/'+zi, neu)
            neu, k = m[0], m[1]; n+=k
        if n and neu!=b:
            print(f"{typ}:{p['handle']}  {n} Link(s)")
            ges+=n
            if not DRY:
                mut=('mutation($id:ID!,$b:String!){pageUpdate(id:$id,page:{body:$b}){userErrors{message}}}' if typ=='page'
                     else 'mutation($id:ID!,$b:String!){articleUpdate(id:$id,article:{body:$b}){userErrors{message}}}')
                r=V.gql(mut,{'id':p['id'],'b':neu})
                key='pageUpdate' if typ=='page' else 'articleUpdate'
                ue=((r.get('data') or {}).get(key) or {}).get('userErrors')
                if ue: print("   FEHLER:",ue)
print(("DRY: " if DRY else "GEAENDERT: ")+str(ges)+" Links")
