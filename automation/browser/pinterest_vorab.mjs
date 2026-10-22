#!/usr/bin/env node
// pinterest_vorab.mjs — Vorab-Quittung für Pinterest-Pins (22.10.2026, nach unabhängiger Prüfung gehärtet).
//
// ANLASS (Inventur SOC-01): stirbt der Hetzner-Lauf NACH dem Klick auf «Veröffentlichen» (Platte voll, Neustart), bleibt die Quittung leer,
// und die Warteschlange liefert dasselbe Produkt wieder: GEMESSEN 13 überzählige Pins auf 10 Produkten seit 05.10. Darum VOR dem Klick eine Quittung,
// die schonGepinnt() kennt. Die erste Fassung (pinterest_pin_erstellen.mjs) war fail-OPEN (Schreibfehler → trotzdem geklickt), nicht atomar, nahm den
// Handle ungeprüft in den Dateinamen (../) und lag nur im Repo-Klon, den server/platte-schlank.sh löscht und neu klont.
//
// REGEL: Quittung in ZWEI Orte — VORAB_DIR (/var/lib/luxe-agent/pin-vorab, ausserhalb des Klons) und auftraege/erledigt (wird gepusht). Mindestens EIN Ort muss
// atomar (tmp + rename) geschrieben UND gelesen/geparst werden können, sonst wird NICHT geklickt. Der Handle darf nur [A-Za-z0-9_-] enthalten.
//   node automation/browser/pinterest_vorab.mjs --selbsttest
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VORAB_DIR = process.env.LUXE_PIN_VORAB || '/var/lib/luxe-agent/pin-vorab';

export function sauberHandle(h) {
  return typeof h === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(h) ? h.slice(0, 80) : null;
}

export function vorabSchreiben(handle, verzeichnisse, jetzt = new Date(), io = fs) {
  const name = sauberHandle(handle);
  const res = { ok: false, orte: [], fehler: [] };
  if (!name) { res.fehler.push('Handle ungültig (nur A-Z a-z 0-9 _ - erlaubt)'); return res; }
  const inhalt = JSON.stringify({ vorab: true, zeit: jetzt.toISOString(), teilergebnis: { unklar: [handle] } });
  for (const dir of verzeichnisse) {
    try {
      io.mkdirSync(dir, { recursive: true });
      const ziel = path.join(dir, `pinterest-pin-vorab-${name}.json`);
      const tmp = path.join(dir, `.tmp-pinterest-vorab-${name}-${process.pid}`);
      io.writeFileSync(tmp, inhalt);
      io.renameSync(tmp, ziel);
      const zurueck = JSON.parse(io.readFileSync(ziel, 'utf8'));
      if (!(zurueck.teilergebnis?.unklar || []).includes(handle)) throw new Error('Rücklesen ohne Handle');
      res.orte.push(ziel);
    } catch (e) { res.fehler.push(`${dir}: ${String(e).slice(0, 80)}`); }
  }
  res.ok = res.orte.length > 0;
  return res;
}

// alle schon gepinnten / unklaren Handles aus den Quittungen (pinterest-pin-*.json) in den angegebenen Verzeichnissen
export function schonGepinntAus(verzeichnisse) {
  const out = new Set();
  for (const dir of verzeichnisse) {
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (!/^pinterest-pin-/.test(f) || !f.endsWith('.json')) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const h of (d.ergebnis?.gepinnt || d.teilergebnis?.gepinnt || [])) out.add(h);
        for (const h of (d.ergebnis?.unklar || [])) out.add(h);
        for (const h of (d.teilergebnis?.unklar || [])) out.add(h);
      } catch {}
    }
  }
  return out;
}

