#!/usr/bin/env python3
"""Mutationsprobe für metricool_freigabe.py: ändert den Code absichtlich an 30 Stellen und prüft, dass der Test jedes Mal rot wird.
Aufruf: python3 automation/metricool_freigabe_mutationsprobe.py   (Ausgabe: «Mutanten: 30 | erkannt: 30 | überlebt/nicht anwendbar: 0»)"""
import os, shutil, subprocess, sys, tempfile
SRC = os.path.dirname(os.path.abspath(__file__))
W = tempfile.mkdtemp(prefix='mfmut-')
M = [
 ("MIN_ABSTAND_H = 3", "MIN_ABSTAND_H = 2"),
 ("MIN_VORLAUF_H = 2", "MIN_VORLAUF_H = 0"),
 ("GENERISCH = {7.0, 14.9, 45.0, 50.0}", "GENERISCH = {7.0, 14.9, 45.0}"),
 ("            return text, entfernt      # steht nicht am Ende: nicht anfassen", "            pass"),
 ("while len(tags) > maximal:", "while len(tags) > maximal + 1:"),
 ("noetig = 1 if len(t) == 1 else 2", "noetig = 1"),
 ("    return len(t) >= 6 and any((t in w or w in t) for w in zt if len(w) >= 6)", "    return False"),
 ("if p.get('status') != 'ACTIVE':", "if False:"),
 ("if p.get('tracksInventory') and (p.get('totalInventory') or 0) <= 0:", "if False:"),
 ("(wort == 'bis' and pr[0] > v)", "(wort == 'bis' and pr[0] > v + 100)"),
 ("(wort == 'unter' and pr[0] >= v)", "(wort == 'unter' and pr[0] > v)"),
 ("        if uuid_zaehler[p['uuid']] > 1:", "        if False:"),
 ("        if e['alt'] < jetzt + timedelta(hours=MIN_VORLAUF_H):", "        if False:"),
 ("        e['probleme'] += pruefe_text(text, netze)", "        pass"),
 ("        nachbarn = [x for v in vorlaeufig.values() for x in v]", "        nachbarn = []"),
 ("        if freigegeben >= max_je_lauf:", "        if False:"),
 ("        'draft': False,", "        'draft': True,"),
 ("        b['tiktokData']['commercialContentOwnBrand'] = True", "        pass"),
 ("        b['instagramData']['autoPublish'] = True", "        pass"),
 ("    if len(mit) != 1:\n        fehler.append", "    if False:\n        fehler.append"),
 ("    if any(p['id'] == vorher_id for p in planer):", "    if False:"),
 ("<= jetzt - timedelta(minutes=45)", "<= jetzt + timedelta(minutes=45)"),
 ("SPIELRAUM_H = (1, -1, 2, -2, 3, -3, 4, 5, 6)", "SPIELRAUM_H = (-1, 1, -2, 2, -3, 3, 4, 5, 6)"),
 ("    if netz.endswith('story') or netz == 'pinterest':\n        return True", "    if netz == 'pinterest':\n        return True"),
 ("        if zeit is None:\n            zeit = finde_zeit(netze_s, e['alt'], andere)          # ohne Rücksicht auf die noch offenen Nachbarn", "        if False:\n            pass"),
 ("        if p.get('draft') or not p.get('autoPublish'):", "        if False:"),
 ("        if p.get('media') != erwartet['media']:", "        if False:"),
 ("        if not (jetzt - timedelta(hours=rueckblick_h) <= z <= jetzt - timedelta(minutes=45)):\n            continue", "        if z > jetzt:\n            continue"),
 ("            if not medien_ok(url):", "            if False:"),
 ("    if braucht_video and medien and not all(ist_video(u) for u in medien):", "    if False:"),
 ("        if not pd.get('boardId') or not pd.get('pinTitle'):", "        if False:"),
 ("    if 'youtube' in netze:\n        yd = post.get('youtubeData') or {}\n        if not yd.get('title') or len(yd['title']) > 100:", "    if 'youtube' in netze:\n        yd = post.get('youtubeData') or {}\n        if not yd.get('title') or len(yd['title']) > 1000:"),
]
src = open(f'{SRC}/metricool_freigabe.py', encoding='utf-8').read()
erkannt = 0; gleichwertig = []; ueberlebt = []
for i, (a, b) in enumerate(M, 1):
    if src.count(a) != 1:
        print(f'M{i:02d} NICHT ANWENDBAR ({src.count(a)} Treffer): {a[:50]!r}'); ueberlebt.append(i); continue
    d = f'{W}/m{i}'; os.makedirs(d, exist_ok=True)
    open(f'{d}/metricool_freigabe.py', 'w', encoding='utf-8').write(src.replace(a, b))
    shutil.copy(f'{SRC}/metricool_freigabe_test.py', d)
    r = subprocess.run([sys.executable, f'{d}/metricool_freigabe_test.py'], capture_output=True, text=True, timeout=60)
    if r.returncode != 0: erkannt += 1
    else: print(f'M{i:02d} ÜBERLEBT: {a[:70]!r} -> {b[:50]!r}'); ueberlebt.append(i)
shutil.rmtree(W, ignore_errors=True)
print(f'Mutanten: {len(M)} | erkannt: {erkannt} | überlebt/nicht anwendbar: {len(ueberlebt)}')
sys.exit(1 if ueberlebt else 0)
