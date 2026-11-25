# Tore: ChatGPT-Antwortseiten Runde 2 (26.11.2026, «sonst weiter machen»; Folgepunkte aus `dropship/chatgpt-antworten-2511/PLAN.md`)

Prüfen: `python3 tools/tore.py dropship/tore/chatgpt-antworten-runde2.md`. Sicherung vor jedem Schreiben: `dropship/chatgpt-antworten-2511/vorher-runde2.json`.

- [ ] T1: Weihnachts-Kollektionen ohne überholte Frist «Mitte November» (weihnachtspyjama-familie, weihnachtspullover), alter Text gesichert
    PRUEFUNG: python3 -c "import sys,json;sys.path.insert(0,'automation');from seo_autopilot import gql;v=json.load(open('dropship/chatgpt-antworten-2511/vorher-runde2.json'));b=[h for h in ['weihnachtspyjama-familie','weihnachtspullover'] if h not in v or 'Mitte November' in gql('query(\$h:String!){c:collectionByHandle(handle:\$h){descriptionHtml}}',{'h':h})['c']['descriptionHtml']];print(b);assert not b;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T2: Futterautomat-Produktseite mit echtem Text statt Platzhalter (≥ 500 Zeichen, ohne «Prüfe vor dem Kauf»), alter Text gesichert
    PRUEFUNG: python3 -c "import sys,json;sys.path.insert(0,'automation');from seo_autopilot import gql;v=json.load(open('dropship/chatgpt-antworten-2511/vorher-runde2.json'));d=gql('{p:productByHandle(handle:\"futterautomat-fur-katze-527488\"){descriptionHtml}}')['p']['descriptionHtml'];print(len(d));assert 'futterautomat-fur-katze-527488' in v and len(d)>=500 and 'Prüfe vor dem Kauf' not in d;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T3: kratzbaeume und licht-nachtlicht-projektor tragen einen geprüften Block «Häufige Fragen» mit Versandregel «CHF 50 … Rabatt», alter Text gesichert
    PRUEFUNG: python3 -c "import sys,json,re;sys.path.insert(0,'automation');from seo_autopilot import gql;v=json.load(open('dropship/chatgpt-antworten-2511/vorher-runde2.json'));ok=[h for h in ['kratzbaeume','licht-nachtlicht-projektor'] if h in v and (lambda d:'Häufige Fragen' in d and re.search(r'CHF 50[^<]{0,80}Rabatt',d))(gql('query(\$h:String!){c:collectionByHandle(handle:\$h){descriptionHtml}}',{'h':h})['c']['descriptionHtml'])];print(ok);assert len(ok)==2;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T4: Preis-Wächter für alle FAQ-Blöcke (Hausregel 05.10.): Selbsttest grün und im Aufseher eingetragen
    PRUEFUNG: python3 automation/faq_preis_wache.py --selbsttest 2>&1 | tail -1 && grep -q faq_preis_wache automation/fixer_keepalive.sh && echo TOR-OK
    ERWARTET: /SELBSTTEST.*OK[\s\S]*TOR-OK/
- [ ] T5: Wächter-Lauf gegen den Live-Bestand liefert eine Ampelzeile für ≥ 14 Blöcke
    PRUEFUNG: timeout 600 python3 automation/faq_preis_wache.py 2>&1 | tail -1
    ERWARTET: /FAQ-PREISE: (1[4-9]|[2-9]\d) Blöcke/
- [ ] T6: Geänderte Kollektionen per IndexNow eingereicht (Ledger)
    PRUEFUNG: grep -c -E "collections/(kratzbaeume|licht-nachtlicht-projektor|weihnachtspyjama-familie|weihnachtspullover)" dropship/_indexnow_gemeldet.tsv 2>/dev/null || grep -rl "kratzbaeume" dropship/_indexnow* 2>/dev/null | head -1
    ERWARTET: /^[1-9]|_indexnow/
