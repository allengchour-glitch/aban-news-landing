# Direkter v6.3.1-Rollout ohne MAIN-Theme-Write

Der Helfer ersetzt ausschliesslich den vorhandenen Editor-Baustein in den Produktbeschreibungen. **Seit 11.11.2026: 17** ACTIVE-Printful-Produkte erhalten den v6-Editor: neun mit belegter proportionaler Produktvorschau und acht mit exakter Druckflächen-/Druckdateiansicht (neu dabei: der Magnet, Modell 656, Abschnitt «Magnet freigeschaltet (11.11.2026)» unten). Dad-Cap 206 und der extern erfüllte Bügeltransfer erhalten stattdessen einen sichtbaren Sperrbaustein; ihr normaler Produktformular-, Ajax-Klick- und Dynamic-Checkout-Weg wird im Browser gesperrt. Produktstatus, Preis, Varianten, Themes und Printful werden nicht geändert. (Bis 10.11.2026 waren es 16 Editorprodukte und drei Sperren; die Läufe vom 08. bis 10.11. sind mit diesen Zahlen protokolliert.)

Die zwei Sperren sind bewusst eine Produktseiten-Sperre. Eine direkt konstruierte Anfrage an Shopifys öffentliche Cart-API kann eine Beschreibung nicht serverseitig verhindern. Darum gehören vor dem Full-Lauf echte Browserproben für «In den Warenkorb» und «Jetzt kaufen» auf beiden Seiten zum Pflicht-Gate. Ein serverseitiges Gate ist nicht Teil dieses engen Rollouts; es liegt seit 11.11.2026 getrennt in `dropship/sperre-verfuegbar-1111/` (Bestandssperre: nicht kaufbar auf allen Kanälen; beim Dad-Cap nur die Kanal-Abwahl).

Editor, Karten und Vorschauen werden aus `rollout-v63/allowlist.json` und den lokalen Dateien unter `pod/v6/` deterministisch gebunden. Der Lauf akzeptiert nur die fest codierten 17 Editorprodukte, die exakt belegten neun Vorschau-IDs und die zwei Sperrprodukte. Jede Asset-URL trägt einen SHA-Parameter; der Editor trägt zusätzlich ein SRI-Attribut. `_headers` gibt `/pod/v6/*` mit CORS und `Cross-Origin-Resource-Policy: cross-origin` frei. Stabile Karten/Vorschauen werden einen Tag mit Revalidation gecacht; die Editorversionen `6.3.0` und `6.3.1` haben getrennte unveränderliche Dateipfade. Bestehende Produktseiten behalten funktionierende `6.3.0`-Bytes, bis Plan, Canary und Full-Apply ihren Script-Tag kontrolliert auf `6.3.1` umstellen.

## Schutzregeln

- fester Shop `au3j0y-hq.myshopify.com`, Primärdomain `luxestyle.ch` und Währung `CHF`; die Sollidentität ist nicht per Environment überschreibbar;
- vor jedem Write: ACTIVE, ID/Handle, vollständiger Variantensatz, Storefront HTTP 200 und Canonical mit Cache-Buster;
- vor dem ersten Write: SHA-256, Content-Type, CORS/CORP und abgestufte Cache-Regeln aller bereits produktiv ausgelieferten Assets;
- `data-karte-pflicht=1`: eine fehlende oder kaputte Karte fällt nicht auf v5 zurück;
- SRI bindet das geladene Editor-JavaScript an den geprüften SHA-256;
- der Plan akzeptiert nur exakt einen vorhandenen v6-Marker und darf bei den Editorprodukten ausschliesslich Dateiname, URL-Version und SRI ändern; die zwei Sperrprodukte müssen bytegleich bleiben; die einzige Ausnahme ist die Freischaltung des Magneten (unveränderte Sperre → Editor-Baustein, Abschnitt unten);
- Plan, Release, Vorher-/Nachher-HTML und ihre Hashes werden vor dem Write gespeichert und zurückgelesen;
- unmittelbar vor jedem Update werden Produkt- und Beschreibungsscope nochmals frisch geprüft;
- Mutation ohne Retry, sofortige bytegenaue Rücklesung und fortlaufendes Ledger; eine unklare Antwort wird nicht wiederholt;
- Rollback akzeptiert nur das unveränderte Artefakt eines Apply-Laufs und schreibt nur bei exakt passendem Vorher-/Nachher-Hash;
- Canary ist immer die Keramik-Tasse `gid://shopify/Product/15422823465345`; Full umfasst 17 Editor- plus zwei Sperrbeschreibungen (zusammen weiter 19, darum heissen die 6.3.1-Bestätigungen unverändert `…_19_SAFE`).

`origin/main` versteht die v6-Eigenschaften `Druckdatei (<Platzierung>)` und `_pod_karte`, prüft sie gegen Printful und legt zuerst einen idempotenten Entwurf an. Dieser Rollout startet keinen Printful-Sync und erzeugt keine Bestellung.

## Sicherer Actions-Pfad

Der manuelle Workflow `.github/workflows/pod-v63-description-rollout.yml` läuft nur auf dem Default-Branch, checkt exakt den beim Dispatch aufgezeichneten `${{ github.sha }}` aus, akzeptiert ausschliesslich die Auswahlfelder `plan|apply|rollback` und `canary|full`, verwendet die vorhandenen Secrets `SHOPIFY_CLIENT_ID` und `SHOPIFY_CLIENT_SECRET` und lädt Plan, Sicherungen sowie Ledger als 30-Tage-Artefakt hoch. Er enthält keine freie Befehlseingabe.

Reihenfolge nach Merge und bestätigtem Cloudflare-Deploy:

