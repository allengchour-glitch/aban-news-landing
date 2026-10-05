import json,re,sys
S=sys.argv[1]
exec(open(S+"/seedlisten.py").read())
treffer={}; anfragen=0
for W in "ABC":
    j=json.load(open(S+"/suggest_roh_"+W+".json")); anfragen+=j["anfragen"]
    for k,v in j["treffer"].items(): treffer.setdefault(k,v)
print("anfragen:",anfragen,"roh:",len(treffer))
bekannt=set(json.load(open(S+"/bekannt.json")))
orte=r"zürich|zuerich|bern|basel|luzern|st\.? ?gallen|winterthur|lausanne|genf|aarau|thun|zug\b|chur|biel|lugano|wien|berlin|deutschland|österreich|münchen|hamburg|köln|frankfurt|stuttgart|zürcher|solothurn|fribourg|freiburg|schaffhausen|olten|baden|wallis|tessin|graubünden|lichtenstein|liechtenstein|italien|frankreich|türkei|polen|china|usa\b|kanton|oberland|nürnberg|dresden|leipzig|düsseldorf|dortmund|essen\b|bremen|augsburg|regensburg|ulm\b|karlsruhe|mannheim|heidelberg|innsbruck|salzburg|linz|bozen|mailand|paris|london|amsterdam|rom\b|barcelona|in meiner nähe|in der schweiz kaufen wo|wo kaufen|konstanz|lörrach|weil am rhein|singen|waldshut|bregenz|feldkirch|dornbirn|vorarlberg|süddeutschland|bodensee|emmental|in der nähe|nähe"
laeden=r"tchibo|toppreise|babyliss|govee|rituals|breitling|mepal|rotary|jochen schweizer|grossenbacher|remington|ghd|philips|oral-b|oral b|sodastream|stokke|cybex|maxi-cosi|bugaboo|chicco|hauck|joie|britax|vtech|fisher price|fisher-price|haba|brio|schleich|steiff|nici|jellycat|kärcher|yankee|woodwick|ikea|preisvergleich|idealo|manor|landi|ikea|zalando|aldi|lidl|migros|coop|jumbo|galaxus|digitec|amazon|temu|shein|otto\b|ochsner|dosenbach|h&m|h & m|c&a|zara|interdiscount|mediamarkt|media markt|fust|brack|microspot|conforama|pfister|jysk|depot|action\b|decathlon|sportxx|ebay|ricardo|tutti|wish\b|aliexpress|globus|loeb|jelmoli|ackermann|bonprix|about you|asos|hunkemöller|tally|chicorée|qualipet|fressnapf|hornbach|obi\b|bauhaus|do it|lipo|micasa|interio|vögele|voegele|schubiger|möbel|moebel|deichmann|snipes|foot locker|ikea|sb möbel|blue tomato|ochsner|intersport|bike world|rossmann|dm\b|douglas|import parfumerie|marionnaud|sephora|primark|new yorker|only\b|vero moda|esprit|benetton|s\.oliver|tom tailor|pandora|swarovski|christ\b|bucherer|rhomberg|rolex|omega|tissot|swatch|casio|fossil|garmin|fitbit|apple|iphone|samsung|huawei|xiaomi|sony|bose|jbl|philips|braun|dyson|stanley|nike|adidas|puma|new balance|vans|converse|birkenstock|crocs|ugg|timberland|dr\.? martens|lego|playmobil|barbie|hasbro|mattel|ravensburger|hot wheels|pokemon|pokémon|disney|marvel|harry potter|star wars|minecraft|roblox|fortnite|nintendo|playstation|xbox|ps5|ps4|dji|gopro|logitech|razer|canon|nikon|hama|tefal|wmf|zwilling|bodum|nespresso|delonghi|de longhi|dolce gusto|thermomix|kitchenaid|bosch|siemens|miele|v-zug|electrolux|dyson|rowenta|tchibo|north face|patagonia|mammut|jack wolfskin|columbia|salomon|lowa|meindl|hanwag|scarpa|on running|on cloud|hoka|asics|brooks|saucony|reebok|fila|champion|levis|levi's|lee\b|wrangler|diesel|calvin klein|tommy|hugo boss|lacoste|ralph lauren|gucci|prada|louis vuitton|chanel|dior|hermes|michael kors|guess|desigual|mango|bershka|pull&bear|stradivarius|uniqlo|gap\b|superdry|napapijri|canada goose|moncler|woolrich|parajumpers|wellensteyn|ikea|kärcher|karcher|makita|dewalt|einhell|parkside|black decker|gardena|weber|napoleon|coleman|thule|samsonite|rimowa|eastpak|fjällräven|fjallraven|deuter|osprey|herschel|kipling|longchamp|furla|fossil|daniel wellington|cluse|ice watch|smartphone|android|galaxy|pixel|ipad|macbook|airpods|kindle|alexa|google home|tv\b|netflix|spotify|tiktok|instagram|pinterest|youtube|facebook|wikipedia|duden|english|englisch|französisch|italienisch|spanisch"
klassen=r"barcelona|kartoffel|avent|mittelfinger|personen|wohnmobil|camper|boot\b|mülltonne|müller|kindergärtnerin|sockengröße|sockengrösse|uhrzeit|eubos|diabetisch|kiesen|staffel|vasectomy|zermatt|fotobox|geld\b|eierkarton|\bapp\b|logo|fliegengitter|geschirrspüler|spiel\b|wohnwagen|leder werkzeug|gaming zubehör deko|sale\b|größe|grösse|tabelle|s3\b|passender|registrieren|verkaufen|verkauf\b|autobahn|autofahren|vasektomie|hannover|holland|ostschweiz|graz|laufanalyse|montage|einbau|probiotisch|gold kaufen|ohne zubehör|\bqc\b|kosten|preise\b|was kostet|bewilligung|gesetz|erlaubt|verboten|schule|kindergarten|rezept|bedrucken|bedruckt|personalisier|mit namen|mit gravur|gravur|selbst gestalten|eigenem foto|mit foto|kostüm|kostuem|verkleidung|erotik|sexy|sex\b|dildo|vibrator|dessous|reizwäsche|tabak|raucher|zigarette|vape|e-zigarette|shisha|bong|grinder|cannabis|cbd|hanf|messer|klinge|schwert|waffe|pistole|gewehr|munition|pfefferspray|medikament|arznei|tablette|apotheke|rezept|lebensmittel|schokolade|essen\b|kochen|pizza|kuchen|brot\b|wein\b|bier\b|alkohol|whisky|vodka|gegen falten|gegen akne|akne|schmerzen|therapie|heilt|heilung|abnehmen|diät|krankheit|arzt|wirkung|nebenwirkung|baby ?nahrung|milchpulver|hundefutter|katzenfutter|futter\b|leckerli|snacks|kaugummi|haarwuchs|minoxidil|potenz|viagra|bleaching|zahnaufhellung|hormon|hund kaufen|katze kaufen|welpen|kitten|tierarzt|impfung|jobs?\b|stellen|lohn|gehalt|ausbildung|film|serie|lied|song|buch\b|bücher|übersetzung|übersetzen|bedeutung|wiki|was ist|wie (lange|viel|oft|geht|macht|funktioniert)|anleitung|selber machen|selbst machen|selber nähen|nähen\b|stricken\b|häkeln|muster\b|vorlage|ausmalbild|basteln mit|gebraucht|second hand|secondhand|occasion|mieten|vermieten|reparatur|reparieren|entsorgen|entsorgung|reinigen|reinigung|waschen|pflegen|pflege tipps|test\b|testsieger|vergleich|erfahrung|bewertung|forum|was tun|warum|wer |welche[rs]? |tipps|kalorien|rezepte|zutaten|bastelanleitung|ausmalen|malvorlage|schnittmuster|strickanleitung|häkelanleitung|zeichnen|zeichnung|clipart|png\b|svg\b|font|schrift|tattoo|bedeutung|synonym|grammatik|plural|definition|wie schreibt|wie heisst|geschichte|museum|verein|kurs|schule|unterricht|studium|hochzeit location|hochzeitsfotograf|restaurant|hotel|ferien|urlaub|reise(n)? nach|flug|zug (nach|ticket)|sbb|fahrplan|wetter|news|aktuell|corona|covid|steuern|versicherung|krankenkasse|bank\b|kredit|lotto|casino|porno|xxx|nackt|tagesdecke nähen|bettwäsche waschen|teppich reinigen|teppichkäfer|motten|schädling|ungeziefer|ratten|mäuse"
def schlecht(s):
    if re.search(orte,s) or re.search(laeden,s) or re.search(klassen,s): return True
    if re.search(r"\d{4}\b",s) and not re.search(r"\b(1000|2000|3000|5000)\b",s): return True  # Jahreszahlen
    if len(s)<4 or len(s.split())>6: return True
    return False
