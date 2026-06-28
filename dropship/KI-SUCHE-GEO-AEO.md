<!-- Auto-Recherche 2026-06-28 (Sammler-Session). NUR INFO / technisches Paket für die Shop-Session, falls gewünscht.
Sammler-Session ändert nichts am Shop/Theme. Quellen: GEO/AEO-Recherche (14+ Quellen, Juni 2026).
Ergänzt dropship/GRATIS-KAEUFER-TRAFFIC-PLAYBOOK.md + dropship/WACHSTUMS-WISSENSBASIS.md. -->

# 🤖🔎 KI-Suche sichtbar werden (GEO/AEO) — LuxeStyle CH

> **GEO/AEO** = Produktdaten + Inhalte so aufbereiten, dass KI-Antwortmaschinen (Google AI Mode/Overviews, ChatGPT,
> Perplexity, Gemini) den Shop **zitieren** bzw. als Produktkarte zeigen — kaufabsicht-starker Gratis-Traffic.

## ⚠️ Ehrliche Realität zuerst (spart Zeit)
- **ChatGPT-Shopping & Perplexity-Merchant-Programme sind 2026 faktisch auf US-Händler/US-Versand beschränkt.** Ein
  reiner **CH-Shop kommt dort kurzfristig NICHT** in die Produktkarten. → **Keine Zeit in OpenAI-/Perplexity-Merchant-
  Anträge stecken**, solange CH-only. (Erst relevant, falls US-Versand/-Markt aktiviert wird — dann greift die
  Shopify→Perplexity-Auto-Syndizierung.)
- **Der erreichbare CH-Gratis-Hebel = Google + organisch:** (1) **Google Merchant Center Free Listings** (speist Google
  AI Mode/Overviews, in CH verfügbar — **läuft bei euch bereits**, Feed 3186 Produkte), (2) **sauberes JSON-LD**,
  (3) **AEO-Content** (FAQ/Ratgeber) + (4) **robots.txt-Freigabe** für die richtigen Bots, damit KI die Seiten
  organisch zitiert.
- **Erwartung:** für einen neuen kleinen CH-Shop **kurzfristig gering** (KI bevorzugt etablierte Quellen), aber
  **~0 Kosten ausser Arbeit** und **Mittel-/Langfrist-Aufbau** des zweiten intent-starken Gratis-Kanals neben Pinterest.
  Ersetzt **nicht** die 3 User-Klicks.

---

## 1. robots.txt — die richtigen Bots NICHT blocken (wichtigster Quick-Check)
KI-Sichtbarkeit stirbt, wenn „Search/Retrieval"-Bots geblockt sind. „Training"-Bots sind optional (kein Einfluss auf
Sichtbarkeit). In Shopify via `robots.txt.liquid` (Theme) prüfen, dass **nichts davon disallowed** ist:

**Unbedingt erlauben (Sichtbarkeit):** `OAI-SearchBot` (ChatGPT-Suche) · `ChatGPT-User` · `PerplexityBot` ·
`Googlebot` · `Bingbot` · `Applebot`.
**Empfohlen erlauben:** `GPTBot` (OpenAI nennt es als Voraussetzung, um in ChatGPT-Such-Antworten zu erscheinen).
**Optional/egal für Sichtbarkeit (reines Training):** `Google-Extended`, `ClaudeBot`/`Claude-SearchBot`,
`Applebot-Extended` — erlauben oder blocken ändert die Such-Sichtbarkeit nicht.
> Faustregel: Reichweite gewünscht → **keine Disallow-Regeln gegen diese Bots**. `ChatGPT-User`/`Perplexity-User` nie
> blocken. Änderungen wirken nach 24–72 h. Falls eine „AI blockieren"-App installiert ist → das killt KI-Sichtbarkeit.

---

## 2. JSON-LD / strukturierte Daten (Shopify/Horizon konkret)
Horizon liefert ein **Basis-Product-JSON-LD automatisch**, oft **ohne** GTIN/brand/aggregateRating → ergänzen.

**Typen + Pflichtfelder:**
- **`Product`** (pro PDP): `name`, `image` (hochauflösend ~1600px), `description`, `brand`, `sku`, **`gtin13`/`gtin`**
  (stark empfohlen — ohne GTIN weniger Rich-/AI-Impressions).
- **`Offer`** (genested, kritisch): `price`, **`priceCurrency:"CHF"`**, `availability` (InStock/OutOfStock),
  `priceValidUntil`, `itemCondition`, `url`, `shippingDetails` (CH), `hasMerchantReturnPolicy`.
- **`AggregateRating` + `Review`**: nur mit **echten** Judge.me-Reviews (`ratingValue`, `reviewCount`).
- **`BreadcrumbList`** (Kategorie-Pfad), **`Organization`** (Startseite: name/url/logo/`sameAs`-Social/Kontakt),
  **`FAQPage`** (für FAQ-Content).

