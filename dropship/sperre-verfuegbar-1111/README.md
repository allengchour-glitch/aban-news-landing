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
| `ZURUECK=1 LIVE=1 node …/sperr_verfuegbar.mjs` | stellt den Ausgangsstand wieder her (**alle** Produkte) |
| `NUR=<handle>[,<handle>]` vor einem der Aufrufe | derselbe Aufruf, aber nur für die genannten Produkte (seit 11.11., Abschnitt «Schalter NUR=») |

Trockenlauf am 11.11. (Exit 0): Magnet 3 Varianten und Bügeltransfer 1 Variante am Standort «Shop location» (nicht bestandsgeführt, Menge 0 bzw. −1), Dad-Cap 1 Variante am Standort «Printful» (Menge 9999). `PRUEFEN=1` vor der Änderung: 5 Varianten «kaufbar trotz Sperre» (Exit 2).

## Sichtbare Folgen (laut Gegenlesung; Produktseiten am 11.11. nachgemessen, Sammlungen und Katalogfenster noch nicht)

- Produktseite: rote Pille «Momentan ausverkauft» ohne Lieferbox statt «Bestelle jetzt». JSON-LD `OutOfStock` (Seiten-Cache kann rund 20 Minuten nachhinken).
- Sammlungskarten: Abzeichen «Ausverkauft». Der Bügeltransfer steht in `hype-jetzt` und in der Sammlung «Selbst gestalten» auf Platz 1: danach `HANDLES=hype-jetzt node automation/verfuegbar_zuerst.mjs` im Trockenlauf prüfen.
- Katalogfenster «Selbst gestalten»: die Modelle von Magnet und Dad-Cap fallen aus der Liste (Modellzahl nachmessen).
- Google: «nicht auf Lager» ist die ehrlichere Angabe (Verfügbarkeit muss auf Seite, strukturierten Daten und Datenquelle gleich sein).

## Auflagen aus der Gegenlesung (zwei Prüfer, beide «ausführen mit Änderungen», alle wichtigen Funde eingearbeitet)

1. **Dad-Cap ist nicht dauerhaft gesperrt:** Sein Bestand liegt am Standort des Printful-Dienstes. Printfuls Lagerabgleich und Shopifys stündliche Abfrage können die 0 wieder auf 9999 setzen, dann ist er trotz DENY wieder kaufbar. Nach dem Live-Lauf frühestens nach 70 Minuten und nach 24 Stunden `PRUEFEN=1` fahren, danach in eine tägliche Kontrolle nehmen (Vorschlag: Kaufweg-Wächter, `GET /products/<handle>.js` liefert `available` ohne Admin-Zugang). Fällt er zurück: kein stiller Zweitversuch, sondern Entscheid mit dem Besitzer.
2. **Vor dem Apply, der eines der drei Produkte entsperrt, die Rücknahme fahren, und zwar nur für dieses Produkt (`NUR=<handle>`, Abschnitt «Schalter NUR=»).** Der Apply des Rollout-Werkzeugs (`rollout-v63-direct/direct_rollout.mjs`, `produktPruefen`) wirft sonst «keine kaufbare Variante». Ein Plan-Lauf bricht nicht: für Produkte auf der Blockliste prüft er nur Identität, Status ACTIVE, Adresse und Varianten-IDs, und für den freigeschalteten Magneten vermerkt er `kaufbar: false` und nennt den Befehl (seit 11.11.2026).
3. Die Sicherung entsteht nur aus dem fest eingetragenen Ausgangsstand vom 11.11. (`AUSGANG` im Skript); weicht der Shop ab und fehlt die Datei, schreibt das Skript nichts.
4. Die Mengen-Mutation nutzt die Form der API 2026-01 (`changeFromQuantity`, `@idempotent`); die ältere Form entfällt mit 2026-04.
5. Status ENTWURF oder Kanal-Abwahl wären schlechter: ENTWURF bricht das Rollout-Werkzeug (erwartet ACTIVE) und gibt 404, fehlende Kanäle zieht `publish_guard.mjs` montags nach, und `/cart/add.js` nähme weiter an.

