/**
 * shopify_dateien_messen.mjs — liest den Shopify-Dateispeicher aus.
 *
 * Anlass: «Shopify-Datei-Speicher voll (Einstellungen → Dateien)» steht seit dem
 * 14.09.2026 in der stündlichen Ampel, und ein Bild-Upload ist an diesem Tag
 * nachweislich mit FAILED gescheitert. Solange der Speicher voll ist, kann kein
 * Produktbild, kein Reel und kein Canvas-Motiv mehr hinzukommen.
 *
 * Von hier aus ist die Belegung NICHT messbar: die Admin-API kennt keinen
 * Speicher-Endpunkt, `files` liefert Dateien ohne Gesamtsumme, und die Zahl steht
 * nur auf der Einstellungsseite. Der Agent ist dort angemeldet (Auftrag 32:
 * admin.shopify.com/store/au3j0y-hq/settings/billing, angemeldet) — er kann die
 * Zahl also lesen, die hier fehlt.
 *
 * ⛔ REIN LESEND. Es wird NICHTS gelöscht. Löschen ist unwiderruflich, und welche
 * Dateien entbehrlich sind, ist ein Betreiber-Entscheid — er steht als Aufgabe #33
 * offen (Grow-Upgrade auf 300 GB gegen Aufräumen). Erst die Zahlen, dann die
 * Entscheidung, dann ein eigener Auftrag. Genau umgekehrt wäre es der Fehler, den
 * 95 weiterverkaufte Klingen gekostet haben: ein Urteil ohne Messung vollstrecken.
 *
 * ⚠️ Die Selektoren hier sind BEWUSST grob: das Skript liest den ganzen Seitentext
 * und sucht die Zahlen darin, statt sich auf CSS-Klassen zu verlassen, die Shopify
 * jederzeit umbaut. Ein Skript, das an einer Klasse hängt, meldet nach dem nächsten
 * Umbau eine stille Null.
 */
import { ist_anmeldeseite, ist_wandtext, ist_fehlerseite }
  from '../../server/anmelde_erkennung.mjs';

const SHOP = 'au3j0y-hq';
const ZIEL = `https://admin.shopify.com/store/${SHOP}/settings/files`;

export default async function ({ ctx, auftrag, REPO, ERGEBNIS }) {
  const path = await import('node:path');
  const seite = await ctx.newPage();
  try {
    const antwort = await seite.goto(ZIEL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await seite.waitForTimeout(6000);        // die Admin-Oberflaeche baut sich per JavaScript
    const status = antwort ? antwort.status() : null;
    const ziel = seite.url();

    const kaputt = ist_fehlerseite(status, ziel);
    if (kaputt) { const e = new Error(`${kaputt} — Dateiseite nicht erreicht`); e.umgeleitet = true; throw e; }
    if (ist_anmeldeseite(ziel)) {
      const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e;
    }

    const text = await seite.evaluate(() => document.body.innerText.slice(0, 20000)).catch(() => '');
    if (ist_wandtext(text)) { const e = new Error('Bot-Wand statt Admin'); e.umgeleitet = true; throw e; }

    // Die Speicherzeile steht als Text, z. B. «94,2 GB of 100 GB used» oder
    // «100 GB von 100 GB verwendet». Beide Sprachen, beide Trennzeichen.
    const muster = [
      /([\d'.,]+)\s*(GB|MB|TB)\s*(?:of|von)\s*([\d'.,]+)\s*(GB|MB|TB)/i,
      /([\d'.,]+)\s*(GB|MB|TB)\s*\/\s*([\d'.,]+)\s*(GB|MB|TB)/i,
    ];
    let speicher = null;
    for (const m of muster) {
      const t = text.match(m);
      if (t) { speicher = { belegt: `${t[1]} ${t[2]}`, gesamt: `${t[3]} ${t[4]}`, quelle: t[0] }; break; }
    }

    // Dateizeilen: Name + Groesse, so wie sie in der Liste stehen. Nur die ersten 60 —
    // eine Liste, die alles mitnimmt, ist in der Quittung nicht mehr lesbar.
    const zeilen = await seite.evaluate(() =>
      [...document.querySelectorAll('tr, li')]
        .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim())
        .filter(s => /\b\d+([.,]\d+)?\s?(KB|MB|GB)\b/i.test(s) && s.length < 220)
        .slice(0, 60)
    ).catch(() => []);

    const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
    await seite.screenshot({ path: datei, fullPage: true });

    return {
      ziel, status,
      speicher,   // null heisst: die Zeile stand nicht im Text — NICHT «Speicher leer»
      hinweis_wenn_null: speicher ? undefined
        : 'Die Speicherzeile wurde im Seitentext nicht gefunden. Das ist eine fehlende '
        + 'Messung, keine Aussage ueber die Belegung — im Screenshot nachsehen und das '
        + 'Muster an den echten Aufbau anpassen.',
      dateizeilen_gefunden: zeilen.length,
      dateizeilen: zeilen,
      seitentext_anfang: text.trim().slice(0, 600),
      bild: path.relative(REPO, datei),
      naechster_schritt: 'NICHTS wurde geloescht. Mit diesen Zahlen entscheidet der '
        + 'Betreiber zwischen Grow-Upgrade (300 GB) und Aufraeumen (Aufgabe #33).',
    };
  } finally { await seite.close(); }
}
