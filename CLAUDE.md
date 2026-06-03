# CLAUDE.md — Projekt-Memory

## Repo
`aban-news-landing` — Landingpage + Automatisierungen für die ABAN-News-Marke.
Aktiver Feature-Branch: `claude/lifestyle-video-project-fYsEO` (Draft-PR #230).

## ABAN Files — automatisierte YouTube-Shorts
Sci-Fi/Reptiloid-Serie (faceless). Pipeline unter `video-prototypes/aban-files/`.

- **Render (gratis, in Nutzung):** `aban_stock.py` — Pexels-Footage (12 Shots/Folge)
  + ElevenLabs-Stimme + Karaoke-Untertitel (ASS/libass) + Dark-Grade + Drone.
- Backup: `aban_render.py` (prozedural faceless), `heygen_make.sh` (HeyGen Avatar IV,
  braucht api-Credits — Konto war leer).
- Skripte: `aban_scripts.json` (ep1–ep3). Abschluss-Satz: **„The ABAN Files. Check it out."**
- Auto-Publish: `aban_publish.py` + Workflow `.github/workflows/aban-youtube.yml`
  (rendert nächste Folge in CI → lädt als Short hoch → Fortschritt in `uploaded.json`).

## Wichtige Fakten / Vorgaben
- **Echten Namen NICHT nennen** (Owner = „alleng"/@allengchour). Marke = „ABAN Files".
  „KING ALLENG" wurde überall entfernt.
- **YouTube-Kanal:** Haupt-Kanal des Kontos `@allengchour`, umbenannt zu **„ABAN Files"**.
- **OAuth ist eingerichtet** (Bunny-Pipeline): Repo-Secrets `YT_CLIENT_ID`,
  `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` existieren und gelten für genau diesen Kanal
  → ABAN-Automatik nutzt dieselben Secrets (kein neues Token nötig).
- **Render-Secrets fürs CI noch hinzuzufügen:** `XI` (ElevenLabs), `PEXELS`.

## Secrets/Keys
NIE im Repo. Alle Keys (XI, PEXELS, HG, YT_*) nur als Env-Variablen / GitHub-Secrets.

## Bestehende Pipeline (Bunnys)
`video-prototypes/` + Workflow `youtube.yml` (1 Clip / 2 Tage). ABAN läuft analog,
eigener Workflow, an geraden Tagen.
