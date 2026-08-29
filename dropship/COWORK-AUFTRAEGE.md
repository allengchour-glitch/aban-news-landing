# Aufträge für Claude Cowork — Stand 29.08.2026, 05:30 UTC

Diese Aufgaben lassen sich aus der Cloud-Session **nicht** erledigen: Es sind Klicks in fremden
Web-Konsolen, für die es keinen Schreib-Endpunkt gibt. Mit Cowork + «Claude in Chrome» bzw.
«Computer use» (Einstellungen → General, nur Pro/Max) kann Claude sie am Bildschirm ausführen.

⚠️ **Keine Zugangsdaten in den Auftragstext schreiben.** Vorher im Browser bei den jeweiligen
Diensten anmelden — Cowork soll die bereits offene Sitzung benutzen.

⚠️ Reihenfolge nach Wirkung. **A, 1 und 2 haben direkten Geldbezug** — der Rest ist Hygiene.

---

## A. Gratis-Versand-Balken zeigt die falsche Schwelle  ⭐⭐ (NEU 29.08.)
> Öffne im Shopify-Adminbereich das MAIN-Theme «Horizon · LuxeStyle + Email-Popup (Claude)»,
> bearbeite `layout/theme.liquid` und ändere die eine Zeile `var SCHWELLE=5000;` auf
> **`var SCHWELLE=4900;`**. Sonst nichts. Bestätige mir den neuen Wert.

**Warum:** Der Automatik-Rabatt «Gratis-Versand ab CHF 49» ist live ACTIVE (am 29.08. abgefragt).
Der Balken im Warenkorb rechnet aber gegen CHF 50 und sagt einem Korb mit CHF 49.90
**«noch CHF 0.10 bis Gratis-Versand»** — obwohl der Kunde ihn längst hat. Die Anzeige redet ihm
aus, was er bekommt, und zwar an der teuersten Stelle des Ablaufs.
**221 aktive Produkte kosten CHF 49.00–49.99**, darunter das Abendkleid «Sirène» (141 Sitzungen,
**9 Warenkörbe, 0 Kassengänge** in 60 Tagen) und die Slim Wallet (5,0★, bestbewertet).
Die Zusage «ab CHF 50» in allen Texten bleibt wahr (49 < 50) und muss NICHT angefasst werden.
⚠️ Nicht von der Session geändert: Theme + Checkout-Ökonomie sind Betreiber-Entscheidung, und
die Kette 45/49/50/65 ist bewusst gebaut. Geändert wird hier NUR die Anzeige.

## B. Instagram: etwas postet an der Sperre vorbei  (NEU 29.08.)
> Öffne die Meta Business Suite für die Seite «LuxeStyle CH» (1049840534888592) und die
> verbundene Instagram-Seite @luxestyle.ch. Sieh unter **Planer / Geplante Beiträge** nach, ob
> dort automatische oder geplante Posts eingerichtet sind, und ob eine fremde App
> Veröffentlichungsrechte hat (Einstellungen → Business-Integrationen). Melde mir, was du findest.

**Warum:** Der Stopp-Riegel im Repo wirkt nachweislich — das Autopilot-Log sagt bei jedem Lauf
«es wird NICHTS gepostet». Trotzdem entfernt die Dubletten-Wache **seit dem 19.08. jeden Tag
2–5 Duplikate** vom Profil, und ihre eigene Ausgabe lautet «⚠️ externer Poster war wieder aktiv».
Es postet also etwas ausserhalb dieser Session. Was, lässt sich nur im Meta-Konto sehen.
⚠️ Nichts löschen — nur nachsehen und berichten.

## C. TikTok-Ads-Konnektor freigeben  (NEU 29.08.)
> Öffne in Claude die Konnektor-Einstellungen, wähle **TikTok Ads** und schliesse die
> Anmeldung (OAuth) ab.

**Warum:** Der Konnektor ist eingetragen (`installState: connected`), aber die Freigabe fehlt —
eine Cloud-Session ist nicht interaktiv und kann sie nicht durchklicken.
⚠️ **Das schaltet KEIN Posten frei.** Es ist die Werbe-API: Kampagnen und Zahlen. Reels und Fotos
brauchen die Content-Posting-API, und die steht weiter in Review (Punkt 5).

## 1. Klaviyo: die Quelle der toten Domain abstellen  ⭐
> Öffne in Chrome die Klaviyo-Konsole (Konto XWqMAD, LuxeStyle CH).
> Gehe zu Settings → Account → Contact information.
> Ändere **Website URL** von `https://luxestyle.com.co` auf `https://luxestyle.ch` und speichere.
> Stelle bei der Gelegenheit **Preferred currency** von USD auf **CHF** und
> **Locale** von `de-DE` auf `de-CH`. Bestätige mir die drei Werte danach.

**Warum:** `luxestyle.com.co` ist tot (DNS zeigt nicht mehr auf Shopify). Die 45 Vorlagen wurden
am 28.08. bereits repariert — aber dieses Konto-Feld ist die QUELLE: Klaviyo baut die Domain in
neue Vorlagen wieder ein. Ohne diesen Klick kommt der Fehler zurück.

**Noch wirksamer, falls die Domain dem Betreiber gehört:** `luxestyle.com.co` per DNS auf Shopify
zeigen lassen und in Shopify als Weiterleitungs-Domain eintragen. Das rettet zusätzlich alle
BEREITS VERSCHICKTEN Mails und alten Social-Posts.

