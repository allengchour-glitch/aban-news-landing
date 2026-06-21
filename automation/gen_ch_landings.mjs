// Generiert Schweizer SEO-Kategorie-Landingpages für den aban-Marktplatz.
// Jede Seite: Hero + hilfreicher Inhalt + FAQ (FAQPage-JSON-LD) + CTA in die gefilterte Suche.
// Aufruf: /opt/node22/bin/node automation/gen_ch_landings.mjs   (oder: node automation/gen_ch_landings.mjs)
import { writeFileSync } from "node:fs";

const SITE = "https://abannews.com";
const PAGES = [
  {
    slug: "auto-kaufen-schweiz", icon: "🚗", h1: "Auto kaufen in der Schweiz",
    title: "Auto kaufen Schweiz — Occasionen & Neuwagen finden | aban",
    desc: "Auto kaufen in der Schweiz: Occasionen, Neuwagen, Teile & Zubehör an einem Ort suchen und vergleichen — nach Marke, Zustand und Preis filtern.",
    cta: "/auto-suche.html", ctaLabel: "Fahrzeuge jetzt durchsuchen",
    intro: "Vom günstigen Occasionswagen bis zum Töff: Hier durchsuchst du Fahrzeuge, Teile und Zubehör an einem Ort — und vergleichst Zustand und Preis, bevor du beim Anbieter zuschlägst.",
    tips: [
      ["Budget realistisch setzen", "Rechne Versicherung, Steuern, Service und Reifen ein — nicht nur den Kaufpreis. Filtere die Suche nach deinem Preisrahmen."],
      ["Occasion prüfen", "Achte auf Kilometerstand, Serviceheft, MFK/letzte Prüfung und Unfallfreiheit. Bei Privatkauf eine Probefahrt machen."],
      ["Vergleichen lohnt sich", "Dasselbe Modell schwankt stark im Preis. Sortiere nach Preis und schau dir mehrere Angebote an, bevor du dich entscheidest."],
    ],
    faq: [
      ["Wo finde ich günstige Occasionen in der Schweiz?", "In der Auto-Suche kombinierst du Marke/Modell mit Preis- und Zustandsfilter. Für private CH-Inserate kannst du zusätzlich kostenlos selbst inserieren oder im Inserate-Bereich stöbern."],
      ["Worauf beim Autokauf achten?", "Zustand, Kilometer, Serviceheft, MFK und ein fairer Marktpreis. Lass dir bei Unsicherheit das Fahrzeug von einer Fachperson prüfen."],
      ["Kann ich auch Teile und Zubehör suchen?", "Ja — Reifen, Felgen, Dachboxen, Kindersitze und mehr findest du über die Kategorie-Filter der Auto-Suche."],
    ],
  },
  {
    slug: "wohnung-mieten-schweiz", icon: "🏠", h1: "Wohnung mieten in der Schweiz",
    title: "Wohnung mieten Schweiz — Mietwohnungen & WG finden | aban",
    desc: "Wohnung mieten in der Schweiz: Mietwohnungen, Häuser und WG-Zimmer nach Ort und Kanton suchen — oder kostenlos selbst inserieren.",
    cta: "/immobilien.html?q=wohnung+miete", ctaLabel: "Mietwohnungen durchsuchen",
    intro: "Ob 2,5-Zimmer in der Stadt oder WG-Zimmer zum Studienstart: Such nach Ort oder Kanton und finde passende Mietobjekte — oder stell dein eigenes Inserat kostenlos ein.",
    tips: [
      ["Nach Region filtern", "Gib Stadt, Kanton oder PLZ ein (z. B. Zürich, Bern, Basel). So siehst du nur, was in deiner Region verfügbar ist."],
      ["Unterlagen bereithalten", "Betreibungsauszug, Lohnausweis und eine kurze Vorstellung beschleunigen die Bewerbung — gerade in gefragten Städten."],
      ["Schnell sein", "Beliebte Wohnungen sind rasch weg. Speichere die Suche und melde dich zeitnah beim Inserenten."],
    ],
    faq: [
      ["Wie finde ich eine Mietwohnung in meiner Region?", "Gib in der Immobilien-Suche deinen Ort oder Kanton ein und wähle die Art (Mietwohnung, Haus, WG-Zimmer, Gewerbe). Die Liste filtert sich entsprechend."],
      ["Was kostet das Inserieren?", "Das Aufgeben eines Immobilien-Inserats ist bei aban kostenlos. Es wird vor der Veröffentlichung kurz geprüft."],
      ["Gibt es auch WG-Zimmer und Gewerbe?", "Ja — über die Art-Filter findest du Mietwohnungen, Häuser, WG-Zimmer, Gewerbe/Büro und Grundstücke."],
    ],
  },
  {
    slug: "moebel-kaufen-schweiz", icon: "🛋️", h1: "Möbel kaufen in der Schweiz",
    title: "Möbel kaufen Schweiz — neu & gebraucht finden | aban",
    desc: "Möbel kaufen in der Schweiz: Sofas, Tische, Schränke und Wohnaccessoires neu oder gebraucht an einem Ort suchen und vergleichen.",
    cta: "/angebote-suche.html?cat=M%C3%B6bel", ctaLabel: "Möbel-Angebote ansehen",
    intro: "Vom Sofa über den Esstisch bis zum Schrank: Durchsuche Möbel-Angebote, vergleiche Preise und filtere nach Zustand — neu oder gebraucht.",
    tips: [
      ["Neu vs. gebraucht", "Gebrauchte Markenmöbel sind oft top in Schuss und deutlich günstiger. Mit dem Zustands-Filter entscheidest du selbst."],
      ["Masse checken", "Miss vorher Türen, Lift und Stellplatz aus — gerade bei Sofas und Schränken zählt jeder Zentimeter."],
      ["Preise vergleichen", "Sortiere nach Preis und schau mehrere Angebote an. Bei lokalen Inseraten sparst du den Versand."],
    ],
    faq: [
      ["Wo finde ich günstige Möbel in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Möbel nach Zustand und Preis. Für lokale Schnäppchen lohnt sich zusätzlich der Inserate-Bereich."],
      ["Kann ich gebrauchte Möbel verkaufen?", "Ja — gib dein Möbelstück kostenlos als Inserat auf. Es wird vor der Veröffentlichung kurz geprüft."],
      ["Lohnt sich gebraucht?", "Häufig ja: Qualitätsmöbel verlieren schnell an Kaufpreis, sind aber lange haltbar — gebraucht spart oft die Hälfte."],
    ],
  },
  {
    slug: "handy-kaufen-schweiz", icon: "📱", h1: "Handy kaufen in der Schweiz",
    title: "Handy kaufen Schweiz — Smartphones neu & gebraucht | aban",
    desc: "Handy kaufen in der Schweiz: Smartphones von iPhone bis Android neu oder gebraucht suchen, nach Zustand und Preis filtern und vergleichen.",
    cta: "/angebote-suche.html?cat=Handy", ctaLabel: "Handy-Angebote ansehen",
    intro: "iPhone, Samsung & Co. — neu oder generalüberholt. Vergleiche Smartphone-Angebote, filtere nach Zustand und Preis und finde das passende Gerät.",
    tips: [
      ["Refurbished prüfen", "Generalüberholte Geräte sind günstiger und oft mit Garantie. Achte auf Zustand und Akku-Gesundheit."],
      ["Speicher & Akku", "Wähl genug Speicher (mind. 128 GB) und frag bei Gebrauchtgeräten nach dem Akku-Zustand."],
      ["Preis vergleichen", "Sortiere nach Preis — gleiche Modelle variieren stark, je nach Zustand und Anbieter."],
    ],
    faq: [
      ["Wo finde ich günstige Handys in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Handy nach Zustand (neu/gebraucht) und Preis und vergleichst die Anbieter."],
      ["Sind gebrauchte Handys sicher?", "Bei seriösen Anbietern mit Zustandsangabe ja. Prüfe Akku, Display und ob das Gerät nicht gesperrt (iCloud/Konto) ist."],
      ["Lohnt sich refurbished?", "Oft ja — generalüberholte Smartphones bieten fast neue Qualität zu deutlich tieferem Preis, teils mit Garantie."],
    ],
  },
  {
    slug: "velo-kaufen-schweiz", icon: "🚲", h1: "Velo kaufen in der Schweiz",
    title: "Velo kaufen Schweiz — Fahrräder & E-Bikes finden | aban",
    desc: "Velo kaufen in der Schweiz: Fahrräder, E-Bikes, Mountainbikes und Zubehör neu oder gebraucht suchen, nach Preis und Zustand filtern.",
    cta: "/angebote-suche.html?q=Velo", ctaLabel: "Velo-Angebote ansehen",
    intro: "Stadtvelo, Mountainbike oder E-Bike: Durchsuche Velo-Angebote, vergleiche Preise und finde das passende Rad — neu oder gebraucht.",
    tips: [
      ["Richtige Grösse", "Achte auf Rahmengrösse und Sattelhöhe passend zu deiner Körpergrösse — sonst fährt sich das Velo unbequem."],
      ["E-Bike: Akku prüfen", "Bei gebrauchten E-Bikes Akku-Alter und Reichweite erfragen — der Akku ist das teuerste Teil."],
      ["Zustand checken", "Bremsen, Schaltung und Reifen ansehen. Ein Service vor dem Kauf kann sich lohnen."],
    ],
    faq: [
      ["Wo finde ich günstige Velos in der Schweiz?", "In der Angebote-Suche suchst du nach Velo/E-Bike und filterst nach Preis und Zustand. Für lokale Occasionen lohnt sich auch der Inserate-Bereich."],
      ["Worauf beim E-Bike-Kauf achten?", "Akku-Zustand und Reichweite, Motorhersteller, Kilometerstand und Garantie. Eine Probefahrt zeigt viel."],
      ["Neu oder gebraucht?", "Gebrauchte Velos sind oft ein Schnäppchen — achte auf gepflegten Zustand und einen fairen Preis."],
    ],
  },
  {
    slug: "job-finden-schweiz", icon: "💼", h1: "Job finden in der Schweiz",
    title: "Job finden Schweiz — offene Stellen & Remote suchen | aban",
    desc: "Job finden in der Schweiz: tausende offene Stellen aus mehreren Job-Börsen an einem Ort durchsuchen — nach Beruf, Ort und Remote filtern.",
    cta: "/stellenangebote.html", ctaLabel: "Stellen jetzt durchsuchen",
    intro: "Tausende offene Stellen aus mehreren Job-Börsen an einem Ort: Such nach Beruf, Ort oder Remote und bewirb dich direkt bei der Originalanzeige.",
    tips: [
      ["Mehrere Quellen auf einmal", "Die Job-Suche bündelt Stellen aus mehreren Börsen — so verpasst du weniger und sparst dir das Durchklicken vieler Seiten."],
      ["Mit Kategorie filtern", "Wähl deinen Bereich (IT, Marketing, Pflege, Verwaltung …) oder aktiviere Remote, um nur passende Stellen zu sehen."],
      ["Sauber bewerben", "Ein knappes, auf die Stelle zugeschnittenes Anschreiben und ein klares CV erhöhen die Chance spürbar."],
    ],
    faq: [
      ["Wie finde ich Stellen in der Schweiz?", "Gib in der Job-Suche deinen Beruf und Ort ein. Du kannst nach Kategorie und Remote filtern; der Klick führt zur Original-Stellenanzeige zum Bewerben."],
      ["Sind die Stellen aktuell?", "Die Anzeigen kommen live aus Partner-Jobbörsen. Aktualität und Angaben verantwortet jeweils die Originalquelle."],
      ["Gibt es auch Remote-Jobs?", "Ja — mit dem Remote-Filter zeigst du nur ortsunabhängige Stellen an, die sich auch aus der Schweiz erledigen lassen."],
    ],
  },
  {
    slug: "garten-kaufen-schweiz", icon: "🪴", h1: "Garten & Pflanzen kaufen in der Schweiz",
    title: "Garten kaufen Schweiz — Gartenmöbel, Geräte & Pflanzen | aban",
    desc: "Für Garten & Balkon in der Schweiz: Gartenmöbel, Grill, Geräte und Pflanzen neu oder gebraucht suchen und vergleichen.",
    cta: "/angebote-suche.html?cat=Garten", ctaLabel: "Garten-Angebote ansehen",
    intro: "Gartenmöbel, Grill, Rasenmäher oder Pflanzen — durchsuche Angebote für draussen, vergleiche Preise und filtere nach Zustand.",
    tips: [
      ["Saison nutzen", "Ende Saison sind Gartenmöbel und Grills oft stark reduziert — ein guter Moment fürs nächste Jahr."],
      ["Gebraucht prüfen", "Bei Geräten auf Funktion und Zustand achten; bei Möbeln auf Wetterfestigkeit."],
      ["Lokal abholen", "Sperrige Gartensachen lokal über Inserate abholen spart Versandkosten."],
    ],
    faq: [
      ["Wo finde ich günstige Gartensachen in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Garten nach Zustand und Preis; lokale Occasionen findest du im Inserate-Bereich."],
      ["Kann ich Gartenmöbel verkaufen?", "Ja — gib dein Inserat kostenlos auf. Es wird vor der Veröffentlichung kurz geprüft."],
      ["Neu oder gebraucht?", "Gebrauchte Gartenmöbel und Geräte sind oft günstig und gut erhalten — gerade ausserhalb der Saison."],
    ],
  },
  {
    slug: "werkzeug-kaufen-schweiz", icon: "🔧", h1: "Werkzeug kaufen in der Schweiz",
    title: "Werkzeug kaufen Schweiz — Maschinen & Heimwerker | aban",
    desc: "Werkzeug in der Schweiz kaufen: Akkuschrauber, Maschinen, Heimwerker- und Profi-Werkzeug neu oder gebraucht suchen und vergleichen.",
    cta: "/angebote-suche.html?cat=Werkzeug", ctaLabel: "Werkzeug-Angebote ansehen",
    intro: "Vom Akkuschrauber bis zur Kreissäge: Durchsuche Werkzeug-Angebote, vergleiche Marken und Preise und filtere nach Zustand.",
    tips: [
      ["Marken-Akku-System", "Bleib bei einem Akku-System (gleiche Marke) — dann teilst du Akkus über mehrere Geräte."],
      ["Gebraucht lohnt sich", "Profi-Werkzeug ist robust; gebraucht oft top in Schuss und deutlich günstiger."],
      ["Zustand prüfen", "Bei Maschinen Funktion testen, auf Zubehör und Originalverpackung achten."],
    ],
    faq: [
      ["Wo finde ich günstiges Werkzeug in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Werkzeug nach Zustand und Preis und vergleichst die Anbieter."],
      ["Lohnt sich gebrauchtes Werkzeug?", "Oft ja — gerade Markenmaschinen halten lange und sind gebraucht deutlich günstiger."],
      ["Kann ich Werkzeug verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "mode-kaufen-schweiz", icon: "👗", h1: "Mode & Kleidung kaufen in der Schweiz",
    title: "Mode kaufen Schweiz — Kleidung, Schuhe & Accessoires | aban",
    desc: "Mode in der Schweiz kaufen: Kleidung, Schuhe, Taschen und Accessoires neu oder Secondhand suchen, vergleichen und filtern.",
    cta: "/angebote-suche.html?cat=Mode", ctaLabel: "Mode-Angebote ansehen",
    intro: "Kleidung, Schuhe, Taschen und Accessoires — neu oder Secondhand. Durchsuche Mode-Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Secondhand spart & ist nachhaltig", "Gut erhaltene Markenkleidung gibt's gebraucht oft für einen Bruchteil — besser fürs Budget und die Umwelt."],
      ["Grösse & Mass", "Achte auf Grössenangaben und frag im Zweifel nach Massen — Schnitte fallen unterschiedlich aus."],
      ["Zustand checken", "Bei Secondhand auf Fotos und Zustandsbeschreibung achten (Tragespuren, Flecken)."],
    ],
    faq: [
      ["Wo finde ich günstige Mode in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Mode nach Preis und Zustand; lokale Secondhand-Stücke findest du im Inserate-Bereich."],
      ["Ist Secondhand-Kleidung eine gute Wahl?", "Ja — oft gut erhalten, günstiger und nachhaltiger als Neukauf."],
      ["Kann ich Kleidung verkaufen?", "Ja — gib dein Inserat kostenlos auf, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "gaming-kaufen-schweiz", icon: "🎮", h1: "Gaming kaufen in der Schweiz",
    title: "Gaming kaufen Schweiz — Konsolen, Spiele & PC | aban",
    desc: "Gaming in der Schweiz kaufen: Konsolen (PlayStation, Xbox, Switch), Spiele, Gaming-PCs und Zubehör neu oder gebraucht finden.",
    cta: "/angebote-suche.html?q=Gaming", ctaLabel: "Gaming-Angebote ansehen",
    intro: "Konsolen, Spiele, Controller und Gaming-PCs — neu oder gebraucht. Vergleiche Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Bundles vergleichen", "Konsole mit Spielen/Controller im Bundle ist oft günstiger als alles einzeln."],
      ["Gebraucht prüfen", "Bei gebrauchten Konsolen auf Funktion, Zubehör und Zustand des Laufwerks achten."],
      ["Preise schwanken", "Sortiere nach Preis — gerade bei beliebten Konsolen lohnt der Vergleich."],
    ],
    faq: [
      ["Wo finde ich günstige Konsolen in der Schweiz?", "In der Angebote-Suche suchst du nach Gaming/Konsole und filterst nach Preis und Zustand; lokale Occasionen im Inserate-Bereich."],
      ["Lohnt sich gebrauchtes Gaming?", "Oft ja — gebrauchte Konsolen und Spiele sind deutlich günstiger und meist langlebig."],
      ["Kann ich Spiele verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "haustier-zubehoer-schweiz", icon: "🐾", h1: "Haustier-Zubehör in der Schweiz",
    title: "Haustier-Zubehör Schweiz — für Hund, Katze & Co. | aban",
    desc: "Haustier-Zubehör in der Schweiz: Zubehör, Käfige, Transportboxen und mehr für Hund, Katze & Co. finden — oder kostenlos inserieren.",
    cta: "/inserate.html?kat=Haustier", ctaLabel: "Haustier-Inserate ansehen",
    intro: "Zubehör, Transportboxen, Kratzbäume und mehr für deine Tiere — stöbere in lokalen Inseraten oder gib selbst eines auf.",
    tips: [
      ["Lokal abholen", "Grosse Sachen wie Kratzbäume oder Käfige lokal abholen spart Versand."],
      ["Hygiene beachten", "Gebrauchtes Tierzubehör vor Gebrauch gründlich reinigen."],
      ["Seriös bleiben", "aban vermittelt Zubehör — kein Verkauf lebender Tiere. Achte auf Tierschutz."],
    ],
    faq: [
      ["Wo finde ich Haustier-Zubehör in der Schweiz?", "Im Inserate-Bereich filterst du die Kategorie Haustier und suchst nach Ort. Du kannst auch kostenlos selbst inserieren."],
      ["Kann ich Tiere verkaufen?", "Nein — aban ist für Zubehör gedacht. Für die Vermittlung von Tieren wende dich an seriöse Tierheime/Züchter."],
      ["Was kostet das Inserieren?", "Das Aufgeben eines Inserats ist kostenlos und wird vor der Veröffentlichung kurz geprüft."],
    ],
  },
  {
    slug: "sport-kaufen-schweiz", icon: "⚽", h1: "Sport & Freizeit kaufen in der Schweiz",
    title: "Sportartikel kaufen Schweiz — Fitness, Ski & Outdoor | aban",
    desc: "Sportartikel in der Schweiz kaufen: Fitnessgeräte, Ski, Outdoor- und Freizeitausrüstung neu oder gebraucht suchen und vergleichen.",
    cta: "/angebote-suche.html?cat=Sport", ctaLabel: "Sport-Angebote ansehen",
    intro: "Fitnessgeräte, Ski, Wander- und Outdoor-Ausrüstung — neu oder gebraucht. Vergleiche Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Saison-Schnäppchen", "Ski & Wintersport am Saisonende, Outdoor im Herbst — oft stark reduziert."],
      ["Passform testen", "Bei Schuhen, Ski und Velos auf die richtige Grösse/Länge achten."],
      ["Gebraucht prüfen", "Funktion und Verschleiss checken — gerade bei Fitnessgeräten."],
    ],
    faq: [
      ["Wo finde ich günstige Sportartikel in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Sport nach Preis und Zustand; lokale Occasionen im Inserate-Bereich."],
      ["Lohnt sich gebrauchte Ausrüstung?", "Oft ja — gerade Ski, Fitnessgeräte und Outdoor-Ausrüstung sind gebraucht günstig und langlebig."],
      ["Kann ich Sportsachen verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "kamera-kaufen-schweiz", icon: "📷", h1: "Kamera & Foto kaufen in der Schweiz",
    title: "Kamera kaufen Schweiz — Foto, Objektive & Zubehör | aban",
    desc: "Kamera in der Schweiz kaufen: Spiegelreflex, Systemkameras, Objektive und Foto-Zubehör neu oder gebraucht suchen und vergleichen.",
    cta: "/angebote-suche.html?q=Kamera", ctaLabel: "Kamera-Angebote ansehen",
    intro: "Kameras, Objektive und Zubehör — neu oder gebraucht. Vergleiche Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Objektive halten Wert", "Gute Objektive sind langlebig — gebraucht oft eine clevere Investition."],
      ["Auslösungen prüfen", "Bei gebrauchten Kameras nach der Anzahl Auslösungen (Shutter Count) fragen."],
      ["System bedenken", "Bleib bei einem Bajonett/System, damit Objektive kompatibel bleiben."],
    ],
    faq: [
      ["Wo finde ich günstige Kameras in der Schweiz?", "In der Angebote-Suche suchst du nach Kamera/Objektiv und filterst nach Preis und Zustand; lokale Occasionen im Inserate-Bereich."],
      ["Lohnt sich eine gebrauchte Kamera?", "Oft ja — gerade Objektive und robuste Gehäuse halten lange und sind gebraucht günstiger."],
      ["Kann ich Foto-Equipment verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "computer-kaufen-schweiz", icon: "💻", h1: "Computer & Laptop kaufen in der Schweiz",
    title: "Computer kaufen Schweiz — Laptops, PCs & Zubehör | aban",
    desc: "Computer in der Schweiz kaufen: Laptops, Desktop-PCs, Monitore und Zubehör neu oder gebraucht suchen, nach Preis und Zustand filtern.",
    cta: "/angebote-suche.html?cat=Computer", ctaLabel: "Computer-Angebote ansehen",
    intro: "Laptops, Desktop-PCs, Monitore und Zubehör — neu oder refurbished. Vergleiche Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Refurbished spart viel", "Generalüberholte Business-Laptops sind robust, günstig und oft mit Garantie."],
      ["Auf SSD & RAM achten", "SSD und genug RAM (16 GB) bringen mehr Alltagstempo als ein neuer Prozessor."],
      ["Akku & Zustand", "Bei gebrauchten Laptops Akku-Zustand und Display auf Pixelfehler prüfen."],
    ],
    faq: [
      ["Wo finde ich günstige Computer in der Schweiz?", "In der Angebote-Suche filterst du die Kategorie Computer nach Zustand und Preis; lokale Occasionen im Inserate-Bereich."],
      ["Lohnt sich ein refurbished Laptop?", "Oft ja — gerade Business-Geräte sind langlebig, günstig und teils mit Garantie."],
      ["Kann ich meinen alten PC verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "kueche-kaufen-schweiz", icon: "🍳", h1: "Küche & Haushalt kaufen in der Schweiz",
    title: "Küche & Haushalt kaufen Schweiz — Geräte & Zubehör | aban",
    desc: "Küche und Haushalt in der Schweiz: Küchengeräte, Maschinen und Haushaltsartikel neu oder gebraucht suchen und vergleichen.",
    cta: "/angebote-suche.html?cat=Haushalt", ctaLabel: "Haushalt-Angebote ansehen",
    intro: "Kaffeemaschine, Küchenmaschine, Geschirr oder Kleingeräte — neu oder gebraucht. Vergleiche Angebote und filtere nach Preis.",
    tips: [
      ["Marken-Kleingeräte gebraucht", "Kaffee- und Küchenmaschinen von Marken halten lange — gebraucht oft top in Schuss."],
      ["Mass & Anschluss prüfen", "Bei Einbaugeräten Masse und Anschluss checken, bevor du kaufst."],
      ["Hygiene", "Gebrauchtes Küchenzubehör vor Gebrauch gründlich reinigen."],
    ],
    faq: [
      ["Wo finde ich günstige Küchengeräte in der Schweiz?", "In der Angebote-Suche filterst du Haushalt nach Zustand und Preis; lokale Occasionen im Inserate-Bereich."],
      ["Lohnt sich gebraucht?", "Bei Marken-Kleingeräten oft ja — langlebig und deutlich günstiger."],
      ["Kann ich Küchensachen verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "baby-kind-kaufen-schweiz", icon: "🍼", h1: "Baby & Kind kaufen in der Schweiz",
    title: "Baby & Kind kaufen Schweiz — Kinderwagen, Kleidung & Spielzeug | aban",
    desc: "Für Baby & Kind in der Schweiz: Kinderwagen, Autositze, Kleidung und Spielzeug neu oder gebraucht suchen — oder kostenlos inserieren.",
    cta: "/inserate.html?kat=Baby+%26+Kind", ctaLabel: "Baby & Kind ansehen",
    intro: "Kinderwagen, Autositze, Kleidung und Spielzeug — vieles wird kaum genutzt und gebraucht weitergegeben. Stöbere lokal oder inseriere selbst.",
    tips: [
      ["Sicherheit zuerst", "Bei Autositzen auf Alter, Norm und keine Unfall-Historie achten."],
      ["Gebraucht ist clever", "Kinder wachsen schnell — gebrauchte Kleidung und Wagen sparen viel."],
      ["Lokal abholen", "Kinderwagen & grosse Sachen lokal abholen spart Versand."],
    ],
    faq: [
      ["Wo finde ich günstige Babysachen in der Schweiz?", "Im Inserate-Bereich filterst du die Kategorie Baby & Kind und suchst nach Ort; du kannst auch kostenlos selbst inserieren."],
      ["Sind gebrauchte Autositze ok?", "Nur ohne Unfall-Historie, mit aktueller Norm und nicht zu alt — Sicherheit geht vor."],
      ["Was kostet das Inserieren?", "Kostenlos; jedes Inserat wird vor der Veröffentlichung kurz geprüft."],
    ],
  },
  {
    slug: "ebike-kaufen-schweiz", icon: "🔋", h1: "E-Bike kaufen in der Schweiz",
    title: "E-Bike kaufen Schweiz — Elektrovelos neu & gebraucht | aban",
    desc: "E-Bike in der Schweiz kaufen: Elektrovelos, E-Mountainbikes und Zubehör neu oder gebraucht suchen, nach Preis und Zustand filtern.",
    cta: "/angebote-suche.html?q=E-Bike", ctaLabel: "E-Bike-Angebote ansehen",
    intro: "Elektrovelo fürs Pendeln oder E-Mountainbike fürs Gelände — neu oder gebraucht. Vergleiche Angebote und achte besonders auf den Akku.",
    tips: [
      ["Akku ist entscheidend", "Frag nach Akku-Alter, Ladezyklen und Reichweite — der Akku ist das teuerste Teil."],
      ["Motor & Marke", "Bekannte Motoren (Bosch & Co.) sind gut wartbar und langlebig."],
      ["Probefahrt", "Sitzposition, Bremsen und Unterstützung testen, bevor du kaufst."],
    ],
    faq: [
      ["Wo finde ich günstige E-Bikes in der Schweiz?", "In der Angebote-Suche suchst du nach E-Bike und filterst nach Preis und Zustand; lokale Occasionen im Inserate-Bereich."],
      ["Worauf beim gebrauchten E-Bike achten?", "Akku-Zustand/Reichweite, Motorhersteller, Kilometer und Garantie — eine Probefahrt zeigt viel."],
      ["Kann ich mein E-Bike verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "uhren-schmuck-kaufen-schweiz", icon: "⌚", h1: "Uhren & Schmuck kaufen in der Schweiz",
    title: "Uhren & Schmuck kaufen Schweiz — neu & second-hand | aban",
    desc: "Uhren und Schmuck in der Schweiz: Armbanduhren, Schmuck und Accessoires neu oder second-hand suchen und vergleichen.",
    cta: "/angebote-suche.html?q=Uhr", ctaLabel: "Uhren-Angebote ansehen",
    intro: "Armbanduhren, Schmuck und Accessoires — neu oder second-hand. Vergleiche Angebote und filtere nach Preis und Zustand.",
    tips: [
      ["Echtheit prüfen", "Bei höherwertigen Uhren auf Papiere, Seriennummer und seriösen Anbieter achten."],
      ["Zustand zählt", "Kratzer, Funktion und (bei Uhren) Service-Historie beeinflussen den Wert."],
      ["Preise vergleichen", "Gerade bei Marken lohnt sich der Vergleich mehrerer Angebote."],
    ],
    faq: [
      ["Wo finde ich günstige Uhren in der Schweiz?", "In der Angebote-Suche suchst du nach Uhr/Schmuck und filterst nach Preis und Zustand; lokale Stücke im Inserate-Bereich."],
      ["Worauf bei teuren Uhren achten?", "Echtheit, Papiere, Seriennummer und ein seriöser Anbieter — im Zweifel prüfen lassen."],
      ["Kann ich Schmuck verkaufen?", "Ja — kostenlos als Inserat aufgeben, kurze Prüfung vor der Veröffentlichung."],
    ],
  },
  {
    slug: "occasion-auto-schweiz", icon: "🚙", h1: "Occasion Auto kaufen in der Schweiz",
    title: "Occasion Auto Schweiz — gebrauchte Autos finden & vergleichen | aban",
    desc: "Occasion (Gebrauchtwagen) in der Schweiz kaufen: gebrauchte Autos nach Marke, Zustand und Preis suchen und vergleichen — plus Tipps zu MFK, Kilometern und Probefahrt.",
    cta: "/auto-suche.html", ctaLabel: "Occasionen durchsuchen",
    intro: "Eine Occasion ist oft das beste Preis-Leistungs-Verhältnis. Durchsuche Gebrauchtwagen-Angebote, vergleiche Preise und achte auf Zustand, Kilometer und MFK.",
    tips: [
      ["MFK & Service prüfen", "Frag nach letzter MFK, Serviceheft und ob die nächste Prüfung bald ansteht — das beeinflusst den Preis stark."],
      ["Kilometer realistisch werten", "Niedrige Kilometer sind gut, aber ein lückenloser Service zählt mehr als nur die Zahl auf dem Tacho."],
      ["Probefahrt + Check", "Probefahrt machen; bei Unsicherheit von einer Fachperson/Garage prüfen lassen, bevor du zahlst."],
    ],
    faq: [
      ["Was heisst Occasion?", "„Occasion“ ist in der Schweiz das übliche Wort für einen Gebrauchtwagen. In der Auto-Suche filterst du nach Marke, Zustand (gebraucht) und Preis."],
      ["Worauf bei einer Occasion achten?", "MFK-Status, Serviceheft, Kilometer, Unfallfreiheit und ein fairer Marktpreis — im Zweifel prüfen lassen."],
      ["Privat oder Händler kaufen?", "Händler bieten oft Garantie, privat ist meist günstiger. Beides findest du; bei privat lohnt eine gründliche Probefahrt."],
    ],
  },
  {
    slug: "motorrad-kaufen-schweiz", icon: "🏍️", h1: "Motorrad & Töff kaufen in der Schweiz",
    title: "Motorrad kaufen Schweiz — Töff, Roller & Zubehör finden | aban",
    desc: "Motorrad in der Schweiz kaufen: Töff, Roller, Motorräder und Zubehör neu oder gebraucht suchen, nach Marke, Zustand und Preis filtern.",
    cta: "/auto-suche.html?cat=Motorrad", ctaLabel: "Motorräder durchsuchen",
    intro: "Vom Roller bis zur Reiseenduro — neu oder gebraucht. Durchsuche Töff-Angebote, vergleiche Preise und achte auf Zustand, Kilometer und MFK.",
    tips: [
      ["Kategorie & Führerschein", "Achte auf die passende Kategorie (A1/A35/A) zu deinem Führerausweis, bevor du kaufst."],
      ["Zustand prüfen", "Reifen, Bremsen, Kette und Service-Historie checken; bei gebrauchten Töffs auf Sturzschäden achten."],
      ["Saison nutzen", "Im Herbst/Winter sind Töffs oft günstiger als im Frühling zum Saisonstart."],
    ],
    faq: [
      ["Wo finde ich Töff-Occasionen in der Schweiz?", "In der Auto-Suche wählst du die Kategorie Motorrad und filterst nach Preis und Zustand; lokale Angebote auch im Inserate-Bereich."],
      ["Worauf beim Töff-Kauf achten?", "Passende Führerschein-Kategorie, Zustand (Reifen/Bremsen/Kette), Kilometer, MFK und Service-Historie."],
      ["Neu oder gebraucht?", "Gebrauchte Töffs sind günstiger; achte auf gepflegten Zustand und einen fairen Preis."],
    ],
  },
  {
    slug: "wohnmobil-kaufen-schweiz", icon: "🚐", h1: "Wohnmobil & Camper kaufen in der Schweiz",
    title: "Wohnmobil kaufen Schweiz — Camper & Wohnwagen finden | aban",
    desc: "Wohnmobil in der Schweiz kaufen: Camper, Wohnmobile und Wohnwagen neu oder gebraucht suchen, nach Zustand und Preis filtern — plus Kauf-Tipps.",
    cta: "/auto-suche.html?cat=Wohnmobil", ctaLabel: "Wohnmobile durchsuchen",
    intro: "Camper für die Ferien oder Vanlife — neu oder gebraucht. Durchsuche Wohnmobil-Angebote, vergleiche Preise und achte auf Aufbau, Feuchtigkeit und Kilometer.",
    tips: [
      ["Feuchtigkeit checken", "Der wichtigste Punkt bei gebrauchten Wohnmobilen: auf Feuchtigkeitsschäden im Aufbau achten (Dichtungsprotokoll verlangen)."],
      ["Gewicht & Führerschein", "Prüfe Gesamtgewicht vs. deinen Führerausweis (B bis 3,5 t) und die Zuladung."],
      ["Ausstattung vergleichen", "Heizung, Sanitär, Betten-Layout und Standzeit/Service entscheiden über Komfort und Preis."],
    ],
    faq: [
      ["Wo finde ich Wohnmobile in der Schweiz?", "In der Auto-Suche wählst du die Kategorie Wohnmobil/Camper und filterst nach Preis und Zustand."],
      ["Worauf beim gebrauchten Camper achten?", "Feuchtigkeit im Aufbau, Gewicht/Zuladung, Kilometer, Service und Funktion von Heizung & Sanitär."],
      ["Mieten oder kaufen?", "Für wenige Wochen im Jahr lohnt oft Mieten; bei häufiger Nutzung rechnet sich der Kauf eines guten gebrauchten Campers."],
    ],
  },
  {
    slug: "umzug-schweiz", icon: "📦", h1: "Umzug in der Schweiz — Zügelfirma & Helfer finden",
    title: "Umzug Schweiz — Zügelfirma finden, vergleichen & Inserate | aban",
    desc: "Umzug in der Schweiz organisieren: Zügelfirmen und Umzugshelfer finden, Angebote vergleichen und Umzugs-Inserate aufgeben — plus Checkliste.",
    cta: "/inserate.html?kat=Dienstleistungen", ctaLabel: "Umzugs-Inserate ansehen",
    intro: "Zügeln ohne Stress: Finde Zügelfirmen und Helfer, vergleiche Angebote und nutze die Checkliste für einen reibungslosen Umzug in der Schweiz.",
    tips: [
      ["Früh mehrere Offerten holen", "Hol 2–3 Offerten ein und vergleiche Leistung (Möbellift, Verpackung, Entsorgung), nicht nur den Preis."],
      ["Termin & Kündigungsfristen", "Plane den Umzugstermin um die Kündigungsfristen herum; beliebte Termine (Monatsende) früh buchen."],
      ["Kartons & Helfer", "Kartons rechtzeitig organisieren; für günstige Umzüge Helfer über Inserate finden."],
    ],
    faq: [
      ["Wie finde ich eine gute Zügelfirma?", "Vergleiche mehrere Offerten, achte auf Versicherung und Bewertungen. Umzugshelfer und Dienstleister findest du auch im Inserate-Bereich."],
      ["Was kostet ein Umzug in der Schweiz?", "Das hängt von Volumen, Distanz und Leistungen ab. Mehrere Offerten zu vergleichen spart am meisten."],
      ["Kann ich Umzugshilfe inserieren?", "Ja — als Dienstleistung kostenlos inserieren oder Helfer/Transport im Inserate-Bereich suchen."],
    ],
  },
  {
    slug: "haus-kaufen-schweiz", icon: "🏡", h1: "Haus kaufen in der Schweiz",
    title: "Haus kaufen Schweiz — Einfamilienhäuser & mehr finden | aban",
    desc: "Haus kaufen in der Schweiz: Einfamilienhäuser, Reihenhäuser und Liegenschaften nach Ort und Kanton suchen — plus Tipps zu Finanzierung, Tragbarkeit und Eigenkapital.",
    cta: "/immobilien.html?q=haus", ctaLabel: "Häuser durchsuchen",
    intro: "Vom Einfamilienhaus bis zur Liegenschaft — such nach Ort oder Kanton und prüfe früh Finanzierung und Tragbarkeit, bevor du dich verliebst.",
    tips: [
      ["Tragbarkeit rechnen", "Faustregel: Wohnkosten (kalk. Zins ~5 %, Unterhalt, Amortisation) max. ein Drittel des Bruttoeinkommens."],
      ["Eigenkapital & 2. Säule", "Mind. 20 % Eigenkapital (10 % „hartes“ Eigenkapital). Pensionskassen-Bezug/Verpfändung früh klären."],
      ["Zustand & Nebenkosten", "Baujahr, Sanierungsstau, Heizung (fossil?) und Nebenkosten prüfen — beeinflussen den echten Preis stark."],
    ],
    faq: [
      ["Wie viel Eigenkapital brauche ich für ein Haus in der Schweiz?", "In der Regel mindestens 20 % des Kaufpreises, davon 10 % „hartes“ Eigenkapital (nicht aus der PK). Den Rest finanziert die Hypothek."],
      ["Wie finde ich Häuser in meiner Region?", "Gib in der Immobilien-Suche Ort/Kanton ein und wähle die Art Haus. Du kannst auch selbst inserieren."],
      ["Was ist die Tragbarkeit?", "Die kalkulatorischen Wohnkosten sollten rund ein Drittel deines Bruttoeinkommens nicht übersteigen — unabhängig vom aktuellen Tiefzins."],
    ],
  },
  {
    slug: "wohnung-kaufen-schweiz", icon: "🔑", h1: "Wohnung kaufen in der Schweiz",
    title: "Wohnung kaufen Schweiz — Eigentumswohnungen finden | aban",
    desc: "Eigentumswohnung in der Schweiz kaufen: Stockwerkeigentum nach Ort und Kanton suchen — plus Tipps zu Finanzierung, Stockwerkeigentum und Nebenkosten.",
    cta: "/immobilien.html?q=wohnung+kauf", ctaLabel: "Eigentumswohnungen durchsuchen",
    intro: "Eigentumswohnung statt Miete: such nach Ort oder Kanton, prüfe Finanzierung, Stockwerkeigentum-Reglement und den Erneuerungsfonds.",
    tips: [
      ["Stockwerkeigentum verstehen", "Prüfe Reglement, Wertquoten, Protokolle der Eigentümerversammlung und den Erneuerungsfonds."],
      ["Finanzierung früh klären", "Tragbarkeit + min. 20 % Eigenkapital. Hypothek vergleichen lohnt sich (Zinsunterschiede summieren sich)."],
      ["Nebenkosten realistisch", "Akonto-Nebenkosten + Beiträge in den Erneuerungsfonds einplanen, nicht nur die Hypothekarzinsen."],
    ],
    faq: [
      ["Lohnt sich Kaufen statt Mieten in der Schweiz?", "Je nach Region, Eigenkapital und Haltedauer. Ab ~10 Jahren und mit genug Eigenkapital ist Kaufen oft sinnvoll — rechne Tragbarkeit + Nebenkosten."],
      ["Was ist Stockwerkeigentum?", "Du besitzt deine Wohnung plus einen Anteil am Gemeinschaftseigentum. Reglement und Erneuerungsfonds sind wichtig zu prüfen."],
      ["Wie finde ich Eigentumswohnungen?", "Immobilien-Suche nach Ort/Kanton, Art „Wohnung kaufen“. Selbst inserieren ist ebenfalls kostenlos."],
    ],
  },
  {
    slug: "buero-mieten-schweiz", icon: "🏢", h1: "Büro & Gewerbe mieten in der Schweiz",
    title: "Büro mieten Schweiz — Gewerbe- & Büroräume finden | aban",
    desc: "Büro oder Gewerbe in der Schweiz mieten: Büroräume, Praxen, Ateliers und Gewerbeflächen nach Ort und Kanton suchen — oder kostenlos inserieren.",
    cta: "/immobilien.html?q=gewerbe+büro", ctaLabel: "Büro & Gewerbe durchsuchen",
    intro: "Büro, Praxis, Atelier oder Lager — such nach Ort oder Kanton und finde passende Gewerbeflächen, oder schreib dein Gesuch/Angebot aus.",
    tips: [
      ["Lage & Erreichbarkeit", "ÖV-Anbindung, Parkplätze und Laufkundschaft je nach Geschäft gewichten."],
      ["Mietkonditionen prüfen", "Nebenkosten, Mindestmietdauer, Ausbaustandard und Kündigungsfristen genau anschauen."],
      ["Flexibilität bedenken", "Für Start/Wachstum: Coworking oder flexible Verträge können günstiger sein als ein langer Mietvertrag."],
    ],
    faq: [
      ["Wo finde ich Büroflächen in der Schweiz?", "In der Immobilien-Suche nach Ort/Kanton suchen und nach Gewerbe/Büro filtern. Eigene Gesuche/Angebote kannst du kostenlos inserieren."],
      ["Worauf bei Gewerbemiete achten?", "Nebenkosten, Mietdauer, Ausbau, Nutzungsart (zonenkonform) und Kündigungsfristen."],
      ["Coworking oder eigenes Büro?", "Für kleine Teams/Start oft Coworking (flexibel, günstiger Einstieg); ab stabiler Grösse lohnt ein eigener Mietvertrag."],
    ],
  },
  {
    slug: "pflege-jobs-schweiz", icon: "🩺", h1: "Pflege-Jobs in der Schweiz", jobq: "pflege",
    title: "Pflege-Jobs Schweiz — offene Stellen finden | aban",
    desc: "Pflege-Jobs in der Schweiz finden: offene Stellen in Spital, Spitex, Heim und Praxis — nach Ort und Pensum suchen, direkt zur Original-Anzeige bewerben.",
    cta: "/stellenangebote.html?q=pflege", ctaLabel: "Pflege-Stellen durchsuchen",
    intro: "Pflegefachpersonen sind in der ganzen Schweiz gesucht. Durchsuche aktuelle Stellen in Spital, Spitex, Heim und Praxis und bewirb dich direkt beim Arbeitgeber.",
    tips: [
      ["Pensum & Schichten klären", "Achte auf Pensum (z. B. 80–100 %), Schicht-/Wochenendarbeit und ob Springerdienste erwartet werden."],
      ["Anerkennung & Stufe", "Halte Diplom/Anerkennung (SRK bei Ausland) und deine Funktionsstufe (FaGe, HF, FH) bereit — das beschleunigt die Bewerbung."],
      ["Region wählen", "Filtere nach Ort/Kanton — Lohn und Bedarf unterscheiden sich je Region deutlich."],
    ],
    faq: [
      ["Wo finde ich Pflege-Stellen in der Schweiz?", "In der Job-Suche nach „Pflege“ plus Ort/Kanton suchen. Die Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; der Klick führt zur Original-Anzeige."],
      ["Brauche ich eine Anerkennung?", "Mit ausländischem Diplom ist meist eine SRK-Anerkennung nötig. Arbeitgeber geben im Inserat an, was sie verlangen."],
      ["Voll- oder Teilzeit?", "Beides ist verbreitet — filtere nach Beschäftigungsart und Pensum direkt in der Job-Suche."],
    ],
  },
  {
    slug: "gastro-jobs-schweiz", icon: "🍽️", h1: "Gastro-Jobs in der Schweiz", jobq: "gastronomie",
    title: "Gastro-Jobs Schweiz — Koch, Service & Küche finden | aban",
    desc: "Gastronomie-Jobs in der Schweiz finden: Koch, Service, Küchenhilfe und Hotellerie — offene Stellen nach Ort suchen, direkt bewerben.",
    cta: "/stellenangebote.html?q=gastronomie", ctaLabel: "Gastro-Stellen durchsuchen",
    intro: "Von der Saison-Stelle bis zur Festanstellung: Koch, Service, Küche und Hotellerie sind in der ganzen Schweiz gesucht. Durchsuche aktuelle Stellen und bewirb dich direkt.",
    tips: [
      ["Saison vs. Jahresstelle", "In Tourismusregionen viele Saisonstellen (Winter/Sommer) — kläre Vertragsdauer und ob Personalzimmer geboten wird."],
      ["Sprachen helfen", "Deutsch/Französisch je Region + Englisch sind im Service ein Vorteil — im Lebenslauf angeben."],
      ["Referenzen bereit", "Arbeitszeugnisse und Referenzen aus früheren Betrieben beschleunigen die Zusage."],
    ],
    faq: [
      ["Wo finde ich Gastro-Jobs in der Schweiz?", "Such in der Job-Suche nach „Gastronomie“, „Koch“ oder „Service“ plus Ort. Treffer kommen live aus mehreren Börsen; Klick führt zur Original-Anzeige."],
      ["Gibt es Saisonstellen?", "Ja, gerade in Tourismusorten. Achte im Inserat auf Vertragsdauer und Unterkunft."],
      ["Auch ohne Ausbildung?", "Für Küchenhilfe/Service-Einstieg oft ja; für Koch/Chef de Partie wird Ausbildung/Erfahrung erwartet."],
    ],
  },
  {
    slug: "verkauf-jobs-schweiz", icon: "🛒", h1: "Verkauf- & Detailhandel-Jobs in der Schweiz", jobq: "verkauf",
    title: "Verkauf-Jobs Schweiz — Detailhandel & Beratung finden | aban",
    desc: "Verkauf- und Detailhandel-Jobs in der Schweiz finden: Verkäufer/in, Filialleitung, Kasse und Kundenberatung — Stellen nach Ort suchen, direkt bewerben.",
    cta: "/stellenangebote.html?q=verkauf", ctaLabel: "Verkauf-Stellen durchsuchen",
    intro: "Detailhandel sucht laufend Personal: Verkauf, Beratung, Kasse und Filialleitung. Durchsuche aktuelle Stellen in deiner Region und bewirb dich direkt beim Arbeitgeber.",
    tips: [
      ["Pensum & Samstage", "Im Detailhandel gehören Samstage meist dazu — kläre Pensum und Arbeitszeiten vorab."],
      ["Branche zeigen", "Erfahrung in der passenden Branche (Mode, Lebensmittel, Elektronik) im Lebenslauf hervorheben."],
      ["Sprachen & Auftritt", "Freundlicher Auftritt und Sprachkenntnisse der Region sind im Verkauf entscheidend."],
    ],
    faq: [
      ["Wo finde ich Verkauf-Stellen in der Schweiz?", "Such in der Job-Suche nach „Verkauf“ oder „Detailhandel“ plus Ort. Treffer kommen live aus mehreren Börsen; Klick führt zur Original-Anzeige."],
      ["Brauche ich eine Ausbildung?", "Für den Einstieg nicht immer; eine EFZ-Detailhandelsausbildung oder Branchenerfahrung erhöht die Chancen, v. a. für Filialleitung."],
      ["Voll- oder Teilzeit?", "Beides ist üblich — filtere nach Beschäftigungsart in der Job-Suche."],
    ],
  },
  {
    slug: "jobs-zuerich", icon: "🏙️", h1: "Jobs in Zürich", jobloc: "zürich",
    title: "Jobs Zürich — offene Stellen in der Region Zürich finden | aban",
    desc: "Jobs in Zürich finden: offene Stellen aus mehreren Job-Börsen für die Region Zürich — nach Beruf und Branche filtern, direkt zur Original-Anzeige bewerben.",
    cta: "/stellenangebote.html?loc=Z%C3%BCrich", ctaLabel: "Stellen in Zürich durchsuchen",
    intro: "Zürich ist der grösste Arbeitsmarkt der Schweiz. Durchsuche aktuelle Stellen in und um Zürich — von IT und Finance über Gesundheit bis Detailhandel — und bewirb dich direkt beim Arbeitgeber.",
    tips: [
      ["Pendeln einkalkulieren", "Die Region Zürich ist gut mit ÖV erschlossen — auch Stellen in Winterthur, Zug oder am Flughafen sind oft gut erreichbar."],
      ["Lohnniveau kennen", "Zürich hat hohe Löhne, aber auch hohe Lebenskosten — vergleiche Brutto mit Miete/Krankenkasse der Region."],
      ["Branche wählen", "Filtere nach deiner Branche (Finance, IT, Gesundheit, Verkauf), um aus der grossen Auswahl die passenden Stellen zu sehen."],
    ],
    faq: [
      ["Wie finde ich Jobs in Zürich?", "Gib in der Job-Suche „Zürich“ als Ort ein (oder nutze diese Seite). Die Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; der Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Zürich stark?", "Finance/Banking, IT, Versicherung, Gesundheit, Beratung und Detailhandel — für alle kannst du in der Job-Suche nach Kategorie filtern."],
      ["Gibt es auch Teilzeit-Stellen?", "Ja — filtere in der Job-Suche nach Beschäftigungsart (Voll-/Teilzeit, Praktikum)."],
    ],
  },
  {
    slug: "jobs-bern", icon: "🐻", h1: "Jobs in Bern", jobloc: "bern",
    title: "Jobs Bern — offene Stellen in der Region Bern finden | aban",
    desc: "Jobs in Bern finden: offene Stellen aus mehreren Job-Börsen für die Region Bern und das Mittelland — nach Beruf filtern, direkt bewerben.",
    cta: "/stellenangebote.html?loc=Bern", ctaLabel: "Stellen in Bern durchsuchen",
    intro: "Bundesstadt und Mittelland: In Bern findest du Stellen in Verwaltung, Gesundheit, Bildung, IT und Gewerbe. Durchsuche aktuelle Angebote und bewirb dich direkt.",
    tips: [
      ["Verwaltung & Bund", "Bern ist Sitz der Bundesverwaltung — viele Stellen im öffentlichen Sektor; Bewerbungsfristen genau beachten."],
      ["Sprachen", "Im Raum Bern ist Deutsch zentral, Französisch (Biel/Seeland) oft ein Plus — im CV angeben."],
      ["Region nutzen", "Auch Thun, Biel und das Seeland sind gut erreichbar — erweitere die Suche bei Bedarf."],
    ],
    faq: [
      ["Wie finde ich Jobs in Bern?", "Gib in der Job-Suche „Bern“ als Ort ein (oder nutze diese Seite). Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Bern stark?", "Öffentliche Verwaltung, Gesundheit, Bildung, IT und Gewerbe — in der Job-Suche nach Kategorie filterbar."],
      ["Auch Stellen in der Region?", "Ja — Thun, Biel und das Seeland tauchen bei einer etwas breiteren Ortssuche mit auf."],
    ],
  },
  {
    slug: "jobs-basel", icon: "💊", h1: "Jobs in Basel", jobloc: "basel",
    title: "Jobs Basel — offene Stellen in der Region Basel finden | aban",
    desc: "Jobs in Basel finden: offene Stellen aus mehreren Job-Börsen für die Region Basel — Pharma, Chemie, Logistik & mehr. Nach Beruf filtern, direkt bewerben.",
    cta: "/stellenangebote.html?loc=Basel", ctaLabel: "Stellen in Basel durchsuchen",
    intro: "Basel ist das Pharma- und Life-Sciences-Zentrum der Schweiz. Durchsuche aktuelle Stellen in Pharma, Chemie, Logistik, Gesundheit und mehr — und bewirb dich direkt.",
    tips: [
      ["Life Sciences im Fokus", "Pharma/Chemie (z. B. Roche, Novartis und Zulieferer) prägen den Markt — auch viele Stellen bei Dienstleistern rundherum."],
      ["Grenzregion nutzen", "Basel grenzt an DE/FR — kläre bei Bedarf Grenzgänger-Themen (Bewilligung, Steuern)."],
      ["Branche filtern", "Neben Pharma sind Logistik, Gesundheit und Detailhandel stark — in der Job-Suche nach Kategorie filtern."],
    ],
    faq: [
      ["Wie finde ich Jobs in Basel?", "Gib in der Job-Suche „Basel“ als Ort ein (oder nutze diese Seite). Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Basel stark?", "Pharma/Chemie/Life Sciences, Logistik, Gesundheit und Detailhandel — in der Job-Suche filterbar."],
      ["Auch für Grenzgänger?", "Ja — viele Stellen sind für Pendler aus DE/FR offen; Bewilligungs- und Steuerfragen vorab klären."],
    ],
  },
  {
    slug: "jobs-genf", icon: "🌍", h1: "Jobs in Genf", jobloc: "genf",
    title: "Jobs Genf — offene Stellen in der Region Genf finden | aban",
    desc: "Jobs in Genf finden: offene Stellen aus mehreren Job-Börsen für die Region Genf — internationale Organisationen, Uhren, Finanz & mehr. Direkt zur Original-Anzeige bewerben.",
    cta: "/stellenangebote.html?loc=Genf", ctaLabel: "Stellen in Genf durchsuchen",
    intro: "Genf ist Sitz vieler internationaler Organisationen und ein starker Finanz- und Uhrenstandort. Durchsuche aktuelle Stellen in der Region Genf und bewirb dich direkt beim Arbeitgeber.",
    tips: [
      ["Sprachen", "Französisch ist zentral, Englisch (internationale Organisationen) und Deutsch sind oft ein klarer Vorteil — im CV angeben."],
      ["Internationale Arbeitgeber", "UNO, NGOs und Konzerne haben eigene Bewerbungsprozesse und Fristen — früh vorbereiten."],
      ["Grenzregion", "Viele pendeln aus Frankreich — Grenzgänger-Themen (Bewilligung, Steuern) bei Bedarf vorab klären."],
    ],
    faq: [
      ["Wie finde ich Jobs in Genf?", "Gib in der Job-Suche Genf als Ort ein oder nutze diese Seite. Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; der Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Genf stark?", "Internationale Organisationen, Finanz/Banking, Uhren/Luxus, Pharma/Handel und Gastgewerbe — in der Job-Suche nach Kategorie filterbar."],
      ["Brauche ich Französisch?", "Für die meisten Stellen ja; bei internationalen Organisationen genügt teils Englisch. Sprachkenntnisse im CV hervorheben."],
    ],
  },
  {
    slug: "jobs-lausanne", icon: "⛵", h1: "Jobs in Lausanne", jobloc: "lausanne",
    title: "Jobs Lausanne — offene Stellen in der Region Lausanne finden | aban",
    desc: "Jobs in Lausanne finden: offene Stellen aus mehreren Job-Börsen für die Region Lausanne und die Waadt — Bildung, Gesundheit, Sport & mehr. Direkt bewerben.",
    cta: "/stellenangebote.html?loc=Lausanne", ctaLabel: "Stellen in Lausanne durchsuchen",
    intro: "Lausanne ist Hochschul-, Sport- und Verwaltungsstandort am Genfersee. Durchsuche aktuelle Stellen in der Region Lausanne und bewirb dich direkt beim Arbeitgeber.",
    tips: [
      ["Französisch zentral", "In der Waadt ist Französisch Voraussetzung; Englisch (EPFL, internationale Sportverbände) hilft zusätzlich."],
      ["Hochschulen & Sport", "EPFL, Universität und Sportverbände (IOC) sind grosse Arbeitgeber mit eigenen Prozessen."],
      ["Region nutzen", "Auch Montreux, Vevey und Morges sind gut erreichbar — Suche bei Bedarf erweitern."],
    ],
    faq: [
      ["Wie finde ich Jobs in Lausanne?", "Gib in der Job-Suche Lausanne als Ort ein oder nutze diese Seite. Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; der Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Lausanne stark?", "Bildung/Forschung, Gesundheit, öffentliche Verwaltung, Sport und Detailhandel — in der Job-Suche nach Kategorie filterbar."],
      ["Brauche ich Französisch?", "Für die meisten Stellen ja; bei Hochschulen/internationalen Verbänden ist Englisch oft zusätzlich gefragt."],
    ],
  },
  {
    slug: "jobs-lugano", icon: "🌴", h1: "Jobs in Lugano", jobloc: "lugano",
    title: "Jobs Lugano — offene Stellen im Tessin finden | aban",
    desc: "Jobs in Lugano und im Tessin finden: offene Stellen aus mehreren Job-Börsen — Finanz, Tourismus, Handel & mehr. Direkt zur Original-Anzeige bewerben.",
    cta: "/stellenangebote.html?loc=Lugano", ctaLabel: "Stellen in Lugano durchsuchen",
    intro: "Lugano ist das Wirtschaftszentrum des Tessins mit Schwerpunkt Finanz, Handel und Tourismus. Durchsuche aktuelle Stellen in der Region Lugano und bewirb dich direkt.",
    tips: [
      ["Italienisch zentral", "Im Tessin ist Italienisch Voraussetzung; Deutsch und Englisch sind je nach Branche ein Vorteil."],
      ["Finanz & Tourismus", "Banken, Treuhand, Handel und Hotellerie prägen den Markt — saisonale Stellen im Tourismus beachten."],
      ["Grenzregion Italien", "Viele Grenzgänger aus Italien — Bewilligungs- und Lohnfragen vorab klären."],
    ],
    faq: [
      ["Wie finde ich Jobs in Lugano?", "Gib in der Job-Suche Lugano als Ort ein oder nutze diese Seite. Treffer kommen live aus mehreren Börsen inkl. Schweizer Quellen; der Klick führt zur Original-Anzeige."],
      ["Welche Branchen sind in Lugano stark?", "Finanz/Treuhand, Handel, Tourismus/Hotellerie und Dienstleistungen — in der Job-Suche nach Kategorie filterbar."],
      ["Brauche ich Italienisch?", "Für die meisten Stellen ja; Deutsch/Englisch sind je nach Arbeitgeber ein zusätzlicher Vorteil."],
    ],
  },
  {
    slug: "laptop-kaufen-schweiz", icon: "💻", h1: "Laptop kaufen in der Schweiz",
    title: "Laptop kaufen Schweiz — neu & gebraucht vergleichen | aban",
    desc: "Laptop kaufen in der Schweiz: Notebooks neu und gebraucht nach Preis, Marke und Zustand vergleichen — und beim besten Angebot zuschlagen.",
    cta: "/angebote-suche.html?q=Laptop", ctaLabel: "Laptop-Angebote ansehen",
    intro: "Vom günstigen Office-Notebook bis zum Gaming-Laptop: Hier vergleichst du Modelle und Preise an einem Ort — neu oder gebraucht — bevor du beim Anbieter kaufst.",
    tips: [
      ["Auf den Einsatz achten", "Für Büro/Studium reichen 16 GB RAM und SSD. Für Gaming/Schnitt zählt die Grafikkarte. Kauf nicht mehr, als du brauchst."],
      ["Akku & Zustand prüfen", "Bei gebrauchten Geräten Akkuzyklen und Display checken. Ein Gerät mit Restgarantie ist sicherer."],
      ["Preise vergleichen", "Dasselbe Modell schwankt stark. Sortiere nach Preis und vergleiche mehrere Angebote."],
    ],
    faq: [
      ["Lohnt sich ein gebrauchter Laptop?", "Oft ja — generalüberholte Business-Notebooks sind günstig und robust. Achte auf Akku, SSD und eine kurze Restgarantie."],
      ["Wie viel RAM und Speicher brauche ich?", "Für die meisten Aufgaben 16 GB RAM und eine SSD ab 256 GB. Speicherintensive Arbeit (Video, viele Programme) eher 512 GB+."],
      ["Wo finde ich günstige Laptops in der Schweiz?", "Über die Angebote-Suche nach Preis und Zustand filtern; für lokale Schnäppchen zusätzlich im Inserate-Bereich stöbern."],
    ],
  },
  {
    slug: "kaffeemaschine-kaufen-schweiz", icon: "☕", h1: "Kaffeemaschine kaufen in der Schweiz",
    title: "Kaffeemaschine kaufen Schweiz — Vollautomat & mehr | aban",
    desc: "Kaffeemaschine kaufen in der Schweiz: Vollautomaten, Siebträger und Kapselmaschinen nach Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Kaffeemaschine", ctaLabel: "Kaffeemaschinen ansehen",
    intro: "Vollautomat, Siebträger oder Kapsel: Hier vergleichst du Kaffeemaschinen nach Preis und Zustand — neu oder gepflegt gebraucht.",
    tips: [
      ["Maschinentyp wählen", "Vollautomat = Komfort, Siebträger = Kontrolle, Kapsel = einfach. Entscheide nach Aufwand und Kaffeemenge."],
      ["Folgekosten bedenken", "Kapseln und Entkalkung kosten laufend. Bohnen im Vollautomaten sind pro Tasse meist günstiger."],
      ["Gebraucht: entkalkt?", "Bei gebrauchten Geräten fragen, ob frisch entkalkt/gewartet — das verlängert die Lebensdauer deutlich."],
    ],
    faq: [
      ["Vollautomat oder Siebträger?", "Vollautomat für Komfort und schnelle Tasse, Siebträger für mehr Kontrolle über den Espresso. Beides gibt's neu und gebraucht."],
      ["Lohnt sich gebraucht?", "Ja, wenn die Maschine gewartet/entkalkt ist. Hochwertige Vollautomaten halten lange und sind gebraucht deutlich günstiger."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und mehrere Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "waschmaschine-kaufen-schweiz", icon: "🧺", h1: "Waschmaschine kaufen in der Schweiz",
    title: "Waschmaschine kaufen Schweiz — neu & gebraucht | aban",
    desc: "Waschmaschine kaufen in der Schweiz: Geräte nach Preis, Energieklasse und Zustand vergleichen — und beim passenden Angebot zuschlagen.",
    cta: "/angebote-suche.html?q=Waschmaschine", ctaLabel: "Waschmaschinen ansehen",
    intro: "Standgerät oder Einbau: Hier vergleichst du Waschmaschinen nach Preis und Zustand — neu oder gebraucht — und sparst bei Strom und Wasser.",
    tips: [
      ["Energieklasse zählt", "Eine sparsame Maschine kostet etwas mehr, spart aber jahrelang Strom und Wasser. Rechne die Laufkosten mit ein."],
      ["Masse & Anschluss prüfen", "Vor dem Kauf Nische, Türanschlag und Wasser-/Stromanschluss ausmessen — gerade bei Einbaugeräten."],
      ["Gebraucht mit Vorsicht", "Bei gebrauchten Geräten Alter, Lagergeräusche und Dichtungen prüfen. Restgarantie ist ein Plus."],
    ],
    faq: [
      ["Worauf beim Waschmaschinenkauf achten?", "Fassungsvermögen, Energie-/Wasserverbrauch, Schleuderdrehzahl und die Masse für deinen Platz. Bei gebraucht zusätzlich Alter und Zustand."],
      ["Lohnt sich gebraucht?", "Bei jüngeren, gepflegten Geräten ja. Sehr alte Maschinen verbrauchen oft mehr Strom/Wasser — das frisst den Preisvorteil."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Geräte (Abholung) zusätzlich im Inserate-Bereich."],
    ],
  },
  {
    slug: "kuehlschrank-kaufen-schweiz", icon: "🧊", h1: "Kühlschrank kaufen in der Schweiz",
    title: "Kühlschrank kaufen Schweiz — Kühl- & Gefrierschränke | aban",
    desc: "Kühlschrank kaufen in der Schweiz: Kühl- und Gefrierschränke nach Grösse, Energieklasse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=K%C3%BChlschrank", ctaLabel: "Kühlschränke ansehen",
    intro: "Vom kompakten Single-Kühlschrank bis zur Kühl-Gefrier-Kombi: Hier vergleichst du nach Grösse, Energie und Preis — neu oder gebraucht.",
    tips: [
      ["Grösse passend wählen", "Pro Person grob 100–150 Liter. Zu gross verbraucht unnötig Strom, zu klein nervt im Alltag."],
      ["Energieklasse beachten", "Der Kühlschrank läuft 24/7 — eine sparsame Klasse zahlt sich über die Jahre klar aus."],
      ["Masse & Türanschlag", "Höhe, Breite und Türanschlag vorher prüfen, damit das Gerät passt und sich gut öffnen lässt."],
    ],
    faq: [
      ["Wie gross sollte der Kühlschrank sein?", "Als Faustregel 100–150 Liter pro Person, plus Reserve für Vorräte. Für Familien lohnt eine Kühl-Gefrier-Kombi."],
      ["Lohnt sich ein gebrauchter Kühlschrank?", "Bei jüngeren, sparsamen Geräten ja. Sehr alte Modelle ziehen viel Strom — das relativiert den günstigen Preis."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokale Abholgeräte im Inserate-Bereich."],
    ],
  },
  {
    slug: "staubsauger-kaufen-schweiz", icon: "🧹", h1: "Staubsauger kaufen in der Schweiz",
    title: "Staubsauger kaufen Schweiz — Akku & Saugroboter | aban",
    desc: "Staubsauger kaufen in der Schweiz: Akku-, Boden- und Saugroboter nach Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Staubsauger", ctaLabel: "Staubsauger ansehen",
    intro: "Akkusauger, klassischer Bodenstaubsauger oder Saugroboter: Hier vergleichst du nach Preis und Zustand und findest das passende Modell.",
    tips: [
      ["Bauart nach Wohnung", "Akkusauger für kleine Wohnungen, Bodengerät für viel Fläche, Saugroboter für tägliche Routine."],
      ["Folgekosten prüfen", "Filter, Bürsten und Akkus sind Verschleissteile. Schau, ob Ersatzteile verfügbar und bezahlbar sind."],
      ["Gebraucht: Akku checken", "Bei Akkugeräten zählt der Akkuzustand am meisten — danach fragen oder kurz testen."],
    ],
    faq: [
      ["Saugroboter oder klassisch?", "Saugroboter halten den Boden täglich sauber, klassische Sauger reinigen gründlicher und flexibler. Viele kombinieren beides."],
      ["Worauf achten?", "Saugleistung, Akkulaufzeit (bei Akku), Lautstärke und verfügbare Ersatzteile (Filter/Bürsten)."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "matratze-kaufen-schweiz", icon: "🛏️", h1: "Matratze kaufen in der Schweiz",
    title: "Matratze kaufen Schweiz — Grössen & Härtegrade | aban",
    desc: "Matratze kaufen in der Schweiz: Grössen, Härtegrade und Typen vergleichen — und die passende Matratze zum fairen Preis finden.",
    cta: "/angebote-suche.html?q=Matratze", ctaLabel: "Matratzen ansehen",
    intro: "Kaltschaum, Federkern oder Latex: Hier vergleichst du Matratzen nach Grösse, Härtegrad und Preis — neu (Hygiene beachten) oder geprüft.",
    tips: [
      ["Grösse & Härtegrad", "Schweizer Standardmasse beachten (z. B. 90×200, 160×200). Härtegrad nach Körpergewicht und Schlafposition wählen."],
      ["Probeliegen lohnt sich", "Wenn möglich testen. Viele Anbieter haben Rückgabefristen — ideal, um die Matratze ein paar Nächte zu prüfen."],
      ["Hygiene bei gebraucht", "Gebrauchte Matratzen nur mit Vorsicht (Hygiene). Neuware oder Ausstellungsstücke sind hier oft die bessere Wahl."],
    ],
    faq: [
      ["Welcher Härtegrad ist richtig?", "Grob: leichteres Gewicht = weicher (H1–H2), schwerer = fester (H3–H4). Seitenschläfer brauchen mehr Schulter-/Hüftnachgiebigkeit."],
      ["Welche Matratzengrösse in der Schweiz?", "Gängig sind 90×200 (Einzel) und 160×200 (Doppel). Miss dein Bettgestell vor dem Kauf aus."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Typ filtern und mehrere Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "grill-kaufen-schweiz", icon: "🔥", h1: "Grill kaufen in der Schweiz",
    title: "Grill kaufen Schweiz — Gas, Kohle & Elektro | aban",
    desc: "Grill kaufen in der Schweiz: Gas-, Kohle- und Elektrogrills nach Preis und Zustand vergleichen — rechtzeitig vor der Grillsaison.",
    cta: "/angebote-suche.html?q=Grill", ctaLabel: "Grills ansehen",
    intro: "Gas, Kohle oder Elektro: Hier vergleichst du Grills nach Typ, Preis und Zustand — und bist rechtzeitig zur Saison ausgerüstet.",
    tips: [
      ["Grilltyp wählen", "Gas = schnell & sauber, Kohle = Aroma, Elektro = ideal für Balkon. Entscheide nach Platz und Rauch-Regeln."],
      ["Balkon-Regeln prüfen", "In Mietwohnungen ist Grillen oft geregelt. Elektrogrills sind meist die unkomplizierte Lösung."],
      ["Zubehör mitdenken", "Abdeckhaube, Thermometer und Reinigung verlängern die Lebensdauer. Bei gebraucht auf Rost achten."],
    ],
    faq: [
      ["Gas-, Kohle- oder Elektrogrill?", "Gas ist schnell und sauber, Kohle bringt Aroma, Elektro passt für Balkon/innen. Wähle nach Platz, Rauch und Aufwand."],
      ["Darf ich auf dem Balkon grillen?", "Das hängt von Mietvertrag/Hausordnung ab. Elektrogrills sind meist erlaubt; bei Kohle/Gas vorher abklären."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Geräte zum Abholen im Inserate-Bereich."],
    ],
  },
  {
    slug: "klimageraet-kaufen-schweiz", icon: "❄️", h1: "Klimagerät kaufen in der Schweiz",
    title: "Klimagerät kaufen Schweiz — mobil & Split | aban",
    desc: "Klimagerät kaufen in der Schweiz: mobile Klimaanlagen und Split-Geräte nach Leistung, Lautstärke und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Klimager%C3%A4t", ctaLabel: "Klimageräte ansehen",
    intro: "Mobiles Monogerät oder fest installiertes Split: Hier vergleichst du Klimageräte nach Leistung, Lautstärke und Preis — rechtzeitig vor der Hitze.",
    tips: [
      ["Leistung zum Raum", "Die Kühlleistung (BTU/Watt) muss zur Raumgrösse passen. Zu schwach kühlt kaum, zu stark verbraucht unnötig."],
      ["Lautstärke beachten", "Im Schlafzimmer zählt der Geräuschpegel. Schau auf dB-Angaben, gerade bei mobilen Geräten."],
      ["Abluft & Montage", "Mobile Geräte brauchen eine Abluftführung (Fenster). Split-Geräte benötigen eine Fachmontage."],
    ],
    faq: [
      ["Mobil oder Split?", "Mobile Geräte sind flexibel und ohne Montage, aber lauter und weniger effizient. Split-Geräte kühlen besser, brauchen aber Installation."],
      ["Welche Leistung brauche ich?", "Faustregel rund 60–100 Watt Kühlleistung pro m². Bei viel Sonne/Dachwohnung eher mehr einplanen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Leistung filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "tablet-kaufen-schweiz", icon: "📲", h1: "Tablet kaufen in der Schweiz",
    title: "Tablet kaufen Schweiz — neu & gebraucht vergleichen | aban",
    desc: "Tablet kaufen in der Schweiz: Tablets nach Grösse, Speicher und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Tablet", ctaLabel: "Tablets ansehen",
    intro: "Zum Surfen, Lesen oder Arbeiten: Hier vergleichst du Tablets nach Grösse, Speicher und Preis — neu oder geprüft gebraucht.",
    tips: [
      ["Einsatz klären", "Für Medien reicht ein Mittelklasse-Tablet. Für Notizen/Arbeit lohnen Stift-Unterstützung und mehr Speicher."],
      ["Speicher & Akku", "256 GB sind komfortabel. Bei gebrauchten Geräten Akku und Display auf Kratzer prüfen."],
      ["WLAN oder Mobilfunk", "Nur WLAN ist günstiger; mobile Daten lohnen nur, wenn du unterwegs unabhängig sein willst."],
    ],
    faq: [
      ["Lohnt sich ein gebrauchtes Tablet?", "Ja, wenn Akku und Display gut sind. Ältere Modelle bekommen aber irgendwann keine Updates mehr — darauf achten."],
      ["Wie viel Speicher brauche ich?", "Für Medien/Web reichen 128 GB; wer viel offline speichert oder arbeitet, fährt mit 256 GB+ entspannter."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und mehrere Modelle vergleichen."],
    ],
  },
  {
    slug: "kinderwagen-kaufen-schweiz", icon: "👶", h1: "Kinderwagen kaufen in der Schweiz",
    title: "Kinderwagen kaufen Schweiz — neu & gebraucht | aban",
    desc: "Kinderwagen kaufen in der Schweiz: Buggys, Kombi- und Geschwisterwagen nach Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Kinderwagen", ctaLabel: "Kinderwagen ansehen",
    intro: "Vom kompakten Buggy bis zum Kombikinderwagen: Hier vergleichst du nach Typ, Preis und Zustand — neu oder gepflegt gebraucht.",
    tips: [
      ["Typ nach Alltag", "Kombiwagen wachsen mit (Babywanne → Sitz), Buggys sind leicht und ÖV-tauglich. Wähle nach deinem Alltag."],
      ["Masse & Gewicht", "Passt der Wagen in Lift, Auto und Treppenhaus? Gewicht ist im Alltag entscheidend."],
      ["Gebraucht prüfen", "Bremsen, Räder, Gurte und Verdeck checken. Gepflegte Markenwagen sind gebraucht oft ein gutes Geschäft."],
    ],
    faq: [
      ["Kombiwagen oder Buggy?", "Kombiwagen sind vielseitig von Geburt an, Buggys leicht und kompakt für später/unterwegs. Viele starten mit Kombi und ergänzen einen Buggy."],
      ["Lohnt sich gebraucht?", "Häufig ja — Kinderwagen werden oft nur kurz genutzt. Auf Zustand von Bremsen, Gurten und Rädern achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Wagen zum Abholen im Inserate-Bereich (Kategorie Baby & Kind)."],
    ],
  },
  {
    slug: "drucker-kaufen-schweiz", icon: "🖨️", h1: "Drucker kaufen in der Schweiz",
    title: "Drucker kaufen Schweiz — Tinte & Laser vergleichen | aban",
    desc: "Drucker kaufen in der Schweiz: Tinten- und Laserdrucker nach Folgekosten, Funktion und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Drucker", ctaLabel: "Drucker ansehen",
    intro: "Tinte oder Laser, Drucken oder Multifunktion: Hier vergleichst du Drucker nach Funktion, Folgekosten und Preis.",
    tips: [
      ["Folgekosten zählen", "Der Kaufpreis täuscht: Tinte/Toner kosten laufend. Rechne den Preis pro Seite mit ein."],
      ["Tinte vs. Laser", "Laser lohnt bei viel Text, Tinte bei Fotos/wenig Druck. Vieldrucker fahren mit Nachfülltanks günstiger."],
      ["Funktionen prüfen", "Brauchst du Scannen, Duplex, WLAN? Multifunktionsgeräte sparen Platz und Geld."],
    ],
    faq: [
      ["Tintenstrahl oder Laser?", "Laser für viel Text und Tempo, Tintenstrahl für Fotos und gelegentliches Drucken. Tintentank-Geräte senken die Seitenkosten stark."],
      ["Worauf bei den Kosten achten?", "Nicht nur Kaufpreis — vor allem Preis pro Seite (Tinte/Toner). Günstige Drucker haben oft teure Patronen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und mehrere Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "geschirrspueler-kaufen-schweiz", icon: "🍽️", h1: "Geschirrspüler kaufen in der Schweiz",
    title: "Geschirrspüler kaufen Schweiz — Spülmaschinen vergleichen | aban",
    desc: "Geschirrspüler kaufen in der Schweiz: Spülmaschinen nach Grösse, Energieklasse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Geschirrsp%C3%BCler", ctaLabel: "Geschirrspüler ansehen",
    intro: "Voll integriert, teilintegriert oder freistehend: Hier vergleichst du Geschirrspüler nach Grösse, Verbrauch und Preis.",
    tips: [
      ["Breite passend wählen", "Standard 60 cm, für kleine Küchen/Single 45 cm. Vor dem Kauf die Nische ausmessen."],
      ["Energie & Wasser", "Sparsame Geräte senken die Nebenkosten spürbar — der Spüler läuft schliesslich oft."],
      ["Lautstärke beachten", "In offenen Küchen zählt der dB-Wert. Leise Geräte (unter 44 dB) stören kaum."],
    ],
    faq: [
      ["45 cm oder 60 cm?", "60 cm fasst mehr (Familien), 45 cm passt in kleine Küchen oder Single-Haushalte. Entscheide nach Platz und Spülmenge."],
      ["Lohnt sich gebraucht?", "Bei jüngeren, sparsamen Geräten ja. Sehr alte ziehen mehr Wasser/Strom — das relativiert den Preis."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Geräte zum Abholen im Inserate-Bereich."],
    ],
  },
  {
    slug: "spielkonsole-kaufen-schweiz", icon: "🎮", h1: "Spielkonsole kaufen in der Schweiz",
    title: "Spielkonsole kaufen Schweiz — neu & gebraucht | aban",
    desc: "Spielkonsole kaufen in der Schweiz: Konsolen und Spiele nach Preis und Zustand vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Spielkonsole", ctaLabel: "Konsolen ansehen",
    intro: "Heim- oder Handheld-Konsole, mit Spielen im Bundle: Hier vergleichst du nach Preis und Zustand — neu oder gepflegt gebraucht.",
    tips: [
      ["Bundle rechnen", "Konsole mit 2 Controllern und Spielen ist oft günstiger als alles einzeln. Prüfe, was dabei ist."],
      ["Zustand bei gebraucht", "Laufwerk, Controller-Sticks und Lüfter checken. Originalverpackung ist ein Plus."],
      ["Spielebibliothek", "Achte, welche Spiele du wirklich willst — oft macht die Auswahl den Unterschied, nicht die Hardware."],
    ],
    faq: [
      ["Lohnt sich eine gebrauchte Konsole?", "Ja, wenn Laufwerk und Controller in Ordnung sind. Günstige Bundles mit Spielen sind oft das beste Geschäft."],
      ["Worauf achten?", "Zustand, mitgelieferte Controller/Spiele und ob alle Kabel dabei sind. Bei Handhelds zusätzlich Akku/Display."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Bundles gegenüberstellen."],
    ],
  },
  {
    slug: "gartenmoebel-kaufen-schweiz", icon: "🪑", h1: "Gartenmöbel kaufen in der Schweiz",
    title: "Gartenmöbel kaufen Schweiz — Lounge & Sets | aban",
    desc: "Gartenmöbel kaufen in der Schweiz: Lounge-Sets, Tische und Stühle nach Material, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Gartenm%C3%B6bel", ctaLabel: "Gartenmöbel ansehen",
    intro: "Lounge-Set, Esstisch oder Sonnenliege: Hier vergleichst du Gartenmöbel nach Material, Preis und Zustand — rechtzeitig zur Saison.",
    tips: [
      ["Material wählen", "Aluminium ist leicht und rostfrei, Holz wirkt warm (braucht Pflege), Polyrattan ist pflegeleicht. Entscheide nach Aufwand."],
      ["Wetterfestigkeit", "Achte auf UV- und Witterungsbeständigkeit. Eine Abdeckhaube verlängert die Lebensdauer deutlich."],
      ["Platz ausmessen", "Miss Balkon/Terrasse vorher aus — gerade Lounge-Sets brauchen mehr Raum als gedacht."],
    ],
    faq: [
      ["Welches Material ist am besten?", "Aluminium (leicht, rostfrei), Polyrattan (pflegeleicht) oder Holz (warm, pflegeintensiv). Hängt von Pflegeaufwand und Optik ab."],
      ["Lohnt sich gebraucht?", "Ja — gepflegte Sets sind günstig. Auf Risse, Rost und vollständige Polster/Kissen achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Sets zum Abholen im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "monitor-kaufen-schweiz", icon: "🖥️", h1: "Monitor kaufen in der Schweiz",
    title: "Monitor kaufen Schweiz — Büro & Gaming vergleichen | aban",
    desc: "Monitor kaufen in der Schweiz: Bildschirme nach Grösse, Auflösung und Preis vergleichen — fürs Büro oder Gaming.",
    cta: "/angebote-suche.html?q=Monitor", ctaLabel: "Monitore ansehen",
    intro: "Fürs Büro, Homeoffice oder Gaming: Hier vergleichst du Monitore nach Grösse, Auflösung und Preis — neu oder gebraucht.",
    tips: [
      ["Auflösung zur Grösse", "Ab 27 Zoll lohnt sich WQHD/4K. Für reines Büro reicht oft Full-HD — kauf passend, nicht zu viel."],
      ["Bildrate fürs Gaming", "Für Gaming zählt die Hertz-Zahl (144 Hz+). Fürs Büro ist sie zweitrangig."],
      ["Anschlüsse prüfen", "HDMI/DisplayPort/USB-C — schau, was dein Gerät unterstützt, damit Kabel und Auflösung passen."],
    ],
    faq: [
      ["Welche Grösse und Auflösung?", "24–27 Zoll Full-HD/WQHD fürs Büro, 27 Zoll+ in WQHD/4K für Detailarbeit oder Gaming. Grösser braucht höhere Auflösung."],
      ["Lohnt sich ein gebrauchter Monitor?", "Oft ja — auf Pixelfehler, Backlight und Kratzer prüfen. Geräte mit Restgarantie sind sicherer."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "bohrmaschine-kaufen-schweiz", icon: "🔩", h1: "Bohrmaschine kaufen in der Schweiz",
    title: "Bohrmaschine kaufen Schweiz — Akku & Schlagbohrer | aban",
    desc: "Bohrmaschine kaufen in der Schweiz: Akkuschrauber, Schlagbohrer und Bohrhämmer nach Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bohrmaschine", ctaLabel: "Bohrmaschinen ansehen",
    intro: "Akkuschrauber für Möbel, Schlagbohrer für Mauerwerk: Hier vergleichst du nach Leistung, Akku-System und Preis.",
    tips: [
      ["Akku-System bedenken", "Bleib möglichst bei einem Akku-System — so teilst du Akkus über mehrere Geräte und sparst."],
      ["Schlag/Bohrhammer für Stein", "Für Beton/Mauerwerk braucht es Schlagfunktion oder einen Bohrhammer; für Holz/Metall reicht ein Akkuschrauber."],
      ["Gebraucht: Akku prüfen", "Bei Akkugeräten zählt der Akkuzustand am meisten. Ersatzakkus sind teuer — danach fragen."],
    ],
    faq: [
      ["Akkuschrauber oder Schlagbohrer?", "Akkuschrauber für Schrauben/Holz, Schlagbohrer/Bohrhammer für Beton und Mauerwerk. Viele Sets decken beides ab."],
      ["Worauf achten?", "Drehmoment, Akku-Spannung/-System und mitgeliefertes Zubehör. Markensysteme bieten mehr Erweiterungen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Sets vergleichen."],
    ],
  },
  {
    slug: "naehmaschine-kaufen-schweiz", icon: "🧵", h1: "Nähmaschine kaufen in der Schweiz",
    title: "Nähmaschine kaufen Schweiz — Einsteiger & mehr | aban",
    desc: "Nähmaschine kaufen in der Schweiz: mechanische und computergesteuerte Modelle nach Funktion und Preis vergleichen.",
    cta: "/angebote-suche.html?q=N%C3%A4hmaschine", ctaLabel: "Nähmaschinen ansehen",
    intro: "Für Einsteiger oder Fortgeschrittene: Hier vergleichst du Nähmaschinen nach Funktionen, Stichen und Preis — neu oder gebraucht.",
    tips: [
      ["Einsteiger einfach halten", "Für den Start reichen wenige Stichprogramme und ein robustes Gerät. Zu viele Funktionen überfordern eher."],
      ["Mechanisch vs. Computer", "Mechanische Maschinen sind robust und günstig, computergesteuerte bieten mehr Stiche und Komfort."],
      ["Gebraucht testen", "Wenn möglich Probe nähen. Auf gleichmässigen Transport und saubere Stiche achten."],
    ],
    faq: [
      ["Welche Nähmaschine für Anfänger?", "Ein solides mechanisches Modell mit Geradstich, Zickzack und Knopflochautomatik reicht für den Einstieg gut aus."],
      ["Lohnt sich gebraucht?", "Ja — gepflegte Markenmaschinen halten lange. Kurz Probe nähen und auf saubere Stiche achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "trockner-kaufen-schweiz", icon: "🌀", h1: "Wäschetrockner kaufen in der Schweiz",
    title: "Wäschetrockner kaufen Schweiz — Wärmepumpe & mehr | aban",
    desc: "Wäschetrockner kaufen in der Schweiz: Wärmepumpen- und Kondenstrockner nach Energieklasse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=W%C3%A4schetrockner", ctaLabel: "Trockner ansehen",
    intro: "Wärmepumpe oder Kondens: Hier vergleichst du Wäschetrockner nach Energieklasse, Fassungsvermögen und Preis.",
    tips: [
      ["Wärmepumpe spart Strom", "Wärmepumpentrockner kosten mehr, verbrauchen aber deutlich weniger Strom — über die Jahre günstiger."],
      ["Fassung passend wählen", "Auf den Haushalt abstimmen; idealerweise zur Waschmaschine passend, damit eine Ladung in einem Gang trocknet."],
      ["Aufstellort prüfen", "Masse und Stromanschluss checken. Manche Geräte lassen sich auf die Waschmaschine stapeln (Zwischenrahmen)."],
    ],
    faq: [
      ["Wärmepumpen- oder Kondenstrockner?", "Wärmepumpentrockner sind sparsamer (laufende Kosten), Kondenstrockner günstiger in der Anschaffung. Für häufiges Trocknen lohnt die Wärmepumpe."],
      ["Lohnt sich gebraucht?", "Bei jüngeren, sparsamen Geräten ja. Alte Kondenstrockner ziehen viel Strom."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Geräte im Inserate-Bereich."],
    ],
  },
  {
    slug: "rasenmaeher-kaufen-schweiz", icon: "🌱", h1: "Rasenmäher kaufen in der Schweiz",
    title: "Rasenmäher kaufen Schweiz — Akku, Benzin & Roboter | aban",
    desc: "Rasenmäher kaufen in der Schweiz: Akku-, Benzin- und Mähroboter nach Rasengrösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Rasenm%C3%A4her", ctaLabel: "Rasenmäher ansehen",
    intro: "Akku, Benzin oder Mähroboter: Hier vergleichst du Rasenmäher nach Rasengrösse, Komfort und Preis.",
    tips: [
      ["Nach Rasengrösse wählen", "Akku für kleine bis mittlere Flächen, Benzin für grosse, Mähroboter für regelmässige Pflege ohne Aufwand."],
      ["Akku-System teilen", "Bei Akkugeräten lohnt das gleiche System wie bei anderen Gartengeräten — Akkus sind teuer."],
      ["Gebraucht prüfen", "Messer, Antrieb und (bei Benzin) Starten/Abgas checken. Bei Robotern Akku und Begrenzungskabel."],
    ],
    faq: [
      ["Akku, Benzin oder Mähroboter?", "Akku ist leise und wartungsarm (kleine/mittlere Flächen), Benzin stark (grosse Flächen), Mähroboter erledigt es selbstständig."],
      ["Lohnt sich gebraucht?", "Ja, wenn Messer und Antrieb gut sind. Bei Benzin auf einfaches Starten achten, bei Akku auf den Akkuzustand."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "hochdruckreiniger-kaufen-schweiz", icon: "💦", h1: "Hochdruckreiniger kaufen in der Schweiz",
    title: "Hochdruckreiniger kaufen Schweiz — vergleichen & sparen | aban",
    desc: "Hochdruckreiniger kaufen in der Schweiz: Geräte nach Druck, Leistung und Preis vergleichen — für Terrasse, Auto & Fassade.",
    cta: "/angebote-suche.html?q=Hochdruckreiniger", ctaLabel: "Hochdruckreiniger ansehen",
    intro: "Für Terrasse, Auto oder Fassade: Hier vergleichst du Hochdruckreiniger nach Druck, Leistung und Preis.",
    tips: [
      ["Druck zum Einsatz", "Fürs Auto reicht moderater Druck, für Steinplatten/Fassade darf es mehr sein. Zu viel Druck kann Oberflächen schädigen."],
      ["Zubehör mitdenken", "Flächenreiniger, Schaumdüse und Verlängerung machen die Arbeit leichter — prüfe, was dabei ist."],
      ["Gebraucht: Pumpe & Schlauch", "Auf Dichtheit von Pumpe und Schlauch achten; Düsen sind Verschleissteile."],
    ],
    faq: [
      ["Wie viel Druck brauche ich?", "Für Auto/Velo reicht ein mittleres Gerät; für Terrasse, Steinplatten und Fassade lohnt mehr Druck und ein Flächenreiniger."],
      ["Lohnt sich gebraucht?", "Ja, wenn Pumpe und Schlauch dicht sind. Düsen und Dichtungen lassen sich günstig ersetzen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "spielzeug-kaufen-schweiz", icon: "🧸", h1: "Spielzeug kaufen in der Schweiz",
    title: "Spielzeug kaufen Schweiz — neu & gebraucht | aban",
    desc: "Spielzeug kaufen in der Schweiz: Lego, Brettspiele, Holzspielzeug und mehr nach Alter, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Spielzeug", ctaLabel: "Spielzeug ansehen",
    intro: "Vom Lego-Set bis zum Brettspiel: Hier vergleichst du Spielzeug nach Alter, Preis und Zustand — neu oder gut erhalten gebraucht.",
    tips: [
      ["Aufs Alter achten", "Altersangabe und Kleinteile beachten — gerade bei Kleinkindern wichtig."],
      ["Gebraucht spart viel", "Spielzeug wird oft kaum genutzt. Gereinigte, vollständige Sets sind günstig und nachhaltig."],
      ["Vollständigkeit prüfen", "Bei Sets (Lego, Puzzles) nachfragen, ob alle Teile dabei sind."],
    ],
    faq: [
      ["Lohnt sich gebrauchtes Spielzeug?", "Sehr oft — Kinder wachsen schnell aus Spielzeug heraus. Auf Sauberkeit, Vollständigkeit und Altersfreigabe achten."],
      ["Worauf bei der Sicherheit achten?", "Altersfreigabe, keine verschluckbaren Kleinteile bei Kleinkindern und robuste Verarbeitung."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal zum Abholen im Inserate-Bereich (Spielzeug/Baby & Kind)."],
    ],
  },
  {
    slug: "haustierbedarf-kaufen-schweiz", icon: "🐾", h1: "Haustierbedarf kaufen in der Schweiz",
    title: "Haustierbedarf kaufen Schweiz — Zubehör für Hund, Katze & Co | aban",
    desc: "Haustierbedarf kaufen in der Schweiz: Zubehör, Transportboxen, Kratzbäume und mehr nach Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Haustier", ctaLabel: "Haustierbedarf ansehen",
    intro: "Von der Transportbox bis zum Kratzbaum: Hier vergleichst du Haustierbedarf nach Preis und Zustand — neu oder gepflegt gebraucht.",
    tips: [
      ["Grösse zum Tier", "Box, Körbchen und Geschirr passend zur Tiergrösse wählen — lieber vorher Masse prüfen."],
      ["Hygiene bei gebraucht", "Gebrauchtes Zubehör gründlich reinigen lassen; bei Textilem auf guten Zustand achten."],
      ["Verschleiss bedenken", "Kratzbäume und Spielzeug nutzen sich ab — gut erhaltene Markenware hält länger."],
    ],
    faq: [
      ["Lohnt sich gebrauchter Haustierbedarf?", "Bei stabilen Dingen wie Transportboxen, Gehegen oder Kratzbäumen ja — gereinigt und in gutem Zustand."],
      ["Worauf achten?", "Passende Grösse, Sauberkeit und Vollständigkeit. Bei Elektrischem (z. B. Trinkbrunnen) Funktion prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Haustier)."],
    ],
  },
  {
    slug: "skiausruestung-kaufen-schweiz", icon: "🎿", h1: "Skiausrüstung kaufen in der Schweiz",
    title: "Skiausrüstung kaufen Schweiz — Ski, Schuhe & mehr | aban",
    desc: "Skiausrüstung kaufen in der Schweiz: Ski, Skischuhe, Stöcke und Helme nach Grösse, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Ski", ctaLabel: "Skiausrüstung ansehen",
    intro: "Ski, Schuhe, Stöcke und Helm: Hier vergleichst du Skiausrüstung nach Grösse, Preis und Zustand — rechtzeitig vor der Saison.",
    tips: [
      ["Länge & Schuhgrösse", "Skilänge nach Körpergrösse/Können, Skischuhe nach Mondopoint. Vor dem Kauf die richtigen Masse kennen."],
      ["Bindung einstellen lassen", "Gebrauchte Ski: Bindung vom Fachgeschäft prüfen/einstellen lassen — Sicherheit zuerst."],
      ["Helm besser neu", "Helme nach einem Sturz tauschen; bei gebraucht Vorsicht. Lieber neu oder garantiert sturzfrei."],
    ],
    faq: [
      ["Lohnt sich gebrauchte Skiausrüstung?", "Ja, gerade für Wachstumsphasen bei Kindern. Bindung prüfen lassen; Helme eher neu kaufen."],
      ["Welche Skilänge passt?", "Grob: zwischen Kinn und Scheitel, abhängig von Können und Skityp. Im Zweifel kürzer für mehr Kontrolle."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "wanderschuhe-kaufen-schweiz", icon: "🥾", h1: "Wanderschuhe kaufen in der Schweiz",
    title: "Wanderschuhe kaufen Schweiz — richtig wählen | aban",
    desc: "Wanderschuhe kaufen in der Schweiz: Modelle nach Einsatz, Passform und Preis vergleichen — für Wanderung und Bergtour.",
    cta: "/angebote-suche.html?q=Wanderschuhe", ctaLabel: "Wanderschuhe ansehen",
    intro: "Für die Tageswanderung oder die Bergtour: Hier vergleichst du Wanderschuhe nach Einsatz, Passform und Preis.",
    tips: [
      ["Einsatz bestimmt Schuh", "Leichte Modelle für Wege, knöchelhohe robuste Schuhe für alpines Gelände. Wähle nach deinen Touren."],
      ["Passform geht vor", "Wanderschuhe müssen sitzen — am besten nachmittags anprobieren (Füsse sind dann grösser)."],
      ["Gebraucht: Sohle prüfen", "Profil und Dämpfung abgenutzt? Bei stark getragenen Schuhen lieber neu für sicheren Halt."],
    ],
    faq: [
      ["Welche Wanderschuhe brauche ich?", "Für einfache Wege leichte Schuhe, für Bergtouren knöchelhohe, stabile Modelle mit gutem Profil und Stütze."],
      ["Lohnt sich gebraucht?", "Nur bei wenig getragenen Schuhen mit intaktem Profil und Dämpfung. Sonst lieber neu — die Füsse danken es."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Grösse filtern."],
    ],
  },
  {
    slug: "kinderfahrrad-kaufen-schweiz", icon: "🚲", h1: "Kinderfahrrad kaufen in der Schweiz",
    title: "Kinderfahrrad kaufen Schweiz — passende Grösse finden | aban",
    desc: "Kinderfahrrad kaufen in der Schweiz: Räder nach Zollgrösse, Alter und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Kinderfahrrad", ctaLabel: "Kinderfahrräder ansehen",
    intro: "Vom Laufrad bis zum 24-Zöller: Hier vergleichst du Kinderfahrräder nach Grösse, Alter und Preis — neu oder gut erhalten gebraucht.",
    tips: [
      ["Grösse nach Innenbeinlänge", "Nicht nach Alter, sondern nach Körper-/Innenbeinlänge wählen. Das Kind soll sicher stehen können."],
      ["Gewicht zählt", "Leichte Räder sind leichter zu fahren und zu kontrollieren — gerade für kleine Kinder wichtig."],
      ["Gebraucht prüfen", "Bremsen, Kette und Reifen checken. Kinderräder werden oft kaum genutzt und sind gebraucht top."],
    ],
    faq: [
      ["Welche Zollgrösse passt?", "Grob nach Alter: 12\" ab ~3, 16\" ab ~4–5, 20\" ab ~6, 24\" ab ~8 — entscheidend ist aber die Innenbeinlänge."],
      ["Lohnt sich gebraucht?", "Ja — Kinder wachsen schnell, Räder sind oft fast neu. Bremsen und Kette kurz prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich."],
    ],
  },
  {
    slug: "smartwatch-kaufen-schweiz", icon: "⌚", h1: "Smartwatch kaufen in der Schweiz",
    title: "Smartwatch kaufen Schweiz — Fitness & Smart vergleichen | aban",
    desc: "Smartwatch kaufen in der Schweiz: Modelle nach Funktion, Akkulaufzeit und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Smartwatch", ctaLabel: "Smartwatches ansehen",
    intro: "Fitness-Tracker oder volle Smartwatch: Hier vergleichst du nach Funktion, Akkulaufzeit und Preis — neu oder gepflegt gebraucht.",
    tips: [
      ["Kompatibilität prüfen", "Manche Uhren laufen nur mit bestimmten Handys gut. Vor dem Kauf checken."],
      ["Akku & Funktionen", "Mehr Funktionen = oft kürzerer Akku. Überlege, was du wirklich brauchst (Fitness, Bezahlen, GPS)."],
      ["Gebraucht: Akku/Display", "Bei gebrauchten Geräten Akkuzustand und Kratzer prüfen; Armbänder sind günstig ersetzbar."],
    ],
    faq: [
      ["Worauf beim Smartwatch-Kauf achten?", "Kompatibilität mit deinem Handy, Akkulaufzeit, gewünschte Funktionen (GPS, Bezahlen, Gesundheit) und Tragekomfort."],
      ["Lohnt sich gebraucht?", "Ja, wenn Akku und Display gut sind. Auf Update-Versorgung des Modells achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "mikrofon-kaufen-schweiz", icon: "🎙️", h1: "Mikrofon kaufen in der Schweiz",
    title: "Mikrofon kaufen Schweiz — Podcast, Streaming & Studio | aban",
    desc: "Mikrofon kaufen in der Schweiz: USB- und XLR-Mikrofone nach Einsatz und Preis vergleichen — für Podcast, Streaming, Studio.",
    cta: "/angebote-suche.html?q=Mikrofon", ctaLabel: "Mikrofone ansehen",
    intro: "Für Podcast, Streaming oder Aufnahme: Hier vergleichst du Mikrofone nach Anschluss (USB/XLR), Einsatz und Preis.",
    tips: [
      ["USB oder XLR", "USB ist einfach (direkt am PC), XLR braucht ein Interface, bietet aber mehr Qualität/Ausbau."],
      ["Raum mitdenken", "Ein Nierenmikrofon plus etwas Dämmung bringt oft mehr als ein teures Mikro im halligen Raum."],
      ["Zubehör prüfen", "Stativ, Popschutz und Spinne machen den Unterschied — schau, was im Angebot dabei ist."],
    ],
    faq: [
      ["USB- oder XLR-Mikrofon?", "USB für einfachen Start (Podcast, Calls), XLR für höhere Qualität und Ausbaufähigkeit (mit Audio-Interface)."],
      ["Lohnt sich gebraucht?", "Ja — Mikrofone altern kaum. Auf Kratzer an der Kapsel und vollständiges Zubehör achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "beamer-kaufen-schweiz", icon: "📽️", h1: "Beamer kaufen in der Schweiz",
    title: "Beamer kaufen Schweiz — Heimkino & Präsentation | aban",
    desc: "Beamer kaufen in der Schweiz: Projektoren nach Helligkeit, Auflösung und Preis vergleichen — für Heimkino und Büro.",
    cta: "/angebote-suche.html?q=Beamer", ctaLabel: "Beamer ansehen",
    intro: "Fürs Heimkino oder die Präsentation: Hier vergleichst du Beamer nach Helligkeit, Auflösung und Preis.",
    tips: [
      ["Helligkeit zum Raum", "Je heller der Raum, desto mehr Lumen nötig. Fürs abgedunkelte Heimkino reicht weniger."],
      ["Auflösung wählen", "Full-HD reicht meist; 4K lohnt bei grosser Leinwand und kurzem Abstand."],
      ["Lampe/Laser bedenken", "Lampen sind Verschleissteile (Stunden prüfen). Laser-Beamer halten länger, kosten aber mehr."],
    ],
    faq: [
      ["Wie viele Lumen brauche ich?", "Im dunklen Raum reichen ~2000 Lumen, bei Restlicht eher 3000+. Fürs Büro/helle Räume mehr einplanen."],
      ["Lohnt sich gebraucht?", "Ja, wenn die Lampenstunden niedrig sind. Bild auf Flecken/Pixelfehler prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Auflösung filtern."],
    ],
  },
  {
    slug: "fitnessgeraete-kaufen-schweiz", icon: "🏋️", h1: "Fitnessgeräte kaufen in der Schweiz",
    title: "Fitnessgeräte kaufen Schweiz — Hanteln, Laufband & mehr | aban",
    desc: "Fitnessgeräte kaufen in der Schweiz: Hanteln, Laufband, Ergometer und Kraftstationen nach Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Fitnessger%C3%A4t", ctaLabel: "Fitnessgeräte ansehen",
    intro: "Hanteln, Laufband oder Ergometer fürs Heimtraining: Hier vergleichst du Fitnessgeräte nach Preis und Zustand — neu oder gebraucht.",
    tips: [
      ["Platz & Gewicht", "Grossgeräte brauchen Raum und sind schwer. Vorher Stellplatz und Transport klären (oft Abholung)."],
      ["Gebraucht lohnt sich", "Heimgeräte verstauben oft — gebraucht gibt's Markenqualität günstig. Funktion und Verschleiss prüfen."],
      ["Realistisch kaufen", "Kauf, was du wirklich nutzt. Verstellbare Kurzhanteln sind vielseitig und platzsparend."],
    ],
    faq: [
      ["Lohnt sich gebraucht?", "Sehr oft — viele Heimgeräte werden kaum genutzt. Bei Elektrischem (Laufband/Ergometer) Funktion und Laufruhe testen."],
      ["Was fürs Heimtraining?", "Verstellbare Hanteln und eine Matte decken viel ab; Laufband/Ergometer für Ausdauer. Kauf nach deinem Ziel."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Grossgeräte zum Abholen im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "gitarre-kaufen-schweiz", icon: "🎸", h1: "Gitarre kaufen in der Schweiz",
    title: "Gitarre kaufen Schweiz — Akustik & E-Gitarre | aban",
    desc: "Gitarre kaufen in der Schweiz: Akustik-, Konzert- und E-Gitarren nach Einsatz, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Gitarre", ctaLabel: "Gitarren ansehen",
    intro: "Akustik, Konzert oder E-Gitarre: Hier vergleichst du Gitarren nach Einsatz, Preis und Zustand — neu oder gut erhalten gebraucht.",
    tips: [
      ["Einsteiger: Komplettset", "Für den Start lohnt ein Set mit Tasche, Stimmgerät und (bei E-Gitarre) Verstärker."],
      ["Bespielbarkeit prüfen", "Saitenlage und Halszustand entscheiden über den Spielspass. Wenn möglich anspielen."],
      ["Gebraucht: Hals & Bünde", "Auf geraden Hals, intakte Bünde und keine Risse achten. Markeninstrumente halten den Wert."],
    ],
    faq: [
      ["Welche Gitarre für Anfänger?", "Konzert-/Akustikgitarre für den klassischen Einstieg, E-Gitarre für Rock/Pop (braucht Verstärker). Ein Komplettset erleichtert den Start."],
      ["Lohnt sich gebraucht?", "Ja — Gitarren altern gut. Auf geraden Hals, Saitenlage und intakte Bünde achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Musik & Instrumente)."],
    ],
  },
  {
    slug: "sofa-kaufen-schweiz", icon: "🛋️", h1: "Sofa kaufen in der Schweiz",
    title: "Sofa kaufen Schweiz — Couch neu & gebraucht | aban",
    desc: "Sofa kaufen in der Schweiz: Couch, Ecksofa und Schlafsofa nach Grösse, Material und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Sofa", ctaLabel: "Sofas ansehen",
    intro: "Couch, Ecksofa oder Schlafsofa: Hier vergleichst du Sofas nach Grösse, Material und Preis — neu oder gepflegt gebraucht.",
    tips: [
      ["Masse zuerst", "Sofa, Türen, Lift und Treppenhaus ausmessen — sonst passt das Lieblingsstück nicht rein."],
      ["Bezug nach Alltag", "Mit Kindern/Tieren robuste, abwischbare Bezüge wählen. Abnehmbare Bezüge sind praktisch."],
      ["Gebraucht spart viel", "Markensofas verlieren schnell an Preis, halten aber lange. Auf Flecken und Polsterzustand achten."],
    ],
    faq: [
      ["Worauf beim Sofakauf achten?", "Masse (auch Transportweg), Sitzkomfort, Bezugsmaterial und Polsterqualität. Bei gebraucht zusätzlich Zustand und Geruch."],
      ["Lohnt sich ein gebrauchtes Sofa?", "Oft ja — gepflegte Qualitätssofas sind günstig. Auf stabile Polster und saubere Bezüge achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Sofas zum Abholen im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "bett-kaufen-schweiz", icon: "🛏️", h1: "Bett kaufen in der Schweiz",
    title: "Bett kaufen Schweiz — Bettgestell & Boxspring | aban",
    desc: "Bett kaufen in der Schweiz: Bettgestelle, Boxspring- und Stauraumbetten nach Grösse, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Bett", ctaLabel: "Betten ansehen",
    intro: "Gestell, Boxspring oder Bett mit Stauraum: Hier vergleichst du Betten nach Grösse, Preis und Zustand — neu oder gebraucht.",
    tips: [
      ["Grösse passend zur Matratze", "Schweizer Masse beachten (z. B. 90×200, 160×200). Bettgestell und Matratze müssen zusammenpassen."],
      ["Stauraum nutzen", "Betten mit Schubladen/Hochklapprahmen schaffen Platz — ideal in kleinen Wohnungen."],
      ["Gebraucht prüfen", "Lattenrost, Verbindungen und Stabilität checken. Markenbetten sind gebraucht oft top in Schuss."],
    ],
    faq: [
      ["Welche Bettgrösse in der Schweiz?", "Gängig sind 90×200 (Einzel) und 160×200/180×200 (Doppel). Miss den Raum und passe Matratze + Gestell aufeinander ab."],
      ["Lohnt sich gebraucht?", "Bei stabilen Gestellen ja. Matratzen aus Hygienegründen eher neu kaufen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "teppich-kaufen-schweiz", icon: "🧶", h1: "Teppich kaufen in der Schweiz",
    title: "Teppich kaufen Schweiz — Grössen & Stile vergleichen | aban",
    desc: "Teppich kaufen in der Schweiz: Wohn-, Kurzflor- und Läuferteppiche nach Grösse, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Teppich", ctaLabel: "Teppiche ansehen",
    intro: "Wohnzimmer-Teppich, Läufer oder Kurzflor: Hier vergleichst du nach Grösse, Material und Preis — neu oder gut erhalten gebraucht.",
    tips: [
      ["Grösse zum Raum", "Lieber etwas grösser: Möbel sollten mit den Vorderbeinen auf dem Teppich stehen — das wirkt stimmiger."],
      ["Material nach Nutzung", "Kurzflor ist pflegeleicht (Flur, Esszimmer), Hochflor gemütlich (Schlafzimmer). Mit Tieren robust wählen."],
      ["Gebraucht: Sauberkeit", "Gereinigte, fleckenfreie Teppiche sind günstig. Auf Geruch und abgenutzte Stellen achten."],
    ],
    faq: [
      ["Welche Teppichgrösse passt?", "Orientiere dich an der Möbelgruppe: der Teppich sollte unter die Sitzgruppe reichen. Lieber etwas grösser als zu klein."],
      ["Lohnt sich gebraucht?", "Ja, bei gereinigten, gepflegten Stücken. Auf Flecken, Geruch und Abnutzung achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Wohnen & Deko)."],
    ],
  },
  {
    slug: "kindersitz-kaufen-schweiz", icon: "🪑", h1: "Auto-Kindersitz kaufen in der Schweiz",
    title: "Kindersitz kaufen Schweiz — Autositze sicher wählen | aban",
    desc: "Auto-Kindersitz kaufen in der Schweiz: Sitze nach Gewicht/Grösse, Norm und Preis vergleichen — Sicherheit zuerst.",
    cta: "/angebote-suche.html?q=Kindersitz", ctaLabel: "Kindersitze ansehen",
    intro: "Vom Babyschalen-Sitz bis zur Sitzerhöhung: Hier vergleichst du Auto-Kindersitze nach Grösse, Norm und Preis — Sicherheit vor Preis.",
    tips: [
      ["Norm & Grösse prüfen", "Auf aktuelle Zulassung (i-Size/ECE) und passende Grösse/Gewicht achten. Isofix erleichtert die sichere Montage."],
      ["Gebraucht mit Vorsicht", "Nur von vertrauenswürdiger Quelle und garantiert unfallfrei — nach einem Unfall ist ein Sitz unsicher."],
      ["Einbau testen", "Vor dem Kauf prüfen, ob der Sitz in dein Auto passt und sich fest einbauen lässt."],
    ],
    faq: [
      ["Worauf beim Kindersitz achten?", "Aktuelle Norm (i-Size/ECE R129), passende Grösse/Gewicht, Isofix und ob er in dein Auto passt. Sicherheit geht vor Preis."],
      ["Darf man Kindersitze gebraucht kaufen?", "Nur garantiert unfallfrei und mit gültiger Norm. Nach einem Unfall sind unsichtbare Schäden möglich — dann besser neu."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Baby & Kind)."],
    ],
  },
  {
    slug: "babyphone-kaufen-schweiz", icon: "📡", h1: "Babyphone kaufen in der Schweiz",
    title: "Babyphone kaufen Schweiz — Audio & Video vergleichen | aban",
    desc: "Babyphone kaufen in der Schweiz: Audio- und Video-Babyphones nach Reichweite, Funktion und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Babyphone", ctaLabel: "Babyphones ansehen",
    intro: "Reines Audio oder mit Kamera: Hier vergleichst du Babyphones nach Reichweite, Funktionen und Preis — neu oder gepflegt gebraucht.",
    tips: [
      ["Audio oder Video", "Audio reicht oft; ein Video-Babyphone gibt mehr Sicherheit. Achte auf Reichweite und Akkulaufzeit."],
      ["Strahlung/ECO-Modus", "Geräte mit ECO-/Stand-by-Modus senden nur bei Geräusch — angenehm fürs Schlafzimmer."],
      ["Gebraucht: Akku & Bild", "Akku und (bei Video) Bildqualität prüfen; Vollständigkeit der Teile checken."],
    ],
    faq: [
      ["Audio- oder Video-Babyphone?", "Audio ist günstig und reicht oft; Video gibt zusätzliche Sicherheit. Wichtig sind Reichweite, Akku und ein ECO-Modus."],
      ["Lohnt sich gebraucht?", "Ja, wenn Akku und (bei Video) Kamera gut sind. Auf Vollständigkeit und Funktion achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "aquarium-kaufen-schweiz", icon: "🐠", h1: "Aquarium kaufen in der Schweiz",
    title: "Aquarium kaufen Schweiz — Becken & Sets vergleichen | aban",
    desc: "Aquarium kaufen in der Schweiz: Becken, Komplettsets und Zubehör nach Grösse, Preis und Zustand vergleichen.",
    cta: "/angebote-suche.html?q=Aquarium", ctaLabel: "Aquarien ansehen",
    intro: "Nano-Becken oder grosses Aquarium mit Set: Hier vergleichst du nach Grösse, Ausstattung und Preis — neu oder gebraucht.",
    tips: [
      ["Grösse für Einsteiger", "Grössere Becken sind stabiler im Wasserhaushalt als Nano-Aquarien — paradoxerweise oft einfacher."],
      ["Set spart Geld", "Komplettsets (Filter, Beleuchtung, Heizer) sind meist günstiger als Einzelkauf. Prüfe, was dabei ist."],
      ["Gebraucht: Dichtheit", "Becken auf Dichtheit/Risse prüfen, Technik (Filter, Heizer) testen. Standsicheren Unterschrank mitdenken."],
    ],
    faq: [
      ["Welche Aquariumgrösse für den Start?", "Etwas grösser (ab ~54 l) ist für Einsteiger oft einfacher, weil das Wasser stabiler bleibt. Komplettsets erleichtern den Start."],
      ["Lohnt sich gebraucht?", "Ja — Becken und Technik werden oft günstig abgegeben. Auf Dichtheit und funktionierende Technik achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Haustier)."],
    ],
  },
  {
    slug: "werkbank-kaufen-schweiz", icon: "🪚", h1: "Werkbank kaufen in der Schweiz",
    title: "Werkbank kaufen Schweiz — Hobby & Werkstatt | aban",
    desc: "Werkbank kaufen in der Schweiz: Werkbänke und Werkstattwagen nach Grösse, Stabilität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Werkbank", ctaLabel: "Werkbänke ansehen",
    intro: "Für Keller, Garage oder Werkstatt: Hier vergleichst du Werkbänke nach Grösse, Stabilität und Preis — neu oder gebraucht.",
    tips: [
      ["Stabilität zählt", "Eine schwere, kippsichere Bank macht jede Arbeit leichter. Achte auf Tragkraft und solide Platte."],
      ["Stauraum mitdenken", "Schubladen/Lochwand halten Werkzeug griffbereit. Werkstattwagen sind flexibel."],
      ["Gebraucht prüfen", "Auf Stabilität, ebene Platte und funktionierende Schubladen achten — gebraucht oft sehr günstig."],
    ],
    faq: [
      ["Worauf bei der Werkbank achten?", "Stabilität/Tragkraft, Arbeitshöhe, robuste Platte und Stauraum. Für mobiles Arbeiten ein Werkstattwagen."],
      ["Lohnt sich gebraucht?", "Ja — robuste Bänke halten ewig. Auf ebene Platte und feste Verbindungen achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Werkzeug)."],
    ],
  },
  {
    slug: "heizluefter-kaufen-schweiz", icon: "🔥", h1: "Heizlüfter kaufen in der Schweiz",
    title: "Heizlüfter kaufen Schweiz — Heizung für Räume | aban",
    desc: "Heizlüfter kaufen in der Schweiz: Heizlüfter, Keramik- und Ölradiatoren nach Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Heizl%C3%BCfter", ctaLabel: "Heizlüfter ansehen",
    intro: "Schnelle Zusatzwärme für Bad, Büro oder Übergangszeit: Hier vergleichst du Heizgeräte nach Leistung, Sicherheit und Preis.",
    tips: [
      ["Leistung zum Raum", "Faustregel grob 60–100 Watt pro m². Heizlüfter wärmen schnell, Ölradiatoren halten die Wärme länger."],
      ["Sicherheit prüfen", "Kippschutz und Überhitzungsschutz sind wichtig — gerade im Bad/Kinderzimmer."],
      ["Stromkosten bedenken", "Elektrische Heizgeräte sind als Dauerheizung teuer. Ideal als kurzfristige Zusatzwärme."],
    ],
    faq: [
      ["Heizlüfter oder Ölradiator?", "Heizlüfter wärmen sehr schnell (kurze Nutzung), Ölradiatoren gleichmässiger und länger (Wohnräume). Beides nur als Zusatzheizung sinnvoll."],
      ["Worauf bei der Sicherheit achten?", "Kippschutz, Überhitzungsschutz und für Feuchträume geeignete Geräte. Nie unbeaufsichtigt dauerlaufen lassen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Leistung filtern."],
    ],
  },
  {
    slug: "trottinett-kaufen-schweiz", icon: "🛴", h1: "Trottinett kaufen in der Schweiz",
    title: "Trottinett kaufen Schweiz — Kinder & Erwachsene | aban",
    desc: "Trottinett kaufen in der Schweiz: Tretroller für Kinder und Erwachsene nach Grösse, Stabilität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Trottinett", ctaLabel: "Trottinetts ansehen",
    intro: "Für den Schulweg, Pendeln oder Spass: Hier vergleichst du Trottinetts (Tretroller) nach Grösse, Stabilität und Preis.",
    tips: [
      ["Grösse & Gewicht", "Lenkerhöhe und Tragkraft passend wählen — fürs Kind anders als für Erwachsene/Pendler."],
      ["Räder zum Untergrund", "Grössere Räder rollen besser über Unebenheiten; kleine sind kompakter."],
      ["Gebraucht: Bremse & Klappung", "Bremse, Klappmechanismus und Lager prüfen. Markenroller halten den Wert."],
    ],
    faq: [
      ["Welches Trottinett ist das richtige?", "Für Kinder leicht und niedrig, für Pendler stabil mit grösseren Rädern und guter Bremse. Klappbar spart Platz."],
      ["Lohnt sich gebraucht?", "Ja, wenn Bremse, Lager und Klappmechanik gut sind. Trottinetts werden oft kaum genutzt."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich."],
    ],
  },
  {
    slug: "actioncam-kaufen-schweiz", icon: "📸", h1: "Action-Kamera kaufen in der Schweiz",
    title: "Action-Kamera kaufen Schweiz — robust filmen | aban",
    desc: "Action-Kamera kaufen in der Schweiz: robuste Kameras für Sport und Outdoor nach Auflösung, Stabilisierung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Action-Kamera", ctaLabel: "Action-Kameras ansehen",
    intro: "Für Velo, Wasser oder Wintersport: Hier vergleichst du Action-Kameras nach Auflösung, Bildstabilisierung und Preis — neu oder gebraucht.",
    tips: [
      ["Stabilisierung wichtig", "Gute Bildstabilisierung macht den Unterschied bei Action-Aufnahmen. Auf diese Funktion achten."],
      ["Zubehör/Halterungen", "Halterungen, Gehäuse und Ersatzakkus erweitern den Einsatz — prüfe, was dabei ist."],
      ["Gebraucht: Sensor & Akku", "Linse/Sensor auf Kratzer prüfen, Akkuzustand checken. Gehäuse auf Dichtheit (Wasser) achten."],
    ],
    faq: [
      ["Worauf bei der Action-Kamera achten?", "Auflösung/Bildrate, vor allem aber die Bildstabilisierung, Wasserfestigkeit und verfügbares Zubehör (Halterungen)."],
      ["Lohnt sich gebraucht?", "Ja, wenn Linse, Akku und Dichtungen gut sind. Auf vollständiges Montagezubehör achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "airfryer-kaufen-schweiz", icon: "🍟", h1: "Heissluftfritteuse kaufen in der Schweiz",
    title: "Airfryer kaufen Schweiz — Heissluftfritteuse vergleichen | aban",
    desc: "Heissluftfritteuse (Airfryer) kaufen in der Schweiz: Geräte nach Grösse, Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Heissluftfritteuse", ctaLabel: "Airfryer ansehen",
    intro: "Knusprig mit wenig Öl: Hier vergleichst du Heissluftfritteusen nach Korbgrösse, Leistung und Preis — neu oder gebraucht.",
    tips: [
      ["Grösse zum Haushalt", "Single 2–4 l, Familie 5–7 l oder Doppelkorb. Zu klein nervt, zu gross braucht Platz."],
      ["Reinigung bedenken", "Spülmaschinenfeste, beschichtete Körbe sparen Aufwand. Auf gute Beschichtung achten."],
      ["Leistung & Lautstärke", "Mehr Watt = schneller heiss. Lautstärke variiert — bei offener Küche relevant."],
    ],
    faq: [
      ["Welche Grösse Airfryer brauche ich?", "Für 1–2 Personen 2–4 Liter, für Familien 5–7 Liter oder ein Doppelkorb-Gerät. Wähle nach Portionen und Stellplatz."],
      ["Lohnt sich gebraucht?", "Ja, wenn der Korb sauber und die Beschichtung intakt ist. Funktion kurz testen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "mikrowelle-kaufen-schweiz", icon: "🍲", h1: "Mikrowelle kaufen in der Schweiz",
    title: "Mikrowelle kaufen Schweiz — Solo, Grill & Kombi | aban",
    desc: "Mikrowelle kaufen in der Schweiz: Solo-, Grill- und Kombigeräte nach Grösse, Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Mikrowelle", ctaLabel: "Mikrowellen ansehen",
    intro: "Nur erwärmen oder auch grillen/backen: Hier vergleichst du Mikrowellen nach Typ, Grösse und Preis — neu oder gebraucht.",
    tips: [
      ["Typ wählen", "Solo zum Erwärmen, Grill für Knusprig, Kombi (mit Heissluft) ersetzt fast einen Backofen."],
      ["Innenraum & Platz", "Garraum (Liter) und Stellfläche prüfen — soll der Drehteller deine Teller fassen?"],
      ["Gebraucht: Tür & Dichtung", "Türverschluss und Dichtung müssen intakt sein (Sicherheit). Funktion testen."],
    ],
    faq: [
      ["Solo, Grill oder Kombi?", "Solo fürs Aufwärmen, Grill für überbackene Gerichte, Kombi (mit Heissluft) als platzsparender Allrounder."],
      ["Lohnt sich gebraucht?", "Bei intakter Tür/Dichtung und Funktion ja. Sehr alte Geräte eher meiden."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Küche)."],
    ],
  },
  {
    slug: "saugroboter-kaufen-schweiz", icon: "🤖", h1: "Saugroboter kaufen in der Schweiz",
    title: "Saugroboter kaufen Schweiz — mit Wischen & App | aban",
    desc: "Saugroboter kaufen in der Schweiz: Modelle nach Saugkraft, Navigation, Wischfunktion und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Saugroboter", ctaLabel: "Saugroboter ansehen",
    intro: "Täglich saubere Böden ohne Aufwand: Hier vergleichst du Saugroboter nach Saugkraft, Navigation und Preis — neu oder gebraucht.",
    tips: [
      ["Navigation zählt", "Laser-/Kamera-Navigation reinigt systematischer als Zufallsmodelle. Für mehrere Räume sinnvoll."],
      ["Wischen dazu?", "Kombigeräte saugen und wischen. Prüfe Wassertank und ob es zu deinen Böden passt."],
      ["Folgekosten/Ersatzteile", "Bürsten, Filter und (bei Station) Beutel sind Verschleiss. Verfügbarkeit checken."],
    ],
    faq: [
      ["Worauf beim Saugroboter achten?", "Saugkraft, intelligente Navigation, Akkulaufzeit, optional Wischfunktion und verfügbare Ersatzteile (Bürsten/Filter)."],
      ["Lohnt sich gebraucht?", "Ja, wenn Akku und Bürsten gut sind. App-Anbindung und Ersatzteilversorgung des Modells prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "raclette-kaufen-schweiz", icon: "🧀", h1: "Raclette-Ofen kaufen in der Schweiz",
    title: "Raclette kaufen Schweiz — Raclette-Öfen & Grills | aban",
    desc: "Raclette-Ofen kaufen in der Schweiz: Tisch-Raclettes und Kombigeräte nach Personenzahl, Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Raclette", ctaLabel: "Raclette-Öfen ansehen",
    intro: "Der Klassiker für gemütliche Abende: Hier vergleichst du Raclette-Öfen nach Personenzahl, Ausstattung und Preis.",
    tips: [
      ["Personenzahl wählen", "Pfännchenzahl passend zur Runde. Für grosse Gruppen Geräte mit 8 Pfännchen oder mehr."],
      ["Grillplatte dazu?", "Modelle mit Grill-/Steinplatte oben sind vielseitiger (Fleisch, Gemüse)."],
      ["Gebraucht: Heizung & Pfännchen", "Heizelement testen, Pfännchen-Vollständigkeit prüfen — oft günstig gebraucht."],
    ],
    faq: [
      ["Wie viele Pfännchen brauche ich?", "Eines pro Person plus Reserve. Für 4 Personen ein 6–8-Pfännchen-Gerät, damit gleichzeitig nachgeschmolzen werden kann."],
      ["Lohnt sich gebraucht?", "Ja — Raclette-Öfen werden selten genutzt und sind gebraucht günstig. Heizung und Pfännchen prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Küche)."],
    ],
  },
  {
    slug: "snowboard-kaufen-schweiz", icon: "🏂", h1: "Snowboard kaufen in der Schweiz",
    title: "Snowboard kaufen Schweiz — Board, Bindung & Boots | aban",
    desc: "Snowboard kaufen in der Schweiz: Boards, Bindungen und Boots nach Grösse, Fahrstil und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Snowboard", ctaLabel: "Snowboards ansehen",
    intro: "Allmountain, Freestyle oder Einsteiger: Hier vergleichst du Snowboards, Bindungen und Boots nach Grösse, Stil und Preis.",
    tips: [
      ["Länge & Fahrstil", "Boardlänge nach Körpergrösse/Gewicht und Stil. Einsteiger fahren etwas kürzer für mehr Kontrolle."],
      ["Boots zuerst", "Gut sitzende Boots sind wichtiger als das Board. Passform vor Optik."],
      ["Gebraucht prüfen", "Belag, Kanten und Bindung checken. Gebrauchte Sets sind günstig, gerade für den Einstieg."],
    ],
    faq: [
      ["Welche Snowboard-Länge passt?", "Grob bis etwa Kinnhöhe, abhängig von Gewicht und Stil. Einsteiger und Freestyler wählen kürzer, Allmountain etwas länger."],
      ["Lohnt sich gebraucht?", "Ja — gerade für den Einstieg. Belag, Kanten und Bindung prüfen; Boots am besten passend wählen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "pool-kaufen-schweiz", icon: "🏊", h1: "Pool kaufen in der Schweiz",
    title: "Pool kaufen Schweiz — Garten- & Aufstellpool | aban",
    desc: "Pool kaufen in der Schweiz: Aufstell-, Frame- und Planschbecken nach Grösse, Ausstattung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Pool", ctaLabel: "Pools ansehen",
    intro: "Erfrischung im eigenen Garten: Hier vergleichst du Pools (Aufstell-, Frame-, Planschbecken) nach Grösse, Ausstattung und Preis.",
    tips: [
      ["Platz & Untergrund", "Ebene, tragfähige Fläche nötig. Grösse und Höhe vorher abstecken — ein voller Pool ist sehr schwer."],
      ["Pumpe & Pflege", "Filterpumpe, Abdeckung und Wasserpflege gehören dazu. Prüfe, was im Set enthalten ist."],
      ["Gebraucht: Dichtheit", "Folie/Frame auf Löcher und Roststellen prüfen. Pumpe testen."],
    ],
    faq: [
      ["Welcher Pool für den Garten?", "Planschbecken für Kinder, Aufstellpool/Frame-Pool für Erwachsene. Grösse nach Platz und gewünschtem Schwimmkomfort."],
      ["Was gehört zur Pflege?", "Filterpumpe, regelmässige Wasserpflege und eine Abdeckung. Das hält das Wasser klar und spart Arbeit."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "trampolin-kaufen-schweiz", icon: "🤸", h1: "Trampolin kaufen in der Schweiz",
    title: "Trampolin kaufen Schweiz — Garten-Trampolin sicher | aban",
    desc: "Trampolin kaufen in der Schweiz: Garten-Trampoline nach Grösse, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Trampolin", ctaLabel: "Trampoline ansehen",
    intro: "Spass und Bewegung im Garten: Hier vergleichst du Trampoline nach Grösse, Sicherheitsnetz und Preis — neu oder gebraucht.",
    tips: [
      ["Sicherheitsnetz wichtig", "Ein gutes, innenliegendes Netz und gepolsterte Federn sind Pflicht — gerade für Kinder."],
      ["Grösse & Platz", "Rundherum Freiraum einplanen. Grössere Trampoline brauchen mehr Garten und Verankerung gegen Wind."],
      ["Gebraucht prüfen", "Sprungtuch, Federn, Netz und Rost am Rahmen checken. Verschleissteile sind ersetzbar."],
    ],
    faq: [
      ["Welche Trampolin-Grösse?", "Nach verfügbarem Garten und Nutzern: kleinere für Kleinkinder, grössere (ab ~3 m) für mehrere/ältere Kinder. Freiraum ringsum einplanen."],
      ["Worauf bei der Sicherheit achten?", "Stabiles Sicherheitsnetz, gepolsterte Federabdeckung und eine Verankerung gegen Wind."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten/Sport)."],
    ],
  },
  {
    slug: "hochbeet-kaufen-schweiz", icon: "🌿", h1: "Hochbeet kaufen in der Schweiz",
    title: "Hochbeet kaufen Schweiz — Garten & Balkon | aban",
    desc: "Hochbeet kaufen in der Schweiz: Hochbeete aus Holz, Metall und für den Balkon nach Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Hochbeet", ctaLabel: "Hochbeete ansehen",
    intro: "Rückenschonend gärtnern auf Garten oder Balkon: Hier vergleichst du Hochbeete nach Material, Grösse und Preis.",
    tips: [
      ["Material wählen", "Holz wirkt natürlich (braucht Schutz), Metall ist langlebig. Für Balkon leichte, kleinere Modelle."],
      ["Höhe & Standort", "Rückenfreundliche Höhe wählen und sonnigen Standort einplanen. Bewässerung mitdenken."],
      ["Gebraucht ok", "Stabile Hochbeete halten lange. Auf Fäulnis (Holz) oder Rost achten."],
    ],
    faq: [
      ["Welches Hochbeet ist das richtige?", "Für den Garten grössere Holz-/Metallbeete, für den Balkon kompakte, leichte Modelle. Auf rückenfreundliche Höhe achten."],
      ["Lohnt sich gebraucht?", "Ja, wenn das Material intakt ist (kein Faulholz/Rost). Hochbeete sind robust und oft günstig zu haben."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "pavillon-kaufen-schweiz", icon: "⛱️", h1: "Pavillon kaufen in der Schweiz",
    title: "Pavillon kaufen Schweiz — Garten-Pavillon & Pergola | aban",
    desc: "Pavillon kaufen in der Schweiz: Garten-Pavillons und Pergolen nach Grösse, Stabilität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Pavillon", ctaLabel: "Pavillons ansehen",
    intro: "Schatten und Wetterschutz im Garten: Hier vergleichst du Pavillons und Pergolen nach Grösse, Stabilität und Preis.",
    tips: [
      ["Stabilität & Wind", "Auf solides Gestell und gute Verankerung achten — günstige Faltpavillons halten Wind oft schlecht stand."],
      ["Faltbar oder fest", "Faltpavillon für flexible Nutzung, fester Pavillon/Pergola für dauerhaften Schatten."],
      ["Gebraucht: Dach & Gestänge", "Dachplane auf Risse und Gestänge auf Rost/Knicke prüfen. Ersatzdächer gibt es oft separat."],
    ],
    faq: [
      ["Faltpavillon oder fester Pavillon?", "Faltpavillon ist flexibel und schnell aufgebaut, ein fester Pavillon/eine Pergola bietet dauerhaften, stabileren Schutz."],
      ["Lohnt sich gebraucht?", "Ja, wenn Gestänge und Dach intakt sind. Auf Rost und Risse achten; Ersatzdächer sind erhältlich."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "dampfreiniger-kaufen-schweiz", icon: "💨", h1: "Dampfreiniger kaufen in der Schweiz",
    title: "Dampfreiniger kaufen Schweiz — Boden & Polster | aban",
    desc: "Dampfreiniger kaufen in der Schweiz: Boden-, Hand- und Multidampfreiniger nach Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Dampfreiniger", ctaLabel: "Dampfreiniger ansehen",
    intro: "Reinigen ohne Chemie mit heissem Dampf: Hier vergleichst du Dampfreiniger (Boden, Hand, Multi) nach Leistung und Preis.",
    tips: [
      ["Typ nach Einsatz", "Bodendampfreiniger für Hartböden, Handgeräte für Fugen/Bad, Multigeräte für vieles."],
      ["Aufheizzeit & Tank", "Kurze Aufheizzeit und ausreichender Wassertank machen die Arbeit angenehmer."],
      ["Gebraucht: Dichtheit", "Auf Dichtheit, funktionierenden Druck und vorhandene Düsen achten."],
    ],
    faq: [
      ["Wofür eignet sich ein Dampfreiniger?", "Für Hartböden, Fugen, Bad, Fenster und teils Polster — chemiefrei mit heissem Dampf. Nicht für empfindliche Oberflächen geeignet."],
      ["Lohnt sich gebraucht?", "Ja, wenn das Gerät dicht ist und Druck aufbaut. Düsen/Aufsätze auf Vollständigkeit prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "esstisch-kaufen-schweiz", icon: "🍽️", h1: "Esstisch kaufen in der Schweiz",
    title: "Esstisch kaufen Schweiz — Tische neu & gebraucht | aban",
    desc: "Esstisch kaufen in der Schweiz: ausziehbare Tische, Massivholz und mehr nach Grösse, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Esstisch", ctaLabel: "Esstische ansehen",
    intro: "Massivholz, ausziehbar oder rund: Hier vergleichst du Esstische nach Grösse, Material und Preis — neu oder gepflegt gebraucht.",
    tips: [
      ["Grösse zum Raum", "Pro Person rund 60 cm Tischkante einplanen. Ausziehbare Tische sind flexibel für Gäste."],
      ["Material wählen", "Massivholz ist langlebig (etwas Pflege), furniert/Platte pflegeleichter. Nach Alltag entscheiden."],
      ["Gebraucht spart", "Massivholztische halten Jahrzehnte — gebraucht oft ein Schnäppchen. Auf Kratzer/Wackeln achten."],
    ],
    faq: [
      ["Wie gross sollte der Esstisch sein?", "Rechne ~60 cm Platz pro Person. Für wechselnde Gästezahl lohnt ein ausziehbarer Tisch."],
      ["Lohnt sich gebraucht?", "Ja — gerade Massivholz. Auf stabile Verbindungen und den Plattenzustand achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "buerostuhl-kaufen-schweiz", icon: "🪑", h1: "Bürostuhl kaufen in der Schweiz",
    title: "Bürostuhl kaufen Schweiz — ergonomisch fürs Homeoffice | aban",
    desc: "Bürostuhl kaufen in der Schweiz: ergonomische Stühle nach Verstellbarkeit, Komfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=B%C3%BCrostuhl", ctaLabel: "Bürostühle ansehen",
    intro: "Stundenlang bequem sitzen im Homeoffice: Hier vergleichst du Bürostühle nach Ergonomie, Verstellbarkeit und Preis.",
    tips: [
      ["Ergonomie zählt", "Verstellbare Sitzhöhe, Lordosenstütze und Armlehnen sind wichtig. Wer lange sitzt, spürt den Unterschied."],
      ["Probesitzen", "Wenn möglich testen — der beste Stuhl ist der, der zu deinem Körper passt."],
      ["Gebraucht: Mechanik", "Gasdruckfeder, Rollen und Polster prüfen. Markenstühle sind gebraucht oft top und günstig."],
    ],
    faq: [
      ["Worauf beim Bürostuhl achten?", "Verstellbare Sitzhöhe, Rückenlehne mit Lordosenstütze, Armlehnen und eine gute Mechanik (Synchronmechanik). Probesitzen lohnt sich."],
      ["Lohnt sich gebraucht?", "Ja — hochwertige Bürostühle halten lange. Gasfeder, Rollen und Polster kurz prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "schreibtisch-kaufen-schweiz", icon: "🖥️", h1: "Schreibtisch kaufen in der Schweiz",
    title: "Schreibtisch kaufen Schweiz — höhenverstellbar & klassisch | aband",
    desc: "Schreibtisch kaufen in der Schweiz: höhenverstellbare und klassische Tische nach Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Schreibtisch", ctaLabel: "Schreibtische ansehen",
    intro: "Fürs Homeoffice oder Kinderzimmer: Hier vergleichst du Schreibtische (auch höhenverstellbar) nach Grösse und Preis.",
    tips: [
      ["Höhenverstellbar prüfen", "Sitz-Steh-Tische sind gesünder bei langem Arbeiten. Achte auf Hubbereich und Stabilität."],
      ["Grösse & Kabel", "Genug Platz für Monitor(e) und Tastatur einplanen; Kabeldurchlass/-management ist praktisch."],
      ["Gebraucht ok", "Stabile Tische halten lange. Bei elektrischen Modellen Motor/Steuerung testen."],
    ],
    faq: [
      ["Lohnt sich ein höhenverstellbarer Schreibtisch?", "Bei langem Arbeiten ja — Wechsel zwischen Sitzen und Stehen entlastet den Rücken. Auf Stabilität und Hubbereich achten."],
      ["Lohnt sich gebraucht?", "Ja, gerade bei robusten oder Markentischen. Bei elektrischen Modellen die Motorik testen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "kleiderschrank-kaufen-schweiz", icon: "🚪", h1: "Kleiderschrank kaufen in der Schweiz",
    title: "Kleiderschrank kaufen Schweiz — Schwebetür & mehr | aban",
    desc: "Kleiderschrank kaufen in der Schweiz: Schwebetüren-, Dreh- und Eckschränke nach Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kleiderschrank", ctaLabel: "Kleiderschränke ansehen",
    intro: "Schwebetür, Drehtür oder Eckschrank: Hier vergleichst du Kleiderschränke nach Grösse, Aufteilung und Preis — neu oder gebraucht.",
    tips: [
      ["Masse genau nehmen", "Höhe, Breite, Tiefe und den Transportweg ausmessen. Schwebetüren brauchen weniger Platz davor."],
      ["Innenaufteilung", "Genug Stangen, Tablare und Schubladen für deinen Bedarf? Innenausstattung mitdenken."],
      ["Gebraucht prüfen", "Türlauf, Scharniere und Rückwand checken. Demontage/Transport vorher klären."],
    ],
    faq: [
      ["Schwebetür oder Drehtür?", "Schwebetüren sparen Platz davor (enge Räume), Drehtüren geben vollen Überblick beim Öffnen. Wähle nach Platz."],
      ["Lohnt sich gebraucht?", "Ja, wenn Türlauf und Korpus intakt sind. Transport/Demontage einplanen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "kommode-kaufen-schweiz", icon: "🗄️", h1: "Kommode kaufen in der Schweiz",
    title: "Kommode kaufen Schweiz — Sideboard & Schubladen | aban",
    desc: "Kommode kaufen in der Schweiz: Schubladenkommoden und Sideboards nach Grösse, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kommode", ctaLabel: "Kommoden ansehen",
    intro: "Stauraum fürs Schlaf- oder Wohnzimmer: Hier vergleichst du Kommoden und Sideboards nach Grösse, Material und Preis.",
    tips: [
      ["Stauraum nach Bedarf", "Mehr Schubladen = mehr Ordnung. Überlege, was rein soll, bevor du die Grösse wählst."],
      ["Material & Optik", "Massivholz langlebig, furniert günstiger. Soll sie zu vorhandenen Möbeln passen?"],
      ["Gebraucht: Schubladen", "Schubladenlauf und Stabilität prüfen — gepflegte Kommoden sind gebraucht günstig."],
    ],
    faq: [
      ["Worauf bei der Kommode achten?", "Genug Schubladen/Stauraum, passende Masse und solide Verarbeitung. Bei gebraucht den Schubladenlauf prüfen."],
      ["Lohnt sich gebraucht?", "Ja — robuste Kommoden halten lange und sind gebraucht günstig. Auf Stabilität achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "lautsprecher-kaufen-schweiz", icon: "🔊", h1: "Lautsprecher kaufen in der Schweiz",
    title: "Lautsprecher kaufen Schweiz — Bluetooth & HiFi | aban",
    desc: "Lautsprecher kaufen in der Schweiz: Bluetooth-Boxen, Regal- und HiFi-Lautsprecher nach Klang und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Lautsprecher", ctaLabel: "Lautsprecher ansehen",
    intro: "Mobile Bluetooth-Box oder HiFi fürs Wohnzimmer: Hier vergleichst du Lautsprecher nach Einsatz, Klang und Preis.",
    tips: [
      ["Einsatz klären", "Mobil/outdoor = Bluetooth mit Akku, zuhause = Regal-/Standlautsprecher oder Multiroom."],
      ["Akku & Schutz", "Für draussen auf Akkulaufzeit und Wasserschutz (IP) achten."],
      ["Gebraucht testen", "Kurz anhören (Kratzen/Verzerren?), Anschlüsse und Akku prüfen."],
    ],
    faq: [
      ["Bluetooth-Box oder HiFi?", "Bluetooth-Boxen sind mobil und einfach, HiFi-/Regallautsprecher bieten besseren Klang zuhause. Wähle nach Einsatz."],
      ["Lohnt sich gebraucht?", "Ja — Lautsprecher altern kaum. Auf saubere Wiedergabe und (bei mobil) den Akku achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "gefriertruhe-kaufen-schweiz", icon: "🧊", h1: "Gefriertruhe kaufen in der Schweiz",
    title: "Gefriertruhe kaufen Schweiz — Truhe & Schrank | aban",
    desc: "Gefriertruhe kaufen in der Schweiz: Tiefkühltruhen und -schränke nach Volumen, Energieklasse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gefriertruhe", ctaLabel: "Gefriertruhen ansehen",
    intro: "Mehr Vorrat einfrieren: Hier vergleichst du Gefriertruhen und -schränke nach Volumen, Energieklasse und Preis.",
    tips: [
      ["Volumen passend", "Nach Haushalt und Vorratsmenge wählen. Truhen fassen viel, Schränke sind übersichtlicher."],
      ["Energieklasse", "Das Gerät läuft dauernd — eine sparsame Klasse senkt die Stromkosten deutlich."],
      ["Standort prüfen", "Aufstellort (Keller/Garage) und Klimaklasse beachten, damit das Gerät zuverlässig friert."],
    ],
    faq: [
      ["Truhe oder Gefrierschrank?", "Truhen bieten viel Volumen pro Franken und halten Kälte gut, Schränke sind übersichtlicher und brauchen weniger Stellfläche."],
      ["Lohnt sich gebraucht?", "Bei jüngeren, sparsamen Geräten ja. Alte Truhen ziehen viel Strom — das relativiert den Preis."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich."],
    ],
  },
  {
    slug: "velohelm-kaufen-schweiz", icon: "🪖", h1: "Velohelm kaufen in der Schweiz",
    title: "Velohelm kaufen Schweiz — sicher fürs Velo & E-Bike | aban",
    desc: "Velohelm kaufen in der Schweiz: Helme nach Grösse, Norm und Preis vergleichen — Sicherheit fürs Velo und E-Bike.",
    cta: "/angebote-suche.html?q=Velohelm", ctaLabel: "Velohelme ansehen",
    intro: "Sicher unterwegs auf Velo und E-Bike: Hier vergleichst du Velohelme nach Passform, Norm und Preis. Helme am besten neu kaufen.",
    tips: [
      ["Passform geht vor", "Kopfumfang messen und probieren. Ein Helm schützt nur, wenn er richtig sitzt."],
      ["Norm prüfen", "Auf gültige Sicherheitsnorm (z. B. EN 1078) achten; für schnelle E-Bikes ggf. spezielle Helme."],
      ["Neu statt gebraucht", "Helme nach Sturz oder bei Alter ersetzen. Gebraucht ist hier riskant — lieber neu."],
    ],
    faq: [
      ["Welche Helmgrösse passt?", "Kopfumfang (cm) messen und zur Herstellergrösse passen. Der Helm soll fest, aber bequem sitzen, ohne zu wackeln."],
      ["Soll ich einen Velohelm gebraucht kaufen?", "Besser nicht — nach Stürzen können unsichtbare Schäden bestehen. Bei Sicherheit lohnt sich Neuware."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Grösse filtern."],
    ],
  },
  {
    slug: "hochstuhl-kaufen-schweiz", icon: "🍼", h1: "Hochstuhl kaufen in der Schweiz",
    title: "Hochstuhl kaufen Schweiz — Kinderhochstühle vergleichen | aban",
    desc: "Hochstuhl kaufen in der Schweiz: mitwachsende und klappbare Kinderhochstühle nach Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Hochstuhl", ctaLabel: "Hochstühle ansehen",
    intro: "Sicher mit am Tisch: Hier vergleichst du Kinderhochstühle (mitwachsend, klappbar) nach Sicherheit, Komfort und Preis.",
    tips: [
      ["Sicherheit zuerst", "Gurt, Kippsicherheit und stabiler Stand sind Pflicht. Auf gültige Norm achten."],
      ["Mitwachsend spart", "Mitwachsende Stühle nutzt man jahrelang — oft günstiger als mehrere Stühle."],
      ["Gebraucht: Reinigung & Gurt", "Gut reinigbar und mit intaktem Gurt? Markenstühle sind gebraucht oft top."],
    ],
    faq: [
      ["Worauf beim Hochstuhl achten?", "Sicherer Gurt, Kippsicherheit, stabiler Stand und leichte Reinigung. Mitwachsende Modelle sind besonders langlebig."],
      ["Lohnt sich gebraucht?", "Ja — Hochstühle werden oft nur kurz genutzt. Auf intakten Gurt, Sauberkeit und Stabilität achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Baby & Kind)."],
    ],
  },
  {
    slug: "kettensaege-kaufen-schweiz", icon: "🪚", h1: "Kettensäge kaufen in der Schweiz",
    title: "Kettensäge kaufen Schweiz — Akku, Elektro & Benzin | aban",
    desc: "Kettensäge kaufen in der Schweiz: Akku-, Elektro- und Benzin-Kettensägen nach Leistung, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kettens%C3%A4ge", ctaLabel: "Kettensägen ansehen",
    intro: "Für Brennholz und Gartenarbeit: Hier vergleichst du Kettensägen (Akku, Elektro, Benzin) nach Leistung, Schwertlänge und Preis.",
    tips: [
      ["Antrieb nach Einsatz", "Akku/Elektro für Garten und kleinere Arbeiten, Benzin für viel Holz und ohne Steckdose."],
      ["Schwertlänge wählen", "Länger = dickere Stämme, aber schwerer/gefährlicher. Für Anfänger eher kürzer."],
      ["Schutzausrüstung", "Schnittschutzhose, Helm mit Visier und Handschuhe gehören dazu — Sicherheit zuerst."],
    ],
    faq: [
      ["Akku, Elektro oder Benzin?", "Akku/Elektro für leichte Gartenarbeit (leise, wartungsarm), Benzin für grosse Mengen Holz und netzunabhängiges Arbeiten."],
      ["Lohnt sich gebraucht?", "Bei gepflegten Geräten ja. Kette, Schwert und (bei Benzin) Starten/Kompression prüfen. Schutzausrüstung nie sparen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Werkzeug/Garten)."],
    ],
  },
  {
    slug: "koffer-kaufen-schweiz", icon: "🧳", h1: "Koffer kaufen in der Schweiz",
    title: "Koffer kaufen Schweiz — Reisekoffer & Trolleys | aban",
    desc: "Koffer kaufen in der Schweiz: Hartschalen-, Weichschalen- und Handgepäck-Koffer nach Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Koffer", ctaLabel: "Koffer ansehen",
    intro: "Hartschale, Weichschale oder Handgepäck: Hier vergleichst du Reisekoffer nach Grösse, Gewicht und Preis.",
    tips: [
      ["Grösse zum Reisezweck", "Handgepäck für Kurztrips (Kabinenmasse prüfen!), grosse Koffer für längere Reisen."],
      ["Gewicht zählt", "Leichte Koffer lassen mehr Zuladung bis zum Limit. Achte auf das Eigengewicht."],
      ["Rollen & Schloss", "Vier Rollen sind wendiger, ein TSA-Schloss praktisch für USA-Reisen."],
    ],
    faq: [
      ["Hartschale oder Weichschale?", "Hartschalen schützen besser und sind wasserabweisend, Weichschalen sind flexibler und haben Aussenfächer. Wähle nach Reiseart."],
      ["Welche Handgepäck-Grösse?", "Richte dich nach den Kabinenmassen deiner Airline (oft ~55×40×20 cm). Lieber knapp drunter bleiben."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis und Grösse filtern."],
    ],
  },
  {
    slug: "winterreifen-kaufen-schweiz", icon: "🛞", h1: "Winterreifen kaufen in der Schweiz",
    title: "Winterreifen kaufen Schweiz — Reifen & Felgen | aban",
    desc: "Winterreifen kaufen in der Schweiz: Reifen und Kompletträder nach Grösse, Profil und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Winterreifen", ctaLabel: "Winterreifen ansehen",
    intro: "Sicher durch den Winter: Hier vergleichst du Winterreifen und Kompletträder nach Grösse, Zustand und Preis.",
    tips: [
      ["Grösse exakt prüfen", "Reifengrösse (z. B. 205/55 R16) muss zum Fahrzeug passen — steht in den Papieren/auf dem Reifen."],
      ["Profil & Alter", "Mindestens 4 mm Profil für Winter empfohlen; auf das Herstellungsdatum (DOT) achten."],
      ["Komplettrad spart Montage", "Reifen auf Felge montiert spart den saisonalen Umzug beim Garagisten."],
    ],
    faq: [
      ["Welche Reifengrösse brauche ich?", "Die im Fahrzeugausweis/auf der Reifenflanke angegebene Grösse (z. B. 205/55 R16 91H). Nur freigegebene Grössen verwenden."],
      ["Lohnen sich gebrauchte Winterreifen?", "Nur mit genug Profil (≥4 mm) und nicht zu alt (DOT prüfen). Risse oder einseitige Abnutzung = Finger weg."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Auto & Teile)."],
    ],
  },
  {
    slug: "dachbox-kaufen-schweiz", icon: "🚙", h1: "Dachbox kaufen in der Schweiz",
    title: "Dachbox kaufen Schweiz — Auto-Dachboxen vergleichen | aban",
    desc: "Dachbox kaufen in der Schweiz: Auto-Dachboxen nach Volumen, Befestigung und Preis vergleichen — für Ferien & Ski.",
    cta: "/angebote-suche.html?q=Dachbox", ctaLabel: "Dachboxen ansehen",
    intro: "Mehr Platz für Ferien und Ski: Hier vergleichst du Auto-Dachboxen nach Volumen, Befestigung und Preis.",
    tips: [
      ["Volumen & Länge", "Für Skier eine lange Box wählen. Volumen (Liter) nach Gepäckmenge — und Dachlast des Autos beachten."],
      ["Passt der Träger?", "Die Box braucht passende Dachträger. Befestigungssystem (Schnellspanner) erleichtert die Montage."],
      ["Gebraucht: Schloss & Schale", "Schloss, Scharniere und Schale auf Risse prüfen. Markenboxen halten lange."],
    ],
    faq: [
      ["Welche Dachbox-Grösse?", "Nach Gepäckmenge und ob Skier rein sollen (dann lang). Immer die maximale Dachlast des Autos einhalten."],
      ["Lohnt sich gebraucht?", "Ja, wenn Schale und Schloss intakt sind. Passende Dachträger nicht vergessen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Auto & Teile)."],
    ],
  },
  {
    slug: "sonnenschirm-kaufen-schweiz", icon: "⛱️", h1: "Sonnenschirm kaufen in der Schweiz",
    title: "Sonnenschirm kaufen Schweiz — Ampel- & Marktschirme | aban",
    desc: "Sonnenschirm kaufen in der Schweiz: Ampel-, Markt- und Balkonschirme nach Grösse, UV-Schutz und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sonnenschirm", ctaLabel: "Sonnenschirme ansehen",
    intro: "Schatten für Terrasse und Balkon: Hier vergleichst du Sonnenschirme (Ampel, Markt, Balkon) nach Grösse, UV-Schutz und Preis.",
    tips: [
      ["Typ & Standfuss", "Ampelschirme sind flexibel (Tisch frei), brauchen aber einen schweren Fuss/Platten. Den Standfuss mitrechnen."],
      ["UV-Schutz prüfen", "Achte auf UV-Standard und dichtes Gewebe — schützt wirklich vor der Sonne."],
      ["Windsicherheit", "Bei Wind schliessen. Ein stabiler Fuss und Kurbelmechanik erleichtern die Nutzung."],
    ],
    faq: [
      ["Ampelschirm oder Marktschirm?", "Ampelschirme lassen den Tisch frei und sind flexibel ausrichtbar (brauchen schweren Fuss), Marktschirme sind günstiger und stabil mittig."],
      ["Lohnt sich gebraucht?", "Ja, wenn Gestänge und Bezug intakt sind. Auf Rost und Risse achten; Standfuss separat prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "gartenliege-kaufen-schweiz", icon: "🌞", h1: "Gartenliege kaufen in der Schweiz",
    title: "Gartenliege kaufen Schweiz — Sonnenliegen & Relaxsessel | aban",
    desc: "Gartenliege kaufen in der Schweiz: Sonnenliegen, Relaxsessel und Hängematten nach Material, Komfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gartenliege", ctaLabel: "Gartenliegen ansehen",
    intro: "Entspannen im Garten: Hier vergleichst du Gartenliegen, Relaxsessel und Hängematten nach Material, Komfort und Preis.",
    tips: [
      ["Material nach Pflege", "Aluminium rostfrei, Holz warm (Pflege), Textilene pflegeleicht. Nach Aufwand wählen."],
      ["Verstellbar & klappbar", "Mehrfach verstellbare Rückenlehnen und klappbare Modelle sind praktisch zum Verstauen."],
      ["Gebraucht: Bespannung", "Auf Bespannung, Gelenke und Rost achten. Gepflegte Liegen sind gebraucht günstig."],
    ],
    faq: [
      ["Welche Gartenliege ist die richtige?", "Nach Komfort (verstellbar), Material (Pflegeaufwand) und Stauraum (klappbar). Für Schatten zusätzlich ein Sonnenschirm."],
      ["Lohnt sich gebraucht?", "Ja, bei intakter Bespannung und Gelenken. Auf Rost und Risse achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "laubblaeser-kaufen-schweiz", icon: "🍂", h1: "Laubbläser kaufen in der Schweiz",
    title: "Laubbläser kaufen Schweiz — Akku, Elektro & Benzin | aban",
    desc: "Laubbläser kaufen in der Schweiz: Akku-, Elektro- und Benzin-Laubbläser nach Leistung, Lautstärke und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Laubbl%C3%A4ser", ctaLabel: "Laubbläser ansehen",
    intro: "Laub schnell weg: Hier vergleichst du Laubbläser (Akku, Elektro, Benzin) nach Leistung, Lautstärke und Preis.",
    tips: [
      ["Antrieb nach Fläche", "Akku/Elektro für kleine Gärten (leise, leicht), Benzin für grosse Flächen und netzunabhängig."],
      ["Saugfunktion?", "Geräte mit Saug-/Häckselfunktion sammeln das Laub gleich ein."],
      ["Lautstärke & Regeln", "Auf dB achten und lokale Ruhezeiten beachten. Akkugeräte sind meist leiser."],
    ],
    faq: [
      ["Akku, Elektro oder Benzin?", "Akku/Elektro für kleine bis mittlere Gärten (leise, wartungsarm), Benzin für grosse Flächen und ohne Steckdose."],
      ["Lohnt sich gebraucht?", "Bei gepflegten Geräten ja; bei Akku den Akkuzustand prüfen, bei Benzin das Starten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "rasentrimmer-kaufen-schweiz", icon: "🌾", h1: "Rasentrimmer kaufen in der Schweiz",
    title: "Rasentrimmer kaufen Schweiz — Akku & Motorsense | aban",
    desc: "Rasentrimmer kaufen in der Schweiz: Akku-Trimmer und Motorsensen nach Leistung, Schnittbreite und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Rasentrimmer", ctaLabel: "Rasentrimmer ansehen",
    intro: "Für Kanten und hohes Gras: Hier vergleichst du Rasentrimmer und Motorsensen nach Leistung, Schnittbreite und Preis.",
    tips: [
      ["Faden oder Messer", "Fadentrimmer für Kanten/feines Gras, Messer/Motorsense für hohes, zähes Gras."],
      ["Akku-System teilen", "Bei Akkugeräten beim gleichen System bleiben — Akkus über mehrere Gartengeräte nutzen."],
      ["Gewicht & Tragegurt", "Bei längerer Arbeit zählt das Gewicht; ein Tragegurt entlastet."],
    ],
    faq: [
      ["Rasentrimmer oder Motorsense?", "Fadentrimmer für Kanten und feines Gras, Motorsense (mit Messer) für hohes, dichtes Gras und grössere Flächen."],
      ["Lohnt sich gebraucht?", "Bei gepflegten Geräten ja. Bei Akku den Akku prüfen, bei Benzin das Starten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten/Werkzeug)."],
    ],
  },
  {
    slug: "whirlpool-kaufen-schweiz", icon: "🛁", h1: "Whirlpool kaufen in der Schweiz",
    title: "Whirlpool kaufen Schweiz — aufblasbar & fest | aban",
    desc: "Whirlpool kaufen in der Schweiz: aufblasbare und feste Whirlpools nach Grösse, Ausstattung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Whirlpool", ctaLabel: "Whirlpools ansehen",
    intro: "Entspannung im eigenen Garten: Hier vergleichst du Whirlpools (aufblasbar oder fest) nach Grösse, Ausstattung und Preis.",
    tips: [
      ["Aufblasbar vs. fest", "Aufblasbare sind günstig und flexibel, feste komfortabler und langlebiger. Strom-/Wasseranschluss bedenken."],
      ["Folgekosten", "Heizung, Filter und Wasserpflege kosten laufend. In die Rechnung einbeziehen."],
      ["Gebraucht: Dichtheit", "Bei aufblasbaren auf Lecks prüfen, Pumpe/Heizung testen. Stabilen Untergrund einplanen."],
    ],
    faq: [
      ["Aufblasbarer oder fester Whirlpool?", "Aufblasbare sind günstig, schnell aufgebaut und flexibel; feste bieten mehr Komfort und Lebensdauer, brauchen aber Installation."],
      ["Was kostet der Betrieb?", "Vor allem Strom (Heizung) und Wasserpflege. Eine gute Abdeckung senkt die Heizkosten deutlich."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "buegelstation-kaufen-schweiz", icon: "👔", h1: "Bügelstation kaufen in der Schweiz",
    title: "Bügelstation kaufen Schweiz — Dampfstationen vergleichen | aban",
    desc: "Bügelstation kaufen in der Schweiz: Dampfbügelstationen nach Dampfleistung, Tank und Preis vergleichen.",
    cta: "/angebote-suche.html?q=B%C3%BCgelstation", ctaLabel: "Bügelstationen ansehen",
    intro: "Schneller bügeln mit viel Dampf: Hier vergleichst du Dampfbügelstationen nach Dampfleistung, Tankgrösse und Preis.",
    tips: [
      ["Dampf macht's", "Hoher Dampfausstoss und Druck glätten schneller. Für viel Wäsche lohnt eine Station statt Bügeleisen."],
      ["Tank & Kalk", "Grosser/abnehmbarer Tank und einfache Entkalkung erleichtern den Alltag."],
      ["Gebraucht: Kalk & Dichtheit", "Auf Kalk, Dichtheit und gleichmässigen Dampf achten."],
    ],
    faq: [
      ["Bügelstation oder Dampfbügeleisen?", "Stationen bieten mehr Dampf/Druck und grössere Tanks — ideal bei viel Wäsche. Ein Dampfbügeleisen reicht für wenig Bügelgut."],
      ["Lohnt sich gebraucht?", "Ja, wenn entkalkt und dicht. Dampf und Tank kurz prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "standmixer-kaufen-schweiz", icon: "🥤", h1: "Standmixer kaufen in der Schweiz",
    title: "Standmixer kaufen Schweiz — Smoothies & mehr | aban",
    desc: "Standmixer kaufen in der Schweiz: Hochleistungs- und Kompaktmixer nach Leistung, Volumen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Standmixer", ctaLabel: "Standmixer ansehen",
    intro: "Smoothies, Suppen und mehr: Hier vergleichst du Standmixer nach Leistung, Krugvolumen und Preis — neu oder gebraucht.",
    tips: [
      ["Leistung nach Einsatz", "Für Eis/Nüsse braucht es Watt-Power; für Smoothies reicht weniger. Kauf passend."],
      ["Krug & Reinigung", "Spülmaschinenfest oder Selbstreinigungs-Programm spart Aufwand. Glaskrug ist kratzfest."],
      ["Gebraucht: Messer & Motor", "Messer scharf, Motor ruhig? Kurz testen — Markenmixer halten lange."],
    ],
    faq: [
      ["Worauf beim Standmixer achten?", "Motorleistung (für Eis/Nüsse hoch), Krugvolumen und einfache Reinigung. Für reine Smoothies reicht ein Mittelklasse-Gerät."],
      ["Lohnt sich gebraucht?", "Ja, wenn Messer und Motor in Ordnung sind. Kurz laufen lassen und auf Geräusche achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Küche)."],
    ],
  },
  {
    slug: "laufband-kaufen-schweiz", icon: "🏃", h1: "Laufband kaufen in der Schweiz",
    title: "Laufband kaufen Schweiz — fürs Heimtraining vergleichen | aban",
    desc: "Laufband kaufen in der Schweiz: Laufbänder nach Motorleistung, Lauffläche und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Laufband", ctaLabel: "Laufbänder ansehen",
    intro: "Ausdauer trainieren zuhause bei jedem Wetter: Hier vergleichst du Laufbänder nach Motorleistung, Lauffläche und Preis.",
    tips: [
      ["Motor & Lauffläche", "Mehr Dauerleistung (PS) für Läufer, grosse Lauffläche für Komfort. Fürs Gehen reicht weniger."],
      ["Klappbar & Platz", "Klappbare Modelle sparen Raum. Standfläche und Deckenhöhe (beim Laufen) mitdenken."],
      ["Gebraucht: Motor & Band", "Laufruhe, Bandzustand und Dämpfung testen. Schwere Geräte = oft Abholung."],
    ],
    faq: [
      ["Worauf beim Laufband achten?", "Dauer-Motorleistung, Grösse der Lauffläche, Dämpfung und Klappbarkeit. Für Läufer stärker dimensionieren als fürs Gehen."],
      ["Lohnt sich gebraucht?", "Ja — viele Heimlaufbänder werden kaum genutzt. Motor, Band und Dämpfung kurz testen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokale Geräte zum Abholen im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "crosstrainer-kaufen-schweiz", icon: "🚴", h1: "Crosstrainer kaufen in der Schweiz",
    title: "Crosstrainer kaufen Schweiz — Ellipsentrainer vergleichen | aban",
    desc: "Crosstrainer kaufen in der Schweiz: Ellipsentrainer nach Schwungmasse, Bremssystem und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Crosstrainer", ctaLabel: "Crosstrainer ansehen",
    intro: "Gelenkschonendes Ganzkörper-Cardio zuhause: Hier vergleichst du Crosstrainer nach Schwungmasse, Bremse und Preis.",
    tips: [
      ["Schwungmasse zählt", "Höhere Schwungmasse = runderer, ruhigerer Lauf. Wichtiger als reine Wattzahlen."],
      ["Schrittlänge & Stabilität", "Ausreichende Schrittlänge für deine Grösse und ein stabiler Stand machen den Komfort aus."],
      ["Gebraucht: Lauf & Display", "Ruhigen Lauf, Lager und Display prüfen. Geräte sind schwer — Transport klären."],
    ],
    faq: [
      ["Worauf beim Crosstrainer achten?", "Schwungmasse (für ruhigen Lauf), Schrittlänge, Stabilität und Bremssystem. Magnetbremsen sind wartungsarm und leise."],
      ["Lohnt sich gebraucht?", "Ja — oft kaum benutzt. Auf ruhigen, gleichmässigen Lauf achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "e-piano-kaufen-schweiz", icon: "🎹", h1: "E-Piano kaufen in der Schweiz",
    title: "E-Piano kaufen Schweiz — Digitalpiano & Keyboard | aban",
    desc: "E-Piano kaufen in der Schweiz: Digitalpianos und Keyboards nach Tastatur, Klang und Preis vergleichen.",
    cta: "/angebote-suche.html?q=E-Piano", ctaLabel: "E-Pianos ansehen",
    intro: "Zum Lernen oder Spielen ohne Stimmen: Hier vergleichst du Digitalpianos und Keyboards nach Tastatur, Klang und Preis.",
    tips: [
      ["Tastatur entscheidet", "Für klassisches Spielen Hammermechanik mit 88 Tasten. Keyboards sind leichter und günstiger zum Start."],
      ["Klang & Kopfhörer", "Guter Flügelklang und Kopfhöreranschluss (leise üben) sind im Alltag wichtig."],
      ["Gebraucht: Tasten testen", "Alle Tasten/Pedale prüfen. Markeninstrumente halten den Wert gut."],
    ],
    faq: [
      ["Digitalpiano oder Keyboard?", "Digitalpiano (88 gewichtete Tasten, Hammermechanik) fürs klassische Klavierspiel, Keyboard zum günstigen Einstieg und für viele Sounds."],
      ["Lohnt sich gebraucht?", "Ja — Digitalpianos altern kaum. Tasten und Pedale kurz durchspielen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Musik & Instrumente)."],
    ],
  },
  {
    slug: "plattenspieler-kaufen-schweiz", icon: "🎶", h1: "Plattenspieler kaufen in der Schweiz",
    title: "Plattenspieler kaufen Schweiz — Turntables vergleichen | aban",
    desc: "Plattenspieler kaufen in der Schweiz: Turntables nach Antrieb, Tonabnehmer und Preis vergleichen — neu oder gebraucht.",
    cta: "/angebote-suche.html?q=Plattenspieler", ctaLabel: "Plattenspieler ansehen",
    intro: "Vinyl in gutem Klang: Hier vergleichst du Plattenspieler nach Antrieb, Tonabnehmer, Vorverstärker und Preis.",
    tips: [
      ["Phono-Vorverstärker?", "Manche Spieler brauchen einen Phono-Eingang/Vorverstärker. Prüfe, was dein Verstärker/Aktivboxen können."],
      ["Tonabnehmer & Riemen", "Ein guter Tonabnehmer macht viel aus; Riemenantrieb läuft ruhig. Ersatz-Nadeln verfügbar?"],
      ["Gebraucht: Lauf & Nadel", "Gleichlauf, Nadelzustand und Tonarm prüfen. Vintage-Geräte oft günstig, aber Service einplanen."],
    ],
    faq: [
      ["Brauche ich einen Vorverstärker?", "Wenn der Plattenspieler keinen integrierten Phono-Vorverstärker hat und dein Verstärker keinen Phono-Eingang, ja. Viele Einsteigergeräte haben ihn eingebaut."],
      ["Lohnt sich gebraucht?", "Ja, bei gutem Gleichlauf und intaktem Tonarm. Nadel ist ein Verschleissteil und ersetzbar."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "zelt-kaufen-schweiz", icon: "⛺", h1: "Zelt kaufen in der Schweiz",
    title: "Zelt kaufen Schweiz — Camping- & Familienzelte | aban",
    desc: "Zelt kaufen in der Schweiz: Camping-, Familien- und Trekkingzelte nach Personenzahl, Wassersäule und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Zelt", ctaLabel: "Zelte ansehen",
    intro: "Für Festival, Camping oder Trekking: Hier vergleichst du Zelte nach Personenzahl, Wetterschutz und Preis.",
    tips: [
      ["Grösse realistisch", "Die Personenangabe ist oft knapp bemessen — für Komfort eine Person mehr einrechnen."],
      ["Wassersäule & Aufbau", "Höhere Wassersäule = besser bei Regen. Schneller Aufbau (Pop-up/Tunnel) spart Nerven."],
      ["Gebraucht: Stangen & Naht", "Stangen, Reissverschlüsse und Nähte prüfen. Vollständigkeit (Heringe!) checken."],
    ],
    faq: [
      ["Welche Zeltgrösse brauche ich?", "Rechne grosszügig: für Komfort und Gepäck eine Person mehr als angegeben. Für Trekking zählt zusätzlich das Gewicht."],
      ["Lohnt sich gebraucht?", "Ja, bei intakten Stangen, Nähten und Reissverschlüssen. Auf Vollständigkeit (Heringe, Gestänge) achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport/Outdoor)."],
    ],
  },
  {
    slug: "schlafsack-kaufen-schweiz", icon: "🛌", h1: "Schlafsack kaufen in der Schweiz",
    title: "Schlafsack kaufen Schweiz — Komfort & Temperatur | aban",
    desc: "Schlafsack kaufen in der Schweiz: Schlafsäcke nach Temperaturbereich, Form und Preis vergleichen — Camping & Trekking.",
    cta: "/angebote-suche.html?q=Schlafsack", ctaLabel: "Schlafsäcke ansehen",
    intro: "Warm schlafen unterwegs: Hier vergleichst du Schlafsäcke nach Temperaturbereich, Form (Deckel/Mumie) und Preis.",
    tips: [
      ["Temperatur passend", "Komforttemperatur zur erwarteten Nachttemperatur wählen — lieber etwas wärmer als zu kalt."],
      ["Mumie oder Deckenform", "Mumienschlafsäcke wärmen besser und sind leichter (Trekking), Deckenform ist bequemer (Camping)."],
      ["Gebraucht: Hygiene & Füllung", "Auf Sauberkeit und Bauschkraft der Füllung achten. Daune leicht, Kunstfaser pflegeleicht."],
    ],
    faq: [
      ["Welcher Temperaturbereich?", "Orientiere dich an der Komforttemperatur und plane Reserve ein. Für Schweizer Sommernächte in den Bergen kann es kühl werden."],
      ["Daune oder Kunstfaser?", "Daune ist leicht und warm (aber teurer, empfindlich bei Nässe), Kunstfaser günstiger und unempfindlicher."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport/Outdoor)."],
    ],
  },
  {
    slug: "wanderrucksack-kaufen-schweiz", icon: "🎒", h1: "Wanderrucksack kaufen in der Schweiz",
    title: "Wanderrucksack kaufen Schweiz — Tages- & Trekkingrucksack | aban",
    desc: "Wanderrucksack kaufen in der Schweiz: Tages- und Trekkingrucksäcke nach Volumen, Tragekomfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Wanderrucksack", ctaLabel: "Wanderrucksäcke ansehen",
    intro: "Für die Tagestour oder mehrtägige Trekkings: Hier vergleichst du Wanderrucksäcke nach Volumen, Tragesystem und Preis.",
    tips: [
      ["Volumen nach Tour", "Tageswanderung ~20–30 l, mehrtägig 40–60 l+. Lieber passend als zu gross."],
      ["Tragesystem & Rücken", "Verstellbarer, belüfteter Rücken und Hüftgurt entlasten — bei längeren Touren entscheidend."],
      ["Gebraucht: Gurte & RV", "Gurte, Nähte und Reissverschlüsse prüfen. Markenrucksäcke halten sehr lange."],
    ],
    faq: [
      ["Welche Grösse Wanderrucksack?", "Tagestouren ~20–30 Liter, Hütten-/Mehrtagestouren 40–60 Liter. Achte auf einen gut sitzenden Hüftgurt."],
      ["Lohnt sich gebraucht?", "Ja — gute Rucksäcke sind robust. Gurte, Reissverschlüsse und Nähte kurz prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport/Outdoor)."],
    ],
  },
  {
    slug: "sup-kaufen-schweiz", icon: "🏄", h1: "Stand-Up-Paddle (SUP) kaufen in der Schweiz",
    title: "SUP kaufen Schweiz — Stand-Up-Paddle vergleichen | aban",
    desc: "SUP kaufen in der Schweiz: aufblasbare Stand-Up-Paddle-Boards nach Grösse, Tragkraft und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Stand-Up-Paddle", ctaLabel: "SUP-Boards ansehen",
    intro: "Auf Schweizer Seen unterwegs: Hier vergleichst du SUP-Boards (meist aufblasbar) nach Grösse, Tragkraft und Preis.",
    tips: [
      ["Tragkraft & Grösse", "Board zu Körpergewicht passend wählen. Breitere Boards sind kippstabiler (Einsteiger)."],
      ["Set prüfen", "Pumpe, Paddel, Leash und Rucksack sollten dabei sein. Komplettsets sind praktisch."],
      ["Gebraucht: Luft & Naht", "Auf Luftdichtheit, Nähte und Finne achten. Pumpe und Paddel testen."],
    ],
    faq: [
      ["Welches SUP für Einsteiger?", "Ein breiteres, stabiles Allround-Board passend zum Körpergewicht. Aufblasbare Boards sind transport- und lagerfreundlich."],
      ["Lohnt sich gebraucht?", "Ja, wenn das Board dicht ist und Nähte/Finne intakt sind. Set-Vollständigkeit (Pumpe, Paddel, Leash) prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "tischtennisplatte-kaufen-schweiz", icon: "🏓", h1: "Tischtennisplatte kaufen in der Schweiz",
    title: "Tischtennisplatte kaufen Schweiz — Indoor & Outdoor | aban",
    desc: "Tischtennisplatte kaufen in der Schweiz: Indoor- und Outdoor-Platten nach Stärke, Wetterfestigkeit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Tischtennisplatte", ctaLabel: "Tischtennisplatten ansehen",
    intro: "Spass für Garten oder Keller: Hier vergleichst du Tischtennisplatten (Indoor/Outdoor) nach Qualität, Wetterfestigkeit und Preis.",
    tips: [
      ["Indoor oder Outdoor", "Outdoor-Platten sind wetterfest (Garten), Indoor-Platten bieten besseres Spielgefühl (Keller/Halle)."],
      ["Plattenstärke", "Dickere Platten (höhere mm) springen gleichmässiger. Für ambitioniertes Spiel relevant."],
      ["Gebraucht: Rollen & Netz", "Klappmechanik, Rollen und Plattenoberfläche prüfen. Grosse Teile = Abholung."],
    ],
    faq: [
      ["Indoor- oder Outdoor-Platte?", "Für den Garten eine wetterfeste Outdoor-Platte, für drinnen eine Indoor-Platte mit besserem Absprung. Für draussen abdecken/einlagern verlängert die Lebensdauer."],
      ["Lohnt sich gebraucht?", "Ja, wenn die Oberfläche eben und die Klappmechanik intakt ist. Transport (Grösse/Gewicht) einplanen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Sport)."],
    ],
  },
  {
    slug: "spielturm-kaufen-schweiz", icon: "🛝", h1: "Spielturm kaufen in der Schweiz",
    title: "Spielturm kaufen Schweiz — Schaukel & Klettergerüst | aban",
    desc: "Spielturm kaufen in der Schweiz: Spieltürme, Schaukeln und Klettergerüste nach Grösse, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Spielturm", ctaLabel: "Spieltürme ansehen",
    intro: "Abenteuer im eigenen Garten: Hier vergleichst du Spieltürme, Schaukeln und Rutschen nach Grösse, Sicherheit und Preis.",
    tips: [
      ["Sicherheit & Fundament", "Stabiler Stand, sichere Verankerung und genügend Fallschutz (Abstand, Untergrund) sind Pflicht."],
      ["Holz pflegen", "Holztürme brauchen Witterungsschutz. Auf splitterfreies, behandeltes Holz achten."],
      ["Gebraucht prüfen", "Holz auf Fäulnis, Schaukelketten und Verbindungen prüfen. Aufbau/Transport einplanen."],
    ],
    faq: [
      ["Worauf beim Spielturm achten?", "Standsicherheit, gute Verankerung, kindersichere Verbindungen und ausreichend Freiraum/Fallschutz rundherum."],
      ["Lohnt sich gebraucht?", "Ja, wenn das Holz gesund (keine Fäulnis) und alle Teile vorhanden sind. Schaukelketten und Rutsche prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal zum Abholen im Inserate-Bereich (Garten/Baby & Kind)."],
    ],
  },
  {
    slug: "luftreiniger-kaufen-schweiz", icon: "🌬️", h1: "Luftreiniger kaufen in der Schweiz",
    title: "Luftreiniger kaufen Schweiz — HEPA & Allergie | aban",
    desc: "Luftreiniger kaufen in der Schweiz: Geräte mit HEPA-Filter nach Raumgrösse, Lautstärke und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Luftreiniger", ctaLabel: "Luftreiniger ansehen",
    intro: "Gegen Pollen, Staub und Gerüche: Hier vergleichst du Luftreiniger nach Raumgrösse, Filtertyp und Preis.",
    tips: [
      ["HEPA-Filter prüfen", "Ein echter HEPA-Filter fängt Feinstaub und Pollen. Für Allergiker besonders wichtig."],
      ["Raumgrösse beachten", "Die angegebene Raumleistung (m²/CADR) sollte zu deinem Zimmer passen."],
      ["Folgekosten Filter", "Ersatzfilter kosten regelmässig. Verfügbarkeit und Preis vorher prüfen."],
    ],
    faq: [
      ["Worauf beim Luftreiniger achten?", "Echter HEPA-Filter, passende Raumleistung (CADR/m²), Lautstärke und die laufenden Filterkosten."],
      ["Hilft ein Luftreiniger bei Allergien?", "Ein Gerät mit HEPA-Filter kann Pollen und Feinstaub in der Raumluft deutlich reduzieren — passend zur Raumgrösse wählen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "luftentfeuchter-kaufen-schweiz", icon: "💧", h1: "Luftentfeuchter kaufen in der Schweiz",
    title: "Luftentfeuchter kaufen Schweiz — gegen Feuchte & Schimmel | aban",
    desc: "Luftentfeuchter kaufen in der Schweiz: Geräte nach Entzugsleistung, Raumgrösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Luftentfeuchter", ctaLabel: "Luftentfeuchter ansehen",
    intro: "Gegen feuchte Keller und Schimmel: Hier vergleichst du Luftentfeuchter nach Entzugsleistung, Raumgrösse und Preis.",
    tips: [
      ["Leistung zum Raum", "Die Entzugsleistung (Liter/Tag) muss zur Raumgrösse und Feuchte passen — im Keller mehr."],
      ["Tank oder Ablauf", "Grosser Tank oder Dauerablauf-Schlauch spart das ständige Leeren."],
      ["Stromverbrauch", "Geräte laufen oft länger — auf den Verbrauch achten, gerade im Dauerbetrieb."],
    ],
    faq: [
      ["Welche Entzugsleistung brauche ich?", "Nach Raumgrösse und Feuchtegrad: kleine Räume wenige Liter/Tag, feuchte Keller deutlich mehr. Lieber etwas grösser wählen."],
      ["Lohnt sich gebraucht?", "Bei gepflegten Geräten ja. Funktion und (bei Kompressorgeräten) Laufruhe prüfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "regal-kaufen-schweiz", icon: "🗄️", h1: "Regal kaufen in der Schweiz",
    title: "Regal kaufen Schweiz — Bücher-, Wand- & Standregale | aban",
    desc: "Regal kaufen in der Schweiz: Bücher-, Wand- und Standregale nach Grösse, Traglast und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Regal", ctaLabel: "Regale ansehen",
    intro: "Bücher-, Wand- oder Standregal: Hier vergleichst du Regale nach Grösse, Traglast und Preis — neu oder gebraucht.",
    tips: [
      ["Traglast beachten", "Für Bücher/Geschirr stabile Böden mit genug Traglast wählen. Wandregale sicher befestigen."],
      ["Masse & Modul", "Höhe/Breite zum Raum; modulare Systeme lassen sich später erweitern."],
      ["Gebraucht: Stabilität", "Verbindungen und Böden prüfen. Markenregale (z. B. Systemregale) sind gebraucht günstig."],
    ],
    faq: [
      ["Worauf beim Regal achten?", "Traglast der Böden, passende Masse und (bei Wandregalen) sichere Befestigung. Modulare Systeme sind erweiterbar."],
      ["Lohnt sich gebraucht?", "Ja — stabile Regale halten lange. Auf feste Verbindungen und gerade Böden achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal im Inserate-Bereich (Möbel)."],
    ],
  },
  {
    slug: "gartenhaus-kaufen-schweiz", icon: "🏚️", h1: "Gartenhaus kaufen in der Schweiz",
    title: "Gartenhaus kaufen Schweiz — Geräteschuppen & mehr | aban",
    desc: "Gartenhaus kaufen in der Schweiz: Gartenhäuser und Geräteschuppen aus Holz und Metall nach Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gartenhaus", ctaLabel: "Gartenhäuser ansehen",
    intro: "Stauraum oder Rückzugsort im Garten: Hier vergleichst du Gartenhäuser und Geräteschuppen nach Material, Grösse und Preis.",
    tips: [
      ["Bewilligung klären", "Je nach Grösse/Gemeinde ist eine Baubewilligung nötig. Vorab bei der Gemeinde abklären."],
      ["Material & Fundament", "Holz wirkt natürlich (Pflege), Metall pflegeleicht. Ein ebenes Fundament ist Pflicht."],
      ["Gebraucht: Zustand", "Bei gebraucht Holz auf Fäulnis, Dach auf Dichtheit prüfen. Demontage/Transport einplanen."],
    ],
    faq: [
      ["Brauche ich eine Bewilligung?", "Das hängt von Grösse und Gemeinde ab — kleine Geräteschuppen oft nicht, grössere schon. Vorher bei der Gemeinde nachfragen."],
      ["Holz oder Metall?", "Holz ist optisch schön, braucht aber Pflege; Metall ist pflegeleicht und langlebig. Beides braucht ein ebenes Fundament."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern; lokal zum Abholen im Inserate-Bereich (Garten)."],
    ],
  },
  {
    slug: "pfannen-kaufen-schweiz", icon: "🍳", h1: "Pfannen kaufen in der Schweiz",
    title: "Pfannen kaufen Schweiz — Bratpfannen & Sets | aban",
    desc: "Pfannen kaufen in der Schweiz: beschichtete, Edelstahl- und Gusspfannen nach Herdtyp und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bratpfanne", ctaLabel: "Pfannen ansehen",
    intro: "Beschichtet, Edelstahl oder Guss: Hier vergleichst du Bratpfannen und Sets nach Herdtyp, Material und Preis.",
    tips: [
      ["Induktion?", "Bei Induktionsherd auf induktionsgeeignete Pfannen achten (magnetischer Boden)."],
      ["Material nach Einsatz", "Beschichtet für schonendes Braten, Edelstahl/Guss für scharfes Anbraten und Langlebigkeit."],
      ["Set oder einzeln", "Ein gutes Set deckt vieles ab; bei einzelnen Pfannen gezielt nach Grösse wählen."],
    ],
    faq: [
      ["Welche Pfanne für Induktion?", "Pfannen mit magnetischem, induktionsgeeignetem Boden. Steht meist auf der Verpackung oder am Boden."],
      ["Beschichtet oder Edelstahl?", "Beschichtet ist pflegeleicht und braucht wenig Fett, Edelstahl/Guss eignet sich fürs scharfe Anbraten und hält länger."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "toaster-kaufen-schweiz", icon: "🍞", h1: "Toaster kaufen in der Schweiz",
    title: "Toaster kaufen Schweiz — 2- & 4-Schlitz vergleichen | aban",
    desc: "Toaster kaufen in der Schweiz: 2- und 4-Schlitz-Toaster nach Funktion, Bräunung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Toaster", ctaLabel: "Toaster ansehen",
    intro: "Knusprig am Morgen: Hier vergleichst du Toaster (2- oder 4-Schlitz) nach Funktionen, Bräunungsstufen und Preis.",
    tips: [
      ["Schlitze nach Haushalt", "2-Schlitz für Singles/Paare, 4-Schlitz für Familien. Breite Schlitze für dicke Scheiben/Brötchen."],
      ["Funktionen", "Auftau-, Aufwärm- und Brötchenaufsatz sind praktisch. Gleichmässige Bräunung zählt."],
      ["Reinigung", "Herausnehmbare Krümelschublade erleichtert das Sauberhalten."],
    ],
    faq: [
      ["2- oder 4-Schlitz-Toaster?", "2-Schlitz reicht für kleine Haushalte, 4-Schlitz toastet mehr auf einmal — praktisch für Familien."],
      ["Worauf achten?", "Gleichmässige Bräunung, breite Schlitze, nützliche Zusatzfunktionen und eine herausnehmbare Krümelschublade."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "wasserkocher-kaufen-schweiz", icon: "🫖", h1: "Wasserkocher kaufen in der Schweiz",
    title: "Wasserkocher kaufen Schweiz — schnell & sparsam | aban",
    desc: "Wasserkocher kaufen in der Schweiz: Geräte nach Volumen, Temperaturwahl und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Wasserkocher", ctaLabel: "Wasserkocher ansehen",
    intro: "Schnell heisses Wasser: Hier vergleichst du Wasserkocher nach Volumen, Temperaturwahl und Preis.",
    tips: [
      ["Temperaturwahl", "Für Tee/Kaffee ist eine Temperaturwahl praktisch (z. B. 80 °C für grünen Tee)."],
      ["Volumen & Verbrauch", "Grösser ist bequem, kleiner spart Energie bei einzelnen Tassen. Nach Bedarf wählen."],
      ["Material & Kalk", "Glas/Edelstahl wirkt hochwertig; ein Kalkfilter und leichte Reinigung sind im Alltag nützlich."],
    ],
    faq: [
      ["Worauf beim Wasserkocher achten?", "Volumen passend zum Haushalt, optional Temperaturwahl, ein Kalkfilter und leichte Reinigung. Schnelles Aufheizen spart Zeit."],
      ["Glas oder Edelstahl?", "Glas zeigt den Füllstand schön, Edelstahl ist robust. Beide gut — auf Verarbeitung und Kalkfilter achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "vakuumierer-kaufen-schweiz", icon: "🥡", h1: "Vakuumierer kaufen in der Schweiz",
    title: "Vakuumierer kaufen Schweiz — länger frisch & Sous-vide | aban",
    desc: "Vakuumierer kaufen in der Schweiz: Geräte zum Einschweissen nach Leistung, Beutel und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Vakuumierer", ctaLabel: "Vakuumierer ansehen",
    intro: "Lebensmittel länger frisch halten und Sous-vide vorbereiten: Hier vergleichst du Vakuumierer nach Leistung, Beuteln und Preis.",
    tips: [
      ["Beutel-Folgekosten", "Achte auf Verfügbarkeit und Preis der passenden Folien/Beutel — das läuft mit."],
      ["Leistung & Naht", "Starke Pumpe und eine saubere, breite Schweissnaht halten dicht."],
      ["Trocken/feucht", "Manche Geräte können auch feuchte Lebensmittel — praktisch für Fleisch/Fisch."],
    ],
    faq: [
      ["Wofür ist ein Vakuumierer gut?", "Lebensmittel halten vakuumiert länger frisch, Gefrierbrand wird reduziert, und Sous-vide-Garen wird möglich."],
      ["Lohnt sich gebraucht?", "Bei funktionierender Pumpe und sauberer Schweissnaht ja. Folien sind günstig nachkaufbar."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "duvet-kaufen-schweiz", icon: "🛌", h1: "Duvet kaufen in der Schweiz",
    title: "Duvet kaufen Schweiz — Bettdecken nach Wärme & Grösse | aban",
    desc: "Duvet kaufen in der Schweiz: Bettdecken nach Wärmegrad, Füllung und Grösse vergleichen — Daune oder Kunstfaser.",
    cta: "/angebote-suche.html?q=Duvet", ctaLabel: "Duvets ansehen",
    intro: "Warm und passend schlafen: Hier vergleichst du Duvets (Bettdecken) nach Wärmegrad, Füllung und Schweizer Grösse.",
    tips: [
      ["Grösse nach Bett", "Schweizer Masse beachten (z. B. 160×210 Einzel, 200×210 Duo). Zur Bettgrösse passend wählen."],
      ["Füllung wählen", "Daune ist leicht und warm, Kunstfaser pflegeleicht und für Allergiker oft besser (waschbar)."],
      ["Wärmegrad", "Für ganzjährig ein mittlerer Wärmegrad oder ein 4-Jahreszeiten-Duvet zum Kombinieren."],
    ],
    faq: [
      ["Welche Duvet-Grösse in der Schweiz?", "Gängig sind 160×210 (Einzel) und 200×210 (Duo). Wähle passend zur Bettbreite und zum Bezug."],
      ["Daune oder Kunstfaser?", "Daune ist besonders leicht und warm, Kunstfaser pflegeleicht, waschbar und oft allergikerfreundlich."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "heizstrahler-kaufen-schweiz", icon: "🔆", h1: "Heizstrahler kaufen in der Schweiz",
    title: "Heizstrahler kaufen Schweiz — Terrasse & Balkon | aban",
    desc: "Heizstrahler kaufen in der Schweiz: Terrassen-Heizstrahler (Infrarot, Gas) nach Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Heizstrahler", ctaLabel: "Heizstrahler ansehen",
    intro: "Länger draussen sitzen: Hier vergleichst du Terrassen-Heizstrahler (Infrarot oder Gas) nach Leistung, Sicherheit und Preis.",
    tips: [
      ["Infrarot oder Gas", "Infrarot (Strom) wärmt gezielt und ist für Balkone praktisch, Gas wärmt grossflächig (eher Garten/Terrasse)."],
      ["Leistung & Standort", "Auf die Heizleistung und einen sicheren, windgeschützten Standort achten."],
      ["Sicherheit", "Kippschutz und genug Abstand zu Brennbarem. Im Innenbereich nur dafür freigegebene Geräte."],
    ],
    faq: [
      ["Infrarot- oder Gas-Heizstrahler?", "Infrarot (Strom) wärmt sofort und punktuell — gut für Balkon; Gasstrahler wärmen grossflächig — eher für Terrasse/Garten."],
      ["Worauf bei der Sicherheit achten?", "Kippschutz, ausreichender Abstand zu Brennbarem und (bei Gas) gute Belüftung. Nur unbeschädigte Geräte verwenden."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "kaffeevollautomat-kaufen-schweiz", icon: "☕", h1: "Kaffeevollautomat kaufen in der Schweiz",
    title: "Kaffeevollautomat kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Kaffeevollautomat kaufen in der Schweiz: Geräte nach Mahlwerk, Milchsystem, Reinigung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kaffeevollautomat", ctaLabel: "Kaffeevollautomaten ansehen",
    intro: "Frischer Espresso auf Knopfdruck: Hier vergleichst du Kaffeevollautomaten nach Mahlwerk, Milchsystem, Reinigung und Preis.",
    tips: [
      ["Mahlwerk", "Ein Keramik-Mahlwerk läuft leiser und nutzt sich langsamer ab als Stahl. Mahlgrad sollte verstellbar sein."],
      ["Milchsystem", "Für Cappuccino/Latte ein integriertes Milchsystem oder eine Dampfdüse. Abnehmbare Teile lassen sich besser reinigen."],
      ["Reinigung & Entkalkung", "Automatische Spülprogramme und ein herausnehmbares Brühsystem sparen Aufwand und verlängern die Lebensdauer."],
    ],
    faq: [
      ["Worauf beim Kauf achten?", "Auf verstellbaren Mahlgrad, ein einfach zu reinigendes Brühsystem und — falls gewünscht — ein gutes Milchsystem achten."],
      ["Wie wichtig ist die Entkalkung?", "Sehr wichtig: Regelmässiges Entkalken (je nach Wasserhärte) schützt das Gerät. Ein Wasserfilter reduziert den Aufwand."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "espressomaschine-kaufen-schweiz", icon: "☕", h1: "Espressomaschine kaufen in der Schweiz",
    title: "Espressomaschine kaufen Schweiz — Siebträger & Co. | aban",
    desc: "Espressomaschine kaufen in der Schweiz: Siebträger, Kapsel- und Padmaschinen nach Druck, Aufwand und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Espressomaschine", ctaLabel: "Espressomaschinen ansehen",
    intro: "Barista-Gefühl zu Hause: Hier vergleichst du Espressomaschinen (Siebträger, Kapsel, Pad) nach Druck, Aufwand und Preis.",
    tips: [
      ["Maschinentyp", "Siebträger geben volle Kontrolle (mehr Übung nötig), Kapsel/Pad sind unkompliziert und schnell."],
      ["Druck & Aufheizzeit", "Rund 9 bar sind für Espresso üblich. Kurze Aufheizzeit ist im Alltag angenehm."],
      ["Pflege", "Regelmässig spülen und entkalken. Beim Siebträger Brühkopf und Sieb sauber halten."],
    ],
    faq: [
      ["Siebträger oder Kapselmaschine?", "Siebträger für Genuss und Kontrolle (mehr Übung), Kapsel/Pad für schnelle, unkomplizierte Zubereitung."],
      ["Wie viel bar braucht es?", "Für klassischen Espresso sind etwa 9 bar Brühdruck üblich — viele Geräte werben mit höheren Pumpenwerten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "ventilator-kaufen-schweiz", icon: "🌀", h1: "Ventilator kaufen in der Schweiz",
    title: "Ventilator kaufen Schweiz — Stand, Turm & Tisch | aban",
    desc: "Ventilator kaufen in der Schweiz: Stand-, Turm- und Tischventilatoren nach Lautstärke, Leistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Ventilator", ctaLabel: "Ventilatoren ansehen",
    intro: "Kühle an heissen Tagen: Hier vergleichst du Ventilatoren (Stand, Turm, Tisch) nach Lautstärke, Leistung und Preis.",
    tips: [
      ["Bauform", "Standventilatoren sind flexibel höhenverstellbar, Turmventilatoren platzsparend, Tischventilatoren ideal am Arbeitsplatz."],
      ["Lautstärke", "Auf die Dezibel-Angabe achten — für Schlafzimmer und Büro zählt ein leiser Betrieb."],
      ["Funktionen", "Oszillation, mehrere Stufen, Timer und Fernbedienung erhöhen den Komfort."],
    ],
    faq: [
      ["Welcher Ventilator-Typ passt?", "Standventilator für grosse Räume, Turm für wenig Platz, Tischventilator für den Arbeitsplatz."],
      ["Wie leise sollte er sein?", "Fürs Schlafzimmer möglichst leise Modelle wählen und auf die Dezibel-Angabe der niedrigsten Stufe achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "heckenschere-kaufen-schweiz", icon: "🌿", h1: "Heckenschere kaufen in der Schweiz",
    title: "Heckenschere kaufen Schweiz — Akku, Elektro & Benzin | aban",
    desc: "Heckenschere kaufen in der Schweiz: Akku-, Elektro- und Benzin-Heckenscheren nach Schnittlänge, Gewicht und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Heckenschere", ctaLabel: "Heckenscheren ansehen",
    intro: "Gepflegte Hecken: Hier vergleichst du Heckenscheren (Akku, Elektro, Benzin) nach Schnittlänge, Gewicht und Preis.",
    tips: [
      ["Antrieb", "Akku für Bewegungsfreiheit, Elektro (Kabel) für Dauerbetrieb am Haus, Benzin für grosse Grundstücke."],
      ["Schnittlänge & Zahnabstand", "Längeres Schwert für hohe Hecken, grösserer Zahnabstand für dickere Äste."],
      ["Gewicht & Sicherheit", "Leichtere Geräte ermüden weniger. Auf Zweihand-Sicherheitsschalter und Handschutz achten."],
    ],
    faq: [
      ["Akku oder Kabel?", "Akku ist flexibel und leise, Kabelgeräte bieten Dauerleistung ohne Ladepausen — Benzin lohnt nur bei sehr grossen Hecken."],
      ["Welche Schnittlänge?", "Für niedrige Hecken reichen kürzere Schwerter; für hohe und breite Hecken längere Schwerter und ggf. ein Teleskopstiel."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "friteuse-kaufen-schweiz", icon: "🍟", h1: "Friteuse kaufen in der Schweiz",
    title: "Friteuse kaufen Schweiz — Heissluft & klassisch | aban",
    desc: "Friteuse kaufen in der Schweiz: Heissluft- und klassische Fritteusen nach Fassungsvermögen, Reinigung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Friteuse", ctaLabel: "Fritteusen ansehen",
    intro: "Knusprig ohne viel Fett: Hier vergleichst du Fritteusen (Heissluft oder klassisch) nach Fassungsvermögen, Reinigung und Preis.",
    tips: [
      ["Typ", "Heissluft-Fritteusen brauchen kaum Öl und sind leichter zu reinigen, klassische liefern das typische Frittier-Ergebnis."],
      ["Fassungsvermögen", "Korbgrösse nach Haushaltsgrösse wählen — zu kleine Geräte zwingen zu mehreren Durchgängen."],
      ["Reinigung", "Herausnehmbare, spülmaschinenfeste Teile sparen Zeit. Geruchsarme Modelle sind in offenen Küchen angenehm."],
    ],
    faq: [
      ["Heissluft oder klassische Fritteuse?", "Heissluft ist fettarm und pflegeleicht; klassische Fritteusen erzeugen das typische frittierte Ergebnis, brauchen aber Öl."],
      ["Welche Grösse?", "Für Singles/Paare kleine Körbe, für Familien grössere — sonst muss man in mehreren Durchgängen frittieren."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "dampfgarer-kaufen-schweiz", icon: "🥦", h1: "Dampfgarer kaufen in der Schweiz",
    title: "Dampfgarer kaufen Schweiz — schonend kochen | aban",
    desc: "Dampfgarer kaufen in der Schweiz: Geräte nach Etagen, Fassungsvermögen, Funktionen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Dampfgarer", ctaLabel: "Dampfgarer ansehen",
    intro: "Schonend und vitaminreich garen: Hier vergleichst du Dampfgarer nach Etagen, Fassungsvermögen, Funktionen und Preis.",
    tips: [
      ["Etagen & Volumen", "Mehrere Etagen erlauben paralleles Garen. Das Volumen nach Haushaltsgrösse wählen."],
      ["Funktionen", "Timer, Warmhaltefunktion und ein Reisbehälter sind im Alltag praktisch."],
      ["Reinigung", "Spülmaschinenfeste Körbe und ein gut zugänglicher Wassertank erleichtern die Pflege."],
    ],
    faq: [
      ["Warum ein Dampfgarer?", "Dampfgaren ist fettfrei und schonend — Gemüse, Fisch und Reis behalten mehr Nährstoffe und Geschmack."],
      ["Worauf achten?", "Auf ausreichend Etagen/Volumen, einen Timer mit Warmhaltefunktion und leicht zu reinigende Teile achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "kuechenmaschine-kaufen-schweiz", icon: "🥣", h1: "Küchenmaschine kaufen in der Schweiz",
    title: "Küchenmaschine kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Küchenmaschine kaufen in der Schweiz: Geräte nach Leistung, Schüsselvolumen, Zubehör und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Küchenmaschine", ctaLabel: "Küchenmaschinen ansehen",
    intro: "Rühren, kneten, mixen: Hier vergleichst du Küchenmaschinen nach Leistung, Schüsselvolumen, Zubehör und Preis.",
    tips: [
      ["Leistung & Volumen", "Für schwere Teige genug Wattleistung und eine ausreichend grosse Rührschüssel wählen."],
      ["Zubehör", "Knethaken, Rührbesen und Flachrührer gehören dazu; Fleischwolf oder Pastavorsatz erweitern den Einsatz."],
      ["Stabilität", "Ein schweres Gehäuse steht beim Kneten ruhig. Auf einfache Bedienung und Reinigung achten."],
    ],
    faq: [
      ["Worauf beim Kauf achten?", "Auf genügend Leistung für Teig, ein passendes Schüsselvolumen und mitgeliefertes Zubehör achten."],
      ["Lohnt sich teures Zubehör?", "Nur wenn du es nutzt — wer oft Hackfleisch oder Pasta macht, profitiert; sonst reicht das Grundzubehör."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "brotbackautomat-kaufen-schweiz", icon: "🍞", h1: "Brotbackautomat kaufen in der Schweiz",
    title: "Brotbackautomat kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Brotbackautomat kaufen in der Schweiz: Geräte nach Brotgrösse, Programmen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Brotbackautomat", ctaLabel: "Brotbackautomaten ansehen",
    intro: "Frisches Brot ohne Aufwand: Hier vergleichst du Brotbackautomaten nach Brotgrösse, Programmen und Preis.",
    tips: [
      ["Brotgrösse", "Die Laibgrösse (z. B. 500–1000 g) nach Haushalt wählen — viele Geräte bieten mehrere Stufen."],
      ["Programme", "Programme für Vollkorn, glutenfrei, Teig oder Konfitüre erweitern die Möglichkeiten. Timer für frisches Brot am Morgen."],
      ["Reinigung", "Antihaftbeschichtete Backform und herausnehmbare Knethaken erleichtern das Sauberhalten."],
    ],
    faq: [
      ["Lohnt sich ein Brotbackautomat?", "Wenn du regelmässig Brot isst: ja — du bestimmst die Zutaten selbst und sparst gegenüber gekauftem Brot."],
      ["Worauf achten?", "Auf passende Brotgrösse, nützliche Programme (Vollkorn/glutenfrei), einen Timer und eine leicht zu reinigende Form."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "buegeleisen-kaufen-schweiz", icon: "👔", h1: "Bügeleisen kaufen in der Schweiz",
    title: "Bügeleisen kaufen Schweiz — Dampf & Dampfstation | aban",
    desc: "Bügeleisen kaufen in der Schweiz: Dampfbügeleisen und Dampfstationen nach Dampfleistung, Sohle und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bügeleisen", ctaLabel: "Bügeleisen ansehen",
    intro: "Knitterfrei in kürzerer Zeit: Hier vergleichst du Bügeleisen und Dampfstationen nach Dampfleistung, Sohle und Preis.",
    tips: [
      ["Dampfleistung", "Mehr Dampf glättet hartnäckige Falten schneller. Eine Dampfstation liefert konstant viel Dampf für grosse Wäschemengen."],
      ["Bügelsohle", "Eine gleitfähige, kratzfeste Sohle (z. B. Keramik/Edelstahl) erleichtert das Bügeln."],
      ["Komfort", "Antikalk-Funktion, automatische Abschaltung und ausreichend langes Kabel sind praktisch."],
    ],
    faq: [
      ["Bügeleisen oder Dampfstation?", "Für wenig Wäsche reicht ein gutes Dampfbügeleisen; bei grossen Mengen spart eine Dampfstation Zeit und Mühe."],
      ["Worauf bei der Sohle achten?", "Auf eine gut gleitende, kratzfeste Sohle und eine gleichmässige Dampfverteilung achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "weinkuehlschrank-kaufen-schweiz", icon: "🍷", h1: "Weinkühlschrank kaufen in der Schweiz",
    title: "Weinkühlschrank kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Weinkühlschrank kaufen in der Schweiz: Geräte nach Flaschenzahl, Temperaturzonen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Weinkühlschrank", ctaLabel: "Weinkühlschränke ansehen",
    intro: "Wein bei idealer Temperatur lagern: Hier vergleichst du Weinkühlschränke nach Flaschenzahl, Temperaturzonen und Preis.",
    tips: [
      ["Kapazität", "Die Flaschenzahl grosszügig wählen — die Angaben gehen oft von Standard-Bordeaux-Flaschen aus."],
      ["Temperaturzonen", "Eine Zone für eine Weinart, zwei Zonen für Rot- und Weisswein bei unterschiedlichen Temperaturen."],
      ["Betrieb", "Auf leisen Betrieb, geringe Vibration und UV-Schutzglas achten — das schont den Wein."],
    ],
    faq: [
      ["Wie viele Flaschen passen rein?", "Die Herstellerangabe bezieht sich meist auf schlanke Standardflaschen — bei Burgunder-/Sektflaschen passen weniger hinein."],
      ["Eine oder zwei Temperaturzonen?", "Zwei Zonen lohnen sich, wenn du Rot- und Weisswein gleichzeitig bei unterschiedlichen Temperaturen lagern willst."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "fernseher-kaufen-schweiz", icon: "📺", h1: "Fernseher kaufen in der Schweiz",
    title: "Fernseher kaufen Schweiz — OLED, QLED & LED | aban",
    desc: "Fernseher kaufen in der Schweiz: TVs nach Grösse, Panel (OLED/QLED/LED), Auflösung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Fernseher", ctaLabel: "Fernseher ansehen",
    intro: "Bestes Bild fürs Wohnzimmer: Hier vergleichst du Fernseher nach Grösse, Paneltyp, Auflösung und Preis.",
    tips: [
      ["Grösse & Abstand", "Die Bildschirmgrösse zum Sitzabstand passend wählen — grösser ist nicht automatisch besser."],
      ["Paneltyp", "OLED bietet tiefes Schwarz und Kontrast, QLED/LED sind heller und oft günstiger."],
      ["Anschlüsse & Funktionen", "Genug HDMI-Anschlüsse, Smart-TV-System und (für Gaming) 120 Hz beachten."],
    ],
    faq: [
      ["OLED oder QLED?", "OLED hat das beste Schwarz und den besten Kontrast; QLED/LED sind heller und meist preiswerter — die Wahl hängt von Raum und Budget ab."],
      ["Welche Grösse passt?", "Richte dich nach dem Sitzabstand: Bei zu grossem Bildschirm und kurzem Abstand sieht man einzelne Bildpunkte."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "soundbar-kaufen-schweiz", icon: "🔊", h1: "Soundbar kaufen in der Schweiz",
    title: "Soundbar kaufen Schweiz — besserer TV-Ton | aban",
    desc: "Soundbar kaufen in der Schweiz: Soundbars nach Kanälen, Subwoofer, Anschlüssen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Soundbar", ctaLabel: "Soundbars ansehen",
    intro: "Klar besserer Fernsehton: Hier vergleichst du Soundbars nach Kanälen, Subwoofer, Anschlüssen und Preis.",
    tips: [
      ["Kanäle", "2.0 für klaren Ton, 2.1 mit Subwoofer für mehr Bass, mehr Kanäle (z. B. mit Dolby Atmos) für Raumklang."],
      ["Anschluss", "HDMI ARC/eARC verbindet einfach mit dem TV; optisch und Bluetooth sind Alternativen."],
      ["Platz", "Die Breite zum Fernseher passend wählen; ein separater Subwoofer braucht Stellfläche."],
    ],
    faq: [
      ["Lohnt sich eine Soundbar?", "Ja — die meisten Flach-TVs haben schwachen Klang; schon eine einfache Soundbar verbessert Sprache und Bass deutlich."],
      ["Wie anschliessen?", "Am einfachsten per HDMI ARC/eARC, alternativ optisch oder Bluetooth. ARC erlaubt auch die TV-Fernbedienung für die Lautstärke."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "kopfhoerer-kaufen-schweiz", icon: "🎧", h1: "Kopfhörer kaufen in der Schweiz",
    title: "Kopfhörer kaufen Schweiz — Over-Ear, In-Ear & ANC | aban",
    desc: "Kopfhörer kaufen in der Schweiz: Over-Ear, In-Ear und ANC-Modelle nach Klang, Akku und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kopfhörer", ctaLabel: "Kopfhörer ansehen",
    intro: "Musik unterwegs und zu Hause: Hier vergleichst du Kopfhörer (Over-Ear, In-Ear, mit ANC) nach Klang, Akku und Preis.",
    tips: [
      ["Bauform", "Over-Ear für Komfort und Klang zu Hause, In-Ear für unterwegs und Sport."],
      ["Geräuschunterdrückung", "Aktives Noise-Cancelling (ANC) hilft im Zug oder Büro; ein Transparenzmodus lässt Umgebung durch."],
      ["Akku & Komfort", "Auf Akkulaufzeit, gute Passform und (bei In-Ear) verschiedene Aufsätze achten."],
    ],
    faq: [
      ["Over-Ear oder In-Ear?", "Over-Ear bieten meist besseren Klang und Komfort daheim, In-Ear sind kompakter und besser für Sport und unterwegs."],
      ["Brauche ich ANC?", "Wenn du oft im Zug, Flugzeug oder Grossraumbüro hörst, lohnt sich aktive Geräuschunterdrückung — sonst nicht zwingend."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "bluetooth-lautsprecher-kaufen-schweiz", icon: "🔈", h1: "Bluetooth-Lautsprecher kaufen in der Schweiz",
    title: "Bluetooth-Lautsprecher kaufen Schweiz — Vergleich | aban",
    desc: "Bluetooth-Lautsprecher kaufen in der Schweiz: Modelle nach Klang, Akku, Wasserschutz und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bluetooth Lautsprecher", ctaLabel: "Lautsprecher ansehen",
    intro: "Musik überall: Hier vergleichst du Bluetooth-Lautsprecher nach Klang, Akku, Wasserschutz und Preis.",
    tips: [
      ["Einsatzort", "Kompakt für unterwegs, grösser für zu Hause oder Party. Für Bad/Pool ein wasserdichtes Modell (IPX-Wert)."],
      ["Akku", "Auf die Laufzeit achten; manche Modelle laden auch das Handy auf."],
      ["Klang", "Mehr Volumen und Bass brauchen grössere Gehäuse — ein Stereo-Paar verbessert den Klang."],
    ],
    faq: [
      ["Worauf beim Kauf achten?", "Auf Akkulaufzeit, Klang/Volumen passend zum Einsatzort und — für draussen — einen Wasserschutz (IPX-Wert) achten."],
      ["Was bedeutet der IPX-Wert?", "Er gibt den Schutz gegen Wasser an: Je höher die Zahl, desto besser ist der Lautsprecher gegen Spritzwasser oder Untertauchen geschützt."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "router-kaufen-schweiz", icon: "📶", h1: "WLAN-Router kaufen in der Schweiz",
    title: "WLAN-Router kaufen Schweiz — Wi-Fi 6 & Mesh | aban",
    desc: "WLAN-Router kaufen in der Schweiz: Router und Mesh-Systeme nach Standard, Reichweite und Preis vergleichen.",
    cta: "/angebote-suche.html?q=WLAN Router", ctaLabel: "Router ansehen",
    intro: "Schnelles, stabiles WLAN: Hier vergleichst du Router und Mesh-Systeme nach Standard, Reichweite und Preis.",
    tips: [
      ["Standard", "Wi-Fi 6 (oder neuer) bietet mehr Tempo und ist für viele Geräte besser geeignet."],
      ["Reichweite", "Für grosse Wohnungen oder mehrere Stockwerke lohnt sich ein Mesh-System statt eines einzelnen Routers."],
      ["Anschlüsse", "Genug LAN-Ports und (bei schnellem Internet) Gigabit-Anschlüsse beachten."],
    ],
    faq: [
      ["Brauche ich ein Mesh-System?", "Wenn ein einzelner Router nicht jede Ecke abdeckt, sorgt Mesh mit mehreren Knoten für gleichmässiges WLAN in der ganzen Wohnung."],
      ["Lohnt sich Wi-Fi 6?", "Ja, besonders bei vielen Geräten und schnellem Internet — es bringt mehr Tempo und stabilere Verbindungen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "powerbank-kaufen-schweiz", icon: "🔋", h1: "Powerbank kaufen in der Schweiz",
    title: "Powerbank kaufen Schweiz — Kapazität & Tempo | aban",
    desc: "Powerbank kaufen in der Schweiz: mobile Akkus nach Kapazität, Ladeleistung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Powerbank", ctaLabel: "Powerbanks ansehen",
    intro: "Strom für unterwegs: Hier vergleichst du Powerbanks nach Kapazität, Ladeleistung und Preis.",
    tips: [
      ["Kapazität", "Mehr mAh laden öfter, sind aber schwerer. 10000 mAh reichen meist für ein bis zwei Handy-Ladungen."],
      ["Ladetempo", "USB-C Power Delivery lädt Handy und Laptop schneller. Auf die Watt-Angabe achten."],
      ["Reise", "Für Flugreisen die erlaubte Wattstunden-Grenze (Wh) im Handgepäck beachten."],
    ],
    faq: [
      ["Wie viel mAh brauche ich?", "10000 mAh reichen für unterwegs (ein bis zwei Ladungen); für mehrere Tage oder Laptop-Laden eher 20000 mAh oder mehr."],
      ["Darf die Powerbank ins Flugzeug?", "In der Regel nur im Handgepäck und bis zu einer bestimmten Wattstunden-Grenze — prüfe die Vorgaben der Airline."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "fitnesstracker-kaufen-schweiz", icon: "⌚", h1: "Fitnesstracker kaufen in der Schweiz",
    title: "Fitnesstracker kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Fitnesstracker kaufen in der Schweiz: Tracker nach Sensoren, Akku, App und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Fitnesstracker", ctaLabel: "Fitnesstracker ansehen",
    intro: "Aktivität und Schlaf im Blick: Hier vergleichst du Fitnesstracker nach Sensoren, Akku, App und Preis.",
    tips: [
      ["Sensoren", "Herzfrequenz und Schrittzähler gehören dazu; GPS, SpO2 oder EKG sind je nach Modell zusätzlich vorhanden."],
      ["Akku", "Reine Tracker laufen oft über eine Woche, Smartwatches meist kürzer."],
      ["App & Kompatibilität", "Die App sollte übersichtlich sein und mit deinem Handy (Android/iOS) zusammenarbeiten."],
    ],
    faq: [
      ["Fitnesstracker oder Smartwatch?", "Ein Tracker fokussiert auf Aktivität/Schlaf bei langer Akkulaufzeit; eine Smartwatch kann mehr (Apps, Bezahlen), hält aber kürzer durch."],
      ["Brauche ich GPS?", "Für genaue Lauf-/Velo-Strecken ohne Handy ist eingebautes GPS sinnvoll — sonst nutzt der Tracker das Handy-GPS."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "koerperwaage-kaufen-schweiz", icon: "⚖️", h1: "Körperwaage kaufen in der Schweiz",
    title: "Körperwaage kaufen Schweiz — digital & smart | aban",
    desc: "Körperwaage kaufen in der Schweiz: digitale und smarte Waagen nach Funktionen, Genauigkeit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Körperwaage", ctaLabel: "Körperwaagen ansehen",
    intro: "Gewicht und mehr im Blick: Hier vergleichst du Körperwaagen (digital, smart) nach Funktionen, Genauigkeit und Preis.",
    tips: [
      ["Typ", "Einfache Digitalwaagen zeigen das Gewicht; smarte Waagen messen zusätzlich Körperwerte und synchronisieren mit einer App."],
      ["Genauigkeit", "Eine stabile Standfläche und feine Schrittweite (z. B. 100 g) sorgen für verlässliche Werte."],
      ["App", "Bei smarten Waagen auf eine gute App und mehrere Benutzerprofile achten."],
    ],
    faq: [
      ["Lohnt sich eine smarte Waage?", "Wenn du Trends über die Zeit verfolgen willst, ja — sie speichert Werte automatisch in einer App. Sonst reicht eine genaue Digitalwaage."],
      ["Wie genau sind Körperfett-Messungen?", "Die per Bioimpedanz geschätzten Werte sind nur Richtwerte — als Trend nützlich, aber nicht so exakt wie medizinische Messungen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "blutdruckmessgeraet-kaufen-schweiz", icon: "🩺", h1: "Blutdruckmessgerät kaufen in der Schweiz",
    title: "Blutdruckmessgerät kaufen Schweiz — Oberarm & Co. | aban",
    desc: "Blutdruckmessgerät kaufen in der Schweiz: Oberarm- und Handgelenkgeräte nach Genauigkeit, Komfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Blutdruckmessgerät", ctaLabel: "Blutdruckmessgeräte ansehen",
    intro: "Blutdruck zu Hause messen: Hier vergleichst du Blutdruckmessgeräte (Oberarm, Handgelenk) nach Genauigkeit, Komfort und Preis.",
    tips: [
      ["Bauform", "Oberarmgeräte gelten als zuverlässiger, Handgelenkgeräte sind kompakter und reisefreundlich."],
      ["Manschette", "Die Manschettengrösse muss zum Armumfang passen — sonst werden die Werte ungenau."],
      ["Funktionen", "Mehrere Benutzerprofile, Speicher und eine klare Anzeige sind im Alltag praktisch."],
    ],
    faq: [
      ["Oberarm oder Handgelenk?", "Oberarmgeräte liefern in der Regel verlässlichere Werte; Handgelenkgeräte sind handlicher, müssen aber korrekt auf Herzhöhe gehalten werden."],
      ["Worauf bei der Manschette achten?", "Sie muss zum Armumfang passen. Bei Unsicherheit lieber ein Gerät mit grösserer oder variabler Manschette wählen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "e-reader-kaufen-schweiz", icon: "📖", h1: "E-Reader kaufen in der Schweiz",
    title: "E-Reader kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "E-Reader kaufen in der Schweiz: Lesegeräte nach Display, Beleuchtung, Formaten und Preis vergleichen.",
    cta: "/angebote-suche.html?q=E-Reader", ctaLabel: "E-Reader ansehen",
    intro: "Hunderte Bücher in einem Gerät: Hier vergleichst du E-Reader nach Display, Beleuchtung, Formaten und Preis.",
    tips: [
      ["Display", "E-Ink ist augenschonend und auch in der Sonne gut lesbar. Höhere Auflösung zeigt schärfere Schrift."],
      ["Beleuchtung", "Eine einstellbare Beleuchtung (auch warmweiss) erleichtert das Lesen am Abend."],
      ["Formate & Wasserschutz", "Auf unterstützte Buchformate achten; ein wasserfestes Modell ist gut für Bad und Strand."],
    ],
    faq: [
      ["E-Reader oder Tablet zum Lesen?", "Ein E-Reader ist augenschonend, leicht und hat eine lange Akkulaufzeit; ein Tablet kann mehr, ermüdet die Augen aber schneller."],
      ["Welche Buchformate werden unterstützt?", "Das hängt vom Gerät ab — prüfe vor dem Kauf, ob deine Quellen (z. B. EPUB oder herstellereigene Formate) unterstützt werden."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "gewaechshaus-kaufen-schweiz", icon: "🏡", h1: "Gewächshaus kaufen in der Schweiz",
    title: "Gewächshaus kaufen Schweiz — Glas, Folie & Co. | aban",
    desc: "Gewächshaus kaufen in der Schweiz: Gewächshäuser nach Material, Grösse, Stabilität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gewächshaus", ctaLabel: "Gewächshäuser ansehen",
    intro: "Länger ernten, früher säen: Hier vergleichst du Gewächshäuser nach Material, Grösse, Stabilität und Preis.",
    tips: [
      ["Material", "Glas hält lange und lässt viel Licht durch, Hohlkammerplatten dämmen besser, Folie ist günstig für den Einstieg."],
      ["Grösse & Standort", "Genug Platz für Pflanzen und Wege einplanen; ein heller, windgeschützter Standort ist ideal."],
      ["Stabilität", "Ein solides Fundament und ein stabiler Rahmen schützen vor Wind und Schneelast."],
    ],
    faq: [
      ["Welches Material ist am besten?", "Glas und Hohlkammerplatten sind langlebig und dämmen gut; Folientunnel sind günstig, aber weniger haltbar."],
      ["Braucht es ein Fundament?", "Für feste Gewächshäuser ja — es sorgt für Stabilität bei Wind und Schnee. Kleine Modelle lassen sich auch verankern."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "gartenpumpe-kaufen-schweiz", icon: "🚿", h1: "Gartenpumpe kaufen in der Schweiz",
    title: "Gartenpumpe kaufen Schweiz — bewässern & fördern | aban",
    desc: "Gartenpumpe kaufen in der Schweiz: Garten-, Hauswasser- und Tauchpumpen nach Fördermenge, Druck und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gartenpumpe", ctaLabel: "Gartenpumpen ansehen",
    intro: "Wasser fördern und bewässern: Hier vergleichst du Gartenpumpen nach Fördermenge, Druck und Preis.",
    tips: [
      ["Typ", "Gartenpumpen für Bewässerung, Hauswasserwerke für konstanten Druck, Tauchpumpen für Brunnen oder Zisterne."],
      ["Förderleistung", "Auf Fördermenge (l/h) und Druck (bar) achten — passend zur Schlauchlänge und Höhe."],
      ["Material", "Hochwertige Dichtungen und ein robustes Gehäuse verlängern die Lebensdauer."],
    ],
    faq: [
      ["Welche Pumpe für den Garten?", "Zum Bewässern aus Regentonne oder Brunnen reicht eine Gartenpumpe; für konstanten Wasserdruck im Haus ein Hauswasserwerk."],
      ["Worauf bei der Leistung achten?", "Fördermenge und Druck müssen zur Höhe und Schlauchlänge passen — sonst kommt zu wenig Wasser an."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "sauna-kaufen-schweiz", icon: "🧖", h1: "Sauna kaufen in der Schweiz",
    title: "Sauna kaufen Schweiz — Heimsauna & Fasssauna | aban",
    desc: "Sauna kaufen in der Schweiz: Heim-, Fass- und Aussensaunen nach Grösse, Ofen, Strom und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sauna", ctaLabel: "Saunen ansehen",
    intro: "Entspannung zu Hause: Hier vergleichst du Saunen (Heimsauna, Fasssauna) nach Grösse, Ofen, Stromanschluss und Preis.",
    tips: [
      ["Grösse & Platz", "Die Personenzahl und der verfügbare Raum bestimmen die Grösse; Aussensaunen brauchen einen festen Standort."],
      ["Ofen & Strom", "Grössere Öfen brauchen oft Starkstrom. Den Anschluss vor dem Kauf abklären."],
      ["Holz & Aufbau", "Massivholz speichert Wärme; auf eine gute Verarbeitung und einfache Montage achten."],
    ],
    faq: [
      ["Braucht eine Sauna Starkstrom?", "Grössere Saunaöfen benötigen meist einen Starkstromanschluss; kleine Modelle laufen teils über die normale Steckdose — vor dem Kauf prüfen."],
      ["Innen- oder Aussensauna?", "Eine Innensauna passt in Keller oder Bad, eine Aussen-/Fasssauna braucht einen festen Platz im Garten, bietet aber mehr Saunagefühl."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "infrarotkabine-kaufen-schweiz", icon: "♨️", h1: "Infrarotkabine kaufen in der Schweiz",
    title: "Infrarotkabine kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Infrarotkabine kaufen in der Schweiz: Kabinen nach Strahlertyp, Grösse, Stromanschluss und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Infrarotkabine", ctaLabel: "Infrarotkabinen ansehen",
    intro: "Sanfte Wärme statt Hitze: Hier vergleichst du Infrarotkabinen nach Strahlertyp, Grösse, Stromanschluss und Preis.",
    tips: [
      ["Strahlertyp", "Flächenstrahler wärmen sanft und grossflächig, Vollspektrumstrahler erreichen höhere Tiefenwärme."],
      ["Grösse & Strom", "Die Personenzahl bestimmt die Grösse; viele Kabinen laufen über eine normale Steckdose — Angabe prüfen."],
      ["Material", "Auf gute Holzqualität, einfache Montage und emissionsarme Strahler achten."],
    ],
    faq: [
      ["Infrarotkabine oder Sauna?", "Die Infrarotkabine wärmt bei niedrigeren Temperaturen sanfter und ist sparsamer; die Sauna bietet die klassische heisse Saunaerfahrung."],
      ["Reicht eine normale Steckdose?", "Viele Infrarotkabinen laufen über die übliche Haushaltssteckdose — die Leistungsangabe vor dem Kauf prüfen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "kaminofen-kaufen-schweiz", icon: "🔥", h1: "Kaminofen kaufen in der Schweiz",
    title: "Kaminofen kaufen Schweiz — Holz & Speicherofen | aban",
    desc: "Kaminofen kaufen in der Schweiz: Holz- und Speicheröfen nach Leistung, Effizienz und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kaminofen", ctaLabel: "Kaminöfen ansehen",
    intro: "Behagliche Wärme im Winter: Hier vergleichst du Kaminöfen nach Heizleistung, Effizienz und Preis.",
    tips: [
      ["Heizleistung", "Die Leistung (kW) zur Raumgrösse passend wählen — ein zu grosser Ofen überheizt den Raum."],
      ["Effizienz & Emissionen", "Moderne Öfen mit hohem Wirkungsgrad verbrauchen weniger Holz und stossen weniger Feinstaub aus."],
      ["Einbau", "Anschluss an den Kamin, Bodenschutz und Sicherheitsabstände beachten — im Zweifel Fachperson beiziehen."],
    ],
    faq: [
      ["Welche Leistung brauche ich?", "Die kW-Leistung richtet sich nach Raumgrösse und Dämmung — eine Fachperson kann den Bedarf genau bestimmen."],
      ["Worauf bei Emissionen achten?", "Auf einen hohen Wirkungsgrad und niedrige Feinstaubwerte achten; in vielen Regionen gelten Vorgaben für neue Öfen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "akkuschrauber-kaufen-schweiz", icon: "🔩", h1: "Akkuschrauber kaufen in der Schweiz",
    title: "Akkuschrauber kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Akkuschrauber kaufen in der Schweiz: Geräte nach Drehmoment, Akku, Gewicht und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Akkuschrauber", ctaLabel: "Akkuschrauber ansehen",
    intro: "Schrauben und bohren ohne Kabel: Hier vergleichst du Akkuschrauber nach Drehmoment, Akku, Gewicht und Preis.",
    tips: [
      ["Drehmoment", "Mehr Newtonmeter (Nm) treiben Schrauben in härteres Material; eine Drehmoment-Einstellung schützt vor Überdrehen."],
      ["Akku", "Auf Spannung (V) und Kapazität (Ah) achten; ein zweiter Akku verhindert Zwangspausen."],
      ["Gewicht & Bohrfutter", "Leichtere Geräte ermüden weniger. Ein Schnellspannbohrfutter erleichtert den Bit-Wechsel."],
    ],
    faq: [
      ["Akkuschrauber oder Bohrschrauber?", "Ein Akkuschrauber reicht für Schrauben und leichte Bohrarbeiten; für viel Bohren in harten Materialien ist ein kräftigerer Bohrschrauber besser."],
      ["Wie viel Volt brauche ich?", "Für Heimwerker reichen meist 12–18 V; mehr Spannung bedeutet mehr Kraft, aber auch mehr Gewicht."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "stichsaege-kaufen-schweiz", icon: "🪚", h1: "Stichsäge kaufen in der Schweiz",
    title: "Stichsäge kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Stichsäge kaufen in der Schweiz: Stichsägen nach Leistung, Pendelhub, Führung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Stichsäge", ctaLabel: "Stichsägen ansehen",
    intro: "Kurven und gerade Schnitte: Hier vergleichst du Stichsägen nach Leistung, Pendelhub, Führung und Preis.",
    tips: [
      ["Leistung", "Mehr Watt (oder ein starker Akku) sägt dickeres Material; die Hubzahl sollte regelbar sein."],
      ["Pendelhub", "Ein einstellbarer Pendelhub beschleunigt grobe Schnitte; ohne Pendelhub wird der Schnitt sauberer."],
      ["Komfort", "Werkzeugloser Sägeblattwechsel, gute Führung und eine Absaugung erleichtern die Arbeit."],
    ],
    faq: [
      ["Wofür eignet sich eine Stichsäge?", "Für Kurven, Ausschnitte und gerade Schnitte in Holz, Kunststoff und (mit passendem Blatt) Metall."],
      ["Was bringt der Pendelhub?", "Er macht grobe Schnitte schneller; für feine, saubere Schnittkanten schaltet man den Pendelhub aus."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "winkelschleifer-kaufen-schweiz", icon: "⚙️", h1: "Winkelschleifer kaufen in der Schweiz",
    title: "Winkelschleifer kaufen Schweiz — Flex im Vergleich | aban",
    desc: "Winkelschleifer kaufen in der Schweiz: Flex-Geräte nach Scheibengrösse, Leistung, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Winkelschleifer", ctaLabel: "Winkelschleifer ansehen",
    intro: "Trennen und schleifen: Hier vergleichst du Winkelschleifer (Flex) nach Scheibengrösse, Leistung, Sicherheit und Preis.",
    tips: [
      ["Scheibengrösse", "115/125 mm sind handlich für Heimwerk, grössere Scheiben für schwere Trennarbeiten."],
      ["Leistung", "Mehr Watt (oder ein starker Akku) für hartes Material; eine Drehzahlregelung ist nützlich."],
      ["Sicherheit", "Schutzhaube, Wiederanlaufschutz und eine Bremse erhöhen die Sicherheit — immer Schutzbrille tragen."],
    ],
    faq: [
      ["Welche Scheibengrösse?", "115/125 mm reichen für die meisten Heimwerkerarbeiten; 230 mm sind für grosse Trennschnitte gedacht, aber schwerer zu führen."],
      ["Worauf bei der Sicherheit achten?", "Auf Schutzhaube, Wiederanlaufschutz und am besten eine Schnellbremse achten — und stets Schutzbrille und Handschuhe tragen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "kompressor-kaufen-schweiz", icon: "🛠️", h1: "Kompressor kaufen in der Schweiz",
    title: "Kompressor kaufen Schweiz — Druckluft im Vergleich | aban",
    desc: "Kompressor kaufen in der Schweiz: Druckluftkompressoren nach Kesselgrösse, Leistung, Lautstärke und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kompressor", ctaLabel: "Kompressoren ansehen",
    intro: "Druckluft für Werkstatt und Garage: Hier vergleichst du Kompressoren nach Kesselgrösse, Leistung, Lautstärke und Preis.",
    tips: [
      ["Kesselgrösse", "Grössere Kessel liefern länger gleichmässige Luft — wichtig für Werkzeuge mit hohem Verbrauch."],
      ["Leistung & Druck", "Auf Ansaugleistung (l/min) und Maximaldruck (bar) passend zum Werkzeug achten."],
      ["Lautstärke", "Flüsterkompressoren sind angenehmer; ölfreie Modelle sind wartungsärmer."],
    ],
    faq: [
      ["Wie gross muss der Kessel sein?", "Für gelegentliches Aufpumpen reichen kleine Kessel; für Druckluftwerkzeuge mit hohem Verbrauch lieber grössere Kessel wählen."],
      ["Ölfrei oder mit Öl?", "Ölfreie Kompressoren sind wartungsarm und sauber; ölgeschmierte laufen leiser und langlebiger, brauchen aber Pflege."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "leiter-kaufen-schweiz", icon: "🪜", h1: "Leiter kaufen in der Schweiz",
    title: "Leiter kaufen Schweiz — Steh-, Anlege- & Teleskop | aban",
    desc: "Leiter kaufen in der Schweiz: Steh-, Anlege-, Mehrzweck- und Teleskopleitern nach Höhe, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Leiter", ctaLabel: "Leitern ansehen",
    intro: "Sicher hoch hinaus: Hier vergleichst du Leitern (Steh-, Anlege-, Teleskop) nach Höhe, Material, Sicherheit und Preis.",
    tips: [
      ["Typ", "Stehleiter steht frei, Anlegeleiter braucht eine Wand, Mehrzweck-/Teleskopleitern sind flexibel und platzsparend."],
      ["Höhe & Material", "Die Arbeitshöhe passend wählen; Aluminium ist leicht, Glasfaser isoliert (gut bei Elektroarbeiten)."],
      ["Sicherheit", "Auf rutschfeste Füsse, eine geprüfte Belastbarkeit und einen stabilen Stand achten."],
    ],
    faq: [
      ["Welche Leiter für zu Hause?", "Eine Mehrzweck- oder Stehleiter deckt die meisten Arbeiten ab; eine Teleskopleiter spart Platz im Keller oder Auto."],
      ["Alu oder Glasfaser?", "Aluminium ist leicht und günstig; Glasfaser leitet keinen Strom und ist daher bei Elektroarbeiten sicherer."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "hometrainer-kaufen-schweiz", icon: "🚴", h1: "Hometrainer kaufen in der Schweiz",
    title: "Hometrainer kaufen Schweiz — Heimrad im Vergleich | aban",
    desc: "Hometrainer kaufen in der Schweiz: Heimtrainer nach Widerstand, Komfort, Stabilität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Hometrainer", ctaLabel: "Hometrainer ansehen",
    intro: "Radfahren zu Hause: Hier vergleichst du Hometrainer nach Widerstandssystem, Komfort, Stabilität und Preis.",
    tips: [
      ["Widerstand", "Magnetbremsen laufen leise und gleichmässig; mehr Schwungmasse sorgt für einen runden Tritt."],
      ["Komfort", "Verstellbarer Sattel/Lenker, ein guter Computer und (optional) App-Anbindung erhöhen die Motivation."],
      ["Stabilität", "Auf ein zulässiges Körpergewicht und einen stabilen Stand achten."],
    ],
    faq: [
      ["Hometrainer oder Ergometer?", "Ein Ergometer zeigt die Leistung genauer in Watt und eignet sich für gezieltes Training; einfache Hometrainer reichen für allgemeine Fitness."],
      ["Worauf achten?", "Auf ein leises Widerstandssystem, genug Schwungmasse, Verstellbarkeit und die zulässige Belastung achten."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "rudergeraet-kaufen-schweiz", icon: "🚣", h1: "Rudergerät kaufen in der Schweiz",
    title: "Rudergerät kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Rudergerät kaufen in der Schweiz: Rudergeräte nach Widerstandsart, Lauf, Platzbedarf und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Rudergerät", ctaLabel: "Rudergeräte ansehen",
    intro: "Ganzkörpertraining zu Hause: Hier vergleichst du Rudergeräte nach Widerstandsart, Laufeigenschaften, Platzbedarf und Preis.",
    tips: [
      ["Widerstandsart", "Luft- und Wasserwiderstand fühlen sich natürlich an, Magnetbremsen sind leise und platzsparend."],
      ["Lauf & Komfort", "Ein gleichmässiger Zug, eine bequeme Sitzschiene und ein guter Trainingscomputer machen das Training angenehmer."],
      ["Platz", "Viele Modelle lassen sich aufrecht verstauen — die Masse im aufgeklappten Zustand beachten."],
    ],
    faq: [
      ["Welcher Widerstand ist am besten?", "Wasser/Luft fühlen sich realistisch an und sind eher laut; Magnetbremsen sind leise und platzsparend — ideal für die Wohnung."],
      ["Ist Rudern gelenkschonend?", "Bei sauberer Technik ja — die Bewegung trainiert den ganzen Körper und belastet die Gelenke wenig."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "hantelbank-kaufen-schweiz", icon: "🏋️", h1: "Hantelbank kaufen in der Schweiz",
    title: "Hantelbank kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Hantelbank kaufen in der Schweiz: Hantelbänke nach Belastbarkeit, Verstellbarkeit, Zubehör und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Hantelbank", ctaLabel: "Hantelbänke ansehen",
    intro: "Krafttraining zu Hause: Hier vergleichst du Hantelbänke nach Belastbarkeit, Verstellbarkeit, Zubehör und Preis.",
    tips: [
      ["Belastbarkeit", "Auf das maximale Gewicht (Körper plus Hanteln) achten und etwas Reserve einplanen."],
      ["Verstellbarkeit", "Mehrere Rückenlehnen-Positionen (flach, schräg, negativ) erweitern die Übungen."],
      ["Stabilität & Zubehör", "Ein stabiler Rahmen und optionale Beinfixierung oder Langhantelablage erhöhen den Nutzen."],
    ],
    faq: [
      ["Worauf beim Kauf achten?", "Auf hohe Belastbarkeit, eine verstellbare Rückenlehne und einen stabilen, kippsicheren Rahmen achten."],
      ["Flachbank oder verstellbar?", "Eine verstellbare Bank ermöglicht mehr Übungen (Schrägbank, Schulterdrücken); eine reine Flachbank ist günstiger und kompakter."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "kettlebell-kaufen-schweiz", icon: "🪨", h1: "Kettlebell kaufen in der Schweiz",
    title: "Kettlebell kaufen Schweiz — Gewicht & Material | aban",
    desc: "Kettlebell kaufen in der Schweiz: Kugelhanteln nach Gewicht, Material, Griff und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kettlebell", ctaLabel: "Kettlebells ansehen",
    intro: "Funktionelles Training: Hier vergleichst du Kettlebells nach Gewicht, Material, Griff und Preis.",
    tips: [
      ["Einstiegsgewicht", "Anfängerinnen starten oft mit leichteren Gewichten, Fortgeschrittene mit schwereren — lieber zwei Gewichte besorgen."],
      ["Material", "Gusseisen ist robust, vinylummantelte Kettlebells schonen den Boden. Ein verstellbares Modell spart Platz."],
      ["Griff", "Ein glatter, ausreichend breiter Griff liegt gut in der Hand und schont die Haut bei Schwüngen."],
    ],
    faq: [
      ["Welches Gewicht zum Einstieg?", "Viele Einsteiger wählen ein leichteres Gewicht für die Technik und ein etwas schwereres für Schwünge — am besten zwei Stufen."],
      ["Gusseisen oder verstellbar?", "Gusseisen ist robust und günstig pro Stück; eine verstellbare Kettlebell ersetzt mehrere Gewichte und spart Platz."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "yogamatte-kaufen-schweiz", icon: "🧘", h1: "Yogamatte kaufen in der Schweiz",
    title: "Yogamatte kaufen Schweiz — Dicke & Material | aban",
    desc: "Yogamatte kaufen in der Schweiz: Matten nach Dicke, Material, Rutschfestigkeit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Yogamatte", ctaLabel: "Yogamatten ansehen",
    intro: "Sicherer Halt bei Yoga & Gymnastik: Hier vergleichst du Yogamatten nach Dicke, Material, Rutschfestigkeit und Preis.",
    tips: [
      ["Dicke", "Dünne Matten geben mehr Standstabilität, dickere mehr Polsterung für die Gelenke."],
      ["Material", "TPE und Naturkautschuk sind rutschfest und schadstoffarm; auf Geruch und Pflegehinweise achten."],
      ["Grösse & Pflege", "Genug Länge für die Körpergrösse wählen; abwischbare Matten sind hygienischer."],
    ],
    faq: [
      ["Wie dick sollte die Matte sein?", "Für Yoga mit viel Balance dünner (mehr Standstabilität), für Gymnastik/Pilates dicker (mehr Polster für die Gelenke)."],
      ["Welches Material ist gut?", "TPE und Naturkautschuk gelten als rutschfest und schadstoffarm — achte auf entsprechende Angaben des Herstellers."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "kuehlbox-kaufen-schweiz", icon: "🧊", h1: "Kühlbox kaufen in der Schweiz",
    title: "Kühlbox kaufen Schweiz — passiv, elektrisch & Kompressor | aban",
    desc: "Kühlbox kaufen in der Schweiz: passive, elektrische und Kompressor-Kühlboxen nach Kühlung, Volumen und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kühlbox", ctaLabel: "Kühlboxen ansehen",
    intro: "Kühl unterwegs: Hier vergleichst du Kühlboxen (passiv, elektrisch, Kompressor) nach Kühlleistung, Volumen und Preis.",
    tips: [
      ["Typ", "Passivboxen kühlen mit Kühlakkus, elektrische über 12 V, Kompressorboxen kühlen aktiv wie ein Kühlschrank."],
      ["Volumen", "Die Grösse nach Personenzahl und Reisedauer wählen; höhere Boxen fassen stehende Flaschen."],
      ["Stromquelle", "Für Camping und Auto auf 12-V-Betrieb achten; Kompressorboxen kühlen unabhängig von der Aussentemperatur."],
    ],
    faq: [
      ["Welche Kühlbox für Camping?", "Für kurze Ausflüge reicht eine Passiv- oder 12-V-Box; für mehrere Tage oder Hitze ist eine Kompressorbox die beste Wahl."],
      ["Wie lange hält eine Passivbox kühl?", "Das hängt von Isolierung, Kühlakkus und Aussentemperatur ab — gute Boxen halten den Inhalt etwa einen Tag kühl."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "gaskocher-kaufen-schweiz", icon: "🔥", h1: "Gaskocher kaufen in der Schweiz",
    title: "Gaskocher kaufen Schweiz — Camping & Outdoor | aban",
    desc: "Gaskocher kaufen in der Schweiz: Camping-Gaskocher nach Leistung, Kartuschentyp, Gewicht und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gaskocher", ctaLabel: "Gaskocher ansehen",
    intro: "Kochen unterwegs: Hier vergleichst du Gaskocher nach Leistung, Kartuschentyp, Gewicht und Preis.",
    tips: [
      ["Leistung", "Mehr Leistung kocht schneller; ein Windschutz hilft draussen, die Hitze zu halten."],
      ["Kartuschentyp", "Auf den passenden Anschluss (Schraub-, Stech- oder Ventilkartusche) achten — Verfügbarkeit unterwegs einplanen."],
      ["Gewicht & Packmass", "Für Trekking leichte, kompakte Kocher; für Camping mit Auto auch grössere Zweiflammkocher."],
    ],
    faq: [
      ["Welche Gaskartusche brauche ich?", "Das hängt vom Kocher ab (Schraub-, Stech- oder Ventilkartusche). Wähle einen verbreiteten Typ, damit du unterwegs Nachschub findest."],
      ["Gaskocher im Zelt verwenden?", "Wegen Brand- und Erstickungsgefahr nie in geschlossenen Räumen oder Zelten kochen — immer im Freien mit guter Belüftung."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "stirnlampe-kaufen-schweiz", icon: "🔦", h1: "Stirnlampe kaufen in der Schweiz",
    title: "Stirnlampe kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Stirnlampe kaufen in der Schweiz: Stirnlampen nach Helligkeit, Akku, Gewicht und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Stirnlampe", ctaLabel: "Stirnlampen ansehen",
    intro: "Licht und Hände frei: Hier vergleichst du Stirnlampen nach Helligkeit, Akkulaufzeit, Gewicht und Preis.",
    tips: [
      ["Helligkeit", "Lumen sagen, wie hell die Lampe ist; mehrere Stufen sparen Akku und blenden weniger."],
      ["Akku vs. Batterie", "Akku-Modelle sind günstiger im Betrieb, Batterien lassen sich unterwegs einfach tauschen."],
      ["Komfort", "Ein leichtes Gehäuse, ein bequemes Band und Spritzwasserschutz sind für Outdoor wichtig."],
    ],
    faq: [
      ["Wie viel Lumen brauche ich?", "Für Camping und Wege reichen moderate Werte; fürs Laufen oder Trailrunning im Dunkeln sind hellere Lampen mit Fernlicht sinnvoll."],
      ["Akku oder Batterie?", "Akku ist günstiger und umweltfreundlicher im Dauerbetrieb; Batterien sind praktisch, wenn du unterwegs keinen Strom zum Laden hast."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "fernglas-kaufen-schweiz", icon: "🔭", h1: "Fernglas kaufen in der Schweiz",
    title: "Fernglas kaufen Schweiz — Vergrösserung & Optik | aban",
    desc: "Fernglas kaufen in der Schweiz: Ferngläser nach Vergrösserung, Objektivgrösse, Optik und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Fernglas", ctaLabel: "Ferngläser ansehen",
    intro: "Natur und Sport näher ran: Hier vergleichst du Ferngläser nach Vergrösserung, Objektiv, Optik und Preis.",
    tips: [
      ["Vergrösserung", "8-fach ist für Wandern/Tiere gut ruhighaltbar, 10-fach zeigt mehr Details, wackelt aber stärker."],
      ["Objektivgrösse", "Grössere Objektive (mm) sammeln mehr Licht — besser in der Dämmerung, aber schwerer."],
      ["Optik & Schutz", "Mehrfachvergütete Gläser und ein wasserdichtes Gehäuse verbessern Bild und Haltbarkeit."],
    ],
    faq: [
      ["Was bedeutet z. B. 8x42?", "Die erste Zahl ist die Vergrösserung (8-fach), die zweite der Objektivdurchmesser in mm (42 mm) — mehr mm bedeutet mehr Lichtstärke."],
      ["8-fach oder 10-fach?", "8-fach lässt sich ruhiger halten und hat ein grösseres Sichtfeld; 10-fach zeigt mehr Details, verstärkt aber das Zittern der Hände."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "dartscheibe-kaufen-schweiz", icon: "🎯", h1: "Dartscheibe kaufen in der Schweiz",
    title: "Dartscheibe kaufen Schweiz — Steel & E-Dart | aban",
    desc: "Dartscheibe kaufen in der Schweiz: Steel- und elektronische Dartscheiben nach Typ, Qualität und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Dartscheibe", ctaLabel: "Dartscheiben ansehen",
    intro: "Dart für zu Hause: Hier vergleichst du Dartscheiben (Steel-Dart, E-Dart) nach Typ, Qualität und Preis.",
    tips: [
      ["Typ", "Steel-Dart (Sisal) mit Metallspitzen ist klassisch, E-Dart mit Softtips zählt automatisch und ist familienfreundlich."],
      ["Qualität", "Bei Sisal eine dichte, selbstheilende Oberfläche und dünne Drähte für weniger Abpraller wählen."],
      ["Aufbau", "Auf den richtigen Abstand und die Höhe achten; eine Rückwand schützt die Wand vor Einstichen."],
    ],
    faq: [
      ["Steel-Dart oder E-Dart?", "Steel-Dart ist der klassische Sport mit Metallspitzen; E-Dart zählt automatisch, ist leiser und mit Softtips sicherer für Familien."],
      ["Wie hoch hängt eine Dartscheibe?", "Die Bullseye-Mitte hängt nach offiziellen Regeln auf 1,73 m, der Abwurfabstand beträgt 2,37 m."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "lattenrost-kaufen-schweiz", icon: "🛏️", h1: "Lattenrost kaufen in der Schweiz",
    title: "Lattenrost kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Lattenrost kaufen in der Schweiz: Lattenroste nach Verstellbarkeit, Härte, Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Lattenrost", ctaLabel: "Lattenroste ansehen",
    intro: "Gute Basis für die Matratze: Hier vergleichst du Lattenroste nach Verstellbarkeit, Härteeinstellung, Grösse und Preis.",
    tips: [
      ["Verstellbarkeit", "Verstellbare Kopf- und Fussteile sind bequem zum Lesen; motorisierte Modelle bieten mehr Komfort."],
      ["Härtezonen", "Schiebe-Härteregler im Beckenbereich passen die Stützkraft an."],
      ["Passung", "Lattenrost und Matratze müssen zueinander passen — die Grösse und den Lattenabstand beachten."],
    ],
    faq: [
      ["Verstellbar oder starr?", "Ein starrer Rost ist günstig und reicht für viele; verstellbare Roste sind bequemer zum Lesen oder bei Rückenbeschwerden."],
      ["Passt jeder Lattenrost zu jeder Matratze?", "Nicht immer — der Lattenabstand sollte zur Matratze passen, damit sie gut gestützt wird und nicht durchhängt."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "boxspringbett-kaufen-schweiz", icon: "🛏️", h1: "Boxspringbett kaufen in der Schweiz",
    title: "Boxspringbett kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Boxspringbett kaufen in der Schweiz: Boxspringbetten nach Aufbau, Härte, Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Boxspringbett", ctaLabel: "Boxspringbetten ansehen",
    intro: "Hoher Liegekomfort: Hier vergleichst du Boxspringbetten nach Aufbau, Härtegrad, Grösse und Preis.",
    tips: [
      ["Aufbau", "Box (Untermatratze), Matratze und Topper bilden zusammen den Komfort — auf gute Federung achten."],
      ["Härtegrad", "Den Härtegrad nach Gewicht und Schlafposition wählen; bei Paaren sind getrennte Härten möglich."],
      ["Einstiegshöhe", "Boxspringbetten sind höher — angenehm zum Ein- und Aussteigen, die Höhe vorher abschätzen."],
    ],
    faq: [
      ["Was ist der Vorteil eines Boxspringbetts?", "Die mehrlagige Federung bietet hohen Liegekomfort und eine angenehme, höhere Einstiegshöhe."],
      ["Braucht es einen Lattenrost?", "Nein — die federnde Box ersetzt den klassischen Lattenrost."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "sessel-kaufen-schweiz", icon: "🪑", h1: "Sessel kaufen in der Schweiz",
    title: "Sessel kaufen Schweiz — Relax, Ohren- & Drehsessel | aban",
    desc: "Sessel kaufen in der Schweiz: Relax-, Ohren- und Drehsessel nach Komfort, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sessel", ctaLabel: "Sessel ansehen",
    intro: "Gemütlich sitzen: Hier vergleichst du Sessel (Relax, Ohren, Dreh) nach Komfort, Material und Preis.",
    tips: [
      ["Typ", "Relaxsessel mit Liegefunktion zum Entspannen, Ohrensessel für Rückenhalt, Drehsessel für Flexibilität."],
      ["Material", "Stoff ist gemütlich und warm, Leder/Kunstleder leicht zu reinigen — auf die Pflege achten."],
      ["Komfort", "Sitzhöhe, Polsterung und (bei Relaxsesseln) eine stabile Mechanik prüfen."],
    ],
    faq: [
      ["Welcher Sessel zum Entspannen?", "Ein Relaxsessel mit verstellbarer Rückenlehne und Fussstütze ist ideal zum Lesen oder Fernsehen."],
      ["Stoff oder Leder?", "Stoff ist warm und gemütlich, Leder/Kunstleder lässt sich leichter reinigen — die Wahl hängt von Stil und Pflegeaufwand ab."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "gamingstuhl-kaufen-schweiz", icon: "🎮", h1: "Gamingstuhl kaufen in der Schweiz",
    title: "Gamingstuhl kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Gamingstuhl kaufen in der Schweiz: Gaming-Stühle nach Ergonomie, Verstellbarkeit, Belastbarkeit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Gamingstuhl", ctaLabel: "Gamingstühle ansehen",
    intro: "Bequem zocken und arbeiten: Hier vergleichst du Gamingstühle nach Ergonomie, Verstellbarkeit, Belastbarkeit und Preis.",
    tips: [
      ["Ergonomie", "Verstellbare Armlehnen, Lordosenstütze und Nackenkissen entlasten bei langem Sitzen."],
      ["Verstellbarkeit", "Sitzhöhe, Neigung und (oft) eine weite Rückenneigung erhöhen den Komfort."],
      ["Belastbarkeit & Grösse", "Auf das zulässige Gewicht und eine zur Körpergrösse passende Sitzfläche achten."],
    ],
    faq: [
      ["Gamingstuhl oder Bürostuhl?", "Bürostühle sind oft ergonomischer fürs reine Arbeiten; Gamingstühle bieten Sportsitz-Look und viel Verstellbarkeit — beide gibt es in guter Qualität."],
      ["Worauf bei langer Nutzung achten?", "Auf Lordosenstütze, verstellbare Armlehnen und eine atmungsaktive, hochwertige Polsterung achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "sideboard-kaufen-schweiz", icon: "🗄️", h1: "Sideboard kaufen in der Schweiz",
    title: "Sideboard kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Sideboard kaufen in der Schweiz: Sideboards nach Grösse, Stauraum, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sideboard", ctaLabel: "Sideboards ansehen",
    intro: "Stauraum mit Stil: Hier vergleichst du Sideboards nach Grösse, Stauraum, Material und Preis.",
    tips: [
      ["Grösse", "Die Breite und Tiefe zum Raum passend wählen; genug Abstand für offene Türen/Schubladen einplanen."],
      ["Stauraum", "Türen, Schubladen und offene Fächer kombinieren — je nach Bedarf."],
      ["Material", "Massivholz wirkt hochwertig, beschichtete Platten sind günstiger und pflegeleicht."],
    ],
    faq: [
      ["Wofür eignet sich ein Sideboard?", "Als Stauraum im Wohn- oder Esszimmer, als TV-Unterlage oder als Ablage im Flur."],
      ["Welche Grösse passt?", "Miss den verfügbaren Platz aus und plane Abstand für geöffnete Türen und Schubladen ein."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "buecherregal-kaufen-schweiz", icon: "📚", h1: "Bücherregal kaufen in der Schweiz",
    title: "Bücherregal kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Bücherregal kaufen in der Schweiz: Bücherregale nach Grösse, Belastbarkeit, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bücherregal", ctaLabel: "Bücherregale ansehen",
    intro: "Platz für Bücher und Deko: Hier vergleichst du Bücherregale nach Grösse, Belastbarkeit, Material und Preis.",
    tips: [
      ["Grösse & Fächer", "Genug Fächer und Höhe für deine Bücher einplanen; verstellbare Böden sind flexibel."],
      ["Belastbarkeit", "Bücher sind schwer — auf stabile Böden und eine sichere Wandbefestigung achten."],
      ["Material", "Massivholz ist robust, beschichtete Platten günstiger; offene Regale wirken leichter."],
    ],
    faq: [
      ["Worauf bei der Stabilität achten?", "Bücher wiegen viel — wähle stabile, nicht zu lange Böden und befestige hohe Regale an der Wand (Kippschutz)."],
      ["Offen oder mit Türen?", "Offene Regale wirken leichter und sind griffbereit; Türen schützen vor Staub und verstecken Unordnung."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "schuhschrank-kaufen-schweiz", icon: "👟", h1: "Schuhschrank kaufen in der Schweiz",
    title: "Schuhschrank kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Schuhschrank kaufen in der Schweiz: Schuhschränke nach Kapazität, Bauform, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Schuhschrank", ctaLabel: "Schuhschränke ansehen",
    intro: "Ordnung im Flur: Hier vergleichst du Schuhschränke nach Kapazität, Bauform, Material und Preis.",
    tips: [
      ["Kapazität", "Die Zahl der Paare realistisch einschätzen; Kippfächer sparen Platz, fassen aber weniger hohe Schuhe."],
      ["Bauform", "Schmale Kippschränke für enge Flure, breitere Schränke mit Böden für mehr und höhere Schuhe."],
      ["Belüftung", "Offene oder belüftete Fächer beugen Geruch vor; eine Sitzbank obenauf ist praktisch."],
    ],
    faq: [
      ["Wie viele Schuhe passen rein?", "Kippfächer fassen pro Klappe mehrere flache Paare, aber weniger Stiefel — die Herstellerangabe ist ein Richtwert."],
      ["Schmal oder breit?", "Für enge Flure sind flache Kippschränke ideal; wer viele oder hohe Schuhe hat, fährt mit Böden besser."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "garderobe-kaufen-schweiz", icon: "🧥", h1: "Garderobe kaufen in der Schweiz",
    title: "Garderobe kaufen Schweiz — Wand & Stand | aban",
    desc: "Garderobe kaufen in der Schweiz: Wand- und Standgarderoben nach Stauraum, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Garderobe", ctaLabel: "Garderoben ansehen",
    intro: "Ordnung für Jacken & Co.: Hier vergleichst du Garderoben (Wand, Stand) nach Stauraum, Material und Preis.",
    tips: [
      ["Bauform", "Wandgarderoben sparen Platz, Standgarderoben sind flexibel und brauchen keine Montage."],
      ["Funktionen", "Haken, Ablage für Mützen, ein Schirmständer und eine Sitzbank erhöhen den Nutzen."],
      ["Material & Halt", "Auf stabile Haken und (bei Wandmontage) eine sichere Befestigung achten."],
    ],
    faq: [
      ["Wand- oder Standgarderobe?", "Wandgarderoben sparen Platz im engen Flur; Standgarderoben sind flexibel und lassen sich ohne Bohren aufstellen."],
      ["Worauf achten?", "Auf genug Haken, stabile Befestigung und — bei Bedarf — eine Ablage oder Sitzgelegenheit achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "nachttisch-kaufen-schweiz", icon: "🛋️", h1: "Nachttisch kaufen in der Schweiz",
    title: "Nachttisch kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Nachttisch kaufen in der Schweiz: Nachttische nach Höhe, Stauraum, Material und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Nachttisch", ctaLabel: "Nachttische ansehen",
    intro: "Praktisch neben dem Bett: Hier vergleichst du Nachttische nach Höhe, Stauraum, Material und Preis.",
    tips: [
      ["Höhe", "Die Höhe sollte zur Matratzenoberkante passen, damit alles bequem erreichbar ist."],
      ["Stauraum", "Eine Schublade versteckt Kleinkram, offene Fächer sind griffbereit. Eine Ablagefläche für Lampe und Buch einplanen."],
      ["Stil & Material", "Den Nachttisch farblich aufs Bett abstimmen; beschichtete Oberflächen sind pflegeleicht."],
    ],
    faq: [
      ["Wie hoch sollte ein Nachttisch sein?", "Idealerweise etwa auf Matratzenhöhe, damit Lampe, Brille und Glas bequem erreichbar sind."],
      ["Mit Schublade oder offen?", "Eine Schublade hält Kleinkram verborgen; offene Fächer sind schneller zugänglich — je nach Ordnungsvorliebe."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "sonnenliege-kaufen-schweiz", icon: "🌞", h1: "Sonnenliege kaufen in der Schweiz",
    title: "Sonnenliege kaufen Schweiz — Garten & Balkon | aban",
    desc: "Sonnenliege kaufen in der Schweiz: Sonnenliegen nach Material, Verstellbarkeit, Komfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sonnenliege", ctaLabel: "Sonnenliegen ansehen",
    intro: "Entspannen im Freien: Hier vergleichst du Sonnenliegen nach Material, Verstellbarkeit, Komfort und Preis.",
    tips: [
      ["Material", "Aluminium ist leicht und rostfrei, Holz wirkt edel, Kunststoff ist günstig — auf Wetterfestigkeit achten."],
      ["Verstellbarkeit", "Mehrere Rückenpositionen und (optional) Rollen erhöhen den Komfort."],
      ["Komfort & Lagerung", "Eine Auflage macht die Liege bequemer; klappbare Modelle lassen sich platzsparend verstauen."],
    ],
    faq: [
      ["Welches Material ist wetterfest?", "Aluminium und hochwertiger Kunststoff trotzen dem Wetter gut; Holz braucht etwas Pflege und Geflecht sollte UV-beständig sein."],
      ["Worauf beim Komfort achten?", "Auf eine stabile Verstellmechanik, eine bequeme Auflage und — bei Bedarf — Rollen zum Verschieben achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "sommerreifen-kaufen-schweiz", icon: "🛞", h1: "Sommerreifen kaufen in der Schweiz",
    title: "Sommerreifen kaufen Schweiz — Grösse & Vergleich | aban",
    desc: "Sommerreifen kaufen in der Schweiz: Reifen nach Grösse, Labelwerten, Marke und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Sommerreifen", ctaLabel: "Sommerreifen ansehen",
    intro: "Sicher durch den Sommer: Hier vergleichst du Sommerreifen nach Grösse, EU-Labelwerten, Marke und Preis.",
    tips: [
      ["Reifengrösse", "Die richtige Grösse steht in der Fahrzeugzulassung und auf der Reifenflanke (z. B. 205/55 R16)."],
      ["EU-Label", "Achte auf Nasshaftung, Rollwiderstand (Verbrauch) und Geräusch — die Werte stehen auf dem Reifenlabel."],
      ["Alter & Profil", "Neue Reifen mit aktuellem Herstellungsdatum (DOT) wählen; genug Profiltiefe ist Pflicht."],
    ],
    faq: [
      ["Woher weiss ich die richtige Reifengrösse?", "Sie steht im Fahrzeugausweis und auf der Reifenflanke — z. B. 205/55 R16. Nur freigegebene Grössen montieren."],
      ["Was sagt das EU-Reifenlabel?", "Es bewertet Nasshaftung, Rollwiderstand (Spritverbrauch) und Abrollgeräusch — eine gute Orientierung beim Vergleich."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "autobatterie-kaufen-schweiz", icon: "🔋", h1: "Autobatterie kaufen in der Schweiz",
    title: "Autobatterie kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Autobatterie kaufen in der Schweiz: Starterbatterien nach Kapazität, Kaltstartstrom, Typ und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Autobatterie", ctaLabel: "Autobatterien ansehen",
    intro: "Zuverlässiger Start: Hier vergleichst du Autobatterien nach Kapazität, Kaltstartstrom, Typ und Preis.",
    tips: [
      ["Passung", "Kapazität (Ah) und Kaltstartstrom (A) müssen zum Fahrzeug passen — die Werte der alten Batterie übernehmen."],
      ["Typ", "Fahrzeuge mit Start-Stopp brauchen meist AGM- oder EFB-Batterien — nicht durch eine Standardbatterie ersetzen."],
      ["Einbau", "Auf die richtige Polung und die Bauform/Grösse achten; beim Wechsel die Bordelektronik beachten."],
    ],
    faq: [
      ["Welche Batterie passt zu meinem Auto?", "Übernimm Kapazität (Ah), Kaltstartstrom (A), Bauform und Typ von der alten Batterie oder aus den Fahrzeugangaben."],
      ["Brauche ich AGM oder EFB?", "Autos mit Start-Stopp-System benötigen in der Regel AGM- oder EFB-Batterien — eine einfache Standardbatterie hält dort nicht lange."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "fahrradtraeger-kaufen-schweiz", icon: "🚲", h1: "Fahrradträger kaufen in der Schweiz",
    title: "Fahrradträger kaufen Schweiz — Kupplung, Heck & Dach | aban",
    desc: "Fahrradträger kaufen in der Schweiz: Kupplungs-, Heck- und Dachträger nach Radzahl, Last und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Fahrradträger", ctaLabel: "Fahrradträger ansehen",
    intro: "Velos sicher transportieren: Hier vergleichst du Fahrradträger (Kupplung, Heck, Dach) nach Radzahl, Last und Preis.",
    tips: [
      ["Bauart", "Kupplungsträger sind bequem zu beladen und gut für E-Bikes; Heckträger sind günstiger, Dachträger erhöhen den Verbrauch."],
      ["Tragfähigkeit", "Auf die Stützlast der Kupplung und das zulässige Gewicht achten — E-Bikes sind schwer."],
      ["Sicherheit", "Beleuchtung, Kennzeichenhalter und abschliessbare Halterungen sind wichtig und teils Vorschrift."],
    ],
    faq: [
      ["Welcher Träger für E-Bikes?", "Wegen des Gewichts eignen sich Kupplungsträger am besten — auf die zulässige Stützlast und das Gesamtgewicht achten."],
      ["Was ist bei der Beleuchtung Pflicht?", "Heck- und Kupplungsträger müssen Rücklichter und einen gut sichtbaren Kennzeichenhalter haben — das ist vorgeschrieben."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "anhaengerkupplung-kaufen-schweiz", icon: "🚗", h1: "Anhängerkupplung kaufen in der Schweiz",
    title: "Anhängerkupplung kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Anhängerkupplung kaufen in der Schweiz: starre, abnehmbare und schwenkbare Kupplungen nach Last und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Anhängerkupplung", ctaLabel: "Anhängerkupplungen ansehen",
    intro: "Anhänger und Träger ziehen: Hier vergleichst du Anhängerkupplungen (starr, abnehmbar, schwenkbar) nach Last und Preis.",
    tips: [
      ["Bauart", "Starre Kupplungen sind günstig, abnehmbare unauffällig, schwenkbare besonders komfortabel."],
      ["Last", "Anhängelast und Stützlast müssen zum Fahrzeug passen — die Werte aus den Fahrzeugpapieren übernehmen."],
      ["Montage", "Der Einbau (inkl. Elektrosatz) gehört in der Regel in eine Fachwerkstatt; die Zulassung beachten."],
    ],
    faq: [
      ["Starr, abnehmbar oder schwenkbar?", "Starr ist am günstigsten; abnehmbar verschwindet bei Nichtgebrauch; schwenkbar ist am komfortabelsten — die Wahl hängt von Budget und Optik ab."],
      ["Kann ich die Kupplung selbst montieren?", "Wegen Elektrosatz und Zulassung gehört der Einbau meist in eine Fachwerkstatt — danach muss die Änderung korrekt eingetragen sein."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "kindersitz-auto-kaufen-schweiz", icon: "🚸", h1: "Kindersitz fürs Auto kaufen in der Schweiz",
    title: "Auto-Kindersitz kaufen Schweiz — Normen & Vergleich | aban",
    desc: "Auto-Kindersitz kaufen in der Schweiz: Kindersitze nach Norm, Grösse/Gewicht, Befestigung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kindersitz Auto", ctaLabel: "Kindersitze ansehen",
    intro: "Sicher unterwegs mit Kind: Hier vergleichst du Auto-Kindersitze nach Norm, Grösse/Gewicht, Befestigung und Preis.",
    tips: [
      ["Norm & Grösse", "Sitze nach aktueller Norm (z. B. i-Size) und passend zu Grösse/Gewicht des Kindes wählen."],
      ["Befestigung", "Isofix erleichtert den sicheren Einbau; sonst sorgfältig mit dem Gurt befestigen."],
      ["Rückwärts fahren", "Kleinkinder möglichst lange rückwärtsgerichtet transportieren — das ist sicherer."],
    ],
    faq: [
      ["Welche Norm sollte der Sitz haben?", "Achte auf eine aktuelle Zulassung (z. B. i-Size/UN R129); der Sitz muss zu Grösse und Gewicht des Kindes passen."],
      ["Ist Isofix Pflicht?", "Nein, aber Isofix macht den Einbau sicherer und einfacher. Ohne Isofix den Sitz sorgfältig mit dem Fahrzeuggurt sichern."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "motoroel-kaufen-schweiz", icon: "🛢️", h1: "Motoröl kaufen in der Schweiz",
    title: "Motoröl kaufen Schweiz — Viskosität & Freigaben | aban",
    desc: "Motoröl kaufen in der Schweiz: Öle nach Viskosität, Herstellerfreigabe, Gebinde und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Motoröl", ctaLabel: "Motoröle ansehen",
    intro: "Das richtige Öl für den Motor: Hier vergleichst du Motoröle nach Viskosität, Freigaben, Gebindegrösse und Preis.",
    tips: [
      ["Viskosität", "Die passende Klasse (z. B. 5W-30) steht im Fahrzeughandbuch — nicht einfach abweichen."],
      ["Freigabe", "Wichtiger als die Marke ist die Herstellerfreigabe/Spezifikation für deinen Motor."],
      ["Menge", "Die benötigte Füllmenge prüfen und ein passendes Gebinde wählen — Restöl lässt sich später nachfüllen."],
    ],
    faq: [
      ["Welche Viskosität braucht mein Auto?", "Die richtige Klasse (z. B. 5W-30 oder 0W-20) steht im Fahrzeughandbuch — sie sollte genau eingehalten werden."],
      ["Ist die Marke wichtig?", "Entscheidender ist die passende Herstellerfreigabe/Spezifikation. Erfüllt ein Öl diese, ist die Marke zweitrangig."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "scheibenwischer-kaufen-schweiz", icon: "🌧️", h1: "Scheibenwischer kaufen in der Schweiz",
    title: "Scheibenwischer kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Scheibenwischer kaufen in der Schweiz: Wischerblätter nach Länge, Bauart, Befestigung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Scheibenwischer", ctaLabel: "Scheibenwischer ansehen",
    intro: "Klare Sicht bei Regen: Hier vergleichst du Scheibenwischer nach Länge, Bauart, Befestigung und Preis.",
    tips: [
      ["Länge", "Die richtige Länge je Seite (oft unterschiedlich) ermitteln — Herstellerlisten helfen bei der Auswahl."],
      ["Bauart", "Flachbalkenwischer liegen gleichmässig an, klassische Bügelwischer sind günstiger."],
      ["Befestigung", "Auf den passenden Adapter/Anschluss für dein Fahrzeug achten."],
    ],
    faq: [
      ["Welche Wischerlänge brauche ich?", "Fahrer- und Beifahrerseite haben oft unterschiedliche Längen — die richtigen Masse stehen in Fahrzeug- oder Herstellerlisten."],
      ["Wie oft wechseln?", "Wenn die Wischer schmieren oder streifen — meist etwa einmal im Jahr. Klare Sicht ist sicherheitsrelevant."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "dashcam-kaufen-schweiz", icon: "🎥", h1: "Dashcam kaufen in der Schweiz",
    title: "Dashcam kaufen Schweiz — Vergleich & Datenschutz | aban",
    desc: "Dashcam kaufen in der Schweiz: Auto-Kameras nach Auflösung, Funktionen, Datenschutz und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Dashcam", ctaLabel: "Dashcams ansehen",
    intro: "Aufnahmen während der Fahrt: Hier vergleichst du Dashcams nach Auflösung, Funktionen, Datenschutz und Preis.",
    tips: [
      ["Auflösung", "Höhere Auflösung zeigt Kennzeichen und Details schärfer; ein gutes Nachtbild ist wichtig."],
      ["Funktionen", "Loop-Aufnahme, Parküberwachung und GPS sind praktisch; eine Heckkamera erweitert die Sicht."],
      ["Datenschutz", "In der Schweiz gelten strenge Datenschutzregeln — Daueraufnahmen können heikel sein; nur zulässig nutzen und speichern."],
    ],
    faq: [
      ["Sind Dashcams in der Schweiz erlaubt?", "Der Einsatz ist datenschutzrechtlich heikel: permanentes Filmen anderer kann problematisch sein. Informiere dich über die geltenden Regeln und nutze die Aufnahmen zurückhaltend."],
      ["Worauf bei der Qualität achten?", "Auf eine ausreichende Auflösung und vor allem ein gutes Nachtbild achten, damit Details und Kennzeichen erkennbar bleiben."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "standheizung-kaufen-schweiz", icon: "♨️", h1: "Standheizung kaufen in der Schweiz",
    title: "Standheizung kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Standheizung kaufen in der Schweiz: Luft- und Wasserstandheizungen nach Typ, Leistung, Steuerung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Standheizung", ctaLabel: "Standheizungen ansehen",
    intro: "Warmes Auto im Winter: Hier vergleichst du Standheizungen (Luft, Wasser) nach Typ, Leistung, Steuerung und Preis.",
    tips: [
      ["Typ", "Luftheizungen wärmen den Innenraum, Wasserheizungen zusätzlich Motor und Scheiben (Enteisung)."],
      ["Leistung", "Die Leistung zur Fahrzeuggrösse passend wählen — zu schwache Geräte brauchen lange."],
      ["Steuerung & Einbau", "Fernbedienung oder App-Steuerung sind komfortabel; der Einbau gehört meist in eine Fachwerkstatt."],
    ],
    faq: [
      ["Luft- oder Wasserstandheizung?", "Luftheizungen wärmen schnell den Innenraum; Wasserheizungen tauen zusätzlich Scheiben ab und wärmen den Motor vor — sind aber aufwendiger."],
      ["Kann ich sie selbst einbauen?", "Der Einbau ist anspruchsvoll (Kraftstoff, Elektrik, Abgas) und gehört in der Regel in eine Fachwerkstatt."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "autostaubsauger-kaufen-schweiz", icon: "🚙", h1: "Autostaubsauger kaufen in der Schweiz",
    title: "Autostaubsauger kaufen Schweiz — Akku & 12 V | aban",
    desc: "Autostaubsauger kaufen in der Schweiz: Akku- und 12-V-Sauger nach Saugkraft, Zubehör und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Autostaubsauger", ctaLabel: "Autostaubsauger ansehen",
    intro: "Sauberer Innenraum: Hier vergleichst du Autostaubsauger (Akku, 12 V) nach Saugkraft, Zubehör und Preis.",
    tips: [
      ["Stromquelle", "12-V-Sauger laufen über den Zigarettenanzünder, Akku-Modelle sind kabellos und flexibler."],
      ["Saugkraft", "Genug Saugleistung für Krümel und Sand; ein Filter, der sich auswaschen lässt, spart Folgekosten."],
      ["Zubehör", "Fugendüse und Bürstenaufsatz erreichen Ritzen und Polster; ein langes Kabel/grosser Akku hilft im ganzen Auto."],
    ],
    faq: [
      ["Akku oder 12-V-Sauger?", "12-V-Modelle haben unbegrenzte Laufzeit am Anschluss, Akku-Sauger sind kabellos und bequemer — dafür mit begrenzter Laufzeit."],
      ["Worauf bei der Saugkraft achten?", "Auf genügend Leistung für Sand und Krümel sowie einen auswaschbaren Filter achten, der laufende Kosten senkt."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "kinderwagen-buggy-kaufen-schweiz", icon: "👶", h1: "Kinderwagen & Buggy kaufen in der Schweiz",
    title: "Kinderwagen & Buggy kaufen Schweiz — Vergleich | aban",
    desc: "Kinderwagen und Buggy kaufen in der Schweiz: Modelle nach Alter, Federung, Gewicht und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kinderwagen", ctaLabel: "Kinderwagen ansehen",
    intro: "Mobil mit Baby und Kleinkind: Hier vergleichst du Kinderwagen und Buggys nach Alter, Federung, Gewicht und Preis.",
    tips: [
      ["Alter", "Für Neugeborene eine liegende Wanne, für Kleinkinder ein wendiger Buggy — Kombisysteme wachsen mit."],
      ["Federung & Räder", "Eine gute Federung und grössere Räder erleichtern Spaziergänge auf unebenem Untergrund."],
      ["Gewicht & Faltmass", "Leichte, kompakt faltbare Modelle passen besser in Auto und Tram."],
    ],
    faq: [
      ["Kinderwagen oder Buggy?", "Für Neugeborene braucht es eine liegende Position (Wanne); Buggys sind für Kinder geeignet, die schon sitzen. Kombiwagen decken beides ab."],
      ["Worauf achten?", "Auf passende Federung, ein handliches Gewicht/Faltmass und eine einfache Bedienung achten — am besten vorher ausprobieren."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "babytrage-kaufen-schweiz", icon: "🤱", h1: "Babytrage kaufen in der Schweiz",
    title: "Babytrage kaufen Schweiz — ergonomisch & sicher | aban",
    desc: "Babytrage kaufen in der Schweiz: Tragen und Tragetücher nach Ergonomie, Alter, Komfort und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Babytrage", ctaLabel: "Babytragen ansehen",
    intro: "Nähe und freie Hände: Hier vergleichst du Babytragen und Tragetücher nach Ergonomie, Alter, Komfort und Preis.",
    tips: [
      ["Ergonomie", "Eine ergonomische Trage stützt Rücken und Hüfte des Babys (Anhock-Spreiz-Haltung)."],
      ["Alter", "Auf den geeigneten Alters-/Gewichtsbereich achten; Neugeboreneneinsätze gibt es bei vielen Modellen."],
      ["Komfort", "Gepolsterte, verstellbare Gurte verteilen das Gewicht — wichtig für längeres Tragen."],
    ],
    faq: [
      ["Trage oder Tragetuch?", "Tücher sind flexibel und schmiegsam, brauchen aber etwas Übung; Komforttragen sind schneller angelegt — beides kann ergonomisch sein."],
      ["Was bedeutet ergonomisch?", "Das Baby sitzt in der Anhock-Spreiz-Haltung mit gestütztem Rücken — das ist gut für die Hüftentwicklung."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "wickeltisch-kaufen-schweiz", icon: "🧷", h1: "Wickeltisch kaufen in der Schweiz",
    title: "Wickeltisch kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Wickeltisch kaufen in der Schweiz: Wickelkommoden und -aufsätze nach Höhe, Stauraum, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Wickeltisch", ctaLabel: "Wickeltische ansehen",
    intro: "Bequem wickeln: Hier vergleichst du Wickeltische und -kommoden nach Höhe, Stauraum, Sicherheit und Preis.",
    tips: [
      ["Höhe", "Eine rückenschonende Arbeitshöhe wählen; Wickelaufsätze passen auf vorhandene Kommoden."],
      ["Stauraum", "Schubladen und Fächer für Windeln und Pflege halten alles griffbereit."],
      ["Sicherheit", "Erhöhte Ränder und eine rutschfeste Auflage verhindern, dass das Baby herunterrollt — nie unbeaufsichtigt lassen."],
    ],
    faq: [
      ["Wickelkommode oder Aufsatz?", "Eine Kommode bietet viel Stauraum und lässt sich später normal nutzen; ein Aufsatz ist günstiger und spart Platz, wenn schon eine Kommode da ist."],
      ["Worauf bei der Sicherheit achten?", "Auf erhöhte Ränder, eine rutschfeste Auflage und einen stabilen Stand achten — und das Baby nie unbeaufsichtigt lassen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "babybett-kaufen-schweiz", icon: "🛏️", h1: "Babybett kaufen in der Schweiz",
    title: "Babybett kaufen Schweiz — Gitterbett & Beistellbett | aban",
    desc: "Babybett kaufen in der Schweiz: Gitter-, Beistell- und mitwachsende Betten nach Sicherheit, Grösse und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Babybett", ctaLabel: "Babybetten ansehen",
    intro: "Sicherer Schlaf fürs Baby: Hier vergleichst du Babybetten (Gitter, Beistell, mitwachsend) nach Sicherheit, Grösse und Preis.",
    tips: [
      ["Bauart", "Beistellbetten erleichtern das nächtliche Stillen, Gitterbetten bieten lange Nutzung; mitwachsende Betten wachsen mit dem Kind."],
      ["Sicherheit", "Auf einen geeigneten Sprossenabstand, verstellbare Liegehöhe und schadstoffarme Materialien achten."],
      ["Matratze", "Eine passgenaue, feste Matratze ohne Lücken am Rand ist wichtig für sicheren Schlaf."],
    ],
    faq: [
      ["Gitterbett oder Beistellbett?", "Beistellbetten sind am Anfang praktisch fürs Stillen; Gitter- und mitwachsende Betten lassen sich über Jahre nutzen."],
      ["Worauf bei der Sicherheit achten?", "Auf den richtigen Sprossenabstand, eine passgenaue feste Matratze und schadstoffarme Materialien achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "laufgitter-kaufen-schweiz", icon: "🧒", h1: "Laufgitter kaufen in der Schweiz",
    title: "Laufgitter kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Laufgitter kaufen in der Schweiz: Laufställe nach Grösse, Material, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Laufgitter", ctaLabel: "Laufgitter ansehen",
    intro: "Sicherer Spielbereich: Hier vergleichst du Laufgitter nach Grösse, Material, Sicherheit und Preis.",
    tips: [
      ["Grösse & Form", "Eckige Modelle bieten mehr Platz, runde sind kompakter; faltbare Laufgitter lassen sich verstauen."],
      ["Material", "Holz ist stabil und langlebig, Stoff-/Stecksysteme sind leicht und flexibel."],
      ["Sicherheit", "Auf stabile Standfüsse, einen geeigneten Stababstand und einen sicheren, höhenverstellbaren Boden achten."],
    ],
    faq: [
      ["Wie gross sollte das Laufgitter sein?", "Genug Platz zum Spielen einplanen, aber passend zum Raum. Faltbare Modelle sind praktisch, wenn es nicht dauerhaft stehen soll."],
      ["Holz oder Stoff?", "Holzlaufgitter sind stabil und langlebig; Stoff-/Steckmodelle sind leicht, flexibel und gut für unterwegs."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "reisebett-baby-kaufen-schweiz", icon: "🧳", h1: "Reisebett fürs Baby kaufen in der Schweiz",
    title: "Baby-Reisebett kaufen Schweiz — Vergleich & Tipps | aban",
    desc: "Baby-Reisebett kaufen in der Schweiz: Reisebetten nach Gewicht, Aufbau, Matratze und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Reisebett Baby", ctaLabel: "Reisebetten ansehen",
    intro: "Schlafplatz für unterwegs: Hier vergleichst du Baby-Reisebetten nach Gewicht, Aufbau, Matratze und Preis.",
    tips: [
      ["Gewicht & Packmass", "Leichte, kompakt faltbare Betten lassen sich gut transportieren — die Tasche sollte mitgeliefert sein."],
      ["Aufbau", "Ein schneller, werkzeugloser Auf- und Abbau spart unterwegs Nerven."],
      ["Matratze", "Die mitgelieferten Matratzen sind oft dünn — eine passgenaue, etwas festere Auflage erhöht den Komfort."],
    ],
    faq: [
      ["Reicht die mitgelieferte Matratze?", "Für gelegentliche Nächte ja; für häufigere Nutzung erhöht eine passgenaue, etwas festere Matratze den Schlafkomfort spürbar."],
      ["Worauf beim Kauf achten?", "Auf geringes Gewicht, einfaches Falten, einen stabilen Stand und eine mitgelieferte Transporttasche achten."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "treppenschutzgitter-kaufen-schweiz", icon: "🚧", h1: "Treppenschutzgitter kaufen in der Schweiz",
    title: "Treppenschutzgitter kaufen Schweiz — Vergleich | aban",
    desc: "Treppenschutzgitter kaufen in der Schweiz: Schutzgitter nach Befestigung, Breite, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Treppenschutzgitter", ctaLabel: "Schutzgitter ansehen",
    intro: "Sicherheit für Kleinkinder: Hier vergleichst du Treppenschutzgitter nach Befestigung, Breite, Sicherheit und Preis.",
    tips: [
      ["Befestigung", "Klemmgitter sind ohne Bohren montierbar (gut für Türen), geschraubte Gitter sind fester — Pflicht oben an Treppen."],
      ["Breite", "Die Öffnung genau ausmessen; Verlängerungen schliessen breitere Durchgänge."],
      ["Bedienung", "Ein Verschluss, der sich einhändig öffnen lässt, aber kindersicher ist, erleichtert den Alltag."],
    ],
    faq: [
      ["Klemmen oder schrauben?", "Oben an Treppen sollten Gitter fest verschraubt sein (Sicherheit); für Türen und unten an Treppen sind Klemmgitter ohne Bohren praktisch."],
      ["Wie messe ich die Breite?", "Die lichte Weite der Öffnung an mehreren Stellen messen und ein Gitter mit passendem Bereich (ggf. mit Verlängerung) wählen."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "dreirad-kaufen-schweiz", icon: "🚲", h1: "Dreirad kaufen in der Schweiz",
    title: "Dreirad kaufen Schweiz — Kinderdreirad im Vergleich | aban",
    desc: "Dreirad kaufen in der Schweiz: Kinderdreiräder nach Alter, Schiebefunktion, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Dreirad", ctaLabel: "Dreiräder ansehen",
    intro: "Erste Fahrversuche: Hier vergleichst du Kinderdreiräder nach Alter, Schiebefunktion, Sicherheit und Preis.",
    tips: [
      ["Alter", "Mitwachsende Dreiräder mit Schiebestange eignen sich früh, einfache Modelle für selbstständiges Treten."],
      ["Schiebefunktion", "Eine lenkbare Schiebestange erleichtert das Steuern, solange das Kind noch nicht selbst tritt."],
      ["Sicherheit", "Auf Gurt, Kippsicherheit und (bei Kleinen) einen Sonnenschutz/Bügel achten."],
    ],
    faq: [
      ["Ab welchem Alter ein Dreirad?", "Mit Schiebestange und Gurt oft schon ab etwa einem Jahr; selbstständig treten Kinder meist erst später — mitwachsende Modelle decken beides ab."],
      ["Dreirad oder Laufrad?", "Dreiräder eignen sich früher und sind sehr kippstabil; Laufräder schulen das Gleichgewicht und sind der bessere Übergang zum Velo."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
  {
    slug: "bobbycar-kaufen-schweiz", icon: "🚗", h1: "Bobbycar kaufen in der Schweiz",
    title: "Bobbycar kaufen Schweiz — Rutschauto im Vergleich | aban",
    desc: "Bobbycar kaufen in der Schweiz: Rutschautos nach Alter, Stabilität, Ausstattung und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Bobbycar", ctaLabel: "Rutschautos ansehen",
    intro: "Beliebtes Rutschauto: Hier vergleichst du Bobbycars und Rutschautos nach Alter, Stabilität, Ausstattung und Preis.",
    tips: [
      ["Alter", "Auf den empfohlenen Alters-/Gewichtsbereich achten; für die Kleinsten gibt es Modelle mit hoher Rückenlehne."],
      ["Stabilität", "Eine breite Spur und ein tiefer Schwerpunkt machen das Fahren kippsicher."],
      ["Reifen", "Kunststoffräder sind laut auf hartem Boden; Flüsterreifen sind leiser und schonen den Bodenbelag."],
    ],
    faq: [
      ["Ab welchem Alter ein Bobbycar?", "Viele Modelle eignen sich ab etwa einem Jahr — die genaue Altersangabe des Herstellers beachten."],
      ["Was bringen Flüsterreifen?", "Sie sind deutlich leiser auf hartem Boden und hinterlassen weniger Spuren — angenehm für drinnen und Nachbarn."],
      ["Wo finde ich Angebote?", "Über die Angebote-Suche nach Preis filtern und Modelle vergleichen."],
    ],
  },
  {
    slug: "kinderroller-kaufen-schweiz", icon: "🛴", h1: "Kinderroller kaufen in der Schweiz",
    title: "Kinderroller kaufen Schweiz — Scooter im Vergleich | aban",
    desc: "Kinderroller kaufen in der Schweiz: Kinder-Scooter nach Alter, Räderzahl, Sicherheit und Preis vergleichen.",
    cta: "/angebote-suche.html?q=Kinderroller", ctaLabel: "Kinderroller ansehen",
    intro: "Roller für Kinder: Hier vergleichst du Kinder-Scooter nach Alter, Räderzahl, Sicherheit und Preis.",
    tips: [
      ["Räderzahl", "Dreirädrige Roller sind sehr kippstabil für die Kleinsten, zweirädrige fördern das Gleichgewicht bei grösseren Kindern."],
      ["Verstellbarkeit", "Eine höhenverstellbare Lenkstange wächst mit dem Kind mit."],
      ["Sicherheit", "Auf gute Bremsen, rutschfeste Trittfläche und das zulässige Gewicht achten — Helm tragen."],
    ],
    faq: [
      ["Zwei oder drei Räder?", "Drei Räder geben den Kleinsten viel Standsicherheit; zwei Räder schulen das Gleichgewicht und passen für grössere, geübtere Kinder."],
      ["Worauf bei der Sicherheit achten?", "Auf eine zuverlässige Bremse, eine rutschfeste Trittfläche und die zulässige Belastung achten — und immer einen Helm tragen."],
      ["Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen."],
    ],
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function page(p) {
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const tips = p.tips.map(([h, t]) => `    <div class="tip"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join("\n");
  const faq = p.faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n");
  // Kontext-Partner-Box je Kategorie (erscheint nur, wenn der Link in affiliate-config.js gefüllt ist)
  const PB = { auto: ["AUTO_VERSICHERUNG_URL", "KFZ-Versicherung vergleichen und beim Autokauf sparen.", "Versicherung vergleichen"],
    wohnung: ["IMMO_HYPOTHEK_URL", "Eigenheim geplant? Hypothek & Finanzierung vergleichen.", "Hypothek vergleichen"],
    job: ["JOB_NETZWERK_URL", "Mehr passende Jobs bei unserem Partner-Job-Netzwerk.", "Jobs beim Partner"],
    moebel: ["MOEBEL_SHOP_URL", "Neue Möbel? Angebote unseres Partner-Shops ansehen.", "Möbel-Shop ansehen"],
    handy: ["HANDY_SHOP_URL", "Neues Handy? Aktuelle Angebote beim Partner.", "Handy-Angebote"],
    computer: ["HANDY_SHOP_URL", "Neue Technik? Angebote beim Partner ansehen.", "Technik-Angebote"],
    occasion: ["AUTO_VERSICHERUNG_URL", "Occasion gekauft? KFZ-Versicherung vergleichen und sparen.", "Versicherung vergleichen"],
    motorrad: ["AUTO_VERSICHERUNG_URL", "Töff-Versicherung vergleichen und sparen.", "Versicherung vergleichen"],
    wohnmobil: ["AUTO_VERSICHERUNG_URL", "Wohnmobil-Versicherung vergleichen.", "Versicherung vergleichen"],
    umzug: ["IMMO_UMZUG_URL", "Umzug geplant? Zügelfirmen vergleichen und sparen.", "Umzug vergleichen"],
    haus: ["IMMO_HYPOTHEK_URL", "Hauskauf geplant? Hypothek & Finanzierung vergleichen.", "Hypothek vergleichen"],
    buero: ["IMMO_UMZUG_URL", "Büro-Umzug? Zügelfirmen für Gewerbe vergleichen.", "Umzug vergleichen"] };
  let pbKey = "";
  for (const k in PB) { if (p.slug.indexOf(k) === 0) { pbKey = k; break; } }
  const pb = pbKey ? PB[pbKey] : ((p.jobq || p.jobloc) ? ["JOB_NETZWERK_URL", "Mehr passende Stellen bei unserem Partner-Job-Netzwerk.", "Jobs beim Partner"] : null);
  const partnerBox = pb ? `  <div data-partner="${pb[0]}" data-text="${esc(pb[1])}" data-cta="${esc(pb[2])}"></div>\n` : "";
  // Live-eBay-Produktzeile: nur für Produkt-Kategorien (Wohnung/Job ausgenommen)
  const EQ = { "auto-kaufen": "Auto", "ebike-kaufen": "E-Bike", "velo-kaufen": "Velo Fahrrad",
    "moebel-kaufen": "Möbel", "handy-kaufen": "Handy Smartphone", "computer-kaufen": "Laptop",
    "gaming-kaufen": "Konsole Gaming", "kamera-kaufen": "Kamera", "garten-kaufen": "Gartenmöbel",
    "werkzeug-kaufen": "Werkzeug", "mode-kaufen": "Kleidung", "sport-kaufen": "Sport Fitness",
    "uhren-schmuck": "Uhr", "kueche-kaufen": "Küchengerät", "haustier": "Haustier Zubehör", "baby-kind": "Kinderwagen",
    "occasion-auto": "Auto", "motorrad-kaufen": "Motorrad", "wohnmobil-kaufen": "Wohnmobil" };
  let eq = "";
  for (const k in EQ) { if (p.slug.indexOf(k) === 0) { eq = EQ[k]; break; } }
  const liveRow = eq ? `
  <section style="margin-top:26px">
    <h2 style="margin-bottom:4px">Aktuelle Angebote</h2>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Live von Partnern (z. B. eBay) · Klick führt zum Anbieter · Provision möglich, Preis bleibt gleich.</p>
    <div id="ebayRow" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px"><div style="color:var(--muted);font-size:.9rem">Lade Angebote …</div></div>
  </section>
  <script>(function(){var EQ=${JSON.stringify(eq)};var el=document.getElementById("ebayRow");if(!el)return;
    function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
    fetch("/api/ebay?limit=6&q="+encodeURIComponent(EQ)).then(function(r){return r.json()}).then(function(d){
      var it=(d.items||[]).slice(0,6);if(!it.length){el.closest("section").style.display="none";return}
      el.innerHTML=it.map(function(x){var img=x.img?('<div style="aspect-ratio:1/1;background:#f3eee4 center/cover no-repeat;background-image:url(\\''+esc(x.img)+'\\')"></div>'):'<div style="aspect-ratio:1/1;background:#f3eee4;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🛍️</div>';
        var href=(x.url&&x.url!=="#")?esc(x.url):"#";
        return '<a href="'+href+'" target="_blank" rel="sponsored nofollow noopener" style="border:1px solid var(--line);border-radius:11px;overflow:hidden;background:#fff;text-decoration:none;color:var(--ink);display:flex;flex-direction:column">'+img+'<div style="padding:8px 9px"><div style="font-size:.78rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:4px">'+esc(x.title)+'</div><div style="color:var(--amber-dk);font-weight:800;font-size:.9rem">'+esc(x.price||"")+'</div></div></a>';
      }).join("");
    }).catch(function(){el.closest("section").style.display="none"});
  })();</script>` : "";
  // Live-Jobs-Zeile (für Job-Kategorie- oder Regions-Seiten via p.jobq / p.jobloc)
  const jobsRow = (p.jobq || p.jobloc) ? `
  <section style="margin-top:26px">
    <h2 style="margin-bottom:4px">Aktuelle Stellen</h2>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Live aus mehreren Job-Börsen (inkl. Schweiz) · Klick führt zur Original-Anzeige.</p>
    <div id="jobRow" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px"><div style="color:var(--muted);font-size:.9rem">Lade Stellen …</div></div>
  </section>
  <script>(function(){var JQ=${JSON.stringify(p.jobq || "")},JL=${JSON.stringify(p.jobloc || "")};var el=document.getElementById("jobRow");if(!el)return;
    function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
    fetch("/api/jobs?q="+encodeURIComponent(JQ)+"&loc="+encodeURIComponent(JL)).then(function(r){return r.json()}).then(function(d){
      var it=(d.items||[]).slice(0,6);if(!it.length){el.closest("section").style.display="none";return}
      el.innerHTML=it.map(function(o){var href=(o.url&&o.url!=="#")?esc(o.url):"#";
        return '<a href="'+href+'" target="_blank" rel="noopener nofollow" style="border:1px solid var(--line);border-radius:11px;padding:12px 13px;background:#fff;text-decoration:none;color:var(--ink);display:block"><div style="font-weight:700;font-size:.86rem;line-height:1.3;margin-bottom:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc(o.title)+'</div><div style="font-size:.76rem;color:var(--muted)">'+esc([o.company,o.location].filter(Boolean).join(" · "))+'</div></a>';
      }).join("");
    }).catch(function(){el.closest("section").style.display="none"});
  })();</script>` : "";
  // Vertiefte interne Verlinkung: jede Seite verweist auf 12 ANDERE Kaufberater (rotiert,
  // damit ein echtes Querverweis-Netz statt isolierter Doorway-Seiten entsteht).
  const _all = PAGES.filter((x) => x.slug !== p.slug);
  const _i = Math.max(0, PAGES.indexOf(p));
  const _seen = new Set(), _rel = [];
  for (let k = 1; _rel.length < 12 && k <= _all.length; k++) {
    const x = _all[(_i + k * 7) % _all.length];
    if (x && !_seen.has(x.slug)) { _seen.add(x.slug); _rel.push(x); }
  }
  const relLinks = _rel.map((x) => `<a href="/${x.slug}.html">${esc(x.h1.replace(" in der Schweiz", "").replace(/\s+(kaufen|mieten|finden)$/i, "").trim())}</a>`).join(" · ");
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="theme-color" content="#d97706">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="${SITE}/${p.slug}.html">
<meta property="og:title" content="${esc(p.h1)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:type" content="article">
<meta property="og:image" content="${SITE}/og-image.png">
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#e6e1d6;--bg:#fffbf5;--card:#fff}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
a{color:var(--amber-dk)}
.wrap{max-width:760px;margin:0 auto;padding:0 18px}
.hero{background:linear-gradient(135deg,#1f2937,#3a2a12 55%,#b45309);color:#fff;position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 20%,rgba(251,191,36,.25),transparent 45%),radial-gradient(circle at 8% 90%,rgba(217,119,6,.22),transparent 42%);pointer-events:none}
.hero .in{max-width:780px;margin:0 auto;padding:38px 18px 34px;position:relative;z-index:1}
.hero .ic{font-size:2rem;width:62px;height:62px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:18px;margin-bottom:8px}
.hero h1{font-size:clamp(1.6rem,4.5vw,2.1rem);margin:4px 0 8px;line-height:1.18}
.hero p{color:#f4e7d3;font-size:1.04rem;max-width:620px}
.hero .trust{margin-top:14px;display:flex;gap:8px 16px;flex-wrap:wrap;font-size:.82rem;color:#f4e7d3}
.hero .trust span{display:inline-flex;align-items:center;gap:5px}
.bigcta{display:inline-block;margin-top:16px;background:#fff;color:var(--amber-dk);border-radius:24px;padding:12px 24px;font-weight:800;font-size:1rem;box-shadow:0 10px 24px rgba(0,0,0,.18)}
.bigcta:hover{background:var(--cream)}
main{padding:26px 0 56px}
.tips{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:8px 0 26px}
.tip{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;padding:14px 16px;transition:box-shadow .15s,transform .15s}
.tip:hover{box-shadow:0 8px 24px rgba(31,41,55,.09);transform:translateY(-1px)}
.tip h3{font-size:1.02rem;margin-bottom:3px}.tip p{font-size:.94rem;color:var(--ink2)}
h2{font-size:1.3rem;margin:24px 0 12px}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:10px;transition:border-color .15s}
details[open]{border-color:#dcc89c}
summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:10px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--amber-dk);font-weight:800;font-size:1.1rem}
details[open] summary::after{content:"–"}
details p{margin-top:8px;color:var(--ink2);font-size:.95rem}
.cta2{text-align:center;background:var(--cream);border:1px solid #f3dca0;border-radius:14px;padding:22px;margin-top:26px}
.cta2 a{display:inline-block;background:var(--amber-dk);color:#fff;border-radius:24px;padding:12px 26px;font-weight:800;margin-top:8px}
.cta2 a:hover{background:#a04708}
.rel{margin-top:24px;font-size:.9rem;color:var(--muted)}
footer{border-top:1px solid var(--line);padding:20px 0;font-size:.8rem;color:var(--muted);text-align:center}
:focus-visible{outline:3px solid #b45309;outline-offset:2px;border-radius:4px}
</style>
</head>
<body>
<nav class="abn-bc" style="max-width:760px;margin:0 auto;padding:9px 18px;font-size:.8rem;color:#6b7280" aria-label="Brotkrumen"><a href="/" style="color:#b45309">Start</a> › <a href="/marktplatz.html" style="color:#b45309">Marktplatz</a> › <span>${esc(p.h1)}</span></nav>
<header class="hero"><div class="in">
  <div class="ic">${p.icon}</div>
  <h1>${esc(p.h1)}</h1>
  <p>${esc(p.intro)}</p>
  <a class="bigcta" href="${p.cta}">${esc(p.ctaLabel)} →</a>
  <div class="trust"><span>🇨🇭 Schweiz &amp; DACH</span><span>✓ kostenlos suchen</span><span>✓ direkt zum Anbieter</span></div>
</div></header>
<main><div class="wrap">
  <div class="tips">
${tips}
  </div>
${liveRow}${jobsRow}
  <h2 style="margin-top:26px">Häufige Fragen</h2>
${faq}
  <div class="cta2">
    <strong>Bereit zum Suchen?</strong><br>
    <a href="${p.cta}">${esc(p.ctaLabel)} →</a>
  </div>
${partnerBox}  <div data-ad-slot="landing-mid" style="margin-top:18px"></div>
  <p class="rel">Mehr im <a href="/marktplatz.html">aban-Marktplatz</a>: Jobs, Fahrzeuge, Immobilien, Angebote &amp; Inserate für die Schweiz &amp; DACH. Oder gleich alles auf einmal in der <a href="/suche.html">Universal-Suche</a>.</p>
  <p class="rel">Weitere Kaufberater: ${relLinks}</p>
  <section style="margin-top:26px;background:var(--cream);border:1px solid #f3dca0;border-radius:14px;padding:18px;text-align:center">
    <strong style="font-size:1.05rem">📬 Gratis: Schnäppchen- &amp; Job-Updates</strong>
    <p style="font-size:.88rem;color:var(--ink2);margin:4px 0 10px">Das Beste aus dem Marktplatz + 1 KI-Tipp, Mo–Fr in 5 Minuten. Kein Spam, jederzeit abbestellbar.</p>
    <form action="https://abannews.beehiiv.com/subscribe" method="get" style="display:flex;gap:8px;max-width:380px;margin:0 auto;flex-wrap:wrap">
      <input type="email" name="email" required placeholder="deine@mail.ch" aria-label="E-Mail" style="flex:1;min-width:160px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-family:inherit">
      <button class="bigcta" type="submit" style="border:0;cursor:pointer">Abonnieren</button>
    </form>
  </section>
</div></main>
<footer><div class="wrap">aban news · Marktplatz Schweiz · Angaben ohne Gewähr · © 2026 ·
  <a href="/marktplatz.html">Marktplatz</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
<script src="/js/affiliate-config.js" defer></script>
<script src="/js/partner-box.js" defer></script>
<script src="/js/ads-config.js" defer></script>
<script src="/js/ad-slot.js" defer></script>
</body>
</html>
`;
}

for (const p of PAGES) {
  writeFileSync(p.slug + ".html", page(p));
  console.log("geschrieben:", p.slug + ".html");
}
console.log("Fertig:", PAGES.length, "Seiten");
