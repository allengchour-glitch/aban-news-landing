#!/usr/bin/env node
/**
 * Grind-Entwürfe aufbereiten und freigeben (09.11.2026) — plangesteuert, TROCKENLAUF IST DIE VORGABE.
 *
 * WARUM: `grind2.mjs` legt Produkte als ENTWURF an und veröffentlicht nur Produkte, die es im selben Lauf selbst geplant hat. Entwürfe, die ein früherer Lauf angelegt hat
 * (Tag `text-offen`), blieben liegen. Dieses Werkzeug nimmt sie nach der Sichtung auf: kleine Korrekturen (Titel, Optionswerte, Bildreihenfolge, Text im Datenblatt-Kasten),
 * danach (nur mit FREIGEBEN=1) ACTIVE + Kanäle, mit denselben Schutzregeln wie `grind2.mjs`: Notbremse per Freigabedatei, Rücklesen, Seite HTTP 200, sonst zurück auf ENTWURF.
 *
 * Der Plan (JSON, `PLAN=`): { "freigeben": [{ handle, titel?, optionen?, medienNachVorn?, html? }], "halten": [{ handle, grund }] }
 *   freigeben  Aufbereiten (jeder Schritt einzeln, idempotent, mit Rücklesen) und, mit FREIGEBEN=1, veröffentlichen. Höchstens FREIGEBEN_MAX (5) je Lauf.
 *   halten     bleibt ENTWURF; das Tag `text-offen` wird durch `grind-gehalten-0911` ersetzt (der Grund steht im Plan und in der README).
 *   titel            neuer Titel; SEO-Titel und -Beschreibung folgen der Vorlage der übrigen Produkte
 *   optionen         { "<Optionsname>": { "<alter Wert>": "<neuer Wert>" } }   (SKUs, Preise und Varianten bleiben)
 *   medienNachVorn   Teil der Bildadresse; dieses Bild wird das Hauptbild
 *   html             [[alt, neu]]: genau ein Treffer in der Beschreibung, sonst Abbruch dieses Produkts
 *
 * Schalter:  (nichts) Trockenlauf · LIVE=1 schreibt die Aufbereitung · LIVE=1 FREIGEBEN=1 veröffentlicht zusätzlich (braucht die Freigabedatei dropship/GRIND2-FREI.txt, Datei löschen = Stopp)
 *            ZURUECK=1 LIVE=1  stellt Titel, SEO, Tags, Beschreibung, Optionswerte und Bildreihenfolge aus der Sicherung wieder her und setzt auf ENTWURF
 *            PLAN= · SICHERUNG= · LEDGER= · FREIGABE= · SHOP_DOMAIN= (Vorgaben unten)
 *
 * Tore vor dem Veröffentlichen (alle müssen bestehen, sonst bleibt das Produkt Entwurf): Status ENTWURF · Marken grind2 und cj-real · keine Sperr-Tags · Fliesstext (<!-- ls-text-v2 -->) UND
 * Datenblatt-Kasten (<!-- ls-fakten-v1 -->) · mindestens 3 Bilder, alle READY, Hauptbild mindestens 700 px · jede Variante mit SKU (eindeutig) und Preis ab CHF 14.90 · Google-Kategorie im Metafeld ·
 * Kanalliste aus den neuesten aktiven CJ-Produkten ableitbar · Tag `text-offen` weg.
 *
 * Exit: 0 ok · 2 Plan unbrauchbar · 3 ein Tor blockiert (nichts davon veröffentlicht) · 4 Schreibfehler/Abweichung beim Rücklesen · 5 Freigabedatei fehlt · 6 Rücknahme fehlgeschlagen
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sperrTags } from './lib/kanal_sperren.mjs';
import { kanaeleAusReferenz } from './grind2.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
export const MIN_PREIS = 14.9, MIN_BILDER = 3, MIN_PX = 700, FREIGEBEN_MAX = 5;
export const MARKER_TEXT = '<!-- ls-text-v2 -->', MARKER_FAKTEN = '<!-- ls-fakten-v1 -->';
export const TAG_OFFEN = 'text-offen', TAG_GEHALTEN = 'grind-gehalten-0911';
export const EXIT = Object.freeze({ OK: 0, PLAN: 2, TOR: 3, SCHREIBEN: 4, FREIGABE: 5, ZURUECK: 6 });

// ── GraphQL ────────────────────────────────────────────────────────────────
const LESEN = `query($q:String!){ products(first:2, query:$q){ nodes{ id handle title status tags descriptionHtml seo{ title description }
  options{ id name optionValues{ id name } }
  media(first:40){ nodes{ id status ... on MediaImage{ image{ url width height } } } }
  variants(first:100){ nodes{ id sku price } }
  gpc: metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value }
  resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished publication{ id } } } } } }`;
const KANAL_REFERENZ = `query{ products(first:8, query:"status:active tag:cj-real", sortKey:CREATED_AT, reverse:true){ nodes{ id resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished publication{ id } } } } } }`;
const PRODUKT_SETZEN = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
const OPTION_SETZEN = `mutation($pid:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){ productOptionUpdate(productId:$pid, option:$o, optionValuesToUpdate:$v){ product{ id } userErrors{ field message code } } }`;
const MEDIEN_ORDNEN = `mutation($id:ID!,$m:[MoveInput!]!){ productReorderMedia(id:$id, moves:$m){ job{ id done } mediaUserErrors{ field message } } }`;
const VEROEFFENTLICHEN = `mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id, input:$p){ userErrors{ field message } } }`;

// ── reine Bausteine (getestet in grind_freigabe_test.mjs) ──────────────────
const sortiert = l => [...(l || [])].map(String).sort();
const gleich = (a, b) => JSON.stringify(sortiert(a)) === JSON.stringify(sortiert(b));
const bilder = p => (p.media?.nodes || []).filter(m => m.image);
export const ohneOffen = tags => (tags || []).filter(t => t !== TAG_OFFEN);
export const mitGehalten = tags => [...new Set([...ohneOffen(tags), TAG_GEHALTEN])];

/** SEO-Titel und -Beschreibung nach der Vorlage der übrigen CJ-Produkte (Titel + «| LuxeStyle CH», höchstens 60 Zeichen; Beschreibung höchstens 160). */
export function seoFuer(titel) {
  const t = String(titel).trim();
  const mit = `${t} | LuxeStyle CH`;
  const seoTitel = mit.length <= 60 ? mit : t.length <= 60 ? t : `${t.slice(0, 49).trimEnd()}…`;
  const b = `${t} bei LuxeStyle – Schweizer Online-Shop. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt –10% mit Code WELCOME10.`;
  return { title: seoTitel, description: b.length <= 160 ? b : `${b.slice(0, 159).trimEnd()}…` };
}

