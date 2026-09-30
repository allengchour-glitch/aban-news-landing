// Tests ohne echten Zugang: Prüfer (mit Gegenproben), Vorlagen, Auswahl, Verschlüsselung und ein ganzer Lauf gegen
// nachgebaute Server für Pinterest, Gemini und ChatGPT (Reihenfolge, Formate, Token-Wechsel, Idempotenz, KI-Kennzeichnung).
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { execFile } from 'child_process'; import { promisify } from 'util';
import * as A from './autopilot.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const POOL = JSON.parse(fs.readFileSync(path.join(HIER, 'pool.json'), 'utf8'));
let ok = 0, fehl = 0; const pr = (c, t) => { console.log((c ? '✅ ' : '❌ ') + t); c ? ok++ : fehl++; };
const miet = POOL.themen.find((t) => t.slug === 'mietzins');
const gut = { titel: 'Mietzinsreduktion: so viel weniger Miete steht dir zu', beschreibung: 'Sinkt der Referenzzinssatz um 0,25 Prozentpunkte, stehen dir rund 2,91 % weniger Miete zu. Der Rechner zeigt deine neue Miete. Mietzinsreduktion, Referenzzinssatz, Miete senken', alt: 'Grafik: Referenzzinssatz 1,25 % und rund 2,91 % weniger Miete', kopf: 'Miete senken: so viel steht dir zu', unterzeile: 'Pro 0,25 Prozentpunkte rund 2,91 % weniger Miete', punkte: ['Referenzzinssatz prüfen', 'Senkung aktiv verlangen', 'Neue Miete ausrechnen'] };

// 1. Prüfer
pr(A.pruefeText(gut, miet).length === 0, 'guter Text besteht');
pr(A.pruefeText({ ...gut, beschreibung: gut.beschreibung.replace('2,91', '3,5') }, miet).some((f) => f.includes('erfundene Zahl: 3.5')), 'Gegenprobe: erfundene Zahl 3,5 % wird verworfen');
pr(A.pruefeText({ ...gut, kopf: 'Unglaublich: Miete senken!!' }, miet).some((f) => f.startsWith('Hype')), 'Gegenprobe: Hype + !! wird verworfen');
pr(A.pruefeText({ ...gut, kopf: 'Miete senken 🏠 jetzt' }, miet).some((f) => f.startsWith('Hype')), 'Gegenprobe: Emoji wird verworfen');
pr(A.pruefeText({ ...gut, kopf: 'Lerne Trading ohne Risiko' }, miet).some((f) => f.startsWith('Hype')) && A.pruefeText({ ...gut, titel: 'Passives Einkommen mit dem Rechner aufbauen' }, miet).some((f) => f.startsWith('Hype')), 'Gegenprobe: Versprechen („ohne Risiko“, „passives Einkommen“) werden verworfen');
pr(A.pruefeText({ ...gut, punkte: ['a', 'b'] }, miet).some((f) => f.startsWith('punkte')), 'Gegenprobe: falsche Punkte-Liste wird verworfen');
pr(A.pruefeText({ ...gut, titel: 'x'.repeat(101) }, miet).some((f) => f.startsWith('titel')), 'Gegenprobe: Titel > 100 Zeichen (Pinterest-Limit) wird verworfen');
// 2. Vorlage besteht für JEDES Thema den eigenen Prüfer
const vf = POOL.themen.flatMap((t) => [0, 1, 2].map((v) => [t.slug, A.pruefeText(A.vorlage(t, v), t)])).filter(([, f]) => f.length);
pr(vf.length === 0, `Vorlagen bestehen den Prüfer für alle ${POOL.themen.length} Themen${vf.length ? ' — ' + JSON.stringify(vf[0]) : ''}`);
// 3. Auswahl: keine Doppelten, frisch gepinnte Themen gebremst, Lernfaktor wirkt
const w = A.waehle(POOL.themen, { pins: [] }, 3, '2026-10-01', () => 0.5);
pr(new Set(w.map((t) => t.slug)).size === 3, 'Auswahl ohne Doppelte');
let r = 0; const zufall = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
const zaehl = (ledger) => { const c = {}; for (let i = 0; i < 3000; i++) { const s = A.waehle(POOL.themen, ledger, 1, '2026-10-01', zufall)[0].slug; c[s] = (c[s] || 0) + 1; } return c; };
const ohne = zaehl({ pins: [] }), gebremst = zaehl({ pins: [{ slug: 'mietzins', datum: '2026-09-30' }] }), gelernt = zaehl({ pins: [], scores: { sparziel: { pins: 2, klicks: 6 } } });
pr(gebremst.mietzins < ohne.mietzins / 3, `gestern gepinnt → seltener (${ohne.mietzins} → ${gebremst.mietzins})`);
pr(gelernt.sparziel > ohne.sparziel * 2.5, `viele Klicks → öfter (${ohne.sparziel} → ${gelernt.sparziel})`);
// 4. Layout rotiert, Foto nur mit Gemini
pr(A.naechstesLayout({ pins: [{ slug: 'x' }, { slug: 'x' }, { slug: 'x' }] }, 'x', true) === 'foto' && A.naechstesLayout({ pins: [{ slug: 'x' }, { slug: 'x' }, { slug: 'x' }] }, 'x', false) === 'frage', 'Layout rotiert, Foto nur mit Gemini');
// 5. Verschlüsselung
const enc = A.verschluesseln('pinterest-refresh-geheim', 'appsecret');
pr(!enc.includes('pinterest-refresh-geheim') && A.entschluesseln(enc, 'appsecret') === 'pinterest-refresh-geheim', 'Token verschlüsselt, Klartext nicht in der Datei');
let falsch = false; try { A.entschluesseln(enc, 'anderes'); } catch { falsch = true; }
pr(falsch, 'Gegenprobe: falsches Secret kann nicht entschlüsseln');
pr(A.mitUtm('https://abannews.com/x', 'x', 'liste').endsWith('utm_source=pinterest&utm_medium=pin&utm_campaign=x&utm_content=liste'), 'UTM-Link');

