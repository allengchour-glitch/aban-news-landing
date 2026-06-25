# 🤖 24/7-Autobot-Upgrade-Plan (Recherche-Schwarm 2026-06-25)

> **Kern-Problem:** Browser-Tasks (TikTok-Kampagne/Delete/Upload, Follower, Trend-Sound) brauchen einen
> **Echt-IP-Browser** = aktuell NUR der Heim-PC (Brave CDP 9222). Cloud/VPS = Datacenter-IP → von TikTok/IG
> geblockt. „PC aus = Tasks warten." Ziel: echte 24/7-Autonomie. Drei Lösungs-Tiers + Robustheits-Patterns.

## 🎯 WICHTIGSTE ERKENNTNIS (Recherche-Schwarm — dreht die Strategie um)
**Wir haben das falsche Problem gejagt.** „VPS wie Wohn-IP aussehen lassen" (Proxy/Anti-Detect) löst nur IP-Blocking,
NICHT das Ban-Risiko — und ist **Overkill für EINE Marken-Konto** (der Proxy/Anti-Detect-Stack ist für Leute mit
*vielen* Konten). Die ehrliche Aufteilung:
- **POSTEN = 100% Cloud lösbar, OHNE PC, NULL Ban-Risiko — via offizielle-API-Scheduler** (Metricool gratis nutzen wir
  schon; + Buffer gratis / selbst-gehostetes **Postiz auf unserem Hetzner-VPS** für mehr Volumen). Posten über die offizielle
  API = wie ein manueller Post behandelt, läuft 24/7 in der Cloud, **PC darf aus sein.**
- **FOLLOWEN/ENGAGEMENT = das eigentliche Ban-Risiko** (Auto-Follow → Action-Block/Ban in 48h dokumentiert). Mass-Follow
  ist 2025/26 eh tot + niedrigster ROI. → **manuell/leicht von Hand** (Kommentare/DMs beantworten konvertiert besser als jeder Follow-Bot).
- **Konsequenz für uns:** NICHT in Proxy/Anti-Detect investieren. Stattdessen: **API-Posten maximieren (PC-unabhängig)**,
  Browser-nur-Tasks minimieren, **TikTok-Content-Posting-API auditieren lassen** (schaltet legales Auto-Posten frei).
  Der PC-Browser bleibt nur für die paar No-API-Reste (TikTok-Follower, IG-Delete, Trend-Sound) — und die sind niedrig-Wert.

---

## 🥇 TIER 1 — „Secret Port" umgehen: VPS steuert den PC-Brave FERN (Tailscale, GRATIS)
Die Cloud erreicht den PC-Port 9222 nicht — **Tailscale** (WireGuard-Mesh) löst das:
- Tailscale auf **PC + VPS** installieren → privates Mesh. Der **VPS (24/7 an)** fährt dann den PC-Brave 9222
  über das Tailnet; **Browser-Traffic geht weiter über die Heim-IP des PCs** (TikTok blockt nur die IP, nicht den Fernzugriff).
