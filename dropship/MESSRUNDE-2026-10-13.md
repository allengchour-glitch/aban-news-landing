# Messrunde 13.10.2026 — wo kommen Käufer her? (Workflow: 5 Prüfer, 20 Skeptiker, Richter; nur lesend)

Anlass: Betreiber «mach bitte du alles weiter und verbesserung». Frage: Welcher autonome Hebel bringt in den 6 Wochen vor Weihnachten messbar Käufer? Workflow-Lauf `wf_ad2f8ab2-160` (26 Agenten).

## Kernbefunde (GEMESSEN, über die Skeptiker nachgemessen)
- **Engpass ist Verkehr, nicht Seiteninhalt.** Alle Kleider-Produktseiten zusammen hatten seit 05.10. 5 Sitzungen, Sirène und Aurora je 0.
- **ChatGPT ist die Quelle mit der besten Warenkorb-Quote:**
  - 30 T: 110 Sitzungen → 6 Warenkörbe (5,5 %), Shop-Schnitt 2,5 %.
  - Bei direkter Landung auf Produktseiten 12 %.
  - Wachstum: 7/Woche (17.08.) → 25–32/Woche (Okt.). Daraus kamen die Bestellungen #1018 und #1021.
  - **Widerlegt** ist, dass IndexNow das bewirkt hat: ChatGPT schickte Besucher auf /collections/halloween ab dem 14.09., 18 Tage vor der ersten IndexNow-Meldung (02.10.). Nach 50'000 gemeldeten Adressen gab es keinen Sprung.
- **Google-Suche (Search Console, nur 7 Tage Daten seit 04.10.):** 2'638 Impressionen, 24 Klicks, mittlere Position ~50. 95 % gehen auf Produktseiten. Titel sind nicht der Engpass, der Index ist es.
- **Saison-Kollektionen:** 0 von 12 indexiert, 11 nie abgerufen. Robots, noindex, Canonical und Sitemap sind sauber.
  - Seiten mit Menü-Links stehen nicht besser da: 5 von 5 Menü-Neuzugängen vom 24.09. sind nach 19 Tagen «unknown».
