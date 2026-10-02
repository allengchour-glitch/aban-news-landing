# Semrush-Ernte (Testabo 02.–09.10.2026)

Testabo SEO Toolkit PRO, 50'000 MCP-Einheiten, aktiviert vom Betreiber am 02.10.2026 ~15:45 UTC.
**Kündigen vor 09.10. ~15:45 UTC** (sonst $139.95/Monat). Erinnerungen in diese Session:
`trig_01MN3e4NbqNHWM53tMnx4AkY` (08.10. 07:45 UTC) und `trig_01DXWkv64bGu99SKH8dxJtxG` (09.10. 06:45 UTC).
Google-Kalender-Eintrag ging nicht (Konnektor ohne Schreibrecht). Die Daten hier bleiben nach der Kündigung nutzbar.
Datenbank `ch` (Google Schweiz), Stand Oktober 2026. Lesen über `automation/suchvolumen.py`.

| Datei | Inhalt | Einheiten |
|---|---|---|
| — | `domain_rank` luxestyle.ch: Semrush-Rang 1'161'813, **556 Suchbegriffe in den Top 100, geschätzter Verkehr 0** | 10 |
| `luxestyle_ch_top30_2026-10-02.csv` | alle 38 Begriffe auf Platz ≤ 30 (Seite 2–3), nach Volumen — z. B. «ballettschuhe» 590/Mt Platz 29, KD 14 | 400 |
| `kategorie_suchvolumen_ch_2026-10-02.csv` | 478 Suchbegriffe zu 350 Kollektionen: Volumen, Schwierigkeit (KD), CPC, Absicht | ~4'780 |
| `kategorie_zu_suchbegriff_2026-10-02.json` | Kollektionstitel → 1–2 Suchanfragen (Gemini) | 0 |

Verbraucht am 02.10.: ~5'190 von 50'000.

## Schon eingebaut
- `seo_autopilot.py` wählt Ratgeber-Themen jetzt nach Suchvolumen der Kollektion (85/126 Menü-Kollektionen mit Wert);
  Ortsfilter kennt jetzt auch ausländische Städte/Länder («schmuck kaufen wien/in der türkei» war durchgerutscht).

## Plan für die restlichen Tage (~44'800 Einheiten)
1. **Seite-2-Seiten anheben (ohne Einheiten):** die 38 Begriffe auf Platz 16–30 → Produkttitel/SEO-Titel mit dem exakten
   Suchbegriff, interne Links aus Ratgebern/Kollektionen.
2. Positionen 31–100 (≈ 518 Zeilen, ~5'200 Einheiten) → zweite Liste naher Chancen.
3. `phrase_related` für die 20 kaufstärksten Begriffe mit eigenem Sortiment (~20 × 50 Zeilen) → neue Kollektions-/Ratgeberthemen.
4. Google-Shopping-Daten (`shopping_research`) für die meistbesuchten Produkte: Titel und Preise der Mitbewerber.
5. Rest: Suchvolumen für neue Saison-Begriffe (Weihnachten/Winter) + CJ-Suchliste nach Volumen ordnen.
