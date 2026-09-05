# Design-Review: aban news — Warum es „nach KI" wirkt

## 1. Warum es nach KI aussieht: 8 konkrete Muster

### 1.1 Extrem konsistente border-radius (Alle Buttons perfekt rund)
**Beleg:** index-fold.png, angebote-fold.png (blaue Buttons, orange CTA-Buttons)
- Alle Buttons: `border-radius: 999px` (absolut perfekt symmetrisch)
- Alle Cards: `border-radius: var(--r-lg)` = `14px` (nie variiert)
- Alle Inputs: `border-radius: var(--r)` = `10px` (exakt)
- **Problem:** Das Auge erkennt sofort: Maschine hat das gemacht. Echte Handwerk hat manchmal 18px, manchmal 12px, nie immer 14px.

### 1.2 Perfekt berechnete Schatten überall
**Beleg:** index-fold.png (Newsletter-Box), mwst-rechner-fold.png (Rechner-Card)
- `.card: 0 1px 6px rgba(…)`
- `.card--highlight: 0 4px 24px rgba(217,119,6,0.12)` (exakt kalkuliert)
- `.mock (E-Mail): 0 24px 60px rgba(28,37,48,0.13)`
- **Problem:** Kein Schatten wirkt „beiläufig" — alle sind perfekt geometrisch. Echte Seiten haben teils stärker, teils weaker, je nach Gefühl.

### 1.3 Zu uniforme Farbpalette (Bernstein = immer #d97706)
**Beleg:** Alle Screenshots (oranger CTA, Akzente)
- `--c-accent: #d97706` (nie variiert)
- `--c-accent-hi: #b45309` (nur 2 Stufen)
- Kein Mittelton oder Pastell-Bernstein
- **Problem:** Echte Marken haben 4–6 Bernstein-Tönungen, nicht 2. Alles wirkt „aus einem RGB-Regler" gezogen.

### 1.4 Symmetrische Hero-Struktur (Text links = immer)
**Beleg:** index-fold.png, beratung-fold.png, airfryer-kaufen-schweiz-fold.png
- `.hgrid { grid-template-columns: 1.06fr .94fr }` (immer Text–Links, Content–Rechts)
- Airfryer-Seite: Bild links, Text rechts (ausnahmsweise)
- **Problem:** 2 verschiedene Strukturen, aber beide ultra-symmetrisch. Null asymmetrische Layouts.

