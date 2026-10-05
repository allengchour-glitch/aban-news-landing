# Keywords auf Kollektionsseiten (05.10.2026, Bereich «kollektionen-keywords»)

Betreiber: «keyword mehr machen». Das Semrush-Konto ist leer, deshalb gibt es nur für 17 Begriffe Volumen. Für alle anderen Begriffe gilt ein Google-CH-Vorschlag aus `keywords_erweiterung_ch_2026-10-05.csv` als Nachfrage-Beleg (`K` = suggest-kandidat, `suggest` = gewöhnlicher Vorschlag).
**Geschrieben: 33 Kollektionen.** Jeweils SEO-Titel und Meta (beide Felder zusammen) plus die Einleitung. Der Block `ls-verwandt` blieb Byte für Byte erhalten. Alle 33 sind am Admin-API zurückgelesen (33/33 ok). 0 Semrush-Einheiten.

## Vorgehen (gemessen)
1. Gelesen wurden 549 Kollektionen. Davon sind 369 im Onlinestore veröffentlicht und haben mindestens 8 Produkte. 270 davon stehen in keinem gesperrten Ledger (`_neue_kollektionen(_2)`, `_platz41_heben`, `_draft_ersatz`, `_seite2_heben`, `_nacharbeit_runde2`, `_seo_kollektion_ledger`, `seo_titel_geprueft`, `_kannibalisierung`).
2. Für 109 dieser Kollektionen sind die Produkte geladen (bis 300 je Kollektion, kaufbar = ACTIVE + Variante availableForSale). Jeder gewählte Begriff hat **mindestens 8 kaufbare Treffer per Titel-Regex** (z. B. «ballerinas schwarz»: 15 mit Option Schwarz, «bikini»: 39, «jumpsuit» + Farbe Schwarz: 33, «Katzen-Trinkbrunnen»: 13).
3. Pro Kollektion wurde der stärkste Begriff gewählt, der noch nicht bedient ist. Reihenfolge: Semrush-Volumen ≥ 50, dann K, dann suggest. Den Begriff zeigt Shopify noch nicht im SEO-Titel und nicht in der H1 (Prüfung über die Tokens).
4. Kannibalisierung geprüft gegen:
   - `position_tracking_ziele.tsv` und die Ranking-CSVs,
   - die Kollektions- und Produkt-Ledger,
   - die SEO-Titel aller Kollektionen,
   - den parallel geschriebenen `_keyword_produkte_2026-10-05.tsv`.

   ⚠️ **Berichtigt 05.10. ~11 UTC:** Geprüft war hier nur der Hauptbegriff gegen die Quellen. Die Zusätze im Titel liefen nicht durch die Prüfung, und die Wortfolge wurde nicht beachtet («mikrofon bluetooth» = «bluetooth mikrofon»). Die Vollwort-Prüfung im Abschnitt «Nachbesserung» fand 4 Doppel. Diese sind behoben.
5. Zahlen im Text: nur «Gratisversand ab CHF 50» und «30 Tage Rückgabe». Es gibt keine Masse, Liter oder 925 aus Produkttiteln. Absätze mit Code WELCOME10 wurden nur dort ersetzt, wo sie die Einleitung selbst waren.