rows=[]; verworfen=0
for kw,(seed,variante) in treffer.items():
    kw=kw.strip()
    if kw in bekannt: continue
    if schlecht(kw): verworfen+=1; continue
    if kw==seed: continue
    rows.append((kw,seed,variante))
print("neu & sauber:",len(rows),"verworfen:",verworfen,"bekannt entfernt:",sum(1 for k in treffer if k in bekannt))

modif=r"damen|herren|kinder|mädchen|jungen|baby|gross|grosse|klein|kleine|xxl|lang|kurz|kurzarm|langarm|holz|edelstahl|leder|baumwolle|wolle|leinen|samt|seide|schwarz|weiss|weiß|beige|grau|rosa|gold|silber|rot|blau|grün|braun|bunt|rund|eckig|modern|vintage|elegant|warm|winter|sommer|herbst|wasserdicht|faltbar|tragbar|elektrisch|kabellos|led\b|mini|klappbar|wand|decke|tisch|boden|garten|balkon|wohnzimmer|schlafzimmer|kinderzimmer|küche|bad\b|auto|büro|für (mädchen|jungen|männer|frauen|kinder|hunde|katzen|baby|senioren|zuhause|unterwegs|draussen)|\d+ ?(cm|stück|teilig|er set|er pack|liter|l\b|m\b|w\b|zoll)|set\b|mit |ohne "
kauf=r"kaufen|günstig|online|schweiz|bestellen|shop|preis"
variante_set=set(v for kw,(seed,v) in treffer.items())
prio_seeds=[s for s,g in [(x,'a') for x in apparel]+[(x,'s') for x in shoes]+[(x,'o') for x in other[:136]]]
def score(kw,seed):
    w=len(kw.split()); sc=0
    if kw in variante_set: return -9
    if w<2: return -9
    if re.search(modif,kw): sc+=2
    if re.search(kauf,kw): sc-=1
    if 2<=w<=4: sc+=1
    if w>=5: sc-=1
    if seed.split()[0][:5] in kw: sc+=1
    return sc
