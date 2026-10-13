## 1. Lage

1. **Herkunft der Käufer:** Die letzten 7 behaltenen Käufe (#1020–#1026, 29.09.–12.10.) kamen 4× ohne erkennbare Herkunft («direkt»: #1020, #1023, #1024, #1025). Je 1× kamen sie über Google ohne Werbung (#1026), die ChatGPT-Websuche (#1021) und die Shop-App (#1022). Seit Juli kam kein einziger behaltener Kauf über Werbung oder Social (GEMESSEN, customerJourneySummary).
2. **Tempo:** Es zieht an: 7 behaltene Käufe in 15 Tagen, vorher ≈ 0,4 pro Woche (03.08.–28.09.: 3). Das bei nur ≈ 19 echten Schweizer Sitzungen pro Tag. Die Kasse ist dicht: 05.–13.10. 173 Sitzungen → 9 Warenkörbe → 5 Kassen → 4 Käufe (GEMESSEN, ShopifyQL human + Switzerland).
3. **Was fehlt:** Verkehr mit Kaufabsicht.
   - Google-Werbung steckt im Kontingent fest. Es gibt 561'366 aktive Varianten, das Standard-Kontingent sind 150'000 Artikel (QUELLE support.google.com/merchants/answer/16564100). ≈ 48 % der Produkte melden «Over capacity», darunter die drei Produkte, die über Google verkauft haben (GEMESSEN).
   - Die Gratis-Einträge fielen von 7–10 auf 1–4 Sitzungen pro Woche (GEMESSEN).
   - Social bringt Reichweite, aber keinen Kauf: TikTok bezahlt und organisch, Facebook, Instagram, YouTube und Pinterest zusammen 0 Käufe in 120 T (GEMESSEN).
4. **Zwei Lecks im eigenen Haus, genau vor Halloween** (Bestellschluss CH-Lager laut Metafeld `luxe.anlass_hinweis`: Mo, 26. Okt.):
   - Der Warenkorb rechnet bei CH-Lager-Ware CHF 7 Versand dazu, den die Kasse nicht verlangt (27.90 → 34.90). GEMESSEN heute 20:45 UTC: `layout/theme.liquid` und `snippets/cart-summary.liquid` prüfen `profil-ch-lager` nicht. Seit 20:14 öffnet die Schublade automatisch, der falsche Betrag erscheint also sofort.
   - `/collections/halloween` zeigt oben abgeschnittene Hand, Horrorpuppe, Blutiges Herz und Theaterblut, kein einziges ganzes Kostüm (GEMESSEN 20:45).

---

## 2. Sofort selbst (Sitzung)

Reihenfolge nach erwarteten Käufen × Gewissheit. Ausführen in genau dieser Reihenfolge: Punkt 2 wirbt mit «gratis, schnell», und das darf der Warenkorb nicht widerlegen.

### S1. CH-Lager-Warenkorb rechnet wie die Kasse
**Erwartung:**
- +0,1–0,3 Käufer pro Woche (VERMUTUNG).
- Der Fehler selbst ist sicher (GEMESSEN): 1'611 aktive Produkte mit `profil-ch-lager`, 1'013 davon unter CHF 45.

**Schritte:**
1. **Abstimmen.** Die Kauf-Strecke-Session hat heute `templates/product.json` (20:07), `sections/header-group.json` und `layout/theme.liquid` (20:14) geändert. Darum als Nachtrag zu Kauf-Strecke Klasse 16 arbeiten, eine Zeile in SHARED-MEMORY.md, nicht parallel. Alle Dateien frisch live holen, Backup `theme_backup/…-vor-chlager-korb`.
2. **`snippets/cart-summary.liquid`, Block LUX-GRATISVERSAND:** Bedingung «jede Korbposition trägt `profil-ch-lager`», nach dem Muster `lux_ohne_marke` aus `lux_cart_trust`. Text: «Gratis-Versand · Ware ab Schweizer Lager». Dazu `data-lux-alle-chlager="1"` ausgeben.
3. **JS-Balken in `layout/theme.liquid`** (VERSAND=700, Z. ~438–445): Der Balken liest das Attribut und zeigt «Gratis-Versand gesichert». Er lädt 350 ms nach `/cart/` neu (Wettlauf). Darum entweder auf das Neuzeichnen-Ereignis hören oder eine eigene Ansicht `/cart?view=lux-chlager` (layout none, JSON) abfragen.
4. **`templates/cart.json` `lux_cart_trust`:** die feste Zeile «Versand CHF 7.00 · gratis ab CHF 50» streichen. Das ist schon entschieden (KASSEN-PRUEFUNG, KAUFSTRECKE Klasse 16).
5. **`templates/product.json` `lux_trust` und `lux_delivery`:** ein Zweig für `profil-ch-lager`: «Gratis-Versand für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50)».
6. **Kollektionstexte:** nur `kostueme-ch-lager` umschreiben (1'528 von 1'540 im Profil). NICHT `blitzversand-schweiz` (764 ohne Profil) und `blitzversand-highlights` (0 von 22), jedenfalls nicht vor Stufe 3 (frühestens 17.10.).
7. **Notschalter** ist das Produkt-Zeichen `profil-ch-lager`. Das Metafeld `luxe.ch_lager_stufe` gibt es nicht.

