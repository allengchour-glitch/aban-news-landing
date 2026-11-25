#!/usr/bin/env python3
"""mindest_stueckgewinn.py — hebt knapp kalkulierte Varianten auf Einkauf + CHF 8 (Betreiber 26.11.2026 «2 ja»).

DER BEFUND (Verkaufs-Analyse 25.11.2026, dropship/verkauf-2511/ANALYSE.md): Gewinn je Bestellung Ø CHF 16.24 inkl. Versanderlös
und Gebühren. 71 % der sichtbaren Produkte stehen ≤ CHF 1 über dem Verlustschutz-Boden (preis_verlustschutz.boden: bei 15 %
Rabatt genau 0 Gewinn); Stückgewinn (Preis − unitCost) im Median CHF 6.69, 62 % unter CHF 8. Ziel des Betreibers ≈ CHF 25 je Bestellung.

REGEL (vom Betreiber bestätigt, Punkt 2 der Entscheidliste):
  - Preis ≥ unitCost + MIN (CHF 8), auf .90 AUFGERUNDET. NUR ERHÖHEN, nie senken.
  - KEIN Streichpreis: Varianten mit compareAtPrice werden übersprungen (Schweizer PBV: kein erfundener «statt»-Preis).
  - Erst NACH der Black Week (Rabatt endet 30.11. 22:59 UTC): scharf vorher = Abbruch (Preis mitten in einer beworbenen Aktion
    zu erhöhen wäre irreführend).
  - Ausgenommen: Druck auf Bestellung / Editor (Tags printful*, pod, selbst-gestalten; Editor ist heilig, Kosten unvollständig),
    Produkte ohne unitCost, nicht aktive Produkte, Werbetest-Sperre, Sprünge > Faktor MAX_FAKTOR (1.6 → Datenfehler-Verdacht, nur melden).
  - Kosten = inventoryItem.unitCost (enthält bei CJ die Fracht mit Versandgewicht, kosten_neu_runner 24.11.).

EINGABE: Voll-Export /tmp/kost28.jsonl (Kosten-Kette des Aufsehers, ≤ 3 Tage alt) zur KANDIDATEN-Auswahl; vor dem Schreiben wird
jedes Produkt LIVE gelesen (Status, Tags, Preis, Streichpreis, unitCost) — der Export entscheidet nichts allein.
LEDGER: dropship/_mindest_stueckgewinn.tsv (datum, produkt-gid, handle, varianten-gid, alt, neu, kosten). Rückweg: --zurueck
(setzt nur Varianten zurück, deren Preis noch genau dem geschriebenen Wert entspricht).

  python3 automation/mindest_stueckgewinn.py                 # Trockenlauf: Zählung + Beispiele
  SCHARF=1 [LIMIT=n] python3 automation/mindest_stueckgewinn.py
  python3 automation/mindest_stueckgewinn.py --selbsttest
  SCHARF=1 python3 automation/mindest_stueckgewinn.py --zurueck
"""
import datetime as dt, json, math, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

MIN = float(os.environ.get("MIN", "8"))
MAX_FAKTOR = float(os.environ.get("MAX_FAKTOR", "1.6"))
EXPORT = os.environ.get("EXPORT", "/tmp/kost28.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_mindest_stueckgewinn.tsv")
BW_ENDE = dt.datetime(2026, 11, 30, 23, 0, tzinfo=dt.timezone.utc)
SPERR_TAGS = ("printful", "pod", "selbst-gestalten", "editor")
SCHARF = os.environ.get("SCHARF") == "1"
LIMIT = int(os.environ.get("LIMIT", "0") or 0)


def zielpreis(kosten, minimum=MIN):
    """Kleinster Preis ≥ kosten + minimum, der auf .90 endet."""
    roh = kosten + minimum
    b = math.floor(roh) + 0.90
    return round(b if b >= roh - 1e-9 else b + 1.0, 2)