- **Merchant-Blocker (1'082)** sind kein Verkehrshebel. Von 161 Produkten mit Google-Besuchen in 90 T sind 2 blockiert.
  - «Image under review» wuchs von 24 auf 638. Ein Hauptanteil kam vom Zombie-Cron: 6,6 % der von ihm berührten Produkte, bei ruhiger Ware 0,8 %. Der Cron ist seit 07:45 aus.
- **Social ohne Warenkorb:** Facebook, Instagram, YouTube, TikTok ohne Werbung und Metricool-Pins brachten in 90 T 0 Körbe.
  - Der Pinterest-Katalog (Shopify-App-Pins) fiel ab 21.09. von ~16 auf 2 Sitzungen pro Woche.

## Rangliste des Richters (0–10, Kaufwirkung 6 Wochen)

| Rang | Punkte | Status | Klasse |
|---:|---:|---|---|
| 1 | 3 | umsetzen | Tote Google-Seiten, die Shopify nicht sieht: Produktseiten mit GSC-Klicks/-Impressionen sind DRAFT oder weg, haben keine 301, und tote_landeseiten.py bemerkt sie nie, weil Shopify Landungen auf einer 404-Seite nicht als Sitzung zä |
| 2 | 3 | umsetzen | Kostüm- und Horrormasken umgehen die Hausregel «Kostüme nie in den Google-Kanal». Grund: falscher Typ «Hautpflege», und der Durchsetzer prüft nur exakte Sperr-Tags |
| 3 | 3 | umsetzen | Neue Saison-Kollektionen ohne Menüplatz: weihnachtspullover, handwaermer, weihnachtspyjama-familie und winter-kaelte sind nur über Sitemap und Suche erreichbar |
| 4 | 2.5 | später | Google-Feedback-Wache misst falsch: je Klasse nur die 300 ältesten Handles (HANDLES_MAX=300, Scan ohne sortKey). Bericht und Bildtausch-Bilanz sehen 338 der 638 «Image under review»-Fälle nicht |
| 5 | 2.5 | betreiber | Saison-URLs werden von Google nicht abgerufen; der einzige direkte Auslöser ist «Indexierung beantragen» in der Search Console |
| 6 | 2 | später | Produkttitel mit Oberbegriff statt Suchwort («für Haustiere» ohne Katze/Hund, «Smartphone» ohne «Handy»): SEO-Titel mit belegtem Suchwort |
| 7 | 2 | widerlegt | Unnötige Produkt-Schreibvorgänge setzen die Google-Prüfung neu auf («Image under review» wächst 24 → 638) |
| 8 | 1.5 | betreiber | Produktkarten verlinken ?variant=-Adressen statt der kanonischen Produkt-URL (115 Parameter-URLs auf der Startseite) |
| 9 | 1.5 | später | Weiterleitungen ins Leere: 146 von 673 Produkt→Produkt-301 zeigen heute auf ein DRAFT-Ziel |
| 10 | 1 | widerlegt | Anfragen, für die Google mehrere eigene Seiten zeigt (Kannibalisierung) → neue Suchbegriff-Kollektionen |
| 11 | 1 | widerlegt | Saison-Links an gecrawlten Stellen (lux_usp-Zeile, Theme-Block «Mehr aus …» auf Produktseiten, saison_links_wache.py) |

⚠️ **Lücke im Workflow:** Das Material an den Richter wurde bei 120'000 Zeichen abgeschnitten. Die Vorschläge der Prüfer «Quellen» und «Kleider» fehlen deshalb in seiner Rangliste. Ich habe sie selbst anhand der Skeptiker-Urteile bewertet:
- IndexNow mit Änderungsprüfung: **widerlegt** (beide Skeptiker). Rest: Die Wiederholfrist für Kollektionen, Seiten und Artikel könnte von 30 auf 7 Tage sinken. Kostet nichts, Wirkung unbelegt → später.
- KI-Landeseiten-Wache: **widerlegt** (beide). 0 Körbe aus 27 Halloween-Sitzungen ist Zufall (P ≈ 0,5). Die 301-Weiterleitungen setzt `tote_landeseiten.py` schon.
  - Rest: Die Meta-Beschreibung von `kostueme-ch-lager` behauptet «Über 2'000», gemessen sind 1'545. Korrektur über `kollektion_mengen_wache.py` (Regex ANSPRUCH um «Kostüme»).
- Abendkleider-Kollektion kuratieren: **widerlegt** (0 Landesitzungen in 90 T). Rest: Platz 7 zeigt eine CHANEL-Tüte (Fremdlogo-Klasse #47).
- Masstabelle «2XL» gegen Auswahl «XXL» auf 7 von 18 Seiten: **bestätigt** (Belege-Skeptiker). Kleine Pflege in `masstabelle_schreiben.py`, mit Runde 3 bündeln.

## Umgesetzt in dieser Runde
- Platz 2: Kostüme und Kostüm-Masken aus dem Google-Kanal → `dropship/KOSTUEM-GOOGLE-2026-10-13.md`.

## Nächste Runden (Reihenfolge)
1. Platz 1: Search Console als zweite Quelle für `tote_landeseiten.py` (GSC=1, Kanarien, höchstens 50 pro Lauf, Ampel «GSC-TOT»). Ehrlich: Hygiene, ≈ 0 Käufe.
2. Platz 3: Menü-Einträge Weihnachtspullover, Handwärmer, Weihnachtspyjama-Familie (für Menschen, nicht für den Crawl).
3. Kleinkram: Meta «Über 2'000 Kostüme», CHANEL-Tüte, 2XL/XXL, Google-Feedback-Wache mit IDs statt 300 Handles.
4. Fortura-Produkttyp «Kostüme & Verkleidung» bereinigen (~100 falsche Typen).
5. ✅ 13.10. 10:20 — Platz 9 «Weiterleitungen ins Leere»: `automation/weiterleitung_ziel_wache.py` (täglich im Aufseher). 169 von 1'657 zeigten ins Leere, 27 über zwei Sprünge → 197 gedreht, 54 angelegt, Nachmessung 0. Nebenfund: `kollektion_taugt()` prüfte die Veröffentlichung nicht (handy-powerbanks) → behoben, Kanarien prüfen jedes Tabellenziel.

## Nur Betreiber
- Search Console → URL-Prüfung → «Indexierung beantragen», nur im Handy-Browser, etwa 5 Minuten, nachrangig hinter BigBuy EUR 1'000 und Merchant. Jetzt für: /collections/weihnachten-2026, /collections/geschenke-fuer-sie, /collections/geschenke-fuer-ihn, /collections/kleine-geschenke-mitbringsel, /collections/premium-geschenke, /collections/adventskalender (Inhalt seit dem Abruf am 05.10. geändert: 17 → 29 Produkte) und /blogs/ratgeber/weihnachtsgeschenke-2026-schweiz-ideen. Für weihnachtspullover, handwaermer und weihnachtspyjama-familie erst ab 24.10., falls sie dann noch «unknown» sind. Google sagt «Tage bis Wochen, ohne Garantie»; keine Verkaufserwartung.
- Search Console → Einstellungen → Crawling-Statistik einmal ansehen (nur in der Oberfläche lesbar). Das belegt oder widerlegt die Vermutung, dass ~50'000 Produktänderungen pro Woche und die /fr/-Verdopplung das Crawl-Budget aufbrauchen. Davon hängt ab, ob sich weitere Index-Massnahmen lohnen.
- Menü (GEMESSEN, Menü-Kopie 13.10. 08:21): «Kiffer-Zubehör (18+)» steht als Unterpunkt unter «🎁 Geschenke & Weihnachten». Dass es im Menü steht, ist Ihr Wunsch (Journal). Ist auch der Platz in der Weihnachtsnavigation gewollt, oder soll es woanders hin?
- Optional, ohne belegten Nutzen: Kartenlinks ?variant= → kanonische Produkt-URL (card-gallery.liquid ×2, product-title.liquid ×1). Das geht nur über einen Theme-Access-Token mit der CLI, weil das aktive Theme aus dem Assistenten nicht geschrieben werden darf. Kann warten.
