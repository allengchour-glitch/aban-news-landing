import { sperrTags } from './kanal_sperren.mjs';
import { titelDeutschGenug } from './seo_titel.mjs';
import { pruefeDeText } from './storefront_sprache.mjs';

export const CJ_IMPORT_STATUS = 'DRAFT';
export const CJ_IMPORT_SPERRTAG = 'compliance-pruefen';
export const CJ_IMPORT_SHOP = 'au3j0y-hq.myshopify.com';
export const CJ_IMPORT_SHOP_NAME = 'LuxeStyle';
export const CJ_IMPORT_PRIMARY_DOMAIN = 'luxestyle.ch';
export const CJ_IMPORT_WAEHRUNG = 'CHF';

// Kleine, absichtlich konservative Wortlisten. Die allgemeine Storefront-Pruefung faengt
// bekannte UI-/Meta-Faelle ab; diese zweite Schranke verhindert, dass fluessige englische
// KI-Ausgaben ohne eines der bekannten Einzelwoerter als angeblich deutsch durchlaufen.
const EN = new Set(('a an and are as at breathable comfort comfortable dashboard dress elegant fabric for from '
  + 'holder home in is linen magnetic mount of on phone product silhouette soft styling summer the this to '
  + 'versatile with women your').split(/\s+/));
const DE = new Set(('am an auf aus bei das dem den der des die ein eine einem einen einer eines fuer für '
  + 'fuers fürs im in ist mit ohne oder sowie und vom von zum zur').split(/\s+/));

function norm(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('de-CH')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function woerter(value) {
  return norm(value).split(' ').filter(Boolean);
}

function sprachSignal(value) {
  const tokens = woerter(value);
  let en = 0, de = 0;
  for (const token of tokens) {
    if (EN.has(token)) en++;
    if (DE.has(token)) de++;
  }
  return { tokens: tokens.length, en, de };
}

/**
 * Schreiblaeufe sind absichtlich doppelt verriegelt. Ein leerer/anders geschriebener Wert
 * bedeutet Vorschau. Damit wird aus einem fehlenden Workflow-Input niemals ein Live-Lauf.
 */
export function cjImportWriteFreigegeben(env = process.env) {
  return String(env.DRY_RUN ?? env.DRY ?? '1') === '0'
    && String(env.CJ_IMPORT_WRITE_APPROVED ?? '') === '1';
}

/** Live gelesene Shop-Identitaet; fehlende Felder und Abweichungen blockieren jeden Write. */
export function pruefeCjShopIdentitaet(shop, configuredHost) {
  const host = String(configuredHost ?? '').trim().toLowerCase();
  const gelesen = {
    name: String(shop?.name ?? ''),
    myshopifyDomain: String(shop?.myshopifyDomain ?? '').toLowerCase(),
    primaryDomain: String(shop?.primaryDomain?.host ?? '').toLowerCase(),
    currencyCode: String(shop?.currencyCode ?? '').toUpperCase(),
  };
  const gruende = [];
  if (host !== CJ_IMPORT_SHOP) gruende.push('konfigurierter Shopify-Shop weicht ab');
  if (gelesen.name !== CJ_IMPORT_SHOP_NAME) gruende.push('Shopname weicht ab oder fehlt');
  if (gelesen.myshopifyDomain !== CJ_IMPORT_SHOP) gruende.push('myshopifyDomain weicht ab oder fehlt');
  if (gelesen.primaryDomain !== CJ_IMPORT_PRIMARY_DOMAIN) gruende.push('primaere Domain weicht ab oder fehlt');
  if (gelesen.currencyCode !== CJ_IMPORT_WAEHRUNG) gruende.push('Shopwaehrung weicht ab oder fehlt');
  return { status: gruende.length ? 'BLOCKED' : 'OK', gruende, shop: gelesen };
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

  const titelSignal = sprachSignal(title);
  const beschreibungSignal = sprachSignal(html);
  if (titelSignal.en >= 2 && titelSignal.en > titelSignal.de) {
    gruende.push(`Titel hat ueberwiegend englische Sprachsignale (${titelSignal.en}:${titelSignal.de})`);
  }
  if (beschreibungSignal.en >= 2 && beschreibungSignal.en > beschreibungSignal.de) {
    gruende.push(`Beschreibung hat ueberwiegend englische Sprachsignale (${beschreibungSignal.en}:${beschreibungSignal.de})`);
  }
  // Ein laengerer Satz ohne irgendein deutsches Funktionswort ist fuer einen autonomen Import
  // nicht hinreichend als Deutsch belegt. Kurze Nomen-Titel bleiben zulaessig.
  if (beschreibungSignal.tokens >= 5 && beschreibungSignal.de === 0) {
    gruende.push('Beschreibung enthaelt kein belastbares deutsches Sprachsignal');
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
