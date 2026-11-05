# Wegweiser-Sammlung, Kostüm-Sammlungstext, Löwenkopf-Sandalen (05.11.2026, Besitzer «weiter verb»)

Skript: `apply.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt, `ZURUECK=1 LIVE=1` nimmt zurück, Sicherung `sicherung.json`). Vor dem Schreiben von drei unabhängigen Gegenlesern geprüft (Workflow `wf_6321b3d6-e93`: Skript, Texte, Produkte); ihre Funde sind eingearbeitet.

## LIVE 05.11. ca. 14:55 UTC (frisch zurückgelesen, alles GLEICH)
1. **Wegweiser `aus-tiktok-und-instagram`** (Ziel von luxestyle.ch/tt und /ig, handgepflegt, 18 → 21 Produkte): aufgenommen BRUDER Roadmax Traktor (Beitrag 10.11.), Plüsch Kaiserpinguin 26 cm (13.11.), bworld Rennrad mit Radfahrer (14.11.). Preise gleich den Beiträgen, aktiv, im Onlineshop, Bestand da, erste Bilder gesichtet.
2. **`kostueme-ch-lager`:** Halloween-Absatz (`data-lux-anlass="halloween"`), «Über 960» und «meist in 2–3 Werktagen» entfernt; neu «… ab Schweizer Lager, solange der Vorrat reicht. Das voraussichtliche Lieferdatum steht beim Artikel und in der Kasse. … Fasnacht (ab 11.11.) …», SEO-Beschreibung 130 Zeichen. Gegenleser-Änderungen: keine «bei uns liegen»-Zusage (594 von 1 521 Produkten sind ausverkauft, GEMESSEN), «voraussichtlich» statt «genau», keine Eilzusage, «nach Rabatt».
3. **Zwei Sandalen auf ENTWURF** (eigener Text «echtem Kaninchenhaar», Storefront 404): `handbestickte-lowenkopf-sandalen-fur-damen-419458`, `zhensheng-happy-dongguofeng-tiger-head-sandale-133441`.
4. **Beitrag 12.11. 18:00 (FB/IG, Kerzenhalter) korrigiert:** «ab CHF 16.90» → «(Hirsch) · CHF 21.90» (der Preis 16.90 gehört zur Ausführung «Schwarz D», einem Windlicht; der Hirsch kostet 21.90 und ist vorgewählt). Metricool-Beitrags-ID neu 417891226, uuid `-6029234844495164842` gleich, Termin und Bilder unverändert.

## ZURÜCKGEHALTEN, bis die Seite stimmt (Gegenleser-Funde; im Skript Feld `halten`)
- **Haarspange Herz-Keks** (`schokoladen-ohrring-haarstecker-609700`, Beitrag 11.11. 12:15): beim Aufruf ist «Quadrat» vorgewählt, der Text verspricht ein Herz (stimmt nur für «Liebe», Variante 67790115242375); «Für Kinder» ohne Hinweis auf Kleinteile; Optionswert «Five Sterne» halb englisch.
- **Kerzenhalter** (`weihnachtsdeer-kerzenhalter-aus-eisen-1b5d86`, Beitrag 12.11.): Text beschreibt eine Verzierung aus Stoff/Kunststoff mit Weihnachtsmann/Schneemann/Elch, die auf keinem der 7 Bilder zu sehen ist; die zweite Ausführung «Schwarz D» (Windlicht) ist nicht beschrieben.
- **USB-Stick Flaschenöffner** (`usb-stick-flaschenoffner-aus-metall-534784`, Beitrag 15.11.): 4 bis 128 GB zum selben Preis CHF 15.90, Kapazität unbelegt (bekanntes Fälschungsmuster bei No-Name-Sticks, Verdacht, nicht bewiesen); Hauptbild ist eine Lieferanten-Collage.
Diese drei kommen in die Wegweiser-Sammlung (Feld `halten` im Skript entfernen, `LIVE=1` erneut; das Skript überspringt schon Aufgenommenes), sobald ihre Seiten korrigiert sind: Herz-Keks vor 11.11., Kerzenhalter vor 12.11., USB-Stick vor 15.11.

## Offen beim Besitzer (nichts geändert)
- «meist 2–3 Werktage» steht weiter im FAQ-Akkordeon der Sammlungsseiten, im Chat-/FAQ-Skript und im Text von 1 521 Fortura-Produkten («Versand ab Schweizer Lager mit DPD, meist in 2–3 Werktagen»), während die Produktseiten «Lieferung voraussichtlich 10.–11. Nov.» bzw. «20. Nov.–4. Dez.» zeigen (der am 27.10. dokumentierte Widerspruch; Fortura-Lieferzeit ungemessen, #1031 war der erste Messpunkt).
- Filterchip «🎃 Halloween» (107 Produkte) steht noch auf `kostueme-ch-lager`.
- Rennrad-Preis CHF 25.90 liegt bei mehr als dem Doppelten des Idealo-Preises (ab 12.99 EUR, Gegenleser, nicht selbst geprüft).
- Die Reihenfolge «Verfügbares zuerst» in den Kostümsammlungen ist nach dem Fortura-Abgleich leicht veraltet (2 von 48 vorderen Plätzen ausverkauft, unter der Schwelle 10 % des Lager-Wächters, deshalb nicht umsortiert: das hätte rund 900 Verschiebungen je Sammlung bedeutet).

## Lehren
- Ein Skript, das live schreibt, braucht einen Rücknahme-Pfad, der selbst Vorbedingungen prüft («nur zurück, wenn jetzt noch DRAFT / noch der geschriebene Text») und mit Wiederholung zurückliest, weil `collectionAddProducts`/`-RemoveProducts` asynchron laufen.
- Die Sicherung gehört NACH den erfolgreichen Schritt, sonst führt sie Dinge, die nie geschrieben wurden.
- Der unabhängige Produkt-Leser fand drei Probleme (falscher Preis zur Variante, unsichtbare Verzierung, vorgewählte falsche Variante), die weder Preis- noch Bildprüfung des Skripts sehen konnten: Seiten live lesen, Varianten einzeln.