// 6. Ganzer Lauf gegen nachgebaute Server
const log = []; let refreshAusgegeben = 0; let chatgptGueltig = false; const pins = []; const boards = [{ id: '111', name: 'Miete & Wohnen Schweiz' }];
const server = http.createServer((q, s) => {
  let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => {
    log.push(`${q.method} ${q.url.split('?')[0]}`);
    const j = (code, o) => { s.writeHead(code, { 'Content-Type': 'application/json' }); s.end(JSON.stringify(o)); };
    if (q.url.startsWith('/v5/oauth/token')) {
      const p = new URLSearchParams(b); const basic = Buffer.from((q.headers.authorization || '').replace('Basic ', ''), 'base64').toString();
      if (basic !== 'APPID:APPSECRET' || p.get('grant_type') !== 'refresh_token') return j(401, { message: 'auth' });
      if (p.get('refresh_token') !== (refreshAusgegeben ? `NEU-REFRESH-${refreshAusgegeben}` : 'START-REFRESH')) return j(400, { message: 'invalid refresh' });
      refreshAusgegeben++; return j(200, { access_token: 'ACCESS', refresh_token: `NEU-REFRESH-${refreshAusgegeben}` });
    }
    if (q.url.startsWith('/gemini/models/gemini-2.5-flash:')) { // antwortet passend zum Thema aus dem Prompt
      const pt = JSON.parse(b).contents[0].parts[0].text, wort = pt.match(/nach "([^"]+)"/)[1], fk = [...pt.matchAll(/^- (.+)$/gm)].map((m) => m[1]);
      const t = { titel: `${wort}: Gratis-Rechner zum Ausprobieren`, beschreibung: `${fk[0]} Probier den Rechner direkt im Browser aus, ohne Anmeldung. ${wort}`, alt: `Pin-Grafik zum Thema ${wort}`, kopf: `${wort} klar gerechnet`, unterzeile: 'Gratis-Rechner für die Schweiz', punkte: ['Zahlen eintragen', 'Ergebnis sofort sehen', 'Gratis und ohne Konto'] };
      return j(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(t) }] } }] });
    }
    if (q.url.startsWith('/gemini/models/gemini-2.5-flash-image')) return j(200, { candidates: [{ content: { parts: [{ inlineData: { data: fs.readFileSync(path.join(HIER, '../../android-chrome-512x512.png')).toString('base64') } }] } }] });
    if (q.url.startsWith('/openai/chat/completions')) { // zuerst erfindet ChatGPT eine Zahl (muss verworfen werden), später schreibt es gültig
      const pt = JSON.parse(b).messages[0].content, wort = pt.match(/nach "([^"]+)"/)[1];
      const t = chatgptGueltig ? { titel: `${wort} einfach selbst ausrechnen`, beschreibung: `Mit dem Gratis-Rechner siehst du in einer Minute, woran du bist. Ohne Anmeldung, direkt im Browser. ${wort}`, alt: `Pin-Grafik: ${wort}`, kopf: `${wort} selbst rechnen`, unterzeile: 'Gratis-Rechner, ohne Anmeldung', punkte: ['Zahlen eintragen', 'Ergebnis ablesen', 'Entscheiden'] }
        : { ...gut, beschreibung: gut.beschreibung + ' Erfunden: 99 %' };
      return j(200, { choices: [{ message: { content: JSON.stringify(t) } }] });
    }
    if (q.headers.authorization !== 'Bearer ACCESS') return j(401, { message: 'bearer' });
    if (q.method === 'GET' && q.url.startsWith('/v5/boards')) return j(200, { items: boards, bookmark: null });
    if (q.method === 'POST' && q.url === '/v5/boards') { const o = JSON.parse(b); const n = { id: String(200 + boards.length), name: o.name }; boards.push(n); return j(201, n); }
    if (q.method === 'POST' && q.url === '/v5/pins') {
      const o = JSON.parse(b); const f = [];
      if (!/^\d+$/.test(o.board_id || '')) f.push('board_id'); if (!o.title || o.title.length > 100) f.push('title'); if (o.description?.length > 800) f.push('description');
      if (o.alt_text?.length > 500) f.push('alt'); if (o.media_source?.source_type !== 'image_base64' || o.media_source.content_type !== 'image/png' || !/^[A-Za-z0-9+/=]+$/.test(o.media_source.data || '')) f.push('media');
      if (!o.link?.includes('utm_source=pinterest')) f.push('link');
      if (f.length) return j(400, { message: f.join(',') });
      pins.push(o); return j(201, { id: String(9000 + pins.length) });
    }
    if (q.method === 'GET' && /\/v5\/pins\/\d+\/analytics/.test(q.url)) return j(200, { all: { summary_metrics: { IMPRESSION: 120, OUTBOUND_CLICK: 4, SAVE: 2 } } });
    j(404, { message: q.url });
  });
});
await new Promise((res) => server.listen(0, res));
const port = server.address().port;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-')); fs.mkdirSync(path.join(root, 'data'));
const env = { ...process.env, ROOT: root, DRY_RUN: '0', HEUTE: '2026-10-01', OUT: path.join(root, 'out'), PINS_PRO_LAUF: '2',
  PINTEREST_API_BASE: `http://127.0.0.1:${port}/v5`, GEMINI_API_BASE: `http://127.0.0.1:${port}/gemini`, OPENAI_API_BASE: `http://127.0.0.1:${port}/openai`,
  ABAN_PINTEREST_APP_ID: 'APPID', ABAN_PINTEREST_APP_SECRET: 'APPSECRET', ABAN_PINTEREST_REFRESH_TOKEN: 'START-REFRESH', GEMINI_API_KEY: 'G', OPENAI_API_KEY: 'O' };
