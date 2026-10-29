# Plan: Lederhüllen, Handy-Kategorien und Startseite nach dem Vorbild meyerhaessig.ch (29.10.2026)

Anlass: Besitzer-Chat 29.10.2026: «meyerhaessig.ch … sieht cool aus … kannst du unser auch so krass machen und auch handyhüllen aus leder in jeder form, farbe und typ … und dann auch separate gute kategorien machen».
Marken: **GEMESSEN** = hier selbst gelesen/gezählt (29.10.2026, nur lesend) · **QUELLE** = fremde Angabe · **BEHAUPTUNG** · **SETZUNG** · **unbekannt**.
Nichts ist live, nichts angelegt: Shop, CJ-Konto und Theme wurden nicht verändert. Quelle der Zahlen: Workflow `handyhuellen-leder-plan` (3 lesende Prüfer, 126 Werkzeugaufrufe).

## 1. Was meyerhaessig.ch macht (GEMESSEN per Firecrawl, nur Aufbau, keine Texte oder Fotos übernommen)
Enge Marke: iPhone Case, MagSafe Wallet, Card Wallet, Apple Watch Band, AirPods Case, Panzerglas, in zwei Materialien (Alcantara, Echtleder). Menü nach Serie (iPhone 18/17/16/15) und darunter eine Sammlung je Modell. Startseite: Hero «Zwei Materialien, ein Anspruch», nur 8 Produkte, Block «Aufeinander abgestimmt» (gleiche Farbe über alle Teile), Alltagsfotos, Material-Erklärblöcke, Vertrauensleiste, Kundenstimmen, 10-Prozent-Anmeldung. **Ob die Seite Videos hat, ist nicht belegt.** Ihre Zusagen (Versand aus der Schweiz, 2 Jahre Garantie) gelten für uns NICHT.

## 2. Unser Stand (GEMESSEN 29.10.2026)
- Katalog 56 620 aktive Produkte (vollständig gelesen). **Handyhüllen: 15 (16 mit Grenzfall), davon 0 aus Leder oder Kunstleder.** 18 Artikel mit «Leder» und Telefonbezug sind Taschen, Portemonnaies, Halter, Armbänder, keine Hüllen.
- Modelle: iPhone 7 Hüllen, Samsung 1, OnePlus 1, Pixel 0, Huawei 0, Xiaomi 0. Nur die drei Printful-Produkte («Selbst gestalten») haben saubere Optionen Handymodell (iPhone 14 bis 17, Galaxy S20 bis S26). Bei 12 von 15 CJ-Hüllen steht Modell und Farbe vermischt im Wert «Farbe» (30 bis 98 Mischwerte, teils englisch).
- Sammlung `handy-huellen` zeigt 29 Produkte, davon nur 15 Hüllen (14 Fremdkörper: Headset-, iPad-, Watch-, AirPods-Hüllen, Taschen).
- Die acht geplanten Handy-Kategorien aus `dropship/taxonomie-2610-b/bereiche/handy.json` sind NICHT live (alle HTML 404).
- Startseite (live): Hero mit Video (2 MP4), Vertrauensleiste, Willkommen mit 12 Kategorie-Pillen, 15 Produktreihen à 16 Karten, Kundenstimmen, Video-Zeile mit 8 TikTok/YouTube-Karten ganz unten, Druck-Bereich, Newsletter. Kein Handy-Block. Das Live-Theme ist MAIN 212656488839; der Entwurf 212498841991 ist **älter** als MAIN (nicht darauf aufbauen, per `themeDuplicate` aus MAIN neu ziehen und `lux_spotlight_video` übernehmen).

## 3. Lederhüllen bei CJ (GEMESSEN, 57 CJ-Aufrufe, rund 830 Punkte)
31 Produkte im Detail gelesen: **10 mit Echtleder-Beleg im Datenblatt**, 3 nur mittel/schwach, 4 «Leder» nur im Titel (nicht belegt), 6 Kunstleder trotz Leder-Titel, 5 Kunststoff/unklar. Messgerät (Material-Urteil nur aus dem Datenblatt) in beide Richtungen geprüft. Keine Hülle hat ein CJ-Video.

