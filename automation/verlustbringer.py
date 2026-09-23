#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verlustbringer.py — Verlust-Waechter: nimmt Ware aus dem Verkauf, bei der JEDER Verkauf Geld kostet.

DER BEFUND (15.09.2026, gemessen ueber 432'085 aktive Varianten): 1'785 Produkte verlieren Geld,
SELBST wenn die Kundin CHF 7 Versand zahlt. 433 davon rettet eine massvolle Preiskorrektur
(<= 1,6-fach), 1'352 nicht: dort frisst die China-Fracht den ganzen Preis (Subwoofer CHF 15.90,
noetig waeren 992.83). Bei diesen Artikeln ist ein Verkauf SCHLECHTER als kein Verkauf — und sie
stehen im Google-Kanal, es wird also genau dafuer geworben.

NACHTRAG 22./23.09.2026 (Gegenpruefung): Das Skript vom 15.09. hatte KEINEN Starter, kein Log,
das Ledger stand seit dem 15.09. bei 12 Zeilen — waehrend «Kinder-Autositz Portabel 3-12 J.»
(CHF 14.90 bei EK 25.07, Sicherheitsprodukt ohne ECE-Angabe) und «Atemschutzmasken-Set mit
Filtern» (CHF 16.90 bei EK 49.32, als Hautpflege getaggt) in 6 Kanaelen kaufbar blieben.
Dazu drei Fehler der alten Fassung, alle behoben:
  1. `productUpdate(input:{tags:[…]})` ERSETZT alle Tags (Regel: nur tagsAdd/tagsRemove).
  2. Scharf war der STANDARD, Trockenlauf nur per DRY=1 — ein versehentlicher Start schrieb.
  3. Die 12 gedrafteten trugen KEINEN Verlust-Tag → jeder Rueckholer «ohne Risiko-Tag» haette sie
     zurueckgeholt. Jetzt zwei Tags: `verlust-auto-draft` (Urteil dieses Waechters) UND
     `marge-verlust-draft` (den kennen cj_versand_ch_revive/social_queue_wache/querbeet schon).

WAS DER WAECHTER TUT
  Standard = TROCKENLAUF (Bericht + Stand-Datei, keine Mutation).  `--scharf` oder SCHARF=1 draftet.
  «raus»  (Preis muesste > GRENZE-fach steigen): status DRAFT + beide Tags, CAP je Lauf.
  «heben» (Preiskorrektur <= GRENZE-fach wuerde reichen): NUR MELDEN — nie Preise schreiben.
          Die Absprache mit den Preisschreibern (preisboden, reprice_to_benchmark,
          kosten_boden15_korrigieren) ist offen; Liste liegt in dropship/_verlust_heben.json.
  Vor JEDER Mutation wird das Produkt LIVE gelesen (Status, Preis, EK) und der Verlust neu
  gerechnet; danach RUECKGELESEN (Status + Tags). Erst dann eine Ledgerzeile (mit flush).
  Rueckkehrer: steht ein Produkt im Ledger, aber im Export als aktiv und im Verlust, ist es wieder
  Kandidat (ein Ledger sagt, was einmal geschrieben wurde — der Export sagt, was ist).

EINGABE: Bulk-Export mit price + unitCost je Variante — /tmp/kost28.jsonl, den die Kosten-Kette
  des Aufsehers taeglich baut (automation/kosten_export_bauen.py, status:active). Aelter als
  MAXALTER (3 Tage) oder fehlend → «PAUSE: wartet auf Export», nichts wird erfunden.

⚠️ unitCost ENTHAELT DIE FRACHT SCHON (`cj_kosten_backfill.mjs`: «Warenkosten + VOLLE Fracht»).
   Wer sie ein zweites Mal abzieht, bekommt 229'374 Verlustartikel statt 1'785 (Fehler vom 15.09.).
⚠️ Fehlender unitCost heisst UNBEKANNT, nicht 0 — solche Varianten werden NIE angefasst.
⚠️ Massen-Schreiber: Eimer-Etikette (automation/eimer_etikette.py) nach jeder Antwort.

  python3 automation/verlustbringer.py                 Trockenlauf (Standard)
  python3 automation/verlustbringer.py --scharf        draftet «raus» bis CAP (Standard 300)
  EXPORT=/pfad.jsonl CAP=50 SCHARF=1 python3 …         Umgebungsvarianten (Aufseher nutzt SCHARF=1)