/** Wendet [[alt, neu]] auf die Beschreibung an. Jeder Treffer muss genau einmal vorkommen; ist `neu` schon da und `alt` weg, gilt der Schritt als erledigt. */
export function htmlErsetzen(html, paare) {
  let h = String(html);
  for (const [alt, neu] of paare || []) {
    const n = h.split(alt).length - 1;
    if (n === 1) { h = h.replace(alt, () => neu); continue; }
    if (n === 0 && h.includes(neu)) continue;
    throw new Error(`html: «${String(alt).slice(0, 40)}» kommt ${n}× vor (erwartet 1×)`);
  }
  return h;
}

/** Die Tore. `vorab` = vor dem ersten Schreiben prüfbar. Rein. */
export function tore(p, { kanaele = null, minPreis = MIN_PREIS } = {}) {
  const t = p.tags || [], bs = bilder(p), vs = p.variants?.nodes || [], html = String(p.descriptionHtml || '');
  const skus = vs.map(v => String(v.sku || '').trim());
  const erstes = bs[0]?.image;
  return [
    { name: 'Status ENTWURF', vorab: true, ok: p.status === 'DRAFT', detail: p.status },
    { name: 'Marken grind2 und cj-real', vorab: true, ok: t.includes('grind2') && t.includes('cj-real') },
    { name: 'keine Sperr-Tags', vorab: true, ok: sperrTags(t).length === 0, detail: sperrTags(t).join(', ') },
    { name: 'Fliesstext und Datenblatt-Kasten', vorab: true, ok: html.includes(MARKER_TEXT) && html.includes(MARKER_FAKTEN) },
    { name: `mindestens ${MIN_BILDER} Bilder, alle READY`, ok: bs.length >= MIN_BILDER && (p.media?.nodes || []).every(m => m.status === 'READY'), detail: `${bs.length} Bilder` },
    { name: `Hauptbild mindestens ${MIN_PX} px`, ok: !!erstes && Math.min(erstes.width || 0, erstes.height || 0) >= MIN_PX, detail: erstes ? `${erstes.width}×${erstes.height}` : 'kein Bild' },
    { name: 'jede Variante mit eindeutiger SKU', ok: vs.length > 0 && skus.every(Boolean) && new Set(skus).size === skus.length },
    { name: `jeder Preis ab CHF ${minPreis.toFixed(2)}`, ok: vs.length > 0 && vs.every(v => Number(v.price) >= minPreis - 1e-9) },
    { name: 'Google-Kategorie im Metafeld', ok: !!String(p.gpc?.value || '').trim() },
    { name: 'Kanalliste ableitbar', ok: Array.isArray(kanaele) && kanaele.length >= 3, detail: Array.isArray(kanaele) ? `${kanaele.length} Kanäle` : 'keine' },
    { name: `Tag ${TAG_OFFEN} weg`, ok: !t.includes(TAG_OFFEN) },
  ];
}

