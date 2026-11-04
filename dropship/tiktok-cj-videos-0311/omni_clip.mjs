#!/usr/bin/env node
// Omni-Clip: aus EINEM Produktfoto einen Hochformat-Clip mit Gemini Omni Flash (Interactions API) erzeugen.
// Schreibt NUR eine lokale MP4 (OUT_DIR) und eine Zeile ins Ledger. Kein Shop, kein Metricool, kein Git, kein Upload.
//
//   node omni_clip.mjs <id>                 Trockenlauf (Vorgabe): zeigt Anfrage und geschätzte Kosten, sendet NICHTS, braucht keinen Schlüssel
//   LIVE=1 node omni_clip.mjs <id>          sendet die Anfrage (kostet Geld, GEMINI_API_KEY nötig)
//   node omni_clip.mjs --pruefen <datei>    prüft eine produkte.json (z. B. die Antwort von ChatGPT) gegen die Textregeln, schreibt nichts
//
// Schalter: AUFLOESUNG=720p (360p|720p|1080p; 4k nur mit ERLAUBE_4K=1, Preis der Hochskalierung ist unbelegt) · OUT_DIR=/tmp/luxe-omni ·
//   GESAMT_USD=10 (Obergrenze der geschätzten Ausgaben laut Ledger) · SEKUNDEN=8 (Annahme für die Kostenschätzung, solange die Dauer unbekannt ist) ·
//   PRODUKTE=<Pfad> (Vorgabe: produkte.json neben dem Skript) · LEDGER=<Pfad>.
// Exit: 0 ok · 2 Eingabe/Regel verletzt · 3 Budget-Obergrenze · 4 Antwort ohne Video · 5 Guthaben leer (HTTP 402) · 6 andere HTTP-Fehler.
//
// Annahmen, NICHT belegt (der Schlüssel der Sitzung gab am 03.11. 22:40–22:57 UTC nur HTTP 402): genaue Form der REST-Anfrage für Bild+Text
// (nach der SDK-Doku ai.google.dev/gemini-api/docs/omni), Dauer eines Clips (nur über den Prompt gesteuert), Preis 0,10 USD je Sekunde bei 720p
// (Preisseite, gelesen 03.11., Angabe von Dritten wiederholt: nachrechnen, wenn die erste Abrechnung da ist).
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const MODELL = 'gemini-omni-1.1-flash';
export const ENDPUNKT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const PREIS_USD_PRO_SEKUNDE = { '360p': 0.10, '720p': 0.10, '1080p': 0.10 }; // Annahme, siehe Kopf
const AUFLOESUNGEN = ['360p', '720p', '1080p'];
const HIER = path.dirname(fileURLToPath(import.meta.url));

