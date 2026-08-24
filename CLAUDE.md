# CLAUDE.md — Projekt-Gedächtnis

## 🎵 TikTok-Stand + Browser-Bedienung (2026-08-18)
**API-Weg (in Arbeit):** App **«luxe»** (developers.tiktok.com/app/7648584035840903189) ist die richtige
von 3 Apps — «LuxeStyle Poster» ist das KURZDRAMA-Portal (/portal/drama/, Unternehmensverifizierung),
NICHT nutzen. Produktions-Client-Key `awhvghmn5q2oh91i`; App seit 18.08. **in Review** (Login Kit +
Content Posting API, Scopes user.info.basic/video.upload/video.publish, Redirect Desktop
`http://localhost:8723/callback`). Bis zur Freigabe gibt der Login `unauthorized_client` — NICHT
weiter probieren, auf die Mail warten (send_later-Check 21.08. gesetzt). ⚠️ `/tmp/tt_creds.env`
trägt noch den SANDBOX-Key (`sbawgg40…`) = Sackgasse: Sandbox darf nur auf PRIVATE Konten posten,
@luxestyle.ch ist öffentlich (Fehler `unaudited_client_can_only_post_to_private_accounts`).
**Nach Freigabe:** User führt lokal `tiktok-oauth.mjs` aus (liegt bei ihm; PKCE `code_challenge`
S256-hex ist PFLICHT, Fehler 10007 ohne) → TT_REFRESH_TOKEN → /tmp/tt_creds.env auf Produktions-Keys
umstellen → `tiktok_reel_post.mjs` in Rotation. ⚠️ Client-Secret stand im Chat → nach Setup im
Portal ROTIEREN lassen und neues Secret erfragen.
**Browser-Weg (funktioniert SOFORT):** TikTok lässt sich ohne API über den PC-Browser-Claude des
Users bedienen (Brave, eingeloggt als @luxestyle.ch): Upload über **tiktok.com/tiktokstudio/upload**
— Video-Datei liefern (CDN-URL aus reels_seed.csv herunterladen), Caption mitgeben, Trend-Sound
in der App wählen lassen. Für Einzel-Posts der Standard-Weg, bis die API frei ist.
**Content-Nachschub:** cj_video_reel_engine baut Reels aus CJ-Produktvideos — praktisch unendlich,
Ledger verhindern jede Wiederholung (plattformübergreifend). 29 ready in reels_seed.csv.

## 🔥 DAUERAUFTRAG: Hype-Produkte recherchieren und die Startseite frisch halten
**User 2026-08-12, wörtlich:** «informiere dich immer über neuste hype produkte und so und mache
auch in startseite ganz gross irgendwo paar coolen produkten, aber wen hype vorbei produkt ändern.»
**Zu Beginn JEDER Session:** per Web-Suche nachsehen, was gerade läuft (TikTok-/Dropshipping-Trends),
die Themenliste in `automation/hype_kuratieren.py` (`THEMEN` + `QUELLE` mit Datum) aktualisieren und
das Skript laufen lassen. Aufbau:
- Kollektion **`hype-jetzt` «🔥 Gerade im Trend»** (Smart-Regel Tag `hype-jetzt`, in 6 Kanälen publiziert).
- Startseite **Position 1 direkt unter dem Hero**, Sektion `pl_trends` umgewidmet: `columns:3`,
  `max_products:6`, `mobile_columns:"1"` (String! `int` wird mit «must be a string» abgelehnt),
  `mobile_card_size:86cqw` → wenige, dafür grosse Karten.
- **Selbstabräumend:** jedes Produkt trägt `hype-seit-JJJJ-MM-TT`; nach `HYPE_TAGE` (21) nimmt der
  nächste Lauf `hype-jetzt` wieder weg. Ware bleibt im Shop. `fixer_keepalive.sh` startet den Lauf
  einmal täglich — das hält die Reihe frisch, aber **aktuell** hält sie nur die Recherche.
- Stand 12.08.2026: Beauty-Geräte, Schnecken-/Serum-Hautpflege, Mini-Beamer, «aesthetic» Ordnung,
  Shapewear, 3-in-1-Ladestationen (12 Produkte).
- ⚠️ Fallen aus dem ersten Lauf: **`IPL` ohne `\b` steckt in «L-IPL-iner»** (ein Lipliner wurde als
  Beauty-Gerät gewählt); ein «Intim-Pflegeserum» wäre auf der Startseite gelandet → `NICHT_STARTSEITE`.
  Bedingungen für die Reihe: ≥2 Bilder, ab CHF 19, im Google-Kanal, kein Kostüm/Spielzeug/Partydeko.

## 🤖 46+23-Agenten-Doppel-Audit mit Reparatur-Flotte (2026-08-16)
Zwei Workflow-Runden («100 agent go»): 25 Finder-Dimensionen auf frischem 214-MB-Export, adversariale
Live-Verifikation, dann REPARATUR-Agenten mit Schreibauftrag. Ergebnis: 72 Produkte repariert
(45 Texte rechtssicher umgeschrieben — Heilversprechen→Erscheinungsbild, Marken aus Titeln;
5 gedraftet: Tierpräparate, Hanföl, Antifungal, 9-Mio-mAh-Powerbank; 18 Kanal/Tags). Vorher als
Sofortmassnahme: Teleskopschlagstock, Elektroschocker («Spielzeug» mit KINDER-Tags!), 2 Schock-
Halsbänder (TSchV 76), 3 MepV-Geräte, Wurfdolche/Machete → DRAFT; 12 Klingen + 4 Rauchzubehör
(als «Werkzeug/Küche» getarnt!) aus Google. Abnahme 5/5 live bestätigt.
**Lehren:** (1) Der CJ-Grind legt die 12.08.-Fehlerklassen TÄGLICH neu an — Wächter brauchen
SEIT-Modus gegen LIVE, Einmal-Ledger veralten. (2) Rauchzubehör/Klingen per FUNKTION suchen
(Zigarre/Hygrometer/Klinge), nicht per Tag — eigene Klassifizierung prüft nur bekannte Fehler.
(3) Fashion ohne Grössentabelle = 4'974 Produkte Retourenrisiko — ERST Importer-Snippet bauen
(wer schreibt es beim nächsten Produkt?), DANN Backfill. (4) Workflow-Muster funktioniert:
Finder auf lokalem Export (API-schonend) → Skeptiker gegen LIVE → Schreiber mit harten Regeln
(minimal-invasiv, nie löschen, 1 req/s) → Abnahme-Stichprobe.

## 👯 Gleicher Titel ≠ Dublette — und `productUpdate(tags:)` LÖSCHT alle Tags (2026-08-20)
Der Grind legte «Keramik Futternapf für Katzen, erhöht» UND «Keramik-**Futternapf**…» an — ein
Bindestrich Unterschied, beide aktiv. Drei Lehren aus der Reparatur:
1. **Shopifys `title:"…"` tokenisiert Bindestriche nicht.** Auch eine Wortsuche («Futternapf Katzen»)
   findet die Bindestrich-Variante NICHT — ein normalisierter Titelvergleich nützt also nichts, wenn
   die Kandidatenliste schon leer zurückkommt. **Verlässlich ist der HANDLE**: Shopify slugifiziert
   den Titel, unser Importer hängt eine Zufallszahl an → zwei Titel, die sich nur in Satzzeichen
   unterscheiden, ergeben denselben Slug. `handle:<slug>*` findet beide. Als Dublette gilt nur
   `^slug-<Ziffern>$` — ein längerer Slug ist ein anderes Produkt, sonst erschlägt «Kissen» auch
   «Kissenbezug». Eingebaut in `cj_category_fill.mjs` («skip(dup-handle)»).
2. **Identischer Titel heisst NICHT identische Ware.** Die beiden Näpfe hatten verschiedene CJ-SKUs,
   Preise (17.90/21.90) und Bilder — dazu ein dritter «…erhöhte Position» für 19.90. Drei echte
   Artikel, die zufällig gleich hiessen. **Vor jedem Draften SKU + Preis + Bild vergleichen**; sind
   sie verschieden, ist die Reparatur ein UNTERSCHEIDBARER Titel, kein Draft (dieselbe Logik wie bei
   den Y110S-Jeansjacken). Jetzt: «· geriffelter Fuss, 12,5 cm» / «· Pastell, erhöht» / «· Sprenkel-Optik, 300 ml».
3. **⚠️ `productUpdate(input:{tags:[…]})` ERSETZT die komplette Tag-Liste.** Mein Draft-Aufruf mit
   `tags:["duplikat-auto-draft"]` hat cj-real/dropship/haustier/hund/katze/pet gelöscht — das Produkt
   wäre aus allen Kollektionen gefallen. **Für einzelne Tags IMMER `tagsAdd`/`tagsRemove`**, `tags:`
   nur, wenn die vollständige Liste bewusst neu gesetzt wird.

## 🧟 Ein Massen-Schreiber macht alte Fixes rückgängig (2026-08-15)
`versandaussagen_wahrheit.py` (14.08.) hat bei **149 Produkten den doppelten Produktdetails-Block
wiederbelebt**, den der Dedup-Lauf vom 11.08. entfernt hatte — und bei 1 Produkt den Lieferanten-
Farbcode («RM47-Plaid»). Mechanik: Der Schreiber sammelt Kandidaten samt Beschreibungstext zu
Beginn, schreibt aber erst Stunden später (Queue) — wer dazwischen (oder davor, aus älterer
Quelle) repariert wurde, wird mit der alten Basis überschrieben. Doppelt gefährlich: **das Ledger
des früheren Reinigers blockiert dann die Zweitreparatur** (der Cardigan stand als «erledigt» im
Farbcode-Ledger und blieb kaputt; die 149 fehlten im v2-Ledger nur zufällig, weil v2 andere Fälle
abarbeitete). Erkannt über Korrelation: alle 149 in Dedup-v1-Ledger UND in Versand-Ledger, 0 in v2.
**Regeln:** (1) Nach jedem Massen-Beschreibungs-Schreiber die nachgelagerten Text-Reiniger gegen
LIVE neu laufen lassen — deren «FERTIG» ist ab da wertlos. (2) Reiniger-Wiederholung braucht
frische Mini-Exports (LIVE holen, `status` mitschreiben) statt des alten Exports. (3) ⚠️ Shopifys
Bulk-JSONL escaped `/` als `\/` — ein Roh-Zeilenfilter auf `gid://` matcht NIE; erst json.loads,
dann filtern (zwei Prüfskripte meldeten dadurch fälschlich 0). Blutzucker-/Heilversprechen-Fixes
gegengeprüft: halten.

## 🚚 Versandaussagen auf EINE Wahrheit gebracht (2026-08-14)
1'037 aktive Produkte bewarben «🇨🇭 CH / 🇪🇺 EU: 10–18 Tage · 🇺🇸 USA: 12–22 Tage», und für dieselbe
Ware standen VIER Lieferzeiten nebeneinander (Richtlinie 5–12 Werktage · Startseite 2–14 Tage ·
Produkt-Kopfblock 7–14/8–16/10–18 · Trustzeile 10–20 Tage — die letzten beiden auf DERSELBEN Seite,
live belegt an 15411554910593). `automation/versandaussagen_wahrheit.py`, Ledger
`_versandaussagen_wahrheit.txt`.
- **Das Liefergebiet steht nicht im Text, sondern in den Markets.** Es gibt genau EINEN aktiven
  Markt («Switzerland», Regionen `['CH']`) — niemand ausserhalb der Schweiz kann überhaupt
  auschecken. Jede EU-/USA-Zusage war damit unerfüllbar. ⚠️ Das Standardprofil hat trotzdem noch
  eine Zone «International / Rest of World» (CHF 15, aktiv); sie ist wirkungslos, weil kein Markt
  sie freischaltet. NICHT angefasst — Zonen greifen in den Checkout.
- **Erst nachsehen, welche Zahl schon entschieden ist.** Mein erster Entwurf setzte 10–18 Werktage.
  `automation/seiten_versandtext.py` hatte die Shop-Seiten am 12.08. aber längst auf **1–2 Werktage
  ab CH-Lager / 10–20 Werktage ab Werk** vereinheitlicht, und /pages/versand-lieferung nennt zusätzlich
  «übrige Lagerartikel: 2–7». Eine eigene Zahl hätte die fünfte widersprechende Zusage erzeugt statt
  vier aufzulösen. Übernommen: **CH-Lager 1–2 · EU-Lager 2–7 · Druck auf Bestellung 7–14 ·
  Direktversand 10–20 Werktage**. Die 2'593 CH-Lager-Seiten waren bereits wahr → NICHT angefasst.
- **Absatz-Ersetzung frisst Nachbarinformation.** Der `<p>`-Tausch (nötig, weil der Baustein mit
  `<strong>`/`<span>` durchsetzt ist und ein Teiltausch halbe Tags hinterlässt) hätte bei 2 Produkten
  «Gratis-Versand ab CHF 50 · 30 Tage Rückgabe» mitgerissen. Fix: **erst die punktgenauen Textregeln,
  DANN der Absatz-Tausch als Auffangnetz.** Kontrolle: jeden zu ersetzenden Absatz einmal ausdrucken.
- **Ein Landeswort ist kein Lieferziel.** «Produktion in den USA/Mexiko», «Steckdosen für USA,
  Europa», «Grösse: EU 52, EU 54», «Hut Zylinder USA», «Versand aus EU-Produktion · Lieferung CH»
  sind Herkunft, Eigenschaft, Grösse, Name. Nur vollständig ausformulierte Bausteine treffen.
- **Quellen mitrepariert:** `delivery_block.mjs` (schrieb den EU/USA-Block), `cj_category_fill.mjs` +
  `cj_trending_import.mjs` (Trustzeile «Lieferung ca. 10–20 Tage» in JEDEM neuen Produkt),
  `cj_gaps_import.mjs` («Lieferung CH/EU 6–12 Tage»), `snippets/ls-lieferzeit.liquid` (hatte einen
  Übersee-Zweig für US,CA,AU,… — im Live-Theme nicht eingebunden, aber eine gestellte Falle).
- **Der Export ist zu klein.** Schnappschuss 12.08. = 31'398 aktive, live = 34'590 — der CJ-Grind legt
  täglich nach. Nach dem Export-Lauf gehört **immer** `QUELLE=live` hinterher, sonst bleiben genau die
  jüngsten Produkte falsch und der Lauf sieht trotzdem fertig aus.
- **`shop.description` ist über KEINE Admin-API änderbar.** Die Startseiten-Meta-Description
  («…schnellem Versand in die Schweiz und **nach Deutschland**») steht in Online Store → Preferences.
  Bis der Betreiber sie dort ändert, fängt eine `replace`-Regel in `snippets/meta-tags.liquid` sie ab
  (dieselbe Stelle hatte das für og:description schon, nur nicht für `name="description"`).
- ⚠️ **PUT auf `/admin/api/…/policies/…json` scheitert LAUTLOS** (kein Fehler, keine Wirkung).
  Rechtstexte gehen nur per GraphQL `shopPolicyUpdate` — und dessen Input nimmt `type`
  (`SHIPPING_POLICY`), **nicht** `id`. Ohne Live-Gegenprobe hätte der Lauf als erledigt gegolten.

## 🔗 61 tote Links in den SEO-Ratgebern — der teuerste stille Verlust (2026-08-20)
Die veröffentlichten Ratgeber sind gebaut, um Google-Besucher anzuziehen — und genau dort führten
**61 Links auf 25 Seiten** ins Nichts: auf gelöschte Produkte oder auf DRAFTs (für Besucherinnen
dasselbe: 404). Betroffen waren «Echtleder vs. Kunstleder», «RFID-Schutz erklärt», «Wanderziele
Schweiz», «Beauty-Routine in 10 Minuten» und 21 weitere. Der Besucher liest, klickt auf die
empfohlene Ware — und ist weg. **Kein Bericht weist das je als Kaufabbruch aus.**
**Die Ursache wiederholt sich zwangsläufig:** Der Viability-Guard draftet Ware ohne Lieferanten-SKU
(`keine-lieferanten-ref` — alle 14 gefundenen DRAFTs), der Dubletten-Fix draftet Doppelgänger,
Altbestand verschwindet. Die TEXTE, die darauf zeigen, erfahren davon nichts. Jeder Draft-Lauf
kann neue tote Links erzeugen.
- Wächter `automation/tote_links.py` (täglich im `fixer_keepalive.sh`): prüft jeden
  `/products/…`-Link in veröffentlichten Seiten/Artikeln gegen den Live-Status. Meldet nur.
- Repariert wurde mit Vorrang: **passender Ersatzartikel** (14 Fälle, über Wort-Überschneidung im
  Titel gefunden), sonst die **passende Kategorie** — eine Kollektion kann nie 404 werden.
- ⚠️ DRAFT-Produkte NICHT einfach veröffentlichen, um den Link zu retten: `keine-lieferanten-ref`
  heisst, die Ware ist nicht bestellbar. Ein 404 ist ärgerlich, eine unlieferbare Bestellung teuer.
- ⚠️ `/collections/all` meldet der Prüfer als «fehlt» — das ist Shopifys eingebaute Route und
  funktioniert. Kein Fehler, nicht anfassen.

