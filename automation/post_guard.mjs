/* post_guard.mjs — GEMEINSAME Doppelpost-Sperre für ALLE Social-Poster (User 2026-07-14:
 * «darf kein doppelpost mehr passieren», erneut aufgetreten aus einem Legacy-Poster ohne Schutz).
 * Jeder Poster (meta_reel_post, video-autopost-meta, social-autopost-meta, story-autopost-meta)
 * MUSS diese 3 Funktionen nutzen:
 *   lock()        — EIN gemeinsamer O_EXCL-Lock (/tmp/ig_post.lock) → nie zwei Poster gleichzeitig
 *   seen(url)     — true, wenn dieses Medium (Basename der URL) schon je gepostet wurde (script-übergreifend)
 *   mark(url)     — Medium SOFORT nach erfolgreichem Publish in den gemeinsamen Ledger schreiben
 * Ledger liegt im Repo (dropship/_posted_media.txt) → überlebt Container-Resets, wird committet.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const LOCK = '/tmp/ig_post.lock';
const LEDGER = 'dropship/_posted_media.txt';
// 23.09.2026: Karussell-Slides heissen in JEDEM Set 01.jpg … 06.jpg — nur der Dateiname als Schluessel
// machte nach dem ersten Karussell jedes weitere Set zum «Doppelpost» (Ledger-Zeilen «01.jpg» … «06.jpg»).
// Nackte Nummern-Namen tragen darum den Ordner mit: «<set>/01.jpg». Alle anderen Medien unveraendert.
export const mediaKey = u => {
  const teile = (u || '').split('?')[0].split('/').map(t => t.toLowerCase().trim());
  const name = teile.pop() || '';
  return /^\d{1,3}\.(?:jpe?g|png|webp|mp4)$/.test(name) && teile.length ? `${teile.pop()}/${name}` : name;
};

// ⛔ SECHSTE SCHICHT — DER RIEGEL (Betreiber 13.08.2026: «hör auf insta gleiche sachen zu
// posten»). Fünf Wachen gab es schon: gemeinsamer Lock, Claim-vor-Post, Inhalts-Sperre über
// die Caption-Signatur, Live-Abgleich gegen die letzten IG-Posts, ein Ledger im Repo. Sie
// alle haben eines gemeinsam — sie müssen RICHTIG ARBEITEN, um zu schützen. Diese hier nicht:
// existiert die Datei, endet jeder Poster sofort, egal was die übrigen Wachen meinen.
// Sie liegt im Repo und nicht in /tmp, überlebt also den nächsten Container-Wipe.
// Entfernt wird sie erst, wenn belegt ist, WELCHER Poster doppelt gepostet hat und warum.
const STOPP = 'dropship/_SOCIAL_STOPP';
export function stoppAktiv() {
  // 24.08.2026: dritter Pruefpfad ABSOLUT. Die beiden bisherigen haengen an cwd bzw. am
  // Speicherort DIESER Datei — eine alte /tmp-Kopie eines Posters mit fremdem cwd sah die
  // Stoppdatei nicht. Am 18.08. ging trotz Stopp ein Reel raus (posted-ig-fb 18:43); der
  // absolute Pfad schliesst diese Luecke fuer jeden Aufrufer, egal woher er laeuft.
  return fs.existsSync(STOPP) ||
         fs.existsSync(new URL('../dropship/_SOCIAL_STOPP', import.meta.url).pathname) ||
         fs.existsSync('/home/user/aban-news-landing/dropship/_SOCIAL_STOPP');
}

let _released = false;
export function lock(maxMin = 20) {
  if (stoppAktiv()) {
    // EINZELFREIGABE: der Betreiber verlangt ausdruecklich EINEN Post (03.09.2026:
    // «jetzt etwas cooles upload»). Die Stoppdatei bleibt liegen — sie haelt weiterhin
    // jeden unbeaufsichtigten Lauf an; nur ein Aufruf, der den Produktschluessel NENNT,
    // kommt durch. Ein blanker Schalter waere ein Generalschluessel und damit genau die
    // Luecke, gegen die die Datei am 13.08. gesetzt wurde.
    const frei = process.env.EINZELFREIGABE;
    if (!frei || frei.length < 4) {
      console.log('[post_guard] ⛔ dropship/_SOCIAL_STOPP gesetzt — es wird NICHTS gepostet.');
      process.exit(0);
    }
    console.log(`[post_guard] ⚠️ EINZELFREIGABE «${frei}» — Stoppdatei bleibt, es geht GENAU EIN Post raus.`);
  }
  try {
    const fd = fs.openSync(LOCK, 'wx'); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
  } catch {
    const age = fs.existsSync(LOCK) ? (Date.now() - fs.statSync(LOCK).mtimeMs) / 60000 : 999;
    if (age < maxMin) { console.log(`[post_guard] Lock aktiv (${age.toFixed(1)}min) → anderer Poster läuft, skip.`); process.exit(0); }
    fs.writeFileSync(LOCK, String(process.pid)); // veraltet → übernehmen
  }
  const rel = () => { if (_released) return; _released = true; try { fs.unlinkSync(LOCK); } catch {} };
  process.on('exit', rel);
  return rel;
}
function loadSeen() {
  try { return new Set(fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)); }
  catch { return new Set(); }
}
export function seen(url) { const k = mediaKey(url); return !!k && loadSeen().has(k); }
export function mark(url) {
  const k = mediaKey(url); if (!k) return;
  const s = loadSeen(); if (s.has(k)) return;
  fs.appendFileSync(LEDGER, k + '\n');
}

// ⛔ SIEBTE SCHICHT — DAS PRODUKT (Betreiber-Screenshot 03.09.2026: «Silber-Armreif Serpent»
// stand ZWEIMAL nebeneinander im Instagram-Raster).
//
// WARUM ALLE SECHS WACHEN DAVOR BLIND WAREN: Sie prüfen das MEDIUM (Basename der URL), den
// TEXTANFANG (capSig) und die LIVE-Caption. Derselbe Armreif steht in `social/posts_image.csv`
// aber DREIMAL — mit drei IDs, drei Bild-URLs und drei Texten («Neu entdeckt: …», «Dein
// Sommer-Liebling? …», «Der Armreif «Serpent» umschmeichelt …»). Andere URL, anderer
// Textanfang: jede der drei Wachen sagt zu Recht «kenne ich nicht». Keine fragt, ob es
// dieselbe WARE ist. Dieselbe Denkfigur wie «ein Tag-Name ist eine Behauptung» (29.08.):
// wer ein Merkmal prüft, das die Sache nur vertritt, prüft die Sache nicht.
//
// Der Schlüssel ist der Produktname in « » — genau den tragen alle drei Fassungen. Fehlt er,
// greift die Shopify-Produkt-ID aus der Zeilen-ID. Ohne beides gibt es keinen Schlüssel und
// die Sperre hält sich heraus; sie ersetzt die anderen Wachen nicht, sie ergänzt sie.
// ⚠️ Zwei verschiedene Produkte können denselben « »-Namen tragen («Roma» Blazer / «Roma»
// Tasche). Dann wird der zweite übersprungen — das ist die richtige Richtung: der Auftrag
// des Betreibers lautet «nie dasselbe zweimal», nicht «möglichst viel posten».
const P_LEDGER = 'dropship/_posted_produkte.txt';

export function produktKey(caption = '', zeilenId = '') {
  const m = String(caption).match(/[«"„]([^»"“]{2,40})[»"“]/);
  if (m) return 'name:' + m[1].toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  const id = String(zeilenId).match(/(\d{12,})\s*$/);
  if (id) return 'pid:' + id[1];
  // Kein « »-Name und keine Produkt-ID: der Zeilen-Slug muss reichen. Erzeuger-Praefixe
  // (ki-, kimi-, img-, clip-, post-, auto-, fresh-) und ein angehaengtes Datum gehoeren
  // nicht zum Produkt und werden abgeschnitten — sonst gilt dieselbe Ware als zwei.
  const slug = String(zeilenId).toLowerCase()
    .replace(/^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto)-/, '')
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-\d{6,}$/, '')
    .replace(/[^a-z0-9-]/g, '');
  return slug.length >= 6 ? 'slug:' + slug : '';
}
function ladeProdukte() {
  try { return new Set(fs.readFileSync(P_LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)); }
  catch { return new Set(); }
}
export function produktGepostet(caption, zeilenId) {
  const k = produktKey(caption, zeilenId);
  return !!k && ladeProdukte().has(k);
}
export function produktMerken(caption, zeilenId) {
  const k = produktKey(caption, zeilenId); if (!k) return;
  const s = ladeProdukte(); if (s.has(k)) return;
  fs.appendFileSync(P_LEDGER, k + '\n');
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MODEL-MARKIERUNG — eine Zusage an eine Person, technisch durchgesetzt (04.09.2026)
 *
 * Die Kundin hat ihre Fotos unter EINER Bedingung freigegeben: Wenn sie auf Instagram
 * erscheinen, wird sie markiert (Betreiber wörtlich: «mnarkieren tati unbedingt»). Eine
 * Bedingung, die nur in einer Doku steht, wird beim dritten Post vergessen — deshalb steht
 * sie hier, wo jeder Poster vorbeikommt.
 *
 * `markierungFehlt(medium, caption)` gibt einen Grund zurück, wenn ein Beitrag Material
 * dieser Kundin zeigt und die Markierung NICHT in der Caption steht. Ein Poster, der einen
 * Grund bekommt, postet nicht — genauso wie beim Doppelpost-Schutz.
 * ────────────────────────────────────────────────────────────────────────── */
