// Test für wiederherstellen.mjs mit Attrappe des Shops (kein Netz, keine Zugangsdaten).
// Aufruf: node dropship/futterautomat-1011/wiederherstellen_test.mjs
// Für die Mutationsprobe: ZIEL=<Pfad zur Kopie von wiederherstellen.mjs>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.env.ZIEL ? pathToFileURL(path.resolve(process.env.ZIEL)).href : new URL('./wiederherstellen.mjs', import.meta.url).href;
const M = await import(ziel);
const ORIG = path.join(hier, 'sicherung.json');

let ok = 0, schlecht = 0;
const pruefe = (name, bedingung, detail = '') => {
  if (bedingung) { ok++; } else { schlecht++; console.log('FEHLER:', name, detail); }
};
const still = () => {};

const kurzZustand = () => ({
  handle: M.HANDLE, status: 'ACTIVE',
  title: 'Futterspender für Katzen in Weiss',
  descriptionHtml: M.KURZ_BODY,
  seo: { title: 'Futterspender für Katzen in Weiss | LuxeStyle', description: 'Weisser Futterspender für Katzen in einer Ausführung. Aktuellen Preis und Verfügbarkeit direkt bei LuxeStyle prüfen.' },
  material: { id: 'gid://shopify/Metafield/1', value: M.SOLL_MATERIAL },
});

function attrappe(start, opts = {}) {
  const st = JSON.parse(JSON.stringify(start));
  const log = { lesen: 0, schreiben: [] };
  const gql = async (q, v) => {
    if (q.includes('productUpdate')) {
      log.schreiben.push(JSON.parse(JSON.stringify(v.i)));
      if (opts.fehler) return { productUpdate: { userErrors: [{ field: ['title'], message: 'kaputt' }] } };
      const i = v.i;
      if (i.title !== undefined) st.title = i.title;
      if (i.descriptionHtml !== undefined) st.descriptionHtml = i.descriptionHtml;
      if (i.seo) st.seo = { title: i.seo.title, description: i.seo.description };
      if (i.metafields) for (const m of i.metafields) if (st.material && st.material.id === m.id) st.material.value = m.value;
      return { productUpdate: { userErrors: [] } };
    }
    log.lesen++;
    const kopie = JSON.parse(JSON.stringify(st));
    if (opts.rueckleseAbweichung && log.schreiben.length) kopie.descriptionHtml += ' (anders)';
    return { product: kopie };
  };
  return { st, log, gql };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'futter-test-'));
const dateien = () => {
  const dir = fs.mkdtempSync(path.join(tmp, 'l-'));
  return { orig: ORIG, kurz: path.join(dir, 'kurz.json'), v1: path.join(dir, 'v1.json'), fremd: path.join(dir, 'fremd.json') };
};
const fahre = (a, extra = {}) => { const d = dateien(); return M.lauf({ gql: a.gql, dateien: d, log: still, warte: async () => {}, ...extra }).then((code) => ({ code, d })); };

const orig = JSON.parse(fs.readFileSync(ORIG, 'utf8'));
const soll = M.baueSoll(orig);

