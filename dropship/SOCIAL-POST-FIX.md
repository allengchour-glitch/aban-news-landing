# 🚨 Social-Auto-Post reparieren (Token erneuern) — Reichweiten-Blocker Nr. 1

> Befund 2026-07-03 (Worker-Health): **40 Post-Versuche, 0 erfolgreich, alle Kanäle (IG/FB/TikTok) = 0.**
> Ursache: die Tokens im Cloudflare-Worker `luxe-poster` sind abgelaufen. Solange sie tot sind, erreicht **kein Post** jemanden.
> Die Pipeline & Queue sind korrekt (deine 12 neuen Clips sind drin) — es fehlt NUR das frische Token.

Der Worker liest diese Secrets: `META_ACCESS_TOKEN` (IG+FB), `TT_CLIENT_KEY`/`TT_CLIENT_SECRET`/`TT_REFRESH_TOKEN` (TikTok).

---

## TEIL 1 — META (Instagram + Facebook) — DAS WICHTIGE, ~10 Min

Der Worker findet die Seite + das IG-Konto selbst aus `META_ACCESS_TOKEN` — du brauchst nur EIN frisches, langlebiges Token.

### A) Neues Token holen
1. Öffne **developers.facebook.com/tools/explorer** (Graph API Explorer), oben rechts deine **App** wählen (die, die mit der LuxeStyle-FB-Seite verknüpft ist).
2. Bei „Permissions" diese hinzufügen:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`
3. **„Generate Access Token"** → mit der FB-Seite/IG erlauben. Du bekommst ein **kurzlebiges** User-Token.
4. Kurzlebig → **langlebig** tauschen (60 Tage). Diese URL im Browser aufrufen (Platzhalter ersetzen):
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=DEINE_APP_ID&client_secret=DEIN_APP_SECRET&fb_exchange_token=DAS_KURZLEBIGE_TOKEN
   ```
   Antwort enthält `access_token` = **dein neues langlebiges Token**. (App-ID/Secret stehen in den App-Einstellungen → Basic.)

### B) Token im Worker setzen
- **Cloudflare-Dashboard:** Workers & Pages → **luxe-poster** → **Settings** → **Variables and Secrets** → bei **`META_ACCESS_TOKEN`** „Edit" → neues Token einfügen → **Save**. (Ggf. „Deploy".)
- ODER per CLI: `wrangler secret put META_ACCESS_TOKEN` → Token einfügen.

### C) Prüfen
- Rufe im Browser auf (Key wie im Worker): `https://luxe-poster.allengchour.workers.dev/?key=DEIN_TRIGGER_KEY&health=1`
- Nach dem nächsten Post-Slot (19:00 CH) sollte `posts_ok` steigen und `ig`/`fb` auf `1` gehen.

---

## TEIL 2 — TikTok (zweitrangig)

TikTok-Posts landen ohnehin nur als **Entwurf im Inbox** (du musst in der App final posten) — deshalb reichen fürs Erste deine **stummen Clips + App-Upload**. Wenn du den Worker-TikTok trotzdem willst:
- Die TikTok-App neu autorisieren (OAuth) → neuen `refresh_token` holen → als Secret **`TT_REFRESH_TOKEN`** im Worker setzen (dazu `TT_CLIENT_KEY`/`TT_CLIENT_SECRET` prüfen, dass sie zur App passen).

---

## Nach dem Fix
- Der Worker hängt aktuell am alten Post (Cursor 25/34). Sobald das Meta-Token frisch ist und der erste Post durchgeht, läuft er weiter durch die Queue — inkl. deiner 12 neuen Clips.
- Falls er nach dem Fix immer noch am selben Item klebt, sag mir Bescheid — dann setze ich den Cursor per Worker-Befehl neu (`&cursor=N`), damit er bei frischem Content weitermacht.

**Kurz:** Nur `META_ACCESS_TOKEN` erneuern = IG + FB gehen sofort wieder live. Das ist der grösste Reichweiten-Hebel, den du gerade hast.
