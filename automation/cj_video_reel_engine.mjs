/* cj_video_reel_engine.mjs (v3, 11.10.2026: Schnitt, Hook und Fremdmaterial-Tor über automation/reel/schnitt.py, Stimme danach
 *   gelegt — make_reel.sh ist im Motor nicht mehr im Pfad) — CJ-Produktvideos → gebrandete 9:16-Reels → Reel-Queue.
 *
 * WARUM v2 (gemessen 22.09.): Die v1 suchte «tag:video-hit MIT VIDEO-media» — der Tag steht an JEDEM
 * Import, echte Videos hatten 144 von 34'824 Produkten; der Motor meldete seit Wochen «neue Reels: 0».
 * Dazu ist der Shopify-Dateispeicher voll (CDN-Upload «Verarbeitung FAILED»). Beides umgangen:
 *   · Quelle = CJ selbst: POST /product/queryVideosByProductId {productId} → videoUrl (Download braucht
 *     den Referer developers.cjdropshipping.com, sonst 403). Produkt-ID steckt in der SKU «CJ-<pid>».
 *   · Ablage = dieses (öffentliche) Repo unter social/reels/ — Instagram nimmt die raw.githubusercontent-
 *     Adresse an (Container FINISHED, 22.09. gemessen). Übergang bis zum Grow-Plan (~21.10.), dann CDN.
 *   · Qualitätsschwelle: ACTIVE, Preis ≥ 14.90, ≥ 2 Bilder, keine Kostüm-/Erotik-/Klingen-Titel,
 *     Kategorien bunt gemischt (balanceByCategory), nie ein Produkt zweimal (Ledger + CSV + Post-Ledger).
 *   · Optik/Text: Hook je Thema (lernt aus social/_lernen.json, wenn vorhanden), Titel zweizeilig,
 *     Caption Hook + Nutzen + Preis + CTA, Hashtags Kategorie + Konsens-Pool (SECOND-BRAIN).
 *   · Quittung NUR nach erfolgreichem Push (die Adresse muss erreichbar sein, bevor der Poster sie sieht).
 * ENV: BATCH=3 · SCAN=240 · DRY=1 (nur zeigen) · SHOPIFY_ADMIN_TOKEN oder /tmp/cj_shop_token.txt ·
 *      CJ_TOKEN oder /tmp/cj_token.json · STIMME_ANTEIL=0 (Anteil Reels mit Sprecherstimme; Vorgabe 0 = aus bis Betreiber-Entscheid, A/B)
 *   · Stimme (23.09.2026, Betreiber «Stimme auf hoechstem Niveau»; bisher Hausregel «ohne Voiceover»): je pid
 *     stabil per Hash entschieden, Sprechtext Hook + Name + (kurzer Nutzen) + Preis, automation/reel/voiceover.py
 *     (Schweizer edge-Stimme, piper als Notnagel), make_reel.sh duckt die Musik darunter. Merkmal im Verlauf
 *     social/_musik_verlauf.txt, Spalten 6/7 = «stimme:ja|nein» + Stimme/Grund. Messung: automation/music/STIMME.md.
 */
import fs from 'node:fs';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { nachlauf } from './eimer_etikette.mjs';
import { takt as cjTakt } from './cj_takt.mjs';
import { catKey, tagsFor, balanceByCategory } from './lib/reel-category.mjs';
import { hashtagText } from './lib/hashtags.mjs';
import { seen as postSeen, produktGepostet, preisAnzeige } from './post_guard.mjs';
import { reelBauen } from './reel/schnitt_motor.mjs';
import { PRAEP, kurzTitel, zeilen } from './lib/reel_titel.mjs';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const BATCH = parseInt(process.env.BATCH || '3', 10);
const SCAN = parseInt(process.env.SCAN || '240', 10);
const DRY = process.env.DRY === '1';
const FRAGEN = parseInt(process.env.FRAGEN || '200', 10);  // CJ-Anfragen je Lauf (Video-Quote gemessen 22.09.: 1 von 80 — die Importer haengten Videos nur bei cj_category_fill an)
const CSV = 'automation/reels_seed.csv';
const LEDGER = 'dropship/_cj_reel_gebaut.txt';            // pid → nur nach Erfolg
const KEINVIDEO = 'dropship/_cj_reel_kein_video.txt';      // pid → CJ hat kein Video (nicht nochmal fragen)
// 30.09.2026: der Motor prüfte nie gegen das Meisterwerk-Tor (meisterwerk_tor.py) — der Poster verwarf danach 14/14 Reels
// des Tages (HOOK < 3,0). Jetzt: Einstieg = bewegteste Sekunde der Quelle (reel/hook_start.py), fertiges Reel durchs Tor,
// Durchgefallene kommen nicht in die Queue, sondern hierher (pid\tdatum\tgründe) und werden nicht erneut gefragt.
const TOR_ABGELEHNT = 'dropship/_reel_tor_abgelehnt.txt';
// 11.10.2026: den Einstieg wählt jetzt schnitt.py selbst (Intro-Sperre, Hook-Fenster, Kick) — hook_start.py ist nicht mehr im Pfad.
function torPruefen(datei, preis) {
  const t = spawnSync('python3', ['automation/meisterwerk_tor.py', datei], { encoding: 'utf8', timeout: 240000, env: { ...process.env, PREIS_SOLL: preis.toFixed(2) } });
  let g = []; try { g = JSON.parse((t.stdout || '').trim().split('\n').pop()).gruende || []; } catch { g = [`nicht messbar: ${(t.stderr || '').slice(-120)}`]; }
  return { rc: t.status, gruende: g };
}
const MEDIEN = 'social/reels';
const BRANCH = 'claude/luxestyle-status-tztnn1';
const RAW = `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/${BRANCH}/${MEDIEN}/`;
const MUSIC = ['luxe-cinematic-house.wav', 'luxe-lounge-sax.wav', 'luxe-house1.wav', 'luxe-hype-pro.mp3', 'luxe-liquid-dnb.wav', 'luxe-orchestra.wav'];
// 24.09.2026 Betreiber «fairy tail theme anime musik das finde ich super»: eigenes Stück luxe-celtic-epic.wav
// (keltisch-episch, Melodie neu komponiert, produce/build_celtic_epic_midi.py) in Gadget/Fitness/Haustier/Kinder.
// 27.09.2026 «vielleicht kannst du musik noch besser machen»: zweites Stück in der gelobten Richtung, luxe-anime-opening.wav
// (Anime-Opening/J-Rock, 176 BPM, kein Intro), in Mode/Gadget/Fitness/Home/Küche/Haustier/Kinder — ersetzt dort den
// gesperrten Sax-Platz; Beauty/Schmuck bleiben ruhig (Premium/Cinematic). Dazu luxe-dnb-drive.wav (Dancefloor-DnB, Drop ab 0 s)
// in Gadget/Fitness/Mode (Betreiber «drum and base?») — am selben Abend gesperrt (klingt billig, GM-SoundFont).
// Danach luxe-epic-anime.wav (vidIQ, echte Instrumente; Betreiber «musik ist viel besser geworden») vorn in
// Gadget/Fitness/Haustier/Kinder/Mode.
// Musik v2 (23.09.2026, Betreiber «verbessere musik»): Stück nach Warengruppe statt pid % 6, alle 12 eigenen Stücke
// (die drei Kevin-MacLeod-Stücke bleiben draussen — CC BY verlangt eine Quellenangabe in jeder Caption), Einstieg am
// gemessenen Energie-Fenster (automation/music/_einstiege.json, automation/music/einstiege.py) statt beim Intro,
// keine Wiederholung unter den letzten drei Reels. Verlauf in social/_musik_verlauf.txt (auch für die Lernschleife).
const STIMMUNG = {
  beauty:   ['luxe-lounge-sax.wav', 'luxe-premium.wav', 'luxe-cinematic-house.wav', 'luxe-house2.wav'],
  schmuck:  ['luxe-premium.wav', 'luxe-lounge-sax.wav', 'luxe-cinematic-house.wav', 'luxe-orchestra.wav'],
  mode:     ['luxe-epic-anime.wav', 'luxe-anime-opening.wav', 'luxe-dnb-drive.wav', 'luxe-house1.wav', 'luxe-house2.wav', 'luxe-cinematic-house.wav', 'luxe-lounge-sax.wav', 'luxe-hype-pro.mp3'],
  gadget:   ['luxe-epic-anime.wav', 'luxe-celtic-epic.wav', 'luxe-anime-opening.wav', 'luxe-dnb-drive.wav', 'luxe-hype-pro.mp3', 'luxe-liquid-dnb-electronic.wav', 'luxe-hype3.wav', 'luxe-liquid-dnb.wav', 'luxe-hype1.wav'],
  fitness:  ['luxe-epic-anime.wav', 'luxe-anime-opening.wav', 'luxe-dnb-drive.wav', 'luxe-celtic-epic.wav', 'luxe-hype1.wav', 'luxe-hype3.wav', 'luxe-liquid-dnb-electronic.wav', 'luxe-hype-pro.mp3'],
  home:     ['luxe-anime-opening.wav', 'luxe-house1.wav', 'luxe-lounge-sax.wav', 'luxe-premium.wav', 'luxe-cinematic-house.wav'],
  kueche:   ['luxe-anime-opening.wav', 'luxe-house2.wav', 'luxe-house1.wav', 'luxe-lounge-sax.wav', 'luxe-hype2.wav'],
  haustier: ['luxe-epic-anime.wav', 'luxe-celtic-epic.wav', 'luxe-anime-opening.wav', 'luxe-hype2.wav', 'luxe-house2.wav', 'luxe-cinematic-house.wav', 'luxe-house1.wav'],
  kinder:   ['luxe-epic-anime.wav', 'luxe-celtic-epic.wav', 'luxe-anime-opening.wav', 'luxe-hype2.wav', 'luxe-house2.wav', 'luxe-orchestra.wav', 'luxe-cinematic-house.wav'],
};
// 28.09.2026 Betreiber: «musik jetzt nur epischer guter sound instrumental orchester odr so» → JEDE Warengruppe nur noch
// epische Orchester-Stücke. Blind bewertet (Gemini, Orchester/episch/Klang echt 0–10): adventure-uplift 10/10/10,
// epic-anime 9/9/9, orchestra 9/9/8. Durchgefallen: anime-battle (Metal), celtic-rock, fashion-elegant (Synth), celtic-epic («Polka»).
// Die alten Pools bleiben oben stehen (Rückweg), gelten aber nicht, solange EPISCH_NUR gilt.
// 05.10.2026 Betreiber «immer das selbe musik passt nicht mehr» (3 Stücke rotierten: 22/20/18 der letzten 60 Reels) →
// 6 neue epische Stücke (Google Lyria 3.5 über die Gemini-API, blind episch/Klang ≥ 8, kein Gesang) dazu; Sperre der
// letzten 5 statt 3 Reels. Quelle/Masse: automation/music/CREDITS.txt (LIZENZIERT).
const EPISCH = ['luxe-adventure-uplift.wav', 'luxe-epic-anime.wav', 'luxe-orchestra.wav', 'luxe-epic-trailer.wav', 'luxe-epic-hybrid.wav',
  'luxe-epic-hero.wav', 'luxe-epic-fantasy.wav', 'luxe-epic-winter.wav', 'luxe-epic-elegant.wav'];
const EPISCH_NUR = true;
if (EPISCH_NUR) { for (const k of Object.keys(STIMMUNG)) STIMMUNG[k] = [...EPISCH]; MUSIC.splice(0, MUSIC.length, ...EPISCH); }
// 26.09.2026: Sperrliste automation/music/_gesperrt.txt (Betreiber mag luxe-lounge-sax nicht). Gilt fuer JEDE Wahl unten —
// Warengruppen-Pool, Gesamt-Pool und den alten MUSIC-Rueckfall.
const GESPERRT = new Set((() => { try { return fs.readFileSync('automation/music/_gesperrt.txt', 'utf8').split('\n')
  .filter(z => z.trim() && !z.startsWith('#')).map(z => z.split('\t')[0].trim()); } catch { return []; } })());