// 1 Soll-Inhalt
pruefe('Soll: Titel mit «Automatischer»', soll.title === 'Automatischer Futterspender für Katzen');
pruefe('Soll: SEO-Titel aus der Sicherung', soll.seo.title === orig.seo.title && /Automatischer/.test(soll.seo.title));
pruefe('Soll: SEO-Beschreibung höchstens 160 Zeichen', soll.seo.description.length <= 160, String(soll.seo.description.length));
pruefe('Soll: SEO-Titel höchstens 70 Zeichen', soll.seo.title.length <= 70, String(soll.seo.title.length));
pruefe('Soll: Text nennt die Futterschale aus Edelstahl', soll.descriptionHtml.includes('Futterschale aus Edelstahl'));
pruefe('Soll: Text sagt nicht mehr «aus Edelstahl gefertigt»', !/aus Edelstahl gefertigt/i.test(soll.descriptionHtml) && !/besteht aus Edelstahl/i.test(soll.descriptionHtml));
pruefe('Soll: Text nennt Gewicht und Farbe', soll.descriptionHtml.includes('2.2 kg') && soll.descriptionHtml.includes('Weiss'));
pruefe('Soll: nichts Unbelegtes (elektrisch, App, Fassungsvermögen, Liter)', !/elektrisch|\bapp\b|fassungsverm|liter/i.test(soll.descriptionHtml + soll.seo.description + soll.title));
pruefe('Soll: Material-Feld nennt nur die Schale', soll.material === 'Edelstahl (Futterschale)');
pruefe('Soll: Kurzfassung ist nicht mehr im Text', !soll.descriptionHtml.includes('Prüfe vor dem Kauf'));
let wirft = false; try { M.baueSoll({ ...orig, descriptionHtml: orig.descriptionHtml.replace('Aus Edelstahl gefertigt', 'Anders') }); } catch { wirft = true; }
pruefe('baueSoll: fehlender Anker wirft', wirft);
wirft = false; try { M.baueSoll({ ...orig, descriptionHtml: orig.descriptionHtml + orig.descriptionHtml }); } catch { wirft = true; }
pruefe('baueSoll: doppelter Anker wirft', wirft);
wirft = false; try { M.baueSoll({ ...orig, descriptionHtml: orig.descriptionHtml.replace('mit Futter, auch wenn du nicht zu Hause bist.', 'mit Futter.') }); } catch { wirft = true; }
pruefe('baueSoll: fehlender Anker des Abwesenheits-Satzes wirft', wirft);

// 1b Soll (zweite Fassung): ohne den abgeleiteten Satz, SEO-Beschreibung mit dem belegten Gewicht
const sollV1 = M.baueSollV1(orig);
pruefe('Produkt-ID und Handle fest (nicht aus dem geprüften Modul abgeleitet)', M.ID === 'gid://shopify/Product/15523986473345' && M.HANDLE === 'futterautomat-fur-katze-527488');
pruefe('Soll: kein «nicht zu Hause», keine «Abwesenheit» in Titel, Text, SEO', !/nicht zu Hause|abwesen/i.test(soll.title + soll.descriptionHtml + soll.seo.title + soll.seo.description));
pruefe('Soll: Text sagt «versorgt deine Katze mit Futter.»', soll.descriptionHtml.includes('versorgt deine Katze mit Futter. Er hat eine automatische Fütterungsfunktion'));
pruefe('Soll: SEO-Beschreibung nennt das belegte Gewicht und die Schale', soll.seo.description.includes('2,2 kg') && soll.seo.description.includes('Futterschale aus Edelstahl'));
pruefe('V1 (10:27 UTC): trägt den Abwesenheits-Satz in Text und SEO', sollV1.descriptionHtml.includes('mit Futter, auch wenn du nicht zu Hause bist.') && /nicht zu Hause/.test(sollV1.seo.description));
pruefe('V1 und Soll unterscheiden sich nur im Satzteil und in der SEO-Beschreibung', sollV1.descriptionHtml.replace('mit Futter, auch wenn du nicht zu Hause bist.', 'mit Futter.') === soll.descriptionHtml && sollV1.title === soll.title && sollV1.seo.title === soll.seo.title && sollV1.material === soll.material);

// 2 Trockenlauf
{
  const a = attrappe(kurzZustand());
  const { code, d } = await fahre(a);
  pruefe('Trockenlauf: Exit 0', code === 0, String(code));
  pruefe('Trockenlauf: nichts geschrieben', a.log.schreiben.length === 0);
  pruefe('Trockenlauf: keine Sicherungsdatei', !fs.existsSync(d.kurz));
}

