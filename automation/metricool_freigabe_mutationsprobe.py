#!/usr/bin/env python3
"""Mutationsprobe für metricool_freigabe.py: ändert den Code absichtlich an 62 Stellen und prüft, dass der Test jedes Mal rot wird.
Aufruf: python3 automation/metricool_freigabe_mutationsprobe.py   (Ausgabe: «Mutanten: 62 | erkannt: 62 | überlebt/nicht anwendbar: 0»)"""
import os, shutil, subprocess, sys, tempfile
SRC = os.path.dirname(os.path.abspath(__file__))
W = tempfile.mkdtemp(prefix='mfmut-')
M = [
 ("    if links:\n        nach_handle", "    if False:\n        nach_handle"),
 ("products/([a-z0-9][a-z0-9-]*)', re.I)", "products/([a-z0-9][a-z0-9-]*)')"),
 ("luxestyle\\.ch/(?:[a-z]{2}/)?products", "luxestyle\\.ch/products"),
 ("luxestyle\\.ch/(?:[a-z]{2}/)?products", "[a-z.]+/(?:[a-z]{2}/)?products"),
 ("        h = h.lower()\n", "        pass\n"),
 ("        if h not in out:\n", "        if True:\n"),
 ("        return [nach_handle[h] for h in links if h in nach_handle]", "        return [p for p in produkte if p['handle'].lower() in links]"),
 ("        if links:\n            return [f\"verlinktes", "        if False:\n            return [f\"verlinktes"),
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
 ('        grund = halte_grund(p, halten)\n        if grund is not None:', '        grund = halte_grund(p, halten)\n        if False:'),
 ("    for schluessel in (str(post['uuid']).lower(), str(post['id']).lower()):", "    for schluessel in (str(post['uuid']).lower(),):"),
 ("    for schluessel in (str(post['uuid']).lower(), str(post['id']).lower()):", "    for schluessel in (str(post['uuid']), str(post['id']).lower()):"),
 ("        out[teile[0].strip().lower()] = grund.strip() or 'ohne Grund'", "        out[teile[0].strip()] = grund.strip() or 'ohne Grund'"),
 ("        out[teile[0].strip().lower()] = grund.strip() or 'ohne Grund'", '        out[teile[0].strip().lower()] = grund.strip()'),
 ("        kopf, _, grund = zeile_.partition('#')", "        kopf, _, grund = zeile_.partition('//')"),
 ('        if not teile:\n            continue\n        out[', '        if False:\n            continue\n        out['),
 (' and halte_grund(p, halten) is None}', '}'),
 ('    halten = halten or {}\n', '    halten = {}\n'),
 ("        halten = lade_halten(open(HALTEN_DATEI, encoding='utf-8').read())", '        halten = {}'),
 ('medium_erreichbar if not planer_datei else (lambda u: True), halten)', 'medium_erreichbar if not planer_datei else (lambda u: True))'),
 ('    except FileNotFoundError:\n        halten = {}', '    except FileNotFoundError:\n        raise'),
 ("            e['probleme'].append('angehalten (METRICOOL-HALTEN.txt): ' + grund)", "            e['probleme'].append('angehalten (METRICOOL-HALTEN.txt)')"),
]
M += [
 # Besitzer 16.11.: nur noch Videos, kein TikTok-Sound; Bestand 0 heisst nicht ausverkauft
 ("        if NUR_VIDEOS and not any(ist_video(u) for u in (p.get('media') or [])):", "        if False:"),
 ("NUR_VIDEOS = os.environ.get('NUR_VIDEOS', '1') != '0'", "NUR_VIDEOS = os.environ.get('NUR_VIDEOS', '0') != '0'"),
 ("        b['tiktokData']['autoAddMusic'] = False", "        pass"),
 ("        if 'tiktok' in netze and (p.get('tiktokData') or {}).get('autoAddMusic'):", "        if False:"),
 ("        if not any(v.get('availableForSale') for v in p.get('variants', [])):\n            if p.get('tracksInventory')", "        if True:\n            if p.get('tracksInventory')"),
 ("any(ist_video(u) for u in (p.get('media') or []))", "all(ist_video(u) for u in (p.get('media') or []))"),
]
M += [
 ("[str(b['uuid']), b['netz'], b['zeit'].isoformat(), b['status']]", "[str(b['id']), b['netz'], b['zeit'].isoformat(), b['status']]"),
 ("[str(b['uuid']), b['netz'], b['zeit'].isoformat(), b['status']]", "[str(b['uuid']), b['zeit'].isoformat(), b['status']]"),
 ("if k not in gesehen}", "if True}"),
 ("                print('Telegram: Zustellung unbestätigt. Meldestand bleibt erhalten.')\n                return", "                pass"),
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
