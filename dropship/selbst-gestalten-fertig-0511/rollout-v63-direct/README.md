# Direkter v6.3.1-Rollout ohne MAIN-Theme-Write

Der Helfer ersetzt ausschliesslich den vorhandenen Editor-Baustein in den Produktbeschreibungen. 16 ACTIVE-Printful-Produkte erhalten den v6.3-Editor: neun mit belegter proportionaler Produktvorschau und sieben mit exakter Druckflächen-/Druckdateiansicht. Dad-Cap 206, Magnet 656 und der extern erfüllte Bügeltransfer erhalten stattdessen einen sichtbaren Sperrbaustein; ihr normaler Produktformular-, Ajax-Klick- und Dynamic-Checkout-Weg wird im Browser gesperrt. Produktstatus, Preis, Varianten, Themes und Printful werden nicht geändert.

Die drei Sperren sind bewusst eine Produktseiten-Sperre. Eine direkt konstruierte Anfrage an Shopifys öffentliche Cart-API kann eine Beschreibung nicht serverseitig verhindern. Darum gehören vor dem Full-Lauf echte Browserproben für «In den Warenkorb» und «Jetzt kaufen» auf allen drei Seiten zum Pflicht-Gate. Ein serverseitiges Gate würde eine gesonderte Theme-/App-/Produktverfügbarkeitsänderung brauchen und ist nicht Teil dieses engen Rollouts.

Editor, Karten und Vorschauen werden aus `rollout-v63/allowlist.json` und den lokalen Dateien unter `pod/v6/` deterministisch gebunden. Der Lauf akzeptiert nur die fest codierten 16 Editorprodukte, die exakt belegten neun Vorschau-IDs und die drei Sperrprodukte. Jede Asset-URL trägt einen SHA-Parameter; der Editor trägt zusätzlich ein SRI-Attribut. `_headers` gibt `/pod/v6/*` mit CORS und `Cross-Origin-Resource-Policy: cross-origin` frei. Stabile Karten/Vorschauen werden einen Tag mit Revalidation gecacht; die Editorversionen `6.3.0` und `6.3.1` haben getrennte unveränderliche Dateipfade. Bestehende Produktseiten behalten funktionierende `6.3.0`-Bytes, bis Plan, Canary und Full-Apply ihren Script-Tag kontrolliert auf `6.3.1` umstellen.

## Schutzregeln

- fester Shop `au3j0y-hq.myshopify.com`, Primärdomain `luxestyle.ch` und Währung `CHF`; die Sollidentität ist nicht per Environment überschreibbar;
- vor jedem Write: ACTIVE, ID/Handle, vollständiger Variantensatz, Storefront HTTP 200 und Canonical mit Cache-Buster;
- vor dem ersten Write: SHA-256, Content-Type, CORS/CORP und abgestufte Cache-Regeln aller bereits produktiv ausgelieferten Assets;
- `data-karte-pflicht=1`: eine fehlende oder kaputte Karte fällt nicht auf v5 zurück;
- SRI bindet das geladene Editor-JavaScript an den geprüften SHA-256;
- der 6.3.1-Plan akzeptiert nur exakt einen vorhandenen v6-Marker und darf bei den 16 Editorprodukten ausschliesslich Dateiname, URL-Version und SRI ändern; die drei Sperrprodukte müssen bytegleich bleiben;
- Plan, Release, Vorher-/Nachher-HTML und ihre Hashes werden vor dem Write gespeichert und zurückgelesen;
- unmittelbar vor jedem Update werden Produkt- und Beschreibungsscope nochmals frisch geprüft;
- Mutation ohne Retry, sofortige bytegenaue Rücklesung und fortlaufendes Ledger; eine unklare Antwort wird nicht wiederholt;
- Rollback akzeptiert nur das unveränderte Artefakt eines Apply-Laufs und schreibt nur bei exakt passendem Vorher-/Nachher-Hash;
- Canary ist immer die Keramik-Tasse `gid://shopify/Product/15422823465345`; Full umfasst 16 Editor- plus drei Sperrbeschreibungen.

`origin/main` versteht die v6-Eigenschaften `Druckdatei (<Platzierung>)` und `_pod_karte`, prüft sie gegen Printful und legt zuerst einen idempotenten Entwurf an. Dieser Rollout startet keinen Printful-Sync und erzeugt keine Bestellung.

