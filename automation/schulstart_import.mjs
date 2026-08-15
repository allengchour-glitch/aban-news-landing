#!/usr/bin/env node
/* schulstart_import.mjs — holt die restlichen Schulstart-Gewinner aus dem CJ-Artikel
 * (Auftrag des Betreibers 15.08.2026: Lunchtasche, Laptop-Hülle mit Ständer, Tech-Organizer;
 * die zwei Schulrucksäcke sind schon live und führen die Trend-Reihe an).
 *
 * ⚠️ WARUM EIN EIGENES SKRIPT: Das CJ-Punktebudget (100k/Tag, Reset 16:00 UTC) war an zwei
 * Anläufen erschöpft, bevor die Suche fertig war — die vier Grind-Runner fressen es binnen
 * Stunden. Dieses Skript probiert bei jedem Aufseher-Durchlauf kurz, ob Punkte da sind
 * (eine billige Anfrage), und zieht dann SOFORT durch: erst alle Kandidaten suchen, dann
 * `cj_sku_import` mit festen pids starten. Nach Erfolg schreibt es FERTIG ins Log und wird
 * nie wieder gestartet.
 *
 * ⚠️ CJs TEXTSUCHE RANKT NACH AKTUALITÄT, NICHT RELEVANZ («insulated lunch bag» liefert
 * Sommerkleider). Deshalb: Kategorie-Listing wo möglich, Namensfilter IMMER, und lieber
 * 0 Importe als ein Fehltreffer — der cat_tags-Mapper und die Wachen im SKU-Importer
 * (Marken, Medizin, Dubletten, Bild-Quittung) laufen ohnehin nochmal drüber.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CJT = (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cj(path) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      let j; try { j = JSON.parse(t); } catch { await sleep(2000); continue; }
      if (Number(j.code) === 1600200) { await sleep(2500 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2000 * (i + 1)); }
  }
  return { code: 0 };
}

async function suche(q, muss, seiten = 4, categoryId = '') {
  const tref = [];
  for (let s = 1; s <= seiten; s++) {
    const u = categoryId
      ? `/product/list?pageNum=${s}&pageSize=50&categoryId=${categoryId}`
      : `/product/list?pageNum=${s}&pageSize=50&productNameEn=${encodeURIComponent(q)}`;
    const j = await cj(u);
    if (Number(j.code) === 16900500) return null;          // Punkte weg → nächster Versuch morgen
    for (const p of (j.data || {}).list || [])
      if (muss.test(p.productNameEn || '') && parseFloat(String(p.sellPrice).split('-')[0]) >= 3)
        tref.push(p);
    await sleep(2200);
    if (tref.length >= 5) break;
  }
  // Die mit den meisten Listings zuerst — das ist CJs eigenes Beliebtheitssignal.
  tref.sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));
  return tref;
}

async function main() {
  const probe = await cj('/product/list?pageNum=1&pageSize=1&productNameEn=bag');
  if (Number(probe.code) === 16900500) { console.log('PAUSE (CJ-Punkte leer, nächster Versuch beim nächsten Durchlauf)'); return; }
  if (Number(probe.code) !== 200) { console.log('CJ nicht erreichbar:', probe.code); return; }

  const ziele = [
    ['lunch bag', /lunch/i, ''],
    ['laptop sleeve', /laptop.*(sleeve|case|bag)|sleeve.*(laptop|stand)/i,
     '74B144C9-321D-4E78-986C-757BA551DD8C'],
    ['cable organizer', /(cable|digital|electronic|gadget).*(organiz|storage|bag|case)|organiz.*(cable|digital|electronic)/i,
     'AD2B299F-EC10-4209-998A-8916AE4D4900'],
  ];
  const pids = [];
  for (const [q, muss, cat] of ziele) {
    let tref = cat ? await suche(q, muss, 4, cat) : null;
    if (tref === null) { console.log('PAUSE (Punkte leer mitten in der Suche)'); return; }
    if (!tref || !tref.length) tref = await suche(q, muss, 6);
    if (tref === null) { console.log('PAUSE (Punkte leer mitten in der Suche)'); return; }
    if (tref.length) {
      console.log(`  ${q}: ${tref[0].pid} | ${String(tref[0].productNameEn).slice(0, 55)} | $${tref[0].sellPrice}`);
      pids.push(tref[0].pid);
    } else {
      console.log(`  ${q}: kein sauberer Treffer — lieber keiner als ein falscher`);
    }
  }
  if (!pids.length) { console.log('FERTIG: nichts Importierbares gefunden.'); return; }

  const r = spawnSync('/opt/node22/bin/node', ['automation/cj_sku_import.mjs'], {
    encoding: 'utf8', timeout: 1800000,
    env: { ...process.env, CJ_TOKEN: CJT, ITEMS: pids.map(p => 'pid:' + p).join(',') },
  });
  console.log((r.stdout || '').slice(-1500));
  console.log('FERTIG: Schulstart-Import abgeschlossen —', pids.length, 'Kandidaten übergeben.');
}

main();
