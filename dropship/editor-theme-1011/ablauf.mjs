// Ablauf des Einspielens (rein, Abhängigkeiten eingespeist; Test: ablauf_test.mjs). Exit: 0 ok · 3 schon eingespielt · 4 Ausgangslage/Lesefehler/Sicherung · 5 Schreibfehler (Rückweg)
// · 6 Rücklesen weicht ab (Rückweg) · 7 Seitenprüfung fehlgeschlagen (Rückweg) · 8 Rückweg fehlgeschlagen · 9 Storefront nicht messbar (Rückweg aus Vorsicht).
// Der Rückweg schreibt NIE einen alten Schnappschuss zurück: frisch lesen, genau die eigenen Änderungen umkehren, alles andere bleibt.
import { SCHRITTE, zustand, allesAnwenden, allesZurueck, dateien } from './patch.mjs';
export const ZEIT = { RUECKLESEN_VERSUCHE: 10, RUECKLESEN_PAUSE: 15000, STOREFRONT_RUNDEN: 6, PAUSE_ZWISCHEN_SEITEN: 8000, PAUSE_DROSSELUNG: 60000, PAUSE_CACHE: 20000 };
const SEITEN = { editor: 'https://luxestyle.ch/products/bio-jutebeutel-selbst-gestalten', gesperrt: 'https://luxestyle.ch/products/magnet-zum-selbstgestalten', start: 'https://luxestyle.ch/' };
export async function ablauf(d, o) {
  const { lesenAlle, schreiben, seite, warte, log, sicherungLesen, sicherungSchreiben } = d;
  const nur = o.nur || null; const aktiv = SCHRITTE.filter(s => !nur || nur.includes(s.id));
  const stand = t => aktiv.map(s => s.id + ':' + zustand(s, t[s.datei])).join(' ');
  const gleich = (a, b) => dateien().every(f => a[f] === b[f]);
  async function lesenBis(pruefe) { for (let i = 0; i < ZEIT.RUECKLESEN_VERSUCHE; i++) { await warte(ZEIT.RUECKLESEN_PAUSE); try { const t = await lesenAlle(); if (pruefe(t)) return t; } catch (e) { log('  Lesefehler', String(e.message || e)); } log('  Rücklesen noch nicht gleich (Versuch', i + 1, ')'); } return null; }
  async function storefront(neu) {
    let nurUnmessbar = true;
    for (let r = 0; r < ZEIT.STOREFRONT_RUNDEN; r++) {
      const hole = async u => { try { return await seite(u); } catch (e) { return { status: -1, text: String(e.message || e) }; } };
      const unm = x => x.status === 429 || x.status === 403 || x.status === -1 || x.status >= 500;
      const e = await hole(SEITEN.editor); if (unm(e)) { log('  Storefront Editor-Seite HTTP', e.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }
      await warte(ZEIT.PAUSE_ZWISCHEN_SEITEN);
      const g = await hole(SEITEN.gesperrt); if (unm(g)) { log('  Storefront Sperrseite HTTP', g.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }
      await warte(ZEIT.PAUSE_ZWISCHEN_SEITEN);
      const s = await hole(SEITEN.start); if (unm(s)) { log('  Storefront Startseite HTTP', s.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }
      nurUnmessbar = false;
      const liq = [e, g, s].some(x => /Liquid (syntax )?error/i.test(x.text));
      const has = (x, str) => x.text.includes(str);
      const t1 = has(e, 'id="lx-editor-tippflaeche-1011"'), t2e = has(e, 'prüfst es mit «Druckvorschau prüfen»'), t2g = has(g, 'derzeit nicht bestellbar. Die Begründung steht im Kasten weiter unten.');
      log('  Storefront:', `Editor ${e.status} T1 ${t1} T2 ${t2e} | Sperrseite ${g.status} T2 ${t2g} | Start ${s.status} T1 ${has(s, 'id="lx-editor-tippflaeche-1011"')} | Liquid-Fehler ${liq}`);
      if (e.status !== 200 || g.status !== 200 || s.status !== 200 || liq) return 'fehler';
      const erwartet = neu ? (!aktiv.some(x => x.id === 'T1') || (t1 && !has(s, 'id="lx-editor-tippflaeche-1011"'))) && (!aktiv.some(x => x.id === 'T2') || (t2e && t2g)) : !t1 && !t2e && !t2g;
      if (erwartet) return 'ok';
      await warte(ZEIT.PAUSE_CACHE);
    }
    return nurUnmessbar ? 'unmessbar' : 'fehler';
  }
  async function rueckweg(code) {
    try {
      const jetzt = await lesenAlle(); const ohne = allesZurueck(jetzt, nur);
      if (!gleich(jetzt, ohne)) { await schreiben(ohne, jetzt); const t = await lesenBis(x => gleich(x, ohne)); if (!t) { log('RÜCKWEG: Rücklesen weicht ab'); return 8; } }
      log('Rückweg gelaufen: nur die eigenen Änderungen umgekehrt'); return code;
    } catch (e) { log('RÜCKWEG FEHLGESCHLAGEN:', String(e.message || e), '| Sicherung liegt neben dem Werkzeug'); return 8; }
  }
  if (o.erwartetThemeId && o.themeId !== o.erwartetThemeId) { log('Das veröffentlichte Theme ist', o.themeId, 'erwartet', o.erwartetThemeId); return 4; }
  let jetzt; try { jetzt = await lesenAlle(); } catch (e) { log('Theme-Dateien nicht lesbar:', String(e.message || e)); return 4; }
  log('Stand:', stand(jetzt));
  if (o.zurueck) {
    let ohne; try { ohne = allesZurueck(jetzt, nur); } catch (e) { log(String(e.message)); return 4; }
    if (gleich(jetzt, ohne)) { log('Nichts zurückzunehmen'); return 0; }
    if (!o.live) { log('Trockenlauf Rücknahme, nichts geschrieben'); return 0; }
    try { await schreiben(ohne, jetzt); } catch (e) { log('Rücknahme fehlgeschlagen:', String(e.message || e)); return 8; }
    if (!(await lesenBis(x => gleich(x, ohne)))) { log('Rücklesen nach der Rücknahme weicht ab'); return 6; }
    const sf = await storefront(false); return sf === 'ok' ? 0 : sf === 'unmessbar' ? 9 : 7;
  }
  let neu; try { neu = allesAnwenden(jetzt, nur); } catch (e) { log(String(e.message)); return 4; }
  if (gleich(jetzt, neu)) { log('Alles schon eingespielt'); return 3; }
  log('Neuer Stand:', stand(neu));
  if (!o.live) { log('Trockenlauf, nichts geschrieben'); return 0; }
  try { sicherungSchreiben(jetzt); } catch (e) { log('Sicherung nicht schreibbar:', String(e.message || e)); return 4; }
  let nochmal; try { nochmal = await lesenAlle(); } catch (e) { log('Lesefehler vor dem Schreiben:', String(e.message || e)); return 4; }
  if (!gleich(nochmal, jetzt)) { log('Die Dateien haben sich seit dem ersten Lesen geändert: nichts geschrieben'); return 4; }
  try { await schreiben(neu, jetzt); } catch (e) { log('Schreiben fehlgeschlagen:', String(e.message || e)); return rueckweg(5); }
  try {
    if (!(await lesenBis(x => gleich(x, neu)))) { log('Rücklesen weicht ab: Rückweg'); return rueckweg(6); }
    log('Rücklesen GLEICH');
    const sf = await storefront(true);
    if (sf === 'ok') { log('Fertig: eingespielt, zurückgelesen, Storefront geprüft'); return 0; }
    log(sf === 'unmessbar' ? 'Storefront nicht messbar: Rückweg aus Vorsicht, später erneut' : 'Seitenprüfung fehlgeschlagen: Rückweg');
    return rueckweg(sf === 'unmessbar' ? 9 : 7);
  } catch (e) { log('Unerwartete Ausnahme nach dem Schreiben:', String(e.message || e), '→ Rückweg'); return rueckweg(7); }
}
