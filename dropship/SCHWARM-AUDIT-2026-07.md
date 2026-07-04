# 🔍 10-Agenten-Schwarm — Audit-Ergebnisse (2026-07-04)

> Groq/Gemini + 6 Landingpage-Agenten + 4 Audit-Agenten (Ehrlichkeit/Recht, Conversion, Bild, 7-Tage-Sprint).
> Landingpages → `automation/create_seo_pages.mjs` (6 Kategorien, verifizierte Links). Fixes unten priorisiert.

## 🔴 KRITISCH (Ehrlichkeit/Recht/Conversion — konvergent von mehreren Agenten)
1. **Lieferzeit-WIDERSPRUCH auf DERSELBEN PDP:** Buy-Box-Estimator zeigt „voraussichtlich 7.–11. Juli" (3–7 T), Beschreibung + delivery_block sagen „7–14 T". Zu optimistisch für POD = verbotene Über-Versprechung. FIX: Estimator abschalten ODER an 7–14-Tier koppeln = EINE Wahrheit. [THEME + CizQ6]
2. **Homepage-Meta „…Versand in die Schweiz UND NACH DEUTSCHLAND"** (indexiert, og/twitter). Strikt-CH-Bruch. FIX: „und nach Deutschland" streichen. [THEME/SEO-App — CizQ6 kann Produkt-Metas, Homepage-Meta = Theme/User]
3. **Gratis-Versand INKONSISTENT:** Header/PDP „ab CHF 65" vs. Landingpages „ab CHF 50". FIX: eine Schwelle (50) überall — Header, Policy, Shopify-Versandprofil. [USER Versandprofil + Theme/Copy]
4. **„In der Schweiz gestaltet & versandt" vs. Header „Versand aus EU-Lager"** = irreführende Herkunft (Swissness). FIX: ehrlich „geliefert in die Schweiz / Versand aus EU-Lager". [CizQ6 Copy]
5. **Leeres „No reviews / 0★" an jeder Buy-Box** — schlechter als nichts. FIX: Judge.me „hide when empty" bis echte Reviews. [USER Judge.me] + echten Review-Flow.
6. **Datenschutz nennt kein Schweizer revDSG/EDÖB** (nur DSGVO). Compliance-Lücke für CH-Shop. FIX: DSG-Abschnitt + Verantwortlichen (LuxeStyle CH, volle Adresse). [Copy/Policy]
7. **Marken-Ware (Michael Kors/Calvin Klein/Police) per Dropship** — Echtheit + compareAt-UVP belegen ODER entfernen (Fälschungs-/Marken-Risiko). [USER Beschaffung]

## 🟡 CONVERSION / MOBILE (Conversion-Agent)
8. **Mobile-Designer-Warnung IM Verkaufstext** („falls Designer nicht lädt…") sät Zweifel beim Kern-USP. FIX: dezenter nach ATC; Designer mobil sicherstellen ODER native Name/Nummer-Felder. [Theme + CizQ6 Copy]
9. **3 gestapelte Announcement-Banner** fressen mobilen Above-the-Fold → auf 1 Zeile. [Theme]
10. **WELCOME10 doppelt/dreifach** (Banner+Popup+PDP) = Rabatt-Lärm → an EINER Stelle. [Theme+Copy]
11. **Klarna fehlt an der Buy-Box** (nur TWINT/Visa/MC sichtbar) — „Kauf auf Rechnung" ist CH-Kauf-Trigger. FIX: Klarna-Badge unter ATC. [Theme]
12. **PDP ~800-Wort-Textwand** vor der Kaufinfo → 3–4 Benefit-Bullets oben, Rest in Akkordeons, Sticky-ATC. [CizQ6 Copy + Theme]
13. **Nav 18+ Top-Kategorien ohne Hierarchie** → auf 5–7 Ober-Gruppen bündeln. [CizQ6 Nav]
14. **Homepage: gleiche Produkte doppelt** (Topseller ↔ „Unter CHF 25") + Karten-CTA „Auswählen" unklar → entdoppeln, EIN klares Label. [CizQ6/Theme]
15. **Hero-Claim vage** („Premium & günstig") → konkreter Nutzen + Link auf stärkste Collection. [CizQ6 Copy]

## 🟢 7-TAGE-SPRINT (Sprint-Agent) — Top-3 Sofort-Hebel
- **A. Erste Reviews SICHTBAR** (Judge.me Badge+Widget ins Product-Template + 3 echte Käufer anschreiben) = #1 Conversion-Leak. [User/Theme]
- **B. TikTok-Kampagne auf ADD-TO-CART** statt Traffic (Geo CH, Pangle AUS = weniger Bots). [User stellt um, CizQ6 liefert Creatives]
- **C. Klaviyo Abandoned-Cart scharf** (E1 nach 1–2h, Smart-Sending AUS, Absender LuxeStyle). [User 4 Klicks]
- **CH-Gotcha (neu):** Google Shopping CH braucht zwingend einen **CSS-Partner** — sonst wird der Feed nicht freigegeben. [User]

## Ownership
- **CizQ6 autonom (Copy/Struktur/Metas/Nav):** 4, 12, 13, 14, 15 + Produkt-Metas · Landingpages (Skript) · Collection-Rename.
- **Theme-Session:** 1(Estimator), 8, 9, 10, 11, Sticky-ATC, Payment-Badges, Homepage-Meta.
- **NUR User:** 3(Versandprofil), 5(Judge.me), 6/7(Policy/Beschaffung), Sprint A/B/C, Google-CSS.

## 🖼️ BILD-AUDIT (Agent 10, 6.500+ Produkte visuell inspiziert)
- **SAUBER (kein Handlungsbedarf):** Mode, Fan-Artikel/Trikots, Anime-Funkos, Marken-Schmuck, Marken-Beauty (Chanel/Clinique…). Fan-Trikot-Cartoon-Falle bereits gefixt.
- **🔴 ROOT-CAUSE (~80% aller Fundstellen):** Elektronik/Gadgets/Gaming (BigBuy/CJ) haben als **Position-1-Bild Lieferanten-Infographics mit Fremd-Watermark + engl. Text** (VEVOR/AUMEON-Batterien, RADIOMASTER-RC, TOMI-Uhren, Nagellampen, Gaming-Controller, Drohnen). Meist existiert ein sauberes Weissbild weiter hinten → FIX = **Media umsortieren** (`productReorderMedia`, per Skript+Gemini-Vision), wo kein sauberes Bild: archivieren. [CizQ6/PC-Gemini]
- **Fremd-Watermark auf Premium-Schmuck** („REAL STERLING SILVER S925"-Stempel, engl. Banner) — Trust-Segment! → umsortieren/wegcroppen.
- **1 Cartoon-Fund:** Rena-Rouge-Puppe (Zeichentrick-Art statt Foto) + falsch in beauty-makeup → Foto/archivieren + recategorisieren.
- **Falsche Kategorien:** Schulterstütze/Plüschtier in gaming/beauty; KFZ-/Motorrad-Batterien, POS-Monitore, SSDs unter Marke „LuxeStyle" → aus Nav/Trust-Collections raus (Root-Cause). [KATALOG-SESSION — die importieren gerade]
- **Alt-Text:** überwiegend gut; nur ein Tippfehler-Platzhalter `alt="prodcut img"` im Theme-Snippet → auf `{{ image.alt | default: product.title }}`. [THEME, 1 Snippet]
