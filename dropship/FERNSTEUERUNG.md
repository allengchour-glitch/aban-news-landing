# 🎛️ FERNSTEUERUNG — Befehle geben ohne am PC zu sein (User 2026-06-19)

## Wie es funktioniert (kein Dauer-Listener, kein Git-Lock)
1. **Cloud pusht** einen Befehl in die Worker-Queue: `…workers.dev/?key=Abanaban192%2B&cmd=X`
2. **PC-Task `LuxeCmd`** (`cmd-poll.ps1`, alle 5 Min) holt die Queue ab (`&drain=1`) + führt aus.
3. Leichtgewichtig: KEIN git, KEINE Analyse → kein Lock, kein Absturz.

## Befehle (`&cmd=`)
`tiktok` · `post` · `engage` · `follower` · `analyse` · `tutti` · `anibis` · `campaign-dry` · `campaign-go`

## Wie DU/ICH kommandieren
- **Chat:** sag mir „post tiktok" / „mach campaign" → ich pushe den Befehl.
- **Handy:** Link antippen `…/?key=Abanaban192%2B&cmd=tiktok`.

## Voraussetzung
- **PC an + in Windows eingeloggt** (sonst empfängt nichts). Für nach-Reboot: Windows-Auto-Login (`SETUP-NOCLICK.bat`).
- Brave `brave-agent` bei tiktok.com (+ ads.tiktok.com für campaign) eingeloggt.

## Einrichtung (1×, ist gemacht 2026-06-19)
`git checkout origin/<branch> -- automation/local/cmd-poll.ps1` + `schtasks /create /tn LuxeCmd /sc minute /mo 5 /tr "...cmd-poll.ps1"`.

## Grenze (ehrlich)
Befehle FEUERN = einseitig, klappt. Ergebnisse zurück (z.B. campaign-Screenshots) brauchen funktionierendes PC-git
(oft diverged/gesperrt). Effekt sonst extern verifizieren: TikTok-Profil, Ads-Manager, Shop. Sauberer PC-git-Stand = 1× Reboot + `git reset --hard`.
