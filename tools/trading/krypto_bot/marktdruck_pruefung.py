#!/usr/bin/env python3
"""Prüfstand «Marktdruck» (Kauf-/Verkaufsdruck wie das Market-Pressure-Widget der ATAS-Plattform) — bringt das nach Kosten etwas?

VORAB FESTGELEGT am 05.11.2026, bevor gerechnet wurde (der Git-Verlauf belegt die Reihenfolge).

Anlass: Der Besitzer schickte am 05.11.2026 ein TikTok-Video (@nicholassalasn3017185, 7 Follower, 24 Aufrufe, am selben Tag hochgeladen) über das
«Market Pressure»-Widget der ATAS-Plattform («ideal für Scalper»). Was ATAS selbst schreibt (QUELLE help.atas.net, Seite «Market Pressure», Stand 25.08.):
  Market Pressure(t) = Σ Gewicht × e^(−Δt / Halbwertszeit), getrennt für aggressive Käufer und aggressive Verkäufer;
  Modus VP = Gewicht ist die Handelsmenge, Modus POT («Pace of Tape») = jeder Handel zählt 1;
  Zeitempfindlichkeit Short 10 s, Medium 30 s, Long 60 s Halbwertszeit; eine einstellbare Schwelle (Standard 50 %).
Das Widget ist eine ANZEIGE. ATAS nennt keine Handelsregel und kein Ergebnis. Hier wird gemessen, ob ein so berechneter Druck eine Kursbewegung voraussagt,
die grösser ist als die Kosten.

Frage (vorab): Sagt ein solcher Druck in den nächsten 30 bis 120 Sekunden eine Bewegung voraus, die Gebühren und Schlupf übersteigt?

Daten: Binance Spot aggTrades (öffentliche Tagesdateien von data.binance.vision), BTCUSDT und ETHUSDT, 14 volle UTC-Tage 22.10.2026 bis 04.11.2026.
  Hälfte 1 = 22.10. bis 28.10., Hälfte 2 = 29.10. bis 04.11. Käufer-Seite = aggressiver Kauf (is_buyer_maker == False), Verkäufer-Seite = aggressiver Verkauf.
  Sekundenraster: je Sekunde Menge und Anzahl der Käufer- und Verkäuferhandel und der letzte Kurs (ohne Handel: der letzte bekannte Kurs).
  Fehlt eine Tagesdatei oder hat ein Tag auffällig wenig Handel (BTC unter 200 000, ETH unter 100 000), bricht die Prüfung ab: nichts wird schöngerechnet.

Druck (je Seite, je Sekunde s; d = 0,5^(1/HZ)):  X(s) = X(s−1) × d + Gewicht(s), Gewicht = Menge (VP) oder Anzahl (POT).
  R(s) = K(s) / (K(s) + V(s))  (K = Käuferdruck, V = Verkäuferdruck; ohne Druck R = 0,5).
  Aktivität A(s) = K(s) + V(s); E(s) = E(s−1) × (1 − 1/3600) + A(s) / 3600. Ein Signal zählt nur, wenn A(s) ≥ 1,5 × E(s−1) (dünner Handel ist kein Signal)
  und erst nach der ersten Stunde der Daten (Einschwingzeit).
Signal (ein «Ereignis»): u(s) = +1, wenn R(s) ≥ S und aktiv; u(s) = −1, wenn R(s) ≤ 1 − S und aktiv; sonst 0. Ereignis in s, wenn u(s) ≠ 0 und u(s−1) = 0
  (eine neue Druckphase beginnt; solange der Druck anhält, gibt es kein zweites Ereignis).
Handel: Einstieg zum letzten Kurs der Sekunde s + 2 (2 Sekunden Verzug), Ausstieg H Sekunden später. Höchstens eine offene Position je Markt; ein Ereignis
  während einer offenen Position wird übersprungen. Richtung «mit» = Kauf bei u = +1, Verkauf bei u = −1; «gegen» = umgekehrt.
  Brutto (bp) = Richtung × (Kurs_aus / Kurs_ein − 1) × 10 000. Netto = Brutto − Kosten.
Kosten je Hin- und Rückweg, aus den Einstellungen des Scalping-Labors (scalping_labor.py): Marktaufträge auf beiden Seiten = 2 × (5 bp Gebühr + Schlupf), Schlupf je Seite
  BTC 1 bp, ETH 1,5 bp → 12,0 bp (BTC) und 13,0 bp (ETH). ENTSCHEIDEND ist dieser Fall. Nur zur Einordnung (nicht für das Urteil) wird der Wunschfall gemeldet:
  zwei passive Aufträge (2 × 2 bp Gebühr, kein Schlupf, jede Ausführung gelingt) = 4,0 bp.

Raster (alles wird berichtet, nichts herausgepickt): Modus {VP, POT} × Halbwertszeit {10, 30, 60 s} × Schwelle S {0,75, 0,90} × Haltedauer H {30, 120 s}
  × Richtung {mit, gegen} = 48 Zellen; je Zelle zwei Märkte × zwei Hälften = 192 Messungen. Je Messung: Trades, mittleres Brutto, mittleres Netto, t-Wert des Brutto.

Urteil (vorab):
  BESTANDEN nur, wenn mindestens EINE Zelle in BEIDEN Märkten und BEIDEN Hälften je mindestens 200 Trades hat und ein mittleres Netto von mindestens +1 bp je Trade zeigt.
  Sonst DURCHGEFALLEN. Zusätzlich, nur zur Einordnung: «Signal vorhanden, aber unter den Kosten», wenn eine Zelle in allen vier Teilen mindestens 200 Trades,
  ein mittleres Brutto über 0 und einen t-Wert von mindestens 3 hat. Das wäre eine Beobachtung, kein Handelsgrund.
Grenzen (vorab): 14 Tage sind eine Beobachtung, kein Beweis. Spot-Handel (nicht das Orderbuch der Perpetuals), nur ausgeführte Handel (keine Orderbuchtiefe, kein Spread),
  Zerfall im Sekundenraster (eine Näherung des Zerfalls im Takt der einzelnen Handel), 2 Sekunden Verzug angenommen. Eine Anzeige, die ein Mensch liest, ist keine Regel:
  ein Ergebnis hier sagt nichts über Händler, die Druck mit Tiefe, Erfahrung und Kontext deuten.
Aufruf: python3 tools/trading/krypto_bot/marktdruck_pruefung.py   → Tabelle + data/krypto-marktdruck-pruefung.json (lädt ca. 300 MB öffentliche Tagesdateien nach data/marktdruck-roh/)
"""
from __future__ import annotations

import sys

# Die Umsetzung folgt im nächsten Commit; dieser Commit legt nur das Protokoll fest.


def main() -> int:
    raise NotImplementedError("Protokoll festgelegt, Umsetzung folgt")


if __name__ == "__main__":
    sys.exit(main())
