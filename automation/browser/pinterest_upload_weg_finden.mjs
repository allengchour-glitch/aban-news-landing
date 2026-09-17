/**
 * pinterest_upload_weg_finden.mjs — findet Pinterests Massen-Upload. REIN LESEND.
 *
 * WARUM MESSEN STATT RATEN (zweimal bezahlt am 17.09.2026):
 *  · `/pin-creation-tool/` → leitete auf den Feed um, «kein Dateifeld gefunden»
 *  · `/board-create/`      → gibt es nicht, «Wir konnten diese Idee nicht finden!»
 * Beide Male war meine Adresse erfunden, und beide Male sah die Fehlermeldung so aus,
 * als laege es an der Seite. **Eine Adresse, die man nicht gemessen hat, ist eine
 * Vermutung** — und eine Vermutung erzeugt eine Quittung, die nach Befund aussieht.
 *
 * Dieses Skript probiert Kandidaten und sucht zusaetzlich auf Business-Hub und
 * Profilseite nach Einstiegen, die «Massen», «Bulk» oder «CSV» heissen. Es klickt
 * nichts an und laedt nichts hoch — es berichtet, welche Tuer offen ist.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const KANDIDATEN = [
  `${HOST}/pin-builder/`,
  `${HOST}/business/hub/`,
  `${HOST}/business/create/`,
  `${HOST}/bulk-create-pins/`,
  `${HOST}/pin-creation-tool/`,
  // ── Nachtrag 17.09., nach Auftrag 27 ──────────────────────────────────────────
  // Die erste Runde fand auf KEINER dieser Seiten einen Massen-/CSV-Einstieg — und
  // ich habe daraus trotzdem einen Upload-Versuch gemacht, der die CSV ins Bildfeld
  // eines einzelnen Pins gehaengt hat. Die Seite hiess «Pin fuer ANZEIGE erstellen»:
  // das Konto steht im Werbe-Zusammenhang, und Pinterests Massen-Editor lebt dort,
  // nicht im organischen Profil. Also die Werbe-Seite mitmessen, bevor wieder jemand
  // einen Upload-Weg annimmt, den niemand gesehen hat.
  'https://ads.pinterest.com/',
  `${HOST}/business/pins/`,
];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const befunde = [];
  for (const url of KANDIDATEN) {
    const seite = await ctx.newPage();
    try {
      await seite.goto(url, { waitUntil: 'load', timeout: 45000 });
      await seite.waitForTimeout(4000);
      const ziel = seite.url();
      const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 8000);
      if (ist_anmeldeseite(ziel)) { const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e; }

      const dateifelder = await seite.locator('input[type="file"]').count();
      // Einstiege, die nach Massen-Upload klingen — mit ihrer Adresse, damit die
      // naechste Runde nicht wieder raten muss.
      const einstiege = await seite.$$eval('a,button,[role="button"]', els => els
        .map(e => ({ text: (e.innerText || '').trim().slice(0, 60),
                     href: e.getAttribute('href') || '' }))
        .filter(x => /massen|bulk|csv|mehrere|hochladen|upload/i.test(x.text + ' ' + x.href))
        .slice(0, 15));
      const d = path.join(ERGEBNIS, `${auftrag.id}-${url.replace(/[^a-z0-9]/gi, '').slice(-22)}.png`);
      await seite.screenshot({ path: d, fullPage: false });

      befunde.push({
        url, ziel,
        umgeleitet: !ziel.startsWith(url.replace(/\/$/, '')),
        wand: ist_wandtext(text) || undefined,
        dateifelder,
        einstiege,
        nicht_gefunden: /konnten diese Idee nicht finden|couldn't find that/i.test(text) || undefined,
        bild: path.relative(REPO, d),
      });
    } catch (e) {
      if (e.nichtAngemeldet) throw e;
      befunde.push({ url, fehler: String(e.message).slice(0, 140) });
    } finally { await seite.close().catch(() => {}); }
  }
  const mitFeld = befunde.filter(b => b.dateifelder > 0).map(b => b.ziel);
  const mitEinstieg = befunde.filter(b => (b.einstiege || []).length).map(b => ({ ziel: b.ziel, einstiege: b.einstiege }));
  return {
    zusammenfassung: mitFeld.length ? `Dateifeld gefunden auf: ${mitFeld.join(', ')}`
      : mitEinstieg.length ? `kein Dateifeld, aber ${mitEinstieg.length} Seite(n) mit passendem Einstieg`
      : 'weder Dateifeld noch Einstieg — Massen-Upload liegt woanders oder heisst anders',
    seiten_mit_dateifeld: mitFeld,
    seiten_mit_einstieg: mitEinstieg,
    befunde,
  };
}
