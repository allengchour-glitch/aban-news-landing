// ============================================================
// SHOP-KONFIG — Notfall-Fallback, falls /data/shop-products.json nicht lädt.
//
// ⚠️ Dies ist NICHT mehr die Quelle der Wahrheit. shop.html holt die echten
// Preise/Links zuerst aus /data/shop-products.json (wird von
// automation/stripe_sync.py aus data/kit-catalog.json + Stripe erzeugt).
// window.ABAN_SHOP hier greift NUR, wenn dieser Fetch scheitert (Netzfehler).
//
// Gefunden 2026-09-16: diese Datei zeigte noch 3 von 22 Paketen, in EUR statt
// CHF, mit leeren Kauf-Links — ein Besucher hätte im Fehlerfall einen kaputten
// Mini-Shop gesehen statt der echten 22 Pakete. Jetzt 1:1 mit
// data/shop-products.json synchronisiert (Stand: die dort hinterlegten
// Stripe-Links). Bei echten Preis-/Katalog-Änderungen neu synchronisieren:
//   python3 -c "import json; d=json.load(open('data/shop-products.json')); ..."
// (siehe Commit, der diese Datei zuletzt geändert hat, für das genaue Skript).
// ============================================================
window.ABAN_SHOP = [
  {
    title: "Alle KI-Starter-Kits (Bundle)",
    desc: "Alle Branchen-Kits zusammen — deutlich günstiger als einzeln. Spickzettel, Prompts & Checklisten für jede Branche.",
    price: "CHF 79",
    buy: "https://buy.stripe.com/6oUbJ38iicfq4kf2El5wI0m",
    bundle: true
  },
  {
    title: "KI-Starter-Kit für Ärzte & Praxen",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/eVq5kF422bbm5oj4Mt5wI00"
  },
  {
    title: "KI-Starter-Kit für Handwerk",
    desc: "Angebote, Mails, Bewertungen schneller schreiben.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/cNi9AV9mmbbmaID1Ah5wI01"
  },
  {
    title: "KI-Starter-Kit für Steuerberatung",
    desc: "Mandanten-Kommunikation, Standardschreiben, Recherche.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/6oU5kF4226V65ojen35wI02"
  },
  {
    title: "KI-Starter-Kit für Kanzleien",
    desc: "Entwürfe, lange Dokumente, Mandantentexte — mit Grenzen.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/fZu14p7ee3IU03ZdiZ5wI03"
  },
  {
    title: "KI-Starter-Kit für Gastronomie",
    desc: "Bewertungen, Social, Speisekarten-Texte.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/cNi9AVdCCgvG9Ez4Mt5wI04"
  },
  {
    title: "KI-Starter-Kit für Coaches & Berater",
    desc: "Angebote, Posts, Session-Vorbereitung — ohne Hype.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/28E14p1TUenycQL1Ah5wI08"
  },
  {
    title: "KI-Starter-Kit für Immobilienmakler",
    desc: "Exposés, Anfragen-Antworten, Inserate schneller.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/eVqeVf9mm0wI2c72El5wI09"
  },
  {
    title: "KI-Starter-Kit für Friseure & Salons",
    desc: "Social-Posts, Bewertungen, Terminmails.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/cNiaEZ1TUa7i9Ez6UB5wI0a"
  },
  {
    title: "KI-Starter-Kit für Fotografen",
    desc: "Angebote, Bildtexte, Kundenkommunikation.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/28E3cx2XYdjug2Xgvb5wI0b"
  },
  {
    title: "KI-Starter-Kit für Architekturbüros",
    desc: "Texte, Ausschreibungen, Recherche — mit Grenzen.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/8x25kF6aa7Za7wrbaR5wI0c"
  },
  {
    title: "KI-Starter-Kit für Fitnessstudios",
    desc: "Social, Mitglieder-Mails, Kurs-Beschreibungen.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/3cIbJ3cyya7i8Ava6N5wI0d"
  },
  {
    title: "KI-Starter-Kit für Kosmetik- & Nagelstudios",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/5kQ28taqqcfq8Av5Qx5wI0e"
  },
  {
    title: "KI-Starter-Kit für KFZ-Werkstätten",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/6oU6oJeGGa7iaIDgvb5wI0f"
  },
  {
    title: "KI-Starter-Kit für Maler & Lackierer",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/00w28t1TU1AM8AvceV5wI0g"
  },
  {
    title: "KI-Starter-Kit für Hotels & Pensionen",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/7sYaEZ1TU4MYeYTen35wI0h"
  },
  {
    title: "KI-Starter-Kit für Physiotherapie-Praxen",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/7sY9AVbuu4MYbMH2El5wI0i"
  },
  {
    title: "KI-Starter-Kit für Reinigungsfirmen",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/5kQ7sNfKK2EQ03Z7YF5wI0j"
  },
  {
    title: "KI-Starter-Kit für Garten- & Landschaftsbau",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/4gMdRb8iidju5oj0wd5wI0k"
  },
  {
    title: "KI-Starter-Kit für Goldschmiede & Juweliere",
    desc: "Spickzettel + erprobte Prompts + Datenschutz-Checkliste.",
    price: "CHF 12",
    buy: "https://buy.stripe.com/5kQeVf2XY4MY2c71Ah5wI0l"
  },
  {
    title: "KI-Prompt-Bibliothek für DACH-Solopreneure",
    desc: "100+ erprobte Prompts zum Kopieren — Akquise, Kunden, Marketing, Admin & Recherche. Branchen-übergreifend, ehrlich, ohne Hype.",
    price: "CHF 19",
    buy: "https://buy.stripe.com/28E4gBgOO0wI3gben35wI0n"
  },
  {
    title: "Fertige Text-Vorlagen für Solopreneure",
    desc: "40 sofort nutzbare Vorlagen für Angebote, Mails, Rechnungen & Absagen. Kopieren, Platzhalter ersetzen, abschicken.",
    price: "CHF 19",
    buy: "https://buy.stripe.com/9B63cxaqq5R2aIDgvb5wI0o"
  },
];
