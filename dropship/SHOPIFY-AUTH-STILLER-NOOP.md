# 60 Automatisierungs-Skripte liefen ins Leere — stiller No-op statt Fehler

**Gemessen und behoben am 2026-10-17.** Wer an einem dieser Skripte arbeitet, sollte das hier kennen.

## Der Befund

Der Review-Importer meldete `Shopify-Auth fehlgeschlagen → No-op.` — ohne Grund. Nachgemessen:

```
SHOPIFY_CLIENT_SECRET  Länge 60   Form: shpss_<32 hex>=SHOPIFY_CLIENT_SECRET
```

Der Wert enthält **hinten den Variablennamen**. Das ist die Folge der am 04.10. notierten
vertauschten Env-Felder (Schlüssel im Namensfeld, Name im Wertfeld). Ein Shopify-Secret ist
**38 Zeichen** (`shpss_` + 32 Hex) — mit 60 antwortet der Client-Credentials-Grant mit **HTTP 400**.

**Die Breite des Schadens:** `grep` auf `process.env.SHOPIFY_CLIENT_SECRET` → **60 Skripte**
(57 mit direktem Zugriff, 2 per Destructuring, 1 Python). Alle holen ihren Admin-Token über den
Grant und haben keinen gültigen `SHOPIFY_ADMIN_TOKEN` als Rückfall. **Alle 60 konnten in dieser
Umgebung nichts tun** — und fast alle meldeten das als „keine Creds → No-op", also als Normalfall.

## Warum das so lange unbemerkt blieb

**Ein stummer Skip sieht aus wie „keine Daten".** Dieselbe Fehlerklasse wie schon zweimal zuvor:

| Fall | Symptom | Wahre Ursache |
|---|---|---|
| CJ-Auth 07.09. | „CJ hat keine Kommentare" | Feld `apiKey` statt `password` |
| Review-Resolver 04.10. | „keine CJ-pid → skip" bei 37 % des Katalogs | Ziffern-SKU **ist** die pid |
| **hier** | „keine Shopify-Creds → No-op" | Secret 60 statt 38 Zeichen (HTTP 400) |

Jedes Mal hat ein Fehler, der seine Ursache verschweigt, eine ganze Fähigkeit als „gibt es nicht"
erscheinen lassen. **Regel: ein Guard darf aussteigen, aber er muss den Grund nennen.**

## Der Fix

`automation/lib/shopify_secret.mjs` — `shopifyClientSecret()` schneidet das echte Geheimnis heraus,
wenn der Wert länger ist, als ein Shopify-Secret sein kann; bei einem sauberen 38-Zeichen-Wert
ändert es **nichts**. Damit ist es in beiden Umgebungen richtig (lokal **und** in GitHub Actions,
wo das Secret korrekt gesetzt ist). Alle 60 Stellen nutzen es jetzt.

Dazu: `cj_reviews_import.mjs` meldet beim Grant jetzt **HTTP-Status, Antworttext und die Länge des
Secrets** statt nur „No-op".

## Belege

- **Test** `automation/lib/shopify_secret_test.mjs` (8 Fälle, Gegenprobe in beide Richtungen):
  der kaputte Wert wird zurechtgeschnitten, ein **sauberes** Secret, ein `shpat_`-Token und der
  Platzhalter `keystring` bleiben **unverändert** — die Funktion darf echte Fehlkonfiguration nicht
  verschleiern.
- **Gegenprobe am echten Skript:** `SCAN=40 node automation/price_guard.mjs`
  - Stand vor dem Fix (aus `git show HEAD:…`): `no-op: kein Token.`
  - danach: `{"scanned": 40, "denyProducts": 0, …}`
- Syntaxprüfung aller 60 Dateien (`node --check` / `ast.parse`): grün. Für jede Datei geprüft:
  kein roher `process.env.SHOPIFY_CLIENT_SECRET` mehr, genau **ein** Import, und der Importpfad
  zeigt auf eine existierende Datei.

## Offen — nur der User kann es sauber lösen

Der eigentliche Schaden sitzt in der Umgebung: **Name und Wert sind in den Env-Einträgen vertauscht
angelegt.** Der Fix hier ist eine Schutzschicht, keine Heilung. Wird der Eintrag in der Umgebung
umgedreht (`SHOPIFY_CLIENT_SECRET` = `shpss_…`, 38 Zeichen), arbeitet alles unverändert weiter.
