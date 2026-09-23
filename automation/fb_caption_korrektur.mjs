#!/usr/bin/env node
/* fb_caption_korrektur.mjs — falsche Zusagen in VERÖFFENTLICHTEN Facebook-Texten korrigieren (23.09.2026).
 *
 * Betreiber 23.09.: «bearbeite selber wens nicht stimmt wie zb versandkosten … alles autonom». Der Qualitäts-Wächter
 * (social_qualitaet_wache.mjs) fand auf Facebook 30 Texte mit «Blitzversand aus der Schweiz», «in 1–2 Tagen bei dir»,
 * «gratis Versand ab CHF 65» und einem Lockpreis (Caption CHF 12.90, Shop CHF 15.90). CJ-Ware braucht 10–20 Werktage,
 * die Gratis-Schwelle ist CHF 50.
 *
 * Arbeitsweise: NUR feste Ersetzungen aus der Tabelle unten — kein Umformulieren durch ein Modell. Ein Text, in dem nach
 * den Ersetzungen noch eine Lieferzusage steht, wird NICHT geschrieben, sondern als «manuell» gemeldet.
 * Reels: die Beschreibung steht am Video (POST /{video-id} description=…); der Seitenbeitrag daneben wird mitgeprüft.
 * Jede Schreibung wird zurückgelesen; das Ledger dropship/_fb_caption_korrigiert.tsv hält alten und neuen Text
 * (öffentliche Texte, keine Geheimnisse) — damit ist jede Änderung umkehrbar.
 *
 * Nutzung: node automation/fb_caption_korrektur.mjs            (DRY: zeigt jeden Diff)
 *          SCHARF=1 node automation/fb_caption_korrektur.mjs   (schreibt, liest zurück, Ledger; PAUSE_S=45 zwischen
 *          zwei Schreibvorgängen; bricht beim ersten Meta-Sperrhinweis ab — idempotent, nächster Lauf macht weiter)
 */
import fs from 'node:fs';
const SCHARF = process.env.SCHARF === '1';
const SEITE = process.env.FB_PAGE_ID || '1049840534888592';
const T = (process.env.META_ACCESS_TOKEN || fs.readFileSync('/tmp/meta_page_token', 'utf8')).trim();
const SHOPTOK = fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim() : '';
const LED = 'dropship/_fb_caption_korrigiert.tsv';
const TAGE = parseInt(process.env.TAGE || '90', 10);
const warte = ms => new Promise(r => setTimeout(r, ms));
const g = async (u, opt) => { for (let a = 0; a < 3; a++) { try {
  const r = await fetch(u.startsWith('http') ? u : `https://graph.facebook.com/v21.0/${u}${u.includes('?') ? '&' : '?'}access_token=${T}`, opt);
  return await r.json(); } catch { await warte(2000 * (a + 1)); } } return { error: { message: 'netz' } }; };

