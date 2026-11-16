# Lebenspfad-Figur: bestätigte Veröffentlichung

GEMESSEN: sechs relevante echte CI-Prüfungen am unten genannten Head grün. Hauptseitenlauf erfolgreich, vier Einrichtungs-/Secret-Schritte übersprungen.11/11 öffentliche Prüfungen mit normaler TLS-Verifikation bestanden. Kein öffentlicher Browser-/Internet-Koop-/physischer Handy-Nachweis.

```json
{
  "pr": 3218,
  "testedHead": "e8eea2ece1ba8a8592e1c38020abc0e832bb45e2",
  "mergeCommit": "e93f2930eb065583feb670bf1112d848befb4055",
  "deployRun": 43932279011,
  "deploy": "success",
  "setupStepsSkipped": [
    "Pages-Projekt anlegen (idempotent)",
    "Anthropic-Key ins Pages-Projekt schreiben (falls GitHub-Secret gesetzt)",
    "Etsy-Schlüssel ins Pages-Projekt schreiben (für /api/etsy-auth, falls gesetzt)",
    "Pinterest-App ins Pages-Projekt schreiben (für /api/pinterest-auth, falls gesetzt)"
  ],
  "normalTlsChecks": 11,
  "passed": true
}
```

Öffentlicher Quellenvergleich samt positiven und negativen Messkontrollen:

```json
{
  "releaseCommit": "e93f2930eb065583feb670bf1112d848befb4055",
  "sourceHead": "e8eea2ece1ba8a8592e1c38020abc0e832bb45e2",
  "builderSha256": "370f29431897c4903b2c566e440fd055272fbadc605f473b1d8e255317d3f19d",
  "controls": {
    "positive": true,
    "extraScriptRejected": true,
    "changedGameModuleRejected": true
  },
  "checks": [
    {
      "uri": "lebenspfad.html",
      "http": "200",
      "ok": true,
      "scriptsStylesExact": true,
      "headersExact": true
    },
    {
      "uri": "lebenspfad",
      "http": "200",
      "ok": true,
      "scriptsStylesExact": true,
      "headersExact": true
    },
    {
      "uri": "js/lebenspfad/atmosphere.js",
      "http": "200",
      "ok": true,
      "sha256": "554f3af1f405863bcd1977a57185461e1e4d6379f413b2fb3e7dc5dae10dd4de",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "js/lebenspfad/atmosphere.js?v=554f3af1f405",
      "http": "200",
      "ok": true,
      "sha256": "554f3af1f405863bcd1977a57185461e1e4d6379f413b2fb3e7dc5dae10dd4de",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "js/lebenspfad/world-sites.js",
      "http": "200",
      "ok": true,
      "sha256": "b4502c0fbe6fad66678c54011e37a3bf7e5969d823b8f66d3e1ca05b5f75655b",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "js/lebenspfad/world-sites.js?v=b4502c0fbe6f",
      "http": "200",
      "ok": true,
      "sha256": "b4502c0fbe6fad66678c54011e37a3bf7e5969d823b8f66d3e1ca05b5f75655b",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "js/lebenspfad/character-art.js",
      "http": "200",
      "ok": true,
      "sha256": "31fb0c059ce5f5c59a72ffc3983f885929e938262d43fc45e2446b0a0fb1b72b",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "js/lebenspfad/character-art.js?v=31fb0c059ce5",
      "http": "200",
      "ok": true,
      "sha256": "31fb0c059ce5f5c59a72ffc3983f885929e938262d43fc45e2446b0a0fb1b72b",
      "bytesExact": true,
      "mimeCorrect": true
    },
    {
      "uri": "models/lebenspfad-eigen/erinnerungsplatz.glb",
      "http": "200",
      "ok": true,
      "sha256": "81dd33961e78d0ddc464455b2c56754fef1b4b900980e9408e4119d339cf0b75",
      "bytesExact": true
    },
    {
      "uri": "models/lebenspfad-eigen/sternwarte.glb",
      "http": "200",
      "ok": true,
      "sha256": "ba95cb7870d3deaacae9b3038d86c12a2746e60aa747aae87622b56b759cda8e",
      "bytesExact": true
    },
    {
      "uri": "models/lebenspfad-eigen/willkommenstor.glb",
      "http": "200",
      "ok": true,
      "sha256": "cb7e650ef2e820077115ef9254ee5e3e13bd59db6a2f860fdb0d93abc4077a82",
      "bytesExact": true
    }
  ],
  "passed": true,
  "limits": "Normale TLS-Verifikation; bytegleiche Assets, tatsächlicher Seitenbau, Skripte/Styles/Sicherheitsheader. Kein öffentlicher Browser-/Internet-Koop-/Handy-FPS-Nachweis."
}
```
