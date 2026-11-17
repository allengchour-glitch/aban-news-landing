// Test für sammlungstexte.mjs (Sammlungstexte ohne Silber-Feingehaltsangabe): Tore, Trockenlauf, Schreiben, Rücklesen, Idempotenz, Rücknahme, fremde Änderung.
// Der Shop ist eine strenge Attrappe: sie lehnt unbekannte Abfragen, unbenutzte oder fehlende Variablen und doppelte Schlüssel ab. Lauf: node dropship/silber-bazg-1711/sammlungstexte_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lauf, pruefeEintrag, LESEN, SCHREIBEN, flach } from './sammlungstexte.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const MARK = '<!-- ls-verwandt --><p class="ls-verwandt-eltern">Zur Übersicht: <a href="/collections/schmuck-uhren">Schmuck &amp; Uhren</a></p><!-- /ls-verwandt -->';
const eintrag = (h = 'silberringe', o = {}) => ({
  handle: h,
  alt: { descriptionHtml: `<p>Ringe aus 925er Sterlingsilber und Silber, schlicht oder mit Zirkonia.</p>${MARK}`, seoTitle: 'Silberringe kaufen | LuxeStyle', seoDescription: 'Silberringe online kaufen. Ringe aus 925er Sterlingsilber. Gratis-Versand ab CHF 50.' },
  neu: { descriptionHtml: `<p>Ringe, schlicht oder mit Zirkonia.</p>${MARK}`, seoTitle: 'Silberringe kaufen | LuxeStyle', seoDescription: 'Silberringe online kaufen. Ringe. Gratis-Versand ab CHF 50.' },
  ...o,
});

// ───────────────────────── Tore
pruefe('Tor: sauberer Eintrag besteht', pruefeEintrag(eintrag()).length === 0, JSON.stringify(pruefeEintrag(eintrag())));
const mit = (f, w) => { const e = eintrag(); e.neu = { ...e.neu, [f]: w }; return e; };
pruefe('Tor: «925» in der Beschreibung bleibt → Problem', pruefeEintrag(mit('descriptionHtml', `<p>Ringe aus 925er Silber.</p>${MARK}`)).some((p) => /Feingehalt/.test(p)));
pruefe('Tor: «Sterlingsilber» im SEO-Titel → Problem', pruefeEintrag(mit('seoTitle', 'Sterlingsilber Ringe')).some((p) => /Feingehalt/.test(p)));
pruefe('Tor: «S925» in der SEO-Beschreibung → Problem', pruefeEintrag(mit('seoDescription', 'Ringe aus S925')).some((p) => /Feingehalt/.test(p)));
pruefe('Tor: Markierungskommentar verloren → Problem', pruefeEintrag(mit('descriptionHtml', '<p>Ringe, schlicht.</p>')).some((p) => /Kommentar/.test(p)));
pruefe('Tor: Reihenfolge der Kommentare verändert → Problem', (() => { const e = eintrag(); e.alt.descriptionHtml = '<!-- a --><p>x aus 925</p><!-- b -->'; e.neu.descriptionHtml = '<!-- b --><p>x</p><!-- a -->'; return pruefeEintrag(e).some((p) => /Kommentar/.test(p)); })());
pruefe('Tor: neuer Kommentar → Problem', pruefeEintrag(mit('descriptionHtml', `<p>Ringe.</p>${MARK}<!-- neu -->`)).some((p) => /Kommentar/.test(p)));
pruefe('Tor: neuer Link → Problem', pruefeEintrag(mit('descriptionHtml', `<p>Ringe <a href="/x">hier</a>.</p>${MARK}`)).some((p) => /Tag/.test(p)));
pruefe('Tor: neues Bild → Problem', pruefeEintrag(mit('descriptionHtml', `<p>Ringe.</p><img src="x">${MARK}`)).some((p) => /Tag/.test(p)));
pruefe('Tor: SEO-Titel über 70 → Problem', pruefeEintrag(mit('seoTitle', 'x'.repeat(71))).some((p) => /70/.test(p)));
pruefe('Tor: SEO-Beschreibung über 160 → Problem', pruefeEintrag(mit('seoDescription', 'x'.repeat(161))).some((p) => /160/.test(p)));
pruefe('Tor: SEO-Beschreibung genau 160 besteht', pruefeEintrag(mit('seoDescription', 'x'.repeat(160))).length === 0);
pruefe('Tor: leere Beschreibung → Problem', pruefeEintrag((() => { const e = eintrag(); e.alt.descriptionHtml = '<p>Ringe aus 925er Silber.</p>'; e.neu.descriptionHtml = '<p> </p>'; return e; })()).some((p) => /leer/.test(p)));
pruefe('Tor: alt gleich neu → Problem', pruefeEintrag({ handle: 'a', alt: eintrag().alt, neu: eintrag().alt }).some((p) => /gleich/.test(p)));
pruefe('Tor: unvollständiger Eintrag', pruefeEintrag({ handle: 'a' }).length > 0 && pruefeEintrag(null).length > 0);
pruefe('Tor: Tag-Zählung: weniger Tags im neuen Text ist erlaubt', pruefeEintrag((() => { const e = eintrag(); e.alt.descriptionHtml = `<p>Ringe <strong>aus 925er Silber</strong>.</p><p>Zweiter Absatz.</p>${MARK}`; e.neu.descriptionHtml = `<p>Ringe.</p>${MARK}`; return e; })()).length === 0);

