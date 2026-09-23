/**
 * tiktok_statistik_lesen.mjs — liest die letzten (bis zu) 10 TikTok-Videos von @luxestyle.ch:
 * Aufrufe, Likes, Kommentare, Shares, Saves, Ton (Musik + Lautheit), Auflösung, Caption-Befunde.
 *
 * ⛔ REIN LESEND. Dieses Skript klickt NICHTS an — kein Cookie-Banner, kein «Folgen», kein
 *    «Veröffentlichen», kein «Speichern». Es ruft nur öffentliche Seiten auf und liest den
 *    serverseitig mitgeschickten Datenblock. `--selbsttest` prüft den eigenen Quelltext darauf,
 *    dass keine Klick-/Tipp-/Füll-Aufrufe darin stehen (Gegenprobe, nicht Versprechen).
 *    Geschrieben wird genau EINE Datei: das Ergebnis-JSON.
 *
 * WOHER DIE ZAHLEN KOMMEN (gemessen 23.09.2026, von der Cloud per curl, ohne Anmeldung):
 *   1. https://www.tiktok.com/embed/@luxestyle.ch  → <script id="__FRONTITY_CONNECT_STATE__">
 *      source.data['/embed/@luxestyle.ch'].videoList: die 10 neuesten Videos (id, desc, playCount).
 *   2. https://www.tiktok.com/@luxestyle.ch        → <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
 *      webapp.user-detail.userInfo: Bio (signature), bioLink, commerceUser, Follower, Videozahl.
 *      webapp.app-context.user: nur vorhanden, wenn der Browser ANGEMELDET ist (abgemeldet: fehlt).
 *   3. https://www.tiktok.com/@luxestyle.ch/video/<id> → derselbe Block, webapp.video-detail.itemInfo.
 *      itemStruct: stats (playCount/diggCount/commentCount/shareCount/collectCount), music (title,
 *      authorName, original), video.bitrateInfo (alle ausgelieferten Auflösungen → die höchste ist
 *      die hochgeladene), video.volumeInfo (Loudness/Peak, TikTok-eigene Messung).
 *   ⚠️ Die Profilseite zeigt abgemeldet «Es ist etwas schiefgelaufen» statt des Video-Rasters
 *      (Screenshot social-profil-politur-2026-09-23-tt-vorher.png) — die Liste kommt deshalb aus
 *      der Creator-Einbettung, nicht aus dem Raster.
 *
 * GRENZEN (ehrlich): nur öffentliche Zahlen. Wiedergabezeit, Zuschauerbindung und Herkunft der
 * Aufrufe stehen NICHT im öffentlichen HTML — die liefert Metricool (GET /v2/analytics/posts/tiktok:
 * averageTimeWatched, fullVideoWatchedRate, impressionSources; gemessen 23.09., aber mit Verzug: der
 * neueste Eintrag war vom 21.08., die beiden Posts vom 23.09. fehlten) oder TikTok Studio (Anmeldung
 * nötig — das Agentenprofil ist NICHT angemeldet, gemessen 17./18./23.09.). Dieses Skript ergänzt
 * Metricool: es sieht jedes Video sofort, dazu TikToks eigene Lautheit, Upload-Auflösung und
 * Moderationsfelder. Die Einbettung liefert höchstens 10 Videos.
 *
 * AUFRUF
 *   als Auftrag (Hetzner-Agent):
 *     { "id": "tiktok-statistik-2026-09-24", "typ": "skript", "skript": "tiktok_statistik_lesen.mjs", "anzahl": 10 }
 *     → schreibt auftraege/ergebnis/<id>.json, die Quittung trägt nur die Zusammenfassung.
 *   von Hand / aus der Cloud (gleicher Parser, curl statt Browser):
 *     /opt/node22/bin/node automation/browser/tiktok_statistik_lesen.mjs --curl --out /tmp/tt_statistik.json
 *   Gegenprobe der Prüfregeln:
 *     /opt/node22/bin/node automation/browser/tiktok_statistik_lesen.mjs --selbsttest
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ist_anmeldeseite, ist_wandtext, ist_fehlerseite } from '../../server/anmelde_erkennung.mjs';

export const PROFIL = 'luxestyle.ch';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
         + 'Chrome/128.0 Safari/537.36';

/** Was ein sauberer Post erfüllen muss. Quelle der Fakten: CLAUDE.md (Versand gratis ab CHF 50),
 *  automation/reel/make_reel.sh (1080×1920, loudnorm -14). Die Lautheits-Spanne ist bewusst weit:
 *  TikTok misst selbst und anders als ffmpeg (gemessen: unser -14-Master kam als -15.6 an). */
export const ERWARTET = {
  versand_ab_chf: 50,
  breite: 1080, hoehe: 1920,
  lufs_min: -20, lufs_max: -9,        // ausserhalb = zu leise / zu laut
  lufs_stumm: -50,                    // darunter = praktisch kein Ton
  peak_max: 0.99,                     // linear; ≥ 0.99 = Übersteuerung wahrscheinlich
  dauer_min_s: 5,
};

