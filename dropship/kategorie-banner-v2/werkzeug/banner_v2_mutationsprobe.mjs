// Mutationsprobe für banner_v2_lib.mjs: jeder Mutant ändert eine Regel; der Test muss ihn erkennen (Exit ≠ 0).
// Ausgangslage zuerst: der unveränderte Test muss grün sein, sonst zählt die Probe nicht.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLE = readFileSync(join(HIER, 'banner_v2_lib.mjs'), 'utf8');
const M = [
  ['Tor: Status egal', "if (!p || p.status !== 'ACTIVE')", "if (!p || p.status === 'X')"],
  ['Tor: ausverkauft egal', 'if (p.tracksInventory === true && !(Number(p.totalInventory) > 0))', 'if (false)'],
  ['Tor: Onlineshop egal', "if (!p.onlineStoreUrl) return nein('nicht-im-onlineshop');", ''],
  ['Tor: Sperrliste egal', "if (sperrHandles.has(p.handle)) return nein('sperrliste');", ''],
  ['Tor: Marken egal', "if (MARKEN.test(titel)) return nein('marke-titel');", ''],
  ['Saison: Sommer nur Dezember', '(m >= 11 || m <= 3) && SOMMER', '(m >= 12 || m <= 3) && SOMMER'],
  ['Saison: Ausnahme Sommer-Kategorie weg', "SOMMER.test(titel || '') && !SOMMER.test(katText)", "SOMMER.test(titel || '')"],
  ['Bonus: Fasnacht ab 1.11.', '(m === 11 && t >= 11)', '(m === 11)'],
  ['Bonus: Nikolaus-Kostüm zählt als Fasnacht', "|| /kost(ü|ue)m|verkleid/i.test(typ || '')) && !WEIHNACHT.test(titel || '')) return 2;", "|| /kost(ü|ue)m|verkleid/i.test(typ || ''))) return 2;"],
  ['Bonus: Produktart egal', "(FASNACHT.test(titel || '') || /kost(ü|ue)m|verkleid/i.test(typ || ''))", "FASNACHT.test(titel || '')"],
  ['bewährt: 3 Stimmen egal', 'rating >= 4 && anzahl >= 3', 'rating >= 4'],
  ['Kandidaten: Doppel bleiben', 'if (gesehen.has(k)) continue;', ''],
  ['Rand: ruhig ab 50 %', 'minRuhig = 0.92', 'minRuhig = 0.5'],
  ['Rahmen: Rauschgrenze weg', 'const minZ = Math.max(1, Math.ceil(minAnteil * w)), minS = Math.max(1, Math.ceil(minAnteil * h));', 'const minZ = 1, minS = 1;'],
  ['Einpassen: Zoom ungedeckelt', 'Math.min(innenW / cw, innenH / ch, maxZoom)', 'Math.min(innenW / cw, innenH / ch)'],
  ['Quadrat: zu klein egal', 'if (plan.produktAnteil < minAnteil)', 'if (false)'],
  ['Quadrat: S ungerade erlaubt', 'S -= S % 2;', ''],
  ['Kante: Toleranz 60', "export function kantenAnteil(rgb, n, crop, w, h, bg, { tol = 12 } = {}) {", "export function kantenAnteil(rgb, n, crop, w, h, bg, { tol = 60 } = {}) {"],
  ['Kante: Bildrand zählt mit', "seite(crop.x > 0, bereich(y0, y1).map(y => [x0, y]));", "seite(true, bereich(y0, y1).map(y => [x0, y]));"],
  ['Zuschnitt: Richtung vertauscht', 'if (srcA > zielAspect)', 'if (srcA < zielAspect)'],
  ['Urteil: fehlendes Feld ok', "if (typeof c[f] !== 'boolean') gruende.push('feld-fehlt:' + f); else if (c[f]) gruende.push(f);", 'if (c[f] === true) gruende.push(f);'],
  ['Punkte: Füllgrad egal', "  s += Math.min(0.5, F) * 4;", ""],
  ['Punkte: Gemini-Befund egal', 'if (k.urteil && k.urteil.ok === false) return -Infinity;', ''],
  ['Quadrat: belegte Produkte egal', 'const frei = k => !belegtProdukte.has(k.produktId) && ', 'const frei = k => '],
  ['Kopf: Belegung egal', '&& (belegung.get(k.produktId) || 0) < maxBelegung', ''],
  ['Kopf: auch Galeriebilder', 'const tauglich = kandidaten.filter(k => k.titelbild && ', 'const tauglich = kandidaten.filter(k => '],
  ['Kopf: ungeprüft immer erlaubt', '(k.urteil?.ok === true || (kiAus && !k.urteil))', '(k.urteil?.ok === true || !k.urteil)'],
  ['Kopf: Produktart egal', 'if (typ && (jeTyp.get(typ) || 0) >= maxJeTyp)', 'if (false)'],
  ['Klasse: KI nie erkannt', "if (/_result|^oig\\d*$|[-_]ai[-_]\\d+$|dall-?e|midjourney|firefly/i.test(stamm)) return 'ki';", ''],
  ['Entscheid: Pinnwand wird ersetzt', "if (a.klasse === 'pinnwand' && !force)", 'if (false)'],
  ['Entscheid: Doppel ab 5', 'if ((a.doppelt || 0) >= 1)', 'if ((a.doppelt || 0) >= 5)'],
  ['Entscheid: Quelle Entwurf egal', "if (a.quelle?.gefunden && a.quelle.lieferbar === false) g.push", "if (false) g.push"],
  ['Alt-Text: Füllwort bleibt', 'for (let i = 0; i < 5 && FUELL.test(motiv); i++)', 'for (let i = 0; i < 0 && FUELL.test(motiv); i++)'],
  ['dHash: Vergleich vertauscht', "grau[y * 9 + x] > grau[y * 9 + x + 1] ? '1' : '0'", "grau[y * 9 + x] < grau[y * 9 + x + 1] ? '1' : '0'"],
  ['Plan-Alter: zehnfach', 'jetzt.getTime() - t <= maxH * 3600e3', 'jetzt.getTime() - t <= maxH * 3600e4'],
  ['Deckel: ohne Höchstwert', 'return Math.min(max, Number.isFinite(v) && v > 0 ? v : vorgabe);', 'return Number.isFinite(v) && v > 0 ? v : vorgabe;'],
  ['Basis: Alt-Text egal', "if (String(basis.bild?.altText || '') !== String(aktuell.bild?.altText || '')) d.push('alt');", ''],
  ['Rücklesen: unverändertes Bild egal', "if (soll.bild.neueDatei && bildGleich(ist.bild, vorher.bild)) d.push('bild-unveraendert');", ''],
  ['Rücklesen: nur Dateiname verglichen', "if (soll.bild.neueDatei && bildGleich(ist.bild, vorher.bild)) d.push('bild-unveraendert');", "if (soll.bild.neueDatei && urlStamm(ist.bild.url) === urlStamm(vorher.bild?.url)) d.push('bild-unveraendert');"],
  ['bildGleich: Alt-Text egal', "if (String(a.altText || '') !== String(b.altText || '')) return false;", ''],
  ['bildGleich: Masse egal', "return m(a.width, b.width) && m(a.height, b.height);", 'return true;'],
  ['bildGleich: Dateiname egal', "if (urlStamm(a.url) !== urlStamm(b.url)) return false;", ''],
  ['Ledger: jede Rücknahme löscht', 'else if (z.art === \'zurueck\' && offen.get(z.handle)?.lauf === z.lauf) offen.delete(z.handle);', "else if (z.art === 'zurueck') offen.delete(z.handle);"],
  ['Rücknahme: fremd überschreiben', "if (w.includes('fremd') && !fremdUeberschreiben) return { aktion: 'fremd', teile };", ''],
  ['Entscheid: vollständig gesucht egal', "if (!a.quelle?.gefunden && a.quelle?.vollstaendig === true && a.klasse === 'foto') g.push", "if (false) g.push"],
  ['Entscheid: vollständig auch bei abgebrochener Suche', "a.quelle?.vollstaendig === true && a.klasse === 'foto'", "a.klasse === 'foto'"],
  ['Ledger-Belegung: auch zurückgenommene', "for (const [h, z] of offeneAenderungen(zeilen)) if (!ohne.has(h)", "for (const [h, z] of zeilen.map(x => [x.handle, x])) if (!ohne.has(h)"],
  ['Ledger-Belegung: eigene Sammlungen nicht ausgenommen', "if (!ohne.has(h) && z.teile?.includes('bild')", "if (z.teile?.includes('bild')"],
  ['Rücklesen: Masse egal', "if (soll.bild.w && (Number(ist.bild.width) !== soll.bild.w || Number(ist.bild.height) !== soll.bild.h))", "if (false)"],
  ['Urteil: Nachbildung nicht geprüft', "export const PRUEF_FELDER_NEIN = ['text', 'infografik', 'collage', 'logo_marke', 'wasserzeichen', 'nachbildung', 'wirkversprechen', 'anstoessig'];", "export const PRUEF_FELDER_NEIN = ['text', 'infografik', 'collage', 'logo_marke', 'wasserzeichen', 'wirkversprechen', 'anstoessig'];"],
  ['kopfWert: keine Normalisierung', "if (s.startsWith('[')) { try { return JSON.stringify(JSON.parse(s)); } catch { return s; } }", ''],
];
const tmp = mkdtempSync(join(tmpdir(), 'bv2-'));
const lauf = pfad => spawnSync(process.execPath, [join(HIER, 'banner_v2_test.mjs')], { env: { ...process.env, LIB_PFAD: pfad }, encoding: 'utf8' });
const basis = lauf(join(HIER, 'banner_v2_lib.mjs'));
if (basis.status !== 0) { console.log('Ausgangslage ROT, Probe ungültig:\n' + basis.stdout); process.exit(2); }
let erkannt = 0, ueberlebt = 0, nichtAnwendbar = 0, ungeklaert = 0;
for (const [name, alt, neu] of M) {
  if (!QUELLE.includes(alt)) { console.log(`? ${name}: Muster nicht gefunden`); nichtAnwendbar++; continue; }
  const datei = join(tmp, 'lib.mjs'); writeFileSync(datei, QUELLE.replace(alt, neu));
  const r = lauf(datei);
  if (r.status !== 0 && /FEHLGESCHLAGEN/.test(r.stdout)) { erkannt++; }
  else if (r.status !== 0) { console.log(`? ${name}: Absturz statt Fehlschlag (${(r.stderr || '').split('\n')[0]})`); ungeklaert++; }
  else { ueberlebt++; console.log(`✗ überlebt: ${name}`); }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Mutationsprobe: ${erkannt} von ${M.length} erkannt, ${ueberlebt} überlebt, ${ungeklaert} ungeklärt (Absturz), ${nichtAnwendbar} nicht anwendbar`);
process.exit(ueberlebt || nichtAnwendbar || ungeklaert ? 1 : 0);
