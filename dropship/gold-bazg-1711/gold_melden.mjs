#!/usr/bin/env node
// Meldung nach einem Lauf des Gold-Wächters (Workflow gold-waechter.yml) per Telegram. Reiner Kern + kleiner Aufrufer (gleiches Muster wie dropship/silber-bazg-1711/melden.mjs).
// Eingabe (Umgebung): LISTE (gold-waechter-liste.json des Laufs), LEDGER (Ledger des Laufs), APPLY_RC (Exit-Code des Schreibschritts, leer = nicht gelaufen),
//   LISTE_RC (Exit-Code des Lesens), MODUS ('live' | 'lesen'), LAUFLINK, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DRY=1 (nichts senden), ALWAYS_NOTIFY=1, FREIGABE=1.
// Gemeldet wird nur bei Treffern oder einem Fehler (keine Meldung an ruhigen Tagen). Hinweise auf vergoldete Ware mit Karat stehen nur in der Zusammenfassung des Laufs, nicht in Telegram.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Rücknahme eines Wächter-Laufs: die Sicherung dieses Laufs liegt nur als Artefakt, NICHT im Repo. */
export const RUECKNAHME = 'Rücknahme: 1) dropship/GOLD-WAECHTER-FREI.txt löschen (sonst entwirft der Wächter morgen wieder), 2) Artefakt «gold-waechter-protokoll» des Laufs herunterladen, 3) SICHERUNG=<Pfad>/gold-sicherung.json ZURUECK=1 LIVE=1 node dropship/gold-bazg-1711/gold_entwurf.mjs (ONLY=<handle,…> für einzelne Produkte), 4) Fehltreffer in dropship/gold-bazg-1711/gold-ausnahmen.json eintragen.';
const kurz = (liste, n = 8) => (liste?.eintraege || []).slice(0, n).map((e) => e.handle).join(', ') + ((liste?.eintraege?.length || 0) > n ? ` … (+${liste.eintraege.length - n})` : '');
const kurzOhne = (liste, n = 5) => (liste?.ohneBeleg || []).slice(0, n).map((e) => e.handle).join(', ') + ((liste?.ohneBeleg?.length || 0) > n ? ` … (+${liste.ohneBeleg.length - n})` : '');

