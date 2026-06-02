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

## Mehrsprachige Hubs (P2, EN+FR+IT) — **27 Hubs viersprachig**

- Charge 1 (#126): handwerker, steuerberater, coaches.
- Charge 2 (#129): immobilienmakler, onlineshops, gastronomie.
- Charge 3 (#134): aerzte, anwaelte, fitnessstudios.
- Charge 4 (#138): friseure, fotografen, kfz-werkstaetten.
- Charge 5 (#140): hotels, apotheken, pflegedienste.
- Charge 6 (#154): finanzberater, versicherungsmakler, reisebueros.
- Charge 7 (#156): nachhilfe, unternehmensberater, werbeagenturen.
- Charge 8 (#157): autohaendler, baeckereien, eventplaner.
- Charge 9: architekten, hausverwaltungen, vereine.
- Muster: pro Hub DE um hreflang-Block + nav-Sprach-Switch ergänzen, je `en/ fr/ it/`-Datei
  (eigene canonical, 5 reziproke hreflang-Zeilen inkl. x-default=de, og:locale, WebPage-inLanguage,
  FAQ pro Sprache wortgleich), sitemap +3/Hub (priority 0.7). FAQ-Markup variiert je Hub (dl/dt/dd ODER details/summary).
  **Achtung:** manche DE-Originale haben pre-existing FAQ-Drift (JSON-LD↔sichtbar) — bei Neuwellen FAQ wortgleich anlegen, bei i18n DE-Inhalt unverändert lassen.
- **Nächste i18n-Chargen:** je 3 Hubs/Charge aus den 83 noch einsprachigen Hubs (z. B. friseure, fotografen, kfz-werkstaetten, hotels, apotheken, pflegedienste, …).

## Automations-/Radar-Projekte

- **P4 — Newsletter-Automation (#110): ✅ gemerged.** link_checker.py, newsletter_scheduler.py, +Feeds, link-checker.yml.
- **P1 — Surfer-Content (#111): ✅ gemerged.** critique + semrush-Vergleich; `_surfer`-Affiliate bleibt deaktiviert bis echter Code.
- **P3 — Radars: ✅ alle vier gemerged:** newsletter-radar (#108), buchhaltung-radar (#119), chatbot-radar (#121), voice-radar (#123).
  - **Offen (Nutzer, manuell):** CF-Pages-Projekte + Subdomains anlegen für `newsletter`/`buchhaltung`/`chatbot`/`voice` (Deploy ist secret-gated). Ebenso `kurse`/`prompts`/`agenturen`/`dropshipping` laut PROJEKT.md.
- **P2 — Mehrsprachige Hubs (EN+FR+IT): 🔄 laufend** — 6 Hubs fertig (s. o.), weitere Chargen offen.

## Nächste offene Aufgabe

→ **P2 Charge 3** (weitere Top-Hubs EN+FR+IT) **und/oder** Welle 8 (10 neue DE-Hubs).
Beide laufen abwechselnd weiter (self-paced Loop).

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
