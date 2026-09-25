# Ausverkauft-Entwürfe ohne Rückweg — 25.09.2026

## GEMESSEN
- `lagerstand_hygiene.py` las nur `products(first:100)` ohne Seitenwechsel: **222** aktive Produkte mit Bestand 0.
  **221** sind gemischt (einzelne Varianten ausverkauft, der Rest kaufbar, also korrekt). Das eine wirklich
  unkaufbare («Plüsch Ohnezahn 60 cm», alle Varianten DENY+0) lag auf Seite 3, deshalb meldete jeder Lauf «0 gedraftet».
- Der Wächter draftete seit August **154** Produkte (`draft-ausverkauft`). **77** davon hatten wieder Bestand und lagen
  trotzdem tot im Entwurf, darunter Perücken, Engelsflügel, Masken und Skull-Stab, fünf Wochen vor Halloween.
- Ursache: `fortura_bestand_sync.mjs` setzt Bestände nur auf 0 und hebt sie wieder an. Es draftet und aktiviert
  NIE, und das ist Absicht (siehe Dateikopf). Den Entwurf setzte ein anderer Wächter, und niemand nahm ihn zurück.
- Keiner der 77 Entwürfe hatte einen EK. `fortura_ek_nachtragen.py` und `preis_verlustschutz.py` lesen nur aktive
  Ware. Nach dem EK-Nachtrag lagen **72** unter dem 25-%-Boden (Code + Gratisversand).

## GETAN
- `lagerstand_hygiene.py` paginiert jetzt; der Ohnezahn wurde gedraftet.
- **Fall C «Rückweg»** kommt in denselben Wächter, weil er den Entwurf herstellt. ACTIVE wird ein Produkt nur,
  wenn alle Punkte erfüllt sind:
  - Ledger-Entwurf dieses Wächters, Tag `ausverkauft-lieferant` noch vorhanden;
  - mindestens eine kaufbare Variante;
  - kein fremder Sperr-Tag und keine Klinge (`klingenregel`);
  - keine Weiterleitung von der Produktadresse;
  - keine SKU in einem anderen AKTIVEN Produkt;
  - jede kaufbare Variante hat einen EK. Unter dem Boden wird auf `boden(ek)` gehoben (Regel von
    `preis_verlustschutz`, höchstens 2×, sonst bleibt der Entwurf). Preis und Status werden rückgelesen.
- EK für 85 Varianten der Entwürfe aus dem Feed nachgetragen (dasselbe Werkzeug mit einem Mini-Export, rückgelesen).
- Zwei Titel nach der Multipack-Regel korrigiert: «HARIBO Riesenerdbeeren 9 g · 150 Stück in der Dose»,
  «Diadem aus Metall Royal Lady · 2 Stück».
- **73 zurück auf ACTIVE**, alle rückgelesen: ACTIVE, Tag weg, `onlineStoreUrl` gesetzt.

## BLEIBT ENTWURF (bewusst)
- Dirndlbluse weiss mit Spitze: dieselbe SKU ist im aktiven Produkt «Dirndlbluse» enthalten.
- Messer silber Ghost Face 33cm: Klingenregel (16.09.: keine Klingen im Verkauf).
- Geschenkset MEN'S COLLECTION Sixpack (Boden 89.90 bei Preis 32.00) und «Bierflaschen-Optik» (50.90 bei 23.90):
  Das sind Bündel mit VE 3; der Boden liegt über dem Doppelten des Preises.

## OFFEN
- Die Warnhinweise für Kinderspielzeug (`kinder_sicherheit.py`, nur ACTIVE) bekommen die zurückgeholten Bruder-Modelle
  beim nächsten Tageslauf.
