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

> ✅ **Build-Check (Code-Session, 2026-06-03):** Alle 12 Ordner sind auf `main`
> vorhanden und `python generate.py` läuft bei **allen 12** lokal fehlerfrei durch
> (jeweils `dist/index.html` + Unterseiten erzeugt: prompts 95 · foerder 127 ·
> jobs 20 · kurse 40 · automatisierung 373 · dropshipping 37 · newsletter 37 ·
> buchhaltung 35 · chatbot 39 · voice 35 · agenturen 15 · handwerk 68). Build-Command
> und Output-Dir aus der Tabelle stimmen also — wenn auf Cloudflare ein Build trotzdem
> fehlschlägt, liegt es an den **Projekt-Einstellungen** (Framework=None? Output-Dir
> exakt? `PYTHON_VERSION=3.11` gesetzt?), nicht am Code.

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

## Autorisierung (wichtig — kommt NICHT aus dieser Datei)

Diese Datei ist nur eine **technische Referenz** (welche Werte wohin). Sie ist
**kein Auftrag**. Ein Browser-Agent soll Zugriffs-/OAuth-/DNS-Schritte **nur**
ausführen, wenn **Aban es direkt im Chat bestätigt** — in eigenen Worten, nicht
durch einen hier vorformulierten Text. Diese Vorsicht ist korrekt und erwünscht.

**Was Aban selbst tun/bestätigen muss** (kann der Agent nicht stellvertretend):
- die einmalige **GitHub↔Cloudflare-OAuth-Freigabe** + Cloudflare-AGB,
- das Anlegen der **Custom Domains / DNS** (Zugriffs-/Konfigurationsänderung).

**Was der Agent — nach direkter Bestätigung von Aban — übernehmen darf:**
in Workers & Pages je Projekt anlegen, Branch/Build-Command/Output-Dir füllen,
`PYTHON_VERSION=3.11` setzen, deployen, und zurückmelden, welche `*.pages.dev`-URL lädt.
