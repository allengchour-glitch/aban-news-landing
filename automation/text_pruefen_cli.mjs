#!/usr/bin/env node
/**
 * Prüft geschriebene Produkttexte gegen ihre Quellen — ohne Shopify, ohne Netz. Für die Text-Agenten zum Selbsttest.
 * Aufruf: node automation/text_pruefen_cli.mjs <handle> [<handle> …]      (liest /tmp/text_eingabe/<handle>.json und /tmp/text_ausgabe/<handle>.json)
 * Ausgabe je Handle: OK  oder  FEHLER: Gründe. Ende-Code 1, wenn mindestens einer durchfiel.
 */
import { readFileSync, existsSync } from 'node:fs';
import { zahlen } from './lib/fakten_block.mjs';
import { prosaPruefen } from './lib/text_prosa.mjs';
let bad = 0;
for (const h of process.argv.slice(2)) {
  const pe = `/tmp/text_eingabe/${h}.json`, pa = `/tmp/text_ausgabe/${h}.json`;
  if (!existsSync(pe)) { console.log(`${h}: FEHLER: keine Eingabe`); bad++; continue; }
  if (!existsSync(pa)) { console.log(`${h}: FEHLER: keine Ausgabe geschrieben`); bad++; continue; }
  let e, a; try { e = JSON.parse(readFileSync(pe, 'utf8')); a = JSON.parse(readFileSync(pa, 'utf8')); } catch (x) { console.log(`${h}: FEHLER: JSON nicht lesbar (${x.message.slice(0, 60)})`); bad++; continue; }
  if (a.handle !== h) { console.log(`${h}: FEHLER: «handle» in der Ausgabe ist «${a.handle}»`); bad++; continue; }
  const quellen = [e.cjQuelle, e.alterText, e.faktenBlock, e.titel, ...e.optionen.flatMap(o => [o.name, ...o.werte])].join('\n');
  const erl = new Set(zahlen(quellen)); for (const z of [...erl]) erl.add(String(Number(z)));
  const r = prosaPruefen(a.html, erl, { titel: e.titel, beleg: e.cjQuelle });
  console.log(`${h}: ${r.ok ? 'OK' : 'FEHLER: ' + r.gruende.join(' | ')}`); if (!r.ok) bad++;
}
process.exit(bad ? 1 : 0);