// ---------- Regeln für die Texte (gelten auch für Antworten von ChatGPT) ----------
const VERBOTEN_ZEICHEN = /['":%\\]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const VERBOTEN_WORTE = /garantier|heilt|therapie|wissenschaftlich bewiesen|bestes?\b|billigste|günstigste|original|markenqualität|swiss made/i;

export function pruefeProdukt(p) {
  const f = [];
  const need = (c, m) => { if (!c) f.push(m); };
  need(/^[a-z0-9-]{2,24}$/.test(p.id ?? ''), 'id fehlt oder hat verbotene Zeichen');
  need(/^[a-z0-9-]{3,120}$/.test(p.handle ?? ''), 'handle fehlt oder hat verbotene Zeichen');
  need(typeof p.name === 'string' && p.name.length > 2, 'name fehlt');
  need(/^https:\/\/cdn\.shopify\.com\/s\/files\/[A-Za-z0-9_\-./]+\.(jpg|jpeg|png)(\?v=\d+)?$/.test(p.foto ?? ''), 'foto muss eine Shopify-CDN-Adresse (jpg/png) sein');
  need(Number.isInteger(p.foto_min) && p.foto_min >= 700, 'foto_min muss eine ganze Zahl >= 700 sein');
  for (const k of ['hook1', 'hook2']) {
    const t = p[k] ?? '';
    need(t.length >= 1 && t.length <= 16, `${k} muss 1 bis 16 Zeichen haben («${t}»)`);
    need(!VERBOTEN_ZEICHEN.test(t), `${k} enthält ein verbotenes Zeichen (' " : % \\)`);
    need(!EMOJI.test(t), `${k} enthält ein Emoji`);
    need(!/\d\s?(chf|fr\.?|franken)|chf\s?\d/i.test(t), `${k} nennt einen Preis`);
    need(!/ß/.test(t), `${k} enthält ß (Schweizer Rechtschreibung)`);
  }
  const pr = p.prompt_en ?? '';
  need(pr.length >= 200 && pr.length <= 1500, 'prompt_en muss 200 bis 1500 Zeichen haben');
  need(pr.startsWith('<FIRST_FRAME>'), 'prompt_en muss mit <FIRST_FRAME> beginnen (Foto als erstes Bild)');
  need(/single|unbroken|continuous/i.test(pr) && /no scene cuts/i.test(pr), 'prompt_en muss einen einzigen Schnitt verlangen («no scene cuts»)');
  need(/no text/i.test(pr) && /no people/i.test(pr) && /no hands/i.test(pr), 'prompt_en muss «No text», «no people» und «no hands» enthalten');
  need(/no dialogue/i.test(pr) && /no music/i.test(pr), 'prompt_en muss «No dialogue, no music» enthalten');
  need(/exactly the shape/i.test(pr), 'prompt_en muss verlangen, dass das Produkt unverändert bleibt');
  const c = p.caption_de ?? '';
  need(c.length >= 80 && c.length <= 900, 'caption_de muss 80 bis 900 Zeichen haben');
  need(c.includes('luxestyle.ch/tt'), 'caption_de muss den Wegweiser luxestyle.ch/tt nennen');
  need(/KI/.test(c), 'caption_de muss auf KI hinweisen');
  need(!/ß/.test(c), 'caption_de enthält ß (Schweizer Rechtschreibung)');
  need(!VERBOTEN_WORTE.test(c), 'caption_de enthält ein verbotenes Wort (Garantie/Superlativ/Marke)');
  need((c.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? []).length === 4, 'caption_de braucht genau vier Hashtags');
  need(/Lieferung 10–20 Werktage/.test(c), 'caption_de muss die Lieferzeit der Produktseiten nennen (10–20 Werktage)');
  need(!/\bCHF\s?\d/.test(c.replace(/Versand CHF 7, ab CHF 50 gratis nach Rabatt/, '')), 'caption_de nennt einen Preis ausser der Versandregel');
  need(typeof p.fakten === 'string' && p.fakten.length > 10, 'fakten fehlt (Beleg aus der Produktseite)');
  return f;
}

export function pruefeDatei(pfad) {
  let d;
  try { d = JSON.parse(readFileSync(pfad, 'utf8')); } catch (e) { return [`Datei nicht lesbar oder kein JSON: ${e.message}`]; }
  const liste = Array.isArray(d) ? d : d.produkte;
  if (!Array.isArray(liste) || !liste.length) return ['kein Feld «produkte» (Liste)'];
  const out = []; const ids = new Set();
  for (const p of liste) {
    if (ids.has(p.id)) out.push(`${p.id}: id doppelt`);
    ids.add(p.id);
    for (const m of pruefeProdukt(p)) out.push(`${p.id ?? '?'}: ${m}`);
  }
  return out;
}

// ---------- Regeln für bearbeitete CJ-Videos (cj_clips.json) ----------
export const MUSIK_STUECKE = ['mixkit-serene-view-443.mp3', 'mixkit-majestic-475.mp3', 'mixkit-dreamy-jazz-645.mp3', 'mixkit-new-york-427.mp3', 'mixkit-violin-uplift-675.mp3'];
const hashtags = (c) => c.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? [];
const ohneVersand = (c) => c.replace(/Versand CHF 7, ab CHF 50 gratis nach Rabatt/g, '');

export function pruefeCjClip(p) {
  const f = [];
  const need = (c, m) => { if (!c) f.push(m); };
  need(/^[a-z0-9-]{2,24}$/.test(p.id ?? ''), 'id fehlt oder hat verbotene Zeichen');
  need(/^[a-z0-9-]{3,120}$/.test(p.handle ?? ''), 'handle fehlt oder hat verbotene Zeichen');
  // eine Quelle (video_id + ss) oder ein Schnittplan mit mehreren Quellen (video_ids + schnitt)
  const ids = Array.isArray(p.video_ids) ? p.video_ids : (p.video_id !== undefined ? [p.video_id] : []);
  need(ids.length >= 1 && ids.length <= 8 && ids.every((v) => /^[0-9a-f]{32}$/.test(v ?? '')), 'video_id (oder video_ids) muss aus 32-stelligen CJ-videoIds bestehen');
  need(new Set(ids).size === ids.length, 'video_ids enthält eine Kennung doppelt');
  if (p.schnitt === undefined) need(typeof p.ss === 'number' && p.ss >= 0 && p.ss <= 600, 'ss muss eine Zahl zwischen 0 und 600 sein');
  else need(typeof p.schnitt === 'string' && /^[\w.-]+\.json$/.test(p.schnitt) && Array.isArray(p.quellen) && p.quellen.length === ids.length, 'schnitt muss eine JSON-Datei nennen und quellen müssen zu video_ids passen');
  need(typeof p.dauer === 'number' && p.dauer >= 4 && p.dauer <= 15, 'dauer muss zwischen 4 und 15 Sekunden liegen');
  need(MUSIK_STUECKE.includes(p.musik), 'musik muss eines der fünf Mixkit-Stücke sein');
  for (const k of ['hook1', 'hook2']) {
    const t = p[k] ?? '';
    need(t.length >= 1 && t.length <= 16, `${k} muss 1 bis 16 Zeichen haben («${t}»)`);
    need(!VERBOTEN_ZEICHEN.test(t) && !EMOJI.test(t) && !/ß/.test(t), `${k} enthält ein verbotenes Zeichen, Emoji oder ß`);
    need(!/\d\s?(chf|fr\.?|franken)|chf\s?\d/i.test(t), `${k} nennt einen Preis`);
  }
  need(typeof p.titel === 'string' && p.titel.length >= 3 && p.titel.length <= 90, 'titel fehlt oder ist zu lang');
  need(typeof p.alt === 'string' && p.alt.length >= 10 && p.alt.length <= 200, 'alt fehlt oder ist zu lang');
  for (const [k, link, tags] of [['caption_ig', 'Link in Bio: luxestyle.ch', [1, 5]], ['caption_tt', 'Shop: luxestyle.ch/tt', [4, 4]]]) {
    const c = p[k] ?? '';
    need(c.length >= 80 && c.length <= 2000, `${k} muss 80 bis 2000 Zeichen haben`);
    need(c.includes(link), `${k} muss «${link}» enthalten`);
    need(/Lieferung 10–20 Werktage/.test(c), `${k} muss die Lieferzeit der Produktseiten nennen (10–20 Werktage)`);
    need(c.includes('Versand CHF 7, ab CHF 50 gratis nach Rabatt'), `${k} muss die Versandregel nennen`);
    need(!/ß/.test(c), `${k} enthält ß (Schweizer Rechtschreibung)`);
    need(!/\bKI\b|künstliche/i.test(c), `${k} spricht von KI, obwohl das Video echtes CJ-Material ist`);
    need(!VERBOTEN_WORTE.test(c), `${k} enthält ein verbotenes Wort (Garantie/Superlativ/Marke)`);
    need(!/\bCHF\s?\d/.test(ohneVersand(c)), `${k} nennt einen Preis ausser der Versandregel`);
    const n = hashtags(c).length;
    need(n >= tags[0] && n <= tags[1], `${k} braucht ${tags[0] === tags[1] ? 'genau ' + tags[0] : tags[0] + ' bis ' + tags[1]} Hashtags (hat ${n})`);
  }
  for (const k of ['plan_igfb', 'plan_tt']) need(/^2026-\d\d-\d\dT\d\d:\d\d:00$/.test(p[k] ?? ''), `${k} muss «2026-MM-TTTHH:MM:00» sein (Europe/Zurich)`);
  return f;
}

// Mindestabstand je Netzwerk zwischen den Clips dieser Datei (zu bestehenden Beiträgen: gegen Metricool prüfen)
export function pruefeCjAbstand(liste, minStunden = 3) {
  const f = [];
  for (const k of ['plan_igfb', 'plan_tt']) {
    const t = liste.map((p) => [p.id, Date.parse(`${p[k]}Z`)]).filter(([, v]) => Number.isFinite(v)).sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < t.length; i++) if ((t[i][1] - t[i - 1][1]) / 3600000 < minStunden) f.push(`${k}: ${t[i - 1][0]} und ${t[i][0]} liegen weniger als ${minStunden} Stunden auseinander`);
  }
  return f;
}

