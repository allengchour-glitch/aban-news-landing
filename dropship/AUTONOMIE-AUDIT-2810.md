# Autonomie-Audit 28.10.2026: wann läuft der Shop ohne Handgriff?

Marken: **GEMESSEN** = vom Audit selbst gemessen, **QUELLE** = Datei/URL, **BEHAUPTUNG** = ungeprüft, **unbekannt** = nicht gemessen. Erzeugt von einem nur lesenden Workflow (4 Messagenten, 4 Gegenprüfer, 1 Zusammenfassung; Eingang 90 Befunde). Der Audit hat nichts am Shop, an GitHub oder bei Lieferanten geändert.

## Bericht

# LuxeStyle CH: Wann ist "läuft autonom" erreicht? (Stand 28.10.2026)

Marken: [G] gemessen, [Q] Quelle (nicht selbst gemessen), [B] Behauptung oder Ableitung, [?] unbekannt. Zahlen in der Spalte "Schwelle" sind Setzungen (Soll), keine Messwerte. Grundlage: vier Bereichsberichte mit Gegenprüfung (90 Befunde), nur gelesen; eine eigene Leseabfrage (MAIN-Theme) [G]. Keine Kundendaten.

## Urteil

Die Bedingung des Besitzers (autonom, "0 Fehler", Produkte und Lagerbestand immer aktuell) ist **heute nicht erfüllt**. Von 38 Kriterien sind 7 erfüllt, 26 offen, 5 unbekannt [G, Zählung hier]. Von den 23 Pflichtkriterien sind 6 erfüllt, 14 offen, 3 unbekannt.

**Drei Hauptgründe**

1. **Niemand hält Bestand, Lieferbarkeit und Preisschutz aktuell.** Fortura-Bestand zuletzt am 24.10. 00:13 UTC geschrieben (4,6 Tage) [G]; 450 von 3 998 Varianten (11,3 %) weichen vom Feed ab [G], 30 sind kaufbar bei Feed-Bestand 0 oder 1, 17 davon wie Bestellung #1027 [G]. Wächterkette: letzter Cloud-Commit 24.10. 13:31, Server-Wächter 16.10. 06:07, Keepalive-Trigger seit 26.10. 16:42 aus [G]. Auf main läuft kein Bestandsabgleich [G]; 99,3 % der CJ-Varianten haben keine Bestandsführung und sind immer kaufbar [G].
2. **Grün heisst nicht gearbeitet.** Autopilot und Bestseller waren in 12 von 14 Läufen hohl (höchstens 1 s, 15.-26.10.) [G]; der Auswahl-Lauf schrieb am 28.10. 0 Produkte bei success [G]; das Tages-Update ist seit 24.10. 5 von 5 rot (HTTP 401) und blieb unbeachtet [G]. Ein Wächter über die Wächter fehlt [G].
3. **Die Bestellkette hängt an Hand und Sitzung.** CJ-Zahlung ist ein Besitzer-Klick (Geldbörse 0.00 USD) [G]; die Dauerläufer sind aus [G]; das Tracking erreicht den Kunden bei 6 von 6 Sendungen 11 bis 38 h vor dem Abholscan [G].

**Was trägt:** alle 6 geplanten Läufe sind gelaufen, keiner ausgefallen, 2,9-9,2 h spät [G]; Bestellwächter hat 15 von 15 Bestellungen gesehen [G]; Lieferantenauftrag nach 2-81 min [G]; kein Verkauf unter unitCost [G]; CI "check" 5 von 5 grün [G]. Die drei Workers-Builds-Checks sind immer rot und zählen nicht.

**Zur Abo-Frage:** Das Pro-Abo ist laut CLAUDE.md eine Zweitmeinung für Geld-Code [Q]; ob irgendein geplanter Lauf es braucht, ist nicht gegengeprüft [B]. Der Betrieb hängt an den Claude-Routinen (7 wiederkehrende [G]); deren Abhängigkeit vom Nutzungslimit ist eine Ableitung [B]. Plan-Stufen und Preise: [?].

## Rangliste der Lücken (Top 10, vollständig 19 im Datenfeld)

| Rang | Lücke | Wer | Aufwand | Risiko, wenn offen |
|---|---|---|---|---|
| 1 | Kein Betreiber für Bestands-/Lieferbarkeits-/Preiswächter | beide | mittel | Erstattungen wie #1027, Vertrauen |
| 2 | Hohle Erfolge, kein Meta-Wächter | Claude | mittel | Störungen bleiben unsichtbar |
| 3 | CJ-Prüfabdeckung 54,4 % [G], Rest immer kaufbar | beide (CJ-Punkte) | gross | Zahlung für nicht Lieferbares |
| 4 | unitCost bis minus 35 % gegen echte Rechnung [G], keine Nachführung | Claude | gross | Verlust bei Code/Preisanstieg |
| 5 | Live-Code mit 21 wichtigen Funden [G] (Nachtlauf, Fortura-Engine, POD) | Claude | mittel | falsche Preise, Doppelbestellung |
| 6 | Bestellkette von Hand (Dauerläufer aus) | beide | mittel | bezahlte Bestellung bleibt liegen |
| 7 | CJ-Zahlung = Besitzer-Klick (2 von 16 über 18 h [G]) | Besitzer | klein | Lieferverzug |
| 8 | Reklamation/Retoure/Erstattung ohne Automat | Besitzer | mittel | Kundenvertrauen |
| 9 | Erster scharfer Shop-Guards-Lauf Mo 02.11. ohne Probelauf | Claude | klein | Fehlgriff ohne Beobachter |
| 10 | Merchant-Feed-Job 401, Feed 4 Tage alt | Claude | klein | falsche Preise bei Google, falls Abruf aktiv [?] |

Rang 11-19 (Datenfeld): 718 ausverkaufte Fortura-Produkte ACTIVE [G]; Tracking vor Abholscan; Auswahl-Lauf mit 0 bei success; Inhalts-Werkzeuge (Titanstahl bei 9 Produkten [G]); 65 pausierte Zeitpläne [G]; Tests nur bei PR; Besitzer-Klicks Rest; PR-Stau (43 offen [G]); Image-Audit (0,3 % Abdeckung [G]).

## Empfehlung

**Heute weder Kündigung noch ein auf die Betriebsbedingung gestütztes Downgrade.**

- **Downgrade vertretbar**, sobald die Code-Änderungen mit Geldwirkung (Wächter-Betrieb, Fortura-Engine, Nachtlauf-Preisbasis, unitCost-Abgleich, Feed-Job, Tracking-Regel) gemergt und je einmal zweitgeprüft sind, offene "wichtig"-Funde von 21 [G] auf höchstens 5 gesunken sind und K02, K03, K04, K12 seit mindestens 7 Tagen erfüllt sind.
- **Kündigung vertretbar**, wenn alle 23 Pflichtkriterien 14 Tage in Folge erfüllt sind, "wichtig" = 0, Erstattungen wegen Nicht-Lieferbarkeit = 0 in 30 Tagen und höchstens 5 der 15 Nicht-Pflichtkriterien offen sind. Wegen der CJ-Abdeckung (600 Abfragen/Tag, rund 33 Tage Aufbau [B]) frühestens Mitte Dezember [B].
- Wer vorher spart, verliert die Zweitmeinung in der Reparaturphase; Ersatz sind zwei unabhängige Claude-Prüfer plus Nachstellen am Code.

**Zuerst zu tun**

