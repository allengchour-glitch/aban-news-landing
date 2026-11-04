// Selbsttest für omni_clip.mjs (ohne Netz, ohne Schlüssel): node dropship/tiktok-cj-videos-0311/omni_clip_test.mjs
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pruefeProdukt, pruefeDatei, pruefeCjClip, pruefeCjDatei, pruefeCjAbstand, bildMasse, kosten, baueAnfrage, videoAusAntwort, ledgerSumme, lauf, MODELL, ENDPUNKT,
} from './omni_clip.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PRODUKTE = path.join(HIER, 'produkte.json');
let ok = 0; const fehler = [];
const ist = (c, name) => { if (c) ok++; else { fehler.push(name); console.log(`✗ ${name}`); } };

const rein = JSON.parse(readFileSync(PRODUKTE, 'utf8')).produkte;
const basis = rein[0];
const mit = (feld, wert) => ({ ...basis, [feld]: wert });
const verstoss = (p) => pruefeProdukt(p).length > 0;

// 1. Die echte Liste erfüllt ihre eigenen Regeln
ist(rein.length === 8, 'acht Produkte');
ist(pruefeDatei(PRODUKTE).length === 0, `produkte.json erfüllt die Regeln: ${pruefeDatei(PRODUKTE).join(' | ')}`);
ist(new Set(rein.map((p) => p.id)).size === 8, 'ids eindeutig');
ist(new Set(rein.map((p) => p.prioritaet)).size === 8, 'Prioritäten eindeutig');
ist(rein.every((p) => p.foto_min >= 700), 'Fotos mindestens 700 px');

// 2. Gegenproben: jede Regel schlägt an
ist(verstoss(mit('hook1', 'Siebzehn Zeichen!!')), 'Hook zu lang');
ist(verstoss(mit('hook1', "Don't")), 'Apostroph im Hook');
ist(verstoss(mit('hook1', 'Nur 5 Prozent: x')), 'Doppelpunkt im Hook');
ist(verstoss(mit('hook1', '50%')), 'Prozent im Hook');
ist(verstoss(mit('hook2', 'Jetzt 19 CHF')), 'Preis im Hook');
ist(verstoss(mit('hook2', 'Hallo 🔥')), 'Emoji im Hook');
ist(verstoss(mit('hook1', 'Grösse ß')), 'ß im Hook');
ist(verstoss(mit('prompt_en', basis.prompt_en.replace('<FIRST_FRAME> ', ''))), 'Prompt ohne FIRST_FRAME');
ist(verstoss(mit('prompt_en', basis.prompt_en.replace('no people', 'people'))), 'Prompt ohne «no people»');
ist(verstoss(mit('prompt_en', basis.prompt_en.replace('no hands', 'hands'))), 'Prompt ohne «no hands»');
ist(verstoss(mit('prompt_en', basis.prompt_en.replace('no scene cuts', 'cuts'))), 'Prompt ohne «no scene cuts»');
ist(verstoss(mit('prompt_en', basis.prompt_en.replace('No dialogue, no music', 'Music'))), 'Prompt ohne «No dialogue, no music»');
ist(verstoss(mit('prompt_en', basis.prompt_en.replaceAll('exactly the shape', 'roughly the shape'))), 'Prompt ohne Unverändert-Satz');
ist(verstoss(mit('foto', 'https://example.com/a.jpg')), 'Foto von fremdem Host');
ist(verstoss(mit('foto', 'http://cdn.shopify.com/s/files/1/a.jpg')), 'Foto ohne https');
ist(verstoss(mit('foto', 'https://cdn.shopify.com/s/files/1/a.webp')), 'Foto als webp');
ist(verstoss(mit('foto_min', 500)), 'Foto unter 700 px');
ist(verstoss(mit('caption_de', basis.caption_de.replace('luxestyle.ch/tt', 'luxestyle.ch'))), 'Caption ohne Wegweiser');
ist(verstoss(mit('caption_de', basis.caption_de.replace('Video mit KI erstellt.', ''))), 'Caption ohne KI-Hinweis');
ist(verstoss(mit('caption_de', basis.caption_de.replace('Wasser', 'Grösse ß'))), 'ß in der Caption');
ist(verstoss(mit('caption_de', basis.caption_de.replace('#schweiz', ''))), 'nur drei Hashtags');
ist(verstoss(mit('caption_de', basis.caption_de + ' #fuenf')), 'fünf Hashtags');
ist(verstoss(mit('caption_de', basis.caption_de.replace('Wasser', 'Garantiert bestes Wasser'))), 'Garantie/Superlativ in der Caption');
ist(verstoss(mit('caption_de', basis.caption_de.replace('Wasser, das', 'Nur CHF 19 für Wasser, das'))), 'Preis in der Caption');
ist(verstoss(mit('caption_de', basis.caption_de.replace('Lieferung 10–20 Werktage', 'Lieferung in 3 Tagen'))), 'falsche Lieferzeit');
ist(verstoss(mit('fakten', '')), 'ohne Beleg');
ist(verstoss({ ...basis, id: 'Ungültig Id' }), 'id mit Leerzeichen');
ist(!verstoss(basis), 'unveränderter Eintrag besteht');

