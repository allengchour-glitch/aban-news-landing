// Tests für die französische Seitenübersetzung (reine Logik, kein Netz, keine Geheimnisse).
import { paareAnwenden, restDeutsch, planBauen } from './apply_seiten.mjs';
import { SEITEN } from './seiten_fr.mjs';

let ok = 0, bad = 0;
const t = (n, c) => { if (c) ok++; else { bad++; console.log('FEHLT:', n); } };

// paareAnwenden
{
  const r = paareAnwenden('<p>Hallo Welt</p><p>Hallo Welt</p>', [['Hallo Welt', 'Bonjour']]);
  t('ersetzt alle Vorkommen', r.out === '<p>Bonjour</p><p>Bonjour</p>');
  t('meldet Mehrfachtreffer', r.probleme.length === 1 && r.probleme[0].art === 'mehrfach' && r.probleme[0].n === 2);
  const r2 = paareAnwenden('<p>abc</p>', [['xyz', 'uvw']]);
  t('meldet nicht gefunden', r2.probleme.length === 1 && r2.probleme[0].art === 'nicht-gefunden' && r2.out === '<p>abc</p>');
  const r3 = paareAnwenden('<p>a</p>', [['a', 'b']]);
  t('keine Probleme bei genau einem Treffer', r3.probleme.length === 0 && r3.out === '<p>b</p>');
}

// restDeutsch
{
  t('erkennt deutschen Satz', restDeutsch('<p>Wir versenden auf Bestellung und mit Sorgfalt.</p>').length > 0);
  t('französischer Satz ist sauber', restDeutsch('<p>Nous expédions directement depuis l\'entrepôt du fournisseur.</p>').length === 0);
  t('«du» (französisch) löst nichts aus', restDeutsch('<p>Le prix du produit est affiché.</p>').length === 0);
  t('Sprachliste bleibt erlaubt', restDeutsch('<p>Service en Deutsch · English · Français · Italiano</p>').length === 0);
  t('Stile und Tags zählen nicht', restDeutsch('<style>.a{content:"und der die das"}</style><p>Bonjour</p>').length === 0);
}

// planBauen mit künstlichen Seiten
{
  const de = [{ handle: 'x', id: 'gid://shopify/OnlineStorePage/1', fields: [
    { key: 'title', value: 'Titel', digest: 'd1' }, { key: 'body_html', value: '<p>Guten Tag</p>', digest: 'd2' },
    { key: 'meta_title', value: 'MT', digest: 'd3' }, { key: 'meta_description', value: 'MD', digest: 'd4' }] }];
  const fr = { x: { title: 'Titre', meta_title: 'MT fr', meta_description: 'MD fr', paare: [['Guten Tag', 'Bonjour']] } };
  const p = planBauen(de, fr)[0];
  t('vier Felder', p.felder.length === 4 && p.probleme.length === 0);
  t('Digest wird aus dem Original übernommen', p.felder.find((f) => f.key === 'body_html').digest === 'd2');
  t('Körper übersetzt', p.felder.find((f) => f.key === 'body_html').value === '<p>Bonjour</p>');
  const fr2 = { x: { ...fr.x, title: '' } };
  t('fehlende Titelübersetzung wird gemeldet', planBauen(de, fr2)[0].probleme.some((q) => q.art === 'ohne-uebersetzung' && q.k === 'title'));
  t('unbekannte Seite wird gemeldet', planBauen(de, { y: fr.x })[0].fehler === 'Seite fehlt im Shop');
}

// Die gelieferten Paare
for (const [handle, s] of Object.entries(SEITEN)) {
  t(`${handle}: Titel, Meta-Titel, Meta-Beschreibung gesetzt`, !!(s.title && s.meta_title && s.meta_description));
  t(`${handle}: Meta-Titel nennt die Marke`, /LuxeStyle CH/.test(s.meta_title));
  t(`${handle}: Meta-Beschreibung höchstens 165 Zeichen`, s.meta_description.length <= 165);
  t(`${handle}: Paare vorhanden`, Array.isArray(s.paare) && s.paare.length > 3);
  const des = s.paare.map((p) => p[0]);
  t(`${handle}: kein deutscher Text doppelt als Paar`, new Set(des).size === des.length);
  for (const [de, fr] of s.paare) {
    if (de === fr) t(`${handle}: Paar ohne Änderung «${de.slice(0, 30)}»`, false);
    if (/href="\/(pages|policies|collections|products)\//.test(fr)) t(`${handle}: interner Link ohne /fr/ «${fr.slice(0, 40)}»`, false);
    // Tags dürfen sich nur in href ändern: gleiche Tag-Folge links und rechts
    const tags = (x) => (x.match(/<[a-z\/][^>]*>/gi) || []).map((q) => q.replace(/href="[^"]*"/, 'href').replace(/\s+/g, ' ')).join('|');
    if (tags(de) !== tags(fr)) t(`${handle}: Tags verändert «${de.slice(0, 40)}»`, false);
    if (/\bhttps?:\/\//.test(fr) && !/\bhttps?:\/\//.test(de)) t(`${handle}: neuer externer Link «${fr.slice(0, 40)}»`, false);
  }
  const alleFr = [s.title, s.meta_title, s.meta_description, ...s.paare.map((p) => p[1])].join(' ');
  t(`${handle}: Französisch ohne deutsche Rückstände`, restDeutsch(alleFr).length === 0);
}

console.log(`${ok} Prüfungen bestanden${bad ? `, ${bad} FEHLGESCHLAGEN` : ''}`);
process.exit(bad ? 1 : 0);