by_seed={}
for kw,seed,v in rows:
    by_seed.setdefault(seed,[]).append((score(kw,seed),kw,v))
kand=[]
for seed,l in by_seed.items():
    l.sort(key=lambda x:-x[0]); l=[x for x in l if x[0]>0]
    nk=0; picked=[]
    for sc,kw,v in l:
        if re.search(kauf,kw) and not re.search(modif,kw):
            if nk>=1: continue
            nk+=1
        picked.append((sc,kw,seed))
        if len(picked)>=3: break
    for r,(sc,kw,seed) in enumerate(picked): kand.append((r, 0 if seed in prio_seeds else 1, -sc, kw, seed))
kand.sort()
# Budget: alle Prio-Seeds Runde 0, dann beste Nicht-Prio Runde 0 bis 240
r0p=[k for k in kand if k[0]==0 and k[1]==0]; r0n=[k for k in kand if k[0]==0 and k[1]==1]
auswahl=(r0p+r0n)[:240]
json.dump({"auswahl":auswahl},open(S+"/semrush_auswahl.json","w"),ensure_ascii=False,indent=0)
print("auswahl:",len(auswahl))
for k in auswahl: print(k)
import sys; sys.exit()
json.dump({"rows":rows,"kand":kand},open(S+"/auswahl.json","w"),ensure_ascii=False,indent=0)
print("kandidaten:",len(kand), "runde0:",sum(1 for k in kand if k[0]==0),"prio runde0:",sum(1 for k in kand if k[0]==0 and k[1]==0))
for k in kand[:260]: print(k)
