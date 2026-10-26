---
name: kategorien-nach-google
description: Immer wenn bei LuxeStyle Kategorien, Collections oder das Hauptmenü angelegt, geändert oder geprüft werden - neue Kategorie, Fremdprodukt auf einer Kategorieseite, Collection mit 404, Unterkategorien, Menü-Umbau, neue Produkte einsortieren, Reihenfolge nach Bewertung, Label-Bilder. Beschreibt das Verfahren Google-Kategorie statt Titel-Wortteil, Tags sort-..., Collection nur am Tag, Trockenlauf-Phasen (tags, sammlungen, menue), Prüfer, Fallen (Ledger, Menü-Ersetzen, Publish-Falle) und Gegenproben.
---

# Kategorien nach Google-Kategorie: Tags `sort-…`, Collections, Menü, Prüfer

**Regeln stehen in** `automation/lib/kategorien.mjs` (88 Kategorien in `KATEGORIEN` + 5 `BEREINIGUNG`-Regeln, rein, ohne Netz), **Menü-Umbau in** `automation/lib/menue_plan.mjs`.
**Selbsttest:** `node automation/lib/kategorien_test.mjs` → «132 ok, 0 Fehler» (26.10.2026). Node = `/opt/node22/bin/node`; Trockenlauf ist überall Vorgabe, `LIVE=1` schreibt.
**Zugang:** `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials). Marken: **GEMESSEN** (Livezahlen aus dem CLAUDE.md-Stand 25./26.10.2026, nicht neu gemessen; Testzahl und Kategorienzahl am 26.10.2026 selbst gelaufen) · **SETZUNG** · alles andere steht im Code.

## Warum nach Google-Kategorie (GEMESSEN 25.10.2026)

- Smart-Collections mit «Titel enthält …» **kennen keine Wortgrenze**: «SSD» steckt in «Stossdämpfend» (Hundeleine unter PC-Komponenten), «Wimpern» in «Wimpern-Bordüre», «Tasse» in «Tassel», `spitzer` in «spitzer Zehe», «Glock» in «Glockenärmel». Jede Seite, die der User öffnete, zeigte bald einen Fremdkörper (98 Titel-Regel-Collections mit Fremdkörpern, `dropship/kategorie-fremdkoerper.json`).
- Das Metafeld `mm-google-shopping.google_product_category` ist bei 54 993 von 56 636 aktiven Produkten gesetzt (97 %) und kommt aus der echten CJ-Kategorie.
- **Aber:** wo die Google-Kategorie nur der Oberbegriff ist (`Hardware > Tools` ohne Zusatz, 245 Artikel: Holzbürste, Nagelfräser, Pantoffeln, Harzfarbe), entscheidet der **Titel** (`werkzeugArt()`); Schuhe haben nur `Apparel & Accessories > Shoes`. Eine Kategorie ist so gut wie ihre Genauigkeit - nie am Oberbegriff messen.
- Tags heissen **`sort-…`** (nie `kat-…`: `kat-kissen` mit 1178 Treffern kollidierte); einzige Ausnahme `tassen-becher`. Die Collection hängt **nur am Tag** (`TAG EQUALS <tag>`, `BEST_SELLING`).
- Produkte mit Sperr-Tag (`SPERR_TAGS`: adult-nicht-bewerben, 18plus, gmc-adult-pull, raucher-rueckhol-0809, nicht-bewerben, compliance-pruefen, waffenzubehoer-nicht-verkaufen, stecker-nicht-ch) kommen in **keine** Themenkategorie (`gehoertIn()` → false).

## Wann einsetzen

- «Produkte sauberer sortieren», «Kategorie für X anlegen», «auf Seite Y steht ein falsches Produkt», «Kleider bei Männern und Frauen trennen».
- Nach jedem grösseren Import (neue Produkte tragen den `sort-`-Tag noch nicht).
- Eine Collection liefert 404, ein Menü-Link ist tot, Unterkategorien-Chips fehlen.

## Befehle (Repo-Wurzel)

```bash
N=/opt/node22/bin/node
# 1. Katalog FRISCH lesen (Bulk, ~1 Min.; Datei {gelesen, vollstaendig, produkte[{id,handle,title,productType,tags,g}]}). Alte Dateien liefern alte Tags!
$N automation/katalog_bulk.mjs /tmp/katalog_voll.json            # stdout {gelesen,objekte,datei}; Alternative (seitenweise, 20+ Min.): AUS=/tmp/katalog_voll.json $N automation/katalog_titel_scan.mjs

