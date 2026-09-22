# Deterministische Sie→du-Umstellung der formelhaften Kollektionstexte; Ergebnis zum LESEN, WRITE=1 schreibt geprüfte Datei
import sys,re,json,os; sys.path.insert(0,os.path.dirname(__file__)); from shop_gql import gql
SIE=re.compile(r'\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b')
IMP={"Entdecken":"Entdecke","Profitieren":"Profitiere","Geniessen":"Geniesse","Genießen":"Geniesse","Tauchen":"Tauche","Erleben":"Erlebe","Kreieren":"Kreiere","Optimieren":"Optimiere","Vertrauen":"Vertraue","Finden":"Finde","Verwöhnen":"Verwöhne","Gönnen":"Gönn","Lassen":"Lass","Machen":"Mach","Bringen":"Bring","Stellen":"Stell","Sichern":"Sichere","Wählen":"Wähle","Holen":"Hol","Kombinieren":"Kombiniere","Stöbern":"Stöbere","Freuen":"Freu","Bestellen":"Bestelle","Sparen":"Spare","Verwandeln":"Verwandle","Nutzen":"Nutze","Erweitern":"Erweitere","Schenken":"Schenke","Überraschen":"Überrasche","Setzen":"Setze","Starten":"Starte","Feiern":"Feiere","Rüsten":"Rüste","Bereiten":"Bereite","Gestalten":"Gestalte","Schaffen":"Schaffe","Geben":"Gib","Werden":"Werde","Bleiben":"Bleib","Sorgen":"Sorge","Zeigen":"Zeig","Halten":"Halte","Verleihen":"Verleih","Ergänzen":"Ergänze","Verlassen":"Verlass","Suchen":"Suche","Fügen":"Füge","Erfüllen":"Erfülle","Runden":"Runde","Legen":"Leg","Wärmen":"Wärme","Schützen":"Schütze","Pflegen":"Pflege","Trainieren":"Trainiere","Verbessern":"Verbessere","Sammeln":"Sammle","Wünschen":"Wünsch"}
POSS={"Ihr":"dein","Ihre":"deine","Ihren":"deinen","Ihrem":"deinem","Ihrer":"deiner","Ihres":"deines"}
def um(t):
    _konj={'haben':'hast','sind':'bist','können':'kannst','möchten':'möchtest','wollen':'willst','müssen':'musst',
           'sollten':'solltest','sollen':'sollst','dürfen':'darfst','werden':'wirst','finden':'findest','brauchen':'brauchst',
           'benötigen':'benötigst','suchen':'suchst','erhalten':'erhältst','bekommen':'bekommst','wünschen':'wünschst',
           'sparen':'sparst','geniessen':'geniesst','genießen':'genießt','profitieren':'profitierst','lieben':'liebst',
           'schätzen':'schätzt','sehen':'siehst','wissen':'weisst','kennen':'kennst','bleiben':'bleibst','fühlen':'fühlst',
           'tragen':'trägst','nutzen':'nutzt','verwenden':'verwendest','behalten':'behältst','erleben':'erlebst',
           'entdecken':'entdeckst','geben':'gibst','nehmen':'nimmst','wählen':'wählst','kaufen':'kaufst','bestellen':'bestellst',
           'setzen':'setzt','planen':'planst','feiern':'feierst','kochen':'kochst','reisen':'reist','arbeiten':'arbeitest'}
    _stark={'waschen':'wäschst','lesen':'liest','fahren':'fährst','laufen':'läufst','schlafen':'schläfst','halten':'hältst','lassen':'lässt',
            'essen':'isst','treffen':'triffst','werfen':'wirfst','sprechen':'sprichst','helfen':'hilfst','vergessen':'vergisst','empfehlen':'empfiehlst',
            'fallen':'fällst','tragen':'trägst','schlagen':'schlägst','fangen':'fängst','raten':'rätst','braten':'brätst','messen':'misst','stossen':'stösst'}
    def _zweite(verb):
        """2. Person Singular für ein Verb im Infinitiv/Plural (nur Kleinbuchstaben = kein Nomen)."""
        if verb in _konj: return _konj[verb]
        if verb in _stark: return _stark[verb]
        if verb.endswith('eln'): return verb[:-3]+'elst'
        if verb.endswith('ern'): return verb[:-1]+'st'
        if not verb.endswith('en') or len(verb) < 5: return None
        st=verb[:-2]
        if st.endswith(('t','d')) or (st.endswith(('m','n')) and len(st)>2 and st[-2] not in 'aeiouäöülrmn'): return st+'est'
        if st.endswith(('s','ss','ß','z','x')): return st+'t'
        return st+'st'
    # 0) Indikativ ZUERST (hier finden Sie → hier findest du) — sonst frisst der Imperativ-Schritt das «finden»
    for v,i in [("finden","findest"),("erhalten","erhältst"),("können","kannst"),("sind","bist"),("haben","hast"),("möchten","möchtest"),("wollen","willst"),("suchen","suchst"),("brauchen","brauchst"),("sehen","siehst"),("wissen","weisst"),("benötigen","benötigst"),("bekommen","bekommst"),("werden","wirst")]:
        t=re.sub(r'(?<![.!?] )(?<!^)\b'+v+r' Sie\b',i+' du',t)
    # 1) Imperative: grossgeschrieben (Satzanfang) immer; kleingeschrieben nur nach «und/oder/,»
    for v,i in IMP.items():
        # 22.09.: «sich» → «dir» vor Nomen/Artikel/Mengenwort («Gönn dir eine Pause», «Nimm dir Zeit»), sonst «dich»
        t=re.sub(r'\b'+v+r' Sie sich\b(?=\s+(ein|eine|einen|einem|einer|etwas|mehr|genug|die|das|den|dem|der|Zeit|Ruhe|[A-ZÄÖÜ]))',(i+' dir'),t)
        t=re.sub(r'\b'+v+r' Sie sich\b',(i+' dich'),t); t=re.sub(r'\b'+v+r' Sie\b',i,t)
        vl=v[0].lower()+v[1:]; il=i[0].lower()+i[1:]
        t=re.sub(r'((?:\bund|\boder|,)\s+)'+vl+r' Sie sich\b',lambda m:m.group(1)+il+' dich',t); t=re.sub(r'((?:\bund|\boder|,)\s+)'+vl+r' Sie\b',lambda m:m.group(1)+il,t)
    # 2) «damit Sie … können» / «Ob Sie … suchen» / «wo Sie … entdecken» / «während Sie …» → du + Verbendung
    def dusatz(m):
        k,rest=m.group(1),m.group(2)
        rest=re.sub(r'\b([a-zäöüß]+en|sind)\b(?=[.,;!?]|\s*$)',lambda x:(_zweite(x.group(1)) or x.group(1)),rest,count=1)
        return k+' du'+rest
    t=re.sub(r'\b((?i:damit|ob|wo|während|wenn|bevor|falls|sobald|bis)|denen|deren|welchen|welche|welcher|wobei|womit|wofür) Sie(\s[^.,;!?]*?(?:können|möchten|wollen|suchen|benötigen|bevorzugen|wünschen|shoppen|entdecken|investieren|auswählen|überwachen|halten|tragen|feiern|planen|kochen|reisen|sparen|geniessen|genießen|erleben|brauchen|lieben|schätzen|setzen|verschenken))(?=[.,;!?<]|\s*$|\s(?:und|oder|sowie)\b)',dusatz,t)
    # 22.09.: die alte Ersatzkette «du <Verb>» hatte keinen Blick nach rechts — «du tragen müssen» wurde «du trägst müssen».
    # Jetzt EIN Ausdruck mit negativem Lookahead: vor Hilfs-/Modalverb bleibt der Infinitiv stehen (Regel 2d zieht das Modalverb nach).
    _DIREKT={'können': 'kannst', 'möchten': 'möchtest', 'wollen': 'willst', 'suchen': 'suchst', 'benötigen': 'benötigst', 'bevorzugen': 'bevorzugst', 'wünschen': 'wünschst', 'shoppen': 'shoppst', 'entdecken': 'entdeckst', 'investieren': 'investierst', 'auswählen': 'auswählst', 'überwachen': 'überwachst', 'halten': 'hältst', 'tragen': 'trägst', 'planen': 'planst', 'reisen': 'reist', 'sparen': 'sparst', 'geniessen': 'geniesst', 'erleben': 'erlebst', 'brauchen': 'brauchst', 'lieben': 'liebst', 'schätzen': 'schätzt', 'verschenken': 'verschenkst', 'feiern': 'feierst', 'kochen': 'kochst', 'setzen': 'setzt'}
    t=re.sub(r' du ('+'|'.join(sorted(_DIREKT,key=len,reverse=True))+r')\b(?! (?:haben|sein|werden|müssen|können|sollen|wollen|dürfen|möchten|lassen|hast|bist|wirst|musst|kannst|sollst|willst|darfst|möchtest|lässt|solltest|könntest|müsstest|wolltest|dürftest|hättest|wärst|würdest)\b)', lambda m: ' du '+_DIREKT[m.group(1)], t)
    # 2b) Relativ-/Konjunktionalsätze, deren Verb nicht in der Liste steht: «bei denen Sie …» → «bei denen du …»
    #     (22.09.: «denen Sie» lief in den generischen -en-Schritt und wurde «denst du»)
    # 22.09.2026 (Katalog-Vollmessung, Stichprobe 200): «Egal, ob Sie ein Finish …» blieb stehen — Konjunktionen ohne
    # Verb aus der Liste in Regel 1 gehören ebenfalls hierher (ob/wenn/falls/damit/während/bevor/nachdem/sobald/wo).
    t=re.sub(r'\b(denen|deren|dessen|welchen|welche|welcher|wobei|womit|wofür|dass|weil|sodass|(?i:ob|wenn|falls|damit|während|bevor|nachdem|sobald|wo)) Sie\b',r'\1 du',t)
    # 2c) 3.-Person-Verb + Sie als Objekt — VOR 2e/2f (22.09.: sonst wurde «lässt Sie strahlen» zu «lässt du strahlst»): «weckt Sie diskret» → «weckt dich diskret» (feste Liste, kein Raten)
    # 22.09.2026: «informiert Sie jederzeit» blieb stehen → Liste erweitert (nur 3.-Person-Verben, bei denen «Sie» nie Subjekt ist).
    t=re.sub(r'\b(weckt|begleitet|unterstützt|schützt|hält|bringt|erreicht|führt|erwartet|überzeugt|verwöhnt|inspiriert|entführt|versorgt|erinnert|motiviert|wärmt|kühlt|trägt|lässt|befreit|entlastet|verbindet|informiert|beruhigt|entspannt|unterhält|belohnt|überrascht|begeistert|fasziniert|erfrischt|pflegt|stärkt|kleidet|schmückt|beschützt|erfreut|verführt|beeindruckt|umgibt|umhüllt|begleiten|bringen|halten|unterstützen|schützen|erinnern|informieren) Sie\b',r'\1 dich',t)
    # 2f) 22.09.2026 — Imperativ am Satzanfang, der nicht in IMP steht («Wechseln Sie das Wasser» → «Wechsle das Wasser»):
    # feste Tabelle für starke Verben, sonst Stamm + e (wechseln → wechsle, ändern → ändere, achten → achte).
    # «Sie sich» → «dir» vor Nomen/Artikel/Mengenwort («Nimm dir Zeit», «Gönn dir eine Pause»), sonst «dich» («Entspann dich»).
    _IMP2={'Nehmen':'Nimm','Lesen':'Lies','Geben':'Gib','Sehen':'Sieh','Essen':'Iss','Vergessen':'Vergiss','Helfen':'Hilf','Sprechen':'Sprich',
           'Werfen':'Wirf','Treffen':'Triff','Brechen':'Brich','Fahren':'Fahr','Halten':'Halt','Laufen':'Lauf','Lassen':'Lass','Waschen':'Wasch',
           'Tragen':'Trag','Schlafen':'Schlaf','Messen':'Miss','Stossen':'Stoss','Stoßen':'Stoß','Empfehlen':'Empfiehl','Erhalten':'Erhalte',
           'Behalten':'Behalte','Beachten':'Beachte','Wählen':'Wähle','Stellen':'Stelle','Legen':'Lege','Achten':'Achte','Prüfen':'Prüfe',
           'Gönnen':'Gönn','Entspannen':'Entspann','Setzen':'Setz','Sichern':'Sichere','Bestellen':'Bestelle','Kombinieren':'Kombiniere','Schauen':'Schau','Probieren':'Probier','Testen':'Teste','Stöbern':'Stöbere','Greifen':'Greif'}
    def _imp(m):
        v, refl = m.group(1), m.group(2)
        rest = ''
        nach = m.string[m.end():m.end()+30]
        if v in IMP or v[0].upper()+v[1:] in IMP: return m.group(0)
        gross = v[0].isupper(); V = v[0].upper()+v[1:]
        if V in _IMP2: i=_IMP2[V]
        elif v.endswith('eln'): i=v[:-3]+'le'
        elif v.endswith('ern'): i=v[:-1]+'e'
        elif v.endswith('en') and len(v)>4: i=v[:-2]+'e'
        else: return m.group(0)
        if not gross: i=i[0].lower()+i[1:]
        if refl:
            naechstes = nach.strip().split(' ')[0] if nach.strip() else ''
            dativ = bool(re.match(r'^(ein|eine|einen|einem|einer|etwas|mehr|genug|die|das|den|dem|der|Zeit|Ruhe|[A-ZÄÖÜ])', naechstes))
            return i+(' dir' if dativ else ' dich')
        return i
    class _M:  # verschobene Gruppen (Kleinbuchstaben-Imperativ nach «und/oder/,»)
        def __init__(self, m): self._m=m; self.string=m.string
        def group(self, i): return self._m.group(0) if i==0 else self._m.group(i+1)
        def end(self): return self._m.end()
    def _imp2(m): return _imp(_M(m))
    t=re.sub(r'(?<![A-Za-zäöüÄÖÜ] )\b([A-ZÄÖÜ][a-zäöüß]{2,}n) Sie( sich)?(?=[ .,;!?])', _imp, t)
    t=re.sub(r'((?:\bund|\boder|,) )([a-zäöü][a-zäöüß]{2,}n) Sie( sich)?(?=[ .,;!?])', lambda m: m.group(1)+_imp2(m), t)
    # 2e) 22.09.2026 (205 Ratgeber gemessen, 635 Reste nach den Regeln oben): ein GROSSES «Sie/Ihnen» MITTEN im Satz
    # (davor ein Kleinwort oder Komma, kein Satzende) ist immer Anrede — «sie» als Plural/Produkt steht klein.
    # «wie Sie deine Decke …», «Worauf Sie beim Kauf achten sollten», «und Sie haben 30 Tage», «die Sie lieben werden».
    # Ausnahme: «für Sie und Ihn» (sie und er — Produktlinie) bleibt. Das Verb zieht Regel 2d nach.
    t=re.sub(r'(?<=[a-zäöüß,;–-] )Sie(?= (?!und Ihn\b|& Ihn\b|oder Ihn\b))', 'du', t)
    t=re.sub(r'(?<=[a-zäöüß,;–-] )Ihnen\b', 'dir', t)
    # 2d) 22.09.2026 (Katalog-Vollmessung, 10 von 120 Wandlungen wären falsch gewesen): Regel 2b tauscht nur das
    # Pronomen — das Verb am Satzteil-Ende blieb Plural («dass du immer einen Vorrat haben», «sodass du … zugreifen
    # können», «du sich frei bewegen»). Hier wird das Verb am Ende des Satzteils nachgezogen (feste Tabelle) und
    # «du sich» → «du dich». Bei zusammengesetztem Subjekt («du oder deine Liebsten … finden können») bleibt der
    # Plural richtig → kein Eingriff, wenn zwischen «du» und dem Verb ein «oder»/«und» steht.
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
        k = _zweite(verb)
        return kopf + k if k else m.group(0)
    for _ in range(2):
        t=re.sub(r'(\bdu\b[^.,;!?:<]{0,120}?\s)([a-zäöüß]{3,}(?:en|ern|eln)|sind)(?=[.,;!?:<]|\s*$|\s(?:und|oder|sowie)\b)', _nachziehen, t)
    # 2g) Verb DIREKT nach «du» im Hauptsatz («und du haben 30 Tage», «du zahlen per TWINT») → 2. Person.
    # Nur Kleinwörter auf -en/-ern/-eln, nie «dein…», nie wenn schon 2. Person (kannst/hast …).
    def _direkt(m):
        v=m.group(2)
        # «du geschlafen haben» / «du tragen müssen»: Partizip bzw. Infinitiv vor Hilfs-/Modalverb — das Verb am
        # Satzteil-Ende zieht Regel 2d nach, hier nichts anfassen
        _f = re.match(r'\s*([a-zäöüß]+)', m.string[m.end():m.end()+16])
        folgt = _f.group(1) if _f else ''
        if folgt in ('haben','sein','werden','müssen','können','sollen','wollen','dürfen','möchten','lassen','hast','bist','wirst','musst','kannst','sollst','willst','darfst','möchtest','lässt','solltest','könntest','müsstest','wolltest','dürftest','hättest','wärst','würdest'): return m.group(0)
        if v.startswith('dein') or v in ('oder','und','dann','denn','wenn','schon','eben','gegen','wegen','neben','oben','unten','zwischen','ohne','einen','keinen','meinen','seinen','ihren','diesen','jeden','allen','vielen','wenigen'): return m.group(0)
        k=_zweite(v)
        return m.group(1)+k if k else m.group(0)
    t=re.sub(r'(\bdu )([a-zäöüß]{3,}(?:en|ern|eln)|sind)\b', _direkt, t)

    t=re.sub(r'\bdu sich\b', 'du dich', t)
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
