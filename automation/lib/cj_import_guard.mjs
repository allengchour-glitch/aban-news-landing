import { sperrTags } from './kanal_sperren.mjs';
import { titelDeutschGenug } from './seo_titel.mjs';
import { pruefeDeText } from './storefront_sprache.mjs';

export const CJ_IMPORT_STATUS = 'DRAFT';
export const CJ_IMPORT_SPERRTAG = 'compliance-pruefen';

function norm(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('de-CH')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fail-closed-Pruefung fuer KI-Texte vor einem CJ-Import.
 *
 * Ein Provider-Erfolg ist noch kein Sprachbeleg. Insbesondere darf ein unveraenderter
 * `productNameEn` nie als angeblich deutscher Titel weiterlaufen. Fehlende oder unsichere
 * Inhalte werden deshalb blockiert und nicht durch den Lieferantentext ersetzt.
 */
export function pruefeCjImportText({ sourceTitle, title, html } = {}) {
  if (typeof sourceTitle !== 'string' || !sourceTitle.trim()) {
    return { status: 'BLOCKED', gruende: ['englischer CJ-Originaltitel fehlt'] };
  }
  if (typeof title !== 'string' || !title.trim()) {
    return { status: 'BLOCKED', gruende: ['deutscher Titel fehlt'] };
  }
  if (typeof html !== 'string' || !html.replace(/<[^>]+>/g, ' ').trim()) {
    return { status: 'BLOCKED', gruende: ['deutsche Beschreibung fehlt'] };
  }

  const gruende = [];
  if (norm(sourceTitle) && norm(sourceTitle) === norm(title)) {
    gruende.push('Titel entspricht unveraendert dem englischen CJ-Original');
  }

  const titelWortpruefung = titelDeutschGenug(title);
  if (!titelWortpruefung.ok) {
    gruende.push(`englische Titelwoerter: ${titelWortpruefung.treffer.join(', ')}`);
  }

  const titelSprache = pruefeDeText(title, { feld: 'title', art: 'titel', strictDe: true });
  const beschreibungSprache = pruefeDeText(html, { feld: 'descriptionHtml', art: 'meta', strictDe: true });
  for (const pruefung of [titelSprache, beschreibungSprache]) {
    if (pruefung.status !== 'OK') gruende.push(`${pruefung.feld}: ${pruefung.grund || pruefung.status}`);
  }

  return gruende.length ? { status: 'BLOCKED', gruende } : { status: 'OK', gruende: [] };
}

/** Bestehende Tags erhalten und den zentral erkannten Sperrtag immer hinzufuegen. */
export function sichereCjImportTags(tags = []) {
  const ergebnis = [];
  const gesehen = new Set();
  for (const roh of [...(Array.isArray(tags) ? tags : []), CJ_IMPORT_SPERRTAG]) {
    const tag = String(roh ?? '').trim();
    const key = tag.toLocaleLowerCase('de-CH');
    if (!tag || gesehen.has(key)) continue;
    gesehen.add(key);
    ergebnis.push(tag);
  }
  return ergebnis;
}

/** Neue CJ-Produkte bleiben bis zur getrennten Produkt-/Compliance-Pruefung Entwuerfe. */
export function cjImportSicherheitsdaten(tags = []) {
  const sichereTags = sichereCjImportTags(tags);
  return {
    status: CJ_IMPORT_STATUS,
    tags: sichereTags,
    sperrTags: sperrTags(sichereTags),
    publikationsbereit: false,
  };
}
