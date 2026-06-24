# 🏠 Homepage „lebendig" — Theme-Handoff-Spec (2026-06-24)

> User: Homepage wirkt statisch („nur Bilder, wenig Text") → lebendiger + Conversion. Strikt CH, CHF, Mundart-Akzent.
> Assets bereit: `reels/montage-loop.mp4` (2min Loop, stumm) · `social/ai-lifestyle/*.png` (Lifestyle + `-hero` dramatisch).
> **Global:** Video = `<video autoplay muted loop playsinline preload="metadata">` + Poster (sonst kein iOS-Autoplay). ß→ss.

**Sektions-Reihenfolge:** 0 Sticky-Promo · 1 Hero-Video · 2 Trust-Bar · 3 Bestseller-Rail · 4 USP-Marquee · 5 See-Test · 6 TikTok-Strip · 7 Lifestyle-Grid · 8 Review-Strip · 9 Newsletter.

## 1. Hero = Autoplay-Montage-Video ⭐
Vollbreit, `montage-loop.mp4` als Hintergrund (muted/loop/autoplay/playsinline), dunkles Gradient-Overlay, Poster = `blazer-roma-hero.png`. Mobile 78vh.
- H1: **„Dini Garderobe. Dini Bühni."** · Sub: „Premium-Mode & Accessoires – handverlesen für die Schweiz."
- Button1 „Jetzt entdecken →" `/collections/sommer` · Button2 „Bestseller ansehen" `/collections/bestseller`
- Micro: „Gratis Versand ab CHF 65 · 14 Tage Rückgabe"

## 2. Trust-Bar (unter Hero, mobil 2×2, stagger-fade)
`🇨🇭 Schweizer Shop · CHF` · `🚚 Gratis Versand ab CHF 65` · `↩️ 14 Tage Rückgabe` · `🔒 TWINT · Karte · PayPal`

## 3. Bestseller-Rail (horizontal snap-scroll, „Peek" der nächsten Karte, dezenter Auto-Scroll)
Titel „🔥 Grad beliebt" · Sub „Was d'Schwiiz grad am liebste trägt." · „Alle anzeigen →". Karten: Bild/Titel/Preis/Sterne.

## 4. USP-Marquee (endlos laufendes Farbband, pause on-hover)
`WELCOME10 – 10% uf dini erschti Bestellig • Gratis Versand ab CHF 65 • 14 Tage Rückgabe • Handverlesen i de Schwiiz • Sicheri Zahlig •`

## 5. See-Test-Highlight (Split, Bild + CTA, Ken-Burns scroll-in)
Bild `schmuck-set-wasserfest-18k-hero.png` · Badge „WASSERFEST" · H2 „Bliibt schön – au am See." · Text „18K-vergoldeter Edelstahl: wasserfest, anlauffrei, hautfreundlich…" · CTA „Wasserfeste Stücke ansehen →" `/collections/wasserfester-schmuck`

## 6. TikTok-Strip (Logo + 3–4 Reel-Thumbnails, Hover-Scale)
„Gseh uf TikTok 📱" · „@luxestyle.ch – folg üs für Looks & Drops." · CTA → TikTok-Profil. Thumbnails = erste Frames aus `reels/ab-*.mp4`.

## 7. Lifestyle-Grid (3/2 Kacheln, Hover-Zoom + „Shop"-Pill)
`crossbody-lido-hero` → Taschen `/collections/taschen-rucksaecke` · `sonnenbrille-riviera-hero` → `/collections/sonnenbrillen` · `stroh-shopper-capri` → `/collections/sommer`

## 8. Review-Strip ⚠️ NUR mit ECHTEN Reviews (sonst Mechanik bauen, Inhalt nachliefern — NIE Fake)
„★★★★★ · Geliebt vo Chundinne i de ganze Schwiiz" + rotierende Zitate (auto 5s).

## 9. Newsletter WELCOME10 (vor Footer)
H2 „Sicher dir 10% – mit WELCOME10" · Feld „Dini E-Mail" · Button „10% sichere →" · „Kei Spam. Jederziit abmeldbar."

## 0. Sticky-Promo-Bar (fix oben, schliessbar, rotiert 4s)
`✨ WELCOME10 – 10% uf dini erschti Bestellig` ↔ `🚚 Gratis Versand ab CHF 65 · 14 Tage Rückgabe`

**Hinweise:** mobil zuerst; `prefers-reduced-motion` → Poster statt Video; Sektionen unter Fold lazy-load; Links auf reale Collections prüfen (`bestseller` ggf. anlegen). **Fehlt nur:** echte Reviews (Sektion 8).