for (const k of Object.keys(STIMMUNG)) STIMMUNG[k] = STIMMUNG[k].filter(m => !GESPERRT.has(m));
for (let i = MUSIC.length - 1; i >= 0; i--) if (GESPERRT.has(MUSIC[i])) MUSIC.splice(i, 1);
const ALLE_EIGENEN = [...new Set(Object.values(STIMMUNG).flat())];
const VERLAUF = 'social/_musik_verlauf.txt';
function musikWahl(th, pid) {
  let ein = {}; try { ein = JSON.parse(fs.readFileSync('automation/music/_einstiege.json', 'utf8')); } catch {}
  const letzte = (fs.existsSync(VERLAUF) ? fs.readFileSync(VERLAUF, 'utf8').trim().split('\n') : []).slice(-5).map(z => z.split('\t')[1]);
  const pool = (STIMMUNG[th] || ALLE_EIGENEN).filter(m => fs.existsSync('automation/music/' + m));
  const frei = pool.filter(m => !letzte.includes(m));
  const wahl = (frei.length ? frei : pool.length ? pool : MUSIC)[num(pid) % (frei.length || pool.length || MUSIC.length)];
  const st = (ein[wahl] && ein[wahl].einstiege) || [0];
  const start = st[Math.floor(num(pid) / 7) % st.length] || 0;
  return { datei: wahl, start };
}
// Verlauf-Zeile: Zeit · Musik · Einstieg · Thema · Reel-ID · stimme:ja|nein · Stimme (bei ja) bzw. Grund (anteil|fehler)
function musikMerken(id, m, th, st = { ja: false, grund: 'anteil' }) {
  try { fs.appendFileSync(VERLAUF, `${new Date().toISOString()}\t${m.datei}\t${m.start}\t${th}\t${id}\tstimme:${st.ja ? 'ja' : 'nein'}\t${st.ja ? st.stimme : st.grund || ''}\n`); } catch {}
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 23.09.2026 19:40: Vorgabe 0 (opt-in). Die Stimme ist gebaut und gemessen, aber (a) der beste Klang (edge-tts) ist ein
// inoffizieller Microsoft-Dienst ohne Werbelizenz, (b) nutzen() sprach abgeschnittene Beschreibungen («… u..»). Live erst nach
// Betreiber-Entscheid: Azure-Schluessel (gleiche Schweizer Stimme, lizenzsauber) oder ausdrueckliches Ja zu piper (CC0).
const STIMME_ANTEIL = Math.max(0, Math.min(1, parseFloat(process.env.STIMME_ANTEIL ?? '0') || 0));
// pid → stabile Zahl (auch fuer UUID-pids wie F5BA858E-…; GEMESSEN 22.09.: Number(...) gab NaN → Hook «undefined», Musik «undefined»)
const num = p => { let h = 0; for (const c of String(p)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// 13.10.2026 (Reel-Nachschub R1, GEMESSEN): 146 aktive Produkte mit sicherem CJ-Video (Index isVideo=1) galten als
// «nicht-im-shop», weil ihre SKU die Varianten-Form «CJ-CJxx…» hat und der Motor nur `sku:CJ-<pid>` suchte. Darum jetzt
// zwei Schlüssel je Kandidat:
//   k.pid   = KENNUNG = Shop-SKU ohne «CJ-», bis zum ersten Zeichen ausserhalb [0-9A-Za-z-] (also auch bis zum Leerzeichen).
//             Gilt für Queue-ID cjreel-<Kennung>, Dateiname reel_<Kennung>.mp4 und die Ledger — alle Poster suchen das
//             Produkt mit `sku:CJ-<Kennung>` (meta_reel_post / metricool_tiktok_post / ig_aufraeumen), mit der echten pid
//             fänden sie 0 Produkte und verwürfen das Reel als «produkt-nicht-aktiv».
//   k.cjpid = echte CJ-pid, NUR für cjVideo() und den Server-Weg (serverQuelle / Auftrag).
// Umrechnung ohne CJ-Punkte: dropship/_cj_pid_cache.json (erste Varianten-SKU ohne «CJ-» → pid, cj_reviews_import.mjs),
// dazu die direkten pid-SKUs (CJ-<Ziffern> / CJ-<UUID>).
const PID_CACHE = (() => { try { return JSON.parse(fs.readFileSync('dropship/_cj_pid_cache.json', 'utf8')); } catch { return {}; } })();
const istPidForm = p => /^\d{15,}$/.test(p) || /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(p);
const kennungAus = sku => (/^CJ-([0-9A-Za-z-]{10,})/.exec(String(sku || '').trim()) || [])[1] || '';
function cjPidAus(sku) {
  const rest = String(sku || '').trim().replace(/^CJ-/i, '').trim();
  if (PID_CACHE[rest]) return PID_CACHE[rest];
  const k = kennungAus(sku); return k && istPidForm(k) ? k : '';
}
const UMKEHR = new Map();                                   // echte pid → [volle Shop-SKU, …] (Umkehrtabelle)
for (const [s, p] of Object.entries(PID_CACHE)) { if (!UMKEHR.has(p)) UMKEHR.set(p, []); UMKEHR.get(p).push('CJ-' + s); }
const kennungVon = pid => kennungAus((UMKEHR.get(pid) || [])[0]) || pid;
// Sperr-Tags + Heilwörter wie metricool_pinterest_pin.mjs (13.10.2026, R1 Schritt 5): Werbeverbote gelten auch fürs Reel.
const SPERR = new Set(['nicht-bewerben', 'nur-onlineshop', '18plus', 'raucher', 'erotik', 'kostuem', 'kostüm', 'refurbished',
  'medizinprodukt-pruefen', 'marken-pruefen', 'lizenz-risiko', 'lizenz-nicht-bewerben', 'adult-nicht-bewerben', 'gmc-adult-pull',
  'messer-nicht-bewerben', 'smoke-zubehoer', 'waffe-pruefen', 'verdeckte-ueberwachung', 'google-policy-flag', 'arzneimittel-ohne-zulassung']);
const HEIL = /schmerz|heil|migräne|krampfader|fettverbrenn|abnehmen|cellulite|arthr|rheuma|diabetes|entgift|detox|blutdruck|haarausfall|schnarch|inkontinenz/i;
// 13.10.2026 (Reel-Nachschub R3 Schritt 2): kleine Veto-Liste — Ware, die als Werbe-Reel pietätlos oder peinlich wirkt
// (GEMESSEN unter den 24 freien Shopify-Videos: 2 Tier-Urnen, 1 Haftcreme für Zahnprothesen). Wortgrenze bei «Urne»,
// sonst träfe es «Turnen»/«Turnschuh». Gilt für alle Quellen (Index, Scan, Shopify).
const VETO_REEL = /\burnen?\b|tierasche|prothes/i;
const sperrGrund = (tags, title) => (tags || []).map(t => String(t).toLowerCase()).some(t => SPERR.has(t) || /-nicht-bewerben$/.test(t)) ? 'sperr-tag'
  : HEIL.test(title || '') ? 'heilwort-im-titel' : VETO_REEL.test(title || '') ? 'veto-titel' : '';


const TOK = (process.env.SHOPIFY_ADMIN_TOKEN || (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '')).trim();
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json') ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
if (!TOK) { console.log('Kein Shopify-Token (SHOPIFY_ADMIN_TOKEN oder /tmp/cj_shop_token.txt) → No-op.'); process.exit(0); }
if (!CJT) { console.log('Kein CJ-Token (/tmp/cj_token.json) → No-op.'); process.exit(0); }

async function gql(q, v) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query: q, variables: v }) });
      const j = await r.json(); await nachlauf(j);
      if (j.data) return j;
      if (JSON.stringify(j.errors || '').includes('hrottl')) { await sleep(4000); continue; }
      console.log('  gql:', JSON.stringify(j.errors || j).slice(0, 160)); return null;
    } catch (e) { await sleep(2000); }
  }
  return null;
}
// 13.10.2026 (Reel-Nachschub R1 Schritt 1): DREI Ergebnisse statt '' für alles. Vorher wurde jeder Fehlercode, Timeout und
// jede dritte Drosselung als «kein Video» gebucht — 3 sichere Videos gingen so am 23./24.09. für immer verloren (GEMESSEN).
//   { url }          Video gefunden
//   { leer: true }   CJ antwortet Erfolg (code 0/200) ohne Video → das EINZIGE, was ins kein-Video-Ledger darf
//   { fehler }       alles andere → Tagessperre /tmp/cj_reel_fehler_<datum>.txt, morgen neu fragen
// Wie cj_video_backfill.mjs: Erfolg = code 0/200, data null zählt dort als leere Liste.
async function cjVideo(pid) {
  await cjTakt();
  let letzter = 'keine Antwort';
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId', { method: 'POST', headers: { 'CJ-Access-Token': CJT, 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: String(pid) }) });
      const j = await r.json();
      if (j && Number(j.code) === 1600200) { letzter = 'Drossel 1600200'; await sleep(8000); continue; }     // Drossel: warten
      if (j && (Number(j.code) === 16900500 || /Insufficient API points/i.test(String(j.message || '')))) throw new Error('CJ-Tagesbudget erschoepft');
      const d = Array.isArray(j?.data) ? j.data : [];
      const v = d.filter(x => x && x.videoUrl).sort((a, b) => (b.videoSize || 0) - (a.videoSize || 0))[0];
      if (v) return { url: v.videoUrl };
      if (j && (Number(j.code) === 200 || Number(j.code) === 0) && (j.data == null || Array.isArray(j.data))) return { leer: true };
      return { fehler: `code ${j?.code ?? '?'} ${String(j?.message || '').slice(0, 60)}`.trim() };
    } catch (e) { if (/Tagesbudget/.test(String(e))) throw e; letzter = String(e.message || e).slice(0, 60); await sleep(3000); }
  }
  return { fehler: letzter };
}
const FEHLER_SPERRE = `/tmp/cj_reel_fehler_${new Date().toISOString().slice(0, 10)}.txt`;   // pid<TAB>grund, gilt nur heute
const fehlerHeute = new Set((() => { try { return fs.readFileSync(FEHLER_SPERRE, 'utf8').split('\n').map(z => z.split('\t')[0].trim()).filter(Boolean); } catch { return []; } })());
function fehlerMerken(pid, grund) { fehlerHeute.add(pid); try { fs.appendFileSync(FEHLER_SPERRE, `${pid}\t${grund}\n`); } catch {} }

