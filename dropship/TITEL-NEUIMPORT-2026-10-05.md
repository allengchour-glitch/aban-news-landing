# Titel-Neuimport — Folgerunde 05.10.2026 (03:30–04:30 UTC, Bereich «titel-neuimport»)

Plan-Punkte 5, 14, 16, 21 + Prüferbefunde Index 2/6. KI-Kontingente leer → alle Urteile selbst (Titel gelesen, Bilder als
Kontaktbogen per PIL angesehen), keine bezahlten Aufrufe, keine CJ-Abfragen (Punkte bis 16:00 UTC auf 0).

## Gemessen vorher
- `productsCount(status:active created_at:>=2026-10-03T00:00:00Z)` = **900** (Shopify ignoriert den Zeitanteil — Menge = seit 03.10. 00:00).
- `_titel_kauderwelsch.tsv` deckte **3/900**; Regel-Scan englischer Wörter 139 Treffer (meist zulässige Anglizismen), eigene Lesung aller 900 Titel: **86** zu korrigieren.
- Trend-Produkt/Trend-Gadget aktiv: **9** (6 + 3), davon 2 Neuimporte (Weihnachtskalender 04.10. 23:10, Adventskalender 05.10. 00:11 → beide aus `cj_sku_import`, das JEDES Produkt als «Trend-Produkt» anlegte; `cj_trending_import` als «Trend-Gadget»).
- SEO-Titel ≠ Produkttitel (Basis vor «| LuxeStyle») über die 900: **4** (Vision-Board, Fahrrad-Set englisch; Zigaretten-Drehmaschine mit SEO «Blechknabber»; Motorradjacke «Motorradsattelanzug»). Der Prüfer-Wert 55 war schon durch den Sonderzeichen-Lauf (308) abgearbeitet.
- Doppelmengen-Regel (`ohne_doppelmenge`) war vor dieser Runde bereits erweitert (Kommentar 05.10. im Werkzeug); live 1 Rest in der Menge («3er-Set runde Backformen · 3 Stück»).

## Getan
1. **Plan 5** — Bilder gelesen (10 + 10): Vision-Board ist ein Kit (Board 24×34 cm, 270 Bildkarten, Buchstaben-/Symbol-/Etikettensticker, Blanko-Karten, Fotoecken laut Lieferantenbild 2) → «Vision-Board-Set mit Bildkarten, Stickern & Buchstaben», Beschreibung neu (die «fünf Papiersticker» waren falsch). Fahrrad: Hauptbild und 4/10 Bilder zeigen nur den Kurbelabzieher, 1 Variante «Default» 19.90 (cj_sku_import nimmt nur die erste CJ-Variante) → «Kurbelabzieher für Fahrrad», Beschreibung ohne «4 Teile/Kettennieter». SEO beide Felder gesetzt und rückgelesen.
2. **Plan 14** — Figurkleid: Bild zeigt ärmelloses, rückenfreies Kleid mit Schulterpartie (nicht trägerlos) → «Rückenfreies Figurkleid mit Taillenband in Gelb oder Weiss», SEO beide Felder, Beschreibung «strapless/rueckenfrei» korrigiert. Leggings `fitness-leggings-mit-po-push-up-effekt-609216` im Ledger `_gfeed_anstupsen.tsv` mit `mode-messung` vermerkt (Parser dort gehärtet: dritte Spalte ist kein Datum), Bericht `GOOGLE-ADULT-BLOCKER-2026-10-04.md` korrigiert (94 Fehlalarme + 1 verboten + 1 Mode).
3. **Plan 21** — alle 900 Titel gelesen, 23 unklare per Kontaktbogen angesehen. **86 Produkte** korrigiert (Titel + SEO-Titel + SEO-Beschreibung, 5 mit Beschreibung), Rücklesen je Produkt im Skript, Ledger `_titel_kauderwelsch.tsv` (alt → neu, Grund); 813 «ok»-Zeilen «selbst gesichtet» → Ledger deckt **900/900**. Klassen: englisch/Kauderwelsch (Belt Bag, Seven-in-One, Sanjie, Checkerboard, Hollow, Resin, Mandrel …), Grammatik («Männliche Quarz-Uhr», «12-teiliger Kochset»), material-unbelegt («Diamant» = CJ-Wort für Strass, 5 Titel neutralisiert), Bild ≠ Text (Memory-«Nacken»-Kissen ist eine Armauflage in Schmetterlingsform; «Leder-Sessel» ist eine Pouf-Hülle zum Befüllen; «Batik-Vorhänge» eine Kameratasche; «Elf-Beschlag» ein Elf-Anhänger).
   - «Old Man Wanchristmas Haustier-Strickpullover» = Bild: Hunde-Sträflings-Kostüm «Prisoner» mit Mütze → so betitelt; trägt Tag `kostuem`, nicht im Google-Kanal (gemessen).
   - «Anime JK Uniform Cosplay Woll-Komplettset» → «Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)», «Woll» unbelegt gestrichen, **Tag `kostuem` gesetzt** (Kostüm-Klasse; war nicht im Google-Kanal, bleibt so über `google_sperrtags_durchsetzen`).
   - **Zeilenverschiebung der Sichtprüfung 04.10.** (`_sicht_titel_2026-10-04.tsv` Zeilen 333/334): das Urteil für den Hexagon-Schraubendreher (16606127292807, gar nicht im Ledger) landete auf 16606127391111 (Metallschneider → hiess «Sechskant-Schraubendreher-Set»), dessen Urteil «Blechknabber» auf 16606127489415 (Zigaretten-Drehmaschine; Titel später zurückgesetzt, SEO blieb). Alle drei am Bild geprüft und repariert; Handle-Abgleich über die übrigen 237 Ledger-Zeilen: 0 weitere Verschiebungen.
