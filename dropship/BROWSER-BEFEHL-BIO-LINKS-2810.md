# Befehl für Claude im Browser (PC-Claude mit Brave): Bio-Links mit UTM · Stand 28.10.2026

Auftrag des Besitzers am 28.10. («5. ja»): Der Link in der Bio von TikTok und Instagram bekommt UTM-Angaben, damit sichtbar wird, ob die Beiträge Besuche im Shop bringen.
Gemessen am 28.10. (Shopify, 30 Tage): TikTok 530 Sitzungen, davon 0 Käufe, Instagram höchstens 9 Besuche aus 7 063 Aufrufen. Ohne UTM landen Klicks aus der Bio im Topf «direct».

Ziel-Seite: die Sammlung «Kostüme ab Schweizer Lager» (`/collections/kostueme-ch-lager`, lädt mit HTTP 200). Sie ist der Nachfolger der Halloween-Seiten und hatte den
niedrigsten Absprung der Einstiege (29 % bei 14 Sitzungen, dünne Messung). Später (ab etwa 1.12.) wechselt das Ziel auf Geschenke; dann meldet sich Claude mit einem neuen Befehl.

```
Du bist in meinem eingeloggten Browser. Ich bin Inhaber von LuxeStyle CH (luxestyle.ch).
Auftrag: Den Link in der Bio meiner beiden Profile ändern: TikTok (@luxestyle.ch) und Instagram (@luxestyle.ch).

1. TikTok: Profil bearbeiten (tiktok.com > Profil > "Profil bearbeiten"), Feld "Website"/"Link".
   Notiere zuerst den AKTUELLEN Link wörtlich. Trage dann genau diesen ein:
   https://luxestyle.ch/collections/kostueme-ch-lager?utm_source=tiktok&utm_medium=bio&utm_campaign=bio-link

2. Instagram: Profil bearbeiten (instagram.com > Profil > "Profil bearbeiten"), Feld "Links"/"Website".
   Notiere zuerst den AKTUELLEN Link wörtlich. Trage dann genau diesen ein:
   https://luxestyle.ch/collections/kostueme-ch-lager?utm_source=instagram&utm_medium=bio&utm_campaign=bio-link

3. Je Profil speichern, die Profilseite neu laden und den Link anklicken: Er muss die Sammlung
   "Kostüme ab Schweizer Lager" öffnen (Kostüme sichtbar, kein 404).

Regeln:
- Nur den Link ändern. Name, Beschreibung, Bild und alle anderen Einstellungen bleiben, wie sie sind.
- Bei Login, 2FA, Captcha oder einer unklaren Option: anhalten und mich fragen. Nichts raten.
- Lässt TikTok den Link nicht ändern (bei Privatkonten ohne Link-Freischaltung möglich): melde das und erzwinge nichts.
- Den UTM-Teil (alles ab dem Fragezeichen) nicht kürzen und nicht ändern, auch wenn die App ihn hässlich findet.

Bericht am Schluss, kurz, je Profil:
- alter Link (wörtlich), neuer Link, gespeichert ja/nein (mit Grund)
- ein Screenshot der gespeicherten Profilseite
```

Nachmessung (Claude, nach 14 Tagen): Sitzungen je Quelle `utm_source=tiktok|instagram` und `utm_medium=bio` in Shopify (ShopifyQL `FROM sessions SHOW sessions, sessions_with_cart_additions GROUP BY utm_source, utm_medium`).
Unter einer Sitzung pro Tag aus einer Bio wird die Menge der Beiträge neu entschieden (Entscheid beim Besitzer).