// 07.09.2026 — Betreiber: «privat account und geschäfts account im fb unbedingt trennen … soll nie
// mehr vorkommen». Ein Facebook-Beitrag geht NUR an die Geschaeftsseite. Vor JEDEM FB-Schreiben
// wird gemessen, WER das Token ist: /me muss die Seiten-ID liefern. Ein User-Token (Privatprofil),
// eine fremde Seite oder ein Netzfehler → Abbruch. Ein ausgelassener Post kostet nichts; ein
// Beitrag auf dem falschen Konto kostet Vertrauen.
export const FB_SEITE = '1049840534888592';
export async function fbSeitenIdentitaet(token, pageId = FB_SEITE) {
  if (!token) return { ok: false, grund: 'kein Token' };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
    const j = await r.json().catch(() => ({}));
    if (j && String(j.id) === String(pageId)) return { ok: true, name: j.name };
    return { ok: false, grund: j?.id ? `Token gehoert "${j.name}" (${j.id}), nicht der Seite ${pageId}` : `Token ungueltig (${JSON.stringify(j?.error?.message || j).slice(0, 120)})` };
  } catch (e) { return { ok: false, grund: `Identitaet nicht pruefbar: ${e.message}` }; }
}

export const MODEL_HANDLE = '@tatjanalarsinamoira';
// Merkmale des Materials: die Dateinamen der Kundinnenfotos und des daraus gebauten Reels.
// 30.09.2026: + «tati» — ihre Fotos kommen in den Shop (Dateiname tati-model-…) und fliessen von dort in Pins, Stories und
// Karussells; die Sperre muss am BILD greifen, nicht an einer Queue.
const MODEL_MEDIEN = /(^|[^a-z])(kundin-\d\d|luxestyle-model-(clean|musik)|tati-model|tatjana)/i;