**Wächter:**
- `automation/warenkorb_gratisversand.py --pruefen` wird erweitert und prüft, dass die Profil-Bedingung in allen drei Live-Dateien steht.
- Danach `versand_band_wache.py` und `liefergebiet_text_wache.py` laufen lassen.

**Prüfung:**
- `tools/kaufweg_handy.mjs --produkt maske-mit-hornvieh-mit-moos-ftck13817`: Warenkorb = Kasse = 27.90.
- Gegenprobe CJ-Artikel unter 45: CHF 7.
- Gegenprobe Mischkorb: CHF 7 (`automation/ch_lager_profil.py --test`).

**Messung nach 7 T:**
- Echte CH-Sitzungen, Schritt Warenkorb → Kasse (heute 5 von 9).
- Bestellungen mit reiner CH-Lager-Ware unter CHF 45 (heute 0).

**Aufwand:** ~2 h.

### S2. Halloween verkaufen: ganze Kostüme oben, Datum im Band, geprüfte Lieferkette
**Erwartung:**
- 0,3–0,8 Käufe bis 31.10., also ≈ 0,2–0,4 pro Woche, danach 0 (VERMUTUNG).
- Basis GEMESSEN: 16 Halloween- und Kostüm-Landungen in 9 T, 0 Warenkörbe, 11 davon über ChatGPT. Der neue CJ-Hinweis (f069e83c2) schickt alle CJ-Halloween-Besucher auf `/collections/halloween`.

**Schritte:**
- **0. Voraussetzung: Fortura-Kette trocken prüfen.**
  - GEMESSEN 20:45: `dropship/_fortura_bestellungen.tsv` enthält nur die Kopfzeile. Stufe 2 (XML, aktiv seit 06.10.) hat noch nie eine echte Bestellung hochgeladen.
  - `fortura_xml.bau_orders_xml` mit einer erfundenen Bestellung aufrufen (Draculagebiss, Testadresse, OHNE Upload) und gegen die Vorlage in `dropship/fortura/` prüfen.
  - Den DESADV-Leser mit der Musterdatei füttern.
  - `automation/bestell_ampel.py` muss die Zeile «FORTURA: … bereit» zeigen.
  - Scheitert etwas, kommt in b und c kein Datum, nur «das genaue Datum zeigt die Kasse».
