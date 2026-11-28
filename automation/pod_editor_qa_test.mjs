import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pruefeEditor } from './lib/pod_editor_daten.mjs';

// Gekürzte öffentliche Produktkarte der Samsung-Hülle vom 28.11.2026.
const variante = '67813421941127';
const kartenUrl = 'https://abannews.com/pod/v6/maps/lspod-16672778289543.karte.json?v=45d26cdef940f5fb';
const ausschnitt = {
  id: 'default', printfile: { breitePx: 1396, hoehePx: 2304 },
  vorlage: { vorlageBreite: 728, vorlageHoehe: 728, flaecheLinks: 196, flaecheOben: 87, flaecheBreite: 336, flaecheHoehe: 554 },
};
const modell = { schema: 1, printfulProductId: 686, platzierungen: [ausschnitt] };
const karte = { schema: 1, modelle: { 686: modell }, shop: { varianten: { [variante]: { pv: 16982, m: 686 } } } };
const vorschau = { schema: 1, modelle: { 686: { adapter: 'flach' } } };
const block = (attrs, kinder = '') => '<div class="lspod-designer-v6" data-variant="' + variante + '" ' + attrs + '>' + kinder + '</div>';
const pflicht = 'data-karte-pflicht="1"';
const mitUrl = pflicht + ' data-karte-url="' + kartenUrl + '"';
const keinAbruf = () => { throw new Error('unerwarteter Netzabruf'); };
const json = obj => Response.json(obj);

test('Die zwei echten V6-Kennzeichen funktionieren ohne optionalen Vorschaulink', async () => {
  const qa = await pruefeEditor(block(mitUrl), async (u, opt) => {
    assert.equal(u, kartenUrl);
    assert.equal(opt.headers.Origin, 'https://luxestyle.ch');
    assert.equal(new Headers(opt.headers).has('X-Shopify-Access-Token'), false);
    return json(karte);
  });
  assert.deepEqual(qa, { erkannt: true, v6: true, befunde: [] });
});

test('Ein optionaler Legacy-Rückfall ohne Pflichtkarte bleibt nutzbar', async () => {
  assert.deepEqual((await pruefeEditor(block(''), keinAbruf)).befunde, []);
  assert.match((await pruefeEditor(block(pflicht), keinAbruf)).befunde[0], /Pflichtkarte fehlt/);
});

test('Fehlerstatus, HTML mit Status 200 und fachlich ungültige Karten werden erkannt', async () => {
  const faelle = [
    [new Response('', {status:429}), /HTTP 429/], [new Response('<html>'), /JSON/],
    [json({ schema: 2, platzierungen:[ausschnitt] }), /Schema/],
    [json({ platzierungen:[{id:'default'}] }), /Schema/],
    [json({ ...karte, shop:{varianten:{123:{m:686,pv:16982}}} }), /Variantenbezug/],
  ];
  for (const [antwort, erwartung] of faelle)
    assert.match((await pruefeEditor(block(mitUrl), async () => antwort)).befunde[0], erwartung);
});

test('V6 unterstützt eine einzelne Modellkarte sowie lokale und dokumentweite JSON-Quellen', async () => {
  const inline = '<script type="application/json" data-lspod-karte>' + JSON.stringify(modell) + '</script>';
  const global = '<script type="application/json" id="lspod-karte">' + JSON.stringify(karte) + '</script>';
  const attr = "data-karte='" + JSON.stringify(modell) + "'";
  for (const html of [block(mitUrl,'<div>'+inline+'</div>'), block(mitUrl)+global, block(pflicht+' '+attr)])
    assert.deepEqual((await pruefeEditor(html, keinAbruf)).befunde, []);
  const zwei = block(pflicht,inline) + block(pflicht);
  assert.deepEqual((await pruefeEditor(zwei, keinAbruf)).befunde, ['V6-karte: Pflichtkarte fehlt']);
  assert.deepEqual((await pruefeEditor(block(mitUrl, inline.replace(JSON.stringify(modell),'{}')), async () => json(karte))).befunde, []);
});

test('Vorschau wird geprüft, wenn konfiguriert; richtige Karte allein ist kein Vorschaunachweis', async () => {
  const url = 'https://cdn.shopify.com/preview.json';
  const markup = block(mitUrl + ' data-vorschau-url="' + url + '"');
  const falschesModell = { schema: 1, modelle: { 999: { adapter: 'tasse' } } };
  for (const [daten,anzahl] of [[vorschau,0], [{schema:1,modelle:{}},1], [falschesModell,1]]) {
    const qa = await pruefeEditor(markup, async u => json(u === kartenUrl ? karte : daten));
    assert.equal(qa.befunde.length,anzahl);
    if (anzahl) assert.match(qa.befunde[0],/V6-vorschau/);
  }
  const defekt = block("data-vorschau='{}' data-vorschau-url='" + url + "'");
  assert.deepEqual((await pruefeEditor(defekt, keinAbruf)).befunde, ['V6-vorschau: eingebettete Vorschaudaten ungültig']);
});

