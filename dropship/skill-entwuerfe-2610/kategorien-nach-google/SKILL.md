---
name: kategorien-nach-google
description: Immer wenn bei LuxeStyle Kategorien, Collections oder das Hauptmenü angelegt, geändert oder geprüft werden - neue Kategorie, Fremdprodukt auf einer Kategorieseite, Collection mit 404, Unterfilter-Chips, Mode-Kategorien, Menü-Umbau, neue Produkte nach einem Import einsortieren, Reihenfolge nach Bewertung, Label-Bilder. Verfahren: Google-Kategorie statt Titel-Wortteil, Tags sort-..., Phasen tags/sammlungen/menue, Prüfer, Fallen und Gegenproben.
---

# Kategorien nach Google-Kategorie: Tags `sort-…`, Collections, Menü, Prüfer

**Regeln:** `automation/lib/kategorien.mjs`: `KATEGORIEN` = `BASIS_KATEGORIEN` (88, von Hand) + `VERENGT` (27, Daten `kategorien_verengt_daten.json`) + `MODE` (Mode-Taxonomie; Vorgabe `MODE_BEREICHE=bekleidung` = 187 Einträge, davon 146 Unterfilter) = 302 mit Vorgabe (26.10.2026 gelaufen). `MODE_BEREICHE` ist kommagetrennt und ersetzt die Vorgabe (`bekleidung,schuhe` = 372, alle vier = 429). Dazu 5 `BEREINIGUNG`-Regeln; rein, ohne Netz. Menü-Umbau: `automation/lib/menue_plan.mjs`.
Node = `/opt/node22/bin/node`; Tests: Gegenproben. Trockenlauf ist Vorgabe, `LIVE=1` schreibt - nie ohne `PHASE=` (Falle 12).
**Zugang:** `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`; Bilder/Banner zusätzlich `GEMINI_API_KEY` + Playwright (Schritt 7). **GEMESSEN** = Livezahlen aus CLAUDE.md 25./26.10.2026 (nicht neu gemessen; Test- und Kategorienzahlen am 26.10.2026 selbst gelaufen) · **SETZUNG** · alles andere steht im Code.

## Warum nach Google-Kategorie (GEMESSEN 25.10.2026)

- Smart-Collections mit «Titel enthält …» kennen keine Wortgrenze: «SSD» steckt in «Stossdämpfend» (Hundeleine unter PC-Komponenten), «Wimpern» in «Wimpern-Bordüre», «Tasse» in «Tassel», `spitzer` in «spitzer Zehe», «Glock» in «Glockenärmel». (98 Titel-Regel-Collections mit Fremdkörpern am 25.10.2026; nach der Verengung der 27 Menü-Collections nur noch 5 in `dropship/kategorie-fremdkoerper.json`, 26.10.2026).
- Das Metafeld `mm-google-shopping.google_product_category` ist bei 54 993 von 56 636 aktiven Produkten gesetzt (97 %) und kommt aus der echten CJ-Kategorie.
- **Aber:** ist die Google-Kategorie nur der Oberbegriff (`Hardware > Tools`, 245 Artikel: Holzbürste, Nagelfräser, Pantoffeln, Harzfarbe), entscheidet der Titel (`werkzeugArt()`); Schuhe haben nur `Apparel & Accessories > Shoes`. Nie am Oberbegriff messen.
- Tags heissen **`sort-…`** (nie `kat-…`: `kat-kissen` mit 1178 Treffern kollidierte); einzige Ausnahme `tassen-becher`. Die Collection hängt nur am Tag (`TAG EQUALS <tag>`, `BEST_SELLING`).
- Produkte mit Sperr-Tag (`SPERR_TAGS`: adult-nicht-bewerben, 18plus, gmc-adult-pull, raucher-rueckhol-0809, nicht-bewerben, compliance-pruefen, waffenzubehoer-nicht-verkaufen, stecker-nicht-ch) kommen in keine** Themenkategor (`gehoertIn()` → false).

## Befehle (Repo-Wurzel)

