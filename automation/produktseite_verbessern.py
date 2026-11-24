#!/usr/bin/env python3
"""produktseite_verbessern.py — setzt geprüfte Galerie-/Hero-/Farbfeld-Pläne auf Produktseiten um (24.11.2026).

ANLASS: Betreiber 24.11. «verschönere rizinusöl seite» (erledigt von Hand, dropship/rizinus-2411/) und danach
«mach andere produkte auch besser». Pläne kommen aus dem Workflow «produktseiten-verbessern» (Analyst + unabhängiger
Prüfer je Produkt); dieses Werkzeug übernimmt NUR die vom Prüfer gebilligten Teile:
  - approve_hero  → erste Variante, Reihenfolge der Werte der ersten Option, Variantenbild-Wechsel
  - approve_order → neue Galerie-Reihenfolge
  - Bilder entfernen nur, wenn der Prüfer sie nicht zurückweist UND danach keine Variante mehr darauf zeigt
  - approve_infographic → Infografik aus ECHTEN Produktfotos (ImageMagick), Platz 3 der Galerie
Vorher wird alles gesichert: dropship/produktseiten-2411/<handle>-vorher.json (+ Originale entfernter Bilder).

  python3 automation/produktseite_verbessern.py plaene.json            # Trockenlauf: zeigt je Produkt, was passiert
  LIVE=1 python3 automation/produktseite_verbessern.py plaene.json     # schreibt
plaene.json = [{"plan": {...}, "review": {...}}, …] (Felder wie im Workflow-Schema).
"""
import json, os, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SICH = os.path.join(ROOT, 'dropship/produktseiten-2411')
SHOP = os.environ.get('SHOPIFY_SHOP', 'au3j0y-hq.myshopify.com')
TOK = open('/tmp/cj_shop_token.txt').read().strip()
LIVE = os.environ.get('LIVE') == '1'
NODE = '/opt/node22/bin/node'
FB = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'
FM = '/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf'
BG, INK, SUB = '#F6F1EA', '#3B3129', '#5A4E44'


def gql(q, v=None):
    for i in range(8):
        try:
            r = urllib.request.Request(f'https://{SHOP}/admin/api/2025-10/graphql.json', data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                                       headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK})
            d = json.load(urllib.request.urlopen(r, timeout=90))
            if d.get('errors'):
                raise RuntimeError(str(d['errors'])[:300])
            return d['data']
        except Exception:
            if i == 7:
                raise
            time.sleep(10 + 5 * i)


def zustand(pid):
    return gql('''query($p:ID!){product(id:$p){id handle title options{id name optionValues{id name}}
      variants(first:250){nodes{id title position selectedOptions{name value} media(first:1){nodes{id}}}}
      media(first:100){nodes{id mediaContentType ... on MediaImage{alt image{url width height}}}}}}''', {'p': pid})['product']


def sh(*a):
    subprocess.run(list(a), check=True, capture_output=True)


def infografik(spec, medien, ordner):
    """Baut 1000×1000 aus echten Produktfotos: Titel, Untertitel, bis 6 Kacheln (3 Spalten), 1–2 Fusszeilen."""
    os.makedirs(ordner, exist_ok=True)
    url = {m['id']: m['image']['url'] for m in medien if m.get('image')}
    kacheln = []
    for n, t in enumerate(spec.get('tiles', [])[:6]):
        if t['media_id'] not in url:
            continue
        src = f'{ordner}/q{n}.jpg'
        urllib.request.urlretrieve(url[t['media_id']] + ('&' if '?' in url[t['media_id']] else '?') + 'width=700', src)
        bild, lab, ka = f'{ordner}/b{n}.png', f'{ordner}/l{n}.png', f'{ordner}/k{n}.png'
        sh('convert', src, '-level', '0%,94%', '-fuzz', '3%', '-trim', '+repage', '-resize', '250x190', '-background', 'white',
           '-gravity', 'center', '-extent', '290x210', bild)
        sh('convert', '-size', '270x62', '-background', 'white', '-fill', INK, '-font', FM, '-gravity', 'center',
           f'caption:{t["label"]}', '-gravity', 'center', '-extent', '290x72', lab)
        sh('convert', bild, lab, '-append', ka)
        kacheln.append(ka)
    if len(kacheln) < 2:
        return None
    cmd = ['convert', '-size', '1000x1000', f'xc:{BG}', '-fill', INK, '-font', FB, '-pointsize', '58', '-gravity', 'north',
           '-annotate', '+0+40', spec.get('title', '')[:34]]
    if spec.get('subtitle'):
        cmd += ['-fill', SUB, '-font', FM, '-pointsize', '32', '-annotate', '+0+114', spec['subtitle'][:52]]
    pos = [(40, 180), (355, 180), (670, 180), (40, 480), (355, 480), (670, 480)]
    if len(kacheln) <= 3:
        pos = [(40, 300), (355, 300), (670, 300)]
    for k, (x, y) in zip(kacheln, pos):
        cmd += [k, '-gravity', 'northwest', '-geometry', f'+{x}+{y}', '-composite']
    fuss = (spec.get('footer_lines') or [])[:2]
    if fuss:
        cmd += ['-gravity', 'south', '-fill', INK, '-font', FB, '-pointsize', '34', '-annotate', f'+0+{80 if len(fuss) > 1 else 60}', fuss[0][:48]]
        if len(fuss) > 1:
            cmd += ['-fill', SUB, '-font', FM, '-pointsize', '30', '-annotate', '+0+36', fuss[1][:56]]
    out = f'{ordner}/infografik.jpg'
    sh(*cmd, '-quality', '90', out)
    return out


