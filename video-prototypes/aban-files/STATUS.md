# ABAN Files — STATUS / Memory (zuerst lesen)

> Dauerhafte Projekt-Memory für „ABAN Files" (YouTube-Shorts). Liegt hier statt in
> der Wurzel-`CLAUDE.md`, weil die von der Dropship-Session bespielt wird.
> Stand: 2026-06-03.

## 🎬 DAUERAUFTRAG — Video-Chef (User, 2026-06-07)
**Claude ist Video-Chef.** Oberstes Ziel: **viele ABONNENTEN / REICHWEITE**.

**🔑 NEUE AUSRICHTUNG (User-Update 2026-06-07): KEINE Video-Masse mehr produzieren.**
Stattdessen: **ANALYSIEREN** (was bringt Reichweite/Abos?) und die Videos **kontinuierlich BESSER
machen** → Qualität & Daten statt Menge. Konkret pro Session:
1. Zuerst `reports/ABAN-DIRECTOR.md` + `reports/ABAN-STATS.md` lesen → Top-Performer & Schwächen.
2. **EINE gezielte Verbesserung** am Renderer/Skript-Stil/Hook/Thumbnail/Caption ableiten und umsetzen
   (datenbasiert), statt viele neue Folgen zu rendern.
3. Nur bei klarem Bedarf 1 verbesserte Muster-Folge rendern (z. B. neuer Hook-Stil) und gegen die
   bisherige Performance testen. **Nicht** stumpf die Queue auffüllen.
- Die bereits gequeueten Folgen posten weiter (Cron = Reichweite) — aber der CHEF-Fokus liegt auf
  Auswertung + Qualitäts-Iteration, nicht auf Volumen.
- 30-Tage-Regel bleibt: zu wenig Abo-Wachstum → **Thema wechseln** (`aban_director.py`: `PIVOT_DAYS=30`,
  `SUB_30`, `PIVOT_THEMES`). Director **empfiehlt**, Chef **führt aus**.