test('Legacy-Bilder per HEAD sowie alte Domain und doppelte JS-Version bleiben im Test', async () => {
  const pic = 'https://cdn.shopify.com/produkt.jpg';
  const qa = await pruefeEditor('<div data-img-front="' + pic + '" data-img-back="https://abannews.com/old.jpg"></div><script src="designer.js?v=12?v=13"></script>',
    async (u, opt) => { assert.equal(u,pic); assert.equal(opt.method,'HEAD'); return new Response('',{status:404}); });
  assert.equal(qa.v6,false); assert.equal(qa.erkannt,true);
  assert.match(qa.befunde.join('\n'),/HTTP 404.*\ntote Domain.*\ndesigner.js/s);
});

test('Fertigdesign und auskommentierter Editor zählen nicht als geprüfter Editor', async () => {
  assert.deepEqual(await pruefeEditor('<p>Fertigdesign</p><!--'+block(mitUrl)+'-->', keinAbruf),
    { erkannt:false, v6:false, befunde:[] });
});

// Echte CLI mit simuliertem Shopify. Weder Token-Datei noch Netzwerk werden geöffnet.
function pruefeCli(html, args = [], produkte = {}) {
  const mock = `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
    const read = fs.readFileSync; fs.readFileSync = (p,...args) => p === '/tmp/cj_shop_token.txt' ? 'probe' : read(p,...args); syncBuiltinESMExports();
    const produkte = ${JSON.stringify(produkte)}, abgerufen = new Set();
    globalThis.fetch = async (url, opt) => {
      if(url === ${JSON.stringify(kartenUrl)}) return Response.json(${JSON.stringify(karte)});
      if(!String(url).endsWith('/graphql.json')) throw Error('unerwarteter Abruf');
      const {query, variables} = JSON.parse(opt.body);
      if (variables.id) {
        if (!query.includes('product(id:$id)') || abgerufen.has(variables.id)) throw Error('Falsche oder doppelte Einzelabfrage');
        abgerufen.add(variables.id);
        return Response.json({ data:{product:produkte[variables.id] ?? null} });
      }
      if (${args.length} || !query.includes('tag:printful_personalized_product status:active')) throw Error('Unerwartete Katalogsuche');
      return Response.json({ data:{ products:{pageInfo:{hasNextPage:false},edges:[{node:{handle:'probe',descriptionHtml:${JSON.stringify(html)}}}]} }});
    };`;
  const cli = fileURLToPath(new URL('./pod_editor_qa.mjs', import.meta.url));
  return spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),cli,...args],{encoding:'utf8',env:{}});
}

test('CLI meldet null erfasste Editor-Produkte mit Fehlerstatus', () => {
  const r = pruefeCli('<p>Fertig</p>');
  assert.equal(r.status,1); assert.match(r.stdout,/Keine Editor-Produkte erkannt/);
});

test('CLI zählt V6-Produkte und nennt das Produkt bei fehlender Pflichtkarte', () => {
  const gut = pruefeCli(block(mitUrl));
  assert.equal(gut.status, 0, gut.stderr);
  assert.match(gut.stdout, /1 Editor-Produkte geprüft \(davon 1 mit V6\), 0 Befunde/);
  const fehler = pruefeCli(block(pflicht));
  assert.equal(fehler.status, 1);
  assert.match(fehler.stdout, /probe: V6-karte: Pflichtkarte fehlt/);
});

test('CLI prüft explizite aktive IDs auch ohne Tag und vereinigt Zahlen und GIDs', () => {
  const gut = { id: 'gid://shopify/Product/123', status: 'ACTIVE', handle: 'ohne-tag', descriptionHtml: block(mitUrl) };
  const leer = { ...gut, id: 'gid://shopify/Product/456', handle: 'ohne-editor', descriptionHtml: '<p>Fertig</p>' };
  const produkte = { [gut.id]: gut, [leer.id]: leer };
  const r = pruefeCli('', ['--produkt-id', '123', '--produkt-id', gut.id], produkte);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 Editor-Produkte geprüft.*0 Befunde/);
  const beide = pruefeCli('', ['--produkt-id', '123', '--produkt-id', '456'], produkte);
  assert.equal(beide.status, 1);
  assert.match(beide.stdout, /ohne-editor: Kein Editor erkannt/);
});

test('CLI bricht bei falschen, fehlenden oder inaktiven Produkt-IDs ohne Katalogsuche ab', () => {
  const id = 'gid://shopify/Product/123';
  for (const eingabe of ['0', '12.3', '18446744073709551616', 'gid://shopify/ProductVariant/123']) {
    const r = pruefeCli('', ['--produkt-id', eingabe]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Ungültige Shopify-Produkt-ID/);
  }
  const muster = { id, status: 'ACTIVE', handle: 'probe', descriptionHtml: block(mitUrl) };
  const faelle = [
    [null, /Produkt fehlt/],
    [{ ...muster, id: 'gid://shopify/Product/999' }, /Produkt fehlt/],
    [{ ...muster, status: 'DRAFT' }, /nicht aktiv/],
  ];
  for (const [produkt, meldung] of faelle) {
    const r = pruefeCli('', ['--produkt-id', '123'], { [id]: produkt });
    assert.equal(r.status, 1);
    assert.match(r.stderr, meldung);
  }
});
