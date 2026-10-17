# Sterne in der App (Judge.me-Bewertungen)

**Stand 30.09.2026:** 2'080 Produkte haben Bewertungen. Judge.me schreibt sie in die
Shopify-Metafelder `reviews.rating` und `reviews.rating_count`, beide für die Storefront
freigegeben (PUBLIC_READ).

**Warum nicht einfach so:** Die App liest den Shop ohne Schlüssel. Ohne Schlüssel gibt Shopify
keine Metafelder heraus (Fehler `unauthenticated_read_metafields`). Die Shop-Seite als Umweg
wären rund 440 KB pro Produkt, zu viel fürs Handy.

**Lösung:** ein **öffentlicher Storefront-Schlüssel**.
- Er ist für Apps und Webseiten gedacht und kann nur lesen.
- Er gehört trotzdem nicht ins Repo, er kommt aus einem GitHub-Secret.

## Einmalig (User, ca. 3 Minuten)
1. Shopify-Admin → Vertriebskanäle → **Headless** hinzufügen (Shopify-App, gratis).
2. „Storefront erstellen“ → Name `LuxeStyle App`.
3. Bei den Storefront-API-Berechtigungen **Metaobjekte/Metafelder lesen** einschalten
   (`unauthenticated_read_metafields`), dazu Produkte und Kollektionen lesen.
4. Den **öffentlichen Zugriffsschlüssel** kopieren. Den privaten nicht verwenden.
5. GitHub → Repo → Settings → Secrets → Actions → **`LUXE_STOREFRONT_TOKEN`** anlegen.
6. Workflow „LuxeStyle Android-App bauen“ neu starten.

## Was die App dann zeigt
- Auf jeder Produktkarte: ★★★★★ 4.9 (15).
- Auf der Produktseite unter dem Titel: „4.9 · 15 Bewertungen“. Antippen öffnet die
  Bewertungen auf luxestyle.ch.
- Nur echte Werte. Ohne Bewertung (Anzahl 0) oder ohne Schlüssel erscheinen **keine** Sterne,
  nie eine erfundene Note.

## Technik
- `data/Storefront.kt`:
  - Der Platzhalter `#rating` wird nur mit Schlüssel durch die Metafeld-Abfrage ersetzt.
  - Ohne Schlüssel bleibt er ein GraphQL-Kommentar, und die Abfrage läuft wie bisher.
- `data/Parse.kt` `rating()`: liest das Rating-JSON (`scale_max`), gibt ohne Bewertung null
  zurück. Tests in `ShopLogicTest`.
- Build: `LUXE_STOREFRONT_TOKEN` → `BuildConfig.STOREFRONT_TOKEN` (`app/build.gradle.kts`).