- **a. Sortierung** in `automation/anlass_lieferzeit_wache.py`, Funktion `ziel_reihenfolge()`, nur für `halloween` (MANUAL): ein zweiter Schlüssel innerhalb der schnellen Lager-Ware.
  - Reihenfolge: ganzes Kostüm (Titel mit «Kostüm» oder «Kinderkostüm» UND Option «Grösse») vor Zubehör vor Deko.
  - Erst DRY laufen lassen, die Top 12 als Kontaktbogen per Vision prüfen. Ziel: mindestens 8 ganze Kostüme, keine Blutbilder ganz oben.
- **b. Band `ls_announce_4`** in `sections/header-group.json` (alle 5 Texte haben heute keinen Link).
  - Die Wache schreibt: «Halloween-Kostüme ab Schweizer Lager: bis {schnell_bis_text} bestellt, in der Schweiz vor Halloween da», mit Link `/collections/halloween`.
  - Nach `schnell_bis` stellt sie den alten Text aus dem Ledger wieder her.
  - Das Datum kommt nur aus dem Metafeld, nie «Di 27.10.».
- **c. Kollektionssatz:** «Last-Minute? …» auf `halloween` und `kostueme-ch-lager` wird durch denselben Datumssatz ersetzt. Die Wache setzt und entfernt ihn. Immer «in der Schweiz», denn LI hat 12–42 T Transit.
- **d. Fremdware aus `kostueme-ch-lager`**, die Sortierung CREATED_DESC bleibt.
  - GEMESSEN oben: LED-Handschuhe, «Deko-Set Glitzer-Kronleuchter» (Tag `kinderkostuem`), «Wintermütze … Weihnachten», Zimmermädchenset.
  - Den falschen Tag entfernen. Den Tag-Setzer für Länder-Caps und -Shirts finden und eine Fanartikel-Ausnahme einbauen. Immer DRY und mit Wortgrenzen (Regel 9b).
- **e. Startseite:** die Halloween-Reihe in `templates/index.json` bis 26.10. vor `pl_herbst` ziehen.
  - Erst nach a, sonst zeigt die Startseite die abgeschnittene Hand.
  - Prüfen, dass `homepage_katalog_rotation.py` die Reihenfolge nicht zurücksetzt.
- **Nicht anfassen:** Stufe 2 mit Halloween-Vorrang ab 14.10. 00:00 läuft schon (`ch_lager_profil.py halloween_vorrang()`).

**Wächter:** `anlass_lieferzeit_wache.py` prüft Band, Satz und den Anteil ganzer Kostüme in den Top 12 gegen das Metafeld. Der Aufseher lässt sie schon täglich laufen.

**Prüfung:**
- WebFetch auf `/collections/halloween` (nicht curl, wegen Bot-Cache).
- `tools/kaufweg_handy.mjs` auf ein CH-Lager-Kostüm: Kassendatum ≤ Fr 30.10.

**Messung nach 7 T:**
- ShopifyQL `human_or_bot_session='human' AND session_country='Switzerland'` auf die Landeseiten `halloween` und `kostueme-ch-lager`: Sitzungen und Warenkörbe (heute 0 von 16).
- Bestellungen mit Kostüm-Positionen.

**Aufwand:** 3–4 h.

### S3. Unbelegte Versprechen aus KI-lesbaren Texten entfernen (Voraussetzung für B2)
**Erwartung:** ≈ 0–0,05 Käufer pro Woche (VERMUTUNG). Hintergrund: ChatGPT landet auf Kollektionen (31 Sitzungen in 90 T), und Microsoft lehnte am 01.10. wegen «irreführend» ab.

**Befund (GEMESSEN, Skeptiker KI):**
- 181 veröffentlichte Kollektionen mit «✔ Geprüfte Angaben/Qualität».
- 145 mit «Schnelle Lieferung».
- 109 mit «Premium».
- Im Organization-JSON-LD steht der Slogan «Premium Style. Schweizer Seele.», und es gibt zwei Organization-Blöcke.

