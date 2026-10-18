/* tt_trend.mjs — TikTok-Trendton (18.10.2026; getestet gegen den echten Endpunkt, Bericht scratchpad tiktok_trendton.md → dropship/MUSIK-V3-2026-10-18.md).
 *
 * trendTrack() waehlt fuer EIN TikTok-Reel einen Titel aus TikToks Commercial Music Library (Metricool-Endpunkt
 * GET /v2/scheduler/catalogs/tiktok/trending-tracks) und liefert den `tiktokData.music`-Block. Null = «wie bisher, ohne music».
 *
 * Regeln (alle am 18.10. GEMESSEN, siehe tiktok_trendton.md):
 *  · Tagescache /tmp/_tt_trend_<JJJJ-MM-TT>_CH.json — der Endpunkt wird hoechstens 1x/Tag befragt (vier Listen), bei Fehler
 *    fruehestens nach 60 Min wieder; faellt er aus, gilt der juengste Cache ≤ 3 Tage, sonst null.
 *  · Filter: Dauer ≥ 45 s, kein CJK/Kyrillisch/Arabisch, kein Rap/Rock/Latin/…, keine Slowed/Sped-Up/Halloween/News-Titel,
 *    previewUrl + thumbnailUrl + Name + numerische ID vorhanden.
 *  · Rotation: kein Titel, der in den letzten 30 Zeilen des Ledgers social/_tt_trend_verlauf.txt steht.
 *  · Fenster/Lautheit/Gesang: Hilfsprogramm tt_fenster.py (Download nur in /tmp, danach geloescht).
 *  · Metricool prueft NUR musicId + soundVolume (Pflicht), start ≥ 0, end ≥ start (GEMESSEN) — alles andere muss HIER stimmen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = 'https://app.metricool.com/api';
// Welche Listen? vier Aufrufe/Tag ≈ 176 taugliche Titel (GEMESSEN 18.10.: 59 + 59 + 75 + 68 vor Vereinigung).
const LISTEN = [['7DAY', 'ALL'], ['30DAY', 'ALL'], ['7DAY', 'ELECTRONIC'], ['7DAY', 'EASY_LISTENING']];
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯Ѐ-ӿ؀-ۿ]/;
const BAD_G = new Set(['HIP_HOP/RAP', 'TRAP_RAP', 'ALTERNATIVE_HIP_HOP', 'R&B/SOUL', 'LATIN', 'REGGAETON', 'ROCK', 'METAL', 'HARD_ROCK', 'PUNK', 'K-POP', 'J-POP',
  'CANTOPOP', 'CHINESE_POP', 'R&B_RAP', 'POP_RAP', 'BOOMBAP', 'REGGAE', 'COUNTRY', 'HOLIDAY_MUSIC', 'DEVOTIONAL', 'CHRISTIAN_MUSIC', 'CHILDHOOD', 'NOISE']);
const BAD_N = /slowed|sped up|reverb|podcast|news|serious|tense|conspiracy|birthday|halloween|spooky|horror|rap |freestyle|boom ?bap|montagem|funk|phonk|brazil|pisadinha|que loucura|dj /i;
export const TAGE_CACHE = 3, LEDGER_FENSTER = 30, MIN_DAUER = 45, ZIEL_LUFS = -14;

const heute = tz => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());   // JJJJ-MM-TT in Zuerich
const cacheDir = () => process.env.TT_CACHE_DIR || '/tmp';
const cacheDatei = (tag, land) => path.join(cacheDir(), `_tt_trend_${tag}_${land}.json`);

export function tauglich(t) {
  if (!t || !/^\d{6,}$/.test(String(t.commercialMusicId))) return 'id';
  if (!t.commercialMusicName || !t.previewUrl || !t.thumbnailUrl) return 'felder';
  if (!(t.duration >= MIN_DAUER)) return 'dauer';
  if (CJK.test(t.commercialMusicName) || CJK.test(t.artist || '')) return 'schrift';
  if ((t.genres || []).some(g => BAD_G.has(g))) return 'genre';
  if (BAD_N.test(t.commercialMusicName)) return 'name';
  return '';
}

async function holeListe(token, user, blog, land, dr, genre) {
  const q = new URLSearchParams({ userId: user, blogId: blog, countryCode: land, dateRange: dr, ...(genre !== 'ALL' ? { genre } : {}) });
  const r = await fetch(`${BASE}/v2/scheduler/catalogs/tiktok/trending-tracks?${q}`, { headers: { 'X-Mc-Auth': token }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`trending-tracks ${dr}/${genre} → HTTP ${r.status}`);
  const j = await r.json();
  if (!Array.isArray(j.data)) throw new Error(`trending-tracks ${dr}/${genre}: keine Liste`);
  return j.data;
}

/** Tagescache lesen oder (hoechstens 1x/Tag, bei Fehler nach 60 Min) neu holen. Gibt {pool, quelle} oder null. */
export async function tagesPool({ token, user, blog, land = 'CH', tz = 'Europe/Zurich', log = () => {} }) {
  const tag = heute(tz), f = cacheDatei(tag, land), fehlerMarke = f + '.fehler';
  const lesen = p => { try { const d = JSON.parse(fs.readFileSync(p, 'utf8')); return d && d.listen ? d : null; } catch { return null; } };
  let d = lesen(f), quelle = 'cache heute';
  if (!d) {
    const fm = (() => { try { return Date.now() - fs.statSync(fehlerMarke).mtimeMs; } catch { return Infinity; } })();
    if (!token) log('kein Token → kein Abruf');
    else if (fm < 3600000) log(`Abruf vor ${Math.round(fm / 60000)} Min gescheitert → erst nach 60 Min wieder`);
    else {
      try {
        const listen = {};
        for (const [dr, g] of LISTEN) { listen[`${dr}|${g}`] = await holeListe(token, user, blog, land, dr, g); await new Promise(r => setTimeout(r, 400)); }
        if (!Object.values(listen).some(l => l.length >= 20)) throw new Error('alle Listen < 20 Eintraege');
        d = { tag, land, geholt: new Date().toISOString(), listen };
        fs.writeFileSync(f + '.tmp', JSON.stringify(d)); fs.renameSync(f + '.tmp', f);   // atomar
        try { fs.unlinkSync(fehlerMarke); } catch {}
        quelle = 'frisch geholt';
      } catch (e) { log('Abruf scheitert: ' + String(e.message || e).slice(0, 120)); try { fs.writeFileSync(fehlerMarke, String(e.message || e)); } catch {} }
    }
  }
  if (!d) {   // Rueckfall: juengster Cache ≤ TAGE_CACHE Tage
    const alt = fs.readdirSync(cacheDir()).filter(n => new RegExp(`^_tt_trend_\\d{4}-\\d{2}-\\d{2}_${land}\\.json$`).test(n)).sort().reverse();
    for (const n of alt) {
      const dd = lesen(path.join(cacheDir(), n));
      if (dd && (Date.now() - Date.parse(dd.geholt)) / 86400000 <= TAGE_CACHE) { d = dd; quelle = `Cache ${dd.tag}`; break; }
    }
  }
  if (!d) return null;
  const pool = new Map();   // ID → Titel + beste Rangzahl ueber alle Listen
  for (const [k, liste] of Object.entries(d.listen)) for (const t of liste) {
    if (tauglich(t)) continue;
    const rang = parseInt(t.rankPosition, 10) || 999, e = pool.get(t.commercialMusicId);
    if (!e || rang < e.rang) pool.set(t.commercialMusicId, { ...t, rang, liste: k });
  }
  return { pool: [...pool.values()].sort((a, b) => a.rang - b.rang), quelle, tag: d.tag };
}

