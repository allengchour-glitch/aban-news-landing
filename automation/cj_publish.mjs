// cj_publish.mjs — Publizieren mit ECHTER Quittung. Eine Datei für alle CJ-Importer.
//
// ⚠️ 28.08.2026 — WARUM DAS HIER STEHT UND NICHT DREIMAL DANEBEN
// Am 22.08. galt die Google-Lücke als an der Wurzel behoben: `cj_sku_import.mjs` und
// `cj_trending_import.mjs` bekamen `publishVerified()` und lasen seither die Antwort der
// Mutation. Live nachgezählt sind trotzdem am 27.08. und 28.08. wieder zwei Produkte
// entstanden, die in fünf von sechs Kanälen stehen und bei Google fehlen — mit
// lückenloser Ereignisliste und OHNE «removed»:
//     11:27:15 Online Store · 11:27:15 Shop · 11:27:16 TikTok ·
//     11:27:17 Facebook & Instagram · 11:27:17 Pinterest      (Google & YouTube fehlt)
//
// DER DENKFEHLER: `publishablePublish` bekommt ALLE sechs Publikationen in EINEM Aufruf
// und meldet `userErrors: []` — auch dann, wenn eine davon still nicht greift. Die alte
// Prüfung las also die ANTWORT und hielt sie für das ERGEBNIS. Das ist genau die Lehre
// vom 28.08. über TikTok: «Ein Endpunkt, der antwortet, beweist nur, dass er antwortet.»
//
// DIE QUITTUNG IST JETZT DER ZUSTAND, NICHT DIE ANTWORT: nach dem Publizieren werden die
// `resourcePublications` des Produkts gelesen und mit den Zielen verglichen; was fehlt,
// wird gezielt nachpubliziert. Erst wenn jedes Ziel bestätigt ist, gilt es als erledigt.
// Kostet eine Abfrage je Produkt — die Google-Lücke hat den einzigen Kanal mit belegten
// Verkäufen über Wochen ausgedünnt, das ist es wert.
//
// NEUE PUBLIKATIONS-LOGIK NUR HIER. Es gab drei Fassungen von `publishVerified()`, und
// alle drei hatten denselben Fehler — dieselbe Geschwister-Klasse wie die viermal kopierte
// Farbtabelle, die vier Preisformeln und die drei Grössenmengen.

export const GOOGLE_PUB = '302872297857';
// Online Store · Shop · TikTok · Facebook & Instagram · Google & YouTube · Pinterest
export const PUBS = ['301970915713', '301971014017', '302032716161', '302566834561',
                     '302872297857', '302994456961']
  .map(id => ({ publicationId: `gid://shopify/Publication/${id}` }));

const PUB_MUT = `mutation($id:ID!,$p:[PublicationInput!]!){` +
                `publishablePublish(id:$id,input:$p){userErrors{message}}}`;
const PUB_LESEN = `query($id:ID!){product(id:$id){` +
                  `resourcePublications(first:20){nodes{isPublished publication{id}}}}}`;

const schlaf = ms => new Promise(r => setTimeout(r, ms));

/** Welche der Ziel-Publikationen sind LIVE bestätigt? Gibt die fehlenden zurück
 *  (null = konnte nicht gelesen werden — dann wird NICHT «alles gut» behauptet). */
async function fehlende(sgql, tok, pid, ziele) {
  const r = await sgql(tok, PUB_LESEN, { id: pid });
  const nodes = r?.data?.product?.resourcePublications?.nodes;
  if (!Array.isArray(nodes)) return null;
  const drin = new Set(nodes.filter(n => n.isPublished).map(n => n.publication.id));
  return ziele.filter(z => !drin.has(z.publicationId));
}

/**
 * Publiziert `pid` in `ziele` und bestätigt es am Zustand des Produkts.
 * @returns true, wenn jedes Ziel live bestätigt ist.
 */
export async function publishVerified(sgql, tok, pid, ziele = PUBS) {
  let offen = ziele;
  for (let i = 0; i < 3; i++) {
    const r = await sgql(tok, PUB_MUT, { id: pid, p: offen });
    const errs = r?.data?.publishablePublish?.userErrors;
    if (Array.isArray(errs) && errs.length) {
      console.log('  ⚠️ publishablePublish meldet', JSON.stringify(errs).slice(0, 140));
    }
    await schlaf(700);                       // Shopify braucht einen Moment
    const fehlt = await fehlende(sgql, tok, pid, ziele);
    if (fehlt === null) {
      // Lesefehler ist KEIN Beweis für Erfolg und KEIN Beweis für Misserfolg.
      await schlaf(1500 * (i + 1));
      continue;
    }
    if (fehlt.length === 0) return true;
    offen = fehlt;                            // nur das Fehlende nachreichen
    await schlaf(1200 * (i + 1));
  }
  const rest = (offen || []).map(z => z.publicationId.split('/').pop()).join(',');
  console.log(`  ⚠️ Publizieren unvollstaendig ${pid} — fehlt: ${rest}`);
  return false;
}
