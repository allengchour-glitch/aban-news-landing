# Direktlink: vom Post direkt zum Produkt

Stand 23.09.2026, Paket «direktlink». **Nichts ist live geschaltet.** Es sind zwei Werkzeuge vorbereitet
und im Trockenlauf geprüft. Dazu kommen die Klickwege für dich (Betreiber).

## 1. Ist-Stand (gemessen 23.09., nur lesend)

| Kanal | Bio-Link heute | Befund |
|---|---|---|
| Instagram @luxestyle.ch | `http://luxestyle.ch` (Startseite, **http**) | Links in Captions sind nicht klickbar. Wer einen Post sieht, landet auf der Startseite und muss das Produkt selbst suchen. Letzte 60 Posts: 45 Bild, 13 Reel, 2 Karussell. 20 davon nennen die Produktadresse nur als Text. |
| TikTok @luxestyle.ch | **keiner** | Im Profil-HTML fehlt `bioLink`. Gegenprobe: Bei nike und gymshark steht `bioLink` im selben HTML. Das Konto ist ein Privatkonto (`commerceUser:false`) mit 553 Followern. **Alle 58 wartenden Reel-Captions enden mit «(Link in Bio)»**. Auf TikTok und YouTube ist das falsch. 3 TikTok-Posts und 1 YouTube-Post tragen die Zeile schon. Veröffentlichte Posts habe ich nicht geändert (Hausregel). |
| Facebook | – | Schon gelöst: `automation/fb_link_kommentar.mjs` setzt den Produktlink als Kommentar (dort ist er klickbar). |
| Pinterest | – | Der Pin selbst ist der Direktlink (`pinLink`). |

**Metricool** (Schlüssel geprüft):
- 0 SmartLinks: `GET /v2/smart-links/links/lite` liefert eine leere Liste. Mit falschem Token kommt 401, der Schlüssel wird also wirklich geprüft.
- 0 Einträge im alten IG-Linkin-Bio-Katalog: `getbiocatalog` und `getbioButtons` sind leer. Gegenprobe mit falschem Token → 401, mit fremder blogid → 403.
- Der Slug `luxestyle` ist frei: `/slugs?value=luxestyle` → 200. Belegte Slugs liefern 400 `SlugAlreadyExists`, gemessen an «instagram» und «metricool».
- Öffentliche Adresse wäre `https://mtr.bio/luxestyle`. Unbekannte Slugs leiten auf die Metricool-Werbeseite um.

**Shopify:** Die Seite `/pages/direkt` gibt es nicht. Die Suche filtert tatsächlich: Positivkontrolle `handle:contact` wurde gefunden, ein erfundener Handle lieferte 0.
Der Rabattcode WELCOME10 aus beiden Bios ist ACTIVE bis 31.12.2027, das Versprechen in der Bio ist also gedeckt.

## 2. Was vorbereitet ist

### `automation/linkinbio_sync.mjs` – die Seite «Direkt zum Produkt»
- Liest die letzten 60 IG-Posts (Graph API).
- Liest dazu die auf TikTok und YouTube veröffentlichten Reels aus `automation/reels_seed.csv`. TikTok bekommt wegen der plattformübergreifenden Sperre eigene Reels. Eine reine IG-Spiegelseite zeigte TikTok-Besuchern also keines ihrer Videos.
- Ordnet jedem Post sein Produkt zu. Die Quellen in dieser Reihenfolge:
  1. Link in der Caption
  2. Bild-Queue
  3. IG-Karussell-Queue
  4. Reel-Queue
  5. Titel «… · CHF»
- Die Titelsuche prüft vorher per Kanarienvogel, dass sie wirklich filtert.
- Kacheln gibt es nur für Produkte, die **ACTIVE und im Onlineshop** sind. So verlinkt die Seite nie auf eine 404.
- **Trockenlauf 23.09.: 26 Kacheln aus 64 Posts.**
  - Alle 10 IG-Posts seit 01.09. sind zugeordnet, bis auf 1 Sammelpost.
  - Alle 4 TikTok- und YouTube-Reels sind zugeordnet.
  - 38 Posts bekommen keine Kachel:
    - 18 wegen Produkt heute DRAFT.
    - 14 alte Juli-Posts ohne jede Zuordnung.
    - 5 alte Juli-Captions ohne exakten Titel.
    - 1 Sammelpost «8 Lieblinge».