export function pruefeCjDatei(pfad) {
  let d;
  try { d = JSON.parse(readFileSync(pfad, 'utf8')); } catch (e) { return [`Datei nicht lesbar oder kein JSON: ${e.message}`]; }
  const liste = d.clips;
  if (!Array.isArray(liste) || !liste.length) return ['kein Feld «clips» (Liste)'];
  const out = []; const ids = new Set();
  for (const p of liste) {
    if (ids.has(p.id)) out.push(`${p.id}: id doppelt`);
    ids.add(p.id);
    for (const m of pruefeCjClip(p)) out.push(`${p.id ?? '?'}: ${m}`);
  }
  return [...out, ...pruefeCjAbstand(liste)];
}

// ---------- Bild, Kosten, Anfrage ----------
export function bildMasse(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), mime: 'image/png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += (m === 0xff ? 1 : 2); continue; }
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), mime: 'image/jpeg' };
      i += 2 + len;
    }
  }
  return null;
}

export const kosten = (sekunden, aufloesung = '720p') => Math.round(sekunden * (PREIS_USD_PRO_SEKUNDE[aufloesung] ?? 1) * 100) / 100;

export function baueAnfrage({ prompt, bildB64, mime, aufloesung }) {
  return {
    model: MODELL,
    input: [{ type: 'image', data: bildB64, mime_type: mime }, { type: 'text', text: prompt }],
    response_format: { type: 'video', aspect_ratio: '9:16', resolution: aufloesung },
  };
}

