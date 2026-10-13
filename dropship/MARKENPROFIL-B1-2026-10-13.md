# Markenprofil B1: Vorbereitung für den Betreiber-Klick (13.10.2026, 21:15 UTC)

Auftrag: Richter «mehr Käufer», Abschnitt B1. Der Betreiber trägt im Admin Logo, quadratisches Logo, Titelbild, Farben, Slogan und Kurzbeschreibung ein und ersetzt die Startseiten-Meta-Beschreibung. Diese Sitzung hat alles vorbereitet, was ohne den Betreiber geht. Ausgeführt hat sie im Profil nichts.

## 1. Ist-Stand (GEMESSEN 13.10. 21:00 UTC, Storefront-API 2026-01 `shop{description brand{…}}`)

| Feld | Stand | Bewertung |
|---|---|---|
| `brand.slogan` | `null` | leer |
| `brand.shortDescription` | «LuxeStyle CH — dein Schweizer Premium-Shop für Mode, Beauty, Tech, Fitness, Home & Lifestyle. ✨ Kuratierte Produkte — jedes Stück persönlich ausgewähl» | **mitten im Wort abgeschnitten**; «jedes Stück persönlich ausgewählt» stimmt bei ~51'000 Artikeln nicht |
| `brand.logo` | `null` | leer |
| `brand.squareLogo` | `null` | leer |
| `brand.coverImage` | `null` | leer |
| `brand.colors` | primary/secondary nur `null` | leer |
| `shop.description` (= Startseiten-Meta-Beschreibung) | «… mit schnellem Versand in die Schweiz **und nach Deutschland**.» | **falsch**: geliefert wird nur nach CH + LI. Das Theme ersetzt den Satz im HTML (`snippets/meta-tags.liquid`), aber Agenten und die Shop-App lesen das Feld über die API ungefiltert |

Messgerät: `python3 tools/markenprofil_pruefen.py` → heute **0/7** (Exit 1). Gegenprobe: Mit simuliertem Soll-Zustand zeigt es 7/7. Bei simuliertem «Deutschland» und einem 256-px-Quadratlogo meldet es genau diese zwei Felder.

## 2. Lässt sich die Marke per API setzen? **NEIN** (GEMESSEN, Schema geprüft)

- Admin-API 2026-01: Der Typ `Shop` hat **kein** Feld `brand`. Die Suche nach Mutationen mit `brand`, `logo` oder `Branding` findet keine. Unter `shop…` gibt es nur `shopLocale*`, `shopPolicyUpdate`, `shopResourceFeedbackCreate` und `shopifyPaymentsPayout…`.
- Für `shop.description` gibt es ebenfalls keine Mutation. Das Feld steht nur in Onlineshop → Präferenzen (wie schon am 14.08. in `snippets/meta-tags.liquid` vermerkt).
- Storefront-API: `shop.brand` lässt sich nur **lesen**.
- `checkoutBrandingUpsert` und `checkoutAndAccountsConfigurationUpdate` gestalten nur die Kasse, nicht das Markenprofil, und laufen nur auf Shopify Plus.
- **Folge:** Nur der Betreiber kann klicken. Diese Sitzung hat nichts ausgeführt, weil es nichts auszuführen gibt.

## 3. Dateien (liegen in Shopify → Inhalte → Dateien)

Vorgaben laut Shopify-Hilfe (help.shopify.com/en/manual/promoting-marketing/managing-brand-assets, gelesen 13.10.):
- Logo: PNG/JPEG, mindestens 512 px breit.
- Quadratisches Logo: PNG/JPEG, 512×512 empfohlen, wird eventuell rund zugeschnitten.
- Titelbild: PNG/JPEG, mindestens 1920×1080 empfohlen.
- Pro Logo-Typ ist nur eine Datei möglich.

| Feld im Admin | Dateiname in «Dateien» | Masse / Format | Vorgabe | Herkunft |
|---|---|---|---|---|
| **Logo** | `luxestyle-ch-logo.png` (MediaImage 69652492353921) | 732×150 PNG, transparent | ✅ ≥ 512 breit | schon vorhanden; dasselbe Bild wie das Header-Logo im Theme (`settings.logo`). ⚠️ Nicht die Kopie `luxestyle-ch-logo_58da….png` nehmen: Sie ist eine Generic-Datei ohne Bildmasse und dient nur als og:image |
| **Quadratisches Logo** | `luxestyle-quadrat-logo-1024.png` (MediaImage 77506116911495) | 1024×1024 PNG | ✅ ≥ 512×512, quadratisch | **neu erzeugt** aus dem bestehenden Favicon `luxestyle-favicon.png` (nur 256×256, zu klein): goldenes «L» #C6A15B auf #181614, gleiche Lage und Grösse. Die Fläche ist voll, damit auch der Rundschnitt wie das Favicon aussieht. Neu gerendert mit DejaVu Serif Bold und auf den Original-Rahmen gestaucht. Deckung mit dem Original nach dem Verkleinern auf 256 px: IoU **0,996** (GEMESSEN). Kein KI-Bild, kein neues Element |
| **Titelbild** | `luxestyle-titelbild-1920x1080.jpg` (MediaImage 77506116944263) | 1920×1080 JPEG | ✅ = Empfehlung | **neu zugeschnitten** aus dem früheren Startseiten-Hero `luxestyle-hero-editorial-2400x1000.jpg` (Vase mit Kiefernzweig, Bücher, Tasse; kein Text, keine Werbeaussage). 16:9-Ausschnitt x 300–2078 × 0–1000, dann ×1,08 auf 1920×1080 (Lanczos). ⚠️ Die Herkunft des Fotos (Stock oder KI) ist im Repo nicht dokumentiert. Es lief schon im Juli als Startseiten-Bild |

