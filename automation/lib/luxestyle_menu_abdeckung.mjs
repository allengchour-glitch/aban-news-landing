// Read-only-Pruefer fuer die LuxeStyle-Hauptnavigation.
// Ohne LIVE_READ=1 wird kein Netz aufgerufen. Der Live-Lauf liest genau die
// Startseite, hoechstens 100 Gruppen- und 30 Alternativseiten; er schreibt
// weder Shopify noch Theme, Produkt, Menü oder Datei.

const BASIS = 'https://luxestyle.ch/';
const MAX_GRUPPEN = 100;
const USER_AGENT = 'LuxeStyle-menu-coverage-audit/1.0';
const ERWARTET = { gruppenKnoten: 86, gruppenUrls: 84, kinderKanten: 520, kinderUrls: 514 };

const htmlText = (s = '') => s
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const attribut = (s, name) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = s.match(new RegExp(`(?:^|\\s)${esc}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

const klassen = (s) => new Set((attribut(s, 'class') || '').split(/\s+/).filter(Boolean));

export function normalisiereInternenPfad(href, basis = BASIS) {
  if (typeof href !== 'string' || href.trim() === '') return null;
  let u;
  try { u = new URL(href, basis); } catch { return null; }
  if (!['https:', 'http:'].includes(u.protocol)) return null;
  if (!['luxestyle.ch', 'www.luxestyle.ch'].includes(u.hostname.toLowerCase())) return null;
  return u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
}

function anchors(html) {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  for (const m of html.matchAll(re)) {
    out.push({ attrs: m[1], body: m[2], classes: klassen(m[1]), href: attribut(m[1], 'href') });
  }
  return out;
}

function teil(html, startRe, endRe) {
  const start = startRe.exec(html);
  if (!start) return null;
  const rest = html.slice(start.index + start[0].length);
  const end = endRe.exec(rest);
  if (!end) return null;
  return html.slice(start.index, start.index + start[0].length + end.index + end[0].length);
}

export function leseMenueAusHtml(html, basis = BASIS) {
  if (typeof html !== 'string' || !html.includes('lxm__head')) {
    throw new Error('Desktop-Menümarker lxm__head fehlt');
  }
  const fehler = [];
  const gruppenKnoten = [];
  const dauerhafteLinks = [];
  const alternativeSeiten = new Set(['/pages/alle-kategorien']);
  let aktuell = null;

  for (const a of anchors(html)) {
    if (a.classes.has('lxm__all')) {
      aktuell = null;
      const url = normalisiereInternenPfad(a.href, basis);
      if (url) {
        dauerhafteLinks.push(url);
        alternativeSeiten.add(url);
      }
      continue;
    }
    if (a.classes.has('lxm__head')) {
      const url = normalisiereInternenPfad(a.href, basis);
      if (!url) {
        fehler.push(`Gruppenziel nicht intern oder leer: ${a.href ?? '(leer)'}`);
        aktuell = null;
        continue;
      }
      aktuell = { titel: htmlText(a.body), url, kinder: [] };
      gruppenKnoten.push(aktuell);
      dauerhafteLinks.push(url);
      continue;
    }
    if (a.classes.has('lxm__link')) {
      const url = normalisiereInternenPfad(a.href, basis);
      if (!url) {
        fehler.push(`Kindziel nicht intern oder leer: ${a.href ?? '(leer)'}`);
        continue;
      }
      if (aktuell) aktuell.kinder.push(url);
      else dauerhafteLinks.push(url); // ungegliederter, dauerhaft sichtbarer Desktop-Link
    }
  }

  const nachUrl = new Map();
  for (const k of gruppenKnoten) {
    if (!nachUrl.has(k.url)) nachUrl.set(k.url, { url: k.url, titel: [], kinder: new Set(), knoten: 0 });
    const g = nachUrl.get(k.url);
    g.knoten++;
    g.titel.push(k.titel);
    for (const u of k.kinder) g.kinder.add(u);
  }
  const gruppen = [...nachUrl.values()].map(g => ({ ...g, kinder: [...g.kinder] }));

  const drawer = teil(html, /<header-drawer\b[^>]*>/i, /<\/header-drawer\s*>/i);
  const mobileAlle = new Map();
  if (!drawer) {
    fehler.push('Mobile header-drawer fehlt oder ist nicht abgeschlossen');
  } else {
    for (const a of anchors(drawer)) {
      // Ein beliebiger gleichlautender Link beweist keine Gruppen-Landingpage.
      // Erst dieser explizite Marker gilt spaeter als «Alle in …»-Beleg.
      if (!a.classes.has('lx-menu-group-all')) continue;
      const url = normalisiereInternenPfad(a.href, basis);
      if (url) mobileAlle.set(url, (mobileAlle.get(url) || 0) + 1);
    }
  }

  return {
    gruppenKnoten,
    gruppen,
    dauerhafteLinks,
    alternativeSeiten: [...alternativeSeiten],
    mobileAlle: Object.fromEntries(mobileAlle),
    fehler,
    messung: {
      gruppenKnoten: gruppenKnoten.length,
      gruppenUrls: gruppen.length,
      kinderKanten: gruppenKnoten.reduce((n, g) => n + g.kinder.length, 0),
      kinderUrls: new Set(gruppen.flatMap(g => g.kinder)).size,
      mobileAlleBelegt: [...mobileAlle.values()].reduce((a, b) => a + b, 0),
    },
  };
}

export function pruefeBaseline(messung, erwartet = ERWARTET) {
  const falsch = Object.entries(erwartet).filter(([k, v]) => messung[k] !== v);
  if (falsch.length) throw new Error(`Menü-Baseline weicht ab: ${falsch.map(([k, v]) => `${k}=${messung[k]} statt ${v}`).join(', ')}`);
  return true;
}

export function sammleAlternativeMainLinks(pfade, seiten) {
  const links = new Set();
  const ergebnisse = [];
  for (const pfad of [...new Set(pfade)]) {
    const p = seiten[pfad];
    let zustand = 'voll';
    let grund = null;
    if (!p || p.unsicher || p.status === 429 || p.status >= 500) {
      zustand = 'unbekannt'; grund = p?.grund || `HTTP ${p?.status ?? 'unbekannt'}`;
    } else if (p.status !== 200) {
      zustand = 'fehler'; grund = `HTTP ${p.status}`;
    } else if (p.finalerPfad !== pfad) {
      zustand = 'fehler'; grund = `Weiterleitung auf ${p.finalerPfad || '(unbekannt)'}`;
    } else if (!p.hatMain) {
      zustand = 'unbekannt'; grund = 'main fehlt';
    } else if (p.canonical !== pfad) {
      zustand = 'fehler'; grund = `Canonical ${p.canonical || '(fehlt)'}`;
    } else {
      for (const u of p.links) links.add(u);
    }
    ergebnisse.push({ pfad, zustand, grund, status: p?.status ?? 'unbekannt', canonical: p?.canonical ?? null, mainLinks: zustand === 'voll' ? p.links.length : null });
  }
  return { links: [...links], seiten: ergebnisse };
}

export function leseMainAusHtml(html, basis = BASIS) {
  const main = teil(html, /<main\b[^>]*>/i, /<\/main\s*>/i);
  const links = new Set();
  if (main) {
    for (const a of anchors(main)) {
      const u = normalisiereInternenPfad(a.href, basis);
      if (u) links.add(u);
    }
  }
  let canonical = null;
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const rel = (attribut(m[1], 'rel') || '').toLowerCase().split(/\s+/);
    if (!rel.includes('canonical')) continue;
    canonical = normalisiereInternenPfad(attribut(m[1], 'href'), basis);
    break;
  }
  return { hatMain: Boolean(main), links: [...links], canonical };
}

export function bewerteAbdeckung(menue, seiten) {
  const gruppen = [];
  for (const g of menue.gruppen) {
    const p = seiten[g.url];
    const basis = { url: g.url, titel: g.titel, knoten: g.knoten, kinder: g.kinder.length };
    if (!p || p.unsicher || p.status === 429 || p.status >= 500) {
      gruppen.push({ ...basis, zustand: 'unbekannt', grund: p?.grund || `HTTP ${p?.status ?? 'unbekannt'}`, abgedeckt: null, fehlend: null });
      continue;
    }
    if (p.status !== 200) {
      gruppen.push({ ...basis, zustand: 'fehler', grund: `HTTP ${p.status}`, abgedeckt: null, fehlend: null });
      continue;
    }
    if (p.finalerPfad !== g.url) {
      gruppen.push({ ...basis, zustand: 'fehler', grund: `Weiterleitung auf ${p.finalerPfad || '(unbekannt)'}`, abgedeckt: null, fehlend: null });
      continue;
    }
    if (!p.hatMain) {
      gruppen.push({ ...basis, zustand: 'unbekannt', grund: 'main fehlt', abgedeckt: null, fehlend: null });
      continue;
    }
    if (p.canonical !== g.url) {
      gruppen.push({ ...basis, zustand: 'fehler', grund: `Canonical ${p.canonical || '(fehlt)'}`, abgedeckt: null, fehlend: null });
      continue;
    }
    const imMain = new Set(p.links);
    const fehlend = g.kinder.filter(u => !imMain.has(u));
    const abgedeckt = g.kinder.length - fehlend.length;
    const zustand = fehlend.length === 0 ? 'voll' : abgedeckt === 0 ? 'keine' : 'teilweise';
    gruppen.push({ ...basis, zustand, abgedeckt, fehlend });
  }
  const zaehle = (z) => gruppen.filter(g => g.zustand === z).length;
  return {
    gruppen,
    zusammenfassung: {
      gruppen: gruppen.length,
      voll: zaehle('voll'),
      teilweise: zaehle('teilweise'),
      ohneKinderlinksImMain: zaehle('keine'),
      fehler: zaehle('fehler'),
      unbekannt: zaehle('unbekannt'),
      fehlendeKanten: gruppen.reduce((n, g) => n + (Array.isArray(g.fehlend) ? g.fehlend.length : 0), 0),
      gepruefteKanten: gruppen.reduce((n, g) => n + (typeof g.abgedeckt === 'number' ? g.kinder : 0), 0),
    },
  };
}

export function simuliereCap(menue, abdeckung, cap, belege = {}) {
  if (!Number.isInteger(cap) || cap < 1) throw new Error('Cap muss eine positive Ganzzahl sein');
  const seite = new Map(abdeckung.gruppen.map(g => [g.url, g]));
  const alternativeMainLinks = new Set(belege.alternativeMainLinks || []);
  const sichtbar = new Map();
  const add = u => sichtbar.set(u, (sichtbar.get(u) || 0) + 1);
  for (const u of menue.dauerhafteLinks) add(u);
  for (const g of menue.gruppenKnoten) for (const u of g.kinder.slice(0, cap)) add(u);

  const kanten = [];
  for (const g of menue.gruppenKnoten) {
    for (const u of g.kinder.slice(cap)) {
      const landing = seite.get(g.url);
      let grund = null;
      if ((sichtbar.get(u) || 0) > 0) grund = 'andere-dauerhafte-navigation';
      else if (alternativeMainLinks.has(u)) grund = 'alternative-seite-main';
      else if (landing?.zustand === 'voll' || (Array.isArray(landing?.fehlend) && !landing.fehlend.includes(u))) grund = 'gruppen-main';
      kanten.push({ gruppe: g.url, kind: u, sicher: Boolean(grund), grund: grund || (landing?.zustand === 'unbekannt' ? 'unbekannt' : 'nicht-abgedeckt') });
    }
  }
  const mobileFehlt = menue.gruppenKnoten.filter(g => (menue.mobileAlle[g.url] || 0) < menue.gruppenKnoten.filter(x => x.url === g.url).indexOf(g) + 1);
  const unsicher = kanten.filter(k => !k.sicher);
  const activeCurrentBewahrt = belege.activeCurrentBewahrt === true ? true : 'unbekannt';
  return {
    cap,
    versteckteKanten: kanten.length,
    versteckteUrls: new Set(kanten.map(k => k.kind)).size,
    sichereKanten: kanten.length - unsicher.length,
    unsichereKanten: unsicher.length,
    unsichereUrls: new Set(unsicher.map(k => k.kind)).size,
    sicherDurchAndereNavigation: kanten.filter(k => k.grund === 'andere-dauerhafte-navigation').length,
    sicherDurchAlternativeSeite: kanten.filter(k => k.grund === 'alternative-seite-main').length,
    sicherDurchGruppenMain: kanten.filter(k => k.grund === 'gruppen-main').length,
    mobileAlleFehltKnoten: mobileFehlt.length,
    activeCurrentBewahrt,
    freigegeben: unsicher.length === 0 && mobileFehlt.length === 0 && menue.fehler.length === 0 && activeCurrentBewahrt === true,
    grund: unsicher.length ? 'Kindziele würden ihre belegte Erreichbarkeit verlieren' : mobileFehlt.length ? 'Mobile «Alle in …»-Ziele fehlen' : activeCurrentBewahrt !== true ? 'active/current muss im Theme-Entwurf noch geprüft werden' : 'alle Prüfbelege vorhanden',
    kanten,
  };
}

async function holeRoh(url) {
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': USER_AGENT, accept: 'text/html' }, signal: AbortSignal.timeout(25_000) });
  } catch (e) {
    return { unsicher: true, grund: `${e.name}: ${e.message}` };
  }
  if (res.status === 429 || res.status >= 500) return { status: res.status, unsicher: true, grund: `HTTP ${res.status}` };
  const html = await res.text();
  return { status: res.status, url: res.url, html, bytes: Buffer.byteLength(html) };
}

async function hole(url) {
  const roh = await holeRoh(url);
  if (roh.unsicher || !roh.html) return roh;
  const gelesen = leseMainAusHtml(roh.html, roh.url);
  return { status: roh.status, finalerPfad: normalisiereInternenPfad(roh.url), bytes: roh.bytes, ...gelesen };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const k = i++;
      if (k >= items.length) return;
      out[k] = await fn(items[k]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export async function liveAudit() {
  if (process.env.LIVE_READ !== '1') throw new Error('Kein Netzlauf: LIVE_READ=1 fehlt');
  const start = await holeRoh(BASIS);
  if (start.status !== 200 || start.unsicher) throw new Error(`Startseite nicht sicher lesbar: ${start.grund || start.status}`);
  const menue = leseMenueAusHtml(start.html);
  if (menue.fehler.length) throw new Error(`Menü unvollständig: ${menue.fehler.join('; ')}`);
  pruefeBaseline(menue.messung);
  if (menue.gruppen.length === 0 || menue.gruppen.length > MAX_GRUPPEN) throw new Error(`Gruppenzahl ${menue.gruppen.length} ausserhalb 1..${MAX_GRUPPEN}`);

  const pfade = [...new Set([...menue.gruppen.map(g => g.url), ...menue.alternativeSeiten])];
  if (pfade.length > MAX_GRUPPEN + 30) throw new Error(`Gesamtzahl ${pfade.length} ausserhalb der Grenze ${MAX_GRUPPEN + 30}`);
  const pages = await pool(pfade, 4, async pfad => [pfad, await hole(new URL(pfad, BASIS))]);
  const seiten = Object.fromEntries(pages);
  const abdeckung = bewerteAbdeckung(menue, seiten);
  const alternativen = sammleAlternativeMainLinks(menue.alternativeSeiten, seiten);
  const capBelege = { alternativeMainLinks: alternativen.links, activeCurrentBewahrt: 'unbekannt' };
  const manifest = {
    art: 'GEMESSEN',
    zeitUtc: new Date().toISOString(),
    quelle: BASIS,
    grenzen: { gruppenMax: MAX_GRUPPEN, alternativeSeitenMax: 30, geleseneSeiten: 1 + pfade.length, parallel: 4, netzSchreibzugriffe: 0 },
    menue: { ...menue.messung, fehler: menue.fehler },
    abdeckung: abdeckung.zusammenfassung,
    alternativen: { seiten: alternativen.seiten, eindeutigeMainLinks: alternativen.links.length, abgedeckteKinderUrls: menue.gruppen.flatMap(g => g.kinder).filter((u, i, a) => a.indexOf(u) === i && alternativen.links.includes(u)).length },
    cap6: simuliereCap(menue, abdeckung, 6, capBelege),
    cap4: simuliereCap(menue, abdeckung, 4, capBelege),
    gruppen: abdeckung.gruppen.map(g => ({ ...g, http: seiten[g.url]?.status ?? 'unbekannt', finalerPfad: seiten[g.url]?.finalerPfad ?? null, canonical: seiten[g.url]?.canonical ?? null })),
  };
  return manifest;
}

const direkt = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (direkt) {
  liveAudit()
    .then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exitCode = r.cap6.freigegeben ? 0 : 2;
    })
    .catch(e => {
      console.error(`ABBRUCH: ${e.message}`);
      process.exitCode = 1;
    });
}
