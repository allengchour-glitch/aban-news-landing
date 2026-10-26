/**
 * Fotowahl für die Pinnwand-Banner (automation/banner/banner.mjs): aus den meistverkauften Produkten einer Collection eine Kandidatenliste bilden.
 * Rein, ohne Netz (getestet). Lehre aus der Stichprobe vom 26.10.2026: 14 Bestseller-Fotos ergeben nach der Sauberkeitsprüfung oft nur 6–8 Fotos,
 * darum 60 Produkte und bis zu 2 Fotos je Produkt — aber erst ALLE ersten Fotos, dann die zweiten (Vielfalt vor Menge).
 */
import { istGesperrt } from './kategorien.mjs';
import { VERBOTEN } from './fakten_block.mjs';

/**
 * @param {{status:string,title:string,tags?:string[],featuredImage?:{url:string,width:number,height:number},media?:{nodes:{image?:{url:string,width:number,height:number}}[]}}[]} produkte  in Verkaufsreihenfolge
 * @returns {{url:string,breite:number,hoehe:number,produkt:number,nr:number}[]}  nr 0 = Titelbild, 1.. = Galerie
 */
export function kandidaten(produkte, { max = 90, proProdukt = 2, minPx = 800, ratioMin = 0.6, ratioMax = 1.7 } = {}) {
  const ok = im => im?.url && Math.min(im.width || 0, im.height || 0) >= minPx && (im.height / im.width) >= ratioMin && (im.height / im.width) <= ratioMax;
  const runden = Array.from({ length: proProdukt }, () => []);
  produkte.forEach((p, i) => {
    if (p.status !== 'ACTIVE' || VERBOTEN.test(p.title || '') || istGesperrt(p)) return;
    const bilder = []; const gesehen = new Set();
    for (const im of [p.featuredImage, ...(p.media?.nodes || []).map(m => m.image)]) {
      if (!im?.url) continue;
      const k = im.url.split('?')[0]; if (gesehen.has(k)) continue; gesehen.add(k);
      if (ok(im)) bilder.push(im);
    }
    bilder.slice(0, proProdukt).forEach((im, nr) => runden[nr].push({ url: im.url, breite: im.width, hoehe: im.height, produkt: i, nr }));
  });
  return runden.flat().slice(0, max);
}

/** Wählt aus geprüften Kandidaten höchstens `ziel` Fotos, höchstens `proProdukt` je Produkt. Rein, getestet. */
export function waehleSaubere(geprueft, ziel = 12, proProdukt = 2) {
  const je = new Map(); const aus = [];
  for (const k of geprueft) { if (k.sauber !== true) continue; const n = je.get(k.produkt) || 0; if (n >= proProdukt) continue; je.set(k.produkt, n + 1); aus.push(k); if (aus.length >= ziel) break; }
  return aus;
}
