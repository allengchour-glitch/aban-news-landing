# Gelernt: Shopify + Claude Code, Dropshipping, Profit — 2026-09-13

Auftrag des Users: „lerne du nur und teile dann memory für andere session … im youtube finde
ich so viele sachen über shopify mit claude code, kopiere dropshipping, profit maximieren,
header alles möglich — suche lerne und teile, morgen macht die andere session alles."

Diese Runde hat **nichts am Shop geändert**. Sie sammelt, prüft und ordnet. Jeder Punkt ist
markiert: **GEMESSEN** (hier selbst nachgeprüft), **QUELLE** (fremde Angabe, plausibel, nicht
nachgeprüft) oder **BEHAUPTUNG** (Verkaufsversprechen, ungeprüft).

---

## 1 · Der grösste Fund: der Theme-Weg, der seit gestern blockiert ist, geht doch

**Das Problem von gestern:** die Startseite ist der gemessene Hauptdefekt (17 % HTTP 500 bei
6,91 MB, 17 Produktreihen, jedes Produkt 6× gerendert). `automation/homepage_slim.mjs` ist
fertig und getestet, aber **Schreibzugriff auf das aktive Theme ist durch die Sicherheitsregel
des Shopify-MCP gesperrt**, `themePublish` ebenfalls. Bisher stand im Gedächtnis: „nur der
User kann das, ein Klick".

**Das ist so nicht mehr richtig.** Es gibt einen zweiten Weg, der komplett automatisierbar ist:
die **Shopify CLI mit einem Theme-Access-Token**.

```bash
export SHOPIFY_CLI_THEME_TOKEN=shptka_…        # aus der App "Theme Access"
export SHOPIFY_FLAG_STORE=au3j0y-hq.myshopify.com

shopify theme list --json                       # IDs holen
shopify theme pull  --live --nodelete           # aktives Theme sichern
shopify theme push  --theme <id> --only templates/index.json
shopify theme publish --theme <id> --force      # promoviert ein bereits gepushtes Theme
```

**GEMESSEN in diesem Container:**
- `shopify` ist **nicht** installiert.
- `npm view @shopify/cli version` → **4.8.0**, aus dem Container erreichbar. Node 22 ist da.
  → Die CLI lässt sich also installieren (`npm i -g @shopify/cli`), der Weg ist nicht durch
  die Umgebung blockiert.

**QUELLE (shopify.dev + CLI-Spickzettel):**
- `SHOPIFY_CLI_THEME_TOKEN` ist das Passwort aus der **kostenlosen App „Theme Access"**,
  Scope `write_themes`. Alternativ ein Admin-API-Token.
- `SHOPIFY_FLAG_STORE` ist die Env-Form von `--store`.
- **`theme publish` kann keinen lokalen Code veröffentlichen** — immer erst `push`, dann
  `publish` per ID.
- `--allow-live` schreibt direkt ins aktive Theme; **standardmässig blockiert, und das soll so
  bleiben**. Der saubere Weg ist: in die Kopie pushen, dann publish.
- Scopes, die eine Custom-App dafür bräuchte: `read_themes`, `write_themes`.
- ⚠️ `theme init` klont seit 2026 **Skeleton**, nicht mehr Dawn.

**🟡 Was nur der User kann (einmalig, dann nie wieder):** im Shopify-Admin die App
**Theme Access** installieren, ein Passwort für „Claude" erzeugen und als Secret
`SHOPIFY_CLI_THEME_TOKEN` hinterlegen. **Danach kann jede Session Themes selbst pushen und
veröffentlichen** — die schlanke Startseite, Sticky-ATC, Header, alles. Das ist der einzige
Punkt dieser ganzen Recherche, der wirklich Geld bewegt und heute noch klemmt.

---

## 2 · Shopify AI Toolkit: das offizielle Claude-Code-Plugin

Shopify hat am **9. April 2026** ein offenes AI-Toolkit veröffentlicht: ein MCP-Server plus
Agent-Skills für Claude Code, Cursor und VS Code. Dokumentation und GraphQL-Schema-Zugriff
brauchen **keinen API-Schlüssel**.

**Enthaltene Fähigkeiten (QUELLE):** GraphQL-Admin-API, Theme/Liquid-Validierung, Hydrogen,
Metafelder, Shopify Functions und Extensions, Store-Operationen. Im Repo sichtbar:
`search_docs.mjs`, `validate.mjs`, `log_skill_use.mjs`.

