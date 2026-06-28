# 📊 Klick-Insights — transparenter, anonymer Klick-Zähler (Setup)

Zeigt **aggregiert, wo Besucher klicken** (welche Buttons/Links/Tool-Karten) — **cookielos,
ohne IP-Speicherung, ohne Personendaten, ohne Fingerprint**, respektiert „Do Not Track".
Standard: **AUS** (kein Request, kein Bruch des „kein Tracking"-Versprechens). Du aktivierst bewusst.

## Bausteine (liegen bereit)
- `js/click-insights.js` — sendet pro Klick nur `{Pfad, kurzes Label}` via `sendBeacon`. **`ON=false`** by default.
- `functions/api/click.js` — zählt anonym in KV (`CLICK_KV`). Ohne KV-Bindung = No-Op (204).
- `functions/api/click-stats.js` — gibt Aggregat als JSON (geschützt durch Env `CLICK_STATS_KEY`).
- `klick-statistik.html` — interne Auswerter-Seite (noindex), Schlüssel eingeben → Ranking „wo wird geklickt".

## Aktivieren (4 Schritte, alles deine Hand)
1. **KV anlegen:** Cloudflare → Workers & Pages → KV → Namespace erstellen (z. B. `aban-clicks`).
   Pages-Projekt `abannews` → Settings → **Bindings** → KV-Bindung **`CLICK_KV`** = dieser Namespace.
2. **Stats-Schlüssel:** Pages → Variables → **`CLICK_STATS_KEY`** = ein langes Geheimnis (Encrypt).
3. **Einschalten:** in `js/click-insights.js` `ON = true` setzen **und** das Skript auf den gewünschten
   Seiten einbinden: `<script defer src="/js/click-insights.js"></script>` vor `</body>`.
4. **Ehrlich bleiben (Pflicht!):** Auf jeder Seite mit dem Skript die sichtbare Aussage „kein/ohne Tracking"
   anpassen **und** den Datenschutz-Textbaustein (unten) in `datenschutz.html` einfügen.

Danach: Klicks sammeln → Auswertung unter **`/klick-statistik.html`** (Schlüssel eingeben).

## ⚠️ Markenregel
Solange `ON=false` und das Skript auf keiner Seite eingebunden ist, passiert **nichts** — das
„kein Tracking"-Versprechen bleibt 1:1 gültig. Schalte erst ein, wenn Schritt 4 erledigt ist.

## Datenschutz-Textbaustein (beim Aktivieren in datenschutz.html einfügen)
> **Anonyme Klick-Statistik.** Auf Teilen dieser Website zählen wir aggregiert und cookielos,
> welche Schaltflächen und Links angeklickt werden, um die Seite zu verbessern. Dabei werden
> **keine personenbezogenen Daten** erhoben: keine IP-Adresse, keine Cookies, kein Fingerprint —
> gespeichert werden nur Seitenpfad, ein kurzes Klick-Label und ein Zähler. „Do Not Track" wird
> respektiert. Verarbeitung erfolgt auf unserer eigenen Infrastruktur (Cloudflare), nicht durch Dritte.
