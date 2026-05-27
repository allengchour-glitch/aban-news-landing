# landing-ultra/

> **Status:** Production-ready V2-Landing für `abannews.de`.
> **Basiert auf:** 100-Site-Pattern-Research (`landing/research/100-landing-pages-analysis.md`).
> **Replaces:** `landing/` (bleibt als Backup unangetastet).

---

## Was anders ist als `landing/`

| Aspekt | `landing/` (v1) | `landing-ultra/` (v2) |
|--------|-----------------|------------------------|
| Hero-Headline | "Der erste tägliche deutschsprachige AI-Newsletter." | + **"3-5 Min, kein Hype"** (Benefit + Time + Anti-Hype, Pattern aus Morning Brew/The Rundown) |
| Identity-Counter | – | **NEU:** Pill-Badge "Mo–Fr neu · Schweiz/DACH" (EVWire-Pattern) |
| Anti-Hype-Manifest | implizit | **NEU:** Eigene Section "Was du hier nicht findest" mit Forbidden-Phrases-Liste — kein anderer Newsletter macht das. USP-Differenzierung. |
| Founder-Block | Text-Only Section | **Foto-Slot + Bio-Card** (Polomski/Welsh-Pattern, Anti-Faceless für DACH) |
| Sticky Mobile CTA | – | **NEU:** Floating "☕ Kostenlos abonnieren" auf Mobile, erscheint bei Hero-Form-Scroll-Out |
| DSGVO-Consent | implizit unter Form | **Explicit Checkbox** (Polomski/Finanzfluss-Pattern), DACH-Markt non-negotiable |
| Trust-Strip | "DSGVO-konform" als Bullet | **4-fach Trust-Strip** direkt unter Form: "DSGVO · 1-Klick · kein Spam · kein Tracking" |
| Founding-Slot-Counter | im Text | **Hero-Pill + Slot-Counter im Footer** (Urgency-Anker) |
| Founding Free-vs-Paid Tabelle | – | **NEU:** klare Vergleichs-Tabelle |
| FAQ-Block (Founding) | flach (h3) | **`<details>`-Accordion** (a11y + collapsed by default) |
| 404 Voice | neutral | **Aban-Voice ("Ich hab Ideen wo du sonst hin könntest")** |
| Sample-Issue | bestehend | **Verbessert:** echte Probe-Ausgabe vom 2026-05-27, Sign-Off, Code-Block-Prompt |
| Security Headers | – | **NEU:** `_headers` mit CSP, HSTS, X-Frame, Permissions-Policy |
| Redirects | – | **NEU:** `_redirects` mit Pretty-URLs + 404-Fallback |
| Schema.org JSON-LD | – | **NEU:** WebSite + SubscribeAction für Search-Engine-Discovery |
| Skip-Link a11y | – | **NEU:** "Zum Hauptinhalt springen" für Keyboard-User |
| `prefers-reduced-motion` | – | **NEU:** respektiert im CSS |
| `prefers-color-scheme` | – | bewusst nicht (warme Coffee-Brand bleibt hell) |
| Fonts | Inter + JetBrains Mono (Google?) | **System-Font-Stack** (kein Google Fonts → DSGVO-safe, 0 external requests) |
| Tracking Scripts | Plausible-Kommentar | **0 Scripts** außer 1 inline Sticky-CTA Toggle (kein Tracking) |
| File-Size index.html | ~7 KB | **~13 KB** (mehr Content, immer noch <50KB-Target) |
| CSS-Size | ~6 KB | **~15 KB** (mehr Komponenten, immer noch <30KB-Target) |

### Top-3 NEUE Patterns adopted (aus 100-Site-Research)

1. **Identity-Counter-Pill** ("Mo–Fr neu · DACH") — EVWire-Pattern, +27% Conversion-Lift in Teardowns.
2. **Anti-Hype-Manifest-Section** — Differenzierungs-Anker, kein Konkurrent macht es. Verstärkt Polomski-USP "Praxis statt Hype" auf neue Ebene.
3. **Sticky Mobile CTA** — 50% der 2026-Top-Newsletter-Pages haben es, 83% Traffic ist mobil.

### Top-3 Patterns aus `landing/` BEHALTEN

