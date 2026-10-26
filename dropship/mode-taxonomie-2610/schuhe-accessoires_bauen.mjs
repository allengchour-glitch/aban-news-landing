/**
 * Baut /tmp/mode_taxonomie/schuhe-accessoires.json aus sa_regeln.mjs + sa_arten.mjs + den Urteilen (schuhe-accessoires_urteile.json).
 *   node schuhe-accessoires_bauen.mjs            -> Ueberblick (Treffer je Kategorie, nichts geschrieben)
 *   node schuhe-accessoires_bauen.mjs --schreiben -> schreibt die JSON (gemessen.* aus den Urteilen)
 * Auswahl: eine Art wird je Geschlecht nur Kategorie, wenn sie nach Abzug der frueheren Kategorien >= MIN Produkte hat (sonst fliessen
 * ihre Produkte in die naechste passende Kategorie bzw. den Rest dieser Gruppe).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geschlecht, istMitglied, istInUnterfilter, SPERR_TAGS, FREMD_TAGS, gruppeVon, WEIBL_SCHUH, WEIBL_STIL } from './sa_regeln.mjs';
import { G } from './sa_arten.mjs';
import { PLAN } from './sa_plan.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MIN = 15;
export const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
export const gesch = new Map(daten.map(p => [p.handle, geschlecht(p)]));
const g_of = p => gesch.get(p.handle)[0];

/** Baut die Kategorien einer Gruppe/eines Geschlechts nach Rangfolge. */
export function baueGruppe({ abteilung, gruppe, arten, reihenfolge, gPrefix, ausschluss, minGroesse = MIN, extraTitelNicht = [] }) {
  const gruppeDaten = daten.filter(p => gPrefix.some(x => (p.g || '').startsWith(x)));
  const out = []; const frueherMuss = [];
  for (let i = 0; i < reihenfolge.length; i++) {
    const id = reihenfolge[i]; const a = arten[id]; if (!a) throw new Error('Art fehlt: ' + id);
    const kat = {
      handle: `${abteilung}-${a.slug}`, titel: a.titel, eltern: abteilung, geschlecht: abteilung,
      g_prefix: gPrefix.slice(), g_nicht: [], titel_muss: a.rest ? [] : a.muss.slice(),
      titel_nicht: [...ausschluss.map(x => x.re), ...extraTitelNicht, ...(a.nicht || []), ...frueherMuss],
      tags_muss_eines: [], tags_nicht: [...SPERR_TAGS, ...FREMD_TAGS],
      beschreibung: a.beschreibung, unterfilter: [],
    };
    const mitglieder = gruppeDaten.filter(p => istMitglied(kat, p, g_of(p)));
    // eine Nicht-Rest-Art mit zu wenig Treffern entfaellt (ihre Produkte fallen weiter nach unten)
    if (mitglieder.length < minGroesse) { out.push({ verworfen: true, handle: kat.handle, n: mitglieder.length }); continue; }
    for (const u of (a.uf || [])) {
      const uk = { titel_muss: u.muss, titel_nicht: u.nicht || [] };
      const n = mitglieder.filter(p => istInUnterfilter(uk, p)).length;
      if (n >= MIN && n <= 0.9 * mitglieder.length) kat.unterfilter.push({ handle: `${kat.handle}-${u.slug}`, titel: u.titel, titel_muss: u.muss.slice(), titel_nicht: (u.nicht || []).slice(), _n: n });
    }
    if (!a.rest) frueherMuss.push(...a.muss.map(m => (a.nicht && a.nicht.length) ? `^(?!.*(?:${a.nicht.join('|')})).*(?:${m})` : m));
    out.push(Object.assign(kat, { _n: mitglieder.length, _mitglieder: mitglieder }));
  }
  return out;
}

export function baueAlle() {
  const alle = [];
  for (const schritt of PLAN) alle.push(...baueGruppe(schritt).map(k => Object.assign(k, { _gruppe: schritt.gruppe })));
  return alle;
}

