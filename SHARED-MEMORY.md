# 🔗 SHARED-MEMORY — Koordination aller Claude-Sessions (zuerst lesen!)

> **Mehrere Sessions arbeiten parallel auf DIESEM Repo (`allengchour-glitch/aban-news-landing`)
> UND demselben Shopify-Shop (LuxeStyle, `au3j0y-hq.myshopify.com` / luxestyle.ch).**
> Diese Datei verhindert, dass sie sich gegenseitig überschreiben. **Jede Session:** erst hier rein,
> dann die eigene Detail-Memory. **Nach grösseren Aktionen:** Abschnitt „Live-Stand" unten aktualisieren.
> Stand: 2026-06-16.

---

## 👥 Die Sessions & wem was „gehört" (Konflikte vermeiden)
| Session | Aufgabe | Detail-Memory | Branch |
|---|---|---|---|
| **abannews** | Newsletter/Hubs/Stripe-Shop auf abannews.com (KI-Content, GEO-Reports) | `PROJEKT.md` | eigene `claude/*` |
| **Luxestyle product** (CJ-Dropship) | CJ-Produktimport, Shop-Katalog, Social-Posten, Autopilot | `CLAUDE.md` + `dropship/*` | **`claude/luxestyle-product-CizQ6`** |
| **Dropshipping session** | (überschneidet sich mit ↑ — bitte abstimmen!) | `dropship/*` | — |
| **Lifestyle video project** | Reels/Clips/Video (braucht `YT_API_KEY`) | `video-prototypes/*`, `mediakit/*` | eigene |

> ⚠️ **Wichtigste Regel:** **CJ-Produktimport + Shop-Katalog + Social-Queue = nur die „Luxestyle product"-Session.**
> Andere Sessions: keine Produkte importieren / keine `social/posts_image.csv` ändern, sonst Dubletten/Konflikte.

## 🧱 Geteilte Ressourcen (alle teilen sich diese!)
- **1 Shopify-Shop** (LuxeStyle) — Zugriff über die **Shopify-MCP** (direkt in jeder Session, KEIN Key nötig).
- **1 Repo**, **1 `main`** → vor jedem Push `git pull --rebase`; **nie zwei Sessions gleichzeitig nach `main`**.
- **`social/posts_image.csv`** = Post-Queue (der Autopost-Bot committet sie auf `main`).
- **Bildpipeline** `automation/gen_image_gemini.py` (Vertex) ist für alle nutzbar.

## 🔑 Secrets-Status (geteilt — Stand 2026-06-08)
| Secret | Status |
|---|---|
| `GEMINI_API_KEY` | ✅ gesetzt (Billing aktiv) — KI-Bilder via Action |
| Meta (IG/FB/Threads) | ✅ gesetzt — Social-Posten läuft |
| `SHOPIFY_SHOP` + `SHOPIFY_CLIENT_ID/SECRET` | ✅ GESETZT (10.06.) — Autopilot/edited-product-images laufen |
| `CJ_EMAIL` + `CJ_API_KEY` | ❌ als Repo-Secret offen (in-Session vorhanden) |
| TikTok | ⏳ Reel-Autopost GEBAUT (FILE_UPLOAD, kein Domain-Verify) — fehlen nur 4 Secrets: TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN. Anleitung: `dropship/TIKTOK-AUTOPOST-AKTIVIEREN.md` |
| `YT_API_KEY` | ❌ offen (Video-Session) |
> Hinweis: Für Shopify-Arbeit **braucht keine Session einen Key** — das geht über die MCP. Keys nur für die Cron-Actions.

---

## 📊 LIVE-STAND (von jeder Session nach Aktionen aktualisieren)

