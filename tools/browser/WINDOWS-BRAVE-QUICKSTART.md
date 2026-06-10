# 🪟 Windows + Brave — Posts löschen (Schritt für Schritt)

Läuft auf deinem PC über deine Heim-IP → Instagram/TikTok blockt nicht.
**Wichtig:** In PowerShell jede Zeile **einzeln** ausführen (Enter nach jeder) — **kein `&&`**.

## 1) Einmalig installieren
- **Brave** (falls nicht da): https://brave.com → installieren.
- **Python**: https://python.org/downloads → Installer starten →
  ☑️ **„Add python.exe to PATH"** ankreuzen → „Install Now".

## 2) agent.py herunterladen
Im Browser (bei GitHub eingeloggt) öffnen:
`https://github.com/allengchour-glitch/aban-news-landing/blob/main/tools/browser/agent.py`
→ rechts oben das **Download-Symbol „Download raw file"** klicken →
speichern in **Downloads** (`C:\Users\allen\Downloads`).

## 3) PowerShell öffnen, Zeile für Zeile:
```
cd $HOME\Downloads
pip install playwright
python -m playwright install chromium
```

## 4) Einmal bei Instagram einloggen
```
python agent.py login instagram https://www.instagram.com/accounts/login/
```
→ Ein Browser öffnet sich → **bei Instagram einloggen** (inkl. 2FA) →
zurück in PowerShell **Enter** drücken. (Die Anmeldung wird gespeichert.)

## 5) Prüfen + löschen
```
python agent.py check instagram https://www.instagram.com/luxestyle.ch/ --out check.png
```
→ `check.png` im Downloads-Ordner öffnen — siehst du dein Profil eingeloggt? Dann:
```
python agent.py ig-delete <POST-URL> --confirm
```
`<POST-URL>` = die Adresse des Posts (in der IG-App/Web: Post öffnen → Link kopieren),
z. B. `https://www.instagram.com/p/Cxxxxxx/`. Es entstehen `ig-before.png`/`ig-after.png` zur Kontrolle.

## TikTok (gleich danach, optional)
```
python agent.py login tiktok https://www.tiktok.com/login
python agent.py tiktok-delete <VIDEO-URL> --confirm
```

## Wenn etwas klemmt
- „python wird nicht erkannt" → Python neu installieren mit **Add to PATH**, PowerShell neu öffnen.
- Ein `*-fail.png` entsteht → der Button hat sich geändert; schick mir das Bild, ich passe die Selektoren an.
- Du willst lieber, dass **ich** alles klicke → dann Browserbase-Paid-Plan (siehe `BROWSERBASE-SETUP.md`).