| pid | Einkauf (USD) | Typ | Modelle | Farben |
|---|---|---|---|---|
| 2512220337381618500 | 6.97 | Hartschale, «magnetisch» (MagSafe unbelegt) | iPhone 16 bis 17 Pro Max, Air (9) | 8 |
| 2609140923131617900 | 6.51 | Hartschale, Krokoprägung | iPhone 12 bis 18 Pro Max (19) | 4 |
| 2510240609421642700 | 6.63 | Hartschale mit Aufsteller, magnetisch | iPhone 13 Pro bis 17 Pro Max (12) | 4 |
| 2605140628331613000 | 10.75 | Klapphülle | iPhone 17 bis 5 (28, Liste fehlerhaft) | 3 |
| 2606050228301636700 | 10.91 | Klapphülle, Straussenprägung | iPhone 13 bis 17 Pro Max (22) | 4 |
| 2509080931351627900 | 6.47 | Klapphülle mit Kartenfach (Samsung) | Galaxy S21 bis S25 Ultra (15) | 6 |
| 2501071114291609500 | 6.30 | Hartschale Litschi (Samsung) | Galaxy S20 bis S25 Ultra (14) | 6 |
| 1532990619755491328 | 4.05 bis 4.40 | Hartschale einfarbig | iPhone 12 und 13 (8) | 9 |

Lücken: **Pixel: 0 Echtleder**; **echtes MagSafe-Echtleder: 0 belegt**; Wallet-Hülle für iPhone 17: 0; iPhone 18: ein Treffer (Krokoprägung), ob das Basismodell am Markt ist: unbekannt.
Lieferung nach CH: alle zehn geprüften lieferbar. Die vier Treffer mit Magnet-Flag haben nur Sonderlinien (Sensitive, 5 bis 10 Tage, 5.5 bis 6.9 USD) oder 12 bis 50 Tage Postal; die Treffer ohne Magnet-Flag haben 16 Linien, 5 bis 10 Tage. Nach Repo-Regel (nur normale Linien bis 20 Tage) bräuchte die Sonderlinie eine ausdrückliche Freigabe des Besitzers.

## 4. Risiken (nicht wegzureden)
1. **Echtleder ist nur eine Lieferantenangabe.** 4 bis 11 USD Einkauf für Echtleder ist auffällig billig (Marktwissen, nicht gemessen). «Echtleder» im Shop erst nach Musterprüfung (Geruch, Schnittkante, Brenntest). «Rindsleder»/«Vollnarbenleder» nie behaupten («first layer cowhide» klingt nach Spaltleder).
2. **Titelfallen:** sechs Treffer heissen Leather/Sheepskin und sind laut Datenblatt Kunstleder. Lieferantenwörter («Denior», «Chanel-inspired», «Compatible with Apple») raus.
3. **MagSafe** nur bei belegten Magneten; Funktionstest nötig.
4. **Passform:** Modelllisten sind teils falsch («17 Plus» gibt es nicht); je Modell Muster oder nur Pro/Pro-Max-Linien.
5. **Rückgaben bei Lieferung aus China:** Rücksendung selten wirtschaftlich; Rückgabetext und Preis entscheidet der Besitzer.
6. **Wahrheitsbefund Garantie-Seite:** `/pages/garantie` sagt in der Meta-/OG-Beschreibung «30 Tage Geld zurück und 12 Monate Herstellergarantie auf Elektronik», im Seitentext «Eine separate Herstellergarantie gibt es bei Dropship-Ware nicht». Widerspruch, Google sieht die falsche Zeile. Korrektur zugunsten des Seitentextes steht aus.
7. **Variantenlimit:** Shopify erlaubt rund 9 500 neue Varianten am Tag (GEMESSEN 26.10.), geteilt mit dem Auswahl-Lauf. Sieben Produkte à 50 bis 90 Varianten sind etwa 500 Varianten und passen.

## 5. Kategorienbaum (Entwurf, nichts angelegt)
Aufbau auf `handy.json` (`handyhuellen-displayschutz` als Kopf) mit neuer Bereichsdatei `bereiche/handyhuellen.json`, Präfix `hh-`, Tags `sort-…`, Mindestgrösse 15 (Chips ab 18), Gruppen als Menüköpfe, Menü höchstens 3 Ebenen. Alle Handles am 29.10. als frei gemessen.
- **Handyhüllen** (Kopf, `handyhuellen-displayschutz`, Bestand rund 19: Stufe 1)
  - iPhone-Hüllen: iPhone 17-Serie inkl. Air, 16, 15, 14, 13 und älter (Modelle Pro Max/Pro/Plus als Chips)
  - Samsung-Hüllen: Galaxy S26/S25, S24 und älter
  - Pixel und weitere Marken
  - Nach Material: Echtleder, Kunstleder, Silikon/TPU, Transparent, Textil
  - Nach Typ: Hartschale, Klapphülle/Wallet, MagSafe, mit Umhängeband
  - Zubehör: Kartenhalter/MagSafe-Wallet, Straps, AirPods-Hüllen, Panzerglas
