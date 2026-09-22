# Deterministische Sie→du-Umstellung der formelhaften Kollektionstexte; Ergebnis zum LESEN, WRITE=1 schreibt geprüfte Datei
import sys,re,json,os; sys.path.insert(0,os.path.dirname(__file__)); from shop_gql import gql
SIE=re.compile(r'\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b')
IMP={"Entdecken":"Entdecke","Profitieren":"Profitiere","Geniessen":"Geniesse","Genießen":"Geniesse","Tauchen":"Tauche","Erleben":"Erlebe","Kreieren":"Kreiere","Optimieren":"Optimiere","Vertrauen":"Vertraue","Finden":"Finde","Verwöhnen":"Verwöhne","Gönnen":"Gönn","Lassen":"Lass","Machen":"Mach","Bringen":"Bring","Stellen":"Stell","Sichern":"Sichere","Wählen":"Wähle","Holen":"Hol","Kombinieren":"Kombiniere","Stöbern":"Stöbere","Freuen":"Freu","Bestellen":"Bestelle","Sparen":"Spare","Verwandeln":"Verwandle","Nutzen":"Nutze","Erweitern":"Erweitere","Schenken":"Schenke","Überraschen":"Überrasche","Setzen":"Setze","Starten":"Starte","Feiern":"Feiere","Rüsten":"Rüste","Bereiten":"Bereite","Gestalten":"Gestalte","Schaffen":"Schaffe","Geben":"Gib","Werden":"Werde","Bleiben":"Bleib","Sorgen":"Sorge","Zeigen":"Zeig","Halten":"Halte","Verleihen":"Verleih","Ergänzen":"Ergänze","Verlassen":"Verlass","Suchen":"Suche","Fügen":"Füge","Erfüllen":"Erfülle","Runden":"Runde","Legen":"Leg","Wärmen":"Wärme","Schützen":"Schütze","Pflegen":"Pflege","Trainieren":"Trainiere","Verbessern":"Verbessere","Sammeln":"Sammle","Wünschen":"Wünsch"}
POSS={"Ihr":"dein","Ihre":"deine","Ihren":"deinen","Ihrem":"deinem","Ihrer":"deiner","Ihres":"deines"}
def um(t):
    # 0) Indikativ ZUERST (hier finden Sie → hier findest du) — sonst frisst der Imperativ-Schritt das «finden»
    for v,i in [("finden","findest"),("erhalten","erhältst"),("können","kannst"),("sind","bist"),("haben","hast"),("möchten","möchtest"),("wollen","willst"),("suchen","suchst"),("brauchen","brauchst"),("sehen","siehst"),("wissen","weisst"),("benötigen","benötigst"),("bekommen","bekommst"),("werden","wirst")]:
        t=re.sub(r'(?<![.!?] )(?<!^)\b'+v+r' Sie\b',i+' du',t)
    # 1) Imperative: grossgeschrieben (Satzanfang) immer; kleingeschrieben nur nach «und/oder/,»
    for v,i in IMP.items():
        t=re.sub(r'\b'+v+r' Sie sich\b',(i+' dich'),t); t=re.sub(r'\b'+v+r' Sie\b',i,t)
        vl=v[0].lower()+v[1:]; il=i[0].lower()+i[1:]
        t=re.sub(r'((?:\bund|\boder|,)\s+)'+vl+r' Sie sich\b',lambda m:m.group(1)+il+' dich',t); t=re.sub(r'((?:\bund|\boder|,)\s+)'+vl+r' Sie\b',lambda m:m.group(1)+il,t)
    # 2) «damit Sie … können» / «Ob Sie … suchen» / «wo Sie … entdecken» / «während Sie …» → du + Verbendung
    def dusatz(m):
        k,rest=m.group(1),m.group(2)
        rest=re.sub(r'\b(\w+?)en\b(?=[.,;!?]|\s*$)',lambda x:x.group(1)+('est' if x.group(1).endswith(('t','d')) else 'st' if not x.group(1).endswith(('s','ß','z','x')) else 't'),rest,count=1)
        return k+' du'+rest
    t=re.sub(r'\b((?i:damit|ob|wo|während|wenn|bevor|falls|sobald|bis)|denen|deren|welchen|welche|welcher|wobei|womit|wofür) Sie(\s[^.,;!?]*?(?:können|möchten|wollen|suchen|benötigen|bevorzugen|wünschen|shoppen|entdecken|investieren|auswählen|überwachen|halten|tragen|feiern|planen|kochen|reisen|sparen|geniessen|genießen|erleben|brauchen|lieben|schätzen|setzen|verschenken))(?=[.,;!?]|\s|$)',dusatz,t)
    t=t.replace(' du können',' du kannst').replace(' du möchten',' du möchtest').replace(' du wollen',' du willst').replace(' du suchen',' du suchst').replace(' du benötigen',' du benötigst').replace(' du bevorzugen',' du bevorzugst').replace(' du wünschen',' du wünschst').replace(' du shoppen',' du shoppst').replace(' du entdecken',' du entdeckst').replace(' du investieren',' du investierst').replace(' du auswählen',' du auswählst').replace(' du überwachen',' du überwachst').replace(' du halten',' du hältst').replace(' du tragen',' du trägst').replace(' du planen',' du planst').replace(' du reisen',' du reist').replace(' du sparen',' du sparst').replace(' du geniessen',' du geniesst').replace(' du erleben',' du erlebst').replace(' du brauchen',' du brauchst').replace(' du lieben',' du liebst').replace(' du schätzen',' du schätzt').replace(' du verschenken',' du verschenkst').replace(' du feiern',' du feierst').replace(' du kochen',' du kochst').replace(' du setzen',' du setzt')
    # 2b) Relativ-/Konjunktionalsätze, deren Verb nicht in der Liste steht: «bei denen Sie …» → «bei denen du …»
    #     (22.09.: «denen Sie» lief in den generischen -en-Schritt und wurde «denst du»)
    # 22.09.2026 (Katalog-Vollmessung, Stichprobe 200): «Egal, ob Sie ein Finish …» blieb stehen — Konjunktionen ohne
    # Verb aus der Liste in Regel 1 gehören ebenfalls hierher (ob/wenn/falls/damit/während/bevor/nachdem/sobald/wo).
    t=re.sub(r'\b(denen|deren|dessen|welchen|welche|welcher|wobei|womit|wofür|dass|weil|sodass|(?i:ob|wenn|falls|damit|während|bevor|nachdem|sobald|wo)) Sie\b',r'\1 du',t)
    # 2d) 22.09.2026 (Katalog-Vollmessung, 10 von 120 Wandlungen wären falsch gewesen): Regel 2b tauscht nur das
    # Pronomen — das Verb am Satzteil-Ende blieb Plural («dass du immer einen Vorrat haben», «sodass du … zugreifen
    # können», «du sich frei bewegen»). Hier wird das Verb am Ende des Satzteils nachgezogen (feste Tabelle) und
    # «du sich» → «du dich». Bei zusammengesetztem Subjekt («du oder deine Liebsten … finden können») bleibt der
    # Plural richtig → kein Eingriff, wenn zwischen «du» und dem Verb ein «oder»/«und» steht.
    _konj={'haben':'hast','sind':'bist','können':'kannst','möchten':'möchtest','wollen':'willst','müssen':'musst',
           'sollten':'solltest','sollen':'sollst','dürfen':'darfst','werden':'wirst','finden':'findest','brauchen':'brauchst',
           'benötigen':'benötigst','suchen':'suchst','erhalten':'erhältst','bekommen':'bekommst','wünschen':'wünschst',
           'sparen':'sparst','geniessen':'geniesst','genießen':'genießt','profitieren':'profitierst','lieben':'liebst',
           'schätzen':'schätzt','sehen':'siehst','wissen':'weisst','kennen':'kennst','bleiben':'bleibst','fühlen':'fühlst',
           'tragen':'trägst','nutzen':'nutzt','verwenden':'verwendest','behalten':'behältst','erleben':'erlebst',
           'entdecken':'entdeckst','geben':'gibst','nehmen':'nimmst','wählen':'wählst','kaufen':'kaufst','bestellen':'bestellst',
           'setzen':'setzt','planen':'planst','feiern':'feierst','kochen':'kochst','reisen':'reist','arbeiten':'arbeitest'}
    def _nachziehen(m):
        kopf, verb = m.group(1), m.group(2)
        # zusammengesetztes Subjekt («du oder deine Liebsten») → Plural bleibt; «ob du Anfängerin oder Profi sind»
        # ist KEIN zusammengesetztes Subjekt (oder verbindet Prädikatsnomen) → wird konjugiert
        # (zu diesem Zeitpunkt heisst es noch «Ihre Liebsten»/«Ihr Partner» — Possessive werden erst später gewandelt → (?i))
        if re.search(r'\b(oder|und)\s+(?i:du|dein\w*|ihr\w*)\b', kopf):
            return m.group(0)
        # schon ein 2.-Person-Verb im Satzteil («du kannst sie haben») ODER direkt davor («kannst du es haben»)
        # → «haben» ist Infinitiv, nicht anfassen
        _zp = r'\b(kannst|möchtest|willst|musst|sollst|darfst|wirst|hast|bist|solltest|könntest|würdest|wolltest|müsstest)\b'
        if re.search(_zp, kopf) or re.search(_zp + r'\s*$', m.string[max(0, m.start() - 16):m.start()]):
            return m.group(0)
        return kopf + _konj[verb]
    for _ in range(2):
        t=re.sub(r'(\bdu\b[^.,;!?:<]{0,80}?\s)(' + '|'.join(_konj) + r')(?=[.,;!?<]|\s*$)', _nachziehen, t)
    t=re.sub(r'\bdu sich\b', 'du dich', t)
    # 2c) 3.-Person-Verb + Sie als Objekt: «weckt Sie diskret» → «weckt dich diskret» (feste Liste, kein Raten)
    # 22.09.2026: «informiert Sie jederzeit» blieb stehen → Liste erweitert (nur 3.-Person-Verben, bei denen «Sie» nie Subjekt ist).
    t=re.sub(r'\b(weckt|begleitet|unterstützt|schützt|hält|bringt|erreicht|führt|erwartet|überzeugt|verwöhnt|inspiriert|entführt|versorgt|erinnert|motiviert|wärmt|kühlt|trägt|lässt|befreit|entlastet|verbindet|informiert|beruhigt|entspannt|unterhält|belohnt|überrascht|begeistert|fasziniert|erfrischt|pflegt|stärkt|kleidet|schmückt|beschützt|erfreut|verführt|beeindruckt|umgibt|umhüllt|begleiten|bringen|halten|unterstützen|schützen|erinnern|informieren) Sie\b',r'\1 dich',t)
    # 3) Verb + Sie mitten im Satz: «finden Sie» → «findest du», «erhalten Sie» → «erhältst du»
    t=re.sub(r'\bfinden Sie\b','findest du',t); t=re.sub(r'\berhalten Sie\b','erhältst du',t); t=re.sub(r'\bkönnen Sie\b','kannst du',t)
    t=re.sub(r'\bsind Sie\b','bist du',t); t=re.sub(r'\bhaben Sie\b','hast du',t); t=re.sub(r'\bmöchten Sie\b','möchtest du',t); t=re.sub(r'\bwollen Sie\b','willst du',t)
    t=re.sub(r'\bsuchen Sie\b','suchst du',t); t=re.sub(r'\bbrauchen Sie\b','brauchst du',t); t=re.sub(r'\bsehen Sie\b','siehst du',t); t=re.sub(r'\bwissen Sie\b','weisst du',t)
    t=re.sub(r'\b(\w+?)en Sie\b',lambda m:(m.group(1)+('st' if not m.group(1).endswith(('s','ß','z','x','ss')) else 't'))+' du',t)   # Rest: «genießen Sie»→«geniesst du» (Schweizer ss unten)
    # 4) Possessiv/Objekt
    t=re.sub(r'\bIhnen\b','dir',t); t=re.sub(r'\bIhr(e|en|em|er|es)?\b',lambda m:'dein'+(m.group(1) or ''),t)
    t=re.sub(r'\bsich selbst\b','dich selbst',t); t=t.replace('ß','ss')
    # 5) Nachbesserungen aus der Lektüre (03.09.): Modalverb-Ketten, Imperativ nach «und»/«–», Umlaute
    t=re.sub(r'\b(\w+?)st können\b',r'\1en kannst',t); t=t.replace('könnst','kannst').replace('haltst','hältst')
    if 'Ob du' in t: t=re.sub(r'\b(bevorzug|benötig|such|brauch|wünsch)en(?=[,.])',r'\1st',t)
    for a,b in [('Stell dich dein','Stell dir dein'),('und wirst du zum','und werde zum'),('kreierst du Mode','kreiere Mode'),('und findest du die begehrtesten','und finde die begehrtesten'),('und dominierst du jede','und dominiere jede'),('– findest du das perfekte Wearable','– finde das perfekte Wearable'),('die Sie im Handumdrehen erreichen','die dich im Handumdrehen erreichen')]:
        t=t.replace(a,b)
    # 6) Relativ-/Nebensätze (Lektüre der 8 Restfälle)
    for a,b in [('was Sie für einen produktiven und effizienten Arbeitsalltag benötigen','was du für einen produktiven und effizienten Arbeitsalltag benötigst'),
                ('die Sie für jedes Abenteuer rüstet','die dich für jedes Abenteuer rüstet'),('auf Sie warten','auf dich warten'),
                ('während Sie von unserem Gratis-Versand ab CHF 50 und 30 Tagen Rückgabe profitieren','während du von unserem Gratis-Versand ab CHF 50 und 30 Tagen Rückgabe profitierst'),
                ('Ob Sie ','Ob du '),('ausstatten möchten','ausstatten möchtest'),('Reise-Essentials suchen –','Reise-Essentials suchst –'),('für Ihr Zuhause suchen –','für dein Zuhause suchst –'),('Strasssteinen bevorzugen,','Strasssteinen bevorzugst,'),('für dein Zuhause suchen –','für dein Zuhause suchst –'),('für den Abend suchen oder','für den Abend suchst oder'),('Fitness überwachen oder','Fitness überwachst oder')]:
        t=t.replace(a,b)
    t=re.sub(r'\bIhnen\b','dir',t); t=re.sub(r'\bIhr(e|en|em|er|es)?\b',lambda m:'dein'+(m.group(1) or ''),t)
    return t