export function videoAusAntwort(j) {
  for (const s of [...(j?.steps ?? [])].reverse()) {
    if (s?.type !== 'model_output') continue;
    for (const c of s.content ?? []) if (c?.type === 'video' && (c.data || c.uri)) return { data: c.data ?? null, uri: c.uri ?? null };
  }
  return null;
}

export function ledgerSumme(datei) {
  if (!existsSync(datei)) return 0;
  let s = 0;
  for (const z of readFileSync(datei, 'utf8').split('\n')) {
    const t = z.split('\t');
    if (t[2] === 'OK') s += Number(t[4]) || 0;
  }
  return Math.round(s * 100) / 100;
}

const schwaerzen = (s, key) => (key ? String(s).split(key).join('***') : String(s));
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Lauf ----------
export async function lauf(opt, deps = {}) {
  const log = deps.log ?? ((m) => console.log(m));
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const key = deps.key ?? process.env.GEMINI_API_KEY ?? '';
  const aufl = opt.aufloesung ?? '720p';
  const out = { exit: 0 };
  const fehl = (code, m) => { log(`FEHLER: ${m}`); out.exit = code; return out; };

  let produkte;
  try { produkte = JSON.parse(readFileSync(opt.produkte, 'utf8')).produkte; } catch (e) { return fehl(2, `produkte.json nicht lesbar: ${e.message}`); }
  const p = (produkte ?? []).find((x) => x.id === opt.id);
  if (!p) return fehl(2, `Produkt «${opt.id}» nicht in der Liste (${(produkte ?? []).map((x) => x.id).join(', ')})`);
  const probleme = pruefeProdukt(p);
  if (probleme.length) return fehl(2, `Textregeln verletzt: ${probleme.join('; ')}`);
  if (!AUFLOESUNGEN.includes(aufl) && !(aufl === '4k' && opt.erlaube4k)) return fehl(2, `AUFLOESUNG muss ${AUFLOESUNGEN.join('|')} sein (4k nur mit ERLAUBE_4K=1)`);

  const sek = opt.sekunden ?? 8;
  const schaetz = kosten(sek, aufl);
  const bisher = ledgerSumme(opt.ledger);
  log(`Produkt: ${p.id} (${p.name})`);
  log(`Modell ${MODELL}, 9:16, ${aufl}, Foto ${p.foto}`);
  log(`Geschätzte Kosten dieses Clips: ${schaetz.toFixed(2)} USD (${sek} s, Annahme); bisher laut Ledger ${bisher.toFixed(2)} USD, Obergrenze ${opt.gesamtUsd.toFixed(2)} USD`);
  log(`Prompt: ${p.prompt_en}`);
  if (bisher + schaetz > opt.gesamtUsd) return fehl(3, `Obergrenze GESAMT_USD überschritten (${(bisher + schaetz).toFixed(2)} > ${opt.gesamtUsd.toFixed(2)}); nichts gesendet`);
  if (!opt.live) { log('Trockenlauf: nichts gesendet. Mit LIVE=1 senden (kostet Geld).'); return out; }
  if (!key) return fehl(2, 'GEMINI_API_KEY fehlt');

  // Foto laden und prüfen
  let buf;
  try {
    const r = await fetchFn(p.foto, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) return fehl(6, `Foto nicht ladbar (HTTP ${r.status})`);
    buf = Buffer.from(await r.arrayBuffer());
  } catch (e) { return fehl(6, `Foto nicht ladbar: ${e.message}`); }
  const m = bildMasse(buf);
  if (!m) return fehl(2, 'Foto ist weder JPEG noch PNG');
  if (Math.min(m.w, m.h) < 700) return fehl(2, `Foto zu klein (${m.w}x${m.h}, mindestens 700 px an der kurzen Seite)`);
  log(`Foto ok: ${m.w}x${m.h} ${m.mime}`);

  const body = JSON.stringify(baueAnfrage({ prompt: p.prompt_en, bildB64: buf.toString('base64'), mime: m.mime, aufloesung: aufl }));
  let antwort = null;
  for (let versuch = 0; versuch < 3; versuch++) {
    let r;
    try {
      r = await fetchFn(ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body, signal: AbortSignal.timeout(deps.timeoutMs ?? 600000) });
    } catch (e) { return fehl(6, `Anfrage gescheitert: ${schwaerzen(e.message, key)}`); }
    const text = await r.text();
    if (r.status === 402) { appendFileSync(opt.ledger, `${new Date().toISOString()}\t${p.id}\tHTTP402\t0\t0\t-\n`); return fehl(5, 'Guthaben leer (HTTP 402): bei Google AI Studio unter Billing prüfen, ob die Aufladung dem Projekt dieses Schlüssels gutgeschrieben ist; nichts abgerechnet'); }
    if ((r.status === 429 || r.status >= 500) && versuch < 2) { log(`HTTP ${r.status}, neuer Versuch in ${(deps.pauseMs ?? 20000) / 1000} s`); await warte(deps.pauseMs ?? 20000); continue; }
    if (!r.ok) return fehl(6, `HTTP ${r.status}: ${schwaerzen(text, key).slice(0, 400)}`);
    try { antwort = JSON.parse(text); } catch { return fehl(4, 'Antwort ist kein JSON'); }
    break;
  }
  const v = videoAusAntwort(antwort);
  if (!v) return fehl(4, `Antwort ohne Video (Status ${antwort?.status ?? '?'})`);
  let bytes;
  if (v.data) bytes = Buffer.from(v.data, 'base64');
  else {
    const r = await fetchFn(v.uri, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(300000) });
    if (!r.ok) return fehl(6, `Video-Download HTTP ${r.status}`);
    bytes = Buffer.from(await r.arrayBuffer());
  }
  if (bytes.length < 1000) return fehl(4, `Video verdächtig klein (${bytes.length} Byte)`);
  mkdirSync(opt.outDir, { recursive: true });
  let n = 1; while (existsSync(path.join(opt.outDir, `${p.id}-omni-${n}.mp4`))) n++;
  const datei = path.join(opt.outDir, `${p.id}-omni-${n}.mp4`);
  writeFileSync(datei, bytes);
  let dauer = sek; let masse = '?';
  try {
    const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'csv=p=0:s=,', datei], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\s+/);
    const [w, h, d] = o.join(',').split(',');
    if (Number(d) > 0) dauer = Number(d);
    masse = `${w}x${h}`;
  } catch { /* ffprobe fehlt: Annahme bleibt */ }
  const echte = kosten(dauer, aufl);
  appendFileSync(opt.ledger, `${new Date().toISOString()}\t${p.id}\tOK\t${dauer.toFixed(1)}\t${echte.toFixed(2)}\t${datei}\n`);
  log(`Gespeichert: ${datei} (${bytes.length} Byte, ${masse}, ${dauer.toFixed(1)} s, geschätzt ${echte.toFixed(2)} USD). NÄCHSTER SCHRITT: Einzelbilder ansehen (Sichtprüfung), erst dann veredeln.`);
  out.datei = datei; out.dauer = dauer; out.kosten = echte;
  return out;
}

