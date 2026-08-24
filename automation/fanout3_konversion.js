export const meta = {
  name: 'luxestyle-dritter-fanout',
  description: 'Dritter Fan-out: Konversion, Feed-Daten, Sachaussagen, Sprachversion, Preisrecht',
  phases: [
    { title: 'Finden', detail: '20 neue Dimensionen — nichts aus Lauf 1 und 2' },
    { title: 'Verifizieren', detail: 'jeder Befund adversarial gegen LIVE' },
    { title: 'Synthese', detail: 'Bericht nach Schwere' },
  ],
}

const REGELN = `
LuxeStyle CH — Shopify au3j0y-hq.myshopify.com / luxestyle.ch. ~46'800 aktive Produkte,
CJ-Dropshipping, EIN aktiver Markt: Schweiz ['CH']. Rund 15 Bestellungen insgesamt.
Betreiber: Einzelfirma in Belp BE. Sprache aller Befunde: DEUTSCH.

⛔ HARTE REGELN:
1. NUR LESEN. Keine Mutation, kein productUpdate/tagsAdd/publish/themeFilesUpsert, kein
   git commit, kein Schreiben in den Shop. Nur Queries und lokale Dateien.
2. Kein Befund ohne BELEG: Produkt-ID, Seitenpfad oder Dateizeile PLUS woertliches Zitat.
3. ⚠️ PRUEFE GEGEN LIVE, NICHT GEGEN EINEN EXPORT. Nenne bei jedem Befund die UHRZEIT
   deiner Live-Pruefung. Ein Export im /tmp ist Stunden alt und taegliche Waechter
   reparieren laufend — beim ersten Fan-out war ein Teil der Befunde bei Abgabe erledigt.
4. Fehlgriffe aktiv suchen. Bekannte Fallen: «led» in «Leder», «ski» in «Skincare»,
   «auto» in «Automatik», «IPL» in «L-IPL-iner», «Straps» = engl. Riemen, «Lotus» = Blume.
   Deutsche KOMPOSITA brechen jede Wortlisten-Pruefung («Hundebett» steht in keinem
   Woerterbuch). Umlaut-Mehrzahl beachten («Armbaender» passt nicht auf «armband»).
5. Eine Verneinung ist kein Gestaendnis («KEIN medizinisches Geraet»).
6. Eine Zahl, die aus der eigenen Annahme stammt, belegt die Annahme nicht.

ZUGRIFF:
  Shopify Admin (lesend):
    TOK=$(cat /tmp/cj_shop_token.txt)
    curl -s --max-time 60 https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json \\
      -H "X-Shopify-Access-Token: $TOK" -H "Content-Type: application/json" -d '{"query":"..."}'
    ⚠️ Bei "Throttled" 5 s warten und wiederholen — eine Drosselung ist eine Warteanweisung,
       kein Abbruchgrund.
    ⚠️ 2024-10: KEIN pageByHandle (nutze pages(first:5,query:"handle:…")), kein
       Collection.onlineStoreUrl. productsCount zaehlt ENTWUERFE MIT und deckelt bei 10'000.
    ⚠️ Listen paginieren: pages(first:100) liefert 100 von 221 Seiten, articles ebenso
       100 von 316. Immer pageInfo{hasNextPage endCursor} benutzen.
  Oeffentliche Seite: das WebFetch-Werkzeug benutzen, NICHT curl — unsere IP bekommt eine
    stundenalte Bot-Cache-Kopie und luxestyle.ch antwortet auf schnelle Abrufe mit 429.
  Theme lesen: themes(first:5,roles:MAIN) → theme(id:"gid://shopify/OnlineStoreTheme/187533001089")
    {files(first:250,filenames:[…])}. Es sind ueber 400 Dateien, first:250 reicht NICHT.
    ⚠️ Shopify-Templates beginnen mit einem /* */-Kommentarblock — vor json.loads abschneiden.
  Repo: /home/user/aban-news-landing (automation/, dropship/, CLAUDE.md).

WAS SCHON GEPRUEFT IST — NICHT wiederholen:
  Lauf 1 (dropship/KATALOG-AUDIT-2026-08-23.md): Produkttitel (Dubletten, englisch, Marken,
    Laenge), Optionswerte, Platzhaltertexte, Produktdetails-Block, Farblisten, Code im Titel,
    Bilder, Bewertungen, Google-Kanal, POD.
  Lauf 2 (dropship/KATALOG-AUDIT-2026-08-24-LADEN.md): Kaufweg, Rechtstexte, Preis- und
    Rabattwidersprueche, Navigation, leere Kollektionen, Startseiten-Reihen, Blog, Bestellungen,
    Lieferbarkeit, Theme-Widersprueche, Google-Metafelder, Waechter-Code, Waechter-Startlisten,
    Ledger, Social-Stopp, Secrets, interne Seiten, Shop-Suche, Gewicht/Marge.
  Bereits repariert am 23./24.08.: Produktdetails-Floskeln, Farb-/Groessenwerte im Text,
    englische Titel, FAQ-Seiten (CHF 4.90), tote_rabattcodes-Paginierung, 24-Stunden-Zusage.
  Bekannte OFFENE Betreiber-Entscheide (nicht als neuen Befund melden): der wirkungslose
    «10% ab 3 Artikeln», die 200 Varianten unter Einstand, die 8 Altprodukte ohne
    Lieferanten-SKU, Klaviyo zeigt auf die tote Domain luxestyle.com.co, Liechtenstein
    wird beworben ohne Markt.
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'befunde'],
  properties: {
    dimension: { type: 'string' },
    geprueft: { type: 'string' },
    befunde: {
      type: 'array', maxItems: 5,
      items: {
        type: 'object', additionalProperties: false,
        required: ['titel', 'schwere', 'beleg', 'warum_teuer'],
        properties: {
          titel: { type: 'string' },
          anzahl: { type: 'integer' },
          schwere: { type: 'string', enum: ['kritisch', 'hoch', 'mittel', 'niedrig'] },
          beleg: { type: 'string' },
          geprueft_um: { type: 'string' },
          warum_teuer: { type: 'string' },
          vorschlag: { type: 'string' },
        },
      },
    },
  },
}

const URTEIL = {
  type: 'object', additionalProperties: false,
  required: ['haelt', 'begruendung'],
  properties: {
    haelt: { type: 'boolean' },
    korrigierte_anzahl: { type: 'integer' },
    begruendung: { type: 'string' },
    fehlgriffe: { type: 'string' },
  },
}

const DIMENSIONEN = [
  { k: 'streichpreise', p: 'PREISRECHT: compareAtPrice (durchgestrichener Preis). Wie viele aktive Varianten tragen einen, und ist er BELEGBAR? Nach Schweizer UWG Art. 3 lit. g darf ein Referenzpreis nur genannt werden, wenn er tatsaechlich verlangt wurde. Zaehle live, nenne die hoechsten Rabattprozente und pruefe an 10 Beispielen, ob der Artikel je zum hoeheren Preis angeboten wurde (Repo-Historie, Ledger).' },
  { k: 'sachaussagen', p: 'SACHAUSSAGEN in Titel und Beschreibung, die das Produkt selbst widerlegt: Beispiel «Aerial Photography Drone 8K HD» — das eigene Hauptbild sagt «4K HD shooting». Suche live nach unmoeglichen oder widerspruechlichen technischen Angaben: mAh-Zahlen ueber 50000, «8K», «unbegrenzt», Reichweiten in km, Akkulaufzeiten in Tagen, IP68 bei Stoff. Pruefe je Fund die Beschreibung GEGEN sich selbst.' },
  { k: 'lagerbestand', p: 'ERFUNDENER LAGERBESTAND: Varianten mit tracked=true und einer glatten Zahl (9999, 1000, 100, 50) oder mit inventoryPolicy CONTINUE und Bestand 0. Wie viele aktive Produkte versprechen Verfuegbarkeit, die niemand geprueft hat? Live zaehlen, Verteilung der Bestandszahlen zeigen.' },
  { k: 'sprachversion-en', p: 'Die englische Sprachversion (/en/…): Ist sie vollstaendig oder halb uebersetzt? Das Hauptmenue verlinkt «/en/pages/alle-kategorien» — WebFetch darauf und auf 6 weitere /en/-Seiten. Sind Produkttitel, Kollektionen und Rechtstexte dort deutsch oder englisch? Und: gibt es diese Sprachversion ueberhaupt offiziell (shopLocales abfragen)?' },
  { k: 'kollektionsregeln', p: 'QUALITAET DER SMART-REGELN: Lies alle Kollektionen mit ruleSet live. Welche Regel holt nachweislich falsche Ware herein (TITLE CONTAINS mit kurzem Wort ohne Wortgrenze — Shopify kennt kein \\b und ignoriert Bindestriche)? Pruefe die 10 riskantesten Regeln, indem du die ersten Produkte der Kollektion ansiehst.' },
  { k: 'warenkorb-rechnung', p: 'WARENKORB aus Kundinnensicht: Der Gratis-Versand-Balken im Theme rechnet gegen items_subtotal_price (VOR Rabatt) mit SCHWELLE=5000, das Versandprofil hat eine 45er-Stufe, ein automatischer Rabatt gibt Gratis-Versand ab 49, beworben wird «ab CHF 50». Rechne DREI konkrete Warenkoerbe durch und sage, was die Kundin jeweils sieht und was sie zahlt. Belege jede Zahl mit der Stelle, an der sie steht.' },
  { k: 'zahlungsarten', p: 'ZAHLUNGSARTEN: Welche sind live wirklich aktiv (paymentSettings / shop)? Der Shop bewirbt an mehreren Stellen Klarna und TWINT. Stimmt das noch, und stimmen die Logos/Aufzaehlungen im Theme und in den Seiten mit der Wirklichkeit ueberein?' },
  { k: 'ruecksendung', p: 'RUECKSENDEPROZESS: Was muss die Kundin konkret tun, wenn sie zurueckschicken will? Lies /pages/rueckgabe, /pages/widerruf, /policies/refund-policy und die Bestellbestaetigungs-Vorlagen. Gibt es ein Retourenlabel, eine Adresse, ein Formular? Widersprechen sich Fristen (14/30 Tage) oder Kostentraeger?' },
  { k: 'newsletter-consent', p: 'NEWSLETTER UND EINWILLIGUNG: Welche Formulare sammeln E-Mail-Adressen (Popup, Footer, Seiten)? Was versprechen sie (Rabatt, Frequenz), und stimmt das mit den aktiven Rabattcodes ueberein? Gibt es einen Hinweis auf Widerruf und Datenschutz an der Erhebungsstelle (DSG Art. 19)?' },
  { k: 'bilder-dubletten', p: 'DUBLETTEN UEBER BILDER statt ueber Titel: Nimm 300 aktive Produkte live und vergleiche die HAUPTBILD-Dateinamen bzw. die Bild-URLs. CJ laedt dasselbe Bild pro Listing unter neuer CDN-URL hoch — pruefe deshalb auch Dateigroesse und Masse. Gibt es Produkte mit identischem Hauptbild unter verschiedenen Titeln?' },
  { k: 'alt-texte', p: 'BARRIEREFREIHEIT: Alt-Texte der Produktbilder live per Stichprobe von 40 Produkten. Wie viele haben einen, wie viele einen SINNVOLLEN (nicht bloss der Dateiname oder der Titel)? Pruefe zusaetzlich die Startseite per WebFetch auf Bilder ohne Alt-Text.' },
  { k: 'seo-struktur', p: 'SEO-STRUKTUR: robots.txt, sitemap.xml, canonical-Tags und hreflang per WebFetch pruefen. Steht in der Sitemap Ware, die es nicht mehr gibt? Zeigt canonical auf sich selbst? Gibt es hreflang fuer /en/, obwohl es die Sprachversion womoeglich gar nicht gibt?' },
  { k: 'cookie-consent', p: 'COOKIE-BANNER: Was laedt die Startseite VOR einer Einwilligung? WebFetch auf die Startseite und die Theme-Dateien lesen: welche Skripte (Analytics, Pixel, Klaviyo, TikTok) sind fest eingebunden? Gibt es ueberhaupt ein Consent-Werkzeug, und was sagt /pages/cookie-richtlinie darueber?' },
  { k: 'bewertungen-anzeige', p: 'BEWERTUNGEN: Judge.me-Metafelder live per Stichprobe von 30 Produkten. Stimmt die angezeigte Sternzahl mit der Zahl der Bewertungen ueberein? Gibt es Produkte, die Sterne zeigen ohne Bewertung, oder Bewertungen, die zu einem anderen (alten) Produktnamen gehoeren?' },
  { k: 'cj-bestellkette', p: 'CJ-BESTELLKETTE: Lies automation/cj_order_engine.py, cj_fulfill_engine.py und die Ledger in dropship/. Gibt es offene Schatten-Bestellungen, unbezahlte CJ-Auftraege, Bestellungen ohne Sendungsnummer? Laufen die beiden Engines ueberhaupt (Logs in /tmp)? Belege mit Bestellnummern.' },
  { k: 'varianten-preise', p: 'VARIANTEN-PREISE: Produkte, deren teuerste Variante ein Vielfaches der billigsten kostet (Faktor > 3) — die Kollektionskarte zeigt «ab CHF x» und lockt mit einem Preis, den fast keine Variante hat. Live zaehlen und die 10 extremsten nennen. ⚠️ Bei Sets und Mengenstaffeln ist das KORREKT — trenne die Faelle.' },
  { k: 'mobil-darstellung', p: 'MOBILE DARSTELLUNG: Lies die Theme-Einstellungen und Sektionen auf Dinge, die auf einem Telefon brechen: feste Pixelbreiten, position:sticky mit hohem z-index (Horizon nutzt z-index 20 fuer Drawer), Schriftgroessen unter 12px, Tabellen ohne Scroll-Container, mobile_columns als Zahl statt String. Nenne Datei und Zeile.' },
  { k: 'startseite-ladung', p: 'STARTSEITEN-GEWICHT: Wie viele Sektionen, Produkte und Bilder laedt die Startseite? Lies templates/index.json und zaehle. Gibt es Reihen mit sehr vielen Produkten, mehrfach dieselbe Kollektion, oder Sektionen, die dieselbe Ware zweimal zeigen?' },
  { k: 'lieferzeit-restbestand', p: 'LIEFERZEIT-AUSSAGEN, die die bisherigen Laeufe NICHT erreicht haben: Suche in E-Mail-Vorlagen, Metafeldern, Kollektionsbeschreibungen und Kollektions-SEO-Texten nach Zeitangaben in Tagen. Muster: \\d+\\s*[–-]\\s*\\d+\\s*(?:Werk)?[Tt]age. Die Produkttexte und das Theme sind schon geprueft — such woanders.' },
  { k: 'titel-bild-abgleich', p: 'TITEL GEGEN HAUPTBILD: Nimm 25 aktive Produkte quer durch den Katalog, lies Titel UND schau dir das Hauptbild an (Bild-URL mit dem Read-Werkzeug oeffnen). Zeigt das Bild, was der Titel behauptet? Bekannte Falle dieses Projekts: eine Kuehlschrank-Frischematte wurde als «Mauspad» betitelt. Melde jede Abweichung mit beiden Angaben.' },
]

phase('Finden')
const roh = await pipeline(
  DIMENSIONEN,
  d => agent(`${REGELN}

