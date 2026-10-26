/**
 * Reine Funktionen (kein Netz, ausser dort, wo ein `fetch` ausdrücklich übergeben wird) für die
 * Video-Zeile des Shops: TikTok-/YouTube-Adressen erkennen, Einträge bauen, Liste bilden.
 *
 * Gegenstück im Theme: `sections/luxe-videos.liquid` + `snippets/luxe-videos-zeile.liquid` lesen das
 * Shop-Metafeld `luxe.videos` (Typ json) = Liste von {plattform, titel, url, vorschau}, neueste zuerst.
 * Die Adress-Prüfung im Theme (`snippets/luxe-video-karte.liquid`) und die hier sind absichtlich
 * dieselbe Regel: nur https und nur die Hosts unten. Alles andere fliegt raus, hier UND im Theme.
 *
 * Lauf des Tests: /opt/node22/bin/node automation/lib/videos_zeile_test.mjs
 */

export const NAMESPACE = 'luxe';
export const KEY = 'videos';
export const MAX_EINTRAEGE = 12;
export const YT_JE_KANAL = 6;

const TT_HOSTS = new Set(['www.tiktok.com', 'tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);
const YT_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']);

/** Adresse -> {plattform, url (bereinigt), id?} oder null. Nur https, nur bekannte Hosts, keine Zugangsdaten. */
export function erkenneUrl(roh) {
  if (typeof roh !== 'string') return null;
  let u;
  try { u = new URL(roh.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '443') return null;
  const host = u.hostname.toLowerCase();
  if (TT_HOSTS.has(host)) {
    const pfad = u.pathname.replace(/\/+$/, '') || '/';
    if (pfad === '/') return null; // Startseite ist kein Video
    const m = pfad.match(/\/video\/(\d{8,25})$/);
    return { plattform: 'tiktok', url: `https://${host}${u.pathname.replace(/\/+$/, '')}${host.startsWith('v') ? '/' : ''}`, id: m ? m[1] : null };
  }
  if (YT_HOSTS.has(host)) {
    const id = youtubeVideoId(roh);
    if (!id) return null; // ein Kanal oder eine Wiedergabeliste ist kein einzelnes Video
    const kurz = u.pathname.startsWith('/shorts/');
    return { plattform: 'youtube', url: kurz ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`, id };
  }
  return null;
}

/** 11-stellige YouTube-Video-ID aus watch?v=, youtu.be/, /shorts/, /embed/, /live/ — sonst null. */
export function youtubeVideoId(roh) {
  let u;
  try { u = new URL(String(roh).trim()); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (!YT_HOSTS.has(host) || u.protocol !== 'https:') return null;
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (u.pathname === '/watch') id = u.searchParams.get('v');
  else {
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
    if (m) id = m[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export const youtubeVorschau = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

/** YouTube-Kanal-ID (UC + 22 Zeichen), auch aus https://www.youtube.com/channel/UC… — sonst null. */
export function kanalId(roh) {
  if (typeof roh !== 'string') return null;
  const s = roh.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(s)) return s;
  const e = erkenneKanalUrl(s);
  return e;
}
function erkenneKanalUrl(s) {
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || !['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/);
  return m ? m[1] : null;
}

export const feedUrl = (kid) => `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(kid)}`;
export const tiktokOembedUrl = (videoUrl) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
export const youtubeOembedUrl = (videoUrl) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`;

/**
 * Quellendatei prüfen und aufteilen. Schlüssel mit führendem „_" (z. B. _hinweis) sind Kommentare.
 * -> { tiktok: [url], youtube: [{ art: 'kanal', id } | { art: 'video', url }], abgelehnt: [{ quelle, grund }] }
 */
export function parseQuellen(obj) {
  const aus = { tiktok: [], youtube: [], abgelehnt: [] };
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { aus.abgelehnt.push({ quelle: String(obj), grund: 'Quellendatei ist kein Objekt' }); return aus; }
  for (const eintrag of Array.isArray(obj.tiktok) ? obj.tiktok : []) {
    const e = erkenneUrl(eintrag);
    if (e && e.plattform === 'tiktok') aus.tiktok.push(e.url);
    else aus.abgelehnt.push({ quelle: String(eintrag), grund: 'keine gültige TikTok-Videoadresse (nur https://…tiktok.com/…)' });
  }
  for (const eintrag of Array.isArray(obj.youtube) ? obj.youtube : []) {
    const k = kanalId(eintrag);
    if (k) { aus.youtube.push({ art: 'kanal', id: k }); continue; }
    const e = erkenneUrl(eintrag);
    if (e && e.plattform === 'youtube') aus.youtube.push({ art: 'video', url: e.url });
    else aus.abgelehnt.push({ quelle: String(eintrag), grund: 'weder Kanal-ID (UC…) noch gültige YouTube-Videoadresse; @Handle-Adressen lassen sich nicht auflösen' });
  }
  return aus;
}

const ENTITAETEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function xmlText(s) {
  return String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITAETEN[n.toLowerCase()] ?? m);
}

/** Titel säubern: HTML-Reste raus, Leerraum glätten, auf 140 Zeichen kürzen (Hashtag-Ketten bleiben nicht stehen). */
export function saubererTitel(roh, ersatz = '') {
  let t = String(roh ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/(\s#[^\s#]+){3,}\s*$/u, '').trim(); // Hashtag-Schwanz am Ende
  if (!t) return ersatz;
  if (t.length > 140) t = t.slice(0, 137).replace(/\s+\S*$/, '') + '…';
  return t;
}

const nurHttps = (u) => (typeof u === 'string' && /^https:\/\//i.test(u.trim()) ? u.trim() : '');

/** TikTok-Zeitstempel steckt in den oberen Bits der Video-ID (Sekunden seit 1970). Unplausibel -> null. */
export function tiktokDatum(id) {
  if (!id || !/^\d{8,25}$/.test(id)) return null;
  let s;
  try { s = Number(BigInt(id) >> 32n); } catch { return null; }
  const von = Date.UTC(2016, 8, 1) / 1000, bis = Date.now() / 1000 + 86400;
  return s >= von && s <= bis ? new Date(s * 1000).toISOString() : null;
}

/** oEmbed-Antwort von TikTok -> Eintrag. Ohne Titel gilt ein Ersatztitel, eine Vorschau nur über https. */
export function eintragAusTiktok(videoUrl, oembed) {
  const e = erkenneUrl(videoUrl);
  if (!e || e.plattform !== 'tiktok') return null;
  const o = oembed && typeof oembed === 'object' ? oembed : {};
  return {
    plattform: 'tiktok',
    titel: saubererTitel(o.title, 'TikTok-Video von LuxeStyle'),
    url: e.url,
    vorschau: nurHttps(o.thumbnail_url),
    datum: tiktokDatum(e.id),
  };
}

/** Atom-Feed eines YouTube-Kanals -> Einträge, neueste zuerst, höchstens `max`. */
export function parseYoutubeFeed(xml, max = YT_JE_KANAL) {
  const aus = [];
  for (const m of String(xml ?? '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const blk = m[1];
    const id = (blk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim();
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    const titel = xmlText((blk.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const veroeff = (blk.match(/<published>([^<]+)<\/published>/) || [])[1]?.trim();
    const dat = veroeff && !Number.isNaN(Date.parse(veroeff)) ? new Date(veroeff).toISOString() : null;
    const thumb = nurHttps(xmlText((blk.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1]));
    aus.push({ plattform: 'youtube', titel: saubererTitel(titel, 'YouTube-Video von LuxeStyle'), url: `https://www.youtube.com/watch?v=${id}`, vorschau: thumb || youtubeVorschau(id), datum: dat });
  }
  aus.sort((a, b) => (b.datum ? Date.parse(b.datum) : 0) - (a.datum ? Date.parse(a.datum) : 0));
  return aus.slice(0, max);
}

/** Einzelnes YouTube-Video: Vorschau aus der ID (Titel optional aus oEmbed, sonst Ersatztitel). */
export function eintragAusYoutubeVideo(videoUrl, oembed) {
  const e = erkenneUrl(videoUrl);
  if (!e || e.plattform !== 'youtube') return null;
  const o = oembed && typeof oembed === 'object' ? oembed : {};
  return { plattform: 'youtube', titel: saubererTitel(o.title, 'YouTube-Video von LuxeStyle'), url: e.url, vorschau: youtubeVorschau(e.id), datum: null };
}

/** Schlüssel für Duplikate: dasselbe Video unter verschiedenen Adressen zählt einmal. */
export function dublettenSchluessel(url) {
  const e = erkenneUrl(url);
  if (!e) return null;
  if (e.plattform === 'youtube') return `yt:${e.id}`;
  return e.id ? `tt:${e.id}` : `tt:${new URL(e.url).host}${new URL(e.url).pathname}`;
}

/**
 * Liste bilden: ungültige raus, Duplikate raus (das erste Vorkommen gewinnt), neueste zuerst
 * (Einträge ohne Datum behalten ihre Reihenfolge und stehen hinter den datierten), höchstens `max`.
 * Rückgabe: genau die vier Felder, die das Theme liest.
 */
export function baueListe(eintraege, max = MAX_EINTRAEGE) {
  const gesehen = new Set();
  const gut = [];
  (Array.isArray(eintraege) ? eintraege : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return;
    const k = dublettenSchluessel(e.url);
    if (!k || gesehen.has(k)) return;
    const erk = erkenneUrl(e.url);
    gesehen.add(k);
    gut.push({
      i, t: e.datum && !Number.isNaN(Date.parse(e.datum)) ? Date.parse(e.datum) : null,
      plattform: erk.plattform, // massgeblich ist die Adresse, nicht das mitgelieferte Feld
      titel: saubererTitel(e.titel, erk.plattform === 'tiktok' ? 'TikTok-Video von LuxeStyle' : 'YouTube-Video von LuxeStyle'),
      url: erk.url, vorschau: nurHttps(e.vorschau),
    });
  });
  gut.sort((a, b) => (a.t !== null && b.t !== null ? b.t - a.t : a.t !== null ? -1 : b.t !== null ? 1 : a.i - b.i));
  return gut.slice(0, Math.max(0, Math.min(max, MAX_EINTRAEGE))).map(({ plattform, titel, url, vorschau }) => ({ plattform, titel, url, vorschau }));
}

/** Letzte Sicherung vor dem Schreiben: ist das wirklich eine Liste, die das Theme lesen kann? */
export function pruefeListe(liste) {
  const fehler = [];
  if (!Array.isArray(liste)) return { ok: false, fehler: ['keine Liste'] };
  if (liste.length > MAX_EINTRAEGE) fehler.push(`mehr als ${MAX_EINTRAEGE} Einträge (${liste.length})`);
  const gesehen = new Set();
  liste.forEach((e, i) => {
    const wo = `Eintrag ${i + 1}`;
    if (!e || typeof e !== 'object') { fehler.push(`${wo}: kein Objekt`); return; }
    const erk = erkenneUrl(e.url);
    if (!erk) fehler.push(`${wo}: Adresse nicht zugelassen (${String(e.url).slice(0, 60)})`);
    else if (erk.plattform !== e.plattform) fehler.push(`${wo}: Plattform ${e.plattform} passt nicht zur Adresse (${erk.plattform})`);
    if (typeof e.titel !== 'string' || !e.titel.trim()) fehler.push(`${wo}: Titel fehlt`);
    if (typeof e.vorschau !== 'string' || (e.vorschau !== '' && !/^https:\/\//.test(e.vorschau))) fehler.push(`${wo}: Vorschau muss leer oder https sein`);
    const k = dublettenSchluessel(e.url);
    if (k) { if (gesehen.has(k)) fehler.push(`${wo}: doppelt`); gesehen.add(k); }
  });
  return { ok: fehler.length === 0, fehler };
}

/**
 * Soll geschrieben werden? Eine leere Liste oder ein Lauf, in dem über die Hälfte der Quellen
 * ausfiel, würde eine gesunde Liste im Shop ersetzen — das passiert nur mit ausdrücklichem „trotzdem".
 */
export function darfSchreiben(liste, { quellen = 0, ausgefallen = 0, trotzdem = false } = {}) {
  const p = pruefeListe(liste);
  if (!p.ok) return { ja: false, grund: 'Liste ungültig: ' + p.fehler[0] };
  if (trotzdem) return { ja: true, grund: 'ausdrücklich erzwungen' };
  if (liste.length === 0) return { ja: false, grund: 'Liste leer — würde die bisherige ersetzen (LEER=1 erlaubt es)' };
  if (quellen > 0 && ausgefallen / quellen > 0.5) return { ja: false, grund: `${ausgefallen} von ${quellen} Quellen ausgefallen — vermutlich eine Störung, nichts überschrieben` };
  return { ja: true, grund: 'ok' };
}

/** Eingabe für metafieldsSet (Shop-Objekt). Wert als JSON-Text, Typ json. */
export function metafieldsSetEingabe(shopId, liste) {
  return [{ ownerId: shopId, namespace: NAMESPACE, key: KEY, type: 'json', value: JSON.stringify(liste) }];
}

/**
 * HTTP mit Geduld: 429/5xx/Netzfehler -> bis zu `versuche` Versuche mit wachsender Pause; andere 4xx sofort.
 * `auchWiederholen: [404]` für Endpunkte, die gelegentlich zu Unrecht 404 melden: der YouTube-RSS-Feed
 * antwortete am 26.10.2026 für DIESELBE Kanal-ID abwechselnd mit 200, 404 und 500.
 */
export async function holeMitGeduld(url, opt = {}) {
  const versuche = opt.versuche ?? 4;
  const basis = opt.basisMs ?? 1200;
  const fetchFn = opt.fetch ?? fetch;
  const warte = opt.warte ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const nochmal = new Set(opt.auchWiederholen ?? []); // weitere Status, die wie eine Störung behandelt werden
  let status = 0, text = '', fehler = '', nachgefasst = 0;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetchFn(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LuxeStyle-Videozeile/1.0)', Accept: '*/*' } });
      status = r.status; text = await r.text(); fehler = '';
      if (status >= 200 && status < 300) return { ok: true, status, text, nachgefasst };
      if (status !== 429 && status < 500 && !nochmal.has(status)) return { ok: false, status, text: '', nachgefasst, fehler: `HTTP ${status}` };
      fehler = `HTTP ${status}`;
    } catch (e) { status = 0; fehler = 'Netzfehler: ' + (e?.message || e); }
    if (i + 1 < versuche) { nachgefasst++; await warte(basis * 2 ** i); }
  }
  return { ok: false, status, text: '', nachgefasst, fehler: fehler || `HTTP ${status}` };
}

/**
 * Alle Quellen abholen und die Liste bilden. Ein Fehler bei EINEM Eintrag bricht den Lauf nicht ab:
 * der Eintrag wird übersprungen und im Bericht genannt.
 * opt: { fetch, warte, versuche, basisMs, pauseMs }
 */
export async function sammle(quellenObj, opt = {}) {
  const q = parseQuellen(quellenObj);
  const bericht = { quellen: 0, ausgefallen: 0, abgelehnt: q.abgelehnt, uebersprungen: [], nachgefasst: 0, eintraege: 0 };
  const alle = [];
  const pause = opt.pauseMs ?? 0;
  const warte = opt.warte ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const hole = async (url, extra = {}) => {
    if (pause) await warte(pause);
    const r = await holeMitGeduld(url, { ...opt, ...extra });
    bericht.nachgefasst += r.nachgefasst;
    return r;
  };
  const ausfall = (was, grund) => { bericht.ausgefallen++; bericht.uebersprungen.push({ quelle: was, grund }); };

  for (const url of q.tiktok) {
    bericht.quellen++;
    const r = await hole(tiktokOembedUrl(url));
    if (!r.ok) { ausfall(url, r.fehler); continue; }
    let j; try { j = JSON.parse(r.text); } catch { ausfall(url, 'oEmbed-Antwort ist kein JSON'); continue; }
    const e = eintragAusTiktok(url, j);
    if (e) alle.push(e); else ausfall(url, 'kein Eintrag baubar');
  }
  for (const y of q.youtube) {
    bericht.quellen++;
    if (y.art === 'kanal') {
      const r = await hole(feedUrl(y.id), { auchWiederholen: [404] }); // der Feed meldet gelegentlich zu Unrecht 404
      if (!r.ok) { ausfall(`Kanal ${y.id}`, r.fehler); continue; }
      const eintraege = parseYoutubeFeed(r.text);
      if (!eintraege.length) { ausfall(`Kanal ${y.id}`, 'Feed ohne lesbare Videos'); continue; }
      alle.push(...eintraege);
    } else {
      let o = null;
      const r = await hole(youtubeOembedUrl(y.url)); // liefert den Titel; bei einer Störung (5xx/Netz) bleibt der Ersatztitel
      // 400/401/403/404 = es gibt das Video nicht (mehr), ist privat oder die Adresse ist falsch: nicht in die Liste.
      if (!r.ok && [400, 401, 403, 404].includes(r.status)) { ausfall(y.url, `Video nicht abrufbar (${r.fehler}): gelöscht, privat oder falsche Adresse`); continue; }
      if (r.ok) { try { o = JSON.parse(r.text); } catch { o = null; } }
      const e = eintragAusYoutubeVideo(y.url, o);
      if (e) alle.push(e); else ausfall(y.url, 'kein Eintrag baubar');
    }
  }
  const liste = baueListe(alle);
  bericht.eintraege = liste.length;
  return { liste, bericht };
}