**Umsetzung (2 Wege):**
1. **Einfach + update-sicher:** Schema-/SEO-App (z. B. „JSON-LD for SEO", „Schema Plus") installieren.
2. **Selbst:** GTIN/Marke als **Metafields** pflegen, erweitertes `<script type="application/ld+json">` im
   `product`-Section via Liquid ausgeben (`product.metafields…`, `…variant.price | money_without_currency`,
   `priceCurrency 'CHF'`).
> **Nur EINE Quelle** für Product-JSON-LD aktiv lassen (Theme-Default ODER App ODER Snippet — nicht doppelt). Danach
> **immer mit Google Rich Results Test + Merchant-Center-Diagnostics validieren.** Bei Horizon-Updates können manuelle
> Liquid-Edits verloren gehen → App oder dokumentiertes Snippet.

---

## 3. AEO-Content (damit KI die Seiten zitiert) — gratis, autonom
KI zitiert Seiten mit **direkten, strukturierten Antworten**: Frage als H2 → **30–60-Wörter-Direktantwort** → Details.
- **FAQ-Seite + Produkt-FAQ** mit `FAQPage`-Schema: „Wie lange dauert der Versand in die Schweiz?", „30 Tage Rückgabe?",
  „Kann ich mit TWINT zahlen?", „Fallen Zollgebühren an?", „Wie fällt Grösse X aus?".
- **Kaufratgeber** (Blog/Seiten, mit Link zur Kollektion): „Sommerkleid für die Schweiz: welcher Schnitt für welchen
  Anlass", „Schmuck-Material-Guide: Edelstahl vs. 925er-Silber vs. vergoldet", „Plateau-Sneaker richtig kombinieren".
- **Faktische Produktbeschreibungen** (Material, Masse cm, Pflege, Anlass) statt Floskeln — KI matcht auf **Fakten**.
- **Vergleichs-/Grössen-Tabellen** sind besonders zitierfähig.
> ❗ **Kein CJ/Dropship-Leak** in FAQ/Ratgeber (jetzt KI-lesbar). Keine Fake-Reviews/aufgeblasene Ratings.

---

## 4. Google AI Mode/Overviews — der echte CH-Hebel
- Basis = **Google Merchant Center Free Listings** (gratis, CH; läuft bereits über den „Google & YouTube"-Sales-Channel).
- **Ranking-Signal Nr. 1 = Produktdaten-Qualität**, nicht Gebote: GTIN/MPN, **`google_product_category`** (im aktuellen
  Feed noch leer → ergänzen!), Material/Farbe/Grösse/Geschlecht, hochauflösende Bilder, **aktuelle Preise/Verfügbarkeit**
  (häufiger Sync), echte Reviews.
- **E-E-A-T:** `Organization`+`sameAs`, gefüllte Rechts-/Service-Seiten, echte Bewertungen, klare Versand-/Rückgabe-Infos.
  Merchant-Center-Diagnostics regelmässig auf Disapprovals prüfen.

---

## 5. Konkrete To-do-Liste für die Shop-Session (ohne User-Klick, ausser App-Install)
- [ ] **robots.txt prüfen** (`robots.txt.liquid`): keine Disallows gegen OAI-SearchBot/ChatGPT-User/PerplexityBot/
      Googlebot/Bingbot/Applebot/GPTBot; evtl. „AI-blockieren"-App deaktivieren.
- [ ] **JSON-LD erweitern** (App oder Snippet): Product+Offer(CHF)+AggregateRating(echt)+BreadcrumbList+Organization+
      FAQPage; mit Rich Results Test validieren; nur eine Quelle aktiv.
- [ ] **GTIN/Marke als Metafields** pflegen (wo vorhanden), sonst `identifier_exists=no` (im Merchant-Feed schon korrekt).
- [ ] **`google_product_category`** in den Merchant-Feed ergänzen (Generator `automation/autopilot/merchant_feed.mjs`).
- [ ] **FAQ-Seite + `FAQPage`-Schema** + 2–4 Kaufratgeber (mit Kollektions-Links), faktische Produkttexte.
- [ ] **Echte Judge.me-Reviews** in JSON-LD einspeisen (nur ≥4★, kein Fake).
- [ ] Merchant-Center-Diagnostics auf Disapprovals checken (User-Login).

## 6. Fallstricke
- ❌ Such-Bots blocken = unsichtbar. ❌ Zeit in US-gegatete OpenAI/Perplexity-Anträge (CH-only). ❌ Doppeltes/fehlerhaftes
  JSON-LD (Theme + App + Snippet). ❌ Falsche `priceCurrency`/veraltete `availability` → Disapproval. ❌ Fehlende GTIN.
  ❌ Fake-Reviews. ❌ Marketing-Floskeln statt Fakten. ❌ CJ-Leak im KI-lesbaren Content. ❌ Manuelle Liquid-Edits bei
  Theme-Updates verlieren.

> Branchen-Zahlen (z. B. „+527 % AI-Sessions", „+58 % Snippet-Sichtbarkeit mit Schema") sind Indikatoren aus
> Marketing-Quellen, keine garantierten Plattform-Statistiken. Recherche-Stand Juni 2026 — KI-Programme ändern sich
> schnell, vor Umsetzung gegenchecken.
