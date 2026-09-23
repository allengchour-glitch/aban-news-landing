---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-23 Nachtrag 21
gelernt: 2026-09-23
---
# Reel-Poster-Tor: CJ-pid ist keine Shopify-ID — Form erkennen, sonst sperrt das Tor die neue Ware aus

GEMESSEN 23.09.2026 04:08 UTC: meta_reel_post fragte cjreel-1443876506416844800 als gid://shopify/Product/… → null → «existiert nicht mehr», Produkt ist ACTIVE (SKU-Suche 15525513822593); UUID-pids umgingen das Tor. Fix: 12–15 Ziffern = Shopify-ID, sonst products(query:"sku:CJ-<pid>"); in meta_reel_post + metricool_tiktok_post.

Verwandt: [[Hypothese-mit-Datum]]
