---
name: shopify-publizieren
description: Immer wenn im Shopify-Shop LuxeStyle (luxestyle.ch / au3j0y-hq.myshopify.com) ein Produkt oder eine Collection angelegt, publiziert, verlinkt oder ins Menü gehängt wird - oder wenn ein Admin-API-Token gebraucht wird, eine Ressource "existiert nicht", ein Menü-Link 404 liefert oder ein Bild FAILED ist. Enthält die vier teuer gelernten Publish-Fallen und den Client-Credentials-Weg zum Token.
---

# Shopify LuxeStyle — anlegen und publizieren ohne die vier Fallen

Shop: **LuxeStyle**, `luxestyle.ch`, Backend `au3j0y-hq.myshopify.com`.
Für Live-Arbeit die `mcp__…__*`-Shopify-Werkzeuge direkt nutzen.

## Falle 1 — Produkt-IDs niemals raten

Die ID zum Publizieren **immer aus der Antwort von `create-product` nehmen**. Eine geratene oder
aus einer Liste abgeleitete ID führt zu „Ressource existiert nicht".

```
mutation Publish($pubs:[PublicationInput!]!){
  publishablePublish(id:"gid://shopify/Product/<ECHTE_ID_AUS_DER_ANTWORT>", input:$pubs){
    userErrors{message}
  }
}
```

## Falle 2 — Collections werden NICHT automatisch publiziert

Per API mit `collectionCreate` angelegte Collections sind **nicht** im Onlineshop sichtbar. Die
Menü-Links liefen deshalb live auf **404** (vom User per Screenshot gemeldet). Nach jedem
`collectionCreate` **sofort `publishablePublish`** in alle Kanäle — genau wie bei Produkten.

## Falle 3 — Bild-URLs vor dem Anlegen prüfen

CJ-Bild-URLs unter `quick/product/…` sind teilweise **404**. Jede URL vorher per HTTP-Statuscode
prüfen (200 erwartet), und **nach** dem Anlegen den Media-Status auf `READY` kontrollieren.

## Falle 4 — Tags müssen zu den Smart-Collection-Regeln passen

Die Smart-Collections filtern über Tags, und die Regel ist nicht der Collection-Name:
„💎 Damen-Schmuck" braucht `schmuck` **plus** `damen` — **nicht** `damen-schmuck`.
„Sonnenbrillen" braucht `sonnenbrille`. Wer den Namen tippt, landet in keiner Collection.

## Falle 5 — `sortOrder` macht aus dem Schaufenster eine Importliste

`geschenke-unter-50-franken`, die Collection **aus der jeder nachprüfbare Verkauf kam**, stand
auf `CREATED_DESC` bei 63 145 Produkten. Die Kundensicht zeigte damit **sechs Hundeartikel am
Stück** unter den ersten zwölf Kacheln — nichts als der letzte Import.

Noch bitterer: die Schwester `bestseller-unter-50` stand die ganze Zeit auf `BEST_SELLING`,
**leitet aber per 301 auf die schlecht sortierte um**. Die gute Sortierung war vorhanden und
unerreichbar.

```graphql
mutation { collectionUpdate(input: {id: "gid://shopify/Collection/…", sortOrder: BEST_SELLING})
  { collection { title sortOrder } userErrors { field message } } }
```

**Regel: bei jeder Collection die `sortOrder` prüfen.** `CREATED_DESC` ist fast nie richtig.
`BEST_SELLING` verbessert sich mit jedem Kauf von selbst, ohne dass jemand eine Liste pflegt.
Nachher **an der echten Seite** gegenmessen, nicht an der API — sie liefert auch DRAFT-Produkte,
die der Laden ausblendet.

## Theme veröffentlichen: der MCP kann es nicht, die CLI schon

Schreibzugriff auf das **aktive** Theme ist durch die Sicherheitsregel des Shopify-Zugangs
gesperrt, `themePublish` ebenfalls. Das heisst **nicht**, dass nur ein Mensch es kann:

