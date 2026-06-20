# 🎬 TikTok App-Review — Komplett-Paket (App „luxe") — damit's beim ersten Mal durchgeht

> Ziel: Production der App **„luxe"** (ID `7648584035840903189`) auditieren lassen → danach postet der Bot
> **vollautomatisch + öffentlich** auf @luxestyle.ch (kein Tap, kein PC). Sandbox = nur Test (liefert NICHT an die App).
> **Submit-Button:** developers.tiktok.com → App „luxe" → **„Submit for review"** (oben rechts). Vorher unten alles ausfüllen.

## 1) App-Grundinfos (sollten stehen — prüfen)
- **App name:** LuxeStyle Poster (oder „LuxeStyle Social") · **App icon:** LS-Logo 1024×1024 ✅
- **Category:** Business / Shopping
- **Description (einfügen):**
  > LuxeStyle is the official content tool for the Swiss online shop luxestyle.ch. It lets the shop owner
  > automatically publish their own product videos (reels) to their own TikTok account, and read basic
  > account info for scheduling and analytics. All content is first-party (our own shop), posted to our own account.
- **Terms of Service URL:** `https://luxestyle.ch/policies/terms-of-service` ✅
- **Privacy Policy URL:** `https://luxestyle.ch/policies/privacy-policy` ✅
- **Platforms:** Web ✅ (+ Desktop). **Web/Desktop URL:** `https://luxestyle.ch` · **Redirect URI:** `https://luxestyle.ch/`

## 2) Products + Scope-Begründungen (genau so ins Formular)
| Scope | Begründung (englisch, copy-paste) |
|---|---|
| `user.info.basic` | "To display the connected account's username/avatar in our scheduling dashboard and confirm the correct account is linked before posting." |
| `video.upload` | "To upload our own shop's product videos to the owner's TikTok inbox for review and publishing." |
| `video.publish` | "To directly publish our own first-party product videos to our own TikTok account on a schedule, with our own captions. Content is exclusively our own e-commerce product reels." |

**Content-Sharing-Guideline-Hinweis:** klar machen, dass NUR **eigene** (first-party) Shop-Inhalte gepostet werden,
auf das **eigene** Konto — kein User-generated content, kein Posten für Dritte. Das ist der unkritischste Review-Fall.

## 3) Demo-Video (Pflicht) — genau dieses Skript aufnehmen (Handy/Screenrecord, ~60–90 s)
1. **Login-Flow zeigen:** App/Tool öffnen → „Mit TikTok verbinden" → TikTok-OAuth-Seite → „Autorisieren" → zurück, „verbunden ✅".
2. **Scopes zeigen:** kurz die angefragten Berechtigungen einblenden (user.info.basic, video.upload, video.publish).
3. **Posting zeigen:** ein Produkt-Reel auswählen → Caption sieht man → „Posten" → Erfolg/Bestätigung.
4. **Ergebnis zeigen:** das Video erscheint auf dem @luxestyle.ch-Profil.
5. Voiceover/Text: „This tool posts our own shop's product videos to our own TikTok account."
> Tipp: Mit dem Sandbox-Flow aufnehmen (OAuth + API-Call sind identisch) — reicht TikTok als Nachweis.
> Hochladen unter „App review" → Demo video. Optional Postman/Screen der API-Antwort (publish_id) beilegen.

## 4) Submit-Checkliste
- [ ] Alle Pflichtfelder (Icon, Desc, ToS, Privacy, Platform, Redirect) grün
- [ ] Scopes mit Begründung
- [ ] Demo-Video hochgeladen
- [ ] **„Submit for review"** klicken → Status „In review" (Freigabe i.d.R. einige Tage)

## 5) NACH der Freigabe (mach ich automatisch)
1. Production-OAuth einmal (gleicher Flow, Production-Key `awhvghmn5q2oh91i` + Production-Secret) → Token.
2. In `luxe-secrets.ps1`/ENV: `TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN` (Production).
3. **`TT_PRIVACY_LEVEL=PUBLIC_TO_EVERYONE`** setzen → `tiktok-autopost.mjs` postet **direkt öffentlich**, vollautomatisch.
4. Bot läuft im Zeitplan (PC-Task ODER Worker) → refresht Token selbst (refresh = 1 Jahr) → postet nächstes Reel + analysiert.

**= ab dann: reiner Auto-Bot, du machst NICHTS mehr.**
