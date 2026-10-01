#!/usr/bin/env node
/**
 * offenes_geld.mjs — findet das Geld, das im Shop LIEGEN BLEIBT.
 *
 *   node tools/offenes_geld.mjs --selbsttest
 *   node tools/offenes_geld.mjs auszug.json
 *
 * WARUM ES DIESES GERAET GIBT
 * GEMESSEN 2026-09-30: der Shop hat in vier Monaten mit Verkäufen zusammen rund
 * CHF 253 NETTO eingenommen (Juni 24.90 · Juli 34.90 · August 118.42 · September 74.91).
 * Gleichzeitig lagen **CHF 206.50 in fünf abgebrochenen Kassenvorgängen** — jeder mit
 * echter E-Mail-Adresse und funktionierendem Wiederherstellungs-Link — und **eine bezahlte
 * Bestellung war seit drei Tagen nicht ausgeliefert**.
 *
 * **Das liegengebliebene Geld ist also in derselben Grössenordnung wie der ganze Umsatz.**
 * Niemand sieht dort nach, weil keine Kennzahl es zeigt: der Umsatzbericht zeigt, was
 * hereinkam, nicht was danebenfiel.
 *
 * WAS ES FINDET, nach Dringlichkeit:
 *  1. bezahlt_nicht_geliefert  Geld ist da, die Ware nicht. Wird es zu alt, kommt die
 *     Rückerstattung — im Juli 2026 waren das CHF 869.62 auf einen Schlag.
 *  2. liegengebliebener_korb   Kasse erreicht, E-Mail hinterlassen, nicht gekauft.
 *     Wiederherstellungs-Link existiert, das Geld ist eine Nachricht weit weg.
 *  3. korb_ohne_adresse        dasselbe, aber ohne E-Mail → NICHT erreichbar. Getrennt
 *     ausgewiesen, damit niemand es zur Hoffnung addiert.
 *
 * ⚠️ DREI GEGENPROBEN, die im Selbsttest stehen, weil sie Zahlen erfinden würden:
 *  - **Eine Bestellung des Inhabers ist kein Kundengeld.** Der Shop hat mehrere
 *    Testbestellungen auf die eigene Adresse; wer sie mitzählt, meldet fremdes Geld,
 *    das keines ist.
 *  - **Eine Bestellung von heute ist kein Versäumnis.** Erst ab einer Karenz zählt sie.
 *  - **Ein abgeschlossener Kassenvorgang ist kein liegengebliebener Korb** — `completedAt`
 *    entscheidet, nicht das Fehlen einer Bestellung.
 */

/** Ab wie vielen Tagen ist „bezahlt, nicht geliefert" ein Befund? */
export const KARENZ_TAGE = 2;

/** Ab wann ist ein liegengebliebener Korb zu alt, um ihn noch zu erwähnen? */
export const KORB_VERFALL_TAGE = 120;

/** Tage zwischen zwei Zeitpunkten, immer positiv gerundet auf ganze Tage. */
export function tageSeit(iso, jetzt = new Date()) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.floor((jetzt.getTime() - t.getTime()) / 86400000);
}

