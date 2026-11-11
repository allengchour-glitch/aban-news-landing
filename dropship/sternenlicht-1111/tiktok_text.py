#!/usr/bin/env python3
"""Codex' TikTok-Entwurf «Sternenlicht» (uuid 3614365779669041576): nur den Text ändern, Entwurf bleibt Entwurf.
Grund: die Freigabe erkennt das Produkt nicht (der Text nennt es nicht) und TikTok hat keinen Profil-Link.
Aufruf: python3 tiktok_text.py (Trockenlauf) · LIVE=1 python3 tiktok_text.py"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'automation'))
import metricool_freigabe as m
from datetime import timedelta
UUID = '3614365779669041576'
NEU = ('Licht im Detail: der Sternenlicht-Projektor für Schlafzimmer. Welche Ausführung welche Scheiben mitbringt, steht beim Artikel.\n\n'
       'Shop: luxestyle.ch/tt\n\n#sternlicht #lichtmomente #luxestyle')
mc = m.Metricool(os.environ['METRICOOL_USER_TOKEN'], os.environ.get('METRICOOL_USER_ID') or '4801419', os.environ.get('METRICOOL_BLOG_ID') or '6227837')
j = m.jetzt_lokal()
def planer(): return mc.planer(j - timedelta(days=1), j + timedelta(days=13))
pl = planer()
mit = [p for p in pl if str(p['uuid']) == UUID]
if len(mit) != 1: sys.exit(f'ABBRUCH: {len(mit)} Beiträge mit der uuid')
p = mit[0]
print('IST id', p['id'], 'draft', p.get('draft'), 'auto', p.get('autoPublish'), m.zeit_von(p), [q['network'] for q in p['providers']]); print(repr(p['text']))
if not p.get('draft') or p.get('autoPublish'): sys.exit('ABBRUCH: ist kein Entwurf mehr')
if p['text'] == NEU: print('Text ist schon neu.'); sys.exit(0)
b = m.baue_put(p, m.zeit_von(p), NEU)
b['autoPublish'] = False; b['draft'] = True
print('NEU', repr(NEU))
if os.environ.get('LIVE') != '1': print('Trockenlauf: nichts geschrieben.'); sys.exit(0)
json.dump(p, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tiktok_vorher.json'), 'w'), ensure_ascii=False, indent=1)
s, t = mc.call('PUT', f"/v2/scheduler/posts/{p['id']}", body=b)
print('PUT HTTP', s, t[:200])
time.sleep(6)
pl2 = planer()
mit2 = [q for q in pl2 if str(q['uuid']) == UUID]
ok = len(mit2) == 1 and mit2[0]['text'] == NEU and mit2[0].get('draft') and not mit2[0].get('autoPublish') and mit2[0].get('media') == p.get('media') and m.zeit_von(mit2[0]) == m.zeit_von(p) and (mit2[0].get('tiktokData') or {}).get('commercialContentOwnBrand') is True
print('NACHGELESEN', [(q['id'], q.get('draft'), q.get('autoPublish')) for q in mit2], 'OK' if ok else 'ABWEICHUNG')
sys.exit(0 if ok else 1)