## Ungemessen

Ob Shopify das Setzen der Menge am Printful-Standort annimmt; wie schnell Printful zurücksetzt; ob die Google-App «out of stock» meldet und wie schnell; Wirkung auf Besuche und Käufe.

## Täglicher Wächter (seit 11.11.2026)

Der Workflow `kaufweg-waechter.yml` (täglich 08:53 UTC, Handstart möglich) hat einen zweiten Job `sperre`. Er liest nur (Admin-API) und prüft:

1. `PRUEFEN=1 BEKANNT_KAUFBAR=dad-cap-selbst-gestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs`: kein gesperrtes Produkt ist kaufbar. Der Dad-Cap ist als bekannte Lücke ausgenommen (im Onlineshop weiter kaufbar, siehe oben).
2. `PRUEFEN=1 node dropship/sperre-verfuegbar-1111/dad_cap_kanaele.mjs`: der Dad-Cap steht nur im Onlineshop und trägt das Tag.

Exit 2 eines der beiden Skripte = Befund: der Lauf wird rot und meldet per Telegram (nicht beim Handstart mit `trockenlauf`). Fehlender oder falscher Zugang = «nicht messbar»: kein Alarm, Warnung im Lauf. Sobald ein Produkt entsperrt ist (kein `mode=blocked` mehr in der Beschreibung), prüfen die Skripte es nicht mehr.

Lokal geprüft am 11.11. (der Schritt des Workflows als Shell-Skript, vier Fälle): echter Shop → Exit 0; ohne die Ausnahme für den Dad-Cap → Exit 1 mit `befund=1`; ohne Zugang → übersprungen; falscher Zugang → nicht messbar. **Ungemessen:** der erste Lauf in GitHub Actions und die Zustellung der Telegram-Meldung.

## Magnet: Sperrgrund gemessen (11.11.2026 09:50 UTC)

Der Rollout sperrte den Magneten wegen `REGIONAL_AVAILABILITY_UNKNOWN` (`rollout-v63/allowlist.json`). GEMESSEN über die Printful-API: Modell 656 «Die-Cut Magnets», drei Varianten (`16366`, `16367`, `16465`), alle `in_stock`, Herstellung nur in den USA; `POST /shipping/rates` nach Zürich liefert für jede Variante «Flat Rate» CHF 6.84, 10 bis 15 Tage. Zoll und Einfuhrsteuer für US-Ware: ungemessen. Nachmessung 12:13 UTC: nach 9490 Vaduz (Liechtenstein) dieselbe Rate, CHF 6.84, 10 bis 15 Tage, voraussichtlich 24. bis 30.11. Der Magnet kann also freigeschaltet werden. Das ist ein Schritt des Editor-Rollouts (Codex, Ja des Besitzers je Stufe); die Rücknahme mit `NUR=` liegt unmittelbar vor dem Apply. Hinweis an Codex: `dropship/CODEX-RUECKMELDUNG-1111.md`.

## Schalter NUR= (11.11.2026, für die Freischaltung des Magneten)

**Warum:** `ZURUECK=1 LIVE=1` ohne Eingrenzung stellt alle Produkte der Sicherung zurück. Für die Freischaltung des Magneten wäre damit auch der Bügeltransfer wieder kaufbar, obwohl seine Seite gesperrt bleibt. GEMESSEN gegen die Attrappe mit dem Skript von vor dem Schalter: Magnet **und** Bügeltransfer gehen zurück (der Test «nur die drei Magnet-Varianten» schlägt mit «Bügeltransfer verändert» fehl).

