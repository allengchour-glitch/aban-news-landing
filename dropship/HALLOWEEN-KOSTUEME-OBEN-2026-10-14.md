# Halloween: ganze Kostüme oben, Band mit Link, Startseite (14.10.2026)

Anlass: «fix weiter und verbessere», Plan S2 aus `dropship/MEHR-KAEUFER-2026-10-13.md`. Halloween ist der einzige Anlass, für den wir eigene Lagerware haben.
Letzter Bestelltag ab Schweizer Lager ist Mo, 26. Okt. (Metafeld `luxe.anlass_hinweis`).

## GEMESSEN (09:30 UTC, Prüfer + Admin-API)
- `/collections/halloween`: **0 ganze Kostüme in den Top 24.** Die ersten zwölf Artikel:
  - Platz 1–6: abgeschnittene Hand, Horrorpuppe, blutiges Herz, Gehstock, Latex-Ohren, Rucksackbeutel
  - Platz 7–12: Kreissäge, Theaterblut, Heugabel, Draculazähne, Draculagebiss, Hexenbesen

  57 ganze Kostüme ab Schweizer Lager waren vorhanden, das erste auf Platz 37.
  11 von 16 Halloween-Landungen in 9 Tagen kamen über ChatGPT, mit 0 Warenkörben.
- Die Startseiten-Reihe «Halloween» (Platz 6, unter «Herbst») zeigte deshalb Hand, Puppe und Herz.
- Keiner der 5 Bandtexte hatte einen Link. `kostueme-ch-lager` hatte keinen Halloween-Satz.
- `kostueme-ch-lager` enthielt fremde Ware: 13 Länder-Fanartikel (Caps, T-Shirts, Megafon) und eine Wintermütze.
  Die Fanartikel kamen über den Fortura-Importer (`kostuem-ch-front`, das Kostümwort-Muster trifft «Cap/Shirt/Mütze»),
  die Wintermütze über die eigene Wache (`kostuem-hut` liegt auf der ganzen Fortura-Gruppe «Hüte»).

## GETAN
- **Sortierung** (`automation/anlass_lieferzeit_wache.py`, nur Anlässe mit `kostuem_zuerst` in `data/anlass_kollektionen.json`).
  Innerhalb der schnellen Lagerware gilt diese Reihenfolge:
  1. ganzes Kostüm (Titel «Kostüm» + Auswahl Grösse)
  2. Kostüm in Einheitsgrösse
  3. Zubehör
  4. Deko, Blut und Spielzeug

  Die Deko-Klasse richtet sich nach Typ und Titel, nicht nach dem Tag `kostuem-accessoire`, denn den tragen auch Hand, Herz und Puppe.
  Die ganzen Kostüme kommen abwechselnd aus Kinder, Damen, Herren und Unisex.
  **Ergebnis live: Top 24 = 24 ganze Kostüme.** Der Kontaktbogen der Top 12 wurde per Auge geprüft: 12/12 ganze Kostüme, keine Blutbilder.
  WebFetch `/collections/halloween/products.json` zeigt dieselbe Reihenfolge.
- **Startseite** (`automation/homepage_katalog_rotation.py`): Im Endspurt steht die Saison-Reihe **vor** «Herbst».
  Endspurt heisst: vom Hinweis-Start bis `schnell_bis`, aus derselben Tabelle. Weihnachten bleibt unter «Herbst», ab 27.10. kehrt sich das selbst zurück.
  Die Selbsttests decken alle drei Fälle ab. Live: Halloween-Reihe auf Platz 5, Backup `theme_backup/index.json.rot-2026-10-14`.
- **Band** `ls_announce_4`: «🎃 Halloween-Kostüme ab Schweizer Lager – das Lieferdatum siehst du in der Kasse», Link `/collections/halloween`.
- **Kollektionssatz:** markierter Absatz `<p data-lux-anlass="halloween">` in `halloween` (ersetzt den alten Last-Minute-Satz) und in `kostueme-ch-lager` (neu).
- **Band und Satz** setzt die Wache im Endspurt und nimmt sie danach aus den Ledgern zurück (`dropship/_anlass_band.tsv`, `_anlass_satz.tsv`).
  Ein **Datum** («bis Mo, 26. Okt. bestellt …») steht erst drin, wenn `dropship/_fortura_probe_ok.json` `{"ok": true}` trägt.
  Das ist der Fall, sobald die erste echte Fortura-Bestellung zugestellt ist.
- **Fremdware:**
  - 13 Fanartikel und die Wintermütze haben `kostuem-ch-front` verloren (`dropship/_kostuem_ch_front_fan.tsv`), die Wintermütze zusätzlich das Zubehör-Zeichen.
  - Die Fortura-Importer vergeben das Zeichen nicht mehr an Fanartikel und Wintermützen/Beanies (Weihnacht nur MIT Mütze, «Mütze Nikolaus» bleibt).
  - Die Wache räumt beide Fälle täglich auf (`front_abgleich`, `KEIN_KOSTUEM_RE`).
- **Wächter** (Aufseher täglich, `--selbsttest && SCHARF=1`): Befund, wenn im Endspurt weniger als 8 ganze Kostüme oben 12 stehen.
  Ebenso, wenn Band oder Satz nicht dem Soll entsprechen oder nach dem Endspurt nicht zurück sind.
  Und wenn Fanartikel oder Wintermützen das Kostüm-Zeichen tragen.
  Alle Schreibwege fragen die Werbetest-Sperre.
- Selbsttests: `anlass_lieferzeit_wache` (+17 Fälle), `homepage_katalog_rotation` (+5 Fälle), beide grün.

## Regel
Eine Anlass-Seite zeigt oben, was man für den Anlass **kauft**, nicht was am meisten auffällt.
Die Klasse wird aus Typ und Titel gebildet, nie aus einem Tag, den Lieferanten-Gruppen breit vergeben.
Ein Lieferdatum steht nur dort, wo die Kette einmal echt durchgelaufen ist.

## OFFEN
1. **Betreiber: Probebestellung Fortura** `hexenbesen-fga99835` an eine Schweizer Adresse. Laut Plan war die Frist heute.
   Danach `dropship/_fortura_probe_ok.json` schreiben (Bestellnummer, Werktage), dann zeigen Band und Satz das Datum.
2. Platz 10 «Kostüm Weltraum Horror Clown» zeigt die Verpackung mit englischem Aufdruck. Das ist schwächer als ein Modellbild, aber kein Fehler.
3. Grenzfall LED-Handschuhe (Platz 1–2 in `kostueme-ch-lager`, Tag `winter-kaelte`): Ihre Einordnung wurde nicht entschieden.
4. Nebenbefunde aus der Messung:
   - Beschreibung «Zimmermädchenset» ist anzüglich (Google-Risiko).
   - «Fan-Megafon mit Musik»: Die Zeile «Gratis-Versand ab CHF 65» steht nur auf dem DRAFT-Doppel (`…-ftou612036`, gleiche SKU). Das aktive `…-fgaou612036` ist sauber, also kein Handlungsbedarf (GEMESSEN 09:42).
5. Wirkung messen am 21.10. (ShopifyQL human + Switzerland): Landeseiten `halloween` und `kostueme-ch-lager`, Sitzungen → Warenkörbe (vorher 0 von 16).
