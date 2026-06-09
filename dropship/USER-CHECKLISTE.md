# ✅ USER-CHECKLISTE — LuxeStyle Social-Maschine aktivieren

## 🔴 OFFEN (todo morgen, Stand 2026-06-09) — nach Gemini-Verifikation (Note 4→6/10, Hero jetzt Stärke)
**Hero ist fertig & live** (heller Text + goldener Button + Premium-Bild, Schema 3 gesetzt). Verbleibende Gemini-Punkte —
alle NICHT autonom machbar (Gründe dahinter):

1. **🔑 `JUDGEME_PRIVATE_TOKEN` als GitHub-Secret setzen** (+ `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com`).
   → Dann läuft `automation/reviews-import.mjs` autonom und importiert **echte ≥4★-Reviews** (`dropship/reviews_seed.json`,
   NIE Fake) → **Sterne erscheinen auf den Produktkacheln** (Homepage + Collection). WICHTIGSTER Hebel: „keine Sterne" ist
   ein **Review-/Inhalts-Problem**, kein Theme-Problem (live verifiziert: Collection-Kacheln haben Preis, aber 0 Sterne, weil
   die meisten Produkte 0 Reviews haben). Theme-Block bringt ohne Reviews nichts.
2. **Cookie-Banner** kompakter / als schmale untere Leiste (Consent-App-Einstellung, nicht Theme-Code) — Geminis aktueller #1.
3. **Top-Bar-Schrift** auf Mobil etwas grösser (Customizer → Header/Ankündigung).

⚠️ **Warum nicht autonom:** Shopify blockiert API-Schreibzugriff aufs **Live-Theme** hart (Customizer = nur Mensch);
Desktop-Zugriff hilft Claude nicht, da Claude über die API arbeitet, nicht über einen Browser. Sterne hängen an Reviews (Token).

**Schon erledigt (autonom, live):** Rückgabefrist→30 Tage (5 Coll.), Damen-Text gekürzt, Lieferzeit→„1–2 Wochen",
Top-10 premium-first sortiert, 5 Sub-Collections+SEO, Beleuchtung-Regel gefixt, 2 Hero-Bilder generiert.
Reports: `reports/site-critique-2026-06-08.md` (4/10) + `…-09.md` (6/10).

## 🔴 OFFEN (2026-06-08, todo morgen) — Hero-Farbschema fixen [1 Klick]
**Einziger offener Punkt nach der Gemini-Polish-Session.** Hero-Bild, Button-Label & Overlay sind schon
gesetzt; Top-10-Bestseller umsortiert; Rückgabefrist/SEO/Sub-Collections live. Es fehlt NUR:

- **Customizer → Startseite → Sektion „Hero" → Feld „Farbschema" → „Schema 3"** wählen (das **dunkle/
  anthrazitfarbene** Swatch) → Speichern.
