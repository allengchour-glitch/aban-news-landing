# 🎬 KI-UGC-Ad-Pipeline (gelernt aus YouTube „Claude + Seedance 2.0", 2026-06-24)

> Quelle: *„Claude + Seedance 2.0 Has Changed AI UGC Forever"* (creatorkarro) + Folge-Tutorials
> (4.9× ROAS gemeldet). **Kernidee:** KI erzeugt **UGC-STYLE** Werbevideos (wirken wie echte
> Creator-Clips, nicht Hochglanz) — das **konvertiert besser UND kommt leichter durch TikToks
> Ad-Review** (Hochglanz-Werbung wird strenger geprüft; natives UGC weniger).

## Das Rezept (Modell-unabhängig)
1. **Claude = Strategie-Layer:** aus Produkt-URL/Bild → Brand-Brief, Konkurrenz-Check, Bild-Prompts, Video-Script.
2. **Video-Modell = Render-Layer:** Seedance 2.0 (ByteDance, 1080p + Sync-Audio) ODER **bei uns Luma**
   (`automation/luma_product_video.mjs`, `ray-flash-2`, ~9600 Credits vorhanden = kein neuer Key nötig).
3. **Prompt = kurzer Creator-Brief**, nicht „Produktvideo". Genau diese Bausteine:
   - **Persona** (z. B. „junge Schweizerin, casual, redt in die Kamera")
   - **Umgebung** (Schlafzimmer/Café/am See — alltäglich, nicht Studio)
   - **Hook** (erste 1–3 Sek, Mundart)
   - **Produkt-Aktion** (anziehen/aufklippen/See-Test)
   - **KAMERA-Direktion** ← der wichtigste Trick: `Close-up handheld shot, slight camera wobble — UGC feel`
     (+ pan/tilt/zoom/orbit). Ohne das = generisches „locked camera"-Werbebild.
   - **Proof-Moment** (sichtbarer Beweis: Kette glänzt nach Wasser)
   - **Mood / Audio / CTA**

## Konkrete Umsetzung bei uns (nächster Bau-Schritt)
- **Luma-Prompt-Upgrade:** `luma_product_video.mjs` so erweitern, dass der Prompt obigem Creator-Brief
  folgt (Persona + „handheld, slight wobble, UGC feel" + Proof-Moment). Damit aus unseren Produktbildern
  **UGC-Clips** statt polierter Schwenks entstehen — sofort nutzbar für TikTok-Ads + organisch.
- **Audio-Regel bleibt:** TikTok-Ad = STUMM (Copyright-Scan) → Trend-Sound in-app; Meta = eigene CC-Musik.
- **Safe-Zone bleibt:** Text endet bei y≤1500 (~78 %).
- **Kein teurer Seedance-Key nötig**, solange Luma-Credits reichen; Seedance nur falls Luma-Look/Audio nicht reicht.

## Warum das auf unseren Engpass zahlt
- UGC schlägt Hochglanz (~63 % bessere Performance, 92 % vertrauen UGC) — gelernt 2026-06-24.
- Unser bewiesener Winner „Produkt + CHF-Preis + Mundart" lässt sich als UGC-Hook 1:1 abbilden.
- Mehr saubere, native Creatives = mehr Varianten zum Testen (3–10 pro Produkt) ohne Dreh-Aufwand.
