# Netzstecker je Variante — Langformen + Geräte-Achse (13.10.2026, Nachtrag zur Gegenprüfung)

**Regel:** Ein Netzgerät mit fremdem Stecker (US/UK/AU/CN/JP …) darf in der Schweiz nicht kaufbar sein. EU-/CH-Varianten
bleiben kaufbar. Gesperrt wird wie bisher umkehrbar: `tracked=true`, `inventoryPolicy=DENY`, Bestand 0, Altwerte im
Ledger `dropship/_cj_stecker_varianten.tsv` — nichts gelöscht, nichts gedraftet.

## Was die Gegenprüfung fand (gemessen 13.10.)

Die Regel vom Morgen (483 Varianten in 58 Produkten) kannte nur Kürzel. Live **kaufbar** waren u. a.:

- Babyphone `15447878762881`: «American Standard», «British Standard», «Australian Regulations»
- Retro-Konsole `15448848761217`, LED-Maske `15448936743297` («National Standard» = chinesische GB-Norm),
  Harddisk-Station `15449131909505` («American Standard»)
- Ultraschall-Luftbefeuchter `15449425379713`, Variante `55881714467201` «Blue flame bead-Chinese plug»
- Regensystem `15454234542465`: «Miao Si GB Plug», «Englisch GB Stecker», «English American Standard Plug»
- Vulkan-Luftbefeuchter `15450848428417`: «Japanese specifications»

**Grössere Lücke, beim Messen gefunden:** 56 Geräte mit `-US`/`-UK`/`-AU`-Varianten galten als «kein Netzgerät»,
weil ihr Titel kein Gerätewort trug — 3D-Druckstifte, UV-Nageltrockner 120 W/180 W, Waffel-/Sandwichmaker, TV-Boxen,
Raumheizer, Mini-Dampfbügel, Lockenwickler, Wachsmaschine, Luftentfeuchter, beheizbare Stiefel, Erdungsmatten,
«Elektrischer Heizkamm» (nur CN/UK/AU/US, kein EU). Alle Varianten waren kaufbar.

## Neue Regeln in `automation/cj_stecker_pruefen.py`

| Regel | Beispiel → Code | Wortfallen (bleiben unberührt) |
|---|---|---|
| Langform + Stecker-Wort direkt dahinter (standard/regulations/specifications/gauge/plug/Stecker/Norm/Vorschriften) | «American Standard» → US, «National Standard» → CN, «GB Plug» → UK, «Swiss plug» → passt | «C10 Full English Version», «Englische Version» (Sprache), «Blue-Chinese» (Verpackung), «China Red» (Farbe), «European Code»/«European Standard Size» (Grösse), «64GB Plug and Play» |
| «… version» nur bei Netzgerät-Titel, nie Englisch/Chinesisch | «American version» beim Netzgerät → US | «Army green-American version» beim Notfallradio (Frequenzband) |
| lose Langform/Kürzel am Ende | «Cat Style China» → CN, «Blue-USA» → US, «White-AUS» → AU, «Beige-Cn-1PCS» → CN, «2GB/32GBUK» → UK | «Deutsch USA UK Frz. 24 Mann» (Bausteine) |
| Code neben Spannung = fester Beleg | «Suit 9 US 110V», «Netzstecker-220 V US» | «Rot 220V» |
| **Stecker-Achse**: ≥ 2 verschiedene Codes in Steckerposition (Ende / Anfang mit Bindestrich) = Netzgerät, auch ohne Gerätewort | «Weiss-US»/«Weiss-EU», «AU-New Blue»/«EU-New Blue» | Kleider «US 2 / US10», Ringe «US 7», Schuhe «38 / EU», «UK7 / UK 12», Bettwäsche «US Twin», «US-4G-3 Million» (Funkband) |
| CJ-Variante: Langform nur im `variantKey` | Key «American Standard» → US | `variantNameEn` beginnt mit dem Produktnamen («65W GaN Charger With US-standard …») |