1. Besitzer: (a) Fortura-Bazar-Bestand und Pause entscheiden (Standard: Pause verlängern; sonst gingen beim Wächter-Neustart 718 Produkte [G] auf DRAFT), (b) Wächter-Host entscheiden (Trigger wieder an oder Portierung nach GitHub mit Fortura-Zugang als Repo-Secret).
2. Claude: Feed-Job-Fix (Client-Credentials zuerst), Token-Test, Lauf-Wächter mit Hohl-Erkennung und Alarmtest (K02-K04).
3. Claude: Trockenlauf Shop-Guards (LIVE=0) vor Mo 02.11. 07:00 UTC.
4. Claude: Einmallauf Fortura-Bestand nach Entscheid 1(a), danach Dauerbetrieb; zuerst die 17 Klasse-#1027-Varianten.
5. Claude: Tracking erst nach Abholscan, unitCost gegen echte Rechnung, Nachtlauf- und Fortura-Engine-Funde, POD-Testbestellung vor Wiedereinschalten.

Feste Termine: 29.10. 08:00Z/10:00Z (Tracking, Fortura-Lieferschein), 02.11. (Guards, Mengenrabatt), 03.11. 08:00Z (Rechnung D3, CHF 296.80).

## "0 Fehler" als Kriterium

"0 Fehler" lässt sich nie beweisen; es gilt stattdessen: jede Pflicht-Kennzahl mit Schwelle, Messquelle, Rhythmus, 14 Tage in Folge, und Meldung jeder Störung binnen 24 h.

## Korrekturen gegenüber den Zusammenfassungen

6 aktive und 65 pausierte Zeitpläne (nicht 7/72) [G]; Feed-Job nie grün, 5 von 5 rot [G]; WELCOME10 ist aktiv bis 2027-12-31 [G]; Titanstahl bei 9 statt 15 Produkten [G]; #1017 war ein Versandverbot, kein Bestandsfall [G]; Fortura-Storno nach 18,8 h statt 20,7 h [G]; Startseite: MAIN-Theme heute 212656488839 [G], die Aussage "Entwurf nicht veröffentlicht" ist unbelegt [?]; die Guards-Echtarbeit ist nur für 19.10./26.10. belegt [G].

## Besitzer-Klicks und Ersatzplan

| Klick | Ersatzplan |
|---|---|
| CJ-Auftrag bezahlen | Push nach 2 h, nach 24 h Kunde informieren |
| Wächter-Host | GitHub-Workflow auf main statt Server |
| Fortura-Pause/Bazar | Pause verlängern, kein Auto-DRAFT |
| Retoure/Erstattung/Mails | Frist 48 h, Antwortentwurf als Entwurf (nicht senden) |
| Rechnung D3 (03.11.) | Erinnerung 08:00Z, Druck erst nach Zahlung |
| Index-Anträge, MC Block C, Feed-Abruf, Bio-Links | Crawl abwarten bzw. PC-Claude mit Browser-Befehl |
| TikTok-Pixel, Kampagne und Budget | keine bezahlte Werbung, organisch |
| POD-Entscheide, Gutschein, Schmuck/Rucksack | Standard "bleibt" |
| 65 pausierte Zeitpläne | bleiben pausiert, Einzelfreigabe je Workflow |
| Cloudflare-Recht, CJ-Hüllen, Spam-Flag, Hetzner | Disconnect von Hand; Hüllen wertlos; Wächter nach GitHub |

## Kriterien (P = Pflicht; e = erfüllt, o = offen, u = unbekannt)

| ID | Kriterium | Schwelle (Setzung) | P | Heute |
|---|---|---|---|---|
| K01 | Geplante Läufe starten | 0 Ausfälle in 14 Tagen, Start höchstens 10 h spät | ja | e |
| K02 | Kein hohler Erfolg | 14 von 14 Tagen Echtarbeit, Schritt über 3 s plus Zähler | ja | o |
| K03 | Lauf-Wächter mit Push | Alarm binnen 24 h, Alarmtest bestanden | ja | o |
| K04 | Secrets gültig | täglicher Token-Test HTTP 200 | ja | o |
| K05 | Tages-Update/Feed-Job grün | 14 von 14, Feed höchstens 26 h alt | nein | o |
| K06 | Auswahl-Nachtlauf schreibt oder meldet | 7 von 7 Nächten | nein | o |
| K07 | Shop-Guards-Premiere abgesichert | Trockenlauf vor 02.11. fehlerfrei | ja | u |
| K08 | CI "check" auf main | letzte 5 grün | ja | e |
| K09 | Brand-Voice und Cloudflare-Deploy | letzte 5 grün | nein | u |
| K10 | Testsuite nach Zeitplan | wöchentlich, alle grün | nein | o |
| K11 | Pre-deploy/Link-Check | 5 von 5 nicht cancelled | nein | o |
| K12 | Wächter-Betreiber lebt | Lebenszeichen höchstens 26 h, 14 von 14 Tagen | ja | o |
| K13 | Fortura-Bestand frisch | Stempel höchstens 26 h, Abweichung höchstens 1 % | ja | o |
| K14 | Nichts kaufbar bei Fortura 0 | 0 Varianten | ja | o |
| K15 | CJ-Prüfabdeckung plus Guard im Zeitplan | mindestens 90 % mit Befund höchstens 30 Tage | ja | o |
| K16 | Preis nicht unter unitCost | 0 Varianten | ja | e |
| K17 | Kein Verlust mit grösstem Code | 0 kaufbare Varianten | nein | o |
| K18 | unitCost gegen echte CJ-Rechnung | höchstens 10 % darunter | ja | o |
| K19 | Einkaufspreis-Drift erkannt | 20 Varianten/Woche, Meldung in 7 Tagen | nein | o |
| K20 | Erstattungen wegen Nicht-Lieferbarkeit | 0 in 30 Tagen | ja | o |
| K21 | Ausverkaufte Fortura-Produkte | 0 ACTIVE ohne kaufbare Variante | nein | o |
| K22 | Google-Feed gleich Live | 0 Preisabweichungen über 1 CHF | nein | o |
| K23 | Bestellerkennung | letzter Lauf höchstens 3 h, 100 % gesehen | ja | e |
| K24 | Lieferantenauftrag zeitnah | 100 % binnen 4 h | ja | e |
| K25 | Kette ohne Handgriff | Dauerläufer, Lebenszeichen höchstens 4 h | ja | o |
| K26 | CJ-Zahlung mit Ersatzplan | 100 % binnen 4 h | ja | o |
| K27 | Keine Bestellung über 48 h ohne Bewegung | 0 | ja | e |
| K28 | Tracking erst nach Abholscan | 0 verfrühte | nein | o |
| K29 | Fortura-Lieferschein und Storno | Lieferschein 24 Werktagsstunden, Storno 4 h | ja | u |
| K30 | POD-Auftragsweg scharf getestet | Testbestellung bestanden, 6 Funde behoben | ja | o |
| K31 | Kundenanliegen zeitnah | 0 über 48 h unbeantwortet | ja | u |
| K32 | Keine zahlbaren Fehl-Hüllen | 0 mit Betrag | nein | e |
| K33 | "wichtig" = 0 | 0 (heute 21 [G]) | ja | o |
| K34 | Härtung terminiert | höchstens 20 offen | nein | o |
| K35 | PR-Stau/Doku widerspruchsfrei | 0 PRs über 30 Tage ohne Entscheid | nein | o |
| K36 | Klicks Geld/Kunde mit Ersatzplan | 0 ohne | ja | o |
| K37 | Klicks Reichweite mit Ersatzplan | 0 ohne | nein | o |
| K38 | Infrastruktur-Klicks | Spam-Flag, Hetzner, Cloudflare geklärt | nein | u |

