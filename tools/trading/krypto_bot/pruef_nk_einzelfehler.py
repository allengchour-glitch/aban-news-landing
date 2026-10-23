#!/usr/bin/env python3
"""Einzelfehler-Raster INNERHALB eines Durchgangs `einmal` der Nachkontrolle (aus der 20. unabhängigen Prüfung, Oktober 2026) — NUR Spielgeld gegen 127.0.0.1.

Der Zufalls-Fuzzer stört zufällig, der Ausfall-Raster stört ganze Anfragearten dauerhaft; beide sind blind dafür, dass im 10-Minuten-Takt der Aufgabenplanung (`pilot.py --nachkontrolle --einmal`) EIN Durchgang bei der
i-ten Anfrage genau EINE vorübergehende Störung trifft — und mit aufgebrauchtem Wiederholungs-Budget (EINMAL_RETRY_S) sofort aufgeben muss. Der Raster legt diese Störung auf JEDE Anfrage des Durchgangs:

  Ausgangslage: ein Tageslauf mit Dauerstörung (Vorlage `stops_scheitern`: Stops werden abgelehnt | `spot_markt_unklar` / `perp_markt_unklar`: Marktauftrag unklar | `stops_unsichtbar`: Stops angekommen, in den Listen
  erst später sichtbar | `tot1`…`tot8` mit --tot: der Tageslauf stirbt nach dem n-ten schreibenden Auftrag) → der Markt ist offen (Vermerk/Unklares im Buch).
  Dann Durchgang 1 (`einmal=True`, Budget AUFGEBRAUCHT: jede vorübergehende Störung gilt sofort, keine Wiederholung) mit GENAU EINER Störung bei der i-ten Anfrage (i = 0 … N−1, N = Anfragen des ungestörten Durchgangs):
  vor503 (nicht ausgeführt) | nach503 (ausgeführt, Antwort weg) | unsichtbar (ausgeführt, Antwort weg, in den Listen erst später sichtbar); mit --mehrarten auch abriss und 429.
  Danach Durchgang 2 und 3 ungestört (10-Minuten-Takt: verspätete Ankünfte werden sichtbar).
Befund (jeder ist ein Fehler):
  UNGESCHUETZT              nach drei Durchgängen bleibt etwas ohne Stop (oder ein Auftrag unbekannt)
  AUSNAHME                  ein Durchgang warf eine unerwartete Ausnahme
  REFERENZ_OHNE_FEHLER_UNGESCHUETZT / OHNE_VERMERK_UNGESCHUETZT   schon die Ausgangslage ohne Störung liegt ungeschützt da (Fehler des Tageslaufs oder der Nachkontrolle, nicht der Störung)
Statistik: `max_usdt` = der grösste Betrag ohne Stop in USDT. Der Preis des 10-Minuten-Takts (kein Befund): nach Durchgang 1 bleibt in rund 12,5 % der Einzelfehler etwas ohne Stop (bis ~16'000 USDT), nach Durchgang 2 nie.

Aufruf:
  python3 -B pruef_nk_einzelfehler.py VON BIS [AUSGABE.json] [--jung] [--doppel] [--keinbudget] [--tot|--nurtot] [--mehrarten]     (Szenario-Index VON..BIS−1 wie pruef_raster; PRUEF_STRENG=1 optional)
  --jung        Durchgang 1 sieht unklare Aufträge als JUNG (< UNKLAR_MAX_ALTER_MS — wie direkt nach einem abgestürzten Tageslauf); sonst schon als alt
  --doppel      zusätzlich eine zweite Störung (vor503) bei j > i (Stichprobe jede 3. Stelle)
  --keinbudget  Durchgang 1 mit dem Wiederholungs-Budget des Produktionscodes statt «aufgebraucht»
"""
import sys
import json
import time
import traceback
from collections import Counter
from pathlib import Path
HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
sys.dont_write_bytecode = True
import pruef_kill as K  # noqa: E402  (nullt die Wartezeiten, startet die Pruef-Boerse)
import pruef_raster as R  # noqa: E402
P, B, L = K.P, K.B, K.L

STOP_SPOT, MARKT_SPOT = R.STOP_SPOT, R.MARKT_SPOT


