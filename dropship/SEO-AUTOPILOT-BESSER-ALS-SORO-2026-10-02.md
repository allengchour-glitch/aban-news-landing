# SEO-Autopilot «besser als Soro» — 02.10.2026

Betreiber: «mach besser als soro» → Soro = KI-SEO-Autopilot (Keywords → Artikel → On-Page-SEO → interne Links → Bild →
täglich veröffentlichen; trysoro.com, Shopify-App «Soro ‑ SEO Autopilot & Content»).

## GEMESSEN (vorher)
- 331 Blog-Artikel (Ratgeber 301, Magazin 30); letzter neuer Ratgeber 25.09.; kein Autopilot im Repo.
- ShopifyQL 90 T (human): Blog-Landeseiten **~45 Sitzungen, 0 Warenkörbe** (beste: «Himalaya-Salzlampe» 18 aus Suche).
  → Menge allein bringt nichts; Soros «1 Artikel/Tag» ohne Nachfrage- und Warenbezug würde hier dasselbe liefern.
- Google-Vorschläge für die Schweiz sind abrufbar (`suggestqueries … gl=ch`) und zeigen echte Nachfrage inkl. CH-Läden
  («hundebett landi», «… qualipet») — die gehören gefiltert.

## GETAN — `automation/seo_autopilot.py` (6 Punkte über Soro hinaus)
| Soro | LuxeStyle-Autopilot |
|---|---|
| Keyword-Recherche (Tool-Daten) | **echte CH-Google-Vorschläge** je Menü-Kollektion; Konkurrenz-/Ortsnamen raus; Ratgeber-Absicht («für», «waschbar», «welche») zuerst |
| schreibt über alles | **nur Themen mit ≥ 6 kaufbaren Produkten** (aktiv, verfügbar, Bild), Bestseller zuerst, Links mit **Live-Preis** |
| — | **Kannibalisierungs-Schutz** gegen alle 331 Artikel (Wortvergleich Titel/Handle) |
| KI-Text | **Fakten-Tor**: Gemini schreibt nur aus Produktdaten; Zweitprüfer (ChatGPT, sonst Groq) prüft jede Produktaussage + falsches Allgemeinwissen; harte Regeln: keine Heilversprechen, Du-Form, «ss», keine Konkurrenznamen, jeder Preis/Link aus den Fakten; 1 Überarbeitung, sonst **nicht** veröffentlichen |
| On-Page-SEO | SEO-Titel/-Text, Kernaussagen oben, **FAQ + FAQPage-JSON-LD** (gemessen: Shopify lässt das Skript im Artikel stehen) |
| — | **Wirkung messen** (`--messen` → `dropship/SEO-AUTOPILOT.md`): Sitzungen/Warenkörbe je Artikel, nach 28 T ohne Besuch «überarbeiten» |
- Kanarienvögel 8/8 (ß, Heilversprechen, Sie-Form, fremder Link, falscher Preis, Konkurrenzname, Vorschlagsfilter, sauber).
- Trockenläufe fanden 2 Fehler im eigenen Tor und behoben sie: «Sie passt …» (3. Person) galt als Höflichkeitsform → nur noch mitten
  im Satz; Ortsanfragen («taschen kaufen bern») raus. Groq-429 (Kontingent mit Google-Fein-Lauf geteilt) → Ausweich auf zweites
  Groq-Modell in `zweitmodell.py`.
- **Erster Artikel live:** «Kleider für Hochzeitsgäste: Dein Guide für den perfekten Auftritt» (Phrase aus CH-Vorschlägen,
  6 Kleider verlinkt, 4 FAQ) — Faktenprüfer fand in Runde 1 «Spitze» ohne Beleg im Material → Runde 2 sauber.
  WebFetch: Seite live, ≥ 5 Produktlinks mit CHF, FAQ vorhanden, kein «ß», keine Sie-Form.
- Aufseher: täglich ab 07 UTC 1 Artikel (Tagesmarke, flock) + Messung.

## OFFEN
- Wirkung nach 14/28 Tagen lesen (Bericht füllt sich selbst). Nächste Ausbaustufe, wenn Daten da sind: bestehende Artikel mit
  Besuchern auffrischen statt nur neue schreiben.
