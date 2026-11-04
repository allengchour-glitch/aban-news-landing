# R83 – lokale Quellenprüfung der nächsten fünf R82-P0-Produkte

Stand: 4. November 2026. Prüfung ohne Credentials, Installationen oder externe Writes. Die fünf öffentlichen JSON-Dateien stammen unverändert von https://luxestyle.ch/products/<handle>.js, Abruf 19:04:14 Europe/Zurich.

## Ergebnis

Für keines der fünf Produkte wurde lokal ein unabhängiger SKU-spezifischer CJ-/Lieferantendatensatz, ein Manual, Datenblatt, Zertifikat oder Rechtebeleg gefunden. Das Tag cj-real, CJ-artige SKUs, Shoptexte, Produktbilder und der Merchant-Feed sind keine unabhängigen Sachquellen. Sicher belegbar sind die aktuelle öffentliche Shopkonfiguration und klar bezeichnete visuelle Beobachtungen. Fehlende lokale Quellen bedeuten unbekannt, nicht dass extern keine Quelle existiert.

| Produkt | Sicher aus aktuellem Storefront-JSON | Kritische ungesicherte Claims | Hauptblocker |
|---|---|---|---|
| 15483793244545<br>Automatischer Seifenspender | CHF 52.90; available=true; 5 Variante(n); Farbe: Schwarz · 4 Stück, Schwarz, Blau, Schwarz · 2 Stück, Schwarz · 3 Stück; 10 Bilder, 0 Videos | Infrarot-Sensor und automatische Seifenabgabe; Touchlose Bedienung verhindere Kreuzinfektion bzw. verbessere die Hygiene; Design ohne Tropfenbildung | Betriebsart Batterie/Akku klären.; Paketinhalt je Mehrstück-SKU bestätigen. |
| 15509968880001<br>Hopfenfilter aus Edelstahl | CHF 23.90; available=true; 2 Variante(n); Grösse: 29CM, 18CM; 6 Bilder, 0 Videos | 304er Edelstahl; Beständigkeit gegen Säuren, Laugen und extreme Temperaturen; Steril, ungiftig und absolut sicher | Materialgüte, Maschenweite und chemische/thermische Eignung fehlen.; Lebensmittelkontakt-/Sicherheitsnachweis fehlt. |
| 15448534122881<br>Grosser Einteiler mit Karomuster | CHF 17.90–CHF 18.90; available=true; 5 Variante(n); Farbe: Wie abgebildet / Grösse: 0XL, 1XL, 2XL, 3XL, 4XL; 6 Bilder, 0 Videos | 95 % Polyester/Terylen; Hohe Elastizität und optimaler Tragekomfort; Asiatische Grössen fallen kleiner aus | Materialzusammensetzung fehlt.; Verifizierte Körper- und Kleidungsmasse je 0XL–4XL fehlen. |
| 15512184586625<br>Alkoholmeter-Set für Selbstgebranntes | CHF 20.90; available=true; 1 Variante(n); Title: Default Title; 5 Bilder, 0 Videos | Dreiteiliges Set; Messbereiche 0–40 %, 40–70 % und 70–100 %; Integriertes Thermometer | Lieferumfang, Messbereiche, Genauigkeit und Kalibrierung fehlen.; Thermometer ist offenbar separat, nicht integriert. |
| 15454092558721<br>Katzenspielzeug mit Drehkopf | CHF 44.90; available=true; 1 Variante(n); Title: Default Title; 6 Bilder, 0 Videos | Automatische Rotation; Regt den Jagdinstinkt an; ABS-Kunststoff | Funktionsnachweis und Betriebsart fehlen.; Material-/Massquelle fehlt. |

## Produktbefunde

### 15483793244545 – Automatischer Seifenspender

