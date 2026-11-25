# Tore: Mindest-Stückgewinn CHF 8 (Betreiber 26.11.2026 «2 ja»)

Trockenlauf 26.11. (Export kost28): 418'330 Varianten in ~35'000 Produkten anzuheben, Ø +CHF 3.07, Median +12.6 %; 533 Sprünge > ×1.6 nur gemeldet,
740 ohne Kosten, 0 mit Streichpreis. Start automatisch nach Black-Week-Ende (Aufseher, ab 30.11. 23 UTC). Prüfen: `python3 tools/tore.py dropship/tore/mindestgewinn.md`

- [ ] T1: Regelwerk korrekt (Selbsttest: .90-Rundung, nur erhöhen, Streichpreis/ohne Kosten/Sprung/POD-Sperre)
    PRUEFUNG: python3 automation/mindest_stueckgewinn.py --selbsttest
    ERWARTET: /SELBSTTEST OK: (\d+)\/\1/
- [ ] T2: Vor dem Black-Week-Ende schreibt das Werkzeug nichts (Abbruch mit Exit 3) — gilt bis 30.11. 23:00 UTC
    PRUEFUNG: if [ "$(date -u +%Y%m%d%H)" -ge 2026113023 ]; then echo "TOR-OK (Black Week vorbei)"; else SCHARF=1 LIMIT=1 timeout 300 python3 automation/mindest_stueckgewinn.py >/tmp/msg_t2.txt 2>&1; rc=$?; grep -q ABBRUCH /tmp/msg_t2.txt && [ $rc = 3 ] && echo TOR-OK; fi
    ERWARTET: TOR-OK
- [ ] T3: Nach dem Lauf: ≥ 300'000 Varianten angehoben, 25 Stichproben live = Ledger-Preis, Gewinn ≥ CHF 8, kein Streichpreis
    PRUEFUNG: python3 -c "import sys,random;sys.path.insert(0,'automation');from seo_autopilot import gql;z=[l.rstrip('\n').split('\t') for l in open('dropship/_mindest_stueckgewinn.tsv')];print(len(z),'Zeilen');assert len(z)>=300000;s=random.sample(z,25);n=gql('query(\$i:[ID!]!){nodes(ids:\$i){... on ProductVariant{id price compareAtPrice inventoryItem{unitCost{amount}}}}}',{'i':[x[3] for x in s]})['nodes'];m={x['id']:x for x in n if x};b=[x for x in s if x[3] in m and (abs(float(m[x[3]]['price'])-float(x[5]))>0.005 or float(m[x[3]]['price'])-float(m[x[3]]['inventoryItem']['unitCost']['amount'])<7.995 or m[x[3]]['compareAtPrice'])];print(len(m),'gelesen',len(b),'Abweichung');assert len(m)>=20 and not b;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T4: Wirkung nach 14 Tagen gemessen (Gewinn je Bestellung und Kaufquote vorher/nachher) und dem Betreiber gemeldet
    HAND: Sitzung misst ab 15.12. (ShopifyQL gross_profit/orders, conversion_rate 14 T vor/nach 01.12.); Betreiber entscheidet über Rückweg --zurueck
