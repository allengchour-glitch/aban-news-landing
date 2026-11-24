// Einzel-Akkus/-Batterien (Lithium, UN3480) und Powerstations: CJ-Postlinien CN→CH nehmen sie nicht als Einzelware
// (Gefahrgut) — ein Verkauf endet als Rückerstattung. 24.11.2026: 19 aktive gedraftet (Tag akku-einzeln-kein-ch-versand),
// darunter «21 V Lithium-Batterie für Makita-Werkzeuge» und eine 220-V-Powerstation aus dem Kategorie-Import desselben Tages.
// Geräte MIT eingebautem Akku und reine Ladegeräte bleiben erlaubt. Test: node automation/lib/akku_einzeln.mjs
const AKKU_EINZELN = /^\W*(\d+(\.\d+)?\s*(v|mah|pcs?)\s+)*(portable\s+)?(rechargeable\s+)?(lithium|li-?ion|li-?po(lymer)?|lifepo4|18650|21700|er\d{5})[\w\s-]{0,30}batter(y|ies)\b|\bpower\s*station\b|\blifepo4\b|\blithium\s+iron\s+phosphate\b|\breplacement\s+batter(y|ies)\b|\bbatter(y|ies)\s+(pack\s+)?(for|compatible\s+with)\s+(makita|bosch|dewalt|milwaukee|ryobi|einhell|metabo|worx|sony|canon|nikon|laptop|drone|power\s+tools?|electric\s+tools?)\b/i;
const AKKU_MIT = /\b(with|w\/|includ\w*|built-?in|powered|operated)\b[^,.;]{0,30}\bbatter|\bcharger\b(?![^,.;]{0,25}\bset\b)/i;
export const akkuEinzeln = (nm) => AKKU_EINZELN.test(nm || '') && !AKKU_MIT.test(nm || '');
if (import.meta.url === `file://${process.argv[1]}`) {
  const ja = ['21V Lithium Battery For Makita Tools', '220V Portable Lithium Iron Phosphate Battery', '18650 Lithium Ion Battery', 'Replacement Battery For BXM-10 Camera', 'Li-ion Battery 3000mAh Charger Set', 'Portable Power Station 300W', '9V Lithium Polymer Battery 2 Pcs'];
  const nein = ['LED Night Light With Lithium Battery', 'Lithium Battery Charger LCD', 'Fish Lantern Hand Lamp Battery Operated', 'Rechargeable Desk Lamp', 'Battery Powered Fairy Lights', 'Wireless Mouse Built-in Lithium Battery'];
  let f = 0;
  for (const s of ja) if (!akkuEinzeln(s)) { f++; console.log('FEHLT', s); }
  for (const s of nein) if (akkuEinzeln(s)) { f++; console.log('FALSCH', s); }
  console.log(f ? `${f} Fehler` : `ok ${ja.length + nein.length}`); process.exit(f ? 1 : 0);
}
