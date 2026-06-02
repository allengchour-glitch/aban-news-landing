# 🛠️ Auftrag für Claude (Shopify-Admin / Customizer) — LuxeStyle

**Shop:** luxestyle.ch · **Theme:** „Horizon · LuxeStyle Branded" (das LIVE/aktive Theme)
**Warum:** Diese 3 Punkte sind die grössten verbliebenen Conversion-Hebel. Sie liegen im Theme,
das **per Shopify-Admin-API gesperrt** ist (`themeFilesUpsert` auf MAIN blockiert) — deshalb müssen sie
**im Theme-Editor (Customizer) von Hand** gemacht werden. Alle Texte unten sind fertig zum Einfügen.

**Zugang:** Shopify Admin → **Onlineshop → Themes** → beim Theme „Horizon · LuxeStyle Branded"
auf **„Anpassen"** klicken.

---

## 1) Hero-Überschrift korrigieren (WICHTIGSTER PUNKT)
**Problem:** Die Startseite sagt „Premium für dein **Zuhause**" — aber der Shop verkauft **Mode**.
Die TikTok-Ads bewerben Damenmode/Kleider → Erwartungsbruch in der ersten Sekunde = Absprung.

**So geht's:** Customizer → Startseite → Sektion **„Hero"** → Textblock (Überschrift) anklicken.
- **Alt:** `Sommer-Trends 2026 — Premium für dein Zuhause`
- **NEU (einfügen):**
  ```
  Sommer-Mode 2026 — Premium-Looks für jeden Auftritt
  ```
  Alternativen, falls gewünscht: „Feminine Sommer-Looks – Schweizer Lieblingsstücke 2026" ·
  „Deine Sommer-Garderobe 2026 – ab CHF 29.90".
- **Button-Link prüfen:** sollte auf die fokussierte Womenswear-Collection zeigen. Empfohlen:
  `/collections/sommer` (46 Damenmode) statt `/collections/sommer-2026` (195 gemischt).
- **Bonus (Hero-Bild):** das Palmblatt-Bild durch ein **echtes Model-/Lifestyle-Foto** ersetzen
  (gleicher Look wie die freigegebenen Reels — Brise/Daisy/Savanna). Best Practice: Landingpage soll
  die Bildsprache der Ad spiegeln.

---

## 2) Ankündigungsleiste vereinheitlichen (Margen- + Konsistenz-Fix)
**Problem:** Die Leiste oben zeigt **„LAUNCH-WOCHE: 30% mit Code LAUNCH30"**. Parallel läuft aber das
**WELCOME10-Popup (10%)** + die Klaviyo-Mails mit WELCOME10. Zwei Codes (30% vs 10%) verwirren, und
**30% frisst die Marge** (CJ-Dropship). Kund:innen nehmen immer den höheren Code.

**So geht's:** Customizer → Header/Ankündigungsleiste (oder Admin → Einstellungen, je nach Theme) →
Text der Ankündigungsleiste ersetzen.
- **NEU (einfügen):**
  ```
  Gratis-Versand ab CHF 65 · –10% mit Code WELCOME10 · 30 Tage Rückgabe
  ```
- **Wichtig:** Entweder **LAUNCH30 deaktivieren** (Admin → Rabatte → LAUNCH30 → deaktivieren) ODER
  bewusst NUR LAUNCH30 als einzige Aktion behalten — aber **nicht beide gleichzeitig** laufen lassen.
  Empfehlung: bei WELCOME10 (10%) bleiben (margenschonend, konsistent mit Popup + E-Mail-Flows).

---

## 3) Englische Buttons auf Deutsch (Sprachkonsistenz)
**Problem:** Zwei Produktlisten-Sektionen auf der Startseite haben den Button **„View all"**, die anderen
korrekt „Alle anzeigen".

**So geht's:** Customizer → Startseite → diese beiden Sektionen anklicken → Button-Label ändern:
- Sektion **„⭐ Top 10 Bestseller"** → Button „View all" → **`Alle anzeigen`**
- Sektion **„✨ CJ Neuheiten 2026"** → Button „View all" → **`Alle anzeigen`**

---

## Bonus (Mobile-Conversion, ≈99% des TikTok-Traffics ist mobil)
4. **Sticky „In den Warenkorb"** auf der Produktseite aktivieren (Horizon unterstützt eine mitscrollende
   Add-to-Cart-Leiste) → Kaufbutton immer sichtbar = klarer Mobile-Uplift.
5. **Judge.me-Sterne auf den Produktkacheln** einblenden (Collection-/Startseite), nicht nur auf der PDP →
   Social Proof beim Stöbern. (Judge.me-App-Einstellung „Star rating widget" / Theme-Block.)

---

## Was bereits per API erledigt ist (NICHT nochmal machen)
- ✅ Alle 20 Kleider: cm-Grössentabelle + einheitliche Trust-Zeile
- ✅ 144 Bild-Alt-Texte (ganzer Fashion-Katalog) + 64 Produkt-SEO-Metas
- ✅ 15 Kollektionen mit starkem Text/SEO/Trust
- ✅ Hauptmenü fashion-first sortiert (alle 70 Links erhalten)

Volles Audit + Hintergrund: `dropship/SHOP-DESIGN-AUDIT.md`. Memory/Historie: `dropship/CJ-IMPORT-LOG.md`.

---

## ✅ STATUS-UPDATE 2026-06-02 — Punkte 1–3 erledigt
- **1) Hero** ✓ Überschrift + Link `/collections/sommer` (verifiziert: lädt live, 46 Produkte).
- **2) Ankündigungsleiste** ✓ vereinheitlicht.
- **3) „View all" → „Alle anzeigen"** ✓ (beide Sektionen).
- **LAUNCH30** ✓ bereits abgelaufen (kein Konflikt) — nicht gelöscht.

## 🔜 NÄCHSTE SCHRITTE für Browser-Claude (vom User angeboten)
1. **Hero-Button-Label** „Sommer-Trends entdecken" → **`Damenmode entdecken`** (passt zum neuen Mode-Hero).
2. **⚠️ Ankündigungsleiste – Link-Feld prüfen:** dort stand eine `admin.shopify.com/...`-URL. Das ist FALSCH
   für die Storefront (Kund:innen können Admin nicht öffnen). → Link-Feld **leeren** oder auf
   `/collections/sommer` setzen.
3. **Sticky „In den Warenkorb" (mobil):** Customizer → Produkt-Template → Add-to-Cart-Block → Option
   „Sticky/mitscrollend" aktivieren.
4. **Judge.me-Sterne auf Produktkacheln:** Judge.me-App → „Star rating widget" für Collection-/Home-Cards
   aktivieren (bzw. Theme-Block „Bewertungssterne" in die Produktkarte einfügen).
5. **Hero-Bild** Palmblatt → echtes Model-Foto: **User lädt manuell hoch** (Customizer → Hero → Medien 1).
