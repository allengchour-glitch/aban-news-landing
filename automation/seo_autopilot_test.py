"""Selbsttest seo_autopilot (23.11.2026): Produktblock nur bei Kopf-Treffer im Titel; Rücklesen ohne Leerraum. Aufruf aus Repo-Wurzel: python3 automation/seo_autopilot_test.py"""
import sys,os; sys.path.insert(0,'automation'); os.environ.pop('SCHARF',None)
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

import importlib.util
spec=importlib.util.spec_from_file_location('sa','automation/seo_autopilot.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
F=[('Wickel','Rizinusöl-Wickel wiederverwendbar · Bauch & Nacken',True),('Wickel','Polka-Dot Wickel-Rock',False),('Wickel','Wickelbluse mit V-Ausschnitt',False),
   ('Wickel','7-Chakra Wickelarmband',False),('Wickel','Wickelkleid Midi',False),('Wickel','Bauchwickel für Rizinusöl',True),
   ('Kerzen','Duftkerze im Glas',True),('Kerzen','Kerzenhalter aus Messing',False),('Lampen','Himalaya Salzlampe 3 kg',True),('Lampen','Lampenschirm Leinen',False),
   ('Seidenkissenbezug','Seidenkissenbezug 100% Maulbeerseide',True),('Henkeltasche','Henkeltaschen-Set',False),('Henkeltasche','Damen Henkeltasche Leder',True),
   ('Gesichtsreiniger','Sanfter Gesichtsreiniger 150 ml',True),('Geschenkset','Geschenksets für Männer',True),('Chronograph','Chronograph Herrenuhr',True),
   ('Elektronik','Multifunktionales Reparatur-Set für Elektronik',False),('Elektronik','Reise-Organizer für Elektronik',False),
   ('Kerzen','Aromatherapie Kerzen- & Seifenform',False),('Kerzen','Silikonform Häschenohren – Backen & Kerzen giessen',False),('Kerzen','Schaumform für Kerzen',False),
   ('Kerzen','Silikonform Muschel-Kerzen',False),('Kerzen','Duftkerzen 3er-Set Vanille',True),('Kerzen','Set Duftkerzen Vanille',True),
   ('Gesichtspflege','LED-Farblicht-Pflaster für die Gesichtspflege',False),('Gesichtspflege','Kupfer Peptid Gesichtspflege Liquid',True),('Crossbody','Elegante Umhängetasche in Lack-Optik – Crossbody, kompakt (3 Farben)',True),('Seidenkissenbezug','Satin-Seidenkissenbezug 2er-Set – sanft zu Haut & Haar',True)]
bad=[(w,t,e) for w,t,e in F if m.titel_traegt(w,t)!=e]
print('titel_traegt: Fälle',len(F),'falsch',bad)
assert m.body_gleich('<ul><li>a</li></ul>','<ul>\n<li>a</li>\n</ul>') and not m.body_gleich('<p>a</p>','<p>b</p>')
assert m.ERWACHSENE.search(m.norm('Männer-Geschenke unter 50 CHF')) and m.KIND.search(m.norm('Winter-Geschenkset für Kinder'))



class AuffrischungTest(unittest.TestCase):
    variante = '<a href="/products/vintage?variant=55751175569793">Set mit Ring</a>'
    artikeltext = '<a href="/collections/geschenke">Geschenke</a>'
    karte = {"handle": "vintage", "titel": "Vintage-Schmuck", "preistext": "CHF 18.90"}

    def auffrischen(self, redaktion, karten, auswahl, geaendert=False):
        # Vorhandene strukturierte FAQ. Diese Tests betreffen nur den Produktblock.
        body = (self.artikeltext + redaktion + '<script type="application/ld+json">{"@type":"FAQPage"}</script>'
                + m.block_ersetzen("", m.MARKE_P, karten))
        artikel = {"id": "gid://shopify/Article/1", "handle": "schmuck", "title": "Schmuck",
                   "body": body, "isPublished": True}
        geschrieben = []

        def shopify(query, variables=None, versuche=8):
            if "articles(first:" in query:
                return {"articles": {"nodes": [artikel], "pageInfo": {"hasNextPage": False}}}
            if "node(id:$id)" in query:
                return {"node": dict(artikel, body=body + " später" if geaendert else body)}
            if "articleUpdate(" in query:
                self.assertEqual(versuche, 1)
                geschrieben.append(variables["a"]["body"])
                return {"articleUpdate": {"article": {"body": geschrieben[-1]}, "userErrors": []}}
            self.fail("Unerwarteter Shopify-Aufruf im Offline-Test")

        with TemporaryDirectory() as tmp, patch.dict(os.environ, {"NUR": ""}), redirect_stdout(StringIO()):
            with patch.multiple(m, gql=shopify, ware_zum_thema=auswahl, besuche_je_artikel=dict,
                                AUFFRISCH_LEDGER=Path(tmp) / "ledger.tsv", SCHARF=True):
                m.auffrischen(1)
        return geschrieben

    def test_ausgewaehlte_variante_im_haupttext(self):
        tasse = {"handle": "tasse", "titel": "Keramiktasse", "preistext": "CHF 19.90–20.90"}
        (body,) = self.auffrischen(self.variante, "alt", Mock(return_value=("Schmuck", [self.karte, tasse])))
        self.assertIn(self.variante, body)
        self.assertNotIn('href="/products/vintage"', body)
        self.assertIn('href="/products/tasse"', body)

    def test_preisband_an_der_karte(self):
        preise = {"minVariantPrice": {"amount": "19.90", "currencyCode": "CHF"},
                  "maxVariantPrice": {"amount": "20.90", "currencyCode": "CHF"}}
        karte = dict(self.karte, preistext=m.chf_preisspanne(preise))
        self.assertIn("CHF 19.90–20.90", m.produkt_block([karte], "geschenke", "Geschenke"))
        self.assertEqual(m.chf_preisspanne({"minVariantPrice": preise["minVariantPrice"]}), "")

    def test_unklare_auswahl_behaelt_karten(self):
        auswahl = Mock(side_effect=RuntimeError("Warenauskunft fehlt"))
        self.assertEqual(self.auffrischen("", "bestehende Karte", auswahl), [])
        auswahl.assert_called_once()

    def test_redaktionelle_variante_im_block(self):
        auswahl = Mock()
        self.assertEqual(self.auffrischen("", self.variante, auswahl), [])
        auswahl.assert_not_called()

    def test_spaetere_redaktionelle_aenderung(self):
        auswahl = Mock(return_value=("Schmuck", [self.karte]))
        self.assertEqual(self.auffrischen("", "bestehende Karte", auswahl, geaendert=True), [])



class UnklarerSchreibstandTest(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ledger = Path(self.tmp.name) / "auffrischen.tsv"
        self.alt = '<a href="/collections/geschenke">Geschenke</a>'
        self.neu = '<p>Vintage Schmuck</p>'
        self.artikel = {"id": "gid://shopify/Article/1", "handle": "schmuck", "title": "Schmuck",
                        "isPublished": True, "body": self.alt}

    def verloren(self, lesen):
        schreibaufruf = Mock(side_effect=RuntimeError("Verbindung unterbrochen"))
        with patch.multiple(m, gql=schreibaufruf, artikel_lesen=lesen, AUFFRISCH_LEDGER=self.ledger):
            with redirect_stdout(StringIO()):
                status = m.artikel_einmal_schreiben(self.artikel, self.neu, "produkte:schmuck")
            offen = m.auffrisch_ledger()["schmuck"]
        self.assertEqual(len(offen), 7)
        self.assertEqual(offen[4:], [self.artikel["id"], m.body_hash(self.alt), m.body_hash(self.neu, shopify=True)])
        schreibaufruf.assert_called_once()
        self.assertEqual(schreibaufruf.call_args.kwargs, {"versuche": 1})
        lesen.assert_called_once_with(self.artikel["id"])
        return status

    def test_ein_schreibversuch_am_transport(self):
        netz = Mock(side_effect=TimeoutError("offline"))
        with patch.object(m.urllib.request, "urlopen", netz), patch.object(m.time, "sleep") as pause:
            with patch.dict(os.environ, {"SHOPIFY_ADMIN_TOKEN": "offline-attrappe"}), redirect_stderr(StringIO()):
                with self.assertRaises(RuntimeError):
                    m.gql("mutation { beispiel }", {}, versuche=1)
        netz.assert_called_once()
        pause.assert_not_called()

    def test_verloren_nach_erfolg(self):
        self.assertEqual(self.verloren(Mock(return_value=dict(self.artikel, body=self.neu))), "ok")

    def test_verloren_und_fremdaenderung(self):
        self.assertEqual(self.verloren(Mock(return_value=dict(self.artikel, body="<p>VintageSchmuck</p>"))), "unklar")

    def test_verloren_und_lesefehler(self):
        self.assertEqual(self.verloren(Mock(side_effect=RuntimeError("Lesen nicht möglich"))), "unklar")

    def test_folgelauf_original_ziel_und_fremdfassung(self):
        karte = dict(AuffrischungTest.karte)
        for stand, erwartet in [(self.alt, 1), (self.neu, 0), ("<p>Fremdfassung</p>", 0)]:
            with self.subTest(stand=stand), patch.object(m, "AUFFRISCH_LEDGER", self.ledger):
                m.auffrisch_beleg("schmuck", "unklar", "produkte:schmuck", self.artikel["id"],
                                  m.body_hash(self.alt), m.body_hash(self.neu, shopify=True))
                artikel = dict(self.artikel, body=stand)
                def shopify(query, variables=None):
                    self.assertIn("articles(first:", query)
                    return {"articles": {"nodes": [artikel], "pageInfo": {"hasNextPage": False}}}
                auswahl = Mock(return_value=("Schmuck", [karte]))
                schreiben = Mock(return_value="ok")
                with patch.multiple(m, gql=shopify, ware_zum_thema=auswahl, besuche_je_artikel=dict,
                                    artikel_lesen=Mock(return_value=artikel), artikel_einmal_schreiben=schreiben, SCHARF=True):
                    with patch.dict(os.environ, {"NUR": "schmuck"}), redirect_stdout(StringIO()):
                        m.auffrischen(1)
                self.assertEqual(schreiben.call_count, erwartet)
                self.assertEqual(auswahl.call_count, erwartet)
                self.assertEqual(m.auffrisch_ledger()["schmuck"][2], "unklar" if stand not in (self.neu, self.alt) else "ok")

ergebnis = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
sys.exit(1 if bad or not ergebnis.wasSuccessful() else 0)
