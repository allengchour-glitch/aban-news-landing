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
window.ABAN_PAY = {
  TWINT_URL: "",
  SHOPIFY_URL: "https://luxestyle.ch/products/aban-news-founding-member",
  CARD_URL: ""
};