DEINE DIMENSION: ${d.k}
${d.p}

Arbeite selbst und pruefe LIVE. Melde HOECHSTENS 5 Befunde, jeden mit Beleg und Uhrzeit
der Pruefung. Lieber zwei harte als fuenf weiche. Findest du nichts, gib eine leere Liste
zurueck — das ist ein vollwertiges Ergebnis und wertvoller als ein weicher Befund.`,
    { label: `find:${d.k}`, phase: 'Finden', schema: SCHEMA }),
  (r, d) => {
    if (!r || !r.befunde || !r.befunde.length) return []
    return parallel(r.befunde.map(b => () =>
      agent(`${REGELN}

Du bist SKEPTIKER. Widerlege den folgenden Befund. Im Zweifel gilt er als nicht gehalten.

Dimension: ${d.k}
Befund: ${b.titel}
Schwere: ${b.schwere}
Beleg: ${b.beleg}
${b.anzahl ? 'Behauptete Anzahl: ' + b.anzahl : ''}

1. Pruefe JETZT live nach. Existiert das noch? Stimmt das Zitat woertlich? Womoeglich hat
   ein Waechter es laengst repariert.
2. Zaehle selbst nach. Weicht die Zahl ab, nenne die richtige.
3. Suche gezielt einen FEHLGRIFF im Muster des Befunds. Einer genuegt, um ihn zu kippen.
4. Frage, ob es ueberhaupt ein Fehler IST. Vieles sieht falsch aus und ist Absicht — im
   Zweifel im Repo nachlesen, ob es dort begruendet steht (CLAUDE.md, Kopfkommentare).
   Beispiel: die Gratis-Versand-Stufe 45 ist Absicht (50 x 0,9 wegen des Rabatts).