## Sicherer Actions-Pfad

Der manuelle Workflow `.github/workflows/pod-v63-description-rollout.yml` läuft nur auf dem Default-Branch, checkt exakt den beim Dispatch aufgezeichneten `${{ github.sha }}` aus, akzeptiert ausschliesslich die Auswahlfelder `plan|apply|rollback` und `canary|full`, verwendet die vorhandenen Secrets `SHOPIFY_CLIENT_ID` und `SHOPIFY_CLIENT_SECRET` und lädt Plan, Sicherungen sowie Ledger als 30-Tage-Artefakt hoch. Er enthält keine freie Befehlseingabe.

Reihenfolge nach Merge und bestätigtem Cloudflare-Deploy:

1. `operation=plan`, `scope=canary`, Bestätigung leer. Der Plan prüft trotzdem alle 19 Produkte und alle Produktionsassets.
2. Planartefakt prüfen.
3. `operation=apply`, `scope=canary`, Bestätigung `V63_CANARY_TASSE`.
4. Tassen-Canary auf Desktop und Mobile prüfen: Bildqualität, Proportionen, Variantenwechsel, Pflichtkarte, Druckdatei, Warenkorbseigenschaften und normaler Checkout-Abbruch bei ungültiger Gestaltung.
5. Die drei Sperrseiten separat auf Standard-Warenkorb, Ajax-Warenkorb und Dynamic Checkout prüfen.
6. Erst danach `operation=apply`, `scope=full`, Bestätigung `V63_FULL_19_SAFE`.

Rollback lädt das Artefakt des ursprünglichen Apply-Laufs über dessen numerische Run-ID:

- Canary: `operation=rollback`, `scope=canary`, Bestätigung `V63_ROLLBACK_TASSE`;
- Full oder abgebrochener Full-Lauf: `operation=rollback`, `scope=full`, Bestätigung `V63_ROLLBACK_19_SAFE`.

Bei einem abgebrochenen Apply enthält das fortlaufende Ledger nur bereits berührte oder unklare Produkte. Der Rollback betrachtet nur diese IDs: ein bestätigter Nachher-Hash wird zurückgeschrieben, ein bereits vorhandener Vorher-Hash übersprungen, bei einem fremden Hash bleibt dieses Produkt unangetastet (die übrigen werden trotzdem zurückgestellt, der Lauf endet mit Exit 1; Einzelheiten im Abschnitt «Rollback im Einzelnen» unten).

Lokale Befehle sind nur für Entwicklung und brauchen dieselben exakten Bestätigungen sowie legitime Shopify-Credentials:

```sh
MODE=plan SCOPE=canary OUT_DIR=/tmp/lspod-v63-plan node direct_rollout.mjs
MODE=apply LIVE=1 SCOPE=canary ACK=V63_CANARY_TASSE OUT_DIR=/tmp/lspod-v63-canary node direct_rollout.mjs
MODE=apply LIVE=1 SCOPE=full ACK=V63_FULL_19_SAFE OUT_DIR=/tmp/lspod-v63-full node direct_rollout.mjs
MODE=rollback LIVE=1 SCOPE=canary ACK=V63_ROLLBACK_TASSE ROLLBACK_PLAN=/tmp/lspod-v63-canary OUT_DIR=/tmp/lspod-v63-rollback node direct_rollout.mjs
```

Jeder `OUT_DIR` muss neu sein. Ein vorhandener Plan oder ein vorhandenes Ledger stoppt den Lauf, damit kein unklarer Write blind wiederholt und keine Sicherung überschrieben wird.

## Editor 6.4.0 («Auf dem Produkt bearbeiten»: Bearbeiten | Druckversion | Vorschau)

Stand 09.11.2026. Werkzeug gebaut und getestet, **nichts ausgeführt** (weder Plan noch Apply). Der Besitzer will den Editor «nach Prüfung auf die Produktseiten»; dieser Abschnitt ist der Weg dorthin (Befund und Messungen: `dropship/CODEX-ROLLOUT-V64-0911.md`). Der 6.3.1-Pfad oben bleibt nutzbar (Workflow `pod-v63-description-rollout.yml`, ohne `EDITOR_VERSION`). **6.3.1-Vollausrollung und 6.4.0 schliessen sich nach dem ersten 6.4.0-Canary aus**: der 6.3.1-Pfad kennt als Vorgänger nur 6.3.0 und würde einen 6.4.0-Block als «Ausgangslage unzulässig» abweisen. Empfehlung: 6.4.0 direkt von 6.3.0 aus, 6.3.1 nicht mehr voll ausrollen.

