# Voll-Gas-Stateboard — autonomer Dauerbetrieb

> Wiederaufsetzpunkt für den autonomen Wellen-Loop. Wird nach jeder Welle / jedem
> Projektschritt aktualisiert. Wenn die Session neu startet: **hier zuerst lesen**,
> dann an der ersten offenen Aufgabe weitermachen.

**Modus:** `/loop` self-paced — 10er-Wellen Branchen-Hubs, verschränkt mit den
Automations-Projekten (P4 → P1 → P2 → P3). Start auf „los", Stop auf „stop".

**Merge-Mechanik in dieser Umgebung (wichtig):** Das Token kann **Draft→Ready nicht**
ausführen (GraphQL/Search-Budget erschöpft → `update_pull_request` schlägt fehl).
`create_pull_request` und `merge_pull_request` laufen über REST und funktionieren.
Branch-Protection verlangt **keine** Pflicht-Checks. Deshalb: **PRs direkt als
non-draft anlegen und per REST squash-mergen.** Hintergrund-Agenten können bei
Kontext-Wechsel verloren gehen → Ergebnisse **früh committen/pushen**.

## Branchen-Hubs (`ki-fuer-*.html`) — Stand: **92 live**

- Welle 5 (52→62, #109): Elektriker, Sanitär/Heizung, Fliesenleger, Trockenbau, Glaser, Metallbauer, Zimmerer, Gerüstbau, Raumausstatter, Schornsteinfeger.
- Welle 6 (62→72, #113): Heilpraktiker, Hörakustiker, Podologen, Zahntechniker, Sanitätshäuser, Kieferorthopäden, Notare, Wirtschaftsprüfer, Sachverständige, Hausmeisterservice.
- Welle 7 (72→82, #130): Sicherheitsdienste, Umzugsunternehmen, Schlüsseldienste, Entrümpelung, Schädlingsbekämpfer, Metzgereien, Eisdielen, Cafés, Buchhandlungen, Fahrradläden.
- Welle 8 (82→92, #136): Sportgeschäfte, Modeboutiquen, Getränkehandel, Fahrschulen, Musikschulen, Tanzschulen, Sprachschulen, Nagelstudios, Tattoostudios, Hochzeitsfotografen.
- **DE-Backlog weitgehend erschöpft** → Fokus wechselt auf **P2-Übersetzungen** (kein Thin-Content-Risiko). Neue DE-Hubs nur bei klar distinkten neuen Branchen.

## Mehrsprachige Hubs (P2, EN+FR+IT) — **92 von 92 Hubs viersprachig — P2 KOMPLETT ✅**

- Charge 1 (#126): handwerker, steuerberater, coaches.
- Charge 2 (#129): immobilienmakler, onlineshops, gastronomie.
- Charge 3 (#134): aerzte, anwaelte, fitnessstudios.
- Charge 4 (#138): friseure, fotografen, kfz-werkstaetten.
- Charge 5 (#140): hotels, apotheken, pflegedienste.
- Charge 6 (#154): finanzberater, versicherungsmakler, reisebueros.
- Charge 7 (#156): nachhilfe, unternehmensberater, werbeagenturen.
- Charge 8 (#157): autohaendler, baeckereien, eventplaner.
- Charge 9 (#158): architekten, hausverwaltungen, vereine.
- Charge 10 (#159): physiotherapeuten, ergotherapeuten, logopaeden.
- Charge 11 (#161): zahnaerzte, psychotherapeuten, kosmetikstudios.
- Charge 12 (#163): tierarztpraxen, optiker, it-dienstleister.
- Charge 13 (#166): garten-landschaftsbau, uebersetzer, reinigungsfirmen.
- Charge 14: winzer, spedition, cateringservice.
- Charge 15 (#198): bestatter, floristen, tonstudios.
- Charge 16 (#200): elektriker, sanitaer-heizung, fliesenleger.
- Charge 17 (#201): trockenbau, glaser, metallbauer.
- Charge 18 (#202): zimmerer, geruestbau, raumausstatter.
- Charge 19 (#204): schornsteinfeger, schreiner, maler. (Handwerk-Familie komplett)
- Charge 20 (#206): dachdecker, goldschmiede, hochzeitsfotografen.
- Charge 21 (#207): heilpraktiker, hoerakustiker, podologen.
- Charge 22 (#208): kieferorthopaeden, sanitaetshaeuser, zahntechniker. (Gesundheit/Dental komplett)
- Charge 23 (#209): notare, wirtschaftspruefer, sachverstaendige.
- Charge 24 (#210): sicherheitsdienste, umzugsunternehmen, schluesseldienste.
- Charge 25 (#258): entruempelung, schaedlingsbekaempfer, hausmeisterservice.
- Charge 26 (#261): musikschulen, tanzschulen, sprachschulen.
- Charge 27 (#263): fahrschulen, nagelstudios, tattoostudios.
- Charge 28 (#264): cafes, eisdielen, metzgereien.
- Charge 29 (#266): brauereien, getraenkehandel, fahrradlaeden.
- Charge 30 (#267): buchhandlungen, modeboutiquen, sportgeschaefte.
- Charge 31 (final): ernaehrungsberatung, hebammen. **→ alle 92 Hubs viersprachig (de/en/fr/it), 276 i18n-Hub-URLs.**
- Muster: pro Hub DE um hreflang-Block + nav-Sprach-Switch ergänzen, je `en/ fr/ it/`-Datei
  (eigene canonical, 5 reziproke hreflang-Zeilen inkl. x-default=de, og:locale, WebPage-inLanguage,
  FAQ pro Sprache wortgleich), sitemap +3/Hub (priority 0.7). FAQ-Markup variiert je Hub (dl/dt/dd ODER details/summary).
  **Achtung 1:** manche DE-Originale haben pre-existing FAQ-Drift (JSON-LD↔sichtbar) — bei i18n DE-Inhalt unverändert lassen.
  **Achtung 2:** DE-Hubs haben inzwischen einen Tools-CTA-`<aside data-aban-tools-cta>` vor `</main>` (DE-only, Übersetzungen ohne). i18n-Branches **immer von aktuellem `main` rebasen**, sonst geht der aside verloren.
- **Noch einsprachig: KEINE — alle 92 Hubs sind viersprachig.** Nächster sinnvoller P2-Schritt: optional die anderen Money-/Cornerstone-Pages mehrsprachig machen, oder neue distinkte DE-Hubs + Übersetzung.


## Automations-/Radar-Projekte

- **P4 — Newsletter-Automation (#110): ✅ gemerged.** link_checker.py, newsletter_scheduler.py, +Feeds, link-checker.yml.
- **P1 — Surfer-Content (#111): ✅ gemerged.** critique + semrush-Vergleich; `_surfer`-Affiliate bleibt deaktiviert bis echter Code.
- **P3 — Radars: ✅ alle vier gemerged:** newsletter-radar (#108), buchhaltung-radar (#119), chatbot-radar (#121), voice-radar (#123).
  - **Offen (Nutzer, manuell):** CF-Pages-Projekte + Subdomains anlegen für `newsletter`/`buchhaltung`/`chatbot`/`voice` (Deploy ist secret-gated). Ebenso `kurse`/`prompts`/`agenturen`/`dropshipping` laut PROJEKT.md.
- **P2 — Mehrsprachige Hubs (EN+FR+IT): ✅ KOMPLETT** — alle 92 Hubs viersprachig (Charge 1–31, 276 i18n-URLs).
- **Cornerstone-/Money-Pages i18n: ✅ KOMPLETT** — alle viersprachig; letzte Lücke `geld-verdienen-mit-ki` gefüllt (#286).
- **Qualitäts-Pass — Tools-CTA-aside auf i18n-Hubs: ✅ (#287)** — alle 276 Übersetzungen haben jetzt den lokalisierten Tools-CTA-Block (wie DE).

## Status: gesamter Plan-Umfang erledigt ✅
DE-Hubs (92) · i18n (92×4=368 Seiten) · 4 Radars · P4 · P1 · Cornerstone-i18n · CTA-Konsolidierung — alles auf `main`.

## Nächste offene Aufgaben (vom User freigegeben: alle 3 Tracks + mergen)

1. **Welle 9+ — neue, klar distinkte Branchen-Hubs** (direkt viersprachig anlegen). NUR echte neue Nischen (kein Thin-Content). Kandidaten z. B.: Photovoltaik-/Solarteure, Wärmepumpen-Installateure, Smart-Home-Installateure, Energieberater, Vermessungsbüros, Ingenieurbüros, Änderungsschneidereien, Hundesalons, Estrichleger, Rollladenbauer, Bodenleger, Uhrmacher, Druckereien, Werbetechnik.
2. **Qualitäts-Pass (weiter):** pre-existing FAQ-Drift in alten DE-Hubs (Wellen 1–4) fixen; `tools/link_checker.py` laufen lassen + Bericht; hreflang-/OG-Audit.
3. **Dropship-Code-Seite (Option 1, später):** auf `claude/dropship-lade-memory-SrAs5` an Reel-Pipeline/Skripten/Doku arbeiten — **Achtung: diese Session hat KEINE Shopify-MCP-Tools**, nur Code-/GitHub-Seite möglich.

## Backlog DE-Hubs

Der ursprüngliche Backlog (Handwerk, Gesundheit, Dienstleistung, Handel, Kurse/Kreativ) ist mit Wellen 1–8 abgearbeitet (92 Hubs). Neue DE-Hubs nur noch bei klar distinkten, nachgefragten Branchen — sonst P2-Übersetzungen priorisieren.


## Hub-Pipeline (pro Welle, bewährt)

1. Branch `claude/branchen-hubs-wN` von aktuellem `main`; Slug-Kollisionscheck.
2. 10 Agenten parallel, je `ki-fuer-<slug>.html` aus Vorlage `ki-fuer-handwerker.html`
   (4–5 Use-Cases, `.limits`, WebPage+FAQPage-JSON-LD mit **4 FAQ wortgleich**, du-Form, anti-hype). Sensible Branchen: klare „keine Beratung/Diagnose"-Grenze + Datenschutz.
3. Zentrale Validierung (FAQ wortgleich, JSON-LD valide, `FORBIDDEN`=0, keine „Sie"/„!!", canonical/og/skip/#main/CTA/radar).
4. `generate_branchen_og.py` +10 (alte byte-identisch), `sitemap.xml` +10, `CLAUDE.md`-Zähler hoch.
5. Commit → push → **non-draft PR → REST squash-merge** → main syncen → nächste Einheit.

## Guardrails (Kurzform)

Kein Thin-Content · keine erfundenen Preise/Scores/Affiliate-Codes (`_`-deaktiviert /
„[Redaktion: prüfen]") · anti-hype, du-Form, echte Umlaute · sensible Branchen mit
klarer Grenze · kein neues Tracking · je Workstream eigener Branch/PR.

## Offene Kosmetik

- Superseded Draft-PRs **#103–#106** (durch #109–#112 ersetzt) können geschlossen werden — nicht auto-schließbar in dieser Umgebung.
