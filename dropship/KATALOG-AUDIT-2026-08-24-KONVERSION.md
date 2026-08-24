# Drittes Katalog-Audit — Abschlussbericht (Konversion, Feed-Daten, Sachaussagen, Sprachversion, Preisrecht, Darstellung)

Stand: 24.08.2026, Verifikation 07:26–07:48 UTC. Alle Zahlen aus Live-Prüfung durch den Skeptiker, nicht aus Exports.

## 1. Vorbemerkung: Was ist belegt, was ist Einschätzung?

Der Shop hat **13 bezahlte Bestellungen** (#1003–#1015, live gezählt 07:29 UTC — nicht «rund 15», wie im Auftrag stand). **Kein einziger Befund dieses Laufs hat einen BELEGTEN Verlust verursacht:** Keine der 13 Bestellungen betrifft ein Streichpreis-Produkt, einen 4K-Beamer, eine Fantasie-Powerbank oder eine falsch gefüllte Kollektion. Alles Folgende sind **Risiko-Einschätzungen** — rechtlich (PBV/UWG), Kanal-Risiko (Google-Merchant-Sperre = einziger Kanal mit belegten Verkäufen) und unmessbare Kaufabbrüche (dieselbe Klasse wie die 61 toten Ratgeber-Links: kein Bericht weist sie je aus). Die belegten Verluste der Shop-Historie (#1004, #1006, #1008, #1009) stammen aus anderen, längst behandelten Fehlerklassen.

## 2. Gehaltene Befunde nach Schwere

### KRITISCH

**2.1 · 58 Varianten (36 Produkte) werben mit einem «Normalpreis», der nie verlangt wurde** — bestätigt durch unabhängige Nachzählung (58/36 identisch). Beleg: `dropship/PRODUKT-PIPELINE.md` («Stand: 2026-05-30») führt z. B. den Gemüseschneider 15411565429121 wörtlich mit «| … | 39.90 | CJ-CJJT172393804DW |» — live steht «39.90 statt 59.90»: der heutige Preis IST der Preis vom Anlagetag. Kundensicht wörtlich «Angebotspreis CHF 49.90 Normaler Preis CHF 79.90» (WebFetch 07:30 UTC, /products/premium-leder-geldborse-slim). Höchste Rabatte −44,5 %. `automation/streichpreise.py` gesteht im eigenen Docstring, die Werte seien «offensichtlich als Verkaufspreis × 1.55/1.65/1.70 berechnet» — konstruiert, nie verlangt. Verstoss PBV Art. 16 / UWG Art. 3 Abs. 1 lit. g.
→ **Vorschlag:** compareAtPrice bei allen 58 Varianten auf null (`productVariantsBulkUpdate`). Randfall: 15431914783105 (Thomas Sabo, BigBuy-Markenware) könnte eine belegbare UVP tragen — einzeln entscheiden.
→ **Quellenfix:** Erledigt durch Nichtstun — **kein Importer schreibt compareAtPrice** (Grep über `automation/`: 0 Treffer). Die Klasse wächst NICHT nach; einmalige Entfernung genügt. Nur `streichpreise.py` darf nie wieder «runden statt entfernen» (siehe 2.5).

**2.2 · Vier Beamer mit «4K» im Titel, eigener Text nennt 720p/1080p** (Anzahl 4, per Wildcard-Vollsuche bestätigt). 15481681019265 «Tragbarer 4K WiFi HD Mini-Projektor»: Text wörtlich «nativen 720p-Auflösung (1280 × 720)» — ein Neuntel der Pixel. Alle vier in allen 6 Kanälen inkl. Google; zwei standen in der Hype-Startseiten-Reihe. Titel und Text stehen im selben Feed-Datensatz — der Widerspruch ist für Google maschinell lesbar (Misrepresentation-Klasse). Schwächster Fall: 15481680822657 («unterstützt 4K-Inhalte, nativ Full HD» ist branchenüblich erklärbar, Titel bleibt trotzdem irreführend).
→ **Vorschlag:** «4K» aus drei Titeln streichen, beim vierten nur das «4K» entfernen.
→ **Quellenfix:** CJ-Importer — Regel: Auflösung im Titel gegen NATIVE Auflösung im Text prüfen, niedrigere gewinnt (Rangfolge 8K > 4K > 1080p > 720p maschinell entscheidbar). Ohne diese Wache legt der tägliche Grind die Klasse neu an.

### HOCH

**2.3 · Der «Angebotspreis» läuft ununterbrochen — seit 96 Tagen, nicht 85** (36 Produkte; Slim Wallet 15396249502081: Varianten-updatedAt 2026-05-20). PBV Art. 16 Abs. 3: unbefristeter Vergleichspreis ist der Normalpreis.
→ **Vorschlag/Quellenfix:** Falls je wieder Streichpreise: Tag `sale-bis-JJJJ-MM-TT` + täglicher Selbstabräum-Wächter (Mechanik existiert in `hype_kuratieren.py`). Ohne Enddatum entsteht der Befund sofort wieder.

**2.4 · 28 der 36 stehen im Google-Kanal** (exakt 28, per resourcePublicationsV2 bestätigt, 07:31 UTC). Der unbelegte Referenzpreis geht als `price` in den Merchant-Feed — in den einzigen Kanal mit Verkäufen. 27 sind Eigenmarken-Ware ohne jede Preisreferenz; 1 Randfall (Thomas Sabo, mögliche UVP).
→ **Vorschlag:** Diese 28 zuerst bereinigen, vor den übrigen 8.

**2.5 · `streichpreise.py` fragt nie, ob der Preis verlangt wurde — und hat 8 (nicht 3) Fantasiepreise AUFGERUNDET** (z. B. 38.93 → 39.90). Steht in keiner Startliste. Der Docstring weiss, dass die Werte konstruiert sind, und verschönert sie trotzdem.
→ **Vorschlag:** Prüfung umdrehen (unbelegt = entfernen, nie runden), `auf90()` raus. **Quellenfix:** das Skript selbst IST die Quelle des falschen «erledigt» im Ledger.

**2.6 · Fantasie-Lumen** (3 Produkte): 15450844365185 «99'000'000 Lumen» für CHF 23.90 (wörtlich zweimal, live bestätigt, im Google-Kanal); 15455793185153 «20000 Lumen» am 3,7-V-Akku; 15481691439489 «12000 Lumen» wo Geschwister 180/320 ANSI nennen.
→ **Vorschlag:** Echte Werte von CJ, sonst Zahl ersatzlos streichen. **Quellenfix:** Importer-Plausibilitätsgrenze (>20'000 Lumen verwerfen; >5'000 + «3.7V/USB» verwerfen).

**2.7 · Zwei Powerbanks: 20'000 mAh im Titel, 10'000 im eigenen Text** (exakt 2 von 298 Powerbank-Treffern, vollständig paginiert). «Intern» rettet nichts — Zellkapazität ist immer höher als die abgebbare.
→ **Vorschlag:** Titel auf 10'000; bei 15481395511681 zusätzlich «Mini» streichen (20,5 × 13,5 cm). **Quellenfix:** Importer-Wache: mAh in Titel ≠ mAh im Text → Text-Zahl gewinnt. ⚠️ Wache muss typografische Varianten normalisieren (Apostroph «10’000», schmales Leerzeichen U+202F) — beide Formen existieren live und sahen in der Rohzählung wie Widersprüche aus.

**2.8 · 100'000-mAh-Powerbank (370 Wh) für CHF 17.90** (1 Produkt, 15479532749185, in allen 6 Kanälen). Entweder falsch (Kunde bekommt die Kapazität nie) oder wahr (nicht auf Konsumenten-Transportwegen lieferbar — Passagierflug max. 160 Wh; Skeptiker-Präzisierung: als deklariertes Gefahrgut wäre Fracht möglich, nur nicht auf CJ-üblichem Weg). Physik spricht für falsch: 523 Wh/l bei ~2-kg-Sollgewicht.
→ **Vorschlag:** CJ-Kapazität abfragen, sonst über «120W Schnellladung» verkaufen. **Quellenfix:** Importer verwirft mAh > 30'000 — hätte auch die bekannte 9-Mio-mAh-Powerbank gestoppt.

**2.9 · Breil-Ring: 3 Varianten verkaufen über Bestand 1 hinaus** (15431376339329; EU 54/56/58 auf CONTINUE bei Bestand 1, alle vier Grössen teilen SKU bb-S0800438 — vermutlich EIN physischer Ring, viermal versprochen). Einzige Abweichung im ganzen 155er-BigBuy-Bestand; verletzt die Hausregel tracked+DENY.
→ **Vorschlag:** 3× auf DENY; klären, ob die Referenz wirklich vier Grössen deckt. **Quellenfix:** BigBuy-Import ist deaktiviert — Einmalkorrektur; prüfen, warum das Revival hier CONTINUE hinterliess.

**2.10 · Kollektion «Garten-Werkzeug & Pflege»: Regel `TITLE CONTAINS "gie"` — 109 aktive Fremdtreffer, nicht 30** (Vollzählung: 111 von 226 aktiven matchen «gie», nur 2 gartennah; Technologie, Legierung, Magie, Energie, Regiestuhl, Biologie, Trilogie). Dazu Nebenregeln «handschuh» (93 Mode-Treffer) und «schaufel» (19: Bagger-Spielzeug, Katzentoilette, Hautschaufel). In 8 Kanälen inkl. Google publiziert.
→ **Vorschlag:** Vollwörter (Giesskanne, Gartenschere, Heckenschere…); «handschuh»/«schaufel» gleich mitkorrigieren.

**2.11 · «Pflanzgefässe & Töpfe»: 11 Fremdtreffer in den ersten 15** («blumen» trifft Blumenmuster-Kleider, «topf» Le-Creuset-Kochtöpfe, «pflanz» das Adjektiv «pflanzlich» einer Ledertasche).
→ **Vorschlag:** Blumentopf/Übertopf/Pflanzgefäss/Pflanzkübel als Vollwörter.

**2.12 · «Wein-Accessoires»: Regel `"wein"` trifft die Farbe weinrot und das Wildschwein** (5 aktive Fehltreffer als Untergrenze — «wein» steckt in jedem «Schwein»-Kompositum; Dutzende DRAFT-Grössenvarianten liegen als Nachschub bereit). In 8 Kanälen live.
→ **Vorschlag:** Weinglas/Weindekanter/Weinregal/Weinkühler/Korkenzieher/Dekanter/Sommelier.

→ **Quellenfix für 2.10–2.12 (und 2.14):** Die Smart-Regel IST die Quelle — jede Regeländerung ist zugleich der Quellenfix, jeder CJ-Import wächst sonst täglich hinein. Die Familienregel steht seit dem 21.08. im Gedächtnis: **Kurz-Substrings taugen in Shopify-CONTAINS nie** (kein `\b`, Bindestriche ignoriert). Nach jeder Regeländerung Produktliste LESEN, nicht nur zählen.

### MITTEL

**2.13 · «Kaugummikugeln 16 Stück» für CHF 16.00 — geliefert werden 40 Stangen à 16 (~640 Stück)** (1 Produkt, 15470073381249; Fortura-Feed unabhängig bestätigt: Verkaufseinheit 40, Stangenpreis ~CHF 0.40 → 40 × 0.40 = 16.00). Wirkt als 1 Fr./Kaugummi absurd teuer — verschenkter Verkauf, keine Falschaussage nach oben.
→ **Vorschlag:** «Kaugummikugeln · 40 Stangen à 16 Stück». **Quellenfix:** Multipack-Regel gegen die maschinenlesbare Fortura-Zeile «Lieferumfang: N Stück» — Vollscan fand genau EINEN Fall, kein Massenlauf nötig.

**2.14 · «Zelte & Schlafsäcke»: Regel `"matte"` holt Auto-Fussmatten, Kratzmatten, Hundematten, Sportmatten** (8 aktive bestätigt; «matte» steckt sogar in «Mattel» — Barbie und UNO hängen als DRAFT in der Camping-Kollektion). «isomatte» existiert bereits als Regel.
→ **Vorschlag:** «matte» streichen, Isomatte/Luftmatratze/Campingmatte genügen.

**2.15 · «Gesichts- & Hautpflege»: Regel `"creme"` trifft Eiscreme-Maschine, Eiscreme-Koffer, cremefarbene Keramik-Box** (3 laut Finder). ⚠️ **Vorbehalt:** Das Skeptiker-Urteil zu diesem Befund wurde in der Übergabe abgeschnitten — er ist NICHT verifiziert und gehört vor einer Reparatur einmal live gegengeprüft. Das Muster ist mit 2.10–2.12/2.14 deckungsgleich und plausibel.

### NIEDRIG

**2.16 · Der englische Übersetzungs-Layer ist ein Fossil** — verschärft bestätigt: 3'750 von 3'750 geprüften Alt-Ressourcen übersetzt, **Abriss bereits Ende Juni 2026** (Produkt vom 25.06. übersetzt, vom 27.06. nicht mehr) — grob ~41'000 Produkte ohne EN. Heute unschädlich (Locale unveröffentlicht), aber die Grundlage der zwei widerlegten EN-Befunde.
→ **Vorschlag = Betreiber-Entscheid:** Englisch aufgeben → EN-Bestand löschen, Locale entfernen (dann kann er nie zur Falle werden). Englisch geplant → **zuerst** Übersetzung in die drei CJ-Importer (wer schreibt das Feld beim nächsten Produkt?), dann Backfill, ZULETZT Locale veröffentlichen — und vorher zwingend die 4 als outdated markierten Shop-Richtlinien neu übersetzen (siehe 3.4).

## 3. Widerlegt — bitte nicht nochmals aufwerfen

**3.1 · «Selbstwiderspruch: 722 wurden für Faktor 1,3 archiviert, die 36 liegen höher».** Falsch gelesen: Archivierungsgrund der 722 war **Bildlosigkeit** («783 bildlose Aktiv-Produkte → ARCHIVED», Fake-Preise «gleich miterledigt»); ×1,3 war der Fingerabdruck einer Müll-Generator-Linie (uniform + krumme Werte 51.87/337.87), nie eine Obergrenze. Die dokumentierte Hausregel ist `preis_lager_scan.py`: «compareAtPrice > 3x → auf 1.6x kappen» — «~1.6× plausibel» im Audit war deren Anwendung, kein Durchwinken. Die PBV-Substanz steckt bereits vollständig in Befund 2.1.

**3.2 · «44'783 Produkte ohne Bestandsführung = kritischer Fehler».** Zahlen stimmen, Wertung nicht: Ungeführter Bestand mit CONTINUE ist die **dokumentierte Architektur** für CJ-Dropship (Audit 11.08. nahm genau das als sauber ab; tracked+DENY-Pflicht gilt nur für BigBuy). Das zitierte Abzeichen «Verfügbar · Versand direkt ab Werk» ist die bewusste Ehrlichkeits-Reparatur vom 23.08., keine Lagerzusage. Ironie: Das EINE «vorbildlich» geführte cj-real-Produkt (Slim Wallet, 50 Stück) trägt **erfundenen** Bestand — die implizite Norm des Befunds ist im Shop genau umgekehrt belegt. Zwei Fehlgriffe im Muster festgehalten: `inventory_total:<0` ist ein Index-Artefakt für «ungeführt», kein Negativbestand. Was bleibt, ist der Messvorschlag (Stichproben-Wächter gegen `product/stock/queryByVid` für die Hype-Reihe) — als Idee brauchbar, kein Befund.

**3.3 · «16 aktive Produkte mit Tag ghost-sale-schutz-bb-draft = Schutz versagt».** `dropship/_bb_ghostsale_draft.md` dokumentiert: Am 18.07. wurden lagernde BigBuy-Produkte **bewusst reaktiviert** mit tracked+DENY+echter Menge («Ghost-Sale STRUKTURELL unmöglich»); die 16 Aktiven sind das gewollte Ergebnis, die 185 übrigen Tag-Träger sind DRAFT. Der Tag ist ein nicht abgeräumter Herkunfts-Marker — Kosmetik. Offen bleibt nur der dort selbst notierte Punkt: bb_fix2 periodisch mit frischem Stock-Pull wiederholen (letzter Abgleich 18.07.).

**3.4 · «Englische Versandrichtlinie verspricht Weltversand» und 3.5 · «161 Produkte bewerben CHF 65 auf Englisch».** Beide Male dieselbe Blindstelle im FINDER: `shopLocales` nie geprüft. **en ist published:false**, `/en/…` antwortet 404, `shopPolicies.translations(en)` für Kunden ist leer — die Texte existieren nur als unveröffentlichte Admin-Entwürfe, die keine Besucherin und kein Crawler je sieht. Shopifys `outdated:true` ist dabei der Beweis für die Harmlosigkeit (die deutsche Quelle vom 14.08. ist die aktuelle), nicht dagegen. Dieselbe Fehlerklasse wie die «7–14» in Kommentaren von `meta-tags.liquid`. **Gültig bleibt als Backlog-Notiz:** Wer die EN-Locale je veröffentlicht, stellt im selben Moment Weltversand-Zusagen und CHF-65-Schwellen live — die Reihenfolge aus 2.16 ist zwingend.

## 4. Geprüft und sauber

- **Preis-Historie der 36 Streichpreis-Produkte:** Export 12.08. gegen live = 0 Abweichungen — keine versteckte Hochpreisphase.
- **compareAtPrice-Nachschub:** Kein Importer, kein Wächter schreibt das Feld — die Klasse ist geschlossen, nicht nachwachsend.
- **mAh-Konsistenz:** 298 Powerbank-Treffer vollständig paginiert, exakt 2 echte Widersprüche; «10’000» (Apostroph) und «10 000» (U+202F) sind konsistent, keine Fehler.
- **Stückzahl-Titel:** Vollscan über 6'716 aktive Produkte mit Stückzahl — genau 1 echter Widerspruch (Kaugummi).
- **BigBuy-Bestandsführung:** 155 aktive Produkte, 0 ungetrackte Varianten, 0 tracked+DENY+0-aber-kaufbar — einzige Abweichung ist der Breil-Ring (2.9).
- **4K-Titel ausserhalb Beamer:** 75 aktive `*4K*`-Titel geprüft, nur die 4 Beamer sind Widersprüche.

## 5. Finder gegen Skeptiker — die gültigen Zahlen

| Befund | Finder | Skeptiker (gültig) | Differenzgrund |
|---|---|---|---|
| Streichpreise nie verlangt | 58 Var. / «15 Bestellungen» | **58 Var. / 13 Bestellungen** | #1003–#1015 sind 13 Nummern |
| Dauerrabatt | «85 Tage» | **96 Tage** | Varianten-updatedAt 20.05. |
| Google-Kanal | 28 | **28** (davon 1 UVP-Randfall Thomas Sabo) | — |
| streichpreise.py aufgerundet | 3 | **8** | alle «krumm»-Ledgerzeilen betroffen |
| 722er-Selbstwiderspruch | 36 | **0 — widerlegt** | Archivgrund war Bildlosigkeit |
| Bestandsführung CJ | 44'783 «kritisch» | **widerlegt** | dokumentierte Dropship-Architektur |
| ghost-sale-Tag aktiv | 16 | **0 — widerlegt** | bewusste Reaktivierung 18.07. |
| EN-Versandrichtlinie | 4 | **0 — widerlegt** | Locale unveröffentlicht, /en/ = 404 |
| EN «CHF 65» | 161 | **0 — widerlegt** | dito |
| EN-Fossil | 3'600 | **≥3'750, Abriss Ende Juni** | verschärft, nicht gekippt |
| «gie»-Kollektion | 30 | **109** | Stichprobe vs. Vollzählung |
| Pflanzgefässe | 10 | **11** | zwei weitere Dirndl |
| «matte» | 8 | **8** (+ Mattel als DRAFT) | — |

## 6. Was dieser Lauf NICHT geprüft hat

- **Der «creme»-Befund (2.15) ist unverifiziert** — das Skeptiker-Urteil wurde in der Übergabe abgeschnitten; vor Reparatur einmal live gegenprüfen.
- **Kollektionsregeln nur als Stichprobe:** «gie», «pflanz/topf/blumen», «wein», «matte», «creme» (+ nebenbefundlich «handschuh», «schaufel»). Ein systematischer Scan ALLER ~500 Smart-Regeln auf Kurz-Substrings steht aus — die Familie hat erfahrungsgemäss mehr Mitglieder.
- **compareAtPrice-Restrisiko:** Beide Kandidatenlisten (Bulk 22.08. bzw. Export 12.08. mit variants(first:3)) könnten ein Produkt übersehen, dessen Streichpreis erst ab Variante 4 sitzt oder das nach dem 22.08. entstand; da kein Importer das Feld schreibt, ist das Restrisiko minimal, aber nicht null.
- **FR/IT-Übersetzungsebenen** — nur EN wurde angesehen (fr/it sind ebenfalls unveröffentlicht).
- **Tatsächliche CJ-Lieferausfallquote** der beworbenen Ware (hype-jetzt, Startseiten-Reihen): der in 3.2 skizzierte Mess-Wächter existiert nicht; heute ist unbekannt, ob das Risiko 0,1 % oder 20 % beträgt.
- **Sachaussagen jenseits von Auflösung/Lumen/mAh/Stückzahl** (Watt, Ah, Kapazitäten von Kühlboxen, dpi etc.) — dieselbe Fantasiezahl-Klasse ist dort ungeprüft.
- **Der Thomas-Sabo-Nebenbefund** (ACTIVE mit «nicht-verifiziert-lieferbar» im Google-Kanal) ist durch 3.3 grösstenteils erklärt (verifiziert lagernd, tracked+DENY), aber der BigBuy-Doppeltest CH-Lieferbarkeit wurde für dieses Einzelstück nicht wiederholt — letzter Abgleich 18.07.