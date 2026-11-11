# Gesperrte «Selbst gestalten»-Produkte: auch serverseitig nicht kaufbar (11.11.2026)

**Stand: LIVE seit 11.11.2026, 09:06 UTC (Magnet, Bügeltransfer) und 09:12 UTC (Dad-Cap), auf zwei ausdrückliche Antworten des Besitzers.** Der erste Live-Versuch wurde von der Berechtigungsprüfung der Sitzung abgelehnt und nicht umgangen; nach der gezielten Frage («Ja, nicht kaufbar stellen») lief derselbe Befehl.

## Ergebnis des Live-Laufs (GEMESSEN)

| Produkt | Vorher | Jetzt | Beleg |
|---|---|---|---|
| Magnet (3 Varianten) | kaufbar, `InStock` | Bestandsführung an, DENY, nicht kaufbar | Admin frisch gelesen; `cart/add.js` für alle drei Varianten HTTP 422 «bereits ausverkauft»; Seite 09:22 UTC: «Momentan ausverkauft», JSON-LD `OutOfStock` |
| Bügeltransfer (1 Variante) | kaufbar, `InStock` | Bestandsführung an, DENY, nicht kaufbar (Menge bleibt −1) | Admin frisch gelesen; Seite 09:22 UTC: «Momentan ausverkauft», JSON-LD `OutOfStock`; `cart/add.js` von aussen nicht messbar (HTTP 429, Drosselung) |
| Dad-Cap (1 Variante) | kaufbar, 8 Kanäle | **unverändert kaufbar im Onlineshop**, aber nur noch im Kanal Online Store, Tag `editor-gesperrt-nicht-live` | `inventorySetQuantities` am Standort «Printful»: `INVALID_LOCATION` (Shopify lässt uns dort nicht schreiben); `dad_cap_kanaele.mjs` frisch nachgelesen: ACTIVE, 1 Kanal, Tag gesetzt; Seite 09:22 UTC weiter `InStock` und «Bestelle jetzt» |

- **Dad-Cap ist eine Zwischenlösung.** Entscheid des Besitzers am 11.11.: «1, solange nicht du fix» (von den Kanälen nehmen, bis er richtig freigeschaltet ist). Restlücke: ein direkter Warenkorb-Link im Onlineshop. Offen: Dad-Cap entweder richtig freischalten (Stickplatzierung prüfen) oder aus «Selbst gestalten» nehmen.
- **Nicht ausgeführt:** `promo_raus.mjs` (Bügeltransfer aus `hype-jetzt`/`viral-hits` und aus der Hand-Sammlung `bestseller-premium-heroes` nehmen, weil er dort jetzt als «ausverkauft» vorn steht). Die Berechtigungsprüfung lehnte den Lauf zweimal ab; er braucht ein ausdrückliches Ja.
- `PRUEFEN=1 node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` meldet nach dem Lauf: 4 Varianten ok, Dad-Cap «kaufbar trotz Sperre» (Exit 2). Das ist der erwartete Stand, bis der Dad-Cap gelöst ist.
- Rücknahme: `ZURUECK=1 LIVE=1 node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` (Magnet, Bügeltransfer) und `ZURUECK=1 LIVE=1 node dropship/sperre-verfuegbar-1111/dad_cap_kanaele.mjs` (Kanäle und Tag). Sicherungen: `sicherung.json`, `sicherung_dad_cap.json`.

## Befund (GEMESSEN 11.11.2026, 08:55 bis 09:10 UTC)

- Magnet (`magnet-zum-selbstgestalten`), Dad-Cap (`dad-cap-selbst-gestalten`) und Bügeltransfer (`buegeltransfer-selbst-gestalten`) tragen seit 08.11. in der Beschreibung die Sperre «Personalisierung derzeit nicht bestellbar» (Marker `lx-v63-editor:start … mode=blocked`, Review-Gate des Editor-Rollouts).
- Die Sperre wirkt nur im Browser der Produktseite. `POST /cart/add.js` nimmt die Magnet-Variante trotzdem an (HTTP 200). Alle fünf Varianten sind `availableForSale`, die Produkte stehen auf acht Kanälen (auch Google & YouTube, Shop, TikTok, Facebook & Instagram), das JSON-LD meldet `InStock`, und die Produktseite zeigt neben der Sperre «Bestelle jetzt – Lieferung voraussichtlich …».
- ChatGPT schickt Besucher auf die Magnet-Seite: 5 Sitzungen in 14 Tagen (`utm_source = chatgpt.com`), 0 Käufe.
- Folge heute: Eine Bestellung über einen anderen Kanal oder einen Warenkorb-Link käme ohne Motiv an (kein Druckauftrag möglich, Erstattung nötig). Google bekommt «lieferbar» für Artikel, die die Seite als nicht bestellbar zeigt.