export function istModelMaterial(medium = '', zeilenId = '') {
  return MODEL_MEDIEN.test(String(medium)) || MODEL_MEDIEN.test(String(zeilenId));
}

// 30.09.2026 Betreiber: «bei insta posting immer sie markieren und auch andere orte» — EINE Prüfung für ALLE Poster
// (IG, FB, TikTok, YouTube, Pinterest, Karussell, Story). text = Caption/Pin-Text; text === null = Kanal ohne Text (Story):
// dann nur erlaubt, wenn die Markierung ins Bild gebrannt ist (Dateiname enthält «markiert»).
export function modelSperre(medien = [], text = '') {
  const m = (Array.isArray(medien) ? medien : [medien]).filter(x => istModelMaterial(String(x || '')));
  if (!m.length) return null;
  if (text === null) return m.every(x => /markiert/i.test(String(x))) ? null
    : `Model-Material ohne eingebrannte Markierung (${MODEL_HANDLE}) in einem Kanal ohne Text — gesperrt.`;
  return String(text).toLowerCase().includes(MODEL_HANDLE.toLowerCase()) ? null
    : `Model-Markierung fehlt: ${MODEL_HANDLE} muss im Text stehen (Bedingung der Einwilligung, Betreiber 30.09. «immer markieren») — gesperrt.`;
}