# 2. Trockenlauf: Tabelle KATEGORIE MIN MITGL TAG+ TAG- STATUS   (neu | umstellen | ZU KLEIN → wird nicht angelegt)
$N automation/kategorien_anlegen.mjs                              # Vorgabe KATALOG=/tmp/katalog_voll.json
IDS=kissen,vasen LISTE=/tmp/kat_listen.txt $N automation/kategorien_anlegen.mjs    # nur diese; LISTE schreibt je Kategorie ALLE Titel zum Durchlesen
#    Bei IDS=… entfallen die BEREINIGUNG-Regeln, ausser BEREINIGEN=1.

# 3. LISTEN LESEN - beide Seiten: wer kommt neu rein (TAG+), wer fliegt raus (TAG-). Erst dann:
LIVE=1 PHASE=tags       $N automation/kategorien_anlegen.mjs      # CONC=3 (parallel), 20 Aliase je Mutation, Throttled-Retry
LIVE=1 PHASE=sammlungen $N automation/kategorien_anlegen.mjs      # legt an/stellt um, publiziert, wartet 20 s und zählt Mitglieder «n / erwartet m»
PHASE=menue             $N automation/kategorien_anlegen.mjs      # Trockenlauf des Menüs: «MENÜ-VORSCHAU», Tiefe <= 3
LIVE=1 PHASE=menue      $N automation/kategorien_anlegen.mjs      # menuUpdate + Rücklesen; Exit 2 = mehr als 3 Ebenen, Exit 3 = zurückgelesener Baum weicht ab

# 4. Prüfer (nur lesen): wertet jede Collection-Regel lokal aus; schreibt dropship/kategorie-pruefung.csv und dropship/kategorie-fremdkoerper.json
NUR_MENUE=1 MIN=20 $N automation/kategorie_pruefer.mjs            # ZEIGE=45 ZEIGE_FK=40 begrenzen die Ausgabe; KATALOG=… wie oben
#    Nach JEDEM Menü-Umbau erneut laufen lassen.

# 5. Sperr-Tags: sort-Tags von gesperrten Produkten entfernen (Trockenlauf zeigt die Zahl)
KATALOG=/tmp/katalog_voll.json $N automation/sperr_sort_tags_entfernen.mjs          # «Produkte mit Sperr-Tag UND sort-Tag: n» + 12 Beispiele
LIVE=1 KATALOG=/tmp/katalog_voll.json $N automation/sperr_sort_tags_entfernen.mjs   # tagsRemove in Blöcken zu 10

# 6. Gut bewertete zuerst (manuelle Reihenfolge je Collection; Bulk-Zwischenspeicher 6 h, NEU=1)
MENUE=1 $N automation/bewertung_zuerst.mjs                        # alle Menü-Collections, Trockenlauf; HANDLES=a,b LIVE=1; MIN_MITGLIEDER=10 MAX_OBEN=120
BEST_SELLING=1 LIVE=1 HANDLES=a,b $N automation/bewertung_zuerst.mjs   # rückgängig: sortOrder zurück auf BEST_SELLING. Neue Produkte landen danach hinten → periodisch wiederholen.

