# LinkedIn-Autopost — Einrichtung (ehrlich, mit allen Haken)

Ziel: `social/linkedin_queue.json` wird werktags automatisch auf dein LinkedIn-**Profil**
gepostet — über `.github/workflows/linkedin-autopost.yml` + `automation/linkedin_post.py`.

> **Wichtige Realität vorweg.** Auto-Posten auf ein *persönliches* LinkedIn-Profil ist absichtlich
> umständlich. LinkedIn erlaubt es nur über eine **eigene App** mit dem Produkt **„Share on LinkedIn"**
> und einem OAuth-Token mit Scope **`w_member_social`**. Tokens laufen i. d. R. nach ~60 Tagen ab und
> müssen erneuert werden. Wer das nicht pflegen will, fährt mit **Copy-Paste** (`docs/LINKEDIN-POSTS.md`)
> oder einem Scheduler wie **Buffer**/**Make** entspannter. Das Skript hier ist no-op, solange kein Token
> gesetzt ist — es richtet also keinen Schaden an.

## Schritt 1 — LinkedIn-App anlegen
1. https://www.linkedin.com/developers/apps → **Create app** (mit deinem Profil verknüpfen).
2. Reiter **Products** → **Share on LinkedIn** anfordern (Freischaltung meist sofort).
3. Reiter **Auth** → Scopes prüfen: **`w_member_social`** (Posten) und **`openid profile`** (für die URN).

## Schritt 2 — Access-Token + Author-URN holen
1. OAuth-Flow durchlaufen (LinkedIn „Authorization Code"-Flow) → du bekommst einen **Access-Token**.
   - Schnellweg zum Testen: den Token-Generator im LinkedIn-Developer-Portal nutzen (sofern verfügbar),
     sonst einmaligen Auth-Link mit `redirect_uri` aufrufen und Code gegen Token tauschen.
2. **Author-URN** ermitteln: `GET https://api.linkedin.com/v2/userinfo` mit `Authorization: Bearer <token>`
   → Feld `sub`. Deine URN ist dann `urn:li:person:<sub>`.

## Schritt 3 — GitHub-Secrets setzen
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `LINKEDIN_ACCESS_TOKEN` = dein OAuth-Token
- `LINKEDIN_AUTHOR_URN`   = `urn:li:person:xxxxxxxx`

## Schritt 4 — scharf schalten
- Der Workflow läuft **nur vom `main`-Branch** (Cron-Regel von GitHub). Also nach `main` mergen.
- Test ohne Warten: Actions → **LinkedIn Autopost** → **Run workflow** (manuell).
- Trockentest lokal: `python3 automation/linkedin_post.py --dry-run` (zeigt den nächsten Eintrag, postet nicht).

## So funktioniert die Queue
- `social/linkedin_queue.json` = Liste von Einträgen `{id, status, text, date?}`.
- Pro Lauf wird **ein** Eintrag mit `status: "ready"` gepostet (optional erst ab `date`), danach auf
  `posted` gesetzt und der Status zurück ins Repo committet (kein Doppel-Posten).
- Neue Posts: einfach weitere Objekte mit `status: "ready"` anhängen. Vorlagen: `docs/LINKEDIN-POSTS.md`.

## Wenn das Token abläuft
Posts schlagen dann mit HTTP 401 fehl — das Skript macht den Workflow **nicht rot** (loggt nur eine
Warnung). Token im Developer-Portal erneuern und das Secret aktualisieren.

## Empfehlung
- **LinkedIn-Newsletter** (wöchentlich) + 1 Feed-Post/Werktag ist ein guter Rhythmus.
- Den vollen Tagesinhalt **nicht** auf LinkedIn spiegeln — nur Teaser mit Link auf https://abannews.com,
  damit das E-Mail-Abo der eigentliche Gewinn bleibt.