// ───────────────────────────────────────────────────────────── Parser (rein, testbar)

/** JSON aus <script id="…">…</script>. null, wenn der Block fehlt oder kaputt ist. */
export function jsonAusScript(html, id) {
  if (typeof html !== 'string') return null;
  const re = new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`);
  const m = re.exec(html);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Unix-Sekunden aus der Video-ID (die oberen 32 Bit sind die Erstellzeit). */
export function zeitAusId(id) {
  try { return Number(BigInt(String(id)) >> 32n); } catch { return null; }
}

function zuerich(sek) {
  if (!sek) return null;
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit',
    month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(sek * 1000));
}
const zahl = v => (v === undefined || v === null || v === '' ? null : Number(v));

/** Profil + Anmeldesignal aus der Profilseite. */
export function profilAusHtml(html) {
  const d = jsonAusScript(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__');
  const s = d && d.__DEFAULT_SCOPE__;
  if (!s) return { ok: false, grund: 'Datenblock __UNIVERSAL_DATA_FOR_REHYDRATION__ fehlt' };
  const ud = s['webapp.user-detail'] || {};
  const ui = ud.userInfo || {};
  const u = ui.user || {};
  const st = ui.stats || ui.statsV2 || {};
  const ac = s['webapp.app-context'];
  // Anmeldesignal aus dem Server-HTML: abgemeldet fehlt `user` ganz (gemessen 23.09., curl).
  const acUser = ac && ac.user && (ac.user.uniqueId || ac.user.uid) ? ac.user : null;
  return {
    ok: !!u.uniqueId,
    grund: u.uniqueId ? null : `userInfo leer (statusCode ${ud.statusCode})`,
    profil: u.uniqueId ? {
      uniqueId: u.uniqueId, nickname: u.nickname, bio: u.signature || '',
      bioLink: (u.bioLink && (u.bioLink.link || u.bioLink.url)) || null,
      business: !!(u.commerceUserInfo && u.commerceUserInfo.commerceUser),
      verifiziert: !!u.verified, privat: !!u.privateAccount,
      follower: zahl(st.followerCount), folgt: zahl(st.followingCount),
      likes_gesamt: zahl(st.heartCount ?? st.heart), videos: zahl(st.videoCount),
    } : null,
    ssr_angemeldet: ac ? (acUser ? true : false) : null,
    ssr_angemeldet_als: acUser ? (acUser.uniqueId || null) : null,
  };
}

/** Die neuesten Videos aus der Creator-Einbettung. */
export function videolisteAusEmbed(html, profil = PROFIL) {
  const d = jsonAusScript(html, '__FRONTITY_CONNECT_STATE__');
  const data = d && d.source && d.source.data;
  if (!data) return { ok: false, grund: 'Datenblock __FRONTITY_CONNECT_STATE__ fehlt', videos: [] };
  const key = Object.keys(data).find(k => k.replace(/\/$/, '') === `/embed/@${profil}`)
           || Object.keys(data).find(k => k.startsWith('/embed/@'));
  const e = key ? data[key] : null;
  if (!e || !Array.isArray(e.videoList)) return { ok: false, grund: 'videoList fehlt in der Einbettung', videos: [] };
  const videos = e.videoList.map(v => ({
    id: String(v.id), desc: v.desc || '', aufrufe_embed: zahl(v.playCount),
    erstellt_s: zeitAusId(v.id),
  })).sort((a, b) => (b.erstellt_s || 0) - (a.erstellt_s || 0));
  return { ok: true, videos, embed_follower: zahl(e.userInfo && e.userInfo.followerCount) };
}

/** Alles Lesbare zu EINEM Video aus seiner Videoseite. */
export function videoAusHtml(html) {
  const d = jsonAusScript(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__');
  const s = d && d.__DEFAULT_SCOPE__;
  const vd = s && s['webapp.video-detail'];
  const it = vd && vd.itemInfo && vd.itemInfo.itemStruct;
  if (!it || !it.id) return { ok: false, grund: vd ? `itemStruct leer (statusCode ${vd.statusCode} ${vd.statusMsg || ''})`.trim()
                                                    : 'Datenblock webapp.video-detail fehlt' };
  const st = it.statsV2 || it.stats || {};
  const mu = it.music || {};
  const vi = it.video || {};
  const stufen = (vi.bitrateInfo || []).map(b => ({ w: zahl(b.PlayAddr && b.PlayAddr.Width),
                                                    h: zahl(b.PlayAddr && b.PlayAddr.Height) }))
                                       .filter(x => x.w && x.h);
  const max = stufen.reduce((a, x) => (x.w * x.h > a.w * a.h ? x : a), { w: 0, h: 0 });
  const vol = vi.volumeInfo || {};
  const pc = it.penaltyContext || {};
  return {
    ok: true,
    id: String(it.id),
    erstellt_s: zahl(it.createTime) || zeitAusId(it.id),
    desc: it.desc || '',
    hashtags: (it.challenges || []).map(c => c.title).filter(Boolean),
    aufrufe: zahl(st.playCount), likes: zahl(st.diggCount), kommentare: zahl(st.commentCount),
    shares: zahl(st.shareCount), saves: zahl(st.collectCount),
    ton: {
      titel: mu.title || null, von: mu.authorName || null, eigener_ton: mu.original === true,
      kommerz_musik: mu.is_commerce_music === true, urheberrecht_markiert: mu.isCopyrighted === true,
      dauer_s: zahl(mu.duration),
      lautheit: zahl(vol.Loudness), peak: zahl(vol.Peak),
    },
    bild: {
      dauer_s: zahl(vi.duration),
      max_breite: max.w || null, max_hoehe: max.h || null,       // hochgeladene Auflösung
      ausgeliefert: vi.width && vi.height ? `${vi.width}x${vi.height}` : null,   // Web-Stufe, meist 540p
      stufen: stufen.length,
    },
    tiktok_themen: it.diversificationLabels || [],
    sprache: it.textLanguage || null,
    moderation: {
      privat: !!it.privateItem, geloescht: zahl(it.takeDown) || 0, verboten: !!it.isProhibited,
      in_pruefung: !!it.isReviewing, warnungen: (it.warnInfo || []).length,
      // undokumentierte Felder — nur als Vergleichswert, NICHT deuten
      roh_display_penalty_type: pc.display_penalty_type ?? null, roh_display_policy: pc.display_policy ?? null,
    },
    ki_markiert: it.IsAigc === true,
  };
}

// ───────────────────────────────────────────────────────────── Prüfregeln (Befunde je Video)

/** Liefert [{art, stufe, text}] — stufe 'fehler' (falsch/irreführend) oder 'hinweis'.
 *  jetzt_s nur für Tests; sonst die Uhr. */
export function befundeFuer(v, profil, jetzt_s = Math.floor(Date.now() / 1000)) {
  const b = [];
  const alter_h = v.erstellt_s ? (jetzt_s - v.erstellt_s) / 3600 : null;
  const desc = v.desc || '';
  // 1) «Link in Bio» ohne Link in der Bio. TikTok: Website-Link erst ab 1'000 Followern oder mit
  //    Verified Business Account (offizielle Hilfe, siehe dropship/TIKTOK-AGENT.md).
  if (/link\s*in\s*(der\s*)?bio/i.test(desc) && profil && !profil.bioLink)
    b.push({ art: 'link_in_bio_ohne_link', stufe: 'fehler',
             text: 'Caption verweist auf «Link in Bio», die Bio hat aber keinen klickbaren Link' });
  // 2) Versandschwelle. Wahr ist: gratis ab CHF 50.
  for (const m of desc.matchAll(/(gratis|kostenlos(?:er)?|free)[\s-]*(versand|lieferung|shipping)\s*(ab|über|ueber|from)?\s*(chf|fr\.?)?\s*(\d+(?:[.,]\d+)?)?/gi)) {
    const betrag = m[5] ? Number(m[5].replace(',', '.')) : null;
    if (betrag === null) b.push({ art: 'versand_ohne_schwelle', stufe: 'fehler',
                                  text: `«${m[0].trim()}» ohne «ab CHF ${ERWARTET.versand_ab_chf}» — klingt nach immer gratis` });
    else if (betrag !== ERWARTET.versand_ab_chf) b.push({ art: 'versand_schwelle_falsch', stufe: 'fehler',
                                  text: `Caption nennt CHF ${betrag}, gilt: gratis ab CHF ${ERWARTET.versand_ab_chf}` });
  }
  if (/versandkostenfrei|free\s+shipping(?!\s+(ab|from|over))/i.test(desc) && !/ab\s*chf\s*\d/i.test(desc))
    b.push({ art: 'versand_ohne_schwelle', stufe: 'fehler', text: '«versandkostenfrei» ohne Schwelle' });
  // 3) Auflösung — aus der höchsten ausgelieferten Stufe (= Upload), nicht aus der 540p-Webstufe.
  //    ⚠️ GEMESSEN 23.09.: das 2 h alte Cosmo-Dog-Video hatte erst 2 Stufen (max 576×1024), die
  //    Quelldatei ist 1080×1920 (ffmpeg). Das P62-Video (14 h alt) hatte 5 Stufen bis 1080×1920.
  //    TikTok rechnet die höheren Stufen also nach — ein junges Video ist KEIN Auflösungsfehler.
  if (v.bild && v.bild.max_hoehe && v.bild.max_breite) {
    if (v.bild.max_hoehe < ERWARTET.hoehe || v.bild.max_breite < ERWARTET.breite) {
      if (alter_h !== null && alter_h < 24)
        b.push({ art: 'aufloesung_noch_offen', stufe: 'hinweis',
                 text: `erst ${v.bild.stufen} Stufe(n), max ${v.bild.max_breite}×${v.bild.max_hoehe} — Video ${Math.round(alter_h)} h alt, TikTok rechnet evtl. noch; morgen nachmessen` });
      else
        b.push({ art: 'aufloesung_unter_1080x1920', stufe: 'fehler',
                 text: `höchste Stufe ${v.bild.max_breite}×${v.bild.max_hoehe}, erwartet ${ERWARTET.breite}×${ERWARTET.hoehe}` });
    }
    const r = v.bild.max_hoehe / v.bild.max_breite;
    if (Math.abs(r - 16 / 9) > 0.02)
      b.push({ art: 'format_nicht_9zu16', stufe: 'fehler', text: `Seitenverhältnis ${v.bild.max_breite}:${v.bild.max_hoehe}` });
  } else if (v.bild) b.push({ art: 'aufloesung_unbekannt', stufe: 'hinweis', text: 'bitrateInfo fehlt — Upload-Auflösung nicht lesbar' });
  // 4) Ton — TikToks eigene Messung.
  const t = v.ton || {};
  if (t.lautheit === null || t.lautheit === undefined) b.push({ art: 'ton_unbekannt', stufe: 'hinweis', text: 'volumeInfo fehlt' });
  else if (t.lautheit <= ERWARTET.lufs_stumm) b.push({ art: 'ton_stumm', stufe: 'fehler', text: `Lautheit ${t.lautheit} — praktisch kein Ton` });
  else if (t.lautheit < ERWARTET.lufs_min) b.push({ art: 'ton_zu_leise', stufe: 'fehler', text: `Lautheit ${t.lautheit} < ${ERWARTET.lufs_min}` });
  else if (t.lautheit > ERWARTET.lufs_max) b.push({ art: 'ton_zu_laut', stufe: 'fehler', text: `Lautheit ${t.lautheit} > ${ERWARTET.lufs_max}` });
  if (t.peak !== null && t.peak !== undefined && t.peak >= ERWARTET.peak_max)
    b.push({ art: 'ton_uebersteuert', stufe: 'hinweis', text: `Peak ${t.peak}` });
  // Eigener Originalton mit isCopyrighted=true ist KEIN Problem (gemessen: 4 eigene Juni/Juli-Töne
  // tragen es) — nur ein FREMDER, markierter Ton ist einen Blick wert.
  if (t.urheberrecht_markiert && !t.eigener_ton)
    b.push({ art: 'ton_fremd_geschuetzt', stufe: 'hinweis', text: `fremder Ton «${t.titel}» von ${t.von || '?'} ist als geschützt markiert` });
  // 5) Dauer
  if (v.bild && v.bild.dauer_s !== null && v.bild.dauer_s < ERWARTET.dauer_min_s)
    b.push({ art: 'zu_kurz', stufe: 'hinweis', text: `${v.bild.dauer_s} s` });
  // 6) Moderation
  const mo = v.moderation || {};
  if (mo.privat || mo.geloescht || mo.verboten || mo.in_pruefung || mo.warnungen)
    b.push({ art: 'moderation', stufe: 'fehler', text: JSON.stringify({ privat: mo.privat, geloescht: mo.geloescht,
             verboten: mo.verboten, in_pruefung: mo.in_pruefung, warnungen: mo.warnungen }) });
  // 7) Sprache
  if (v.sprache && v.sprache !== 'de') b.push({ art: 'sprache', stufe: 'hinweis', text: `TikTok erkennt Sprache «${v.sprache}»` });
  // 8) Mode-Hashtags auf Nicht-Mode — entschieden an TikToks EIGENER Einordnung, nicht an einer Vermutung.
  // ⚠️ nicht «style»: das traf #luxestyle und #lifestyle (erster Lauf 23.09., 2 Fehlalarme).
  const modeTags = (v.hashtags || []).filter(h => /fashion|ootd|outfit/i.test(h));
  const themen = (v.tiktok_themen || []).join(' ');
  if (modeTags.length && themen && !/fashion|beauty|style|clothing|outfit/i.test(themen))
    b.push({ art: 'hashtag_passt_nicht', stufe: 'hinweis',
             text: `#${modeTags.join(' #')} auf einem Video, das TikTok als «${(v.tiktok_themen || [])[0]}» einordnet` });
  return b;
}

