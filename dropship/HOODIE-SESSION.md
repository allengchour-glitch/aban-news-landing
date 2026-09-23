# Hoodie-Session 23.09.2026 — Werbevideo «Herbst ist Hoodie-Zeit»

Betreiber: «hoodie session, mach was mit printful eine coole webungsvideo, oder sonstige cj hoodies».
Ergebnis: zwei fertige Reels (Datei, NICHT gepostet) + zwei Queue-Zeilen zum Anhängen.

## 1. Gemessen (Admin-API 2026-01, 23.09. ~18:30 UTC)

Suche `status:active AND (hoodie OR hoodies | kapuzen* | kapuzenpullover | sweatshirt OR sweatjacke)` → 897
Rohtreffer, lokal gefiltert mit Wortgrenzen (`hood(ie|ies|y)\b`, `kapuzen[-\s]?(pullover|pulli|sweat…)`), ohne
Haustier/Baby/Kinder/Decke/Poncho/Kleid/Jumpsuit (12 + weitere raus). Kanarienvogel: `foo:bar` → 50'016 (Feld
wird STILL ignoriert, bekannt), `zzqqxxnotaword` → 0 (Freitext greift).

| | CJ | POD/Printful |
|---|---|---|
| aktive Hoodies | **556** | **2** (Tag `printful_personalized_product`) — davon ist **1** ein Hoodie, siehe Befund A |
| Preis (min-Variante) | min 14.90 · Median **16.90** · max 107.90 | 38.90 und 82.90 |
| ab CHF 29 | 36 (426 liegen unter CHF 20) | 2 |
| ≥ 2 Bilder | 543 (Median 8 Bilder, 13 mit nur 1) | 2 (je genau 2) |
| Video-Medium im Shop | **0** | 0 |
| in «🔥 Hoodies & Sweatshirts» (Tag `koll-hoodies`) | **52 von 556** | 0 |
| Landeseiten-Sitzungen 30 T (ShopifyQL, human) | 15 Sitzungen auf 12 Produkten (von 1'086 gesamt) | 1 |

Vendor ist bei allen «LuxeStyle» — POD erkennt man am Tag `printful_personalized_product` bzw. an der SKU
`<sync>_<variante>`, CJ an der SKU `CJ-…`.

## 2. Befunde (nicht in diesem Paket geändert — Vorschläge)

- **A · «Unisex Hoodie – Selbst gestalten» ist kein Hoodie.** Printful-Katalog (öffentlich, `/products/variant/5426`):
  «Gildan 18000 Unisex Heavy Blend **Crewneck Sweatshirt**». Beide Shopbilder zeigen einen Rundhals-Pullover, die
  Beschreibung sagt «Sweatshirt … Rippenkragen», nur Titel und Editor-Leinwand (`unisex-hoodie-neu.jpg`, grüner
  Hoodie) sagen Hoodie. Wer «Hoodie» bestellt, bekommt ein Sweatshirt ohne Kapuze. Vorschlag: Titel →
  «Unisex Sweatshirt – Selbst gestalten» und Editor-Leinwand auf ein Rundhals-Bild (über `upload_to_shopify_cdn.mjs`,
  danach `pod_editor_qa.mjs` = 0 Befunde). Nicht im Video verwendet.
- **B · «Strick-Hoodie mit Kapuze für Herren» (CHF 44.90):** alle Bilder tragen links ein Portemonnaie mit
  GG-Monogramm und grün-rot-grünem Streifen (Gucci-Motiv) → Markenmotiv im Produktbild, nicht verwendet.
- **C · «Rundhals-Hoodie für Herren» (CHF 31.90):** Bilder zeigen personalisierte Hunde-Sweatshirts
  («LOUIE», «DIXIE»), keine Kapuze → Titel/Bild passen nicht.
- **D · Hoodie-Kollektion zeigt 52 von 556 CJ-Hoodies** (Smart-Regel nur Tag `koll-hoodies`). Für die
  Herbst-Webseite: Regel um `Titel enthält Hoodie/Kapuzen` erweitern oder Tag nachziehen (DRY + Wortgrenzen).
- **E · Wächter-Falle `warenFamilie()` (post_guard.mjs):** Gruppe `projektor` matcht `sternenhimmel` —
  auch «Loose-Fit Hoodie mit **Sternenhimmel**-Muster». Die Caption von Variante B wird deshalb als
  «projektor» geführt (verzögert B nach einem Projektor-Post bzw. sperrt Projektoren 72 h nach B).
  Vorschlag: `/projektor|beamer|sternenhimmel(?![-\s]*muster)/i`.

## 3. Auswahl (8 CJ + 1 POD, keine Überschneidung zwischen den Varianten)

Regeln: ACTIVE + onlineStoreUrl, ≥ 2 Bilder, ab CHF 29, keine Marken-/Lizenzmotive, Bild ≥ 560 px, kein
Lieferanten-Werbetext im Bild. Kontaktbogen aller 38 Kandidaten per Vision geprüft (Infografiken, Fremdlogos
«BLUREMO»/«WAKEYKOR»/«BE THRIVED», Akku-Heizhoodie, Hundeportraits → aussortiert).

| Var. | Produkt | Preis live | Bilder (media-Index) |
|---|---|---|---|
| A | Relaxed-Fit Hoodie «Cosy» | CHF 39.90 | 3, 2 |
| A | Damen Hoodie aus Nerzimitat-Fell | CHF 37.90 | 2, 0 |
| A | Vielseitiger Hoodie mit langen Ärmeln | CHF 32.90 | 2, 0 |
| A | Kapuzen-Sweatshirt im (American) Streetwear-Stil | CHF 45.90 | 2, 3 |
| A | POD: Allover-Hoodie selbst gestalten (Printful «All-Over Print Recycled Unisex Hoodie») | ab CHF 82.90 | 1, 0 |
| B | (Grauer) Wende-Hoodie mit Reissverschluss | CHF 64.90 | 3, 0 |
| B | Heavyweight Hoodie mit verstärkter Kapuze | CHF 37.90 | 2, 3 |
| B | Loose-Fit Hoodie mit Sternenhimmel-Muster | CHF 29.90 | 2, 0 |
| B | Casual Sport-Hoodie | CHF 32.90 | 2, 0 |

Alle 9 Direktlinks und die Kollektion antworten 200.

## 4. Die Videos

`social/reels/promo_hoodie_herbst_a.mp4` (lounge-sax, 121.75 BPM) · `social/reels/promo_hoodie_herbst_b.mp4` (house2, 126 BPM)

- Aufbau: Hook «Herbst ist / Hoodie-Zeit 🍂» + «N Hoodies ab CHF x» + Fächer aus 3 Produktbildern (steht ab Bild 0,
  Vorschaubild trägt die Botschaft) → je Produkt 4–5 Beats, Bildwechsel auf dem Beat, Ken-Burns + Zoom-Stoss am
  Schnitt, Name + Preis im Fussfeld, Zähler «k/N» → Schluss «Gratis Versand ab CHF 50 · luxestyle.ch · 30 Tage
  Rückgabe · TWINT · Klarna · 🔗 Link in Bio» + Mosaik der gezeigten Ware. Durchgehend fallendes Herbstlaub.
- Sichere Zone: Text nur 200–1440 px, Fusstexte zentriert auf x=470 (links der Knopfleiste); 0–200 und 1440–1920
  tragen nur Hintergrund (TikTok-Suchleiste / Caption).
- Gemessen (`--messen`): A 15.000 s · h264 1080×1920 @ 30 fps · AAC 48 kHz Stereo · **−13.8 LUFS**, TP −2.5 dBFS · 2.56 MB;
  B 15.000 s · gleiches Format · **−14.3 LUFS**, TP −2.3 dBFS · 3.84 MB.
- Schnitte gegen das Beat-Raster nachgemessen (Bilddifferenz im fertigen Video): alle 12 Schnitte je Variante
  ≤ 34 ms (≤ 1 Bild) neben dem Beat; Beat-Phase im fertigen Ton 0.000 s (A) / 0.005 s (B).
- 3 Einzelbilder je Variante per Vision geprüft (0.6 s / 6.2 s / 13.9 s) + Schnittbilder 2.0/3.0/12.0 s.

## 5. Vor dem Posten PFLICHT

```
python3 automation/reel/promo_montage.py --pruefen social/reels/promo_hoodie_herbst_a.mp4   # Exit 0 = ok, 3 = veraltet
```
Das Video trägt seine Preisbehauptungen als JSON im MP4 (Metadatum `comment`). `--pruefen` vergleicht sie mit dem
Live-Shop (ACTIVE, onlineStoreUrl, Preistext). Kanarienvogel: manipuliertes Manifest (CHF 1.00 + erfundener Handle)
→ Exit 3 mit beiden Befunden; altes Reel ohne Manifest → Exit 3.
**Grund:** `meta_reel_post.mjs` prüft den Produktstatus nur für IDs `cjreel-<pid>`; für `promo-hoodie-…` meldet
`produktAktiv()` «keine Produkt-ID im Reel-Namen» und postet ungeprüft.

## 6. Queue

`dropship/HOODIE-QUEUE-ZEILEN.csv` — Kopf identisch mit `automation/reels_seed.csv`, zwei Zeilen
`promo-hoodie-herbst-a` (24.09.) und `-b` (26.09.), `instagram,facebook`, `ready`. Caption: je Produkt Name, Preis
und Direktlink, Preisspanne, Versand/Rückgabe/Zahlarten, Kollektionslink «(Link in Bio)». IG-Live-Signatur
(erste 40 Zeichen) der beiden Zeilen ist verschieden. Nicht in `reels_seed.csv` geschrieben.

## 7. Neu bauen

```
python3 automation/reel/promo_montage.py --variante a --dry     # prüft Shop + Musik, 4 Probebilder nach /tmp/promo_montage_dry
python3 automation/reel/promo_montage.py --variante a,b         # rendert (~40 s je Variante) und misst
```
Andere Ware: neuen Eintrag in `VARIANTEN` (Handle, Anzeigename aus Titelwörtern, Bild-Indizes, Musik).
Das Skript bricht ab (Exit 3), wenn ein Produkt nicht kaufbar ist, ein Name Wörter enthält, die nicht im Titel
stehen, ein Markenwort auftaucht oder ein Bild fehlt/< 560 px ist.
