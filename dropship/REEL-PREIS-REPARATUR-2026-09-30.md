# Reels mit veraltetem Preis: gesperrt, aber nie repariert (Verbesserungsrunde 30.09.2026, 20:25 UTC)

## GEMESSEN
- `automation/reels_seed.csv`: **36 Zeilen `preis-veraltet-skip`** (zweitgrösster Sperrgrund nach jury-skip 72).
  post_guard.preisVeraltet sperrt zu Recht: Caption-Preis ≠ Live-Preis — und make_reel.sh brennt denselben Preis ins Bild.
- Keine Reparatur: `reel_neu_rendern.py` kannte nur «Fenster» und «hook»; `tor_quellen_anfragen.mjs` fragte Quellen nur für
  `meisterwerk-tor-skip` an. Heute 20:07 fiel der TikTok-Kandidat erneut daran (Caption 47.90 ≠ live 48.90).
- Quellvideos lokal: 1 von 36. TikTok-Pause 28 h ist dagegen gewollt: Metricool plant auf die Bestzeit der nächsten Tage.

## GETAN
- `reel/reel_neu_rendern.py MODUS=preis`: Live-Preis per Handle aus dem Caption-Link (nur ACTIVE, nur Einheitspreis —
  Preisspannen bleiben von Hand), Caption-Preis ersetzt (Versand-Schwellen geschützt, Streichpreise «statt CHF …» raus),
  neu rendern, Tor mit `PREIS_SOLL`=Live, Zeile atomar zurück auf `ready`.
- Kanarienvögel: «CHF 15.90 · Gratis Versand ab CHF 50» → nur 15.90 ersetzt ✓; «CHF 47,90 statt CHF 59.90» wurde zuerst zu
  «CHF 48.90 statt CHF 48.90» ✗ → Streichpreis-Regel, danach ✓; «nur CHF 9.90!» ✓.
- Scharf: **T8-Smartwatch** neu gerendert (Bild zeigt CHF 48.90, Tor bestanden) → wieder `ready`.
- `tor_quellen_anfragen.mjs` fragt jetzt auch Preis-Sperren an: **18 Quellen in 6 Server-Aufträgen**, 6 ohne CJ-Video.
- Aufseher: täglicher Block `reel_tor_reparatur` ruft zusätzlich `MODUS=preis` (Datei atomar ersetzt, Aufseher neu gestartet).

## OFFEN
- 6 Reels ohne CJ-Video bleiben gesperrt (kein Neurendern möglich) — ehrlich so.
