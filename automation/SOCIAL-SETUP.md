# Tägliches Social-Posting — Setup & Spielregeln

Automatisiertes Posten **einer** Ausgabe pro Tag auf **deine eigenen** Kanäle —
nur dort, wo es per offizieller API und Plattform-AGB erlaubt ist.

## Grundsätze (bewusst eng gehalten)

- **Nur offizielle APIs**, nur **deine eigenen** Accounts/Kanäle.
- **Mehrmals/Tag, aber mit pro-Plattform-Tageslimit** (moderate Frequenz, je 1 Post pro Lauf):

  | Plattform | Posts/Tag |
  |-----------|-----------|
  | X / Twitter | 3 |
  | Mastodon | 2 |
  | Bluesky | 2 |
  | Telegram | 2 |
  | LinkedIn | 1 (mehr schadet der Reichweite) |

  Der Cron läuft **3×/Tag** (06:10 / 12:10 / 18:10 UTC); jede Plattform postet pro Lauf
  max. 1 — **eine andere** Ausgabe — bis ihr Tageslimit erreicht ist. Limits in
  `automation/post_daily.py` (`CAPS`) anpassbar.
- **Ohne Secrets passiert nichts** (No-Op). Es wird nie ohne deine Konfiguration gepostet.
- **Kein Tracking, kein Scraping, keine Massen-Aktionen** (keine Auto-Follows/DMs).
- **Evergreen-Rotation:** Es wird die neueste noch nicht gepostete Ausgabe gewählt;
  sind alle durch, wird die am längsten nicht gepostete recycelt. So bleibt der Kanal
  täglich aktiv, ohne zu spammen.

## Plattformen

| Plattform | Erlaubt? | Hinweis |
|-----------|----------|---------|
| **Mastodon** | ✅ | API mit Access-Token, klar erlaubt für eigene Posts. |
| **Bluesky** | ✅ | AT-Protocol, App-Passwort. Link wird klickbar (Facet). |
| **Telegram** | ✅ | Bot postet in **deinen** Kanal. Bot als Admin hinzufügen. |
| **LinkedIn** | ⚠️ | Eigenes Profil/Seite, App + OAuth + Freigabe (`w_member_social`). |
| **X / Twitter** | ✅ | **Free-Tier reicht zum Posten** (~1.500 Posts/Monat Schreib-Limit; 3/Tag ≈ 90/Monat). Du brauchst nur einen Developer-Account + App + OAuth2-*User*-Token mit `tweet.write`. Kostenpflichtig wird erst das *Lesen* / hohe Volumen. |
| ~~Reddit~~ | ❌ | **Bewusst NICHT.** Tägliche Selbstwerbung verstößt gegen die meisten Subreddit-/Anti-Spam-Regeln. |
| ~~Instagram/FB-Gruppen~~ | ❌ | Kein zuverlässiger, regelkonformer Auto-Post-Weg für tägliche Eigenwerbung. |

Jede Plattform wird **nur** versucht, wenn ihre Secrets gesetzt sind. Du kannst also
mit Mastodon/Bluesky/Telegram starten und LinkedIn/X später ergänzen.

## GitHub Secrets setzen

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Setze nur die Plattformen, die du nutzen willst:

```
MASTODON_BASE_URL      z.B. https://mastodon.social
MASTODON_TOKEN         (Einstellungen → Entwicklung → neue Anwendung → Token, Scope write:statuses)

BLUESKY_HANDLE         dein.handle.bsky.social
BLUESKY_APP_PASSWORD   (Settings → App Passwords → neues App-Passwort)

TELEGRAM_BOT_TOKEN     (von @BotFather)
TELEGRAM_CHAT_ID       z.B. @meinkanal  (Bot vorher als Admin in den Kanal)

LINKEDIN_TOKEN         OAuth-Access-Token mit Scope w_member_social
LINKEDIN_AUTHOR_URN    urn:li:person:XXXX  oder  urn:li:organization:XXXX

X_API_KEY              \
X_API_SECRET            }  OAuth 1.0a (Keys and tokens), dauerhaft gültig, Free-Tier postet
X_ACCESS_TOKEN          }  — App-Permission muss "Read and write" sein
X_ACCESS_SECRET        /
```

> Secrets landen **nie** im Repo — sie kommen zur Laufzeit aus GitHub Secrets.

## So läuft es

1. Workflow `.github/workflows/daily-social.yml` startet täglich (Cron 06:10 UTC).
2. Baut die Queue aus den Ausgaben (`build_social_queue.py`).
3. Postet die nächste Ausgabe auf alle konfigurierten Kanäle (`post_daily.py --post`).
4. Schreibt den Post-State (`automation/.social_posted.json`) zurück ins Repo,
   damit nichts doppelt gepostet wird.

> **Wichtig:** Geplante Workflows laufen nur vom **Default-Branch**. Der tägliche
> Cron wird also erst aktiv, **nachdem dieser PR in `main` gemergt** ist.