### 1.5 Zu viele Info-Boxen statt Fließtext
**Beleg:** angebote-fold.png (6 identische Cards in 2×3-Grid), index-fold.png (3 Cards „Was kostet?")
- Jede Info muss in `.card` verpackt sein
- Kein reiner Textabschnitt ohne Struktur
- **Problem:** Generierte Seiten sehen so aus. Handmade Seiten haben Wild-Mix: manchmal Fließtext, manchmal eine Box.

### 1.6 Ikonografie viel zu einheitlich
**Beleg:** Alle Screenshots (Emoji in Boxen: 📰 🧰 🛍️ 💶 etc.)
- `.ico { width: 40px; height: 40px; … }` (überall gleich)
- Alle Emojis gleich groß, gleiche Platzierung
- **Problem:** Handmade-Seiten haben manchmal Text statt Icon, manchmal Ikon nur oben, manchmal oben-links. Aban hat die Systemati überall.

### 1.7 Zu viel Gradient (modern.css)
**Beleg:** index-fold.png (Hero mit zwei Radialgradienten + Linear), mwst-rechner-fold.png (Hero)
- `--grad-warm: linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #c2410c 100%)`
- Hero mit 3 Ebenen: radial-gradient (900px) + radial-gradient (700px) + linear-gradient
- **Problem:** Zu viel „Design-Tool-Output". Echte Seiten: einfaches Beige, vielleicht ein Strich.

### 1.8 Spacing nach strictem CSS-Schema
**Beleg:** index.html + css/styles.css (Zeilen 38–46)
- `--space-1: 0.25rem, --space-2: 0.5rem, --space-3: 0.75rem … --space-9: 6rem`
- ALLES folgt diesem Schema (nie 1.3rem „weil es sich richtig anfühlt")
- `.card: padding: var(--space-5)` (immer 1.5rem)
- **Problem:** Perfekt-Raster ist maschinell. Handmade: manchmal 1.4rem, manchmal 1.6rem.

---

## 2. 8 wirksamste Korrektionen (nach Impact sortiert)

### Korr #1: Border-Radius variieren → menschliche Unschärfe
**Wirkung:** Höchste (Auge sieht sofort Unterschied)  
**Zielgruppe:** Alle Cards, Buttons, Inputs  
**Konkrete CSS-Änderung:**

```css
:root {
  --r-xs: 4px;      /* Inputs */
  --r-sm: 8px;      /* kleine Cards, Tabs */
  --r: 12px;        /* Standard (nicht 10px) */
  --r-lg: 16px;     /* große Cards (nicht 14px) */
  --r-xl: 22px;     /* CTAs, Highlights */
  --btn-radius: 16px; /* Buttons (nicht 999px!) */
}

/* Buttons: nicht überall rund, sondern deutlich eckiger */
.btn, .nav-cta {
  border-radius: var(--btn-radius);  /* 16px, nicht 999px */
}

/* Input-Varianz */
.subscribe input {
  border-radius: var(--r-sm);  /* 8px statt --r */
}

/* Cards abgestuft */
.card              { border-radius: var(--r-lg); }     /* 16px */
.card--feature     { border-radius: var(--r-xl); }     /* 22px, größer */
.card--legal       { border-radius: var(--r-sm); }     /* 8px, kleiner */
```

**Markup-Auswirkungen:** Keine (nur CSS-Variablen).  
**Rendering:** Buttons sehen jetzt weniger „Pille" aus, mehr „moderater rechteck". Cards haben unterschiedliche Ecken.

---

### Korr #2: Farbpalette nuancieren → Bernstein-Varianz
**Wirkung:** Hoch (bricht Monotonie)  
**Zielgruppe:** Akzente, Buttons, Hover-States  
**Konkrete CSS-Änderung:**

```css
:root {
  /* Bernstein: 5 Tönungen (nicht 2) */
  --c-accent-50: #fef3c7;    /* sehr hell, als Hintergrund */
  --c-accent: #d97706;       /* Standard Orange */
  --c-accent-dk: #b45309;    /* Dunkel (bisherig: --c-accent-hi) */
  --c-accent-deep: #92400e;  /* Sehr dunkel, Hover-Alternative */
  
  /* Creme variiert leicht */
  --c-bg-alt: #fef3c7;       /* hell */
  --c-bg-alt-warm: #fdebd0;  /* wärmer, leicht rötlich */
  --c-bg-alt-cool: #fef9f0;  /* kühler, cremiger */
}

/* Button-Hover nicht immer dunkel */
.btn:hover {
  background: var(--c-accent-deep);  /* #92400e statt festes --c-accent-hi) */
}

/* Alternativ: abwechselnd Cards */
.cards > .card:nth-child(even) {
  background: linear-gradient(135deg, var(--c-bg) 0%, var(--c-bg-alt-warm) 100%);
}
```

**Markup-Auswirkungen:** Keine.  
**Rendering:** Bernstein ist jetzt nicht immer identisch. Hero kann mal `--c-bg-alt-cool`, mal `--c-bg-alt-warm` sein.

---

### Korr #3: Schatten „matchen Gewicht", nicht exakt kalkuliert
**Wirkung:** Mittel (subtil, aber sichtbar)  
**Zielgruppe:** Cards, Buttons, Hero-Mock  
**Konkrete CSS-Änderung:**

```css
:root {
  /* 3 Schatten-Stufen (nicht 5) */
  --shadow-sm: 0 2px 4px rgba(31, 23, 8, 0.06);
  --shadow: 0 4px 12px rgba(31, 23, 8, 0.08);     /* Standard */
  --shadow-lg: 0 8px 24px rgba(31, 23, 8, 0.12);
  /* Weg: --shadow-soft, --shadow-lift (modern.css) */
}

.card {
  box-shadow: var(--shadow);  /* Standard, klarer */
}
.card:hover {
  box-shadow: var(--shadow-lg);  /* subtiler Anstieg */
}
.card--feature {
  box-shadow: var(--shadow-lg);  /* nicht extra-berechnet */
}

/* Buttons: kein Hover-Lift-Schatten, nur transform */
.btn:hover {
  transform: translateY(-2px);
  box-shadow: none;  /* Schatten raus, Lift reicht */
}
```

**Markup-Auswirkungen:** Keine.  
**Rendering:** Weniger Schatten-Fluff, natürlicher.

---

### Korr #4: Asymmetrie in Heros einführen → abwechselnd Layouts
**Wirkung:** Hoch (bricht visuelle Monotonie)  
**Zielgruppe:** `.hgrid` in Sections  
**Konkrete Markup + CSS-Änderung:**

```html
<!-- Abwechselnd: gerade = Text rechts, ungerade = Text links -->
<section class="hero hero--warm" data-layout="text-left">
  <div class="wrap">
    <div class="hgrid hgrid--rev">
      <!-- Bild/Box zuerst, dann Text -->
      <div class="hero-content">…</div>
      <div class="hero-text">…</div>
    </div>
  </div>
</section>

<section class="hero hero--warm" data-layout="text-right">
  <div class="wrap">
    <div class="hgrid">
      <!-- Text zuerst (Standard) -->
      <div class="hero-text">…</div>
      <div class="hero-content">…</div>
    </div>
  </div>
</section>
```

```css
.hgrid {
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
  align-items: center;
}
/* Reverse: Spalten tauschen */
.hgrid--rev {
  direction: rtl;  /* oder: grid-template-columns: 1fr 1fr; order */
}
.hgrid--rev > * {
  direction: ltr;  /* Text bleibt ltr */
}
```

**Markup-Auswirkungen:** Moderate (jede Hero-Section braucht `.hgrid--rev` oder nicht).  
**Rendering:** Beim Scrollen: rechts, links, rechts, links — mehr visuelles Interesse.

---

### Korr #5: Icons reduzieren und variieren (nicht bei jedem Punkt)
**Wirkung:** Mittel (bricht Wiederholung)  
**Zielgruppe:** Card-Grids, Listen (`.promise`, `.cards`)  
**Konkrete Markup + CSS-Änderung:**

```html
<!-- Statt: ALLE Cards mit .ico -->
<div class="cards">
  <a class="card" href="#"><div class="ico">📰</div><h3>…</h3><p>…</p></a>
  <a class="card" href="#"><div class="ico">🧰</div><h3>…</h3><p>…</p></a>
  <a class="card" href="#"><div class="ico">🛍️</div><h3>…</h3><p>…</p></a>
</div>

<!-- Neu: abwechselnd, manche nur Text, manche Icon unten -->
<div class="cards cards--mixed">
  <a class="card card--icon-top" href="#"><div class="ico">📰</div><h3>…</h3><p>…</p></a>
  <a class="card card--no-icon" href="#"><h3>🛍️ Kauf-Beratung</h3><p>…</p></a>
  <a class="card card--icon-bottom" href="#"><h3>…</h3><p>…</p><div class="ico ico-sm">💶</div></a>
</div>
```

```css
.ico {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 0.8rem;
  opacity: 0.9;
}
.ico-sm {
  width: 28px;
  height: 28px;
  font-size: 0.95rem;
}

.card--no-icon {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.card--icon-bottom .ico {
  margin-top: 1rem;
  margin-bottom: 0;
}

/* Jede 3. Card ohne Icon */
.cards--mixed > .card:nth-child(3n) .ico {
  display: none;
}
```

**Markup-Auswirkungen:** Kleine (Icons optional, `.card--no-icon` class).  
**Rendering:** Nicht alle Cards gleich aussehen. Visuelle Variation.

---

### Korr #6: Spacing weniger rigid → „Atem"-Variation
**Wirkung:** Mittel (psychologisch wichtig)  
**Zielgruppe:** Section-Padding, Card-Gaps  
**Konkrete CSS-Änderung:**

```css
:root {
  /* Space-Schema leicht aufgelockert */
  --space-4: 1rem;
  --space-5: 1.4rem;   /* war: 1.5rem */
  --space-6: 2rem;
  --space-7: 2.8rem;   /* war: 3rem — nicht exakt */
  --space-8: 4rem;
  --space-9: 5.6rem;   /* war: 6rem — leicht weniger */
}

/* Sections: nicht immer identisch */
section { padding: var(--space-7) 0; }
section.alt { padding: var(--space-8) 0; }    /* leicht größer */
section.deep { padding: var(--space-6) 0; }   /* leicht kleiner */

/* Cards: Gap variiert je nach Kontext */
.cards {
  gap: 1.2rem;  /* nicht --space-5, sondern 1.2rem */
}
.cards--wide {
  gap: 1.8rem;  /* unterschiedlich */
}
```

**Markup-Auswirkungen:** Keine.  
**Rendering:** Sections haben nicht exakt gleiche Höhe. Wirkt weniger „gemessen".

---

### Korr #7: Hero-Gradient weglassen → einfaches Beige + Strich
**Wirkung:** Mittel (bricht KI-Design-Tool-Look)  
**Zielgruppe:** `.hero.hero--warm`  
**Konkrete CSS-Änderung:**

```css
/* Alt: 3 Gradienten übereinander */
.hero.hero--warm {
  background:
    radial-gradient(900px 480px at 88% -8%, var(--grad2), transparent 60%),
    radial-gradient(700px 420px at 6% 0%, var(--cream), transparent 55%),
    linear-gradient(180deg, #fffdf9, var(--bg));
}

/* Neu: nur einfaches Beige + oben Strich */
.hero.hero--warm {
  background: linear-gradient(to bottom, #fef9f0, var(--c-bg));
  border-top: 3px solid var(--c-accent);
  border-bottom: 1px solid var(--c-border);
}
```

**Markup-Auswirkungen:** Keine.  
**Rendering:** Hero sieht nicht nach „AI Design Tool" aus, sondern nach klassischer Print-Anzeige.

---

### Korr #8: Eine "Fließtext-Sektion" ohne Cards als Vorlage hinzufügen
**Wirkung:** Niedrig technisch, hoch psychologisch  
**Zielgruppe:** Generator-Templates (`.md` → `.html`)  
**Konkrete Markup-Änderung:**

```html
<!-- Neu: .prose-section (kein Card-Zwang) -->
<section class="prose-section">
  <div class="wrap wrap--narrow">
    <h2>Ehrlich, ohne Hype — so geht KI bei aban news</h2>
    <p>
      Wir testen alles selbst. Kein Affiliate, kein Hype, kein Jargon.
      Dein Fokus: wertvolle Tools, nicht Marketing-Geschichten.
    </p>
    <p>
      Jeden Morgen Mo–Fr um 7:30 Uhr: 3 Entwicklungen, 1 Tool, 1 Prompt.
      Lies dich schlau statt abgelenkt.
    </p>
    <div style="margin-top: 1.5rem">
      <a href="#signup" class="btn btn--lg">Newsletter abonnieren</a>
    </div>
  </div>
</section>
```

```css
.prose-section {
  background: var(--c-bg);
  padding: var(--space-7) 0;
}
.prose-section h2 {
  font-size: 2rem;
  max-width: 48ch;
  margin-bottom: 1.2rem;
}
.prose-section p {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 56ch;
  color: var(--c-muted);
  margin-bottom: 1rem;
}
```

**Markup-Auswirkungen:** Moderate (neue Template-Klasse).  
**Rendering:** Endlich Seiten, die nicht aus Boxen bestehen. Echt wie handmade Blogs.

---

## 3. Was man NICHT anfassen soll

✓ **Bewahren (Marke):**
- `--c-bg: #fffbf5` (Warm-Weiss, Kern der Marke)
- `--c-accent: #d97706` (Bernstein als Haupt-Farbe, nicht raus)
- Font-Stack (system fonts, DSGVO-safe)
- Sticky Header (funktioniert gut)
- Responsive Grid (1140px max-width bewährt)

✓ **Bewahren (UX):**
- `.btn` Hover-Transform (translateY, bewährt)
- Newsletter-Subscribe-Box Hero (Conversion)
- 5-Min-Versprechen (Kernmessage)
- Emoji-Icons (Marken-Kern von Aban, nicht standardisieren)

✓ **NICHT verändern:**
- HTML-Struktur massiv umbauen (→ Generator-Reset nötig)
- Farbschema wechseln (Bernstein ist Identität)
- Überschriften-Gewichte (800–900 sind richtig)
- Mobile-Breakpoints (bewährte `max-width: 600px`)

---

## Implementierungs-Fahrplan

1. **Woche 1: CSS-Variablen (Korr #1–#3)**
   - `css/styles.css`: `--r-*` und `--shadow-*` anpassen
   - `css/modern.css`: `--grad-*` raus (auf nur 1 einfaches Gradient)
   - Test: Screenshot desktop + mobile

2. **Woche 2: Markup-Varianz (Korr #4–#6)**
   - `.hgrid--rev` Add zu alternierenden Heros
   - `.card--no-icon`, `.card--icon-bottom` Add (manche Cards)
   - Section-Padding-Variaz im CSS (`.alt`, `.deep`)

3. **Woche 3: Generator-Templates (Korr #7–#8)**
   - `.prose-section` Template Sketch hinzufügen
   - Generator-Outputs prüfen: sind Grids zu rigid?
   - Spot-Fix in 2–3 häufigen Templates

4. **Woche 4: QA + Edge Cases**
   - Alle 152 Seiten im Smoke-Test
   - Mobile (320px–1280px) prüfen
   - Dark Mode (falls vorhanden) prüfen

---

## Ergebnis

Nach Umsetzung wirkt abannews.com:
- **Weniger KI-gemacht:** Asymmetrie, Farbvariation, natürliche Schatten
- **Mehr Handwerk:** Unterschiedliche border-radius, keine starre Struktur
- **Marke bewahrt:** Bernstein, Warm-Weiss, Newsletter-Kern bleiben
- **Einfach umsetzbar:** Nur CSS-Variablen + optionale Markup-Klassen, kein Neubau