**Was der Schalter tut:** `NUR=handle1[,handle2]` gilt für jeden Modus (Trockenlauf, `LIVE=1`, `ZURUECK=1 LIVE=1`, `PRUEFEN=1`). Gelesen werden weiter alle drei Produkte, damit die Sicherung vollständig bleibt. Bearbeitet, zurückgelesen und geprüft werden nur die genannten. Die erste Ausgabezeile nennt die ausgelassenen Produkte. Ein unbrauchbarer Wert (unbekanntes Handle, nur Kommas, doppeltes Handle) bricht mit Exit 1 ab, **bevor** irgendetwas gelesen wird. So wird ein Tippfehler nie still zu «alle drei». Ein leeres `NUR=` zählt als nicht gesetzt.

| Zweck | Befehl |
|---|---|
| Plan ansehen (schreibt nichts) | `ZURUECK=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` |
| Nur den Magneten wieder kaufbar machen | `ZURUECK=1 LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` |
| Nur den Magneten wieder sperren (Rückweg, solange seine Beschreibung die Sperre trägt) | `LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` |

**Reihenfolge der Freischaltung** (ganzer Ablauf: `dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/README.md`, Abschnitt «Magnet freigeschaltet (11.11.2026)»): erst die Karte ausgeliefert, dann der Plan der Stufe `frei-magnet` (er läuft auch bei aktiver Sperre und ändert nichts), dann die Rücknahme mit `NUR=`, dann sofort der Apply. Zwischen Rücknahme und Apply ist der Magnet kaufbar, seine Seite zeigt aber noch die Sperre: beide Schritte in einem Zug fahren. Scheitert der Apply, ohne zu schreiben: sofort die Zeile «Nur den Magneten wieder sperren» aus der Tabelle oben. Läuft der tägliche Wächter (08:53 UTC) in diesem Fenster, meldet er den Magneten als «kaufbar trotz Sperre»; das ist dann erwartet. Nach dem Apply trägt die Beschreibung kein `mode=blocked` mehr, der Wächter prüft den Magneten nicht mehr, und ein späteres `LIVE=1` überspringt ihn.

**Geprüft (GEMESSEN 11.11.2026, kein Netz, kein Shop):**
- `node dropship/sperre-verfuegbar-1111/sperr_verfuegbar_test.mjs`: 17 Tests bestanden. Das Skript läuft als Kindprozess gegen `sperr_verfuegbar_attrappe.mjs` (ersetzt `fetch`; Ausgangsstand aus `sicherung.json`; die Sicherung des Laufs liegt in einem Temp-Ordner). Abgedeckt: nur der Magnet geht zurück und Bügeltransfer und Dad-Cap bleiben Byte für Byte, Trockenlauf, zweiter Lauf ohne Schreibzugriff, Rückweg, zwei Handles, unbrauchbare Werte in allen vier Modi ohne einen Netzaufruf, Sicherung vollständig trotz `NUR`, zeitversetzte Kaufbarkeit, Verhalten ohne `NUR` wie bisher.
- `node dropship/sperre-verfuegbar-1111/sperr_verfuegbar_mutation.mjs`: 22 von 22 Mutanten erkannt, 0 überlebt, 0 ungeklärt (18 zum Schalter, 4 zu bestehenden Schutzregeln). Der erste Lauf liess einen überleben («Rücknahme ohne Sicherung läuft weiter»); ein zusätzlicher Fall schliesst die Lücke.

**Ungemessen:** ein Lauf mit `NUR=` gegen den echten Shop (in dieser Arbeit war kein Schreibzugriff erlaubt, auch kein lesender Lauf des Skripts mit Zugangsdaten). Die Attrappe bildet nur nach, was am 11.11. gemessen wurde (Kaufbarkeit aus Bestandsführung, Regel und Menge; `INVALID_LOCATION` am Printful-Standort). Vor dem scharfen Lauf zuerst den Trockenlauf aus der Tabelle fahren und die drei Planzeilen lesen. Die beiden Testdateien sind in keinem CI-Lauf verdrahtet ausser im eigenen Workflow `magnet-freischaltung-test.yml` (erster Lauf in GitHub Actions ungemessen).
