# 🆓 Gratis Werbung schweizweit — LuxeStyle CH (Plan + fertige Inserate)

> Kein Budget nötig. Trifft den Engpass (Reichweite) ohne Ad-Spend. Stand: 2026-06-15.
> Quellen: tutti.help, allfinds.ch, brauchtumschweiz.ch, base.com (CH-Marktplatz-Ranking 2026).

## 🏆 Die besten GRATIS-Kanäle (nach Aufwand/Reichweite)
| Kanal | Gratis? | Reichweite CH | Aufwand | Status |
|---|---|---|---|---|
| **Google Merchant „Free Listings"** | ✅ 100% | sehr hoch (Google Shopping) | gering (Kanal schon installiert!) | ⏳ nur Merchant-Center grün machen |
| **tutti.ch** | ✅ kostenlos, keine Provision | sehr hoch (meistgenutzt) | mittel (Inserate manuell) | 🆕 Konto + inserieren |
| **Pinterest** | ✅ | hoch (Mode/Deko, langlebig) | läuft autonom | ✅ aktiv (103 Pins, 2×/Woche) |
| **Facebook Marketplace + CH-Gruppen** | ✅ | hoch | mittel | 🆕 in CH-Mode/Buy&Sell-Gruppen posten |
| **anibis.ch / zaster.ch / trovas.ch** | ✅ | mittel | mittel | 🆕 dieselben Inserate spiegeln |
| **Google Business Profile** | ✅ | lokal/CH | gering, 1× | 🆕 anlegen |
| **IG/FB/TikTok organisch** | ✅ | aufbauend | läuft autonom | ✅ Worker postet 3×/Tag |
| Ricardo | ❌ 8–12% Provision | hoch | mittel | optional (Onboarding lief schon) |

## 🎯 Reihenfolge (max. Wirkung, min. Aufwand)
1. **Google Merchant „Free Listings" grün machen** (Shopify→Google&YouTube→Merchant Center: Domain verifizieren, Free Listings AN). = gratis Google-Shopping-Traffic, Kanal ist schon installiert.
2. **tutti.ch-Konto** + 8–10 Top-Produkte inserieren (kostenlos, keine Provision, grösste CH-Reichweite). Inserate unten copy-paste-fertig.
3. **Facebook:** in CH-Gruppen posten — „Schweizer Schnäppchen", „Kleider & Mode Schweiz", „Brocki/Flohmarkt Schweiz", regionale Buy&Sell-Gruppen (Bern/Zürich/Basel). + Marketplace.
4. **anibis/zaster/trovas:** dieselben Inserate spiegeln (1× Aufwand, mehr Reichweite).

## 📋 Copy-Paste-Inserate (tutti/anibis/Marketplace) — Bärndütsch-Touch
> Format: kurzer Titel · Preis · 2–3 Sätze · Link. Bild = Produktbild aus dem Shop.

**1) Maxikleid «Brise» — CHF 39.90**
> Luftiges Sommer-Maxikleid in mehreren Farben. Neu, versandbereit ab Lager CH-Partner. Gratis-Versand ab CHF 65, –10% mit Code WELCOME10. 👉 luxestyle.ch

**2) Statement-Ohrringe «Onyx» — CHF 39.–**
> Elegante Gold-Schwarz-Ohrringe, leicht & hautfreundlich. Perfekt zum Verschenken. 30 Tage Rückgabe. 👉 luxestyle.ch

**3) Stroh-Shopper «Capri» — CHF 19.90**
> Geflochtene Schultertasche, Sommer-/Resort-Look. Neu. Schweizer Shop, schnelle Lieferung. 👉 luxestyle.ch

**4) Kerzenwärmer-Lampe «Fiore» — CHF 40.90**
> Stilvolle Tulpen-Glasschirm-Lampe, schmilzt Duftkerzen ohne Flamme. Cosy-Deko. 👉 luxestyle.ch

**5) Sonnenbrille «Riviera» — CHF 14.90**
> Oversize-Square mit Gold-Detail, UV-Schutz. Trend 2026. Gratis-Versand ab CHF 65. 👉 luxestyle.ch

**6) Crossbody-Tasche «Lido» — CHF 12.90**
> Gewebte Color-Block-Tasche, freihändig & stylisch. Neu. –10% mit WELCOME10. 👉 luxestyle.ch

