// Drei kleine, unabhängige Theme-Änderungen für «Selbst gestalten» (Editor-Fehlersuche 10.11.2026). Rein: Text rein, Text raus.
export const T1 = {
  id: 'T1', datei: 'layout/theme.liquid', marke: 'lx-editor-tippflaeche-1011',
  block: "{%- if template.name == 'product' -%}\n<style id=\"lx-editor-tippflaeche-1011\">\n/* 10.11.2026: Editor «Selbst gestalten» auf dem Handy: Tippflächen mindestens 44 px (Ebenen-Knöpfe ▲ ▼ waren 37x36, Link «Ganze Vorlage zeigen» 36 px hoch). Rücknahme: diesen Block entfernen. */\n@media (max-width:600px){\n.lsp6-chip,.lsp6-linkbtn{min-height:44px!important}\n.lsp6-chip{min-width:44px!important}\n}\n</style>\n{%- endif -%}\n",
};
export const T3 = {
  id: 'T3', datei: 'layout/theme.liquid',
  alt: 'var lxZeigen=function(){if(banner.style.display==="block")return;lxBannerPlatzieren();banner.style.display="block"};',
  neu: 'var lxZeigen=function(){var s=null;try{s=localStorage.getItem(KEY)}catch(e){}if(s||banner.style.display==="block")return;lxBannerPlatzieren();banner.style.display="block"};',
};
export const T2 = {
  id: 'T2', datei: 'blocks/buy-buttons.liquid',
  alt: `              <p class="lspod-designzwang__note">
                {%- if request.locale.iso_code == 'en' -%}
                  This item is printed with your own design. Create it in the designer below and
                  add it to the cart there — that way your print file travels with the order.
                {%- else -%}
                  Dieses Produkt wird mit deinem eigenen Design bedruckt. Du gestaltest es weiter
                  unten und legst es dort mit «🛒 Mit meinem Design in den Warenkorb» ab — nur so
                  geht deine Druckdatei mit der Bestellung mit.
                {%- endif -%}
              </p>`,
  neu: `              <p class="lspod-designzwang__note">
                {%- if product.description contains 'data-lspod-blocked' -%}
                  {%- if request.locale.iso_code == 'en' -%}
                    Personalisation is currently not available for this item. The reason is explained in the box below.
                  {%- else -%}
                    Die Personalisierung ist für dieses Produkt derzeit nicht bestellbar. Die Begründung steht im Kasten weiter unten.
                  {%- endif -%}
                {%- elsif request.locale.iso_code == 'en' -%}
                  This item is printed with your own design. Create it in the designer below and
                  add it to the cart there — that way your print file travels with the order.
                {%- else -%}
                  Dieses Produkt wird mit deinem eigenen Design bedruckt. Du gestaltest es weiter
                  unten, prüfst es mit «Druckvorschau prüfen» und legst es dort mit «Druckvorschau bestätigen und in den Warenkorb» ab — nur so
                  geht deine Druckdatei mit der Bestellung mit.
                {%- endif -%}
              </p>`,
};
export const SCHRITTE = [T1, T3, T2];
const zaehle = (t, s) => t.split(s).length - 1;
// Zustand je Schritt: 'alt' (Ausgangslage), 'neu' (eingespielt), sonst Fehler
export function zustand(s, text) {
  if (s.block) { const n = zaehle(text, s.block); const m = zaehle(text, s.marke); return n === 1 && m === 1 ? 'neu' : n === 0 && m === 0 ? 'alt' : 'unklar'; }
  const a = zaehle(text, s.alt), n = zaehle(text, s.neu);
  return a === 1 && n === 0 ? 'alt' : a === 0 && n === 1 ? 'neu' : 'unklar';
}
export function anwenden(s, text) {
  const z = zustand(s, text);
  if (z === 'neu') throw new Error('schon eingespielt: ' + s.id);
  if (z !== 'alt') throw new Error(s.id + ': Ausgangstext nicht genau einmal vorhanden');
  if (s.block) { if (zaehle(text, '</head>') !== 1) throw new Error(s.id + ': </head> nicht genau einmal'); return text.replace('</head>', s.block + '</head>'); }
  return text.split(s.alt).join(s.neu);
}
export function zuruecknehmen(s, text) {
  const z = zustand(s, text);
  if (z === 'alt') throw new Error(s.id + ': nicht eingespielt, nichts zurückzunehmen');
  if (z !== 'neu') throw new Error(s.id + ': Stand unklar');
  return s.block ? text.split(s.block).join('') : text.split(s.neu).join(s.alt);
}
export const dateien = () => [...new Set(SCHRITTE.map(s => s.datei))];
export function allesAnwenden(texte, nur) {
  const aus = { ...texte };
  for (const s of SCHRITTE) if (!nur || nur.includes(s.id)) { try { aus[s.datei] = anwenden(s, aus[s.datei]); } catch (e) { if (!String(e.message).startsWith('schon')) throw e; } }
  return aus;
}
export function allesZurueck(texte, nur) {
  const aus = { ...texte };
  for (const s of [...SCHRITTE].reverse()) if (!nur || nur.includes(s.id)) { if (zustand(s, aus[s.datei]) === 'neu') aus[s.datei] = zuruecknehmen(s, aus[s.datei]); }
  return aus;
}
