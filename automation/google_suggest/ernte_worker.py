import json, subprocess, time, urllib.parse, sys, csv, re
S=sys.argv[1]
# Seeds: (seed, group) group in {apparel, shoes, other}
apparel=["kleid","midikleid","t-shirt","top","pullover","strickjacke","jeans","jacke","mantel","jumpsuit","overall","bluse","hose","leggings","rock","shorts","pyjama","nachthemd","hemd","poloshirt","hoodie","sweatshirt","weste","winterjacke","bikini","badeanzug","dirndl","regenjacke","trainingsanzug","socken","gürtel","schal","mütze","handschuhe","rucksack","tasche","uhr","armbanduhr","sonnenbrille","geldbörse","portemonnaie","hausschuhe","hausanzug"]
shoes=["schuhe","sneaker","stiefel","boots","sandalen","laufschuhe","sportschuhe","pumps","high heels","ballerinas","wanderschuhe","arbeitsschuhe","stiefeletten","winterschuhe","chelsea boots","loafer","slipper","turnschuhe","gummistiefel","plateauschuhe","ballettschuhe"]
other=["weihnachtsdeko","adventskalender","geschenk für frau","geschenk für mann","geschenk für kinder","hochzeitsgeschenk","mitbringsel","geschenkset","geschenkidee","rasierer","bartpflege","schmuck","armband","ring","halskette","kette","ohrringe","schmuckset","verlobungsring","nagellack","maniküre set","gel nägel","make up","wimpern","hautpflege","gesichtsmaske","haarpflege","glätteisen","lockenstab","haartrockner","parfum","wohndeko","aufbewahrungsbox","aufbewahrung","küchenhelfer","kissen","kissenbezug","vorhang","bastelset","malen nach zahlen","diamond painting","gartendeko","hängematte","werkzeug","akkuschrauber","werkzeugkoffer","aroma diffuser","vase","wanddeko","wandbild","poster","bilderrahmen","lampe","stehlampe","tischlampe","nachttischlampe","deckenlampe","geschenkverpackung","heizdecke","kuscheldecke","wolldecke","haushaltsgeräte","led strip","lichterkette","gadgets","ladegerät","powerbank","handyhülle","smartwatch","fitness tracker","auto zubehör","gaming zubehör","gaming stuhl","kopfhörer","bluetooth lautsprecher","drohne","kamera","webcam","pc zubehör","bürostuhl","schreibtisch","beamer","babykleidung","strampler","baby body","babydecke","hundezubehör","katzenzubehör","hundeleine","hundemantel","hundespielzeug","katzenspielzeug","futternapf","kratzbaum","hundebett","katzenbett","spielzeug","plüschtier","kuscheltier","ferngesteuertes auto","klemmbausteine","bausteine","ventilator","trikot","vr brille","reisezubehör","koffer","fitnessgeräte","yogamatte","hanteln","partydeko","luftballons","halloween deko","wanderrucksack","trekkingstöcke","camping zubehör","zelt","schlafsack","teppich","bettwäsche","aquarium","wäschekorb","puzzle","wecker","batterien","luftbefeuchter","duschvorhang","tote bag","schuhregal","taschenlampe","wandregal","foundation","reiskocher","etagere","handstaubsauger","elektrische zahnbürste","heissluftfritteuse","wasserkocher","wanduhr","usb stick","lunchbox","abendkleid","winterstiefel","nintendo switch zubehör","tagesdecke","bettdecke","sofakissen","tischdecke","badematte","mülleimer","regal","spiegel","kerzen","kerzenhalter","pflanzen deko","kunstpflanzen","grill","gartenmöbel","pool","planschbecken","sonnenschirm","kinderwagen zubehör","babyphone","lätzchen","schnuller","kinderzimmer deko","nachtlicht","sternenhimmel projektor","kinderrucksack","schulranzen","federmäppchen","trinkflasche","thermosflasche","brotdose","massagegerät","nackenkissen","heizkissen","fusswärmer","wärmflasche","elektrischer handwärmer","schneeketten","autoladegerät","handyhalterung auto","dashcam","mikrofon","ringlicht","stativ","tastatur","maus","monitor halterung","laptop ständer","usb hub","adapter","smart home","überwachungskamera","türklingel","wetterstation","luftreiniger","heizlüfter","elektrische heizung","raclette","fondue set","pfanne","messer set","schneidebrett","kaffeemaschine","milchaufschäumer","toaster","mixer","entsafter","waffeleisen","popcornmaschine","eismaschine","vorratsdosen","gewürzregal","besteck","geschirr","gläser","tassen","thermobecher","teekanne","tablett","servierplatte","bar zubehör","weinregal","flaschenöffner","yoga block","springseil","widerstandsbänder","fahrradzubehör","fahrradhelm","fahrradlicht","skibrille","skihelm","skihandschuhe","schlitten","bob","schneeschuhe","thermounterwäsche","skiunterwäsche","e-scooter zubehör","gepäckträger","angelzubehör","fernglas","kompass","taschenmesser","stirnlampe","campingstuhl","campingtisch","kühlbox","picknickdecke","strandtuch","beachbag","badetuch","bademantel","handtuch","kosmetiktasche","schminktisch","schmuckkasten","schmuckständer","uhrenbox","krawatte","fliege","manschettenknöpfe","hosenträger","haarschmuck","haarspangen","haarreif","scrunchie","ohrstecker","creolen","fussketten","piercing","perlenkette","goldkette","silberkette","edelstahl armband","damenuhr","herrenuhr","smartwatch damen","smartwatch herren","kinderuhr","kinderschmuck","freundschaftsarmband","partnerarmband","namenskette","medaillon","brosche","anstecknadel","schlüsselanhänger","tierfigur","gartenzwerg","vogelhaus","windspiel","solarlampe garten","gartenlampe","insektenhotel","hochbeet","pflanzkübel","giesskanne","gartenwerkzeug","rasenmäher zubehör","hundegeschirr","hundehalsband","katzenklo","kratzmatte","katzenbrunnen","hundenapf","katzentransportbox","hundetransportbox","hundebürste","katzenbürste","aquarium zubehör","terrarium","vogelkäfig","hamsterkäfig","nagerkäfig","kaninchenstall"]
seeds=[(s,'apparel') for s in apparel]+[(s,'shoes') for s in shoes]+[(s,'other') for s in other]
seen=set(); seeds=[x for x in seeds if not (x[0] in seen or seen.add(x[0]))]
W=sys.argv[2]
if W=="A": seeds=[x for x in seeds if x[1]!="other"]
else:
    o=[x for x in seeds if x[1]=="other"]; h=len(o)//2
    seeds=o[:h] if W=="B" else o[h:]
