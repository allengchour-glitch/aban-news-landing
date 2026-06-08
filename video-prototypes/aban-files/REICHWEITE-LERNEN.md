# ABAN Files — Reichweiten-Lehren aus Top-Performern (Web-Recherche 2026-06-07)

> Modus: analysieren + Videos besser machen. Diese Datei = destillierte Muster erfolgreicher
> faceless Mystery/Conspiracy-Shorts. Nächste Render-Session: Punkte oben zuerst umsetzen + testen.

## 🔑 Die 6 größten Hebel (nach Wirkung)

### 1. LÄNGE: kürzer = mehr Reichweite — Sweet Spot **15–30 s**
- Daten: 15–25 s ist der Loop-Sweet-Spot; **>70 % Completion → ~30 % mehr Distribution**.
- **Seit 03/2025 zählt jeder Loop als neuer View**; „avg watch % > 100 %" = Top-Signal.
- ABAN ist aktuell ~50 s → **zu lang fürs Maximum.** → TEST: eine **25–35-s-Variante** rendern und
  gegen die 50-s-Version messen (der 30-Tage-Director liefert die Zahlen).

### 2. LOOPBARES ENDE (Replays = neue Views)
- Letzte 2 s **tonal/visuell wie die ersten 2 s** → nahtloser Loop, Zuschauer „fällt zurück" in den Start.
- **Umsetzung im Renderer:** letzten Clip = Eröffnungs-Clip wiederverwenden; letzter Satz schließt den
  Open Loop NICHT ganz → „… or forget you ever knew." passt, aber Bild sollte zum Anfang zurückführen.
- TODO (Code, nächste Render-Session): in `render()` finalen Segment-Clip = `norm[0]`-Quelle setzen.

### 3. HOOK 0–3 s (Swipe-Entscheidung) — schon stark, weiter schärfen
- Text-Overlay im Hook = **+18 % Watchtime**; **Pattern-Interrupt in den ersten 5 s = +23 % Retention**.
- Wert in **≤7 s** etablieren (YouTube Creator Insider), **kein Logo/Intro/Stille** am Anfang.
- ABAN: Hook-Text 0–2.8 s ✅. TODO-TEST: einen **harten Pattern-Interrupt** in Sek 1–3 (abrupter
  Bild-/Ton-Cut, Glitch-Frame) ergänzen.

### 4. CAPTIONS: schnell, hoher Kontrast, 6–8 Wörter/Screen, Keywords flashen
- 85 %+ schauen **ohne Ton** → Captions Pflicht. Trend-Farben: hellblau/gelb/grün.
- ABAN: gelbe Karaoke + schwarze Kontur ✅ (gerade gefixt). TODO: **Schlüsselwörter größer „flashen"**.

### 5. PACING: B-Roll alle **3–5 s**, schnelle Cuts, **minimal dead air**
- 72 % viraler Shorts (1 Mio+) nutzen schnelles Schnitt-Tempo. „Schneller sprechen als du denkst."
- ABAN: ~1 Clip/Satz (~5 s) ✅ — geht knapper (3–4 s) bei der Kurz-Variante.

### 6. SERIE + MEHRFORMAT
- **Multi-Format (Shorts + Long-form) wächst 41 % schneller.** `aban_film.py` baut bereits eine
  Kompilation → TODO: regelmäßig 1 Long-form-„ABAN Files Collection" hochladen.
- Serien-Branding „FILE #001…" verstärkt Abo-Grund (Zuschauer folgen einer fortlaufenden Story).

## Weitere belegte Punkte
- **Algorithmus rankt jedes Video EINZELN** (nicht Kanal-Schnitt) → A/B-Tests gefahrlos, ein Flop schadet
  dem nächsten nicht. → passt perfekt zum „1 Verbesserung testen"-Modus.
- **Thumbnails** unter 200k Abos kaum entscheidend → Fokus auf Hook, nicht Thumbnail.
- **Posting:** täglich = höchstes Engagement (ABAN: 3×/Tag ✅), Dienstag tendenziell stark.
- **Musik:** nur lizenzfreie Tracks (Distribution-Penalty bei Copyright) → ABAN nutzt eigenen Sine-Score ✅.

