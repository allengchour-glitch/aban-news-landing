# Auftrag an ChatGPT (28.10.2026): Zugang, den Claude nicht hat, und eine unabhängige Zweitmeinung

Auftraggeber: Besitzer von LuxeStyle CH (Shop `au3j0y-hq.myshopify.com`, luxestyle.ch). Grund: ChatGPT hat die Konnektoren verbunden (Merchant Center, Google Ads und andere), Claude hat dort **keinen** Zugang. Claude arbeitet im Repo und im Shop; was im Merchant Center steht, sieht nur ihr.

Marken: **GEMESSEN** = selbst am Shop/Repo oder am Bildschirm nachgeprüft · **QUELLE** = fremde Angabe mit Fundstelle · **BEHAUPTUNG** = ungeprüft · **unbekannt** = nicht gemessen (kein Befund, keine Freigabe).

## Feste Regeln

1. **Nur lesen.** In keinem Konnektor etwas ändern, löschen, abschicken, bezahlen, freigeben oder beantragen (kein «Review beantragen», keine Kampagne, kein Budget). Keine Nachricht an Kunden oder Lieferanten.
2. Jede Zahl mit **Fundstelle und Uhrzeit** (Bildschirm, Menüpfad, Zeitpunkt der letzten Aktualisierung). Was du nicht sehen kannst: «unbekannt», nicht schätzen.
3. Keine Zugangsdaten, Schlüssel oder Kundendaten in die Antwort.
4. Antwort als Tabelle im Chat **oder** als Datei `dropship/CHATGPT-ANTWORT-2810.md` auf dem Branch `codex/chatgpt-antwort-20261028` (Draft-PR nach `main`, nie direkt auf `main`, nie den Branch eines Claude-PRs anfassen).

## Was heute passiert ist (damit du die Zahlen deuten kannst)

- Das Merchant Center meldete am 28.10.2026 um 13:21 (Ortszeit, **vor** dem Eingriff): «Over capacity for Shopping ads (in CSS program)» **136K Produkte (61.7 %)** und «Shopping ads quota limit reached (outside of CSS program)» **132K Produkte (59.6 %)**. QUELLE: Screenshot des Besitzers.
- Ursache laut Google-Hilfe (QUELLE `support.google.com/merchants/answer/16564100`): höchstens 150 000 Artikel je Bereich, ein Artikel ist eine Variante. GEMESSEN am Shop: auf dem Verkaufskanal «Google & YouTube» lagen 54 745 Produkte mit **514 931 Varianten**.
- Gegenmassnahme (von Claude, mit Freigabe des Besitzers): ein «Schaufenster» nimmt Produkte ausserhalb einer Auswahl vom Kanal (`automation/gmc_schaufenster.mjs`, Doku `dropship/GMC-SCHAUFENSTER-2810.md`). Ziel: rund **84 000 Varianten** auf dem Kanal. Start des vollen Laufs 28.10.2026 ca. 19:36 UTC, Ende erwartet ca. 22:00 UTC. Bis dahin sind die Zahlen im Merchant Center noch alt: Google braucht Stunden bis Tage, bis es neu zählt.

## Teil A: Hilfe mit euerem Zugang (nur lesen)

**A1. Merchant Center, Konto «LuxeStyle CH» (5797470070).** Jetzt lesen und **am 30.10.2026 noch einmal**; beide Stände nebeneinander in einer Tabelle.
1. *Produkte → Alle Produkte*: Zahl der Artikel gesamt und nach Status (aktiv, eingeschränkt, abgelehnt), Land Schweiz. Wie viele davon «Shopping-Anzeigen»?
2. *Needs attention → Prioritized fixes*: die beiden Karten oben mit **Zahl und Prozent**. Stehen sie noch da? Wann steht «Last updated»?
3. *Store quality → Get details* beim Wert **«Images per item»** (Google zeigt «Incomplete») und bei «High resolution images»: genauer Wert, Vergleichswert/Benchmark, Beispielartikel, wann zuletzt aktualisiert, und ob Google eine Schwelle nennt (z. B. Mindestzahl Bilder). Offiziell steht nur: «Images per item: Information obtained from your website on the average number of images per item» (QUELLE `support.google.com/merchants/answer/14261098`).
4. *Produkte → Diagnose*: gibt es noch weitere Probleme ausser «Personalized advertising: personal hardships» (79 Produkte, nur Verkehrsart «Dynamic remarketing», GEMESSEN aus dem CSV-Export des Besitzers 13:37) und den beiden Mengenproblemen? Liste mit Zahl je Problem.

