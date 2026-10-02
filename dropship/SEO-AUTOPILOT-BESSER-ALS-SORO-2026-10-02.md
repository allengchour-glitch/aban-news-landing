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

## Ausbau 13:00 UTC — «mache das besser»: bestehende Artikel aufwerten (`--auffrischen`)
- GEMESSEN: 320 veröffentlichte Artikel, **231 ohne einen einzigen Produktlink**, nur 24 mit FAQ-JSON-LD.
- `N=15 SCHARF=1 … --auffrischen` (täglich im Aufseher nach dem neuen Artikel): Artikeltext bleibt UNVERÄNDERT; dazu zwei
  markierte, ersetzbare Blöcke — «Passend dazu im Shop» (3–4 kaufbare Produkte, Live-Preis, alle 30 T neu, sonst wieder
  entfernt) und «Häufige Fragen» + FAQPage-JSON-LD (Antworten nur aus dem Artikeltext, Zweitprüfer kontrolliert; vorhandene
  FAQ → nur JSON-LD). Besuchte Artikel zuerst (ShopifyQL 90 T). `NUR=handle` für gezielte Läufe.
- **Relevanz-Fallen (zweimal live gesehen, sofort korrigiert):** «erste verlinkte Kollektion» gab dem Salzlampen-Artikel eine
  Quarzuhr; «längstes Titelwort» gab Silk-Pillowcase Baumwoll- und Ätherische-Öle «Schweizer»-Produkte → jetzt nennt Gemini
  deutsche Produkt-Suchwörter («Seidenkissenbezug», «Diffuser», «Faszienrolle»), geschrieben wird nur, wenn der Produkttitel das
  Wort trägt; kein Treffer → Block entfernt. WebFetch Silk-Pillowcase: 4 Seidenkissenbezüge.
- **Groq hat ein TAGES-Kontingent (200'000 Tokens je Modell)** — der Google-Massenlauf hatte gpt-oss-120b UND qwen geleert, der
  Auffrischer hing in 429-Wartezeiten. Jetzt: Massenlauf auf `gpt-oss-20b` (eigenes Kontingent) und nacheinander statt parallel;
  leeres Tageskontingent = sofortiger, sauberer Abbruch (`TagesKontingentLeer`), Produktblöcke laufen weiter, FAQ wird nachgeholt.
- Stand 13:00: 7 Artikel aufgewertet (2 mit neuer FAQ, 1 JSON-LD aus vorhandener FAQ, 5 Produktblöcke, 1 falscher Block entfernt).

## Betreiber (optional)
- OpenAI-Guthaben aufladen ODER Groq «Dev Tier» (console.groq.com → Billing): beides hebt die Tagesgrenze des Zweitprüfers.
  Ohne: der Auffrischer schafft je Tag so viele FAQ, wie das Kontingent erlaubt — Produktblöcke laufen unabhängig davon.
