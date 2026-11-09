// Test für apply.mjs mit einer Attrappe der Übersetzungs-API (kein Netz, kein Shop). Aufruf: node apply_test.mjs
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ZIELE, planen, pruefenNachher, pruefenZurueck, lauf, gqlMit } from './apply.mjs';

let ok = 0, schlecht = 0;
const check = (name, bedingung, detail = '') => { if (bedingung) ok++; else { schlecht++; console.log('  FEHLER: ' + name + (detail ? ' → ' + detail : '')); } };
const keine = async () => {};

const digestVon = (key, wert) => 'D' + key.length + ':' + wert.length + ':' + [...wert].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 1000003, 7);
const klon = (x) => JSON.parse(JSON.stringify(x));

/** Baut eine Attrappe: zwei Ressourcen (Kopf, Fuss) mit allen Quellschlüsseln, französischem Altbestand wie am 09.11. */
function shop(opt = {}) {
  const kopf = ZIELE.filter((z) => z.key.includes('header-group')), fuss = ZIELE.filter((z) => z.key.includes('footer-group'));
  const q = (z) => (opt.quelle && opt.quelle[z.key] !== undefined ? opt.quelle[z.key] : z.de);
  const mk = (id, ziele) => ({
    resourceId: id,
    translatableContent: [...ziele.map((z) => ({ key: z.key, value: q(z), digest: digestVon(z.key, q(z)) })), { key: id + '.fremd', value: 'Fremdtext', digest: 'Dfremd' }],
    translations: ziele.filter((z) => !(opt.ohneAlt || []).includes(z.key)).map((z) => ({ key: z.key, value: 'ALT ' + z.key.slice(-6), outdated: true })),
  });
  const st = { ressourcen: [mk('gid://shopify/OnlineStoreThemeSectionGroup/header-group?theme_id=1', kopf), mk('gid://shopify/OnlineStoreThemeSectionGroup/footer-group?theme_id=1', fuss)], schreibaufrufe: [], entfernt: [], schluckt: !!opt.schluckt, fehlerBeiKey: opt.fehlerBeiKey || null, lesenAlt: 0, vorSchreiben: null, listenAufrufe: 0 };
  if (opt.doppelt) st.ressourcen[1].translatableContent.push({ key: ZIELE[0].key, value: ZIELE[0].de, digest: 'x' });
  if (opt.fehlt) for (const r of st.ressourcen) r.translatableContent = r.translatableContent.filter((c) => c.key !== opt.fehlt);
  if (opt.vorbelegt) for (const r of st.ressourcen) for (const z of ZIELE) { if ((opt.vorbelegt !== true) && !opt.vorbelegt.includes(z.key)) continue; const t = r.translations.find((x) => x.key === z.key); if (t) { t.value = z.fr; t.outdated = false; } else if (r.translatableContent.some((c) => c.key === z.key)) r.translations.push({ key: z.key, value: z.fr, outdated: false }); }
  const gql = async (q2, v) => {
    if (/translatableResources/.test(q2)) {
      st.listenAufrufe++;
      let quelle = st.ressourcen;
      if (st.lesenAlt > 0 && st.vorSchreiben) { st.lesenAlt--; quelle = st.vorSchreiben; }
      const alle = klon(quelle);
      if (opt.seitengroesse) {
        const ab = v.a ? parseInt(v.a, 10) : 0; const bis = ab + opt.seitengroesse;
        return { translatableResources: { pageInfo: { hasNextPage: bis < alle.length, endCursor: String(bis) }, nodes: alle.slice(ab, bis) } };
      }
      return { translatableResources: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: alle } };
    }
    if (/translationsRegister/.test(q2)) {
      st.schreibaufrufe.push(v);
      const r = st.ressourcen.find((x) => x.resourceId === v.id); if (!r) return { translationsRegister: { userErrors: [{ message: 'Ressource unbekannt' }] } };
      for (const t of v.tr) {
        if (st.fehlerBeiKey === t.key || opt.registerFehler) return { translationsRegister: { userErrors: [{ field: ['x'], message: 'kaputt' }] } };
        const c = r.translatableContent.find((x) => x.key === t.key);
        if (!c) return { translationsRegister: { userErrors: [{ message: 'Schlüssel unbekannt' }] } };
        if (t.translatableContentDigest !== c.digest) return { translationsRegister: { userErrors: [{ message: 'Digest passt nicht' }] } };
        if (t.locale !== 'fr') return { translationsRegister: { userErrors: [{ message: 'Sprache' }] } };
        if (st.schluckt) continue; // Schreiben wird still ignoriert
        if (!st.vorSchreiben) { st.vorSchreiben = klon(st.ressourcen); st.lesenAlt = opt.verzoegert || 0; }
        const alt = r.translations.find((x) => x.key === t.key);
        if (alt) { alt.value = t.value; alt.outdated = false; } else r.translations.push({ key: t.key, value: t.value, outdated: false });
      }
      return { translationsRegister: { userErrors: [] } };
    }
    if (/translationsRemove/.test(q2)) {
      const r = st.ressourcen.find((x) => x.resourceId === v.id);
      if (opt.entfernenFehler) return { translationsRemove: { userErrors: [{ message: 'Remove kaputt' }] } };
      if (!st.schluckt) r.translations = r.translations.filter((t) => !v.k.includes(t.key));
      st.entfernt.push(...v.k);
      return { translationsRemove: { userErrors: [] } };
    }
    throw new Error('unbekannte Abfrage');
  };
  return { st, gql };
}
const stumm = () => { const zeilen = []; const log = (s) => zeilen.push(String(s)); log.zeilen = zeilen; return log; };
const tmp = () => mkdtempSync(path.join(tmpdir(), 'frlf-'));
const sich = (dir) => JSON.parse(readFileSync(path.join(dir, 'sicherung', 'vorher.json'), 'utf8'));
const L = (o) => lauf({ warte: keine, log: stumm(), ...o });

