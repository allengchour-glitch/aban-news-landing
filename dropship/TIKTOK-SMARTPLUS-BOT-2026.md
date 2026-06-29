# TikTok Smart+ Bot — Erkenntnisse (2026-06-29)

Pure-playwright Bot `automation/vps/smartplus-drive.mjs`, gesteuert via PC-Poller (`cmd-poll.ps1`,
Befehl `smartplus-dry` / `smartplus-go`). Gegen den lokalen Brave (Port 9222).

## ✅ GELÖST (teuer gelernt — nie wieder verlieren)
1. **WS-CONNECT-FIX (der grosse Blocker):** Brave MUSS mit **`--remote-allow-origins=*`** gestartet werden,
   sonst lehnt Chrome/Brave 111+ jede DevTools-WebSocket-Verbindung ab → `connectOverCDP Timeout` (HTTP /json
   geht, WS hängt). Verdrahtet in `CLOUD-AN.bat` + `cmd-poll.ps1` (Ensure-Brave) + der `smartplus-dry`-Befehl
   killt+startet Brave selbst mit dem Flag. **OHNE diesen Flag läuft KEIN CDP-Bot.**
2. **playwright-core** muss am PC installiert sein (`npm i playwright-core`) — sonst Crash beim Import. Auto-Install im Befehl.
3. **Lokal verbinden:** `chromium.connectOverCDP('http://127.0.0.1:9222')` (direkter HTTP-Endpoint), nicht die ws-URL.
4. **iframe:** Die Smart+-UI liegt im iframe **`shopify.bytegration.com/ad_creation`** (NICHT im Top-Admin-Frame).
   Bot wählt den Frame mit den meisten Controls (`bestFrame`). Top = admin.shopify.com (17 Btn), App = bytegration (11 Btn).
5. **Sicht:** Bot schreibt Klartext-Trace nach `reports/smartplus-trace.txt` (UTF-8) — unabhängig von Shopify-Auth.

## 🧩 FORM-STRUKTUR (single-page, im bytegration-iframe)
- Produkt-Typ-Buttons: `Einzelnes Produkt | Sammlung | Startseite` → „Sammlung" klicken (wird zu „Sammlung auswählen").
- Felder: `Aktivitätsname` (text), `Identität auswählen`, `Optimierungsereignis`, „Wähle bitte einen…", „Please select".
- Aktionen: `Verlassen | Als Entwurf speichern | Senden | Aktualisieren`. **„Senden" = Launch (echtes Geld).**

## ❌ NOCH OFFEN (Bot-Feintuning für volle Autonomie)
- **Sammlungs-Picker:** „Sammlung auswählen" öffnet ein Shopify-Overlay AUSSERHALB des App-iframes → bestFrame
  sieht den Inhalt nicht. TODO: nach Picker-Klick ALLE Frames + evtl. neue Pages (`br.contexts().pages()`) scannen,
  Suchfeld füllen mit „wasserfest", Treffer + Bestätigen klicken.
- **Dropdowns Identität/Optimierung:** öffnen als Overlays → Optionen erscheinen evtl. in einem Portal-Frame. TODO: nach Klick Overlay-Frame finden.
- **Budget:** kein `input[type=number]` sichtbar — erscheint evtl. erst nach Sammlung-Auswahl, oder anderer Feldtyp. TODO prüfen.

## STAND
Connect + iframe + Produkt-Typ + Name laufen autonom. Picker/Dropdowns/Budget = manueller Abschluss (2 Min) bis
das Bot-Feintuning steht. Werte: Sammlung **wasserfester-schmuck**, Optimierung **In den Warenkorb**, Budget **15/Tag (Cap 70)**, Schweiz/Deutsch.
