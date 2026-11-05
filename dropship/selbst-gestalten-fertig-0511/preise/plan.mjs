// Reine Planung (kein Netz): welche Shop-Varianten bekommen nach der Preisformel einen HÖHEREN Preis?
// Nie gesenkt (Besitzer-Ja vom 05.11.2026 gilt für die Formel; Senkungen sind nicht besprochen).
import { endpreis, abrechnungsEk } from '../werkzeuge/preisformel.mjs';

/** zeilen: [handle,status,sku,printfulVariante,preisChf,ekKatalogUsd,versandUsd,ekSchaetzungUsd]; shop: { sku: { id, productId, handle, price } } */
export function planen(zeilen, shop) {
  const plan = [], tiefer = [], gleich = [], fehlt = [], ohneDaten = [];
  for (const [handle, status, sku, , preisDamals, ekK, vers, ekS] of zeilen) {
    const v = shop[sku];
    if (!v) { fehlt.push({ handle, sku }); continue; }
    if (!(ekK > 0) || vers == null) { ohneDaten.push({ handle, sku }); continue; }
    const { ekUsd } = abrechnungsEk({ katalogUsd: ekK, schaetzungUsd: ekS });
    const e = endpreis({ ekUsd, versandUsd: vers, aufpreisUsd: 0, ekRichtwertUsd: ekK });
    const jetzt = Number(v.price);
    const z = { handle, sku, variantId: v.id, productId: v.productId, alt: jetzt, neu: e.preisChf, bindend: e.bindend, nettoChf: e.nettoChf, status };
    if (e.preisChf > jetzt + 1e-9) plan.push(z);
    else if (e.preisChf < jetzt - 1e-9) tiefer.push(z);
    else gleich.push(z);
  }
  return { plan, tiefer, gleich, fehlt, ohneDaten, summe: plan.reduce((s, z) => s + (z.neu - z.alt), 0) };
}