/** Betrag als Zahl. Unbekannt bleibt `null` — nie 0, sonst verschwindet Geld still. */
export function betrag(wert) {
  if (wert === null || wert === undefined || wert === '') return null;
  const n = typeof wert === 'number' ? wert : Number(String(wert).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Gehört die Bestellung dem Inhaber selbst?
 *
 * ⚠️ Der Shop hat mehrere Testbestellungen auf die eigene Adresse. Sie als Kundengeld zu
 * zählen wäre eine erfundene Zahl. Entschieden wird an der E-MAIL, nicht am Namen —
 * ein Name lässt sich schreiben wie man will.
 */
export function istInhaber(email, inhaberAdressen = []) {
  if (typeof email !== 'string' || email === '') return false;
  const e = email.trim().toLowerCase();
  return inhaberAdressen.some((a) => String(a).trim().toLowerCase() === e);
}

/**
 * Bezahlt, aber nicht ausgeliefert — und alt genug, dass es ein Versäumnis ist.
 * `PARTIALLY_FULFILLED` zählt mit: ein Teil fehlt der Kundschaft trotzdem.
 */
export function istBezahltNichtGeliefert(bestellung, jetzt = new Date(), karenz = KARENZ_TAGE) {
  if (!bestellung) return false;
  const bezahlt = String(bestellung.financialStatus ?? '').toUpperCase();
  if (bezahlt !== 'PAID' && bezahlt !== 'PARTIALLY_PAID') return false;
  const geliefert = String(bestellung.fulfillmentStatus ?? '').toUpperCase();
  if (geliefert === 'FULFILLED' || geliefert === 'RESTOCKED') return false;
  const alter = tageSeit(bestellung.createdAt, jetzt);
  if (alter === null) return false;
  return alter >= karenz;
}

/**
 * Liegengebliebener Korb: Kasse erreicht, nicht abgeschlossen, und noch nicht verfallen.
 * Ob er ERREICHBAR ist, entscheidet `hatAdresse()` — getrennt, nicht vermischt.
 */
export function istLiegengeblieben(korb, jetzt = new Date(), verfall = KORB_VERFALL_TAGE) {
  if (!korb) return false;
  if (korb.completedAt) return false;              // abgeschlossen = gekauft
  const alter = tageSeit(korb.createdAt, jetzt);
  if (alter === null) return false;
  return alter <= verfall;
}

/** Lässt sich der Korb überhaupt zurückholen? Ohne E-Mail UND ohne Link: nein. */
export function hatAdresse(korb) {
  const mail = korb?.customer?.defaultEmailAddress?.emailAddress
    ?? korb?.customer?.email ?? korb?.email ?? null;
  return typeof mail === 'string' && mail.includes('@');
}

/** Der eigentliche Prüfer. Bekommt fertige Daten, damit er ohne Netz testbar ist. */
export function pruefe({ bestellungen = [], koerbe = [] } = {}, {
  jetzt = new Date(), inhaberAdressen = [], karenz = KARENZ_TAGE,
} = {}) {
  const befunde = [];

  for (const b of bestellungen) {
    if (!istBezahltNichtGeliefert(b, jetzt, karenz)) continue;
    const mail = b.customerEmail ?? b.email ?? null;
    befunde.push({
      art: 'bezahlt_nicht_geliefert',
      wer: istInhaber(mail, inhaberAdressen) ? 'inhaber' : 'kundschaft',
      name: b.name ?? null,
      email: mail,
      betrag: betrag(b.totalPrice),
      tage: tageSeit(b.createdAt, jetzt),
      beleg: (b.lineItems ?? []).map((l) => l.title).join(' · ') || null,
    });
  }

  for (const k of koerbe) {
    if (!istLiegengeblieben(k, jetzt)) continue;
    const mail = k?.customer?.defaultEmailAddress?.emailAddress ?? k?.customer?.email ?? k?.email ?? null;
    befunde.push({
      art: hatAdresse(k) ? 'liegengebliebener_korb' : 'korb_ohne_adresse',
      wer: istInhaber(mail, inhaberAdressen) ? 'inhaber' : 'kundschaft',
      name: k.name ?? null,
      email: mail,
      betrag: betrag(k?.totalPriceSet?.shopMoney?.amount),
      tage: tageSeit(k.createdAt, jetzt),
      beleg: (k?.lineItems?.nodes ?? []).map((l) => l.title).join(' · ') || null,
      link: k.abandonedCheckoutUrl ?? null,
    });
  }

  // Dringendste zuerst: bezahlt-nicht-geliefert vor Körben, innerhalb davon das ältere.
  const rang = { bezahlt_nicht_geliefert: 0, liegengebliebener_korb: 1, korb_ohne_adresse: 2 };
  befunde.sort((a, b) => rang[a.art] - rang[b.art] || (b.tage ?? 0) - (a.tage ?? 0));

  const summe = (art, wer) => befunde
    .filter((x) => x.art === art && (wer === undefined || x.wer === wer) && x.betrag !== null)
    .reduce((s, x) => s + x.betrag, 0);

  return {
    befunde,
    // Kundengeld und eigenes Geld werden NIE addiert.
    schuldetKundschaft: summe('bezahlt_nicht_geliefert', 'kundschaft'),
    schuldetInhaberSelbst: summe('bezahlt_nicht_geliefert', 'inhaber'),
    erreichbarImKorb: summe('liegengebliebener_korb', 'kundschaft'),
    unerreichbarImKorb: summe('korb_ohne_adresse', 'kundschaft'),
  };
}

const NAMEN = {
  bezahlt_nicht_geliefert: 'BEZAHLT, NICHT GELIEFERT',
  liegengebliebener_korb: 'Liegengebliebener Korb (erreichbar)',
  korb_ohne_adresse: 'Liegengebliebener Korb OHNE Adresse (nicht erreichbar)',
};

export function bericht(e, waehrung = 'CHF') {
  const z = [];
  const f = (n) => `${waehrung} ${n.toFixed(2)}`;
  z.push('Offenes Geld im Shop');
  z.push(`  Der Kundschaft geschuldet (bezahlt, nicht geliefert): ${f(e.schuldetKundschaft)}`);
  z.push(`  Im Korb liegen geblieben und ERREICHBAR:               ${f(e.erreichbarImKorb)}`);
  z.push(`  Im Korb liegen geblieben, NICHT erreichbar:            ${f(e.unerreichbarImKorb)}`);
  if (e.schuldetInhaberSelbst > 0) {
    z.push(`  (davon eigene Testbestellungen, KEIN Kundengeld:      ${f(e.schuldetInhaberSelbst)})`);
  }
  z.push('');
  for (const b of e.befunde) {
    const geld = b.betrag === null ? 'Betrag unbekannt' : f(b.betrag);
    const wer = b.wer === 'inhaber' ? ' [eigene Testbestellung]' : '';
    z.push(`  ${NAMEN[b.art]}${wer}`);
    z.push(`    ${b.name ?? '—'} · ${geld} · vor ${b.tage} Tagen · ${b.beleg ?? '—'}`);
    if (b.email) z.push(`    ${b.email}`);
    if (b.link) z.push(`    ${b.link}`);
  }
  return z.join('\n');
}

/* ----------------------------------------------------------------------- */

function selbsttest() {
  let gut = 0; const schlecht = [];
  const p = (name, bedingung) => { if (bedingung) gut++; else schlecht.push(name); };
  const JETZT = new Date('2026-09-30T12:00:00Z');
  const INHABER = ['alleng0@hotmail.com'];

  // --- tageSeit
  p('tageSeit rechnet ganze Tage', tageSeit('2026-09-27T12:00:00Z', JETZT) === 3);
  p('tageSeit heute ist 0', tageSeit('2026-09-30T01:00:00Z', JETZT) === 0);
  p('GEGENPROBE fehlendes Datum ist unbekannt', tageSeit(null, JETZT) === null);
  p('GEGENPROBE Unsinn-Datum ist unbekannt', tageSeit('kein datum', JETZT) === null);

  // --- betrag: unbekannt bleibt unbekannt, damit kein Geld still verschwindet
  p('Betrag als Zeichenkette', betrag('23.11') === 23.11);
  p('Betrag mit Komma', betrag('23,11') === 23.11);
  p('GEGENPROBE fehlender Betrag ist null, NICHT 0', betrag(null) === null);
  p('GEGENPROBE Unsinn ist null, NICHT 0', betrag('abc') === null);
  p('Null Franken bleiben 0', betrag('0') === 0);

  // --- Inhaber gegen Kundschaft (entschieden an der E-Mail, nicht am Namen)
  p('eigene Adresse wird erkannt', istInhaber('alleng0@hotmail.com', INHABER));
  p('Gross-/Kleinschreibung egal', istInhaber('ALLENG0@Hotmail.com', INHABER));
  p('GEGENPROBE echte Kundschaft ist nicht der Inhaber',
    !istInhaber('alicia.riedi@powersurf.li', INHABER));
  p('GEGENPROBE ohne Adresse kein Inhaber', !istInhaber(null, INHABER));
  p('GEGENPROBE leere Inhaberliste klagt niemanden an', !istInhaber('x@y.ch', []));

  // --- bezahlt, nicht geliefert (die echten Fälle vom 30.09.2026)
  const b1019 = { name: '#1019', financialStatus: 'PAID', fulfillmentStatus: 'UNFULFILLED',
    createdAt: '2026-09-27T21:27:52Z', totalPrice: '23.11', customerEmail: 'alicia.riedi@powersurf.li',
    lineItems: [{ title: 'Leuchtender Halloween-Schaukelgeist' }] };
  const b1020 = { name: '#1020', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED',
    createdAt: '2026-09-29T22:16:36Z', totalPrice: '36.90', customerEmail: 'x@y.ch' };
  p('#1019 ist ein Befund', istBezahltNichtGeliefert(b1019, JETZT));
  p('GEGENPROBE eine ausgelieferte Bestellung ist KEIN Befund',
    !istBezahltNichtGeliefert(b1020, JETZT));
  // die Karenz — sonst meldet das Geraet jede frische Bestellung als Versaeumnis
  const frisch = { ...b1019, createdAt: '2026-09-30T06:00:00Z' };
  p('GEGENPROBE eine Bestellung von heute ist kein Versaeumnis',
    !istBezahltNichtGeliefert(frisch, JETZT));
  p('genau an der Karenz zaehlt sie',
    istBezahltNichtGeliefert({ ...b1019, createdAt: '2026-09-28T06:00:00Z' }, JETZT));
  // unbezahlt ist kein offenes Geld, sondern gar kein Geld
  p('GEGENPROBE unbezahlt ist kein offenes Geld',
    !istBezahltNichtGeliefert({ ...b1019, financialStatus: 'PENDING' }, JETZT));
  p('GEGENPROBE erstattet ist kein offenes Geld',
    !istBezahltNichtGeliefert({ ...b1019, financialStatus: 'REFUNDED' }, JETZT));
  p('teilweise geliefert bleibt ein Befund',
    istBezahltNichtGeliefert({ ...b1019, fulfillmentStatus: 'PARTIALLY_FULFILLED' }, JETZT));

  // --- liegengebliebene Koerbe
  const korb = { name: '#72020526956935', createdAt: '2026-09-29T07:57:31Z', completedAt: null,
    totalPriceSet: { shopMoney: { amount: '36.9' } },
    customer: { defaultEmailAddress: { emailAddress: 'dashmire.daut1@hotmail.com' } },
    abandonedCheckoutUrl: 'https://luxestyle.ch/…/recover?key=…',
    lineItems: { nodes: [{ title: 'Kristall-Set 3-teilig' }] } };
  p('offener Korb ist ein Befund', istLiegengeblieben(korb, JETZT));
  p('GEGENPROBE abgeschlossener Korb ist KEIN Befund',
    !istLiegengeblieben({ ...korb, completedAt: '2026-09-29T08:10:00Z' }, JETZT));
  p('GEGENPROBE ein uralter Korb verfaellt',
    !istLiegengeblieben({ ...korb, createdAt: '2026-01-01T00:00:00Z' }, JETZT));
  p('Korb mit Adresse ist erreichbar', hatAdresse(korb));
  p('GEGENPROBE Korb ohne Adresse ist NICHT erreichbar',
    !hatAdresse({ ...korb, customer: null }));

  // --- ganzer Durchlauf an den ECHTEN Daten vom 30.09.2026
  const e = pruefe({
    bestellungen: [
      b1019, b1020,
      { name: '#1004', financialStatus: 'PAID', fulfillmentStatus: 'UNFULFILLED',
        createdAt: '2026-06-25T12:54:09Z', totalPrice: '31.90',
        customerEmail: 'alleng0@hotmail.com', lineItems: [{ title: 'LED-Laterne' }] },
    ],
    koerbe: [
      korb,
      { name: '#alt', createdAt: '2026-07-04T20:28:33Z', completedAt: null,
        totalPriceSet: { shopMoney: { amount: '49.9' } },
        customer: { defaultEmailAddress: { emailAddress: 'florian_zalli2@hotmail.com' } },
        lineItems: { nodes: [{ title: 'Abendkleid' }] } },
      { name: '#ohne', createdAt: '2026-09-20T10:00:00Z', completedAt: null,
        totalPriceSet: { shopMoney: { amount: '99.00' } }, customer: null,
        lineItems: { nodes: [{ title: 'Ohne Adresse' }] } },
    ],
  }, { jetzt: JETZT, inhaberAdressen: INHABER });

  p('Kundengeld geschuldet stimmt', Math.abs(e.schuldetKundschaft - 23.11) < 0.001);
  p('🔑 die eigene Testbestellung wird NICHT als Kundengeld gezaehlt',
    Math.abs(e.schuldetInhaberSelbst - 31.90) < 0.001);
  p('erreichbares Korbgeld stimmt', Math.abs(e.erreichbarImKorb - 86.8) < 0.001);
  p('🔑 unerreichbares Korbgeld wird GETRENNT ausgewiesen',
    Math.abs(e.unerreichbarImKorb - 99.0) < 0.001);
  p('GEGENPROBE die 99 fliessen NICHT ins erreichbare Geld', e.erreichbarImKorb !== 185.8);
  p('die ausgelieferte Bestellung taucht gar nicht auf',
    !e.befunde.some((x) => x.name === '#1020'));
  p('Dringendstes zuerst', e.befunde[0].art === 'bezahlt_nicht_geliefert');
  p('innerhalb der Art das aeltere zuerst', e.befunde[0].tage >= e.befunde[1].tage);

  // GEGENPROBE: ein sauberer Shop meldet NICHTS und null Franken
  const sauber = pruefe({
    bestellungen: [b1020],
    koerbe: [{ ...korb, completedAt: '2026-09-29T08:10:00Z' }],
  }, { jetzt: JETZT, inhaberAdressen: INHABER });
  p('GEGENPROBE sauberer Shop meldet nichts', sauber.befunde.length === 0);
  p('GEGENPROBE sauberer Shop meldet null Franken',
    sauber.schuldetKundschaft === 0 && sauber.erreichbarImKorb === 0);

  console.log(`${gut}/${gut + schlecht.length} Selbsttests bestanden`);
  for (const s of schlecht) console.log('  GESCHEITERT: ' + s);
  return schlecht.length === 0;
}

const direkt = process.argv[1] && process.argv[1].endsWith('offenes_geld.mjs');
if (direkt) {
  const arg = process.argv[2];
  if (arg === '--selbsttest') {
    process.exit(selbsttest() ? 0 : 1);
  } else if (!arg) {
    console.log('Aufruf: node tools/offenes_geld.mjs <auszug.json>   ·   --selbsttest');
    console.log('Der Auszug enthaelt { bestellungen: [...], koerbe: [...] } aus der Shopify-Abfrage.');
    process.exit(1);
  } else {
    const { readFileSync } = await import('node:fs');
    const daten = JSON.parse(readFileSync(arg, 'utf8'));
    const e = pruefe(daten, { inhaberAdressen: daten.inhaberAdressen ?? [] });
    console.log(bericht(e));
  }
}
