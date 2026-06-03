# LuxeStyle — Shop-Design- & Conversion-Audit (2026-06-02)

**Ziel:** Mehr KÄUFE aus dem (fast nur mobilen, impulsiven) TikTok-Fashion-Traffic.
**Befund-Basis:** Live-Storefront luxestyle.ch + Theme-Template (Horizon · LuxeStyle Branded, MAIN)
+ Hauptmenü (66 Links geprüft) + aktuelle CRO-Best-Practices (Quellen unten).

**Wichtige Einschränkung:** Das Live-/MAIN-Theme ist per Shopify-API **schreibgesperrt** (themeFilesUpsert
nur auf unpublished Themes; Publishing ebenfalls gesperrt). Darum sind die Theme-Fixes unten als
**exakte Customizer-Schritte** formuliert (je ~1–2 Min). Navigation/Inhalte/SEO kann ich per API.

---

## ✅ Was technisch sauber ist
- **Alle 66 Menü-/Untermenü-Collection-Links lösen auf** — keine toten Navi-Links (häufigste versteckte
  Conversion-Falle → bei dir sauber).
- 5 echte Homepage-Sektionen (Hero, Top-10-Bestseller, CJ-Neuheiten, Highlights, Bestseller) — kein
  echter Platzhalter (das „Produkttitel CHF 19.99" war nur der Lade-Skeleton).
- Ankündigungsleiste enthält Versand + 30-Tage-Garantie (Trust vorhanden).

---

## 🔴 PRIO 1 — sofort (grösster Hebel, je 1–2 Min im Customizer)

### 1. Hero-Headline sagt „Zuhause" auf einem MODE-Shop
- **Ist:** „Sommer-Trends 2026 — Premium für dein **Zuhause**"
- **Problem:** TikTok-Ads bewerben Damenmode/Kleider, die Startseite verspricht „Zuhause/Deko" →
  Erwartungsbruch in der ersten Sekunde = Absprung.
- **Fix (Theme-Editor → Hero → Überschrift):**
  > **Sommer-Mode 2026 — Premium-Looks für jeden Auftritt**
  Alternativen: „Feminine Sommer-Looks – Schweizer Lieblingsstücke 2026" · „Deine Sommer-Garderobe 2026 – ab CHF 29.90".
- **Bonus (Hero-Bild):** Palmblatt → **echtes Model-/Lifestyle-Foto** (gleicher Look wie die TikTok-Reels,
  z.B. Brise/Daisy/Savanna). Best Practice: Landingpage soll die **Bildsprache der Ad spiegeln**.

### 2. Ankündigungsleiste: zwei widersprüchliche Rabatte + Margenfresser
- **Ist:** „LAUNCH-WOCHE: **30% mit Code LAUNCH30** · Versand CH 7-12 Tage · 30 Tage Garantie"
- **Problem:** Parallel läuft das **WELCOME10-Popup (10%)** + die Klaviyo-Mails mit WELCOME10. Zwei Codes
  (30% vs 10%) verwirren UND **30% frisst die Marge** (CJ-Dropship!). Kund:innen nehmen immer den höheren.
- **Fix (Theme-Editor → Header/Ankündigung):** EIN klares Versprechen, z.B.:
  > **Gratis-Versand ab CHF 65 · –10% mit Code WELCOME10 · 30 Tage Rückgabe**
  (LAUNCH30 deaktivieren ODER bewusst als einzige Aktion behalten — aber nicht beide.)

### 3. Zwei englische Buttons im deutschen Shop
- **Ist:** Sektionen „Top 10 Bestseller" und „CJ Neuheiten 2026" haben den Button **„View all"**,
  die anderen „Alle anzeigen".
- **Fix (Theme-Editor → jeweilige Produktliste → Button-Label):** „View all" → **„Alle anzeigen"** (2×).

---

## 🟠 PRIO 2 — Mobile-Conversion (TikTok = ~99% mobil, impulsiv, <2s Geduld)

### 4. Sticky „In den Warenkorb" auf Mobile
Horizon unterstützt eine **mitscrollende Add-to-Cart-Leiste**. Aktivieren auf der Produktseite →
Kaufbutton immer sichtbar = klarer Mobile-Uplift bei Impuls-Traffic.

### 5. Grössentabelle mit Mass-Angaben auf den Kleider-PDPs
Fashion-spezifisch: **Size-Chart + Modell-Masse** senken Retouren um 15–25% und erhöhen die Kaufsicherheit.
→ Als Produkt-Metafield/Block oder im Beschreibungstext je Kleid (S/M/L in cm).

### 6. Sterne-Bewertungen schon auf den Produktkacheln
Judge.me ist installiert (56+ Reviews) — den **Sterne-Badge auch auf Collection-/Homepage-Kacheln**
einblenden (Theme-/App-Einstellung). Social Proof beim Stöbern, nicht erst auf der PDP.

### 7. Ladezeit <2s mobil
Hero-Bild als WebP/komprimiert, Lazy-Load für untere Sektionen. TikTok-User springen ab >2s.

---

## 🟡 PRIO 3 — Fokus & Konsistenz

### 8. Hero/Menü-Ziel vs. Ad-Ziel vereinheitlichen
- Hero-CTA + Menü „Sommer + Outdoor" → `/collections/sommer-2026` (**195 Produkte, gemischt Mode+Deko**).
- TikTok-Ads landen auf `/collections/sommer` (**46 fokussierte Damenmode**).
- **Empfehlung:** Hero-CTA auf die fokussierte Womenswear-Collection zeigen lassen → Startseite = Ad-Intent.

### 9. Mega-Menü (18 Kategorien) — Fokus schärfen
Navi ist technisch ok und Mode steht vorn (Pos. 3–5). Aber 18 Top-Kategorien (Tech, Küche, Auto, Baby …)
verwässern die Marke für Fashion-Traffic. Optional: Nicht-Mode unter **„Mehr"** gruppieren, Mode/Schmuck/
Schuhe/Sale prominent. (Reine Umsortierung kann ich per API machen — auf Wunsch.)

---

## Was ich (Claude) per API direkt machen kann — auf dein „ja"
- **Menü umsortieren/gruppieren** (fashion-first) — ohne Datenverlust, reversibel.
- **Collection-SEO & -Beschreibungen** der Top-Fashion-Kollektionen schärfen (Meta-Title/Description + Intro).
- **Produkt-SEO/Beschreibungen** (z.B. Size-Charts in die Kleider-Texte einbauen).
- **Smart-Collection-Regeln/Sortierung** (Bestseller zuerst).
Nicht per API: Hero-Text/-Bild, Ankündigungsleiste, Button-Labels, Sticky-ATC, Theme-Layout (MAIN gesperrt → Customizer).

## Quellen (Best Practices 2026)
- Shopify – Conversion Rate Optimization for Fashion Brands (2026)
- easyappsecom – Shopify Mobile Commerce Statistics 2026 / Fashion Ecommerce Guide
- growthsuite.net – TikTok Traffic Not Converting? Shopify Guide (2026)