export function ledgerLesen(datei, n = LEDGER_FENSTER) {
  try { return fs.readFileSync(datei, 'utf8').split('\n').filter(z => z.trim() && !z.startsWith('#')).slice(-n).map(z => z.split('\t')[1]); }
  catch { return []; }
}
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** volume = Ziel-LUFS relativ zur gemessenen Fensterlautheit, linear angenommen (BEHAUPTUNG bis zum Pilot), 25..100. */
export function lautstaerke(lufs) {
  if (typeof lufs !== 'number' || !isFinite(lufs)) return 50;
  return Math.max(25, Math.min(100, Math.round(100 * Math.pow(10, (ZIEL_LUFS - lufs) / 20))));
}

/**
 * @returns {Promise<null | {music:object, info:string, ledgerZeile:(pid:string)=>string}>}
 */
export async function trendTrack({ token, user, blog, reelId, videoSek, ledger = 'social/_tt_trend_verlauf.txt', land = 'CH', fenster = defaultFenster, log = console.log }) {
  const lg = m => log('   Trendton: ' + m);
  if (!(videoSek >= 3 && videoSek <= 60)) { lg(`Videodauer unklar (${videoSek}) → ohne Musik`); return null; }
  const p = await tagesPool({ token, user, blog, land, log: lg });
  if (!p || !p.pool.length) { lg('kein Pool → ohne Musik (wie bisher)'); return null; }
  const gesperrt = new Set(ledgerLesen(ledger));
  const frei = p.pool.filter(t => !gesperrt.has(t.commercialMusicId));
  if (!frei.length) { lg(`Pool ${p.pool.length} ganz in den letzten ${LEDGER_FENSTER} Beitraegen → ohne Musik`); return null; }
  // Streuung: unter den 12 bestplatzierten freien Titeln einer, festgelegt durch die Reel-ID (gleiches Reel → gleiche Wahl)
  const reihe = frei.slice(0, 12), start = hash(reelId) % reihe.length;
  for (let i = 0; i < reihe.length; i++) {
    const t = reihe[(start + i) % reihe.length];
    const w = fenster(t.previewUrl, videoSek);
    if (!w || !w.ok) { lg(`${t.commercialMusicName}: Fenster nicht messbar (${w && w.grund}) → naechster`); continue; }
    if (w.gesang && w.gesang.stoerend_als_hintergrund === true) { lg(`${t.commercialMusicName}: Gesang/Text stoert → naechster`); continue; }
    if (typeof w.lufs === 'number' && w.lufs < -18) { lg(`${t.commercialMusicName}: zu leise (${w.lufs} LUFS, nicht anhebbar) → naechster`); continue; }
    const sv = lautstaerke(w.lufs), s = Math.round(w.start * 1000), e = s + Math.round(videoSek * 1000);
    if (e / 1000 > t.duration) { lg(`${t.commercialMusicName}: Ende ${e} ms jenseits der Dauer → naechster`); continue; }
    const music = { musicId: String(t.commercialMusicId), title: t.commercialMusicName, author: t.artist || 'unbekannt', previewUrl: t.previewUrl, thumbnailUrl: t.thumbnailUrl,
                    soundVolume: sv, originalVolume: 0, startMillis: s, endMillis: e };
    const info = `${t.commercialMusicName} – ${t.artist} (Rang ${t.rang} in ${t.liste}, ${p.quelle}) ab ${w.start}s, ${w.lufs} LUFS → soundVolume ${sv}, Gesang: ${w.gesang ? w.gesang.gesang : 'ungeprueft'}`;
    return { music, info, ledgerZeile: pid => [new Date().toISOString(), music.musicId, music.title.replace(/\t/g, ' '), music.author.replace(/\t/g, ' '), reelId, sv, 0, s, e, pid || ''].join('\t') + '\n' };
  }
  lg('kein Titel bestanden → ohne Musik'); return null;
}