**A2. Google Ads (nur ansehen).** Kontostand (der Besitzer nennt CHF 58), gibt es aktive Kampagnen oder Remarketing-Listen, ist das Conversion-Tracking für Käufe aktiv und welche Käufe zählt es? Nichts anlegen.

## Teil B: Zweitmeinung (unabhängig und kritisch; widerlege, wo du kannst)

Lies die genannten Dateien im Repo `allengchour-glitch/aban-news-landing` (GitHub-Konnektor, nur lesen). Für jede Frage: deine Antwort, Gegenargumente, und was du **nicht** beurteilen kannst.

**B1. «Images per item: Incomplete».** GEMESSEN heute (14 Produktseiten, Googlebot-Kennung): Median 7 Bilder je Produkt im Shop (70 % haben 6 oder mehr, 2,2 % nur eines), aber das **JSON-LD** der Seite nennt je Artikel **höchstens ein Bild** (`image` ist ein einzelner String oder fehlt), `og:image` überall genau eines; das HTML trägt alle Galeriebilder. Ausnahme Fortura-Produkte: 37 % mit nur einem Bild. Hypothese (**BEHAUPTUNG**): Google liest die Zahl aus den strukturierten Daten. Fragen: Gibt es eine Google-Quelle, die sagt, woraus «Images per item» gemessen wird? Wäre ein `image`-Array mit mehreren Bildern der richtige Hebel? Welche Risiken hat die Änderung? (Das Theme liegt nicht im Repo; geändert würde nur im Entwurf-Theme.)

**B2. Hoodie, der ein Sweatshirt ist.** `dropship/pod-auswahl/README.md`, Abschnitt «Blocker-Befunde»: die vorhandenen SKUs `1726823_5426–5433` des Produkts «Unisex Hoodie selbst gestalten» sind bei Printful das **Rundhals-Sweatshirt** (Produkt 145, Gildan 18000), nicht der Hoodie (146, Gildan 18500). Optionen: (1) Material ehrlich «Sweatshirt (Rundhals)» nennen und SKUs lassen, (2) SKUs auf den echten Hoodie umstellen (Preis steigt), (3) zwei Produkte. Welche Option ist nach Schweizer Recht (UWG, Irreführung) und im Alltag die sicherste, und in welcher Reihenfolge? Ob schon Bestellungen mit diesen SKUs geliefert wurden, ist **unbekannt**.

**B3. Tägliches Schaufenster.** Lies `.github/workflows/gmc-schaufenster.yml`, `automation/gmc_schaufenster.mjs`, `automation/lib/gmc_schaufenster.mjs`. Der Zeitplan prüft nachts nur; schreiben darf er erst mit einer zweiten Freigabedatei (der Besitzer hat die Dauerfreigabe am 28.10.2026 mit «dauerfreigabe ja» erteilt). Was kann hier **Umsatz kosten oder den Shop beschädigen**? Eine frühere Zweitmeinung (Codex) fand zwei echte Fehler (Manifest-Commit ohne Fehlerliste, Freigabe nur beim Start geprüft); beide sind behoben. Suche darüber hinaus.

**B4. Material-Auswahl «Selbst gestalten».** Fünf Entscheide stehen an (Hoodie-Sweatshirt, doppelte Materialien in Einzelprodukten, Material-Metafeld leeren, MagSafe-Text beim iPhone, Variantentitel ändern sich). Claude empfiehlt jeweils die vorsichtige Variante. Siehe `dropship/pod-auswahl/README.md`, Abschnitte «Blocker-Befunde» und «Offen». Wo liegt die Empfehlung falsch oder fehlt etwas?

## Was zurückkommen soll

Eine Tabelle «Frage | Antwort | Beleg (Fundstelle, Uhrzeit) | Marke», danach höchstens fünf Zeilen «was Claude als Nächstes tun sollte». Teil A zweimal (jetzt und 30.10.).
