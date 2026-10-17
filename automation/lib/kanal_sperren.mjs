/**
 * Kanal-Sperren: welche Produkte dürfen NICHT automatisch auf Werbe-/Marktplatz-Kanäle?
 *
 * GEMESSEN 2026-10-17. Die Produkte, die auf TikTok, Facebook/Instagram, Pinterest oder in der
 * Shop-App FEHLEN, fehlen dort ABSICHTLICH — ihre Tags sagen es laut:
 *   adult-nicht-bewerben · 18plus · nicht-bewerben · niedrig-bewertet-nicht-bewerben ·
 *   gmc-adult-pull · compliance-pruefen · social-pause-halloween ·
 *   harness-google-raus-2026-08-21 · raucher-rueckhol-0809
 * Ein Wächter, der „fehlende Kanäle nachzieht", hätte Erwachsenen-, 18-plus-, Tabak- und schwach
 * bewertete Artikel auf alle Social-Kanäle zurückgeschoben — also die Compliance-Arbeit früherer
 * Sitzungen rückgängig gemacht, mit Kanal-Sperre als möglichem Preis.
 *
 * Gleiche Lehre wie bei den DRAFTs: ein Produkt, das irgendwo fehlt, hat meistens einen Grund —
 * TAGS LESEN, BEVOR MAN HANDELT.
 *
 * Der Onlineshop ist ausgenommen: dort auffindbar zu sein ist Verkauf, nicht Werbung.
 */
export const SPERR_MUSTER = /nicht-bewerben|nicht-live|18plus|adult|gmc-adult|compliance-pruefen|verdeckte-ueberwachung|medizinprodukt|social-pause|rueckhol|-raus-|geprueft-gesperrt|marge-verlust|verlust-auto|us-netzteil|nicht-versendbar/i;

/** Die Sperrtags eines Produkts (leer = keine Sperre). */
export function sperrTags(tags = []) {
  return tags.filter(t => SPERR_MUSTER.test(String(t)));
}

/** Ist das ein Kanal, auf dem Produkte nur auffindbar (nicht beworben) werden? */
export function istOnlineshop(name = '') {
  return /^online store$/i.test(String(name).trim());
}

/**
 * Welche der fehlenden Kanäle darf ein Wächter nachziehen?
 * @param tags    Produkt-Tags
 * @param fehlend [{id, name}] der fehlenden Kanäle
 * @returns {{erlaubt: Array, blockiert: Array, sperrTags: string[]}}
 */
export function erlaubteKanaele(tags, fehlend = []) {
  const treffer = sperrTags(tags);
  if (!treffer.length) return { erlaubt: fehlend, blockiert: [], sperrTags: [] };
  return {
    erlaubt: fehlend.filter(k => istOnlineshop(k.name)),
    blockiert: fehlend.filter(k => !istOnlineshop(k.name)),
    sperrTags: treffer,
  };
}
