# 📊 LuxeStyle CH — Kompakter Shop-Status (2026-06-13)

> Schnell-Überblick für jede Session. Details: `CLAUDE.md`, `SHARED-MEMORY.md`,
> `dropship/CJ-IMPORT-LOG.md`, `dropship/WEBSITE-LAYOUT-REDESIGN.md`.

## 🟢 Zahlen (live via Shopify-MCP)
| Kennzahl | Wert |
|---|---|
| Aktive Produkte | **1.192** (davon **333** `cj-real`) |
| Bestellungen (30 T) | **0** |
| WELCOME10 | **ACTIVE** (10 %, bis 31.08.2026) |
| Sessions (30 T, lt. Analytics) | ~3.000 · 0,37 % Add-to-Cart · **0,0 % Conversion** |

## ✅ Webseite — Zustand (mein Zuständigkeitsbereich)
- **Katalog/Bilder:** Alt-Texte auf allen Hero-/Bestseller-Produkten gesetzt (deskriptiv,
  meist „… – LuxeStyle"). Bild-QA der cj-real: 0 FAILED.
- **Kategorie-Banner:** 9 moderne Banner (Creme/Taupe/Gold, editorial) live als `collection.image`
  (Frauen/Herren/Schmuck/Schuhe/Wohnen/Beauty/Trends/Geschenke/Sale). Tool: `automation/gen_category_banners.py`.
- **Menü:** aufgeräumt (saisonales „1. August" raus, Herren entdoppelt), Unterkategorien in Dropdowns.
- **Trust-Konsistenz:** Alle 9 Hauptkategorien **+ jetzt alle 20 Menü-Unterkategorien** haben die
  volle Trust-Zeile: *🇨🇭 Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · TWINT & sichere Bezahlung · –10% mit Code WELCOME10*.
- **Collections:** Smart-Collections sortieren neue Produkte automatisch per Tag/Preis
  (Ausnahme `premium-schmuck` = manuell, siehe Wartungshinweis im Layout-Doc).
- **Conversion-Integrität:** „CJ"-Leak in „Neuheiten 2026" behoben; niedrig-bewertetes Produkt
  per Regel aus Startseite/Landing ausgeschlossen.

## ⏳ Offen — braucht Customizer/PC-Claude (Theme-Writes API-gesperrt)
- Startseiten-Sektions-Rhythmus (Color-Schemes abwechseln, Lifestyle-Band, „Shop nach Kategorie"-Kacheln,
  1 Taupe-Akzent-Sektion) → exakte Schritte in `WEBSITE-LAYOUT-REDESIGN.md`.
- Collection-Banner als Kopf auf Kategorieseiten aktivieren (Customizer → „Collection banner"-Sektion).

## 🚦 Echter Engpass = Reichweite/Traffic-Qualität, NICHT der Shop
Shop & Funnel sind verkaufsbereit. Hebel, die **nur der User** ziehen kann:
1. TikTok-Pixel + Conversion-Kampagne (Budget) — Ads sind nicht mein Bereich.
2. AGB-Domain final.
3. Pinterest scharfschalten (Konto/Claim) — 103 fertige Pins + Automation liegen bereit
   (`dropship/pinterest_pins.csv`, `automation/pinterest_publish.mjs`).

## ⚠️ Rahmenbedingungen
- **GitHub Actions account-weit GESPERRT** → keine Crons; Shopify-MCP + GitHub-API funktionieren.
- **Live-Theme-Writes API-gesperrt** → Layout-Feinschliff nur im Customizer.
- `.com.co`-Domain (Kundenkonto-Portal) **nicht anfassen** — bricht sonst den Login.

---
*Stand 2026-06-13 · Webseiten-Pflege-Session · Branch siehe PR.*