**Schritte:**
1. DRY-Liste je Floskel, mit Wortgrenzen.
2. Ersetzen durch belegte Aussagen oder streichen.
3. Die Vorlage `automation/keyword_kollektionen.py:54` erzeugt «✔ Geprüfte Angaben» für jede neue Kollektion; sie wird mitgeändert.
4. Den Slogan aus dem JSON-LD nehmen und die zwei Organization-Blöcke zu einem zusammenführen (Live-Datei holen).
5. «Gratis-Versand ab CHF 50» ohne Land wird zu «… in der Schweiz».

**Wächter:**
- `automation/versprechen_wache.py` wird auf Kollektionen (Beschreibung + SEO) und das Organization-JSON-LD erweitert.
- Prüfen, ob `versand_band_wache.py` Regel 2 Kollektionen abdeckt (VERMUTUNG: nein).

**Messung nach 7 T:** Wache meldet 0 Funde; erst dann B2 auslösen.

**Aufwand:** ~2 h.

### S4. Pinterest-Halloween-Vorrang auf die Wahrheit stutzen
**Erwartung:** ≈ 0 Käufer (Pinterest 120 T: 116 Sitzungen, 0 Käufe). Der Punkt verhindert eine falsche Lieferzusage.

**Befund (GEMESSEN):**
- `dropship/_pinterest_vorrang.txt` enthält `halloween 2026-10-31`.
- Die Halloween-Pins vom 04., 07. und 12.10. waren CJ-Ware mit 10–20 WT Lieferzeit, zuletzt «Halloween-Kostüm: Korsett-Dress». Es trägt keinen `kostuem`-Tag, und die Sperre prüft nur Tags.
- Die neue Social-Sperre (af54e13c7) greift erst ab 15.10.

**Schritte:**
1. Enddatum auf 2026-10-26 setzen.
2. Den Vorrang auf Ware mit `profil-ch-lager` beschränken.
3. Die Kostüm-Sperre in `automation/metricool_pinterest_pin.mjs` zusätzlich auf den Titel anwenden (Wortgrenze «Kostüm»).

**Wächter:** Trockenlauf der Kandidatenwahl zeigt 0 CJ-Halloween-Artikel.

**Aufwand:** ~30 Min.

### Messplan für alle Punkte
- **Basis:** 7 behaltene Fremdkäufe in 15 T, das sind ≈ 3,3 pro Woche (GEMESSEN).
- **Wöchentlich:** `tools/webseite_bilanz.py` mit Quellen-Aufschlüsselung, dazu immer `session_country='Switzerland'` und `utm_source`. Für ChatGPT nicht `referrer_name='chatgpt'` nehmen, das zählt 14 statt 111.
- **Keine Zuschreibung auf einzelne Punkte:** Am 13.10. gingen 6 Änderungen gleichzeitig live (Banner, Schublade, LI-Leiste, Halloween-Hinweis, Profil, P1D). Mit ≈ 4 Käufen in 9 Tagen lässt sich keine davon einzeln belegen. Gemeinsam auswerten am 24.10.

---

## 3. Betreiber-Klicks (ohne Geld)

### B1. Markenprofil und Shop-Beschreibung (≈ 10 Min.)
Agenten und die Shop-App lesen heute ein leeres Profil. Die Kurzbeschreibung ist mitten im Wort abgeschnitten («…ausgewähl»). `shop.description` lautet weiter «… schnellem Versand in die Schweiz **und nach Deutschland**» (GEMESSEN 20:45).

1. Am Handy admin.shopify.com öffnen → Einstellungen → Marke. Logo, quadratisches Logo und Titelbild hochladen (die Dateien legt die Sitzung vorher in Shopify-Dateien bereit), Farben wie im Theme.
2. Slogan: «Online-Shop aus Belp für die Schweiz & Liechtenstein».
3. Kurzbeschreibung (134 Zeichen): «LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke. Versand in die Schweiz und nach Liechtenstein, TWINT & Klarna, 30 Tage Rückgabe.»
4. Onlineshop → Einstellungen/Präferenzen → Startseiten-Meta-Beschreibung ersetzen durch: «LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke online. Versand in die Schweiz und nach Liechtenstein, TWINT, Klarna & Karte, 30 Tage Rückgabe.»
5. Speichern und einen Screenshot schicken.