**Zwei Installationsbefehle kursieren, beide UNGEPRÜFT — morgen erst `/plugin` fragen:**
```
/plugin marketplace add Shopify/shopify-ai-toolkit
/plugin install shopify-plugin@shopify-ai-toolkit
```
oder
```
claude plugin install shopify-ai-toolkit@claude-plugins-official
```

**GEMESSEN:** im Plugin-Katalog dieses Kontos gibt es **kein Shopify-Plugin**. Vorhanden und
ecommerce-nah sind nur `wix`, `noibu` (Fehler- und Conversion-Analyse für Shops, braucht
Noibu-Konto) und `brightdata-plugin`. Wer „installier einfach das Shopify-Plugin" liest, muss
also erst den Marktplatz hinzufügen — ob das hier erlaubt ist, ist offen.

**⚠️ Zwei Warnungen aus der Anleitung, die zur Hausregel passen:**
1. **Kein Entwurfsmodus, keine Vorschau, kein Rückgängig.** Mutationen des Toolkits laufen
   sofort auf dem Produktivshop. Genau deshalb bleibt hier die Regel: erst messen, Sicherung
   anlegen, dann ändern.
2. **Validierungs-Payloads enthalten den geprüften Code** und gehen an Shopify.
   Abschaltbar mit `export OPT_OUT_INSTRUMENTATION=true`.

---

## 3 · Was die YouTube-Szene wirklich macht

Fünf Videos ausgewertet. **Transkripte waren nicht zu holen** (siehe §6), darum Titel,
Kanal, Datum, Aufrufe und die vollständigen Beschreibungen samt Kapitelmarken — die sind bei
diesen Kanälen erstaunlich ergiebig, weil sie den ganzen Ablauf durchnummerieren.

| Video | Kanal | Datum | Aufrufe |
|---|---|---|---|
| How to Use Claude to Build and Run a Shopify Store | **Learn With Shopify** (offiziell) | 13.07.2026 | 106 388 |
| $2.7M With Claude Ai Dropshipping Full Guide | Austin Rabin | 21.05.2026 | 257 153 |
| Claude Design Just Changed Shopify Dropshipping Forever | THE ECOM KING | 10.05.2026 | 70 451 |
| I Built A $400K/m Claude Shopify Dropshipping Store | Ali Akbar | 20.06.2026 | 19 640 |

**Die Umsatzzahlen in den Titeln sind BEHAUPTUNG.** Keine ist belegt, alle vier Kanäle
verdienen an Partnerlinks (Zendrop, USAdrop, Winning Hunter, Omnisend, eigene Kurse). Der
Inhalt ist trotzdem brauchbar, wenn man die Zahlen weglässt.

### 3a · Das offizielle Shopify-Video — die drei „Hacks"
Das ist die glaubwürdigste Quelle, und sie beschreibt genau das, was diese Session ohnehin
tut. Kapitel: Shop mit Claude aufsetzen · Shop mit Claude verbinden (Connector-App,
Berechtigungen bewusst lesen) · **Hack 1: alle Produkttitel und -texte in EINE Markenstimme
umschreiben** · **Hack 2: täglicher Shop-Check ohne Dashboard** · **Hack 3: eine
Preisstrategie aus dem eigenen Katalog und den eigenen Bestelldaten bauen.**

→ Hack 1 und 2 macht diese Session längst. **Hack 3 ist hier noch nie gemacht worden** und
passt exakt zum Auftrag „Profit maximieren": Preise nicht nach Gefühl, sondern aus den
14 echten Bestellungen und dem Katalog ableiten.

### 3b · Der Ablauf, den die Dropshipping-Kanäle lehren
Aus den Kapitelmarken von Ali Akbar (46 Minuten, sehr detailliert):
Produktrecherche per Ad-Spy → Lieferant suchen → **Produktseite eines Mitbewerbers als
Ganzseiten-Screenshot aufnehmen → daraus ein Wireframe erzeugen → Copy schreiben lassen →
Bilder erzeugen → als Liquid-Datei ins Theme hochladen** → Testimonial-Bilder aufhübschen →
Facebook-Anzeigen des Mitbewerbers nachbauen.

