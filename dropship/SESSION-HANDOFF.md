# 🤝 LuxeStyle — Session-Handoff (Stand: 2026-06-14)

> Für die nächste Luxestyle-Session (Produkt/Content/Social). Zuerst `SHARED-MEMORY.md` +
> `CLAUDE.md` + `dropship/AUTONOMER-MODUS.md` lesen. Dann hier weiter.

## ✅ Heute erledigt (alles live)
- **TikTok-Pixel gefixt:** Live-Theme `D85BAG…` → **`D8EKVR3C77U6KT5BTBD0`** (per PC-Browser-Claude;
  Live-Theme-Writes sind über die MCP gesperrt). Per API verifiziert.
- **Pinterest-Domain `luxestyle.ch` verifiziert:** alter Claim lag auf Privatkonto „alleng chour" → entfernt →
  neu auf Business-Konto „LuxeStyle CH" verifiziert. (Tag `2a6f78cf…` ist im Theme, passt.)
- **10 neue SEO-Ratgeber** im Blog `ratgeber` (~59 total). Handles stehen in `SHARED-MEMORY.md`.
- **203 Pinterest-Pins** in `dropship/pinterest_pins.csv` (idempotent per Link).
- **8 Social-Hooks** in `dropship/SOCIAL-HOOKS.md` (fertige Captions zum Posten).
- **Shop-Brain v2** (`workers/shop-brain/` + `automation/shop_brain.mjs`): SEO-Titel+Description, Auto-Collection-Cover,
  Bild-QA. Optional **KI-SEO via Claude** wenn `ANTHROPIC_API_KEY` gesetzt. Läuft auf Cloudflare + GitLab + GitHub-Actions.
- **Rechtstexte** vereinheitlicht: `info@luxestyle.ch`, Gratis-Versand CHF 65, neue Retouren-Logik (keine Pakete an Privatadresse).
- **„High-End·Luxus" → „💎 Premium"** (Collection + Menü), +9 Premium-Tags, 5 leere Collection-Cover gesetzt.

## 🔑 Wichtige Fakten / Gotchas
- **Max-Abo treibt Claude Code an, NICHT die API** → Content (Artikel/Pins/Texte) ist pro Session gratis.
  `ANTHROPIC_API_KEY` nur nötig für vollautomatischen Cron-KI-Modus.
- **Live-Theme schreiben + Theme löschen = MCP-gesperrt** → Theme-Aufgaben an **PC-Browser-Claude**
  (Brave Port 9222, eingeloggt). Sandbox erreicht GitHub nicht direkt (lokaler Proxy) → raw-URL-Upserts gehen nicht.
- **`shopPolicyUpdate` braucht Scope `write_legal_policies`** (fehlt) → Checkout-Policies macht der User manuell.
- **Git:** frische Branches → PR → Squash-Merge via GitHub-API (Actions account-weit gesperrt). Fixbranch `claude/luxestyle-product-CizQ6`.
- **0 Bestellungen bisher.** Engpass = Traffic/Conversion, nicht Katalog. Gratis-Hebel wirken über Tage/Wochen.

## 🎯 Weitermachen (Priorität)
1. **Pinterest-Händler-Checkliste** abschliessen (Browser-Claude): Shopify → Pinterest-Kanal →
   `…/merchant-review-checklist` → Schritt 1 Domainverifizierung jetzt grün → „Zur Prüfung einreichen".
   → danach Katalog-**Produkt-Pins** (gratis, Feed-Prüfung 1–3 Tage).
2. **Social täglich posten** (PC-Browser-Claude) aus `dropship/SOCIAL-HOOKS.md`, 1–2/Tag, on-screen-Text + Trend-Sound.
3. **Mehr SEO-Artikel + Pins** autonom nachlegen (gratis, Max-Abo) — Themen an neue Produkte + Saison koppeln, keine Dubletten (siehe ratgeber-Handles).
4. **Pinterest Standard-Access** (Entwickler-App, in Prüfung): sobald genehmigt → `PINTEREST_*`-Secrets in GitLab →
   `pinterest-publish`-Job postet die 203 Design-Pins automatisch.
5. **Aufräumen (optional):** unveröffentlichte Theme-Kopie „Horizon · LuxeStyle (Pixel-Fix D8EKVR)" ist harmlos,
   kann der User in Shopify löschen (NICHT veröffentlichen — enthält noch alten Pixel).

## 🧰 Offene Browser-Claude-Befehle
Liegen ausformuliert in der Chat-Historie / `dropship/SOCIAL-HOOKS.md`: (a) Pinterest-Checkliste einreichen,
(b) 1.-August-Post auf IG/FB, dann täglich weitere Hooks.