**«K3082 English Double Disk»** (Festplatten-Dock `15449131811201`, Variante `56054600499585`): CJ führt die Variante
nur als `K3082 English Double Disk` (Achse «Color Style», kein Stecker-Wort). Neben «Euro Double Disk» und
«US Standard Double Plate» ist UK wahrscheinlich, aber **nicht belegt** → bleibt kaufbar, offen (siehe unten).

Selbsttest: **97/97 grün** (`python3 automation/cj_stecker_pruefen.py --selbsttest`), davon 62 neue Kanarien (vorher 35)
(Langformen, Sprach-/Verpackungs-/Farb-/Grössenfallen, Achse, MAINS-Wörter, CJ-Key).

## Ergebnis (scharf, 13.10. 18:24 UTC)

- Trockenlauf zuerst (`DRY=1 KEIN_DRAFT=1 LISTE=…`): 407 Sperren, **jede** mit fremdem Code (US 166, UK 137, AU 92,
  CN 9, JP 3), 173 EU-Varianten bleiben, keine Sperre mit EU/Euro/CH im Text. 7 CJ-Abfragen (über `cj_takt`) für
  Varianten ohne Shop-Kennung; Thermodrucker «USB connection» = CJ-Key «TDL402 USB connection-US» (Achse «Electrical outlet»).
- Scharf: **407 Varianten in 65 Produkten gesperrt**, 0 Fehler, 0 gedraftet. Ledger: 407 × «gesperrt-belegt».
- Rücklesen Admin-API: 407/407 `availableForSale=false` + DENY + tracked + 0; 170 EU-Varianten weiter kaufbar,
  3 EU-Varianten waren schon vorher nicht kaufbar (LED-Phototherapie-Maske 2PC/3PC, unverändert).
- Storefront (WebFetch `…/products/<handle>.js`): Babyphone — European Standard `true`, American/British/Australian
  `false`; LED-Maske — European `true`, American/National/Australian/British `false`.
- Klasse jetzt: 123 Produkte (58 schon gesperrt, 62 neu gesperrt, 3 ohne EU). Zusammen mit dem Morgenlauf:
  **890 gesperrte Varianten** im Ledger.

### Ohne kaufbare Variante — NICHT gedraftet, nur gemeldet (Betreiber-Entscheid)

- `15448891392385` Vogelbad-Heizer mit Thermostat — nur US (2 Varianten)
- `15455824413057` Elektrische Wärmende Augenmaske USB-Ladbar — nur UK/US (Text: «Steckertypen: UK, US oder ohne Stecker»; die Variante «ohne Stecker» fehlt im Shop)
- `15478569304449` Elektrischer Heizkamm für vielseitiges Styling — CN 2, UK, AU, US (kein EU)

Sie stehen ACTIVE, aber ausverkauft. Der tägliche Wächter draftet sie nicht nachträglich (nichts mehr zu sperren).
Optionen: DRAFT + `stecker-unpassend-ch`, EU-Variante bei CJ suchen, oder lassen.

### 65W GaN Ladegerät `15447865819521`

Titel «65W GaN Ladegerät mit US-Stecker» → **«65W GaN Ladegerät mit Wechselsteckern (EU/US)»**. Beleg: kaufbar sind nur
noch «US+EU» und «US+EU+AU+UK» (je Weiss/Schwarz); CJ: «65W GaN Charger With US-standard Conversion Plug».
Handle `65w-gan-ladegerat-mit-us-stecker-616800` bleibt (Links). Beschreibung/SEO-Text sagen weiter
«US-Standard-Konversionsstecker» — technisch richtig (US-Grundstecker + Wechselstecker), nicht geändert.
Rückweg Titel: alter Wert «65W GaN Ladegerät mit US-Stecker».

## Einzel-Varianten-Produkte (alter Block)

