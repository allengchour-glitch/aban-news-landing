# Warum abannews.com „nach KI aussieht" — und wie man es flächendeckend behebt

Basis: 12 Screenshots (index, angebote, beratung, airfryer-kaufen-schweiz, mwst-rechner, ai-sichtbarkeit) + Code-Stichproben in `css/styles.css`, `index.html`, generierte Ratgeber-Seiten.

---

## 1. Warum es nach KI aussieht

**1. Emoji statt Icons in Überschriften — auf fast jeder zweiten Seite.**
`grep` über alle HTML-Dateien: **834 Seiten** haben ein Emoji direkt in `<h1>`/`<h2>`. Beleg: „🍟 Airfryer kaufen Schweiz 2026" (airfryer-fold), „🔥 Top-Angebote" (index.html Z.420), „🎯 Lead-Erfassung" (Z.454), „💡 Prompt zum Kopieren" (Z.345, 926, 931, 936). Das ist das klassischste aller „KI hat das geschrieben"-Signale — echte Redaktionen setzen Emoji sparsam, nie als Bullet-Ersatz oder Aufmacher-Icon.

**2. Immer dieselbe Karte: weiss, 1px Rahmen, abgerundet, leichter Schatten.**
790 Vorkommen von `class="card"` sitewide. CSS (`css/styles.css` Z.499–501, 1019–1020, 1777, 1823): `border: 1px solid var(--c-border); border-radius: var(--r-lg); box-shadow: 0 2px 12px var(--c-shadow)`. Sichtbar auf Angebote-fold (8 identische Preiskarten im 2-Spalten-Grid), Beratung-fold (3 Karten „Drei Wege"), Index-fold (Mockup-Karte). Jeder Block im ganzen Auftritt ist optisch derselbe Container — Text-Karte, Preis-Karte, Trust-Badge, Feature-Kachel, alles dieselbe Hülle. Das erzeugt den generischen „Bootstrap/Tailwind-Template"-Look, den man aus zig KI-Landingpages kennt.

**3. Textbaustein „ohne Hype" / „kein Hype" — 2182 Treffer im Repo.**
Erscheint in Meta-Descriptions, og:description, JSON-LD, Badges und Fliesstext praktisch jeder generierten Seite (`ki-fuer-fliesenleger.html`, `ki-fuer-plattenladen.html`, `ki-readiness-check.html`, Beratung-Seite: „kein Buzzword-Bingo … keine Agentur-Präsentation … ehrlich ohne Hype"). Eine Floskel, die als Differenzierung gedacht war, aber durch Wiederholung selbst zum Füllwort geworden ist — genau das Muster von KI-generierten Templates, die eine „Werteaussage" copy-pasten statt sie einmal zu erzählen.

**4. Uppercase-Eyebrow-Label vor jeder Sektion.**
455 Seiten mit `class="badge"`, dazu `.foot-grid .foot-h` (Z.884-890): `text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.8125rem`. Sichtbar auf Angebote-fold: „KOSTENLOS STARTEN", „VON KI GEFUNDEN WERDEN" — orangene Balken-Bullet + Kapitälchen vor jeder Sektion. Genau die Sektions-Etikettierung, die jedes generische SaaS-Landingpage-Theme mitbringt.

**5. Zu viele, gleich gestylte CTA-Buttons ohne Hierarchie.**
Auf der Startseite allein 14 `.btn`-Elemente (9× `.btn--amber`, 3× `.btn--amber.btn--sm`, 5× `.btn--ghost`) — Sticky-Sub-Leiste, Sticky-mCTA, Hero-Formular, Schnellzugriffs-Kacheln „SCHNELL:" mit 8 identischen Pillen, dazu Announcement-Bar mit eigenem Link. Auf Mobile (index-handy) stapeln sich Sticky-Header + Sprachbanner + Announcement direkt übereinander (bereits im CLAUDE.md als „vier fixierte Schichten" dokumentiert). Zu viele gleichwertige CTAs = kein Fokus = liest sich wie autogeneriert.

**6. Verlaufs-Hintergründe an denselben immer wiederkehrenden Stellen.**
`linear-gradient(180deg, var(--c-bg-alt) 0%, var(--c-bg-deep) 100%)` (Z.146, Seiten-Hintergrund), `linear-gradient(135deg, var(--c-card) 0%, var(--c-bg-alt) 100%)` (Z.587, 1192), `linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent-hi) 100%)` (Z.1595, Buttons). Airfryer-fold zeigt zusätzlich einen dunklen Zinnober-zu-Kastanie-Verlauf als Artikel-Header — ein Verlaufs-Rechteck als Signature-Hero-Element ist ein zweites, unabhängiges Muster (Stock-Landingpage-Baukasten), das mit dem warmen Bernstein/Creme-Look der Startseite kollidiert.

**7. Programmatisches Massen-Footer als sichtbares SEO-Gerüst.**
Der Footer von `index.html` (Z.855) listet **über 150 einzelne Tool-/Rechner-Links** in einem Fliesstext-Block ohne Gruppierung über die drei Spalten hinaus (Impressum bis Binär-Rechner bis SSW-Rechner in derselben Spalte). Das ist technisch nützlich für SEO, sieht für einen menschlichen Besucher aber wie ein automatisch generiertes Sitemap-Dump aus — kein redaktionelles Element mehr.

**8. Generator-Vorlagen erzeugen strukturell identische Artikel.**
Airfryer-Ratgeber (Kaufberater) und mwst-rechner (Tool) teilen exakt dieselbe Bauform: Breadcrumb → H1 mit Emoji-Anker → Lead-Absatz → gelber „Kurz & bündig"-Kasten → Content. Bei Dutzenden Kaufberater-/Tool-Seiten aus `generate_*`-Skripten wiederholt sich dieses Skelett 1:1 bis auf den Text — jede Seite liest sich wie ein Mad-Lib desselben Prompts.

---

## 2. Die 8 wirksamsten Korrekturen (nach Wirkung sortiert)

**1. Emoji aus allen `<h1>`/`<h2>` entfernen, durch dünne SVG-Linien-Icons oder gar nichts ersetzen.**
Gilt für: alle 834 betroffenen Seiten (Index, Dossiers, Kaufberater, Tools, Branchen-Seiten). Konkret: In den Generator-Templates (`generate_angebote.py`, `generate_dossiers.py`, `generate_compliance_pakete.py` u. a.) den Emoji-Präfix aus dem H1/H2-Rendering streichen; im Bestand per Skript `re.sub(r'^[\U0001F300-\U0001FAFF☀-➿]\s*', '', h1_text)`. Ausnahme: max. 1 Emoji im gesamten Announcement-Banner ist ok, nicht in Content-Überschriften. Einzige zulässige Icon-Stelle: `.ico` (schon vorhanden, Z. ~620) — dort ein 20×20px Strichicon-Set (aus einer Bibliothek, 1.5px Stroke, `stroke: var(--c-accent)`), kein Emoji.

**2. Karten-Kontrast auffächern statt eine Universalkarte für alles.**
Gilt für: `.card`, Preis-Karten (angebote.html), Feature-Kacheln (index.html). Neue CSS-Variablen ergänzen:
```css
--r-card: 12px;
--card-border-soft: 1px solid var(--c-border);   /* Standard: Inhalts-Karten */
--card-flat: none;                                 /* neue Variante: kein Rahmen, nur Abstand + Trenn-Linie unten */
```
Preis-/Angebots-Karten (angebote.html): Rahmen weg, stattdessen `border-bottom: 1px solid var(--c-border)` zwischen Zeilen einer Liste statt 8 einzelne Boxen — reduziert visuelles Grid-Rauschen. Feature-Karten (`.card` in index.html) behalten Rahmen, aber Schatten nur noch on `:hover`, nicht permanent (`box-shadow: none; transition: box-shadow .15s` → `:hover{box-shadow: 0 2px 8px var(--c-shadow)}`). Damit sehen nicht mehr alle Container gleich „laut" aus.

**3. Eine echte Display-/Editorial-Schrift für H1/H2, System-Font nur für Fliesstext.**
Gilt für: `css/styles.css` global (`h1,h2` Selektoren, aktuell Z.185ff nutzen `--font` überall gleich). Ergänzen:
```css
--font-display: "Source Serif 4", Georgia, "Times New Roman", serif; /* oder ein kräftiges Grotesk wie "Fraunces" */
```
`h1, h2, .hero h1 { font-family: var(--font-display); font-weight: 600; letter-spacing: -0.01em; }` — Fliesstext bleibt `--font` (System-Sans). Eine Schriftmischung Serif/Sans ist das stärkste einzelne Signal für „redaktionell gestaltet" statt „Component-Library-Default". Passt zur Bernstein/Kaffee-Marke (warm, editoriell). Laden via `fonts.googleapis.com` (erlaubt), Fallback-Stack real definieren.

**4. „Ohne Hype"/„kein Hype" auf max. 1 Vorkommen pro Seite reduzieren, sonst umschreiben.**
Gilt für: alle Meta-Descriptions, og:description, JSON-LD, Badges, Fliesstext der generierten Branchen-/Dossier-/Tool-Seiten. In den Generator-Skripten (`generate_dossiers.py`, `generate_branchen_og.py`, Branchen-Templates) die Standardfloskel durch 4–5 rotierende Varianten ersetzen (z. B. „konkret statt Buzzword", „mit Zahlen statt Versprechen", „ehrlich eingeordnet"), damit sie sich nicht wortgleich über hunderte Seiten wiederholt. Auf jeder Einzelseite höchstens 1× im sichtbaren Text, nicht zusätzlich in Meta+Badge+H2 gleichzeitig.

**5. Eyebrow-Labels (Uppercase+Kapitälchen) auf Sektions-Überschriften begrenzen, nicht auf jede Karte/jeden Block.**
Gilt für: `.badge`-Klasse (455 Seiten). Neue Regel: `.badge` nur noch 1× pro Seite direkt unter H1 (Kontext-Tag), nicht als wiederkehrendes Sektions-Präfix wie „VON KI GEFUNDEN WERDEN" vor jeder Angebotsgruppe. Sektionstitel in `angebote.html`/Generator stattdessen als normale `h3` ohne Uppercase-Transform, ggf. mit einer schlichten Kapitel-Nummer („01", „02") statt Balken+Kapitälchen — reduziert den „Landingpage-Baukasten"-Eindruck.

**6. CTA-Hierarchie: genau 1 primärer Button pro Bildschirm-Sichtfeld, Rest als Text-Link.**
Gilt für: index.html (aktuell 14 `.btn` im Fold+knapp danach), Sticky-Elemente. Konkret: Die „SCHNELL:"-Pillenreihe (8 identische `.btn--amber.btn--sm`) durch einen simplen Text-Nav-Streifen ohne Button-Optik ersetzen (`a{color:var(--c-text-2); border-bottom:1px solid var(--c-border)}`, kein Hintergrund/Radius). Nur der Hero-CTA („5-Min-Briefing gratis →") bleibt gefüllter Button (`--c-accent`). Sticky-mCTA bleibt (laut Memory bewusst einzige fixierte Leiste), aber Announcement-Bar + Sprachbanner nie gleichzeitig mit mCTA sichtbar (`max-width`/`z-index`-Regel: nur 1 fixiertes Element gleichzeitig, Rest scrollt weg).

**7. Verlaufs-Header vereinheitlichen: entweder Marken-Verlauf (Bernstein/Creme) überall, oder gar keiner — nicht dunkler Zinnober-Verlauf nur bei Ratgeber-Artikeln.**
Gilt für: Kaufberater-/Ratgeber-Templates (airfryer & vergleichbare `generate_*`-Artikel-Header). Der dunkle rot-orange Verlauf-Header (sichtbar airfryer-fold) bricht mit dem warmen Creme-Look der Startseite. Ersetzen durch denselben Ton wie Startseite: `background: var(--c-bg-alt)` mit dünner unterer Trennlinie `border-bottom:1px solid var(--c-border)`, H1 in `--c-text` statt Weiss-auf-Verlauf. Ein einziges Verlaufsrezept (`--gradient-brand: linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent-hi) 100%)`) nur noch für Buttons/Premium-Badges reservieren, nicht für Flächen-Hintergründe.

**8. Footer-Linkwand strukturieren statt als Fliesstext-Dump.**
Gilt für: `index.html` Footer (Z.855) und alle Seiten, die dasselbe Footer-Include nutzen. Die >150 Links in klar benannte Gruppen mit eigenen `<h4>` clustern (z. B. „Rechner: Business", „Rechner: Privat", „KI-Tools", „Rechtliches") statt einer Spalte mit allem von Impressum bis SSW-Rechner. Visuell: `column-count` oder `grid-template-columns: repeat(auto-fill, minmax(160px,1fr))` mit sichtbaren Gruppentiteln — macht aus dem „Sitemap-Dump" einen lesbaren Seiten-Index.

---

## 3. Was NICHT anfassen

- **Bernstein/Creme-Farbpalette selbst** (`--c-bg #fffbf5`, `--c-accent #d97706`) — warm, konsistent, gut lesbar; das Problem ist Anwendung/Wiederholung, nicht die Farben.
- **Sticky-mCTA-Konsolidierung von 2026-09-02** (Chat-Assistent + zweite Bodenleiste entfernt) — genau richtige Richtung, weiterführen, nicht zurückbauen.
- **Mehrwertsteuer-Rechner & AI-Sichtbarkeits-Check als Tools selbst** — Funktionalität, Eingabefelder, Ergebnis-Layout (3 Ergebnis-Kacheln netto/MwSt/brutto) sind klar und funktional; hier ist nur die Karten-Optik (Punkt 2 oben) systemweit mitzuziehen, keine Extraarbeit an diesen Seiten nötig.
- **Beratungsseite-Text** („Für wen das NICHT ist", FAQ, Drei-Wege-Pricing) — inhaltlich schon persönlich und undogmatisch geschrieben, genau der Ton, der dem Rest fehlt. Als Vorbild für Tonalität auf anderen Seiten nehmen, hier selbst nichts ändern.
- **DE/EN/FR/IT-Sprachumschalter und Suche in der Hauptnav** — unauffällig, funktional integriert, kein KI-Marker.

---

*Hinweis: `airfryer-kaufen-schweiz-handy.png` (3,3 MB) und `index-desktop.png`/`index-handy.png` wurden gelesen, kamen aber stark verkleinert zurück (Detailtext nicht lesbar) — Einschätzung für diese drei stützt sich zusätzlich auf die scharfen -fold-Versionen und den Code.*
