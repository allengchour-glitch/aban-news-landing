# ✅ GO-LIVE — die zentrale Kommandozentrale

> Alles, was jetzt noch „live geht", an einem Ort. Die Website selbst ist bereits
> live (Cloudflare deployt automatisch bei jedem Push auf `main`). Hier stehen nur
> die Schritte, die **deine Accounts** brauchen — ich kann sie nicht für dich auslösen.
>
> Reihenfolge = Wirkung. Fang oben an. Jeder Punkt ist in 5–20 Min machbar.

---

## 0. Kurz prüfen: ist alles deployt? (2 Min)

Öffne im Browser:
- https://abannews.com/ki-ratgeber.html  (Hub)
- https://abannews.com/en/ki-ratgeber.html  (EN-Hub)
- https://abannews.com/chatgpt-vs-claude.html

Wenn die Seiten laden → alles live. Falls 404: im Cloudflare-Dashboard prüfen,
ob der letzte Deploy von `main` durchlief.

---

## 1. Bei Suchmaschinen eintragen — der „überall auffindbar"-Hebel (15 Min, gratis)

Ohne das findet Google die ~38 neuen Seiten nur langsam. Mit Sitemap-Einreichung
geht es deutlich schneller. **Beides kostenlos:**

**Google Search Console** — https://search.google.com/search-console
- [ ] Property `abannews.com` hinzufügen (falls noch nicht), per DNS verifizieren.
- [ ] Links → Sitemaps → einreichen: `https://abannews.com/sitemap.xml`
- [ ] Optional: einzelne neue URLs über „URL-Prüfung" → „Indexierung beantragen".

**Bing Webmaster Tools** — https://www.bing.com/webmasters
- [ ] Property hinzufügen (kann aus Search Console importiert werden).
- [ ] Sitemap einreichen: `https://abannews.com/sitemap.xml`
  (Bing speist auch ChatGPT-/Copilot-Suche → doppelt wertvoll.)

> robots.txt erlaubt bereits alle Crawler inkl. GPTBot, ClaudeBot, PerplexityBot,
> Google-Extended. Du musst dort nichts ändern.

---

## 2. Posten — der einzige echte Traffic-Hebel (15–20 Min/Tag)

- [ ] **Manuell:** Wochenplan in `docs/GRATIS-VERBREITUNG-PLAYBOOK.md` abarbeiten.
      Fertige Texte in `docs/CORNERSTONE-LAUNCH-POSTS.md`.
