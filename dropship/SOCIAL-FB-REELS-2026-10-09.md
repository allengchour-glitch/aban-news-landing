# Facebook: nur Reels, Produkt-Reels zuerst · YouTube Shorts (09.10.2026, Betreiber)

Drei Anlässe vom Betreiber:
- Screenshot vom Facebook-Professional-Dashboard: Fotos bekommen 1 Aufruf je Beitrag, Reels 29. Dazu der Hinweis «Versuche,
  diese Woche mehr Reels zu posten».
- «fb, zeige weniger asiaten»
- «shorts youtune?»

## Gemessen (Metricool, 09.09.–09.10.)

**Facebook-Reels:** Seit dem 06.10. laufen sie über Metricool und erreichen **140–205 Aufrufe**: Haarglätter 143,
Mini-Heizplatte 174, Handwärmer 205, Kratzbrett 204, Keramik-Futterschale 189. Die Reels davor über die Graph-API hatten
**0–5**. Zwei Lippen-Reels kamen auf 11 und 16.

**Facebook-Fotos:** im Schnitt 1 Aufruf je Beitrag (Screenshot). Sie verbrauchen Kadenz und Seitenreichweite und bringen
nichts.

**YouTube Shorts:** 20 in 30 Tagen, **Median rund 170 Aufrufe**.
- Spitzenreiter: Hundespielzeug 929, Marinaden-Injektor 460, Fliegendes Federspielzeug 439, Bambus-Dispenser 393.
- Seit dem 05.10. zeigt Metricool keine neuen Shorts. Sie werden aber veröffentlicht: Der letzte ging am 09.10. um 16:05
  raus («Gesichtsstraffer», youtube.com/shorts/8pbw_5OPtPw), der Takt ist 12 h. Metricool liefert die YouTube-Statistik
  erst nach rund 3–4 Tagen.

**Gesichter in den Reels:** 50 bereite Reels gemessen. Nur **5** zeigen in mindestens 30 % der Bilder ein Gesicht:
UV-Lidschatten 0,5, Lenkradbezug 0,4, Wireless-Lader 0,4, Rasierer 0,3, Fotodrucker 0,3. Die übrigen zeigen das Produkt.

## Getan

**1. Facebook bekommt nur noch Reels und Stories.** Bild- und Karussellposts gehen nur noch auf Instagram.
- Regel in `automation/data/kanal_formate.json` (`facebook.bild = false`, `facebook.karussell = false`).
- Gelesen von `social-autopost-meta.mjs` und `ig_karussell_post.mjs`.
- Trockenlauf: «Kanäle: IG» statt «IG+FB».
- Die Kadenz ist unverändert (Bild 6 h, Reel 8 h). Facebook verliert nur die wirkungslosen Fotos.

**2. Produkt-Reels zuerst für Instagram und Facebook.**
- **Es wird nicht nach Herkunft oder Aussehen von Menschen sortiert.** Gemessen wird nur, ob ein Gesicht im Bild ist, gleich
  wessen.
- Werkzeug `automation/reel_gesicht.py`: OpenCV-Haar-Kaskaden für Gesichter von vorn und im Profil, 10 Bilder je Video. Ein
  Gesicht zählt ab 7 % der Bildbreite.
- Ledger `dropship/_reel_gesicht.tsv`.
- Der Reel-Poster `metricool_tiktok_post.mjs` stellt bei `NETZ=instagram` (= Instagram + Facebook) Reels mit Gesicht in
  mindestens 30 % der Bilder ans Ende. Gesperrt wird nichts.
- Trockenlauf: «Gesicht-Regel: 5 Model-Reel(s) hinten angestellt». Als Nächstes kommt die Medizin-Box.
- Neue Reels werden im Autopiloten alle 6 h gemessen (`social_autopilot.sh`).
- OpenCV 5 hat die Kaskaden nicht mehr; das Werkzeug installiert bei Bedarf `opencv-python-headless==4.10.0.84` nach.
  Klappt das nicht, misst es nichts und der Poster behält die normale Reihenfolge.

## Offen (Betreiber-Entscheid)

- **Mehr Reels?** Facebook empfiehlt mehr Reels, und die Reels über Metricool laufen dort gut. Der Reel-Takt steht auf 8 h
  (Instagram + Facebook gemeinsam). Ein Wechsel auf 6 h hiesse 4 statt 3 Reels am Tag. Bereit sind 50, und der Reel-Motor
  baut täglich nach. Nach Hausregel geht das nur mit deinem Okay.
- `social_lernen.mjs` hat seit dem 05.10. nichts mehr geschrieben und liest Facebook und YouTube nicht. Das ist der nächste
  Punkt.
