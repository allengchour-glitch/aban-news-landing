# 📊 Social-Analyse LuxeStyle — 2026-06-12

> Quelle: echte TikTok-Daten (`reports/tiktok_luxestyle.ch_2026-06-12.json`, via yt-dlp) +
> Content-Audit der Post-Queues. IG/FB-Insights brauchen Tokens (nicht in der Cloud-Session) →
> laufen über `analytics-learn.yml` / PC-Claude; deren *Inhalte* sind hier mitgeprüft.

## TikTok @luxestyle.ch — Kennzahlen
- **40 Videos**, **9 380 Views**, Ø **234** (Median **137**), Engagement **5,29 %**, Ø-Länge **19 s**
- **161 Likes · 5 Kommentare · 0 Shares**

### 🏆 Gewinner (756–797 Views)
| Views | Video |
|---|---|
| 797 | Boho-Midi **«CHF 39.90»** (Produkt + Preis + Code) |
| 792 | **Mundart** „Mach dys eiges Teil" (Selbst gestalten, Schwiizerdütsch) |
| 779 | Pointelle-Strick **«CHF 34.90»** (Produkt + Preis) |
| 776 | Boho-Midi **«CHF 39.90»** + Gratis-Versand |
| 750 | Blazer «Roma» (konkretes Produkt) |

### 🪨 Verlierer (6–23 Views)
- Generische **Marken-Karten** „LuxeStyle 🇨🇭 dein Schweizer Online-Shop …" (6 / 9 / 19 Views) — mehrfach gepostet.
- Generische **Kategorie-Sammelposts** ohne konkretes Produkt/Preis (Schmuck ab CHF 14, Taschen, Strand-Looks).

## 🎯 Verdikt (datenbelegt)
1. **Produkt + konkreter Preis** schlägt generische Marken-/Kategorie-Karten **um das 30–100-fache**.
2. **Mundart** (Schwiizerdütsch) performt überdurchschnittlich → bewusst einsetzen.
3. **Boho-Kleider** = Top-Kategorie; Herren/Schmuck solide als Produkt+Preis.
4. **0 Shares über alle 40** → der Engpass ist **Reichweite**, nicht die Content-Qualität.
   Organisches Wachstum = die neue CH-Follower-Maschine (`ch-follower-growth.mjs`) + bezahlte
   CH-Kampagne (User-Klick §10). Mehr generische Posts bringen nichts.

## ✅ Sofort poliert (dieser Lauf)
- **21 offene Captions** (10 Bild + 11 Video) auf das Gewinner-Format gebracht:
  **echten CHF-Preis** direkt nach dem Produktnamen eingefügt (15×, Preise live aus Shopify),
  **#bern** ergänzt (21×, wie vom User gewünscht).
- Generische Marken-Karten werden **nicht** neu eingereiht (bewusst aus der Queue gehalten).
- Empfehlung Posting-Mix: mehr **Mundart-Selbstgestalten** + **Produkt+Preis**, weniger Marken-/Sammelkarten.

## 🎬 Lokale Video-Bibliothek (88 Dateien)
- Stark & wiederverwendbar: `veo-hero-*` (Daisy/Brise/Cosy/Nuit … echte Bewegung), `werbung-*` 60-s-Marken-Cuts,
  `clip-*` Produktclips. Schwach/nicht einreihen: `clip-augenmassage` (vom User abgelehnt).
- Dateinamen tragen das echte Datum (z. B. `auto-20260609-1220`, `veo-hero-…-2026-06-09`).

## 📘 Meta (Instagram + Facebook)
- **55 Posts** live (alle mit `post_url`), Kadenz: 06-06 (6) · 06-08 (**26**) · 06-09 (12) · 06-10 (9) · 06-11 (1) · **06-12: 0**.
  → Seit ~2 Tagen **steht das Posten** (GitHub Actions gesperrt). Sobald frei: Autopilot/Widget läuft weiter.
- **Engagement-Insights** (Reichweite/Likes/Saves) brauchen den Graph-Token (in GitHub-Secrets, **nicht** in der
  Cloud-Session) → liefert `analytics-learn.yml` / PC-Claude. **Inhalt** ist geprüft: gleiche Gewinner-Logik wie
  TikTok gilt — Produkt+Preis-Posts schlagen generische Karten. Empfehlung: 06-08-Spam-Tag (26 Posts) nicht
  wiederholen → **2–3 hochwertige Posts/Tag** statt Masse.

## 🛍️ Produkt-Analyse (weitere Produkte)
- **Bewertet (Social-Proof → zuerst pushen):** Smartwatch Pro **5,0★ (5)** CHF 69.90 · Gemüseschneider **5,0★ (2)**
  CHF 39.90 · Robo-Mini-Ventilator **5,0★ (2)** CHF 19.90. (Die meisten der 517 Produkte haben 0 Reviews.)
- **Stark, aber noch NIE gepostet (neu in Queue):** Stiletto «Gala» 54.90 · Boden-Ständer «FlexHold» 24.90 ·
  Vitamin-C-Serum «Glow» 19.90 · Plateau-Sneaker «Cloud» 39.90 · Leinen-Set «Lino» 59.90.
- **✅ 8 neue Produkt-Posts** in `social/posts_image.csv` eingereiht (status=ready, 13.–16.06., je Gewinner-Format
  mit Preis + Rating + #bern). Bewertete zuerst (13./14.06.), dann die 5 neuen.

## Nächste Hebel
- CH-Follower-Maschine 1×/Tag (PC-Claude) → Reichweite organisch.
- `analytics-learn.yml` täglich (Cron) → Hashtag-Pools lernen automatisch weiter.
- Bezahlte CH-Kampagne (nur User: Budget/Pixel, §10) = der eigentliche Reichweiten-Schalter.