1. `operation=plan`, `scope=canary`, Bestätigung leer. Der Plan prüft trotzdem alle 19 Produkte und alle Produktionsassets.
2. Planartefakt prüfen.
3. `operation=apply`, `scope=canary`, Bestätigung `V63_CANARY_TASSE`.
4. Tassen-Canary auf Desktop und Mobile prüfen: Bildqualität, Proportionen, Variantenwechsel, Pflichtkarte, Druckdatei, Warenkorbseigenschaften und normaler Checkout-Abbruch bei ungültiger Gestaltung.
5. Die zwei Sperrseiten separat auf Standard-Warenkorb, Ajax-Warenkorb und Dynamic Checkout prüfen.
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
| `direct_rollout.mjs` | `EDITOR_VERSION=6.4.0` schaltet den neuen Pfad (Ziel aus `editor-release.json`, vier feste Scopes, V64-Bestätigungen). Ohne die Variable läuft alles wie bisher (6.3.1). |
| `direct_rollout_lib.mjs` | `rolloutKonfig` (Eingaben, Bestätigungen, Tabelle der Einzelstufen), `auswahlPlanen`, `canaryLedgerPruefen`, gelockerter `editorReleasePlanen`, `editorReleaseFormPruefen`; seit 11.11. `FREIGESCHALTET`, `sperreLiegtVor`, `freischaltungPlanen`. |
| `fixtures/live-editor-bloecke-0811.json` | die Editor-Blöcke der 16 Live-Beschreibungen (Stand 08.11., 6.3.0, ohne den Magneten, der damals die Sperre trug) plus der 6.3.1-Block der Tasse; nur Blöcke, keine Kundentexte. |
| `fixtures/live-sperrblock-magnet-1111.json` | der Sperrblock des Magneten, gelesen am 11.11.2026 10:03 UTC (nur der Marker-Block, Varianten-IDs, Längen und Prüfsumme der Beschreibung). Beleg, dass der Generator `blockerBaustein` die Live-Sperre Byte für Byte trifft. |
| `../../../.github/workflows/pod-v64-description-rollout.yml` | manueller Workflow, fest `EDITOR_VERSION=6.4.0`. |
| `direct_rollout_attrappe.mjs` | Offline-Attrappe für Shopify-Admin, Storefront und die Assets unter abannews.com (ersetzt `fetch` vollständig; Zustand in einer JSON-Datei; Fehlerschalter für Ablehnung, Netzfehler, Abbruch nach dem Write, ENTWURF, fremde Änderung u. a.). Ausgangszustand aus `fixtures/` plus erfundenem Vor-/Nachtext. |
| `direct_rollout_attrappe_test.mjs` | gut 140 Prüfungen in rund 40 Szenarien (A Apply und Schutzregeln, B Rollback, C alter 6.3.1-Pfad, D Freischaltung des Magneten): der Pfad, der Beschreibungen wirklich schreibt und zurückstellt (Plan, Apply je Stufe, Rollback, Hash-Schutz, Ledger- und `OUT_DIR`-Sperre, Live-Gates für Ziel und Rückweg-Dateien, Rücklesen, kein Wiederholen, alter 6.3.1-Pfad). Läuft in rund 16 Sekunden, ohne Netz, wird von `direct_rollout_test.mjs` als Kindprozess gestartet (und damit im CI-Job `selbst-gestalten`). `ROLLOUT_SKRIPT=<Pfad>` prüft eine andere Runner-Kopie. |
| `direct_rollout_mutationsprobe.mjs` | Mutationsprobe für Planer, Eingaben, Bauskript, Runner (Schreib- und Rollback-Pfad), Workflow, `_headers` und `editor-release.json`. |

`editor-release.json` ist **vorläufig** mit dem Dateistand von `lspod-designer-v6-6.4.0.js` vom 09.11. erzeugt. Erst nach dem Einfrieren der Datei neu erzeugen (`node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/editor_release_bauen.mjs`) und mit der Datei committen. Wird die Editor-Datei danach noch geändert, schlägt der Test «editor-release.json stimmt mit den echten Dateien überein» fehl, und `direct_rollout.mjs` bricht **vor jedem Netzzugriff** ab (Token, Shop und Assets werden nicht berührt).

### Bestätigungen und Scopes (fest einprogrammiert, keine freie Eingabe)

| Operation | Scope | Produkt | Bestätigung |
|---|---|---|---|
| plan | `canary-tasse`, `canary-jutebeutel`, `frei-magnet`, `full` | alle 19 werden immer geprüft | leer |
| apply | `canary-tasse` | Keramik-Tasse `gid://shopify/Product/15422823465345` | `V64_CANARY_TASSE` |
| apply | `canary-jutebeutel` | Bio-Jutebeutel `gid://shopify/Product/15422819991937` | `V64_CANARY_JUTEBEUTEL` |
| apply | `frei-magnet` | Magnet `gid://shopify/Product/15427217195393` (Sperre → Editor) | `V64_FREI_MAGNET` |
| apply | `full` | die 17 Editorprodukte (die 2 Sperren nur prüfen) | `V64_FULL_17_EDITOR` |
| rollback | `canary-tasse` | wie Apply | `V64_ROLLBACK_TASSE` |
| rollback | `canary-jutebeutel` | wie Apply | `V64_ROLLBACK_JUTEBEUTEL` |
| rollback | `frei-magnet` | wie Apply (Editor → Sperre) | `V64_ROLLBACK_MAGNET` |
| rollback | `full` | die im Full-Lauf berührten Produkte | `V64_ROLLBACK_17_EDITOR` |

Die Bestätigungen `V64_FULL_16_EDITOR` (bis 10.11.2026) und `V64_ROLLBACK_16_EDITOR` (bis 10.11.2026) gelten nicht mehr: wer «alle» bestätigt, bestätigt jetzt 17 Produkte samt Magnet. Ein Full-Artefakt von vor der Freischaltung nimmt der Rollback weiter an (mit `V64_ROLLBACK_17_EDITOR`), **es deckt den Magneten aber nicht ab**: im alten Plan steht er als Sperre, im Apply-Ledger als `unchanged`, der Rollback führt ihn als `skipped-not-written` (Attrappe D8: 16 zurückgestellt, 3 nie geschrieben). Die 16 anderen Produkte gehen auf 6.3.x zurück, der Magnet bleibt auf dem Ziel-Release. Wer 6.4.0 nach der Freischaltung ganz zurücknimmt, fährt darum zusätzlich den Rollback `frei-magnet` (`source_run_id` = Apply der Freischaltung, `V64_ROLLBACK_MAGNET`) und danach `LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` (Abschnitt «Magnet freigeschaltet», Rücknahme).

Die vier `V63_…`-Zeichenketten bestätigen **keinen** 6.4.0-Schreiblauf, und `V64_…` bestätigt keinen 6.3.1-Lauf (getestet als Kreuzprodukt). Bei `full` prüft der Lauf die zwei Sperrprodukte **vor** dem ersten Schreiben (sie werden nie geschrieben, nur gegen den Plan geprüft): eine zwischenzeitlich veränderte Sperre stoppt, bevor ein Editorprodukt geändert wurde.

### Ablauf (Reihenfolge nicht verhandelbar)

**Vorbedingungen**
1. 6.4.0 eingefroren (Editor-, Vorschau-, Review-Gate-Tests und Mutationsprobe grün), danach `editor-release.json` neu erzeugen. Ab dem ersten Verweis einer Beschreibung darf die Datei **nie mehr geändert werden** (SRI blockiert den Editor bei jedem anderen Hash, `data-karte-pflicht=1` hat keinen v5-Rückfall). Ein Fehler heisst 6.4.1 mit eigenem Pfad.
2. Datei und `editor-release.json` auf `main`, Cloudflare-Pages-Deploy (`cf-deploy-mainsite.yml`) abgewartet. `_headers` braucht keine Änderung: `/pod/v6/lspod-designer-v6-*.js` trifft den Namen 6.4.0.
3. Dieses Werkzeug (Workflow, Test) auf `main`. Der Workflow läuft nur auf dem Default-Branch und checkt `github.sha` aus.

