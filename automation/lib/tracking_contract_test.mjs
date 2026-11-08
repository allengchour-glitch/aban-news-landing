/**
 * Fixture-Tests fuer den read-only Tracking-Vertrag.
 * Lauf: node automation/lib/tracking_contract_test.mjs
 */
import { readFile } from 'node:fs/promises';
import {
  consentBefund,
  exitCodeFuer,
  produktseitePruefen,
  STATUS,
  trackingVertragAusHtml,
  webPixelListeAusHtml,
} from './tracking_contract.mjs';

const fixture = name => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const [okHtml, fehltGaHtml, kaputtHtml, keinArrayHtml] = await Promise.all([
  fixture('tracking_contract_ok.html'),
  fixture('tracking_contract_missing_ga.html'),
  fixture('tracking_contract_malformed.html'),
  fixture('tracking_contract_not_array.html'),
]);

let anzahl = 0;
let fehler = 0;
function pruef(name, bedingung, extra = '') {
  anzahl++;
  if (bedingung) {
    console.log(`ok   ${name}`);
    return;
  }
  fehler++;
  console.log(`FAIL ${name}${extra ? ` — ${extra}` : ''}`);
}

const ok = trackingVertragAusHtml(okHtml);
pruef('Fixture: Pixel-Liste lesbar', webPixelListeAusHtml(okHtml).status === STATUS.PASS);
pruef('Fixture: statischer Vertrag erfuellt', ok.statischeKonfiguration.status === STATUS.PASS, JSON.stringify(ok));
pruef('Fixture: Gesamtbeobachtung bleibt UNKNOWN', ok.status === STATUS.UNKNOWN);
pruef('Fixture: GT ist kein direkter GA4-Beleg', ok.konfiguriert.ga.status === STATUS.UNKNOWN);
pruef('Fixture: Google Tag konfiguriert', ok.konfiguriert.gt.status === STATUS.PASS);
pruef('page_view: GA4 geroutet', ok.routing.ereignisse.page_view.kanaele.ga.status === STATUS.PASS);
pruef('view_item: GA4 geroutet', ok.routing.ereignisse.view_item.kanaele.ga.status === STATUS.PASS);
pruef('page_view: Ads separat PASS', ok.routing.ereignisse.page_view.kanaele.aw.status === STATUS.PASS);
pruef('view_item: Ads separat PASS', ok.routing.ereignisse.view_item.kanaele.aw.status === STATUS.PASS);
pruef('page_view: Merchant separat PASS', ok.routing.ereignisse.page_view.kanaele.mc.status === STATUS.PASS);
pruef('view_item: Merchant separat PASS', ok.routing.ereignisse.view_item.kanaele.mc.status === STATUS.PASS);
pruef('vollstaendiges statisches Routing: Exit 0', exitCodeFuer(ok) === 0);

const fehltGa = trackingVertragAusHtml(fehltGaHtml);
pruef('Gegenprobe: fehlendes GA4 ist statisch FAIL', fehltGa.statischeKonfiguration.status === STATUS.FAIL, JSON.stringify(fehltGa));
pruef('Gegenprobe: page_view ohne GA4 ist FAIL', fehltGa.routing.ereignisse.page_view.kanaele.ga.status === STATUS.FAIL);
pruef('Gegenprobe: view_item ohne GA4 ist FAIL', fehltGa.routing.ereignisse.view_item.kanaele.ga.status === STATUS.FAIL);
pruef('Gegenprobe: Ads bleibt getrennt PASS', fehltGa.routing.ereignisse.page_view.kanaele.aw.status === STATUS.PASS);
pruef('Gegenprobe: Merchant bleibt getrennt PASS', fehltGa.routing.ereignisse.page_view.kanaele.mc.status === STATUS.PASS);
pruef('fehlendes GA4: Exit nonzero', exitCodeFuer(fehltGa) === 1);

const nurGt = trackingVertragAusHtml(okHtml.replaceAll('G-YJXJVC5KRX', 'GT-WVRZQPLZ'));
pruef('GT-Ziel ersetzt exakte GA4-Mess-ID nicht', nurGt.routing.status === STATUS.FAIL);

const kaputt = trackingVertragAusHtml(kaputtHtml);
pruef('kaputte Konfiguration ist UNKNOWN', kaputt.status === STATUS.UNKNOWN, JSON.stringify(kaputt));
pruef('fehlendes HTML ist UNKNOWN', trackingVertragAusHtml('').status === STATUS.UNKNOWN);
pruef('Marker ohne direktes Array ist UNKNOWN', trackingVertragAusHtml(keinArrayHtml).statischeKonfiguration.status === STATUS.UNKNOWN);
const fremdesPixel = trackingVertragAusHtml('<script>wpmLoader({webPixelsConfigList: []})</script>');
pruef('belegt fehlender Google-Pixel ist FAIL', fremdesPixel.status === STATUS.FAIL);