### Neue Teile

| Datei | Zweck |
|---|---|
| `editor-release.json` | `{schema, version, file, url, sha256, bytes, vorgaenger:[6.3.0, 6.3.1]}`. **Wird mit `editor_release_bauen.mjs` aus den echten Dateien erzeugt, nie von Hand.** |
| `editor_release_bauen.mjs` | erzeugt die JSON (`node editor_release_bauen.mjs`) oder prüft sie (`--pruefen`, Exit 1 bei Abweichung). |
| `direct_rollout.mjs` | `EDITOR_VERSION=6.4.0` schaltet den neuen Pfad (Ziel aus `editor-release.json`, drei feste Scopes, V64-Bestätigungen). Ohne die Variable läuft alles wie bisher (6.3.1). |
| `direct_rollout_lib.mjs` | `rolloutKonfig` (Eingaben, Bestätigungen, Canary-Tabelle), `auswahlPlanen`, `canaryLedgerPruefen`, gelockerter `editorReleasePlanen`, `editorReleaseFormPruefen`. |
| `fixtures/live-editor-bloecke-0811.json` | die Editor-Blöcke der 16 Live-Beschreibungen (Stand 08.11., 6.3.0) plus der 6.3.1-Block der Tasse; nur Blöcke, keine Kundentexte. |
| `../../../.github/workflows/pod-v64-description-rollout.yml` | manueller Workflow, fest `EDITOR_VERSION=6.4.0`. |
| `direct_rollout_attrappe.mjs` | Offline-Attrappe für Shopify-Admin, Storefront und die Assets unter abannews.com (ersetzt `fetch` vollständig; Zustand in einer JSON-Datei; Fehlerschalter für Ablehnung, Netzfehler, Abbruch nach dem Write, ENTWURF, fremde Änderung u. a.). Ausgangszustand aus `fixtures/` plus erfundenem Vor-/Nachtext. |
| `direct_rollout_attrappe_test.mjs` | gut 100 Prüfungen in rund 30 Szenarien (A Apply und Schutzregeln, B Rollback, C alter 6.3.1-Pfad): der Pfad, der Beschreibungen wirklich schreibt und zurückstellt (Plan, Apply je Stufe, Rollback, Hash-Schutz, Ledger- und `OUT_DIR`-Sperre, Live-Gates für Ziel und Rückweg-Dateien, Rücklesen, kein Wiederholen, alter 6.3.1-Pfad). Läuft in 7 Sekunden, ohne Netz, wird von `direct_rollout_test.mjs` als Kindprozess gestartet (und damit im CI-Job `selbst-gestalten`). `ROLLOUT_SKRIPT=<Pfad>` prüft eine andere Runner-Kopie. |
| `direct_rollout_mutationsprobe.mjs` | Mutationsprobe für Planer, Eingaben, Bauskript, Runner (Schreib- und Rollback-Pfad), Workflow, `_headers` und `editor-release.json`. |

`editor-release.json` ist **vorläufig** mit dem Dateistand von `lspod-designer-v6-6.4.0.js` vom 09.11. erzeugt. Erst nach dem Einfrieren der Datei neu erzeugen (`node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/editor_release_bauen.mjs`) und mit der Datei committen. Wird die Editor-Datei danach noch geändert, schlägt der Test «editor-release.json stimmt mit den echten Dateien überein» fehl, und `direct_rollout.mjs` bricht **vor jedem Netzzugriff** ab (Token, Shop und Assets werden nicht berührt).

### Bestätigungen und Scopes (fest einprogrammiert, keine freie Eingabe)

