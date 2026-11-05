// Hilfen, um die Liquid-Dateien des Pakets mit dem echten Ruby-Liquid (liquid_render.rb) gegen Attrappen zu rendern.
// Ruby-Liquid: Umgebungsvariable RUBY_LIQUID_GEMS = GEM_HOME, in dem «gem install liquid -v 5.14.0 --install-dir <Ordner>» lief.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const HIER = new URL('.', import.meta.url).pathname;
const SCRATCH_GEMS = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/rubygems';

export function rubyLiquidGems() {
  const kandidaten = [process.env.RUBY_LIQUID_GEMS, SCRATCH_GEMS].filter(Boolean);
  return kandidaten.find((k) => existsSync(k + '/gems')) || null;
}

// Entfernt den Kommentarkopf der Sprachdateien und liefert das geparste JSON
export const sprachJson = (text) => JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));

// {"luxe_clothing": {"a": "x", "b": {"c": "y"}}} -> {"luxe_clothing.a": "x", "luxe_clothing.b.c": "y"} (nur die genannten Blöcke)
export function flach(json, bloecke = ['luxe_clothing', 'luxe_category']) {
  const aus = {};
  const lauf = (wert, pfad) => {
    if (wert && typeof wert === 'object') for (const [k, v] of Object.entries(wert)) lauf(v, pfad ? `${pfad}.${k}` : k);
    else aus[pfad] = wert;
  };
  for (const b of bloecke) if (json[b]) lauf(json[b], b);
  return aus;
}

export function rendere({ main, templates = {}, context = {}, translations = {} }) {
  const gems = rubyLiquidGems();
  if (!gems) throw new Error('RUBY-LIQUID FEHLT (RUBY_LIQUID_GEMS setzen oder OHNE_LIQUID=1)');
  const r = spawnSync('ruby', [HIER + 'liquid_render.rb'], {
    input: JSON.stringify({ main, templates, context, translations }), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, RUBY_LIQUID_GEMS: gems },
  });
  if (r.status !== 0) throw new Error('ruby: ' + (r.stderr || r.stdout || '').slice(0, 600));
  const j = JSON.parse(r.stdout);
  return { ausgabe: j.ausgabe, fehler: j.fehler, version: j.version };
}

// Attrappen der Snippets, die die Katalog-Dateien einbinden
export const SNIPPET_ATTRAPPEN = {
  'luxe-studio-blank-eligible': 'true',
  'luxe-product-review-data': '{}',
  'luxe-studio-catalog-colors': '[]',
  'luxe-clothing-shop-offers': '[]',
};

// Produktattrappe wie im Shop: url ohne Sammlungspfad, erste lieferbare Variante
export const produkt = (handle, id, variantId, titel = handle) => ({
  handle, id, title: titel, url: `/products/${handle}`, featured_image: { src: `${handle}.jpg`, alt: titel },
  selected_or_first_available_variant: { id: variantId }, available: true, price_min: 2490, price_varies: false,
  options_with_values: [{ name: 'Grösse', values: [{ name: 'M' }, { name: 'L' }] }],
});
