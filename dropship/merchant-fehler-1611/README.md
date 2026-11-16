# Merchant: die «13 Fehlergruppen» vom 16.11.2026 (nur gelesen)

**Anlass:** Besitzer 16.11. «13 fehlergruppen», mit Screenshot «Überprüfung erforderlich», 13 Fehlerbehebungen. Erste Zeile: «Anzeigen-Overlay auf Bild».

**Werkzeug:** `automation/merchant_bildprobleme.py`, Workflow «Merchant-Bildprobleme lesen». Alle Läufe lesen nur. Kontonummern werden nie ausgegeben.

## Messung (GEMESSEN 16.11.)

**Lauf `laender` 43945004049 (20:00 UTC):** 137 106 Zeilen, alle aus der Shopify-App.

- **Der Autofeed ist weg.** Er war am 15.11. ausgeschaltet worden.
- **Liechtenstein «Versand fehlt»: 0.** Am 15.11. waren es 160 095. Der Dienst «Standard Liechtenstein» wirkt.
- **Status:** 136 670 freigegeben, 383 eingeschränkt, 51 gesperrt, 2 in Prüfung.

**Gruppen, die nur Remarketing betreffen** (kostenlose Einträge und Shopping bleiben frei):

| Gruppe | Zeilen |
|---|---|
| Persönliche Notlagen | 285 |
| Sexuelle Interessen | 51 |
| Eingeschränkte Ware | 51 |
| Rechtliche Einschränkungen | 25 |
| Erwachsene | 12 |
| Weltanschauung | 10 |

Hier ist nichts zu tun.

**Gruppen, die sperren:**

| Gruppe | Wirkung |
|---|---|
| Anzeigen-Overlay auf Bild | Schweiz und Liechtenstein, alle Kontexte |
| Tabak | Schweiz und Liechtenstein, alle Kontexte |
| Waffenteile | Schweiz und Liechtenstein, alle Kontexte |
| Lebende Tiere | Schweiz und Liechtenstein, alle Kontexte |
| Lokale Anforderungen | Schweiz und Liechtenstein, alle Kontexte |
| Bild nicht verarbeitet / Verzögerung | Schweiz und Liechtenstein, alle Kontexte |
| Alkohol | **nur Liechtenstein** |

**Lauf `bilder` 43945270735 (20:01 UTC):** 45 sperrende Angebote in 36 Produkten. Liste je Produkt: `lage.json`.

## Hauptbefund: 17 der 45 Angebote sind verwaist

**Die Varianten dieser 17 Angebote gibt es im Shop nicht mehr** (Admin API `nodes`, 16.11. 20:10 UTC).

- Betroffen sind **alle 9 «Anzeigen-Overlay»-Angebote**, der Milchshaker («Lokale Anforderungen»), die Kaffeetasse (Tabak) und vier Tierartikel.
- Google hält dort alte Daten samt den alten CJ-Bildern.
- Das erklärt, warum die Bildrunde vom 11.11. die Einblendungen nicht wegbrachte. Die Hauptbilder im Shop sind sauber (Kontaktbogen gesichtet), aber die verwaisten Angebote zeigen weiter die alten Bilder.
- **Ursache unbekannt.** Hypothese: Die Varianten wurden beim Neuaufbau einer Auswahl ersetzt, und die Google-App hat die alten Angebote nicht gelöscht.

## Was Google anbietet (Lauf `aktionen` 43946384589, 20:08 UTC, `renderproductissues` de-CH)

- Bei jedem Richtlinienproblem gibt es die eingebaute Aktion «Meiner Meinung nach liegt kein Problem vor» (Ablauf `disagree`).
  - Sie ist je Produkt verfügbar, dazu als Variante «bei keinem Produkt».
  - Auslösen geht über `issueresolution triggeraction`. Bisher ist noch nichts ausgelöst.
- Bei «Anzeigen-Overlay» gibt es zusätzlich «Attribut bearbeiten».
- Nebenbei meldet Google bei einigen Produkten «Mengeneinheit für Grundpreis fehlt» und beim Ladepad «Fehlendes Zertifizierungsattribut». Beides sperrt nicht.

## Einordnung je Gruppe

- **Fehlurteile mit bestehenden Varianten (11 Produkte):**
  - Tabak: Seifenspender, Doppeldisplay-Halter, Magnetische Handyhalterung, Handyhalterung kabellos, Mini-Lockenstab, Automatischer Lockenstab.
  - Lebende Tiere: Hüpfball, Halsbandglöckchen, Multifunktions-Hundeleine, Schnüffelteppich.
  - Waffenteile: Pedometer-Uhr.
  - Mittel: Einspruch «kein Problem».
- **Verwaiste Angebote (17):** Einspruch ist sinnlos. Mittel: die Angebote löschen (Merchant API `productInputs.delete`) oder abwarten, bis Google sie nach 30 Tagen ohne Aktualisierung verfallen lässt. Der Verfall ist eine Annahme, nicht gemessen.
- **Bleibt, kein Einspruch:**
  - Zigarren-Etui: echtes Tabakzubehör.
  - Zwei Nachtsichtgeräte und «Gunstock» für die Switch: strittig, Google wertet sie als Waffenzubehör.
  - Alkohol-Zubehör: nur Liechtenstein gesperrt.
- **Bildlink (Laternenstab, QS19):** Googles Verarbeitung. Abwarten.

**Wirkung auf Verkäufe:** klein. Es geht um 36 von rund 25 500 Produkten der App.
