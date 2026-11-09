# CJ-Rückmeldung: Sendungen nach Shopify (09.11.2026)

Auftrag des Besitzers 09.11.: «weiter verbessern für alles» (Auslegung meine: die offenen Stellen messen und dort bessern, wo es mein Bereich ist und kein offener Entwurf dasselbe tut).

## Die Lücke (GEMESSEN 09.11. 06:00 bis 07:30 UTC, nur lesend)

Die Engine legt die CJ-Aufträge `LX<Nr>` selbst an (CJs Shopify-Verbindung kennt sie nicht). CJ meldet nichts zurück, und es gab bisher kein Werkzeug, das Sendungen nach Shopify überträgt (für Printful gibt es `printful_tracking.mjs`). Folge:

| Bestellung | Shopify | CJ (`LX…`) |
|---|---|---|
| #1034 bis #1039 | alle bezahlt, **Nicht versendet** | alle **UNSHIPPED** (bei CJ bezahlt), bezahlt vor 0,4 bis 4,6 Tagen, fünf mit Sendungsnummer, nur «Label created» |
| #1029 | als versendet markiert (03.11.), **ohne Sendungsnummer** | **SHIPPED** seit 06.11., heute «En Route», «Released by Outbound Customs» |
| #1031 | als versendet markiert (03.11.), ohne Nummer | Fortura-Ware, nicht CJ |
| #1030, #1032, #1033 | versendet mit Nummer | geliefert bzw. unterwegs |