// 3 LIVE auf der Kurzfassung
{
  const a = attrappe(kurzZustand());
  const { code, d } = await fahre(a, { live: true });
  pruefe('LIVE: Exit 0', code === 0, String(code));
  pruefe('LIVE: genau ein Schreibaufruf', a.log.schreiben.length === 1, String(a.log.schreiben.length));
  const i = a.log.schreiben[0] || {};
  pruefe('LIVE: Produkt-ID im Aufruf', i.id === M.ID);
  pruefe('LIVE: Titel, Text, SEO wie Soll', i.title === soll.title && i.descriptionHtml === soll.descriptionHtml && i.seo && i.seo.title === soll.seo.title && i.seo.description === soll.seo.description);
  pruefe('LIVE: Material gleich, also kein Metafeld im Aufruf', !i.metafields);
  pruefe('LIVE: kein Handle im Aufruf (Adresse bleibt)', i.handle === undefined);
  pruefe('LIVE: Zustand danach gleich Soll', a.st.title === soll.title && a.st.descriptionHtml === soll.descriptionHtml && a.st.seo.description === soll.seo.description);
  const s = fs.existsSync(d.kurz) ? JSON.parse(fs.readFileSync(d.kurz, 'utf8')) : null;
  pruefe('LIVE: Kurzfassung gesichert (Titel, Text, SEO, Material)', !!s && s.title === 'Futterspender für Katzen in Weiss' && s.descriptionHtml === M.KURZ_BODY && s.seo.title.endsWith('| LuxeStyle') && s.material.id === 'gid://shopify/Metafield/1');
}

// 4 LIVE mit abweichendem Material-Metafeld
{
  const z = kurzZustand(); z.material.value = 'Edelstahl';
  const a = attrappe(z);
  const { code } = await fahre(a, { live: true });
  const i = a.log.schreiben[0] || {};
  pruefe('Material abweichend: Exit 0 und Metafeld im Aufruf', code === 0 && Array.isArray(i.metafields) && i.metafields[0].id === 'gid://shopify/Metafield/1' && i.metafields[0].value === soll.material);
  pruefe('Material abweichend: Zustand danach Soll', a.st.material.value === soll.material);
}

// 5 schon im Soll: Wiederholung schreibt nichts
{
  const z = kurzZustand(); z.title = soll.title; z.descriptionHtml = soll.descriptionHtml; z.seo = { ...soll.seo };
  const a = attrappe(z);
  const { code, d } = await fahre(a, { live: true });
  pruefe('Schon im Soll: Exit 0, nichts geschrieben, keine Sicherung', code === 0 && a.log.schreiben.length === 0 && !fs.existsSync(d.kurz));
}

// 6 jemand hat zwischenzeitlich anders geändert
{
  const z = kurzZustand(); z.descriptionHtml = '<p>Ganz anderer Text.</p>';
  const a = attrappe(z);
  const { code, d } = await fahre(a, { live: true });
  pruefe('Fremde Änderung: Exit 4, nichts geschrieben, keine Sicherung', code === 4 && a.log.schreiben.length === 0 && !fs.existsSync(d.kurz) && !fs.existsSync(d.v1) && !fs.existsSync(d.fremd), String(code));
  const b = attrappe(z);
  const r = await fahre(b, { live: true, fremd: true });
  pruefe('Fremde Änderung mit FREMD: schreibt und sichert in die Fremd-Sicherung', r.code === 0 && b.log.schreiben.length === 1 && fs.existsSync(r.d.fremd) && !fs.existsSync(r.d.kurz) && !fs.existsSync(r.d.v1));
  const sf = fs.existsSync(r.d.fremd) ? JSON.parse(fs.readFileSync(r.d.fremd, 'utf8')) : null;
  pruefe('Fremd-Sicherung trägt den fremden Text', !!sf && sf.descriptionHtml === '<p>Ganz anderer Text.</p>');
}

// 7 falsches Produkt
{
  const z = kurzZustand(); z.handle = 'ein-anderes-produkt';
  const a = attrappe(z);
  const { code } = await fahre(a, { live: true });
  pruefe('Falscher Handle: Exit 3, nichts geschrieben', code === 3 && a.log.schreiben.length === 0, String(code));
}