| Operation | Scope | Produkt | Bestätigung |
|---|---|---|---|
| plan | `canary-tasse`, `canary-jutebeutel`, `full` | alle 19 werden immer geprüft | leer |
| apply | `canary-tasse` | Keramik-Tasse `gid://shopify/Product/15422823465345` | `V64_CANARY_TASSE` |
| apply | `canary-jutebeutel` | Bio-Jutebeutel `gid://shopify/Product/15422819991937` | `V64_CANARY_JUTEBEUTEL` |
| apply | `full` | die 16 Editorprodukte (die 3 Sperren nur prüfen) | `V64_FULL_16_EDITOR` |
| rollback | `canary-tasse` | wie Apply | `V64_ROLLBACK_TASSE` |
| rollback | `canary-jutebeutel` | wie Apply | `V64_ROLLBACK_JUTEBEUTEL` |
| rollback | `full` | die im Full-Lauf berührten Produkte | `V64_ROLLBACK_16_EDITOR` |

Die vier `V63_…`-Zeichenketten bestätigen **keinen** 6.4.0-Schreiblauf, und `V64_…` bestätigt keinen 6.3.1-Lauf (getestet als Kreuzprodukt). Bei `full` prüft der Lauf die drei Sperrprodukte **vor** dem ersten Schreiben (sie werden nie geschrieben, nur gegen den Plan geprüft): eine zwischenzeitlich veränderte Sperre stoppt, bevor ein Editorprodukt geändert wurde.

### Ablauf (Reihenfolge nicht verhandelbar)

**Vorbedingungen**
1. 6.4.0 eingefroren (Editor-, Vorschau-, Review-Gate-Tests und Mutationsprobe grün), danach `editor-release.json` neu erzeugen. Ab dem ersten Verweis einer Beschreibung darf die Datei **nie mehr geändert werden** (SRI blockiert den Editor bei jedem anderen Hash, `data-karte-pflicht=1` hat keinen v5-Rückfall). Ein Fehler heisst 6.4.1 mit eigenem Pfad.
2. Datei und `editor-release.json` auf `main`, Cloudflare-Pages-Deploy (`cf-deploy-mainsite.yml`) abgewartet. `_headers` braucht keine Änderung: `/pod/v6/lspod-designer-v6-*.js` trifft den Namen 6.4.0.
3. Dieses Werkzeug (Workflow, Test) auf `main`. Der Workflow läuft nur auf dem Default-Branch und checkt `github.sha` aus.

**Schritte**
1. **Plan** (`operation=plan`, `scope=canary-tasse`, Bestätigung leer). Der Plan prüft alle 19 Produkte, die Live-Bytes von 6.4.0 **und der Rückweg-Dateien 6.3.0/6.3.1** (SHA, Content-Type, CORS/CORP, Cache-Regel).
2. **Artefakt `pod-v64-rollout-<Run-ID>` lesen.** Soll: alle 16 Editorprodukte `geaendert=true` (15 × 6.3.0 → 6.4.0, Tasse 6.3.1 → 6.4.0; bei den zwei T-Shirts ändern sich zusätzlich Karten-/Vorschau-`?v=` und `card=`), die drei Sperren `geaendert=false`, 0 Fehler. Weicht die Zahl ab, ist der Zustand im Shop anders als erwartet: nicht anwenden.
3. **Stufe A: Apply `canary-tasse`** (`V64_CANARY_TASSE`). Run-ID und Artefakt dieses Laufs notieren (Rollback-Quelle). Danach **Browser-Gates** (unten) auf der Tasse. Sie prüft die gemeinsamen Teile (Tabs, Fehlerkorrekturen, Kaufweg, Review-Tor, Mobil), **nicht** die neue Foto-Ansicht (die Tasse hat keine; sie bleibt auf der Druckflächen-Bühne).
4. Fällt ein Gate: sofort **Rollback** `canary-tasse` mit der Run-ID aus Schritt 3 (Tasse zurück auf 6.3.1).
5. **Stufe B: neuer Plan** (neuer Lauf, neues Artefakt), dann **Apply `canary-jutebeutel`** (`V64_CANARY_JUTEBEUTEL`): Modell 367, Foto-Vorlage, Vorschau vorhanden, nur zwei Varianten. Gates inklusive Foto-Ansicht und Bedienung auf dem Handy. Eine Handyprobe des Besitzers ist der einzige echte Beleg für Touch-Ziehen.
6. **Beobachtung** (Vorschlag 24 Stunden, Annahme): keine Meldung der Kundschaft, Gates wiederholt grün.
7. **Full: neuer Plan, dann Apply `full`** (`V64_FULL_16_EDITOR`). Tasse und Jutebeutel stehen schon auf 6.4.0 und erscheinen als «unverändert». Kurzfassung der Gates (1, 2, 3, 5) für alle 16 plus die drei Sperrseiten.