## Geschrieben (alt → neu SEO-Titel; Ledger `_keyword_kollektionen_2026-10-05.tsv` mit Altwerten für Titel, Meta und das ganze descriptionHtml)
| Handle | Begriff | Beleg | Long-Tail im Text | SEO-Titel alt → neu |
|---|---|---|---|---|
| guertel | gürtel damen leder | K | gürtel kaufen damen, gürtel herren leder | Gürtel – Echtleder & Ratschen für Sie & Ihn | LuxeStyle CH → **Gürtel Damen Leder & Gürtel für Herren | LuxeStyle** |
| sub-roecke | rock damen lang | K | rock damen midi, rock damen elegant | Röcke – Maxiröcke & Sommerröcke | LuxeStyle → **Rock Damen lang & midi: Maxiröcke & Faltenröcke | LuxeStyle** |
| jeans-denim | jeans damen high waist | suggest | jeans damen baggy, jeans kaufen damen | Jeans & Denim kaufen | LuxeStyle Schweiz → **Jeans Damen High Waist, Baggy & Bootcut | LuxeStyle** |
| sub-bademode | bikini kaufen schweiz | suggest | bikini damen schweiz | Bademode – Bikinis & Badeanzüge | LuxeStyle Schweiz → **Bikini kaufen Schweiz: Bikini-Sets & Badeanzüge | LuxeStyle** |
| sub-ballerinas | ballerinas schwarz | semrush:260 | ballerinas damen bequem, loafers damen | Ballerinas, Flats & Loafers kaufen | LuxeStyle Schweiz → **Ballerinas schwarz, Flats & Loafers für Damen | LuxeStyle** |
| sub-ohrringe | ohrstecker silber schweiz | suggest | ohrstecker kaufen silber, ohrringe kaufen schweiz | Ohrringe – Creolen, Ohrstecker & Ohrhänger | LuxeStyle Schweiz → **Ohrstecker Silber, Creolen & Ohrhänger Schweiz | LuxeStyle** |
| sub-pumps-heels | pumps schwarz | K | pumps damen elegant, pumps damen bequem | Pumps & High Heels kaufen | LuxeStyle Schweiz → ~~Pumps schwarz & farbig: Stiletto bis Blockabsatz~~ → **Pumps schwarz & farbig: Blockabsatz & Mary Janes | LuxeStyle** (Nachbesserung) |
| schuhe-absatz | high heels schwarz | K | high heels damen elegant, high heels damen | High Heels & Pumps | LuxeStyle Schweiz → ~~High Heels schwarz: Stilettos & Sandaletten~~ → **High Heels schwarz & elegant, Sandaletten | LuxeStyle** (Nachbesserung) |
| sub-sandalen | sandalen damen bequem | K | sandalen damen mit absatz, sandalen damen elegant | Sandalen kaufen | LuxeStyle Schweiz → **Sandalen Damen bequem, mit Absatz & elegant | LuxeStyle** |
| midikleider | midikleid elegant | suggest | midikleid damen langarm | Midikleider kaufen | LuxeStyle Schweiz → **Midikleid elegant, festlich & für den Alltag | LuxeStyle** |
| muetzen-schals | schal damen elegant | K | schal damen winter, mütze damen winter | Mützen, Schals & Stirnbänder kaufen | LuxeStyle Schweiz → **Schal Damen elegant, Mützen & Stirnbänder | LuxeStyle** |
| portemonnaie | portemonnaie herren leder | suggest | geldbörse herren leder | Portemonnaie & Geldbörse kaufen – Damen & Herren, RFID-Schutz → **Portemonnaie Herren Leder, Damen & Kartenetui | LuxeStyle** |
| leggings | leggings damen sport | suggest |  | Leggings & Tights kaufen | LuxeStyle Schweiz → **Leggings Damen Sport, Thermo & High Waist | LuxeStyle** |
| jumpsuits-overalls | jumpsuit damen schwarz | suggest | jumpsuit damen sommer, jumpsuit kinder | Jumpsuits & Overalls kaufen | LuxeStyle Schweiz → **Jumpsuit Damen schwarz & farbig, Overalls | LuxeStyle** |
| westen-gilets | weste herren | suggest | weste herren outdoor, weste herren elegant | Westen & Gilets kaufen | LuxeStyle Schweiz → **Weste Herren: Strick, Outdoor & elegant, Gilets | LuxeStyle** |
| wimpern-lashes | wimpern extensions | suggest | wimpernverlängerung | Wimpern & Lashes – magnetische & künstliche Wimpern | LuxeStyle CH → **Wimpern Extensions, Cluster & Magnetwimpern | LuxeStyle** |
| rucksaecke-schule | ~~schulranzen kaufen~~ → **schulrucksack kaufen** | Semrush 02.10.: schulrucksack 2'900/Mt | schulrucksack kinder; «Schulranzen» nur als Nebenwort im Text | Schulrucksäcke kaufen | LuxeStyle Schweiz → ~~Schulranzen & Schulrucksack kaufen~~ → **Schulrucksack kaufen für Kinder & Teens | LuxeStyle** (Nachbesserung) |
| rucksaecke-sport | wanderrucksack kaufen | suggest | wanderrucksack klein, wanderrucksack herren | Sport- & Wanderrucksäcke kaufen | LuxeStyle Schweiz → **Wanderrucksack kaufen: leicht, klein & gross | LuxeStyle** |
| sub-trinkflaschen | trinkflasche edelstahl | suggest | thermosflasche kinder, trinkflasche kinder edelstahl | Trinkflaschen & Thermo kaufen | LuxeStyle Schweiz → **Trinkflasche Edelstahl, Thermosflasche & Becher | LuxeStyle** |
| haengematten | hängematte camping schweiz | suggest | hängematte mit moskitonetz | Hängematte kaufen | LuxeStyle Schweiz → **Hängematte Camping Schweiz: Reise & Moskitonetz | LuxeStyle** |
| babykleidung | babykleidung junge | semrush:170 | babykleidung mädchen, babykleidung neugeborene | Babykleidung & Kindermode online kaufen | LuxeStyle → **Babykleidung Junge & Mädchen: Strampler & Sets | LuxeStyle** |
| smartwatches-wearables | smartwatch kinder | K | smartwatch für frauen | Smartwatches & Wearables kaufen | LuxeStyle Schweiz → **Smartwatch Kinder, Damen & Herren, Armbänder | LuxeStyle** |
| mikrofone | ~~mikrofon bluetooth~~ → **mikrofon kaufen** | suggest; Kopfbegriff «mikrofon» 4'400/Mt (Semrush 02.10.) | mikrofon gaming | Mikrofone & Streaming-Zubehör kaufen | LuxeStyle Schweiz → ~~Mikrofon Bluetooth, Karaoke & USB-Mikrofon~~ → **Mikrofon kaufen: Ansteckmikrofon, USB & Karaoke | LuxeStyle** (Nachbesserung) |
| velo-radsport | fahrradhelm kinder | suggest | fahrradhelm damen | Velo & Radsport kaufen | LuxeStyle Schweiz → **Fahrradhelm Kinder & Erwachsene, Velolicht | LuxeStyle** |
| fitness-geraete | hanteln für zuhause | suggest | hanteln set | Fitness-Geräte & Home-Gym kaufen | Hanteln, Kettlebells & mehr → **Hanteln für zuhause, Kettlebells & Home-Gym | LuxeStyle** |
| rc-ferngesteuert | ferngesteuertes auto kaufen | suggest | ferngesteuertes auto schweiz | RC-Autos & Ferngesteuerte Fahrzeuge | LuxeStyle CH → **Ferngesteuertes Auto kaufen: Drift & Stunt | LuxeStyle** |
| handtaschen-umhaengetaschen | tasche damen groß | K | tasche damen klein, tasche herren umhängetasche | Handtaschen & Umhängetaschen online kaufen | LuxeStyle → **Tasche Damen gross & klein, Umhängetaschen | LuxeStyle** |
| hochzeitsgeschenke | hochzeitsgeschenke für brautpaar | K | hochzeitsgeschenk kaufen | Hochzeitsgeschenke kaufen | LuxeStyle Schweiz → **Hochzeitsgeschenke für Brautpaar & Paare | LuxeStyle** |
| kinderschuhe | turnschuhe kinder | suggest | sneaker kinder mädchen, sneaker kinder jungen | Kinderschuhe kaufen | LuxeStyle Schweiz → **Turnschuhe Kinder, Sneaker & Winterstiefel | LuxeStyle** |
| haustier-futter-naepfe | katzenbrunnen kaufen | suggest | katzenbrunnen keramik | Futter & Näpfe – Futterautomaten, Näpfe & Trinkbrunnen | LuxeStyle → **Katzenbrunnen kaufen, Futterautomat & Näpfe | LuxeStyle** |
| haustier-katze | katzenbett kaufen | suggest | katzenbett flauschig | Katzen-Zubehör – Kratzbäume, Betten, Spielzeug & Katzenklo | LuxeStyle → **Katzenbett kaufen, Katzenspielzeug & Katzenklo | LuxeStyle** |
| wohnen-bad | handtuchhalter bad | K | badematte rutschfest, handtuchhalter ohne bohren | Badezimmer & Bad-Accessoires | LuxeStyle Schweiz → **Handtuchhalter Bad, Badematten & Duschköpfe | LuxeStyle** |
| geschirr-servieren | servierplatte kaufen | suggest | servierplatte keramik, servierplatte holz | Geschirr & Servierzubehör kaufen | LuxeStyle Schweiz → **Servierplatte kaufen: Keramik, Holz & Porzellan | LuxeStyle** |