- **🧠 2tes Gehirn INSTALLIERT (22.06., User-Wunsch „montiere eine 2 hirn"):** `tools/zweites_gehirn.mjs`
  (keyless Node) + Workflow `.github/workflows/zweites-gehirn.yml` (push/PR/daily 04:37/manual). Automatische
  Tool-QA, die die real gefundenen Bug-Klassen kodiert: inline-`<script>`-Syntaxfehler (hart), ungeguardetes
  `clipboard.writeText`, `JSON.stringify` ohne `<` neben `<script>`, `innerHTML`+`.value/.name` ohne esc()
  (XSS), `{}`-als-Map (`__proto__`-Falle), `new Array(var)` ohne Cap (OOM), `getRandomValues`+`%` ohne 2^32-Bound.
  Lauf: `node tools/zweites_gehirn.mjs` (`--strict` macht Hinweise zu Fehlern). **Beim Installieren sofort 3 reale
  KAPUTTE Tools gefunden + gefixt:** (1) `rechnung-generator.html` — gerades `"` mitten im JS-String (`„Merken" geladen`)
  → ganzes Skript tot; (2) `lesbarkeits-check.html` — `„…"`-Phrasen mit ASCII-Schluss-Quote; (3) `ai-sichtbarkeit.html`
  (+en/fr/it) — unescaptes `</script>` im Beispiel-Template-Literal → Browser schließt Skript zu früh. Jetzt 0 HARTE
  Probleme. **Lehre: deutsche „…"-Quotes + `</script>` in Strings/Templates immer escapen; Bot fängt das künftig ab.**
- **Tool #37 (22.06.) via 2tes-Gehirn:** Caesar-/ROT13-Verschlüsselung (Verschiebung 0–25 Slider, Encode/Decode-Toggle, ROT13-Preset, Brute-Force-Tabelle aller 25 [Zeile 13 hervorgehoben], Copy). Review 17 Asserts: rot() Wrap/Case/Decode-Roundtrip/ROT13-Self-Inverse/Punctuation-Pass-through, Brute-Force-Tabelle via esc() XSS-sicher (Text-Kontext), a11y → 0 Bugs; bot 0/0; html-validate exit 0. Nur ASCII A–Za–z verschoben (Umlaute/Emoji unverändert — korrekt). Viersprachig — rot/esc/run byte-identisch; nur 2 Flash je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 37 (Site: 892 Familien / 3012 Seiten).
- **Tool #36 (22.06.) via 2tes-Gehirn:** Markdown → HTML Konverter/Vorschau (Markdown-Textarea → Live-Preview via innerHTML + kopierbarer HTML-Code; Überschriften/Fett/Kursiv/Inline+Fenced-Code/Listen/Links/Zitate/HR). **Höchstes XSS-Risiko der Suite** (innerHTML mit konvertiertem Userinput). Design: **escape-first** (esc() auf GESAMTEN Input vor allen Transforms) + safeHref()-Scheme-Allowlist (nur http(s)/mailto/#/relativ, kein javascript:/vbscript:/data:) + NUL-Byte-Sentinels für Code-Spans (kein Digit-Kollision). Review fuhr 60 adversarische XSS-Tests (Raw-HTML, alle bösen Link-Schemes, Attribut-Breakout, Parser-Terminierung) → 60/60 PASS, 0 Bugs; bot 0/0; html-validate exit 0. Viersprachig — esc/safeHref/inline/convert + Sentinels byte-identisch (per od -c verifiziert). 4 Hubs, Sitemap 4/4. **Lehre: Markdown→HTML immer escape-first + Link-Scheme-Allowlist, nie das Roh-HTML durchlassen.** Tool-Suite jetzt 36.
- **Tool #35 (22.06.) via 2tes-Gehirn:** LocalBusiness Schema-Generator (Firmendaten + 11 Geschäftstypen + 7-Tage-Öffnungszeiten → schema.org-LocalBusiness-JSON-LD für lokale Rich Results, `</script>`/`<`-Escaping via <). **Installierter Bot fing beim Bauen sofort einen realen `</script>`-im-JS-Kommentar-Bug ab** (hätte Skript im Browser beendet) → entschärft. Deep-Review: 38 Asserts (JSON-LD-Shape, Tag-Mapping Mo→Monday, Feld-Escaping neutralisiert `</script>`, a11y) → 0 weitere Bugs; html-validate exit 0. Viersprachig — build/val + schema.org-Tagnamen byte-identisch; nur Kurz-Labels + Flash + aria-Suffixe je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 35 (Site: 890 Familien / 3004 Seiten). **Bonus-Beleg: der Bot fängt jetzt auch meine eigenen Fehler vor dem Review ab.**
- **Tool #34 (22.06.) via 2tes-Gehirn:** Open-Graph-/Social-Card-Vorschau (Titel/Beschr./URL/Bild/Site → Live-Karte Facebook+X/Twitter + kopierbare og:/twitter:-Meta-Tags). **Höchste XSS-Fläche bisher** (Userinput wird gerendert UND als Meta-Tags ausgegeben). Review fand realen **CSS-url()-Breakout**: Newline/CR/FF in Bild-URL beendet den CSS-String → background:url(javascript:…)-Ausbruch → `safeUrl` härtet jetzt gegen `[\s"'<>\\]`. Sonst sauber: alle Preview-Felder via textContent (kein innerHTML), alle Meta-Tags via esc(), og:image/og:url via safeUrl+esc → 0 weitere Bugs; html-validate exit 0. Viersprachig — esc/safeUrl/domainOf/render byte-identisch; nur „kein Bild"+2 Flash je Sprache. 4 Hubs, Sitemap 4/4. **Lehre: CSS-url() ist eine eigene Injection-Fläche — URL-Whitelist (kein Whitespace/Quote/Bracket), nicht nur Quote-Escaping.** Tool-Suite jetzt 34 (Site: 889 Familien / 3000 Seiten).
- **Tool #33 (22.06.) via 2tes-Gehirn:** JSON-String-Escaper (Toggle Escapen/Unescapen; Escape via JSON.stringify [+ optional umschließende Quotes weglassen, + Nicht-ASCII als \u via charCodeAt → korrekte Surrogate-Paare], Unescape via JSON.parse mit/ohne umschließende Quotes, Fehlerhinweis bei ungültigem String). Review: 80k-Fuzz-Roundtrips + astral-Emoji-\u-Test + Invalid-Pfade → 0 Bugs; html-validate exit 0; bot 0/0. **Placeholder-Attribut-Bug vorab gefixt (stray `"` → &quot;).** Viersprachig — uEscape/escape/unescape/Regex byte-identisch; nur 4 Strings je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 33.
- **Tool #32 (22.06.) via 2tes-Gehirn:** Sitemap.xml-Generator (URLs → valide XML-Sitemap mit lastmod/changefreq/priority, Dedup, 50.000-Cap, XML-Escaping, Copy + Download). Review per xmllint validiert (well-formed inkl. Ampersand-URL), 24 Asserts, 50.000-Cap exakt, leerer Zustand valide → 0 Bugs; html-validate exit 0. Viersprachig, 4 Hubs, Sitemap 4/4.
- **Tool #31 (22.06.) via 2tes-Gehirn:** CSS-Spezifitäts-Rechner (Selektor[en] → Spezifität a-b-c mit farbigen Badges + Erklärung; hand-rolled Selektor-Parser: löst :is/:not/:has/:matches [max der Argumente, nicht Summe] + :where [0] innermost-first auf, Attribute/IDs/Pseudo-Elemente [::x + Legacy :before/after/…]/Pseudo-Klassen/Klassen/Typ-Tokens). Review fuhr 20 W3C-Fälle + ~40 Edge-Cases durch (alle PASS) und fand+fixte 1 realen Miscount: namespaced Selektoren `svg|rect` ergaben 0,0,0 → Namespace-Strip-Zeile → 0,0,1. XSS via esc() abgedeckt (User tippt freien Selektor). html-validate exit 0. Viersprachig — specOne+EXAMPLES+Regexes byte-identisch; nur 2 Strings je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 31.
- **Tool #30 (22.06.) via 2tes-Gehirn:** Zufallszahlen-Generator (Bereich Von/Bis + Anzahl + „ohne Wiederholung" + Presets Würfel/Münze/Lotto/1–100; unbiased crypto.getRandomValues mit Rejection-Sampling, Unique via partielles Fisher–Yates). Review fand **2 REALE Bugs (Tab-Freeze!)**: (1) HIGH Infinite-Loop wenn span>2^32 (max=floor(2^32/n)*n=0 → while(a[0]>=0) endlos; via UI erreichbar Von=-3e9/Bis=3e9) → Guard; (2) MEDIUM OOM/Freeze durch new Array(span) im Unique-Modus bei riesigem Bereich (span=1e8→14s/1.5GB) → Guard max 1e7. Statistik node-verifiziert (Chi-Quadrat randBelow(6)=7.01 uniform, Inklusivität, Unique-Distinct). Viersprachig — RNG-Kern+Guards byte-identisch; nur Presets/Warn-Strings je Sprache. 4 Hubs, Sitemap 4/4. **Lehre: Rejection-Sampling-Range immer gegen 2^32 + Pool-Allokation begrenzen.** Tool-Suite jetzt 30.
- **Tool #29 (22.06.) via 2tes-Gehirn:** Zahlensystem-Umrechner (Binär/Oktal/Dezimal/Hex, 4 Felder, in jedes tippen → andere rechnen, **BigInt** für beliebig große Zahlen, Ziffern-Validierung pro Basis, ungültiges Feld rot markiert). Review 45 Tests: 0n-Handling korrekt (0n≠null/≠false → „0" überall), Big-Number-Roundtrip exakt ohne Number-Precision-Loss, alle Invalid-Cases (FG/8/2/12a/−5/Leerzeichen→false, leer→null), kein Cursor-Sprung/Feedback-Loop, XSS-safe → 0 Bugs; html-validate exit 0. Viersprachig — parseBig/toBase/update/DIGITS byte-identisch; nur 1 Warn-String je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 29.
- **Tool #28 (22.06.) via 2tes-Gehirn:** px ↔ rem Umrechner (CSS-Einheiten: zwei-Wege px/rem-Felder, einstellbare Basis-Schriftgröße + Preset-Chips 16/10/18/20/62.5, Referenztabelle häufiger px→rem-Werte). Review fand 1 a11y-Lücke (chips-Container `<span>` mit aria-label → role=group, sonst vom Screenreader ignoriert); 27/27 Tests: Umrechnung bei mehreren Basen, kein Feedback-Loop (programmatisches .value feuert kein input → kein Cursor-Sprung), Tabelle korrekt, NaN/Div-0-Guards, XSS-safe → 0 weitere Bugs; html-validate exit 0. Viersprachig — **inline-Script md5-identisch über alle 4** (keine übersetzbaren JS-Strings); nur HTML-Text je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 28.
- **Tool #27 (22.06.) via 2tes-Gehirn:** Trinkgeld- & Rechnung-teilen-Rechner (Rechnungsbetrag + Trinkgeld % [Presets 0/5/10/15/20 + custom] + Personen-Stepper + Aufrund-Checkbox → Trinkgeld, Gesamt, pro Person, Summe gerundet/exakt; CHF). Review fand 1 a11y-Lücke (Trinkgeld-Feld ohne accessible name → aria-label); Math per Node-Harness inkl. 5000-Iter-Fuzz: gerundete Summe nie < Gesamt, Personen-Clamp 1–100, kein Div-durch-0 bei leerem Feld, Preset-Sync (0% matcht nur bei echtem 0, nicht leer), XSS-safe → 0 weitere Bugs; html-validate exit 0. Viersprachig — calc/money/TIPS byte-identisch; nur Locale/Labels/Messages je Sprache. 4 Hubs, Sitemap 4/4. **Erstes Everyday-Consumer-Tool (breitere Reichweite).** Tool-Suite jetzt 27.
- **Tool #26 (16.06.) via 2tes-Gehirn:** Glassmorphism-Generator (Milchglas-CSS: Regler Unschärfe/Deckkraft/Rundung + Tönungsfarbe + Rand-Checkbox → background rgba + backdrop-filter (+ -webkit-) + border + box-shadow, Live-Vorschau über Verlauf, Copy). Review verifizierte Alpha-Mapping, hexToRgb, Border-Toggle (CSS lässt Zeile weg wenn aus), Preview==Output, XSS-safe → 0 Bugs; html-validate exit 0. Label-Fix: „Transparenz"→„Deckkraft" (höherer Wert = opaker, war irreführend). Viersprachig — render/CSS-Literale byte-identisch; nur 2 Flash je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 26.
- **Tool #25 (16.06.) via 2tes-Gehirn:** cubic-bezier-Generator (Easing-Kurve: Presets [ease/linear/ease-in/-out/-in-out + Schwung/sanft] + 4 Kontrollpunkt-Inputs x1/y1/x2/y2 mit x-Clamp [0,1], Canvas-Kurven-Vorschau, looping CSS-transition-Demo-Dot, Copy transition-timing-function). Review baute eine **Discrete-Event-Sim** und bewies: Animations-Timer bleibt unter Stress single-chain (clearTimeout-Guard), kein Cursor-Sprung beim Tippen gültiger Werte, Output exakt (−0→0), XSS-safe → 0 Bugs. canvas role=img gegen html-validate-Lint. Viersprachig — draw/update/restartAnim+PRESETS-Zahlen byte-identisch; nur 2 Preset-Namen + 2 Flash je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 25.
- **Tool #24 (16.06.) via 2tes-Gehirn:** Border-Radius-Generator (px/%-Toggle, „alle Ecken gemeinsam"-Checkbox, 4 Ecken-Regler TL/TR/BR/BL, Live-Vorschau auf Karo, kollabiert zu kurzem border-radius wenn alle gleich). Review verifizierte CSS-Ecken-Reihenfolge (TL TR BR BL), %-Clamp auf 50 beim Umschalten, Link-Verhalten ohne Infinite-Loop (programmatisches .value feuert kein input), Preview==Output, XSS-safe → 0 Bugs; node-check OK. Viersprachig — render/setUnit/ids byte-identisch; nur 2 Flash-Strings je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 24.
- **Tool #23 (16.06.) via 2tes-Gehirn:** Typo-Skala-Generator (modulare Schriftgrößen-Skala: Grundgröße + Verhältnis [8 Musik-Intervalle 1.067–1.618] + Stufen auf/ab → px+rem je Stufe + Live-„Ag"-Vorschau + :root-CSS-Variablen --font-step-N zum Kopieren). Review verifizierte Skala-Mathematik base·rat^i, Naming step-0/step-N/step-nN, clampInt-Grenzen, Guards, Preview-Cap (Math.min(px,40) NUR Anzeige, echte Werte in px/rem+CSS), XSS-safe → 0 Bugs; html-validate exit 0. Viersprachig — Mathematik+option-values byte-identisch; nur Intervall-Labels + Messages je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 23.
- **Tool #22 (16.06.) via 2tes-Gehirn:** HTML-Entity-Encoder/Decoder (Toggle Kodieren/Dekodieren; Encode immer & < > " ', optional alle >127 als numerische Entities; Decode benannt + dezimal &#nnn; + hex &#xnn;). Review 27/27 Tests: astral Surrogate-Roundtrip (🎨→&#127912;→🎨, kein Broken-Pair dank codePointAt+i++), malformte/out-of-range Entities verbatim erhalten, Prototype-Guard (hasOwnProperty), und **kritischer no-innerHTML-XSS-Trace** (Decode-Output nur in textarea.value, nie gerendert) → 0 Bugs; html-validate exit 0. Dublette „euro"-Key entfernt. Viersprachig — encode/decode/DEC-Map byte-identisch; nur 2 setMode-Labels + 2 Flash-Strings je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 22.
- **Tool #21 (16.06.) via 2tes-Gehirn:** Break-Even-Rechner (Gewinnschwelle: Fixkosten + Preis/Stück + variable Kosten/Stück → Break-even in Stück [aufgerundet] & Umsatz, Deckungsbeitrag/Stück + -quote, optional Zielgewinn → Stück+Umsatz; CHF). Review verifizierte in Node: cm≤0-Guard (kein Infinity/NaN-Leak), Math.ceil-Rundung, cmRatio, Zielgewinn-Mathematik, Fixkosten=0, Negative, Swiss-Number-Format → 0 Bugs; html-validate exit 0; XSS-safe. Viersprachig — Formeln hash-identisch; nur Locale/Labels/Messages je Sprache (Währung CHF). 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 21.
- **Tool #20 (16.06.) via 2tes-Gehirn:** Text-Werkzeug (eine Textarea, verkettbare Transforms: GROSS/klein/Titel-/Satz-Schreibweise, Leerzeichen bereinigen, Zeilen sortieren A→Z, Duplikat-Zeilen entfernen, Zeilenumbrüche entfernen, Umkehren; 1-Schritt-Undo, Clear, Copy, Live-Statistik). Review fand **subtilen Bug**: `dedup` mit `var seen={}` dedupliziert die Zeile `"__proto__"` NICHT (Zuweisung trifft Prototyp-Setter statt eigene Property; hasOwnProperty-Guard schützt nur das Lesen) → Fix `Object.create(null)`. Sonst sauber (emoji-sicheres reverse via Array.from, Title/Sentence-\p{L}-Regex, Undo) → html-validate exit 0. Viersprachig — OPS-Regexes/Object.create(null)/Array.from byte-identisch; nur localeCompare-Tag + Statistik-Wörter + Flash je Sprache. 4 Hubs, Sitemap 4/4. **Lehre: Objekt-als-Map für User-Strings immer Object.create(null), nie {} ('__proto__'-Falle).** Tool-Suite jetzt 20.
- **Tool #19 (16.06.) via 2tes-Gehirn:** Farbpaletten-Generator (Grundfarbe → Tönungen heller + Abstufungen dunkler [HSL-L-Rampe] + Harmonien Basis/Komplementär+180°/Analog±30°/Triadisch±120°, Klick kopiert HEX). Review verifizierte HSL-Roundtrip (0 Drift, Hue rot=0/grün=120/blau=240), Hue-Wrap bei negativen/>360 Grad, und **kein XSS** (Roh-Input erreicht nie innerHTML — alle Swatches via hslHex neu berechnet, clampHex rejectet Injection) → 0 Bugs; html-validate exit 0. Viersprachig — Farb-Mathematik byte-identisch; nur Labels je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 19.
- **Tool #18 (16.06.) via 2tes-Gehirn:** Marge- & Aufschlag-Rechner (Kosten + Modus [aus Verkaufspreis / Wunsch-Marge % / Wunsch-Aufschlag %] → Verkaufspreis, Gewinn, Marge %, Aufschlag %; CHF). Review verifizierte in Node: alle 3 Modi, Marge≥100%-Guard, Division-durch-0 (cost=0/price=0 → „—"), Verluste/Negative, und Cross-Konsistenz (Marge 37,5 % ⇆ Aufschlag 60 % bei Kosten 50 → beide Preis 80) → 0 Bugs. Viersprachig — Formeln byte-identisch; nur Labels/Locale/Messages je Sprache (Währung CHF). 4 Hubs, Sitemap 4/4. **Lehre: Marge=Gewinn/Preis, Aufschlag=Gewinn/Kosten — häufige Verwechslung, im Tool erklärt.** Tool-Suite jetzt 18.
- **Tool #17 (16.06.) via 2tes-Gehirn:** Einheiten-Umrechner (7 Kategorien: Länge/Gewicht/Temperatur/Fläche/Volumen/Geschwindigkeit/Datenmenge; faktorbasiert über Basiseinheit, Temperatur per Offset-Formel via Celsius; Swap, Faktor-Zeile, wiss. Notation bei groß/klein). Review verifizierte ~60 Asserts in Node: alle 9 Temp-Paare (inkl. −40-Crossover, 0K=−459,67°F), alle Faktoren (mi/lb/acre/gal/KiB/GiB…), und die verdächtige fmt-Exponential-Trim-Regex `/\.?0+e/` (1.050000e+9→1.05e+9, KEIN Ziffern-Verlust) → 0 Logik-Bugs; 1 a11y-Nit (redundantes aria-label). Viersprachig — alle Faktoren/Formeln/Abkürzungen byte-identisch; nur Kategorien-Labels + Einheiten-Wörter vor Klammer + UI je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 17.
- **Tool #16 (16.06.) via 2tes-Gehirn:** Seitenverhältnis-Rechner (2 Modi: „Maß berechnen" = Verhältnis + ein Maß → anderes, mit Presets 16:9/4:3/21:9/1:1/3:2/9:16/2:3/5:4 + last-edited-Logik; „Verhältnis kürzen" = zwei Maße → GCD-gekürztes Verhältnis + Dezimal). Review verifizierte: last-edited schreibt nie das getippte Feld (kein Feedback-Loop/Cursor-Sprung), GCD (Euklid) korrekt inkl. gcd(0,x)/||1-Guard, Dezimal-Inputs via factor=1000, kein XSS → 0 Bugs; fmtNum-Dead-Ternary vereinfacht. Viersprachig (Mathematik byte-identisch, nur 6 String-Zeilen je Sprache). 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 16.
- **Tool #15 (16.06.) via 2tes-Gehirn:** CSS clamp()-Generator (Fluid Typography: Min/Max-Größe + Min/Max-Viewport + rem-Basis → clamp(minRem, calc(interceptRem ± slopeVw), maxRem), Live-Demo, Warnungen). Review verifizierte in Node, dass das erzeugte clamp() an beiden Viewport-Enden exakt die Zielgröße ergibt (Drift ≤0,007 px), Division-durch-0 geguardet, min>max erzeugt gültiges absteigendes clamp (kein „+ -"), root≤0/NaN→16 → 0 Bugs. Viersprachig — build()-Mathematik MD5-identisch über alle Sprachen; nur Warn-/Demo-Strings je Sprache. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 15.
- **Tool #14 (16.06.) via 2tes-Gehirn:** Datum-Rechner (2 Modi: Differenz zwischen 2 Daten inkl. Inklusiv-Checkbox + Y/M/D + Wochen + Arbeitstage Mo–Fr; Datum ± Jahre/Monate/Tage mit Monatsüberlauf-Korrektur). Review fand **HIGH-Bug**: Y/M/D-Differenz nutzte Single-Borrow → bei Start-Tag > kurzem Borrow-Monat negative/falsche Tage (z.B. 31.01.→01.03. = „−1 T"). Fix: Relativedelta-Anchor-Algorithmus (gleiche Logik wie calcAdd), exhaustiv über 613k Datumspaare verifiziert, 0 Mismatches. Sonst sauber (parse rejectet 30.02./Nicht-Schaltjahr-29.02., UTC-Mathematik gegen DST, kein XSS, a11y). Viersprachig — Datums-Logik byte-identisch; nur WD/MO-Arrays (Sonntag-first/Jan-first) + Ergebnis-Labels je Sprache. 4 Hubs, Sitemap 4/4. **Lehre: Kalender-Differenz NIE mit Single-Borrow, immer Anchor-Algorithmus.** Tool-Suite jetzt 14.
- **Tool #13 (16.06.) via 2tes-Gehirn:** Arbeitszeit-Rechner (Tabelle Tag/Start/Ende/Pause → Netto-Stunden je Tag, Wochensumme als H:MM + Dezimalstunden, optional Stundensatz → Verdienst in CHF). Review verifizierte Zeit-Mathematik per Node-Harness (Mitternachts-Überquerung 22:00–02:00=4h, Pause>Spanne→0, Start==Ende→0 [nicht 24h], NaN-Guards, totals nie NaN, a11y) → 0 Bugs. Viersprachig — Kernfunktionen netMinutes/toMin/hhmm byte-identisch; nur DAYS, JS-aria-labels und Locale-Format (de/fr/it-CH Komma, en-CH Punkt) je Sprache; **Währung bleibt CHF (Schweizer Tool)**. 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 13.
- **Tool #12 (16.06.) via 2tes-Gehirn:** JSON ↔ CSV Konverter (bidirektional, Richtungs-Toggle, Trennzeichen Komma/Semikolon/Tab, RFC-4180-Escaping, eigene CSV-State-Machine für Quotes/eingebettete Kommas+Zeilenumbrüche/`""`/CRLF/BOM, Copy + Download). Review hämmerte den Parser mit Node-Harness durch (alle Edge-Cases korrekt: quote-then-delim, quote am Ende, `""` am Feldanfang, lone-CR, kein Phantom-Leerzeile bei Trailing-Newline, `\t`-Mapping value=backslash-t) → 0 Bugs. Danach UTF-8-BOM beim CSV-Download ergänzt (Excel liest Umlaute korrekt). Viersprachig (Parser-Funktionen MD5-identisch über alle Sprachen), 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 12.
- **Tool #11 (16.06.) via 2tes-Gehirn:** Bild-Komprimierer (Drag&Drop JPG/PNG/WebP → canvas.toBlob, Qualitäts-Regler, Max-Breite-Resize, Format-Wahl, Original-vs-komprimiert + %-Ersparnis, Download, alles lokal). Review fand 2 ECHTE Bugs: (1) WebP verlor Transparenz, weil Weißfüllung für alle Nicht-PNG lief → nur noch bei image/jpeg; (2) Out-of-order toBlob-Race bei schnellen Regler-Änderungen → reqId-Token-Guard (stale Callbacks sind No-ops, erzeugen keine Orphan-Object-URLs). Sonst sauber (esc() gegen XSS via Dateiname, Resize nur runter, Object-URLs revoked, a11y). Viersprachig, 4 Hubs, Sitemap 4/4. **Lehre: bei Canvas/Async-Tools auf Object-URL-Leaks + out-of-order Callbacks + Alpha-Erhalt achten.** Tool-Suite jetzt 11.
- **Tool #10 (16.06.) via 2tes-Gehirn:** CSS Gradient-Generator (linear/radial, Winkel-Regler, beliebig viele Farbstopps mit Position 0–100 %, Add/Delete, Live-Vorschau, background-CSS Copy). Review fand 0 Bugs (Preview==Output aus derselben g-Variable, Winkel nur bei linear + anglebox dann versteckt, ≥2-Stopps-Guard, `pos==null?50:pos` bewahrt korrekt den 0%-Stopp [naives pos||50 wäre Bug], kein NaN, Clipboard+a11y vollständig). Viersprachig, 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 10 (utm/slug/meta/faq/zeitzonen/bild/robots/box-shadow/lorem-ipsum/css-gradient), alle DE/EN/FR/IT + review-geprüft.
- **Tool #9 (16.06.) via 2tes-Gehirn:** Lorem-Ipsum-Generator (Blindtext als Absätze/Sätze/Wörter/Listenpunkte, Optionen „klassischer Start" + HTML-Tags, Neu-würfeln, Live-Wortzahl, Copy). Review verifizierte ALLE Einheit×Option-Kombis per node-Harness (exakt N Wörter, kein Double-Punkt, kein Infinite-Loop in sentence(), clampInt fängt leer/0/negativ/>200 ab, kein XSS — Output nur in textarea.value/textContent); 1 a11y-Fix (aria-live an Wortzahl). WORDS-Bank + CLASSIC-Satz bleiben Latein (sprachunabhängig). Viersprachig, 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 9 (utm/slug/meta/faq/zeitzonen/bild/robots/box-shadow/lorem-ipsum).
- **Tool #8 (16.06.) via 2tes-Gehirn:** CSS Box-Shadow-Generator (Regler X/Y/Unschärfe/Spread/Deckkraft, Color-Picker ↔ HEX-Sync, inset-Toggle, Live-Vorschau auf Karo-Hintergrund, Output box-shadow + -webkit, Copy). Review fand 0 Bugs (Alpha-Mapping 0–100→0–1 exakt, HEX-Edge-Cases #abc/leer/invalid fallen sauber auf Picker zurück → kein NaN in rgba(), Vorschau == Output, Clipboard+a11y ok, html-validate exit 0); nur Dead-Code-Var entfernt. Viersprachig, 4 Hubs, Sitemap 4/4. Tool-Suite jetzt 8 Stück (utm/slug/meta/faq/zeitzonen/bild/robots/box-shadow), alle DE/EN/FR/IT + review-geprüft.
- **Tool #7 (16.06.) via 2tes-Gehirn:** robots.txt-Generator (Regelgruppen User-agent/Disallow/Allow/Crawl-delay, 4 Presets allow/block/WordPress/Shop, Sitemap-Zeilen, Copy + Download als Datei). Review fand: keine Security/Correctness-Bugs (Output spec-valide, cleanLine strippt gepastete Direktiv-Präfixe, kein innerHTML-Sink, Clipboard+Download sauber, Delete-to-zero-Guard) — 1 a11y-Fix (aria-live entfernt = kein Vorlesen bei jedem Tastendruck, textbox fokussierbar) + flaggte Copy-Lücke „Crawl-Delay" beworben aber kein Feld → Feld pro Gruppe ergänzt. Viersprachig, 4 Hubs, Sitemap 4/4. **Lehre: Review prüft auch Copy-vs-Feature-Konsistenz, nicht nur Bugs.**
- **Tool #6 (16.06.) via 2tes-Gehirn:** Bild→Base64/Data-URI (Drag&Drop → Data-URI + fertiges img/CSS-Snippet, FileReader, lokal/kein Upload). Review fand 5 Bugs: **XSS via Dateiname** (f.name roh in meta.innerHTML → esc()), unsichtbare Warnung (#warn lag im versteckten #preview → rausgezogen, role=alert), fehlendes img src (data:, Platzhalter), Division-durch-0 beim Overhead-%, stale Preview bei Reject. Viersprachig, 4 Hubs, Sitemap 4/4. **Lehre: bei File-/Upload-Tools immer Dateinamen escapen + Status-Elemente ausserhalb versteckter Container.**
- **Tool #5 (16.06.) via 2tes-Gehirn:** Zeitzonen-/Meeting-Planer (siehe unten) — Nummerierung: utm/slug/meta/faq/zeitzonen/bild = 6 Tools, alle DE/EN/FR/IT, review-geprüft.
- **Tool #4 (16.06.) via 2tes-Gehirn:** Zeitzonen-/Meeting-Planer (Uhrzeit über mehrere IANA-Zonen, DST-aware, Tag-Offset). Review verifizierte die DST-Mathematik per node (alle Testfälle korrekt). Viersprachig (Übersetzung: nur fmt-Locale + UI, Math byte-identisch), 4 Hubs, Sitemap 4/4. Tool-Suite jetzt: utm-builder, slug-generator, meta-tag-vorschau, faq-schema-generator, zeitzonen-planer — alle DE/EN/FR/IT, review-geprüft.
- **Tool #3 (16.06.) via 2tes-Gehirn-Pipeline:** FAQ-Schema-Generator (Q&A -> valides FAQPage-JSON-LD fuer Rich Snippets), viersprachig, in allen 4 Hubs + Sitemap. Review fand 2 KRITISCHE Bugs: JSON.stringify escaped < nicht -> Q/A mit </script> haette beim Einbetten die ZIELSEITE zerschossen (Fix: <->\u003c) + Delete-to-zero-Guard. **Lehre: bei Code-/Schema-Generatoren immer auf </script>- und HTML-Escaping pruefen.** SEO-Toolkit jetzt: slug-generator + meta-tag-vorschau + faq-schema-generator (+ utm-builder), alle viersprachig.
- **Neue Tools (16.06.) via 2tes-Gehirn-Pipeline:** Slug-Generator + Meta-Tag/SERP-Vorschau, je viersprachig (DE/EN/FR/IT), in allen 4 Tools-Hubs + Sitemap. Ablauf: bauen -> unabhaengiger Review-Agent (fand+fixte realen Clipboard-Bug: ungeschuetztes navigator.clipboard -> TypeError; + a11y) -> uebersetzen -> verdrahten -> i18n-Bot. Verifiziert: 0 Parser-Error, 0 deutsche Leftovers, 0 Orphans, 0 Broken-Links.
**2026-06-12 — abannews session: grosser QA-/SEO-Reparatur-Lauf (Branch `claude/abannews-projekt-JSw9l`):**
- **Auslöser:** User „100 agent go … melde dich wenn komplett fertig" → autonomer QA-Durchlauf mit 3 parallelen
  Audit-Agenten (hreflang/Funnel/FR-IT) + vorhandene Audit-Tools (`make consistency/links/growth/status`).
- **Behoben (alles verifiziert, 2 Commits):**
  - **88 fehlende Lead-Magnet-PDFs** generiert (44 DE + 44 EN, waren Broken-Links) + in 25 Hubs verlinkt →
    Lead-Magnet-Abdeckung **360/360** (war 352), Lead-PDFs 316→360.
  - **37 keylose Hub-Header-Platzhalter** (`img/site/hub-*.jpg`) gegen 404 (tools/gen_hub_placeholder.py).
  - **Favicons** `favicon-16x16/32x32.png` aus `favicon.svg` gerendert + **`site.webmanifest`** erstellt
    (beide in 23 Seiten referenziert, fehlten komplett).
  - **5 hreflang-404s entfernt:** `it`-Variante von beratung/produkte/transparenz (nur de/en/fr existieren),
    `en`-Variante von text-anonymisieren. **Malformed `sitemap.xml`** (verschachtelte `<url>` bei
    geld-verdienen-mit-ki) repariert → valides XML, 2030 URLs.
  - **OG-/Twitter-Bild** auf hilfe-ki-werkzeug (de/en/fr/it) ergänzt; **3 verwaiste Hubs** (alpakahof/pilzzucht/
    straussenfarm) via Hub-Neubau verlinkt.
  - **3 veraltete EN-Preise** „Founding member €149" → €69; **Konsistenz-Checker** kennt jetzt den Pro-Tarif
    (€19/€190) → keine Fehlalarme; Clean-URL-Links auf `.html` (hype-watch/sponsoring); tote `/en/tools.html`-
    Links auf bestehende EN-Tools-Seite umgebogen.
- **Von Agenten als SAUBER bestätigt (kein Fix nötig):** FR/IT-Übersetzungen (keine Leakage, lang-Attribute ok),
  Kauf-Funnel (Founding/PayPal, Pro/Lemon-Squeezy, beehiiv alle live; `premium-briefing` €19/€190 = eigenes
  Produkt, kein Drift), `AFFILIATE-URL`-Vorkommen = nur auskommentierte Template-Blöcke (keine toten Buttons).
- **Bewusst NICHT gemacht:** Newsletter-CTA auf 32 Sales-/Rechts-/Utility-Seiten (würde ki-studio/empfehlen/
  api/press/mrr zumüllen). Berührt KEINEN Shop/Katalog/Social. Draft-PR nach `main`.
- **Nachschlag (gleicher Tag, Indexierung):** 7 reale Seiten fehlten in `sitemap.xml` → nachgetragen:
  `ki-fuer-fischzucht` + `ki-fuer-mosterei` (de/en/fr, 6×, von früherer Session als „tot" entfernt, existieren
  aber längst wieder + in allen 4 branchen-Hubs verlinkt) und das komplett verwaiste Tool
  `ki-bild-prompt-generator.html` (kein interner Link/Sitemap/Hub) → Karte in `online-tools.html` + JSON-LD
  (numberOfItems 34→35) + Sitemap. **Voller Orphan-Scan:** nur 4 Root-Orphans, alle bereits in Sitemap
  (json-formatter/ki-lifestyle/links/mrr = bewusst standalone) → Discoverability sauber. Loop-Trap-Scan in
  `_redirects` = 0, alle 4 Sprach-Hubs von ihren Homepages verlinkt.
- **Welle 2 (5 parallele Audit-Agenten + erschöpfende Skript-Scans):** **Conversion-Fix:** 20 CTA-Buttons
  hiessen „Premium ansehen — €69 lifetime", verlinken aber auf `/founding.html` mit dem Founding-Preis (€69 =
  Founding, nicht Premium €9/Mt) → Label zu „Founding ansehen"/„See founding" korrigiert (DE+EN). **2 verwaiste
  EN-Seiten** (en/mahnung-schreiben, en/geld-verdienen-mit-ki) in den EN-Geld-Hub eingehängt. **4 kaputte
  Meta-Tags** (gerade Anführungszeichen schlossen dt. „…"-Zitat im content-Attr vorzeitig → Parser-Error,
  og:title/description für Social kaputt) in ki-bullshit-bingo + passives-einkommen-ki (je DE+EN) auf
  typografisches „ U+201C gefixt. `automatisierung-rechner` label for=freq→anz; EN aria-label DE→EN.
  **Erschöpfende Skript-Scans danach ALLE sauber:** 0 dangling hreflang site-weit, 0 weitere Parser-Bugs,
  FR/IT-CTA korrekt, **og:image-Abdeckung 100 %** (0 indexierbare Seiten ohne Teilen-Vorschau), 0 echte
  Broken-Links, Konsistenz grün. **→ QA/SEO/Korrektheit-Backlog erschöpft.** Offen bleibt nur Kosmetik
  (Inline-Header-Bilder 24 Hubs + 21 Themen, besser per echtem Foto-CI-Job mit PEXELS) + der Geld-Schalter (User).
