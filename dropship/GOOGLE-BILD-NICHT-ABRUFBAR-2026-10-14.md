# Google «Unable to show image»: 126 Produkte ohne Gratis-Eintrag (14.10.2026)

Verbesserungsrunde 08:26 UTC. Klasse aus `dropship/GOOGLE-FEEDBACK.md`, Zeile «Unable to show image in [Free_listings,Shopping_ads] [CH,LI]».

## GEMESSEN
- **Verlauf** (git-Geschichte von `_google_feedback_stand.json`): 1–5 Produkte bis 09.10. 11:44 UTC, dann **109 am 10.10. 07:08**,
  110 · 107 · 113 · 137, heute **126**. Alle 126 sind Free-Listings-Blocker. Keines stand vorher in «Image under review».
- **Drei Gruppen nach Erstmeldung:**
  - **10.10.: 87 Produkte.** CJ-Mode und -Schuhe vom August, 84 davon mit `rueckhol-0907`. Das Hauptbild wurde seit dem 22.08. nicht verändert.
  - **12.10.: 7 Produkte**, Neuimporte vom 06./07.10.
  - **13.10.: 32 Produkte**, Neuimporte vom 11./12.10.
- **Die Bilder sind in Ordnung.** Alle 126 Hauptbilder als `Googlebot-Image` abgerufen:
  - 126/126 HTTP 200, 123 JPEG + 3 PNG
  - 0,16–6,3 MP, 13–676 KB, alle `READY`
  - Damit fallen Format, Grösse, Speicherort und Variantenbild als Ursache weg.
- **Heilung allein ist langsam:** 154 Produkte waren seit dem 08.10. irgendwann gemeldet, 28 sind wieder sauber.
  Die 87 vom 10.10. hängen seit 4 Tagen fest.
- **QUELLE** Google Merchant Center Help [12159032](https://support.google.com/merchants/answer/12159032?hl=en):
  - «We haven't yet been able to successfully retrieve the image»
  - Mögliche Gründe: Crawl-Rate zu langsam, Bild noch nicht live oder kürzlich geändert, falsche HTTP-Kopfzeilen, robots.txt
  - Neuabruf meist ≤ 72 h, aber «up to 30 days», bei unveränderter Adresse bis 6 Wochen
  - «use a new image URL … helps our systems … crawl the new image quickly»
- **Probe (strand-sandalen-608900, 08:42 UTC):** Die Bilddatei wurde per `fileUpdate filename` umbenannt.
  - Am Produkt steht sofort die neue Adresse (`…-g1014.jpg?v=1791967359`), HTTP 200.
  - `updatedAt` des Produkts ist neu, damit schickt die App «Google & YouTube» die Änderung.
  - Die alte Adresse ohne `?v=` liefert 404. Mit dem alten `?v=` liefert sie der CDN-Zwischenspeicher noch.
- **BEHAUPTUNG (zeitlich passend, nicht belegt):** Der Markt «Switzerland» bekam am 09.10. 22:40 UTC Liechtenstein dazu.
  Die App hat danach alle Angebote neu gemeldet. Der Sprung kam im ersten Stand danach.
  Bei so vielen Abrufen auf einmal ist ein kleiner Ausfallanteil (87 von ~54'000) als «Crawl-Rate zu langsam» plausibel.

## GETAN
- **Werkzeug + Wächter `automation/google_bild_abruf.py`.** Täglich im Aufseher (`SCHARF=1`), direkt nach `google_feedback_wache`. Ablauf:
  1. Liest die Klasse aus dem Diagnose-Stand. Ist der Stand unvollständig oder älter als 48 h, tut das Werkzeug nichts.
  2. Merkt sich die Erstmeldung je Produkt in `dropship/_google_bild_abruf_seit.json`. Beim ersten Lauf kommt sie aus der git-Geschichte.
  3. **Wartet 3 Tage** (Googles Normalfall ≤ 72 h). Jüngere Meldungen (heute 39 Neuimporte) fasst es nicht an.
  4. Ruft das Bild ab wie Googles Crawler (Kennung `Googlebot-Image`). Nicht abrufbar → **«Bild kaputt»** im Bericht (Fall für den Bildtausch).
  5. Abrufbar → die Bilddatei bekommt eine **neue Adresse** (gleiche Datei, Suffix `-gMMTT`, nie gestapelt).
     Das gilt für das Hauptbild und abweichende Variantenbilder, höchstens 20 je Produkt.
  6. Danach **21 Tage Ruhe**. Ist die Meldung dann noch da → **«Eskalation»**: das Bild selbst prüfen.
- **Schutz:**
  - nur ACTIVE
  - Werbetest-Sperre (`werbetest_sperre.gesperrt`)
  - Dateien, die in einer Social-Queue oder in der Beschreibung stehen, bleiben unverändert (dort würde die alte Adresse brechen).
    Heute traf das 1 Datei (`tech-hero-gift-box-smartwatch-pro-anc.jpg`).
  - CAP 150 je Lauf, Eimer-Etikette über `google_feedback_wache.gql`
  - Ledger `dropship/_google_bild_abruf.tsv` wird sofort je Produkt geschrieben
- **Lauf heute (08:48–09:00 UTC, scharf):** 85 Produkte neu adressiert + 1 Probe = **86 Produkte, 86 Dateien, 0 Fehler**.
  Nach dem Umbenennen ist jedes neue Hauptbild als `Googlebot-Image` abrufbar (86/86).
  - 39 warten (Erstmeldung < 3 T)
  - 1 übersprungen (`tech-hero-…`: Datei steht in einer Social-Queue)
  - 0 Bild kaputt
  - Stand: `dropship/GOOGLE-BILD-ABRUF.md`
- Selbsttest 16/16: Dateiname, Bildurteil, Entscheid warten/umbenennen/Ruhe/Eskalation/kaputt, Dateiauswahl.

## Regel
Meldet Google «Unable to show image» und das Bild ist für `Googlebot-Image` abrufbar, liegt der Fehler beim Abholen und nicht am Bild.
Nach 3 Tagen bekommt die Datei eine neue Adresse. Danach wird nicht erneut getauscht, bevor 21 Tage um sind.
Ein Bildtausch ist nur bei einem Bild angebracht, das wirklich nicht abrufbar ist.

## OFFEN
1. **Wirkung messen:** ab 15.10. sollen die 85 neu adressierten Produkte aus der Klasse fallen. Möglich ist ein Zwischenhalt in «Image under review».
   Prüfen in `GOOGLE-FEEDBACK.md` + `GOOGLE-BILD-ABRUF.md`. Fallen sie bis 21.10. nicht heraus, ist die These «neue Adresse = schneller» widerlegt.
   Dann bleibt nur Warten (≤ 30 T laut Google).
2. Die 39 Neuimporte (Erstmeldung 12./13.10.) fasst der Wächter ab 15./16.10. an, falls Google sie bis dahin nicht selbst abholt.
3. Ob Neuimporte gehäuft so starten, misst der Wächter mit: die Zahl «warten» je Tag.