def regel(m, pfad, pred=None, art="vor503", anzahl=10 ** 7):
    return dict(methode=m, pfad=pfad, pred=pred, art=art, anzahl=anzahl, anzahl0=anzahl)


VORLAGEN = {
    "stops_scheitern": [regel("POST", "/fapi/v1/algoOrder"), regel("POST", "/api/v3/order", STOP_SPOT)],
    "spot_markt_unklar": [dict(methode="POST", pfad="/api/v3/order", pred=MARKT_SPOT, art="nach503", anzahl=1, anzahl0=1)],
    "perp_markt_unklar": [dict(methode="POST", pfad="/fapi/v1/order", pred=None, art="nach503", anzahl=1, anzahl0=1)],
    "stops_unsichtbar": [dict(methode="POST", pfad="/fapi/v1/algoOrder", pred=None, art="unsichtbar", anzahl=2, anzahl0=2, listen=3)],
}


class Tod(BaseException):
    """Der Tageslauf stirbt (wie os._exit im Abbruch-Scan, hier im Prozess): nach dem n-ten schreibenden Auftrag, vor dem Lesen der Antwort."""


def aufbauen(sz, vorlage):
    markt, z0, z1 = sz
    k, d, env = K.tag0(sz)
    if isinstance(vorlage, str) and vorlage.startswith("tot"):
        n = int(vorlage[3:])
        import urllib.request as _ur
        orig = _ur.urlopen
        zaehler = [0]

        def uo(req, *a, **kw):
            r = orig(req, *a, **kw)
            if getattr(req, "method", None) in ("POST", "DELETE") or (getattr(req, "data", None) is not None and getattr(req, "method", None) != "GET"):
                zaehler[0] += 1
                if zaehler[0] >= n:
                    raise Tod()
            return r
        _ur.urlopen = uo
        try:
            P.lauf([P.E(markt, z1)], env, d)
        except Tod:
            pass
        finally:
            _ur.urlopen = orig
        return k, d, env
    B.regeln = [dict(r) for r in VORLAGEN[vorlage]]
    try:
        P.lauf([P.E(markt, z1)], env, d)
    finally:
        B.regeln = []
    return k, d, env


def offen(d):
    try:
        b = json.loads(Path(d).read_text()).get("echt") or {}
    except (OSError, ValueError):
        return False
    return bool(b.get("unklar") or b.get("schutz_offen"))


def durchgang(env, d, erster, jung, budget0):
    """EIN Durchgang einmal=True; Budget-0-Emulation wie pruef_fuzzer (winzige Pausen + Budget 0)."""
    alt = (L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S, L.UNKLAR_MAX_ALTER_MS)
    try:
        if budget0:
            L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S = (1e-6,) * len(alt[0]), (1e-6,) * len(alt[1]), 0.0
        L.UNKLAR_MAX_ALTER_MS = alt[3] if (erster and jung) else -1
        return L.nachkontrolle(env=env, datei=d, schlafen=lambda s: None, uhr=lambda: 0.0, einmal=True)
    finally:
        L.LESE_WARTEN, L.SCHUTZ_WARTEN, L.EINMAL_RETRY_S, L.UNKLAR_MAX_ALTER_MS = alt


