import {
  normalisiereInternenPfad,
  leseMenueAusHtml,
  pruefeBaseline,
  leseMainAusHtml,
  bewerteAbdeckung,
  sammleAlternativeMainLinks,
  simuliereCap,
} from './luxestyle_menu_abdeckung.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  if (JSON.stringify(wert) === JSON.stringify(soll)) ok++;
  else { fehl++; console.log(`FEHLER ${name}\n  ist  ${JSON.stringify(wert)}\n  soll ${JSON.stringify(soll)}`); }
};
const wirft = (name, fn, muster) => {
  try { fn(); fehl++; console.log(`FEHLER ${name}: warf nicht`); }
  catch (e) { if (muster.test(e.message)) ok++; else { fehl++; console.log(`FEHLER ${name}: ${e.message}`); } }
};

const start = `
<header-drawer><a class="lx-menu-group-all" href="/collections/a">Alle A</a></header-drawer>
<a class="lxm__all" href="/collections/top">Alles</a>
<a class="lxm__link" href="/collections/plain">Plain</a>
<a class="lxm__head" href="/collections/a">A eins</a>
<a class="lxm__link" href="/collections/a1">A1</a>
<a class="lxm__link" href="/collections/a3">A3</a>
<a class="lxm__head" href="/collections/a/">A zwei</a>
<a class="lxm__link" href="/collections/a2?x=1#y">A2</a>
<a class="lxm__all" href="/collections/top2">Alles 2</a>
<a class="lxm__link" href="/collections/plain2">Plain 2</a>
<a class="lxm__head" href="/collections/b">B &amp; mehr</a>
<a class="lxm__link" href="/collections/b1">B1</a>`;

ist('Pfad entfernt Query, Hash und Endslash', normalisiereInternenPfad('https://www.luxestyle.ch/collections/a/?x=1#y'), '/collections/a');
ist('externe URL wird nicht als intern gewertet', normalisiereInternenPfad('https://example.com/collections/a'), null);
ist('leeres Ziel ist unbrauchbar', normalisiereInternenPfad(''), null);

const menue = leseMenueAusHtml(start);
ist('drei Gruppenknoten', menue.messung.gruppenKnoten, 3);
ist('zwei eindeutige Gruppen-URLs', menue.messung.gruppenUrls, 2);
ist('vier Kinderkanten', menue.messung.kinderKanten, 4);
ist('Doppelziel vereinigt drei Kinder', menue.gruppen.find(g => g.url === '/collections/a').kinder, ['/collections/a1', '/collections/a3', '/collections/a2']);
ist('Titel werden dekodiert', menue.gruppen.find(g => g.url === '/collections/b').titel, ['B & mehr']);
ist('ungegliederte Links bleiben dauerhafte Alternative', menue.dauerhafteLinks.includes('/collections/plain2'), true);
ist('Top-Level-Ziele und Alle-Kategorien werden als alternative Seiten geprüft', menue.alternativeSeiten, ['/pages/alle-kategorien', '/collections/top', '/collections/top2']);
ist('ein expliziter mobiler Alle-Link belegt genau einen Knoten', menue.messung.mobileAlleBelegt, 1);
ist('Menü ohne Strukturfehler', menue.fehler, []);
ist('passende Baseline wird akzeptiert', pruefeBaseline(menue.messung, { gruppenKnoten: 3, gruppenUrls: 2, kinderKanten: 4, kinderUrls: 4 }), true);
wirft('unvollständige Menü-Baseline bricht ab', () => pruefeBaseline(menue.messung, { gruppenKnoten: 4 }), /Baseline weicht ab/);
wirft('fehlender Desktop-Marker bricht ab', () => leseMenueAusHtml('<main></main>'), /marker/i);

const pageA = '<link rel="canonical" href="https://luxestyle.ch/collections/a"><header><a href="/collections/a3">nur Header</a></header><main id="MainContent"><a href="/collections/a1">1</a><a href="/collections/a2?x=2">2</a></main><footer></footer>';
const gelesenA = leseMainAusHtml(pageA);
ist('Main ignoriert Headerlink', gelesenA.links, ['/collections/a1', '/collections/a2']);
ist('Canonical wird gelesen', gelesenA.canonical, '/collections/a');
ist('Main erkannt', gelesenA.hatMain, true);