**Schritte**
1. **Plan** (`operation=plan`, `scope=canary-tasse`, Bestätigung leer). Der Plan prüft alle 19 Produkte, die Live-Bytes von 6.4.0 **und der Rückweg-Dateien 6.3.0/6.3.1** (SHA, Content-Type, CORS/CORP, Cache-Regel).
2. **Artefakt `pod-v64-rollout-<Run-ID>` lesen.** Soll am 09.11. (vor der Freischaltung des Magneten): alle 16 Editorprodukte `geaendert=true` (15 × 6.3.0 → 6.4.0, Tasse 6.3.1 → 6.4.0; bei den zwei T-Shirts ändern sich zusätzlich Karten-/Vorschau-`?v=` und `card=`), die Sperren `geaendert=false`, 0 Fehler. Soll ab 11.11. steht im Abschnitt «Magnet freigeschaltet». Weicht die Zahl ab, ist der Zustand im Shop anders als erwartet: nicht anwenden.
3. **Stufe A: Apply `canary-tasse`** (`V64_CANARY_TASSE`). Run-ID und Artefakt dieses Laufs notieren (Rollback-Quelle). Danach **Browser-Gates** (unten) auf der Tasse. Sie prüft die gemeinsamen Teile (Tabs, Fehlerkorrekturen, Kaufweg, Review-Tor, Mobil), **nicht** die neue Foto-Ansicht (die Tasse hat keine; sie bleibt auf der Druckflächen-Bühne).
4. Fällt ein Gate: sofort **Rollback** `canary-tasse` mit der Run-ID aus Schritt 3 (Tasse zurück auf 6.3.1).
5. **Stufe B: neuer Plan** (neuer Lauf, neues Artefakt), dann **Apply `canary-jutebeutel`** (`V64_CANARY_JUTEBEUTEL`): Modell 367, Foto-Vorlage, Vorschau vorhanden, nur zwei Varianten. Gates inklusive Foto-Ansicht und Bedienung auf dem Handy. Eine Handyprobe des Besitzers ist der einzige echte Beleg für Touch-Ziehen.
6. **Beobachtung** (Vorschlag 24 Stunden, Annahme): keine Meldung der Kundschaft, Gates wiederholt grün.
7. **Full: neuer Plan, dann Apply `full`** (`V64_FULL_17_EDITOR`). Tasse und Jutebeutel stehen schon auf 6.4.0 und erscheinen als «unverändert». Kurzfassung der Gates (1, 2, 3, 5) für alle Editorprodukte plus die zwei Sperrseiten.

**Rollback in umgekehrter Reihenfolge der Anwendung**: zuerst `full` (`V64_ROLLBACK_17_EDITOR`, Artefakt des Full-Laufs), dann `canary-jutebeutel`, dann `canary-tasse`, je mit dem Artefakt **des zugehörigen Apply-Laufs, dessen Ledger «applied» zeigt** (Run-ID, 30 Tage Aufbewahrung). Das Full-Artefakt kann Tasse und Jutebeutel nicht zurückstellen (sie standen im Full-Plan schon auf Ziel, ihre Ledger-Zeilen sind «unchanged»); ihr Rückweg ist das Artefakt ihrer Stufe. Die Tasse trägt eine Änderung nach dem 6.3.1-Canary (`updatedAt` 09.11. 06:13 UTC, Ursprung ungeklärt): ein Rollback mit dem Artefakt von Lauf 42508762409 kann deshalb mit «fremder Hash» (Zustand `failed-changed`) enden. Für Stufe A immer das frische Plan-/Apply-Artefakt benutzen. Die umgekehrte Reihenfolge ist die empfohlene; eine andere endet seit der Härtung nicht mehr im Halbzustand (Ledger-Zeilen ohne Write werden übersprungen; getestet: Tasse, Jutebeutel, full führt ebenfalls auf den Ausgangsstand), braucht aber dieselben drei Läufe.

### Rollback im Einzelnen

Der Rollback liest nur das Artefakt des Apply-Laufs (Plan, Release, Vorher-/Nachher-HTML, Ledger). Er braucht weder `pod/v6/`-Dateien noch `editor-release.json` noch die Quell-Allowlist; darum laufen im Workflow bei `operation=rollback` weder die Lokaltests noch die `editor-release.json`-Prüfung (ein nachträglich geänderter Editor oder ein harmloser README-Edit darf den Notweg nicht versperren). Das Artefakt wird vor jedem Netzzugriff gegen Scope, Plan, Hashes und Ledger geprüft.

- **Nichts zurückzunehmen → Abbruch statt «grün».** Zeigt das Apply-Ledger keine einzige Zeile mit `applied`, `writing` oder `unknown*` (typisch: das Artefakt eines wiederholten Apply, bei dem das Ziel schon stand, Zustand `unchanged`; oder nur `rejected`), endet der Rollback mit «nichts zurückzunehmen» und Exit 1, statt Erfolg zu melden, während der Editor live bleibt. Dann das Artefakt des Laufs nehmen, dessen Ledger «applied» zeigt.
- **Nur Zeilen, bei denen der Apply geschrieben hat**, werden angefasst. Die Sperrprodukte (nie geschrieben, Ledger «unchanged») und im Full-Rollback die schon auf Ziel stehenden Produkte erscheinen als `skipped-not-written`. Eine seit dem Apply veränderte oder auf ENTWURF gestellte Sperrseite hält den Rollback der Editorprodukte nicht auf (Sperren stehen im Rollback nicht vorn).
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

Alles andere bleibt bytegleich, insbesondere der **Pfad** von Karte und Vorschau, `data-produkttitel`, `data-variant`, `data-karte-pflicht`, die Klasse und die Marker-Produkt-ID. Zulässige Ausgangslagen: genau **ein** Vorgänger-Script (6.3.0 oder 6.3.1, mit exakter URL, `?v=`, SRI, `crossorigin`, `defer`) und kein Ziel-Script; oder das Ziel-Script steht schon da und die Beschreibung bleibt bytegleich (`geaendert=false`). Jede andere Lage wirft (zwei Vorgänger, Vorgänger und Ziel zugleich, unbekannte Version, falsche SRI, zweiter Marker, fremdes Skript, geänderter Titel, fremde Karten-URL, Ziel da, aber Karte neu). Anlass: Commit `1835d4361d` hat Karte und Vorschau der zwei T-Shirt-Produkte neu gebaut; der strenge 6.3.1-Planer wirft dort schon heute («Editor-Release würde … weitere Beschreibungsbytes ändern»). Die Lockerung gilt auch für den alten 6.3.1-Pfad (er akzeptiert nur mehr Eingaben, nie ein anderes Ergebnis für bisher akzeptierte). Die zwei Sperrprodukte müssen weiter bytegleich bleiben. Für den Magneten, solange seine Beschreibung noch die Sperre trägt, gilt statt dieses Planers `freischaltungPlanen` (Abschnitt unten).

