// startseite_bildlast.mjs — Wächter «Bildlast beim Öffnen» (Plan-Tag 11, 08.10.2026, Betreiber «mehr verbesserung»).
// Misst eine Seite in 390 px / DPR 2 OHNE zu scrollen: wie viele <img> geladen wurden und wie viele KB, je Sektion.
// Anlass: 08.10. lud die Startseite beim Öffnen 171 Bilder / 10'759 KB, obwohl der erste Bildschirm 2 zeigt —
// Horizon product-card.js nahm jedem Karussell-Zweitbild das lazy weg, resource-image setzte Cover immer eager.
// Nach mobil_tempo_patch_2.py: 38 Bilder / 1'008 KB. Jede neue Reihe, App oder Theme-Aktualisierung, die wieder
// Bilder unter dem Bildschirm sofort lädt, fällt hier auf (Grenze GRENZE_KB, GRENZE_N).
// Aufruf: /opt/node22/bin/node automation/startseite_bildlast.mjs [url]  → eine Zeile «BILDLAST: …», Ledger dropship/_startseite_bildlast.tsv
// ⚠️ Unsere IP kann eine ältere Cache-Kopie bekommen (CLAUDE.md 19.08.) — ein Ausreisser wird mit WebFetch/Admin-API gegengeprüft.
import fs from 'fs';
import { starte } from '/home/user/aban-news-landing/tools/browser.mjs';
const URL = process.argv[2] || 'https://luxestyle.ch/';
const GRENZE_KB = 3000, GRENZE_N = 60;
const LEDGER = new globalThis.URL('../dropship/_startseite_bildlast.tsv', import.meta.url);
const browser = await starte();
let zeile;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  // 08.10.: Dieselbe Kollektionsseite kam zweimal mit 0 <img> zurück, beim dritten Mal mit 81 → bis 3 Versuche, sonst «unklar».
  let r = { alle: 0 };
  for (let versuch = 1; versuch <= 3 && !r.alle; versuch++) {
  await p.goto(URL, { waitUntil: 'load', timeout: 120000 });  // kein Cache-Brecher: ?x= umgeht den Edge-Cache nicht
  await p.waitForTimeout(4000);
  r = await p.evaluate(() => {
    const res = {}; for (const e of performance.getEntriesByType('resource')) res[e.name] = e.transferSize || 0;
    const sek = {}; let n = 0, kb = 0, alle = 0;
    for (const im of document.images) {
      const cur = im.currentSrc || im.src; if (!cur) continue; alle++;
      if (!(cur in res)) continue;
      const s = (im.closest('.shopify-section')?.id || '').replace(/^shopify-section-(template|sections)--\d+__/, '') || '(ohne)';
      const k = Math.round(res[cur] / 1024); n++; kb += k;
      sek[s] = sek[s] || { n: 0, kb: 0 }; sek[s].n++; sek[s].kb += k;
    }
    return { n, kb, alle, sek };
  });
  }
  if (!r.alle) throw new Error('0 Bilder im DOM — Seite nicht vollständig geladen');
  const top = Object.entries(r.sek).sort((a, b) => b[1].kb - a[1].kb).slice(0, 3).map(([s, v]) => `${s} ${v.n}/${v.kb}KB`).join(', ');
  const warn = r.kb > GRENZE_KB || r.n > GRENZE_N;
  zeile = `BILDLAST: ${warn ? '⚠️ ' : ''}${r.n} von ${r.alle} Bildern / ${r.kb} KB beim Öffnen (Grenze ${GRENZE_N} / ${GRENZE_KB} KB) · grösste: ${top}`;
  fs.appendFileSync(LEDGER, [new Date().toISOString().slice(0, 16) + 'Z', URL, r.n, r.alle, r.kb, warn ? 'warn' : 'ok', top].join('\t') + '\n');
} catch (e) {
  zeile = `BILDLAST: unklar (${String(e.message || e).slice(0, 80)})`;
} finally { await browser.close(); }
console.log(zeile);