```bash
N=/opt/node22/bin/node
# 1. Katalog FRISCH lesen (Bulk, ~1 Min.; {gelesen, vollstaendig, produkte[{id,handle,title,tags,g…}]}); alte Dateien liefern alte Tags!
$N automation/katalog_bulk.mjs /tmp/katalog_voll.json # Alternative (seitenweise, 20+ Min.): AUS=… $N automation/katalog_titel_scan.mjs

# 2. Trockenlauf: Tabelle KATEGORIE MIN MITGL TAG+ TAG- STATUS (neu | umstellen | ZU KLEIN → wird nicht angelegt)
$N automation/kategorien_anlegen.mjs # Vorgabe KATALOG=/tmp/katalog_voll.json; ohne IDS/PREFIX rechnet er ALLE 302 Kategorien (eine Abfrage je Kategorie)
IDS=kissen,vasen LISTE=/tmp/kat_listen.txt $N automation/kategorien_anlegen.mjs # nur diese; LISTE schreibt je Kategorie ALLE künftigen Mitglieder (handle | titel | Google-Kategorie)
# Bei IDS=… oder PREFIX=… (z. B. PREFIX=m- für alle Mode-Kategorien; beide zusammen = UND) entfallen die BEREINIGUNG-Regeln, ausser BEREINIGEN=1.

# 3. LISTEN LESEN, beide Seiten: LISTE zeigt die künftigen Mitglieder (Neue unmarkiert), für die Rausfliegenden (TAG-) gibt es nur die Zahl; ihre Titel (frischer, vollständiger Katalog):
$N --input-type=module -e "import {KATEGORIEN,gehoertIn} from './automation/lib/kategorien.mjs'; import {readFileSync} from 'node:fs'; const k=KATEGORIEN.find(x=>x.id==='<id>'); for (const p of JSON.parse(readFileSync('/tmp/katalog_voll.json','utf8')).produkte.filter(p=>p.tags.includes(k.tag)&&!gehoertIn(k,p))) console.log(p.handle,'|',p.title)"
LIVE=1 PHASE=tags $N automation/kategorien_anlegen.mjs # CONC=3 (parallel), 20 Aliase je Mutation, Throttled-Retry
LIVE=1 PHASE=sammlungen $N automation/kategorien_anlegen.mjs # legt an/stellt um, publiziert, wartet 20 s und zählt Mitglieder «n / erwartet m»
PHASE=menue $N automation/kategorien_anlegen.mjs # Trockenlauf des Menüs: «MENÜ-VORSCHAU», Tiefe <= 3
LIVE=1 PHASE=menue $N automation/kategorien_anlegen.mjs # menuUpdate + Rücklesen; Exit 2 = mehr als 3 Ebenen, Exit 3 = zurückgelesener Baum weicht ab

# 4. Prüfer (schreibt nichts, liest aber Menü und Collections live): rechnet nur Regeln auf TAG/TITLE/TYPE lokal (Preis/Taxonomie: «nicht lokal auswertbar»); überschreibt bei jedem Lauf (vorher kopieren)
# dropship/kategorie-pruefung.csv (Collections mit klarem Thema: grösste Google-Gruppe >= 50 %, >= MIN Mitglieder, mit Ausreissern) und kategorie-fremdkoerper.json (reine Titel-Regel-Collections, >= 3 Fremdkörper).
NUR_MENUE=1 MIN=20 $N automation/kategorie_pruefer.mjs # ZEIGE=45 ZEIGE_FK=40 begrenzen die Ausgabe; KATALOG=… wie oben. Nach JEDEM Menü-Umbau erneut laufen lassen.

# 5. Sperr-Tags: sort-Tags gesperrter Produkte entfernen (Trockenlauf meldet «Produkte mit Sperr-Tag UND sort-Tag: n» + 12 Beispiele; danach muss n = 0 sein)
[LIVE=1] KATALOG=/tmp/katalog_voll.json $N automation/sperr_sort_tags_entfernen.mjs # LIVE: tagsRemove in Blöcken zu 10

# 6. Gut bewertete zuerst (manuelle Reihenfolge je Collection; Bulk-Zwischenspeicher 6 h, NEU=1)
MENUE=1 $N automation/bewertung_zuerst.mjs # alle Menü-Collections, Trockenlauf; HANDLES=a,b LIVE=1; MIN_MITGLIEDER=10 MAX_OBEN=120
BEST_SELLING=1 LIVE=1 HANDLES=a,b $N automation/bewertung_zuerst.mjs # rückgängig (sortOrder zurück auf BEST_SELLING). Neue Produkte landen sonst hinten → periodisch wiederholen.

# 7. Label-Bild je Kategorie (echte Bestseller-Fotos; Gemini prüft Text, Masspfeile, Logo). Braucht Playwright + GEMINI_API_KEY (optional GEMINI_MODEL, GEMINI_BASE_URL)
HANDLES=haustier-hunde,schmuck $N automation/kategorie_bilder.mjs # PNG nach /tmp/kategorie_bilder; ALLE=1 LIVE=1 (älteres 1600×1200-Label; jetzt alle 302 Handles inkl. Unterfilter); FORCE=1, KI=0
# OHNE Schlüssel (oder KI=0) keine Prüfung auf Text, Masspfeile, Logo, Markenmuster («UNGEPRÜFT»), LIVE=1 lädt trotzdem hoch - dann nie LIVE=1 (die erste Auswahl hatte ein
# Louis-Vuitton-Muster und einen Thom-Browne-Streifen). Das alte Bild wird nicht gesichert.
# Pinnwand-Serie (2000×1000, bis 12 Fotos; Gemini prüft jedes Foto UND das Banner, ohne Schlüssel Exit 1; altes Bild gesichert in dropship/kategorie-bilder-sicherung/<handle>.json):
HANDLES=a,b $N automation/kategorie_banner.mjs # Trockenlauf; ALLE=1 [PREFIX=m-] [LIMIT=n] (ohne Unterfilter); LIVE=1 lädt hoch. Anleitung dropship/BANNER-LIESMICH.md, Test lib/banner_fotos_test.mjs
```

