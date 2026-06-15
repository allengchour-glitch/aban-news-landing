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
  const pb = pbKey ? PB[pbKey] : (p.jobq ? ["JOB_NETZWERK_URL", "Mehr passende Stellen bei unserem Partner-Job-Netzwerk.", "Jobs beim Partner"] : null);
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
  // Live-Jobs-Zeile (für Job-Kategorie-Seiten via p.jobq)
  const jobsRow = p.jobq ? `
  <section style="margin-top:26px">
    <h2 style="margin-bottom:4px">Aktuelle Stellen</h2>
    <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Live aus mehreren Job-Börsen (inkl. Schweiz) · Klick führt zur Original-Anzeige.</p>
    <div id="jobRow" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px"><div style="color:var(--muted);font-size:.9rem">Lade Stellen …</div></div>
  </section>
  <script>(function(){var JQ=${JSON.stringify(p.jobq)};var el=document.getElementById("jobRow");if(!el)return;
    function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
    fetch("/api/jobs?q="+encodeURIComponent(JQ)).then(function(r){return r.json()}).then(function(d){
      var it=(d.items||[]).slice(0,6);if(!it.length){el.closest("section").style.display="none";return}
      el.innerHTML=it.map(function(o){var href=(o.url&&o.url!=="#")?esc(o.url):"#";
        return '<a href="'+href+'" target="_blank" rel="noopener nofollow" style="border:1px solid var(--line);border-radius:11px;padding:12px 13px;background:#fff;text-decoration:none;color:var(--ink);display:block"><div style="font-weight:700;font-size:.86rem;line-height:1.3;margin-bottom:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc(o.title)+'</div><div style="font-size:.76rem;color:var(--muted)">'+esc([o.company,o.location].filter(Boolean).join(" · "))+'</div></a>';
      }).join("");
    }).catch(function(){el.closest("section").style.display="none"});
  })();</script>` : "";
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
.hero::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 20%,rgba(251,191,36,.25),transparent 45%);pointer-events:none}
.hero .in{max-width:760px;margin:0 auto;padding:34px 18px 30px;position:relative;z-index:1}
.hero .ic{font-size:2.4rem}
.hero h1{font-size:1.8rem;margin:6px 0 8px;line-height:1.2}
.hero p{color:#f4e7d3;font-size:1.02rem}
.bigcta{display:inline-block;margin-top:16px;background:#fff;color:var(--amber-dk);border-radius:24px;padding:12px 24px;font-weight:800;font-size:1rem}
.bigcta:hover{background:var(--cream)}
main{padding:26px 0 56px}
.tips{display:grid;gap:12px;margin:8px 0 26px}
.tip{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;padding:14px 16px}
.tip h3{font-size:1.02rem;margin-bottom:3px}.tip p{font-size:.94rem;color:var(--ink2)}
h2{font-size:1.3rem;margin:24px 0 12px}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:10px}
summary{font-weight:700;cursor:pointer}
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
  <p class="rel">Beliebte Kaufberater: <a href="/auto-kaufen-schweiz.html">Auto</a> · <a href="/wohnung-mieten-schweiz.html">Wohnung</a> · <a href="/moebel-kaufen-schweiz.html">Möbel</a> · <a href="/handy-kaufen-schweiz.html">Handy</a> · <a href="/ebike-kaufen-schweiz.html">E-Bike</a> · <a href="/job-finden-schweiz.html">Job</a></p>
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