Danach prüft die Sitzung per Storefront-API `shop{description brand{…}}` und hängt diese Prüfung an `knowledge_base_fakten --wache` an.

**Erwartung:** +0–0,05 Käufer pro Woche (VERMUTUNG). Die Shop-App brachte 1 behaltenen Kauf in ~10 Wochen, mit leerem Profil.

### B2. Microsoft Merchant Center, erst nach S3 und B1 (≈ 15 Min.)
1. ads.microsoft.com im Handy-Browser öffnen (Desktop-Ansicht) → Tools → Microsoft Merchant Center → Store «LuxeStyle». Zuerst einen Screenshot des Status schicken: Die Akten widersprechen sich (06.10. «Sperre aufgehoben», 07.10. «nie angestossen»).
2. Ist der Store abgelehnt: die Store-Beschreibung auf den Text aus B1 setzen, dann «Erneut zur Prüfung einreichen».
3. Nach der Freigabe: Kataloge → «Aus Google Merchant Center importieren» (Konto 5797470070), Land Schweiz, CHF.
4. Keine Kampagne anlegen, kein Zahlungsmittel eintragen. Fragt Microsoft nach Budget: abbrechen und melden.

**Erwartung:** ≈ 0–0,05 Käufer pro Woche (VERMUTUNG). Bing brachte 34 Sitzungen in 90 T ohne Warenkorb. Ob Microsoft in der Schweiz Gratis-Einträge zeigt, ist nicht bestätigt.

### B3. Google Merchant Center: Leistung der Gratis-Einträge exportieren (≈ 5 Min.)
1. merchants.google.com → Leistung → Berichte bzw. Produkte.
2. Filter «Kostenlose Einträge», Zeitraum 90 Tage.
3. Herunterladen (CSV) und in den Chat schicken.

**Nutzen:** Die Liste zeigt, welche Produkte Google überhaupt einblendet. Das ist die Grundlage für Test A und jede weitere Google-Auswahl. Direkt 0 Käufer.

### B4. Mehr Werbekontingent beantragen (≈ 10 Min., nicht dringend)
1. Das Formular «Request for additional quota» öffnen (verlinkt in support.google.com/merchants/answer/16564100).
2. Land Schweiz, Bereich Shopping-Anzeigen. Gewünscht **600'000 Artikel**, nicht 100'000: Das Standardkontingent ist schon 150'000, und Google zählt Varianten.
3. Begründung: 561'366 aktive Varianten.
4. Geht das Formular für ein von Shopify angelegtes Konto nicht: Shopify-Support-Chat, Kanal «Google & YouTube», Fehlertext «Over capacity for Shopping ads (in CSS program) [CH]».

**Erwartung:** direkt 0. Eine Genehmigung ist unwahrscheinlich (VERMUTUNG): Google prüft auch «traffic and performance», und das Konto hat ~CHF 15 Ausgaben und 0 Conversions.

### B5. Frage nach der Herkunft auf der Danke-Seite (≈ 10 Min., nur mit Gratis-Stufe)
1. apps.shopify.com → Suche «post purchase survey».
2. Nur eine App mit Gratis-Stufe ohne Kreditkarte nehmen, sonst lassen.
3. Installieren. Die Sitzung richtet danach eine Frage «Wie hast du uns gefunden?» ein: Google / ChatGPT / Instagram / TikTok / Empfehlung / Anderes.

**Nutzen:** 4 von 7 Käufen haben heute keine erkennbare Herkunft. Ohne diese Frage bleibt jede Kanal-Rangliste geraten. Direkt 0 Käufer.

### B6. WELCOME10 erhöht den Preis zwischen 45 und 49.99 (bestehender Entscheid, keine neue Frage)
Das ist Entscheid 2 der Kassen-Prüfung und Betreiber-Entscheid 4 in KAUFSTRECKE.

