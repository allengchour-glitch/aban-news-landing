# Mobilfunkgeräte nur 2G/3G aus dem Verkauf (10.10.2026, «weiter»)

## Gemessen

- **Anlass:** Beim Bau der Kollektion «GPS-Tracker» («gps tracker» 3'600 Suchen/Mt) nannten 5 Tracker im eigenen Text nur GSM/GPRS.
- **Netze in der Schweiz** (QUELLE, Websuche 10.10.):
  - 2G ist bei allen drei Anbietern abgeschaltet: Swisscom bis Mitte April 2022, Salt Anfang 2022, Sunrise am 03.01.2023.
  - 3G folgt 2025/2026.
  - Betroffen sind laut den Anbietern unter anderem «günstige Ortungsgeräte».
  - Quellen: [teltarif](https://www.teltarif.de/arch/2023/kw04/s90706.html), [itreseller](https://www.itreseller.ch/Artikel/96662/Sunrise_macht_Schluss_mit_2G.html), [IamExpat](https://www.iamexpat.ch/expat-info/swiss-expat-news/switzerland-phase-out-2g-mobile-network-3g-shutdown-set-2026).
- **Folge:** Ein 2G-Tracker ortet hier nichts. Eine 2G-Kinderuhr setzt keinen Notruf ab.
- **Kandidaten** (Voll-Export 10.10. 06:39): **173** aktive Produkte, deren Titel ein SIM-fähiges Gerät nennt (Tracker, Kinder-/Senioren-Uhr, GSM-Alarm …). Liste: `dropship/_klassen/mobilfunk-kandidaten.txt`.
- **Eigener Text allein** (GEMESSEN):
  - 6 Geräte nennen eindeutig nur 2G, zum Beispiel «GSM+GPRS 4-Frequenz-System (850/900/1800/1900MHz)» oder «unterstützt 2G-Netzwerke von Mobile und Unicom».
  - 167 nennen kein Netz. Sie brauchen die CJ-Angaben.
- **CJ-Tagesbudget:** Um 10:35 UTC waren noch 37 Punkte übrig, eine Abfrage kostet 10. Die CJ-Prüfung läuft deshalb nach dem Reset (00:00 UTC).

## Getan

- **Regel `automation/data/mobilfunk_netz_regel.json`** (14 Kanarien):
  - 4G/LTE/FDD/TDD/Cat-M/NB-IoT schlägt GSM. Abwärtskompatible Geräte sind also in Ordnung.
  - «2.4G»/«5G» als WLAN-Frequenz zählt nicht.
  - WLAN-Alarmanlagen und Erwachsenen-Smartwatches mit Bluetooth-Telefonie gelten als «teilweise» (melden statt draften).
- **Werkzeug `automation/mobilfunk_netz_pruefen.py`:** Es liest den eigenen Text und CJ (Name, Beschreibung, Varianten).
  - `nur-2g-3g` → Entwurf + Tag `mobilfunk-nur-2g-3g`.
  - `4g`/`bluetooth` mit CJ-Beleg → Tag `netz-geprueft`.
  - CJ führt eine 2G- und eine 4G-Version, unsere SKU gilt aber für das ganze Produkt → melden.
  - Ohne CJ-Antwort gibt es nie «in Ordnung».
- **Sofort als Entwurf** (Ledger `dropship/_mobilfunk_netz.tsv`):
  - GPS Mini-Tracker für Auto, Kinder & Senioren (GSM)
  - GPS Tracker für Haustiere (GSM)
  - Wasserdichte Kinder Smartwatch mit GPS (2G)
  - Mini GPS Tracker für Fahrzeuge (GSM)
  - GPS-Locator mit 90-Tage-Batterie (GSM)
  - Kinder-Tracker mit GPS (GSM)
  - Eine «GPS-Telefonuhr» stand zuerst auf der Liste. Sie nennt aber «FDD-Bänder B1/B3/B20» = LTE. Die Regel kennt jetzt FDD/TDD, die Uhr bleibt.
- **Importer:** `mobilfunk.mjs` liest dieselbe Regel (JS-Kanarien 14/14, Kandidaten py=js 193/193).
  - `cj_category_fill` und `cj_trending_import` überspringen nur-2G-Geräte vor dem Anlegen.
  - `cj_sku_import` stellt sie auf Entwurf.
- **Aufseher:**
  - Nachtlauf 00:10 UTC über die Kandidatenliste. Geprüftes steht im Ledger und wird übersprungen.
  - Täglich ab 02 UTC die Neuimporte der letzten 3 Tage.
  - `cj_takt`: `mobilfunk_netz` darf wie die Bestell-Wächter vor dem Vorrang-Skript (Kundenschutz).
- **Kollektion «GPS-Tracker & Ortungsgeräte»** (`/collections/gps-tracker`):
  - Regel: Tag `such-gps-tracker` UND `netz-geprueft`. 61 Tracker tragen den ersten Tag.
  - Die Kollektion füllt sich erst mit dem CJ-Beleg und wird erst dann veröffentlicht (leere Seite = dünne Seite für Google).
  - Der Text sagt offen: «Tracker, die nur 2G können, haben wir aus dem Sortiment genommen.»

## Offen

- **Nachtlauf 11.10. ~00:10 UTC:** Urteile für 167 Geräte, Bericht `dropship/MOBILFUNK-NETZ-STAND.md`. Danach prüfen:
  - «varianten»: 2G- und 4G-Version bei CJ → auf die 4G-SKU umstellen oder Entwurf.
  - «unklar-sim»: SIM ohne Netzangabe → bei CJ nachfragen oder Entwurf.
  - «teilweise-2g»: Text ehrlich machen (SIM-Funktion in CH ohne Netz).
- **Kinder-Smartwatches** (~30 Titel) stehen nicht in der GPS-Kollektion (Ausschluss «watch»). Nach dem Nachtlauf ist eine eigene Kollektion nur mit 4G-Uhren ein Kandidat.
- **3G:** Geräte mit «WCDMA» ohne LTE gelten schon jetzt als nicht lieferbar. Sobald 3G überall aus ist, braucht es keinen Sonderfall.
