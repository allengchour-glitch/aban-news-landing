# Merchant Center: Artikelprobleme (Export vom 08.11.2026 13:12, Besitzer-Upload)

**Quelle:** `product_issues_2026-11-08_13-12-14.csv` (Merchant Center → Produkte → Diagnose → «Probleme mit Artikeln», vom Besitzer hochgeladen, 14 220 Zeilen, 4,7 MB). Die zuerst per Drive geteilte Fassung vom 08.11. 07:46 (110 MB) liess sich über den Drive-Zugang nicht lesen (Grenze 10 MB), darum diese kleinere Fassung. **Der Export listet nur Artikel mit Problemen, nicht den ganzen Katalog.** Feed-Label `CHF_99383214465`, Kanal ONLINE, Länder Schweiz und Liechtenstein. «Artikel» = Variante (Item-ID `shopify_ZZ_<Produkt-ID>_<Variante-ID>`).

## Zahlen (GEMESSEN an der Datei)
| Problem | Varianten | Produkte | Land / Verkehr | Wirkung |
|---|---|---|---|---|
| **Over capacity for Shopping ads (in CSS program)** | 3 838 | 3 203 | Schweiz; Shopping-Anzeigen und dynamisches Remarketing | die Varianten dürfen nicht beworben werden; kostenlose Einträge nicht betroffen |
| **Missing shipping info in some countries** | 3 201 | 2 726 | Liechtenstein; Shopping-Anzeigen und kostenlose Einträge | in Liechtenstein nicht angezeigt; alle 3 201 sind auch «Over capacity» (3 201 von 3 838) |
| Personalized advertising: personal hardships | 15 | 13 | CH und LI; nur dynamisches Remarketing | Schwangerschaftsartikel (11), Tattoo-Stift (2), Teebaum-Gel (1), Capri-Leggings (1); Shopping-Anzeigen nicht betroffen |
| **Promotional overlay on image** | 5 | 5 | CH und LI; alle Kanäle | **die einzigen 5 wirklich abgelehnten Artikel** (`NOT_ELIGIBLE_OR_DISAPPROVED`) |
| Personalized advertising: Identity and belief | 1 | 1 | CH und LI; nur Remarketing | Sakyamuni-Buddha-Statue |
| Personalized advertising: Sexual interests / Restricted adult content | 1 | 1 | CH; nur Remarketing | Bauch- und Busen-Shaper (Schwarz / 5XL) |

**Status:** 3 833 von 3 838 Artikeln `ELIGIBLE_LIMITED` (laufen eingeschränkt weiter), **5 `NOT_ELIGIBLE_OR_DISAPPROVED`**. Alle Probleme tragen die Schwere «disapproved», meinen aber je Land und Verkehrsart nur den genannten Teil. Die «rund 1,3 % nicht genehmigten Schweizer Einträge» der Codex-Übergabe sind damit **kein Inhaltsfehler der Produkte, sondern zu 99,9 % die Kapazitätsgrenze** (3 838 Varianten); wirklich abgelehnt sind 5.

## Verlauf (frühere Exporte im Upload-Ordner)
- 28.10.: 195 Artikel, davon 115 «Over capacity (in CSS program)», 132 «Quota limit reached (outside of CSS program)», 195 «personal hardships» (andere Datenlage, ältere Zahl der Varianten auf Google).
- 01.11. 11:16: 1 510 «Missing shipping info» (nur Liechtenstein), 10 nicht genehmigt; 2 004 «Missing product price» (inzwischen weg).
- 08.11. 13:12: 3 838 «Over capacity (CSS)», 3 201 «Missing shipping info», nur noch 5 nicht genehmigt.

