#!/usr/bin/env node
/**
 * Misst einen Verengungs-Vorschlag, bevor er in kategorien_verengt_daten.json kommt. NUR LESEN, kein Shopify.
 * Aufruf: node automation/kategorie_regel_probe.mjs <handle> '{"ausschlussG":["Animals & Pet Supplies"],"ausschlussTitel":"halsband|airtag","nurG":[]}' [--drin] [--raus]
 * Liest /tmp/verengen/<handle>.json (kategorien_verengen_erfassen.mjs). Ausgabe: vorher/nachher, ALLE ausgeschlossenen Produkte (Titel | Google-Kategorie),
 * mit --drin zusätzlich alle verbleibenden (für die Gegenprobe «wurde etwas Falsches behalten?»).
 */
import { readFileSync } from 'node:fs';
import { verengtPasst } from './lib/kategorien_verengt.mjs';
const [handle, json = '{}', ...flags] = process.argv.slice(2);
const d = JSON.parse(readFileSync(`/tmp/verengen/${handle}.json`, 'utf8'));
let v; try { v = JSON.parse(json); } catch (e) { console.error('Vorschlag ist kein gültiges JSON:', e.message); process.exit(1); }
if (v.ausschlussTitel) { try { new RegExp(v.ausschlussTitel, 'i'); } catch (e) { console.error('ausschlussTitel ist keine gültige Regex:', e.message); process.exit(1); } }
const eintrag = { handle, titel: d.titel, ruleSet: d.ruleSet, ...v };
const drin = d.mitglieder.filter(p => verengtPasst(eintrag, p)), raus = d.mitglieder.filter(p => !verengtPasst(eintrag, p));
console.log(`${handle} «${d.titel}»: vorher ${d.mitglieder.length} · nachher ${drin.length} · ausgeschlossen ${raus.length} (davon aus dem Kern ${raus.filter(p => d.kernBereiche.includes((p.g || '').split(' > ')[0])).length})`);
const z = p => `   ${p.title.slice(0, 70).padEnd(70)} | ${(p.g || '(ohne)').split(' > ').slice(0, 3).join(' > ')}`;
console.log('\nAUSGESCHLOSSEN:'); raus.forEach(p => console.log(z(p)));
if (flags.includes('--drin')) { console.log('\nVERBLEIBEND:'); drin.forEach(p => console.log(z(p))); }
else { const g = {}; for (const p of drin) { const k = (p.g || '(ohne)').split(' > ').slice(0, 3).join(' > '); g[k] = (g[k] || 0) + 1; } console.log('\nVERBLEIBEND nach Google-Kategorie:'); Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log(`   ${String(n).padStart(4)} ${k}`)); }
