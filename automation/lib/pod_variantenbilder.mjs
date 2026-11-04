/**
 * «Selbst gestalten»: jede Variante bekommt das Printful-Bild ihrer Farbe oder ihres Materials.
 *
 * WARUM (gemessen 04.11.2026 am Live-Shop, Audit-Funde «Variantenbilder fehlen»): von 36 Printful-Produkten
 * trugen 35 an KEINER Variante ein eigenes Bild; beim Wechsel der Farbe blieb die Galerie stehen, und im
 * Warenkorb erschien für ein schwarzes Shirt das Vorschaubild des weissen. Beim klassischen Unisex-T-Shirt
 * war das Variantenbild aller acht Grössen die RÜCKANSICHT.
 *
 * Quelle der Bilder: der öffentliche Printful-Katalog (`/products/variant/<id>` → `variant.image`); die
 * Printful-Variantennummer steht in der Shop-SKU (`<Auftrag>_<Variante>`, z. B. 9000001_4011).
 *
 * Diese Datei ist rein (kein Netz, kein Shopify): sie entscheidet nur, WAS an WELCHE Variante gehört.
 */

/** Printful-Variantennummer aus der Shop-SKU, sonst null (eigene Produkte wie «WM-TRIKOT-RO-S» haben keine). */
export function pfVarianteId(sku) {
  const m = /^[A-Za-z0-9]+_(\d+)$/.exec(String(sku ?? '').trim());
  return m ? m[1] : null;
}

/** Ein Variantenbild, das nach Rückansicht aussieht (Dateiname), ist für die Auswahl falsch. */
export function schlechtesVariantenbild(url) {
  return /[-_]back[-_.]/i.test(String(url ?? '').replace(/\?.*$/, ''));
}

/**
 * Handyhüllen: die Bilder zeigen ein bestimmtes Modell (S20, iPhone 14); eine Gruppe «Material» hätte das
 * Bild des ersten Modells und würde bei jedem anderen Modell ein falsches Gerät zeigen. Ausgeschlossen,
 * bis es Bilder je Modell gibt (das wären 46 bzw. 16 zusätzliche Fotos in der Galerie).
 */
const AUSSCHLUSS = /h(?:ue|ü|u)lle|case/i;

/** Mehr als so viele verschiedene Bilder blähen die Galerie auf (Farbwahl bei 12 Taschenfarben ist der Normalfall). */
export const MAX_AUSSEHEN = 12;

