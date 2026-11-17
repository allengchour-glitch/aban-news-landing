// Test für seitentexte.mjs (Seiten und Artikel ohne Silber-Angebotsstellen): Tore, Trockenlauf, Schreiben, Rücklesen, Idempotenz, Rücknahme, fremde Änderung.
// Der Shop ist eine strenge Attrappe: sie lehnt unbekannte Abfragen, unbenutzte oder fehlende Variablen und nicht erlaubte Felder ab. Lauf: node dropship/silber-bazg-1711/seitentexte_test.mjs
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lauf, pruefeEintrag, schluessel, norm, trefferZahl, felderVon, LESEN_SEITE, LESEN_ARTIKEL, SCHREIBEN_SEITE, SCHREIBEN_ARTIKEL, SCHREIBEN_SEO } from './seitentexte.mjs';

let ok = 0, schlecht = 0;
const pruefe = (name, bed, info = '') => { if (bed) ok++; else { schlecht++; console.error('FEHLER:', name, info); } };
const ANGEBOT = '<p>Unser Set «Trio» besteht aus 925er Sterlingsilber: Kette, Ohrringe, Armband für CHF 89.</p>';
const ERKLAERUNG = '<p>Was ist Sterlingsilber (925)? Eine Legierung aus Silber und Kupfer.</p>';
const NEUTRAL = '<p>Unser Set «Trio» umfasst Kette, Ohrringe und Armband.</p>';
const KOPF = '<h2>Material</h2><!-- ls-marke --><ul><li>Edelstahl</li></ul>';
const eintrag = (o = {}) => ({
  art: 'Artikel', blog: 'ratgeber', handle: 'schmuck-guide', rest: 2,
  alt: { body: `${KOPF}${ANGEBOT}${ERKLAERUNG}` },
  neu: { body: `${KOPF}${NEUTRAL}${ERKLAERUNG}` },
  ...o,
});
const seite = (o = {}) => eintrag({ art: 'Seite', blog: undefined, handle: 'pflege', ...o });

// ───────────────────────── Tore
pruefe('Tor: sauberer Eintrag besteht', pruefeEintrag(eintrag()).length === 0, JSON.stringify(pruefeEintrag(eintrag())));
pruefe('Tor: Seite ohne blog besteht', pruefeEintrag(seite()).length === 0, JSON.stringify(pruefeEintrag(seite())));
pruefe('Tor: Artikel ohne blog → Problem', pruefeEintrag(eintrag({ blog: undefined })).some((p) => /blog/.test(p)));
pruefe('Tor: unbekannte Art → Problem', pruefeEintrag(eintrag({ art: 'Blog' })).length > 0);
pruefe('Tor: Änderung entfernt nichts → Problem', pruefeEintrag(eintrag({ neu: { body: `${KOPF}${ANGEBOT}${ERKLAERUNG}x` } })).some((p) => /entfernt nichts/.test(p)));
pruefe('Tor: mehr Treffer als erwartet → Problem', pruefeEintrag(eintrag({ rest: 0 })).some((p) => /erwartet 0/.test(p)));
pruefe('Tor: weniger Treffer als erwartet → Problem', pruefeEintrag(eintrag({ rest: 3 })).some((p) => /erwartet 3/.test(p)));
pruefe('Tor: rest fehlt → Problem', pruefeEintrag(eintrag({ rest: undefined })).some((p) => /rest/.test(p)));
pruefe('Tor: rest negativ → Problem', pruefeEintrag(eintrag({ rest: -1 })).some((p) => /rest/.test(p)));
pruefe('Tor: Markierungskommentar verloren → Problem', pruefeEintrag(eintrag({ neu: { body: `<h2>Material</h2><ul><li>Edelstahl</li></ul>${NEUTRAL}${ERKLAERUNG}` } })).some((p) => /Kommentar/.test(p)));
pruefe('Tor: neuer Kommentar → Problem', pruefeEintrag(eintrag({ neu: { body: `${KOPF}${NEUTRAL}${ERKLAERUNG}<!-- neu -->` } })).some((p) => /Kommentar/.test(p)));
pruefe('Tor: neuer Link → Problem', pruefeEintrag(eintrag({ neu: { body: `${KOPF}<p>Set <a href="/x">hier</a>.</p>${ERKLAERUNG}` } })).some((p) => /Tag/.test(p)));
pruefe('Tor: neues Bild → Problem', pruefeEintrag(eintrag({ neu: { body: `${KOPF}${NEUTRAL}${ERKLAERUNG}<img src="x">` } })).some((p) => /Tag/.test(p)));
pruefe('Tor: weniger Tags ist erlaubt (Absatz entfällt)', pruefeEintrag(eintrag({ neu: { body: `${KOPF}${ERKLAERUNG}` } })).length === 0, JSON.stringify(pruefeEintrag(eintrag({ neu: { body: `${KOPF}${ERKLAERUNG}` } }))));
pruefe('Tor: leerer Text → Problem', pruefeEintrag(eintrag({ rest: 0, alt: { body: ANGEBOT }, neu: { body: '<p> </p>' } })).some((p) => /leer/.test(p)));
pruefe('Tor: Text unter 40 % → Problem', pruefeEintrag(eintrag({ rest: 0, alt: { body: `<p>${'Lorem ipsum dolor sit amet. '.repeat(30)}</p>${ANGEBOT}` }, neu: { body: '<p>Kurz.</p>' } })).some((p) => /40 %/.test(p)));
pruefe('Tor: alt gleich neu → Problem', pruefeEintrag(eintrag({ neu: { body: eintrag().alt.body } })).some((p) => /gleich|entfernt nichts/.test(p)));
pruefe('Tor: unvollständiger Eintrag', pruefeEintrag({ handle: 'a' }).length > 0 && pruefeEintrag(null).length > 0);
pruefe('Tor: Body kein Text → Problem', pruefeEintrag(eintrag({ neu: { body: null } })).join().includes('Texte sein') && pruefeEintrag(eintrag({ alt: { body: 5 } })).join().includes('Texte sein'));
pruefe('Tor: Kommentare in anderer Reihenfolge → Problem', pruefeEintrag(eintrag({ alt: { body: `<!-- a --><p>x</p><!-- b -->${ANGEBOT}${ERKLAERUNG}` }, neu: { body: `<!-- b --><p>x</p><!-- a -->${NEUTRAL}${ERKLAERUNG}` } })).some((p) => /Kommentar/.test(p)));
pruefe('Tor: veränderter Link (anderes Ziel) → Problem', pruefeEintrag(eintrag({ alt: { body: `<p><a href="/a">A</a></p>${ANGEBOT}${ERKLAERUNG}` }, neu: { body: `<p><a href="/b">A</a></p>${NEUTRAL}${ERKLAERUNG}` } })).some((p) => /Tag/.test(p)));
{ const lang = '<p>' + 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr. '.repeat(40) + '</p>';
  const kurz = (n) => '<p>' + 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr. '.repeat(n) + '</p>';
  pruefe('Tor: Schrumpfen auf rund 20 % → Problem', pruefeEintrag(eintrag({ rest: 0, alt: { body: lang + ANGEBOT }, neu: { body: kurz(8) } })).some((p) => /40 %/.test(p)));
  pruefe('Tor: Schrumpfen auf rund 60 % ist erlaubt', pruefeEintrag(eintrag({ rest: 0, alt: { body: lang + ANGEBOT }, neu: { body: kurz(24) } })).length === 0, JSON.stringify(pruefeEintrag(eintrag({ rest: 0, alt: { body: lang + ANGEBOT }, neu: { body: kurz(24) } })))); }
