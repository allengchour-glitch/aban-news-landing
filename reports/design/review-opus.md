# abannews.com — Art-Direction-Review

Grundlage: 12 Screenshots (Desktop-Fold, Ganzseite Desktop, Handy) plus `css/styles.css`,
`css/modern.css`, `index.html`, `generate_angebote.py`. Alle Bilder liessen sich lesen; bei den
sehr langen Seiten (index 15'531 px, airfryer 20'352 px) habe ich in 1'600-px-Streifen
hineingezoomt.

Vorweg: die Marke ist nicht das Problem. Bernstein auf Creme, die Kaffeetasse, der Ton der Texte
— das trägt. Was „nach KI" aussieht, ist die **Bauweise**: alles ist aus denselben fünf Bausteinen
zusammengesetzt, in immer derselben Reihenfolge, ohne eine einzige gestalterische Entscheidung, die
nur für diese eine Stelle getroffen wurde.

---

## 1. Warum es nach KI aussieht

**1.1 Der immergleiche Sektions-Block, achtmal untereinander.**
Auf `index.html` folgt ab dem Hero achtmal exakt dasselbe Muster: Eyebrow-Strich + Kapitälchen
(`— NEU · KI-STUDIO`, `— WARUM ABAN NEWS`, `— LIVE · MÄRKTE`, `— ZUM VERTIEFEN`,
`— GRATIS & OHNE LOGIN`, `— GELD & KI`, `— PREISE`, `— REINLESEN STATT RATEN`, `— FAQ`),
darunter zentrierte H2, darunter zentrierter 2–3-Zeilen-Untertitel in Grau, darunter ein
3-Spalten-Kartenraster, darunter eine zentrierte Pillen-CTA. Im Quelltext sind das 13 Elemente mit
`class="center"` und 12 `<span class="eyebrow">`. Ein menschlicher Art Director wechselt nach der
zweiten Wiederholung den Rhythmus — Zweispalter, Vollbreiten-Zitat, Liste, Tabelle, Bild links.
Hier wechselt nichts. Das ist der mit Abstand stärkste Einzeleffekt.

