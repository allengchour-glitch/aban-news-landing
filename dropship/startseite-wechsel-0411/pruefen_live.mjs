// Prüft die Startseite (ohne etwas zu schreiben): stehen in den vier wechselnden Reihen genau die Produkte, die die Rechnung für das
// aktuelle Zeitfenster vorgibt (Fensterstart aus automation/lib/startseite_pool.mjs gegen die Pool-Reihenfolge im Shop)?
// Aufruf: node dropship/startseite-wechsel-0411/pruefen_live.mjs   (Exit 0 gleich, 1 Abweichung, 2 Seite nicht lesbar)
import { fensterStart, slotAus, REIHEN } from '../../automation/lib/startseite_pool.mjs';
const BASIS = 'https://luxestyle.ch';
const holen = async (pfad) => { const r = await fetch(BASIS + pfad, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' } }); if (!r.ok) throw new Error(`${pfad}: HTTP ${r.status}`); return r; };
const pool = async (name) => (await (await holen(`/collections/${REIHEN[name].handle}/products.json?limit=250`)).json()).products.map((p) => p.handle);
const alle = (h, a) => [...h.matchAll(new RegExp(`data-${a}-handle="([^"]+)"`, 'g'))].map((m) => m[1]);
let code = 0;
try {
  const html = await (await holen('/')).text();
  if (/Liquid error|translation missing/.test(html)) { console.log('FEHLER: Liquid-Fehler im HTML'); code = 1; }
  const slot = slotAus(Math.floor(Date.now() / 1000));
  const trends = alle(html, 'trend'), edit = alle(html, 'edit'), mehr = alle(html, 'more');
  console.log(`Zeitfenster ${slot} · Karten: Trends ${trends.length}, Schmuck/Wohnen ${edit.length}, Mehr ${mehr.length}`);
  const ist = { trends, mehr, schmuck: edit.slice(0, 3), wohnen: edit.slice(3) };
  for (const n of ['trends', 'mehr', 'schmuck', 'wohnen']) {
    const k = REIHEN[n], p = await pool(n), s = fensterStart(slot, p.length, k.fenster);
    const soll = p.slice(s, s + k.fenster).slice(0, k.zeigt);
    const gleich = soll.length === ist[n].length && soll.every((h, i) => h === ist[n][i]);
    console.log(`${n}: Pool ${p.length}, Start ${s} → ${gleich ? 'GLEICH' : 'ABWEICHUNG'}`);
    if (!gleich) { console.log('  soll', soll.join(', ')); console.log('  ist ', ist[n].join(', ')); code = 1; }
  }
  const doppelt = [...trends, ...edit, ...mehr]; if (new Set(doppelt).size !== doppelt.length) { console.log('FEHLER: ein Produkt steht doppelt'); code = 1; }
} catch (e) { console.log('Seite nicht lesbar:', e.message); code = 2; }
process.exit(code);
