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
const LOCK = '/tmp/ig_post.lock';
const LEDGER = 'dropship/_posted_media.txt';
export const mediaKey = u => (u || '').split('?')[0].split('/').pop().toLowerCase().trim();

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
export const MODEL_HANDLE = '@tatjanalarsinamoira';
// Merkmale des Materials: die Dateinamen der Kundinnenfotos und des daraus gebauten Reels.
const MODEL_MEDIEN = /(^|[^a-z])(kundin-\d\d|luxestyle-model-(clean|musik))/i;

export function istModelMaterial(medium = '', zeilenId = '') {
  return MODEL_MEDIEN.test(String(medium)) || MODEL_MEDIEN.test(String(zeilenId));
}

export function markierungFehlt(medium = '', caption = '', zeilenId = '') {
  if (!istModelMaterial(medium, zeilenId)) return null;
  const c = String(caption).toLowerCase();
  if (c.includes(MODEL_HANDLE.toLowerCase())) return null;
  return `Model-Markierung fehlt: ${MODEL_HANDLE} muss in der Caption stehen `
       + `(Bedingung der Einwilligung, 04.09.2026) — Post gesperrt.`;
}
