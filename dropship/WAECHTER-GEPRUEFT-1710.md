# Die acht Shopify-Wächter zum ersten Mal wirklich laufen lassen — 2026-10-17

Nachdem der Secret-Fix (`dropship/SHOPIFY-AUTH-STILLER-NOOP.md`) die Skripte überhaupt erst
arbeitsfähig gemacht hat, habe ich die Wächter einzeln im DRY-Modus laufen lassen und jeden Befund
gegengeprüft, bevor ich etwas geändert habe. Drei der acht waren defekt, einer war **gefährlich**.

---

## 1. ⚠️ `publish_guard.mjs` hätte Erwachsenen- und Tabakartikel auf alle Social-Kanäle zurückgeschoben

Der Wächter sollte „fehlende Verkaufskanäle nachziehen". Er meldete **250 von 250** Produkten als
„Kanal fehlt". Zwei Messungen haben daraus zwei verschiedene Befunde gemacht:

**a) Falscher Alarm — er zählte Bauteile als Fehler.** Zielkanäle waren „alle Publications ausser
Point of Sale". Gefehlt haben aber ausschliesslich **Inbox** (Shopifys Chat-App, keine
Verkaufsfläche) und **Luxe Style Headless** (Headless-Storefront, nicht der Live-Shop).
Nach der Korrektur: **75 von 250**.

**b) Der gefährliche Teil.** Ich habe nachgesehen, *welche* Produkte auf TikTok, Facebook/Instagram,
Pinterest und in der Shop-App fehlen — und ihre Tags gelesen:

| Produkt (Beispiel) | Tags | fehlt auf |
|---|---|---|
| Sommerkleid ärmellos | `niedrig-bewertet-nicht-bewerben` | TikTok, FB/IG, Pinterest |
| Date-Night-Brettspiel | `18plus`, `adult-nicht-bewerben` | TikTok, FB/IG, Pinterest |
| LED-Laser-Scheinwerfer | `compliance-pruefen`, `nicht-bewerben` | TikTok, FB/IG, Pinterest |
| Mesh-Minikleid | `adult-nicht-bewerben`, `gmc-adult-pull` | TikTok, FB/IG, Pinterest |
| Lederriemen mit Kette | `harness-google-raus-2026-08-21` | TikTok, FB/IG, Pinterest |
| 20 Aschenbecher / Shisha-Zubehör | `18plus`, `raucher-rueckhol-0809` | Shop-App |

**Diese Lücken sind Absicht.** Ein `LIVE=1`-Lauf hätte Erwachsenen-, 18-plus-, Tabak- und schwach
bewertete Artikel auf alle Social-Kanäle und in die Shop-App zurückgeschoben — die Compliance-Arbeit
früherer Sitzungen rückgängig gemacht, mit einer Kanal-Sperre als möglichem Preis.

**Behoben:** `automation/lib/kanal_sperren.mjs` + Test (18 Fälle, echte Tag-Sätze aus dem Katalog).
Produkte mit Sperrtag bekommen **nur den Onlineshop** nachgezogen — dort auffindbar zu sein ist
Verkauf, nicht Werbung. Dazu `PQUERY`, damit man den Wächter auf eine Teilmenge richten kann.

**Beide Richtungen gegengeprüft:**
- `PQUERY="status:active AND tag:adult-nicht-bewerben"` → 18 gescannt, **0 würden publiziert**,
  18 Sperren respektiert.
- `PQUERY="status:active AND tag:fortura" INCLUDE_GOOGLE=1` → **30 von 30** erkannt. Die Sperre
  macht den Wächter also sicher, nicht nutzlos.

**Google ist jetzt opt-in (`INCLUDE_GOOGLE=1`).** **1888 aktive Produkte** sind nicht auf
„Google & YouTube" publiziert — überwiegend der Fortura-Kostümimport vom 23.07. Keines trägt den
alten Marken-Tag (`tag:marke` → 0 aktive Produkte), die Lücke ist also kein dokumentierter Entscheid.
Aber ~1900 Artikel auf einmal in den Merchant-Center-Feed zu schieben ist eine Entscheidung mit
Aussenwirkung, und der Grund der ~60-%-Metafeld-Ausschlüsse ist weiter unbekannt
(`dropship/GOOGLE-SHOPPING-AUSSCHLUSS.md`). **→ Entscheid beim User.**

---

## 2. 🔍 Zwei 404-Wächter haben nie hingesehen: `menu(handle:)` gibt es nicht

`link_guard.mjs` und `hero_image_guard.mjs` fragten beide
`menu(handle: $h){ items … }` ab. Die Admin-API kennt kein `menu(handle:)` — sie verlangt
`menu(id:)`. Beide liefen also **immer** in denselben GraphQL-Fehler, zählten **0 Menü-Einträge**
und haben das Hauptmenü **nie geprüft**. Der Fehler stand brav im Report-Feld `menuError` — gelesen
hat ihn niemand, weil die Skripte in dieser Umgebung ohnehin nie bis dahin kamen.

**Behoben** mit `menus(first:5, query:"handle:main-menu")`. Jetzt: **190 Menü-Einträge,
164 Collection-Ziele** geprüft.

- **`link_guard`: 0 kaputte, 0 unpublizierte Ziele.** Bestätigt die Handmessung vom 04.10. — nur
  prüft es jetzt ein Wächter statt einmal ein Mensch.
- **`hero_image_guard`: 42 der 164 Menü-Collections hatten kein Titelbild** (25,6 %), alle mit
  Produkten. Darunter `adventskalender`, `midikleider`, `abendkleider`, `winterschuhe`, `woks`,
  `babykleidung`, `hundebetten`, `weihnachtspullover`. **LIVE gesetzt** (Titelbild des ersten
  Produkts, Alt-Text = Collection-Titel). Gegenprobe vorher/nachher an Stichproben + voller
  Nachlauf: **42 → 0**.

