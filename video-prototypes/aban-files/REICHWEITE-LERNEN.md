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

## Quellen
- virvid.ai — Faceless YouTube Algorithm: Retention, Hooks (2026)
- opus.pro — How to Make YouTube Shorts Go Viral
- YouTube Creator Insider (7-Sekunden-Wert-Regel, 2025); Loop-Zählung seit 03/2025
