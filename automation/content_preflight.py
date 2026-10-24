#!/usr/bin/env python3
"""Inspect LuxeStyle JSON drafts offline; this tool never enables publishing.

Evidence timestamps must include a timezone. Buyability, availability and product
tags expire after 24 hours; supplier mappings after seven days. Visual review and
music rights require a valid, non-future timestamp but have no invented expiry.
An image needs reference_image (HTTPS), optionally image_path for a byte hash.
A video (the default) needs video_path and the existing vertical-master checks.
"""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import parse_qs, urlsplit

NETWORKS = {'instagram', 'facebook', 'threads', 'pinterest', 'tiktok', 'youtube'}
BLOCKED_TAG = re.compile(
    r'nicht-(?:[a-z]+-)?bewerben|google-policy-flag|nicht-live|18plus|adult|gmc-adult|compliance-pruefen|'
    r'verdeckte-ueberwachung|medizinprodukt|social-pause|raucher-rueckhol|-raus-|'
    r'geprueft-gesperrt|marge-verlust|verlust-auto|us-netzteil|nicht-versendbar', re.I)
DAY = timedelta(hours=24)


def _utc_now(now):
    now = datetime.now(timezone.utc) if now is None else now
    if not isinstance(now, datetime) or now.tzinfo is None or now.utcoffset() is None:
        raise ValueError('Die Prüfzeit muss eine Zeitzone enthalten')
    return now.astimezone(timezone.utc)


def _timestamp_error(value, field, now, max_age=None):
    try:
        if not isinstance(value, str) or 'T' not in value:
            raise ValueError
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if stamp.tzinfo is None or stamp.utcoffset() is None:
            raise ValueError
        stamp = stamp.astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return f'{field}: ISO-Zeitstempel mit Zeitzone fehlt oder ist ungültig'
    if stamp > now:
        return f'{field}: Nachweis liegt in der Zukunft'
    if max_age is not None and now - stamp > max_age:
        return f'{field}: Nachweis älter als {int(max_age.total_seconds() // 3600)} Stunden'
    return None


def _evidence_errors(row, flag, label, now, max_age=None, timestamp=None):
    errors = []
    if row.get(flag) is not True:
        errors.append(label)
    field = timestamp or flag.removesuffix('_verified') + '_checked_at'
    error = _timestamp_error(row.get(field), field, now, max_age)
    if error:
        errors.append(error)
    return errors


def _probe_media(path):
    if not shutil.which('ffprobe'):
        raise RuntimeError('ffprobe fehlt: Medienprüfung nicht möglich')
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)],
        capture_output=True, text=True, check=True, timeout=20)
    return json.loads(result.stdout)


def media_errors(path, *, probe=None):
    """Validate an existing video; probe injection keeps tests offline/deterministic."""
    path = Path(path)
    if not path.is_file():
        return ['MP4 fehlt']
    try:
        data = (probe or _probe_media)(path)
        video = next(s for s in data['streams'] if s.get('codec_type') == 'video')
        errors = []
        if 'mp4' not in data['format'].get('format_name', '').split(','):
            errors.append('MP4-Container erforderlich')
        if video.get('codec_name') != 'h264':
            errors.append('H.264-Master erforderlich')
        if (video.get('width'), video.get('height')) != (1080, 1920):
            errors.append('Vertikaler Master muss 1080 × 1920 sein')
        numerator, denominator = video['avg_frame_rate'].split('/')
        if not 29.9 <= float(numerator) / float(denominator) <= 30.1:
            errors.append('Master muss 30 fps haben')
        if not 15 <= float(data['format']['duration']) <= 25:
            errors.append('Master muss 15–25 Sekunden lang sein')
        if not any(s.get('codec_type') == 'audio' and s.get('codec_name') == 'aac'
                   for s in data['streams']):
            errors.append('AAC-Tonspur fehlt')
        return errors
    except RuntimeError as error:
        return [str(error)]
    except (subprocess.SubprocessError, ValueError, KeyError, StopIteration,
            ZeroDivisionError, OSError, TypeError, AttributeError):
        return ['Medienprüfung fehlgeschlagen']