// ───────────────────────── strenge Shop-Attrappe
function shop(startwerte, { schreibtNicht = false, fehlerBeiSchreiben = null } = {}) {
  const sammlungen = new Map(Object.entries(startwerte).map(([h, v]) => [h, { id: `gid://shopify/Collection/${h}`, handle: h, title: h, descriptionHtml: v.descriptionHtml, seo: { title: v.seoTitle, description: v.seoDescription } }]));
  const aufrufe = [];
  const q = async (query, vars) => {
    aufrufe.push({ query, vars });
    if (query === LESEN) {
      if (typeof vars?.q !== 'string' || Object.keys(vars).length !== 1) throw new Error('LESEN: Variablen unzulässig ' + JSON.stringify(vars));
      const h = /^handle:(.+)$/.exec(vars.q)?.[1];
      const fremd = { id: 'gid://shopify/Collection/zzz', handle: 'zzz-fremd', title: 'zzz', descriptionHtml: '<p>fremd</p>', seo: { title: 'x', description: 'y' } };
      return { collections: { nodes: sammlungen.has(h) ? [fremd, sammlungen.get(h)] : [fremd] } };
    }
    if (query === SCHREIBEN) {
      const i = vars?.in;
      if (!i || Object.keys(vars).length !== 1) throw new Error('SCHREIBEN: Variablen unzulässig');
      const erlaubt = new Set(['id', 'descriptionHtml', 'seo']);
      for (const k of Object.keys(i)) if (!erlaubt.has(k)) throw new Error('SCHREIBEN: Feld nicht erlaubt: ' + k);
      if (i.seo && !Object.keys(i.seo).every((k) => ['title', 'description'].includes(k))) throw new Error('SCHREIBEN: seo-Feld nicht erlaubt');
      const s = [...sammlungen.values()].find((x) => x.id === i.id);
      if (!s) return { collectionUpdate: { collection: null, userErrors: [{ field: ['id'], message: 'nicht gefunden' }] } };
      if (fehlerBeiSchreiben) return { collectionUpdate: { collection: null, userErrors: [{ field: ['id'], message: fehlerBeiSchreiben }] } };
      if (!schreibtNicht) { s.descriptionHtml = i.descriptionHtml; s.seo = { title: i.seo?.title ?? s.seo.title, description: i.seo?.description ?? s.seo.description }; }
      return { collectionUpdate: { collection: { id: s.id }, userErrors: [] } };
    }
    throw new Error('unbekannte Abfrage');
  };
  return { q, aufrufe, sammlungen, schreibaufrufe: () => aufrufe.filter((a) => a.query === SCHREIBEN).length };
}
const werte = (e) => ({ descriptionHtml: e.alt.descriptionHtml, seoTitle: e.alt.seoTitle, seoDescription: e.alt.seoDescription });
const stumm = []; const log = (z) => stumm.push(z);
const lf = (s, eintraege, extra = {}) => lauf({ q: s.q, eintraege, log, pause: async () => {}, lesePauseMs: 0, pauseMs: 0, leseVersuche: 2, ledger: (z) => ledgerZeilen.push(z), ...extra });
let ledgerZeilen = [];

