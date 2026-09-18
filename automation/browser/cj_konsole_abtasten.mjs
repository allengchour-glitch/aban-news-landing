/**
 * cj_konsole_abtasten.mjs — findet heraus, OB und WO die CJ-Konsole erreichbar ist.
 *
 * Anlass, gemessen 18.09.2026 in Auftrag 32: Die Anmelde-Runde meldete CJ als
 * «angemeldet: true» bei der Endadresse `cjdropshipping.com/404`. Das war ein
 * Fehlbefund (die vierte Schicht in server/anmelde_erkennung.mjs fängt ihn jetzt),
 * aber die eigentliche Frage ist damit OFFEN, nicht beantwortet: `/myCJ/orderList`
 * gibt es nicht mehr. Entweder hat CJ die Konsole umgebaut, oder man wird ohne
 * Anmeldung dorthin geworfen.
 *
 * Warum das zählt: die Erstattung über USD 25.54 für das zurückgesandte Messer
 * (#1017) lässt sich per API NICHT beantragen — `disputes/create` gibt hartnäckig
 * 9009, während die Vorschau `disputeConfirmInfo` mit maxAmount 25.54 antwortet.
 * Die Konsole ist der einzige bekannte Rückfallweg. Ob es ihn gibt, ist eine
 * Messung, keine Vermutung.
 *
 * ⛔ REIN LESEND. Kein Klick, kein Formular, keine Reklamation. Hier wird die
 * Landkarte gezeichnet; wer danach etwas absendet, tut das in einem eigenen
 * Auftrag mit Selektoren AUS DIESER MESSUNG. Genau diese Reihenfolge fehlte am
 * 17.09. bei Pinterest, wo ein Skript eine 117-Zeilen-CSV ins Bildfeld eines
 * einzelnen Werbe-Pins hängte, weil niemand vorher gelesen hatte, was dasteht.
 */
import { ist_anmeldeseite, hat_ziel_erreicht, ist_wandtext, ist_fehlerseite }
  from '../../server/anmelde_erkennung.mjs';

// Von der bekannten Adresse zu den plausiblen Umbauten. Die Startseite steht
// ABSICHTLICH dabei: sie beantwortet «bin ich überhaupt angemeldet?» unabhängig
// davon, ob eine der Unterseiten noch existiert.
const KANDIDATEN = [
  'https://cjdropshipping.com/',
  'https://app.cjdropshipping.com/',
  'https://cjdropshipping.com/myCJ/orderList',
  'https://cjdropshipping.com/my-cj/order-list',
  'https://cjdropshipping.com/dashboard',
  'https://app.cjdropshipping.com/dashboard',
];

export default async function ({ ctx, auftrag, REPO, ERGEBNIS }) {
  const fs   = await import('node:fs');
  const path = await import('node:path');
  const befunde = [];
  const bilder  = [];

  for (const [i, url] of KANDIDATEN.entries()) {
    const seite = await ctx.newPage();
    const b = { url };
    try {
      const antwort = await seite.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await seite.waitForTimeout(3500);          // CJ baut die Seite per JavaScript
      b.status = antwort ? antwort.status() : null;
      b.ziel   = seite.url();
      b.fehlerseite = ist_fehlerseite(b.status, b.ziel) || null;

      const text = await seite.evaluate(() => document.body.innerText.slice(0, 4000))
                              .catch(() => '');
      b.wand = ist_wandtext(text) ? text.trim().slice(0, 140) : null;
      b.textanfang = text.trim().replace(/\n{2,}/g, '\n').slice(0, 400);

      // Was ist anklickbar? NUR gelesen, nicht geklickt — und beschriftet, damit ein
      // spaeterer Auftrag echte Selektoren hat statt geratener.
      b.beschriftungen = await seite.evaluate(() =>
        [...document.querySelectorAll('a,button,[role=button]')]
          .map(e => (e.innerText || e.getAttribute('aria-label') || '').trim())
          .filter(s => s && s.length < 40)
          .slice(0, 40)
      ).catch(() => []);

      // Anmelde-Indizien, in beide Richtungen, damit nicht ein einzelnes Wort entscheidet.
      b.anmeldemaske = ist_anmeldeseite(b.ziel);
      b.ziel_erreicht = hat_ziel_erreicht(url, b.ziel);
      const tiefe = (s) => new RegExp(s, 'i').test(text);
      b.zeichen_angemeldet = ['abmelden', 'log ?out', 'sign ?out', 'mein konto', 'my cj', 'balance']
        .filter(tiefe);
      b.zeichen_abgemeldet = ['anmelden', 'sign ?in', 'log ?in', 'registrieren', 'sign ?up']
        .filter(tiefe);

      const datei = path.join(ERGEBNIS, `${auftrag.id}-${i + 1}.png`);
      await seite.screenshot({ path: datei, fullPage: false });
      bilder.push(path.relative(REPO, datei));
    } catch (e) {
      // Ein Fehler ist keine Aussage über die Konsole — sonst meldet eine tote
      // Leitung «gibt es nicht».
      b.fehler = String(e.message || e).slice(0, 200);
    } finally { await seite.close(); }
    befunde.push(b);
  }

  const brauchbar = befunde.filter(b =>
    !b.fehler && !b.fehlerseite && !b.wand && !b.anmeldemaske && b.zeichen_angemeldet?.length);

  return {
    frage: 'Gibt es einen erreichbaren CJ-Konsolenweg fuer den Dispute ueber USD 25.54?',
    antwort: brauchbar.length
      ? `JA — erreichbar und angemeldet: ${brauchbar.map(b => b.ziel).join(', ')}`
      : 'NEIN, keine der 6 Adressen war gleichzeitig erreichbar UND angemeldet. '
        + 'Siehe befunde: dort steht je Adresse Status, Endadresse, Textanfang und '
        + 'die Beschriftungen. Ein Nein mit Messung ist ein Ergebnis, kein Fehlschlag.',
    befunde, bilder,
  };
}
