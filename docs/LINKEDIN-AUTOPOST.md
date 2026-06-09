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
1. https://www.linkedin.com/developers/apps → **Create app** (Firmenseite „aban news" verknüpfen).
2. Reiter **Products** → **Share on LinkedIn** UND **Sign In with LinkedIn using OpenID Connect**
   anfordern (beide meist sofort frei). Das OpenID-Produkt liefert die Scopes `openid profile`.
3. Reiter **Auth** → Scopes prüfen: **`openid`**, **`profile`**, **`w_member_social`**.

## Schritt 2 — Access-Token holen (mit ALLEN drei Scopes!)
> ⚠️ **Häufigster Fehler (genau unser Fall):** Ein Token nur mit `w_member_social` reicht NICHT —
> das Skript kann dann deine Member-ID nicht lesen (`/userinfo` → 403) und ein von Hand eingetippter
> `urn:li:person:…`-Wert wird mit **HTTP 422** abgelehnt. Lösung: Token MIT `openid profile w_member_social`
> erzeugen. Dann holt sich das Skript die korrekte URN **automatisch** — du musst gar keine URN eintragen.

1. Im Developer-Portal den **OAuth-Token-Generator** öffnen (Reiter „Auth" → „OAuth 2.0 tools"
   → „Token Generator") und **alle drei Scopes** `openid`, `profile`, `w_member_social` anhaken → Token erzeugen.
   (Alternativ den klassischen Authorization-Code-Flow mit `scope=openid%20profile%20w_member_social`.)
2. Eine Author-URN musst du **nicht** mehr von Hand suchen — `automation/linkedin_post.py` ruft mit dem
   Token `GET /v2/userinfo` (`sub`) bzw. `/v2/me` (`id`) auf und baut `urn:li:person:<id>` selbst.

## Schritt 3 — GitHub-Secrets setzen
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `LINKEDIN_ACCESS_TOKEN` = dein OAuth-Token **(mit `openid profile w_member_social`)**
- `LINKEDIN_AUTHOR_URN`   = **optional/leer lassen.** Nur als Notnagel, falls die Auto-Auflösung scheitert;
  dann exakt `urn:li:person:<deine-id>` (die ID aus `/v2/me`, NICHT die Zahl aus der Profil-URL).

## Schritt 3b — (optional) Auch auf die Unternehmensseite „aban news" posten
Posten auf die **Company Page** ist ein eigener Pfad und braucht mehr:
1. App-Produkt **„Community Management API"** beantragen (Reiter **Products**) → gibt den Scope
   **`w_organization_social`**. ⚠️ Das ist eine **Freigabe durch LinkedIn** und kann dauern/abgelehnt werden.
2. Du musst **Admin** der Seite sein. Die **Organisations-ID** findest du in der Seiten-URL bzw. unter
   Seiten-Admin → „Einstellungen". 
3. Token **neu** mit `w_organization_social` (zusätzlich) erzeugen und Secret aktualisieren.
4. Neues Secret **`LINKEDIN_ORG_URN`** = `urn:li:organization:<org-id>` (oder nur die Zahl — das Skript
   ergänzt das Präfix). Ist das Secret gesetzt, postet das Skript **zusätzlich** auf die Seite; fehlt der
   Org-Scope, wird das sauber übersprungen (Profil-Post läuft trotzdem).

> Tipp: Die Queue-Texte sind in **Ich-Stimme** geschrieben („Ich habe keine Lust mehr auf KI-Hype…") —
> das wirkt auf einem **persönlichen Profil** am stärksten und hat dort organisch die meiste Reichweite.
> Die Unternehmensseite ist eher Zweitkanal.

## Schritt 4 — scharf schalten
- Der Workflow läuft **nur vom `main`-Branch** (Cron-Regel von GitHub). Also nach `main` mergen.
- Test ohne Warten: Actions → **LinkedIn Autopost** → **Run workflow** (manuell).
- Trockentest lokal: `python3 automation/linkedin_post.py --dry-run` (zeigt den nächsten Eintrag, postet nicht).

## So funktioniert die Queue
- `social/linkedin_queue.json` = Liste von Einträgen `{id, status, text, date?}`.
- Pro Lauf wird **ein** Eintrag mit `status: "ready"` gepostet (optional erst ab `date`), danach auf
  `posted` gesetzt und der Status zurück ins Repo committet (kein Doppel-Posten).
- Neue Posts: einfach weitere Objekte mit `status: "ready"` anhängen. Vorlagen: `docs/LINKEDIN-POSTS.md`.

## Fehler-Spickzettel (aus echten Läufen)
- **`userinfo`/`me` → 403 Forbidden** beim Auto-Resolve = dem Token fehlen `openid`/`profile`.
  → Token neu mit allen drei Scopes erzeugen (Schritt 2).
- **POST → 422 `/author … does not match urn:li:company:\d+|urn:li:member:…`** = die verwendete
  Author-URN ist falsch formatiert (z. B. Profil-URL-Zahl statt API-ID). → `LINKEDIN_AUTHOR_URN`
  leeren und auf Auto-Resolve setzen, oder exakt `urn:li:person:<id-aus-/v2/me>` eintragen.
- **POST → 403 ACCESS_DENIED `/author`** = Token darf nicht im Namen dieses Autors posten
  (falscher Scope oder fremde URN). → Scope `w_member_social` (bzw. `w_organization_social` für die Seite) prüfen.
- **HTTP 401** = Token abgelaufen (i. d. R. nach ~60 Tagen). → Im Developer-Portal erneuern, Secret aktualisieren.

Das Skript macht den Workflow bei all dem **nicht rot** (loggt nur Warnungen) und „verbraucht" den
Queue-Eintrag nur, wenn mindestens ein Ziel wirklich gepostet wurde.

## Empfehlung
- **LinkedIn-Newsletter** (wöchentlich) + 1 Feed-Post/Werktag ist ein guter Rhythmus.
- Den vollen Tagesinhalt **nicht** auf LinkedIn spiegeln — nur Teaser mit Link auf https://abannews.com,
  damit das E-Mail-Abo der eigentliche Gewinn bleibt.

## Verhältnis zum alten Make.com-Weg
Es gibt im Repo noch `automation/linkedin-auto-post.blueprint.json` (+ `…-SETUP.md`, `linkedin_posts_seed.csv`)
— das ältere Make.com-Muster (Google-Sheet → Make → Buffer → LinkedIn). **Diese native Pipeline hier ist
der gewählte Weg (autonom + gratis, keine Fremdkonten).** ⚠️ Die 30 Seed-Posts der Make-CSV enthalten
**erfundene Statistiken** (Bitkom-%, `n=327`-Umfragen, Open-/Reply-Rates, Abo-Zahlen) und sind **nicht** in
diese Queue übernommen worden. In `social/linkedin_queue.json` stehen nur **5 geprüfte, evergreen** Posts.
Wer die alten Posts nutzen will, muss vorher die erfundenen Zahlen entfernen/durch echte ersetzen.
