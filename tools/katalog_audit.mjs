#!/usr/bin/env node
/**
 * katalog_audit.mjs — Kommandozeile und Selbsttests des Katalog-Audits.
 *
 *   node tools/katalog_audit.mjs --selbsttest
 *   node tools/katalog_audit.mjs luxestyle.ch
 *   node tools/katalog_audit.mjs luxestyle.ch --seiten 5 --json bericht.json
 *
 * 🔑 DIE PRUEFER SELBST STEHEN IN `functions/_katalog_audit.mjs` — genau EINMAL.
 * Dort liegen sie, weil Cloudflare Pages nur aus `functions/` ausliefert; die
 * oeffentliche Seite `/api/shop-check` benutzt dasselbe Modul. Damit kann die Seite
 * nicht anders urteilen als die Kommandozeile. (Lehre vom 27.09.2026: eine Regel, die
 * an zwei Stellen steht, wird an einer Stelle falsch.)
 *
 * WARUM ES DIESES GERAET GIBT
 * GEMESSEN 29.09.2026: `https://<shop>/products.json` liefert auf JEDEM Shopify-Shop
 * HTTP 200 (luxestyle.ch, gymshark.com, allbirds.com, waterdrop.de) — mit Titel,
 * Optionen, Varianten, Preis, `compare_at_price` und Bildern. Ein Katalogfehler laesst
 * sich damit von aussen belegen, ohne dass der Haendler irgendetwas freigibt.
 *
 * DIE GEGENPROBE, DIE DAS GERAET ERST BRAUCHBAR MACHT (GEMESSEN 29.09.2026):
 *   gymshark.com   250 Produkte -> 0 Befunde
 *   allbirds.com   250 Produkte -> 0 Befunde
 *   waterdrop.de   169 Produkte -> 14 Befunde, stichprobenweise als echt bestaetigt
 *   luxestyle.ch  1000 Produkte -> 91 Befunde
 * Ein Pruefer, der ueberall ausschlaegt, misst nichts. Dieser unterscheidet einen
 * gepflegten Katalog von einem, in den Lieferantendaten roh hineingelaufen sind.
 */

import {
  GEDROSSELT, istDeutsch, istRoheVariante, istFremdsprachigeFarbe, zuRappen,
  istStreichpreisDefekt, hatPreisgrund, istFarbwert, optionFarbeOhneFarben,
  optionIstPreisgrund, gleicheWareVerschiedenePreise, holeSeite, pruefe, bericht,
} from '../functions/_katalog_audit.mjs';

/* ----------------------------------------------------------------------- */