pruefe('trefferZahl zählt Belege der Silber-Regel', trefferZahl(ANGEBOT) >= 1 && trefferZahl(NEUTRAL) === 0);
pruefe('norm: Zeilenende und Endleerraum', norm('a\r\nb \n') === 'a\nb');
pruefe('Schlüssel unterscheidet Seite, Artikel und Blog', schluessel(eintrag()) !== schluessel(seite()) && schluessel(eintrag()) !== schluessel(eintrag({ blog: 'news' })));

// ───────────────────────── strenge Shop-Attrappe
function shop(startwerte, { schreibtNicht = false, fehlerBeiSchreiben = null, fehlerBeiSeo = null, wirft = false, verzoegert = 0 } = {}) {
  // startwerte: { 'Seite::pflege': {body, seoTitle, seoDescription} | body-Text, 'Artikel:ratgeber:schmuck-guide': {...} }
  const objekte = new Map(Object.entries(startwerte).map(([k, v]) => {
    const [art, blog, handle] = k.split(':'); const w = typeof v === 'string' ? { body: v } : v;
    return [k, { id: `gid://shopify/${art === 'Seite' ? 'Page' : 'Article'}/${handle}-${blog}`, art, blog, handle, title: handle, body: w.body, summary: w.summary ?? null, seoTitle: w.seoTitle ?? null, seoDescription: w.seoDescription ?? null }];
  }));
  const aufrufe = [];
  const q = async (query, vars) => {
    aufrufe.push({ query, vars });
    if (query === LESEN_SEITE || query === LESEN_ARTIKEL) {
      if (typeof vars?.q !== 'string' || Object.keys(vars).length !== 1) throw new Error('LESEN: Variablen unzulässig ' + JSON.stringify(vars));
      const h = /^handle:(.+)$/.exec(vars.q)?.[1];
      const art = query === LESEN_SEITE ? 'Seite' : 'Artikel';
      const treffer = [...objekte.values()].filter((x) => x.art === art && x.handle === h);
      const fremd = { id: 'gid://shopify/X/zzz', handle: 'zzz-fremd', title: 'zzz', body: '<p>fremd</p>', summary: null, blog: { handle: 'ratgeber' }, metafields: { nodes: [] } };
      for (const x of treffer) if (x.noch !== undefined) { if (x.noch <= 0) { Object.assign(x, x.neuerStand); delete x.noch; delete x.neuerStand; } else x.noch--; }
      const knoten = (x) => ({ id: x.id, handle: x.handle, title: x.title, body: x.body,
        ...(art === 'Artikel' ? { summary: x.summary, blog: { handle: x.blog } } : {}),
        metafields: { nodes: [{ namespace: 'custom', key: 'title_tag', value: 'FALSCH' }, { namespace: 'custom', key: 'description_tag', value: 'FALSCH' }, x.seoTitle != null && { namespace: 'global', key: 'title_tag', value: x.seoTitle }, x.seoDescription != null && { namespace: 'global', key: 'description_tag', value: x.seoDescription }, { namespace: 'custom', key: 'fremd', value: 'x' }].filter(Boolean) } });
      const nodes = [fremd, ...treffer.map(knoten)];
      return art === 'Seite' ? { pages: { nodes } } : { articles: { nodes } };
    }
    const setze = (s, stand) => { if (schreibtNicht) return; if (verzoegert) { s.neuerStand = { ...(s.neuerStand || {}), ...stand }; s.noch = verzoegert; } else Object.assign(s, stand); };
    if (query === SCHREIBEN_SEITE || query === SCHREIBEN_ARTIKEL) {
      if (!vars || typeof vars.id !== 'string' || !vars.in || Object.keys(vars).length !== 2) throw new Error('SCHREIBEN: Variablen unzulässig ' + JSON.stringify(Object.keys(vars || {})));
      const art = query === SCHREIBEN_SEITE ? 'Seite' : 'Artikel';
      const erlaubt = art === 'Seite' ? ['body'] : ['body', 'summary'];
      for (const k of Object.keys(vars.in)) if (!erlaubt.includes(k)) throw new Error('SCHREIBEN: Feld nicht erlaubt: ' + k);
      if (!Object.keys(vars.in).length) throw new Error('SCHREIBEN: leere Eingabe');
      const s = [...objekte.values()].find((x) => x.id === vars.id && x.art === art);
      const feld = art === 'Seite' ? 'pageUpdate' : 'articleUpdate', ziel = art === 'Seite' ? 'page' : 'article';
      if (!s) return { [feld]: { [ziel]: null, userErrors: [{ field: ['id'], message: 'nicht gefunden' }] } };
      if (wirft) throw new Error('Netzfehler');
      if (fehlerBeiSchreiben) return { [feld]: { [ziel]: null, userErrors: [{ field: ['id'], message: fehlerBeiSchreiben }] } };
      setze(s, vars.in);
      return { [feld]: { [ziel]: { id: s.id }, userErrors: [] } };
    }
    if (query === SCHREIBEN_SEO) {
      if (!vars || !Array.isArray(vars.m) || Object.keys(vars).length !== 1) throw new Error('SEO: Variablen unzulässig');
      for (const m of vars.m) {
        if (m.namespace !== 'global' || !['title_tag', 'description_tag'].includes(m.key) || m.type !== 'single_line_text_field' || typeof m.value !== 'string' || typeof m.ownerId !== 'string' || Object.keys(m).length !== 5) throw new Error('SEO: Eingabe unzulässig ' + JSON.stringify(m));
      }
      if (wirft) throw new Error('Netzfehler');
      if (fehlerBeiSeo) return { metafieldsSet: { metafields: null, userErrors: [{ field: ['m'], message: fehlerBeiSeo }] } };
      for (const m of vars.m) { const s = [...objekte.values()].find((x) => x.id === m.ownerId); if (!s) return { metafieldsSet: { metafields: null, userErrors: [{ field: ['ownerId'], message: 'nicht gefunden' }] } }; setze(s, { [m.key === 'title_tag' ? 'seoTitle' : 'seoDescription']: m.value }); }
      return { metafieldsSet: { metafields: vars.m.map((_, i) => ({ id: `gid://shopify/Metafield/${i}` })), userErrors: [] } };
    }
    throw new Error('unbekannte Abfrage');
  };
  const schreib = () => aufrufe.filter((a) => [SCHREIBEN_SEITE, SCHREIBEN_ARTIKEL, SCHREIBEN_SEO].includes(a.query)).length;
  const stand = (e) => objekte.get(schluessel(e));
  return { q, aufrufe, objekte, schreibaufrufe: schreib, stand, body: (e) => stand(e)?.body };
}
const stumm = []; const log = (z) => stumm.push(z);
let ledgerZeilen = [];
const lf = (s, eintraege, extra = {}) => lauf({ q: s.q, eintraege, log, pause: async () => {}, lesePauseMs: 0, pauseMs: 0, leseVersuche: 2, ledger: (z) => ledgerZeilen.push(z), ...extra });
const start = (...es) => Object.fromEntries(es.map((e) => [schluessel(e), { ...e.alt }]));