- Zwei Ziele sind möglich:
  - **`ZIEL=shopify` (Default, Empfehlung):** Seite `luxestyle.ch/pages/direkt` mit Raster, Produktbildern vom Shopify-CDN (die laufen nicht ab) und drei Knöpfen: Shop, Neu eingetroffen, Gerade im Trend.
    - Die Kachel-Links tragen **keine** utm-Parameter. Interne utm-Links überschreiben die Sitzungsquelle. Die utm steckt deshalb im Bio-Link.
    - Beim Schreiben: `pageCreate` bzw. `pageUpdate`. Die Mutationsformen sind per Introspektion geprüft. Danach liest das Skript die Seite zurück, ob alle Links drin sind.
    - Sind die Links unverändert, schreibt es nichts.
  - **`ZIEL=metricool`:** SmartLink `https://mtr.bio/luxestyle`.
    - Die IG-Bilder werden über `/actions/normalize/image/url` zu Metricool kopiert. IG-Bild-URLs laufen nach etwa 4–5 Tagen ab, gemessen: `oe=` → 28.09.
    - Die Links tragen utm, weil mtr.bio eine fremde Domain ist.
    - Bei einer bestehenden Seite ersetzt das Skript nur die Kacheln. Kopf und Knöpfe bleiben. Die Kachel-ids bleiben erhalten, damit die Klickzahlen nicht verloren gehen.
- Aufrufe:
  - `node automation/linkinbio_sync.mjs` = Trockenlauf. Schreibt den Plan nach `/tmp/linkinbio_plan.json` und die HTML-Vorschau nach `/tmp/linkinbio_vorschau.html`.
  - `SCHARF=1 …` = schreiben. **Dieser Pfad ist nie gelaufen.** Er bricht ab, wenn es weniger als 5 Kacheln gibt.

**Warum ich die eigene Domain empfehle:**
- Kundinnen haben die Kanäle «zu fest KI / Scam» genannt (05.09.). Ein Link auf `luxestyle.ch` mit Shop-Kopf, Shop-Fuss, Rückgabe und TWINT wirkt vertrauenswürdiger als ein Fremd-Link.
- Die Klicks landen mit utm in der Shopify-Analyse.
- Der ganze Schreibweg ist geprüft: Introspektion und gerenderte Vorschau. Beim Metricool-Weg sind die Werte von `provider`/`type` in der API-Beschreibung nicht festgelegt. Die lasse ich deshalb weg.
- Nachteil der eigenen Seite: Die Kacheln zeigen das Produktbild und nicht das Post-Bild.

### `automation/metricool_tiktok_post.mjs` – Direktlink-Felder (Default AUS)
Ohne die Schalter bleibt der Body byte-gleich. Das habe ich am Diff und im Trockenlauf geprüft. Der Autopilot postet also unverändert.

| Schalter | Wirkung |
|---|---|
| `DIREKTLINK_TEXT=1` | TikTok: Die Zeile «🔗 luxestyle.ch/products/… (Link in Bio)» wird zu «🔗 luxestyle.ch/products/…» (live-Handle aus Shopify). YouTube: volle `https://`-Adresse. In Shorts-Beschreibungen ist sie seit 31.08.2023 nicht klickbar, aber lesbar. |
| `DIREKTLINK_STICKER=1` | TikTok: `tiktokData.articleLink = {url: Produkt?utm_source=tiktok…, title: "Zum Produkt"}`. Laut Metricool-OpenAPI (`ScheduledPostTikTokArticleLink`) ist das «an external URL shown as a link sticker **on the video**», also für Videos vorgesehen. **Ob TikTok ihn für unser Privatkonto zeigt, ist unbelegt.** |
| `DIREKTLINK=1` | beides |
| `MC_SMARTLINK_ID=<id>` | hängt `smartLinkData {targetUrl, ids}` an. Das hat erst Sinn, wenn eine Metricool-SmartLink-Seite existiert. Metricool verknüpft SmartLinks im Planer mit Instagram-Posts. Für TikTok und YouTube ist die Wirkung unbelegt. |

Dazu eine Korrektur: `DRY=1` schrieb bisher tote Video-Adressen als `archived-deadurl` in `reels_seed.csv`. Jetzt schreibt DRY nichts mehr (md5 vorher und nachher gleich). DRY zeigt ausserdem den vollen Body an.