def _https_url(value):
    if not isinstance(value, str) or not value.strip() or any(c.isspace() for c in value):
        return None
    try:
        url = urlsplit(value)
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            return None
        # Accessing port validates malformed authority values too.
        if url.port not in (None, 443):
            return None
        return url
    except ValueError:
        return None


def _file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def _content_identity(row, content_type, media_hash):
    # Hash final content, never an unused alternative hook, approval or timestamp.
    identity = {key: row.get(key) for key in
                ('caption', 'title', 'network', 'product_id', 'product_url', 'tracked_url')}
    identity.update(schema='luxestyle.final-content.v1', content_type=content_type)
    identity['media'] = {'sha256': media_hash}
    if content_type == 'image':
        # The remote image is the actual proposed publishing source. A local hash
        # must not hide a later URL change; matching bytes are not fetched here.
        identity['media']['reference_image'] = row.get('reference_image')
    # These settings also change the material that a reviewer is signing off on.
    if row.get('network') == 'pinterest':
        identity['board_id'] = row.get('board_id')
    if row.get('network') == 'youtube':
        identity['made_for_kids'] = row.get('made_for_kids')
    payload = json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def inspect_queue(rows, root, *, now=None, probe=None):
    if not isinstance(rows, list):
        raise ValueError('Die Queue muss eine JSON-Liste sein')
    now, root = _utc_now(now), Path(root)
    ids, fingerprints, reports = set(), {}, []
    for number, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            raise ValueError(f'Eintrag {number} muss ein Objekt sein')
        errors = []
        entry_id = row.get('id')
        valid_id = isinstance(entry_id, str) and bool(entry_id.strip())
        if not valid_id or entry_id.strip() in ids:
            errors.append('ID fehlt oder ist doppelt')
        if valid_id:
            ids.add(entry_id.strip())
        network = row.get('network')
        if not isinstance(network, str) or network not in NETWORKS:
            errors.append('Unbekannter Kanal')
        content_type = row.get('content_type', 'video')
        if content_type not in ('video', 'image'):
            errors.append('content_type muss video oder image sein')
        tags = row.get('product_tags')
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            errors.append('Produkt-Tags fehlen: Social-Sperren nicht prüfbar')
        else:
            blocked = [tag for tag in tags if BLOCKED_TAG.search(tag)]
            if blocked:
                errors.append('Social-Sperr-Tags: ' + ', '.join(blocked))
        error = _timestamp_error(row.get('product_tags_checked_at'),
                                 'product_tags_checked_at', now, DAY)
        if error:
            errors.append(error)
        for field in ('title', 'caption', 'product_id'):
            if not isinstance(row.get(field), str) or not row[field].strip():
                errors.append(f'{field} fehlt')
        link = _https_url(row.get('tracked_url'))
        base = _https_url(row.get('product_url'))
        if not link or link.hostname != 'luxestyle.ch' or not re.fullmatch(r'/products/[^/]+', link.path):
            errors.append('Tracking-Link zeigt nicht auf ein LuxeStyle-Produkt')
        if not base or not link or base.hostname != 'luxestyle.ch' or base.path != link.path:
            errors.append('Produkt- und Tracking-Link stimmen nicht überein')
        utm = parse_qs(link.query) if link else {}
        if utm.get('utm_source') != [network] or not all(
                utm.get(key) and all(value.strip() for value in utm[key])
                for key in ('utm_medium', 'utm_campaign', 'utm_content')):
            errors.append('Kanalbezogenes UTM-Tracking unvollständig')
        for flag, label, age in (
                ('buyability_verified', 'Kaufbarkeit nicht verifiziert', DAY),
                ('supplier_mapping_verified', 'CJ-SKU/Varianten-Zuordnung nicht verifiziert', 7 * DAY),
                ('supplier_availability_verified', 'Lieferantenbestand und Versand nicht verifiziert', DAY)):
            errors.extend(_evidence_errors(row, flag, label, now, age))
        errors.extend(_evidence_errors(
            row, 'visual_review_passed', 'Professionelle Bild-/Produktprüfung fehlt', now,
            timestamp='visual_review_checked_at'))
        media_hash = None
        media_path = row.get('image_path' if content_type == 'image' else 'video_path')
        if content_type == 'image':
            if not _https_url(row.get('reference_image')):
                errors.append('HTTPS-Referenzbild fehlt oder ist ungültig')
        elif content_type == 'video':
            errors.extend(_evidence_errors(
                row, 'music_rights_verified', 'Musikrechte nicht bestätigt', now))
            if not isinstance(media_path, str) or not media_path.strip():
                errors.append('Gerenderter Master fehlt')
            else:
                errors.extend(media_errors(root / media_path, probe=probe))
        if isinstance(media_path, str) and media_path.strip():
            try:
                media_hash = _file_hash(root / media_path)
            except OSError:
                errors.append('Medieninhalt für SHA256 nicht lesbar')
        if network == 'pinterest' and not (
                isinstance(row.get('board_id'), str) and row['board_id'].strip()):
            errors.append('Pinterest-Board nicht bestätigt')
        if network == 'youtube' and not isinstance(row.get('made_for_kids'), bool):
            errors.append('YouTube-Zielgruppe nicht bestätigt')
        if network == 'youtube' and content_type == 'image':
            errors.append('YouTube benötigt einen Videoentwurf')
        fingerprint = _content_identity(row, content_type, media_hash)
        report_id = entry_id.strip() if valid_id else f'missing-id-{fingerprint[:16]}'
        duplicate_of = fingerprints.get(fingerprint)
        if duplicate_of is not None:
            errors.append('Doppelter Inhaltsentwurf im selben Kanal')
        else:
            fingerprints[fingerprint] = report_id
        approval = row.get('approval')
        approval_notes = ['Inhaberfreigabe am finalen Inhalt separat prüfen; dieses Werkzeug gibt keine Ausspielung frei.']
        if isinstance(approval, dict) and approval.get('status') == 'approved':
            if approval.get('final_content_sha256') != fingerprint:
                approval_notes.append('Hinterlegte Freigabe passt nicht zum final_content_sha256.')
        reports.append({
            'id': entry_id, 'report_id': report_id, 'network': network,
            'content_type': content_type, 'final_content_sha256': fingerprint,
            'fingerprint': fingerprint, 'media_sha256': media_hash,
            'duplicate_of': duplicate_of,
            'result': 'blocked' if errors else 'ready_for_review',
            'content_blockers': errors, 'reasons': errors,
            'approval_pending': True, 'approval_notes': approval_notes,
            'publishing_enabled': False})
    return reports


