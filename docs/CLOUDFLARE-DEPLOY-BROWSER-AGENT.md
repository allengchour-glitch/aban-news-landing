# Cloudflare-Deploy — Klick-Anleitung für den Browser-Agenten

> **Für eine Browser-Automations-Session** (mit Login in Abans Cloudflare-Konto).
> Ziel: jedes Radar-Projekt als eigenes **Cloudflare-Pages-Projekt** auf seiner
> Subdomain live schalten. Repo: `allengchour-glitch/aban-news-landing`, Branch `main`.
>
> **Voraussetzungen (sonst geht nichts):**
> 1. Du bist in **dash.cloudflare.com** mit Abans Konto eingeloggt.
> 2. Die Domain `abannews.com` liegt bereits bei Cloudflare (DNS dort) — ist der Fall.
> 3. Beim ersten Projekt musst du **GitHub mit Cloudflare verbinden** (OAuth,
>    einmalig) und das Repo `aban-news-landing` freigeben.

---

## Der Klick-Ablauf (identisch für JEDES Projekt)

Mach das pro Zeile aus der Tabelle unten **einmal**:

1. **dash.cloudflare.com** → links **Workers & Pages** → **Create application** →
   Tab **Pages** → **Connect to Git**.
2. Repo **`allengchour-glitch/aban-news-landing`** wählen → **Begin setup**.
3. **Project name:** den Wert aus Spalte *CF-Projektname* eintragen.
4. **Production branch:** `main`.
5. **Build settings:**
   - **Framework preset:** `None`
   - **Build command:** den Wert aus Spalte *Build command*
   - **Build output directory:** den Wert aus Spalte *Output dir*
   - **Root directory:** leer lassen (Repo-Root)
6. **Environment variables** → **Add variable:** Name `PYTHON_VERSION`, Wert `3.11`.
7. **Save and Deploy** → warten, bis der Build grün ist.
8. Die vergebene **`*.pages.dev`-URL öffnen** und prüfen, dass die Seite lädt
   (Startseite + ein Unterlink). Wenn 404/leer → Build-Log lesen, melden.
9. **Custom domains** (Tab im Projekt) → **Set up a custom domain** → die
   **Subdomain** aus der Tabelle eintragen → bestätigen. Cloudflare legt den
   CNAME automatisch an (Domain liegt schon hier).
10. Fertig. Ab jetzt deployt jeder Push auf `main` automatisch.

> **Wichtig:** Build command und Output dir **exakt** übernehmen (Tippfehler =
> Build schlägt fehl). Nach jedem Projekt kurz die Live-Subdomain öffnen.

---

## Die Projekte (Reihenfolge = Empfehlung, oben zuerst)

| # | CF-Projektname | Build command | Output dir | Custom domain |
|---|----------------|---------------|------------|---------------|
| 1 | `prompts-bibliothek` | `cd prompts-bibliothek && python generate.py` | `prompts-bibliothek/dist` | `prompts.abannews.com` |
| 2 | `foerder-radar` | `cd foerder-radar && python generate.py` | `foerder-radar/dist` | `foerder.abannews.com` |
| 3 | `jobs-radar` | `cd jobs-radar && python generate.py` | `jobs-radar/dist` | `jobs.abannews.com` |
| 4 | `kurse-radar` | `cd kurse-radar && python generate.py` | `kurse-radar/dist` | `kurse.abannews.com` |
| 5 | `automatisierung-radar` | `cd automatisierung-radar && python generate.py` | `automatisierung-radar/dist` | `automatisierung.abannews.com` |
| 6 | `dropshipping-radar` | `cd dropshipping-radar && python generate.py` | `dropshipping-radar/dist` | `dropshipping.abannews.com` |
| 7 | `newsletter-radar` | `cd newsletter-radar && python generate.py` | `newsletter-radar/dist` | `newsletter.abannews.com` |
| 8 | `buchhaltung-radar` | `cd buchhaltung-radar && python generate.py` | `buchhaltung-radar/dist` | `buchhaltung.abannews.com` |
| 9 | `chatbot-radar` | `cd chatbot-radar && python generate.py` | `chatbot-radar/dist` | `chatbot.abannews.com` |
| 10 | `voice-radar` | `cd voice-radar && python generate.py` | `voice-radar/dist` | `voice.abannews.com` |
| 11 | `agenturen-radar` | `cd agenturen-radar && python generate.py` | `agenturen-radar/dist` | `agenturen.abannews.com` |
| 12 | `handwerk-radar` | `cd handwerk-radar && python generate.py` | `handwerk-radar/dist` | `handwerk.abannews.com` |

**Schon live (nicht anfassen):** `radar.abannews.com` (ki-tools-radar) und die
Hauptseite `abannews.com`.

---

## Ehrliche Hinweise (an den Browser-Agenten)

- **agenturen + handwerk** sind bewusst „dünn" (agenturen startet leer; handwerk =
  OSM-Daten, vor dem Bewerben menschlich zu prüfen). Sie *bauen* sauber und dürfen
  live — aber sie sind die unwichtigsten zuerst. Reihenfolge oben beachten.
- Wenn ein Build fehlschlägt: das **Build-Log** öffnen, die Fehlermeldung kopieren
  und an Aban melden — **nichts erraten/erfinden**.
- **Keine** Secrets/Keys irgendwo eintragen außer der harmlosen `PYTHON_VERSION`.
- Nach allen Projekten: kurze Liste zurückmelden — welche Subdomain lädt, welche nicht.

---

## Was Aban dem Browser-Agenten sagt (copy-paste)

> „Öffne `docs/CLOUDFLARE-DEPLOY-BROWSER-AGENT.md` im Repo
> `allengchour-glitch/aban-news-landing` und arbeite die Projekt-Tabelle von oben
> nach unten ab. Du bist in meinem Cloudflare-Konto eingeloggt. Melde nach jedem
> Projekt, ob die Subdomain lädt."
