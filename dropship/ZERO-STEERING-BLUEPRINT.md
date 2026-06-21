# 🎯 ZERO-STEERING — Automation OHNE PC, ohne Klicks (Recherche 2026-06-21)

> User-Auftrag (2026-06-21): „suche Verbesserung/Info/YouTube für Automation z.B. **ohne mich zu
> steuern alles**." Der echte Schmerz: der **Heim-PC** muss manuell geklickt/neugestartet werden
> (Brave-Port, SUPERBOT, Listener). Diese Recherche (Schwarm + Netz/YouTube) löst genau das.

## 🧠 Die Kern-Erkenntnis (Umdeutung des Problems)
Der PC steckt fest, weil **zwei verschiedene Jobs am selben fragilen Heim-Browser hängen**:
1. **API-fähige Arbeit** (Shopify-Katalog/SEO, Meta-Ads + CAPI, E-Mail, TikTok-Kampagnen *nach Audit*)
   → darf **NIE einen Browser anfassen**. Gehört auf reine API-Calls = kein Anti-Bot-Risiko, nie ausgeloggt.
2. **Browser-zwingende Arbeit** (TikTok-Organic-Posten, IG/FB-Cookie-Sessions, CH-Marktplätze
   tutti/anibis/ricardo) → braucht echt einen eingeloggten Browser.

**Die Wahrheit:** Der PC existiert fast nur für Job #2 — und #2 ist **viel kleiner als gedacht**.
~70–80 % der Bot-Arbeit hat eine echte API. → **Erst die Browser-Fläche schrumpfen, dann den kleinen
Rest in einen Cloud-Browser mit Schweizer Residential-IP heben.** Dann ist der PC raus.

## 🏗️ Empfohlene Architektur (rangiert nach Reihenfolge)
| Schicht | Tool | Warum | €/Monat |
|---|---|---|---|
| **Orchestrierung (Always-on-Hirn)** | **n8n self-hosted auf Hetzner-VPS** (Docker, `restart: unless-stopped`) | Visuelle Workflows, Cron + Error-Trigger-Retry, hält alle Secrets, heilt sich via Docker selbst. 2026-Standard für „einmal setzen, läuft ewig". | VPS **~€4–6** (Hetzner CX23) |
| **API-Arbeit (kein Browser)** | n8n → Shopify Admin API, **Meta Marketing API + CAPI**, Klaviyo/Brevo, **TikTok Marketing API** | Eliminiert ~70–80 % der Browser-Aktionen. Server-zu-Server, kein Anti-Bot, nie ausgeloggt. | $0 |
| **Cloud-Browser (kleiner Rest)** | **Skyvern Cloud** (Vision-Agent + Residential-Proxy + persistente Browser-Profile) | Ersetzt den PC ganz. Persistentes Profil = Cookies überleben; CH-Residential-IP = Social loggt nicht aus; AI-Vision = UI-Änderungs-resistent. | **$29 Hobby**; Residential-Proxy auf **Pro $149** |
| **Watchdog/Alerting** | n8n „Error Trigger" → Telegram bei Fehler | Ping NUR wenn echt was bricht. Stille = gesund. | $0 |

**Realistischer Floor:** **~€35/Mo** (managed Cloud-Browser, Proxy nur wo nötig) ODER **~€10/Mo
voll-DIY** (Steel/Browser-Use self-hosted auf demselben VPS + DataImpulse CH-Residential ~$1/GB).

## 🌐 Cloud-Browser-Optionen (rangiert: Persistenz + Residential-IP + Preis)
1. **Skyvern Cloud — beste Passung.** Managed, AI-Vision (selbstheilend), **persistente Browser-Profile**
   (Cookies/Session überleben → kein Re-Login), 2FA/TOTP + Credential-Vault, Anti-Bot/CAPTCHA/Proxy gebündelt.
   Gratis 5.000 Credits/Mo (~170 Aktionen); Hobby $29; Residential auf Pro $149.
2. **Browserbase — beste rohe Plattform.** Stärkste Persistenz (Session attachen), Replay-Debugging.
   Gratis-Tier zu klein für 24/7. Dev $20 / Startup $99; Residential metered $10–12/GB. ⚠️ Unser eigener
   Test: Gratis-Plan = Datacenter-IP → TikTok loggt aus; Residential = nur bezahlt (deckt sich mit Memory).
3. **Hyperbrowser — großzügigster Gratis-/Volumen-Tier.** Gratis $10/Mo = 100 Browser-Std, Stealth default.
4. **Steel.dev — bestes Open-Source/Self-Host.** CDP-kompatibel, self-hostbar auf dem Hetzner-VPS (~nur VPS-Kosten). → der DIY-€10-Weg.

**🇨🇭 Schweiz-Regel:** Social flaggt IP-Wechsel. **Sticky CH-Residential-Session** (1 fixe IP pro Konto,
z.B. DataImpulse sticky ~$1/GB) — NICHT rotierend, NICHT Datacenter. Das ist der größte Faktor gegen Auslog.

