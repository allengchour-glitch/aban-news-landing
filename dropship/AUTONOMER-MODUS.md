# 🤖 Autonomer Modus — CJ-Dropship-Import (LuxeStyle CH)

> **Zweck:** Dieses Runbook macht den CJ-Produktimport vollständig selbstständig ausführbar —
> ohne Rückfragen. Eine neue Session liest das, prüft den Stand und füllt den Shop weiter.
> Der User hat ausdrücklich gesagt: **„mach es autonom, ich muss nicht ‚weiter' sagen."**
> Also: einfach loslegen, sauber arbeiten, committen, pushen, kurz Stand melden.

---

## 0. Auftrag in einem Satz
Den Shopify-Shop **LuxeStyle CH** (luxestyle.ch) langsam & sauber mit echten,
fulfillment-fähigen CJ-Dropshipping-Produkten füllen — pro Durchlauf 1–4 Stück, alle live in
6 Verkaufskanälen, deutsche Copy, verifizierte Bilder.

## 1. Credentials (NUR aus der Umgebung — niemals im Repo!)
- `CJ_EMAIL` und `CJ_API_KEY` kommen als **Environment-Variablen** (vom User gesetzt/gepastet).
  NIE in eine Repo-Datei schreiben (der Key wurde 2026-05-31 schon einmal wegen genau so eines
  Leaks rotiert). Wenn der Key in der Session fehlt: User bitten, ihn zu pasten oder als
  Env-Secret zu hinterlegen (`CJ_EMAIL`, `CJ_API_KEY`).
- Beide Skripte (`cj_enrich.mjs`, `cj_import.mjs`) lesen ausschließlich `process.env`.
- Auth-Token wird in `/tmp/cj_token.json` gecacht (14 Tage gültig). Bei AUTH-Fehler: Datei
  löschen, neu generieren lassen.
- Node: `/opt/node22/bin/node`. Shopify-Zugriff über die `mcp__…__*`-Tools (kein CLI).

## 2. Shopify-Konstanten
- **Publication-IDs (alle 6 Kanäle):**
  - Onlineshop `gid://shopify/Publication/301970915713`
  - Shop `gid://shopify/Publication/301971014017`
  - TikTok `gid://shopify/Publication/302032716161`
  - Meta `gid://shopify/Publication/302566834561`
  - Google `gid://shopify/Publication/302872297857`
  - Pinterest `gid://shopify/Publication/302994456961`
- Smart-Collection „🆕 Neu eingetroffen" greift automatisch über Tag `neu`.

## 3. Der Ablauf pro Durchlauf (Schritt für Schritt)

### Schritt A — Stand prüfen (immer zuerst)
```
graphql_query: { productsCount(query:"tag:cj-real status:active"){count} }
```
Und Duplikat-Schutz vorbereiten: vor jedem Anlegen `products(query:"sku:<SKU>")` prüfen.

### Schritt B — Keywords setzen
In `dropship/cj_enrich.mjs` die `KEYWORDS`-Liste auf **8–10 NEUE** Begriffe setzen.
**Schon benutzte NICHT wiederholen** — vollständige Liste unten in §6.
Form: `{ kw: 'such begriff', must: ['pflicht','tokens'], take: 1 }`.

### Schritt C — Import laufen lassen
```
CJ_EMAIL="$CJ_EMAIL" CJ_API_KEY="$CJ_API_KEY" /opt/node22/bin/node dropship/cj_enrich.mjs
```
(Credentials kommen aus der Umgebung — siehe §1. Nie den Key in Dateien/Commits schreiben.)
→ schreibt `/tmp/cj_enriched.json` (Name, echte variantSku, Kost USD, Bilder, Kategorie).
Skript hat QPS-Backoff (CJ erlaubt 1 req/sek) — nicht parallel feuern.

### Schritt D — Kandidaten kuratieren (Filter, §5)
Off-theme / Risiko aussortieren. Pro Durchlauf 1–4 echte Keeper behalten.

### Schritt E — Bilder verifizieren (PFLICHT, nicht überspringen!)
Für jeden Keeper die Bild-URLs per `curl -s -o /dev/null -w "%{http_code}"` auf **HTTP 200** prüfen.
- ✅ funktionieren: `cf.cjdropshipping.com/<uuid>.jpg`, `oss-cf.cjdropshipping.com/product/…`
- ⚠️ teils 404: `cf.cjdropshipping.com/quick/product/…` — einzeln prüfen, nur 200er nehmen.
Nur verifizierte URLs in `create-product` geben (sonst landen FAILED-Medien im Shop).

