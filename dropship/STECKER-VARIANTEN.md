# Netzstecker je Variante — Stand 2026-11-23

Waechter `automation/cj_stecker_pruefen.py --varianten` (taeglich im Aufseher). Klasse: aktive Produkte mit ≥ 2 Varianten, von denen mindestens eine einen fremden Stecker (US/UK/AU/CN/JP …) traegt.

- Produkte in der Klasse: **70** · Urteile: {'sperren': 56, 'ok-gesperrt': 8, 'reiseadapter-ausgenommen': 1, 'draft-kein-eu': 1, 'sperren-ohne-eu': 4}
- in diesem Lauf gesperrt: **218** Varianten · gedraftet: **1** · Fehler: 0
- Varianten OHNE Steckerkennung werden nie angefasst (welche Version CJ schickt, ist nicht belegt).
- Rueckweg je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (Ledger `dropship/_cj_stecker_varianten.tsv`).

| Produkt | Urteil | EU | fremd | ohne Kennung |
|---|---|---|---|---|
| `15496540356993` Golden Rice Glättungs- und Lockenstab | draft-kein-eu | 0 | UK:1,US:1 | 0 |
| `15447878762881` Babyphone mit HD-Kamera und App-Zugriff | ok-gesperrt | 1 | AU:1 | 0 |
| `15448936743297` 7-Farben LED Lichttherapie Maske | ok-gesperrt | 1 | AU:1,CN:1 | 0 |
| `15449425379713` Ultraschall-Luftbefeuchter mit Aromatherapie | ok-gesperrt | 6 | CN:1 | 1 |
| `15449431048577` Mini-Dampfbügel für unterwegs | ok-gesperrt | 7 | CN:5 | 0 |
| `15450830668161` NEX 2-in-1 Fellpfleger: Föhn & Bürste für Haustier | ok-gesperrt | 3 | CN:2 | 1 |
| `15450833617281` 2-in-1 Auto Becherwärmer & Kühler | ok-gesperrt | 0 | US:1 | 3 |
| `15454234542465` Zeitgesteuertes Regensystem Regensimulation | ok-gesperrt | 2 | UK:2 | 0 |
| `15455794266497` Wasserdichte Fahrradlampe für Nachtfahrten | ok-gesperrt | 6 | AU:6,UK:6,US:6 | 0 |
| `15495321584001` Smart Travel Charger mit Schnellladefunktion | reiseadapter-ausgenommen | 2 | AU:2,UK:2,US:2 | 2 |
| `15447865491841` Xingrui Digital-Schnellladegerät Schwarz | sperren | 1 | KR:1 | 0 |
| `15495319388545` Haar-Volumen-Heizclip | sperren | 2 | CN:2 | 0 |
| `15496359838081` Olayks Mini-Bratpfanne für Zuhause | sperren | 1 | CN:1 | 0 |
| `15496405451137` Automatischer Lockenstab mit Keramik-Rollaufsatz | sperren | 9 | UK:4,US:9 | 0 |
| `15496530723201` TYME 3-in-1 Spray-Glätteisen & Lockenstab | sperren | 1 | US:1 | 1 |
| `15497421029761` 3-in-1 Warmluftbürste für Locken & Glätten | sperren | 1 | UK:1 | 1 |
| `15497432793473` Glätteisen für trockenes und nasses Haar | sperren | 1 | AU:1 | 2 |
| `15497434366337` Ladestation für PS4-Gamecontroller | sperren | 1 | UK:1,US:1 | 0 |
| `15497440231809` Thermostatisches Schmelzgerät mit Alutopf | sperren | 1 | CN:1,UK:1 | 1 |
| `15497464414593` LED Photonengerät zur Hautverjüngung | sperren | 1 | CN:1 | 0 |
| `15497590768001` Kabellose HD-Überwachungskamera | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15499594334593` Dreifach-Ladestation für Handy und Armband | sperren | 2 | US:2 | 2 |
| `15499595186561` 3-Port Ladestation mit LED-Lampe | sperren | 1 | AU:1 | 0 |
| `15499699585409` Nanodampfer | sperren | 1 | CN:1 | 0 |
| `15500968132993` Keramik-Trinkbrunnen für Katzen & Hunde | sperren | 4 | CN:4 | 4 |
| `15502600765825` Kompakter Durchlauferhitzer für Küche | sperren | 5 | AU/CN:5 | 0 |
| `15503845458305` UV-Lampe für Wimpernkleber | sperren | 1 | AU:1,KR:1 | 1 |
| `15504150692225` Multifunktionaler 3-in-1 Lockenstab | sperren | 1 | AU:1,UK:1 | 0 |
| `15506242601345` Elektrischer Lockenstab mit Rotation | sperren | 3 | CN:3 | 0 |
| `15508396736897` Bluetooth Beistelltisch mit Wireless Charging | sperren | 3 | UK:3,US:3 | 0 |
| `15509364998529` Kabelloser Lade-Bluetooth-Lautsprecher mit LED-Wec | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15448930976129` 2-in-1 Haartrockner & Glätteisen | sperren | 1 | US:1 | 0 |
| `15517576495489` Elektrischer Essenswärmer und Reiskocher | sperren | 8 | CN:8,UK:8,US:8 | 0 |
| `15522128757121` Smarter Schuhtrockner mit Desinfektion | sperren | 2 | CN:2 | 0 |
| `15522211561857` 3D Holographischer LED-Projektor | sperren | 1 | CN:1,UK:1,US:1 | 0 |
| `15523905241473` 6L Mini-Kühlschrank für Getränke | sperren | 6 | AU:6,CN:6 | 9 |
| `16603338473863` Moderne Nachttischlampe | sperren | 12 | US:12 | 0 |
| `16604925821319` Kerzenwärmer-Lampe mit Holzsockel | sperren | 7 | AU:5,UK:7,US:7 | 0 |
| `16604926181767` Tragbares LED-Bühnenlicht aus Aluminium | sperren | 1 | AU:1 | 0 |
| `16610064138631` Fleischwolf aus Edelstahl | sperren | 2 | AU:2 | 0 |
| `16615806206343` Pflanzen-Wachstumslampe für Setzlinge | sperren | 3 | AU:3,UK:9,US:3 | 0 |
| `16615812432263` LED-Lichterkette Stern & Mond für Weihnachten | sperren | 2 | US:4 | 4 |
| `15452680847745` 3D-Hologramm-Fan | sperren | 1 | CN:1 | 0 |
| `15452681011585` Nacktes Auge 3D-Holografischer Projektor | sperren | 1 | CN:1 | 0 |
| `15453772153217` Holziges Raumfeuchtigkeitsgerät | sperren | 2 | US:2 | 0 |
| `15454219075969` Automatischer Doppelwirkungs-Haarglätter für gross | sperren | 3 | AU:3,UK:3 | 0 |
| `15454915789185` Automatischer Haarewickler 32mm für faule | sperren | 2 | CN:2 | 0 |
| `15478568550785` Multifunktionaler 7-in-1 High-Speed Haartrockner | sperren | 4 | AU:4 | 0 |
| `15479419142529` 65W Fast Charge Telescopic Type-C Line Charger | sperren | 1 | CN:1 | 0 |
| `15480284709249` Mini HD Heimprojektor | sperren | 3 | AU:3 | 5 |
| `15481680691585` P330 Mini Beamer – Heimkino für unterwegs | sperren | 2 | AU:2 | 0 |
| `15481680757121` HD Heimkino-Projektor für Smart Home | sperren | 1 | AU:1,US:1 | 0 |
| `15481681019265` Tragbarer Mini-Projektor mit WiFi · 720p nativ | sperren | 3 | AU:3 | 0 |
| `15481681052033` M100 Mini Beamer für Zuhause – Tragbar | sperren | 2 | AU:2 | 0 |
| `15481700843905` 330W Super-Schnelllade-Netzteil | sperren | 1 | AU:1,KR:1 | 0 |
| `15482001359233` Ladegerät für Elektro-Schubkarre & Balance Car | sperren | 3 | AU:3 | 0 |
| `15493808357761` USB-Schnellladegerät mit 12 Anschlüssen | sperren | 1 | US:1 | 0 |
| `15493848203649` 4-in-1 Wireless Ladestation mit Schnellladefunktio | sperren | 2 | UK:2,US:2 | 18 |
| `15493854691713` Elektrischer Fleischwolf für den Haushalt | sperren | 5 | CN:5 | 0 |
| `15493863473537` Phantom Tischlampe mit Wireless Charger | sperren | 1 | CN:1 | 0 |
| `15493920162177` Mini Corn Lockenstab für mehr Volumen | sperren | 6 | UK:6 | 0 |
| `15495012548993` Handy- & Tablet-Ladegerät | sperren | 4 | KR:1 | 3 |
| `15495104332161` Elektrischer Hot Pot mit Antihaftbeschichtung | sperren | 3 | CN:3 | 0 |
| `15495136215425` WLAN-Überwachungskamera für Zuhause | sperren | 1 | US:1 | 2 |
| `15495190348161` Elektrischer Glättbürste mit LED-Display | sperren | 1 | AU:1,US:1 | 1 |
| `15495214072193` Dual-Port USB-C Schnellladeadapter 20W | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15496614379905` Dual-Ladestation für PS5 Wireless Gamepads | sperren-ohne-eu | 0 | US:1 | 1 |
| `16612770709895` Elektrische Lunchbox mit Warmhaltefunktion | sperren-ohne-eu | 0 | UK:1,US:1 | 2 |
| `16617706226055` LED-Tischlampe modern und schlicht | sperren-ohne-eu | 0 | CN:1 | 3 |
| `16638319722887` Terrarium-Licht mit Metall-Clip | sperren-ohne-eu | 0 | CN:1 | 1 |

## Ohne kaufbare Variante nach diesem Lauf (1)

- `15496540356993` Golden Rice Glättungs- und Lockenstab (draft-kein-eu)