Ausgaben: dropship/_verlustbringer_done.txt (Ledger: gid \\t zeit \\t was \\t preis \\t ek \\t titel),
          dropship/_verlust_stand.json (fuer die Ampel-Zeile «VERLUST: N kaufbar»),
          dropship/_verlust_heben.json (Meldeliste fuer die Preisschreiber).
Log-Konvention des Aufsehers: letzte Zeile «PAUSE …» = 1 h warten; «FERTIG …» = 20 h Ruhe.
"""
import collections
import datetime
import glob
import json
import math
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, "tools"))
from marge_wahrheit import netto, mindestpreis  # noqa: E402

try:
    from eimer_etikette import nachlauf as _etikette, bilanz as _eimer_bilanz
except Exception:                       # Helfer fehlt (alter Snapshot) → ohne Etikette weiter, nie stehenbleiben
    def _etikette(d): return 0.0
    def _eimer_bilanz(): return "Eimer-Etikette: nicht geladen"

SCHARF = ("--scharf" in sys.argv) or os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "300"))
MAXALTER = int(os.environ.get("MAXALTER", str(3 * 86400)))
LEDGER = os.path.join(REPO, "dropship", "_verlustbringer_done.txt")
STAND = os.path.join(REPO, "dropship", "_verlust_stand.json")
HEBEN_DATEI = os.path.join(REPO, "dropship", "_verlust_heben.json")
TOKPFAD = "/tmp/cj_shop_token.txt"
SHOP = "au3j0y-hq.myshopify.com"
URL = f"https://{SHOP}/admin/api/2026-01/graphql.json"
GRENZE = 1.6          # bis hierhin waere eine Preiskorrektur denkbar (nur Meldung), darueber aus dem Verkauf
PUFFER = 3.00         # gewuenschter Gewinn je Verkauf im Gratisversand
VERSAND = 7.00        # was die Kundin unter der Gratis-Schwelle zahlt
TAGS = ["verlust-auto-draft", "marge-verlust-draft"]
EXPORT_KANDIDATEN = ["/tmp/kost28.jsonl", "/tmp/marge_export.jsonl"]


def jetzt():
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")


# ---------------------------------------------------------------- Export finden und pruefen
def hat_unitcost(pfad, zeilen=400):
    """Traegt der Export price+unitCost je Variante? (nur die ersten Zeilen lesen — 140 MB)"""
    try:
        with open(pfad, encoding="utf-8") as f:
            for i, z in enumerate(f):
                if i > zeilen:
                    break
                # ⚠️ Bulk-Export escaped Slashes: die GID steht als gid:\/\/shopify\/ProductVariant\/… — kein "ProductVariant" mit Anfuehrungszeichen davor
                if "ProductVariant" in z and '"unitCost"' in z and '"price"' in z:
                    return True
    except OSError:
        pass
    return False


def juengster_export():
    """EXPORT aus der Umgebung, sonst der juengste Export mit unitCost. Gibt (pfad, alter_s) oder (None, None)."""
    if os.environ.get("EXPORT"):
        p = os.environ["EXPORT"]
        return (p, time.time() - os.path.getmtime(p)) if os.path.exists(p) else (None, None)
    kand = [p for p in EXPORT_KANDIDATEN + glob.glob("/tmp/kost*.jsonl") if os.path.exists(p)]
    kand = sorted(set(kand), key=os.path.getmtime, reverse=True)
    for p in kand:
        if hat_unitcost(p):
            return p, time.time() - os.path.getmtime(p)
    return None, None


def lade(pfad):
    preis, ek, titel, produkte = {}, {}, {}, set()
    lade.n_var = 0
    for z in open(pfad, encoding="utf-8"):
        try:
            o = json.loads(z)
        except ValueError:
            continue                    # abgeschnittene Schlusszeile (21.09.) — nicht daran sterben
        i = o.get("id") or ""
        if "/Product/" in i:
            titel[i] = o.get("title", ""); produkte.add(i)
        elif "/ProductVariant/" in i:
            lade.n_var += 1
            try:
                pr = float(o.get("price") or 0)
            except ValueError:
                continue
            uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
            if uc is not None:
                preis[i] = (pr, o.get("__parentId")); ek[i] = float(uc)
    return preis, ek, titel, produkte


# ---------------------------------------------------------------- Ledger
def ledger_lesen():
    """{gid: zeit_iso_oder_None}. Alte Zeilen (15.09.) tragen nur die gid → Zeit 2026-09-15T19:00Z."""
    getan = {}
    if not os.path.exists(LEDGER):
        return getan
    for z in open(LEDGER, encoding="utf-8"):
        if not z.strip():
            continue
        t = z.rstrip("\n").split("\t")
        getan[t[0].strip()] = t[1].strip() if len(t) > 1 and t[1].strip() else "2026-09-15T19:00Z"
    return getan


def ledger_zeit_s(iso):
    try:
        return datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc).timestamp()
    except ValueError:
        return 0.0


def quitt(led, gid, was, pr, uc, titel):
    led.write(f"{gid}\t{jetzt()}\t{was}\t{pr:.2f}\t{uc:.2f}\t{(titel or '')[:60]}\n")
    led.flush()


# ---------------------------------------------------------------- Shopify
def tok():
    if not (os.path.exists(TOKPFAD) and open(TOKPFAD).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")], capture_output=True)
    return open(TOKPFAD).read().strip() if os.path.exists(TOKPFAD) else ""


_TOK = None


def gql(q, v=None):
    global _TOK
    if _TOK is None:
        _TOK = tok()
    grund = ""
    for i in range(8):
        b = json.dumps({"query": q, "variables": v or {}}).encode()
        r = urllib.request.Request(URL, b, {"X-Shopify-Access-Token": _TOK, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(r, timeout=45))
        except Exception as e:
            grund = f"Netz: {e}"[:80]; time.sleep(3 + i); continue
        errs = d.get("errors") or []
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            k = (d.get("extensions") or {}).get("cost") or {}; ts = k.get("throttleStatus") or {}
            time.sleep(min(20, max(2, (k.get("requestedQueryCost", 50) - (ts.get("currentlyAvailable") or 0))
                                   / (ts.get("restoreRate") or 50) + 1)))
            grund = "gedrosselt"; continue
        if errs:
            grund = str(errs)[:120]; time.sleep(2); continue
        _etikette(d)                    # 22.09.: dem Eimer einen Boden lassen (eimer_etikette.py)
        return d
    raise RuntimeError(f"Shopify antwortet nicht (8 Versuche) — letzter Grund: {grund}")


Q_LIVE = """query($id:ID!){ product(id:$id){ id title status tags
  variants(first:100){ nodes{ id price inventoryItem{ unitCost{ amount } } } } } }"""
M_DRAFT = """mutation($id:ID!){ productUpdate(product:{id:$id, status:DRAFT}){
  product{ id status } userErrors{ field message } } }"""
M_TAGS = """mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }"""
Q_RUECK = """query($id:ID!){ product(id:$id){ status tags } }"""


def lies_live(gid):
    d = gql(Q_LIVE, {"id": gid})
    return (d.get("data") or {}).get("product")


def verlust_live(p):
    """(alle_verlust, preis_min, ek_max) aus LIVE-Daten. None, wenn ein EK fehlt (unbekannt ≠ 0)."""
    vs = ((p.get("variants") or {}).get("nodes") or [])
    if not vs:
        return None
    paare = []
    for v in vs:
        uc = ((v.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
        if uc is None:
            return None
        paare.append((float(v.get("price") or 0), float(uc)))
    alle = all(netto(pr, uc, VERSAND) <= 0 for pr, uc in paare)
    return alle, min(pr for pr, _ in paare), max(uc for _, uc in paare)


def draften(gid):
    """DRAFT + beide Tags, dann RUECKLESEN. Gibt (ok, status, tags) zurueck — ok nur aus dem Ruecklesen."""
    r = (gql(M_DRAFT, {"id": gid}).get("data") or {}).get("productUpdate") or {}
    if r.get("userErrors"):
        return False, "userError:" + str(r["userErrors"][:1]), []
    r = (gql(M_TAGS, {"id": gid, "t": TAGS}).get("data") or {}).get("tagsAdd") or {}
    if r.get("userErrors"):
        return False, "tagsAdd:" + str(r["userErrors"][:1]), []
    p = (gql(Q_RUECK, {"id": gid}).get("data") or {}).get("product") or {}
    st, tg = p.get("status"), p.get("tags") or []
    return (st == "DRAFT" and all(t in tg for t in TAGS)), st, tg


def rappen(x):
    """auf die naechste .90 aufrunden — nie ABrunden, das wuerde den Verlust zurueckholen."""
    return math.floor(x) + 0.90 if math.floor(x) + 0.90 >= x else math.floor(x) + 1.90


# ---------------------------------------------------------------- Hauptlauf
def stand_schreiben(**k):
    k.setdefault("stand", datetime.date.today().isoformat())
    k.setdefault("zeit", jetzt())
    k.setdefault("modus", "scharf" if SCHARF else "dry")
    with open(STAND, "w", encoding="utf-8") as f:
        json.dump(k, f, ensure_ascii=False, indent=1)


def main():
    modus = "SCHARF" if SCHARF else "TROCKENLAUF"
    export, alter = juengster_export()
    if export is None or alter > MAXALTER:
        alter_h = round(alter / 3600, 1) if alter is not None else None
        stand_schreiben(wartet_auf_export=True, export=export, export_alter_h=alter_h,
                        kaufbar=None, heben=None, raus=None)
        print(f"VERLUSTBRINGER {modus}: kein brauchbarer Export (juengster: {export}, "
              f"{alter_h} h alt, erlaubt {MAXALTER // 3600} h)")
        print("PAUSE: wartet auf Export — automation/kosten_export_bauen.py baut /tmp/kost28.jsonl taeglich")
        return 3
    alter_h = round(alter / 3600, 1)
    print(f"VERLUSTBRINGER {modus} — Export {export} ({alter_h} h alt), CAP {CAP}, {jetzt()}", flush=True)
    preis, ek, titel, produkte = lade(export)
    vs = collections.defaultdict(list)
    for v, (pr, p) in preis.items():
        vs[p].append(v)
    getan = ledger_lesen()
    export_ts = os.path.getmtime(export)

    heben, raus, rueckkehrer, seit_export = [], [], [], []
    for p, liste in vs.items():
        # Nur wenn JEDE Variante auch MIT Versanderloes verliert — sonst gibt es einen Ausweg.
        if not all(netto(preis[v][0], ek[v], VERSAND) <= 0 for v in liste):
            continue
        if p in getan:
            if ledger_zeit_s(getan[p]) >= export_ts:
                seit_export.append(p); continue      # nach dem Export erledigt — der Export weiss es noch nicht
            rueckkehrer.append(p)                    # Ledger sagt erledigt, Export sagt aktiv + Verlust → wieder Kandidat
        f = max((mindestpreis(ek[v], 0.0) + PUFFER) / max(preis[v][0], 0.01) for v in liste)
        (heben if f <= GRENZE else raus).append(p)
    # teuerste Verluste zuerst (groesster EK-Ueberhang je Produkt)
    def ueberhang(p):
        return max(ek[v] - preis[v][0] for v in vs[p])
    raus.sort(key=ueberhang, reverse=True); heben.sort(key=ueberhang, reverse=True)

    print(f"  Produkte im Export      : {len(produkte)}  (Varianten mit EK: {len(preis)} von {lade.n_var})")
    print(f"  Verlust, Preis zu heben : {len(heben)}   (NUR Meldung → dropship/_verlust_heben.json)")
    print(f"  Verlust, aus dem Verkauf: {len(raus)}   (davon Rueckkehrer {len(rueckkehrer)})")
    print(f"  Ledger                  : {len(getan)}   (seit dem Export erledigt: {len(seit_export)})")

    with open(HEBEN_DATEI, "w", encoding="utf-8") as f:
        json.dump([{"id": p, "titel": titel.get(p, "")[:80],
                    "preis": min(preis[v][0] for v in vs[p]), "ek": max(ek[v] for v in vs[p]),
                    "mindestpreis_gratisversand": round(rappen(max(mindestpreis(ek[v], 0.0) for v in vs[p]) + PUFFER), 2)}
                   for p in heben], f, ensure_ascii=False, indent=0)

    if not SCHARF:
        print("\n  -- Trockenlauf, nichts geaendert. Beispiele (teuerste zuerst): --")
        for p in heben[:5]:
            v = vs[p][0]
            print(f"   HEBEN {preis[v][0]:7.2f} → {rappen(mindestpreis(ek[v], 0) + PUFFER):7.2f}  EK {ek[v]:7.2f}  {titel.get(p, '')[:44]}")
        for p in raus[:8]:
            v = vs[p][0]
            print(f"   RAUS  {preis[v][0]:7.2f}  EK {ek[v]:8.2f}  {titel.get(p, '')[:44]}{'  (Rueckkehrer)' if p in rueckkehrer else ''}")
        kaufbar = len(heben) + len(raus)
        stand_schreiben(wartet_auf_export=False, export=export, export_alter_h=alter_h,
                        produkte_im_export=len(produkte), varianten_mit_ek=len(preis),
                        heben=len(heben), raus=len(raus), rueckkehrer=len(rueckkehrer),
                        kaufbar=kaufbar, gedraftet_lauf=0, erledigt_gesamt=len(getan), rest_raus=len(raus))
        print(f"\nTROCKENLAUF FERTIG: {kaufbar} Verlustartikel kaufbar (Export-Stand) — scharf mit --scharf")
        return 0

    # ------------------------------------------------------------ scharf
    n = n_schon = n_kein = n_unklar = 0
    with open(LEDGER, "a", encoding="utf-8") as led:
        for p in raus:
            if n >= CAP:
                break
            try:
                live = lies_live(p)
            except Exception as e:
                n_unklar += 1; print(f"  ⚠️ unklar {p}: {e}", flush=True); continue
            if not live:
                n_unklar += 1; print(f"  ⚠️ nicht lesbar {p}", flush=True); continue
            t = live.get("title") or titel.get(p, "")
            if live.get("status") != "ACTIVE":
                n_schon += 1
                quitt(led, p, f"schon-{live.get('status')}", min(preis[v][0] for v in vs[p]), max(ek[v] for v in vs[p]), t)
                continue
            vl = verlust_live(live)
            if vl is None:
                n_unklar += 1; print(f"  ⚠️ EK live unbekannt, nicht angefasst: {t[:50]}", flush=True); continue
            alle, pr_min, ek_max = vl
            if not alle:
                n_kein += 1
                quitt(led, p, "kein-verlust-live", pr_min, ek_max, t)
                print(f"  ✓ live kein Verlust mehr (Preis/EK geaendert): {t[:50]}", flush=True)
                continue
            try:
                ok, st, tg = draften(p)
            except Exception as e:
                n_unklar += 1; print(f"  ⚠️ Mutation unklar {p}: {e}", flush=True); continue
            if not ok:
                n_unklar += 1; print(f"  ⚠️ NICHT gedraftet {p}: status={st} tags={tg[:4]}", flush=True); continue
            quitt(led, p, "draft", pr_min, ek_max, t)
            n += 1
            print(f"  ⛔ DRAFT {pr_min:7.2f} EK {ek_max:8.2f}  {t[:50]}", flush=True)

    rest = len(raus) - n - n_schon - n_kein
    kaufbar = len(heben) + max(rest, 0)
    stand_schreiben(wartet_auf_export=False, export=export, export_alter_h=alter_h,
                    produkte_im_export=len(produkte), varianten_mit_ek=len(preis),
                    heben=len(heben), raus=len(raus), rueckkehrer=len(rueckkehrer),
                    kaufbar=kaufbar, gedraftet_lauf=n, schon_draft=n_schon, kein_verlust_live=n_kein,
                    unklar=n_unklar, erledigt_gesamt=len(ledger_lesen()), rest_raus=max(rest, 0))
    print(f"\n{_eimer_bilanz()}")
    print(f"LAUF: {n} gedraftet (rueckgelesen), {n_schon} schon nicht mehr aktiv, {n_kein} live kein Verlust, "
          f"{n_unklar} unklar · {len(heben)} nur gemeldet · Rest raus: {max(rest, 0)}")
    if rest <= 0 and n_unklar == 0:
        print(f"FERTIG: keine Verlustware mehr im Verkauf (Export-Stand), {len(heben)} warten auf die Preisschreiber")
    elif n < CAP and rest > 0 and n_unklar > 0:
        print(f"PAUSE: {n_unklar} unklar — naechster Lauf in 1 h")
    return 0


if __name__ == "__main__":
    sys.exit(main())