**Was davon hier taugt:** der Screenshot-zu-Wireframe-Schritt. Eine Produktseite als Bild zu
messen und daraus ein Layout abzuleiten, ist derselbe Gedanke wie `tools/seiten_blick.mjs`
(Seiten in Bildschirmhöhen statt 21 000-px-Bild). Und: **diese Session hat den `design`-Skill**
— genau das Werkzeug, um das ohne fremde Dienste zu tun.

**Was davon hier NICHT taugt, und warum:**
- **Fremde Produktseiten „klonen" heisst bei diesen Kanälen: Text und Testimonials
  übernehmen.** Texte sind urheberrechtlich geschützt, übernommene Testimonials sind
  erfundene Bewertungen. Das fällt unter dieselbe Grenze wie die hier geltende Regel
  **„NIE Fake-Reviews"** (UWG, irreführende Geschäftspraktik). **Layout-Ideen ansehen: ja.
  Texte, Bilder oder Bewertungen übernehmen: nein.**
- Die erzeugten Testimonial-Bilder („Testimonial-Bilder mit KI aufhübschen") sind schlicht
  erfundene Kundenstimmen. Nicht machen.
- „Winning Hunter", „Zendrop MCP", „White Labeler" sind kostenpflichtige Partnerprodukte.
  Der Katalog hier hat über 10 000 Produkte — **Produktrecherche ist hier gemessen kein
  Engpass.**

---

## 4 · Header, Startseite, Produktseite — die Hebel mit Zahlen

Alles **QUELLE** (CRO-Checklisten 2026), aber auffällig deckungsgleich über mehrere Quellen.
Daneben steht, was LuxeStyle gemessen schon hat.

| Hebel | Angegebene Wirkung | Stand LuxeStyle |
|---|---|---|
| **Sticky ATC-Leiste auf dem Handy** | **+8–12 % Add-to-Cart** | **steht live** (gemessen, s. §4a) |
| **Video auf der Produktseite** | **+10–25 % ATC** | Reel-Pipeline existiert, Videos liegen ungenutzt |
| **Foto-Bewertungen** | **2–3× besser als reiner Text** | CJ liefert `commentUrls`, Importer fertig, es fehlt nur `JUDGEME_PRIVATE_TOKEN` |
| **Fortschrittsbalken „Gratis-Versand ab X"** im Warenkorb | „der stärkste einzelne Warenkorb-Hebel" | **steht live**, Schwelle **CHF 50** (nicht 65) |
| Sternebewertung über der Falz, unter dem Titel | Trust vor dem Scrollen | Widget steht, **0 Bewertungen** |
| **Eine** primäre Handlung auf der Startseite, nicht drei | weniger Entscheidungslähmung | 17 Reihen → `homepage_slim.mjs` bringt 4 |
| Statisches Produktraster statt Karussell | Karussells schwächer seit 2022 | erledigt (2026-09-11, Raster verdichtet) |
| Header: Logo links 40–60 px, **5–7 Navigationspunkte** | schlank und schnell | Menü hat 8 Bereiche + Unterkategorien |
| Ankündigungsleiste = die obersten 30–50 px | teuerste Fläche der Seite | vorhanden (Gratis-Versand · WELCOME10 · 30 T) |
| Mobil LCP < 2,5 s, INP < 200 ms | Technikziel | Startseite 6,91 MB — weit davon entfernt |
| Bezahl-Logos, Versandversprechen, Rückgabe, CH-Signal | Vertrauen | **alles vorhanden**, 5–6 Zahlungslogos |
| Express-Bezahlknöpfe oben, ohne Scrollen | „grösster Hebel im Handy-Checkout" | unbekannt |

**Benchmark zur Einordnung (QUELLE):** gute Shopify-Conversion 2–3,5 %, Spitze ab 5 %;
Dropshipping 2–3 %. **Vertrauenssignale zählen bei Dropshipping-Shops dreimal so viel** wie
bei bekannten Marken, weil die Kundschaft keine Vorbeziehung hat.

---

## 4a · Gemessen am eigenen Shop statt aus der Checkliste geraten

Werkzeug: **`tools/shop_conversion.mjs`** (12 Selbsttests). Es ruft die echten Seiten ab und
zählt benannte Bausteine. **Die Regel, die es von einem `grep` unterscheidet:** vor jeder
Textprüfung fliegen `<script>`, `<style>` und HTML-Kommentare raus. Auf der Produktseite steht
in einem JS-Kommentar „Gratis-Versand ab CHF 49" — reine Entwicklerhistorie. Wer roh greppt,
meldet zwei widersprechende Versprechen und schickt die nächste Session auf eine Reparatur,
die es nicht gibt.

| Seite | Grösse | sticky-ATC | Sterne | Bewertungen | Versand | Balken | Lieferdatum | Video | Logos |
|---|---|---|---|---|---|---|---|---|---|
| Startseite | **6,91 MB** / 1130 Bilder | ja | ja | **0** | CHF 50 | ja | – | ja | 6 |
| `geschenke-unter-50-franken` | 0,98 MB | ja | ja | **0** | CHF 50 | ja | – | nein | 5 |
| Pyjama-PDP | 0,62 MB | ja | ja | **0** | CHF 50 | ja | ja | **nein** | 6 |
| Poncho-PDP (verkauft) | 0,53 MB | ja | ja | **0** | CHF 50 | ja | ja | **nein** | 6 |
| Halloween-PDP (verkauft) | 0,53 MB | ja | ja | **0** | CHF 50 | ja | ja | **nein** | 6 |
| Kleid-PDP | 0,56 MB | ja | ja | **0** | CHF 50 | ja | ja | **nein** | 6 |

**🚨 Drei Korrekturen am Gedächtnis, alle live nachgeprüft:**
1. **Die Sticky-ATC-Leiste steht.** Das Gedächtnis führte sie seit Juni als offenen Punkt,
   und ich habe das gestern ungeprüft weitergetragen. `sticky-add-to-cart__bar` liegt auf
   jeder gemessenen Seite.
2. **Die Gratis-Versand-Schwelle ist CHF 50, nicht 65.** Im Theme steht dazu ein Kommentar,
   der die Wahl begründet: der Automatik-Rabatt greift bei 49, aber die Regel prüft den Korb
   **nach** dem 10-%-Gutschein — 50 ist die einzige Zahl, die in jedem Korb wahr bleibt
   (50 × 0,9 = 45). **Das ist Absicht, nicht anfassen.**
3. **Der Fortschrittsbalken existiert** („Gratisversand-Balken"). Die Checkliste nennt ihn den
   stärksten Warenkorb-Hebel — der ist also schon gezogen.

**⚠️ Und ein Fehler im eigenen Messgerät, gefangen bevor er Schaden anrichtete:** die erste
Fassung suchte „Grössentabelle" und meldete bei allen Kleidern **NEIN**. Die Seiten nennen es
**„Mass-Tabellen"** (Schweizer Schreibweise). Eine vorhandene Hilfe als fehlend zu melden hätte
die nächste Session auf Arbeit geschickt, die es nicht braucht. Regel fürs Gerät: **erst
nachsehen, wie die Seite es nennt, dann das Muster schreiben.** Ebenso kein Defekt: Poncho und
Halloween-Umhang haben keine Grössenhilfe, weil sie einvariantig sind.

**Was nach der Messung übrig bleibt — und es sind nur drei Dinge:**
1. **Bewertungen: 0 auf jeder gemessenen Seite.** Das Widget ist installiert, der Importer
   fertig, CJ hat die Kommentare samt Fotos. Es fehlt `JUDGEME_PRIVATE_TOKEN`.
2. **Kein Video auf einer einzigen Produktseite** (die Startseite hat eines). Laut Quelle
   +10–25 % ATC. **105 fertige Reels liegen in `reels/` (494 MB).**
3. **Startseite 6,91 MB / 1130 Bilder.** Werkzeug fertig, es fehlt der Theme-Token.

Alles andere, was die CRO-Checklisten fordern, steht bereits: Sticky-ATC, Warenkorb-Schublade,
Versandversprechen mit Balken, Rückgabe, Schweiz-Signal, Lieferdatum, 5–6 Zahlungslogos,
Grössenhilfe und ein ehrlicher Hinweis auf asiatische Konfektion. **Der Shop ist nicht das
Problem — die zwei fehlenden Zugangsdaten sind es.**

### Video auf die Produktseiten: Weg vorgeprüft
Gegen das Schema geprüft, damit morgen niemand sucht:
- `stagedUploadsCreate` → **gültig**.
- `productCreateMedia` → gültig, aber **veraltet**; Shopify verweist auf `productUpdate`
  bzw. `productSet`. Nötige Scopes laut Schema: `write_products`, `read_products`,
  `read_files`, `read_images` u. a.
- Ablauf: `stagedUploadsCreate` → Datei per `PUT` auf die erhaltene URL → Medium über
  `productUpdate` mit der `resourceUrl` anhängen. **Braucht keinen Theme-Zugriff** — dieser
  Hebel ist also auch ohne den Theme-Token erreichbar.

---

## 5 · Profit maximieren

**Margen-Benchmark (QUELLE, mehrere Quellen einig):** übliche Netto-Marge im Dropshipping
**15–20 %**, schlecht geführte Shops unter 10 %, gut geführte bis ~30 %.

**Die Hebel, geordnet nach Aufwand:**
1. **Bestandskunden mehr kaufen lassen schlägt neue Kunden** — die Anschaffungskosten sind
   schon bezahlt. Bündel, Mengenrabatte, Cross-Sell.
2. **Nachkauf-Upsell** (nach dem Bezahlen, 20–30 % Rabatt auf Ergänzungsprodukt): soll mit
   15–25 % angenommen werden. Ein Klick, kein neuer Traffic nötig.
3. **Versandschwelle als Upsell-Zwang:** „Gratis ab CHF 50" (**gemessen auf der Live-Seite — nicht 65, wie das
   Gedächtnis sagte**) bei einem Hauptprodukt um CHF 20–45 zwingt rechnerisch zum zweiten
   Artikel. **Hier gemessen relevant:** jede echte Bestellung lag zwischen CHF 21.90 und
   41.90 — also **unter** der Schwelle. Die Schwelle
   arbeitet im Moment nicht für den Shop, sie bremst ihn womöglich.
4. **Ankerpreis** (durchgestrichener Vorher-Preis) und **Schwellenpreis** (CHF 19.90 statt 20).
5. **Hack 3 aus dem offiziellen Video:** Preisstrategie aus dem eigenen Katalog plus den
   eigenen Bestelldaten ableiten.

**⚠️ Zoll-Falle 2026 (QUELLE):** die Zollfreiheit für geringwertige Importe fällt in mehreren
Märkten weg; Abgaben, Gebühren und Bearbeitungskosten der Transporteure fressen die Marge
kleiner Sendungen. Ein Artikel, der früher CHF 10–15 Gewinn brachte, kann nach Abgaben fast
nichts mehr abwerfen. **Für die Schweiz gesondert prüfen, bevor Preise gesenkt werden.**

---

## 6 · Zwei Sackgassen, damit sie niemand zweimal läuft

1. **YouTube-Transkripte gehen aus diesem Container nicht mehr.** Der Weg, der bei TikTok
   funktioniert hat (Untertitelspur aus den Seitendaten holen), scheitert hier:
   `captionTracks` steht zwar im HTML, aber der `timedtext`-Abruf liefert **HTTP 200 mit
   0 Bytes** — in allen Formaten (`srv1`, `vtt`, `json3`, `tlang`). Die Innertube-API
   antwortet mit `UNPLAYABLE` (WEB-Client) bzw. `FAILED_PRECONDITION` (ANDROID-Client).
   YouTube verlangt inzwischen ein PO-Token. **Was stattdessen geht:** die Videoseite per
   `curl` mit Browser-Kennung holen (1,3 MB HTML) und `shortDescription`, `ownerChannelName`,
   `uploadDate`, `viewCount` herausschneiden — die Kapitelmarken stehen in der Beschreibung
   und sind fast so gut wie ein Transkript. **`WebFetch` auf eine YouTube-Seite ist nutzlos**,
   es kommt nur die leere Hülle zurück.
2. **Mitbewerber-Seiten inhaltlich kopieren ist keine Abkürzung, sondern ein Rechtsrisiko.**
   Siehe §3b.

---

## 6a · Nebenbefund beim Schreiben dieser Datei: das Gedächtnis stand öffentlich im Netz

Die Session vom 12.09. hat gemessen, dass `brain/` und `.claude/` über `build-pages.sh`
öffentlich auf abannews.com gelandet wären, und beide ausgeschlossen. **Die Gedächtnis-Dateien
im Wurzelverzeichnis hat sie dabei übersehen.**

**GEMESSEN, live abgerufen am 13.09.:**
```
https://abannews.com/CLAUDE.md         → HTTP 200,  34 399 Bytes
https://abannews.com/SHARED-MEMORY.md  → HTTP 200, 107 585 Bytes
```
Das ist das vollständige Projekt-Gedächtnis: Umsatzzahlen, Rückerstattungen, Lieferantennamen,
Produkt-IDs, offene Zugangsdaten-Aufgaben. Der ausgelieferte Stand ist alt (oberster Block
**2026-07-05**, passend zum seit 29.08. stehenden Deploy) — aber er ist abrufbar, und mit dem
nächsten Deploy wäre der aktuelle Stand oben.

**Behoben:** `build-pages.sh` schliesst jetzt zusätzlich aus: `CLAUDE.md`, `SHARED-MEMORY.md`,
`LERNEN-*.md`, `*-HANDOFF.md`, `*-MEMORY.md`, `*-CHECKLISTE.md`, `docs/SESSION-HANDOFF.md`.
**Nachgemessen 5 → 0**, Gegenprobe: `functions/` weiter 39 Dateien, `index.html` dabei,
7377 Dateien gesamt.

**⚠️ Das entfernt die bereits veröffentlichte Kopie nicht.** Sie verschwindet erst, wenn wieder
deployt wird — und der Live-Deploy steht seit 29.08. **Nach dem nächsten Deploy gegenprüfen:**
`curl -s -o /dev/null -w '%{http_code}' https://abannews.com/CLAUDE.md` muss **404** liefern.

**Lehre, allgemeiner als der Einzelfall:** `build-pages.sh` arbeitet mit einer Ausschluss-, nicht
mit einer Einschlussliste. Alles, was nicht genannt ist, geht live — **auch einzelne Dateien im
Wurzelverzeichnis, nicht nur Verzeichnisse.** Wer eine Datei anlegt, die nicht auf die Webseite
gehört, trägt sie im selben Arbeitsgang ein und misst nach.

---

## 7 · Arbeitsplan für die nächste Session

Nach Wirkung geordnet, mit dem was fehlt:

1. **Theme-Token besorgen lassen und die schlanke Startseite scharf stellen.** Sobald
   `SHOPIFY_CLI_THEME_TOKEN` da ist: CLI installieren, `theme pull --live --nodelete` als
   Sicherung, `homepage_slim.mjs` auf die Kopie anwenden, pushen, publishen, danach mit
   `tools/shop_startseite.mjs` **nachmessen** (Vorher: 17 % HTTP 500, 6,91 MB). Das ist der
   einzige gemessene Hauptdefekt des Shops.
2. **Foto-Bewertungen importieren.** Der Importer ist seit dem Auth-Fix fertig, CJ hat die
   Kommentare, Foto-Bewertungen konvertieren 2–3×. Es fehlt allein
   `JUDGEME_PRIVATE_TOKEN`. **Nie erfundene Bewertungen, nie per Namensähnlichkeit zuordnen.**
3. **Sticky ATC auf dem Handy** (+8–12 % laut Quelle) — geht erst mit Theme-Zugriff, dann
   zusammen mit Punkt 1 in einem Rutsch.
4. **Preisstrategie aus echten Daten** (Hack 3): 14 Bestellungen, Katalog, Margen. Erst
   rechnen, dann ändern. Dabei die Versandschwelle prüfen — alle echten Bestellungen lagen
   unter CHF 65.
5. **Produktvideos auf die Produktseiten** der Verkäufer (+10–25 % ATC laut Quelle). Die
   Videos existieren bereits in `reels/`.
6. Erst wenn 1–5 laufen: Shopify-AI-Toolkit-Plugin ausprobieren. Es ist bequem, aber es löst
   keinen der gemessenen Defekte.

**Nicht tun:** mehr Produkte importieren (gemessen 0-Hebel), fremde Shops inhaltlich klonen,
Bewertungen erfinden, Crons massenhaft reaktivieren.

---

## Quellen

Offizielle Doku: shopify.dev (Theme-CLI), github.com/Shopify/shopify-ai-toolkit.
Videos: youtube.com/watch?v=Ih5RapM8XKw (Learn With Shopify), w-iIZQi35kU (Austin Rabin),
393t6rWLz5A (THE ECOM KING), ehNjnJlXwFg (Ali Akbar).
CRO und Margen: cartylabs.com/blog/shopify-cro-checklist, trueprofit.io, gropulse.com,
easyappsecom.com, doba.com, dropified.com, fudge.ai, kaspianfuad.com.