// Trockenlauf
{
  const e = eintrag(); const s = shop(start(e));
  const rc = await lf(s, [e], { live: false });
  pruefe('Trockenlauf: Exit 0 und kein Schreibaufruf', rc === 0 && s.schreibaufrufe() === 0, `rc ${rc}`);
  pruefe('Trockenlauf: Shop unverändert', s.body(e) === e.alt.body);
}
// Live: schreibt, liest zurück, ist idempotent; Artikel und Seite getrennt
for (const e of [eintrag(), seite()]) {
  const s = shop(start(e)); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe(`Live ${e.art}: Exit 0, ein Schreibaufruf`, rc === 0 && s.schreibaufrufe() === 1, `rc ${rc} ${s.schreibaufrufe()}`);
  pruefe(`Live ${e.art}: neuer Text steht im Shop`, s.body(e) === e.neu.body);
  pruefe(`Live ${e.art}: Ledger GESCHRIEBEN`, ledgerZeilen.some((z) => z.split('|')[1] === 'GESCHRIEBEN' && z.split('|')[2] === schluessel(e)));
  pruefe(`Live ${e.art}: richtige Abfrage (Seite → pageUpdate, Artikel → articleUpdate)`, s.aufrufe.some((a) => a.query === (e.art === 'Seite' ? SCHREIBEN_SEITE : SCHREIBEN_ARTIKEL)) && !s.aufrufe.some((a) => a.query === (e.art === 'Seite' ? SCHREIBEN_ARTIKEL : SCHREIBEN_SEITE)));
  const rc2 = await lf(s, [e], { live: true });
  pruefe(`Live ${e.art}: zweiter Lauf schreibt nichts mehr`, rc2 === 0 && s.schreibaufrufe() === 1, `rc ${rc2} ${s.schreibaufrufe()}`);
  pruefe(`Live ${e.art}: zweiter Lauf meldet «schon erledigt» und verbucht nichts`, stumm.slice(-3).some((z) => /schon erledigt/.test(z)) && ledgerZeilen.filter((z) => z.split('|')[1] === 'GESCHRIEBEN').length === 1, JSON.stringify(ledgerZeilen)); 
  const rc3 = await lf(s, [e], { live: true, zurueck: true });
  pruefe(`Rücknahme ${e.art}: alter Text steht wieder`, rc3 === 0 && s.body(e) === e.alt.body, `rc ${rc3}`);
  pruefe(`Rücknahme ${e.art}: Ledger ZURUECK`, ledgerZeilen.some((z) => z.split('|')[1] === 'ZURUECK'));
  const rc4 = await lf(s, [e], { live: true, zurueck: true });
  pruefe(`Rücknahme ${e.art}: zweiter Lauf schreibt nichts mehr`, rc4 === 0 && s.schreibaufrufe() === 2, `rc ${rc4} ${s.schreibaufrufe()}`);
}
// Rücknahme braucht die Tore nicht
{
  const e = eintrag({ rest: 5 }); const s = shop({ [schluessel(e)]: { ...e.neu } });
  const rc = await lf(s, [e], { live: true, zurueck: true });
  pruefe('Rücknahme läuft auch bei einem Eintrag, der die Tore nicht besteht', rc === 0 && s.body(e) === e.alt.body, `rc ${rc}`);
  const rc2 = await lf(shop(start(e)), [e], { live: true });
  pruefe('Vorwärts mit falschem `rest` wird vom Tor gestoppt (Exit 2)', rc2 === 2, `rc ${rc2}`);
}
// Zeilenenden: Shopify liefert \n, die Datei trägt \r\n
{
  const e = eintrag(); const crlf = { ...e, neu: { body: e.neu.body.replace(/><\//g, '>\r\n</') } };
  const s = shop(start(e)); const rc = await lf(s, [e], { live: true });
  const rc2 = await lf(s, [{ ...crlf, neu: { body: e.neu.body.replace(/\n/g, '\r\n') } }], { live: true });
  pruefe('Zeilenenden \\r\\n gelten als gleich (schon erledigt, kein zweiter Schreibaufruf)', rc === 0 && rc2 === 0 && s.schreibaufrufe() === 1, `rc ${rc} ${rc2} ${s.schreibaufrufe()}`);
}
// Fremde Änderung wird nicht überschrieben
{
  const e = eintrag(); const fremd = '<p>Jemand anderes hat das geändert.</p>';
  const s = shop({ [schluessel(e)]: fremd }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Fremd verändert: Exit 6, nichts geschrieben', rc === 6 && s.schreibaufrufe() === 0 && s.body(e) === fremd, `rc ${rc}`);
  pruefe('Fremd verändert: Ledger FREMD', ledgerZeilen.some((z) => z.split('|')[1] === 'FREMD'));
  const rc2 = await lf(s, [e], { live: true, fremdUeberschreiben: true });
  pruefe('FREMD_UEBERSCHREIBEN hebt den Schutz auf', rc2 === 0 && s.body(e) === e.neu.body, `rc ${rc2}`);
}
// Schreibfehler → Halt mit Exit 6
{
  const a = eintrag({ handle: 'a-guide' }), b = eintrag({ handle: 'b-guide' }); const s = shop(start(a, b), { fehlerBeiSchreiben: 'Nicht erlaubt' }); ledgerZeilen = [];
  const rc = await lf(s, [a, b], { live: true });
  pruefe('Schreibfehler: Exit 6, nur ein Versuch', rc === 6 && s.schreibaufrufe() === 1, `rc ${rc} ${s.schreibaufrufe()}`);
  pruefe('Schreibfehler: Ledger FEHLER, keine ABWEICHUNG', ledgerZeilen.some((z) => z.split('|')[1] === 'FEHLER') && !ledgerZeilen.some((z) => z.split('|')[1] === 'ABWEICHUNG'));
}
// Ausnahme beim Schreiben (Netz) → Halt mit Exit 6, Ledger FEHLER
{
  const e = eintrag(); const s = shop(start(e), { wirft: true }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Ausnahme beim Schreiben: Exit 6 und Ledger FEHLER', rc === 6 && ledgerZeilen.some((z) => z.split('|')[1] === 'FEHLER' && /Netzfehler/.test(z)), `rc ${rc}`);
}
// Verzögertes Rücklesen: der Shop zeigt den neuen Text erst beim zweiten Lesen (Wiederholung nötig)
{
  const e = eintrag(); const s = shop(start(e), { verzoegert: 1 });
  const rc = await lf(s, [e], { live: true, leseVersuche: 5 });
  pruefe('Verzögertes Rücklesen: mit Wiederholung Exit 0', rc === 0 && s.body(e) === e.neu.body, `rc ${rc}`);
}
// Trockenlauf meldet Probleme mit Exit 6 (fremd verändert)
{
  const e = eintrag(); const s = shop({ [schluessel(e)]: '<p>fremd</p>' });
  const rc = await lf(s, [e], { live: false });
  pruefe('Trockenlauf mit fremd verändertem Eintrag: Exit 6, nichts geschrieben', rc === 6 && s.schreibaufrufe() === 0, `rc ${rc}`);
}
// Rücklesen weicht ab
{
  const e = eintrag(); const s = shop(start(e), { schreibtNicht: true }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Rücklesen weicht ab: Exit 6 und ABWEICHUNG', rc === 6 && ledgerZeilen.some((z) => z.split('|')[1] === 'ABWEICHUNG'), `rc ${rc}`);
}
// Tor stoppt alles
{
  const gut = eintrag({ handle: 'gut' }), schlechtE = eintrag({ handle: 'schlecht', rest: 9 });
  const s = shop(start(gut, schlechtE)); const rc = await lf(s, [gut, schlechtE], { live: true });
  pruefe('Tor: ein schlechter Eintrag stoppt alles (Exit 2, nichts geschrieben)', rc === 2 && s.schreibaufrufe() === 0, `rc ${rc}`);
}
// Eingabefehler, ONLY, gleicher Handle in Seite und Artikel, anderer Blog, nicht lesbar
{
  const e = eintrag(); const s = shop(start(e));
  pruefe('leere Eingabe: Exit 2', (await lf(s, [], { live: true })) === 2);
  pruefe('doppelter Eintrag: Exit 2', (await lf(s, [e, e], { live: true })) === 2 && s.schreibaufrufe() === 0);
  pruefe('ONLY ohne Treffer: Exit 2', (await lf(s, [e], { live: true, nur: ['andere'] })) === 2 && s.schreibaufrufe() === 0);
  const a = eintrag({ handle: 'gleich' }), b = seite({ handle: 'gleich' });
  const s2 = shop(start(a, b));
  pruefe('gleicher Handle als Seite und Artikel sind zwei Einträge', (await lf(s2, [a, b], { live: true })) === 0 && s2.schreibaufrufe() === 2 && s2.body(a) === a.neu.body && s2.body(b) === b.neu.body);
  const anderer = eintrag({ blog: 'news' }); const s3 = shop({ [schluessel(anderer)]: anderer.alt.body });
  pruefe('Artikel in anderem Blog wird nicht gefunden (Exit 6)', (await lf(s3, [e], { live: true })) === 6 && s3.schreibaufrufe() === 0);
  pruefe('Eintrag nicht gefunden: Exit 6 (nicht still übergangen)', (await lf(shop({}), [e], { live: true })) === 6);
}

// ───────────────────────── Felder: Zusammenfassung und SEO
const SUMM_ALT = '<p>Ratgeber: warum die 925er-Silber-Fassung den Unterschied macht.</p>', SUMM_NEU = '<p>Ratgeber: warum die Fassung den Unterschied macht.</p>';
const SEO_ALT = 'Perlen erkennen: warum die 925er-Silber-Fassung entscheidend ist.', SEO_NEU = 'Perlen erkennen: warum die Fassung entscheidend ist.';
const voll = (o = {}) => eintrag({ rest: 2, alt: { body: `${KOPF}${ANGEBOT}${ERKLAERUNG}`, summary: SUMM_ALT, seoTitle: 'Perlen | LuxeStyle', seoDescription: SEO_ALT }, neu: { body: `${KOPF}${NEUTRAL}${ERKLAERUNG}`, summary: SUMM_NEU, seoTitle: 'Perlen | LuxeStyle', seoDescription: SEO_NEU }, ...o });
pruefe('Felder: felderVon nennt alle vier in fester Reihenfolge', JSON.stringify(felderVon(voll())) === JSON.stringify(['body', 'summary', 'seoTitle', 'seoDescription']));
pruefe('Tor: Eintrag mit allen Feldern besteht', pruefeEintrag(voll()).length === 0, JSON.stringify(pruefeEintrag(voll())));
pruefe('Tor: Treffer in SEO-Beschreibung bleibt → Problem (Restzahl)', pruefeEintrag(voll({ neu: { ...voll().neu, seoDescription: SEO_ALT } })).some((p) => /erwartet/.test(p)));
pruefe('Tor: Treffer in summary bleibt → Problem (Restzahl)', pruefeEintrag(voll({ neu: { ...voll().neu, summary: SUMM_ALT } })).some((p) => /erwartet/.test(p)));
pruefe('Tor: nur SEO geändert besteht (body gleich, rest zählt nur die genannten Felder)', pruefeEintrag(eintrag({ rest: 0, alt: { seoDescription: SEO_ALT }, neu: { seoDescription: SEO_NEU } })).length === 0, JSON.stringify(pruefeEintrag(eintrag({ rest: 0, alt: { seoDescription: SEO_ALT }, neu: { seoDescription: SEO_NEU } }))));
pruefe('Tor: Seite mit summary → Problem', pruefeEintrag(seite({ rest: 2, alt: { ...voll().alt }, neu: { ...voll().neu } })).some((p) => /summary/.test(p)));
pruefe('Tor: alt und neu mit verschiedenen Feldern → Problem', pruefeEintrag(eintrag({ alt: { body: eintrag().alt.body }, neu: { body: eintrag().neu.body, seoTitle: 'x' } })).some((p) => /Texte sein/.test(p)));
pruefe('Tor: keine Felder → Problem', pruefeEintrag(eintrag({ alt: {}, neu: {} })).some((p) => /keine Felder/.test(p)));
pruefe('Tor: SEO-Beschreibung über 160 → Problem', pruefeEintrag(voll({ neu: { ...voll().neu, seoDescription: 'x'.repeat(161) } })).some((p) => /160/.test(p)));
pruefe('Tor: SEO-Beschreibung genau 160 besteht', pruefeEintrag(voll({ neu: { ...voll().neu, seoDescription: 'x'.repeat(160) } })).every((p) => !/160/.test(p)) && pruefeEintrag(voll({ rest: 2, neu: { ...voll().neu, seoDescription: 'y'.repeat(160) } })).length === 0);
pruefe('Tor: SEO-Titel über 70 → Problem', pruefeEintrag(voll({ neu: { ...voll().neu, seoTitle: 'x'.repeat(71) } })).some((p) => /70/.test(p)));
pruefe('Tor: SEO-Titel genau 70 besteht', pruefeEintrag(voll({ neu: { ...voll().neu, seoTitle: 'x'.repeat(70) } })).every((p) => !/70/.test(p)));
pruefe('Tor: leerer SEO-Titel → Problem', pruefeEintrag(voll({ neu: { ...voll().neu, seoTitle: ' ' } })).some((p) => /SEO-Titel würde leer/.test(p)));
pruefe('Tor: leere SEO-Beschreibung → Problem', pruefeEintrag(voll({ neu: { ...voll().neu, seoDescription: '' } })).some((p) => /SEO-Beschreibung würde leer/.test(p)));
pruefe('Tor: neuer Link in summary → Problem', pruefeEintrag(voll({ neu: { ...voll().neu, summary: '<p>Ratgeber <a href="/x">hier</a>.</p>' } })).some((p) => /summary: neues/.test(p)));
pruefe('Tor: Kommentar in summary verändert → Problem', pruefeEintrag(voll({ alt: { ...voll().alt, summary: `<!-- k -->${SUMM_ALT}` } })).some((p) => /summary: HTML-Kommentare/.test(p)));
pruefe('trefferZahl zählt SEO-Felder als Klartext', trefferZahl({ seoDescription: SEO_ALT }, ['seoDescription']) >= 1 && trefferZahl({ seoDescription: SEO_NEU }, ['seoDescription']) === 0);

for (const e of [voll(), voll({ art: 'Seite', blog: undefined, handle: 'pflege', alt: { ...voll().alt, summary: undefined }, neu: { ...voll().neu, summary: undefined } })]) {
  const k = e.art;
  // Seite: summary entfällt aus dem Eintrag
  if (e.art === 'Seite') { delete e.alt.summary; delete e.neu.summary; }
  const s = shop(start(e)); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  const st = s.stand(e);
  pruefe(`Alle Felder ${k}: Exit 0`, rc === 0, `rc ${rc} ${stumm.slice(-3).join(' / ')}`);
  pruefe(`Alle Felder ${k}: body, SEO-Titel und SEO-Beschreibung stehen im Shop`, st.body === e.neu.body && st.seoDescription === e.neu.seoDescription && st.seoTitle === e.neu.seoTitle);
  if (k === 'Artikel') pruefe('Alle Felder Artikel: summary steht im Shop', st.summary === e.neu.summary);
  pruefe(`Alle Felder ${k}: Update und Metafeld-Schreiben je einmal, SEO-Titel unverändert nicht geschrieben`, s.schreibaufrufe() === 2 && s.aufrufe.find((a) => a.query === SCHREIBEN_SEO).vars.m.length === 1, JSON.stringify(s.aufrufe.filter((a) => a.query === SCHREIBEN_SEO).map((a) => a.vars.m.map((x) => x.key))));
  const rc2 = await lf(s, [e], { live: true });
  pruefe(`Alle Felder ${k}: zweiter Lauf schreibt nichts`, rc2 === 0 && s.schreibaufrufe() === 2);
  const rc3 = await lf(s, [e], { live: true, zurueck: true });
  const st2 = s.stand(e);
  pruefe(`Alle Felder ${k}: Rücknahme stellt alles wieder her`, rc3 === 0 && st2.body === e.alt.body && st2.seoDescription === e.alt.seoDescription && (k === 'Seite' || st2.summary === e.alt.summary), `rc ${rc3}`);
}
{
  // nur SEO geändert: kein body-Update
  const e = eintrag({ rest: 0, alt: { seoDescription: SEO_ALT }, neu: { seoDescription: SEO_NEU } }); const s = shop({ [schluessel(e)]: { body: '<p>x</p>', seoDescription: SEO_ALT } });
  const rc = await lf(s, [e], { live: true });
  pruefe('Nur SEO: Exit 0, nur das Metafeld geschrieben, body unberührt', rc === 0 && s.schreibaufrufe() === 1 && s.aufrufe.some((a) => a.query === SCHREIBEN_SEO) && s.stand(e).body === '<p>x</p>' && s.stand(e).seoDescription === SEO_NEU, `rc ${rc}`);
}
{
  // nur body geändert: kein Metafeld-Schreiben
  const e = eintrag(); const s = shop(start(e));
  const rc = await lf(s, [e], { live: true });
  pruefe('Nur body: kein Metafeld-Schreiben', rc === 0 && !s.aufrufe.some((a) => a.query === SCHREIBEN_SEO));
}
{
  // Fehler im Metafeld-Schreiben → Halt mit Exit 6
  const e = voll(); const s = shop(start(e), { fehlerBeiSeo: 'Metafeld gesperrt' }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Metafeld-Fehler: Exit 6 und Ledger FEHLER', rc === 6 && ledgerZeilen.some((z) => z.split('|')[1] === 'FEHLER' && /Metafeld gesperrt/.test(z)), `rc ${rc}`);
}
{
  // fremde Änderung nur im SEO-Feld wird erkannt
  const e = voll(); const s = shop({ [schluessel(e)]: { ...e.alt, seoDescription: 'Jemand anderes' } }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Fremd verändert nur im SEO-Feld: Exit 6, nichts geschrieben', rc === 6 && s.schreibaufrufe() === 0 && ledgerZeilen.some((z) => z.split('|')[1] === 'FREMD'), `rc ${rc}`);
}
{
  // Rücklesen weicht nur im SEO-Feld ab
  const e = voll(); const s = shop(start(e), { schreibtNicht: true }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Schreibt der Shop nichts: Exit 6 ABWEICHUNG', rc === 6 && ledgerZeilen.some((z) => z.split('|')[1] === 'ABWEICHUNG'));
}

{
  // alt nennt ein Feld mehr als neu → Tor
  const e = eintrag({ alt: { body: eintrag().alt.body, seoTitle: 'x' }, neu: { body: eintrag().neu.body } });
  pruefe('Tor: alt nennt ein Feld, neu nicht → Problem', pruefeEintrag(e).some((p) => /Texte sein/.test(p)));
}
{
  // Update schickt nur geänderte HTML-Felder: summary steht schon im neuen Stand
  const e = voll(); const s = shop({ [schluessel(e)]: { ...e.alt, summary: e.neu.summary } });
  const rc = await lf(s, [e], { live: true });
  const upd = s.aufrufe.find((a) => a.query === SCHREIBEN_ARTIKEL);
  pruefe('Update schickt nur das geänderte HTML-Feld (body), nicht die schon neue summary', rc === 0 && upd && JSON.stringify(Object.keys(upd.vars.in)) === JSON.stringify(['body']), JSON.stringify(upd?.vars.in && Object.keys(upd.vars.in)));
}
{
  // Teilstand aus einem abgebrochenen Lauf: Text schon neu, SEO-Beschreibung noch alt → der nächste Lauf setzt fort
  const e = voll(); const s = shop({ [schluessel(e)]: { body: e.neu.body, summary: e.neu.summary, seoTitle: e.alt.seoTitle, seoDescription: e.alt.seoDescription } });
  const rc = await lf(s, [e], { live: true });
  pruefe('Teilstand: Exit 0, nur das Metafeld nachgeschrieben, kein Update-Aufruf', rc === 0 && s.stand(e).seoDescription === e.neu.seoDescription && s.aufrufe.filter((a) => a.query === SCHREIBEN_ARTIKEL).length === 0 && s.aufrufe.filter((a) => a.query === SCHREIBEN_SEO).length === 1, `rc ${rc}`);
  const s2 = shop({ [schluessel(e)]: { body: e.neu.body, summary: e.neu.summary, seoTitle: e.alt.seoTitle, seoDescription: e.alt.seoDescription } });
  const rcR = await lf(s2, [e], { live: true, zurueck: true });
  pruefe('Teilstand: Rücknahme setzt auf alt zurück', rcR === 0 && s2.stand(e).body === e.alt.body && s2.stand(e).summary === e.alt.summary, `rc ${rcR}`);
}
{
  // Update-Fehler: das Metafeld wird NICHT mehr geschrieben und der Fehler geht nicht verloren
  const e = voll(); const s = shop(start(e), { fehlerBeiSchreiben: 'Update gesperrt' }); ledgerZeilen = [];
  const rc = await lf(s, [e], { live: true });
  pruefe('Update-Fehler: Exit 6, Metafeld nicht mehr geschrieben, Fehler im Ledger', rc === 6 && s.schreibaufrufe() === 1 && !s.aufrufe.some((a) => a.query === SCHREIBEN_SEO) && ledgerZeilen.some((z) => z.split('|')[1] === 'FEHLER' && /Update gesperrt/.test(z)), `rc ${rc} ${s.schreibaufrufe()}`);
}
{
  // Logzeile zählt nur die Felder des Eintrags (body des Shops trägt Treffer, der Eintrag fasst nur SEO an)
  const e = eintrag({ rest: 0, alt: { seoDescription: SEO_ALT }, neu: { seoDescription: SEO_NEU } });
  const s = shop({ [schluessel(e)]: { body: ANGEBOT, seoDescription: SEO_ALT } }); stumm.length = 0;
  await lf(s, [e], { live: false });
  const zeile = stumm.find((z) => /würde schreiben/.test(z)) || '';
  pruefe('Logzeile: Treffer nur in den Feldern des Eintrags (1 → 0)', /Treffer 1 → 0/.test(zeile) && /\[seoDescription\]/.test(zeile), zeile);
}
{
  // fremder Namensraum mit gleichem Schlüssel wird nicht gelesen: der Stand stimmt nur mit dem global-Wert
  const e = eintrag({ rest: 0, alt: { seoDescription: SEO_ALT }, neu: { seoDescription: SEO_NEU } });
  const s = shop({ [schluessel(e)]: { body: '<p>x</p>', seoDescription: SEO_ALT } });
  const rc = await lf(s, [e], { live: true });
  pruefe('Fremder Namensraum custom.description_tag stört nicht (Exit 0, richtiger Wert gelesen)', rc === 0 && s.stand(e).seoDescription === SEO_NEU, `rc ${rc}`);
}

// ───────────────────────── die echte Eingabedatei besteht die Tore (sobald sie existiert)
const HIER = dirname(fileURLToPath(import.meta.url));
const pfad = join(HIER, 'seitentexte.json');
if (existsSync(pfad)) {
  const datei = JSON.parse(readFileSync(pfad, 'utf8'));
  pruefe('Eingabedatei: keine doppelten Einträge', new Set(datei.eintraege.map(schluessel)).size === datei.eintraege.length);
  for (const e of datei.eintraege) {
    const p = pruefeEintrag(e);
    pruefe(`Eingabedatei ${schluessel(e)}: Tore bestanden`, p.length === 0, p.join(' | '));
    pruefe(`Eingabedatei ${schluessel(e)}: alter Text nannte mehr Treffer`, trefferZahl(e.alt, felderVon(e)) > trefferZahl(e.neu, felderVon(e)));
  }
}

console.log(`${ok} Prüfungen bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