// 3. Bildmasse (synthetische Kopfteile)
const jpg = (w, h) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14), Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03]), Buffer.alloc(20)]);
const png = (w, h) => { const b = Buffer.alloc(40); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
ist(JSON.stringify(bildMasse(jpg(800, 600))) === JSON.stringify({ h: 600, w: 800, mime: 'image/jpeg' }), 'JPEG-Masse');
ist(bildMasse(png(1200, 900)).w === 1200 && bildMasse(png(1200, 900)).h === 900, 'PNG-Masse');
ist(bildMasse(Buffer.from('keinbild-keinbild-keinbild-keinbild')) === null, 'kein Bild → null');

// 4. Kosten, Anfrage, Antwort
ist(kosten(8) === 0.8 && kosten(10, '1080p') === 1, 'Kostenschätzung');
const anf = baueAnfrage({ prompt: 'p', bildB64: 'QQ==', mime: 'image/jpeg', aufloesung: '720p' });
ist(anf.model === MODELL && anf.response_format.aspect_ratio === '9:16' && anf.response_format.resolution === '720p' && anf.response_format.type === 'video', 'Anfrage: Modell, 9:16, Auflösung');
ist(anf.input[0].type === 'image' && anf.input[0].data === 'QQ==' && anf.input[1].text === 'p', 'Anfrage: Bild zuerst, dann Text');
ist(videoAusAntwort({ steps: [{ type: 'model_output', content: [{ type: 'video', data: 'AAAA' }] }] }).data === 'AAAA', 'Video aus Antwort (data)');
ist(videoAusAntwort({ steps: [{ type: 'model_output', content: [{ type: 'video', uri: 'https://x/y' }] }] }).uri === 'https://x/y', 'Video aus Antwort (uri)');
ist(videoAusAntwort({ steps: [{ type: 'thought', content: [{ type: 'video', data: 'x' }] }] }) === null, 'Gedanken-Schritt zählt nicht');
ist(videoAusAntwort({}) === null && videoAusAntwort(null) === null, 'leere Antwort → null');

// 5. Läufe mit Attrappe
const tmp = mkdtempSync(path.join(tmpdir(), 'omni-test-'));
const SCHLUESSEL = 'AIzaSyGEHEIM-TESTSCHLUESSEL-12345';
const neuesLedger = (n, inhalt = '') => { const f = path.join(tmp, `ledger-${n}.txt`); writeFileSync(f, inhalt); return f; };
const optBasis = (n, extra = {}) => ({ id: 'duft', live: true, aufloesung: '720p', outDir: path.join(tmp, `out-${n}`), gesamtUsd: 10, sekunden: 8, produkte: PRODUKTE, ledger: neuesLedger(n), ...extra });
const lauscher = () => { const z = []; return { z, log: (m) => z.push(String(m)) }; };
const fotoAntwort = (w = 800, h = 800) => ({ ok: true, status: 200, arrayBuffer: async () => { const b = jpg(w, h); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } });
const jsonAntwort = (status, obj) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) });
const videoOk = { steps: [{ type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data: Buffer.alloc(4000, 7).toString('base64') }] }], status: 'completed' };

