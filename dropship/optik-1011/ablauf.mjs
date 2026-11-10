// Der Ablauf des Einspielens als reine Funktion mit eingespeisten Abhängigkeiten (kein Netz, kein process.exit): so lässt er sich gegen eine Attrappe testen (apply_test.mjs).
//
// Rückgabe (= Exit-Code von apply.mjs):
//   0 ok · 3 schon eingespielt · 4 unerwarteter Stand / Sicherung / Lesefehler · 5 userErrors beim Schreiben (Rückweg geprüft) · 6 Rücklesen weicht ab (Rückweg gelaufen)
//   7 Seitenprüfung fehlgeschlagen (Rückweg gelaufen) · 8 Rückweg selbst fehlgeschlagen · 9 Storefront nicht messbar, nur HTTP 403/429/5xx (Rückweg aus Vorsicht gelaufen)
//   10 unerwartete Ausnahme nach dem Schreiben (Rückweg gelaufen)
// Im Rücknahme-Zweig (ZURUECK): 0 ok · 4 Block nicht genau einmal / nicht lesbar · 6 Rücklesen weicht ab · 7 Storefront zeigt den Block noch · 8 Schreiben der Rücknahme fehlgeschlagen · 9 Storefront nicht messbar.
// Laufzeit im ungünstigen Fall (Storefront dauerhaft gedrosselt) rund 10 Minuten: nie mit dem Standard-Zeitlimit im Vordergrund starten. Nach einem Abbruch IMMER zuerst die Storefront lesen
// oder `ZURUECK=1 LIVE=1` fahren; ein erneuter Lauf meldet bei vorhandenem Block nur Exit 3, ohne zu prüfen.
//
// Der Rückweg schreibt NIE einen alten Schnappschuss zurück: er liest frisch, entfernt genau den eigenen Block (zuruecknehmen) und lässt alles, was jemand dazwischen an der Datei geändert hat.

export const ZEIT = { RUECKLESEN_VERSUCHE: 10, RUECKLESEN_PAUSE: 15000, STOREFRONT_RUNDEN: 8, PAUSE_ZWISCHEN_SEITEN: 8000, PAUSE_DROSSELUNG: 60000, PAUSE_CACHE: 20000, RUECKWEG_VERSUCHE: 3, RUECKWEG_PAUSE: 5000, ABWESEND_LESUNGEN: 2 };

