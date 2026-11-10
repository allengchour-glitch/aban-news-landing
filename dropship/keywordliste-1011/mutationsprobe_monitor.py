#!/usr/bin/env python3
"""Mutationsprobe für tools/buero/seo_monitor.html: jede Änderung muss den Browsertest monitor_test.mjs scheitern lassen.

Voraussetzung: Playwright erreichbar (NODE_PATH auf node_modules mit playwright). Läuft lokal, nicht in der CI (dauert einige Minuten).
  NODE_PATH=$(npm root -g) python3 mutationsprobe_monitor.py
Der Test liest die geänderte Kopie über die Umgebungsvariable VORLAGE_PFAD.
"""
import subprocess, os, sys, tempfile
import os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
orig=open(REPO+'/tools/buero/seo_monitor.html',encoding='utf-8').read()
M=[
 ("let qlimit=50;","let qlimit=40;",'Startgrenze 50'),
 ("qlimit+=50;","qlimit+=40;",'Schrittweite'),
 ("pct(imp/t.impressions)","pct(clk/t.impressions)",'Deckung Impressionen'),
 ("pct(clk/t.clicks)","pct(imp/t.clicks)",'Deckung Klicks'),
 ("r.keys[0].toLowerCase().includes(needle)","r.keys[0].includes(needle)",'Suche ohne Kleinschreibung'),
 ("$('qtools').hidden=all.length<=15","$('qtools').hidden=all.length<15",'Suche erst ab 16 Zeilen'),
 ("$('qmore').hidden=rows.length<=shown.length","$('qmore').hidden=rows.length<shown.length",'Mehr-Knopf am Ende verbergen'),
 ("$('site').addEventListener('change',()=>{$('qsearch').value='';qlimit=50;draw()})","$('site').addEventListener('change',draw)",'Seitenwechsel setzt Suche zurück'),
 ("(s.truncated?' oder der Auszug gekürzt ist':'')","''",'Hinweis gekürzter Auszug'),
 ("text+=' Keine vollständige Keywordliste.';","",'ehrlicher Satz'),
 ("if(needle)text+=' Suche: '+rows.length+' Treffer.';","",'Trefferzahl der Suche'),
 ("[hidden]{display:none!important}","",'hidden wirkt optisch'),
 ("$('metric').addEventListener('change',draw);","$('metric').addEventListener('change',()=>{$('qsearch').value='';draw()});",'Messwert behält Suche'),
 ("if(t&&t.impressions>0)text+=","if(false)text+=",'Deckungssatz'),
 ("$('bars').style.gridTemplateColumns='repeat('+dates.length+',minmax(0,1fr))';","",'Tagesbalken folgen der Tageszahl'),
 ("$('qsearch').addEventListener('input',()=>{qlimit=50;","$('qsearch').addEventListener('input',()=>{",'Suche setzt Grenze zurück'),
]
env=dict(os.environ)
erkannt=ueberlebt=nicht=0
for alt,neu,name in M:
    if orig.count(alt)!=1:
        print('? nicht anwendbar',name,orig.count(alt)); nicht+=1; continue
    with tempfile.NamedTemporaryFile('w',suffix='.html',delete=False,encoding='utf-8') as f:
        f.write(orig.replace(alt,neu)); pfad=f.name
    env['VORLAGE_PFAD']=pfad
    r=subprocess.run(['node','monitor_test.mjs'],cwd=REPO+'/dropship/keywordliste-1011',env=env,capture_output=True,text=True)
    os.unlink(pfad)
    if r.returncode!=0: erkannt+=1
    else: ueberlebt+=1; print('ÜBERLEBT',name)
print('Monitor-Mutationsprobe: %d erkannt, %d überlebt, %d nicht anwendbar (von %d)'%(erkannt,ueberlebt,nicht,len(M)))