{ // Trockenlauf: sendet nichts, braucht keinen Schlüssel
  const l = lauscher(); let aufrufe = 0; const o = optBasis(1, { live: false });
  const r = await lauf(o, { key: '', fetch: async () => { aufrufe++; return fotoAntwort(); }, log: l.log });
  ist(r.exit === 0 && aufrufe === 0, 'Trockenlauf: Exit 0, kein Netz');
  ist(l.z.join('\n').includes('Trockenlauf'), 'Trockenlauf meldet sich');
  ist(ledgerSumme(o.ledger) === 0, 'Trockenlauf schreibt nichts ins Ledger');
}
{ // unbekannte id
  const l = lauscher(); const r = await lauf(optBasis(2, { id: 'gibtsnicht' }), { key: SCHLUESSEL, fetch: async () => { throw new Error('nie'); }, log: l.log });
  ist(r.exit === 2, 'unbekannte id → Exit 2');
}
{ // Budget: Ledger fast voll → Exit 3, nichts gesendet, auch live
  const l = lauscher(); let aufrufe = 0;
  const o = optBasis(3, { ledger: neuesLedger('3b', `2026-11-03T00:00:00Z\tduft\tOK\t8.0\t9.50\tx.mp4\n`) });
  const r = await lauf(o, { key: SCHLUESSEL, fetch: async () => { aufrufe++; return fotoAntwort(); }, log: l.log });
  ist(r.exit === 3 && aufrufe === 0, 'Budget überschritten → Exit 3, kein Netz');
  ist(ledgerSumme(o.ledger) === 9.5, 'Ledger-Summe zählt nur OK-Zeilen');
}
{ // HTTP402-Zeilen zählen nicht als Ausgabe
  const f = neuesLedger('3c', `a\tduft\tHTTP402\t0\t0\t-\nb\tduft\tOK\t8.0\t0.80\tx\n`);
  ist(ledgerSumme(f) === 0.8, 'Ledger: HTTP402 kostet nichts');
}
{ // live ohne Schlüssel
  const l = lauscher(); const r = await lauf(optBasis(4), { key: '', fetch: async () => { throw new Error('nie'); }, log: l.log });
  ist(r.exit === 2, 'live ohne Schlüssel → Exit 2');
}
{ // 4k ohne Erlaubnis
  const l = lauscher(); const r = await lauf(optBasis(5, { aufloesung: '4k' }), { key: SCHLUESSEL, fetch: async () => { throw new Error('nie'); }, log: l.log });
  ist(r.exit === 2, '4k ohne ERLAUBE_4K → Exit 2');
}
{ // Foto zu klein → nie senden
  const l = lauscher(); const urls = [];
  const r = await lauf(optBasis(6), { key: SCHLUESSEL, fetch: async (u) => { urls.push(u); return fotoAntwort(600, 600); }, log: l.log });
  ist(r.exit === 2 && urls.length === 1 && !urls.includes(ENDPUNKT), 'Foto 600 px → Exit 2, Anfrage nie gesendet');
}
{ // 402: Exit 5, Ledger-Zeile, Schlüssel nie im Log
  const l = lauscher(); const o = optBasis(7);
  const r = await lauf(o, { key: SCHLUESSEL, fetch: async (u) => (u === ENDPUNKT ? jsonAntwort(402, `Your prepayment credits are depleted ${SCHLUESSEL}`) : fotoAntwort()), log: l.log });
  ist(r.exit === 5, '402 → Exit 5');
  ist(readFileSync(o.ledger, 'utf8').includes('HTTP402') && ledgerSumme(o.ledger) === 0, '402 steht im Ledger, kostet 0');
  ist(!l.z.join('\n').includes(SCHLUESSEL), '402: Schlüssel nicht im Log');
}
{ // Erfolg: Anfrage prüfen, Datei, Ledger
  const l = lauscher(); const o = optBasis(8); let post = null;
  const r = await lauf(o, { key: SCHLUESSEL, fetch: async (u, init) => { if (u === ENDPUNKT) { post = { u, init }; return jsonAntwort(200, videoOk); } return fotoAntwort(); }, log: l.log });
  ist(r.exit === 0 && existsSync(r.datei) && r.datei.endsWith('duft-omni-1.mp4'), 'Erfolg: Exit 0, Datei gespeichert');
  ist(readFileSync(r.datei).length === 4000, 'Erfolg: Bytes unverändert');
  ist(post && post.init.method === 'POST' && post.init.headers['x-goog-api-key'] === SCHLUESSEL, 'Erfolg: POST mit Schlüssel im Header');
  const b = JSON.parse(post.init.body);
  ist(b.model === MODELL && b.response_format.aspect_ratio === '9:16' && b.input[0].type === 'image' && b.input[1].text.startsWith('<FIRST_FRAME>'), 'Erfolg: Anfrage wie geplant');
  ist(!post.u.includes(SCHLUESSEL), 'Schlüssel nie in der Adresse');
  ist(readFileSync(o.ledger, 'utf8').split('\n').some((z) => z.split('\t')[2] === 'OK'), 'Erfolg: OK-Zeile im Ledger');
  ist(ledgerSumme(o.ledger) > 0, 'Erfolg: Ausgabe im Ledger');
  ist(!l.z.join('\n').includes(SCHLUESSEL), 'Erfolg: Schlüssel nicht im Log');
  const r2 = await lauf({ ...o }, { key: SCHLUESSEL, fetch: async (u) => (u === ENDPUNKT ? jsonAntwort(200, videoOk) : fotoAntwort()), log: l.log });
  ist(r2.datei.endsWith('duft-omni-2.mp4'), 'zweiter Clip überschreibt den ersten nicht');
}
{ // 429, dann Erfolg
  const l = lauscher(); let n = 0;
  const r = await lauf(optBasis(9), { key: SCHLUESSEL, pauseMs: 0, fetch: async (u) => { if (u !== ENDPUNKT) return fotoAntwort(); n++; return n === 1 ? jsonAntwort(429, 'zu schnell') : jsonAntwort(200, videoOk); }, log: l.log });
  ist(r.exit === 0 && n === 2, '429 → ein neuer Versuch, dann Erfolg');
}
{ // dreimal 500 → Exit 6; Schlüssel im Fehlertext wird geschwärzt
  const l = lauscher(); let n = 0;
  const r = await lauf(optBasis(10), { key: SCHLUESSEL, pauseMs: 0, fetch: async (u) => { if (u !== ENDPUNKT) return fotoAntwort(); n++; return jsonAntwort(500, `kaputt ${SCHLUESSEL}`); }, log: l.log });
  ist(r.exit === 6 && n === 3, 'dreimal 500 → Exit 6 nach drei Versuchen');
  ist(!l.z.join('\n').includes(SCHLUESSEL), '500: Schlüssel geschwärzt');
}
{ // 400 wird nicht wiederholt
  const l = lauscher(); let n = 0;
  const r = await lauf(optBasis(11), { key: SCHLUESSEL, pauseMs: 0, fetch: async (u) => { if (u !== ENDPUNKT) return fotoAntwort(); n++; return jsonAntwort(400, 'ungültig'); }, log: l.log });
  ist(r.exit === 6 && n === 1, '400 → kein neuer Versuch');
}
{ // Antwort ohne Video
  const l = lauscher(); const r = await lauf(optBasis(12), { key: SCHLUESSEL, fetch: async (u) => (u === ENDPUNKT ? jsonAntwort(200, { steps: [], status: 'completed' }) : fotoAntwort()), log: l.log });
  ist(r.exit === 4, 'Antwort ohne Video → Exit 4');
}
{ // winziges Video wird abgelehnt
  const l = lauscher(); const klein = { steps: [{ type: 'model_output', content: [{ type: 'video', data: 'AAAA' }] }] };
  const r = await lauf(optBasis(13), { key: SCHLUESSEL, fetch: async (u) => (u === ENDPUNKT ? jsonAntwort(200, klein) : fotoAntwort()), log: l.log });
  ist(r.exit === 4, 'winziges Video → Exit 4');
}
{ // pruefeDatei: Antwort von ChatGPT mit Fehlern
  const f = path.join(tmp, 'chatgpt.json');
  writeFileSync(f, JSON.stringify({ produkte: [{ ...basis, hook1: 'Dieser Hook ist viel zu lang' }, { ...basis }] }));
  const m = pruefeDatei(f);
  ist(m.length >= 2 && m.some((x) => x.includes('doppelt')) && m.some((x) => x.includes('hook1')), 'pruefeDatei findet Hook und doppelte id');
  writeFileSync(f, 'kein json');
  ist(pruefeDatei(f).length === 1, 'pruefeDatei: kein JSON');
}

