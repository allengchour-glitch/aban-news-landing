# Klassen-Rangliste 12.10.2026 — fünf Prüfer, Richter, je drei Skeptiker (Workflow, nur lesend)

Arbeitsliste für die nächsten Verbesserungsrunden. Punkte des Richters 0–10 (Kaufwirkung 6 Wochen, Seiten mit Verkehr,
autonom behebbar, Belegqualität). Volle Befunde: Workflow-Journal `wf_ce07c839-f68` (Session-Verzeichnis).

| Pkt | Klasse | Stand |
|---:|---|---|
| 8 | Saison-Kollektionen füllen sich nicht (Tags nur beim Import) | **Gegenprüfung 2/3 widerlegt** (kaum Verkehr; Halloween-Wächter existiert; Fix-Weg hätte in beide Richtungen gelöscht). **Bestätigt + erledigt:** 12 Adventskalender ausserhalb der Kollektion → `saison_tags_nachtragen.py` Advent-Regel (15/15 Kanarien) + `cat_tags.mjs saisonTags` (7/7), 12 gesetzt, Kollektion 15 → 27 aktiv |
| 7 | Bestellschluss je Anlass unsichtbar | **widerlegt 3/3** — jede Produktseite zeigt unter dem Kaufknopf schon «Lieferung voraussichtlich …» (Theme-Block `lux_delivery`) |
| 6.5 | Shop-Suche ohne Boosts (Fremdware/Zubehör vor Kernware) | offen — Suchende kaufen 4,4× eher (6,1 % gegen 1,4 % Korb), aber ~2 Suchen/Tag; Search & Discovery-App |
| 6 | Kassen-Lieferdatum: Bearbeitungszeit doppelt (P3D + 10–20), CH-Lager in der Kasse 2–4 Wochen statt 1–2 Tage | **Schritt 1 erledigt 12.10.** (Transit = Zusage − Bearbeitung, CH 7–17); Schritt 2 offen — Schritt 1 Transit 7–17 + Regeldatei gleichzeitig (sonst setzt `versand_transit_wache --scharf` zurück); Schritt 2 eigenes Profil nur mit gemischtem Testkorb (Doppel-Versand-Risiko) |
| 6 | Geschenke-Einstieg zeigt Billigware | **erledigt** (`GESCHENKE-EINSTIEG-2026-10-12.md`) + 5 weitere Geschenk-Seiten (unter 50/100, Preis-Hits, Hochzeit, Sets) |
| 5 | Kleidung/Schuhe ohne Masstabelle des Modells (98,7 % von 14'367 CJ-Mode mit Grösse) | **7 Top-Seiten live 12.10.** (`MASSTABELLEN-2026-10-12.md`); weitere im CJ-Vorrang-Fenster — CJ liefert Chart-Bilder; Vision-Lesung + Zweitprüfer; CJ-Punkte (10/Produkt) → Top-Seiten zuerst |
| 4.5 | Kollektionen/Ratgeber nicht gecrawlt (27 von 35 Schlüssel-Kollektionen nie gecrawlt) | offen, langsam (Wirkung > 6 Wochen) |
| 4 | Auswahlwerte «Modell N/Variante N», «Color» (633 Optionen) | offen, Überschneidung mit Auswahl-Aufgaben #33/#34 |
| 3.5 | Kollektionstitel mit Ergänzungsstrich («Lauf- & Sportschuhe») — Vorschlagsliste findet sie nicht | **erledigt 12.10.**: 19 ausgeschrieben, «laufschuhe»/«heizdecken»/«stehlampen» finden jetzt die Kategorie; Wächter täglich |
| 3 | 225 verwaiste Kollektionen in der Sitemap | offen, Wirkung Vermutung |
| 2.5 | Grösse in der Farb-Option («Schwarz · Gr. 37», 119) | offen, Varianten-Umbau riskant |
| 2 | Kasse aus App-Browsern (TikTok/Pinterest) | nicht autonom (Theme) |
| 1.5 | /fr/ verdoppelt den Katalog (54'690 URLs, 399/400 ohne Übersetzung) | Betreiber-Entscheid (FR ja) |

Nebenfund (Betreiber-Frage): Google Ads 0 Klicks = Testprodukt «Over capacity for Shopping ads (in CSS program) [CH]» → erledigt (Label auf Aurora).
