/**
 * storefront_wahrheit.mjs — prueft luxestyle.ch so, wie eine Kundin sie sieht.
 *
 * WARUM DAS NUR HIER GEHT (teuer gelernt 19.08.2026, zweimal an einem Tag):
 * Unsere eigene Rechenzentrums-IP bekommt vom Shopify-Edge eine EIGENE, stundenalte
 * Bot-Cache-Kopie. Belege damals: 125 Abrufe ueber 50 Minuten lieferten ausnahmslos die
 * alte Startseite, dieselbe Seite trug gleichzeitig alte UND neue Textbausteine, und
 * Stichproben schwankten dauerhaft — das sind mehrere parallele Kopien, keine
 * Konvergenz. `site_shot.mjs` teilt diese IP und beweist deshalb GAR NICHTS.
 * Der Hetzner-Server sitzt woanders im Netz. Er ist unser einziges ehrliches Fenster.
 *
 * Geprueft werden nur Dinge, die eine KUNDIN merkt, und jede Antwort ist ja/nein statt
 * Gefuehl. 77 % des Verkehrs ist Handy, also wird in Handy-Breite geladen.
 *
 * ⚠️ Rein lesend. Er meldet, er repariert nichts — Theme-Aenderungen gehoeren an die
 *    Admin-API, nicht in einen Browser.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const SEITEN = [
  // versuche: wie oft die Seite in EINEM Lauf geladen wird.
  // ⚠️ 20.09.2026: Die Startseite bekam vorher EINEN Abruf pro Tag — und genau das
  // machte den wichtigsten Befund unbrauchbar. Am 17.09. 19:49 und am 20.09. 00:08
  // lieferte Shopify statt der Startseite die eigene Fehlerseite («Beim Laden dieser
  // Website ist ein Fehler aufgetreten», 202 Zeichen Text), waehrend Kollektion und
  // FAQ im selben Lauf sauber luden. Dazwischen war sie gruen. Zwei rote von fuenf
  // Tagesmessungen sagen NICHT, wie oft eine Kundin das sieht — eine Momentaufnahme
  // traegt keine Rate. Darum mehrere Versuche je Lauf, und die Quittung weist sie
  // einzeln aus.
  { name: 'startseite', url: 'https://luxestyle.ch/', versuche: 5 },
  { name: 'kollektion', url: 'https://luxestyle.ch/collections/neu-eingetroffen', versuche: 2 },
  { name: 'faq',        url: 'https://luxestyle.ch/pages/faq', versuche: 2 },
];

/**
 * Fasst mehrere Ladeversuche EINER Seite zu einem Befund zusammen.
 *
 * Bewusst eine reine Funktion ohne Browser, damit sie pruefbar ist
 * (automation/browser/storefront_wahrheit.test.mjs).
 *
 * Regeln:
 *  - erreichbar = JEDER Versuch geladen. Ein einziger Fehlschlag ist ein Befund;
 *    fuer die Kundin, die ihn erwischt, ist der Shop kaputt.
 *  - Der Bericht nennt IMMER die Zaehlung (3/5), nie nur ja/nein — sonst ist am
 *    naechsten Tag wieder nicht zu unterscheiden, ob es ein Aussetzer war.
 *  - Der ERSTE Versuch laeuft ohne Cache-Bust (das sieht eine Kundin: evtl. eine
 *    Edge-Kopie, die gar nicht scheitern KANN), die weiteren mit (erzwungener
 *    Kalt-Render, der scheitern kann). Beide Zahlen stehen getrennt in der Quittung,
 *    weil sie verschiedene Fragen beantworten.
 */