**Rollback in umgekehrter Reihenfolge der Anwendung**: zuerst `full` (`V64_ROLLBACK_16_EDITOR`, Artefakt des Full-Laufs), dann `canary-jutebeutel`, dann `canary-tasse`, je mit dem Artefakt **des zugehörigen Apply-Laufs, dessen Ledger «applied» zeigt** (Run-ID, 30 Tage Aufbewahrung). Das Full-Artefakt kann Tasse und Jutebeutel nicht zurückstellen (sie standen im Full-Plan schon auf Ziel, ihre Ledger-Zeilen sind «unchanged»); ihr Rückweg ist das Artefakt ihrer Stufe. Die Tasse trägt eine Änderung nach dem 6.3.1-Canary (`updatedAt` 09.11. 06:13 UTC, Ursprung ungeklärt): ein Rollback mit dem Artefakt von Lauf 42508762409 kann deshalb mit «fremder Hash» (Zustand `failed-changed`) enden. Für Stufe A immer das frische Plan-/Apply-Artefakt benutzen. Die umgekehrte Reihenfolge ist die empfohlene; eine andere endet seit der Härtung nicht mehr im Halbzustand (Ledger-Zeilen ohne Write werden übersprungen; getestet: Tasse, Jutebeutel, full führt ebenfalls auf den Ausgangsstand), braucht aber dieselben drei Läufe.

### Rollback im Einzelnen

Der Rollback liest nur das Artefakt des Apply-Laufs (Plan, Release, Vorher-/Nachher-HTML, Ledger). Er braucht weder `pod/v6/`-Dateien noch `editor-release.json` noch die Quell-Allowlist; darum laufen im Workflow bei `operation=rollback` weder die Lokaltests noch die `editor-release.json`-Prüfung (ein nachträglich geänderter Editor oder ein harmloser README-Edit darf den Notweg nicht versperren). Das Artefakt wird vor jedem Netzzugriff gegen Scope, Plan, Hashes und Ledger geprüft.

- **Nichts zurückzunehmen → Abbruch statt «grün».** Zeigt das Apply-Ledger keine einzige Zeile mit `applied`, `writing` oder `unknown*` (typisch: das Artefakt eines wiederholten Apply, bei dem das Ziel schon stand, Zustand `unchanged`; oder nur `rejected`), endet der Rollback mit «nichts zurückzunehmen» und Exit 1, statt Erfolg zu melden, während der Editor live bleibt. Dann das Artefakt des Laufs nehmen, dessen Ledger «applied» zeigt.
- **Nur Zeilen, bei denen der Apply geschrieben hat**, werden angefasst. Die drei Sperrprodukte (nie geschrieben, Ledger «unchanged») und im Full-Rollback die schon auf Ziel stehenden Produkte erscheinen als `skipped-not-written`. Eine seit dem Apply veränderte oder auf ENTWURF gestellte Sperrseite hält den Rollback der Editorprodukte nicht auf (Sperren stehen im Rollback nicht vorn).
- **Je Produkt Hash-Schutz, sonst nichts überschreiben:** Live-Beschreibung gleich Plan-Nachher → `before.html` zurückschreiben (ein Versuch, bytegenau zurückgelesen); gleich Plan-Vorher → `already-rolled-back`; alles andere → `failed-changed`, **nichts überschrieben**. Vorab nur die Identität (ID und Handle aus Allowlist und Plan), **kein** Status-, Kaufbarkeits-, Varianten- oder Storefront-Gate: ein auf ENTWURF gestelltes Produkt lässt sich zurückstellen; Auffälligkeiten (Status, Storefront nach dem Write) stehen als `hinweise` im Ledger.
- **Ein Fehler stoppt die übrigen Produkte nicht.** Jedes Produkt hat sein Ergebnis im Ledger; am Ende steht auf stdout eine Zusammenfassung (`changed` = echte Writes, `alreadyRolledBack`, `notWritten`, `failed`), und bei `failed > 0` endet der Lauf mit Exit 1 («Rollback unvollständig», die offenen Produkte sind genannt). Ein erneuter Lauf mit **neuem** `OUT_DIR` ist gefahrlos wiederholbar (schon zurückgestellte Produkte erscheinen als `already-rolled-back`). Der Apply bleibt dagegen beim ersten Fehler stehen.
- **Absichtszeile vor dem Write:** vor jedem Schreiben (Apply und Rollback) steht die Zeile `writing` im Ledger. Bricht der Lauf danach ab (Cancel im Actions-UI, Kill), bleibt der Rückweg über das Artefakt möglich: der Rollback entscheidet am Live-Hash, ob geschrieben wurde. Der Upload-Schritt läuft mit `always()`, das Ledger kommt also auch nach einem Abbruch ins Artefakt.
- **Ledger-Zustände:** Apply `applied`, `unchanged`, `writing`, `rejected`, `unknown`, `unknown-write-response`, `unknown-readback`, `unknown-readback-unavailable`; Rollback zusätzlich `rolled-back`, `already-rolled-back`, `skipped-not-written`, `failed-changed`, `failed` (Lesen, Identität oder anderer Fehler vor dem Write; `fehler` nennt den Grund).

