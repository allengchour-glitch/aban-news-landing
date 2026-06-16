# 🎯 Influencer-Targets — CH-Follower-Wachstum (LuxeStyle)

> Strategie „Influencer folgen": nicht (nur) den Influencern selbst folgen, sondern **deren engagierter
> Zielgruppe** (aktive Liker/Kommentierende). Das sind genau unsere Wunschkund:innen (CH-Mode/Beauty/Lifestyle).
> **Ausführung NUR am PC-Claude** (Browser/CDP) — IG/TikTok haben keine Follow-API. Kein Kauf, keine Fakes.

## So läuft's (PC-Claude, eingeloggtes Brave auf Port 9222)
```
node automation/local/ch-follower-growth.mjs            # IG-Influencer + Hashtags + TikTok, Tages-Caps
node automation/local/ch-follower-growth.mjs --dry      # nur zeigen
node automation/local/ch-follower-growth.mjs --comments # DAZU: auf Influencer-Posts kommentieren (Opt-in, Cap 6)
node automation/local/ch-unfollow.mjs                   # 1x/Woche: Nicht-Zurückfolger entfolgen
```
Sicher gegen Sperren: Tages-Caps (IG 40 / TikTok 30), Pausen 25–70 s, idempotent (`ch-growth-ledger.txt`),
Stopp bei „Action blocked".

**Influencer-Modus (neu):** Das Skript folgt jetzt den Seeds aktiv, liked deren neue Beiträge und — NUR mit
`--comments` — setzt kurze, echte **Mundart-Kommentare** (Cap 6, KEIN Link/kein Marken-Promo = sonst Spam-Flag).
⚠️ Auto-Kommentare sind die riskanteste Aktion → standardmäßig AUS; sparsam einsetzen oder lieber manuell.

## ✅ Verifizierte Seed-Influencer (in `ch-follower-growth.mjs` aktiv)
Schweiz / Zürich, Fashion & Beauty — **kein Deutschland** (Geo-Regel):
- **@oliviafaeh** — Olivia Faeh, Zürich, Fashion/Streetwear (~254k)
- **@mimoza** — Mimoza Lekaj, Zürich, Beauty/Fashion (~368k)
- **@omnibloomofficial** — Andreea Bîrsan, Zürich, Luxury Fashion/Lifestyle

## 🔎 Weitere Kandidaten — VOR Nutzung Handle verifizieren
(Namen aus Recherche; Handle am PC kurz prüfen, dann in `IG_SEED_ACCOUNTS` ergänzen)
- Slavia Karlen — Bern, Lifestyle/Travel/Wellness (ideal für #bern-Fokus!)
- Weitere via modash.io/find-influencers/switzerland/fashion bzw. /micro (≤25k = höchste Engagement-Rate)

## Hinweise
- **Micro (≤25k) > Mega:** kleinere CH-Accounts haben höhere Engagement-Rate → deren Liker folgen eher zurück.
- **Bern-Fokus:** zusätzlich zu Seeds laufen die Hashtag-Quellen #bern/#berncity/#schweizmode (im Skript).
- **Geo:** ausschließlich CH-Influencer als Seeds — keine DE-Accounts (würde DE-Zielgruppe anziehen).
- Reversibel: `ch-unfollow.mjs` entfolgt nach ~14 Tagen die, die nicht zurückfolgen (behält „folgt dir").