/** Anmeldung aus zwei unabhängigen Signalen: Server-HTML (app-context.user) und Seite (Knöpfe). */
export function anmeldung(ssr, dom) {
  const a = ssr === true || ssr === false ? ssr : null;
  const b = dom ? (dom.loginKnopf ? false : (dom.profilIcon ? true : null)) : null;
  if (a !== null && b !== null && a !== b) return { angemeldet: null, grund: `widersprüchlich (Server ${a}, Seite ${b})` };
  const w = a !== null ? a : b;
  return { angemeldet: w, grund: w === null ? 'kein Signal' : (a !== null && b !== null ? 'Server + Seite' : a !== null ? 'nur Server-HTML' : 'nur Seite') };
}

const median = xs => { const s = xs.filter(x => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null;
  const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

// ───────────────────────────────────────────────────────────── Sammeln (mit beliebigem «hole»)

/**
 * hole(url, {dom}) → { status, url, html, text, dom? }. Browser (Agent) oder curl (CLI) — der
 * Parser ist derselbe, damit eine Messung aus der Cloud und eine vom Server vergleichbar sind.
 */
export async function sammeln(hole, { anzahl = 10, profil = PROFIL, pause_ms = 1500, quelle = '?' } = {}) {
  const erg = { erstellt: new Date().toISOString(), quelle, profil_handle: profil,
                profil: null, agent_anmeldung: null, videos: [], summe: null, befunde_gesamt: {},
                probleme: [], grenzen: [
                  'Nur öffentliche Zahlen (Aufrufe/Likes/Kommentare/Shares/Saves). Wiedergabezeit, Zuschauerbindung und Herkunft: Metricool /v2/analytics/posts/tiktok (mit Verzug) oder TikTok Studio (Anmeldung).',
                  'Die Creator-Einbettung liefert höchstens 10 Videos.',
                  'Lautheit/Peak sind TikToks eigene Messung, nicht ffmpeg-LUFS.',
                ] };
  const warte = () => new Promise(r => setTimeout(r, pause_ms));
  const pruefeSeite = (r, was) => {
    if (!r) return `${was}: keine Antwort`;
    const kaputt = ist_fehlerseite(r.status, r.url);
    if (kaputt) return `${was}: ${kaputt}`;
    if (ist_anmeldeseite(r.url)) return `${was}: auf Anmeldung umgeleitet (${r.url})`;
    if (r.text && ist_wandtext(r.text) && !/__UNIVERSAL_DATA|__FRONTITY/.test(r.html || '')) return `${was}: Bot-Wand`;
    return null;
  };

  // 1) Profil (+ Anmeldesignal)
  let r = null;
  try { r = await hole(`https://www.tiktok.com/@${profil}`, { dom: true }); } catch (e) { erg.probleme.push(`Profil: ${String(e.message || e).slice(0, 160)}`); }
  const p1 = r ? pruefeSeite(r, 'Profil') : null;
  if (p1) erg.probleme.push(p1);
  if (r && !p1) {
    const p = profilAusHtml(r.html);
    if (p.ok) erg.profil = p.profil; else erg.probleme.push(`Profil: ${p.grund}`);
    erg.agent_anmeldung = { ...anmeldung(p.ssr_angemeldet, r.dom), als: p.ssr_angemeldet_als,
                            signale: { server_html: p.ssr_angemeldet, seite: r.dom || null } };
  }
  await warte();

  // 2) Liste der neuesten Videos
  let liste = [];
  try {
    const e = await hole(`https://www.tiktok.com/embed/@${profil}`, { dom: false });
    const pe = pruefeSeite(e, 'Einbettung');
    if (pe) erg.probleme.push(pe);
    else { const l = videolisteAusEmbed(e.html, profil); if (l.ok) liste = l.videos; else erg.probleme.push(`Einbettung: ${l.grund}`); }
  } catch (e) { erg.probleme.push(`Einbettung: ${String(e.message || e).slice(0, 160)}`); }
  liste = liste.slice(0, Math.max(1, Math.min(10, Number(anzahl) || 10)));

  // 3) Jede Videoseite
  for (const kurz of liste) {
    await warte();
    const zeile = { id: kurz.id, url: `https://www.tiktok.com/@${profil}/video/${kurz.id}`,
                    erstellt_utc: kurz.erstellt_s ? new Date(kurz.erstellt_s * 1000).toISOString() : null,
                    erstellt_ch: zuerich(kurz.erstellt_s), aufrufe_embed: kurz.aufrufe_embed };
    try {
      const v = await hole(zeile.url, { dom: false });
      const pv = pruefeSeite(v, `Video ${kurz.id}`);
      const d = pv ? { ok: false, grund: pv } : videoAusHtml(v.html);
      if (d.ok) {
        const inter = (d.likes || 0) + (d.kommentare || 0) + (d.shares || 0);
        Object.assign(zeile, d, { interaktion_pro_1000: d.aufrufe ? Math.round(inter / d.aufrufe * 10000) / 10 : null,
                                  quelle: 'videoseite' });
      } else {
        // Rückfall: Caption + Aufrufe aus der Einbettung — ohne Likes/Ton. Ehrlich markiert.
        Object.assign(zeile, { desc: kurz.desc, aufrufe: kurz.aufrufe_embed, quelle: 'nur-einbettung', fehler: d.grund });
      }
    } catch (e) {
      Object.assign(zeile, { desc: kurz.desc, aufrufe: kurz.aufrufe_embed, quelle: 'nur-einbettung',
                             fehler: String(e.message || e).slice(0, 160) });
    }
    zeile.befunde = befundeFuer(zeile, erg.profil);
    for (const b of zeile.befunde) erg.befunde_gesamt[b.art] = (erg.befunde_gesamt[b.art] || 0) + 1;
    delete zeile.ok;
    erg.videos.push(zeile);
  }

  const voll = erg.videos.filter(v => v.quelle === 'videoseite');
  const s = (k) => voll.reduce((a, v) => a + (v[k] || 0), 0);
  const bestes = [...erg.videos].sort((a, b) => (b.aufrufe || 0) - (a.aufrufe || 0))[0];
  erg.summe = {
    videos: erg.videos.length, mit_vollen_zahlen: voll.length,
    aufrufe: erg.videos.reduce((a, v) => a + (v.aufrufe || 0), 0),
    aufrufe_median: median(erg.videos.map(v => v.aufrufe)),
    likes: s('likes'), kommentare: s('kommentare'), shares: s('shares'), saves: s('saves'),
    bestes: bestes ? { id: bestes.id, aufrufe: bestes.aufrufe, erstellt_ch: bestes.erstellt_ch,
                       anfang: (bestes.desc || '').slice(0, 60) } : null,
    videos_mit_fehler_befund: erg.videos.filter(v => v.befunde.some(b => b.stufe === 'fehler')).length,
  };
  return erg;
}

export function zusammenfassung(erg) {
  const p = erg.profil;
  const a = erg.agent_anmeldung;
  const teile = [];
  if (p) teile.push(`@${p.uniqueId}: ${p.follower} Follower, ${p.videos} Videos, Bio-Link ${p.bioLink ? 'ja' : 'NEIN'}, ${p.business ? 'Business' : 'Privatkonto'}`);
  if (a) teile.push(`Browser angemeldet: ${a.angemeldet === null ? 'unklar' : a.angemeldet ? 'ja' : 'nein'} (${a.grund})`);
  const su = erg.summe || {};
  teile.push(`${su.videos || 0} Videos gelesen (${su.mit_vollen_zahlen || 0} mit vollen Zahlen), ${su.aufrufe || 0} Aufrufe, Median ${su.aufrufe_median ?? '–'}, ${su.likes || 0} Likes, ${su.kommentare || 0} Kommentare`);
  const bf = Object.entries(erg.befunde_gesamt).map(([k, n]) => `${k} ${n}×`).join(', ');
  teile.push(`Befunde: ${bf || 'keine'}`);
  if (erg.probleme.length) teile.push(`Probleme: ${erg.probleme.join(' | ')}`);
  return teile.join(' · ');
}

// ───────────────────────────────────────────────────────────── Agent (Hetzner): Browser-«hole»

function holeMitBrowser(ctx) {
  return async (url, { dom = false } = {}) => {
    const seite = await ctx.newPage();
    try {
      // Bilder/Videos/Schriften nicht laden: spart Zeit, und ein Video soll hier nicht abspielen.
      // Die Route gilt nur für DIESE Seite — der Rest des Agenten-Laufs bleibt unberührt.
      // fallback() statt continue(): alles Übrige geht an weitere Routen (falls vorhanden) bzw. ans Netz.
      await seite.route('**/*', rt => (['image', 'media', 'font'].includes(rt.request().resourceType()) ? rt.abort() : rt.fallback()));
      const antwort = await seite.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await seite.waitForTimeout(dom ? 3500 : 1200);
      // Der Datenblock steht im Server-HTML. Die Antwort selbst ist die ehrlichste Quelle;
      // nur wenn sie ihn nicht trägt (z. B. Weiterleitung), wird das gerenderte DOM gelesen.
      let html = '';
      try { html = antwort ? await antwort.text() : ''; } catch {}
      if (!/__UNIVERSAL_DATA_FOR_REHYDRATION__|__FRONTITY_CONNECT_STATE__/.test(html)) html = await seite.content().catch(() => html);
      const text = await seite.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 1500)).catch(() => '');
      let domSignal = null;
      if (dom) {
        // NUR schauen, nichts anfassen: gibt es einen «Anmelden»-Knopf, oder ein eigenes Profil-Symbol?
        domSignal = await seite.evaluate(() => {
          const sichtbar = el => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const knopfText = [...document.querySelectorAll('button, a')].some(el => sichtbar(el)
            && /^\s*(Anmelden|Log in|Einloggen)\s*$/i.test(el.textContent || ''));
          return {
            loginKnopf: sichtbar(document.querySelector('[data-e2e="top-login-button"]'))
                     || sichtbar(document.querySelector('[data-e2e="nav-login-button"]')) || knopfText,
            profilIcon: sichtbar(document.querySelector('[data-e2e="profile-icon"]')),
            bearbeitenKnopf: sichtbar(document.querySelector('[data-e2e="edit-profile-entrance"]')),
          };
        }).catch(() => null);
      }
      return { status: antwort ? antwort.status() : null, url: seite.url(), html, text, dom: domSignal };
    } finally { await seite.close().catch(() => {}); }
  };
}

