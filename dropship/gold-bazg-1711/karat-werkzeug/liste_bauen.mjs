// Baut aus den im Shop gelesenen Produkten (ziel*_produkte.json) die Karat-Liste: Regeln (regeln.mjs) + Einzelkorrekturen (patches*.mjs), mit Alt-Stand als Sicherung.
// Aufruf (Ordner egal): node liste_bauen.mjs [Eingabe=ziel_produkte.json] [Ausgabe=../karat-liste.json] [Patchmodul=./patches.mjs]; Pfade relativ zum Ordner dieses Skripts.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { wende, wendeHtml, PRUEF } from './regeln.mjs';
const HIER = dirname(fileURLToPath(import.meta.url));
const { PATCHES, TITEL } = await import(pathToFileURL(resolve(HIER, process.argv[4] || './patches.mjs')).href);
const EIN = resolve(HIER, process.argv[2] || 'ziel_produkte.json'), AUS = resolve(HIER, process.argv[3] || '../karat-liste.json');
const P = JSON.parse(readFileSync(EIN, 'utf8'));
const treffer = (hs, key) => key.startsWith('*') ? hs.filter((h) => h.startsWith(key.slice(1))) : hs.filter((h) => h === key);
const handles = P.map((p) => p.handle);
const zaehl = (s, t) => s.split(t).length - 1;
const felder = (p) => ({ title: p.title, html: p.descriptionHtml, seoT: p.seo?.title ?? null, seoB: p.seo?.description ?? null });
const out = [], fehler = [];
const neuVon = new Map();
for (const p of P) {
  const a = felder(p);
  neuVon.set(p.handle, { title: wende(a.title), html: wendeHtml(a.html), seoT: a.seoT == null ? null : wende(a.seoT), seoB: a.seoB == null ? null : wende(a.seoB), tagsEntfernt: 0 });
}
for (const [key, f, s, n, anz, tags] of PATCHES) {
  const h = treffer(handles, key); if (h.length !== 1) { fehler.push(`Patch ${key}: ${h.length} Produkte`); continue; }
  const e = neuVon.get(h[0]); const c = zaehl(e[f] ?? '', s);
  if (c !== anz) { fehler.push(`Patch ${key} ${f} «${s.slice(0, 40)}»: ${c} Treffer statt ${anz}`); continue; }
  e[f] = e[f].split(s).join(n); e.tagsEntfernt += tags;
}
for (const [key, alt, neu] of TITEL) {
  const h = treffer(handles, key); if (h.length !== 1) { fehler.push(`Titel ${key}: ${h.length} Produkte`); continue; }
  const e = neuVon.get(h[0]); let n = 0;
  for (const f of ['title', 'html', 'seoT', 'seoB']) { if (e[f] == null) continue; n += zaehl(e[f], alt); e[f] = e[f].split(alt).join(neu); }
  if (!n) fehler.push(`Titel ${key}: «${alt}» nirgends gefunden`);
}
const strip = (h) => String(h).replace(/<[^>]*>/g, ' ');
for (const p of P) {
  const a = felder(p), e = neuVon.get(p.handle);
  const alt = {}, neu = {}, rest = [];
  for (const [k, kk] of [['title', 'title'], ['html', 'descriptionHtml'], ['seoT', 'seoTitle'], ['seoB', 'seoDescription']]) {
    if (a[k] == null) continue;
    if (a[k] !== e[k]) { alt[kk] = a[k]; neu[kk] = e[k]; }
    if (PRUEF.test(k === 'html' ? strip(e[k]) : e[k])) rest.push(k);
  }
  if (rest.length) fehler.push(`${p.handle}: Rest ${rest.join(',')}`);
  if (Object.keys(neu).length) out.push({ handle: p.handle, id: p.id, tagsEntfernt: e.tagsEntfernt, alt, neu });
}
console.log({ produkte: P.length, eintraege: out.length, fehler });
writeFileSync(AUS, JSON.stringify({ eintraege: out }, null, 1));
