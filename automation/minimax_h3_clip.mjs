#!/usr/bin/env node
/**
 * MiniMax H3: aus EINEM eigenen Produktfoto einen kurzen Clip erzeugen (Bild-zu-Video, erstes Bild), dann das Modell-Audio durch
 * automation/music/luxe-premium.wav ersetzen (Besitzer-Regel: Marketing-Videos ohne Stimme, mit der «neuen Musik»).
 *
 * VORGABE = TROCKENLAUF: ohne LIVE=1 wird nichts gesendet, nichts bezahlt; der Lauf druckt nur die Anfrage (ohne Schlüssel).
 *   LIVE=1            sendet genau EINE Anfrage (kostet Geld auf dem MiniMax-Konto des Besitzers, Preis in der Doku NICHT belegt).
 *
 * Eingabe (Umgebung): MINIMAX_API_KEY (nur LIVE) · IMAGE_URL (https, eigenes Foto, wird per HEAD geprüft) · PROMPT (Englisch empfohlen)
 *   MODEL (Vorgabe MiniMax-H3-Lite) · DURATION (Vorgabe 5) · RESOLUTION (Vorgabe 768P) · OUT (Vorvorgabe ./out/h3) · MUSIK (Vorgabe automation/music/luxe-premium.wav)
 *
 * QUELLEN (GEMESSEN am 2.11.2026): Anfrage POST https://api.minimax.io/v2/video_generation → {task_id};
 *   Abruf GET https://api.minimax.io/v2/query/video_generation/{task_id} → {task:{status: queued|running|succeeded|failed|cancelled, content:{url}}};
 *   Bild-Eintrag {type:'image_url', image_url:{url}, role:'first_frame'} (offizielles Beispielskript im Hugging-Face-Repo MiniMaxAI/MiniMax-H3).
 * SETZUNGEN: Obergrenze 8 Sekunden je Clip (Kostenschutz), höchstens EIN Clip je Lauf, Wartezeit höchstens 20 Minuten.
 * LIZENZ/AUFLAGEN: gilt die API-Nutzung, nicht die offenen Gewichte; die Plattform-Bedingungen für kommerzielle Nutzung sind VOM BESITZER zu prüfen.
 *   KI-Inhalte öffentlich als KI-erzeugt kennzeichnen (steht auch im Begleittext, den der Lauf neben das Video legt).
 */
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

export const API = 'https://api.minimax.io';
export const MAX_SEKUNDEN = 8;
export const MAX_WARTEN_MS = 20 * 60 * 1000;
export const MODELLE = {
  'MiniMax-H3-Lite': { aufloesung: ['480P', '768P'], minSek: 4 },
  'MiniMax-H3-Highspeed': { aufloesung: ['480P', '768P'], minSek: 4 },
  'MiniMax-H3': { aufloesung: ['768P', '2K'], minSek: 4 },
  'MiniMax-H3-Max': { aufloesung: ['480P', '768P'], minSek: 5 },
};
export const REGELN_ANHANG = ' No speech, no spoken words, no on-screen text, no logos, no watermarks. Keep the product exactly as in the first frame.';
export const KI_HINWEIS = 'KI-generiertes Video (MiniMax H3), Produkt nach eigenem Foto.';

/** Prüft die Eingabe; wirft bei jedem Fehler (nie raten, nie stillschweigend korrigieren). */
export function konfig(env) {
  const f = [];
  const model = env.MODEL || 'MiniMax-H3-Lite';
  const m = MODELLE[model];
  if (!m) f.push(`MODEL «${model}» unbekannt (erlaubt: ${Object.keys(MODELLE).join(', ')})`);
  const dauer = Number(env.DURATION || 5);
  if (!Number.isInteger(dauer)) f.push('DURATION muss eine ganze Zahl sein');
  else if (m && dauer < m.minSek) f.push(`DURATION ${dauer} unter dem Minimum ${m.minSek} für ${model}`);
  else if (dauer > MAX_SEKUNDEN) f.push(`DURATION ${dauer} über der Obergrenze ${MAX_SEKUNDEN} Sekunden`);
  const aufl = env.RESOLUTION || '768P';
  if (m && !m.aufloesung.includes(aufl)) f.push(`RESOLUTION ${aufl} nicht erlaubt für ${model} (${m.aufloesung.join(', ')})`);
  const bild = (env.IMAGE_URL || '').trim();
  if (!/^https:\/\/[^\s]+$/.test(bild)) f.push('IMAGE_URL fehlt oder ist keine https-Adresse');
  const prompt = (env.PROMPT || '').trim();
  if (!prompt) f.push('PROMPT fehlt');
  if (prompt.length > 2000) f.push('PROMPT länger als 2000 Zeichen');
  const live = env.LIVE === '1';
  if (live && !(env.MINIMAX_API_KEY || '').trim()) f.push('LIVE=1, aber MINIMAX_API_KEY fehlt');
  if (f.length) throw new Error('Eingabe ungültig:\n - ' + f.join('\n - '));
  return { live, model, duration: dauer, resolution: aufl, imageUrl: bild, prompt, key: (env.MINIMAX_API_KEY || '').trim(), out: env.OUT || './out/h3', musik: env.MUSIK || 'automation/music/luxe-premium.wav' };
}