if (process.argv[1] && process.argv[1].endsWith('schuhe-accessoires_bauen.mjs')) {
  const alle = baueAlle();
  const gez = {};
  for (const k of alle) {
    if (k.verworfen) { console.log(`   --  ${k.handle}  (verworfen: nur ${k.n})`); continue; }
    console.log(String(k._n).padStart(5), k.handle.padEnd(34), k.titel, k.unterfilter.map(u => `${u.handle.split('-').slice(2).join('-')}:${u._n}`).join(' '));
  }
}

// ───────────────────────────── JSON schreiben ─────────────────────────────
import { ersterSatz } from './sa_texte.mjs';
import { AUSSCHLUSS } from './sa_ausschluss.mjs';
import { KID_RE, HER_RE, DAM_RE, UNI_RE } from './sa_regeln.mjs';

export const RFOLGE = ['damen', 'herren', 'kinder'];
const hier = f => path.join(HERE, f);

/** Warengruppen -> Familie (gleiche Familie = Nachbarn im Menue) */
const FAMILIE = { schuh: 'schuh', tasche: 'tasche', geldboerse: 'tasche', guertel: 'acc', kopf: 'acc', schal: 'acc', handschuh: 'acc', brille: 'acc', haar: 'acc' };
/** Zweiter Satz der Beschreibung: neutrale Verweise auf Nachbarkategorien derselben Familie (keine Produktbehauptungen). */
function beschreibungZwei(kat, abtKats) {
  const fam = abtKats.filter(x => FAMILIE[x._gruppe] === FAMILIE[kat._gruppe]);
  const i = fam.findIndex(x => x.handle === kat.handle);
  const nach = [];
  for (let d = 1; nach.length < 2 && d < fam.length; d++) nach.push(fam[(i + d) % fam.length].titel);
  const uf = kat.unterfilter.map(u => u.titel);
  if (uf.length >= 2) return `Die Unterkategorien ${uf.slice(0, -1).join(', ')} und ${uf[uf.length - 1]} grenzen die Auswahl ein.`;
  return nach.length ? `Ähnliche Artikel stehen unter «${nach.join('» und «')}».` : 'Weitere Artikel stehen in den Nachbarkategorien.';
}

export function jsonKategorien() {
  const alle = baueAlle().filter(k => !k.verworfen);
  const urteile = fs.existsSync(hier('schuhe-accessoires_urteile.json')) ? JSON.parse(fs.readFileSync(hier('schuhe-accessoires_urteile.json'), 'utf8')) : {};
  const out = [];
  for (const abt of RFOLGE) {
    const mitAbt = alle.filter(k => k.eltern === abt);
    for (const k of mitAbt) {
      const u = urteile[k.handle];
      const n = k._n; const st = Math.min(30, n);
      out.push({
        handle: k.handle, titel: k.titel, eltern: k.eltern, geschlecht: k.geschlecht, g_prefix: k.g_prefix, g_nicht: k.g_nicht,
        titel_muss: k.titel_muss, titel_nicht: k.titel_nicht, tags_muss_eines: k.tags_muss_eines, tags_nicht: k.tags_nicht,
        beschreibung: `${ersterSatz(k.handle, k.beschreibung)} ${beschreibungZwei(k, mitAbt)}`,
        unterfilter: k.unterfilter.map(x => ({ handle: x.handle, titel: x.titel, titel_muss: x.titel_muss, titel_nicht: x.titel_nicht })),
        gemessen: u ? { treffer: n, stichprobe: st, falsch: u.falsch.length, falsche_beispiele: u.falsch.map(f => `${f.handle}: ${f.grund}`) } : { treffer: n, stichprobe: 0, falsch: 0, falsche_beispiele: [], ungeprueft: true },
      });
    }
  }
  return out;
}

// ───────────────────────────── Gesamt-JSON ─────────────────────────────
import { statistik, titelGeschlecht, tagGeschlecht } from './sa_statistik.mjs';