## Nachbesserung nach Prüferbefund (05.10. ~11:00 UTC) — Kannibalisierung über alle Titelwörter
**Neue Prüfung (Vollwort).** Sie läuft über die Titel und Metas aller 33 Seiten. Gesucht wird jeder Zielbegriff einer anderen Seite. Grundlage sind 865 Begriffe aus:
- position_tracking_ziele
- den neuesten Zeilen von _keyword_produkte
- _platz41, _seite2, _draft_ersatz
- _seo_kollektion_ledger, seo_titel_geprueft, kollektion_seo_final, _seo_seite2_ledger
- den eigenen Begriffen

Ein Treffer liegt vor, wenn alle Wörter des fremden Begriffs im Titel stehen. Die Wörter werden dafür normalisiert: Umlaute, einfache Endungen, Füllwörter wie «kaufen» und «für» zählen nicht, die Reihenfolge ist egal. Bei Metas zählen nur Begriffe mit mindestens 2 Wörtern.

**Vorher (gemessen am Live-Stand): 5 Titel-Treffer.**
- sub-pumps-heels und schuhe-absatz: «stiletto». Ziel ist stiletto-high-heels-633500 (Tracking und platz41).
- mikrofone: «bluetooth mikrofon». Ziel ist 603300, das auf Platz 36 rankt (Tracking und seo_titel_geprueft). Diesen Fall hatte der Prüfer nicht genannt.
- schuhe-absatz: «high heels schwarz». Im Tracking zeigte der Begriff auf sub-pumps-heels; eingetragen hatte das suche-synonyme.

