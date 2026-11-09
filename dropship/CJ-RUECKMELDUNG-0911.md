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

**Stand 09.11. 08:06 UTC:** CJ hat inzwischen auch #1035 und #1036 auf SHIPPED gesetzt, mit Sendungsnummer (spätestens 3,8 bzw. 3,6 Tage nach der Zahlung; der genaue Zeitpunkt des Wechsels ist nicht gemessen); #1034 und #1037 bis #1039 warten weiter im CJ-Lager.

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
- **Trockenlauf ist die Vorgabe.** Nur `DRY_RUN=0` (oder `false`, `no`, `nein`, `off`) schaltet das Schreiben frei; jeder andere Wert, auch `1`, `true`, leer und Unsinn, bleibt Trockenlauf. Im Workflow macht das die **Freigabedatei `dropship/CJ-TRACKING-FREI.txt`** (liegt seit 09.11., Besitzer-Ja «1 scharf»): ohne sie läuft nichts scharf. Steht das Wort «stumm» in der Datei, wird ohne Kundenmail gemeldet (`KUNDIN_MAILEN=0`).
- **Kundenmail nie nach der Zustellung:** CJ-Status DELIVERED wird still gemeldet.
- `fulfillmentCreate` und `fulfillmentTrackingInfoUpdate` werden **nie wiederholt** (eine Zeitüberschreitung kann «gelang» heissen = doppelte Mail); bei unbekanntem Ausgang kommt ein Alarm «erst in Shopify nachsehen».
- In die Kundenmail kommt nur ein Link auf `t.17track.net` (CJs eigener Link, englische Oberfläche → deutsch); jeder andere Link wird durch unseren eigenen ersetzt.
- Positionen an Fulfillment-Service-Standorten (Printful-App) und geschlossene Fulfillment-Orders (veraltete Restmenge, GEMESSEN an #1004) werden nie angefasst; Fortura- und Printful-Positionen einer gemischten Bestellung bleiben offen.
- Ist die CJ-Auftragsliste nicht lesbar, endet der Lauf mit Fehler und **ohne** «CJ-Auftrag fehlt»-Alarme (sonst gälten alle Bestellungen als unbestellt).
- `NUR=#1029,#1034` schränkt einen Lauf auf diese Bestellungen ein (Workflow-Eingabe `nur`): kontrollierter erster Einsatz.

## Gemessen

- **Echter Trockenlauf 09.11. gegen den Live-Shop und CJ** (nichts geschrieben): 7 Bestellungen zu prüfen, 7 bei CJ gelesen, **1 Nummer nachzutragen (#1029, CJPacket EQKPT8613206759YQ)**, 6 warten (#1034 bis #1039 im CJ-Lager), 0 Befunde, 11 übersprungen (Fortura/Printful oder schon vollständig), 0 Fehler. Die Suche `fulfillment_status:shipped` findet die von Hand versendeten Bestellungen (#1029 erschien).
- **Derselbe Trockenlauf in GitHub Actions** (Handstart 09.11. 06:46 UTC, Lauf 4 auf `main`, Jobs `tests` und `rueckmeldung` grün, 45 s): CJ-, Shopify- und Telegram-Zugangsdaten kommen dort an; der Plan entsprach dem lokalen, dazu **#1035** (bei CJ inzwischen SHIPPED, EQKPT8613288739YQ). Bis 08:06 UTC kam **#1036** dazu (EQKPT8613290784YQ).
- Die Shopify-Abfrage (10 Bestellungen je Seite, verschachtelte Fulfillment-Orders) läuft gegen den echten Shop im Kostenrahmen; beide Schreib-Mutationen sind gegen das Admin-Schema geprüft (`fulfillmentTrackingInfoUpdate(fulfillmentId, trackingInfoInput, notifyCustomer)`, `FulfillmentInput.trackingInfo`).
- Test 141 Prüfungen (Node 20 und 22), Mutationsprobe **69 von 70 erkannt**; der eine ist gleichwertig: `planCj` liefert nie «fertig» zugleich mit einem Befund, die Zusatzabfrage im Runner ist eine zweite Sicherung. Die erste Fassung des Tests liess zwei Mutanten durch (geschlossene Fulfillment-Order ohne «kein Alarm» geprüft); behoben. Alle Zeiten im Test sind relativ zu «jetzt» (kein fester Stichtag). In CI läuft die Mutationsprobe in rund 6 Minuten (Limit des Jobs 12).
- **CJ-Zeitstempel sind UTC (vorher Annahme, jetzt belegt):** die SD-Nummer eines CJ-Auftrags trägt die Anlegezeit und stimmt mit `createDate` überein (LX1035: `SD2611051141…` gegen `createDate 2026-11-05 11:41:09`; die Shopify-Bestellung kam 11:38 UTC). Ereignisse auf dem Weg in China tragen Peking-Zeit (UTC+8): dasselbe «Shipping Label Created» steht als 11:48:10 und als 19:48:10.
- **Erster scharfer Lauf 09.11. 08:06 UTC** (Besitzer «1 scharf»; lokal aus der Sitzung mit `DRY_RUN=0 KUNDIN_MAILEN=1 NUR=#1029,#1035`, 8 Sekunden, Exit 0, 0 Fehler): **#1035** Lieferung angelegt (Status SUCCESS, Bestellung FULFILLED, CJPacket, Nummer EQKPT8613288739YQ, Link `https://t.17track.net/de#nums=EQKPT8613288739YQ`, Tag `cj-shipped`); **#1029** Nummer EQKPT8613206759YQ samt Link in die bestehende Lieferung vom 03.11. nachgetragen (Tag `cj-shipped`). **Frisch aus Shopify nachgelesen** (`orders` mit `fulfillments`, `tags`, `events`): Lieferungen und Nummern wie gemeldet; das Ereignisprotokoll der Bestellungen nennt «sent a shipping confirmation email» (#1035) und «sent a shipping update email» (#1029), je eine Mail, beide von der App «autopilot2». **#1036** (zu dem Zeitpunkt schon bei CJ versendet) blieb unberührt: UNFULFILLED, ohne Tag, weil die Eingabe `NUR` den Lauf begrenzt; sie ist dem Tageslauf überlassen.

## Schalter (Stand 09.11.: scharf)

- Die Datei `dropship/CJ-TRACKING-FREI.txt` liegt seit 09.11. (Besitzer-Ja «1 scharf»). Der Tageslauf 16:11 UTC (GitHub startet hier oft Stunden später) und jeder Handstart arbeiten damit scharf und lösen die Shopify-Versandmail aus.
- **Ohne Kundenmail** (nur Status und Nummer in Shopify): das Wort «stumm» in die Datei schreiben. Der Workflow sucht das Wort mit `grep -i stumm`: es darf deshalb sonst NIRGENDS im Text der Datei vorkommen (auch nicht als Teil eines Wortes), sonst würde die Mail still abgeschaltet.
- **Einzelne Bestellungen:** Handstart «CJ-Rückmeldung» mit der Eingabe `nur` (z. B. `#1036`); `trockenlauf` erzwingt einen Trockenlauf auch bei vorhandener Datei.
- **Zurücknehmen:** Datei löschen = Trockenlauf. Eine bereits gesendete Kundenmail lässt sich nicht zurückholen; eine falsche Lieferung im Shopify-Admin stornieren. Tags `cj-shipped` und `cj-problem*` sind nur Marken und lassen sich jederzeit entfernen (die Bestellung wird dann wieder gelesen).

## Offen / ungemessen

- Das Aussehen der beiden Shopify-Mails (Standardvorlagen «Versandbestätigung» und «Sendungsnummer aktualisiert»): nicht gesehen, belegt ist nur ihr Versand (Ereignisprotokoll).
- Der erste Lauf des Zeitplans mit Freigabedatei und die Meldung der weiteren versendeten Bestellungen (#1036 und die nächsten).
- Ob 17track die Nummer von CJPacket (`EQKPT…`) sofort mit Ereignissen zeigt (der Link ist nicht geöffnet): CJ führt die Route «Shipping Label Created» bis zum ersten Scan in China; ab Zustellung im Inland gibt CJ zusätzlich die Nummer der Schweizer Post (`lastTrackNumber`) an: sie wird nicht übertragen.
- Shopify-API 2026-01 läuft laut Prüfer bis ca. 16.01.2027 (Wiedervorlage Dezember 2026, wie bei `printful_tracking`).
- Stornierte Shopify-Bestellungen mit laufendem CJ-Auftrag (kostet Geld) werden noch nicht gemeldet.
- **Datenschutz beim Nachlesen:** das Ereignisprotokoll (`Order.events`) enthält Namen und Mailadressen der Kundschaft. Beim Prüfen filtern; nie in Protokolle, Doku oder Gedächtnis übernehmen.
