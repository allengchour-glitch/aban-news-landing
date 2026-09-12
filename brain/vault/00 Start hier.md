---
tags: [moc, erzeugt]
---
# Start hier

Zweites Gehirn dieses Repos. Atomare Notizen, ueber `[[Wikilinks]]` verbunden.
Die grossen Dateien `CLAUDE.md` und `SHARED-MEMORY.md` bleiben die Historie —
dieser Vault ist der Zugriff darauf.

```bash
python3 tools/gedaechtnis.py "stichwort"   # Fakten mit Datum und Quelle
python3 tools/gedaechtnis.py --sackgassen  # was nachweislich nicht funktioniert
python3 tools/gedaechtnis.py --offen       # was nur der User klicken kann
python3 tools/vault.py bauen               # diese Datei neu bauen, Links pruefen
```

**Diese Datei wird erzeugt** (`tools/vault.py bauen`) — nicht von Hand bearbeiten.

## 🏗️ Systeme — die fuenf aus dem Video

- [[00-Die-fuenf-Systeme]] — Quelle: TikTok-Video von @herr_tech („Mr. Tech"), 98 Sekunden,
- [[Angebots-Agent]] — Das Video: „Anfrage rein, eingeordnet, Angebot vorbereitet — und es liegt als Entwurf bei
- [[Claude-Skills]] — Das Video nennt es ausdrücklich die „absolute Königsdisziplin":
- [[Content-Maschine]] — Das Video: Claude scannt jeden Morgen, welche viralen Beiträge gerade funktionieren, baut …
- [[Lead-Maschine]] — Das Video: „Wer kommentiert, bekommt automatisch eine Nachricht. Wer passt, bekommt einen
- [[Selbst-besser-werden]] — Das Versprechen aus dem Video: „Du baust sie einmal. Danach werden sie jeden Tag besser, a…
- [[Zweites-Gehirn]] — Das Video: „In Obsidian speicherst du alles, was für dich wichtig ist — Projekte, Meetings…

## 🕳️ Fallen — teuer gelernt, gelten weiter

- [[Actions-Sperre-gilt-nicht-mehr-fuer-push-und-pull-request]] — Das Gedaechtnis sagt seit 2026-06-13 in Grossbuchstaben: „GITHUB ACTIONS IST ACCOUNT-WEIT
- [[Background-image-Falle]] — Einen Verlauf in background-image durch eine Farbe zu ersetzen erzeugt eine ungültige
- [[Bild-Falle]] — CJ-Bild-URLs unter quick/product/… sind teilweise 404. Jede URL vor dem Anlegen per
- [[Collections-Publish-Falle]] — Per collectionCreate angelegte Collections sind nicht automatisch im Onlineshop publiziert…
- [[Diff-Falle]] — Ein Muster mit einfachem Bindestrich machte aus
- [[Generator-Vorlagen-Falle]] — Beim Entfernen des Assistenten gab es drei Einbau-Orte, nicht einen: die HTML-Seiten,
- [[Hypothese-mit-Datum]] — Der teuerste Fehler der Projektgeschichte war eine als Tatsache notierte Decke:
- [[Kennzahl-zaehlt-Absicht]] — Zwei Beispiele aus derselben Runde:
- [[Messgeraet-Gegenprobe]] — fehlerfrei aus. Die eingebaute Gegenprobe — eine künstlich halbtransparente Leiste muss
- [[Publish-Falle]] — Produkt-IDs zum Publizieren immer aus der Antwort von create-product nehmen, nie raten und
- [[Sechs-Publications]] — Jedes Produkt und jede Collection gehört in alle sechs Kanäle. Erwartet wird danach
- [[Selbsttests-finden-Fehler-im-Werkzeug-selbst]] — Beim Bau der vier Gedaechtnis-Werkzeuge fanden die eingebauten Gegenproben zwei echte Fehl…
- [[Stale-Ref-Falle]] — aktualisiert: origin/main zeigte auf einen Monate alten Commit. Ein darauf gebauter Branch
- [[Tag-Regel-Falle]] — Smart-Collections filtern über Tags, und die Regel ist nicht der Collection-Name.
- [[Workflow-Name-Doppelpunkt]] — Ein name: mit Doppelpunkt im Wert bricht den YAML-Trigger eines GitHub-Workflows — die Fol…

## ⛔ Sackgassen — nicht erneut versuchen

- [[ABAN-Files-YouTube]] — Gemessen: rund 2–3 Aufrufe pro Tag über alle 22 Videos, Top 250 eingefroren, 19 von 22 Vid…
- [[Archiv-Bulk-Loeschung]] — Der Archiv-Backlog (rund 4381 Produkte, nicht kundenseitig sichtbar) lässt sich nicht per
- [[CJ-AliExpress-Quell-ID]] — CJ liefert keine AliExpress-Quell-ID. sourceFrom ist nur ein Zahlen-Flag, das Wort
- [[Fake-Reviews]] — Harte Regel, mehrfach im Gedächtnis wiederholt:
- [[Masse-ist-kein-Hebel]] — LuxeStyle über 30 Tage, aus Shopify-Analytics:

## 🟡 Blockiert — wartet auf den User

- [[Actions-Sperre]] — Grund war Fair-Use: 158 Workflows, rund 60 Crons. Die Sperre ist eine Folge der
- [[Drei-User-Klicks]] — Nach Masse-ist-kein-Hebel sind das die einzigen verbleibenden echten Hebel am Shop — und
- [[GitHub-Spam-Markierung]] — GitHubs eigene Meldung aus der Search-API: Validation Failed: User flagged as spammy.
- [[GitLab-Ersatz]] — Weil Actions-Sperre gilt, laufen alle Automationen auf GitLab-CI, Projekt aban-ci
- [[Live-Deploy]] — Seit 29.08.2026 ~03:00 UTC. abannews.com zeigt den Stand von Commit 9394a0e. Alles danach
- [[Vier-Crons-sind-wieder-aktiv-trotz-Nulldiaet]] — Das Gedaechtnis sagt seit 2026-06-13 (Cron-Nulldiaet, PR #828): „ALLE ~60 schedule:-Blöcke

## 📦 Projekte

- [[Conversion-Leak-Sommerkleid]] — „Sommerkleid ärmellos · Schwarz" stand mit 3,54★ aus 26 Reviews auf der Ad-Landingpage
- [[Erste-Verkaeufe]] — Live verifiziert per Order-Audit. Nach Monaten mit 0 Käufen ist das der erste echte Beleg,…
- [[Google-Merchant]] — Konto LuxeStyle CH (5797470070). Google hat über die native Shopify-Integration den ganzen
- [[LuxeStyle]] — Mode- und Lifestyle-Dropshipping-Shop. luxestyle.ch, Backend au3j0y-hq.myshopify.com,
- [[Reviews-Importer]] — 518 von 529 cj-real-Produkten (98 %) haben keine Sterne und keine Reviews (gemessen vom
- [[Traumhaus]] — Browser-Spiel traumhaus.html, Drei-D über Three.js. Eigene Session-Familie mit eigenem Run…
- [[abannews]] — Die Webseite im Wurzelverzeichnis dieses Repos: 1133 HTML-Seiten, Schweizer KMU-Werkzeuge,

## 🗓️ Stand

- [[Zeitleiste]] — alle Stand-Bloecke aus `CLAUDE.md`
