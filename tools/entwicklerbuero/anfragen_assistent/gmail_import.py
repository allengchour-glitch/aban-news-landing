#!/usr/bin/env python3
"""Gespeicherte Gmail-Raw-Antworten lokal als unveränderte EML-Dateien übernehmen."""
import argparse
import base64
import binascii
import json
from pathlib import Path

MAX_BYTES = 2 * 1024 * 1024
MAX_EXPORT = 8 * 1024 * 1024


def importieren(eingabe, ausgabe):
    source, out = Path(eingabe), Path(ausgabe)
    if out.exists():
        raise ValueError('Ausgabeordner existiert bereits; neuen Ordner wählen.')
    if source.stat().st_size > MAX_EXPORT:
        raise ValueError('Gmail-Export überschreitet 8 MiB.')
    data = json.loads(source.read_text(encoding='utf-8'))
    mails = data if isinstance(data, list) else [data]
    if not 1 <= len(mails) <= 100:
        raise ValueError('Eine bis 100 gespeicherte Gmail-Raw-Antworten erforderlich.')
    ids, gelesen = set(), []
    # Erst den gesamten Stapel prüfen: defekte Antworten erzeugen keine Teilausgabe.
    for row in mails:
        if not isinstance(row, dict):
            raise ValueError('Gmail-Raw-Antwort muss ein Objekt sein.')
        mid, raw = row.get('id'), row.get('raw')
        if not isinstance(mid, str) or not mid.strip() or len(mid) > 200 or any(ord(c) < 32 for c in mid):
            raise ValueError('Gmail-Kennung fehlt oder ist ungültig.')
        if mid in ids:
            raise ValueError('Doppelte Gmail-Kennung im Stapel.')
        ids.add(mid)
        if not isinstance(raw, str) or not raw or len(raw) > 4 * ((MAX_BYTES + 2) // 3):
            raise ValueError('Gmail-Rohinhalt fehlt oder überschreitet 2 MiB.')
        try:
            content = base64.b64decode(raw + '=' * (-len(raw) % 4), altchars=b'-_', validate=True)
        except (ValueError, binascii.Error) as e:
            raise ValueError('Gmail-Rohinhalt ist kein gültiges Base64url.') from e
        if not content or len(content) > MAX_BYTES:
            raise ValueError('Gmail-Rohinhalt leer oder grösser als 2 MiB.')
        gelesen.append((mid, content))
    out.mkdir(parents=True)
    ergebnisse = []
    for n, (mid, content) in enumerate(gelesen, 1):
        # Fremde Kennungen werden niemals als Dateiname oder Pfad verwendet.
        name = f'gmail-{n:04d}.eml'
        (out / name).write_bytes(content)
        ergebnisse.append({'gmail_id': mid, 'quelldatei': name})
    report = {'version': 1, 'quelle': 'Gespeicherte Gmail-Raw-Antworten',
              'importiert': len(ergebnisse), 'postfach_abgerufen': False,
              'versendet': 0, 'ergebnisse': ergebnisse}
    (out / 'import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('eingabe', type=Path)
    parser.add_argument('ausgabe', type=Path)
    args = parser.parse_args()
    try:
        r = importieren(args.eingabe, args.ausgabe)
    except (ValueError, OSError) as e:
        parser.exit(2, 'Abbruch: ' + str(e) + '\n')
    print(json.dumps({'importiert': r['importiert'], 'versendet': 0}))


if __name__ == '__main__':
    main()
