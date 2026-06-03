# 🚀 Die letzten 3 Projekte live schalten (kurse · prompts · agenturen)

Komplett im **Browser**, kein Terminal nötig. Pro Projekt ~5 Minuten.
Du machst denselben Ablauf wie schon bei radar / foerder / jobs — nur dreimal mit anderen Werten.

---

## Schritt 0 — Erst den aktuellen Code nach `main` bringen (einmalig)

Die heutigen Conversion-/SEO-Verbesserungen liegen im Branch `claude/ai-money-project-f25Ub`
(Pull Request **#14**). Cloudflare baut standardmäßig vom `main`-Branch. Damit die Projekte mit
dem **optimierten** Stand live gehen:

- **Empfohlen:** PR #14 auf GitHub mergen → `main` ist aktuell → Cloudflare baut den neuen Stand.
- **Alternative (ohne Merge):** Beim Anlegen jedes Projekts unten als *Production branch*
  `claude/ai-money-project-f25Ub` wählen statt `main`. (Nach dem späteren Merge dann auf `main` zurückstellen.)

> Die Projektordner selbst (`kurse-radar/`, `prompts-bibliothek/`, `agenturen-radar/`) sind schon
> auf `main` — nur die heutigen Generator-Verbesserungen kommen über PR #14 dazu.

---

## Schritt 1 — Pro Projekt: Cloudflare Pages anlegen

Mach das **dreimal**. Öffne [dash.cloudflare.com](https://dash.cloudflare.com) →
**Workers & Pages** → **Create application** → Reiter **Pages** → **Connect to Git** →
dein Repo `allengchour-glitch/aban-news-landing` auswählen.

Dann die **Build-Einstellungen** — genau diese Werte eintragen:

| Feld | Projekt **kurse** | Projekt **prompts** | Projekt **agenturen** |
|------|-------------------|---------------------|------------------------|
| **Project name** | `kurse` | `prompts` | `agenturen` |
| **Production branch** | `main` (oder Branch aus Schritt 0) | `main` | `main` |
| **Framework preset** | None | None | None |
| **Build command** | `cd kurse-radar && python generate.py` | `cd prompts-bibliothek && python generate.py` | `cd agenturen-radar && python generate.py` |
| **Output directory** | `kurse-radar/dist` | `prompts-bibliothek/dist` | `agenturen-radar/dist` |

→ **Save and Deploy**. Nach ~1–2 Min bekommst du eine Test-Adresse wie `kurse-xyz.pages.dev`.
Öffne sie einmal — sie sollte schon vollständig aussehen.

> **Kein `pip install` nötig** — alle drei Generatoren nutzen nur die Python-Standardbibliothek.
> Falls der Build „python: command not found" meldet: nimm `python3` statt `python` im Build command.
> Falls eine zu alte Python-Version gemeldet wird: unter **Settings → Environment variables**
> eine Variable `PYTHON_VERSION` = `3.11` setzen und neu deployen.

---

## Schritt 2 — Eigene Subdomain verbinden (pro Projekt)

Da `abannews.com` schon bei Cloudflare liegt, ist das ein Klick — kein DNS-Gefummel.

Im jeweiligen Pages-Projekt → **Custom domains** → **Set up a custom domain** → eintragen:

| Projekt | Custom domain |
|---------|----------------|
| kurse | `kurse.abannews.com` |
| prompts | `prompts.abannews.com` |
| agenturen | `agenturen.abannews.com` |

Cloudflare legt den nötigen CNAME automatisch an. Status zeigt ggf. kurz „Initializing",
dann „Active". Fertig — die Seite ist live.

---

## Schritt 3 — Einmal gegenlesen (Pflicht-Check)

- **Rechtsseiten:** Impressum + Datenschutz sind generiert (echte Daten: Alleng Chour, Belp,
  hallo@abannews.com). Vor dem Teilen einmal selbst überfliegen — ich bin kein Anwalt.
- **agenturen** startet bewusst **leer** (nur markierte Platzhalter, `noindex`). Das ist Absicht:
  ehrlich starten, echte Einträge kommen über den Funnel `eintrag-einreichen` / `preise`.
- **kurse**: Affiliate-Links sind noch deaktiviert (Preise/Score `null` bis redaktionell geprüft) —
  das ist korrekt so, bis du echte Werte/Partnerlinks hast.

---

## Was danach automatisch läuft

- Jedes Projekt hat einen **Auto-Build-Workflow** (`.github/workflows/`) — bei jeder Datenänderung
  baut Cloudflare neu, du musst nichts tippen.
- Neue Inhalte = einfach die jeweilige `data/*.json` ergänzen → Seite aktualisiert sich.

---

## Reihenfolge danach (siehe START-HIER.md)

1. ✅ **Diese 3 live schalten** (dieses Dokument).
2. **Affiliate-Links eintragen** — sobald GetResponse / Murf AI / Surfer SEO bestätigt sind:
   in `ki-tools-radar/affiliate.json` den Link eintragen, `_`-Präfix entfernen → mehr provisionsfähige Klicks.
3. **Traffic** (der eigentliche Engpass): Newsletter-Teaser + LinkedIn. Fertige Vorlagen liegen in
   `ki-geld-projekt/` (LINKEDIN-CONTENT-PLAN.md, ERSTE-BESUCHER.md). 0 Besucher = 0 Einnahmen —
   kein Code ersetzt Teilen + Geduld mit Google (Wochen).

🎯 Wenn ein Build fehlschlägt: kopier mir die rote Fehlerzeile aus dem Cloudflare-Build-Log, dann sag ich dir die genaue Zeile.
