// social_pause.mjs — fragt, ob eine Queue-Zeile Ware bewirbt, die gerade eine Anlass-Social-Sperre hat (13.10.2026).
//
// Quelle: dropship/_social_pause.txt, geschrieben von automation/anlass_social_sperre.py --scharf (täglich im Aufseher).
// Kopf «# <anlass>\t<ab>\t<bis>\t<tag>», danach Schlüssel pid:<Shopify-ID> · h:<handle> · titel:<erste Caption-Zeile klein>
// · zeile:<Queue-Zeilen-ID>. Ausserhalb [ab, bis) gilt die Datei nicht (fail-open nach dem Anlass, nie über «bis» hinaus).
//
// WARUM: Die Poster prüfen nur ACTIVE + onlineStoreUrl. Die Abmeldung aus TikTok/FB-IG/Pinterest ändert daran nichts —
// ein Halloween-Kostüm (CJ, Ankunft nach dem 31.10.) bliebe für meta_reel_post/metricool_tiktok_post «kaufbar».
// Nutzung im Poster (eine Zeile vor dem Claim):
//   import { socialPause } from './lib/social_pause.mjs';
//   const sp = socialPause({ id, caption, produkte }); if (sp) { status = 'social-pause-skip'; … weiter/Exit 3 }
import fs from 'fs';

const DATEI = new URL('../../dropship/_social_pause.txt', import.meta.url).pathname;
const STORY_KUERZE = 74;   // story_bauen.py: f"story-{handle}"[:80]

export function pauseSchluessel(datei = DATEI, jetzt = new Date()) {
  let roh = '';
  try { roh = fs.readFileSync(datei, 'utf8'); } catch { return new Set(); }
  const zeilen = roh.split('\n').map(z => z.trim()).filter(Boolean);
  const aus = new Set();
  let gilt = false;
  for (const z of zeilen) {
    if (z.startsWith('#')) {
      const [, ab, bis] = z.slice(1).trim().split('\t');
      gilt = !!(ab && bis) && jetzt >= new Date(ab) && jetzt < new Date(bis);
      continue;
    }
    if (gilt) aus.add(z);
  }
  return aus;
}

// Gleiche Zuordnung wie anlass_social_sperre.zeile_treffer (Python) — dort mit Selbsttest abgesichert.
export function socialPause(row, schluessel = pauseSchluessel()) {
  if (!schluessel.size) return '';
  const zid = String(row.id || row.slug || '').trim();
  const cap = String(row.caption || row.text || '');
  if (zid && schluessel.has('zeile:' + zid)) return 'zeile:' + zid;
  const m = /(\d{12,15})\s*$/.exec(zid);
  if (m && !zid.startsWith('cjreel-') && schluessel.has('pid:' + m[1])) return 'pid:' + m[1];
  for (const h of cap.matchAll(/\/products\/([a-z0-9][a-z0-9-]*)/g)) if (schluessel.has('h:' + h[1])) return 'h:' + h[1];
  const kand = [zid.replace(/^bildreel-/, ''), zid.replace(/^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto|story)-/, '')];
  for (const k of [...kand, ...kand.map(k => k.replace(/-\d{1,8}$/, '')), ...String(row.produkte || '').split(/\s+/)])
    if (k && schluessel.has('h:' + k)) return 'h:' + k;
  // Story-IDs sind «story-<handle[:74]>» (story_bauen.py) → gekürzten Handle per Präfix vergleichen (13.10. abends)
  if (zid.startsWith('story-') && zid.length - 6 >= STORY_KUERZE) {
    const rest = zid.slice(6);
    for (const k of [...schluessel].sort()) if (k.startsWith('h:' + rest)) return k;
  }
  const erste = cap.replace(/⏎/g, '\n').split('\n')[0].trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s+·\s+chf.*$/, '');
  if (erste && schluessel.has('titel:' + erste)) return 'titel:' + erste;
  return '';
}