function selbsttest() {
  const quelle = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const fehler = [];
  const faelle = async (m) => {
    const f = [];
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'pinvorab-'));
    const a = path.join(t, 'a'), b = path.join(t, 'b');
    const r = m.vorabSchreiben('retro-lampe-123', [a, b]);
    if (!r.ok || r.orte.length !== 2 || !fs.existsSync(path.join(a, 'pinterest-pin-vorab-retro-lampe-123.json'))) f.push('A normale Quittung muss in beide Orte');
    if (!m.schonGepinntAus([a]).has('retro-lampe-123')) f.push('B Quittung muss als «schon gepinnt/unklar» gelesen werden');
    if (fs.readdirSync(a).some(x => x.startsWith('.tmp-'))) f.push('C kein tmp-Rest nach dem Umbenennen');
    // «/../../x»: path.join rechnet «pinterest-pin-vorab-/../../x.json» zu «<t>/x.json» — ein Ausbruch um eine Ebene
    const bos = m.vorabSchreiben('/../../x', [a]);
    if (bos.ok || fs.readdirSync(t).length !== 2) f.push('D Handle mit ../ muss abgelehnt werden und nichts ausserhalb anlegen');
    fs.writeFileSync(path.join(t, 'datei'), 'x');
    const nur = m.vorabSchreiben('h1', [path.join(t, 'datei', 'unter'), b]);
    if (!nur.ok || nur.orte.length !== 1 || nur.fehler.length !== 1) f.push('E ein Ort kaputt, einer ok → ok mit Fehlerliste');
    const keiner = m.vorabSchreiben('h2', [path.join(t, 'datei', 'unter'), path.join(t, 'datei', 'zwei')]);
    if (keiner.ok) f.push('F kein Ort schreibbar → NICHT ok (fail-closed)');
    if (m.vorabSchreiben('', [a]).ok || m.vorabSchreiben(null, [a]).ok) f.push('G leerer/fehlender Handle abgelehnt');
    // H Rücklesen: liefert das Lesen etwas ohne den Handle (Platte kaputt/abgeschnitten), gilt die Quittung NICHT
    const kaputt = Object.assign({}, fs, { readFileSync: () => '{}' });
    if (m.vorabSchreiben('h3', [a], new Date(), kaputt).ok) f.push('H Quittung ohne Handle beim Rücklesen darf nicht gelten');
    fs.rmSync(t, { recursive: true, force: true });
    return f;
  };
  const mutanten = [
    ['kein Pfad-Schutz', "/^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(h) ? h.slice(0, 80) : null", 'h.slice(0, 80)'],
    ['fail-open', 'res.ok = res.orte.length > 0;', 'res.ok = true;'],
    ['ohne Rücklesen', "if (!(zurueck.teilergebnis?.unklar || []).includes(handle)) throw new Error('Rücklesen ohne Handle');", ''],
    ['nur ein Ort', 'for (const dir of verzeichnisse) {\n    try {\n      io.mkdirSync', 'for (const dir of verzeichnisse.slice(0, 1)) {\n    try {\n      io.mkdirSync'],
  ];
  return (async () => {
    fehler.push(...await faelle({ vorabSchreiben, schonGepinntAus }));
    let erkannt = 0;
    for (const [name, alt, neu] of mutanten) {
      if (!quelle.includes(alt)) { fehler.push(`Mutant «${name}»: Stelle fehlt`); continue; }
      const tmp = path.join(os.tmpdir(), `pinvorab-mut-${process.pid}.mjs`);
      fs.writeFileSync(tmp, quelle.replace(alt, neu).replace(/\nif \(process\.argv[\s\S]*$/, '\n'));
      const m = await import(tmp + '?m=' + Date.now());
      const f = await faelle(m);
      fs.rmSync(tmp, { force: true });
      if (f.length) erkannt++; else fehler.push(`Mutant «${name}» NICHT erkannt`);
    }
    if (fehler.length) { console.log('SELBSTTEST FEHLGESCHLAGEN:\n  ' + fehler.join('\n  ')); return 1; }
    console.log(`SELBSTTEST OK: 8 Fälle, ${erkannt}/${mutanten.length} Mutanten erkannt`);
    return 0;
  })();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && process.argv.includes('--selbsttest')) {
  selbsttest().then(c => process.exit(c));
}
