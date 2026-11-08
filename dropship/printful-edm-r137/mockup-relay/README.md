# Printful-Mockup-Relay für LuxeStyle

Stand: 08.11.2026. Lokal implementierter und offline getesteter Entwurf. **Nicht deployt, kein API-Aufruf, kein Shop-/Theme-Write.**

Der Relay ist der begrenzte Rückfall für eine echte Printful-Produktvorschau nach dem Speichern eines Designs. Er ist keine Live-Zeichenfläche: Printful brauchte in der Messung vom 05.11.2026 4,6 bis 11,4 Sekunden je Aufgabe. Das Original-EDM bleibt die bevorzugte Oberfläche, sobald ein technisch bestätigter EDM-Account-Token und die Domainbindung vorliegen.

## Sicherheitsgrenze

- Der private Printful-Token bleibt serverseitig. `transport` und `credentialProvider` werden vom produktiven Host injiziert; es gibt keinen Browser-Endpunkt mit Token. `credentialProvider` muss die erwartete LuxeStyle-Store-ID `18288470` mitliefern; jeder Printful-Aufruf trägt denselben `X-PF-Store-Id`-Wert.
- `subjectId` muss aus einer serverseitig verifizierten Sitzung stammen. Der Browser darf sie nicht frei wählen. Exakte Origin-Prüfung ergänzt Session-/CSRF-Prüfung, ersetzt sie aber nicht.
- Der einzige schreibende Upstream-Pfad ist `POST https://api.printful.com/mockup-generator/create-task/{verifizierte Produkt-ID}`. Der einzige Leser ist `GET …/mockup-generator/task?task_key=…`.
- Produkt, Shopify-Variante, Printful-Variante, Druckflächen und exakte Druckmasse kommen über den gemeinsamen serverseitigen `resolveVariant`-Adapter aus der positiven Projekt-Allowlist. Es gibt kein zweites Manifestformat. Fehlende, nicht berechtigte oder widersprüchliche Daten scheitern geschlossen.
- Design-Adressen müssen HTTPS sein und von einem explizit erlaubten Host kommen. Voreinstellung: `cdn.shopify.com` oder `res.cloudinary.com`. Zusätzlich bestätigt `verifyUploadReceipt` serverseitig, dass Adresse und SHA-256 zu einer eigenen Upload-Quittung dieser Sitzung gehören.
- Voreinstellung der eigenen Drosselung: höchstens 6 neue Aufgaben je 60 Sekunden global und 1 je 30 Sekunden pro Sitzung. Das hält Reserve unter dem am 05.11. gemessenen Printful-Limit von 10 je 60 Sekunden je Store.
- Vor dem POST wird ein dauerhafter Checkpoint verlangt. Dedupliziert wird sowohl über Request-ID als auch über Sitzung, Produkt, Variante, Druckpositionen und SHA-256 der Dateien. `inflight` oder unbekannter Ausgang wird nie blind wiederholt.
- Der erste GET ist frühestens nach 10 Sekunden möglich. Weitere explizite GETs bei `pending` frühestens nach 3 Sekunden. GETs sind zusätzlich auf 60 je Minute global und 20 je Minute pro Sitzung begrenzt. Nach 120 Sekunden oder 30 GETs endet die Aufgabe als abgelaufen. Es gibt keinen Hintergrund-Loop.

## Gemeinsamer Resolververtrag

Der Relay definiert kein eigenes Katalogformat. Der Host injiziert `resolveVariant({shopifyHandle, shopifyVariantId})` auf Basis der gemeinsamen R137-Produkt-Allowlist. Nur eine exakte Regel mit `provider: "printful"` und `mockupEligible: true` wird akzeptiert. `edmEligible` bleibt davon getrennt: Ein global fehlender EDM-Zugang macht einen belegten Mockup-Weg nicht automatisch ungültig. Rückgabevertrag:

```json
{
  "provider": "printful",
  "mockupEligible": true,
  "shopifyHandle": "keramik-tasse-selbst-gestalten",
  "shopifyVariantId": "gid://shopify/ProductVariant/…",
  "printfulProductId": 19,
  "printfulVariantId": 1320,
  "placements": [{ "id": "default", "width": 2700, "height": 1050 }]
}
```

Die öffentliche Gegenprobe `../evidence/printful-relevant-products-20261108.json` belegt 45 relevante Printful-Modelle, 45/45 gefunden, 0 eingestellt und Techniken vorhanden. Sie belegt **keine** Shopify-Variantenzuordnung und macht deshalb allein kein Modell `mockupEligible`. Das Manifest darf nur aus frisch gegengeprüften Shopify-/Printful-Zuordnungen gebaut werden. Ein Katalogmodell allein beweist weder Kaufbarkeit noch die richtige Shopify-Variante.

Der gezielte Shopify-Snapshot umfasst 41 Selbstgestalten-Produkte (39 per Tag plus 2 aktive ohne Tag). Der Relay akzeptiert davon ausschliesslich `provider: "printful"`. Das Bügeltransfer-Produkt von Mister DTF bleibt damit gesperrt. Die transparente iPhone-Hülle bleibt gesperrt, bis ihre exakte Shopify-/Printful-Varianten- und Druckflächenzuordnung positiv in der Allowlist steht.

## Persistenzvertrag

Printfuls `mockup_url` ist temporär. Die Messung vom 05.11. zeigte ungefähr 75 Stunden; die Dokumentation nennt widersprüchlich 24 beziehungsweise 72 Stunden. Der Relay erfindet deshalb kein Ablaufdatum und meldet `sourceExpiresAt: "unknown"`.

Der produktive Host muss `persistPreview({requestId, preview})` injizieren und jede Quelle sofort in einen kontrollierten dauerhaften Speicher kopieren. Erst wenn der Adapter dauerhafte Adressen von einem erlaubten Zielhost zurückgibt, lautet der Zustand `completed`; Voreinstellung ist `cdn.shopify.com`. Ohne Adapter bleibt er `completed-temporary`, `persistenceRequired: true` und `checkoutReady: false`. Das Speichern eines Vorschaubilds beweist weder Druckdateiqualität noch Bestellfähigkeit.

Der mitgelieferte `MemoryCheckpointStore` und `WindowLimiter` sind ausschliesslich Offline-Testdoubles. Produktion braucht atomare, dauerhafte Checkpoints und verteilte Limits über Neustarts und mehrere Instanzen hinweg. Unklare Create-/Poll-Ausgänge bleiben `unknown`; eine manuelle Gegenprüfung darf den gespeicherten Zustand ergänzen, aber nie einen zweiten POST auf Verdacht auslösen.

## Test

```sh
node --test dropship/printful-edm-r137/mockup-relay/mockup-relay.test.mjs
```

Geprüft werden Resolver-Allowlist, Markenhandles, Store-ID, Upload-Quittung/SHA-256, feste Endpoints, Token-Trennung, URL-/Geometrieprüfung, Herkunft, POST-/GET-Drosselung, Design-Deduplizierung, Gesamtfrist, unklare Ausgänge, temporäre Resultate und Persistenzadapter. Alle Antworten tragen `checkoutReady: false`; der Entwurf löst keine Bestellung aus.

Quellen: [Printful Mockup Generator API](https://developers.printful.com/docs/#tag/Mockup-Generator-API) und `dropship/selbst-gestalten-fertig-0511/untersuchung/bericht-mockup-vorschau.md`.