- Öffentliche Quelle: [automatischer-seifenspender-1adb26.json](/workspace/luxestyle-review/r83-batch-20261104/public/automatischer-seifenspender-1adb26.json); SHA-256 39960ad7fa8e8a971548988dc77dcfba0c9d5f899d83c639f57ec8933af089f2.
- SKU(s): CJ-CJJJJTJT01223-Black 4pcs, CJ-CJJJJTJT01223-Black, CJ-CJJJJTJT01223-Blue, CJ-CJJJJTJT01223-Black 2pcs, CJ-CJJJJTJT01223-Black 3pcs.
- Sicherer Konfigurationsstand: CHF 52.90; available=true; Optionen Farbe = Schwarz · 4 Stück, Schwarz, Blau, Schwarz · 2 Stück, Schwarz · 3 Stück.
- Sichtbar: Die Medien zeigen einen freistehenden Spender in Schwarz/Weiss und Hellblau/Weiss sowie Montage- und Anwendungsillustrationen. Das ist kein Material-, Funktions-, Mass-, Lieferumfang- oder Rechtebeleg.
- Ungesichert oder widersprüchlich:
  - Infrarot-Sensor und automatische Seifenabgabe: Keine unabhängige lokale Lieferantenquelle oder technische Dokumentation gefunden.
  - Touchlose Bedienung verhindere Kreuzinfektion bzw. verbessere die Hygiene: Gesundheits-/Hygienewirkung ist weder durch die Storefront-Konfiguration noch durch eine unabhängige Quelle belegt.
  - Design ohne Tropfenbildung: Leistungsbehauptung ohne Test- oder Lieferantennachweis.
  - Grosse Füllöffnung: Keine verifizierte Massangabe oder definierter Vergleichsmassstab.
  - Akku-betrieben: Aktuelle Medien scheinen ein austauschbares Batteriefach und eine Vier-AAA-Anweisung zu zeigen; die Formulierung Akku ist damit mindestens widersprüchlich.
  - Paketinhalt 2, 3 oder 4 Stück: Die Optionsnamen sind belegt; der tatsächliche Lieferumfang je SKU ist ohne Lieferanten-/Fulfilmentquelle nicht bestätigt.
  - Geprüfte Angaben, Lieferung 10–20 Werktage, 30 Tage Rückgabe, Schweizer Shop sowie genannte Zahlungsarten: Der Block steht in der aktuellen Storefront, aber in den geprüften lokalen Produkt-/Lieferantenquellen fehlt der aktuelle Leistungs-, Versand- und Zahlungsnachweis.
- Historischer Merchant-Bezug: Die historischen Merchant-Beispiele referenzieren nur eine Teilmenge der aktuellen Varianten-IDs; weder weitere Varianten noch der heutige Merchant-Status sind damit belegt.
- Sichere Textgrenze: Sicher formulierbar sind nur die aktuell sichtbaren Farb-/Packungs-Optionsnamen, der öffentliche Preisstatus und die sichtbare Form. Keine Hygiene-, Tropffreiheits-, Batterie-/Akku- oder Packungszusage ohne Lieferantenbeleg.
- Guard: rueckhol-0907 ist aktuell vorhanden; keine Social-Ausspielung daraus ableiten.

### 15509968880001 – Hopfenfilter aus Edelstahl

- Öffentliche Quelle: [hopfenfilter-aus-edelstahl-9f9627.json](/workspace/luxestyle-review/r83-batch-20261104/public/hopfenfilter-aus-edelstahl-9f9627.json); SHA-256 1078c1d89d4354c6f618a6997fa5faadd7536179f3a5f1342211adf87fc202f3.
- SKU(s): CJJJCFCJ01844-29CM, CJJJCFCJ01844-18CM.
- Sicherer Konfigurationsstand: CHF 23.90; available=true; Optionen Grösse = 29CM, 18CM.
- Sichtbar: Die Medien zeigen einen zylindrischen Metallgewebe-Filter; zwei Bilder tragen Massgrafiken für 18 cm bzw. 29 cm und 7 cm Durchmesser. Das ist kein Material-, Funktions-, Mass-, Lieferumfang- oder Rechtebeleg.
- Ungesichert oder widersprüchlich:
  - 304er Edelstahl: Kein Materialzertifikat und kein unabhängiger lokaler Lieferantendatensatz gefunden.
  - Beständigkeit gegen Säuren, Laugen und extreme Temperaturen: Chemische und thermische Beständigkeit ist nicht belegt.
  - Steril, ungiftig und absolut sicher: Starke Sicherheits-/Hygieneaussage ohne Zertifikat oder Prüfbericht.
  - 300-Mikron-Sieb: Keine unabhängige Spezifikation gefunden; die aktuellen Bilder belegen die Maschenweite nicht.
  - Geeignet für Bier, Wein und Kaffee: Anwendungsbehauptung aus Shoptext/Marketingbildern, nicht durch eine unabhängige technische Quelle belegt.
  - 18 cm und 29 cm als physische Längen: Die Werte sind aktuelle Optionsnamen und stehen in Bildern; eine unabhängige Massquelle fehlt.
  - Geprüfte Angaben, Lieferung 10–20 Werktage, 30 Tage Rückgabe, Schweizer Shop sowie genannte Zahlungsarten: Der Block steht in der aktuellen Storefront, aber in den geprüften lokalen Produkt-/Lieferantenquellen fehlt der aktuelle Leistungs-, Versand- und Zahlungsnachweis.