### Schritt F — Produkt anlegen (`create-product`)
- `title`: deutscher LuxeStyle-Titel (klar, Nutzen, keine Hype-Wörter, ein „–" als Trenner ok)
- `descriptionHtml`: 1 Fettsatz Intro + `<ul>` mit 5 Bullet-Vorteilen (Emoji-Prefix) +
  `<em>Versand: ca. 7–14 Tage.</em>`
- `price`: **CJ-Kost-USD × 2,7–3,0**, gerundet auf `.90` (günstige Artikel ruhig höher ×, aber
  marktrealistisch CHF). FX USD→CHF ≈ 0,88 ist eingepreist.
- `variants[0].sku`: **echte CJ-`variantSku`** (Fulfillment-Binding!)
- `status: ACTIVE`, `options:["Title"]`, `vendor:"LuxeStyle"`
- `tags`: immer `["neu","cj-real","dropship"]` + 2–3 thematische (z.B. `sommer-2026`,`kueche`,`gadget`)
- `images`: 4–6 verifizierte URLs mit deutschem `altText`

### Schritt G — Publizieren (⚠️ DIE WICHTIGSTE FALLE)
**Nutze die ECHTE Produkt-ID aus der `create-product`-Antwort.** IDs zu raten/vorab eintippen
schlägt IMMER fehl („Ressource existiert nicht"). Workflow:
1. `create-product` aufrufen → ID aus der Antwort lesen (`gid://shopify/Product/…`)
2. DANN `graphql_mutation publishablePublish` mit genau dieser ID + allen 6 Publication-IDs.
```
mutation Publish($pubs:[PublicationInput!]!){
  publishablePublish(id:"gid://shopify/Product/<ECHTE_ID>", input:$pubs){userErrors{message}}
}
```
Mehrere in einer Mutation mit Aliassen `a:`, `b:`, … bündeln ist ok — aber nur mit echten IDs.

### Schritt H — Verifizieren
```
graphql_query node(id:"…"){ onlineStoreUrl resourcePublicationsCount{count} media(first:6){edges{node{status}}} }
```
Erwartet: `resourcePublicationsCount.count == 6`, alle Media `READY`, `onlineStoreUrl` gesetzt.
Hinweis: `published_status:published`-Counter hinkt der Indexierung ein paar Sekunden nach — nicht
beunruhigen, einzelne `node`-Abfrage ist die Wahrheit.

### Schritt I — Speichern
`dropship/CJ-IMPORT-LOG.md` aktualisieren (Tabelle: Produkt, VK, Kost, SKU + Aussortiertes).
Dann:
```
git add dropship/ ; git commit -m "CJ Charge N: +X Produkte live → Y gesamt …"
git push -u origin claude/dropship-lade-memory-SrAs5   # bei Netzfehler bis 4× Backoff 2/4/8/16s
```
**Immer auf Branch `claude/dropship-lade-memory-SrAs5`** (nie main). PR #5 existiert bereits.

## 4. Pricing-Spickzettel (CJ-USD → VK CHF, auf .90)
| Kost $ | VK CHF |
|---|---|
| 0–3 | 14.90–16.90 |
| 3–6 | 16.90–24.90 |
| 6–10 | 24.90–34.90 |
| 10–15 | 34.90–44.90 |
| 15–25 | 44.90–69.90 |
| >25 | Kost ×2,6–2,8, auf .90 |

## 5. Filterregeln — was NICHT angelegt wird
- **Markenaufdrucke** (Disney/Marvel/Frozen/Spider-Man …) → Fälschungs-/Markenrisiko
- **Kindersicherheits-Artikel** (Baby-Schwimmring, Schwimmhilfen) → Haftung
- **EK > ~$60 ODER > ~5 kg** (Möbel, Etagenbetten, Grilltische, Tower-Fans) → Dropship-untauglich
- **Kleidung mit vielen Grössen** (T-Shirts, Jeans, Schuhe, Mules) → Retouren-/Größenchaos
- **Schmuck-Falschtreffer** (Ringe, Ohrringe, Anhänger), wenn nicht gezielt gesucht
- **Tabak/Shisha/Hookah**, Waffen-nahe Artikel
- **Nur 1 Produktbild** → zu schwach für Hero
- **Duplikate** (gleiche/ähnliche SKU schon live — §3 Schritt A prüfen)
- **off-theme** (Industrie-Werkzeug, Sägeblätter, Auto-Ersatzteile)

## 6. Bereits verwendete Keywords (NICHT wiederholen)
electric water gun · neck fan portable · led face mask · cooling towel · picnic mat waterproof ·
mini handheld fan · portable blender · solar garden light · beach towel microfiber · swimming
goggles · inflatable lounger · sun umbrella beach · dog cooling mat · water bottle sport · beach
toy bucket · outdoor hammock · pool float · bbq grill tool · sunglasses polarized · car phone
holder · led strip light · yoga mat · resistance band · phone tripod · jump rope · travel makeup
bag · reusable straw · sun hat · kitchen storage organizer · water bottle insulated · backpack
waterproof · sunscreen umbrella · travel pillow · dog toy chew · kids beach sand · fan usb desk ·
phone case · water gun toy · cooler bag · magnetic phone charger · pet hair remover · silicone
baking mat · travel organizer cube · led night light · kitchen scale · umbrella windproof ·
electric lighter · foot massager · cable organizer · vegetable chopper · cat scratching toy ·
neck massager · reusable food storage · garden watering can · electric toothbrush · foldable
laundry basket · beach bag tote · mosquito repellent lamp · sponge holder · handheld milk frother ·
shower head · pet grooming glove · car vacuum · foldable step stool · wireless charger · callus
remover · magnetic eyelashes · collapsible water bottle · door draft stopper · hair straightener ·
travel jewelry case · silicone pot holder · dog leash · phone camera lens · electric egg beater ·
makeup brush set · wall mount shelf · usb humidifier · fitness tracker · electric wine opener ·
posture corrector · silicone dish brush · travel toothbrush holder · led strip rgb · phone screen
magnifier · pet water fountain · heated eye mask · desk mat · car phone mount · thermos coffee cup ·
hand warmer · storage organizer drawer · cutting board bamboo · travel blanket · led reading light

**Ideen für künftige Keywords (noch frei):** wireless keyboard · gaming mouse · door mat ·
shower curtain · spice rack · garlic press · pizza cutter · wine aerator · plant pot self watering ·
bike light set · ski goggles · winter gloves touchscreen · thermal socks · scarf · beanie ·
phone sanitizer · keyboard cleaner · monitor stand · laptop sleeve · passport holder · luggage tag ·
packing cubes · shoe deodorizer · lint roller · jewelry cleaner · nail drill · gua sha · jade
roller · scalp massager · electric blanket · heating pad · aromatherapy candle · incense holder.

## 6b. 🔁 Echter Auto-Loop (GitHub Action — läuft ohne Session)
`dropship/cj_autopilot.mjs` + `.github/workflows/cj-autopilot.yml` sourcen **täglich 06:00 UTC**
autonom CJ-Produkte und legen sie als **DRAFT** an (Tag `autopilot-needs-copy`): echte SKU,
Preis, HTTP-200-verifizierte Bilder, Hartfilter, Dedupe. Nutzt die **Shopify Admin GraphQL API
direkt** (kein MCP/keine Session nötig). Reines Node, keine npm-Deps.

**Damit es scharf ist, müssen einmalig GitHub-Repo-Secrets gesetzt werden**
(Settings → Secrets and variables → Actions):
- `CJ_EMAIL`, `CJ_API_KEY` — CJ Developer API
- `SHOPIFY_SHOP` — z.B. `luxestyle.myshopify.com`
- `SHOPIFY_ADMIN_TOKEN` — Custom-App Admin-Token (`shpat_…`), Scope `write_products`
Ohne Secrets = sauberer No-Op (nichts passiert). Manuell testen: Actions → „CJ Autopilot" →
Run workflow.

**Arbeitsteilung (bewusst):** Der Cron macht die fehleranfällige Fleißarbeit (sourcen, Bilder
prüfen, Draft anlegen). Eine **Claude-Session veredelt die Drafts**: deutsche Verkaufs-Copy,
Preis-Feinschliff, `status:ACTIVE`, dann `publishablePublish` in alle 6 Kanäle. So geht nie ein
schlecht getextetes/kaputtes Produkt live. → **Claude-Routine pro Session:**
`products(query:"tag:autopilot-needs-copy")` holen, je Draft Copy schreiben, ACTIVE+publish,
Tag `autopilot-needs-copy` entfernen, Log updaten, commit/push.

## 6c. Hero-Strategie (Qualität vor Menge)
Mehr Produkte ≠ mehr Umsatz. Ab ~50 Produkten lohnt sich Hero-Ausbau mehr als Breite:
- **3–5 Hero-Produkte** mit voller Verkaufs-Copy (Hook · Benefits · Lieferumfang · Trust-Box
  🇨🇭/Zahlung/Versand/Rückgabe · Mini-FAQ), SEO-Title+Description, Tags `hero`+`bestseller`.
- Smart-Collection **„⭐ Bestseller"** (`/collections/bestseller`, Regel Tag=`bestseller`) bündelt sie.
- Aktuelle Heroes: Home-Projektor HY300, Elektro-Wasserpistole XL, Rugged Smartwatch X5.
- **⚠️ Fake-SKU-Falle:** Autopilot/Tests könnten Produkte mit erfundener SKU erzeugen → NICHT
  erfüllbar. Prüfen: `products(query:"tag:cj-real")` auf SKUs, die nicht mit `CJ`/`CJ-` beginnen →
  DRAFT/löschen. Echte CJ-SKU = Pflicht zum Live-Schalten.
- **⚠️ Lösch-Falle:** Vor `productDelete` IMMER per `products(query:"sku:<SKU>")` prüfen, ob
  wirklich ein ZWEITES Exemplar existiert. „Sieht aus wie Dup" reicht nicht — sonst löscht man das
  einzige Exemplar (ist mir 2026-05-31 passiert, sofort neu angelegt). Nur verifizierte Dups löschen.
- **⚠️ Nur Verifiziertes dokumentieren:** Keine Produkte/IDs ins Log schreiben, die nicht per Query
  bestätigt sind (sonst Halluzinations-Einträge).

## 7. Bekannte Eigenheiten der Umgebung
- **Scheduler-Tools (`CronCreate`/`ScheduleWakeup`) sind NICHT aktiviert** → ein echter,
  selbstlaufender Cron-Loop über Stunden ist hier nicht möglich. Autonomie heißt: in der
  laufenden Session Charge für Charge durchziehen, ohne nachzufragen. Falls eine Umgebung mit
  aktivem Scheduler vorliegt, `/loop` mit 30m-Intervall verwenden.
- **Desktop/Browser-Zugriff bringt nichts** — der CJ-Workflow ist komplett headless via API.
- Container ist ephemer → nur committete/gepushte Arbeit überlebt.

## 8. Aktueller Stand (bei jedem Lauf hier fortschreiben)
- **2026-05-31:** ~54 cj-real Produkte ACTIVE & live in 6 Kanälen + 6 Hero-Produkte mit
  Premium-Copy. CJ-Katalog für SAUBERE Neutreffer weitgehend ausgeschöpft (20 Keyword-Suchen
  → ~1 Treffer). MagSafe-Halter auf DRAFT (Bilder 404). **Fokus ab jetzt: nicht mehr Breite,
  sondern Kunden/Conversion** (siehe §10).
- Marketing fertig vorbereitet: `dropship/ads/hero-ads-2026.md` (Texte), `dropship/ADS.md`
  (Videos), `dropship/KAMPAGNEN-PLAYBOOK.md` (Launch-Anleitung).
- Details & vollständige Produktliste: `dropship/CJ-IMPORT-LOG.md`.

## 9. 🧠 MASTER-LESSONS (alles teuer Gelernte — IMMER beachten)
1. **Publish-Falle (häufigster Fehler):** Produkt-ID zum Publizieren NUR aus der `create-product`-
   Antwort nehmen. IDs raten/vorab eintippen → „Ressource existiert nicht". Erst anlegen, ID lesen,
   DANN `publishablePublish`.
2. **Bild-Falle:** Bild-URLs VOR dem Anlegen per HTTP-200 prüfen. `cf.cjdropshipping.com/<uuid>` &
   `oss-cf.cjdropshipping.com/...` gehen; `cf…/quick/product/…` teils 404. Nach Anlage Media-Status
   prüfen — FAILED per `productDeleteMedia` + `productCreateMedia` ersetzen. Lieber DRAFT als
   bildloses Live-Produkt.
3. **`000`-Timeout ≠ 404:** curl liefert manchmal `000` (Timeout) statt `200` → mit längerem
   Timeout ERNEUT prüfen, valide Bilder nicht vorschnell verwerfen.
4. **Abgeschnittene URLs:** Beim Bündeln von URLs aus dem Terminal können sie abgeschnitten werden
   → immer volle URL aus `/tmp/cj_enriched.json`, danach Media-Status prüfen.
5. **Lösch-Falle:** Vor `productDelete` IMMER per `products(query:"sku:<SKU>")` prüfen, ob wirklich
   ein ZWEITES Exemplar existiert. „Sieht aus wie Dup" reicht nicht (einmal einziges Exemplar
   gelöscht, musste neu anlegen).
6. **Fake-SKU-Falle:** Nur Produkte mit echter CJ-SKU (`CJ…`) live schalten — sonst nicht erfüllbar.
7. **Nur Verifiziertes dokumentieren:** Keine Produkte/IDs/Zahlen ins Log schreiben, die nicht per
   Query bestätigt sind (sonst Halluzinations-Einträge — ist passiert).
8. **QPS-Limit CJ:** max 1 Req/Sek → `sleep` zwischen Calls, Backoff bei Code 1600200.
9. **Markenrecht/Sicherheit aussortieren:** Disney/Marvel/Frozen-Aufdrucke, Baby-Schwimmhilfen
   (Haftung), Tabak/Shisha, Möbel >$60/>5kg, Kleidung mit vielen Grössen.
10. **Scheduler (`CronCreate`/`ScheduleWakeup`) hier NICHT aktiv** → kein Session-Loop möglich.
    Echte Hintergrund-Automation läuft NUR über die GitHub Action (§6b).
11. **Mehr Produkte ≠ mehr Umsatz.** Ab ~50 Produkten lohnt Hero-Ausbau + Marketing mehr als Breite.

## 10. 🎯 KUNDEN GEWINNEN (das eigentliche Ziel — was geht & was nicht)
**Ehrliche Grenze:** „Kunden kaufen" kann eine Claude-Session NICHT vollautomatisch auslösen.
Es braucht Reichweite. Bezahlte Werbung (TikTok/Meta) erfordert Werbekonto-Login + Budget +
Zahlungsmittel — das liegt beim User, nicht in den Tools. Ich kann ALLES bis dahin vorbereiten,
aber den „Kampagne AN + Budget"-Knopf drückt der User.

**Was eine Session AUTONOM für Conversion tun kann (ohne Geld/Login):**
- Hero-Produkte mit Premium-Copy ausbauen (Hook · Benefits · Lieferumfang · Trust-Box · FAQ · SEO).
- Collections sinnvoll pflegen (`bestseller`-Tag → „🔥 Hero-Favoriten").
- QA: alle Live-Produkte auf FAILED-Bilder prüfen, Defekte auf DRAFT.
- Ad-Texte/Hooks/Launch-Pläne schreiben (`dropship/ads/`).
- SEO-Title/Description je Produkt setzen.
- Rabattcode `WELCOME10` (aktiv) in Copy einbauen.

**3 Dinge, die NUR der User kann (je ~1 Klick, mobil):**
1. AGB-Domain-Fix `aban-192.myshopify.com` → `luxestyle.ch` (mir fehlt Scope `write_legal_policies`
   — am 2026-05-31 erneut per API versucht, hart abgelehnt. Definitiv nur manuell machbar).
2. TikTok-/Meta-Pixel installieren (App im Shopify-Admin) — Pflicht, sonst optimiert Werbung nicht.
3. Erste Kampagne live schalten + Budget (Werbekonto). User wählte **TikTok zuerst, kleines Budget** →
   fertiges Setup in `dropship/TIKTOK-START-WASSERPISTOLE.md` (CHF 20/Tag, Wasserpistole CHF 59.90).

**Routine für künftige autonome Sessions (Conversion-First):**
1. Stand prüfen (`tag:cj-real status:active`), Autopilot-Drafts veredeln (`tag:autopilot-needs-copy`
   → Copy + ACTIVE + publish).
2. QA-Scan auf FAILED-Bilder.
3. 1–2 weitere Top-Produkte zu Heroes ausbauen (falls noch nicht).
4. Reviews-Hebel: prüfen ob eine Gratis-Review-App (z.B. Judge.me) installiert ist; falls nicht,
   dem User empfehlen (grösster fehlender Conversion-Hebel).
5. Committen, pushen, Stand melden. Nur bei echtem Bedarf nachfragen.
