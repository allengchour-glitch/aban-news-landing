# Netzstecker je Variante — Stand 2026-10-13

Waechter `automation/cj_stecker_pruefen.py --varianten` (taeglich im Aufseher). Klasse: aktive Produkte mit ≥ 2 Varianten, von denen mindestens eine einen fremden Stecker (US/UK/AU/CN/JP …) traegt.

- Produkte in der Klasse: **60** · Urteile: {'sperren': 54, 'sperren-ohne-eu': 3, 'ok-gesperrt': 2, 'draft-kein-eu': 1}
- in diesem Lauf gesperrt: **439** Varianten · gedraftet: **1** · Fehler: 0
- Varianten OHNE Steckerkennung werden nie angefasst (welche Version CJ schickt, ist nicht belegt).
- Rueckweg je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (Ledger `dropship/_cj_stecker_varianten.tsv`).

| Produkt | Urteil | EU | fremd | ohne Kennung |
|---|---|---|---|---|
| `15467103551873` Kabelloser Trimmer mit SK5-Klinge | draft-kein-eu | 0 | US:2 | 0 |
| `15450828636545` 3-in-1 Wireless Ladestation für mehrere Geräte | ok-gesperrt | 3 | AU:12,UK:4,US:28 | 14 |
| `15450851344769` LED Tischleuchte mit gebogenem Design | ok-gesperrt | 4 | UK:4,US:4 | 6 |
| `15443495846273` LED-Projektor «Ambiente» · Stimmungslicht | sperren | 2 | AU:2,UK:2,US:2 | 0 |
| `15443497976193` LED-Projektor «Aurora» · Stimmungslicht | sperren | 2 | AU:2,UK:2,US:2 | 0 |
| `15443531760001` Wireless-Charger «QiFast» · kabellos laden | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15445279474049` UV/LED Lichthärtungsgerät für Gelnägel | sperren | 1 | US:1 | 0 |
| `15447562158465` 65W PD GaN Ladegerät für Smartphones & Laptops | sperren | 2 | UK:2,US:2 | 0 |
| `15447563403649` 20W Reise-Ladegerät mit USB-A & USB-C | sperren | 2 | UK:1,US:2 | 0 |
| `15447563895169` Universal 320W GaN Hochleistungs-Ladegerät | sperren | 5 | AU:5,UK:5,US:5 | 0 |
| `15447626875265` Glättbürste mit Digitalanzeige | sperren | 2 | UK:2,US:2 | 0 |
| `15447627334017` Vollautomatischer 32mm Lockenstab mit Negativ-Ione | sperren | 3 | UK:3,US:3 | 0 |
| `15447629955457` 5-in-1 Warmluftstyler & Lockenstab | sperren | 4 | AU:3,UK:4,US:4 | 0 |
| `15447631987073` Kabelloser Glätt- & Lockenstab mit Kaltluft | sperren | 2 | UK:2,US:2 | 0 |
| `15447632740737` Profi-Haarglätter mit Negativ-Ionen-Pflege | sperren | 5 | US:5 | 0 |
| `15447865098625` Lithium-Akku-Ladegerät | sperren | 1 | UK:1,US:1 | 0 |
| `15447865295233` 200W GaN Ladegerät für Mobilgeräte & Laptops | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15447867588993` 3-in-1 Faltbarer Magnetischer Wireless Charger | sperren | 1 | CN:1,US:1 | 0 |
| `15447868440961` 50W Multi-Port Ladegerät mit Lüfter | sperren | 4 | UK:4,US:4 | 0 |
| `15448829985153` Nagel Phototherapie Lampe 90W mit Timer | sperren | 1 | US:1 | 0 |
| `15448830509441` Nagellichttherapiegerät 96W Kabellos | sperren | 2 | AU:2,UK:2,US:2 | 0 |
| `15448831197569` Nageldesign Lichthärtungsgerät | sperren | 2 | AU:2,UK:2,US:2 | 0 |
| `15448930746753` Mobiles 2-in-1 Glätteisen & Lockenstab | sperren | 3 | US:3 | 0 |
| `15448931598721` 3-in-1 Warmluftbürste für vielseitiges Styling | sperren | 9 | US:9 | 9 |
| `15448931729793` Glätteisen mit Lockenfunktion und Kaltluft | sperren | 2 | US:2 | 0 |
| `15448931893633` Glättbürste & Lockenstab 2-in-1 | sperren | 3 | US:3 | 0 |
| `15448932745601` High-Speed Haartrockner mit Ionen-Technologie | sperren | 8 | UK:8,US:8 | 0 |
| `15449124372865` Nano-Gesichtsdampfer mit Farblicht | sperren | 3 | UK:3,US:3 | 0 |
| `15449407521153` Intelligente LED-Lampe | sperren | 5 | AU:7,UK:6,US:5 | 3 |
| `15449425379713` Ultraschall-Luftbefeuchter mit Aromatherapie | sperren | 6 | AU:6,UK:6,US:6 | 2 |
| `15449425609089` 2-in-1 Haarglätter & Lockenstab mit Ionen | sperren | 9 | AU:8,UK:9,US:36 | 0 |
| `15449425641857` Smartwecker mit Sunrise-Display & Farblicht | sperren | 2 | US:2 | 2 |
| `15449426493825` 3D LED Mond Nachtlicht | sperren | 2 | AU:2,UK:2,US:2 | 0 |
| `15449429246337` Elektrisches Haarentfernungsgerät | sperren | 7 | AU:7,UK:8,US:9 | 6 |
| `15449429934465` LED-Nachtlicht-Pilz mit Sensor (EU/US Stecker) | sperren | 5 | AU:5,UK:5,US:10 | 0 |
| `15449431867777` 3in1 Nachttischlampe | sperren | 1 | US:1 | 0 |
| `15450830668161` NEX 2-in-1 Fellpfleger: Föhn & Bürste für Haustier | sperren | 3 | AU:2,CN:2,UK:2,US:2 | 1 |
| `15450830897537` 3-in-1 Kabelloses Ladegerät für iPhone, Watch & Ai | sperren | 4 | AU:2,US:4 | 2 |
| `15450833715585` Mini HD LED Heimkino-Projektor | sperren | 8 | AU:8,UK:10,US:10 | 0 |
| `15450836861313` 3-in-1 Wireless Ladestation für iPhone & Android | sperren | 4 | UK:4 | 10 |
| `15450837746049` USB-Ladegerät mit 4 Ports und Quick Charge 3.0 | sperren | 14 | UK:4,US:16 | 0 |
| `15450838892929` Aroma Diffuser mit Flammeneffekt | sperren | 1 | AU:1,UK:1,US:1 | 12 |
| `15450848428417` Flammen-Vulkan-Luftbefeuchter mit Aroma-Diffusor | sperren | 2 | AU:2,UK:2,US:2 | 2 |
| `15450849149313` Elektrischer Multifunktionsschäler | sperren | 4 | AU:4,UK:4,US:4 | 4 |
| `15450855506305` Anion Föhn-Bürste für Glanz & Volumen | sperren | 7 | AU:7,UK:7,US:7 | 0 |
| `15453761012097` Multi-Funktions-Nähmaschine Elektrisch Automatisch | sperren | 1 | JP:1,US:1 | 0 |
| `15453761700225` Flexible USB-Sticklampe, 30 cm | sperren | 1 | US:1 | 0 |
| `15454914871681` Wellen Lockenstab | sperren | 2 | AU:2,CN:2,UK:2,US:2 | 0 |
| `15454915494273` 5-in-1 Heissluft-Bürste Multifunktionaler Hochleis | sperren | 1 | UK:1,US:1 | 0 |
| `15455301075329` Farbenfrohe Aromatherapie-Lampe für Schreibtisch | sperren | 1 | AU:1,UK:1,US:1 | 0 |
| `15455794266497` Wasserdichte Fahrradlampe für Nachtfahrten | sperren | 6 | AU:6,UK:6,US:6 | 0 |
| `15473059692929` Profi-Haarglätter für schonendes Styling | sperren | 3 | US:3 | 0 |
| `15473060315521` Luftbefeuchter für Terrarien (3.5L) | sperren | 1 | US:1 | 0 |
| `15474491130241` Haarschonender 2-in-1 Glätteisen | sperren | 1 | UK:1,US:1 | 0 |
| `15478568944001` Multifunktionaler Lockenstab für Wellen | sperren | 1 | US:1 | 0 |
| `15478569009537` 5-in-1 Multifunktions-Lockenstab mit Digitalanzeig | sperren | 1 | US:1 | 0 |
| `15483935162753` 4-in-1 Ladestation | sperren | 1 | US:1 | 0 |
| `15447865819521` 65W GaN Ladegerät mit US-Stecker | sperren-ohne-eu | 0 | AU/US:2,CN/US:2,UK/US:2 | 0 |
| `15449131811201` Festplatten-Dockingstation mit Klonfunktion | sperren-ohne-eu | 0 | US:1 | 10 |
| `15450833617281` 2-in-1 Auto Becherwärmer & Kühler | sperren-ohne-eu | 0 | US:4 | 3 |
