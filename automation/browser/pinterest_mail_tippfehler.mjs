/**
 * pinterest_mail_tippfehler.mjs — korrigiert EIN Feld: die Kontakt-E-Mail im Pinterest-Profil.
 *
 * GEMESSEN am 17.09.2026 (Auftrag 30, rein lesend): das Feld `partner_contact_email` trägt
 *
 *     info@luxestlye.ch          ← «luxestlye» statt «luxestyle»
 *
 * Über dieses Feld laufen Kooperationsanfragen von Pinterest. Sie gehen ins Leere, und zwar
 * still: niemand bekommt eine Fehlermeldung ausser dem Absender.
 *
 * ⚠️ WARUM DIESES SKRIPT GEGEN EINE MESSUNG GESCHRIEBEN IST, NICHT GEGEN EINE VORSTELLUNG:
 * Am selben Tag hat ein geratener Selektor eine 117-Zeilen-CSV in das BILDFELD eines Pins
 * gehängt (Quittung 27). Deshalb steht hier nur, was Auftrag 30 wirklich gesehen hat:
 *   Feld   input#partner_contact_email (name und id gleich, KEIN data-test-id)
 *   Knopf  «Speichern», beim Laden `aria-disabled=true`
 * Der deaktivierte Speichern-Knopf ist dabei der Freund des Skripts: er wird erst aktiv, wenn
 * Pinterest eine Änderung registriert hat. **Bleibt er deaktiviert, ist die Eingabe nicht
 * angekommen — dann wird nicht geklickt, sondern berichtet.**
 *
 * ⛔ Es wird NUR dieses eine Feld angefasst, und nur wenn darin exakt der bekannte Tippfehler
 * steht. Jeder andere Wert (auch die richtige Adresse) führt zum Abbruch ohne Schreibvorgang.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext, hat_ziel_erreicht } from '../../server/anmelde_erkennung.mjs';

const ZIEL = 'https://ch.pinterest.com/settings/';
const FALSCH = 'info@luxestlye.ch';
const RICHTIG = 'info@luxestyle.ch';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  const schritte = [], bilder = [];
  const schuss = async (name) => {
    const datei = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: datei, fullPage: false });
    bilder.push(path.relative(REPO, datei));
  };
  const werfen = (nachricht, extra = {}) => {
    const e = new Error(nachricht);
    e.teilergebnis = { schritte, bilder, ...extra };
    Object.assign(e, extra);
    return e;
  };

  try {
    await seite.setViewportSize({ width: 1500, height: 1100 });
    await seite.goto(ZIEL, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(6000);
    const gelandet = seite.url();
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 4000);
    if (ist_anmeldeseite(gelandet)) throw werfen(`nicht angemeldet — ${gelandet}`, { nichtAngemeldet: true });
    if (ist_wandtext(text)) throw werfen(`Bot-Wand: ${text.slice(0, 120)}`, { umgeleitet: true });
    if (!hat_ziel_erreicht(ZIEL, gelandet)) throw werfen(`umgeleitet: ${ZIEL} → ${gelandet}`, { umgeleitet: true });
    await schuss('1-vorher');

    const feld = seite.locator('input#partner_contact_email');
    if (await feld.count() !== 1)
      return { geaendert: false, grund: `Feld partner_contact_email ${await feld.count()}× gefunden — erwartet genau 1. NICHTS geaendert.`, schritte, bilder };

    const vorher = await feld.inputValue();
    schritte.push(`Feld gelesen: «${vorher}»`);
    if (vorher === RICHTIG)
      return { geaendert: false, grund: 'Adresse ist bereits richtig — nichts zu tun.', vorher, schritte, bilder };
    if (vorher !== FALSCH)
      return { geaendert: false, grund: `Unerwarteter Wert «${vorher}» — das Skript aendert NUR den bekannten Tippfehler «${FALSCH}». NICHTS geaendert.`, vorher, schritte, bilder };

    await feld.fill(RICHTIG);
    await seite.waitForTimeout(1500);
    const jetzt = await feld.inputValue();
    if (jetzt !== RICHTIG)
      throw werfen(`Eingabe nicht uebernommen: Feld steht auf «${jetzt}»`, { vorher });
    schritte.push(`Feld gesetzt auf «${RICHTIG}»`);
    await schuss('2-eingegeben');

    // Der Speichern-Knopf ist die Quittung der Seite: er wird erst klickbar, wenn Pinterest
    // die Aenderung registriert hat. Bleibt er tot, wurde nichts uebernommen.
    const speichern = seite.locator('button,[role="button"]').filter({ hasText: /^speichern$/i });
    if (await speichern.count() !== 1)
      return { geaendert: false, grund: `«Speichern» ${await speichern.count()}× gefunden — erwartet genau 1. NICHT gespeichert.`, vorher, schritte, bilder };
    let aktiv = false;
    for (let i = 0; i < 10 && !aktiv; i++) {
      aktiv = await speichern.first().isEnabled().catch(() => false)
           && (await speichern.first().getAttribute('aria-disabled')) !== 'true';
      if (!aktiv) await seite.waitForTimeout(600);
    }
    if (!aktiv)
      return { geaendert: false, grund: 'Speichern-Knopf blieb deaktiviert — Pinterest hat die Eingabe nicht als Aenderung erkannt. NICHT gespeichert.', vorher, schritte, bilder };

    await speichern.first().click({ timeout: 15000 });
    await seite.waitForTimeout(5000);
    await schuss('3-nach-speichern');

    // Gegenprobe: Seite neu laden und das Feld erneut lesen. Ein Klick ist kein Beweis.
    await seite.reload({ waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(6000);
    const nachher = await seite.locator('input#partner_contact_email').inputValue().catch(() => '(nicht lesbar)');
    await schuss('4-nachgelesen');
    schritte.push(`Nach dem Neuladen steht im Feld: «${nachher}»`);
    return { geaendert: nachher === RICHTIG, vorher, nachher,
             grund: nachher === RICHTIG ? 'Adresse korrigiert und nach dem Neuladen bestaetigt.'
                                        : 'Gespeichert, aber nach dem Neuladen steht ein anderer Wert — bitte von Hand ansehen.',
             schritte, bilder };
  } finally { await seite.close().catch(() => {}); }
}
