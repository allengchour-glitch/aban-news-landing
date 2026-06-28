<!-- Auto-Recherche 2026-06-28, 7 Agenten (Web). NUR INFO fuer die Video-Session. Sammler-Session produziert/postet nichts. Fortgeschrittene POWER-Nutzung der KI-Video-Tools — ergaenzt VIDEO-KI-PIPELINE-VORBEREITUNG / SUPER-VIDEO-PLAYBOOK / PRODUKT-VISUALS-WERKSTATT / VIDEO-ADS-PAID-READINESS (kein Duplikat). Marken-Regel: Produkt echt, KI nur Bewegung/Mood/Schauspieler. -->

# Video-Power-Tools — KI maximal ausnützen

> **Was dieser Guide ist:** die **fortgeschrittene Power-Schicht** für KI-Video bei LuxeStyle.
> Nicht die Basics — die stehen schon woanders (siehe Querverweise unten). Hier geht es darum, wie
> man die modernen Tools (Veo 3.1, Kling 3.0, Sora 2, Wan 2.2, fal.ai, CapCut …) **clever, billig und
> markentreu maximal ausreizt**. Alle Zahlen sind Stand der zitierten 2025/2026-Quellen — vor jedem
> Batch-Lauf kurz auf den Anbieter-Seiten gegenprüfen, Preise/Modelle ändern sich wöchentlich.

## Für wen / unter welcher Regel
- **1 Person, 0-Budget, kleiner Shop.** Kein Studio, keine Agentur. Maximaler Output pro Franken + pro Minute.
- **Marken-Regel (hart):** Das **echte Produkt bleibt originalgetreu** — Farbe, Print, Logo, Proportion. KI
  darf NUR **Bewegung, Mood, Hintergrund, Licht, Schauspieler/Kamera** liefern. KI darf das Produkt **nie
  erfinden oder verfälschen**.
- **Praktische Konsequenz dieser Regel (gilt überall in diesem Guide):** **IMMER Image-to-Video (i2v)** mit
  dem echten Produktfoto als erstem Frame — **nie Text-to-Video (t2v)** fürs Produkt. t2v erfindet ein
  Fake-Produkt. Das ist die zentrale technische Lösung der Marken-Regel.
- **Kein Voiceover-Zwang:** On-Screen-Text statt Stimme, Musik = `automation/music/luxe-premium.wav`. Native
  KI-Audio also meist **abschalten/ignorieren** (spart oft sogar Geld) und in Post die eigene Spur legen.

---

## 1. Profi-Prompting (Regie statt Zauberwörter)

Fortgeschrittenes Prompting 2026 ist **Regie-Arbeit**, kein „Adjektiv-Stapeln". Ein festes Gerüst + explizite
Kamera-/Lichtsprache schlägt jedes „cinematic, beautiful, 8k".

### Prompt-Struktur (5-Teil-Formel, Veo-offiziell)
Immer in dieser Reihenfolge, 3–6 Sätze / ~100–150 Wörter:

```
[Kamera/Shot] + [Subjekt mit konkreten Merkmalen] + [Aktion] + [Kontext/Ort/Zeit] + [Stil & Licht (+ optional Audio)]
```