export default async function ({ ctx, auftrag = {}, REPO, ERGEBNIS }) {
  const erg = await sammeln(holeMitBrowser(ctx), { anzahl: auftrag.anzahl || 10, quelle: 'hetzner-agent (Chromium-Profil)' });
  const datei = path.join(ERGEBNIS, `${auftrag.id || 'tiktok-statistik'}.json`);
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, JSON.stringify(erg, null, 2) + '\n');
  // Nichts gelesen = kein Erfolg. Die Messungen bleiben als Teilergebnis erhalten (Runner-Regel 17.09.).
  if (!erg.profil && !erg.videos.length) {
    const e = new Error(`nichts lesbar — ${erg.probleme.join(' | ') || 'ohne Grund'}`);
    e.umgeleitet = true; e.teilergebnis = { datei: path.relative(REPO, datei), probleme: erg.probleme };
    throw e;
  }
  return {
    zusammenfassung: zusammenfassung(erg),
    datei: path.relative(REPO, datei),
    agent_angemeldet: erg.agent_anmeldung ? erg.agent_anmeldung.angemeldet : null,
    videos: erg.videos.map(v => ({ id: v.id, ch: v.erstellt_ch, aufrufe: v.aufrufe, likes: v.likes ?? null,
                                   kommentare: v.kommentare ?? null, befunde: v.befunde.map(b => b.art) })),
  };
}

