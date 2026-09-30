# Automatisierung — was neu ist, und was davon hier wirklich trägt

**Datum:** 2026-09-30 · **Auftrag:** „neuste sachen lernen für automation"
**Markierung nach Skill `recherchieren`:** GEMESSEN / QUELLE / BEHAUPTUNG

---

## Der Hauptfund, und er stand die ganze Zeit im eigenen Shop

**GEMESSEN:** `appInstallations` an LuxeStyle listet 30 Apps — darunter
**`{"title":"Flow","handle":"flow","developerName":"Shopify"}`**.

**Shopify Flow ist seit unbekannter Zeit installiert, und kein einziger Stand-Block im
Gedächtnis erwähnt es.** Seit Juni steht dort stattdessen die Klage, Automatisierung sei hier
nicht möglich: erst „GitHub Actions ist gesperrt", dann „Scheduler ist nicht aktiv", dann
„es fehlen `SHOPIFY_CLIENT_ID`/`_SECRET`/`SHOPIFY_SHOP`".

**Warum Flow all dem überlegen ist — und das ist kein Werbesatz, sondern folgt aus der
Architektur:**

| | GitHub Actions | Routine (`create_trigger`) | `preis_korrektur.mjs` | **Shopify Flow** |
|---|---|---|---|---|
| läuft ohne Sitzung | ja | ja | nein | **ja** |
| braucht Zugangsdaten von uns | ja | – | **ja** | **nein** |
| hat Shop-Zugriff | nur mit Secrets | **nein** (gemessen) | ja | **ja, nativ** |
| schon eingerichtet | ja | ja | ja | **ja** |
| kostet | Fair-Use-Risiko | – | – | **nichts** |

Flow läuft **im Shop selbst**. Es braucht keinen Container, keine Sitzung, keinen Token und
keinen Cron. Genau die Lücke, um die das Gedächtnis seit vier Monaten herumschreibt.

**GEMESSEN:** Tarif **Basic**, Währung CHF. Flow ist auf Basic verfügbar.

---

## Die Grenze, ebenfalls gemessen — ich kann den Workflow nicht selbst bauen

**GEMESSEN:** Von über 400 Mutationen der Admin-API heissen genau zwei nach Flow:

* `flowGenerateSignature`
* `flowTriggerReceive`

**Es gibt keine Mutation, die einen Workflow anlegt.** Workflows entstehen ausschliesslich in
der Flow-Oberfläche. **Das ist damit ein User-Klick — aber ein einmaliger, der danach für
immer läuft.**

**Und `flowTriggerReceive` ist der interessante Teil:** baut der User einen Workflow mit einem
**eigenen Auslöser**, kann ich diesen Auslöser von hier aus feuern. **Einmal klicken, dauerhaft
fernsteuerbar.**

---

## Der Workflow, der heute CHF 23.11 gerettet hätte

Bestellung **#1019** ist seit dem 27.09. bezahlt und nicht versandt — Halloween-Ware, nach dem
31.10. wertlos. Gefunden hat das `tools/offenes_geld.mjs`, **aber nur weil diese Sitzung lief.**
Im Juli hat genau dieses Muster **CHF 869.62 Rückerstattungen** gekostet.

**Als Flow gebaut, meldet es sich von selbst — für immer, ohne mich:**

```
Auslöser:  Order created
Bedingung: Order · Fulfillment status  =  UNFULFILLED
Aktion:    Wait  →  2 Tage
Bedingung: Order · Fulfillment status  =  UNFULFILLED   (erneut prüfen!)
Aktion:    Send internal email  →  192aban192@gmail.com
           Betreff: "Bezahlt, nicht versandt: {{order.name}}"
```

⚠️ **Die zweite Bedingung nach dem Warten ist der Punkt.** Ohne sie kommt die Mail auch für
Bestellungen, die inzwischen versandt wurden — und eine Meldung, die meistens falsch ist,
schaltet man nach einer Woche ab. Dieselbe Lehre wie bei jedem Messgerät hier: ein Befund muss
etwas sein, das wirklich zutrifft.

**Zwei weitere Workflows, die sich aus gemessenen Fehlern dieses Shops ergeben:**

2. **Produkt ohne Einkaufspreis** → `Product created` · `Inventory item · unit cost is not set`
   → intern melden. Grund: die Preisregel überspringt solche Produkte (gemessen), sie fallen
   also still durch.
3. **Lieferantentext im Variantennamen** → `Product created` · Variantentitel enthält `-` plus
   Grossbuchstabenfolge → Produkt taggen `pruefen-variante`. Grund: 9 Defekte auf luxestyle.ch
   stammen genau daher (gemessen mit `katalog_audit`).

---

## Was NICHT trägt — ehrlich, damit niemand es nochmal probiert

* **Firecrawl für Instagram:** GEMESSEN — „we do not support this site". Gegenprobe: eine echte
  Produktseite kommt mit 85 915 Zeichen. Der PC-Weg bleibt der einzige.
* **Routinen mit Shop-Zugriff:** GEMESSEN — `connectors` wird von dieser Organisation abgelehnt,
  die gefeuerte Sitzung hat keine `mcp__Shopify__*`-Tools.
* **`watch_url` als dauerhafter Empfänger:** die Beschreibung sagt selbst, die Überwachung endet
  mit der Sitzung. Für Dauerbetrieb also untauglich.
* **Graph of Thought:** verbunden, aber diese Runde hat keinen gemessenen Nutzen gefunden.

---

## Ein Weg, der plausibel ist und NICHT geprüft wurde

**BEHAUPTUNG, ungeprüft:** `webhookSubscriptionCreate` existiert in der API, und das Repo
betreibt bereits Cloudflare-Pages-Funktionen unter `functions/` — also dauerhafte Endpunkte.
Ein Shopify-Webhook auf eine eigene Edge-Funktion wäre damit eine Automatisierung, die ohne
Sitzung **und** ohne Flow-Oberfläche läuft.

**Bewusst nicht gebaut.** Flow löst dieselben Fälle ohne eine Zeile Code und ohne neue
Fehlerquelle. Ein Webhook lohnt erst, wenn etwas gebraucht wird, das Flow nicht kann.