### Handrückweg (nur wenn der Rollback-Lauf nicht geht)

Beispiel: `unknown-readback` (Shopify hat die geschriebene Beschreibung verändert zurückgegeben, der Rollback sieht einen fremden Hash und überschreibt nichts), oder das Artefakt ist abgelaufen. Je Produkt: die Datei `<numericId>.before.html` aus dem Artefakt `pod-v64-rollout-<Run-ID>` (die Vorher-Beschreibung, Hash `vorherSha256` in `plan.json`) per GraphQL `productUpdate(product: {id, descriptionHtml})` setzen (Shopify-Admin-GraphiQL oder das Shopify-Werkzeug der Sitzung), danach das Produkt neu lesen und den SHA-256 der Beschreibung mit `vorherSha256` vergleichen. **Nicht** über den Rich-Text-Editor des Admins: er zerstört den Skript-Block. Ohne Artefakt lässt sich nur der Editor-Block `<!-- lx-v63-editor:start … -->` bis `<!-- lx-v63-editor:end -->` einer Live-Beschreibung gegen den Block aus `fixtures/live-editor-bloecke-0811.json` tauschen (Stand 08.11., 6.3.0; die Tasse trägt dort zusätzlich ihren 6.3.1-Block); die Fixture enthält nie den übrigen Beschreibungstext, der bleibt aus der Live-Beschreibung stehen. Danach den Stand mit einem Plan prüfen.

### Gelockerter Planer (`editorReleasePlanen`)

Eine bestehende Beschreibung darf sich **nur** in diesen Feldern ändern; der Vergleich läuft auf normalisierten Texten, in denen genau diese Felder durch Platzhalter ersetzt sind:
- das Editor-Script-Tag (Dateiname, `?v=`, SRI),
- das `?v=` von `data-karte-url` und `data-vorschau-url` (16 Hex-Zeichen),
- das `card=` (64 Hex-Zeichen) im Marker `lx-v63-editor:start`.

Alles andere bleibt bytegleich, insbesondere der **Pfad** von Karte und Vorschau, `data-produkttitel`, `data-variant`, `data-karte-pflicht`, die Klasse und die Marker-Produkt-ID. Zulässige Ausgangslagen: genau **ein** Vorgänger-Script (6.3.0 oder 6.3.1, mit exakter URL, `?v=`, SRI, `crossorigin`, `defer`) und kein Ziel-Script; oder das Ziel-Script steht schon da und die Beschreibung bleibt bytegleich (`geaendert=false`). Jede andere Lage wirft (zwei Vorgänger, Vorgänger und Ziel zugleich, unbekannte Version, falsche SRI, zweiter Marker, fremdes Skript, geänderter Titel, fremde Karten-URL, Ziel da, aber Karte neu). Anlass: Commit `1835d4361d` hat Karte und Vorschau der zwei T-Shirt-Produkte neu gebaut; der strenge 6.3.1-Planer wirft dort schon heute («Editor-Release würde … weitere Beschreibungsbytes ändern»). Die Lockerung gilt auch für den alten 6.3.1-Pfad (er akzeptiert nur mehr Eingaben, nie ein anderes Ergebnis für bisher akzeptierte). Die drei Sperrprodukte müssen weiter bytegleich bleiben.

### Browser-Gates je Canary

