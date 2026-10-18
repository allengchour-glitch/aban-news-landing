#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Wächter für die Sicherheitsregel (Content-Security-Policy) in `_headers`.

Hintergrund (gemessen am 18.10.2026, live im Browser über sieben Seiten):
die Regel verbot `https://static.cloudflareinsights.com` — genau das Skript,
das Cloudflare an jede Seite anhängt, um Besuche zu zählen. Jede Seite meldete
„Refused to load the script … violates the following Content Security Policy".
Die Datenschutzerklärung sagt unter 6.2 ausdrücklich, dass Cloudflare Web
Analytics verwendet wird; gezählt wurde trotzdem nichts. Diese Tests halten
das fest, damit die Zählung nicht wieder still verschwindet.

Gegenrichtung ist genauso wichtig: die Regel darf nicht weich werden. Darum
prüfen die Tests auch, was NICHT drinstehen darf (`unsafe-eval`, ein offenes
`*`, `http:`) und dass die bezahlten Wege (Stripe, PayPal, Lemon Squeezy)
erhalten bleiben.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEADERS = ROOT / "_headers"
INDEX = ROOT / "index.html"

# Das Mess-Skript, das Cloudflare an jede Seite anhängt.
ZAEHLUNG = "https://static.cloudflareinsights.com"


def policy() -> str:
    for zeile in HEADERS.read_text(encoding="utf-8").splitlines():
        s = zeile.strip()
        if s.startswith("Content-Security-Policy:"):
            return s.split(":", 1)[1].strip()
    raise AssertionError("keine Content-Security-Policy in _headers")


def direktive(name: str) -> list[str]:
    for teil in policy().split(";"):
        w = teil.split()
        if w and w[0] == name:
            return w[1:]
    return []


class TestZaehlung(unittest.TestCase):
    def test_zaehl_skript_ist_erlaubt(self):
        # Der eigentliche Fund: ohne diesen Eintrag zählt die Seite niemanden.
        self.assertIn(ZAEHLUNG, direktive("script-src"))

    def test_kein_platzhalter_sondern_der_echte_host(self):
        # Cloudflare liefert das Skript von static.cloudflareinsights.com;
        # ein Eintrag auf cloudflareinsights.com ohne "static." trifft nicht.
        self.assertTrue(ZAEHLUNG.startswith("https://static."))

    def test_zaehlung_braucht_kein_eigenes_connect_src(self):
        # Gemessen: der Beacon schickt seine Werte an
        # https://abannews.com/cdn-cgi/rum — also an die eigene Herkunft, die
        # 'self' schon abdeckt. Ein zusätzlicher Host wäre unnötig weit.
        self.assertNotIn("https://cloudflareinsights.com", direktive("connect-src"))
        self.assertIn("'self'", direktive("connect-src"))

    def test_datenschutz_nennt_die_zaehlung(self):
        # Die Erklärung verspricht die Messung — die Regel muss sie zulassen,
        # sonst widersprechen sich Aussage und Wirklichkeit.
        t = (ROOT / "datenschutz.html").read_text(encoding="utf-8")
        self.assertIn("Cloudflare Web Analytics", t)


class TestRegelBleibtEng(unittest.TestCase):
    """Gegenprobe: der Fix darf die Regel nicht aufweichen."""

    def test_kein_unsafe_eval(self):
        self.assertNotIn("'unsafe-eval'", policy())

    def test_kein_offenes_sternchen_bei_skripten(self):
        self.assertNotIn("*", [q.strip() for q in direktive("script-src")])

    def test_keine_unverschluesselten_quellen(self):
        for q in re.findall(r"\bhttp://\S+", policy()):
            self.fail(f"unverschlüsselte Quelle in der Regel: {q}")

    def test_grundregel_bleibt_self(self):
        self.assertEqual(direktive("default-src"), ["'self'"])

    def test_einbetten_bleibt_verboten(self):
        self.assertEqual(direktive("frame-ancestors"), ["'none'"])

    def test_objekte_bleiben_verboten(self):
        self.assertEqual(direktive("object-src"), ["'none'"])

    def test_nur_ein_host_kam_dazu(self):
        # Vorher-Stand vom 17.10.2026, wörtlich. So fällt jede weitere
        # Lockerung auf, statt sich unbemerkt einzuschleichen.
        vorher = ["'self'", "'unsafe-inline'", "https://*.paypal.com",
                  "https://*.paypalobjects.com", "https://lmsqueezy.com"]
        self.assertEqual(direktive("script-src"), vorher + [ZAEHLUNG])


class TestKaufwegeBleiben(unittest.TestCase):
    """Die Regel darf keinen Zahlungsweg abschneiden."""

    def test_stripe_darf_das_formular_empfangen(self):
        self.assertIn("https://buy.stripe.com", direktive("form-action"))

    def test_lemonsqueezy_darf_das_formular_empfangen(self):
        self.assertIn("https://*.lemonsqueezy.com", direktive("form-action"))

    def test_paypal_bleibt_vollstaendig(self):
        for d in ("script-src", "connect-src", "frame-src", "form-action"):
            self.assertIn("https://*.paypal.com", direktive(d), d)


class TestToterPartnertag(unittest.TestCase):
    """Der Impact-Tag auf der Startseite war dreifach wirkungslos.

    Gemessen am 18.10.2026: das Programmskript antwortet mit HTTP 403
    (AccessDenied, XML statt JavaScript), es hat 0 Links umgeschrieben, und
    die Sicherheitsregel hat es ohnehin blockiert. Dazu sagt die
    Datenschutzerklärung unter 6.3 „Keine 3rd-Party-Tracking".
    """

    def test_kein_impact_skript_mehr_auf_der_startseite(self):
        self.assertNotIn("impactcdn.com", INDEX.read_text(encoding="utf-8"))

    def test_impact_host_ist_nicht_erlaubt(self):
        # Gegenprobe zur Entfernung: wäre der Host erlaubt, hätte der Tag
        # wieder geladen — und die Erklärung wäre falsch.
        self.assertNotIn("impactcdn", policy())

    def test_besitznachweis_bleibt_erhalten(self):
        # Die Meta beweist nur, wem die Domain gehört, und misst nichts.
        # Auf den blossen Text zu prüfen reichte NICHT: der Kommentar, der die
        # Entfernung erklärt, nennt den Namen ebenfalls — die Mutationsprobe
        # (Meta-Zeile gelöscht) lief damit durch. Darum das echte Element.
        meta = re.findall(r"<meta[^>]*impact-site-verification[^>]*>",
                          INDEX.read_text(encoding="utf-8"))
        self.assertEqual(len(meta), 1, meta)

    def test_kein_anderes_dokument_laedt_den_tag(self):
        treffer = [p.name for p in ROOT.glob("*.html")
                   if "impactcdn.com" in p.read_text(encoding="utf-8", errors="replace")]
        self.assertEqual(treffer, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
