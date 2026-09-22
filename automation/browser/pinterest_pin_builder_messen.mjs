/**
 * pinterest_pin_builder_messen.mjs — misst den Pin-Editor, bevor irgendjemand einen Pin erzeugt.
 *
 * ANLASS (22.09.2026, Betreiber «heute zu wenig auf seite besuchen, push mehr»): Pinterest bringt
 * ohne eigenes Zutun 71 Sitzungen in 30 Tagen (nur Katalog-Pins). Eigene Pins auf die sechs Boards
 * wären der einzige organische Kanal, den wir von hier aus selbst anschieben können — Instagram und
 * Facebook stehen unter dropship/_SOCIAL_STOPP, TikTok hat keine API-Freigabe.
 *
 * ⚠️ Lehre aus Auftrag 27 (17.09.): «Ein Dateifeld ist nicht das Dateifeld» — dort wurde eine CSV in das
 * Bildfeld eines Einzel-Pins gehängt, weil die Seite nie gemessen worden war. Dieses Skript ERZEUGT
 * NICHTS. Es öffnet den Pin-Editor, klickt eine Einführungstour weg (Schrittzähler «N von M»), macht
 * einen Screenshot und listet JEDES sichtbare Formularfeld und jeden Knopf mit Beschriftung,
 * Platzhalter, aria-label, Name und Typ. Daraus entsteht das eigentliche Pin-Skript — mit gemessenen
 * Selektoren. Beide Editor-Adressen werden probiert; welche trägt, steht im Ergebnis.
 */
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const ADRESSEN = ['/pin-creation-tool/', '/pin-builder/'];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  const bilder = [], schritte = [];
  const schuss = async (name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: d, fullPage: false });
    bilder.push(path.relative(REPO, d));
  };
  const ergebnis = { editor: null, felder: [], knoepfe: [], dateifelder: 0, tour: [], schritte, bilder };
  try {
    for (const adr of ADRESSEN) {
      await seite.goto(HOST + adr, { waitUntil: 'load', timeout: 60000 });
      await seite.waitForTimeout(5000);
      if (ist_anmeldeseite(seite.url())) {
        const e = new Error(`nicht angemeldet — ${seite.url()}`); e.nichtAngemeldet = true; throw e;
      }
      const text = await seite.locator('body').innerText().catch(() => '');
      const tot = /konnten diese (Idee|Seite) nicht finden|Seite nicht gefunden|Page not found/i.test(text);
      schritte.push(`${adr} → ${seite.url()} · ${tot ? 'TOT' : 'geladen'} · ${text.length} Zeichen`);
      if (tot) continue;
      ergebnis.editor = seite.url();
      break;
    }
    if (!ergebnis.editor) { await schuss('tot'); return ergebnis; }
    await schuss('1-roh');

    // Einführungstour: erkennbar am Schrittzähler «1 von 4»; bis zu 6× «Weiter/Fertig/Schliessen»
    for (let i = 0; i < 6; i++) {
      const zaehler = await seite.locator('text=/\\b\\d+ von \\d+\\b/').first().innerText({ timeout: 1500 }).catch(() => null);
      if (!zaehler) break;
      ergebnis.tour.push(zaehler);
      const knopf = seite.locator('button:visible,div[role="button"]:visible')
        .filter({ hasText: /^(Weiter|Fertig|Verstanden|Los geht|Schliessen|Schließen|Überspringen|Next|Done|Got it)/i });
      const n = await knopf.count();
      if (!n) { schritte.push(`Tour ${zaehler}: kein Weiter-Knopf`); break; }
      await knopf.first().click({ timeout: 5000 }).catch(() => {});
      await seite.waitForTimeout(1200);
    }
    if (ergebnis.tour.length) await schuss('2-nach-tour');

    // Alles, was ein Mensch ausfüllen oder drücken könnte — nur SICHTBARES.
    ergebnis.felder = await seite.$$eval('input,textarea,select,[contenteditable="true"]', els => els
      .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return (r.width > 0 && r.height > 0 && s.visibility !== 'hidden') || e.type === 'file'; })
      .map(e => ({ tag: e.tagName.toLowerCase(), type: e.type || null, name: e.name || null, id: e.id || null,
        placeholder: e.placeholder || null, aria: e.getAttribute('aria-label') || null,
        labelledby: e.getAttribute('aria-labelledby') || null, accept: e.getAttribute('accept') || null,
        editable: e.getAttribute('contenteditable') || null, text: (e.innerText || e.value || '').trim().slice(0, 60) })));
    ergebnis.dateifelder = ergebnis.felder.filter(f => f.type === 'file').length;
    ergebnis.knoepfe = await seite.$$eval('button,div[role="button"],a[role="button"]', els => els
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map(e => ({ text: (e.innerText || '').trim().slice(0, 50), aria: e.getAttribute('aria-label') || null,
        testid: e.getAttribute('data-test-id') || null, disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true' }))
      .filter(k => k.text || k.aria || k.testid).slice(0, 80));
    // Board-Auswahl: gibt es eine Schaltfläche, die nach «Pinnwand/Board auswählen» aussieht?
    ergebnis.board_wahl = ergebnis.knoepfe.filter(k => /pinnwand|board|auswählen|choose/i.test((k.text || '') + ' ' + (k.aria || ''))).slice(0, 8);
    schritte.push(`Felder ${ergebnis.felder.length} (davon Datei ${ergebnis.dateifelder}) · Knöpfe ${ergebnis.knoepfe.length} · Tour ${ergebnis.tour.length} Schritte`);
    return ergebnis;
  } finally { await seite.close().catch(() => {}); }
}
