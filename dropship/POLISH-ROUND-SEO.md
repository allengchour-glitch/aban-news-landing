# Polish-Runde SEO-Meta (autonom, „voll gas") — Stand 2026-05-30

> Auftrag: „mach autonom … polish eine runde voll gas 50 agenten" (CJ-Import #4 = erledigt, übersprungen).
> Scope: **nur Produkt-Metadaten** (seo.title / seo.description) der 1.156 aktiven Produkte.
> NICHT angefasst: Live-Theme (API-gesperrt), Preise, Status, Bilder.

## Befund (Diagnose an Stichprobe von 50 aktiven Produkten)

Die Titel selbst sind sauber (das „premiumPremium:633"-Signal aus der vorigen Runde war
ein Shopify-Such-Tokenizer-Artefakt — jeder Titel hat nur EIN „Premium"). ABER die
**SEO-Meta-Felder** haben echte Defekte, die die frühere Titel-Bereinigung nicht erfasst hat:

| Kat | Defekt | Fix | Beispiel |
|-----|--------|-----|----------|
| **A_brand** | `seo.title` trägt noch „LuxeStyle CH" | → „LuxeStyle" (vom User explizit gefordert: „ohne CH") | „24K Gold Eye-Patches … · LuxeStyle CH" |
| **B_notitle** | `seo.title` = null | sauberen Meta-Titel aus Produkt generieren | mehrere |
| **C_nodesc** | `seo.description` = null | kundenorientierte Meta-Description schreiben | 15411554320769 (SEO komplett leer) |
| **D_internalnote** | Meta-Description ist interne Markt-Recherche-Notiz statt Kundentext | neu schreiben | „Homeoffice-Quote CH 40%+. Ergonomie-Produkte sind Brack-Dauer-Bestseller." |
| **E_truncated** | Meta-Description mitten im Wort abgeschnitten | reparieren | „…Reise-tauglich und ohne K" |

## Vorgehen

1. **Recon-Agent** (read-only) paginiert alle ~1.156 aktiven Produkte, klassifiziert nach
   A–E, schreibt Worklist `/tmp/seo_worklist.jsonl` (1 Zeile/Produkt mit ≥1 Defekt).
2. **~10 parallele Fixer-Agenten** (bewusst NICHT 50: Shopify Admin-API hat EINEN geteilten
   Rate-Limit-Bucket pro Shop — 50 gleichzeitige Schreiber drosseln sich gegenseitig in
   Fehler und werden langsamer. 10 gut getaktete Worker sättigen das Limit sauber).
   Jeder Fixer nimmt einen Slice der Worklist und schreibt via `productUpdate`-Mutation
   (`input: { id, seo: { title, description } }`).

### Fix-Regeln (für die Fixer)
- **A_brand:** in `seo.title` exakt „LuxeStyle CH" → „LuxeStyle" ersetzen (rein mechanisch).
- **B/C:** Meta aus echtem Produkt-Inhalt ableiten — NIE Specs erfinden. Titel ≤ ~60 Zeichen,
  Description ~120–155 Zeichen, kundenorientiert, mit „LuxeStyle" (ohne CH) als Brand.
- **D:** interne Notiz verwerfen, Description aus der echten Produktbeschreibung neu schreiben.
- **E:** abgeschnittenen Satz sauber zu Ende führen / kürzen.

## Status
- [x] Diagnose an Stichprobe (50) — Defekte A–E bestätigt
- [x] Recon-Agent: alle 1.156 aktiven Produkte gescannt → **1.106 mit ≥1 Defekt**
  - A_brand 943 · B_notitle 141 · C_nodesc 8 · D_internalnote 9 · E_truncated 70
- [x] Pilot: `productUpdate(product:{id, seo:{title,description}})` verifiziert.
  **Wichtiger Befund:** `seo` ist ein FULL-REPLACE — nur `title` senden NULLT `description`.
  Regel für alle Fixer: IMMER beide Felder senden.
- [x] **Fixer-Fan-out: 8 parallele Agenten, je ~134–147 Produkte → 1.106/1.106 erledigt, 0 echte Fehler.**
  - Transiente Cloudflare-502 (je 1× in Chunk 01/02/07) sofort nachgezogen.
  - ~40 lange B_notitle-Titel: Shopify speichert `seo.title=null`, weil = Produkttitel →
    rendert den (sauberen) Produkttitel als Meta-Titel. Korrektes Fallback, kein Fehler.
  - 87 C/D/E-Produkte: echte Produktbeschreibung via get-product gelesen, frische
    kundenorientierte Meta-Descriptions (110–155 Zeichen) geschrieben. Interne Notizen
    (Galaxus/Brack/Quote etc.) komplett verworfen.
  - Nebenbei: ein paar Encoding-Glitches (🇨🇭, Kyrillisch „Geldклип") gefixt.
- [x] **Verifikation (read-only Voll-Scan, alle 1.156 aktiven Produkte):**
  - seo.title mit „LuxeStyle CH": **0** ✓
  - seo.description null/leer: **0** ✓ (jedes Produkt hat eine Meta-Description)
  - seo.title null: 49 (gewolltes Fallback auf sauberen Produkttitel)
  - Aufgedeckt: 7 Rest-Defekte in Descriptions, die das enge D-Keyword-Raster verpasst hatte
    (1× „LuxeStyle CH" im Text + 6 Markt-Notizen in anderer Formulierung, z.B.
    „Schweizer sind Outdoor-Nation #1", „Biohacking-Trend erreicht Mainstream").
- [x] **Nachfass-Agent (breites Raster + Urteilsvermögen):** alle 7 Rest-Defekte aus echten
  Produkt-Bodies neu geschrieben, 0 Fehler. Legitime Copy (z.B. echte „virale TikTok"-Produkte)
  korrekt unangetastet gelassen. **Endstand: 0× „LuxeStyle CH" katalogweit, 0 Markt-Notiz-Metas.**

## ✅ ENDSTAND Polish-Runde
- **1.113 aktive Produkte** an SEO-Meta poliert (1.106 Worklist + 7 Nachfass), **0 echte Fehler**.
- Alle 1.156 aktiven Produkte verifiziert sauber: einheitliche Marke „LuxeStyle" (ohne CH) in
  Titel & Meta, keine null-Descriptions, keine internen Recherche-Notizen mehr als Kundentext.
- 9 parallele Agenten-Läufe (Recon + 8 Fixer + Verifikation + Nachfass), Cloudflare-502 &
  Encoding-Glitches transient abgefangen. Rein Metadaten — Preise/Status/Bilder/Live-Theme unberührt.

### Ergebnis-Verteilung Fixer (done-logs, 1.106 unique IDs)
| Chunk | Produkte |
|-------|----------|
| 00 | 136 | 01 | 134 | 02 | 134 | 03 | 145 |
| 04 | 145 | 05 | 147 | 06 | 136 | 07 | 128 |
| Pilot+8 manuell verifiziert | 9 (in Summe enthalten) |

> Reversibel: Änderungen betreffen nur Metadaten; alte Werte stehen in der Worklist
> (`seoTitle`/`seoDesc`) bzw. lassen sich aus der Produktbeschreibung neu ableiten.

## Offen für Allen (unverändert, Admin/Theme, je 1 Klick)
- Branded-Theme „Horizon · LuxeStyle Branded" veröffentlichen → alle Optik-Verbesserungen live.
- Grabbel-/Saison-Collections im Admin ausblenden.
- CJ-API-Key rotieren (stand mal im Chat).