export async function ablauf(d, opt) {
  const { lesen, schreiben, seite, warte, log, anwenden, zuruecknehmen, MARKE, sicherungLesen, sicherungSchreiben } = d;
  const hatBlock = (t) => typeof t === 'string' && t.includes(`id="${MARKE}`);

  async function zurueckLesenBis(pruefe) {
    for (let i = 0; i < ZEIT.RUECKLESEN_VERSUCHE; i++) {
      await warte(ZEIT.RUECKLESEN_PAUSE);
      let j;
      try { j = await lesen(); } catch (e) { log('  Rücklesen: Lesefehler', String(e && e.message || e), '(Versuch', i + 1, ')'); continue; }
      if (pruefe(j)) return true;
      log('  Rücklesen noch nicht gleich (Versuch', i + 1, ')');
    }
    return false;
  }

  // Eine Operation bis zu dreimal mit wachsender Pause (Netzfehler, 5xx).
  async function mitWiederholung(fn, was) {
    let letzter;
    for (let i = 0; i < ZEIT.RUECKWEG_VERSUCHE; i++) {
      try { return await fn(); } catch (e) { letzter = e; log('  ' + was + ': Fehler', String(e && e.message || e), '(Versuch', i + 1, ')'); if (i < ZEIT.RUECKWEG_VERSUCHE - 1) await warte(ZEIT.RUECKWEG_PAUSE * (i + 1)); }
    }
    throw letzter;
  }

  // Storefront: 'ok' | 'fehler' | 'unmessbar'. Bei 403/429/5xx/Netzfehler wird gewartet und wiederholt (die Startseite wird in solchen Runden nicht zusätzlich abgerufen).
  async function storefront(erwarteBlock) {
    const produkt = 'https://luxestyle.ch/products/rizinusol-wickel-wiederverwendbar-bauch-nacken';
    let nurUnmessbar = true;
    for (let i = 0; i < ZEIT.STOREFRONT_RUNDEN; i++) {
      const hole = async (u) => { try { return await seite(u); } catch (e) { return { status: -1, text: String(e && e.message || e) }; } };
      const unmessbar = (r) => r.status === 429 || r.status === 403 || r.status === -1 || r.status >= 500;
      const p = await hole(produkt);
      if (unmessbar(p)) { log('  Storefront: HTTP', p.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }
      await warte(ZEIT.PAUSE_ZWISCHEN_SEITEN);
      const h = await hole('https://luxestyle.ch/');
      if (unmessbar(h)) { log('  Storefront: Startseite HTTP', h.status, '(nicht messbar), warte'); await warte(ZEIT.PAUSE_DROSSELUNG); continue; }
      nurUnmessbar = false;
      const liquidFehler = /Liquid (syntax )?error/i.test(p.text) || /Liquid (syntax )?error/i.test(h.text);
      const m = (t, g) => t.includes(`id="${MARKE}-${g}"`);
      log('  Storefront:', `Produkt ${p.status} alle ${m(p.text, 'alle')} produkt ${m(p.text, 'produkt')} start ${m(p.text, 'start')} | Start ${h.status} alle ${m(h.text, 'alle')} start ${m(h.text, 'start')} produkt ${m(h.text, 'produkt')} | Liquid-Fehler ${liquidFehler}`);
      if (liquidFehler) { const z = (p.text.match(/Liquid (syntax )?error[^<\n]{0,200}/i) || h.text.match(/Liquid (syntax )?error[^<\n]{0,200}/i) || [''])[0]; log('  Liquid-Fehler auf der Seite:', z, '(ob er vom Block kommt, nach dem Rückweg prüfen)'); }
      if (p.status !== 200 || h.status !== 200 || liquidFehler) return 'fehler';
      const sollMit = m(p.text, 'alle') && m(p.text, 'produkt') && !m(p.text, 'start') && m(h.text, 'alle') && m(h.text, 'start') && !m(h.text, 'produkt');
      const sollOhne = !hatBlock(p.text) && !hatBlock(h.text);
      if (erwarteBlock ? sollMit : sollOhne) return 'ok';
      await warte(ZEIT.PAUSE_CACHE);   // Rand-Cache
    }
    return nurUnmessbar ? 'unmessbar' : 'fehler';
  }

  // Rückweg: frisch lesen, genau den eigenen Block entfernen, schreiben, kontrollieren. Gibt `codeWennOk` zurück, wenn danach kein Block mehr in der Datei steht, sonst 8.
  async function rueckweg(codeWennOk) {
    try {
      let aktuell = await mitWiederholung(lesen, 'Rückweg lesen');
      if (aktuell == null) { log('RÜCKWEG: theme.liquid nicht lesbar'); return 8; }
      // «Block nicht in der Datei» erst glauben, wenn auch spätere Lesungen ihn nicht zeigen (Shopify liefert nach dem Schreiben eine Weile den alten Stand).
      for (let i = 0; i < ZEIT.ABWESEND_LESUNGEN && !hatBlock(aktuell); i++) { await warte(ZEIT.RUECKLESEN_PAUSE); const nochmal2 = await mitWiederholung(lesen, 'Rückweg lesen'); if (nochmal2 == null) { log('RÜCKWEG: theme.liquid nicht lesbar'); return 8; } aktuell = nochmal2; }
      if (!hatBlock(aktuell)) { log('Rückweg: der Block steht nicht (mehr) in der Datei, nichts zurückzuschreiben'); return codeWennOk; }
      const ohne = zuruecknehmen(aktuell);
      await mitWiederholung(() => schreiben(ohne), 'Rückweg schreiben');
      const ok = await zurueckLesenBis((j) => j != null && !hatBlock(j));
      if (!ok) { log('RÜCKWEG: der Block steht nach dem Zurückschreiben noch in der Datei'); return 8; }
      log('Rückweg gelaufen: Block entfernt, alles andere in der Datei bleibt');
      return codeWennOk;
    } catch (e) {
      log('RÜCKWEG FEHLGESCHLAGEN:', String(e && e.message || e), '| theme.liquid von Hand prüfen, die Sicherung liegt neben dem Werkzeug');
      return 8;
    }
  }

  if (opt.erwartetThemeId && opt.themeId !== opt.erwartetThemeId) { log(`Das veröffentlichte Theme ist ${opt.themeId}, erwartet ${opt.erwartetThemeId}: nichts gelesen, nichts geschrieben (THEME_ID setzen, wenn das bewusst ein anderes ist)`); return 4; }
  let jetzt;
  try { jetzt = await lesen(); } catch (e) { log('theme.liquid nicht lesbar:', String(e && e.message || e)); return 4; }
  if (jetzt == null) { log('theme.liquid nicht lesbar'); return 4; }
  log('theme.liquid', jetzt.length, 'Zeichen');

  if (opt.zurueck) {
    let ohne;
    try { ohne = zuruecknehmen(jetzt); } catch (e) { log(String(e.message)); return 4; }
    let sich = null;
    try { sich = sicherungLesen(); } catch { /* Sicherung ist nur Zusatzprüfung */ }
    if (sich != null && ohne !== sich) log('Hinweis: der Stand ohne Block weicht von der Sicherung ab (jemand hat theme.liquid seit dem Einspielen geändert); diese Änderung bleibt erhalten');
    log('Rücknahme: Block entfernen,', ohne.length, 'Zeichen bleiben');
    if (!opt.live) { log('Trockenlauf, nichts geschrieben'); return 0; }
    try {
      await schreiben(ohne);
      if (!(await zurueckLesenBis((j) => j != null && !hatBlock(j)))) { log('Rücklesen nach der Rücknahme weicht ab'); return 6; }
    } catch (e) { log('Rücknahme fehlgeschlagen:', String(e && e.message || e)); return 8; }
    log('Zurückgenommen und zurückgelesen: Block weg');
    const sf = await storefront(false);
    return sf === 'ok' ? 0 : sf === 'unmessbar' ? 9 : 7;
  }

  let neu;
  try { neu = anwenden(jetzt); } catch (e) { log(String(e.message)); return String(e.message).startsWith('schon') ? 3 : 4; }
  log('Neuer Stand:', neu.length, 'Zeichen (+' + (neu.length - jetzt.length) + ')');
  if (!opt.live) { log('Trockenlauf, nichts geschrieben'); return 0; }

  try { sicherungSchreiben(jetzt); } catch (e) { log('Sicherung nicht schreibbar, nichts geschrieben:', String(e && e.message || e)); return 4; }
  log('Sicherung geschrieben');
  let nochmal;
  try { nochmal = await lesen(); } catch (e) { log('Lesefehler vor dem Schreiben, nichts geschrieben:', String(e && e.message || e)); return 4; }
  if (nochmal !== jetzt) { log('theme.liquid hat sich seit dem ersten Lesen geändert: nichts geschrieben'); return 4; }

  try {
    await schreiben(neu);
  } catch (e) {
    log('Schreiben fehlgeschlagen:', String(e && e.message || e));
    return rueckweg(e && e.code === 5 ? 5 : 10);
  }
  try {
    // Gleich dem Soll? Oder, wenn jemand dazwischen etwas ändert, wenigstens: unser Block steht genau einmal drin und der Rest ist der Stand von vorher.
    const ok = await zurueckLesenBis((j) => j === neu);
    if (!ok) { log('Rücklesen weicht ab: Rückweg'); return rueckweg(6); }
    log('Rücklesen GLEICH');
    const sf = await storefront(true);
    if (sf === 'ok') { log('Fertig: Block eingespielt, zurückgelesen, Storefront geprüft'); return 0; }
    log(sf === 'unmessbar' ? 'Storefront nicht messbar (nur HTTP 403/429/5xx): Rückweg aus Vorsicht, später erneut LIVE=1 starten' : 'Seitenprüfung fehlgeschlagen: Rückweg');
    return rueckweg(sf === 'unmessbar' ? 9 : 7);
  } catch (e) {
    log('Unerwartete Ausnahme nach dem Schreiben:', String(e && e.message || e), '→ Rückweg');
    return rueckweg(10);
  }
}
