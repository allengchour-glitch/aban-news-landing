#!/usr/bin/env python3
"""Rücknahme der Metricool-Freigabe: setzt Beiträge wieder auf ENTWURF (Zeit, Text und Medien bleiben, nichts wird gelöscht).

  python3 dropship/metricool-freigabe-0911/zurueck.py                 Trockenlauf: zeigt, was zurückgesetzt würde (alle uuid aus protokoll/protokoll.json)
  LIVE=1 python3 dropship/metricool-freigabe-0911/zurueck.py          setzt alle noch geplanten Beiträge aus dem Protokoll auf Entwurf
  LIVE=1 python3 dropship/metricool-freigabe-0911/zurueck.py <uuid> …  nur diese Beiträge
Nach jedem Update wird der Planer frisch gelesen (genau ein Beitrag mit der uuid, Entwurf, gleiche Zeit/Text/Medien); bei Abweichung Stopp.
Zum Stoppen des täglichen Laufs zusätzlich dropship/METRICOOL-FREIGABE-FREI.txt löschen (sonst plant er neue Entwürfe wieder ein).
"""
import json
import os
import sys
import time
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'automation'))
import metricool_freigabe as m  # noqa: E402


def zuruecksetzen_body(post):
    b = m.baue_put(post, m.zeit_von(post), post['text'])
    b['draft'] = True
    b['autoPublish'] = False
    if 'instagramData' in b:
        b['instagramData']['autoPublish'] = False
    return b


def main(argv):
    live = os.environ.get('LIVE') == '1'
    hier = os.path.dirname(os.path.abspath(__file__))
    argv = [a for a in argv if a != '--']          # «--» erlaubt uuid, die mit «-» beginnen
    uuids = argv or [x['uuid'] for x in json.load(open(os.path.join(hier, 'protokoll', 'protokoll.json'), encoding='utf-8'))['beitraege']]
    mc = m.Metricool(os.environ['METRICOOL_USER_TOKEN'], os.environ.get('METRICOOL_USER_ID') or '4801419', os.environ.get('METRICOOL_BLOG_ID') or '6227837')
    jetzt = m.jetzt_lokal()
    fenster = (jetzt - timedelta(days=1), jetzt + timedelta(days=40))
    fertig = 0
    for u in uuids:
        d = mc.planer(*fenster)
        mit = [p for p in d if p['uuid'] == u]
        if len(mit) != 1 or mit[0].get('draft'):
            print(f'{u}: übersprungen ({len(mit)} Beiträge, Entwurf={mit[0].get("draft") if mit else "-"})')
            continue
        p = mit[0]
        print(f"{'ZURÜCK' if live else 'würde zurücksetzen'}: id {p['id']} {p['publicationDate']['dateTime'][5:16]} {'+'.join(q['network'] for q in p['providers'])} {p['text'][:40]!r}")
        if not live:
            continue
        s, t = mc.call('PUT', f"/v2/scheduler/posts/{p['id']}", None, zuruecksetzen_body(p), timeout=240)
        nach = [x for x in mc.planer(*fenster) if x['uuid'] == u]
        ok = s == 200 and len(nach) == 1 and nach[0].get('draft') and not nach[0].get('autoPublish') and nach[0]['text'] == p['text'] \
            and nach[0]['publicationDate'] == p['publicationDate'] and nach[0]['media'] == p['media'] and not any(x['id'] == p['id'] for x in nach)
        print(f"  HTTP {s} Kontrolle: {'OK' if ok else 'ABWEICHUNG ' + str([x['id'] for x in nach])}")
        if not ok:
            print('STOPP: bitte im Metricool-Planer prüfen (Kopien möglich).')
            return 1
        fertig += 1
        time.sleep(2)
    print(f'fertig: {fertig} zurückgesetzt' if live else 'Trockenlauf: nichts geändert')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