export function planPruefen(plan) {
  const fehler = [];
  if (!plan || typeof plan !== 'object') return ['Plan fehlt'];
  const f = plan.freigeben || [], h = plan.halten || [];
  if (!Array.isArray(f) || !Array.isArray(h)) return ['«freigeben» und «halten» müssen Listen sein'];
  const alle = [...f, ...h].map(e => e?.handle);
  if (alle.some(x => !x || typeof x !== 'string')) fehler.push('jeder Eintrag braucht einen handle');
  if (new Set(alle).size !== alle.length) fehler.push('ein handle steht doppelt im Plan');
  for (const e of h) if (!String(e.grund || '').trim()) fehler.push(`${e.handle}: «halten» braucht einen Grund`);
  for (const e of f) for (const k of Object.keys(e)) if (!['handle', 'titel', 'optionen', 'medienNachVorn', 'html'].includes(k)) fehler.push(`${e.handle}: unbekanntes Feld «${k}»`);
  return fehler;
}

// ── der Lauf ───────────────────────────────────────────────────────────────
/**
 * @param cfg { plan, live, freigeben, zurueck, sicherung (Pfad), ledger (Pfad), freigabeDatei (Pfad), shopDomain, max }
 * @param io  { gql(query, vars) → data, fetchFn, log, warte(ms), jetzt() → ms }
 */