### Browser-Gates je Canary

Ein Browser, Pausen 3 bis 5 s, normale Chrome-Kennung, Adresse ohne Query, `domcontentloaded` plus 7 s, `Promise.race`-Zeitlimit je `evaluate`; Desktop 1440 und Handy 390.
1. **Bytes und Start:** Live-Datei sha256 gleich Plan; `data-lspod6-version="6.4.0"`, `data-init-v6="1"`, `data-lspod6-modus="karte"`; 0 `pageerror`; Konsole nur der bekannte Shop-Pay-403 und abgebrochene `/api/event/collect`.
2. **Hauptthread frei** (Lehre vom 09.11., Sperrskript): `evaluate`-Ping unter 100 ms; Ladezeit höchstens +1 s gegenüber 6.3.x.
3. **Ansichten im echten Theme, nicht in `mock.html`:** Tasse «Bearbeiten | Vorschau», Jutebeutel «Bearbeiten | Druckversion | Vorschau»; Vorgabe «Bearbeiten»; **Seitenverhältnis jedes Vorlagenbilds im Theme** gerendert gleich natürlich (±1 %), denn `img{max-width:100%}` des Themes hat 6.3.x auf 10 von 15 Seiten gequetscht und die Browsertests unter `pod/v6/test/` laufen ohne diese Regel. Jede neue Bildschicht (Stoff, Motiv, Vorlage) mitmessen.
4. **Bedienung:** Text-Ebene setzen, in «Bearbeiten» ziehen, skalieren, drehen (Maus und Touch-Emulation); Position in «Druckversion» und «Vorschau» gleich (±1 px); Zoom-Stufen; die Seite lässt sich mobil ausserhalb der Bühne scrollen.
5. **Kaufweg unverändert:** `/cart/add` per `page.route` abfangen (nichts im Warenkorb): Eigenschaften-Schlüssel gleich der 6.3.1-Referenz mit demselben Motiv (`_pod_karte`, `_vorschau`, `Druckdatei (…)`); Review-Tor-Dialog erscheint; Variantenwechsel ändert `sv/pv/m` passend; das Qualitätstor sperrt ein 300-px-Foto weiter.
6. **Variantenwechsel durch alle Radios:** kein Fehler; der rote Hinweis bleibt nicht stehen.
7. **Ausfallverhalten:** Skript-URL per `page.route` sperren: was sieht die Kundin? (Mit `data-karte-pflicht=1` gibt es keinen v5-Rückfall; vor dem Full-Lauf wissen.)
8. **Sperrprodukte (Dad-Cap, Bügeltransfer):** Beschreibung bytegleich zum Plan-Vorher, Seiten laden (Hauptthread frei).

### Grenzen

- Nicht gemessen: Safari/iOS und echtes Handy, Kaufen mit echtem Warenkorb (nur abgefangen), Wirkung auf Käufe (0 von 34 Bestellungen kamen je über den Editor, QUELLE Bauplan 05.11.).
- Die neue Foto-Ansicht greift nur bei Platzierungen mit Produktfoto als Vorlage (Jutebeutel, T-Shirts, Hoodie, Kiss-Cut u. a.); Samsung, iPhone-Hüllen, Mauspad, Notizbuch, Stoffbeutel und Trinkflasche bleiben auf der Druckflächen-Bühne (Hypothese aus dem Entwurfs-Kopf).
- Die zwei Sperren sind weiter nur eine Produktseiten-Sperre (siehe oben); die Bestandssperre daneben liegt in `dropship/sperre-verfuegbar-1111/`.
- Scope-Erweiterung (weitere Produkte, andere `PREVIEW_IDS`) ist nicht Teil dieses Weges. Die eine Ausnahme ist der Magnet (11.11.2026), mit eigenem Beleg, eigener Stufe und eigenen Tests.
- Wer Beschreibungen später im Rich-Text-Editor des Admins speichert, zerstört den Skript-Block.
- Aus der Sitzung kann `actions_run_trigger` mit HTTP 500 scheitern: nicht wiederholen, dem Besitzer «Run workflow» nennen.
- Der CI-Job `selbst-gestalten` holt nur ausgewählte Pfade und enthält den Workflow `pod-v64-description-rollout.yml` nicht; der Workflow-Test überspringt sich dort (GEMESSEN 11.11.2026 im Nachbau des Checkouts mit `git archive`: Exit 0, die vier Workflow-Tests und der Test der CI-Verdrahtung fehlen). Seit 11.11.2026 läuft `direct_rollout_test.mjs` darum zusätzlich im Job `rollout-werkzeug` von `magnet-freischaltung-test.yml`, **mit** beiden Rollout-Workflows im Checkout; der Job wird rot, wenn der Workflow-Test sich trotzdem überspringt (im Nachbau gemessen: mit dem Workflow Exit 0, ohne ihn Exit 1). `luxestyle-automation-tests.yml` bleibt unberührt (viele offene Entwürfe ändern diese Datei).
- Beide Rollout-Workflows teilen sich die Concurrency-Gruppe `pod-v63-description-rollout` (nie gleichzeitig auf denselben Beschreibungen); ein zweiter wartender Lauf ersetzt einen früheren wartenden.

## Magnet freigeschaltet (11.11.2026)

Stand 11.11.2026. Werkzeug, Karte und Tests sind gebaut. **Nichts ausgeführt:** kein Plan, kein Apply, kein Schreibzugriff auf Shop oder Printful, keine Rücknahme der Bestandssperre. Dieser Abschnitt ist der Weg dorthin.

### Messung (alles GEMESSEN am 11.11.2026, nur lesend)

- **Einziger Sperrgrund** war `REGIONAL_AVAILABILITY_UNKNOWN` (`rollout-v63/allowlist.json`, Stand bis 10.11.): Modell 656 «Die-Cut Magnets» hat kein EU-Lager, der Katalogschnappschuss nennt für Europa «unknown».
- **Printful, 10:08 UTC** (`GET /products/656`, `GET /mockup-generator/printfiles/656`, `GET /mockup-generator/templates/656` über `werkzeuge/katalog_holen.mjs` mit `ONLY=656`): Varianten, Druckdateien und Vorlagen sind gleich dem Schnappschuss `target-katalog-20261108/katalog/656.json`. Alle drei Varianten `in_stock`, Herstellung in den USA.
- **Printful, 10:09 UTC** (`POST /shipping/rates`, Empfänger Schweiz, 8001 Zürich, je Variante ein Stück): jede der drei Varianten bekommt die Rate STANDARD «Flat Rate», CHF 6.84 (USD 8.29), 10 bis 15 Tage. Beleg im Repo: `rollout-v63/source/lieferbarkeit-ch-1111.json` (Rohwerte je Variante, Methode, was nicht gemessen ist).
- **Shop, 10:03 UTC** (Admin, nur lesend): drei Varianten, alle mit SKU `9000001_<Printful-Variante>`:

| Shopify-Variante | Titel | SKU | Printful-Variante | Preis |
|---|---|---|---|---|
| `55791941812609` | 7,6 × 7,6 cm | `9000001_16366` | 16366 | CHF 16.90 |
| `55791941845377` | 10 × 10 cm | `9000001_16367` | 16367 | CHF 17.90 |
| `55791941878145` | 15 × 15 cm | `9000001_16465` | 16465 | CHF 19.90 |

  Alle drei waren zu diesem Zeitpunkt **nicht kaufbar** (Bestandssperre aus `dropship/sperre-verfuegbar-1111/`: bestandsgeführt, DENY). Die Beschreibung (5305 Zeichen) trägt genau einen Marker `mode=blocked`; der Block (2743 Zeichen) ist Byte für Byte der Sperrbaustein des Generators (`fixtures/live-sperrblock-magnet-1111.json`).
- **Editor live, 10:04 UTC:** die sichtbaren Editorprodukte laden `lspod-designer-v6-6.4.0.js`.
- **Nachmessung 10:59 bis 11:00 UTC** (nur lesend): Printful `GET /products/656` (drei Varianten `in_stock`, Region US), `GET /mockup-generator/printfiles/656` (183/184/419 mit 900, 1200, 1800 px, 300 dpi, `fill_mode` fit, je Variante genau eine Druckdatei in `default`) und `POST /shipping/rates` (je Variante STANDARD CHF 6.84 bzw. USD 8.29, 10 bis 15 Tage) unverändert; Shop: dieselben drei Varianten und SKUs, weiter nicht kaufbar (DENY, bestandsgeführt), `updatedAt` 09:06:46 UTC, die Beschreibung (5305 Zeichen) hat dieselbe Prüfsumme wie in der Fixture.
- **Nachmessung 12:13 UTC mit Liechtenstein** (`POST /shipping/rates`, je Variante ein Stück, `currency: CHF`): nach 8001 Zürich **und** nach 9490 Vaduz je Variante dieselbe Rate STANDARD CHF 6.84, `minDeliveryDays` 10, `maxDeliveryDays` 15, `minDeliveryDate` 2026-11-24, `maxDeliveryDate` 2026-11-30 (Tarifname «Flatrate (Voraussichtlicher Liefertermin: 24.–30. Nov)»). Von Mittwoch, 11.11., aus sind das 9 bis 13 Werktage. Das passt zur Angabe im Shop (GEMESSEN 12:1x UTC, Admin nur lesend): Aufklappbereich im MAIN-Theme (`templates/product.json`) «Selbst gestaltete Artikel werden für dich gedruckt und brauchen 7–14 Werktage», Metafeld `custom.lieferzeit` des Magneten `{"ch":"7–14","tier":"pod","weg":"Druck auf Bestellung"}`; die Shoptexte müssen wegen der Lieferzeit nicht geändert werden. Die per SHA-256 gebundene Belegdatei `lieferbarkeit-ch-1111.json` enthält nur Zürich und bleibt unverändert (sie wird erst beim nächsten Neubau von Allowlist und Karten erweitert).
- **Nicht gemessen:** Zoll und Einfuhrsteuer für US-Ware bei der Kundin, die echte Laufzeit (nur Printfuls Schätzung), die Seite im Browser (siehe «Grenzen»).

### Karte

`pod/v6/maps/lspod-15427217195393.karte.json` (2631 Byte, sha256 `c4ca8a83fa225c34f51952d728914ae38d8e43b7a71f3d2a7a6b893b7adf4de2`), gebaut mit dem vorhandenen Werkzeug (`rollout-v63/build.mjs --panel=84` → `pod/v6/werkzeug/karte_fuer_editor.mjs`) aus dem Katalogschnappschuss. Dieselben Bytes entstehen aus den am 11.11. frisch geholten Printful-Daten. Keine Produktvorschau (wie Mauspad 518): verbindliche Druckflächen-Ansicht.

| Shopify-Variante | Printful-Variante | Druckdatei (Printfile) | Pixel | dpi | Druckfläche | Herkunft |
|---|---|---|---|---|---|---|
| `55791941812609` | 16366 | 183 | 900 × 900 | 300 | 3 × 3 Zoll = 7,62 × 7,62 cm | Printful `printfiles/656`, Zuordnung über die SKU im Shop |
| `55791941845377` | 16367 | 184 | 1200 × 1200 | 300 | 4 × 4 Zoll = 10,16 × 10,16 cm | wie oben |
| `55791941878145` | 16465 | 419 | 1800 × 1800 | 300 | 6 × 6 Zoll = 15,24 × 15,24 cm | wie oben |

Die Zentimeter sind aus Pixel und dpi gerechnet (Pixel ÷ 300 × 2,54), nicht eigens gemessen. Eine Platzierung (`default`), je Druckdatei eine eigene Vorlagengeometrie (Flächen 518, 590 und 699 Vorlagenpixel). Die reine Editor-Logik von 6.3.1, 6.4.0 und 6.4.2 liest die Karte gleich (Zuordnung, Druckdatei und Geometrie je Variante; `rollout-v63/build_test.mjs`, ohne Browser).

**Warum eine Werkzeugänderung nötig war:** `werkzeuge/modellkarte.mjs` stuft ein Modell ohne EU-Lager als `UNGEEIGNET` ein, auch wenn es technisch `FLACH` ist. Neu nimmt `karte_fuer_editor.mjs` mit der Option `lieferbarCh` (Kommandozeile `--lieferbar-ch`) die technische Klasse. Der Rollout-Bau setzt die Option nur für Produkte, deren Schweizer Lieferbarkeit in `source/lieferbarkeit-ch-1111.json` belegt ist; die Allowlist bindet den Beleg per SHA-256 (`source.availabilityCh`), und der Bau bricht ab, wenn eine freigegebene Karte `UNGEEIGNET` trüge. Ohne Beleg bleibt alles wie bisher.

### Was sich im Werkzeug geändert hat

