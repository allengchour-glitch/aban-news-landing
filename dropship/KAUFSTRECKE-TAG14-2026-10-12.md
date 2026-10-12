# Kauf-Strecke, Tag 14 (vorgezogen 12.10.2026) — Sitzungen ohne Herkunft

Plan: `dropship/WEBSEITE-12-TAGE-BILANZ.md` §6, Punkt 14.10. («189 Produktsitzungen ohne Herkunft prüfen»).
Alle Zahlen **GEMESSEN** mit ShopifyQL (`werbetest_trichter.ql`), Fenster 01.10. bis heute, nur `human_or_bot_session = 'human'`.

## 1. Gemessen

| Segment | Sitzungen | Warenkorb | Kasse | Kauf |
|---|---:|---:|---:|---:|
| ohne Herkunft (`referrer_name IS NULL`), Produktseite, mobil | 145 | **0** | 0 | 0 |
| ohne Herkunft, Produktseite, Desktop | 2 | 0 | 0 | 0 |

Gleicher Zeitraum, ohne Herkunft, Produktseite, pro Tag: 01.10. 49 · 02.10. 26 · 03.10. 17 · 04.10. 6 · 05.10. 3 · 06.10. 4 ·
07.10. 4 · 08.10. 8 · 09.10. 12 · 10.10. 8 · 11.10. 6 · 12.10. 4 (bis Messung).

Referrer `tiktok` pro Tag: 01.10. 38 · 02.10. 27 · 03.10. 42 · 04.10. 36 · danach 0.

Alle Herkünfte insgesamt (01.10.–heute): ohne Referrer 257 · tiktok 143 · google 58 · facebook 37 · pinterest 4 · Rest unter 4 je Quelle.
Länder: CH 428 · DE 18 · US 12 · CN 7 · TR 5 · übrige je ≤ 3.

## 2. Befund

- **Die 145 mobilen Produktsitzungen ohne Herkunft haben 0 Warenkörbe.** Das ist derselbe Befund wie beim TikTok-Verkehr
  (143 Sitzungen, 0 Warenkörbe), nur ohne Namen.
- **Hypothese (nicht belegt):** Klicks aus In-App-Browsern (TikTok, Instagram, Facebook) kommen ohne Referrer an und landen
  deshalb hier. Die Spitze 01./02.10. passt zur TikTok-Spitze (38/27), der Abfall danach nicht sauber (am 04.10. 6 ohne Herkunft
  gegenüber 36 TikTok). Es ist also möglich, aber nicht bewiesen.
- **Was das Werkzeug nicht sieht:** Die URL-Parameter (utm, Anhänge der Bio-Links) sind in ShopifyQL nicht als Spalte
  abfragbar. Bots sind über `human_or_bot_session` schon herausgerechnet, eine Restmenge von Bots ist nicht ausgeschlossen.

## 3. Entscheid / nächster Schritt

- Keine Änderung am Shop (Befund, kein Fix). Der Plan-Punkt 14.10. ist damit gemessen.
- Prüfbar mit einem Schritt: Bio-Link und Post-Links mit `utm_source=tiktok&utm_medium=social` versehen und in 7 Tagen
  messen, ob die Sitzungen aus dem Segment «ohne Herkunft» in die utm-Zeile wandern. Wenn ja, war es der In-App-Browser;
  wenn nein, sind es andere Quellen. Das ist eine Betreiber-/Social-Entscheidung (Bio-Link, Metricool-Posts).

## 4. Nebenbefund Tag 13 (F5, Grössentabelle)

- Sirène hat «Grössen S–XL» und «Unsicher? Schreib uns Brust-, Taillen- und Hüftweite» — **keine Grössentabelle**.
- Aurora listet «S, M, L, XL, XXL, 3XL» — **keine Masse**.
- Die Lieferanten-Daten (CJ-Variante `CJLY291617301AZ`) liefern über die Variantenabfrage HTTP 400. Ohne Messdaten
  wird keine Tabelle erfunden. Offen, bis CJ-Masse oder eine Messung vorliegen.
