---
tags: [projekt, shop]
quelle: CLAUDE.md, SHARED-MEMORY.md
---
# LuxeStyle (Shopify-Shop)

Mode- und Lifestyle-Dropshipping-Shop. `luxestyle.ch`, Backend `au3j0y-hq.myshopify.com`,
Theme `Horizon · LuxeStyle + Email-Popup (Claude)`.

Zugriff über die Shopify-Werkzeuge direkt — das funktioniert auch bei [[Actions-Sperre]] und ist
damit der einzige verbleibende autonome Hebel am Shop.

## Stand

| Sache | Wert |
|---|---|
| Produkte aktiv | 10 000+ (Füll-Session), davon rund 529 `cj-real` |
| Bezahlte Bestellungen | 2 — siehe [[Erste-Verkaeufe]] |
| Conversion 30 Tage | 0,0 % bei 2994 Sessions — [[Masse-ist-kein-Hebel]] |
| Produkte ohne Reviews | 518 von 529 (98 %) — [[Reviews-Importer]] |
| Google Merchant | 32 812 Angebote für CH freigegeben — [[Google-Merchant]] |

## Fester Branch

`claude/luxestyle-product-CizQ6`, Draft-PR nach `main`. Nie direkt nach `main` — dafür gibt es den Skill `git-und-pr`, und die Begründung
steht in [[Stale-Ref-Falle]].

## Fallen, die hier gelten

[[Publish-Falle]] · [[Collections-Publish-Falle]] · [[Bild-Falle]] · [[Tag-Regel-Falle]] ·
[[Sechs-Publications]] · [[Fake-Reviews]]

## Bewusst nicht anfassen

Das Kundenkonto-Menü `account.luxestyle.com.co` ist von **Shopify selbst** konfiguriert.
`luxestyle.ch/account` leitet per 302 dorthin, `account.luxestyle.ch` hat kein DNS. Ein Umbiegen
auf `.ch` zerstört den Login.

Runbook: `dropship/AUTONOMER-MODUS.md` · Historie: `dropship/CJ-IMPORT-LOG.md`
