# Nächste Schritte — was nur du klicken kannst

> Stand-Doku für Aban. Alles Baubare ist erledigt (Claude, autonom). Hier steht der
> **menschliche Rest**: Klicks, Secrets, Konten — nach Wirkung sortiert. Strategie:
> kein Kundenkontakt → Geld kommt aus **Reichweite + Produkten**, nicht aus Verkauf.
> Engpass ist jetzt **veröffentlichen & live schalten**, nicht bauen.

## Schon erledigt (autonom)
- Automatisierungs-Radar gebaut + gemergt (371 Seiten, selbst-wachsend, KI-Funktionen).
- Finanz-Ecke: `finanz-rechner.html`, `finanz-skills-fuer-selbststaendige.html`,
  Lead-Magnet `downloads/finanz-spickzettel.pdf` (PR offen).
- Content-Start-Paket: `docs/CONTENT-START-PAKET.md` (fertige Texte zum Abschicken).

## Reihenfolge der Klicks (oben = größter Hebel)

### 1. Finanz-PR mergen  ·  ~1 Min
PR #150 (`claude/finanz-skills-rechner`) prüfen und mergen. Danach sind Rechner +
Skills-Seite + Spickzettel auf abannews.com live (Auto-Deploy auf `main`).

### 2. Newsletter sichtbar machen  ·  größter langfristiger Hebel
Der Newsletter ist dein wichtigstes Asset (1-zu-viele, kein Kontakt nötig).
- Prüfen, dass alle „Abonnieren"-Buttons auf `abannews.beehiiv.com/subscribe` zeigen (tun sie).
- Den **Finanz-Spickzettel** als Opt-in-Anreiz in beehiiv hinterlegen (Welcome-Mail mit
  Download-Link), damit jede Anmeldung sofort etwas bekommt.

### 3. Content veröffentlichen  ·  wöchentlich, async, kein Kontakt
- Texte aus `docs/CONTENT-START-PAKET.md` abschicken: 1 Launch-Newsletter + die
  LinkedIn-Posts (1–2 pro Woche). Einfach kopieren, posten, fertig.
- Optional automatisiert: `ANTHROPIC_API_KEY` setzen (s. u.), dann liefert
  `automatisierung-radar/ai/ki_helfer.py content` neue Entwürfe auf Knopfdruck.

### 4. Radars live schalten (Cloudflare Pages)  ·  je ~5 Min, reine Klicks
Pro Radar ein Pages-Projekt + Subdomain. Am einfachsten **automatisch**:
- **Repo-Secrets setzen** (GitHub → Settings → Secrets and variables → Actions):
  `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID`.
  → Danach legen die Build-Workflows die Projekte beim nächsten Lauf **selbst an**
  und deployen. (Aktuell werden die Deploy-Schritte „skipped", weil das Token fehlt.)
- Dann je Projekt im Cloudflare-Dashboard die **Custom Domain** zuordnen
  (`automatisierung.abannews.com`, `voice.abannews.com`, …).
- Details/Liste: `docs/GO-LIVE-RADARS.md`.

### 5. KI-Funktionen aktivieren (optional)  ·  ~5 Min
`ANTHROPIC_API_KEY` (von console.anthropic.com) an zwei Stellen:
- **GitHub-Secret** `ANTHROPIC_API_KEY` → wöchentlicher Daten-Wächter läuft.
- **Cloudflare-Pages-Variable** im Projekt `automatisierung` → der Frage-Assistent
  unter `/fragen.html` wird live.
- **Wichtig:** in der Anthropic-Console ein **Monats-Limit** setzen (z. B. 20–30 CHF),
  damit ein viraler Tag keine Überraschungsrechnung bringt.

### 6. Monetarisierung scharf schalten (wenn Reichweite kommt)
- **Affiliate** in den Radars: echten Partner-Link eintragen, führendes `_` im Key
  entfernen (siehe je `affiliate.json`). Erst aktivieren, wenn Programm freigeschaltet.
- **Founding €69** (PayPal-Link aktiv), **Buch** (Lemon Squeezy) — Self-Checkout, kein
  Kontakt. Strategie-Hintergrund: `docs/FINANZ-MONETARISIERUNG.md`.

## Geld-Leitplanke (aus der Finanz-Session)
- Bei 0 Einnahmen: Kosten ~0 halten, nichts „auf Verdacht" kaufen, Budget als Runway sparen.
- Ausgaben dürfen nur **Tempo oder Sicherheit** kaufen — nie Bequemlichkeit.
- Reihenfolge der Finanzen privat: getrennte Konten → Steuer-Rücklage → Preis → Puffer → Vorsorge.