// 8 Fehler von Shopify
{
  const a = attrappe(kurzZustand(), { fehler: true });
  const { code } = await fahre(a, { live: true });
  pruefe('userErrors: Exit 5', code === 5, String(code));
}

// 9 Rücklesen weicht ab
{
  const a = attrappe(kurzZustand(), { rueckleseAbweichung: true });
  const { code } = await fahre(a, { live: true });
  pruefe('Rücklesen weicht ab: Exit 6', code === 6, String(code));
}

// 10 Rücknahme
{
  const a = attrappe(kurzZustand());
  const r1 = await fahre(a, { live: true });
  pruefe('Rücknahme-Vorbereitung: Soll steht', r1.code === 0 && a.st.title === soll.title);
  const probe = await M.lauf({ gql: a.gql, dateien: r1.d, log: still, zurueck: true, live: false, warte: async () => {} });
  pruefe('Rücknahme Trockenlauf: Exit 0 und nichts geschrieben', probe === 0 && a.log.schreiben.length === 1);
  const code = await M.lauf({ gql: a.gql, dateien: r1.d, log: still, zurueck: true, live: true, warte: async () => {} });
  pruefe('Rücknahme LIVE: Exit 0', code === 0, String(code));
  pruefe('Rücknahme: Kurzfassung wieder da (Titel, Text, SEO)', a.st.title === 'Futterspender für Katzen in Weiss' && a.st.descriptionHtml === M.KURZ_BODY && a.st.seo.title.endsWith('| LuxeStyle') && a.st.seo.description.startsWith('Weisser Futterspender'));
}

// 11 Vorgänger «V1» (Fassung von 10:27 UTC) -> Soll
const v1Zustand = () => ({
  handle: M.HANDLE, status: 'ACTIVE', title: sollV1.title, descriptionHtml: sollV1.descriptionHtml,
  seo: { ...sollV1.seo }, material: { id: 'gid://shopify/Metafield/1', value: M.SOLL_MATERIAL },
});
{
  const a = attrappe(v1Zustand());
  const d = dateien();
  fs.writeFileSync(d.kurz, 'KURZ-UNVERAENDERT');
  const trocken = await M.lauf({ gql: a.gql, dateien: d, log: still, warte: async () => {} });
  pruefe('V1 -> Soll Trockenlauf: Exit 0, nichts geschrieben, keine V1-Sicherung', trocken === 0 && a.log.schreiben.length === 0 && !fs.existsSync(d.v1));
  const code = await M.lauf({ gql: a.gql, dateien: d, log: still, warte: async () => {}, live: true });
  const i = a.log.schreiben[0] || {};
  pruefe('V1 -> Soll: Exit 0, ein Schreibaufruf', code === 0 && a.log.schreiben.length === 1, String(code));
  pruefe('V1 -> Soll: Produkt-ID, Titel, Text, SEO wie Soll', i.id === M.ID && i.title === soll.title && i.descriptionHtml === soll.descriptionHtml && i.seo && i.seo.description === soll.seo.description && i.seo.title === soll.seo.title);
  pruefe('V1 -> Soll: Material gleich, also kein Metafeld im Aufruf', !i.metafields);
  pruefe('V1 -> Soll: Zustand danach Soll', a.st.title === soll.title && a.st.descriptionHtml === soll.descriptionHtml && a.st.seo.description === soll.seo.description);
  const s = fs.existsSync(d.v1) ? JSON.parse(fs.readFileSync(d.v1, 'utf8')) : null;
  pruefe('V1 -> Soll: V1 in eigener Sicherung (Text, SEO)', !!s && s.descriptionHtml === sollV1.descriptionHtml && s.seo.description === sollV1.seo.description);
  pruefe('V1 -> Soll: Sicherung der Kurzfassung bleibt unberührt', fs.readFileSync(d.kurz, 'utf8') === 'KURZ-UNVERAENDERT');
  pruefe('V1 -> Soll: keine Fremd-Sicherung', !fs.existsSync(d.fremd));
}

