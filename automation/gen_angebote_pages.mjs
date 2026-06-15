// Generiert die Kategorie-Angebotsseiten (fahrrad-angebote.html etc.) im Portal-Stil.
// Vorlage = angebote-suche.html (wird gelesen); pro Kategorie werden nur Kopf/Hero/Query ersetzt.
// So bleibt das funktionierende Such-/Filter-Script (inkl. Regex) unverändert.
// Aufruf: node automation/gen_angebote_pages.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SITE = "https://abannews.com";
const tpl = readFileSync("angebote-suche.html", "utf8");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CATS = [
  { slug: "fahrrad-angebote", label: "Fahrrad", h1: "Fahrräder & Velos — günstig finden", q: "Fahrrad",
    title: "Fahrrad-Angebote — Velos & E-Bikes günstig finden | aban",
    desc: "Fahrräder, Velos, Mountainbikes und E-Bikes günstig finden und filtern — nach Zustand und Preis. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "handy-angebote", label: "Handy", h1: "Handys & Smartphones — günstig finden", q: "Handy Smartphone",
    title: "Handy-Angebote — Smartphones günstig finden | aban",
    desc: "Smartphones von iPhone bis Android günstig finden und filtern — nach Zustand und Preis. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "moebel-angebote", label: "Möbel", h1: "Möbel & Wohnen — günstig finden", q: "Möbel",
    title: "Möbel-Angebote — Sofas, Tische & mehr günstig | aban",
    desc: "Möbel günstig finden und filtern — Sofas, Tische, Schränke, nach Zustand und Preis. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "gaming-angebote", label: "Gaming", h1: "Gaming & Konsolen — günstig finden", q: "Gaming Konsole",
    title: "Gaming-Angebote — Konsolen, Spiele & PC günstig | aban",
    desc: "Konsolen, Spiele, Controller und Gaming-PCs günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "garten-angebote", label: "Garten", h1: "Garten & Outdoor — günstig finden", q: "Garten",
    title: "Garten-Angebote — Gartenmöbel, Geräte & mehr | aban",
    desc: "Gartenmöbel, Grill, Geräte und Pflanzen günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "kueche-angebote", label: "Küche", h1: "Küche & Haushalt — günstig finden", q: "Küche",
    title: "Küchen-Angebote — Geräte & Haushalt günstig | aban",
    desc: "Küchengeräte, Maschinen und Haushaltsartikel günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "mode-angebote", label: "Mode", h1: "Mode & Kleidung — günstig finden", q: "Mode Kleidung",
    title: "Mode-Angebote — Kleidung, Schuhe & Accessoires | aban",
    desc: "Kleidung, Schuhe, Taschen und Accessoires günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "werkzeug-angebote", label: "Werkzeug", h1: "Werkzeug & Maschinen — günstig finden", q: "Werkzeug",
    title: "Werkzeug-Angebote — Maschinen & Heimwerker günstig | aban",
    desc: "Werkzeug, Akkuschrauber und Maschinen günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "kamera-angebote", label: "Kamera", h1: "Kameras & Foto — günstig finden", q: "Kamera",
    title: "Kamera-Angebote — Foto, Objektive & Zubehör | aban",
    desc: "Kameras, Objektive und Foto-Zubehör günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "spielzeug-angebote", label: "Spielzeug", h1: "Spielzeug — günstig finden", q: "Spielzeug",
    title: "Spielzeug-Angebote — günstig finden & vergleichen | aban",
    desc: "Spielzeug, Spiele und Spielwaren günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "baby-angebote", label: "Baby", h1: "Baby & Kind — günstig finden", q: "Baby",
    title: "Baby-Angebote — Kinderwagen, Kleidung & mehr | aban",
    desc: "Kinderwagen, Autositze, Kleidung und Spielzeug günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "haustier-angebote", label: "Haustier", h1: "Haustier-Bedarf — günstig finden", q: "Haustier",
    title: "Haustier-Angebote — Zubehör für Hund, Katze & Co. | aban",
    desc: "Haustier-Zubehör, Transportboxen und mehr günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "autoteile-angebote", label: "Auto-Teile", h1: "Auto-Teile & Zubehör — günstig finden", q: "Autoteile",
    title: "Auto-Teile-Angebote — Ersatzteile & Zubehör günstig | aban",
    desc: "Auto-Ersatzteile, Reifen, Felgen und Zubehör günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
  { slug: "schmuck-angebote", label: "Schmuck", h1: "Schmuck & Uhren — günstig finden", q: "Schmuck",
    title: "Schmuck-Angebote — Schmuck & Uhren günstig finden | aban",
    desc: "Schmuck, Uhren und Accessoires günstig finden und filtern. Klick führt direkt zum Anbieter (eBay), mit Affiliate-Kennzeichnung." },
];

// Wörtliche Quellen-Strings aus angebote-suche.html, die ersetzt werden:
const SRC = {
  title: "<title>Angebote &amp; Schnäppchen suchen — eine Suche, viele Angebote | aban</title>",
  desc: 'content="Angebote und Schnäppchen aus vielen Kategorien an einem Ort suchen und filtern — nach Stichwort, Kategorie, Zustand und Preis. Der Klick führt direkt zum Anbieter (eBay). Ehrlich, mit Affiliate-Kennzeichnung."',
  canonical: '<link rel="canonical" href="https://abannews.com/angebote-suche.html">',
  ogtitle: '<meta property="og:title" content="Angebote & Schnäppchen suchen">',
  ogurl: '<meta property="og:url" content="https://abannews.com/angebote-suche.html">',
  bc: "<span>Angebote</span>",
  h1: "<h1>Angebote &amp; Schnäppchen finden</h1>",
  introP: "<p>Eine Suche, viele Angebote aus mehreren Kategorien — der Klick führt direkt zum Anbieter.</p>",
  input: '<input id="q" type="search" placeholder="z. B. Fahrrad, iPhone, Sofa, Werkzeug …" aria-label="Suche">',
};

let n = 0;
for (const c of CATS) {
  let h = tpl;
  const must = [SRC.title, SRC.desc, SRC.canonical, SRC.ogtitle, SRC.ogurl, SRC.bc, SRC.h1, SRC.introP, SRC.input];
  for (const m of must) { if (!h.includes(m)) { console.error("FEHLT Anker in Vorlage:", m.slice(0, 40), "→", c.slug); process.exit(1); } }
  h = h.replace(SRC.title, `<title>${esc(c.title)}</title>`)
       .replace(SRC.desc, `content="${esc(c.desc)}"`)
       .replace(SRC.canonical, `<link rel="canonical" href="${SITE}/${c.slug}.html">`)
       .replace(SRC.ogtitle, `<meta property="og:title" content="${esc(c.label)}-Angebote günstig finden">`)
       .replace(SRC.ogurl, `<meta property="og:url" content="${SITE}/${c.slug}.html">`)
       .replace(SRC.bc, `<span>${esc(c.label)}</span>`)
       .replace(SRC.h1, `<h1>${esc(c.h1)}</h1>`)
       .replace(SRC.introP, `<p>${esc(c.label)} günstig finden und vergleichen — nach Zustand und Preis filtern, der Klick führt direkt zum Anbieter.</p>`)
       .replace(SRC.input, `<input id="q" type="search" value="${esc(c.q)}" placeholder="${esc(c.label)} suchen …" aria-label="Suche">`);
  writeFileSync(c.slug + ".html", h);
  console.log("geschrieben:", c.slug + ".html");
  n++;
}
console.log("Fertig:", n, "Kategorie-Angebotsseiten");
