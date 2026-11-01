# Weitere Bereiche der Taxonomie live (01.11.2026): Haus & Bau, Auto, Spielzeug

Folge von `ELEKTRONIK-TAXONOMIE-0111.md`. Gleiches Verfahren: Katalog frisch (56 529 aktive Produkte), Trockenlauf, Stichproben der Listen gelesen, dann
`SCHMUCK=1 BEREICH_DATEI=<bereich> BEREICH_GRUPPEN=<alle Gruppen> PREFIX=s- LIVE=1 PHASE=tags` und `PHASE=sammlungen` (Ledger `dropship/kategorien_ledger.txt`).

## Live (GEMESSEN)
| Bereich | Kategorien/Filter | Tag-Änderungen | Mitglieder gegen Erwartung |
|---|---|---|---|
| Haus & Bau | 27 | 705 | 27 Zeilen, 0 Abweichungen |
| Auto | 34 | 956 | 34 Zeilen, 0 Abweichungen |
| Spielzeug | 45 | 1 793 | 45 Zeilen, 0 Abweichungen |
Stichproben der Listen (Plüsch, RC-Autos, Babyphones, 3D-Puzzles, Dashcams, Sitzbezüge, Motorradbekleidung, Grills, Armaturen, Dübel): Titel passen; Randfälle einzeln (z. B. Reifen-Spanngurt unter «Schrauben & Befestigung», Aschenbecher mit Luftreiniger unter «Auto-Duft»), im Rahmen der geprüften Fremdquote (0–0,85 %).

## Noch NICHT gemacht
- **Menü:** die neuen Kategorien sind veröffentlicht, aber noch nicht im Hauptmenü eingeordnet (Spielzeug unter «Kinder & Baby», Auto, Haus & Bau unter «Wohnen & Garten»/«Sport & Party»; Mapping ist Menü-Arbeit wie bei Elektronik).
- Reihenfolge «gut bewertete zuerst», Label-Bilder (Gemini-Guthaben leer, Banner macht Codex).
- Wirkung auf Verkäufe/Google: unbekannt.
- Im Trockenlauf gerechnet, nichts geschrieben: Sport 46 (1 795), Tiere 60 (5 653), Wohnen 154 (6 881), Hobby & Party 26 (1 047), Beauty 66 (4 500), Sportschuhe 18 (815).

## Rücknahme
Sammlungen `s-…` der drei Bereichsdateien löschen, Tags `sort-<handle>` entfernen (`kategorien_anlegen.mjs`, Ledger).

## Menü-Umbau (LIVE 01.11.2026, nach den Sammlungen)
Skript `dropship/taxonomie-2610-b/menue_bereiche_0111.mjs` (liest `/tmp/advbau-claude/sh.mjs`), Sicherung `dropship/menu-sicherung/main-menu-vor-bereiche-0111.json`.
- **Kinder & Baby:** Köpfe «Bausteine & Bausätze» (9), «Plüsch, Puppen & Spielwelten» (4), «Fahrzeuge & Ferngesteuertes» (5), «Lernen, Puzzles & Spiele» (4), «Baby & Kleinkind» (8), «Schule, Kinderzimmer & Draussen» (2); Babykleidung, Kinderschuhe, Kinder-Accessoires, CH-Lager und Geschenke unverändert.
- **Wohnen & Garten:** «Werkzeug & Maschinen» (7), «Garten & Outdoor» (9), neu «Sanitär & Wasser» (4) und «Bau, Türen & Befestigung» (4); alle anderen Köpfe unverändert. Die Gruppe «Schutz & Sicherheit» steht schon unter Elektronik.
- **Neu oberste Ebene «Auto & Motorrad»** (nach «Elektronik», 25 Links): Innenraum & Komfort, Aussen/Schlüssel/Sicherheit, Auto-Elektronik & Laden, Pflege & Werkzeug, Motorrad/E-Scooter/Velo. «Auto & KFZ-Zubehör» ist aus Elektronik dorthin verschoben.
- Plan-Handle ohne Sammlung im Shop (übersprungen): `velo-werkzeug-reparatur`.
- Vorher/nachher gelesen: ausserhalb der vier Äste 0 fehlend, 0 neu. Links (einzeln, mit Pause): Auto & Motorrad 25 von 25 HTTP 200; Kinder & Baby 51 von 51 (26 davon erst nach Wiederholung: der erste Durchlauf lief doppelt und wurde von Cloudflare mit HTTP 429 gedrosselt, kein Seitenfehler); Wohnen & Garten, umgebaute Köpfe 28 von 28.
- **Entscheid des Besitzers möglich:** «Auto & Motorrad» als eigener Menüpunkt oben (statt unter Elektronik); Rücknahme = Sicherungsdatei per `menuUpdate`.