```bash
export SHOPIFY_CLI_THEME_TOKEN=shptka_…        # App „Theme Access", Scope write_themes
export SHOPIFY_FLAG_STORE=au3j0y-hq.myshopify.com
shopify theme list --json
shopify theme pull --live --nodelete            # Sicherung zuerst
shopify theme push --theme <id> --only templates/index.json
shopify theme publish --theme <id> --force
```

`theme publish` veröffentlicht **keinen lokalen Code** — es promoviert nur ein bereits
gepushtes Theme. `--allow-live` bleibt bewusst ungenutzt: in die Kopie pushen, dann publish.
Gemessen: die CLI ist nicht installiert, aber `@shopify/cli` (4.8.0) ist aus dem Container
erreichbar. **Es fehlt allein das Token, das der User einmal erzeugt.**

## Video an ein Produkt hängen — ohne Theme-Zugriff

`stagedUploadsCreate` → Datei per `PUT` auf die erhaltene URL → Medium über **`productUpdate`**
mit der `resourceUrl` anhängen. `productCreateMedia` ist gültig, aber **veraltet**.
⚠️ Nur anhängen, wenn belegt ist, **welches Video zu welchem Produkt gehört** — ein Video am
falschen Produkt ist schlimmer als keins.

## Die 6 Publication-IDs

| Kanal | Publication |
|---|---|
| Onlineshop | `gid://shopify/Publication/301970915713` |
| Shop | `gid://shopify/Publication/301971014017` |
| TikTok | `gid://shopify/Publication/302032716161` |
| Meta | `gid://shopify/Publication/302566834561` |
| Google | `gid://shopify/Publication/302872297857` |
| Pinterest | `gid://shopify/Publication/302994456961` |

## Verifizieren (Pflicht, sonst nicht gemeldet)

```
graphql_query node(id:"…"){ onlineStoreUrl resourcePublicationsCount{count}
                            media(first:6){edges{node{status}}} }
```
Erwartet: `count == 6`, alle Media `READY`, `onlineStoreUrl` gesetzt. Der Zähler
`published_status:published` hinkt der Indexierung ein paar Sekunden nach — die einzelne
`node`-Abfrage ist die Wahrheit.

## Admin-API-Token — den `shpat_`-Knopf gibt es nicht mehr

Shopify hat „Token anzeigen" **abgeschafft**. Custom-Apps liefern nur noch **Client-ID** und
**Schlüssel** (`shpss_…`). Das Token holt man per Client-Credentials-Grant, es gilt rund 24 h und
wird deshalb **pro Lauf neu** geholt:

```
POST https://au3j0y-hq.myshopify.com/admin/oauth/access_token
{ "client_id": "…", "client_secret": "…", "grant_type": "client_credentials" }
→ { "access_token": "…" }
```

`automation/reel-analytics.mjs` macht das bereits vor (Secrets `SHOPIFY_CLIENT_ID`,
`SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP`). **Nicht nach einem `shpat_` suchen.**

## Vor jedem Anlegen

- **`dropship/CJ-IMPORT-LOG.md` lesen** — sonst Doppel-Import.
- Duplikat-Schutz: `products(query:"sku:<SKU>")` abfragen.
- Voller Ablauf und Historie: `dropship/AUTONOMER-MODUS.md` (§9 Master-Lessons, §10 Kunden gewinnen).

## Zwei Dinge bewusst NICHT ändern

- **Kundenkonto-Menü** `account.luxestyle.com.co` ist von Shopify selbst konfiguriert.
  `luxestyle.ch/account` leitet per 302 dorthin; `account.luxestyle.ch` hat kein DNS.
  Ein Umbiegen auf `.ch` zerstört den Login.
- **Niemals Fake-Reviews.** Reviews nur echt und ≥ 4★ importieren. Reviews über
  Namens-Ähnlichkeit zuordnen ist irreführend und verboten (UWG).