## Priorisierte Umsetzung (nächste Render-Session, nach Quota)
1. **25–35-s-Kurzvariante** eines Top-Themas rendern → gegen 50 s testen (Hebel #1).
2. **Loopbares Ende** im Renderer (Hebel #2) — Eröffnungs-Clip als Schluss-Bild.
3. **Pattern-Interrupt** im Hook (Hebel #3).
4. Eine **Long-form-Kompilation** via `aban_film.py` posten (Hebel #6).
Jede Änderung EINZELN testen, Director-Daten entscheiden lassen.

---

# DEEP DIVE (Vertiefung 2026-06-07 — „perfekte Videos")

## 🔁 LOOP-PLAYBOOK (der stärkste Reichweiten-Hack — faceless ist hier im VORTEIL)
Faceless hat keinen „Video-zu-Ende"-Hinweis (kein Gesicht/Körper) → Loop fühlt sich unsichtbar an.
Replay-Rate >10 % = exzellent, >20 % = selten + stark belohnt. Optimal **20–25 s**.
**5 Loop-Techniken (kombinieren):**
1. **Callback-Hook:** Schlusszeile **echot die Eröffnungsfrage** (Hook als Frage stellen, am Ende
   darauf zurück). → ABAN: Hook „Why reality keeps slipping." → Schlusszeile darauf zurückbiegen.
2. **Visual Match Cut:** **letztes Bild = erstes Bild** (gleicher Clip/Winkel/Farbe) → Neustart unsichtbar.
3. **Audio-Continuity:** Musik läuft **nahtlos über den Loop-Punkt** → KEIN Stille-Gap am Anfang
   (⚠️ unser `afade=in` am Start bricht den Loop! → für Loop weglassen oder Cross-fade).
4. **Cliffhanger-Reversal:** „Die Antwort war in der ersten Sekunde."
5. **Open-Question-Close:** Schluss stellt die Frage, die der Anfang beantwortet.
**How-to:** Ende ZUERST schreiben → Anfang dort hinführen; Callback-Phrase aus dem Hook in der
letzten Zeile wiederholen; **CTA NICHT ins Video** (stört Loop) → in Beschreibung/Caption.
3× loopen testen; wenn der Neustart ruckelt → Ende umschreiben.

## ✍️ HOOK-VORLAGEN (auf ABAN gemünzt, erste 2–3 s entscheiden über 71 % der Zuschauer)
- **„Did you know…"/Wissenslücke:** „You have been lied to about [X]."
- **„Everything you know about X is wrong":** stark fürs Mystery-Genre, hält Watchtime hoch.
- **„Only 1 % know this":** Exklusivität + Verschwörungs-Appeal (+80 % Shares).
- **„You won't believe…"** / High-Arousal (10× mehr geteilt).
- **„If you [erfahrung], stop scrolling":** Direktansprache (+91 % Aufmerksamkeit).
Regeln: **kein** Logo/Intro/Stille; Pattern-Interrupt in Sek 1–5 (+23 % Retention); nie länger als
**3 Sätze** auf demselben Shot; **Micro-Reset alle 5–8 s** (Winkel/Punch-in/Frage/Stat).

## 🎙️ STIMME & AUDIO
- **Ein Satz pro Beat.** Erste Zeile selbstbewusst + schnell, **keine Lead-in-Pause**.
- Tempo durchgehend straff; **gezielte Pause nur am Twist/Reveal** (Pacing+Tonfall = +40 % Behalten).
- Musik duckt unter die Stimme (haben wir ✅ Sidechain); Score nie gegen die Stimme kämpfen lassen.

## 🔎 SEO / METADATEN (✅ JETZT in `aban_publish.py` umgesetzt)
- Algorithmus liest Titel, Beschreibung, Hashtags, Auto-Captions **und die Audio-Waveform nach
  Keywords** → Topic-Wort auch **laut sagen** (tun wir).
- **Titel:** Haupt-Keyword in den ersten ~40 Zeichen; `#Shorts`; ~100 Zeichen Limit.
- **3–5 Hashtags in der Beschreibung** (erste 3 = klickbar über dem Titel); **6–8 Tags**.
- **Captioned Shorts ranken +23 %** (Captions brennen wir ein ✅).
- Watch-through **>75 %** + überdurchschnittl. Like-Ratio → Algorithmus skaliert.

## 🧩 RENDERER-TODOs (code-fertig, nächste Render-Session mit Quota testen)
1. **Loopbares Ende:** in `render()` letzten Segment-Clip = `norm[0]`-Quelle (Visual Match Cut).
2. **Audio-Continuity:** `afade=t=in:st=0:d=2.6` am Musik-Start für die Loop-Version entfernen/kürzen.
3. **Pattern-Interrupt-Hook:** in Sek 1–2 einen harten Cut/Glitch-Frame (z. B. 2–3 sehr kurze
   Segmente am Anfang) + lauter Impuls.
4. **Kürzer testen:** 20–30-s-Variante (Skript ~300–420 Zeichen) gegen die ~50 s messen.
5. **Multi-Format:** regelmäßig 1 Long-form-Kompilation via `aban_film.py` posten (+41 % Wachstum).
Jede Änderung EINZELN rendern + gegen Director-Daten testen.

## Quellen
- virvid.ai — Faceless Algorithm/Retention; Looping-Structure; AI-Shorts-Hook-Guide (2026)
- opus.pro — Shorts viral guide; Hook formulas
- YouTube Creator Insider (7-Sek-Regel, 2025); Loop zählt als View seit 03/2025
- hashtagtools.io / crawlvision — Shorts-SEO 2026 (Titel/Hashtags/Tags, +23 % captioned)
