#!/usr/bin/env node
/**
 * Sucht im Ist-Stand (NUR LESEN, braucht /tmp/taxo_b/collections.json und /tmp/taxo_b/menue.json aus bestand_lesen.mjs).
 *   node dropship/taxonomie-2610-b/bestand_suche.mjs '<regex auf Handle oder Titel>'      → Collections: handle | titel | Produkte | Regeln | Menü ja/nein
 *   node dropship/taxonomie-2610-b/bestand_suche.mjs --sort                              → die vorhandenen sort-Kategorien der Engine (ohne Mode): handle | titel | tag | Menüpfad | aktive Mitglieder (Tag)
 */
import { readFileSync } from 'node:fs';
import { KATEGORIEN } from '../../automation/lib/kategorien.mjs';
const koll = JSON.parse(readFileSync('/tmp/taxo_b/collections.json', 'utf8'));
const menue = new Set(); (function l(a) { for (const i of a || []) { const m = (i.url || '').match(/\/collections\/([^/?#]+)/); if (m) menue.add(decodeURIComponent(m[1])); l(i.items); } })(JSON.parse(readFileSync('/tmp/taxo_b/menue.json', 'utf8')));
if (process.argv[2] === '--sort') {
  const P = JSON.parse(readFileSync(process.env.KATALOG || '/tmp/katalog_taxo.json', 'utf8')).produkte; const n = new Map();
  for (const p of P) for (const t of p.tags) n.set(t, (n.get(t) || 0) + 1);
  for (const k of KATEGORIEN.filter(k => !k.mode)) console.log([k.handle, k.titel, k.tag, (k.eltern || []).join(' > ') || '-', n.get(k.tag) || 0, menue.has(k.handle) ? 'Menü' : 'nicht im Menü'].join(' | '));
} else {
  const rx = new RegExp(process.argv[2] || '.', 'i');
  for (const c of koll.filter(c => rx.test(c.handle) || rx.test(c.titel))) console.log([c.handle, c.titel, c.produkte, c.regeln.slice(0, 110), menue.has(c.handle) ? 'Menü' : '-'].join(' | '));
}
