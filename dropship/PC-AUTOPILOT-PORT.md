# 🤖 PC-AUTOPILOT «PER PORT» — Master-Runbook (User-Auftrag 2026-07-08: «volle Automation ohne mich»)

> Für PC-Claude (Brave, Port 9222, überall eingeloggt). ALLE Aufgaben hier sind freigegeben und
> ohne User auszuführen — MIT diesen eisernen Grenzen:
> ⛔ NIE Zahlungs-/Abrechnungsdaten eingeben · ⛔ NIE Logins/2FA machen (bist ja eingeloggt) ·
> ⛔ NIE etwas löschen mit >500 Views · ⛔ NIE auf Threads posten · ⛔ NIE Secrets in Repo-Dateien.
> Nach JEDER Aufgabe: Ergebnis in dropship/PC-CLAUDE-INBOX.md §RAPPORTE, committen (pc-claude/reports), pushen.

## Reihenfolge (wichtigste zuerst)

### 1. 📌 Pinterest komplett (Skript liegt bereit)
`npm install playwright-core` (einmalig) → `node automation/local/pinterest-setup-browser.mjs`
Macht: Shopify-Katalog-Wizard + 8 Boards + 5 Start-Pins. Folgetage: `SKIP_SHOPIFY=1 SKIP_BOARDS=1 MAX_PINS=5 node …` bis alle 20 Pins draussen.
Scheitert das Skript irgendwo → denselben Schritt manuell im Browser machen (du siehst ja die Seite).

### 2. 🎵 TikTok-Sandbox scharf schalten (2 Minuten, entsperrt die ganze TikTok-API!)
developers.tiktok.com → Manage apps → App mit Sandbox (Client-Key beginnt `sbawj4…`) →
Sandbox-Einstellungen → **Target Users** → TikTok-Konto **@luxestyle.ch** hinzufügen →
den ROTEN Knopf **«Apply changes»** klicken (wurde letztes Mal vergessen!).
Danach DIESEN Login-Link im selben Browser öffnen (mit @luxestyle.ch eingeloggt) und autorisieren:
https://www.tiktok.com/v2/auth/authorize/?client_key=sbawj4f9wzoow1cy1p&response_type=code&scope=user.info.basic%2Cvideo.upload%2Cvideo.publish&redirect_uri=https%3A%2F%2Fluxestyle.ch%2Fpages%2Ftiktok-callback&state=pdskigwhVPM&code_challenge=3152ffb76420006dec35f15fcc080657b453b1a256935ffcfccd48152c57458c&code_challenge_method=S256
Nach dem Redirect auf luxestyle.ch/pages/tiktok-callback die VOLLSTÄNDIGE Adresszeile
(mit ?code=…) in den Rapport-Block schreiben — der Code ist ohne den Cloud-Verifier wertlos,
darf also ins Repo. Die Cloud-Session tauscht ihn dann gegen das Token.

### 3. 🛒 Google Merchant Center: Zielländer fixen (löst «Checkout URL not live», 223 Produkte)
merchants.google.com (Konto LuxeStyle CH 5797470070) → Einstellungen → Zielländer/Versand →
**United States und Deutschland als Zielland ENTFERNEN** (nur Schweiz behalten).
Die Warnung «checkout URL is not yet live» verschwindet damit. Nichts kaufen/buchen.

### 4. 📧 Klaviyo neu verbinden (Sync zeigt 0 Orders trotz Verkäufen)
Shopify-Admin → Apps → Klaviyo → falls «Reconnect/Neu verbinden» angeboten: durchklicken
(OAuth-Consent bestätigen ist ok — KEINE neuen Konten, KEINE Zahlungen). Danach in Klaviyo
prüfen, ob Orders #1004/#1005 jetzt auftauchen. Wenn kein Reconnect-Knopf: Befund rapportieren.

### 5. ⏱️ WELCOME10-Popup: Verzögerung 15–20 s (Gemini-Kritik #1)
Shopify-Admin → Apps → Forms → das WELCOME10-Popup → Verhalten/Trigger →
Anzeige-Verzögerung auf 15–20 Sekunden (oder «beim Verlassen») stellen. Speichern.

### 6. 📦 Printful #1005 Tracking prüfen
printful.com/de/dashboard → Bestellung 165452870 → wenn versandt: Trackingnummer + Carrier
in den Rapport. (Shopify-Fulfillment macht die Cloud dann per API.)

### 7. 📌 Pinterest-Trial nachfassen (pending seit ~1 Woche)
developers.pinterest.com → App «LuxeStyle.ch» (1585205): prüfen ob Pflichtfelder leer sind
(Website, App-Beschreibung, Firmen-Info) → ausfüllen falls ja (Website luxestyle.ch).
Falls es einen «Contact/Support/Appeal»-Weg gibt: höfliche EN-Nachfrage senden (Shop-URL nennen,
Use-Case «organic pin publishing for our own shop»). Die abgelehnte App 1580519 NICHT anfassen.

### 8. 🔁 Dauerbetrieb
Dieses Repo alle paar Stunden pullen; INBOX-Aufträge + Dauerauftrag (TikTok-Posting Di+Fr,
Kommentare, Story) abarbeiten. Rapporte nicht vergessen — die Cloud liest sie im Morgenreport.

### 3b. 🔍 GOOGLE KOMPLETT-SETUP (Detail zu Aufgabe 3, User 2026-07-08 «auch google sache»)
**A) Merchant Center aufräumen** (merchants.google.com, Konto LuxeStyle CH 5797470070):
1. Zahnrad (Einstellungen) → **«Versand und Rücksendungen»** → alle Versandprofile/Einträge
   für **USA** und **Deutschland** LÖSCHEN (nur Schweiz behalten).
2. Falls unter Einstellungen → «Zielländer/Märkte» USA/DE als Ziel gelistet: entfernen.
   → Damit verschwinden «Checkout URL is not yet live» (223 Produkte/US) + die DE-Versand-Warnung.
3. NICHTS bei «Show products in more countries» klicken (Growth-Karten ignorieren — CH-Fokus).
4. Kontrolle: Produkte-Tab → nach Land filtern → nur noch CH-Einträge.
**B) Google Search Console einrichten** (kostenlos, SEO-Radar):
1. search.google.com/search-console → Property-Typ **«URL-Präfix»** → `https://luxestyle.ch`
2. Verifizierungsmethode **«HTML-Tag»** wählen → den `<meta name="google-site-verification" content="…">`
   -Inhalt (nur den content-Wert) in den Rapport-Block schreiben.
3. Cloud-Session baut das Tag dann per API ins Theme ein → danach in der Search Console
   auf «Bestätigen» klicken und Sitemap `https://luxestyle.ch/sitemap.xml` einreichen.
**C) NICHT anfassen:** Google Ads / Budgets / Zahlungsdaten (erst nach UID + bewusstem Entscheid).
