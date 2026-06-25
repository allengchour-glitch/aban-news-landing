# aban — Design-System &amp; Anti-Slop-Regeln

> Zweck: abannews-Seiten sollen **nicht KI-generiert aussehen**. Dieses Dokument gibt jeder
> Design-Arbeit (Mensch oder KI) exakte Tokens **und explizite Negativ-Regeln**. Lies es,
> bevor du eine Seite gestaltest. Quelle der Prinzipien: Web-/YouTube-Recherche 2026 (s. unten).
> Stand: 2026-06-25

## 0. Der wichtigste Satz
**Typografie + Layout-Eigenheit schlagen jeden Verlauf.** Der KI-Look entsteht durch
*generische Gleichförmigkeit*, nicht durch zu wenig Effekte. Weniger Effekt, mehr Charakter.

---

## 1. ❌ Negativ-Regeln (die „AI-Slop"-Tells — NICHT tun)
1. **Kein lila/blauer Standard-Verlauf** als Hero-Hintergrund (das Klischee schlechthin).
2. **Keine 3–4 gleich grossen Icon-Karten in symmetrischem Grid** als Hauptsektion. Wenn Karten, dann
   ungleich (Bento/asymmetrisch) oder als Liste mit echtem Inhalt.
3. **Kein zentriertes Hero** „Eyebrow → Riesen-Headline → Untertitel → 2 Buttons → Stats-Reihe".
   Genau dieses Muster = KI-generiert. (Mein altes `leistungen`-Redesign war das — verworfen, zu Recht.)
4. **Nicht Inter / System-Default als Display-Font.** Headlines brauchen Charakter (siehe §2).
5. **Keine 4+ Typo-Stile im Hero** (Eyebrow-Pill + Gradient-Wort + Sub + Badge …) = visuelles Rauschen.
6. **Keine generischen Emoji-Icons** (🚀✨🤖) als Haupt-Designelement. Lieber 1 echtes Bild/Skizze
   oder gar kein Icon.
7. **Keine Hype-Copy** („Empower your business", „revolutionär", „einzigartig", „Gamechanger").
8. **Kein Shimmer/Glow/Pulse als Selbstzweck.** Bewegung nur, wo sie etwas führt.

## 2. ✅ Typografie (der #1-Hebel)
- **Headlines:** eine Charakter-Schrift — Display-**Serif** passt zur ehrlich-redaktionellen Marke
  (z. B. „Fraunces", „Newsreader", „Spectral" via self-hosted/`font-display:swap`) ODER ein markanter
  Grotesk. **Nicht** dieselbe Schrift wie der Fliesstext.
- **Fliesstext:** ruhiger, gut lesbarer Sans (System-Stack ist ok für Body — aber NICHT für Headlines).
- **Genau 2 Schriften.** Eine fürs Display, eine für Text. Mehr = Rauschen.
- Grosse, ruhige Headline (ein Stil, kein Gradient-Wort-Mix). Optisch korrigiertes `letter-spacing`.

## 3. ✅ Farbe (abannews-Palette — bewusst warm, nicht generisch)
```
--ink:    #1f2937   /* Text dunkel            */
--ink2:   #374151   /* Text sekundär          */
--paper:  #fffdf9   /* Hintergrund warm-weiss */
--cream:  #fef3c7   /* Akzentfläche           */
--amber:  #d97706   /* Marken-Akzent (sparsam)*/
--amber-dk:#b45309  /* Links / starke Akzente */
--ok:     #059669   /* Erfolg/Trust           */
--line:   #ece3d4   /* Rahmen, warm           */
```
- **Amber sparsam** (Akzent, nicht Fläche). Warmes Papier statt kaltem Weiss = sofort weniger „Tech-Slop".
- **Kein** dunkelblauer „SaaS-Night"-Hero als Default. Wenn dunkel, dann selten + begründet.

## 4. ✅ Layout (Eigenheit statt Schablone)
- **Asymmetrie:** linksbündige Hero-Headline mit viel Weissraum rechts; oder 60/40-Split Text/Visual.
- **Editorial:** lies sich wie ein gutes Magazin — Vorspann, klare Hierarchie, Zwischenzeilen mit Haltung.
- **Bento/ungleiche Kacheln** statt N gleicher Karten, wenn Übersicht nötig.
- **Echte Details:** eine handgemachte SVG-Skizze, eine Fussnote, eine ehrliche „so wähle ich aus"-Box —
  menschliche Spuren, die kein Template hat.
- **Spacing-Tokens:** 4/8/12/16/24/40/64 px. Radius: 12–16 px. Konsistent, nicht random.

## 5. Bewegung &amp; Performance
- Nur `transform`/`opacity` animieren. `prefers-reduced-motion` immer respektieren.
- Dezent: ein sanftes Scroll-Reveal ist ok; Shimmer/Pulse/Parallax meist nicht.
- Keine externen Font-/JS-CDNs, wenn vermeidbar (self-host, `font-display:swap`).

## 6. Stimme (passt zum Look)
Ehrlich, schweizerisch (Hochdeutsch, „ss", „CHF", du-Form), anti-hype, konkret. Sag auch, wann sich
etwas **nicht** lohnt. Die Stimme ist Teil des „nicht-KI"-Eindrucks — generische Marketing-Sprache ist
selbst ein Slop-Tell.

---

## Quellen (Recherche 2026)
- 925studios — *AI Slop Web Design: Spotting &amp; Fixing Generic Websites* (2026)
- Crea8ive — *Anti-AI Design Trends 2026: 5 Ways to Look Human*
- MindStudio — *Avoid AI Slop with a Design-System Approach*
- Medium (Chirag T / Ketan K.) — *Why AI-built sites look the same*
- YouTube: Julian Ivanov — *Websites die nicht KI-generiert aussehen (Claude Code)*; Figma/Envato 2026-Trends