export function bewerte_versuche(versuche) {
  if (!Array.isArray(versuche) || versuche.length === 0) {
    return { erreichbar: null, geladen: 0, versuche: 0, hinweis: 'keine Messung' };
  }
  const geladen = versuche.filter(v => v.geladen).length;
  const kalt = versuche.filter(v => v.kalt);
  const kalt_geladen = kalt.filter(v => v.geladen).length;
  return {
    erreichbar: geladen === versuche.length,
    geladen, versuche: versuche.length,
    warm_geladen: versuche.filter(v => !v.kalt && v.geladen).length,
    warm: versuche.filter(v => !v.kalt).length,
    kalt_geladen, kalt: kalt.length,
    zeichen_min: Math.min(...versuche.map(v => v.zeichen ?? 0)),
    zeichen_max: Math.max(...versuche.map(v => v.zeichen ?? 0)),
    fehlversuche: versuche.filter(v => !v.geladen)
      .map(v => ({ nr: v.nr, kalt: !!v.kalt, zeichen: v.zeichen ?? null, grund: v.grund || null })),
  };
}

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const befunde = [];
  for (const s of SEITEN) {
    const anzahl = s.versuche || 1;
    const versuche = [];
    let letzter = null;          // letzter GELADENER Versuch — er liefert die Inhaltspruefungen
    let erster = null;           // erster Versuch ueberhaupt — er liefert das Bild

    for (let nr = 1; nr <= anzahl; nr++) {
      // Versuch 1 ohne Parameter = was eine Kundin wirklich abruft (evtl. Edge-Kopie).
      // Ab Versuch 2 ein Parameter, der den Edge zwingt, neu zu rendern — nur so kann
      // ein Versuch ueberhaupt scheitern, und nur so misst man den echten Zustand.
      const kalt = nr > 1;
      const url = kalt ? `${s.url}${s.url.includes('?') ? '&' : '?'}frisch=${auftrag.id}-${nr}` : s.url;
      const seite = await ctx.newPage();
      let v = { nr, kalt, geladen: false };
      try {
        await seite.setViewportSize({ width: 390, height: 844 });   // 77 % Handy
        await seite.goto(url, { waitUntil: 'load', timeout: 60000 });
        await seite.waitForTimeout(nr === 1 ? 3500 : 1500);
        const text = await seite.locator('body').innerText().catch(() => '');
        const ziel = seite.url();

        // Handy-Breite: eine Seite, die breiter rendert als das Fenster, hat
        // Querscrollen — genau der Fehler vom 14.09. (1488 px auf 390 px Fenster).
        const breite = await seite.evaluate(() => ({
          dok: document.documentElement.scrollWidth, fenster: window.innerWidth,
        })).catch(() => null);

        v = {
          nr, kalt, ziel, text, breite,
          zeichen: text.length,
          geladen: !ist_anmeldeseite(ziel) && !ist_wandtext(text) && text.length > 400,
          wand: ist_wandtext(text) || undefined,
        };
        // Bild vom ERSTEN Versuch (Kundensicht) und zusaetzlich von jedem Fehlschlag —
        // ein Befund ohne Bild ist spaeter nicht mehr nachpruefbar.
        if (nr === 1 || !v.geladen) {
          const datei = path.join(ERGEBNIS,
            nr === 1 ? `${auftrag.id}-${s.name}.png` : `${auftrag.id}-${s.name}-fehlversuch${nr}.png`);
          await seite.screenshot({ path: datei, fullPage: false }).catch(() => {});
          v.bild = path.relative(REPO, datei);
        }
      } catch (e) {
        v = { nr, kalt, geladen: false, grund: String(e.message).slice(0, 200) };
      } finally { await seite.close().catch(() => {}); }

      versuche.push(v);
      if (nr === 1) erster = v;
      if (v.geladen) letzter = v;
    }

    const bilanz = bewerte_versuche(versuche);
    // Inhaltspruefungen an einem GELADENEN Versuch — an der Fehlerseite gemessen
    // haetten sie sonst «keine Versandzusage» gemeldet und damit einen zweiten,
    // erfundenen Befund erzeugt.
    const q = letzter || erster || {};
    const text = q.text || '';
    befunde.push({
      seite: s.name, ziel: q.ziel,
      erreichbar: bilanz.erreichbar,
      geladen: `${bilanz.geladen}/${bilanz.versuche}`,
      ohne_cachebust: `${bilanz.warm_geladen}/${bilanz.warm}`,
      kalt_gerendert: `${bilanz.kalt_geladen}/${bilanz.kalt}`,
      fehlversuche: bilanz.fehlversuche.length ? bilanz.fehlversuche : undefined,
      wand: q.wand,
      querscrollen: q.breite ? q.breite.dok > q.breite.fenster + 2 : null,
      breite: q.breite,
      versandzusage: /Gratis(-Versand)?\s*ab\s*CHF\s*50/i.test(text) ? 'CHF 50 — richtig'
                   : /Gratis(-Versand)?\s*ab\s*CHF\s*\d+/i.exec(text)?.[0] || 'keine gefunden',
      preis_sichtbar: /CHF\s*\d/.test(text),
      // Fehlertexte, die eine Kundin wirklich zu sehen bekaeme:
      fehlertexte: ['Liquid error', 'translation missing', 'undefined', '404',
                    'Diese Seite existiert nicht'].filter(f => text.includes(f)),
      zeichen: q.zeichen ?? null,
      zeichen_spanne: [bilanz.zeichen_min, bilanz.zeichen_max],
      bild: erster?.bild,
    });
  }
  const kaputt = befunde.filter(b => !b.erreichbar || b.querscrollen || (b.fehlertexte || []).length);
  return {
    zusammenfassung: kaputt.length
      ? `⚠️ ${kaputt.length} von ${befunde.length} Seiten mit Befund: `
        + kaputt.map(b => `${b.seite} (${b.geladen} geladen)`).join(', ')
      : `✅ ${befunde.length} Seiten sauber, jede mehrfach geladen `
        + `(${befunde.map(b => b.geladen).join(' · ')}) — von echter Besucher-IP`,
    befunde,
  };
}
