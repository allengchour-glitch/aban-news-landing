// Ablauf gegen eine Attrappe (Dateien im Speicher, Storefront erzeugt aus dem Dateistand). node dropship/editor-theme-1011/ablauf_test.mjs
import { ablauf, ZEIT } from './ablauf.mjs'; import { T1, T2, T3, SCHRITTE, zustand } from './patch.mjs';
Object.assign(ZEIT, { RUECKLESEN_VERSUCHE: 3, RUECKLESEN_PAUSE: 0, STOREFRONT_RUNDEN: 2, PAUSE_ZWISCHEN_SEITEN: 0, PAUSE_DROSSELUNG: 0, PAUSE_CACHE: 0 });
let ok = 0, bad = 0; const T = (n, c, i) => { if (c) ok++; else { bad++; console.log('✗', n, i === undefined ? '' : String(i).slice(0, 200)); } };
const start = () => ({ 'layout/theme.liquid': '<html><head>\n' + T3.alt + '\n</head></html>', 'blocks/buy-buttons.liquid': '<div>\n' + T2.alt + '\n</div>' });
const seiteAus = d => async u => { const t = d.files; const hatT1 = t['layout/theme.liquid'].includes('id="lx-editor-tippflaeche-1011"'); const t2 = t['blocks/buy-buttons.liquid'].includes('Druckvorschau prüfen»');
  if (d.status) return { status: d.status, text: '' };
  if (u.includes('bio-jute')) return { status: 200, text: (hatT1 ? '<style id="lx-editor-tippflaeche-1011"></style>' : '') + (t2 ? 'prüfst es mit «Druckvorschau prüfen» und' : '') + (d.liquid ? 'Liquid error: x' : '') };
  if (u.includes('magnet')) return { status: 200, text: t2 ? 'derzeit nicht bestellbar. Die Begründung steht im Kasten weiter unten.' : '' };
  return { status: 200, text: '' }; };
const mk = (extra = {}) => { const d = { files: start(), writes: 0, log: [], ...extra }; return { d, deps: { lesenAlle: async () => JSON.parse(JSON.stringify(d.files)), schreiben: async (neu) => { d.writes++; if (d.failWrite) throw new Error('boom'); if (d.teilweise && d.writes === 1) { d.files['layout/theme.liquid'] = neu['layout/theme.liquid']; throw new Error('halb'); } if (d.ignoreWrite) return; d.files = JSON.parse(JSON.stringify(neu)); }, seite: seiteAus(d), warte: async () => {}, log: (...a) => d.log.push(a.join(' ')), sicherungLesen: () => null, sicherungSchreiben: s => { d.sich = s; } } }; };
const opt = (o = {}) => ({ live: false, zurueck: false, nur: null, erwartetThemeId: 'x', themeId: 'x', ...o });
{ const { d, deps } = mk(); const c = await ablauf(deps, opt()); T('Trockenlauf 0', c === 0 && d.writes === 0); }
{ const { d, deps } = mk(); const c = await ablauf(deps, opt({ live: true })); T('live 0', c === 0, d.log.join('|')); T('alle neu', SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'neu')); T('Sicherung geschrieben', !!d.sich && d.sich['layout/theme.liquid'].includes(T3.alt)); T('zwei Schreibvorgänge nicht nötig: genau 1', d.writes === 1); }
{ const { d, deps } = mk(); await ablauf(deps, opt({ live: true })); const c = await ablauf(deps, opt({ live: true })); T('schon eingespielt: 3', c === 3); }
{ const { d, deps } = mk(); await ablauf(deps, opt({ live: true })); const c = await ablauf(deps, opt({ live: true, zurueck: true })); T('Rücknahme 0', c === 0, d.log.join('|')); T('wieder alt', SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'alt')); }
{ const { d, deps } = mk({ failWrite: true }); const c = await ablauf(deps, opt({ live: true })); T('Schreibfehler: 5 oder 8', c === 5 || c === 8, c); }
{ const { d, deps } = mk({ teilweise: true }); const c = await ablauf(deps, opt({ live: true })); T('halb geschrieben: Rückweg stellt alt her, Exit 5', c === 5 && SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'alt'), c + ' ' + d.log.join('|')); }
{ const { d, deps } = mk({ ignoreWrite: true }); const c = await ablauf(deps, opt({ live: true })); T('Rücklesen weicht ab: 6', c === 6, c); T('nichts verändert', SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'alt')); }
{ const { d, deps } = mk({ liquid: true }); const c = await ablauf(deps, opt({ live: true })); T('Liquid-Fehler auf der Seite: 7 (Rückweg)', c === 7, c); T('Rückweg stellt alt her', SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'alt')); }
{ const { d, deps } = mk({ status: 429 }); const c = await ablauf(deps, opt({ live: true })); T('429 dauerhaft: 9 (Rückweg aus Vorsicht)', c === 9, c); T('zurückgenommen', SCHRITTE.every(s => zustand(s, d.files[s.datei]) === 'alt')); }
{ const { d, deps } = mk(); const c = await ablauf(deps, opt({ live: true, themeId: 'anderes' })); T('anderes Theme: 4', c === 4 && d.writes === 0); }
{ const { d, deps } = mk(); d.files['blocks/buy-buttons.liquid'] = '<div>fremd</div>'; const c = await ablauf(deps, opt({ live: true })); T('Ausgangstext fehlt: 4, nichts geschrieben', c === 4 && d.writes === 0); }
{ const { d, deps } = mk(); const l = deps.lesenAlle; let n = 0; deps.lesenAlle = async () => { const x = await l(); if (++n === 2) x['layout/theme.liquid'] += '<!-- jemand -->'; return x; }; const c = await ablauf(deps, opt({ live: true })); T('Änderung zwischen Lesen und Schreiben: 4', c === 4 && d.writes === 0, c); }
{ const { d, deps } = mk(); const c = await ablauf(deps, opt({ live: true, nur: ['T3'] })); T('nur T3: Storefront-Prüfung nur für T3', c === 0 && zustand(T3, d.files['layout/theme.liquid']) === 'neu' && zustand(T1, d.files['layout/theme.liquid']) === 'alt', d.log.join('|')); }
console.log(ok + ' Prüfungen bestanden' + (bad ? ', ' + bad + ' FEHLER' : '')); process.exit(bad ? 1 : 0);
