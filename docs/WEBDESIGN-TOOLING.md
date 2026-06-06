# Webdesign- & QA-Toolkit (abannews)

> Persistentes Memory: dieses Toolkit ist eingerichtet und committet. Künftige Sessions kennen es hierüber.

## Was da ist
Statische Site (handgeschriebenes HTML/CSS, **kein** Runtime-Build). `package.json` liefert
**nur optionale Dev-Tools** — keine Laufzeit-Abhängigkeit der Site.

| Zweck | Tool | Befehl |
|---|---|---|
| HTML-Qualität/A11y prüfen (Schlüsselseiten) | html-validate | `npm run validate` |
| HTML-Qualität prüfen (alle Seiten) | html-validate | `npm run validate:all` |
| Formatierung prüfen (nur Nicht-Hub-Seiten) | prettier | `npm run format:check` |
| Design-Vorschau Desktop+Mobil als PNG | playwright | `npm run shots` → `design-preview/` |
| Lighthouse-Audit Startseite | lighthouse+playwright | `npm run audit` → `design-preview/lighthouse-index.json` |

Node: `/opt/node22/bin` (Node 22 / npm 10). Browser für `shots`/`audit`:
`npx playwright install chromium` (Binary liegt unter `/opt/pw-browsers`, **nicht** im Repo, also pro Session neu).

## Konfiguration / Konventionen
- `.htmlvalidate.json`: bewusste Design-Entscheidungen sind ausgeschaltet (`no-inline-style`,
  `element-permitted-content` für inline-`<style>`). Aktiv bleiben echte Signale: a11y (`wcag/h37`,
  `hidden-focusable`), `no-dup-id`, `valid-id`, `no-missing-references`, `no-implicit-button-type`.
- **🔴 NIE `prettier --write` über `ki-fuer-*.html`** — ändert Whitespace in JSON-LD/FAQ und bricht die
  zeichengenaue FAQ-Parität (Validator-Gate der Branchen-Hubs). Formatierung nur check-only, nur Nicht-Hub-Seiten.
- `node_modules/` + `design-preview/.cache/` sind gitignored; die PNGs in `design-preview/` werden committet,
  damit der Design-Stand sichtbar bleibt.

## Bekannte/erledigte Findings (Stand 2026-06-06)
- `index.html` Tab-Buttons (Mo/Mi/Fr) `type="button"` ergänzt (verhinderte mögliches Form-Submit). ✓
- Offene Warnung (niedrig): `about.html` `aria-hidden` auf fokussierbarem Element.

## Design-Richtung (User-Wunsch 2026-06-06)
Referenzen vom User: **brevo.com/de** und **mailchimp.com/de** — Wunsch: modernere, marketing-stärkere
Landing (klare Sektionen, kräftige Hero, Feature-Cards, große CTAs) **im anti-hype-Ton von aban**.
Umsetzung als eigener Branch + Vorher/Nachher-Screenshots zur Freigabe (Homepage = outward-facing, vor Live zeigen).