- `MAINS` kennt jetzt Ladestation, Ladeständer, Ladedock, Ladeschale, Charger, Ladegeraet, Netz-/Lade-/Strom-/Power-Adapter,
  Adapter; `NICHT` zusätzlich «fürs Auto»; Reiseadapter bleiben draussen (der fremde Stecker ist dort der Zweck).
  Gemessen: **266 Kandidaten** offen (davon 12 Neuimporte der letzten 3 Tage; ~217 Ein-Varianten-Produkte, Rest
  wird ohne CJ-Abfrage als «mehrere-varianten» quittiert).
- `NEU_TAGE=3` holt die Neuimporte direkt aus Shopify (`created_at`) und prüft sie ZUERST — der Export
  `/tmp/export.jsonl` kann alt sein.
- `automation/fixer_keepalive.sh`: Der Block stand seit 28.09. still (`grep -q "^FERTIG"` traf die alte Schlusszeile
  im angehängten Log). Jetzt täglich `CAP=150 NEU_TAGE=3`, alle 12 h solange die letzte Schlusszeile FORTSETZUNG ist
  → die Altlast ist in ~2 Tagen durch. Verhalten unverändert: kein EU bei CJ → DRAFT `stecker-unpassend-ch`;
  EU vorhanden, unsere SKU nicht die EU-SKU → nur melden (`STECKER-UNKLAR.md`).

## Offen

1. «K3082 English Double Disk» — UK wahrscheinlich, nicht belegt; Betreiber/CJ-Rückfrage oder Bild prüfen.
2. Sun X7Max `15448831426945`: 2 Varianten «Other specifications plug» (unbekannter Stecker) — kaufbar, nicht angefasst.
3. Einzel-Code ohne Achse, nicht gesperrt: Akku-Gürtel `15447869587841` «150Ah Set-CN», Astronaut-Kamera
   `15450838106497` «US», Fleckenentferner-Sprühpistole `15473060413825` (beide Varianten «-US»).
4. Die drei Produkte ohne kaufbare Variante (oben).

## Rückweg

- Je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (stellt Policy + tracked aus dem Ledger her).
- Liste dieses Laufs (pid, vid, Code, Variante): Scratchpad `umsetzung/stecker/lang/scharf_liste.tsv`; Ledger-Zeilen
  vom 13.10. mit Grund `sperren`, `sperren-ohne-eu`, `kein-eu-gesperrt`.

## Neu gesperrte Produkte (65)