- **Warum Tailscale > cloudflared/ngrok:** Tailscale tunnelt auf TCP/IP-Ebene → der fiese **„Host-header is not an IP"-Fehler** (Chromium lehnt fremde Host-Header ab) tritt gar nicht auf. cloudflared/ngrok bräuchten einen Shim, der `webSocketDebuggerUrl` von `127.0.0.1` umschreibt.
- **🔒 PFLICHT-Sicherheit:** ACL so setzen, dass **NUR der VPS** Port 9222 erreicht (`tag:cloud-vps → tag:home-pc:9222`). Ein offener CDP-Port = jeder mit der URL übernimmt Browser + alle Cookies. **NIE Tailscale „Funnel".**
- **Gewinn:** Der VPS (statt der fragilen Git-Queue) fährt die Browser-Bots → robuster, weniger Latenz.
- **Ehrliche Grenze:** Der **PC muss trotzdem AN** sein (Heim-IP gibt's nur mit lebendem PC).

## 🥈 TIER 2 — PC echt selbstheilend machen (überlebt Stromausfall/Crash/Reboot)
Damit „PC an" nicht mehr manuell ist:
- **BIOS:** „Restore on AC Power Loss" → **Power On** (PC fährt nach Stromausfall selbst hoch).
- **Sysinternals Autologon** (Passwort als verschlüsseltes LSA-Secret) → Desktop loggt sich selbst ein (nötig für Browser-Automation).
- **Task Scheduler:** Task „Bei Anmeldung" + „Task neu starten alle 1 Min, bis zu 999×" + **2. Watchdog-Task** „alle 5 Min wiederholen" der per Heartbeat-Datei prüft ob der Bot lebt (fängt *hängende* Prozesse, die Crash-Restart NICHT fängt) + „Keine neue Instanz starten" (kein Doppel).
- **NSSM** für headless Node-Bots (Auto-Restart Default, Crash-Loop-Backoff 2s→256s, stdout/stderr-Logs). PM2 auf Windows = unzuverlässig (nur via `pm2-installer` als Service).

## 🥉 TIER 3 — Ganz OHNE PC für POSTEN (offizielle API, GRATIS) ⭐ besser als Proxy
Statt Proxy/Anti-Detect (Overkill, s.o.): **Posten komplett auf Cloud-API-Scheduler** → PC nicht mehr nötig fürs Posten.
- **Metricool gratis** (1 Marke, 20 Posts/Mt, echtes TikTok+IG-Auto-Publish — nutzen wir schon) · **Buffer gratis** (3 Kanäle) als Überlauf · **Postiz** (Open-Source, selbst-gehostet auf dem Hetzner-VPS = keine Limits, ~CHF 0–10/Mt).
- **TikTok-Haken:** API „Direct Post" kann „made with [app]"-Label zeigen + Trend-Audio nur in-App → unser Hybrid (Metricool/Manuell-TikTok + API-IG/FB) ist genau richtig.
- **Proxy-Pfad (NICHT empfohlen):** VPS + CH-Residential-Proxy (DataImpulse $1/GB) + Anti-Detect headful unter Xvfb. Technisch machbar, aber für 1 Marken-Konto sinnlos + fragil + kostet. Nur falls je Multi-Konto.
- **Alternativ-Hardware:** N100-Mini-PC (~$130) als dedizierter 24/7-Browser-PC mit Heim-IP (billiger als Proxy-Abo). Aber: Heim-IP koppelt Ban-Risiko ans Haushalts-Netz.

## 🔧 QUEUE-HÄRTUNG (gegen FIFO-Blockade — file-basiert, keine DB nötig)
Unser cmd-poll ist FIFO mit Stale-Lock → ein langer Job blockiert alle. Robuster (SQS-Visibility-Timeout-Muster, file-basiert):
- **Atomic-Claim via `rename()`:** Job `pending/X.json` → `processing/<worker>/X.json` per `rename` (auf demselben FS atomar → kein Doppel-Claim, kein Lock-File das bei Crash hängenbleibt).
- **Lease/Timestamp + Sweeper:** `processing/`-Jobs älter als Visibility-Timeout (~6× Ø-Dauer) zurück nach `pending/` (selbstheilend nach Crash).
- **Idempotenz-Key in `done/`** VOR der Nebenwirkung → re-claim postet nicht doppelt (haben wir beim Posting via Live-Feed-Dedup schon).
- **Quarantäne/Dead-Letter:** nach N Fehlversuchen Job parken (NICHT in Ban retrien). ⚠️ git ist KEIN sicherer Concurrency-Primitiv (kein atomic claim) → git nur als Transport/Audit-Log, der echte Claim per lokalem FS-`rename`.
- **Retry nur transient, Backoff `2^n × delay` + Jitter.**

---

## 🛡️ Robustheits-Patterns (teils autonom umsetzbar)
- **`observe()` VOR `act()`** bei destruktiven Aktionen (Löschen!) — erst prüfen *was* geklickt würde, dann klicken.
- **Idempotenz:** vor jeder Nebenwirkung den echten Zustand lesen (Post noch da? Kampagne existiert schon?) — wir machen das beim Posting schon (Dedup gegen Live-Feed).
- **Quarantäne/Dead-Letter:** wiederholt scheiternde Browser-Tasks **parken**, NICHT in einen Ban retrien (drum hab ich die kaputte Browser-Kampagne aus der Queue genommen).
- **Screenshot VOR + NACH** riskanter Aktion (Diagnose).
- **Retry nur transient** (429/Timeout) mit Backoff + **Jitter**; nie kaputte Payloads retrien.
- **Rate-Limits 50–80%** der Plattform-Grenze (unsere Follower-Caps IG 30/TikTok 22 sind konservativ = gut).

## 🔑 API-VOR-BROWSER (strategisch wichtig)
- **TikTok Content Posting API** = der offizielle, sanktionierte Weg (Browser-Posten verletzt ToS). **Haken: Audit-Gate** — unauditierte Apps posten nur `SELF_ONLY` (privat); nach ToS-Audit (~2–6 Wo) wird `PUBLIC` freigeschaltet. **→ App auditieren lassen = der echte Autonomie-Unlock fürs Posten** („Browser live → API nach Audit" ist genau richtig).
- **Facebook-Seiten-Posts löschen GEHT per API** (`DELETE /{post-id}`, Scope `pages_manage_posts`) — zuverlässig, kein Browser. (delete-old-fb-posts.mjs nutzt das.)
- **Instagram-Posts löschen: KEINE API** → nur App/Browser (bestätigt).
- **TikTok: keine Delete-API, keine Follower-API, kein Trend-Sound-API** → diese bleiben zwingend Browser (= Tier 1/2 nötig).

---

## ✅ Empfohlene Reihenfolge (am meisten Wirkung pro Aufwand)
1. **POSTEN PC-unabhängig machen (TIER 3 API)** — gratis, grösster Hebel: Metricool gratis voll ausnutzen + ggf. Postiz auf dem VPS. → PC fürs Posten nicht mehr nötig, null Ban-Risiko, echtes 24/7. *(Autonom/teils User.)*
2. **TikTok-Content-Posting-API-Audit einreichen** — schaltet legales Auto-Posten (PUBLIC) frei (~2–6 Wo Review). *(User, einmalig.)*
3. **TIER 2 (PC selbstheilend)** — gratis: BIOS-Power-On + Autologon + Task-Scheduler-Watchdog → „PC an" wird automatisch (für die No-API-Reste). *(User-Setup, ~20 Min.)*
4. **TIER 1 (Tailscale)** — gratis, VPS fährt den PC-Brave robust fern (für TikTok-Kampagne/Follower/IG-Delete). *(User-Setup, ~15 Min.)*
5. **Robustheits-Patterns** — laufend autonom: observe-before-delete, Quarantäne, Queue-Härtung (atomic-rename + Lease-Sweep).
6. **Proxy/Anti-Detect** — NICHT empfohlen (Overkill für 1 Marke).

> **Kernbotschaft:** Nicht mehr in fragile PC-Browser-Automation überinvestieren. Der 24/7-Gewinn = **API-Posten (PC-frei) +
> Browser-nur-Tasks minimieren + TikTok-API auditieren.** Followen bleibt manuell/leicht (das echte Ban-Risiko).