Regeln:
- **Verben + Kamerabewegungen** schlagen Adjektive. „slow dolly-in" ist besser als „dynamic".
- **EIN Kamera-Move + EINE Subjekt-Aktion pro Clip.** Mehr verwirrt das Modell.
- Vage Begriffe („schön", „schnell", „dynamisch") vermeiden — laut Sora-Cookbook ausdrücklich Fehlerquelle.
- **Bei i2v das Bild NICHT noch einmal beschreiben** — sonst fängt das Modell an, das Produkt zu
  „reinterpretieren" (= Morphing). Prompt steuert nur Bewegung/Kamera/Licht/Hintergrund.

### Kamerasprache (konkret statt „cinematic")
`slow push-in / dolly-in` · `tracking shot` · `180-degree arc` (Produkt rundum) · `orbit` · `rack focus`
· `crane up` · `shallow depth of field` · `85mm`. Ohne explizite Kamera bleibt das Modell statisch oder leicht handheld.

### Lichtlogik = stärkster Anti-Fake-Hebel
Lichtquelle + Richtung + Temperatur benennen: `soft key light from left, hard rim light, golden-hour backlight`.
Dazu 3–5 Farb-Anker (`amber, cream, walnut`). **Keine widersprüchlichen Begriffe mischen** (nicht „golden hour"
+ „studio lighting" gleichzeitig) — das erzeugt inkonsistentes Licht und Warping.

### Negative Prompts — knapp und gezielt
Standard-Block (nicht überladen, sonst friert die Bewegung ein):
```
morphing, melting, distorted hands, extra limbs, warped product proportions,
text overlay, flickering, jittery movement, blurry, low quality
```

### Konsistenz — über Referenz-Bilder, NICHT über Seeds
**Seeds sind bei Video 2026 überbewertet/unzuverlässig.** Echte Konsistenz kommt aus Referenz-Systemen:
Veo „Ingredients" (3 Referenzbilder), Kling „Character ID / Elements" (2–4 Bilder — mehr als 4 verwirrt),
First-&-Last-Frame. Seed-Lock nur als zusätzliche, schwache Stütze, wo das Modell es erlaubt.

### Fertige Profi-Prompt-Rezepte (Produkt/Mode)

**A) Schmuck-/Accessoire-Rundum (i2v, echtes Foto als Start-Frame):**
```
180-degree arc shot, the product rotates slowly on a matte pedestal, shallow depth of field,
soft key light from the left with a hard rim light catching the edges, warm amber-and-cream palette,
slow motion, maintains exact appearance throughout.
Negative: morphing, warped proportions, text overlay, flickering, distorted hands.
```

**B) Kleid am Model — Wind/Mood (i2v):**
```
Camera slowly pushes in, subtle wind animates the model's hair and dress fabric,
warm late-afternoon golden-hour backlight gradually intensifies, shallow depth of field, 85mm.
Negative: morphing, melting, distorted hands, extra limbs, warped product proportions, flickering.
```
> Hände möglichst aus dem Frame komponieren oder Slow-Motion — Hände bleiben der häufigste Fail.

**C) Produkt-Detail-Macro (i2v, statisch + Licht-Animation):**
```
Extreme close-up macro, the product stays still, a soft moving highlight glides across the surface,
gentle rack focus from texture to logo, studio softbox key light, cool-neutral palette.
Negative: morphing, warped product proportions, text overlay, jittery movement, blurry.
```

**D) Flat-to-on-model Reveal (First-&-Last-Frame):**
```
Start frame: product laid flat on linen.  End frame: same product worn on model.
Prompt: smooth seamless transition between the two states, soft natural daylight, no other change.
Negative: morphing, extra limbs, distorted hands, warped proportions.
```

**E) Mehr-Shot-Mini-Reel in EINEM Render (Veo Timestamp / Kling Multi-Shot):**
```
[00:00-00:02] close-up of the product on pedestal, slow push-in
[00:02-00:05] medium shot, model wears the product, subtle turn
[00:05-00:08] detail macro, light glides across surface
Soft golden-hour light throughout, consistent warm palette.
```

