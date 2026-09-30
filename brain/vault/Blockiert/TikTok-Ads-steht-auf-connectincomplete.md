---
tags: [blockiert, nur-user]
quelle: Session
gelernt: 2026-09-27
---
# TikTok Ads steht auf connect_incomplete

GEMESSEN 2026-09-27 ueber ListConnectors: das Konto hat vier Konnektoren - Google Drive (verbunden), Shopify (verbunden), Google Calendar (nicht verbunden) und TikTok Ads mit installState connect_incomplete, also angefangen und nicht fertig verbunden. Das Gedaechtnis fuehrt 'TikTok-Pixel + Conversion-Kampagne' seit dem 13.06. als einen der drei User-Klicks. Ob das dieselbe Baustelle ist, ist NICHT geprueft - aber nachsehen lohnt, weil dort echtes Werbegeld haengt. Nur der User kann eine Konnektor-Verbindung abschliessen.

Verwandt: [[Hypothese-mit-Datum]]

## Nachtrag 2026-10-01 (GEMESSEN)
Betreiber verband den Konnektor am 30.09. (ListConnectors: connected). In der neuen Session: `auth_advertiser_get` = leere Liste,
`bc_get` = 0 Business Center, `user_info_get` = «Luxestylech329» (core_user_id 7654698230689793044, angelegt ~23.06.2026),
`campaign_get` auf das bekannte Werbekonto 7646349875793182738 = Code 40001 «No permission to operate advertiser».
Verbunden ist also ein TikTok-for-Business-Login OHNE Zugriff auf «LuxeStyle CH Ads» (BC 7640770639476817938).
Weg: Konnektor trennen und mit dem BC-Admin-Login neu verbinden und im Zustimmungsschritt das Werbekonto ankreuzen —
oder im Business Center den Nutzer Luxestylech329 als Mitglied mit Zugriff auf das Werbekonto hinzufügen.