## Neue Kategorie bauen

1. Eintrag in `BASIS_KATEGORIEN` (`lib/kategorien.mjs`; nicht in `KATEGORIEN`, einem berechneten Spread): `id`, `handle` (nie raten, vorher `collectionByHandle`/HTTP prüfen; nur a-z, 0-9, Bindestrich, Falle 14), `titel`, `tag: 'sort-…'`, `min: 15`, `beschreibung`, `seoBeschreibung` («… Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.»), `eltern: ['Wohnen & Garten','Küche & Kochen']` (Menüpfad, `[]` = oberste Ebene), `nach: '<Geschwistertitel davor>'`, `passt: p => …`; `bestehend: true` stellt eine vorhandene Collection auf Tag-Regel um (Sicherung: `dropship/kategorien-sicherung/<handle>.json`).
2. `passt` zuerst über die Google-Kategorie (`gp(p, KD + 'Cookware & Bakeware')`), den Titel nur dort, wo die Kategorie ein Sammelbecken ist - und dann mit Wortgrenze: `wort('a|b')` (links und rechts kein Buchstabe), `anfang('wand')` (nach rechts offen: «Wandbild»), `ende_('waage')` (nach links offen: «Küchenwaage»). Ein blankes Teilwort ist der Fehler, den dieses Verfahren abschafft.
3. Test in `lib/kategorien_test.mjs` mit Gegenproben in beide Richtungen und echten Titeln/Google-Kategorien (Muster: «Hundeleine Stossdämpfend» darf NICHT in `pc-komponenten`). Zusammenfassung ans **Ende** der Datei.
4. Ablauf 1-4 oben; bei Basis-Kategorien ergibt `eltern`/`nach` den Menü-Eintrag, Altlasten stehen in `UMBAU`, gute Collections nur fürs Menü in `MENUE_NUR` (nur wenn live HTTP 200 und noch nicht verlinkt; `doppelt: true` erlaubt einen zweiten Eintrag).
5. Eine BESTEHENDE Titel-Regel-Collection mit Fremdkörpern wird nicht hier, sondern als Datensatz in `lib/kategorien_verengt_daten.json` verengt (ids `v-<handle>`; messen mit `automation/kategorie_regel_probe.mjs`, Erfassung `kategorien_verengen_erfassen.mjs`). Bekleidung kommt aus der Mode-Taxonomie (`dropship/mode-taxonomie-2610/ALLES.json`, `lib/mode_taxonomie.mjs`, ids `m-<handle>`), nicht aus Handeinträgen.

## Mode-Kategorien (Damen/Herren/Kinder, Schuhe, Taschen, Accessoires)