// Reihenfolge zählt: lange, konkrete Sätze zuerst, dann die Bausteine.
const ERSATZ = [
  ['gratis Versand ab CHF 65', 'gratis Versand ab CHF 50'],
  ['Dank Blitzversand aus der Schweiz bist du morgen schon badefertig!', 'Lieferung in die ganze Schweiz.'],
  ['Dank Blitzversand aus der Schweiz funkeln sie schon bald an dir – bequem auf Rechnung bestellen!', 'Bequem auf Rechnung bestellen!'],
  ['Dank Blitzversand aus der Schweiz und Kauf auf Rechnung war Entspannung noch nie so einfach!', 'Mit Kauf auf Rechnung war Entspannung noch nie so einfach!'],
  ['Dank Blitzversand aus der Schweiz und Kauf auf Rechnung ist es blitzschnell bei dir!', 'Bequem auf Rechnung bestellen!'],
  ['Blitzversand aus der Schweiz & Kauf auf Rechnung machen es dir ganz einfach!', 'Kauf auf Rechnung macht es dir ganz einfach!'],
  ['Blitzversand aus der Schweiz und bequem Kauf auf Rechnung inklusive!', 'Bequem auf Rechnung kaufen!'],
  ['Blitzversand aus der Schweiz und Kauf auf Rechnung inklusive.', 'Kauf auf Rechnung inklusive.'],
  ['Blitzversand aus der Schweiz und bequem Kauf auf Rechnung.', 'Bequem auf Rechnung kaufen.'],
  ['Blitzversand aus der Schweiz und bequem auf Rechnung bestellen.', 'Bequem auf Rechnung bestellen.'],
  ['Mit Blitzversand aus der Schweiz und Kauf auf Rechnung.', 'Bequem auf Rechnung kaufen.'],
  ['Blitzversand aus der Schweiz, bequem auf Rechnung zahlen.', 'Bequem auf Rechnung zahlen.'],
  ['– mit Blitzversand aus der Schweiz direkt zu dir nach Hause.', '– mit Lieferung direkt zu dir nach Hause.'],
  ['Blitzversand aus der Schweiz direkt zu dir nach Hause', 'Lieferung direkt zu dir nach Hause'],
  ['Blitzversand aus der Schweiz: in 1–2 Tagen bei dir.', 'Lieferung in die ganze Schweiz.'],
  [' – dank Blitzversand in 1-2 Tagen bei dir!', '!'],
  ['Bestelle heute und geniesse Blitzversand direkt aus der Schweiz!', 'Jetzt bei LuxeStyle entdecken!'],
  ['Blitzversand aus der Schweiz · ', 'Lieferung in die ganze Schweiz · '],
];
// Restprüfung: steht danach noch eine Lieferzusage drin, wird NICHT geschrieben.
const REST = /Blitz|Express(?:versand|lieferung)|über\s+Nacht|morgen\s+(?:schon|bei\s+dir)|in\s*\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:Werk)?tag|ab CHF 65|aus der Schweiz\s*(?:·|:|und|&|,|direkt)/i;

async function shopPreis(titel) {
  if (!SHOPTOK) return null;
  const q = `title:"${titel.replace(/"/g, '')}" status:active`;
  const r = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json', { method: 'POST',
    headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'query($q:String!){products(first:3,query:$q){nodes{title status priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}}', variables: { q } }) });
  const n = ((await r.json())?.data?.products?.nodes || []).filter(p => p.title.trim().toLowerCase() === titel.trim().toLowerCase());
  if (n.length !== 1) return null;
  const min = parseFloat(n[0].priceRangeV2.minVariantPrice.amount), max = parseFloat(n[0].priceRangeV2.maxVariantPrice.amount);
  return { min, max };
}
const chf = x => `CHF ${x.toFixed(2)}`;

// Beiträge lesen (Seitenbeiträge + Reels, letzte TAGE Tage)
const since = Math.floor(Date.now() / 1000) - TAGE * 86400;
const posts = [], reels = [];
for (const [e, f, ziel] of [['published_posts', 'id,created_time,message,permalink_url,attachments{type,target{id}}', posts], ['video_reels', 'id,created_time,description,permalink_url', reels]]) {
  let r = await g(`${SEITE}/${e}?fields=${f}&limit=100&since=${since}`);
  if (r.error) { console.error(`⛔ ${e}: ${r.error.message}`); process.exit(1); }
  while (r && r.data) { ziel.push(...r.data); if (!r.paging?.next) break; r = await g(r.paging.next); }
}
const reelIds = new Set(reels.map(r => r.id));
const zwilling = new Map();   // Reel-ID → Seitenbeitrag
for (const p of posts) for (const d of p.attachments?.data || []) { const t = d.target?.id; if (t && reelIds.has(t)) zwilling.set(t, p); }

async function korrigiere(text) {
  let neu = text;
  for (const [a, b] of ERSATZ) neu = neu.split(a).join(b);
  // Lockpreis im Vorlagen-Satz «Titel» ✨ Jetzt bei LuxeStyle — CHF x.
  const m = /«([^»]{4,120})»\s*✨\s*Jetzt bei LuxeStyle\s*—\s*CHF\s*(\d+(?:\.\d{2})?)/.exec(neu);
  let preisNotiz = '';
  if (m) {
    const p = await shopPreis(m[1]);
    if (!p) preisNotiz = 'Preis nicht prüfbar (Produkt nicht eindeutig)';
    else if (Math.abs(p.min - parseFloat(m[2])) > 0.001) {
      const soll = p.max > p.min ? `ab ${chf(p.min)}` : chf(p.min);
      neu = neu.replace(`CHF ${m[2]}`, soll); preisNotiz = `Preis ${m[2]} → ${soll}`;
    }
  }
  return { neu, preisNotiz };
}

