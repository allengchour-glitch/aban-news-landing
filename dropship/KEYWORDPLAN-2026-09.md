# KEYWORDPLAN LuxeStyle CH — September 2026 (23.09.2026, 22:45–23:45 UTC)

Auslöser: Betreiber-Link 23.09. (TikTok @ecomfabio: «Keywords ziehen, Konkurrenz analysieren, Keywordplan bauen»). Drei Vorläufer haben
gemessen (Nachfrage im Shop, Keyword-Ernte, Konkurrenz), diese Datei ist der fertige Plan. Marken wie in `dropship/LERNEN-*.md`:
**GEMESSEN** = selbst mit Befehl/Quelle · **QUELLE** = fremde Angabe, plausibel · **BEHAUPTUNG** = ungeprüft. Suchvolumen und CPC sind
hier NICHT messbar (Semrush ohne API-Einheiten, Google Ads Keyword-Planner ohne Konto) — wo eine Zahl fehlt, steht keine.

## A. Ausgangslage

**Kanäle (GEMESSEN ShopifyQL `FROM sessions GROUP BY referrer_source, referrer_name SINCE -90d`, 23.09.):**

| Quelle | Sitzungen 90 T | Warenkorb | Checkout |
|---|---|---|---|
| direct | 19'582 | 38 | 6 |
| tiktok | 3'093 | 5 | 0 |
| facebook | 3'045 | 0 | 0 |
| **google** | **551** | **21** | **4** |
| pinterest | 112 | 3 | 0 |
| bing | 52 | 0 | 0 |
| chatgpt / instagram | 20 / 19 | 0 | 0 |

- Google ist mit 551 Sitzungen der einzige Kanal neben direct, der Checkouts liefert (4). TikTok-Ads sind AUS (alle 4 Kampagnen deaktiviert, GEMESSEN 22.09.).
- **Google-Landeseiten 90 T (GEMESSEN, Top 100 = 450 Sitzungen):** 92 Produktseiten (275), Startseite (78), 2 Ratgeber (78: Faszienrolle 76, Geschenke Männer 2), 4 Kollektionen (18).
  Die zwei stärksten Produkt-Landeseiten sind heute DRAFT — aber NICHT 404 (GEMESSEN 23.09. 23:50 `urlRedirects`): Dry Bag 20L (82 Sitzungen)
  leitet per 301 auf den 10-l-Dry-Bag mit Blumenprint, das Rizinusöl-Wickel-Set (55 Sitzungen, 2 Warenkorb, in 30 T noch 18) auf das Tunmate-Rizinusöl;
  alle neun gedrafteten Google-Landeseiten tragen einen Redirect auf ein aktives Produkt (Gegenprüfung des Hauptagenten). Ebenso DRAFT: 2 mobile
  Klimaanlagen, Intex-Boot (1 Checkout im Sommer).
- **Google 30 T:** nur 101 Sitzungen auf 53 Landeseiten (Startseite 20, Rizinus 18+10, Rest 1–2) — der Sommerverkehr (Kühlung, Pool, Dry Bag) ist weg.
- **Kollektionen als Google-Landeseite sind praktisch unsichtbar** (90 T: 4 Kollektionen, 18 Sitzungen; 30 T: 0). Die 90-T-Spitzen viral-hits 528 /
  wasserfester-schmuck 496 stammten aus den abgeschalteten TikTok-Ads (30 T: 1 / 0).
- **Ratgeber wirken:** 309 publizierte Artikel; Faszienrolle-Anleitung 76 Google-Sitzungen, Himalaya-Salzlampe 18 — beide informational, 0 Warenkorb.
- **Verkäufe 90 T (GEMESSEN):** 15 Bestellungen; Top: Leinen-Set Provence 34.90, Schweiz-Fan-Trikot 34.90, Katzenspielzeug rotierende Scheibe 25.90,
  E-Scooter-Ladegerät 21.90, Gemüseschneider 15.90, Reise-Hängematte 14.90, zwei Kleider 13.41. 4 behaltene externe Kunden (CLAUDE.md, Zählregel customer.id).
- **Länder 30 T (GEMESSEN):** CH 627 von 1'069 (58.7 %); US 125 + CN 98 (21 %) wahrscheinlich Bots/Proxys; DE 62 = Verkehr ohne Versandoption (Markt nur CH).
- **Semrush (QUELLE domain_rank ch, 23.09.):** luxestyle.ch Rang 1'157'996, 536 organische Keywords, geschätzter Traffic 0. Keine API-Einheiten für Volumen/CPC.
  ⚠️ Prüfer 24.09.: der Aufruf kam aus der Hauptsession per MCP (10 Einheiten), es liegt KEINE Rohdatei ab — die Zahl ist nicht reproduzierbar und keine
  Entscheidungsgrundlage; beim nächsten Plan Rohantwort nach `scratchpad/keywordplan/semrush.json` ablegen oder die Zeile streichen.
- **Katalog (GEMESSEN Admin-GraphQL 2026-01, 23.09. 23:25 UTC):** 50'003 aktive Produkte (`productsCount(status:active, limit:null)` EXACT), 520 Kollektionen,
  350 im Onlineshop veröffentlicht (Prüfer 24.09.; um 23:25 waren es 353, seither halloween-2026, geschenke-unter-30 und fitness-sub
  abgemeldet + 301 — `automation/kollektion_doppel.py`); ch-lager 2'408 aktiv — konzentriert in blitzversand-schweiz (100 %), kostueme-ch-lager (99.8 %), halloween (79 %),
  party-deko-ch (61/61), ft-pluesch (225/318); fast alle anderen Kollektionen 0–2 %.
