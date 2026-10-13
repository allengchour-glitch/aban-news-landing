#!/usr/bin/env python3
"""Pilot 2.0 — Planer (reine Rechnung, sendet NICHTS). Stufe 1 der Live-Umstellung.

Aus dem Signal z (−1 … +1, wie der Pilot) und dem Ist-Bestand wird ein Plan für Spot- UND Futures-Konto:
  • Richtung long  → Coin im Spot-Konto (kein Funding)
  • Richtung short → Short-Perpetual im Futures-Konto (bekommt Funding)
  • freier Teil     → Funding-Ernte: Coin im Spot + gleich grosser Short-Perpetual (marktneutral), Pfand 100 % (Hebel 1, Zwangsschliessung erst bei rund +100 %)
Für jeden Markt mit Grundbetrag B = Kontowert × Anteil × Gewicht:
  spot_ziel  = (max(z,0) + (1−|z|)/2) × B / Kurs                    (Coins)
  perp_ziel  = −((1−|z|)/2 + max(−z,0)) × B / Kurs                  (Kontrakte, negativ = short)
  pfand_ziel = (1−|z|)/2 × B + max(−z,0) × B                  (USDT im Futures-Konto, Hebel ≤ 1 auf den Richtungsteil)
Netto-Richtung = spot_ziel + perp_ziel = z × B / Kurs (genau wie der Pilot). Kapitalbedarf = B (nichts geliehen).
Reihenfolge im Plan: erst verkleinern (Perp reduceOnly, Spot verkaufen), dann Geld verschieben, dann vergrössern.
Stops: nur auf den RICHTUNGSTEIL (Spot-Stop für long, Perp-Stop mit Menge + reduceOnly für short) — der Ernte-Teil
bleibt abgesichert und wird nie vom Stop getroffen.
"""
from __future__ import annotations

import math

KAPITAL_FAKTOR = 2.0     # Funding-Ernte: Volumen × 2 = Kapital (Spot voll + 100 % Pfand → Short mit Hebel 1)
PFAND_ERNTE = 1.0
BAND = 0.25              # Richtungsteil: erst handeln, wenn |Ist − Ziel| > 0,25 (wie Pilot)
BAND_ERNTE = 0.10        # Ernte-Teil: erst anpassen, wenn er um > 10 % des Grundbetrags abweicht
PFAND_PUFFER = 0.10      # 10 % mehr Pfand als nötig im Futures-Konto
MIN_SPOT, MIN_PERP = 10.0, 20.0


def runde(x, schritt):
    return math.floor(abs(x) / schritt + 1e-9) * schritt * (1 if x >= 0 else -1)


def ziele(z, basis, kurs):
    """→ (spot_ziel Coins, perp_ziel Kontrakte, pfand_ziel USDT, richtung_spot Coins, richtung_perp Kontrakte)."""
    z = max(-1.0, min(1.0, z))
    ernte = (1 - abs(z)) / KAPITAL_FAKTOR * basis          # USDT-Volumen der Ernte
    lang = max(z, 0.0) * basis
    kurz = max(-z, 0.0) * basis
    return ((lang + ernte) / kurs, -(ernte + kurz) / kurs, ernte * PFAND_ERNTE + kurz, lang / kurs, -kurz / kurs)