def fall(sz, vorlage, fehler, jung, budget0, nach=2):
    """fehler = [(i, art), ...] (i = Index der Anfrage im Durchgang 1, 0-basiert)."""
    k, d, env = aufbauen(sz, vorlage)
    if not offen(d):
        bf0 = K.befunde(k, d)       # kein Vermerk, kein Unklares: die Nachkontrolle taete nichts — liegt trotzdem etwas ohne Stop da, ist das ein Befund des TAGESLAUFS (Vermerk fehlt)
        if bf0:
            return dict(sz=sz, vorlage=vorlage, fehler=[], ausnahme=None, betrag=K.betrag(bf0), arten=[b[0] for b in bf0], vermerkt=P.vermerkt_je_markt(d), anfragen=0, unbekannt=[], ohne_vermerk=True)
        return None
    n0 = B.n_req
    B.regeln = [dict(methode=None, pfad=None, pred=None, art=art, anzahl=1, anzahl0=1, ab_req=n0 + i + 1, listen=3) for i, art in fehler]
    ex = None
    try:
        durchgang(env, d, True, jung, budget0)
    except Exception:  # noqa: BLE001
        ex = traceback.format_exc()[-500:]
    finally:
        B.regeln = []
    n_anfragen = B.n_req - n0
    for _ in range(nach):
        try:
            P.pending_abarbeiten(); B.n_listen += 1000
            durchgang(env, d, False, jung, budget0)
        except Exception:  # noqa: BLE001
            ex = ex or traceback.format_exc()[-500:]
    bf = K.befunde(k, d)
    return dict(sz=sz, vorlage=vorlage, fehler=fehler, ausnahme=ex, betrag=K.betrag(bf), arten=[b[0] for b in bf], vermerkt=P.vermerkt_je_markt(d), anfragen=n_anfragen,
                unbekannt=[u for u in R.unbekannte(k, d) if not u[2]][:3])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    von, bis = int(args[0]), int(args[1])
    ausgabe = args[2] if len(args) > 2 else None
    jung, budget0, doppel = "--jung" in flags, "--keinbudget" not in flags, "--doppel" in flags
    vorlagen = list(VORLAGEN) if "--nurtot" not in flags else []
    if "--tot" in flags or "--nurtot" in flags:
        vorlagen += [f"tot{n}" for n in range(1, 9)]
    z, funde = Counter(), []
    t0 = time.time()
    for si in range(von, min(bis, len(R.SZENARIEN))):
        sz = R.SZENARIEN[si]
        for vorlage in vorlagen:
            ref = fall(sz, vorlage, [], jung, budget0)
            if ref is None:
                z["nichts_offen"] += 1
                continue
            if ref.get("ohne_vermerk"):
                z["OHNE_VERMERK_UNGESCHUETZT"] += 1; funde.append(dict(ref, art="OHNE_VERMERK_UNGESCHUETZT"))
                continue
            N = ref["anfragen"]
            z["ref_ungeschuetzt"] += 1 if ref["arten"] else 0
            if ref["arten"]:
                funde.append(dict(ref, art="REFERENZ_OHNE_FEHLER_UNGESCHUETZT"))
            for i in range(N):
                for art in (("vor503", "nach503", "unsichtbar") + (("abriss", "429") if "--mehrarten" in flags else ())):
                    m = fall(sz, vorlage, [(i, art)], jung, budget0)
                    if m is None:
                        continue
                    z["faelle"] += 1
                    if m["ausnahme"]:
                        z["AUSNAHME"] += 1; funde.append(dict(m, art="AUSNAHME"))
                    if m["arten"] or m["unbekannt"]:
                        z["UNGESCHUETZT_NACH_3_DURCHGAENGEN"] += 1
                        funde.append(dict(m, art="UNGESCHUETZT"))
                        z["max_usdt"] = max(z["max_usdt"], max(m["betrag"]))
                    if doppel and i % 3 == 0:
                        for j in range(i + 1, N, 3):
                            m2 = fall(sz, vorlage, [(i, art), (j, "vor503")], jung, budget0)
                            if m2 is None:
                                continue
                            z["faelle_doppel"] += 1
                            if m2["ausnahme"]:
                                z["AUSNAHME_D"] += 1; funde.append(dict(m2, art="AUSNAHME_D"))
                            if m2["arten"] or m2["unbekannt"]:
                                z["UNGESCHUETZT_D"] += 1; funde.append(dict(m2, art="UNGESCHUETZT_D")); z["max_usdt_d"] = max(z["max_usdt_d"], max(m2["betrag"]))
        print("Szenario", si, sz, dict(z), f"{time.time() - t0:.0f}s", flush=True)
        if ausgabe:
            Path(ausgabe).write_text(json.dumps(funde, indent=1, default=str))
    print("FERTIG", dict(z))
    for f in funde[:8]:
        print(json.dumps({q: f.get(q) for q in ("art", "sz", "vorlage", "fehler", "betrag", "arten", "vermerkt", "ausnahme", "unbekannt")}, default=str)[:520])
    print(f"{len(funde)} Befunde")  # jeder Eintrag in `funde` ist ein Befund (UNGESCHUETZT*, AUSNAHME*, REFERENZ_…, OHNE_VERMERK_…)


if __name__ == "__main__":
    main()
