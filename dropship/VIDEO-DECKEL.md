# 🎬 Video-Deckel: 126 von 250 Plätzen ohne Kundennutzen (gemessen 07.09.2026)

Der Betreiber wollte die CJ-Produktvideos auf der Webseite. **Der Weg dorthin ist gefunden und
gebaut** (`automation/cj_video_backfill.mjs`, POST `/product/queryVideosByProductId`) — er
scheitert an einer Grenze des Shopify-Plans, nicht an der Technik:

| gemessen 07.09. | |
|---|---:|
| Video-Plätze im Plan | **250** |
| belegt | **249** (Shopify zählt 250 und lehnt ab) |
| davon an einem AKTIVEN Produkt | 123 |
| davon an einem ENTWURF (unsichtbar) | **61** |
| davon an gar keinem Produkt | **65** |
| davon im Live-Theme verwendet | **0** |
| 3D-Modelle (teilen sich den Deckel) | 0 |

Dazu ein ZWEITER, unabhängiger Deckel: ein Video als `GenericFile` hochzuladen (der Weg, den das
Startseiten-Video nimmt und der den 250er-Deckel NICHT berührt) endet mit
`FILE_STORAGE_LIMIT_EXCEEDED` — der Dateispeicher ist seit dem 01.09. voll.

## Was der Betreiber entscheiden muss

Entweder **Platz schaffen** (126 Plätze dienen keiner Kundin) oder den **Plan erhöhen**.
Ich habe NICHTS gelöscht: die 65 freien Videos stehen in **keinem** Post-Ledger, die Hausregel
«ein gepostetes Reel ist verbraucht» greift also nicht, und ein Teil davon sind KI-Videos, die
echtes Geld gekostet haben. Löschen ist unumkehrbar — das ist keine Automaten-Entscheidung.

### Die 65 freien Videos nach Art
- **40** — Reel / Social-Clip
- **12** — BigBuy-Markenware (Lieferant seit 10.07. aus)
- **7** — KI-erzeugt (kostete Geld)
- **6** — sonstiges Marketing

### Vollständige Liste der 65 (an keinem Produkt, nicht im Theme, nicht im Repo)

| angelegt | Datei | Art |
|---|---|---|
| 2026-05-26 | `flame_diffuser_demo.mp4` | sonstiges Marketing |
| 2026-05-31 | `luxestyle_modern_9x16.mp4` | Reel / Social-Clip |
| 2026-05-31 | `luxestyle_moderntour_9x16.mp4` | Reel / Social-Clip |
| 2026-05-31 | `luxestyle_mode_9x16.mp4` | Reel / Social-Clip |
| 2026-05-31 | `luxestyle_mix_9x16.mp4` | Reel / Social-Clip |
| 2026-06-04 | `luxe-reel-test.mp4` | sonstiges Marketing |
| 2026-06-06 | `luxe-premium.mp4` | sonstiges Marketing |
| 2026-06-14 | `reel-brise-tiktok.mp4` | Reel / Social-Clip |
| 2026-06-16 | `ab-ohrringe-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `ab-armband-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `ab-caps-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `ab-bucket-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `savelist-schmuck-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `ab-sonnenbrille-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `partner-armband-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `savelist-fuer-ihn-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-pflege-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-styling-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-echtvsbillig-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-hautton-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-geschenk-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-fehler-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-pflege-9x16_71b24271-9504-4224-856d-27c972a5a893.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-cap-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-trends-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-kettenlaenge-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-wanderkaffee-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-packliste-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-wanderoutfit-9x16.mp4` | Reel / Social-Clip |
| 2026-06-16 | `value-wanderhacks-9x16.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-bikini1.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-bikini2.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-badeanzug.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-pavillon.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-feuer.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-kaffee.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-jokari.mp4` | Reel / Social-Clip |
| 2026-06-17 | `reel-inv-bosch.mp4` | Reel / Social-Clip |
| 2026-06-18 | `luxe-werbung-smooth.mp4` | sonstiges Marketing |
| 2026-06-19 | `mw-blazer-roma.mp4` | sonstiges Marketing |
| 2026-06-20 | `luxe-montage-premium-bestseller.mp4` | sonstiges Marketing |
| 2026-06-23 | `luxe-seetest-9x16-meta.mp4` | Reel / Social-Clip |
| 2026-06-23 | `luxe-armband-layering-9x16-meta.mp4` | Reel / Social-Clip |
| 2026-06-23 | `luxe-schmuck-gschenk-9x16-meta.mp4` | Reel / Social-Clip |
| 2026-06-23 | `luxe-herren-9x16-meta.mp4` | Reel / Social-Clip |
| 2026-06-23 | `luxe-save5-schmuck-9x16-meta.mp4` | Reel / Social-Clip |
| 2026-06-26 | `seedance-aurora.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-flame.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-wasserfest.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-speaker.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-smartwatch.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-herzmuschel.mp4` | KI-erzeugt (kostete Geld) |
| 2026-06-26 | `seedance-geburtsstein.mp4` | KI-erzeugt (kostete Geld) |
| 2026-07-02 | `olivia-watch.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `amore.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `viceroy-earrings.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `police-watch.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `boss-sunglasses.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `tissot-watch.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `kennethcole-watch.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `casio-watch.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `newera-bag.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `sie-und-ihn.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `sonnenbrillen.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |
| 2026-07-02 | `viceroy-bangle.mp4` | BigBuy-Markenware (Lieferant seit 10.07. aus) |

