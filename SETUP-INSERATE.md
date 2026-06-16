# 🟢 Echte Inserate freischalten (5 Minuten, einmalig)

Die Inserate-Funktion ist **komplett gebaut und live** — Aufgabe-Formular, Moderation,
Anzeige, Filter, Suche. Solange noch **keine Datenbank verbunden** ist, zeigt die Seite
**Beispiel-Inserate** und das Aufgeben-Formular meldet „wird gerade eingerichtet".

Diese **eine** Sache kann nur jemand mit **Cloudflare-Zugang** machen (ich als KI habe
keinen Cloudflare-Login). Danach läuft alles autonom.

---

## Schritt 1 — Datenbank anlegen (D1)
Im Terminal (mit eingeloggtem `wrangler`):
```bash
npx wrangler d1 create inserate
```
Das gibt eine **`database_id`** aus — merken.

## Schritt 2 — Tabelle einspielen
```bash
npx wrangler d1 execute inserate --remote --file=db/inserate-schema.sql
```
(Das Schema liegt im Repo unter `db/inserate-schema.sql`.)

## Schritt 3 — An das Pages-Projekt binden
Cloudflare-Dashboard → **Workers & Pages → `abannews` → Settings → Functions → D1 database bindings**
→ **Add binding**:
- **Variable name:** `DB`  ← genau so (Grossbuchstaben)
- **D1 database:** `inserate`

## Schritt 4 — Admin-Token setzen (für die Freigabe)
Cloudflare-Dashboard → **`abannews` → Settings → Environment variables → Add**:
- **Name:** `ADMIN_TOKEN`
- **Value:** ein langes, geheimes Passwort (z. B. 32 Zeichen)

Danach einmal neu deployen (oder einfach den nächsten Merge abwarten).

---

## Fertig — so läuft es dann
1. **Nutzer** gibt ein Inserat auf: `https://abannews.com/inserat-aufgeben.html`
   → landet als `pending` in der Datenbank.
2. **Du** prüfst & gibst frei: `https://abannews.com/inserate-admin.html`
   → oben das `ADMIN_TOKEN` eingeben → „approve".
3. **Sofort live:** Das Inserat erscheint auf `inserate.html` und in der Universal-Suche
   (`suche.html`) — die Beispiele verschwinden automatisch, sobald echte Inserate da sind.

## Gut zu wissen
- **Spam-Schutz** ist eingebaut: Honeypot-Feld + max. 5 Einreichungen pro IP / 10 Minuten.
- **Ablauf:** Inserate laufen nach 60 Tagen automatisch aus (`expires`).
- **Bilder:** nur `https://`-Bild-URLs werden akzeptiert.
- **Optional – Portale mit-einblenden:** Sind in `INSERATE-PORTALE.md` Portale (Comparis/
  Homegate/…) via `LISTING_PORTALS` konfiguriert, mischt `inserate-list` deren Treffer mit ein.
- **Self-Check:** `https://abannews.com/api/inserate-list` → liefert es `{"demo":true}`,
  ist die DB noch **nicht** verbunden; liefert es `{"items":[…]}`, läuft es echt.

Stand: 2026-06-16.
