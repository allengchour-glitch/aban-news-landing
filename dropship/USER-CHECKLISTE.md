# ✅ USER-CHECKLISTE — LuxeStyle Social-Maschine aktivieren

## 📋 TODO-Liste (Stand 2026-08-16, aktuellste zuerst — «todo list später»)

### 🔴 Nur du kannst das (Konto/Zahlung/Browser):
0. **💶 BigBuy-Geldbörse: 1'000 € VOR dem 15.09. abheben** (Konsole → Geldbörse → Auszahlung;
   Kundennr. 966388). Offene Transaktion 18138523 («Fällige Zahlungen», 1'000 €, Banküberweisung)
   **stornieren, NICHT bezahlen** (wäre eine weitere Einzahlung). ⚠️ Nie den offenen
   Marketplace-Checkout (1'190 €/Jahr) abschicken. Erinnerungen gesetzt: 20.08. + 08.09.
1. **✅ ERLEDIGT 16.08.: BigBuy «Pack Ecommerce» gekündigt** (aktiv bis 15.09.2026;
   bigbuy_abschied.py draftet die Produkte am Stichtag automatisch) (89 €/Periode, 1 Verkauf seit Juni und der mit Verlust —
   Empfehlung: aufs Periodenende kündigen). Danach mir Bescheid geben → ich drafte die ~235
   verbliebenen BigBuy-Produkte automatisch (ohne API keine Bestandswahrheit = Geisterverkäufe).
2. **✅ ERLEDIGT 16.08.: Schatten-Bestellungen #1012–#1014 gelöscht** (Einzelprüfung + Massenlöschung,
   LX-Aufträge unberührt, nichts bezahlt). Rest-Aufgabe bei Gelegenheit: 9 weitere #-Zeilen in
   «Ungültige Bestellungen» (inkl. #1011) nach demselben Muster löschen — #-Präfix ✓, keine
   CJ-Nummer ✓, unbezahlt ✓. «Müll»-Reiter = Rückweg.
3. **TikTok-Kampagnen-Budget** für die Schulstart-/Trend-Produkte freigeben — der Funnel konvertiert
   nachweislich (4/4 bezahlte Bestellungen im August), es fehlt nur Traffic.
4. **✅ WAR SCHON ERLEDIGT: IG-Bio-Link** — luxestyle.ch steht in der Bio (Profil-Screenshot 16.08.).
5. **Google Merchant: Ziel-Land nur Schweiz** (falls noch nicht umgestellt — alter #1-Hebel).
6. **Judge.me:** 12 Bild-Reviews ausblenden + veraltete Produkt-Titel aktualisieren (nur Browser-UI).
7. **Fortura-FTP-Zugangsdaten** neu liefern (Bild-2–5-Backfill-Quelle versiegt sonst).
8. **E-Mail-Popup** verdeckt mobil den Kaufknopf (Shopify Forms → Trigger/Position anpassen; Marketing-Entscheid).
9. **GitHub-Token «gitlab»** läuft ~22.08. ab — erneuern, sonst reissen Pushes ab.
10. **Meta-Token** nur falls Social wieder aktiviert werden soll (⛔ Social-Stopp bleibt bis dahin).

### 📌 Vereinbarte Regel (User 16.08.2026):
**Ab CHF 2'000 kumuliertem Gewinn überweist der User CJ-Guthaben per Bank** → Order-Engine zahlt
dann automatisch aus dem Wallet (kein Karten-Link mehr pro Bestellung, schnellere Verarbeitung).
Stand-Tracking: kumulierter Gewinn seit August 2026 ≈ CHF 32 (Stand 16.08.). Ich melde mich,
sobald die Schwelle in Reichweite ist. (CJ-Banküberweisung braucht 1–3 Werktage bis Gutschrift.)

### 🤖 Läuft automatisch (nichts zu tun, nur zur Info):
- Ab 16:00 UTC Prioritätsfenster: Schulstart-Restimporte (Lunchtasche, Laptop-Hülle mit Ständer,
  Tech-Organizer) + Variantenbilder-Backlog (~2'700 Produkte, mehrtägig) + Video-Backfill 60/Tag.
- ß→ss-Backfill Rest (~1'300 Produkte).
- LX1013/LX1014: Shopify-Fulfillment sobald CJ auf SHIPPED geht (Runner überwacht).
- Hype-Reihe kuratiert sich täglich selbst (Ablauf 21 Tage, Bildprüfung).

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
- [ ] **Bild:** das KI-Bali-Editorial (aus Medien) · **Headline:** `Premium-Sommermode · dein Schweizer Online-Shop` ·
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

## 🔴 PRODUKTSEITEN-FIXES (Befund 2026-06-09 via Search&Discovery-Check) — Customizer
Live-Produkt-Template `templates/product.json` ausgelesen. Search & Discovery IST installiert.
**Reihenfolge nach Wichtigkeit (alles Customizer → Produkt-Template):**
1. **🔴 Versand-Akkordeon „Versand & Lieferung" enthält FALSCHE Horizon-Platzhalter** (auf JEDER Produktseite):
   - „Lieferung in 2–5 Werktagen" → real **7–14 Tage / 1–2 Wochen** (sonst Beschwerden + Rückbuchungen bei Dropship-Laufzeit!).
   - „Ab CHF 50 versenden wir kostenlos" → **ab CHF 65** (Konsistenz mit Ankündigungsleiste + Collections).
2. **🟡 Empfehlungssektion „You may also like" → auf Cross-Sell umstellen:** im Abschnitt „Product recommendations"
   die Einstellung **recommendation_type: „related" → „complementary"** (damit das eben gesetzte „Passt dazu"
   angezeigt wird) + Heading „You may also like" → **„Das passt dazu"** (DE).
3. **✅ schon ok:** Rückgabe „30 Tage", Judge.me-Badge + Review-Widget verdrahtet (nur Reviews/Token fehlen).
Hinweis: Live-Theme-Schreibzugriff ist API-seitig gesperrt → diese 2 Punkte gehen nur im Customizer.

## ✅ VORBEREITET via API (2026-06-09) — nur noch 1 Klick „Veröffentlichen"
Ich habe das Live-Theme dupliziert und im Entwurf **2 Produktseiten-Fixes fertig eingebaut + verifiziert**
(JSON valide, Seite rendert, ATC/Varianten ok). Shopify blockiert nur den finalen „Publish" (nur Mensch).
- **Theme:** „Horizon · LuxeStyle (Produktseite-Fix)" (ID 187457962369) — Duplikat des aktuellen Live-Themes
  (enthält deine Hero-Änderungen) + diese Fixes:
  1. **Versand-Text korrigiert:** „2–5 Werktage / ab CHF 50" → **„7–14 Tage (1–2 Wochen) / ab CHF 65"** (faktisch korrekt).
  2. **Empfehlungen:** „You may also like" (related) → **„Das passt dazu" (complementary)** → zeigt mein Cross-Sell.
- **➡️ ZU TUN (1 Klick):** Admin → Onlineshop → Themes → bei „Horizon · LuxeStyle (Produktseite-Fix)" → **„Veröffentlichen"**.
  (Rollback falls nötig: altes Theme „Horizon · LuxeStyle Branded" wieder veröffentlichen.)
- Obsolet/löschbar: Entwurf „Horizon · LuxeStyle Hero-Polish (Claude)" (vor deinen Hero-Änderungen, veraltet).
- Damit sind die früheren Produktseiten-TODOs (Versand-Text + Empfehlungstyp) **erledigt** — nur Publish fehlt.

## 🔑 TODO (2026-06-09) — Meta-Token erneuern (blockiert Posten UND Spam-Moderation)
Trockenlauf der Spam-Moderation ergab: **FB-Token ungültig/abgelaufen** (`OAuthException code 190 — Zugriffstoken deaktiviert`).
→ Betrifft auch den Auto-Post (FB). **Frisches Long-Lived-Token mit erweiterten Scopes setzen:**
- Scopes FB: `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`
- Scopes IG: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`
- Als GitHub-Secrets: `FB_PAGE_ACCESS_TOKEN` (+ `FB_PAGE_ID`), `IG_ACCESS_TOKEN` (+ `IG_USER_ID`) — oder `META_ACCESS_TOKEN`.
- Danach läuft: ✅ Auto-Post FB/IG + ✅ Spam-Moderation (`social-comment-moderate.yml`, 3×/Tag). Test: Workflow „Social Spam-Moderation" → dry_run=true.
- Sofort & ohne Token: Metas eingebaute Filter (IG → Kommentare → manueller Filter + „Links ausblenden"; FB → Moderationshilfe/Keyword-Blockliste).

## 📋 To-do MORGEN (2026-08-07)
**Deine Klicks (je 2–5 Min):**
1. **Google Merchant Center:** Ziel-Land auf NUR Schweiz stellen → gibt die «Missing shipping info»-Produkte frei (#1 Gratis-Traffic-Hebel!)
2. **Shop-App-Profil** (Admin → Vertriebskanäle → Shop): Logo + Banner + Slogan setzen; dabei in Einstellungen → Allgemein die Shop-Beschreibung «…und nach Deutschland» → «…in die ganze Schweiz» ändern
3. **Search & Discovery App:** Filter «Availability»→«Verfügbarkeit», «Price»→«Preis» umbenennen + Filter für Farbe/Grösse aktivieren (mein Theme-Fix deckt die Labels ab, aber sauber ist sauber)
4. **Dameco-Anfrage** in Gmail absenden (Entwurf liegt bereit) · Shopcom-Postfach auf Freischaltung prüfen
5. **Pinterest:** Claim auf Logo-Konto umziehen (blaues Konto: Claim entfernen)
6. **Shopify Admin → Marketing → Automationen:** «Warenkorbabbruch»-Automation aktivieren
7. Optional: Kimi aufladen (platform.moonshot.ai) · CH-Telefonnummer fürs Trust-Signal prüfen (Sipcall/Peoplefone)

**Läuft automatisch (ich):** CJ-Grind + Varianten-Backfill sobald CJ-Punkte resetten · Google-Metafelder fertigsetzen ·
Neuheiten/Blitz-Rotation · weitere Fehler-Sweeps (TWS-Kopfhörer-Dedup, Titel-Polish, 6 offene Kostüm-Gruppen)

- [ ] **Popup-Timing (2 Min):** Shopify Admin → Forms → WELCOME10-Popup → Trigger von «sofort» auf **10–15 s Verzögerung** (oder Exit-Intent) stellen. Mobil verdeckt es sonst sofort Hero/Produkt — gerade bei Ad-Traffic auf Produktseiten kostet das Käufe.

- [ ] **🔧 BigBuy-API-Key für Marken-Werkzeuge (grosser Umsatz-Hebel):** Im Katalog liegen **127 gedraftete Marken-Werkzeuge CHF 60–290** (Stanley 38, Knipex 28, DeWalt 12, Bosch, Ryobi, Black&Decker, Bahco, Facom) — z.B. Motorsäge Ryobi 289.90, Stichsäge Bosch GST 90 BE 264.90, Kreissäge DeWalt 249.90. Sie sind **nicht** wegen Unlieferbarkeit gedraftet, sondern nur mit Tag `lager-unbekannt-draft` (Lagerstand war beim Aufräumen unbekannt). Bei diesen Preisen ist die BigBuy-Fracht von ~28 EUR problemlos tragbar (10% statt 100%). **Was ich brauche:** `BIGBUY_API_KEY` als Umgebungsvariable — dann prüft `automation/bigbuy_viability_guard.mjs` automatisch Lagerstand + CH-Versand und aktiviert nur die wirklich lieferbaren. Ohne Prüfung aktiviere ich sie nicht (Ghost-Sale-Risiko, das die 4 Erstattungen #1007–#1010 verursacht hat).