**Dazu 6 Meta-Treffer:**
- fitness-geraete: «hanteln verstellbar», «klimmzugstange für zuhause»
- jumpsuits-overalls: «jumpsuit herren»
- mikrofone: «mikrofon mit lautsprecher»
- sub-ballerinas: «ballerinas damen leder»
- sub-trinkflaschen: «trinkflasche mit strohhalm»

**Behoben.** 9 Kollektionen in einem Bündel. SEO-Titel und Meta gingen immer zusammen. Bei mikrofone und rucksaecke-schule wurde zusätzlich nur der erste Absatz ersetzt. Unmittelbar vorher habe ich die Sperr-Ledger und die urlRedirects geprüft: 9 von 9 waren frei. Danach habe ich alles live zurückgelesen: 9/9.
- sub-pumps-heels: Titel ohne «Stiletto»; Meta «spitze Pumps» statt «Stiletto-Pumps».
- schuhe-absatz: Titel ohne «Stilettos». Die Meta nennt keine Stilettos mehr und keine Slingbacks («slingback pumps» ist das Ziel eines Produkts). Für die Belege gibt es kaufbare Produkte: Plateau 10, Pantoletten 7.
- **mikrofone:** Begriff jetzt «mikrofon kaufen», belegt über Suggest und den Kopfbegriff mit 4'400/Mt. Titel, Meta und erster Absatz enthalten kein «Bluetooth», «Lautsprecher», «Handy» und «singen» mehr. Alle Merkmale stammen aus Titeln kaufbarer Produkte: Ansteck/Lavalier 31, USB 19, Karaoke 17, dazu Schwanenhals, Funkmikrofon-Set und Kragenmikrofon.
- **rucksaecke-schule:** Begriff jetzt «schulrucksack kaufen». Gezählt: 38 von 54 kaufbaren Produkten tragen «Schulrucksack» im Titel, «Schulranzen» nur 3. Der Kopfbegriff hat 2'900/Mt. «Schulranzen» steht nur noch einmal als Nebenwort im Text. Der Trust-Absatz blieb unverändert, der Text hat jetzt 102 Wörter.
- smartwatches-wearables: Meta ohne «GPS-Ortung und Videoanruf», jetzt «mit Kamera und Spielen». Damit gibt es keine Überschneidung mehr mit «uhr kinder gps» (203712).
- Metas ohne die fremden Begriffe: fitness-geraete ohne verstellbare Hanteln und Klimmzugstange, jumpsuits-overalls ohne Herren, sub-ballerinas ohne Leder-Ballerinas, sub-trinkflaschen ohne Strohhalm.
- `position_tracking_ziele.tsv`: Für «high heels schwarz» ist das Ziel jetzt /collections/schuhe-absatz. Diese Seite trägt den Begriff im Titel; sub-pumps-heels zielt auf «pumps schwarz».

