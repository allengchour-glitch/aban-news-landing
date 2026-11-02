# Wohnen & Garten live (2.11.2026)

Auftrag des Besitzers 2.11.: «mach weiter mit wohnen und überall».

## Kategorien (Lauf `kategorien_anlegen.mjs`, `BEREICH_DATEI=wohnen`)
- 100 Sammlungen geschrieben (alle «Mitglieder n / erwartet m» mit n ≥ 90 %, 0 Abweichungen, 0 Fehler), 4 543 Tag-Änderungen. Der frühere Trockenlauf hatte 6 881 gemeldet; die Differenz kam aus Tags, die frühere Läufe schon gesetzt hatten.
- **Nachprüfung (GEMESSEN, frischer Katalog 2.11., zweiter Trockenlauf):** Wohnen 0, Sport 0, Beauty 0 offene Tag-Änderungen; Tiere 14 (Produkte, die erst nach dem Lauf einsortierbar wurden: tier-leinen 4, tier-naepfe 8, tier-pflege 2) per `FORCE=1 PHASE=tags` nachgezogen.

## Menü (`menue_wohnen_0211.mjs`, `menue_wohnen_nachtrag_0211.mjs`, Sicherung `menu-sicherung/main-menu-vor-wohnen-0211.json`)
- «Wohnen & Garten» hat jetzt **18 Köpfe** (vorher 32, davon 14 ohne Unterpunkte): die 13 Gruppen der Taxonomie (Kochen/Grillen/Backen, Küchenhelfer, Küchengeräte, Kaffee/Tee/Trinken, Geschirr/Besteck/Tisch, Putzen & Haushalt, Aufbewahrung & Möbel, Bad, Kissen/Decken/Bettwäsche, Fenster/Wand/Uhren, Deko & Kerzen, Raumluft & Klima, Beleuchtung) plus die bestehenden Basteln & DIY, Garten & Outdoor, Werkzeug & Maschinen, Sanitär & Wasser, Bau/Türen/Befestigung.
- Alte Einzel-Köpfe ohne Unterpunkte (Wäschekörbe, Wandregale, Sticker, Hängematten, Aroma & Diffuser, Vasen & Blumentöpfe, Wandbilder & Poster, Wecker, Geschenkverpackung, Haushaltsgeräte, Ersatzteile) stehen jetzt als Unterpunkt der passenden Gruppe; Waagen unter Küchenhelfer, Armaturen & Duschen unter Bad.
- Die alten Übersichtsseiten (Küche & Kochen, Aufbewahrung, Kissen & Wohntextilien, Dekoration) stehen als Eintrag «… (alle)» bzw. «Alle …» in der ersten passenden Gruppe, damit sie im Menü und in den Breadcrumbs bleiben.
- **Nicht mehr im Menü** (Seiten bleiben erreichbar, Duplikate engerer neuer Kategorien): Tassen & Becher, Geschirr & Teller, Besteck & Essstäbchen, Töpfe/Pfannen/Backen, Küchenmaschinen & Elektrogeräte, Schneidebretter, Woks, Etageren, Küchenhelfer & Gadgets, Lunchboxen, Teppiche (Teppiche & Fussmatten steht), Bettwäsche, Vorhänge, Duschvorhänge, Wanddeko, Wandteppiche, Wanduhren, LED-Strips (alt). **Entscheid offen:** falls einzelne wieder ins Menü sollen, per `menue_wohnen_nachtrag_0211.mjs`-Muster anfügen.
- Nachlesen: ausserhalb von Wohnen «fehlend 0 | neu 0»; alle 68 neuen Menü-Links per HTTP 200 (seriell, 3 s Pause).

## Gut bewertete zuerst (`automation/bewertung_zuerst.mjs`)
- Trockenlauf für alle Menü-Collections: 560 würden geändert (141 ohne bewertetes Produkt, 4 nicht auswertbar, 1 zu klein, 0 Fehler); Katalog: 56 529 aktive Produkte, 2 071 mit Bewertung, 2 010 mit ≥ 4 Sternen.
- Probe an drei Kategorien (laufschuhe-running, pfannen-woks, led-streifen-lichterketten): frisch gelesen `MANUAL`, bewertete Produkte vorn, Seiten HTTP 200. Danach Lauf für alle Menü-Collections; Rückgängig: `BEST_SELLING=1 LIVE=1`.

## Offen
- Banner und Kategorie-Bilder für die neuen Sammlungen (Gemini-Guthaben leer; Codex macht Banner).
- Index-Anträge für die neuen Seiten (Kontingent; morgen früh messen).
- Schuhe-Banner und kräftigere Schrift: Theme-Entwurf 213013037447, Veröffentlichen entscheidet der Besitzer.
