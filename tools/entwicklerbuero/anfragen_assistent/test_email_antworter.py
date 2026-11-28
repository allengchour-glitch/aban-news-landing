from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from pathlib import Path
import tempfile
import json
import unittest
from unittest.mock import Mock, patch
from email_antworter import verarbeiten


class Schreibprobe:
    """Echte Datei schreiben; danach einen lokalen Fehler oder Austausch auslösen."""
    def __init__(self, datei, fehler=False, teilweise=False, danach=None):
        self.datei = datei
        self.fehler = fehler
        self.teilweise = teilweise
        self.danach = danach

    def __enter__(self):
        self.datei.__enter__()
        return self

    def __exit__(self, *args):
        return self.datei.__exit__(*args)

    def __getattr__(self, name):
        return getattr(self.datei, name)

    def write(self, inhalt):
        if self.fehler:
            if self.teilweise:
                self.datei.write(inhalt[:max(1, len(inhalt) // 2)])
                self.datei.flush()
            raise OSError('Demo: Schreiben unterbrochen')
        anzahl = self.datei.write(inhalt)
        self.datei.flush()
        if self.danach is not None:
            self.danach()
        return anzahl


class EmailTest(unittest.TestCase):
    def raw_header(self, p, name, wert, doppelt=False):
        kopf, trenner, text = p.read_bytes().partition(b'\n\n')
        self.assertTrue(trenner)
        zeilen = kopf.splitlines()
        if not doppelt:
            zeilen = [z for z in zeilen if not z.lower().startswith(name.lower().encode() + b':')]
        zeilen.insert(0, name.encode() + b': ' + wert.encode())
        p.write_bytes(b'\n'.join(zeilen) + b'\n\n' + text)

    def ohne_headerabbruch(self, *args, **kwargs):
        try:
            return verarbeiten(*args, **kwargs)
        except IndexError:
            self.fail('Ein beschädigter Adressheader darf den EML-Stapel nicht abbrechen.')

    def test_defekter_adressheader_erhaelt_gueltigen_firmenentwurf(self):
        for header in ('From', 'Reply-To'):
            for defekt_zuerst in (True, False):
                with self.subTest(header=header, defekt_zuerst=defekt_zuerst), tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    source = root / 'eingang'
                    source.mkdir()
                    gut = self.mail(source, '02-gut.eml' if defekt_zuerst else '01-gut.eml',
                                    Subject='Anfrage', **{'Reply-To': 'Antwort <antwort@example.invalid>'})
                    m = BytesParser(policy=policy.default).parsebytes(gut.read_bytes())
                    m.set_content('Welche Öffnungszeiten haben Sie?')
                    gut.write_bytes(m.as_bytes())
                    kaputt = self.mail(source, '01-unklar.eml' if defekt_zuerst else '02-unklar.eml', Subject='Anfrage')
                    self.raw_header(kaputt, header, '"')
                    original = {p.name: p.read_bytes() for p in source.iterdir()}
                    faq = root / 'faq.json'
                    faq.write_text(json.dumps({'faq': [{'stichwoerter': ['Öffnungszeiten'],
                                                       'antwort': 'Montags 09–12 Uhr.'}]}))
                    report = self.ohne_headerabbruch(source, root / 'out', 'Demobetrieb', 'buero@example.invalid', faq)
                    self.assertEqual((report['gelesen'], report['entwuerfe'], report['versendet']), (2, 1, 0))
                    zeilen = {z['quelldatei']: z for z in report['ergebnisse']}
                    self.assertEqual(zeilen[kaputt.name]['status'], 'Übersprungen')
                    self.assertEqual(zeilen[kaputt.name]['grund'], 'Antwortadresse unklar; manuell prüfen')
                    self.assertNotIn('datei', zeilen[kaputt.name])
                    self.assertEqual(zeilen[gut.name]['status'], 'Entwurf prüfen')
                    self.assertEqual(len(list((root / 'out').glob('*.eml'))), 1)
                    reply = BytesParser(policy=policy.default).parsebytes((root / 'out' / zeilen[gut.name]['datei']).read_bytes())
                    self.assertEqual(reply['To'].addresses[0].addr_spec, 'antwort@example.invalid')
                    self.assertEqual(reply['X-Unsent'], '1')
                    self.assertIsNone(reply['Cc'])
                    self.assertIsNone(reply['Bcc'])
                    self.assertEqual(list(reply.iter_attachments()), [])
                    self.assertIn('Montags 09–12 Uhr.', reply.get_content())
                    self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})
                    seite = (root / 'out/index.html').read_text()
                    self.assertIn(kaputt.name, seite)
                    self.assertIn('Antwortadresse unklar; manuell prüfen', seite)

    def test_defekter_einzeleingang_bleibt_ohne_antwort_entwurf(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root)
            self.raw_header(p, 'Reply-To', '"')
            report = self.ohne_headerabbruch(p, root / 'out', 'Demobetrieb', 'buero@example.invalid')
            self.assertEqual((report['gelesen'], report['entwuerfe'], report['versendet']), (1, 0, 0))
            self.assertEqual(report['ergebnisse'][0]['status'], 'Übersprungen')
            self.assertFalse(list((root / 'out').glob('*.eml')))
            self.assertIn('Antwortadresse unklar; manuell prüfen', (root / 'out/index.html').read_text())

    def test_doppelte_adressheader_bleiben_unklar(self):
        for header in ('From', 'Reply-To'):
            with self.subTest(header=header), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                p = self.mail(root, **{'Reply-To': 'antwort@example.invalid'})
                self.raw_header(p, header, 'andere@example.invalid', doppelt=True)
                report = self.ohne_headerabbruch(p, root / 'out', 'Demobetrieb', 'buero@example.invalid')
                self.assertEqual((report['entwuerfe'], report['versendet']), (0, 0))
                self.assertEqual(report['ergebnisse'][0]['grund'], 'Absender unklar; manuell prüfen')

    def test_html_alternative_bei_leerem_textteil(self):
        for leer in ('', ' \n\t'):
            with self.subTest(leer=repr(leer)), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                p = self.mail(root, Subject='Anfrage')
                m = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
                m.set_content(leer)
                m.add_alternative('<p>Welche Öffnungszeiten gelten?</p><script>Rechnung dringend</script>', subtype='html')
                m.add_attachment(b'Anhang bleibt privat', maintype='application', subtype='octet-stream', filename='intern.txt')
                p.write_bytes(m.as_bytes())
                wissen = root / 'wissen.json'
                wissen.write_text(json.dumps({'faq': [{'stichwoerter': ['Öffnungszeiten'], 'antwort': 'Montags 09–12 Uhr.'}]}))
                bericht = verarbeiten(p, root / 'out', 'Demo', 'buero@example.invalid', wissen)
                self.assertEqual((bericht['entwuerfe'], bericht['versendet']), (1, 0))
                reply = BytesParser(policy=policy.default).parsebytes((root / 'out/antwort-0001.eml').read_bytes())
                self.assertIn('Montags 09–12 Uhr.', reply.get_content())
                self.assertEqual(reply['X-Unsent'], '1')
                self.assertEqual(list(reply.iter_attachments()), [])
                html = (root / 'out/index.html').read_text()
                self.assertIn('Welche Öffnungszeiten gelten?', html)
                self.assertNotIn('Rechnung dringend', html)
                self.assertNotIn('Anhang bleibt privat', html)

    def test_vorhandener_textteil_hat_vorrang(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root)
            m = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
            m.add_alternative('<p>Rechnung dringend</p>', subtype='html')
            p.write_bytes(m.as_bytes())
            bericht = self.run_mail(p, root / 'out')
            self.assertEqual(bericht['entwuerfe'], 1)
            self.assertNotIn('Rechnung dringend', (root / 'out/index.html').read_text())

    def test_anhaenge_ersetzen_keinen_leeren_nachrichtentext(self):
        for nur_anhang in (True, False):
            with self.subTest(nur_anhang=nur_anhang), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                p = self.mail(root)
                m = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
                m.set_content('')
                if not nur_anhang:
                    m.add_alternative('<style>Termin</style><script>Offerte</script>', subtype='html')
                m.add_attachment('<p>Termin zur Besichtigung</p>', subtype='html', filename='anhang.html')
                p.write_bytes(m.as_bytes())
                bericht = self.run_mail(p, root / 'out')
                self.assertEqual((bericht['entwuerfe'], bericht['versendet']), (0, 0))
                self.assertEqual(bericht['ergebnisse'][0]['status'], 'Übersprungen')

    def test_quellzuordnung_fuer_alle_ergebnisarten(self):
        from html import escape
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "eingang"
            source.mkdir()
            for name, text, sender in [
                ("01-kunde&team.eml", "Welche Öffnungszeiten haben Sie?", "kunde@example.invalid"),
                ("02-unklar.eml", "Welche Sonderanfertigung ist möglich?", "kunde@example.invalid"),
                ("03-automatisch.eml", "Öffnungszeiten", "no-reply@example.invalid"),
            ]:
                m = EmailMessage()
                m['From'] = sender
                m['To'] = 'buero@example.invalid'
                m['Subject'] = 'Anfrage'
                m.set_content(text)
                (source / name).write_bytes(m.as_bytes())
            faq = root / 'faq.json'
            faq.write_text(json.dumps({'faq':[{'stichwoerter':['Öffnungszeiten'], 'antwort':'Montags 09–12 Uhr.'}]}))
            report = verarbeiten(source, root / 'out', 'Demo', 'buero@example.invalid', faq)
            self.assertEqual([r['status'] for r in report['ergebnisse']],
                             ['Entwurf prüfen', 'Manuell prüfen', 'Übersprungen'])
            names = sorted(p.name for p in source.iterdir())
            self.assertEqual([r.get('quelldatei') for r in report['ergebnisse']], names)
            saved = json.loads((root/'out/bericht.json').read_text())
            self.assertEqual(saved['ergebnisse'], report['ergebnisse'])
            html = (root/'out/index.html').read_text()
            for name in names:
                self.assertIn('Quelldatei: ' + escape(name), html)
            self.assertNotIn(str(source), html)
            self.assertEqual((report['entwuerfe'],report['manuell_pruefen'],report['versendet']), (1,1,0))

    def faq_lauf(self, root, text, faq):
        p = self.mail(root, Subject="Anfrage")
        m = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
        m.set_content(text)
        p.write_bytes(m.as_bytes())
        wissen = root / "wissen.json"
        wissen.write_text(json.dumps({"faq": faq}))
        return verarbeiten(p, root / "out", "Demo", "buero@example.invalid", wissen)

    def test_firmenwissen_unveraendert_als_ungesendeter_entwurf(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            antwort = "Unsere Öffnungszeiten: Montag bis Freitag, 09–12 Uhr."
            bericht = self.faq_lauf(root, "Welche Öffnungszeiten haben Sie?", [
                {"stichwoerter": ["Öffnungszeiten"], "antwort": antwort}])
            reply = BytesParser(policy=policy.default).parsebytes((root / "out/antwort-0001.eml").read_bytes())
            self.assertIn(antwort, reply.get_content())
            self.assertNotIn("Bitte beschreiben Sie kurz", reply.get_content())
            self.assertEqual(reply["X-Unsent"], "1")
            self.assertEqual((bericht["entwuerfe"], bericht["versendet"]), (1, 0))

    def test_unbekannte_mehrdeutige_und_einzelfaelle_bleiben_manuell(self):
        faq = [{"stichwoerter": ["Kontakt"], "antwort": "Unser Team hilft."},
               {"stichwoerter": ["Zeiten"], "antwort": "Montags."}]
        for text in ["Unbekannte Frage?", "Kontakt und Zeiten?", "Kontakt wegen defekt", "Kontakt wegen Rechnung", "Kontakt sofort", "Kontaktperson?"]:
            with self.subTest(text=text), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                bericht = self.faq_lauf(root, text, faq)
                self.assertEqual((bericht["entwuerfe"], bericht["manuell_pruefen"]), (0, 1))
                self.assertFalse(list((root / "out").glob("*.eml")))
                html = (root / "out/index.html").read_text()
                self.assertIn('data-art="manuell"', html)
                self.assertIn(text, html)

    def test_manueller_inhalt_ist_in_pruefseite_escaped(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.faq_lauf(root, '<script>alert(7)</script>', [])
            html = (root / "out/index.html").read_text()
            self.assertIn('&lt;script&gt;alert(7)', html)
            self.assertNotIn('<script>alert(7)', html)

    def test_ungueltiges_firmenwissen_stoppt_vor_ausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ValueError):
                self.faq_lauf(root, "Kontakt", [{"stichwoerter": [], "antwort": "A"}])
            self.assertFalse((root / "out").exists())

    def mail(self, root, name="eingang.eml", **headers):
        m = EmailMessage()
        for k, v in {"From": "Kunde <kunde@example.invalid>", "To": "buero@example.invalid", "Subject": "Offerte", "Message-ID": "<original@example.invalid>", **headers}.items():
            m[k] = v
        m.set_content("Bitte heute eine Offerte vorbereiten.")
        p = root / name
        p.write_bytes(m.as_bytes())
        return p

    def run_mail(self, source, out):
        return verarbeiten(source, out, "Beispielbetrieb", "buero@example.invalid")

    def test_antwort_entwurf_thread_und_keine_kopieempfaenger(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root, **{"Reply-To": "Service <antwort@example.invalid>", "Cc": "fremd@example.invalid", "References": "<vorher@example.invalid>"})
            bericht = self.run_mail(p, root / "out")
            self.assertEqual(bericht["versendet"], 0)
            reply = BytesParser(policy=policy.default).parsebytes((root / "out/antwort-0001.eml").read_bytes())
            self.assertEqual(reply["To"].addresses[0].addr_spec, "antwort@example.invalid")
            self.assertIsNone(reply["Cc"])
            self.assertIsNone(reply["Bcc"])
            self.assertEqual(reply["In-Reply-To"], "<original@example.invalid>")
            self.assertIn("<vorher@example.invalid>", reply["References"])
            self.assertEqual(reply["X-Unsent"], "1")
            self.assertIn("Ausführungsort", reply.get_content())

    def test_auto_newsletter_noreply_eigene_adresse(self):
        for headers in [{"Auto-Submitted": "auto-replied"}, {"List-Id": "Liste <liste.example.invalid>"},
                        {"From": "no-reply@example.invalid"}, {"From": "buero@example.invalid"},
                        {"Return-Path": "<>"}, {"Precedence": "bulk"}]:
            with self.subTest(headers=headers), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                bericht = self.run_mail(self.mail(root, **headers), root / "out")
                self.assertEqual(bericht["entwuerfe"], 0)
                self.assertEqual(bericht["ergebnisse"][0]["status"], "Übersprungen")

    def test_mehrere_reply_adressen_nicht_erraten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bericht = self.run_mail(self.mail(root, **{"Reply-To": "a@example.invalid,b@example.invalid"}), root / "out")
            self.assertEqual(bericht["entwuerfe"], 0)

    def test_html_ohne_skripte_und_anhaenge(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root, Subject="Termin")
            m = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
            m.set_content('<p>Termin zur Besichtigung</p><script>Defekt dringend</script>', subtype="html")
            m.add_attachment(b'geheimer Anhang', maintype="application", subtype="octet-stream", filename="intern.txt")
            p.write_bytes(m.as_bytes())
            bericht = self.run_mail(p, root / "out")
            self.assertEqual(bericht["ergebnisse"][0]["kategorie"], "termin")
            self.assertEqual(bericht["ergebnisse"][0]["prioritaet"], "normal")
            reply = BytesParser(policy=policy.default).parsebytes((root / "out/antwort-0001.eml").read_bytes())
            self.assertEqual(list(reply.iter_attachments()), [])
            self.assertNotIn("geheimer Anhang", reply.get_content())

    def test_ungueltiger_absender_keine_ausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root)
            with self.assertRaises(ValueError):
                verarbeiten(p, root / "out", "Demo", "Firma\nBcc: fremd@example.invalid")
            self.assertFalse((root / "out").exists())

    def test_doppelte_message_id_und_kein_ueberschreiben(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.mail(root, "a.eml")
            self.mail(root, "b.eml")
            bericht = self.run_mail(root, root / "out")
            self.assertEqual(bericht["entwuerfe"], 1)
            with self.assertRaises(ValueError):
                self.run_mail(root, root / "out")

    def test_pruefseite_zeigt_original_entwurf_und_uebersprungene(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.mail(root, "a.eml")
            self.mail(root, "b.eml", **{"Auto-Submitted": "auto-replied"})
            self.run_mail(root, root / "out")
            html = (root / "out/index.html").read_text()
            self.assertIn('data-art="entwurf"', html)
            self.assertIn('data-art="übersprungen"', html)
            self.assertIn("Bitte heute eine Offerte vorbereiten.", html)
            self.assertIn("Ausführungsort", html)
            self.assertIn("Automatische Nachricht", html)
            self.assertIn('href="antwort-0001.eml"', html)
            self.assertNotIn('href="antwort-0002.eml"', html)
            self.assertIn("sendet keine E-Mails", html)

    def test_pruefseite_behandelt_fremden_inhalt_als_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = self.mail(root, Subject='<img src=x onerror=alert(1)>')
            mail = BytesParser(policy=policy.default).parsebytes(p.read_bytes())
            mail.set_content('</textarea><script>alert(2)</script> & Originaltext')
            p.write_bytes(mail.as_bytes())
            verarbeiten(p, root / "out", '<script>alert(3)</script>', "buero@example.invalid")
            html = (root / "out/index.html").read_text()
            self.assertNotIn('<img src=x', html)
            self.assertNotIn('<script>alert(', html)
            self.assertIn('&lt;/textarea&gt;&lt;script&gt;alert(2)', html)
            self.assertEqual(html.count('<script>'), 1)
            self.assertIn("connect-src 'none'", html)
            self.assertIn('&lt;script&gt;alert(3)', html)

    def test_re_betreff_wird_nicht_verdoppelt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.run_mail(self.mail(root, Subject="Re: Offerte"), root / "out")
            reply = BytesParser(policy=policy.default).parsebytes((root / "out/antwort-0001.eml").read_bytes())
            self.assertEqual(reply["Subject"], "Re: Offerte")

    def stapel_fuer_schreibprobe(self, root):
        source = root / 'eingang'
        source.mkdir()
        for n in (1, 2):
            self.mail(source, f'{n}.eml', **{'Message-ID': f'<demo-{n}@example.invalid>'})
        return source, {p.name: p.read_bytes() for p in source.iterdir()}

    def test_schreibfehler_bereinigt_eigene_ausgabe_und_erlaubt_manuellen_neustart(self):
        # Dieselbe Fehlerinjektion trifft das bisherige wb/w und das neue xb.
        for name in ('antwort-0001.eml', 'antwort-0002.eml', 'index.html', 'bericht.json'):
            for teilweise in (False, True):
                with self.subTest(datei=name, teilweise=teilweise), tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    source, original = self.stapel_fuer_schreibprobe(root)
                    out = root / 'out'
                    oeffnen = Path.open
                    gestoert = []

                    def mit_fehler(p, *args, **kwargs):
                        mode = args[0] if args else kwargs.get('mode', 'r')
                        datei = oeffnen(p, *args, **kwargs)
                        if p == out / name and any(c in mode for c in 'wx'):
                            gestoert.append(p.name)
                            return Schreibprobe(datei, fehler=True, teilweise=teilweise)
                        return datei

                    with patch.object(Path, 'open', mit_fehler):
                        with self.assertRaisesRegex(OSError, 'Demo: Schreiben unterbrochen'):
                            self.run_mail(source, out)
                    self.assertEqual(gestoert, [name], 'Keine automatische Wiederholung nach Schreibfehler.')
                    self.assertFalse(out.exists(), 'Eigene Teilausgabe darf den manuellen Neustart nicht blockieren.')
                    self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})
                    # Ein ausdrücklicher neuer Aufruf nach Ende der Störung.
                    bericht = self.run_mail(source, out)
                    self.assertEqual((bericht['gelesen'], bericht['entwuerfe'], bericht['versendet']), (2, 2, 0))
                    self.assertEqual(json.loads((out / 'bericht.json').read_text()), bericht)
                    self.assertEqual(sorted(p.name for p in out.iterdir()),
                                     ['antwort-0001.eml', 'antwort-0002.eml', 'bericht.json', 'index.html'])
                    antwort = BytesParser(policy=policy.default).parsebytes((out / 'antwort-0001.eml').read_bytes())
                    self.assertEqual(antwort['X-Unsent'], '1')
                    self.assertEqual(antwort['To'].addresses[0].addr_spec, 'kunde@example.invalid')

    def test_serialisierungsfehler_erzeugt_keine_teilausgabe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, original = self.stapel_fuer_schreibprobe(root)
            out = root / 'out'
            with patch.dict(verarbeiten.__globals__, {'erstellen': Mock(side_effect=ValueError('Demo: Ansicht unlesbar'))}):
                with self.assertRaisesRegex(ValueError, 'Demo: Ansicht unlesbar'):
                    self.run_mail(source, out)
            self.assertFalse(out.exists())
            self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})

    def test_bestehende_ausgabepfade_bleiben_unveraendert(self):
        for art in ('ordner', 'datei', 'symlink', 'defekter-symlink'):
            with self.subTest(art=art), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                source, original = self.stapel_fuer_schreibprobe(root)
                out, fremd = root / 'out', root / 'fremd'
                fremd.mkdir()
                (fremd / 'behalten.txt').write_bytes(b'Fremder Bestand')
                if art == 'ordner':
                    out.mkdir()
                    (out / 'behalten.txt').write_bytes(b'Eigener Altbestand')
                elif art == 'datei':
                    out.write_bytes(b'Vorhandene Datei')
                else:
                    try:
                        out.symlink_to(fremd if art == 'symlink' else root / 'fehlt', target_is_directory=True)
                    except (OSError, NotImplementedError):
                        self.skipTest('Diese Umgebung unterstützt keine Verzeichnis-Symlinks.')
                before = out.lstat()
                with self.assertRaises((ValueError, OSError)):
                    self.run_mail(source, out)
                self.assertEqual((out.lstat().st_dev, out.lstat().st_ino), (before.st_dev, before.st_ino))
                self.assertEqual((fremd / 'behalten.txt').read_bytes(), b'Fremder Bestand')
                self.assertEqual(sorted(p.name for p in fremd.iterdir()), ['behalten.txt'])
                if art == 'ordner':
                    self.assertEqual((out / 'behalten.txt').read_bytes(), b'Eigener Altbestand')
                    self.assertEqual(sorted(p.name for p in out.iterdir()), ['behalten.txt'])
                elif art == 'datei':
                    self.assertEqual(out.read_bytes(), b'Vorhandene Datei')
                else:
                    self.assertTrue(out.is_symlink())
                    self.assertEqual(out.readlink(), fremd if art == 'symlink' else root / 'fehlt')
                self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})

    def test_eingeschobene_fremde_ausgabedatei_wird_nicht_ersetzt(self):
        for symlink in (False, True):
            with self.subTest(symlink=symlink), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                source, original = self.stapel_fuer_schreibprobe(root)
                out = root / 'out'
                behalten = root / 'behalten.txt'
                behalten.write_bytes(b'Fremde Daten erhalten')
                oeffnen = Path.open
                eingeschoben = []

                def fremde_datei(p, *args, **kwargs):
                    mode = args[0] if args else kwargs.get('mode', 'r')
                    if p == out / 'antwort-0002.eml' and any(c in mode for c in 'wx'):
                        eingeschoben.append(p.name)
                        if symlink:
                            p.symlink_to(behalten)
                        else:
                            with oeffnen(p, 'xb') as f:
                                f.write(b'Fremde Daten erhalten')
                        # xb muss jetzt ablehnen. Die alte wb-Fassung öffnet die
                        # Fremddatei und trifft denselben partiellen Schreibfehler.
                        return Schreibprobe(oeffnen(p, *args, **kwargs), fehler=True, teilweise=True)
                    return oeffnen(p, *args, **kwargs)

                with patch.object(Path, 'open', fremde_datei):
                    with self.assertRaises(OSError):
                        self.run_mail(source, out)
                self.assertEqual(eingeschoben, ['antwort-0002.eml'])
                self.assertEqual((out / 'antwort-0002.eml').read_bytes(), b'Fremde Daten erhalten')
                self.assertEqual(behalten.read_bytes(), b'Fremde Daten erhalten')
                self.assertEqual((out / 'antwort-0002.eml').is_symlink(), symlink)
                self.assertEqual(sorted(p.name for p in out.iterdir()), ['antwort-0002.eml'])
                self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})

    def test_ausgetauschter_ausgabeordner_wird_nicht_bereinigt(self):
        for symlink in (False, True):
            with self.subTest(symlink=symlink), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                source, original = self.stapel_fuer_schreibprobe(root)
                out, verschoben, fremd = root / 'out', root / 'verschoben', root / 'fremd'
                fremd.mkdir()
                (fremd / 'antwort-0001.eml').write_bytes(b'Fremde Antwort erhalten')
                oeffnen = Path.open

                def ordner_austauschen(p, *args, **kwargs):
                    mode = args[0] if args else kwargs.get('mode', 'r')
                    if p == out / 'antwort-0002.eml' and any(c in mode for c in 'wx'):
                        out.rename(verschoben)
                        if symlink:
                            out.symlink_to(fremd, target_is_directory=True)
                        else:
                            fremd.rename(out)
                        raise OSError('Demo: Ausgabeordner ausgetauscht')
                    return oeffnen(p, *args, **kwargs)

                with patch.object(Path, 'open', ordner_austauschen):
                    with self.assertRaisesRegex(OSError, 'Demo: Ausgabeordner ausgetauscht'):
                        self.run_mail(source, out)
                self.assertEqual((out / 'antwort-0001.eml').read_bytes(), b'Fremde Antwort erhalten')
                self.assertEqual(sorted(p.name for p in out.iterdir()), ['antwort-0001.eml'])
                self.assertEqual(out.is_symlink(), symlink)
                self.assertTrue((verschoben / 'antwort-0001.eml').is_file())
                self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})

    def test_symlink_nach_ordneranlage_wird_nicht_als_eigene_ausgabe_uebernommen(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, original = self.stapel_fuer_schreibprobe(root)
            out, verschoben, fremd = root / 'out', root / 'verschoben', root / 'fremd'
            fremd.mkdir()
            (fremd / 'behalten.txt').write_bytes(b'Fremder Ordner erhalten')
            mkdir = Path.mkdir

            def nach_anlage(p, *args, **kwargs):
                mkdir(p, *args, **kwargs)
                if p == out:
                    out.rename(verschoben)
                    out.symlink_to(fremd, target_is_directory=True)

            with patch.object(Path, 'mkdir', nach_anlage):
                with self.assertRaises(OSError):
                    self.run_mail(source, out)
            self.assertEqual(sorted(p.name for p in fremd.iterdir()), ['behalten.txt'])
            self.assertEqual((fremd / 'behalten.txt').read_bytes(), b'Fremder Ordner erhalten')
            self.assertTrue(out.is_symlink())
            self.assertEqual(list(verschoben.iterdir()), [])
            self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})

    def test_ausgetauschter_ordner_stoppt_vor_naechstem_schreiben(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, original = self.stapel_fuer_schreibprobe(root)
            out, verschoben, fremd = root / 'out', root / 'verschoben', root / 'fremd'
            fremd.mkdir()
            (fremd / 'behalten.txt').write_bytes(b'Fremder Ordner erhalten')
            oeffnen = Path.open

            def austauschen():
                out.rename(verschoben)
                out.symlink_to(fremd, target_is_directory=True)

            def nach_erster_datei(p, *args, **kwargs):
                mode = args[0] if args else kwargs.get('mode', 'r')
                datei = oeffnen(p, *args, **kwargs)
                if p == out / 'antwort-0001.eml' and any(c in mode for c in 'wx'):
                    return Schreibprobe(datei, danach=austauschen)
                return datei

            with patch.object(Path, 'open', nach_erster_datei):
                with self.assertRaises(OSError):
                    self.run_mail(source, out)
            self.assertEqual(sorted(p.name for p in fremd.iterdir()), ['behalten.txt'])
            self.assertEqual((fremd / 'behalten.txt').read_bytes(), b'Fremder Ordner erhalten')
            self.assertTrue(out.is_symlink())
            self.assertTrue((verschoben / 'antwort-0001.eml').is_file())
            self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})


if __name__ == "__main__":
    unittest.main()
