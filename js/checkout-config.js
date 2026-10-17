/* aban news — zentrale Checkout-Links für die neueren Einzel-/Abo-Produkte.
 * HIER EINMAL eintragen → der Kauf-Button auf der jeweiligen Seite wird live.
 * Leer ("") = Mail-Fallback (kein toter Button).
 * NUR öffentliche Checkout-Links — niemals API-Keys/Secrets (Datei ist öffentlich).
 *
 * Lemon Squeezy:  https://abannews.lemonsqueezy.com/checkout/buy/<PRODUKT-ID>
 * Stripe:         https://buy.stripe.com/<ID>
 * Gumroad:        https://abannews.gumroad.com/l/<SLUG>
 *
 * (Buch & Premium-Abo liegen bereits in js/buch-config.js bzw. js/pay-config.js;
 *  die Branchen-Starter-Kits in js/shop-config.js / data/shop-products.json.)
 */
window.ABAN_CHECKOUT = {
  PAKET_BUY_URL:     "",   // KI-Sichtbarkeit Komplett-Paket (29 €, einmalig)
  DATENSATZ_ABO_URL: "",   // KI-Tools-Datensatz Abo (9 €/Monat)
  MONITOR_ABO_URL:   "https://buy.stripe.com/7sY3cx0PQ3IUdUP0wd5wI07",   // KI-Sichtbarkeits-Monitor (9 €/Monat, Subscription)
  VORLAGEN_BUY_URL:  "",   // Klartext-Vorlagen-Set (19 €)
  NOTFALL_BUY_URL:   "",   // Der Notfall-Ordner — Vorsorge-Dossier (19 €, PDF; Datei: produkt-imperium/ausgabe/)
  NOTFALL_EN_BUY_URL: "",  // The Emergency Binder — engl. Ausgabe fuer Expats (19 €, PDF; Datei: produkt-imperium/ausgabe/)
  COMPLIANCE_BUY_URL: "",   // KI-Compliance-Paket regulierte Berufe (39 €)
  SCHNELLSTART_BUY_URL: "", // KI-Schnellstart-Workbook (29 €)
  AUDIT_BUY_URL:     "",   // KI-Sichtbarkeits-Audit Workbook (29 €, einmalig)
  /* Ersatz für die PLATZHALTER-Gumroad-Links (alle 404, 17.10.2026).
     Leer = Mail-Bestellung; sobald hier ein Link steht, wird daraus
     wieder der Kauf-Knopf mit Preis. */
  ARBEITSVERTRAG_VORLAGE_SCHWEIZ_BUY_URL: "",
  DATENSCHUTZERKLAERUNG_VORLAGE_SCHWEIZ_BUY_URL: "",
  FREELANCER_STEUERN_CHECKLISTE_BUY_URL: "",
  GMBH_STATUTEN_VORLAGE_SCHWEIZ_BUY_URL: "",
  IMPRESSUM_VORLAGE_SCHWEIZ_BUY_URL: "",
  KI_COMPLIANCE_PAKET_BUY_URL: "",
  KI_PROFI_PROMPTS_BUY_URL: "",
  KUENDIGUNG_VORLAGE_SCHWEIZ_BUY_URL: "",
  MIETVERTRAG_VORLAGE_SCHWEIZ_BUY_URL: "",
  NDA_VORLAGE_SCHWEIZ_BUY_URL: "",
  RECHNUNG_VORLAGEN_BUNDLE_BUY_URL: "",
  VOLLMACHT_VORLAGE_SCHWEIZ_BUY_URL: "",
  TEXTE_STARTER_URL: "",   // Texte-Service Starter (CHF 49, einmalig) — leer = Mail-Anfrage
  TEXTE_FLAT_URL:    ""    // Texte-Service Monats-Flat (CHF 39/Monat) — leer = Mail-Anfrage
};