| Produkt | Lücke | gesperrt | EU bleibt |
|---|---|---|---|
| `15448849023361` 3-in-1 Retro Gaming & Media Box | Geraet nicht erkannt | AU 3, UK 3, US 3 | 3 |
| `15473060774273` 3-in-1 Saugroboter für alle Böden | Geraet nicht erkannt | UK 1, US 1 | 1 |
| `15448892178817` 3D Mal- und Graffiti-Stift | Geraet nicht erkannt | UK 4, US 4 | 4 |
| `15448892113281` 3D-Druckstift | Geraet nicht erkannt | AU 8, UK 8, US 8 | 8 |
| `15448892080513` 3D-Druckstift der sechsten Generation | Geraet nicht erkannt | AU 10, UK 10, US 10 | 10 |
| `15448891982209` 3D-Druckstift für Kinder | Geraet nicht erkannt | AU 4, UK 4, US 4 | 4 |
| `15454162616705` 3D-gedruckte Gummimatte | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15454915101057` 40 mm Eirollen-Lockendreher mit LCD-Bildschirm | Geraet nicht erkannt | UK 2, US 2 | 2 |
| `15475905888641` 4L Trinkbrunnen für Haustiere | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15455898239361` 5-in-1 Lunchbox mit Schnellheizung für Zuhause und A | Geraet nicht erkannt | UK 10, US 10 | 10 |
| `15454915330433` 6-in-1 Haarstyling-Set | Geraet nicht erkannt | UK 2, US 2 | 2 |
| `15449175753089` 6-in-1 Warmluftkamm für Styling & Volumen | Geraet nicht erkannt | US 1 | 1 |
| `15475057688961` Akku-Astschere, bürstenlos | Geraet nicht erkannt | UK 2, US 2 | 2 |
| `15454384619905` Aromatherapie-Nebelduftuhr | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15454915232129` Aufblasbare Schwimmplattform mit Motor | Geraet nicht erkannt | UK 1, US 1 | 2 |
| `15483793539457` Automatischer Futterautomat | Geraet nicht erkannt | UK 1, US 1 | 1 |
| `15454915166593` Automatischer Haarlockenwickler 32mm | Geraet nicht erkannt | AU 6, UK 6, US 6 | 6 |
| `15479379132801` Beheizbare Winterstiefel mit herausnehmbaren Heizele | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448890245505` Digitaler Kalenderwecker mit Medikamenten-Erinnerung | Geraet nicht erkannt | AU 1, JP 1, US 1 | 1 |
| `15453793878401` Elektrisch leitende Yogamatte aus Leder | Geraet nicht erkannt | UK 1 | 2 |
| `15459741106561` Elektrische Lunchbox | Geraet nicht erkannt | UK 4, US 4 | 4 |
| `15455824413057` Elektrische Wärmende Augenmaske USB-Ladbar 3-Geschwi | Geraet nicht erkannt | UK 2, US 2 | 0 |
| `15478569304449` Elektrischer Heizkamm für vielseitiges Styling | Geraet nicht erkannt | AU 1, CN 2, UK 1, US 1 | 0 |
| `15454118084993` Elektrischer Mini-Topf | Geraet nicht erkannt | UK 2, US 2 | 2 |
| `15452682387841` Faltbare Silikon-Handroll-Trommel | Geraet nicht erkannt | US 1 | 1 |
| `15448848040321` G11 PRO Dual System TV & Retro-Konsole | Geraet nicht erkannt | AU 3, UK 3, US 3 | 3 |
| `15448848564609` G5 Game BOX Jingchen 905L TV-Spielekonsole | Geraet nicht erkannt | AU 2, UK 2, US 2 | 2 |
| `15447906189697` Infrarot-Wärmegurt für Taille & Unterleib | Geraet nicht erkannt | AU 2, UK 2, US 2 | 2 |
| `15448881627521` KM7 SE Android 11 TV Box | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448846958977` Klassische HD Mini TV-Spielkonsole | Geraet nicht erkannt | US 1 | 1 |
| `15454415126913` LED-Phototherapie-Maske | Geraet nicht erkannt | UK 4, US 4 | 6 |
| `15449426657665` Mini Raumluft-Heizer mit Keramik-Heizung | Geraet nicht erkannt | AU 2, UK 2, US 2 | 2 |
| `15449431048577` Mini-Dampfbügel für unterwegs | Geraet nicht erkannt | AU 6, CN 5, UK 5, US 11 | 7 |
| `15450858455425` Multifunktionaler Sandwich- und Waffelmaker | Geraet nicht erkannt | AU 3, UK 3, US 3 | 3 |
| `15448831721857` Nagel Phototherapie LED-Trockner 96W | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448884380033` Ouliyuan Lugx Nagelpoliermaschine | Geraet nicht erkannt | US 1 | 1 |
| `15454914937217` Professioneller Infrarot-Glätt- und Kurbelstyler | Geraet nicht erkannt | US 1 | 1 |
| `15448849711489` Retro Super Console X Cube | Geraet nicht erkannt | US 14 | 11 |
| `15450828964225` Schwebende LED-Weltkarte mit Magnetlevitation | Geraet nicht erkannt | AU 4, UK 4, US 5 | 4 |
| `15450840203649` Schwebender Bonsai-Topf mit Magnet-Levitation | Geraet nicht erkannt | AU 5, UK 5, US 5 | 5 |
| `15455301435777` Smart-Feuchtigkeitsregler mit App, 500 ml | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15470368457089` Stoppuhr mit grossem Display und Zyklus-Timer | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448831426945` Sun X7Max Nagel-Phototherapiegerät 180W | Geraet nicht erkannt | AU 2, UK 2, US 2 | 2 |
| `15450857275777` Thermodrucker Bluetooth Etiketten Express | Geraet nicht erkannt | AU 4, UK 4, US 4 | 4 |
| `15450851148161` Tischbrunnen «Flowing Water» Deko-Ornament | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448884347265` Tragbarer Luftentfeuchter – Leise & Kompakt | Geraet nicht erkannt | AU 3, UK 3, US 3 | 3 |
| `15445282750849` UV/LED Nageltrockner 120W | Geraet nicht erkannt | AU 2, UK 2, US 2 | 2 |
| `15448891392385` Vogelbad-Heizer mit Thermostat | Geraet nicht erkannt | US 2 | 0 |
| `15454915035521` Vollautomatischer Haarwellenformer mit Keramikbeschi | Geraet nicht erkannt | UK 6 | 6 |
| `15455081169281` Wachsmaschine | Geraet nicht erkannt | US 2 | 2 |
| `15448843977089` Waffel-Schalen Maker | Geraet nicht erkannt | UK 1, US 1 | 1 |
| `15454915264897` Wasserwellen-Haarkräusler 3-in-1 | Geraet nicht erkannt | UK 1, US 1 | 1 |
| `15447929192833` Wärme-Kompressionshandschuhe mit Ferninfrarot | Geraet nicht erkannt | AU 1, UK 1, US 1 | 1 |
| `15448884052353` Zero Fire Universal WLAN Touch-Wandschalter | Geraet nicht erkannt | AU 8, UK 8, US 8 | 8 |
| `15454414930305` Zerstäuber für Wassernebel | Geraet nicht erkannt | UK 1 | 1 |
| `15467040539009` Zweifacher Handrasenmäher | Geraet nicht erkannt | US 2 | 2 |
| `15448936743297` 7-Farben LED Lichttherapie Maske | Langform | AU 1, CN 1, UK 1, US 1 | 1 |
| `15447878762881` Babyphone mit HD-Kamera und App-Zugriff | Langform | AU 1, UK 1, US 1 | 1 |
| `15449131909505` Externe 4-Disk Harddisk-Station | Langform | US 1 | 1 |
| `15483793506689` Heizer & Luftbefeuchter | Langform | US 1 | 1 |
| `15450850132353` Regenwolken Luftbefeuchter & Diffusor | Langform | US 2 | 2 |
| `15448848761217` Retro 8-Bit Mini-Konsole mit 620 Spielen | Langform | AU 1, UK 1, US 1 | 1 |
| `15454234542465` Zeitgesteuertes Regensystem Regensimulation | Langform | UK 2, US 2 | 2 |
| `15450848428417` Flammen-Vulkan-Luftbefeuchter mit Aroma-Diffusor | Langform (Rest) | JP 2 | 2 |
| `15449425379713` Ultraschall-Luftbefeuchter mit Aromatherapie | Langform (Rest) | CN 1 | 6 |

## Nachtrag 18:30 UTC (Hauptsitzung): 3 Produkte ohne kaufbare Variante gedraftet

- Vogelbad-Heizer 15448891392385 (nur US), Wärmende Augenmaske 15455824413057 (nur UK/US), Heizkamm 15478569304449 (CN/UK/AU/US).
- Regel des Einzel-Varianten-Blocks: CJ hat keine EU-Version → DRAFT + Tag `stecker-unpassend-ch`. Sie galt hier genauso, auch wenn die Sperre über die Varianten lief.
- Ledger: `dropship/_stecker_ohne_kaufbare_variante.tsv`.
- Rückweg: Status ACTIVE und Tag entfernen. Das ist nur sinnvoll, wenn CJ eine EU-Variante anbietet.
