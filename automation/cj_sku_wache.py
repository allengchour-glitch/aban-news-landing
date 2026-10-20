#!/usr/bin/env python3
"""cj_sku_wache.py — erkennt NEUE CJ-SKU-Formen, bevor sie eine Bestellung kosten (20.10.2026).

ANLASS: Vollmessung über 552'927 Varianten: 3'466 nackte CJ-SKUs («CJYDQXHB00011-BROWN-39») fielen durch die Erkennung des
Bestellmotors und mehrerer Wächter; keine Stelle hätte es gemeldet (Journal 20.10. 🔤). Die Erkennung steht jetzt EINMAL in
`automation/cj_sku.py`. Diese Wache hält sie ehrlich:

  1. Code-Kanarienvogel: `cj_sku.py --selbsttest` muss grün sein, und die Verbraucher (Bestellmotor, Lagerabgleich, Auslistungs-
     Wächter, Varianten-Wache, Versand-Guard) müssen `cj_sku` noch einbinden — sonst hat jemand eine Kopie der alten Regel zurückgeholt.
  2. Neuimporte: alle Produkte der letzten TAGE (3) — jede Variante, deren SKU mit «CJ» beginnt, aber NICHT «CJ-» und von
     `cj_sku.form()` nicht erkannt wird, ist eine unbekannte Form (Befund; Beispiele im Stand).
  3. Schreibt `dropship/_cj_sku_stand.json` {stand, geprueft_produkte, geprueft_varianten, unbekannt, beispiele, code_ok}. Die
     Betreiber-Ampel liest die Datei (schnell, ohne Shopify) und meldet «CJ-SKU: …» bei Befund oder Stand älter als 2 Tage.

  python3 automation/cj_sku_wache.py              Lauf (Shopify lesen, Stand schreiben, Exit 1 bei Befund)
  python3 automation/cj_sku_wache.py --selbsttest
  python3 automation/cj_sku_wache.py --zeile      Ampelzeile aus dem Stand (leer = in Ordnung)
"""
import datetime as dt
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cj_sku  # noqa: E402

STAND = os.path.join(REPO, "dropship", "_cj_sku_stand.json")
TAGE = int(os.environ.get("TAGE", "3"))
ALT_TAGE = 2.0
# Verbraucher, die cj_sku einbinden MÜSSEN (Datei → Suchtext). Fehlt der Text, hat jemand die Kopie der alten Regel zurückgebracht.
VERBRAUCHER = {
    "cj_order_engine.py": "import cj_sku",
    "cj_lager_abgleich.py": "import cj_sku",
    "cj_ausgelistet_sichtbar.py": "import cj_sku",
    "ek_luecke_cj.py": "import cj_sku",
    "cj_varianten_wache.py": "import cj_sku",
    "cj_versand_ch_guard.py": "import cj_sku",
}


def unbekannte_formen(skus):
    """Nackte CJ-SKUs (beginnen mit CJ, aber nicht «CJ-»), die cj_sku nicht als CJ-Form kennt → Liste (SKU)."""
    out = []
    for s in skus:
        t = (s or "").strip()
        if t.upper().startswith("CJ") and not t.upper().startswith("CJ-") and not cj_sku.ist_cj_form(t):
            out.append(t)
    return out


def code_ok():
    """(ok, Grund). Selbsttest der Quelle + Einbindung der Verbraucher."""
    import subprocess
    r = subprocess.run([sys.executable, "-B", os.path.join(os.path.dirname(os.path.abspath(__file__)), "cj_sku.py"), "--selbsttest"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return False, "cj_sku.py --selbsttest rot: " + (r.stdout.strip().splitlines() or ["?"])[-1][:100]
    fehlt = []
    for datei, text in VERBRAUCHER.items():
        pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), datei)
        try:
            if text not in open(pfad, encoding="utf-8").read():
                fehlt.append(datei)
        except OSError:
            fehlt.append(datei + " (fehlt)")
    if fehlt:
        return False, "bindet cj_sku nicht mehr ein: " + ", ".join(fehlt)
    return True, ""


def lauf():
    from kaufwille_zeile import gql
    ab = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=TAGE)).strftime("%Y-%m-%d")
    q = ('query($c:String,$q:String!){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
         'nodes{id handle variants(first:100){nodes{sku}}}}}')
    cur, prod, var, unb, bsp = None, 0, 0, 0, []
    while True:
        d = gql(q, {"c": cur, "q": f"created_at:>{ab}"})   # gql() liefert schon das Feld «data»; Fehler = RuntimeError
        pg = (d or {}).get("products")
        if not pg:
            print("⚠️ Shopify-Antwort ohne Produkte — kein Urteil, Stand bleibt", flush=True)
            return 2
        for p in pg["nodes"]:
            prod += 1
            skus = [(v.get("sku") or "") for v in (p.get("variants") or {}).get("nodes") or []]
            var += len(skus)
            u = unbekannte_formen(skus)
            unb += len(u)
            if u and len(bsp) < 8:
                bsp.append({"handle": p["handle"], "sku": u[0]})
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    ok, grund = code_ok()
    stand = {"stand": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "tage": TAGE, "geprueft_produkte": prod,
             "geprueft_varianten": var, "unbekannt": unb, "beispiele": bsp, "code_ok": ok, "code_grund": grund}
    tmp = STAND + ".tmp"
    json.dump(stand, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)
    print(f"CJ-SKU: {prod} Produkte / {var} Varianten der letzten {TAGE} Tage · unbekannte Form: {unb} · Code {'ok' if ok else 'ROT: ' + grund}", flush=True)
    for b in bsp:
        print(f"  ❓ {b['handle']}: {b['sku']}", flush=True)
    return 0 if (unb == 0 and ok) else 1


