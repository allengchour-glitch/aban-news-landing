import sys, os, json, collections
from datetime import datetime
sys.path.insert(0, sys.argv[1])
import metricool_freigabe as m
mc = m.Metricool(os.environ['METRICOOL_USER_TOKEN'], os.environ['METRICOOL_USER_ID'], os.environ['METRICOOL_BLOG_ID'])
alle = []
for a, b in [('2026-11-16T10:00:00','2026-11-18T00:00:00'),('2026-11-18T00:00:00','2026-11-20T00:00:00'),('2026-11-20T00:00:00','2026-11-22T00:00:00'),('2026-11-22T00:00:00','2026-11-24T00:00:00')]:
    alle += m.Metricool.planer(mc, datetime.fromisoformat(a), datetime.fromisoformat(b))
uu = collections.Counter(p['uuid'] for p in alle)
print('Beiträge', len(alle), '| uuid doppelt:', [u for u,c in uu.items() if c>1])
tt_musik = [(p['publicationDate']['dateTime'], (p.get('tiktokData') or {}).get('title')) for p in alle if (p.get('tiktokData') or {}).get('autoAddMusic')]
print('TikTok mit autoAddMusic:', tt_musik)
ziel = {'-1463494076488727798','-3668679867663038577','733493005328404096','-580082399036486516','-326770756211684563','-4254912497617780595','-1560468010126717309','5095221239706765903','1244897565051602488','-5766619704983925146','7920135771193035363'}
for p in sorted(alle, key=lambda p: p['publicationDate']['dateTime']):
    if p['uuid'] in ziel:
        nets = ','.join(x['network'] for x in p['providers'])
        print(p['publicationDate']['dateTime'], nets, 'draft=%s auto=%s musik=%s' % (p.get('draft'), p.get('autoPublish'), (p.get('tiktokData') or {}).get('autoAddMusic')), (p.get('text') or '')[:40].replace('\n',' '))
# Abstand je Netzwerk unter autoPublish
from collections import defaultdict
plan = defaultdict(list)
for p in alle:
    if p.get('autoPublish') and not p.get('draft'):
        for x in p['providers']:
            plan[x['network']].append(datetime.fromisoformat(p['publicationDate']['dateTime']))
kurz = []
for n, ts in plan.items():
    ts.sort()
    for a, b in zip(ts, ts[1:]):
        if (b - a).total_seconds() < 3*3600: kurz.append((n, str(a), str(b)))
print('Abstand unter 3 h (autoPublish):', kurz)