function defaultFenster(url, sek) {
  const script = process.env.TT_FENSTER_PY || 'automation/music/tt_fenster.py';
  const args = [script, url, String(sek), ...(process.env.GEMINI_API_KEY && process.env.TT_GESANG !== '0' ? ['--gesang'] : [])];
  const r = spawnSync('python3', ['-I', ...args], { encoding: 'utf8', timeout: 180000, env: process.env });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { ok: false, grund: (r.stderr || 'keine Ausgabe').slice(-100) }; }
}

export function trendMerken(t, pid, ledger = 'social/_tt_trend_verlauf.txt') {
  if (!t) return;
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.appendFileSync(ledger, t.ledgerZeile(pid));
}

/** Dauer einer Videodatei oder URL in Sekunden (null, wenn unlesbar). GEMESSEN 18.10.: ffprobe liest https-URLs hier NICHT
 *  (Proxy/CA) — URLs deshalb erst per curl in eine Wegwerf-Datei, dann ffprobe. */
export function videoDauer(quelle) {
  let datei = quelle, tmp = '';
  if (/^https?:\/\//.test(quelle)) {
    tmp = path.join('/tmp', `_tt_dauer_${process.pid}.mp4`);
    const c = spawnSync('curl', ['-sS', '-L', '--fail', '--max-time', '60', '--max-filesize', '60000000', '-o', tmp, quelle], { encoding: 'utf8' });
    if (c.status !== 0) { try { fs.unlinkSync(tmp); } catch {} return null; }
    datei = tmp;
  }
  try {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', datei], { encoding: 'utf8', timeout: 60000 });
    const v = parseFloat((r.stdout || '').trim().split('\n')[0]);
    return isFinite(v) ? Math.round(v * 100) / 100 : null;
  } finally { if (tmp) try { fs.unlinkSync(tmp); } catch {} }
}