## Deutung und Hypothesen (nicht belegt)
- **Kapazität CSS-Länder:** das Google-Schaufenster hielt am 28.10. 84 027 und am 29.10. 85 817 Varianten auf dem Kanal «Google & YouTube» (GEMESSEN, `GMC-SCHAUFENSTER-2810.md`), die Standardgrenze laut Google-Hilfe ist 150 000 je Bereich. Dass trotzdem 3 838 Varianten «over capacity» sind, deutet auf eine **tiefere wirksame Grenze für Schweizer Shopping-Anzeigen** (Hypothese: rund 82 000 = 85 817 minus 3 838; nur eine Rechnung, keine Quelle). Verarbeitung im Merchant Center hinkt Stunden hinterher: der Export (13:12) kann den Schaufenster-Lauf von 08.11. 11:28 UTC noch nicht enthalten.
- **Warum nur Liechtenstein «Missing shipping»:** die Versandkosten Schweiz kommen offenbar an, die für Liechtenstein nicht (Shopify-Versandprofil hat Liechtenstein: CHF 14.90, kein Gratisversand; Merchant Center kennt keinen Dienst für LI). Die Länder DE/LI standen schon in der Codex-Übergabe als «Setup Incomplete».

## Empfehlungen (Entscheid des Besitzers; nichts davon ist geändert)
1. **Liechtenstein (3 201 Varianten):** entweder (a) im Merchant Center unter Einstellungen → Versand und Rückgabe einen Versanddienst für Liechtenstein anlegen (CHF 14.90, keine Gratisgrenze, Lieferzeit wie auf der Versandseite 15 bis 45 Tage, Bearbeitung 1 bis 3 Tage), oder (b) Liechtenstein in der App «Google & YouTube» aus den Zielländern nehmen (einfacher; Liechtenstein ist ein kleiner Markt, 1 Bestellung bisher). Standard bei Schweigen: bleibt, kostet nichts ausser den LI-Sichtbarkeiten.
2. **Kapazität (3 838 Varianten):** nur relevant, sobald Shopping-Anzeigen laufen (Google Ads: Besitzer hat noch CHF 58 unbenutzt, keine Kampagne). Vorschlag: `BUDGET` des Tages-Workflows `gmc-schaufenster.yml` von 90 000 auf etwa 78 000 senken, damit etwa 8 000 Varianten mehr vom Kanal gehen (die mit der niedrigsten Rangstufe der Regel); danach nach zwei Tagen den Export neu ziehen und die Zahl «Over capacity» erneut zählen. Standard: bleibt.
3. **5 Bildablehnungen (Werbetext auf dem Bild):** Bilder gesichtet (alle fünf tragen Beschriftung im Bild): Press-Lock-Schnürsenkel (Beige: «1 PAIR», «CHOOSE»-Band und Farbbalken auf **allen** Variantenbildern), LED-Wasserwellen-Projektionsleuchte (Variante 3 W-Set 8: Infotext-Kasten), Seal Eyeliner Doppelpack (Dunkelbraun: Beschriftung «#02 : dark brown»), Digitale Armbanduhr aus Holz (Grün: Uhrzeit «4:34» im Bild), Wasserfester Lippenstift (Orange 02: «OR02» im Bild). Ein Umbiegen der Variantenbilder auf saubere Hauptbilder ginge bei Lampe, Eyeliner, Uhr und Lippenstift (jeweils ein sauberes Produktbild ist da), nicht beim Schnürsenkel (alle Bilder beschriftet). Es würde das Variantenbild für Kundinnen verschlechtern (falsche Farbe) und betrifft nur 5 von rund 85 000 Varianten: **nicht geändert**, Entscheid beim Besitzer; die einfachste Lösung wäre, die fünf Produkte vom Google-Kanal zu nehmen (`ONLY=` im Schaufenster-Werkzeug).
4. **Personalisierte Werbung (17 Varianten, nur Remarketing):** wie am 28.10. entschieden nichts ändern; Shopping-Anzeigen sind nicht betroffen.

## Grenzen
- Der Export zeigt nur Artikel mit Problemen; wie viele Varianten insgesamt bei Google stehen, steht nicht darin.
- Die Zuordnung «Kapazitätsgrenze rund 82 000» ist eine Rechnung, kein Beleg; der Merchant-Center-Text nennt keine Zahl.
- Wirkung auf Verkäufe: unbekannt (bisher keine Shopping-Anzeigen).