- Historischer Merchant-Bezug: Die historischen Merchant-Beispiele verwenden andere Varianten-IDs als die aktuelle öffentliche Produktkonfiguration; aktuelle Feedwirkung ist unbekannt.
- Sichere Textgrenze: Sicher formulierbar sind die aktuellen Optionsnamen 18CM und 29CM sowie die sichtbare zylindrische Gewebeform. 304, 300 Mikron, steril, ungiftig, Temperatur-/Chemikalienbeständigkeit und Lebensmittelkontakt nicht behaupten.
- Guard: rueckhol-0907 ist aktuell vorhanden; keine Social-Ausspielung daraus ableiten.

### 15448534122881 – Grosser Einteiler mit Karomuster

- Öffentliche Quelle: [grosser-einteiler-mit-karomuster-614700.json](/workspace/luxestyle-review/r83-batch-20261104/public/grosser-einteiler-mit-karomuster-614700.json); SHA-256 d3a18ae57ea93b1dbf0539c45695fee018cf05ec8d059dc944e35a315c924284.
- SKU(s): CJ-CJNT294775001AZ, CJ-CJNT294775002BY, CJ-CJNT294775003CX, CJ-CJNT294775004DW, CJ-CJNT294775005EV.
- Sicherer Konfigurationsstand: CHF 17.90–CHF 18.90; available=true; Optionen Farbe = Wie abgebildet; Grösse = 0XL, 1XL, 2XL, 3XL, 4XL.
- Sichtbar: Die sechs Medien zeigen einen einteiligen Badeanzug mit blau-rosa-weissem Karomuster an einem Model. Das ist kein Material-, Funktions-, Mass-, Lieferumfang- oder Rechtebeleg.
- Ungesichert oder widersprüchlich:
  - 95 % Polyester/Terylen: Kein Lieferantenblatt, Etikett oder Materialnachweis lokal gefunden.
  - Hohe Elastizität und optimaler Tragekomfort: Leistungs-/Komfortaussage ohne Prüf- oder Materialnachweis.
  - Asiatische Grössen fallen kleiner aus: Keine verifizierte Grössentabelle oder Lieferantenspezifikation gefunden.
  - Bei Zwischengrössen grössere Option wählen: Passformempfehlung ohne verifizierte Masse.
  - Europäisch-amerikanischer Stil: Subjektive, nicht prüfbare Herkunfts-/Stilangabe.
  - Masstabelle sorgfältig prüfen: Unter den sechs aktuellen Medien ist keine Grössentabelle sichtbar; lokal wurde keine zugehörige Tabelle gefunden.
  - Geprüfte Angaben, Lieferung 10–20 Werktage, 30 Tage Rückgabe, Schweizer Shop sowie genannte Zahlungsarten: Der Block steht in der aktuellen Storefront, aber in den geprüften lokalen Produkt-/Lieferantenquellen fehlt der aktuelle Leistungs-, Versand- und Zahlungsnachweis.