CDN-Adressen (aus der Upload-Antwort, HTTP 200 geprüft):
- https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-quadrat-logo-1024.png?v=1791925750
- https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-titelbild-1920x1080.jpg?v=1791925754
- Logo (bestehend): https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-ch-logo.png?v=1781123787

Lokale Kopien: `dropship/marke/luxestyle-quadrat-logo-1024.png`, `dropship/marke/luxestyle-titelbild-1920x1080.jpg`.

Verworfene Kandidaten:
- `LuxeStyle_Profilbild.png` (1080²): Aufschrift «PREMIUM ACCESSOIRES», das ist veraltet. Der Rahmen würde im Rundschnitt abgeschnitten.
- `luxestyle-profil.jpg` (1080²): taugt technisch. Die Aufschrift «SCHWEIZER SHOP» wird bei kleiner Darstellung unlesbar, und es passt nicht zum Favicon.
- `LuxeStyle_FB_Titelbild.png` (1640×624, zu klein): enthält «-10% mit Code WELCOME10». Dieser Code ist laut Kassen-Prüfung umstritten.
- `luxestyle-hero-editorial-v6.jpg`: veraltete Zusagen («2'600 Artikel ab Schweizer Lager, in 1–2 Tagen»).
- `luxestyle-hero-clean-v10.jpg`: nur 945×875.

## 4. Farben (aus der Live-`config/settings_data.json`, nur gelesen, Stand 13.10. 20:14 UTC)

| Feld im Admin | Hex | Kontrastfarbe | Kontrast (WCAG) | Quelle im Theme |
|---|---|---|---|---|
| **Primär** | `#2C2C2C` (Anthrazit) | `#FAF7F2` | 13,07 : 1 | scheme-1 `foreground_heading` + Haupt-Button; Logo-Schrift «LuxeStyle» |
| **Sekundär 1** | `#8B7355` (Bronze) | `#FFFFFF` | 4,49 : 1 (nur für grosse Schrift) | scheme-1 `primary` (Links/Akzente); Logo-Teil «.ch» |
| **Sekundär 2** | `#D4B896` (Sand) | `#2C2C2C` | 7,38 : 1 | scheme-2 Hintergrund, scheme-5 Button |

Zur Info (nicht eintragen): Shop-Hintergrund `#FAF7F2` (Creme), Gold-Button einer Zusatz-Palette `#C9A84C`, Favicon/Quadratlogo `#181614` + `#C6A15B`. Laut Shopify-Hilfe soll das Standard-Logo aus den Primärfarben bestehen. Unser Logo ist `#2C2C2C` + `#8B7355`, darum ist Anthrazit primär.

## 5. Texte (Fakten am 13.10. gegen die Richtlinien geprüft)

| Feld | Text | Zeichen | Limit |
|---|---|---|---|
| **Slogan** | Online-Shop aus Belp für die Schweiz & Liechtenstein | 52 | 80 |
| **Kurzbeschreibung** | LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke. Versand in die Schweiz und nach Liechtenstein, TWINT & Klarna, 30 Tage Rückgabe. | 134 | 150 |
| **Startseiten-Meta-Beschreibung** (Onlineshop → Präferenzen) | LuxeStyle aus Belp: Mode, Beauty, Wohnen & Geschenke online. Versand in die Schweiz und nach Liechtenstein, TWINT, Klarna & Karte, 30 Tage Rückgabe. | 148 | (Google zeigt ~155) |

Kein Text enthält «Deutschland». Belege:
- Belp: Impressum/AGB «Hühnerhubelstrasse 37, 3123 Belp».
- CH + LI: Versand- und Rückgaberichtlinie.
- TWINT, Klarna, Karte: AGB «Kreditkarte …, TWINT, PayPal, Klarna, Apple Pay, Google Pay».
- 30 Tage: Rückgaberichtlinie «freiwillige 30-Tage-Rückgabe».

## 6. Klickweg am Handy (≈ 10 Min.)

**A. Markenprofil**
1. Im Handy-Browser (nicht in der Shopify-App) `admin.shopify.com/settings/branding` öffnen; Shopify leitet zum Shop weiter. Geht das nicht: Menü ☰ → **Einstellungen** → **Allgemein** → Abschnitt **Markenassets** (engl. «Brand assets») → **Verwalten**.
2. **Logos → Standardlogo:** «+» bzw. «Hinzufügen» → **Vorhandene auswählen** → Suche `luxestyle-ch-logo` → die Datei **`luxestyle-ch-logo.png`** wählen (732×150, *ohne* «_58da…» im Namen) → Fertig.
3. **Logos → Quadratisches Logo:** «+» → Suche `luxestyle-quadrat` → **`luxestyle-quadrat-logo-1024.png`** → Fertig.
4. **Titelbild:** «+» → Suche `luxestyle-titelbild` → **`luxestyle-titelbild-1920x1080.jpg`** → **Fertig**.
5. **Farben → Primär:** «+» → Hex `#2C2C2C` eintippen → **Kontrastfarbe** `#FAF7F2`.
6. **Farben → Sekundär:** «+» → `#8B7355`, Kontrastfarbe `#FFFFFF`. Dann nochmals «+» → `#D4B896`, Kontrastfarbe `#2C2C2C`.
7. **Slogan:** «+» → den Slogan aus §5 einfügen.
8. **Kurzbeschreibung** (engl. «Description»): Es steht schon ein abgeschnittener Text drin. Den Stift tippen, **alles löschen**, dann den Text aus §5 einfügen.
9. **Speichern** (oben rechts).
10. Den Abschnitt «Soziale Links» überspringen: Er ist nur im Starter-Tarif aktiv, bei uns kommen die Links aus dem Theme.

**B. Startseiten-Meta-Beschreibung**
11. `admin.shopify.com/store/au3j0y-hq/online_store/preferences` öffnen. Oder: Menü ☰ → **Vertriebskanäle** → **Onlineshop** → **Präferenzen**.
12. Unter **Titel und Meta-Beschreibung** das Feld **Meta-Beschreibung der Startseite** leeren und den Text aus §5 einfügen. Den Titel nicht ändern.
13. **Speichern**.
14. Einen Screenshot der Markenseite schicken.

## 7. Danach (Sitzung)

- `python3 tools/markenprofil_pruefen.py` muss **7/7** zeigen. Zum Vergleich: heute 0/7.
- Dann diese Prüfung an `automation/knowledge_base_fakten.py --wache` anhängen (Zeile `MARKENPROFIL: …`, Werkzeug liefert sie mit `--zeile`). **OFFEN.**
- Einmal die Kasse ansehen (Testkorb, nicht bezahlen). Ob Shopify das Marken-Logo im Kopf der Kasse übernimmt, wenn dort kein eigenes Logo gesetzt ist, ist eine VERMUTUNG und nicht gemessen.
- Danach kann die Ersetzung «nach Deutschland → nach Liechtenstein» in `snippets/meta-tags.liquid` stehen bleiben; sie greift dann ins Leere (laut Kommentar im Snippet). Das Theme rührt diese Sitzung nicht an.

## 8. Nebenwirkungen und Rückweg

- **Theme bleibt gleich (GEMESSEN):** `settings.logo` ist ausdrücklich auf `shopify://shop_images/luxestyle-ch-logo.png` gesetzt. Das Favicon steht als direkter Link in `snippets/meta-tags.liquid`, und `settings.favicon` ist leer. Ein Marken-Logo ersetzt also nichts im Header.
- **Erwartung:** +0 bis 0,05 Käufer pro Woche (VERMUTUNG, Richter). Wirkung höchstens über die Shop-App und KI-Assistenten.
- **Rückweg:** Im Markenprofil die Felder leeren und speichern. Die zwei neuen Dateien unter Inhalte → Dateien löschen (`luxestyle-quadrat-logo-1024.png`, `luxestyle-titelbild-1920x1080.jpg`). Sonst verweist nichts auf sie.

## 9. Was im Repo geändert wurde

- `automation/upload_to_shopify_cdn.mjs`: neuer Schalter `ALS_BILD=1`, der Bilder als MediaImage statt als Generic-Datei anlegt. Grund: Bildwähler im Admin zeigen «vorhandene Bilder», und eine Generic-PNG hat keine Bildmasse. Ohne den Schalter bleibt der Ablauf byte-gleich.
- `tools/markenprofil_pruefen.py`: Messgerät, nur lesend (Storefront-Token `/tmp/sf_token.txt` oder `SHOPIFY_STOREFRONT_TOKEN`).
- `dropship/marke/`: die zwei erzeugten Bilder.
