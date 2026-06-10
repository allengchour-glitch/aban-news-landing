# ☁️ Browserbase-Setup — damit CLAUDE selbst im Browser klickt

Mit Browserbase läuft der eingeloggte Browser in der Cloud → ich (die Code-Session)
steuere ihn fern und kann **IG/TikTok-Posts löschen/prüfen**, was die offiziellen APIs nicht können.
Treiber: `tools/browser/agent_cloud.mjs` · CI-Trigger: `.github/workflows/browser-action.yml`.

## Was du EINMAL machst (3 Schritte)

### 1) Account + Keys
- Auf **browserbase.com** registrieren (Gratis-Kontingent reicht zum Start).
- Im Dashboard: **API Key** + **Project ID** kopieren.
- In GitHub → Repo **Settings → Secrets and variables → Actions** als Secrets anlegen:
  - `BROWSERBASE_API_KEY`
  - `BROWSERBASE_PROJECT_ID`

### 2) Eingeloggten Context erzeugen
Lokal (Node 18+), einmalig:
```bash
cd tools/browser && npm i playwright-core
export BROWSERBASE_API_KEY=...   BROWSERBASE_PROJECT_ID=...
node agent_cloud.mjs context-create        # → druckt BROWSERBASE_CONTEXT_ID=ctx_...
```
Die ausgegebene **`BROWSERBASE_CONTEXT_ID`** auch als **GitHub-Secret** setzen.

### 3) Einmal einloggen (deine Hand + 2FA)
```bash
export BROWSERBASE_CONTEXT_ID=ctx_...
node agent_cloud.mjs login https://www.instagram.com/accounts/login/
# → druckt eine LIVE-URL. Im Browser öffnen, dort bei Instagram einloggen, dann ENTER.
node agent_cloud.mjs login https://www.tiktok.com/login   # dasselbe für TikTok
```
Der Context behält die Anmeldung. **Fertig** — ab jetzt klicke ich.

## Danach: ich übernehme
Ich starte Aktionen über den Workflow **Browser-Agent (Browserbase)** (Dispatch):
- `action=check` + `url=<profil>` → Login-Beweis-Screenshot (Artefakt)
- `action=ig-delete` + `url=<post>` + `confirm=true` → löscht den IG-Post
- `action=tiktok-delete` + `url=<video>` + `confirm=true` → löscht das TikTok-Video

Jeder Lauf lädt **before/after-Screenshots als Artefakt** hoch → wir sehen, dass es geklappt hat.

## Ehrlich zu den Risiken
- Cloud-IPs lösen bei IG/TikTok **strengeren Bot-Schutz** aus als dein Heim-Rechner.
  Für **Einzel-Aktionen** (1 Post löschen) i. d. R. ok; **kein Massen-/Sekundentakt** → sonst Konto-Risiko.
- Wenn IG/TikTok das Login in der Cloud blockt (Checkpoint/Captcha), nutzen wir den **lokalen** Agent
  `agent.py` (gleiche Befehle, läuft auf deinem Rechner) — der ist unauffälliger.
- Button-Selektoren ändern sich gelegentlich → bei `*-fail.png` melde ich mich, dann passe ich sie an.

## Was ich brauche, um loszulegen
Nur dass die **3 Secrets gesetzt** sind und der **Context einmal eingeloggt** ist (Schritte 1–3).
Sag mir „Context ist eingeloggt", dann mache ich einen `check`-Testlauf und danach das erste Löschen.