// 30.09.2026: echte Instagram-Personenmarkierung (sie wird benachrichtigt), zusätzlich zum @-Handle im Text.
// Bild: Position Mitte; Reel: nur Name (Graph API). Leer, wenn kein Model-Material.
export function igUserTags(medien = [], typ = 'bild') {
  const m = (Array.isArray(medien) ? medien : [medien]).some(x => istModelMaterial(String(x || '')));
  if (!m) return {};
  const u = MODEL_HANDLE.replace(/^@/, '');
  return { user_tags: JSON.stringify(typ === 'reel' ? [{ username: u }] : [{ username: u, x: 0.5, y: 0.5 }]) };
}

export function markierungFehlt(medium = '', caption = '', zeilenId = '') {
  if (!istModelMaterial(medium, zeilenId)) return null;
  const c = String(caption).toLowerCase();
  if (c.includes(MODEL_HANDLE.toLowerCase())) return null;
  return `Model-Markierung fehlt: ${MODEL_HANDLE} muss in der Caption stehen `
       + `(Bedingung der Einwilligung, 04.09.2026) — Post gesperrt.`;
}

// ── NEUNTE SCHICHT: dieselbe WARENGRUPPE kurz hintereinander (Betreiber-Screenshot 23.09.2026, «pinke steine 2mal?»).
// «Rosenquarz Gua Sha Set» (02:11) und «Jade Roller Premium» (08:26) sind zwei Shop-Produkte mit zwei IDs, zwei Namen
// und zwei Bildern — jede Produkt-Sperre sagte zu Recht «kenne ich nicht». Im Raster standen trotzdem zweimal rosa
// Steine übereinander. Gruppen werden am TEXT erkannt (Caption/Titel); unbekannt = keine Gruppe = keine Sperre.
// Kanalübergreifend (Bild, Reel, Karussell) über EIN Ledger: dropship/_posted_familien.txt (iso \t familie \t kanal).
const F_LEDGER = 'dropship/_posted_familien.txt';
export const FAMILIEN_STUNDEN = Number(process.env.FAMILIEN_STUNDEN || 72);
const FAMILIEN = [
  ['gesichtsroller', /gua[\s-]?sha|jade[\s-]?roller|rosenquarz|gesichtsroller|face[\s-]?roller|ice[\s-]?roller/i],
  ['diffuser', /diffuser|duftzerstäuber|luftbefeuchter/i],
  ['uhr', /(?<![a-zäöü])(?:armband|damen|herren|quarz|smart)?uhr\b|\bwatch\b/i],
  ['massagegeraet', /massage(?:gerät|geraet|pistole|kissen)|mikrostrom|\bems\b/i],
  // 23.09.: nacktes «sternenhimmel» traf den «Hoodie mit Sternenhimmel-Muster» (Motiv, keine Ware) → nur als Lampe/Licht.
  ['projektor', /projektor|beamer|sternenhimmel[\s-]*(?:lampe|licht|nachtlicht)/i],
  ['futter-haustier', /futterspender|futternapf|schnüffel|leckmatte/i],
  ['lautsprecher', /lautsprecher|speaker|soundbox/i],
  ['bikini', /bikini|badeanzug/i],
  ['kerzenlicht', /kerzen(?:licht|wärmer|waermer)|flammen(?:lampe|licht)/i],
  ['augenbrauen', /augenbrauen|brow/i],
  // 23.09. Halloween: Kürbis-LED-Lampe (Reel) und Leuchtende Kürbis-Laterne (Karussell) sind zwei Produkte, fuer die
  // Betrachterin zweimal «leuchtender Kürbis» → eine Gruppe. Kissen/Korb/Schale in Kürbisform bleiben frei.
  ['kuerbis-licht', /k[uü]rbis[\s-]*(?:led[\s-]*)?(?:laterne|lampe|licht)|pumpkin[\s-]*(?:lantern|lamp)/i],
  ['schmuck-ring', /\bringe?\b(?![\s-]*licht)/i],
  ['ohrringe', /ohrring|ohrstecker|creolen/i],
];
export function warenFamilie(text = '') {
  const t = String(text);
  for (const [name, re] of FAMILIEN) if (re.test(t)) return name;
  return '';
}
function ladeFamilien() {
  try {
    return fs.readFileSync(F_LEDGER, 'utf8').split('\n').filter(Boolean).map(z => z.split('\t'));
  } catch { return []; }
}
/** Liefert {familie, vorStunden} wenn dieselbe Warengruppe innerhalb FAMILIEN_STUNDEN gepostet wurde, sonst null. */
export function familieKuerzlich(text, stunden = FAMILIEN_STUNDEN) {
  const f = warenFamilie(text); if (!f) return null;
  const grenze = Date.now() - stunden * 3600e3;
  for (const [iso, fam] of ladeFamilien().reverse()) {
    if (fam !== f) continue;
    const t = Date.parse(iso);
    if (t >= grenze) return { familie: f, vorStunden: Math.round((Date.now() - t) / 3600e3) };
  }
  return null;
}
export function familieMerken(text, kanal = '') {
  const f = warenFamilie(text); if (!f) return;
  fs.appendFileSync(F_LEDGER, `${new Date().toISOString()}\t${f}\t${kanal}\n`);
}