## Was es ist
Faceless YouTube-Shorts-Kanal (Sci-Fi/Ancient-Aliens). Sprecher **ABAN** (reptiloider
Herrscher). **Echten Owner-Namen NIE nennen** — nur „ABAN" / „we of ABAN".
Kanal = Haupt-Kanal (umbenannt zu „ABAN Files").

## Stand
- **36 Folgen** (ep1–ep36) als fertige Clips in `clips/` (~5 Wochen täglich).
- **ep29–ep36 = Ancient-Aliens-Reihe:** Puma Punku, Bagdad-Batterie, Göbekli Tepe, Dogon/Sirius,
  Vimanas, Piri-Reis-Karte, Wächter/Henoch, Paracas-Langschädel.
- **Öffentlich auf YT:** ep1–ep14 (+ ep12=RBEaa5csRWY, ep13=ye2sgjpUxv8 u.a. in `video_ids.json`).
- **In der Queue (noch nicht gepostet):** ep15–ep36 → Cron (3×/Tag) postet automatisch.
- ep14–ep36 mit Voice-Fixes; ep21–ep36 zusätzlich mit Pexels+Pixabay (mehr Auswahl).
- **🆕 2026-06-07 — ep15–ep36 Skripte NEU + Gemini-Review:**
  Erst auf ~80 s verdoppelt; **Gemini (2.5-pro) bewertete ep15 mit 7/10**: Hook 9/10, Audio 10/10,
  Footage 8/10, aber **„81 s ist für Shorts zu lang"** + Caption-Kontur fehlt + Abo-CTA zu generisch.
  → **User-Entscheid: auf ~50 s kürzen + CTA in die Story einweben.** Jetzt: alle 22 Skripte
  **Ø ~785 Zeichen ≈ 50–58 s** (6-Beat: Cold-Open → Open Loop → Eskalation → Re-Hook → Cliffhanger →
  **in-persona-CTA** „Follow the ABAN Files before they erase it" statt „Check it out").
  Caption-Stroke verstärkt (pure-black Outline 5/Shadow 4). Endcard: „▶ SUBSCRIBE / before they erase this".
  **⚠️ ep15–ep36 müssen mit diesen Skripten NEU gerendert werden** (Render braucht `XI`+`PEXELS`).
  ep1–ep14 bleiben (schon public).
- **🆕 2026-06-07 Render-Fortschritt + ElevenLabs-Quota-Wand:**
  - **NEU & gut gerendert (~50–60 s, Gemini-optimiert):** ep15, ep16, ep17, ep18, ep20.
  - **NOCH NEU zu rendern** (clips/ aktuell = valide ALT-Versionen, nicht die neuen Skripte):
    **ep19, ep21, ep22, ep23–ep36** (17 Folgen).
  - **🔴 ElevenLabs-Gratis-Quota (38.808 Zeichen) ERSCHÖPFT** (viel beim ep20-Debugging verbraucht).
    Weiter-Rendern erst nach **Monats-Reset** ODER mit neuem/upgegradetem `XI`-Key.
  - **Renderer ist jetzt ROBUST** (committet): Segment-Decode-Validierung (korrupte Downloads→dunkler
    Füller), `-t total` statt `-shortest`, einheitlich yuv420p (concat+mux), tpad-Pad. → keine
    abgeschnittenen Folgen mehr. Nächste Session: einfach ep19/21/22/23–36 rendern (Quota vorausgesetzt).

## Pipeline-Features (alle in `aban_stock.py`)
- Hook-Text in den ersten ~2.8 s (Retention).
- **Bild-zu-Text-Passung:** pro Satz passender Clip via Stichwort-Map `KW` (Mond→Mond …),
  exakt auf die Satzdauer getimt; Fallback = Episoden-Pool `SCENES`.
- **Kein Clip doppelt** (used-Set über alle Quellen).
- **Footage-Quellen:** Pexels + **Pixabay** + **NASA** (Env `PEXELS`, optional `PIXABAY`;
  NASA kein Key, nur für Weltraum-Queries via `NASA_KW`, public domain).
- **Bild-Fallback:** wenn kein Video passt -> gemeinfreies/CC-**Wikimedia-Commons-Bild** mit
  Ken-Burns-Zoom (z.B. Bundeshaus Bern, Spezial-Motive). KEIN Doku-Footage (Copyright!).
- **ABAN deutsch ausgesprochen:** TTS bekommt „Ahbahn", Untertitel mappen zurück auf „ABAN".
- **Keine verschluckten Enden:** Videolänge = `max(Alignment, echte Audiolänge)+0.6`.
- **SUBSCRIBE-Endcard** (neu): grosse zentrierte cyan Karte „▶ SUBSCRIBE / for the next ABAN file"
  in den letzten ~3.6 s (ASS-Style `SUB`, Fade + Scale-Puls via `\t`); `TAG`-Logo blendet dafür aus.
- **🆕 2026-06-07 Quality-Upgrades (aus abannews `scripts/audio_dress.sh` + `anim_film.py` portiert, alles gratis):**
  - **Broadcast-Voice:** EQ (Wärme 220 Hz + Klarheit 3 kHz) + Kompressor + Platten-Hall statt nur highpass.
  - **Sidechain-Ducking:** Ambient-Musik senkt sich automatisch unter die Stimme → Stimme immer klar.
  - **Stiller Start:** Musik faded über 2.6 s ein (Pattern-Interrupt, Hook ohne Musik).
  - **Cinematic Grade:** kalter Teal-Shadow-Tint (`colorbalance`) zusätzlich zu Vignette + Film-Grain.
- Untertitel unten · Ambient-Musik · Dark-Grade. Länge: **neue ep15–ep36 ~50–58 s** (Gemini-optimiert
  für Sehdauer-Quote/Abos; Hinweis: ElevenLabs spricht ~14 Zeichen/s, also ~700–820 Zeichen ≈ ~50–58 s).

## Automatik
- `aban-youtube.yml` (täglich): postet nächste Folge aus `clips/` (vorgerendert) via
  vorhandene YT-Secrets. Render-in-CI bräuchte `XI`+`PEXELS`-Secrets (NICHT gesetzt → 401),
  daher **Clips lokal vorrendern + committen** (kein Secret nötig).
- `aban-director.yml` (alle 4 h): wertet Views aus, entscheidet (weiter / Gewinner
  ausbauen / nach 1 Woche < 100 Views → Pivot), Log in `reports/ABAN-DIRECTOR.md`.
- `aban-stats.yml` (wöchentl.): View-Report (Scrape, kein Key nötig).

## Neue Folge / neuer Vorrat (Workflow für die nächste Session)
1. `aban_scripts.json`: epN (title/hook/text, Ende „The ABAN Files. Check it out."), ~75–90 s.
2. `SCENES["epN"]` in `aban_stock.py` (12–18 thematische Queries).
3. Lokal rendern: `XI=… PEXELS=… [PIXABAY=…] python3 aban_stock.py epN` → `/tmp/aban_stock_epN.mp4`.
4. Komprimieren → `clips/epN.mp4` committen. Cron postet.

## Offen / Ideen
- NASA als 3. Footage-Quelle (kein Key, echtes Space-Material) — User hatte Interesse.
- View-Daten abwarten (~1 Tag+) → Bestperformer-Thema ausbauen (Director-Report lesen).
- Keys gehören in GitHub-Secrets (kann ich nicht setzen) ODER lokal vorrendern (aktueller Weg).
- Owner soll exponierte Keys rotieren (XI/PEXELS/Pixabay/HeyGen/gok_ standen im Chat).
