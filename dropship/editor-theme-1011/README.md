# Editor-Fehlersuche 10.11.2026: drei Theme-Korrekturen (LIVE)

Auftrag des Besitzers: «printeresr fehlerfrei machen». Ablauf: Workflow mit drei Prüfern (Sweep über alle 19 «Selbst gestalten»-Seiten, Desktop und Handy, 496 Variantenmessungen; aktive Abläufe auf 6 Seiten, Kauf abgefangen; Offline-Prüfung und Zufallstests mit dem Testgeschirr), jeder Fund einzeln von einem zweiten Prüfer nachgestellt. **Ergebnis: 24 bestätigte Funde, 0 Blocker, 3 wichtig, 21 klein.** Die drei wichtigen liegen im Editor-Code 6.4.0 (leere Textebene sperrt den Kauf mit falscher Meldung; Schieber springt nach Zahleneingabe, in 6.4.1 schon behoben; sehr kleine Ebenen werden beim Antippen gelöscht) und brauchen eine neue Editor-Datei samt Rollout (Stunden, Ja des Besitzers je Stufe). Kaufweg und Preise waren sauber (473 von 473 Preisen, `_pod_karte` passt zur Variante, Doppelklick sendet eine Anfrage, 0 Konsolenfehler des Editors).

## Was dieses Paket live setzt (10.11.2026, Rücklesen GLEICH, Storefront geprüft)

| Schritt | Datei im MAIN-Theme | Wirkung |
|---|---|---|
| T1 | `layout/theme.liquid` (Block `lx-editor-tippflaeche-1011` vor `</head>`, nur Produktseiten bis 600 px) | Ebenen-Knöpfe ▲ ▼ und Link «Ganze Vorlage zeigen» mindestens 44 px |
| T2 | `blocks/buy-buttons.liquid` | Text unter dem Hauptknopf nennt die echten Knöpfe («Druckvorschau prüfen», «Druckvorschau bestätigen und in den Warenkorb») statt des alten «Mit meinem Design in den Warenkorb»; auf den drei Sperrseiten (Magnet, Dad-Cap, Bügeltransfer) steht ein ehrlicher Satz statt einer Gestaltung «weiter unten» |
| T3 | `layout/theme.liquid` (`lxZeigen`) | der Cookie-Banner kommt nach erteilter Zustimmung nicht mehr nach 20 s wieder (der Rückfall-Timer prüfte die gespeicherte Entscheidung nicht) |

Nichts davon berührt Editor-Datei, Druckdatei, Warenkorb oder Kasse.

## Dateien, Prüfung, Rücknahme

`patch.mjs` (rein), `ablauf.mjs` (Ablauf mit Rückweg), `apply.mjs` (Verdrahtung), `test.mjs` (20 Prüfungen, mit LiquidJS: `node test.mjs <pfad/zu/liquid.node.cjs.js>`), `ablauf_test.mjs` (20, Attrappe des Shops), `mutation.mjs` (16 von 16 Mutanten erkannt), `sicherung/*.vor` (die Dateien VOR dem Einspielen), `lauf_live.log`.

```
ZURUECK=1 LIVE=1 node dropship/editor-theme-1011/apply.mjs     # kehrt nur diese Änderungen um (NUR=T2 für einen Schritt)
```
Trockenlauf ist Vorgabe. Wird ein anderes Theme veröffentlicht, fehlen die Änderungen dort.

## Offen (Plan der Fehlersuche)

- **Editor 6.4.2** (Basis eingefrorene 6.4.1 plus Korrekturen E1 bis E8: leere Textebene, Griffe kleiner Ebenen, Zahlenfelder und Schieber, Fehlertexte bei kaputten Bildern, ausverkaufte Ausführung, Esc und Fokus, Layoutsprung, Einpassung in der Vorschau): braucht Aufbau, Tests, Mutationsprobe, Gegenleser und Rollout mit Ja des Besitzers je Stufe.
- **Daten:** Samsung-Vorlagenbild trägt englischen Anleitungstext (69 von 92 Kombinationen); transparente iPhone-Hülle ohne Vorlagenbild; Kiss-Cut 7,6 cm zeigt einen weissen Rahmen als «Produktfoto»; 7 Seiten ohne Reiter (keine Vorschaudaten).
- **Besitzer:** Das Newsletter-Popup erscheint 20 bis 46 s nach dem Laden und kann den ersten Klick auf «Druckvorschau prüfen» abfangen (Geschäftsentscheid).
- **Ungemessen:** Safari, Firefox, echtes Handy, Bildschirmleser, echter Warenkorb/Kasse/Printful-Auftrag.
