# 🎬 Luma — Notiz für späteres Setup

## Projekt-ID (vom User, für spätere Clips)
```
proj_fdb43208db64
```
(Nicht geheim = darf im Repo stehen. Der API-KEY bleibt NUR als GitHub-Secret `LUMA_API_KEY`.)

## Aktueller Stand
- Pipeline ist fertig: `automation/luma-hero-clip.mjs` + `.github/workflows/luma-hero-clip.yml`
  (Bild→Video Ray → Shopify-CDN → `social/video_queue.csv` → Meta-Autopost).
- **Blocker:** Luma-API antwortet `403 Not authenticated`, OBWOHL der Key gesetzt ist.
  → Ursache: **kein aktiver bezahlter API-Plan / kein Guthaben** auf dem Luma-Konto.

## Zum Scharfschalten (User, später)
1. Auf https://lumalabs.ai/dream-machine/api/keys einen **bezahlten API-Plan aktivieren** (Credits/Zahlungsmittel).
2. Key neu kopieren → Secret `LUMA_API_KEY` (Repo `aban-news-landing`) überschreiben.
3. Mir „nochmal" sagen → Test + frische Luma-Clips (auch fürs Marken-Video).

## Falls Luma die Projekt-ID später in der API verlangt
Aktuell nutzt `luma-hero-clip.mjs` nur den Bearer-Key (Generation-Endpoint braucht kein Projekt).
Wenn Luma künftig Projekt-Scope verlangt: ID `proj_fdb43208db64` als Env `LUMA_PROJECT` einbauen.