- **Tracking (GEMESSEN, Theme MAIN 426 Dateien, Regex gtag(|googletagmanager|AW-|G-|GTM-|UA-):** 0 Treffer — kein Google-Ads-Tag, kein GA4 im Theme.
  Vorhanden: TikTok-Pixel (consent-gated), Microsoft Clarity, Kanal «Google & YouTube». Ob die Google-App ein App-Pixel (Conversion/GA4) setzt, ist per
  Admin-API NICHT lesbar (`webPixel` = RESOURCE_NOT_FOUND) → Betreiber-Blick Einstellungen → Kunden-Events.
- **Keyword-Ernte (GEMESSEN 607 WebFetch-Aufrufe auf suggestqueries.google.com, hl=de gl=ch, 27 leer):** 59 Seeds × 5 Modifikatoren + 12 A–Z-Seeds,
  4'812 Rohvorschläge → 4'600 eindeutige Keywords; regelbasiert: 906 transaktional, 171 kommerziell, 328 informational, 1'249 navigational/Fremdmarke,
  1'946 generisch. Negativliste 617 Begriffe. **Suggest-Rang = Reihenfolge im Vorschlagsfeld (1–3 = starke Nachfrage), keine Zahl.**
- **Konkurrenz (GEMESSEN 24 Keywords via search.ch, 23.09.):** search.ch indexiert praktisch nur .ch-Seiten und ist klein — galaxus/digitec/brack/zalando/
  zooplus/fressnapf erscheinen in 0 von 240 Treffern (Index-Bias, nicht Google-Wahrheit); luxestyle.ch ist im search.ch-Index nicht vorhanden. Google-SERP,
  DDG, Bing, Brave, Ecosia, Mojeek, Yahoo, Yandex, Qwant, Startpage: alle blockiert. Was «Konkurrenzlage» in B sagt, ist deshalb QUELLE search.ch.
- **Was NICHT messbar ist:** Suchvolumen, CPC, Wettbewerbsdichte, Google-Positionen von luxestyle.ch (keine Search Console angebunden).

## B. Keyword-Cluster je Warengruppe

Legende: Absicht regelbasiert aus der Ernte (transaktional = kaufen/schweiz/günstig/online; kommerziell = test/ideen/hochwertig/trend;
informational = anleitung/selber machen/entfernen …). Suggest-Rang = Position im Google-Suggest-Array für den Modifikator in Klammern.
Landeseite = Handle im Shop mit aktiven Produkten (GEMESSEN `productsCount(query:"collection_id:<id> status:active", limit:null)`, EXACT);
«Lücke» = kein passender Handle. Gruppen-Ernte gesamt (eindeutige Keywords): Haustier 931, Geschenke 814, Mode 690, Halloween 497, Wohnen 442,
Schmuck/Uhren 405, Beauty 220, Elektronik 213, Sport/Outdoor 137, Küche 114, Kinder/Baby 71, Party 66.

### 1. Haustier Katze
Zielkollektionen: `katzenwelt`, `haustier-katzen`, `tierspielzeug`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| kratzbaum kaufen | transaktional | 1 (kaufen) | `katzenwelt` (815) / `haustier-katzen` (248) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| kratzbaum schweiz | transaktional | 1 (schweiz) | `katzenwelt` (815) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| kratzbaum günstig | transaktional | 1 (günstig) | `katzenwelt` (815) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| kratzbaum xxl | transaktional | 1 (az:x) | Lücke (41 Kratzbaum-Titel, keine eigene Kollektion) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| katzenspielzeug kaufen | transaktional | 1 (kaufen) | `tierspielzeug` (169) / `katzenwelt` (815) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| katzenspielzeug interaktiv | generisch | 1 (az:i) | `tierspielzeug` (169) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| futterautomat katze kaufen | transaktional | 1 (kaufen) | `haustier-futter-naepfe` (292) | nicht gemessen (kein search.ch-Aufruf) |
| futterautomat katze testsieger schweiz | kommerziell | 2 (schweiz) | `haustier-futter-naepfe` (292) | nicht gemessen (kein search.ch-Aufruf) |
| kratzbaum qualität | kommerziell | 2 (az:q) | `katzenwelt` (815) (Ratgeber-Thema) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| katzenspielzeug selber machen | informational | 1 (az:s) | `tierspielzeug` (169) (Ratgeber-Thema) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |

### 2. Haustier Hund
Zielkollektionen: `hundewelt`, `haustier-hunde`, `tier-leinen-kleidung`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| hundebett kaufen | transaktional | 1 (kaufen) | `hundewelt` (1651) / `haustier-hunde` (438) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| hundebett schweiz | transaktional | 1 (schweiz) | `hundewelt` (1651) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| hundebett xxl | transaktional | 1 (az:x) | Lücke (23 Hundebett-Titel, keine eigene Kollektion) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| hundeleine kaufen | transaktional | 1 (kaufen) | `tier-leinen-kleidung` (285) / `hundewelt` (1651) | nicht gemessen (kein search.ch-Aufruf) |
| hundegeschirr kaufen schweiz | transaktional | 1 (kaufen) | `tier-leinen-kleidung` (285) | nicht gemessen (kein search.ch-Aufruf) |
| hundegeschirr online kaufen | transaktional | 1 (online) | `tier-leinen-kleidung` (285) | nicht gemessen (kein search.ch-Aufruf) |
| hundebett test | kommerziell | 3 (az:t) | `hundewelt` (1651) (Ratgeber-Thema) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |
| hundebett selber bauen | informational | 1 (az:s) | `hundewelt` (1651) (Ratgeber-Thema) | Fachhändler CH (mypet.ch, tierswiss.ch, tier-welt.ch); luxestyle 0× |

### 3. Halloween — Deko & Kostüme (Saison, CH-Lager 79–99 %)
Zielkollektionen: `halloween`, `kostueme-ch-lager`, `ft-damenkostuem`, `ft-herrenkostuem`, `ft-kinderkostuem`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| halloween deko kaufen | transaktional | 1 (kaufen) | `halloween` (207) — `halloween-2026` (gleiche Regel) seit 23.09. 23:35 abgemeldet + 301 | Lücke: Nischen-Shops (decorado.ch, partytime-shop.ch) + Rauschen |
| halloween deko schweiz | transaktional | 1 (schweiz) | `halloween` (207) | Lücke: Nischen-Shops (decorado.ch, partytime-shop.ch) + Rauschen |
| halloween deko günstig | transaktional | 1 (günstig) | `halloween` (207) | Lücke: Nischen-Shops (decorado.ch, partytime-shop.ch) + Rauschen |
| halloween deko ideen | kommerziell | 2 (az:i) | `halloween` (207) (Ratgeber-Thema) | Lücke: Nischen-Shops (decorado.ch, partytime-shop.ch) + Rauschen |
| halloween kostüm damen kaufen | transaktional | 1 (kaufen) | `ft-damenkostuem` (275) / `kostueme-ch-lager` (1576) | nicht gemessen (kein search.ch-Aufruf) |
| halloween kostüm damen schweiz | transaktional | 1 (schweiz) | `kostueme-ch-lager` (1576) | nicht gemessen (kein search.ch-Aufruf) |
| halloween kostüm herren kaufen | transaktional | 1 (kaufen) | `ft-herrenkostuem` (251) / `kostueme-ch-lager` (1576) | nicht gemessen (kein search.ch-Aufruf) |
| halloween kostüm kinder schweiz | transaktional | 1 (schweiz) | `ft-kinderkostuem` (296) | nicht gemessen (kein search.ch-Aufruf) |
| halloween kostüm damen ideen | kommerziell | 1 (az:i) | `ft-damenkostuem` (275) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| halloween deko selber machen | informational | 1 (az:s) | `halloween` (207) (Ratgeber-Thema) | Lücke: Nischen-Shops (decorado.ch, partytime-shop.ch) + Rauschen |

### 4. Wohnen — Textil & Wanddeko
Zielkollektionen: `kissen-wohntextilien`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| zierkissen kaufen schweiz | transaktional | 1 (kaufen) | `kissen-wohntextilien` (1795) | Möbelhändler (delta-moebel, viplounge); kein Marktplatz im Index |
| zierkissen günstig | transaktional | 1 (günstig) | `kissen-wohntextilien` (1795) | Möbelhändler (delta-moebel, viplounge); kein Marktplatz im Index |
| vorhänge kaufen | transaktional | 1 (kaufen) | `kissen-wohntextilien` (1795) | nicht gemessen (kein search.ch-Aufruf) |
| vorhänge schweiz | transaktional | 1 (schweiz) | Lücke (58 Vorhang-Titel nur in kissen-wohntextilien) | nicht gemessen (kein search.ch-Aufruf) |
| wanddeko kaufen | transaktional | 1 (kaufen) | Lücke (22 Wanddeko-Titel, keine Kollektion) | nicht gemessen (kein search.ch-Aufruf) |
| wanddeko schweiz | transaktional | 1 (schweiz) | Lücke (22 Wanddeko-Titel, keine Kollektion) | nicht gemessen (kein search.ch-Aufruf) |
| wanddeko günstig selber machen | informational | 3 (günstig) | Lücke (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |

### 5. Licht — Nachtlicht, Projektor, Lichterkette
Zielkollektionen: `licht-nachtlicht-projektor`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| sternenhimmel projektor kaufen | transaktional | 1 (kaufen) | `licht-nachtlicht-projektor` (122) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| sternenhimmel projektor schweiz | transaktional | 1 (schweiz) | `licht-nachtlicht-projektor` (122) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| nachtlicht kinder schweiz | transaktional | 1 (schweiz) | `licht-nachtlicht-projektor` (122) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| sternenhimmel projektor test | kommerziell | 1 (az:t) | `licht-nachtlicht-projektor` (122) (Ratgeber vorhanden: galaxy-projektor-sternenhimmel-lampen-test) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| sternenhimmel projektor baby ab wann | informational | 2 (az:b) | `licht-nachtlicht-projektor` (122) (Ratgeber vorhanden: magazin/sternenhimmel-projektor-baby-eltern-guide) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| led lichterkette kaufen | transaktional | 1 (kaufen) | Lücke (licht-led-strip 4 aktiv, 3 Lichterketten-Titel = Sortiment) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |
| led lichterkette schweiz | transaktional | 1 (schweiz) | Lücke (Sortiment) | Lücke: Kleinhändler/Dropship (lichterkette.ch, bestseller-shop.ch) |

### 6. Raumklima (Saison Sommer — jetzt nachrangig)
Zielkollektionen: `luftreiniger-klimageraete`, `ventilatoren`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| luftreiniger kaufen | transaktional | 1 (kaufen) | `luftreiniger-klimageraete` (198) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| luftreiniger schweiz | transaktional | 1 (schweiz) | `luftreiniger-klimageraete` (198) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| luftreiniger test | kommerziell | 2 (seed) | `luftreiniger-klimageraete` (198) (Ratgeber vorhanden) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| ventilator kaufen | transaktional | 1 (kaufen) | `ventilatoren` (84) | nicht gemessen (kein search.ch-Aufruf) |
| ventilator günstig | transaktional | 1 (günstig) | `ventilatoren` (84) | nicht gemessen (kein search.ch-Aufruf) |

### 7. Küche
Zielkollektionen: `kuechenhelfer`, `kuechen-gadgets`, `sub-trinkflaschen`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| gemüseschneider kaufen | transaktional | 1 (kaufen) | `kuechenhelfer` (1784) / `kuechen-gadgets` (78) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| gemüseschneider schweiz | transaktional | 1 (schweiz) | `kuechenhelfer` (1784) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| gemüseschneider testsieger | kommerziell | 3 (seed) | `kuechenhelfer` (1784) (Ratgeber-Thema) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| küchenhelfer kaufen | transaktional | 1 (kaufen) | `kuechenhelfer` (1784) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| küchenhelfer online shop | transaktional | 1 (online) | `kuechenhelfer` (1784) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| wasserflasche kaufen | transaktional | 1 (kaufen) | `sub-trinkflaschen` (164) | nicht gemessen (kein search.ch-Aufruf) |
| vakuumierer kaufen | transaktional | 1 (kaufen) | Lücke (0 Vakuumierer-Titel = Sortiment) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |
| vakuumierer test kassensturz | kommerziell | 1 (seed) | Lücke (Sortiment) | Gastro-/Fachhändler (expondo.ch, tromcoshop.ch, landi.ch) |

### 8. Damenmode — Kleider
Zielkollektionen: `sub-kleider`, `damen-mode`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| damen kleid kaufen | transaktional | 1 (kaufen) | `sub-kleider` (2782) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| kleid damen schweiz | transaktional | 1 (schweiz) | `sub-kleider` (2782) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| damen kleid online kaufen | transaktional | 1 (online) | `sub-kleider` (2782) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| midikleid kaufen | transaktional | 1 (kaufen) | Lücke (142 Midikleid-Titel, 125 in sub-kleider, keine eigene Kollektion) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| midikleid schweiz | transaktional | 1 (schweiz) | Lücke (siehe oben) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| damen kleid xxl | transaktional | 1 (az:x) | `sub-kleider` (2782) (Facette Grösse) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |

### 9. Herrenmode — Hemden & Hoodies
Zielkollektionen: `herren-hemden`, `hoodies-sweatshirts`, `herren-jacken`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| leinenhemd herren kaufen | transaktional | 1 (kaufen) | `herren-hemden` (812) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| leinenhemd herren schweiz | transaktional | 1 (schweiz) | `herren-hemden` (812) | Marktplatz-Signal (zalando-lounge, kastner-oehler, lehner-versand) |
| hoodie kaufen | transaktional | 1 (kaufen) | `hoodies-sweatshirts` (69) / `herren-jacken` (81) | nicht gemessen (kein search.ch-Aufruf) |
| hoodie schweiz | transaktional | 1 (schweiz) | `hoodies-sweatshirts` (69) | nicht gemessen (kein search.ch-Aufruf) |
| hoodie günstig | transaktional | 1 (günstig) | `hoodies-sweatshirts` (69) | nicht gemessen (kein search.ch-Aufruf) |
| hoodie trend 2026 | kommerziell | 9 (az:t) | `hoodies-sweatshirts` (69) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| hoodie selber gestalten | informational | 1 (az:s) | `sg-bekleidung` (14) (POD-Editor) | nicht gemessen (kein search.ch-Aufruf) |

### 10. Schuhe & Taschen
Zielkollektionen: `schuhe-sneaker`, `sub-stiefel-boots`, `handtaschen-umhaengetaschen`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| sneaker damen kaufen | transaktional | 1 (kaufen) | `schuhe-sneaker` (1035) / `damen-schuhe` (1959) | nicht gemessen (kein search.ch-Aufruf) |
| sneaker damen online shop | transaktional | 1 (online) | `schuhe-sneaker` (1035) | nicht gemessen (kein search.ch-Aufruf) |
| sneaker damen trend 2026 | kommerziell | 4 (seed) | `schuhe-sneaker` (1035) (Ratgeber vorhanden: sneaker-guide-2026) | nicht gemessen (kein search.ch-Aufruf) |
| stiefel damen kaufen | transaktional | 1 (kaufen) | `sub-stiefel-boots` (684) (79 Damen-Stiefel-Titel) | nicht gemessen (kein search.ch-Aufruf) |
| stiefel damen online kaufen | transaktional | 1 (online) | `sub-stiefel-boots` (684) | nicht gemessen (kein search.ch-Aufruf) |
| handtasche damen kaufen | transaktional | 1 (kaufen) | `handtaschen-umhaengetaschen` (573) | nicht gemessen (kein search.ch-Aufruf) |
| handtasche damen schweiz | transaktional | 1 (schweiz) | `handtaschen-umhaengetaschen` (573) | nicht gemessen (kein search.ch-Aufruf) |

### 11. Uhren
Zielkollektionen: `uhren`, `herren-uhren`, `uhren-damen`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| herrenuhr kaufen | transaktional | 1 (kaufen) | `herren-uhren` (310) / `uhren` (1831) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| herrenuhr online kaufen | transaktional | 1 (online) | `herren-uhren` (310) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| herrenuhr schweiz | transaktional | 1 (schweiz) | `herren-uhren` (310) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| herrenuhr günstig kaufen | transaktional | 1 (günstig) | `herren-uhren` (310) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| damenuhr kaufen | transaktional | 1 (kaufen) | `uhren-damen` (48) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| damenuhr schweiz | transaktional | 1 (schweiz) | `uhren-damen` (48) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |
| damenuhr hochwertig | kommerziell | 1 (az:h) | `uhren-damen` (48) (Ratgeber vorhanden: damenuhr-kaufen-der-guide) | Fachhändler (uhren-shop.ch 6'000 Bewertungen, chronext.ch) |

### 12. Schmuck
Zielkollektionen: `wasserfester-schmuck`, `sub-ohrringe`, `moissanit-schmuck`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| wasserfester schmuck kaufen | transaktional | 1 (kaufen) | `wasserfester-schmuck` (99) | nicht gemessen (kein search.ch-Aufruf) |
| wasserfester schmuck schweiz | transaktional | 1 (schweiz) | `wasserfester-schmuck` (99) | nicht gemessen (kein search.ch-Aufruf) |
| wasserfester schmuck günstig | transaktional | 1 (günstig) | `wasserfester-schmuck` (99) | nicht gemessen (kein search.ch-Aufruf) |
| ohrringe kaufen | transaktional | 1 (kaufen) | `sub-ohrringe` (246) | nicht gemessen (kein search.ch-Aufruf) |
| ohrringe online kaufen | transaktional | 1 (online) | `sub-ohrringe` (246) | nicht gemessen (kein search.ch-Aufruf) |
| moissanit ring kaufen | transaktional | 1 (kaufen) | Lücke (moissanit-schmuck 5 aktiv, MANUAL ohne Regel; 95 Moissanit-Titel aktiv) | Lücke: 2 Nischen-Shops + 1 Dropshipper + Wikipedia |
| moissanit ring günstig | transaktional | 1 (günstig) | Lücke (siehe oben) | Lücke: 2 Nischen-Shops + 1 Dropshipper + Wikipedia |

### 13. Beauty — Tools, Nägel, Haarstyling, Zahnpflege
Zielkollektionen: `beauty-tools`, `naegel`, `haarstyling-geraete`, `zahnpflege`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| gua sha kaufen | transaktional | 1 (kaufen) | `beauty-tools` (520) | Lücke, aber Wellness-/Praxis-Kontext (Heilversprechen-Risiko) |
| gua sha schweiz | transaktional | 1 (schweiz) | `beauty-tools` (520) | Lücke, aber Wellness-/Praxis-Kontext (Heilversprechen-Risiko) |
| gua sha gesicht anleitung | informational | 8 (seed) | `beauty-tools` (520) (Ratgeber vorhanden: gua-sha-richtig-anwenden-anleitung) | Lücke, aber Wellness-/Praxis-Kontext (Heilversprechen-Risiko) |
| nagellack kaufen | transaktional | 1 (kaufen) | `naegel` (90) / `naegel-manikuere` (1034) | nicht gemessen (kein search.ch-Aufruf) |
| nagellack online kaufen | transaktional | 1 (online) | `naegel` (90) | nicht gemessen (kein search.ch-Aufruf) |
| nagellack entfernen | informational | 2 (seed) | `naegel` (90) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| lockenstab kaufen | transaktional | 1 (kaufen) | `haarstyling-geraete` (405) | nicht gemessen (kein search.ch-Aufruf) |
| lockenstab testsieger | kommerziell | 2 (seed) | `haarstyling-geraete` (405) (Ratgeber vorhanden: haarstyling-tools-…) | nicht gemessen (kein search.ch-Aufruf) |
| haaröl kaufen | transaktional | 1 (kaufen) | Lücke (5 Haaröl-Titel, haarpflege 13 aktiv = Sortiment) | nicht gemessen (kein search.ch-Aufruf) |
| elektrische zahnbürste kaufen | transaktional | 1 (kaufen) | `zahnpflege` (37) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| elektrische zahnbürste schweiz | transaktional | 1 (schweiz) | `zahnpflege` (37) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| rasierer herren kaufen | transaktional | 1 (kaufen) | `herren-grooming` (18) (18 aktiv, unter 20) | nicht gemessen (kein search.ch-Aufruf) |

### 14. Elektronik & Zubehör
Zielkollektionen: `kopfhoerer-audio`, `smartwatches-wearables`, `tastatur-maus`, `handy-huellen`, `elektronik-laden`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| bluetooth kopfhörer kaufen | transaktional | 1 (kaufen) | `kopfhoerer-audio` (271) (51 Bluetooth-Kopfhörer-Titel) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| bluetooth kopfhörer schweiz | transaktional | 1 (schweiz) | `kopfhoerer-audio` (271) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| bluetooth kopfhörer test schweiz | kommerziell | 2 (schweiz) | `kopfhoerer-audio` (271) (Ratgeber vorhanden: kopfhorer-kaufberatung-2026) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| smartwatch kaufen | transaktional | 1 (kaufen) | `smartwatches-wearables` (540) | nicht gemessen (kein search.ch-Aufruf) |
| smartwatch schweiz | transaktional | 1 (schweiz) | `smartwatches-wearables` (540) | nicht gemessen (kein search.ch-Aufruf) |
| gaming tastatur kaufen | transaktional | 1 (kaufen) | `tastatur-maus` (119) (23 Gaming-Tastatur-Titel) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| gaming tastatur schweiz | transaktional | 1 (schweiz) | `tastatur-maus` (119) | Hersteller + Preisvergleich/Ratgeber (preisvergleich.ch, logitech.com) |
| handyhülle kaufen | transaktional | 1 (kaufen) | `handy-huellen` (49) | nicht gemessen (kein search.ch-Aufruf) |
| powerbank kaufen | transaktional | 1 (kaufen) | `elektronik-laden` (702) | nicht gemessen (kein search.ch-Aufruf) |
| powerbank schweiz | transaktional | 1 (schweiz) | `elektronik-laden` (702) | nicht gemessen (kein search.ch-Aufruf) |
| powerbank handgepäck | informational | 7 (seed) | `elektronik-laden` (702) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| e scooter ladegerät kaufen | transaktional | 1 (kaufen) | `elektronik-laden` (702) (11 E-Scooter-Titel; Keyword löst bei search.ch auf Fahrzeug-Shops auf) | Fachhändler Scooter (vmax-escooter.ch, elektroscootershop.ch) |

### 15. Sport & Outdoor
Zielkollektionen: `yoga-pilates`, `fitness-geraete`, `camping-outdoor`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| yogamatte kaufen | transaktional | 1 (kaufen) | `yoga-pilates` (267) (22 Yogamatten-Titel) | nicht gemessen (kein search.ch-Aufruf) |
| yogamatte schweiz | transaktional | 1 (schweiz) | `yoga-pilates` (267) | nicht gemessen (kein search.ch-Aufruf) |
| yogamatte reinigen | informational | 7 (seed) | `yoga-pilates` (267) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| fitnessgeräte für zuhause kaufen | transaktional | 1 (kaufen) | `fitness-geraete` (59) | nicht gemessen (kein search.ch-Aufruf) |
| fitness geräte für zuhause günstig | transaktional | 1 (günstig) | `fitness-geraete` (59) | nicht gemessen (kein search.ch-Aufruf) |
| stirnlampe kaufen | transaktional | 1 (kaufen) | `camping-outdoor` (265) (11 Stirnlampen-Titel, camping-licht-outdoor 13 aktiv) | Fachhändler Sport/Army (army-shop.ch, hardloop.ch, decathlon) |
| stirnlampe schweiz | transaktional | 1 (schweiz) | `camping-outdoor` (265) | Fachhändler Sport/Army (army-shop.ch, hardloop.ch, decathlon) |
| hängematte kaufen | transaktional | 1 (kaufen) | Lücke (15 Hängematten-Titel, keine Kollektion) | Fachhändler Sport/Army (army-shop.ch, hardloop.ch, decathlon) |
| hängematte aufhängen | informational | 10 (seed) | Lücke (Ratgeber-Thema) | Fachhändler Sport/Army (army-shop.ch, hardloop.ch, decathlon) |

### 16. Kinder & Baby
Zielkollektionen: `ft-pluesch`, `spielzeug`, `baby-kleinkind`, `spielzeug-lernen`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| plüschtier kaufen | transaktional | 1 (kaufen) | `ft-pluesch` (318) / `spielzeug` (1396) | nicht gemessen (kein search.ch-Aufruf) |
| plüschtier schweiz | transaktional | 1 (schweiz) | `ft-pluesch` (318) (225 von 318 ch-lager) | nicht gemessen (kein search.ch-Aufruf) |
| plüschtier online shop | transaktional | 1 (online) | `ft-pluesch` (318) | nicht gemessen (kein search.ch-Aufruf) |
| kuscheltiere waschen | informational | 8 (seed) | `ft-pluesch` (318) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| lernspielzeug kaufen | transaktional | 1 (kaufen) | `spielzeug` (1396) (spielzeug-lernen nur 12 aktiv) | Portale + Ratgeber (geschenkidee.ch, mydays.ch, elternsofa.ch) |
| babyspielzeug kaufen | transaktional | 1 (kaufen) | `baby-kleinkind` (2665) (Tag baby, 0 Titel mit «Babyspielzeug») | nicht gemessen (kein search.ch-Aufruf) |
| babyspielzeug schweiz | transaktional | 1 (schweiz) | `baby-kleinkind` (2665) | nicht gemessen (kein search.ch-Aufruf) |

### 17. Geschenke & Weihnachten
Zielkollektionen: `geschenke-fuer-sie`, `geschenke-fuer-ihn`, `weihnachten-2026`, `kleine-geschenke-mitbringsel`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| geschenkideen frauen schweiz | transaktional | 1 (schweiz) | `geschenke-fuer-sie` (2189) (Ratgeber vorhanden: geschenke-fuer-frauen-2026-schweiz) | Portale + Ratgeber (geschenkidee.ch, mydays.ch, elternsofa.ch) |
| geschenkideen frauen günstig | transaktional | 1 (günstig) | `geschenke-fuer-sie` (2189) / `🎁-geschenke-bis-chf-30` (12093) | Portale + Ratgeber (geschenkidee.ch, mydays.ch, elternsofa.ch) |
| geschenk kaufen männer | transaktional | 1 (kaufen) | `geschenke-fuer-ihn` (822) | Portale + Ratgeber (geschenkidee.ch, mydays.ch, elternsofa.ch) |
| geschenk für männer schweiz | transaktional | 1 (schweiz) | `geschenke-fuer-ihn` (822) (Ratgeber vorhanden, 2 Google-Sitzungen 90 T) | Portale + Ratgeber (geschenkidee.ch, mydays.ch, elternsofa.ch) |
| adventskalender kaufen | transaktional | 1 (kaufen) | Lücke (2 Adventskalender-Titel = Sortiment) | nicht gemessen (kein search.ch-Aufruf) |
| adventskalender schweiz | transaktional | 1 (schweiz) | Lücke (Sortiment) | nicht gemessen (kein search.ch-Aufruf) |
| adventskalender zum befüllen | informational | 1 (az:z) | `kleine-geschenke-mitbringsel` (21654) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |
| weihnachtsdeko kaufen | transaktional | 1 (kaufen) | `weihnachten-2026` (158) (158 aktiv, aber nur 4 Deko-Titel = Sortiment) | nicht gemessen (kein search.ch-Aufruf) |
| weihnachtsdeko schweiz | transaktional | 1 (schweiz) | `weihnachten-2026` (158) | nicht gemessen (kein search.ch-Aufruf) |
| weihnachtsdeko trend 2026 | kommerziell | 1 (az:t) | `weihnachten-2026` (158) (Ratgeber-Thema) | nicht gemessen (kein search.ch-Aufruf) |

### 18. Party & Ballone (CH-Lager 100 %)
Zielkollektionen: `party-deko-ch`, `ft-ballone`

| Keyword (QUELLE Google-Suggest 23.09.) | Absicht | Suggest-Rang (Modifikator) | Landeseite (Handle, aktive Produkte GEMESSEN) | Konkurrenzlage (QUELLE search.ch) |
|---|---|---|---|---|
| partydeko schweiz | transaktional | 1 (schweiz) | `party-deko-ch` (110) (61 von 61 ch-lager) | nicht gemessen (kein search.ch-Aufruf) |
| partydeko kaufen | transaktional | 2 (kaufen) | `party-deko-ch` (110) | nicht gemessen (kein search.ch-Aufruf) |
| partydeko online shop | transaktional | 1 (online) | `party-deko-ch` (110) | nicht gemessen (kein search.ch-Aufruf) |
| luftballons schweiz | transaktional | 1 (schweiz) | `ft-ballone` (35) | nicht gemessen (kein search.ch-Aufruf) |
| luftballons online bestellen | transaktional | 1 (online) | `ft-ballone` (35) | nicht gemessen (kein search.ch-Aufruf) |
| luftballons günstig kaufen | transaktional | 1 (günstig) | `ft-ballone` (35) | nicht gemessen (kein search.ch-Aufruf) |

**Abgelehnte Cluster (Hausregeln):** Klingen/Messer (Versandverbot CN→CH seit 16.09.), Erotik, Arzneimittel/Supplements, Heilversprechen
(Wellness-/Magnet-Armbänder), Lizenzmarken (Disney, Pokemon, Harry Potter, Lego stehen in der Negativliste), tote Marken (Casio, Adidas, Nike, Bosch,
Philips, Braun … 0 aktive). Navigational/Fremdmarken-Keywords (1'249) werden nicht beworben und nicht in SEO-Titel geschrieben.

## C. SEO-Plan

### C1. SEO-Felder der Zielkollektionen — GESCHRIEBEN 23.09. 23:34 UTC (12 Kollektionen, rückgelesen)

Regel: nur wo das Hauptkeyword des Clusters im SEO-Titel FEHLTE und die Kollektion ≥ 20 aktive Produkte hat; höchstens 12. Weg:
`automation/kollektionstexte_nachbessern.py` (PLAN-Block «23.09. abends — Keywordplan»), DRY → Diff gelesen (0 Verstoss, 0 Abweichung) → `SCHARF=1`
(12 geschrieben + rückgelesen, Ledger `dropship/_kollektionstexte_nachbessern.txt`). Das Skript prüft ≤ 65 Zeichen Titel (strenger als die Hausregel 70),
≤ 155 Beschreibung mit «Gratis-Versand ab CHF 50», keine Sie-Anrede, kein Eszett, keine tote Marke, kein CH-Lager-Versprechen bei CJ-Kollektionen.

| Kollektion (aktiv) | SEO-Titel alt → neu (Zeichen) | SEO-Beschreibung neu (Zeichen) | Begründung (Keyword aus B, R = Suggest-Rang) |
|---|---|---|---|
| `katzenwelt` (815) | Katzenwelt kaufen Schweiz | LuxeStyle → **Katzenspielzeug, Kratzbaum & Katzenzubehör kaufen | LuxeStyle** (61) | Alles für deine Katze: Katzenspielzeug, Kratzbäume, Katzenbetten, Näpfe und Pflege bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (149) | kratzbaum kaufen (R1), katzenspielzeug kaufen (R1); «Katzenwelt» ist kein Suchbegriff |
| `hundewelt` (1651) | Hundewelt kaufen Schweiz | LuxeStyle → **Hundebett, Hundeleine & Hundegeschirr kaufen | LuxeStyle CH** (59) | Alles für deinen Hund: Hundebetten, Hundeleinen, Hundegeschirre, Spielzeug, Näpfe und Pflege bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50. (141) | hundebett kaufen (R1), hundeleine kaufen (R1), hundegeschirr online kaufen (R1); «Hundewelt» ist kein Suchbegriff |
| `tierspielzeug` (169) | Tierspielzeug kaufen | LuxeStyle Schweiz → **Katzenspielzeug & Hundespielzeug kaufen | LuxeStyle Schweiz** (59) | Katzenspielzeug und Hundespielzeug gegen Langeweile: Intelligenzspielzeug, Laser, Bälle und interaktive Spielsachen. Gratis-Versand ab CHF 50. (142) | katzenspielzeug kaufen (R1); 59 Katzen-/74 Hunde-Titel in der Kollektion |
| `schuhe-sneaker` (1035) | Sneaker kaufen | LuxeStyle → **Sneaker Damen & Herren kaufen | LuxeStyle Schweiz** (49) | Sneaker für Damen und Herren online kaufen: Turnschuhe, Laufschuhe und Sportschuhe für Alltag und Sport. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (148) | sneaker damen kaufen (R1), 70 Damen-/347 Herren-Sneaker |
| `herren-uhren` (310) | Herren-Uhren kaufen | LuxeStyle Schweiz → **Herrenuhren online kaufen | LuxeStyle Schweiz** (45) | Herrenuhren online kaufen: sportliche, elegante und klassische Modelle für jeden Anlass bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (154) | herrenuhr kaufen (R1), herrenuhr online kaufen (R1); «Herren-Uhren» mit Bindestrich ≠ Suchwort |
| `haarstyling-geraete` (405) | Haarstyling-Geräte kaufen Schweiz | LuxeStyle → **Lockenstab, Glätteisen & Haarstyling-Geräte | LuxeStyle CH** (58) | Lockenstäbe, Glätteisen, Haartrockner und Warmluftbürsten für Salon-Styling zuhause. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (128) | lockenstab kaufen (R1), 200 Lockenstab- + 74 Glätteisen-Titel |
| `tastatur-maus` (119) | Tastaturen & Mäuse kaufen Schweiz | LuxeStyle → **Gaming-Tastatur & Gaming-Maus kaufen | LuxeStyle Schweiz** (56) | Gaming-Tastaturen, Gaming-Mäuse, kabellose Mäuse und Mauspads für Büro und Gaming. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (126) | gaming tastatur kaufen (R1), gaming tastatur schweiz (R1); 23 Gaming-Tastatur-Titel |
| `kopfhoerer-audio` (271) | Kopfhörer & Audio kaufen | LuxeStyle Schweiz → **Bluetooth-Kopfhörer & Audio kaufen | LuxeStyle Schweiz** (54) | Bluetooth-Kopfhörer, Earbuds, Headsets und Lautsprecher online kaufen. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Lieferzeit auf jeder Produktseite. (149) | bluetooth kopfhörer kaufen (R1), 51 Bluetooth-Kopfhörer-Titel |
| `yoga-pilates` (267) | Yoga & Pilates kaufen | LuxeStyle Schweiz → **Yogamatte & Yoga-Zubehör kaufen | LuxeStyle Schweiz** (51) | Yogamatten und Zubehör für Yoga und Pilates zuhause. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Lieferzeit auf jeder Produktseite. (131) | yogamatte kaufen (R1), yogamatte schweiz (R1); 22 Yogamatten |
| `ft-pluesch` (318) | 🧸 Plüschtiere | LuxeStyle → **Plüschtiere & Kuscheltiere kaufen | LuxeStyle Schweiz** (53) | Plüschtiere und Kuscheltiere: Bären, Hunde, Katzen und Plüsch-Kissen – vieles ab Schweizer Lager in 1–2 Werktagen. Gratis-Versand ab CHF 50. (140) | plüschtier kaufen (R1), plüschtier schweiz (R1); 225 von 318 ch-lager → CH-Aussage bleibt wahr |
| `kissen-wohntextilien` (1795) | Kissen & Wohntextilien online kaufen | LuxeStyle → **Zierkissen, Vorhänge & Wohntextilien kaufen | LuxeStyle** (55) | Zierkissen, Kissenbezüge, Überwürfe und Vorhänge für ein gemütliches Zuhause bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (143) | zierkissen kaufen schweiz (R1), vorhänge kaufen (R1); Regel TITLE CONTAINS Vorhang |
| `herren-hemden` (812) | Herren-Hemden – Sommer- & Businesshemden | LuxeStyle CH → **Herren-Hemden & Leinenhemden kaufen | LuxeStyle Schweiz** (55) | Herren-Hemden bei LuxeStyle Schweiz: Leinenhemden, Sommerhemden und Businesshemden für Freizeit und Büro. Gratis-Versand ab CHF 50, 30 Tage Rückgabe. (149) | leinenhemd herren kaufen/schweiz (R1), 53 Herren-Leinenhemden; Sommerhemden im September nachrangig |

**Bewusst NICHT geändert (Hauptkeyword schon im Titel):** halloween, kostueme-ch-lager, sub-kleider (Kleider Damen), uhren-damen (Damenuhren),
sub-ohrringe, wasserfester-schmuck, beauty-tools (Gua Sha), naegel (Nagellack), zahnpflege, smartwatches-wearables, handy-huellen, elektronik-laden
(Powerbanks), luftreiniger-klimageraete, ventilatoren, licht-nachtlicht-projektor, haustier-futter-naepfe (Futterautomaten), geschenke-fuer-sie/-ihn,
ft-ballone, handtaschen-umhaengetaschen. **Unter 20 aktive (nicht geändert):** herren-grooming 18, haarpflege 13, spielzeug-lernen 12, moissanit-schmuck 5.

**Nächste Kandidaten (nicht geschrieben, Grenzfälle):** sub-stiefel-boots («Stiefel Damen & Boots» — 79 Damen- vs. 36 Herren-Titel, Rest ungetaggt),
party-deko-ch («Partydeko & Ballone», SD trägt CH-1–2-Tage-Aussage, 61/61 ch-lager = wahr), fitness-geraete («Fitnessgeräte für zuhause»),
sub-trinkflaschen («Wasserflasche» als zweites Wort), sub-kleider («Sommerkleider» im September → «Midikleider»).

### C2. Zehn Ratgeber-Themen für informationale Keywords (Titel + Zielkollektion; noch nicht geschrieben)

Vorhanden und NICHT doppelt zu schreiben (GEMESSEN 309 Handles): Gua Sha (3×), Haarstyling/Lockenstab (3×), Powerbank (3×), Kopfhörer (4×), Smartwatch (7×),
Gaming (7×), Herrenuhr/Damenuhr (5×), Luftreiniger, Ventilator (3×), Yoga (2×), Hundezubehör, Sternenhimmel-Projektor (2×), Trinkflaschen, Zahnbürste,
Herrenhemden (2×), Sneaker (3×), Nägel (2×), Geschenke (20+).

| # | Ratgeber-Titel (du-Form, kein Eszett) | Informationales/kommerzielles Keyword (QUELLE Suggest, Rang) | Zielkollektion |
|---|---|---|---|
| 1 | Hundebett kaufen oder selber bauen? Grösse, Material und Waschbarkeit | hundebett selber bauen (1), hundebett test (3), hundebett xxl (1) | `hundewelt` |
| 2 | Katzenspielzeug selber machen: 7 Ideen — und wann sich gekauftes lohnt | katzenspielzeug selber machen (1), katzenspielzeug interaktiv (1) | `tierspielzeug` |
| 3 | Kratzbaum kaufen: Grösse, Stabilität und Sisal — worauf es ankommt | kratzbaum qualität (2), kratzbaum xxl (1) | `katzenwelt` |
| 4 | Halloween-Deko selber machen: 10 Ideen für drinnen und draussen (+ was du fertig kaufst) | halloween deko selber machen (1), halloween deko ideen (2) | `halloween` |
| 5 | Halloween-Kostüm Damen: 12 Ideen von einfach bis gruselig | halloween kostüm damen ideen (1), halloween kostüm damen kaufen (1) | `kostueme-ch-lager` / `ft-damenkostuem` |
| 6 | Adventskalender zum Befüllen: 24 kleine Geschenke unter CHF 10 | adventskalender zum befüllen (1), adventskalender schweiz (1) | `kleine-geschenke-mitbringsel` |
| 7 | Hoodie selber gestalten: so klappt dein eigenes Design (Schweiz) | hoodie selber gestalten (1), hoodie trend 2026 (9) | `sg-bekleidung` (POD-Editor) |
| 8 | Nagellack entfernen ohne Aceton — und richtig entsorgen (Schweiz) | nagellack entfernen (2) | `naegel` |
| 9 | Yogamatte reinigen: so bleibt sie rutschfest und hygienisch | yogamatte reinigen (7), yogamatte kaufen (1) | `yoga-pilates` |
| 10 | Kuscheltiere waschen: so werden Plüschtiere sauber, ohne Schaden zu nehmen | kuscheltiere waschen (INFO), plüschtier kaufen (1) | `ft-pluesch` |
| 11 (Reserve) | Powerbank im Handgepäck: Regeln für Flüge ab der Schweiz | powerbank handgepäck (7) | `elektronik-laden` |
| 12 (Reserve) | Hängematte aufhängen: Abstand, Höhe und Befestigung | hängematte aufhängen (10) | Lücke → siehe C3 |

**Stand 24.09. 20:00 UTC:** Nr. 1–6 und Nr. 10 live (Nr. 10 `/blogs/ratgeber/kuscheltiere-waschen-plueschtiere-ratgeber`, 1'226 W, 5 Karten mit Altersangabe, Kollektionslink auf die Tag-Ansicht `/collections/ft-pluesch/ch-lager` — ungefiltert zeigt ft-pluesch oben Sofabezüge und Katzenangeln). Offen: Nr. 7 (Hoodie, POD — Editor heilig), 12.
**25.09. 17:40 UTC:** Nr. 11 live — `/blogs/ratgeber/powerbank-handgepaeck-regeln-flug` (710 W, mAh→Wh-Rechnung mit 3,7 V, 100/160-Wh-Grenzen, 4 Karten mit ausgerechneten Wh; 30'000 mAh ≈ 111 Wh ausdrücklich «nur mit Zustimmung der Airline»). Billig-Powerbanks mit 20'000 mAh für CHF 15.90 bewusst nicht verlinkt. Zwei Grammatikfehler aus der Sie→du-Umstellung an den Karten-Produkten korrigiert («dein handliches Design» → «Ihr», «der Tag du führt» → «dich»); Klassen-Messung «du + Verb auf -t» am Voll-Export: keine weitere echte Verbform.
**25.09. 16:55 UTC:** Nr. 8 live — `/blogs/ratgeber/nagellack-entfernen-ohne-aceton-entsorgen` (743 W, Hausmittel ehrlich eingeordnet, Gel-Lack-Grenze, CH-Entsorgung nach Gemeinde; 2 Karten: Peel-off-Lack, Glasfeile). Dampf-Nagellackentferner NICHT verlinkt: «passend für unterschiedliche Steckdosenstandards» bei 1 Variante → Google-Kanal raus, Tag `stecker-unklar`, Auswahl-Liste; Maniküre-Set «Ausführungen A bis H» ebenso auf die Liste.
**25.09. 16:40 UTC:** Nr. 9 live — `/blogs/ratgeber/yogamatte-reinigen-ratgeber` (753 W, Material-Tabelle TPE/PVC/Naturkautschuk/PU/Kork, 4 Karten nur mit Produktfeld-Fakten; Yoga-Handtuch bewusst NICHT verlinkt: Text verspricht drei Farben bei einer Variante). Beim Schreiben gefunden: Farbliste mit Doppelpunkt fehlte dem Wahlversprechen-Wächter → `dropship/FARBLISTE-2026-09-25.md`.

Schreibregeln: keine Heilversprechen, keine Fremdmarken, Preise nur live aus dem Shop (Phantom-Preis-Falle, Task #30), Produktlinks nur auf ACTIVE +
onlineStoreUrl (Phantom-Produkt-Falle, Task #7), du-Form, kein Eszett, Markt nur Schweiz.

### C3. Lücken — Keywords ohne passende Kollektion → Vorschlag Smart-Collection-Regel (GEMESSEN Titelzähler `title:*x* status:active`)

| Keyword-Lücke | Belegte Ware | Vorschlag Regel (Smart Collection) | Bemerkung |
|---|---|---|---|
| moissanit ring kaufen | 95 Moissanit-Titel aktiv, Kollektion `moissanit-schmuck` = 5 aktiv, MANUAL ohne Regel | `moissanit-schmuck` auf Regel `TITLE CONTAINS Moissanit` umstellen | grösste Lücke; search.ch zeigt nur 2 Nischen-Shops · **✅ 25.09.:** manuelle Kollektion lässt sich nicht umstellen → neue Smart-Kollektion `moissanit` (TITLE CONTAINS Moissanit, ohne Detektor/Tester), alte `moissanit-schmuck` 301 + abgemeldet; live 94 Artikel statt 5 (WebFetch) |
| midikleid kaufen / schweiz | 142 Midikleid-Titel (125 in sub-kleider) | neue Kollektion `midikleider`: `TITLE CONTAINS Midikleid` | Suggest-Rang 1 für kaufen/schweiz/günstig |
| kratzbaum kaufen / xxl | 41 Kratzbaum-Titel | neue Kollektion `kratzbaeume`: `TITLE CONTAINS Kratzbaum` | katzenwelt trägt das Wort jetzt im SEO-Titel |
| hundebett kaufen / xxl | 23 Hundebett-Titel | neue Kollektion `hundebetten`: `TITLE CONTAINS Hundebett` | hundewelt trägt das Wort jetzt im SEO-Titel |
| vorhänge kaufen / schweiz | 58 Vorhang-Titel | neue Kollektion `vorhaenge`: `TITLE CONTAINS Vorhang` | heute nur innerhalb kissen-wohntextilien |
| wanddeko kaufen / schweiz | 22 Wanddeko-Titel | neue Kollektion `wanddeko`: `TITLE CONTAINS Wanddeko OR Wandbild OR Wandtattoo` | Regel vorher DRY zählen |
| hängematte kaufen | 15 Hängematten-Titel | neue Kollektion `haengematten`: `TITLE CONTAINS Hängematte` | Reise-Hängematte war ein Verkauf (90 T) |
| stirnlampe kaufen | 11 Stirnlampen-Titel | Regel `TITLE CONTAINS Stirnlampe` in `camping-licht-outdoor` (13 aktiv) | unter 20 → nur Sortimentsfüllung lohnt |
| e scooter ladegerät kaufen | 11 E-Scooter-Titel | Regel `TITLE CONTAINS E-Scooter` in `elektronik-laden` | E-Scooter-Ladegerät war ein Verkauf (90 T) |
| gaming tastatur | 23 Titel, in tastatur-maus | keine neue Regel nötig (SEO-Titel gesetzt) | — |
| vakuumierer, adventskalender, weihnachtsdeko, led lichterkette, haaröl, babyspielzeug | 0 / 2 / 1 / 3 / 5 / 0 Titel | **Sortimentslücke**, keine Regel möglich | Import-Kandidaten (CJ, nur mit CH-Versandoption + Netzstecker-Prüfung) |

## D. Google-Ads-Plan (liegt bereit — NICHT gestartet; Budget = Betreiber-Klick)

### D1. Kampagnenstruktur
1. **Search (manuell, Exact/Phrase)** — Start-Kampagne. Grund: die Nachfrage ist gemessen (Suggest-Rang 1 für «kaufen»/«schweiz»), die Landeseiten
   sind jetzt keyword-tauglich, das Budget ist klein. Nur CH, Sprache Deutsch, Mobile-Anteil 77 % beachten.
2. **Shopping / Performance Max über den Merchant-Feed** — ZWEITE Stufe, erst wenn (a) Conversion-Tracking belegt ist und (b) der Feed sauber ist:
   GEMESSEN 22.09. 21'180 Produkte mit «Over capacity for Shopping ads (CSS program) [CH]» (nur Shopping Ads betroffen) und 1'957 Free-Listings-Blocker
   (Title under review 836, Inappropriate image 445, Product page unavailable 369). PMax ohne Conversion-Signal optimiert auf nichts.
3. Kein Display, kein YouTube (kein Signal, kein Budget).

### D2. Anzeigengruppen (Exact [ ] / Phrase " ", nur transaktional/kommerziell; Landeseite CH-Lager zuerst)

| # | Anzeigengruppe | Keywords (Exact) | Keywords (Phrase) | Landeseite | CH-Lager |
|---|---|---|---|---|---|
| 1 | Halloween Kostüme | [halloween kostüm damen kaufen] [halloween kostüm herren kaufen] [halloween kostüm kinder schweiz] [halloween kostüm damen schweiz] | "halloween kostüm damen" "halloween kostüm herren" | `/collections/kostueme-ch-lager` | 99.8 % (1–2 Werktage belegbar) |
| 2 | Halloween Deko | [halloween deko kaufen] [halloween deko schweiz] [halloween deko günstig] | "halloween deko" | `/collections/halloween` | 79 % |
| 3 | Partydeko & Ballone | [partydeko schweiz] [partydeko kaufen] [luftballons schweiz] [luftballons online bestellen] | "partydeko" "luftballons kaufen" | `/collections/party-deko-ch`, `/collections/ft-ballone` | 100 % |
| 4 | Plüschtiere | [plüschtier kaufen] [plüschtier schweiz] [plüschtier online shop] | "plüschtier" "kuscheltier kaufen" | `/collections/ft-pluesch` | 71 % |
| 5 | Haustier Katze | [kratzbaum kaufen] [kratzbaum schweiz] [katzenspielzeug kaufen] [futterautomat katze kaufen] | "kratzbaum" "katzenspielzeug" | `/collections/katzenwelt`, `/collections/tierspielzeug` | 0–2 % (Lieferzeit 10–20 Werktage in der Anzeige nennen) |
| 6 | Haustier Hund | [hundebett kaufen] [hundeleine kaufen] [hundegeschirr kaufen schweiz] [hundegeschirr online kaufen] | "hundebett" "hundegeschirr" | `/collections/hundewelt`, `/collections/tier-leinen-kleidung` | 0–2 % |
| 7 | Wasserfester Schmuck & Ohrringe | [wasserfester schmuck kaufen] [wasserfester schmuck schweiz] [ohrringe kaufen] [ohrringe online kaufen] | "wasserfester schmuck" | `/collections/wasserfester-schmuck`, `/collections/sub-ohrringe` | 0 % (CJ; 496 TikTok-Sitzungen 90 T zeigen Nachfrage, 2 Warenkorb) |
| 8 | Herrenuhren & Damenuhren | [herrenuhr kaufen] [herrenuhr online kaufen] [herrenuhr günstig kaufen] [damenuhr kaufen] [damenuhr schweiz] | "herrenuhr" "damenuhr" | `/collections/herren-uhren`, `/collections/uhren-damen` | 0 % (Fachhändler-Konkurrenz: uhren-shop.ch, chronext) |

Anzeigentexte: du-Form, «Gratis-Versand ab CHF 50», «Klarna · TWINT», Lieferzeit ehrlich (CH-Lager 1–2 Werktage nur in Gruppen 1–4; sonst
«Lieferung 10–20 Werktage»), keine «−10 %»-Codes ohne gemessene Gültigkeit, keine Heilversprechen, keine Fremdmarken.

### D3. Negativliste (Auszug aus 617, `ernte.json → negativ`)
Händler/Marktplätze: amazon, aliexpress, temu, galaxus, digitec, brack, zalando, manor, coop, migros, landi, jumbo, ikea, lidl, aldi, dm, tedi, kik, otto,
interdiscount, mediamarkt, fressnapf, zooplus, qualipet, decathlon, deichmann, dosenbach, h&m, c&a, about you, ebay, etsy, kleinanzeigen, idealo.
Marken: adidas, nike, puma, casio, fossil, cartier, omega, tissot, junghans, logitech, jbl, dyson, braun, oral-b, philips, lego, disney, pokemon, diddl,
harry potter, essie, essence, gisou, kerastase, rituals, purelei, xiaomi, chicco. DIY/Info: basteln, diy, selber machen, nähen, häkeln, anleitung, vorlage,
clipart, zeichnen, malen, ausdrucken, kostenlos, gratis, gebraucht, mieten, spenden, entsorgen, kreuzworträtsel, bedeutung, englisch, job, kurs, test,
testsieger, stiftung warentest, kassensturz. Orte ausserhalb CH: berlin, hamburg, köln, münchen, wien, dresden, deutschland, holland, niederlande, usa,
pakistan. Hausregel-Klassen: messer, klinge, dessous, erotik, intimbereich, arzneimittel, joint, gothic (Kostüm-Grenzfall, prüfen).
**Nachtrag Prüfer 24.09. — Schweizer Marktplätze/Occasion fehlten in den 617:** ricardo, tutti, anibis, occasion, wish, microspot, conforama, pfister,
second hand, pdf (vor dem Start in die Kampagnen-Negativliste; kaufland/obi/hornbach sind DE-Händler ohne CH-Bezug, schaden aber nicht).
**Widerspruch aufgelöst:** «test», «testsieger», «kassensturz», «stiftung warentest» bleiben in Phase 1 NEGATIV — die kommerziellen Test-Keywords aus B
(hundebett test, lockenstab testsieger, futterautomat testsieger, bluetooth kopfhörer test) sind Vergleichsabsicht und gehören in Ratgeber (C2), nicht
in die manuelle Search-Kampagne mit CHF 10–30/Tag. D2 wirbt damit nur transaktional; «kommerziell» in D2 ist gestrichen zu lesen.

### D4. Budgetszenarien (CHF/Tag) — OHNE erfundene CPCs

| Szenario | Struktur | Was man nach 14 Tagen weiss |
|---|---|---|
| CHF 10/Tag (CHF 140/14 T) | nur Gruppen 1–3 (Saison Halloween + CH-Lager) | ob Halloween-Keywords Klicks bringen und ob die Kostüm-Kollektion wandelt; zu wenig Daten für 8 Gruppen |
| CHF 20/Tag (CHF 280/14 T) | Gruppen 1–6 | Vergleich Saison (1–3) gegen Dauer-Nachfrage Haustier (5–6); Lieferzeit-Effekt (CH-Lager vs. 10–20 Werktage) |
| CHF 30/Tag (CHF 420/14 T) | alle 8 Gruppen | volle Lesung inkl. Schmuck/Uhren; erste Suchbegriff-Berichte für die Negativliste |

**BEHAUPTUNG (keine Quelle messbar):** CPC für deutschsprachige Shopping-/Produkt-Suchbegriffe in der Schweiz liegen erfahrungsgemäss in einer
Bandbreite von etwa CHF 0.40 bis 2.50; damit wären es ca. 4–25 Klicks/Tag bei CHF 10, 8–50 bei CHF 20, 12–75 bei CHF 30. Das ist eine
Annahme zur Grössenordnung, keine Messung — die echte Zahl liefert erst der Suchbegriff-/Auktionsbericht der ersten Woche. Bei 1'300 Sitzungen/30 T
im Shop und einem gemessenen Abschluss pro ~1'300 Sitzungen (Trichter CLAUDE.md) ist auch bei CHF 30/Tag mit 0–2 Bestellungen in 14 Tagen zu rechnen;
das Ziel der ersten 14 Tage ist Lernen (Klickpreis, Suchbegriffe, Landeseiten-Absprung), nicht Rendite.

### D5. Voraussetzungen (Stand GEMESSEN)
1. **Conversion-Tracking: NICHT belegt.** Kein AW-Tag/gtag im Theme (0 Treffer in 426 Dateien). Ob «Google & YouTube» ein App-Pixel setzt, ist per API
   nicht lesbar → Betreiber prüft Einstellungen → Kunden-Events; wenn leer: Google-Ads-Conversion über die Google-&-YouTube-App verknüpfen (Klick) oder
   Custom Pixel anlegen. Ohne Conversion-Signal nur manuelle CPC-Search, kein PMax.
2. **Merchant-Feed:** Kanal vorhanden; 21'180 «Over capacity for Shopping ads (CSS program) [CH]» blockiert Shopping-Ads (nicht Free Listings) →
   Shopping erst nach Klärung (Betreiber im Merchant Center). Free Listings laufen (Wächter `google_feedback_wache.py`, Ampel «GOOGLE»).
3. **Impressum/UID:** GEMESSEN 22.09. keine UID, kein Handelsregister-Eintrag (Umsatz < CHF 100'000, Betreiber 14.09. «hat keine»). Google-Ads-
   Werbetreibenden-Verifizierung kann Ausweis/Firmendokumente verlangen — für Einzelunternehmen ohne HR ist das Identitätsnachweis der Person
   (BEHAUPTUNG, Google-Richtlinie nicht im Container abrufbar). Kein Blocker für den Start, aber einplanen.
4. **Landeseiten:** die 8 Gruppen zeigen auf Kollektionen mit ≥ 35 aktiven Produkten und neuen SEO-Titeln; Kollektionen mit 0 aktiven
   (klima-ventilatoren, wm-fussball-2026) dürfen nie Ziel sein.
5. **Rechtliches im Anzeigentext:** keine «Blitzversand»-Aussage für CJ-Ware (Lehre 23.09.), keine Rabattcodes ohne Messung, Preise in CHF.

### D6. Messgrössen der ersten 14 Tage
- Google Ads: Impressionen, Klicks, CPC (echt), CTR je Anzeigengruppe; Suchbegriff-Bericht → Negativliste nachziehen (wöchentlich).
- Shopify (ShopifyQL, `referrer_name='google'` + UTM `utm_medium=cpc`): Sitzungen, Warenkorb, Checkout, Bestellungen je Landeseite.
- Landeseiten-Qualität: Absprung/Sitzungsdauer je Kollektion (Clarity-Aufzeichnungen), «Produkt ohne CH-Versandoption» = 0 (Wächter).
- Abbruchkriterium: nach 14 Tagen 0 Warenkorb bei > 200 Klicks in einer Gruppe → Gruppe pausieren, Landeseite prüfen, nicht Budget erhöhen.
- Erfolgskriterium: ≥ 1 Bestellung aus Ads bei Kosten < Warenwert der Bestellung → Budget der Gruppe verdoppeln, nichts anderes anfassen.

## E. Betreiber-Klicks (nummeriert) und was autonom läuft

**Betreiber-Klicks (nur du kannst das):**
1. Google Ads: Konto/Zahlungsmittel anlegen, Budget CHF 10/20/30 freigeben, Kampagne nach D2 starten (Kampagnenskizze liegt hier; ich starte nichts).
2. Shopify → Einstellungen → Kunden-Events: prüfen, ob ein Google-Pixel/GA4 gesetzt ist; falls nicht, Google-&-YouTube-App → Conversion-Tracking verknüpfen.
3. Google Merchant Center: die CSS-«Over capacity»-Meldung (21'180) klären (Shopping-Ads-Kontingent), Free Listings bleiben.
4. Google Search Console für luxestyle.ch anbinden (Verifizierung über DNS/Meta-Tag) — dann kann ich Positionen und Klicks je Keyword MESSEN
   statt Suggest-Ränge zu deuten. Grösster Hebel für den nächsten Plan.
5. Entscheid Sortiment: Vakuumierer, Adventskalender, Weihnachtsdeko, LED-Lichterketten, Haaröl importieren (nur mit CH-Versandoption, ohne
   CN-Netzstecker-Falle) — oder diese Keywords bewusst liegen lassen.
6. Entscheid: Kollektion `moissanit-schmuck` von MANUAL (5 aktiv) auf Regel `TITLE CONTAINS Moissanit` (95 aktiv) umstellen — ändert die Seite sichtbar.
7. Dry Bag 20L und Rizinusöl-Wickel-Set (Google-Landeseiten Nr. 1 und 4, heute DRAFT mit 301 auf ein Ersatzprodukt) — nur wenn der Lieferant
   die Originale wieder liefern kann, lohnt eine Rückholung; sonst bleibt der Redirect (kein Klick nötig).

**Autonom (läuft oder ist eingebaut):**
- 12 SEO-Titel/-Beschreibungen sind live (C1), rückgelesen, im Ledger. Der Wächter für Kollektionstexte prüft sie weiter (Sie/Eszett/Marken/CH-Versprechen).
- Ratgeber-Themen C2 werden Stück für Stück geschrieben (Phantom-Preis-/Produkt-Fallen beachtet) — je Runde 1–2, keine Massenproduktion.
- Google-Feedback-Wächter (täglich), Klingen-Wächter (täglich), CH-Versand-Wächter — halten die Landeseiten bewerbbar.
- Ernte-Rohdaten und Cluster liegen im Scratchpad (`keywordplan/*.json`, 1.26 MB) und werden mit dem nächsten Plan neu gezogen (Suggest ist gratis).

## F. Quellen + Marken-Legende

- **GEMESSEN:** ShopifyQL via `mcp__Shopify__run-analytics-query` (sessions 90/30 T, Landeseiten, Länder, Quellen); Admin GraphQL 2026-01 per Python
  (`productsCount` mit `limit:null` + `precision`, `collections`/`collectionByHandle`, `publishedOnPublication` Online Store 301970915713, `theme.files`,
  `publications`, `webPixel`); Google-Suggest via WebFetch (`suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=ch&q=…`, 607 Aufrufe);
  search.ch via WebFetch (24 Keywords, 240 Treffer); Kollektions-SEO-Schreiben + Rücklesen `automation/kollektionstexte_nachbessern.py` 23:34 UTC.
- **QUELLE:** Semrush domain_rank (Rang, 536 Keywords, Traffic-Schätzung 0 — keine API-Einheiten für Volumen/CPC); Google-Suggest-Reihenfolge (Nachfrage-
  Hinweis, keine Zahl); search.ch-Treffer (Index-Bias: keine Marktplätze, luxestyle nicht im Index); Startseiten-Versprechen der Mitbewerber (mypet.ch
  Gratis ab CHF 75, tierswiss ab CHF 80, tier-welt ohne Schwelle, bestseller-shop 30 Tage + CH-Lager).
- **BEHAUPTUNG:** CPC-Bandbreite CHF 0.40–2.50 (D4); Google-Ads-Verifizierung für Einzelunternehmen (D5.3); US/CN-Sitzungen = Bots (A).
- **Werkzeug-Fallen dieser Runde:** `productsCount` mit `collection_id:X tag:y` liefert 0 (Kombination wird nicht ausgewertet), `tag:a AND tag:b` funktioniert
  (Kanarienvogel `tag:pluesch AND tag:zzznix` = 0); `title:*x*` zählt tokenweise (Leinenhemd ∩ hemd = 0) — Kollektionsregeln `TITLE CONTAINS` sind echte
  Substrings; `publishedOnCurrentPublication` braucht eine App-Publikation (NOT_FOUND) → `publishedOnPublication(publicationId:…)`; das Schreib-Skript
  begrenzt SEO-Titel auf 65 Zeichen (nicht 70).
- Rohdaten: `/tmp/claude-0/…/scratchpad/keywordplan/` — nachfrage.json, ernte.json, konkurrenz.json, kompakt3.json, koll_alle.json (520 Kollektionen mit
  aktiven Zählern), titel_counts.json, rang_lookup.json, seo_plan.json. Scratchpad überlebt keinen Container-Neustart — die Aussagen stehen hier.
