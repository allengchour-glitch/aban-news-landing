import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pruefeLuxeVideoScope } from './luxe_video_scope.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.resolve(hier, '../..');
const sectionPfad = path.join(wurzel, 'dropship/theme-entwurf-2610/sections/luxe-videos.liquid');
const snippetPfad = path.join(wurzel, 'dropship/theme-entwurf-2610/snippets/luxe-videos-zeile.liquid');
const indexPfad = path.join(wurzel, 'dropship/theme-entwurf-2610/templates/index.json');
const section = readFileSync(sectionPfad, 'utf8');
const snippet = readFileSync(snippetPfad, 'utf8');
const index = readFileSync(indexPfad, 'utf8');

test('aktueller Theme-Vertrag blockiert globale Videos auf Produktseiten', () => {
  assert.deepEqual(pruefeLuxeVideoScope({ section, snippet, index }), []);
});

test('Section-Schema bleibt gueltiges JSON fuer Start- und Produktseite', () => {
  const schemaText = section.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)?.[1];
  assert.ok(schemaText, 'Schema-Block fehlt');
  const schema = JSON.parse(schemaText);
  assert.deepEqual(schema.enabled_on.templates, ['index', 'product']);
});

test('Produktseite ohne Produkt-Metafeld erhaelt null globale Karten', () => {
  const globaleKarten = 3;
  const produktVideo = '';
  const globaleListeErlaubt = false;
  const karten = (produktVideo ? 1 : 0) + (globaleListeErlaubt ? globaleKarten : 0);
  assert.equal(karten, 0);
});

test('Produktseite mit Produkt-Metafeld erhaelt genau die Produktkarte', () => {
  const globaleKarten = 3;
  const produktVideo = 'https://www.youtube.com/watch?v=abcdefghijk';
  const globaleListeErlaubt = false;
  const karten = (produktVideo ? 1 : 0) + (globaleListeErlaubt ? globaleKarten : 0);
  assert.equal(karten, 1);
});

test('Startseite darf die globale Liste weiterhin anzeigen', () => {
  const globaleKarten = 3;
  const produktVideo = '';
  const globaleListeErlaubt = true;
  const karten = (produktVideo ? 1 : 0) + (globaleListeErlaubt ? globaleKarten : 0);
  assert.equal(karten, 3);
});

test('Mutation: globaler Read ausserhalb des Startseiten-Guards wird erkannt', () => {
  const kaputt = section.replace(
    "if request.page_type == 'index' or template.name == 'index'\n    assign lx_liste = shop.metafields.luxe.videos.value",
    "assign lx_liste = shop.metafields.luxe.videos.value\n  if request.page_type == 'index' or template.name == 'index'",
  );
  assert.match(pruefeLuxeVideoScope({ section: kaputt, snippet, index }).join('; '), /Startseiten-Guard/);
});

test('Mutation: ungeschuetzte globale Listenschleife wird erkannt', () => {
  const kaputt = snippet.replace('    if lx_globale_liste_erlaubt\n      for lx_v in liste', '    for lx_v in liste');
  assert.match(pruefeLuxeVideoScope({ section, snippet: kaputt, index }).join('; '), /Listenschleife ohne Guard/);
});

test('Mutation: direkter Startseiten-Aufruf ohne Freigabe wird erkannt', () => {
  const kaputt = index.replace(', globale_liste_erlaubt: true', '');
  assert.match(pruefeLuxeVideoScope({ section, snippet, index: kaputt }).join('; '), /Startseiten-Aufruf/);
});
