// ============================================================
// ZAHLUNGS-SCHALTER — zentrale Konfiguration (eine Quelle der Wahrheit)
// Wird von founding.html (+ en/founding.html) geladen.
//
// aban news ist ein Schweizer Einzelunternehmen. Neben PayPal (fest im
// Checkout-Button) kannst du hier OPTIONALE Zahlwege freischalten, indem
// du den jeweiligen Link einträgst. Leer ("") = Button erscheint NICHT
// (kein toter Link, kein leeres Element).
//
//  TWINT_URL    — TWINT-Pay-Link oder QR-/Zahlseite (CH).
//                 z.B. ein TWINT-„Bezahllink" aus deiner Banking-App,
//                 oder eine Datatrans/Wallee-Checkout-URL mit TWINT.
//  SHOPIFY_URL  — Shopify-Checkout-/Produktlink (Kreditkarte, Apple/Google Pay,
//                 TWINT je nach Shopify-Payments-Konfig).
//                 z.B. "https://deinshop.myshopify.com/cart/VARIANT_ID:1"
//                 oder ein Shopify-„Buy Button"/Permalink.
//  CARD_URL     — separater Kreditkarten-Link, falls getrennt von Shopify
//                 (z.B. Stripe Payment Link). Sonst leer lassen.
//
// WICHTIG: Hier gehören nur ÖFFENTLICHE Bezahl-Links rein — niemals
// Karten-Nummern, Secrets oder API-Keys. Die Site bleibt statisch & DSGVO-konform.
// ============================================================
//  PREMIUM_MONTHLY_URL / PREMIUM_YEARLY_URL — Checkout-Links für das €9/Monat- bzw.
//                 €89/Jahr-Premium-Abo. Egal welcher Anbieter (Lemon Squeezy, Stripe
//                 Payment Link, PayPal-Abo, beehiiv) — einfach den fertigen Checkout-Link
//                 einfügen. Leer = der Premium-Button zeigt weiter auf die Founding-Seite.
window.ABAN_PAY = {
  TWINT_URL: "",
  SHOPIFY_URL: "https://luxestyle.ch/products/aban-news-founding-member",
  CARD_URL: "",
  PREMIUM_MONTHLY_URL: "https://abannews.lemonsqueezy.com/checkout/buy/266dd736-8351-4d7c-9c3d-eb1c7dfd5e9c?media=0&logo=0&desc=0&discount=0",
  PREMIUM_YEARLY_URL: "https://abannews.lemonsqueezy.com/checkout/buy/d3c8b929-3a65-47c7-ba2b-cbc08c686b79?media=0&logo=0&desc=0&discount=0",
  // ── aban Pro (€19/Monat, €190/Jahr) — KI-Studio (/ki-studio.html) ──
  // Lemon-Squeezy-Checkout-Links des Pro-Abos. LEER = Buttons zeigen ehrlich „Start in Kürze".
  // WICHTIG: Im LS-Produkt „Lizenzschlüssel" (license keys) aktivieren — die KI-Tools werden per
  // Lizenzschlüssel freigeschaltet (Validierung am Edge, kein Store-API-Key nötig).
  PRO_MONTHLY_URL: "https://abannews.lemonsqueezy.com/checkout/buy/530fd3f2-6d1d-4f14-9857-09a20c1a4f63?enabled=1777687&media=0&logo=0&desc=0&discount=0",
  PRO_YEARLY_URL: "https://abannews.lemonsqueezy.com/checkout/buy/4379ddc9-5b8d-416f-aea8-22a5ed98d031?enabled=1777696&media=0&logo=0&desc=0&discount=0"
};