## 2. Google Merchant Center: Zielland auf Schweiz
> Öffne das Google Merchant Center für luxestyle.ch und stelle Ziel- bzw. Versandland des Feeds
> auf **nur Schweiz**. Melde mir danach, wie viele Artikel den Status «Missing shipping info»
> verlieren.

**Warum:** Der Shop hat genau EINEN aktiven Markt (Switzerland). Zeigt der Feed auf Deutschland,
meldet Merchant fehlende Versandinfos für Ware, die dorthin gar nicht verkauft werden kann.
Google ist der einzige Kanal mit belegten Verkäufen.

## 3. Judge.me: Bewertungs-Anfragemails abstellen
> Öffne die Judge.me-Konsole für den Shop au3j0y-hq.myshopify.com.
> Gehe zu **Settings → Request scheduling → Request Timing**. Entferne die Häkchen bei allen drei
> Bestellarten (domestic, international, POS) und speichere. Bestätige, dass alle drei aus sind.

**Warum:** Es gibt drei getrennte Schalter; die Mails hören erst auf, wenn alle drei aus sind.
Bereits eingeplante, noch nicht versendete Anfragen entfallen mit; schon verschickte nicht.
Der tägliche Bewertungs-Import verschickt selbst KEINE Mails und darf weiterlaufen.

## 4. Schlüssel dauerhaft hinterlegen
> Trage in den Claude-Umgebungs-Einstellungen folgende Variablen ein:
> `JUDGEME_PRIVATE_TOKEN`, `JUDGEME_PUBLIC_TOKEN`, `JUDGEME_SHOP_DOMAIN`.
> **Nicht** in eine Datei im Repo — das Repo ist öffentlich.

**Warum:** Sie liegen derzeit nur unter `/tmp/judgeme.env`. Der Container stellt regelmässig einen
alten Snapshot her und `/tmp` wird mitgedreht — die Token waren am 28.08. schon einmal weg. Ohne
sie endet der tägliche Bewertungs-Import als No-op.

## 5. TikTok: NICHT freigegeben — weiter warten
**Am 28.08.2026 gegengeprüft, Ergebnis eindeutig:** Der Autorisierungs-Link antwortet mit
`error=unauthorized_client&error_type=client_key`. Die App «luxe» (Client-Key awhvghmn5q2oh91i)
ist seit dem 18.08. in Review und noch nicht durch.

⚠️ **Nicht weiter probieren.** Jeder Versuch endet gleich, und wiederholte fehlgeschlagene
Autorisierungen bringen nichts. Auf die Freigabe-Mail warten.

⚠️ **Zwei Signale, die NICHT als Freigabe taugen** (beide führten mich in die Irre):
- Der Client-Credentials-Endpunkt stellt ein Token aus — dieser Grant läuft auf APP-Ebene und
  braucht keine Review. Er sagt nichts über die Nutzer-Autorisierung.
- Der Autorisierungs-Endpunkt leitet auf die Anmeldeseite statt sofort auf einen Fehler. Das
  ist der normale erste Schritt; `unauthorized_client` kommt erst NACH der Anmeldung.

Wenn die Mail da ist: einfach Bescheid geben. Das Werkzeug steht bereit
(`automation/tiktok_anmeldung.mjs start`) — dann ist es ein Klick und ein Einfügen, ohne
lokalen Server. Der Refresh-Token landet im Tresor.

Bis dahin läuft der Browser-Weg unverändert: tiktok.com/tiktokstudio/upload, Video aus
`reels_seed.csv` laden, Caption mitgeben, Trend-Sound in der App wählen.

⚠️ Das Client-Secret stand einmal in einem Chat — im Portal rotieren lassen, neue Werte an mich.

## 6. Aufräumen: hängende Sitzung und offengelegter Webhook
> In der Claude-Sitzungsübersicht hängt «Weekly billing audit» seit dem 26. Juli auf einer
> PowerShell-Freigabe. In genau diesem Befehl steht eine **Discord-Webhook-URL im Klartext**.
> Eine Webhook-URL ist faktisch ein Passwort — erzeuge sie in Discord neu und beende die Sitzung.

---

## Was Cowork NICHT übernehmen soll

- **Die Motoren dieser Session** (4 CJ-Runner, Aufseher, 23 tägliche Wächter) brauchen einen
  dauerhaft laufenden Container. Cowork ist eine Arbeitsoberfläche, kein Ersatz.
- **Bewertungen** schreiben, übersetzen oder löschen. Kundentext bleibt Kundentext.
- **Preisentscheidungen.** Die Produkte, die in jedem Warenkorb Geld kosten, sind eine
  Geschäftsentscheidung (`dropship/PREIS-ALTBESTAND-ENTSCHEID.md`).
- **Produkte veröffentlichen, die gedraftet sind.** Jedes Draft hat einen Grund im Tag; ein
  404 ist ärgerlich, eine unlieferbare Bestellung teuer.

## Bereits erledigt — nicht doppelt machen

- ✅ Klaviyo-VORLAGEN: 45 Vorkommen der toten Domain in 31 von 45 Vorlagen ersetzt, dazu
  «ab CHF 65»→50, «14 Tage Rückgabe»→30, «bedingungslos» entschärft, «WELCOME10 ab CHF 30»
  korrigiert (28.08., von der Cloud-Session über den Klaviyo-Konnektor).
- ✅ 16 Weiterleitungen von rankenden 404-Seiten auf kaufbare Ware (28.08.).
- ✅ POD-Produkte: Rückgabe-Ausnahme, falsche Flagge, Doppelblock, USA-Lieferzusage (28.08.).

