import copy
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from content_preflight import build_report, inspect_queue, main, media_errors

NOW = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)
STAMP = '2026-10-17T12:00:00Z'


def good_probe(_path):
    return {'streams': [
        {'codec_type': 'video', 'codec_name': 'h264', 'width': 1080, 'height': 1920,
         'avg_frame_rate': '30/1'},
        {'codec_type': 'audio', 'codec_name': 'aac'}],
        'format': {'duration': '20', 'format_name': 'mov,mp4,m4a,3gp,3g2,mj2'}}


class ContentPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.row = {
            'id': 'draft-a', 'content_type': 'image', 'network': 'instagram',
            'title': 'Tasche', 'caption': 'Entdecken', 'product_id': 'p1',
            'product_url': 'https://luxestyle.ch/products/tasche',
            'tracked_url': 'https://luxestyle.ch/products/tasche?utm_source=instagram&'
                           'utm_medium=organic_social&utm_campaign=test&utm_content=a',
            'reference_image': 'https://cdn.shopify.com/product.jpg',
            'product_tags': ['cj-real', 'tasche'], 'product_tags_checked_at': STAMP,
            'buyability_verified': True, 'buyability_checked_at': STAMP,
            'supplier_availability_verified': True, 'supplier_availability_checked_at': STAMP,
            'supplier_mapping_verified': True, 'supplier_mapping_checked_at': STAMP,
            'visual_review_passed': True, 'visual_review_checked_at': STAMP}

    def check(self, row=None, **kwargs):
        return inspect_queue([self.row if row is None else row], self.root, now=NOW, **kwargs)[0]

    def video(self):
        row = copy.deepcopy(self.row)
        row.pop('content_type')  # Video is the backwards-compatible default.
        row.update(video_path='master.mp4', music_rights_verified=True,
                   music_rights_checked_at=STAMP)
        (self.root / 'master.mp4').write_bytes(b'fake MP4 for offline probe')
        return row

    def test_complete_image_is_only_ready_for_review_without_video_or_music(self):
        with patch('content_preflight._probe_media', side_effect=AssertionError('no probe for image')):
            result = self.check()
        self.assertEqual(result['result'], 'ready_for_review')
        self.assertEqual(result['content_blockers'], [])
        self.assertTrue(result['approval_pending'])
        self.assertFalse(result['publishing_enabled'])

    def test_image_needs_https_reference_and_visual_review(self):
        for image in (None, 'http://example.com/a.jpg', 'https://user:pass@example.com/a.jpg',
                      'https://example.com:bad/a.jpg', 'https://exa mple.com/a.jpg'):
            with self.subTest(image=image):
                row = dict(self.row, reference_image=image)
                self.assertIn('HTTPS-Referenzbild fehlt oder ist ungültig', self.check(row)['content_blockers'])
        row = dict(self.row, visual_review_passed=False)
        self.assertIn('Professionelle Bild-/Produktprüfung fehlt', self.check(row)['content_blockers'])

    def test_default_video_uses_probe_and_requires_music_and_master(self):
        row = self.video()
        self.assertEqual(self.check(row, probe=good_probe)['result'], 'ready_for_review')
        row.pop('music_rights_checked_at')
        self.assertTrue(any('music_rights_checked_at' in error for error in self.check(row, probe=good_probe)['content_blockers']))
        row['video_path'] = None
        self.assertIn('Gerenderter Master fehlt', self.check(row)['content_blockers'])

    def test_existing_master_validation_handles_bad_and_malformed_probe(self):
        path = self.root / 'master.mp4'
        path.write_bytes(b'video')
        bad = good_probe(path)
        bad['streams'][0].update(codec_name='hevc', width=720, height=1280,
                                 avg_frame_rate='60/1')
        bad['streams'].pop()
        bad['format']['duration'] = '60'
        errors = media_errors(path, probe=lambda _: bad)
        self.assertEqual(len(errors), 5)
        self.assertIn('AAC-Tonspur fehlt', errors)
        matroska = good_probe(path)
        matroska['format']['format_name'] = 'matroska,webm'
        self.assertEqual(media_errors(path, probe=lambda _: matroska), ['MP4-Container erforderlich'])
        self.assertEqual(media_errors(path, probe=lambda _: {'streams': None}),
                         ['Medienprüfung fehlgeschlagen'])
        self.assertEqual(media_errors(path, probe=lambda _: {
            'streams': [dict(good_probe(path)['streams'][0], avg_frame_rate='30/0')]}),
            ['Medienprüfung fehlgeschlagen'])
        self.assertEqual(media_errors(self.root / 'missing.mp4'), ['MP4 fehlt'])

    def test_true_flags_without_timestamps_are_not_evidence(self):
        for field in ('buyability_checked_at', 'supplier_mapping_checked_at',
                      'supplier_availability_checked_at', 'product_tags_checked_at',
                      'visual_review_checked_at'):
            with self.subTest(field=field):
                row = dict(self.row)
                row.pop(field)
                result = self.check(row)
                self.assertEqual(result['result'], 'blocked')
                self.assertTrue(any(field in error for error in result['content_blockers']))

    def test_timestamp_timezones_future_dates_and_expiry_boundaries(self):
        for field, hours in (('buyability_checked_at', 24),
                             ('supplier_availability_checked_at', 24),
                             ('product_tags_checked_at', 24),
                             ('supplier_mapping_checked_at', 168)):
            with self.subTest(field=field):
                at_limit = (NOW - timedelta(hours=hours)).isoformat()
                self.assertEqual(self.check(dict(self.row, **{field: at_limit}))['result'], 'ready_for_review')
                stale = (NOW - timedelta(hours=hours, seconds=1)).isoformat()
                self.assertTrue(any('älter' in error for error in self.check(dict(self.row, **{field: stale}))['content_blockers']))
        for value in ('2026-10-17', '2026-10-17T12:00:00', 'invalid',
                      '2026-10-17T12:00:01Z', '2026-10-17T14:00:01+02:00'):
            with self.subTest(value=value):
                self.assertEqual(self.check(dict(self.row, buyability_checked_at=value))['result'], 'blocked')
        self.assertEqual(self.check(dict(self.row, buyability_checked_at='2026-10-17T14:00:00+02:00'))['result'], 'ready_for_review')
        with self.assertRaises(ValueError):
            inspect_queue([self.row], self.root, now=NOW.replace(tzinfo=None))

    def test_booleans_are_not_truthy_strings_or_numbers(self):
        for value in ('true', 1, None):
            self.assertIn('Kaufbarkeit nicht verifiziert',
                          self.check(dict(self.row, buyability_verified=value))['content_blockers'])

    def test_final_hash_tracks_final_fields_not_hooks_evidence_ids_or_approval(self):
        original = self.check()['final_content_sha256']
        self.assertEqual(len(original), 64)
        for field in ('title', 'caption', 'network', 'product_id', 'product_url',
                      'tracked_url', 'reference_image', 'content_type'):
            with self.subTest(field=field):
                row = dict(self.row, **{field: self.row[field] + '-changed'})
                self.assertNotEqual(self.check(row)['final_content_sha256'], original)
        row = dict(self.row, id='other', hook_a='Unused hook', approval={'status': 'approved'},
                   buyability_checked_at='2026-10-17T11:00:00Z')
        self.assertEqual(self.check(row)['final_content_sha256'], original)
        self.assertEqual(self.check()['fingerprint'], original)

    def test_local_media_hash_changes_when_bytes_change_and_not_when_renamed(self):
        path = self.root / 'image.jpg'
        path.write_bytes(b'first image')
        row = dict(self.row, image_path='image.jpg')
        one = self.check(row)
        self.assertEqual(one['media_sha256'], hashlib.sha256(b'first image').hexdigest())
        self.assertNotEqual(self.check(dict(row, reference_image='https://cdn.shopify.com/other.jpg'))['final_content_sha256'], one['final_content_sha256'])
        (self.root / 'copy.jpg').write_bytes(path.read_bytes())
        self.assertEqual(self.check(dict(row, image_path='copy.jpg'))['final_content_sha256'], one['final_content_sha256'])
        path.write_bytes(b'changed image')
        self.assertNotEqual(self.check(row)['final_content_sha256'], one['final_content_sha256'])

    def test_duplicate_uses_final_content_even_with_different_unused_hook(self):
        other = dict(self.row, id='draft-b', hook_a='different unused hook')
        reports = inspect_queue([self.row, other], self.root, now=NOW)
        self.assertEqual(reports[1]['duplicate_of'], 'draft-a')
        self.assertIn('Doppelter Inhaltsentwurf im selben Kanal', reports[1]['content_blockers'])
        self.assertEqual(reports[0]['result'], 'ready_for_review')

    def test_approval_payload_never_enables_publishing_or_becomes_content_blocker(self):
        digest = self.check()['final_content_sha256']
        for approval in (None, True, {}, {'status': 'approved'},
                         {'status': 'approved', 'final_content_sha256': digest}):
            with self.subTest(approval=approval):
                report = build_report([dict(self.row, approval=approval)], self.root, now=NOW)
                self.assertFalse(report['publishing_enabled'])
                self.assertEqual(report['entries'][0]['result'], 'ready_for_review')
                self.assertTrue(report['entries'][0]['approval_pending'])
                self.assertEqual(report['entries'][0]['content_blockers'], [])

    def test_link_spoof_cross_product_and_incomplete_tracking_are_blocked(self):
        spoof = dict(self.row, tracked_url=self.row['tracked_url'].replace('luxestyle.ch', 'luxestyle.ch.example.com'))
        self.assertIn('Tracking-Link zeigt nicht auf ein LuxeStyle-Produkt', self.check(spoof)['content_blockers'])
        row = dict(self.row, product_url='https://luxestyle.ch/products/other')
        self.assertIn('Produkt- und Tracking-Link stimmen nicht überein', self.check(row)['content_blockers'])
        row = dict(self.row, tracked_url=self.row['tracked_url'].replace('utm_source=instagram', 'utm_source=tiktok'))
        self.assertIn('Kanalbezogenes UTM-Tracking unvollständig', self.check(row)['content_blockers'])

    def test_social_blocking_tags_missing_tags_and_platform_requirements(self):
        for tag in ('adult-nicht-bewerben', '18plus', 'nicht-live', 'gmc-adult-pull',
                    'compliance-pruefen', 'social-pause-halloween', 'raucher-rueckhol-0809',
                    'harness-google-raus-2026-08-21', 'marge-verlust-draft',
                    'verdeckte-ueberwachung', 'medizinprodukt', 'nicht-versendbar',
                    'nicht-google-bewerben', 'google-policy-flag'):
            with self.subTest(tag=tag):
                self.assertIn('Social-Sperr-Tags: ' + tag,
                              self.check(dict(self.row, product_tags=[tag]))['content_blockers'])
        self.assertFalse(any(reason.startswith('Social-Sperr-Tags:') for reason in
                             self.check(dict(self.row, product_tags=['rueckhol-0907']))['content_blockers']))
        self.assertIn('Produkt-Tags fehlen: Social-Sperren nicht prüfbar',
                      self.check(dict(self.row, product_tags=None))['content_blockers'])
        self.assertIn('Pinterest-Board nicht bestätigt', self.check(dict(self.row, network='pinterest'))['content_blockers'])
        result = self.check(dict(self.row, network='youtube', made_for_kids='false'))
        self.assertIn('YouTube-Zielgruppe nicht bestätigt', result['content_blockers'])
        self.assertIn('YouTube benötigt einen Videoentwurf', result['content_blockers'])

    def test_summary_ids_input_immutability_and_cli_exit_contract(self):
        blocked = dict(self.row, id='draft-b', caption='Other', buyability_verified=False)
        rows = [self.row, blocked]
        before = copy.deepcopy(rows)
        report = build_report(rows, self.root, now=NOW)
        self.assertEqual(rows, before)
        self.assertEqual(report['summary'], {'total': 2, 'blocked': 1,
                                            'ready_for_review': 1, 'approval_pending': 2})
        self.assertEqual(report['blocked_ids'], ['draft-b'])
        self.assertEqual(report['ready_for_review_ids'], ['draft-a'])
        queue = self.root / 'queue.json'
        queue.write_text(json.dumps(rows))
        original = queue.read_bytes()
        for strict, expected in ((False, 0), (True, 1)):
            with redirect_stdout(io.StringIO()) as out:
                code = main([str(queue)] + (['--strict'] if strict else []), now=NOW)
            self.assertEqual(code, expected)
            self.assertFalse(json.loads(out.getvalue())['publishing_enabled'])
            self.assertEqual(queue.read_bytes(), original)
        queue.write_text(json.dumps([self.row]))
        with redirect_stdout(io.StringIO()):
            self.assertEqual(main([str(queue), '--strict'], now=NOW), 0)
        report_path = self.root / 'report.json'
        source_before = queue.read_bytes()
        self.assertEqual(main([str(queue), '--output', str(report_path)], now=NOW), 0)
        self.assertEqual(json.loads(report_path.read_text())['summary']['ready_for_review'], 1)
        self.assertEqual(queue.read_bytes(), source_before)
        with redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(queue), '--output', str(queue)], now=NOW), 2)

    def test_invalid_queue_ids_and_missing_ids_have_stable_reports(self):
        for rows in ({'not': 'list'}, [None]):
            with self.assertRaises(ValueError):
                inspect_queue(rows, self.root, now=NOW)
        row = dict(self.row, id=None)
        self.assertEqual(self.check(row)['report_id'], self.check(row)['report_id'])
        result = inspect_queue([self.row, dict(self.row, caption='Other')], self.root, now=NOW)
        self.assertIn('ID fehlt oder ist doppelt', result[1]['content_blockers'])

    def test_report_output_cannot_overwrite_source_media_or_aliases(self):
        row = self.video()
        queue = self.root / 'queue.json'
        queue.write_text(json.dumps([row]))
        master = self.root / 'master.mp4'
        before = master.read_bytes()
        symlink = self.root / 'alias.mp4'
        symlink.symlink_to(master)
        hardlink = self.root / 'hardlink.mp4'
        hardlink.hardlink_to(master)
        for output in (master, symlink, hardlink):
            with self.subTest(output=output.name), redirect_stderr(io.StringIO()):
                self.assertEqual(main([str(queue), '--output', str(output)], now=NOW,
                                      probe=good_probe), 2)
            self.assertEqual(master.read_bytes(), before)
        row = dict(self.row, image_path='image.jpg')
        image = self.root / 'image.jpg'
        image.write_bytes(b'original image')
        queue.write_text(json.dumps([row]))
        with redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(queue), '--output', str(image)], now=NOW), 2)
        self.assertEqual(image.read_bytes(), b'original image')


if __name__ == '__main__':
    unittest.main()
