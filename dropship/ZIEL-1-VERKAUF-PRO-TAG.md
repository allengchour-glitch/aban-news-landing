# Ziel «jeden Tag ein Verkauf» (Betreiber 29.09.2026) — die Rechnung

## GEMESSEN (ShopifyQL, 30 Tage, nur Menschen, Stand 29.09. 05:30 UTC)
| Quelle | Sitzungen | Warenkorb | Kasse | Kauf |
|---|---:|---:|---:|---:|
| direkt | 610 | 9 | 3 | 0 |
| Google-Suche | 123 | 5 | 3 | **1** |
| Social | 116 | 2 | 1 | 0 |
| unbekannt | 21 | 0 | 0 | 0 |
| **Summe** | **870** (29/Tag) | 16 | 7 | **1** |

Verkäufe an fremde Kunden, 30 T: 2 (#1018, #1019). Zeile «VERKAUF-ZIEL» steht ab jetzt in jeder Keepalive-Meldung
(`automation/verkauf_ziel.py`: heute / gestern / Tage mit Verkauf in 7 T / 30 T).

## Rechnung
- Ziel 30 Verkäufe/Monat. Die einzige Quelle mit Kauf (Google-Suche) wandelt ~0,8 % (1 von 123) — SCHÄTZUNG aus n=1.
- Bei 0,8 % braucht es ~3'700 kaufbereite Sitzungen/Monat (~120/Tag). Heute: ~4/Tag aus der Suche. **Faktor ~30.**
- Bei besserer Umwandlung (Schweizer Lager, 1–3 Tage Lieferung; Ziel 1,5–2 %) sinkt der Bedarf auf ~50–70/Tag.
- **Kein Feinschliff am Shop schliesst eine Lücke von Faktor 15–30.** Es braucht mehr Besucher mit Kaufabsicht.

## Hebel
| Hebel | Wirkung | Wer |
|---|---|---|
| Bezahlte Google-Shopping-/Suchanzeigen (CH) | schnellster, messbarer Verkehr mit Kaufabsicht; Budget nötig | Betreiber: Budget + Anzeigen-Freigabe |
| TikTok-Profil-Link setzen | TikTok ist der reichweitenstärkste Kanal (Median 272 Aufrufe/Post), aber ohne Link im Profil kommt kaum jemand in den Shop | Betreiber: 1 Klick in der TikTok-App |
| Google-Gratis-Einträge: 1'078 Blocker (2 % des Katalogs) | klein, aber einziger Kanal mit Verkauf | ich (autonom) |
| Schweizer Lager in Posts/Startseite vorn (seit 28.09.) | gegen Abbrüche an der Kasse (CJ = 2–4 Wochen) | läuft |

## Entscheid Betreiber 29.09.: «Nur gratis, langsamer» — erster Schritt

**Google-Gratis-Einträge, Klasse «Product page unavailable» (256 aktive, publizierte Produkte).** GEMESSEN: 40/40
Stichproben laut Storefront kaufbar, Seiten HTTP 200. Was Googles Crawler sah, ist von hier nicht messbar.
**Versuch mit Kontrollgruppe** (`automation/gfeed_nachpruefen.py`, 29.09. 05:17 UTC): Gruppe A (128) bekam den
neutralen Tag `gfeed-nachpruefen-2909` (Produkt-Update → die App «Google & YouTube» reicht neu ein), Gruppe B (128)
bleibt unverändert. Zurückgelesen: Tag gesetzt, Produkt ACTIVE + im Onlineshop. Auswertung erscheint automatisch als
Zeile «GOOGLE-VERSUCH» im Keepalive, sobald `google_feedback_wache.py` neu gescannt hat. Wirkt A deutlich besser als B →
dieselbe Massnahme für alle 1'078 Blocker-Produkte der zeitlichen Klassen («under review», «unavailable»).