4. **Plan 16** — `automation/produkttyp_aus_kategorie.mjs` (Google-Pfad → deutscher Typ, dieselbe Zuordnung wie `produkttyp_vereinheitlichen.TAX` + VORRANG-Titelwörter; `--test` 12/12). Eingebaut in `cj_sku_import.mjs` (statt «Trend-Produkt»), `cj_trending_import.mjs` (statt «Trend-Gadget»), `cj_category_fill.mjs` (nur bei Sammeltyp Gadget/Trend-*; feste Gruppentypen bleiben); `node --check` 4/4. TYPE-Kollektionen gelesen (18): keine hängt an Trend-*/Gadget → keine Sperre nötig. `dropship/cj_enrich.mjs` legt keine Produkte an (Recherche-Skript) → unverändert. Kein laufender Node-Prozess mit altem Code (`ps`: nur die Bash-Runner warten auf CJ-Punkte).
   - Live nachgemessen 04:20: Trend-* **9 → 2** (die 7 umtypbaren hat der Kategorie-Lauf 04:04 erledigt, Ledger `_produkttyp_ledger.tsv`; Rest: Schnürsenkel aa-8 = Schuhzubehör, Atemschutzmaske hb-1 — bewusst kein geratener Typ). Neue Ampel-Zeile `automation/sammeltyp_zaehler.py` («SAMMELTYP: 2 aktiv … Soll ≤ 10»).
5. **Index 6 (niedrig)** — `PREIS-MARGE-2026-10-04.md`: Zeiten auf 00:35–00:42 UTC korrigiert, Nachtrag 8 (Commits 5b9f3ad01/083960d58, «einzige Stelle» gilt erst seit 00:51, 4 geschätzte EKs, Doppelarbeit); `ek_luecke_cj.py` Docstring «CJ einmal»; `cj_ausgelistet_sichtbar.py` liest jetzt den Live-Status vor jeder CJ-Abfrage (DRAFT = überspringen → keine 10-Punkte-Doppelabfragen).
6. **Nebenfund Klingenregel** (beim Regel-Scan der 900): `ist_handklinge` sperrte «Digitaler Windmesser (Anemometer)», «Diamant-Schärfstab», «Messerschärf-System mit Winkelführung» (alle aktiv, `klinge_ch_wache` hätte sie als Handklinge gedraftet) → `klingenregel.json`: `wind` in die Messgeräte-Ausnahme, `schärfstab|schärf-system|schärfstahl` ins Zubehör; 3 Kanarienvögel in `handklingenregel_test.py`; beide Tests grün (57 + 28 Fälle), Node liest dieselbe Datei (geprüft).

## Gemessen nachher (04:20 UTC)
| Messung | vorher | nachher |
|---|---:|---:|
| Ledger `_titel_kauderwelsch.tsv` deckt Neuimporte seit 03.10. | 3/900 | **900/900** |
| korrigierte Titel (Rücklesen Titel + SEO-Titel je Produkt) | — | **86/86**, 0 Fehler |
| SEO-Titel ≠ Titel in der Menge | 4 | **0** (Motorradjacke separat angeglichen) |
| Trend-Produkt/Trend-Gadget aktiv | 9 | **2** (bewusst offen) |
| Handklingen-Fehlalarme in den 900 | 3 | **0** |

## Offen (ehrlich)
- Fahrrad-Set: CJ-Variantenliste (`product/query?pid=2509250226151606600`) erst nach 16:00 UTC prüfbar — bis dahin bewusst «Kurbelabzieher» (untertrieben statt übertrieben).
- Nachmessen Punkt 16 mit einem Neuimport NACH dem Fix (Importer laufen erst wieder mit CJ-Punkten nach 16:00): `created_at` nach 04:10 UTC + Typ ≠ Trend-*.
- `google_reiztitel.py`-Tageslauf (Punkt 14 Kriterium) nicht gestartet — läuft im Aufseher.
- «Diamant-Schärfstab für Küchen- und Gartenmesser» bleibt für `ist_klinge` (Werbefrage) True (Endung «-messer») → nicht im Google-Kanal; Schärfer sind laut Hausregel zulässig — Regel erweitern, wenn gewollt.
- 2 Doppel-Titel «1cm Keramik Mosaik Fliesen für DIY(-Projekte)» (16604879028615 / 16604881650055) = mögliche Dublette, nicht geprüft.
- `_sicht_titel_2026-10-04.tsv`-Werkzeug: Ursache der Zeilenverschiebung (Urteil auf falscher gid) nicht gesucht — Werkzeug vor dem nächsten Lauf prüfen.
- Der Autocommitter (5-Min-Loop, `dropship/`) hat PREIS-MARGE/Ledger-Änderungen bereits in «CJ-Ledger auto»-Commits eingesammelt (nicht von mir; `automation/`-Änderungen sind uncommitted).
