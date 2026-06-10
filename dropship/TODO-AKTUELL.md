# ✅ TODO-AKTUELL — LuxeStyle (Stand 2026-06-11)

> Was läuft, was offen ist. Aktuellster Stand auch in `MEMORY-KOMPAKT.md` (oben).

## 🟢 LIVE & verifiziert (nichts zu tun)
- [x] **Sprache je Land** — DE/EN/FR/IT published, Shopify schaltet je Land automatisch um.
- [x] **Übersetzungen DE→FR/IT/EN** — Hero verifiziert; Katalog (~517 Produkte) + Theme laufen autonom weiter
      (`translate.yml`, Ledger-Commit je Scope). Bei Abbruch: Workflow erneut `dry_run=false` → setzt fort.
- [x] **Lieferzeit-Anzeige Phase 1** — Block + Metafeld `custom.lieferzeit` auf allen aktiven Produkten.
- [x] **Prodigi-Connector + 5 weitere Workflows** gebaut, getestet (no-op-safe), auf `main`.

## 🔵 Nur DU (1-Klick, schaltet Gebautes scharf)
- [ ] **`PRODIGI_API_KEY` als GitHub-Secret setzen** (gratis Konto auf prodigi.com → Dashboard → API-Key).
      Repo → Settings → Secrets and variables → Actions → New secret: `PRODIGI_API_KEY`.
      Danach ICH/Workflow: `prodigi-check.yml` → `prodigi-products.yml` (dry_run=false) = 10 Schweiz-Poster live.
- [ ] **Spocket** (kein API): App installieren + gute EU/US-Produkte importieren → ich veredle sie automatisch
      (SEO, Collections, Lieferzeit-Block, Übersetzung, Social-Posts).

## 🟡 Nächste Ausbaustufen (ICH autonom, auf Zuruf / nächste Session)
- [ ] **Lieferzeit Phase 2** (dynamisches Theme-Snippet, zeigt NUR die Zeile fürs Kundenland, 4-sprachig):
      `delivery-snippet.yml` dispatchen — vorher die richtige Produkt-`SECTION` des Live-Themes prüfen
      (Default `sections/main-product.liquid`). Backup + `REMOVE=1`-Rollback vorhanden.
- [ ] **Markt-Web-Presence prüfen:** Falls FR/IT/EN in einem Markt nicht automatisch erscheint →
      Admin → Märkte → jeweiligen Markt → Sprachen ergänzen (bewusst NICHT per Skript = Parallel-Session-Schutz).
- [ ] **Tier-Feinschliff Lieferzeit:** Alt-Produkte ohne `cj-real`-Tag bekommen Tier „standard" (6–12 T).
      Optional: cj-Produkte sauber taggen → genauere 8–14 T. (Aktuell plausibel, kein Muss.)
- [ ] **Schweiz-Edition-Collection füllen** (separater Plan): Fertig-Sticker via Printful-Metafeld-Muster + Collection-SEO.

## ⚙️ Workflows (workflow_dispatch)
prodigi-check · prodigi-products · prodigi-sync(cron 6h) · delivery-block(+cron Mo) · delivery-snippet ·
markets-languages · translate(hero→catalog→theme, Timeout 330min, Ledger-Commit je Scope)

## 📌 Wichtige Fakten
- **Prodigi:** `https://api.prodigi.com/v4.0`, Header `X-API-Key`. Shopify-Variant-SKU = DIREKT Prodigi-SKU (z.B. `GLOBAL-FAP-A3`).
- **Fertigware-Druck-Muster:** Tag `*_personalized_product` (ohne `wunschdesign`) + Metafeld `custom.print_file` = Motiv-URL.
- **Git:** alles auf `main` via `_mp_*`-Branch + Rebase. NIE force-push, NIE Parallel-Session überschreiben.
- **Reprice-Falle:** `printful_reprice.mjs` NICHT mit Default `MIN_MARGE=12` auf kleine POD (Sticker/Magnete) — nur `MIN_MARGE=2`.
