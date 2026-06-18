# ⚽🇨🇭 Schweiz-WM-2026 — POD-Fan-Designs

Druckfertige, transparente PNGs (~2900 px ≈ 25 cm @ 300 dpi) im LuxeStyle-Design-System
(Swiss-Rot `#D52B1E` · Anthrazit `#1F2328` · Off-White `#F4F1EA`). Generator:
`automation/render_swiss_wm.py` (Pillow-only, deterministisch — jederzeit neu/erweiterbar).

Hintergrund: BigBuy liefert **keine** Schweiz-/Nationalteam-Fanartikel → die Schweiz-WM-Nachfrage
(Schweiz ist qualifiziert, Gruppe B) bedienen wir über **eigene POD-Designs**.

| Datei | Spruch | Druck-Empfehlung (Garment) |
|---|---|---|
| `hopp-schwiiz-wm.png` | HOPP SCHWIIZ + Fussball + CH-Kreuz | helles Tee (weiss/cream) — Anthrazit-Ink |
| `mir-sind-debii.png` | MIR SIND DEBII · WM 2026 GRUEPPE B | weiss/cream — Rot-Ink |
| `rot-wiiss.png` | ROT-WIISS + grosses CH-Kreuz | Anthrazit/dunkel — Off-White/Rot |
| `fuessball-fieber.png` | FUESSBALL-FIEBER 2026 | weiss/cream — Anthrazit/Rot |
| `wm-2026-schwiiz.png` | WM 2026 + Fussball · HOPP SCHWIIZ | weiss/cream — Anthrazit/Rot |
| `eins-zu-null-schwiiz.png` | 1:0 FÜR D SCHWIIZ · FAN SIIT EBIG | weiss/cream — Anthrazit/Rot |

## Nächster Schritt (PC-Claude / Gelato)
PNGs bei Gelato als DTG hochladen (Front, mittig, mittel-gross) → Cloud-Session macht
Titel/SEO/Collection. **Saisonal:** Produkte mit Tag `wm-2026` anlegen → nach der WM via
`automation/bigbuy_wm_teardown.mjs` zusammen mit den Fanartikeln entfernen.
