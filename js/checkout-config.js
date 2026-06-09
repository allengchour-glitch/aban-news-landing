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
  MONITOR_ABO_URL:   "",   // KI-Sichtbarkeits-Monitor (9 €/Monat, Subscription)
  VORLAGEN_BUY_URL:  "",   // Klartext-Vorlagen-Set (19 €)
  COMPLIANCE_BUY_URL: "",   // KI-Compliance-Paket regulierte Berufe (39 €)
  SCHNELLSTART_BUY_URL: "", // KI-Schnellstart-Workbook (29 €)
  AUDIT_BUY_URL:     "",   // KI-Sichtbarkeits-Audit Workbook (29 €, einmalig)
  TEXTE_STARTER_URL: "",   // Texte-Service Starter (CHF 49, einmalig) — leer = Mail-Anfrage
  TEXTE_FLAT_URL:    ""    // Texte-Service Monats-Flat (CHF 39/Monat) — leer = Mail-Anfrage
};