// 24.09.2026: Preis in Caption/Bild/Video ist eingebrannt. Nach dem Preisschutz (23'121 Varianten gehoben) warben wartende
// Posts mit dem alten, tieferen Preis. Liefert '' (ok) oder den Grund. Schwellen («Gratis-Versand ab CHF 50») zählen nicht.
export function preisVeraltet(caption = '', min = NaN, max = NaN) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  const rein = String(caption).replace(/(?:versand|lieferung|gratis|kostenlos)[^.\n]{0,25}?CHF\s?\d+(?:[.,]\d{2})?/gi, ' ');
  const aus = [...rein.matchAll(/CHF\s?(\d+[.,]\d{2})\b/g)].map(m => parseFloat(m[1].replace(',', '.'))).filter(x => !(x >= min - 0.005 && x <= max + 0.005));
  return aus.length ? `Caption ${aus.join('/')} ≠ live ${min.toFixed(2)}–${max.toFixed(2)}` : '';
}

// 25.09.2026 «herbstsachen auf sozial pushen»: SAISON-VORRANG fuer alle Poster. dropship/_social_vorrang.txt traegt Zeilen
// «handle<TAB>JJJJ-MM-TT» (geschrieben von social_saison_vorrang.py aus den Herbst-Favoriten). Wartende Zeilen, deren Caption
// einen dieser Handles verlinkt, kommen ZUERST dran — nur die Reihenfolge, nie die Kadenz; alle anderen Sperren gelten weiter.
// Gemessen vorher: 0 von 107 wartenden Reel-/Bild-Posts waren Herbstartikel (Nachschub nahm nur die neuesten CJ-Produkte).
export function vorrangHandles(datei = 'dropship/_social_vorrang.txt') {
  try {
    const heute = new Date().toISOString().slice(0, 10);
    return new Set(fs.readFileSync(datei, 'utf8').split('\n').map(z => z.split('\t'))
      .filter(([h, bis]) => h && h.trim() && (!bis || bis.trim() >= heute)).map(([h]) => h.trim().toLowerCase()));
  } catch { return new Set(); }
}
export function istVorrang(caption = '', set = vorrangHandles()) {
  const m = String(caption).toLowerCase().match(/\/products\/([a-z0-9-]+)/g) || [];
  return m.some(x => set.has(x.slice(10)));
}
export function nachVorrang(rows, captionVon, set = vorrangHandles()) {
  if (!set.size) return rows;
  // 28.09.2026: Reihenfolge der Vorrangliste zählt (Set behält die Einfügereihenfolge) — nachweislich gekaufte Artikel
  // stehen in der Datei vor der Saison-Ware und sollen auch zuerst gepostet werden; innerhalb gleicher Stufe bleibt die Queue-Folge.
  const rang = new Map([...set].map((h, i) => [h, i]));
  const stufe = r => Math.min(...(String(captionVon(r)).toLowerCase().match(/\/products\/([a-z0-9-]+)/g) || [])
    .map(x => rang.has(x.slice(10)) ? rang.get(x.slice(10)) : Infinity), Infinity);
  const v = rows.filter(r => istVorrang(captionVon(r), set));
  const vs = v.map((r, i) => [stufe(r), i, r]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  return [...vs, ...rows.filter(r => !v.includes(r))];
}

// 28.09.2026 SAMMELVIDEOS (Betreiber «push webseite», zuvor «gut» zu Halloween-/Herbst-Montage): Zeilen mit id «montage-…»
// gehen VOR allen anderen (sie zeigen 6 Produkte + luxestyle.ch am Schluss). Sie tragen keinen einzelnen Produkt-Link, also
// greift weder die Kaufbar- noch die Caption-Preisprüfung — deshalb prüft `montagePruefen` direkt vor dem Post alle 6
// eingebrannten Preise gegen den Shop (promo_montage.py --pruefen liest das Manifest im Video). Preis-Verlustschutz hebt
// gerade Tausende Preise an: ein Bildpreis von gestern kann heute falsch sein.
export function montageErst(rows, idVon) {
  const m = rows.filter(r => /^montage-/.test(idVon(r) || ''));
  return [...m, ...rows.filter(r => !m.includes(r))];
}
export function montageQuelle(videoUrl) {
  const lm = /\/social\/montage_proben\/([^/?#]+\.mp4)/.exec(videoUrl || '');
  return lm && fs.existsSync(`social/montage_proben/${lm[1]}`) ? `social/montage_proben/${lm[1]}` : '';
}
export function montagePruefen(videoUrl) {
  const q = montageQuelle(videoUrl);
  if (!q) return { ok: false, grund: 'Montage-Datei lokal nicht gefunden (social/montage_proben/)' };
  const r = spawnSync('python3', ['automation/reel/promo_montage.py', '--pruefen', q], { encoding: 'utf8', timeout: 300000 });
  const z = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop() || '';
  return { ok: r.status === 0, grund: z.slice(0, 200), quelle: q };
}

// 28.09.2026 (Betreiber «mache jede post ein meisterwerk in sozial media, jetzt hast du gemini» / «vision ai»):
// Gemini-Vision-Jury VOR jedem Post — sieht, was kein Zähler sieht (falscher Hook, Fremdtext, winziges Produkt, billige Wirkung).
// status 0 = Meisterwerk, 4 = durchgefallen (Zeile als jury-skip markieren), 2 = kein Urteil (diesen Lauf überspringen, später neu).
// JURY=0 schaltet sie ab (nur für Notfälle). Kalibrierung + Warteschlangen-Messung: dropship/GEMINI-JURY-2026-09-28.md.
export function juryPruefen(quelle, caption, typ = 'reel') {
  if (process.env.JURY === '0') return { status: 0, info: 'Jury aus (JURY=0)' };
  const r = spawnSync('python3', [new URL('./gemini_jury.py', import.meta.url).pathname, quelle, '--caption', String(caption || ''), '--typ', typ],
    { encoding: 'utf8', timeout: 400000 });
  const z = ((r.stdout || '').trim().split('\n').pop() || '');
  let v = {}; try { v = JSON.parse(z); } catch {}
  const info = v.schnitt != null ? `Note ${v.schnitt}${(v.ko || []).length ? ' K.o. ' + v.ko.join(',') : ''} — ${String(v.gruende || '').slice(0, 160)}`
    : String(v.grund || z).slice(0, 200);
  return { status: r.status === 0 ? 0 : (r.status === 4 ? 4 : 2), info };
}
