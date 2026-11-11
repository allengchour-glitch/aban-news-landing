"""Social-Pakete der Woche 16.-22.11.2026 als Metricool-ENTWÜRFE anlegen (11.11.2026).

Je Paket vier Entwürfe: Instagram+Facebook (Karussell), TikTok (Fotos, Eigenwerbung, Musik), Threads (Text + ein Bild),
Pinterest (Pin mit Pinnwand, Titel, Link). Immer draft=True und autoPublish=False: eingeplant wird nur durch die tägliche
Freigabe (automation/metricool_freigabe.py, acht Tore). Bilder gehen zuerst ins Shopify-CDN, dann über
`normalize/image/url` zu Metricool.

Aufruf:  python3 entwuerfe_anlegen.py                Trockenlauf (Vorgabe): zeigt jeden Beitrag, schreibt nichts
         LIVE=1 python3 entwuerfe_anlegen.py         lädt hoch und legt an; Protokoll angelegt.json
Ein POST ohne sichere Antwort wird NIE wiederholt: dann den Planer lesen (Lehre 09.11.: «Request cancelled» legte Kopien an).
"""
import json, os, subprocess, sys, time, datetime as dt
from pathlib import Path

HIER = Path(__file__).resolve().parent
REPO = Path('/home/user/aban-news-landing')
sys.path.insert(0, str(REPO / 'automation'))
from metricool_freigabe import Metricool  # noqa: E402

PAKETE = ['weihnachtskugeln-beflockt-9-stuck-625300', 'retro-keramik-kaffeetasse-mit-tiermotiv-621800',
          'weihnachtsstrumpf-mit-samt-optik-639700', 'led-schminkspiegel-wiederaufladbar-tragbar-639500',
          'lichterbaum-musikbox-10x10x20-cm-604200', 'schmuckkastchen-3d-holzpuzzle-611300']
LIVE = os.environ.get('LIVE') == '1'
PROTO = HIER / 'angelegt.json'
TZ = 'Europe/Zurich'


def log(*a):
    print(*a, flush=True)


def lokal(zeit):
    return dt.datetime.fromisoformat(zeit).strftime('%Y-%m-%dT%H:%M:%S')


def hochladen(datei, alt):
    r = subprocess.run(['/opt/node22/bin/node', str(REPO / 'automation/upload_to_shopify_cdn.mjs'), datei, alt],
                       capture_output=True, text=True, timeout=300, env={**os.environ, 'SHOPIFY_SHOP': os.environ.get('SHOPIFY_SHOP') or 'au3j0y-hq.myshopify.com'})
    url = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''
    if r.returncode != 0 or not url.startswith('https://cdn.shopify.com/'):
        raise RuntimeError(f'Hochladen fehlgeschlagen: {Path(datei).name}: {r.stderr[-300:]}')
    return url


def normalisieren(mc, url):
    s, t = mc.call('GET', '/actions/normalize/image/url', {'url': url}, accept='text/plain')
    u = (t or '').strip().strip('"')
    if s != 200 or not u.startswith('https://'):
        raise RuntimeError(f'normalize HTTP {s}: {str(t)[:200]}')
    return u


def beitraege(p):
    t, z, b = p['texte'], p['zeiten'], p['bilder']
    titel = p['titel']
    basis = {'firstCommentText': '', 'shortener': False, 'draft': True, 'autoPublish': False, 'hasNotReadNotes': False,
             'descendants': [], 'smartLinkData': {'ids': []}, 'twitterData': {'type': 'POST'}}
    alt = lambda n: [f'{titel}, Bild {i + 1}' for i in range(n)]
    return [
        ('instagram_facebook', b['instagram_facebook'], dict(basis, text=t['instagram_facebook'], providers=[{'network': 'facebook'}, {'network': 'instagram'}],
            publicationDate={'dateTime': lokal(z['instagram_facebook']), 'timezone': TZ}, mediaAltText=alt(len(b['instagram_facebook'])),
            facebookData={'type': 'POST'}, instagramData={'autoPublish': False, 'type': 'POST', 'showReelOnFeed': True, 'isAiGenerated': False})),
        ('tiktok', b['tiktok'], dict(basis, text=t['tiktok'], providers=[{'network': 'tiktok'}], imageVariants=False,
            publicationDate={'dateTime': lokal(z['tiktok']), 'timezone': TZ}, mediaAltText=alt(len(b['tiktok'])),
            instagramData={'autoPublish': False, 'isAiGenerated': False},
            tiktokData={'privacyOption': 'PUBLIC_TO_EVERYONE', 'commercialContentOwnBrand': True, 'title': titel[:90], 'photoCoverIndex': 0, 'autoAddMusic': True})),
        ('threads', b['instagram_facebook'][:1], dict(basis, text=t['threads'], providers=[{'network': 'threads'}], imageVariants=False,
            publicationDate={'dateTime': lokal(z['threads']), 'timezone': TZ}, mediaAltText=alt(1),
            instagramData={'autoPublish': False, 'isAiGenerated': False},
            threadsData={'replyControl': 'EVERYONE', 'type': 'POST', 'shareAsInstagramStory': False})),
        ('pinterest', [b['pinterest']], dict(basis, text=t['pinterest']['beschreibung'], providers=[{'network': 'pinterest'}], imageVariants=False,
            publicationDate={'dateTime': lokal(z['pinterest']), 'timezone': TZ}, mediaAltText=[t['pinterest']['alt']],
            instagramData={'autoPublish': False, 'isAiGenerated': False},
            pinterestData={'boardId': t['pinterest']['board_id'], 'pinTitle': t['pinterest']['titel'][:100], 'pinLink': t['pinterest']['link'],
                           'pinNewFormat': True, 'isAiGenerated': False, 'isAiGeneratedPerson': False})),
    ]