const seiten = {
  '/collections/a': { status: 200, finalerPfad: '/collections/a', ...gelesenA },
  '/collections/b': { status: 429, unsicher: true, grund: 'HTTP 429' },
};
const abdeckung = bewerteAbdeckung(menue, seiten);
ist('A ist teilweise abgedeckt', abdeckung.gruppen.find(g => g.url === '/collections/a').zustand, 'teilweise');
ist('A meldet nur das echte fehlende Kind', abdeckung.gruppen.find(g => g.url === '/collections/a').fehlend, ['/collections/a3']);
ist('429 bleibt unbekannt', abdeckung.gruppen.find(g => g.url === '/collections/b').zustand, 'unbekannt');
ist('429 wird nicht als Null-Abdeckung gezählt', abdeckung.zusammenfassung.ohneKinderlinksImMain, 0);
ist('nur geprüfte Kanten zählen', abdeckung.zusammenfassung.gepruefteKanten, 3);

const voll = bewerteAbdeckung(menue, {
  '/collections/a': { status: 200, finalerPfad: '/collections/a', hatMain: true, canonical: '/collections/a', links: ['/collections/a1', '/collections/a2', '/collections/a3'] },
  '/collections/b': { status: 200, finalerPfad: '/collections/b', hatMain: true, canonical: '/collections/b', links: ['/collections/b1'] },
});
ist('vollständige Gegenprobe erkennt beide Seiten', voll.zusammenfassung.voll, 2);
const leer = bewerteAbdeckung(menue, {
  '/collections/a': { status: 200, finalerPfad: '/collections/a', hatMain: true, canonical: '/collections/a', links: [] },
  '/collections/b': { status: 200, finalerPfad: '/collections/b', hatMain: true, canonical: '/collections/b', links: [] },
});
ist('negative Gegenprobe erkennt Null-Abdeckung', leer.zusammenfassung.ohneKinderlinksImMain, 2);
const falschCanonical = bewerteAbdeckung(menue, {
  '/collections/a': { status: 200, finalerPfad: '/collections/a', hatMain: true, canonical: '/collections/anders', links: ['/collections/a1', '/collections/a2', '/collections/a3'] },
  '/collections/b': { status: 404, finalerPfad: '/collections/b', hatMain: false, canonical: null, links: [] },
});
ist('falsches Canonical ist Fehler statt Freigabe', falschCanonical.zusammenfassung.fehler, 2);

const alternativ = sammleAlternativeMainLinks(menue.alternativeSeiten, {
  '/pages/alle-kategorien': { status: 200, finalerPfad: '/pages/alle-kategorien', hatMain: true, canonical: '/pages/alle-kategorien', links: ['/collections/a3'] },
  '/collections/top': { status: 429, unsicher: true, grund: 'HTTP 429' },
  '/collections/top2': { status: 200, finalerPfad: '/collections/top2', hatMain: true, canonical: '/collections/falsch', links: ['/collections/b1'] },
});
ist('nur sicher gelesene Alternativseite liefert Links', alternativ.links, ['/collections/a3']);
ist('Alternative 429 bleibt unbekannt', alternativ.seiten.find(s => s.pfad === '/collections/top').zustand, 'unbekannt');
ist('falsches Canonical der Alternative ist Fehler', alternativ.seiten.find(s => s.pfad === '/collections/top2').zustand, 'fehler');

const cap1 = simuliereCap(menue, abdeckung, 1);
ist('Cap simuliert eine versteckte Kante', cap1.versteckteKanten, 1);
ist('fehlendes A3 ist nicht sicher', cap1.unsichereKanten, 1);
ist('Mobile Alle-in fehlt für zwei der drei Knoten', cap1.mobileAlleFehltKnoten, 2);
ist('Cap bleibt gesperrt', cap1.freigegeben, false);
ist('Alternative Main-Seite kann genau die fehlende Kante sichern', simuliereCap(menue, abdeckung, 1, { alternativeMainLinks: alternativ.links }).unsichereKanten, 0);
wirft('Cap Null wird abgelehnt', () => simuliereCap(menue, abdeckung, 0), /positive Ganzzahl/);

// Mutationsprobe: Wenn A3 im Main ergänzt wird, muss genau diese Sperre verschwinden.
const mutiert = bewerteAbdeckung(menue, {
  ...seiten,
  '/collections/a': { status: 200, finalerPfad: '/collections/a', hatMain: true, canonical: '/collections/a', links: ['/collections/a1', '/collections/a2', '/collections/a3'] },
});
ist('Mutationsprobe kippt die A3-Kante auf sicher', simuliereCap(menue, mutiert, 1).unsichereKanten, 0);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
