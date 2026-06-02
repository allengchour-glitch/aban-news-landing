# handwerk-radar — Wärmepumpe- & Solar-Installateure DACH

Lokales **Fachbetrieb-Verzeichnis** für Wärmepumpe, Photovoltaik, Solarthermie und
Stromspeicher im DACH-Raum. Monetarisierung über **Pay-per-Lead** (qualifizierte
Anfragen an Fachbetriebe) + **Featured-Listings**. High-Ticket-Nische
(€11–29K-Projekte → Leads zig € je Stück), bewusst **lokal/transaktional** —
genau das, was AI Overviews *nicht* abgreifen.

> Adaptiert vom bewährten `agenturen-radar`-Muster (generischer Anbieter-Verzeichnis-
> Generator, stdlib, ehrlich-leerer Start mit markierten Platzhaltern).

## Bauen

```bash
cd handwerk-radar && python3 generate.py --out dist
```

Output `handwerk-radar/dist` → Cloudflare Pages (kein Build-Step nötig).
**Domain (geplant):** `handwerk.abannews.com`.

## Daten — Quelle: OpenStreetMap (ODbL)

`data/anbieter.json` wird von **`fetch_anbieter.py`** aus **OpenStreetMap** (Overpass
API) befüllt — echte Heizungs-/Klimatechnik- und Solar-Betriebe in DACH.

```bash
cd handwerk-radar && python3 fetch_anbieter.py   # schreibt data/anbieter.json
```

**Lizenz & Ehrlichkeit (wichtig):**
- OSM-Daten stehen unter **ODbL** → **Attribution Pflicht** (© OpenStreetMap-
  Mitwirkende, im Footer gesetzt) + Quell-Link je Eintrag.
- Einträge sind **real, aber nicht einzeln verifiziert**. Die Leistungs-Kategorie
  ist eine Zuordnung aus dem OSM-`craft`-Tag, **keine Leistungszusage** (der breite
  `hvac`-Tag erzeugt teils Fehl-Zuordnungen — vor dem Bewerben menschlich gegenlesen).
- **Nur Betriebe mit eigener Website** (= klar gewerblich); **keine** E-Mails/Telefon
  republished (DSGVO-konservativ). **Opt-out** per Mail im Footer.
- **Pay-per-Lead bleibt deaktiviert**, bis Betriebe selbst zustimmen (Opt-in via
  `/einreichen`). Kein Verkauf von Leads nicht-einwilligender Betriebe.

- **Achsen:** Leistungen (Wärmepumpe/Photovoltaik/Solarthermie/Stromspeicher),
  Länder (DE/AT/CH), Stadt/Einzugsgebiet.
- **Weitere Quellen denkbar:** Selbst-Einreichung (`/einreichen`), Fachverband-Listen
  (mit Erlaubnis), dena-Energie-Effizienz-Experten (kein offenes API → manuell).

## Monetarisierung

- **Featured-Listing** (`featured: true`) — bezahlt, oben & hervorgehoben.
- **Pay-per-Lead** — Lead-Formular pro Betrieb/Leistung (Anfrage → Betrieb zahlt
  je qualifizierter Anfrage). Nur **öffentliche** Kontakt-/Bezahl-Links, nie Secrets.

## Status / TODO

- [x] Generator (adaptiert), baut sauber
- [x] **Echte Datenquelle erschlossen: OpenStreetMap (ODbL)** — `fetch_anbieter.py`,
  ~70 reale DACH-Betriebe (11 Städte), ODbL-Attribution + Opt-out gesetzt
- [ ] **Menschlicher Verifikations-Pass** vor dem Bewerben (OSM-`hvac`-Fehl-Tags raus,
  Leistungen bestätigen) — Voraussetzung, bevor Lead-Gen aktiviert wird
- [ ] PV-Abdeckung erhöhen (OSM `shop=solar` ist dünn → weitere Quelle/Städte)
- [ ] Stadt-Seiten (`/<stadt>/waermepumpe-installateur`) für lokales SEO
- [ ] Lead-Routing/Billing, Cloudflare-Projekt anlegen, Domain verbinden