1. `MODE_BEREICHE` wählt die Bereiche (Vorgabe `bekleidung`). Phase 2 (`schuhe,taschen,accessoires`) = 127 Einträge (59 Kategorien + 68 Unterfilter), live seit 26.10.2026.
2. Rezept (`KATALOG` = frisch gelesener Katalog mit Google-Kategorie, bei Phase 2 `/tmp/katalog_mit_mode.json`): `MODE_BEREICHE=bekleidung,schuhe,taschen,accessoires KATALOG=… PREFIX=m- LIVE=1 PHASE=tags`, dann `… PHASE=sammlungen`.
3. Menü NICHT über `PHASE=menue` (Mode-Einträge haben kein `eltern`), sondern `node automation/mode_menue.mjs` (Trockenlauf Vorgabe; `LIVE=1` sichert nach `dropship/menu-sicherung/main-menu-vor-mode-2610.json`; `ABSCHNITT=schuhe` = Ast Schuhe, Sicherung `…-vor-schuhe-2610.json`; Exit 2 = Prüfungsfehler, 3 = Abweichung beim Nachlesen); Collections vorher anlegen.
4. Unterfilter-Chips: `MODE_BEREICHE=… [LIVE=1] node automation/kategorie_unterfilter.mjs` setzt die Metafelder `lux.unterfilter` / `lux.eltern` (Trockenlauf Vorgabe). Sie erscheinen nur im Theme-Entwurf 212498841991; ein Theme zu veröffentlichen ist ein Klick des Besitzers (Rückfall: 187533001089).
5. 6 Mode-Kategorien sind `bestehend` + `aktualisiere`: die Sammlungs-Phase stellt eine vorhandene Collection um UND überschreibt Titel/Text/SEO (Handle bleibt; Falle 13).
6. **Kundensicht prüfen:** je Collection `/collections/<handle>/products.json` (HTTP 200, Fremdkörper-Scan der Titel), alle Menülinks per HTTP-Abruf; Admin-API-URLs tragen den Präfix `/en/` - abziehen.

## Fallen

