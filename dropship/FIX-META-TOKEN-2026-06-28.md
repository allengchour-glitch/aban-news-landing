# 🚨 FIX: Organische Maschine tot — Meta-Token fehlen Berechtigungen (2026-06-28)

## Befund (live geprüft, Worker-Health)
Die Cloudflare-Worker-Posting-Maschine (IG+FB) **scheitert seit ~27.6. bei JEDEM Post** — Cursor hängt bei #25, postet immer dasselbe, schlägt fehl. Echte Fehler vom Worker:
- **Instagram:** `(#10) Application does not have permission for this action`
- **Facebook:** `(#200) … lack of pages_manage_posts permission`
- **TikTok:** „keine TikTok-Creds" (Worker postet kein TikTok — das läuft über den PC)

→ **0 organischer Traffic seit Tagen** = der einzige lebende Verkaufsweg ist tot (zusätzlich zur fehlenden Ad).

## Ursache
Der `META_ACCESS_TOKEN` im Worker hat **NICHT die nötigen Berechtigungen** (oder wurde widerrufen/falsch generiert). Für IG/FB-Auto-Posting braucht der Token diese Scopes:
- `pages_manage_posts` (FB-Page posten) ← **fehlt!**
- `pages_read_engagement`, `pages_show_list`
- `instagram_basic`, `instagram_content_publish` (IG posten) ← **fehlt!**
- `business_management`

## FIX (nur User — Meta-Login + Berechtigung erteilen)
1. **developers.facebook.com → Graph API Explorer** (oder Business-Einstellungen → System-User-Token).
2. App wählen, **Get Token → Page Access Token** für die **LuxeStyle-FB-Seite**.
3. Bei „Permissions" oben **alle 6 Scopes** anhaken: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `business_management`.
4. **Long-Lived Token** machen (sonst läuft er in ~1 h ab): Graph-API `oauth/access_token?grant_type=fb_exchange_token&...` ODER System-User-Token (läuft nie ab — empfohlen).
5. Den neuen Token in den **Worker-Secret** setzen: `cd automation/cloudflare/luxe-poster && npx wrangler secret put META_ACCESS_TOKEN` → Token einfügen.
6. (Optional Redeploy: `npx wrangler deploy` oder `DEPLOY-WORKER.bat`.)
7. **Verifizieren:** `https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B` → `ig.ok` / `fb.ok` sollten jetzt `true` sein.

## Wichtig
- **IG muss ein Business/Creator-Konto** sein, verknüpft mit der FB-Seite (sonst geht IG-Publish nicht).
- System-User-Token (Business-Einstellungen) = läuft nicht ab → bestes Setup, kein erneutes Token-Drama in 60 Tagen.
- Sobald der Token passt: Cursor läuft weiter, 40er-Queue (Doppelpost-gefixt, Share/Save-CTA) postet 2×/Tag → Traffic auf den conversion-optimierten Funnel → erste Verkäufe möglich OHNE bezahlte Ad.

## Was die Cloud-Session (ich) NICHT kann
Meta-Berechtigungen erteilen = Meta-Login + dein Klick. Token in Worker-Secret = Cloudflare-Zugriff. Beides nur du.