const lauf = async (e) => (await promisify(execFile)(process.execPath, [path.join(HIER, 'autopilot.mjs')], { env: e, encoding: 'utf8' })).stdout;
const out1 = await lauf(env);
const L1 = JSON.parse(fs.readFileSync(path.join(root, 'data/pinterest-aban.json'), 'utf8'));
pr(pins.length === 2 && L1.pins.length === 2, `2 Pins erstellt (${pins.length})`);
pr(boards.length === 1 + Object.keys(POOL.boards).length - 1, `fehlende Boards angelegt, vorhandenes wiederverwendet (${boards.length})`);
pr(log.indexOf('POST /v5/oauth/token') < log.indexOf('GET /v5/boards') && log.indexOf('GET /v5/boards') < log.indexOf('POST /v5/pins'), 'Reihenfolge: Token → Boards → Pins');
const tok = fs.readFileSync(path.join(root, 'data/pinterest-aban-token.enc'), 'utf8');
pr(!tok.includes('NEU-REFRESH') && A.entschluesseln(tok.trim(), 'APPSECRET') === 'NEU-REFRESH-1', 'neuer Refresh-Token verschlüsselt gespeichert');
pr(out1.includes('chatgpt: verworfen (') && out1.includes('erfundene Zahl: 99') && L1.pins.every((p) => p.quelle === 'gemini'), `ChatGPT-Text mit erfundener Zahl verworfen, Gemini springt ein (${L1.pins.map((p) => p.quelle)})`);
pr(pins.every((p) => !p.description.includes('99')), 'kein Pin enthält die erfundene Zahl');
// 2. Lauf am selben Tag: nichts Neues
await lauf(env);
pr(pins.length === 2, 'Idempotent: zweiter Lauf am selben Tag postet nichts');
// Lauf 8 Tage später: Token aus der Datei (Start-Token im Secret ungültig gemacht), Statistik gelernt, Foto-Layout später markiert
const env2 = { ...env, HEUTE: '2026-10-09', ABAN_PINTEREST_REFRESH_TOKEN: 'ABGELAUFEN' };
chatgptGueltig = true;
await lauf(env2);
const L2 = JSON.parse(fs.readFileSync(path.join(root, 'data/pinterest-aban.json'), 'utf8'));
pr(pins.length === 4, 'Folgelauf nutzt den gespeicherten Token (Secret abgelaufen)');
pr(Object.values(L2.scores || {}).some((s) => s.klicks === 4) && L2.quellen, 'Klick-Statistik gelernt, pro KI-Quelle ausgewertet');
pr(L2.pins.slice(2).some((p) => p.quelle === 'chatgpt') && L2.pins.slice(2).some((p) => p.quelle === 'gemini'), `Gemini und ChatGPT wechseln sich ab (${L2.pins.slice(2).map((p) => p.quelle)})`);
// Foto-Layout deterministisch: jedes Thema hat schon 3 Pins (frage, zahl, liste) → der nächste ist ein Foto-Pin
const fr = { ...env2, ROOT: fs.mkdtempSync(path.join(os.tmpdir(), 'pin-')), HEUTE: '2026-12-01' };
fs.mkdirSync(path.join(fr.ROOT, 'data'));
fs.copyFileSync(path.join(root, 'data/pinterest-aban-token.enc'), path.join(fr.ROOT, 'data/pinterest-aban-token.enc'));
fs.writeFileSync(path.join(fr.ROOT, 'data/pinterest-aban.json'), JSON.stringify({ pins: POOL.themen.flatMap((t) => [1, 2, 3].map((k) => ({ id: `alt-${t.slug}-${k}`, slug: t.slug, datum: '2026-10-01' }))) }));
await lauf(fr);

