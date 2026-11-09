// Test für apply.mjs mit einer Attrappe der Übersetzungs-API (kein Netz, kein Shop). Aufruf: node apply_test.mjs
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ZIELE, planen, pruefenNachher, lauf } from './apply.mjs';

let ok = 0, schlecht = 0;
const check = (name, bedingung, detail = '') => { if (bedingung) ok++; else { schlecht++; console.log('  FEHLER: ' + name + (detail ? ' → ' + detail : '')); } };

const digestVon = (key, wert) => 'D' + key.length + ':' + wert.length + ':' + [...wert].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 1000003, 7);

/** Baut eine Attrappe: zwei Ressourcen (Kopf, Fuss) mit allen Quellschlüsseln, französischem Altbestand wie am 09.11. */
function shop(opt = {}) {
  const kopfKeys = ZIELE.filter((z) => z.key.includes('header-group')), fussKeys = ZIELE.filter((z) => z.key.includes('footer-group'));
  const mk = (id, ziele) => ({
    resourceId: id,
    translatableContent: [...ziele.map((z) => ({ key: z.key, value: opt.quelle && opt.quelle[z.key] !== undefined ? opt.quelle[z.key] : z.de, digest: digestVon(z.key, opt.quelle && opt.quelle[z.key] !== undefined ? opt.quelle[z.key] : z.de) })),
      { key: id + '.fremd', value: 'Fremdtext', digest: 'Dfremd' }],
    translations: ziele.filter((z) => !(opt.ohneAlt || []).includes(z.key)).map((z) => ({ key: z.key, value: 'ALT ' + z.key.slice(-6), outdated: true })),
  });
  const st = { ressourcen: [mk('gid://shopify/OnlineStoreThemeSectionGroup/header-group?theme_id=1', kopfKeys), mk('gid://shopify/OnlineStoreThemeSectionGroup/footer-group?theme_id=1', fussKeys)], schreibaufrufe: [], entfernt: [] };
  if (opt.doppelt) st.ressourcen[1].translatableContent.push({ key: ZIELE[0].key, value: ZIELE[0].de, digest: 'x' });
  if (opt.fehlt) for (const r of st.ressourcen) r.translatableContent = r.translatableContent.filter((c) => c.key !== opt.fehlt);
  if (opt.vorbelegt) for (const r of st.ressourcen) for (const z of ZIELE) { const t = r.translations.find((x) => x.key === z.key); if (t) { t.value = z.fr; t.outdated = false; } else if (r.translatableContent.some((c) => c.key === z.key)) r.translations.push({ key: z.key, value: z.fr, outdated: false }); }
  const gql = async (q, v) => {
    if (/translatableResources/.test(q)) return { translatableResources: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: JSON.parse(JSON.stringify(st.ressourcen)) } };
    if (/translationsRegister/.test(q)) {
      st.schreibaufrufe.push(v);
      if (opt.registerFehler) return { translationsRegister: { userErrors: [{ field: ['x'], message: 'kaputt' }] } };
      const r = st.ressourcen.find((x) => x.resourceId === v.id); if (!r) return { translationsRegister: { userErrors: [{ message: 'Ressource unbekannt' }] } };
      for (const t of v.tr) {
        const c = r.translatableContent.find((x) => x.key === t.key);
        if (!c) return { translationsRegister: { userErrors: [{ message: 'Schlüssel unbekannt' }] } };
        if (t.translatableContentDigest !== c.digest) return { translationsRegister: { userErrors: [{ message: 'Digest passt nicht' }] } };
        if (t.locale !== 'fr') return { translationsRegister: { userErrors: [{ message: 'Sprache' }] } };
        if (opt.schluckt) continue; // Schreiben wird still ignoriert
        const alt = r.translations.find((x) => x.key === t.key);
        if (alt) { alt.value = t.value; alt.outdated = false; } else r.translations.push({ key: t.key, value: t.value, outdated: false });
      }
      return { translationsRegister: { userErrors: [] } };
    }
    if (/translationsRemove/.test(q)) {
      const r = st.ressourcen.find((x) => x.resourceId === v.id);
      r.translations = r.translations.filter((t) => !v.k.includes(t.key)); st.entfernt.push(...v.k);
      return { translationsRemove: { userErrors: [] } };
    }
    throw new Error('unbekannte Abfrage');
  };
  return { st, gql };
}
const stumm = () => { const zeilen = []; const log = (s) => zeilen.push(String(s)); log.zeilen = zeilen; return log; };
const tmp = () => mkdtempSync(path.join(tmpdir(), 'frlf-'));

