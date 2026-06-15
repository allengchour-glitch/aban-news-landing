# 🏭 Lieferanten-Anmeldung — LuxeStyle (Schritt für Schritt)

> Ziel: Die Marktlücken **Activewear + Loungewear** schliessen (CJ kann das nicht) + Premium-/Breiten-Sortiment
> ergänzen. Empfohlener schlanker Stack: **Printful** (POD, gratis) + **EIN** EU-Fertigware-Lieferant
> (BrandsGateway *oder* BigBuy) + **CJ behalten** (Schmuck/Schuhe/Sommer-Fashion).
> ⚠️ **Schweiz:** CH ist nicht in der EU-Zollunion → auch EU-Lager-Sendungen können Import-MwSt./Zoll/Handling
> auslösen. Lieferanten mit DDP-Versand in die CH bevorzugen. (Schweizer MwSt.-Logik: magicheidi.ch/dropshipping)

---

## 1) PRINTFUL — Activewear & Loungewear per Print-on-Demand (GRATIS, sofort)
**Warum zuerst:** kein Abo, kein Lager, eigenes Branding, EU-Fulfillment (Lettland/Spanien) → schnell in die CH.
Druckt Leggings, Sport-BHs, Jogger, Hoodies/Loungewear-Sets, All-Over-Print.