---

## 3. 🐌 Alle acht Wächter gaben bei der ersten Drosselung auf

Alle acht hatten denselben `gql()`-Block **ohne jede Wiederholung**. Ein `SCAN=3000`-Lauf des
`alt_text_guard` brach nach wenigen Seiten mit `{"message":"Throttled"}` ab und schrieb
**keinen einzigen** Alt-Text — Shopifys Punkte-Eimer füllt sich laufend wieder auf, kurz warten
hätte genügt.

**Behoben:** `automation/lib/shopify_gql.mjs` (wachsende Pausen bei `Throttled`, HTTP 429, 5xx und
Netzfehlern) + Test mit gefälschtem `fetch`. **Wichtigster Test ist die Gegenprobe:** ein ECHTER
Fehler (`Field 'menu' is missing required arguments`) fliegt **sofort** und wird nicht wiederholt —
sonst verschwindet ein falsches Feld in einer Warteschleife. Danach lief `SCAN=600` glatt durch.

- **`alt_text_guard`: 526 Bilder ohne Alt-Text gesetzt** (SEO + Barrierefreiheit) — 7 in den
  zuletzt geänderten 600, **513 in den zuletzt geänderten 3000**, dazu 6 in den ältesten Scheiben.
  Dafür hat der Wächter `PQUERY`, `SORT` und `REVERSE=0` bekommen: der `SCAN`-Deckel liegt bei 3000,
  der Katalog ist grösser — ohne Scheiben bleibt der Rest unerreichbar.
  **Nachgeprüft (DRY): 0 offen** in den letzten 3000, in den 1200 ältesten aktiven und in den
  1200 ältesten Fortura-Produkten. Stichprobe vorher: die älteren Produkte waren schon zu
  **99 %** versorgt — die Lücke sass fast vollständig im neuen Teil des Katalogs.

---

## 4. Was sauber war

- **`discount_guard`:** WELCOME10 ist `ACTIVE` bis 2027-12-31 — keine Verlängerung nötig.
- **`rating_guard`:** 0 schwach bewertete Produkte in Werbeflächen (die bekannten tragen schon
  `niedrig-bewertet-nicht-bewerben`).
- **`price_guard`:** 0 Produkte mit Preis 0, 0 mit falschem Vergleichspreis.
- **`hero_image_guard`:** 0 leere Collections ohne Produkt.

## 5. 🕓 `site-health.mjs` hielt eine Drosselung für einen kaputten Shop

Es wertete **jeden** Status ≠ 200 als Problem — und bei 404 publizierte es die Collection
automatisch und schickte einen Telegram-Alarm. **HTTP 429 ist nicht 404**: das ist die Lehre vom
04.10., die an einem einzigen Tag dreimal zugeschlagen hat (dreimal hätte ich gesunde Seiten für tot
erklärt). Eine Drosselung des Rand-Caches sah damit wie ein kaputter Shop aus — mit einer unnötigen
Änderung am Shop als Folge.

**Behoben:** `automation/lib/url_status.mjs` + Test (8 Fälle). Bei 429, 5xx und Netzfehlern wird mit
wachsender Pause nachgefasst; bleibt es dabei, lautet das Ergebnis **„nicht messbar"** statt
„Befund" — kein Alarm, kein Auto-Publish. **Gegenprobe:** ein echter **404 gilt sofort** und wird
nicht verschleppt (ein Wächter, der echte Fehler wegwartet, ist genauso falsch).
Dazu `DRY=1`: nur messen, nichts publizieren, nichts senden.

**Lauf danach:** alle 7 geprüften Seiten 200, keine Theme-Platzhalter, kein fremder Admin-Link.

## 6. ⏳ `conversion_radar.mjs` wurde nie fertig — und misst jetzt

Der Radar paginiert mit `while(true)` über **alle** aktiven `cj-real`-Produkte. Das sind über
12 000 Stück = 240+ Seiten mit verschachtelten Medien, plus Drossel-Pausen. **Gemessen: der Lauf
endete nach 15 Minuten im Abbruch, ohne eine einzige Zeile Bericht.** Ein Werkzeug, das nicht fertig
wird, liefert nichts.

**Behoben:** `SCAN`-Deckel (Standard 3000) + `FORTSCHRITT=1`. Erreicht der Lauf den Deckel, steht im
Bericht ausdrücklich **„Teilmessung"** — eine Teilmessung, die ankommt und sich als solche zu
erkennen gibt, ist mehr wert als eine Vollmessung, die niemand zu sehen bekommt.

**Erster Lauf (1500 Produkte, `automation/autopilot/CONVERSION-RADAR.md`):**

| Leck | Anzahl |
|---|---|
| ohne Reviews/Sterne | **1489 (99 %)** |
| unter 4★ | 0 |
| FAILED-Bilder | **0** |
| ohne SEO-Titel | **1373 (91,5 %)** |

Die 99 % ohne Sterne sind der grösste Conversion-Hebel des Shops — und beim Rizinusöl-Versuch heute
hat sich gezeigt, dass CJ für manche Produkte **gar keine** Kommentare hat. Der nächste ehrliche
Schritt ist also nicht „den Importer laufen lassen", sondern erst **messen, für wie viele der 1489
CJ überhaupt Bewertungen hat** — sonst hält man eine leere Quelle für einen vollen Eimer.

## 7. Noch nicht geprüft

`image-audit.mjs` braucht Gemini-Vision — die Credits des Users sind aufgebraucht (HTTP 402).
`cross_sell.mjs` schreibt in Produktbeschreibungen; noch nicht angesehen.