const pixel = webPixelListeAusHtml(okHtml).liste[0];
const doppelt = trackingVertragAusHtml(`<script>wpmLoader({webPixelsConfigList:${JSON.stringify([pixel, pixel])}})</script>`);
pruef('doppelter Google-Pixel ist UNKNOWN', doppelt.statischeKonfiguration.status === STATUS.UNKNOWN);
const mitCustom = trackingVertragAusHtml(`<script>wpmLoader({webPixelsConfigList:${JSON.stringify([pixel, { id: 'shopify-custom-pixel', type: 'CUSTOM' }])}})</script>`);
pruef('Custom Pixel wird separat UNKNOWN gemeldet', mitCustom.customPixel.status === STATUS.UNKNOWN && mitCustom.customPixel.anzahl === 1);

pruef('Consent ohne Beobachtung ist UNKNOWN', consentBefund().status === STATUS.UNKNOWN);
pruef('Consent-Fehler ist UNKNOWN', consentBefund({ fehler: 'Browser blockiert' }).status === STATUS.UNKNOWN);
pruef('Consent granted ist PASS', consentBefund({ analytics_storage: 'granted' }).status === STATUS.PASS);
pruef('Consent denied ist FAIL', consentBefund({ analytics_storage: 'denied' }).status === STATUS.FAIL);

function antwort(status, html = okHtml, url = 'https://luxestyle.ch/products/test') {
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    text: async () => html,
  };
}

let aufrufe = 0;
let requestInit;
const liveGegenprobe = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async (_url, init) => {
    aufrufe++;
    requestInit = init;
    return antwort(200, fehltGaHtml);
  },
});
pruef('Probe nutzt genau eine Anfrage', aufrufe === 1, String(aufrufe));
pruef('Probe nutzt GET ohne Body und ohne Redirect-Follow', requestInit.method === 'GET' && requestInit.body === undefined && requestInit.redirect === 'manual', JSON.stringify(requestInit));
pruef('Probe meldet Fixture-Fehler nonzero', exitCodeFuer(liveGegenprobe) === 1, JSON.stringify(liveGegenprobe));

const gedrosselt = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => antwort(429, ''),
});
pruef('HTTP 429 ist UNKNOWN', gedrosselt.status === STATUS.UNKNOWN, JSON.stringify(gedrosselt));
pruef('HTTP 429: Exit 2', exitCodeFuer(gedrosselt) === 2);

const serverfehler = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => antwort(503, ''),
});
pruef('HTTP 503 ist UNKNOWN', serverfehler.status === STATUS.UNKNOWN);

const netzfehler = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => { throw new Error('ECONNRESET'); },
});
pruef('Netzfehler ist UNKNOWN', netzfehler.status === STATUS.UNKNOWN, JSON.stringify(netzfehler));

let redirectAufrufe = 0;
const redirect = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => { redirectAufrufe++; return antwort(302, '', 'https://luxestyle.ch/products/test'); },
});
pruef('Redirect bleibt nach einer Anfrage UNKNOWN', redirect.status === STATUS.UNKNOWN && redirectAufrufe === 1);

const fehlt = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => antwort(404, ''),
});
pruef('echter HTTP 404 ist FAIL', fehlt.status === STATUS.FAIL);

let ungueltigAufgerufen = false;
const ungueltig = await produktseitePruefen({
  url: 'https://luxestyle.ch/collections/test',
  fetchFn: async () => { ungueltigAufgerufen = true; return antwort(200); },
});
pruef('nur Produktpfade; andere URL wird nicht geladen', ungueltig.status === STATUS.UNKNOWN && !ungueltigAufgerufen);

for (const url of ['http://luxestyle.ch/products/test', 'https://example.com/products/test', 'http://127.0.0.1/products/private']) {
  const blockiert = await produktseitePruefen({
    url,
    fetchFn: async () => { ungueltigAufgerufen = true; return antwort(200); },
  });
  pruef(`fremdes Ziel wird vor GET blockiert: ${url}`, blockiert.status === STATUS.UNKNOWN && blockiert.request.anfragen === 0);
}

const umleitung = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => antwort(200, okHtml, 'https://luxestyle.ch/'),
});
pruef('Umleitung weg vom Produkt ist FAIL', umleitung.status === STATUS.FAIL);

const erfolgreicheProbe = await produktseitePruefen({
  url: 'https://luxestyle.ch/products/test',
  fetchFn: async () => antwort(200, okHtml),
});
pruef('Produktprobe: statisches Routing ist PASS', erfolgreicheProbe.statischeKonfiguration.status === STATUS.PASS, JSON.stringify(erfolgreicheProbe));
pruef('Produktprobe: Gesamtbeobachtung bleibt UNKNOWN', erfolgreicheProbe.status === STATUS.UNKNOWN);
pruef('Produktprobe: statischer Exit 0', exitCodeFuer(erfolgreicheProbe) === 0);

console.log(`\n${anzahl - fehler} ok, ${fehler} Fehler`);
process.exitCode = fehler ? 1 : 0;