function selbsttest() {
  let gut = 0; const schlecht = [];
  const p = (name, bedingung) => { if (bedingung) gut++; else schlecht.push(name); };

  // --- rohe Variantentexte (echte Faelle aus dem LuxeStyle-Katalog)
  p('Set20-YellowLXS ist roh', istRoheVariante('Set20-YellowLXS'));
  p('Set 3-GreenSXL ist roh', istRoheVariante('Set 3-GreenSXL'));
  p('JJF106230color- ist roh', istRoheVariante('JJF106230color-'));
  p('Red-FatherS ist roh', istRoheVariante('Red-FatherS'));
  p('GreySXL ist roh', istRoheVariante('Set 10-GreySXL'));
  p('angeklebte Groesse ohne Set-Code wird gefunden', istRoheVariante('GreySXL'));
  // EHRLICHE GRENZE, als Test festgehalten statt verschwiegen: ein Lieferantentext,
  // der weder Set-Code noch angeklebte Groesse hat, wird NICHT gefunden.
  p('BEKANNTE LUECKE Black Graffiti-M55 To 59cm wird nicht gefunden',
    istRoheVariante('Black Graffiti-M55 To 59cm') === false);
  // GEGENPROBE: sauberes Deutsch darf NIE als roh gelten
  p('GEGENPROBE Rot · Papa S ist sauber', !istRoheVariante('Rot · Papa S'));
  p('GEGENPROBE Blau / L ist sauber', !istRoheVariante('Blau / L'));
  p('GEGENPROBE Schwarz ist sauber', !istRoheVariante('Schwarz'));
  p('GEGENPROBE Wie abgebildet ist sauber', !istRoheVariante('Wie abgebildet'));
  p('GEGENPROBE leer ist kein Befund', !istRoheVariante(''));
  // die Falle der fehlenden Wortgrenze, an einem echten Titel
  p('GEGENPROBE Perle endet auf kleinem l', !istRoheVariante('Perle'));
  p('GEGENPROBE Edelstahl ist sauber', !istRoheVariante('Edelstahl'));

  // --- Fremdsprache
  // EHRLICHE GRENZE: Lieferanten-Tippfehler (`Sky bule` fuer sky blue, `Gellow` fuer
  // yellow) sind KEINE Woerter und werden nicht erkannt. Als Test festgehalten, damit
  // niemand spaeter glaubt, das Geraet decke sie ab.
  p('BEKANNTE LUECKE Sky bule wird nicht erkannt', istFremdsprachigeFarbe('Sky bule') === false);
  p('BEKANNTE LUECKE Gellow wird nicht erkannt', istFremdsprachigeFarbe('Gellow') === false);
  p('Pieces of red ist englisch', istFremdsprachigeFarbe('Pieces of red'));
  p('Green ist englisch', istFremdsprachigeFarbe('Green'));
  p('Grey ist englisch', istFremdsprachigeFarbe('Grey'));
  // GEGENPROBE: deutsche Farben duerfen NIE ausschlagen
  p('GEGENPROBE Rot ist nicht englisch', !istFremdsprachigeFarbe('Rot'));
  p('GEGENPROBE Grau ist nicht englisch', !istFremdsprachigeFarbe('Grau'));
  p('GEGENPROBE Schwarz ist nicht englisch', !istFremdsprachigeFarbe('Schwarz'));
  p('GEGENPROBE Orange zaehlt in beiden Sprachen nicht', !istFremdsprachigeFarbe('Orange'));
  // und der gefaehrlichste Fall: ein deutsches Wort, das ein englisches enthaelt
  p('GEGENPROBE Rotbraun ist nicht englisch', !istFremdsprachigeFarbe('Rotbraun'));
  p('GEGENPROBE Silbergrau ist nicht englisch', !istFremdsprachigeFarbe('Silbergrau'));

  // --- Option heisst Farbe, traegt aber keine Farben (echte Faelle vom 29.09.2026)
  p('Schranklicht: Farbe ohne Farben', optionFarbeOhneFarben({ name: 'Farbe',
    values: ['Human body induction', 'Hand sweep clock', 'Hand sweep timing', 'Set'] }));
  p('Wasserhahnfilter: Farbe ohne Farben', optionFarbeOhneFarben({ name: 'Farbe',
    values: ['Filter element', 'Sliver'] }));
  // GEGENPROBE zum Fehlalarm an einem FREMDEN Shop (29.09.2026, waterdrop.de):
  // zusammengesetzte deutsche Farben SIND Farben.
  p('GEGENPROBE sandrot ist eine Farbe', istFarbwert('sandrot'));
  p('GEGENPROBE rasengrün ist eine Farbe', istFarbwert('rasengrün'));
  p('GEGENPROBE marineblau ist eine Farbe', istFarbwert('marineblau'));
  p('GEGENPROBE dunkelgrau ist eine Farbe', istFarbwert('dunkelgrau'));
  p('GEGENPROBE sandrot-Option ist in Ordnung', !optionFarbeOhneFarben({ name: 'Farbe',
    values: ['sandrot', 'rasengrün'] }));
  p('BOOST und FLAIR sind keine Farben', !istFarbwert('BOOST') && !istFarbwert('FLAIR'));
  // GEGENPROBE: eine echte Farboption darf NIE ausschlagen
  p('GEGENPROBE echte Farben sind in Ordnung', !optionFarbeOhneFarben({ name: 'Farbe',
    values: ['Rot', 'Blau', 'Schwarz', 'Weiss'] }));
  p('GEGENPROBE englische echte Farben sind in Ordnung', !optionFarbeOhneFarben({ name: 'Color',
    values: ['Red', 'Blue', 'Black'] }));
  p('GEGENPROBE gemischte Farbnamen sind in Ordnung', !optionFarbeOhneFarben({ name: 'Farbe',
    values: ['Khaki', 'Bordeaux', 'Marine blau'] }));
  p('GEGENPROBE EIN Tippfehler klagt das Produkt nicht an', !optionFarbeOhneFarben({ name: 'Farbe',
    values: ['Rot', 'Blau', 'Sky bule'] }));
  p('GEGENPROBE andere Optionsnamen sind nicht betroffen', !optionFarbeOhneFarben({ name: 'Grösse',
    values: ['S', 'M', 'L'] }));
  p('GEGENPROBE leere Werte sind kein Befund', !optionFarbeOhneFarben({ name: 'Farbe', values: [] }));
  p('GEGENPROBE Default Title zaehlt nicht', !optionFarbeOhneFarben({ name: 'Farbe', values: ['Default Title'] }));

  // --- Shopsprache
  p('deutsche Titel werden erkannt', istDeutsch(['Hundeleine mit Halsband', 'Napf für Katzen', 'Kissen aus Baumwolle']) === true);
  p('GEGENPROBE englische Titel nicht', istDeutsch(['Dog leash and collar', 'Bowl for cats', 'Cotton pillow']) === false);
  p('GEGENPROBE leere Liste ist unbekannt', istDeutsch([]) === null);

  // --- Streichpreis
  p('gleich hoch ist ein Defekt', istStreichpreisDefekt('19.90', '19.90'));
  p('niedriger ist ein Defekt', istStreichpreisDefekt('19.90', '14.90'));
  // GEGENPROBE
  p('GEGENPROBE echter Streichpreis ist kein Defekt', !istStreichpreisDefekt('19.90', '29.90'));
  p('GEGENPROBE kein Streichpreis ist kein Defekt', !istStreichpreisDefekt('19.90', null));
  p('19.9 und 19.90 sind derselbe Preis', istStreichpreisDefekt('19.9', '19.90'));

  // --- gleiche Ware, verschiedene Preise
  const nurFarben = [{ title: 'Rot', price: '15.90' }, { title: 'Blau', price: '24.90' }];
  const mitGroesse = [{ title: 'Rot / S', price: '15.90' }, { title: 'Rot / XL', price: '24.90' }];
  const gleich = [{ title: 'Rot', price: '15.90' }, { title: 'Blau', price: '15.90' }];
  p('nur Farben mit Preisunterschied faellt auf', gleicheWareVerschiedenePreise(nurFarben)?.spanne === 9);
  p('GEGENPROBE Groesse erklaert den Unterschied', gleicheWareVerschiedenePreise(mitGroesse) === null);
  p('GEGENPROBE gleiche Preise sind kein Befund', gleicheWareVerschiedenePreise(gleich) === null);
  p('GEGENPROBE eine Variante ist kein Befund', gleicheWareVerschiedenePreise([{ title: 'Rot', price: '9.90' }]) === null);
  // GEGENPROBEN zu den DREI echten Fehlalarmen vom 29.09.2026, jeder an der Kundenseite
  // nachgesehen statt geglaubt.
  p('GEGENPROBE zweite Option erklaert den Preis (Rizinusöl-Wickel)',
    gleicheWareVerschiedenePreise({
      options: [{ name: 'Farbe' }, { name: 'Ausführung' }],
      variants: [{ title: 'Rosa / Bauchwickel', price: '16.90' },
                 { title: 'Rosa / Set Bauch + Nacken', price: '22.90' }] }) === null);
  p('GEGENPROBE Option namens Grösse erklaert den Preis',
    gleicheWareVerschiedenePreise({
      options: [{ name: 'Grösse' }],
      variants: [{ title: 'Klein', price: '16.90' }, { title: 'Riesig', price: '29.90' }] }) === null);
  p('GEGENPROBE Zahlenbereich 39-42 ist eine Groesse (Trachtensocken)',
    gleicheWareVerschiedenePreise({
      options: [{ name: 'Variante' }],
      variants: [{ title: '39-42', price: '28.90' }, { title: '43-46', price: '29.90' }] }) === null);
  p('GEGENPROBE Zahlenbereich wirkt auch ohne Optionsnamen',
    gleicheWareVerschiedenePreise({
      options: [{ name: 'Farbe' }],
      variants: [{ title: '39-42', price: '28.90' }, { title: '43-46', price: '29.90' }] }) === null);
  // und die Gegenprobe zur Gegenprobe: EINE Option namens Farbe bleibt ein Befund
  p('eine Option namens Farbe bleibt ein Befund', gleicheWareVerschiedenePreise({
    options: [{ name: 'Farbe' }],
    variants: [{ title: 'Rot', price: '9.90' }, { title: 'Blau', price: '24.90' }] }) !== null);
  // GEGENPROBE zum ECHTEN Fehlalarm vom 29.09.2026 (Messschieber)
  p('GEGENPROBE Stueckzahl erklaert den Preis', gleicheWareVerschiedenePreise([
    { title: 'Schwarz', price: '22.90' }, { title: 'Schwarz · 2 Stück', price: '41.90' },
    { title: 'Schwarz · 5 Stück', price: '96.90' }]) === null);
  p('GEGENPROBE 3er-Set erklaert den Preis', gleicheWareVerschiedenePreise([
    { title: 'Rot', price: '9.90' }, { title: 'Rot 3er-Set', price: '24.90' }]) === null);
  p('GEGENPROBE 2 Paar erklaert den Preis', gleicheWareVerschiedenePreise([
    { title: 'Blau', price: '9.90' }, { title: 'Blau 2 Paar', price: '17.90' }]) === null);
  // und die Gegenprobe zur Gegenprobe: ohne Mengenangabe bleibt es ein Befund
  p('reine Farbunterschiede bleiben ein Befund', gleicheWareVerschiedenePreise([
    { title: 'Rot', price: '9.90' }, { title: 'Blau', price: '24.90' }]) !== null);
  p('GEGENPROBE cm-Angabe zaehlt als Groesse',
    gleicheWareVerschiedenePreise([{ title: 'Schwarz-132160 cm', price: '51.90' }, { title: 'Rot-90 cm', price: '34.90' }]) === null);

  // --- ganzer Durchlauf an einem gebauten Katalog
  const katalog = [
    { title: 'Hundeleine mit Halsband', handle: 'a', images: [{}], variants: [
      { title: 'Set20-YellowLXS', price: '15.90', compare_at_price: null },
      { title: 'Rot', price: '15.90', compare_at_price: '9.90' }] },
    { title: 'Napf für Katzen aus Edelstahl', handle: 'b', images: [], variants: [
      { title: 'Green', price: '12.90', compare_at_price: null }] },
    { title: 'Hundeleine mit Halsband', handle: 'c', images: [{}], variants: [
      { title: 'Default Title', price: '9.90', compare_at_price: null }] },
  ];
  const e = pruefe(katalog);
  p('Durchlauf findet den rohen Text', e.nachArt.rohe_variante === 1);
  p('Durchlauf findet das fehlende Bild', e.nachArt.ohne_bild === 1);
  p('Durchlauf findet den Streichpreis', e.nachArt.streichpreis_defekt === 1);
  p('Durchlauf findet die Fremdsprache', e.nachArt.fremdsprache === 1);
  p('Durchlauf findet den doppelten Titel', e.nachArt.doppelter_titel === 1);
  p('Default Title wird uebersprungen', !e.befunde.some((b) => b.beleg === 'Default Title'));
  // GEGENPROBE: ein sauberer Katalog darf NICHTS melden
  const sauber = [{ title: 'Napf für Katzen aus Edelstahl', handle: 'x', images: [{}], variants: [
    { title: 'Rot', price: '19.90', compare_at_price: '29.90' },
    { title: 'Blau', price: '19.90', compare_at_price: '29.90' }] }];
  p('GEGENPROBE sauberer Katalog meldet nichts', pruefe(sauber).befunde.length === 0);

  // --- Drosselung heisst warte, nicht leer
  const dross = async () => ({ status: 429, ok: false, json: async () => ({}) });
  const fehler = async () => ({ status: 404, ok: false, json: async () => ({}) });
  const tot = async () => { const e = new Error('fetch failed'); e.cause = { code: 'ENOTFOUND' }; throw e; };
  const keinJson = async () => ({ status: 200, ok: true, json: async () => { throw new Error('kein JSON'); } });
  return Promise.all([
    holeSeite('beispiel.test', 1, 250, dross), holeSeite('beispiel.test', 1, 250, fehler),
    holeSeite('beispiel.test', 1, 250, tot), holeSeite('beispiel.test', 1, 250, keinJson),
  ])
    .then(([a, b, c, d]) => {
      p('429 heisst gedrosselt', a.art === 'gedrosselt');
      p('GEGENPROBE 404 heisst fehler, nicht gedrosselt', b.art === 'fehler');
      // die Faelle, die am 29.09.2026 einen Stacktrace erzeugt haben
      p('nicht auflösbare Adresse stuerzt nicht ab', c.art === 'unerreichbar' && c.grund === 'ENOTFOUND');
      p('Antwort ohne JSON stuerzt nicht ab', d.art === 'kein_shopify');
      console.log(`${gut}/${gut + schlecht.length} Selbsttests bestanden`);
      for (const s of schlecht) console.log('  GESCHEITERT: ' + s);
      return schlecht.length === 0;
    });
}