## Was das Skript tut

`sperr_verfuegbar.mjs` (Kopfkommentar lesen), dazu `dad_cap_kanaele.mjs` (Kanäle und Sperr-Tag für den Dad-Cap) und `promo_raus.mjs` (nicht ausgeführt). Nur diese drei Produkte, nur solange die Beschreibung `mode=blocked` trägt, je Variante: Bestandsführung an, Mengen über 0 auf 0, zuletzt die Regel DENY. Status, Kanäle, Beschreibung, Preise und Tags bleiben.

| Aufruf | Wirkung |
|---|---|
| `node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` | Trockenlauf (Vorgabe), zeigt den Plan |
| `LIVE=1 node …/sperr_verfuegbar.mjs` | sperrt, legt `sicherung.json` an, liest frisch zurück |
| `PRUEFEN=1 node …/sperr_verfuegbar.mjs` | nur lesen, Exit 2, wenn ein gesperrtes Produkt kaufbar ist |
| `ZURUECK=1 LIVE=1 node …/sperr_verfuegbar.mjs` | stellt den Ausgangsstand wieder her |

Trockenlauf am 11.11. (Exit 0): Magnet 3 Varianten und Bügeltransfer 1 Variante am Standort «Shop location» (nicht bestandsgeführt, Menge 0 bzw. −1), Dad-Cap 1 Variante am Standort «Printful» (Menge 9999). `PRUEFEN=1` vor der Änderung: 5 Varianten «kaufbar trotz Sperre» (Exit 2).

## Sichtbare Folgen (laut Gegenlesung; Produktseiten am 11.11. nachgemessen, Sammlungen und Katalogfenster noch nicht)

- Produktseite: rote Pille «Momentan ausverkauft» ohne Lieferbox statt «Bestelle jetzt». JSON-LD `OutOfStock` (Seiten-Cache kann rund 20 Minuten nachhinken).
- Sammlungskarten: Abzeichen «Ausverkauft». Der Bügeltransfer steht in `hype-jetzt` und in der Sammlung «Selbst gestalten» auf Platz 1: danach `HANDLES=hype-jetzt node automation/verfuegbar_zuerst.mjs` im Trockenlauf prüfen.
- Katalogfenster «Selbst gestalten»: die Modelle von Magnet und Dad-Cap fallen aus der Liste (Modellzahl nachmessen).
- Google: «nicht auf Lager» ist die ehrlichere Angabe (Verfügbarkeit muss auf Seite, strukturierten Daten und Datenquelle gleich sein).

## Auflagen aus der Gegenlesung (zwei Prüfer, beide «ausführen mit Änderungen», alle wichtigen Funde eingearbeitet)

1. **Dad-Cap ist nicht dauerhaft gesperrt:** Sein Bestand liegt am Standort des Printful-Dienstes. Printfuls Lagerabgleich und Shopifys stündliche Abfrage können die 0 wieder auf 9999 setzen, dann ist er trotz DENY wieder kaufbar. Nach dem Live-Lauf frühestens nach 70 Minuten und nach 24 Stunden `PRUEFEN=1` fahren, danach in eine tägliche Kontrolle nehmen (Vorschlag: Kaufweg-Wächter, `GET /products/<handle>.js` liefert `available` ohne Admin-Zugang). Fällt er zurück: kein stiller Zweitversuch, sondern Entscheid mit dem Besitzer.
2. **Vor dem Entsperren eines der drei Produkte zuerst die Rücknahme fahren.** Das Rollout-Werkzeug (`rollout-v63-direct/direct_rollout_lib.mjs`, `produktPruefen`) wirft sonst «keine kaufbare Variante». Solange die drei auf seiner Blockliste stehen, bricht ein Plan-Lauf nicht (er prüft dort nur Identität, Status ACTIVE, Adresse und Varianten-IDs).
3. Die Sicherung entsteht nur aus dem fest eingetragenen Ausgangsstand vom 11.11. (`AUSGANG` im Skript); weicht der Shop ab und fehlt die Datei, schreibt das Skript nichts.
4. Die Mengen-Mutation nutzt die Form der API 2026-01 (`changeFromQuantity`, `@idempotent`); die ältere Form entfällt mit 2026-04.
5. Status ENTWURF oder Kanal-Abwahl wären schlechter: ENTWURF bricht das Rollout-Werkzeug (erwartet ACTIVE) und gibt 404, fehlende Kanäle zieht `publish_guard.mjs` montags nach, und `/cart/add.js` nähme weiter an.

## Ungemessen

Ob Shopify das Setzen der Menge am Printful-Standort annimmt; wie schnell Printful zurücksetzt; ob die Google-App «out of stock» meldet und wie schnell; Wirkung auf Besuche und Käufe.
