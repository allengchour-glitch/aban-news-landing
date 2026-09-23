# Herbst-Webseite — 23.09.2026

Auftrag (Betreiber 23.09.): «webseite auch herbstsachen und toller machen».
Werkzeug: `automation/herbst_kuratieren.py` (neu), `automation/homepage_katalog_rotation.py` (angepasst).

## Vorher gemessen (23.09. ~18:35 UTC, Admin-API)

| Stelle | Stand |
|---|---|
| Startseite `templates/index.json` (Theme 187533001089) | 25 Sektionen (Limit), keine Herbst-Reihe. 18 Produktreihen, davon 8 Wechsel-Reihen (tägliche Rotation). `budget_unter25` (Rest der Aktion «unter CHF 25») drehte als Wechsel-Reihe auf Position 21 von 25. |
| Hero | Button «Übergangsmode entdecken» → `/collections/jacken-outdoor` (419 aktiv), schon herbstlich |
| Ankündigungsband | 5 Texte, u. a. «🎃 Neu: Der Halloween-Shop ist da …» **ohne Link**; «WELCOME10» ist ein echter, aktiver Code (bis 31.12.2027) |
| Menü «Herbst & Übergang» | 11 Untereinträge, davon **3 Sommerware**: «Sommer-Auslauf» (`sommer`, 288 aktiv), «Ventilatoren» (84 aktiv), «Sonnenbrillen» (49 aktiv) |
| Herbst-Kollektion | keine (`herbst`, `herbst-favoriten`, `herbst-2026`: nicht vorhanden) |
| Rotation | `homepage_katalog_rotation.py` überschreibt täglich die 8 Wechsel-Reihen (pl_kinder, pl_tech_gadgets, pl_senioren, pl_spass_gadgets, budget_unter25, product_list_L3EDnA, pl_querbeet, pl_wechsel_taschen) |

## 1. Kollektion «🍂 Herbst-Favoriten» — 65 Produkte

- Smart-Kollektion `herbst-favoriten` (Regel Tag = `herbst-2026`), MANUAL sortiert, in 6 Kanälen wie `hype-jetzt`
  (Onlineshop, Shop, TikTok, FB & IG, Google, Pinterest). SEO-Titel 53 Zeichen, Beschreibung 144 Zeichen.
- Zehn Themen mit Quote: Hoodies 10 · Strick 9 · Übergangsjacken/Mäntel 9 · Boots 8 · Schals/Mützen/Handschuhe 5 ·
  Kerzen & Duft 5 · Kuscheldecken 5 · Wärme/Hausschuhe 5 · Tee & Kaffee 5 · Herbst-Deko (Kürbis-Kissen) 4.
- Bedingungen: aktiv, im Onlineshop UND im Google-Kanal, ≥ 2 Bilder, ab CHF 19, Hauptbild ≥ 600 px, bei Lagerführung
  Bestand > 0, kein Sperr-Tag (`google_sperrliste.AUSSCHLUSS_TAGS` + Werbe-Sperren + Präfixe), keine heikle Warengruppe,
  kein Wirkversprechen, keine Lizenzfigur, keine Tier-/Kinderware, Netzgeräte nur mit USB/Akku.
- **Vision-QA (Projektregel 5): 4 Kontaktbogen-Runden, 98 Bilder angesehen, 33 aussortiert** (31 per ID, 2 per neuer Regel) (englische/chinesische
  Bildtexte, «3PCS»-Overlay, Schaufensterpuppe, Sommerszene, Jeanskleid als «Rockjacke», Sport-Trinkflasche als
  «Isolierkanne», Räucherspiralen-Halter als «Kerzenhalter», Fuchsfell-Manschette). Sie stehen mit Grund in
  `AUSGESCHLOSSEN` und kommen nie wieder.
- Die ersten acht Karten (= Startseitenreihe) sind von Hand gewählt (`VORNE`): rostroter Hoodie, rote Stiefel,
  brennende Kerze, weisser Strickpullover, Fransen-Strickdecke, Wollmantel, Kürbis-Kissen, Bambus-Teekanne.

### Fallen, die der Trockenlauf fand (jetzt Kanarienvögel im Selbsttest)

