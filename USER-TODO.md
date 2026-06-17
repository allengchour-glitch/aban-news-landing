# ✅ aban — offene To-dos (nur DU, brauchen PC/Cloudflare)

Alles Code-seitige ist fertig & auf `main`. Diese Schritte schalten es scharf.

## 1) Auto-Deploy einrichten (einmalig → danach NIE wieder tippen) ⭐
Im Repo-Root in **PowerShell**:
```powershell
cd C:\Users\allen\aban-news-landing\automation\local\aban-news-landing
.\deploy.bat
schtasks /create /tn "aban-auto-deploy" /tr "%CD%\deploy-auto.bat" /sc minute /mo 15 /f
```
→ Danach deployt Windows alle 15 Min automatisch (Seite + Worker). Jede Änderung geht von selbst live.
(Stoppen falls nötig: `schtasks /delete /tn "aban-auto-deploy" /f`)

## 2) Echte Inserate freischalten (optional, wenn gewünscht)
```powershell
.\setup-inserate.bat
```
→ D1-Datenbank + Admin-Token. Danach 1 Dashboard-Klick (D1-Binding `DB`). inserate-brain meldet den ersten Eintrag.

## Schon erledigt ✅
- eBay-Keys (Provision live) · LuxeStyle-Shop · Telegram-Bot · KV-Namespaces · Worker deployt.
- Cert ID bleibt (nicht rotieren — wie gewünscht).

Stand: 2026-06-16. Details: MARKTPLATZ-STATUS.md
