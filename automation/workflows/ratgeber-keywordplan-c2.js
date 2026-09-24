export const meta = {
  name: 'ratgeber-keywordplan-c2',
  description: 'Zwei Ratgeber aus dem Keywordplan C2 schreiben (Themen per args), adversarial pruefen, Befunde beheben',
  phases: [{ title: 'Schreiben' }, { title: 'Pruefen' }, { title: 'Beheben' }],
}
const REGELN = `HAUSREGELN (verbindlich): du-Form (nie Sie/Ihnen/Ihr), kein Eszett (ss), Markt = nur Schweiz (nie Liechtenstein/Deutschland),
Preise NUR live per Admin-GraphQL gemessen und mit «Stand ${args.datum}» versehen (Phantom-Preis-Falle), Produktlinks NUR auf Produkte mit
status ACTIVE und onlineStoreUrl (Phantom-Produkt-Falle), Kollektionslinks nur auf im Online Store publizierte Kollektionen, keine Heilversprechen,
keine Fremdmarken, keine erfundenen Tests/Testsieger/Bewertungen/Kundenstimmen (UWG), keine «Blitzversand»/«1–2 Werktage»-Zusage für CJ-Ware
(Lieferzeit: «steht auf jeder Produktseite»; bei Produkten mit Tag ch-lager darf «ab Schweizer Lager» stehen), keine Rabattcodes. Zugang:
Python-Helfer automation/kollektionstexte_nachbessern.py → gql(query, vars) (Token /tmp/cj_shop_token.txt, Admin GraphQL 2026-01).
Article hat in 2026-01 KEIN Feld seo/onlineStoreUrl: SEO über Metafelder global.title_tag / global.description_tag (single_line_text_field);
Produktkarten-Fakten (Masse, Grössen, Varianten) aus options/variants lesen, NICHT aus dem Beschreibungstext (Lehre 24.09.).
Jede Aussage einer Produktkarte muss in einem Produktfeld stehen (Titel, options/variants, Beschreibung) — keine Haltbarkeits-, Outdoor-, «rechtzeitig»- oder Eignungszusagen, die dort fehlen (Halloween-Ratgeber 24.09.). Kein Produkt mit tracked ∧ DENY ∧ Bestand ≤ 3 als Karte; CJ-/Dropship-Ware heisst «aus dem Lieferantenlager in Übersee», nie «direkt vom Hersteller».
Nichts committen, nichts pushen (der Hauptagent sichert). Keine anderen Artikel ändern.`
const ARTIKEL_SCHEMA = { type: 'object', properties: {
  handle: { type: 'string' }, artikel_id: { type: 'string' }, url: { type: 'string' }, titel: { type: 'string' },
  seo_titel: { type: 'string' }, seo_beschreibung: { type: 'string' }, woerter: { type: 'number' }, published: { type: 'boolean' },
  links: { type: 'array', items: { type: 'object', properties: { typ: { type: 'string' }, handle: { type: 'string' }, geprueft: { type: 'string' } }, required: ['typ', 'handle', 'geprueft'] } },
  preise: { type: 'array', items: { type: 'object', properties: { produkt: { type: 'string' }, chf: { type: 'string' }, gemessen: { type: 'string' } }, required: ['produkt', 'chf', 'gemessen'] } },
  hinweise: { type: 'string' } }, required: ['handle', 'artikel_id', 'url', 'titel', 'seo_titel', 'seo_beschreibung', 'woerter', 'published', 'links', 'preise', 'hinweise'] }
const PRUEF_SCHEMA = { type: 'object', properties: {
  nachgemessen: { type: 'string' },
  befunde: { type: 'array', items: { type: 'object', properties: { schwere: { type: 'string', enum: ['sofort', 'wichtig', 'kosmetik'] }, text: { type: 'string' }, beleg: { type: 'string' } }, required: ['schwere', 'text', 'beleg'] } },
  freigabe: { type: 'boolean' } }, required: ['nachgemessen', 'befunde', 'freigabe'] }
const FIX_SCHEMA = { type: 'object', properties: { behoben: { type: 'array', items: { type: 'string' } }, offen: { type: 'array', items: { type: 'string' } }, ruecklesen: { type: 'string' } }, required: ['behoben', 'offen', 'ruecklesen'] }

