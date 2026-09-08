import json,os,re,time,urllib.request,urllib.error
T=open('/tmp/cj_shop_token.txt').read().strip()
SCHREIB=os.environ.get('WRITE')=='1'
def gql(q,v=None,n=8):
    for i in range(n):
        try:
            r=urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                data=json.dumps({"query":q,"variables":v or {}}).encode(),
                headers={"X-Shopify-Access-Token":T,"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(r,timeout=90))
            if d.get('errors'):
                if all((e.get('extensions') or {}).get('code')=='THROTTLED' for e in d['errors']) and i<n-1:
                    time.sleep(5*(i+1)); continue
                raise RuntimeError(str(d['errors'])[:200])
            return d
        except urllib.error.URLError: time.sleep(4)
    raise RuntimeError('stumm')

# Je Seite EXAKTE Ersetzungen. Jede muss genau 1x treffen — sonst wird nichts geschrieben.
FIX = {
 ('article','einschlaf-ritual-aromatherapie-pillow-spray'): [
   ("dank 14-tägigem Rückgaberecht kannst du dein Ritual in Ruhe ausprobieren",
    "dank 30 Tagen Rückgaberecht kannst du dein Ritual in Ruhe ausprobieren")],
 ('article','rfid-schutz-geldboerse-erklaert'): [
   ("dank 14-tägigem Rückgaberecht können Sie Ihre Wahl in aller Ruhe treffen",
    "dank 30 Tagen Rückgaberecht kannst du deine Wahl in aller Ruhe treffen"),
   ("le und finden Sie das Stück, das zu Ihrem Alltag passt",
    "le und finde das Stück, das zu deinem Alltag passt")],
 ('page','warum-luxestyle'): [
   ("30 Tage Geld-zurück — bedingungslos",
    "30 Tage Rückgaberecht"),
   ("Gefällt dir was nicht? Schick es zurück. Wir erstatten. Keine komplizierten Formulare.",
    "Gefällt dir was nicht? Schick es zurück, wir erstatten. Keine komplizierten Formulare. Ausnahmen (personalisierte Ware, Hygiene-Artikel) stehen in der Rückgaberichtlinie.")],
 ('article','edelstahl-schmuck-fur-herren-2026-der-guide-fur-hypoallergene-ketten-armbander'): [
   ("Entdecke die Auswahl mit Blitzversand aus der Schweiz in unserer",
    "Entdecke die Auswahl in unserer")],
 ('page','wasserfest-schmuck-see-test'): [
   # ⚠️ Hier steht ein <strong> zwischen «· » und «30 Tage» — dieselbe Falle wie bei der
   # USA-Zusage heute frueh: ein Tag mitten in der Phrase macht jede Suche blind.
   ("🇨🇭 Schweizer Online-Shop · Versand aus der Schweiz · ",
    "🇨🇭 Schweizer Online-Shop · Lieferzeit steht auf jeder Produktseite · ")],
 ('page','damenringe-edelstahl-wasserfest'): [
   ("🇨🇭 Versand aus der Schweiz · Bezahlung mit TWINT, Klarna oder Karte",
    "🇨🇭 Schweizer Shop · Lieferzeit steht auf jeder Produktseite · Bezahlung mit TWINT, Klarna oder Karte")],
}
for (typ,h),regeln in FIX.items():
    if typ=='article':
        d=gql('query($q:String){articles(first:1,query:$q){nodes{id handle body}}}',{"q":f'handle:{h}'})
        n=d['data']['articles']['nodes']
    else:
        d=gql('query($q:String){pages(first:1,query:$q){nodes{id handle body}}}',{"q":f'handle:{h}'})
        n=d['data']['pages']['nodes']
    if not n or n[0]['handle']!=h:
        print(f"⛔ {h}: nicht exakt gefunden — uebersprungen"); continue
    gid=n[0]['id']; b=neu=n[0]['body']; ok=True
    for alt,nn in regeln:
        c=neu.count(alt)
        print(f"  {h[:44]:46} {c}x  «{alt[:52]}»")
        if c!=1: ok=False
        neu=neu.replace(alt,nn)
    if not ok: print(f"⛔ {h}: nicht genau 1x — NICHTS geschrieben\n"); continue
    if not SCHREIB: print(f"  (DRY) {h}: {len(b)} -> {len(neu)} Zeichen\n"); continue
    m='articleUpdate' if typ=='article' else 'pageUpdate'
    fld='article' if typ=='article' else 'page'
    # ⚠️ 08.09.2026: Dasselbe Feld `body`, ZWEI Typen — articleUpdate nimmt HTML!,
    # pageUpdate nimmt String. Wer einen Typ fuer beide nimmt, bekommt «Type mismatch».
    btyp = 'HTML!' if typ=='article' else 'String'
    r=gql('mutation($id:ID!,$b:%s){%s(id:$id,%s:{body:$b}){%s{id} userErrors{field message}}}'%(btyp,m,fld,fld),
          {"id":gid,"b":neu})
    res=r['data'][m]
    if res.get('userErrors'): print(f"⛔ {h}: {res['userErrors']}\n"); continue
    print(f"  ✔ {h} geschrieben (id={res[fld]['id'].split('/')[-1]})\n")
