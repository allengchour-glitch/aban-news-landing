# Kaufweg-Wächter (09.11.2026)

Prüft einmal am Tag, ob im Live-Shop der Weg **Produkt → Warenkorb → Versand nach Zürich → Kasse** funktioniert, ohne Browser und ohne Anmeldung.
Auslöser: «weiter» (Besitzer 09.11.), meine Auslegung: eine Lücke im Betrieb schliessen. `site-health.mjs` fragt nur, ob Seiten antworten, und hat seit 13.06. keinen Zeitplan mehr; ob jemand kaufen kann, prüfte seit Monaten niemand. Bei rund einer Bestellung am Tag bliebe ein stiller Bruch (Theme-Änderung, Versandprofil, Zahlungsart, Bestandsregel) tagelang unbemerkt.

## Was geprüft wird (alles ohne JavaScript, mit Browser-Kopf und Geduld bei 429)
| Schritt | Prüfung |
|---|---|
| Testprodukt | das erste lieferbare von drei Rizinusöl-Produkten (`TESTPRODUKTE` in `automation/lib/kaufweg.mjs`; fällt eines weg, springt das nächste ein; keines lieferbar = Problem) |
| Produktseite | HTTP 200, kein «Liquid error»; Hinweise (kein Fehler) bei fehlenden strukturierten Daten oder fehlendem `/cart/add`-Formular |
| In den Warenkorb | `POST /cart/add.js` gibt den Artikel zurück |
| Warenkorb-Seite | HTTP 200, kein Liquid-Fehler, der Artikel steht im Korb (der Cookie trägt) |
| Zahlungs-Symbole | TWINT unter den Symbolen der Fusszeile (`aria-labelledby="fuss-pi-twint"`, kommt aus `shop.enabled_payment_types`); fehlen alle Symbole, nur ein Hinweis |
| Versand nach Zürich | `POST /cart/prepare_shipping_rates.json` und `GET /cart/async_shipping_rates.json` (bis 8 Abfragen; ältere Schnittstelle als Ersatz): mindestens eine Versandart, günstigste höchstens CHF 25 |
| Kasse | `POST /cart` mit `checkout=` leitet auf `/checkouts/…` weiter, die Kassenseite antwortet (kein Passwort, keine Rückleitung in den Warenkorb) |
| Aufräumen | `POST /cart/clear.js` (zählt nicht) |

**Urteil:** ❌ Problem = klarer Fehler → Telegram + Lauf rot. 🕓 nicht messbar = Drosselung (429), Sperrseite («Verifying your connection»), Server-5xx, Netzfehler, Zeitlimit → **kein Alarm**, Lauf grün (eine Drosselung ist kein kaputter Shop, Lehre vom 04.10.). ⚠️ Hinweis = Auffälligkeit ohne Folgen, steht im Protokoll.

## Gemessen (09.11.2026 ca. 13:10 UTC, echter Shop, Trockenlauf aus dieser Sitzung)
Alle sieben Schritte in Ordnung: Zahlungssymbole twint, visa, master, american_express, paypal, klarna, apple_pay, google_pay; Versand nach Zürich günstigste Art **CHF 7.00** (eine Versandart); Weiterleitung in die Kasse, Kassenseite lädt. Die Annahmen zur Versand-Schnittstelle und zum Symbol-Markup (Präfix `fuss-`) wurden erst durch diesen Lauf belegt: der erste Entwurf des Musters (`pi-twint`) fand im echten Seitentext nichts.

**Erster Lauf in GitHub Actions** (Handstart mit `trockenlauf`, 09.11.2026 13:30 UTC, Lauf 1 am Merge-Commit `ebbdaf268f`, 15 s, grün): dieselben sieben Schritte in Ordnung, Versand nach Zürich CHF 7.00, dieselben acht Zahlungsarten. Die GitHub-Adressen wurden dabei **nicht** von der Sperrseite getroffen (ein Lauf, noch keine Reihe). Die Telegram-Zustellung bleibt ungemessen: der Trockenlauf sendet nichts (die Secrets sind in Actions gesetzt, das Log zeigt `***`). Meldeweg testen: Handstart mit `immer_melden` an und `trockenlauf` aus, das schickt eine «in Ordnung»-Nachricht an den Besitzer.

## Lauf und Abschalten
- Workflow `.github/workflows/kaufweg-waechter.yml`: **täglich 08:53 UTC** (Regel «Cron-Nulldiät»: ein Zeitplan, einmal am Tag; GitHub startet hier oft Stunden später), Handstart mit `trockenlauf` (keine Meldung) und `immer_melden` (Meldeweg testen).
- Telegram mit den Secrets `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` (wie `site-health.mjs`); ohne sie nur Protokoll und roter Lauf.
- Lokal: `DRY=1 node automation/kaufweg_waechter.mjs` (nur lesend, keine Meldung).
- Abschalten: Zeitplan-Zeilen im Workflow auskommentieren oder Workflow in GitHub deaktivieren; nichts am Shop zurückzunehmen (es wird nichts geschrieben).

## Was er NICHT prüft
Die Bezahlung selbst und die Zahlungsarten im Kassenformular (das ist Shopify-gehostet und braucht JavaScript; nur die Symbole der Fusszeile belegen die aktivierten Arten), Rabattcodes, den Editor-Weg der «Selbst gestalten»-Produkte, Produkte ausser dem Testprodukt, Safari und echte Handys. Ein **abgeschaltetes TWINT** erkennt er an den Symbolen, ein kaputter Kassenknopf per JavaScript bleibt unentdeckt.

## Tests
`node automation/lib/kaufweg_test.mjs`: **96 Prüfungen** gegen einen nachgebauten Shop (als `fetch`-Attrappe und als echter lokaler HTTP-Server mit echtem `fetch` von Node: Cookies, Weiterleitung ohne Folgen, das ganze Startskript samt Telegram-Meldung). Node 20 und 22 (Workflow `kaufweg-test.yml`). **Mutationsprobe 63 von 63 erkannt** (Skript im Scratch, nicht im Repo; die erste Runde liess eine Lücke: eine Weiterleitung ohne Zielangabe lieferte zwar ein Problem, aber mit der falschen Meldung).

## Lehren
- Eine Annahme über fremdes Markup (hier die Beschriftung der Zahlungs-Symbole) erst am echten Seitentext prüfen, dann die Prüfung scharf stellen: Mit der ersten Fassung hätte der Wächter täglich «keine Symbole» gemeldet.
- Mein eigener Messlauf hatte den Shop zuvor in die Drosselung getrieben (HTTP 429 für HTML-Seiten, `robots.txt` ging): Seitenaufrufe sparsam, nicht 15 Seiten plus Browser nacheinander. Der Wächter nimmt dafür nur kleine Einzelabrufe (rund zehn je Lauf) und behandelt 429 als «nicht messbar».