const ergebnisse = await pipeline(args.themen,
  t => agent(`Schreibe und veröffentliche EINEN Ratgeber-Artikel im Shopify-Blog «ratgeber» (gid://shopify/Blog/119864721793) für LuxeStyle CH.
Thema: «${t.titel}». Ziel-Keywords (QUELLE Google-Suggest, dropship/KEYWORDPLAN-2026-09.md Abschnitt C2): ${t.keywords}.
Zielkollektion: /collections/${t.kollektion} (oben UND unten verlinken), Zweitkollektion: /collections/${t.zweitkollektion}.
${REGELN}
VORGEHEN, in dieser Reihenfolge, alles GEMESSEN:
1. Lies den Artikel mit Handle «${t.vorlage}» per GraphQL (articles(query:"handle:…") → body, summary, tags, image, Metafelder) als Stil- und
   Strukturvorlage (H2-Gliederung, Länge, du-Form, Produktkarten, FAQ, Kollektionsverweis). Prüfe vorher per articles(query:"title:*${t.key}*")
   und Handle-Suche, dass es zu diesem Thema noch KEINEN publizierten Artikel gibt (sonst abbrechen und im Feld hinweise melden).
2. Lies die Zielkollektion (collectionByHandle → products(first:80): id, handle, title, status, onlineStoreUrl, priceRangeV2, featuredImage, tags,
   options, variantsCount) und wähle 3–5 ACTIVE Produkte mit onlineStoreUrl, unterschiedlichen Preisklassen und Bild; Preis (min) mit «Stand ${args.datum}».
   Bei «selber machen»-Themen: der DIY-Teil ist der Hauptteil (konkrete Anleitungen mit Material, das man zu Hause hat), der Kaufteil ehrlich
   («wann sich gekauftes lohnt»).
3. Schreibe den Artikel: 700–1'000 Wörter, H2/H3, konkrete Anleitungen bzw. Kaufkriterien, ehrlich zu Lieferzeit, eine kurze Tabelle, 3 FAQ
   (Frage als H3), Produktabschnitt mit den gewählten Produkten (Titel verlinkt auf /products/<handle>, Preis mit Stand), Abschluss mit Link auf die
   Kollektion. Keyword natürlich in Titel, erstem Absatz, einer H2 und SEO-Titel (≤ 65 Zeichen) + SEO-Beschreibung (≤ 155, mit «Gratis-Versand ab CHF 50»).
   Handle: sprechend, Kleinbuchstaben, Bindestriche, endet auf -ratgeber. Tags: ["ratgeber", "${t.gruppe}"]. Bild: featuredImage eines gewählten
   Produkts, möglichst ≥ 1200 px (sonst per PIL hochskalieren und über stagedUploads hochladen, wie im Hundebett-Ratgeber gemacht).
4. Anlegen per articleCreate (title, handle, body, summary, tags, isPublished true, author «LuxeStyle Redaktion», image, metafields global.title_tag +
   global.description_tag). Bei userErrors: beheben, nicht raten.
5. Rücklesen per article(id): published, Body enthält die Links; jeden Produkt-/Kollektionslink gegen Live-Status prüfen (Produkt ACTIVE + onlineStoreUrl,
   Kollektion publishedOnPublication Online Store gid://shopify/Publication/301970915713); öffentliche URL per WebFetch (nicht curl) bestätigen.
6. Prüfe den Body per Regex: kein «ß», kein \\b(Sie|Ihnen|Ihr|Ihre)\\b als Anrede, kein «Blitzversand», keine Fremdmarken, kein «Testsieger».
Gib das Ergebnis strukturiert zurück (Feld hinweise: was du nicht messen konntest, was fehlt).`, { label: `schreiben:${t.key}`, phase: 'Schreiben', schema: ARTIKEL_SCHEMA }),
  (a, t) => a ? agent(`Adversarial prüfen: der Ratgeber «${a.titel}» (Handle ${a.handle}, ${a.url}, Artikel-ID ${a.artikel_id}) wurde soeben in Shopify angelegt.
Behauptet: ${JSON.stringify(a)}. Versuche, JEDE Behauptung zu widerlegen — mit GraphQL-Messung, nicht mit Meinung. ${REGELN}
Prüfe: (1) Artikel existiert, published; (2) jeder Link im Body: /products/<handle> → Produkt ACTIVE + onlineStoreUrl; /collections/<handle> →
im Online Store publiziert (Publication 301970915713); externe Links = Befund; (3) jede CHF-Zahl im Body gegen priceRangeV2.minVariantPrice des
verlinkten Produkts (Abweichung = sofort); Produktkarten-Aussagen (Masse, Grössen, Varianten, Material) gegen options/variants/Beschreibung;
(4) Regex-Regeln: ß, Sie-Anrede, Blitzversand/1–2 Werktage (ausser bei ch-lager-Produkten), Fremdmarken, Testsieger/Stiftung Warentest/Kassensturz,
Heilversprechen, erfundene Bewertungen/Kundenstimmen/Sterne; DIY-Anleitungen: keine gefährlichen Anweisungen (offenes Feuer bei Kindern, giftige Stoffe für Katzen);
(5) SEO-Metafelder: Titel ≤ 65, Beschreibung ≤ 155 mit «Gratis-Versand ab CHF 50»; Keyword «${t.key}» im Titel, ersten Absatz, einer H2; (6) Wortzahl
600–1'100; (7) kein Doppel (articles(query:"title:*${t.key}*")); (8) Handle endet auf -ratgeber, Tags enthalten «ratgeber». Ändere NICHTS. Gib befunde mit
Schwere (sofort = falsch/irreführend/Regelbruch/gefährlich, wichtig = SEO/Struktur, kosmetik) und freigabe (true nur ohne «sofort») zurück.`,
      { label: `pruefen:${t.key}`, phase: 'Pruefen', schema: PRUEF_SCHEMA }).then(p => ({ artikel: a, pruefung: p })) : null,
  (r, t) => (r && r.pruefung && r.pruefung.befunde.some(b => b.schwere !== 'kosmetik'))
    ? agent(`Behebe die Prüfer-Befunde am Ratgeber «${r.artikel.titel}» (Handle ${r.artikel.handle}, Artikel-ID ${r.artikel.artikel_id}) per articleUpdate:
${JSON.stringify(r.pruefung.befunde)}. ${REGELN} Jede Änderung zurücklesen (article(id) → body/Metafelder) und pro Befund «behoben» oder «offen (Grund)» melden.
Nur diesen Artikel anfassen; Struktur und Länge erhalten; Links nur auf ACTIVE-Produkte/publizierte Kollektionen.`,
        { label: `beheben:${t.key}`, phase: 'Beheben', schema: FIX_SCHEMA }).then(f => ({ ...r, fix: f }))
    : r
)
return { datum: args.datum, artikel: ergebnisse.filter(Boolean) }