| Treffer | Warum falsch | Regel |
|---|---|---|
| «Bikini-Set … schmeichelhaft» als Herbst-Deko | «schm**eichel**haft» enthält «Eichel» | Eichel nur am Wortanfang |
| «Kürbis-Süssigkeiten**schale**» | Schale ≠ Schal | Schal nur als Wort/Wortende |
| «Leder**handschuhe**» fiel aus der Schal-Gruppe | eigener Ausschluss «Schuhe» traf Hand**schuhe** | `(?<!hand)Schuhe` |
| «Midikleid mit **Laternen**ärmeln» als Kerze | Laternenärmel | Laterne nur als ganzes Wort |
| «Runder **Aschenbecher**» als Tee-Zubehör | «Becher» | Aschenbecher ausgeschlossen |
| «Mandelförmige **French Press**-On Nägel» als Kaffee | French Press | Nägel/Press-On aus |
| «**Kerzen**-Giessform» | Bastelform, keine Kerze | Giessform aus |
| «Seidenkleid mit Sonnenschutz-**Schal**» | Sommerkleid | Kleid in Schal-Gruppe aus, Sonnenschutz global aus |
| «Beheizbare **Wimpern**zange» als Wärme | Beauty-Gerät | Wimpern global aus |
| «Weisses Strickkleid für den **Strand**urlaub», «**Chiffon**-Cardigan» | Sommerware | Strand/Chiffon global aus |

## 2. Startseite — eine Reihe umgewidmet

- `budget_unter25` → **`pl_herbst`**, zeigt `herbst-favoriten`, **Position 6 direkt nach den Bestsellern** (vorher 21).
  Sektionen 25 → 25, order 25 → 25, JSON validiert.
- Backup der Live-Datei: `dropship/theme_live_backup/index_20260923-185016.json`.
- Admin-Rücklesen: `pl_herbst → herbst-favoriten`, Position 6, `budget_unter25` weg. ⚠️ Das erste Rücklesen DIREKT nach
  `themeFilesUpsert` lieferte noch die alte Datei (pl_herbst fehlte), 5 s später war sie da. Die Rotation liest jetzt bis zu 5×
  mit Pause zurück.
- Öffentlich (WebFetch, 18:51 UTC): Reihe «🍂 Herbst-Favoriten» als 4. Produktreihe nach «⭐ Bestbewertet», genau die
  acht geplanten Karten. `/collections/herbst-favoriten`: H1, Beschreibung, 65 Artikel, erste 8 in der geplanten Reihenfolge.
- `homepage_katalog_rotation.py`: neue Regel **SAISON_FEST** — `pl_herbst` ist vom 22.09. bis 30.11. fest auf
  `herbst-favoriten` und wird in dieser Zeit NICHT rotiert; ab 01.12. dreht sie wieder mit (Weihnachten kommt ab 15.10. über
  den Pool). Die Rotation hat jetzt 7 Wechsel-Reihen. Selbsttest 15/15 grün (inkl. «Sektionszahl gleich», «Dezember dreht
  wieder mit»); `DRY=1` gegen live: «unveraendert».

## 3. Menü «Herbst & Übergang»

- Backup: `dropship/theme_live_backup/main-menu_20260923-185200.json`.
- Die drei Sommer-Einträge wurden umgebogen (gleiche Item-IDs): Sommer-Auslauf → **🍂 Herbst-Favoriten** (oben),
  Ventilatoren → **Stiefel & Boots** (`sub-stiefel-boots`, 684 aktiv), Sonnenbrillen → **Herren-Pullover & Strick**
  (`herren-pullover`, 95 aktiv). «Strick & Pullover» heisst jetzt «Damen-Strick & Pullover» (zeigt auf die Damen-Kollektion).
- Sonnenbrillen und Ventilatoren bleiben erreichbar (Schmuck & Uhren › Sonnenbrillen, Highlights › Ventilatoren & Kühlung).
- Zählung rückgelesen: Einträge gesamt 151 → 151, Herbst 11 → 11, Top-Level 13 → 13, alle übrigen Zweige unverändert.
  Alle drei neuen Ziele im Onlineshop veröffentlicht. Öffentlich (WebFetch): die Navigation zeigt genau die 11 neuen
  Einträge in dieser Reihenfolge, keiner der drei Sommer-Einträge mehr.

## Offen / Vorschläge (nicht in diesem Paket)

- Ankündigungsband (`sections/header-group.json`): Halloween-Text ohne Link → auf `/collections/halloween-2026` (196)
  verlinken; ein Herbst-Text mit Link auf `/collections/herbst-favoriten` wäre der zweite Einstieg.
- Menü «Highlights › Ventilatoren & Kühlung» ist Sommerware.
- `NUR_RAEUMEN=1 python3 automation/herbst_kuratieren.py` einmal täglich (räumt gedraftete/gesperrte Produkte ab, nimmt
  NICHTS Neues auf — Nachrücker nur in betreuten Läufen nach Kontaktbogen, Lehre der Hype-Reihe vom 15.08.). Nach dem
  30.11. nimmt derselbe Lauf den Tag überall weg (Saisonende greift vor NUR_RAEUMEN).

## Prüfbefehle

```
SELBSTTEST=1 python3 automation/herbst_kuratieren.py
python3 automation/homepage_katalog_rotation.py --selbsttest
DRY=1 python3 automation/homepage_katalog_rotation.py        # erwartet: «unveraendert»
DRY=1 python3 automation/herbst_kuratieren.py                # erwartet: Live getaggt 65, Neu gewählt 0
```