### Spar-Workflow beim Prompten
- **Iterativ pinnen statt neu würfeln:** funktionierendes Ergebnis behalten, nur EIN Element ändern
  („same shot, switch to 85mm" / Sora-2-Remix). Nicht den ganzen Prompt umschreiben → schnellere Konvergenz,
  weniger Credits.
- **Fast/Draft-Modell für die ersten 80 %** (Prompt/Bewegung finden), Standard-Modell nur für den Final-Cut.
  Laut Quellen 60–80 % Credit-Ersparnis bei 1–8 % Qualitätsunterschied — der größte einzelne Geldsparer.

---

## 2. KI-Schauspieler / UGC — ehrlich einordnen

KI-UGC-Avatare (Arcads, Creatify, HeyGen Avatar IV, Higgsfield, Captions) lassen einen synthetischen
„Creator" ein Produkt anpreisen. Lippensync ist gut genug, dass Feed-Zuschauer selten stutzen. **Aber:**

- **Echtes UGC schlägt KI bei Trust.** Unabhängigere Daten: KI-UGC erreicht nur ~85–110 % der CTR von gutem
  echtem UGC und **verliert genau dort, wo Vertrauen den Kauf treibt — bei Mode/Apparel**. Die Vendor-Parole
  „9/10 erkennen den Unterschied nicht" ist Marketing.
- **Der größte „Tell" ist das Skript, nicht das Gesicht.** Zu perfekte Grammatik, keine Füllwörter = sofort
  erkennbar fake.
- **Talking-Head-Avatare können euer Produkt meist NICHT glaubwürdig halten/tragen/vorführen** — sie
  komponieren es als Requisite ins Bild → bricht die Marken-Regel. Für Mode/Schmuck = Kernproblem.

### Wann KI-UGC für LuxeStyle Sinn ergibt
1. **Avatar nur als 3-Sek-Hook-Kopf**, dann **harter Schnitt auf echtes Produkt-B-Roll**. Der Avatar spricht
   nur den Aufhänger („Ich war skeptisch bei dieser Kette unter 30 Franken…"), **fasst das Produkt nie an**.
   Umgeht das Hand-/Requisiten-Problem und schützt die Marken-Regel.
2. **Skript bewusst unperfekt schreiben** — Umgangssprache, Füllwörter, Schweizer Ausdrücke. 2 Minuten Tippen,
   eliminiert den häufigsten Fake-Grund.
3. **Hook-Massentest:** 1 Skript × 10–20 Avatare/Personas an einem Tag (Batch in Creatify/Arcads/Higgsfield),
   nur den Gewinner skalieren. Drückt den Test-Zyklus von 7–14 Tagen auf < 1 Stunde.
4. **Sprach-/Markt-Varianten** eines Gewinners: HeyGen/Arcads Lip-Sync DE→FR (zweisprachige Schweiz) statt
   neu drehen — Produkt-Material bleibt echt.

### ⚠️ KI-Kennzeichnungspflicht (real und teuer)
- **EU-KI-Verordnung Art. 50, ab 02.08.2026:** KI-/Deepfake-Inhalte müssen **offengelegt UND maschinenlesbar
  markiert** werden. Bußgeld-Tier bis **15 Mio EUR / 3 % Umsatz**.
- **TikTok** verlangt aktiv das **AIGC-Label**; **Meta** lehnt „undisclosed AI" aktiv ab (drittgrößte
  Ablehnungs-Kategorie, ~14 %).
- **→ Pflicht:** AIGC-Toggle aktivieren + sichtbares On-Screen-Label („KI-Creator"). Macht Transparenz zum
  Stil-Element — passt zur On-Screen-Text-Präferenz und baut bei skeptischem Publikum eher Vertrauen auf.
- **Provenance/SynthID NIE entfernen** (CA SB 942 ab 01.01.2026 + COPIED Act verbieten es; Plattformen
  erkennen entfernte Marker → Shadowban-Risiko).

> **Fazit für LuxeStyle:** KI-Avatare = billige **Test-Schicht für Hooks/Varianten**, NICHT der
> Haupt-Vertrauensanker für Mode. Und ehrlich: Der dokumentierte Engpass ist **Traffic-Qualität**
> (2.994 Sessions, 0 Käufe), nicht Creative-Menge — mehr Videos sind ohne die 3 User-Klicks (Pixel/
> Conversion-Kampagne/AGB) ein **0-Hebel**.

---

## 3. Tool-Chaining / Automatisierung (1-Person-Pipeline)

Der Hebel ist nicht ein besseres Tool, sondern **Verkettung** + **1 Asset → N Varianten**.

### Die Pipeline
```
Script (LLM)
  → Master-Bild (Nano Banana / Flux — echtes Produktfoto als Input!)
  → image-to-video (Kling / Wan / LTX über fal.ai)
  → Montage + Captions (Creatomate-Template / ffmpeg)
  → Auto-Post (mit Mensch-Gate davor!)
```

### Power-Prinzipien
- **EINE API-Schicht statt N Integrationen (fal.ai):** ein Key, eine Queue-/Webhook-/Billing-Logik für 600+
  Modelle (Kling, Veo, Wan, LTX-2, Seedance). Modell pro Job per Variable tauschen, **nicht** den Code. Im
  Stil von `cj_enrich.mjs` ein Node-Skript: `submit → Webhook „fertig" → Download` (Generierung dauert
  5–30 Min → **nie synchron/blockierend** bauen).
- **First-Frame-Lock mit echtem Produktfoto = Marken-Regel automatisch erfüllt.** Optional Last-Frame
  (anderer Winkel). KI interpoliert nur dazwischen → Produkt 1:1, spart Verwurf-Iterationen (= echter
  Kostenhebel).
- **1 Asset → 10 Varianten per JSON/CSV-Template (Creatomate):** Layout EINMAL bauen (Produkt-Slot,
  Text-Slot, Preis-Anker, luxe-premium.wav, Markenband), dann pro CSV-Zeile ein Clip (anderer Hook-Text/
  Produkt/Hintergrund). Auto-Untertitel via `transcript_effect:"highlight"` + `transcript_maximum_length~14`
  (wortweise, ohne Voiceover). Alternative gratis: das vorhandene ffmpeg-Skript.
- **Modell-Staffelung nach Geld-Wert:** Masse/Loops/B-Roll = LTX-2 (~$0,06/s 1080p) oder Wan (~$0,10/s);
  1 Hero-Ad/Woche = Kling Pro/Veo. Off-peak batchen, Clips so kurz wie nötig (5–8 s).
- **Master-Scene-Tweaking:** aus EINEM starken Master-Frame per i2i Saison-Varianten ableiten (Sommer,
  1.-August-Edition, Weihnachten) — Produkt gleich, Szene wechselt; jede wird Start-Frame eines i2v-Clips.
  Passt zu den selbst-füllenden Saison-Collections.

### Orchestrator: NICHT noch mehr GitHub-Crons
**GitHub Actions ist account-weit gesperrt** (Memory). Keine neue Cron-Armee bauen. Orchestrierung über:
- **n8n self-hosted (Docker, gratis)** — fertige Templates adaptieren (LLM→Bild→i2v→Render→Post), Trigger =
  Google-Sheet/CSV-Zeile mit nur geprüften ≥4★-Produkten, Voiceover-Node weglassen. Umgeht die Sperre komplett.
- oder **lokales ComfyUI/ffmpeg-Skript**.

> **Pflicht-Gate:** Vollautomatik ohne Mensch-Kurierung produziert „Slop" (wie die Auto-Posts, 0-Hebel
> bewiesen). Pipeline ja — aber **immer ein Kurierungs-Gate vor dem Posten**.

---

## 4. Neueste 2026-Fähigkeiten + legale Gratis-/Günstig-Hacks

### Was wirklich neu ist (verifiziert, nicht Hype)
- **Veo 3.1:** 720p/1080p/4K, natives Audio + Lipsync < 120 ms, Extend bis 148 s, Ref-to-Video (bis 4 Bilder),
  First/Last-Frame, Timestamp-Prompting.
- **Sora 2:** 15–25 s, synchroner Sound, Cameos/Remix/Extend, 1080p. **API-Output ist echt watermarkfrei**
  (im Gegensatz zur App). Max. 2 Charaktere/Generation.
- **Kling 3.0:** Multi-Shot bis 6 Cuts in EINER Generation, **Element-Reference für exakte Produkttreue**,
  4K60, native Lipsync.
- **Wan 2.2 (Alibaba, Apache-2.0):** kommerziell erlaubt, **kein Wasserzeichen, kein Limit**, self-host in
  ComfyUI (5B auf RTX 4090/~8 GB; 14B braucht 24 GB).

> Für LuxeStyle sind die zwei relevantesten Neuerungen: **(1) i2v mit Element-Reference** (echtes Produkt
> bleibt pixelgenau) und **(2) Multi-Shot in einem Render** (spart Tool-Chaining + Schnitt).

### Gratis-Realität ehrlich
- **Veo:** KEIN echter Gratis-Video-API-Tier mehr. Nur evtl. Test in **AI Studio/Flow** mit Limits +
  **nicht-kommerziell**. „Gratis Veo"-Versprechen sind meist Drittanbieter-Trials oder veraltet.
- **Sora-Gratis:** am **10.01.2026 abgeschafft**.
- **Kling:** **66 Credits/Tag gratis** — aber **720p + Watermark + nicht kommerziell** → nur Lernen/Storyboard.
- **Krea AI:** **100 Compute-Units/Tag gratis**, Multi-Model-Aggregator (Veo/Kling/Hailuo/Wan/Luma in einer UI)
  → ideale Gratis-Prompt-/Look-Werkstatt.

### Credits strecken (so zahlt man fast nur den Final-Clip)
1. **Gratis-Tiers (Kling 66/Tag + Krea 100/Tag) nur zum Prompt-/Look-Tunen** — diese Outputs (Watermark,
   nicht kommerziell) **nie posten**, nur als Vorlage.
2. **Final dann via fal.ai pay-per-use (kein Abo):** Kling 3.0 ~$0,029/s, Kling 2.5 Turbo ~$0,07/s,
   Veo 3.1 Fast 720p ~$0,10/s, LTX-2 ~$0,06/s.
3. **Fast/Draft zum Iterieren, Standard nur für Final** (−60–80 %).
4. **Native Audio AUS** — bei Veo 720p $0,20 (ohne) statt $0,40 (mit). Spart, und ihr legt ohnehin
   luxe-premium.wav drüber.
5. **Last-Frame-Chaining** statt einem teuren langen Clip: letztes Frame = Start des nächsten → längere/
   loopende Reels aus mehreren billigen Kurz-Renders.

### Watermark legal vermeiden
- **Sauber = bezahlter Export/API**, NICHT Removal-Tools.
- **Sora-API** = echt watermarkfrei. **Wan** = gar kein Watermark. **Veo** behält immer das **unsichtbare
  SynthID** (legal, disclosure-konform, kein sichtbares Logo auf Bezahlplänen) — für Ads unproblematisch.
- **SynthID/Provenance NIE strippen** (CA SB 942 / COPIED Act verbieten es; Shadowban-Risiko).
- ⚠️ **Veo 3.0** (`veo-3.0-generate-001`/`-fast`) wird **30.06.2026 abgeschaltet** → in Skripten auf
  **Veo 3.1** migrieren.

---

## 5. Power-Edit-Features (Roh-Clip → Reel in Minuten)

Größte Zeitsparer sind die **langweiligen Automatisierungen**, nicht die „viral machine"-Features.

- **Auto-Captions im Karaoke-/Hormozi-Stil = größter Retention-Hebel pro Minute.** CapCut: Text → Auto
  captions → DE → Karaoke-Preset (Wort-für-Wort), Keyword-Emphasis (gelb/fett) auf Kaufargumente
  (Preis/Gratis-Versand). Untertitel ~+40 % Watch-Time. **DE-Transkription macht Fehler** (Markennamen,
  Zahlen) → 30 Sek gegenlesen. Da on-screen-Text ohnehin Marken-Regel ist: Captions sind euer Haupt-Textträger
  — groß, mittig, max. 3–4 Wörter/Zeile, Safe-Zone oben/unten frei.
- **Auto-Reframe: 1 Master → alle Formate.** Master einmal in 9:16 schneiden, dann 1:1 (Feed) und 16:9/2:3
  (Pinterest/YouTube) per Subject-Tracking aus EINEM Export. Caption-Position pro Format prüfen (verschiebt
  sich beim Crop). Reframe kann bei mehreren Personen/schnellem Schwenk falsch croppen → Vorschau.
- **Beat-Sync gegen luxe-premium.wav.** Musik auf die Spur, Auto-Beat aktivieren, Produkt-Reveal/Preis-
  Einblendung auf den stärksten Beat (Drop). Hook in den ersten 0,8 s. Da die Marken-Musik fix ist: einmal die
  Beat-Map kennen = wiederverwendbares Schnittraster für alle Reels.
- **Eigenes Hook-Template als „Format"** (statt fremder CapCut-Templates → Watermark-/Lizenz-Falle): Intro
  (Marke), Hook-Layer (0–1 s), Beat-Raster, Caption-Style, Outro-CTA. Pro neues Produkt nur Clips + Text tauschen.
- **Batch-Repurposing-Mindset:** bei jedem Dreh bewusst Mehr-Material filmen (Detail/Tragen/Unboxing/Lifestyle).
  **Auto-Clipper (OpusClip/Spikes) lohnen nur bei LANGEM Quellmaterial** (Haul/Live) — für native 8–15-Sek-Clips
  überdimensioniert; dort ist die Edit-Power-Schiene (Captions/Reframe/Beat) der echte Hebel.
- **Trend-Audio VOR dem Dreh checken** (TikTok Creative Center, gratis, deckt ~80 % ab). Trend-Fenster ist
  nur 48–72 h offen — nachträglich aufgreifen bringt wenig.
- **KI-B-Roll NUR fürs Umfeld/Mood** (Strand, Stadt, Stoff-Nahaufnahme), **nie fürs Produkt** — sonst
  Marken-Regel gebrochen. Erfolgsquote anfangs nur 30–50 %.

> **Tool-Honest:** CapCut = stärkstes KI-Ökosystem, aber teurer geworden (Standard $9,99 / Pro $19,99) +
> Watermark-/Lizenz-Fallen im Free-Plan. **VN** = echte 0-Budget-Alternative (kein Watermark, kein Abo),
> aber wenig KI. **DaVinci Resolve** = gratis Profi mit animiertem Untertitel-Toolkit.

---

## 6. Marken-Konsistenz (wiedererkennbarer Look über alle Clips)

Konsistenz kommt 2026 aus **Referenz-Bildern + Wiederholung**, nicht aus langen Text-Prompts oder Seeds.
Drei Säulen:

1. **Marken-Avatar als gespeicherte Identität** — EINMAL fixieren statt pro Clip neu beschreiben. Mit Training:
   **Higgsfield Soul ID** (aus 20+ Fotos in 3–5 Min, danach per ID über Kling/Veo/Seedance abrufbar). Ohne
   Training: Reference-Image in Runway Gen-4.5 / Veo 3.1 (1–3 Bilder). **Modelle haben kein Gedächtnis zwischen
   Generierungen** → Referenz in JEDEM Clip neu laden.
2. **Produkt unverändert via i2v + niedrige Bewegungsstärke** — nur Kamera-Moves (slow pan/zoom/orbit), keine
   „Produkt baut sich zusammen"-Aktion. Clips auf 3–5 s. Konsistenz hält ~90 % bei kurzen Clips, **driftet ab
   ~30–60 s** und bei starker Bewegung/Kopfdrehung → lieber **5 saubere 5-s-Clips als 1×25 s**.
3. **Einheitlicher Look in der Post:** **EINE finale Marken-LUT/Farbkorrektur über ALLE Clips** (ffmpeg) — laut
   Quellen der einzeln wirksamste Schritt, um Clips aus verschiedenen Batches zusammengehörig wirken zu lassen.
   Dazu **Color Ladder**: 1 Kern-Markenfarbe + 2 Akzentfarben.

> **Identität lebt im Rahmen, nicht im KI-Wackeln:** festes Intro/Outro + immer luxe-premium.wav + gleiches
> On-Screen-Text-Layout + gleiche LUT + gleicher Avatar. Diese Wrapper-Schicht (ffmpeg) ist 100 %
> deterministisch und trägt die Wiedererkennbarkeit, selbst wenn jeder KI-Clip einzeln variiert.

---

## 7. Tool-Tabelle

| Tool | Superpower | Gratis / Preis |
|---|---|---|
| **Kling 3.0 / 2.5 Pro** | Arbeitspferd für markentreue Produkt-i2v; Element-Reference (exakte Produkttreue), Multi-Shot bis 6 Cuts, 4K60. ~80–90 % Veo-Qualität zum Bruchteil | Gratis 66 Cr/Tag (720p, Watermark, nicht kommerziell); via fal Kling 3.0 ~$0,029/s, 2.5 Turbo ~$0,07/s; Abo ab ~$10/Mt |
| **Google Veo 3.1** | Bester Kamerafahrt-/Profi-Look, Ingredients (3 Ref-Bilder), First/Last-Frame, Timestamp, natives Audio — für wenige Hero-Shots | Kein echter Gratis-API-Tier; fal: Fast 720p ~$0,10/s, ohne Audio 720p ~$0,20/s, Standard ~$0,40/Video; Google AI Pro $19,99/Mt |
| **Sora 2 (OpenAI)** | Natives Audio + Lipsync, Cameo, Remix/Extend; **API watermarkfrei** | Gratis abgeschafft (10.01.2026); ChatGPT Plus $20/Mt (App, Watermark); API ~$0,30–0,50/s |
| **Wan 2.2 (Alibaba, OSS)** | Apache-2.0 (kommerziell), **kein Watermark, kein Limit**, self-host in ComfyUI; i2v hält Produktfoto | Modell gratis; eigene GPU $0 (5B auf ~8 GB / 14B auf 24 GB), sonst Cloud-GPU ~$0,20–0,40/h; via fal ~$0,10/s |
| **fal.ai** | EINE API/Queue für 600+ Modelle, pay-per-use ohne Abo — zentrale i2v-Schicht | Pay-as-you-go, keine Fixkosten |
| **Krea AI** | Multi-Model-Aggregator (Veo/Kling/Hailuo/Wan/Luma) in EINER UI — Gratis-Werkstatt | Gratis 100 Units/Tag (keine Karte); Basic $9/Mt |
| **Higgsfield (Soul ID)** | Persistenter Marken-Avatar aus 20+ Fotos, über ganzen Modell-Stack abrufbar; URL→fertige Ad | Starter $15/Mt (~200 Cr, Verfall nach 90 T); Plus $49/Mt (voller Stack inkl. Veo 3.1) |
| **Creatify** | URL→Video, 700+ Avatare, Batch-Hook-Test — günstigster vollwertiger UGC-Generator | Free 10 Cr (Watermark); Starter ~$33/Mt; Pro $49/Mt |
| **Arcads** | 1000+ KI-Schauspieler aus Motion-Capture, natürliches UGC | Kein Free-Trial; Starter $110/Mt (10 Videos) — für 0-Budget zu teuer |
| **HeyGen (Avatar IV)** | Beste Mehrsprachigkeit (170+ Sprachen, synct Lippen) — DE→FR-Varianten | Free 3 Videos/Mt; Creator $24/Mt; Avatar IV = 20 Cr/Min (teuer) |
| **Seedance 2.0** | Multi-Shot (9–12 Ref-Inputs), bis 15 s, **Gratis-Tier watermarkfrei** | Gratis-Tier watermarkfrei (seit Feb 2026); Paid via Anbieter/Higgsfield |
| **Runway Gen-4/4.5** | Referenz-Konsistenz (bis 3 Bilder), Objekt-Persistenz, Motion-Brush | Free 125 Cr einmalig; Standard ~$12–15/Mt |
| **Creatomate** | 1 JSON/CSV-Template → Hunderte Varianten, Auto-Untertitel ohne Voiceover | Kostenpflichtige Tiers + Gratis-Trial (vor Einsatz prüfen); Alt: ffmpeg gratis |
| **n8n (self-hosted)** | Orchestrator LLM→Bild→i2v→Render→Post; umgeht GitHub-Actions-Sperre | Self-hosted (Docker) gratis |
| **ComfyUI** | Lokale Batch-Pipeline (Wan 2.2 i2v, first/last-frame, Upscale), headless per API | Open-source/gratis (GPU/Strom) |
| **Nano Banana** | Starkes Master-Frame + i2i-Restyling; „spannt" KI-Bewegung an echtes Produkt | Gratis-Probe + Tiers (prüfen) |
| **CapCut** | Stärkstes KI-Edit-Ökosystem: Auto-Caption (130+ Spr.), Auto-Reframe, Beat-Sync | Free (Basis, Watermark-/Lizenz-Falle bei Pro-Templates); Standard $9,99 / Pro $19,99/Mt |
| **VN Video Editor** | 0-Budget-Alternative: kein Watermark, kein Abo, 4K, Beat-Sync | Gratis |
| **DaVinci Resolve 20** | Gratis-Profi, animiertes Untertitel-Toolkit (Karaoke/Hormozi), 4K kein Branding | Gratis; Studio einmalig ~$295 |
| **Topaz Video AI** | Post-Reparatur: glättet Rest-Artefakte (Hände, Flackern), Upscale/Stabilisierung | Einmal-/Lizenzkauf |
| **TikTok Creative Center** | Gratis Trend-Sounds/Hooks-Erkennung (CH/DE) | Gratis |

---

## 8. Verbote (harte No-Gos)

- **Produkt NIE verfälschen:** kein Text-to-Video fürs Produkt, keine generative „Produkt-Erfindung", kein
  KI-B-Roll, das das Produkt zeigt. Immer i2v vom echten Foto. **Jeden Clip vor Veröffentlichung QA-prüfen**
  (Farb-Drift, Print/Logo-Verzerrung, Hände).
- **KI ohne Kennzeichnung, wo Pflicht:** fotorealistische KI-Menschen/Avatare → **AIGC-Label (TikTok) +
  sichtbares Overlay (Meta) + maschinenlesbar (EU-AI-Act ab 02.08.2026)**. Sonst Ad-Reject + Bußgeld-Risiko.
- **SynthID/Provenance NIE entfernen** (gesetzlich verboten, Shadowban-Risiko). Sauber = bezahlter Export/API.
- **Kein `%` und keine Emojis im ffmpeg `drawtext`** — bricht das Filter-Parsing / rendert kaputt. (Bekannte
  Render-Falle aus der Pipeline.)
- **Kein TikTok-Watermark** in nachgenutzten Clips — Plattformen drosseln watermarked Re-Uploads.
- **Kein CJ-Leak:** Lieferant „CJ" / interne IDs nie im Bild, Text, Caption oder Dateinamen sichtbar.
- **Keine Gratis-Tier-Outputs posten** (Kling/Krea = Watermark + nicht kommerziell) — nur als Storyboard.
- **Keine neue Cron-Armee** (GitHub Actions account-weit gesperrt) — Orchestrierung self-hosted (n8n/ComfyUI).
- **Keine Fake-Reviews / keine erfundenen Performance-Zahlen.**

---

## Querverweise (nicht duplizieren)

Dieser Guide = **fortgeschrittene Power-Nutzung**. Die Grundlagen stehen hier:
- **`dropship/VIDEO-KI-PIPELINE-VORBEREITUNG.md`** — Tool-Vergleich Kling/Veo/Luma/fal, Pipeline-Setup.
- **`dropship/SUPER-VIDEO-PLAYBOOK.md`** — Hook-/Skript-Handwerk.
- **`dropship/PRODUKT-VISUALS-WERKSTATT.md`** — Handy-Dreh- & Edit-Basics.
- **`dropship/VIDEO-ADS-PAID-READINESS.md`** — Ad-Creative & Paid-Readiness.
- **`dropship/VIDEO-PRAEFERENZEN.md`** — feste Marken-Regeln (kein Voiceover, luxe-premium.wav).
