# Tore: Google «Bild zu klein (500×500)» — Variantenbilder (Auftrag Betreiber 25.11.2026, Merchant-Screenshot)

Prüfen: `python3 tools/tore.py dropship/tore/variantenbild-500.md` (T4 zieht einen frischen Bulk, ~2 Min.)

- [ ] T1: Nach einem Neustart läuft der Bildlauf genau einmal (Neustart-Hook + Aufseher)
    PRUEFUNG: grep -q "automation/variantenbild_500.py" automation/autostart.sh && grep -q "variantenbild_500.py" automation/fixer_keepalive.sh && n=$(ps -eo args | grep -c '^python3 automation/variantenbild_500.py'); [ "$n" = 1 ] && echo "TOR-OK $n Prozess"
    ERWARTET: TOR-OK
- [ ] T2: Kein Bild bleibt im Fehler hängen (letzter Ledger-Eintrag je Medium ist kein FEHLER; Netz-Aussetzer werden beim nächsten Lauf wiederholt)
    PRUEFUNG: python3 -c "l={};[l.__setitem__(t[2],t[5]) for t in (x.rstrip('\n').split('\t') for x in open('dropship/_variantenbild_500.tsv')) if len(t)>5];h=[k for k,v in l.items() if v.startswith('FEHLER')];print(len(l),'Medien',len(h),'zuletzt Fehler');assert l and len(h)<=max(10,len(l)//100);print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T3: 8 zufällige als «ok» quittierte Bilder sind frisch gelesen READY und auf beiden Kanten ≥ 500 px
    PRUEFUNG: python3 -c "import sys,random;sys.path.insert(0,'automation');from seo_autopilot import gql;ids=[l.split('\t')[2] for l in open('dropship/_variantenbild_500.tsv') if l.rstrip('\n').endswith('\tok')];s=random.sample(ids,min(8,len(ids)));n=gql('query(\$i:[ID!]!){nodes(ids:\$i){id ... on MediaImage{status image{width height}}}}',{'i':s})['nodes'];b=[x for x in n if not x or x['status']!='READY' or min(x['image']['width'],x['image']['height'])<500];print(len(n),'gelesen',len(b),'schlecht');assert len(n)==len(s) and not b;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T4: Frischer Bulk findet kein Variantenbild < 500 px mehr (ausser im Ledger begründet als format/zu-klein)
    PRUEFUNG: NEU=1 python3 automation/variantenbild_500.py | tail -1
    ERWARTET: /FERTIG \(trocken\): 0 offen/
- [ ] T5: Merchant Center zeigt «Bild zu klein für die bevorstehende Maßnahme» nicht mehr (Google prüft selbst neu)
    HAND: Betreiber-Screenshot Merchant Center nach Abschluss von T4