def hochladen(datei, alt):
    env = dict(os.environ, SHOPIFY_ADMIN_TOKEN=TOK, SHOPIFY_SHOP=SHOP)
    u = subprocess.run([NODE, os.path.join(ROOT, 'automation/upload_to_shopify_cdn.mjs'), datei, alt], capture_output=True, text=True,
                       env=env, timeout=240).stdout.strip()
    if not u.startswith('https://'):
        raise RuntimeError('Upload fehlgeschlagen: ' + datei)
    return u


def umsetzen(plan, review):
    pid, h = plan['product_id'], plan['handle']
    z = zustand(pid)
    ids = [m['id'] for m in z['media']['nodes']]
    if set(ids) != set(plan['media_ids_in_current_order']):
        print(f'  ⚠️ {h}: Medien haben sich seit der Analyse geändert — übersprungen')
        return {'handle': h, 'status': 'übersprungen (Medien geändert)'}
    vt = {v['title']: v for v in z['variants']['nodes']}
    ok_hero, ok_order, ok_info = review.get('approve_hero'), review.get('approve_order'), review.get('approve_infographic')
    v_aend = [c for c in plan.get('variant_image_changes', []) if c['variant_title'] not in set(review.get('rejected_variant_changes', []))
              and c['variant_title'] in vt and c['media_id'] in ids]
    if not ok_hero:
        v_aend = []
    # welches Medium bleibt Variantenbild?
    var_medien = {}
    for v in z['variants']['nodes']:
        m = (v['media']['nodes'] or [{}])[0].get('id')
        var_medien[v['title']] = m
    for c in v_aend:
        var_medien[c['variant_title']] = c['media_id']
    gebunden = {m for m in var_medien.values() if m}
    drops = [d['media_id'] for d in plan.get('drop_media', []) if d['media_id'] in ids and d['media_id'] not in set(review.get('rejected_drops', []))
             and d['media_id'] not in gebunden]
    if not ok_order:
        drops = []
    neu_order = [m for m in plan.get('new_media_order', []) if m in ids and m not in drops] if ok_order else []
    if ok_order:
        rest = [m for m in ids if m not in drops and m not in neu_order]
        neu_order += rest
    first_v = plan.get('first_variant_title') if ok_hero and plan.get('first_variant_title') in vt else None
    werte = plan.get('first_option_value_order') if ok_hero else []
    info = plan.get('infographic') or {}
    mach_info = bool(ok_info and info.get('wanted') and len(info.get('tiles') or []) >= 2)
    print(f'  {h}: Variantenbilder {len(v_aend)} · erste Variante {first_v or "—"} · Werte-Reihenfolge {werte or "—"} · '
          f'Galerie {"neu" if neu_order else "—"} · entfernen {len(drops)} · Infografik {"ja" if mach_info else "nein"}')
    if not LIVE:
        return {'handle': h, 'status': 'trocken'}
    os.makedirs(SICH, exist_ok=True)
    json.dump(z, open(f'{SICH}/{h}-vorher.json', 'w'), ensure_ascii=False, indent=1)
    for m in z['media']['nodes']:
        if m['id'] in drops and m.get('image'):
            urllib.request.urlretrieve(m['image']['url'], f'{SICH}/{h}-entfernt-{m["id"].split("/")[-1]}.jpg')
    info_id = None
    if mach_info:
        datei = infografik(info, z['media']['nodes'], f'/tmp/infografik-{h[:40]}')
        if datei:
            u = hochladen(datei, f'{z["title"]}: {info.get("title", "Übersicht")}')
            r = gql('mutation($p:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$p,media:$m){media{id} mediaUserErrors{message}}}',
                    {'p': pid, 'm': [{'originalSource': u, 'alt': f'{z["title"]}: {info.get("title", "Übersicht")}', 'mediaContentType': 'IMAGE'}]})
            info_id = r['productCreateMedia']['media'][0]['id']
            for _ in range(20):
                st = gql('query($p:ID!){product(id:$p){media(first:100){nodes{id status}}}}', {'p': pid})['product']['media']['nodes']
                if any(n['id'] == info_id and n['status'] == 'READY' for n in st):
                    break
                time.sleep(5)
    if v_aend:
        r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
                {'p': pid, 'v': [{'id': vt[c['variant_title']]['id'], 'mediaId': c['media_id']} for c in v_aend]})
        print('    Variantenbilder:', r['productVariantsBulkUpdate']['userErrors'] or 'ok')
    if werte:
        o0 = z['options'][0]
        namen = [w['name'] for w in o0['optionValues']]
        if sorted(werte) == sorted(namen):
            ordn = [{'id': o0['id'], 'values': [{'id': next(w['id'] for w in o0['optionValues'] if w['name'] == n)} for n in werte]}]
            ordn += [{'id': o['id'], 'values': [{'id': w['id']} for w in o['optionValues']]} for o in z['options'][1:]]
            r = gql('mutation($p:ID!,$o:[OptionReorderInput!]!){productOptionsReorder(productId:$p,options:$o){userErrors{message}}}', {'p': pid, 'o': ordn})
            print('    Werte-Reihenfolge:', r['productOptionsReorder']['userErrors'] or 'ok')
    if first_v:
        r = gql('mutation($p:ID!,$pos:[ProductVariantPositionInput!]!){productVariantsBulkReorder(productId:$p,positions:$pos){userErrors{message}}}',
                {'p': pid, 'pos': [{'id': vt[first_v]['id'], 'position': 1}]})
        print('    erste Variante:', r['productVariantsBulkReorder']['userErrors'] or 'ok')
    if neu_order:
        reihe = list(neu_order)
        if info_id:
            reihe.insert(min(2, len(reihe)), info_id)
        r = gql('mutation($p:ID!,$m:[MoveInput!]!){productReorderMedia(id:$p,moves:$m){mediaUserErrors{message}}}',
                {'p': pid, 'm': [{'id': i, 'newPosition': str(n)} for n, i in enumerate(reihe)]})
        print('    Galerie:', r['productReorderMedia']['mediaUserErrors'] or 'ok')
        time.sleep(6)
    elif info_id:
        r = gql('mutation($p:ID!,$m:[MoveInput!]!){productReorderMedia(id:$p,moves:$m){mediaUserErrors{message}}}',
                {'p': pid, 'm': [{'id': info_id, 'newPosition': '2'}]})
    if drops:
        r = gql('mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}', {'p': pid, 'm': drops})
        print('    entfernt:', len(r['productDeleteMedia']['deletedMediaIds'] or []), r['productDeleteMedia']['mediaUserErrors'] or '')
    n = zustand(pid)
    erste = n['variants']['nodes'][0]
    ergebnis = {'handle': h, 'status': 'geschrieben', 'medien_vorher': len(ids), 'medien_nachher': len(n['media']['nodes']),
                'erste_variante': erste['title'], 'erstes_bild_erste_variante': (erste['media']['nodes'] or [{}])[0].get('id'),
                'infografik': info_id, 'entfernt': drops}
    json.dump(ergebnis, open(f'{SICH}/{h}-nachher.json', 'w'), ensure_ascii=False, indent=1)
    print('    zurückgelesen:', ergebnis['medien_vorher'], '→', ergebnis['medien_nachher'], 'Medien · erste Variante', erste['title'])
    return ergebnis


if __name__ == '__main__':
    daten = json.load(open(sys.argv[1]))
    alle = [umsetzen(x['plan'], x['review']) for x in daten]
    print(json.dumps([{k: a.get(k) for k in ('handle', 'status', 'medien_vorher', 'medien_nachher')} for a in alle], ensure_ascii=False))
