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

Bei einem abgebrochenen Apply enthält das fortlaufende Ledger nur bereits berührte oder unklare Produkte. Der Rollback betrachtet nur diese IDs: ein bestätigter Nachher-Hash wird zurückgeschrieben, ein bereits vorhandener Vorher-Hash übersprungen, jeder fremde Hash stoppt den Lauf.

Lokale Befehle sind nur für Entwicklung und brauchen dieselben exakten Bestätigungen sowie legitime Shopify-Credentials:

```sh
MODE=plan SCOPE=canary OUT_DIR=/tmp/lspod-v63-plan node direct_rollout.mjs
MODE=apply LIVE=1 SCOPE=canary ACK=V63_CANARY_TASSE OUT_DIR=/tmp/lspod-v63-canary node direct_rollout.mjs
MODE=apply LIVE=1 SCOPE=full ACK=V63_FULL_19_SAFE OUT_DIR=/tmp/lspod-v63-full node direct_rollout.mjs
MODE=rollback LIVE=1 SCOPE=canary ACK=V63_ROLLBACK_TASSE ROLLBACK_PLAN=/tmp/lspod-v63-canary OUT_DIR=/tmp/lspod-v63-rollback node direct_rollout.mjs
```

Jeder `OUT_DIR` muss neu sein. Ein vorhandener Plan oder ein vorhandenes Ledger stoppt den Lauf, damit kein unklarer Write blind wiederholt und keine Sicherung überschrieben wird.
