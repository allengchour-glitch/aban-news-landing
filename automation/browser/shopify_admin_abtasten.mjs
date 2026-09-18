/**
 * shopify_admin_abtasten.mjs — welche Admin-Seiten sind für den Agenten erreichbar?
 *
 * Anlass, gemessen 18.09.2026: Auftrag 34 (Dateispeicher) endete mit **HTTP 403** auf
 * `/settings/files` — gefangen von der vierten Wahrnehmungsschicht, die es an
 * demselben Tag erst dazugab. Vorher wäre daraus ein `stand: ok` mit einem Screenshot
 * einer Fehlerseite geworden.
 *
 * Aber ein gefangener Fehler ist noch keine Erklärung, und hier sind zwei möglich:
 *   (a) der Agent darf diese Seite wirklich nicht (Rolle, Berechtigung), oder
 *   (b) die 403 ist ein Artefakt — der Shopify-Admin ist eine Einzelseiten-Anwendung,
 *       und eine ihrer Navigationsantworten kann 403 sein, während die Seite lädt.
 * **Eine strenge Wache kann genauso irren wie eine blinde.** Fall (b) wäre ein
 * Fehlalarm, den ich selbst gebaut hätte — also wird er gemessen, nicht geglaubt.
 *
 * Deshalb tastet dieses Skript mehrere Adressen ab und meldet je Adresse Status,
 * Endadresse und ob echter Inhalt dasteht. Es RUFT `ist_fehlerseite` auf, statt sie zu
 * umgehen, und **bricht nicht ab** — der Befund ist hier das Ergebnis, nicht der Grund
 * zum Aufhören. `/settings/billing` ist als Kontrolle dabei: sie war in Auftrag 32
 * belegt erreichbar. Gibt sie jetzt 200 und `/settings/files` weiter 403, ist es (a).
 * Geben beide 403, ist die Wache zu streng und ich habe sie zu korrigieren.
 *
 * ⛔ REIN LESEND. Kein Klick, keine Einstellung, keine Datei wird angetastet.
 */
import { ist_anmeldeseite, ist_wandtext, ist_fehlerseite }
  from '../../server/anmelde_erkennung.mjs';

const SHOP = 'au3j0y-hq';
const SEITEN = [
  ['Kontrolle: Rechnung (war 32 belegt erreichbar)', `https://admin.shopify.com/store/${SHOP}/settings/billing`],
  ['Dateien (gab 403 in Auftrag 34)',                `https://admin.shopify.com/store/${SHOP}/settings/files`],
  ['Admin-Start',                                     `https://admin.shopify.com/store/${SHOP}`],
  ['Einstellungen allgemein',                         `https://admin.shopify.com/store/${SHOP}/settings/general`],
  ['Dateien ueber die alte Shop-Domain',              `https://${SHOP}.myshopify.com/admin/settings/files`],
];

export default async function ({ ctx, auftrag, REPO, ERGEBNIS }) {
  const path = await import('node:path');
  const befunde = [];
  const bilder = [];

  for (const [name, url] of SEITEN) {
    const seite = await ctx.newPage();
    const b = { name, url };
    try {
      const antwort = await seite.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await seite.waitForTimeout(6000);
      b.status = antwort ? antwort.status() : null;
      b.ziel   = seite.url();
      b.urteil_wache = ist_fehlerseite(b.status, b.ziel) || null;
      b.anmeldemaske = ist_anmeldeseite(b.ziel);

      const text = await seite.evaluate(() => document.body.innerText.slice(0, 8000)).catch(() => '');
      b.wand = ist_wandtext(text) ? text.trim().slice(0, 120) : null;
      b.textlaenge = text.length;
      b.textanfang = text.trim().replace(/\n{2,}/g, ' | ').slice(0, 300);
      // ⚠️ DAS ist die entscheidende Gegenfrage: steht trotz 403 echter Inhalt da?
      // Wenn ja, ist die 403 ein Artefakt und die Wache zu streng.
      b.inhalt_trotzdem_da = text.length > 400 && !ist_anmeldeseite(b.ziel) && !b.wand;

      const datei = path.join(ERGEBNIS, `${auftrag.id}-${befunde.length + 1}.png`);
      await seite.screenshot({ path: datei, fullPage: false });
      bilder.push(path.relative(REPO, datei));
    } catch (e) {
      b.fehler = String(e.message || e).slice(0, 200);
    } finally { await seite.close(); }
    befunde.push(b);
  }

  const mit403 = befunde.filter(b => b.status === 403);
  const artefakt = mit403.filter(b => b.inhalt_trotzdem_da);
  return {
    frage: 'Ist die 403 auf /settings/files echt — oder ist meine neue Statuswache zu streng?',
    urteil: !mit403.length
      ? 'Keine 403 mehr aufgetreten. Dann war sie voruebergehend — erneut messen, bevor etwas geaendert wird.'
      : artefakt.length === mit403.length
        ? `ARTEFAKT: alle ${mit403.length} Seiten mit 403 zeigten trotzdem Inhalt. Die Wache ist fuer den `
          + 'Shopify-Admin zu streng und muss korrigiert werden (nicht die Seite).'
        : artefakt.length === 0
          ? `ECHT: ${mit403.length} Seite(n) mit 403 und ohne Inhalt. Der Agent darf sie nicht — `
            + 'Berechtigung im Agentenprofil pruefen.'
          : `GEMISCHT: ${artefakt.length} von ${mit403.length} zeigten trotz 403 Inhalt. Einzeln lesen.`,
    befunde, bilder,
  };
}