// ---------------------------------------------------------------- Text
const VERBOTEN = /kost[uü]m|erotik|sex|dildo|vibrator|messer|klinge|schwert|tabak|vape|e-?zigarette|waffe|airsoft/i;
// 28.09.2026: Wortgrenzen (Betreiber-Screenshot TikTok: «Dein Zuhause, gemütlicher» auf einem LEDerrucksack — «led» traf «Leder»;
// Trockenrad/Schnelltrocknend → «rock», Strick-Cape → «cap», Frottee → «tee»). Gegenprobe an 49'836 Titeln: 2'118 wechseln, davon
// 934 Leder-Artikel home→mode; «uhr»/«kind» bleiben ohne Grenze (Uhrenbox, Lauflernschuhe wären sonst verloren).
function thema(t) {
  const s = t.toLowerCase();
  if (/hund|katze|haustier|welpe|\bpet\b/.test(s)) return 'haustier';
  if (/fitness|yoga|training|hantel|widerstand|faszien|sport/.test(s)) return 'fitness';
  if (/küche|kuchen|mixer|kaffee|\btee(?!licht)|entsafter|grill|messbecher|topf|pfanne/.test(s)) return 'kueche';
  if (/kind|baby|kleinkind|spielzeug|lern/.test(s)) return 'kinder';
  if (/lampe|licht|\bled\b|deko|vase|kerze|diffuser|aroma|kissen|decke|organizer|regal/.test(s)) return 'home';
  if (/beamer|projektor|kopfhörer|kopfhoerer|lautsprecher|ladegerät|kabel|usb|bluetooth|smart|kamera|drohne|gadget|tracker|hülle|huelle/.test(s)) return 'gadget';
  // 11.10.2026: «Multicolor Lidschatten-Palette» fiel in «allgemein» → Hook «Wusstest du das schon?» auf einem Make-up-Reel
  if (/serum|\bgua\b|roller|creme|pflege|haar|nagel|wimper|augenbraue|makeup|make-up|massage|beauty|glätt|lidschatten|lippenstift|lipgloss|lippen|rouge|mascara|eyeliner|lidstrich|parfum|palette|puder/.test(s)) return 'beauty';
  if (/kette|ohrring|ohrhänger|armreif|armband|\bring\b|schmuck|anhänger|uhr/.test(s)) return 'schmuck';
  // 13.10.2026 (Prüfer R3): «schuh» traf «Reinigungs-hand-schuh-e» → Mode-Hook/-Musik auf Spülhandschuhen (CLAUDE.md 16d:
  // Handschuh ≠ Schuh). Jetzt (?<!hand)schuh; Mode-Handschuhe nur mit Mode-Wort davor (Leder/Winter/Ski/Touchscreen …) —
  // GEMESSEN an 53'994 Titeln: Spül-, Ofen-, Einweg-, Box-, Velo-Handschuhe → «allgemein», Winter-/Lederhandschuhe bleiben Mode.
  // Python-Port: bild_reel_auswahl.py _THEMEN (Gleichlauf im --selbsttest).
  if (/kleid|rock\b|bluse|hose|jacke|mantel|hoodie|shirt|hemd|pullover|cardigan|strick|sneaker|(?<!hand)schuh|(?:leder|winter|strick|kaschmir|touchscreen|fleece|plüsch|damen|ski|thermo)[-\s]?handschuh|stiefel|sandal|ballerina|tasche|rucksack|gürtel|schal|cap\b|mütze/.test(s)) return 'mode';
  return 'allgemein';
}
const HOOKS = {
  haustier: ['Dein Hund wird es lieben', 'Für die Katze, die alles darf', 'Endlich Ruhe beim Gassi?'],
  fitness: ['Training ohne Studio', 'Kleines Teil, grosse Wirkung', '10 Minuten, jeden Tag'],
  kueche: ['Küche, aber einfacher', 'Das fehlt in jeder Küche', 'Frühstück in 2 Minuten'],
  kinder: ['Für kleine Entdecker', 'Ruhe im Kinderzimmer?', 'Lernen, das Spass macht'],
  home: ['Dein Zuhause, gemütlicher', 'Das eine Teil fürs Wohnzimmer', 'Licht an, Stimmung an'],
  gadget: ['Kennst du das schon?', 'Das Gadget, das alle wollen', 'Warum hat das niemand früher gebaut?'],
  beauty: ['Dein 2-Minuten-Ritual', 'Salon-Feeling zuhause', 'Kleines Upgrade, grosser Glow'],
  schmuck: ['Das Teil, nach dem alle fragen', 'Schmuck, der bleibt', 'Alltag, aber glänzender'],
  mode: ['Dein neues Lieblingsteil?', 'Outfit fertig in 10 Sekunden', 'Das trägt jetzt jeder'],
  allgemein: ['Neu bei LuxeStyle', 'Genau das hat gefehlt', 'Wusstest du das schon?'],
};
function lernen() { try { return JSON.parse(fs.readFileSync('social/_lernen.json', 'utf8')); } catch { return {}; } }
// 13.10.2026 (Reel-Nachschub R9, GEMESSEN): Themen-Hooks passten oft nicht zum Produkt — «Endlich Ruhe beim Gassi?» fiel 37 von
// 43 Mal durch (86 %), «Das Gadget, das alle wollen» 27 von 30; 81 Jury-Urteile rügen Hook oder Caption. Jetzt zuerst ein
// Produkt-Hook (Skill videoschnitt Regel 3): Produktwort aus kurzTitel() + kurzer Nutzen, ≤ 24 Zeichen, ohne Heilwörter.
// Die Themenliste bleibt nur Rückfall — mit Raum- und Tier-Prüfung (Gassi nur bei hund/leine/gassi im Titel usw.).
const HOOK_MAX = 24;
const FARBE_MASS = /^(schwarz|weiss|weiß|rot|blau|grün|gruen|gelb|orange|rosa|pink|lila|violett|grau|braun|beige|gold|silber|bunt|multicolor|mehrfarbig|transparent|damen|herren|unisex|paar|stück|stueck|stk|pack|packung|grösse|größe|farbe|farben|edelstahl|holz|bambus|leder|baumwolle|kunststoff|silikon|glas|keramik|metall|aluminium|satin|seide|samt|wolle|neu)$/i;
// Adjektiv: unflektiert («wasserdicht», «faltbar») immer; flektiert («Leuchtendes», «Doppelköpfige») nur, wenn noch ein Wort
// folgt — als LETZTES Wort sind -er/-e/-en meist Nomen (Spender, Reiniger, Sandalen, Futterschale).
const ADJ_FEST = /^[^-]+(bar|los|voll|frei|dicht|fest|sicher|tauglich)$/i;      // auf dem letzten Bindestrich-Teil: «Yoga-Bar» bleibt Nomen
const ADJ_FLEX = /(ig|isch|lich|end|haft|sam|förmig|farbig|teilig|seitig|köpfig|stufig|bar|los|voll|frei|dicht|fest|sicher|tauglich)(e|er|es|en|em)$/i;
const NOMEN_AUSNAHME = /(reiniger|spender|kalender|sender|wender|ständer)$/i;
// PRAEP steht seit 14.10.2026 in ./lib/reel_titel.mjs (Import oben).
// Räume/Orte, in denen «Zuhause»/«Küche»/«Wohnzimmer» falsch wären (Auto-Organizer ≠ Wohnzimmer, LED-Rucksack ≠ Zuhause)
const RAUM_FREMD = /auto|kfz|fahrzeug|reise|outdoor|camping|garten|büro|buero|unterwegs|wander|fahrrad|velo|bike|strand|rucksack|tasche/i;
const HOOK_HEIL = /therap|heilung|genesung|medizin|linder/i;          // zusätzlich zu HEIL (Pinterest-Liste) — nur für den Hook
const istNomen = (x, letztes) => /^[A-ZÄÖÜ0-9]/.test(x) && !/-$/.test(x) && x.replace(/[^A-Za-zÄÖÜäöüß]/g, '').length >= 3
  && !ADJ_FEST.test(x.split('-').pop()) && (letztes || NOMEN_AUSNAHME.test(x) || !ADJ_FLEX.test(x))
  && !FARBE_MASS.test(x) && !/^[A-ZÄÖÜ0-9-]{2,5}$/.test(x);          // LED, USB, XL, 115W … sind kein Produktwort