## 🤖 tutti halbautomatisch (PC-Claude-Browser) — `automation/local/tutti-post.mjs`
> tutti hat **kein Inserier-API** → läuft NUR über den eingeloggten Browser am PC-Claude (CDP Port 9222),
> genau wie die Follower-Maschine. Daten = `dropship/tutti_listings.csv` (**11 gemischt**: 7 CJ-Schnäppchen 19–55 CHF
> + 4 echte Marken — D&G, Calvin Klein, Swatch Swiss Made, Guess — als Klick-Magnete; alle echte Preise/Bilder).
> **Bonus:** im tutti-Konto ist „Automatische Veröffentlichung auf **Ricardo**" aktiv → jedes Inserat geht doppelt raus.
- **🤖 AUTONOM (im Tagestask):** `run-follower-daily.ps1` ruft `tutti-post.mjs` mit `AUTO_PUBLISH=1 TUTTI_CAP=2` →
  postet **2 neue Inserate/Tag von selbst** (lädt Bild + wählt Kategorie + veröffentlicht). Voraussetzung: PC an +
  Brave-Profil `brave-agent` auf **tutti.ch eingeloggt**. Sicherung: veröffentlicht NUR, wenn ALLE Felder sauber gesetzt
  sind — sonst überspringen (kein kaputtes Inserat). **⚠️ PC-Claude muss beim 1. Lauf die tutti-Selektoren (File-Input/
  Kategorie/„Veröffentlichen") einmal verifizieren** — danach läuft es hands-off.
- **Manuell/Test:** *„`node automation/local/tutti-post.mjs --dry`, dann ohne `--dry`. Brave mit
  `--remote-debugging-port=9222` + auf tutti.ch eingeloggt."* (ohne AUTO_PUBLISH = nur befüllen, du bestätigst Veröffentlichen.)
- Sicher gegen Sperren: Cap 3/Lauf (`TUTTI_CAP=`), Pausen 20–60 s, idempotenter Ledger `tutti-ledger.txt`.
  Absenden bestätigt der PC-Claude/User bewusst (Kategorie+Bild prüfen) → keine Fehl-Inserate.
- Belp als Ort, „schweizweit Versand", Link luxestyle.ch + WELCOME10 sind in jedem Text drin.

## ⚙️ Was automatisierbar ist vs. manuell
- **Automatisch (läuft):** IG/FB/Pinterest organisch (Worker + Pinterest-System).
- **Manuell (deine Konten, Login nötig):** tutti/anibis/zaster/trovas, FB-Gruppen, Google Merchant Center, Google Business Profile. Ich kann jederzeit MEHR fertige Inserate/Texte liefern.
- **Tipp:** tutti/anibis-Inserate brauchen oft eine Adresse — Belp (Impressum) nutzen, Versand „Schweizweit" anbieten.

## 🆕 Weitere Gratis-CH-Kanäle (recherchiert 2026-06-15, Quellen newinzurich.com/meineinkauf.ch)
- **anibis.ch** — gratis Kleininserate, lokale CH-Käufer. Hero-Schmuck/Accessoires listen, luxestyle.ch im Text als Shop-Funnel.
  (Dieselben Texte/Bilder wie `tutti_listings.csv` nutzbar; gleicher Browser-Weg wie tutti.)
- **Facebook Marketplace** pro Stadt (Zürich/Bern/Basel/Genf/Luzern rotieren) — gratis, hohe Reichweite, in CH stark.
- **Lokale + Expat-FB-Gruppen** (Stadt-/Expat-Buy&Sell) — Verkaufsregeln je Gruppe beachten, 1×/Woche.
- **Google Business Profile** (business.google.com) — gratis Eintrag → „LuxeStyle"/Marken- + Lokal-Suchen + Maps. **Einmal anlegen (User).**
- **Pinterest Business** — läuft schon (`pinterest-publish.yml`, 103 Pins) → weiter füttern; Fashion/Schmuck visuell stark in CH.

## ⚠️ Wichtig
- **Strikt CH** — keine Deutschland-Gruppen/Plattformen.
- Nicht spammen: in FB-Gruppen die Regeln beachten (oft 1 Post/Woche, nur in „Verkaufs"-Tagen).
- tutti = kostenlos & ohne Provision (anders als Ricardo 8–12%).

---
## 📣 Fertige Facebook-Gruppen-Posts (CH Buy&Sell / Mode-Gruppen)
> In Gruppen wie „Kleider & Mode Schweiz", „Schweizer Schnäppchen", regionale Buy&Sell (Bern/Zürich/Basel).
> Regeln beachten (oft nur an Verkaufstagen / 1×/Woche). Bild dazu = Produktbild aus dem Shop.

**Post A — Neuheiten (Wert-Fokus):**
> 🆕 Frisch im Shop: Schmuck, Taschen & Deko für die Schweiz 🇨🇭 Faire Preise ab CHF 12.90, Gratis-Versand ab CHF 65, 30 Tage Rückgabe. Schau verbii 👉 luxestyle.ch · –10% mit Code WELCOME10

**Post B — Mundart (nahbar):**
> Hoi zäme! 👋 Mir si en chliine Schwiizer Shop für Mode, Schmuck & Deko. Neu sind hübschi Täschli, Ohrring & Cozy-Home-Sache inecho. Lueg mau verbii, freue mi 🇨🇭 luxestyle.ch (–10% mit WELCOME10)

**Post C — eine Kategorie (z.B. Taschen):**
> 👜 Neui Täsche & Clutches im Shop — vo Stroh-Shopper bis Abendtasche, ab CHF 12.90. Schweizer Shop, schnelli Lieferig. luxestyle.ch · –10% WELCOME10

## 📣 NEU: Facebook-CH-Gruppen-Posts MIT MARKEN (copy-paste, 2026-06-15)
> Für CH-Buy&Sell-/Mode-/Schnäppchen-Gruppen (Bern/Zürich/Basel/Luzern rotieren). Regeln beachten (oft 1×/Woche,
> nur Verkaufstage). Bild = Produktbild aus dem Shop-CDN (URLs in `dropship/tutti_listings.csv`). Strikt CH, kein DE.

**FB-1 — Marken-Hammer (Trust + Preis):**
> 🇨🇭 Original-Marken zu fairen Preisen im Schwiizer Shop! ⌚ **Swatch Swiss Made** ab CHF 159.90 · 🌸 **Dolce & Gabbana «The One»** EdP CHF 99.90 · **Calvin Klein** Parfum CHF 74.90 — alles 100% echt, neu & versiegelt. Gratis-Versand ab CHF 65, 30 Täg Rückgab. Lueg verbii 👉 luxestyle.ch · –10% mit Code WELCOME10

**FB-2 — Mundart, nahbar:**
> Hoi zäme! 👋 Mir si en chliine Schwiizer Onlineshop für Mode, Schmuck, Uhre & Parfum. Neu hei mer **echti Marke** wie Swatch, D&G, Calvin Klein & Guess inecho — und feini Sache ab CHF 19.90. Schau mau verbii, freue mi 🇨🇭 luxestyle.ch (–10% mit WELCOME10)

**FB-3 — Beauty/Geschenk-Fokus:**
> 🎁 Gschänk gsuecht? **D&G «The One» Parfum** CHF 99.90, **Guess Damenuhr «Glamour»** CHF 129.90 oder feini Silberschmuck ab CHF 29.90 — alles original, schnelli Lieferig us de Schwiiz. 30 Täg Rückgab. 👉 luxestyle.ch · –10% WELCOME10

**FB-4 — Schnäppchen-Fokus (für Schnäppchen-Gruppen):**
> 💥 Neu im Schwiizer Shop ab CHF 19.90: Vitamin-C-Serum, Gua-Sha «Jade», Statement-Ohrring & Sneaker. Faire Preise, gratis Versand ab CHF 65, 30 Täg Rückgab. 👉 luxestyle.ch · –10% mit WELCOME10

## 📋 Weitere tutti/anibis-Inserate (neue Produkte)
**7) Ohrringe «Lotus» · 999 Silber — CHF 24.90** — Filigrane Lotus-Ohrringe, Emaille, hautfreundlich. 👉 luxestyle.ch
**8) Armkette «Papillon» · Roségold — CHF 51.90** — Zarte Schmetterling-Armkette mit Perlmutt. 👉 luxestyle.ch
**9) Kerzenwärmer «Fiore» — CHF 40.90** — Tulpen-Glasschirm-Lampe, schmilzt Duftkerzen ohne Flamme. 👉 luxestyle.ch
**10) Filzhut «Montana» — CHF 12.90** — Breitkrempiger Wollfilz-Fedora, Herbst-Statement. 👉 luxestyle.ch
**11) Y-Roller Gesichtsmassage — CHF 29.90** — Beauty-Tool für Lifting & Self-Care zuhause. 👉 luxestyle.ch
**12) Reed-Diffuser «Cristallo» — CHF 12.90** — Duftöl mit Achat-Stein, dezenter Dauerduft. 👉 luxestyle.ch
