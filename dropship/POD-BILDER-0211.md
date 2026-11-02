# «Selbst gestalten»: Printful-Katalogfotos (2.11.2026)

Auftrag Besitzer: «schau ob es bilder fehlen, mache das auch rein bei jeder einzelnen produkt die gleichen bilder wie printful» und «das die leute auch beispiele sehen».

**GEMESSEN (2.11.):** Die 34 aktiven POD-Produkte laden, die Auswahl ist klickbar. Vorher hatten die meisten nur 1–2 Bilder.

**Geschrieben (LIVE):** 27 Produkte, 189 Printful-Katalogfotos (Modelle, Lifestyle, Flachbild; Quelle `files.cdn.printful.com`, Grösse `/medium/`) als zusätzliche Medien hinter den vorhandenen. Frisch gelesen: 238 Medien, 0 nicht `READY`; drei Seiten HTTP 200, Tassen-Seite per Screenshot geprüft. Ledger `dropship/pod-bilder-0211/ledger.json` (Wiederholung legt nichts doppelt an).
**Gefiltert:** Schnittmuster (`/templates/`), Weihnachts-/Halloween-/USA-Dekor, Grössentabellen.

**Nicht angefasst:** iPhone Hardcase, iPhone transparent, Samsung (Sets enthalten andere Modelle und Dekor, erst Sichtprüfung); Aufkleber, Bügeltransfer (kein Katalogbild gefunden).
**Offen:** Beispiele mit aufgelegtem Design (Printful v2 Mockup-Tasks), Bilder je Farbvariante, T-Shirt ohne Farbauswahl.
Unbekannt: Wirkung auf Verkäufe.

## Nachtrag (2.11.): Original-Galeriefotos von Printfuls Webseite statt eigener Mockups
Besitzer: «das bild sieht scheisse aus, nimm originale bilder wie printful». Die selbst erzeugten Mockups (Farbkreis-Beispieldesign) sind **wieder entfernt** (43 Medien, Alt-Text «– Beispiel mit Design»).
Stattdessen: die Galeriebilder der Printful-Produktseiten (Modelle, Lifestyle, Detail, mit fertigen Beispieldesigns; Dateien `variant-image*_l` auf `files.cdn.printful.com`), per Playwright von den öffentlichen Seiten gelesen, Seiten-Zuordnung in `pod-bilder-0211/map.json`.
**Live (GEMESSEN, frisch gelesen):** 25 Produkte, 117 neue Bilder, danach 335 Medien auf diesen Produkten, 0 nicht `READY`. Hoodie-Seite per Screenshot geprüft.
**Aussortiert (Sichtprüfung):** Verpackungsbild mit Text, Grafiken mit Symbol-Beschriftung, «Your logo here»-Etikett.
**Nicht gesetzt:** iPhone-/Samsung-Hüllen (Seiten nicht zugeordnet), Magnet, Strandtuch, Notizbuch, Aufkleber, Bügeltransfer (Printful-Seite nicht gefunden).
**Urheberrecht:** Die Fotos stammen von Printfuls Webseite (Beispielmotive Dritter); Besitzer hat die Übernahme am 2.11. ausdrücklich verlangt. Printfuls Nutzungsbedingungen für diese Galeriebilder sind ungeprüft (unbekannt).
**Sterne:** Das Judge.me-Widget blendet ohne echte Bewertung aus (`data-number-of-reviews="0"`). Keine erfundenen Bewertungen (UWG).

## Nachtrag 2 (2.11.): Handyhüllen und Rest
Auftrag Besitzer: «mach weiter mit den iphone hüllen». Gleiches Verfahren (Printful-Galeriebilder, Sichtprüfung, Infografik/Fremdlogo aussortiert): iPhone Hardcase MagSafe +9, iPhone transparent +6, Samsung +12, Aufkleber +4 (Auto-Aufkleber mit Fremdlogo raus), Magnet +4 (Beschriftungskachel raus), Notizbuch +6. **41 Bilder, 6 Produkte, 114 Medien, 0 nicht `READY`** (frisch gelesen). Die iPhone-Fotos zeigen teils andere Modelle (Printful-Galerie, nicht modellgenau).
**Weiterhin ohne:** Strandtuch (Printful-Seite nicht gefunden), Bügeltransfer.

## Kategorien-Prüfung (2.11., Prüfer `kategorie_pruefer.mjs`, frischer Katalog 56 529 Produkte)
GEMESSEN: 706 Menü-Sammlungen, 589 als Themen-Sammlung bewertet, **0 Titel-Regel-Sammlungen mit Fremdkörpern**, 138 mit «Ausreissern» (anderer Google-Bereich als der Kern). Stichprobe der Beispiele: die meisten sind Absicht (Mischgruppen wie Wohnen & Dekoration, Taschen). Echte Fehlgriffe, weil die Sammlung an einem alten Tag hängt: `jacken-outdoor` (`kat-jacke-outdoor`) enthält Haustier-Jacken, `schule-kindergarten` (`sort-schule`) ein Rollregal für Spielzeug. Die älteren Tag-Sammlungen (`kat-*`, `beauty`+`hautpflege`, `auto`) auf `sort-`-Regeln umzustellen ist der grössere offene Schritt (Aufgabe «Taxonomie»), nichts davon wurde geändert.
