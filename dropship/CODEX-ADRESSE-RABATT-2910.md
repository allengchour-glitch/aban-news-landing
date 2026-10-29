# Codex-Auftrag: Adress-Prüfung und Rabatt-Wächter (29.10.2026)

Besitzer 29.10. abends: Funktionen von AddressHero und DiscountHero (Shopify-Apps) selbst nachbauen, «ja aufschreiben». Nur Repo, Tests, Doku; kein Schreibzugriff auf Shopify, Klaviyo, CJ, Fortura; `LIVE=1` nie. Regeln wie in `dropship/CODEX-VOLLGAS-2810.md`.
Marken: **GEMESSEN** (29.10.2026, nur lesend) · **QUELLE** · **unbekannt**.

## Ausgangslage
- Der Shop hat den Plan «Shopify», **nicht Plus** (GEMESSEN). Eigene Checkout-Prüfungen (Shopify Functions, Cart and Checkout Validation) gehen nur mit Plus (QUELLE shopify.dev «About Shopify Functions»). Blockieren im Checkout geht also nur über fertige App; wir prüfen **nach der Bestellung**.
- Adressen (GEMESSEN, 29 Bestellungen): 0 ohne Hausnummer, **2 mit der Nummer nur in Adresszeile 2** (7 %), z. B. Strasse in Zeile 1, Nummer in Zeile 2.
- Rabatte (GEMESSEN): `WELCOME10` 7-mal genutzt, keine doppelte Lieferadresse, kein Mail-Trick; `WELCOME10`, `FIRST15`, `INSTA15`, `NEWSLETTER10` sind «einmal pro Kunde» (zählt pro Kunde/E-Mail, Alias-Tricks bleiben möglich). AddressHero ist App-Store-Produkt, DiscountHero kostet 99 Dollar im Monat (QUELLE apps.shopify.com).

## Aufträge
**A1. Adress-Prüfung** `automation/lib/adresse_pruefen.mjs` (+ `_test.mjs`, in `luxestyle-automation-tests.yml` unter `sparse-checkout` UND `paths` eintragen): reine Funktion `pruefeAdresse({address1,address2,zip,city,country})` → `{ok, befunde:[{code,text}], vorschlag}`. Befunde: `keine-hausnummer` (weder Zeile 1 noch 2 mit Ziffer), `nummer-in-zeile-2` (Vorschlag: zusammenführen), `plz-ort-passt-nicht` (CH/LI: vierstellige PLZ gegen eine mitgegebene PLZ-Tabelle, **die Tabelle ist Eingabe, kein Netz**; unbekannte PLZ = «nicht prüfbar», nie Fehler), `packstation` (DPD liefert nicht an Packstationen: Wortliste, mit Wortgrenze), `sonderzeichen` (Steuerzeichen, Emoji). Gegenproben in beide Richtungen mit echten Schweizer Adressen («Hüningerstrasse 1», «Boulevard d'Yvoy 1», «Stationsstrasse 31A», «Rue de Lausanne 12bis»); «Ländtestrasse | 49» muss `nummer-in-zeile-2` melden, nicht `keine-hausnummer`. Mutationsprobe.
**A2. Auswertung für Bestellungen** `automation/adresse_bestellungen.mjs`: liest eine Bestellliste als JSON-Datei (Format wie die GraphQL-Antwort `orders{ name shippingAddress{…} }`, kein Netz in Tests), ruft A1 auf, schreibt Trockenlauf-Bericht (Zahl geprüft, Zahl mit Befund, je Befund Beispiele). Schreibwege (Tag setzen, Mail) **nicht** bauen; sie macht Claude nach dem Merge, weil Klaviyo-Mails an Kunden Besitzer-Entscheid sind.
**A3. Rabatt-Wächter** `automation/rabatt_waechter.mjs` (+ Test): liest Bestellungen mit Rabattcodes als JSON-Datei und meldet je Code Wiederholungen nach (a) gleicher normalisierter Lieferadresse (Strasse+Nummer+PLZ, Gross-/Kleinschreibung, Leerzeichen, «str.»/«strasse»), (b) gleicher E-Mail-Basis (Gmail-Punkte und `+alias` entfernen), (c) gleichem Namen bei anderer Adresse (nur als «prüfen», nicht als Missbrauch). Nur Bericht, keine Aktion. Gegenproben: zwei verschiedene Haushalte im selben Mehrfamilienhaus (gleiche Strasse, andere Nummer/Etage) dürfen **nicht** als Dublette gelten.
**A4. Doku** in diesem Dokument ergänzen (Abschnitt mit Datum): was gebaut ist, Testbefehle, was Claude anschliesst.

## Vom Besitzer nötig (nicht von Codex entscheiden)
- Klaviyo-Mail «Bitte Adresse bestätigen» an Kunden (Wortlaut, Auslöser): Besitzer-Entscheid.
- Ob Bestellungen mit Befund vor dem Versand an Fortura/CJ **angehalten** werden oder nur markiert.

## Zurück an Claude
Pro PR eine Zeile «Fund | nachgestellt (Befehl) | Test vorher rot, nachher grün». Entscheide unter «Entscheid nötig» in der PR-Beschreibung.