export async function lauf(cfg, io) {
  const { gql, fetchFn, log, warte, jetzt } = io;
  const zaehl = {};
  const z = k => { zaehl[k] = (zaehl[k] || 0) + 1; };
  const max = cfg.max ?? FREIGEBEN_MAX;
  const frei = () => !!cfg.freigabeDatei && existsSync(cfg.freigabeDatei);
  const ledger = (handle, art, detail) => { if (cfg.live && cfg.ledger) appendFileSync(cfg.ledger, `${handle} · ${new Date(jetzt()).toISOString()} · ${art} · ${detail}\n`); };
  const lies = async handle => {
    const n = ((await gql(LESEN, { q: `handle:${handle}` }))?.products?.nodes || []).filter(p => p.handle === handle);
    if (n.length !== 1) throw new Error(`Produkt nicht eindeutig: ${handle} (${n.length})`);
    return n[0];
  };
  const schreibeProdukt = async (id, felder) => {
    const r = (await gql(PRODUKT_SETZEN, { p: { id, ...felder } }))?.productUpdate;
    if (!r || r.userErrors?.length) throw new Error(`productUpdate: ${JSON.stringify(r?.userErrors ?? 'leere Antwort').slice(0, 200)}`);
  };
  const sicherungLesen = () => (existsSync(cfg.sicherung) ? JSON.parse(readFileSync(cfg.sicherung, 'utf8')) : {});
  const sicherungMerken = p => {
    if (!cfg.live || !cfg.sicherung) return;
    const s = sicherungLesen();
    if (s[p.handle]) return;                                       // der erste Stand gilt
    s[p.handle] = { id: p.id, status: p.status, title: p.title, tags: p.tags, seo: p.seo, descriptionHtml: p.descriptionHtml,
      options: (p.options || []).map(o => ({ id: o.id, name: o.name, werte: (o.optionValues || []).map(v => ({ id: v.id, name: v.name })) })),
      mediaIds: (p.media?.nodes || []).map(m => m.id), gesichert: new Date(jetzt()).toISOString() };
    mkdirSync(dirname(cfg.sicherung), { recursive: true });
    writeFileSync(cfg.sicherung, JSON.stringify(s, null, 1));
  };
  const aufDraft = async (p, grund) => {
    let ok = false;
    for (let i = 0; i < 2 && !ok; i++) {
      try { await schreibeProdukt(p.id, { status: 'DRAFT' }); ok = (await lies(p.handle)).status === 'DRAFT'; } catch (x) { log(`  Rücknahme ${p.handle}: ${String(x.message).slice(0, 100)}`); }
    }
    ledger(p.handle, ok ? 'ZURUECK' : 'ZURUECK_FEHLGESCHLAGEN', grund);
    return ok;
  };

  // ── Rücknahme aus der Sicherung ──
  if (cfg.zurueck) {
    const s = sicherungLesen();
    let fehler = 0;
    for (const [handle, b] of Object.entries(s)) {
      try {
        const p = await lies(handle);
        log(`${cfg.live ? 'ZURÜCK' : 'würde zurücksetzen'}: ${handle}`);
        if (!cfg.live) continue;
        await schreibeProdukt(p.id, { title: b.title, tags: b.tags, seo: b.seo, descriptionHtml: b.descriptionHtml, status: 'DRAFT' });
        for (const o of b.options || []) {
          const jetztO = (p.options || []).find(x => x.id === o.id);
          const umbenennen = (o.werte || []).filter(w => jetztO?.optionValues?.some(v => v.id === w.id && v.name !== w.name)).map(w => ({ id: w.id, name: w.name }));
          if (umbenennen.length) await gql(OPTION_SETZEN, { pid: p.id, o: { id: o.id }, v: umbenennen });
        }
        const erstesAlt = (b.mediaIds || [])[0];
        if (erstesAlt && (p.media?.nodes || [])[0]?.id !== erstesAlt) await gql(MEDIEN_ORDNEN, { id: p.id, m: [{ id: erstesAlt, newPosition: '0' }] });
        const nach = await lies(handle);
        const ok = nach.status === 'DRAFT' && nach.title === b.title && gleich(nach.tags, b.tags) && nach.descriptionHtml === b.descriptionHtml;
        log(`  rücklesen ${ok ? 'GLEICH' : 'ABWEICHUNG'}`);
        if (!ok) fehler++; else z('ZURUECK');
      } catch (x) { fehler++; log(`  FEHLER ${handle}: ${String(x.message).slice(0, 120)}`); }
    }
    return { exit: fehler ? EXIT.ZURUECK : EXIT.OK, zaehl };
  }

  const probleme = planPruefen(cfg.plan);
  if (probleme.length) { probleme.forEach(x => log(`PLAN: ${x}`)); return { exit: EXIT.PLAN, zaehl }; }
  if (cfg.freigeben && !cfg.live) { log('FREIGEBEN=1 braucht LIVE=1'); return { exit: EXIT.PLAN, zaehl }; }
  if (cfg.freigeben && !frei()) { log(`Freigabedatei fehlt (${cfg.freigabeDatei}): nichts veröffentlicht`); return { exit: EXIT.FREIGABE, zaehl }; }

  const refs = ((await gql(KANAL_REFERENZ, {}))?.products?.nodes || []).map(p => ({ pubs: (p.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => n.publication.id) }));
  const kanaele = kanaeleAusReferenz(refs);                       // nur lesen; die Tore verlangen eine ableitbare Kanalliste, auch wenn nur aufbereitet wird
  let exit = EXIT.OK, veroeffentlicht = 0;
  const merke = c => { if (c > exit) exit = c; };

  // ── halten ──
  for (const e of cfg.plan.halten || []) {
    try {
      const p = await lies(e.handle);
      if (p.status !== 'DRAFT') { log(`HALTEN ${e.handle}: Status ${p.status}, nicht angefasst`); z('HALTEN_NICHT_DRAFT'); merke(EXIT.TOR); continue; }
      const neu = mitGehalten(p.tags);
      log(`${cfg.live ? 'HALTEN' : 'würde halten'} ${e.handle}: ${e.grund}`);
      if (cfg.live && !gleich(neu, p.tags)) {
        sicherungMerken(p);
        await schreibeProdukt(p.id, { tags: neu });
        if (!gleich((await lies(e.handle)).tags, neu)) { log('  ABWEICHUNG beim Rücklesen (Tags)'); merke(EXIT.SCHREIBEN); continue; }
      }
      z(cfg.live ? 'GEHALTEN' : 'WUERDE_HALTEN');
    } catch (x) { log(`HALTEN ${e.handle}: FEHLER ${String(x.message).slice(0, 120)}`); merke(EXIT.SCHREIBEN); }
  }

  // ── freigeben ──
  for (const e of cfg.plan.freigeben || []) {
    let p;
    try {
      p = await lies(e.handle);
      const vorab = tore(p, { kanaele }).filter(t => t.vorab);
      const rot = vorab.filter(t => t.ok !== true);
      if (rot.length) { log(`BLOCKIERT ${e.handle}: ${rot.map(t => t.name + (t.detail ? ` (${t.detail})` : '')).join(' · ')}`); z('BLOCKIERT'); merke(EXIT.TOR); continue; }

      // Aufbereiten: was zu tun ist, jeweils nur wenn es noch fehlt
      const schritte = [];
      const seoNeu = e.titel ? seoFuer(e.titel) : null;
      const htmlNeu = e.html?.length ? htmlErsetzen(p.descriptionHtml, e.html) : p.descriptionHtml;
      const tagsNeu = ohneOffen(p.tags);
      const felder = {};
      if (e.titel && p.title !== e.titel) felder.title = e.titel;
      if (seoNeu && (p.seo?.title !== seoNeu.title || p.seo?.description !== seoNeu.description)) felder.seo = seoNeu;
      if (htmlNeu !== p.descriptionHtml) felder.descriptionHtml = htmlNeu;
      if (!gleich(tagsNeu, p.tags)) felder.tags = tagsNeu;
      if (Object.keys(felder).length) schritte.push(`Felder ${Object.keys(felder).join(', ')}`);
      const optionen = [];
      for (const [name, werte] of Object.entries(e.optionen || {})) {
        const o = (p.options || []).find(x => x.name === name);
        if (!o) throw new Error(`Option «${name}» fehlt`);
        const upd = [];
        for (const [alt, neu] of Object.entries(werte)) {
          const v = o.optionValues.find(x => x.name === alt);
          if (v) upd.push({ id: v.id, name: neu });
          else if (!o.optionValues.some(x => x.name === neu)) throw new Error(`Optionswert «${alt}» fehlt`);
        }
        if (upd.length) optionen.push({ o, upd });
      }
      if (optionen.length) schritte.push(`Optionen ${optionen.map(x => x.o.name).join(', ')}`);
      let medienZug = null;
      if (e.medienNachVorn) {
        const idx = bilder(p).findIndex(m => String(m.image.url).includes(e.medienNachVorn));
        if (idx < 0) throw new Error(`Bild «${e.medienNachVorn}» nicht gefunden`);
        if (idx > 0) { medienZug = bilder(p)[idx].id; schritte.push('Hauptbild tauschen'); }
      }
      log(`${cfg.live ? 'AUFBEREITEN' : 'würde aufbereiten'} ${e.handle}: ${schritte.join(' · ') || 'nichts zu tun'}`);

      if (cfg.live && schritte.length) {
        sicherungMerken(p);
        if (Object.keys(felder).length) await schreibeProdukt(p.id, felder);
        for (const { o, upd } of optionen) {
          const r = (await gql(OPTION_SETZEN, { pid: p.id, o: { id: o.id }, v: upd }))?.productOptionUpdate;
          if (!r || r.userErrors?.length) throw new Error(`productOptionUpdate: ${JSON.stringify(r?.userErrors ?? 'leere Antwort').slice(0, 160)}`);
        }
        if (medienZug) {
          const r = (await gql(MEDIEN_ORDNEN, { id: p.id, m: [{ id: medienZug, newPosition: '0' }] }))?.productReorderMedia;
          if (!r || r.mediaUserErrors?.length) throw new Error(`productReorderMedia: ${JSON.stringify(r?.mediaUserErrors ?? 'leere Antwort').slice(0, 160)}`);
          for (let i = 0; i < 6; i++) { if ((await lies(e.handle)).media.nodes[0]?.id === medienZug) break; await warte(1500); }
        }
        p = await lies(e.handle);
        const abw = [];
        if (e.titel && p.title !== e.titel) abw.push('Titel');
        if (seoNeu && (p.seo?.title !== seoNeu.title || p.seo?.description !== seoNeu.description)) abw.push('SEO');
        if (p.descriptionHtml !== htmlNeu) abw.push('Beschreibung');
        if (p.tags.includes(TAG_OFFEN)) abw.push('Tag');
        for (const { o, upd } of optionen) { const nach = p.options.find(x => x.id === o.id); for (const u of upd) if (!nach?.optionValues.some(v => v.id === u.id && v.name === u.name)) abw.push(`Option ${o.name}`); }
        if (medienZug && p.media.nodes[0]?.id !== medienZug) abw.push('Hauptbild');
        if (abw.length) { log(`  ABWEICHUNG beim Rücklesen: ${[...new Set(abw)].join(', ')}`); merke(EXIT.SCHREIBEN); continue; }
        z('AUFBEREITET');
      } else if (!cfg.live) { z('WUERDE_AUFBEREITEN'); }

      // Tore nach der Aufbereitung (im Trockenlauf auf dem simulierten Stand)
      const stand = cfg.live ? p : { ...p, tags: tagsNeu, descriptionHtml: htmlNeu, title: felder.title || p.title };
      if (!cfg.live && medienZug) { const n = [...(p.media.nodes)]; const i = n.findIndex(m => m.id === medienZug); stand.media = { nodes: [n[i], ...n.filter((_, k) => k !== i)] }; }
      const alle = tore(stand, { kanaele });
      const rot2 = alle.filter(t => t.ok !== true);
      if (rot2.length) { log(`BLOCKIERT ${e.handle}: ${rot2.map(t => t.name + (t.detail ? ` (${t.detail})` : '')).join(' · ')}`); z('BLOCKIERT'); merke(EXIT.TOR); continue; }
      log(`  Tore: ${alle.length} von ${alle.length} bestanden`);
      if (!cfg.freigeben) { z('BEREIT'); continue; }
      if (veroeffentlicht >= max) { log(`  zurückgestellt: höchstens ${max} je Lauf`); z('ZURUECKGESTELLT'); continue; }

      // Veröffentlichen: ACTIVE, Kanäle, Rücklesen, Seite — jeder Fehler danach nimmt das Produkt zurück
      const dup = (await gql(`query($q:String!){ products(first:3, query:$q){ nodes{ id handle status } } }`, { q: `sku:"${String(p.variants.nodes[0].sku).replace(/"/g, '')}"` }))?.products?.nodes || [];
      const fremd = dup.filter(x => x.id !== p.id);
      if (fremd.length) { log(`  BLOCKIERT: SKU gehört auch ${fremd[0].handle} (${fremd[0].status})`); z('BLOCKIERT'); merke(EXIT.TOR); continue; }
      if (!frei()) { log('  Freigabedatei verschwunden: Stopp vor dem Aktivieren'); merke(EXIT.FREIGABE); break; }   // unmittelbar vor dem Aktivieren, nicht davor
      let grund = null;
      try {
        await schreibeProdukt(p.id, { status: 'ACTIVE' });
        const pv = (await gql(VEROEFFENTLICHEN, { id: p.id, p: kanaele.map(id => ({ publicationId: id })) }))?.publishablePublish;
        if (!pv || pv.userErrors?.length) throw new Error(`publishablePublish: ${JSON.stringify(pv?.userErrors ?? 'leere Antwort').slice(0, 160)}`);
        if (!frei()) throw new Error('Freigabedatei verschwunden');
        const nach = await lies(e.handle);
        const pubs = (nach.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => n.publication.id);
        if (nach.status !== 'ACTIVE') throw new Error(`Status ${nach.status}`);
        const fehlt = kanaele.filter(id => !pubs.includes(id));
        if (fehlt.length) throw new Error(`${fehlt.length} Kanäle nicht veröffentlicht`);
        let status = 0;
        for (let i = 0; i < 3 && status !== 200; i++) {
          try { const r = await fetchFn(`https://${cfg.shopDomain}/products/${e.handle}?cb=${jetzt()}`, { method: 'GET', redirect: 'follow' }); status = r.status; try { await r.body?.cancel?.(); } catch { /* egal */ } } catch { status = 0; }
          if (status !== 200) await warte(5000);
        }
        if (status !== 200) throw new Error(`Produktseite HTTP ${status}`);
      } catch (x) { grund = String(x.message).slice(0, 140); }
      if (grund) {
        const ok = await aufDraft(p, `Freigabe gescheitert: ${grund}`);
        log(`  ZURÜCKGENOMMEN ${e.handle}: ${grund}${ok ? '' : ' — RÜCKNAHME FEHLGESCHLAGEN, Produkt kann LIVE sein'}`);
        z(ok ? 'ZURUECKGENOMMEN' : 'ZURUECK_FEHLGESCHLAGEN'); merke(ok ? EXIT.SCHREIBEN : EXIT.ZURUECK);
        if (!ok) break;
        continue;
      }
      ledger(e.handle, 'FREI', `veröffentlicht in ${kanaele.length} Kanälen, Seite HTTP 200 (Handfreigabe 09.11.)`);
      log(`  VERÖFFENTLICHT ${e.handle}: ${kanaele.length} Kanäle, Seite HTTP 200`);
      z('VEROEFFENTLICHT'); veroeffentlicht++;
    } catch (x) { log(`${e.handle}: FEHLER ${String(x.message).slice(0, 140)}`); merke(EXIT.SCHREIBEN); z('FEHLER'); }
  }
  return { exit, zaehl };
}

