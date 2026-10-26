# Gelernt: «Claude Code + TikTok Shop = 89.142 € in 30 Tagen» (tkay, 21.10.2026)

Der Besitzer schickte den Link ohne Text (26.10.2026). Quelle: https://youtu.be/vjsMhcTAQCw — 14:04 Min., 8 057 Aufrufe, Outlier-Wert 8,4 (vidIQ).
Marken: **GEMESSEN** = hier selbst geprüft · **QUELLE** = fremde Angabe, plausibel, nicht nachgeprüft · **BEHAUPTUNG** = Verkaufsversprechen.

## Was das Video behauptet und zeigt
| Aussage | Marke |
|---|---|
| 100 000 $ Umsatz (89 142 €) in 28 Tagen, unter einer Stunde Arbeit am Tag, ohne Gesicht | **BEHAUPTUNG** — Dashboard-Bild im Video, aber *Umsatz*, nicht Gewinn; der Anbieter verkauft ein Mentoring und verweist auf einen Discord mit «günstigeren Accounts» |
| Geschäftsmodell = TikTok-Shop-**Affiliate/Partner**: fremde Marken bewerben, 20–30 % Provision je Verkauf (er habe einen besseren Deal) | **QUELLE** |
| Ablauf: Kalodata (Produktdaten, bezahlt) → Claude in Chrome sucht KI-Avatar-Accounts mit Outlier-Videos → Transkript des Referenzvideos → Claude übersetzt und passt das Skript an → Claude Cowork baut alle Szenen in Google Flow nach → Claude Code schneidet | **GEMESSEN** (Transkript gelesen, vidIQ `vidiq_video_transcript`) |
| Nische Beauty/Hautpflege sei «sicherer», Beispielprodukt eine Straffungscreme | **QUELLE** |

## Gegenprobe am eigenen Bestand (der Schritt, der aus Recherche Wissen macht)
1. **TikTok Shop gibt es für die Schweiz nicht.** Zwei Branchenseiten (Stand Okt. 2026) führen die Schweiz nicht unter den Verkäufer-Märkten (`dpl.company`: «Not listed»; `commonthreadco.com`: zehn EU-Märkte, kein CH). **QUELLE** — Anbieter-Seite von TikTok selbst nicht geprüft. LuxeStyle ist ein Shopify-Shop in CHF; das Modell des Videos (Provision auf TikTok-Shop-Verkäufe fremder Marken) trägt für uns nicht.
2. **Eigene Messung vom 23.10. (Shopify-Analytics): TikTok ist nicht der Hebel.** Von 530 TikTok-Sitzungen legten 4 etwas in den Korb (0,75 %); aus TikTok, Facebook und Instagram kam in zwölf Bestellungen **keine einzige**; zwei von acht bezahlten Bestellungen kamen über ChatGPT. **GEMESSEN.** Mehr oder bessere TikTok-Videos lösen das nicht — was kauft, ist eine konkrete Suche nach einem benannten Ding.
3. **Widerspruch zur Hausregel:** die Videos im Beispiel arbeiten mit KI-Sprechern; unsere Regel ist «ALLE Marketing-Videos OHNE Voiceover» (`dropship/VIDEO-PRAEFERENZEN.md`).

## Rechtlich heikel — nicht übernehmen
- **Fremdes Skript und die Szenenfolge eines Mitbewerbers 1:1 nachbauen** (Transkript des Referenzvideos kopieren, Szenen per Screenshot nachstellen): Texte und Konzepte sind geschützt, und es ist unlauter. Layout und Aufbau ansehen: ja. Inhalte übernehmen: nein.
- **KI-Personen, die eine Wirkung bezeugen** («nach zwei Wochen glänzt meine Haut wie ein frisch glasierter Donut»): erfundene Erfahrungsberichte — dieselbe Grenze wie «NIE Fake-Reviews» (UWG); TikTok verlangt zudem eine KI-Kennzeichnung.
- **Wirkversprechen** (Anti-Aging, Hautpflege) und **Vergleich mit absichtlich schlechter gezeigten Konkurrenzprodukten**.
- **Konten über einen Discord «günstiger» beziehen** — Kontenhandel, Sperrrisiko.

## Was brauchbar ist
- Aufbau «Problem → zwei, drei schwächere Lösungen → das eigene Produkt» als Idee für ein Vergleichs-Reel — mit **eigenen** Clips und ohne fremde Marken herabzusetzen. Unsere Schnitt-Werkzeuge (`automation/reel/schnitt.py`) können das schon.
- Praktisch: Claude Cowork/Claude Code über die **Desktop-App** statt im Browser; ein Cowork-Auftrag «Referenz in Szenen zerlegen → je Szene Bild → Clip» ist machbar, braucht aber Google Flow (bezahlt) und gehört nur mit eigenem Material benutzt.

## Entscheid
Nichts umbauen, nichts ins Backlog aufnehmen. Der Engpass des Shops bleibt Traffic-Qualität und konkrete Suchanfragen (ChatGPT/Google), nicht Social-Video-Menge.

## Werkzeug-Notiz
Transkripte gehen aus dem Container **nicht** per `timedtext` (siehe Skill `recherchieren`), aber über den **vidIQ-Connector**: `vidiq_video_transcript` (5 Credits) und `vidiq_get_videos_by_ids` (5 Credits) lieferten Metadaten und das volle deutsche Transkript.
