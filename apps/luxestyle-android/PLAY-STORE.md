# LuxeStyle Android-App → Google Play

Stand 2026-09-25. Paket-ID **`ch.luxestyle.app`**, Version 1.0.0 (versionCode 1), targetSdk 36.

## Was die App ist
Native App (Kotlin, Jetpack Compose) auf der **Shopify Storefront API** – ohne Token, Shopify erlaubt
öffentliches Lesen und den Warenkorb. Preise immer in CHF (`@inContext(country: CH)`).
- **Nativ:** Start (Titelbild der Webseite fest in der App, Saison-Knopf wechselt mit dem Kalender,
  WELCOME10-Band, Reihen Damen-Mode/Halsketten/Taschen/Geschenke, zuletzt angesehen), Kategorien als
  Bild-Kacheln, Kollektion mit Unterkategorien, Sortierung, Preis-/Lieferbar-Filter und Nachladen,
  Produkt mit Galerie + Vollbild-Zoom + Varianten (unkaufbare ausgegraut) + „Passt dazu", Suche mit
  Vorschlägen, Merkliste ohne Konto, Warenkorb mit Mengen, Rabattcode (WELCOME10 per Tipp) und
  Gratis-Versand-Balken. Produktseite zeigt die Lieferzeit und die Grössentabelle als echte Tabelle
  (beides aus dem Beschreibungstext, gewählte Grösse markiert). Merkliste zeigt, wenn ein Stück seit dem
  Merken günstiger wurde. Letzte Suchen, App-Shortcuts (Suche, Merkliste, Warenkorb).
- Beschreibungen ohne Werbekästen, Emoji und „Gratis-Versand ab 50" (die App zeigt ihre geprüften Angaben).
- **Web (`WebActivity`):** nur Kasse, Kundenkonto, Rechtstexte. TWINT/PayPal/Mail öffnen die passende App.
- Warenkorb trägt das Attribut `_quelle = android_app`, Web-Aufrufe `utm_source=android_app`,
  geteilte Links `utm_source=app_share`.
- Hell und dunkel, Marken-Palette Creme/Tinte/Bronze, drei Eckenradien, Strich-Ikonen, kein Emoji.

**Shop-Regeln im Code** (bei Änderung im Admin mitziehen): Gratis-Versand CH ab **CHF 45**
(`CartRepository.FREE_SHIPPING_CHF`, so steht es aktiv im Versandprofil; das Shop-Banner sagt „ab 50").
Reihen: `RAILS` und `seasonFor()` in `HomeScreen.kt`.

Warum keine TWA: Shopify liefert `/.well-known/assetlinks.json` fest als `[]`.

## Bauen und prüfen
```bash
cd apps/luxestyle-android
./gradlew testReleaseUnitTest lintRelease bundleRelease   # + LUXE_KEYSTORE_PATH/_PASSWORD für Signatur
LUXE_SCREENSHOTS=1 ./gradlew testDebugUnitTest --tests '*Tour*' --tests '*StoreShots*'
```
Der zweite Befehl ist ein **Rundgang durch die echte App mit echten Shopdaten** (Robolectric +
Roborazzi) → Bilder in `screens/`. Ersetzt den fehlenden Emulator; Store-Bilder kommen von dort.
Auf GitHub: Actions → „LuxeStyle Android-App bauen" (nur manuell).

Geprüft 2026-09-25: 25/25 Tests (+ Beschreibungs-Check gegen 214 echte Produkte mit `LUXE_DESCS`), Rundgang 18 Bilder ok, Lint 0 Fehler, R8-Release ok.
**Auf einem echten Handy noch nicht** → vor dem Einreichen „Interner Test".

## Upload-Schlüssel
`luxestyle-upload.jks` + Passwort wurden dem User als Datei übergeben — **nie ins Repo**.
Secrets für den Workflow: `LUXE_KEYSTORE_B64` (= `base64 -w0 luxestyle-upload.jks`),
`LUXE_KEYSTORE_PASSWORD`. Verloren → in der Play Console zurücksetzen lassen (einige Tage).

## Was nur der User machen kann
1. **Entwicklerkonto** <https://play.google.com/console/signup> — 25 USD, Ausweis. ⚠️ **Privates
   Konto:** vorher geschlossener Test mit **12 Testern, 14 Tage**. **Organisationskonto** (D-U-N-S,
   gratis) ist ausgenommen.
2. **App erstellen**: „LuxeStyle – Mode & Schmuck CH", Deutsch (Schweiz), kostenlos.
3. **Interner Test** → AAB hochladen → auf dem Handy: Produkt → Warenkorb → Kasse bis TWINT, Konto-Login.
4. **Store-Eintrag** aus `store/` (`listing-de.md`).
5. **App-Inhalte**, empfohlene Antworten:
   - Datenschutz: `https://luxestyle.ch/policies/privacy-policy` · Werbung: Nein · Zugriff: ohne Login
   - Zielgruppe 18+ · IARC: Shopping, keine Gewalt/Sex/Drogen, „kauft physische Waren" = Ja
   - Datensicherheit: Merkliste/zuletzt angesehen bleiben **nur auf dem Gerät** (nicht erhoben).
     Erhoben über die Shop-Kasse: **Persönliche Infos** (Name, E-Mail, Adresse, Telefon – Bestellung,
     Konto), **Finanzinfos** (Kaufverlauf; Zahlung via Shopify/TWINT), **App-Aktivität** (Shop-Analytik,
     Pixel). Verschlüsselt: Ja. Löschung: Ja (info@luxestyle.ch).
6. **Geschlossener Test** (nur privates Konto), dann Produktionszugriff beantragen.
7. **Produktion** einreichen → Google prüft (meist 1–7 Tage).

## Nächste Versionen
Workflow mit höherem Versionsnamen → AAB → Play Console. Produkte, Preise, Menü und Kollektionen
kommen live aus Shopify – dafür braucht es kein App-Update.
