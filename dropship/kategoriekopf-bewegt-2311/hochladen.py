import sys,os,time,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from gql import gql
TH='gid://shopify/OnlineStoreTheme/214565814663'
def lesen(n):
    r=gql('query($id:ID!,$f:[String!]){theme(id:$id){files(filenames:$f,first:5){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}',{'id':TH,'f':[n]})
    ns=r['data']['theme']['files']['nodes']; return ns[0]['body']['content'] if ns else None
for arg in sys.argv[1:]:
    name,src=arg.split('=',1); text=open(src,encoding='utf-8').read()
    vor=lesen(name)
    if vor is not None:
        open(os.path.join(os.path.dirname(src) if False else os.path.join(os.path.dirname(os.path.abspath(__file__)),'sicherung'), name.replace('/','__')+'.vor-kopf'),'w',encoding='utf-8').write(vor)
    r=gql('mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){upsertedThemeFiles{filename} userErrors{field message}}}',{'id':TH,'f':[{'filename':name,'body':{'type':'TEXT','value':text}}]})
    ue=r['data']['themeFilesUpsert']['userErrors']
    if ue: print(name,'FEHLER',ue); sys.exit(1)
    for i in range(18):
        if lesen(name)==text: print(name,'geschrieben',time.strftime('%H:%M:%S',time.gmtime()),'UTC, Rücklesen GLEICH', 'neu' if vor is None else 'ersetzt'); break
        time.sleep(10)
    else: print(name,'Rücklesen UNGLEICH'); sys.exit(1)