1. **Sample-Issue-Preview-Box mit Email-Header** (Von/An/Betreff) — bereits exemplarisch, Format-Spüren > Beschreibung.
2. **Founding-Member-Slot-Counter + Stripe-Anchor** — Urgency + klare Skala.
3. **DSGVO-vollständige Datenschutz/Impressum**-Pages mit Auftragsverarbeiter-Tabelle.

---

## Dateien (12)

```
landing-ultra/
├── index.html              (Hauptseite mit Hero + Sample + Anti-Hype + 2× Subscribe-Form + Sticky-Mobile-CTA)
├── founding.html           (€149 Founding-Member-Page mit FAQ-Accordion + Free-vs-Paid-Tabelle)
├── sponsoring.html         (Werbung-Rate-Card mit 4 Format-Cards + Bundles + Discovery-Call-CTA)
├── willkommen.html         (Post-Subscribe Confirmation mit Spam-Folder-Tipps)
├── werbung.html            (Werbe-Policy / Transparenz)
├── 404.html                (Witzige Aban-Voice 404)
├── impressum.html          (Schweizer Impressum, kopiert + verfeinert aus landing/)
├── datenschutz.html        (DSGVO-Erklärung mit Cloudflare-Pages-Hinweis)
├── css/styles.css          (Vanilla CSS, mobile-first, 1 File)
├── _redirects              (Cloudflare-Pages Pretty-URLs + 404-Fallback)
├── _headers                (Security Headers: CSP, HSTS, X-Frame, etc.)
└── README.md               (diese Datei)
```

**Total Size:** ~50 KB HTML + ~15 KB CSS = ~65 KB für gesamte Landing (vor gzip).

---

## Vor dem Go-Live

### Pflicht-TODOs (alle `TODO`-Marker in HTML grep'en)

```bash
grep -rn "TODO\|\[BEEHIIV_FORM_ACTION\]\|\[STRIPE_FOUNDING_LINK\]\|\[X\.XXX\]\|\[XX\]" .
```

1. **`[BEEHIIV_FORM_ACTION]`** in `index.html` (2× im Subscribe-Form `action="..."`) ersetzen durch echte beehiiv-Form-URL, z.B. `https://abannews.beehiiv.com/subscribe`.
2. **`[STRIPE_FOUNDING_LINK]`** in `founding.html` (2×) ersetzen durch echten Stripe-Payment-Link.
3. **`X / 100`** Slot-Counter in `founding.html` (2×) und `index.html` Hero-Pill — manuell bei jedem Sale aktualisieren ODER über kleines JS aus einer JSON-Datei pullen.
4. **`[X.XXX]`, `[XX] %`** in `sponsoring.html` Reach-Stats durch echte beehiiv-Analytics-Zahlen ersetzen sobald >100 Subs.
5. **Founder-Foto:** Echtes Headshot von Aban als `assets/aban.jpg` (96×96px min, JPG <30KB optimiert) — und im `index.html` den `<div class="founder-photo">` durch `<img src="assets/aban.jpg" alt="Foto von Aban" width="96" height="96" class="founder-photo">` ersetzen.
6. **`og-image.png`** als `assets/og-image.png` (1200×630px, mit "aban news · ☕ täglich · DACH" Branding) — wird in allen `og:image` Meta-Tags referenziert.
7. **Identity-Count in index.html:** Sobald >100 verifizierte Abos: Pill-Text ändern zu `<strong>[X.XXX] DACH-Profis</strong> lesen mit · Mo–Fr morgens`.

### Optional, aber empfohlen

- **Plausible/Umami** im `<head>` von `index.html` aktivieren (1 Zeile, cookielos, kein Banner nötig).
- **Sitemap.xml** generieren (für Google-Indexierung).
- **robots.txt** mit `Sitemap: https://abannews.de/sitemap.xml` ergänzen.

---

## Deployment auf Cloudflare Pages

### Variante A — Direct-Upload (schnellster Start)

1. Auf <https://dash.cloudflare.com/pages> → "Create a project" → "Direct Upload".
2. Project-Name: `abannews`.
3. Drag-and-drop des kompletten `landing-ultra/` Verzeichnisses (oder als ZIP).
4. Cloudflare Pages erkennt automatisch:
   - `_redirects` für Routing
   - `_headers` für Security-Headers
   - `404.html` als Fallback