**Anmelden / Verbinden:**
1. Konto: https://www.printful.com → „Sign up" (gratis, kein Abo).
2. Shopify-App: https://apps.shopify.com/printful → „Install" → mit dem LuxeStyle-Store verbinden.
   (Falls Printful schon mit dem Shop verbunden ist — für die „Selbst gestalten"-POD-Produkte — einfach dasselbe Konto nutzen.)
3. In Printful: **Store Settings → Branding** (eigenes Logo/Label, Packing-Slip) setzen.
4. **Fertig.** Danach baue ICH die Activewear/Loungewear-Linie über die bestehende POD-Pipeline (Mockups + DE-Titel + Collections).
**Kosten:** pro verkauftem Stück (Basispreis + ~$3.99 Versand), **kein Monatsabo**.
**Alternative POD (auch gratis, CH-nahe Produktion):** **Gelato** — https://www.gelato.com → Shopify-App. AOP-Leggings XS–3XL.

---

## 2) BRANDSGATEWAY — Premium/Designer-Fashion (EU, 1–3 Tage) — passt zum „Luxe"-Image
**Warum:** echte Markenware, EU-Lager, schnelle Lieferung, hohe Marge. Hat auch Loungewear/Bademode/Lingerie.

**Anmelden / Verbinden:**
1. Plan wählen: https://brandsgateway.com/pricing → Plattform **Shopify** auswählen.
2. Shopify-App installieren: https://apps.shopify.com/brandsgateway-app → „Install" → mit LuxeStyle verbinden.
3. Plan zahlen, dann **BrandsGateway-Katalog importieren** (Auto-Sync für Bestand/Preise).
**Kosten:** **€279/Monat** (monatlich) bzw. **€147/Monat** im Jahresabo (bis −50 %). → Erst ab gewissem Volumen rentabel.
**Tipp:** Erst Sortiment/Marken prüfen, ob es zum CH-Markt passt, bevor du den Plan zahlst.

---

## 3) BIGBUY — breites EU-Sortiment (Spanien, 2–7 Tage, 100k+ SKUs)  ⭐ empfohlene neue Quelle
**Warum:** sehr breit (Fashion/Schmuck/Taschen/Uhren/Home/Tech), günstig, EU-weit schnell, DDP-fähig, 8 Sprachen (inkl. DE/FR).

**Anmelden — Schritt für Schritt (nur du; ~10 Min):**
1. **Konto anlegen:** https://www.bigbuy.eu/en/subscription/checkout → registrieren (B2B; Firmen-/ggf. UID-Angaben).
2. **Pack Ecommerce abonnieren** (nötig für Dropshipping **und** API-Zugang).
3. **API-Key anfordern:** im BigBuy-Backend bzw. per Kontaktformular (Anleitung: https://www.bigbuy.eu/academy/en/how-do-you-obtain-api-access/).
   → Den Key mir als Umgebungs-Variable **`BIGBUY_API_KEY`** geben (NICHT ins Repo/Chat).
4. (Optional, Zero-Code-Weg statt API) Shopify-Connector im BigBuy-Backend einrichten (BigBuy Academy) — synchronisiert
   Katalog/Preise/Bestand/Bestellungen automatisch; bis 2 Stores. Versandkosten-App: https://apps.shopify.com/bigbuy-synchronization-app

**Kosten (Stand 2026):**
- **Einmalig €90** Registrierung · **Pack Ecommerce €69/Mt** (monatlich) → **€51.75/Mt** im Jahresabo · Pack Marketplace €99/Mt.
- **API + Connector im Pack enthalten** (Standalone-Connector sonst €129–149). **Kein Gratis-Test.** Pro Bestellung: Einkaufspreis + Versand.
- **Minimal-Einstieg: ~€159 im 1. Monat, danach €69/Mt.**

**Cashflow:** Kunde zahlt im Shop zuerst → danach zahlst du BigBuy (aus dem Kundengeld). Kein Vorab-Lager. Fixkosten (€90+€69/Mt) trägst nur du.

**API:** RESTful/JSON · Prod `https://api.bigbuy.eu` · **Sandbox `https://api.sandbox.bigbuy.eu`** (zum Testen, Test-Orders werden auto-storniert).

### 🤖 Autonomer Import-Connector (gebaut, startklar): `automation/bigbuy_import.mjs`
- Holt **nur TOP-Produkte** (lieferbar/Stock≥5, on-brand: Schmuck/Taschen/Uhren/Sonnenbrillen/Damenmode), DE-Titel (Gemini),
  CHF-Marge, SEO, Tags `bigbuy`+`dropship`, legt sie in Shopify an + publiziert in alle 6 Kanäle, Smart-Collections, idempotent (`dropship/bigbuy_done.txt`).
- **No-op ohne `BIGBUY_API_KEY`.** **DRY ist Default** (nur Vorschau) → mit `LIVE=1` wird wirklich angelegt.
- **Erster Lauf (sobald Key da):** `BIGBUY_API_KEY=… BIGBUY_ENV=sandbox SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… node automation/bigbuy_import.mjs`
  → zeigt gefundene TOP-Kandidaten. Dabei die mit `⚠️BB-VERIFY` markierten Endpoint-/Feldnamen einmal gegen die echte Sandbox-Antwort
  abgleichen (BigBuy-Antwortstruktur bestätigen), dann `LIVE=1` für Echtbetrieb.

---

## Empfohlene Reihenfolge (Risiko/Kosten-optimiert)
1. **Printful zuerst** (gratis) → Activewear/Loungewear-Lücke sofort schliessen. Ich baue die Linie.
2. **Dann EINEN** Fertigware-Lieferanten testen: **BrandsGateway** (Premium-Marge) **oder** **BigBuy** (breit/günstig) — nicht beide gleichzeitig.
3. **CJ behalten** für Schmuck/Schuhe/Sommer-Fashion (läuft, kostet nichts extra).

## Was ich nach deiner Anmeldung mache
- **Printful/Gelato:** Activewear/Loungewear-Produkte anlegen (Leggings, Sport-BH, Jogger, Hoodie-Set), DE-Titel/SEO,
  Collections „Activewear" + „Loungewear" erstellen + ins Menü, Mockups.
- **BrandsGateway/BigBuy:** nach dem Connect Import-Regeln/Preis-Markup/DE-Titel/Collections konfigurieren, Dubletten vermeiden.

**Quellen:** brandsgateway.com/pricing · apps.shopify.com/brandsgateway-app · bigbuy.eu/en/dropshipping-shopify.html ·
bigbuy.eu/academy/en/shopify-connector-complete-guide · printful.com · gelato.com · magicheidi.ch/dropshipping

---

## 🔑 GELATO per API bauen (für die nächste Session — Key-Handling)
- **Key NIEMALS im Repo/Chat.** Er muss als **Umgebungs-Variable `GELATO_API_KEY`** der Claude-Code-Web-Umgebung gesetzt sein
  (NICHT als GitHub-Actions-Secret — das ist write-only und für eine Session nicht lesbar).
- ⚠️ **Eine laufende Session zieht neu gesetzte Env-Vars NICHT nach** → nach dem Setzen eine **NEUE Session** starten.
- **Discovery (erst Verbindung prüfen):** `node automation/gelato_discover.mjs`
  → listet Stores (`storeId`), Produkte und Templates. Bestätigt definitiv, ob der Shopify-Store in Gelato verbunden ist.
- **Bauen:** Gelato ist Print-on-Demand → erst **Template(s) im Gelato-Dashboard** anlegen (Design auf Leggings/Sport-BH/Jogger/
  Hoodie), dann per `POST /v1/stores/{storeId}/products:create-from-template` Produkte erzeugen (pushen automatisch nach Shopify).
- **Danach Shopify-Feinschliff** (diese/MCP-Session): DE-Titel/SEO, Collections „Activewear"+„Loungewear", Menü-Links, Cross-Sell.
- API-Basis: `https://ecommerce.gelatoapis.com/v1` · Auth-Header `X-API-KEY` · erreichbar aus der Session (getestet: 401 ohne Key).

### 🔍 Gelato-Befunde (2026-06-14, live per API geprüft)
- **Verbindung steht:** Store „LuxeStyle" (Shopify), `storeId = f4af9557-9182-4125-abe9-5de0ca4c0661`. 10 Produkte vorhanden =
  **Schweizer Poster** (Print Material). Keine Apparel-Produkte, **keine Templates** (Templates-Endpoint 404).
- **⚠️ Gelato-Apparel-Katalog hat KEINE Leggings/Sport-BHs und KEINEN Allover-Print.** Verfügbar (GarmentSubcategory):
  pullover, crewneck, zip(-Hoodie), short-sleeve/v-neck/longsleeve/ringer/raglan/oversized (T-Shirts), **tank-top**, **cropped**,
  **jogger-pants**, beanie/dad-hat/snapback/bucket/trucker, apron. → Druck = DTG/DTF/Stick (Brust/Rücken/Ärmel), NICHT Allover.
- **➡️ Konsequenz:** **Gelato = Swiss-Design-LOUNGEWEAR/Casual** (Hoodie/Jogger/Sweatshirt/Tee/Tank mit Brustdruck). **Echte
  ACTIVEWEAR-Leggings/Sport-BH gibt's bei Gelato NICHT → dafür PRINTFUL** (hat Leggings/Sport-BH/Allover-Print). „beides" =
  Gelato (Loungewear) + Printful (Leggings/Activewear).
- **Autonomie-Grenze:** API-Zugang + Produkt-Anlegen + Shopify-Feinschliff = autonom machbar. ABER: jedes POD-Stück braucht ein
  **Design + visuelle Druckflächen-Platzierung** → das macht man zuverlässig im **Gelato-Dashboard-Editor** (~5 Min/Produkt).
  Rohes „create-product" per API ist ohne Doku (403) fehleranfällig + Risiko hässlicher Produkte im Premium-Shop.
- **Empfohlene Arbeitsteilung:** User/Dashboard legt **1 Loungewear-Vorlage** an (Hoodie+Jogger, Swiss-Design) → dann **skaliert
  die Session autonom** (weitere Varianten/Designs) + macht den **Shopify-Feinschliff** (DE-Titel/SEO/Collection „Loungewear"/Menü).