// ── Kommandozeile ──────────────────────────────────────────────────────────
async function main() {
  const { shopifyGql } = await import('./lib/shopify_gql.mjs');
  const { shopifyClientSecret } = await import('./lib/shopify_secret.mjs');
  const env = process.env;
  const pfad = (v, vorgabe) => resolve(HIER, '..', v || vorgabe);
  const cfg = {
    plan: JSON.parse(readFileSync(pfad(env.PLAN, 'dropship/grind-freigabe-0911/plan.json'), 'utf8')),
    live: env.LIVE === '1', freigeben: env.FREIGEBEN === '1', zurueck: env.ZURUECK === '1',
    sicherung: pfad(env.SICHERUNG, 'dropship/grind-freigabe-0911/sicherung.json'),
    ledger: pfad(env.LEDGER, 'dropship/grind2_freigabe_ledger.txt'),
    freigabeDatei: pfad(env.FREIGABE, 'dropship/GRIND2-FREI.txt'),
    shopDomain: env.SHOP_DOMAIN || 'luxestyle.ch',
    max: env.FREIGEBEN_MAX ? Math.max(0, Math.min(20, parseInt(env.FREIGEBEN_MAX, 10) || 0)) : FREIGEBEN_MAX,
  };
  const SHOP = env.SHOPIFY_SHOP, CS = shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const io = { gql: (q, v) => shopifyGql(SHOP, '2025-01', tok, q, v), fetchFn: globalThis.fetch, log: console.log, warte: ms => new Promise(s => setTimeout(s, ms)), jetzt: () => Date.now() };
  const { exit, zaehl } = await lauf(cfg, io);
  console.log(`\nZusammenfassung: ${JSON.stringify(zaehl)} (${cfg.zurueck ? 'Rücknahme' : cfg.freigeben ? 'freigeben' : cfg.live ? 'aufbereiten' : 'Trockenlauf'}) · Exit ${exit}`);
  process.exit(exit);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
