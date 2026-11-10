// Test des Ablaufs (ablauf.mjs) gegen eine Attrappe: kein Netz, keine Wartezeiten. Aufruf: node dropship/optik-1011/apply_test.mjs
import assert from 'node:assert/strict';
import { ablauf } from './ablauf.mjs';
import { anwenden, zuruecknehmen, MARKE, BLOCK } from './patch.mjs';

let n = 0;
const lauf = async (name, fn) => { try { await fn(); n++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const THEME = '<!doctype html><html><head><title>x</title><style id="lx-editor-vorlage-0911">a{b:c}</style></head><body>{{ content_for_layout }}</body></html>\n';
const hatBlock = (t) => t.includes(`id="${MARKE}`);

function fake(start, o = {}) {
  const st = { content: start, writes: [], lesen: 0, seiten: [], sicherung: null, log: [] };
  const d = {
    anwenden, zuruecknehmen, MARKE,
    log: (...a) => st.log.push(a.join(' ')),
    warte: async () => { st.warte = (st.warte || 0) + 1; if (o.warteWirft && o.warteWirft(st.warte)) throw new Error('Zeit kaputt'); },
    lesen: async () => {
      st.lesen++;
      if (o.lesenWirft && o.lesenWirft(st.lesen, st)) throw new Error('Netz weg');
      if (o.beimLesen) o.beimLesen(st);
      if (o.lesenErsatz) { const v = o.lesenErsatz(st.lesen, st); if (v !== undefined) return v; }
      return st.content;
    },
    schreiben: async (c) => {
      st.writes.push(c);
      if (o.schreibenWirft && o.schreibenWirft(st.writes.length)) { const e = new Error('userErrors X'); e.code = o.code; throw e; }
      if (!o.ignoriereSchreiben && !(o.ignoriereSchreibenAb && st.writes.length >= o.ignoriereSchreibenAb)) st.content = c;
      if (o.nachSchreiben) o.nachSchreiben(st, st.writes.length);
    },
    seite: async (u) => {
      st.seiten.push(u);
      if (o.seite) { const r = await o.seite(u, st); if (r) return r; }
      const b = hatBlock(st.content);
      const produkt = u.includes('/products/');
      const ids = b ? (produkt ? ['alle', 'produkt'] : ['alle', 'start']) : [];
      return { status: 200, text: ids.map((i) => `<style id="${MARKE}-${i}"></style>`).join('') + '<html></html>' };
    },
    sicherungLesen: () => st.sicherung,
    sicherungSchreiben: (t) => { if (o.sicherungWirft) throw new Error('Platte voll'); st.sicherung = t; },
  };
  return { st, d };
}
const live = { live: true, zurueck: false };

await lauf('Gutfall: Sicherung, ein Schreiben, Block genau einmal, Storefront geprüft, Exit 0', async () => {
  const { st, d } = fake(THEME);
  assert.equal(await ablauf(d, live), 0);
  assert.equal(st.writes.length, 1);
  assert.equal(st.content, anwenden(THEME));
  assert.equal(st.sicherung, THEME);
  assert.ok(st.seiten.some((u) => u.includes('/products/')) && st.seiten.some((u) => u === 'https://luxestyle.ch/'));
});
await lauf('Trockenlauf schreibt nichts, auch keine Sicherung', async () => {
  const { st, d } = fake(THEME);
  assert.equal(await ablauf(d, { live: false, zurueck: false }), 0);
  assert.equal(st.writes.length, 0); assert.equal(st.sicherung, null);
});
await lauf('schon eingespielt: Exit 3, nichts geschrieben', async () => {
  const { st, d } = fake(anwenden(THEME));
  assert.equal(await ablauf(d, live), 3); assert.equal(st.writes.length, 0);
});
await lauf('Anker fehlt oder doppelt: Exit 4, nichts geschrieben', async () => {
  for (const t of ['<html></html>', THEME + THEME]) { const { st, d } = fake(t); assert.equal(await ablauf(d, live), 4); assert.equal(st.writes.length, 0); }
});
await lauf('Datei nicht lesbar (null): Exit 4', async () => { const { d } = fake(null); assert.equal(await ablauf(d, live), 4); });
await lauf('Lesefehler beim ersten Lesen: Exit 4, nichts geschrieben', async () => {
  const { st, d } = fake(THEME, { lesenWirft: (k) => k === 1 }); assert.equal(await ablauf(d, live), 4); assert.equal(st.writes.length, 0);
});
await lauf('Fremdänderung zwischen erstem und zweitem Lesen: Exit 4, nichts geschrieben', async () => {
  const { st, d } = fake(THEME, { beimLesen: (s) => { if (s.lesen === 2) s.content += '<!-- fremd -->'; } });
  assert.equal(await ablauf(d, live), 4); assert.equal(st.writes.length, 0);
});
await lauf('userErrors beim Schreiben: Exit 5, Datei unverändert', async () => {
  const { st, d } = fake(THEME, { schreibenWirft: (k) => k === 1, code: 5 });
  assert.equal(await ablauf(d, live), 5); assert.equal(st.content, THEME);
});
await lauf('Rücklesen weicht ab (Schreiben kommt nicht an): Exit 6, kein zweites Schreiben, Datei unverändert', async () => {
  const { st, d } = fake(THEME, { ignoriereSchreiben: true });
  assert.equal(await ablauf(d, live), 6); assert.equal(st.writes.length, 1); assert.equal(st.content, THEME);
});
await lauf('Fremde Änderung während des Rücklesens: Rückweg entfernt NUR den Block, die fremde Änderung bleibt', async () => {
  const { st, d } = fake(THEME, { nachSchreiben: (s, k) => { if (k === 1) s.content += '<!-- fremd -->'; } });
  assert.equal(await ablauf(d, live), 6);
  assert.equal(st.content, THEME + '<!-- fremd -->');
});
await lauf('Seitenprüfung: Liquid-Fehler → Exit 7, Rückweg, fremde Änderung aus der Zwischenzeit bleibt', async () => {
  const { st, d } = fake(THEME, { seite: (u, s) => { if (u.includes('/products/')) { s.content += '<!-- fremd -->'; return { status: 200, text: 'Liquid error (layout/theme line 9): kaputt' }; } } });
  assert.equal(await ablauf(d, live), 7);
  assert.equal(st.content, THEME + '<!-- fremd -->');
  assert.ok(!hatBlock(st.content));
});
await lauf('Seitenprüfung: nur HTTP 429 → Exit 9 (nicht messbar), Rückweg aus Vorsicht, Startseite wird nicht zusätzlich belastet', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 429, text: 'slow down' }) });
  assert.equal(await ablauf(d, live), 9);
  assert.equal(st.content, THEME);
  assert.ok(st.seiten.every((u) => u.includes('/products/')), 'nur die Produktseite wurde abgerufen');
  assert.ok(st.seiten.length <= 8);
});
await lauf('Seitenprüfung: Netzfehler (Ausnahme in seite) zählt als nicht messbar: Exit 9, Datei unverändert', async () => {
  const { st, d } = fake(THEME, { seite: async () => { throw new Error('fetch failed'); } });
  assert.equal(await ablauf(d, live), 9); assert.equal(st.content, THEME);
});
await lauf('Seitenprüfung: Block nie sichtbar (Cache oder Fehler) → Exit 7, Rückweg', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 200, text: '<html>ohne Block</html>' }) });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME);
});
await lauf('Seitenprüfung: Produktseite 404 → Exit 7 (fehlgeschlagen, nicht «nicht messbar»), Rückweg', async () => {
  const { st, d } = fake(THEME, { seite: async (u) => (u.includes('/products/') ? { status: 404, text: 'weg' } : null) });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME);
  assert.ok(st.seiten.length <= 2, 'kein Wiederholen bei 404');
});
await lauf('Block fehlt in einer der Seiten (Startseite ohne «start»): Exit 7', async () => {
  const { st, d } = fake(THEME, { seite: async (u, s) => (u === 'https://luxestyle.ch/' ? { status: 200, text: `<style id="${MARKE}-alle"></style>` } : null) });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME);
});
await lauf('Ein einzelner Lesefehler beim Rücklesen rollt ein gutes Einspielen NICHT zurück: Exit 0', async () => {
  const { st, d } = fake(THEME, { lesenWirft: (k) => k === 3 });
  assert.equal(await ablauf(d, live), 0); assert.equal(st.content, anwenden(THEME));
});
await lauf('Lesen fällt nach dem Schreiben dauerhaft aus: Rückweg kann nicht prüfen → Exit 8, Meldung nennt die Sicherung', async () => {
  const { st, d } = fake(THEME, { lesenWirft: (k) => k >= 3 });
  assert.equal(await ablauf(d, live), 8);
  assert.ok(st.log.some((z) => /RÜCKWEG FEHLGESCHLAGEN/.test(z) && /Sicherung/.test(z)));
});
await lauf('Rückweg: ein einzelner Lesefehler wird wiederholt, danach läuft der Rückweg: Exit 7, Block weg', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 200, text: 'Liquid error' }), lesenWirft: (k) => k === 4 });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME);
});
await lauf('Rückweg: ein einzelner Schreibfehler wird wiederholt: Exit 7, Block weg', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 200, text: 'Liquid error' }), schreibenWirft: (k) => k === 2 });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME); assert.equal(st.writes.length, 3);
});
await lauf('Rückweg: ein veralteter Lesestand ohne Block wird nicht geglaubt (spätere Lesung zeigt ihn): Block wird entfernt', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 200, text: 'Liquid error' }), lesenErsatz: (k) => (k === 4 ? THEME : undefined) });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.content, THEME); assert.equal(st.writes.length, 2);
});
await lauf('Unerwartete Ausnahme nach dem Schreiben (hier: warte wirft): Rückweg läuft, Exit 10, Block weg', async () => {
  const { st, d } = fake(THEME, { warteWirft: (k) => k === 1 });
  assert.equal(await ablauf(d, live), 10); assert.equal(st.content, THEME);
});
await lauf('Sicherung nicht schreibbar (Platte voll): Exit 4, nichts geschrieben', async () => {
  const { st, d } = fake(THEME, { sicherungWirft: true }); assert.equal(await ablauf(d, live), 4); assert.equal(st.writes.length, 0);
});
await lauf('Veröffentlichtes Theme weicht ab: Exit 4, nichts gelesen, nichts geschrieben', async () => {
  const { st, d } = fake(THEME);
  assert.equal(await ablauf(d, { ...live, themeId: 'gid://shopify/OnlineStoreTheme/1', erwartetThemeId: 'gid://shopify/OnlineStoreTheme/2' }), 4);
  assert.equal(st.lesen, 0); assert.equal(st.writes.length, 0);
  const g = fake(THEME);
  assert.equal(await ablauf(g.d, { ...live, themeId: 'gid://shopify/OnlineStoreTheme/2', erwartetThemeId: 'gid://shopify/OnlineStoreTheme/2' }), 0);
});
await lauf('Rückweg scheitert selbst (Schreiben wirft): Exit 8, Meldung nennt die Sicherung', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 200, text: 'Liquid error' }), schreibenWirft: (k) => k >= 2 });
  assert.equal(await ablauf(d, live), 8);
  assert.ok(st.log.some((z) => /RÜCKWEG FEHLGESCHLAGEN/.test(z) && /Sicherung/.test(z)));
});
await lauf('Rückweg: der Block steht nicht mehr drin (jemand hat ihn entfernt): kein Schreiben, ursprünglicher Code', async () => {
  const { st, d } = fake(THEME, { seite: async (u, s) => { s.content = THEME; return { status: 200, text: 'Liquid error' }; } });
  assert.equal(await ablauf(d, live), 7); assert.equal(st.writes.length, 1);
});
await lauf('Rücknahme: entfernt nur den Block, spätere fremde Änderung bleibt, Exit 0', async () => {
  const { st, d } = fake(anwenden(THEME) + '<!-- fremd -->');
  st.sicherung = THEME;
  assert.equal(await ablauf(d, { live: true, zurueck: true }), 0);
  assert.equal(st.content, THEME + '<!-- fremd -->');
  assert.ok(st.log.some((z) => /weicht von der Sicherung ab/.test(z)));
});
await lauf('Rücknahme ohne Sicherungsdatei geht trotzdem (sie ist nur Zusatzprüfung)', async () => {
  const { st, d } = fake(anwenden(THEME)); st.sicherung = null;
  assert.equal(await ablauf(d, { live: true, zurueck: true }), 0); assert.equal(st.content, THEME);
});
await lauf('Rücknahme ohne Block: Exit 4, nichts geschrieben', async () => {
  const { st, d } = fake(THEME); assert.equal(await ablauf(d, { live: true, zurueck: true }), 4); assert.equal(st.writes.length, 0);
});
await lauf('Rücknahme mit doppeltem Block: Exit 4, nichts geschrieben', async () => {
  const { st, d } = fake(THEME.replace('</head>', BLOCK + BLOCK + '</head>')); assert.equal(await ablauf(d, { live: true, zurueck: true }), 4); assert.equal(st.writes.length, 0);
});
await lauf('Rücknahme als Trockenlauf schreibt nichts', async () => {
  const { st, d } = fake(anwenden(THEME)); assert.equal(await ablauf(d, { live: false, zurueck: true }), 0); assert.equal(st.writes.length, 0);
});
await lauf('Rücknahme: Storefront zeigt den Block weiterhin → Exit 7', async () => {
  const { d } = fake(anwenden(THEME), { seite: async () => ({ status: 200, text: `<style id="${MARKE}-alle"></style>` }) });
  assert.equal(await ablauf(d, { live: true, zurueck: true }), 7);
});