haelt=true nur, wenn der Befund die Pruefung UNVERAENDERT ueberlebt.`,
        { label: `pruef:${b.titel.slice(0, 26)}`, phase: 'Verifizieren', schema: URTEIL })
        .then(v => ({ dimension: d.k, befund: b, urteil: v }))
    ))
  }
)

const alle = roh.flat().filter(Boolean)
const gehalten = alle.filter(x => x.urteil && x.urteil.haelt)
log(`${alle.length} Befunde geprueft, ${gehalten.length} halten stand`)

phase('Synthese')
const bericht = await agent(`${REGELN}

Abschlussbericht des DRITTEN Audits — Konversion, Feed-Daten, Sachaussagen, Sprachversion,
Preisrecht, Darstellung.

Befunde mit Skeptiker-Urteil:
${JSON.stringify(alle, null, 1).slice(0, 90000)}

Schreibe Markdown, Deutsch, in dieser Ordnung:
1. Vorbemerkung: rund 15 Bestellungen; sag ehrlich, ob ein Befund einen BELEGTEN Verlust
   verursacht hat oder ob es Einschaetzungen sind.
2. Gehaltene Befunde nach Schwere. Zu jedem: Beleg, gezaehlte Zahl, konkreter Vorschlag —
   und WER das Feld beim naechsten Mal schreibt (eine Reparatur ohne Quellenfix waechst nach).
3. «Widerlegt — bitte nicht nochmals aufwerfen», mit Begruendung. Dieser Abschnitt ist so
   wertvoll wie der erste.
4. «Geprueft und sauber».
5. Tabelle: wo Finder und Skeptiker sich widersprachen, mit der gueltigen Zahl.
6. «Was dieser Lauf NICHT geprueft hat» — ehrlich benannte Luecken.

Keine Zahl ohne Herkunft, keine Empfehlung ohne Beleg. Knapp schreiben.`,
  { label: 'synthese', phase: 'Synthese' })

return { geprueft: alle.length, gehalten: gehalten.length, bericht }
