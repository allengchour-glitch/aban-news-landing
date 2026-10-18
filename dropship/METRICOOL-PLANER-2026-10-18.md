# Metricool-Planer: Entwürfe erscheinen nie · Wächter + Freigabe der ChatGPT-Videos (18.10.2026, ~20:00–22:30 UTC)

Marken: **GEMESSEN** = selbst nachgemessen (REST `/v2/scheduler/posts` und MCP `getScheduledPosts`), **BEHAUPTUNG** = ungeprüft.

## Anlass
Betreiber 18.10.: «chatgpt hat coole videos gemacht, mache das weiter (metricool push)». ChatGPT hatte am 17./18.10. Produkt-Videos
direkt in Metricool angelegt (Marke 6227837, Ersteller allengchour@gmail.com).

## GEMESSEN (18.10. ~20:10 UTC)
- Sechs Videos als Planer-Einträge, **alle `draft: true`, `autoPublish: false`** (Netze FB-Reel + IG-Reel + TikTok): Business-Tasche ×2,
  Hasen-Wecker ×2, Sternenprojektor, LED-Hundegeschirr. Ein Entwurf wird nie gesendet; `autoPublish: false` schickt nur eine Push-Meldung
  an die Metricool-App. **Zwei Termine (18.10. 18:30/18:45 Zürcher Zeit) sind ohne Post verstrichen.**
- Business-Tasche und Hasen-Wecker lagen je **zweimal** im Planer (18:30 und 18:45 bzw. 19.10. 18:30 und 18:45) — Doppelprodukt, das
  Doppelpost-Verbot (GEHIRN 10) gilt auch für fremd angelegte Posts.
- Die vier Produkte sind ACTIVE (Admin-API), je 6–13 Medien; Business-Tasche und Sternenprojektor standen in `automation/reels_seed.csv`
  mit Status `jury-skip` (nie gepostet), Hasen-Wecker und Hundegeschirr fehlten dort; `_posted_media.txt`: 0 Treffer.
- Bildprüfung per Kontaktbogen (4 Videos × 5–7 Bilder): saubere Marken-Kopfzeile, deutsche Untertitel, kein Fremdlogo, kein Fremdtext,
  Produkt ab Bild 0 sichtbar. 1080×1920, 15–20 s, mit Tonspur (Business-Tasche und Hasen-Wecker v2 laut Alt-Text mit KI-Stimme, IG/TikTok
  tragen deshalb `isAiGenerated`/`isAigc = true`).
- Am 17.10. stand schon ein erstes ChatGPT-Video als **PUBLISHED** (14:47 IG, FB und **Threads**, 15:30 TikTok — Threads-Stopp gilt seit 07.07.).

## GETAN
1. **Vier Videos freigegeben, je eines pro Tag** (draft → false, autoPublish → true; Text, Cover, Alt-Text, KI-Kennzeichnung unverändert):
   19.10. 18:30 Business-Tasche v2 · 20.10. 10:00 Sternenprojektor · 21.10. 10:00 LED-Hundegeschirr · 22.10. 18:30 Hasen-Wecker v2
   (alle FB-Reel + IG-Reel + TikTok). Rücklesen per REST: 4× `draft False, auto True, PENDING`.
2. **Zwei Altentwürfe (Business-Tasche v1, Hasen-Wecker v1) bleiben Entwürfe** — dasselbe Produkt läuft schon als v2. Nicht gelöscht
   (kein Löschwerkzeug, und es sind die Entwürfe des Betreibers); die Wache zählt sie als «ersetzt», nicht als Alarm.
3. **Reel-Motor gesperrt für die vier Produkte** (`dropship/_cj_reel_gebaut.txt` + Kennung `2406260742101606200` nachgetragen; die anderen
   drei standen schon darin) — der Autopilot baut kein zweites Reel desselben Produkts in dieser Woche.
4. **Wächter** `automation/metricool_planer_wache.py` (nur lesend, `--selbsttest` 7 Klassen + Zeitzone + Zeilen, `--liste`, `--shop`):
   UEBERFAELLIG, ENTWURF_BALD (≤ 72 h), FEHLER, HAENGT (> 60 Min PENDING), DOPPELT (Produkt aus dem Link, je Netzwerk, ohne Stories und
   Entwürfe), ERSETZT (Info), INAKTIV (`--shop`, Produkt nicht ACTIVE). Zeile «METRICOOL-PLANER: …» in jeder Keepalive-Meldung
   (`engine_keepalive.sh`, vor der Motor-Ampel). Erster Lauf nach der Freigabe: «ok · 10 geplant (14 T), nichts überfällig, kein Produkt
   doppelt, 2 Altentwurf ersetzt».

## Regel
Ein Metricool-Eintrag mit `draft: true` oder `autoPublish: false` ist KEIN Post. Wer Posts von Hand oder über eine fremde KI anlegt,
muss sie freigeben — oder die Wache meldet sie, sobald der Termin 15 Min verstrichen ist. Fremd angelegte Posts zählen für das
Doppelpost-Verbot wie eigene.

## OFFEN (Betreiber)
- **KI-Stimme vs. Hausregel «ohne Voiceover» (12.06.):** Business-Tasche v2 und Hasen-Wecker v2 tragen eine KI-Stimme. Freigegeben,
  weil der Betreiber ChatGPTs Videos ausdrücklich weiterführen will — wer die Stimme nicht will, setzt die beiden Termine in Metricool
  zurück auf Entwurf (19.10. 18:30 / 22.10. 18:30).
- **Threads:** ChatGPT hat am 17.10. auf Threads gepostet (Stopp seit 07.07.). Soll Threads wieder dazu? Ohne Antwort bleibt es bei
  «kein Threads» für die freigegebenen Videos (sie tragen nur FB, IG, TikTok).
- Mehr Produkt-Videos im Stil von ChatGPT (Marken-Kopfzeile, deutsche Untertitel, 15–20 s) bräuchten entweder ChatGPT oder eine KI-Stimme
  aus einem bezahlten Dienst; die eigene Pipeline (`schnitt.py`, ohne Stimme) bleibt der Standardweg.
