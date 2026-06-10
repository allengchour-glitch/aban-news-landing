# ☁️ Browserbase-Setup — KLICK-ONLY (kein Terminal nötig)

Damit ICH (die Code-Session) selbst im eingeloggten Browser klicke (IG/TikTok-Posts löschen/prüfen).
Alles läuft über **GitHub-Klicks + 1× Login im Browser** — du tippst **keine** Befehle.

Treiber: `tools/browser/agent_cloud.mjs` · Workflow: **„Browser-Agent (Browserbase)"**.

## Du machst nur das (einmalig)

### 1) Browserbase-Account + 2 Schlüssel (Browser-Klicks)
- Auf **browserbase.com** registrieren (Gratis-Kontingent reicht).
- Dashboard → **API Key** und **Project ID** kopieren.
- In GitHub: Repo → **Settings → Secrets and variables → Actions → New repository secret**:
  - `BROWSERBASE_API_KEY`
  - `BROWSERBASE_PROJECT_ID`

### 2) Context anlegen (ich starte das, du kopierst 1 Wert)
- Sag mir „Secrets sind drin" → ich dispatche **action=`context-create`**.
- Im Lauf-Log steht `BROWSERBASE_CONTEXT_ID=ctx_…`. **Diesen Wert** als drittes Secret anlegen:
  - `BROWSERBASE_CONTEXT_ID`

### 3) Einmal einloggen (nur Browser, deine Hand + 2FA)
- Ich dispatche **action=`login-start`**, `arg=`https://www.instagram.com/accounts/login/`.
- Im Lauf-Log steht eine **`LIVE_URL=…`** + eine `SESSION_ID=…`.
- **LIVE_URL** im Browser öffnen → du siehst den Cloud-Browser → **bei Instagram einloggen** (inkl. 2FA).
- Sag mir „eingeloggt" → ich dispatche **`login-release`** (`arg=`die SESSION_ID) → der Context **merkt sich** die Anmeldung.
- Für TikTok dasselbe mit `arg=`https://www.tiktok.com/login`.

**Fertig.** Ab jetzt klicke ich.

## Danach übernehme ich (du musst nichts tun)
Ich dispatche Aktionen, die before/after-**Screenshots als Artefakt** hochladen:
- `check` + Profil-URL → Login-Beweis
- `ig-delete` + Post-URL + `confirm=true` → löscht den IG-Post
- `tiktok-delete` + Video-URL + `confirm=true` → löscht das TikTok-Video

## Ehrlich zu den Risiken
- Cloud-IPs lösen bei IG/TikTok strengeren Bot-Schutz aus. Für **Einzel-Aktionen** meist ok;
  **kein Massen-Takt** → sonst Konto-Risiko. Bei Checkpoint/Captcha weichen wir auf den **lokalen**
  Agent `agent.py` aus (läuft auf deinem Rechner, unauffälliger).
- Button-Selektoren ändern sich mal → bei `*-fail.png` melde ich mich und passe sie an.

## (Optional) Lokal statt Cloud
Wenn du es doch lokal willst: Repo klonen, dann in **PowerShell** Befehle **einzeln** ausführen
(kein `&&`!) — siehe `BROWSER-AGENT-SETUP.md`. Für die meisten ist der Klick-Weg oben einfacher.