**1.2 Emoji als Icon-System, in pastellfarbenen Kacheln.**
`index.html:154` — `.ico{width:52px;height:52px;border-radius:14px;background:var(--amber-lt)}`
plus `.ico.b` (#e0f2fe), `.ico.g` (#dcfce7), `.ico.p` (#f3e8ff). Darin sitzen 📰 🧰 🛍️ 💶 🎮 📚 🛠 💡
🚀 🔒 ✍️ 🧭 🔎 🧱 🏢 🧾 ✉️ 📈 🧺. Rund 25 Vorkommen allein auf der Startseite; auf
`airfryer-kaufen-schweiz` dieselbe Kachel mit 📦 🌡️ 🍥 🔌. Die Pastelltöne stammen erkennbar aus
Tailwind-Standardwerten und haben mit der Bernstein/Creme-Palette nichts zu tun — drei fremde
Farbfamilien (Himmelblau, Mint, Flieder) auf warmem Creme. Zusätzlich Emoji direkt in H1
(`🍟 Airfryer kaufen Schweiz 2026`) und in Bannern (`☕ Wirst du von KI empfohlen?`,
`✍️ Gratis KI-Werkzeug`).

**1.3 Null Fotografie, null Illustration — auf der ganzen Startseite.**
`grep '<img' index.html` liefert **keinen Treffer**. 15'531 px Seitenhöhe ohne ein einziges Bild.
Das einzige „Visual" ist ein CSS-Mockup eines Mail-Fensters mit drei Ampelpunkten (`.mock`,
`index.html:124`) — das Standard-Fake-Browserfenster jeder generierten Landingpage. Es gibt eine
reale Person („Kuratiert von Aban (Allen Chour) in Belp, Schweiz"), die im Autoren-Kasten nur als
oranger Kreis mit dem Buchstaben „A" auftaucht. Im Repo liegen tausende Bilder unter `img/site/`,
auf der Startseite kommt keines vor.

**1.4 Alles ist eine Karte: gleicher Radius, gleicher Rahmen, gleicher Schatten.**
`.card` in `index.html:155` und `.card` in `css/styles.css:567` definieren dasselbe zweimal —
weiss, 1 px `#e5e7eb`, `border-radius:14px`, weicher Schatten, plus `translateY(-3px)` beim Hover
(`styles.css:2103`). Diese Karte trägt Navigations-Kacheln, Feature-Beschreibungen, Preisboxen,
Kurslisten, FAQ-Akkordeons, Ausgaben-Teaser, Kauftipps, Markt-Widgets. Auf `angebote.html` sind es
28 identische Kästen in Folge, unterschieden nur durch den Text. Wenn jedes Element gleich viel
Gewicht hat, hat keines Gewicht — die Seite bekommt kein Relief.

**1.5 Verläufe und Glow als Ersatz für Hierarchie.**
Hero mit zwei überlagerten Radial-Gradienten plus Linear-Gradient (`index.html:104-106`),
Text-Gradient auf „KI-Updates" (`background-clip:text`, `index.html:113`), dunkelblaue Farbflächen
mit `linear-gradient(135deg,#1f2b38,#2c3e50)` und `border-radius:28px` (`index.html:198`),
Hero-Kopf auf `airfryer` als Orange-Verlauf mit riesigem transparentem 🍟-Wasserzeichen rechts,
`.price.feat` mit `box-shadow: … , 0 0 0 4px var(--amber-lt)` und `translateY(-6px)`. Text-Gradient
und Ring-Glow sind zwei der meistgenutzten Generator-Signale überhaupt.

**1.6 Textbausteine, die dreissigmal wiederkehren.**
„ehrlich, ohne Hype" / „kein Hype" / „anti-hype" / „ohne Login" / „kein Tracking" / „kein
Buzzword-Bingo" / „Klartext statt Schlagzeile" / „Urteil statt Affiliate-Lob" / „Erprobt, zum
Kopieren" — auf der Startseite in fast jedem Untertitel, auf `angebote.html` in fast jeder der
28 Zeilen, auf `beratung.html` im Intro. Dazu die Antithese-Formel „X statt Y" als H2-Bauplan
(`KI-Überblick statt KI-Lärm`, `Reinlesen statt raten`, `Dialog statt Monolog`, `Sparplan statt
Trading`, `Urteil statt Lob`). Und im Fliesstext der Ratgeber (`airfryer`) die Bullet-Formel
`**Begriff:** Erklärung.` über hunderte Punkte hinweg, ohne einen einzigen Absatz, der aus der Form
ausbricht.

**1.7 CTA-Inflation, besonders mobil.**
Erster Bildschirm `index-handy`: Ankündigungs-Ribbon oben, Kopfzeile mit „abonnieren", Schnell-Link-
Leiste mit acht Pillen, E-Mail-Feld + „5-Min-Briefing gratis", direkt darunter „Gratis-Briefing
abonnieren", dazu die fixierte Sprach-Leiste unten und `#mcta`. Im Screenshot **überdeckt die
Sprach-Leiste die Consent-Zeile und den Link „10 erprobte KI-Prompts (PDF)"** — sichtbarer Fehler,
nicht nur Geschmack. Auf Desktop stehen im Preis-Abschnitt vier Karten mit vier Buttons, darunter
in den folgenden zwei Bildschirmen noch fünf weitere CTAs.

**1.8 Gleichförmige Abstände und ein Mega-Footer als Sitemap-Dump.**
`.sec{padding:clamp(2.8rem,6vw,4.6rem) 0}` gilt für jeden Abschnitt gleich; zwischen den Blöcken
gibt es keine Ruhezone und keine Verdichtung. Am Ende folgen über 100 Links in vier Spalten
(„Skonto-Rechner", „Verzugszinsen-Rechner", „Zahlungsfrist-Rechner", „Tage-Rechner",
„Alters-Rechner" …). Das liest sich als maschinell erzeugter Index, nicht als Navigation.

**1.9 Systembruch zwischen den Seitengruppen (Nebenbefund, aber er verstärkt den Eindruck).**
`beratung.html` läuft auf einer ganz anderen Typografie: kleinere Grundschrift, andere Kopfzeile,
andere H2-Grössen, andere Abstände, keine Eyebrows. Die Seite wirkt fast unfertig neben der
Startseite. Ursache: `index.html` bringt sein eigenes komplettes Token- und Komponenten-Set inline
(`--amber`, `--line`, `--ink`, `.card`, `.ico`, `.sec`) und dupliziert damit `css/styles.css`
(`--c-accent`, `--c-border`, `--c-text`, `.card`). Zwei Systeme, die auseinanderdriften.

**1.10 Schrift = Systemschrift, überall gleich.**
`--font: -apple-system, …, Arial` (`styles.css:47`), kein `@font-face` im ganzen Repo. Die Absicht
(DSGVO, keine Google-Fonts) ist richtig — die Folge ist, dass Überschrift und Fliesstext dieselbe
Schrift in derselben Anmutung sind. Genau so sieht jede generierte Seite aus.

---

## 2. Die acht wirksamsten Korrekturen, nach Wirkung sortiert

### K1 — Sektions-Rhythmus brechen: nur jede dritte Sektion zentriert
**Gilt für:** `index.html`, danach alle Generator-Vorlagen mit `class="center"`.
Zentriert bleiben Hero, Preise, FAQ. Alle übrigen Sektionen linksbündig mit Eyebrow und H2 in einer
schmalen Spalte, Karten daneben oder darunter.

```css
/* index.html Stylesheet-Block */
.sec > .wrap { max-width: 1140px; }
.sec--split .wrap {              /* neue Variante für 5 der 8 Blöcke */
  display: grid;
  grid-template-columns: minmax(280px, 22rem) 1fr;
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: start;
  text-align: left;
}
.sec--split .sub { max-width: 34ch; margin-top: .8rem; }
@media (max-width: 860px) { .sec--split .wrap { grid-template-columns: 1fr; } }
```
Markup: bei „Warum aban news", „Themen-Dossiers", „Werkzeuge", „Geld & KI", „So sieht eine Ausgabe
aus" das `class="sec center"` durch `class="sec sec--split"` ersetzen, `.cards` wandert in die
zweite Spalte. Kein neuer Inhalt, kein neues Bauteil — nur ein zweiter Rhythmus.
**Wirkung: sehr hoch.** Das ist die eine Änderung, die den Eindruck kippt.

### K2 — Emoji-Kacheln ersetzen durch monochrome Strich-Icons
**Gilt für:** alle Seiten mit `.ico`, plus die Karten-Vorlagen der Generatoren.
24×24-px-Inline-SVG, `stroke:currentColor`, `stroke-width:1.5`, keine Füllung, keine Kachel.
Ein Set von 12 Symbolen (Zeitung, Werkzeug, Tasche, Münze, Spielpad, Buch, Schloss, Rakete, Lupe,
Baustein, Gebäude, Beleg) deckt die Startseite ab. Icons einfarbig in `#8a5a20`.

```css
.ico {
  width: 24px; height: 24px;
  background: none;              /* Kachel weg */
  border-radius: 0;
  margin-bottom: .9rem;
  color: #8a5a20;
}
.ico.b, .ico.g, .ico.p { background: none; }  /* Fremdfarben stilllegen */
```
Emoji in H1/H2 und in Bannern ersatzlos streichen (`🍟 Airfryer kaufen …` → `Airfryer kaufen …`).
Falls SVG kurzfristig zu viel Arbeit ist: als Zwischenschritt nur die drei Pastellfarben
`#e0f2fe / #dcfce7 / #f3e8ff` durch je eine Bernstein-Abstufung `#fdf0dc / #f8e3c4 / #f2d5a8`
ersetzen. Das nimmt schon 60 % des Effekts.
**Wirkung: sehr hoch.** Emoji-als-Icon ist das bekannteste Erkennungszeichen.

### K3 — Eine echte Schriftfamilie für Überschriften
**Gilt für:** global, `css/styles.css` + der Inline-Block in `index.html`.
Eine Serifen- oder kräftige Grotesk-Schrift lokal einbinden (self-hosted `.woff2` unter `/fonts/`,
kein Google-CDN, DSGVO bleibt gewahrt). Für ein Editorial-Newsletter-Produkt mit Kaffee-Marke passt
eine Serif im Titel: z. B. Source Serif 4 oder Fraunces, `600/700`.

```css
@font-face{font-family:"Aban Serif";src:url(/fonts/source-serif-600.woff2) format("woff2");
  font-weight:600;font-display:swap;}
:root{
  --font-display:"Aban Serif", Georgia, "Times New Roman", serif;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; /* bleibt */
}
h1,h2,.price .pp,.stat b { font-family: var(--font-display); font-weight: 600; letter-spacing:-.015em; }
h1 { font-weight: 600; }        /* 900 ist zu laut für Serif */
```
Fliesstext bleibt Systemschrift. Der Kontrast Serif-Titel / Sans-Text ist das schnellste Signal
„von Menschen gesetzt". Eine Datei, ca. 25 kB.
**Wirkung: sehr hoch, Aufwand klein.**

### K4 — Ein echtes Bild in den ersten Bildschirm, ein Autorenporträt in den Autorenkasten
**Gilt für:** `index.html`, `beratung.html`, die Dossier-Vorlage.
Das CSS-Mockup mit den drei Ampelpunkten (`.mock`, `.tl.r/.y/.g`) ist das generischste Element der
Seite. Ersetzen durch ein Foto einer echten Ausgabe auf einem Bildschirm oder Ausdruck neben der
Kaffeetasse, oder — wenn kein Foto verfügbar ist — durch eine typografische Ausgaben-Karte ohne
Fensterrahmen: nur Datum, Ausgabennummer, drei Zeilen, dünne Trennlinien, leicht gedreht
(`transform: rotate(-.6deg)`), auf Papierton `#fdfaf3` statt Weiss.
Im Autorenkasten den Buchstabenkreis „A" durch ein Porträt (64 px, `border-radius:50%`) ersetzen.
Bilder gehören ins Repo, `img/site/` existiert bereits.
**Wirkung: hoch.** Eine Seite ganz ohne Fotos wirkt automatisch generiert.

### K5 — Kartenlast senken: nur noch das Wichtigste bekommt einen Rahmen
**Gilt für:** `index.html`, `angebote.html`, Kaufberater-Vorlage, Dossier-Vorlage.
Drei Stufen statt einer:

```css
/* Stufe 1 — normal: kein Kasten, nur Raster + Haarlinie */
.card { background:none; border:0; box-shadow:none; padding:0 0 1.4rem;
        border-top:1px solid #ead9c2; padding-top:1.1rem; border-radius:0; }
.card:hover { transform:none; box-shadow:none; }
/* Stufe 2 — hervorgehoben: Papierfläche, kein Rahmen */
.card--raised { background:#fffdf8; border:0; box-shadow:0 1px 2px rgba(60,40,15,.06);
        border-radius:10px; padding:1.5rem; }
/* Stufe 3 — Preis/Angebot: bleibt wie heute */
```
Radien insgesamt zurücknehmen: `--r-lg: 14px → 10px`, `--r-xl: 20px → 12px`, die `28px` der
`.band` auf `14px`. Auf `angebote.html` die 28 Kästen zu einer Tabelle mit Zeilentrennern machen:
Name links, Preis rechtsbündig, Link rechts — der Inhalt ist bereits eine Preisliste, also soll er
wie eine aussehen.
**Wirkung: hoch.**

### K6 — Verläufe und Glow entfernen
**Gilt für:** `index.html` (Hero, `.band`, `.price.feat`), Kaufberater-Hero, `css/modern.css`.

- `index.html:113`: `.hero h1 .hl` — Text-Gradient raus, stattdessen `color:#b45309;` (einfarbig).
- `index.html:104-106`: die zwei Radial-Gradienten entfernen, Hero auf eine Fläche `#fffdf9`,
  darunter eine 1-px-Trennlinie `#ead9c2`. Wärme kommt aus der Fläche, nicht aus dem Verlauf.
- `index.html:198`: `.band{background:linear-gradient(135deg,#1f2b38,#2c3e50)}` → `background:#1e2a35;`
- `.price.feat`: `box-shadow:var(--shadow),0 0 0 4px var(--amber-lt)` und `transform:translateY(-6px)`
  streichen; Hervorhebung nur über `border:2px solid #b45309` und eine dunkle statt oranger
  Schaltfläche.
- Kaufberater-Hero: Orange-Verlauf durch eine Fläche `#7c2d12` ersetzen, das Emoji-Wasserzeichen
  löschen.
- `css/modern.css:7`: `--grad-warm` nur noch dort verwenden, wo eine Fläche fachlich Verlauf braucht
  (Charts) — sonst nicht.
**Wirkung: hoch, Aufwand sehr klein.**

### K7 — Wärmere, eigene Grautöne statt Tailwind-Standard
**Gilt für:** global, `:root` in `styles.css` und der Inline-Block in `index.html`.
Aktuell steht kaltes `#e5e7eb` / `#6b7280` / `#1f2937` auf warmem Creme `#fffbf5` — dieser Bruch
lässt Seiten „zusammengeklickt" wirken. Ersetzen:

```css
:root{
  --c-border:#ead9c2;   /* statt #e5e7eb */
  --c-muted:#7a6a58;    /* statt #6b7280 */
  --c-text:#241c14;     /* statt #1f2937 */
  --c-text-2:#3c3025;   /* statt #374151 */
  --c-card:#fffdf8;     /* statt reines #ffffff */
  --c-shadow:rgba(60,40,15,.06);
  --c-shadow-lg:rgba(60,40,15,.10);
}
```
Dieselben Werte im Inline-Block von `index.html` auf `--line`, `--muted`, `--ink`, `--ink2`, `--card`
spiegeln. Eine Änderung, die auf allen 152 Seiten gleichzeitig wirkt.
**Wirkung: mittel bis hoch, Aufwand minimal.**

### K8 — CTAs ausdünnen und den mobilen Stapel entwirren
**Gilt für:** `index.html` und alle Seiten mit fixierten Leisten.

- Erster Bildschirm mobil: nur **ein** Abo-Aufruf. Den zweiten Button
  („Gratis-Briefing abonnieren", direkt unter dem Formular) entfernen.
- Sprach-Leiste unten: `position:fixed` durch eine einzeilige, nicht fixierte Leiste **im
  Kopfbereich** ersetzen — sie überdeckt aktuell nachweislich Inhalte (Consent-Zeile,
  PDF-Geschenk-Link). Regel: höchstens eine fixierte Schicht gleichzeitig, das ist `#mcta`.
- Schnell-Link-Leiste: von acht auf fünf Ziele kürzen (Suche, Tools, Märkte, Ratgeber, Premium),
  Pillen ohne Emoji, Aktiv-Pille nicht orange gefüllt, sondern `border-bottom:2px solid #b45309`.
- Mega-Footer: die vierte Spalte („Mehr", 60+ Rechner) auf 8 Einträge kürzen plus einen Link
  „Alle Tools (A–Z) →" auf eine eigene Übersichtsseite.
**Wirkung: mittel, gleichzeitig ein echter Usability-Fix.**

---

## 3. Was gut funktioniert — nicht anfassen

- **Palette und Marke.** Bernstein `#d97706` / `#b45309` auf Creme `#fffbf5` ist eigenständig,
  warm und im DACH-Newsletter-Umfeld selten. Nur die Grauwerte daneben nachziehen (K7), die
  Bernstein-Töne selbst bleiben.
- **Der Fliesstext der Kaufberater.** `airfryer-kaufen-schweiz` ist typografisch der beste Teil der
  Site: linksbündig, ~72 Zeichen Zeilenbreite, gute Zeilenhöhe, H2 mit orangem Randbalken statt
  Kasten. Diese H2-Auszeichnung (`border-left`) ist genau das ruhige Mittel, das der Startseite
  fehlt — eher ausweiten als ändern.
- **Der „Kurz & bündig"-Antwortkasten** ganz oben in den Ratgebern: linker Balken, getönte Fläche,
  kein Rahmen, kein Radius-Rundum. Vorbildlich, und das Muster für K5 Stufe 2.
- **Die Werkzeug-Seiten** (`mwst-rechner`, `ai-sichtbarkeit`): Aufgabe, Eingabe, Ergebnis in
  Sekunden erfassbar; die drei Ergebniskacheln Netto/MwSt/Brutto sind richtig gebaut. Nur das
  💡-Emoji im Hinweisbalken durch ein Strich-Icon ersetzen (K2), sonst unverändert lassen.
- **Die Preistabelle** inhaltlich: vier Stufen, ehrliche Feinschrift zu Währung und Kündigung,
  der Founding-Hinweis „≈ 8 Monate Premium". Nur die Verläufe/Glow abnehmen (K6), Struktur und
  Reihenfolge bleiben.
- **Der Ton der Texte.** Direkt, schweizerisch, ohne Agentursprache. Zu bearbeiten sind nur die
  wiederholten Bausteine („ohne Hype", „X statt Y") — und zwar durch Streichen an 80 % der Stellen,
  nicht durch neue Formulierungen.
- **Verzicht auf Google Fonts und Tracking-Pixel.** Bleibt. K3 funktioniert self-hosted.

---

## Reihenfolge fürs Umsetzen

1. K7 + K6 (reine Variablen- und Zeilenänderungen, wirken sofort auf allen 152 Seiten)
2. K3 (eine Schriftdatei, zwei Regeln)
3. K2 (Icon-Set — die Zwischenlösung mit Bernstein-Kacheln geht in 10 Minuten)
4. K1 (Sektions-Varianten in `index.html`, danach in die sieben Generator-Vorlagen)
5. K5, K8, K4

Nach 1–3 ist der „KI-Look" bereits deutlich weg, ohne dass eine einzige Seite neu gebaut wurde.