**Bearbeitungszeit bei CJ** (Zahlung bis Lagerausgang, neun Aufträge): 1,7 / 2,0 / 3,2 / 3,2 / 3,4 / 3,4 / 3,5 / 6,1 / **9,9** Tage (der Ausreisser ist #1029). Median 3,4 Tage; #1034 (4,6 Tage), #1035 (3,8) und #1036 (3,5) liegen im Normalbereich.

## Was gebaut ist

| Datei | Aufgabe |
|---|---|
| `automation/lib/cj_tracking.mjs` | reine Entscheidungslogik (kein Netz, kein Schreiben): `planCj` |
| `automation/cj_tracking.mjs` | Runner: Shopify-Bestellungen lesen, CJ-Liste und -Detail lesen, melden, Tags, Telegram |
| `automation/cj_tracking_test.mjs` | 141 Prüfungen; der Runner läuft im Kindprozess gegen gefälschtes Shopify (strenge Feldauswahl wie bei Printful), CJ und Telegram |
| `automation/cj_tracking_mutationsprobe.py` | 70 Mutanten über Logik und Runner (Temp-Baum, schreibt nichts ins Repo) |
| `.github/workflows/cj-tracking.yml` | Testjob (bei Änderungen, mit Mutationsprobe) und Lauf 1× täglich 16:11 UTC |

**Ablauf je Bestellung** (bezahlt, mindestens eine CJ-Position (SKU `CJ…`), jünger als 45 Tage, ohne Tag `cj-shipped`):
1. CJ-Auftrag `LX<Nr>` in der CJ-Liste suchen, Detail lesen (Status, Sendungsnummer, Versandart, Link, Stückzahl).
2. `melden`: CJ führt **SHIPPED oder DELIVERED**, Sendungsnummer da, **Stückzahl bei CJ = CJ-Positionen im Shop** → `fulfillmentCreate` mit Nummer, 17track-Link und Firma (nur die CJ-Positionen, je Standort ein Aufruf, nur der erste mit Kundenmail). `nachtragen`: bereits «versendet», aber Lieferung ohne Nummer (Fall #1029) → `fulfillmentTrackingInfoUpdate`. `warten`: CJ-Lager (bezahlt) oder noch nicht bezahlt.
3. **Befund** (Telegram EINMAL je Art, dazu Tags `cj-problem` und `cj-problem-<art>`): `cj-fehlt` (bezahlt, nach 24 h kein CJ-Auftrag), `cj-unbezahlt` (angelegt, nach 24 h nicht bezahlt), `cj-haengt` (bezahlt, nach 7 Tagen nicht aus dem CJ-Lager; GEMESSEN: normal sind bis 6 Tage), `cj-storniert`, `ohne-nummer` (CJ versendet, nach 48 h keine Nummer), `positionen-abweichung` / `positionen-unbekannt`, `nicht-meldbar`, `nummer-bekannt-offen`, `mehrere-ohne-nummer`, `cj-status-unbekannt`. Wechselt die Art, wird neu gemeldet; verschwindet der Befund, werden die Tags entfernt.
4. Alles gemeldet → Tag `cj-shipped` (die Bestellung wird nicht mehr gelesen).

**Grundsatz: lieber nichts melden als falsch melden.** Dazu im Einzelnen:
- **Trockenlauf ist die Vorgabe.** Nur `DRY_RUN=0` (oder `false`, `no`, `nein`, `off`) schaltet das Schreiben frei; jeder andere Wert, auch `1`, `true`, leer und Unsinn, bleibt Trockenlauf. Im Workflow macht das die **Freigabedatei `dropship/CJ-TRACKING-FREI.txt`** (liegt NICHT): ohne sie läuft nichts scharf. Steht das Wort «stumm» in der Datei, wird ohne Kundenmail gemeldet (`KUNDIN_MAILEN=0`).
- **Kundenmail nie nach der Zustellung:** CJ-Status DELIVERED wird still gemeldet.
- `fulfillmentCreate` und `fulfillmentTrackingInfoUpdate` werden **nie wiederholt** (eine Zeitüberschreitung kann «gelang» heissen = doppelte Mail); bei unbekanntem Ausgang kommt ein Alarm «erst in Shopify nachsehen».
- In die Kundenmail kommt nur ein Link auf `t.17track.net` (CJs eigener Link, englische Oberfläche → deutsch); jeder andere Link wird durch unseren eigenen ersetzt.
- Positionen an Fulfillment-Service-Standorten (Printful-App) und geschlossene Fulfillment-Orders (veraltete Restmenge, GEMESSEN an #1004) werden nie angefasst; Fortura- und Printful-Positionen einer gemischten Bestellung bleiben offen.
- Ist die CJ-Auftragsliste nicht lesbar, endet der Lauf mit Fehler und **ohne** «CJ-Auftrag fehlt»-Alarme (sonst gälten alle Bestellungen als unbestellt).
- `NUR=#1029,#1034` schränkt einen Lauf auf diese Bestellungen ein (Workflow-Eingabe `nur`): kontrollierter erster Einsatz.

## Gemessen

- **Echter Trockenlauf 09.11. gegen den Live-Shop und CJ** (nichts geschrieben): 7 Bestellungen zu prüfen, 7 bei CJ gelesen, **1 Nummer nachzutragen (#1029, CJPacket EQKPT8613206759YQ)**, 6 warten (#1034 bis #1039 im CJ-Lager), 0 Befunde, 11 übersprungen (Fortura/Printful oder schon vollständig), 0 Fehler. Die Suche `fulfillment_status:shipped` findet die von Hand versendeten Bestellungen (#1029 erschien).
- Die Shopify-Abfrage (10 Bestellungen je Seite, verschachtelte Fulfillment-Orders) läuft gegen den echten Shop im Kostenrahmen; beide Schreib-Mutationen sind gegen das Admin-Schema geprüft (`fulfillmentTrackingInfoUpdate(fulfillmentId, trackingInfoInput, notifyCustomer)`, `FulfillmentInput.trackingInfo`).
- Test 141 Prüfungen (Node 20 und 22), Mutationsprobe **69 von 70 erkannt**; der eine ist gleichwertig: `planCj` liefert nie «fertig» zugleich mit einem Befund, die Zusatzabfrage im Runner ist eine zweite Sicherung. Die erste Fassung des Tests liess zwei Mutanten durch (geschlossene Fulfillment-Order ohne «kein Alarm» geprüft); behoben. Alle Zeiten im Test sind relativ zu «jetzt» (kein fester Stichtag).

## Einschalten (braucht das Ja des Besitzers: es sendet Kundenmails)

1. Empfohlen als erster Schritt: Handstart «CJ-Rückmeldung» mit `nur = #1029` (die Kundin hat seit dem 03.11. keine Nummer). Dafür die Datei `dropship/CJ-TRACKING-FREI.txt` in `main` legen (ein Satz genügt) und danach den Handstart auslösen; die Mail «Sendungsnummer aktualisiert» geht an die Kundin von #1029.
2. Danach läuft der Zeitplan jeden Tag 16:11 UTC (GitHub startet hier oft Stunden später) und meldet alle Bestellungen, sobald CJ sie als versendet führt.
3. Ohne Kundenmail (nur Status und Nummer in Shopify): das Wort «stumm» in die Datei schreiben.

**Zurücknehmen:** Datei löschen = Trockenlauf. Eine bereits gesendete Kundenmail lässt sich nicht zurückholen; eine falsche Lieferung im Shopify-Admin stornieren. Tags `cj-shipped` und `cj-problem*` sind nur Marken und lassen sich jederzeit entfernen (die Bestellung wird dann wieder gelesen).

## Offen / ungemessen
- Der erste scharfe Lauf (erst nach dem Ja); ob der CJ-Zeitstempel (`createDate`, `paymentDate`) wirklich UTC ist, ist an Vergleichen mit Shopify-Zeiten gesehen, nicht belegt (Folge bei Irrtum: Schwellen um wenige Stunden verschoben).
- Wie die Shopify-Mail «Sendungsnummer aktualisiert» für `fulfillmentTrackingInfoUpdate` aussieht, ist ungesehen (Shopify-Standardvorlage).
- Die Sendungsnummer von CJPacket (`EQKPT…`) führt zu 17track; ab Zustellung im Inland gibt CJ zusätzlich die Nummer der Schweizer Post (`lastTrackNumber`) an: wird nicht übertragen.
- Shopify-API 2026-01 läuft laut Prüfer bis ca. 16.01.2027 (Wiedervorlage Dezember 2026, wie bei `printful_tracking`).
- Stornierte Shopify-Bestellungen mit laufendem CJ-Auftrag (kostet Geld) werden noch nicht gemeldet.
