#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""artikelnummer_entfernen.py — Lieferanten-Artikelnummern aus dem KUNDENTEXT (04.09.2026).

Gefunden beim Lesen der Sie->du-Diffs: «Dieses Produkt, mit der Artikelnummer
Ltao754773932300, bietet …». Das ist die Leak-Klasse aus Regel 3 des Gedaechtnisses, nur
eine Ebene tiefer als der Titel — 18 aktive Produkte trugen sie.

⚠️ NICHT PAUSCHAL: «BRUDER Frontlader-Zubehoer mit Artikelnummer 02318» ist eine ECHTE
Herstellernummer einer echten Marke, nach der Sammler suchen. Sie bleibt (dieselbe
Unterscheidung wie UV400 / TR90 / SR626SW, Lehre 11.08.).
⚠️ Und der Verweis auf eine FREMDE Nummer («Batterien findest du unter der Artikelnummer
OS16349») ist fuer die Kundin wertlos — dort faellt der ganze Halbsatz, nicht nur die Nummer.
⚠️ Die erste Fassung war NON-GREEDY und schnitt aus «OS16349» ein «S16349» heraus: ein
Code-Fragment ist schlimmer als der ganze Code (Lehre 21.08.).

  DRY=1  nur zeigen
Ledger: dropship/_artikelnummer_entfernt.txt
"""
DRY = os.environ.get('DRY')=='1'
# BEHALTEN: echte Herstellernummern einer benannten Marke (BRUDER 02318 finden Sammler wirklich).
BEHALTEN = re.compile(r'BRUDER', re.I)
# Muster: der ganze Satz/Halbsatz, der nur die Lieferantennummer traegt.
REGELN = [
 (re.compile(r'\s*,?\s*mit der Artikelnummer\s+[A-Za-z0-9._/-]+\s*,?'), ' '),
 (re.compile(r'\s*Mit der Artikelnummer\s+[A-Za-z0-9._/-]+\s+ist\s+', re.I), ' '),
 (re.compile(r'\s*Die Artikelnummer (?:ist|lautet)\s+[A-Za-z0-9._/-]+\.?'), ''),
 # ⚠️ Der Verweis auf eine FREMDE Artikelnummer ist fuer die Kundin wertlos (sie kann nicht
 # danach suchen) — der ganze Halbsatz faellt, nicht nur die Nummer.
 (re.compile(r'\s*Die dazu passenden [^.<]{0,40}findest du unter der Artikelnummer\s+[A-Za-z0-9._/-]+\.?'),
  ' Passende Batterien sind separat erhältlich.'),
 # ⚠️ GREEDY bis zum Wortende: non-greedy schnitt aus «OS16349» ein «S16349» heraus —
 # ein Code-Fragment ist schlimmer als der ganze Code (Lehre 21.08.).
 (re.compile(r'\s*Artikelnummer[:\s]+[A-Za-z0-9._/-]+'), ' '),
 (re.compile(r'\s*Artikelnummer:\s+[A-Za-zÄÖÜäöü]+(?:\s+[A-Za-zÄÖÜäöü]+)?(?=\s*(?:<|·|$))'), ' '),
 (re.compile(r'\s*Der Artikel hat die Artikelnummer\s+[^.<]{1,40}\.?'), ''),
 (re.compile(r'\s*Artikelnummer\s+[A-Za-z0-9._/-]+\.?'), ''),
]
r=gql('{products(first:30,query:"status:active AND \\"Artikelnummer\\""){nodes{id title descriptionHtml}}}')
n=aend=0
for p in (r.get('data') or {}).get('products',{}).get('nodes',[]):
    n+=1; h=p['descriptionHtml'] or ''
    if BEHALTEN.search(p['title']) or BEHALTEN.search(h):
        print('  ↷ behalten (echte Marke):',p['title'][:40]); continue
    neu=h
    for rx,er in REGELN: neu=rx.sub(er,neu)
    neu=re.sub(r'\s{2,}',' ',neu).replace(' .','.').replace(' ,',',')
    if neu==h: print('  ? keine Regel greift:',p['title'][:40]); continue
    klar=lambda x: re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',x))
    if 'artikelnummer' in klar(neu).lower():
        print('  ! Rest bleibt:',p['title'][:38],'|',re.search(r'.{0,30}[Aa]rtikelnummer.{0,30}',klar(neu)).group(0)[:60]); continue
    if len(neu) < len(h)*0.80:
        print('  ! zu viel weg:',p['title'][:40]); continue
    if DRY:
        m=re.search(r'.{0,55}',klar(neu)); print(f'  ~ {p["title"][:34]:34} → …{klar(h)[:0]}{klar(neu)[max(0,0):90]}')
    else:
        rr=gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
               {'i':{'id':p['id'],'descriptionHtml':neu}})
        pu=(rr.get('data') or {}).get('productUpdate') or {}
        ok = not pu.get('userErrors') and 'Artikelnummer' not in (pu.get('product') or {}).get('descriptionHtml','Artikelnummer')
        print(('  ✔ ' if ok else '  ⛔ ')+p['title'][:40], pu.get('userErrors') or '')
        if ok: open('/home/user/aban-news-landing/dropship/_artikelnummer_entfernt.txt','a').write(f"{p['id']}\t{p['title'][:60]}\n")
        time.sleep(0.5)
    aend+=1
print(f'{n} geprueft, {aend} {"waeren geaendert" if DRY else "geaendert"}')
