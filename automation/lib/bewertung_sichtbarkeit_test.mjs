#!/usr/bin/env node
/**
 * Tests für bewertung_sichtbarkeit.mjs.
 *
 * Die wichtigsten sind die GEGENPROBEN: ein stark bewerteter Draft MIT Sperr-Tag darf nie
 * als Kandidat gelten (sonst schaltet ein Lauf einen Verlustverkauf scharf), und ein
 * sichtbares Produkt darf nie als „verschenkt" gezählt werden (sonst meldet der Bericht
 * Arbeit, die es nicht gibt).
 */
import { einordnen, sterneLesen, sperrGruende, SPERR_TAGS } from './bewertung_sichtbarkeit.mjs';

let ok = 0, fehler = 0;
const t = (name, fn) => { try { fn(); ok++; } catch (e) { fehler++; console.error('FEHLER:', name, '→', e.message); } };
const gleich = (a, b, w) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${w}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

// --- sterneLesen: das echte Metafeld-Format ---
t('Metafeld-JSON wird gelesen', () =>
  gleich(sterneLesen('{"scale_min":"1.0","scale_max":"5.0","value":"4.75"}'), 4.75, 'sterne'));
t('Liquid-Form mit rating wird gelesen', () => gleich(sterneLesen({ rating: '5.0' }), 5, 'sterne'));
t('nackte Zahl als Text wird gelesen', () => gleich(sterneLesen('4.6'), 4.6, 'sterne'));
t('leer bleibt null', () => { gleich(sterneLesen(null), null, 'null'); gleich(sterneLesen(''), null, 'leer'); });
t('Unlesbares bleibt null statt 0', () => gleich(sterneLesen('{kaputt'), null, 'kaputt'));
// Gegenprobe: 0 Sterne sind eine Angabe, nicht „keine Angabe"
t('0 Sterne ist eine Zahl, nicht null', () => gleich(sterneLesen('{"value":"0"}'), 0, 'null'));

const stark = { status: 'ACTIVE', imOnlineshop: true, sterne: 4.75, stimmen: 12, tags: [] };

// --- die Gruppen ---
t('stark + aktiv + publiziert = sichtbar', () => {
  const r = einordnen(stark);
  gleich(r.gruppe, 'stark-sichtbar', 'gruppe'); gleich(r.kandidat, false, 'kandidat');
});
t('der echte Fall vom 17.10.: stark, aber DRAFT', () => {
  const r = einordnen({ ...stark, status: 'DRAFT', imOnlineshop: false,
    tags: ['gaming', 'marge-verlust-draft', 'verlust-auto-draft'] });
  gleich(r.gruppe, 'stark-verschenkt-draft', 'gruppe');
  gleich(r.gruende, ['marge-verlust-draft', 'verlust-auto-draft'], 'gruende');
  gleich(r.kandidat, false, 'MIT Sperr-Tag niemals Kandidat');
});
t('GEGENPROBE: stark + DRAFT OHNE Sperr-Tag ist ein Kandidat', () => {
  const r = einordnen({ ...stark, status: 'DRAFT', imOnlineshop: false, tags: ['gaming', 'cj-real'] });
  gleich(r.gruppe, 'stark-verschenkt-draft', 'gruppe');
  gleich(r.gruende, [], 'keine Gruende');
  gleich(r.kandidat, true, 'kandidat');
});
t('aktiv, aber nicht im Onlineshop = unsichtbar', () => {
  const r = einordnen({ ...stark, imOnlineshop: false });
  gleich(r.gruppe, 'stark-unsichtbar', 'gruppe'); gleich(r.kandidat, true, 'kandidat');
});
t('unsichtbar MIT Sperr-Tag ist kein Kandidat', () =>
  gleich(einordnen({ ...stark, imOnlineshop: false, tags: ['18plus'] }).kandidat, false, 'kandidat'));
t('ohne Stimmen = keine Bewertung', () =>
  gleich(einordnen({ ...stark, stimmen: 0 }).gruppe, 'keine-bewertung', 'gruppe'));
t('ohne Sterne = keine Bewertung', () =>
  gleich(einordnen({ ...stark, sterne: null }).gruppe, 'keine-bewertung', 'gruppe'));
t('1–2 Stimmen = unter der Kartenschwelle', () => {
  gleich(einordnen({ ...stark, stimmen: 1 }).gruppe, 'unter-schwelle', 'gruppe');
  gleich(einordnen({ ...stark, stimmen: 2 }).gruppe, 'unter-schwelle', 'gruppe');
});
t('genau 3 Stimmen zählt schon', () =>
  gleich(einordnen({ ...stark, stimmen: 3 }).gruppe, 'stark-sichtbar', 'gruppe'));
t('3,3★ = schwach (der Sommerkleid-Fall)', () =>
  gleich(einordnen({ ...stark, sterne: 3.3 }).gruppe, 'schwach', 'gruppe'));