// Produktwort: im ersten Komma-Teil vor der ersten Präposition, der ein Nomen trägt, das LETZTE Nomen (deutsche Titel:
// Adjektive + Nomen + «mit/für …»). «Frucht- und Gemüseabtropfkorb»: «und» nach «X-» ist kein Ende. Namen in
// Anführungszeichen («Schwebende Kette») zählen nicht. satz = «mit …»/«für …» direkt nach dem Produktwort (bis zur nächsten
// Präposition) — der Nutzen aus dem Titel selbst.
function produktWort(title) {
  const t = kurzTitel(String(title || '')).replace(/\([^)]*\)|"[^"]*"|«[^»]*»|„[^“]*“/g, ' ').replace(/\s+/g, ' ').trim();
  const woerter = t.split(' ');
  const stopp = woerter.findIndex((x, i) => PRAEP.test(x) && !(/^(und|oder)$/i.test(x) && /-$/.test(woerter[i - 1] || '')));
  const kopfTeil = (stopp < 0 ? woerter : woerter.slice(0, stopp)).join(' ');
  let satz = '';
  if (stopp >= 0 && /^(mit|für|fuer)$/i.test(woerter[stopp])) {
    // Ende am Komma oder an der nächsten Präposition; endet er an «und/oder/&», wäre der Satz nur halb wahr
    // («Trinknapf für Hunde» bei «für Hunde und Katzen») → dann kein Satz, der Warengruppen-Nutzen übernimmt.
    const nach = woerter.slice(stopp + 1).join(' ').replace(/\s*&\s*/g, ' & ').split(/\s*[,;]\s*/)[0].split(' ').filter(Boolean);
    const ende = nach.findIndex(x => PRAEP.test(x));
    satz = ende >= 0 && /^(und|oder|&)$/i.test(nach[ende]) ? ''
      : [woerter[stopp], ...(ende < 0 ? nach : nach.slice(0, ende))].join(' ').replace(/[.;:!?]+$/, '').trim();
    if (satz.split(' ').length < 2) satz = '';
  }
  const teile = kopfTeil.split(/\s*,\s*/);
  for (const [ti, teil] of teile.entries()) {
    const w = teil.split(' ').map(x => x.replace(/[.;:!?]+$/, '')).filter(Boolean);
    for (let i = w.length - 1; i >= 0; i--) {
      if (!istNomen(w[i], ti === teile.length - 1 && i === w.length - 1)) continue;
      const vor = i > 0 && /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{2,}$/.test(w[i - 1]) && !/-$/.test(w[i - 1]) && !FARBE_MASS.test(w[i - 1]) && !PRAEP.test(w[i - 1]) ? w[i - 1] : '';
      // Kurzform = kürzestes Bindestrich-Ende mit ≥ 6 Zeichen («Bambus-Schneidebrett» → «Schneidebrett», «…-Hundespielzeug-Set» → «Hundespielzeug-Set»)
      const st = w[i].split('-'); let kurz = '';
      for (let j = st.length - 1; j >= 1; j--) { const k = st.slice(j).join('-'); if (k.length >= 6) { kurz = k; break; } }
      return { wort: w[i], kurz, vor, kopf: w.slice(0, i + 1).join(' '), satz };
    }
  }
  return null;
}
const gross1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// kurzer Nutzen je Warengruppe — nur wo er nie falsch ist (Tier nur, wenn der Titel es FÜR ein Tier ausweist:
// «Roboter-Hund Sparbüchse» ist keine Ware «für Hunde»; Raum nur ohne Auto/Reise/Outdoor …)
// Die Warengruppe stammt aus einem groben Titel-Raster (thema(): «Laptopfach» → Küche, «LED» → Wohnen) — darum hier je Gruppe
// ein STRENGER Titel-Test, sonst stünde «Mini-Drohne fürs Zuhause» im Bild.
const NUTZEN_STRENG = {
  kueche: /küche|kueche|koch|back|pfanne|kochtopf|gewürz|kaffee|\btee\b|mixer|entsafter|schneidebrett|besteck|geschirr|dörr|abtropf|schüssel|teller/i,
  home: /lampe|leuchte|deko|vase|kerze|diffuser|aroma|kissen|decke|teppich|regal|organizer|vorhang|bettwäsche|wohn/i,
  beauty: /gerät|roller|bürste|massage|lockenstab|glätteisen|föhn|epilierer|rasierer|trimmer|schleuder/i,
  kinder: /kind|baby|spielzeug/i, schmuck: /./, mode: /^(?!.*(teig|küche|form\b)).*/i,
};
function nutzenKurz(th, title) {
  const s = title.toLowerCase(), fremd = RAUM_FREMD.test(title);
  if (th === 'haustier') return /für\s+(hunde?|welpen)\b/.test(s) && !/katze/.test(s) ? 'für Hunde' : /für\s+(katzen?|kitten)\b/.test(s) && !/hund/.test(s) ? 'für Katzen'
    : /für\s+(haustiere?|vierbeiner|hunde?|katzen?)\b/.test(s) ? 'für Vierbeiner' : '';
  if (th === 'fitness') return !fremd && /yoga|hantel|training|widerstand|faszien|matte|trainer/.test(s) ? 'für zuhause' : '';
  const n = ({ kueche: fremd ? '' : 'für die Küche', kinder: 'für Kinder', home: fremd ? '' : 'fürs Zuhause', beauty: fremd ? '' : 'für zuhause',
    schmuck: 'für jeden Tag', mode: 'für jeden Tag' })[th] || '';
  return n && NUTZEN_STRENG[th] && NUTZEN_STRENG[th].test(title) ? n : '';
}
function produktHook(th, title) {
  const pw = produktWort(title); if (!pw) return '';
  const besch = [...new Set([pw.kopf, pw.vor ? `${pw.vor} ${pw.wort}` : ''].filter(x => x && x !== pw.wort))];   // mit Beiwort («Baseball Cap»)
  const voll = [...besch, pw.wort];
  const kurz = pw.kurz ? [pw.kurz] : [];
  const n = nutzenKurz(th, title);
  // nicht doppelt: «Hundeleine für Hunde», «Küchenhelfer für die Küche», «Kindersitz für Kinder»
  const plus = (f, z) => z && !z.split(' ').filter(x => x.length >= 4 && !/^fürs?$/i.test(x)).some(x => f.toLowerCase().includes(x.toLowerCase().slice(0, 4))) ? `${f} ${z}` : '';
  // Reihenfolge: Titel-Nutzen vor Warengruppen-Nutzen, beschreibende Form vor dem nackten Wort («Baseball Cap» vor «Cap für jeden Tag»)
  const kand = [
    ...voll.map(f => plus(f, pw.satz)), ...kurz.map(f => plus(f, pw.satz)),      // Nutzen aus dem Titel («Schneidebrett mit Deckel»)
    ...besch.map(f => plus(f, n)), ...besch,                                       // «Linnen Kissenbezug fürs Zuhause» / «Linnen Kissenbezug»
    plus(pw.wort, n), pw.wort,                                                     // kurzer Nutzen je Warengruppe / Produktwort allein
    ...kurz.map(f => plus(f, n)), ...kurz,
  ].filter(Boolean);
  return kand.map(h => gross1(h.replace(/\s+/g, ' ').trim())).find(h => h.length <= HOOK_MAX && h.length >= 4 && !HEIL.test(h) && !HOOK_HEIL.test(h)) || '';
}
// Themen-Hooks nur, wenn Raum und Tier zum Titel passen
const HOOK_BEDINGT = [
  [/gassi/i, t => /hund|leine|gassi/i.test(t)], [/hund/i, t => /hund|welpe/i.test(t)], [/katze/i, t => /katze|kater|kitten/i.test(t)],
  [/wohnzimmer/i, t => /wohn|sofa|couch|lampe|leuchte|deko|vase|kissen|decke|teppich|regal|kerze/i.test(t) && !RAUM_FREMD.test(t)],
  [/küche|frühstück/i, t => /küche|kueche|koch|back|frühstück|kaffee|tee|mixer|pfanne|topf/i.test(t)],
  [/kinderzimmer/i, t => /kind|baby/i.test(t)], [/zuhause/i, t => !RAUM_FREMD.test(t)],
];
function hookFuer(th, pid, title = '') {
  const ph = produktHook(th, title);
  if (ph) return ph;
  const L = lernen(); let list = HOOKS[th] || HOOKS.allgemein;
  // Tierart beachten (22.09.: «Für die Katze, die alles darf» stand auf dem Futterspender für Hunde); 13.10.: allgemein über HOOK_BEDINGT
  list = list.filter(h => HOOK_BEDINGT.every(([wort, ok]) => !wort.test(h) || ok(title)));
  if (!list.length) list = HOOKS.allgemein;
  // 11.10.2026: schnitt.py nimmt bis 31 Zeichen (Bild 0 = LUXESTYLE + Hook ≤ 40); über 30 liest sich der Hook im Band schwer
  list = list.filter(h => h.length <= 30);
  if (!list.length) list = HOOKS.allgemein;
  const gew = (L.hooks || {});                                   // {hookText: score}
  const best = [...list].sort((a, b) => (gew[b] || 0) - (gew[a] || 0));
  const top = best.slice(0, 2);                                   // die zwei besten rotieren, Rest bleibt im Spiel
  const n = num(pid) % 3;
  return n === 2 ? list[num(pid) % list.length] : top[n % top.length];
}
// kurzTitel() und zeilen() stehen seit 14.10.2026 in ./lib/reel_titel.mjs (eine Quelle mit reel_neu_rendern.py).
function nutzen(desc) {
  const s = (desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // 23.09.: nur VOLLSTAENDIGE Saetze (enden auf . ! ?) — die Beschreibung kommt mit truncateAt:260, das letzte Stueck ist oft
  // ein Fetzen («…eine einfache Handhabung u..»); dazu keine Umschrift (fuer/ueber/Kuechenloeffel) und keine Auslassungspunkte.
  const satz = s.split(/(?<=[.!?])\s+/).find(x => x.length >= 30 && x.length <= 150 && /[.!?]$/.test(x) && !/\.\.|…/.test(x)
    && !/\b(fuer|ueber|waehrend|koennen|moechten|muessen|natuerlich|zuverlaessig|gemuetlich)\b|oeffel|uech/i.test(x)
    && !/\bSie\b|\bIhr[e]?\b|Lieferzeit|Werktag|Versand|CHF/.test(x));
  return satz ? satz.replace(/[.!?]$/, '') : '';
}
// 23.09.2026 (Social-Messung, Queue-Regel): nur Sach-Tags, hoechstens 5 — keine #trending/#viral/#fyp/#foryou-Beigaben
// (51 von 58 wartenden Reels trugen sie). tagsFor() liefert #schweiz, #luxestyle und 2–3 Warengruppen-Tags.
// 04.10.2026: gemeinsame Wahl (lib/hashtags.mjs) — 5 Plätze, gemessene Gewichte, Saison; die Poster wählen beim Posten neu.
function hashtags(title, pid) {
  return hashtagText(title);
}
const esc = x => /[",\n]/.test(x) ? '"' + String(x).replace(/"/g, '""') + '"' : x;
function appendReel(id, url, cap, tags, platforms) {
  let csv = fs.readFileSync(CSV, 'utf8'); if (!csv.endsWith('\n')) csv += '\n';
  // 29.09.2026: Datei direkt vor dem Schreiben neu gelesen — steht die ID schon drin (anderer Lauf, Merge), nichts anhängen.
  if (new RegExp('^' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',', 'm').test(csv)) { console.log(`   (Zeile ${id} steht schon in der Queue — nicht doppelt)`); return false; }
  csv += [id, new Date().toISOString().slice(0, 10), url, esc(cap), esc(tags), esc(platforms), 'ready', '', ''].join(',') + '\n';
  fs.writeFileSync(CSV, csv);
}
function gitPush(dateien, msg) {
  // 23.09.2026: ueber automation/git_sichern.sh (Merge statt Rebase, KEIN rebase.autoStash). Der Autostash stashte die
  // Quittungen laufender Poster und liess beim Zurueckspielen «unmerged» Dateien zurueck (19:25, drei dropship-Dateien).
  // Der Helfer nimmt /tmp/git_repo.lock selbst, loest Konflikte je Dateiart und pusht nie Konflikt-Marker.
  for (let a = 0; a < 3; a++) {
    try { execFileSync('bash', ['automation/git_sichern.sh', `${msg} [skip ci]`, ...dateien], { stdio: 'pipe' }); return true; }
    catch (e) { /* naechster Versuch */ }
  }
  return false;
}
// 28.09.2026 SERVER-WEG: Die Cloud erreicht download-only-api.cjdropshipping.com nicht (Proxy 403, gemessen 27./28.09.:
// alle 4 Kandidaten «curl failed», seit 27.09. kein neues Reel). Der Hetzner-Server holt die Videos über den Auftragskasten
// (automation/browser/cj_quellvideo_holen.mjs, höchstens 3 je Auftrag) nach auftraege/ergebnis/<auftrag>-rq-<pid>.mp4;
// der nächste Lauf baut daraus. Merkliste dropship/_reel_serverquelle.txt (pid, Datum) verhindert Doppel-Aufträge (24 h).
const SQ_MERK = 'dropship/_reel_serverquelle.txt';
const sqName = pid => ('rq-' + String(pid).toLowerCase().replace(/[^a-z0-9-]/g, '')).slice(0, 41);
function serverQuelle(pid) {
  const n = sqName(pid);
  try { const f = fs.readdirSync('auftraege/ergebnis').find(x => x.endsWith(`-${n}.mp4`)); return f ? `auftraege/ergebnis/${f}` : ''; }
  catch { return ''; }
}
function sqAngefragt(pid) {
  try { const heute = Date.now(); return fs.readFileSync(SQ_MERK, 'utf8').split('\n').some(z => { const [p, d] = z.split('\t'); return p === pid && heute - Date.parse(d) < 864e5; }); }
  catch { return false; }
}
function sqAuftrag(liste) {
  if (!liste.length) return;
  const id = `cj-reelquellen-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
  fs.mkdirSync('auftraege/offen', { recursive: true });
  const datei = `auftraege/offen/${id}.json`;
  fs.writeFileSync(datei, JSON.stringify({ id, typ: 'skript', skript: 'cj_quellvideo_holen.mjs',
    warum: 'Reel-Motor: Cloud-Proxy sperrt den CJ-Video-Download (28.09.) — Server lädt, Cloud rendert beim nächsten Lauf.',
    videos: liste.slice(0, 3).map(x => ({ name: sqName(x.pid), url: x.url })) }, null, 2) + '\n');
  const d = new Date().toISOString();
  fs.appendFileSync(SQ_MERK, liste.slice(0, 3).map(x => `${x.pid}\t${d}`).join('\n') + '\n');
  console.log(`   📮 Server-Auftrag ${id}: ${liste.slice(0, 3).map(x => x.pid).join(', ')}`);
  gitPush([datei, SQ_MERK], `Reel-Motor: Quellvideos über Server (${liste.length})`);
}
function caption(hook, k, benefit) {
  return `${hook} 👀\n«${kurzTitel(k.title)}»${benefit ? ` — ${benefit}.` : ''}\n\n${preisAnzeige(k.price, k.preisMax)} · Gratis Versand ab CHF 50 · Klarna & TWINT 🇨🇭\n🔗 luxestyle.ch/products/${k.handle} (Link in Bio)`;
}
// 13.10.2026 (Prüfer R3/R2, Preis-Wahrheit): k.price kam aus variants(first:1) — das ist die ERSTE Variante, nicht die günstigste
// (Kleid 20.90 bei Spanne 18.90–20.90, Handschuhe 14.90 bei 14.90–21.90). Jetzt Mindestpreis aus priceRangeV2 und «ab», wenn die
// Varianten verschieden kosten (preisAnzeige in post_guard.mjs). Schwelle CHF 14.90 gilt damit für den Mindestpreis.
const preisAus = n => {
  const v0 = parseFloat(n?.variants?.nodes?.[0]?.price || '0');
  const min = parseFloat(n?.priceRangeV2?.minVariantPrice?.amount ?? v0), max = parseFloat(n?.priceRangeV2?.maxVariantPrice?.amount ?? min);
  return { price: Number.isFinite(min) ? min : v0, preisMax: Number.isFinite(max) ? max : v0 };
};
const preisGesprochen = k => (k.preisMax > k.price + 0.005 ? '' : k.price.toFixed(2));   // «ab» spricht voiceover.py nicht → dann ohne Preis

// ---------------------------------------------------------------- Stimme (A/B, 23.09.2026)
// Entscheid je pid stabil (eigener Hash-Salz, damit er nicht mit der Musikwahl num(pid) % n gleichlaeuft):
// ein Neu-Rendern bekommt dieselbe Seite des A/B wie der Erstbau.
const stimmeGewollt = pid => STIMME_ANTEIL > 0 && (num('stimme:' + pid) % 1000) / 1000 < STIMME_ANTEIL;
// 13.10.2026 (R9): der Produkt-Hook wiederholt oft den Namen («Herren Business Quarzuhr. Herren Business Quarzuhr mit …» im
// ersten scharfen Lauf) → gesprochen wird der Hook nur, wenn er kein Wort des Namens trägt (voiceover.py lässt leere Hooks weg).
const sprechHook = (hook, title) => hook.split(/\s+/).filter(w => w.length >= 4).some(w => kurzTitel(title).toLowerCase().includes(w.toLowerCase())) ? '' : hook;
function stimmeBauen(pid, th, hook, k, benefit) {
  if (!stimmeGewollt(pid)) return { ja: false, grund: 'anteil' };
  const wav = `/tmp/reelbuild/vo_${pid}.wav`;
  const kurz = benefit && benefit.length <= 90 ? benefit : '';
  const args = ['automation/reel/voiceover.py', '--out', wav, '--hook', sprechHook(hook, k.title), '--name', kurzTitel(k.title), '--nutzen', kurz,
    '--preis', preisGesprochen(k), '--thema', th];
  let out = '';
  try { out = execFileSync('python3', args, { encoding: 'utf8', timeout: 240000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = String(e.stdout || ''); }
  let j = {}; try { j = JSON.parse(out.trim().split('\n').pop() || '{}'); } catch {}
  if (j.ok && fs.existsSync(wav)) { console.log(`   Stimme: ${j.stimme} ${j.dauer}s «${j.text}»`); return { ja: true, datei: wav, stimme: j.stimme, text: j.text }; }
  console.log(`   Stimme gewollt, aber nicht moeglich (${String(j.fehler || 'kein Ergebnis').slice(0, 100)}) → Reel ohne Stimme`);
  fs.rmSync(wav, { force: true });
  return { ja: false, grund: 'fehler' };
}
function stimmeDry(pid, th, hook, k, benefit) {
  if (!stimmeGewollt(pid)) return 'nein (Anteil)';
  try {
    const j = JSON.parse(execFileSync('python3', ['automation/reel/voiceover.py', '--dry', '--hook', sprechHook(hook, k.title), '--name', kurzTitel(k.title),
      '--nutzen', benefit && benefit.length <= 90 ? benefit : '', '--preis', preisGesprochen(k), '--thema', th], { encoding: 'utf8' }).trim());
    return `ja (${j.stimme}) «${j.varianten[0]}»`;
  } catch (e) { return 'ja, aber voiceover.py --dry scheitert: ' + String(e.message || e).slice(0, 80); }
}

// ---------------------------------------------------------------- Neu rendern (23.09.2026)
// NEU_RENDERN=1: Reels, die noch «ready» in der Queue stehen, mit der aktuellen Textebene neu bauen (Anlass:
// Betreiber-Screenshot — Titel/Preis lagen unter TikToks Caption). Gleiche Datei, gleiche Adresse, keine neue
// Zeile, kein Ledger-Eintrag. NUR_PID=<pid> begrenzt; OHNE_PUSH=1 laesst die Datei in /tmp/reelbuild (Sichtpruefung).
if (process.env.NEU_RENDERN === '1') {
  fs.mkdirSync('/tmp/reelbuild', { recursive: true });
  // Zeilen der Queue tragen mehrzeilige Captions in Anfuehrungszeichen — deshalb ein echter CSV-Leser, kein split('\\n').
  const parseCsv = text => { const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
    if (cur.length || row.length) { row.push(cur); rows.push(row); } return rows.filter(r => r.length > 1); };
  const csvRows = parseCsv(fs.readFileSync(CSV, 'utf8')); const ci = Object.fromEntries(csvRows[0].map((h, i) => [h.trim(), i]));
  const ziel = csvRows.slice(1).map(r => ({ pid: (/^cjreel-([0-9A-Za-z-]{6,})$/.exec(r[ci.id] || '') || [])[1], status: (r[ci.status] || '').trim() }))
    .filter(x => x.pid && (process.env.NUR_PID ? x.pid === process.env.NUR_PID : x.status === 'ready'))
    .map(x => x.pid).filter(p => process.env.OHNE_PUSH === '1' || fs.existsSync(`${MEDIEN}/reel_${p}.mp4`));
  console.log(`Neu rendern: ${ziel.length} ready-Reels`);
  let neu = 0; const dateien = [];
  for (let i = 0; i < ziel.length; i += 20) {
    const teil = ziel.slice(i, i + 20);
    const r = await gql(`query($q:String){ products(first:20, query:$q){ nodes{ id title handle status priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:1){nodes{price sku}} } } }`, { q: teil.map(p => `sku:CJ-${p}`).join(' OR ') });
    if (!r) break;
    for (const n of r.data.products.nodes) {
      const m = /^CJ-([0-9A-Za-z-]{10,})/.exec(n.variants.nodes[0]?.sku || ''); if (!m || !teil.includes(m[1])) continue;
      const pid = m[1], k = { pid, title: n.title.trim(), ...preisAus(n) };
      let st = { ja: false, grund: 'anteil' };
      if (n.status !== 'ACTIVE') { console.log(`   ${pid}: Produkt ${n.status} — nicht neu gerendert`); continue; }
      // 13.10.2026 (R1): die Kennung kann eine Varianten-SKU sein → CJ mit der echten pid fragen; cjVideo() liefert ein Objekt.
      let vurl = ''; try { vurl = (await cjVideo(cjPidAus(n.variants.nodes[0]?.sku) || pid)).url || ''; } catch (e) { console.log('  ✗ ' + e.message); break; }
      if (!vurl) { console.log(`   ${pid}: CJ hat kein Video mehr`); continue; }
      const th = thema(k.title), hook = hookFuer(th, pid, k.title), [z1, z2] = zeilen(k.title);
      const src = `/tmp/reelbuild/src_${pid}.mp4`, out = `/tmp/reelbuild/reel_${pid}.mp4`;
      try {
        execFileSync('curl', ['-s', '-L', '--max-time', '180', '-H', 'Referer: https://developers.cjdropshipping.com/', '-o', src, vurl], { stdio: 'ignore' });
        if (!fs.existsSync(src) || fs.statSync(src).size < 200000) { console.log(`   ${pid}: Video zu klein`); continue; }
        let dur = 0; try { dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' })); } catch {}
        const mw = musikWahl(thema(k.title), pid), musik = mw.datei;
        st = stimmeBauen(pid, th, hook, k, '');
        const rb = reelBauen({ src, out, musik, einstieg: mw.start, titel: z1, titel2: z2, preis: preisAnzeige(k.price, k.preisMax), hook, stimme: st });
        if (!rb.ok) { console.log(`   ${pid}: schnitt Exit ${rb.code} — ${rb.grund}`); continue; }
        st = rb.st;
        // OHNE_PUSH = Sichtpruefung: nichts veroeffentlicht → auch kein Verlaufseintrag (sonst zaehlt die Lernschleife Test-Renders)
        if (process.env.OHNE_PUSH !== '1') musikMerken(`cjreel-${pid}`, mw, thema(k.title), st);
        if (!fs.existsSync(out) || fs.statSync(out).size < 100000) { console.log(`   ${pid}: Render fehlgeschlagen`); continue; }
        { const tor = torPruefen(out, k.price); if (tor.rc !== 0) { console.log(`   ${pid}: ⛔ Meisterwerk-Tor ${tor.gruende.join(' · ')} — alte Fassung bleibt`); continue; } }
        if (process.env.OHNE_PUSH === '1') { console.log(`   ✅ ${pid} gerendert → ${out} (kein Push)`); neu++; continue; }
        fs.copyFileSync(out, `${MEDIEN}/reel_${pid}.mp4`); dateien.push(`${MEDIEN}/reel_${pid}.mp4`); neu++;
        console.log(`   ✅ ${pid} neu gerendert: ${z1} / ${z2}`);
      } catch (e) { console.log(`   ${pid}: Fehler ${String(e.message || e).slice(0, 100)}`); }
      finally { fs.rmSync(src, { force: true }); fs.rmSync(`/tmp/reelbuild/vo_${pid}.wav`, { force: true }); if (process.env.OHNE_PUSH !== '1') fs.rmSync(out, { force: true }); }
    }
  }
  if (dateien.length) { if (!gitPush(dateien, `Reels neu gerendert (sichere Zone): ${dateien.length}`)) console.log('   Push fehlgeschlagen'); }
  console.log(`FERTIG neu rendern: ${neu}`);
  process.exit(0);
}

// ---------------------------------------------------------------- Kandidaten
const gebaut = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
const ersteSpalte = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map(s => s.split('\t')[0].trim()).filter(Boolean) : [];
const keinVideo = new Set(ersteSpalte(KEINVIDEO));
const torAbgelehnt = new Set(ersteSpalte(TOR_ABGELEHNT));
// 29.09.2026: vorher /^cjreel-(\d+)/ — UUID-pids (9BDA360E-…, 56A53647-…) galten nie als «in der Queue» und wurden vom
// Nachtrag erneut angehängt (5 IDs doppelt, gemessen 29.09.). Jede ID bis zum ersten Komma zählt.
const inCsv = new Set((fs.readFileSync(CSV, 'utf8').match(/^cjreel-[^,\n]+/gm) || []).map(s => s.replace('cjreel-', '')));
// 13.10.2026 (R1 Schritt 6): Sperre über BEIDE Schlüssel (Kennung UND echte pid) — nie zwei Reels aus einem CJ-Video.
// kein-Video-Zeilen in Varianten-Form (CJxx…) stammen aus falsch gestellten Fragen (CJ kennt nur pids) und sperren
// nicht mehr; sie bleiben in der Datei (nicht löschen). Dazu die heutige Fehler-Sperre (cjVideo «fehler»).
const gesperrt = (...s) => s.filter(Boolean).some(x => gebaut.has(x) || inCsv.has(x) || torAbgelehnt.has(x) || fehlerHeute.has(x)
  || (keinVideo.has(x) && istPidForm(x)));
// 13.10.2026 (Prüfer R2, Regel 10): ein Bild-Reel (bildreel-<Handle>) sperrt dasselbe Produkt für Video-Reels — JEDER Status,
// auch *-skip (ein zurückgehaltenes Bild-Reel heisst trotzdem: das Produkt war schon dran). gesperrt() kannte nur cjreel-IDs;
// die drei Bild-Reel-Produkte vom 13.10. standen bis 30.11. in _reel_vorrang.txt. Gegenrichtung: bild_reel_auswahl.py sperrlisten().
const bildReelHandles = new Set((fs.readFileSync(CSV, 'utf8').match(/^bildreel-[^,\n]+/gm) || []).map(s => s.slice(9).trim().toLowerCase()));
const hatBildReel = h => !!h && bildReelHandles.has(String(h).toLowerCase());
// R1 Schritt 4: dieselbe Abfrage wie produktAktiv() in metricool_tiktok_post.mjs / meta_reel_post.mjs —
// products(first:1, query:"sku:CJ-<Kennung>") muss GENAU dieses Produkt mit ACTIVE + onlineStoreUrl liefern, sonst würde
// der Poster das Reel später als «produkt-nicht-aktiv» verwerfen. '' = bestanden, sonst Grund.
async function posterProbe(kennung, gid) {
  if (!kennung || /^\d{12,15}$/.test(kennung)) return 'kennung-unbrauchbar';   // 12–15 Ziffern hielte der Poster für eine Shopify-ID
  const r = await gql(`query($q:String){ products(first:1, query:$q){ nodes{ id status onlineStoreUrl } } }`, { q: `sku:CJ-${kennung}` });
  if (!r) return 'ohne-antwort';
  const p = r.data.products.nodes[0];
  return !p ? 'findet-nichts' : p.id !== gid ? 'findet-anderes-produkt' : p.status !== 'ACTIVE' ? `status-${p.status}` : !p.onlineStoreUrl ? 'ohne-onlineshop' : '';
}
const kand = []; let cursor = null, gescannt = 0;
// Index-Kandidaten zuerst (cj_video_index.mjs, 22.09.): Produkte, die laut CJ-Kategorieliste ein Video
// haben — der Motor fragt dann fast nur noch Treffer statt 1 von 80. Nachschlag im Shop per SKU-OR-Suche
// (20 je Aufruf, gemessen 22.09.), gleiche Schwellen wie der Scan.
const INDEX = 'dropship/_cj_video_index.json';
const idx = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : null;
// 05.10.2026 (Social-Gesundheit): «816 offene Treffer → 0 Kandidaten» bei jedem Lauf. Gemessen an den ersten 200 Index-pids:
// 127 nicht mehr im Shop, 57 DRAFT, 1 unter 2 Bildern — und das Fenster ist auf die ERSTEN 200 begrenzt, die nie aus dem
// Index fallen → dieselben toten pids jeden Lauf, die brauchbaren dahinter kamen nie dran. Jetzt: Ausfall-Ledger
// dropship/_cj_reel_index_tot.txt (pid<TAB>grund<TAB>datum), 14 Tage gueltig (DRAFT kann wieder ACTIVE werden), filtert
// die Index-Kandidaten VOR dem 200er-Fenster.
const INDEX_TOT = 'dropship/_cj_reel_index_tot.txt';
const TOT_TAGE = 14;
const _heute = Date.now();
const tot = new Map();
let totNeuBewertet = 0;
if (fs.existsSync(INDEX_TOT)) for (const z of fs.readFileSync(INDEX_TOT, 'utf8').split('\n')) {
  const [p, g, d] = z.split('\t'); if (!p) continue;
  // 13.10.2026 (R1 Schritt 7): «nicht-im-shop» (alle Zeilen vom 08.10.) war für Varianten-SKU-Produkte eine Fehlbuchung —
  // gesucht wurde nur `sku:CJ-<pid>`. Kennt die Umkehrtabelle die pid, wird die Zeile beim Lesen neu bewertet (bleibt in der Datei).
  if ((g || '').trim() === 'nicht-im-shop' && UMKEHR.has(p.trim())) { totNeuBewertet++; continue; }
  const t = Date.parse(d || ''); if (!isNaN(t) && (_heute - t) / 86400000 <= TOT_TAGE) tot.set(p.trim(), d);
}
const idxAlle = idx ? Object.keys(idx.shop_video || {}).filter(p => !gesperrt(p, kennungVon(p))) : [];
const idxPids = idxAlle.filter(p => !tot.has(p));
let idxKand = 0, probeAus = 0; const totNeu = [], probeListe = [];
// Fenster 200 → bis 600 pids, aber Schluss, sobald BATCH·3 Kandidaten stehen: ein Lauf kommt so an den toten pids vorbei,
// statt erst beim naechsten (6 h spaeter) — jede 20er-Abfrage ist EIN Shopify-Aufruf, kein CJ-Punkt.
// DRY zählt das ganze Fenster (Messung: wie viele Kandidaten gibt es?), scharf genügen BATCH·3.
const IDX_MAX = parseInt(process.env.IDX_MAX || '600', 10);
const IDX_ZIEL = DRY ? Infinity : BATCH * 3;
for (let i = 0; i < Math.min(idxPids.length, IDX_MAX) && idxKand < IDX_ZIEL; i += 20) {
  const teil = idxPids.slice(i, i + 20);
  // 13.10.2026 (R1 Schritt 2): je pid BEIDE Formen suchen — die direkte pid-SKU und die volle Shop-SKU aus der Umkehrtabelle
  // (in Anführungszeichen, 21 von 148 tragen Leerzeichen; GEMESSEN: `sku:"CJ-CJYDQTJM00565-Black Set"` findet das Produkt).
  const q = teil.flatMap(p => [`sku:CJ-${p}`, ...(UMKEHR.get(p) || []).slice(0, 2).map(s => `sku:${JSON.stringify(s)}`)]).join(' OR ');
  const r = await gql(`query($q:String){ products(first:50, query:$q){ nodes{ id title handle status tags mediaCount{count} description(truncateAt:260) priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:5){nodes{price sku}} } } }`, { q });
  if (!r) break;
  // Je pid EIN Urteil: eine pid kann mehrere Shop-Produkte tragen (Duplikat als DRAFT neben dem ACTIVE-Original) —
  // qualifiziert eines, zaehlt die pid als Kandidat und landet NICHT im Ausfall-Ledger. Probe-/Sperr-Gründe gewinnen
  // (die gehören nie ins Ausfall-Ledger, R1 Schritt 4).
  const gut = new Set(), grundJe = new Map();
  const setzeGrund = (p, g) => { const alt = grundJe.get(p) || ''; if (alt === 'gesperrt' || alt.startsWith('probe:')) return; grundJe.set(p, g); };
  for (const n of r.data.products.nodes) {
    const vs = n.variants.nodes; const sku = vs[0]?.sku || '';
    // Zuordnung Produkt → pid über die Umkehrtabelle (eine der ersten 5 Varianten-SKUs), nicht über den Text der SKU
    const cjpid = vs.map(v => cjPidAus(v.sku)).find(p => p && teil.includes(p)); if (!cjpid) continue;
    if (gut.has(cjpid)) continue;
    const kennung = kennungAus(sku); const { price, preisMax } = preisAus(n);
    const grund = !kennung ? 'sku-ohne-kennung' : n.status !== 'ACTIVE' ? `status-${n.status}` : price < 14.9 ? 'preis-unter-14.90' : (n.mediaCount?.count || 0) < 2 ? 'unter-2-bilder' : VERBOTEN.test(n.title) ? 'verbots-titel'
      : sperrGrund(n.tags, n.title) || (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${kennung}`) ? 'produkt-schon-gepostet' : '');
    if (grund) { setzeGrund(cjpid, grund); continue; }
    if (gesperrt(kennung) || hatBildReel(n.handle)) { setzeGrund(cjpid, 'gesperrt'); continue; }
    const probe = await posterProbe(kennung, n.id);
    if (probe) { probeAus++; probeListe.push(`${cjpid} → ${kennung}: ${probe}`); setzeGrund(cjpid, 'probe:' + probe); continue; }
    gut.add(cjpid); grundJe.delete(cjpid);
    kand.push({ pid: kennung, cjpid, gid: n.id, title: n.title.trim(), handle: n.handle, price, preisMax, desc: n.description || '', tags: n.tags || [], idx: true, probe: true }); idxKand++;
  }
  for (const p of teil) {
    if (gut.has(p)) continue;
    const g = grundJe.get(p) || (UMKEHR.has(p) ? 'nicht-im-shop-auch-umkehr' : 'nicht-im-shop');   // R1 Schritt 7
    if (g === 'gesperrt' || g.startsWith('probe:')) continue;
    totNeu.push([p, g]);
  }
}
if (totNeu.length && !DRY) fs.appendFileSync(INDEX_TOT, totNeu.map(([p, g]) => `${p}\t${g}\t${new Date().toISOString().slice(0, 10)}`).join('\n') + '\n');
if (idx) console.log(`Video-Index: ${idxAlle.length} offene Treffer (${idxAlle.length - idxPids.length} im Ausfall-Ledger ≤ ${TOT_TAGE} T, ${totNeuBewertet} «nicht-im-shop» über die Umkehrtabelle neu bewertet) → ${idxKand} Kandidaten (davon Varianten-SKU ${kand.filter(x => x.idx && x.pid !== x.cjpid).length}) · Poster-Probe durchgefallen ${probeAus} · ${totNeu.length} neu ins Ausfall-Ledger (Index-Stand ${(idx.stand || '').slice(0, 16)})`);
if (DRY) {
  for (const z of probeListe.slice(0, 10)) console.log(`   Probe ✗ ${z}`);
  console.log(`DRY Stichprobe (pid → Kennung → Titel):`);
  const vari = kand.filter(x => x.idx && x.pid !== x.cjpid), dir = kand.filter(x => x.idx && x.pid === x.cjpid);
  for (const k of [...vari.slice(0, 8), ...dir.slice(0, 2)].slice(0, 10)) console.log(`   ${k.cjpid} → ${k.pid} → ${k.title.slice(0, 60)} · CHF ${k.price}`);
}

