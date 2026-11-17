#!/usr/bin/env node
/**
 * Silber-Feingehalt («925», «S925», «Sterling», «999 Silber» …) vorläufig auf ENTWURF (Besitzer 17.11.2026 «2 ja», erweitert am selben Tag auf den ganzen Text). Nur der Status ändert sich (dazu der Arbeits-Tag), nichts wird gelöscht.
 *   node dropship/silber-bazg-1711/liste.mjs                      erst die Liste frisch lesen (nur lesen)
 *   node dropship/silber-bazg-1711/apply.mjs                      Trockenlauf (Vorgabe): zeigt, was geschehen würde, schreibt nichts
 *   SICHERN=1 node …/apply.mjs                                    schreibt NUR die Sicherung (Status, Tags, Kanäle je Produkt); der Shop wird nicht verändert. Danach ins Repo committen.
 *   PROBE=1 ONLY=<handle> node …/apply.mjs                        Trockenlauf der Probe (nur lesen)
 *   LIVE=1 PROBE=1 ONLY=<handle> node …/apply.mjs                 Probe an EINEM Produkt: Entwurf → zurück auf aktiv → Kanäle prüfen (bis 60 s warten, dann einzeln neu veröffentlichen) → wieder Entwurf
 *   LIVE=1 node dropship/silber-bazg-1711/apply.mjs               setzt alle Produkte der Liste auf ENTWURF (je 10, zurückgelesen, beim ersten Fehler Halt); verlangt eine bestandene Probe (Ledger, höchstens 24 h alt)
 *   ZURUECK=1 [LIVE=1] node …/apply.mjs                           Rücknahme (fortsetzbar): ENTWURF mit Arbeits-Tag → Status wie gesichert; danach Kanäle gegen die Sicherung prüfen und fehlende einzeln neu veröffentlichen
 * Schalter: ONLY=a,b · LISTE= · SICHERUNG= · LEDGER= · LISTE_MAX_H=6 · MAX_ANZAHL=260 · OHNE_PROBE=1 (hebt das Probe-Tor auf) · OHNE_TAG_OK=1 (Rücknahme auch für Entwürfe ohne Arbeits-Tag, die in der Sicherung stehen)
 * Exit 0 in Ordnung, 1 Fehler/Zugang, 2 Eingabe unplausibel (Liste leer/alt, Sicherung fehlt, Probe fehlt), 6 Rücklesen weicht ab oder Mutation meldet Fehler.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MARKER, hat925, trifft, LESEN, flach, entscheide, publikationsLuecken, schreibMutation, anweisungEntwurf, anweisungZurueck, mutationsFehler, PUBLIZIEREN, probeBestanden } from './lib.mjs';

const STAPEL = 10;

/** Alle Eingaben kommen über `o`, damit der Test eine Attrappe des Shops einspeisen kann. */
export async function lauf(o) {
  const log = o.log || ((z) => console.log(z));
  const pause = o.pause || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetzt = o.jetzt || (() => new Date());
  const ledger = (art, handle, text = '') => o.ledger?.(`${jetzt().toISOString()}|${art}|${handle}|${text}`);
  const q = o.q;
  const SCHREIBPAUSE = o.pauseMs ?? 1500, LESEPAUSE = o.lesePauseMs ?? 3000, LESEVERSUCHE = o.leseVersuche ?? 5, KANALPAUSE = o.kanalPauseMs ?? 5000, KANALVERSUCHE = o.kanalVersuche ?? 12;

  const lese = async (ids) => {
    const aus = new Map();
    for (let i = 0; i < ids.length; i += 50) {
      const j = await q(LESEN, { ids: ids.slice(i, i + 50) });
      for (const n of j.nodes || []) { const f = flach(n); if (f) aus.set(f.id, f); }
    }
    return aus;
  };
  /** Liest wiederholt, bis `ok(map)` stimmt oder die Versuche aufgebraucht sind (Shopify kann nach dem Schreiben nachhinken). */
  const warteBis = async (ids, ok, versuche, pauseMs) => {
    let m = null;
    for (let n = 1; n <= versuche; n++) {
      m = await lese(ids);
      if (ok(m)) return { m, ok: true, versuche: n };
      if (n < versuche) await pause(pauseMs);
    }
    return { m, ok: false, versuche };
  };
  const schreibe = async (anweisungen) => {
    const m = schreibMutation(anweisungen);
    return mutationsFehler(await q(m.query, m.variables));
  };
  const nurWahl = (arr) => (o.nur && o.nur.length ? arr.filter((e) => o.nur.includes(e.handle)) : arr);
  /** Fehlende Kanäle einzeln veröffentlichen (ein Kanal je Aufruf: eine Verweigerung blockiert die anderen nicht). Rückgabe: Fehlertexte. */
  const veroeffentliche = async (id, luecken) => {
    const fehler = [];
    for (const publicationId of luecken) {
      try {
        const j = await q(PUBLIZIEREN, { id, in: [{ publicationId }] });
        for (const e of j.publishablePublish?.userErrors || []) fehler.push(`${publicationId}: ${e.message}`);
      } catch (e) { fehler.push(`${publicationId}: ${e.message}`); }
    }
    return fehler;
  };

  // ================================================================ Rücknahme
  if (o.zurueck) {
    const sich = o.sicherung.lesen();
    if (!sich || !sich.length) { log('Keine Sicherung (sicherung.json fehlt oder ist leer): die Rücknahme ist ohne sie nicht möglich'); return 2; }
    const wahl = nurWahl(sich);
    if (!wahl.length) { log('ONLY trifft keinen Sicherungseintrag'); return 2; }
    const ist = await lese(wahl.map((e) => e.id));
    const arbeit = [];
    for (const e of wahl) {
      const i = ist.get(e.id);
      if (!i) { log('übersprungen (nicht lesbar): ' + e.handle); continue; }
      const tag = i.tags.includes(MARKER);
      if (i.status === 'DRAFT' && tag) arbeit.push({ e, i, art: 'zurueck' });
      else if (i.status === 'DRAFT' && o.ohneTagOk) arbeit.push({ e, i, art: 'zurueck' });
      else if (i.status === 'DRAFT') log(`übersprungen (Entwurf ohne Arbeits-Tag, nicht sicher von uns; mit OHNE_TAG_OK=1 trotzdem): ${e.handle}`);
      else if (i.status === 'ACTIVE' && tag) arbeit.push({ e, i, art: 'nurTagWeg' });
      else if (i.status === 'ACTIVE') arbeit.push({ e, i, art: 'reparatur' });
      else log(`übersprungen (Status ${i.status}): ${e.handle}`);
    }
    const z = (a) => arbeit.filter((x) => x.art === a).length;
    log(`Rücknahme: ${arbeit.length} von ${wahl.length} (zurück auf aktiv ${z('zurueck')}, nur Tag entfernen ${z('nurTagWeg')}, nur Kanäle prüfen ${z('reparatur')})`);
    if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }
    for (let k = 0; k < arbeit.length; k += STAPEL) {
      const paket = arbeit.slice(k, k + STAPEL);
      const schreib = paket.filter((x) => x.art !== 'reparatur');
      if (schreib.length) {
        let fehler = [];
        try { fehler = await schreibe(schreib.map((x) => ({ ...anweisungZurueck(x.e, x.i) }))); } catch (e) { fehler = [{ index: -1, text: 'Ausnahme: ' + e.message }]; }
        for (const f of fehler) { ledger('FEHLER-ZURUECK', schreib[f.index]?.e.handle ?? '-', f.text); }
        if (fehler.length) { log('Rücknahme: Mutation meldet Fehler, Halt: ' + fehler.map((f) => f.text).join(' | ')); return 6; }
        await pause(SCHREIBPAUSE);
      }
      const ids = paket.map((x) => x.e.id);
      // Phase 1: Status und Tag
      const p1 = await warteBis(ids, (m) => paket.every((x) => { const i = m.get(x.e.id); return i && i.status === x.e.status && !i.tags.includes(MARKER); }), LESEVERSUCHE, LESEPAUSE);
      // Phase 2: Kanäle gegen die Sicherung (erst warten, ob sie von selbst zurückkehren, dann einzeln veröffentlichen)
      const luecken = (m) => paket.filter((x) => publikationsLuecken(x.e.pubs, m.get(x.e.id)?.pubs).length);
      let p2 = await warteBis(ids, (m) => luecken(m).length === 0, KANALVERSUCHE, KANALPAUSE);
      if (!p2.ok) {
        for (const x of luecken(p2.m)) {
          const l = publikationsLuecken(x.e.pubs, p2.m.get(x.e.id)?.pubs);
          const f = await veroeffentliche(x.e.id, l);
          ledger('NEU-VEROEFFENTLICHT', x.e.handle, `${l.length} Kanäle${f.length ? ' FEHLER ' + f.join(';') : ''}`);
        }
        await pause(SCHREIBPAUSE);
        p2 = await warteBis(ids, (m) => luecken(m).length === 0, LESEVERSUCHE * 2, LESEPAUSE);
      }
      const ende = p2.m, erledigt = [];
      let abweichung = 0;
      for (const x of paket) {
        const i = ende.get(x.e.id);
        const l = publikationsLuecken(x.e.pubs, i?.pubs);
        const ok = !!i && i.status === x.e.status && !i.tags.includes(MARKER) && l.length === 0;
        ledger(ok ? 'ZURUECK' : 'ABWEICHUNG-ZURUECK', x.e.handle, i ? `${i.status} Tag ${i.tags.includes(MARKER)} Kanäle fehlen ${l.length}` : 'nicht lesbar');
        if (ok) erledigt.push(x.e.id); else { abweichung++; log(`ABWEICHUNG ${x.e.handle}: ${i?.status} Tag ${i?.tags.includes(MARKER)} Kanäle fehlen ${l.length}`); }
      }
      if (erledigt.length) o.sicherung.entfernen?.(erledigt);
      if (abweichung) { log('Rücknahme: Halt wegen Abweichung (der Lauf ist fortsetzbar: erneut starten, wenn die Ursache behoben ist)'); return 6; }
      void p1;
    }
    log(`Rücknahme geschrieben: ${arbeit.length}`);
    return 0;
  }

  // ================================================================ Liste prüfen
  const liste = o.liste;
  const eintraege = nurWahl(liste?.eintraege || []);
  if (!eintraege.length) { log('Liste leer (oder ONLY trifft nichts)'); return 2; }
  if (new Set(eintraege.map((e) => e.id)).size !== eintraege.length) { log('Liste enthält doppelte IDs'); return 2; }
  const falsch = eintraege.filter((e) => !(hat925(e.title) || e.regel));    // Einträge der erweiterten Regel tragen `regel` und `beleg` (liste.mjs)
  if (falsch.length) { log('Liste unplausibel: weder 925 im Titel noch eine Regel-Angabe: ' + falsch.slice(0, 3).map((e) => e.handle).join(', ')); return 2; }
  if (eintraege.length > (o.maxAnzahl ?? 260)) { log(`Liste hat ${eintraege.length} Einträge, mehr als die Obergrenze ${o.maxAnzahl ?? 260}`); return 2; }
  if ((o.live || o.sichern) && liste.erzeugt) {
    const alterH = (jetzt() - new Date(liste.erzeugt)) / 3600000;
    if (!(alterH >= 0 && alterH <= (o.listeMaxH ?? 6))) { log(`Liste ist ${alterH.toFixed(1)} Stunden alt (Grenze ${o.listeMaxH ?? 6}): erst liste.mjs neu laufen lassen`); return 2; }
  }

  const sichAlt = o.sicherung.lesen() || [];
  const sichIds = new Set(sichAlt.map((s) => s.id));
  const ist = await lese(eintraege.map((e) => e.id));
  const ausnahmen = o.ausnahmen || new Set();
  const plan = eintraege.map((e) => ({ e, i: ist.get(e.id), d: entscheide(ist.get(e.id), { inSicherung: sichIds.has(e.id), ausnahmen }) }));
  const tun = plan.filter((x) => x.d.tun);
  for (const x of plan.filter((y) => !y.d.tun)) log(`ÜBERSPRUNGEN ${x.e.handle}: ${x.d.grund}`);
  for (const x of tun.filter((y) => y.d.grund)) log(`HINWEIS ${x.e.handle}: ${x.d.grund}`);
  const jeArt = {}; for (const x of tun) jeArt[x.i.productType || '(leer)'] = (jeArt[x.i.productType || '(leer)'] || 0) + 1;
  log(`zu ändern: ${tun.length} von ${eintraege.length} (nach Produktart: ${Object.entries(jeArt).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  for (const x of tun.slice(0, 5)) log(`  ENTWURF ${x.e.handle} | ${x.i.title} | Kanäle ${x.i.pubs.length}`);
  const eintragVon = (x) => ({ id: x.i.id, handle: x.i.handle, title: x.i.title, status: x.i.status, tags: x.i.tags.filter((t) => t !== MARKER), pubs: x.i.pubs, pubsAlle: x.i.pubsAlle, am: jetzt().toISOString() });

  // ================================================================ Sicherung allein
  if (o.sichern) {
    const neu = tun.filter((x) => x.d.art === 'voll' && !sichIds.has(x.i.id)).map(eintragVon);
    o.sicherung.schreiben([...sichAlt, ...neu]);
    log(`Sicherung geschrieben: ${neu.length} neue Einträge (gesamt ${sichAlt.length + neu.length}). Der Shop wurde nicht verändert.`);
    return 0;
  }

  // ================================================================ Probe an einem Produkt
  if (o.probe) {
    if (eintraege.length !== 1) { log('Probe verlangt genau ein Produkt (ONLY=<handle>)'); return 2; }
    const x = plan[0];
    if (!x.d.tun || x.d.art !== 'voll') { log('Probe nicht möglich: ' + (x.d.grund || 'Produkt ist nicht aktiv')); return 2; }
    log(`Probe an ${x.e.handle}: Kanäle vorher ${x.i.pubs.length} (${x.i.pubs.join(', ')})`);
    if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }
    if (!sichIds.has(x.i.id)) o.sicherung.schreiben([...sichAlt, eintragVon(x)]);
    const id = x.i.id, soll = x.i.pubs;
    const luecke = (m) => publikationsLuecken(soll, m.get(id)?.pubs);
    let imEntwurf = null, zurueck = null, neu = false, selbst = false, sekunden = 0, fehlerProbe = null;
    try {
      let f = await schreibe([anweisungEntwurf(x.e, 'voll')]);
      if (f.length) throw new Error('Entwurf: ' + f.map((a) => a.text).join('|'));
      await pause(SCHREIBPAUSE);
      imEntwurf = (await warteBis([id], (m) => m.get(id)?.status === 'DRAFT', LESEVERSUCHE, LESEPAUSE)).m.get(id);
      f = await schreibe([{ id, status: 'ACTIVE' }]);
      if (f.length) throw new Error('Zurück auf aktiv: ' + f.map((a) => a.text).join('|'));
      await pause(SCHREIBPAUSE);
      const r2 = await warteBis([id], (m) => m.get(id)?.status === 'ACTIVE' && luecke(m).length === 0, KANALVERSUCHE, KANALPAUSE);
      zurueck = r2.m.get(id); selbst = r2.ok; sekunden = (r2.versuche - 1) * KANALPAUSE / 1000;
      if (!r2.ok) {
        const fp = await veroeffentliche(id, luecke(r2.m));
        neu = true;
        await pause(SCHREIBPAUSE);
        const r3 = await warteBis([id], (m) => m.get(id)?.status === 'ACTIVE' && luecke(m).length === 0, LESEVERSUCHE * 2, LESEPAUSE);
        zurueck = r3.m.get(id);
        if (fp.length) log('  Fehler beim Neu-Veröffentlichen: ' + fp.join(' | '));
      }
    } catch (e) { fehlerProbe = e; log('  Probe abgebrochen: ' + e.message); }
    // In jedem Fall zurück in den sicheren Zustand: ENTWURF mit Arbeits-Tag
    let endFehler = null;
    try { await schreibe([anweisungEntwurf(x.e, 'voll')]); } catch (e) { endFehler = e; }
    await pause(SCHREIBPAUSE);
    const ende = (await warteBis([id], (m) => m.get(id)?.status === 'DRAFT' && m.get(id).tags.includes(MARKER), LESEVERSUCHE, LESEPAUSE)).m.get(id);
    const fehlend = zurueck ? luecke(new Map([[id, zurueck]])).length : -1;
    log(`  im Entwurf: Status ${imEntwurf?.status}, Kanäle veröffentlicht ${imEntwurf?.pubs.length}, Einträge gesamt ${imEntwurf?.pubsAlle.length}`);
    log(`  zurück auf aktiv: Kanäle ${zurueck?.pubs.length}, fehlend gegenüber vorher ${fehlend}, von selbst zurück ${selbst} (nach ${sekunden} s), Neu-Veröffentlichen nötig ${neu}`);
    log(`  Endstatus ${ende?.status}, Arbeits-Tag ${!!ende?.tags.includes(MARKER)}`);
    ledger('PROBE', x.e.handle, `vorher ${soll.length} | im Entwurf ${imEntwurf?.pubs.length}/${imEntwurf?.pubsAlle.length} | zurück ${zurueck?.pubs.length} von selbst ${selbst} nach ${sekunden} s | Neu-Veröffentlichen nötig ${neu} | fehlend am Ende ${fehlend} | Endstatus ${ende?.status}${fehlerProbe || endFehler ? ' | FEHLER ' + (fehlerProbe || endFehler).message : ''}`);
    return !fehlerProbe && !endFehler && fehlend === 0 && ende?.status === 'DRAFT' && ende.tags.includes(MARKER) ? 0 : 6;
  }

  if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }

  // ================================================================ Tor: bestandene Probe
  if (o.probeGate) {
    const g = o.probeGate(jetzt());
    if (g !== true) { log('Massenlauf verlangt eine bestandene Probe (PROBE=1 LIVE=1 ONLY=<handle>): ' + g); return 2; }
  }

  // ================================================================ Sicherung VOR dem Schreiben
  const neuSich = tun.filter((x) => x.d.art === 'voll' && !sichIds.has(x.i.id)).map(eintragVon);
  o.sicherung.schreiben([...sichAlt, ...neuSich]);
  log(`Sicherung: ${neuSich.length} neue Einträge (gesamt ${sichAlt.length + neuSich.length})`);

  const verifiziert = (x, i) => !!i && i.tags.includes(MARKER) && (x.d.art === 'nurTag' || i.status === 'DRAFT');
  let fertig = 0;
  for (let k = 0; k < tun.length; k += STAPEL) {
    const paket = tun.slice(k, k + STAPEL);
    let fehler = [];
    try { fehler = await schreibe(paket.map((x) => anweisungEntwurf(x.e, x.d.art))); } catch (e) { fehler = [{ index: -1, alias: '-', text: 'Ausnahme: ' + e.message }]; }
    for (const f of fehler) ledger('FEHLER', paket[f.index]?.e.handle ?? '-', f.text);
    await pause(SCHREIBPAUSE);
    const r = await warteBis(paket.map((x) => x.e.id), (m) => paket.every((x) => verifiziert(x, m.get(x.e.id))), LESEVERSUCHE, LESEPAUSE);
    let abweichung = 0;
    for (const x of paket) {
      const i = r.m.get(x.e.id), ok = verifiziert(x, i);
      ledger(ok ? 'ENTWURF' : 'ABWEICHUNG', x.e.handle, i ? `${i.status} Tag ${i.tags.includes(MARKER)}` : 'nicht lesbar');
      if (ok) fertig++; else { abweichung++; log(`ABWEICHUNG ${x.e.handle}: ${i?.status} Tag ${i?.tags.includes(MARKER)}`); }
    }
    if (fehler.length) { log('Halt: Mutation meldet Fehler: ' + fehler.map((f) => f.text).join(' | ')); return 6; }
    if (abweichung) { log('Halt wegen Abweichung beim Zurücklesen (Lauf ist fortsetzbar)'); return 6; }
  }
  // Gegenprobe über alle auf einmal
  const alle = await lese(tun.map((x) => x.e.id));
  const offen = tun.filter((x) => !verifiziert(x, alle.get(x.e.id)));
  if (offen.length) { log(`Gegenprobe: ${offen.length} Produkte nicht im erwarteten Zustand: ${offen.slice(0, 5).map((x) => x.e.handle).join(', ')}`); return 6; }
  log(`Geschrieben und zurückgelesen: ${fertig} von ${tun.length}; Gegenprobe über alle bestanden`);
  return 0;
}

// ------------------------------------------------------------------ Aufruf von der Kommandozeile
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [{ shopifyGql }, { shopifyClientSecret }] = await Promise.all([import('../../automation/lib/shopify_gql.mjs'), import('../../automation/lib/shopify_secret.mjs')]);
  const HIER = dirname(fileURLToPath(import.meta.url));
  const LISTE = process.env.LISTE || join(HIER, 'liste.json'), SICH = process.env.SICHERUNG || join(HIER, 'sicherung.json'), LEDGER = process.env.LEDGER || join(HIER, 'ledger.txt');
  const ERLEDIGT = SICH.replace(/\.json$/, '') + '_erledigt.json';
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const zurueck = process.env.ZURUECK === '1';
  const AUSN = process.env.AUSNAHMEN || join(HIER, 'ausnahmen.json');
  const ausnahmen = new Set((existsSync(AUSN) ? JSON.parse(readFileSync(AUSN, 'utf8')).handles : []) || []);
  const liste = !zurueck ? (existsSync(LISTE) ? JSON.parse(readFileSync(LISTE, 'utf8')) : null) : null;
  if (!zurueck && !liste) { console.error('liste.json fehlt: erst liste.mjs laufen lassen'); process.exit(1); }
  /** Atomar schreiben: erst in eine Nebendatei, dann umbenennen (ein Abbruch mitten im Schreiben zerstört nie die alte Datei). */
  const atomar = (pfad, inhalt) => { writeFileSync(pfad + '.tmp', inhalt); renameSync(pfad + '.tmp', pfad); };
  const lies = (pfad) => (existsSync(pfad) ? JSON.parse(readFileSync(pfad, 'utf8')) : null);
  try {
    const code = await lauf({
      q: (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b),
      liste, ausnahmen, live: process.env.LIVE === '1', zurueck, probe: process.env.PROBE === '1', sichern: process.env.SICHERN === '1',
      ohneTagOk: process.env.OHNE_TAG_OK === '1',
      nur: (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean),
      listeMaxH: Number(process.env.LISTE_MAX_H || 6), maxAnzahl: Number(process.env.MAX_ANZAHL || 260),
      probeGate: process.env.OHNE_PROBE === '1' ? undefined : (jetzt) => probeBestanden(existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : [], jetzt),
      sicherung: {
        lesen: () => lies(SICH),
        schreiben: (a) => atomar(SICH, JSON.stringify(a, null, 1)),
        entfernen: (ids) => {
          const alle = lies(SICH) || [], weg = alle.filter((e) => ids.includes(e.id)), bleibt = alle.filter((e) => !ids.includes(e.id));
          atomar(ERLEDIGT, JSON.stringify([...(lies(ERLEDIGT) || []), ...weg], null, 1));
          atomar(SICH, JSON.stringify(bleibt, null, 1));
        },
      },
      ledger: (z) => appendFileSync(LEDGER, z + '\n'),
    });
    process.exit(code);
  } catch (e) { console.error('FEHLER:', e.message); process.exit(1); }
}