1. **Ledger überspringt Fertiges:** `dropship/kategorien_ledger.txt` merkt `tagsAdd <tag>`/`tagsRemove <tag>`; ein zweiter Lauf nach einem Import setzt ohne `FORCE=1` nichts («übersprungen (laut Ledger fertig)»). Nachziehen: frischer Katalog + `FORCE=1 LIVE=1 PHASE=tags` (erst `tagsRemove` für TAG-, dann `tagsAdd` für TAG+; TAG- nur bei vollständigem Katalog und nur für Kategorien über `min`); beide Spalten vorher lesen.
2. **Katalog unvollständig** (`vollstaendig:false`): Warnung, keine Bereinigung von Stale-Tags.
3. **Menü:** `menuUpdate` ersetzt den ganzen Baum (höchstens 3 Ebenen); `dropship/menu-sicherung/main-menu-vor-umbau-2510.json` wird bei jedem LIVE-Menülauf überschrieben - vorher kopieren. Einzelne Einträge sicher: `menu_eintrag_einfuegen.mjs` (`ELTERN`, `NACH`, `HANDLE`, `TITEL`, `LIVE=1`).
4. **Publish-Falle:** per API angelegte Collections sind nicht im Onlineshop publiziert → 404 (18.10.: 80 Collections, 25 320 Produkte). `PHASE=sammlungen` kopiert die Kanäle von `hype-jetzt`; fehlt sie, bleiben neue Collections unpubliziert (aus dem Code gefolgert, nicht getestet). `resourcePublicationsV2` täuscht (169 «nicht im Onlineshop», live 4 von 5 Stichproben 200): nur der HTTP-Abruf zählt.
5. **Mitgliedschaft entsteht verzögert** (Shopify füllt Smart-Collections nachträglich, auch nach Tag-Änderungen ~20 s); die Zählung kann zu klein sein - nach einer Minute wiederholen, nicht neu schreiben.
6. **Umbenennen ohne Handle-Änderung** (`sub-deko` heisst «Dekoration»), sonst brechen Links; Handles nie raten (`fur-ihn`, nicht `fuer-ihn`; `auto-handy-laden` gab 404).
7. **Wildcard-Suche lügt:** `title:*Armatur*` findet «Küchenarmatur» nicht → Muster lokal auf der Katalogdatei auswerten und vorher zählen.
8. Handle belegt mit anderer Regel: wird nicht überschrieben («⚠ … Handle ist belegt») - Entscheid beim Menschen.
9. Titel ändern (Skill `titel-wahrheit`) kann die Kategorie ändern → danach Katalog neu + Schritt 2-3.
10. Das Theme zeigt Unterkategorien-Chips von selbst aus den Geschwistern im Menü (kein Tag nötig); bei Mode-Kategorien stattdessen aus Metafeldern (Mode-Abschnitt, Punkt 4).
11. `bewertung_zuerst.mjs` schaltet jede bearbeitete Collection auf `MANUAL` und wertet nur Regeln mit `TAG`/`TITLE`/`TYPE` lokal aus (andere: «nicht lokal auswertbar», übersprungen).
12. **Immer `PHASE=tags|sammlungen|menue` angeben:** `LIVE=1` ohne PHASE (Vorgabe `alle`) führt Tags, Sammlungen UND Menü-Umbau aus; das Menü zeigt der Trockenlauf nur mit `PHASE=menue`.
13. **Sicherungen werden nicht überschrieben:** `kategorien_anlegen.mjs` schreibt `dropship/kategorien-sicherung/<handle>.json` nur, wenn sie fehlt (`existsSync`); früher ersetzte ein zweiter Lauf den Originalstand durch den umgebauten (6 Originale). Notfall: `git checkout -- dropship/kategorien-sicherung/`.
14. **Handle und Tag nur a-z, 0-9, Bindestrich:** Shopify macht aus «ö» im Handle ein «o» (`damen-geldboersen-langbörsen` → `-langborsen`), das Tag `sort-<handle>` behielt den Umlaut, der Plan fand die Collection nicht. `lib/mode_taxonomie_test.mjs` prüft jetzt alle Handles und Tags der vier Bereiche.
15. **Shopify-Tags sind diakritik-unempfindlich:** `tagsRemove` von `sort-x-ö` entfernte auch das gerade gesetzte `sort-x-o`: 19 Produkte hatten kurz kein Tag, die Seite war ~2 Minuten ausgedünnt (per `tagsAdd` behoben). Ein Tag nie durch eine nur in Akzenten abweichende Variante ersetzen; nach `tagsAdd`/`tagsRemove` am Produkt prüfen (`collection.products(first:50){tags}`), denn die Tag-Suche (`products(query:"tag:…")`) zeigt Altstand.

## Gegenproben

- **Vor jedem LIVE grün** (Repo-Wurzel, `/opt/node22/bin/node automation/lib/<Datei>.mjs`, letzte Zeile «N ok, 0 Fehler»; Stand 26.10.2026, Zahlen vor dem Zitieren neu laufen lassen): `kategorien_test` (132), `kategorien_verengt_test` (59), `mode_taxonomie_test` (47), `mode_menue_test` (41), `regel_auswerten_test` (9). Je nach Änderung zusätzlich `tassen_regel_test` (87), `unterfilter_plan_test` (14), `banner_fotos_test` (30), `automation/menu_eintrag_einfuegen_test.mjs` (12); `lib/menue_plan.mjs` hat keine eigene Testdatei.
- **Vor LIVE:** `MITGL` je Kategorie gegen Erwartung, `TAG-` gross? → Liste lesen (ein zu breites Muster sieht aus wie «weniger Artikel»; Warnsignal: auffällige Verteilung, z. B. 89 % auf ein Ziel).
- **Nach LIVE:** Katalog neu lesen, Trockenlauf wiederholen → `TAG+` und `TAG-` müssen 0 sein; `Mitglieder n / erwartet m` mit n >= 90 % von m; Sperr-Tag-Produkte in keiner `sort-`-Collection (Schritt 5: n = 0).
- Collection live: `curl -s -o /dev/null -w '%{http_code}' "https://luxestyle.ch/collections/<handle>?cb=$(date +%s)"` → 200 (429 ist keine 404: nachfassen).
- Menü: «Vergleich gesendet ↔ zurückgelesen: {"gleich":true,"nurGesendet":0,"nurZurueck":0}»; danach `kategorie_pruefer.mjs` (Fremdkörper vorher/nachher).
