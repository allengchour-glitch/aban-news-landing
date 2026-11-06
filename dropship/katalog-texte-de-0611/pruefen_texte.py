#!/usr/bin/env python3
"""Mechanische Prüfung einer übersetzten Stapeldatei gegen die englische Eingabe.
Aufruf: python3 pruefen_texte.py in/b_01.json out/b_01.json   (Exit 0 = keine Fehler, 1 = Fehler; Warnungen sind kein Fehler)
Ausgabe: je Fund «FEHLER id: ...» oder «WARNUNG id: ...», am Ende «ERGEBNIS: n Fehler, m Warnungen»."""
import json,re,sys
EN_STOP=set('the and with for your this that from are you can has have will fabric cotton polyester wash made product size sizes print printed design material color colour colors soft comfortable shirt hoodie fit regular side sleeve sleeves neck care instructions machine dry cold water bleach iron blank sourced'.split())
IMP=re.compile(r'(?<![A-Za-zÄÖÜäöü])(oz|lbs?|inch(?:es)?|yd|yds|ft|feet|gal|fl\.?\s*oz|mph)(?![A-Za-zÄÖÜäöü])|\d\s*(?:″|"|”)|\d\s*(?:x|×)\s*\d+(?:[.,]\d+)?\s*in\b',re.I)
SPAN=re.compile(r'(?:\d+(?:[.,]\d+)?\s*(?:x|×|by)\s*)*\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(?:oz|lbs?|in\b|inch(?:es)?|yd|yds|ft|feet|gal|fl|″|"|”)',re.I)
NUM=re.compile(r'\d+(?:[.,]\d+)?')
IMPCTX=re.compile(r'^\s*(?:oz|lbs?|in\b|inch|inches|yd|yds|ft|feet|gal|fl|"|″|”|\')',re.I)
def norm(n):
    n=n.replace(',','.')
    if '.' in n: n=n.rstrip('0').rstrip('.')
    return n
def zahlen(s,ohne_imperial):
    skip=[]
    if ohne_imperial: skip=[(m.start(),m.end()) for m in SPAN.finditer(s)]
    out=[]
    for m in NUM.finditer(s):
        if any(a<=m.start()<b for a,b in skip): continue
        out.append(norm(m.group(0)))
    return out
def main(a,b):
    ein=json.load(open(a,encoding='utf-8')); aus=json.load(open(b,encoding='utf-8'))
    if isinstance(aus,dict): aus=aus.get('items') or aus.get('ergebnis') or []
    probs=[];warn=[]
    ids_in={x['id'] for x in ein}; ids_out=[x.get('id') for x in aus]
    if len(ids_out)!=len(set(ids_out)): probs.append(('-','doppelte ids in der Ausgabe'))
    for i in ids_in-set(ids_out): probs.append((i,'fehlt in der Ausgabe'))
    for i in set(ids_out)-ids_in: probs.append((i,'unbekannte id'))
    q={x['id']:x for x in ein}
    for o in aus:
        i=o.get('id')
        if i not in q: continue
        en=q[i]['description']; de=o.get('de') or ''
        if not de.strip(): probs.append((i,'leere Übersetzung')); continue
        # Zahlen (nur nicht-imperiale) müssen vorkommen
        dez=set(zahlen(de,False))
        fehl=[z for z in zahlen(en,True) if z not in dez]
        if fehl: probs.append((i,'Zahl(en) aus dem Original fehlen: '+', '.join(sorted(set(fehl)))))
        # imperiale Reste
        r=IMP.search(de)
        if r: probs.append((i,'imperiale Einheit im Deutschen: «%s»'%de[max(0,r.start()-15):r.end()+15].replace('\n',' ')))
        if 'ß' in de: probs.append((i,'«ß» (Schweizer Rechtschreibung: ss)'))
        if re.search(r'\s[–—]\s|—',de): probs.append((i,'Gedankenstrich'))
        # Englische Reste
        w=re.findall(r"[A-Za-z']+",de.lower()); n=sum(1 for x in w if x in EN_STOP)
        if n>=4: warn.append((i,'mögliche englische Reste (%d typische Wörter)'%n))
        # Aufzählung
        pe=sum(1 for l in en.split('\n') if l.strip().startswith('•')); pd=sum(1 for l in de.split('\n') if l.strip().startswith('•'))
        if pe!=pd: warn.append((i,'Aufzählungspunkte %d im Original, %d im Deutschen'%(pe,pd)))
        ratio=len(de)/max(1,len(en))
        if ratio<0.6 or ratio>1.9: warn.append((i,'Längenverhältnis %.2f'%ratio))
        # imperial im Original ohne Metrik daneben: Umrechnung muss gemeldet sein
        if IMP.search(en) and not re.search(r'\d\s*(?:g/m|gsm|cm|mm|kg|\bg\b|ml|\bl\b)',en,re.I) and not o.get('umgerechnet'):
            warn.append((i,'Original nennt nur Imperiales, «umgerechnet» ist leer'))
    for i,t in probs: print('FEHLER',i+':' if isinstance(i,str) else str(i)+':',t)
    for i,t in warn: print('WARNUNG',str(i)+':',t)
    print('ERGEBNIS: %d Fehler, %d Warnungen, %d von %d Einträgen geprüft'%(len(probs),len(warn),len(aus),len(ein)))
    return 1 if probs else 0
if __name__=='__main__': sys.exit(main(sys.argv[1],sys.argv[2]))