/** Rückgabe {senden, text, rot, hinweis}. `rot` = der Lauf soll rot enden (Fehler). `hinweis` = Zeile nur für die Zusammenfassung des Laufs. */
export function meldung({ liste, ledgerZeilen = [], listeRc = '', applyRc = '', modus = 'lesen', lauflink = '', immer = false, freigabe = false }) {
  const anzahl = Number(liste?.anzahl ?? (liste?.eintraege || []).length ?? 0) || 0;
  const ohneBeleg = (liste?.ohneBeleg || []).length;
  const hinweise = (liste?.hinweise || []).length;
  const zeile = (art) => ledgerZeilen.filter((z) => String(z).split('|')[1] === art);
  const fehler = zeile('FEHLER').length + zeile('ABWEICHUNG').length;
  const link = lauflink ? `\n${lauflink}` : '';
  const hinweis = hinweise ? `Hinweis: ${hinweise} aktive Produkte nennen Karat auf vergoldeter Ware (Text bereinigen mit karat_texte.mjs): ${(liste.hinweise || []).slice(0, 8).map((e) => e.handle).join(', ')}` : '';
  const ohne = ohneBeleg ? ` Ausserdem ${ohneBeleg} Treffer ohne Belegsatz (nicht entworfen, bitte ansehen): ${kurzOhne(liste)}.` : '';
  // Fehlt sowohl der Exit-Code des Lesens als auch die Liste, ist der Schritt gar nicht gelaufen (Checkout, Node oder Pfade ausgefallen): das ist ein Fehler, kein ruhiger Tag.
  if (listeRc === '' && !liste) return { senden: true, rot: true, hinweis, text: `Gold-Wächter: FEHLER, der Katalog wurde nicht gelesen (kein Ergebnis des Lese-Schritts; ein früherer Schritt ist ausgefallen). Es wurde nichts geändert und nichts geprüft.${link}` };
  if (listeRc !== '' && Number(listeRc) !== 0) return { senden: true, rot: true, hinweis, text: `Gold-Wächter: FEHLER beim Lesen des Katalogs (Exit ${listeRc}). Es wurde nichts geändert.${link}` };
  if (liste?.zuViele) return { senden: true, rot: true, hinweis, text: `Gold-Wächter: ${anzahl} neue Treffer, mehr als die Obergrenze von ${liste.max ?? '?'} je Lauf. Das ist kein normaler Zufluss (Regel zu weit oder ein grosser Import?). Es wurde nichts geändert: ${kurz(liste)}. Bitte ansehen.${link}` };
  if (applyRc !== '' && Number(applyRc) !== 0) {
    return { senden: true, rot: true, hinweis, text: `Gold-Wächter: FEHLER beim Setzen auf Entwurf (Exit ${applyRc}; 2 = Liste unplausibel oder Sicherung fehlt, 6 = Rücklesen weicht ab). Treffer: ${anzahl}${anzahl ? ` (${kurz(liste)})` : ''}. Fehler im Protokoll: ${fehler}. Der Lauf ist fortsetzbar.${link}` };
  }
  if (anzahl === 0 && ohneBeleg === 0) return { senden: !!immer, rot: false, hinweis, text: `Gold-Wächter: in Ordnung, keine neuen Produkte mit Gold- oder Platin-Feingehaltsangabe.${link}` };
  if (anzahl === 0) return { senden: true, rot: false, hinweis, text: `Gold-Wächter: ${ohneBeleg} Treffer ohne Belegsatz, nichts entworfen: ${kurzOhne(liste)}. Bitte ansehen.${link}` };
  if (modus === 'live') {
    const fertig = zeile('ENTWURF').length;
    if (fertig === 0) return { senden: true, rot: false, hinweis, text: `Gold-Wächter: ${anzahl} Treffer, aber keiner wurde auf Entwurf gesetzt (alle übersprungen: Status oder Text hat sich geändert): ${kurz(liste)}. Bitte ansehen.${ohne}${link}` };
    return { senden: true, rot: false, hinweis, text: `Gold-Wächter: ${fertig} von ${anzahl} neuen Produkten mit Gold- oder Platin-Feingehaltsangabe auf ENTWURF gesetzt (Edelmetallkontrolle): ${kurz(liste)}.${ohne} ${RUECKNAHME}${link}` };
  }
  return { senden: true, rot: false, hinweis, text: `Gold-Wächter (nur gelesen${freigabe ? ', Handstart ohne Schreiben' : ', keine Freigabedatei'}): ${anzahl} Produkte mit Gold- oder Platin-Feingehaltsangabe sind aktiv: ${kurz(liste)}.${ohne} Zum Entwerfen: Handstart mit «schreiben» (nur mit Freigabedatei) oder gold_entwurf.mjs von Hand.${link}` };
}

/** Sendet die Meldung. `holen` ist austauschbar für den Test. Rückgabe true bei Erfolg. */
export async function sende(text, { token, chat, basis = 'https://api.telegram.org', holen = fetch } = {}) {
  if (!token || !chat) return false;
  try {
    const r = await holen(`${basis}/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }) });
    return !!r.ok;
  } catch { return false; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const E = process.env;
  const liste = E.LISTE && existsSync(E.LISTE) ? JSON.parse(readFileSync(E.LISTE, 'utf8')) : null;
  const ledgerZeilen = E.LEDGER && existsSync(E.LEDGER) ? readFileSync(E.LEDGER, 'utf8').split('\n').filter(Boolean) : [];
  const m = meldung({ liste, ledgerZeilen, listeRc: E.LISTE_RC ?? '', applyRc: E.APPLY_RC ?? '', modus: E.MODUS || 'lesen', lauflink: E.LAUFLINK || '', immer: E.ALWAYS_NOTIFY === '1', freigabe: E.FREIGABE === '1' });
  console.log(m.text);
  if (m.hinweis) console.log(m.hinweis);
  let zustellung = true;
  if (m.senden && E.DRY !== '1') {
    const ok = await sende(m.text, { token: E.TELEGRAM_BOT_TOKEN, chat: E.TELEGRAM_CHAT_ID, basis: E.TELEGRAM_BASIS || undefined });
    console.log(ok ? 'Telegram gesendet.' : 'Telegram: NICHT gesendet (Zugangsdaten fehlen oder Fehler). Der Lauf endet rot, damit die Meldung nicht still verloren geht.');
    zustellung = ok;
  } else console.log(m.senden ? 'Keine Telegram-Meldung (DRY).' : 'Nichts zu melden.');
  process.exit(m.rot || !zustellung ? 1 : 0);
}
