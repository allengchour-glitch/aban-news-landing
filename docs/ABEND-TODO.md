# 🌙 Abend-To-do (Stand 2026-06-09)

> Schnell-Checkliste der offenen Fäden. „🟡 Du" = kurze Klicks von dir nötig;
> „🟢 Auto" = läuft von selbst; „🔵 Auf Zuruf" = ich mache die Arbeit, sag Bescheid.

## 🟡 Du (kurze Klicks)
- [ ] **ElevenLabs-Guthaben prüfen** — Dashboard: https://elevenlabs.io/app/subscription
      (genutzt / verbleibend / Reset). Zahl mir nennen → ich rechne „reicht für X Reels".
      **Oder** dem API-Key das Recht **„User → Read"** geben (Profile → API Keys → Key bearbeiten),
      dann „nochmal" sagen → `elevenlabs-check.yml` zieht es automatisch.
      🔒 Key NICHT in den Chat kopieren — nur im ElevenLabs-Dashboard ändern.

## 🟢 Läuft automatisch (nichts zu tun)
- **YouTube-Stats** — täglicher Report 07:00 UTC (`aban-yt-stats.yml`), Trend wird fortgeschrieben.
  Abends „lies den Stats-Report" → ich werte aus. Erster Stand: bestes 250, 4 Folgen ≤1 Aufruf.
- **ElevenLabs-Verbrauch gestoppt** — `daily-tool-reel.yml`- und `aban-youtube.yml`-Cron pausiert;
  Sprach-Videos nur noch manuell (`workflow_dispatch`). reel-render (alle 4h, nur Musik) kostet nichts.

## 🔵 Auf Zuruf (ich mache die Arbeit)
- [ ] **2–3 ABAN-Files-Folgen im Gewinner-Format** skizzieren — echtes Gesicht/warm, Tageslicht,
      greifbares Thema (statt dunkler KI-Sci-Fi-Look, der messbar floppt). → „mach die Skizzen".
- [ ] **Timer nutzen** — z. B. Folge heute Abend gestaffelt posten: Actions → „Timer-Dispatch"
      (`workflow=aban-youtube.yml`, `delay_minutes=…`, `inputs={"count":"1","privacy":"public"}`).

## 🛠️ Heute gebaut/erledigt (Referenz)
- Timer-Tools auf `main`: `delay-dispatch.yml` (jeden Workflow verzögert starten),
  `pr-merge-timer.yml` (PR verzögert mergen) — Doku: `docs/TIMER-TOOLS.md`.
- `elevenlabs-check.yml` + `automation/elevenlabs_check.mjs` (Guthaben-Check; braucht Key-Recht „User Read").
- YT-Stats-Report wird jetzt versioniert (`reports/aban-yt-stats-*.md`).
