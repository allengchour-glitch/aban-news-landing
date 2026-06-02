# Voll-Gas-Stateboard — autonomer Dauerbetrieb

> Wiederaufsetzpunkt für den autonomen Wellen-Loop. Wird nach jeder Welle / jedem
> Projektschritt aktualisiert. Wenn die Session neu startet: **hier zuerst lesen**,
> dann an der ersten offenen Aufgabe weitermachen.

**Modus:** `/loop` self-paced — 10er-Wellen Branchen-Hubs, verschränkt mit den
Automations-Projekten (Priorität P4 → P1 → P2 → P3). Start auf „los", Stop auf „stop".

## Status der Branchen-Hubs (`ki-fuer-*.html`)

- **Live:** 52 Hubs (Wellen 1–4, PRs #94/#96/#97 + Familien 32→42, 42→52).
- **Nächste Welle:** Familie 52 → 62 (Handwerk-Charge).

## Wellen-Log

| Welle | Slugs | Branch / PR | Status |
|-------|-------|-------------|--------|
| 0 | — (Stateboard-Setup) | `claude/voll-gas-stateboard` | in Arbeit |

## Backlog (echte, distinkte Verticals — Slug-Kollisionscheck je Welle)

Handwerk: `elektriker`, `sanitaer-heizung`, `fliesenleger`, `trockenbau`, `glaser`,
`metallbauer`, `zimmerer`, `geruestbau`, `raumausstatter`, `schornsteinfeger`.
Gesundheit/Care: `heilpraktiker`, `hoerakustiker`, `podologen`, `zahntechniker`,
`sanitaetshaeuser`, `kieferorthopaeden`.
Dienstleistung: `notare`, `wirtschaftspruefer`, `sachverstaendige`, `hausmeisterservice`,
`sicherheitsdienste`, `umzugsunternehmen`, `schluesseldienste`, `entruempelung`,
`schaedlingsbekaempfer`.
Handel/Gastro: `metzgereien`, `eisdielen`, `cafes`, `buchhandlungen`, `fahrradlaeden`,
`sportgeschaefte`, `modeboutiquen`, `getraenkehandel`.
Kurse/Kreativ: `fahrschulen`, `musikschulen`, `tanzschulen`, `sprachschulen`,
`nagelstudios`, `tattoostudios`, `djs`, `hochzeitsfotografen`.

## Automations-Projekte (Priorität 4 → 1 → 2 → 3)

- **P4 — Newsletter-Automation** (`claude/automation-newsletter`): offen.
  Link-Checker, Scheduler, mehr Feeds, optional Content-Drafts (je + Cron-Workflow).
- **P1 — Surfer-Content im ki-tools-radar** (`claude/radar-surfer`): offen.
  Critique-JSON + `alternatives`, Affiliate-Slot `_surfer` bleibt deaktiviert.
- **P2 — Mehrsprachige Hubs** (`claude/hubs-i18n-<charge>`): offen.
  Top-Hubs je in **EN + FR + IT** komplett, reziprokes hreflang.
- **P3 — Vier neue Radar-Verticals** (`claude/<name>-radar`): offen.
  `newsletter-radar` → `buchhaltung-radar` → `chatbot-radar` → `voice-radar`,
  je ausführlich. CF-Pages-Projekt + Domain bleiben manueller Nutzer-Schritt.

## Guardrails (Kurzform)

Kein Thin-Content · keine erfundenen Preise/Scores/Affiliate-Codes (`_`-deaktiviert /
„[Redaktion: prüfen]") · anti-hype, du-Form, echte Umlaute · sensible Branchen mit
klarer „keine Beratung/Diagnose"-Grenze · kein neues Tracking · je Workstream eigener
Branch/PR, Draft → ready → CI-grün → squash-merge.