# 7. Label-Bild je Kategorie (echte Bestseller-Fotos, Gemini prüft: kein Text, keine Masspfeile, kein Logo)
HANDLES=haustier-hunde,schmuck $N automation/kategorie_bilder.mjs  # rendert PNG nach /tmp/kategorie_bilder; ALLE=1 LIVE=1 für alle; FORCE=1, KI=0
```

## Neue Kategorie bauen

1. Eintrag in `KATEGORIEN` (`lib/kategorien.mjs`): `id`, `handle` (nie raten, vorher `collectionByHandle`/HTTP prüfen), `titel`, `tag: 'sort-…'`, `min: 15`, `beschreibung`, `seoBeschreibung` (Muster: «… Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.»),
   `eltern: ['Wohnen & Garten','Küche & Kochen']` (Menüpfad, `[]` = oberste Ebene), `nach: '<Geschwistertitel davor>'`, `passt: p => …`; `bestehend: true`, wenn eine vorhandene Collection auf Tag-Regel **umgestellt** werden soll (Sicherung nach `dropship/kategorien-sicherung/<handle>.json`).
2. `passt` zuerst über die **Google-Kategorie** (`gp(p, KD + 'Cookware & Bakeware')`), den Titel nur dort, wo die Kategorie ein Sammelbecken ist - und dann mit **Wortgrenze**: `wort('a|b')` (links und rechts kein Buchstabe), `anfang('wand')` (Zusammensetzung nach rechts offen: «Wandbild»), `ende_('waage')` (nach links offen: «Küchenwaage»). Ein blankes Teilwort ist der Fehler, den dieses Verfahren abschafft.
3. Test in `lib/kategorien_test.mjs` mit **Gegenproben in beide Richtungen** und echten Titeln/Google-Kategorien (Muster: «Hundeleine Stossdämpfend» darf NICHT in `pc-komponenten`). Zusammenfassung ans **Ende** der Datei.
4. Ablauf 1-4 oben; ein Menü-Eintrag entsteht aus `eltern`/`nach`, Altlasten stehen in `UMBAU`, bereits gute Collections nur fürs Menü in `MENUE_NUR` (werden nur eingefügt, wenn live HTTP 200 und noch nicht verlinkt; `doppelt: true` erlaubt einen zweiten Eintrag).

## Fallen

1. **Ledger überspringt Fertiges:** `dropship/kategorien_ledger.txt` merkt `tagsAdd <tag>`/`tagsRemove <tag>`. Ein zweiter Lauf nach einem Import setzt **ohne `FORCE=1` nichts** («übersprungen (laut Ledger fertig)»). Neue Produkte nachziehen: frischer Katalog + `FORCE=1 LIVE=1 PHASE=tags` (sendet nur die Differenz `TAG+`).
2. **Katalog unvollständig** (`vollstaendig:false`): der Lauf warnt und bereinigt Stale-Tags nicht.
3. **Menü:** `menuUpdate` **ersetzt den ganzen Baum**; höchstens 3 Ebenen. Die Sicherung `dropship/menu-sicherung/main-menu-vor-umbau-2510.json` wird bei **jedem** LIVE-Menülauf überschrieben - vor einer Wiederholung kopieren. Einzelne Einträge sicher: `menu_eintrag_einfuegen.mjs` (`ELTERN`, `NACH`, `HANDLE`, `TITEL`, `LIVE=1`).
4. **Publish-Falle:** per API angelegte Collections sind nicht im Onlineshop publiziert → 404 (18.10.: 80 Collections mit 25 320 Produkten). `PHASE=sammlungen` kopiert die Kanäle von der Collection `hype-jetzt`; **fehlt sie, bleiben neue Collections unpubliziert** (Folgerung aus dem Code, nicht getestet). `resourcePublicationsV2` täuscht (169 «nicht im Onlineshop», live 4 von 5 Stichproben 200) - **nur der HTTP-Abruf zählt**.
5. **Mitgliedschaft entsteht verzögert** (Shopify füllt Smart-Collections nachträglich); die Zählung nach 20 s kann zu klein sein - nach einer Minute wiederholen, nicht neu schreiben.
6. **Umbenennen ohne Handle-Änderung** (`sub-deko` heisst «Dekoration», Handle bleibt), sonst brechen Links. Handles nie raten: `fur-ihn` (nicht `fuer-ihn`), `auto-handy-laden` gab 404.
7. **Wildcard-Suche lügt:** `title:*Armatur*` findet «Küchenarmatur» nicht → Muster lokal auf der Katalogdatei auswerten und vorher zählen.
8. Handle belegt mit anderer Regel: wird **nicht überschrieben** («⚠ … Handle ist belegt») - Entscheid beim Menschen.
9. Titel ändern (Skill `titel-wahrheit`) kann die Kategorie ändern → danach Katalog neu + Schritt 2-3.
10. Das Theme zeigt Unterkategorien-Chips von selbst aus den Geschwistern im Menü; dafür ist kein Tag nötig.
11. `bewertung_zuerst.mjs` schaltet jede bearbeitete Collection auf `MANUAL` und wertet nur Regeln mit `TAG`/`TITLE`/`TYPE` lokal aus (andere: «nicht lokal auswertbar», übersprungen). In einer `MANUAL`-Collection landen **neue Produkte hinten** → Lauf periodisch wiederholen; rückgängig mit `BEST_SELLING=1 LIVE=1`.

## Gegenproben

- `kategorien_test.mjs` grün (132) **vor** jedem LIVE; jede neue Regel mit mindestens einer Ja- und einer Nein-Probe aus echten Titeln.
- **Vor LIVE:** `MITGL` je Kategorie gegen Erwartung, `TAG-` gross? → Liste lesen (zu breites Muster sieht aus wie «weniger Artikel», nicht wie ein Fehler: eine auffällige Verteilung, z. B. 89 % auf ein Ziel, ist das Warnsignal).
- **Nach LIVE:** Katalog neu lesen und Trockenlauf wiederholen → `TAG+` und `TAG-` müssen **0** sein; `Mitglieder n / erwartet m` mit n >= 90 % von m.
- Collection live: `curl -s -o /dev/null -w '%{http_code}' "https://luxestyle.ch/collections/<handle>?cb=$(date +%s)"` → 200 (429 ist keine 404: nachfassen).
- Menü: Ausgabe «Vergleich gesendet ↔ zurückgelesen: {"gleich":true,"nurGesendet":0,"nurZurueck":0}»; danach `kategorie_pruefer.mjs` (Fremdkörper-Liste vorher/nachher).
- Sperr-Tag-Produkt darf in keiner `sort-`-Collection stehen: `sperr_sort_tags_entfernen.mjs` meldet «Produkte mit Sperr-Tag UND sort-Tag: 0».
