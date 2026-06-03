# LuxeStyle — Internationale Expansion: US & UK startklar machen

Ziel: Englisches Storefront mit **USD** (US) und **GBP** (UK), damit US/UK-Kund:innen
einen englischen Shop in ihrer Währung sehen — Voraussetzung für US/UK-Werbung.

> **Gute Nachricht:** Die Märkte **US** und **UK** existieren bereits in deinem Shop
> (mit korrekter Basiswährung USD bzw. GBP) — sie sind nur **deaktiviert**. Es fehlt
> v. a. **Englisch + Übersetzung**. Reihenfolge unbedingt einhalten 👇

---

## ⚠️ Reihenfolge wichtig
**Erst Englisch + Übersetzung — DANN Märkte einschalten.** Sonst sehen US/UK-Besucher
einen halb-deutschen Shop mit Fremdwährung = Vertrauensverlust, keine Käufe.

---

## Schritt 1 — Englisch als Sprache hinzufügen
Shopify Admin → **Einstellungen** → **Sprachen** → **„Sprache hinzufügen"** →
**Englisch** wählen → **Veröffentlichen**.
(Deutsch bleibt Standard für CH/DACH.)

## Schritt 2 — Automatisch ins Englische übersetzen (gratis)
1. Shopify App Store → **„Translate & Adapt"** (Shopify-eigene App, kostenlos) → installieren.
2. App öffnen → **Englisch** als Zielsprache → **„Automatisch übersetzen"** (AI) für:
   - Produkte (Titel + Beschreibungen)
   - Kollektionen, Menü, Shop-Texte, Checkout
3. **Kurz gegenchecken** (10 Min): Startseite-Hero, Menü-Tabs, die wichtigsten Produktnamen.
   Emojis/Markennamen („LuxeStyle") bleiben — nur Fließtext prüfen.

## Schritt 3 — Märkte US & UK aktivieren
Admin → **Einstellungen** → **Märkte**:
- **United States** → aktivieren (Basiswährung **USD** ist schon gesetzt).
- **United Kingdom** → aktivieren (Basiswährung **GBP** ist schon gesetzt).
- Optional: **Preisrundung** auf „.90" stellen (z. B. $36.90 statt $36.07) → wirkt sauberer.
- Sprache des Marktes = **Englisch** (Subfolder entsteht automatisch, z. B.
  `luxestyle.ch/en-us` und `luxestyle.ch/en-gb`).

## Schritt 4 — Versand prüfen
Admin → **Einstellungen** → **Versand und Zustellung**:
- Versandzonen **USA** und **Vereinigtes Königreich** vorhanden? Sonst hinzufügen.
- CJ Dropshipping liefert weltweit — Lieferzeit **~7–14 Tage** klar im Shop kommunizieren
  (Versand-Info-Seite / Produktbeschreibung), damit keine Beschwerden kommen.

## Schritt 5 — Melden
Wenn Englisch live ist, sag mir **„Englisch ist online"** — dann verifiziere ich per API
(`luxestyle.ch/en-us` zeigt Englisch + USD) und wir können die US/UK-Werbung starten.

---

## 🎯 Werbe-Strategie (wichtig, spart Geld)
- **UK zuerst, dann US.** US ist der teuerste, umkämpfteste Ad-Markt der Welt — mit kleinem
  Budget schwer. UK ist englischsprachig, aber deutlich günstiger zum Testen.
- **Eigene TikTok-Ad-Sets pro Land** — CH / UK / US **nie** im selben Set mischen
  (komplett andere CPMs & Zielgruppen, sonst lernt der Algorithmus nichts Sauberes).
- **Englische Creatives liegen bereit** (preisfrei, „SHOP NOW · 10% OFF CODE WELCOME10"):
  `luxestyle_story_en1..en7.png` + `luxestyle_story_reel_EN.mp4` (+ `_elegant`).
  Funktionieren für US **und** UK gleichzeitig (kein fester Preis = kein Währungs-Mismatch).
- **CH bleibt Hauptfokus**, bis dort erste Verkäufe + ein Gewinner-Creative da sind.

## Technische Eckdaten (für die spätere Aktivierung per API)
- US-Markt: `gid://shopify/Market/99514352001` (Basis USD) — derzeit `enabled:false`
- UK-Markt: `gid://shopify/Market/99514384769` (Basis GBP) — derzeit `enabled:false`
- Aktivierung später via `marketUpdate(id, input:{enabled:true})` + Web-Presence-Locale = `en`.