const direkt = process.argv[1] && process.argv[1].endsWith('katalog_audit.mjs');
if (direkt) {
  const arg = process.argv[2];
  if (arg === '--selbsttest') {
    selbsttest().then((ok) => process.exit(ok ? 0 : 1));
  } else if (!arg) {
    console.log('Aufruf: node tools/katalog_audit.mjs <shop-domain> [--seiten n] [--json datei] [--bericht datei.html]');
    process.exit(1);
  } else {
    const seitenMax = Number(process.argv[process.argv.indexOf('--seiten') + 1]) || 4;
    const jsonZiel = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
    const berichtZiel = process.argv.includes('--bericht') ? process.argv[process.argv.indexOf('--bericht') + 1] : null;
    (async () => {
      const alle = [];
      for (let s = 1; s <= seitenMax; s++) {
        const r = await holeSeite(arg, s);
        if (r.art === 'gedrosselt') { console.error(`  Seite ${s}: gedrosselt (${r.status}) — warte 2 s`); await new Promise((f) => setTimeout(f, 2000)); s--; continue; }
        if (r.art === 'unerreichbar') { console.error(`  ${arg} ist nicht erreichbar (${r.grund}). Adresse pruefen.`); process.exit(2); }
        if (r.art === 'kein_shopify') { console.error(`  ${arg} antwortet, liefert aber kein Shopify-Produkt-JSON — vermutlich kein Shopify-Shop.`); process.exit(2); }
        if (r.art === 'fehler') { console.error(`  Seite ${s}: HTTP ${r.status}`); break; }
        if (r.produkte.length === 0) break;
        alle.push(...r.produkte);
        if (r.produkte.length < 250) break;
        await new Promise((f) => setTimeout(f, 400));
      }
      const e = pruefe(alle);
      console.log(bericht(e, arg));
      if (jsonZiel) {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(jsonZiel, JSON.stringify({ shop: arg, ...e }, null, 1));
        console.log(`\nBefunde als JSON: ${jsonZiel}`);
      }
      if (berichtZiel) {
        const { writeFileSync } = await import('node:fs');
        const { berichtHtml } = await import('../functions/_katalog_bericht.mjs');
        writeFileSync(berichtZiel, berichtHtml(e, arg));
        console.log(`Bericht zum Weitergeben: ${berichtZiel}`);
      }
    })();
  }
}
