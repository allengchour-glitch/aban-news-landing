#!/usr/bin/env python3
"""Liest alle Textdateien des Haupt-Themes (nur lesend) in einen Ordner. Aufruf: theme_dump.py <Zielordner>"""
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import shop as S  # noqa: E402

Q_THEME = '''query{ themes(first:30, roles:[MAIN]){ nodes{ id name role } } }'''
Q_DATEIEN = '''query($id:ID!,$c:String){ theme(id:$id){ files(first:40, after:$c){ pageInfo{ hasNextPage endCursor }
  nodes{ filename size body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }'''


def main():
    ziel = sys.argv[1]
    os.makedirs(ziel, exist_ok=True)
    shop, tok = S.token()
    t = S.gql(shop, tok, Q_THEME)['themes']['nodes'][0]
    print('Theme', t['name'], t['id'])
    c, n = None, 0
    while True:
        d = S.gql(shop, tok, Q_DATEIEN, {'id': t['id'], 'c': c})['theme']['files']
        for f in d['nodes']:
            txt = (f.get('body') or {}).get('content')
            if txt is None:
                continue
            pfad = os.path.join(ziel, f['filename'])
            os.makedirs(os.path.dirname(pfad), exist_ok=True)
            open(pfad, 'w', encoding='utf-8').write(txt)
            n += 1
        if not d['pageInfo']['hasNextPage']:
            break
        c = d['pageInfo']['endCursor']
    json.dump({'id': t['id'], 'name': t['name']}, open(os.path.join(ziel, '_theme.json'), 'w'))
    print(n, 'Textdateien in', ziel)


if __name__ == '__main__':
    main()