## 🔌 Diese Tasks → API (Browser löschen!)
| Task | API | Browser? |
|---|---|---|
| Shopify Katalog/SEO/Collections/Preise/Publish | Shopify Admin API (nutzen wir schon) | ❌ |
| Meta/IG **Ad-Kampagnen** | Meta Marketing API | ❌ |
| **Conversion-Tracking (0-Kauf-Blindheit!)** | **Meta CAPI** (server-side) — recovered 20–30 % Conversions die der Pixel verliert | ❌ |
| **TikTok Ad-Kampagnen/Budgets** | TikTok Marketing API (nach Konto-Onboarding) | ❌ |
| TikTok-Posten | Content Posting API — **SELF_ONLY bis Audit** (2–4 Wo); davor nur Entwürfe | ⚠️ Browser bis Audit |
| E-Mail-Flows (Abandoned/Welcome/Win-Back) | Klaviyo/Brevo API | ❌ |

**Bleibt zwingend Browser (kein API):** TikTok-Organic (bis Audit), IG/FB-Cookie-Growth/Engagement,
**CH-Marktplätze tutti/anibis/ricardo** (bestätigt: KEINE öffentliche Listing-API). → Cloud-Browser-Job
schrumpft auf genau diese 3 Dinge. Alles andere = API-Calls aus n8n.

## 🚚 Migration: Heim-PC-Bot → voll Cloud, hands-off
1. **Hetzner CX23 (~€4/Mo)**, Docker + n8n (`restart: unless-stopped`, optional Cloudflare-Tunnel für UI).
2. **Secrets** von `luxe-secrets.ps1` → n8n-Credentials (Shopify, Meta, Klaviyo, TikTok, Proxy).
3. **API-Jobs zuerst portieren** (größter Gewinn, 0 Risiko): SEO-Fill, Katalog-Enrich, Meta-Kampagnen,
   E-Mail-Flows als n8n-Workflows. **PC-Tasks dazu abschalten.** → Großteil des PC-Bots ist schon weg.
4. **Meta CAPI** (server-side) aus n8n → direkt gegen das 0-Kauf/leerer-Pixel-Problem.
5. **Cloud-Browser** für den Rest: Skyvern-Account, persistentes Profil, TikTok/IG/FB **einmal** hinter
   Sticky-CH-Residential einloggen, 1 Tag Überleben prüfen. Runs aus n8n triggern.
6. **TikTok Content-Posting-API-Audit JETZT einreichen** (2–4-Wo-Uhr); bis Freigabe Organic über Cloud-Browser.
7. **Watchdog:** n8n Error-Trigger → Telegram; täglicher Heartbeat (Stille = gesund).
8. **PC abschalten:** nach ~1 Wo stabilem Cloud-Browser SUPERBOT/Listener/Brave-Port pensionieren.

**Endzustand:** n8n auf €4-VPS macht alles auf Zeitplan, heilt sich via Docker + Retry, erledigt API-Arbeit
nativ und delegiert nur TikTok-Organic / IG-FB-Cookie / CH-Marktplatz an einen managed Cloud-Browser auf
Sticky-CH-Residential-IP — **kein Heim-PC, keine manuellen Neustarts, kein Klicken.**

## ⚖️ Was der User entscheiden muss (kostet echtes Geld → keine Eigenmacht)
- **Weg A „managed, am robustesten" ~€35/Mo:** Hetzner-VPS + Skyvern (managed Browser, Proxy nur wo nötig).
- **Weg B „DIY-billig" ~€10/Mo:** Hetzner-VPS + Steel/Browser-Use self-hosted + DataImpulse CH-Residential $1/GB.
- **Weg C „erst gratis-Schritte":** nur die API-Migration (Schritte 1–4) bauen = €4-VPS, **sofort 70–80 %**
  des PC-Bots eliminiert OHNE Cloud-Browser-Kosten; der Browser-Rest bleibt vorerst am PC.

> **Empfehlung:** Mit **Weg C** starten (fast gratis, killt den Großteil der PC-Abhängigkeit), dann bei
> Bedarf den Cloud-Browser (A/B) für den TikTok/IG/FB/Marktplatz-Rest nachrüsten. Budget-Freigabe nötig
> bevor ich einen bezahlten VPS/Proxy/Skyvern-Account aufsetze.

## Quellen
Browserbase/Skyvern/Steel/Hyperbrowser-Pricing-Docs, TikTok Content-Posting-API-Audit (PostPeer/Mixpost),
Meta CAPI 2026 (DataAlly/Stormy), n8n self-host (ITNEXT/GrowwStacks/YouTube), Hetzner-Pricing,
CH-Residential-Proxies (DataImpulse/NodeMaven), Ricardo „kein Listing-API"-Beleg (Lengow). Voll in
Chat-Recherche 2026-06-21 / Brain-Regel `zero_steering_blueprint_2026`.
