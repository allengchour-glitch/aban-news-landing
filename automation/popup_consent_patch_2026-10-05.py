#!/usr/bin/env python3
"""Popup-Tor-Patch 05.10.2026 (siehe popup_tor_wache.py). Liest /tmp/footer_live.json — vorher die LIVE-Datei dorthin holen;
DRY ohne SCHARF=1."""
import sys, json, time, os
sys.path.insert(0, 'automation')
from kaufwille_zeile import gql
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
s = open('/tmp/footer_live.json').read()
k = s.find('{', s.find('*/'))
kopf, body = s[:k], s[k:]
j = json.loads(body)
sec = j['sections']['custom_liquid_lxpopup']
code = sec['settings']['custom_liquid']
alt_start = code.index('  setTimeout(show,30000);')
alt_ende = code.index('  document.getElementById("lx-pop-x").onclick=close;')
neu_block = '''  /* 05.10.2026 (Clarity, 6 Sitzungen): Popup + Cookie-Banner lagen 2–7 s nach Ankunft GLEICHZEITIG ueber der Seite,
     mobil ueber dem ganzen Bildschirm, desktop ueber «In den Warenkorb». Ursache: 40-%-Scroll (kurze Handy-Produktseite
     = 2–3 s) und Exit-Intent loesten sofort aus. Jetzt: nie vor 20 s (mobil 30 s), nie solange das Shopify-Cookie-Banner
     sichtbar ist, nie auf Warenkorb/Konto; Ausloeser danach: 60 % gescrollt, Exit-Intent (nur Desktop) oder Timer
     45 s (mobil 75 s). */
  var T0=Date.now(), MOBIL=window.matchMedia("(max-width: 749px)").matches;
  var MIN_MS=MOBIL?30000:20000, TIMER_MS=MOBIL?75000:45000, scrollOk=false;
  function bannerOffen(){
    var els=document.querySelectorAll('[id^="shopify-pc__banner"],[class*="shopify-pc__banner"],#shopify-pc__prefs');
    for(var i=0;i<els.length;i++){ var st=getComputedStyle(els[i]), r=els[i].getBoundingClientRect();
      if(st.display!=="none" && st.visibility!=="hidden" && r.height>0) return true; }
    return false;
  }
  function seiteOk(){ return !/^\\/(cart|checkouts|account)/.test(location.pathname); }
  function versuche(){ if(shown) return; if(Date.now()-T0<MIN_MS || bannerOffen() || !seiteOk()) return; show(); }
  var tick=setInterval(function(){ if(shown){ clearInterval(tick); return; } if(scrollOk || Date.now()-T0>=TIMER_MS) versuche(); },2000);
  window.addEventListener("scroll",function(){ if(scrollOk) return; var h=document.documentElement.scrollHeight-window.innerHeight; if(h>0 && window.scrollY/h>=0.6) scrollOk=true; },{passive:true});
  if(!MOBIL) document.addEventListener("mouseout",function(e){ if(e.clientY<=0) versuche(); });
'''
neu_code = code[:alt_start] + neu_block + code[alt_ende:]
assert 'lx_popup_v1' in neu_code and 'setTimeout(show,30000)' not in neu_code
sec['settings']['custom_liquid'] = neu_code
neu = kopf + json.dumps(j, ensure_ascii=False, indent=2) + '\n'
json.loads(neu[neu.find('{', neu.find('*/')):])
if os.environ.get('SCHARF') != '1':
    print('DRY ok', len(s), '->', len(neu)); sys.exit(0)
r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
        {"id": THEME, "files": [{"filename": "sections/footer-group.json", "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
print(r)
for _ in range(6):
    time.sleep(4)
    rr = gql('query($id:ID!){ theme(id:$id){ files(filenames:["sections/footer-group.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }', {'id': THEME})
    back = rr['theme']['files']['nodes'][0]['body']['content']
    if 'MIN_MS=MOBIL?30000:20000' in back and 'setTimeout(show,30000)' not in back:
        print('ZURUECKGELESEN OK', len(back)); break
else:
    print('RUECKLESEN FEHLT')