def plane(markt, z, basis, kurs, spot_ist, perp_ist, regeln, max_auftrag=1000.0):
    """Ein Markt. regeln: {"spot_step", "perp_step", "spot_min", "perp_min"} (Mindestvolumen USDT).
    → {"schritte": [(konto, seite, menge, reduce_only)], "pfand": USDT, "stop_spot": Coins, "stop_perp": Kontrakte, "info": …}"""
    if basis <= 0 or kurs <= 0:
        return {"schritte": [], "pfand": 0.0, "stop_spot": 0.0, "stop_perp": 0.0, "info": "kein Kapital/Kurs"}
    s_ziel, p_ziel, pfand, r_spot, r_perp = ziele(z, basis, kurs)
    # Ernte-Teil auf den gröberen Mengenschritt runden, damit Spot und Short sich GENAU aufheben (marktneutral)
    schritt_ernte = max(regeln["spot_step"], regeln["perp_step"])
    ernte_menge = runde((1 - abs(max(-1.0, min(1.0, z)))) / KAPITAL_FAKTOR * basis / kurs, schritt_ernte)
    s_ziel, p_ziel = r_spot + ernte_menge, r_perp - ernte_menge
    # Band: aktuelle Richtung = Spot + Perp (netto) in Einheiten von B; Ernte = −Perp − Richtung-Short-Anteil
    netto_ist = (spot_ist + perp_ist) * kurs / basis
    ernte_ist = (spot_ist * kurs / basis) - max(netto_ist, 0.0)
    ernte_soll = (1 - abs(z)) / KAPITAL_FAKTOR
    richtung_ok = abs(netto_ist - z) <= BAND and (netto_ist > 0) == (z > 0) and not (z == 0 and abs(netto_ist) > 1e-9)
    ernte_ok = abs(ernte_ist - ernte_soll) <= BAND_ERNTE
    if richtung_ok and ernte_ok and (spot_ist or perp_ist):
        s_ziel, p_ziel = spot_ist, perp_ist  # im Band: nichts tun
    schritte = []
    mindest_s = max(MIN_SPOT, regeln.get("spot_min", 0))
    mindest_p = max(MIN_PERP, regeln.get("perp_min", 0))
    deckel = max_auftrag / kurs

    def menge(x, schritt):
        return round(runde(min(abs(x), deckel), schritt), 10)
    # 1) verkleinern
    if p_ziel > perp_ist + 1e-12:  # Short verkleinern (Perp kaufen, reduceOnly)
        m = menge(min(p_ziel - perp_ist, -perp_ist), regeln["perp_step"])
        if m > 0 and (m * kurs >= mindest_p or abs(m - abs(perp_ist)) < regeln["perp_step"]):
            schritte.append(("perp", "BUY", m, True))
    if s_ziel < spot_ist - 1e-12:  # Spot verkaufen
        m = menge(spot_ist - s_ziel, regeln["spot_step"])
        if m > 0 and m * kurs >= mindest_s:
            schritte.append(("spot", "SELL", m, False))
    # 2) vergrössern (das Verschieben des Geldes plant ausfuehren() zwischen 1 und 2)
    if s_ziel > spot_ist + 1e-12:
        m = menge(s_ziel - spot_ist, regeln["spot_step"])
        if m > 0 and m * kurs >= mindest_s:
            schritte.append(("spot", "BUY", m, False))
    if p_ziel < perp_ist - 1e-12:  # Short vergrössern
        m = menge(perp_ist - p_ziel, regeln["perp_step"])
        if m > 0 and m * kurs >= mindest_p:
            schritte.append(("perp", "SELL", m, False))
    return {"schritte": schritte, "pfand": pfand * (1 + PFAND_PUFFER),
            "stop_spot": runde(r_spot, regeln["spot_step"]), "stop_perp": runde(abs(r_perp), regeln["perp_step"]),
            "info": {"z": z, "spot_ziel": s_ziel, "perp_ziel": p_ziel, "netto_ist": netto_ist, "ernte_ist": ernte_ist}}


def verschieben(pfand_soll, futures_saldo, futures_abziehbar, spot_usdt_frei, spot_bedarf):
    """USDT zwischen Spot- und Futures-Konto. → (Richtung, Betrag) oder None.
    pfand_soll: Summe der Pfand-Ziele aller Märkte; futures_saldo: Wallet-Saldo im Futures-Konto (ohne offene Gewinne);
    futures_abziehbar: was Binance dort maximal abziehen lässt; spot_bedarf: USDT, die die Spot-Käufe dieses Laufs brauchen.
    Futures bekommt zuerst sein Pfand (sonst kein Short); Spot bekommt Geld nur, wenn er es für Käufe braucht."""
    zu_wenig = pfand_soll - futures_saldo
    if zu_wenig > 1:
        frei = spot_usdt_frei - spot_bedarf
        return ("SPOT_ZU_FUTURES", round(min(zu_wenig, frei), 2)) if frei > 1 else None
    fehlt_spot = spot_bedarf - spot_usdt_frei
    ueber = min(futures_saldo - pfand_soll, futures_abziehbar)
    if fehlt_spot > 0 and ueber > 1:
        return ("FUTURES_ZU_SPOT", round(min(ueber, fehlt_spot * 1.01 + 1), 2))
    return None
