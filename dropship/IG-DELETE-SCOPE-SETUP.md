# 🔑 IG-LÖSCH-SCOPE EINRICHTEN — instagram_manage_contents

> Ziel: Instagram-Posts/Reels per Graph-API löschen (`DELETE /<media_id>`) — vollautonom, kein Browser.
> WICHTIG: Für das EIGENE Konto im **Development-Modus** geht das oft OHNE volles App Review.

## Voraussetzung (haben wir schon)
- Meta-App existiert (die, mit der der Worker IG/FB postet) + FB-Seite **1049840534888592** verknüpft
- IG = Business/Creator-Konto, mit der FB-Seite verbunden
- Bestehende Scopes: `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`

## ⚡ Schneller Weg (eigenes Konto, Development-Modus — KEIN App Review)
1. **developers.facebook.com** → **My Apps** → eure LuxeStyle-App öffnen
2. Sicherstellen: App ist im **Development-Modus** (oben der Toggle) — dann dürfen App-Rollen (Admin/Developer/Tester) **Advanced Permissions auf EIGENE Konten** ohne Review nutzen
3. **Graph API Explorer** öffnen (Tools → Graph API Explorer):
   - App auswählen
   - **„Get Token" → „Get User Access Token"**
   - In der Scope-Liste zusätzlich **`instagram_manage_contents`** anhaken (plus die bestehenden)
   - **„Generate Access Token"** → mit dem IG/FB-Konto autorisieren
4. → Du hast jetzt einen Token MIT Lösch-Scope. **Long-Lived machen** (Token-Tool / fb-Exchange), damit er ~60 Tage hält.
5. Token sicher ablegen: `META_DELETE_TOKEN` in `luxe-secrets.ps1` / als Secret — **NIE ins Repo.**

## 🐢 Voller Weg (nur falls Dev-Modus nicht reicht / Live-App)
1. App → **App Review → Permissions and Features**
2. `instagram_manage_contents` suchen → **„Request"**
3. Begründung: „Eigene doppelte Posts im eigenen Business-Konto löschen/verwalten"
4. **Screencast-Video** (2026 Pflicht, keine Screenshots mehr): kompletter Ablauf mit Test-Konto zeigen
5. Business-Verifizierung abschliessen → Submit → Freigabe dauert Tage

## ✅ Sobald der Token da ist
Sag mir Bescheid (Token als ENV `META_DELETE_TOKEN`) — dann baue ich `automation/ig-delete-api.mjs`:
- Listet eure letzten IG-Medien (`GET /<ig_id>/media`)
- Findet Dubletten (gleicher Caption/gleiches Bild)
- Löscht die Extras: `DELETE /<media_id>?access_token=…`
- **Vollautonom aus der Cloud/Worker — kein Browser, kein PC nötig.**

## ⚠️ Ehrliche Einschätzung
- **Für die JETZIGEN paar Dubletten** (Papillon 3×) ist die IG-**App** schneller (3 Taps).
- **Der Scope lohnt sich**, wenn du **dauerhaft autonomes IG-Aufräumen** willst (dann nie wieder manuell).
- TikTok bleibt Browser-only (kein Lösch-API) — dafür ist das gehärtete Browser-Tool da.
