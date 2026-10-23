# Produktionsantrag Google Play – Antworten zum Kopieren

Play Console → Dashboard → „Zugriff auf Produktion beantragen“. Frühestens am 13.10., sicher ab dem 14.10.2026.
Die Antworten sind auf Englisch, weil Google den Antrag auf Englisch prüft. Alles in **[eckigen Klammern]**
musst du selbst prüfen. Die Feedback-Punkte stammen teils aus unseren eigenen Design-Prüfungen; streich, was kein Tester gesagt hat und ehrlich ausfüllen. Bitte nichts erfinden, Google vergleicht mit den Testdaten.

## Teil 1: Der geschlossene Test

**How did you recruit users for your closed test?**
> I invited friends, family and existing LuxeStyle customers through a Google Group (luxestyle-tester) and
> asked additional testers in Android testing communities. [17] testers opted in, more than the required 12.

**How easy was it to recruit testers?** → [„Neither easy nor difficult“ oder deine ehrliche Wahl]

**Describe the engagement you received from testers during your closed test.**
> Testers installed the app and used it over 14 days to browse collections, search products, open
> product pages, add items to the cart and go to the Shopify checkout. We shipped several updates
> (up to version 1.0.11) during the test, and testers kept the app installed and updated.
> [Ergänzen: z. B. „several testers reported…“ – nur was wirklich kam.]

**Provide a summary of the feedback that you received from testers. Include how you collected it.**
> Feedback came through [direct messages / the Google Group / Play's private feedback – nur was stimmt],
> plus our own design reviews. The main points were:
> - Category tiles showed duplicate or unrelated images. [von dir gemeldet]
> - Variant selection (colour/size) and adding to cart needed too many taps.
> - Testers wanted to see product ratings and the delivery time before checkout.
> - [weitere echte Rückmeldungen]

## Teil 2: Über die App

**Who is the intended audience of your app?**
> Shoppers in Switzerland aged 18+ who buy fashion, jewellery, accessories and gifts from the
> LuxeStyle online shop (luxestyle.ch).

**Describe how your app provides value to users.**
> The app is a fast native shopping app for the LuxeStyle shop. Users browse departments and
> collections, search, filter by budget, see real customer ratings and the expected delivery date,
> keep a cart and pay through Shopify's secure checkout (TWINT, cards). It always shows the live catalogue,
> so new products appear automatically.

**How many installs do you expect in your first year?** → [ehrlich wählen, z. B. „0–10K“]

## Teil 3: Was wir geändert haben

**What changes did you make to your app based on what you learned during your closed test?**
> - 1.0.6: new home screen, colour choice with product images, delivery date, cart suggestions to reach
>   free shipping, and the back button now keeps the search and the list.
> - 1.0.7–1.0.10: a bottom sheet to pick size/colour and buy, a "+" button on every product card,
>   delivery time in the cart, a single filter row, and a home screen that starts with women's fashion.
> - also in this phase: star ratings from real customer reviews, category tiles without duplicate images, and a
>   "by budget" row with price filters.
> - 1.0.11: categories follow the shop's new menu (gifts & Christmas) automatically, longer
>   category names are no longer cut off, and emoji collection links work.
> Every version also passed our automated UI tests on real shop data before release.

**How did you decide that your app is ready for production?**
> The app ran for 14+ days with [17] testers and no crashes were reported in Android vitals [prüfen!].
> All feedback points above were fixed, the full purchase flow (browse → product → cart → checkout)
> works with live shop data, and our automated tests pass on every build.

## Vor dem Absenden prüfen

1. Play Console → Test → Geschlossener Test → **Tester**: mindestens 12 aktive Tester seit 14 Tagen.
2. **Android Vitals → Abstürze**: Wenn es dort Abstürze gibt, die Antwort „no crashes“ anpassen.
3. Datenschutz-Link, Datensicherheit und Inhaltseinstufung müssen grün sein (Dashboard).
4. Nach dem Absenden prüft Google meist innerhalb von 7 Tagen. Danach: Produktions-Release mit 1.0.11.
