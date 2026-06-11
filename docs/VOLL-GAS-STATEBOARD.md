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

- **2026-06-06 Homepage-Redesign LIVE:** `index.html` auf Brevo/Mailchimp-Stil umgestellt (Gradient-Hero+Highlight, Mail-Mock, große Pill-CTAs, ehrliche Stats-Band ohne Fake-Zahlen, Feature-Cards, How-it-works-Schritte, dunkles CTA-Band, 4-spaltiger Footer). Signup/Consent/Double-Opt-in/Schema beibehalten, anti-hype, kein Fake-Social-Proof. **CI-Hinweis:** GitHub-Actions-Deploy `wrangler … --project-name=radar` scheitert an CLOUDFLARE_API_TOKEN (Auth 10000) — pre-existing Infra-/Secret-Problem, betrifft alle Commits, Live-Deploy läuft über Cloudflare-Git-Integration. User-To-do: Token mit Pages:Edit neu setzen.

## 🛠️ KI-Werkzeug (`ki-werkzeug.html`) — Handoff für nächste Session

- **Stand:** live (PR #477), **nur DE**, **Demo** — Texte-Generator (Produkttext/Social/Bewertungs-Antwort/E-Mail)
  + KI-Fahrplan; Entwürfe entstehen aus **Vorlagen im Browser** (kein Upload). Verlinkt aus `online-tools.html`
  + in `sitemap.xml`. 3-Schritt-Anleitung + 5er-FAQ (sichtbar==JSON-LD) sind drauf.
- **Phase-2-Schalter im JS** (oben in `ki-werkzeug.html`): `AI_ENDPOINT` (echte KI über Cloudflare-Worker, API-Key
  serverseitig verstecken) · `STRIPE_PRO_LINK` (echter Checkout) · `FREE_TEXT_LIMIT=5` · `FREE_PLAN_LIMIT=1`.
- **Offene Folge-Schritte (vom User gewünscht, Entscheidungen teils offen):**
  1. **Funnel:** `/ki-werkzeug.html`-Button in den `data-aban-tools-cta`-Asides der Hubs. Reuse **idempotentes**
     `tools/add_branchen_funnel.py` (+ `make funnel`); pflegt aktuell **DE+EN**, **FR/IT müssen ergänzt** werden.
     User-Tendenz: „verlinke die Themen" → wollte Funnel; Frage „nur DE vs. alle 4 Sprachen" war **offen**
     (Tool ist deutsch → DE-Hubs sind die saubere UX). Vor Bulk-Edit: `git fetch`, idempotenz prüfen.
  2. **Hilfe/Bilder:** ausführlichere Anleitung + Hilfe/FAQ-Footer-Link gewünscht; Site nutzt **keine Screenshots**
     (für Grafik Pillow wie `generate_tools_og.py`). Mit/ohne Erklär-Bild war **offen**.
  3. **Kosten-Limit:** User-Sorge „wenn zu viel benutzen → Kosten". Client-Limit (5/Tag) reicht NICHT gegen
     Missbrauch der echten KI → in Phase 2 **serverseitig** im Worker kappen (z. B. Pro fair-use ~100/Tag +
     Monats-Kostenbremse). Im Plan vermerkt.
  4. **Preis:** „CHF 9/Monat" ist **Platzhalter** (JSON-LD + Anzeige) — User sagte „9 ok", aber **bestätigen**.
  5. Optional: EN/FR/IT-Versionen der Tool-Seite.
- **Voller Plan:** `~/.claude/plans/verlinke-die-themen-am-nifty-swan.md`.

## Branchen-Hubs (`ki-fuer-*.html`) — Stand: **334 live, alle viersprachig (de/en/fr/it ≈ 1336 Seiten)** 🎉 300+ (Parallel-Session zählt evtl. anders)

> **▶️ LÄUFT WIEDER (User, 2026-06-08): „fahre mit Wellen weiter".** Rest grob ~15–20% des
> DACH-Branchenkatalogs. (Frühere Pause aufgehoben.) Loop läuft sonst Welle für Welle (3 Branchen × 4 Sprachen + OG/Sitemap/Stateboard,
> PR direkt non-draft + REST-Squash-Merge). **Beim Wiederaufnehmen Slugs IMMER zuerst gegen aktuelles `main`
> prüfen** (eine Parallel-Session baut mit). **Kuratierte freie & saubere Kandidaten für nächste Welle(n):**
> `zeitschriftenhandel` (Presse/Kiosk), `drogerie` (Retail, keine Heil-/Gesundheitsversprechen),
> `tabakwaren` (sensibel: Tabakwerbeverbot/Jugendschutz), `naturkostladen` (Bio — vor Bau Überlappung mit
> reformhaus/unverpacktladen/hofladen prüfen), `kuerschner` (sensibel: CITES/Artenschutz/Herkunft),
> `koffergeschaeft` (Reisegepäck — grenzt an lederwaren), `baumfaellung`/`gartenpflege` (grenzen an
> baumpflege/garten-landschaftsbau → klar abgrenzen). **MEIDEN (dünne Duplikate):** `sattler`≈sattlerei,
> `spielwarenladen`≈spielwarengeschaeft, `anglerbedarf`≈angelladen, `schreibwarenladen`≈schreibwarengeschaeft,
> `buchbinder`≈buchbinderei, `parfümerie`≈parfuemerie, `modelleisenbahn`≈modellbaugeschaeft, `glasereibedarf` (zu B2B/dünn).
> **Alternative Stoßrichtung (User-Frage offen):** statt mehr Hubs auf **Monetarisierung** umschwenken
> (echte Affiliate-Links in `data-aban-tools-cta`, Analytics/Search-Console scharf, „verkaufbar-machen"-Roadmap).

- Wellen 1–8 (→92, PRs bis #136): Handwerk/Gesundheit/Dienstleistung/Handel/Kurse — kompletter Ursprungs-Backlog.
- Welle 9 (92→95, #289): Solarteure, Wärmepumpen, Energieberater — **direkt viersprachig** angelegt.
- Welle 10 (95→98, #291): Smart-Home, Vermessungsbüros, Hundesalons — **direkt viersprachig**.
- Welle 11 (98→101): Estrichleger, Bodenleger, Ingenieurbüros — **direkt viersprachig**.
- Welle 12 (101→104, #295): Ladestationen (Wallbox), Rollladenbauer, Änderungsschneidereien — **direkt viersprachig**.
- Welle 13 (104→107, #296): Uhrmacher, Druckereien, Werbetechnik — **direkt viersprachig**.
- Welle 14 (107→110, #298): Brandschutz, Aufzugswartung, Polsterei — **direkt viersprachig** (Brandschutz/Aufzug mit Sicherheits-/„keine-Prüfung-durch-KI"-Grenze).
- Welle 15 (110→113, #321): Gartencenter, Parkettleger, Kälteanlagenbau — **direkt viersprachig** (Kälte/F-Gase mit klarer Grenze).
- Welle 16 (113→116, #322): Brunnenbau, Wintergarten, Zaunbau — **direkt viersprachig** (Brunnenbau mit hydrogeologisch/wasserrechtlicher Grenze).
- Welle 17 (116→119, #323): Saunabau, Pflasterbau, Natursteinbetriebe — **direkt viersprachig** (Naturstein mit Pietät-Hinweis Grabstein-Kontext).
- Welle 18 (119→122, #324): Treppenbau, Ofen-/Kaminbau, Baumpflege — **direkt viersprachig** (Ofenbau mit Schornstein-/Abgas-Grenze, Baumpflege mit Artenschutz-/Genehmigungs-Grenze).
- Welle 19 (122→125, #325): Spenglerei, Abdichtungstechnik, Poolbau — **direkt viersprachig** (Abdichtung mit Vor-Ort-Diagnose-Grenze, Pool mit Wasserchemie-/Hygiene-Grenze).
- Welle 20 (125→128, #326): Schimmelsanierung, Betonsanierung, Lüftungsbau — **direkt viersprachig** (Schimmel mit Gesundheits-/keine-Diagnose-Grenze, Beton mit Statik-Grenze).
- Welle 21 (128→131, #327): Entkernung, Fassadenbau, Blitzschutz — **direkt viersprachig** (Entkernung mit Schadstoff-/Asbest-Grenze, Blitzschutz mit Auslegungs-/Prüf-Grenze).
- Welle 22 (131→134, #329): Fensterbau, Markisenbau, Denkmalpflege — **direkt viersprachig** (DE-Hubs zuerst gebaut, Übersetzungen nach Session-Suspend per Recovery-Agenten nachgezogen).
- Welle 23 (134→137, #330): Torbau, Akustikbau, Wasseraufbereitung — **direkt viersprachig** (Torbau mit Sicherheitsprüf-Grenze, Wasseraufbereitung mit Trinkwasser-/Gesundheits-Grenze).
- Welle 24 (137→140, #331): Küchenstudio, Wasserschadensanierung, Terrassenbau — **direkt viersprachig** (Wasserschaden mit Leckortung-/Gutachter-Grenze).
- Welle 25 (140→143, #332): Carportbau, Treppenlift, Gartenteichbau — **direkt viersprachig** (Treppenlift senioren-sensibel mit Bedarfs-/Zuschuss-Grenze, Carport mit Statik-/Schneelast-Grenze).
- Welle 26 (143→146, #333): Rohrreinigung, Industriereinigung, Holzhausbau — **direkt viersprachig** (Rohrreinigung mit Anti-Abzock-/Diagnose-Grenze, Industriereinigung mit Gefahrstoff-/Arbeitssicherheits-Grenze).
- Welle 27 (146→149, #334): Glasreinigung, Winterdienst, Graffitientfernung — **direkt viersprachig** (Winterdienst mit Haftungs-/Verkehrssicherungspflicht-Grenze, Glasreinigung mit Höhenarbeits-Grenze).
- Welle 28 (149→152): Kanalsanierung, Containerdienst, Spielplatzbau — **direkt viersprachig** (Spielplatzbau kindersicherheits-sensibel mit Norm-/Prüf-Grenze, Container mit Abfall-Einstufungs-Grenze).
- Welle 29 (152→155, #336): Sicherheitstechnik, Tiefbau, Abbruch — **direkt viersprachig** (Sicherheitstechnik DSGVO-/Risikoanalyse-Grenze, Tiefbau Grabenverbau-/Bodengutachten-Grenze, Abbruch Schadstoff-/Statik-Grenze). Tiefbau-Übersetzungen nach Session-Transition per Recovery-Agent nachgezogen.
- Welle 30 (155→158, #337): Hausnotruf, Baumaschinenvermietung, Partyverleih — **direkt viersprachig** (Hausnotruf sehr sensibel: „KI ist keine Notrufzentrale"; Baumaschinen/Party mit Sicherheits-/Haftungs-Grenze). Während „pause" gebaut, bei „weiter" ausgeliefert.
- Welle 31 (158→161, #338): Autoaufbereitung, Autoglas, Reifenservice — **direkt viersprachig** (neue Fahrzeug-Service-Familie, distinkt von kfz-werkstatt; Autoglas mit ADAS-Kalibrierungs-Grenze, Reifen mit Freigabe-/Profiltiefen-Grenze).
- Welle 32 (161→164, #339): Abschleppdienst, Motorradwerkstatt, Wohnmobilservice — **direkt viersprachig** (Abschlepp notfall-sensibel „KI ist keine Einsatzzentrale"; Wohnmobil mit G607-Gasprüfung-Grenze). Lehre: Wait-Loop `[ -f ]` kann 0-Byte-Datei mid-write erfassen → vor Validierung kurz auf Dateigröße >5 KB pollen.
- Welle 33 (164→167, #340): Kfz-Gutachter, Fahrzeugfolierung, Bootsservice — **direkt viersprachig** (Kfz-Gutachter rechtlich/Unabhängigkeit „kein gerichtsfestes Gutachten durch KI" + Mandantendaten-Schutz; Folierung mit Tönungs-Zulassungs-Grenze). Wait-Loop nun mit `>5 KB`-Poll.
- Welle 34 (167→170, #341): Konditorei, Hundeschule, Weinhandlung — **direkt viersprachig** (Konditorei mit LMIV-Allergen-Grenze, Hundeschule mit keine-Ferndiagnose-Grenze, Weinhandlung mit Sensorik-/Jugendschutz-Grenze). Neue Familie: Lebensmittelhandwerk/Tier-Service/Fachhandel.
- Welle 35 (170→173): Barbershop, Sonnenstudio, Tierpension — **direkt viersprachig** (Sonnenstudio sehr sensibel: UV-/Strahlenschutz, keine Gesundheits-/Fototyp-Beratung, Jugendschutz <18; Tierpension Tierwohl-Grenze). **Account-Nutzungsgrenze** mitten in der Welle → die 3 Bau-Agenten lieferten nur DE/EN/FR, IT-Dateien per Recovery-Agent nachgezogen. Lehre: bei „session limit" liefern Agenten oft 3/4 Sprachen — fehlende Sprache gezielt per Recovery-Agent ergänzen.
- Welle 36 (173→176, #343): Foodtruck, Juwelier, Kaffeerösterei — **direkt viersprachig** (Foodtruck LMIV/HACCP-Grenze, Juwelier Echtheits-/Wertgutachten-Grenze, Kaffeerösterei Cupping-/Sensorik-Grenze). Erneut Account-Limit → 2 IT-Dateien (Foodtruck/Kaffeerösterei) per Recovery-Agent.
- Welle 37 (176→179, #344): Feinkost, Wimpernstudio, Osteopathie — **direkt viersprachig** (Feinkost LMIV-/Theken-Grenze, Wimpernstudio Auge-/Patch-Test-Grenze, Osteopathie sehr sensibel Heilkunde: keine Anamnese/Diagnose/Behandlung/Heilversprechen, Schweigepflicht).
- Welle 38 (179→182, #345): Yogastudio, Fischhandel, Spielwarengeschäft — **direkt viersprachig** (Yoga Gesundheits-/keine-Haltungskorrektur-Grenze, Fisch LMIV-/Frische-/Kühlketten-Grenze, Spielwaren CE-/Altersfreigabe-Grenze + Zurückhaltung bei Kinderdaten).
- Welle 39 (182→185, #346): Kampfsportschule, Schwimmschule, Reitschule — **direkt viersprachig** (Schwimmschule SEHR sensibel: KI ersetzt nie die Wasseraufsicht/Kinder-Ertrinkungsschutz; alle drei mit Aufsichtspflicht-/Verletzungs-Grenze, keine Kinder-/Gesundheitsdaten in KI-Tools).
- Welle 40 (185→188, #347): Skischule, Tauchschule, Kletterhalle — **direkt viersprachig** (Outdoor-/Sport-Schulen; Ski Lawinen-/Berg-Grenze, Tauchen SEHR sensibel Tauchmedizin/-tauglichkeit, Kletterhalle Sicherungs-/Sturz-Grenze — alle: KI ersetzt nie Anleitung/Aufsicht/Sicherheitsbeurteilung).
- Welle 41 (188→191, #348): Segelschule, Bioladen, Schreibwarengeschäft — **direkt viersprachig** (Segelschule Navigations-/Sicherheits-Grenze, Bioladen EU-Bio-/LMIV-/Health-Claims-Grenze). **Weekly-Account-Limit** schlug mitten in der Welle zu (nur DE geschrieben) → nach Reset 10:00 UTC alle en/fr/it per Recovery-Agenten nachgezogen. Lehre: Weekly-Limit (resets Wochenstart 10:00 UTC) ≠ tägliches Limit; Recovery erst nach Reset starten.
- Welle 42 (191→194, #349): Flugschule, Kochschule, Hofladen — **direkt viersprachig** (Flugschule SEHR sensibel Luftrecht/Flugbetrieb [LBA/EASA + Fluglehrer], Kochschule LMIV-/Allergen-Grenze, Hofladen Direktvermarktungs-/Kennzeichnungs-Grenze).
- Welle 43 (194→197, #350): Unverpacktladen, Imkerei, Weingut — **direkt viersprachig** (Unverpackt LMIV bei loser Ware, Imkerei Honigverordnung/Bienengesundheit/Health-Claims, Weingut Weinrecht/Sulfite/Jugendschutz/Alkohol-Werberegeln).
- **Welle 44 (197→200 🎯, #351): Brennerei, Kunstgalerie, Eisdiele** — **direkt viersprachig** (Brennerei Alkohol-/Branntweinsteuer-/Jugendschutz-Grenze, Kunstgalerie Echtheits-/Provenienz-/Urheberrechts-Grenze [keine KI-Bilder im Stil lebender Künstler:innen], Eisdiele LMIV-/Allergen-/Kühlketten-Grenze). **MEILENSTEIN: 200 Branchen-Hubs, 800 Seiten viersprachig.**
- Welle 45 (200→203, #352): Chocolaterie, Teeladen, Antiquariat — **direkt viersprachig** (Chocolaterie LMIV-/Allergen-Grenze, Teeladen LMIV-/Health-Claims-Grenze [Tee kein Heilmittel], Antiquariat Echtheits-/Erstausgaben-/Wert-Grenze [KI-Titelangaben fehleranfällig, immer prüfen]).
- Welle 46 (203→206, #353): Käsefachgeschäft, Secondhandladen, Plattenladen — **direkt viersprachig** (Käse LMIV-/Rohmilch-/Kühlketten-Grenze, Secondhand Echtheits-/Marken-/Wert-Grenze [Fälschungen → Fachprüfung], Plattenladen Grading-/Pressungs-/Wert-Grenze + Urheberrecht).
- Welle 47 (206→209, #354): Comicladen, Wollladen, Stoffgeschäft — **direkt viersprachig** (Comic Grading-/Wert-/Lizenz-Grenze [keine KI-Bilder bestehender Figuren] + Kinderdaten, Wollladen Maschenproben-/Garnmengen-Grenze, Stoffgeschäft Stoffmengen-/Schnittmuster-/Öko-Tex-Grenze).
- Welle 48 (209→212, #355): Modellbaugeschäft, Bastelladen, Künstlerbedarf — **direkt viersprachig** (Modellbau LiPo-Akku-/Drohnen-Recht-Grenze, Bastelladen Material-/CE-Sicherheits-Grenze [Kinderbastel], Künstlerbedarf Lichtechtheit-/Pigment-/Sicherheitsdatenblatt-Grenze).
- Welle 49 (212→215, #357): Bilderrahmung, Nähatelier, Haushaltsauflösung — **direkt viersprachig** (Bilderrahmung Konservierungs-/Wert-/Voranschlag-Grenze, Nähatelier Maßnehmen-/Anprobe-Grenze, Haushaltsauflösung Vor-Ort-Besichtigungs-/Entsorgungs-/Erbrecht-Grenze + sensibler Nachlass-Umgang). **Session-Limit** (Reset 18:40 UTC) schlug beim Start zu (0 Dateien) → nach Reset komplett neu gestartet. Außerdem: verirrter uncommitteter osteopathie.html-Edit (Welle-37-Überbleibsel) im Working Tree verworfen (live-Version auf main ist validiert).
- Welle 50 (215→218, #358): Sattlerei, Vinothek, Graveur — **direkt viersprachig** (Sattlerei Sattelanpassung-/Tierwohl-Grenze, Vinothek Sulfite-/Jugendschutz-/Alkohol-Werbe-Grenze, Graveur Korrekturabzug-/Marken-/Urheberrecht-Grenze).
- Welle 51 (218→221, #359): Buchbinderei, Siebdruckerei, Stickerei — **direkt viersprachig** (Buchbinderei Restaurierungs-/Konservierungs-/Wert-Grenze, Siebdruckerei Druckdaten-/Farbraum-/Markenrecht-Grenze, Stickerei Punching-/Stichqualität-/Markenrecht-Grenze).
- Welle 52 (221→224, #360): Maßschneiderei, Keramikwerkstatt, Kunstschmied — **direkt viersprachig** (Schneiderei Maßnehmen-/Anprobe-Grenze, Keramik Glasur-Sicherheits-/Lebensmittelechtheit-Grenze [Blei/Cadmium], Kunstschmied Statik-/Tragfähigkeits-/Geländer-Norm-Grenze).
- Welle 53 (224→227, #361): Vergolder, Geigenbau, Glasbläserei — **direkt viersprachig** (Vergolder Restaurierungs-/Denkmalschutz-/Echtheits-Grenze, Geigenbau Echtheits-/Zuschreibungs-/Wert-Grenze, Glasbläserei Lebensmittelechtheit-/Arbeitsschutz-Grenze). Seltenes Kunsthandwerk.
- Welle 54 (227→230, #362): Drechslerei, Orgelbau, Klavierstimmer — **direkt viersprachig** (Drechslerei Lebensmittelechtheit-/Maschinen-Sicherheits-Grenze, Orgelbau Denkmalwert-/Orgelsachverständigen-Grenze, Klavierstimmer Zustands-/Wert-/Kauf-Beurteilung-Grenze).
- Welle 55 (230→233, #364): Holzbildhauer, Seifenmanufaktur, Kerzenmanufaktur — **direkt viersprachig** (Holzbildhauer Restaurierungs-/Echtheits-/KI-Entwurf-Rechte-Grenze, Seifenmanufaktur NaOH-Verseifung-/EU-Kosmetik-VO-/Health-Claims-Grenze, Kerzenmanufaktur EN-15493-Sicherheitsnorm-/CLP-/Health-Claims-Grenze).
- Welle 56 (233→236, #365): Korbflechterei, Glasmalerei, Hutmacher — **direkt viersprachig** (Korbflechterei Restaurierungs-/Wert-Grenze, Glasmalerei Denkmalwert-/KI-Entwurf-Rechte-Grenze, Hutmacher Maßnehmen-/Anprobe-Grenze).
- Welle 57 (236→239, #366): Steinbildhauer, Messermacher, Goldschmied — **direkt viersprachig** (Steinbildhauer Grabmal-sensibel/Denkmalwert-/Friedhofsvorschriften-Grenze, Messermacher Stahl-/Arbeitsschutz-/Waffenrecht-Grenze, Goldschmied Edelstein-/Echtheits-/Karat-/Punzierungs-Grenze — abgegrenzt vom Juwelier-Hub: herstellendes Handwerk).
- Welle 58 (239→242, #367): Lederwerkstatt, Kalligrafie, Buchhandlung — **direkt viersprachig** (Lederwerkstatt Material-Beratungs-Grenze [abgegrenzt von Sattlerei], Kalligrafie KI-„Kalligrafie"-nicht-handgemacht-/Tippfehler-/Urheberrecht-Grenze, Buchhandlung Buchpreisbindungs-/Lieferbarkeits-Grenze [abgegrenzt von Antiquariat]).
- Welle 59 (242→245, #368): Ofenbauer, Pflasterer, Abbruchunternehmen — **direkt viersprachig** (Ofenbauer Brandschutz-/Abgas-/Schornsteinfeger-Abnahme-Grenze, Pflasterer Unterbau-/Aufmaß-/Versickerungs-Grenze, Abbruch Statik-/Asbest-TRGS-519-/Entsorgungs-Grenze). Zurück zu Bau-/Ausbau-Gewerken. **Lehre: Env benennt Branch nach Inhalt um (w59→ofenbauer-hub) → nach Commit `git push -u origin HEAD` nutzen, dann PR vom tatsächlichen Branch.**
- Welle 60 (245→248, #369): Wintergartenbau, Terrassenüberdachung, Balkonbau — **direkt viersprachig** (alle Statik-/Lasten-/Baurecht-Grenze; Balkon zusätzlich Absturzsicherung/Geländer-Norm). 1 Agent fiel mit transientem API-500 aus → neu gestartet. `git push -u origin HEAD` verhinderte erneute Branch-Umbenennung.
- Welle 61 (248→251): Natursteinarbeiten, Holzterrassenbau, Reetdachdecker — **direkt viersprachig** (Naturstein Stein-/Untergrund-/Eignungs-Grenze, Holzterrasse Unterkonstruktions-/Entwässerungs-Grenze, Reetdach Brandschutz-[Reet brennbar]/Höhen-Arbeitssicherheit-Grenze). **>1000 i18n-Seiten erreicht.**
- Welle 62 (251→254): Zimmerei, Gewächshausbau, Gabionenbau — **direkt viersprachig** (alle Statik-/Tragwerks-/Baurecht-Grenze; Zimmerei zusätzlich Holzschutz/Brandschutz, Gabionen Stützmauer-Statik). Stand ~75 % eines vollständigen DACH-Branchen-Katalogs.
- **Welle 86–88 (6 Hubs, „max agenten" #5, 328→334):** Nudelmanufaktur, Getränkemarkt, Waschsalon, Schneideratelier, Coworking-Space, Escape-Room — **direkt viersprachig**, 6 Agenten gleichzeitig. (Nudelmanufaktur LMIV/HACCP/HCVO; Getränkemarkt Jugendschutz [ab 16/18] + Alkoholwerbe-Beschränkung + Pfand/Grundpreis; Waschsalon keine Wartung/Hygiene/Haftung-für-Kundenwäsche-Ersatz; Schneideratelier kein Maßnehmen/Anprobe/Stilberatung-Ersatz [Maße sensibel]; Coworking-Space keine Verträge/Datenschutz/Community-Ersatz; Escape-Room keine Rätsel-Spoiler + kein Game-Master-/Sicherheits-Ersatz.) **Lehre: Auto-Mode-Bash-Klassifizierer (Sonnet 4.6) fiel ~30 Min aus** → Agenten lieferten weiter (Dateien sicher), git blockiert; nach Rückkehr **Rebase-Konflikt** (Branch-Base durch Reclaim uralt → reset --soft zeigte 1200+ Fremd-Löschungen). Saubere Recovery: 24 HTML nach /tmp sichern → `reset --hard origin/main` → HTML zurückspielen → Prep neu → ein Commit. Distinkt von konditorei/weinhandlung/textilreinigung/aenderungsschneiderei.
- **Welle 84–85 (6 Hubs, „max agenten" #4, 322→328):** Metzgerei, Eventlocation, Jugendherberge, Reiseveranstalter, Kletterwald, Pizzeria — **direkt viersprachig**, 6 Agenten gleichzeitig. (Metzgerei/Pizzeria LMIV/Allergene/HACCP/keine Health-Claims; Eventlocation Versammlungsstätten-/Brandschutz-/GEMA-Recht + verbindliche Verträge beim Betrieb; Jugendherberge Aufsichtspflicht/Minderjährige + Melde-/Hygiene-Recht; Reiseveranstalter keine Reisefakten-/Visa-/Sicherheitslage-Prüfung + Pauschalreiserecht/Sicherungsschein; Kletterwald keine Sicherheitseinweisung/Aufsicht-Ersatz [EN 15567].) Pro Slug sofort committet. Distinkt von restaurants/eventplaner/reisebuero/hotels/spieleladen.
- **Welle 81–83 (6 Hubs, „max agenten" #3, 316→322):** Sprachschule, Musikschule, Bootsverleih, Campingplatz, Ferienwohnung, Obsthof — **direkt viersprachig**, 6 Agenten gleichzeitig. (Sprachschule/Musikschule: KI nur Orga/Texte, kein Unterricht/keine Niveau-Zertifizierung, Minderjährigen-Daten; Bootsverleih keine Sicherheitseinweisung/Schifffahrtsrecht-Ersatz; Campingplatz/Ferienwohnung Melde-/Kurtaxe-/Vermietungsrecht + AGB/Storno beim Betrieb, keine erfundenen Annehmlichkeiten; Obsthof LMIV/HCVO/Pflanzenschutz, keine erfundenen „Bio/ungespritzt".) **Lehre: ZWEITER Container-Reclaim** mitten im Lauf → alle 6 Agenten verloren, nach `git reset --hard origin/main` neu gestartet, pro Slug sofort committet+gepusht.
- **Welle 79+80 (6 Hubs, „max agenten" #2):** Fahrschule, Tanzschule, Reitstall, Gardinengeschäft, Skiservice, Sammelkartenladen — **direkt viersprachig**, 6 Agenten gleichzeitig. (Fahrschule/Tanzschule/Reitstall: Service/Unterricht — KI nur Orga/Texte, kein Unterricht/keine Bestehens-Garantie, Reitstall Tierwohl/Haftung; Gardinengeschäft kein Aufmaß/Montage-Ersatz; Skiservice keine Bindungs-Z-Wert-Ausgabe [ISO 11088]; Sammelkartenladen keine Echtheits-/Grade-/Wert-Beurteilung, distinkt von spieleladen.) Pro-Slug sofort committet.
- **Welle 77+78 (6 Hubs, „max agenten"-Parallellauf):** Sportfachhandel, Schuhgeschäft, Eismanufaktur, Käserei, Trachtengeschäft, Teppichreinigung — **direkt viersprachig**, 6 Build-Agenten gleichzeitig. (Sportfachhandel kein Fitting/Ski-Sicherheit-Ersatz; Schuhgeschäft keine Passform-/Fußberatung, distinkt von schuhmacherei; Eismanufaktur & Käserei LMIV/Allergene/keine HCVO; Trachtengeschäft keine Anprobe/Stilberatung; Teppichreinigung keine Material-/Methoden-Beurteilung, distinkt von teppichhandel.) **Lehre: Container-Reclaim mitten im Lauf** → lokaler Branch fiel auf alten Stand, in-flight Welle-76-Agenten verloren → 6 fertige Slugs sofort committet, Welle 76 neu gestartet. Slugs vorher gegen main geprüft.
- Welle 76 (gebrauchtwarenhandel, schokoladenmanufaktur, spieleladen): nach Container-Reclaim neu gebaut & **fertig** — Gebrauchtwaren keine Zustands-/Echtheits-/Preis-Beurteilung + Gewährleistung/kein Hehlerware; Schokoladenmanufaktur LMIV/Allergene/keine HCVO; Spieleladen [distinkt von spielwarengeschaeft] keine Spielberatung-/Regel-Ersatz + Altersfreigabe.
- Welle 75 (298→301, **300er-Marke geknackt**): Antiquitätenhandel, Pfandhaus, Gartenpflege — **direkt viersprachig** (distinkte Familien: Antik-Retail/Pfand-Finanz/Grün-Service. Antiquitätenhandel keine Echtheits-/Datierungs-/Wert-/Provenienz-Prüfung + Kulturgutschutz/CITES-Elfenbein, distinkt von antiquariat/kunstgalerie; Pfandhaus SEHR reguliert: keine Wertschätzung + GwG/Identitätsprüfung/Pfandleiherverordnung, keine Rechts-/Finanz-/Bonitätsberatung, diskret [sensible Kundschaft]; Gartenpflege [distinkt von garten-landschaftsbau = Bau] keine Vor-Ort-/Pflanzendiagnose + Pflanzenschutz-Sachkunde + Heckenschnitt-Fristen 1.3.–30.9.). Slugs vor Bau gegen main geprüft (secondhandladen/kunstgalerie belegt).
- Welle 74 (295→298): Gartenmöbel, Fahrradverleih, Koffergeschäft — **direkt viersprachig** (distinkte Familien: Garten-Retail/Bike-Service/Reise-Retail. Gartenmöbel keine Material-/Pflegeberatung-Ersatz; Fahrradverleih [distinkt von fahrradladen] keine Übergabe/Sicherheits-Check-Ersatz + AGB/Kaution/Haftung rechtlich + StVZO/Helm; Koffergeschäft [distinkt von lederwaren] KI NICHT verlässlich für Handgepäck-/Airline-Regeln [ändern sich je Tarif] → aktuelle Airline-Vorgabe prüfen). Slugs vor Bau gegen main geprüft.
- Welle 73 (292→295): Kürschner, Baumfällung, Elektrofachhandel — **direkt viersprachig** (distinkte Familien: Pelz-Handwerk/Baum-Service/Elektro-Retail. Kürschner keine Material-/Zustands-Beurteilung + CITES/Artenschutz/Herkunftsnachweis + keine beschönigenden Tierwohl-Aussagen; Baumfällung [distinkt von baumpflege] keine Vor-Ort-Beurteilung-Ersatz + Genehmigung/Vegetationsperiode/Baumschutzsatzung/Artenschutz [Behörde] + Arbeitssicherheit/Haftung; Elektrofachhandel [distinkt von elektriker/haushaltswaren] keine Reparatur-Ferndiagnose + keine Kaufberatung-Ersatz + sicherheitsrelevanter Anschluss [Starkstrom/Gas/Wasser] in Fachhand). Slugs vor Bau gegen main geprüft (bioladen belegt → naturkostladen verworfen).
- Welle 72 (289→292): Zeitschriftenhandel, Drogerie, Tabakwaren — **direkt viersprachig** (distinkte Retail-Familien, alle mit Recht-/Jugendschutz-Grenzen. Zeitschriftenhandel/Kiosk: regulierte Waren [Tabak/Alkohol/Lotto, ab 18] + Werbeverbote → keine KI-Werbung, Remission/Abrechnung beim Inhaber; Drogerie [≠ Apotheke/Reformhaus]: keine Gesundheits-/Hautberatung + keine Heil-/Wirkversprechen [HCVO/EU-KosmetikVO], INCI/LMIV; Tabakwaren SEHR sensibel: gesetzliches **Tabakwerbeverbot** [TabakerzG/EU] → KI nur für interne/organisatorische + produktneutrale Texte, Jugendschutz/Tabaksteuer/Pflichthinweise beim Inhaber). Slugs vor Bau gegen aktuelles `main` geprüft; tabakwaren-Agent 1× „API Overloaded" → neu gestartet.
- Welle 71 (286→289): Haushaltswaren, Schädlingsbekämpfung, Gravurservice — **direkt viersprachig** (distinkte Familien: Retail/Service/Personalisierung. Haushaltswaren keine Produktberatung-Ersatz + Lebensmittelkontakt-/Eignungs-Hinweise [Induktion/Spülmaschine] prüfen; Schädlingsbekämpfung SEHR sensibel: keine Ferndiagnose + keine Biozid-Dosierungs-Anleitung für Laien [sachkunde-/genehmigungspflichtig], Biozidrecht/Gefahrstoffe/Doku; Gravurservice keine Rechteprüfung an Logos/Marken/Wappen [liegt bei Kund:in] + keine Material-/Maschinen-Eignung + Korrektur-vor-Gravur-Pflicht; distinkt von Graveur-Kunsthandwerk). **Lehre:** Prep (OG/Sitemap/Stateboard) ging beim Rebase nach Agent-Session-Limit-Neustart verloren → nach Recovery neu erzeugt. Slugs vor Bau gegen aktuelles `main` geprüft.
- Welle 70 (283→286): Schuhmacherei, Schlüsseldienst, Rahmenwerkstatt — **direkt viersprachig** (distinkte Service/Handwerk-Familien. Schuhmacherei keine Reparatur-Ferndiagnose/Machbarkeits-Fernzusage + materialabhängige Pflege; Schlüsseldienst SEHR sensibel: keine Türöffnungs-Anleitung/keine Hilfe für Unbefugte [Berechtigungsnachweis vor Ort], keine Sicherheits-/Einbruchschutz-Fernbewertung, Festpreis-Transparenz gegen Abzock-Ruf; Rahmenwerkstatt kein gestalterisches-Auge-Ersatz + konservatorisches Fachwissen bei wertvollen Originalen [säurefrei/UV/reversibel]). Slugs vor Bau gegen aktuelles `main` geprüft.
- Welle 69 (280→283): Lederwaren, Brautmodengeschäft, Weltladen — **direkt viersprachig** (distinkte Familien: Lederwaren-Retail/Brautmode-Termin/Fairtrade-Mission. Lederwaren keine Material-/Echtheits-/Qualitätsbeurteilung [echtes Leder am Stück, „echt vs. Kunstleder" korrekt auszeichnen]; Brautmodengeschäft keine Stilberatung-/Anprobe-/Änderungsschneiderei-Ersatz [emotional, terminbasiert]; Weltladen keine Fairtrade-/Siegel-/Lieferketten-Prüfung per KI [Greenwashing-/Irreführungsrisiko, gegen Importeur/Siegelgeber prüfen] + LMIV). Slugs vor Bau gegen aktuelles `main` geprüft.
- Welle 68 (277→280): Nähmaschinenhandel, Angelladen, Wollgeschäft — **direkt viersprachig** (distinkte Retail/Service-Familien. Nähmaschinenhandel keine Reparatur-Ferndiagnose + keine Vorführung/Einfädeln-Ersatz; Angelladen keine Rechtsauskunft zu Angelschein/Schonzeiten/Mindestmaßen/Gewässerordnung [je Gewässer/Bundesland verschieden → Behörde/Verein] + keine Ortskenntnis-Beratung; Wollgeschäft keine blind übernommene Garnmengen-/Maschenproben-Berechnung [über Maschenprobe prüfen] + keine Technik-Vorführung-Ersatz). Slugs vor Bau gegen aktuelles `main` geprüft.
- Welle 67 (274→277): Briefmarkenhandel, Fahrradladen, Parfümerie — **direkt viersprachig** (distinkte Familien: Sammler/Bike/Beauty. Briefmarkenhandel Echtheits-/Erhaltungsgrad-/Wert-Grenze [Fälschungen/Atteste], distinkt von Münzhandel; Fahrradladen kein Bike-Fitting-Ersatz + keine Reparatur-Ferndiagnose + sicherheitsrelevante Montage/StVZO Fachhand; Parfümerie keine persönliche Duft-/Hautberatung + keine Hautdiagnose + keine Kosmetik-Wirkversprechen [EU-KosmetikVO] + INCI/Allergen-Pflichtangaben). Slugs vor Bau gegen aktuelles `main` geprüft.
- Welle 66 (271→274): Gewürzhandel, Bettenfachgeschäft, Lampengeschäft — **direkt viersprachig** (Retail-Familien, fern vom Bau-/Sammler-Schwerpunkt der Parallel-Session. Gewürzhandel LMIV-Kennzeichnung/Allergene + keine Health-Claims/Heilversprechen [HCVO]; Bettenfachgeschäft kein Ersatz fürs Probeliegen + keine medizinische Schlaf-/Rückenberatung/keine Heilversprechen; Lampengeschäft keine Elektroinstallation/sicherheitsrelevanten Auskünfte [IP/Last/Trafo] per KI, verbindliche Lichtplanung bleibt Fachleistung). Stateboard-Zählerstand an reale Dateizahl angeglichen (war 262, real 271 → 274). Slugs vor Bau gegen aktuelles `main` geprüft (Welle-63-Lehre).
- Welle 65 (259→262): Zoofachhandel, Musikfachhandel, Teppichhandel — **direkt viersprachig** (Retail-Familien fern vom Bau-Schwerpunkt der Parallel-Session. Zoofachhandel Tierwohl-/keine-Ferndiagnose-/§11-TierSchG-Sachkunde-Grenze; Musikfachhandel keine Klang-/Bespielbarkeits-Beurteilung + keine Setup-Ferndiagnose, distinkt von Geigenbau/Klavierstimmer/Musikschule; Teppichhandel Echtheits-/Knüpf-/Provenienz-/Wert-Grenze + materialgerechte Pflege).
- Welle 64 (256→259): Aquaristik, Gartenbaumschule (Baumschule), Fotofachhandel — **direkt viersprachig** (neue Familien fern vom Bau-Schwerpunkt der Parallel-Session: Heimtier/Grün/Foto-Retail. Aquaristik Tierwohl-/Wasserchemie-/keine-Ferndiagnose-/Artenschutz-Grenze; Baumschule Standort-/Sortenecht-/keine-Pflanzenkrankheits-Diagnose-/Pflanzenschutz-Sachkunde-Grenze; Fotofachhandel keine Reparatur-Ferndiagnose/keine Kaufberatung-Ersatz, Passbild-Amtsvorgaben, Kundenfoto-Urheber-/Datenschutz).
- Welle 63 (254→256, #356): Münzhandel, Reformhaus — **direkt viersprachig** (Münzhandel Echtheits-/Erhaltungsgrad-/Wert-Grenze + Edelmetall-Tagespreis + GwG-Sorgfaltspflicht; Reformhaus SEHR sensibel: keine Heil-/Wirkversprechen [HCVO], keine Ernährungs-/Gesundheitsberatung, KI erfindet Wirkungen/Studien → immer prüfen). Ursprünglich als 3er-Welle „47" mit Klavierstimmer gebaut; parallel landeten #354/#355 (Welle 47/48) und #362 (Welle 54: **Klavierstimmer**) auf main → Klavierstimmer verworfen (Duplikat), Rest als Welle 63 fortgezählt. **Lehre:** im schnellen Wellen-Loop vor dem Bauen Slugs gegen aktuelles `main` prüfen, nicht nur gegen den lokalen Stand — und beim Mergen kurz vorher rebasen (main bewegt sich im Minutentakt).

## LuxeStyle-/Dropship-Projekt (im Memory, separater Workstream)
- Branch `claude/dropship-lade-memory-SrAs5`, PR #5. Runbook `dropship/AUTONOMER-MODUS.md`, Log `dropship/CJ-IMPORT-LOG.md`. ~65 Produkte live, Kernproblem 0 Käufe (Traffic-Qualität). **Diese abannews-Session hat KEINE Shopify-MCP-Tools** → Live-Betrieb nur in MCP-Session möglich; hier nur Code/Doku. User-Wunsch 2026-06-05: „nur Memory laden, Hub-Loop weiter".

## News-Aggregator
- `automation/news_aggregator.py` am 2026-06-04 gelaufen: **105 KI-Meldungen aus 10 Quellen** → `automation/news-roh-2026-06-04.md` (gitignored, Kuratier-Vorlage). **BSI-Feed 404** (URL veraltet) — Fix offen.
- **Qualitäts-Audit (Welle-12-Stand):** 104 DE-Hubs geprüft — 0 fehlende OG-Bilder, alle hreflang-Blöcke wohlgeformt (genau 5), alle mit Tools-CTA-aside. Sauber.
- **Neue Hubs (Welle 9+) werden sofort 4-sprachig** gebaut (DE-Vollstandard inkl. Tools-CTA-aside + 5 hreflang + nav-Switch, Übersetzungen mit übersetztem aside). Vorlage: `ki-fuer-elektriker.html` (+ `en/`).
- Backlog-Kandidaten weitere distinkte Nischen (Welle 13+): uhrmacher, druckereien, werbetechnik, brandschutz, aufzugswartung, gartencenter, polsterei, naturheilkunde, gerueststellung, parkettleger, kaelteanlagenbau, brunnenbau.
- **Qualität:** FAQ-Drift in coaches/handwerker behoben (#290); Tools-CTA-aside auf allen 276 alten i18n-Hubs (#287).

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