- [ ] **Automatisch (Telegram/Discord):** Secrets in GitHub setzen
      (Settings → Secrets → Actions): `DISCORD_WEBHOOK_URL` und/oder
      `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. Anleitung: `social/SECRETS-EINRICHTEN.md`.
      Danach: Actions → `social-autopost` → Run. (Posts liegen in `social/posts.json`.)
      ⚠️ Secrets NIE im Chat/Commit — nur als GitHub-Secret.

---

## 3. Product-Hunt-Launch (optional, 1 Tag planen)

- [ ] Kit in `docs/PRODUCT-HUNT-HYPE-FILTER.md` (Hype-Filter als Tool).
      Di–Do, 00:01 PT. Vorher 5–10 Unterstützer vorwarnen.

---

## 4. Verkauf scharfschalten (deine Accounts)

- [ ] **Founding €69:** `abannews.com/founding.html` aufrufen, „Founding Member werden"
      → PayPal-Checkout testen (1 echte oder Sandbox-Zahlung). Alten Test-Link in
      PayPal deaktivieren.
- [ ] **Buch (Lemon Squeezy):** Verkaufslink in `js/buch-config.js` (`BUY_URL`) ist
      gesetzt — einmal durchklicken und prüfen.
- [ ] **Buch auf Amazon (KDP):** Dateien + Metadaten fertig in
      `docs/KDP-VEROEFFENTLICHEN.md`. Nach Freischaltung die Amazon-URL in
      `js/buch-config.js` (`KDP_URL`) eintragen → Amazon-Sektion erscheint dann
      automatisch auf `buch.html` (alle 4 Sprachen). Schick mir die URL, dann mach ich's.

---

## 5. Messen (wöchentlich, 5 Min)

- [ ] **Newsletter-Anmeldungen/Woche** (beehiiv-Dashboard) — die einzige Zahl, die zählt.
      Steigt sie → der Kanal funktioniert, mach mehr davon. Steigt sie nicht →
      anderer Kanal / anderer Aufhänger.
- [ ] Nach ~2–4 Wochen: Search Console → „Leistung" — welche Guides Impressionen
      bekommen. Die Gewinner vertiefen.

---

## 6. Das neue Netzwerk live schalten (Stand 2026-06-02)

Alles unten ist **gebaut und gemergt** — es fehlt nur deine Konto-/Domain-Seite.
Reihenfolge egal; jedes Projekt ist unabhängig.

### 6a. Cloudflare-Projekte je Subdomain

**Schnellster Weg — automatisiert (empfohlen):** Statt jede Subdomain von Hand
anzulegen, macht das `tools/cf_pages_setup.py` per Cloudflare-API (Projekt +
Custom-Domain + DNS-CNAME, idempotent). Es kennt alle Projekte inkl. `tools`
(ki-verzeichnis) und `shop` (pod-shop). Anleitung: **`docs/CF-PAGES-SETUP.md`**.
- [ ] API-Token anlegen (`Pages · Edit` + `Zone · DNS · Edit` für abannews.com).
- [ ] `python3 tools/cf_pages_setup.py --list` zeigt alle Projekt-Keys.
- [ ] Weg B (ganz ohne Dashboard): Actions → „Cloudflare Pages — Direct Deploy" →
      Run mit dem Projekt-Key (`tools`, `shop`, `musik`, `video`, …).

**Projekte (Key → Ordner → Domain):**

| Key | Ordner | Domain |
|-----|--------|--------|
| `tools` | `ki-verzeichnis/` | `tools.abannews.com` |
| `shop` | `pod-shop/` | `shop.abannews.com` |
| `musik` | `musik-radar/` | `musik.abannews.com` |
| `video` | `video-radar/` | `video.abannews.com` |
| `voice` | `voice-radar/` | `voice.abannews.com` |
| `chatbot` | `chatbot-radar/` | `chatbot.abannews.com` |
| `buchhaltung` | `buchhaltung-radar/` | `buchhaltung.abannews.com` |
| `newsletter` | `newsletter-radar/` | `newsletter.abannews.com` |
| `dropshipping` | `dropshipping-radar/` | `dropshipping.abannews.com` |
| `automatisierung` | `automatisierung-radar/` | `automatisierung.abannews.com` |
| `kurse` | `kurse-radar/` | `kurse.abannews.com` |
| `prompts` | `prompts-bibliothek/` | `prompts.abannews.com` |
| `agenturen` | `agenturen-radar/` | `agenturen.abannews.com` |
| `handwerk` | `handwerk-radar/` | `handwerk.abannews.com` ⚠️ erst Daten verifizieren |

**Manuell (Fallback):** Cloudflare Pages → Create project → Connect to Git → dieses
Repo, Build command `cd <ordner> && python generate.py`, Output `<ordner>/dist`,
Branch `main` → Custom Domain zuordnen. Detail-Hintergrund: `docs/GO-LIVE-RADARS.md`.

### 6b. POD-Shop verkaufsfähig machen (`pod-shop/`)
- [ ] Shopify-Store anlegen, `pod-shop/shopify-import.csv` importieren (Status bleibt `draft`).
- [ ] POD-Anbieter mit EU-Lager verbinden (Gelato für Print, 3D-Druck-POD fürs Namensschild),
      Produkte mappen, **Druckkosten ablesen**.
- [ ] Echte Preise in `pod-shop/data/produkte.json` (`preis_eur`) **und** in Shopify eintragen.
- [ ] In `pod-shop/pod-config.json` unter `shopify` das führende `_` bei `_produkt_basis_url`
      entfernen + echte URL eintragen → dann `cd pod-shop && python3 generate.py`.
- [ ] Produkte in Shopify auf „aktiv" schalten. (Schritt-für-Schritt: `pod-shop/README.md`.)

### 6c. API-Keys setzen (NIE ins Repo — nur Env/CF-Secret)
- [ ] `ANTHROPIC_API_KEY` (console.anthropic.com): lokal `export ...` für
      `produkt-imperium/generate_guide.py`; als **CF-Secret** für die Edge-Tools
      (`functions/api/ki-erwaehnung.js`, `hype-check.js`).
- [ ] `ELEVENLABS_API_KEY` (elevenlabs.io): lokal `export ...` für
      `video-pipeline/generate_clips.py --voice` und `generate_promo.py --voice`.
- ⚠️ Ein Key, der je in einem Chat/einer Datei landet, gilt als verbrannt → beim Anbieter
      neu erzeugen (revoke + regenerate).

### 6d. Werbespot final rendern (optional, kostet Credits)
- [ ] `cd video-pipeline && python3 generate_promo.py` → `ausgabe/werbespot/`.
- [ ] `voiceover.txt` in ElevenLabs (Multilingual, ruhige deutsche Stimme) → Audio.
- [ ] Audio + `untertitel.srt` + Storyboard in HeyGen/CapCut → 9:16 exportieren.
- [ ] Posten (Reels/TikTok/Shorts) — Caption + Link auf abannews.com. Setup: `docs/WERBEVIDEO-*.md`.

---

## Was bewusst NICHT zu tun ist
- Kein Google Analytics / 3rd-Party-Tracking (DSGVO + Markenversprechen).
- Nicht dieselbe Nachricht am selben Tag in 20 Gruppen (Spam → Bann).
- Keine gekauften Follower/Upvotes.

---

### Stand der Technik (alles erledigt, nichts zu tun)
- ✅ 8 Cornerstones × 4 Sprachen + Hub × 4 Sprachen, dicht & reziprok verlinkt
- ✅ Sitemap vollständig, robots.txt für alle Crawler offen, hreflang reziprok
- ✅ eBook (Diagramme + Quellen, 4 Sprachen), KDP-Print, Amazon-Funnel vorbereitet
- ✅ Distribution: Plattform-Posts, Gratis-Playbook, Auto-Posts, PH-Kit
- ✅ JSON-LD valide, kein Hype, kein Unicode-Schmuggel — durchgehend verifiziert

> Kurz: Der Code ist fertig. Diese Liste ist alles, was noch zwischen „gebaut" und
> „bringt Leser & Umsatz" steht — und das liegt bei dir.
