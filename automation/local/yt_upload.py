#!/usr/bin/env python3
# YouTube-Shorts-Upload via Data API v3 (resumable). Tokens aus /tmp, Refresh bei 401.
import json, subprocess, os, time
def refresh_access():
    r = subprocess.run(['curl','-s','-X','POST','https://oauth2.googleapis.com/token',
        '-d','client_id='+open('/tmp/yt_client_id').read().strip(),
        '-d','client_secret='+open('/tmp/yt_client_secret').read().strip(),
        '-d','refresh_token='+open('/tmp/yt_refresh').read().strip(),
        '-d','grant_type=refresh_token'],capture_output=True,text=True)
    d = json.loads(r.stdout)
    if 'access_token' in d: open('/tmp/yt_access','w').write(d['access_token']); return d['access_token']
    raise SystemExit('Refresh-Fehler: ' + r.stdout[:150])
AT = open('/tmp/yt_access').read().strip()
VIDEOS = [
 dict(file='reels/shorts/showcase-45s-music.mp4',
      title='LuxeStyle in 43 Sekunden – Mode, Schmuck & Gadgets 🇨🇭',
      desc='Der Schweizer Online-Shop: 10\'000+ Produkte, Gratis-Versand ab CHF 50, Kauf auf Rechnung (Klarna) & TWINT.\nShop: luxestyle.ch\n#shorts #onlineshop #schweiz #gadgets'),
 dict(file='reels/shorts/kleider-sommer-yt.mp4',
      title='Sommerkleider 2026 – Schweizer Shop mit Gratis-Versand',
      desc='Sommer-Looks von LuxeStyle 🇨🇭 Gratis-Versand ab CHF 50 · Kauf auf Rechnung (Klarna) & TWINT.\nShop: luxestyle.ch\n#shorts #sommermode #schweiz #fashion'),
 dict(file='reels/shorts/sie-und-ihn-yt.mp4',
      title='Geschenkideen für Sie & Ihn – LuxeStyle Schweiz',
      desc='Schmuck, Uhren & mehr für Paare. 30 Tage Rückgabe · Klarna & TWINT.\nShop: luxestyle.ch\n#shorts #geschenkidee #schweiz #schmuck'),
]
os.chdir('/home/user/aban-news-landing')
LEDGER = 'dropship/_yt_uploads.txt'
done = set(open(LEDGER).read().split('\n')) if os.path.exists(LEDGER) else set()
for v in VIDEOS:
    if v['file'] in done: print('skip (schon hochgeladen):', v['file']); continue
    meta = {'snippet': {'title': v['title'], 'description': v['desc'], 'categoryId': '22', 'defaultLanguage': 'de'},
            'status': {'privacyStatus': 'public', 'selfDeclaredMadeForKids': False}}
    size = os.path.getsize(v['file'])
    for versuch in range(2):
        r = subprocess.run(['curl','-s','-i','-X','POST',
            'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
            '-H','Authorization: Bearer '+AT,'-H','Content-Type: application/json',
            '-H','X-Upload-Content-Type: video/mp4','-H',f'X-Upload-Content-Length: {size}',
            '-d',json.dumps(meta)],capture_output=True,text=True)
        if 'HTTP/2 401' in r.stdout or '"code": 401' in r.stdout:
            AT = refresh_access(); continue
        break
    loc = None
    for line in r.stdout.splitlines():
        if line.lower().startswith('location:'): loc = line.split(':',1)[1].strip()
    if not loc:
        print('FEHLER Session:', v['file'], r.stdout[-300:]); continue
    u = subprocess.run(['curl','-s','-X','PUT',loc,'-H','Authorization: Bearer '+AT,
        '-H','Content-Type: video/mp4','--data-binary','@'+v['file']],capture_output=True,text=True)
    try:
        d = json.loads(u.stdout)
        vid = d.get('id')
        if vid:
            print(f'✅ {v["title"][:45]} → https://youtube.com/shorts/{vid}')
            open(LEDGER,'a').write(v['file']+'\n')
        else:
            print('FEHLER Upload:', json.dumps(d)[:250])
    except Exception:
        print('FEHLER Parse:', u.stdout[:250])
    time.sleep(3)
print('FERTIG')
