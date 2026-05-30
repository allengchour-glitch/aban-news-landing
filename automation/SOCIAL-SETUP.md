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

X_BEARER_TOKEN         OAuth2-*User*-Token mit tweet.write (Free-Tier reicht zum Posten)
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

## Inhalt anpassen

Der Posttext kommt aus jeder Ausgabe (Hook aus dem „Einstieg" + Link + `#KI #DACH`).
Feintuning in `automation/build_social_queue.py` (Felder `short`/`long`, Hashtags).
Für plattformfertige LinkedIn-Langtexte gibt es zusätzlich
`automation/linkedin_posts_generated.md`.
