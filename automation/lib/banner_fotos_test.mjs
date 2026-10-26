// Tests für lib/banner_fotos.mjs und lib/foto_pruefung.mjs (rein, kein Netz).
import { kandidaten, waehleSaubere } from './banner_fotos.mjs';
import { urteilAus, geminiSauber, geminiBanner } from './foto_pruefung.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const im = (n, w = 1000, h = 1000) => ({ url: `https://cdn/x/${n}.jpg?v=1`, width: w, height: h });
const P = (title, titelbild, galerie = [], extra = {}) => ({ status: 'ACTIVE', title, tags: [], featuredImage: titelbild, media: { nodes: galerie.map(g => ({ image: g })) }, ...extra });

// ── Kandidaten ──
const ps = [P('Kleid A', im('a0'), [im('a1'), im('a2')]), P('Kleid B', im('b0'), [im('b1')]), P('Kleid C', im('c0'))];
ist('erst alle Titelbilder, dann die zweiten Fotos', kandidaten(ps).map(k => `${k.produkt}:${k.nr}`), ['0:0', '1:0', '2:0', '0:1', '1:1']);
ist('höchstens 2 Fotos je Produkt (a2 fällt weg)', kandidaten(ps).some(k => k.url.includes('/a2.jpg')), false);
ist('max begrenzt die Liste', kandidaten(ps, { max: 2 }).length, 2);
ist('zu kleines Foto fällt weg (799 px)', kandidaten([P('X', im('k', 799, 1000))]).length, 0);
ist('genau 800 px bleibt', kandidaten([P('X', im('k', 800, 800))]).length, 1);
ist('zu schmales Seitenverhältnis fällt weg (Streifen 1:3)', kandidaten([P('X', im('s', 1000, 3000))]).length, 0);
ist('Hochformat 3:4 bleibt (Köpfe sind erlaubt)', kandidaten([P('X', im('h', 900, 1200))]).length, 1);
ist('gleiches Foto mit anderem ?v= zählt einmal', kandidaten([P('X', im('d'), [{ url: 'https://cdn/x/d.jpg?v=2', width: 1000, height: 1000 }])]).length, 1);
ist('Entwurf wird übersprungen', kandidaten([{ ...P('X', im('e')), status: 'DRAFT' }]).length, 0);
ist('Sperr-Tag wird übersprungen', kandidaten([P('X', im('f'), [], { tags: ['adult-nicht-bewerben'] })]).length, 0);
ist('Marken-/Lizenzwort im Titel wird übersprungen', kandidaten([P('Disney Pullover', im('g'))]).length, 0);
ist('Produkt ohne Bild stört nicht', kandidaten([{ status: 'ACTIVE', title: 'Ohne', tags: [], featuredImage: null, media: { nodes: [] } }]).length, 0);

// ── Auswahl ──
const g = [{ produkt: 0, sauber: true, url: 'a' }, { produkt: 0, sauber: true, url: 'b' }, { produkt: 0, sauber: true, url: 'c' }, { produkt: 1, sauber: false, url: 'd' }, { produkt: 2, sauber: true, url: 'e' }, { produkt: 3, sauber: null, url: 'f' }];
ist('nur bestätigt saubere, höchstens 2 je Produkt', waehleSaubere(g).map(k => k.url), ['a', 'b', 'e']);
ist('unbekannt (null) zählt nicht als sauber', waehleSaubere(g).some(k => k.url === 'f'), false);
ist('Ziel begrenzt', waehleSaubere(g, 2).length, 2);

// ── Antwort lesen ──
ist('JSON mit Zaun', urteilAus('```json\n{"sauber": true, "grund": "ok"}\n```', 'sauber'), { wert: true, grund: 'ok' });
ist('JSON ohne Zaun', urteilAus('{"ok": false, "grund": "Titel abgeschnitten"}', 'ok'), { wert: false, grund: 'Titel abgeschnitten' });
ist('falscher Typ → null (nicht raten)', urteilAus('{"sauber": "ja"}', 'sauber'), null);
ist('Müll → null', urteilAus('kein json', 'ok'), null);
ist('leer → null', urteilAus('', 'ok'), null);

// ── Gemini-Aufrufe mit nachgebautem fetch ──
const fake = text => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
ist('geminiSauber: true', await geminiSauber('AAAA', 'image/jpeg', fake('{"sauber":true,"grund":""}')), true);
ist('geminiSauber: false', await geminiSauber('AAAA', 'image/jpeg', fake('{"sauber":false,"grund":"Text"}')), false);
ist('geminiSauber: HTTP-Fehler → null', await geminiSauber('AAAA', 'image/jpeg', async () => ({ ok: false })), null);
ist('geminiSauber: Netzfehler → null', await geminiSauber('AAAA', 'image/jpeg', async () => { throw new Error('x'); }), null);
const merke = []; const fangen = async (url, o) => { merke.push(JSON.parse(o.body).contents[0].parts[0].text); return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"sauber":true}' }] } }] }) }; };
await geminiSauber('AAAA', 'image/jpeg', fangen, 'Hemden'); await geminiSauber('AAAA', 'image/jpeg', fangen);
ist('Prompt je Foto: ganzes Produkt verlangt (immer)', merke.every(m => /Stoff-, Muster- oder Detailausschnitt/.test(m)), true);
ist('Prompt je Foto: Text im Hintergrund (Bücher, Verpackungen) ist verboten, Aufdruck auf dem Produkt erlaubt', merke.every(m => /Buchtitel/.test(m) && /Aufdruck oder Motiv auf dem Produkt selbst ist erlaubt/.test(m)), true);
ist('Prompt je Foto: Kategorie nur wenn angegeben', [/Kategorie «Hemden»/.test(merke[0]), /Kategorie «/.test(merke[1])], [true, false]);
ist('Prompt je Foto: Marken- und Text-Regeln bleiben', merke.every(m => /Luxusmarken-Monogramm/.test(m) && /Masspfeile/.test(m) && /Antworte NUR als JSON/.test(m)), true);
ist('geminiBanner: Urteil mit Grund', await geminiBanner('AAAA', 'Tassen', 'image/jpeg', fake('{"ok":false,"grund":"Spielzeug"}')), { ok: false, grund: 'Spielzeug' });
ist('geminiBanner: Fehler → null', await geminiBanner('AAAA', 'Tassen', 'image/jpeg', async () => ({ ok: false })), null);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
