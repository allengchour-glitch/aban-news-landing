# Schnittform bei Kiss-Cut-Aufkleber und Magnet erklärt (11.11.2026)

## Anlass

Ein Prüfer der Magnet-Freischaltung fand: weder Editor noch Produkttext sagen, wie die Schnittform entsteht. Der Editor
schreibt die Druckdatei als PNG ohne Hintergrund; wer ein Foto nicht freistellt, bekommt eine andere Form als erwartet.

## Messung (GEMESSEN 11.11.2026 13:02 und 13:1x UTC, `probe.mjs`, Printful-Mockup-Generator, kein Auftrag, keine Kosten)

Je zwei Aufgaben: eine Datei mit durchsichtigem Hintergrund (Text «Test Entwurf», Druckdatei aus einem Editor-Test bei
Cloudinary) und ein deckendes Foto (Produktbild aus dem Shop-CDN).

| Modell | Variante | durchsichtig | deckend | Bild |
|---|---|---|---|---|
| 656 Die-Cut-Magnet | 16367 (10 cm) | eng um das Motiv, schmaler weisser Rand | Quadrat mit runden Ecken, weisser Rand | `beleg-magnet-656.png` |
| 358 Kiss-Cut-Aufkleber | 10164 (10 cm) | gleich | gleich | `beleg-kisscut-358.png` |

Belegt ist Printfuls eigene Vorschau, kein echter Schnitt. Printfuls Hilfeseiten nennen die Regel nicht (gesucht); die
Hilfe von Fourthwall beschreibt dasselbe. Probe: `MODELL=358 VARIANTE=10164 node probe.mjs` (braucht `PRINTFUL_API_KEY`).
Wikimedia-Bilder kann Printful nicht laden; Bilder aus dem Shop-CDN und von Cloudinary gehen.

## Text

Neuer Aufzählungspunkt direkt nach dem Punkt zum Konturschnitt:

> Die Form folgt dem Rand deines Motivs, mit einem schmalen weissen Rand. Durchsichtige Flächen fallen weg; ein Foto mit
> Hintergrund wird zum Quadrat mit runden Ecken (mit «Freistellen» entfernst du den Hintergrund). Prüfe die Form in der
> Ansicht «Druckversion» (Karos = durchsichtig).

`apply.mjs` setzt ihn nur, wenn der Anker genau einmal vorkommt, und prüft, dass ausser dem Einschub alles bytegleich
bleibt (Editor-Baustein unberührt). Trockenlauf ist Vorgabe.

- **Kiss-Cut `kiss-cut-aufkleber-selbst-gestalten`: LIVE 11.11.2026**, Rücklesen gleich Soll, Seite HTTP 200 mit dem Satz
  und dem Editor-Baustein. Sicherung `sicherung_kiss-cut-aufkleber-selbst-gestalten.json`.
- **Magnet `magnet-zum-selbstgestalten`: erst nach dem Apply der Freischaltung** (Rollout-README Schritt «Offen vor dem
  Apply»), damit Plan und Apply dieselbe Beschreibung sehen: `HANDLE=magnet-zum-selbstgestalten LIVE=1 node dropship/konturschnitt-1111/apply.mjs`.

Rücknahme: `ZURUECK=1 LIVE=1 [HANDLE=…] node dropship/konturschnitt-1111/apply.mjs` (schreibt die Sicherung zurück; nur,
solange seither niemand die Beschreibung geändert hat: vorher lesen). Folge für Rollbacks des Editor-Rollouts 6.4.0: deren
Hash-Schutz sieht beim Kiss-Cut eine geänderte Beschreibung und verweigert; ein neuer Rollout-Plan liest frisch und ist
nicht betroffen.

## Ungemessen

Ein echter Schnitt (kein Muster bestellt), sehr feine oder getrennte Motivteile, die Breite des weissen Randes in mm.
