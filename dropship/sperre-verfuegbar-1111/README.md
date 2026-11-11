# Gesperrte «Selbst gestalten»-Produkte: auch serverseitig nicht kaufbar (11.11.2026)

**Stand: gebaut und von zwei unabhängigen Prüfern gegengelesen, NOCH NICHT LIVE.** Der Live-Lauf wurde am 11.11. von der Berechtigungsprüfung der Sitzung abgelehnt (Änderung an geteilter Ressource) und nicht umgangen. Er braucht das ausdrückliche Ja des Besitzers; danach derselbe Befehl.

## Befund (GEMESSEN 11.11.2026, 08:55 bis 09:10 UTC)

- Magnet (`magnet-zum-selbstgestalten`), Dad-Cap (`dad-cap-selbst-gestalten`) und Bügeltransfer (`buegeltransfer-selbst-gestalten`) tragen seit 08.11. in der Beschreibung die Sperre «Personalisierung derzeit nicht bestellbar» (Marker `lx-v63-editor:start … mode=blocked`, Review-Gate des Editor-Rollouts).
- Die Sperre wirkt nur im Browser der Produktseite. `POST /cart/add.js` nimmt die Magnet-Variante trotzdem an (HTTP 200). Alle fünf Varianten sind `availableForSale`, die Produkte stehen auf acht Kanälen (auch Google & YouTube, Shop, TikTok, Facebook & Instagram), das JSON-LD meldet `InStock`, und die Produktseite zeigt neben der Sperre «Bestelle jetzt – Lieferung voraussichtlich …».
- ChatGPT schickt Besucher auf die Magnet-Seite: 5 Sitzungen in 14 Tagen (`utm_source = chatgpt.com`), 0 Käufe.
- Folge heute: Eine Bestellung über einen anderen Kanal oder einen Warenkorb-Link käme ohne Motiv an (kein Druckauftrag möglich, Erstattung nötig). Google bekommt «lieferbar» für Artikel, die die Seite als nicht bestellbar zeigt.

## Was das Skript tut

`sperr_verfuegbar.mjs` (Kopfkommentar lesen). Nur diese drei Produkte, nur solange die Beschreibung `mode=blocked` trägt, je Variante: Bestandsführung an, Mengen über 0 auf 0, zuletzt die Regel DENY. Status, Kanäle, Beschreibung, Preise und Tags bleiben.

| Aufruf | Wirkung |
|---|---|
| `node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` | Trockenlauf (Vorgabe), zeigt den Plan |
| `LIVE=1 node …/sperr_verfuegbar.mjs` | sperrt, legt `sicherung.json` an, liest frisch zurück |
| `PRUEFEN=1 node …/sperr_verfuegbar.mjs` | nur lesen, Exit 2, wenn ein gesperrtes Produkt kaufbar ist |
| `ZURUECK=1 LIVE=1 node …/sperr_verfuegbar.mjs` | stellt den Ausgangsstand wieder her |

Trockenlauf am 11.11. (Exit 0): Magnet 3 Varianten und Bügeltransfer 1 Variante am Standort «Shop location» (nicht bestandsgeführt, Menge 0 bzw. −1), Dad-Cap 1 Variante am Standort «Printful» (Menge 9999). `PRUEFEN=1` vor der Änderung: 5 Varianten «kaufbar trotz Sperre» (Exit 2).

## Sichtbare Folgen nach dem Live-Lauf (laut Gegenlesung, nach dem Lauf nachmessen)

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
