# Gesicherter v6.3.1-Rollout

Die Bau- und Prüfschritte in diesem Verzeichnis arbeiten rein lokal. Das
separate Werkzeug `apply_theme.mjs` kann erst nach den unten beschriebenen
Schranken ein Shopify-Theme ändern; in diesem Lauf wurde es nicht live
ausgeführt. Printful-Schreibzugriffe gibt es nicht. Der offizielle Printful-Editor blieb beim
geprüften Zugriff mit HTTP 403 beziehungsweise Enterprise-Sperre unzugänglich;
dieser Rollout verwendet deshalb ausschliesslich die nachprüfbaren Katalog- und
Shop-Zuordnungen im Repository.

## Belegte Quellen

- Shopify-/Printful-Manifest: `source/product-manifest-r137.json`
- Printful-Kataloglauf: GitHub-Actions-Lauf `42475585326`, Commit `68975230b`
- Katalog: 22 von 22 erwarteten Modelldateien; `katalog_fehler.json` enthält `[]`
- Karten-/Vorschau-Audit: `source/audit/rollout-report.json`
- Editor-SHA-256: wird beim Allowlist-Bau frisch aus
  `pod/v6/lspod-designer-v6-6.3.1.js` berechnet. Die bestehende Datei
  `lspod-designer-v6-6.3.0.js` bleibt für bereits veröffentlichte SRI-Tags
  bytegleich erhalten.

Der Scope enthält 18 ACTIVE-Printful-Produkte und exakt 244 Shopify-Varianten:

| Zustand | Produkte | Varianten | Wirkung |
| --- | ---: | ---: | --- |
| `ready-preview` | 9 | 73 | Exakte Karte und belegte proportionale Produktvorschau |
| `ready-binding` | 7 | 167 | Exakte Karte/Druckfläche, keine behauptete Produktprojektion |
| `blocked` | 2 | 4 | Ungültige Blockerkarte; der Pflichtkarten-Gate lässt keinen Editor-/Warenkorbpfad zu |

Die Dad-Cap bleibt wegen ungeprüfter Stickoptionen und fehlender belegter
kostenloser Nicht-Etiketten-Fläche blockiert. Der Magnet bleibt wegen
unbekannter EU-Verfügbarkeit blockiert. Das aktive Mister-DTF-Produkt
`buegeltransfer-selbst-gestalten` ist als Nicht-Printful-Fulfillment vollständig
ausgeschlossen.

Für Modell 656 fehlen EU-Statuswerte bei drei Shopvarianten. Bei Modell 71 fehlt
der EU-Status für Printful-Variante 12872. Diese Werte bleiben `unknown`; daraus
wird keine Lieferzusage abgeleitet.

## Deterministischer Bau

Modell 84 ist ein CUT-SEW/PANEL-Produkt. Allowlist und Kartenbau brechen ohne
den ausdrücklichen Schalter `--panel=84` ab. Der Kartenbau prüft zusätzlich die
Geometrie und jede verkaufte Variante gegen den frischen Modellkatalog.

```sh
node dropship/selbst-gestalten-fertig-0511/rollout-v63/allowlist_bauen.mjs --panel=84
node dropship/selbst-gestalten-fertig-0511/rollout-v63/allowlist_bauen.mjs --panel=84 --check
node dropship/selbst-gestalten-fertig-0511/rollout-v63/build.mjs --panel=84
node dropship/selbst-gestalten-fertig-0511/rollout-v63/build.mjs --panel=84 --check
node dropship/selbst-gestalten-fertig-0511/rollout-v63/build_test.mjs
```

Der kanonische Output liegt unter `pod/v6/maps/`: 18 Karten (davon zwei
Blockerkarten) und neun Vorschauen. Die zweivariantige Tasse enthält nur die
verkauften Printful-Varianten 1320 und 4830; Gruppe, Geometrie und Druckdatei
426 der nicht verkauften Variante 16586 sind entfernt und die Gruppenindices
sind neu zugeordnet.

`_headers` gibt `/pod/v6/*` einschliesslich Editor-Script und Karten mit CORS
und `Cross-Origin-Resource-Policy: cross-origin` frei. Die Allowlist bindet jede der
244 Shopify-Varianten exakt an Printful-Modell und -Variante. Kostenpflichtige
Flächen und Etiketten werden beim Kartenbau verworfen.

## Theme-Anwendung

`apply_theme.mjs` läuft standardmässig im Trockenlauf. Es verlangt ein explizit
benanntes Theme, liest Shopidentität, ACTIVE-Status, Handles und den vollständigen
Variantensatz sowie exakt einen echten `lspod-designer`-Container pro Produkt
frisch zurück, erzeugt eine lokale Sicherung und zeigt den exakten Diff. MAIN,
fehlendes `--panel=84`, veraltete Basis-MD5, unvollständige Rücklese und fremd
veränderte Rollback-Ziele brechen fail-closed ab. Die Produktidentität wird
direkt vor der Aktivierung des Layouts nochmals geprüft.

```sh
# Trockenlauf auf einem ausdrücklich benannten, unveröffentlichten Theme
THEME_ID=<id> node dropship/selbst-gestalten-fertig-0511/rollout-v63/apply_theme.mjs --panel=84

# Eine Live-Anwendung verlangt zusätzlich LIVE=1 und die frische BASIS_MD5 aus
# genau diesem Trockenlauf. Dieser Befehl wurde in diesem Lauf nicht ausgeführt.
THEME_ID=<id> BASIS_MD5=<md5> LIVE=1 node dropship/selbst-gestalten-fertig-0511/rollout-v63/apply_theme.mjs --panel=84
```