Die erfüllten Kriterien sind Momentaufnahmen; die 14-Tage-Zählung beginnt erst mit einem Alarm- und Messsystem (K03). Messquelle, Rhythmus und Beleg je Kriterium stehen im Datenfeld.


## Kriterien (Schwelle, Messquelle, Stand heute)

| ID | Pflicht | Stand | Kriterium | Schwelle | Messquelle |
|---|---|---|---|---|---|
| K01 | ja | erfuellt | Geplante Läufe starten | 0 ausgefallene Soll-Läufe der 6 geplanten Workflows in 14 Tagen (Wochenläufe: 4 Wochen); Start höchstens 10 h nach Cron (Setzung, gemessene Spanne bis 9,2 h) | gh api repos/<repo>/actions/workflows/<datei>/runs?event=schedule (created_at minus letzter Cron-Zeitpunkt) |
| K02 | ja | offen | Kein hohler Erfolg: geplante Läufe leisten nachweisbar Arbeit | 14 von 14 Tagen je geplantem Schreib-/Prüflauf: Schritt länger als 3 s UND Zähler im Log (gescannt/geschrieben grösser 0 oder benannter Grund); success bei 0 Schreibvorgängen ohne Grund zählt als Fehler (Setzung) | Lauf-Wächter (K03) bzw. gh api actions/runs/{id}/jobs (Schrittzeiten) plus get_job_logs |
| K03 | ja | offen | Wächter über die Wächter (Lauf-Wächter mit Push) | Täglicher Lauf-Wächter prüft alle 6 geplanten Läufe plus Tages-Update (rot, ausgefallen, hohl, Token-401) und pusht binnen 24 h; Alarmtest (absichtlich hohler Lauf) wird in höchstens 24 h gemeldet | Neuer Workflow oder Routine, die nach Laufende liest (list_workflow_runs plus Jobschritte); Alarmtest per workflow_dispatch |
| K04 | ja | offen | Zugänge und Secrets gültig | Alle von Zeitplan-Workflows genutzten Secrets (Shopify, CJ, Gemini/Groq, Fortura) liefern im täglichen Token-Test HTTP 200; 0 Läufe mit 'no-op: kein gültiger Token' | Schritt 'Token-Test' im Lauf-Wächter (K03) |
| K05 | nein | offen | Tages-Update inklusive Merchant-Feed-Job grün | 14 von 14 Läufen success; google-merchant-feed.xml auf main höchstens 26 h alt (Pflicht, sobald K37 zeigt, dass Google den Feed abruft) | gh api workflows/tages-update.yml/runs; git log -1 -- google-merchant-feed.xml |
| K06 | nein | offen | Auswahl-Nachtlauf schreibt oder meldet | In 7 von 7 Nächten mindestens 1 Produkt nachgezogen ODER Tageslimit/Kandidatenmangel als Alarm gemeldet; kein Handlauf am Tag (Kontingent) (Setzung) | Auswahl-Ledger (Commit 'Auswahl-Ledger: n Produkte') und Job-Log |
| K07 | ja | unbekannt | Shop-Guards-Premiere abgesichert | Vor dem ersten scharfen Zeitplanlauf (Mo 02.11., LIVE=1, APPROVE_PUBLISH=1): Trockenlauf LIVE=0 mit gültigem Token fehlerfrei, Obergrenze für Schreibaktionen gesetzt; danach Nachlesen mit 0 Fehlgriffen | workflow_dispatch LIVE=0 plus Job-Log; Nachlesen der Publish-/Redirect-Ergebnisse |
| K08 | ja | erfuellt | CI 'check' (Quality Check) auf main grün | Letzte 5 Läufe auf main grün | gh api actions/workflows/<Quality Check>/runs?branch=main |
| K09 | nein | unbekannt | Brand-Voice check und Deploy to Cloudflare Pages grün | Letzte 5 Läufe auf main grün | gh api actions/workflows/<Name>/runs?branch=main |
| K10 | nein | offen | Testsuite läuft nach Zeitplan | Mindestens wöchentlich Lauf aller automation-Tests auf main, alle grün, inklusive banner_test.mjs; Tests ausserhalb automation/ bewusst gelistet | Workflow luxestyle-automation-tests mit schedule; Abgleich git ls-tree gegen Workflows |
| K11 | nein | offen | Pre-deploy validation und Link-Check laufen durch | 5 von 5 Läufen auf main nicht cancelled; Schritt 'Verify no broken internal links' läuft | gh api actions/workflows/deploy-check.yml/runs?branch=main |
| K12 | ja | offen | Betreiber der Bestands-/Lieferbarkeits-/Preiswächter lebt | Lebenszeichen (Lauf, Commit oder Stempel) höchstens 26 h alt an 14 von 14 Tagen; Wächter laufen auf main (GitHub) oder auf einem überwachten Server | git log origin/claude/luxestyle-status-tztnn1 (Autor Claude / luxe-waechter), Stempeldateien, Lauf-Wächter K03 |
| K13 | ja | offen | Fortura-Bestand frisch und deckungsgleich mit dem Feed | Stand der Bestandsabgleich-Datei und jüngster inventoryLevel-Stempel höchstens 26 h alt; Abweichung Shop zu Feed höchstens 1 % der 3 998 aktiven Fortura-Varianten (40) | Bulk-Abfrage inventoryLevels.updatedAt plus Feed-Vergleich nach Regel fortura_bestand_sync.mjs; dropship/_fortura_bestand_stand.json |
| K14 | ja | offen | Nichts kaufbar, was Fortura nicht hat | 0 kaufbare Fortura-Varianten bei Feed-Bestand 0 oder kleiner (nach Puffer 1) | Bulk-Abfrage gegen Feed (Skript wie K13) |
| K15 | ja | offen | CJ-Lieferbarkeit geprüft (Abdeckung und Wächter im Zeitplan) | Mindestens 90 % der aktiven CJ-Produkte mit Prüfbefund höchstens 30 Tage alt; lieferbarkeit_guard.mjs in einem Zeitplan mit Ergebnis-Lesen; Fehler/unklar höchstens 1 % (Setzung) | Ledger dropship/_cj_lager.tsv gegen Live-Katalog; Workflow-Grep auf lieferbarkeit_guard |
| K16 | ja | erfuellt | Kein Preis unter Einkauf (unitCost), ohne Rabattcode | 0 Varianten mit Preis kleiner unitCost (Formel marge_wahrheit: 2,9 % + 0.30 + 1,5 % FX, Gratisversand) | Bulk-Abfrage aller Varianten plus Margen-Rechnung (wöchentlich) |
| K17 | nein | offen | Kein kaufbarer Verlust mit dem grössten aktiven Rabattcode | 0 kaufbare Varianten im Minus mit dem grössten aktiven Code (15 % laut Repo, QUELLE) | Bulk-Abfrage plus Margen-Rechnung mit Code |
| K18 | ja | offen | unitCost belastbar gegen die echte CJ-Rechnung | unitCost höchstens 10 % unter der echten CJ-Rechnung (Ware plus Fracht, USD-CHF 0.90) bei den letzten 10 bezahlten CJ-Bestellungen | CJ shopping/order/list und getOrderDetail (nur Beträge) gegen Shopify unitCost der Variante |
| K19 | nein | offen | Einkaufspreis-Drift (CJ, Printful) wird erkannt | Wöchentliche Stichprobe von 20 Varianten; Abweichung über 10 % wird binnen 7 Tagen gemeldet oder nachgeführt | printful_reprice.mjs (Vorschau) und CJ-Preisabfrage im Lauf-Wächter |
| K20 | ja | offen | Erstattungen wegen Nicht-Lieferbarkeit | 0 Erstattungen wegen Nicht-Lieferbarkeit (Bestand, Auslistung, Storno des Lieferanten) in rollierend 30 Tagen | Shopify orders (Status REFUNDED, Notiz/cancelReason) monatlich lesen |
| K21 | nein | offen | Keine ausverkauften Fortura-Produkte als ACTIVE | 0 aktive Fortura-Produkte ohne kaufbare Variante, ausser bewusst (Saisonware mit Entscheid) | Bulk-Abfrage; lagerstand_hygiene Fall A |
| K22 | nein | offen | Google-Feed deckt sich mit dem Live-Shop | 0 Preisabweichungen über 1 CHF und höchstens 1 % Verfügbarkeitsabweichung; relevant nur, wenn Google den Feed abruft | google-merchant-feed.xml gegen Bulk-Abfrage (erste Variante) |
| K23 | ja | erfuellt | Neue Bestellungen werden erkannt und gemeldet | Letzter Lauf des Bestellwächters höchstens 3 h alt; 100 % der Bestellungen gesehen; Push an; gemeldetHaengt leer | Shop-Metafeld luxestyle.bestellwache (letztePruefung, gesehen) und get_trigger |
| K24 | ja | erfuellt | Lieferantenauftrag zeitnah angelegt | 100 % der bezahlten Bestellungen binnen 4 h beim Lieferanten angelegt (Setzung) | Shopify createdAt gegen CJ createDate bzw. Ledger _fortura_bestellungen.tsv |
| K25 | ja | offen | Bestellkette ohne Handgriff der Sitzung (Anlage, Tracking-Rückschreiben, Fortura-Lieferschein) | Dauerläufer mit Lebenszeichen höchstens 4 h alt; in 14 Tagen 0 Bestellungen, deren Anlage/Tracking nur durch Einmal-Erinnerung oder Handarbeit erfolgte | engine_keepalive-Stempel, Ledger _cj_orders_done.txt, Lauf-Wächter |
| K26 | ja | offen | CJ-Zahlung (Besitzer-Klick) zeitnah, mit Ersatzplan | Jeder CJ-Auftrag binnen 4 h bezahlt; Ersatzplan: Push 'zu bezahlen' (cj_zahlung_offen) nach 2 h, nach 24 h Kunde informieren oder Erstattung anbieten | CJ shopping/order/list (paymentDate minus createDate) plus Push-Log |
| K27 | ja | erfuellt | Keine bezahlte Bestellung ohne Bewegung länger als 48 h | 0 bezahlte, unerfüllte Bestellungen älter als 48 h ohne Lieferantenstatus | Bestellwächter-Metafeld gemeldetHaengt und Shopify-Abfrage paid und unfulfilled |
| K28 | nein | offen | Tracking erreicht den Kunden erst mit Bewegung | 0 Sendungen, bei denen der Shopify-Versandeintrag vor dem ersten Abholscan liegt | CJ logistic/trackInfo (Picked up from shipper) gegen Shopify fulfillments.createdAt |
| K29 | ja | unbekannt | Fortura-Strecke: Lieferschein und Storno rechtzeitig | Lieferschein zu Tracking in Shopify binnen 24 Werktagsstunden nach Abholung; Fortura-Storno binnen 4 h erkannt und Kunde informiert | Fortura /home/DESADV, Ledger _fortura_bestellungen.tsv, Shopify-Fulfillments |
| K30 | ja | offen | POD-Auftragsweg (Printful) scharf getestet | Testbestellung bestanden (1 Auftrag, Druckdatei geprüft, kein Doppelauftrag); 6 wichtige Funde behoben; Zeitplan an oder dokumentierter Notweg mit Alarm bei POD-Bestellung | printful-sync-Lauf, Printful GET /orders, Shopify Tag printful-synced / printful-review |
| K31 | ja | unbekannt | Kundenanliegen und Reklamationen zeitnah | 0 Kundenmails/Reklamationen älter als 48 h unbeantwortet; Erstattung höchstens 5 Werktage nach Entscheid | Postfach-Zähler der Lagebeurteilung (2 x täglich) und Shopify-Erstattungszeiten |
| K32 | nein | erfuellt | Keine zahlbaren Fehl-Hüllen bei CJ | 0 CJ-Aufträge mit Betrag grösser 0 im Status IN_CART/UNPAID/CREATED ohne zugehörige LX-Bestellung | CJ shopping/order/list; cj_zahlung_offen.py ist_zahlbar |
| K33 | ja | offen | Offene Funde der Stufe 'wichtig' (Geld oder Kunde) = 0 | 0 offene wichtige Funde mit Geld-/Kundenwirkung (Codex-Datei, CLAUDE.md-Offenlisten); jeder behobene Fund am echten Code nachgestellt | awk über dropship/CODEX-FUNDE-2810.md (Marker wichtig/klein je Abschnitt) plus Fix-Nachweis |
| K34 | nein | offen | Härtungs-Funde terminiert | Höchstens 20 offene Härtungs-/kleine Funde, jeder mit Termin oder bewusstem 'bleibt' | Codex-Datei und CLAUDE.md-Offenlisten |
| K35 | nein | offen | PR-Stau und Betriebsdokumente widerspruchsfrei | 0 offene PRs älter als 30 Tage ohne Entscheid; 0 nachgewiesene Widersprüche in Betriebsdokumenten | list_pull_requests state=open; Dokument-Stichproben |
| K36 | ja | offen | Besitzer-Klicks mit Geld-/Kundenwirkung haben Frist und Ersatzplan | Jeder Klick: Frist, Ersatzplan, Push; 0 ohne. Klicks: CJ bezahlen (K26), Wächter-Host entscheiden (K12), Fortura-Pause/Bazar-Bestand (K21), Retoure/Erstattung (K31), Zahlungseingang Rechnung D3 (CHF 296.80, 03.11.) | Klick-Liste in dropship/ mit Frist und Ersatzplan; Routinen-Liste |
| K37 | nein | offen | Besitzer-Klicks und Entscheide mit Reichweitenwirkung haben Ersatzplan | Jeder Klick: Ersatzplan (Standard 'bleibt' oder PC-Claude/Browser-Befehl), kein Klick ohne Frist | dropship/BROWSER-BEFEHL-*.md, Routine Index-Liste, Entscheid-Liste |
| K38 | nein | unbekannt | Infrastruktur-Klicks mit Ersatzplan | GitHub-Spam-Flag Status bekannt; Hetzner-Zugang geklärt oder Wächter ohne Hetzner; Cloudflare-Recht oder Disconnect von Hand; CJ-Hüllen aufgeräumt | GitHub-Support, SSH-Prüfung durch Besitzer, cf-builds-abschalten.yml, CJ-Konsole |