**Nachher: 0 Titel-Treffer und 0 Meta-Treffer.**

**Widerlegt mit Messung: jeans-denim («Bootcut») und sub-trinkflaschen («Thermosflasche»).** Der Prüfer las die Zeilen von 09:31 aus _keyword_produkte. Beide Produkte wurden um 10:17 zurückgenommen, und die Zielseiten-Abstimmung im README legt fest: «jeans damen bootcut → jeans-denim», «thermosflasche edelstahl → sub-trinkflaschen». Live gelesen:
- 622000 hat den SEO-Titel «Schwarze Schlagjeans mit Schnürung für Damen».
- 616400 hat den SEO-Titel «Isolierte Edelstahlflasche mit Trageschlaufe».

Keiner der beiden trägt den Begriff noch. In den Kollektionen stehen kaufbar 19 Bootcut- und Schlagjeans, davon 8 ohne «Herren» im Titel, sowie 15 Thermos-, Isolierflaschen und Isolierkannen. Die beiden Titel bleiben deshalb.

**Live per WebFetch (Cache-Brecher `?v=kk2`):**
- mikrofone: title «Mikrofon kaufen: Ansteckmikrofon, USB & Karaoke | LuxeStyle», erster Satz «Wer ein Mikrofon kaufen möchte, wählt zuerst nach dem Einsatz.»
- rucksaecke-schule: title «Schulrucksack kaufen für Kinder & Teens | LuxeStyle», erster Satz «Wer einen Schulrucksack kaufen möchte, …»
- sub-pumps-heels: title «Pumps schwarz & farbig: Blockabsatz & Mary Janes | LuxeStyle»
- schuhe-absatz: title «High Heels schwarz & elegant, Sandaletten | LuxeStyle»

Bei allen ist die H1 unverändert. Die Altwerte stehen in 9 neuen Ledger-Zeilen mit Status `nachbesserung-kanni`. Wo der Text ersetzt wurde, ist dort das ganze alte descriptionHtml gespeichert.

**Lehre.** Die Kannibalisierungs-Prüfung muss jedes Wort des Titels prüfen und die Wortfolge ignorieren. Sie muss den neuesten Stand des Ledgers lesen, also auch zurückgenommene Zeilen.

