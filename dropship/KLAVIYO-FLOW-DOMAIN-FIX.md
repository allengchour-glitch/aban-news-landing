# Klaviyo-Flows auf luxestyle.ch umstellen (2-Min-Anleitung)

Stand 2026-05-31. Die **eigenständigen Vorlagen** sind bereits per API auf `luxestyle.ch`
umgestellt (alle 9). Die **LIVE-Flows** haben aber eine eigene, eingefrorene Kopie des
Inhalts, die per API NICHT editierbar ist → diese 2 Klick-Schritte musst du selbst machen.

> ## ⚠️ 2026-08-21: DIESE EINSCHÄTZUNG IST ÜBERHOLT — es ist jetzt DRINGEND.
> Der Satz darunter stand hier seit dem 31.05. und stimmt nicht mehr:
>
> > ~~Nicht dringend: beide Domains (luxestyle.ch UND luxestyle.com.co) funktionieren inkl.
> > SSL. Es geht rein um Konsistenz auf die Hauptdomain .ch.~~
>
> **`luxestyle.com.co` ist TOT.** Der Betreiber klickte am 21.08. in einer Klaviyo-Mail auf
> `luxestyle.com.co/?_kx=…` und bekam **ERR_CONNECTION_CLOSED**. Live nachgeprüft:
> die Domain löst auf `2620:127:f00f:b::` auf — **nicht** Shopifys `23.227.38.x` — und
> liefert nichts (503 über einen fremden Ausgang). `account.luxestyle.com.co` löst gar
> nicht mehr auf.
>
> Aus «reine Konsistenz» ist damit ein **Kaufabbruch bei jedem Klick** geworden: Wer die
> Willkommens- oder Warenkorb-Mail öffnet und klickt, landet auf einer toten Seite. Keine
> Statistik weist das je als Abbruch aus (dieselbe Klasse wie die 61 toten Ratgeber-Links
> und die abgelaufenen Rabattcodes).
>
> **Der Shop selbst ist sauber** (21.08. vollständig nachgezählt, nicht gestichprobt):
> 132 veröffentlichte Seiten → 0, 316 Artikel → 0, alle 425 Theme-Dateien → 0. Die tote
> Domain lebt NUR noch in den eingefrorenen Flow-Kopien in Klaviyo.
>
> **Wirksamer als jede Vorlagen-Korrektur — falls die Domain noch dem Betreiber gehört:**
> `luxestyle.com.co` per DNS auf Shopify zeigen und in Shopify als Weiterleitungs-Domain
> eintragen. Das rettet mit EINER Änderung ALLE alten Links auf einmal — auch die **bereits
> verschickten** Mails, die keine Vorlagen-Korrektur mehr erreicht, sowie alte Social-Posts.
> Die Schritte unten bleiben trotzdem richtig für künftige Sendungen.
>
> ⚠️ Klaviyo ist aus der Session NICHT erreichbar: kein API-Schlüssel im Container, und der
> Konnektor verlangt eine Anmeldung, die eine nicht-interaktive Session nicht leisten kann.
> Das sind Betreiber-Klicks.

## Schnellster Weg (pro Flow-Mail gleich)
1. Mail-Schritt im Flow anklicken → **„Edit"** (Inhalt öffnen).
2. Oben rechts **„⋯" → „View/Edit Code"** (HTML-Quelltext).
3. **Suchen & Ersetzen:** `luxestyle.com.co` → `luxestyle.ch`
   (auch `alleng@luxestyle.com.co` → `alleng@luxestyle.ch`).
4. **Speichern** → zurück zum Flow → **„Update Live"** / Änderungen veröffentlichen.

Alternativ noch schneller: im Mail-Schritt einfach die schon korrigierte **Vorlage neu laden**
(„Replace template" / Vorlage erneut auswählen) — dann ist der .ch-Inhalt sofort drin.

## Die 2 wichtigsten Flows (umsatzstärkste zuerst)

### 1) E-Mail Welcome-Serie  (Flow-ID `UKjAsV`, Trigger: Added to List „Newsletter Subscribers")
Direktlink: https://www.klaviyo.com/flow/UKjAsV/edit
- 4 Flow-Schritte. Die E-Mail-Schritte entsprechen Vorlage **„LuxeStyle Welcome 1 — 10% Rabatt Begrüssung"**.
- Achte auf: Code-Box `WELCOME10`, Button-Link, Footer.

### 2) Abandoned Checkout  (Flow-ID `Vse76a`, Trigger: Metric „Checkout Started")
Direktlink: https://www.klaviyo.com/flow/Vse76a/edit
- Mehrere E-Mail-Schritte, entsprechen u.a.:
  - „LuxeStyle · Cart Abandon T+30min" (Checkout-URL)
  - „LuxeStyle Abandoned Cart 1 / 2" (COMEBACK10)
  - „LuxeStyle · Cart Reminder V2 · 24h Recovery" (COMEBACK5)

## Weitere Flows (optional, gleiche Methode)
- Post-Purchase · Order + Review (`RnTvsY`) → Order Confirmation + Delivered/Loox-Review
- At-Risk Win-Back · 15% Off (`UF8vfr`)
- VIP Tier-Upgrade Welcome (`Vig3U3`) → VIP10
- Birthday · CHF 15 Gift (`Wvz8WW`, Entwurf) → BDAY15

## Verifizierte Rabattcodes (alle ACTIVE, Shopify)
WELCOME10 (10%, ab CHF 30, bis 31.08.) · COMEBACK10 · COMEBACK5 · FLASH25 · VIP10 · BDAY15
