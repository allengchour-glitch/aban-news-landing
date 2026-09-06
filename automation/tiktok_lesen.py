#!/usr/bin/env python3
"""Liest ein TikTok-Video von hier aus LESBAR: Titel, Kanal und den gesprochenen Text.

    python3 automation/tiktok_lesen.py https://vm.tiktok.com/XXXX/

Warum das geht, obwohl die TikTok-App clientseitig rendert (Lehre 28./29.08.):
Die Videoseite kommt SERVERSEITIG mit rund 400 KB. Darin steht der Block
`"claInfo":{... "captionInfos":[{ "url": "...", "captionFormat": "webvtt" }]}` —
die automatisch erzeugten Untertitel als fertige WebVTT-Datei.

⚠️ Die Untertitel-URL traegt ein `expire` (rund 24 h) und braucht den Referer
   `https://www.tiktok.com/` — sofort holen, nicht aufheben.
⚠️ Hat das Video keine Auto-Untertitel (`enableAutoCaption:false`), gibt es hier
   NICHTS zu holen. Dann wird das ehrlich gemeldet, statt aus dem Titel zu raten —
   eine erfundene Zusammenfassung waere schlimmer als keine.
"""
import json, re, sys, urllib.request, urllib.error

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')


def hole(url, referer=None, timeout=45):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept-Language': 'de-CH,de;q=0.9',
        **({'Referer': referer} if referer else {}),
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'replace')


def aufloesen(url):
    """vm.tiktok.com-Kurzlink zur vollen Video-Adresse aufloesen."""
    if '/video/' in url:
        return url.split('?')[0]

    class Stopp(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            raise urllib.error.HTTPError(newurl, code, msg, headers, fp)

    op = urllib.request.build_opener(Stopp)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with op.open(req, timeout=30) as r:
            return r.geturl().split('?')[0]
    except urllib.error.HTTPError as e:
        ziel = e.filename if isinstance(e.filename, str) else str(e.url)
        return ziel.split('?')[0]


def untertitel_url(html):
    m = re.search(r'"captionInfos":\[(.{0,6000}?)\]', html, re.S)
    if not m:
        return None
    u = re.search(r'"url":"(.*?)"', m.group(1))
    if not u:
        return None
    return u.group(1).encode().decode('unicode_escape')


def vtt_text(vtt):
    zeilen = []
    for z in vtt.splitlines():
        z = z.strip()
        if not z or '-->' in z or z == 'WEBVTT' or z.isdigit():
            continue
        if zeilen and zeilen[-1] == z:      # TikTok wiederholt Zeilen ueber Segmente
            continue
        zeilen.append(z)
    return '\n'.join(zeilen)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    voll = aufloesen(sys.argv[1])
    print('Video:', voll)

    try:
        o = json.loads(hole('https://www.tiktok.com/oembed?url=' + voll))
        print('Kanal:', o.get('author_name'))
        print('Titel:', o.get('title'))
    except Exception as e:
        print('oembed nicht erreichbar:', e)

    try:
        html = hole(voll)
    except Exception as e:
        print('⛔ Videoseite nicht erreichbar:', e)
        sys.exit(1)

    u = untertitel_url(html)
    if not u:
        auto = '"enableAutoCaption":true' in html
        print('⛔ Keine Untertitel-Spur in der Seite'
              + (' (enableAutoCaption ist true — evtl. noch in Arbeit).' if auto
                 else ' (das Video hat keine Auto-Untertitel).'))
        print('   Aus dem Titel den Inhalt zu RATEN ist keine Antwort — beim Betreiber nachfragen.')
        sys.exit(3)

    try:
        vtt = hole(u, referer='https://www.tiktok.com/')
    except Exception as e:
        print('⛔ Untertitel nicht ladbar (abgelaufen?):', e)
        sys.exit(4)

    print('\n--- Gesprochener Text ---')
    print(vtt_text(vtt))


if __name__ == '__main__':
    main()
