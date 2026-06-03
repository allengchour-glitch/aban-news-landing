# Finanz-Inhalte monetarisieren — Strategie

> Geld-Strategie für die Finanz-Ecke von abannews.com:
> `finanz-rechner.html` (Tool) + `finanz-skills-fuer-selbststaendige.html` (SEO-Hub).
> Ehrlich gerechnet — keine Einkommensgarantie, nur Hebel und realistische Annahmen.

## Worum es geht

Finanz-Themen für Selbstständige haben **hohe kommerzielle Suchintention** (Leute,
die „Stundensatz berechnen", „Geschäftskonto Vergleich", „wie viel Steuern zurücklegen"
googeln, stehen kurz vor einer Entscheidung) und es gibt **echte, gut zahlende
Partnerprogramme** (Fintech/Banking). Das passt zum bestehenden Funnel:
SEO-Seite → kostenloser Rechner → Newsletter-Opt-in → später Produkt/Affiliate.

## Die drei Einnahme-Hebel (nach Aufwand sortiert)

### 1. Newsletter-Opt-in (sofort, kostenlos) — der wichtigste
Jede Finanz-Seite führt auf `abannews.beehiiv.com/subscribe`. Der Rechner ist der
ideale Opt-in-Anlass: Leute, die ihre Zahlen ausrechnen, sind genau die richtige
Zielgruppe. **Das ist der Haupt-Hebel** — die Newsletter-Liste ist das eigentliche
Asset, alles andere baut darauf auf.
- Schon umgesetzt: CTA-Box auf beiden Seiten.
- Nächster Schritt (optional): ein kleiner Lead-Magnet speziell für Finanzen
  (z. B. „Rücklage-Spickzettel" als PDF) im Tausch gegen die E-Mail.

### 2. Fintech-/Banking-Affiliate (mittel, lukrativ)
Geschäftskonten und Finanz-Tools für Selbstständige haben **Provisionen pro
Neukunde** (oft Festbetrag, kein Mini-Prozentsatz). Das passt thematisch direkt zu
Skill 3 („Geschäft und Privat trennen") und Skill 4 („Rechnungen & Cashflow").
- **Regel wie bei den Radars:** nur ehrlich vergleichen, nichts erfinden, Affiliate
  mit `*` kennzeichnen, Transparenzhinweis einblenden. Disclosure-Pflicht (UWG/DSGVO).
- **Echte Programme zum Prüfen** (DACH-Geschäftskonten/Fintech; Konditionen selbst
  verifizieren, nichts hier ist eine zugesagte Rate):
  - Qonto, Finom, Kontist, Holvi, bunq Business — Geschäftskonten mit Partnerprogramm.
  - Accountable, sevDesk, lexoffice — Steuer-/Buchhaltung (überschneidet sich mit
    `buchhaltung-radar/`, dort ggf. zentral pflegen statt doppeln).
- **Umsetzungs-Idee:** Eine Vergleichs-Sektion „Geschäftskonten für Selbstständige"
  ergänzen — entweder als Abschnitt auf der Skill-Seite oder als eigenes
  `geschaeftskonto-radar/` nach dem bestehenden Radar-Muster (generate.py +
  `data/anbieter.json`, Preise/Scores `null` bis geprüft). Letzteres skaliert besser
  und nutzt den vorhandenen, selbst-wachsenden Generator.

### 3. Eigene Produkte (höher, später)
Wenn die Liste wächst, tragen eigene Produkte am meisten (keine Provisions-Abgabe):
- Bestehend: Founding-Mitgliedschaft (€69), Buch „Anti-Hype", Kurs.
- Naheliegende Ergänzung: ein kompaktes Finanz-Workbook/Template-Paket für
  Selbstständige (Kalkulations-Vorlage, Rücklage-Tracker) — als Lead-Magnet gratis
  oder als günstiges Produkt über Lemon Squeezy (Infrastruktur ist da).

## Funnel auf einen Blick

```
SEO: "stundensatz berechnen" / "wie viel steuern zurücklegen"
        │
        ▼
finanz-skills-fuer-selbststaendige.html   (Wissen, Vertrauen)
        │  ──►  finanz-rechner.html        (Tool, Aha-Moment)
        ▼
Newsletter-Opt-in (beehiiv)               ← das zentrale Asset
        │
        ├──► Fintech-/Banking-Affiliate     (passiv, pro Neukunde)
        └──► eigene Produkte (Founding, Buch, Workbook)
```

## Realistische Einordnung (keine Versprechen)

- SEO braucht **Monate**, bis Seiten ranken. Der Rechner kann aber sofort über
  Direktlinks (Newsletter, Social, Reddit-Antworten) Traffic ziehen.
- Affiliate-Einnahmen hängen an Traffic × Conversion × Provision. Bei kleinem Traffic
  ist der **Newsletter-Aufbau** wertvoller als jede Provision — deshalb steht er an #1.
- Engpass ist wie beim Rest des Netzwerks **Reichweite/Verteilung**, nicht das Bauen.

## Konkrete nächste Schritte (Priorität)

1. Beide Seiten in `sitemap.xml` + Pretty-URLs in `_redirects` (erledigt).
2. Finanz-Seiten im Haupt-Funnel verlinken (Footer/Nav von `index.html`, von
   `geld-verdienen-mit-ki.html` und `ki-tools-fuer-selbststaendige.html`).
3. Entscheiden: Geschäftskonten-Vergleich als Abschnitt **oder** eigenes
   `geschaeftskonto-radar/`. Empfehlung: eigenes Radar (skaliert, selbst-wachsend).
4. Optional: Finanz-Lead-Magnet (PDF) für ein stärkeres Opt-in.
5. Affiliate erst aktivieren, wenn echte Programme freigeschaltet und Konditionen
   geprüft sind — bis dahin Direktlinks, kein `*`.

## Leitplanken (nicht verhandelbar)

- Keine erfundenen Zahlen, keine Einkommensgarantien, kein „schnell reich".
- Affiliate immer kennzeichnen + Transparenzhinweis (UWG).
- Rechner bleibt clientseitig, ohne Tracking (Markenversprechen + DSGVO).
- Finanz-Inhalte sind Orientierung, **keine** Steuer-/Anlageberatung — Disclaimer steht.
