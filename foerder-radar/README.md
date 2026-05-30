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

## Struktur
```
foerder-radar/
├── generate.py        # Generator (stdlib): index+filter, /programm, /region, /art, Recht, sitemap
├── foerderungen.json  # Förderprogramme (kuratierter echter Seed)
├── leadgen.json       # Berater-/Lead-Gen-Slots
└── dist/              # generiert (gitignored)
```

## Vor dem Live-Gang
- Domain: `foerder.abannews.com` (Subdomain, analog Radar) → `BASE_URL` ist bereits gesetzt.
- Rechtsseiten gegenlesen (generiert mit echten Betreiberdaten).
- Cloudflare Pages: Build `cd foerder-radar && python generate.py`, Output `foerder-radar/dist`.

## Status
🟢 Generator + Startdatensatz laufen (24 Seiten aus 16 Programmen).
🟡 Offen: Daten erweitern, Berater-Partner + `leadgen.json`, Domain/Deployment, Newsletter-Teaser.