// ---- Daten selbst ----
check('sechs Ziele', ZIELE.length === 6);
check('Schlüssel eindeutig', new Set(ZIELE.map((z) => z.key)).size === ZIELE.length);
check('jedes Ziel hat deutschen und französischen Text', ZIELE.every((z) => z.de && z.fr && z.de !== z.fr));
check('Rückgabe-Zusatz in Leiste 3 und Fusszeile französisch vorhanden', ZIELE.filter((z) => /refund-policy|30 jours de retour/.test(z.fr)).every((z) => /sauf articles personnalisés/.test(z.fr)));
check('kein Halloween mehr in den französischen Texten', !ZIELE.some((z) => /halloween/i.test(z.fr)));
check('Link der Zeile 4 trägt das Sprachpräfix /fr', ZIELE.find((z) => /link/.test(z.key)).fr.startsWith('/fr/'));
check('HTML der Fusszeile: gleiche Tags in de und fr', (() => { const z = ZIELE.find((x) => /text_lx_kontakt/.test(x.key)); const tags = (s) => (s.match(/<[^>]+>/g) || []).map((t) => t.replace(/>.*/, '').replace(/="[^"]*"/g, '')).join(''); return tags(z.de) === tags(z.fr); })());
check('Fusszeile: gleiche Links in de und fr', (() => { const z = ZIELE.find((x) => /text_lx_kontakt/.test(x.key)); const h = (s) => (s.match(/href="[^"]*"/g) || []).join('|'); return h(z.de) === h(z.fr); })());

// ---- Trockenlauf ----
{
  const { st, gql } = shop(); const dir = tmp(); const log = stumm();
  const r = await lauf({ gql, live: false, dir, log });
  check('Trockenlauf: Exit 0', r.exit === 0);
  check('Trockenlauf: sechs Einträge im Plan', r.plan.length === 6);
  check('Trockenlauf: schreibt nichts', st.schreibaufrufe.length === 0);
  check('Trockenlauf: legt keine Sicherung an', !existsSync(path.join(dir, 'sicherung', 'vorher.json')));
  check('Trockenlauf: Plan trägt Digest der richtigen Quelle', r.plan.every((p) => p.digest === digestVon(p.key, ZIELE.find((z) => z.key === p.key).de)));
  rmSync(dir, { recursive: true, force: true });
}

// ---- Live: schreibt, sichert, liest zurück ----
{
  const { st, gql } = shop(); const dir = tmp(); const log = stumm();
  const r = await lauf({ gql, live: true, dir, log });
  check('Live: Exit 0', r.exit === 0, JSON.stringify(log.zeilen.slice(-3)));
  check('Live: sechs Schreibaufrufe', st.schreibaufrufe.length === 6);
  check('Live: nur Sprache fr, nur Ziel-Schlüssel, je ein Eintrag', st.schreibaufrufe.every((v) => v.tr.length === 1 && v.tr[0].locale === 'fr' && ZIELE.some((z) => z.key === v.tr[0].key)));
  check('Live: Fremdschlüssel nie angefasst', st.ressourcen.every((r2) => !(r2.translations || []).some((t) => /fremd/.test(t.key))));
  check('Live: Zustand danach = Zieltext, nicht veraltet', pruefenNachher(st.ressourcen).length === 0);
  const s = JSON.parse(readFileSync(path.join(dir, 'sicherung', 'vorher.json'), 'utf8'));
  check('Sicherung: sechs Einträge mit altem Wert', s.eintraege.length === 6 && s.eintraege.every((e) => e.vorher && /^ALT /.test(e.vorher.value) && e.vorher.outdated === true));
  // zweiter Lauf: nichts mehr zu tun, Sicherung bleibt
  const vor = st.schreibaufrufe.length; const r2 = await lauf({ gql, live: true, dir, log: stumm() });
  check('zweiter Live-Lauf: Exit 0 ohne Schreiben (idempotent)', r2.exit === 0 && st.schreibaufrufe.length === vor);
  check('zweiter Live-Lauf: Sicherung unverändert', JSON.parse(readFileSync(path.join(dir, 'sicherung', 'vorher.json'), 'utf8')).eintraege[0].vorher.value.startsWith('ALT '));
  // Rücknahme
  const rz = await lauf({ gql, live: true, zurueck: true, dir, log: stumm() });
  check('Rücknahme: Exit 0', rz.exit === 0);
  check('Rücknahme: alte Werte stehen wieder da', st.ressourcen.flatMap((x) => x.translations).filter((t) => /^ALT /.test(t.value)).length === 6);
  rmSync(dir, { recursive: true, force: true });
}

// ---- Sicherung bleibt erhalten, auch wenn ein späterer Lauf noch etwas zu schreiben findet ----
{
  const { st, gql } = shop(); const dir = tmp();
  await lauf({ gql, live: true, dir, log: stumm() });
  // Abweichung nachträglich: eine Übersetzung wird (z. B. von Hand im Admin) verändert
  st.ressourcen[0].translations.find((t) => t.key === ZIELE[0].key).value = 'von Hand geändert';
  const vor = st.schreibaufrufe.length;
  const r = await lauf({ gql, live: true, dir, log: stumm() });
  check('Restarbeit: genau ein weiterer Schreibaufruf', r.exit === 0 && st.schreibaufrufe.length === vor + 1);
  const s = JSON.parse(readFileSync(path.join(dir, 'sicherung', 'vorher.json'), 'utf8'));
  check('Restarbeit: die erste Sicherung (sechs Schlüssel, Altwerte) bleibt unverändert', s.eintraege.length === 6 && s.eintraege.every((e) => /^ALT /.test(e.vorher.value)));
  rmSync(dir, { recursive: true, force: true });
}

// ---- pruefenNachher einzeln: jeder Fehlerzweig für sich ----
{
  const gut = () => shop({ vorbelegt: true }).st.ressourcen;
  check('pruefenNachher: alles richtig → keine Fehler', pruefenNachher(gut()).length === 0);
  { const r = gut(); r[0].translations.find((t) => t.key === ZIELE[0].key).value = 'falsch'; const f = pruefenNachher(r); check('pruefenNachher: falscher Wert (nicht veraltet) wird gemeldet', f.length === 1 && f[0].grund === 'Wert weicht ab', JSON.stringify(f)); }
  { const r = gut(); r[0].translations.find((t) => t.key === ZIELE[0].key).outdated = true; const f = pruefenNachher(r); check('pruefenNachher: richtiger Wert, aber veraltet wird gemeldet', f.length === 1 && f[0].grund === 'noch als veraltet markiert', JSON.stringify(f)); }
  { const r = gut(); r[0].translations = r[0].translations.filter((t) => t.key !== ZIELE[0].key); const f = pruefenNachher(r); check('pruefenNachher: fehlende Übersetzung wird gemeldet', f.length === 1 && f[0].grund === 'keine Übersetzung', JSON.stringify(f)); }
}

// ---- Rücknahme entfernt Übersetzungen, die es vorher nicht gab ----
{
  const link = ZIELE.find((z) => /link/.test(z.key)).key;
  const { st, gql } = shop({ ohneAlt: [link] }); const dir = tmp();
  await lauf({ gql, live: true, dir, log: stumm() });
  check('ohne Altwert: Sicherung merkt «keine Übersetzung»', JSON.parse(readFileSync(path.join(dir, 'sicherung', 'vorher.json'), 'utf8')).eintraege.find((e) => e.key === link).vorher === null);
  await lauf({ gql, live: true, zurueck: true, dir, log: stumm() });
  check('Rücknahme entfernt die neu angelegte Übersetzung', st.entfernt.includes(link) && !st.ressourcen.flatMap((x) => x.translations).some((t) => t.key === link));
  // Trockenlauf der Rücknahme schreibt nichts
  const n = st.schreibaufrufe.length; await lauf({ gql, live: false, zurueck: true, dir, log: stumm() });
  check('Rücknahme im Trockenlauf schreibt nichts', st.schreibaufrufe.length === n);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const { gql } = shop();
  const r = await lauf({ gql, live: true, zurueck: true, dir, log: stumm() });
  check('Rücknahme ohne Sicherung: Exit 2', r.exit === 2);
  rmSync(dir, { recursive: true, force: true });
}

// ---- Schutzregeln ----
{
  const k = ZIELE[2].key;
  const { st, gql } = shop({ quelle: { [k]: 'ganz andere deutsche Leiste' } }); const dir = tmp();
  const r = await lauf({ gql, live: true, dir, log: stumm() });
  check('Quelle weicht ab: Exit 2 und KEIN Schreibaufruf (auch nicht für die anderen)', r.exit === 2 && st.schreibaufrufe.length === 0);
  check('Quelle weicht ab: keine Sicherung angelegt', !existsSync(path.join(dir, 'sicherung', 'vorher.json')));
  rmSync(dir, { recursive: true, force: true });
}
{
  const { st, gql } = shop({ fehlt: ZIELE[4].key }); const r = await lauf({ gql, live: true, dir: tmp(), log: stumm() });
  check('Schlüssel fehlt: Exit 2, nichts geschrieben', r.exit === 2 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ doppelt: true }); const r = await lauf({ gql, live: true, dir: tmp(), log: stumm() });
  check('Schlüssel doppelt: Exit 2, nichts geschrieben', r.exit === 2 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ vorbelegt: true }); const r = await lauf({ gql, live: true, dir: tmp(), log: stumm() });
  check('schon richtig: Exit 0, nichts geschrieben', r.exit === 0 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ vorbelegt: true });
  // ein Ziel steht richtig, ist aber als veraltet markiert (Quelle hat sich zwischendurch geändert und wieder zurück): muss neu registriert werden
  st.ressourcen[0].translations.find((t) => t.key === ZIELE[0].key).outdated = true;
  const r = await lauf({ gql, live: true, dir: tmp(), log: stumm() });
  check('richtiger Text, aber veraltet: wird neu registriert', r.exit === 0 && st.schreibaufrufe.length === 1 && st.schreibaufrufe[0].tr[0].key === ZIELE[0].key);
}
{
  const { st: stF, gql } = shop({ registerFehler: true }); const dirF = tmp(); const r = await lauf({ gql, live: true, dir: dirF, log: stumm() });
  check('userErrors beim Schreiben: Exit 3', r.exit === 3);
  check('userErrors beim Schreiben: Abbruch beim ersten Fehler (genau ein Schreibaufruf)', stF.schreibaufrufe.length === 1);
  check('userErrors beim Schreiben: die Sicherung lag VOR dem ersten Schreiben schon da', existsSync(path.join(dirF, 'sicherung', 'vorher.json')));
}
{
  const { gql } = shop({ schluckt: true }); const r = await lauf({ gql, live: true, dir: tmp(), log: stumm() });
  check('Schreiben still ignoriert: das Rücklesen merkt es (Exit 3)', r.exit === 3 && r.fehler && r.fehler.length === 6);
}
// planen() direkt
{
  const res = shop().st.ressourcen;
  const p = planen(res);
  check('planen: Reihenfolge wie ZIELE', p.plan.map((x) => x.key).join() === ZIELE.map((z) => z.key).join());
  check('planen: Vorher-Zustand mitgeführt', p.plan.every((x) => x.vorher && x.vorher.outdated === true));
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
