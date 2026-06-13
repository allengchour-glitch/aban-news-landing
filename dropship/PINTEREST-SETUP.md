# 📌 Pinterest-Autopost — Setup & Betrieb

> **Diese Session besitzt Pinterest** (SHARED-MEMORY). Pinterest wird **autonom + idempotent** aus
> EINER Quelle bespielt — keine andere Session/Person pinnt mehr manuell (sonst Dubletten).

## Wie es läuft (keine Doppelposts)
- **Quelle:** `social/pinterest_queue.csv` (Spalten: id, scheduled_date, image_url, title, description, link, board, status, posted_at, pin_id).
  Generiert aus unseren Produkt-Posts, **dedupliziert pro Produkt-Link** (bewertete + neue Produkte zuerst).
- **Poster:** `automation/pinterest-autopost.mjs` (Pinterest-API v5). Postet bis `MAX_PINS` fällige Pins,
  schreibt Status zurück, **Dedup-Ledger** `social/pinned-done.txt` (Key = Produkt-Link) → derselbe Pin wird
  **nie zweimal** erstellt, auch nicht über mehrere Läufe/Sessions.
- **Workflow:** `.github/workflows/pinterest-autopost.yml` — 2×/Tag (07:20 & 17:20 UTC) + Handy-Button 📌.
  Committet die aktualisierte Queue/Ledger zurück auf `main`.

## Aktivieren (1 User-Schritt)
1. Pinterest-**Developer-App** anlegen (developers.pinterest.com), Scopes: `boards:read`, `pins:read`, `pins:write`.
2. **Access-Token** erzeugen und als **GitHub-Secret** `PINTEREST_ACCESS_TOKEN` setzen.
   (Optional `PINTEREST_BOARD_ID` — sonst nimmt das Tool automatisch das Board „LuxeStyle" bzw. das erste Board.)
3. Fertig — der Cron pinnt 2×/Tag, oder du tippst den 📌-Button im Handy-Widget (`control.html`).

Ohne Token ist alles **No-op** (kein Fehler). Test ohne Posten: Workflow „Run" mit `dry_run = true`.

## Neue Pins ergänzen
Die Queue füllt sich aus den Produkt-Posts; für gezielte neue Pins einfach Zeilen in
`social/pinterest_queue.csv` ergänzen (status=ready). Doppelte Links werden automatisch übersprungen.
