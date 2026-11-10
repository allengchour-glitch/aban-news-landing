# Bestellung ohne Design: festgelegter Ablauf (WP6 Paket A, 06.11.2026)

**Stand:** Ablauf des Syncs gebaut und getestet (Attrappe, kein Shopify, kein Printful), **nichts live**. Der Mail-Text unten ist ein **Entwurf und ausdrücklich NICHT freigegeben**: Kundenkontakt und Erstattungen entscheidet der Besitzer, nie Code.

## Wann das vorkommt (Hypothese, nicht ausprobiert)

Eine Kundin bezahlt ein «Selbst gestalten»-Produkt, die Position trägt aber keine Druckdatei. Denkbare Wege (alle ungemessen, nur aus dem Aufbau geschlossen):

- Kauf ohne den Editor: direkte Produktadresse mit Variante, Shop-App, Google-Link, Warenkorb von Hand gebaut.
- Der Editor war offen, aber der Upload zu Cloudinary kam nie an und die Zeile ging trotzdem in den Warenkorb (ob der Editor den Kauf dann sperrt, ist hier nicht geprüft; ein Fehler dort wäre ein Fund für den Editor).
- Eine Eigenschaft ging beim Zusammenführen von Warenkörben verloren.

Eine Position MIT Design in schlechter Auflösung ist **ein anderer Fall** (weicher Befund `aufloesung` oder `qd-weicht-ab`: Auftrag wird als Entwurf angelegt und von Hand geprüft).

## Was der Sync tut (getestet in `automation/printful_sync_test.mjs`, Abschnitt WP6)

Der Befund heisst `keine-druckdatei` und ist **hart** (so war er schon vorher; neu ist der Text und dass das Karten-Echo wegfällt):

1. Es entsteht **kein Printful-Auftrag**, weder Entwurf noch bestätigt. **Das gilt für die ganze Bestellung:** ein harter Befund an einer Position hält alle Positionen derselben Bestellung an (auch eine zweite, gute POD-Position wird dann nicht automatisch gedruckt).
2. Die Bestellung bekommt die Tags `printful-review` und `printful-review-keine-druckdatei` und wird danach nicht mehr gelesen (die Abfrage schliesst `printful-review` aus).
3. **Eine** Telegram-Meldung mit 🔴 an den privaten Chat (höchstens eine je Befundart und Bestellung; ein zweiter Lauf meldet nicht erneut). Der Text sagt, ob ein Editor-Eintrag da war («Editor-Eintrag da, Druckdatei fehlt (Upload gescheitert?)») oder keiner («kein Editor-Eintrag (direkte Adresse, Shop-App oder Google-Link?)»), und nennt diese Datei. Länge höchstens 262 Zeichen bei 255 Zeichen Titel (GEMESSEN 06.11.2026; der Sync kürzt Zeilen bei 300).
4. Das öffentliche Protokoll (Actions) nennt nur Bestellnummer und Befundart `keine-druckdatei`, keinen Titel und keinen Kundentext.
5. Die Zusammenfassung zählt die Bestellung unter «ohne Auftrag (harter Befund)». Exit-Code 0 (ein Befund ist kein technischer Fehler).
6. Der Wächter in `printful_tracking.mjs` meldet eine bezahlte POD-Bestellung ohne Tag `printful-synced` nach 12 Stunden noch einmal (🟠, «der Sync hat sie angehalten») und weist darauf hin, dass ein Neustart nichts ändert. Das gilt für Produkte am normalen Standort (so liegen die Fabrik-Produkte, z. B. die Canary-Tasse); Produkte am Fulfillment-Standort «Printful» (die bisherigen 25) zählt er bewusst nicht (`dienstZeilen`). Aus dem Code gelesen, nicht mit einer echten Bestellung gemessen.

7. **Stand 10.11.2026 (Härtung P1, Fund 22):** Ein **Editor-Produkt** (Tag `wunschdesign`) druckt ohne Design der Kundin **nie** das feste Motiv aus dem Produkt-Metafeld `custom.print_file`; sonst wäre eine Bestellung ohne Design, bei der das Produkt zufällig dieses Metafeld trägt, still mit dem Muster des Besitzers gedruckt worden. Das Metafeld gilt nur für **Fertigware** (Tag `printful_personalized_product` ohne `wunschdesign`, z. B. die Fertig-Sticker). Beides ist in `printful_bestellweg_test.mjs` und `printful_sync_test.mjs` getestet (Mutanten `H10 F22`). Eine Bestellung, die nicht bezahlt, storniert, erstattet oder ein Test ist, kommt gar nicht bis hierher (Prüfung am Knoten, siehe `SYNC.md` 7.10); der Fall «ohne Design» betrifft nur bezahlte Bestellungen.

**Was der Sync ausdrücklich NICHT tut:** keine Mail an die Kundin, keine Rückerstattung, keine Stornierung, keine Versandmeldung, kein Metafeld. Die **einzige** Schreibaktion an Shopify ist das Setzen der beiden Tags (Test: `shopOps` ist genau `['tagsAdd']`); an Printful geht nur die lesende Nachfrage nach einem bestehenden Auftrag mit der Kennung `LX<Nr>`.