t('3,9★ = mittel, nicht stark', () =>
  gleich(einordnen({ ...stark, sterne: 3.9 }).gruppe, 'mittel', 'gruppe'));
t('genau 4,0★ ist stark (Kartenschwelle des Themes)', () =>
  gleich(einordnen({ ...stark, sterne: 4.0 }).gruppe, 'stark-sichtbar', 'gruppe'));
t('genau 3,8★ ist schwach (Grenze von rating_guard)', () =>
  gleich(einordnen({ ...stark, sterne: 3.8 }).gruppe, 'schwach', 'gruppe'));
// Gegenprobe: ein schwaches Produkt darf NICHT als verschenkter Draft auftauchen
t('GEGENPROBE: schwach + DRAFT bleibt schwach, kein Kandidat', () => {
  const r = einordnen({ ...stark, sterne: 3.3, status: 'DRAFT', imOnlineshop: false, tags: [] });
  gleich(r.gruppe, 'schwach', 'gruppe'); gleich(r.kandidat, false, 'kandidat');
});
t('ARCHIVED zählt wie DRAFT', () =>
  gleich(einordnen({ ...stark, status: 'ARCHIVED', imOnlineshop: false }).gruppe, 'stark-verschenkt-draft', 'gruppe'));
t('Metafeld-Text direkt übergeben funktioniert', () => {
  const r = einordnen({ ...stark, sterne: '{"scale_min":"1.0","scale_max":"5.0","value":"5.0"}', stimmen: '3' });
  gleich(r.gruppe, 'stark-sichtbar', 'gruppe'); gleich(r.sterne, 5, 'sterne');
});
t('fehlende Tags kippen nicht um', () =>
  gleich(einordnen({ status: 'DRAFT', sterne: 5, stimmen: 4 }).kandidat, true, 'kandidat'));
t('jeder Sperr-Tag wirkt einzeln', () => {
  for (const tag of SPERR_TAGS) {
    const r = einordnen({ ...stark, status: 'DRAFT', imOnlineshop: false, tags: [tag] });
    if (r.kandidat !== false) throw new Error(`Tag ${tag} verhindert den Kandidaten nicht`);
    if (!r.gruende.includes(tag)) throw new Error(`Tag ${tag} wird nicht genannt`);
  }
});
t('ein fremder Tag sperrt nicht', () =>
  gleich(einordnen({ ...stark, status: 'DRAFT', imOnlineshop: false, tags: ['sommer-2026'] }).kandidat, true, 'kandidat'));

// --- Grund-FAMILIEN (Korrektur nach dem ersten scharfen Lauf) ---
// Jeder dieser Tags lag echt auf einem gut bewerteten Draft und wurde zuerst übersehen.
t('die echten Chargen-Gründe werden erkannt', () => {
  for (const tag of ['auto-entwurf-0926', 'nicht-fit-elektronik-draft', 'nicht-fit-auto-draft',
    'duplikat-auto-draft', 'dublette-bild', 'dublette-original-15411555533185',
    'bilder-geloescht-speicher', 'bild-zu-klein', 'cj-entfernt-2026-10-05', 'ohne-ek-cj-weg',
    'bigbuy-paket-ausgelaufen', 'lizenz-nicht-bewerben', 'geprueft-gesperrt-0410']) {
    if (sperrGruende([tag]).length !== 1) throw new Error(`Grund ${tag} nicht erkannt`);
    const r = einordnen({ ...stark, status: 'DRAFT', imOnlineshop: false, tags: ['elektronik', tag] });
    if (r.kandidat !== false) throw new Error(`${tag} verhindert den Kandidaten nicht`);
  }
});
// GEGENPROBE in die andere Richtung: harmlose Tags dürfen NICHT sperren, sonst verschwindet
// jede echte Gelegenheit im Rauschen. rueckhol-0907 liegt auf über 10'000 aktiven Produkten.
t('GEGENPROBE: harmlose Tags sperren nicht', () => {
  for (const tag of ['rueckhol-0907', 'bildmass-ok-0906', 'cj-real', 'dropship', 'bild-ok',
    'gaming', 'elektronik', 'tech', 'trend', 'neuheit', 'hype-2026', 'video-hit', 'ch-lager',
    'geschenk', 'kategorie-uhr', 'cj-realname', 'sommer-2026']) {
    if (sperrGruende([tag]).length !== 0) throw new Error(`${tag} sperrt fälschlich`);
  }
});
t('Sperrgründe werden ohne Doppel gezählt', () =>
  gleich(sperrGruende(['marge-verlust-draft', 'marge-verlust-draft']).length, 2, 'beide Vorkommen'));
t('leere Tags ergeben keine Gründe', () => {
  gleich(sperrGruende([]), [], 'leer'); gleich(sperrGruende(undefined), [], 'undefined');
});

console.log(fehler === 0 ? `✅ ${ok} Tests grün` : `❌ ${fehler} von ${ok + fehler} rot`);
process.exit(fehler === 0 ? 0 : 1);
