# TikTok-Profi-Paket @luxestyle.ch (2026-07-06)

Ziel: Account professionell + Follower-Wachstum. Aufgeteilt in (A) sofort autonom erledigt,
(B) PC-Claude-Browser-Auftrag (1× kopieren), (C) laufende Maschine.

## A) Autonom erledigt / läuft
- **Ads = bezahlte Reichweite LIVE:** Conversion-Kampagne 20 CHF/Tag (Kampagne `1869987705486481`,
  genehmigt) → bringt täglich zielgruppengenaue Profil-/Shop-Besucher (CH, Frauen 18–34).
- **Content-Nachschub:** Reel-Queue `automation/reels_seed.csv` — 3 × `ready` (CDN-URLs geprüft),
  1 Reel bereits in den TikTok-Entwürfen. Video-Stil fix: ohne Voiceover, Musik `luxe-premium.wav`,
  nie dasselbe Produkt doppelt (Queue-Ledger).
- **Hashtag-Strategie (aus TikTok-Analytics gelernt, `learned_pools.sh`):** Preis-Anker-Captions
  schlagen generische 20:1. Sets rotieren: {#schweizmode #fashionschweiz #ootdschweiz} ·
  {#gadgets #viral #tiktokmademebuyit} · {#luxestyle #fyp} + produktspezifisch.

## B) PC-Claude-Browser-Auftrag (Profil-Politur — TikTok hat KEINE Profil-API)
> **An PC-Claude kopieren:** «Öffne TikTok (Brave, Port 9222, eingeloggt) → Profil @luxestyle.ch
> → Profil bearbeiten. Setze:
> **Name:** LuxeStyle Schweiz 🇨🇭
> **Bio:** `Dein Schweizer Shop ✨ Mode · Schmuck · Gadgets\n🚚 Gratis ab CHF 65 · 10% Code WELCOME10\n👇 Shop`
> **Website:** https://luxestyle.ch/collections/viral-hits
> **Profilbild:** nimm `automation/local/profil-politur-browser.mjs` (lädt das LuxeStyle-Logo
> automatisch) ODER manuell pod/luxestyle-ch-logo.png.
> Danach: 3 beste Reels oben anpinnen (Viral-Reel zuerst), Kommentare der letzten 10 Videos
> beantworten (freundlich, DE, mit CTA in den Shop).»

## C) Follower-Maschine (Regeln für jede Session)
1. **1–2 Reels/Tag** aus der Queue in Entwürfe/posten (Token nötig → User oder PC-Claude).
2. **Kommentar-Pflege:** Auf jedes neue Kommentar innert 24 h antworten (Algorithmus-Boost).
3. **Trend-Sounds:** `-clean.mp4`-Varianten nutzen + Trend-Sound in der App drüberlegen (PC-Claude).
4. **Cross-Promo:** Jedes Reel auch als IG-Reel (Meta-Token nötig, User-Klick offen).
5. **Analytics-Lernschleife:** `automation/learn_from_analytics.mjs` → beste Hooks/Hashtags
   fliessen automatisch in neue Renders.
6. **Nie:** Follower kaufen / Follow-Unfollow-Spam — killt die Reichweite dauerhaft.

## Offene User-Klicks (einmalig)
- TikTok-App-Audit auf developers.tiktok.com → dann postet der Bot VOLL selbst (public statt Entwurf).
- Frische TT-Tokens (TT_ACCESS_TOKEN/TT_REFRESH_TOKEN/TT_CLIENT_KEY/TT_CLIENT_SECRET) an die
  Session geben → Entwürfe-Push sofort wieder autonom.
