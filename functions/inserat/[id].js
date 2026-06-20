// GET /inserat/:id — serverseitig gerenderte Detailseite eines Inserats.
// Crawler-/Share-tauglich: Titel, Beschreibung & Open-Graph stehen direkt im HTML.
// Echte Inserate aus D1 (nur 'approved'); Demo-IDs (demo-*) aus eingebauten Beispielen.

const DEMO = {
  "demo-1": {
    "kat": "Möbel",
    "titel": "Eiche-Esstisch ausziehbar",
    "preis": "CHF 420.–",
    "ort": "Zürich",
    "plz": "8001",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🪑",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Massiv, 160–220 cm, sehr guter Zustand. Abholung in Zürich.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-2": {
    "kat": "Immobilien",
    "titel": "3.5-Zimmer-Wohnung mit Balkon",
    "preis": "CHF 1'890.–/Mt",
    "ort": "Bern",
    "plz": "3000",
    "typ": "Angebot",
    "emoji": "🏠",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Hell und ruhig, ÖV in 3 Min. Bezug per sofort.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-3": {
    "kat": "Auto & Teile",
    "titel": "VW Golf 7 1.4 TSI",
    "preis": "CHF 12'500.–",
    "ort": "Luzern",
    "plz": "6003",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🚗",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "98'000 km, frisch ab MFK, Winterräder inklusive.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-4": {
    "kat": "Fahrrad",
    "titel": "E-Bike Trekking 500 Wh",
    "preis": "CHF 1'350.–",
    "ort": "Basel",
    "plz": "4051",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🚲",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Bosch-Motor, 1'200 km, Service neu gemacht.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-5": {
    "kat": "Handy",
    "titel": "iPhone 14 128 GB",
    "preis": "CHF 540.–",
    "ort": "Winterthur",
    "plz": "8400",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "📱",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Akku 91 %, keine Kratzer, mit Originalverpackung.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-6": {
    "kat": "Mode",
    "titel": "Winterjacke Damen Gr. M",
    "preis": "CHF 60.–",
    "ort": "St. Gallen",
    "plz": "9000",
    "zustand": "Neu",
    "typ": "Angebot",
    "emoji": "🧥",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Ungetragen, warm und wasserdicht.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-7": {
    "kat": "Immobilien",
    "titel": "Möbliertes WG-Zimmer",
    "preis": "CHF 720.–/Mt",
    "ort": "Lausanne",
    "plz": "1003",
    "typ": "Angebot",
    "emoji": "🛏️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "20 m², zentral, ab nächstem Monat frei.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-8": {
    "kat": "Computer",
    "titel": "MacBook Air M1",
    "preis": "CHF 690.–",
    "ort": "Zug",
    "plz": "6300",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "💻",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "256 GB, 8 GB RAM, sehr guter Akku.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-9": {
    "kat": "Dienstleistungen",
    "titel": "Umzugshilfe gesucht",
    "preis": "",
    "ort": "Zürich",
    "plz": "8050",
    "typ": "Gesuch",
    "emoji": "📦",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "2 Stunden, 2 Personen, Samstag. Faire Bezahlung.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-10": {
    "kat": "Sport",
    "titel": "Ski-Set 170 cm + Stöcke",
    "preis": "CHF 180.–",
    "ort": "Chur",
    "plz": "7000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎿",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Allmountain, inkl. Bindung, guter Zustand.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-11": {
    "kat": "Haustier",
    "titel": "Katzen-Kratzbaum gross",
    "preis": "CHF 45.–",
    "ort": "Thun",
    "plz": "3600",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🐈",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "180 cm, stabil, gereinigt. Abholung Thun.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-12": {
    "kat": "Baby & Kind",
    "titel": "Kinderwagen 3-in-1",
    "preis": "CHF 280.–",
    "ort": "Fribourg",
    "plz": "1700",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "👶",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Inkl. Babywanne und Maxi-Cosi-Adapter.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-13": {
    "kat": "TV & Audio",
    "titel": "Soundbar mit Subwoofer",
    "preis": "CHF 130.–",
    "ort": "Aarau",
    "plz": "5000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🔊",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Bluetooth, kräftiger Bass, mit Fernbedienung.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-14": {
    "kat": "Gaming",
    "titel": "PlayStation 5 mit 2 Controllern",
    "preis": "CHF 380.–",
    "ort": "Zürich",
    "plz": "8004",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎮",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Disc-Version, inkl. 3 Spiele. Top-Zustand.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-15": {
    "kat": "Foto & Video",
    "titel": "Spiegelreflexkamera + Objektiv",
    "preis": "CHF 320.–",
    "ort": "Bern",
    "plz": "3008",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "📷",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "24 MP, 18–55 mm Kit, wenig Auslösungen.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-16": {
    "kat": "Küche",
    "titel": "Küchenmaschine mit Zubehör",
    "preis": "CHF 150.–",
    "ort": "Luzern",
    "plz": "6005",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🍳",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Rührschüssel, Knethaken, Schwingbesen dabei.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-17": {
    "kat": "Wohnen & Deko",
    "titel": "Stehlampe Messing-Look",
    "preis": "CHF 55.–",
    "ort": "Basel",
    "plz": "4053",
    "zustand": "Neu",
    "typ": "Angebot",
    "emoji": "💡",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Dimmbar, warmweiss. Noch originalverpackt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-18": {
    "kat": "Motorrad",
    "titel": "Roller 125 ccm",
    "preis": "CHF 1'650.–",
    "ort": "Winterthur",
    "plz": "8400",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🛵",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "12'000 km, ab Service, 2 Helme inklusive.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-19": {
    "kat": "Werkzeug",
    "titel": "Akkuschrauber-Set",
    "preis": "CHF 90.–",
    "ort": "Sitten",
    "plz": "1950",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🛠️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "2 Akkus, Ladegerät, Koffer mit Bits.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-20": {
    "kat": "Garten",
    "titel": "Gartentisch mit 4 Stühlen",
    "preis": "CHF 120.–",
    "ort": "Thun",
    "plz": "3600",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🌿",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Wetterfest, wenig benutzt. Abholung Thun.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-21": {
    "kat": "Musik & Instrumente",
    "titel": "Akustikgitarre für Anfänger",
    "preis": "CHF 95.–",
    "ort": "Genf",
    "plz": "1201",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎸",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Inkl. Tasche, Stimmgerät und Ersatzsaiten.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-22": {
    "kat": "Bücher & Medien",
    "titel": "Krimi-Sammlung (20 Bücher)",
    "preis": "CHF 30.–",
    "ort": "St. Gallen",
    "plz": "9000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "📚",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Diverse Autoren, guter Zustand. Nur als Paket.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-23": {
    "kat": "Schmuck & Uhren",
    "titel": "Automatikuhr Edelstahl",
    "preis": "CHF 240.–",
    "ort": "Lugano",
    "plz": "6900",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "⌚",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "42 mm, Saphirglas, frisch revidiert.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-24": {
    "kat": "Tickets & Gutscheine",
    "titel": "2 Konzerttickets",
    "preis": "CHF 120.–",
    "ort": "Zürich",
    "plz": "8005",
    "typ": "Angebot",
    "emoji": "🎫",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Stehplatz, Termin im Herbst. Übertragbar.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-25": {
    "kat": "Sammeln & Antik",
    "titel": "Vintage-Plattenspieler",
    "preis": "CHF 160.–",
    "ort": "Neuchâtel",
    "plz": "2000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎶",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Funktioniert einwandfrei, neuer Tonabnehmer.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-26": {
    "kat": "Elektronik",
    "titel": "Tablet 10 Zoll 64 GB",
    "preis": "CHF 130.–",
    "ort": "Biel",
    "plz": "2502",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "📲",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Mit Hülle und Ladegerät, guter Akku.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-27": {
    "kat": "Spielzeug",
    "titel": "Lego-Konvolut 5 kg",
    "preis": "CHF 70.–",
    "ort": "Zug",
    "plz": "6300",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🧱",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Gemischt, gereinigt. Ideal zum Bauen.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-28": {
    "kat": "Haushalt",
    "titel": "Staubsauger-Roboter",
    "preis": "CHF 110.–",
    "ort": "Aarau",
    "plz": "5000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🤖",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "App-Steuerung, frische Bürsten, leise.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-29": {
    "kat": "Dienstleistungen",
    "titel": "Nachhilfe Mathematik",
    "preis": "CHF 40.–/h",
    "ort": "Bern",
    "plz": "3012",
    "typ": "Angebot",
    "emoji": "📐",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Sek- und Gymi-Stufe, auch online möglich.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-30": {
    "kat": "Baumaterial",
    "titel": "Restposten Parkettboden",
    "preis": "CHF 200.–",
    "ort": "Luzern",
    "plz": "6014",
    "zustand": "Neu",
    "typ": "Angebot",
    "emoji": "🪵",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Eiche, ca. 18 m², originalverpackt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-31": {
    "kat": "Mode",
    "titel": "Wanderschuhe Gr. 43",
    "preis": "CHF 75.–",
    "ort": "Chur",
    "plz": "7000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🥾",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Gore-Tex, einmal getragen, wie neu.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-32": {
    "kat": "Auto & Teile",
    "titel": "4 Winterreifen 205/55 R16",
    "preis": "CHF 220.–",
    "ort": "Fribourg",
    "plz": "1700",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🛞",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Profil 6 mm, eine Saison gefahren.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-33": {
    "kat": "Haustier",
    "titel": "Hundebox für Auto Gr. L",
    "preis": "CHF 60.–",
    "ort": "Winterthur",
    "plz": "8400",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🐕",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Stabil, faltbar, gut gereinigt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-34": {
    "kat": "Computer",
    "titel": "Suche defekte Laptops",
    "preis": "",
    "ort": "Zürich",
    "plz": "8048",
    "typ": "Gesuch",
    "emoji": "💻",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Für Bastelprojekt, zahle fair je nach Modell.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-35": {
    "kat": "Sport",
    "titel": "Hometrainer / Ergometer",
    "preis": "CHF 130.–",
    "ort": "Basel",
    "plz": "4057",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🚴",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Magnetbremse, faltbar, App-kompatibel.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-36": {
    "kat": "Möbel",
    "titel": "Sofa 3-Sitzer Stoff grau",
    "preis": "CHF 250.–",
    "ort": "Lausanne",
    "plz": "1004",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🛋️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Bequem, gepflegt, Lieferung gegen Aufpreis.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-37": {
    "kat": "Garten",
    "titel": "Rasenmäher Benzin",
    "preis": "CHF 140.–",
    "ort": "Olten",
    "plz": "4600",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🌿",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Läuft einwandfrei, Fangkorb dabei.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-38": {
    "kat": "Handy",
    "titel": "Samsung Galaxy S22",
    "preis": "CHF 360.–",
    "ort": "Zürich",
    "plz": "8003",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "📱",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "128 GB, makellos, mit Hülle und Folie.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-39": {
    "kat": "Mode",
    "titel": "Hochzeitskleid Gr. 38",
    "preis": "CHF 350.–",
    "ort": "Bern",
    "plz": "3007",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "👰",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Einmal getragen, gereinigt, A-Linie.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-40": {
    "kat": "Elektronik",
    "titel": "Drohne mit 4K-Kamera",
    "preis": "CHF 290.–",
    "ort": "Basel",
    "plz": "4052",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🛩️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "3 Akkus, Tasche, ca. 2 h Flugzeit gesamt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-41": {
    "kat": "Computer",
    "titel": "Gaming-PC RTX-Grafik",
    "preis": "CHF 950.–",
    "ort": "Luzern",
    "plz": "6004",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🖥️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "16 GB RAM, SSD 1 TB, läuft flüssig.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-42": {
    "kat": "Dienstleistungen",
    "titel": "Maler-Arbeiten Wohnung",
    "preis": "",
    "ort": "Winterthur",
    "plz": "8400",
    "typ": "Angebot",
    "emoji": "🎨",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Sauber und termingerecht, Offerte gratis.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-43": {
    "kat": "Immobilien",
    "titel": "Parkplatz in Tiefgarage",
    "preis": "CHF 140.–/Mt",
    "ort": "Zürich",
    "plz": "8006",
    "typ": "Angebot",
    "emoji": "🅿️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Trocken, gut erreichbar, ab sofort.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-44": {
    "kat": "Sport",
    "titel": "Stand-Up-Paddle aufblasbar",
    "preis": "CHF 190.–",
    "ort": "Luzern",
    "plz": "6005",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🏄",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Inkl. Pumpe, Paddel und Rucksack.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-45": {
    "kat": "Baby & Kind",
    "titel": "Hochstuhl klappbar",
    "preis": "CHF 50.–",
    "ort": "Aarau",
    "plz": "5000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🍼",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Höhenverstellbar, leicht zu reinigen.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-46": {
    "kat": "Haushalt",
    "titel": "Kaffeevollautomat",
    "preis": "CHF 220.–",
    "ort": "St. Gallen",
    "plz": "9000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "☕",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Frisch entkalkt, super Crema. Mit Garantie-Rest.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-47": {
    "kat": "Foto & Video",
    "titel": "Gimbal-Stabilisator",
    "preis": "CHF 95.–",
    "ort": "Zug",
    "plz": "6300",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎥",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Für Smartphones, mit Stativ und App.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-48": {
    "kat": "Musik & Instrumente",
    "titel": "E-Piano 88 Tasten",
    "preis": "CHF 420.–",
    "ort": "Genf",
    "plz": "1206",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🎹",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Hammermechanik, inkl. Ständer und Pedal.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-49": {
    "kat": "Wohnen & Deko",
    "titel": "Teppich 200×300 cm",
    "preis": "CHF 80.–",
    "ort": "Thun",
    "plz": "3600",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🧶",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Kurzflor, gereinigt, neutrale Farbe.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-50": {
    "kat": "Auto & Teile",
    "titel": "Dachträger universal",
    "preis": "CHF 90.–",
    "ort": "Chur",
    "plz": "7000",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🚙",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Abschliessbar, mit Montageanleitung.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-51": {
    "kat": "Tickets & Gutscheine",
    "titel": "Gutschein Wellness 200.–",
    "preis": "CHF 150.–",
    "ort": "Interlaken",
    "plz": "3800",
    "typ": "Angebot",
    "emoji": "🎟️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Lange gültig, übertragbar, ungenutzt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-52": {
    "kat": "Gaming",
    "titel": "Nintendo Switch OLED",
    "preis": "CHF 240.–",
    "ort": "Biel",
    "plz": "2502",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🕹️",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Mit Dock, 2 Spiele, Top-Zustand.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-53": {
    "kat": "Bücher & Medien",
    "titel": "Vinyl-Schallplatten Konvolut",
    "preis": "CHF 90.–",
    "ort": "Lausanne",
    "plz": "1005",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "💿",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Rock & Pop, ca. 40 Platten, gepflegt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-54": {
    "kat": "Werkzeug",
    "titel": "Tischkreissäge",
    "preis": "CHF 180.–",
    "ort": "Sitten",
    "plz": "1950",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🪚",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Mit Anschlag, funktioniert tadellos.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-55": {
    "kat": "Schmuck & Uhren",
    "titel": "Damenring Silber 925",
    "preis": "CHF 70.–",
    "ort": "Neuchâtel",
    "plz": "2000",
    "zustand": "Neu",
    "typ": "Angebot",
    "emoji": "💍",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Grösse 54, mit Zertifikat, ungetragen.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-56": {
    "kat": "Haustier",
    "titel": "Aquarium 100 l komplett",
    "preis": "CHF 120.–",
    "ort": "Fribourg",
    "plz": "1700",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🐠",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Mit Filter, Beleuchtung und Deko.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-57": {
    "kat": "Mode",
    "titel": "Suche Markenjeans Gr. 32",
    "preis": "",
    "ort": "Zürich",
    "plz": "8002",
    "typ": "Gesuch",
    "emoji": "👖",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Gut erhalten, zahle fair. Raum Zürich.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-58": {
    "kat": "Spielzeug",
    "titel": "Holzeisenbahn-Set gross",
    "preis": "CHF 55.–",
    "ort": "Zug",
    "plz": "6300",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🚂",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Viele Schienen und Wagen, gereinigt.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-59": {
    "kat": "Dienstleistungen",
    "titel": "Webdesign für KMU",
    "preis": "",
    "ort": "Bern",
    "plz": "3011",
    "typ": "Angebot",
    "emoji": "💻",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Moderne Website, faire Pauschale, Referenzen da.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  },
  "demo-60": {
    "kat": "Sammeln & Antik",
    "titel": "Alte Schweizer Münzen",
    "preis": "CHF 140.–",
    "ort": "Luzern",
    "plz": "6003",
    "zustand": "Gebraucht",
    "typ": "Angebot",
    "emoji": "🪙",
    "kontakt": "beispiel@aban.ch",
    "beschreibung": "Konvolut, teils Silber. Für Sammler.\n\n(Beispiel-Inserat — erscheint, solange noch keine echten Inserate da sind.)"
  }
};

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function attr(s) { return esc(s).replace(/'/g, "&#39;"); }
function b64(s) { try { return btoa(unescape(encodeURIComponent(String(s || "")))); } catch (e) { return ""; } }

function relatedBlock(it, id) {
  const others = Object.entries(DEMO).filter(([k, v]) => k !== id && v.kat === it.kat).slice(0, 4);
  if (!others.length) return "";
  const card = ([k, v]) => {
    const im = (v.bild && /^https:\/\//i.test(v.bild))
      ? `<div style="aspect-ratio:4/3;background:#f3eee4 center/cover no-repeat;background-image:url('${attr(v.bild)}')"></div>`
      : `<div style="aspect-ratio:4/3;background:#f3eee4;display:flex;align-items:center;justify-content:center;font-size:2rem">${esc(v.emoji || "🏷️")}</div>`;
    return `<a href="/inserat/${encodeURIComponent(k)}" style="background:#fff;border:1px solid var(--line);border-radius:11px;overflow:hidden;text-decoration:none;color:var(--ink);display:flex;flex-direction:column">${im}<div style="padding:8px 10px"><div style="font-size:.82rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:3px">${esc(v.titel || "")}</div><div style="color:var(--amber-dk);font-weight:800;font-size:.84rem">${esc(v.preis || "")}</div></div></a>`;
  };
  return `<section style="margin-top:18px"><h3 style="font-size:1.05rem;margin:0 0 10px">↪ Ähnliche Inserate <span style="font-weight:500;color:var(--muted);font-size:.85rem">· ${esc(it.kat || "")}</span></h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px">${others.map(card).join("")}</div></section>`;
}

function page(it, demo, id) {
  const canonical = "https://abannews.com/inserat/" + encodeURIComponent(id || "");
  const title = (it.titel || "Inserat") + " — aban";
  const plain = String(it.beschreibung || "").replace(/\s+/g, " ").trim();
  const ogDesc = (it.preis ? it.preis + " · " : "") + [it.plz, it.ort].filter(Boolean).join(" ") + (plain ? " — " + plain : "");
  const desc = esc(ogDesc.slice(0, 180));
  const ogImg = (it.bild && /^https:\/\//i.test(it.bild)) ? it.bild : "https://abannews.com/og-image.png";
  // JSON-LD (Product/Offer) für Rich Results — XSS-fest über JSON.stringify + <-Escape.
  const priceNum = parseFloat(String(it.preis || "").replace(/[^\d.]/g, ""));
  const ld = { "@context": "https://schema.org", "@type": "Product", name: String(it.titel || "Inserat"), description: plain.slice(0, 400) };
  if (it.bild && /^https:\/\//i.test(it.bild)) ld.image = it.bild;
  if (!isNaN(priceNum) && priceNum > 0 && String(it.typ || "") !== "Gesuch") {
    ld.offers = { "@type": "Offer", price: priceNum, priceCurrency: "CHF", availability: "https://schema.org/InStock", areaServed: "CH" };
  }
  const ldScript = '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</" + "script>";
  const img = (it.bild && /^https:\/\//i.test(it.bild))
    ? `<div class="hero-img" style="background-image:url('${attr(it.bild)}')"></div>`
    : `<div class="hero-img">${esc(it.emoji || "🏷️")}</div>`;
  const tags = `<div class="tags">${it.kat ? `<span class="tag tag-kat">${esc(it.kat)}</span>` : ""}${String(it.typ || "") === "Gesuch" ? `<span class="tag tag-typ">🔎 Gesuch</span>` : `<span class="tag tag-typ">📦 Angebot</span>`}${it.zustand ? `<span class="tag tag-cond">${esc(it.zustand)}</span>` : ""}${demo ? `<span class="tag tag-demo">Beispiel</span>` : ""}</div>`;
  const loc = esc([it.plz, it.ort].filter(Boolean).join(" "));
  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="${demo ? "noindex,follow" : "index,follow"}">
<link rel="canonical" href="${attr(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="product"><meta property="og:url" content="${attr(canonical)}"><meta property="og:title" content="${esc(it.titel || "Inserat")}">
<meta property="og:description" content="${desc}"><meta property="og:image" content="${attr(ogImg)}">
<meta name="twitter:card" content="summary_large_image">
${demo ? "" : ldScript}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#e6e1d6;--bg:#f3f0ea;--card:#fff;--shadow:0 8px 24px rgba(31,41,55,.09)}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:var(--ink);background:var(--bg)}
a{color:var(--amber-dk);text-decoration:none}button{font-family:inherit}
.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:60}
.top .in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:10px 16px}
.brand{font-weight:900;color:var(--amber-dk);font-size:19px}
.top .links{margin-left:auto;display:flex;gap:8px}
.top .links a{font-size:.82rem;font-weight:700;color:var(--ink2);padding:7px 12px;border:1px solid var(--line);border-radius:20px}
.top .links a.cta{background:var(--amber-dk);color:#fff;border-color:var(--amber-dk)}
.wrap{max-width:760px;margin:16px auto;padding:0 16px}
.back{display:inline-block;font-size:.86rem;font-weight:700;margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.hero-img{width:100%;aspect-ratio:16/10;background:#f3eee4 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:4rem}
.body{padding:18px 18px 22px}
.tags{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}
.tag{font-size:.72rem;font-weight:800;border-radius:7px;padding:3px 9px}
.tag-kat{background:#fef3c7;color:#92660a}.tag-typ{background:#e0f2fe;color:#075985}.tag-cond{background:#ede9fe;color:#5b21b6}.tag-demo{background:#6b7280;color:#fff}
h1{font-size:1.5rem;line-height:1.25;margin-bottom:6px}
.price{font-size:1.5rem;font-weight:800;color:var(--amber-dk);margin:4px 0}
.loc{color:var(--muted);font-size:.95rem;margin-bottom:14px}
.desc{font-size:1rem;color:var(--ink2);white-space:pre-wrap;margin-bottom:18px}
.actions{display:flex;flex-wrap:wrap;gap:10px}
.btn{border:0;border-radius:11px;padding:13px 22px;font-weight:800;font-size:15px;cursor:pointer}
.btn-primary{background:var(--amber-dk);color:#fff}.btn-primary:hover{background:#a04708}
.btn-ghost{background:#fff;border:1.5px solid var(--amber-dk);color:var(--amber-dk)}.btn-ghost:hover{background:var(--cream)}
.contactbox{margin-top:14px;padding:13px 15px;background:var(--cream);border:1px solid #f3dca0;border-radius:12px;font-size:.95rem;font-weight:600}
.contactbox a{font-weight:800}
.note{font-size:.78rem;color:var(--muted);margin-top:16px;border-top:1px solid var(--line);padding-top:12px}
.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1f2937;color:#fff;border-radius:22px;padding:10px 18px;font-weight:700;font-size:.9rem;box-shadow:var(--shadow);opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
footer{max-width:760px;margin:10px auto;padding:20px 16px;font-size:.8rem;color:var(--muted);text-align:center}
:focus-visible{outline:3px solid #b45309;outline-offset:2px;border-radius:4px}
</style></head><body>
<div class="top"><div class="in"><a class="brand" href="/">aban</a>
<span class="links"><a href="/suche.html">🔎 Suche</a><a href="/inserate.html">Inserate</a><a class="cta" href="/inserat-aufgeben.html">+ Inserieren</a></span></div></div>
<div class="wrap">
<a class="back" href="/inserate.html">← Alle Inserate</a>
<div class="card">${img}<div class="body">${tags}
<h1>${esc(it.titel || "")}</h1>
${it.preis ? `<div class="price">${esc(it.preis)}</div>` : ""}
${loc ? `<div class="loc">📍 ${loc}</div>` : ""}
<div class="desc">${esc(it.beschreibung || "")}</div>
<div class="actions"><button class="btn btn-primary" id="cBtn" type="button" data-k="${attr(b64(it.kontakt))}">Kontakt anzeigen</button>
<button class="btn btn-ghost" id="sBtn" type="button">🔗 Teilen</button></div>
<div id="cOut"></div>
<p class="note">Angaben stammen von der inserierenden Person; aban übernimmt keine Gewähr. Vorsicht bei Vorkasse — am besten persönlich übergeben.<br><a href="mailto:hallo@abannews.com?subject=${encodeURIComponent("Inserat melden: " + (it.titel || ""))}&body=${encodeURIComponent("Ich möchte dieses Inserat melden:\n" + canonical + "\n\nGrund:\n")}" style="color:var(--muted);text-decoration:underline">⚠️ Inserat melden</a></p>
</div></div>
${demo ? relatedBlock(it, id) : ""}
<div id="reco" style="margin-top:18px"></div>
</div>
<div class="toast" id="toast"></div>
<footer>aban news · Inserat-Details · Angaben ohne Gewähr · © 2026 · <a href="/inserate.html">Alle Inserate</a> · <a href="/impressum.html">Impressum</a></footer>
<script>
(function(){var $=function(s){return document.querySelector(s)};
function toast(t){var e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(function(){e.classList.remove("show")},1800)}
function dec(b){try{return decodeURIComponent(escape(atob(b)))}catch(e){return""}}
function cHtml(k){var v=k.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});
if(/^[^@\\s]+@[^@\\s]+$/.test(k))return '✉️ <a href="mailto:'+v+'">'+v+'</a>';
if(/^[+0-9][0-9\\s/().-]{5,}$/.test(k))return '📞 <a href="tel:'+v.replace(/\\s/g,"")+'">'+v+'</a>';return '<span>'+v+'</span>'}
$("#cBtn").addEventListener("click",function(){var k=dec(this.dataset.k);if(!k){toast("Kein Kontakt hinterlegt");return}
$("#cOut").innerHTML='<div class="contactbox">'+cHtml(k)+'</div>';this.style.display="none"});
$("#sBtn").addEventListener("click",function(){var u=location.href;
if(navigator.share){navigator.share({title:document.title,url:u}).catch(function(){})}
else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){toast("🔗 Link kopiert")})}else{toast(u)}});
function esc2(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
fetch("/api/luxestyle?limit=6").then(function(r){return r.json()}).then(function(d){var it=(d.items||[]).slice(0,6);var box=$("#reco");if(!box||!it.length)return;
box.innerHTML='<h3 style="font-size:1.05rem;margin:0 0 10px">🛍️ Das könnte dir auch gefallen <span style="font-weight:500;color:var(--muted);font-size:.85rem">· LuxeStyle 🇨🇭</span></h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:11px">'+it.map(function(p){var img=p.img?('<div style="aspect-ratio:1/1;background:#f3eee4 center/cover no-repeat;background-image:url(\''+esc2(p.img)+'\')"></div>'):'<div style="aspect-ratio:1/1;background:#f3eee4;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🛍️</div>';return '<a href="'+esc2(p.url)+'" target="_blank" rel="noopener" style="background:#fff;border:1px solid var(--line);border-radius:11px;overflow:hidden;text-decoration:none;color:var(--ink);display:flex;flex-direction:column">'+img+'<div style="padding:8px 9px"><div style="font-size:.76rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:4px">'+esc2(p.title)+'</div><div style="color:var(--amber-dk);font-weight:800;font-size:.84rem">'+esc2(p.price)+'</div></div></a>'}).join("")+'</div>';}).catch(function(){});
})();
</script></body></html>`;
}

function notFound() {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inserat nicht gefunden — aban</title><meta name="robots" content="noindex,follow"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f3f0ea;color:#1f2937;text-align:center;padding:60px 20px}a{display:inline-block;margin-top:18px;background:#b45309;color:#fff;border-radius:22px;padding:12px 24px;font-weight:800;text-decoration:none}</style>
</head><body><h1>Dieses Inserat ist nicht (mehr) verfügbar.</h1><a href="/inserate.html">Alle Inserate ansehen</a></body></html>`;
}

const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" };

export async function onRequestGet({ params, env }) {
  const id = String(params.id || "");
  if (/^demo-/.test(id) && DEMO[id]) {
    return new Response(page(DEMO[id], true, id), { headers: HTML });
  }
  const num = parseInt(id, 10);
  if (num && env.DB) {
    try {
      const row = await env.DB.prepare("SELECT kat,ort,plz,titel,beschreibung,preis,kontakt,typ,zustand,bild,created,status FROM inserate WHERE id=? AND status='approved' AND (expires=0 OR expires>?)").bind(num, Date.now()).first();
      if (row) return new Response(page(row, false, id), { headers: HTML });
    } catch (e) { /* fällt unten auf notFound */ }
  }
  return new Response(notFound(), { status: 404, headers: { ...HTML, "Cache-Control": "no-store" } });
}
