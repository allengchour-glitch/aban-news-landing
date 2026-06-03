# Förder-Radar

> Automatisiertes DACH-Fördermittel-Verzeichnis (programmatic, statisch). Macht die
> unübersichtliche Förderlandschaft sortier- & filterbar. Verdient über **Lead-Gen**
> (Fördermittel-Berater zahlen für qualifizierte Anfragen) + Premium-Platzierung.

Marktlücken-Begründung: `../ki-geld-projekt/MARKTLUECKEN-2026.md` (Chance #2 — AIO-resistent,
höhere Umsatz-Ökonomie als Affiliate, nutzt denselben Programmatic-Motor wie der KI-Tools Radar).

## Warum das funktioniert
- **AIO-resistent:** transaktionale/spezifische Förder-Suchen verlieren kaum Klicks an Google AI Overviews.
- **Echte Lücke:** offizielle foerderdatenbank.de ist berüchtigt unübersichtlich (50.000+ Programme).
- **Lead-Ökonomie:** Berater-Leads sind zig € wert — viel mehr als Affiliate-Cents.
- **Audience-Fit:** KI-Förderung boomt; passt direkt zum Aban-News-Publikum.

## Ehrlichkeits-Prinzip (wichtig)
Förderbeträge & Fristen ändern sich. Diese Seite **erfindet keine Zahlen** — sie beschreibt, *wofür*
ein Programm ist, verlinkt die **offizielle Quelle** und zeigt überall „Angaben ohne Gewähr".

## Nutzung
```bash
python generate.py            # baut nach ./dist
```
Liest `foerderungen.json` (Programme) + `leadgen.json` (Berater-Slots). Pure stdlib, keine Abhängigkeiten.

## Geld verdienen — 3 Schritte
1. **Fördermittel-Berater als Partner gewinnen** (Pay-per-Lead, z. B. 20–80 €/qualifizierte Anfrage,
   oder Monatspauschale für Premium-Platzierung). Pro Region/Art unterschiedliche Partner möglich.
2. **Deren Landingpage-URL in `leadgen.json` eintragen** (pro Programm-id oder `_default`).
   Die Seite zeigt den Slot automatisch als „Anzeige" (UWG-konform).
3. **Rebuild** → der Beratungs-CTA erscheint auf den Programmseiten.

## Daten erweitern (für den Vollbetrieb)
Der Startdatensatz enthält ~16 große, echte Programme (Bund/EU/AT/CH). Für volle Abdeckung:
Export aus foerderdatenbank.de / aws.at / FFG / Innosuisse ins Schema von `foerderungen.json`
überführen (Feld-Mapping: name, traeger, region, zielgruppe[], bereich[], art, url, kurz).

## Förder-Matcher (3-Fragen-Funnel + Lead-Gen)
`/matcher.html` (plus Teaser auf der Startseite) ist ein clientseitiger Funnel: drei Fragen —
**Region, Vorhaben/Zweck, Unternehmensgröße** — filtern die echten Programme aus `foerderungen.json`
und zeigen passende Treffer mit Link zur offiziellen Quelle. Reines Vanilla-JS im Browser, **kein
Tracking, kein Backend**.

- **Klassifikation:** `ZWECK_GROUPS` / `GROESSE_GROUPS` in `generate.py` gruppieren die vorhandenen
  `bereich`- bzw. `zielgruppe`-Werte in wenige auswählbare Buckets (Teil-Match). Es werden **keine
  Programme/Beträge erfunden** — passt nichts, taucht nichts auf. Fallback-Buckets („Etwas anderes" /
  „Egal") zeigen alle Treffer der übrigen Dimensionen.
- **Lead-Capture:** am Ende des Funnels eine ehrliche Beratungs-Anfrage. Ist in `leadgen.json` ein
  `_default`-Slot gesetzt, erscheint er als „Anzeige". Zusätzlich/immer ein DSGVO-konformes
  Mail-Fallback-Formular (Einwilligungs-Checkbox → baut einen `mailto:hallo@abannews.com`-Link,
  kein erfundener Berater, kein Fake-Preis).
- Daten werden als `<script type="application/json">` eingebettet; Logik in `dist/matcher.js`
  (Quelle: `MATCHER_JS` in `generate.py`).

## Struktur
```
foerder-radar/
├── generate.py        # Generator (stdlib): index+filter, Matcher, /programm, /region, /art, Recht, sitemap
├── foerderungen.json  # Förderprogramme (kuratierter echter Seed)
├── leadgen.json       # Berater-/Lead-Gen-Slots (auch fürs Matcher-Ende)
└── dist/              # generiert (gitignored): + matcher.html, matcher.js
```

## Vor dem Live-Gang
- Domain: `foerder.abannews.com` (Subdomain, analog Radar) → `BASE_URL` ist bereits gesetzt.
- Rechtsseiten gegenlesen (generiert mit echten Betreiberdaten).
- Cloudflare Pages: Build `cd foerder-radar && python generate.py`, Output `foerder-radar/dist`.

## Status
🟢 Generator + Startdatensatz laufen (126 Seiten aus 86 Programmen, inkl. Förder-Matcher).
🟡 Offen: Daten weiter ausbauen, Berater-Partner + `leadgen.json`-Slots, Domain/Deployment.