// ---------- Kommandozeile ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  if (a[0] === '--pruefen-cj') {
    const f = pruefeCjDatei(a[1] || path.join(HIER, 'cj_clips.json'));
    if (f.length) { for (const m of f) console.log(`✗ ${m}`); console.log(`${f.length} Verstösse`); process.exit(2); }
    console.log('Alle CJ-Clips erfüllen die Textregeln.'); process.exit(0);
  }
  if (a[0] === '--pruefen') {
    if (!a[1]) { console.error('Aufruf: node omni_clip.mjs --pruefen <datei.json>'); process.exit(2); }
    const f = pruefeDatei(a[1]);
    if (f.length) { for (const m of f) console.log(`✗ ${m}`); console.log(`${f.length} Verstösse`); process.exit(2); }
    console.log('Alle Einträge erfüllen die Textregeln.'); process.exit(0);
  }
  if (!a[0] || a[0].startsWith('-')) {
    console.error(`Aufruf: node omni_clip.mjs <id>  (ids: ${JSON.parse(readFileSync(path.join(HIER, 'produkte.json'), 'utf8')).produkte.map((x) => x.id).join(', ')})`);
    process.exit(2);
  }
  const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
  const r = await lauf({
    id: a[0], live: process.env.LIVE === '1', aufloesung: process.env.AUFLOESUNG || '720p', erlaube4k: process.env.ERLAUBE_4K === '1',
    outDir: process.env.OUT_DIR || '/tmp/luxe-omni', gesamtUsd: num(process.env.GESAMT_USD, 10), sekunden: num(process.env.SEKUNDEN, 8),
    produkte: process.env.PRODUKTE || path.join(HIER, 'produkte.json'), ledger: process.env.LEDGER || path.join(HIER, 'ledger.txt'),
  });
  process.exit(r.exit);
}
