# TikTok-Autoposter auf dem PC — STANDALONE-Einrichtung (einmalig, ~5 Minuten)

**Stand 31.08.2026:** Das Repo ist privat — raw.githubusercontent-Links geben 404, und die
Content-Posting-API wurde von TikTok abgelehnt («not approved for personal or company
internal use»). Der PC-Poster ist damit der EINZIGE automatische Weg, und er braucht ab
jetzt **kein Git mehr**: alles kommt vom Shopify-CDN.

## Einrichtung: EIN Einfüge-Befehl (PowerShell)

```powershell
iwr https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-tt-setup.ps1 -OutFile "$env:TEMP\lx-tt.ps1"; powershell -ExecutionPolicy Bypass -File "$env:TEMP\lx-tt.ps1"
```

Das Setup legt `%USERPROFILE%\LuxeStyleTT` an, lädt Poster-Skript, Marken-Musik und Queue
vom CDN, installiert bei Bedarf Node + ffmpeg (winget) + playwright-core, richtet den
Bot-Browser (eigenes Profil `LuxeStyleBot`, Port 9222) und zwei geplante Aufgaben ein
(**17:28 Browser**, **17:31 Post**) — und öffnet den Bot-Browser für die **einmalige
Anmeldung als @luxestyle.ch**. Das ist der einzige Handgriff.

## Was der tägliche Lauf tut

1. Holt die frische Queue von
   `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/tiktok_queue.json`
   (die Cloud aktualisiert sie bei jedem `tiktok_cowork_auftrag.py`-Lauf per `fileUpdate`
   — dieselbe URL, immer der geprüfte Stand: Preise/ACTIVE gegengeprüft).
2. Nimmt den ersten freien, noch nicht geposteten Beitrag MIT Video.
3. Legt `luxe-premium.wav` unters stumme Video (ffmpeg, Video-Strom unangetastet).
4. Lädt über tiktok.com/tiktokstudio/upload hoch, ersetzt die Dateinamen-Caption durch
   die geprüfte Caption, klickt Posten, macht 3 Beweis-Screenshots nach `beweise\`.
5. Ledger `tiktok_done.txt`: **höchstens 1 Post pro Kalendertag**, nie derselbe Slug zweimal.

## Bremsen & Bedienung

- **Stoppen:** Datei `STOPP.txt` im Ordner `%USERPROFILE%\LuxeStyleTT` anlegen.
- **Probelauf ohne Posten:** `cmd /c "set DRY=1&& %USERPROFILE%\LuxeStyleTT\run-post.cmd"`
  → Screenshots in `beweise\`, kein Klick auf Posten.
- **Gezielt einen Beitrag:** `set ONLY=<slug>` vor dem Lauf.
- Log: `%USERPROFILE%\LuxeStyleTT\log.txt`.

## Alte Repo-Variante

`automation/local/tiktok-upload-auto.mjs` + `setup-tiktok-auto.ps1` (brauchten geklontes
Repo + git pull) sind durch die Standalone-Fassung `automation/local/luxestyle-tt-post.mjs`
+ `luxestyle-tt-setup.ps1` ersetzt; die CDN-Kopien werden aus diesen Repo-Dateien gepflegt
(`automation/upload_to_shopify_cdn.mjs`, bei Änderungen neu hochladen — Achtung:
`fileCreate` legt bei gleichem Namen `…_1` an; für ein Update dieselbe GenericFile-ID per
`fileUpdate` befüllen, wie es `tiktok_cowork_auftrag.py` für die Queue vormacht).
