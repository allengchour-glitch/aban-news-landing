# 💑 Paar- & Hype-Produkte — kuratierte Import-Ziele 2026 (für PC-Browser/Import-Session)

> **Warum dieses Doc:** CJ + BigBuy haben aktuell **keine sauberen Paar-Sets** (CJ = personalisiert/Overlay,
> BigBuy = gebrandete Einzelstücke). Die viralen Couple-Sets gibt's auf **AliExpress** — aber AliExpress
> **blockt Cloud-Scraping (403)** → Import nur über **PC-Claude-Browser** (`automation/local/ae-video-fetch.mjs`
> bzw. manuelles Hinzufügen via CJ-Source-by-URL). Diese Liste ist **vor-kuratiert + QA-Kriterien fix**, damit die
> Import-Session nur noch sauber abarbeitet. **Strikt CH, Mundart, anlauffrei/wasserfest bevorzugt.**

## 🎯 Ziel-Liste
Maschinenlesbar: `dropship/paare_hype_targets.csv` (kategorie · ali_suchbegriff · ziel_ek · ziel_chf · winkel · qa).
Quelle Hype-Ranking: Research 2026-06-16 (CJ-/Sellthetrend-/Etsy-/TikTok-Trends) + Gehirn `rules.paare_partner`.

**Top-Prioritäten (nach Hype × Marge × Sauberkeit):**
1. **Magnet-Herz-Halskette (Paar, 2-tlg)** — viralster Couple-Hit, Geschenk-Dauerbrenner. CHF 34.90.
2. **His/Hers Partner-Armband-Set (wasserfest)** — TikTok-Trend, passt 1:1 zur HERO-Nische. CHF 36.90.
3. **Cuban-Link Armband (Herren)** — viral bei Männern, füllt Herren-Lücke. CHF 39.90.
4. **Kleeblatt-Kette (4-leaf)** — viraler Damen-Hit. CHF 34.90.
5. King&Queen-Set · Sun&Moon · Partner-Ringe (verstellbar) · Distance-Magnet · Layering-Set · Statement-Creolen.

## ✅ QA-PFLICHT vor dem Anlegen (jedes Bild ansehen!)
- **KEINE** asiatische Schrift / „MADE IN CHINA" / Lieferanten-Watermark / eingebrannter Overlay-Text.
- **KEIN** Name/Bild-Mismatch; bei „Paar/2-tlg" müssen wirklich **2 Teile** zu sehen sein (kein einzelnes Stück als „Set" verkauft).
- **KEINE Gravur/Personalisierung als Pflicht** (Fulfillment-/Misrepresentation-Risiko — genau das hat Merchant gesperrt).
- **Material:** Edelstahl/anlauffrei/hypoallergen bevorzugt (CH-Sommer/Wasser-Winkel).
- **Ringe:** nur **verstellbar** (keine fixe Grösse ohne Grössen-Varianten = Retourenrisiko).

## 🖼️ Anlege-Standard (User-Regel 2026-06-16: „immer alle Bilder + Video")
- **ALLE** Lieferanten-Bilder als Media anhängen (nie nur Cover) — `rules.media_pflicht`.
- **Video** dazu: AliExpress-Produktvideo (via `ae-video-fetch.mjs`) ODER eigenes Reel (`render_price_reveal.sh` / A/B / Save-Liste).
- Deutsche Detail-Beschreibung + Grössen/Pflege-Hinweis + SEO + Trust (wasserfest/Versand/30 T Rückgabe).
- Tags: `paare`/`partner` + `schmuck` + `geschenk` + `wasserfest` (wo zutreffend) + gender. **Kategorie/Smart-Collection-Regeln NICHT selbst ändern** (Taxonomie = andere Session) — nur taggen.

## 🔁 Import-Weg (PC-Claude, kein Cloud-API)
1. AliExpress im eingeloggten Brave (Port 9222) öffnen, Suchbegriff aus der CSV.
2. Sauberen Treffer wählen (QA oben), per CJ „Source by URL" ODER DSers in den Shop ziehen.
3. Bilder+Video QA → anlegen (ACTIVE) → in alle 6 Publications → Tags setzen.
4. Dubletten-Check vor jedem Anlegen (`rules.import_dedup`: Bild-Basisname/Name/SKU).

## 📌 Sofort schon live (diese Session, ohne neue Produkte)
Partner-Look-Content aus dem sauberen Bestand: `reels/partner-armband-9x16.mp4` (His/Hers, Tag-a-Friend-CTA) — in der Queue.

---

## 👔 HERREN-HEMDEN & Herren-Gap (User 2026-06-16 „männer hemden? go")
**Befund:** CJ hat KEINE sauberen Fashion-Herrenhemden (nur 1 Unterhemd). Gute Sommerhemden = **AliExpress (PC-Browser)**.
**Strategie (ehrlich):** Der Shop ist Damen-lastig → Herren ist ein echter Gap. ABER **Hemden = sized Apparel = Retouren-Risiko #1**.
Darum:
- **Selektiv starten:** 2–3 saubere **Leinen-Kurzarm- / Cuban-Collar-Sommerhemden** (2026-Hype), je **Grössentabelle (EU S–XXL, cm Brust/Länge) PFLICHT** + Mess-Guide + „im Zweifel grösser".
- **QA:** kein asiatisches Model/Verpackungs-Text, sauberes Studio-/Lifestyle-Bild, uni/zeitlose Farben (kein Logo-Knockoff).
- **Alternative/parallel — Herren ohne Retouren-Risiko:** der Herren-Gap lässt sich risikoärmer mit **Accessoires** füllen, wo wir schon Gewinner haben (Caps, Uhren, Slim-Wallet, Cuban-Link-Armband, Sonnenbrille) — Einheitsgrösse = kaum Retouren. Hemden als bewusster, kleiner Test danebenstellen.
Ziele in `dropship/paare_hype_targets.csv` (3 Hemden-Zeilen ergänzt).