def main():
    mc = Metricool(os.environ.get('METRICOOL_USER_TOKEN', ''), os.environ.get('METRICOOL_USER_ID') or '4801419', os.environ.get('METRICOOL_BLOG_ID') or '6227837')
    proto = json.loads(PROTO.read_text()) if PROTO.exists() else []
    fertig = {(e['handle'], e['netz']) for e in proto if e.get('status') in ('angelegt', 'unsicher')}
    jetzt = dt.datetime.now(dt.timezone.utc)
    for h in PAKETE:
        p = json.loads((HIER / h / 'pack.json').read_text(encoding='utf-8'))
        if not p['texte']['pinterest'].get('board_id'):
            raise SystemExit(f'ABBRUCH {h}: Pinterest-Pinnwand fehlt')
        for netz, bilder, body in beitraege(p):
            if (h, netz) in fertig:
                log(f'SCHON  {h[:34]:34} {netz}')
                continue
            zeit = dt.datetime.fromisoformat(p['zeiten'][netz])
            if zeit - jetzt < dt.timedelta(hours=24):
                raise SystemExit(f'ABBRUCH {h} {netz}: Termin zu nah ({zeit})')
            for f in bilder:
                if not Path(f).is_file():
                    raise SystemExit(f'ABBRUCH {h} {netz}: Bild fehlt {f}')
            log(f'{"LIVE " if LIVE else "PLAN "} {h[:34]:34} {netz:18} {body["publicationDate"]["dateTime"]} Bilder {len(bilder)} | {body["text"][:60]!r}')
            if not LIVE:
                continue
            medien = []
            for i, f in enumerate(bilder):
                cdn = hochladen(f, body['mediaAltText'][min(i, len(body['mediaAltText']) - 1)])
                medien.append(normalisieren(mc, cdn))
            body['media'] = medien
            eintrag = {'handle': h, 'netz': netz, 'zeit': body['publicationDate']['dateTime'], 'gesendet': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}
            try:
                s, t = mc.call('POST', '/v2/scheduler/posts', body=body, timeout=180)
            except Exception as e:  # nie wiederholen
                eintrag.update(status='unsicher', fehler=type(e).__name__)
                proto.append(eintrag); PROTO.write_text(json.dumps(proto, ensure_ascii=False, indent=1))
                raise SystemExit(f'UNSICHER {h} {netz}: {type(e).__name__}; erst den Planer lesen, nicht wiederholen')
            try:
                post = (json.loads(t).get('data') or {}) if s in (200, 201) else {}
            except Exception:
                post = {}
            if s not in (200, 201) or not post.get('id'):
                eintrag.update(status='unsicher', http=s, antwort=str(t)[:300])
                proto.append(eintrag); PROTO.write_text(json.dumps(proto, ensure_ascii=False, indent=1))
                raise SystemExit(f'UNSICHER {h} {netz}: HTTP {s}; erst den Planer lesen, nicht wiederholen')
            eintrag.update(status='angelegt', id=post['id'], uuid=post.get('uuid'), draft=post.get('draft'), autoPublish=post.get('autoPublish'))
            proto.append(eintrag); PROTO.write_text(json.dumps(proto, ensure_ascii=False, indent=1))
            log(f'  angelegt id {post["id"]} uuid {post.get("uuid")} draft {post.get("draft")}')
            time.sleep(2)
    log('Trockenlauf: nichts geschrieben.' if not LIVE else f'Fertig: {sum(1 for e in proto if e["status"] == "angelegt")} angelegt.')


if __name__ == '__main__':
    main()
