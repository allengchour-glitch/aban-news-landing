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

## Daten — STRENGE INTEGRITÄT

`data/anbieter.json` enthält **nur echte, verifizierte Betriebe**. Aktuell **leer**
(2 markierte Struktur-Platzhalter, `platzhalter: true`). **Keine** Firmen/Namen/
Kontakte erfinden. Vor Live-Gang: Platzhalter löschen, echte Einträge einpflegen.

- **Datenquelle:** Handwerkskammer-Verzeichnisse, Fachverbände, oder
  Selbst-Einreichung über den `/einreichen`-Funnel.
- **Achsen:** Leistungen (Wärmepumpe/Photovoltaik/Solarthermie/Stromspeicher),
  Länder (DE/AT/CH), Stadt/Einzugsgebiet.

## Monetarisierung

- **Featured-Listing** (`featured: true`) — bezahlt, oben & hervorgehoben.
- **Pay-per-Lead** — Lead-Formular pro Betrieb/Leistung (Anfrage → Betrieb zahlt
  je qualifizierter Anfrage). Nur **öffentliche** Kontakt-/Bezahl-Links, nie Secrets.

## Status / TODO

- [x] Generator (adaptiert), baut ehrlich leer
- [ ] Echte Datenquelle erschließen (Kammer/Verband) — **der eigentliche Hebel**
- [ ] Stadt-Seiten (`/<stadt>/waermepumpe-installateur`) für lokales SEO ergänzen
- [ ] Lead-Routing/Billing, Cloudflare-Projekt anlegen, Domain verbinden
