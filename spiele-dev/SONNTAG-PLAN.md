# 🗓️ Sonntag-Plan (nach Usage-Reset So 21:59)

> **Warum:** Claude-Wochenlimit fast voll (Alle Modelle ~96 %, **Fable 100 %**) → diese Woche nur
> planen, Ausführung nach dem Reset **Sonntag 21:59**. Diese Datei = Startpunkt der Sonntag-Session.

## Sofort abarbeiten (Reihenfolge)

1. **Welt-Realismus-Schwarm auswerten & umsetzen.**
   - Lief am 24.7. im Hintergrund (Workflow `wildnis-world-swarm`, run `wf_cf3c63c5-434`).
   - Ergebnis liegt in der Task-Output-/journal.jsonl des Runs; falls nicht mehr auffindbar, **Schwarm
     neu starten** (Script: `workflows/scripts/wildnis-world-swarm-*.js`) — aber **kleiner dimensionieren**
     (s. Usage-Lehre unten).
   - Bestätigte P1/P2 zuerst umsetzen → smoke → committen → PR → merge → deploy.

2. **HeyGen-Promo-Produktion anstoßen (nicht von der Cloud-Session — via PC-Claude).**
   - Alles fertig in `reels/heygen-skripte.md` (11 Skripte + 4-Wochen-Ausrollplan + PC-Claude-Batch-Auftrag).
   - **Woche 1** starten: #1 Wildnis, #11 Hub, #2 Traumhaus 🤝 → rendern (Web-Studio, Abo-Credits) → posten.
   - Grund für PC-Claude: API-Key hat kein Guthaben; Abo-Credits nur über Web-Login (Cloud-Session kann das nicht).

3. **Offener Spiele-Backlog.**
   - Wildnis K2/K3 Koop-Determinismus-PR (Harness zuerst) — Task #24.
   - Ggf. weitere gezielte Schwarm-Runde (Gameplay/Koop) — sparsam.

## Ressourcen (Keys NICHT hier speichern!)
- **Kimi-Account** (platform.kimi.ai / api.moonshot.ai), ~**$25** Guthaben, **OpenAI-kompatible API**.
  Nutzbar als günstige LLM für **Bulk-Text/Übersetzungen/Massen-Content**, um Claude-Budget zu schonen.
  **API-Key stellt der User am Sonntag bereit** (bewusst nicht im öffentlichen Repo abgelegt).
  Endpoint-Form: `POST https://api.moonshot.ai/v1/chat/completions`, Header `Authorization: Bearer <key>`,
  Modelle z. B. `kimi-k2`/`moonshot-v1-*`. Vor Nutzung Key-Gültigkeit + Modellnamen kurz per GET prüfen.

## Usage-Lehre (wichtig, damit das Limit reicht)
- **Fable-5 treibt das Wochen-Limit** — die großen Agenten-Schwärme (Find→Verify→Synth) nutzen Fable-Phasen
  und haben das Fable-Kontingent auf 100 % gebracht.
- **Konsequenz für Sonntag:** Schwärme **kleiner** fahren (weniger Finder/Verifizierer, z. B. 6–8 Dimensionen
  statt 14, 1–2 Verifizierer statt 3) ODER kritische Bulk-Arbeit auf **Kimi** auslagern. Nicht mehrere
  100-Agenten-Läufe hintereinander.

## Stand beim Anlegen (24.7.)
Diese Woche live gegangen (alles gemergt/deployt): Picker-Animationen, PBR-Helden „wie echt", echte Haut,
matte Stoffe/Haar, Env-/Picker-Leak-Fixes, Flug-Leak-Fix; HeyGen-Monatspaket dokumentiert. Branch
`claude/projekt-abannews-laden-ocLnc` == `main`.