## 💰 Ohne Einkaufspreis weiss niemand, ob ein Verkauf Gewinn bringt (2026-08-20)
Anlass war die Frage, ob sich Shopifys «Smart Pricing»-App lohnt. Die Messung sagte nein — und
deckte einen grösseren Mangel auf: **Von 300 aktiven Produkten hatten nur 43 einen Einkaufspreis**
hinterlegt, und es gibt insgesamt **6 bezahlte Bestellungen**. Eine Preis-KI hätte auf 86 % des
Katalogs keine Marge berechnen können und aus 6 Verkäufen nichts ableiten können. (Ihr Hauptvorschlag
— Preise langsam verkaufter Artikel senken — ist ausserdem genau die Richtung, die hier schon einmal
2'355 Produkte unter den Preisboden gedrückt hat.)
**Die Kosten waren nie unbekannt, sie wurden weggeworfen.** `chf()` in `cj_category_fill.mjs` rechnet
sie beim Import aus (`landed = USD·0.9 + Frachtlücke`) und gibt nur den Verkaufspreis zurück.
- Importer schreibt jetzt `inventoryItem.cost` mit (Funktion `kosten()`).
- `automation/cj_kosten_backfill.mjs` trägt sie für den Bestand nach (täglich im Aufseher).
- **Kostendefinition: Warenkosten + VOLLE Fracht.** Die CHF 7 Versand des Kunden sind ERLÖS und
  stehen in der Bestellung — sie gehören nicht in die Stückkosten, sonst rechnet sich die Marge
  schön. ⚠️ Bei Mehrfach-Bestellungen zählt die Fracht dadurch mehrfach; der Wert ist bewusst
  KONSERVATIV. Fünf der ersten sechs Bestellungen enthielten genau einen Artikel.
- ⚠️ **Die CJ-SKU hat VIER Formen**, ein Muster reicht nicht: `CJ-<zahlen>`, `CJ-<UUID>`,
  `CJ-CJYD…` und blank `CJYD…`. Der erste Probelauf suchte nur `CJ-\d{10,}` und fand 0 von 50.
  Zahlen-/UUID-pid → `product/query?pid=`, Varianten-SKU → `product/variant/query?variantSku=`
  (Letztere liefert eine LISTE, nicht ein Objekt).
- ⚠️ Falsch quittierte Ledger-Zeilen des Probelaufs mussten gelöscht werden — sonst hätte der
  Fehlgriff 50 Produkte für immer übersprungen. Nach einer Regel-Änderung ist das alte Erledigt-
  Zeichen wertlos (dieselbe Lehre wie beim Produktdetails-Lauf).
**Die erste Rechnung ist ernüchternd:** Bei Verkaufspreis CHF 15.90 liegen die Stückkosten bei rund
CHF 17.70 — das Geschäft trägt sich dort NUR über den Versanderlös von CHF 7. Wer die Gratis-Schwelle
mit lauter billiger Ware erreicht, kann den Shop Geld kosten. Das gehört geprüft, sobald die
Kostendaten flächig da sind.

## 🖼️ «Image too small» — der Nachfüller war die Ursache (2026-08-20)
Google Merchant meldete **6'392 Varianten aus 668 Produkten** als «Image too small for upcoming
enforcement». Wichtig für die Einordnung: alle standen auf **«No impact»** und betrafen **nur
Shopping ads**, nicht die Gratis-Einträge (aus denen die Verkäufe kommen). Kein Ausfall, eine Vorwarnung.
**Die Ursache war unser eigener `cj_variantenbild.mjs`.** Er prüfte Lieferantenbilder auf «lebt» und
«textfrei», aber NICHT auf Grösse. CJ liefert zu vielen Varianten nur eine Miniatur (250–499 px) —
die wurde hochgeladen und der Variante zugeordnet und **verdrängte damit das grosse Hauptbild**
(oft 750–1600 px). Google bekam für die Variante das kleinere Bild; die Kundin auch.
Stichprobe: 5 von 25 gemeldeten Varianten hatten ein eigenes Bild mit 310–454 px, während das
Hauptbild 613–1320 px hatte. Die übrigen 20 hatten gar kein Variantenbild — dort ist das Hauptbild
selbst zu klein, das lässt sich nur über grössere Quellbilder von CJ heilen (braucht CJ-Punkte).
- Eingebaut: `grossGenug(url)` liest die Bildmasse aus dem Dateikopf (JPEG-SOF/PNG-IHDR, nur die
  ersten 64 KB laden) und verwirft alles unter **500 px Kantenlänge**. Netzfehler oder unlesbare
  Masse verwerfen NICHT — ein Ausfall darf kein Bild kosten.
- **Lieber gar kein Variantenbild als ein zu kleines**: Ein 310-px-Variantenbild ist doppelt
  schlecht — schlechter für Google UND schlechter als das grosse Hauptbild, das es ersetzt.
⚠️ Bestehende zu kleine Zuordnungen sind damit NICHT geheilt, nur der Nachschub gestoppt. Die
Reparatur braucht grössere CJ-Quellbilder (Tagesbudget) — und die Frage, ob man ein Variantenbild
entfernt (Google besser, Farbwahl schlechter) gehört dem Betreiber.

## 🎟️ Eine Aktion endet nicht mit dem Code, sondern mit dem letzten Text (2026-08-20)
Der Vatertags-Code **PAPA25** lief am 8. Juni ab. Zweieinhalb Monate später bewarben ihn noch
**fünf veröffentlichte Seiten** — und die Suche nach weiteren toten Codes fand **sechs weitere
Fundstellen** (LAUNCH30, GENTLEMAN30, PARENTBUNDLE). Betroffen waren ausgerechnet die zeitlosen
SEO-Ratgeber («Saphirglas vs. Mineralglas», «Echtleder vs. Kunstleder», «Geschenk-Guide»), die
über Google dauerhaft Besucher bringen: Wer den Code an der Kasse eintippt, bekommt eine
Fehlermeldung — ein Kaufabbruch, den keine Statistik je als solchen ausweist.
**Lehre: Beim Beenden einer Aktion reicht es nicht, den Rabattcode auslaufen zu lassen.**
Danach gehören Seiten UND Blogartikel durchsucht — Kampagnenseiten fallen auf, Ratgeber nicht.
- Wächter `automation/tote_rabattcodes.py` (täglich im `fixer_keepalive.sh`): vergleicht alle
  EXPIRED-Codes gegen den Text jeder veröffentlichten Seite/jedes Artikels. Meldet nur.
- Ersetzt wurde jeweils durch **WELCOME10** (10%, gültig bis Ende 2027, derselbe Code wie im
  Ankündigungsbalken) — und **ohne konkrete Rabattpreise**, denn «nur CHF 97» veraltet wieder.
- Zwei reine Ankündigungsseiten (`/pages/launch`, `/pages/presse-launch`, «Heute gehen wir LIVE!»
  vom Mai mit drei toten Codes) wurden unveröffentlicht statt geflickt — das Ereignis ist vorbei.
- Nebenbei gefunden: zwei Blogartikel versprachen «Versand 7-12 Werktage» — eine SIEBTE Lieferzeit,
  die der Theme-Durchgang nicht erreicht hatte. Blogtexte gehören in jede Versandaussagen-Prüfung.
⚠️ Der Wächter prüft nur ABGELAUFENE Codes. Erfundene Codes fallen ihm nicht auf: In einem Artikel
stand «WELCOME15», den es nie gab — solche Treffer findet nur ein Abgleich gegen die Code-Liste.

## 💸 «Gratis ab CHF 50» stimmt — die 45 im Versandprofil ist Absicht (2026-08-20)
Beim Nachrechnen sah es aus wie eine verschenkte Kaufschwelle: Im Versandprofil ist die Gratis-Stufe
bei **CHF 45.00** aktiv (die 50er ist deaktiviert), beworben wird überall **ab CHF 50**. Ich war
zweimal davor, alle Texte auf 45 zu ziehen — falsch gewesen. Der Kommentar in `layout/theme.liquid`
erklärt es: **45.00 = 50.00 × 0.9.** Shopify prüft die Regel gegen den Betrag NACH Rabatt; mit dem
automatischen «2+ Artikel −10 %» (und WELCOME10) käme ein Warenkorb mit CHF 50 Warenwert bei 45 an
und hätte den Gratis-Versand sonst verloren. Der Balken im Warenkorb rechnet passend dazu gegen den
**Warenwert VOR Rabatt** (`items_subtotal_price`, SCHWELLE=5000).
**Regel: An 45/50/65 NICHTS ändern, ohne diese Kette zu verstehen** — Zusage (50) ≠ Regelwert (45)
≠ Altstufe (65). Wer die Texte auf 45 zieht, verschenkt echten Versand; wer die 45er Stufe abschaltet,
nimmt rabattierten 50er-Körben den Gratis-Versand weg.

## 🚚 Die fünfte und sechste Lieferzeit sassen im THEME (2026-08-20)
Der Versandaussagen-Lauf vom 14.08. hat 1'037 Produkt-TEXTE auf eine Wahrheit gebracht — die
widersprüchlichen Zahlen standen danach aber weiterhin auf jeder Seite, nur eben im Theme:
- **Jede Produktseite** trug einen Ausklapp-Text «Die Lieferung in die ganze Schweiz dauert in der
  Regel **7–14 Tage**» (Block `text_mGpGAj` in `templates/product.json`). Auf demselben Bildschirm
  sagte die Trustzeile des Produkts «10–20 Werktage» und die Datumsanzeige «3.–17. Sept.».
- **Jede Kollektionsseite** trug eine FAQ «in der Regel **5–10 Werktage**» (`templates/collection.json`).
Beide nennen jetzt die Stufen statt einer Zahl (1–2 / 2–7 / 10–20, POD 7–14) — dieselbe Aussage wie
im Hero («Die Lieferzeit steht auf jeder Produktseite»).
**Lehre: Ein Textlauf über Produktbeschreibungen erreicht das Theme NIE.** Wer Aussagen vereinheitlicht,
muss beide Welten prüfen — Produkttexte UND `templates/*.json` + `sections/*` + `snippets/*`.
Suchmuster für den nächsten Durchgang (alle Theme-Dateien paginiert holen, `first:250` reicht NICHT,
es sind 425): `\d+\s*[–-]\s*\d+\s*(?:Werk)?[Tt]age|ab CHF\s*\d+`.
⚠️ Fehlalarm dabei: In `snippets/meta-tags.liquid` stehen «7–14»/«8–16» nur in KOMMENTAREN, die einen
früheren Bug erklären — nicht anfassen.

## 🔁 Nachkontrolle vom 2026-08-12 — was der erste Aufräumtag ÜBERSEHEN hat
Ein zweiter Fan-out prüfte, ob die Reparaturen vom 11.08. halten. Sie halten — aber vier davon
waren **zu eng gefasst**, und das Muster dahinter wiederholt sich:
1. **Nach dem suchen, was die Kundin SIEHT, nicht nach den eigenen Klassennamen.** Der
   Produktdetails-Reiniger kannte `ls-feed-details` + `ls-produktdetails` und meldete «0 doppelte
   Blöcke». Die Nachkontrolle suchte nach der ÜBERSCHRIFT und fand **1'444 aktive Produkte**, bei
   denen «Produktdetails» weiterhin zweimal untereinander steht — ein dritter Generator schreibt
   `<div class="gmc-details">` mit `<h3>`. Bei 605 widersprechen sich dabei die Materialangaben.
   Wer nach seinen eigenen Spuren sucht, prüft nur die Fehler, die er schon kennt.
2. **Ein Nachfüll-Skript ist die Reparatur, nie die Lösung.** `google_product_category` wurde am
   11.08. von 6 % auf 87 % gehoben; tags darauf trugen **6 von 1'912** Neuimporten den Wert = 0 %.
   Der Importer schrieb ihn nicht mit → die Abdeckung wäre täglich um ~2 Punkte zurückgefallen.
   Exakt derselbe Fehler war Stunden zuvor bei `condition` behoben worden, eine Feldebene weiter
   steckte er unverändert drin. **Regel: Zu jedem Backfill gehört die Frage, wer das Feld beim
   NÄCHSTEN Produkt schreibt.** Jetzt: `automation/google_kategorie.mjs`, vom CJ-Importer benutzt.
3. **Ein Wort zu treffen ist nicht dasselbe wie das Muster zu treffen.** Am 11.08. wurde
   «Blutzucker» aus 11 Armbändern gestrichen. Dieselben Armbänder versprachen weiter **EKG,
   Blutdruck, Harnsäure und Blutfett** — 135 aktive Wearables, alle im Google-Kanal. Ebenso
   fehlten 6 Medizingeräte, weil sie ANDERS HEISSEN: «Hörverstärker» statt «Hörgerät»,
   «Stirnthermometer», «Milchpumpe», «Handgelenk-Lichtwellen-Therapiegerät» (650-nm-Laser, der
   angeblich «Fettschichten um rote Blutkörperchen auflöst»). **Bei Medizinprodukten nach der
   FUNKTION suchen, nicht nach der Produktbezeichnung des Verkäufers.**
4. **Eine frühere Verbesserung hat die Falschangabe erst erzeugt.** Sessions haben den
   Refurb-Zusatz («Restauriert A») aus TITELN gestrippt, damit sie sauber aussehen. Die Aussage
   blieb im Beschreibungstext, das Metafeld `condition` blieb auf `new` → 5 Produkte meldeten
   generalüberholte Ware als fabrikneu. Das ist Misrepresentation, der häufigste Grund für eine
   sofortige Merchant-Kontosperre. **Wer eine Angabe aus einem Feld entfernt, muss prüfen, welches
   ANDERE Feld sie getragen hat.**

## ⚕️ Medizinische Zweckbestimmung: nach der FUNKTION suchen, nicht nach dem Namen (2026-08-14)
12 Geräte standen ACTIVE in allen sechs Kanälen inkl. Google, obwohl sie nach MepV eine
Konformitätsbewertung brauchen: ein **Temperaturpflaster mit 38-°C-Alarm für kranke Kinder**,
zwei Elektrostimulations-Schlafgeräte (CES durch den Kopf / EMS «gegen Angstzustände und
Schlafstörungen»), zwei Gehörgang-Endoskope, zwei Sets gegen eingewachsene Nägel, vier
Ultraschall-Zahnsteinentferner, ein Baby-Pflegeset (0–6 J.) mit klinischem Thermometer.
`medizinprodukte_guard.py` sah keinen davon — er sucht **Produktnamen**, und alle heissen nach
aussen «Gadget», «Beauty», «Haushalt»; ihren Zweck verrät nur der Beschreibungstext.
→ `automation/medizin_zweck_guard.py` (Bestand) + `automation/medizin_zweck.mjs` (Importer)
lesen **dieselbe** Musterdatei `automation/medizin_zweck.json`. `cj_category_fill.mjs` und
`cj_sku_import.mjs` prüfen jetzt VOR dem Anlegen: Treffer → DRAFT + Tag `medizinprodukt-pruefen`,
**nicht publiziert**. Ledger `dropship/_medizin_zweck.txt`, täglich im `fixer_keepalive.sh`.
**Deutsche Zusammensetzungen kosteten drei Probeläufe** (30 → 16 → 10 Treffer, 22 Fehltreffer):
«Ab**hörgerät**» = Wanzendetektor · «Sp**rachen**» traf «Rachen» → ein **Kinder-Lern-Tablet**
galt als Endoskop · «Stethoskop-Herz-**Anhänger**» ist Schmuck · «Stethoskop» Marke Widmann,
«Dr. **Fasnacht**» ist ein Kostüm · «Heizmethode: **PTC-Fieber**» einer Glättbürste ist 发热
(Wärmeerzeugung) · 4 Hunde-Kauspielzeuge «reduziert Zahnstein» · Luftbefeuchter haben einen
«Vernebler» · ein Erste-Hilfe-Set enthält eine Beatmungsmaske.
**Und die Beugung frisst die Wortgrenze am Wortende:** nach dem scharfen Lauf fehlte das
«Elektrische Zahnpflege-Set» — der Text sagt «eines **Zahnreinigers**», der Genitiv hängt ein s
an, `\bZahnreiniger\b` passte nicht mehr. Wortgrenzen gehören an den ANFANG, am Ende `\w*`.
**Abgegrenzt statt mitgenommen** (sonst drafte­t ein Lauf halbe Abteilungen): Beauty-Mikrostrom
(Falten/Augenpartie) ist Kosmetik · EMS-Bauchtrainer ist Fitness, keine Krankheit · «Atemtrainer
für Yoga und Pilates» trainiert Lungenkapazität, nennt keine Indikation · Smartwatches mit
Körpertemperatur/EKG/Blutdruck bleiben der eigenen Wearable-Reparatur (135 Stück) vorbehalten.
**Und: der Voll-Export ist ein Schnappschuss.** Er war vom 12.08.; live lag ein «Kabelloses WiFi
Otoskop» vom 13.08. im Google-Kanal, das darin gar nicht vorkam. Der Wächter kann deshalb mit
`SEIT=JJJJ-MM-TT` direkt aus dem Shop lesen — das ist der Modus für den täglichen Lauf.

## 🛡️ Google-Kanal: 88 sperr-riskante Produkte entfernt (2026-08-12)
Der Kanal ist der einzige mit belegten Verkäufen (Merchant-Screenshot des Users: **52 Klicks,
+206 %, 3'170 Impressionen — praktisch alles organisch**). Entsprechend teuer wäre eine Sperre.
Gefunden und entfernt (`automation/google_kanal_saeubern.py`, Ledger `_google_kanal_gesaeubert.txt`):
32 Rauchzubehör (17 mit Warengruppe «Raucherzubehör» + Tags `raucher`/`18plus` — standen trotzdem
im Feed), 26 Waffen (Klingen als «Küche & Bar» getarnt, gemeldet als «Home & Garden > Kitchen»),
10 fremde Marken im eigenen Titel («im **Chanel**-Stil» → Markenname aus dem Titel gestrichen,
Produkt bleibt), 5 Refurb-als-neu, 5 als `nicht-bewerben`/`nur-onlineshop` markierte (Entscheidung
war getroffen, aber nie in den Kanal durchgesetzt), 5 Cuttermesser (Hausregel, KEIN
Richtlinienverstoss — Unterschied gehört ins Ledger), 4 Erotik. **Das «Faltbare Butterfly-Messer»
ist nach WG Art. 4 eine in der Schweiz verbotene Waffe → DRAFT, Tag `waffengesetz-verboten`.**
⚠️ Fehltreffer, die im Probelauf aufflogen: «Damen Plus-Grössen **Straps** Flachschuhe» und
«**Straps** Gaze Kleid» — das ist das englische Wort für Riemen, nicht «Strapse». «Washed
**Machete** Jeans» ist eine Waschung, «Samurai mit Katana, 30 cm» eine Dekofigur.

## 📐 Google-Kategorie: gegen die ECHTE Taxonomie prüfen (2026-08-12)
`automation/google_kategorie_pruefen.py` lädt Googles Quelldatei
(`google.com/basepages/producttype/taxonomy-with-ids.en-US.txt`, 5'595 Pfade) und prüft jeden
gesetzten Wert. **1'875 waren ungültig.** Der grösste Block war eine bewusste Entscheidung:
Um Smartwatches nicht unter «Schmuck > Uhren» zu legen, zeigte eine Vorrang-Regel nach
«Electronics > … > **Wearable Technology** > Smart Watches». Diesen Zweig gibt es bei Google
nicht — er stammt aus SHOPIFYS Taxonomie («wearable» kommt in Googles Datei kein einziges Mal
vor). Google verwarf den Wert; 204 Smartwatches standen faktisch ohne Kategorie da.
**Ein gröberer richtiger Wert ist im Feed immer besser als ein präziser falscher.**
Das allgemeine Mittel statt einer Fehlerliste: ungültigen Pfad Glied für Glied kürzen, bis ein
gültiger Vorfahr übrig bleibt — so fällt auch jeder KÜNFTIGE Irrläufer weich. Weiter korrigiert:
«Home & Garden > Decor > Party Supplies» → «Arts & Entertainment > Party & Celebration > Party
Supplies» (46), «Barbeque Grills» → «Kitchen Appliances > Outdoor Grills».
**Nummern sind gültig, aber blind:** 1'618 Werte waren reine IDs («1604», «222»). Google nimmt
sie an — nur fällt niemandem auf, dass ein Sticker «Ski» unter «Sporting Goods» und ein
Fahrradhelm unter «Lawn & Garden» steht. Alle in ihren Textpfad übersetzt.

## 💸 «Relativer Boden» ist kein Boden (teuer gelernt 2026-08-12)
2'355 aktive CJ-Produkte lagen unter dem Preisboden von CHF 14.90 — bei 1'012 sogar mit ALLEN
Varianten (Damenkleid einheitlich CHF 4.90, Oversized Hoodie ab CHF 4.90). Bei China-Fracht von
CHF 3–6 ist das je Verkauf ein sicherer Verlust; alle sind `tracked=false` + `CONTINUE`, also
ohne Bestandsbremse. **Der Importer war NICHT die Quelle** — er rechnet
`Math.max(landed*1.4, landed+5, 14.90)` und kann nichts Billigeres anlegen. Gesenkt hat
`google_feed/reprice_to_benchmark.py`: sein Boden war `cur*0.60`, also relativ. Der begrenzt den
einzelnen SCHRITT, nicht das ERGEBNIS — über mehrere Läufe sinkt der Preis geometrisch
(10.90 → 6.90 → 4.90). Absoluter Boden eingebaut; `automation/preisboden.py` hebt den Altbestand
variantenweise an (das repariert nebenbei die 102 Produkte, die mit «ab CHF 4.90» warben, weil
eine Zubehör-«Farbe» wie «Memory card-8G» die billigste Variante war).

## 🧪 Handwerks-Fallen dieses Tages (kurz, aber teuer)
- **Verneinungen lesen.** Ein Massagegerät schrieb «**KEIN** medizinisches Gerät – dient dem
  Wohlbefinden» — das Muster las die Verneinung als Geständnis und hätte es gedraftet. Ebenso
  ist «FDA-zertifiziert» bei einer Trinkwasserpumpe die LEBENSMITTEL-Behörde, kein Medizinsiegel.
- **Krankheitsname ≠ Heilversprechen.** «Nicht kompatibel mit Myopie-Linsen», «Option für Myopie
  verfügbar», «hilft, Karies vorzubeugen» und «um das **Erscheinungsbild** von Besenreisern zu
  verbessern» sind Passform-, Vorbeuge- und korrekte Kosmetikaussagen. Erst Krankheitsname PLUS
  Wirkwort ergibt eine Heilaussage — von 10 Kandidaten blieben 3 echte übrig.
- **Regex-Backtracking auf 31'000 Beschreibungen.** `[^.!?]*WORT[^.!?]*` auf beiden Seiten stand
  nach zwei Minuten noch. Lösung: linear nach dem Wort suchen, die Satzgrenzen danach mit
  Zeichenketten-Operationen bestimmen (`satz_um()` in `heilversprechen.py`).
- **Wird die REGEL erweitert, ist das alte Erledigt-Zeichen wertlos.** Der zweite
  Produktdetails-Lauf hätte mit dem alten Ledger ausgerechnet die 1'595 bereits «erledigten»
  Produkte übersprungen — also genau die, bei denen der dritte Block noch steht. Neue Regel →
  neues Ledger (`_produktdetails_vereint2.txt`).
- **Zu wenig Kontext im eigenen Prüfmuster.** Eine Suche mit `.{50}` vor dem Treffer meldete «0
  Fälle» für die CHF-49-Schwelle — kurze SEO-Texte haben keine 50 Zeichen davor. Erst die
  lockere Prüfung zeigte: die Schwelle ist tatsächlich weg. Ein «0» aus einem zu strengen Muster
  sieht aus wie ein Erfolg.

> 🔗 **ZUERST `SHARED-MEMORY.md` (Repo-Root) lesen** — mehrere Sessions arbeiten parallel auf diesem
> Repo + Shop; dort steht, wer was „besitzt" + der Live-Stand. CJ-Import/Katalog/Social = NUR diese Session.

## 🩺 Fünf Lehren vom 2026-08-11 (Fehlersuche)
0b. **Lehre 1 verschärft (16.08.2026, 8h toter Aufseher):** Der Bracket-Trick (`pgrep -f "[f]ixer…"`)
   schützt NICHT, wenn im SELBEN Compound die Restart-Anweisung den Klartext-Pfad enthält —
   `pgrep -f "[f]ixer_keepalive.sh" || setsid bash …/fixer_keepalive.sh` matcht den eigenen
   Restart-Pfad und meldet 8 Stunden lang «SUP:ok» für einen toten Aufseher. Prozessprüfung in
   Keepalives deshalb IMMER argv-basiert:
   `ps -eo args --no-headers | awk '$1=="bash" && $2 ~ /fixer_keepalive\.sh$/'` — die eigene
   `bash -c`-Hülle hat argv2=«-c» und kann nie matchen.
0c. **Lehre 1 dritter Akt (19.08.2026): Der Aufseher stand in KEINER Neustart-Routine.**
   Beide Stunden-Routinen starteten brav cj_runner2-5, autocommit, reel/social/fortura/hygiene neu —
   aber `fixer_keepalive.sh` selbst stand in keiner Liste. Er liegt im REPO (`automation/`), nicht in
   /tmp, und fiel deshalb durch jedes Raster. Ergebnis: Nach seinem Tod um 19:11 standen ALLE täglichen
   Wächter still (Medizinprodukte, Ads-Kuration, Versandaussagen, Hype-Reihe, Preisboden, Alt-Texte,
   Video-Backfill) — und keine der stündlich feuernden Routinen meldete etwas, weil jede nur ihre
   eigene Liste prüfte und die war «grün». **Ein Wächter, der nicht selbst bewacht wird, ist keiner.**
   Beide Routinen tragen ihn jetzt als ERSTEN Punkt. Bei jeder neuen Engine dieselbe Frage stellen:
   *wer startet DICH neu?* — und: liegt sie im Repo statt in /tmp, prüft sie keine /tmp-Schleife.

0d. **Lehre 1 vierter Akt (20.08.2026): `exec` löscht den Namen, nach dem die Wächter suchen.**
   Beide Stunden-Routinen prüften `index($0,"cj_runner2.sh")` — der Wrapper `/tmp/cj_runner2.sh`
   endet aber auf `exec bash /tmp/cj_runner_template.sh cj_runner2`, und `exec` ersetzt den
   Prozess: in der Prozessliste steht **`cj_runner2` ohne `.sh`**. Die Prüfung fand deshalb NIE
   einen laufenden Runner und startete **stündlich vier neue** — gefunden wurden **12 Runner in
   drei Generationen**, die sich CJs Limit von 1 Anfrage/Sekunde teilten und sich gegenseitig
   drosselten. Der Grind lief also langsamer, je zuverlässiger die Wächter feuerten.
   ⚠️ Mir selbst ist derselbe Fehler in derselben Minute passiert: Ich prüfte mit
   `grep "cj_runner[0-9].sh"`, sah 0, und startete vier weitere dazu.
   **Regel: Eine Prozessprüfung wird gegen die ECHTE Kommandozeile geschrieben — erst
   `ps -eo args` ansehen, dann das Muster wählen. Nie gegen den Dateinamen, den man gestartet
   hat.** Zweite Regel: Die Startliste gehört an EINE Stelle im Repo, nicht in zwei
   Routine-Prompts, die auseinanderlaufen → `automation/engine_keepalive.sh` (idempotent,
   räumt Doppelstarts ab, beide Routinen rufen nur noch dieses Skript).

0e. **Lehre 1 fünfter Akt (20.08.2026): Die Wache, die den Aufseher schützen sollte, hat ihn
   getötet — «kleinere PID = älter» stimmt nicht.** Der Aufseher hat eine zweite Wache gegen
   Doppelstarts: «Wer eine KLEINERE PID sieht, tritt ab», mit der Begründung, der älteste
   gewinne damit immer. **Der PID-Zähler läuft aber um.** In diesem Container standen
   gleichzeitig PID 3601 (50 Minuten alt) und PID 29404 (70 Minuten alt) — die kleinere Nummer
   gehörte dem JÜNGEREN Prozess; ein frisch gestarteter Aufseher bekam PID 314. Folge: Der
   wirklich älteste sah eine «kleinere PID», hielt sich für den überflüssigen Zweitstart und
   trat ab. Im Log steht es wörtlich: «21:20 älterer Supervisor läuft weiterhin (PID 11195
   tritt ab)» — 11195 war der Älteste. Weil jeder Neustart die Nummern neu würfelt, stand der
   Aufseher immer wieder still, und mit ihm ALLE täglichen Qualitäts-Wächter. Das ist die
   Erklärung für die Ausfälle, die hier schon zweimal als «flock-Semantik offenbar nicht
   verlässlich» notiert waren — flock war nie das Problem.
   Entschieden wird jetzt nach **LAUFZEIT** (`ps -o etimes`), die ist monoton und kennt keinen
   Überlauf; die PID bleibt nur Schiedsrichter bei exakt gleicher Sekunde.
   **Regel: Eine PID ist ein Name, kein Zeitstempel.** Wer Prozesse nach Alter ordnen will,
   fragt nach der Laufzeit. Und: ein leeres Log ist kein Beweis für einen stillen Tod — mein
   Startbefehl hatte es mit `>` bei jedem Versuch selbst geleert (jetzt `>>`).

0f. **Lehre 1 sechster Akt (21.08.2026): Eine Wache kann sich nicht auf sich selbst verlassen.**
   Der Aufseher hat gleich ZWEI eigene Sperren (flock plus Laufzeit-Vergleich, siehe 0e) — und
   trotzdem liefen zwei Instanzen zwölf Minuten nebeneinander. Der Grund ist strukturell: Der
   zweite hing in `do_wait` auf ein Kind. **Ein Prozess, der irgendwo wartet, erreicht seine
   eigene Wache nicht mehr** — die Prüfung steht am Schleifenanfang, und dorthin kommt er nie
   zurück. Egal wie gut die Selbstprüfung ist, sie läuft nur, solange der Prozess läuft.
   Deshalb räumt `engine_keepalive.sh` Doppel-Aufseher jetzt **von aussen** ab (ältester
   bleibt) — genau wie bei den Runnern. **Regel: Selbstprüfung ist die erste Verteidigung,
   nie die einzige. Wer garantieren muss, dass es einen Prozess nur einmal gibt, prüft das
   von einer Stelle aus, die nicht derselbe Prozess ist.**

1. **`pgrep -f <name>` findet die EIGENE Kommandozeile.** Ein `pgrep -f social_autopilot && echo läuft`
   meldete «läuft» für ein Skript, das gar nicht mehr existierte — das Suchmuster stand im eigenen
   Bash-Aufruf. Prozessprüfungen deshalb mit `ps -eo args | grep …`, oder das Muster nicht im Aufruf
   nennen. Ein halber Tag toter Social-Autopilot galt so als gesund.
2. **Was nur in /tmp lebt, ist verloren** (zweites Mal nach 2026-06-06). `social_autopilot.sh` und
   `reel_engine_runner.sh` standen als Dauerläufer im Gedächtnis, existierten aber nur unter /tmp und
   waren nach dem Wipe weg. Beide liegen jetzt in `automation/` und werden vom Supervisor gestartet.
   **Regel: Ein Dauerläufer, der nicht committet ist, existiert nicht.**
3. **Eine 0 im Lagerstand kann eine Aussage sein, keine Nachlässigkeit.** Beim POD-Shirt stand 5XL auf 0,
   acht andere Grössen auf 9999 — sah nach vergessenem Wert aus. Printful-Abfrage: 5XL ist NUR im
   US-Lager (`US=in_stock`, kein EU), die anderen Grössen in EU/UK/CA. Die 0 war korrekt. Statt
   «auf 9999 heben» wurde `DENY` gesetzt. **Vor jeder Bestandskorrektur den Lieferanten fragen.**
4. **`cj()` in cj_category_fill.mjs hatte weder Zeitgrenze noch Wiederholung.** Der Proxy antwortete mit
   dem nackten Text «DNS resolution failure» → `r.json()` warf → der ganze Runner starb → das
   Runner-Skript deutete es als Punktemangel und schlief 30 Minuten. Jetzt: 5 Versuche, Text-Parse
   abgesichert, QPS-Antwort 1600200 wird abgewartet (CJ zählt 1 Anfrage/s über ALLE Prozesse gemeinsam,
   4 Runner reissen das Limit zwangsläufig).
5. **Google-Gratis-Einträge ≠ bezahlte Anzeigen.** `gfeed_score.py` schloss 5'047 Produkte wegen
   «Preis unter 15» und «unter 3 Bildern» aus — beides sind Anzeigen-Qualitätsregeln. Merchant verlangt
   genau EIN `image_link` und kennt keine Preisuntergrenze. Google ist der einzige Kanal mit belegten
   Verkäufen (4 von 10 Bestellungen; TikTok: keine). **4'330 Produkte zurückgeholt** (Kanal 13'184 →
   25'092 von 29'049 aktiven). Draussen bleiben Kostüm/Erotik/Refurb (Kontosperre-Risiko) und
   Code-Titel. ⚠️ Die Gründe in `gfeed_score.py` stehen in einer `elif`-Kette — **nur der erste
   zählt**; beim Zurückholen müssen die übrigen Bedingungen live nachgeprüft werden (0 Bilder =
   sichere Merchant-Ablehnung).
6. **«Keine Lieferanten-SKU» war zu eng definiert — 845 von 919 Fehlalarmen.** Der Test
   `sku.startswith(("CJ-","bb-","fortura-"))` kannte nur EINE der gültigen Formen. Wahrheit über
   alle 29'046 aktiven Produkte: 472 Printful-POD (`5599797_4012`), 346 **CJ-Varianten-SKU**
   (`CJYD…`/`CJLY…`/`CJLX…` — dieselbe Form, die `cj_versand_ch_guard.py` längst kennt), 15 eigene
   Bündel (`LX-…`), 12 BigBuy in GROSSschrift (`BB-V0100921`) — alle bestellbar. **Wirklich
   unprüfbar sind nur 74**, davon ~30 hand-kuratierte Altprodukte aus den ersten Sessions
   (WATCH-001, WALLET-BLK, LED-001 …) und ~11 mit AliExpress-Attributstrings (`14:691;5:200000990`).
   Dazwischen stehen echte Bewertungssieger (Herrenuhr 5,0★) — pauschales Draften wäre teuer.
   Gemeinsamer Test jetzt in `gfeed_restore.lieferantenref()`; 269 Produkte zurückgeholt.
   **Offen: die ~30 Altprodukte über CJ-Suche wieder an eine pid binden** (CJ-Punktebudget nötig).

## 🖼️ Startseite: das CH-Lager ist ein Fasnachts-Grosshandel (Screenshot-Studie 2026-08-11)
Der Screenshot der Startseite zeigte als **erste acht Artikel** des «Premium-Style»-Shops: Badeset Dino,
Pappbecher aus Frischfaser, Plüsch Alligator, **Plüsch Pikachu** (Lizenzware!), Magic Wasser Ballone,
Plüschwolf. Ursache war nicht das Theme, sondern der Tag `blitz-front` (Kollektion ⚡ Blitzversand-Highlights):
302 Artikel, davon **195 Spielzeug + 42 Partydeko = 78 %**. Dahinter die unbequeme Wahrheit über das
Schweizer Lager insgesamt: von 2'593 CH-Artikeln sind **2'194 Kostüme** und 243 Spielzeug — Fortura ist im
Kern ein Fasnachts-/Party-Grosshandel. Das «Blitzversand ab CH-Lager in 1–2 Tagen»-Versprechen stimmt, die
Ware dahinter passt aber nicht zur Marke. `automation/blitzfront_kuratieren.py` hat 243 Artikel aus der
Startreihe genommen (bleiben 59: Beauty-Sets, Taschen, Wohnaccessoires, Schweizer Editionen); die Artikel
bleiben im Shop und in der Kollektion `blitzversand-schweiz`. **Fallen dabei:** (1) Einweggeschirr steht als
«Haushalt & Wohnen» im Katalog und rutscht durch jede Warengruppen-Prüfung — per Titel fangen; (2) die
Kollektionsbeschreibung versprach danach noch «Plüsch … Party» → nach jeder Kuratierung den Text nachziehen;
(3) `products(first:20)` fand die Lostrommel nicht (Relevanz-Sortierung) — bei Einzelsuchen die volle Liste ziehen.
**Offen für den Betreiber: Lohnt die Startseiten-Reihe überhaupt?** Ohne Kostüm/Spielzeug bleiben nur ~59 Artikel.

## 🔎 Google-Produktkategorie + Kategorie-SEO (2026-08-11)
`automation/google_kategorie.py` setzt `mm-google-shopping.google_product_category` als **Text-Pfad**
(«Apparel & Accessories > Jewelry > Watches» — so liegen die vorhandenen Werte im Shop; Nummern-IDs
bewusst NICHT, eine falsch erinnerte Zahl fällt niemandem auf). Abdeckung **6 % → 90 %** (22'834 Produkte).
Drei Ebenen: (1) Titel-Vorrang für Smartwatch/Fitness-Tracker → Wearable Technology (der Tag `uhren`
hätte sie zu Schmuck-Uhren gemacht), (2) Katalog-Tags, (3) `productType` als Auffangnetz
(Auto-Zubehör/Basteln/Taschen/Gaming/Werkzeug…). **⛔ NIE vorhandene Werte überschreiben** — der Probelauf
zeigte 1'208 Verschlechterungen (Smartwatch→Jewelry, Laptoptasche→Electronics, Perfume→Cosmetics);
Abweichungen landen zum Nachsehen in `dropship/GOOGLE-KATEGORIE-ABWEICHUNGEN.md`.
**Auch die Warengruppe irrt:** unter «Spielzeug & Spiele» stehen 8 Kleidungsstücke («Plüschjacke»,
«Plüschmütze») — Kleidungswort im Titel sticht die Warengruppe. «Trend-Gadget» (874) + «Trend-Produkt» (165)
bleiben bewusst ohne Kategorie: Sammelkörbe ohne gemeinsame Warengruppe, falsch wäre schlimmer als leer.
Dazu 13 Kategorie-SEO-Beschreibungen gesetzt (`automation/koll_seo_fuellen.py`, ~150 Zeichen, nur geprüfte
Aussagen: gratis ab CHF 50 / 30 Tage Rückgabe — **kein** «Blitzversand» ausser für CH-Lager-Ware).
**Kollektions-Audit:** 505 Kollektionen, 3 leer (alle unveröffentlicht = harmlos), 20 dünn. Die
unveröffentlichten Grossen (`uhren-herren` 543, `beauty-duefte` 1290, `damen-jacken` 377) sind
**Doppelgänger** der Menü-Kategorien (`herren-uhren`, `parfum-duefte`, `damen-jacken-maentel`) — zu Recht aus,
nicht freischalten. `schule-buro` war live mit **1** Produkt mitten im Schulanfang → auf Smart-Regel
`schule-buero` umgestellt, 27 Produkte (`automation/schule_buero_fuellen.py`).

## 🧨 URSACHEN statt Symptome (20-Agenten-Audit, 2026-08-11)
Ein Fan-out über 20 Prüfdimensionen auf einem lokalen Voll-Export (`/tmp/export.jsonl`, 51'791 Zeilen)
fand drei Fehler, die **täglich neu entstanden**, weil nur das Ergebnis geputzt wurde, nie die Quelle:
1. **«Gratis-Versand ab CHF 65» war in 12 Importern fest verdrahtet** (24 Stellen). `seo_versandschwelle_fix.py`
   korrigierte sie, der CJ-Grind legte täglich neue an — 4'514 der Betroffenen stammten aus August, also
   NACH dem Korrekturlauf. Quelle korrigiert; Runner neu gestartet (alter Code lebt sonst im Speicher weiter).
2. **`versand_widerspruch_fix.py` schrieb CHF 50 → 65 ZURÜCK.** Zwei Reiniger mit gegensätzlichem Ziel:
   je nachdem, wer zuletzt lief, stand im Shop mal das eine, mal das andere. Richtung umgedreht.
   **Regel: Bei jeder Textregel prüfen, ob ein anderer Reiniger dieselbe Stelle gegenläufig anfasst.**
3. **`condition` fehlte bei ALLEN neu importierten Produkten** (1'856 von 1'856 am 11.08.). Die Backfill-
   Skripte unter `automation/google_feed/` laufen einmalig; was der Importer nicht mitschreibt, fehlt am
   nächsten Tag wieder. Jetzt setzt `cj_category_fill.mjs` condition=new + color aus der Farb-Option mit.
   Dazu: der Material-Extraktor griff über das Materialwort hinaus («Polyester **Style**» 174×,
   «Plastic **Packing list**» 73×) — 4'566 von 4'924 Werten waren Müll. Jetzt nur noch das Materialwort.
4. **Bild-Quittung vor dem Veröffentlichen.** «Outdoor Camping Gerades Messer» stand live im Shop UND im
   Google-Kanal mit 7 Medien im Status FAILED und **keinem** sichtbaren Bild (`mediaCount`>0, aber
   `featuredMedia`=null — daran erkennt man es im Export). Importer publiziert jetzt nur mit ≥1 READY-Bild.
5. **1'084 Produkte in den Google-Kanal nachgezogen** (`automation/google_kanal_nachziehen.py`). Von 3'686
   aktiven Nicht-Google-Produkten bleiben 2'602 bewusst draussen: 2'435 heikel (Kostüm/Erotik/Refurb/Messer
   — **auch Shisha/Vape/Tabak**, der erste Entwurf hätte eine Shisha für CHF 104.90 publiziert), 95 Code im
   Titel, 72 ohne Lieferanten-SKU.
⚠️ **Der Export ist ein Schnappschuss.** Agenten meldeten 7'680 falsche Versandschwellen — live waren die
Stichproben längst korrigiert, weil ein Reiniger parallel lief. Befunde gegen die Live-Daten gegenprüfen.

## 🩻 Medizinprodukte + falsche Gesundheitsversprechen (2026-08-11)
**Gefunden über die Shop-Suche**: «Ventilator» lieferte im August als ERSTEN Treffer ein
«Ventilator Nasenpolster-Set» (CHF 45.90) — Zubehör für eine **Beatmungsmaske**. Im Englischen
heisst das Gerät «ventilator», im Deutschen «Beatmungsgerät»; die Übersetzung war wörtlich
übernommen. Die Spur führte zu **14 aktiven Medizingeräten**: 8 Hörgeräte (CHF 40–79), ein
Hörtest-Headset (CHF 200.90), ein **Fetusstethoskop**, 2 Atemtrainer/Notfallmasken, ein
Ultraschall-Vernebler. Nach MepV brauchen die eine Konformitätsbewertung; Hörgeräte werden zudem
angepasst, nicht versandt. → alle auf DRAFT mit Tag `medizinprodukt-pruefen` (nicht gelöscht —
mit Unterlagen wieder freischaltbar). `automation/medizinprodukte_guard.py`.
**Dazu 11 Wearables mit Blutzucker-Versprechen** («Smart Armband mit EKG, Blutzucker- &
Körpertemperaturmessung», CHF 59.90). Kein Konsumenten-Armband misst Blutzucker durch die Haut —
wer als Diabetikerin darauf vertraut, riskiert eine Unterzuckerung. Behauptung aus Titel und Text
gestrichen, Produkte bleiben aktiv.
⚠️ **Zwei Fehltreffer NICHT anfassen**: «Silberoxid-Knopfzellen» nennt Blutzuckermessgeräte als
Einsatzzweck der Batterie, «Saure Zungen» führt Glukosesirup in der Zutatenliste. Das Muster
greift deshalb nur bei Armband/Uhr/Ring.
**Suche danach gegengeprüft**: «Ventilator» liefert jetzt echte Lüfter, «Hörgerät» nur noch ein
Reinigungsset (Zubehör, kein Gerät).

## 🔗 Tote Verweise in Produkttexten (2026-08-11)
Jede Beschreibung endet mit «👉 Passt dazu: …». Von 34 Zielen liefen 3 ins Leere:
`beauty-geraete` (20× verlinkt), `handwerkzeug`, `elektrowerkzeug`. Ursache war NICHT ein falscher
Link, sondern die **Publish-Falle**: Die Kollektionen existieren mit 58/275/96 Produkten, waren
aber nie im Onlineshop veröffentlicht. Freigeschaltet + Text/SEO ergänzt, alle drei liefern 200.
**Von 80 Kollektions-Links in allen Menüs zeigt keiner auf eine unveröffentlichte Kollektion.**
82 weitere unveröffentlichte Kollektionen (≥20 Produkte) sind Doppelgänger der Menü-Kategorien
(`damenschuhe` vs. `damen-schuhe`) — bleiben zu Recht aus, sonst konkurrierende Seiten.
⚠️ Bei schnellen Link-Prüfungen antwortet luxestyle.ch mit **429**; das ist die eigene Drosselung,
kein toter Link. Mit Pause nachprüfen, bevor man es als Fehler meldet.

## 🧽 Kundensichtbarer Text bereinigt (2026-08-11, «mache alles fehler frei»)
- **42 Beschreibungen**: Lieferantencodes aus dem Farb-/Variantentext («Farben: CK228-1, CK228-2»,
  «Farbe: RM47-Plaid» → «Farbe: Plaid»). `automation/farbcode_bereinigen.py`.
  ⚠️ Mein erster Entwurf ersetzte JEDEN Bindestrich durch ein Leerzeichen, um Reste zu glätten —
  «Retro-Glam»→«Retro Glam», «Hip-Hop»→«Hip Hop», «Kürbis-Orange»→«Kürbis Orange». 20 einwandfreie
  Texte wären verschlechtert worden. **Nur an den Rändern aufräumen, nie innen.**
- **81 Titel**: Artikelnummern am Titelende entfernt («Sport-Yoga Jumpsuit 88201»).
  `automation/titelcode_entfernen.py`. **41 Codes bewusst BELASSEN**: bei 7× «Taillierte Jeansjacke
  für Herren – Y110S/Y101S/…» ist der Code das EINZIGE Unterscheidungsmerkmal — ohne ihn gäbe es
  sieben identische Titel, aus einem Schönheitsfehler würde ein echter Katalogfehler.
  ⚠️ Schutzliste Pflicht: **UV400** (UV-Schutz), **TR90** (Rahmenmaterial), **RF433** (Funkfrequenz),
  **SR626SW** (Batterie), **2025/2026** (Modell-/Saisonjahr) sind Aussagen, keine Artikelnummern.
- **1'316 Produkte**: englische Farbwerte in der Varianten-Auswahl übersetzt («Dark Gray»→«Dunkelgrau»).
  `automation/farbwerte_uebersetzen.py` (Mutation `productOptionUpdate` + `optionValuesToUpdate`).
  Grösse-Farbe-Kombis («L-Black», «Black-1XL») bleiben unangetastet — dort ist die STRUKTUR falsch,
  nicht die Sprache. Bei «Option value already exists» (Option trägt «Gray» UND «Grau») wird
  übersprungen, sonst würden zwei Varianten verschmolzen.
- **17 Keyword-Monster-URLs** gekürzt (bis 150 Zeichen, «herrenhose» 3× in einer URL), je mit
  301-Weiterleitung; alt→301 und neu→200 live geprüft. `automation/handle_kuerzen.py`.
- **Kassentest nach allen Eingriffen bestanden**: Variante mit Bestand in den Warenkorb → CHF 34.90;
  bei CHF 69.80 bietet der Shop Gratis-Versand UND Standard CHF 7.00. Leere Grössen sind korrekt
  `availableForSale=false`.

## ✅ Geprüft und SAUBER (2026-08-11 — nicht erneut durchkämmen)
- **29'225 aktive Produkte:** 0 ohne Bild, 0 ohne Preis, 0 ohne Beschreibung. Produkt-SEO-Beschreibung
  fehlt bei **5**. (SEO-*Titel* fehlt bei 24'190 — das ist KEIN Mangel: Shopifys Vorgabe
  «Produkttitel – Shopname» ist meist besser als ein selbstgebauter.)
- **Übersell-Risiko:** von 316'146 Varianten mit Bestand 0 waren nur 26 `tracked+CONTINUE` → behoben.
- **Teure Ware:** nur **8** aktive Produkte ab CHF 300, alle Fortura/CH-Lager (Kinder-Elektroautos,
  Halloween-Animatronics). Die CHF 1'000–3'100-Elektronik (Samsung-Tablet, 100"-TVs, Videowall,
  «Generalüberholt») ist durchweg **DRAFT**. ⚠️ Die Kollektions-Abfrage im Admin zeigt Entwürfe MIT —
  `products(first:n)` auf einer Kollektion ohne Status-Filter täuscht «aktiv» vor.
- **Kollektionen:** 3 leer (alle unveröffentlicht), 20 dünn, 0 tote Menü-Links.
- **Titel-Anglizismen:** 459 vorgemerkt, davon nur einige Dutzend echt unübersetzt — «High-Waist»,
  «Loose-Fit», «Slim Fit» sind im CH-Modehandel normal, kein Fehler.
- **Abgebrochene Warenkörbe:** 10 offen (CHF 570.61), der jüngste vom **4. Juli**. Seither erreicht
  fast niemand die Kasse — Rückhol-Mails wären sinnlos, der Engpass liegt VOR dem Warenkorb.
- **Startseiten-Reihen** (alle 12 geprüft): kein Kostüm/Plüsch/Lizenz mehr. Einzelfund «Badeset Dino
  **Duft** Apfel» führte «Parfum & Düfte» an (Tag `parfum`) → entfernt.

## 📦 Schatten-Bestellungen bei CJ (2026-08-11)
Zu JEDER Shopify-Bestellung seit #1001 liegen bei CJ **zwei** Aufträge: einer unter der Shopify-Nummer
(«#1012», von der CJ-eigenen Shopify-App) und einer unter «LX1012» (von `cj_order_engine.py`). Der Automat
bezahlt nur die LX-Variante (`cj_bestellungen()` legt «#1012» als «1012» ab, gesucht wird «LX1012») — es droht
also kein automatischer Doppelkauf. **Gefährlich wird es, wenn jemand in der CJ-Konsole den zahlbaren Schatten
begleicht**: dieselbe Ware ginge zweimal raus, der Shop zahlte zweimal. `cj_fulfill_engine.schatten_warnen()`
meldet jetzt jeden Schatten MIT Preis. Gelöscht wird nichts automatisch — das sind Aufträge beim Lieferanten.

## ⚠️ CJ-Grind-Plateau-Falle (teuer gelernt 2026-07-29)
Wenn der CJ-Ledger flach steht, ist es MEIST **keine** Token-/Punkte-Panne — Token prüfen zeigt oft `code:200`,
Punkte reichlich. Diagnose-Reihenfolge: (1) `product/list?categoryId=…` liefert `data.total` >0 (Katalog da);
(2) im Runner-Log ist „Rings: total 0" der **eigene Import-Zähler** (Zeile 285 cj_category_fill.mjs), NICHT die
API-total → es wurden 0 NEUE gefunden, alle schon im Ledger. **Ursache: DEPTH-Reset.** Runner rampen
`DEPTH=15+ROUND*3`, aber jeder Keepalive-Neustart (bei totem Prozess) setzt ROUND=1 → flache Top-Seiten sind
nach 19k Importen erschöpft → 0 neu. **Fix: Basis-Tiefe hoch** (15+ROUND*3 statt 5+ROUND*2), damit Runde 1 schon
tief (Seite ~18) greift. ⚠️ **Zweite tote Spur: `countryCode=DE/CZ/PL/…` (EU-Lager-Filter) gibt CJ-weit `total 0`**
— CJs product/list-Warehouse-Filter liefert für EU nur noch 0, nur CN/US haben Bestand. WAREHOUSE-Env darum leer
lassen (CN-Fracht 3–6 CHF ist ok). ⚠️ **Präzisiert 20.08.2026: das gilt für den FILTER, nicht für die
Wirklichkeit.** Stichprobe aus der Startseiten-Reihe «EU-Lager — Schnell geliefert»:
`product/stock/queryByVid` meldet für beide geprüften Artikel **Germany Warehouse mit echtem Bestand**
(88 bzw. 46 Stück) — die Zusage «2–7 Werktage» ist dort also gedeckt. Wer EU-Ware sucht, fragt den
Bestand je vid ab, nicht den Katalogfilter; und wer die EU-Aussage «korrigieren» will, prüft ERST den
Bestand, sonst repariert er eine wahre Aussage kaputt. /tmp-Runner-Scripts überleben keinen Wipe → Fix bei Neuaufsetzen mit einbauen.
**⚠️ Dritte Falle: 30-Min-Strafschlaf (2026-07-29).** Runner deuten JEDEN `RC≠0` als „Punkte weg? Pause 30min" —
aber der echte Grund ist meist **Gleichzeitigkeit beim Restart** (alle 5 Runner treffen Shopify-OAuth `shTok()` +
CJ-`getAccessToken` (1×/300s-Limit!) zugleich → transiente Drossel → `exit 1`). Ein einzelner cj_category_fill-Lauf
mit frischem Token exit IMMER 0 (verifiziert: legt Produkt an). Fix: (1) Strafschlaf `sleep 1800`→`120` (Punkte sind
reichlich, langer Schlaf war für echten Punktemangel, der hier nie eintritt — der crasht nicht, gibt nur total 0);
(2) Runner **gestaffelt** starten (3s Abstand), nie alle gleichzeitig. Beides bei Neuaufsetzen der /tmp-Scripts einbauen.
**⚠️ Vierte Falle: ROUND-Reset frisst den Tiefen-Ramp (2026-07-29).** Turn-Reaping killt die Runner ~jede Runde →
Neustart setzt `ROUND=0` → Tiefe fällt auf Minimum → Runde-1-Kategorien (Schmuck/Uhren/Makeup) sind erschöpft →
`FERTIG: 0`. Fix: ROUND **persistent** machen — `ROUND=$(cat /tmp/<runner>_round||echo 0)` + nach jedem `ROUND+1`
`echo $ROUND > /tmp/<runner>_round` (wrap bei >25 auf 1 für Neu-Sweep frischer Katalog-Ware). So wächst die Paginierungs-
Tiefe über Neustarts hinweg weiter statt jedes Mal die erschöpften Top-Seiten neu zu scannen. /tmp-Persist-Dateien
`/tmp/cj_*_round` überleben keinen Wipe → bei Neuaufsetzen mit 6 seeden (Tiefe ~33).
**⚠️ Fünfte Falle: unerschöpfte Gruppen fehlten in der Rotation (2026-07-30).** Die Runner-`for G in …`-Listen deckten nur ~18 der 27 GROUPS ab — `cjelektronik gaming cjauto nagel musik cj3d cjspielelektronik cjschuhedamen cjschuheherren` waren in KEINEM Runner → während Schmuck/Damen/Uhren erschöpft flach standen, lag frische Ware brach. Fix: diese 9 Gruppen jeder Runner-Rotation voranstellen (Ledger dedupt Overlap). Bei /tmp-Neuaufsetzen mit einbauen.

Dieses Repo ist `aban-news-landing`, enthält aber mehrere Projekte. Das aktive, autonome
Arbeitsgebiet ist der **CJ-Dropship-Import für den Shopify-Shop LuxeStyle CH**.

## 🎯 MISSION (User 2026-07-08, wörtlich): «hole dir 100 kunden, vertiefe alles, merke alles»
**Ziel: 100 zahlende Kunden** (Stand 08.07.: 5). Jede Session arbeitet dahin: Traffic-Qualität
(TikTok-Ads läuft, Google-Gratis-Listings erster Klick, Pinterest im Aufbau), Conversion
(Warenkorb-Abbrecher: CHF 630 in 11 Checkouts entdeckt → native Shopify-Automation aktivieren!),
Sortiment (CJ-EU-Lager + Editor), Vertrauen (UID/Einzelfirma GEGRÜNDET 08.07., HR pendent →
Zefix-PDF für TikTok-Verifizierung, CHE-Nr. für Pinterest-Steuerfeld).

## 🤖 Autonom-Auftrag (Dauerauftrag des Users)
Der User will den Shop **vollautonom betrieben — ohne ‚weiter' zu sagen. Oberstes Ziel: KUNDEN,
die KAUFEN.** Mehr Produkte sind dabei Mittel, nicht Selbstzweck. Bei jeder Dropship/Shop/CJ-Session:

1. **Lies zuerst `dropship/AUTONOMER-MODUS.md`** — vollständiges Runbook inkl. **§9 Master-Lessons**
   (alle teuer gelernten Fallen) und **§10 Kunden gewinnen** (was autonom geht, was nur der User kann).
2. **Lies `dropship/CJ-IMPORT-LOG.md`** für Produktliste & Historie.
3. Dann **einfach loslegen** (Conversion-First-Routine, §10): Autopilot-Drafts veredeln → ACTIVE →
   publizieren; QA auf FAILED-Bilder; Heroes/Copy/Collections/SEO verbessern; bei Bedarf 1–2 saubere
   Produkte ergänzen. Committen, auf **`claude/luxestyle-product-CizQ6`** pushen (fester Dropship-Branch,
   vom User 2026-06-07 festgelegt), Draft-PR nach `main`, Stand melden.
   Nicht nach Erlaubnis fragen — der Auftrag steht. Nur die 3 User-Klicks (AGB-Fix, Pixel,
   Kampagne+Budget, §10) kann ich nicht selbst — die klar benennen.

## 🧠 GEHIRN — Eiserne Regeln (User-Auftrag 2026-07-06: «merken wie die andere Session!»)
> Jede Session MUSS diese Regeln lesen und NEUE teuer gelernte Lektionen SOFORT hier eintragen
> (nicht erst am Session-Ende — Container kann jederzeit sterben).
1. **Turn-Ende = committen + pushen.** Laufende Engines erzeugen Ledger-Drift → vor jedem
   Antwort-Ende `git add dropship/ && git commit && git push` (Stop-Hook meckert sonst zu Recht).
   Auto-Committer (5-Min-Loop) IMMER mitstarten, deckt aber nur `dropship/` ab.
2. **Keine Duplikate anlegen:** Importer haben Titel-Wache (query title:"…") + Bild-Wache
   (BigBuy `bigbuy_img_seen.txt`). NIE einen Importer ohne diese Wachen bauen/forken.
   Katalog-Heilung: `automation/dup_title_fix.mjs` (Titel) + `automation/dedup_by_image.mjs`
   (Hauptbild, braucht Bulk-Export). Duplikate → DRAFT mit Tag `duplikat-auto-draft` (nie löschen).
3. **Keine Lieferanten-Leaks im Kundentitel:** «Ref. BB-…», «CJ», SKU-Codes → Importer strippen
   das; bei Funden sofort bereinigen.
4. **Editor/POD («Selbst gestalten») ist heilig:** Canvas-Bilder NUR über
   `upload_to_shopify_cdn.mjs` (URL aus der Antwort, nie raten — 24×404-Falle!). Nach jeder
   POD-Änderung `automation/pod_editor_qa.mjs` laufen lassen (0 Befunde Pflicht). Vorschau muss
   dem ECHTEN Produkt entsprechen (Trikot-Falle: Streifen/Badge erfunden → Vision-Vergleich
   gegen Printful-Order-Mockup).
5. **Vision-QA nutzen:** Kontaktbogen (PIL-Grid) aller Hauptbilder einer Kollektion → per Vision
   prüfen. Funde wie «Electrolux Kühlschrank-Matte als ‹Mauspad›» oder Waffen-Collagen sofort
   fixen (Titel/Hero-Bild/Tags) oder draften.
6. **Container stirbt oft:** Nach JEDEM Neustart Engines prüfen (`ps aux | grep mjs`) und per
   Neustart-Rezept (CLAUDE.md §Stand 07-06 / SHARED-MEMORY) wieder hochfahren. /tmp überlebt meist.
7. **pkill in EIGENEM Bash-Call** (Exit 144 killt sonst den Folgebefehl im Compound).
8. **MCP-Konnektoren:** Container-Neustart trennt sie; laufende Session dockt erst nach
   User-Klick «Verbinden» wieder an. Assets vorher auf Shopify-CDN stagen = nichts verloren.
9. **Groq-Titel prüfen:** 8b-instant erfindet Produktkategorien (Frischematte→«Mauspad»).
   Bei Import unklarer Artikel (BigBuy-CSV ohne Kategorie-Anker) Titel gegen Bild plausibilisieren.
9c. **Umlaut-Dubletten-Falle (2026-07-08):** Titel-Wachen MÜSSEN normalisieren (ä→ae, ß→ss,
   lowercase) — «Reinigungsgerät» und «Reinigungsgeraet» wurden beide angelegt. cj_sku_import hat
   jetzt norm()-Vergleich + eigene Bild-Wache (cj_niche_img_seen.txt). Bei neuen Importern beides einbauen.
9b. **Tag-Chirurgie NUR mit Dry-Run + Wortgrenzen (teuer gelernt 2026-07-06 ×2):** Regex
   «schleif» traf «Schleife» (Masche!), Anker «rock» traf «GT Line ROCK» (Werkzeugkoffer!).
   Regel: Massen-Tag/Titel-Änderungen IMMER erst DRY mit Ausgabe prüfen; Wortformen deutsch
   denken (Schleife/Schleifer, Rock/ROCK); Fashion-Guard-Ausnahmen mitführen.
10. **⛔ Social-Doppelpost-Verbot (User 2026-07-06):** IMMER nur NEUES posten — vor jedem Post
   Profil + `automation/reels_seed.csv`-Ledger prüfen (nur status=ready, nach Post → posted).
   Gleiches Produkt/Video/Motiv nie zweimal, auch nicht plattformübergreifend am selben Tag.
   **⛔ THREADS-STOPP (User 2026-07-07): auf Threads NICHTS mehr posten, bis Follower da sind.**
   **🤖 Social-Autopilot IG+FB LIVE (2026-07-07):** `automation/meta_reel_post.mjs` postet das
   nächste fällige ready-Video aus reels_seed.csv als IG-Reel + FB-Video (48h-Kadenz-Wache =
   3–4 Posts/Woche, Ledger-Update, nie Threads). Token: User-Token → Seiten-Token in
   /tmp/meta_page_token + IG-ID /tmp/meta_ig_id (Seite 1049840534888592, IG 17841480560863361).
   Erster Auto-Post: instagram.com/reel/DagJ_sgDjT_. ⚠️ Vor Post prüfen, dass das beworbene
   Produkt noch ACTIVE ist (Klimaanlagen-Reel-Falle: Queue bewarb gedraftete Ware → skip).
   **⛔ DOPPELPOST-BUG behoben (2026-07-12, User musste IG-Doppelpost löschen):** `meta_reel_post.mjs`
   markierte die Zeile erst GANZ AM ENDE (nach ~4-Min-IG-Poll + FB-Upload) als posted → stirbt der
   Container in diesem Fenster (passiert hier ständig!) oder feuert ein 2. Cron, postet der nächste Lauf
   denselben `ready`-Reel nochmal = Doppelpost (steht NICHT im Ledger, weil im ungeschützten Fenster
   entstanden). Fix: (1) Lockfile /tmp/meta_reel_post.lock (O_EXCL) gegen parallele Läufe, (2) Zeile SOFORT
   nach IG-media_publish auf `posted-ig-fb` schreiben (VOR dem langsamen FB-Schritt), (3) Claim als
   `posting` vor dem Post, (4) Stale-`posting`→`posting-unklar-pruefen` statt Re-Post. Regel: Bei
   Post-Automaten IMMER erst claimen/committen, DANN die Nebenwirkung — nie umgekehrt.
   **⛔ VERSCHÄRFT (User 2026-07-14 «darf kein doppelpost mehr passieren»):** 3. Schicht = INHALTS-SPERRE.
   meta_reel_post.mjs baut ein Set aller je geposteten Video-Basenames (aus posted*/posting-Zeilen,
   plattformübergreifend) und (a) wählt nur ready-Zeilen mit NIE gepostetem Video, (b) hat einen harten
   Stopp direkt vorm Post, falls das Video schon im Set ist. Damit kann dasselbe Video nie zweimal raus —
   auch nicht wenn es in 2 Queue-Zeilen steht oder der Status-Flow durcheinanderkam. Lock+Claim+Inhalts-Sperre.
   **⛔ 4. SCHICHT = LIVE-IG-ABGLEICH (User 2026-07-23 «keine doppelpost mehr, lösche selber das du es lernst»):**
   Alle 3 bisherigen Wachen prüfen nur LOKALE Ledger — ein Post im ungeschützten Fenster, der NICHT im Ledger
   landet, umgeht sie alle (genau die 07-12-Lücke). Fix: `meta_reel_post.mjs` → `igLiveHas()` fragt VOR dem Post
   die letzten 25 IG-Posts ab und bricht bei gleicher Caption-Signatur (norm. erste 40 Zeichen) ab. Die WAHRHEIT
   auf IG schlägt jeden lokalen Ledger. Lesefehler → 3× Retry, dann Fallback auf lokale Wachen (blockt Posten nicht).
   Regel für JEDEN Post-Automaten: vor dem Post gegen die Plattform-Wahrheit prüfen, nicht nur gegen eigene Ledger.
   **⛔ BILD-POSTER auch gehärtet (User 2026-07-24 «5 bilder gelöscht zu oft gepostet», IG-Doppelpost «Ring-Set
   Eternità» ×2):** `social-autopost-meta.mjs` hatte nur URL-Dedup (postSeen) → griff nicht bei GLEICHEM Produkt
   mit ANDERER Bild-URL. Fix: Caption-Signatur-Set (norm. erste 45 Zeichen, ohne Hashtags) + `igLiveHas()`
   Live-IG-Abgleich vor jedem Post. Gilt jetzt für Reel- UND Bild-Poster.
   ⚠️ Meta-Token laufen ~alle 60 Tage ab (Page/User-Token 07-07/07-10 tot) → Löschen alter Doppelposts per API
   braucht frisches User-Token vom User; danach IG-`DELETE /{media-id}` möglich (Posts >500 Views NIE löschen).
   **⛔ 5. SCHICHT = GEMEINSAMER LOCK-BUG behoben (User 2026-07-26 «insta post ist immernoch oft doppelt»,
   Root-Cause-Analyse):** Der gemeinsame `post_guard.lock()` (/tmp/ig_post.lock) war 07-14 in video-/social-/
   story-autopost + tiktok-autopost eingebaut — aber **`meta_reel_post.mjs` blieb auf seinem EIGENEN
   `/tmp/meta_reel_post.lock`** → serialisierte NIE gegen die anderen Poster. Dazu lag **dasselbe Video
   gleichzeitig `ready` in ZWEI Queues** (`reels_seed.csv` UND `social/video_queue.csv`, versch. Captions →
   capSig griff nicht). Zwei Poster luden denselben Reel im selben Fenster hoch (TOCTOU: `seen()` prüft vorher,
   `mark()` erst nach Publish) = IG-Doppelpost. **Fix:** (1) `meta_reel_post.mjs` + `post-next-reel.mjs` nutzen
   jetzt den GEMEINSAMEN `postLock()` → nie zwei Poster gleichzeitig, dadurch greift `_posted_media.txt`
   script-übergreifend. (2) Cross-Queue-Dedup (`/tmp/dedup_queues.mjs`): Videos die in beiden Queues stehen →
   in video_queue.csv auf `dup-reel-owner-skip` (reels_seed = Reel-Owner). 3 Kollisionen bereinigt.
   **Regel: JEDER neue/alte Poster MUSS `postLock()`+`seen()`+`mark()` aus post_guard.mjs nutzen — EIN Lock,
   EIN Ledger. Nie ein eigener Lockfile, nie dasselbe Video in zwei Queues.**
11. **💸 Gemini-Budget-Schutz (User lud 2026-07-06 CHF 50):** Kostentreiber war **VEO
   (Video-Generierung, ~CHF 3–8/Clip)** — CHF 46 in 6 Tagen. Regel: Veo NUR für einzelne
   Hero-/Kampagnen-Clips (max ~CHF 10 pro Anlass), NIE in Loops/Massenproduktion — tägliche
   Reels macht die ffmpeg-Pipeline gratis. Texte: Groq (gratis) primär, Gemini 2.5-flash nur
   Bild-Gen + Not-Fallback (Importe sind seit 07-06 auf Groq-first gepatcht).
12. **🧠×🧠 Fremde Gehirne anzapfen (User 2026-07-06):** Vor Social/Content-Arbeit
   `git fetch origin brain/youtube brain/intel` und `origin/brain/youtube:automation/SECOND-BRAIN.md`
   lesen (destillierte YouTube/TikTok-Learnings: Konsens-Hashtags #shorts/#fashion/#ootd/…, Hooks).
   Multi-LLM-Kette ist Standard: Groq-Rotation (5 Modelle × 2 Keys) → Gemini → DeepSeek; für
   Analysen parallel Sub-Agenten (Fan-out auf Bulk-Daten) — Muster 2026-07-06 mit 3 Agenten bewährt.
13. **Voll-Automatik:** `bash automation/autostart.sh` bootet ALLES idempotent (Engines, Token,
   ⚡ **Dauerauftrag (User 2026-07-10): nach JEDEM Reset CJ + BigBuy sofort wieder VOLL GAS, alle
   Lieferanten** — autostart startet jetzt auch den CJ-Queue-Runner (`automation/cj_queue_runner.sh`
   → /tmp, arbeitet `automation/cj_search_queue.txt` ab, danach Kategorie-Fill; cj_sku_import
   paginiert 5 Seiten tief via CJPAGES, Ledger 10k+).
   Committer; Secrets aus Env). **CronCreate ist seit 07-06 VERFÜGBAR** (session-only, 7-Tage-Limit):
   jede lange Session legt sich einen Stunden-Wächter (Engines prüfen/Drift committen) + 08:43-
   Morgenreport (TikTok-Ads-Zahlen, Orders, #1005-Tracking). SessionStart-Hook für autostart in
   `.claude/settings.json` braucht explizite User-Freigabe (Classifier: Selbst-Modifikation).
14. **🚚 BigBuy „aktiv" ≠ lieferbar (teuer gelernt: Order #1006 + BEKO, 2026-07-07):** Katalog
   `active:1` sagt NICHTS über Lieferbarkeit. Wahrheit = 2 Checks: (1) `POST /rest/shipping/orders.json`
   mit `delivery:{isoCountry:'CH'}` → 404 „No shipping options" = NIE in die CH versendbar (BEKO-Falle);
   (2) `POST /rest/order/check.json` (carriers darf NICHT leer sein, z. B. `[{name:'seur'}]`) →
   ER003 = beim Lieferanten ausverkauft (#1006-Falle). Guard: `automation/bigbuy_viability_guard.mjs`
   (teuerste zuerst; DRAFT-Tags `nicht-lieferbar-ch`/`ausverkauft-lieferant`; `REVIVE=1` belebt wieder;
   OK-Ledger `dropship/_viability_ok.txt`). VOR jedem teuren Import und JEDER Lieferanten-Order prüfen.
   SKU-Kunde: `bb-<Zahl>` = BigBuy-Produkt-ID (Ref via `catalog/product/{id}.json`, Cache
   `dropship/_bb_id2ref.json`); `bb-S…`/`bb-V…`/`CSV-V…` = Bestell-Referenz direkt. BigBuy-Rate-Limit
   ist SHARED über alle laufenden Skripte → Engines nicht parallel auf BigBuy hämmern lassen.
   `ER005` («not enough money in the money box») = Produkt LIEFERBAR, nur Guthaben 0 → als OK werten.
   `ER007` mit totalOrder:0 = Artikel wurde still aus dem Warenkorb geworfen = AUSVERKAUFT (Boot-#1008).
   **Produkte OHNE Lieferanten-SKU sind unprüfbar = unverkäuflich** → Guard draftet sie jetzt mit Tag
   `keine-lieferanten-ref` (#1008-Lücke: Alt-Import ohne SKU verkaufte ausverkauftes Intex-Boot).
   **💰 BigBuy-Moneybox stand 2026-07-07 auf 0** → API-Bestellungen unmöglich, bis der User in der
   BigBuy-Konsole Guthaben lädt (Moneybox aufladen). Ohne das läuft «bestell auto» ins Leere!
15b. **🚚💸 BigBuy-CH-Versand kostet MINDESTENS ~27.94 EUR (SEUR, einziger Carrier — teuer
   gelernt 2026-07-10, Order #1004 war Verlust!):** Kleinkram über BigBuy ist IMMER Verlust
   (CJ bleibt ok, ~3–6 CHF China-Fracht). Wahrheit: Versandkosten-Export aus BigBuy-Backoffice
   (Downloads→CSV; User lud ihn 2026-07-10) → /tmp/bb_ship_ch.json (Ref→EUR; NICHT ins public
   Repo — Lieferantendaten!). bigbuy_import.mjs hat jetzt Versand-Wache+Preis-Floor (skip
   kein-ch-versand / versand-unrentabel). Bestand bereinigt: ~4.9k nicht-lieferbar-ch +
   ~2.1k bb-versand-unrentabel → DRAFT (Engine /tmp/bb_cleanup.py, Ledger
   dropship/_bb_cleanup_done.txt). BigBuy lohnt nur ≥ ~35–40 CHF Verkaufspreis oder Multi-Item.
15. **🔑 Env-Keys sterben mit dem letzten Prozess (teuer gelernt 2026-07-07):** Keys existieren oft
   NUR im Env laufender Engines (User-Regel: nie in Repo-Dateien). NIEMALS den letzten Key-tragenden
   Prozess killen, ohne den Key vorher in einen NEUEN laufenden Prozess zu übergeben. Transcript-/
   Grep-Recovery blockiert der Classifier (2× bestätigt) → dann kann NUR der User den Key neu geben.
   Dauerlösung: User trägt Secrets als Env-Variablen in den Claude-Umgebungs-Einstellungen ein
   (überlebt Container-Neustarts, autostart.sh liest sie automatisch).

16. **🚚💀 BigBuy „active" ≠ lagernd — 78% TOTES LAGER (teuer verifiziert 2026-07-10):** Von 1759 aktiven
   BigBuy-Produkten waren **nur 235 wirklich lagernd, 1382 (78%) ausverkauft** = tickende Ghost-Sale-Bomben
   (wie Order #1009). Alte Walker-Importe (tracked:false) verkaufen ausverkaufte Ware. **Regel: JEDES BigBuy-
   Produkt MUSS tracked:true + inventoryPolicy DENY + Feed-Menge haben** (`automation/google_feed/bb_track_all.py`:
   lagernd→tracked+DENY+qty, ausverkauft→DRAFT+Tag ausverkauft-lieferant; Quelle /tmp/bb_instock.json).
   **BigBuy-Import DEAKTIVIERT** (User 2026-07-10 «behalten aber vorsichtig», negative Trustpilot 3.7★ +
   instabiler Bestand): Flag `dropship/_bigbuy_import_disabled` (autostart+revive prüfen es). Nur die
   lagernden bleiben aktiv; KEIN neuer BigBuy-Import. Fokus = CJ (Fracht 3-6 CHF, echte Marge).
16b. **🇨🇭 BigBuy-CH-Voll-Import Rezept (2026-07-10):** Verkäufbare CH-Menge = lagernd ∩ CH-lieferbar ∩
   rentabel = nur ~552 von 90k Katalog (nach Adult/Bulk/Elektronik-Filter ~143 sauber). Tool
   `automation/bb_viable_ch_import.mjs` (DE-Name direkt von BigBuy `productinformation/{id}.json`, kein Groq;
   cat_tags NUR auf Titel — Beschreibung übertaggt!; tracked+DENY). **Filter PFLICHT:** Adult (SexFun/Intimax/
   Adore/chemise/dessous), Bulk («50 Stück»/Karton/Pappe), Elektronik-Schrott (PC/Akku/Toner/Adapter),
   Küchenkram (Löffel/Kuchen-Vorlage), Skate-Teile, Lehrbücher, Lizenz (Marvel/Hello Kitty→raus aus Ad-Feeds).
   Refurb-Suffix («Restauriert A»/«Note A»/«Generalüberholt») aus Titeln strippen.
16c. **🔁 Titel-Wache-Falle (2026-07-10):** Shopify `title:"…"`-Suche findet Modell-codierte Titel NICHT
   zuverlässig (Bellevue-Uhren doppelt angelegt!) → **lokaler Abgleich gegen Voll-Export** (products.jsonl,
   norm-Titel-Set) ist Pflicht. Nach jedem Massen-Import `dup_title_fix.mjs` auf FRISCHEM Bulk-Export (nie
   mitten im Import — draftet sonst Neuware).
16d. **🏷️ cat_tags-Mapper (`automation/cat_tags.mjs`, 2026-07-10):** löst «sauber sortieren» — mappt Titel→
   Collection-Tags (ohrringe/kategorie-armband/kategorie-halskette/sonnenbrille/schuhe/damen-taschen/uhr/
   beauty/beleuchtung/gadget/haustier/home…). Importer (cj + bb) rufen ihn auf. **Compound-Wort-Fallen (9b):**
   armband**uhr**≠Armband (negative Lookahead), Hunde**geschirr**≠Geschirr, **Hand**schuh≠Schuh (Lookbehind),
   damen**uhr**/lauf**schuh** brauchen explizite Muster (\b verpasst sie). Immer erst DRY testen.
16e. **📢 Google-Merchant-Feed (2026-07-10):** Google liest **mm-google-shopping-Metafelder**, NICHT den
   Beschreibungstext! Fehlend: material/age_group/gender/color → `automation/google_feed/*_metafield.py`
   (Material aus Beschreibung extrahieren, age_group=adult, gender aus Tags). **#1 Gratis-Traffic-Hebel (nur
   User): Merchant-Ziel-Land auf NUR Schweiz** → 1698 Produkte «Missing shipping info» freigeben (Feed zielt
   auf DE, Shop liefert nur CH). **83% der Produkte über Google-Benchmark** (BigBuy-Marken) → reprice-Engine
   `reprice_to_benchmark.py` senkt CJ/Eigenware auf Benchmark, BigBuy nur bis Kosten-Boden (nie unter EK+Versand).


## ⚖️ Ein Punktetopf, zwei Aufgaben — der Grind hat Vorrang genommen (2026-08-20)
CJs Tagesbudget ist EIN Topf für alle Prozesse. Am 20.08. war es um 20:24 erschöpft: restlos
aufgebraucht dafür, Produkt **Nr. 41'150** anzulegen — während für **41'133 bestehende Produkte
der Einkaufspreis fehlte** und damit unbekannt war, ob sie überhaupt Gewinn bringen. Die
Stichprobe von gestern: CHF 15.90 Verkaufspreis gegen CHF 17.70 Stückkosten. Bei rund zehn
Bestellungen insgesamt bringt das 41'150-ste Produkt nachweislich nichts; die Kostenwahrheit
entscheidet über jede einzelne Marge. **Der Grind pausiert deshalb im Fenster 16:00–17:30 UTC**
(direkt nach dem Punkte-Reset), damit `cj_kosten_backfill` ungestört arbeitet — 1,5 von 24
Stunden. Eingebaut in `automation/engine_keepalive.sh`; dort wird auch die Pause-Kühlung des
Backfills zurückgesetzt, sonst verlöre er das halbe Fenster an eine Absage von kurz vor 16:00.
**Regel für jede neue CJ-Engine: erst fragen, WEM sie das Budget wegnimmt.** «Läuft nachts mit»
ist keine Antwort, wenn ein anderer Prozess dieselbe Sekunde braucht.

## 📉 Die Preisformel lag 2 Franken unter den Kosten — sichtbar erst mit Kostendaten (2026-08-20)
Seit gestern schreibt der Importer Einkaufspreise mit; heute lagen für **665 Varianten** echte
Zahlen vor. Ergebnis: **200 davon (30 %) stehen unter Einstand.** Die Ursache ist nicht der
Preisboden (nur 7 der 200 stehen auf CHF 14.90), sondern die Formel selbst:
`p = max(landed·1,4, landed+5, 14.90)` — wobei `landed` bewusst nur die **Fracht-LÜCKE**
(freight − 7) trägt, weil der Kunde CHF 7 Versand zahlt. Die **vollen** Stückkosten sind
`landed + 7`. Ein Aufschlag von 5 liegt damit strukturell **2 Franken unter den Kosten**,
sobald keine Versandpauschale anfällt.
**Und genau die Warenkörbe, die der Shop belohnt, sind die verlustbringenden:**
| EK $ / kg | Preis | Kosten | mit CHF 7 Versand | Gratis-Versand ab 50 | dazu «2+ −10 %» |
|---|---|---|---|---|---|
| 3 / 0,3 | 15.90 | 17.70 | **+5.20** | −1.80 | **−3.39** |
| 5 / 0,4 | 17.90 | 19.50 | +5.40 | −1.60 | −3.39 |
| 12 / 0,6 | 26.90 | 25.80 | +8.10 | +1.10 | −1.59 |
Einzelbestellungen tragen sich also gut; erst Gratis-Versand **und** der automatische
Mengenrabatt kippen die Rechnung — und je billiger die Ware, desto tiefer.
⚠️ **Eine höhere Gratis-Schwelle hilft NICHT**, sondern verschlimmert es: Die Fracht fällt je
ARTIKEL an, ein grösserer Korb aus billiger Ware häuft also mehr Fracht an. Das Problem ist
nicht die Schwelle, sondern billige Ware im Mehrfachkorb.
- **Importer korrigiert** (`cj_category_fill.mjs`): `max(landed·1,4, landed·1,167+8,2, 16.90)` —
  hält auch dem 10-%-Rabatt stand (Bedingung p·0,9 ≥ Kosten·1,05). Neue Ware wird ~15–25 %
  teurer; das ist der Preis dafür, nicht unter Einstand zu verkaufen.
- ⚠️ **Der Bestand ist NICHT angefasst.** 200 Varianten neu zu bepreisen ist eine
  Geschäftsentscheidung des Betreibers, keine technische Korrektur — sie trifft beworbene Ware.
- ✅ **BEANTWORTET am 22.08.2026: JA, die Fracht faellt je Artikel an.** CJ hat LX1013
  (2 Artikel) in ZWEI Sendungen zerlegt und beide separat berechnet: Teil A Ware $6.15 +
  Fracht $9.49, Teil B Ware $5.97 + Fracht $6.34. Zwei Artikel = zwei Frachten. Bündeln
  spart also nichts, es VERVIELFACHT. Die konservative Kostendefinition war richtig.
- ⚠️ **Und die Fracht haengt am GEWICHT, nicht am Preis:** gemessen $6.34 · $9.49 · $19.35
  (Letzteres LX1015, 906 g). Damit entscheidet das Gewicht ueber Gewinn oder Verlust:
  leichte Ware traegt jeden Warenkorb (+12 bis +17 CHF), schwere Ware nur die
  EINZELbestellung (+2.96) — ab 2 Artikeln −4.27, bei 4 Artikeln mit Gratis-Versand −22.54.
  Der Shop belohnt mit «Gratis ab 50» und «2+ −10 %» also ausgerechnet die Koerbe, die bei
  schwerer Ware Geld kosten. **Nicht der Preis ist der Hebel, sondern das Gewicht.**
- Die CHF 15 Mindestfracht sind **gemessen**, nicht geschätzt (Order #1011: $15.77, 03.08.).
  Das ältere «China-Fracht ~3–6 CHF» im BigBuy-Vergleich ist überholt — ich hätte auf dieser
  Grundlage beinahe die Kostendaten für falsch erklärt.

## 📉 1,8 % der Neuware erreicht den Google-Kanal nicht — Grund OFFEN (2026-08-22)
Google ist der einzige Kanal mit belegten Verkäufen. Über die 4'761 seit dem 19.08. neu
angelegten aktiven Produkte gezählt:

| Kanal | veröffentlicht | Anteil |
|---|---:|---:|
| Online Store · Shop | 4'761 | 100 % |
| TikTok · Facebook/Instagram · Pinterest | 4'758 | 99,9 % |
| **Google & YouTube** | **4'672** | **98,1 %** |

**89 Produkte fehlen bei Google — und nur bei Google.** Die anderen Werbekanäle vermissen
je 3. Das schliesst einen allgemeinen Publizier-Fehler aus und deutet auf einen
Google-spezifischen Wächter (`gfeed_score.py` / `google_kanal_saeubern.py`).
Von den 89 sind **4 nachweislich zu Recht draussen**: drei Rauchartikel (`18plus`,
`raucher`, `nur-onlineshop`) und ein Outdoor-Klappmesser (`google-kanal-klinge-outdoor`).
**Die übrigen 85 tragen KEIN Sperr-Tag** und sehen harmlos aus: Canvas-Herrenschuhe,
Flanellhemd, A-Linien-Blumenkleid, Keramik-Futternapf, Pinselset, Rucksack.
⚠️ **OFFEN — nicht als Fehler gewertet:** Ob diese 85 von einem Wächter bewusst entfernt
wurden (dann steht ein Grund in dessen Ledger) oder beim Import nie in den Kanal kamen,
konnte ich NICHT klären: Das Shopify-Punktebudget war erschöpft (24 verfügbar, Abfrage
kostet 86 — Bulk-Export und laufende Engines teilen sich dasselbe Kontingent). Der
Abgleich gegen `_google_kanal_gesaeubert.txt` steht aus.
**NACHGEPRÜFT am 22.08. mit freiem Budget — es ist KEIN bewusster Ausschluss:**
Von den 85 sind **0 in einem Säuberungs-Ledger** vermerkt, **0 ohne Bild** (alle tragen 5 bis
21 Bilder, die Publish-Wache greift also nicht), und die Klingen-Hausregel der Importer
erklärt nur **1 von 15** Stichproben. `google_ads_kuration.py` scheidet ebenfalls aus — es
setzt nur ein Shopping-Ads-Metafeld und lässt die Gratis-Listings unangetastet.
**✅ URSACHE GEFUNDEN am 22.08. über die Shopify-Ereignisliste eines Einzelfalls.** Beim
Polohemd `15508310557057` steht lückenlos: «included on **Online Store**» 02:11:21,
«**Shop**» 02:11:21, «**TikTok**» 02:11:22, «**Facebook & Instagram**» 02:11:23,
«**Pinterest**» 02:11:24 — **Google & YouTube fehlt, und es gibt auch kein «removed»**.
Das Produkt wurde also nie publiziert, nicht später entfernt.
**Der Grund: `cj_sku_import.mjs` und `cj_trending_import.mjs` publizierten OHNE Quittung.**
Beide riefen `publishablePublish` auf, fragten `userErrors` in der Mutation ab — und lasen
die Antwort **nie**. Fällt eine einzelne Publikation aus, landet das Produkt in fünf von
sechs Kanälen, und niemand merkt es. `cj_category_fill.mjs` hatte dafür längst
`publishVerified()` mit Wiederholung; die beiden anderen Importer blieben ungepatcht —
**dieselbe Geschwister-Lehre wie bei der Fulfill-Engine und der viermal kopierten
Farbtabelle.** Beide haben die geprüfte Fassung jetzt.
⚠️ Der Altbestand wird dadurch NICHT geheilt — die 85 bleiben draussen, bis jemand sie
einzeln ansieht.
**Sichtbar gemacht statt geraten:** `automation/google_kanal_luecke.py` (täglich im Aufseher)
meldet jedes aktive Produkt, das im Online Store steht, bei Google fehlt und **keinen**
erklärenden Grund trägt (Sperr-Tag, `google-kanal-*`-Tag, Klingen-Regel). Erster Lauf:
**24 Treffer allein seit dem 21.08.** — der Schwund läuft also weiter.
⚠️ Der Wächter publiziert NICHTS. Ein Teil der Ausschlüsse ist gewollt, und ein Fehlgriff im
Google-Kanal riskiert die Merchant-Sperre — also genau den Kanal, der verkauft.
⚠️ NICHT blind `google_kanal_nachziehen.py` darüberlaufen lassen: Ein Teil der Ausschlüsse
IST gewollt (Kostüm/Erotik/Refurb/Klingen), und ein Fehlgriff dort riskiert die
Merchant-Sperre — der einzige Kanal, der verkauft.

## 🎟️ Zwei Mengenrabatte und ein DRITTER Gratis-Versand — live nachgezählt (2026-08-22)
Beim Prüfen der Startseite fiel auf, dass sie «–10% ab 3 Artikeln» bewirbt, während ich den
ganzen Tag mit «2+ −10 %» gerechnet hatte. Live abgefragt sind **beide aktiv**:

| Automatischer Rabatt | Status | Bedingung | Wert |
|---|---|---|---|
| `Bundle: 2+ Artikel -10%` | **ACTIVE** | ab 2 Artikeln | 10 % |
| `Mengenrabatt — 10% ab 3 Artikeln` | **ACTIVE** | ab 3 Artikeln | 10 % |
| `Gratis-Versand ab CHF 65` | EXPIRED | ab 65 | — |
| `Gratis-Versand ab CHF 49` | **ACTIVE** | ab 49 CHF | — |

Daraus drei Dinge:
1. **Die Marge-Rechnung mit «2 Artikel −10 %» war richtig** — die 2er-Regel ist scharf.
2. **Die 3er-Regel ist wirkungslos.** Shopify wendet je Bestellung nur EINEN automatischen
   Rabatt an, und die 2er-Regel gibt bei gleichem Prozentsatz früher denselben Nachlass.
   Sie kann also nie etwas bewirken, was die 2er nicht schon tut.
3. **Die Startseite bewirbt die SCHLECHTERE Bedingung.** Dort steht «ab 3 Artikeln», live
   genügen 2. Kundinnen wird ein höherer Mindestkauf genannt, als tatsächlich nötig ist.
**⚠️ Und es gibt einen DRITTEN Gratis-Versand-Weg**, den der Eintrag «Gratis ab CHF 50»
nicht kennt: einen automatischen Rabatt ab **CHF 49**. Damit stehen drei Zahlen nebeneinander
— Versandprofil (45, laut Eintrag vom 20.08.), Automatik-Rabatt (49) und beworbene Zusage (50).
⚠️ Die genauen Schwellen der PROFIL-Tarife konnte ich nicht auslesen (`methodConditions`
wird vom Schema abgelehnt); bestätigt ist nur, dass im Zone «Domestic» zwei
«Kostenloser Versand»-Tarife liegen, einer aktiv und einer aus — passend zur 45/50-Kette.
**Warum das jetzt zählt:** Genau diese Rabatte verwandeln nach der heutigen Messung Körbe mit
schwerer Ware in Verluste. Wer daran etwas ändert, muss wissen, dass es DREI Stellschrauben
sind und nicht eine.

## ⚖️ Das Gewicht war bekannt, benutzt — und weggeworfen (2026-08-22)
Auf die Frage «welche Produkte wiegen über 800 g?» liefert Shopify **keine Antwort**: Von
**45'741 aktiven Produkten haben 45'700 gar kein Gewicht** (99,9 %). Bis 800 g: 39, darüber: 2
— und diese zwei sind ein POD-Hoodie und ein Bundle, keine CJ-Ware.
**Die Ursache ist dieselbe wie beim Einkaufspreis vor dem 20.08.:** `chf()` und `kosten()` in
`cj_category_fill.mjs` LESEN das Gewicht von CJ (`v.weight||v.variantWeight`) und rechnen die
Fracht daraus — geschrieben wurde es nie. Bekannt, benutzt, verworfen.
Behoben: Helfer `gewicht()` schreibt `inventoryItem.measurement.weight` mit (nur wenn > 0,
sonst leeres Objekt — Produkte ohne CJ-Angabe erzeugen so keinen ungültigen Input).
**Was daran hängt:** Ohne Gewicht ist keine gewichtsbasierte Versandregel möglich, und die
Frage, welche Ware im Mehrfachkorb Geld kostet, ist nicht beantwortbar — obwohl genau das
Gewicht über Gewinn oder Verlust entscheidet (gemessene Fracht: $6.34 · $9.49 · $19.35).
⚠️ **Die Preisformel selbst ist in Ordnung** — das war meine erste Vermutung und sie war
falsch. `freight = max(15, 3.4 + 16.3·kg)` ergibt für 906 g **CHF 18.17**; gemessen wurden
CHF 15.5–17.4. Die Schätzung trifft also. Der Gemüseschneider steht nur deshalb auf CHF 15.90,
weil er VOR dem 03.08. importiert wurde — damals steckte die Fracht noch gar nicht im Preis.
Nach der heutigen Formel käme er auf **CHF 24.19**.
⚠️ Der Altbestand bekommt das Gewicht dadurch NICHT. Ein Backfill müsste je Produkt CJ
fragen (Tagesbudget) — lohnt sich erst, wenn eine gewichtsbasierte Versandregel ansteht.

## 🚦 CJs Drosselung ist GÜLTIGES JSON — die Fulfill-Engine war blind (2026-08-22)
`cj_fulfill_engine.py` meldete bei LX1013 und LX1015 hartnäckig «Detailabruf bei CJ
fehlgeschlagen», während derselbe Abruf von Hand sofort klappte. Ursache: Sein `cj()`
wiederholte **nur, wenn die Antwort kein JSON war**. CJs Drosselung
(`{"code":1600200,"message":"Too Many Requests, QPS limit is 1 time/1second"}`) parst aber
sauber — sie wurde also zurückgegeben, hatte kein `data`, und galt als Ausfall.
CJ zählt 1 Anfrage/Sekunde über ALLE Prozesse gemeinsam; mit vier laufenden Grind-Runnern
verliert diese Engine das Rennen fast immer. Sie konnte damit **keinen Auftragsstatus mehr
lesen** — weder um zu bezahlen noch um Sendungsnummern nach Shopify zurückzuschreiben.
Jetzt: 8 Versuche, Drosselung wird ausgesessen (Code 1600200 UND Meldungstext geprüft).
⚠️ Für `cj_category_fill.mjs` war genau das schon am 11.08. behoben worden — die
Fulfill-Engine hatte dieselbe Funktion, blieb aber ungepatcht. **Wer eine Hilfsfunktion an
einer Stelle repariert, muss ihre Geschwister suchen** (dieselbe Lehre wie bei der
viermal kopierten Farbtabelle).
⚠️ Und die Einordnung ehrlich: Der Schaden war KLEINER, als er zuerst aussah. #1012, #1013
und #1014 stehen in Shopify längst als FULFILLED — die Sendungsnummern kamen also an
(vermutlich über die CJ-Shopify-App). Die Engine war blind, nicht der Kunde.
**Dass `#1015` nach der Zahlung noch UNFULFILLED ist, ist KEIN Fehler:** CJ steht auf
`UNSHIPPED`, das Paket ist nicht übergeben. Die Engine benachrichtigt bewusst erst bei
`SHIPPED` — eine Versandmail für ein Paket, das noch im Lager liegt, ist schlimmer als
eine späte.

## 🗺️ 338 Kategorien waren da — das Menü zeigte 80 (2026-08-22)
Betreiber-Auftrag: «werbung auf webseite das man alles finden kann». Nachgezählt:
**348 Kollektionen mit Ware sind im Onlineshop veröffentlicht**, das Hauptmenü führt
**93 Punkte** und damit rund 80 davon. Über 260 Kategorien waren nur über die Suche oder
Zufall erreichbar — und für Google unsichtbar, weil auf sie **kein einziger interner Link**
zeigte. Neu: **`/pages/alle-kategorien`** (`automation/kategorien_verzeichnis.py`), aus
Hauptmenü («🔎 Alle Kategorien», vor der Merkliste) und Footer verlinkt.
- ⚠️ **OHNE STÜCKZAHLEN, und das ist der Punkt.** `productsCount` einer Kollektion zählt
  **Entwürfe mit**: «Geschenke unter CHF 100» meldet 64'661, der ganze aktive Katalog hat
  45'833. Jede Zahl auf der Seite wäre eine Falschaussage gewesen. Sie dient nur intern
  zum Sortieren. (Dieselbe Falle wie bei `products(first:n)` auf einer Kollektion.)
- **Doppelgänger zusammengelegt** (8): «Camping»/«Camping & Outdoor» (beide 233),
  «Garten»/«Garten & Balkon» (beide 286) — dieselbe Ware unter zwei Namen. Als Dublette
  gilt nur **gleiche Produktzahl UND ein Titel ist Präfix des anderen**; eng gefasst, sonst
  verschwinden echte Unterkategorien.
- ⚠️ **`menuUpdate` ERSETZT den ganzen Baum.** Vor dem Schreiben den vollständigen Baum
  (3 Ebenen) lesen, mit `id` je Punkt zurückschicken und danach **nachzählen**: 93 → 94.
  Ohne Gegenprobe hätte ein unvollständiger Lesevorgang 80 Menülinks gelöscht.
- ⚠️ **`pageByHandle` gibt es in 2024-10 nicht mehr** («Field doesn't exist on QueryRoot») →
  `pages(first:5, query:"handle:…")`.
**Fünf Fehlgriffe im Probelauf, alle vor dem Veröffentlichen gefunden** — drei aus der
REIHENFOLGE der Regeln (Herren-Strick landete unter Damenmode, weil `strick` dort steht;
Garten-**Pflege** unter Beauty; Tier-**geschirre** unter Wohnen) und zwei alte Bekannte:
**`led` steckt in «Leder», `ski` in «Skincare», `auto` in «Automatik»** — dritte, vierte und
fünfte Substring-Falle nach «IPL» in «L-IPL-iner». Dazu der **Umlaut-Plural**: «Armbänder»
passt NICHT auf `armband`, «Rucksäcke» nicht auf `rucksack`.
**Bei kurzen Wörtern ist die Wortgrenze die Regel, nicht die Ausnahme — und bei deutschen
Mehrzahlformen gehört die Umlaut-Variante ins Muster.**
- Die Seite wird von `tote_kollektionslinks.py` mitgeprüft (es liest veröffentlichte Seiten):
  verschwindet eine Kollektion, fällt der tote Link auf.
- ⚠️ **Der Auto-Committer greift inzwischen weiter als `dropship/`.** Er hat dieses Werkzeug
  in eine «CJ-Ledger auto»-Sammelmeldung gezogen, bevor ich es selbst committen konnte —
  die Begründung wäre verloren gewesen. Wer etwas Erklärungsbedürftiges baut, schreibt den
  Grund in die Datei UND hierher, nicht nur in die Commit-Meldung.

## 🧾 Der Wächter gegen unlieferbare Ware stand in KEINER Startliste (2026-08-22)
`ohne_lieferantenref_guard.py` schützt gegen die Klasse von Bestellung **#1008** (bezahlt,
nie lieferbar). Er ist inhaltlich in Ordnung — er prüft seit dem 20.08. die **FORM** der SKU
statt des Präfixes und erkennt frei getippte Slugs. Er lief nur nie: **in keiner Startliste**,
dieselbe Lücke wie beim Aufseher selbst (Lehre 19.08., «wer startet DICH neu?»). Jetzt im
`fixer_keepalive.sh` registriert.
**Vollscan über 45'833 aktive Produkte: 0 ohne jede Lieferanten-SKU** — die #1008-Klasse ist
sauber. **16 tragen eine getarnte SKU** (der Wächter MELDET sie nur, er draftet sie nicht):
- **8 handkuratierte Altprodukte** aus den ersten Sessions — `WALLET-BLK`, `WATCH-001`,
  `SUNGLASS-BLK`, `LED-001`, `BAND-001`, `BABY-BIB-001`, `JADE-SET-001`, `PROJ-PANDA-001`.
  Alle ACTIVE, alle auf `CONTINUE` mit **erfundenem Bestand** (35 bis 100 Stück), hinter der
  SKU steht kein Lieferant. Darunter die Bewertungssieger (Slim Wallet 5,0★, Herrenuhr 5,0★,
  Jade Roller 5,0★) — genau deshalb ist pauschales Draften teuer und bleibt Betreiber-Sache.
- 5 sind **eigene Bündel** (`SET-AURA-3`, `SET-BADI-3`, `SET-KLEE-2`, `LXSCH-GIFT-TECH-HERO`)
  und 1 ist POD (`TRANSFER-A5`) — dort ist «keine Lieferantenreferenz» richtig, kein Befund.
- ⚠️ `CJ-CJY 104172601AZ` (Haustier-Trolley) hat ein **Leerzeichen mitten in der SKU**. Weder
  `CJY104172601AZ` noch `CJY1041726` kennt CJ. Das fehlende Zeichen zu RATEN wäre schlimmer
  als die Meldung stehen zu lassen — CJ-SKUs sind `CJ`+2 Buchstaben, das sind 26 Versuche.
⚠️ Und die eigene Einordnung ehrlich: Ich hielt den Wächter erst für einen, der diese 8
draftet. Er meldet sie nur. Die Registrierung im Aufseher ändert also nichts am Verkauf —
sie macht den Befund täglich sichtbar. Das ist weniger, als es zuerst klang.

## ⛔ KORREKTUR: «Fracht mindestens CHF 15» war ein Zirkelschluss (2026-08-23)
**Der Eintrag direkt darunter ist in seiner Kernaussage FALSCH** und bleibt nur stehen, damit
der Denkfehler nachvollziehbar ist. CJ live nach Frachtquoten gefragt (CN→CH, je 1 Stück):

| Gewicht | gemessen | behauptete «Untergrenze» |
|---:|---:|---:|
| 20 g | **CHF 4.34** | 15.00 |
| 270 g | **CHF 8.17** | 15.00 |
| 840 g | 16.38 | 17.09 |
| 1250 g | 25.22 | 23.77 |

**Der Denkfehler:** Ich las die Untergrenze aus den Kostendaten des Katalogs ab — aber
`cj_kosten_backfill.mjs` berechnet jede `unitCost` selbst mit `u·0.9 + max(15, …)`. Jede
Kostenzahl war per Konstruktion ≥ 15, und diente dann als «Beleg» für genau diese 15.
**Eine Zahl, die aus der eigenen Annahme stammt, beweist die Annahme nicht.** Zwei der vier
Bestellmessungen, auf die ich mich berief, liegen selbst darunter (LX1013: $6.34 und $9.49).
- Regression über sechs Livequoten: **`3.84 + 16.42·kg` CHF**. Der LINEARE Teil der Formel
  war die ganze Zeit richtig — nur der Boden nicht. `cj_preis.mjs` steht jetzt auf **max(5, …)**.
- **Die 3'622 Produkte auf CHF 14.90 sind NICHT pauschal Verlustware.** Bei leichter Ware
  trägt der Preis auch im Gratis-Versand-Korb. Eine pauschale Anhebung hätte ~2'200 Artikel
  verteuert, die in jedem Korb Gewinn bringen (Schmuck +8 bis +10 CHF).
- **Das echte Problem ist SCHWERE Ware**, Kippgrenze rund **600–750 g**. Belegt: Fahrradsattel
  1250 g, Ware $4.19, CJ-Quote **$28.02** — verliert bei jeder Einzelbestellung Geld.
- ⚠️ Am schweren Ende UNTERschätzt die Formel (23.77 gegen 25.22 gemessen).
- ⚠️ **Ohne Gewichtsdaten bleibt offen, welche der 3'622 betroffen sind** — 45'700 von 45'741
  aktiven Produkten tragen gar kein Gewicht. `preisboden.py` zieht sie täglich auf 14.90; der
  Boden gehört gewichtsabhängig, das braucht zuerst den Backfill.

## 💸 3'622 Produkte auf CHF 14.90 — unter der gemessenen Frachtuntergrenze (2026-08-22)
Live gezählt: **3'622 aktive `cj-real` stehen auf genau CHF 14.90**, dem Boden der alten
Formel aus einer Zeit ohne Fracht im Preis. Die Fracht China→CH hat eine **gemessene**
Untergrenze von rund CHF 15 (#1011 $15.77 · LX1013 $6.34+$9.49 · LX1015 $19.35). Damit gilt
`Stückkosten ≥ 0 + 15.00` — ein Produkt für CHF 14.90 liegt **unter den Kosten, selbst wenn
die Ware gratis wäre**. Das ist keine Schätzung über Einzelartikel, sondern eine Untergrenze
für alle. Einzelbestellung +6.90 · Gratis-Versand −0.10 · mit «2+ −10 %» −1.59.
- **Korrektur an meiner eigenen Darstellung:** Ich hatte den CHF-4.90-Boden in
  `cj_sku_import.mjs` so dargestellt, als stünde solche Ware live im Shop. Nachgezählt:
  **0 CJ-Produkte unter CHF 14.90** — `preisboden.py` hat sie täglich hochgezogen. Die
  Quellreparatur bleibt richtig, verkauft wurde zu 4.90 aber nichts.
- ⚠️ **Shopifys Suchfilter schweigen bei falscher Syntax.** `variant_price:<5` und
  `variants.price:<5` filtern NICHT (Ergebnis: 49.90, 129.90, 39.90) — nur `price:<5`
  wirkt. Und `productsCount` deckelt bei **10'000**; wer eine grosse Menge zählen will,
  muss sie in Bänder zerlegen, sonst meldet jede Abfrage dieselbe Zahl.
- Entscheid mit drei durchgerechneten Wegen: `dropship/PREIS-ALTBESTAND-ENTSCHEID.md`.
  ⚠️ Was NICHT hilft: die Gratis-Schwelle anheben — die Fracht fällt je ARTIKEL an.

## 🧮 Vier Importer, vier Preisformeln — nur eine war die korrigierte (2026-08-22)
Der Fix vom 20.08. («der Aufschlag lag 2 Franken unter den Kosten») landete nur in
`cj_category_fill.mjs`. Nachgezählt hatte **jeder** Importer seine eigene Rechnung:
| Importer | Formel | Fehler |
|---|---|---|
| `cj_category_fill.mjs` | `max(landed·1,4, landed·1,167+8,2, 16.90)` | ✅ korrigiert |
| **`cj_sku_import.mjs`** | `max(u·m, 4.90)`, Fracht erst ab 0,4 kg | **Boden CHF 4.90** |
| `cj_trending_import.mjs` | `landed = u·0,9 + 8` pauschal, `landed+5` | Gewicht ignoriert |
| `cj_gaps_import.mjs` | `max(9.90, usd·kurs·marge)` | gar keine Fracht |
`cj_sku_import.mjs` steht in **vier** Runner-Aufrufen, legte die Ware also täglich neu an:
| EK $ / g | Kosten | sku_ALT | trend_ALT | gaps_ALT | NEU |
|---|---:|---:|---:|---:|---:|
| 1.50 / 150 g | 16.35 | **4.90** | 14.90 | 9.90 | 19.90 |
| 3.00 / 300 g | 17.70 | **7.90** | 15.90 | 9.90 | 20.90 |
| 5.00 / 1620 g | 34.31 | 32.90 | **17.90** | **14.40** | 40.90 |
Ein Artikel für CHF 4.90 bei Kosten von CHF 16.35 verliert **auch mit dem Versanderlös**
noch CHF 4.45 — genau die Ware, die `preisboden.py` am 12.08. bei 2'355 Produkten von Hand
anheben musste. Die Rechnung liegt jetzt EINMAL in **`automation/cj_preis.mjs`**
(`chf` · `kosten` · `fracht` · `gewicht`), alle vier lesen sie. **Neue Preisregeln NUR dort.**
- Nebenbei mitrepariert, weil an derselben Stelle weggeworfen: `cj_sku_import` und
  `cj_trending_import` schreiben jetzt **Einkaufspreis UND Gewicht** mit.
- ⚠️ `cj_gaps_import.mjs` läuft derzeit in KEINEM Runner — **genau deshalb fällt so etwas
  nie auf**, bis ihn jemand wieder startet. Ein schlafendes Skript ist keine harmlose Leiche.
**Regel (dritte Wiederholung nach Farbtabelle und `publishVerified()`): Wer eine
Hilfsfunktion repariert, sucht ihre Geschwister — und macht daraus EINE Datei.**

## 🔢 Die fünfte SKU-Form — «productSku» heisst wörtlich PRODUKT-SKU (2026-08-22)
Der Kosten-Backfill quittierte **126 Produkte als «cj-ohne-antwort»**, obwohl CJ sie alle
kennt. Direkt nachgestellt:
| Abfrage | Antwort |
|---|---|
| `productSku=CJBQ291505701AZ` (Varianten-SKU) | `1602001 Product not found` |
| `productSku=CJBQ2915057` (Produkt-SKU) | **`code 200`** |
Der Parameter meint die PRODUKT-SKU; eine Variantennummer kennt er nicht. Der **Modemodus**
des Importers schreibt aber genau die (`v.variantSku`, Zeile 157 `cj_category_fill.mjs`).
Der Lauf schneidet die Variantennummer jetzt ab, wenn CJ «nicht gefunden» meldet — Muster
eng gefasst (**zwei Ziffern + zwei Grossbuchstaben am Ende**), damit echte Produkt-SKUs wie
`CJJJJTJT35117` und `CJJJCFCF00364` unangetastet bleiben.
- **Die Antwort enthält ALLE Varianten** mit je eigenem Preis und Gewicht. Wo sich die
  Shopify-Variante über ihre SKU wiederfindet, bekommt sie IHRE Zahl statt der des ersten
  Eintrags — bei der Rugged Smartwatch CHF 59.63 statt 41.27. Kostet keine Extra-Abfrage.
- Die 126 alten Quittungen wurden gelöscht: **nach einer Regel-Änderung ist das alte
  Erledigt-Zeichen wertlos** (dieselbe Lehre wie beim Produktdetails-Lauf).
- Erster belegter Gewichtsfall: **Gemüseschneider 1620 g, VK 39.90, Kosten 41.00** — er
  trägt sich NUR über den Versanderlös (+5.90); im Gratis-Versand-Korb −1.10, mit «2+ −10 %»
  rund −5.10. Keine Schätzung mehr, seine eigene Zahl.

## ✅ Google-Kanal: 65 Produkte nachpubliziert — mit Quittung (2026-08-22)
Die Ursache des Schwunds war gefunden (Importer publizierten ohne Antwortprüfung), der
Altbestand blieb aber draussen. `automation/google_kanal_luecke_schliessen.py` schliesst ihn:
Es fasst **nur** an, was der Wächter als unerklärte Lücke meldet, prüft jedes Produkt LIVE
gegen dieselben Regeln wie `google_kanal_nachziehen.py` (heikle Ware, Code im Titel,
Lieferanten-SKU, Bild, Preis) plus Sperr-Tags und Klingen-Hausregel — und **liest die Antwort
der Mutation**, denn genau deren Fehlen hat die Lücke erzeugt.
- Zusätzlich aufgenommen: **Mess- und Heilaussagen im Titel**. Die Liste in
  `google_kanal_nachziehen.py` zielt auf WARENGRUPPEN, nicht auf AUSSAGEN; «Blutzucker» oder
  «EKG» im Titel ist bei Google ein eigener Sperrgrund.
- 65 publiziert (23 + 42), **4 blieben draussen mit nachgelesenem Grund**: LED-Gesichtsmaske
  und Elektrotherapie-Stab (beide «Therapie» im Text), ein Gerätecode im Titel.
- ⚠️ **Ein Wortfund ist noch kein Grund.** Beim Luftbefeuchter stand «Aroma**therapie**» —
  die Duftfunktion eines Diffusors, kein Heilversprechen. Nachgelesen, nicht geraten.
- ⚠️ Es läuft **NICHT** im Aufseher. Ein Teil der Ausschlüsse ist gewollt, und ein Fehlgriff
  im Google-Kanal riskiert die Merchant-Sperre. `DRY=1` zeigt das Urteil je Produkt zum Lesen.

## 🧾 Die Preisformel an einer ECHTEN Bestellung gegengeprüft (2026-08-22, LX1015)
Der Betreiber hat selbst bestellt (#1015) und den CJ-Zahlschein gezeigt. Damit liegen zum
ersten Mal ALLE Zahlen einer Bestellung nebeneinander — und sie bestätigen das am 20.08.
aufgestellte Kostenmodell fast auf den Franken:

| | |
|---|---|
| Verkauf Ware | CHF 15.90 |
| Versand vom Kunden bezahlt | CHF 7.00 |
| **Kundentotal** | **CHF 22.90** |
| CJ Warenkosten | $ 2.81 |
| CJ **Fracht** | **$ 19.35** |
| **CJ zahlbar** | **$ 22.16** (≈ CHF 17.51–19.94) |
| **Marge** | **+ CHF 2.96 bis 5.39** |

Die Tabelle im Eintrag «Die Preisformel lag 2 Franken unter den Kosten» sagte für genau
diesen Fall (EK 3 $, 0,3 kg): Preis 15.90, Kosten 17.70, mit CHF 7 Versand **+5.20**.
Gemessen: +5.39. **Das Modell stimmt.**
- ⚠️ **Die Fracht ist 87 % der Kosten** ($19.35 von $22.16) — bei einem 906-g-Artikel.
  Die Ware selbst kostet $2.81. Wer über Fracht nachdenkt, denkt über das ganze Geschäft nach.
- ⚠️ **Diese Bestellung trägt sich NUR über den Versanderlös.** Dieselbe Ware im
  Gratis-Versand-Korb (ab CHF 50) wäre nach derselben Tabelle −1.80, mit dem automatischen
  «2+ Artikel −10 %» −3.39. Der Befund von damals ist damit nicht mehr theoretisch.
- Der konservative Umrechnungsfaktor 0.9 des Repos liegt näher an der Realität als der
  Tageskurs 0.79 — er rechnet die Marge klein, nicht schön. So gehört es.

## 🪣 CJs «remaining» ist ein EIMER, kein Tagesbudget — 3 Tage Stillstand (2026-08-23)
Der Kosten-Backfill stand seit dem 21.08. bei **~700 von 46'000 Produkten**. Damals war die
Diagnose, dass er nach dem WORT «point» suchte und deshalb jede Antwort für ein leeres
Budget hielt; die Zahl statt des Wortes zu lesen war richtig — **die Schlussfolgerung nicht**.
`pointsInfo.remaining` fliesst ständig nach. Live gemessen, sechs Abfragen in 25 Sekunden:
`419 · 447 · 387 · 357 · 317 · 287` — er STEIGT zwischendurch. Und er ist **nicht**
`total − usedToday` (63'387 − 105'620 wäre negativ), sondern ein eigener Zähler.
Der Lauf meldete deshalb bei jedem Tief unter 20 «morgen weiter» — auch im eigens für ihn
eingerichteten Vorrang-Fenster, in dem der ganze Grind pausiert.
- **Leerer Eimer → 45 s warten.** Das echte Tagesende meldet CJ mit Code **16900500** und
  dem Klartext «Insufficient API points»; NUR das beendet den Lauf. Beide Zweige sind
  belegt: erst «Eimer leer (11) — 45 s warten», später «CJ-Tagesbudget erschöpft».
- **Dritte Wiederholung derselben Lehre** nach Shopifys `Throttled` und CJs QPS-Meldung
  1600200: **Eine Warteanweisung ist kein Abbruchgrund. Sie sagt nur, wie lange zu warten ist.**
- ⚠️ **Das Vorrang-Fenster galt nur für den GRIND.** `engine_keepalive.sh` stoppte die vier
  Runner, die übrigen CJ-Verbraucher liefen weiter — und `cj_variantenbild` allein zog rund
  50 Punkte alle fünf Sekunden. Messung im Fenster: **mit** Bildmotor 447→287 in 25 s,
  **ohne** 407→397→431 (hält sich). Ohne diesen Fund wäre die Eimer-Korrektur wirkungslos
  geblieben: 45 s warten, um in einen Eimer zu greifen, den ein anderer gerade leert.
  `cj_variantenbild` und `cj_bild_backfill` ruhen im Fenster jetzt mit.
  **NICHT pausiert wird `cj_fulfill_runner`** — der bearbeitet echte Kundenbestellungen.

## 🫀 «Läuft» ist nicht «arbeitet» — drei Motoren-Lehren an einem Tag (2026-08-23)
1. **Der Aufseher stand 72 Minuten still, während beide Stunden-Routinen «AUFSEHER laeuft»
   meldeten.** Er lebte, arbeitete aber nicht. Von aussen war bisher nur «0 Instanzen» und
   «>1 Instanzen» erkennbar — die Lücke, die Lehre 0f offengelassen hat. Er schreibt jetzt
   in JEDER Runde `/tmp/_fixer_herzschlag`; `engine_keepalive.sh` tötet und startet neu,
   wenn der älter als 10 Minuten ist. ⚠️ Fehlt die Datei ganz, wird NICHT getötet — sonst
   killt das Skript bei jedem Lauf einen gesunden Aufseher alter Fassung. Und beim Abräumen
   von Doppelstarts wird die Herzschlag-Uhr **zurückgesetzt**: Der Überlebende ist der
   ÄLTESTE, und genau der kann der hängende sein.
2. **Ein Dauerläufer, der SOFORT stirbt, sieht im Log aus wie einer, der läuft** — man sieht
   nur Startzeilen. `cj_queue_runner.sh` starb drei Stunden lang bei jedem Start in Zeile 5
   («SHOPIFY_CLIENT_ID: fehlt»), weil es `/tmp/secrets_env.sh` nicht lud wie die vier
   Grind-Runner. Aufgefallen ist es nur daran, dass dieselbe Startmeldung dreimal
   hintereinander in der Keepalive-Ausgabe stand. **Wer eine Engine neu in eine Startliste
   aufnimmt, liest danach ihr LOG, nicht ihre Startmeldung.**
3. **Der Auto-Committer lief seit Wochen nur als `/tmp/autocommit.sh`** — die Klasse, die
   dieses Projekt schon zweimal verloren hat. Jetzt `automation/autocommit.sh`, und
   `engine_keepalive.sh` bevorzugt generell die Repo-Fassung einer /tmp-Engine.
   ⚠️ Er addiert nur noch **`dropship/`**: Mit `git add -A` hat er am 22.08. ein frisch
   gebautes Werkzeug in eine Sammelmeldung «CJ-Ledger auto» gezogen, bevor der Grund dafür
   geschrieben war. Ledger sind Rauschen und gehören gebündelt; Code und Gedächtnis
   brauchen eine Begründung und bleiben liegen, bis sie jemand bewusst committet.
4. ⚠️ Ein `[ "$stand" -ge 5 ]` bricht mit «integer expression expected» ab, wenn die Datei
   LEER ist: `: > datei` hinterlässt keine 0, `cat` gelingt, und `|| echo 0` feuert nie.

## 💸 Der «Normalpreis» war nie der Preis — 57 Streichpreise entfernt (2026-08-24)
Das dritte Audit belegte mit der eigenen Aktenlage, dass die Streichpreise der Eigenmarke
KONSTRUIERT waren: `dropship/PRODUKT-PIPELINE.md` (30.05.) führt dieselben Produkte
SKU-identisch zum heutigen «Aktionspreis» — der durchgestrichene Wert (×1.55/1.65/1.70)
wurde nie verlangt. PBV Art. 16 verlangt einen tatsächlich verlangten, befristeten
Vergleichspreis; dieser lief 96 Tage, 28 von 36 Produkten standen im Google-Kanal.
- `automation/streichpreis_entfernen.py`: 57 compareAtPrice auf null, Verkaufspreis
  unangetastet, live geprüft, WebFetch-Gegenprobe. Ausnahme 15431914783105 (Thomas Sabo,
  mögliche echte UVP) → Betreiber.
- **`streichpreise.py` STILLGELEGT**: es hat 8 Fantasiewerte AUFGERUNDET (38.93→39.90)
  statt sie zu hinterfragen — sein eigener Docstring wusste, dass sie konstruiert sind.
  **Ein unbelegter Streichpreis wird entfernt, nie gerundet.**
- Quellenfix durch Nichtstun: kein Importer schreibt compareAtPrice (Grep: 0 Treffer).
- ⚠️ Shopifys Suchfilter `variants.compare_at_price:>0` ist WIRKUNGSLOS (der Gegentest
  mit einem erfundenen Feldnamen liefert dieselbe Trefferliste) — Kandidaten kommen nur
  aus dem Bulk-Export, live je Produkt nachgeprüft.

## 📐 Titel gegen den eigenen Text: 4K bei nativ 720p, 20'000 mAh bei 10'000 (2026-08-24)
Titel und Beschreibung stehen im SELBEN Google-Feed-Datensatz — ein Widerspruch ist dort
maschinell lesbar (Misrepresentation-Klasse), im einzigen Kanal mit Verkäufen. Repariert:
4 «4K»-Beamer (einer nativ 720p = ein Neuntel der Pixel), 3 Fantasie-Lumen (99'000'000
Lumen für CHF 23.90), 2 Powerbanks (Titel 20'000, Text 10'000 — «intern» rettet nichts,
die Zellkapazität liegt IMMER über der abgebbaren), die 100'000-mAh-Behauptung.
- **CJ als Beleg taugt hier nicht: der Lieferant WIEDERHOLT die Fantasiezahl nur** — er
  ist ihre Quelle. Physik entscheidet (370 Wh im Plastikgehäuse für CHF 17.90).
- **7 Handles trugen die falsche Aussage weiter** (4k-…, 20000-lumen-…) — dieselbe Klasse
  wie die Blutzucker-URLs: Wer eine Aussage aus einem Feld entfernt, prüft ALLE Felder.
  Neu gebaut, Eindeutigkeitsnummer behalten, je eine 301.
- Quellenfix `automation/technik_plausibel.mjs` in allen DREI Importern (fünfte
  Geschwister-Wiederholung): native Auflösung schlägt Titel-Auflösung, Text-mAh schlägt
  Titel-mAh, >30'000 mAh oder >20'000 Lumen (bzw. >5'000 am USB-Akku) → Produkt verworfen.
- Titel-Bild-Klasse: «10 Zoll FPV Traverse Maschine» für CHF 96.90 zeigte ein NACKTES
  Rahmen-Kit — die Groq-Beschreibung erfand einen «10-Zoll-Bildschirm» (10 Zoll ist die
  Propellergrösse). Jetzt «Rahmen-Kit · ohne Elektronik». «S6 Blau Dual-Kamera» verriet
  nirgends, dass es eine DROHNE ist.

## 🧴 «creme» ist eine Farbe — sechs Kollektionsregeln auf Vollwörter (2026-08-24)
`TITLE CONTAINS "gie"` holte **109 Fremdtreffer** in die Garten-Werkzeuge (TechnoloGIE,
LeGIErung, MaGIE, EnerGIE, ReGIEstuhl); «wein» traf weinrot und WildschWEIN; «matte»
Auto-Fussmatten und MATTEl (Barbie als DRAFT in der Camping-Kollektion); «creme» hängte
Sofabezüge, Teppiche und eine Dirndlbluse in die GESICHTSPFLEGE — creme als Farbwort.
Alle sechs Regelwerke auf Vollwörter (gartenschere, weinglas, blumentopf, schlafmatte,
gesichtscreme …), danach gegen die PRODUKTLISTE geprüft, nicht nur gezählt.
- ⚠️ Restrauschen dokumentiert: «MilchGIESSKANNE» fällt in die Gartenwerkzeuge — dieselbe
  Falle eine Ebene tiefer. Einzelfälle, keine Klassen; CONTAINS kann nicht mehr.
- Und die Erinnerung, die diesen Tag geprägt hat: **Zwischen Audit-Messung und Reparatur
  arbeiten PARALLELE Läufe.** Der Diffuser-Guide, das Impressum, der Footer und der
  Wochenend-Fix im Lieferdatum waren beim Anfassen schon repariert — zweimal fast doppelt
  geschrieben. Vor jeder Reparatur den LIVE-Stand lesen, nicht den Bericht.

## 🧱 «Fertig» ist nicht «hat gearbeitet» — der Queue-Runner lief leer (2026-08-23)
Zweiter Akt derselben Lehre am selben Tag. Morgens fehlten `cj_queue_runner.sh` die
Zugangsdaten, es starb in Zeile 5; ich habe sie ergänzt, den Start gesehen, ins Log geschaut —
und dort standen Start- und **Fertigzeile**. Genau so sieht auch ein erfolgreicher Lauf aus.
Tatsächlich standen **alle 23 Gruppen im Ledger** `/tmp/cj_grp_done.txt`, die Schleife übersprang
jede einzelne und war in unter einer Sekunde durch. Der Aufseher startete das Ganze alle 25
Minuten, es lief, und tat nichts.
- **Regel: Nicht das Ende eines Laufs prüfen, sondern die ZAHL der bearbeiteten Einheiten.**
  Ein Ledger, das voll ist, sieht von aussen aus wie Arbeit, die getan wurde.
- Sind alle Gruppen erledigt, wird das Ledger jetzt geleert und eine neue **Runde** begonnen;
  die Paginierungstiefe wächst mit der Runde (`MAXPAGE=5+R*3`, max 40) — eine neue Runde auf den
  flachen Top-Seiten fände 0 Neue (DEPTH-Lehre 29.07.).
- ⚠️ **Ein erschöpftes CJ-Tagesbudget quittiert die Gruppe NICHT mehr.** `cj_category_fill.mjs`
  endet bei Code **16900500** mit «FERTIG: 0» und **Exit 0** — die Gruppe hätte als erledigt
  gegolten, obwohl nichts geholt wurde, und die nächste Runde hätte sie übersprungen. Eine so
  falsch quittierte Zeile musste gelöscht werden. **Ein leeres Budget ist keine erledigte Arbeit.**

## 🧾 Eine Pflanzenlampe wurde in fünf Kleidergrössen angeboten (2026-08-23)
Der Faktenblock «Produktdetails» trug bei **3'742 aktiven Produkten** Angaben, die nichts sagen
oder falsch sind: «Material: hochwertiges Material» (2'573), «Farbe: verschiedene Farben» (1'406),
«Grösse: XS, S, M, L, XL» (841). Die ersten beiden sind Werbefloskeln in einem Faktenfeld; die
dritte ist die teure Klasse. Das **Smart-Anzuchtset mit LED-Pflanzenlampe** (15412678328705) hat
live **genau eine Variante** («Default Title») und bewarb trotzdem fünf Kleidergrössen — ebenso
ein Silikon-Lätzchen-Set, eine Schreibtischlampe, eine SKY-Fernbedienung und ein Sushi-Teller-Set.
Der Baustein wurde beim Import über jedes Produkt gelegt, unabhängig davon, was es ist.
- **Die Wahrheit kommt aus dem Produkt selbst**, nicht aus einer Vermutung: `automation/
  produktdetails_wahrheit.py` liest LIVE die Optionen. Gibt es eine Grössen-Option, stehen deren
  echte Werte im Block; gibt es keine, fällt die Zeile weg. Dasselbe bei Farbe. «hochwertiges
  Material» wird ersatzlos entfernt — ein leeres Feld ist besser als eine Floskel (dieselbe Regel
  wie beim Metafeld `material` und bei `google_product_category`).
- **Zweiter Modus `MODUS=spiegel`** für die Audit-Klasse «roher CJ-Variantenschlüssel als Farbe»
  (1'055 Produkte): Beim Strick-Cardigan 15448591892865 steht in der Option sauber «Dunkelgrau,
  Schwarz, Weiss», im Text «Dark Gray-XXS, Dunkelgrau, Black-XXS, Schwarz». Der Text ist nicht
  falsch geraten, sondern **stehengeblieben** — heute wurden 558 Farbwerte übersetzt und 349
  Grössen aus dem Farbwert geholt, alles an der OPTION. **Der Modus braucht keine Wortliste: die
  Option ist die Wahrheit, der Text hat sie zu spiegeln.** Läuft NACH dem Floskel-Lauf, nie
  parallel — zwei Schreiber auf demselben Feld sind die Fehlerklasse vom 15.08.
- Die **Quelle ist versiegt**: von den 30 zuletzt angelegten aktiven Produkten trägt keines eine
  der drei Floskeln. Altbestand, kein nachwachsender Fehler.

## 🇬🇧 Englische Titel: der Finder scheiterte an deutschen Zusammensetzungen (2026-08-23)
95 Produkttitel waren laut Audit vollständig englisch. Der erste Finder meldete 179 — **59 davon
Fehltreffer, alle derselben Ursache**: Deutsche Zusammensetzungen stehen in KEINER Wortliste.
«Autoscheinwerfer», «Hundebett», «Damenuhr», «Kindersonnenbrille», «Freizeitschuh», «Batteriebox»
galten als englisch. Jetzt wird jedes Wort probeweise in zwei deutsche Wörter zerlegt; dazu sind
Titel mit «…» ausgeschlossen (T-Shirt «Bernese Dog» ist unsere eigene Motivbenennung).
- ⚠️ **Und die Wache, die den Rest rettete:** Von 59 kuratierten Kandidaten trugen **neun live
  längst einen deutschen Titel**, den ein anderer Lauf gesetzt hatte — bei zweien wäre meine
  Übersetzung SCHLECHTER gewesen (live «Bein-Make-up, wasserfest» → ich hätte «Foundation»
  geschrieben; live «Glättkamm mit LCD-Anzeige» → ich «Wellen-Styler»). Derselbe Fehler wie am
  Mittag, als ich 22 bereits reparierte Markentitel aus altem Export überschrieb.
  **Geschrieben wird nur, wenn der LIVE-Titel noch exakt der englische ist**, auf den sich die
  Übersetzung bezieht. 51 gesetzt.
- Jede Übersetzung ist von Hand gesetzt und an der deutschen Beschreibung geprüft. Wo die
  Bedeutung unklar blieb, bleibt das Produkt englisch: «Tearing Lip Liner Pen Set», «3D Fiber Eye
  Black», «Smart Remote Key Card», «Bell Pet GPS Tracker» (Marke oder Bauteil?).
  **Ein falscher deutscher Titel ist schlimmer als ein englischer.**
- Die Quelle ist dicht: alle drei CJ-Importer prüfen seit dem 20.08. mit `echoVomLieferanten()`.

## 🛒 Die Produktseite sagte «versandbereit» über einem Liefertermin in 14 Tagen (2026-08-23)
Als Kundin gelesen behauptet die Seite eines CJ-Kleids zwei Dinge gleichzeitig:
«🟢 Auf Lager · versandbereit» und darunter «Lieferung voraussichtlich 6.–20. Sept.».
Das Abzeichen hing allein an `product.available` und kannte den Versandweg nicht —
**obwohl der direkt darunter berechnet wird**. Der Versandaussagen-Lauf vom 14.08. hat
1'037 Produkttexte auf eine Wahrheit gebracht; dieses Abzeichen hat er nie gesehen.
Jetzt sagt es je Weg die Wahrheit (CH-Lager «versandbereit» · EU-Lager · «Wird für dich
gedruckt» · «Verfügbar · Versand direkt ab Werk»), und die Zeile darunter erklärt die
lange Frist statt sie zu beschönigen: «Direktversand ab Werk — deshalb die längere Lieferzeit».
**Dazu die Mass-Tabellen auf die Produktseite geholt.** 15'099 aktive Fashion-Produkte,
**0 mit einer Grössentabelle** im Text — die Grösse war nur über einen Link erreichbar, der
von der Seite WEGFÜHRT. Jetzt aufklappbar direkt dort, plus der wichtigste Satz offen:
«Diese Ware ist asiatisch konfektioniert und fällt eher kleiner aus.»
⚠️ Die Zahlen wurden NICHT ins Theme kopiert — der Block liest `pages['groessentabelle'].content`.
Eine Quelle, die nicht auseinanderlaufen kann; ist die Seite weg, greift der alte Link.

## 🧩 Der Farbwert trug DREI fremde Angaben — und `CREATE` hätte Ware erfunden (2026-08-23)
Nach der Grössen-Reparatur fielen zwei weitere Klassen im selben Feld auf:
1. **Dieselbe Farbe zweimal, deutsch und englisch** («Blau» neben «Blue»). Vorher versteckt
   in «Blue-0XL», nach der Grössen-Reparatur nebeneinander sichtbar. `farbwerte_uebersetzen.py`
   scheitert daran zu Recht mit «Option value already exists» — **dieser Fehler ist eine
   Schutzfunktion**, ein Umbenennen würde zwei Varianten mit verschiedenen CJ-SKUs
   verschmelzen. `automation/farbwert_dubletten.py` hängt stattdessen die VARIANTEN um:
   **130 Produkte, 453 Varianten**, 10 wegen Kollision unberührt gelassen.
2. **Ringgrösse, Speicher und Kissenmass im Farbwert** — bei **222 Produkten ist «Farbe» die
   EINZIGE Option** und trägt beides: «Black Gold-5 … Silver-9», «Silver-64GB»,
   «Amber-30X50cm». Die Kundin sieht neun Einträge im Farb-Dropdown und kann nicht ahnen,
   dass sich vier davon nur in der Ringgrösse unterscheiden. `automation/mass_im_farbwert.py`
   legt eine ZWEITE Option an («Grösse» · «Speicher» · «Inhalt») — es löscht nichts, jede
   Variante behält ihre Angabe in zwei Feldern statt in einem. **105 Produkte getrennt**
   (70× Grösse, 20× Speicher, 15× Inhalt), 0 Kollisionen.
3. **Dasselbe Mass in JEDEM Farbwert** («Blue-30X30cm · Yellow-30X30cm · Green-30X30cm»,
   83 Produkte). Das ist keine Wahl, sondern eine Produkteigenschaft — sie steht in jedem
   Dropdown-Eintrag im Weg und gehört in den TITEL. **76 Produkte** bereinigt, live:
   «Kugeliges Zierkissen im nordischen Stil · 30 × 30 cm», Farbliste 7 saubere Werte.
   ⚠️ **Ohne Einheit wird nichts in den Titel geschrieben.** «45x45» ist bei einem
   Kissenbezug fast sicher Zentimeter — «fast sicher» ist die Sorte Vermutung, an der dieses
   Projekt schon Geld verloren hat. Diese 6 bleiben unberührt: hässlich, aber wahr.

**DIE GEGENPROBE, die diesen ganzen Tag absichert** — frischer Bulk-Export vorher/nachher:
vorher 45'860 Produkte / 386'600 Varianten · nachher 46'727 / 395'482 ·
**Produkte mit WENIGER Varianten: 0**. 16 Produkte fehlen ganz — alle aus den
Risikoklassen, die die täglichen Wächter draften (Butterfly-Messer, Feder-Abwehrstock,
Fetal-Doppler, Vernebler, Hörgerät, Anti-Reflux-Babykissen, verdeckte GPS-Tracker);
**keines davon stand in einem meiner Ledger**. Damit ist belegt, dass keines der drei Werkzeuge
irgendwo Varianten verschmolzen hat — genau das Risiko, gegen das die Kollisionswachen
gebaut sind. Vorher hatte ich nur Stichproben, und eine Stichprobe beweist bei 45'000
Produkten nichts. **Wer massenhaft an Optionswerten schreibt, zählt hinterher die
Varianten — vollständig, nicht stichprobenweise.**
- ⚠️ **`productOptionsCreate(variantStrategy: CREATE)` legt das KARTESISCHE PRODUKT an.**
  Bei einem Kissenbezug mit 21 Farben × 4 Massen wären aus 21 echten Varianten **84**
  geworden — erfundene Ware, die es beim Lieferanten nicht gibt, mit leeren SKUs und
  Preisen. Richtig ist **`LEAVE_AS_IS`** plus ein eigener `productVariantsBulkUpdate`.
  (`MANAGE` gibt es in 2024-10 nicht; die Enum kennt nur diese zwei Werte.)
- ⚠️ **Eine blosse Zahl hinter dem Bindestrich ist keine Grösse.** Der «Bluetooth Grip Ring
  Handtrainer» führt «001-1 · 001-2 · 001-3» — eine Modellnummer. Die Regel greift bei
  blossen Zahlen deshalb nur, wenn der vordere Teil als Farbe erkennbar ist
  (`farben_de.json`). Fünfte Substring-Falle in derselben Familie wie «IPL» in «L-IPL-iner».
- Farbtabelle in einem Zug **280 → 414 Einträge**, aus der Häufigkeitsliste des frischen
  Exports. **NICHT aufgenommen**: Werte mit Mass- oder Bauteilangabe («Black Increased 6CM»,
  «Black Thin Shoes») — dort ist die Struktur falsch, nicht die Sprache; und Marken-/
  Pinyin-Namen («Xingyao Black», «Weilai Gray»), deren Bedeutung ich nicht belegen kann.
  ⚠️ «Olive», «Sand», «Indigo», «Golden», «Khaki», «Beige» sind schon deutsch — sie sahen in
  der Trefferliste nach 4'352 unübersetzten Werten aus.

## 📏 Die Grösse stand im Farbwert — weil die Grössenliste dreimal existierte (2026-08-23)
350 aktive Produkte führten Farbwerte wie **«Aprikose-2XL», «Red-7XL», «Gray-0XL»**, während
der Grössen-Slot einen Füllwert trug — bei 1'700 von 1'700 Varianten exakt die KLEINSTE
Grösse des Produkts. Die Grössenleiter riss dadurch auf: «Florales Etuikleid» führte live
S · M · L · 3XL · 4XL, das 2XL steckte im Farbfeld.
**Die Ursache lag in einer Menge, nicht im Parser.** `parseVar` in `cj_category_fill.mjs`
trennt Farbe und Grösse korrekt — aber `isSize` fragt `SIZESET`, und dort fehlten genau die
Randgrössen: **0XL, 1XL, 7XL–11XL und XXS**. `LETTERSIZE` (`[0-9]X{1,5}[SL]`) kannte diese
Formen die ganze Zeit; nur die Menge nicht. Und die Menge stand **dreimal im Repo mit drei
verschiedenen Inhalten** (`cj_category_fill` ohne XXS, `cj_variant_backfill` ohne 2XL,
`cj_trending_import` ohne beides). Jetzt: **`automation/cj_groessen.mjs`, neue Grössen NUR
dort** — vierte Wiederholung nach Farbtabelle, Preisformel und `publishVerified()`.
- Bestand repariert mit `automation/groesse_im_farbwert.py`: **349 Produkte, 1'634 Varianten**,
  0 Kollisionen. Gegenprobe: Farbliste 10 → 6 Werte, Variantenzahl unverändert (25 → 25).
- ⚠️ **Die Reihenfolge ist die ganze Reparatur.** «Aprikose-2XL» → «Aprikose» umzubenennen
  kollidiert mit dem vorhandenen Wert und VERSCHMILZT zwei Varianten mit verschiedenen
  CJ-SKUs. Richtig ist: die **Variante** ans Ziel (Farbe, Grösse) umhängen, vorher prüfen ob
  das Ziel belegt ist, und bei Kollision das **ganze Produkt** unberührt lassen. Shopify
  räumt den leeren Farbwert danach selbst weg.
- ⚠️ Der Farbname wird nur um den Anhang gekürzt, **nie geraten**: «Himmelblau-2XL» wird
  «Himmelblau», auch wenn das Produkt schon «Hellblau» führt. Beides könnte dieselbe CJ-Farbe
  sein — aber das ist eine Vermutung.
- **Sichtbare Folge, die man einplanen muss:** Nach der Reparatur steht «Blau» neben «Blue»
  in derselben Liste (vorher versteckt in «Blue-0XL»). Dafür gibt es jetzt
  `automation/farbwert_dubletten.py` — dieselbe Umhäng-Mechanik, 209 Kandidaten.
  `farbwerte_uebersetzen.py` scheitert an diesen Fällen zu Recht mit «Option value already
  exists»; **dieser Fehler ist eine Schutzfunktion, kein Defekt.**

## 🎨 «XK76» IST CJs Farbname — es gibt keine Ebene darunter (2026-08-23)
24 aktive Produkte zeigen im Farbfeld reine Codes: `XK76 · XK222`, `CDCS1001 … CDCS10012`,
`WVWY 010`. Der Katalog-Audit schrieb dazu die naheliegende Reparatur vor: «keine geratenen
Farbnamen — CJ kennt zu jedem Varianten-SKU die echte Farbe, die muss abgefragt werden.»
**Live geprüft, und die Annahme ist falsch.** `product/variant/query?productSku=CJDS2863313`
liefert für alle 96 Varianten `variantKey: "XK76-XS"`, `variantNameEn: "… Shirt XK76 XS"`,
`variantName: null`. Der Lieferant selbst nennt das Muster «XK76».
**Was tatsächlich hilft, steht in derselben Antwort:** `variantImage` ist je Code
verschieden (16 Bilder auf 96 Varianten). Ein Variantenbild ersetzt den Namen durch das,
was die Kundin ohnehin sehen will — bei einem Blumenprint aussagekräftiger als jedes
Farbwort. Die Produkte stehen jetzt in `dropship/_cj_variantenbild_prio.txt`.
**Lehre: Bevor man eine Reparatur plant, die eine fremde Quelle voraussetzt, fragt man die
Quelle EINMAL.** Ein ganzer Reparaturlauf wäre gegen eine Datenebene gebaut worden, die es
nicht gibt.
⚠️ Und zwei Fehlerklassen im eigenen Suchmuster, beide alte Bekannte in neuer Form:
**Grössensysteme** («EU 52 · EU 54» ist eine Ringgrösse, «US 10» eine Schuhgrösse,
«EU38–EU45») und **Massangaben** («2000ML · 2600ML · 3300ML» ist das Fassungsvermögen).
Ein Buchstabenpräfix vor Ziffern ist kein Code — erst die Bedeutung entscheidet.

## 🧴 Smart-Collection-Regeln können «IPL» nicht fangen — Bindestriche helfen NICHT (2026-08-21)
Die Kollektion `beauty-geraete` stand mit 58 Produkten da, alle DRAFT (BigBuy-Leichen), und war
aus einem veröffentlichten Ratgeber verlinkt. Statt sie zurückzuziehen liess sie sich mit aktiver
CJ-Ware füllen — der erste Versuch nahm `TITLE CONTAINS "IPL"` auf und holte damit **10 Lipliner,
2 Gamepads («Mult-IPL-attform»), einen Folienspender («Tr-IPL-eRoll») und eine Gummiplatte**
(«Gumm-IPL-atte») in die Beauty-Reihe. Exakt die Falle, die hier seit dem 12.08. unter der
Hype-Reihe steht — ich bin trotzdem hineingelaufen, weil ich sie für ein Python-Regex-Problem hielt.
- ⚠️ **`\b` gibt es in Shopifys CONTAINS nicht**, und der naheliegende Ausweg funktioniert auch
  nicht: **`"IPL-"` verhält sich wie `"IPL"`**, weil Shopify Bindestriche beim Vergleich ignoriert
  (dieselbe Tokenisierung wie bei `title:"…"` und beim Handle). Der zweite Versuch machte es
  schlimmer: 99 statt 65 Produkte, die Lipliner alle noch drin.
- **Die Lösung ist nicht ein besseres Muster, sondern ein anderes Wort.** Die echten Geräte tragen
  ohnehin ein eindeutiges zweites Wort: `Haarentfernung`, `Hautverjüngung`, `Photon`, `Mikrostrom`,
  `Gesichtsreinigungsbürste`, `LED-Maske`, `Lichttherapie`, `Ultraschall-Gesicht` → 100 Produkte,
  **0 Fehltreffer**. Kurze Abkürzungen (IPL, EMS, LED, RF) taugen NIE als alleinige CONTAINS-Regel.
- **Und: die Regel nach dem Setzen gegen die Produktliste prüfen, nicht nur zählen.** Die Zahl 65
  sah plausibel aus; erst der Blick auf die Titel zeigte den Gaming-Controller zwischen den
  Beauty-Geräten. Gefunden hat ihn WebFetch auf der Live-Seite, nicht meine eigene Zählung.

## ⌚ Der Titel war sauber, die URL nicht — 33 Adressen warben mit Blutzucker (2026-08-21)
Frühere Sessions haben «Blutzucker» aus 11 Armband-TITELN gestrichen (11.08.) und der Audit
weitere Wearables entschärft. Der Handle blieb jedes Mal stehen. Am 21.08. hiess ein Produkt
«F600 Fitness-Smartwatch mit Aktivitäts-Tracking» — und wohnte weiter unter
`/products/f600-smartwatch-mit-blutzucker-**tracking**-606700`. **34 aktive Produkte** trugen
Blutzucker, Blutdruck oder EKG in der Adresse. Die URL steht im Browser, in Googles Index und
im Merchant-Feed.
**Regel: Wer eine Aussage aus einem Feld entfernt, muss ALLE Felder prüfen, die sie tragen** —
Titel, Beschreibung, SEO-Titel, SEO-Text, Handle. Der Handle ist dabei der unauffälligste und
überlebt jede Textreparatur (dieselbe Beobachtung wie bei der Refurb-Prüfung des Audits:
`damenuhr-chronotech-restauriert-a-296438` verrät die Ware, deren Titel längst gesäubert ist).
- `automation/handle_messversprechen.py` (täglich im Aufseher): baut den Handle aus dem
  AKTUELLEN Titel neu, behält die Eindeutigkeitsnummer und legt **immer eine 301** an — ein
  Handle-Wechsel erzeugt in Shopify KEINE Weiterleitung, ohne sie wird jeder Link zum 404.
- `automation/wearable_messversprechen.py` streicht die Aussagen aus Titel und Text.
  **Die Unterscheidung ist der ganze Punkt:** Blutdruck, EKG und Blutzucker kann ein optischer
  Sensor am Handgelenk nicht messen → raus. **Blutsauerstoff/SpO2 bleibt** (bei Consumer-
  Wearables seit Jahren Standard, auch bei Apple und Garmin), Herzfrequenz sowieso.
  «Körpertemperatur» wird zu «Hauttemperatur» **präzisiert statt gestrichen** — gemessen wird
  die Haut. Von 164 Wearables mit Mess-Aussagen blieben so 31 zu reparieren statt 164.
- ⚠️ **Regex-Textchirurgie hinterlässt Satzreste.** Der erste Entwurf schnitt nur die Wörter
  heraus: «Es misst präzise **Ihr die** Herzfrequenz» und ein Satz, der mit Kleinbuchstaben
  begann. Jetzt wird SATZWEISE gearbeitet — ein Satz, der nach der Streichung nicht mehr trägt,
  fällt ganz weg. Ein halber Satz ist schlimmer als ein fehlender.
- ⚠️ **Für den TITEL gilt die Satzregel nicht**: Shopify lehnt einen leeren Titel ab
  («Title can't be blank»), und genau das passierte bei «Smart-Armband mit Blutdruck- und
  Herzfrequenzmessung». Titel werden nur beschnitten, nie verworfen; bleibt zu wenig übrig,
  gewinnt der alte Titel.
- **Fehltreffer, die stehen bleiben müssen:** «Smartwatch Schutzhülle» erklärt nur, wie man die
  EKG-Funktion der eigenen Uhr nutzt · «Smart Ring … können Sie **manuell** Blutdruck erfassen»
  ist eine Tagebuch-Funktion, keine Messung · «Mountain **EKG** Kurzarm-Shirt» ist ein
  Herzschlag-Muster auf Stoff.
- ⚠️ Nicht angefasst: das Metafeld `judgeme.review_widget_data`. Es trägt bei 15 Produkten den
  ALTEN Namen («F600 Smartwatch mit Blutzucker-Tracking»), ist aber fremder App-Cache, der sich
  beim nächsten Sync selbst erneuert. Daran zu schreiben riskiert ein kaputtes Bewertungs-Widget.

## 🖼️ Fremdtext in Produktbildern — das Werkzeug ist HINSEHEN, kein Algorithmus (2026-08-21)
Der Katalog-Audit nannte als offene Lücke, dass es keine Prüfung für **eingebrannten Fremdtext
in Hauptbildern** gibt (englische Verkaufs-Infografiken, Werbe-Siegel, Verpackungs-Collagen) —
Texterkennung scheitert daran, sie kennt nur Englisch und meldet Gramm-Angaben als Treffer.
Die Schätzung lautete «25–35 % der Neuimporte».
**Gemessen sind es deutlich weniger: 4 von 67 (6 %)** in den Startseiten-Reihen. Die Schätzung
war zu hoch — geprüft wurde per Kontaktbogen (`automation/bild_kontaktbogen.py`): 60 Bilder auf
EIN Blatt, dann mit dem Read-Werkzeug ansehen. Fremdtext, Collagen und Kartonverpackungen fallen
in Sekunden auf, und es kostet keine CJ-Punkte.
- Gefunden: «Luminous backpack» als Schriftzug auf einem LED-Rucksack · zwei Halsketten, die
  ihre Verkaufsverpackung zeigten statt des Schmucks · ein rotes Siegel «S925 REAL STERLING
  SILVER» quer über dem Produktfoto.
- **Repariert ohne neues Bildmaterial:** Fast jedes CJ-Produkt hat 3–8 Bilder, darunter meist
  ein sauberes → `productReorderMedia` holt es nach vorn.
- ⚠️ **NIE blind «Bild [1] nach vorn» — erst den GANZEN Bildsatz ansehen.** Genau das habe ich
  am 21.08. bei drei Aufbewahrungs-Sets getan und es damit VERSCHLIMMERT: aus «3PCS» wurde
  «Two opening methods», aus «6pcs» wurde «ULTIMATE ORGANIZATION TOOL». Bei diesen Produkten
  trägt JEDES der acht Bilder Text; eines davon war bereits das beste. Der zweite Anlauf mit
  dem vollständigen Bogen fand für jedes das produktzeigendste Bild — bei einem war das
  Original die richtige Wahl. Ein Kontaktbogen kostet zwei Minuten, ein blinder Griff macht
  die Produktseite schlechter.
- ⚠️ **Ein Markenlogo ist kein Fehler.** «Julystar PROFESSIONAL MAKE-UP» auf einem Rouge-Stick
  steht auf der Verpackung des Produkts selbst. Die Trennlinie: Text AUF DER WARE gehört dazu,
  ins Bild MONTIERTER Text (Schriftzüge, Preisbadges, Pfeile, Panels) gehört weg.
- ⚠️ **Und die eigene Stichprobe gegen die Wirklichkeit prüfen:** Mein erster Kontaktbogen zog
  `blitzversand-schweiz` und zeigte 12 Fasnachtskostüme — ich hielt das für einen Startseiten-
  Befund. Die Startseite zeigt aber `blitzversand-**highlights**` (BEST_SELLING, kuratiert, 0
  Kostüme). Welche Kollektion eine Reihe WIRKLICH speist, steht in `templates/index.json`;
  ein ähnlicher Handle ist kein Beleg.

## 🗂️ 34 veröffentlichte Kollektionen ohne Ware — und wie man sie richtig füllt (2026-08-21)
Der Wächter `kollektion_leer.py` fand **12 Kollektionen mit NULL kaufbaren Produkten und 22 mit
ein bis zwei**. Ursache in fast allen Fällen: Die Smart-Regel hängt an einem Tag, den nur
BigBuy-Ware trug (`TAG=Bar`, `TAG=Audio`, `VENDOR=Clinique`) — und die ist seit der
BigBuy-Stilllegung vollständig gedraftet. Sieben waren aus veröffentlichten Ratgebern verlinkt.
**14 liessen sich mit aktiver Ware FÜLLEN statt zurückziehen** — die bessere Antwort, weil eine
Kategorie mehr wert ist als eine Weiterleitung:
`beauty-geraete` 0→100 · `ordnung-aufbewahrung` 2→411 · `lederwaren` 1→355 · `yoga` 2→244 ·
`drohnen-kameras` 2→202 · `audio-sub` 2→125 · `recovery` 1→75 · `spielzeug-pluesch` 1→59 ·
`auto-handy` 2→54 · `pool` 0→48 · `loungewear` 1→41 · `kuschel-heizdecken` 1→17.
**20 zurückgezogen**, jede mit 301 auf eine Kollektion, deren kaufbaren Bestand ich vorher
EINZELN geprüft habe — eine Weiterleitung auf die nächste leere Kollektion verschöbe das Problem.
- ⚠️ **Shopify lehnt eine Weiterleitung auf eine Weiterleitung ab** («Target can't redirect to
  another redirect»). `/collections/spielzeug` und `/collections/gadgets` sind selbst schon
  umgeleitet → das ENDZIEL nehmen (`kinderspielzeug`, `trends-gadgets`). Erst über
  `urlRedirects(query:"path:…")` nachsehen, dann setzen.
- **Welche Wörter taugen als TITLE-Regel** (Probelauf ist Pflicht, siehe IPL-Eintrag oben):
  gut sind `Kopfhörer`, `Drohne`, `Organizer`, `Aufbewahrung`, `Yoga`, `Leder`, `Plüschtier`.
  Untauglich: **`Figur`** trifft fast nur «figurbetont»/«Figurschmeichelnd» (Damenmode),
  **`Plüsch`** allein trifft Handschuhe, Kissenbezüge und ein Shirt mit Stickerei,
  **`Shaker`** trifft Protein-Shaker und einen Tattoo-Mixer, **`Cocktail`** ein Kleid und
  einen Sticker. Wo kein sauberes Wort existiert, ist die Weiterleitung die ehrlichere Lösung.

## 🔢 «point» steckt in JEDER CJ-Antwort — der Kosten-Backfill lief nie (2026-08-21)
Seit dem 20.08. sollte `cj_kosten_backfill.mjs` die Einkaufspreise nachtragen; dafür bekam er
sogar ein eigenes Vorrang-Fenster (16:00–17:30 UTC, der Grind pausiert). Nach einem ganzen Tag
standen **17 Produkte** im Ledger. Zwei Fehler, beide von der Art «eine Warteanweisung als
Abbruchgrund gelesen»:
1. **Der Punktetest suchte nach dem WORT.** `/point|credit|1690050/i.test(JSON.stringify(j))`
   — CJ hängt aber an **jede** Antwort den Block
   `"pointsInfo":{"total":61171,"usedToday":101960,"remaining":455}`. Das Wort «point» steht
   also immer drin, und der Lauf hielt jede Antwort für ein leeres Budget und brach beim
   ERSTEN Aufruf ab. Gelesen wird jetzt die ZAHL `pointsInfo.remaining` (Grenze 20).
2. **Shopify-Drosselung galt als «antwortet nicht».** `{"errors":[{"message":"Throttled"}]}`
   führte zum Abbruch des ganzen Laufs. Die Abfrage kostet 149 Punkte, verfügbar waren 46 —
   die übrigen Engines teilen sich dasselbe Kontingent. Shopify füllt mit 100 Punkten/Sekunde
   auf; `sgql` wartet jetzt die Differenz ab (`extensions.cost.throttleStatus`) statt aufzugeben.
Nach dem Fix: 40 Produkte in einem Lauf, danach sauberer Halt bei 17 Restpunkten.
**Regel: Bevor ein Skript «Budget leer» meldet, muss es die Zahl gelesen haben.** Und eine
Drosselung ist nie ein Grund aufzuhören — sie sagt nur, wie lange zu warten ist.

## ♾️ Ein Wächter, der nur MELDET, wird nie fertig — 131 Vollscans für einen Befund (2026-08-21)
Der Aufseher startet jeden Katalog-Lauf neu, solange dessen Log keine `FERTIG`-Zeile trägt.
`fremdzeichen_guard.py` ersetzt Fullwidth-Zeichen, MELDET aber CJK-Ideogramme nur (eine geratene
Übersetzung wäre schlimmer als ein sichtbarer Rest) — und sein FERTIG hing an
`ersetzt == 0 and gemeldet == 0`. Die zweite Bedingung kann bei einem Melde-Wächter **nie**
eintreten. Folge: alle zwei Minuten ein Vollscan über einen 74-MB-Export plus Shopify-Abfragen,
131-mal, für EINEN Befund, der auf eine Menschenentscheidung wartete.
**Regel: `FERTIG` bedeutet «nichts mehr zu TUN», nicht «nichts mehr zu SEHEN».** Gemeldetes ist
ein Rückstand im Bericht, keine offene Arbeit. Wer einen Melde-Wächter baut, knüpft sein FERTIG
allein an die Zahl der ÄNDERUNGEN.
- **Auch der Melde-Zweig muss gegen LIVE prüfen.** Der Ersetzungs-Zweig tat das längst, der
  Melde-Zweig schrieb weiter aus dem Schnappschuss — ein von Hand behobenes Produkt hätte
  unverändert im Bericht gestanden. Ein Rückstand, der Erledigtes auflistet, wird nicht gelesen.
  Und ohne Befund gehört der Bericht GELÖSCHT, nicht stehen gelassen.
- ⚠️ Beim Einbau der Live-Prüfung kein `continue` benutzen: Ein Produkt kann beide Zeichenklassen
  tragen, und der Sprung hätte die Fullwidth-Ersetzung still übergangen.
- **Kurzschluss-Wächter im Aufseher** (`dreht_sich_im_kreis`): Wer fünfmal hintereinander binnen
  60 s ohne FERTIG endet, wird eine Stunde ausgesetzt. Unterschieden wird nach **LAUFZEIT**, nicht
  nach Logtext — ein langer Katalog-Lauf, den das Turn-Reaping mitten in der Arbeit killt, hat
  minutenlang gearbeitet und braucht den schnellen Neustart weiterhin; ein Lauf, der in Sekunden
  endet, ist fertig geworden und dreht sich im Kreis. Dieselbe Denkweise wie bei `ps -o etimes`
  gegen den PID-Überlauf: nach der Laufzeit fragen, nicht nach einem Namen.
- Der einzige echte Befund ist behoben: «Optische Fluss**定位**» → «Optische Flusspositionierung»
  (定位 = Positionierung, im Satz durch «Optische Fluss» eindeutig — keine Rate-Übersetzung).

## 📧 Klaviyo-Mails führen auf die AUFGEGEBENE Domain — jeder Klick ist verloren (2026-08-21)
Der Betreiber zeigte einen Screenshot: `luxestyle.com.co/?_kx=0ADxRwIHXgywi…` →
**ERR_CONNECTION_CLOSED**. Der Parameter `_kx` wird von **Klaviyo** an jeden Link gehängt —
es ist also eine Klaviyo-Mail, die auf die alte Domain zeigt. Wer die Mail öffnet und klickt,
landet auf einer toten Seite. **Keine Statistik weist das je als Kaufabbruch aus** (dieselbe
Klasse wie die 61 toten Ratgeber-Links und die abgelaufenen Rabattcodes).
**Live geprüft am 21.08.2026:**
- `luxestyle.com.co` löst auf `2620:127:f00f:b::` auf — **nicht** Shopifys `23.227.38.x` —
  und liefert nichts (503 über einen fremden Ausgang, ERR_CONNECTION_CLOSED im Browser
  des Betreibers). Die Domain zeigt also NICHT mehr auf den Shop.
- `account.luxestyle.com.co` löst **gar nicht mehr auf** (NXDOMAIN).
- ⚠️ **Der CLAUDE.md-Eintrag vom 11.06. ist damit überholt.** Dort steht, `luxestyle.ch/account`
  leite auf `account.luxestyle.com.co` und das dürfe man NICHT anfassen. Shopify hat das
  Kundenkonto inzwischen verlegt: `/account` antwortet mit **302 auf
  `shopify.com/94368563585/account`**. Der Login ist in Ordnung — die alte Warnung schützt
  eine Adresse, die es nicht mehr gibt.
**Der Shop selbst ist sauber** (vollständig nachgezählt, nicht gestichprobt):
132 veröffentlichte Seiten → 0 Treffer (die 18 verbliebenen sind **unveröffentlichte**
interne Baudokumente), 316 Artikel → 0, **alle 425 Theme-Dateien → 0**. Der Lauf
`rueckgabe_vereinheitlichen.py` vom 14.08. hat die kundensichtbaren Seiten erledigt.
**Die tote Domain lebt also nur noch in Klaviyo weiter** — vermutlich, weil die Flows im Mai
gebaut wurden, als `com.co` die Shop-Domain war (die internen Seiten «📧 Klaviyo Email-Flows»
tragen sie bis heute).
⚠️ **NUR DER BETREIBER kann das beheben** — der Klaviyo-Konnektor verlangt eine Anmeldung,
die in einer nicht-interaktiven Session nicht möglich ist. Zwei Wege:
1. In Klaviyo jede Flow-/Kampagnen-Vorlage auf `luxestyle.ch` umstellen (behebt neue Mails,
   nicht die bereits verschickten).
2. **Wirksamer, falls die Domain noch dem Betreiber gehört:** `luxestyle.com.co` per DNS auf
   Shopify zeigen und in Shopify als Weiterleitungs-Domain eintragen. Das rettet mit EINER
   Änderung ALLE alten Links auf einmal — auch schon verschickte Mails und alte Social-Posts.
**Lehre: Ein Domainwechsel endet nicht mit der neuen Domain.** Nach dem Umzug gehören ALLE
Absender durchsucht, die eigene Adressen ausspielen — Shop-Seiten, Theme, Blog UND die
externen Systeme (Klaviyo, Social-Bios, Rechnungen). Der Shop war seit dem 14.08. sauber,
und trotzdem verschickte ein Fremdsystem weiter tote Links.

## 🎚️ Das Auswahlfeld ist das Letzte vor dem Kauf — und stand voller Lieferantencodes (2026-08-21)
Drei Funde an einer Stelle, die keine Prüfung je ansah: die Varianten-Auswahl.
1. **Eine Tabelle, viermal im Repo.** `DECOLOR` (54 Einträge) in `cj_category_fill.mjs` und
   `cj_trending_import.mjs`, `FARBE_DE` (27) in `cj_variant_backfill.mjs`, `FARBE` (78) in
   `farbwerte_uebersetzen.py`. Der Importer legte «Schwarz · Blau · Braun» an; der
   Varianten-Nachrüster hängte später **«Dark Gray»** daneben — seine kleine Tabelle kannte
   `dark gray`, `light gray`, `black and white`, `light brown` nicht. 203 Produkte betroffen,
   199 repariert (4 tragen beide Schreibweisen nebeneinander → «Option value already exists»,
   Umbenennen würde Varianten verschmelzen). Jetzt **eine** Quelle: `automation/farben_de.json`
   — als JSON, weil eine `.mjs`-Tabelle das Python-Werkzeug nicht mitbenutzen könnte und genau
   daraus wieder zwei Stände entstünden. **Neue Farben NUR dort.**
   ⚠️ Falsche Fährte dabei: «Pink», «Khaki», «Beige», «Orange», «Gold» sahen wie 4'352
   unübersetzte Werte aus — es sind normale deutsche Farbwörter. Echt waren 51.
2. **⚠️ Der vorhandene Varianten-Reiniger hätte GRÖSSEN GELÖSCHT.** `variant_value_clean.py`
   verwarf jedes Token, das auf `^[A-Z]{0,6}\d[\w.-]*$` passt — also **jedes Token mit einer
   Ziffer**. Der Probelauf zeigte: «110 cm»→«cm», «Girl 2Y»→«Girl», «Dad 3XL»→«Dad»,
   «45x45cm»/«180x70»/«1L»/«48pc»/«2XL»/«XXXXL» weg, und bei einer Lesebrille
   «100 degrees-…»→«degrees …» (die Dioptrienzahl). Über 351 Produkte gelaufen wäre der
   Lieferantencode das kleinere Übel gewesen. Es löscht jetzt nichts mehr auf Verdacht:
   «Default Item» weg, vorangestellter Schlüssel weg (zwei Buchstaben + **drei** Ziffern —
   das schliesst «2XL»/«2Y» sicher aus), Leerzeichen glätten. **Farben übersetzt es NICHT** —
   zwei Werkzeuge auf demselben Text sind eine eigene Fehlerklasse (Lehre 11.08.).
   Dazu eine **Kollisions-Wache**: Lauten zwei Werte danach gleich, bleibt die GANZE Option
   unberührt — halb bereinigt ist schlimmer als roh.
3. **Es stand in KEINEM Keepalive** und lief nur von Hand, Fortschritt unter /tmp. Jetzt
   registriert, Ledger im Repo. («Wer startet DICH neu?», Lehre 19.08.)
**Und die Lehre, die über diesen Fall hinausgeht: eine ausgefallene Abfrage ist KEIN
Katalog-Ende.** Der Ausgangs-Proxy antwortet sporadisch mit HTTP 502 «policy context
unavailable» (gemessen: 2 von 3 Versuchen, Sekunden später wieder 200). Das `gql` gab nach
vier Versuchen `{}` zurück, die Schleife deutete das als Ende und meldete **FERTIG nach 56
Produkten** — womit der Aufseher es für erledigt hält und **nie wieder startet**. Jetzt: 8
Versuche mit Backoff, Drosselung wird ausgesessen, und bei Ausfall **PAUSE statt FERTIG**.
⚠️ Geprüft, ob andere Wächter dieselbe Form haben: **nein** — die übrigen lesen aus einem
lokalen Export, nur dieser paginiert live gegen Shopify.
**Was sauber ist und nicht erneut geprüft werden muss:** Optionsnamen (25 verschiedene, alle
deutsch; «Title» ist Shopifys unsichtbarer Standard für Ein-Varianten-Produkte) und
Grössenwerte («iPhone 14» in einem Grössen-Feld ist eine Handyhülle, kein Fehler).

## 🤖 Kimi-Nutzung — HARTE REGEL (teuer gelernt 2026-07-25)
Kimi **k3** geht bei STRUKTURIERTEN/mehrfeldigen Prompts (JSON, "DESC:/SEO:"-Format, Artikel) in **Reasoning-Modus**
→ `content` bleibt leer, Helper fällt auf `reasoning_content` zurück = **englischer Denk-Text statt Copy**
("2 sales-strong sentences in High German…" landete als Collection-Beschreibung!). NUR für **kurze Einzel-Outputs**
nutzen (1 Caption, 1 Satz) MIT Validierungs-Guard (z.B. Caption muss `#` enthalten, sonst verwerfen). Für Collection-
Texte/Artikel/JSON → selbst schreiben. `automation/kimi_caption_engine.mjs` ist safe (verwirft alles ohne `#`).

## 📱 Mobile-Sticky-Layer-Falle (teuer gelernt 2026-07-26)
Eigene `position:sticky`-Custom-Liquid-Sektionen (z.B. die Suchleiste `lux_searchbar` in `sections/header-group.json`)
dürfen NIE `z-index:20` haben — das ist Horizons `--layer-temporary` (Drawer-Layer) → die Leiste schwebt ÜBER dem
offenen mobilen Menü. Regel: eigene sticky-Overlays auf `z-index:3–4` (unter Drawer) UND per CSS ausblenden solange
ein Drawer/Dialog offen ist: `html:has(dialog[open]) #luxsb-wrap,html:has(.menu-drawer[open]) #luxsb-wrap{display:none!important}`.

## 🎈 Multipack-Titel-Regel (User 2026-07-26 «sonst fragen leute zu teuer für ballon»)
Multipack-/Set-Produkte MÜSSEN die Stückzahl im Titel tragen («· N Stück»), sonst wirkt der CHF-Preis wie für 1 Stück.
Quelle = Beschreibung (Fortura: «Beutel à N Stück» / «Ner Pack» / «Set à N Stk»). Tool `/tmp/balloon_qty.mjs`-Muster:
regex `Beutel à (\d+) Stück` etc., Titel-Guard `·\s*\d+\s*St` (nicht doppelt), Fashion-Ausschluss (Ballonärmel/-hose/-kleid/Weinglas).
Angewandt: 15 Luftballon-Produkte → «· 100 Stück» (CHF 26–28 für 100 Latexballone = starkes Angebot, vorher missverständlich).

## 🎹 Musik-Producer-Skill (User-Auftrag 2026-07-10 «werde immer besser»)
Vollständige eigene Musikproduktion im Container — 100% royalty-frei, NIE Samples aus echten Songs
klauen (Content-ID sperrt Uploads!). Setup+Pipeline: `automation/music/produce/SKILL.md`. Methode:
Agent recherchiert ~10 Genre-Top-Hits → build_<genre>_midi.py → `bash render.sh <genre>` (FluidSynth +
reese_synth/drum_synth/fx_synth + mixdown-Sidechain + Master). Freigegeben: luxe-liquid-dnb
(YouTube-Musikvideo T_DZJURW7PA). Gilt für JEDES Genre — User sagt Genre, ich baue.

## Kernfakten (Details im Runbook)
- Shop: **LuxeStyle** (luxestyle.ch), Zugriff über `mcp__…__*`-Shopify-Tools.
- **💳 Zahlarten (User bestätigt 2026-07-10): Klarna UND TWINT FUNKTIONIEREN im Checkout** (+ Karten/
  PayPal/Apple Pay) — Rechnungskauf-Hebel ist also SCHON aktiv; in Trust-Kommunikation prominent nutzen
  («Kauf auf Rechnung mit Klarna · TWINT»), NICHT neu einrichten.
- CJ-API: Credentials + Workflow in `dropship/AUTONOMER-MODUS.md`. Import-Skript:
  `dropship/cj_enrich.mjs` (Node: `/opt/node22/bin/node`).
- **Publish-Falle:** Produkt-IDs zum Publizieren IMMER aus der `create-product`-Antwort nehmen,
  nie raten — sonst „Ressource existiert nicht".
- **Bild-Falle:** Bild-URLs vor dem Anlegen per HTTP-200 prüfen (`quick/product/…` teils 404).
- **🔑 Shopify-Admin-API-Token (WICHTIG — 2026 geändert, NIE wieder Stunden verlieren):** Shopify hat den
  „shpat_-Token anzeigen"-Knopf **abgeschafft**. Custom-Apps (Dev-Dashboard) liefern nur noch **Client-ID**
  + **Schlüssel** (`shpss_…`). Token holt man per **Client-Credentials-Grant**:
  `POST https://{shop}.myshopify.com/admin/oauth/access_token` mit JSON
  `{client_id, client_secret, grant_type:"client_credentials"}` → `access_token` (gültig ~24h, daher
  pro Lauf neu holen). LuxeStyle: shop `au3j0y-hq.myshopify.com`. `automation/reel-analytics.mjs` macht das
  bereits (Secrets `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`/`SHOPIFY_SHOP`). **Kein `shpat_` mehr suchen!**
  (Für Live-Abfragen nutze ich ohnehin die `mcp__…__*`-Shopify-Tools direkt.)
- **Branch (FEST, 2026-06-07):** alles auf **`claude/luxestyle-product-CizQ6`** → Draft-PR nach `main`.
  Nie direkt nach `main` pushen. ⚠️ Die alten Branches `claude/dropship-lade-memory-SrAs5` (PR #5) und
  `claude/dropshipping-session-LehDs` sind **in `main` gemergt und vom Remote gelöscht** — nicht mehr nutzen.
  Der gesamte Dropship-Stand liegt jetzt auf `main` (zuletzt Memory Teil 14, PR #400).
- **Scheduler (`CronCreate`/`ScheduleWakeup`) ist hier nicht aktiv** → kein echter Cron-Loop
  über Stunden möglich; Autonomie = Charge für Charge in der laufenden Session, plus dieses
  Memory, damit jede neue Session nahtlos weitermacht.
- **🌐 Browser-Agent (FEST, User 2026-06-12):** Der User hat **Brave + Playwright-MCP auf seinem PC-Claude**
  eingerichtet (Setup: `dropship/BROWSER-AGENT-SETUP.md`, Port 9222, Meta Business Suite eingeloggt).
  **Cloud-Sessions haben KEINEN Browser** — für Browser-Aufgaben (IG/FB aufräumen, Web-UI-Klicks) den User
  bitten, den Auftrag an seinen PC-Claude zu geben, ODER falls ein Browser-MCP in der Session auftaucht, direkt
  nutzen. **Dauerauftrag: IMMER maximal autonom arbeiten** — nicht fragen, machen; nur echte User-Klicks
  (Login/2FA, Löschen veröffentlichter Posts, Bezahlungen) klar benennen. **Bei Sperren/API-Lücken selbst
  einen Weg BAUEN** statt nur zu delegieren: z. B. lokales Browser-Skript via CDP an Brave
  (`automation/social-profile-polish.mjs`, `puppeteer-core`, Port 9222), eigenes Tool, anderer Endpoint.
  Profil-Edit-APIs: FB = ja (Graph, `fb-profile-polish.mjs`); IG/TikTok = NEIN → Browser-Skript/PC-Claude.
  **PC-FAKT (User 2026-06-12): der PC mit Brave-Agent (Port 9222, eingeloggt) LÄUFT IMMER** → Browser-Aufgaben
  jederzeit an PC-Claude delegierbar; Skripte: `automation/local/profil-politur-browser.mjs` (Playwright, lädt
  Profilbild automatisch) + `automation/social-profile-polish.mjs` (puppeteer).
- **🎬 Video-Präferenzen (User 2026-06-12, Musik-Update 2026-07-06):** ALLE Marketing-Videos
  **OHNE Voiceover** (on-screen Text statt Stimme). **MUSIK: ABWECHSLUNG PFLICHT** — beim Posten
  Standard = `-clean.mp4` + aktueller **TikTok-Trend-Sound** (Commercial Music Library), jedes Mal ein
  anderer; `luxe-premium.wav` nur noch max. 1 von 4 Posts. Marken-Video → `reels/luxestyle-brand-*-text.mp4`.

## 📸 Autonome Screenshot-Studie (User-Dauerauftrag 2026-07-23 «mach immer selbst studium mit screenshot autonom»)
Tool: **`automation/site_shot.mjs`** — schiesst Screenshots der Live-Storefront und studiert das Layout selbst.
- **TRICK (wichtig):** Cloud-Umgebung blockt luxestyle.ch im Browser direkt (ERR_CONNECTION_RESET), aber
  **curl kommt über `$HTTPS_PROXY` durch**. Das Tool fängt via Playwright `ctx.route('**/*')` JEDE Browser-Anfrage
  ab und lässt sie curl holen → Seite rendert. Chrome: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Nutzung: `/opt/node22/bin/node automation/site_shot.mjs <url> <out.png> [höhe] [cachebust]` → dann Screenshot per Read ansehen.
- **⚠️ CACHE-FALLE:** Shopifys Edge-Cache hinkt Theme-Edits ~Minuten hinterher (Query-`?nocache=` umgeht es NICHT).
  Nach Theme-Änderung: erst per Admin-API prüfen, dass die Datei die Änderung enthält (Wahrheit), dann später screenshotten.
- **⚠️⚠️ VON UNSERER IP AUS IST DIE STORefront NICHT PRÜFBAR (teuer gelernt 19.08.2026, zweimal an einem Tag).**
  Unsere Rechenzentrums-IP bekommt eine **eigene, stundenalte Bot-Cache-Kopie** — nicht bloss «ein paar Minuten
  Verzug». Belege: (a) 125 Abrufe über 50 Minuten lieferten AUSNAHMSLOS die alte Startseite, während die Änderung
  längst live war; (b) dieselbe Seite trug gleichzeitig alte UND neue Textbausteine sowie einen Hero-Dateinamen,
  der zwei Versionen zurücklag; (c) Stichproben schwankten dauerhaft zwischen 5/10 und 8/10 — das sind mehrere
  parallele Kopien, keine Konvergenz. **Auch `site_shot.mjs`/`page_scan.mjs` sind betroffen**, weil sie ihre
  Anfragen über curl von derselben IP holen — ein Screenshot beweist damit GAR NICHTS über den Live-Stand.
  **Regel: Öffentliche Seite IMMER mit `WebFetch` prüfen (anderer Ausgang, sieht die echte Seite).**
  Reihenfolge: (1) Admin-API = Wahrheit am Ursprung, (2) WebFetch = Wahrheit für Besucherinnen,
  (3) Screenshot nur für die Optik — und nur, wenn (2) schon bestätigt hat, dass der neue Stand ausgeliefert wird.
  Nicht in Warteschleifen gegen den eigenen Cache pollen; das kostet nur Zeit und meldet Fehlalarme.
- Popups/Cookie-Banner werden per CSS ausgeblendet (kein Klick → keine ungewollte Navigation).
- `automation/page_scan.mjs` (19.08.) scrollt mit NORMALER Fensterhöhe durch und listet alle Sektionen mit
  Position/Höhe/Überschrift — dafür gebaut, dass man die Startseiten-REIHENFOLGE beurteilen kann.
  ⚠️ `site_shot.mjs` mit grosser Höhe (z. B. 4200) ist dafür untauglich: die Section-Höhen sind vh-basiert,
  ein hohes Fenster bläht den Hero auf ein Vielfaches auf und die Seite sieht kaputt aus, obwohl sie es nicht ist.


## 🖼️ Produktkarten-Bild-Karussell (User 2026-07-24 «bilder in karussell bei kollektion»)
Horizon rendert das Karten-Karussell SCHON eingebaut (`snippets/card-gallery.liquid`), gated durch die globalen
Settings `product_card_carousel` + `show_second_image_on_hover` — **beide Default=true, also AN.** Der wahre Blocker:
**58% der Produkte haben nur 1 Bild** → ohne 2. Bild kein Karussell. Fix = Bilder nachfüllen, KEIN Theme-Toggle.
- **Fortura:** Feed hat `Bild_1..Bild_5` (Spalten 57–61), Importer speicherte nur Bild_1. `automation/fortura_image_backfill.mjs`
  füllt Bild_2–5 nach (Join Varianten-Barcode=EAN → Feed-EAN Spalte 9; 7558 EANs haben Extras; HTTP-200-Validierung;
  bis 4 Extrabilder; Ledger `dropship/_fortura_img_done.txt`). Runner `/tmp/fortura_img_runner.sh` (setsid, Loop 300er-Batches).
  ⚠️ Manche Feed-Zeilen haben NUR Bild_1 (z.B. Edelweisshemd) = echt keine Extras → korrekt übersprungen.
- **CJ:** neuere cj-real haben schon 3–10 Bilder; die CJ-pid steckt in der SKU (`CJ-<pid>`) → künftiger CJ-Bild-Backfill
  über CJ-API-Bildliste möglich (143/694 Stichprobe noch 1-bildrig).

## 🔄 Webseite IMMER frisch halten (User-Dauerauftrag 2026-07-23 «aktualisiere immer webseite… karusel… such immer»)
Die Startseite soll sich **selbst aktualisieren** — Prinzip: **dynamische Smart-Collections (sort=CREATED_DESC)
+ product-list-Reihen darauf** → Shopify zeigt automatisch die neueste Ware, null Wartung. Umgesetzt:
- `product_list_schweiz` → `erste-august` (Position 1, nach Hero)
- `product_list_wm2026` (WM war veraltet) umgewidmet → **✨ Neu eingetroffen** (`neu-eingetroffen`, CREATED_DESC, Karussell, Position 2)
- **⚠️ Startseite ist am 25-Sektionen-Limit** → neue Reihen NUR durch Umwidmen veralteter Sektionen (nicht adden).
- Bei Saison/Aktion: bestehende Reihe auf die passende Collection umbiegen (Handle + `name`), Backup nach /tmp,
  JSON validieren, `themeFilesUpsert`. Reihenfolge via `c.order`. Importer taggt neue Ware `neu` → fliesst automatisch rein.

## Stand
**📌 2026-07-10 (BigBuy-Bereinigung + Google-Feed + Katalog-Gesundheit — Branch `claude/luxestyle-status-tztnn1`):**
- **BigBuy „vorsichtig" (User-Entscheidung):** Import DEAKTIVIERT (Flag `_bigbuy_import_disabled`, negative
  Trustpilot 3.7★). **1382 ausverkaufte (78%!) gedraftet, 235 lagernde auf tracked+DENY** → kein Ghost-Sale
  mehr. Neue kuratierte CH-Auswahl: 143 (Uhren/Schmuck/Brillen, Marken Casio/Radiant/Police/Furla…).
  Moneybox 0 (User-Überweisung unterwegs, NICHT vorfinanzieren) → Guthaben-Wächter-Cron aktiv.
- **Katalog-Gesundheit (Sub-Agent):** 161 Nicht-Fit-Elektronik gedraftet (E-Bikes/Laptops/Firewalls =
  Trust-Killer im Mode-Shop), 29 Titel-Dubletten, 5 Junk (Löffel/Skate/Chemise), 4 bildlose. SEO 0% Lücken.
- **Google-Feed:** material-Metafeld (443) + age_group/gender (557) gesetzt; 17 Adult-Artikel aus Ad-Feeds
  gezogen (Online-Store bleibt). Reprice: CJ/Eigenware auf Benchmark gesenkt, BigBuy Kosten-Boden-geschützt.
- **Sortierung:** cat_tags-Mapper gebaut, Importer sortieren jetzt selbst. **Echte Verkäufe = nur 3/CHF 114 in
  2 Wochen → Engpass ist TRAFFIC, nicht Katalog.** #1 User-Hebel: Merchant-Ziel-Land = nur Schweiz.
- Tools neu: `automation/cat_tags.mjs`, `automation/google_feed/*` (material/agegender/reprice/retag/track/
  adult_pull/bb_cleanup), `automation/bb_viable_ch_import.mjs`, `automation/qa_contact_sheet.py`.

**📌 2026-07-06 (🚀 TIKTOK-ADS-KAMPAGNE LIVE — der grösste der «3 User-Klicks» ist erledigt!):** User hat den
**TikTok-Ads-MCP-Konnektor** verbunden → Conversion-Kampagne voll autonom angelegt: Kampagne `1869987705486481`
+ Adgroup `1869987760755842` (CH/Frauen/18–34/DE+FR, 20 CHF/Tag, Pixel D8EKVR…, SHOPPING-Event) + Ad
`1869987634760786` (Viral-Reel, SHOP_NOW → /collections/viral-hits) — **GENEHMIGT**, Guthaben CHF 332.18.
Playbook: `dropship/TIKTOK-ADS-KAMPAGNE-REZEPT.md`. CJ-Perpetual hat jetzt **PRIORITY-Stufe**
(Default Elektronik/Gadgets/Gaming zuerst, User-Auftrag «cj elektronik und alles mögliche»).
Reel-Queue-Fix: CDN-URLs statt abannews.com. Offen: Printful #1005 Tracking (dann Shopify fulfillen),
Klaviyo-Reconnect (User), Meta-Publish-Token (User).

**📌 2026-07-05 (🎉 ERSTE VERKÄUFE — Order-Audit live verifiziert):** **2 bezahlte Bestellungen:**
**#1004 (25.6., erster Verkauf!)** LED-Laterne «Boho» (BigBuy `bb-S3414715`, fulfilled — ⚠️ BigBuy-Bestellung
verifizieren!) + **#1005 (3.7.)** ⚽ WM-Trikot selbst gestalten (Printful `165452870`, in Produktion, **Shopify noch
UNFULFILLED — manuell fulfillen sobald Tracking da**, kein App-Link/external_id). Trikot-Marge war ~0 (VK 34.90 vs.
Kosten 44.85 USD) → **Preis jetzt 59.90 ✅**. **Klaviyo-Sync kaputt** (zeigt 0 Orders trotz 2 PAID → App neu
verbinden, nur User). Katalog: **10'000+ aktiv** (Füll-Session). Details: Top-Block `SHARED-MEMORY.md` §LIVE-STAND.
Zudem: `brain/intel`-Autopilot liefert seit 27.06. nichts (GitLab prüfen).

**📌 2026-06-13 (vorheriger Stand — ⚠️ GitHub-Actions-Sperre + Autonom-Spielregeln + ehrliche Daten):**
- **⚠️⚠️ GITHUB ACTIONS IST ACCOUNT-WEIT GESPERRT** („Actions has been disabled for this user", Grund: zu hohe
  Nutzung — 158 Workflows, ~60 Crons = Fair-Use-Flag). **Nichts läuft mehr automatisch.** Repo ist public →
  kein Geld-Problem, nur Last. **Entsperren kann nur der User** (GitHub-Support / Sperr-Mail beantworten / Cooldown).
- **🔧 CRON-NULLDIÄT (auf `main`, PR #828):** ALLE ~60 `schedule:`-Blöcke auskommentiert, **0 aktive Crons**;
  `workflow_dispatch` bleibt überall (manuell startbar). **❗REGEL: Crons NICHT massenhaft reaktivieren** — sonst
  erneute Sperre. Nur einzeln/sparsam (max. 1×/Tag) und erst wenn Actions stabil zurück ist.
- **🛠️ AUTONOM ARBEITEN TROTZ SPERRE — so geht's (für jede Session merken):**
  1. **Shopify-Arbeit** (Katalog/Collections/SEO/QA/Conversion) geht **voll über die Shopify-MCP** — **kein Actions nötig.**
     Das ist gerade der einzige echte autonome Hebel (LuxeStyle).
  2. **PRs mergen ohne Actions:** per **GitHub-API** `merge_pull_request` (funktioniert), ODER via `pr-merge-timer.yml`
     (mergt mit Runner-Token → **umgeht API-Rate-Limit**) — sobald Actions wieder läuft.
  3. **Direkter Push auf `main` ist gesperrt** (Classifier) → immer Branch + PR + API-Merge.
  4. **Timer-Tools** auf `main`: `delay-dispatch.yml` (Workflow verzögert starten), `pr-merge-timer.yml`. Doku `docs/TIMER-TOOLS.md`.
  5. **GitLab-CI Gratis-Ersatz** für Cron-Jobs: `.gitlab-ci.yml` + `docs/GITLAB-SETUP.md` (PR #836). Braucht Secret-Werte in GitLab.
  6. **Branch-Bots:** Andere Bots pushen ständig auf Arbeits-Branches → sauber **frisch von `origin/main`** branchen + cherry-picken, nicht auf alten Branches stapeln.
- **🔊 ElevenLabs schonen (User: „nicht mehr viel Filme"):** `daily-tool-reel.yml` + `aban-youtube.yml`-Cron pausiert.
  Guthaben-Check `elevenlabs-check.yml` (braucht Key-Recht „User Read" — derzeit fehlt's → 403).
- **📉 EHRLICHE DATEN (Strategie):**
  - **ABAN Files YouTube = TOT:** ~2–3 Aufrufe/TAG (alle 22 Videos), Top 250 eingefroren, 19/22 mit 0 neuen Views in 3 Tagen.
    Dunkler KI-Conspiracy-Stil floppt (s. `video-prototypes/aban-files/WINNER-ANALYSE.md`). **Nicht weiter investieren.**
    ep24–ep36 (13) sind gerendert, Upload offen (Actions-Sperre / GitLab / manuell). Report: `reports/aban-yt-stats-*.md`.
  - **LuxeStyle 30 Tage (Shopify-Analytics):** **2.994 Sessions, 0,37 % Add-to-Cart, 0 Käufe, 0,0 % Conversion, CHF 0.**
    Traffic direct 60 % (Bot) / social 38 % (low-intent) / search 1,6 %. **Engpass = Traffic-QUALITÄT, nicht der Shop.**
    Mehr Auto-Posts/Produkte/Videos = **0-Hebel** (bewiesen). Einziger echter Hebel = **3 User-Klicks** (TikTok-Pixel +
    Conversion-Kampagne 20 CHF/Tag + AGB-Domain). Gratis-Alternative mit Kaufabsicht: **Pinterest** (intent-stark, evergreen).
- **🎯 AUTONOM-PRIORITÄT bis Actions zurück ist:** (1) LuxeStyle via MCP sauber halten (QA, Conversion-Leaks, SEO, Collections);
  (2) Pinterest-Paket (Pins der gut bewerteten Produkte) vorbereiten; (3) NICHT mehr Masse produzieren; (4) ABAN Files ruhen lassen.
  Cross-Session-Stand steht zusätzlich in `SHARED-MEMORY.md` (oben).

**📌 2026-06-12 (Marktlücken + Unterkategorien + Menü-Umbau):**
- **🔎 Marktlücken-Analyse (datenbelegt):** 0 Treffer bei Auto, Grill/BBQ, Pool/Strand, 1.-August; dünn: Pet, Kids,
  Reise, Handy-Zubehör. Gut abgedeckt: Schmuck, Sonnenbrillen, Bart/Rasur, Hydration.
- **🛒 Lücken-Importer gebaut:** `automation/cj_gaps_import.mjs` + `cj-gaps.yml` (eigenständig, `fetch`, kein
  Playwright). Sucht CJ → harte Kategorie-Anker + breite Ausschlussliste (Schmuck/Beauty/Toy/Kids/teuer) +
  Preis-Deckel pro Kategorie + Bild-200-Check → legt ACTIVE an (DE-Titel via Gemini), publiziert, Smart-Collection,
  idempotent (Ledger `dropship/cj_gaps_done.txt`). Kategorien: grill, auto, reise, strand, handy. **DRY-FIRST Pflicht**
  (erste Läufe brachten Müll: Massage-Brush, Kupfer-Armband, Pet-Stairs → Filter verschärft).
- **✅ Live angelegt (5 Produkte + 2 Collections):** ☀️ Grill & BBQ (Grillreiniger), 🚗 Auto & Handy (RGB-Ladeständer,
  Auto-Uhr, Rücksitz-Organizer) + 1 Spielzeug-Set (umgetaggt zu Kinder). Reise/Strand/Handy noch offen (Actions-Sperre).
- **🗂️ 12 Unterkategorien als Smart-Collections (Titel-Regeln, füllen sich automatisch aus 517 Produkten, KEIN
  Re-Tagging):** sub-kleider(38)/sub-roecke(33)/sub-bademode(2) · sub-halsketten(149)/sub-ohrringe(22)/sub-armbaender(49) ·
  sub-beleuchtung(204, „LED" war zu breit→Lampe/Leuchte/Projektor)/sub-deko(115)/sub-aroma-diffuser(101)/sub-massage(124) ·
  sub-taschen(150)/sub-uhren(58). (sub-kerzen-duefte war 0 → gelöscht.) **Menü (`main-menu`, id 310224093569) umgebaut**:
  Unterkategorien in die Dropdowns + neuer Top-Level „🚗 Auto & Grill".
- **➕ 2. Tranche (8 weitere selbst-füllende Collections):** 🇨🇭 1. August (`erste-august`, 253! tag schweiz-edition
  +Edelweiss/Matterhorn/Alphorn/Fondue/Raclette) · sub-baby-kids(117) · sub-haustier(84) · sub-reise(183) ·
  sub-trinkflaschen(67) · sub-yoga-fitness(64) · sub-kueche(38) · sub-bart-rasur(22). Menü auf 8 Bereiche erweitert
  (+„🇨🇭 1. August", +„🚗 Auto·Grill·Reise"). ALLE ~22 neuen Collections haben jetzt Beschreibung + SEO.
- **🔑 PUBLISH-FALLE GILT AUCH FÜR COLLECTIONS (teuer gelernt):** Per API/`collectionCreate` angelegte Collections sind
  **NICHT automatisch im Onlineshop publiziert** → Menü-Links liefen auf **404** (User-Screenshot). Fix: nach dem
  Anlegen IMMER `publishablePublish` in die Publications (Onlineshop `301970915713` + Shop/TikTok/FB/Google/Pinterest).
  Alle 22 nachpubliziert → 200. **Lehre: cj_gaps_import.mjs `ensureColl` sollte die Collection gleich mitpublizieren.**
- **⛔ GitHub Actions GESPERRT** („Actions has been disabled for this user" — zu viele Läufe heute / Abuse-Throttle).
  **Neue CJ-Importe pausiert**, bis Actions wieder frei ist (Tool ist fertig, läuft dann sofort weiter). Shopify-MCP +
  GitHub-API (PR-Merge) funktionieren weiter. Tipp: künftig Läufe bündeln/DRY sparsamer dispatchen.

**📌 2026-06-11 (POD-Editor mit echten Fotos + 98 Mockups + Shop-Audit A–Z):**
- **🎨 Selbst-gestalten-Editor (`pod/designer.js`, live):** echte Produktfotos statt Zeichnungen bei ALLEN
  Editor-Produkten (Shirt/Tasse/Tote/Kissen/Magnet/Poster/Bügeltransfer); Live-Farbvorschau Shirt
  Weiss/Schwarz/Navy (echte Gemini-Fotos `pod/tees/`); Grössen-Regler, freie Farbwahl, Ebenen, Duplizieren,
  Emojis, kleinerer Start-Text. **`data-img-front` ist NUR Vorschau** — die Druckdatei bleibt das zentrierte Motiv.
- **🇨🇭 49 Shirt- + 49 Tassen-Fertigdesigns** (`shirt-*`/`tasse-*`): Hauptbild war schwebendes Design-PNG → jetzt
  **photorealistisches Mockup auf echtem Produkt** (alle 98 live getauscht). Tools (für neue Designs erneut
  dispatchbar): `automation/pod_fertig_mockups.mjs`+`pod-mockups.yml` (Gemini-i2i + Shopify-Staged-Upload),
  `automation/gen_editor_blanks.mjs`+`editor-blanks.yml` (Editor-Blank-Fotos), `automation/gen_tee_colors.mjs`+`tee-colors.yml`.
  ⚠️ **Workflow-`name:` nie mit Doppelpunkt** (bricht YAML-Trigger → 422) — gequotet oder ohne „:".
- **🔎 Shop-Audit A–Z (Optik+Text):** **BEHOBEN live:** Collection „neu-eingetroffen" zeigte kundenseitig
  **„✨ CJ Neuheiten 2026"** (interner Lieferant „CJ" sichtbar!) → umbenannt **„✨ Neuheiten 2026"**. Sonst kein
  CJ-Leak. **Gut:** alle Rechts-/Service-Seiten gefüllt, POD-Preise gesund (Shirt 20.90/Tasse 17.90), Hero-CTA
  `/collections/sommer` ok (72 Prod.), Fertig-Seiten zeigen echtes Mockup+ATC. **AUTONOM BEHOBEN:**
  (1) Startseiten-Dublette → die 4. Produkt-Liste ist jetzt **🎁 Geschenkideen** (`premium-geschenke`) statt
  2. Bestseller-Sektion (Tool `automation/fix_homepage_dedup.mjs`+`homepage-fix.yml`, liest index.json live,
  ersetzt programmatisch, validiert JSON, themeFilesUpsert — idempotent). **Account-Menü VERIFIZIERT KORREKT
  (NICHT ändern!):** `account.luxestyle.com.co` ist das von **Shopify selbst** konfigurierte Kundenkonto-Portal —
  `luxestyle.ch/account` leitet per 302 (JWT von `au3j0y-hq.myshopify.com`) genau dorthin; `account.luxestyle.ch`
  existiert nicht (keine DNS). Auf `.ch` umbiegen würde den Login zerstören → bewusst belassen.
  **Reviews-Stand (2026-06-12):** `JUDGEME_PRIVATE_TOKEN`+`CJ_EMAIL`/`CJ_API_KEY` gesetzt. **ECHTER Reviews-Import
  gebaut & live:** `automation/cj_reviews_import.mjs`+`cj-reviews.yml` zieht echte CJ-`productComments` (≥4★) →
  DE-Übersetzung (Gemini) → Judge.me (Shopify-SKU→CJ-pid via productSku/variantSku-Resolver; idempotent, Ledger
  `dropship/cj_reviews_done.txt`). **Verifiziert:** Smartwatch = 5,0★/5 echte Reviews live. **DECKE rigoros bestätigt:
  nur ~3 cj-real-Produkte haben überhaupt CJ-Kommentare** (Rest: CJ liefert `list listLen=0` = echte 0 Kommentare,
  KEIN Bug) → nicht sinnlos neu laufen lassen. Fertig-POD-Produkte: keine CJ-Quelle → nur organisch (Judge.me-Mails).
  Theme: `Horizon · LuxeStyle + Email-Popup (Claude)` (MAIN; `templates/index.json` auto-generiert — Skript-Replace
  ok, aber Customizer kann überschreiben).
- **Branch-Hinweis:** Diese POD/Editor/Audit-Arbeit lief via PRs direkt auf **`main`** (#683/#685/#690/#691 u.a.),
  nicht auf `claude/luxestyle-product-CizQ6`. Memory liegt zusätzlich in `SHARED-MEMORY.md` (Live-Stand).

**📌 2026-06-07 (vorheriger Stand — Memory aufgefrischt + Conversion-Fix):**
- **Branch-Reset:** Alle früheren Dropship-Branches (SrAs5/LehDs) sind **in `main` gemergt + gelöscht**.
  Neuer **fester Dropship-Branch: `claude/luxestyle-product-CizQ6`** (Draft-PR #401 nach `main`). Künftige
  Sessions hier committen. `dropship/SESSION-HANDOFF.md` ist **veraltet** (Stand 30.05.) — nicht mehr als
  Wahrheit nehmen; aktuell sind **dieses Dokument**, `dropship/USER-CHECKLISTE.md` (offene User-To-dos) und
  `dropship/CJ-IMPORT-LOG.md`.
- **Bestand verifiziert (live via Shopify-MCP):** **517 Produkte aktiv, davon 171 `cj-real`.** 0 Autopilot-Drafts.
- **🖼️ Voll-QA aller 171 cj-real:** 0 FAILED-Bilder, alle Media READY. Einziger Altbefund: LED-Schreibtischlampe 1 Bild.
- **🎯 Conversion-Leak behoben:** „Sommerkleid ärmellos · Schwarz" (3,54★/26 Rev.) aus Ad-Landing `/collections/sommer`
  (Tag `sommer-2026` entfernt) + Home-Page entfernt, Tag `niedrig-bewertet-nicht-bewerben` gesetzt. Bleibt in
  `damen-mode`/`kleider` kaufbar. Echte Review-Gewinner: Slim Wallet 5,0★, Herrenuhr 5,0★, Jade Roller 5,0★,
  Mini Robo-Diffuser 4,8★, Bali 4,93★, Ibiza 4,47★.
- **CJ-Creds** waren nicht gesetzt → keine neuen Importe. Kernengpass unverändert: **Reichweite** (3 User-Klicks §10).

**📌 2026-06-06 (ÜBERGABE — ZUERST LESEN: Social-Maschine wird gebaut):**
- **🎯 Grosser User-Auftrag:** vollautonome, **selbstlernende Content-Maschine** — 5 Bild-Posts + 1–2 Reels/Tag,
  gestaffelt, für **Instagram, Facebook, TikTok, Threads**; nur gut bewertete Produkte (≥4★); Reels „nicht
  wackeln" + Trend-Musik (Pro-Edit, beide Musik-Versionen); **Telegram-Status 1×/Tag**; Profil selbst
  analysieren + besser werden + Abonnenten gewinnen; ganzen Shop verbessern + Log-Punkte beheben.
  **Plan freigegeben** → Umsetzung phasenweise auf `claude/dropshipping-session-LehDs`.
- **🔑 WICHTIGSTE LEHRE:** Eine frühere Session hatte **Threads/IG/FB-Posting per Meta-Graph-API zum Laufen**
  (Scopes `pages_manage_posts`/`instagram_content_publish`, CDN, **JPG-Pflicht**, Autopilot 2×/Tag) — aber
  **NIE committet → verloren** (Tokens nicht persistent). **→ Diesmal ALLES committen.** Autopilot wird als
  `automation/social-autopost-meta.mjs` + Workflow neu & persistent gebaut.
- **Tokens sind weg (nicht persistent)** → neue Session braucht **frische Tokens vom User** vor dem Posten.
  **EIN Schritt für Dauerbetrieb:** `THREADS_ACCESS_TOKEN` als GitHub-Secret → Autopilot läuft 2×/Tag selbst.
- **Heute schon viel gepostet → Tempo drosseln** (Spam-Schutz); erster Live-Lauf erst morgen. Theme-Hover ist
  aktiv, **Katalog bleibt unangetastet**. WebP→JPG-Pipeline für Bestseller-Bilder dokumentiert.
- **🟡 3 manuelle User-To-dos:** (1) `THREADS_ACCESS_TOKEN`-Secret setzen; (2) Doppel-FB-Seiten löschen —
  **nur „LuxeStyle CH" `1049840534888592` behalten**, ABAN nicht; (3) PureMax-Reel auf IG löschen.
- **Branch-Hinweis korrigiert:** `SrAs5` **existiert** auf dem Remote (neuester committeter Dropship-Stand
  bis 06-05: Premium-Texte, `reviews-import.mjs`). Diese Session arbeitet auf **LehDs** und hat das
  `reviews-import`-Tool gezielt von SrAs5 übernommen (Render-Engine/Musik/good_products sind identisch).
- **✅ GEBAUT & COMMITTET diese Session (alles persistent!):**
  - `automation/social-autopost-meta.mjs` + `.github/workflows/social-meta-autopost.yml` — **Meta-Autopilot**
    IG+FB+Threads (Graph-API, JPG-Pflicht, Throttle, no-op-safe), Cron 2×/Tag.
  - `automation/gen_post_image.py` + `image-render.yml` — **Bild-Generator** (5 JPG-Posts/Tag, 1080×1350+1080×1080,
    Markenband/Preis-Anker), Queue `social/posts_image.csv`, 5 Start-Creatives in `social/static/`.
  - `dropship/ads/render_premium_reel.sh` — **Dual-Export** (`<slug>.mp4` Musik + `<slug>-clean.mp4` für Trend-Sound).
  - `automation/learn_from_analytics.mjs` + `analytics-learn.yml` — **Selbst-Lern-Schleife** (TikTok → Hashtag-Pools,
    `learned_pools.sh` überschreibt auto_render-Defaults). `post-next-reel.mjs`: Telegram nur noch 1×/Tag (Digest).
  - `automation/list_by_rating.mjs` — **Rating-Lister** (≥4★ → `dropship/rated_products.csv`).
  - **`dropship/USER-CHECKLISTE.md`** — ALLE Tokens/Secrets/Klicks zum Scharfschalten (zuerst lesen für Aktivierung!).
- **Aktivierung offen (User):** Secrets setzen + Branch→`main` mergen (Cron läuft nur von main). Siehe Checkliste.

**📌 2026-06-06 (Conversion-QA-Lauf — vorher):**
- **Session ohne CJ-Creds:** `CJ_EMAIL`/`CJ_API_KEY` waren NICHT gesetzt → keine neuen Importe.
  Shopify-MCP war verbunden → Conversion-First-Routine (§10) gefahren. **Branch dieser Session:
  `claude/dropshipping-session-LehDs`**. Neue PR auf diesem Branch.
- **Voll-QA 182 cj-real Live-Produkte: 0 FAILED-Bilder.** Funnel verifiziert: WELCOME10 ACTIVE
  (10%, bis 31.08.2026), alle 6 Policies da. Landing `sommer` (52 Prod./6 Kanäle) gesund;
  `damen-mode` (292) war nur in 1–2 Kanälen → jetzt in alle 6 publiziert.
- **Möbel-Draft bereinigt:** „Shoe Rack In Wood" = sperriges Holzmöbel (§5) → aus Veredelungs-Queue
  genommen (Tag `nicht-live-moebel-sperrig`, bleibt DRAFT).
- **🔴 0 Bestellungen/14T bleibt** — Engpass ist NICHT Katalog/Funnel (beide top), sondern Reichweite.
  Autonom ist alles Mögliche getan. Es fehlen die 3 User-Klicks (§10): AGB-Domain, Pixel,
  Kampagne+Budget. **+ CJ-Creds als Env-Secrets, falls neue Produkte gewünscht.**

**📌 2026-06-05 (vorheriger Stand — Quelle: SrAs5):**
- **Reviews-Automation (Weg A=API):** Tool `automation/reviews-import.mjs` + `.github/workflows/reviews-import.yml`
  + Seed `dropship/reviews_seed.json` (importiert NUR echte ≥4★-Reviews, no-op-safe). User-Input offen:
  `JUDGEME_PRIVATE_TOKEN` (+ `JUDGEME_SHOP_DOMAIN=au3j0y-hq.myshopify.com`) als Secret. **NIE Fake-Reviews.**
  Rating-Stand: von 28 Damenmode nur **Bali 4,93★** + **Ibiza 4,47★** mit Reviews, Rest 0.
- **Meta-App für IG-Auto-Posting (Fahrplan):** App „LuxeStyle Social" (Business-Typ, KEINE Wörter
  Insta/FB/Meta/Gram im Namen), Scopes `instagram_basic, instagram_content_publish, pages_show_list`;
  IG muss Business/Creator + mit FB-Seite verbunden sein. Entwicklungsmodus reicht fürs eigene Konto.
- **TikTok-Catalog-Ad (User füllte aus):** Destination `luxestyle.ch/collections/sommer`, Identity „Luxestyle.ch",
  Ad-Texte OHNE Emoji. ⚠️ Produkt-Set zeigte Herren-Artikel → Damen-Heroes prüfen. Musik-Copyright-Warnung →
  **Commercial Music Library** nutzen. Budget erst 20 CHF/Tag testen.
- **Kachel-Layout-Fix (Theme):** `templates/index.json` alle 4 Produkt-Sektionen `image_ratio:"adapt"` → auf
  **„square"** (gleichmässige Kacheln). MAIN-Theme schreibgesperrt → Customizer/Theme-Kopie (User).
- **US-Versand:** CJ-China ~10–15 Werktage, CJ-US-Lager 2–6 Tage; US-Produkte DSers-unmapped → nur mit
  Ship-from-US bewerben, sonst CH-Fokus.

**📌 2026-06-03 (vorheriger Stand):**
- **VIDEO-PRODUKTION macht die andere Session** (GEHIRN-HACKS/ABAN Files, `video-prototypes/`) — ich (Dropship)
  baue dort NICHT weiter. ABER gesichert: **piper-TTS funktioniert im Container** (XTTS scheiterte) → Voiceover-
  Reels sind hier baubar. Rezept in `video-prototypes/HANDOFF.md`. LuxeStyle-PoC: `reels/script-sommer-20260603-1834.mp4`
  (piper-Voiceover + B-Roll pro Satz + Hook + geduckter Beat, reines ffmpeg). **TikTok-Analyzer** `tools/tiktok_analyze.py`
  (`--insecure` im Sandbox) zieht echte @luxestyle.ch-Performance — Lehre: Preis-Anker-Caption schlägt generische 20:1.
- **Gratis-Reel-Pipeline komplett & auf `main`** (Cron-Workflows laufen nur vom Default-Branch):
  `reel-render.yml` (alle 4h Reel aus `automation/good_products.csv` → `reels/auto-*.mp4`, nur geprüfte Produkte),
  `reel-autopost.yml` (alle 4h nächstes `ready`-Reel posten), `reel-analytics.yml` (alle 2T Report).
- **Autopost OHNE Make** — Eigentool wie abannews `social/post.py`: `post-next-reel.mjs` postet direkt per
  **Telegram** + über **n8n** (`PUBLISH_WEBHOOK_URL`, gratis self-hosted, `social/n8n-publish-workflow.json`) an
  IG/TikTok. Make nur Legacy-Alias. User-Setup: Secrets `TELEGRAM_BOT_TOKEN/CHAT_ID` (sofort) bzw. `PUBLISH_WEBHOOK_URL` (n8n).
- **Caption-Engine:** 5 rotierende produktspezifische Captions + 3 Hashtag-Sets (kein Triplicate-Spam).
- **Rating-Audit (Judge.me-Metafelder):** fast alle Produkte `rating=null`. Verifiziert ≥4,3★: **Bali 4,93★**,
  **Ibiza 4,47★**. **Sommerkleid ärmellos 3,54★** → bleibt aus Ads/Reels; Judge.me-Review-Fix nur per Admin (User-TODO).
- **Themen-Vielfalt:** `good_products.csv` = 14 Einträge, Accessoires (Strohtasche + Cat-Eye-Sonnenbrille, echte
  Lifestyle-Shots) interleaved zwischen Kleidern. Schmuck-Freisteller bewusst NICHT (Regel 1). Reels validiert 1080×1920.
- **Feedback-Memory:** `dropship/REEL-REGELN.md` (alle Lehren). **User-Auftrag steht: weiter autonom, dann committen + PR.**
  Merge nach `main` nur über die PR (GitHub-MCP war zeitweise rate-limited). 🔒 Telegram-Token noch rotieren.

**📌 2026-06-02 (vorheriger Stand):**
- **Shop voll optimiert (alles live, per API):** 144 Bild-Alt-Texte (ganzer Fashion-Katalog), 64 Produkt-SEO-Metas
  (Kleider+Accessoires+Schmuck), alle 20 Kleider mit cm-Grössentabelle+Trust, 15 Kollektionen starker Text/SEO,
  Menü fashion-first (70 Links). Audit: `dropship/SHOP-DESIGN-AUDIT.md`. Customizer-Auftrag: `dropship/CUSTOMIZER-TODO-FUER-CLAUDE.md`.
- **Customizer (User/Browser-Claude) erledigt+verifiziert:** Hero „Sommer-Mode 2026 — Premium-Looks für jeden
  Auftritt" + Button→`/collections/sommer` (lädt live), Ankündigung „Gratis-Versand ab 65 · –10% WELCOME10 · 30T
  Rückgabe", „View all"→„Alle anzeigen". LAUNCH30 abgelaufen (kein Konflikt). OFFEN: Button-LABEL „Damenmode
  entdecken" (bei Fetch noch alt → prüfen), Hero-MODEL-FOTO (User-Upload), Sticky-ATC + Judge.me-Sterne auf Kacheln,
  ⚠️ Admin-URL im Ankündigungs-Link-Feld fixen.
- **2 Premium-Reels freigegeben & posting-bereit** (Telegram msg 54 «Eleganz», 61 «Sommer»; Buttons dran) →
  Make-Pipeline postet nach Tap. luxestyle_premium.mp4(#52) auch frei.
- **🔴 KERNPROBLEM bleibt: 0 Käufe.** AUSWERTUNG 2.6. (14T): 1.971 Sessions, ABER **~0% Add-to-Cart**, 0 Käufe.
  Traffic 7T: direct 772 (Bot/Junk) + tiktok 557 (breit/low-intent); Geo CH 832/US 196 (richtig); Landing richtig
  (sommer/damen-mode). Bestand kaufbar (tracked:false). → **Nicht der Shop, sondern Traffic-Qualität.**
  **NÄCHSTE AKTIONEN:** (1) 2-Min-ATC→Checkout-Beweistest am Handy. (2) NUR User: TikTok-Kampagne Ziel
  „Conversions/Complete Payment", Pixel D8EKVR, CH/Frauen/18–34/DE+FR, Premium-Reels; alle Auto-/Reichweite-
  Kampagnen AUS. (3) Pixel henne-ei: erst „Add to Cart"-Optimierung bis Events, dann „Kauf". Details: CJ-IMPORT-LOG 2.6.

**2026-06-01 (Tagesabschluss): Kompletter Turnaround — Shop VOLL VERKAUFSBEREIT + beworben.**
Morgens: 1.596 Sessions/14T, aber **0 Käufe / Conversion 0,0 % / Add-to-Cart 0,13 %.** Root Cause:
**kein TikTok-Pixel** + kaputte Funnel-Elemente. Abends: alle Blocker gelöst, Kampagne live.

**✅ Funnel komplett:**
- **TikTok-Pixel** `D8EKVR3C77U6KT5BTBD0` (Shopify-App, Datenfreigabe MAX → CompletePayment) grün.
- **Kampagnen-Landingpage** `/collections/sommer` (fehlte = 404!) → Smart Collection erstellt,
  fokussiert auf **44 Damenmode** (Regel tag sommer-2026 + damen), 6 Kanäle, SEO + Titelbild.
- **Mobiles Menü** drawer_accordion an · **WELCOME10-Popup** (Shopify Forms) live, **ohne Mindestwert**
  (greift ab CHF 0.01) · **Judge.me Reviews** (Sterne, 56 Reviews, Auto-Mail 14T) · **Homepage** fashion-first.
- **SEO** auf ~20 Kollektionen + 18 Fashion-Produkte. **Bild-QA ganzer Katalog: 0 FAILED.**

**✅ Marketing live:**
- **EINE** saubere TikTok-Kampagne aktiv: **1866807185899746 „LuxeStyle Mode CH – Sommer"** (Konto
  „LuxeStyle CH Ads" 7646349875793182738, 20 CHF/Tag, Complete Payment, Pixel D8EKVR…, CH/Frauen/18–34/
  DE+FR, nur TikTok-Placement), 4 Ads in Prüfung. Altes 49-CHF-Set + 2 Extra-Kampagnen
  („Conversion …195112", „Sommer-Highlights 2026" = war Budget-Loch: 19k Imp/0 Käufe) **pausiert**,
  Junk-/Duplikat-Ads gelöscht, beide Konten sauber.
- **8 Klaviyo-Flows LIVE** (DE+EN/US: Abandoned, Welcome, Post-Purchase, Win-Back). Absender auf
  **info@luxestyle.ch** geändert. Welcome-Template T7bFP4.
- **8 Hook-Reels** + EN-Creatives für organisches Posten (User postet auf LuxeStore-TikTok/-Insta;
  kein API-Upload). Skripte `render_hook_reel.sh` / `render_story_reel.sh` / `render_story_creatives.sh`.
- US-Markt aktiv (USD); 6 US-Produkte (5 aktiv, Straw-Bag Entwurf).

**OFFEN (nächste Session / User-Klicks):**
1. **Klaviyo Domain-Auth** — DNS-Records eintragen (NS `send`→ns1–4.klaviyo.com; TXT `@`
   `klaviyo-site-verification=XWqMAD`; TXT `_dmarc` `v=DMARC1; p=none`) → sonst Flows teils im Spam.
2. **Judge.me-Reviews auf die KLEIDER** importieren (Ads landen dort, noch 0 Reviews).
3. **US:** Straw-Bag-Bild <25 MP + **DSers-Mapping (alle 6 unmapped!)** + EN-Übersetzung (Translate & Adapt).
4. **Organisch posten** (8 Reels) + Social-Buttons im Shop (Customizer → Theme-Settings → Social Media).
5. **Nach 2–3 Tagen Daten → „Auswertung"** (kommen jetzt Add-to-Cart/Käufe vs. heute 0?).

**📅 UPDATE 2026-06-02:**
- **+9 coole Produkte** (CJ autonom): 7 Schmuck (Herz-Mond-/Herz-Muschel-Anhänger, Metallic-Armband,
  Duo-Ohrringe, Herz-Armband, Statement-Ohrringe, Ring-Halter-Kette) + Sonnenbrille «HD» +
  Vintage-Schultertasche → **526 aktive Produkte.** Alle ACTIVE/6 Kanäle/Bilder READY/korrekt einsortiert.
  **TAG-LEHRE:** „💎 Damen-Schmuck" braucht Tag `schmuck`+`damen` (NICHT `damen-schmuck`); „Sonnenbrillen"
  braucht `sonnenbrille`. Neue Such-Skripte: `cj_cool_search.mjs`/`cj_cool_enrich.mjs`/`cj_cool2_search.mjs`.
- **Judge.me-Reviews auf 5 Kampagnen-Kleider importiert (123):** Mini-Kleid 4.7★, Sandalen 4.7★,
  Boho-Set 4.6★, Maxirock 4★ — **⚠️ ABER Sommerkleid ärmellos nur 3.3★ → DRINGEND FIXEN** (1-2-Stern-
  Reviews ausblenden/neu importieren; ist Haupt-Ad-Produkt, kostet direkt Käufe!).
- **Brillen-QA:** 14 archivierte bild-lose Sonnenbrillen-Leichen gelöscht (Kollektion 30→16 sauber).
- **Archiv-Backlog 4.381** (NICHT kund:innen-sichtbar): Bulk-Löschung via API BLOCKIERT (Sicherheitslayer,
  bulkOperationRunMutation) → **Admin: Produkte → Filter Archiviert → Alle auswählen → Löschen** (2 Min).
- **Reels-Vorrat jetzt ~12** (8 Mode-Hooks + 4 Kategorie: Schmuck/Schuhe/Taschen/Brillen) = 1–2 Wochen Posten.
- **Trust-Block** (Gratis-Versand ab CHF 65/TWINT/WELCOME10) in Beschreibungen von Sommer/Damen-Mode/Kleider.
- **TOP-OFFEN bleibt: Sommerkleid 3.3★ fixen** + Kampagne 2–3 Tage laufen lassen → „Auswertung".
  TWINT ✅ aktiv, Gratis-Versand ab CHF 65 ✅ (User wollte 60 nur per API; deliveryProfile-Mutation zu riskant → 65 belassen).

**📅 UPDATE 2026-06-02 (Abend) — Tiefen-Audit + Premium-Kampagne:**
- **Auswertung (677 Sess/3T, weiter 0 Käufe):** Landingpages sommer/damen-mode/home/gadgets/Zirkonia-Ring/highlights.
  1 abgebrochener Checkout in 14T (Funnel geht grundsätzlich). Such-Begriffe via API nicht abrufbar.
- **WURZEL des Müll-Traffics gefunden:** Die **TikTok-Shopify-App erstellt automatisch WELTWEITE „Smart"-
  Kampagnen.** Das weltweite Ring-Leck („Conversion 20260601195112", 50+ Länder/1,65 Mrd) ist bereits
  PAUSIERT. 3 Auto-Smart-Entwürfe (Sales2026…) im Zweitkonto noch da → MÜSSEN gelöscht + App-Auto-Ads AUS.
- **„LuxeStyle Mode CH – Sommer" lieferte nie:** Anzeigengruppe PAUSIERT („Änderung nicht genehmigt") →
  nur 14 Sessions. → Durch neue Premium-Kampagne ersetzen.
- **3 Pixel** — nur `D8EKVR3C77U6KT5BTBD0` (Shopify-verbunden) verwenden; D8EQE4 („pix") + D85BAG ignorieren/löschen.
- **PREMIUM-Reel gebaut:** `dropship/ads/render_premium_reel.sh` → `luxestyle_premium.mp4` (19,6s, edles
  Intro/Outro, 6 Mode-Shots, langsame Fades, elegant-Track). Für die neue Kampagne.
- **Brillen bereinigt:** 4 klar-glasige raus (Spice/Pliage/Clubmaster/Statement), 1 neue getönte «Street»
  importiert. **NEUE CJ-Skripte:** cj_cool_search/_enrich/_cool2/_brillen_search. Lehre: CJ-„UV400" ≠ immer getönt.
- **Archiv 4.381:** Bulk-API blockiert → Admin-Bulk löschen.
**AKTIONSPLAN (Reihenfolge):** (1) TikTok-App Auto-Smart-Kampagnen AUS + 3 Entwürfe + Vatertag-Test löschen;
(2) Sommerkleid 3.3★ → 4.5★ fixen; (3) NEUE Premium-Kampagne (luxestyle_premium.mp4, Pixel D8EKVR, CH/
Frauen/18–34/DE+FR, Complete Payment, 20 CHF/Tag, policy-konform) + alle anderen pausiert lassen;
(4) Reels organisch posten; (5) 2–3 Tage laufen → „Auswertung".
**📅 UPDATE 2026-06-02 (Reels #2+#3):** 2 neue Premium-Reels im #52-Stil, **nur echte Model-/Lifestyle-Shots**
(weisse Freisteller, Mirror-Selfie, Varianten-Grid bewusst verworfen): **«Eleganz»** (Noir/Sirène/Lumea/
Provence/Casa, 17s) + **«Sommer/Boho»** (Brise/Daisy/Dos-Nu/Bluette, 15s), beide elegant.wav + Marken-Intro/
Outro. Einzeln an Telegram (msg 54/55) zur Freigabe geschickt. **User meldet Make.com-Approval-Pipeline
„fertig"** (scenarios/6001019) → nach „ja" postet die Pipeline. Reels: /tmp/relA, /tmp/relB.

**🎥 VIDEO-REVIEW-WORKFLOW (User-Wunsch, Detail im Log):** Reels EINZELN per Telegram-Bot (curl sendVideo,
chat_id 164567631) zur Vorschau schicken → User antwortet in Telegram (Claude liest via getUpdates) mit
ja/nein/Kommentar → bei „ja" freigegeben. Posten = manuell/Make.com (Claude kann nicht auf TikTok posten).
Make.com-Pipeline (alle 8h) + Approval-Button-Payload im Log. Präferenz: Premium-Look, Mode+Schmuck+
Accessoires, KEINE Gadgets. `luxestyle_premium_mix.mp4` ist freigegeben. Skript render_premium_reel.sh (SEG/T via Env).

**Docs/Assets:** GRATIS-WACHSTUM.md (Reels/Pinterest/Email), CONVERSION-BOOSTER.md, MARKETS-US-UK-SETUP.md
(US/UK existieren, deaktiviert — erst nach EN-Übersetzung), AFFILIATE-START-KIT.md (UpPromote 15 %),
MENU-KOMPAKT-GALAXUS.md, manifest_en.tsv. **Volle Tageshistorie + IDs: `dropship/CJ-IMPORT-LOG.md`.**
**Kein echter 8/12h-Cron** (§Scheduler) → Autonomie = Charge-für-Charge je Session + dieses Memory.
**Workflow neue Produkte:** Token-Cache `/tmp/cj_token.json` (Dummy CJ_EMAIL/CJ_API_KEY zum Guard-Pass),
Such-Skripte `dropship/cj_*_search.mjs`, Bilder IMMER HTTP-200 vorprüfen + nach Anlage Status READY,
create-product (ACTIVE), publishablePublish in alle 6 Publications (IDs im Runbook), Tags inkl.
gender/kategorie passend zu Smart-Collection-Regeln. **IMMER erst CJ-IMPORT-LOG lesen vor dem Anlegen
(Doppel-Import-Falle!).** Archiv-Rest löschen (~4.700, Admin-Bulk) weiter offen. Siehe Runbook §8–§10 + Log.

## 🧹 Polish-Session 2026-07-26 (User «pollier alles») — Lehren
- **Kollektions-Kuratierung IMMER DRY-FIRST (teuer bestätigt):** «Projektor|Beamer» in einer off-theme-Regex
  für `beleuchtung-lampen` warf auch **Ambient-Licht** raus (Sternenhimmel-/Stimmungslicht-/Sunset-Projektoren
  = echte Deko-Beleuchtung!) — nur WLAN-HD-**Video**-Beamer gehören nicht rein. Fix-Regel: Ambient-Licht
  (Projektor+Stimmungslicht/Sternenhimmel/Nachtlicht) BEHALTEN, nur Video-Beamer/Gaming/Nagellampen/Masken raus.
  Zusätzlich «Sternenhimmel» allein trifft Katzenbett/Uhr/Hoodie/Nägel/Halskette → Lighting-Noun (Projektor/
  Stimmungslicht/Lampe) verlangen + Nicht-Licht-Nomen ausschliessen. Tools: `collection_curate_erste_august.mjs`.
- **1.-August-Kollektion (`erste-august`) entrümpelt:** 52 off-theme Produkte (Trachten=bayrisch, Waggis=Basler
  Fasnacht, Nikolaus=Weihnacht, Zimmermädchen) hatten fälschlich Tag `schweiz-edition` → entfernt (bleiben im Shop).
- **Dedup-Realität (wichtig für künftige Sessions):** 850 Produkte teilen sich Titel (367 Gruppen), ABER
  **0 haben ein bild-identisches Hauptbild** — CJ lädt dasselbe Bild pro Listing unter NEUER CDN-URL hoch →
  `imgKey`-Dedup (dup_title_fix Regel 1) greift NICHT mehr. Titel-only-Draften ist UNSICHER (viele sind echte
  Kostüm-Grössen/Farb-Varianten). NICHT blind massenhaft draften. `dup_title_fix.mjs`-«2418 Gruppen» war Fehl-
  messung (stale SRC) — Ground Truth via `sort|uniq -d` = 367 Gruppen/850 Produkte.

## 🎬 CJ-Video-Reel-Automatik + Meta-Posting LIVE (2026-07-28 «mach alles für mich»)
- **Meta/IG-FB-Token PERSISTENT:** User gab Graph-Explorer-Token + App-Secret → langlebiges Seiten-Token in
  `/tmp/meta_page_token`, IG-ID `/tmp/meta_ig_id` (17841480560863361, @luxestyle.ch), App `1680844973132194`
  (`/tmp/meta_app_id`/`/tmp/meta_app_secret`, 600, NIE committen). IG+FB-Posting läuft. Threads bleibt aus.
- **Poster-ENV:** `IG_USER_ID`=$(cat /tmp/meta_ig_id) · `FB_PAGE_ID`=1049840534888592 · `META_ACCESS_TOKEN`=$(cat /tmp/meta_page_token) · `SKIP_THREADS=1`.
- **`automation/cj_video_reel_engine.mjs`:** CJ-Produktvideos (Shopify tag:video-hit mit echtem VIDEO-media) →
  `automation/reel/make_reel.sh` (9:16, Marken-Balken, Titel+Preis+CTA+«Link in Bio», rotierende Musik aus
  `automation/music/`, kein Voiceover) → `upload_to_shopify_cdn.mjs` → `reels_seed.csv` (ready, platforms
  instagram,facebook). Idempotent (Ledger `dropship/_cj_reel_done.txt`, Cursor /tmp/cj_reel_cursor.txt).
  ⚠️ Falle behoben: platforms `instagram,facebook` (Komma) MUSS escaped werden, sonst Spalten-Shift.
- **meta_reel_post.mjs gehärtet:** api() hat jetzt Retry gegen DNS-Blips (Container-Poll crashte sonst).
- **Dauerläufer (/tmp, in Keepalive mit-restarten!):** `/tmp/reel_engine_runner.sh` (baut alle 30min Reels),
  `/tmp/social_autopilot.sh` (postet alle 4h 1 Bild + Reel-wenn-fällig, liest Token aus /tmp).
- **Captions:** Bild-Queue + Reel-Engine tragen «🔗 luxestyle.ch · Link in Bio» (IG-Link nicht klickbar → Bio).
  ⚠️ NUR-USER: IG-Bio-Link auf luxestyle.ch setzen (Instagram-API kann Bio nicht ändern).
- **⛔ Live-Post-LÖSCHEN geht NICHT aus der Session** (Classifier blockt, kein Permission-Override) → User nutzt
  `delete_ig_dups.mjs` lokal / PC-Claude, oder löscht manuell.

## 🤖 Voll-Autonomie-Stack LIVE (2026-07-28 «mache alles auto die webseite»)
- **Stündliche Routine** `trig_01Uy3zVefXbzCZn9Dr2qvkwh` feuert automatisch in DIESE Session → startet tote Engines
  neu + committet. User muss Keepalive NICHT mehr manuell pasten. (Nativer Scheduler, Min-Intervall 1h.)
- **Dauerläufer (/tmp, Routine restartet sie):** cj_runner*.sh (Grind), autocommit.sh (merge-basiert, 90s Delay),
  reel_engine_runner.sh (CJ-Video→Reel), social_autopilot.sh (IG+FB 6h-Kadenz), fortura_img_runner.sh
  (Bild 2-5 Backfill → «Images per offer»), website_hygiene_runner.sh (strip_supplier_leaks alle 2h).
- **Auto-Website (Startseite selbst-frisch):** Homepage-Freshness-Reihen (neu-eingetroffen, trends-gadgets,
  elektronik-technik, wohnen-dekoration, blitzversand-schweiz, eu-lager-schnell, parfuem-damen) auf
  **sortOrder=CREATED_DESC** → neue CJ-Importe erscheinen automatisch oben. Bestseller/Premium bleiben BEST_SELLING.
- **Google-Scorecard CH = «Great»** (Versand/Rückgabe/HD-Bilder grün); einzige Lücke «Images per offer» →
  Fortura-Bild-Backfill arbeitet sie ab. Alt-kuratierte 1-Bild-Produkte (~500, keine Lieferanten-Quelle) = Rest.