### Videos an ENTWURFS-Produkten (61) — für Kundinnen unsichtbar

| Datei | Produkt (DRAFT) |
|---|---|
| `3in1_charger.mp4` | 3-in-1 Wireless Charger · iPhone + AirPods + Apple Watch, 15 |
| `bambus_diff_500.mp4` | Aroma Diffuser Bambus 500ml · 7 LED Farben, Ultraschall |
| `bluetooth_anc.mp4` | Bluetooth Kopfhörer ANC · Active Noise Cancellation, 40h Akk |
| `d1.mp4` | Vakuumierer «FreshSeal» · Lebensmittel bis 5× länger frisch |
| `d2.mp4` | Elektrischer Messerschärfer «SharpPro» · 3 Stufen, blitzschn |
| `d3.mp4` | Keramik-Seifenspender «Foam» · edle Schaum-Pumpe fürs Bad |
| `d5.mp4` | Herren-Langarmshirt «Bamboo» · Bambus-Viskose, atmungsaktiv  |
| `d6.mp4` | V-Neck T-Shirt «Bamboo» · Bambus-Baumwolle, weich (vegan) |
| `d7.mp4` | Damen-Bluse «Bamboo» · Stehkragen, Bambus-Viskose (vegan) |
| `d8.mp4` | Damen Jute-Espadrilles «Riviera» · geflochten, vegan |
| `d9.mp4` | Herren Kork-Slipper «Lisbon» · leicht & vegan (Sommer) |
| `f4b.mp4` | Strick-Pullover «Bamboo» · Rundhals Vintage, Bambusfaser (ve |
| `faszienrolle_demo.mp4` | Faszienrolle Premium 3er-Set – Schaumstoff-Roller + Triggerp |
| `flame_diffuser_demo_v2.mp4` | Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humidi |
| `g1.mp4` | Ball-Aufbewahrung «Sportstand» · Regal für Basketball, Fussb |
| `g2.mp4` | Boho Kerzenhalter «Rattan» · stehendes Windlicht für Garten  |
| `g4.mp4` | Kabel-Organizer «Clean Desk» · Schreibtisch-Halter für Kabel |
| `hepa_luft.mp4` | HEPA Luftreiniger Smart · 35m², App-Steuerung, Flüsterleise |
| `luma-flame-9x16.mp4` | Flame Diffuser Premium – 7 LED-Farben, Kamin-Effekt & Humidi |
| `luxe-akku-lampe.mp4` | Akku-Tischlampe «Lumi» · Kabellos, dimmbar & warmes Licht |
| `luxe-aurelia-9x16.mp4` | Statement-Ohrring-Set «Aurelia» · Creolen & Stecker, Gold |
| `luxe-baskenmuetze-scintille-9x16.mp4` | Pailletten-Baskenmütze «Scintille» · Glitzer Weiss |
| `luxe-burger-smasher.mp4` | Burger-Smasher & Grill-Helfer-Set · Edelstahl (Patty-Presse, |
| `luxe-camping-stuhl.mp4` | Camping-Stuhl «Sunshade» · faltbar mit Sonnendach & Getränke |
| `luxe-casio-9x16.mp4` | Casio Damenuhr |
| `luxe-ck-9x16.mp4` | Calvin Klein «Eternity for Men» Eau de Toilette |
| `luxe-dg-theone-9x16.mp4` | Dolce & Gabbana «The One» Eau de Parfum · 50 ml |
| `luxe-docker-marin-9x16.mp4` | Docker-Mütze «Marin» · Washed Bordeaux, Stern-Patch |
| `luxe-donut-bett.mp4` | Donut-Hundebett «Cozy» · Flauschig, beruhigend & waschbar |
| `luxe-fenrir-9x16.mp4` | Herren-Halskette «Fenrir» · Edelstahl-Weizenkette (wasserfes |
| `luxe-flexhold.mp4` | Boden-Ständer «FlexHold» · für Handy & Tablet, höhenverstell |
| `luxe-gartenleuchten.mp4` | Solar-Gartenleuchten «Lumière» · 3er-Set Retro-Wegleuchten ( |
| `luxe-guess-9x16.mp4` | Guess · Damenuhr Glamour |
| `luxe-herzketten.mp4` | Partner-Herzketten «Aimant» · Magnet-Herz, 2er-Set für Paare |
| `luxe-hugo-9x16.mp4` | Hugo Boss «Alive Intense» Eau de Parfum |
| `luxe-lagune-9x16.mp4` | Boho-Halskette «Lagune» · Türkis-Crescent, Gold |
| `luxe-mesh-armband.mp4` | Mesh-Armband «Maille» · S925 Silber, federleicht |
| `luxe-mk-9x16.mp4` | Michael Kors · Handtasche |
| `luxe-muschel-kette.mp4` | Muschel-Anhänger-Kette «Coquille» · Gold-Optik, maritim |
| `luxe-olivia-9x16.mp4` | Boho-Fusskette «Olivia» · Blatt-Anhänger, Gold |
| `luxe-perlen-ohrhaenger.mp4` | Perlen-Ohrhänger «Éventail» · S925 Silber & Süsswasserperle |
| `luxe-pool-spiel.mp4` | Aufblasbares Pool-Spiel «3-Gewinnt» · Wurfspiel mit 8 Bällen |
| `luxe-retro-speaker.mp4` | Retro Plattenspieler Bluetooth-Lautsprecher «Vinyl» |
| `luxe-samsara-9x16.mp4` | Boho-Choker «Samsara» · 7-Chakra Heishi-Perlen, Naturstein |
| `luxe-slow-feeder.mp4` | Slow-Feeder Hundenapf «Slow» · Anti-Schling mit Napf-Tablett |
| `luxe-sonnenliege.mp4` | Aufblasbare Sonnenliege «Solara» mit Sonnendach |
| `luxe-swatch-9x16.mp4` | Swatch · Uhr Swiss Made |
| `luxe-wandleuchte.mp4` | LED-Wandleuchte «Spot» · mit dimmbarem Lese-Spot (Schlafzimm |
| `notebook_demo.mp4` | Premium Notebook & Pen Set A5 – Echtleder, Touch-Pen, Busine |
| `np-becher.mp4` | Kupfer-Becher «Mule» · 4er-Set, Edelstahl |
| `np-feuerschale.mp4` | Feuerschale «Inferno» · Wärme & Ambiente |
| `np-haengematte.mp4` | Hängematte «Riviera» · 2er-Set gestreift |
| `np-kaffee.mp4` | Kapsel-Kaffeemaschine «Espresso» · 19 bar, 1 L |
| `np-kemper.mp4` | Camping-Gaskocher «Kemper» · Kartuschen-Kocher |
| `np-laterne.mp4` | Camping-Laterne «Black Diamond» · LED, dimmbar |
| `pillow_spray_demo.mp4` | Pillow Spray Premium Lavendel – Schlaf-Mist 100ml, Aromather |
| `slideshow-15449433309569.mp4` | 3D-Lichtmalpad mit 8 Effekten |
| `slideshow-15449433538945.mp4` | Portabler Outdoor-Hundewassernapf |
| `smart_diffuser_xxl.mp4` | Smart Diffuser Premium XXL – Bluetooth, Waterless, 200m² Räu |
| `x4.mp4` | 12-in-1 Multitool – klappbares Edelstahl-Werkzeug mit Schrau |
| `z1.mp4` | 4L Luftbefeuchter – Cool-Mist für grosse Räume, leise, lang  |

## Was schon fertig ist

`cj_video_backfill.mjs` prüft den Deckel VORAB und endet mit `PAUSE`, ohne einen CJ-Punkt zu
verbrauchen. Sobald ein Platz frei ist, hängt derselbe Lauf die Videos ohne weiteres Zutun an.
CJ liefert sie: an 25 Stichproben gemessen haben **8 %** der Produkte ein Video beim Lieferanten.