# ⚠️ 04.09.2026: WACHE. Diese Datei ist ein SKRIPT und war zugleich die einzige Quelle der
# Umstell-Regeln. Wer `um()` importieren wollte, startete beim Import den ganzen Lauf — genau
# die Falle, in die die Klassen-Kontrolle heute schon einmal gelaufen ist. Ab hier laeuft nur
# noch etwas, wenn die Datei direkt aufgerufen wird.
def _lauf():
  WRITE=os.environ.get('WRITE')=='1'
  if WRITE:
      for k in json.load(open('/tmp/koll_du_det.json')):
          if not k.get('neu'): continue
          live=gql('query($id:ID!){collection(id:$id){descriptionHtml}}',{'id':k['id']})['data']['collection']['descriptionHtml']
          if live!=k['alt']: print('⚠ live geändert',k['handle']); continue
          r=gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{descriptionHtml} userErrors{message}}}',{'i':{'id':k['id'],'descriptionHtml':k['neu']}})
          cu=r['data']['collectionUpdate']; print('✔' if not cu['userErrors'] and cu['collection']['descriptionHtml']==k['neu'] else '⛔',k['handle'])
      sys.exit()
  sie=json.load(open('/tmp/koll_sie.json')); out=[]; D=open('/tmp/koll_du_det.txt','w')
  for k in sie:
      live=gql('query($id:ID!){collection(id:$id){descriptionHtml}}',{'id':k['id']})['data']['collection']['descriptionHtml'] or ''
      txt=re.sub(r'<[^>]+>','',live)
      if not SIE.search(txt): continue
      neu=um(live); rest=SIE.findall(re.sub(r'<[^>]+>','',neu))
      # «Für Sie» als Kollektionsname bleibt: Rest zulassen, wenn nur in "Für Sie"
      rest=[r for r in rest if not re.search(r'"Für Sie"|«Für Sie»',neu) or r!='Sie']
      ok= not rest and re.findall(r'<[^>]+>',live)==re.findall(r'<[^>]+>',neu) and re.findall(r'\d+',live)==re.findall(r'\d+',neu)
      D.write(f"\n### {k['handle']} {'OK' if ok else '⛔ '+str(rest)}\nALT: {re.sub(r'<[^>]+>','',live)}\nNEU: {re.sub(r'<[^>]+>','',neu)}\n")
      out.append({'id':k['id'],'handle':k['handle'],'alt':live,'neu':neu if ok else None,'rest':rest})
  json.dump(out,open('/tmp/koll_du_det.json','w'),ensure_ascii=False)
  print('gesamt',len(out),'ok',sum(1 for o in out if o['neu']),'rest',[(o['handle'],o['rest']) for o in out if not o['neu']][:20])


if __name__ == '__main__':
    _lauf()
