# Printful-Rückmeldung automatisch (03.11.2026, Version 2 nach unabhängiger Prüfung)

Marken: **GEMESSEN** = hier abgefragt/ausgeführt · **QUELLE** = Dokumentation · **Hypothese** · **unbekannt**.

## Anlass (GEMESSEN)
Bestellung #1033 (Schweiz-Sticker «Steinbock», 3 Stück, Erlenbach): Printful meldete «versendet» (Lettische Post `LY076164335LV`, 3 Positionen in einer Sendung, Lieferung 4.–9.11.) **nur per Mail an den Besitzer**. In Shopify stand die Bestellung weiter auf «Nicht versendet», die Kundschaft wusste nichts. Von Hand nachgetragen (`fulfillmentCreate`, 03.11. 13:47 UTC, frisch gelesen: FULFILLED). Es gab keinen Weg von Printful zurück nach Shopify: `printful_sync.mjs` legt den Auftrag an (Tag `printful-synced`, Metafeld `printful.order_id`), liest aber nie zurück.

## Was automatisch läuft
`automation/printful_tracking.mjs` (Logik rein in `automation/lib/printful_tracking.mjs`), Workflow `.github/workflows/printful-tracking.yml`, **1 × täglich 15:23 UTC** (16:23 Schweizer Winterzeit; Regel SHARED-MEMORY «Crons einzeln, sparsam, max. 1×/Tag») und von Hand (`workflow_dispatch`, Schalter `dry_run`).

Je Bestellung mit Tag `printful-synced` ohne `printful-shipped`, jünger als 45 Tage, nicht storniert:
0. **Positionen an einem Fulfillment-Service-Standort** (die 25 «Selbst gestalten»-Produkte liegen am Standort «Printful», dort meldet die Printful-App selbst) werden nie angefasst: Bestellung übersprungen.
1. Printful-Auftrag lesen (`GET /orders/<printful.order_id>`); Empfänger gegen die Shop-Adresse prüfen (Name oder PLZ muss passen).
2. Jede Sendung **mit Sendungsnummer**, die Shopify noch nicht kennt, wird den offenen POD-Positionen zugeordnet (Printful-Variante = Suffix der Shopify-SKU `<sync>_<variantId>`, Varianten-SKU hat Vorrang wie in `printful_sync`) und mit `fulfillmentCreate` + `notifyCustomer: true` gemeldet. **Das löst die normale Shopify-Versandmail aus.** Nachsendungen (`reshipment`) und stornierte Sendungen werden übersprungen; dieselbe Nummer in zwei Sendungen ergibt EINE Meldung.
3. **Befund** (ein Mensch muss hinsehen): Telegram EINMAL + Tag `printful-problem`, Tag wird wieder entfernt, sobald der Befund verschwindet. Befunde: Printful `failed`/`canceled`/`onhold`; unbekannter Status; Sendung nicht zuordenbar; POD-Position ohne Printful-Variante in der SKU; «fulfilled», aber Shop-Positionen offen; fulfilled ohne Sendungsnummer seit über 48 h; Entwurf nie bestätigt (über 24 h); «inreview» über 72 h; «pending/inprocess/partial/archived» über 14 Tage; Printful-Auftrag nicht gefunden (404); Metafeld fehlt; Empfänger passt nicht; Fulfillment-Order pausiert/geplant.
4. Alles gemeldet und Printful «fulfilled» → Tag `printful-shipped` (die Bestellung wird nicht mehr gelesen).

Schutzregeln:
- **Lieber nichts melden als falsch melden:** Lässt sich eine Sendung nicht eindeutig auf offene Shop-Positionen abbilden (Variante fehlt, Menge zu gross, mehrere gleiche Positionen und getrennte Sendungen), wird die GANZE Sendung nicht gemeldet.
- **Keine doppelte Mail:** bekannte Sendungsnummern (Gross-/Kleinschreibung und Ränder egal, nur nicht stornierte Lieferungen) und die verbleibende Menge der Fulfillment-Orders. `fulfillmentCreate` wird bei Zeitüberschreitung/5xx NICHT wiederholt (sonst Doppelmail); nur Lesen und Tags werden wiederholt (3 Versuche).
- **Erfolg nur belegt:** gemeldet gilt nur, wenn die Antwort `fulfillment.id` und eine LEERE `userErrors`-Liste enthält.
- **Mehrere Standorte:** ein Aufruf je Standort, nur der erste mit Kundenmail.
- **Gemischte Bestellungen:** nur POD-Positionen (Tag `wunschdesign`/`printful_personalized_product`); CJ-/Fortura-Positionen bleiben offen.
- **Telegram-Ausfall:** schlägt die Zustellung fehl, wird das Problem-Tag NICHT gesetzt (der Alarm wird beim nächsten Lauf wiederholt) und der Lauf ist rot. Ohne Telegram-Zugang wird trotzdem getaggt.
- **Exit 1** bei technischem Fehler (nicht lesbar, Schreiben abgelehnt, Alarm nicht zugestellt, Zugangsdaten fehlen, Shopify-Anmeldung scheitert). Befunde sind nicht rot. **DRY_RUN:** alles ausser leer/`0`/`false`/`no`/`nein`/`off` ist Trockenlauf.
- **Wächter:** bezahlte, unversendete POD-Bestellung ohne `printful-synced` (auch mit nur `printful-review`), älter als 12 Stunden, nicht am Service-Standort → einmal Telegram + Tag `printful-wartet`. Der Text rät NICHT blind zum Sync-Start: erst im Printful-Dashboard nachsehen (sonst doppelter Auftrag).

