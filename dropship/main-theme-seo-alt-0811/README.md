# Enger MAIN-Theme-Fix: Startseiten-Meta und Produktbild-Alttexte

Stand 08.11.2026. Dieses Paket ist ein geprüfter Repo-Entwurf. Es wurde weder ausgeführt noch veröffentlicht.

## Frisch bestätigter Ausgangsstand

- Shop: `luxestyle.ch`, Shopify-Domain `au3j0y-hq.myshopify.com`, Währung CHF.
- MAIN: `gid://shopify/OnlineStoreTheme/213013037447`, `LuxeStyle – Schrift und Banner 02.11.2026`.
- `snippets/meta-tags.liquid`: MD5 `de2a6f9cf9200f49fe65ad6ca42f1643`.
- `sections/luxe-edit-home.liquid`: MD5 `ed6943c40b94dcf5c7e532685b17c9bc`.

Die vollständigen gelesenen Ausgangsdateien liegen unter `sicherung/`. Die Meta-Datei kam beim begrenzten Read direkt aus dem MAIN-Theme. Die Startseitendatei ist bytegleich mit dem bereits im Git-Verlauf vorhandenen Stand vor PR #2959.

## Befund zu bestehenden Wegen

- PR #2959 ist in `main` gemergt. Der Kandidat `dropship/startseite-wechsel-0411/theme/luxe-edit-home.liquid` hat MD5 `1ec32ba5c57c0db75165e49faedf180d`; live steht weiterhin der Vorgänger. Der bestehende Helper `dropship/startseite-wechsel-0411/apply_theme.mjs` kann diesen kleinen Folgediff nicht sicher anwenden: Er akzeptiert nur die älteren VOR-/V1-Hashes und würde zusätzlich zwei Rotations-Snippets anfassen.
- `dropship/startseite-2710/theme_schreiben.mjs` lehnt MAIN ausdrücklich ab und ist deshalb kein Weg für diesen Auftrag.
- Vorhandene GitHub-Workflows mit Shopify-Zugang sind jeweils an andere Einzelaufgaben gebunden. Ein vorhandener generischer Workflow für genau diese zwei Dateien existiert nicht.
- Der direkte Shopify-Connector blockiert MAIN-Dateiwrites. Diese Sperre wurde nicht umgangen und kein Mutationstool aufgerufen.

## Exakter Diff

`patch.mjs` akzeptiert ausschliesslich die beiden oben genannten Dateien und nur die dokumentierten Ausgangs-MD5.

1. Die Startseitenbeschreibung wird bei `request.locale.iso_code == 'fr'` französisch gesetzt. Alle anderen aktiven Sprachpfade behalten einen kurzen deutschen Text ohne unbelegte Lieferzeit.
2. Genau drei dynamische Bildbausteine erhalten den tatsächlichen Produkttitel als Alttext: Trends, Schmuck/Wohnen und weitere Produkte. Dekorative Bilder bleiben unverändert.

Erwartete Zielwerte:

- `snippets/meta-tags.liquid`: MD5 `00c5408ac77fd0bc6c4b1528a3b8aa2b`.
- `sections/luxe-edit-home.liquid`: MD5 `1ec32ba5c57c0db75165e49faedf180d`.

`locales/de.json` und `sections/footer-group.json` werden bewusst nicht geschrieben. Die aktuell bestätigten Markt-Overrides liefern bereits «Startseite» und den korrigierten französischen Footer. Sie sind für diese zwei Fehler nicht erforderlich.

## Kontrollierter Offline-Plan

Der Workflow `.github/workflows/luxestyle-main-theme-seo-alt.yml` läuft ausschliesslich bei Pull Requests und führt nur Offline-Tests aus:

- `plan.mjs` verarbeitet nur die beiden gesicherten Ausgangsdateien, prüft ihre Hashes und erzeugt lokale Vorher-/Nachher-Dateien und `plan.json`.
- Der Plan hält die am 08.11.2026 gelesene Shop-/Theme-Identität als Beleg fest, liest sie aber nicht erneut live. Historische Identität ist kein aktueller Write-Nachweis.
- Weder Skript noch Workflow enthalten Netzwerkzugang, Shopify-Secrets, GraphQL-Mutationen, manuellen Dispatch oder Apply-Option.

Die Offline-Prüfung wurde ausgeführt. Kein Workflow wurde gestartet; der Live-Shop blieb unverändert.

## Offenes Preview-Gate vor jeder späteren Umsetzung

R144 verlangt vor einem MAIN-Write eine Prüfung gegen eine unveröffentlichte Theme-Kopie. Dieser Nachweis fehlt weiterhin. Deshalb enthält dieser Draft-PR bewusst keinen ausführbaren MAIN-Apply-Weg. Vor einem späteren separaten Umsetzungs-PR müssen mindestens belegt sein:

- Liquid rendert ohne Fehler.
- Deutsches und französisches HTML enthalten die jeweils richtige Startseitenbeschreibung.
- Canonical und Titel bleiben unverändert.
- Die dynamischen Produktbilder tragen die jeweiligen sichtbaren Produkttitel; dekorative Bilder dürfen leere Alttexte behalten.
- Desktop und Mobil zeigen keine Layout- oder Liquid-Fehler.

Erst danach darf ein eigener, erneut geprüfter MAIN-Write-Weg entworfen werden. Ein Upsert auf MAIN wäre unmittelbar live, auch ohne separate Theme-Publish-Mutation.

## Prüfung nach einer späteren, separat freigegebenen Umsetzung

Nach einem bestätigten Write müssen beide Dateien frisch mit den Ziel-MD5 zurückgelesen werden. Danach öffentlich prüfen:

- `/` hat die deutsche Beschreibung und `/fr` die französische Beschreibung.
- Canonical und Titel bleiben unverändert.
- Die 25 dynamischen Startseiten-Produktbilder tragen den jeweiligen sichtbaren Produkttitel; dekorative Bilder dürfen weiterhin leere Alttexte haben.
- Desktop und Mobil zeigen keine Liquid-Fehler.

Ein Merge oder grüner Test ist noch kein Live-Beleg.