/** Anfragekörper (ohne Schlüssel). Bild-zu-Video: ratio ist immer adaptive (Doku). */
export function anfrage(cfg) {
  return {
    model: cfg.model,
    content: [
      { type: 'text', text: cfg.prompt + REGELN_ANHANG },
      { type: 'image_url', image_url: { url: cfg.imageUrl }, role: 'first_frame' },
    ],
    resolution: cfg.resolution,
    duration: cfg.duration,
    ratio: 'adaptive',
  };
}

/** Liest die Abrufantwort. status ∈ queued|running|succeeded|failed|cancelled; bei succeeded muss eine URL da sein. */
export function ergebnis(antwort) {
  const t = antwort && antwort.task;
  if (!t || typeof t.status !== 'string') throw new Error('Abrufantwort ohne task.status');
  if (t.status === 'succeeded') {
    const url = t.content && t.content.url;
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) throw new Error('succeeded, aber ohne https-Video-URL');
    return { fertig: true, url };
  }
  if (t.status === 'failed' || t.status === 'cancelled') return { fertig: true, fehler: t.status };
  if (t.status === 'queued' || t.status === 'running') return { fertig: false };
  throw new Error('Unbekannter Status: ' + t.status);
}

async function json(fetchFn, url, opt, was) {
  const r = await fetchFn(url, opt);
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  if (!r.ok) throw new Error(`${was}: HTTP ${r.status} ${(j && j.error && j.error.message) || text.slice(0, 200)}`);
  if (!j) throw new Error(`${was}: keine JSON-Antwort`);
  return j;
}

/**
 * Lauf. io = { fetch, warte, jetzt, schreibe } (von aussen, damit der Test ohne Netz läuft).
 * Trockenlauf: gibt {trocken:true, anfrage} zurück und ruft NICHTS auf ausser der Bildprüfung (HEAD).
 */
export async function lauf(cfg, io) {
  const kopf = await io.fetch(cfg.imageUrl, { method: 'HEAD' });
  if (!kopf.ok) throw new Error(`Bild nicht erreichbar: HTTP ${kopf.status}`);
  const typ = (kopf.headers && kopf.headers.get && kopf.headers.get('content-type')) || '';
  if (!/^image\//i.test(typ)) throw new Error(`IMAGE_URL liefert keinen Bildtyp (${typ || 'leer'})`);
  const body = anfrage(cfg);
  if (!cfg.live) return { trocken: true, anfrage: body };
  const auth = { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' };
  const neu = await json(io.fetch, `${API}/v2/video_generation`, { method: 'POST', headers: auth, body: JSON.stringify(body) }, 'Anlegen');
  const id = neu.task_id;
  if (!id) throw new Error('Anlegen ohne task_id');
  const start = io.jetzt();
  for (;;) {
    if (io.jetzt() - start > MAX_WARTEN_MS) throw new Error(`Zeitlimit: Task ${id} nach 20 Minuten nicht fertig`);
    await io.warte(15000);
    const a = await json(io.fetch, `${API}/v2/query/video_generation/${encodeURIComponent(id)}`, { headers: auth }, 'Abruf');
    const e = ergebnis(a);
    if (!e.fertig) continue;
    if (e.fehler) throw new Error(`Task ${id} endete mit ${e.fehler}`);
    return { trocken: false, taskId: id, url: e.url, sekunden: a.task.duration ?? cfg.duration };
  }
}

/** Video laden, Modell-Ton entfernen, Musik darunter legen (Länge = Video, 1 s Ausblenden). */
export function mitMusik(roh, musik, ziel, sekunden) {
  if (!existsSync(musik)) throw new Error('Musikdatei fehlt: ' + musik);
  const ausblenden = Math.max(0, sekunden - 1);
  execFileSync('ffmpeg', ['-y', '-i', roh, '-i', musik, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
    '-af', `afade=t=out:st=${ausblenden}:d=1`, '-t', String(sekunden), ziel], { stdio: 'inherit' });
}

async function haupt() {
  const cfg = konfig(process.env);
  const io = { fetch: globalThis.fetch, warte: ms => new Promise(r => setTimeout(r, ms)), jetzt: () => Date.now() };
  const r = await lauf(cfg, io);
  if (r.trocken) {
    console.log('TROCKENLAUF (nichts gesendet, nichts bezahlt). Anfrage:\n' + JSON.stringify(r.anfrage, null, 2));
    console.log('\nLIVE=1 setzen, um genau EINEN Clip zu erzeugen (kostet Geld auf dem MiniMax-Konto).');
    return;
  }
  mkdirSync(cfg.out, { recursive: true });
  const roh = resolve(join(cfg.out, 'roh.mp4'));
  const res = await fetch(r.url);
  if (!res.ok) throw new Error('Download: HTTP ' + res.status);
  writeFileSync(roh, Buffer.from(await res.arrayBuffer()));
  const ziel = resolve(join(cfg.out, 'clip-mit-musik.mp4'));
  mitMusik(roh, resolve(cfg.musik), ziel, r.sekunden);
  writeFileSync(join(cfg.out, 'BEGLEITTEXT.txt'), KI_HINWEIS + '\n');
  console.log(`Fertig: Task ${r.taskId}, ${r.sekunden} s, ${statSync(ziel).size} Bytes → ${ziel}`);
}

if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  haupt().catch(e => { console.error('FEHLER: ' + e.message); process.exit(1); });
}