function bereinigeName(name) {
  return String(name ?? '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\|.*$/, '')
    .replace(/\s*\d+(?:[.,]\d+)?\s*(?:cm|″|"|in)?\s*[×x]\s*\d+(?:[.,]\d+)?\s*(?:cm|″|"|in)?/gi, '').replace(/\s+/g, ' ').trim();
}

/**
 * Bezeichnung einer Gruppe aus den Shop-Optionen (deutsch): eine Option bestimmt das Aussehen, wenn ihre Werte in
 * verschiedenen Gruppen nie dieselben sind (Farbe, Material) – Grössen kehren in jeder Gruppe wieder und zählen nicht.
 */
function optionsLabel(gruppe, alle) {
  if (alle.length < 2) return '';
  const namen = new Set(alle.flatMap((g) => g.ids.flatMap((v) => (v.optionen || []).map((o) => o.name))));
  const teile = [];
  for (const name of namen) {
    const werte = alle.map((g) => new Set(g.ids.map((v) => (v.optionen || []).find((o) => o.name === name)?.value).filter(Boolean)));
    if (werte.some((w) => !w.size)) continue;
    const gesehen = new Set();
    let getrennt = true;
    for (const w of werte) for (const x of w) { if (gesehen.has(x)) getrennt = false; gesehen.add(x); }
    if (!getrennt) continue;
    const eigene = werte[alle.indexOf(gruppe)];
    teile.push([...eigene].join(' / '));
  }
  return teile.join(' · ');
}

/**
 * @param {{handle:string, titel:string, varianten:Array<{id:string, sku:string, bildUrl:?string, optionen?:Array<{name:string,value:string}>}>,
 *          pf:Object<string,{product_id:number, color?:string, size?:string, image?:string, name?:string}>,
 *          hashes?:Object<string,string>}} eingabe  `hashes`: Inhaltsprüfsumme je Bild-URL (gleiche Bilder = ein Medium)
 * @returns {{status:'plan'|'skip', grund?:string, ersetzen?:boolean, gruppen?:Array, uebersprungen?:Array}}
 */
export function plane(eingabe, opt = {}) {
  const max = opt.maxAussehen ?? MAX_AUSSEHEN;
  const { handle, titel, varianten, pf } = eingabe;
  const hashes = eingabe.hashes || {};
  if (AUSSCHLUSS.test(String(handle))) return { status: 'skip', grund: 'handyhuelle-modellbild' };

  const mitPf = [];
  const ohne = [];
  for (const v of varianten) {
    const x = pf[pfVarianteId(v.sku)];
    if (x && x.image && x.product_id) mitPf.push({ v, x });
    else ohne.push(v.id);
  }
  if (!mitPf.length) return { status: 'skip', grund: 'kein-printful-bild' };

  // Gruppen: gleiches Printful-Produkt UND gleiche Farbe sehen gleich aus (Grössen ändern das Bild nicht).
  const nachSchluessel = new Map();
  for (const { v, x } of mitPf) {
    const k = `${x.product_id}|${x.color || ''}`;
    if (!nachSchluessel.has(k)) nachSchluessel.set(k, { schluessel: k, x, ids: [] });
    nachSchluessel.get(k).ids.push(v);
  }
  // Gleiche Bilder zusammenlegen (Matt und Glanz-Poster sind bei Printful dasselbe Foto).
  const nachBild = new Map();
  for (const g of nachSchluessel.values()) {
    const h = hashes[g.x.image] || g.x.image;
    if (!nachBild.has(h)) nachBild.set(h, { hash: h, image: g.x.image, schluessel: [], x: g.x, ids: [] });
    const t = nachBild.get(h);
    t.schluessel.push(g.schluessel);
    t.ids.push(...g.ids);
  }
  const gruppen = [...nachBild.values()];

  const schlecht = varianten.filter((v) => v.bildUrl && schlechtesVariantenbild(v.bildUrl)).map((v) => v.id);
  if (gruppen.length > max) return { status: 'skip', grund: `zu-viele-bilder (${gruppen.length} > ${max})` };
  if (gruppen.length < 2 && !schlecht.length) return { status: 'skip', grund: 'ein-aussehen' };

  // Namen: bei mehreren Gruppen eines Printful-Produkts unterscheidet die Farbe, sonst der Produktname.
  const produktAnzahl = new Set(gruppen.map((g) => g.x.product_id)).size;
  const plan = [];
  const uebersprungen = [];
  for (const g of gruppen) {
    const ziele = [];
    for (const v of g.ids) {
      // Vorhandene gute Eigenbilder bleiben; Rückansichten werden ersetzt.
      if (v.bildUrl && !schlechtesVariantenbild(v.bildUrl)) { uebersprungen.push({ variante: v.id, grund: 'hat-eigenes-bild' }); continue; }
      ziele.push(v.id);
    }
    if (!ziele.length) continue;
    const farbe = g.x.color && produktAnzahl === 1 ? g.x.color : '';
    const label = (gruppen.length < 2 ? 'Vorderansicht' : '') || optionsLabel(g, gruppen) || farbe || bereinigeName(g.x.name) || `Ausführung ${plan.length + 1}`;
    plan.push({
      hash: g.hash,
      image: g.image,
      label,
      alt: `${titel} – ${label} – Beispielbild von Printful`.slice(0, 250),
      varianten: ziele,
      ersetzen: ziele.filter((id) => schlecht.includes(id)),
    });
  }
  if (!plan.length) return { status: 'skip', grund: 'alle-varianten-haben-bild' };
  return { status: 'plan', gruppen: plan, uebersprungen, ohnePrintful: ohne, ersetzen: schlecht.length > 0 };
}
