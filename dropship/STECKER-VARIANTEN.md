# Netzstecker je Variante — Stand 2026-10-22

Waechter `automation/cj_stecker_pruefen.py --varianten` (taeglich im Aufseher). Klasse: aktive Produkte mit ≥ 2 Varianten, von denen mindestens eine einen fremden Stecker (US/UK/AU/CN/JP …) traegt.

- Produkte in der Klasse: **120** · Urteile: {'ok-gesperrt': 120}
- in diesem Lauf gesperrt: **0** Varianten · gedraftet: **0** · Fehler: 0
- Varianten OHNE Steckerkennung werden nie angefasst (welche Version CJ schickt, ist nicht belegt).
- Rueckweg je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (Ledger `dropship/_cj_stecker_varianten.tsv`).

| Produkt | Urteil | EU | fremd | ohne Kennung |
|---|---|---|---|---|
| `15443495846273` LED-Projektor «Ambiente» · Stimmungslicht | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15443497976193` LED-Projektor «Aurora» · Stimmungslicht | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15443531760001` Wireless-Charger «QiFast» · kabellos laden | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15445279474049` UV/LED Lichthärtungsgerät für Gelnägel | ok-gesperrt | 1 | US:1 | 0 |
| `15445282750849` UV/LED Nageltrockner 120W | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15447562158465` 65W PD GaN Ladegerät für Smartphones & Laptops | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15447563403649` 20W Reise-Ladegerät mit USB-A & USB-C | ok-gesperrt | 2 | UK:1,US:2 | 0 |
| `15447563895169` Universal 320W GaN Hochleistungs-Ladegerät | ok-gesperrt | 5 | AU:5,UK:5,US:5 | 0 |
| `15447626875265` Glättbürste mit Digitalanzeige | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15447627334017` Vollautomatischer 32mm Lockenstab mit Negativ-Ione | ok-gesperrt | 3 | UK:3,US:3 | 0 |
| `15447629955457` 5-in-1 Warmluftstyler & Lockenstab | ok-gesperrt | 4 | AU:3,UK:4,US:4 | 0 |
| `15447631987073` Kabelloser Glätt- & Lockenstab mit Kaltluft | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15447632740737` Profi-Haarglätter mit Negativ-Ionen-Pflege | ok-gesperrt | 5 | US:5 | 0 |
| `15447865098625` Lithium-Akku-Ladegerät | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15447865295233` 200W GaN Ladegerät für Mobilgeräte & Laptops | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15447865819521` 65W GaN Ladegerät mit Wechselsteckern (EU/US) | ok-gesperrt | 0 | AU/US:2,CN/US:2,UK/US:2 | 0 |
| `15447867588993` 3-in-1 Faltbarer Magnetischer Wireless Charger | ok-gesperrt | 1 | CN:1,US:1 | 0 |
| `15447868440961` 50W Multi-Port Ladegerät mit Lüfter | ok-gesperrt | 4 | UK:4,US:4 | 0 |
| `15447878762881` Babyphone mit HD-Kamera und App-Zugriff | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15447906189697` Infrarot-Wärmegurt für Taille & Unterleib | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15447929192833` Wärme-Kompressionshandschuhe mit Ferninfrarot | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15448829985153` Nagel Phototherapie Lampe 90W mit Timer | ok-gesperrt | 1 | US:1 | 0 |
| `15448830509441` Nagellichttherapiegerät 96W Kabellos | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15448831197569` Nageldesign Lichthärtungsgerät | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15448831426945` Sun X7Max Nagel-Phototherapiegerät 180W | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 2 |
| `15448831721857` Nagel Phototherapie LED-Trockner 96W | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15448843977089` Waffel-Schalen Maker | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15448846958977` Klassische HD Mini TV-Spielkonsole | ok-gesperrt | 1 | US:1 | 0 |
| `15448848040321` G11 PRO Dual System TV & Retro-Konsole | ok-gesperrt | 3 | AU:3,UK:3,US:3 | 0 |
| `15448848564609` G5 Game BOX Jingchen 905L TV-Spielekonsole | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15448848761217` Retro 8-Bit Mini-Konsole mit 620 Spielen | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 4 |
| `15448849023361` 3-in-1 Retro Gaming & Media Box | ok-gesperrt | 3 | AU:3,UK:3,US:3 | 0 |
| `15448849711489` Retro Super Console X Cube | ok-gesperrt | 11 | US:14 | 0 |
| `15448881627521` KM7 SE Android 11 TV Box | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15448884052353` Zero Fire Universal WLAN Touch-Wandschalter | ok-gesperrt | 8 | AU:8,UK:8,US:8 | 0 |
| `15448884347265` Tragbarer Luftentfeuchter – Leise & Kompakt | ok-gesperrt | 3 | AU:3,UK:3,US:3 | 0 |
| `15448884380033` Ouliyuan Lugx Nagelpoliermaschine | ok-gesperrt | 1 | US:1 | 0 |
| `15448890245505` Digitaler Kalenderwecker mit Medikamenten-Erinneru | ok-gesperrt | 1 | AU:1,JP:1,US:1 | 0 |
| `15448891982209` 3D-Druckstift für Kinder | ok-gesperrt | 4 | AU:4,UK:4,US:4 | 0 |
| `15448892080513` 3D-Druckstift der sechsten Generation | ok-gesperrt | 10 | AU:10,UK:10,US:10 | 0 |
| `15448892113281` 3D-Druckstift | ok-gesperrt | 8 | AU:8,UK:8,US:8 | 0 |
| `15448892178817` 3D Mal- und Graffiti-Stift | ok-gesperrt | 4 | UK:4,US:4 | 0 |
| `15448930746753` Mobiles 2-in-1 Glätteisen & Lockenstab | ok-gesperrt | 3 | US:3 | 0 |
| `15448931598721` 3-in-1 Warmluftbürste für vielseitiges Styling | ok-gesperrt | 9 | US:9 | 9 |
| `15448931729793` Glätteisen mit Lockenfunktion und Kaltluft | ok-gesperrt | 2 | US:2 | 0 |
| `15448931893633` Glättbürste & Lockenstab 2-in-1 | ok-gesperrt | 3 | US:3 | 0 |
| `15448932745601` High-Speed Haartrockner mit Ionen-Technologie | ok-gesperrt | 8 | UK:8,US:8 | 0 |
| `15448936743297` 7-Farben LED Lichttherapie Maske | ok-gesperrt | 1 | AU:1,CN:1,UK:1,US:1 | 0 |
| `15449124372865` Nano-Gesichtsdampfer mit Farblicht | ok-gesperrt | 3 | UK:3,US:3 | 0 |
| `15449131811201` Festplatten-Dockingstation mit Klonfunktion | ok-gesperrt | 0 | US:1 | 10 |
| `15449131909505` Externe 4-Disk Harddisk-Station | ok-gesperrt | 1 | US:1 | 1 |
| `15449175753089` 6-in-1 Warmluftkamm für Styling & Volumen | ok-gesperrt | 1 | US:1 | 0 |
| `15449407521153` Intelligente LED-Lampe | ok-gesperrt | 5 | AU:7,UK:6,US:5 | 3 |
| `15449425379713` Ultraschall-Luftbefeuchter mit Aromatherapie | ok-gesperrt | 6 | AU:6,CN:1,UK:6,US:6 | 1 |
| `15449425609089` 2-in-1 Haarglätter & Lockenstab mit Ionen | ok-gesperrt | 9 | AU:8,UK:9,US:36 | 0 |
| `15449425641857` Smartwecker mit Sunrise-Display & Farblicht | ok-gesperrt | 2 | US:2 | 2 |
| `15449426493825` 3D LED Mond Nachtlicht | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15449426657665` Mini Raumluft-Heizer mit Keramik-Heizung | ok-gesperrt | 2 | AU:2,UK:2,US:2 | 0 |
| `15449429246337` Elektrisches Haarentfernungsgerät | ok-gesperrt | 7 | AU:7,UK:8,US:9 | 6 |
| `15449429934465` LED-Nachtlicht-Pilz mit Sensor (EU/US Stecker) | ok-gesperrt | 5 | AU:5,UK:5,US:10 | 0 |
| `15449431048577` Mini-Dampfbügel für unterwegs | ok-gesperrt | 7 | AU:6,CN:5,UK:5,US:11 | 0 |
| `15449431867777` 3in1 Nachttischlampe | ok-gesperrt | 1 | US:1 | 0 |
| `15449431966081` Air Fryer mit Touch-Bedienung | ok-gesperrt | 5 | UK:5 | 1 |
| `15450828636545` 3-in-1 Wireless Ladestation für mehrere Geräte | ok-gesperrt | 3 | AU:12,UK:4,US:28 | 14 |
| `15450828964225` Schwebende LED-Weltkarte mit Magnetlevitation | ok-gesperrt | 4 | AU:4,UK:4,US:5 | 3 |
| `15450830668161` NEX 2-in-1 Fellpfleger: Föhn & Bürste für Haustier | ok-gesperrt | 3 | AU:2,CN:2,UK:2,US:2 | 1 |
| `15450830897537` 3-in-1 Kabelloses Ladegerät für iPhone, Watch & Ai | ok-gesperrt | 4 | AU:2,US:4 | 2 |
| `15450833617281` 2-in-1 Auto Becherwärmer & Kühler | ok-gesperrt | 0 | US:4 | 3 |
| `15450833715585` Mini HD LED Heimkino-Projektor | ok-gesperrt | 8 | AU:8,UK:10,US:10 | 0 |
| `15450836861313` 3-in-1 Wireless Ladestation für iPhone & Android | ok-gesperrt | 4 | UK:4 | 10 |
| `15450837746049` USB-Ladegerät mit 4 Ports und Quick Charge 3.0 | ok-gesperrt | 14 | UK:4,US:16 | 0 |
| `15450838892929` Aroma Diffuser mit Flammeneffekt | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 12 |
| `15450840203649` Schwebender Bonsai-Topf mit Magnet-Levitation | ok-gesperrt | 5 | AU:5,UK:5,US:5 | 0 |
| `15450848428417` Flammen-Vulkan-Luftbefeuchter mit Aroma-Diffusor | ok-gesperrt | 2 | AU:2,JP:2,UK:2,US:2 | 0 |
| `15450849149313` Elektrischer Multifunktionsschäler | ok-gesperrt | 4 | AU:4,UK:4,US:4 | 4 |
| `15450850132353` Regenwolken Luftbefeuchter & Diffusor | ok-gesperrt | 2 | US:2 | 0 |
| `15450851148161` Tischbrunnen «Flowing Water» Deko-Ornament | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 1 |
| `15450851344769` LED Tischleuchte mit gebogenem Design | ok-gesperrt | 4 | UK:4,US:4 | 6 |
| `15450855506305` Anion Föhn-Bürste für Glanz & Volumen | ok-gesperrt | 7 | AU:7,UK:7,US:7 | 0 |
| `15450857275777` Thermodrucker Bluetooth Etiketten Express | ok-gesperrt | 4 | AU:4,UK:4,US:4 | 2 |
| `15450858455425` Multifunktionaler Sandwich- und Waffelmaker | ok-gesperrt | 3 | AU:3,UK:3,US:3 | 0 |
| `15452682387841` Faltbare Silikon-Handroll-Trommel | ok-gesperrt | 1 | US:1 | 0 |
| `15453761012097` Multi-Funktions-Nähmaschine Elektrisch Automatisch | ok-gesperrt | 1 | JP:1,US:1 | 0 |
| `15453761700225` Flexible USB-Sticklampe, 30 cm | ok-gesperrt | 1 | US:1 | 0 |
| `15453793878401` Elektrisch leitende Yogamatte aus Leder | ok-gesperrt | 2 | UK:1 | 0 |
| `15454118084993` Elektrischer Mini-Topf | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15454162616705` 3D-gedruckte Gummimatte | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15454234542465` Zeitgesteuertes Regensystem Regensimulation | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15454384619905` Aromatherapie-Nebelduftuhr | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15454414930305` Zerstäuber für Wassernebel | ok-gesperrt | 1 | UK:1 | 0 |
| `15454415126913` LED-Phototherapie-Maske | ok-gesperrt | 6 | UK:6,US:6 | 0 |
| `15454914871681` Wellen Lockenstab | ok-gesperrt | 2 | AU:2,CN:2,UK:2,US:2 | 0 |
| `15454914937217` Professioneller Infrarot-Glätt- und Kurbelstyler | ok-gesperrt | 1 | US:1 | 0 |
| `15454915035521` Vollautomatischer Haarwellenformer mit Keramikbesc | ok-gesperrt | 6 | UK:6 | 0 |
| `15454915101057` 40 mm Eirollen-Lockendreher mit LCD-Bildschirm | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15454915166593` Automatischer Haarlockenwickler 32mm | ok-gesperrt | 6 | AU:6,UK:6,US:6 | 0 |
| `15454915232129` Aufblasbare Schwimmplattform mit Motor | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15454915264897` Wasserwellen-Haarkräusler 3-in-1 | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15454915330433` 6-in-1 Haarstyling-Set | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15454915494273` 5-in-1 Heissluft-Bürste Multifunktionaler Hochleis | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15455081169281` Wachsmaschine | ok-gesperrt | 2 | US:2 | 0 |
| `15455301075329` Farbenfrohe Aromatherapie-Lampe für Schreibtisch | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15455301435777` Smart-Feuchtigkeitsregler mit App, 500 ml | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15455794266497` Wasserdichte Fahrradlampe für Nachtfahrten | ok-gesperrt | 6 | AU:6,UK:6,US:6 | 0 |
| `15455898239361` 5-in-1 Lunchbox mit Schnellheizung für Zuhause und | ok-gesperrt | 10 | UK:10,US:10 | 0 |
| `15459741106561` Elektrische Lunchbox | ok-gesperrt | 4 | UK:4,US:4 | 0 |
| `15467040539009` Zweifacher Handrasenmäher | ok-gesperrt | 2 | US:2 | 0 |
| `15470368457089` Stoppuhr mit grossem Display und Zyklus-Timer | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15473059692929` Profi-Haarglätter für schonendes Styling | ok-gesperrt | 3 | US:3 | 0 |
| `15473060315521` Luftbefeuchter für Terrarien (3.5L) | ok-gesperrt | 1 | US:1 | 0 |
| `15473060774273` 3-in-1 Saugroboter für alle Böden | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15474491130241` Haarschonender 2-in-1 Glätteisen | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15475057688961` Akku-Astschere, bürstenlos | ok-gesperrt | 2 | UK:2,US:2 | 0 |
| `15475905888641` 4L Trinkbrunnen für Haustiere | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15478568944001` Multifunktionaler Lockenstab für Wellen | ok-gesperrt | 1 | US:1 | 0 |
| `15478569009537` 5-in-1 Multifunktions-Lockenstab mit Digitalanzeig | ok-gesperrt | 1 | US:1 | 0 |
| `15479379132801` Beheizbare Winterstiefel mit herausnehmbaren Heize | ok-gesperrt | 1 | AU:1,UK:1,US:1 | 0 |
| `15483793506689` Heizer & Luftbefeuchter | ok-gesperrt | 1 | US:1 | 0 |
| `15483793539457` Automatischer Futterautomat | ok-gesperrt | 1 | UK:1,US:1 | 0 |
| `15483935162753` 4-in-1 Ladestation | ok-gesperrt | 1 | US:1 | 0 |
