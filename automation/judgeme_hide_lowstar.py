#!/usr/bin/env python3
"""Blendet IMPORTIERTE Judge.me-Bewertungen mit < MIN_STARS Sternen aus (curated=spam -> unveröffentlicht).

Hintergrund (User-Entscheidung 2026-10-01): Projektregel = nur >=4★ importieren. Ein Massen-Import
(Absender cj-import@luxestyle.ch, ab 07.09.) hatte auch 1-3★ fremder CJ-Verkäufer übernommen
("Nie erhalten", "Zoll"). Echte Kundenbewertungen (anderer Absender) werden NIE angefasst.

Umkehrbar: jede ausgeblendete ID landet in dropship/judgeme_hidden_lowstar.txt.
ENV: JUDGEME_SHOP_DOMAIN, JUDGEME_PRIVATE_TOKEN · [MIN_STARS=4] · [DRY_RUN=1] · [UNHIDE=1 -> Ledger wieder veröffentlichen]
"""
import os, json, time, urllib.request, urllib.error

D = os.environ['JUDGEME_SHOP_DOMAIN']; T = os.environ['JUDGEME_PRIVATE_TOKEN']
MIN = int(os.environ.get('MIN_STARS', '4')); DRY = os.environ.get('DRY_RUN') == '1'
LEDGER = 'dropship/judgeme_hidden_lowstar.txt'
API = 'https://judge.me/api/v1/reviews'

def req(url, data=None, method='GET'):
    for attempt in range(6):
        try:
            r = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, method=method,
                                       headers={'Content-Type': 'application/json'})
            return json.load(urllib.request.urlopen(r, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504): time.sleep(2 ** attempt); continue
            raise
        except urllib.error.URLError:
            time.sleep(2 ** attempt)
    raise RuntimeError('Judge.me nicht erreichbar: ' + url)

def curate(rid, value):
    return req(f'{API}/{rid}', {'shop_domain': D, 'api_token': T, 'curated': value}, 'PUT')

def is_import(r):
    # Importe = CJ-Import (cj-import@ / cj-import+…) ODER Judge.me-AliExpress-Import (source=aliexpress).
    # Alles andere (echte LuxeStyle-Kunden: source web/email/shop ohne cj-import-Absender) bleibt unangetastet.
    e = (r.get('reviewer') or {}).get('email', '') or ''
    return e.startswith('cj-import') or (r.get('source') or '').lower() == 'aliexpress'

if os.environ.get('UNHIDE') == '1':
    ids = [l.strip() for l in open(LEDGER) if l.strip()]
    for i, rid in enumerate(ids, 1):
        if not DRY: curate(rid, 'ok'); time.sleep(0.3)
        if i % 200 == 0: print(f'{i}/{len(ids)} wieder veröffentlicht', flush=True)
    print('fertig:', len(ids)); raise SystemExit

done = set(l.strip() for l in open(LEDGER)) if os.path.exists(LEDGER) else set()
# Die ungefilterte Liste liefert nur ~10'000 eindeutige Reviews und wiederholt sich danach. Darum gezielt
# nach published=true&rating=N blaettern (kleine, vollstaendig erreichbare Mengen). Weil Ausgeblendete aus
# dem Filter fallen, rueckt die Liste nach -> pro Sternzahl immer wieder Seite 1, bis nichts mehr kommt.
seen, hidden, fails = 0, 0, 0
with open(LEDGER, 'a') as led:
  for star in range(1, MIN):
    page, stale = 1, 0
    while True:
        R = req(f'{API}?shop_domain={D}&api_token={T}&per_page=100&page={page}&published=true&rating={star}').get('reviews', [])
        if not R: break
        seen += len(R)
        todo = [r for r in R if r.get('published') and is_import(r) and int(r.get('rating') or 5) < MIN and str(r['id']) not in done]
        if not todo:
            page += 1          # nur Nicht-Importe/echte Kunden auf dieser Seite -> weiterblaettern
            continue
        if DRY: hidden += len(todo); page += 1; continue
        for r in todo:
            try:
                curate(r['id'], 'spam'); led.write(f"{r['id']}\n"); led.flush(); done.add(str(r['id'])); hidden += 1
            except Exception as e:
                fails += 1; print('Fehler', r['id'], e, flush=True)
            time.sleep(0.3)
        print(f'{star}★ Seite {page}: {hidden} ausgeblendet gesamt', flush=True)
        # page bleibt: ausgeblendete fallen raus, die naechsten ruecken auf Seite 'page' nach
print(f'FERTIG: {seen} geprüft, {hidden} ausgeblendet, {fails} Fehler{" [DRY]" if DRY else ""}')
