/* gadget_desc.mjs — Galaxus-Stil-Beschreibung für CJ-Gadgets (Typ-basiert).
 * Erkennt den Produkttyp am DE-Titel-Präfix und baut: Intro + strukturierte „Eigenschaften"-Liste
 * (typtypische, korrekte Specs) + Trust-Block.  export buildGadgetDesc(title) -> descriptionHtml
 */
const HOOK={
 'Mini-Beamer':'Kino-Feeling für Zuhause – Filme & Serien gross an die Wand.',
 'LED-Projektor':'Stimmungslicht, das jeden Raum verwandelt.',
 'Sternenhimmel-Projektor':'Dein eigener Sternenhimmel im Schlafzimmer.',
 'Sonnenuntergang-Projektor':'Der virale Sonnenuntergang-Effekt für Fotos & Deko.',
 'Bluetooth-Lautsprecher':'Kraftvoller Sound – kabellos, überallhin.',
 'Mini-Bluetooth-Lautsprecher':'Grosser Klang im Taschenformat.',
 'Kabellose Kopfhörer':'Freiheit ohne Kabel – klarer Sound, sichere Passform.',
 'Gaming-Kopfhörer':'Immersiver Sound mit RGB-Style.',
 'Mini-Drohne':'Luftaufnahmen leicht gemacht – faltbar & startklar.',
 'Smartwatch':'Fitness, Nachrichten & Style am Handgelenk.',
 'Fitness-Tracker':'Behalte Gesundheit & Aktivität im Blick.',
 'Powerbank':'Nie wieder leerer Akku – Power für unterwegs.',
 'Wireless-Charger':'Einfach ablegen und kabellos laden.',
 'Aroma-Diffuser':'Wohlfühl-Duft & sanftes Farblicht für dein Zuhause.',
 'LED-Streifen':'Farbige Beleuchtung für Gaming-Setup, Zimmer & Deko.',
 'Selfie-Ringlicht':'Perfektes Licht für Selfies, Reels & Video-Calls.',
 'LED-Nachtlicht':'Sanftes Licht für erholsame Nächte.',
 'Saugroboter':'Putzt von selbst – mehr Zeit für dich.',
};
const SPECS={
 'Mini-Beamer':['Wiedergabe: Filme, Serien & Präsentationen','Anschlüsse: HDMI, USB & AV','Bild: bis Full-HD unterstützt','Verbindung: WLAN / Screen-Mirroring','Lieferumfang: inkl. Netzteil & Fernbedienung'],
 'LED-Projektor':['Effekt: Stimmungs- & Ambientelicht','Farben: mehrfarbig (RGB)','Betrieb: USB','Ideal für: Schlafzimmer, Party & Deko'],
 'Sternenhimmel-Projektor':['Effekt: Sternenhimmel- & Galaxie-Projektion','Farben: mehrfarbig, dimmbar','Extras: Fernbedienung, Timer','Betrieb: USB','Ideal für: Schlaf- & Kinderzimmer'],
 'Sonnenuntergang-Projektor':['Effekt: Sonnenuntergang-Lichtkreis','Winkel: 180° drehbar','Betrieb: USB','Ideal für: Fotos, Reels & Deko'],
 'Bluetooth-Lautsprecher':['Verbindung: Bluetooth 5.x','Betrieb: integrierter Akku (wiederaufladbar)','Nutzung: kabellos & tragbar','Extras: Freisprech-Funktion'],
 'Mini-Bluetooth-Lautsprecher':['Verbindung: Bluetooth','Format: ultrakompakt & tragbar','Betrieb: Akku (USB-Laden)','Ideal für: unterwegs & Reisen'],
 'Kabellose Kopfhörer':['Typ: True Wireless (TWS)','Verbindung: Bluetooth 5.x','Lieferumfang: Ladecase','Steuerung: Touch, mit Mikrofon'],
 'Gaming-Kopfhörer':['Sound: immersiver Gaming-Sound','Beleuchtung: RGB-LED','Verbindung: kabellos','Extras: Mikrofon'],
 'Mini-Drohne':['Kamera: HD-Luftaufnahmen','Steuerung: App & Fernbedienung','Design: faltbar & kompakt','Betrieb: Akku (USB-Laden)'],
 'Smartwatch':['Funktionen: Herzfrequenz, Schritte, Schlaf','Smart: Anruf- & Nachrichten-Benachrichtigung','Schutz: spritzwassergeschützt','Betrieb: Akku (magnetisches USB-Laden)'],
 'Fitness-Tracker':['Tracking: Herzfrequenz, Schritte, Kalorien','Anzeige: Touch-Display','Smart: Benachrichtigungen','Betrieb: Akku mit langer Laufzeit'],
 'Powerbank':['Kapazität: für mehrere volle Ladungen','Anschlüsse: USB & USB-C','Extras: Schnellladen','Format: kompakt für unterwegs'],
 'Wireless-Charger':['Laden: kabellos (Qi-Standard)','Kompatibel: iPhone & Android','Extras: Schnellladen','Design: rutschfest'],
 'Aroma-Diffuser':['Technik: Ultraschall-Vernebelung','Licht: LED-Farbwechsel','Sicherheit: Auto-Abschaltung bei leerem Tank','Nutzung: mit ätherischen Ölen'],
 'LED-Streifen':['Farben: RGB, mehrfarbig','Steuerung: Fernbedienung / App','Montage: selbstklebend','Länge: kürzbar & erweiterbar'],
 'Selfie-Ringlicht':['Licht: dimmbar, mehrere Helligkeitsstufen','Halterung: Handy-Clip / Stativ','Betrieb: USB','Ideal für: Selfies, Reels & Video-Calls'],
 'LED-Nachtlicht':['Effekt: sanftes Stimmungslicht','Farben: mehrfarbig','Betrieb: USB / Akku','Ideal für: Schlaf- & Kinderzimmer'],
 'Saugroboter':['Reinigung: automatisch','Steuerung: App / Fernbedienung','Betrieb: Akku, Auto-Laden','Ideal für: Hartboden & Teppich'],
};
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

export function buildGadgetDesc(title){
 const type=Object.keys(SPECS).find(t=>title.startsWith(t)) || Object.keys(SPECS).find(t=>title.includes(t));
 const hook=(type&&HOOK[type])||'Cooles Tech-Gadget für Zuhause & unterwegs.';
 const specs=(type&&SPECS[type])||['Design: trendig & handlich','Bedienung: einfach','Betrieb: wiederaufladbar / stromsparend'];
 const specHtml='<h3>Eigenschaften</h3>\n<ul>\n'+specs.map(s=>{const [l,...v]=s.split(':');return `<li><strong>${esc(l.trim())}:</strong> ${esc(v.join(':').trim())}</li>`;}).join('\n')+'\n</ul>\n';
 return `<p><strong>${esc(title)}</strong> — ${esc(hook)}</p>\n${specHtml}`
  +`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;">`
  +`<strong>🛡️ Sorglos shoppen:</strong> 🇨🇭 Schweizer Shop · 📦 Lieferung ca. 8–16 Tage · 🔄 30 Tage Rückgabe · 💳 TWINT, Karte &amp; Klarna.</div>`
  +`<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;
}
