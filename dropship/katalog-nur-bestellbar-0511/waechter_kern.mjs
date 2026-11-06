// Wächter «Katalogfenster zeigt nichts oder zu wenig»: reine Rechnung ohne Netz (waechter.mjs holt die Eingaben, waechter_test.mjs prüft die Regeln).
// Anlass (Prüfer 3, 06.11.2026): das Snippet snippets/luxe-clothing-shop-offers.liquid gibt [] aus, wenn die Sammlung selbst-gestalten-1 mehr als 50 Produkte hat (oder die Währung nicht CHF ist,
// oder die feste Paarliste pricing_allowed_pairs / die 32 Produktnummern in luxe-studio-blank-eligible ein Produkt nicht kennen). Das Fenster zeigt dann für ALLE Besucher «Im Moment ist kein
// Modell zum Selbstgestalten bestellbar», obwohl bestellbare Produkte existieren, und niemand merkt es. Dieser Wächter rechnet dieselbe Sichtbarkeit wie das JS nach und meldet:
//   ALARM    keine-angebote            Angebotsliste leer, obwohl es Produkte mit dem Tag printful_personalized_product in der Sammlung gibt, oder die Sammlung über der Grenze liegt
//   ALARM    sammlung-ueber-grenze      mehr als 50 Produkte in selbst-gestalten-1: das Snippet liefert []
//   ALARM    sichtbar-null              Angebote da, aber kein Modell bleibt nach Variantenkarte, Zusatzschutz und «available» sichtbar
//   WARNUNG  sammlung-nah-an-grenze     45 oder mehr Produkte (Grenze 50)
//   WARNUNG  angebot-ohne-karte         Angebote auf Printful-Varianten, die nicht in der Variantenkarte stehen (unsichtbar, bis die Karte neu gebaut ist)
//   WARNUNG  produkt-ohne-angebot       Produkte mit dem Tag in der Sammlung, die kein Angebot haben (Paar «Variante:SKU» fehlt in pricing_allowed_pairs)
//   WARNUNG  ausblenden-veraltet        die Zusatzschutz-Datei ist älter als 14 Tage oder trägt keinen Stand
//   WARNUNG  ausblenden-fehlt           keine Zusatzschutz-Datei lesbar
//   WARNUNG  karte-fehlt                keine Variantenkarte lesbar (das Fenster würde den Ladefehler zeigen)
//   HINWEIS  angebot-ausgeblendet       Angebote auf ausgeblendeten Modellen oder Varianten (der Zusatzschutz greift: sie erscheinen nicht)
export const TAG = 'printful_personalized_product';
export const GRENZE = 50, WARNSCHWELLE = 45, ALTER_TAGE = 14;

const num = (x) => (x === null || x === undefined || x === '' ? null : Number(x));