## Belege je Kriterium

- **K01** (erfuellt): GEMESSEN (laeufe L14): 0 von 6 ausgefallen, Verspätung 2,9-9,2 h; Autopilot, Bestseller, Tages-Update je 14 von 14 Tagen ohne Lücke (15.-28.10.); Guards 5 und Image-Audit 5 Läufe. Einschränkung: Auswahl-Lauf erst 2 geplante Läufe (kurze Reihe). Verspätet heisst nicht ausgefallen.
- **K02** (offen): GEMESSEN (laeufe L2-L6): Autopilot 12 von 14 und Bestseller 12 von 14 Läufen mit höchstens 1 s Schrittdauer (15.-26.10.), echt erst 27./28.10.; Guards: 19.10. hohl und 26.10. rot belegt (Logs 05./12.10. nicht gelesen), erster scharfer Lauf steht aus; Auswahl-Lauf 28.10.: 0 Produkte geschrieben, Job success; Image-Audit 27.10. echt (60 Produkte, nur Bericht).
- **K03** (offen): GEMESSEN (laeufe L13, L15): existiert nicht; Tages-Update 5 Tage rot ohne Reaktion; die Prüfroutine des Auswahl-Laufs feuert 04:37Z, der Lauf endete 05:58Z (Ableitung: sieht das Ergebnis erst am Folgetag); Routinen-SUCCEEDED teils nur Zustellung (11 und 19 ms, Ableitung).
- **K04** (offen): GEMESSEN (laeufe L2, L7; offene_fehler L1): SHOPIFY_ADMIN_TOKEN liefert HTTP 401 (Ableitung: veraltet; merchant_feed.mjs:53/55 nimmt es vor den Client-Credentials); Autopilot meldete 26.10. 'no-op: kein gültiger Shopify-Token'; GROQ_API_KEY leer, Gemini-Guthaben 27.10. einmal leer; übrige Secrets unbekannt (nur merchant_feed.mjs auf Token-Vorrang geprüft).
- **K05** (offen): GEMESSEN (laeufe L7, offene_fehler L1): 5 von 5 Läufen seit Einführung des Jobs (24.10.) rot, HTTP 401, der Job war nie grün; Feed-Datei 8 081 Artikel, zuletzt 24.10. (von Hand gemergt); 9 von 14 Läufen seit 15.10. success. Ob Google den Feed abruft: unbekannt.
- **K06** (offen): GEMESSEN (laeufe L4): 28.10. 5 h 10 min Laufzeit, 0 Produkte geschrieben, Job success (Tageslimit neuer Varianten, Kontingent vom manuellen Lauf verbraucht, BEHAUPTUNG); 27.10. 679 (geplant) und 1 848 (Handlauf); bei rund 25 400 von 56 618 aktiven Produkten (45 %) fehlt die Auswahl.
- **K07** (unbekannt): GEMESSEN (laeufe L5): 5 geplante Läufe (28.09.-26.10.) nie mit scharfem Schreiben; 26.10. failure nach 1 s; manueller Trockenlauf 26.10. arbeitete echt (159 Bilder ohne Alt-Text in 250 gescannten Produkten); ob der scharfe Lauf fehlerfrei läuft: unbekannt, Risiko Fehlgriff ohne Beobachter.
- **K08** (erfuellt): GEMESSEN (offene_fehler Messungen): 5 von 5 grün. Die drei Checks 'Workers Builds: aban-news-landing / aban-a / ki-verzeichnis' sind immer rot (Deployment skipped) und zählen nicht.
- **K09** (unbekannt): Kein Beleg in den vier Berichten (nicht gemessen).
- **K10** (offen): GEMESSEN (laeufe L12, offene_fehler L7): 0 Läufe auf main (nur pull_request mit Pfadfilter); banner_test.mjs und test_markets_titel.py in keinem Workflow; ausserhalb automation/ 33-51 Tests nicht in Workflows (musterabhängig); die Berichte zählen 95 bzw. 96 Tests je nach Suchmuster.
- **K11** (offen): GEMESSEN (offene_fehler L6): 6 von 6 Läufen auf main cancelled nach 8:56 min (timeout-minutes 8, 2 724 HTML-Dateien bis Tiefe 3), Link-Check übersprungen.
- **K12** (offen): GEMESSEN (bestand_preis L2, laeufe L16, bestellkette L2): letzter Cloud-Aufseher-Commit 24.10. 13:31 UTC; Server-Wächter letzter Commit 16.10. 06:07 UTC; Aufseher-Keepalive und 4-h-Runde enabled=false seit 26.10. 16:42 UTC (Grund im Repo nicht gefunden); kein Keepalive-Prozess in der Sitzung. Der Browser-Agent-Puls 26.10. misst keine Wächter.
- **K13** (offen): GEMESSEN (bestand_preis L1, laeufe L9): jüngster Stempel 24.10. 00:13:10 UTC (4,6 Tage), Stichproben 80 und 41 bestätigen; Abweichung 450 von 3 998 (11,3 %): 435 Shop höher (Überhang 1 640 Stück), 15 niedriger; Feed am 28.10. bytegleich zur Kopie vom 27.10.
- **K14** (offen): GEMESSEN (bestand_preis L7): 30 kaufbare Varianten mit erwartetem Bestand 0; 17 davon Fortura-Spalte 0 oder minus 1 (Klasse Bestellung #1027, Fortura-Storno), 13 mit Fortura-Bestand 1 (nur Puffer verletzt); alle 30 live nachgefragt: ACTIVE, Mengen 1-60.
- **K15** (offen): GEMESSEN (bestand_preis L4-L6, offene_fehler L2): 29 211 von 53 723 (54,4 %) mit Befund 4,4-17,6 Tage alt (Ledger-Stand 24.10.); 23 518 'keine-cj-sku' (19 859 pid-prüfbar, 3 601 Stamm-Form sofort fällig, nur 58 unprüfbar) plus 989 nie im Ledger; lieferbarkeit_guard.mjs 0 Aufrufe in 178 Workflows; 510 363 von 514 167 CJ-Varianten (99,3 %) ohne Bestandsführung, immer kaufbar; 3 781 gesperrte Varianten, Grund nur bei 170 belegt. Aufbau der pid-Ware bei 600 Abfragen/Tag rund 33 Tage (BEHAUPTUNG, Rechnung).
- **K16** (erfuellt): GEMESSEN (bestand_preis L9): 0 von 514 124 CJ-, 3 998 Fortura- und 912 POD-Varianten mit Einkauf; ohne unitCost bleiben 43 CJ, 525 POD, 63 sonstige. Gilt nur gegen unitCost; dessen Verlässlichkeit ist in K18 offen.
- **K17** (offen): GEMESSEN (bestand_preis L9): mit 15-%-Code 1 CJ- und 15 Fortura-Varianten im Minus (mit Feed-Einkauf 16, davon 4 kaufbar); Mengenrabatt: Verlustprüfung ohne Versand/Gebühren UNKLAR (offene_fehler L28).
- **K18** (offen): GEMESSEN (bestand_preis L10), n=9 prüfbar, keine Zufallsauswahl: unitCost niedriger bei 4 (minus 3, 9, 28, 35 %), davon 2 über der 10-%-Grenze (#1030, #1020); gleich bei 1; höher bei 4. #1030: Rechnung 25.70 USD (Fracht 49 %) gegen unitCost 16.72 CHF. Alle 10 echten Bestellungen blieben mit Versanderlös im Plus.
- **K19** (offen): GEMESSEN (bestand_preis L10, L13): kein Mechanismus (cj_kosten_backfill.mjs:188 überspringt vorhandene unitCost; printful_reprice nur per Handstart); POD-Einkauf unter Printful-Preis mal 0,9 bei 18 von 20 und 15 von 16 Stichproben; 525 von 1 437 POD-Varianten ohne unitCost; Netto bleibt positiv, Printful-Versand nicht eingerechnet.
- **K20** (offen): GEMESSEN (bestand_preis L17, bestellkette L4): #1027 (Fortura-Storno, cancelReason INVENTORY, 19./20.10.) liegt im Fenster; #1019 (27.09.) knapp ausserhalb; #1017 war ein Versandverbot, kein Bestandsfall. Shopweit 10 von 29 Bestellungen voll erstattet (CHF 1146.13 von 1933.95), die 7 älteren nicht auf Ursache geprüft; kleine Stichprobe.
- **K21** (offen): GEMESSEN (bestand_preis L8): 718 von 2 371 aktiven Fortura-Produkten ohne kaufbare Variante; Pause-Datei 'BIS 2026-10-27' abgelaufen: beim Neustart der Hygiene gingen genau diese 718 auf DRAFT (Halloween/Fasnacht); Entscheid über Fortura-Bazar-Bestand offen seit #1027.
- **K22** (offen): GEMESSEN (bestand_preis L15): von 8 081 Artikeln 8 037 gleich (99,5 %), 36 'out of stock' jetzt kaufbar, 8 nicht mehr aktiv, 11 Preise abweichend (grösste 39.90 im Feed gegen 66.90 im Shop); Feed liest nur die erste Variante (QUELLE).
- **K23** (erfuellt): GEMESSEN (bestellkette L10): letzter Lauf 28.10. 16:21:31Z SUCCEEDED (davor 14:30:39Z), 15 von 15 Bestellungen (#1017-#1031) gesehen, gemeldetHaengt leer. Einschränkung: meldet nur; keine Bestandsprüfung; 14-Tage-Serie nicht belegt (nur zwei Läufe gelesen).
- **K24** (erfuellt): GEMESSEN (bestellkette Messungen): CJ-Aufträge nach 2-81 min (n=8: #1021 81, #1022 5, #1023 2, #1025 5, #1026 2, #1028 72, #1029 44, #1030 5); Fortura #1031 Upload 5 min nach Bestellung (22:51Z, 22:56Z). Aber von Hand/Sitzung ausgelöst (siehe K25).
- **K25** (offen): GEMESSEN (bestellkette L2, L5): Keepalive und 4-h-Runde seit 26.10. aus; _cj_orders_done.txt endet bei #1028 (24.10.); #1029-#1031 von Hand/Sitzung angelegt; Tracking und Lieferschein hängen an Einmal-Erinnerungen (29.10. 08:00Z und 10:00Z).
- **K26** (offen): GEMESSEN (bestellkette L1): Geldbörse 0.00 USD; 18 bezahlte CJ-Aufträge für 16 Bestellungen: 14 binnen 0,0-1,0 h, LX1026 nach 18,8 h, LX1025 nach 22,7 h (Grund unbelegt); payBalance lehnte laut Code ab (nicht erneut getestet); Mindesteinzahlung USD 2000 ist Betreiberaussage (QUELLE); heute wartet nichts auf Zahlung. Vollautonomie in diesem Schritt ausgeschlossen.
- **K27** (erfuellt): GEMESSEN (bestellkette Messungen, offene_fehler L5): 3 offene Bestellungen (#1029, #1030, #1031, alle 27.10., zusammen CHF 154.61), alle jünger als 48 h; bei den Lieferanten angelegt (QUELLE Routinen-Texte); gemeldetHaengt leer. Zeit bis 'versendet' in Shopify war bisher 51-198 h (Median CJ-Kette 80,7 h).
- **K28** (offen): GEMESSEN (bestellkette L3): 6 von 6 Sendungen vor dem Abholscan (minus 11 bis minus 38 h); Median bezahlt bis Abholscan 100,6 h; Code cj_fulfill_engine.py:250-251 trägt ohne Scan-Test ein; Zeitzone praktisch UTC.
- **K29** (unbekannt): Kein Fortura-Fulfillment unter den 15 letzten Bestellungen (nie gemessen); #1031: XML 27.10. 22:56Z hochgeladen, ORDERS und DESADV leer (GEMESSEN), Frist laufend; #1027: Storno 18,8 h nach Bestellung, Kunde rund 19 h im Ungewissen (GEMESSEN).
- **K30** (offen): GEMESSEN (offene_fehler L4, bestand_preis L12, bestellkette L9): Sync nur per Handstart seit 13.06.; 0 Bestellungen mit Tag printful-synced/-review; Printful 1 Auftrag insgesamt (03.07.); 6 wichtige Sync-Funde offen (Doppelauftrag, Seitenblättern, Prüfung gibt bei Fehler frei); Platzierungs-Bug Hüllen/Tassen mit 'front' (QUELLE, Wirkung auf echte Bestellungen ungeprüft). Latent, weil noch keine POD-Bestellung.
- **K31** (unbekannt): Zahl offener Kundenmails nicht in den Berichten; Erstattungszeiten GEMESSEN: 18,8 h (#1027), 56,1 h (#1019 erste Teilerstattung), 208,4 h (#1017); Retoure-Ort und Paketannahme im Repo nicht gefunden; Regel der Routinen: keine Kundenmails ohne Freigabe.
- **K32** (erfuellt): GEMESSEN (bestellkette L6): von 40 CJ-Aufträgen 0 in IN_CART/UNPAID, 9 CREATED ohne Betrag (nicht zahlbar), 13 TRASH; Aufräumen der 9 Hüllen bleibt Besitzer-Klick, Risiko nicht gemessen.
- **K33** (offen): GEMESSEN (offene_fehler Messungen): 80 Funde = 21 wichtig + 59 klein (wichtig je Ziel: pod-preise 6, material 6, google-feed 4, cj-varianten 3, cj-reviews 1, fortura-engine-2 1); Stichprobe 12 von 21 am Code gelesen: 12 von 12 noch vorhanden. Dazu Mengenrabatt 9 Funde (Härtung) und 3 UNKLAR.
- **K34** (offen): QUELLE/BEHAUPTUNG (offene_fehler): 59 klein (Codex); nach Einstufung des Berichts 78 Härtung, 25 kosmetisch, 3 unklar (Schweregrad ist Einordnung, nicht Messung); die 154-155 Einzelpunkte stecken in 39 Befunden.
- **K35** (offen): GEMESSEN (offene_fehler L24, L33, L35, L39): 43 offene PRs (32 Draft), 41 über 7 Tage, 34 über 30 Tage unberührt; #2673 und #2694 (Schutz-Entwürfe) ungemergt; README fortura-haertung sagt 'NICHT eingespielt', Engine-Zweig ist bitgleich (Blob a69db364); AUTONOMER-MODUS §8 Stand 31.05.; SHARED-MEMORY Secrets-Stand 08.06.; shop-guards.yml:4 behauptet DENY zu CONTINUE, price_guard ändert nichts. 0 offene Issues sind kein Beleg für Fehlerfreiheit (Fehler stehen in Dateien).
- **K36** (offen): QUELLE/GEMESSEN: Ersatzpläne nur teilweise vorhanden (Erinnerung 03.11. 08:00Z für Rechnung D3 existiert; Reminder 29.10. für Tracking/Lieferschein). Ersatzpläne: CJ bezahlen = Push nach 2 h, Kundeninfo nach 24 h; Wächter-Host = GitHub-Workflow auf main (Fortura-Zugang als Repo-Secret) statt Server; Fortura-Pause = bis Entscheid verlängern, kein Auto-DRAFT; Retoure = Frist 48 h, Antwortentwurf als Gmail-Entwurf (nicht senden); Rechnung D3 = Erinnerung, Druck erst nach Zahlung und Freigabe.
- **K37** (offen): QUELLE: Index-Anträge (höchstens 10/Tag; 2 Seiten nicht indexiert; Ersatz: Crawl abwarten, 8 von 10 Seiten waren nach Stunden indexiert) / Merchant Center Block C und Abruf-Eintrag des Feeds (Ersatz: Browser-Befehl an PC-Claude; geringes Risiko bei 0 Produkten) / Bio-Links UTM (PC-Claude) / TikTok-Pixel/Business Center und Kampagne mit Budget (Ersatz: keine bezahlte Werbung, organisch; Test 859 Klicks, CHF 143.71, 0 Käufe) / Geschenkgutschein veröffentlichen / POD-Entscheide (a)-(e) und Samsung (Ersatz: 'bleibt', 4 von 5 Produkten gesperrt) / Schmuck-/Rucksack-Standardentscheide / 65 pausierte Zeitpläne (Ersatz: bleiben pausiert, Einzelfreigabe) / Startseite: MAIN-Theme heute 212656488839 (GEMESSEN, Schlüsselwert roles MAIN, zuletzt 28.10. 13:07Z); Entwurf 212645413255 ist nicht MAIN; die Aussage 'Entwurf nicht veröffentlicht' (offene_fehler L34) ist so nicht belegt, ob dessen Startseite live ist: unbekannt.
- **K38** (unbekannt): QUELLE (bestellkette L17, L6): GitHub-Konto war am 30.08. als Spam markiert, heutiger Stand unbekannt; Hetzner-Server stumm seit 16.10., SSH aus der Cloud nicht erreichbar; 'Workers CI Write' fehlt (nur kosmetisch: drei immer rote Checks); Ersatzpläne: Wächter nach GitHub portieren, Disconnect von Hand, Hüllen sind wertlos (Wächter filtert sie).

## Lücken nach Wirkung auf Geld und Kunden

| Rang | Lücke | Wer | Aufwand | Risiko, wenn offen |
|---|---|---|---|---|
| 1 | Kein dauerhafter Betreiber für Bestands-, Lieferbarkeits- und Preiswächter (Fortura-Bestand steht seit 24.10.) | beide (Claude baut/portiert und fährt Einmallauf; Besitzer entscheidet Host/Trigger und Fortura-Pause) | mittel (Einmallauf klein, Dauerbetrieb mittel bis gross) | Weitere Erstattungen wie #1027, Vertrauensverlust, Gebühren; der Schutz vor Nicht-Lieferbarem fehlt komplett ausser dem letzten Netz der Erstattung. |
| 2 | Grün heisst nicht gearbeitet; kein Wächter über die Wächter | Claude | mittel | Jede neue Störung läuft unbemerkt, bis ein Kunde sie spürt; der Besitzer sieht grüne Häkchen. Macht alle anderen Lücken unsichtbar. |
| 3 | CJ-Lieferbarkeit nicht flächendeckend geprüft; CJ-Ware immer kaufbar | beide (Claude baut; Besitzer entscheidet CJ-Punktebudget, ca. 10 Punkte je pid-Abfrage) | gross | Kunde zahlt für Ware, die CJ nicht liefern kann; Erstattung nach Tagen; Fehlsperren kosten Umsatz (unbelegt). |
| 4 | Preisboden und Einkauf unzuverlässig, keine Nachführung | Claude (CJ-Punktebudget: Besitzer) | gross | Verlustverkäufe bei Rabattcodes oder Preissteigerungen, ohne dass es auffällt; bisher alle 10 echten Bestellungen im Plus (Versanderlös). |
| 5 | Live-Code mit Geldwirkung hat offene wichtige Funde (Nachtlauf CJ-Varianten, Fortura-Engine, POD-Sync) | Claude (Fortura-Fragen und Push-Freigabe Engine-Zweig: Besitzer) | mittel | Falsche Varianten-Preise, doppelte oder falsche Lieferantenbestellung (Geld), doppelter Druckauftrag beim Wiedereinschalten von Printful. |
| 6 | Bestellkette läuft von Hand: Dauerläufer aus, Tracking und Lieferschein an Einmal-Erinnerungen | beide (Entscheid, ob die abgeschalteten Routinen wieder an dürfen) | mittel | Fällt Sitzung oder Erinnerung aus, bleibt eine bezahlte Bestellung unbemerkt liegen; Kunde ohne Versandinfo. |
| 7 | CJ-Zahlung ist Besitzer-Klick (Geldbörse 0.00 USD) | Besitzer | klein | Ware liegt unbezahlt im Warenkorb, Lieferverzug, Erstattungsrisiko; Vollautonomie in diesem Schritt ausgeschlossen. |
| 8 | Reklamation, Retoure, Erstattung und Kundenmail ohne Automat | Besitzer (Entscheid), Claude (Entwürfe, Zähler) | mittel | Unzufriedene Kunden, Chargebacks, Vertrauensschaden; Zahl der betroffenen Mails unbekannt. |
| 9 | Erster scharfer Shop-Guards-Lauf am Mo 02.11. ohne Probelauf | Claude | klein | Fehlgriff beim Publizieren oder Redirects ohne Beobachter. |
| 10 | Merchant-Feed-Job HTTP 401 (5 von 5 rot), Feed 4 Tage alt | Claude (Merchant-Center-Eintrag klärt der Besitzer) | klein | Falsche Preise oder Verfügbarkeit bei Google, falls der Abruf aktiv ist; Tages-Update bleibt dauerhaft rot. |
| 11 | 718 ausverkaufte Fortura-Produkte als ACTIVE; Hygiene-Pause abgelaufen | Besitzer (Entscheid), danach Claude | klein | Tote Seiten für Kunden bzw. unbeabsichtigter Massen-DRAFT beim Wächter-Neustart in der Halloween-Saison. |
| 12 | Tracking-Eintrag vor dem Abholscan; Kundeninfo bei manueller Erledigung fehlt | Claude | klein | Rückfragen, Vertrauensschaden (Vorfälle #1011, #1017/#1018 im Archiv). |
| 13 | Auswahl-Nachtlauf schreibt 0 bei success; 45 % der aktiven Produkte ohne Auswahl | Claude | klein | Conversion-Verlust; Lauf kann leer enden, ohne dass es auffällt. |
| 14 | Inhalts-Werkzeuge mit Härtungs- und Kundensicht-Funden (Material, Reviews, Feed-Code, Mengenrabatt, Grind-Preis, Rucksack-Menü) | Claude | mittel | Falsche Angaben auf Produktseiten (UWG-Einschätzung ist BEHAUPTUNG), Rabatt bleibt nach Abbruch stehen. |
| 15 | 65 Zeitpläne seit 13.06. pausiert; Social, Reviews, POD-Sync, Site-Health nur auf Zuruf | Besitzer (welche Crons wieder an), Claude (Umsetzung) | klein | Weniger Reichweite und Pflege; Fair-Use-Risiko der GitHub-Sperre bei zu vielen Crons. |
| 16 | Tests laufen nur bei Pull-Requests; Link-Check läuft nie | Claude | klein | Fehler in Wächtern fallen erst bei einem passenden PR auf (die hohlen Läufe wären nicht aufgefallen). |
| 17 | Besitzer-Klicks mit Reichweiten-/Infrastruktur-Wirkung | Besitzer (Browser-Anteile auch PC-Claude) | klein bis mittel | Geringere Sichtbarkeit und Messbarkeit; kein direkter Geldverlust belegt. |
| 18 | PR-Stau, veraltete Betriebsdokumente, unvollständige Zweitmeinung | beide (Besitzer: welche PRs schliessen; Nutzungslimit des Pro-Kontos) | mittel | Neue Sitzungen arbeiten nach falschem Stand; Geld-Code ohne Zweitmeinung, wenn das Abo vorher endet. |
| 19 | Image-Audit und Bestseller-Sortierung wirken nur klein | Claude | klein | Geringe Conversion-Wirkung, kein Geldrisiko. |

## Empfehlung

Heute weder Kündigung noch ein auf die Betriebsbedingung gestütztes Downgrade: von 23 Pflichtkriterien sind 6 erfüllt, 14 offen, 3 unbekannt (GEMESSEN/Zählung). Das ChatGPT-Pro-Abo ist laut CLAUDE.md eine Zweitmeinung für Code mit Geldwirkung (QUELLE); im Eingang steht kein geplanter Lauf, der es braucht (BEHAUPTUNG, nicht gegengeprüft), der Betrieb hängt eher am Claude-Konto (7 wiederkehrende Routinen, GEMESSEN; Abhängigkeit vom Nutzungslimit ist Ableitung). Plan-Stufen und Preise sind unbekannt. Bedingungen in Zahlen: (1) DOWNGRADE vertretbar, sobald die Code-Änderungen mit Geldwirkung der Phasen 1-2 (Wächter-Betrieb, Fortura-Engine, Nachtlauf-Preisbasis, unitCost-Abgleich, Feed-Job, Tracking nach Abholscan) gemergt und je einmal zweitgeprüft sind, offene wichtige Funde von 21 auf höchstens 5 gesunken sind (K33) und K02, K03, K04, K12 seit mindestens 7 Tagen erfüllt sind. (2) KÜNDIGUNG vertretbar, wenn alle 23 Pflichtkriterien 14 Tage in Folge erfüllt sind, offene wichtige Funde = 0, Erstattungen wegen Nicht-Lieferbarkeit = 0 in 30 Tagen (K20), höchstens 5 der 15 Nicht-Pflichtkriterien offen und jeder Besitzer-Klick Frist plus Ersatzplan hat. Wegen der CJ-Abdeckung (pid-Ware 600 Abfragen/Tag, rund 33 Tage Aufbau) frühestens Mitte Dezember (Rechnung, BEHAUPTUNG). Wer vorher Kosten senken will, kann es, verliert aber die Zweitmeinung genau in der Reparaturphase; Ersatz sind zwei unabhängige Claude-Prüfer plus Nachstellen am echten Code. Bis dahin zuerst: (a) Besitzer entscheidet zwei Dinge: Fortura-Bazar-Bestand und Pause (Standard: Pause verlängern, kein Auto-DRAFT der 718 Produkte) sowie den Wächter-Host (Trigger wieder an oder Portierung nach GitHub mit Fortura-Zugang als Repo-Secret). (b) Claude: Merchant-Feed-Fix (Client-Credentials zuerst), Token-Test, Lauf-Wächter mit Hohl-Erkennung und Push (K02-K04) mit Alarmtest. (c) Claude: Trockenlauf Shop-Guards (LIVE=0, Obergrenze) vor Mo 02.11. 07:00 UTC. (d) Claude: Einmallauf Fortura-Bestand nach Entscheid (a), danach Dauerbetrieb; 17 Klasse-#1027-Varianten zuerst. (e) Claude: Tracking erst nach Abholscan, unitCost gegen echte Rechnung, Nachtlauf-Preisbasis und Fortura-Engine-Funde. (f) CJ: 3 601 Stamm-Produkte sofort prüfen, pid-Ware über Wochen. (g) POD-Testbestellung vor dem Wiedereinschalten von Printful. Feste Termine: 29.10. 08:00Z/10:00Z (Tracking, Fortura-Lieferschein), 02.11. (Guards, Mengenrabatt), 03.11. 08:00Z (Rechnung D3).

## Zu "0 Fehler"

"0 Fehler" lässt sich nie beweisen, man kann nur zeigen, dass gesuchte Fehler in einem Messfenster nicht auftraten (die Berichte zeigen sogar, dass "grün" und "gearbeitet" auseinanderfallen: 12 von 14 grünen Autopilot-Läufen waren hohl), darum gilt stattdessen: jede Pflicht-Kennzahl hat Schwelle, Messquelle und Rhythmus, ist 14 Tage in Folge erfüllt, und jede Störung wird binnen 24 h gemeldet, bevor Geld oder Kunden betroffen sind.

## Zählung

Eingang insgesamt 90 Befunde: laeufe 16 (L1-L16) + bestand_preis 17 (L1-L17) + bestellkette 18 (L1-L18) + offene_fehler 39 (L1-L39). Berücksichtigt: 90 von 90, keiner verworfen; jeder Befund steckt in mindestens einer Lücke G1-G19 und/oder einem Kriterium K01-K38 (G-Nummer = Rang). Zuordnung. laeufe: L1 G15; L2 G2; L3 G2 (G19); L4 G13; L5 G9; L6 G19; L7 G10; L8 G3/G4; L9 G1; L10 G6/G7; L11 G15; L12 G16; L13 G2; L14 K01 (erfüllt, Kontext G2); L15 G1; L16 G1. bestand_preis: L1 G1; L2 G1; L3 G1/G3; L4 G3; L5 G3; L6 G3; L7 G1; L8 G11; L9 G4; L10 G4; L11 G3; L12 G5; L13 G4; L14 G4; L15 G10; L16 G3; L17 G8. bestellkette: L1 G7; L2 G6; L3 G12; L4 G3/G8; L5 G6; L6 G7; L7 G12; L8 G8; L9 G5/G8; L10 K23 (erfüllt); L11-L17 G17; L18 G17 (Entlastung: AGB-Fix, Pixel, Merchant Block A erledigt). offene_fehler: L1 G10; L2 G3; L3 G15; L4 G15; L5 G6; L6 G16; L7 G16; L8 G5; L9 G5; L10-L16 G14; L17 G5; L18 G5; L19 G17; L20 G17; L21 G5; L22 G5; L23 G5; L24 G18; L25-L28 G14; L29-L31 G17; L32 G17; L33 G18; L34 G17 (Befund nicht belegt, MAIN-Theme gemessen); L35 G18; L36 G17; L37 G18; L38 G16; L39 G2. Geld-/Kundenrelevante Befunde liegen in G1-G13 und in den 23 Pflichtkriterien. Die 154-155 Einzelpunkte der offenen_fehler (Codex-Datei 80 Funde = 21 wichtig + 59 klein) sind in den 39 Befunden gebündelt und über K33/K34 gezählt, nichts davon ging verloren; bewusst nicht gezählt (Feature-Backlog laut Bericht): Plan A, Unterteilung Kostüme, Geschenkgutschein-Entwurf. Kriterien: 38 (23 Pflicht, 15 nicht Pflicht); Status heute: 7 erfüllt, 26 offen, 5 unbekannt; Pflicht: 6 erfüllt, 14 offen, 3 unbekannt. Korrekturen, die ich gegenüber den Zusammenfassungen anwende: Zeitpläne 6 aktiv und 65 pausiert (nicht 7 und 72); Merchant-Feed-Job nie grün, 5 von 5 rot (nicht 4); Bestseller 12 von 14 hohl; Shop-Guards 5 Läufe, Echtarbeit nur für 19.10./26.10. belegt; WELCOME10 ist aktiv bis 2027-12-31; Titanstahl 9 Produkte (nicht 15); #1017 war Versandverbot, nicht Bestand; Fortura-Storno 18,8 h (nicht 20,7 h); CJ-Stichprobe 100 von 100 CONTINUE und ungetrackt. Eigene Messung in diesem Schritt: 1 Shopify-Leseabfrage (MAIN-Theme 212656488839, zuletzt 28.10. 13:07Z); sonst nur die vier Berichte gelesen, nichts geschrieben.