def urteil(preis, kosten, vergleich, minimum=MIN, max_faktor=MAX_FAKTOR):
    """→ (aktion, neuer_preis). aktion: ok | anheben | streichpreis | ohne-kosten | sprung"""
    if not kosten or kosten <= 0:
        return "ohne-kosten", None
    if vergleich and vergleich > 0:
        return "streichpreis", None
    if preis - kosten >= minimum - 1e-9:
        return "ok", None
    neu = zielpreis(kosten, minimum)
    if neu <= preis:
        return "ok", None
    if preis > 0 and neu / preis > max_faktor:
        return "sprung", neu
    return "anheben", neu


def gesperrt(tags):
    t = [x.lower() for x in tags or []]
    return any(x.startswith(SPERR_TAGS) or x in SPERR_TAGS for x in t)


def kandidaten():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 3 * 86400:
        print(f"PAUSE: Export {EXPORT} fehlt oder älter als 3 Tage"); sys.exit(2)
    prod, plan, zahl = {}, {}, {"ok": 0, "anheben": 0, "streichpreis": 0, "ohne-kosten": 0, "sprung": 0}
    with open(EXPORT, encoding="utf-8") as f:
        for z in f:
            o = json.loads(z)
            if "__parentId" not in o:
                prod[o["id"]] = o.get("title", "")
                continue
            ii = o.get("inventoryItem") or {}
            k = float(((ii.get("unitCost") or {}).get("amount")) or 0)
            p = float(o.get("price") or 0)
            v = float(o.get("compareAtPrice") or 0)
            a, neu = urteil(p, k, v)
            zahl[a] += 1
            if a in ("anheben", "sprung"):
                plan.setdefault(o["__parentId"], []).append((o["id"], p, neu, k, a))
    return prod, plan, zahl


def live(pid):
    from seo_autopilot import gql
    return gql('query($i:ID!){p:product(id:$i){handle status tags variants(first:250){nodes{id price compareAtPrice '
               'inventoryItem{unitCost{amount}}}}}}', {"i": pid})["p"]


def schreiben(pid, updates):
    from seo_autopilot import gql
    r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){'
            'productVariants{id price} userErrors{field message}}}', {"p": pid, "v": [{"id": i, "price": f"{n:.2f}"} for i, n in updates]})
    return r["productVariantsBulkUpdate"]


def main():
    from werbetest_sperre import gesperrt as wt_gesperrt  # noqa: E402 — Helfer der Werbetest-Sperre
    prod, plan, zahl = kandidaten()
    n_var = sum(len(v) for v in plan.values())
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'} · MIN CHF {MIN:.0f} · Varianten: "
          + " · ".join(f"{k} {v}" for k, v in zahl.items()) + f" · Produkte mit Anhebung/Sprung {len(plan)}", flush=True)
    if not SCHARF:
        for pid, vs in list(plan.items())[:12]:
            for vid, p, neu, k, a in vs[:2]:
                print(f"  {a:8} {prod.get(pid, '')[:50]:50} {p:7.2f} → {neu:7.2f} (Kosten {k:.2f})")
        print(f"FERTIG (trocken): {n_var} Varianten in {len(plan)} Produkten")
        return
    if dt.datetime.now(dt.timezone.utc) < BW_ENDE:
        print("ABBRUCH: Black Week läuft bis 30.11. 22:59 UTC — Preiserhöhung erst danach (Betreiber-Entscheid)"); sys.exit(3)
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[3] for z in open(LEDGER, encoding="utf-8") if z.count("\t") >= 6}
    n_prod = n_ok = n_fehler = n_sprung = 0
    for pid, vs in plan.items():
        if LIMIT and n_prod >= LIMIT:
            break
        try:
            p = live(pid)
        except Exception as e:
            n_fehler += 1; print(f"FEHLER lesen {pid}: {str(e)[:100]}"); continue
        if not p or p["status"] != "ACTIVE" or gesperrt(p["tags"]) or wt_gesperrt(p["handle"]):
            continue
        updates = []
        for v in p["variants"]["nodes"]:
            if v["id"] in erledigt:
                continue
            k = float(((v.get("inventoryItem") or {}).get("unitCost") or {}).get("amount") or 0)
            a, neu = urteil(float(v["price"]), k, float(v.get("compareAtPrice") or 0))
            if a == "anheben":
                updates.append((v["id"], neu, float(v["price"]), k))
            elif a == "sprung":
                n_sprung += 1
        if not updates:
            continue
        n_prod += 1
        r = schreiben(pid, [(i, n) for i, n, _, _ in updates])
        if r["userErrors"]:
            n_fehler += 1; print(f"FEHLER {p['handle']}: {r['userErrors'][:1]}"); continue
        zurueck = {x["id"]: float(x["price"]) for x in r["productVariants"]}
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i, n, alt, k in updates:
                if abs(zurueck.get(i, -1) - n) < 0.005:
                    f.write(f"{dt.date.today()}\t{pid}\t{p['handle']}\t{i}\t{alt:.2f}\t{n:.2f}\t{k:.2f}\n"); n_ok += 1
                else:
                    n_fehler += 1
        time.sleep(0.3)
    print(f"FERTIG: {n_prod} Produkte · {n_ok} Varianten angehoben und zurückgelesen · {n_sprung} Sprünge > ×{MAX_FAKTOR} nur gemeldet · {n_fehler} Fehler")


