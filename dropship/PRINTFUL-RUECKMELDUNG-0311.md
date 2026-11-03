# Printful-Rückmeldung automatisch (03.11.2026)

Marken: **GEMESSEN** = hier abgefragt/ausgeführt · **QUELLE** = Dokumentation · **Hypothese** · **unbekannt**.

## Anlass (GEMESSEN)
Bestellung #1033 (Schweiz-Sticker «Steinbock», 3 Stück, Erlenbach): Printful meldete «versendet» (Lettische Post `LY076164335LV`, 3 Positionen in einer Sendung, Lieferung 4.–9.11.) **nur per Mail an den Besitzer**. In Shopify stand die Bestellung weiter auf «Nicht versendet», der Kunde wusste nichts. Von Hand nachgetragen (`fulfillmentCreate`, 03.11. 13:47 UTC, frisch gelesen: FULFILLED, Tracking gesetzt). Es gab keinen Weg von Printful zurück nach Shopify: `printful_sync.mjs` legt den Auftrag an (Tag `printful-synced`, Metafeld `printful.order_id`), liest aber nie zurück.

## Was jetzt automatisch läuft
`automation/printful_tracking.mjs` (Logik rein in `automation/lib/printful_tracking.mjs`), Workflow `.github/workflows/printful-tracking.yml`, **4 × täglich (06:17, 10:17, 14:17, 18:17 UTC)** und von Hand (`workflow_dispatch`, Schalter `dry_run`).

Je Bestellung mit Tag `printful-synced` ohne `printful-shipped`, jünger als 45 Tage:
1. Printful-Auftrag lesen (`GET /orders/<printful.order_id>`).
2. **failed / canceled / onhold** → Telegram (einmal) + Tag `printful-problem`; wird der Zustand wieder gut (z. B. neue Karte nach «Invalid Card Number»), wird das Tag entfernt.
3. Jede Sendung **mit Sendungsnummer**, die Shopify noch nicht kennt, wird den offenen POD-Positionen zugeordnet (Printful-Variante = Suffix der Shopify-SKU `<sync>_<variantId>`) und mit `fulfillmentCreate` + `notifyCustomer: true` gemeldet. **Das löst die normale Shopify-Versandmail aus.**
4. Alle POD-Positionen gemeldet und Printful «fulfilled» → Tag `printful-shipped` (die Bestellung wird nicht mehr gelesen).

Schutzregeln:
- **Lieber nichts melden als falsch melden:** Lässt sich eine Sendung nicht eindeutig auf offene Shop-Positionen abbilden (Variante fehlt, Menge zu gross, Position pausiert), wird die GANZE Sendung nicht gemeldet; Tag `printful-problem` + Telegram.
- **Keine doppelte Mail:** bekannte Sendungsnummern (an irgendeiner Lieferung der Bestellung, Gross-/Kleinschreibung egal) und die verbleibende Menge der Fulfillment-Orders verhindern eine zweite Meldung; schlägt nach der Meldung das Tag fehl, passiert beim nächsten Lauf nichts doppelt.
- **Gemischte Bestellungen:** nur Positionen von Produkten mit Tag `wunschdesign`/`printful_personalized_product` werden gemeldet; CJ-/Fortura-Positionen bleiben offen.
- **Teilsendungen:** gemeldet wird nur, was in der Sendung steht; `printful-shipped` erst, wenn alle POD-Positionen gemeldet sind.
- **Sendung ohne Sendungsnummer** wartet (kein Meldung ohne Nummer).
- **Exit 1** bei jedem gescheiterten Lese-/Schreibzugriff (roter Lauf = Zusammenfassung des Laufs lesen); «grün» heisst, dass gearbeitet wurde oder nichts offen war.
- **Wächter:** bezahlte, unversendete POD-Bestellung ohne `printful-synced`/`printful-review`, älter als 12 Stunden → einmal Telegram + Tag `printful-wartet`: der Druckauftrag wurde nie angelegt.

## Was NICHT automatisch läuft (Befund, wichtig)
**Die Anlage der Druckaufträge** (`printful_sync.mjs`, Workflow `printful-sync.yml`) hat **keinen Zeitplan**: pausiert seit 13.06.2026 («Cron-Nulldiät»), letzter Zeitplan-Lauf 12.06. (GEMESSEN an der Lauf-Liste). Eine neue POD-Bestellung wird also nur nach «Run workflow» an Printful gegeben. Den Zeitplan habe ich **bewusst nicht** eingeschaltet: Codex-Prüfung 28.10. fand offene wichtige Fehler im Anlageweg (`dropship/CODEX-FUNDE-2810.md`: doppelter bestätigter Auftrag, wenn das Markieren scheitert; Nicht-POD-Bestellungen verdrängen POD-Bestellungen aus den ersten 20 Treffern; Druckdatei-Prüfung gibt bei Fehler frei). Ein Auto-Lauf kostet Geld pro Auftrag. Der Wächter oben meldet, falls eine Bestellung liegen bleibt. **Entscheid offen:** erst die Funde beheben, dann den Zeitplan einschalten.

## Prüfung
Tests: `node automation/printful_tracking_test.mjs` (Zuordnung, Wiedererkennung, gefälschtes Shopify/Printful/Telegram im Kindprozess). Trockenlauf gegen den echten Shop (`DRY_RUN=1`, 03.11.): #1033 als abgeschlossen erkannt, 0 Fehler. Die Zuordnung wurde an der echten Printful-Antwort von #1033 geprüft: `shipments[].items[].item_id` = `items[].id`, `items[].variant_id` = SKU-Suffix (10163, 10164, 10165).

## Betrieb
- Trockenlauf von Hand: Actions → «Printful-Rückmeldung (Versand → Shopify)» → Run workflow → `dry_run`.
- Eine Sendung von Hand nachtragen, falls das Skript sie nicht meldet (Tag `printful-problem`): Shopify-Admin → Bestellung → «Als versendet markieren» mit Sendungsnummer; danach Tag `printful-shipped` setzen, sonst fragt das Skript weiter.
- Stopp: Workflow in Actions deaktivieren.