def zeile(pfad=STAND, jetzt=None):
    """Ampelzeile aus dem Stand; None = in Ordnung. Fehlender/alter/unlesbarer Stand ist 'unklar', nie 'in Ordnung'."""
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    try:
        d = json.load(open(pfad, encoding="utf-8"))
        t = dt.datetime.strptime(d["stand"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    except Exception as e:
        return f"⚠️ CJ-SKU: kein lesbarer Stand ({type(e).__name__}) — Wache lief nie oder ist gestorben (automation/cj_sku_wache.py)"
    alter = (jetzt - t).total_seconds() / 86400.0
    teile = []
    if not d.get("code_ok", False):
        teile.append("Code: " + str(d.get("code_grund") or "rot"))
    if int(d.get("unbekannt") or 0) > 0:
        b = (d.get("beispiele") or [{}])[0]
        teile.append(f"{d['unbekannt']} Variante(n) mit UNBEKANNTER CJ-SKU-Form in den Neuimporten (z. B. {b.get('sku')}) — Bestellmotor würde sie überspringen")
    if alter > ALT_TAGE:
        teile.append(f"Stand {int(alter)} Tage alt")
    return ("⚠️ CJ-SKU: " + " · ".join(teile)) if teile else None


def selbsttest():
    import tempfile
    f = []

    def ok(n, b): f.append((n, bool(b)))
    ok("bekannte Formen sind nicht unbekannt", unbekannte_formen(["CJYD225829901AZ", "CJ-CJYD225829901AZ", "CJYDQXHB00011-BROWN-39", "CJJJJTJT22925", "CJ-123", "fortura-1", "", None]) == [])
    ok("echte Unbekannte werden gemeldet", unbekannte_formen(["CJ12", "CJX", "CJ.ABC", "CJYD12"]) == ["CJ12", "CJX", "CJ.ABC", "CJYD12"])
    ok("Fremd-SKUs ohne CJ-Präfix zählen nicht", unbekannte_formen(["fortura-1", "bb-1", "5599797_4012"]) == [])
    jetzt = dt.datetime(2026, 10, 21, 8, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as dd:
        p = os.path.join(dd, "stand.json")
        ok("fehlender Stand → Warnung", (zeile(os.path.join(dd, "x.json"), jetzt) or "").startswith("⚠️ CJ-SKU: kein lesbarer Stand"))

        def schreibe(**kw):
            d = {"stand": "2026-10-21T06:00:00Z", "code_ok": True, "code_grund": "", "unbekannt": 0, "beispiele": []}
            d.update(kw)
            json.dump(d, open(p, "w"))
        schreibe()
        ok("frisch und sauber → None", zeile(p, jetzt) is None)
        schreibe(unbekannt=3, beispiele=[{"handle": "h", "sku": "CJ12"}])
        z = zeile(p, jetzt)
        ok("Unbekannte → Warnung mit Beispiel", z and "3 Variante(n)" in z and "CJ12" in z)
        schreibe(code_ok=False, code_grund="bindet cj_sku nicht mehr ein: cj_order_engine.py")
        ok("Code rot → Warnung mit Grund", "cj_order_engine.py" in (zeile(p, jetzt) or ""))
        schreibe(stand="2026-10-17T06:00:00Z")
        ok("Stand 4 Tage alt → Warnung", "Tage alt" in (zeile(p, jetzt) or ""))
        schreibe(stand="2026-10-19T08:00:00Z")
        ok("genau 2,0 Tage → noch ok (Grenze erst darüber)", zeile(p, jetzt) is None)
        open(p, "w").write("{kaputt")
        ok("kaputter Stand → Warnung, nie 'in Ordnung'", zeile(p, jetzt) is not None)
    kod, grund = code_ok()
    ok(f"Code-Kanarienvogel auf dem echten Repo ({grund or 'ok'})", kod)
    # Gegenprobe: fehlt der Einbindungs-Text in einem Verbraucher, wird der Code-Kanarienvogel rot (sonst wäre er blind)
    alt = dict(VERBRAUCHER)
    try:
        VERBRAUCHER["cj_order_engine.py"] = "TEXT-DER-NIRGENDS-STEHT"
        kod2, grund2 = code_ok()
        ok("Code-Kanarienvogel wird rot, wenn ein Verbraucher cj_sku nicht mehr einbindet", (not kod2) and "cj_order_engine.py" in grund2)
    finally:
        VERBRAUCHER.clear(); VERBRAUCHER.update(alt)
    for n, b in f:
        print(("  ok   " if b else "  FEHL ") + n)
    return 0 if all(b for _, b in f) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile() or "")
        sys.exit(0)
    sys.exit(lauf())