- **Welle 3 — Content-Ausbau (Reichweite), User-Richtung „Content-Ausbau":** Da eine **parallele Session
  gerade Branchen-Hubs** mass-generiert (Welle 63/64, eigener Branch) → nicht-kollidierende Spur gewählt:
  **EN-Versionen erprobter DE-Tool-Seiten** (nur Übersetzung, kein erfundener Content, neue Dateien = kein
  Merge-Konflikt). **7 EN-Tools live** (je via Übersetzungs-Agent, dann zentral verdrahtet): en/stundensatz-
  rechner, en/finanz-rechner, en/mwst-rechner, en/prozent-rechner, en/ki-token-rechner, en/ki-bild-prompt-
  generator, en/automatisierung-rechner. JS-Logik identisch, lang=en, EN-Meta/OG/JSON-LD, hreflang beidseitig
  (DE-Seiten nachgerüstet), de-DE→en-GB, Sitemap-Einträge, Cross-Links auf /en/. Nebenbei ein DE-Mislabel in
  mwst-rechner gefixt. Alles verifiziert (0 Parser-Error, Konsistenz grün, 0 Broken-Links). **Hinweis Koordination:
  ⚠️ Branchen-Hubs NICHT anfassen (andere Session); Pushes mit `git pull --rebase` wegen Parallelaktivität.**
  Weitere EN-Kandidaten offen (rechnung-generator, finanz-skills, ki-spar/ki-kosten-rechner, json-formatter, …).
