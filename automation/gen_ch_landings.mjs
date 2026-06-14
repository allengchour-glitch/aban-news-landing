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
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function page(p) {
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const tips = p.tips.map(([h, t]) => `    <div class="tip"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join("\n");
  const faq = p.faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n");
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
</style>
</head>
<body>
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
  <h2>Häufige Fragen</h2>
${faq}
  <div class="cta2">
    <strong>Bereit zum Suchen?</strong><br>
    <a href="${p.cta}">${esc(p.ctaLabel)} →</a>
  </div>
  <p class="rel">Mehr im <a href="/marktplatz.html">aban-Marktplatz</a>: Jobs, Fahrzeuge, Immobilien, Angebote &amp; Inserate für die Schweiz &amp; DACH. Oder gleich alles auf einmal in der <a href="/suche.html">Universal-Suche</a>.</p>
</div></main>
<footer><div class="wrap">aban news · Marktplatz Schweiz · Angaben ohne Gewähr · © 2026 ·
  <a href="/marktplatz.html">Marktplatz</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
</body>
</html>
`;
}

for (const p of PAGES) {
  writeFileSync(p.slug + ".html", page(p));
  console.log("geschrieben:", p.slug + ".html");
}
console.log("Fertig:", PAGES.length, "Seiten");
