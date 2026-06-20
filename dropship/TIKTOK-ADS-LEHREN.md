# 🎯 TikTok-Ads — Review-Fails & Fixes (Lern-Datei)

> User 2026-06-20: „schaue alle Fails in Kampagne TikTok, dann kannst du lernen." Die echten Ablehnungs-
> gründe stehen im **TikTok Ads Manager** (ads.tiktok.com) — Cloud-Claude sieht sie NICHT (kein Ads-API).
> **→ User: Ablehnungstext/Screenshot hier reinpasten oder mir schicken → ich fixe + ergänze die Lehre.**

## ✅ Proaktiv schon gefixt (häufigste Gründe)
| Fail-Grund (häufig) | Fix (umgesetzt) |
|---|---|
| **Musik-Copyright** (eingebettete Musik nicht in TikToks Commercial Music Library) | `tiktok-campaign-port.mjs` lädt Creatives jetzt **TONLOS** hoch (`-an`). Musik ggf. in der Ad-UI aus der **Commercial Music Library** wählen. (`CAMPAIGN_KEEP_AUDIO=1` behält Ton.) |
| **Übertriebene/medizinische Claims** (z.B. „heilt", „Anti-Aging garantiert", Vorher-Nachher) | Ad-Text + Landing claim-frei halten; Beauty = nur „pflegt/erfrischt", keine Wirkversprechen. Vorher-Nachher-Bilder meiden. |
| **Landing-Page-Probleme** (404, kein Impressum/AGB, Preis fehlt) | Landing `/collections/sommer` geprüft (HTTP 200, sauber). Impressum/AGB/Datenschutz vorhanden. |
| **Schrift im unteren 20%** (Plattform-Safe-Zone) | Reel-QA (`video-qa.mjs`) blockt Text unten; Builder hält Safe-Zone (Text endet ~78% Höhe). |
| **Asiatische Schrift / Watermark / „made in china" im Bild** | Bild-QA (Gemini-Vision) + Katalog-Audit filtern das raus. |
| **Reisserische Rabatt-Claims** („gratis", „100%", übergrosse %-Versprechen) | Captions/Ad-Text moderat halten; WELCOME10 = -10% ist ok. |

## 📋 So lernen wir aus DEINEN echten Fails
1. ads.tiktok.com → Kampagne → abgelehnte Ad → **Ablehnungsgrund** (TikTok zeigt den Text).
2. Den Text mir schicken (oder hier eintragen).
3. Ich: behebe die Ursache im Creative/Text/Landing + trage die Lehre unten ein → künftig vermieden.

## 🧾 Echte Fails (User-Eingaben — chronologisch)
<!-- Hier die echten Ablehnungsgründe eintragen, z.B.:
2026-06-20 — „Music: unauthorized audio" → Fix: tonlos hochladen (erledigt).
-->
(noch keine konkreten Fails eingetragen)
