# 🎛️ TikTok Ads Manager beherrschen (ads.tiktok.com)

> Konto: **LuxeStyle CH Ads** (aadvid 7646349875793182738). Struktur: **Kampagne → Ad-Group → Ad**.
> Wichtig: **Erst AUS schalten (Toggle), kurz warten, DANN löschen** — Aktives/„Delivering" lässt sich nicht löschen.

## 🔴 SOFORT: die abgelehnte Ad fixen (Grund = URL als „Adult" geflaggt = Fehlalarm)
1. **Campaigns** → Tab **Ad** → die Ad „Ad name 2026-06-06" anklicken.
2. **Edit** → **Landing-URL ändern** auf etwas eindeutig-Jugendfreies:
   `https://luxestyle.ch/collections/wasserfester-schmuck` **oder** `https://luxestyle.ch`.
   (Bademode/Massage/Wellness als Landing meiden — triggert den Adult-Filter.)
3. **Speichern → neu einreichen** (Resubmit for review). ODER **„View more" → Einspruch/Request review** (es ist nachweislich falsch: Schmuck ≠ Adult).
4. Sobald „Approved" → Ad-Group/Toggle **AN** → liefert aus → Ad-Klicks kommen.

## ⏸️ Pausieren vs. 🗑️ Löschen
- **Toggle AUS** (Off-Schalter neben dem Eintrag) = **pausieren** → Budget stoppt, Daten/Creatives bleiben, jederzeit wieder AN. **Empfohlen** statt löschen.
- **Löschen** = Häkchen setzen → **Delete** → bestätigen = **permanent, nicht wiederherstellbar**. Vorher AUS schalten + paar Minuten warten.

## 🗑️ Was nicht gebraucht wird löschen (Schritt für Schritt)
1. **Campaigns** → richtigen Tab wählen: **Campaign** / **Ad Group** / **Ad**.
2. Eintrag **AUS** schalten (Toggle), ~2 Min warten (Status muss von „Delivering" weg).
3. **Häkchen** links setzen → oben **Delete** → bestätigen.
4. **Bulk-Limits:** max **1 Kampagne**, **20 Ad-Groups**, **50 Ads** pro Ad-Group auf einmal.
5. **Entwürfe (Drafts):** Tab/Filter „Draft" → auswählen → löschen.
6. Ausnahme: iOS-14.5-Dedicated-Campaign-Ad-Group kann man nicht einzeln löschen.

## 🧭 Die Seite verstehen (Spalten/Filter)
- **On/off** (Toggle), **Status** (Approved/Not approved/Delivering/Paused), **Budget**, **Bid**, **Spend**, **Results**.
- Oben **Filter „Ad ID contains…"** zeigt evtl. nur EINE — auf **„Clear"** klicken, um ALLE Kampagnen zu sehen.
- **Datumsbereich** rechts oben prüfen (sonst zeigt's leere Zahlen für den falschen Zeitraum).

## 🤖 Automatisierung (ehrlich)
- **Sauberer Weg = TikTok Marketing API** (`/campaign/update/`, `/campaign/status/update/` mit DELETE/DISABLE) → braucht `TT_MKT_TOKEN` (App-Audit + Firmen-Verifizierung = aktuell blockiert ohne Geschäfts-Doku).
- **Browser-Automatik** könnte es klicken, ist aber bei TikTok unzuverlässig (wie Kampagne-erstellen/Post-löschen). → **Bis Token da: du machst Pause/Delete/Edit in der UI** (oben), ich bereite Configs/Creatives vor.

## ✅ Aufräum-Empfehlung jetzt
- Die alte abgelehnte Kampagne: **entweder URL fixen + resubmit** (besser, behält Setup) **oder** AUS + löschen, dann sauber neu mit guter Landing-URL + sauberem Seedance-Creative.