Ein Browser, Pausen 3 bis 5 s, normale Chrome-Kennung, Adresse ohne Query, `domcontentloaded` plus 7 s, `Promise.race`-Zeitlimit je `evaluate`; Desktop 1440 und Handy 390.
1. **Bytes und Start:** Live-Datei sha256 gleich Plan; `data-lspod6-version="6.4.0"`, `data-init-v6="1"`, `data-lspod6-modus="karte"`; 0 `pageerror`; Konsole nur der bekannte Shop-Pay-403 und abgebrochene `/api/event/collect`.
2. **Hauptthread frei** (Lehre vom 09.11., Sperrskript): `evaluate`-Ping unter 100 ms; Ladezeit höchstens +1 s gegenüber 6.3.x.
3. **Ansichten im echten Theme, nicht in `mock.html`:** Tasse «Bearbeiten | Vorschau», Jutebeutel «Bearbeiten | Druckversion | Vorschau»; Vorgabe «Bearbeiten»; **Seitenverhältnis jedes Vorlagenbilds im Theme** gerendert gleich natürlich (±1 %), denn `img{max-width:100%}` des Themes hat 6.3.x auf 10 von 15 Seiten gequetscht und die Browsertests unter `pod/v6/test/` laufen ohne diese Regel. Jede neue Bildschicht (Stoff, Motiv, Vorlage) mitmessen.
4. **Bedienung:** Text-Ebene setzen, in «Bearbeiten» ziehen, skalieren, drehen (Maus und Touch-Emulation); Position in «Druckversion» und «Vorschau» gleich (±1 px); Zoom-Stufen; die Seite lässt sich mobil ausserhalb der Bühne scrollen.
5. **Kaufweg unverändert:** `/cart/add` per `page.route` abfangen (nichts im Warenkorb): Eigenschaften-Schlüssel gleich der 6.3.1-Referenz mit demselben Motiv (`_pod_karte`, `_vorschau`, `Druckdatei (…)`); Review-Tor-Dialog erscheint; Variantenwechsel ändert `sv/pv/m` passend; das Qualitätstor sperrt ein 300-px-Foto weiter.
6. **Variantenwechsel durch alle Radios:** kein Fehler; der rote Hinweis bleibt nicht stehen.
7. **Ausfallverhalten:** Skript-URL per `page.route` sperren: was sieht die Kundin? (Mit `data-karte-pflicht=1` gibt es keinen v5-Rückfall; vor dem Full-Lauf wissen.)
8. **Sperrprodukte (Magnet, Dad-Cap, Bügeltransfer):** Beschreibung bytegleich zum Plan-Vorher, Seiten laden (Hauptthread frei).

### Grenzen

- Nicht gemessen: Safari/iOS und echtes Handy, Kaufen mit echtem Warenkorb (nur abgefangen), Wirkung auf Käufe (0 von 34 Bestellungen kamen je über den Editor, QUELLE Bauplan 05.11.).
- Die neue Foto-Ansicht greift nur bei Platzierungen mit Produktfoto als Vorlage (Jutebeutel, T-Shirts, Hoodie, Kiss-Cut u. a.); Samsung, iPhone-Hüllen, Mauspad, Notizbuch, Stoffbeutel und Trinkflasche bleiben auf der Druckflächen-Bühne (Hypothese aus dem Entwurfs-Kopf).
- Die drei Sperren sind weiter nur eine Produktseiten-Sperre (siehe oben).
- Scope-Erweiterung (weitere Produkte, andere `PREVIEW_IDS`) ist nicht Teil dieses Weges.
- Wer Beschreibungen später im Rich-Text-Editor des Admins speichert, zerstört den Skript-Block.
- Aus der Sitzung kann `actions_run_trigger` mit HTTP 500 scheitern: nicht wiederholen, dem Besitzer «Run workflow» nennen.
- Der CI-Job `selbst-gestalten` holt nur ausgewählte Pfade und enthält den Workflow `pod-v64-description-rollout.yml` heute nicht; der Workflow-Test überspringt sich dann sauber. Wer ihn dort mitlaufen lassen will, trägt die Datei in `luxestyle-automation-tests.yml` an zwei Stellen ein (`paths:` und `sparse-checkout`).
- Beide Rollout-Workflows teilen sich die Concurrency-Gruppe `pod-v63-description-rollout` (nie gleichzeitig auf denselben Beschreibungen); ein zweiter wartender Lauf ersetzt einen früheren wartenden.