// eingabe: { angebote: [{printfulVariantId, shopifyProductId, available, ...}], karte: {schemaVersion, modelle:{id:[[vid,farbe,groesse]]}} | null,
//            ausblenden: {schemaVersion, stand, modelle:[...], varianten:{modell:[vid]}} | null,
//            sammlung: {anzahl: number|null, getaggt: number|null}, jetzt: Date }
export function bewerten(eingabe) {
  const { angebote = [], karte = null, ausblenden = null, sammlung = {}, jetzt = new Date() } = eingabe;
  const befunde = [];
  const meld = (stufe, code, text) => befunde.push({ stufe, code, text });
  const anzahl = num(sammlung.anzahl), getaggt = num(sammlung.getaggt);

  // Sammlung und Angebotsliste
  if (anzahl !== null && anzahl > GRENZE) meld('ALARM', 'sammlung-ueber-grenze', `Die Sammlung selbst-gestalten-1 hat ${anzahl} Produkte, das Snippet rechnet nur bis ${GRENZE} und liefert sonst eine leere Angebotsliste: das Fenster zeigt allen Besuchern «nichts bestellbar».`);
  else if (anzahl !== null && anzahl >= WARNSCHWELLE) meld('WARNUNG', 'sammlung-nah-an-grenze', `Die Sammlung selbst-gestalten-1 hat ${anzahl} Produkte (Grenze ${GRENZE}).`);
  if (angebote.length === 0 && ((getaggt ?? 0) > 0 || (anzahl !== null && anzahl > GRENZE))) {
    meld('ALARM', 'keine-angebote', `Die Angebotsliste des Fensters ist leer, obwohl die Sammlung ${getaggt ?? '?'} Produkte mit dem Tag ${TAG} enthält${anzahl !== null && anzahl > GRENZE ? ` (Sammlung über der Grenze von ${GRENZE})` : ''}.`);
  }

  // Zusatzschutz-Datei
  if (!ausblenden) meld('WARNUNG', 'ausblenden-fehlt', 'Keine Zusatzschutz-Datei lesbar (assets/luxe-clothing-ausblenden.json): nicht lieferbare Modelle würden nicht erkannt.');
  else {
    const stand = ausblenden.stand ? new Date(ausblenden.stand + 'T00:00:00Z') : null;
    const alterTage = stand && !Number.isNaN(stand.getTime()) ? Math.floor((jetzt - stand) / 86400000) : null;
    if (alterTage === null) meld('WARNUNG', 'ausblenden-veraltet', 'Die Zusatzschutz-Datei trägt keinen Stand.');
    else if (alterTage > ALTER_TAGE) meld('WARNUNG', 'ausblenden-veraltet', `Die Zusatzschutz-Datei ist ${alterTage} Tage alt (Stand ${ausblenden.stand}, Grenze ${ALTER_TAGE}): neu erzeugen (dropship/codex-katalog/ausblenden.json).`);
  }

  // Variantenkarte, Sichtbarkeit
  let sichtbar = null, bestellbareAusfuehrungen = null;
  if (!karte || !karte.modelle) meld('WARNUNG', 'karte-fehlt', 'Keine Variantenkarte lesbar (assets/luxe-clothing-variantenkarte.json): das Fenster zeigt den Ladefehler.');
  else {
    const modellVon = new Map();
    for (const [m, zeilen] of Object.entries(karte.modelle)) for (const z of zeilen) modellVon.set(String(z[0]), m);
    const hideM = new Set(((ausblenden && ausblenden.modelle) || []).map(String));
    const hideV = new Set(Object.values((ausblenden && ausblenden.varianten) || {}).flat().map(String));
    const proVariante = new Map();
    for (const o of angebote) { const k = String(o.printfulVariantId); if (!proVariante.has(k)) proVariante.set(k, []); proVariante.get(k).push(o); }
    const ohneKarte = [], ausgeblendet = [], modelle = new Set(), ausfuehrungen = new Set();
    for (const [vid, os] of proVariante) {
      const m = modellVon.get(vid);
      if (!m) { ohneKarte.push(vid); continue; }
      if (hideM.has(m) || hideV.has(vid)) { ausgeblendet.push(vid); continue; }
      // gleiche Regel wie das JS: mindestens ein lieferbares Angebot; mehrere Angebote mit unterschiedlicher Identität machen die Ausführung unklar (hier nicht nachgerechnet: das JS ist die Instanz)
      if (os.some((o) => o.available !== false)) { modelle.add(m); ausfuehrungen.add(vid); }
    }
    sichtbar = modelle.size; bestellbareAusfuehrungen = ausfuehrungen.size;
    if (ohneKarte.length) meld('WARNUNG', 'angebot-ohne-karte', `${ohneKarte.length} Angebote auf Printful-Varianten ohne Eintrag in der Variantenkarte (unsichtbar, bis die Karte neu gebaut ist): ${ohneKarte.slice(0, 8).join(', ')}${ohneKarte.length > 8 ? ' …' : ''}.`);
    if (ausgeblendet.length) meld('HINWEIS', 'angebot-ausgeblendet', `${ausgeblendet.length} Angebote liegen auf ausgeblendeten Modellen oder Varianten (Zusatzschutz): sie erscheinen nicht.`);
    if (angebote.length > 0 && sichtbar === 0) meld('ALARM', 'sichtbar-null', `Es gibt ${angebote.length} Angebote, aber kein Modell bleibt sichtbar (Variantenkarte, Zusatzschutz, «available»).`);
  }

  // Produkte mit Tag ohne Angebot
  const produkteMitAngebot = new Set(angebote.map((o) => String(o.shopifyProductId)));
  if (getaggt !== null && getaggt > produkteMitAngebot.size && !befunde.some((b) => b.code === 'keine-angebote')) {
    meld('WARNUNG', 'produkt-ohne-angebot', `${getaggt - produkteMitAngebot.size} von ${getaggt} Produkten mit dem Tag ${TAG} haben kein Angebot im Fenster (das Paar «Variante:SKU» fehlt in pricing_allowed_pairs oder die Produktnummer in luxe-studio-blank-eligible).`);
  }

  const stufe = befunde.some((b) => b.stufe === 'ALARM') ? 'ALARM' : befunde.some((b) => b.stufe === 'WARNUNG') ? 'WARNUNG' : 'OK';
  return { stufe, befunde, zahlen: { angebote: angebote.length, produkteMitAngebot: produkteMitAngebot.size, sammlung: anzahl, getaggt, sichtbareModelle: sichtbar, bestellbareAusfuehrungen } };
}

// Exitcode für die Kommandozeile: 0 ok · 3 Warnung · 4 Alarm
export const exitCode = (stufe) => (stufe === 'ALARM' ? 4 : stufe === 'WARNUNG' ? 3 : 0);