- **Farbe ist keine Kategorie** (Seitenexplosion), sondern Variante und Filter. Modell nur als Serie-Blatt und Chip.
- Die Serie-/Modell-Zuordnung geht NICHT über den Titel (CJ-Titel sagen nur «für iPhone»), sondern über Modell-Tags aus den Variantenwerten (neues Skript `modell_tags.mjs`; die Regelsprache kennt keine Varianten).
- Bestand reicht nur für den Kopf. Für 4 bis 5 Material-Blätter à 15 braucht es rund 60 bis 75 neue Produkte (SETZUNG); die Lederhüllen oben sind der Anfang.
- Fallen: Handytaschen sind keine Hüllen; «Pixel» trifft Velotaschen; «Case» trifft Lade-Case; `products.json` liefert für unbekannte Handles HTTP 200 mit 0 Produkten (Existenz nur über den HTML-Status).

## 6. Layout (Entwurf-Theme, geordnet nach Wirkung zu Aufwand)
1. Frischen Entwurf per `themeDuplicate` aus MAIN ziehen; Ankündigung «Neu: Hüllen für iPhone 17 und Galaxy S26 mit deinem Motiv gestalten» (wahr, steht im Printful-Produkt).
2. Wahrheit zuerst: Garantie-Meta korrigieren, Vertrauensleiste auf belegte Punkte (Gratis-Versand ab CHF 50 nach Rabatt, Klarna, 30 Tage Rückgabe).
3. Video-Streifen nach oben und inline abspielbar (`lux_spotlight_video`, lazy, Poster); eigene Hüllen-Clips sind separate Arbeit (CJ hat keine).
4. Startseite von 15 Produktreihen auf rund 8 kuratierte verdichten (Besitzerentscheid, SEO-Wirkung ungemessen).
5. Option «Handymodell» und «Farbe» trennen, danach Wähler «Passende Hülle finden».
6. Neuer Menükopf «Handyhüllen» mit Mega-Menü (das Hauptmenü hat schon 18 Köpfe; Platz entscheidet der Besitzer).
7. Material-Hero und Erklärblöcke mit drei belegten Merkmalen: erst, wenn mindestens 15 Produkte mit Datenblatt-Beleg live sind.
8. «Passend dazu» (Hülle, Kartenhalter, Strap, AirPods) nach Farbtag, als Vorschlag, nicht als «abgestimmte Serie».
9. Alltagsfotos: nur aus Mustern oder Kundenfotos mit Einwilligung; keine CJ-Studiofotos als «Alltag».
10. **Bewusst nicht bauen:** Streichpreise ohne belegte frühere Preisstellung (721 Fake-Streichpreise wurden schon entfernt), «Versand aus der Schweiz», «2 Jahre Garantie», «Zwei Materialien, ein Anspruch».

## 7. Entscheide des Besitzers
1. **Muster bestellen?** Zwei bis drei Hüllen (Echtleder-Beleg prüfen, Passform, Magnet) bei CJ, 10 bis 12 Werktage, Kosten nach Hüllenpreis plus Fracht. Ohne Muster werden die Hüllen als «Leder (Lieferantenangabe)» NICHT verkauft.
2. **Sonderlinie (Sensitive, 5 bis 10 Tage) für Magnet-Hüllen freigeben?** Sonst nur die Hüllen ohne Magnet-Flag.
3. **Preislage und Rückgabetext** für Hüllen (Einkauf rund 6 bis 11 USD plus Fracht).
4. **Platz im Hauptmenü** für «Handyhüllen» (19. Kopf) und **Gewichtung der Startseite** (15 auf 8 Reihen).
5. **Videos:** wer macht sie (Muster filmen, KI-Clips)? Kein neuer Social-Write ohne Freigabe.

## 8. Reihenfolge, wenn der Besitzer «ja» sagt
A. Garantie-Meta und Vertrauensleiste korrigieren (klein, nur Wahrheit). B. Lederhüllen als DRAFT anlegen (Optionen Handymodell × Farbe, Titel nur mit belegtem Material, Lieferantenwörter raus, Bilder je Farbe HTTP-200-geprüft). C. Neuen Theme-Entwurf aus MAIN mit Ankündigung, Video-Streifen und Handy-Block. D. Bereichsdatei `handyhuellen.json` und `modell_tags.mjs` (Codex kann Skript und Tests bauen, Shop-Schreiben bleibt bei Claude). E. Kategorien, Gruppen, Menü nach dem Rucksack-Muster (Trockenlauf, Sicherung, Rücklesen, HTTP-Prüfung). Veröffentlichen (Theme, Produkte ACTIVE) ist ein Klick des Besitzers.