export function baueJson() {
  const kategorien = jsonKategorien();
  const st = statistik();
  // Abdeckung nach JSON-Regeln
  const inK = new Map();
  for (const k of kategorien) for (const p of daten) if (istMitglied(k, p, g_of(p))) (inK.get(p.handle) || inK.set(p.handle, []).get(p.handle)).push(k.handle);
  const uni = daten.filter(p => gruppeVon(p));
  const fremd = [], rest = [];
  for (const p of uni) {
    if (inK.has(p.handle)) continue;
    const gr = gruppeVon(p);
    if (p.tags.some(t => SPERR_TAGS.includes(t))) { fremd.push({ handle: p.handle, grund: `Sperr-Tag (${p.tags.filter(t => SPERR_TAGS.includes(t)).join(', ')}) — nicht bewerben/verkaufen`, gehoert_nach: 'in keine Kategorie' }); continue; }
    if (p.tags.some(t => FREMD_TAGS.includes(t))) { fremd.push({ handle: p.handle, grund: 'Kostüm-/Fasnachtsware (Tag fortura) mit Google-Kategorie ' + (p.g || '').replace('Apparel & Accessories > ', ''), gehoert_nach: 'Kostüm-Kategorien (ft-*)' }); continue; }
    const m = (AUSSCHLUSS[gr] || []).find(x => new RegExp(x.re, 'i').test(p.title));
    if (m) { fremd.push({ handle: p.handle, grund: `${m.grund}: «${p.title.slice(0, 70)}»`, gehoert_nach: m.nach }); continue; }
    rest.push(p);
  }
  // falsch einsortierte Schuhe/Accessoires in fremden Google-Kategorien
  fremd.push({ handle: 'herren-high-top-sneaker-brooklyn-mesh-atmungsaktiv', grund: 'Sneaker mit Google-Kategorie «Clothing > Shirts & Tops» (Fehl-Zuordnung bei CJ) — fehlt deshalb in allen Schuh-Kategorien', gehoert_nach: 'herren-sneaker' });
  fremd.push({ handle: 'mutze-schal-handschuhe-set-fur-kinder', grund: 'Mütze-Schal-Handschuh-Set für Kinder mit Google-Kategorie «Clothing > Outfit Sets»', gehoert_nach: 'Kinder-Accessoires (Rest: zu wenige für eine eigene Kategorie)' });
  const nBild = daten.find(p => p.handle.startsWith('herren-high-top-sneaker-brookl'));
  if (nBild) fremd[fremd.length - 2].handle = nBild.handle;
  const nSet = daten.find(p => p.handle.startsWith('mutze-schal-handschuhe-set-fur'));
  if (nSet) fremd[fremd.length - 1].handle = nSet.handle;
  return { st, kategorien, fremd, rest, inK };
}
if (process.argv.includes('--abdeckung')) {
  const { st, kategorien, fremd, rest } = baueJson();
  console.log('Kategorien', kategorien.length, '| fremd', fremd.length, '| rest', rest.length);
  for (const p of rest) console.log('  REST', gruppeVon(p), g_of(p), p.title.slice(0, 80));
}

