// Nur lesend: zerlegt eine gespeicherte Seite (rohes HTML) in Bereiche und schätzt, wie viel reiner Leerraum drinsteckt.
import { readFileSync } from 'node:fs';
const f = process.argv[2];
const h = readFileSync(f, 'utf8');
const B = (s) => Buffer.byteLength(s, 'utf8');
const gesamt = B(h);
console.log('Gesamt', gesamt, 'Byte;  erste 2 MiB enden bei Zeichen', (() => { let n = 0, i = 0; for (; i < h.length && n < 2097152; i++) n += B(h[i]); return i; })(), 'von', h.length);
function bereich(name, re) {
  let tot = 0, ws = 0, n = 0;
  for (const m of h.matchAll(re)) { n++; tot += B(m[0]); ws += B(m[0]) - B(m[0].replace(/\s+/g, ' ')); }
  console.log(name.padEnd(28), String(n).padStart(3), 'x', String(tot).padStart(8), 'Byte, davon Leerraum-Überschuss', String(ws).padStart(8), `(${tot ? Math.round((ws / tot) * 100) : 0} %)`);
  return { tot, ws };
}
const a = bereich('header-drawer', /<header-drawer[\s\S]*?<\/header-drawer>/g);
const b = bereich('script (ganz)', /<script[\s\S]*?<\/script>/g);
const c = bereich('style (ganz)', /<style[\s\S]*?<\/style>/g);
const d = bereich('header-menu (Desktop)', /<header-menu[\s\S]*?<\/header-menu>/g);
const e = bereich('Produktkarten (li.grid)', /<li[^>]*class="[^"]*product-grid__item[\s\S]*?<\/li>/g);
const g = bereich('footer', /<footer[\s\S]*?<\/footer>/g);
// Gesamter Leerraum-Überschuss ausserhalb von script/style/pre/textarea
const rest = h.replace(/<(script|style|pre|textarea)[\s\S]*?<\/\1>/g, '');
console.log('Leerraum-Überschuss im Rest (ohne script/style/pre):', B(rest) - B(rest.replace(/\s+/g, ' ')), 'von', B(rest));
const kopf = h.indexOf('<body'); console.log('Beginn <body> bei Byte', B(h.slice(0, kopf)));
const main = h.indexOf('<main'); console.log('Beginn <main> bei Byte', B(h.slice(0, main)), ' → Produktbereich beginnt erst dort');
