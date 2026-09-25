# LuxeStyle Android-App → Google Play

Stand 2026-09-25. Paket-ID **`ch.luxestyle.app`**, Version 1.0.0 (versionCode 1), targetSdk 36.

## Was die App ist
Eine native Android-Hülle um luxestyle.ch (Kotlin, WebView), mit eigenen Bedienteilen:
- untere Navigationsleiste: Start · Kategorien · Suche · Warenkorb · Konto (markiert sich beim Surfen mit)
- Startbild (Splash) im Markenlook, eigenes App-Symbol
- „Keine Verbindung"-Seite mit „Nochmals versuchen" statt Chrome-Fehlerseite
- Zum Neuladen herunterziehen, Ladebalken, Zurück-Taste blättert im Shop, zweimal Zurück schliesst
- Checkout, Kundenkonto (`account.luxestyle.com.co`) und Shop Pay bleiben in der App;
  TWINT/PayPal-Apps, Mail, Telefon, Instagram usw. öffnen die passende App
- Datei-Upload funktioniert (Motiv-Editor „selbst gestalten")
- Teilen-Knopf auf Produktseiten (oben rechts, unten klebt die Warenkorb-Leiste), Link mit `utm_source=app_share`
- `luxestyle.ch`-Links aus Newsletter/Social können direkt in der App öffnen
- Zugriffe tragen `utm_source=android_app` → in Shopify-Analytics als eigene Quelle sichtbar;
  User-Agent endet auf `LuxeStyleApp/<Version>`

Warum keine „TWA" (Trusted Web Activity): dafür müsste `luxestyle.ch/.well-known/assetlinks.json`
unseren Schlüssel enthalten. Shopify liefert dort fest `[]` aus und lässt die Datei nicht ändern →
eine TWA würde oben immer eine Browser-Adressleiste zeigen.

## Bauen
```bash
cd apps/luxestyle-android
export ANDROID_HOME=…            # SDK mit platforms;android-36 + build-tools;36.0.0
./gradlew testReleaseUnitTest lintRelease assembleDebug        # ohne Schlüssel
LUXE_KEYSTORE_PATH=… LUXE_KEYSTORE_PASSWORD=… ./gradlew bundleRelease   # signiertes AAB
```
Oder auf GitHub: Actions → **„LuxeStyle Android-App bauen"** → Run workflow (nur manuell).
Das AAB liegt danach als Artefakt am Lauf. Braucht die Secrets unten.

Geprüft am 2026-09-25 im Container: Build grün, 5/5 Unit-Tests, Lint 0 Fehler,
AAB signiert (Zertifikat SHA-256 `2b10e7bf…0a94b9`). **Nicht** auf einem echten Gerät/Emulator
getestet (Container ohne KVM) → vor dem Einreichen einmal über „Interner Test" aufs eigene Handy.

## Upload-Schlüssel (WICHTIG)
Der Schlüssel `luxestyle-upload.jks` + Passwort wurden in der Claude-Session erzeugt und dem User
als Datei übergeben — **nie ins Repo** (ist öffentlich). Sicher aufbewahren (Passwort-Manager).
Für den GitHub-Workflow als Secrets setzen:
- `LUXE_KEYSTORE_B64` = `base64 -w0 luxestyle-upload.jks`
- `LUXE_KEYSTORE_PASSWORD` = das Passwort

Mit Play App Signing verwaltet Google den eigentlichen App-Schlüssel; geht der Upload-Schlüssel
verloren, kann man ihn in der Play Console zurücksetzen lassen (dauert einige Tage).

## Was nur der User machen kann (Reihenfolge)
1. **Entwicklerkonto** auf <https://play.google.com/console/signup> — einmalig 25 USD,
   Ausweis-Prüfung. ⚠️ **Privates Konto** (nach Nov. 2023 erstellt): vor der Veröffentlichung
   **geschlossener Test mit mind. 12 Testern, 14 Tage am Stück**. **Organisationskonto** (braucht
   D-U-N-S-Nummer der Firma, gratis bei Dun & Bradstreet) ist davon ausgenommen.
2. **App erstellen**: Name „LuxeStyle – Mode & Schmuck CH", Standardsprache Deutsch (Schweiz),
   App, kostenlos.
3. **Interner Test** → neuer Release → `app-release.aab` hochladen → sich selbst als Tester →
   App aufs Handy, einmal durchklicken (Kauf bis Zahlungsseite, TWINT-Sprung, Konto-Login).
4. **Store-Eintrag**: Texte + Grafiken aus `store/` (siehe `store/listing-de.md`).
5. **App-Inhalte** (Formulare in der Play Console), empfohlene Antworten:
   - Datenschutzerklärung: `https://luxestyle.ch/policies/privacy-policy`
   - Werbung: Nein (die App zeigt keine Werbeanzeigen)
   - App-Zugriff: „Alle Funktionen ohne besondere Zugangsdaten verfügbar"
   - Zielgruppe: 18+ (Shop mit Zahlungen)
   - Inhaltsaltersfreigabe (IARC): Kategorie „Shopping"; keine Gewalt/Sex/Drogen;
     „Nutzer können physische Waren kaufen" = Ja
   - Datensicherheit — die App selbst speichert nichts, aber der Shop in der App erhebt Daten.
     Anzugeben: **Persönliche Infos** (Name, E-Mail, Adresse, Telefon) — Zweck Bestellabwicklung,
     Kontoverwaltung; **Finanzinfos** (Kaufverlauf; Zahlungsdaten verarbeitet Shopify/TWINT);
     **App-Aktivität / Geräte-IDs** über Shop-Analytik und Werbe-Pixel (Shopify, TikTok, Klaviyo) —
     Zweck Analyse, Marketing. Übertragung verschlüsselt: Ja. Löschung auf Anfrage: Ja
     (info@luxestyle.ch).
   - Finanzfunktionen / Gesundheit / Behörden: Nein
6. **Geschlossener Test** (nur privates Konto): 12 Tester einladen, 14 Tage laufen lassen,
   dann „Produktionszugriff beantragen".
7. **Produktion** → Release einreichen → Prüfung durch Google (meist 1–7 Tage).

Bibliotheken bleiben auf dem getesteten Stand: die neuesten brauchen compileSdk 37 + neueres AGP.

## Nächste Versionen
Workflow starten (Versionsname erhöhen) → AAB-Artefakt → Play Console → neuer Release.
Inhalte (Produkte, Preise, Texte) ändern sich **ohne** App-Update, weil die App den Live-Shop zeigt.