- Historischer Merchant-Bezug: Die historischen Merchant-Beispiele referenzieren nur eine Teilmenge der aktuellen Varianten-IDs; weder weitere Varianten noch der heutige Merchant-Status sind damit belegt.
- Sichere Textgrenze: Sicher formulierbar sind einteiliger Badeanzug, sichtbares Karomuster, aktuelle Grössenlabels 0XL–4XL und die aktuell konfigurierten Preise. Material, Elastizität, Komfort und Passformempfehlungen erst nach Grössen-/Materialquelle.
- Guard: rueckhol-0907 ist aktuell vorhanden; keine Social-Ausspielung daraus ableiten.

### 15512184586625 – Alkoholmeter-Set für Selbstgebranntes

- Öffentliche Quelle: [alkoholmeter-set-fur-selbstgebranntes-002496.json](/workspace/luxestyle-review/r83-batch-20261104/public/alkoholmeter-set-fur-selbstgebranntes-002496.json); SHA-256 383420782dabdaf52b12e2eb198c70860b6d9f253b09ea25a5d1c401d9023b0b.
- SKU(s): CJ-1356224415377002496.
- Sicherer Konfigurationsstand: CHF 20.90; available=true; Optionen Title = Default Title.
- Sichtbar: Die fünf Medien zeigen einen blauen Aufbewahrungskoffer mit drei gläsernen Messkörpern und einem separaten gelben Instrument. Das ist kein Material-, Funktions-, Mass-, Lieferumfang- oder Rechtebeleg.
- Ungesichert oder widersprüchlich:
  - Dreiteiliges Set: Die Bilder zeigen drei gläserne Messkörper plus ein separates gelbes Instrument; der genaue Lieferumfang ist ohne Lieferantenquelle unklar.
  - Messbereiche 0–40 %, 40–70 % und 70–100 %: Keine lesbare, unabhängige Kalibrierungs- oder Lieferantenspezifikation gefunden.
  - Integriertes Thermometer: Die Bilder zeigen das gelbe Instrument separat; integriert ist daher widersprüchlich bzw. unklar.
  - Präzise Messung bei 20 °C: Keine Genauigkeitsklasse, Kalibrierung oder Bedienungsanleitung lokal gefunden.
  - Umrechnungstabelle enthalten: Papier ist in Bildern sichtbar, Inhalt/Lieferumfang aber nicht unabhängig bestätigt.
  - Geeignet für Hobbybrenner und Spirituosenherstellung: Anwendungsbehauptung; zusätzlich historischer Merchant-Policy-Kontext zu Alkoholprodukten.
  - Geprüfte Angaben, Lieferung 10–20 Werktage, 30 Tage Rückgabe, Schweizer Shop sowie genannte Zahlungsarten: Der Block steht in der aktuellen Storefront, aber in den geprüften lokalen Produkt-/Lieferantenquellen fehlt der aktuelle Leistungs-, Versand- und Zahlungsnachweis.
- Historischer Merchant-Bezug: Die historischen Merchant-Beispiele referenzieren exakt die aktuelle Varianten-ID-Menge; der heutige Merchant-Status bleibt trotzdem unbekannt.
- Sichere Textgrenze: Sicher formulierbar sind nur Titel, öffentlich sichtbarer Koffer/Instrumente, SKU und aktueller Preisstatus. Messbereiche, Genauigkeit, Temperaturbezug, Tabelleninhalt und Lieferumfang nicht ohne Manual/Lieferantenbeleg.
- Guard: rueckhol-0907 ist aktuell vorhanden; keine Social-Ausspielung daraus ableiten.

### 15454092558721 – Katzenspielzeug mit Drehkopf