const ziele = [];
for (const r of reels) ziele.push({ id: r.id, art: 'reel', feld: 'description', text: r.description || '', url: r.permalink_url, twin: zwilling.get(r.id) });
for (const p of posts) { if ([...zwilling.values()].includes(p)) continue; ziele.push({ id: p.id, art: 'post', feld: 'message', text: p.message || '', url: p.permalink_url }); }

let n = 0, ok = 0, manuell = 0, fehler = 0;
for (const z of ziele) {
  const { neu, preisNotiz } = await korrigiere(z.text);
  if (neu === z.text) { if (REST.test(z.text)) { manuell++; console.log(`✋ manuell (${z.art} ${z.id}): ${z.text.replace(/\s+/g, ' ').slice(0, 140)}`); } continue; }
  if (REST.test(neu)) { manuell++; console.log(`✋ manuell — Rest nach Ersetzung (${z.art} ${z.id}): ${neu.replace(/\s+/g, ' ').slice(0, 160)}`); continue; }
  n++;
  console.log(`\n✎ ${z.art} ${z.id} ${preisNotiz ? `· ${preisNotiz}` : ''}\n  alt: ${z.text.replace(/\s+/g, ' ').slice(0, 260)}\n  neu: ${neu.replace(/\s+/g, ' ').slice(0, 260)}`);
  if (!SCHARF) continue;
  const w = await g(z.id, { method: 'POST', body: new URLSearchParams({ [z.feld]: neu }) });
  await warte(1500);
  const zurueck = await g(`${z.id}?fields=${z.feld}`);
  if (!w.error && (zurueck[z.feld] || '') === neu) {
    ok++; fs.appendFileSync(LED, `${new Date().toISOString()}\t${z.art}\t${z.id}\t${z.url || ''}\t${JSON.stringify(z.text)}\t${JSON.stringify(neu)}\n`);
    console.log('  ✅ geschrieben + zurückgelesen');
    if (z.twin) {   // Seitenbeitrag des Reels: übernimmt Facebook den Text? Sonst mitschreiben.
      const t = await g(`${z.twin.id}?fields=message`);
      if ((t.message || '') !== neu) {
        const w2 = await g(z.twin.id, { method: 'POST', body: new URLSearchParams({ message: neu }) }); await warte(1500);
        const t2 = await g(`${z.twin.id}?fields=message`);
        console.log(`  Zwilling ${z.twin.id}: ${!w2.error && (t2.message || '') === neu ? '✅ mitgeschrieben' : `⚠️ ${JSON.stringify(w2.error || t2).slice(0, 140)}`}`);
      } else console.log(`  Zwilling ${z.twin.id}: übernimmt den Text selbst`);
    }
  } else {
    fehler++; console.log(`  ✗ ${JSON.stringify(w.error || zurueck).slice(0, 300)}`);
    // 23.09.2026: Nach 120 Löschungen + 7 Korrekturen sperrte Meta weitere Aktionen («Um die Community vor Spam zu
    // schützen …»). Weiterfeuern verlängert die Sperre — beim ersten Sperr-Hinweis abbrechen; der nächste Lauf macht
    // dort weiter (bereits korrigierte Texte passen nicht mehr auf die Tabelle).
    if (/Spam|zu oft|too many|rate limit|temporarily blocked|368/i.test(JSON.stringify(w.error || {}))) { console.log('  ⛔ Meta-Sperre — Abbruch, später erneut'); break; }
  }
  await warte(parseInt(process.env.PAUSE_S || '45', 10) * 1000);   // ruhig schreiben: eine Korrektur je 45 s
}
console.log(`\nFERTIG${SCHARF ? '' : ' (DRY)'}: ${n} zu korrigieren · ${SCHARF ? `${ok} geschrieben · ${fehler} Fehler · ` : ''}${manuell} manuell · geprüft ${ziele.length} (Reels ${reels.length}, Beiträge ${posts.length - zwilling.size})`);