## 3. Klickwege für dich (Betreiber)

### Instagram (Handy-App, Konto @luxestyle.ch), ca. 1 Minute
Erst ausführen, wenn die Seite live ist (Schritt 4.1). Bis dahin reicht Punkt 3.
1. Profil → **Profil bearbeiten** → **Links** → den vorhandenen Link «luxestyle.ch» antippen.
2. URL ersetzen durch
   `https://luxestyle.ch/pages/direkt?utm_source=instagram&utm_medium=social&utm_campaign=bio`
   Titel: «Direkt zum Produkt» → **Fertig**.
3. Falls die Seite noch nicht live ist: den Link wenigstens auf **https** stellen:
   `https://luxestyle.ch/?utm_source=instagram&utm_medium=social&utm_campaign=bio`
4. Kontrolle: das eigene Profil öffnen und den Link antippen. Du solltest die Kachelseite sehen.

### TikTok (Handy-App), ca. 2 Minuten
Ein Website-Feld im Profil haben laut TikTok-Hilfe nur Business-Konten, Privatkonten erst ab 1'000 Followern. Bei uns ist das nicht gemessen. @luxestyle.ch ist heute privat und hat 553 Follower.
1. Profil → ☰ oben rechts → **Einstellungen und Datenschutz** → **Konto** → **Zu Business-Konto wechseln**. Kategorie: «Shopping & Einzelhandel» (oder die nächstliegende) → Weiter.
   - Nebenwirkung: Du hast danach nur noch die Commercial Music Library (lizenzfreie Sounds). Unsere Reels bringen ihre eigene Musik mit.
   - Nach dem Wechsel prüft der Autopilot die Metricool-Verbindung beim nächsten Post (`PRUEFEN=1`).
2. Profil → **Profil bearbeiten** → **Website** →
   `https://luxestyle.ch/pages/direkt?utm_source=tiktok&utm_medium=social&utm_campaign=bio` → Speichern.
3. Erscheint das Feld «Website» nicht, sag mir Bescheid. Dann bleibt der Weg über den Sticker (4.4), und die Adresse steht nur als Text.

## 4. Einschalt-Reihenfolge (Hauptagent, nach deinem Ja)
1. `node automation/linkinbio_sync.mjs` → den Plan lesen → `SCHARF=1 node automation/linkinbio_sync.mjs` → Rücklese-Zeile «N von N Links».
   Dann **per WebFetch** `https://luxestyle.ch/pages/direkt` ansehen. Nicht per curl von unserer IP: Die bekommt einen alten Bot-Cache.
2. Autopilot: `SCHARF=1 node automation/linkinbio_sync.mjs` 1× täglich. Das Skript ist idempotent, der Eimer-Nachlauf ist eingebaut, pro Lauf braucht es etwa 5 Shopify-Anfragen.
3. Du setzt die Bio-Links (Abschnitt 3).
4. `DIREKTLINK_TEXT=1` für beide Aufrufe in `social_autopilot.sh`. Das ist sofort unbedenklich, weil sich nur Text ändert, und es beendet das falsche «(Link in Bio)».
5. `DIREKTLINK_STICKER=1` **einmal begleitet**: ein Post, nach der Veröffentlichung `PRUEFEN=1 node automation/metricool_tiktok_post.mjs`, dazu eine Sichtprobe in der TikTok-App.
   - Kein ERROR und Sticker sichtbar → in den Autopilot aufnehmen.
   - Sonst den Grund aus `detailedStatus` hier eintragen.

## 5. Fallen (gelernt beim Messen)
- `GET /v2/smart-links/links` (ohne `/lite`) antwortet `{"data":[]}` **auch ohne Token**. Diese Abfrage misst nichts. Nimm `/lite`.
- Die alten Linkin-Bio-Endpunkte `addcatalogButton`, `editcatalogbutton`, `editcatalogitem` und `updateButtonPosition` sind **GET-Mutationen**. Nie «zum Lesen» aufrufen.
- IG-Bild-URLs (`scontent…`) sind signiert und laufen nach Tagen ab. Speichere sie nie dauerhaft als Bildquelle.
- `/*`-Kommentare: `editcatalog*/` im Kommentartext beendet den Kommentar und ergibt einen SyntaxError. Das hat `node --check` gefunden.
