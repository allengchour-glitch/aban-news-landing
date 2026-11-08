from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from pathlib import Path
import tempfile
import unittest
from email_antworter import verarbeiten


class EmailTest(unittest.TestCase):
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

    def test_re_betreff_wird_nicht_verdoppelt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.run_mail(self.mail(root, Subject="Re: Offerte"), root / "out")
            reply = BytesParser(policy=policy.default).parsebytes((root / "out/antwort-0001.eml").read_bytes())
            self.assertEqual(reply["Subject"], "Re: Offerte")


if __name__ == "__main__":
    unittest.main()
