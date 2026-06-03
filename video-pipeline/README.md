# Video-Pipeline (`video-pipeline/`)

Macht aus deinem **bestehenden ehrlichen Content** (Hype-Watch-Faktenchecks) fertige
**Faceless-Kurzvideo-Pakete** (9:16, für YouTube Shorts / Instagram Reels / TikTok).
Reines Python-stdlib + Pillow (schon Projekt-Abhängigkeit), Aban-Voice (anti-hype, du-Form).

## Ehrlich über das Geld

Pure „autonome Video-Werbeeinnahmen" (faceless YouTube) sind überwiegend überhyped —
der Markt ist überlaufen, und YouTube/TikTok stufen massenproduzierte KI-Clips seit 2025
aktiv runter. Diese Pipeline verfolgt darum den **realistischen** Weg: Video als
**Traffic-Kanal** für die Produkte, die schon stehen. Geld kommt **indirekt** über den
Funnel (Newsletter → Affiliate-Radars → POD-Shop → Service) — kein Reichtums-Versprechen.

## Bauen

```bash
cd video-pipeline
python3 generate_clips.py                 # alle Hype-Watch-Fälle -> ausgabe/
python3 generate_clips.py <fall-id>       # nur einen Fall
python3 generate_clips.py --voice         # zusätzlich TTS (braucht ELEVENLABS_API_KEY)
```

`ausgabe/` ist git-ignored. Pro Fall entsteht ein Ordner mit:

- `slide_01..04.png` — markengetreue Vertikal-Frames (Hook → Hype → Realität → CTA)
- `skript.txt` — Voiceover-Skript (Hook, Punkte, CTA), ~30–45 s
- `untertitel.srt` — getimte Untertitel (aus dem Skript geschätzt)
- `post.txt` — Social-Caption mit Link auf die Hype-Watch-Seite
- `voiceover.mp3` — nur mit `--voice` + `ELEVENLABS_API_KEY`

## Vom Paket zum Video

1. **Ohne Konto:** Slides + `untertitel.srt` in CapCut/DaVinci Resolve ziehen, `skript.txt`
   selbst einsprechen oder TTS, exportieren. 5 Minuten pro Clip.
2. **Mit Key:** `--voice` erzeugt die Vertonung (ElevenLabs, `eleven_multilingual_v2`).
   `ELEVENLABS_VOICE_ID` setzt die Stimme. HeyGen-Avatar-Rendering ist bewusst NICHT
   automatisiert (kostet pro Clip; lohnt erst, wenn ein Format läuft).
3. **Verteilen:** Caption über den bestehenden Multi-Kanal-Publisher:
   ```bash
   python3 ../social/post.py --add "$(cat ausgabe/<id>/post.txt)" --link https://abannews.com/hype-watch/<id>.html
   python3 ../social/post.py --all      # an Telegram/Discord/Mastodon/Webhook
   ```

## Der aban-news-Werbespot (`generate_promo.py`)

Eigenes Skript für den **Promo-Spot** (Top-of-Funnel, neue Abonnenten). Setzt
`docs/WERBEVIDEO-SKRIPT.md` + den Regie/Psychologie-Schnitt in fertige Bausteine um:

```bash
python3 generate_promo.py            # Variante A (40 s) + B (15 s)
python3 generate_promo.py --voice    # zusätzlich ElevenLabs-VO
```

Pro Variante in `ausgabe/werbespot/<variante>/`:
- `storyboard_NN.png` — 9:16-Frames je Szene (On-Screen-Text groß, VO-Notiz unten — im Export ausblenden)
- `voiceover.txt` — reiner VO-Text zum Einfügen bei ElevenLabs
- `untertitel.srt` — getimte Untertitel
- `regie.txt` — Szene/Zeit/Bildanweisung für den HeyGen-Aufbau

Produktion: `voiceover.txt` → ElevenLabs (Multilingual, ruhige deutsche Stimme),
Audio + `untertitel.srt` → HeyGen (Avatar + Lippensync), 9:16 exportieren. Details:
`docs/WERBEVIDEO-SKRIPT.md` und `docs/WERBEVIDEO-REGIE-PSYCHOLOGIE.md`.

## Selbst-wachsend

Jeder neue Hype-Watch-Fall (`data/hype-watch.json` + `generate_hype_watch.py`) wird beim
nächsten Lauf automatisch zu einem Clip-Paket. Quelle bleibt der geprüfte Content —
**nie erfundene Behauptungen, nur belegte Faktenchecks werden vertont.**

## Sicherheit / DSGVO

Keine Secrets im Repo. API-Keys (ElevenLabs) nur als Umgebungsvariable. Keine
3rd-Party-Requests ohne gesetzten Key.