5. Build-Settings: keine (statisches Site, kein Build-Step).
6. Production-URL: `https://abannews.pages.dev`.
7. Custom-Domain: in Project-Settings → "Custom domains" → `abannews.de` + `www.abannews.de` hinzufügen. Cloudflare gibt dir CNAME-Werte für deine DNS.

### Variante B — Git-Integration (für ongoing Updates)

```bash
cd "ki news letter"
git init  # falls noch nicht
git add landing-ultra/
git commit -m "feat: landing-ultra v2 based on 100-page research"
git remote add origin git@github.com:allen/abannews.git
git push -u origin main
```

Dann auf Cloudflare Pages:
1. "Connect to Git" → GitHub-Repo wählen.
2. Production-Branch: `main`.
3. Build-Command: leer lassen (kein Build).
4. Build-Output-Directory: `landing-ultra`.
5. Save and Deploy.

Jeder `git push` auf `main` triggert Auto-Deploy.

### DNS bei Hetzner/dyna/wo-auch-immer

- A-Record `abannews.de` → Cloudflare-IP (wird in Custom-Domain-Setup angezeigt).
- CNAME `www.abannews.de` → `abannews.pages.dev`.
- Cloudflare übernimmt SSL-Cert automatisch (Universal SSL).

---

## Test-Checklist vor Domain-Switch

- [ ] Alle TODO-Marker durch echte Werte ersetzt (grep oben).
- [ ] Subscribe-Form testen (Test-Email einreichen → Confirmation-Mail kommt).
- [ ] Stripe-Link in `founding.html` testet erfolgreichen Checkout.
- [ ] `404.html` lädt bei nicht-existenten Routes (`/foobar`).
- [ ] Mobile-View testen (Real-Device + Browser-DevTools): keine horizontalen Scrollbars, Tap-Targets ≥44px, Sticky-CTA erscheint nach Hero-Scroll.
- [ ] Lighthouse-Audit auf Production-URL (Ziel: 100/100/100/100):
  - Performance ≥95
  - Accessibility = 100
  - Best Practices = 100
  - SEO = 100
- [ ] DSGVO-Check: keine 3rd-Party-Requests in DevTools-Network außer Subscribe-POST (beehiiv) und ggf. Stripe-Redirect.
- [ ] Forbidden-Phrases-Check über alle HTML-Texte:
  ```bash
  grep -iE "revolution|bahnbrechend|game.changer|disruptiv|quantensprung|meilenstein|tauche ein|hallo zusammen|liebe community" landing-ultra/*.html
  # → muss 0 Treffer geben
  ```
- [ ] Alle internen Links auflösen (kein 404).
- [ ] Impressum-Adresse vor Go-Live mit Allen abgeglichen (privacy-sensitive).

---

## Conversion-Tracking-Hinweise

Wenn später ein Subscribe-Click-Tracking gewünscht: setze ein `data-ph-event="signup_click"` auf den Hero-Submit-Button und werte über Plausible-Events aus. KEINE personenbezogenen Daten an externe Services.

---

## Iteration-Roadmap (post-launch)

| Quartal | Verbesserung |
|---------|--------------|
| Q3-2026 | Identity-Count mit echter Subs-Zahl. Erste Testimonials von Founding-Members rein. |
| Q4-2026 | A/B-Test Hero-Headline ("3-5 Min" vs. "kein Hype" als USP-Vorrang). |
| Q1-2027 | Logo-Wall in sponsoring.html ("Hier waren schon: …") sobald 5+ Sponsoren. |
| Q2-2027 | Sample-Issue auto-rotate (letzte 3 Tage Issues) statt static. |

---

## Konsultierte Quellen (Auszug)

- `landing/research/100-landing-pages-analysis.md` (eigene Research, 22 fetched + 78 search-only)
- `assets/aban-persona.md` (Voice + Visual)
- `planung/positionierung.md` (USPs)
- `templates/forbidden-phrases-regex.md` (Anti-Hype-Liste)
- `monetarisierung/founding-member-angebot.md`
- `monetarisierung/rate-card.md`
- `ausgaben/probe-2026-05-27.md` (Sample-Issue im Hero-Preview)
- `monetarisierung/cost-optimization-2026-05-27.md` (warum Cloudflare Pages)

---

**Aban-Voice-Konsistenz:** Diese README ist absichtlich pragmatisch, nicht Marketing-y. Wie der Newsletter selbst.

— Aban (über Claude geschrieben, von Aban verantwortet)