- **Welle 4–7 (12.–13.06., gleicher Branch `claude/abannews-projekt-JSw9l`) — EN/Mehrsprachigkeit erschöpfend
  ausgebaut, alles via Übersetzungs-Agenten + zentraler Verdrahtung, jede Charge verifiziert + einzeln gepusht:**
  - **EN-Tool-Bestand komplett:** ~28 EN-Tool-Seiten (Rechner, Dev-Tools json/regex/encoder/diff/hash/uuid/jwt/
    timestamp/env/markdown/cron, passwort/kontrast/farb/zeichenzähler/qr/namen/iban, AI-Visibility-Cluster
    ai-sichtbarkeit/ki-erwaehnungs-check/hype-filter, rechnung-generator) + **kuratierter EN-Tools-Hub
    `en/online-tools.html` (43 Karten)**. Flagship-Finder **en/welche-ki-fuer-was.html** + **`data/tools.en.json`
    (175 Tools, Prosa übersetzt, Keys/IDs/Scores/Filter identisch) — Finder fetcht jetzt die EN-Daten.**
  - **Branchen-Hubs 4-sprachig 360/360:** 3 Lücken (detektei/personaldienstleister/textilreinigung) als EN+FR+IT
    ergänzt → de/en/fr/it je **360**; volle 4-Sprachen-hreflang auf allen 4 Versionen (Alt-Block-Duplikate
    dedupliziert); 3 EN-Quickstart-PDFs (reportlab, keyless).
  - **EN-Content-Artikel:** ki-videos-erstellen, geld-verdienen-mit-3d-druck, anti-hype-texten, ki-und-krypto-daten,
    ki-stimmen, ki-lifestyle. **EN öffentliche Seiten:** resources, press, media-kit, ueber-aban, brand, roadmap,
    ki-sichtbarkeit-audit/-monitor, ki-tool-vergleich (Index).
  - **Bewusst NICHT übersetzt** (EN = Unsinn/Redundanz): schicht (dt. Roman), foerder (DACH-Förderungen), kurs,
    preview, glossary (redundant), jobs, mrr/growth-dashboard/launch/v2/index-classic/willkommen (Dev/intern).
  - **Welle 7 FERTIG:** **alle 197 `/vergleich/*` → `en/vergleich/*`** (Tool-vs-Tool, volle Übersetzung inkl.
    FAQ/Deep, hreflang DE↔EN, Sitemap, 0 Parser-Error). **`en/ki-tool-vergleich.html`-Index auf `/en/vergleich/*`
    umgebogen** → EN-Vergleichsbereich voll funktional. Lief über mehrere Server-/Session-Rate-Limit-Wellen,
    daher throttle-resilientes Muster: Agenten speichern Datei-für-Datei, Hauptthread salvaged+committet
    wiederholt (truncierte verworfen). `consistency_check`: `/vergleich/` in EXCLUDE (Fremd-Toolpreise €149/€99,
    keine aban-Preise — EN-Format „€NNN" triggerte sonst die Preisregeln).
  - ✅ **Draft-PR #715 ist auf „Ready" gesetzt.** Alles grün: 0 Parser-Error, Konsistenz grün, 0 echte
    Broken-Links, Sitemap valide. **→ EN/Mehrsprachigkeits-Ausbau vollständig abgeschlossen.**
- **Welle 8 (13.–14.06.) — Vergleiche VIERSPRACHIG + „update für alle":** Die 197 Tool-vs-Tool-Vergleiche jetzt
  in **allen 4 Sprachen** (DE/EN/FR/IT = **788 Detailseiten**) + `ki-tool-vergleich`-Index in allen 4 Sprachen.
  **5-Sprachen-hreflang (de/en/fr/it/x-default) auf allen 788 Detail- + 4 Index-Seiten normalisiert.** Sitemap
  vollständig. FR/IT-Finder-Links → DE-Finder `/welche-ki-fuer-was.html` (kein fr/it-Finder gebaut); fr/it-founding
  → `/founding.html`. Lief über viele Server-/Session-Rate-Limit-Wellen (resets ~stündlich) → throttle-resilientes
  Muster: Agenten „eine Datei nach der anderen speichern, kein Sub-Delegieren", Hauptthread salvaged+committet
  wiederholt. Verifiziert: 0 Parser-Error, Konsistenz grün, 0 echte Broken-Links, Sitemap valide.
  **Offen als eigene grosse Lane (nicht gemacht):** fr/it-Versionen des Finders (`welche-ki-fuer-was` braucht
  `tools.fr/it.json`, je 175 Tools) + FR/IT der EN-Tools/Artikel. EN-Reichweite + DACH-4-Sprachigkeit der
  Vergleiche/Hubs sind komplett.
- **Welle 9 (15.06.) — Finder VIERSPRACHIG:** `fr/welche-ki-fuer-was.html` + `it/welche-ki-fuer-was.html`
  (interaktiver Tool-Finder) gebaut; **`data/tools.fr.json` + `data/tools.it.json`** (je 175 Tools, Prosa
  uebersetzt, Keys/IDs/Scores/Filter-Tokens identisch). Finder fetchen nun die jeweilige Sprach-JSON; JS-Logik
  byte-identisch. **5-Sprachen-hreflang** auf allen 4 Finder-Versionen; FR/IT-Vergleiche+Indizes-Finderlinks auf
  den Sprach-Finder umgebogen (je 198); Sitemap +2. Verifiziert: 0 Parser-Error, Konsistenz gruen, 0 echte
  Broken-Links. **→ Finder + Vergleiche + Branchen-Hubs jetzt durchgaengig viersprachig (DE/EN/FR/IT).**
  Verbleibend nur noch FR/IT der uebrigen EN-Tools/Artikel (geringer Hebel).
- **Welle 10 (15.06.) — 38 universelle Tools auf FR+IT:** Dev-Utilities (json/regex/encoder/diff/hash/uuid/jwt/
  timestamp/env/markdown/cron), Generatoren/Rechner (passwort/kontrast/farb/zeichenzaehler/qr/namen/iban/prozent/
  mwst/ki-token/automatisierung/ki-kosten/ki-spar/stundensatz/finanz/rechnung) + AI-Helfer (bild-prompt/prompt-
  checker/baukasten/glossar/bessere-prompts/readiness/hype-filter/ai-sichtbarkeit/erwaehnungs-check/betrug/aktien).
  Je 38 fr + 38 it; JS byte-identisch, nur UI uebersetzt. **5-Sprachen-hreflang auf allen 4 Versionen normalisiert
  (114 Dateien).** Sitemap komplett. Verifiziert: Konsistenz gruen, 0 echte Broken-Links, Sitemap valide.
  **Bewusst NICHT FR/IT:** DACH-Finanz-Artikel (etf/inflation/altersvorsorge/geld-und-ki), Sales-/Infra-Seiten
  (founding/about/faq/api/archive/dossiers/empfehlen). **→ Die universellen Tools + Finder + Vergleiche +
  Branchen-Hubs sind komplett viersprachig; abannews-Kern-Assets mehrsprachig erschoepft.**
- **Welle 11 (16.06.) — FR+IT der wertvollen Content-Seiten (je 34):** Content-Artikel (anti-hype/3d-druck/
  lifestyle/stimmen/krypto-daten/videos/bullshit-bingo/wie-nutze-ich-ki), universelle Finanz-Guides (etf/
  inflation/krypto/notgroschen/sparplan/trading/passives-einkommen/ki-abo), Hubs (geld-und-ki, online-tools,
  maerkte), Generatoren (angebot/mahnung), Audits (ki-audit/hype-detektor/sichtbarkeit-audit/monitor) +
  Public (ueber-aban/about/press/media-kit/resources/roadmap/sponsoring/faq/brand). 5-Sprachen-hreflang
  normalisiert, Sitemap komplett, JS byte-identisch. Verifiziert: Konsistenz gruen, 0 Broken-Links.
  **Bewusst NICHT FR/IT:** DE-Steuer/Recht-Guides (steuer-basics/altersvorsorge/kleinunternehmer/
  scheinselbststaendigkeit), Roman (the-seam/trilogie), thin/funktional (api/archive/danke-kit/empfehlen/
  dossiers/ki-studio/shop/founding). **→ Mehrsprachiger Ausbau praktisch erschoepft: alle sinnvollen
  oeffentlichen Assets DE/EN/FR/IT.**
- **Welle 12 (16.06.) — QA Discoverability FR/IT:** ~4000 interne Links in fr/* + it/* von DE-Root bzw. EN-Leak auf die lokalisierte Version umgebogen (nur wo vorhanden, Sprach-Switcher via hreflang-Attribut ausgeschlossen); 4 FR/IT-Orphans im Tools-Hub verlinkt (0 Orphans); FR/IT-Startseiten-Nav verlinkt jetzt den Tools-Hub. 0 Broken-Links, Konsistenz gruen. **Stehende User-Anweisung 16.06.: nach jeder groesseren Charge IMMER beide Memorys aktualisieren (SHARED-MEMORY.md + PROJEKT.md) + ueberholte Alt-Notizen als superseded markieren.**
- **Welle 13 (16.06.) — Übersetzungs-QA:** Audit des FR/IT-Korpus (~1300 Seiten): Struktur 0 Defekte (lang/og:locale/og:image/JSON-LD-inLanguage alle korrekt). ABER **47 it/vergleich/-Seiten waren teil-deutsch** (Deep-Section + FAQ-JSON-LD + Tool-Notes — Reste der socket-/limit-abgebrochenen IT-Charge) → per 3 Agenten DE→IT nachübersetzt. FR-Korpus + EN/FR-Vergleiche waren sauber. Endkontrolle: **0 deutsche Reste site-weit** (sichtbar + JSON-LD), 0 Parser-Error, JSON-LD valide, Konsistenz grün, 0 Broken-Links, Sitemap valide. **Lehre für künftige Mass-Übersetzungen: nach dem Lauf IMMER einen Sprach-Leftover-Scan über sichtbaren Text UND JSON-LD fahren (nicht nur den Self-Check der Agenten vertrauen) — Agenten lassen bei Abbruch gern Deep-Section/FAQ/Notes unübersetzt.**
- **Welle 14 (16.06.) — i18n-Sync-BOT installiert** (User: „alles bot-mäßig weiter sync, installier das"): `tools/i18n_audit.py` (keyless/stdlib) + `.github/workflows/i18n-sync.yml` (täglich 04:17 + on-push + manuell). Prüft je Seiten-Familie hreflang-Reziprozität, Sitemap-Vollständigkeit, lang/og:locale/JSON-LD-inLanguage, og:image, Sprach-Leftover (präzise dt. Funktionswörter, URLs/Slugs ausgenommen), Orphans. `--fix` normalisiert hreflang (5-sprachig, nur vorhandene Geschwister) + ergänzt Sitemap; Bot committet Fixes auto ([skip ci]) und schlägt bei HARTEN Defekten fehl. **Vor manueller i18n-QA künftig erst `python3 tools/i18n_audit.py` laufen lassen.** Stand: 0 harte Probleme. Bot erweitert um **echten Broken-Link-Gate** (abannews-scope, externe Shop-/Template-Ziele + dropship-Quellen ausgeblendet). Dabei realen Bug gefixt: en/fr/it `brand`+`roadmap` luden `css/styles.css` relativ → 404 im Unterordner → auf `/css/styles.css` korrigiert (6 Seiten waren ohne Stylesheet). **Neu (16.06.):** Tool **UTM-Link-Builder** viersprachig (DE/EN/FR/IT) + Performance-Tool `tools/add_img_dims.py` (width/height gegen CLS, in Bot integriert). **Routine: nach jeder Charge Memory aktualisieren + `python3 tools/i18n_audit.py --fix` laufen lassen.**

**2026-06-11 — Luxestyle/POD session: Editor mit echten Fotos + 98 Fertig-Mockups + Shop-Audit A–Z:**
- **🎨 Selbst-gestalten-Editor komplett überarbeitet** (`pod/designer.js` live): echtes Produktfoto statt
  Zeichnung bei ALLEN Editor-Produkten (Shirt/Tasse/Tote/Kissen/Magnet/Poster/Bügeltransfer), Live-Farbvorschau
  Shirt (Weiss/Schwarz/Navy = echte Gemini-Fotos `pod/tees/`), Grössen-Regler, freie Farbwahl, Ebenen,
  Duplizieren, Emoji-Palette. `data-img-front` = **nur Vorschau** (Druckdatei = zentriertes Motiv).
- **🇨🇭 49 Shirt- + 49 Tassen-Fertigdesigns** (Handles `shirt-*`/`tasse-*`): Hauptbild war „schwebendes" Design-PNG
  → jetzt **photorealistisches Mockup auf echtem Produkt** (alle 98 live getauscht, altes Bild gelöscht).
  Werkzeug: `automation/pod_fertig_mockups.mjs` + Workflow `pod-mockups.yml` (Gemini i2i + Shopify-Staged-Upload).
  Editor-Blanks: `automation/gen_editor_blanks.mjs` + `editor-blanks.yml`. Beide für neue Designs erneut dispatchbar.
- **🔎 Shop-Audit A–Z (Optik+Text, KI-Zweitmeinung via WebFetch):**
  - **BEHOBEN (live):** Collection „neu-eingetroffen" hiess kundenseitig **„✨ CJ Neuheiten 2026"** → der interne
    Dropship-Lieferant „CJ" war sichtbar! Umbenannt zu **„✨ Neuheiten 2026"**. (Sonst KEIN weiterer CJ-Leak.)
  - **GEPRÜFT & GUT:** alle Rechts-/Service-Seiten vorhanden+gefüllt (AGB/Datenschutz/Impressum echte Adresse
    Belp/Widerruf/FAQ/Über-uns/Garantie/Grössentabelle); POD-Preise gesund (Shirt 20.90/Tasse 17.90, kein
    Verlust); Hero-CTA `/collections/sommer` existiert (72 Prod.); Fertig-Produktseiten zeigen echtes Mockup+ATC.
  - **OFFEN (Customizer/User, NICHT autonom gemacht — Risiko/Reichweite):** (1) Startseite hat **2 Bestseller-
    Sektionen** (⭐ Top 10 + „🔥 Bestseller") mit Überschneidung → 4. Produkt-Liste im Customizer auf
    `premium-geschenke`/`sommer-2026` umstellen. (2) **Customer-Account-Menü** linkt auf falsche Domain
    `account.luxestyle.com.co` (Shop ist .ch) → prüfen/fixen. (3) Fertig-Produkte 0 Reviews → echte Judge.me-
    Reviews importieren (nie Fake). (4) viele Legacy-Doppelseiten (versand×3, kontakt×3) — harmlos, optional aufräumen.
- **Branch dieser Arbeit:** PODs/Editor wurden via PRs auf **`main`** gemerged (#683/#685/#690/#691 u.a.). Theme:
  `Horizon · LuxeStyle + Email-Popup (Claude)` (MAIN, `templates/index.json` ist auto-generiert — Customizer nutzen).

**2026-06-11 — abannews session: ⚠️ HOSTING-WECHSEL + aban-Pro live (für ALLE relevant):**
- **🔀 abannews.com läuft jetzt auf CLOUDFLARE PAGES** (vorher GitHub Pages). Domain per API umgezogen
  (Workflow `cf-attach-domain.yml`), Pages-Projekt **`abannews`** (= `abannews.pages.dev`). **Edge-API `/api/*`
  (functions/) ist dadurch live.** **WICHTIG für alle:** Die Seite deployt jetzt per **Direct-Upload-Action**
  `cf-deploy-mainsite.yml` (bei Inhalts-Pushes + alle 6 h) — **nicht** mehr GitHub-Pages-Auto-Deploy. Wer
  Seiten-Inhalte auf `main` ändert: Deploy läuft automatisch, aber `[skip ci]`-Commits erst beim 6h-Lauf.
  `paths-ignore` schließt dropship/social/automation/memory aus (lösen keinen Deploy aus).
- **💶 aban Pro (€19/Mt, €190/Jahr) = KI-Studio LIVE & verkaufsfertig** (`/ki-studio`): 7 Live-KI-Tools (Claude),
  lizenz-gated über Lemon Squeezy. Secrets: `ANTHROPIC_API_KEY` (GitHub-Secret → autom. ins Pages-Projekt
  geschrieben), `CLOUDFLARE_API_TOKEN/ACCOUNT_ID`. End-to-end mit echtem Lizenzschlüssel bewiesen. Offen: LS-Store-
  Freigabe. **Berührt KEINEN Shop/Katalog/Social.** Details: `PROJEKT.md` Teil 17–19, `docs/ABAN-PRO-AKTIVIEREN.md`.

**2026-06-11 — REPO IST JETZT PUBLIC (User-Entscheid) → Actions wieder gratis/unbegrenzt:**
- **🔓 `aban-news-landing` ist PUBLIC** (vorher privat). Grund: **Actions-Minuten waren an EINEM Tag
  aufgebraucht** (~3000 Min) → alle Cron-Jobs + Dispatches scheiterten beim Start (kein Runner, 0 Steps).
  Public = unbegrenzte Gratis-Actions → **alles läuft wieder.** Secret-Scan vor dem Umstellen: **sauber**
  (keine Klartext-Tokens im Code; GitHub-Secrets bleiben verschlüsselt/privat auch bei public). User: Buch +
  Strategie öffentlich = „egal".
- **⚠️ URSACHE der Minuten-Explosion (bitte beheben!):** **139 Workflows** im Repo. Die abannews-Session
  committet quasi pausenlos → jeder Push triggert viele `on: push`-Workflows (Content-Engine, Radars, Märkte,
  Gemini-Jobs). **→ abannews-Session sollte drosseln** (Path-Filter, weniger push-Trigger, Commits bündeln),
  sonst bleibt's ineffizient (jetzt zwar gratis, aber langsam/Queue). LuxeStyle-Workflows sind leicht (paar/Tag).
- **📈 NÄCHSTES (diese Session):** IG-Analyse mit echten Zahlen (ig-analyze.yml, läuft jetzt) → Captions/Hooks
  weiter schärfen. Caption-Gewinner-Formel ist schon live (queue_new_products.mjs + learned_pools.sh).

**2026-06-11 — Luxestyle product session (Browser-Agent + TikTok-Analyse + Autonom-Ausbau):**
- **🤖 BROWSER-AGENT LIVE (lokal, Brave):** `tools/browser/agent.py` läuft auf User-PC über Brave (Heim-IP,
  IG/TikTok blocken nicht). IG **+** TikTok eingeloggt (`~/.luxe-browser/*.json`). Befehle: login·check·
  ig-delete·tiktok-delete·**list**·**tiktok-upload**. Windows-Anleitung `tools/browser/WINDOWS-BRAVE-QUICKSTART.md`.
- **☁️ CLOUD-AGENT (Browserbase) = Fernsteuerung ohne PC:** Secrets `BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID`
  gesetzt. `agent_cloud.mjs` (context-create·login-start·login-release·check·ig/tiktok-delete·**tiktok-upload**)
  + Workflow `browser-action.yml` (Dispatch). **⚠️ IG-Login im Cloud-Context schlug fehl (Rechenzentrums-IP
  geblockt → /accounts/login).** Residential-Proxy nur mit BEZAHLTEM Browserbase-Plan (`BB_PROXY=1`). TikTok-
  Cloud-Login offen (gleiche Block-Gefahr — testen). Gratis-Plan-Fallback = lokaler Brave-Agent.
- **🎬 AUTONOME TIKTOK-MASCHINE gebaut:** `social/tiktok_queue.csv` (5 Veo-Clips, Gewinner-Captions) +
  `automation/tiktok-cloud-autopost.mjs` + Cron `tiktok-cloud-autopost.yml` (tägl. 09:40 UTC) → fährt den
  Cloud-Agenten. **Läuft hands-off, SOBALD TikTok im Browserbase-Context eingeloggt ist + die Cloud-IP nicht
  geblockt wird.** Sonst: Uploads lokal per Brave (`dropship/TIKTOK-UPLOAD-PLAN.md`).
- **💬 KOMMENTAR-AUTO-ANTWORT LIVE (Cloud):** `social-comment-reply.mjs` + Cron 3×/Tag → antwortet auf echte
  IG/FB-Kommentare (herzlich, Frage-/Preis-/Versand-Erkennung, Spam-Skip, dedup). Hands-off.
- **📊 TIKTOK-ANALYSE (35 Videos, 10'766 Views):** `reports/tiktok_luxestyle.ch_2026-06-11.md`. Gewinner =
  PREIS in Caption + Lifestyle-Hook + Reichweiten-Tags (#schweiz Ø572/#foryou Ø598/#fyp Ø458). Schwäche:
  Engagement <1% (kein CTA). → **Gewinner-Formel in `automation/learned_pools.sh`** (Frage-CTA + Preis + 2 Reach-
  + 2 Nischen-Tags) speist `auto_render.sh`. Kein 1:1-Repost (Duplikat-Abwertung) → neue Clips im Top-Stil.


**2026-06-10 (Abend) — Luxestyle product session (ÜBERNAHME: ALLES POSTEN + Pro-Musik + Veo-Clips):**
- **📣 POSTING-OWNERSHIP (User 10.06.):** Diese Session übernimmt **ab jetzt das komplette Social-Posten**
  (Meta IG/FB/Threads-Queue, Reels, Veo-Clips, Bild-Posts). Andere Sessions: bitte **nicht** in
  `social/posts_image.csv` / `social/video_queue.csv` schreiben — sonst Dubletten.
- **🎬 ANIMIERTE VEO-CLIPS ins Live-Posting:** Die 10 fertigen `reels/veo-hero-*.mp4` (Bild→Video) waren
  auf toten `abannews.com`-URLs gestrandet. Neu: `automation/queue_veo_clips.mjs` + `veo-queue.yml` laden die
  **5 echten LuxeStyle-Mode-Clips** (Brise/Daisy/Sirène/Cosy/Nuit — live im Katalog verifiziert) auf die
  Shopify-CDN + reihen sie **gestaffelt (1/Tag, 13.–17.06.)** in `social/video_queue.csv` → Meta-Autopilot postet.
  ⚠️ **Die 5 Merch/POD-Clips (cattote/skulltee/mountaintee/quotemug/sunsethoodie) sind NICHT LuxeStyle** —
  gehören der abannews/Video-Session, bewusst **ausgeschlossen**. PR #612 → main gemergt, veo-queue dispatcht.
- **🎧 PRO-HYPE-MUSIK:** `automation/music/luxe-hype-pro.mp3` (FluidSynth GM-Instrumente, 808-Glide,
  Hi-Hat-Rolls, Intro→Drop, -13,4 LUFS) + reproduzierbare Toolchain `automation/music/produce/`. Liegt im
  Reel-Musik-Pool → `auto_render.sh` rotiert ihn automatisch in neue Reels.
- **📅 NÄCHSTER SCHRITT (User 10.06.): „beobachten ein paar Tage später, wenn gute Meta-Infos da sind".**
  → Posten läuft jetzt autonom durch (Veo-Clips 13.–17.06., Bild-Posts + Reels täglich). **In ~3–5 Tagen:**
  Meta-Analytics ziehen (Reach/Engagement/Saves/Profil-Besuche/Follows je Post) → auswerten welche Clips/Captions
  ziehen → Profil-Optimierung + bessere Hooks/CTAs für Follower. **Tools dafür da:** `automation/reel-analytics.mjs`,
  Meta-Graph-Insights. Diese Session hat KEINEN Selbst-Wecker → neue Session macht den Analytics-Pass.
- **💸 DATAHASH GEKÜNDIGT (User 10.06.):** Server-Side-Tracking-Tool DataHash war **redundant** zum nativen
  Setup → gekündigt. **Tracking läuft jetzt NUR nativ:** TikTok-Shopify-App (Datenfreigabe MAX → CompletePayment,
  Pixel D8EKVR) + Meta-Verkaufskanal-CAPI (beide gratis). **⚠️ Check beim ersten Kauf / Kampagnenstart:** im
  TikTok Events Manager prüfen, dass CompletePayment-Events weiter ankommen. Falls Events ausbleiben → DataHash
  war doch die Quelle → native Anbindung nachschärfen.
- **👀 TIKTOK-PROFIL gesichtet (Screenshots 10.06.):** @luxestyle.ch aktiv, viele Reels (Top-Views 1107/796/778),
  **TikTok-Shopping-Tags live** (Preis + „JETZT SHOPPEN") = echter Kaufpfad. ABER nur ~6 Follower (Views
  konvertieren nicht zu Follows). **🔴 Leak:** „Sommerkleid ärmellos CHF 32.90" (3,54★, `niedrig-bewertet-nicht-
  bewerben`) wird auf TikTok mit Shopping-Tag beworben → User muss den Post in der App löschen (kein API-Zugriff).
- **🤖 EINGELOGGTER BROWSER-AGENT gebaut** (`tools/browser/agent.py` + `BROWSER-AGENT-SETUP.md`): erweitert das
  öffentliche `browser.py` um eingeloggte Aktionen, die die offiziellen APIs NICHT können (IG/TikTok-Post löschen).
  **Sicher:** keine Passwörter — User loggt EINMAL von Hand ein (`agent.py login instagram <url>`), Session-Cookies
  liegen unter `~/.luxe-browser/<profil>.json` (gitignored, NIE committen). Dann `ig-delete`/`tiktok-delete --confirm`
  (mit before/after-Screenshots). **Läuft auf USER-Rechner** (Login braucht Bildschirm; Cloud-Session kann sich nicht
  selbst einloggen). **Für „Cloud-Claude klickt selbst" → Browserbase-Variante GEBAUT (User wählte B, 10.06.):**
  `tools/browser/agent_cloud.mjs` (CDP→Browserbase-Context) + Workflow `.github/workflows/browser-action.yml`
  (Dispatch: check/ig-delete/tiktok-delete, Screenshots als Artefakt). Setup `BROWSERBASE-SETUP.md`. **Offen (User):**
  3 Secrets `BROWSERBASE_API_KEY/PROJECT_ID/CONTEXT_ID` + Context **einmal einloggen** (Live-URL). Dann triggere ich
  Aktionen direkt. PR #615 → main gemergt (Workflow dispatch-bar).
  **🔴 DO-NOT-POST.txt war lokal stale (nicht weg)** — bali/augenmassage durchgehend geschützt; jetzt + Sommerkleid-Handle.

**2026-06-08 — Luxestyle product session:**
- **Polish-Session (Gemini 4/10):** Rückgabefrist→30 Tage (5 Coll.), Damen-Text gekürzt, Top-10-Bestseller premium-mode-first sortiert, SEO für 5 neue Sub-Collections, 2 Hero-Bilder generiert (dropship/hero/), Draft-Theme "Hero-Polish" angelegt. Hero-Kontrast-Bug-Ursache: scheme-6 existiert nicht → Customizer-Fix nötig (Live-Theme-API blockiert). Report: reports/site-critique-2026-06-08.md.
- **Katalog:** **238 `cj-real` aktiv** (heute +65 neue Produkte: Mode, Taschen, Schmuck, Schuhe, Home, Beauty, Gadget, Premium).
- **Navigation feiner (Charge 27):** Beauty & Home in Sub-Collections gesplittet + als Menü-Untermenüs
  (Hautpflege & Skincare · Wellness & Beauty-Tools · Deko & Wohnaccessoires · Beleuchtung & Lampen · Küche & Tisch),
  alle in 6 Kanäle publiziert. Mode/Schuhe/Schmuck haben bereits Damen/Herren-Untermenüs.
- **Autonome Social-/Sourcing-Maschine gebaut & auf `main`:**
  - `dropship/cj_autopilot.mjs` + `cj-autopilot.yml` (VOLL-AUTO: sucht→QA→Varianten→Gemini-Gate→ACTIVE+publish, 2×/Tag)
  - `automation/queue_new_products.mjs` + `social-queue-build.yml` (reiht neue Produkte autom. in die Post-Queue, 2×/Tag)
  - `automation/social-autopost-meta.mjs` (postet FB/Threads/IG, 2×/Tag) — **läuft schon** (heute 13+ Posts live)
- **Shop-Seiten:** „✨ Entdecken" (`/pages/entdecken`) + „🎨 Selbst gestalten" (`/pages/selbst-gestalten`) + Menü-Leisten.
- **Verbesserungen:** `premium-schmuck`-Menü-Collection auf 84 aufgefüllt (war Discoverability-Lücke); Conversion-Leaks gefixt.
- **Offen (User):** Shopify/CJ-Secrets setzen → dann läuft Sourcing+Posten vollautonom. Siehe **`dropship/ABEND-TODO.md`**.
- **Branch:** alles auf `claude/luxestyle-product-CizQ6` → Draft-PRs nach `main`. ⚠️ Dort steht `MAX_PER_RUN=8` (nur Branch, nicht mergen!).

**2026-06-08 — abannews / video sessions:** (bitte hier eintragen, was ihr am Shop/Repo ändert)

**2026-06-10 — abannews session (neue „Märkte"-Sektion):** `/maerkte.html` + `/en/maerkte.html` (Krypto+Aktien+
ETFs+Indizes+Rohstoffe, 42 Assets + Detailseiten, Live-Kurse CoinGecko/Yahoo, **Gemini-KI-Sentiment**, News, Rechner,
Mobile-Karten, Telegram-Digest). Nutzt geteilte Secrets `GEMINI_API_KEY` + `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL`/
`TELEGRAM_OWNER_ID`. Cron `markets-build.yml` Mo–Fr 06/16 UTC, commit `[skip ci]`. **Gehört der abannews-Session**
(PROJEKT.md Teil 17). Berührt KEINEN Shop/Katalog/Social. Branch `claude/abannews-growth-monetization-hm6wod` → PR.

**2026-06-09 — Luxestyle product session (Social-Maschine + Browser-Frage):**
- **Spam-Moderation LIVE (FB + IG):** `automation/social-comment-moderate.mjs` + `social-comment-moderate.yml`
  (3×/Tag, blendet Solicitation-/„zahl-mir-Geld"-Spam aus, echte Fragen bleiben; hide=reversibel). Workflow nutzt
  Sparse-Checkout (Repo ist riesig → sonst hängt der Checkout) + robuste Token-Wahl (FB/IG/META).
- **🔑 META-TOKEN-LEHRE (teuer gelernt):** FB-Seiten-Moderation/Posten braucht ein **Page-Token** (Typ „Page"
  aus `me/accounts` → access_token der Seite LuxeStyle CH `1049840534888592`). Ein **User-Token** (auch langlebig,
  alle Scopes) gibt für FB **code 190**. IG funktioniert mit User-Token. `FB_PAGE_ID=1049840534888592`,
  `IG_USER_ID=17841480560863361`. Page-Token in FB_PAGE_ACCESS_TOKEN **und** IG_ACCESS_TOKEN.
- **Content-Vielfalt:** `automation/good_products.csv` neu = breit gestreut (Herren/Gadgets/Home/Schmuck/Beauty/
  Accessoires + nur ~4 frische Kleider, interleaved) → keine Damenkleider-Wiederholung mehr. **Augenmassagegerät
  rausgenommen** (User will es nicht posten). Frische Einzel-Clips gerendert: `reels/clip-*.mp4` + `montage-2026-06-09.mp4`.
- **✅ REEL-HOSTING-PROBLEM GELÖST (09.06. nachmittags):** Meta/TikTok ziehen Videos per **öffentlicher URL**.
  Repo ist privat (raw=404) + abannews.com/reels=404 → früher blockiert. **Lösung: Shopify-Files-CDN.**
  Neues Tool `automation/upload_to_shopify_cdn.mjs` lädt eine lokale Datei (Reel/Bild) per
  `stagedUploadsCreate → GCS-POST → fileCreate(FILE) → poll READY` hoch und gibt eine **öffentliche
  `https://cdn.shopify.com/...mp4`-URL** aus (range-fähig, HTTP 206, von Meta abrufbar). Auth = dieselben
  Client-Credentials wie reel-analytics.mjs (SHOPIFY_SHOP/CLIENT_ID/SECRET). **Erstes Reel live gehostet:**
  `cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-reel-20260609.mp4` (diverser Mix, kein Kleider-Spam)
  → in `social/video_queue.csv` als `mix-20260609` status=ready eingetragen, abannews-Zeilen auf `needs-rehost`.
  **Volle Automation** (reel-render → CDN-Upload → Queue) braucht nur noch die Shopify-Secrets als **Repo-Secrets**
  (aktuell nur in-Session). Bis dahin: manueller Upload via dem Tool + Workflow-Dispatch.
- **✅ ERSTES REEL LIVE ÜBER DIE NEUE PIPELINE (09.06. 20:54 UTC):** `video-meta-autopost.yml` (dispatch auf Branch)
  hat das CDN-Reel `mix-20260609` veröffentlicht → **Instagram Reel** `18091803953356065` ✅ + **Threads**
  `17978311515020703` ✅. Pipeline end-to-end bewiesen.
- **✅ FB-TOKEN ERNEUERT + REEL AUF ALLEN 3 META-KANÄLEN LIVE (09.06. 22:29 UTC):** User hat ein langlebiges
  **Page-Token** gesetzt → `mix-20260609-fb` gepostet → **Facebook Video** `27101737179520083` ✅. Damit ist das
  Reel auf **Instagram + Threads + Facebook** live. **FB-Spam-Moderation** mit demselben Token per Dry-Run
  verifiziert: „Spam (DRY) ausgeblendet: 0", **keine code-190-Fehler mehr** → Moderation FB+IG wieder voll funktionsfähig.
  IG_ACCESS_TOKEN + THREADS_ACCESS_TOKEN gültig. **Meta-Stack komplett grün.**
- **🔧 CI-FIX:** `video-meta-autopost.yml` Checkout hing (großer Repo, viele committete .mp4) → auf shallow
  (`fetch-depth:1`) + Sparse-Checkout (nur Script + Queue) umgestellt → Checkout jetzt ~1s.
- **✅ 3 FRISCHE REELS (15 NEUE PRODUKTE) LIVE auf IG+FB+Threads (09.06. abends):** Auf User-Wunsch „nicht
  mehr die gleichen Produkte". Zuerst Post-Verlauf geprüft (good_products.csv 32 + posts_image.csv 35) → 15
  noch nie gepostete Produkte gewählt (Beauty: Gua-Sha/Vitamin-C; Herren: Marco-Sneaker/Costa-Set/Porto-Slides/
  Amalfi; Schuhe: Gala/Cloud; Schmuck: Onyx/Stella/Serpent/Coeur; Gadget: FlexHold; Damen: Lino/Roma). 3 Reels
  via `reel-render.yml`-Dispatch gerendert → je per Shopify-CDN hochgeladen → in `video_queue.csv` →
  alle 3 gepostet (fresh1 IG 18323863495286045, fresh2 17924169777356896, fresh3 18205019272347534).
- **🆕 `good_products.csv` ersetzt:** jetzt 15 frische Produkte im **sauberen 3-Spalten-Format** (name,url,label).
  Behebt Alt-Bug: 4-Spalten + `cut -f3-` zog den **Handle-Slug** mit ins on-Video-Label → jetzt sauberes Label.
  Pointer auf 0 zurückgesetzt. (⚠️ Reel-Render-Cron läuft von `main` mit ALTER good_products.csv — Branch-Stand
  wirkt nur bei Dispatch/Merge.)
- **⚠️ CRON-VON-MAIN:** geplante Auto-Posts (`video-meta-autopost`, `reel-render`) laufen vom **main**-Branch;
  neue CDN-Queue-Zeilen/Produkte liegen auf dem Dropship-Branch → bis Merge per **Workflow-Dispatch auf dem
  Branch** posten (so heute alle 3 gemacht). Für hands-off täglich: PR nach main mergen.
- **✅ CONVERSION-PASS (09.06. spät, live via MCP — NICHT zurücksortieren!):**
  - **Social-Proof-First auf den Top-Landing-Pages:** Manuelle Kollektionen umsortiert (sortOrder=MANUAL),
    sodass die **bewerteten Verkaufsschlager zuerst** stehen:
    · **Homepage „🔥 Hero-Favoriten" (`bestseller`, 486 Sess/#1):** Slim Wallet 5,0★/15 · Herrenuhr 5,0★/15 ·
    Jade Roller 5,0★/7 · Mini-Diffuser 4,8★ ganz oben (vorher unbewertete Galaxy/Salzlampe oben).
    · **„✨ Highlights" (`highlights`, 239 Sess/#2):** +6 Review-Gewinner zugefügt & nach oben (Bali 4,93 ·
    Plateau-Sandalen 4,71 · Mini-Kleid 4,65 · Resort-Set 4,64 · Ibiza 4,47 · Maxirock 4,35).
  - **Ad-Funnel `sommer` (72 Prod.) leak-gescannt: sauber** — alle bewerteten ≥4,35★, kein schlechtes Produkt.
  - **15 frische Reel-Produkte verifiziert:** alle 6 Kanäle, korrekte Kollektionen, SEO+Trust-Text vorhanden.
  - **3 verstümmelte SEO-Titel gefixt** (FlexHold/Coeur/Serpent — Auto-Generator hatte Compound-Wörter zerlegt).
  - Engpass bleibt **Reichweite** (3 User-Klicks: TikTok-Conversion-Kampagne + Pixel + Budget), nicht der Shop.

**2026-06-10 — Luxestyle product session (Branch nach `main` gemergt — alles live & automatisch):**
- **✅ 3 PRs nach `main` gemergt** (#586, #597, #603) → ALLE Workflows laufen jetzt vom **main**-Cron
  (Meta-Posts, Reels, Moderation, Bild-Gen) = hands-off. Branch bleibt `claude/luxestyle-product-CizQ6`.
- **✅ SHOPIFY-SECRET vom User gesetzt** (`SHOPIFY_SHOP`/`CLIENT_ID`/`SECRET`) → Admin-API-Workflows aktiv.
- **✅ 235 SCHRIFTLOSE EDIT-BILDER in die Produkt-Galerien** (alle cj-real außer Bali) via neuem
  `automation/upload_edited_product_images.py` + `edited-product-images.yml` (workflow_dispatch, **idempotent**
  via alt-Prefix „LuxeStyle-Edit", Bali ausgeschlossen, Throttle). `render_product_clean()` = ganzes Produkt
  scharf+veredelt auf unscharfem Marken-BG, **kein Text**. Lauf: 235 hochgeladen, 0 Fehler. Jederzeit per Klick
  wiederholbar (auch neue Produkte).
- **🖼️ SCHÄRFE/FORMAT-FIXES (gen_post_image):** `place_hero()` adaptiv (cover-scale ≤1.4 → Full-Bleed, sonst
  scharf-gerahmt) gegen unscharfe 750–800px-CJ-Fotos; echtes **1080×1920-Story-Format** mit Safe-Zones +
  optionalem **★-Rating-Badge**; **IG-Reel-Cover** via `thumb_offset` (kein weisses Intro mehr).
  **LEHRE:** `featuredImage` ist oft winziges Thumbnail (Bali 361px) — grösstes Produktbild nehmen.
- **🎵 Techno-Musik-Pool** `automation/music/` (Voltaic/Electrodoodle/Digital-Lemonade, Kevin MacLeod CC-BY),
  `auto_render.sh` rotiert + hängt CC-BY-Credit an Caption. **🚫 DO-NOT-POST.txt** (Bali, Augenmassage).
- **📣 SOCIAL-AUFTEILUNG (Best Practice, umgesetzt):** **Produktseiten = schriftlos**, **Social-Posts = MIT Text**
  (Marke+Titel+−10%-Pill → Angebot ohne Caption sichtbar = mehr Klicks). Heute live gepostet (IG+FB+Threads):
  Aurora (mit Text) · Ibiza-Edit (schriftlos) · Plateau-Sandalen (mit Text). 6 weitere mit-Text in `posts_image.csv`
  ready → Cron drippt 2×/Tag. Bild-Hosting für Social = **Shopify-CDN** (abannews.com war 404).
- **🎵 TikTok-Reel-Autopost GEBAUT** (`tiktok-autopost.mjs`, FILE_UPLOAD, kein Domain-Verify) → fehlen nur
  4 Secrets `TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN` (User-OAuth, `dropship/TIKTOK-AUTOPOST-AKTIVIEREN.md`).
  Es gibt **kein** TikTok-API-Tool in der Session — Posten geht nur über diese Action.
- **✅ Pixel `D8EKVR3C77U6KT5BTBD0` geht** (Conversion-Tracking live). Offen für Käufe: TikTok-Kampagne Ziel „Kauf" + Budget.
- **✅ SOCIAL HEUTE LIVE (10.06.):** Bild-Posts MIT Text auf IG+FB+Threads (Aurora · Plateau 4,7★ · Marco · Gua-Sha ·
  Onyx · Costa), Ibiza schriftlos; + 3 frische **Techno-Reels gestaffelt** (Reel 1 live, Reel 2/3 = 11./12.06.
  per Cron). Rest der mit-Text-Posts ready → Cron drippt 2×/Tag.
- **✅ AUTO-HOST REELS (hands-off):** `reel-render` (alle 4 h) lädt das Reel jetzt automatisch auf Shopify-CDN
  (`upload_to_shopify_cdn.mjs`) + reiht es in `social/video_queue.csv` (ready) ein → `video-meta-autopost`
  postet es. Kein manueller Upload mehr. (auto_render.sh + reel-render.yml mit SHOPIFY-Secrets.)
- **🧩 SOCIAL/SHOP-BILD-AUFTEILUNG:** Produktseiten = **schriftlos** (`render_product_clean`, 235 live),
  Social-Posts = **mit Text** (`render_card`/`render_story`). „verzogen"-Beschwerde geklärt: `render_story` ist
  echtes 1080×1920 (kein Strecken) + adaptives `place_hero`. **gen_post_image.py auf main verifiziert** —
  place_hero/render_story/render_product_clean/_excludes alle vorhanden (frühere „weg"-Anzeige war transient).
- **Reel-Vorrat:** 64 .mp4 gerendert (meist ältere); frische Techno-Reels gehen jetzt automatisch in die Queue.
- **🎨 VISUAL-FIXES (09.06. spät):** (1) **Story-Format 1080×1920** mit Safe-Zones in `gen_post_image.py`
  (`render_story`) — Feed-Bild als Story war seitlich abgeschnitten. (2) **IG-Reel-Cover** = Produkt-Frame
  statt weisses Intro (`thumb_offset` in video-autopost-meta). (3) **Schärfe-Fix `place_hero()`**: CJ-Fotos
  sind oft 750–800px → Full-Bleed = 2–2.5× Upscale = unscharf. Neu adaptiv: hochauflösend (cover-scale ≤1.4)
  bleibt immersiv Full-Bleed, niedrig aufgelöst → scharfes Produkt auf unscharfem BG. Reels nutzen
  `automation/frame_for_reel.py` vor dem ffmpeg-Render (reel-render.yml installiert `python3-pil`).
  (4) **Story-Rating-Badge** (★ 4,9 · N Bewertungen) für Social Proof. **LEHRE:** Das `featuredImage` ist oft
  ein winziges Thumbnail (Bali 361×448), grössere Bilder (1066px) existieren → für Top-Schärfe das grösste
  Produktbild nehmen.
- **🎵 TECHNO-MUSIK:** `automation/music/` = 3 royalty-free Tracks (Kevin MacLeod, CC-BY): Voltaic/Electrodoodle/
  Digital-Lemonade. `auto_render.sh` rotiert pro Reel + hängt CC-BY-Credit an die Caption. (Eingebackene Musik:
  nur royalty-free; echte Trend-Sounds nur in-app über die `-clean.mp4`.)
- **🚫 DO-NOT-POST-Liste:** `automation/DO-NOT-POST.txt` (case-insensitive Substring) — **bali**, **augenmassage**
  nie in Creatives. Respektiert von `gen_post_image` (Stories/Posts) + `auto_render.sh` (Reels). Bali bleibt als
  Produkt/Bestseller im Shop, nur **keine Bali-Marketing-Bilder** (User 10.06.).
- **✅ PIXEL GEHT (User 10.06.):** TikTok-Pixel funktioniert → Conversion-Tracking live. Damit kann die Kampagne
  endlich auf **Käufe** optimieren. Von den 3 Reichweiten-Blockern ist Pixel ✅; offen bleiben **Conversion-
  Kampagne mit Ziel „Kauf" + Budget**.
- **TikTok-Autopost** (`tiktok-autopost.yml`) braucht `TT_CLIENT_KEY/TT_CLIENT_SECRET/TT_REFRESH_TOKEN`
  (TikTok-Developer-App + Content-Posting-API, evtl. App-Review). Bis dahin: manuell posten.
- **🖥️ BROWSER-/CLOUD-BROWSER-FRAGE (User 09.06.):** Diese Session hat nur **Headless-Playwright**
  (Screenshots/Lesen öffentlicher Seiten). **KANN NICHT** in eingeloggte Konten klicken (TikTok-App, Shopify-Admin,
  Meta Business Suite) — kein authentifiziertes Browser-/Computer-Use-Tool angeschlossen, Logins sind sensibel.
  **Option für die Zukunft:** Ein **Cloud-Browser-/Browser-MCP-Tool** mit eingeloggten Sessions verbinden → dann
  könnte eine Session auch klickende Aktionen übernehmen (TikTok-Upload, Customizer-Klicks, Token holen). Aktuell
  Arbeitsteilung: Claude = API/Render/Posten, User = App-/Login-Klicks.

**2026-06-11 — IG-DM-Auto-Antwort: GEBAUT, aber von Meta blockiert (NICHT nochmal versuchen):**
- `automation/ig-dm-reply.mjs` + `ig-dm-reply.yml` fertig (liest Konv., antwortet auf Kunden-DMs <24h,
  Themen-Erkennung, dedup). **ABER:** beide Tokens (IG_ACCESS_TOKEN + FB_PAGE_ACCESS_TOKEN) → Fehler
  **#3 „Application does not have the capability"**. Das ist ein **APP-Level-Block**: die Meta-App hat
  keine IG-Messaging-Fähigkeit → bräuchte **App-Review für `instagram_manage_messages`** (Advanced Access,
  mehrere Tage). **Bei 1 DM nicht lohnenswert → DMs bleiben manuell.** Tool wartet einsatzbereit, falls
  später Review+Scope da sind. Kommentar-Antwort (öffentlich) läuft autonom — das ist der wertvollere Teil.