// ───────────────────────────────────────────────────────────── CLI: curl-Modus + Selbsttest

function holeMitCurl(url) {
  const out = execFileSync('curl', ['-sS', '-L', '--max-time', '40', '--compressed', '-A', UA,
    '-H', 'Accept-Language: de-CH,de;q=0.9', '-w', '\n__META__%{http_code} %{url_effective}', url],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = out.lastIndexOf('\n__META__');
  const [code, ...rest] = out.slice(i + 9).trim().split(' ');
  const html = out.slice(0, i);
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500);
  return { status: Number(code) || null, url: rest.join(' ') || url, html, text, dom: null };
}

function selbsttest() {
  let fehler = 0;
  const ok = (bed, was) => { console.log(`${bed ? '✓' : '✗'} ${was}`); if (!bed) fehler++; };
  const arten = (v, p) => befundeFuer(v, p).map(b => b.art);
  const sauber = { desc: 'Kennst du das? CHF 29.90 · Gratis Versand ab CHF 50 · Klarna & TWINT 🔗 luxestyle.ch/products/x',
    hashtags: ['schweiz'], tiktok_themen: ['Tech Products & Infos'], sprache: 'de',
    bild: { dauer_s: 11, max_breite: 1080, max_hoehe: 1920 }, ton: { lautheit: -15.6, peak: 0.61 }, moderation: {} };
  const ohneLink = { bioLink: null }, mitLink = { bioLink: 'https://luxestyle.ch' };
  ok(arten(sauber, ohneLink).length === 0, 'sauberer Post → 0 Befunde');
  ok(arten({ ...sauber, desc: sauber.desc + ' (Link in Bio)' }, ohneLink).includes('link_in_bio_ohne_link'), '«Link in Bio» ohne Bio-Link → Befund');
  ok(!arten({ ...sauber, desc: sauber.desc + ' (Link in Bio)' }, mitLink).includes('link_in_bio_ohne_link'), 'Kanarienvogel: «Link in Bio» MIT Bio-Link → kein Befund');
  ok(arten({ ...sauber, desc: 'Gratis Versand ab CHF 45' }, ohneLink).includes('versand_schwelle_falsch'), 'CHF 45 → Schwelle falsch');
  ok(arten({ ...sauber, desc: 'Gratis Versand! Jetzt bestellen' }, ohneLink).includes('versand_ohne_schwelle'), '«Gratis Versand» ohne Betrag → Befund');
  ok(!arten({ ...sauber, desc: 'Gratis-Versand ab CHF 50' }, ohneLink).some(a => a.startsWith('versand')), 'Kanarienvogel: «Gratis-Versand ab CHF 50» → kein Befund');
  ok(arten({ ...sauber, bild: { dauer_s: 11, max_breite: 720, max_hoehe: 1280 } }, ohneLink).includes('aufloesung_unter_1080x1920'), '720×1280 → Auflösung zu tief');
  ok(arten({ ...sauber, bild: { dauer_s: 11, max_breite: 1080, max_hoehe: 1080 } }, ohneLink).includes('format_nicht_9zu16'), '1080×1080 → nicht 9:16');
  ok(arten({ ...sauber, ton: { lautheit: -31, peak: 0.1 } }, ohneLink).includes('ton_zu_leise'), '-31 LUFS → zu leise');
  ok(arten({ ...sauber, ton: { lautheit: -70, peak: 0 } }, ohneLink).includes('ton_stumm'), '-70 → stumm');
  ok(arten({ ...sauber, ton: { lautheit: -6, peak: 1 } }, ohneLink).includes('ton_zu_laut'), '-6 → zu laut');
  ok(arten({ ...sauber, hashtags: ['ootdschweiz'] }, ohneLink).includes('hashtag_passt_nicht'), '#ootd auf Technik → Hinweis');
  ok(!arten({ ...sauber, hashtags: ['luxestyle', 'lifestyle'] }, ohneLink).includes('hashtag_passt_nicht'), 'Kanarienvogel: #luxestyle #lifestyle auf Technik → kein Hinweis');
  const jung = { ...sauber, erstellt_s: 1_000_000, bild: { dauer_s: 11, max_breite: 576, max_hoehe: 1024, stufen: 2 } };
  ok(befundeFuer(jung, ohneLink, 1_000_000 + 2 * 3600).map(b => b.art).includes('aufloesung_noch_offen'), 'junges Video 576p → «noch offen», kein Fehler');
  ok(befundeFuer(jung, ohneLink, 1_000_000 + 48 * 3600).map(b => b.art).includes('aufloesung_unter_1080x1920'), 'dasselbe nach 48 h → Fehler');
  ok(!arten({ ...sauber, ton: { lautheit: -14, peak: 0.8, urheberrecht_markiert: true, eigener_ton: true } }, ohneLink).length, 'Kanarienvogel: eigener Ton mit isCopyrighted → kein Befund');
  ok(arten({ ...sauber, ton: { lautheit: -14, peak: 0.8, urheberrecht_markiert: true, eigener_ton: false, titel: 'Hit' } }, ohneLink).includes('ton_fremd_geschuetzt'), 'fremder geschützter Ton → Hinweis');
  ok(!arten({ ...sauber, hashtags: ['ootdschweiz'], tiktok_themen: ['Fashion'] }, ohneLink).includes('hashtag_passt_nicht'), 'Kanarienvogel: #ootd auf Mode → kein Hinweis');
  ok(arten({ ...sauber, moderation: { in_pruefung: true } }, ohneLink).includes('moderation'), 'in Prüfung → Befund');
  ok(anmeldung(false, { loginKnopf: true }).angemeldet === false, 'Anmeldung: Server nein + Knopf → nein');
  ok(anmeldung(true, { loginKnopf: false, profilIcon: true }).angemeldet === true, 'Anmeldung: Server ja + Icon → ja');
  ok(anmeldung(true, { loginKnopf: true }).angemeldet === null, 'Anmeldung: widersprüchlich → unklar (null)');
  ok(anmeldung(null, null).angemeldet === null, 'Anmeldung: kein Signal → unklar');
  ok(zeitAusId('7688585316826877216') === 1790138268, 'Zeit aus Video-ID (P62, 23.09. 04:37:48 UTC)');
  // Quelltext-Gegenprobe: in diesem Skript darf keine Handlung stehen, die etwas auslöst.
  const eigen = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('function selbsttest')[0];
  const verboten = eigen.match(/\.(click|dblclick|tap|fill|type|press|check|uncheck|selectOption|setInputFiles|dispatchEvent)\s*\(/g);
  ok(!verboten, `Quelltext ohne Klick/Tipp/Füll-Aufrufe${verboten ? ' — GEFUNDEN: ' + verboten.join(' ') : ''}`);
  console.log(fehler ? `\n✗ ${fehler} Prüfung(en) gescheitert` : '\n✓ alle Prüfungen bestanden');
  return fehler;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const wert = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  if (args.includes('--selbsttest')) process.exit(selbsttest() ? 1 : 0);
  if (!args.includes('--curl')) {
    console.log('Aufruf: --curl [--anzahl 10] [--out datei.json]  |  --selbsttest\n(Als Agenten-Auftrag lädt der Runner die default-Funktion.)');
    process.exit(2);
  }
  const erg = await sammeln(async (u) => holeMitCurl(u), { anzahl: Number(wert('--anzahl', 10)), quelle: 'curl (Cloud)' });
  const out = wert('--out', null);
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(erg, null, 2) + '\n'); }
  console.log(zusammenfassung(erg));
  for (const v of erg.videos) console.log(`  ${v.erstellt_ch || '?'}  ${String(v.aufrufe ?? '–').padStart(5)} Aufrufe  ${String(v.likes ?? '–').padStart(3)} ♥  ${String(v.kommentare ?? '–').padStart(2)} 💬  Ton: ${v.ton ? `${v.ton.titel} (${v.ton.lautheit})` : '–'}  ${v.bild ? `${v.bild.max_breite}×${v.bild.max_hoehe}` : ''}  ${v.befunde.map(b => b.art).join(',')}`);
  if (out) console.log(`→ ${out}`);
}