## Testen (ohne etwas zu posten)

- **Lokal, Dry-Run:**
  ```bash
  python3 automation/build_social_queue.py
  python3 automation/post_daily.py          # zeigt nur, was es posten würde
  ```
- **In GitHub:** Actions → „Daily Social Post" → **Run workflow** → `dryrun: true`.
- **Echter Test eines Kanals lokal:** Secrets als Env setzen und `--post` nutzen, z.B.:
  ```bash
  MASTODON_BASE_URL=... MASTODON_TOKEN=... python3 automation/post_daily.py --post
  ```

## Schritt-für-Schritt pro Plattform

> Reihenfolge nach „am schnellsten startklar". Mastodon/Bluesky/Telegram sind in
> je ~5 Min fertig und 100 % gratis. Danach optional LinkedIn/X.

### 🟣 Mastodon (gratis, ~3 Min)
1. Account auf einer Instanz (z.B. <https://mastodon.social>).
2. **Einstellungen → Entwicklung → Neue Anwendung**.
3. Name: `aban news`. Scopes: mindestens **`write:statuses`** ankreuzen. Speichern.
4. App öffnen → **„Dein Zugriffstoken"** kopieren.
5. GitHub-Secrets:
   - `MASTODON_BASE_URL` = `https://mastodon.social` (deine Instanz)
   - `MASTODON_TOKEN` = das Token

### 🔵 Bluesky (gratis, ~3 Min)
1. Account auf <https://bsky.app>.
2. **Settings → Privacy and security → App passwords → Add app password**.
3. Name vergeben → Passwort kopieren (Format `xxxx-xxxx-xxxx-xxxx`). **Nicht** dein Login-Passwort nehmen.
4. GitHub-Secrets:
   - `BLUESKY_HANDLE` = `deinname.bsky.social`
   - `BLUESKY_APP_PASSWORD` = das App-Passwort

### ✈️ Telegram-Kanal + Bot (gratis, ~5 Min)
1. In Telegram einen **Kanal** erstellen (öffentlich, z.B. `@abannews`).
2. Chat mit **@BotFather** → `/newbot` → Namen + Username vergeben → **Bot-Token** kopieren.
3. Im Kanal: **Administratoren → Admin hinzufügen → deinen Bot** wählen, Recht **„Nachrichten posten"** geben.
4. GitHub-Secrets:
   - `TELEGRAM_BOT_TOKEN` = das Bot-Token
   - `TELEGRAM_CHAT_ID` = `@abannews` (dein Kanal-Username)

### 💼 LinkedIn (optional, ~20 Min, Freigabe nötig)
1. <https://developer.linkedin.com> → **Create app** (mit einer Company-Page verknüpfen).
2. Tab **Products** → **„Share on LinkedIn"** anfordern (gibt den Scope `w_member_social`).
3. OAuth-Flow durchlaufen und **Access-Token** mit `w_member_social` erzeugen.
4. **Author-URN** ermitteln: `urn:li:person:XXXX` (deine Member-ID) oder `urn:li:organization:XXXX` (Company-Page-ID).
5. GitHub-Secrets:
   - `LINKEDIN_TOKEN` = Access-Token
   - `LINKEDIN_AUTHOR_URN` = der URN
   > ⚠️ LinkedIn-Tokens laufen nach ~60 Tagen ab → gelegentlich erneuern. Deshalb LinkedIn nur 1×/Tag.

### ⚫ X / Twitter (optional, gratis zum Posten, ~15 Min)
1. <https://developer.x.com> → kostenlosen **Free-Account** anlegen → **Project + App** erstellen.
2. App-Settings → **User authentication settings**: Permission auf **„Read and write"** stellen (wichtig!), App-Type „Web App / Automated".
3. Tab **Keys and tokens**:
   - **API Key / API Key Secret** generieren (= Consumer Keys).
   - **Access Token / Access Token Secret** generieren (mit Read-and-write).
4. GitHub-Secrets (OAuth 1.0a, laufen **nicht** ab):
   - `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`
   > Free-Tier reicht (~1.500 Posts/Monat). Bedingungen ändern sich gelegentlich — kurz im Portal prüfen.

### Endspurt (für alle)
1. Secrets unter **Settings → Secrets and variables → Actions** anlegen.
2. **Actions → „Daily Social Post" → Run workflow → `dryrun: true`** — prüft, dass alles greift, ohne zu posten.
3. Nochmal mit `dryrun: false` für einen echten ersten Post — oder einfach den Cron nach **Merge in `main`** laufen lassen.

## Inhalt anpassen

Der Posttext kommt aus jeder Ausgabe (Hook aus dem „Einstieg" + Link + `#KI #DACH`).
Feintuning in `automation/build_social_queue.py` (Felder `short`/`long`, Hashtags).
Für plattformfertige LinkedIn-Langtexte gibt es zusätzlich
`automation/linkedin_posts_generated.md`.
