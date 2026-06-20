# 📧 E-Mail/SMS-Flow-Playbook 2026 — LuxeStyle (copy-paste für Klaviyo/Shopify Email)

> Recherche-Schwarm 2026-06-20. CH, Deutsch (Sie = Premium; alternativ durchgehend Du für TikTok-Zielgruppe).
> Gratis-Versand ab CHF 49, TWINT, WELCOME10. Diese 6 Flows = typ. 25–35% des Umsatzes.
> **Prio nach Impact:** Abandoned Checkout > Abandoned Cart > Welcome > Browse > Post-Purchase > Win-Back.
> ⚠️ Vor Aktivierung: Domain-Auth (DNS) erledigen, sonst Spam. Codes trennen (sonst nicht messbar).

## 1) WELCOME (3 Mails)
- **Sofort** — Betreff `Da ist Ihre -10% 🎁 (Code WELCOME10)` · Code + Trust (Gratis ab 49 · TWINT · 30 Tage Rückgabe) + CTA Neuheiten/Bestseller.
- **Tag 2** — `Was LuxeStyle anders macht ✨` · Markenstory (3-4 Sätze) + 3-4 Bestseller mit Preis+Sterne · Code-Reminder.
- **Tag 4** — `Letzte Erinnerung: -10% laufen bald ab ⏳` · Dringlichkeit + Top-Favoriten.
- SMS sofort: „LuxeStyle: Willkommen! -10%: WELCOME10. {{link}} Gratis-Versand ab CHF49. STOP=Abmelden."

## 2) ABANDONED CART (3 Mails, 3-4 Tage; Rabatt NUR Neukunde)
- **4 Std** `Sie haben etwas Schönes vergessen 👀` · {{cart items}} + „reserviert für Sie".
- **24 Std** `Gefällt Ihnen das noch? ❤️` · Social Proof + Einwände (TWINT/Rückgabe).
- **48-72 Std** Neukunde `Noch unentschlossen? -10% 🎁` (Code COMEBACK10) / Bestandskunde ohne Code.
- SMS 5-15 Min: „Ihr Warenkorb wartet 🛍️ {{link}} Gratis ab CHF49. STOP=Abmelden."

## 3) ABANDONED CHECKOUT (HÖCHSTE PRIO — euer Leck; 3 Mails, 7 Tage)
- **1 Std** `Fast geschafft – nur ein Klick fehlt ✅` · CTA + „Bezahlen mit TWINT, Karte oder Rechnung · Gratis ab 49 · 30 Tage" + {{checkout items}}.
- **24 Std** `Können wir helfen? 💬` · 3 Blöcke Zahlung/Versand/Sicherheit + Bewertungen + „Antworten Sie auf diese Mail".
- **48-72 Std** Neukunde `Ihr Warenkorb + 10% – nur kurz ⏳` (COMEBACK10) / Bestand ohne Code.
- SMS 5-15 Min: „Nur noch 1 Schritt 🛍️ {{link}} Zahlung per TWINT. STOP=Abmelden."

## 4) BROWSE ABANDONMENT (1-2 Mails, kein Rabatt)
- **2-4 Std** `Noch im Kopf? 👀` · {{viewed product}} + 3-4 ähnliche.
- **24 Std (opt.)** `Beliebt bei unseren Kundinnen ⭐` · bewertete Bestseller, Inspiration.

## 5) POST-PURCHASE + REVIEW (3 Mails)
- **Sofort** `Danke für Ihre Bestellung 💛` · Dank + Erwartung, kein Verkaufsdruck.
- **Tag 10-14** `Wie gefällt Ihnen Ihr neues Stück? ⭐` · Review-Bitte (30 Sek) + „nicht perfekt? Antworten Sie".
- **Tag 21-30** `Das passt perfekt dazu ✨` · Pflege-Tipps + Cross-Sell + opt. Treue-Code.

## 6) WIN-BACK (3 Mails, Start ~150-180 Tage; Rabatt erst Mail 3)
- **~150 T** `Lange nicht gesehen 👋` · Neuheiten, kein Rabatt.
- **+4 T** `Das lieben unsere Kundinnen gerade ⭐` · Bestseller + Social Proof.
- **+4 T** `Wir vermissen Sie – hier sind -15% 💛` (Code WELCOMEBACK15).
- SMS parallel: „Wir vermissen Sie 💛 -15% WELCOMEBACK15: {{link}} STOP=Abmelden."

## Regeln
- **Codes trennen:** WELCOME10 (Welcome) · COMEBACK10 (Abbruch, nur Neukunde via Conditional Split „Bestellungen=0") · WELCOMEBACK15 (Win-Back).
- **Überschneidung:** Browse schliesst Cart/Checkout-Profile aus; Prio Checkout > Cart > Browse.
- **SMS CH:** keine 21-08 Uhr, immer „STOP=Abmelden", Emojis sparsam (Unicode = 70 Zeichen).
- **A/B** zuerst Betreffzeilen.