// 12 Teilzustand: Text schon wie Soll, SEO-Beschreibung aber anders -> Exit 4 (jemand hat nur Teile geändert), nichts geschrieben
{
  const z = v1Zustand(); z.descriptionHtml = soll.descriptionHtml;
  const a = attrappe(z);
  const { code, d } = await fahre(a, { live: true });
  pruefe('Teilzustand (Text Soll, SEO anders): Exit 4, nichts geschrieben, keine Sicherung', code === 4 && a.log.schreiben.length === 0 && !fs.existsSync(d.v1) && !fs.existsSync(d.fremd), String(code));
}
// ... und je ein einzelnes Feld abweichend, alles andere wie Soll: nie «Schon im Soll», nie stilles Überschreiben
for (const [name, aendere] of [
  ['Titel', (z) => { z.title = 'Anderer Titel'; }],
  ['SEO-Titel', (z) => { z.seo = { ...z.seo, title: 'Anderer SEO-Titel' }; }],
  ['SEO-Beschreibung', (z) => { z.seo = { ...z.seo, description: 'Andere Beschreibung.' }; }],
  ['Material', (z) => { z.material = { ...z.material, value: 'Edelstahl' }; }],
]) {
  const z = v1Zustand(); z.descriptionHtml = soll.descriptionHtml; z.title = soll.title; z.seo = { ...soll.seo }; z.material = { ...z.material, value: soll.material };
  aendere(z);
  const a = attrappe(z);
  const { code } = await fahre(a, { live: true });
  pruefe(`Nur ${name} weicht ab: Exit 4, nichts geschrieben`, code === 4 && a.log.schreiben.length === 0, String(code));
}

// 13 Rücknahme auf V1 (Fassung von 10:27 UTC), ohne Sicherungsdatei: sie wird aus dem Original gebaut
{
  const z = v1Zustand(); z.descriptionHtml = soll.descriptionHtml; z.seo = { ...soll.seo };
  const a = attrappe(z);
  const d = dateien();
  const probe = await M.lauf({ gql: a.gql, dateien: d, log: still, zurueck: 'v1', live: false, warte: async () => {} });
  pruefe('Rücknahme V1 Trockenlauf: Exit 0 und nichts geschrieben', probe === 0 && a.log.schreiben.length === 0);
  const code = await M.lauf({ gql: a.gql, dateien: d, log: still, zurueck: 'v1', live: true, warte: async () => {} });
  const i = a.log.schreiben[0] || {};
  pruefe('Rücknahme V1 LIVE: Exit 0, ein Schreibaufruf mit Produkt-ID, ohne Metafeld', code === 0 && a.log.schreiben.length === 1 && i.id === M.ID && !i.metafields, String(code));
  pruefe('Rücknahme V1: Fassung von 10:27 UTC steht wieder (Titel, Text, SEO)', a.st.title === sollV1.title && a.st.descriptionHtml === sollV1.descriptionHtml && a.st.seo.description === sollV1.seo.description && a.st.seo.title === sollV1.seo.title);
}

// 14 Kurzfassung bleibt ein gültiger Vorgänger, auch wenn eine V1-Sicherung schon existiert
{
  const a = attrappe(kurzZustand());
  const d = dateien();
  fs.writeFileSync(d.v1, 'V1-ALT');
  const code = await M.lauf({ gql: a.gql, dateien: d, log: still, warte: async () => {}, live: true });
  const s = fs.existsSync(d.kurz) ? JSON.parse(fs.readFileSync(d.kurz, 'utf8')) : null;
  pruefe('Kurzfassung mit vorhandener V1-Sicherung: Exit 0, Kurzfassung in kurz.json, V1-Sicherung unberührt', code === 0 && !!s && s.descriptionHtml === M.KURZ_BODY && fs.readFileSync(d.v1, 'utf8') === 'V1-ALT');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${ok} bestanden, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