## Live geprüft (WebFetch, 09:5x UTC)
Geprüft wurden guertel, sub-bademode, kinderschuhe, haustier-futter-naepfe, jeans-denim und haengematten: **6/6** zeigen den neuen `<title>` und den neuen ersten Satz.
- Die H1 ist unverändert.
- kinderschuhe zeigt «Passend dazu: Leuchtschuhe Kinder» und «Zur Übersicht: Schuhe» weiterhin.
- haengematten: Die falsche Angabe «Hängematten mit Gestell» ist weg. Gemessen hat keine kaufbare Hängematte ein Gestell.

## Verworfen (mit Grund)
- **Während der Runde gesperrt:** sub-hausschuhe, herren-uhren und beamer-heimkino. Der parallele Workflow platz41 hat sie um 09:31–09:33 UTC geändert.
- **schuhe-sneaker:** Der Pfad ist ein 301 auf sneaker-sportschuhe.
- **drohnen-fpv:** «drohne kaufen schweiz» war über die Tokens schon im Titel. «drohne mit kamera» gehört zu drohnen-kameras.
- **Zu wenig passende Ware** (unter 8 Treffer):
  - strampler-bodys: «baby bodys» 1'600/Mt, nur 4 Bodys
  - beamer «leinwand»: 0
  - sub-ringe «verlobungsring»: 0
  - socken: 0 für Damen
  - zahnpflege «kinder»: 2
  - adventskalender «kinder»: 0 im Titel
  - lampen «deckenlampe»: 7
  - garten-pflanzgefaesse: 1
  - bar-glaeser: 11 kaufbar
  - hoodies: 5 mit Reissverschluss
  - ft-pluesch: «plüschtier hund» trifft Hundespielzeug, keine Plüschhunde
- **Überschneidung mit anderen Seiten:**
  - Solar: solar-gartenlicht und garten-leuchten
  - Handwärmer: waerme-komfort
  - Lautsprecher: Kollektion lautsprecher
  - sportschuhe herren: herren-schuhe
  - jacken: herren-jacken und damen-jacken-maentel im Ledger
- **Vom Geschwister-Bereich auf Produkte gelegt, deshalb hier ersetzt:** «bikini set damen» (1'000/Mt) und «hängematte outdoor». Die Long-Tails «jeanskleid damen», «sandalen damen leder», «leggings damen schwarz», «hanteln verstellbar» und «ferngesteuertes auto kinder» kommen ebenfalls nicht als Ziel vor.

## Offen
- Die Wirkung lässt sich ohne Semrush-Guthaben nicht messen. Die Nachmessung ist erst nach dem Aufladen oder über die Search Console möglich.
- Nebenfunde (nicht angefasst):
  - In geschirr-servieren stehen Hundegeschirr-Sets und Hundenäpfe. Das ist die Komposita-Falle «Geschirr».
  - In westen-gilets stehen Hundewesten und Western-Hemden.
  - In muetzen-schals stehen ein Massage-Schal und Cardigans mit Schalkragen.
  - In caps-huete stehen Kostüm-Hüte.
  - In handy-huellen stehen Staubschutzhüllen für Möbel und Küchengeräte.
  - auto-halterungen zeigt bei 231 kaufbaren Produkten keinen Treffer für Handy-Halter oder Magnet.
  - fitness-geraete zeigt in der Liste weiterhin «Hantelbänke, Heimtrainer, Vibrationsplatten». Das ist nicht gegen den Bestand geprüft.
- Der Trust-Absatz mit «–10 % mit Code WELCOME10» blieb, wo er separat stand (guertel, sub-ohrringe, wimpern-lashes u. a.). Ob der Code noch aktiv ist, ist nicht gemessen.
- Das Schreib-Skript lag nur im Scratchpad und ist nicht im Repo. Zurück geht es über den Ledger: Die Spalten alt_seo_titel, alt_meta und alt_desc_html sind vollständig. Ein Rückweg-Skript gibt es noch nicht.