- Hintergrund: Der Hero zeigt aktuell auf das nicht existierende „Schema 6" → Titel-Text fällt auf dunkle
  Default-Farbe (schlecht lesbar). Schema 3 = intern `scheme-5` (dunkel, heller Text `#faf7f2` + goldener
  Primary-Button). Live-Theme hat genau 3 Schemata (intern scheme-1/2/5 = Customizer „Schema 1/2/3").
- ⚠️ Live-Theme-Schreibzugriff per API ist Shopify-seitig blockiert → nur im Customizer machbar (nicht autonom).
- **Danach:** Claude-Session bitten, den **Gemini-Verifikationslauf** zu starten (Note sollte über 4/10 steigen).
- Optional: Draft-Theme „Horizon · LuxeStyle Hero-Polish (Claude)" kann gelöscht werden.
- Hero-Bilder liegen bereit: `dropship/hero/luxestyle-hero.png` (v1) + `luxestyle-hero-v2.png` (v2, ist live hochgeladen).

> **Zweck:** EINE Liste mit allem, was nur DU (im Browser/Admin) tun kannst, damit die autonome
> Content-Maschine (KI-Bilder + Reels → Instagram/Facebook/Threads/TikTok, selbstlernend) scharf läuft.
> Alles Übrige ist gebaut, committet und no-op-safe — es wartet nur auf die Tokens/Klicks unten.
> Stand: 2026-06-08 · Fester Dropship-Branch `claude/luxestyle-product-CizQ6` (frühere SrAs5/LehDs in `main` gemergt; LehDs-Verweise veraltet).

---

## 🔴 A. Manuelle To-dos
- [ ] **1. `THREADS_ACCESS_TOKEN` als GitHub-Secret setzen** → Autopilot postet 2×/Tag von selbst.
- [ ] **2. Doppel-Facebook-Seiten löschen** — **nur „LuxeStyle CH" `1049840534888592` behalten**.
- [ ] **3. PureMax-Reel auf Instagram löschen** (Altbestand, passt nicht zur Marke).
- [ ] **4. TikTok-App-Audit beantragen** — IG+FB+Threads posten schon; TikTok technisch fertig, wartet nur auf Audit.
      developers.tiktok.com → App „LuxeStyle Poster" → Content Posting API → Review beantragen. Danach
      Repo-Variable `TT_PRIVACY_LEVEL` = `PUBLIC_TO_EVERYONE`.

## 🖼️ B. KI-Bild ans Shopify-Produkt — fast fertig, 1 Fix offen
> Die KI-Veredelung + das Posten **laufen vollautomatisch**. Nur das *zusätzliche Hinterlegen am Produkt*
> braucht gültige Shopify-Schreib-Creds. Diagnose aus den Live-Tests:
> - `SHOPIFY_SHOP` muss die **myshopify-Domain** sein (`au3j0y-hq.myshopify.com`), NICHT `luxestyle.ch`.
>   (Skript hat dafür jetzt einen Fallback — passt.)
> - `SHOPIFY_ADMIN_TOKEN` war **ungültig** („Invalid API key/access token"). → Stattdessen:
- [ ] **`SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`** (der `shpss_…`-Schlüssel) als Secrets setzen
      ([Link](https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions/new)). Das Skript
      holt damit einen frischen, gültigen Token.
- [ ] **Custom-App-Scopes** auf **`read_products` + `write_products`** erweitern → **App neu installieren**.
- [ ] Den falschen `SHOPIFY_ADMIN_TOKEN` löschen. → Danach „gesetzt" sagen, ich mache den finalen Test.

---

## 🔑 C. Repo-Secrets fürs Auto-Posting (Settings → Secrets → Actions)
- [ ] **Meta:** `THREADS_ACCESS_TOKEN`+`THREADS_USER_ID` · `IG_USER_ID`+`IG_ACCESS_TOKEN`(o. `META_ACCESS_TOKEN`) ·
      `FB_PAGE_ID`(=`1049840534888592`)+`FB_PAGE_ACCESS_TOKEN`. Scopes: `instagram_content_publish, pages_manage_posts` …
      (Graph-Explorer-Token leben ~1-2h → 60-Tage-Token oder System-User.)
- [x] **TikTok:** `TT_ACCESS_TOKEN`/`TT_REFRESH_TOKEN`/`TT_CLIENT_KEY`/`TT_CLIENT_SECRET` gesetzt (wartet auf Audit A.4).
- [x] **Gemini:** `GEMINI_API_KEY` gesetzt (Billing aktiv, ~30 CHF) → Kritik + KI-Bilder + Veo laufen.
- [ ] **Telegram:** `TELEGRAM_BOT_TOKEN` (🔒 rotieren) + `TELEGRAM_CHAT_ID`.
- [ ] **Shopify (Crons):** `SHOPIFY_SHOP=au3j0y-hq.myshopify.com` · `SHOPIFY_CLIENT_ID` · `SHOPIFY_CLIENT_SECRET` (siehe B).

> Ohne Secrets passiert nichts Schlimmes — alle Workflows sind no-op-safe.

## 🚀 D. Aktivierung
- [ ] Actions laufen vom Default-Branch (`main`). · **GitHub Pages** muss Repo-Root servieren (für `reels/`, `social/enhanced/`, `social/static/`).

---

## 📱 E. Mobile-Verbesserung — „Bild-mit-Text"-Sektion (entschieden, fertig vorbereitet)
> Beschluss (deckt sich mit Gemini): EINE „Bild mit Text"-Sektion gleich unter dem Hero. Stapelt auf dem Handy
> perfekt zu **Bild oben + Headline + Button** und nutzt die neuen KI-Editorial-Bilder. Produktkacheln bleiben 2-spaltig.
> **Die 4 KI-Editorial-Bilder (Bali, Daisy, Strohtasche, Sirène) liegen bereits in deiner Shopify-Medienbibliothek**
> — im Customizer direkt auswählbar. Theme-Sektion kann nur im Customizer platziert werden (Live-Theme API-gesperrt):
- [ ] Customizer (Startseite) → **Abschnitt hinzufügen → „Bild mit Text"**, Position unter dem Hero.
- [ ] **Bild:** das KI-Bali-Editorial (aus Medien) · **Headline:** `Premium-Sommermode aus der Schweiz` ·
      **Text:** `Designer-Looks zum fairen Preis · Gratis-Versand ab CHF 65 · –10 % mit Code WELCOME10` ·
      **Button:** `Jetzt entdecken` → `/collections/damen-mode`.

## 🎨 F. Shop-Feinschliff — nur Theme-Editor/Admin
- [ ] **🆕 Footer-Social-Links falsch:** zeigen auf **„Abannews"** statt LuxeStyle → Customizer → Footer/Theme-
      Einstellungen → Social Media → eigene **LuxeStyle**-Profile (FB `1049840534888592`, IG/Threads `@luxestyle.ch`).
- [ ] **🆕 „🎨 Selbst gestalten" als echter Live-Designer:** Customizer-App **Kickflip** (o. Teeinblue/Zakeke)
      installieren + **Printful** verbinden → ersetzt das Wunsch-Design-Formular durch einen Designer direkt auf der
      Produktseite. Danach hängt Claude den Designer + Basis-Produkte (T-Shirt/Hoodie/Tasse) ein.
- [ ] **Judge.me-Sterne auf Produktkacheln** · **Sticky „In den Warenkorb"** (mobil) · **Kachel-Verhältnis „square"**.
- [ ] **AGB-/Policy-Domain** `aban-192.myshopify.com` → `luxestyle.ch` · **Klaviyo** `.com.co` → `.ch`.
- [ ] **~34 Nur-1-Bild-Produkte** → 2./3. Bild ergänzen. · `aban news Founding-Member` (`15420720808321`, 0 Bilder, Fremdprojekt) prüfen/ausblenden.

## 🧹 G. Collection-Aufräumen — 2-Min-Admin (Unpublishing API-gesperrt)
> Admin → Sammlungen → je Collection „Aus Verkaufskanälen entfernen". **NICHT** die 8 Menü-Collections / `sommer`.
- [ ] `[ARCHIV] Pet & Tierbedarf` · `[ARCHIV] Fitness & Sport` · `[ARCHIV] Tech & Gadgets`
- [ ] `🔋 Auto-Power` · `🍴 Küchengeräte` · `Accessories` · `Home & Gadgets` · `🍽️ Servieren` · `👠 Damen-Schuhe` ·
      `👞 Herren-Schuhe` · `Strand & Bademode` · `Self-Care & Wellness` · `Schule & Büro` · `US / Summer 2026` · `🏡 Home & Family`
- [ ] Mini-Bundles `🎁 Premium-Bundles — Spare CHF 19+` · `🎁 Wellness-Box Bundles` (→ Dublette zu `Bundles & Sets`)

## 📣 H. Reichweite (nur du — Werbekonto)
- [ ] **TikTok-Pixel** + EINE Kampagne („Complete Payment", CH/Frauen/18–34, 20 CHF/Tag).

---

## ✅ I. Autonom erledigt (Sessions 06-07/06-08, live via API)
- **Menü** 18+50 → **8 flach** · **15 Bild-Dubletten** archiviert · **56 Collection-SEO** befüllt · **Bild-QA 0 FAILED** ·
  **ganzer Katalog alt-getextet** (~600 Alt-Texte) · **Bestseller-Homepage** entgadgetisiert (Bali/Ibiza rein).
- **🆕 KI-Meisterwerk-Pipeline** gebaut & **live verifiziert**: `gemini_enhance_image.mjs` (Nano Banana, echtfoto-
  treu, Produkt etwas kleiner im Frame), `shopify_add_enhanced.mjs`, `veo-hero-clip.mjs` (Veo-Fast), Workflows
  `gemini-enhance.yml` (tägl. 5 Bilder) + `veo-hero-clip.yml` (tägl. 1 Clip). Jeder Post mit **Produktlink**.
- **Tools:** TikTok-Autopilot · Gemini-Site-Kritik (wöchentl.) · Veo-Generator · 4 KI-Editorial-Bilder in Shopify-Medien.

## 🤖 Läuft automatisch (sobald Secrets gesetzt)
- IG+FB+Threads-Autopilot · TikTok (nach Audit) · KI-Bilder 04:30 · Veo-Clip 05:00 · Posts 08:00/17:00 ·
  Tages-Digest · Gemini-Kritik Mo · Reel-/Rotations-/Health-Crons.

## 🟡 CONTENT-QA Blog (Befund 2026-06-09) — #3 „Blog→Produkt" war schon erledigt
**Gute Nachricht:** Die 69 Blog-Artikel (Ratgeber/Magazin) sind **bereits professionell mit Produkten verlinkt**
(mehrere Produktlinks + Preise + interne Verlinkung pro Artikel). Kein Nachbau nötig.
**Aber 2 systematische QA-Lücken gefunden (Content-Engine-Fix, am besten gesammelt statt 20× Handarbeit):**
1. **Tote Links auf DRAFT-Platzhalter-Produkte:** Manche Artikel verlinken Produkte mit KI-Bild, die auf DRAFT
   stehen (nicht `cj-real`, kein echter Lieferant) → 404-Klick. Beispiel: „Leder-Portemonnaie «Rose»"
   (`/products/leder-portemonnaie-damen-rose`, DRAFT, KI-Bild) im RFID-Artikel. → Artikel-Links auf solche
   Produkte durch ECHTE aktive Produkte ersetzen (oder Platzhalter sauber aktivieren mit echtem CJ-Bild/SKU).
2. **Rückgabefrist „14 Tage / 14-tägig"** in ~12+ Artikeln → widerspricht den überall sonst kommunizierten
   **30 Tagen** (Ankündigungsleiste + Collection-Texte). → in den Artikeln auf 30 Tage angleichen.
**Empfehlung:** Beides über die Blog-/Content-Generator-Session als Bulk-Fix (find/replace im Body), nicht
einzeln von Hand (Artikel-Bodies sind je ~6 KB; Einzel-Edits sind fehleranfällig + ausserhalb des CJ-Auftrags).