// ───────────────────────────── --schreiben ─────────────────────────────
/** Alle Zahlen, die in Texten der JSON stehen, werden hier gemessen (nichts von Hand eingetippt). */
function zahlen(kategorien, fremd, rest) {
  const fremdSet = new Set(fremd.map(f => f.handle));
  const re = id => new RegExp(AUSSCHLUSS.guertel.find(x => x.id === id).re, 'i');
  const hk = h => (kategorien.find(k => k.handle === h) || { gemessen: { treffer: 0 } }).gemessen.treffer;
  const tagH = p => p.tags.some(t => /^(herren|herrenschuhe|maenner)$/.test(t));
  const hw = daten.filter(p => gruppeVon(p) && HER_RE.test(p.title) && !DAM_RE.test(p.title) && (new RegExp(WEIBL_SCHUH.source || WEIBL_SCHUH, 'i').test(p.title) || WEIBL_STIL.test(p.title)));
  const restGr = {}; for (const p of rest) { const k = gruppeVon(p) + '/' + g_of(p); restGr[k] = (restGr[k] || 0) + 1; }
  return {
    schuhUnbekannt: daten.filter(p => gruppeVon(p) === 'schuh' && gesch.get(p.handle)[1] === 'unbekannt').length,
    schuhUnbekanntSport: daten.filter(p => gruppeVon(p) === 'schuh' && gesch.get(p.handle)[1] === 'unbekannt' && p.type === 'Sportschuhe').length,
    taschenOhne: daten.filter(p => gruppeVon(p) === 'tasche' && gesch.get(p.handle)[1] === 'unbekannt').length,
    rucksack: daten.filter(p => (p.g || '').startsWith('Luggage & Bags > Backpacks')).length,
    arbeit: daten.filter(p => gruppeVon(p) === 'schuh' && new RegExp(AUSSCHLUSS.schuh.find(x => x.id === 'arbeit').re, 'i').test(p.title)).length,
    fortura: daten.filter(p => gruppeVon(p) && p.tags.includes('fortura')).length,
    beltKleidung: daten.filter(p => gruppeVon(p) === 'guertel' && re('kleidung').test(p.title)).length,
    beltBauch: daten.filter(p => gruppeVon(p) === 'guertel' && re('bauch_umstand').test(p.title)).length,
    herrenGuertelNur: daten.filter(p => G.guertel.some(x => (p.g || '').startsWith(x)) && !fremdSet.has(p.handle) && g_of(p) === 'herren').length,
    herrenGuertelKat: hk('herren-guertel'),
    herrenGuertel: daten.filter(p => G.guertel.some(x => (p.g || '').startsWith(x)) && !fremdSet.has(p.handle) && ['herren', 'unisex'].includes(g_of(p))).length,
    damenGuertel: hk('damen-guertel'), hausDamen: hk('damen-hausschuhe'), hausHerren: hk('herren-hausschuhe'),
    restKinder: rest.filter(p => g_of(p) === 'kinder').length, restGr,
    hw: hw.length, hwTag: hw.filter(tagH).length, hwOhne: hw.filter(p => !tagH(p)).map(p => p.title.slice(0, 60)),
    mehrdeutig: daten.filter(p => gruppeVon(p) && titelGeschlecht(p.title) && tagGeschlecht(p) && titelGeschlecht(p.title) !== tagGeschlecht(p) && /kinder-? (und|&) erwachsene/i.test(p.title)).map(p => p.title.slice(0, 60)),
    schalTitel: daten.filter(p => gruppeVon(p) === 'schal' && gesch.get(p.handle)[1] === 'titel').length,
    schalTitelDamen: daten.filter(p => gruppeVon(p) === 'schal' && gesch.get(p.handle)[1] === 'titel' && g_of(p) === 'damen').length,
  };
}
function belege() {
  // Evidenz fuer Stilwoerter: nur Titel/Tag-Quellen zaehlen
  const ev = (re, gruppen) => { let d = 0, h = 0, u = 0; for (const p of daten) { if (!gruppen.includes(gruppeVon(p)) || !re.test(p.title)) continue; const [g, q] = gesch.get(p.handle); if (['titel', 'tag'].includes(q) && g === 'damen') d++; else if (['titel', 'tag'].includes(q) && g === 'herren') h++; else u++; } return `${d}:${h}`; };
  return {
    brust: ev(/brusttasche|brustbeutel|brust-?bag|sling/i, ['tasche']), business: ev(/business/i, ['tasche']), clutch: ev(/clutch/i, ['tasche']),
    akten: ev(/aktentasche|messenger/i, ['tasche']), crazy: ev(/crazy/i, ['tasche']), umhaenge: ev(/umhänge|crossbody|schulter/i, ['tasche']),
  };
}
export function schreiben() {
  const { st, kategorien, fremd, rest } = baueJson();
  const be = belege();
  const g = st.gr; const e = st.erg; const q = st.quelle;
  const sw = st.schwach;
  const widerspruch = st.beide - st.gleich;
  const Z = zahlen(kategorien, fremd, rest);
  Z.grenz = fs.existsSync(hier('schuhe-accessoires_urteile.json')) ? (JSON.parse(fs.readFileSync(hier('schuhe-accessoires_urteile.json'), 'utf8'))._grenzfaelle || []) : [];
  const paareTxt = Object.entries(st.paare).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  const geschlecht_regel = [
    'Ergebnis je Produkt: damen | herren | kinder | unisex (nie «unbekannt»: ohne jeden Beleg gilt unisex, das Produkt steht dann in Damen UND Herren). Alle Muster sind Regex-Strings (JavaScript, Flag i) auf dem Produkttitel; die erste zutreffende Stufe entscheidet. Referenz-Implementierung (ausführbar, identisch zur Beschreibung): /tmp/mode_taxonomie/sa_regeln.mjs, Funktion geschlecht(p).',
    `1. Titel nennt Kinder (${KID_RE.source}; rechts offen, damit «Kinderstiefel» und «Mädchensandalen» zählen; Ausnahmen «Babyblau», «im jungen Stil», «kindersicher») und nennt NICHT zugleich Herren oder Damen -> kinder.`,
    `2. Titel trifft UNISEX (${UNI_RE.source}) oder nennt «Kinder und Erwachsene», oder nennt Herren UND Damen -> unisex. Nennt der Titel Kinder UND nur Herren («für Teens und Herren») oder nur Damen («für Kinder und Damen»), entscheidet Stufe 3 bzw. 4: herren bzw. damen (das Produkt steht nicht in den Kinder-Kategorien dieser Abteilung).`,
    `3. Titel trifft HERREN (${HER_RE.source}) -> herren. Es gibt bewusst KEINE Nachkorrektur «Herren-Rock = Damen» wie bei der Bekleidung: gemessen nennen ${Z.hw} Titel Herren (ohne Damen-Zielgruppe) UND ein weibliches Stilwort (Pumps, Schleife, Spitze ...); ${Z.hwTag} davon tragen zusätzlich einen Herren-Tag, ${Z.hw - Z.hwTag} nicht (${Z.hwOhne.map(x => '«' + x + '»').join(', ') || '-'}) — gelesen: echte Herrenware.`,
    `4. Titel trifft DAMEN (${DAM_RE.source}) -> damen.`,
    '5. Tags: kinderschuhe oder kinder -> kinder; (damenschuhe oder damen) UND (herrenschuhe, herren oder maenner) -> unisex; Tag unisex -> unisex; herrenschuhe/herren/maenner -> herren; damenschuhe/damen -> damen. AUSNAHME: bei Mützen/Hüten, Handschuhen und Sonnenbrillen zählt der Tag «damen» nicht — er ist dort der Sammel-Tag des Imports (siehe Messwerte unten).',
    '6. Feld type: Damenschuhe -> damen; Herrenschuhe -> herren; Kinderschuhe, «Baby & Kinder» oder Kinder -> kinder.',
    `7. Stilwörter, nur wenn 1-6 schweigen. Schuhe: ${WEIBL_SCHUH_TXT} -> damen; ${MAENNL_SCHUH_TXT} -> herren. Gürtel: Taillen-/Wickelgürtel oder Stilwort -> damen. Mützen/Handschuhe/Brillen mit Sammel-Tag damen: Stilwort (Spitze, Schleife, Perlen, Strass, Blumen, Herz, Turban, Kopftuch ...) -> damen. Taschen und Geldbörsen: Brusttasche/Sling/Business/Clutch/Aktentasche/Messenger/Crazy Horse -> herren (Titel MIT Zielgruppe, Damen:Herren: Brusttasche ${be.brust}, Business ${be.business}, Clutch ${be.clutch}, Aktentasche/Messenger ${be.akten}, Crazy Horse ${be.crazy}), es sei denn ein weibliches Stilwort steht im Titel; sonst weibliches Stilwort -> damen. Haarschmuck und Schals -> damen (Warengruppe; bei Schals nennen alle ${Z.schalTitelDamen} von ${Z.schalTitel} Titeln mit Zielgruppe «Damen», 0 «Herren»).`,
    '8. Sonst unisex.',
    'Kategorie-Geschlecht damen nimmt damen und unisex; herren nimmt herren und unisex; kinder nimmt nur kinder. Eine Kategorie gleicher Abteilung nimmt nur, was keine FRÜHERE Kategorie derselben Abteilung genommen hat (titel_nicht enthält die titel_muss der früheren) — so steht jedes Produkt je Abteilung in genau einer Blatt-Kategorie.',
    `GEMESSEN an ${st.N} Produkten in den Warengruppen der Abteilung (Schuhe ${g.schuh}, Taschen ${g.tasche}, Geldbörsen ${g.geldboerse}, Schals ${g.schal}, Mützen/Hüte ${g.kopf}, Gürtel ${g.guertel}, Handschuhe ${g.handschuh}, Sonnenbrillen ${g.brille}, Haarschmuck ${g.haar}): damen ${e.damen}, herren ${e.herren}, kinder ${e.kinder}, unisex ${e.unisex}. Entscheidung durch Titel ${q.titel}, Tag ${q.tag}, Stilwort ${q.stil}, Warengruppe ${q.warengruppe}, type ${q.type}, ohne Beleg (unisex) ${q.unbekannt}.`,
    `Sammel-Tag «damen» (Stufe 5, Ausnahme): bei Mützen/Hüten tragen ${sw.kopf.tagDamen} Produkte den Tag damen, aber nur ${sw.kopf.titelDamen} von ${sw.kopf.titelNennt} mit Zielgruppe im Titel nennen Damen (der Rest: unisex, herren, kinder); bei Handschuhen ${sw.handschuh.titelDamen} von ${sw.handschuh.titelNennt} (Tag damen ${sw.handschuh.tagDamen}), bei Sonnenbrillen ${sw.brille.titelDamen} von ${sw.brille.titelNennt} (Tag damen ${sw.brille.tagDamen}).`,
  ].join('\n');
  const widersprueche = {
    anzahl: widerspruch,
    regel: `Der ausdrückliche Titel gewinnt gegen den Tag (Stufen 1-4 vor Stufe 5). Gemessen: ${st.beide} Produkte, bei denen Titel UND Tag eine Zielgruppe nennen; ${widerspruch} (${(100 * widerspruch / st.beide).toFixed(1)} %) widersprechen sich: ${paareTxt}. ALLE ${widerspruch} Fälle einzeln gelesen: in ${widerspruch - Z.mehrdeutig.length} nennt der Titel die Zielgruppe unmissverständlich («Herren Flip-Flops», «Mädchen Sandalen», «Unisex Sneaker», «für Paare», «für Teenager») und der Tag ist der Sammel-Tag des Imports — der Titel hat recht; ${Z.mehrdeutig.length} ist mehrdeutig (${Z.mehrdeutig.map(x => '«' + x + '»').join(', ')}) und steht als unisex. Gelesen am 26.10.2026 an /tmp/mode_daten.json. Das Feld type hilft nicht als Schiedsrichter, es stammt aus demselben Import wie der Tag (es stimmt in ${st.typStimmtTitel.tag} der ${st.typStimmtTitel.titel + st.typStimmtTitel.tag + st.typStimmtTitel.keines} Fälle mit type mit dem Tag überein).`,
  };
  const restOut = {
    anzahl: rest.length,
    beispiele: rest.slice(0, 20).map(p => `${p.title.slice(0, 80)} [${gruppeVon(p)}/${g_of(p)}]`),
    vorschlag: `Diese ${rest.length} Produkte haben eine zu kleine Gruppe für eine eigene Kategorie (Mindestgrösse 15): Kinder-Mützen/Handschuhe/Haarschmuck/Taschen (${Z.restKinder} zusammen), ${(Z.restGr['guertel/unisex'] || 0)} Gürtelschnalle (Google: Belt Buckles, kein Gürtel) und ${(Z.restGr['tasche/damen'] || 0)} Wickel-Tasche. Vorschlag: eine gemeinsame Kategorie «Kinder-Accessoires» erst anlegen, wenn der Import 2-3 weitere Kindermützen/-handschuhe bringt; bis dahin bleiben sie über die Suche erreichbar.`,
  };
  const out = {
    abteilung: 'schuhe-accessoires',
    geschlecht_regel, kategorien, rest: restOut, fremdkoerper: fremd, widersprueche_tag_titel: widersprueche, offene_fragen: OFFENE_FRAGEN(kategorien, st, be, Z),
  };
  fs.writeFileSync(hier('schuhe-accessoires.json'), JSON.stringify(out, null, 1));
  console.log('geschrieben:', hier('schuhe-accessoires.json'), '| Kategorien', kategorien.length, '| fremdkoerper', fremd.length, '| rest', rest.length);
}
const WEIBL_SCHUH_TXT = 'pumps, high heels, stiletto, heel(s), ballerina, peep-toe, slingback, mary jane, keilabsatz, keilsandale(n), keile, blockabsatz, riemchen, römersandale, zehensteg, strass, perlen, schleife, blumen, satin, overknee, mule(s), knöchelriemen, kreuzriemen, flats';
const MAENNL_SCHUH_TXT = 'business, oxford, derby, brogue(s), anzugschuh, smoking, herrenschuh';
function OFFENE_FRAGEN(kategorien, st, be, Z) {
  return [
    `Taschen ohne jeden Zielgruppen-Beleg (${Z.taschenOhne}) stehen als unisex in Damen UND Herren. Die Titel MIT Zielgruppe sind fast nur Herren (Umhängetasche/Crossbody/Schultertasche ${be.umhaenge} Damen:Herren) — der Katalog ist bei Taschen männlich geprägt. Entscheid Besitzer: neutrale Umhängetaschen weiter in beiden Abteilungen zeigen (jetzt) oder nur unter Herren?`,
    `Herren-Gürtel hat ${Z.herrenGuertelKat || 0} Produkte, davon nur ${Z.herrenGuertelNur} ausdrücklich für Herren; die übrigen sind Unisex-Gürtel, die auch in damen-guertel (${Z.damenGuertel}) stehen — die Kategorie liegt knapp über der Mindestgrösse 15. Soll «Gürtel» stattdessen eine gemeinsame Sammlung (alle Geschlechter) im Menü sein?`,
    `Kinder-Accessoires (Mützen, Handschuhe, Haarschmuck, Taschen) sind zusammen nur ${Z.restKinder} Produkte (<15): keine Kategorie, siehe rest.vorschlag.`,
    `Rucksäcke: im Datensatz nur ${Z.rucksack} (Google «Luggage & Bags > Backpacks»), darum keine Rucksack-Kategorie hier; die vorhandenen Rucksack-Sammlungen des Shops (rucksaecke, rucksaecke-laptop, -sport, -schule) bleiben bestehen und liegen ausserhalb dieses Datensatzes.`,
    `Arbeits-/Sicherheitsschuhe (${Z.arbeit}) sind hier ausgeschlossen und gehören in die bestehende Kategorie arbeitsschuhe (Tag sort-arbeitsschuhe). Wander- und Winterschuhe haben bestehende Sammlungen (wanderschuhe-trekking, winterschuhe) — die neuen Damen-/Herren-Kategorien ersetzen sie geschlechtsgetrennt; die alten Sammlungen sollten danach auf die neuen verweisen oder entfallen.`,
    'Zu ersetzende bestehende Schuh-Sammlungen (sich überlappend, nach Wortteilen gebaut): damen-schuhe, damenschuhe (Dublette), herren-schuhe, herrenschuhe (Dublette), schuhe, schuhe-sandalen, sub-sandalen, schuhe-sneaker, sneaker-sportschuhe, sub-laufschuhe, schuhe-stiefel, sub-stiefel-boots, schuhe-absatz, sub-pumps-heels, sub-ballerinas, sub-hausschuhe, sub-wander-arbeitsschuhe, kinderschuhe; bei Taschen: sub-taschen, handtaschen-umhaengetaschen, bauchtaschen, portemonnaie (neben portemonnaies-geldboersen); bei Accessoires: accessoires, muetzen-schals, caps-huete (Dublette caps-hute), guertel, handschuhe, sonnenbrillen-alle/-damen/-herren/-eyewear, lederwaren.',
    `Hausschuhe haben bei Damen und Herren nur ${Z.hausDamen} bzw. ${Z.hausHerren} Produkte (knapp über der Mindestgrösse 15) — die Mehrzahl der Hausschuhe ist ohne Zielgruppe (unisex) und steht deshalb in beiden Abteilungen.`,
    `Schuhe ohne jeden Zielgruppen-Beleg (${Z.schuhUnbekannt}, davon ${Z.schuhUnbekanntSport} mit dem Feld type «Sportschuhe»; über alle Warengruppen sind es ${st.quelle.unbekannt}) stehen als unisex in Damen und Herren; der Import sollte für diese Schuhe ein Geschlechts-Tag liefern.`,
    `Die Google-Kategorie «Clothing Accessories > Belts» enthält ${Z.beltKleidung} Kleidungsstücke und Etuis (Kleider, Blazer, Trenchcoats, Jacken «mit Bindegürtel») sowie ${Z.beltBauch} Bauch-/Umstandsgurte und Taillenketten (fremdkoerper): ein Fehler der CJ-Zuordnung nach Titelwort, der auch die Bekleidungs-Abteilungen betrifft.`,
    `Kostüm-/Fasnachtsware (Tag fortura, ${Z.fortura} Produkte in diesen Warengruppen) mit Google-Kategorie «Costume Accessories»/«Hats» ist bewusst nicht in diesen Kategorien (eigene Kostüm-Kategorien).`,
    `Prüfstand ehrlich: je Kategorie wurden ${30} zufällige Titel (bei weniger Treffern alle) mit festem Seed aus Kategorie-Handle und Mitgliederliste gezogen und von mir gelesen. Die Regeln wurden dabei in mehreren Runden nachgebessert (jede Änderung der Mitglieder zieht die Stichprobe neu). Die ausgewiesene Stichprobe ist die nach der letzten Regeländerung; «falsch 0» ist also ein Endstand nach Korrekturen, kein Erstergebnis, und gilt für die gelesene Stichprobe, nicht für alle Treffer. Bei 0 Fehlern in 30 gelesenen Titeln liegt die wahre Fehlerquote einer Kategorie mit 95 % Sicherheit unter rund 10 % (Dreierregel), nicht darunter. Grenzfälle, die ich NICHT als falsch gezählt habe: ${Z.grenz.map(g => g.kategorie + ' «' + g.titel + '» (' + g.grund + ')').join('; ') || 'keine'}.`,
    'Ungeprüft: Unterfilter wurden auf Grösse (15 bis 90 % der Kategorie) geprüft; je Unterfilter wurde keine volle 30er-Stichprobe gelesen (ansehen mit: node schuhe-accessoires_messen.mjs --uf <kategorie-handle> 10).',
  ];
}
if (process.argv.includes('--schreiben')) schreiben();
