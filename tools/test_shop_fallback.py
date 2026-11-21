"""Ersatzkatalog bleibt identisch, auch nach Katalogänderungen; ohne Netz."""
import contextlib
import io
import json
import copy
import re
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import shop_jsonld as shop

class Ersatzkatalog(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        self.paths={'SHOP':root/'shop.html','DATEN':root/'produkte.json','FALLBACK':root/'shop-config.js','EN_DATEN':root/'produkte-en.json','EN_FALLBACK':root/'shop-config-en.js','EN_SHOP':root/'shop-en.html'}
        self.products=[{'slug':'demo-kit','title':'Demo','desc':'Text </script> & Hilfe','price':'CHF 12','buy':'https://example.invalid/demo','bundle':True}]
        self.paths['SHOP'].write_text('<script type="application/ld+json">{"@type":"ItemList"}</script>')
        self.paths['DATEN'].write_text(json.dumps(self.products))
        self.paths['FALLBACK'].write_text('window.ABAN_SHOP = [];')
        self.en_products=[{'slug':'demo-en','title':'English demo','desc':'Own contents','price':'USD 19','buy':'https://example.invalid/en'}]
        self.en_products.append({'slug':'en-alle-kits','title':'All AI Starter Kits (Bundle)','desc':'Original bundle description','price':'€39','buy':'https://example.invalid/own-en-bundle','bundle':True})
        self.en_itemlist={'@context':'https://schema.org','@type':'ItemList','name':'Own English list','url':'https://example.invalid/en/shop',
            'itemListElement':[{'@type':'ListItem','position':1,'extra':'retain list metadata','item':{'@type':'Product','name':self.en_products[-1]['title'],
                'description':'Preserve the existing product scope','brand':{'@type':'Brand','name':'demo brand'},'custom':{'retain':True},
                'offers':{'@type':'Offer','price':'79','priceCurrency':'EUR','url':'https://example.invalid/old-en-bundle','availability':'https://schema.org/InStock','seller':{'name':'unchanged'}}}},
                {'@type':'ListItem','position':2,'item':{'@type':'Product','name':'English demo','description':'Keep this distinct original description',
                    'offers':{'@type':'Offer','price':'19','priceCurrency':'USD','url':'https://example.invalid/en'}}}]}
        self.paths['EN_SHOP'].write_text(self.en_html())
        self.paths['EN_DATEN'].write_text(json.dumps(self.en_products))
        self.paths['EN_FALLBACK'].write_text('window.ABAN_SHOP_EN = [];')
    def run_cli(self,check=False):
        with patch.multiple(shop,create=True,**self.paths),patch('sys.argv',['shop_jsonld.py']+(['--pruefen'] if check else [])),contextlib.redirect_stdout(io.StringIO()):
            return shop.main()
    def fallback(self,en=False):
        datei=self.paths['EN_FALLBACK' if en else 'FALLBACK'];variable='ABAN_SHOP_EN' if en else 'ABAN_SHOP'
        result=subprocess.run(['node','-e',"const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);console.log(JSON.stringify(c.window[process.argv[2]]));",str(datei),variable],check=True,capture_output=True,text=True)
        return json.loads(result.stdout)
    def en_html(self,tree=None):
        body=json.dumps(self.en_itemlist if tree is None else tree,ensure_ascii=False).replace('<','\\u003c')
        return '<!doctype html><title>Unchanged English title</title><script type="application/ld+json">'+body+'</script><main>Unchanged visible page</main>'
    def en_tree(self,html=None):
        text=self.paths['EN_SHOP'].read_text() if html is None else html
        return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',text,re.S).group(1))
    def test_alle_felder_und_sprungziel_werden_erhalten(self):
        self.assertEqual(self.run_cli(),0);self.assertEqual(self.fallback(),self.products)
        self.assertIn('\\u003c',self.paths['FALLBACK'].read_text())
    def test_nur_veralteter_fallback_wird_erkannt(self):
        self.run_cli();self.assertEqual(self.run_cli(True),0)
        self.paths['FALLBACK'].write_text('window.ABAN_SHOP = [];')
        self.assertEqual(self.run_cli(True),1)
    def test_katalogaenderung_und_nicht_kaufbares_produkt(self):
        self.run_cli()
        self.products.append({'slug':'zweites-demo','title':'Zweites','desc':'','price':'CHF 14','buy':''})
        self.paths['DATEN'].write_text(json.dumps(self.products));self.assertEqual(self.run_cli(True),1)
        self.assertEqual(self.run_cli(),0);self.assertEqual(self.fallback(),self.products);self.assertEqual(self.run_cli(True),0)
    def test_sprachen_bleiben_getrennt(self):
        self.assertEqual(self.run_cli(),0)
        self.assertEqual(self.fallback(),self.products)
        self.assertEqual(self.fallback(en=True),self.en_products)
        self.assertIn('data/shop-products-en.json',self.paths['EN_FALLBACK'].read_text())
    def test_veralteter_englischer_fallback_wird_erkannt(self):
        self.run_cli();self.paths['EN_FALLBACK'].write_text('window.ABAN_SHOP_EN = [];')
        self.assertEqual(self.run_cli(True),1)
        self.assertEqual(self.run_cli(),0);self.assertEqual(self.fallback(en=True),self.en_products)
    def test_englische_katalogaenderung_aktualisiert_nur_eigenen_ersatz(self):
        self.run_cli();de=self.paths['FALLBACK'].read_bytes()
        self.en_products[0]['price']='USD 21'
        self.en_products[0]['desc']='Demo </script> & Text'
        self.paths['EN_DATEN'].write_text(json.dumps(self.en_products))
        self.assertEqual(self.run_cli(True),1);self.run_cli()
        self.assertEqual(self.fallback(en=True),self.en_products)
        self.assertEqual(self.paths['FALLBACK'].read_bytes(),de)
        self.assertNotIn('</script>',self.paths['EN_FALLBACK'].read_text())
    def test_pruefen_schreibt_nicht(self):
        before={k:p.read_bytes() for k,p in self.paths.items()}
        self.assertEqual(self.run_cli(True),1)
        self.assertEqual(before,{k:p.read_bytes() for k,p in self.paths.items()})

    def test_en_bundle_abgleich_aendert_nur_drei_bestaetigte_offerfelder(self):
        html=self.en_html(); result=shop.en_angebote_schreiben(html,self.en_products)
        expected=copy.deepcopy(self.en_itemlist)
        expected['itemListElement'][0]['item']['offers'].update(price='39',priceCurrency='EUR',url=self.en_products[-1]['buy'])
        self.assertEqual(self.en_tree(result),expected)
        self.assertTrue(result.startswith('<!doctype html><title>Unchanged English title</title>'))
        self.assertTrue(result.endswith('<main>Unchanged visible page</main>'))
        self.assertEqual(shop.en_angebote_schreiben(result,self.en_products),result)

    def test_en_bundle_ohne_checkout_hat_keinen_offer_und_kann_wiederkommen(self):
        products=copy.deepcopy(self.en_products);products[-1]['buy']=''
        without=shop.en_angebote_schreiben(self.en_html(),products)
        product=self.en_tree(without)['itemListElement'][0]['item']
        self.assertNotIn('offers',product)
        expected=copy.deepcopy(self.en_itemlist['itemListElement'][0]['item']);expected.pop('offers')
        self.assertEqual(product,expected)
        restored=shop.en_angebote_schreiben(without,self.en_products)
        offer=self.en_tree(restored)['itemListElement'][0]['item']['offers']
        self.assertEqual({k:offer[k] for k in ('price','priceCurrency','url')},
                         {'price':'39','priceCurrency':'EUR','url':self.en_products[-1]['buy']})
        self.assertEqual(self.en_tree(restored)['itemListElement'][1],self.en_itemlist['itemListElement'][1])

    def test_gesperrtes_spezialangebot_verliert_offer_und_falsche_zusage(self):
        products=copy.deepcopy(self.en_products);products[0]['buy']='';products[0]['desc']='English source pack not ready. Currently unavailable to buy.'
        result=shop.en_angebote_schreiben(self.en_html(),products);tree=self.en_tree(result)
        target=tree['itemListElement'][1]['item'];expected=copy.deepcopy(self.en_itemlist['itemListElement'][1]['item']);expected.pop('offers');expected['description']=products[0]['desc']
        self.assertEqual(target,expected)
        self.assertEqual(tree['itemListElement'][0]['item']['offers']['price'],'39')
        self.assertEqual(shop.en_angebote_schreiben(result,products),result)

    def test_spaeter_freigegebenes_spezialangebot_nutzt_wieder_eigene_quelle(self):
        products=copy.deepcopy(self.en_products);products[0]['buy']='';products[0]['desc']='Not ready'
        paused=shop.en_angebote_schreiben(self.en_html(),products)
        restored=shop.en_angebote_schreiben(paused,self.en_products);item=self.en_tree(restored)['itemListElement'][1]['item']
        self.assertEqual(item['description'],self.en_products[0]['desc'])
        self.assertEqual(item['offers'],{'@type':'Offer','price':'19','priceCurrency':'USD','url':self.en_products[0]['buy']})

    def test_en_bundle_verweigert_fehlerhafte_preise(self):
        for price in ('','kein Preis','€3.4.5','EUR 39 trailing','CHF NaN',None):
            with self.subTest(price=price):
                products=copy.deepcopy(self.en_products);products[-1]['price']=price
                with self.assertRaises(ValueError):shop.en_angebote_schreiben(self.en_html(),products)

    def test_en_bundle_verweigert_fehlerhafte_offerform(self):
        for offer in ([],[{'@type':'Offer','price':'79'}],'kein Offer',{'@type':'AggregateOffer','lowPrice':'79'}):
            with self.subTest(offer=offer):
                tree=copy.deepcopy(self.en_itemlist);tree['itemListElement'][0]['item']['offers']=offer
                with self.assertRaises(ValueError):shop.en_angebote_schreiben(self.en_html(tree),self.en_products)

    def test_en_bundle_verlangt_eindeutiges_eigenes_bundleziel(self):
        for change in ('ziel-fehlt','ziel-doppelt','produkt-fehlt','produkt-doppelt'):
            with self.subTest(change=change):
                products=copy.deepcopy(self.en_products);tree=copy.deepcopy(self.en_itemlist)
                if change=='ziel-fehlt':tree['itemListElement'].pop(0)
                elif change=='ziel-doppelt':tree['itemListElement'].append(copy.deepcopy(tree['itemListElement'][0]))
                elif change=='produkt-fehlt':products.pop()
                else:products.append(copy.deepcopy(products[-1]))
                with self.assertRaises(ValueError):shop.en_angebote_schreiben(self.en_html(tree),products)

    def test_en_bundle_verlangt_genau_eine_itemlist(self):
        html=self.en_html()
        for malformed in ('<main>Keine ItemList</main>',html+html):
            with self.subTest(html=malformed):
                with self.assertRaises(ValueError):shop.en_angebote_schreiben(malformed,self.en_products)

    def test_en_bundle_haelt_json_im_script_sicher(self):
        tree=copy.deepcopy(self.en_itemlist);tree['itemListElement'][0]['item']['description']='Original </script> & unverändert'
        html=shop.en_angebote_schreiben(self.en_html(tree),self.en_products)
        script=re.search(r'<script type="application/ld\+json">(.*?)</script>',html,re.S).group(1)
        self.assertNotIn('</script>',script)
        self.assertIn('\\u003c',script)
        self.assertEqual(self.en_tree(html)['itemListElement'][0]['item']['description'],'Original </script> & unverändert')

    def test_cli_erkennt_nur_veralteten_en_bundlepreis_ohne_schreiben(self):
        self.assertEqual(self.run_cli(),0)
        tree=self.en_tree();tree['itemListElement'][0]['item']['offers']['price']='79'
        self.paths['EN_SHOP'].write_text(self.en_html(tree))
        before={k:p.read_bytes() for k,p in self.paths.items()}
        self.assertEqual(self.run_cli(True),1)
        self.assertEqual(before,{k:p.read_bytes() for k,p in self.paths.items()})

    def test_cli_generiert_en_bundlepreis_aus_eigener_quelle_ohne_fremdaenderung(self):
        self.assertEqual(self.run_cli(),0)
        de={k:self.paths[k].read_bytes() for k in ('SHOP','DATEN','FALLBACK')}
        self.paths['EN_SHOP'].write_text(self.en_html())
        self.assertEqual(self.run_cli(),0)
        tree=self.en_tree();offer=tree['itemListElement'][0]['item']['offers']
        self.assertEqual((offer['price'],offer['priceCurrency'],offer['url']),('39','EUR',self.en_products[-1]['buy']))
        self.assertEqual(tree['itemListElement'][1],self.en_itemlist['itemListElement'][1])
        self.assertEqual(tree['itemListElement'][0]['item']['description'],self.en_itemlist['itemListElement'][0]['item']['description'])
        self.assertEqual(de,{k:self.paths[k].read_bytes() for k in de})
        self.assertEqual(self.run_cli(True),0)

    def test_cli_naechste_en_preis_und_linkaenderung_folgt_dem_katalog(self):
        self.assertEqual(self.run_cli(),0)
        de={k:self.paths[k].read_bytes() for k in ('SHOP','FALLBACK')}
        self.en_products[-1]['price']='USD 44.50';self.en_products[-1]['buy']='https://example.invalid/own-en-next'
        self.paths['EN_DATEN'].write_text(json.dumps(self.en_products))
        self.assertEqual(self.run_cli(True),1);self.assertEqual(self.run_cli(),0)
        offer=self.en_tree()['itemListElement'][0]['item']['offers']
        self.assertEqual((offer['price'],offer['priceCurrency'],offer['url']),('44.50','USD','https://example.invalid/own-en-next'))
        self.assertEqual(de,{k:self.paths[k].read_bytes() for k in de})
        self.assertEqual(self.run_cli(True),0)

    def test_cli_ungueltiges_en_ziel_stoppt_vor_jeder_dateiaenderung(self):
        for change in ('preis','ziel','offer'):
            with self.subTest(change=change):
                tree=copy.deepcopy(self.en_itemlist);products=copy.deepcopy(self.en_products)
                if change=='preis':products[-1]['price']='kein Preis'
                elif change=='ziel':tree['itemListElement'].pop(0)
                else:tree['itemListElement'][0]['item']['offers']=[]
                self.paths['EN_DATEN'].write_text(json.dumps(products));self.paths['EN_SHOP'].write_text(self.en_html(tree))
                before={k:p.read_bytes() for k,p in self.paths.items()}
                with self.assertRaises(ValueError):self.run_cli()
                self.assertEqual(before,{k:p.read_bytes() for k,p in self.paths.items()})

if __name__=='__main__':unittest.main()
