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

## Ausführung (16.11.2026, Freigabe des Besitzers auf Rückfrage: «Ja, Einspruch» und «Löschen»)

**Werkzeug:** `automation/merchant_fehler_beheben.py`, Workflow `merchant-fehler-beheben.yml`, Ziele in `plan.json`.

**Trockenläufe:**
- 43948374756: Der Einspruch-Dialog verlangt den Pflichtgrund «Nennen Sie einen Grund». Das Werkzeug übersprang korrekt.
- 43949111008: Jetzt fester Grund je Code. Es waren 18 Einsprüche und 32 Löschungen geplant, 0 Fehler.

**Scharfer Lauf 43949547904 (20:25 bis 20:30 UTC, GEMESSEN):**
- **32 von 32 verwaisten Einträgen gelöscht.**
  - Es sind 17 Angebote, deutsch und französisch.
  - Darunter sind alle 9 «Anzeigen-Overlay» und der Milchshaker («Lokale Anforderungen»).
  - Vor jedem Löschen war die Shopify-Variante frisch als fehlend bestätigt.
  - 90 Sekunden später gelesen: 0 noch sichtbar.
- **Einspruch 0 von 18:** Alle Aufrufe gaben HTTP 403 «This API endpoint is not enabled for your cloud project id».
  - QUELLE Google-Doku: `triggeraction` ist nur für freigeschaltete Projekte offen (Antrag über das «Shopping API Support Form»).
  - Das Rendern der Probleme geht, das Auslösen nicht.
  - **Weg:** Einspruch von Hand im Merchant Center, Auftrag `dropship/BROWSER-BEFEHL-MERCHANT-EINSPRUCH-1611.md`.

**Was danach noch sperrt** (Hypothese, bis zur nächsten Messung):
- Tabak (6 Fehlurteile, 1 echt)
- Lebende Tiere (4)
- Waffenteile (Schrittzähler-Uhr, 2 Nachtsichtgeräte, Gunstock)
- Alkohol (nur Liechtenstein)
- Bildlink (2, Google verarbeitet)

**Nachmessen:** 17.11. mit `merchant-bildprobleme.yml`, Modus `laender`. Erwartung: «Anzeigen-Overlay» und «Lokale Anforderungen» bei 0.