## Was NICHT automatisch läuft (Befund, wichtig)
1. **Die Anlage der Druckaufträge** (`printful_sync.mjs`, Workflow `printful-sync.yml`) hat **keinen Zeitplan**: pausiert seit 13.06.2026 («Cron-Nulldiät»), letzter Zeitplan-Lauf 12.06. (GEMESSEN an der Lauf-Liste). Eine neue POD-Bestellung wird nur nach «Run workflow» an Printful gegeben. Bewusst **nicht** eingeschaltet: Codex-Prüfung 28.10. fand offene wichtige Fehler im Anlageweg (`dropship/CODEX-FUNDE-2810.md`: doppelter bestätigter Auftrag, wenn das Markieren scheitert; Nicht-POD-Bestellungen verdrängen POD aus den ersten 20; Druckdatei-Prüfung gibt bei Fehler frei). Jeder Auftrag kostet Geld. **Entscheid offen:** erst Funde beheben, dann Zeitplan.
2. **Die 25 Produkte am Service-Standort «Printful»** (GEMESSEN 03.11. am echten Shop: T-Shirt, Hoodie, Tasse, Jutebeutel, iPhone-Hülle, Allover-Artikel; 21 aktiv, 4 Entwurf; die übrigen 467 POD-Produkte liegen am «Shop location»). Der Printful-Shop ist als Typ `shopify` verbunden (GEMESSEN, `GET /stores`), die Printful-App ist also verbunden. **Hypothese, ungemessen:** Bestellungen mit diesen Produkten leitet Shopify als Fulfillment-Anfrage an die App; ob das automatisch bestätigt wird, hängt an der Einstellung im Printful-Dashboard. **Risiko:** läuft `printful_sync` (von Hand) auf eine Bestellung mit solchen Produkten, kann ein ZWEITER Druckauftrag entstehen. Es gab noch keine solche Bestellung (alle 31 bisherigen liegen am «Shop location»). Vor dem ersten Verkauf: in Printful die Auto-Bestätigung prüfen und `printful_sync` für Service-Positionen sperren (offen).
3. **Mails bei Teillieferung:** pro `fulfillmentCreate` mit `notifyCustomer` eine Benachrichtigung (QUELLE Shopify-Doku): bei zwei Sendungen kommen zwei Mails.

## Prüfung
- Tests: `node automation/printful_tracking_test.mjs` (Zuordnung, Wiedererkennung, Befunde, Schwellen, Empfänger, Gruppierung; Verhalten im Kindprozess gegen gefälschtes Shopify/Printful/Telegram). Der Fake-Shopify liefert nur Felder, die die Abfrage verlangt, und antwortet mit GraphQL-Fehlern bei unbekannten Feldern, falschen Argumenten oder Variablentypen.
- **Unabhängige Prüfung 03.11.** (5 Prüfer: Mutationsprobe, Shopify-Semantik, Printful-Semantik, Betrieb, Angreifer): rund 70 Funde, 31 davon überlebende Mutanten (84 von 151 überlebten die erste Testfassung). Behoben in Version 2: Erfolg von `fulfillmentCreate` nicht belegt, Service-Standort-Fulfillment-Orders, stille Hänger ohne Alarm, gleiche Nummer/Nachsendung doppelt, `DRY_RUN` nur bei `1`, Wächter-Text und `printful-review`-Lücke, Telegram-Ausfall und HTML-Zeichen, keine Wiederholung bei vorübergehenden Fehlern, Dauerfehler bei jedem Lauf, fehlende Zugangsdaten als grüner Lauf, API-Version, Cron-Häufigkeit, Checkout. Mutationsprobe der Version 2: siehe CLAUDE.md-Stand.
- Trockenlauf gegen den echten Shop (`DRY_RUN=1`, 03.11.): #1033 als abgeschlossen erkannt, 0 Fehler (Abfrage in API 2026-01 gültig). Zuordnung an der echten Printful-Antwort von #1033: `shipments[].items[].item_id` = `items[].id`, `items[].variant_id` = SKU-Suffix.
- **Ungemessen:** ob `fulfillmentCreate` durch diese App auf einer Fulfillment-Order am Service-Standort durchginge (Skript fasst sie bewusst nicht an); die Wirkung der ersten echten Meldung durch den Zeitplan (Kundenmail erst mit der nächsten POD-Bestellung messbar).

## Betrieb
- Trockenlauf von Hand: Actions → «Printful-Rückmeldung (Versand → Shopify)» → Run workflow → `dry_run`.
- Eine Sendung von Hand nachtragen, falls das Skript sie nicht meldet (Tag `printful-problem`): Shopify-Admin → Bestellung → «Als versendet markieren» mit Sendungsnummer; danach Tag `printful-shipped` setzen, sonst fragt das Skript weiter (der Befund verschwindet von selbst, sobald die Positionen erledigt sind).
- Stopp: Workflow in Actions deaktivieren.
