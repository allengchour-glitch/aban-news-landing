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

## Branchen-Hubs (`ki-fuer-*.html`) — Stand: **245 live, alle viersprachig (de/en/fr/it = 980 Seiten)**

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
- Welle 59 (242→245): Ofenbauer, Pflasterer, Abbruchunternehmen — **direkt viersprachig** (Ofenbauer Brandschutz-/Abgas-/Schornsteinfeger-Abnahme-Grenze, Pflasterer Unterbau-/Aufmaß-/Versickerungs-Grenze, Abbruch Statik-/Asbest-TRGS-519-/Entsorgungs-Grenze). Zurück zu Bau-/Ausbau-Gewerken.

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