def build_report(rows, root, *, now=None, probe=None):
    now = _utc_now(now)
    entries = inspect_queue(rows, root, now=now, probe=probe)
    return {
        'mode': 'review_only', 'publishing_enabled': False,
        'checked_at': now.isoformat().replace('+00:00', 'Z'),
        'summary': {
            'total': len(entries),
            'blocked': sum(entry['result'] == 'blocked' for entry in entries),
            'ready_for_review': sum(entry['result'] == 'ready_for_review' for entry in entries),
            'approval_pending': len(entries)},
        'blocked_ids': [entry['report_id'] for entry in entries if entry['result'] == 'blocked'],
        'ready_for_review_ids': [entry['report_id'] for entry in entries
                                 if entry['result'] == 'ready_for_review'],
        'entries': entries}


def _check_output(output, queue, rows):
    """A report may not overwrite any of the source files it just inspected."""
    if output is None:
        return
    sources = [queue]
    if isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict):
                for key in ('video_path', 'image_path'):
                    path = row.get(key)
                    if isinstance(path, str) and path.strip():
                        sources.append(queue.resolve().parent / path)
    for source in sources:
        if (output.resolve() == source.resolve() or
                (output.exists() and source.exists() and output.samefile(source))):
            raise ValueError('Der Bericht darf weder Eingabe-Queue noch Originalmedien überschreiben')


def main(argv=None, *, now=None, probe=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('queue', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--strict', action='store_true', help='Exit 1 bei Inhaltsblockern (CI)')
    args = parser.parse_args(argv)
    try:
        rows = json.loads(args.queue.read_text(encoding='utf-8'))
        _check_output(args.output, args.queue, rows)
        report = build_report(rows, args.queue.resolve().parent, now=now, probe=probe)
        payload = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
        if args.output:
            args.output.write_text(payload, encoding='utf-8')
        else:
            print(payload, end='')
        return 1 if args.strict and report['summary']['blocked'] else 0
    except (OSError, ValueError) as error:
        print(f'Prüfung fehlgeschlagen: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
