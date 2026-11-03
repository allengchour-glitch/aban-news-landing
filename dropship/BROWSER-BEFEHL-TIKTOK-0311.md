# Auftrag für PC-Claude: TikTok-Profil veredeln (3.11.2026)

Für den PC-Claude mit Brave (Port 9222, eingeloggt, siehe `dropship/BROWSER-AGENT-SETUP.md`). Besitzer-Auftrag im Chat 3.11.: «tiktok push auf maximum und veredle alles dort».

## Grenzen (gelten vor allem anderen)
- **Nicht ändern:** Kontoart (kein Wechsel auf Business ohne Ja des Besitzers), Benutzername `luxestyle.ch`, Passwort, Zahlungs- und Werbe-Einstellungen, keine Anzeigen starten, nichts kaufen, keine Beiträge löschen, nicht folgen oder entfolgen.
- Bei Login-Wand, 2FA oder Sicherheitsabfrage: **anhalten** und dem Besitzer melden.
- Vor jeder Änderung den alten Text und einen Screenshot sichern (Rückgängig-Wert), nach der Änderung wieder einen Screenshot.
- Auf Kommentare **nicht antworten** (Kundenkontakt, Vorlagen warten auf Freigabe in `dropship/SOCIAL-ANTWORTVORLAGEN-0311.md`).

## Schritt 1: Lesen (nur Bildschirmfotos, nichts ändern)
1. Profil `https://www.tiktok.com/@luxestyle.ch`: Name, Bio, Link-Feld, Profilbild, angeheftete Videos, Raster der letzten 12 Beiträge. Kontoart prüfen (TikTok Studio, Einstellungen, Konto): persönlich oder Business?
2. TikTok Studio, Analyse (28 Tage): Aufrufe, Follower, **die drei Videos mit den meisten Aufrufen** (Titel, Datum, Aufrufe) und woher die Zuschauer kommen (Land, Anteil Schweiz).
3. Events Manager (Business Center, falls ohne Login erreichbar): Pixel vorhanden? Werden Ereignisse empfangen (`ViewContent`, `AddToCart`, `Purchase`)? Nur Bildschirmfoto der Übersicht und der «Test Events»-Seite, nichts verbinden oder entfernen.

## Schritt 2: Ändern (nur wenn Schritt 1 sauber war)
1. **Name** (Feld «Name», höchstens 30 Zeichen): `LuxeStyle · Licht & Geschenke` (29 Zeichen).
2. **Bio** (höchstens 80 Zeichen): `Licht & Geschenke · Lieferung CH und LI · -10% mit WELCOME10 · luxestyle.ch/tt` (78 Zeichen). Der Code WELCOME10 gilt (GEMESSEN 3.11. im Shopify-Admin: aktiv, 10 %, alle Kunden, einmal je Kunde, bis 31.12.2027). **Nicht** verwenden: «Schweizer Online-Shop», «Weltweiter Versand», «30 Tage Rückgabe», «Premium Accessoires».
3. **Link-Feld:** bei persönlichem Konto nicht klickbar, nichts eintragen, was nicht angenommen wird. Der Kurzlink `luxestyle.ch/tt` steht als Text in der Bio und in jeder Beschreibung. Test: `curl -sI https://luxestyle.ch/tt` muss `301` auf `/collections/aus-tiktok-und-instagram?utm_source=tiktok&...` liefern (am 3.11. geprüft).
4. **Anheften** (bis zu drei): die drei besten Videos aus Schritt 1, aber keine saisonalen (Halloween, Fasnacht) und keines mit Preis- oder Lieferaussagen, die nicht mehr stimmen.
5. **Wiedergabelisten** (nur wenn TikTok sie für das Konto anbietet): «Licht und Stimmung» und «Geschenkideen bis CHF 30», zunächst leer lassen, wenn es keine passenden Videos gibt.

## Schritt 3: Bericht an den Besitzer (kurz, Deutsch)
Kontoart, alter und neuer Name und Bio, die drei Top-Videos mit Zahlen, Anteil Schweiz, Befund Pixel/Events Manager, angeheftete Videos, alle Bildschirmfotos als Dateinamen. Was nicht ging, offen sagen.