// ---------------------------------------------------------------- Quelle «Shopify» (R3, 13.10.2026)
// GEMESSEN 13.10. (Prüf-Workflow, scratchpad h2b.py): Der Video-Nachtrag (cj_video_backfill.mjs / video_lokal_anhaengen.mjs,
// Ledger dropship/_cj_video_backfill.txt) hat an 454 Produkten das Lieferantenvideo als VIDEO-Medium angehängt. Der Dateiname
// trägt die CJ-pid (cj-<pid>.mp4 bzw. cj-video-<pid>.mp4; 456 Dateien, 0 Abweichungen). 393 davon haben schon ein Reel, 24 sind
// frei. Der Motor kannte diese Quelle nicht und fragte CJ erneut (oder gar nicht). Jetzt: aktive Produkte mit VIDEO-Medium aus
// dem Nachtrag (Status ok / ok-lokal / hat-schon-video) als eigene Quelle — ohne CJ-Frage:
//   · pid NUR aus dem Dateinamen (ohne pid-förmigen Namen kein Kandidat); widerspricht die SKU-Zuordnung (Umkehrtabelle), raus.
//   · Kennung + Poster-Probe wie R1 (k.pid = SKU-Rest, k.cjpid = echte pid).
//   · Sperren: gebaut, inCsv, _reel_tor_abgelehnt (beide Schlüssel), produktGepostet, Sperr-Tags/HEIL/Veto, Schwellen wie oben.
//     NICHT das kein-Video-Ledger des Motors: das Video hängt nachweislich am Produkt (3 Widersprüche GEMESSEN — sie zählen).
//   · Ab 720 px kurzer Seite das Shopify-Original (cdn.shopify.com) direkt. Darunter (15 von 24 haben 540 px, weil der Nachtrag die
//     KLEINSTE CJ-Fassung anhängt) einmal queryVideosByProductId → grösste Fassung laden und nur nehmen, wenn sie grösser ist.
// Nachweis je Reel: Log «Quelle: …» + dropship/_reel_quelle.txt (Kennung, Datum, Quelle, kurze Seite) für den Jury-Vergleich.
const BACKFILL = 'dropship/_cj_video_backfill.txt';
const bfZeilen = fs.existsSync(BACKFILL) ? fs.readFileSync(BACKFILL, 'utf8').split('\n').map(z => z.split('\t')) : [];
const BF_MIT = [...new Set(bfZeilen.filter(([g, s]) => g && /^(ok|ok-lokal|hat-schon-video)$/.test((s || '').trim())).map(([g]) => g.trim()))];
// R3 Schritt 5: «kein-video-beim-lieferanten» = der Nachtrag hat CJ schon richtig gefragt (queryVideosByProductId, seit 07.09.)
// → im Scan nicht noch einmal fragen (GID-genau, kostet keine Umrechnung).
const BF_KEIN = new Set(bfZeilen.filter(([g, s]) => g && (s || '').trim() === 'kein-video-beim-lieferanten').map(([g]) => g.trim()));
const VID_DATEI = /^cj-(?:video-)?([0-9A-Za-z-]+?)(?:_\d+)?\.mp4$/i;
// Shopify-Quelle: dieselben Sperren wie gesperrt(), aber ohne kein-Video (Video liegt am Produkt) und ohne die CJ-Fehler-Sperre
// (die gilt nur für die CJ-Frage, siehe Bau-Schleife).
const gesperrtShop = (...s) => s.filter(Boolean).some(x => gebaut.has(x) || inCsv.has(x) || torAbgelehnt.has(x));
let shopKand = 0, shopProbeAus = 0; const shopGruende = new Map(), shopListe = [];
const SHOP_ZIEL = DRY ? Infinity : BATCH * 3;
for (let i = 0; i < BF_MIT.length && shopKand < SHOP_ZIEL; i += 50) {
  const r = await gql(`query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id title handle status tags mediaCount{count} description(truncateAt:260)
    priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:5){nodes{price sku}} media(first:25){ nodes{ mediaContentType ... on Video { filename status originalSource{ url width height } } } } } } }`, { ids: BF_MIT.slice(i, i + 50) });
  if (!r) break;
  for (const n of r.data.nodes || []) {
    if (!n || !n.id || shopKand >= SHOP_ZIEL) continue;
    const zaehl = g => shopGruende.set(g, (shopGruende.get(g) || 0) + 1);
    const vids = (n.media?.nodes || []).filter(m => m.mediaContentType === 'VIDEO' && m.status !== 'FAILED' && m.originalSource?.url);
    const v = vids.map(m => ({ m, p: (VID_DATEI.exec(m.filename || '') || [])[1] || '' })).find(x => istPidForm(x.p));
    const vs = n.variants?.nodes || []; const sku = vs[0]?.sku || ''; const kennung = kennungAus(sku); const { price, preisMax } = preisAus(n);
    const skuPid = vs.map(x => cjPidAus(x.sku)).find(Boolean) || '';
    const grund = !vids.length ? 'kein-video-medium' : !v ? 'dateiname-ohne-pid' : !kennung ? 'sku-ohne-kennung'
      : skuPid && skuPid !== v.p ? 'pid-widerspruch' : n.status !== 'ACTIVE' ? `status-${n.status}` : price < 14.9 ? 'preis-unter-14.90'
      : (n.mediaCount?.count || 0) < 2 ? 'unter-2-medien' : VERBOTEN.test(n.title) ? 'verbots-titel' : sperrGrund(n.tags, n.title)
      || (gesperrtShop(kennung, v.p) ? 'schon-reel-oder-tor' : '') || (hatBildReel(n.handle) ? 'bild-reel-vorhanden' : '') || (kand.some(x => x.pid === kennung || x.cjpid === v.p) ? 'schon-index-kandidat' : '')
      || (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${kennung}`) ? 'produkt-schon-gepostet' : '');
    if (grund) { zaehl(grund); continue; }
    const probe = await posterProbe(kennung, n.id);
    if (probe) { shopProbeAus++; zaehl('probe:' + probe); continue; }
    const o = v.m.originalSource; const kurz = Math.min(o.width || 0, o.height || 0);
    kand.push({ pid: kennung, cjpid: v.p, gid: n.id, title: n.title.trim(), handle: n.handle, price, preisMax, desc: n.description || '', tags: n.tags || [],
      quelle: 'shopify', shopUrl: o.url, shopKurz: kurz, probe: true });
    shopKand++; shopListe.push(`${v.p} → ${kennung} · ${kurz} px${keinVideo.has(v.p) ? ' · (kein-Video-Ledger widerspricht)' : ''} · ${n.title.slice(0, 55)} · CHF ${price}`);
  }
}
console.log(`Shopify-Videos (Nachtrag): ${BF_MIT.length} Produkte → ${shopKand} Kandidaten (≥720 px ${kand.filter(x => x.quelle === 'shopify' && x.shopKurz >= 720).length}) · Poster-Probe durchgefallen ${shopProbeAus} · ausgeschieden: ${[...shopGruende].sort((a, b) => b[1] - a[1]).map(([g, z]) => `${g} ${z}`).join(', ') || '—'}`);
if (DRY) for (const z of shopListe) console.log(`   Shopify ✓ ${z}`);
let bfGespart = 0;
while (gescannt < SCAN && idxKand < BATCH * 3) {
  const r = await gql(`query($c:String){ products(first:50, after:$c, sortKey:CREATED_AT, reverse:true, query:"status:active tag:cj-real"){ pageInfo{hasNextPage endCursor} nodes{ id title handle tags mediaCount{count} description(truncateAt:260) priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:1){nodes{price sku}} } } }`, { c: cursor });
  if (!r) break;
  const pg = r.data.products;
  for (const n of pg.nodes) {
    gescannt++;
    if (BF_KEIN.has(n.id)) { bfGespart++; continue; }                 // R3 Schritt 5: CJ hat dem Nachtrag schon «kein Video» gesagt
    const sku = n.variants.nodes[0]?.sku || ''; const pid = kennungAus(sku); if (!pid) continue;
    // 13.10.2026 (R1): CJ nur mit der echten pid fragen. Varianten-SKU ohne Eintrag in der Umkehrtabelle → überspringen
    // (keine Frage, kein Ledger); vorher ging die Varianten-SKU selbst an CJ (29 % der Fragen seit 30.09., 0 Reels).
    const cjpid = cjPidAus(sku); if (!cjpid) continue;
    const { price, preisMax } = preisAus(n);
    if (gesperrt(pid, cjpid) || hatBildReel(n.handle) || kand.some(x => x.pid === pid || x.cjpid === cjpid)) continue;
    if (price < 14.9 || (n.mediaCount?.count || 0) < 2 || VERBOTEN.test(n.title) || sperrGrund(n.tags, n.title)) continue;
    if (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${pid}`)) continue;
    kand.push({ pid, cjpid, gid: n.id, title: n.title.trim(), handle: n.handle, price, preisMax, desc: n.description || '', tags: n.tags || [] });
  }
  if (!pg.pageInfo.hasNextPage) break;
  cursor = pg.pageInfo.endCursor;
}
// Hype/neu zuerst, dann bunt nach Kategorie
const prio = x => (x.tags.includes('hype-jetzt') ? 0 : x.tags.includes('neuheit') || x.tags.includes('neu') ? 1 : 2);
// 23.09.2026: Die Lernschleife rechnet Themen-Gewichte (social/_lernen.json → themen, z. B. beauty 1.33 · mode 0.91),
// aber niemand las sie. Jetzt ordnen sie INNERHALB einer Prio-Stufe (nur belastbare Werte); balanceByCategory
// mischt danach weiter bunt — das Gewicht entscheidet, wer in seiner Gruppe vorne steht, nicht, ob sie drankommt.
const _themen = lernen().themen || {};
const tw = x => { const e = _themen[thema(x.title)]; return e && e.belastbar && typeof e.gewicht === 'number' ? e.gewicht : 1; };
const ordnen = l => l.sort((a, b) => prio(a) - prio(b) || tw(b) - tw(a));
// 13.10.2026 (R3): Shopify-Quelle und Index im Reissverschluss (Shopify zuerst — kostet ab 720 px keinen CJ-Punkt), danach der
// Scan. So kommen beide Quellen in jedem Lauf dran, und die Jury-Quote beider lässt sich vergleichen.
const _shop = balanceByCategory(ordnen(kand.filter(x => x.quelle === 'shopify')), x => x.title);
const _idx = balanceByCategory(ordnen(kand.filter(x => x.idx)), x => x.title);
const _zipp = []; for (let i = 0; i < Math.max(_shop.length, _idx.length); i++) { if (_shop[i]) _zipp.push(_shop[i]); if (_idx[i]) _zipp.push(_idx[i]); }
let reihe = [..._zipp, ...balanceByCategory(ordnen(kand.filter(x => !x.idx && x.quelle !== 'shopify')), x => x.title)];
// 23.09.2026 (Halloween-Auftritt): NUR_PID=<pid> auch im Normalmodus — bisher galt es nur fuer NEU_RENDERN. Das Produkt muss
// dieselben Schwellen passieren wie jeder Kandidat (ACTIVE, ≥ CHF 14.90, ≥ 2 Bilder, kein Verbots-Titel, nie gepostet, nicht
// im Ledger/CSV); steht es nicht im Index-/Scan-Fenster, wird es per SKU nachgeschlagen. Nichts wird erzwungen.
// dropship/_reel_vorrang.txt (23.09.2026): Zeilen «pid<TAB>JJJJ-MM-TT» — diese pids kommen bis zum Datum ZUERST dran
// (Saison, z. B. Halloween-Lampe bis 31.10.). Eine Queue fuer den Runner, kein Zwang: die Schwellen gelten weiter, und
// steht die pid nicht unter den Kandidaten, passiert nichts. Anlass: der Download-Host war aus der Sitzung gesperrt (Proxy
// 403), der Runner kommt alle 30 Min — er soll die vorgemerkte pid nicht unter 100 Kandidaten verlieren.
try {
  const heute = new Date().toISOString().slice(0, 10);
  const vor = fs.readFileSync('dropship/_reel_vorrang.txt', 'utf8').split('\n').map(z => z.split('\t')).filter(([p, bis]) => p && (!bis || bis.trim() >= heute)).map(([p]) => p.trim());
  // 13.10.2026 (R1): Vorrang-Zeilen dürfen Kennung ODER echte pid sein
  if (vor.length) { const rang = p => { const i = vor.indexOf(p); return i < 0 ? 1e9 : i; }; const r2 = x => Math.min(rang(x.pid), rang(x.cjpid)); reihe = [...reihe].sort((a, b) => r2(a) - r2(b)); console.log(`Reel-Vorrang: ${vor.join(', ')} → ${reihe.filter(x => vor.includes(x.pid) || vor.includes(x.cjpid)).length} unter den Kandidaten`); }
} catch {}
if (process.env.NUR_PID && process.env.NEU_RENDERN !== '1') {
  const pid = process.env.NUR_PID;
  reihe = reihe.filter(x => x.pid === pid || x.cjpid === pid);
  // 13.10.2026 (R1): NUR_PID darf Kennung oder echte pid sein; CJ wird nur mit der echten pid gefragt (cjPidAus).
  if (!reihe.length && !gesperrt(pid, kennungVon(pid))) {
    const r = await gql(`query($q:String){ products(first:5, query:$q){ nodes{ id title handle status tags mediaCount{count} description(truncateAt:260) priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:1){nodes{price sku}} } } }`, { q: `sku:CJ-${kennungVon(pid)}` });
    for (const n of r?.data?.products?.nodes || []) {
      const sku = n.variants.nodes[0]?.sku || '', kennung = kennungAus(sku), cjpid = cjPidAus(sku);
      if (!kennung || !cjpid || (kennung !== pid && cjpid !== pid)) continue;
      const { price, preisMax } = preisAus(n);
      if (n.status !== 'ACTIVE' || price < 14.9 || (n.mediaCount?.count || 0) < 2 || VERBOTEN.test(n.title) || sperrGrund(n.tags, n.title)) { console.log(`NUR_PID ${pid}: faellt an der Schwelle (${n.status}, CHF ${price}, ${n.mediaCount?.count} Bilder, ${sperrGrund(n.tags, n.title) || 'keine Sperre'})`); continue; }
      if (gesperrt(kennung, cjpid) || hatBildReel(n.handle)) { console.log(`NUR_PID ${pid}: gesperrt (Ledger/CSV/Tor/Bild-Reel)`); continue; }
      if (produktGepostet(`«${kurzTitel(n.title)}»`, `cjreel-${kennung}`)) { console.log(`NUR_PID ${pid}: Produkt schon gepostet`); continue; }
      reihe.push({ pid: kennung, cjpid, gid: n.id, title: n.title.trim(), handle: n.handle, price, preisMax, desc: n.description || '', tags: n.tags || [] });
    }
  }
  console.log(`NUR_PID ${pid}: ${reihe.length ? 'Kandidat' : 'KEIN Kandidat (Ledger/CSV/Schwelle)'}`);
}
if (Object.keys(_themen).length) console.log(`Themen-Gewichte (Lernschleife): ${Object.entries(_themen).filter(([, e]) => e.belastbar).map(([k, e]) => `${k} ${e.gewicht}`).join(' · ')}`);
console.log(`Kandidaten: ${kand.length} (Shopify ${kand.filter(x => x.quelle === 'shopify').length} · Index ${kand.filter(x => x.idx).length} · Scan ${kand.filter(x => !x.idx && x.quelle !== 'shopify').length}) von ${gescannt} gescannt, ${bfGespart} ohne CJ-Frage übersprungen (Nachtrag: kein Video) (Schwelle: ACTIVE, ≥CHF 14.90, ≥2 Bilder, nie gepostet)${DRY ? ' · DRY' : ''}`);