const foto = pins.filter((p) => p.ai_disclosures);
pr(foto.length === 2 && foto.every((p) => p.ai_disclosures.values[0] === 'AI_MODIFIED'), `Foto-Pins mit KI-Kennzeichnung (${foto.length} von ${pins.length})`);
pr(pins.filter((p) => !p.ai_disclosures).length > 0, 'Design-Pins ohne KI-Bild bleiben ungekennzeichnet');
// Sandbox (Trial access): fixer Token, kein OAuth, Ledger bleibt unverändert
const sb = { ...env, ROOT: fs.mkdtempSync(path.join(os.tmpdir(), 'pin-')), SANDBOX: '1', ABAN_PINTEREST_ACCESS_TOKEN: 'ACCESS', ABAN_PINTEREST_APP_ID: '', ABAN_PINTEREST_REFRESH_TOKEN: '', HEUTE: '2026-10-20' };
fs.mkdirSync(path.join(sb.ROOT, 'data')); const vorSb = pins.length, tokVorher = refreshAusgegeben;
await lauf(sb);
pr(pins.length === vorSb + 2 && refreshAusgegeben === tokVorher && !fs.existsSync(path.join(sb.ROOT, 'data/pinterest-aban.json')), 'Sandbox: Pins mit fixem Token, kein Token-Tausch, kein Ledger');
// Ohne Zugang: nichts senden
const leer = { ...env, ROOT: fs.mkdtempSync(path.join(os.tmpdir(), 'pin-')), ABAN_PINTEREST_APP_ID: '', ABAN_PINTEREST_REFRESH_TOKEN: '' };
fs.mkdirSync(path.join(leer.ROOT, 'data')); const vorher = pins.length;
pr((await lauf(leer)).includes('Kein Pinterest-Zugang') && pins.length === vorher, 'Ohne Zugang: sauberer Abbruch, nichts gesendet');
server.close();
console.log(`\n${fehl ? '❌' : '✅'} ${ok}/${ok + fehl} Prüfungen`); process.exitCode = fehl ? 1 : 0;
