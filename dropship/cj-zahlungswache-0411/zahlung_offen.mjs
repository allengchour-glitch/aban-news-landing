// NUR LESEN: echte CJ-Aufträge (LX…) mit Status CREATED = angelegt, aber NICHT bezahlt. Gibt je Auftrag Betrag und CJ-Nummer aus.
// Die leeren Connector-Hüllen (#10xx, Status CREATED, Betrag 0) zählen nicht. Exit 0 immer; Ausgabe «NICHTS OFFEN» oder eine Zeile je offenem Auftrag.
import { readFileSync } from 'node:fs';
const tok = readFileSync('/tmp/_cjtok', 'utf8').trim();
const get = async (p) => (await fetch('https://developers.cjdropshipping.com/api2.0/v1/' + p, { headers: { 'CJ-Access-Token': tok } })).json();
const alle = [];
for (let n = 1; n <= 4; n++) {
  const r = await get(`shopping/order/list?pageNum=${n}&pageSize=50`);
  if (r.code !== 200) { console.log('FEHLER CJ-Liste:', r.code, r.message); process.exit(0); }
  const l = r.data?.list || []; alle.push(...l); if (l.length < 50) break;
  await new Promise((s) => setTimeout(s, 1200));
}
const offen = alle.filter((o) => /^LX/i.test(o.orderNum || '') && o.orderStatus === 'CREATED');
if (!offen.length) { console.log(`NICHTS OFFEN (${alle.length} Aufträge gelesen)`); process.exit(0); }
for (const o of offen) {
  await new Promise((s) => setTimeout(s, 1200));
  const d = (await get('shopping/order/getOrderDetail?orderId=' + encodeURIComponent(o.orderId))).data || {};
  console.log(`ZU BEZAHLEN ${o.orderNum} | CJ ${o.cjOrderId} | $${d.orderAmount ?? '?'} (Ware $${d.productAmount ?? '?'} + Versand $${d.postageAmount ?? '?'}) | angelegt ${o.createDate || o.createAt}`);
}
