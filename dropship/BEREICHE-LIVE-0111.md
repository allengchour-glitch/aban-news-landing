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