- Öffentliche Quelle: [katzenspielzeug-mit-drehkopf-618400.json](/workspace/luxestyle-review/r83-batch-20261104/public/katzenspielzeug-mit-drehkopf-618400.json); SHA-256 fdb3d48865892e938cc15d48401c8aefcf4b969517238b6637d50fc171bd4de2.
- SKU(s): CJ-2507100944341618400.
- Sicherer Konfigurationsstand: CHF 44.90; available=true; Optionen Title = Default Title.
- Sichtbar: Die sechs Medien zeigen ein pinkes, rundes Katzenspielzeug mit flexiblem Stab und Federanhänger; Marketinggrafiken zeigen Bewegungspfeile. Das ist kein Material-, Funktions-, Mass-, Lieferumfang- oder Rechtebeleg.
- Ungesichert oder widersprüchlich:
  - Automatische Rotation: Nur Shoptext und Marketinggrafik; kein Video, Manual oder unabhängiger Funktionsnachweis.
  - Regt den Jagdinstinkt an: Wirkungsbehauptung ohne Testnachweis.
  - ABS-Kunststoff: Keine Materialquelle oder Zertifizierung lokal gefunden.
  - Einzelnes Produkt: Der genaue Lieferumfang ist ohne Lieferantenquelle nicht bestätigt.
  - Zwei Geschwindigkeiten, schnell/langsam: Steht nur in einem aktuellen Marketingbild und fehlt als unabhängige Spezifikation.
  - Masse 25,5 cm / 15 cm / 18 cm: Steht nur in einem aktuellen Marketingbild; keine unabhängige Massquelle.
  - Geprüfte Angaben, Lieferung 10–20 Werktage, 30 Tage Rückgabe, Schweizer Shop sowie genannte Zahlungsarten: Der Block steht in der aktuellen Storefront, aber in den geprüften lokalen Produkt-/Lieferantenquellen fehlt der aktuelle Leistungs-, Versand- und Zahlungsnachweis.
- Historischer Merchant-Bezug: Die historischen Merchant-Beispiele referenzieren exakt die aktuelle Varianten-ID-Menge; der heutige Merchant-Status bleibt trotzdem unbekannt.
- Sichere Textgrenze: Sicher formulierbar sind pinkes Katzenspielzeug mit Stab/Feder in der sichtbaren Form, SKU und aktueller Preisstatus. Rotation, Geschwindigkeiten, ABS, Masse, Wirkung und Lieferumfang nicht ohne Quelle.
- Guard: rueckhol-0907 ist aktuell vorhanden; keine Social-Ausspielung daraus ableiten.

## Quellensuche und Reichweite

- Exakte Suche nach allen aktuellen SKUs bzw. Basis-Codes mit rg unter /workspace; ausgeschlossen wurden nur übliche generierte Abhängigkeiten (.git, node_modules, vendor, .next, dist, build).
- Treffer ausserhalb der öffentlichen Produktdateien: nur google-merchant-feed.xml mit CJ-CJNT294775001AZ als g:mpn. Der Feed ist aus Shopdaten abgeleitet und kein Lieferantenbeleg.
- Die historischen Dateien active-products.jsonl, blocked.jsonl, changes.jsonl, beide triage-evidence.jsonl, materials-report.json, merchant-report.json und OFFLINE-PARSED.json wurden für die fünf IDs gelesen. Sie dokumentieren Shoptext, Reviewstatus und Merchant-Signale, enthalten aber keine unabhängige Supplier-Spezifikation.

## Gemeinsame Blocker

- NO_LOCAL_SUPPLIER_PRIMARY_SOURCE: Keine SKU-spezifischen CJ-/Lieferantenpayloads, Manuals, Zertifikate oder Produktdatenblätter lokal gefunden.
- MEDIA_RIGHTS_UNKNOWN: Keine lokale Dokumentation zu kommerziellen Bearbeitungs-/Werberechten der Bilder gefunden.
- ADMIN_INVENTORY_FIELDS_NOT_IN_PUBLIC_JSON: inventoryPolicy und inventoryItem.tracked sind im öffentlichen Produkt-JSON nicht vorhanden.
- CURRENT_MERCHANT_STATUS_NOT_READ: Die geprüften Merchant-Signale sind historische CSV-Beobachtungen, keine aktuelle Live-Diagnose.

Die maschinenlesbaren Varianten, Claims, Quellenpfade, Merchant-Kontexte und Begrenzungen stehen in [SOURCES.json](/workspace/luxestyle-review/r83-batch-20261104/SOURCES.json).
