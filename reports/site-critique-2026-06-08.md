# Gemini Site-Kritik — 2026-06-08

**Gesamtnote: 4/10**

## ✅ Stärken
- Klar definierte Zielgruppe (Schweizer Frau 18-40).
- Gute Top-Bar mit Vertrauenssignalen (Versand, Rückgabe, Rabatt).
- Klare Kategorietitel mit Icons.
- Mobile Navigation (Header) ist Standard und funktional.
- Saisonale Relevanz im Hero (Sommer-Mode 2026).

## 🔧 Kritische Probleme (nach Priorität)

### 🔴 [Hero] CTA 'Sommer-Trends entdecken' ist ein unauffälliger Textlink, nicht als Button erkennbar und hat zu geringen Kontrast zum Hintergrund.
- **Fix:** CTA als prominenter Button mit klarem Kontrast gestalten und farblich hervorheben.
- **Umsetzbar per:** Theme-Customizer

### 🔴 [Optische Konsistenz] Hero-Bild ist generisch und vermittelt keine starke Premium-Mode-Ästhetik. Text auf Hero hat zu geringen Kontrast.
- **Fix:** Hochwertigeres, markenspezifisches Hero-Bild verwenden, das 'Premium-Mode' besser visualisiert. Textfarbe anpassen für bessere Lesbarkeit und Kontrast.
- **Umsetzbar per:** Bild

### 🔴 [Produktkacheln] Preise und Sternebewertungen fehlen auf allen Produktkacheln (Homepage, Kollektionsseiten), was ein massiver Reibungspunkt ist.
- **Fix:** Preise und, falls vorhanden, Sternebewertungen direkt unter jedem Produktbild anzeigen.
- **Umsetzbar per:** Theme-Customizer

### 🔴 [Optische Konsistenz] 'Sale'-Badge auf Produktkacheln (z.B. Jade Roller) wirkt billig und nicht premium.
- **Fix:** Design des 'Sale'-Badges überarbeiten, um es hochwertiger und konsistenter mit dem Marken-Look zu gestalten.
- **Umsetzbar per:** Theme-Customizer

### 🔴 [Vertrauen] Inkonsistente Rückgabefristen (30 Tage auf Homepage, 14 Tage auf Kollektionsseiten) schaffen Verwirrung und untergraben Vertrauen.
- **Fix:** Rückgabefrist auf einen Wert (z.B. 30 Tage) festlegen und konsistent über alle Seiten kommunizieren.
- **Umsetzbar per:** Copy

### 🔴 [Produktkacheln] Produktbilder auf 'Wohnen & Dekoration' enthalten Massangaben oder Text-Overlays, was unprofessionell wirkt und den Premium-Anspruch untergräbt.
- **Fix:** Produktbilder ohne störende Overlays verwenden. Solche Informationen gehören in die Produktbeschreibung.
- **Umsetzbar per:** Bild

### 🟡 [Produktkacheln] Die 'Top 10 Bestseller' auf der Homepage zeigen eine sehr breite und inkonsistente Produktpalette (Jade Roller, Uhr, Kleidung), die die 'Premium-Mode'-Botschaft verwässert.
- **Fix:** Fokus auf 'Premium-Mode' in den Bestsellern, oder die Sektion umbenennen/neu kuratieren, um die Markenidentität zu stärken (z.B. 'Unsere Lifestyle-Empfehlungen').
- **Umsetzbar per:** Theme-Customizer

### 🟡 [Mobil] Cookie-Banner verdeckt einen grossen Teil des Inhalts auf allen Seiten, was die User Experience stört.
- **Fix:** Cookie-Banner optimieren, z.B. als schmalere Leiste am unteren Bildschirmrand oder als dezenteres Pop-up.
- **Umsetzbar per:** Theme-Customizer

### 🟡 [Trust] Lieferzeit von '7-14 Tagen' ist für Premium-Mode sehr lang und kann ein Kaufhindernis sein.
- **Fix:** Wenn nicht optimierbar, klar und transparent kommunizieren. Ggf. Express-Optionen anbieten oder den Wert auf der Homepage prominenter hervorheben.
- **Umsetzbar per:** Copy

### 🟢 [Navigation] Der Navigationspunkt 'Selbst gestalten' im Desktop-Header wirkt für ein Premium-Mode & Lifestyle-Shop untypisch und könnte verwirrend sein.
- **Fix:** Überprüfen, ob dieser Punkt zur Markenstrategie passt. Ggf. umbenennen oder in 'Mehr' verschieben.
- **Umsetzbar per:** Theme-Customizer

### 🟢 [Typografie] Die Beschreibungstexte auf den Kollektionsseiten sind sehr lang und textlastig, schwer zu scannen.
- **Fix:** Texte kürzen, in Absätze gliedern, wichtige Informationen hervorheben (Fettdruck, Bullet Points).
- **Umsetzbar per:** Copy

