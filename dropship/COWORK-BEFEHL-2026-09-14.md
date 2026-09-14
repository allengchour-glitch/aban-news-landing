# COWORK-BEFEHL (14.09.2026) — einmal einfügen, alles abarbeiten

> Für den PC-Claude (Cowork, Brave eingeloggt). Ein Befehl, sechs Klicks, die nur vom PC aus gehen.
> Reihenfolge = Wert für den Umsatz. Nach jedem Punkt: Ergebnis in einer Zeile melden, dann weiter.
> Nichts Erfundenes eintragen, nichts bezahlen, nichts löschen. Was nicht geht: benennen, nicht umgehen.

```
Du arbeitest für den Shopify-Shop LuxeStyle (luxestyle.ch, Admin: admin.shopify.com/store/au3j0y-hq).
Erledige die sechs Punkte der Reihe nach im Browser. Melde nach jedem Punkt in EINER Zeile: erledigt / nicht möglich + warum.
Erfinde keine Werte, bezahle nichts, lösche nichts.

1. GROQ-SCHLÜSSEL (macht Produkttexte wieder kostenlos): console.groq.com → API Keys → «Create API Key»
   (Name: luxestyle-2026-09) → den kompletten Schlüssel kopieren (56 Zeichen, beginnt mit gsk_).
   Dann claude.ai/code → Einstellungen → Umgebungen → Umgebung von «aban-news-landing» → Umgebungsvariablen:
   GROQ_API_KEY = <Schlüssel>. Speichern. Melde die Zeichenlänge (muss 56 sein), NICHT den Schlüssel.

2. SHOPIFY-ZUGANG ÜBERLEBT NEUSTARTS: in derselben Umgebungs-Ansicht prüfen, ob SHOPIFY_CLIENT_ID und
   SHOPIFY_CLIENT_SECRET stehen. Fehlen sie: Shopify-Admin → Einstellungen → Apps und Vertriebskanäle →
   App entwickeln → App «autopilot2» → Zugangsdaten (Client-ID + Client-Schlüssel) → beide als Variablen eintragen.
   Melde nur «gesetzt» / «waren schon da» — keine Werte.

3. GOOGLE MERCHANT CENTER — ZIELLAND NUR SCHWEIZ (grösster Gratis-Traffic-Hebel, ~1'700 Produkte
   stehen auf «Missing shipping info»): merchants.google.com → Einstellungen → Versand & Rückgabe:
   jeden Versanddienst öffnen, Lieferland = nur Schweiz (Deutschland/andere entfernen). Dann unter
   Produkte → Diagnose die Zahl «Missing shipping info» ablesen und melden (vorher/nachher).

4. UID INS IMPRESSUM: zefix.ch → Suche «LuxeStyle» (Belp, Einzelfirma des Inhabers). Die CHE-Nummer
   (Format CHE-123.456.789) abschreiben. Shopify-Admin → Onlineshop → Seiten → «Impressum» → unter der
   Adresse eine Zeile «UID: CHE-xxx.xxx.xxx» ergänzen → Speichern. Kein Treffer auf Zefix → melden, nichts eintragen.

5. BESTELLUNG #1004 ARCHIVIEREN (eigene Testbestellung vom Juni, storniert, blockiert die Bestell-Ampel):
   Shopify-Admin → Bestellungen → #1004 → «Bestellung archivieren». Nur diese eine.

6. SHOPIFY INBOX (kostenloser Chat; 2 von 10 Vergleichsshops haben einen, wir keinen):
   Shopify-Admin → Apps → Shopify App Store → «Shopify Inbox» installieren → im Onlineshop-Chat
   die Begrüssung setzen: «Hoi! Fragen zu Versand, Grösse oder Rückgabe? Wir antworten innert 24 h.»
   Benachrichtigung an info@luxestyle.ch aktivieren.

Am Ende: sechs Zeilen Bericht, in derselben Reihenfolge.
```

Hintergrund je Punkt: `dropship/COWORK-AUFTRAEGE.md` (Groq 14.09., Umgebungs-Variablen 08.09.), `CLAUDE.md` 16e
(Merchant-Zielland), `dropship/LERNEN-YOUTUBE-2026-09-14.md` (UID), `dropship/VERGLEICH-SHOPS-2026-09-14.md` (Chat).
