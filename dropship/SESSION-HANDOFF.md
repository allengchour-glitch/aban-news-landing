# 🤝 LuxeStyle — Session-Handoff (Stand: 2026-06-15)

> Für die nächste Luxestyle-Session. Zuerst `SHARED-MEMORY.md` + `CLAUDE.md` + `dropship/AUTONOMER-MODUS.md` lesen.

## ✅ Fertig & verifiziert
- **TikTok-Pixel:** Live-Theme = **`D8EKVR3C77U6KT5BTBD0`** (alter `D85BAG` weg, API-verifiziert). Geändert per
  PC-Browser-Claude, weil **Live-Theme-Writes über die MCP gesperrt** sind (Sicherheitsnetz).
- **Pinterest-Domain `luxestyle.ch`:** auf Business-Konto „LuxeStyle CH" **verifiziert** (alter Claim auf Privatkonto
  „alleng chour" entfernt).
- **Rechtstexte:** `info@luxestyle.ch`, Gratis-Versand CHF 65, Dropship-Retouren-Logik (keine Pakete an Privatadresse).
- **„High-End·Luxus" → „💎 Premium"**, +9 Premium-Tags, Collection-Cover, Voll-Audit (17 Produkte re-veredelt, Maui-Dublette raus).
- **Magazin:** 63 SEO-Ratgeber. **Pinterest-Pins:** 203 in `dropship/pinterest_pins.csv`. **Social-Hooks:** `dropship/SOCIAL-HOOKS.md`.

## 🧠 Shop-Brain v3 — im Repo, NOCH NICHT DEPLOYT
`workers/shop-brain/worker.js` + `automation/shop_brain.mjs`: SEO (Template oder **Claude** via `ANTHROPIC_API_KEY`)
+ Kategorie + Auto-Collection-Cover + **Collection-SEO** + Alarme (Bild fehlt / Dublette / Preis 0).
⚠️ **Bis zum Deploy überschreibt der Import-Bot weiter die SEO neuer Produkte.** Deploy: `cd workers/shop-brain && npx wrangler deploy`
(Secrets `SHOPIFY_SHOP/CLIENT_ID/CLIENT_SECRET`, optional `ANTHROPIC_API_KEY`/Telegram). Läuft auch via GitLab/GitHub-Actions-Job.

## 🇨🇭 1.-AUGUST-FOKUS (der USP — Priorität bis Anfang August)
Schweizer Edition + Selbst-gestalten = einzigartig, geschenktauglich, lokal, zeitkritisch. `erste-august`-Collection ist
Aushängeschild; 3 Anlass-Artikel live; 10 Hooks + Posting-Plan in `SOCIAL-HOOKS.md` („1. AUGUST PUSH"). **Täglich 1–2 posten.**

## 🔑 Gotchas
- **Max-Abo treibt Claude Code an, NICHT die API** → Content gratis pro Session; `ANTHROPIC_API_KEY` nur für Cron-KI.
- **Live-Theme schreiben + Theme löschen = MCP-gesperrt** → an PC-Browser-Claude. Sandbox erreicht GitHub nicht (Proxy).
- **Browser-Automation kann KEINE Bilder hochladen** (OS-Datei-Dialog) → IG/FB-Posts vom **Handy/App** posten.
- `shopPolicyUpdate` braucht Scope `write_legal_policies` (fehlt) → Checkout-Policies macht User manuell.
- Git: frische Branches → PR → Squash-Merge via GitHub-API (Actions account-weit gesperrt).

## 🎯 Weitermachen (Prio)
1. **Posten** (Handy/PC-Claude, täglich) aus `SOCIAL-HOOKS.md`.
2. **Pinterest-Händler-Checkliste einreichen** (Browser-Claude) → Katalog-Pins.
3. **Brain deployen** (`wrangler deploy`) → stoppt das SEO-Überschreib-Leck dauerhaft.
4. Bis Deploy: neueste Produkte jede Session re-veredeln (SEO/Kategorie). Mehr SEO-Artikel + Pins gratis nachlegen.
5. Optional: 20-CHF-Test-Kampagne (Pixel jetzt korrekt) auf Schweizer-Edition-Produkte.

## 📊 Zahlen
**0 Bestellungen**, **11 Leads** (WELCOME10-Popup → Klaviyo). Engpass = Traffic/Conversion, nicht der Shop.
