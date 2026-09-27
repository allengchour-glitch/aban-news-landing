# Meisterwerk-Tor vor jedem Reel-Post (27.09.2026)
Betreiber: «mache keine billige einfache post, jeder soll ein meisterwerk sein».

## Gemessen
- Metricool 30 T: TikTok Ø Wiedergabe 1,8 s von 11 s; Instagram-Reels 67 % Skip-Rate → die erste Sekunde entscheidet.
- `automation/meisterwerk_tor.py` an 11 wartenden + 14 geposteten Reels: **3/11 wartende** und **8/14 gepostete**
  mit stehendem Einstieg (Bewegung 1. Sekunde < 3,0; Spitzenwerte der guten 4–13).
- Die zwei für heute Abend geplanten Posts fielen durch: TikTok cjreel-15449433342337 (Hook 1,3) und IG+FB
  cjreel-15449433440641 (Hook 0,4, 78 % Standbild; Sichtprüfung: Diashow mit grauen Balken **und Bildpreis CHF 4.90
  bei Live-Preis CHF 15.90**) → beide aus dem Metricool-Plan gelöscht (200), YouTube-Short (Hook 8,56) bleibt.

## Getan
- Tor: Format ≥1080×1920 9:16 · Dauer 6–35 s · Ton −30…−8 LUFS · Hook ≥ 3,0 · Standbild-Anteil ≤ 50 %.
  Exit 4 = durchgefallen → `meisterwerk-tor-skip`; Exit 2 = nicht messbar → KEIN Post, kein Urteil.
- Eingebaut in `metricool_tiktok_post.mjs` (TikTok/YouTube/Instagram+Facebook) und `meta_reel_post.mjs`.
- 5 wartende Reels gesperrt, 8 bestandene warten. `numpy` in die Keepalive-Selbstheilung (fehlte im frischen Container).
- Kaufbar-Prüfung ohne Admin-Token jetzt über die **tokenlose Storefront API** (gelernt von der Play-Store-App-Session).

## Offen (nächste Klassen)
- Preis IM BILD prüfen (OCR des ersten/mittleren Frames gegen Live-Preis) — `preisVeraltet` sieht nur die Caption.
- Bildposts ohne Text: Überlagerung nach Muster `dropship/muster/bildpost-mit-text-boots.jpg`, sobald ein Bild-Weg über Metricool steht.
- Pinterest-Auswahl über die Storefront API statt Admin-Token.
