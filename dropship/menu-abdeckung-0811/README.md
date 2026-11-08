# Menü-Abdeckung LuxeStyle, 08.11.2026

`manifest-20261108.json` ist eine rein lesende Live-Messung von `luxestyle.ch`.
Sie entstand mit:

```sh
NODE_USE_ENV_PROXY=1 LIVE_READ=1 node automation/lib/luxestyle_menu_abdeckung.mjs > manifest.json
```

`NODE_USE_ENV_PROXY=1` ist nur in Laufzeiten mit einem HTTP-Proxy nötig. Das
Werkzeug ruft ohne `LIVE_READ=1` kein Netz auf. Es enthält keine Mutation und
ändert weder Shopify, Theme noch Navigation.
Exitcode 2 bedeutet bewusst «Cap gesperrt» und ist bei diesem Manifest das
erwartete Ergebnis.

## Belegter Stand

- 86 Gruppen-Knoten, 84 eindeutige Gruppen-URLs, 520 Kind-Kanten und 514
  eindeutige Kind-URLs wurden im aktuellen Header gefunden.
- Alle 84 Gruppen-Landingpages antworteten HTTP 200 ohne Redirect und hatten
  das erwartete Canonical.
- Im eigentlichen `<main>` verlinken 13 Gruppenpages alle eigenen Kinder, acht
  nur einen Teil und 63 keines. 397 von 520 Kanten fehlen dort.
- 20 dauerhafte Alternativseiten wurden zusätzlich geprüft: 19 Top-Level-Ziele
  aus «Alles in …» plus `/pages/alle-kategorien`. Alle 20 waren sicher lesbar;
  zusammen decken sie 43 der 514 Kind-URLs ab.
- Ein Cap von sechs würde 84 Kanten beziehungsweise 83 eindeutige URLs
  verstecken. 44 davon haben weder eine verbleibende Navigation noch einen
  belegten Link im Gruppen- oder Alternativseiten-`<main>`.
- Im Mobile Drawer ist für keinen der 86 Gruppen-Knoten ein explizit markierter
  «Alle in …»-Link vorhanden. Die Erhaltung von `active/current` ist ohne
  unveröffentlichten Theme-Entwurf unbekannt.

Darum ist `cap6.freigegeben` bewusst `false`. HTTP 429, 5xx, Netzfehler,
fehlendes `<main>`, Redirects oder falsche Canonicals werden als unbekannt oder
Fehler geführt und nie als Null-Abdeckung oder Freigabe gewertet.

## Nächster sicherer Schritt

Zuerst im unveröffentlichten Theme je Mobile-Gruppe einen direkten Link auf die
bestehende Gruppen-Landingpage ergänzen, ohne Kindlinks zu entfernen. Danach
die 44 im Manifest genannten Cap-6-Lücken auf ihren Gruppen- oder dauerhaften
Alternativseiten schliessen und `active/current` mit Tastatur-, Mobil-,
Desktop- und No-JS-QA belegen. Erst dann darf ein Cap erneut geprüft werden.
