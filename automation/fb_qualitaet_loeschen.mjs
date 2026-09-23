// fb_qualitaet_loeschen.mjs — Facebook-Posts der Qualitätsprüfung (DOPPEL/PRODUKT/TON) live nachprüfen, dann löschen.
// Erstlauf 23.09.2026 auf Betreiber-«JA fb löschen» (120 gelöscht). Jede neue Runde braucht wieder ein Betreiber-Ja.
// Nutzung: KANDIDATEN=<json mit url/loesch_gruende/produkt_url/doppel_von> node automation/fb_qualitaet_loeschen.mjs   (DRY)
//          … SCHARF=1 …   (löscht; Ledger dropship/_fb_geloescht.txt)
// Falle 23.09.: ein GELÖSCHTER Seiten-Post antwortet beim Rücklesen mit Code 10 («missing permission»), nicht 100/33.
// Rücklesen gilt deshalb erst als «weg», wenn der Post auch im Seiten-Listing fehlt — sonst standen 92 Löschungen als Fehler da.
import fs from 'node:fs';
const SCHARF = process.env.SCHARF === '1';
const KAND = process.env.KANDIDATEN; if (!KAND) { console.log('KANDIDATEN=<json> fehlt'); process.exit(1); }
const AUSGABE = process.env.AUSGABE || '/tmp/fb_loeschliste.json';
const SEITE = '1049840534888592';
const T = fs.readFileSync('/tmp/meta_page_token', 'utf8').trim();
const SHOPTOK = fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim();
const warte = ms => new Promise(r => setTimeout(r, ms));
const g = async (p, opt = {}) => { for (let a = 0; a < 3; a++) { try { const r = await fetch(`https://graph.facebook.com/v21.0/${p}${p.includes('?') ? '&' : '?'}access_token=${T}`, opt); return await r.json(); } catch (e) { await warte(2000); } } return { error: { message: 'netz' } }; };
const shop = async (h) => { const r = await fetch('https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json', { method: 'POST', headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query($h:String!){productByHandle(handle:$h){status onlineStoreUrl}}', variables: { h } }) }); return (await r.json())?.data?.productByHandle; };
const gid = u => { const r = u.match(/\/reel\/(\d+)/); if (r) return r[1]; const p = u.match(/\/posts\/(\d+)/); return p ? `${SEITE}_${p[1]}` : (u.match(/\/videos\/(\d+)/) || [])[1]; };
const norm = s => String(s || '').toLowerCase().replace(/#\S+/g, '').replace(/[^a-z0-9äöü]+/g, ' ').trim().slice(0, 60);
const prodLink = s => (String(s || '').match(/luxestyle\.ch\/products\/([\w%-]+)/) || [])[1] || '';
const kand = JSON.parse(fs.readFileSync(KAND, 'utf8')).filter(k => k.loesch_gruende.length);
const info = new Map(); const liveCache = new Map();
const lese = async id => { if (liveCache.has(id)) return liveCache.get(id);
  const felder = id.includes('_') ? 'id,created_time,from,message,permalink_url' : 'id,created_time,from,description,permalink_url';
  const r = await g(`${id}?fields=${felder}`); liveCache.set(id, r); return r; };
// Nur «existiert nicht» (Code 100, Subcode 33) gilt als weg — jeder andere Fehler = unklar = behalten.
const weg = r => r.error && r.error.code === 100 && (r.error.error_subcode === 33 || /does not exist|nonexisting/i.test(r.error.message) && !/field/i.test(r.error.message));
for (const k of kand) {
  const id = gid(k.url); const r = await lese(id); const gr = new Set(k.loesch_gruende.map(x => x.split(' ')[1])); const notiz = [];
  if (r.error) { info.set(k.url, weg(r) ? { id, weg: true, notiz: ['nicht mehr vorhanden'] } : { id, gr: new Set(), notiz: ['unklar: ' + r.error.message.slice(0, 60)] }); continue; }
  if (r.from?.id !== SEITE) { info.set(k.url, { id, gr: new Set(), notiz: ['fremder Absender'] }); continue; }
  const text = r.message || r.description || '';
  if (gr.has('PRODUKT')) {
    const h = (k.produkt_url || '').split('/products/')[1];
    const p = h ? await shop(h) : null;
    if (p && p.status === 'ACTIVE' && p.onlineStoreUrl) { gr.delete('PRODUKT'); notiz.push('Produkt wieder kaufbar → PRODUKT entfällt'); }
    else notiz.push(`Produkt ${p ? p.status : 'gelöscht'}`);
  }
  if (gr.has('DOPPEL')) {
    const ref = (k.doppel_von || [])[0]; const rid = ref && gid(ref); const o = rid ? await lese(rid) : { error: 1 };
    if (o.error) { gr.delete('DOPPEL'); notiz.push(weg(o) ? 'Original weg → DOPPEL entfällt' : 'Original unklar → DOPPEL entfällt'); }
    else {
      const ot = o.message || o.description || '';
      const gleich = norm(ot) === norm(text) || (prodLink(ot) && prodLink(ot) === prodLink(text)) || (k.produkt && ot.includes(k.produkt));
      if (!gleich) { gr.delete('DOPPEL'); notiz.push('Original weicht ab → DOPPEL entfällt'); } else notiz.push('Original ' + rid);
    }
  }
  info.set(k.url, { id, gr, text, zeit: r.created_time, notiz, ref: (k.doppel_von || [])[0] });
}
// Mindestens eine Fassung behalten: DOPPEL-only-Löschung nur, wenn die Kette bei einem behaltenen oder fehlerhaften Original endet
const byId = new Map([...info.values()].filter(x => x.id).map(x => [x.id, x]));
const wurzel = (x, tiefe = 0) => { if (!x || tiefe > 20) return null; const r = x.ref && gid(x.ref); const o = r && byId.get(r); return o ? wurzel(o, tiefe + 1) || o : (r ? { id: r, behalten: true } : null); };
let n = 0, geloescht = 0, fehler = 0; const zeilen = [];
const liste = [...info.entries()].filter(([u, x]) => !x.weg && x.gr && x.gr.size);
const zaehl = {};
for (const [u, x] of liste) {
  const gruende = [...x.gr];
  if (gruende.length === 1 && gruende[0] === 'DOPPEL') {
    const w = wurzel(x); if (!w) { x.notiz.push('Kette unklar → behalten'); continue; }
    const wx = byId.get(w.id); if (wx && wx.gr && wx.gr.size && [...wx.gr].every(z => z === 'DOPPEL')) { x.notiz.push('Kettenwurzel würde ebenfalls gelöscht → behalten'); continue; }
  }
  gruende.forEach(z => zaehl[z] = (zaehl[z] || 0) + 1); n++;
  zeilen.push([u, x]);
}
console.log(`Kandidaten ${kand.length} · live vorhanden+begründet ${liste.length} · zu löschen ${n} · Gründe`, zaehl);
console.log('nicht mehr vorhanden:', [...info.values()].filter(x => x.weg).length, '· Gründe entfallen/unklar:', [...info.values()].filter(x => !x.weg && (!x.gr || !x.gr.size)).length, [...new Set([...info.values()].filter(x => !x.weg && (!x.gr || !x.gr.size)).flatMap(x => x.notiz))].slice(0,5));
for (const [u, x] of zeilen.slice(0, SCHARF ? 0 : 8)) console.log('  -', x.zeit?.slice(0, 10), [...x.gr].join('+'), '|', x.text.replace(/\s+/g, ' ').slice(0, 70), '|', x.notiz.join('; ').slice(0, 80));
if (!SCHARF) { fs.writeFileSync(AUSGABE, JSON.stringify(zeilen.map(([u, x]) => ({ url: u, id: x.id, gruende: [...x.gr], zeit: x.zeit, text: x.text.slice(0, 120), notiz: x.notiz })), null, 1)); console.log('DRY — nichts gelöscht'); process.exit(0); }
const LED = 'dropship/_fb_geloescht.txt';
let listing = null;
const imListing = async id => { if (!listing) { listing = new Set(); for (const e of ['posts', 'videos', 'video_reels']) {
  let r = await g(`${SEITE}/${e}?fields=id&limit=100`); let n = 0;
  while (r && r.data && n++ < 60) { r.data.forEach(d => listing.add(d.id)); if (!r.paging?.next) break; r = await (await fetch(r.paging.next)).json(); } } }
  if (listing.has(id)) { listing = null; return true; } return false; };
for (const [u, x] of zeilen) {
  const r = await g(x.id, { method: 'DELETE' });
  await warte(1200);
  const nach = await g(`${x.id}?fields=id`);
  const code10 = nach.error && nach.error.code === 10;
  if (r.success && (weg(nach) || (code10 && !(await imListing(x.id))))) { geloescht++; fs.appendFileSync(LED, `${new Date().toISOString()}\t${x.id}\t${[...x.gr].join('+')}\t${x.zeit}\t${u}\t${x.text.replace(/\s+/g, ' ').slice(0, 90)}\n`); }
  else { fehler++; console.log('✗', x.id, JSON.stringify(r).slice(0, 120)); }
}
console.log(`FERTIG: ${geloescht} gelöscht (rückgeprüft) · ${fehler} Fehler`);
