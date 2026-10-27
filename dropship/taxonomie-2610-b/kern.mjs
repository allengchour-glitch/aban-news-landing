/**
 * Kern der Taxonomie «Rest des Shops» (alles ausser Mode): EINE Auswertungsfunktion, rein, ohne Netz.
 * Gleiche Regelsprache wie die Mode-Taxonomie (dropship/mode-taxonomie-2610/pruef_kern.mjs), nur ohne Geschlecht:
 *   g_prefix   : Google-Kategorie beginnt mit EINEM dieser Texte («Electronics > Communications > Telephony»)
 *   g_nicht    : Google-Kategorie beginnt mit KEINEM dieser Texte
 *   titel_muss : Titel trifft MINDESTENS EINE dieser Regexe (Gross/Klein egal). Ohne g_prefix ist das der einzige Einschluss, mit g_prefix kommt es dazu (UND)
 *   titel_nicht: Titel trifft KEINE dieser Regexe
 *   tags_nicht : Produkt trägt keinen dieser Tags (die globalen Sperr-Tags gelten immer)
 * Wortgrenzen: JavaScript-`\b` kennt keine Umlaute. Anfang: `(^|[^a-zäöüß])wort`, Ende: `wort(?![a-zäöüß])`.
 */
import { SPERR_TAGS_TAXONOMIE } from '../../automation/lib/sperr_tags.mjs';

const rxCache = new Map();
export const R = s => { let r = rxCache.get(s); if (!r) { r = new RegExp(s, 'i'); rxCache.set(s, r); } return r; };

export const SPERR_TAGS = SPERR_TAGS_TAXONOMIE;   // = Basisliste der Engine + google-gesperrt-adult, lizenz-nicht-bewerben, fortura (automation/lib/sperr_tags.mjs)
export const gesperrt = p => (p.tags || []).some(t => SPERR_TAGS.includes(t));

/** Produkt aus dem Katalog (productType, g) in die Form der Regeln bringen. */
export const normiere = p => ({ ...p, type: p.type ?? p.productType ?? '', tags: p.tags || [], g: p.g || '' });

/** Gehört das Produkt in die Kategorie `k` (Regel-Datensatz)? Sperr-Tags schliessen immer aus. */
export function passt(k, p) {
  if (gesperrt(p)) return false;
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  const gp = k.g_prefix || [], tm = k.titel_muss || [];
  if (gp.length) { if (!gp.some(x => g.startsWith(x))) return false; }
  else if (!tm.some(s => R(s).test(t))) return false;
  if (tm.length && !tm.some(s => R(s).test(t))) return false;
  if ((k.titel_nicht || []).some(s => R(s).test(t))) return false;
  if ((k.g_nicht || []).some(x => g.startsWith(x))) return false;
  if ((k.tags_nicht || []).some(x => tg.includes(x))) return false;
  return true;
}

/** Unterfilter: nur Titel-Regeln, wirken NUR auf Produkte der Eltern-Kategorie. */
export function imUnterfilter(u, p) {
  const t = p.title || '';
  return (!(u.titel_muss || []).length || u.titel_muss.some(s => R(s).test(t))) && !(u.titel_nicht || []).some(s => R(s).test(t));
}

/** Universum eines Bereichs: ODER-Regel (Google-Präfix ODER Titel), minus Ausschluss. Dient nur der Lückenmessung. */
export function imUniversum(u, p) {
  if (gesperrt(p)) return false;
  const g = p.g || '', t = p.title || '';
  const drin = (u.g_prefix || []).some(x => g.startsWith(x)) || (u.titel_muss || []).some(s => R(s).test(t));
  if (!drin) return false;
  if ((u.g_nicht || []).some(x => g.startsWith(x))) return false;
  return !(u.titel_nicht || []).some(s => R(s).test(t));
}

export const HANDLE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