// 6. CJ-Clips (cj_clips.json): echte Datei erfüllt ihre Regeln, jede Regel schlägt an
const CJ = path.join(HIER, 'cj_clips.json');
const cj = JSON.parse(readFileSync(CJ, 'utf8')).clips;
ist(cj.length === 5, 'fünf CJ-Clips');
ist(pruefeCjDatei(CJ).length === 0, `cj_clips.json erfüllt die Regeln: ${pruefeCjDatei(CJ).join(' | ')}`);
const c0 = cj[0];
const cm = (feld, wert) => pruefeCjClip({ ...c0, [feld]: wert }).length > 0;
ist(pruefeCjClip(c0).length === 0, 'CJ-Clip unverändert besteht');
ist(cm('video_ids', ['abc']), 'CJ: video_ids mit zu kurzer Kennung');
ist(cm('video_ids', []), 'CJ: video_ids leer');
ist(cm('video_ids', [c0.video_ids[0], c0.video_ids[0]]), 'CJ: video_ids doppelt');
ist(cm('schnitt', 'kein json'), 'CJ: schnitt muss eine JSON-Datei sein');
ist(cm('quellen', ['a.mp4']) === (c0.video_ids.length !== 1), 'CJ: quellen müssen zu video_ids passen');
ist(pruefeCjClip({ ...c0, schnitt: undefined, video_ids: undefined, video_id: c0.video_ids[0], ss: 3 }).length === 0, 'CJ: alte Form (eine Quelle, ss) besteht weiter');
ist(pruefeCjClip({ ...c0, schnitt: undefined, video_ids: undefined, video_id: 'abc', ss: 3 }).length > 0, 'CJ: alte Form mit kurzer video_id');
ist(cm('dauer', 3), 'CJ: Dauer unter 4 s');
ist(cm('dauer', 16), 'CJ: Dauer über 15 s');
ist(cm('musik', 'luxe-premium.wav'), 'CJ: Eigenproduktion statt Mixkit');
ist(cm('hook1', 'Siebzehn Zeichen!!'), 'CJ: Hook zu lang');
ist(cm('hook2', 'Jetzt 19 CHF'), 'CJ: Preis im Hook');
ist(cm('caption_ig', c0.caption_ig.replace('Link in Bio: luxestyle.ch', '')), 'CJ: IG ohne Link in Bio');
ist(cm('caption_tt', c0.caption_tt.replace('Shop: luxestyle.ch/tt', 'luxestyle.ch')), 'CJ: TikTok ohne Wegweiser');
ist(cm('caption_ig', c0.caption_ig + ' Video mit KI erstellt.'), 'CJ: KI-Aussage bei echtem Material');
ist(cm('caption_tt', c0.caption_tt.replace('#schweiz', '')), 'CJ: TikTok mit drei Hashtags');
ist(cm('caption_ig', c0.caption_ig + ' #a #b #c'), 'CJ: IG mit sieben Hashtags');
ist(cm('caption_ig', c0.caption_ig.replace('Lieferung 10–20 Werktage', 'Lieferung in 3 Tagen')), 'CJ: falsche Lieferzeit');
ist(cm('caption_tt', c0.caption_tt.replace('Wasser, das', 'Nur CHF 19 für Wasser, das')), 'CJ: Preis in der Caption');
ist(cm('caption_ig', c0.caption_ig.replace('Wasser', 'Garantiert bestes Wasser')), 'CJ: Garantie/Superlativ');
ist(cm('caption_ig', c0.caption_ig.replace('Wasser', 'Grösse ß')), 'CJ: ß in der Caption');
ist(cm('plan_tt', '2026-11-05 13:00'), 'CJ: Termin im falschen Format');
const nah = [{ ...c0, id: 'a', plan_tt: '2026-11-05T13:00:00', plan_igfb: '2026-11-05T18:00:00' }, { ...c0, id: 'b', plan_tt: '2026-11-05T15:30:00', plan_igfb: '2026-11-06T18:00:00' }];
ist(pruefeCjAbstand(nah).length === 1 && pruefeCjAbstand(nah)[0].includes('plan_tt'), 'Abstand: TikTok 2,5 h wird gemeldet, IG/FB nicht');
ist(pruefeCjAbstand([{ ...c0, id: 'a', plan_tt: '2026-11-05T13:00:00', plan_igfb: '2026-11-05T18:00:00' }, { ...c0, id: 'b', plan_tt: '2026-11-05T16:00:00', plan_igfb: '2026-11-05T21:00:00' }]).length === 0, 'Abstand: genau 3 h ist erlaubt');
{
  const f = path.join(tmp, 'cj-doppelt.json');
  writeFileSync(f, JSON.stringify({ clips: [c0, c0] }));
  ist(pruefeCjDatei(f).some((x) => x.includes('doppelt')), 'CJ-Datei: doppelte id wird gemeldet');
  writeFileSync(f, '{}');
  ist(pruefeCjDatei(f).length === 1, 'CJ-Datei ohne «clips»');
}

rmSync(tmp, { recursive: true, force: true });
console.log(`${ok} Prüfungen bestanden${fehler.length ? `, ${fehler.length} FEHLER` : ''}`);
process.exit(fehler.length ? 1 : 0);
