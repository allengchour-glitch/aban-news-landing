---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-30
---
# Shopify Flow ist seit jeher installiert und stand in keinem Stand-Block

GEMESSEN 30.09.2026 ueber appInstallations an LuxeStyle: die App {title: Flow, handle: flow, developerName: Shopify} ist installiert. Tarif Basic, Waehrung CHF. KEIN Stand-Block seit Juni erwaehnt sie. Stattdessen steht dort vier Monate lang die Klage, Automatisierung sei hier nicht moeglich - erst 'GitHub Actions gesperrt', dann 'Scheduler nicht aktiv', dann 'es fehlen die drei Env-Werte'. Flow laeuft IM SHOP: ohne Container, ohne Sitzung, ohne Token, ohne Cron, kostenlos. Genau die Luecke, um die das Gedaechtnis herumgeschrieben hat. ⚠️ GEMESSEN ist auch die Grenze: von ueber 400 Mutationen der Admin-API heissen genau zwei nach Flow, flowGenerateSignature und flowTriggerReceive - es gibt KEINE Mutation, die einen Workflow anlegt. Workflows entstehen nur in der Oberflaeche, also ein einmaliger User-Klick. Interessant bleibt flowTriggerReceive: baut der User einen Workflow mit eigenem Ausloeser, kann ich diesen von hier feuern - einmal klicken, dauerhaft fernsteuerbar. Voller Bericht dropship/LERNEN-AUTOMATION-2026-09-30.md

Verwandt: [[Hypothese-mit-Datum]]
