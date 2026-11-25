# Tore: ChatGPT-Antwortseiten (Betreiber 25.11.2026 «wie kann man chatgpt optimieren» → «ja»)

Weg: ChatGPT sucht im Netz (Bing u. a.) und verlinkt Seiten, die die Frage klar beantworten. OpenSEO-Prompt-Explorer = nur Bezahlplan
(gemessen 25.11.: «Upgrade to the paid plan», 6 Credits) → Ersatz: echte ChatGPT-Landeseiten (ShopifyQL), Search Console, Schweizer
Suchergebnisse (Firecrawl). Prüfen: `python3 tools/tore.py dropship/tore/chatgpt-antworten.md`

- [ ] T1: Bericht mit Zielfragen, Ist-Stand und Textplan liegt vor
    PRUEFUNG: f=dropship/chatgpt-antworten-2511/PLAN.md; test -s $f && grep -q "## Zielseiten" $f && echo TOR-OK
    ERWARTET: TOR-OK
- [ ] T2: Mindestens 8 Zielseiten tragen einen Antwort-Block («Häufige Fragen») mit belegten Angaben und «ab CHF 50 nach Rabatt», alte Texte gesichert
    PRUEFUNG: python3 -c "import sys,json,os;sys.path.insert(0,'automation');from seo_autopilot import gql;p='dropship/chatgpt-antworten-2511/vorher.json';v=json.load(open(p)) if os.path.exists(p) else {};ok=[h for h in v if 'Häufige Fragen' in ((gql('query(\$h:String!){c:collectionByHandle(handle:\$h){descriptionHtml}}',{'h':h})['c'] or {}).get('descriptionHtml') or '')];print(len(v),'gesichert',len(ok),'mit Block');assert len(ok)>=8;print('TOR-OK')"
    ERWARTET: TOR-OK