// Selbsttest: node automation/lib/social_pause.mjs --selbsttest  (liest die echte Pause-Datei, simuliert das Datum)
export function selbsttest(datei = DATEI) {
  const fehler = [];
  const pruef = (name, ist, soll) => { if (ist !== soll) fehler.push(`${name}: ist ${ist}, soll ${soll}`); };
  // 1) Zuordnung mit festen Schlüsseln (unabhängig von der Datei)
  const lang = 'halloween-deko-realistische-kunststoffkette-mit-totenkopf-und-spinnennetz-fuer-garten-658880';
  const k = new Set(['pid:15452605448577', 'h:halloween-kostum-fur-hunde', 'h:' + lang, 'titel:halloween-kostüm für hunde',
    'zeile:cjreel-1']);
  const faelle = [[{ id: 'kimi-x-15452605448577' }, true], [{ id: 'bildreel-halloween-kostum-fur-hunde' }, true],
    [{ id: 'fresh-halloween-kostum-fur-hunde-123456' }, true], [{ id: 'cjreel-1' }, true],
    [{ id: 'x', caption: 'Neu ➜ luxestyle.ch/products/halloween-kostum-fur-hunde?x=1' }, true],
    [{ slug: 's', produkte: 'a halloween-kostum-fur-hunde b' }, true],
    [{ id: 'cjreel-2', caption: 'Halloween-Kostüm für Hunde\nCHF 19.90' }, true],
    [{ id: 'story-halloween-kostum-fur-hunde' }, true], [{ id: 'story-' + lang.slice(0, 74) }, true],
    [{ id: 'story-halloween-kostum' }, false], [{ id: 'kimi-y-15452605448578', caption: 'Kürbis-Kissen\nCHF 9' }, false],
    [{ id: 'bildreel-halloween-kostum-fur-hunde-xl' }, false]];
  for (const [row, soll] of faelle) pruef('Zuordnung ' + JSON.stringify(row), !!socialPause(row, k), soll);
  // 2) Fenster mit der echten Datei: vor «ab» nie, im Fenster für jeden Schlüssel, ab «bis» nie
  let kopf = null, roh = '';
  try { roh = fs.readFileSync(datei, 'utf8'); } catch { fehler.push('Pause-Datei fehlt'); }
  const zeilen = roh.split('\n').map(z => z.trim()).filter(Boolean);
  for (const z of zeilen) if (z.startsWith('#')) { kopf = z.slice(1).trim().split('\t'); break; }
  const schl = zeilen.filter(z => !z.startsWith('#'));
  let n = 0;
  if (kopf && kopf[1] && kopf[2]) {
    const ab = new Date(kopf[1]), bis = new Date(kopf[2]);
    const vor = pauseSchluessel(datei, new Date(ab.getTime() - 1000));
    const im = pauseSchluessel(datei, ab);
    const spaet = pauseSchluessel(datei, new Date(bis.getTime() - 1000));
    const nach = pauseSchluessel(datei, bis);
    pruef('vor «ab» leer', vor.size, 0);
    pruef('ab «bis» leer', nach.size, 0);
    pruef('im Fenster alle', im.size, new Set(schl).size);
    pruef('letzte Sekunde alle', spaet.size, new Set(schl).size);
    for (const z of schl) {
      const [art, wert] = [z.slice(0, z.indexOf(':')), z.slice(z.indexOf(':') + 1)];
      const row = art === 'pid' ? { id: 'kimi-x-' + wert } : art === 'h' ? { id: 'bildreel-' + wert }
        : art === 'titel' ? { id: 'q', caption: wert } : { id: wert };
      pruef('vor ' + z, socialPause(row, vor), '');
      pruef('nach ' + z, socialPause(row, nach), '');
      if (!socialPause(row, im)) fehler.push('im Fenster nicht getroffen: ' + z);
      n++;
    }
  } else if (schl.length) fehler.push('Pause-Datei ohne Kopf, aber mit Schlüsseln');
  return { ok: !fehler.length, fehler, faelle: faelle.length, schluessel: n, kopf };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1] && process.argv.includes('--selbsttest')) {
  const r = selbsttest();
  for (const f of r.fehler.slice(0, 20)) console.log('✗ ' + f);
  console.log(`SOCIAL-PAUSE SELBSTTEST ${r.ok ? 'OK' : 'ROT'} · Zuordnung ${r.faelle} Fälle · ${r.schluessel} Schlüssel ` +
    `der Datei vor/im/nach Fenster ${r.kopf ? r.kopf[1] + ' – ' + r.kopf[2] : '(kein Kopf)'}`);
  process.exit(r.ok ? 0 : 1);
}
