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
Netto-Richtung = spot_ziel + perp_ziel ≈ z × B / Kurs (Short 2 % kleiner). Kapitalbedarf ≤ B (nichts geliehen).
Reihenfolge im Plan: erst verkleinern (Perp reduceOnly, Spot verkaufen), dann Geld verschieben, dann vergrössern.
Beim Ernte-Abbau zuerst den Short zurückkaufen: scheitert danach der Spot-Verkauf, bleibt man begrenzt long (Stop greift),
nie ungedeckt short. Der Pfand-Puffer (10 %) ist in die Basis eingerechnet: Kapitalbedarf ≤ Basis.
Stops: nur auf den RICHTUNGSTEIL (Spot-Stop für long, Perp-Stop mit Menge + reduceOnly für short) — der Ernte-Teil
bleibt abgesichert und wird nie vom Stop getroffen.
"""
from __future__ import annotations

import math

KAPITAL_FAKTOR = 2.0     # Funding-Ernte: Volumen × 2 = Kapital (Spot voll + 100 % Pfand → Short mit Hebel 1)
PFAND_ERNTE = 1.0
PUFFER_ERNTE = 0.10      # Ernte-Pfand: 10 % mehr als das Volumen (Kurs steigt → Short verliert, bevor neu verteilt wird)
PUFFER_SHORT = 0.02      # Richtungs-Short: 2 % Reserve für Gebühren (Hebel 1 braucht das volle Volumen als Pfand)
PFAND_PUFFER = PUFFER_ERNTE  # alter Name (Rückwärtskompatibilität)
BAND = 0.25              # Richtungsteil: erst handeln, wenn |Ist − Ziel| > 0,25 (wie Pilot)
BAND_ERNTE = 0.10        # Ernte-Teil: erst anpassen, wenn er um > 10 % des Grundbetrags abweicht
MIN_SPOT, MIN_PERP = 10.0, 20.0


def runde(x, schritt):
    return math.floor(abs(x) / schritt + 1e-9) * schritt * (1 if x >= 0 else -1)


def ziele(z, basis, kurs):
    """→ (spot_ziel Coins, perp_ziel Kontrakte, pfand_ziel USDT, richtung_spot Coins, richtung_perp Kontrakte).
    Richtung in VOLLER Grösse wie im Backtest (Short um die 2-%-Gebührenreserve kleiner); die Ernte bekommt, was übrig bleibt:
    Kapitalbedarf = lang + kurz × 1,02 + Ernte × (1 + 1,10) = Basis."""
    z = max(-1.0, min(1.0, z))
    lang = max(z, 0.0) * basis
    kurz = max(-z, 0.0) * basis / (1 + PUFFER_SHORT)
    ernte = (1 - abs(z)) * basis / (1 + PFAND_ERNTE * (1 + PUFFER_ERNTE))
    return ((lang + ernte) / kurs, -(ernte + kurz) / kurs, ernte * PFAND_ERNTE * (1 + PUFFER_ERNTE) + kurz * (1 + PUFFER_SHORT),
            lang / kurs, -kurz / kurs)


def plane(markt, z, basis, kurs, spot_ist, perp_ist, regeln, max_auftrag=1000.0):
    """Ein Markt. regeln: {"spot_step", "perp_step", "spot_min", "perp_min"} (Mindestvolumen USDT).
    → {"schritte": [(konto, seite, menge, reduce_only)], "pfand": USDT, "ernte": Coins, "stop_spot": Coins, "stop_perp": Kontrakte}"""
    if basis <= 0 or kurs <= 0:
        return {"schritte": [], "pfand": 0.0, "ernte": 0.0, "stop_spot": 0.0, "stop_perp": 0.0, "info": "kein Kapital/Kurs"}
    z = max(-1.0, min(1.0, z))
    _, _, _, r_spot, r_perp = ziele(z, basis, kurs)
    r_spot, r_perp = runde(r_spot, regeln["spot_step"]), -runde(abs(r_perp), regeln["perp_step"])
    # Ernte auf den gröberen Mengenschritt runden, damit Spot und Short sich GENAU aufheben (marktneutral)
    schritt_ernte = max(regeln["spot_step"], regeln["perp_step"])
    ernte_menge = runde((1 - abs(z)) * basis / (1 + PFAND_ERNTE * (1 + PUFFER_ERNTE)) / kurs, schritt_ernte)
    # Ernte nur, wenn BEIDE Seiten über dem Binance-Minimum liegen — sonst entstünde ein ungesicherter Spot-Long
    if ernte_menge * kurs < max(MIN_SPOT, MIN_PERP, regeln.get("spot_min", 0), regeln.get("perp_min", 0)):
        ernte_menge = 0.0
    s_ziel, p_ziel = r_spot + ernte_menge, r_perp - ernte_menge
    pfand = ernte_menge * kurs * PFAND_ERNTE * (1 + PUFFER_ERNTE) + abs(r_perp) * kurs * (1 + PUFFER_SHORT)
    # Band: Ist-Richtung (Spot + Perp, netto) und Ist-Ernte (abgesicherter Teil) in Einheiten der Basis
    netto_ist = (spot_ist + perp_ist) * kurs / basis
    ernte_ist_menge = min(max(spot_ist, 0.0), max(-perp_ist, 0.0))
    richtung_ok = abs(netto_ist - z) <= BAND and (netto_ist > 0) == (z > 0) and not (z == 0 and abs(netto_ist) * basis > max(MIN_SPOT, regeln.get("spot_min", 0)))
    ernte_ok = abs(ernte_ist_menge - ernte_menge) * kurs <= BAND_ERNTE * basis
    if richtung_ok and ernte_ok and (spot_ist or perp_ist):
        s_ziel, p_ziel = spot_ist, perp_ist  # im Band: nichts tun
    schritte = []
    mindest_s = max(MIN_SPOT, regeln.get("spot_min", 0))
    mindest_p = max(MIN_PERP, regeln.get("perp_min", 0))
    deckel = max_auftrag / kurs

    def menge(x, schritt):
        return round(runde(min(abs(x), deckel), schritt), 10)
    # 1) verkleinern — reduceOnly darf unter dem Binance-Minimum liegen (Binance erlaubt das für reduceOnly)
    if p_ziel > perp_ist + 1e-12:
        m = menge(min(p_ziel - perp_ist, -perp_ist), regeln["perp_step"])
        if m > 0:
            schritte.append(("perp", "BUY", m, True))
    if s_ziel < spot_ist - 1e-12:
        m = menge(spot_ist - s_ziel, regeln["spot_step"])
        if m > 0 and m * kurs >= mindest_s:
            schritte.append(("spot", "SELL", m, False))
    # 2) vergrössern. Der Short-Teil zuerst rechnen: was davon NICHT geht (Minimum, Deckel, Rundung), darf auch nicht
    #    als Ernte-Spot gekauft werden — sonst ungesicherter Long.
    m_p = 0.0
    if p_ziel < perp_ist - 1e-12:
        m_p = menge(perp_ist - p_ziel, regeln["perp_step"])
        if not (m_p > 0 and m_p * kurs >= mindest_p):
            m_p = 0.0
    if s_ziel > spot_ist + 1e-12:
        gewuenscht = s_ziel - spot_ist
        d_e = max(0.0, ernte_menge - ernte_ist_menge)              # gewünschter Ernte-Zuwachs
        d_p = max(0.0, perp_ist - p_ziel)                          # gewünschter Short-Zuwachs (Richtung + Ernte)
        ernte_erlaubt = max(0.0, d_e - (d_p - m_p))                # Ernte-Spot nur so weit, wie der Short mitkommt
        richtung_dazu = max(0.0, gewuenscht - d_e)
        m = menge(min(gewuenscht, richtung_dazu + ernte_erlaubt), regeln["spot_step"])
        if m > 0 and m * kurs >= mindest_s:
            schritte.append(("spot", "BUY", m, False))
    if m_p > 0:
        schritte.append(("perp", "SELL", m_p, False))
    return {"schritte": schritte, "pfand": pfand, "ernte": ernte_menge,
            "stop_spot": r_spot, "stop_perp": abs(r_perp),
            "info": {"z": z, "spot_ziel": s_ziel, "perp_ziel": p_ziel, "netto_ist": netto_ist, "ernte_ist": ernte_ist_menge}}


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
