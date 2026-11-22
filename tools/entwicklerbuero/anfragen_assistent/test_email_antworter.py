from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from pathlib import Path
import tempfile
import json
import unittest
from email_antworter import verarbeiten


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


if __name__ == "__main__":
    unittest.main()
