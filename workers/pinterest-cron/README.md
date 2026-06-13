# 📌 Pinterest-Cron-Worker — gratis für immer (Cloudflare)

Postet die fertigen Pins aus `dropship/pinterest_pins.csv` automatisch auf Pinterest —
**kostenlos und dauerhaft** über einen Cloudflare-Cron-Trigger. Kein GitHub Actions,
keine GitLab-CI-Minuten, **keine Kreditkarte** (Cloudflare Free-Plan).

## Warum dieser Weg
| Option | Gratis? | Dauerhaft? | Karte nötig? |
|---|---|---|---|
| GitHub Actions | — | **gesperrt (account-weit)** | — |
| GitLab-CI Schedule | ja (~400 Min/Mt) | ja, im Budget | ja (Verifizierung) |
| **Cloudflare-Cron-Worker** | **ja** | **ja, unbegrenzt** | **nein** |

→ Dieser Worker ist die „soll-immer-gratis-laufen"-Lösung.

## Einrichtung (einmalig, ~10 Min)
1. **Cloudflare-Konto** (hast du schon — abannews liegt dort).
2. **KV-Namespace anlegen** und die ID in `wrangler.toml` eintragen:
   ```
   cd workers/pinterest-cron
   npx wrangler kv namespace create PIN_KV      # gibt eine id aus → in wrangler.toml bei id einsetzen
   ```
3. **Pinterest-Zugang als Secret** setzen — eine der beiden Varianten:
   ```
   # A) einfach (Token läuft ~30 Tage):
   npx wrangler secret put PINTEREST_ACCESS_TOKEN
   # B) empfohlen (läuft nie ab, holt sich pro Lauf einen frischen Token):
   npx wrangler secret put PINTEREST_REFRESH_TOKEN
   npx wrangler secret put PINTEREST_APP_ID
   npx wrangler secret put PINTEREST_APP_SECRET
   ```
   *(Optional Test-Schutz:* `npx wrangler secret put TRIGGER_KEY`*)*
4. **Deployen:**
   ```
   npx wrangler deploy
   ```
   → Der Cron (`0 9 * * 1,4` = Mo & Do 09:00 UTC) läuft ab jetzt von selbst, gratis, dauerhaft.

## Testen ohne auf den Cron zu warten
- Trocken (postet nichts):  `https://<dein-worker>.workers.dev/?key=<TRIGGER_KEY>&dry=1`
- Echt (postet bis zu LIMIT Pins):  `https://<dein-worker>.workers.dev/?key=<TRIGGER_KEY>`

## Stellschrauben (`wrangler.toml` → `[vars]`)
- `LIMIT` — Pins pro Lauf (Standard 5).
- `crons` — Frequenz (z. B. `0 9 * * *` für täglich).
- Vorrat: 103 Pins in der CSV → bei 2×5/Woche ~10 Wochen. Dann „mehr Pins" sagen.

## ⚠️ Einziger echter Blocker: Pinterest „Standard Access"
Die Pinterest-API v5 postet nur mit **Standard Access**. Eine Trial-/„Consumer type"-App
liefert `401 consumer type not supported` — das ist **kein** Token- oder Worker-Fehler.
Standard-Access beantragst du im **Pinterest-Developer-Portal** (App → Access → Request).
Bis dahin: Pins per **Bulk-Upload** oder über den **Shopify-Pinterest-Kanal** (bereits verbunden,
postet Produkt-Pins automatisch & gratis) — siehe `dropship/PINTEREST-SETUP.md`.

Kein Runner (Cloudflare/GitLab/Actions) umgeht diese Freigabe — sie ist die einzige Hürde,
die nur du (bzw. Pinterest-Review) lösen kann. Der Worker selbst läuft dann gratis weiter.