**Empfehlung:** Option 1, Gratis-Tarif ab 40.50, und zwar im General profile **und** im Profil CH-Lager. Wird nur eines geändert, entsteht ein Widerspruch: Ein Mischkorb zahlte weiter CHF 7, und `tarife_pruefen()` meldet die Abweichung.

**Vorbedingung:** Die Sitzung prüft vorher die Marge der 2'379 General-Produkte zu 40.50–44.99, ohne die CHF 7 Versandertrag (`_verkauf_gewinn_stand.json`).

**Erwartung:** 0–0,1 Käufer pro Woche (VERMUTUNG).

---

## 4. Budget-Entscheid

**Vorweg ehrlich:** Kein bezahlter Weg kauft hier Kunden zum Selbstkostenpreis. Jeder Neukunde über Werbung kostet nach heutigen Zahlen netto ~CHF 30–80 Verlust (VERMUTUNG). Für die 96 fehlenden Kunden bis 100 wären das ~CHF 3'000–7'700. Das ist eine Entscheidung über den Preis je Kunde, kein Werbetest.

Dazu ein Zielkonflikt: Jeder neue CJ-Import (+3'712 Produkte seit 06.10., GEMESSEN) und jede Massen-Änderung an einem Produkt verschlechtert die Sichtbarkeit in Google-Werbung.

### A. Google Standard-Shopping mit 13 Geschenkprodukten über Artikel-IDs

| Punkt | Inhalt |
|---|---|
| **Tagesbudget** | CHF 10, höchstens CHF 0.50 pro Klick |
| **Laufzeit** | bis das Restguthaben verbraucht ist: ≈ CHF 55 (VERMUTUNG, 25 Klicks × höchstens 0.60), also ≈ 5–7 Tage. Kein Nachladen ohne neuen Entscheid. |
| **Ziel-Produkte** (heute 0 CH-Meldungen, GEMESSEN) | Skelett-Herrenuhr 86.90, Elegante Damenuhr 71.90, Herren-Geldbörse Leder 75.90, Holzarmbanduhr 56.90, Übersetzungs-Kopfhörer 38.90, Herrenuhr «Sonne & Mond» 41.90, Strass-Damenuhr 48.90, 18K-Damenuhr 46.90, Moissanit-Ring 31.90, 3-in-1-Falt-Ladestation 34.90, Sirène 49.90, Retro-Damenuhr 44.90, Silberarmband 45.90. Gestrichen: UV-Sterilisator (Hype-Tag läuft am 14.10. ab, also eine Produktänderung; Text «Sterilisation») und Selfie-Stick (Hype-Tag) |
| **Abbruch** | CHF 30 ohne Warenkorb → Stopp. Als Erfolg zählt nur ein Kauf. |
| **Erwartung** | 0–0,5 Käufer pro Woche (VERMUTUNG). Gleichstand bräuchte 2,3 % Kaufquote (0.50 / Marge-Median 21.46). Gemessen sind ≈ 1 % bei Google ohne Werbung (3/290) und 0/25 beim bezahlten Test vom 10.10. **Ehrlich: etwa 1 Käufer pro CHF 50–100 Ausgabe, mit CHF 30–80 Verlust je Käufer.** Mit 15 statt «allen» Produkten sind auch nahe 0 Klicks möglich. |

**Betreiber, am Handy (ads.google.com, Desktop-Ansicht), ≈ 20 Min.:**
1. Shopify → Google & YouTube → Einstellungen → Google-Ads-Konto verknüpfen. Dieser Schritt war bisher übersprungen; ohne ihn fliessen Käufe nicht zurück.
2. Kampagne «Sales-Shopping-1» → Produktgruppen → «Alle Produkte» nach Artikel-ID unterteilen → die IDs der 13 Produkte einschliessen, «Alles andere» **ausschliessen**. Einen Screenshot VOR dem Einschalten an die Sitzung schicken; der Fehler vom 10.10. waren 25 Klicks auf fremde Ware.
3. Gebot 0.50, Budget 10. URL-Suffix `utm_source=google&utm_medium=cpc&utm_campaign=geschenke-test`.
4. Abrechnung: Guthaben ablesen. Nur bei weniger als CHF 30 die neue Karte eintragen.
5. Kampagne aktivieren.

**Sitzung bereitet vor:**
- Die ID-Liste aus `scratchpad/kaeufer/werbung-klein/testliste_item_ids.json` ohne UV und Selfie, im Format `shopify_zz_<pid>_<vid>`.
- Alle 13 Produkte auf `hype-seit-*` mit Ablauf im Testfenster prüfen, besonders die 3-in-1-Ladestation (Hype-Thema). Ebenso auf geplante Masstabellen-, SEO- und Bildläufe.
- Den Text der Übersetzungs-Kopfhörer auf Richtlinien prüfen.
- `dropship/_werbetest_aktiv.json` auf `geschenke-test` und die 13 Handles umstellen. Die Ampel prüft täglich die CH-Meldung und `updatedAt`. Fällt ein Produkt aus dem Kontingent, schrumpft die Liste; es wird **nicht** per Schreibvorgang «repariert».
- Täglich `BUDGET=<CHF> MARGE=21 python3 tools/werbetest_trichter.py geschenke-test`.

### B. Fortura-Probebestellung: schützt jede Halloween-Zusage

| Punkt | Inhalt |
|---|---|
| **Budget** | einmalig ≈ CHF 16 (Draculagebiss 15.90, CH-Lager-Versand 0.00). Der Betreiber bekommt die Ware. Als Eigenbestellung zählt sie nicht als Kunde. |
| **Laufzeit** | bestellen bis Mi 14.10., Ergebnis innerhalb ~5 WT |
| **Ziel** | Die Kette Engine → XML-Upload → Fortura → DESADV → DPD-Tracking → Ankunft einmal echt durchlaufen und die echten Tage messen. Stufe 2 hat das noch nie getan (GEMESSEN). |
| **Abbruch / Folge** | Hängt die Kette oder dauert es mehr als 4 WT: In S2 kein Datum, alle Texte nur «das genaue Datum zeigt die Kasse», und die Betreiber-Quittung `--bestellt` als Ersatzweg. |
| **Erwartung** | 0 Käufe direkt. Sie sichert die Zusage «bis 26.10. bestellt = vor Halloween da» für 1'611 Produkte und verhindert Erstattungen wie bei #1017/#1019. |

**Sitzung bereitet vor:** S2 Schritt 0 (Trockenlauf) muss vorher grün sein. Danach Ampel-Beobachtung von Bestellung bis Zustellung, Tage notieren in `dropship/CH-LAGER-PROFIL-…`.

---

## 5. Verworfen

| Vorschlag | Grund |
|---|---|
| Google Shopping breit (30–80 Produkte per `custom_label_0`) | Ein Label zu schreiben ist eine Produktänderung: Aurora stand 32 Min. danach auf «Over capacity». Das Metafeld `excluded_destination` entlastet das Kontingent nachweislich nicht (1'490 von 2'133 ausgeschlossenen Produkten tragen die Meldung trotzdem, GEMESSEN). Ersetzt durch A (Artikel-IDs, keine Schreibvorgänge). |
| Regel im Merchant Center `excluded_destination` für Billigware | Wirkung auf den Zähler unbelegt (VERMUTUNG); Risiko für die Gratis-Einträge, den einzigen gemessenen Google-Kaufkanal. Höchstens nach einer Probe an 1 Produkt. |
| `google_ads_kuration.py` als Kontingent-Hebel | 26'993 Schreibvorgänge ohne Entlastung. Als wirkungslos ausweisen. Ob der Lauf abgeschaltet wird, prüft die Sitzung gesondert (schreibt er nur Neuimporte, ist der Schaden klein). |
| Meta-Katalogwerbung für Kostüme | Marge im Median CHF 6–8 (DPD ist schon abgezogen), also ~CHF 40 Verlust je Käufer. Bezahlter Social-Verkehr 0 von 548 gekauft, Kostümseiten 0 von 49. CHF 140 reichen nicht aus der Lernphase. |
| TikTok- oder Pinterest-Werbung nachladen | CHF 143.71 → 0 Käufe; kein lesbarer Pixel; «Luxestyle_adv» CONTRACT_PENDING. |
| ChatGPT-Werbung | Mindestens $25/Tag ≈ CHF 700/Monat (BEHAUPTUNG einer Agentur). Der Gratis-Weg brachte schon 2 behaltene Käufe. |
| Microsoft-Shopping-Kampagne | 34 Bing-Sitzungen in 90 T, 0 Warenkörbe, kein UET-Tag. Nur der Gratis-Teil (B2). |
| US-Markt für die KI-Kaufkanäle (Agentic Storefronts) | Der Katalog filtert nach Käuferland, Schweizer kommen über die Websuche (91 % CH). Google AI Mode verlangt sogar einen Sitz in den USA. |
| Knowledge Base installieren | Am 07.10. erledigt (10 Fakten, Wächter täglich). |
| Schublade automatisch öffnen | Seit 20:14 live (d06ec5b09). |
| JSON-LD Versand und Rückgabe je Produkt | Seit 06.10. auf Organization-Ebene (`google_org_richtlinien.py`, Wächter). Eine zweite Quelle wäre ein Widerspruch zum CH-Lager-Profil. |
| FAQPage-JSON-LD auf Kollektionen | Google zeigt FAQ-Rich-Results seit 2023 nur für Behörden- und Gesundheitsseiten (QUELLE Google Search Central, nicht nachgeprüft). Wirkung auf ChatGPT = BEHAUPTUNG. Wäre eine dritte Quelle für Lieferdaten. |
| Meta-Beschreibung der Startseite auf «4–5 Werktage» | Seit P1D ist «meist 2–3» richtig. Die Änderung schüfe einen Widerspruch zur Kasse. |
| Influencer-Seite zum Käufer-Einstieg umbauen | Dort landen Leute, die ein Creator-Programm suchen (0 Körbe). Die Linkzeile existiert; höchstens nach oben schieben (1 Min.). Keine Creator-Ansprache (Verbot 06.10.). |
| Shop-App: 16 «nicht auffindbar» | 16 von 54'068 Produkten, die Wache zählt sie schon. Shop Campaigns gibt es nur in den USA und Kanada. |
| Pinterest als Käufer-Hebel (Halloween-Pins, Katalog wiederbeleben) | Metricool-Pins (`utm_campaign=metricool_pin`) brachten in 120 T 0 Sitzungen, Pinterest gesamt 116 Sitzungen und 0 Käufe. Kostüme stehen auf der Pinterest-Sperrliste. Übrig bleibt nur die Korrektur S4, höchstens 5 Min. Blick auf den App-Sync. |
| Klaviyo-Abbruch-Flow umbauen | 0 Empfänger seit 10.10. (alle Kassen kauften oder waren eigene Tests). Wirkungsmessung am 24.10. |
| Social-Kadenz als Käufer-Kanal zählen | Reichweite ohne Kauf. Läuft als Reichweite weiter, in Berichten getrennt ausweisen. |
| OpenSEO-KI-Tracker (6 Prompts × 2 Engines, wöchentlich) | 96 Credits im Monat bei 283 Guthaben (GEMESSEN). Höchstens nur ChatGPT, monatlich, 12 Credits je Lauf. ShopifyQL auf `utm_source=chatgpt.com` misst echte Käufer gratis. |
| Kontingent «gewünscht 100'000» | Liegt unter dem Standard von 150'000. In B4 korrigiert auf 600'000. |