- `ALLOWLIST` 17 (neu der Magnet), `BLOCKLIST` 2 (Bügeltransfer, Dad-Cap), `FREIGESCHALTET` 1 (der Magnet mit dem alten Grundtext seiner Sperre).
- Neue Einzelstufe `frei-magnet` mit eigenen Bestätigungen (Tabelle oben). Die Full-Bestätigungen heissen jetzt `…_17_EDITOR`.
- `freischaltungPlanen`: solange die Beschreibung des Magneten den Sperr-Marker trägt, ist genau ein Übergang zulässig. Der eine Marker-Block muss Byte für Byte der Sperrbaustein des Generators sein (alter Grundtext, heutige Varianten). Er wird durch den Editor-Baustein mit dem Ziel-Release ersetzt. Alles ausserhalb des Blocks bleibt bytegleich. Jede andere Lage wirft: von Hand veränderte Sperre, zweiter Marker, anderes Produkt, Reste der Sperre, falscher neuer Baustein. Nach der Freischaltung gilt für den Magneten der gewöhnliche `editorReleasePlanen`.
- **Kaufbarkeit:** jeder **Apply**, der den Magneten schreibt (`frei-magnet`, `full`), verlangt eine kaufbare Variante, prüft sie im Plan-Teil des Laufs vor dem ersten Write und unmittelbar vor dem Write noch einmal, und nennt im Fehlerfall den Befehl für die Rücknahme der Bestandssperre. Ein **Plan** liest nur: er läuft auch bei aktiver Bestandssperre, vermerkt in der Planzeile `kaufbar: false` und nennt in seiner Zusammenfassung unter `vorDemApply` den Befehl für die Rücknahme (seit der Nachbesserung vom 11.11.2026; vorher verlangte auch der Plan die Kaufbarkeit, die Rücknahme musste dann vor dem Plan liegen, und ein gescheiterter Plan hätte einen kaufbaren Magneten ohne Editor hinterlassen). Plan und Apply einer anderen Stufe (Tasse, Jutebeutel) laufen ebenfalls bei aktiver Bestandssperre.
- **Alte Artefakte:** ein Plan von vor der Freischaltung führt den Magneten als `blocked`, sein Release nennt 16 Produkte. Nur der Rollback liest solche Artefakte noch; Plan und Apply arbeiten immer mit dem heutigen Stand.
- Der alte 6.3.1-Pfad benutzt dieselben Listen (17 und 2) und kennt die Stufe `frei-magnet` nicht.

### Reihenfolge des Rollouts (nicht verhandelbar)

