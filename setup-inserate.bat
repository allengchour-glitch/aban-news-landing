@echo off
REM ========================================================================
REM  aban — Echte Inserate freischalten (Cloudflare D1 + Admin-Token)
REM  Macht den CLI-Teil. Danach 1x Dashboard: D1-Binding "DB" setzen.
REM  Voraussetzung: "npx wrangler@3 login" bereits gemacht.
REM ========================================================================
cd /d "%~dp0"

echo.
echo [1/3] Erstelle D1-Datenbank "inserate" ...
echo      (Wenn sie schon existiert, erscheint ein Hinweis - das ist ok.)
call npx wrangler@3 d1 create inserate

echo.
echo [2/3] Spiele die Tabelle ein (Schema) ...
call npx wrangler@3 d1 execute inserate --remote --file=db/inserate-schema.sql

echo.
echo [3/3] Setze Admin-Token (fuer die Freigabe). Gib jetzt ein langes Passwort ein:
call npx wrangler@3 pages secret put ADMIN_TOKEN --project-name=abannews

echo.
echo ============================================================
echo  CLI-TEIL FERTIG. NUR NOCH 1 KLICK IM DASHBOARD:
echo  dash.cloudflare.com  -^>  Workers ^& Pages  -^>  abannews
echo    -^>  Settings  -^>  Functions  -^>  D1 database bindings  -^>  Add
echo        Variable name:  DB
echo        D1 database:    inserate
echo  Danach: deploy.bat doppelklicken (neu deployen).
echo  Test:   https://abannews.com/api/inserate-list  (kein {"demo":true} mehr)
echo ============================================================
pause