// ---- Daten selbst ----
check('sechs Ziele', ZIELE.length === 6);
check('Schlüssel eindeutig', new Set(ZIELE.map((z) => z.key)).size === ZIELE.length);
check('jedes Ziel hat deutschen und französischen Text', ZIELE.every((z) => z.de && z.fr && z.de !== z.fr));
check('Rückgabe-Zusatz in Leiste 3 und Fusszeile französisch vorhanden', ZIELE.filter((z) => /refund-policy|30 jours de retour/.test(z.fr)).every((z) => /sauf articles personnalisés/.test(z.fr)));
check('kein Halloween mehr in den französischen Texten', !ZIELE.some((z) => /halloween/i.test(z.fr)));
check('Link der Zeile 4 trägt das Sprachpräfix /fr', ZIELE.find((z) => /link/.test(z.key)).fr.startsWith('/fr/'));
const fuss = ZIELE.find((x) => /text_lx_kontakt/.test(x.key));
check('HTML der Fusszeile: gleiche Tags in de und fr', (() => { const tags = (s) => (s.match(/<[^>]+>/g) || []).map((t) => t.replace(/>.*/, '').replace(/="[^"]*"/g, '')).join(''); return tags(fuss.de) === tags(fuss.fr); })());
check('Fusszeile: gleiche Links in de und fr (französisch mit /fr-Präfix für Richtlinien)', (() => { const h = (s) => (s.match(/href="[^"]*"/g) || []).map((x) => x.replace('href="/fr/', 'href="/')).join('|'); return h(fuss.de) === h(fuss.fr); })());
check('Fusszeile: alle drei Richtlinien-Links französisch mit /fr/policies/', (fuss.fr.match(/href="\/fr\/policies\/[a-z-]+"/g) || []).length === 3 && !/href="\/policies\//.test(fuss.fr));
check('Leiste 5: geschütztes Leerzeichen vor «:» und «%»', /articles :/.test(ZIELE[4].fr) && (ZIELE[4].fr.match(/ %/g) || []).length === 2 && !/ %/.test(ZIELE[4].fr));
check('kein «crypté», kein doppeltes «sur sur» (Prüfer-Funde)', !ZIELE.some((z) => /crypté/.test(z.fr)) && !ZIELE.some((z) => /\bsur\b.*\bsur\b/.test(z.fr)));

// ---- Trockenlauf ----
{
  const { st, gql } = shop(); const dir = tmp();
  const r = await L({ gql, live: false, dir });
  check('Trockenlauf: Exit 0', r.exit === 0);
  check('Trockenlauf: sechs Einträge im Plan', r.plan.length === 6);
  check('Trockenlauf: schreibt nichts', st.schreibaufrufe.length === 0);
  check('Trockenlauf: legt keine Sicherung an', !existsSync(path.join(dir, 'sicherung', 'vorher.json')));
  check('Trockenlauf: Plan trägt Digest der richtigen Quelle', r.plan.every((p) => p.digest === digestVon(p.key, ZIELE.find((z) => z.key === p.key).de)));
  rmSync(dir, { recursive: true, force: true });
}

// ---- Live: schreibt, sichert, liest zurück ----
{
  const { st, gql } = shop(); const dir = tmp();
  const r = await L({ gql, live: true, dir });
  check('Live: Exit 0', r.exit === 0);
  check('Live: sechs Schreibaufrufe', st.schreibaufrufe.length === 6);
  check('Live: nur Sprache fr, nur Ziel-Schlüssel, je ein Eintrag', st.schreibaufrufe.every((v) => v.tr.length === 1 && v.tr[0].locale === 'fr' && ZIELE.some((z) => z.key === v.tr[0].key)));
  check('Live: der Link-Schlüssel wird ZUERST geschrieben', /\.link:/.test(st.schreibaufrufe[0].tr[0].key));
  check('Live: Fremdschlüssel nie angefasst', st.ressourcen.every((r2) => !(r2.translations || []).some((t) => /fremd/.test(t.key))));
  check('Live: Zustand danach = Zieltext, nicht veraltet', pruefenNachher(st.ressourcen).length === 0);
  const s = sich(dir);
  check('Sicherung: sechs Einträge mit Altwert und Ressource', s.eintraege.length === 6 && s.eintraege.every((e) => e.vorher && /^ALT /.test(e.vorher.value) && e.vorher.outdated === true && /^gid:\/\/shopify\/OnlineStoreThemeSectionGroup\//.test(e.resourceId)));
  const vor = st.schreibaufrufe.length; const r2 = await L({ gql, live: true, dir });
  check('zweiter Live-Lauf: Exit 0 ohne Schreiben (idempotent)', r2.exit === 0 && st.schreibaufrufe.length === vor);
  check('zweiter Live-Lauf: Sicherung unverändert', sich(dir).eintraege.length === 6 && sich(dir).eintraege[0].vorher.value.startsWith('ALT '));
  const rz = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme: Exit 0', rz.exit === 0);
  check('Rücknahme: alte Werte stehen wieder da', st.ressourcen.flatMap((x) => x.translations).filter((t) => /^ALT /.test(t.value)).length === 6);
  rmSync(dir, { recursive: true, force: true });
}

// ---- Sicherung wird zusammengeführt, nie überschrieben (Prüfer-Fund) ----
{
  const { st, gql } = shop({ vorbelegt: [ZIELE[1].key] }); const dir = tmp();
  const r1 = await L({ gql, live: true, dir });
  check('Zusammenführen: erster Lauf schreibt 5 Schlüssel, Sicherung hat 5', r1.exit === 0 && st.schreibaufrufe.length === 5 && sich(dir).eintraege.length === 5 && !sich(dir).eintraege.some((e) => e.key === ZIELE[1].key));
  st.ressourcen[0].translations.find((t) => t.key === ZIELE[1].key).value = 'von Hand geändert';
  const vor = st.schreibaufrufe.length;
  const r2 = await L({ gql, live: true, dir });
  const s = sich(dir);
  check('Zusammenführen: zweiter Lauf schreibt genau den einen neuen Schlüssel', r2.exit === 0 && st.schreibaufrufe.length === vor + 1);
  check('Zusammenführen: Sicherung hat jetzt 6 Schlüssel', s.eintraege.length === 6);
  check('Zusammenführen: der neue Schlüssel trägt seinen Altwert (der Handänderung)', s.eintraege.find((e) => e.key === ZIELE[1].key).vorher.value === 'von Hand geändert');
  check('Zusammenführen: die ersten fünf behalten den echten Altwert', s.eintraege.filter((e) => e.key !== ZIELE[1].key).every((e) => /^ALT /.test(e.vorher.value)));
  const rz = await L({ gql, live: true, zurueck: true, dir });
  check('Zusammenführen: Rücknahme trifft alle sechs', rz.exit === 0 && st.ressourcen.flatMap((x) => x.translations).filter((t) => /^ALT /.test(t.value)).length === 5 && st.ressourcen[0].translations.find((t) => t.key === ZIELE[1].key).value === 'von Hand geändert');
  rmSync(dir, { recursive: true, force: true });
}

// ---- Rücknahme entfernt Übersetzungen, die es vorher nicht gab ----
{
  const link = ZIELE.find((z) => /link/.test(z.key)).key;
  const { st, gql } = shop({ ohneAlt: [link] }); const dir = tmp();
  await L({ gql, live: true, dir });
  check('ohne Altwert: Sicherung merkt «keine Übersetzung»', sich(dir).eintraege.find((e) => e.key === link).vorher === null);
  const rz = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme entfernt die neu angelegte Übersetzung (und liest zurück)', rz.exit === 0 && st.entfernt.includes(link) && !st.ressourcen.flatMap((x) => x.translations).some((t) => t.key === link));
  const n = st.schreibaufrufe.length; await L({ gql, live: false, zurueck: true, dir });
  check('Rücknahme im Trockenlauf schreibt nichts', st.schreibaufrufe.length === n);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const { gql } = shop();
  const r = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme ohne Sicherung: Exit 2', r.exit === 2);
  rmSync(dir, { recursive: true, force: true });
}

// ---- Rücknahme: Fehlerpfade (Prüfer-Funde) ----
{
  const { st, gql } = shop(); const dir = tmp(); await L({ gql, live: true, dir });
  st.ressourcen[0].translatableContent = st.ressourcen[0].translatableContent.filter((c) => c.key !== ZIELE[0].key);
  const n = st.schreibaufrufe.length; const r = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme: fehlender Schlüssel → Exit 2 (nicht 0), die übrigen werden trotzdem zurückgenommen', r.exit === 2 && st.schreibaufrufe.length === n + 5);
  rmSync(dir, { recursive: true, force: true });
}
{
  const { st, gql } = shop(); const dir = tmp(); await L({ gql, live: true, dir });
  const s = sich(dir); s.eintraege[0].resourceId = 'gid://shopify/OnlineStoreThemeSectionGroup/header-group?theme_id=999'; writeFileSync(path.join(dir, 'sicherung', 'vorher.json'), JSON.stringify(s));
  const n = st.schreibaufrufe.length; const r = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme: anderes Theme (resourceId weicht ab) → Exit 2 für diesen Schlüssel, die anderen werden zurückgenommen', r.exit === 2 && st.schreibaufrufe.length === n + 5);
  rmSync(dir, { recursive: true, force: true });
}
{
  const { st, gql } = shop(); const dir = tmp(); await L({ gql, live: true, dir });
  st.schluckt = true; // Rücknahme wird still ignoriert
  const r = await L({ gql, live: true, zurueck: true, dir });
  check('Rücknahme: still ignoriert → das Rücklesen merkt es (Exit 3)', r.exit === 3 && r.fehler && r.fehler.length > 0);
  rmSync(dir, { recursive: true, force: true });
}
{
  const link = ZIELE.find((z) => /link/.test(z.key)).key;
  const { gql } = shop({ ohneAlt: [link], entfernenFehler: true }); const dir = tmp(); await L({ gql, live: true, dir });
  const log = stumm(); const r = await L({ gql, live: true, zurueck: true, dir, log });
  check('Rücknahme: userErrors beim Entfernen → Exit 3', r.exit === 3);
  check('Rücknahme: der Fehler wird als solcher gemeldet (nicht erst vom Rücklesen)', log.zeilen.some((z) => /^\s+FEHLER /.test(z)) && !log.zeilen.some((z) => /RÜCKLESEN NACH RÜCKNAHME/.test(z)));
  rmSync(dir, { recursive: true, force: true });
}

// ---- Schutzregeln ----
{
  const k = ZIELE[2].key;
  const { st, gql } = shop({ quelle: { [k]: 'ganz andere deutsche Leiste' } }); const dir = tmp();
  const r = await L({ gql, live: true, dir });
  check('Quelle weicht ab: Exit 2 und KEIN Schreibaufruf (auch nicht für die anderen)', r.exit === 2 && st.schreibaufrufe.length === 0);
  check('Quelle weicht ab: keine Sicherung angelegt', !existsSync(path.join(dir, 'sicherung', 'vorher.json')));
  rmSync(dir, { recursive: true, force: true });
}
{
  const { st, gql } = shop({ fehlt: ZIELE[4].key }); const r = await L({ gql, live: true, dir: tmp() });
  check('Schlüssel fehlt: Exit 2, nichts geschrieben', r.exit === 2 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ doppelt: true }); const r = await L({ gql, live: true, dir: tmp() });
  check('Schlüssel doppelt: Exit 2, nichts geschrieben', r.exit === 2 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ vorbelegt: true }); const r = await L({ gql, live: true, dir: tmp() });
  check('schon richtig: Exit 0, nichts geschrieben', r.exit === 0 && st.schreibaufrufe.length === 0);
}
{
  const { st, gql } = shop({ vorbelegt: true });
  st.ressourcen[0].translations.find((t) => t.key === ZIELE[0].key).outdated = true;
  const r = await L({ gql, live: true, dir: tmp() });
  check('richtiger Text, aber veraltet: wird neu registriert', r.exit === 0 && st.schreibaufrufe.length === 1 && st.schreibaufrufe[0].tr[0].key === ZIELE[0].key);
}

// ---- Schreibfehler mitten im Lauf ----
{
  const { st, gql } = shop({ registerFehler: true }); const dirF = tmp(); const log = stumm();
  const r = await lauf({ gql, live: true, dir: dirF, log, warte: keine });
  check('userErrors beim Schreiben: Exit 3', r.exit === 3);
  check('userErrors beim Schreiben: Abbruch beim ersten Fehler (genau ein Schreibaufruf)', st.schreibaufrufe.length === 1);
  check('userErrors beim Schreiben: die Sicherung lag VOR dem ersten Schreiben schon da', existsSync(path.join(dirF, 'sicherung', 'vorher.json')));
  check('userErrors beim Schreiben: die Meldung nennt geschrieben/offen', log.zeilen.join('\n').includes('schon geschrieben: 0 · offen: 6'));
}
{
  const mitte = ZIELE[3].key; // der Link
  const { st, gql } = shop({ fehlerBeiKey: mitte }); const dir = tmp();
  const r = await L({ gql, live: true, dir });
  check('abgelehnter Link: Exit 3 und es wurde NICHTS ausser diesem Versuch geschrieben (Link läuft zuerst)', r.exit === 3 && st.schreibaufrufe.length === 1 && r.geschrieben.length === 0 && r.offen.length === 6);
}
{
  const letzter = ZIELE[5].key;
  const { st, gql } = shop({ fehlerBeiKey: letzter }); const dir = tmp();
  const r = await L({ gql, live: true, dir });
  check('Fehler beim letzten Schlüssel: Exit 3, die Meldung trennt geschrieben (5) von offen (1)', r.exit === 3 && r.geschrieben.length === 5 && r.offen.length === 1 && r.offen[0] === letzter);
}
{
  const { gql } = shop({ schluckt: true }); const r = await L({ gql, live: true, dir: tmp() });
  check('Schreiben still ignoriert: das Rücklesen merkt es (Exit 3)', r.exit === 3 && r.fehler && r.fehler.length === 6);
}

// ---- Rücklesen mit Wiederholung (Prüfer-Fund: Shop liest verzögert) ----
{
  const { gql } = shop({ verzoegert: 3 }); const warten = [];
  const r = await lauf({ gql, live: true, dir: tmp(), log: stumm(), warte: async (ms) => { warten.push(ms); } });
  check('verzögertes Lesen: nach Wiederholungen Exit 0', r.exit === 0, JSON.stringify(r.fehler || ''));
  check('verzögertes Lesen: es wurde gewartet (3 Mal) und nicht sofort aufgegeben', warten.length === 3);
}
{
  const { gql } = shop({ schluckt: true }); const warten = [];
  const r = await lauf({ gql, live: true, dir: tmp(), log: stumm(), warte: async (ms) => { warten.push(ms); } });
  check('dauerhaft abweichend: nach genau 7 Wartezeiten (8 Versuche) Exit 3', r.exit === 3 && warten.length === 7);
}

// ---- Mehrseitige Liste ----
{
  const { st, gql } = shop({ seitengroesse: 1 }); const r = await L({ gql, live: true, dir: tmp() });
  check('mehrseitige Antwort (eine Ressource je Seite): alles gefunden, sechs Schlüssel geschrieben', r.exit === 0 && st.schreibaufrufe.length === 6);
}

// ---- gqlMit: Token, Wiederholung, Fehlerformen (Prüfer-Funde) ----
{
  const antwort = (status, body) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
  const mitFolge = (folge) => { const aufrufe = []; const f = async (url, opt) => { aufrufe.push({ url, token: opt.headers['X-Shopify-Access-Token'] }); const n = folge[Math.min(aufrufe.length - 1, folge.length - 1)]; if (n instanceof Error) throw n; return n; }; f.aufrufe = aufrufe; return f; };
  const gut = antwort(200, { data: { ok: 1 } });
  { const f = mitFolge([antwort(401, 'Unauthorized'), gut]); let neu = 0; const g = gqlMit({ token: 'alt', tokenErneuern: async () => { neu++; return 'neu'; }, fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('401 → genau eine Token-Erneuerung, dann Erfolg mit neuem Token', d.ok === 1 && neu === 1 && f.aufrufe[0].token === 'alt' && f.aufrufe[1].token === 'neu'); }
  { const f = mitFolge([antwort(401, 'Unauthorized')]); let neu = 0; const g = gqlMit({ token: 'alt', tokenErneuern: async () => { neu++; return 'neu'; }, fetchImpl: f, warte: keine });
    const fehler = await g('q', {}).then(() => null, (e) => e.message); check('401 auch mit neuem Token → klarer Fehler, keine Endlosschleife', /401/.test(fehler || '') && neu === 1 && f.aufrufe.length === 2, String(fehler)); }
  { const f = mitFolge([antwort(200, '<html>Bad Gateway</html>'), gut]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('Nicht-JSON → Wiederholung statt Absturz', d.ok === 1 && f.aufrufe.length === 2); }
  { const f = mitFolge([antwort(200, '<html>Fehler</html>')]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const fehler = await g('q', {}).then(() => null, (e) => e.message); check('dauerhaft Nicht-JSON → klare Meldung', /kein JSON/.test(fehler || ''), String(fehler)); }
  { const f = mitFolge([antwort(200, { errors: 'Throttled' }), gut]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('errors als Zeichenkette (Throttled) → Wiederholung statt TypeError', d.ok === 1 && f.aufrufe.length === 2); }
  { const f = mitFolge([antwort(200, { errors: [{ message: 'Throttled' }] }), gut]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('errors als Liste (Throttled) → Wiederholung', d.ok === 1 && f.aufrufe.length === 2); }
  { const f = mitFolge([antwort(200, { errors: [{ message: 'Field x doesn\'t exist' }] })]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const fehler = await g('q', {}).then(() => null, (e) => e.message); check('echter GraphQL-Fehler → sofort Fehler, keine Wiederholung', /GraphQL/.test(fehler || '') && f.aufrufe.length === 1); }
  { const f = mitFolge([antwort(429, ''), antwort(503, ''), gut]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('429 und 503 → Wiederholung bis Erfolg', d.ok === 1 && f.aufrufe.length === 3); }
  { const f = mitFolge([new Error('ECONNRESET'), gut]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const d = await g('q', {}); check('Netzfehler → Wiederholung', d.ok === 1 && f.aufrufe.length === 2); }
  { const f = mitFolge([new Error('ECONNRESET')]); const g = gqlMit({ token: 't', fetchImpl: f, warte: keine });
    const fehler = await g('q', {}).then(() => null, (e) => e.message); check('dauerhafter Netzfehler → klare Meldung nach 5 Versuchen', /Netzfehler/.test(fehler || '') && f.aufrufe.length === 5); }
}

// ---- direkte Prüfungen ----
{
  const gut = () => shop({ vorbelegt: true }).st.ressourcen;
  check('pruefenNachher: alles richtig → keine Fehler', pruefenNachher(gut()).length === 0);
  { const r = gut(); r[0].translations.find((t) => t.key === ZIELE[0].key).value = 'falsch'; const f = pruefenNachher(r); check('pruefenNachher: falscher Wert (nicht veraltet) wird gemeldet', f.length === 1 && f[0].grund === 'Wert weicht ab', JSON.stringify(f)); }
  { const r = gut(); r[0].translations.find((t) => t.key === ZIELE[0].key).outdated = true; const f = pruefenNachher(r); check('pruefenNachher: richtiger Wert, aber veraltet wird gemeldet', f.length === 1 && f[0].grund === 'noch als veraltet markiert', JSON.stringify(f)); }
  { const r = gut(); r[0].translations = r[0].translations.filter((t) => t.key !== ZIELE[0].key); const f = pruefenNachher(r); check('pruefenNachher: fehlende Übersetzung wird gemeldet', f.length === 1 && f[0].grund === 'keine Übersetzung', JSON.stringify(f)); }
  { const r = shop().st.ressourcen; const e = [{ key: ZIELE[0].key, vorher: { value: 'ALT ' + ZIELE[0].key.slice(-6) } }, { key: ZIELE[1].key, vorher: null }];
    const f = pruefenZurueck(r, e); check('pruefenZurueck: Altwert da → ok; Übersetzung da, obwohl keine sein sollte → gemeldet', f.length === 1 && f[0].key === ZIELE[1].key, JSON.stringify(f)); }
  { const r = shop().st.ressourcen; const f = pruefenZurueck(r, [{ key: ZIELE[0].key, vorher: { value: 'etwas anderes' } }]); check('pruefenZurueck: falscher Altwert gemeldet', f.length === 1); }
  const p = planen(shop().st.ressourcen);
  check('planen: Reihenfolge wie ZIELE', p.plan.map((x) => x.key).join() === ZIELE.map((z) => z.key).join());
  check('planen: Vorher-Zustand mitgeführt', p.plan.every((x) => x.vorher && x.vorher.outdated === true));
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