// ---------------------------------------------------------------- Bauen
fs.mkdirSync('/tmp/reelbuild', { recursive: true }); fs.mkdirSync(MEDIEN, { recursive: true });
// Nachtrag (22.09.): Reel-Dateien im Repo OHNE Queue-Zeile — sie entstehen, wenn der Commit gelang, aber Push oder
// Rebase scheiterte (gemessen 22.09.: sieben Dateien nach einem verklemmten Rebase). Die Datei liegt in der Historie,
// also Zeile und Ledger nachtragen statt neu rendern. Bedingung: Adresse antwortet (= gepusht) und Produkt ACTIVE.
let nachgetragen = 0;
if (!DRY) {
  const waisen = fs.readdirSync(MEDIEN).map(f => /^reel_(.+)\.mp4$/.exec(f)?.[1]).filter(p => p && !gebaut.has(p) && !inCsv.has(p));
  for (let i = 0; i < waisen.length; i += 20) {
    const teil = waisen.slice(i, i + 20);
    const r = await gql(`query($q:String){ products(first:20, query:$q){ nodes{ id title handle status mediaCount{count} description(truncateAt:260) priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} variants(first:1){nodes{price sku}} } } }`, { q: teil.map(p => `sku:CJ-${p}`).join(' OR ') });
    if (!r) break;
    for (const n of r.data.products.nodes) {
      const m = /^CJ-([0-9A-Za-z-]{10,})/.exec(n.variants.nodes[0]?.sku || ''); if (!m || !teil.includes(m[1])) continue;
      const pid = m[1], k = { pid, title: n.title.trim(), handle: n.handle, ...preisAus(n) }, url = RAW + `reel_${pid}.mp4`;
      let code = ''; try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', '-r', '0-1000', url], { encoding: 'utf8' }); } catch {}
      if (!/^20[06]$/.test(code)) { console.log(`   Nachtrag ${pid}: Adresse antwortet ${code} — Datei noch nicht gepusht`); continue; }
      if (n.status !== 'ACTIVE') { console.log(`   Nachtrag ${pid}: Produkt ${n.status} — keine Zeile`); continue; }
      const th = thema(k.title), hook = hookFuer(th, pid, k.title);
      appendReel(`cjreel-${pid}`, url, caption(hook, k, nutzen(n.description || '')), hashtags(k.title, pid), 'instagram,facebook');
      // 13.10.2026 (R1 Schritt 6): beide Schlüssel ins Ledger (Kennung + echte pid)
      const cjp = cjPidAus(n.variants.nodes[0]?.sku);
      fs.appendFileSync(LEDGER, pid + '\n' + (cjp && cjp !== pid ? cjp + '\n' : '')); gebaut.add(pid); if (cjp) gebaut.add(cjp); inCsv.add(pid); nachgetragen++;
      console.log(`   ✅ Nachtrag: ${pid} [${th}] ${k.title.slice(0, 50)} → queue`);
    }
  }
  if (nachgetragen) gitPush([CSV, LEDGER], `Reel-Queue: ${nachgetragen} Zeilen nachgetragen`);
}
let made = 0, gefragt = 0, cjAus = false;
const zumServer = [];
const letzteMusik = fs.existsSync('/tmp/_reel_last_music') ? fs.readFileSync('/tmp/_reel_last_music', 'utf8').trim() : '';
// R3: Quelle je Reel (Kennung · Datum · Quelle · kurze Seite in px) — für den Vergleich der Jury-Quote Shopify gegen CJ-Download
const QUELLE_LOG = 'dropship/_reel_quelle.txt';
// kurze Seite einer Videodatei über PyAV (der ffprobe im Pfad ist ein Python-Ersatz, der nur die Dauer kennt — Skill videoschnitt)
function kurzeSeite(datei) {
  try { return parseInt(execFileSync('python3', ['-c', 'import av,sys\nc=av.open(sys.argv[1]);s=c.streams.video[0];print(min(s.codec_context.width,s.codec_context.height))', datei],
    { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(), 10) || 0; } catch { return 0; }
}
const laden = (url, ziel, referer) => {
  try { execFileSync('curl', ['-s', '-L', '--fail', '--max-time', '180', ...(referer ? ['-H', `Referer: ${referer}`] : []), '-o', ziel, url], { stdio: 'ignore' }); } catch { fs.rmSync(ziel, { force: true }); }
  if (fs.existsSync(ziel) && fs.statSync(ziel).size >= 200000) return true;
  fs.rmSync(ziel, { force: true }); return false;
};
for (const k of reihe) {
  if (made >= BATCH || gefragt >= FRAGEN) break;
  // 28.09.: ein Server-Auftrag trägt 3 Videos — weiter fragen kostet nur CJ-Punkte. Die Shopify-Quelle (R3) braucht den Server nie.
  if (zumServer.length >= 3 && k.quelle !== 'shopify') continue;
  // 13.10.2026 (R1): k.cjpid fehlt nur bei Altfällen → wie bisher die Kennung. Sperre über beide Schlüssel auch hier
  // (Index und Scan können im selben Lauf dasselbe Produkt liefern; gebaut wird nach jedem Reel nachgeführt).
  k.cjpid = k.cjpid || k.pid;
  const shop = k.quelle === 'shopify';
  if (shop ? gesperrtShop(k.pid, k.cjpid) : gesperrt(k.pid, k.cjpid)) continue;
  if (hatBildReel(k.handle)) { console.log(`   ${k.pid}: Bild-Reel bildreel-${k.handle} vorhanden → kein Video-Reel (Regel 10)`); continue; }
  let vurl = '', cjGross = '';
  if (shop) {
    // R3 Schritt 4: ab 720 px kurzer Seite das Shopify-Original ohne CJ-Frage. Darunter EINMAL CJ nach der grössten Fassung
    // fragen — ausser CJ hat schon «kein Video» gesagt (Widerspruch: dann ist das Shopify-Video die einzige Quelle).
    vurl = k.shopUrl;
    if (k.shopKurz < 720 && !keinVideo.has(k.cjpid)) {
      // CJ heute gestört → morgen neu (nicht mit 540 px bauen, solange die grosse Fassung nur vorübergehend fehlt)
      if (cjAus || fehlerHeute.has(k.cjpid)) { console.log(`   ${k.pid}: Shopify ${k.shopKurz} px, CJ heute nicht erreichbar → morgen`); continue; }
      gefragt++;
      let cv;
      try { cv = await cjVideo(k.cjpid); } catch (e) { console.log(`  ✗ ${e.message} — ab jetzt nur noch Shopify-Quellen ab 720 px`); cjAus = true; continue; }
      if (cv.fehler) { console.log(`   ${k.pid}: CJ-Fehler (${cv.fehler}) → Tagessperre, morgen neu`); if (!DRY) fehlerMerken(k.cjpid, cv.fehler); continue; }
      cjGross = cv.url || '';                 // «leer»: CJ hat das Video nicht mehr → Shopify-Fassung ist die einzige
    }
  } else {
    if (cjAus) continue;
    gefragt++;
    let cv;
    try { cv = await cjVideo(k.cjpid); } catch (e) { console.log(`  ✗ ${e.message} — keine CJ-Fragen mehr in diesem Lauf`); cjAus = true; continue; }
    // R1 Schritt 1: nur «leer» ist «kein Video» (Ledger mit der echten pid); «fehler» → Tagessperre, morgen neu fragen
    if (cv.fehler) { console.log(`   ${k.pid}: CJ-Fehler (${cv.fehler}) → Tagessperre, kein kein-Video-Eintrag`); if (!DRY) fehlerMerken(k.cjpid, cv.fehler); continue; }
    if (!cv.url) { if (!DRY) fs.appendFileSync(KEINVIDEO, `${k.cjpid}\t${new Date().toISOString().slice(0, 10)}\n`); continue; }
    vurl = cv.url;
  }
  // R1 Schritt 4 für Scan-/NUR_PID-Kandidaten (Index-Kandidaten sind schon geprüft): erst nach dem Video-Fund, damit die
  // vielen Leerfragen des Scans keine Shopify-Abfrage kosten. Durchgefallen → überspringen, kein Ledger.
  if (!k.probe) { const pr = await posterProbe(k.pid, k.gid); if (pr) { console.log(`   ${k.pid}: Poster-Probe ✗ (${pr}) → übersprungen, kein Ledger`); continue; } k.probe = true; }
  // HOOK=<Text> (23.09.2026, nur sinnvoll mit NUR_PID): Hook vorgeben, wenn die Themenliste nicht passt («Dein Zuhause,
  // gemütlicher» auf einer Halloween-Lampe). Kein Lernwert — die Lernschleife kennt nur ihre eigenen Hooks.
  const th = thema(k.title), hook = (process.env.NUR_PID && process.env.HOOK) || hookFuer(th, k.pid, k.title), [z1, z2] = zeilen(k.title);
  const benefit = nutzen(k.desc);
  const cap = caption(hook, k, benefit);
  const tags = hashtags(k.title, k.pid);
  console.log(`→ ${k.pid}${k.cjpid !== k.pid ? ` (CJ-pid ${k.cjpid})` : ''} [${th}] ${k.title.slice(0, 60)} · ${preisAnzeige(k.price, k.preisMax)}\n   Hook: ${hook} · Titel: ${z1} / ${z2}\n   Video: ${shop ? `Shopify ${k.shopKurz} px ` : ''}${vurl.slice(0, 70)}${cjGross ? `\n   CJ-Fassung zum Vergleich: ${cjGross.slice(0, 70)}` : ''}`);
  if (DRY) { console.log(`   Stimme: ${stimmeDry(k.pid, th, hook, k, benefit)}`); made++; continue; }
  const src = `/tmp/reelbuild/src_${k.pid}.mp4`, out = `/tmp/reelbuild/reel_${k.pid}.mp4`, srcCj = `/tmp/reelbuild/srccj_${k.pid}.mp4`;
  let st = { ja: false, grund: 'anteil' }, quelleTxt = 'cj', kurzIst = 0;
  try {
    const lokal = shop ? '' : serverQuelle(k.cjpid);
    if (shop) {
      // R3: grösste CJ-Fassung nur, wenn sie wirklich grösser ist als das Shopify-Original (gemessen an der Datei, PyAV)
      if (cjGross) {
        const kz = laden(cjGross, srcCj, 'https://developers.cjdropshipping.com/') ? kurzeSeite(srcCj) : 0;
        console.log(`   CJ-Fassung: ${kz ? kz + ' px' : 'nicht ladbar/lesbar'} gegen Shopify ${k.shopKurz} px`);
        if (kz > k.shopKurz) { fs.renameSync(srcCj, src); quelleTxt = 'cj-gross'; kurzIst = kz; }
        else fs.rmSync(srcCj, { force: true });
      }
      if (quelleTxt !== 'cj-gross') {
        if (!laden(k.shopUrl, src, '')) { console.log('   Shopify-Download leer → nächster Lauf (kein Ledger)'); continue; }
        quelleTxt = 'shopify'; kurzIst = kurzeSeite(src) || k.shopKurz;
      }
      console.log(`   Quelle: ${quelleTxt === 'shopify' ? 'Shopify' : 'CJ (grösste Fassung)'} · ${kurzIst} px kurze Seite`);
    } else if (lokal) { fs.copyFileSync(lokal, src); quelleTxt = 'server'; console.log(`   Quelle vom Server: ${lokal}`); }
    else {
      try { execFileSync('curl', ['-s', '-L', '--fail', '--max-time', '180', '-H', 'Referer: https://developers.cjdropshipping.com/', '-o', src, vurl], { stdio: 'ignore' }); }
      catch { fs.rmSync(src, { force: true }); }
      if (!fs.existsSync(src) || fs.statSync(src).size < 200000) {
        fs.rmSync(src, { force: true });
        if (/^https:\/\/download-only-api\.cjdropshipping\.com\/.+\.mp4$/i.test(vurl) && !sqAngefragt(k.cjpid)) zumServer.push({ pid: k.cjpid, url: vurl });
        console.log('   Download gesperrt/leer → über den Server'); continue;
      }
    }
    if (!kurzIst) kurzIst = kurzeSeite(src);
    const quelleMerken = erg => { try { fs.appendFileSync(QUELLE_LOG, `${k.pid}\t${new Date().toISOString().slice(0, 10)}\t${quelleTxt}\t${kurzIst}\t${erg}\n`); } catch {} };
    let dur = 0; try { dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' })); } catch {}
    if (dur && dur < 3) { console.log('   Video kuerzer als 3 s'); continue; }
    const mw = musikWahl(th, k.pid), musik = mw.datei;
    console.log(`   Musik: ${musik} ab ${mw.start}s [${th}]`);
    st = stimmeBauen(k.pid, th, hook, k, benefit);
    const rb = reelBauen({ src, out, musik, einstieg: mw.start, titel: z1, titel2: z2, preis: preisAnzeige(k.price, k.preisMax), hook, stimme: st });
    if (!rb.ok) {
      console.log(`   ⛔ schnitt Exit ${rb.code}: ${rb.grund} → nicht in die Queue`);
      // 3 = Quelle ungeeignet, 4 = Ausgabetor: dauerhaft → Ledger (nicht erneut fragen); 1 = Fehler (OCR, Musik) → vorübergehend
      if (rb.code === 3 || rb.code === 4) { fs.appendFileSync(TOR_ABGELEHNT, `${k.pid}\t${new Date().toISOString().slice(0, 10)}\tschnitt ${rb.code}: ${rb.grund}\n`); quelleMerken(`schnitt-${rb.code}`); }
      continue;
    }
    st = rb.st;
    if (!fs.existsSync(out) || fs.statSync(out).size < 100000) { console.log('   Render fehlgeschlagen'); continue; }
    const tor = torPruefen(out, k.price);
    if (tor.rc !== 0) {
      console.log(`   ⛔ Meisterwerk-Tor: ${tor.gruende.join(' · ')} → nicht in die Queue`);
      if (tor.rc === 4) { fs.appendFileSync(TOR_ABGELEHNT, `${k.pid}\t${new Date().toISOString().slice(0, 10)}\t${tor.gruende.join(' · ')}\n`); quelleMerken('meisterwerk-4'); }
      continue;
    }
    const datei = `reel_${k.pid}.mp4`;
    // 01.10.2026 Grow-Plan (300 GB, Video-Upload wieder offen — gemessen: stagedUploads VIDEO ohne userErrors, Test-Reel
    // READY, cdn.shopify.com antwortet 206 video/mp4): Ablage ZUERST im Shopify-CDN. Das Repo (681 MB in social/reels/)
    // bleibt nur Rückfall, falls der Upload scheitert. Die abgelaufenen SHOPIFY_CLIENT_* der Umgebung werden entfernt,
    // sonst nimmt der Uploader sie vor dem gültigen Token (gemessen: «Kein gültiger Admin-Token»).
    let url = '';
    try {
      const env = { ...process.env, SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', SHOPIFY_ADMIN_TOKEN: TOK };
      delete env.SHOPIFY_CLIENT_ID; delete env.SHOPIFY_CLIENT_SECRET;
      const ziel = `/tmp/reelbuild/${datei}`; fs.copyFileSync(out, ziel);
      url = execFileSync(process.execPath, ['automation/upload_to_shopify_cdn.mjs', ziel, `Reel ${k.title.slice(0, 60)}`],
                         { encoding: 'utf8', env, timeout: 300000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop();
      fs.rmSync(ziel, { force: true });
      if (!/^https:\/\/cdn\.shopify\.com\//.test(url)) url = '';
    } catch { url = ''; }
    if (url) console.log('   Ablage: Shopify-CDN');
    else {
      fs.copyFileSync(out, `${MEDIEN}/${datei}`);
      url = RAW + datei;
      if (!gitPush([`${MEDIEN}/${datei}`], `Reel ${k.pid} (${th})`)) { console.log('   Push fehlgeschlagen — Reel verworfen, naechster Lauf'); fs.rmSync(`${MEDIEN}/${datei}`, { force: true }); continue; }
      console.log('   Ablage: Repo (CDN-Upload gescheitert)');
    }
    // erreichbar?
    let code = '';
    try { code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', '-r', '0-1000', url], { encoding: 'utf8' }); } catch {}
    if (!/^20[06]$/.test(code)) { console.log(`   Adresse antwortet ${code} — Reel bleibt im Repo, Zeile folgt beim naechsten Lauf`); continue; }
    appendReel(`cjreel-${k.pid}`, url, cap, tags, 'instagram,facebook');
    // 13.10.2026 (R1 Schritt 6): BEIDE Schlüssel ins gebaut-Ledger — Kennung und echte pid
    fs.appendFileSync(LEDGER, k.pid + '\n' + (k.cjpid !== k.pid ? k.cjpid + '\n' : '')); gebaut.add(k.pid); gebaut.add(k.cjpid);
    fs.writeFileSync('/tmp/_reel_last_music', musik); musikMerken(`cjreel-${k.pid}`, mw, th, st); quelleMerken('ready');
    gitPush([CSV, LEDGER, KEINVIDEO, VERLAUF, QUELLE_LOG], `Reel-Queue: ${k.pid} ready (Quelle ${quelleTxt})`);
    made++; console.log(`   ✅ Reel ${made}/${BATCH} → queue (${url.slice(-40)})`);
  } catch (e) { console.log('   Fehler:', String(e.message || e).slice(0, 120)); }
  finally { fs.rmSync(src, { force: true }); fs.rmSync(srcCj, { force: true }); fs.rmSync(out, { force: true }); fs.rmSync(`/tmp/reelbuild/vo_${k.pid}.wav`, { force: true }); }
}
if (!DRY) sqAuftrag(zumServer);
if (!DRY && fs.existsSync(KEINVIDEO)) gitPush([KEINVIDEO, ...[TOR_ABGELEHNT, QUELLE_LOG].filter(f => fs.existsSync(f))], 'Reel-Motor: kein-Video- und Tor-Ledger');
console.log(`FERTIG. neue Reels: ${made} | nachgetragen: ${nachgetragen} | CJ gefragt: ${gefragt} | Kandidaten: ${kand.length}`);