import os
ck=S+"/suggest_roh_"+W+".json"
done=set()
if os.path.exists(ck):
    j=json.load(open(ck)); out=j["treffer"]; done=set(j["done"]); n=j["anfragen"]

def fetch(q):
    url="https://suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=ch&q="+urllib.parse.quote(q)
    for i in range(3):
        try:
            r=subprocess.run(["curl","-sS","--max-time","15","-A","Mozilla/5.0","-H","Accept-Charset: utf-8",url],capture_output=True)
            txt=r.stdout.decode('utf-8','replace')
            j=json.loads(txt); return j[1]
        except Exception as e:
            time.sleep(2)
    return None
if not done: out={}; n=0
for seed,g in seeds:
    if seed in done: continue
    variants=[seed, seed+" kaufen", seed+" schweiz"]
    if g in ('apparel','shoes'):
        for w in ("damen","herren","kinder"):
            if w not in seed and "damen" not in seed and "herren" not in seed and "kinder" not in seed: variants.append(seed+" "+w)
    for v in variants:
        res=fetch(v); n+=1
        if res is None:
            print("FEHLER",v,flush=True); continue
        for s in res:
            s=s.strip().lower()
            if s and s not in out: out[s]=(seed,v)
        time.sleep(0.5)
    done.add(seed)
    json.dump({"anfragen":n,"treffer":out,"done":sorted(done)},open(ck,"w"),ensure_ascii=False)
    print(f"{seed}: {len(out)} gesamt",flush=True)
print("FERTIG",n,len(out))
