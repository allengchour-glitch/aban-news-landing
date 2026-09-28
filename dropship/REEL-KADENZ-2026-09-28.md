# IG/FB-Reels verhungerten — 28.09.2026 (Verbesserungsrunde 12:26)

**GEMESSEN:**
- `/tmp/social_autopilot.log` meldete seit 27.09. 22:26 stündlich «Reel fällig» und danach «Kadenz-Wache: letzter Post vor x h (<6h) → kein Post».
- Letzter Post je Kanal (aus `reels_seed.csv`): IG/FB 04:09, TikTok 05:10, YouTube 08:11. Die Ampel zählte in 24 h 1 Reel auf IG.
- Ursache: `meta_reel_post.mjs` nahm für die 6-h-Sperre JEDES «posted…», auch `posted-tiktok` und `posted-youtube`.
  Metricool schreibt in dieselbe CSV. Bei TikTok alle 8 h und YouTube alle 12 h fällt fast nie ein freies 6-h-Fenster an.

**GETAN:**
- Die Sperre zählt nur noch IG/FB-Posts (`posted`, `posted-ig`, `posted-ig-fb`, `posted-instagram`, `posted-facebook`).
  Die Überspringer `posted-dup-*` zählen nicht mehr.
  Kanarienvögel: 9/9 Status richtig. Trockenlauf: der Poster würde jetzt posten.
- Wächter `automation/reel_kadenz_wache.py` im Keepalive: meldet «REEL-KADENZ: …», wenn ein Kanal älter ist als 1,5× sein Takt
  (IG/FB 8 h, TikTok 8 h, YouTube 12 h). `--test` bestanden.
- Das Herbst-Sammelvideo steht auf `wartet-freigabe`, bis der Betreiber es freigibt (im Morgenbericht erbeten). Der nächste IG-Kandidat ist ein normales Reel.

**OFFEN:**
- Eine Zeile trägt nur EINEN Status. Die Halloween-Montage (Plattformen instagram,facebook) wurde vom Metricool-Poster auf YouTube gepostet
  (`posted-youtube`), damit wartet sie für IG/FB nicht mehr. Die Dauerlösung wäre ein Status je Plattform. Bis dahin bei Bedarf eine zweite Zeile für IG anlegen.