// Trockenlauf
{
  const e = eintrag(); const s = shop({ [e.handle]: werte(e) });
  const rc = await lf(s, [e], { live: false });
  pruefe('Trockenlauf: Exit 0 und kein Schreibaufruf', rc === 0 && s.schreibaufrufe() === 0, `rc ${rc}`);
  pruefe('Trockenlauf: Shop unverändert', s.sammlungen.get(e.handle).descriptionHtml === e.alt.descriptionHtml);
}
// Live: schreibt, liest zurück, ist idempotent
{
  const e = eintrag(); const s = shop({ [e.handle]: werte(e) }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  const ist = flach(s.sammlungen.get(e.handle));
  pruefe('Live: Exit 0, ein Schreibaufruf', rc === 0 && s.schreibaufrufe() === 1, `rc ${rc} ${s.schreibaufrufe()}`);
  pruefe('Live: neuer Text steht im Shop', ist.descriptionHtml === e.neu.descriptionHtml && ist.seoDescription === e.neu.seoDescription && ist.seoTitle === e.neu.seoTitle);
  pruefe('Live: Ledger GESCHRIEBEN', ledgerZeilen.some((z) => z.split('|')[1] === 'GESCHRIEBEN' && z.split('|')[2] === e.handle));
  const rc2 = await lf(s, [e], { live: true });
  pruefe('Live: zweiter Lauf schreibt nichts mehr (schon erledigt)', rc2 === 0 && s.schreibaufrufe() === 1, `rc ${rc2} ${s.schreibaufrufe()}`);
  // Rücknahme
  const rc3 = await lf(s, [e], { live: true, zurueck: true });
  const zur = flach(s.sammlungen.get(e.handle));
  pruefe('Rücknahme: alter Text steht wieder, Markierung inklusive', rc3 === 0 && zur.descriptionHtml === e.alt.descriptionHtml && zur.seoTitle === e.alt.seoTitle && zur.seoDescription === e.alt.seoDescription, `rc ${rc3}`);
  pruefe('Rücknahme: Ledger ZURUECK', ledgerZeilen.some((z) => z.split('|')[1] === 'ZURUECK'));
  const rc4 = await lf(s, [e], { live: true, zurueck: true });
  pruefe('Rücknahme: zweiter Lauf schreibt nichts mehr', rc4 === 0 && s.schreibaufrufe() === 2, `rc ${rc4} ${s.schreibaufrufe()}`);
}
// Rücknahme ohne Tore: auch ein Eintrag, dessen alter Text eine Feingehaltsangabe nennt, lässt sich zurücknehmen
{
  const e = eintrag(); const s = shop({ [e.handle]: { descriptionHtml: e.neu.descriptionHtml, seoTitle: e.neu.seoTitle, seoDescription: e.neu.seoDescription } });
  const rc = await lf(s, [e], { live: true, zurueck: true });
  pruefe('Rücknahme besteht ohne Tor (alter Text darf 925 nennen)', rc === 0 && s.sammlungen.get(e.handle).descriptionHtml === e.alt.descriptionHtml, `rc ${rc}`);
}
// Rücknahme braucht die Tore nicht: auch wenn `neu` inzwischen nicht mehr besteht (z. B. 925 steht darin), lässt sich der gesicherte Stand wiederherstellen
{
  const e = eintrag(); e.neu = { ...e.neu, descriptionHtml: `<p>Ringe aus 925er Silber.</p>${MARK}` };
  const s = shop({ [e.handle]: { descriptionHtml: e.neu.descriptionHtml, seoTitle: e.neu.seoTitle, seoDescription: e.neu.seoDescription } });
  const rc = await lf(s, [e], { live: true, zurueck: true });
  pruefe('Rücknahme läuft auch bei einem `neu`, das die Tore nicht mehr besteht', rc === 0 && s.sammlungen.get(e.handle).descriptionHtml === e.alt.descriptionHtml, `rc ${rc}`);
  const rc2 = await lf(shop({ [e.handle]: werte(e) }), [e], { live: true });
  pruefe('Vorwärts mit demselben `neu` wird vom Tor gestoppt (Exit 2)', rc2 === 2, `rc ${rc2}`);
}
// Fremde Änderung wird nicht überschrieben
{
  const e = eintrag(); const fremd = { ...werte(e), descriptionHtml: '<p>Jemand anderes hat das geändert.</p>' };
  const s = shop({ [e.handle]: fremd }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Fremd verändert: Exit 6, nichts geschrieben', rc === 6 && s.schreibaufrufe() === 0 && s.sammlungen.get(e.handle).descriptionHtml === fremd.descriptionHtml, `rc ${rc}`);
  pruefe('Fremd verändert: Ledger FREMD', ledgerZeilen.some((z) => z.split('|')[1] === 'FREMD'));
  const rc2 = await lf(s, [e], { live: true, fremdUeberschreiben: true });
  pruefe('FREMD_UEBERSCHREIBEN hebt den Schutz auf', rc2 === 0 && s.sammlungen.get(e.handle).descriptionHtml === e.neu.descriptionHtml, `rc ${rc2}`);
}
// Schreibfehler → Halt mit Exit 6, weitere Einträge unberührt
{
  const a = eintrag('a-ringe'), b = eintrag('b-ringe'); const s = shop({ [a.handle]: werte(a), [b.handle]: werte(b) }, { fehlerBeiSchreiben: 'Nicht erlaubt' }); ledgerZeilen = [];
  const rc = await lf(s, [a, b], { live: true });
  pruefe('Schreibfehler: Exit 6, nur ein Versuch (Halt beim ersten Fehler)', rc === 6 && s.schreibaufrufe() === 1, `rc ${rc} ${s.schreibaufrufe()}`);
  pruefe('Schreibfehler: Ledger FEHLER', ledgerZeilen.some((z) => z.split('|')[1] === 'FEHLER'));
  pruefe('Schreibfehler: kein Rücklesen danach (keine ABWEICHUNG im Ledger)', !ledgerZeilen.some((z) => z.split('|')[1] === 'ABWEICHUNG'));
}
// Rücklesen weicht ab (Shop übernimmt das Geschriebene nicht)
{
  const e = eintrag(); const s = shop({ [e.handle]: werte(e) }, { schreibtNicht: true }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Rücklesen weicht ab: Exit 6 und ABWEICHUNG im Ledger', rc === 6 && ledgerZeilen.some((z) => z.split('|')[1] === 'ABWEICHUNG'), `rc ${rc}`);
}
// Tor verhindert jedes Schreiben, auch für gültige Nachbarn
{
  const gut = eintrag('gut'), schlecht1 = eintrag('schlecht'); schlecht1.neu.descriptionHtml = `<p>Ringe aus 925er Silber.</p>${MARK}`;
  const s = shop({ [gut.handle]: werte(gut), [schlecht1.handle]: werte(schlecht1) });
  const rc = await lf(s, [gut, schlecht1], { live: true });
  pruefe('Tor: ein schlechter Eintrag stoppt alles (Exit 2, nichts geschrieben)', rc === 2 && s.schreibaufrufe() === 0, `rc ${rc} ${s.schreibaufrufe()}`);
}
// Eingabefehler, ONLY, nicht lesbare Sammlung
{
  const e = eintrag(); const s = shop({ [e.handle]: werte(e) });
  pruefe('leere Eingabe: Exit 2', (await lf(s, [], { live: true })) === 2);
  pruefe('doppelte Handles: Exit 2', (await lf(s, [e, e], { live: true })) === 2 && s.schreibaufrufe() === 0);
  pruefe('ONLY ohne Treffer: Exit 2', (await lf(s, [e], { live: true, nur: ['andere'] })) === 2 && s.schreibaufrufe() === 0);
  const a = eintrag('a'), b = eintrag('b'); const s2 = shop({ a: werte(a), b: werte(b) });
  pruefe('ONLY wählt genau einen Eintrag', (await lf(s2, [a, b], { live: true, nur: ['b'] })) === 0 && s2.schreibaufrufe() === 1 && s2.sammlungen.get('a').descriptionHtml === a.alt.descriptionHtml);
  const s3 = shop({}); ledgerZeilen = [];
  pruefe('Sammlung nicht gefunden: Exit 6 (nicht still übergangen)', (await lf(s3, [e], { live: true })) === 6 && s3.schreibaufrufe() === 0);
}
// null und leere Werte zählen gleich (Shopify liefert null oder '')
{
  const e = eintrag(); e.alt.seoTitle = null; e.neu.seoTitle = null; const s = shop({ [e.handle]: { ...werte(e), seoTitle: '' } });
  const rc = await lf(s, [e], { live: true });
  pruefe('null und leerer SEO-Titel gelten als gleich', rc === 0 && s.sammlungen.get(e.handle).descriptionHtml === e.neu.descriptionHtml, `rc ${rc}`);
}

// Ein leerer neuer SEO-Titel ('' = keiner): Shopify liefert ihn als null/'' zurück, das Rücklesen darf daran nicht scheitern
{
  const e = eintrag(); e.neu = { ...e.neu, seoTitle: '' }; const s = shop({ [e.handle]: werte(e) });
  const rc = await lf(s, [e], { live: true });
  pruefe('leerer neuer SEO-Titel: Rücklesen gilt als gleich (Exit 0)', rc === 0, `rc ${rc}`);
}

// ───────────────────────── die echte Eingabedatei besteht die Tore
const HIER = dirname(fileURLToPath(import.meta.url));
const datei = JSON.parse(readFileSync(join(HIER, 'sammlungstexte.json'), 'utf8'));
pruefe('Eingabedatei: 18 Einträge, keine doppelten Handles', datei.eintraege.length === 18 && new Set(datei.eintraege.map((e) => e.handle)).size === 18, String(datei.eintraege.length));
for (const e of datei.eintraege) {
  const p = pruefeEintrag(e);
  pruefe(`Eingabedatei ${e.handle}: Tore bestanden`, p.length === 0, p.join(' | '));
  pruefe(`Eingabedatei ${e.handle}: alt und neu vollständig`, ['descriptionHtml', 'seoTitle', 'seoDescription'].every((f) => typeof e.alt[f] === 'string' && typeof e.neu[f] === 'string'), JSON.stringify(Object.keys(e.neu)));
  pruefe(`Eingabedatei ${e.handle}: alter Text nannte eine Feingehaltsangabe`, pruefeEintrag({ handle: e.handle, alt: e.neu, neu: e.alt }).some((x) => /Feingehalt/.test(x)));
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