await lauf('Rückweg wirkt nicht (der Block bleibt in der Datei): Exit 8', async () => {
  const { d } = fake(THEME, { seite: async () => ({ status: 200, text: 'Liquid error' }), ignoriereSchreibenAb: 2 });
  assert.equal(await ablauf(d, live), 8);
});
await lauf('Rückweg: Datei nicht lesbar (null) → Exit 8', async () => {
  const { st, d } = fake(THEME, { seite: async (u, s) => { s.content = null; return { status: 200, text: 'Liquid error' }; } });
  assert.equal(await ablauf(d, live), 8); assert.equal(st.writes.length, 1);
});
await lauf('Schreiben wirft ohne Code (Netz, Throttled): Exit 10, nicht 5', async () => {
  const { st, d } = fake(THEME, { schreibenWirft: (k) => k === 1 });
  assert.equal(await ablauf(d, live), 10); assert.equal(st.content, THEME);
});
await lauf('Seitenprüfung: nur HTTP 503 → Exit 9, Datei unverändert', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 503, text: 'wartung' }) });
  assert.equal(await ablauf(d, live), 9); assert.equal(st.content, THEME);
});
await lauf('Seitenprüfung: nur HTTP 403 (Bot-Prüfung) → Exit 9, Datei unverändert', async () => {
  const { st, d } = fake(THEME, { seite: async () => ({ status: 403, text: 'Verifying your connection' }) });
  assert.equal(await ablauf(d, live), 9); assert.equal(st.content, THEME);
});

console.log(n + ' Prüfungen bestanden' + (process.exitCode ? ', ABER mit Fehlern' : ''));