def zurueck():
    from seo_autopilot import gql
    zeilen = [z.rstrip("\n").split("\t") for z in open(LEDGER, encoding="utf-8") if z.count("\t") >= 6]
    je = {}
    for d, pid, h, vid, alt, neu, k in zeilen:
        je.setdefault(pid, []).append((vid, float(alt), float(neu)))
    n = 0
    for pid, vs in je.items():
        akt = {v["id"]: float(v["price"]) for v in live(pid)["variants"]["nodes"]}
        u = [(vid, alt) for vid, alt, neu in vs if abs(akt.get(vid, -1) - neu) < 0.005]
        if u and SCHARF:
            schreiben(pid, u); n += len(u)
        elif u:
            n += len(u)
    print(f"ZURÜCK{'' if SCHARF else ' (trocken)'}: {n} Varianten")


def selbsttest():
    f = 0
    def soll(x, y, t):
        nonlocal f
        if x != y: f += 1; print(f"FALSCH {t}: {x} ≠ {y}")
    soll(zielpreis(10.0), 18.90, "10 + 8 = 18 → 18.90")
    soll(zielpreis(10.90), 18.90, "10.90 + 8 = 18.90 genau")
    soll(zielpreis(10.95), 19.90, "18.95 → 19.90")
    soll(urteil(19.90, 10.0, 0), ("ok", None), "Gewinn 9.90 ≥ 8")
    soll(urteil(15.90, 10.0, 0), ("anheben", 18.90), "Gewinn 5.90 → 18.90")
    soll(urteil(15.90, 10.0, 29.90), ("streichpreis", None), "Streichpreis bleibt")
    soll(urteil(15.90, 0, 0), ("ohne-kosten", None), "ohne Kosten nichts")
    soll(urteil(9.90, 12.0, 0), ("sprung", 20.90), "Faktor 2.1 → nur melden")
    soll(urteil(18.90, 10.90, 0), ("ok", None), "genau 8 → ok")
    soll(gesperrt(["printful_personalized_product"]), True, "POD gesperrt")
    soll(gesperrt(["Selbst-Gestalten"]), True, "Editor gesperrt (gross)")
    soll(gesperrt(["hund", "winter"]), False, "normale Tags frei")
    print(f"SELBSTTEST {'OK' if not f else 'FEHLER'}: {12 - f}/12")
    return 1 if f else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zurueck" in sys.argv:
        zurueck(); sys.exit(0)
    main()