## Was der Besitzer tut

1. **Meldung lesen** und die Bestellung im Shopify-Admin öffnen: Position, Eigenschaften (`🎨 Design …`, `_pod_karte`, falls vorhanden), Lieferadresse, E-Mail der Kundin. Unsichtbare Eigenschaften mit führendem Unterstrich zeigt der Admin an (QUELLE community.shopify.dev, nicht selbst gemessen).
2. **Ursache einordnen:** «Editor-Eintrag da» heisst, dass die Kundin gestaltet hat und nur die Datei fehlt (dann Fehler im Editor oder Cloudinary möglich: Zeit und Uhrzeit notieren, der Browsertest `L4` aus `pod/v6/README.md` hilft). «Kein Editor-Eintrag» heisst Kauf ohne Editor.
3. **Entscheiden** (nur der Besitzer, nicht der Code):
   - **A. Motiv nachfordern.** Die Kundin schreibt man selbst an (Entwurf unten). Kommt die Datei: im **Printful-Dashboard von Hand** einen Auftrag mit der Lieferadresse der Bestellung anlegen (Datei hochladen, Entwurf ansehen, bestätigen). Wenn das Dashboard eine «External ID» anbietet (ungemessen), `LX<Bestellnummer ohne #>` eintragen; so findet der Sync den Auftrag bei einem späteren Lauf («existiert schon», nie ein zweiter).
   - **B. Erstatten.** Im Shopify-Admin: Bestellung → «Erstatten». Es ist noch nichts gedruckt, bei Printful entstehen keine Kosten.
   - **C. Ersatz anbieten** (ein fertiges Produkt statt des selbst gestalteten): das ist ein Gespräch mit der Kundin, kein Ablauf im Sync.
4. **Tags nach dem Entscheid:** `printful-review` und `printful-review-keine-druckdatei` **stehen lassen**, bis die Bestellung erledigt ist (erstattet oder versendet). Entfernt man `printful-review` vorher, liest der Sync die Bestellung wieder und meldet dieselbe Lage erneut.
   - Nach A (von Hand bei Printful angelegt): zusätzlich das Tag `printful-synced` setzen; das hält den 12-Stunden-Wächter ruhig. Ohne das Metafeld `printful.order_id` meldet `printful_tracking.mjs` einmal «Tag printful-synced ohne Metafeld» und gibt keine Versandmail aus: Sendungsnummer dann von Hand in Shopify eintragen («Als versendet markieren»), Versandmail an die Kundin ebenfalls von Hand.
   - Nach B: nichts weiter; eine erstattete Bestellung fällt aus den Abfragen.

## Entwurf der Kundenmail (NICHT freigegeben)

Ton wie die Antwortvorlagen vom 03.11. (`dropship/SOCIAL-ANTWORTVORLAGEN-0311.md`): Schweizer Hochdeutsch, «du», kurz, ehrlich. Platzhalter in `{{ }}`. **Vor dem Senden prüfen:** die Erstattungs-Zusage (Satz 4) ist eine Zusage im Namen des Besitzers, die Zeile in eckigen Klammern nennt eine Lieferzeit und gehört nur hinein, wenn er sie so will (Regel: keine Lieferdaten zusagen, die nicht auf der Produktseite stehen).

> **Betreff:** Deine Bestellung {{Nummer}} bei LuxeStyle: dein Design fehlt noch
>
> Hallo {{Vorname}}
>
> Danke für deine Bestellung {{Nummer}} ({{Produktname}}). Beim Bestellen ist dein Design bei uns nicht angekommen, darum können wir noch nichts drucken lassen.
>
> Du hast zwei Möglichkeiten:
>
> 1. Du schickst uns dein Motiv als Antwort auf diese E-Mail. Am besten als PNG oder JPG in möglichst hoher Auflösung. Bei einem Text schreib uns den Wortlaut, die Schriftart und die Farbe. Wir schauen es an und melden uns, bevor wir drucken lassen.
> 2. Du möchtest die Bestellung nicht mehr? Dann schreib uns kurz «Erstattung». Wir erstatten dir den Betrag auf das Zahlungsmittel, mit dem du bezahlt hast.
>
> [Gedruckt wird erst, wenn dein Motiv bei uns ist; die Lieferzeit von der Produktseite gilt ab diesem Tag.]
>
> Freundliche Grüsse
> {{Name}}
> LuxeStyle
> info@luxestyle.ch

## Was ungemessen bleibt

- Ob und wie oft Käufe ohne Design vorkommen. Bis zur ersten echten POD-Bestellung (WP8, Probebestellung durch den Besitzer) ist der Fall nur aus dem Aufbau geschlossen und in der Attrappe getestet.
- Ob das Printful-Dashboard beim Anlegen von Hand eine «External ID» anbietet.
- Wie der Shopify-Admin Eigenschaften mit führendem Unterstrich anzeigt (QUELLE, nicht selbst gemessen).
- Die Zustellung der Telegram-Meldung in der Praxis (im Test ein gefälschtes Telegram).