## ⚡ Quick Wins
- CTA im Hero als Button gestalten und Kontrast verbessern.
- Preise auf allen Produktkacheln sichtbar machen.
- Inkonsistente Rückgabefristen auf 30 Tage festlegen und überall anpassen.
- 'Sale'-Badge visuell aufwerten.
- Produktbilder ohne Overlays verwenden (Wohnen & Deko).
- Cookie-Banner als schmalere Leiste gestalten.

---

## 🛠️ Umsetzung durch Claude (2026-06-08) — was sofort gefixt wurde

**Autonom live umgesetzt (per Shopify-API, Copy-Fixes):**
- 🔴→✅ **Inkonsistente Rückgabefrist behoben:** Alle Kollektions-Texte auf **„30 Tage Rückgabe"** vereinheitlicht
  (vorher 14 Tage in `premium-beauty`, `wohnen-dekoration`, `schuhe`, `premium-schmuck` — jetzt konsistent mit
  Homepage/Ankündigungsleiste, die 30 Tage verspricht).
- 🟢→✅ **Lange Kollektions-Texte gekürzt:** `damen-mode`-Beschreibung von 4 Absätzen auf 2 knappe, scanbare
  Absätze reduziert (Produkte erscheinen auf dem Handy deutlich höher / über dem Falz).

**Bleibt offen — nur via Theme-Customizer / Bild-Upload (User-Klicks, NICHT per API machbar):**
- 🔴 **Hero:** CTA als echter, kontrastreicher **Button** (statt blasser Textlink) + **hochwertiges Premium-
  Mode-Hero-Bild** statt der generischen Trockenpflanze; Hero-Textfarbe für Kontrast anpassen.
- 🔴 **Produktkacheln:** **Preise (und Sterne)** auf Homepage-Featured-Sektionen sichtbar schalten
  (Customizer → Sektions-Einstellungen „Preis anzeigen").
- 🔴 **„Sale"-Badge** hochwertiger gestalten (Theme).
- 🔴 **Wohnen-&-Deko-Bilder mit Mass-/Text-Overlays** ersetzen — manuelle Bild-Kuration pro Produkt
  (kein zuverlässiger Auto-Fix; betrifft v.a. ältere CJ-Importe; neue Produkte sind bereits sauber/Freisteller).
- 🟡 **Top-10-Bestseller** auf Mode fokussieren oder Sektion umbenennen (z.B. „Unsere Lifestyle-Empfehlungen").
- 🟡 **Cookie-Banner** als schmale untere Leiste (Theme/Consent-App).

---

## 🛠️ Umsetzung Runde 2 (autonom, 2026-06-08 Abend)

**Autonom live umgesetzt (Shopify-API):**
- ✅ **„Top 10 Bestseller" (Homepage) umsortiert** → Premium-Mode zuerst (Bali 4.93★ · Sirène · Ibiza 4.47★ · Savanna),
  Menswear/Accessoires Mitte, 5★-Beauty/Uhr ans Ende. Adressiert Geminis „verwässerte Bestseller"-Kritik, OHNE die
  Social-Proof-Anker (5★-Produkte) zu verlieren. Bewusste Abweichung von Gemini: gut bewertete Produkte bleiben sichtbar
  (Conversion > Marken-Purismus).
- ✅ **SEO-Meta für die 5 neuen Sub-Collections** gesetzt (Hautpflege, Wellness, Deko, Beleuchtung, Küche).

**Hero (Weg A+B):**
- ✅ **2 Premium-Hero-Bilder generiert** (Imagen, 16:9): `dropship/hero/luxestyle-hero.png` (v1, ruhiger Sand-Flatlay)
  + `dropship/hero/luxestyle-hero-v2.png` (v2, vibranter Editorial-Flatlay). Merchant lädt eins im Customizer hoch.
- ✅ **Draft-Theme** „Horizon · LuxeStyle Hero-Polish (Claude)" als sichere Spielwiese dupliziert.
- 🔑 **Ursache Hero-Kontrast-Bug:** Hero zeigt auf `color_scheme: scheme-6`, das in settings_data.json NICHT existiert
  (nur scheme-1/2/5) → Text fällt auf dunklen Default. **Fix (Customizer, 1 Dropdown):** Hero-Farbschema auf **scheme-5**
  (dunkel → heller Text + goldener Primary-Button). + Overlay ~55–60 %, Button-Label „Sommer-Looks shoppen", Hero-Bild tauschen.
- ⛔ **Live-Theme-Schreibzugriff per API ist von Shopify hart blockiert** (`themeFilesUpsert` gegen Live-Theme verweigert) →
  Hero-Theme-Änderung nur im Customizer / via Draft-Publish möglich.

**Verifiziert:** Preise werden auf allen Kacheln angezeigt (Gemini-Fehlalarm). Rückgabefrist überall 30 Tage.
