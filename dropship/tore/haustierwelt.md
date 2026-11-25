# Tore: Haustierwelt `/collections/sub-haustier` besser machen (Betreiber 25.11.2026 «kannst du die seite für haustiere noch besser machen»)

Prüfen: `python3 tools/tore.py dropship/tore/haustierwelt.md`

- [ ] T1: Die ersten 24 Produkte sind Winter/Weihnachten (≥ 18 von 24 mit Winter-/Weihnachts-/Bett-Wort), höchstens 2 Geschirre/Leinen, alle aktiv und kaufbar
    PRUEFUNG: python3 -c "import sys,re;sys.path.insert(0,'automation');from seo_autopilot import gql;n=gql('{c:collectionByHandle(handle:\"sub-haustier\"){products(first:24,sortKey:COLLECTION_DEFAULT){nodes{title status variants(first:20){nodes{availableForSale}}}}}}')['c']['products']['nodes'];w=sum(bool(re.search(r'weihnacht|advent|winter|warm|mantel|jacke|pullover|strick|fleece|bett|höhle|heiz|kuschel|plüsch|kratzbaum',p['title'],re.I)) for p in n);g=sum(bool(re.search(r'geschirr|brustgurt|leine|halsband',p['title'],re.I)) and not re.search(r'weihnacht',p['title'],re.I) for p in n);k=all(p['status']=='ACTIVE' and any(v['availableForSale'] for v in p['variants']['nodes']) for p in n);print(len(n),'Winter',w,'Geschirr',g,'kaufbar',k);assert len(n)==24 and w>=18 and g<=2 and k;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T2: Keine Fremdkörper unter den seit 01.11. importierten aktiven Produkten der Haustierwelt (jedes trägt ein Tier-/Zubehörwort)
    PRUEFUNG: python3 -c "import sys,re;sys.path.insert(0,'automation');from seo_autopilot import gql;n=gql('{products(first:250,query:\"tag:kat-haustier AND status:active AND created_at:>2026-11-01\"){nodes{title}}}')['products']['nodes'];f=[p['title'] for p in n if not re.search(r'hund|katz|haustier|tier|welpe|pet|vogel|aquari|fisch|hamster|kaninch|nager|pferd|leine|halsband|geschirr|napf|kratz|futter|terrari|reptil|pfote|leckerli',p['title'],re.I)];print(len(n),'neu',len(f),'fremd',f[:5]);assert not f;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T3: Der CJ-Suchimport verlangt das Tierwort (Relevanz-Selbsttest grün, inkl. der Fehlgriffe vom 25.11.)
    PRUEFUNG: /opt/node22/bin/node automation/cj_sku_import.mjs --selbsttest 2>&1 | grep RELEVANZ-SELBSTTEST
    ERWARTET: /RELEVANZ-SELBSTTEST: (\d+)\/\1 grün/
- [ ] T4: Einleitungstext mit «ab CHF 50 nach Rabatt», alle Schnellwahl-Links zeigen auf Kollektionen mit Ware
    PRUEFUNG: python3 -c "import sys,re;sys.path.insert(0,'automation');from seo_autopilot import gql;d=gql('{c:collectionByHandle(handle:\"sub-haustier\"){descriptionHtml}}')['c']['descriptionHtml'];hs=re.findall(r'/collections/([a-z0-9-]+)',d);z=[(h,(gql('query(\$h:String!){c:collectionByHandle(handle:\$h){productsCount{count}}}',{'h':h})['c'] or {}).get('productsCount',{}).get('count',0)) for h in hs];leer=[h for h,c in z if c<5];print(len(hs),'Links',leer);assert 'ab CHF 50 nach Rabatt' in d and len(hs)>=8 and not leer;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T5: Besucher sehen die neue Reihenfolge (Browser, erstes Produkt «Roter Weihnachtspullover für Hunde»)
    PRUEFUNG: timeout 120 /opt/node22/bin/node tools/browser.mjs "https://luxestyle.ch/collections/sub-haustier?cb=$(date +%s)" 390 1600 2>&1 | grep -m1 -E "Weihnachtspullover|Beruhigungsspielzeug" | sed 's/Roter Weihnachtspullover.*/TOR-OK/'
    ERWARTET: TOR-OK