**Vorbedingungen**
0. **Zweig nach `main` bringen, aber in der richtigen Reihenfolge.** Dieser Stand sitzt auf `1fdd190b59` (Editor 6.4.2, Zweig `claude/luxestyle-editor-642-1011`, nicht gemergt). Ein direkter Merge nähme die 21 Commits von 6.4.2 mit (GEMESSEN 11.11.2026 12:1x UTC, nur lesend: `git rev-list --count 90856a7c5e..1fdd190b59` = 21, `git diff --shortstat` 31 Dateien, +13 211 −103) und gibt Konflikte (`git merge-tree --write-tree --name-only origin/main HEAD`, `origin/main` = `53a9f0cb1b`: `dropship/kategorien_ledger.txt`, add/add in `dropship/sperre-verfuegbar-1111/README.md` und `sperr_verfuegbar.mjs`). Darum: zuerst den 6.4.2-PR mergen, dann diesen Zweig auf `origin/main` rebasen. Commit 2a (Sperr-Ordner unverändert übernommen) fällt dabei weg, denn der Ordner auf `main` (#3091, `839f3a07ef`) ist bytegleich dazu (`git diff origin/main de1d5d6c89 -- dropship/sperre-verfuegbar-1111` leer). Bei den Sperr-Dateien die Fassung aus den späteren Commits nehmen (Schalter `NUR=`, README-Abschnitte). Alternativ nur die eigenen Commits (`6070ce5b0e`, `131b887db1`, `56d9bb9dc4`, `d5ebf03282` und die Nachbesserung) auf `origin/main` übertragen: dann bleiben Konflikte in den beiden Sperr-Dateien (add/add) und in `pod/v6/README.md` (`git merge-tree --merge-base=1fdd190b59`), von Hand lösen. Danach alle Tests dieses Abschnitts erneut fahren.
1. Dieser Stand auf `main`, Cloudflare-Pages-Deploy (`cf-deploy-mainsite.yml`) abgewartet. Prüfen: `https://abannews.com/pod/v6/maps/lspod-15427217195393.karte.json` liefert sha256 `c4ca8a83…` (der Plan prüft es ebenfalls: SHA, Content-Type, CORS/CORP, Cache-Regel).
2. `dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` mit dem Schalter `NUR=` auf `main` (liegt in diesem Stand).
3. Text über den Konturschnitt (Abschnitt «Offen vor dem Apply» unten, seit 11.11. 13:02 UTC bei Printful gemessen): direkt nach dem Apply setzen, vor der ersten Bestellung. Er blockiert den Apply nicht.

**Schritte** (die Bestandssperre fällt erst unmittelbar vor dem Apply; bis dahin bleibt der Magnet gesperrt)
1. **Plan** (Workflow «POD v6.4 Beschreibungs-Rollout», `operation=plan`, `scope=frei-magnet`, Bestätigung leer). Der Plan liest nur und läuft auch, solange die Bestandssperre aktiv ist. Artefakt `pod-v64-rollout-<Run-ID>` lesen. Soll: Zeile des Magneten `kind: editor`, `freischaltung: true`, `geaendert: true`, `kaufbar: false`; die Zusammenfassung im Log nennt unter `vorDemApply` den Befehl aus Schritt 2; Dad-Cap und Bügeltransfer `geaendert: false`; die übrigen 16 Editorprodukte je nach Stand des Editor-Rollouts (stehen sie schon auf dem Ziel-Release: `geaendert: false`). In `15427217195393.before.html` und `.after.html` darf sich nur der Marker-Block unterscheiden. **Scheitert der Plan:** nichts tun, der Magnet ist weiter gesperrt; Ursache klären, dann neu planen.
2. **Unmittelbar vor dem Apply die Bestandssperre zurücknehmen, und zwar nur für den Magneten.** Erst der Trockenlauf, dann scharf:

   ```sh
   ZURUECK=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs          # Plan, schreibt nichts
   ZURUECK=1 LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs   # nur der Magnet
   ```

   **Nicht** ohne `NUR=`: das stellt auch den Bügeltransfer zurück, der gesperrt bleiben soll (GEMESSEN gegen die Attrappe, `dropship/sperre-verfuegbar-1111/README.md`, Abschnitt «Schalter NUR=»). Soll nach dem Lauf: drei Zeilen `NACHGELESEN magnet-zum-selbstgestalten … Felder OK | Kaufbarkeit OK`, Exit 0. Ab jetzt ist der Magnet kaufbar, seine Seite zeigt aber noch die Sperre: Schritt 3 ohne Pause fahren. Meldet der tägliche Sperr-Wächter (08:53 UTC) in diesem Fenster «kaufbar trotz Sperre» für den Magneten, ist das erwartet.
3. **Apply** (`operation=apply`, `scope=frei-magnet`, Bestätigung `V64_FREI_MAGNET`). Der Lauf plant frisch, verlangt jetzt die Kaufbarkeit und prüft sie unmittelbar vor dem Write noch einmal. Run-ID notieren: sie ist die Quelle des Rückwegs. **Scheitert der Apply, ohne zu schreiben** (Ledger ohne `applied`, `writing` oder `unknown*`): sofort `LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` (sperrt wieder, die Beschreibung trägt ja noch `mode=blocked`). **Scheitert er nach einem Write** (`writing`, `unknown*`): erst Rücknahme 1, dann Rücknahme 2.
4. **Seitenprüfung** auf `https://luxestyle.ch/products/magnet-zum-selbstgestalten` (Desktop 1440 und Handy 390, Regeln wie «Browser-Gates je Canary»):
   - der Editor startet (`data-init-v6="1"`, `data-lspod6-modus="karte"`), 0 `pageerror`, Hauptthread frei; kein Text «Personalisierung derzeit nicht bestellbar» mehr;
   - Variantenwechsel durch alle drei Grössen: die Bühne folgt der Druckfläche, kein roter Hinweis;
   - Kaufweg abgefangen (`page.route('**/cart/add**', abort)`, nichts im Warenkorb): `_pod_karte` nennt `m: 656` und je Grösse `pv` 16366, 16367, 16465 passend zu `sv`; die Druckdatei hat 900, 1200 bzw. 1800 Pixel Kantenlänge;
   - **Rückgabe-Hinweise schalten um:** die Vertrauenszeile zeigt «✔️ Ersatz bei Druckfehlern, keine Rückgabe bei Meinungsänderung» und nicht mehr «↩️ 30 Tage Rückgabe», der Aufklappbereich «Selbst gestaltete Artikel: Ersatz bei Druckfehlern statt Rückgabe.». Grund (GEMESSEN 12:1x UTC, MAIN-Theme `templates/product.json` nur gelesen): alle drei Stellen hängen an `product.description contains 'lspod-designer'`. Die heutige Sperr-Beschreibung enthält die Zeichenkette 0-mal (darum zeigt die gesperrte Seite heute «30 Tage Rückgabe»), der Editor-Baustein enthält `class="lspod-designer-v6"` (Test «Theme-Kopplung» in `direct_rollout_test.mjs`). Wechselt die Zeile nicht, die Bedingung im Produkt-Template prüfen (eigener Theme-Schritt);
   - Pille und Lieferbox zeigen «lieferbar», das JSON-LD `InStock` (Seiten-Cache kann rund 20 Minuten nachhinken);
   - `PRUEFEN=1 BEKANNT_KAUFBAR=dad-cap-selbst-gestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` endet mit Exit 0 (der Magnet zählt nicht mehr, der Bügeltransfer ist weiter gesperrt).
5. Danach gehört der Magnet zu jedem `full`-Lauf (17 Editorprodukte, `V64_FULL_17_EDITOR`), auch zum späteren 6.4.2-Rollout.

**Rücknahme (umgekehrte Reihenfolge)**
1. Rollback der Beschreibung: `operation=rollback`, `scope=frei-magnet`, Bestätigung `V64_ROLLBACK_MAGNET`, `source_run_id` = Run-ID des Apply-Laufs aus Schritt 3. Die Beschreibung trägt danach wieder den Sperrbaustein (Hash-Schutz wie bei jedem Rollback).
2. Bestandssperre wieder setzen, nur für den Magneten: `LIVE=1 NUR=magnet-zum-selbstgestalten node dropship/sperre-verfuegbar-1111/sperr_verfuegbar.mjs` (wirkt nur, solange die Beschreibung `mode=blocked` trägt, darum erst nach dem Rollback).
3. Nur wenn die Karte selbst falsch ist: diesen Stand in `main` zurücknehmen. Solange keine Beschreibung auf die Karte verweist, hat die Datei keine Wirkung.

**Rollback `full` nach der Freischaltung:** ein Full-Artefakt von vor dem 11.11.2026 (Magnet dort als Sperre) stellt den Magneten **nicht** zurück (siehe «Bestätigungen und Scopes»). Wer 6.4.0 ganz zurücknimmt, fährt zusätzlich Rücknahme 1 und 2 dieses Abschnitts. Ein Full-Artefakt von nach der Freischaltung, in dem der Magnet `applied` steht, nimmt ihn mit; dann nur noch Rücknahme 2.

### Offen vor dem Apply (Entscheide des Besitzers, GEMESSEN 11.11.2026 12:1x UTC, nur lesend)

**Konturschnitt wird nirgends erklärt (wichtig, vor der ersten Bestellung).**
- Der Editor schreibt die Druckdatei als PNG ohne Hintergrund (`druckdateiErzeugen` in `pod/v6/lspod-designer-v6-6.4.2.js`: leere Leinwand, kein `fillRect`, `toBlob(…, 'image/png')`). Die Karte des Magneten trägt `hinweise: []`, `HINWEIS_TEXTE` des Editors kennt keinen Code zum Schnitt (Stickerei, Gestrickt, Rundum-Druck, Kappe, Tasche, …). Im Reiter «Bearbeiten» liegt die Bühne auf Weiss (`hintergrundFarbe` `#ffffff` aus `GET /mockup-generator/templates/656`), weisse und durchsichtige Flächen sind dort nicht zu unterscheiden, nur in «Druckversion» (Karos). Ein Werkzeug «Freistellen» ist im Editor vorhanden.
- Die Beschreibung sagt nur «3 Grössen (7,6–15 cm), Konturschnitt (Form folgt deinem Motiv)» (Admin gelesen 12:12 UTC, sha256 gleich der Fixture). Die Kiss-Cut-Seite hat dieselbe Lücke: ihr sichtbarer Text nennt «Konturschnitt, exakt um dein Motiv geschnitten», aber nichts zu Transparenz oder Freistellen, ihre Karte trägt ebenfalls `hinweise: []`.
- **Wie Printful die Schnittlinie bildet (GEMESSEN 11.11.2026 13:02 UTC, `konturschnitt_probe.mjs`, zwei Aufgaben im Printful-Mockup-Generator für Modell 656, Variante 16367, kein Auftrag, keine Kosten):** eine Datei mit durchsichtigem Hintergrund (Text «Test Entwurf») wird eng um das sichtbare Motiv geschnitten, mit einem schmalen weissen Rand; ein Foto ohne Transparenz wird zum Quadrat mit runden Ecken und weissem Rand (Bild `beleg-konturschnitt-1111.png`, links durchsichtig, rechts deckend). Belegt ist Printfuls eigene Vorschau, nicht ein echter Schnitt. Printfuls Hilfeseiten nennen die Regel nicht (gesucht 12:5x UTC); die Hilfe von Fourthwall beschreibt dasselbe.
- **Text (eigener Shop-Schritt nach dem Apply, mit Sicherung und Rücklesen, ausserhalb des Marker-Blocks, nicht Teil dieses Werkzeugs):** nach dem Punkt «Konturschnitt …» ergänzen: «Die Form folgt dem Rand deines Motivs, mit einem schmalen weissen Rand. Durchsichtige Flächen fallen weg; ein Foto mit Hintergrund wird zum Quadrat mit runden Ecken (mit «Freistellen» entfernst du den Hintergrund). Prüfe die Form in der Ansicht «Druckversion» (Karos = durchsichtig).» Belegt durch die Messung oben. Nach dem Apply, damit Plan und Apply dieselbe Beschreibung sehen. Eine Änderung ausserhalb des Markers stört den Rollout nicht: Plan und Apply lesen die Beschreibung frisch, die Prüfsumme der Fixture wird nur im Test verwendet. Später in einer neuen Editor-Version einen Hinweis-Code `konturschnitt` einführen (`HINWEIS_TEXTE`, `BEKANNTE_HINWEIS_CODES`), ebenso für Kiss-Cut 358. Die Editor-Dateien sind per SRI eingefroren und bleiben in diesem Stand unverändert.

**Grössen sind im Shop anders gerundet als im Editor (klein).** Die Optionen und die Zeile «Grösse:» des Magneten sagen «7,6 × 7,6 cm», «10 × 10 cm», «15 × 15 cm» (Admin 12:12 UTC). Der Editor zeigt für dieselben Varianten «Druckfläche 10,2 × 10,2 cm» und «15,2 × 15,2 cm» (`areaInfo` mit `zahlAnzeige(…, 1)`; 1200 bzw. 1800 px ÷ 300 dpi × 2,54 = 10,16 bzw. 15,24 cm, gerechnet). Der Kiss-Cut nennt die 4-Zoll-Grösse im Shop «10,2 × 10,2 cm». Möglichkeit 1: Optionswerte in «10,2 × 10,2 cm» und «15,2 × 15,2 cm» umbenennen und die Beschreibung («Grösse:», «3 Grössen (7,6–15,2 cm)») nachführen; eigener Shop-Schritt, Varianten-IDs und SKUs bleiben, die Karte bindet über die IDs und bleibt gültig. Möglichkeit 2 (Stand): so lassen. Kein Blocker.

### Tests (GEMESSEN 11.11.2026, ohne Browser, ohne Netz)

- `node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/direct_rollout_test.mjs` (im CI-Job `selbst-gestalten`, dort ohne den Workflow-Test, und im Job `rollout-werkzeug` von `magnet-freischaltung-test.yml` mit ihm): reine Tests für `FREIGESCHALTET`, `sperreLiegtVor`, `freischaltungPlanen` (Gutfall, 10 Ausgangslagen, 5 falsche Bausteine, 9 falsche Produkte), Produktgate mit und ohne Kaufbarkeitspflicht, Release mit und ohne Magnet, Karte und Beleg, Theme-Kopplung der Rückgabe-Hinweise (`lspod-designer`), die Befehle in den drei README-Dateien (Rücknahme nur mit `NUR=`, Wiedersperren ohne `ZURUECK=1`, richtige Bestätigung je Zeile), die CI-Verdrahtung in `magnet-freischaltung-test.yml`; dazu die Attrappen-Szenarien.
- `direct_rollout_attrappe_test.mjs`, Abschnitt D: Plan, Apply und Rollback der Stufe `frei-magnet` gegen die Offline-Attrappe, zweiter Plan nach der Freischaltung, aktive Bestandssperre (Plan `frei-magnet` und `full` laufen und nennen `vorDemApply`, jeder Apply mit dem Magneten bricht vor dem ersten Write ab, fremde Stufen laufen weiter), veränderte Sperre, andere Varianten, zwei Marker, Drift zwischen Plan und Apply, Artefakt von vor der Freischaltung.
- `node dropship/selbst-gestalten-fertig-0511/rollout-v63/build_test.mjs` und die beiden `--check`-Läufe (im Workflow `magnet-freischaltung-test.yml`).
- `node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/direct_rollout_mutationsprobe.mjs`: die Mutanten F01 bis F33 decken Freischaltungs-Planer, Kaufbarkeitspflicht (F27 und F28: Plan ohne, Apply mit Pflicht), Hinweis `vorDemApply` (F29, F33), Stufen-Tabelle, Runner, alte Artefakte und Workflow ab, R02 bis R05 die Befehle dieses README; die Muster der älteren Mutanten (K03, W02, W10, R01, P05, P08, P13, S09, S10) sind an die 17er-Bestätigungen und die neuen Zeilen angepasst. Kartenbauer: `node pod/v6/test/mutationsprobe.mjs K` (K13 bis K17 für `lieferbarCh`, nur `unit_test.mjs`, kein Browser).
- Zahlen des letzten Laufs: Abschlussmeldung dieser Arbeit und Commit-Nachricht. Sie stehen bewusst nicht fest in dieser Datei, weil sie mit jedem neuen Test wandern.

### Grenzen

- **Ungemessen: jede Browserprüfung.** Die Seite des Magneten mit dem Editor wurde nie in einem Browser geladen (in dieser Arbeit waren Browser-Tests ausgeschlossen). Belegt ist nur die reine Editor-Logik auf der Karte. Schritt 4 ist darum Pflicht, nicht Kür.
- **Ungemessen:** der erste Lauf des Workflows mit `frei-magnet` in GitHub Actions, der erste Lauf von `magnet-freischaltung-test.yml`, der scharfe Lauf des Sperr-Skripts mit `NUR=`, Zoll und Einfuhrsteuer für US-Ware, die echte Laufzeit, Druckqualität und Stanzform des Magneten (die Karte kennt nur das Quadrat der Druckdatei, nicht die Konturstanzung; wie Printful die Schnittlinie bildet, siehe «Offen vor dem Apply»).
- Das Werkzeug kennt als Ziel nur das Release aus `editor-release.json` (in diesem Stand 6.4.0). Der Magnet bekommt denselben Editor wie die anderen Produkte. Ein späteres Ziel-Release (6.4.2) nimmt ihn über `full` mit.
- Versandkosten: Printful verlangt für den Magneten nach Zürich und nach Vaduz CHF 6.84 je Sendung, der Shop CHF 7 bzw. gratis ab CHF 50. Die Preise (CHF 16.90 bis 19.90) wurden nicht neu gerechnet.
