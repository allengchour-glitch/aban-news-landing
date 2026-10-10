#!/usr/bin/env python3
"""farbcode_praefix.py — Lieferanten-Artikelcode VOR der Farbe im Farb-/Ausführungsfeld abschneiden (10.10.2026).

GEMESSEN 10.10. (Optionen-Export 52'293 Produkte, 04:37 UTC): 396 aktive Produkte tragen einen Code vor dem Farbwort —
«646 Schwarz / 646 Aprikose», «8919 Armeegrün», «P0448H Schwarz», «2350 Black / 2350 Brown», «GS8111G Black» neben
«2GS8111G Brown»; vier davon Neuimporte vom selben Morgen (Herrenschuhe). Für die Kundin ist «646» keine Farbe, und der
Code ist ein Lieferanten-Leak (Regel 3).
WARUM ES DURCHKAM: farbcode_modell.py (09.10.) prüft nur Werte OHNE Leerzeichen («QW121» → «Modell N»). Der Importer-Helfer
ohneCode() verlangt einen GROSSBUCHSTABEN vorn (CODETOKEN) — «2350 Black», «646 Schwarz», «2GS8111G Brown» blieben.
REGEL (automation/data/farbcode_praefix_regel.json, dieselbe Datei liest farbcode_praefix.mjs in den CJ-Importern):
«CODE REST» → REST (englisch → deutsch über farben_de.json), wenn CODE ≥ 3 Ziffern hat, keine Einheit/Kennung ist und das
erste Wort von REST eine Farbe ist. Reine Zahlen ≤ 3 Ziffern nur bei gleichem Code in allen Werten (sonst evtl. Grösse).
Kollision → ganze Option bleibt. Gerätebezug im Titel → nur melden.

  python3 automation/farbcode_praefix.py              # trocken (Export /tmp/farbmuster_export.jsonl)
  SCHARF=1 [IDS=gid,…] [MAX=n] python3 automation/farbcode_praefix.py
  python3 automation/farbcode_praefix.py --selbsttest  # Kanarien + py=js über alle Exportwerte
Ledger: dropship/_farbcode_praefix.tsv
"""
import datetime, json, os, re, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
R = json.load(open(os.path.join(HIER, "data", "farbcode_praefix_regel.json"), encoding="utf-8"))
FACH = re.compile(json.load(open(os.path.join(HIER, "data", R["fach_titel_aus"]), encoding="utf-8"))["fach_titel"], re.I)
FARBEN = json.load(open(os.path.join(HIER, "farben_de.json"), encoding="utf-8"))
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_farbcode_praefix.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 0)
IDS = {x if x.startswith("gid:") else f"gid://shopify/Product/{x}" for x in os.environ.get("IDS", "").split(",") if x.strip()}

OPT = re.compile(R["optionen"], re.I)
CODE = re.compile(R["code"])
EINHEIT = re.compile(R["einheit"], re.I)
BEKANNT = re.compile(R["bekannt"], re.I)
ENDUNG = re.compile(R["farbe_endung"], re.I)
MODIF = re.compile(R["modifikator"], re.I)
TRENN = re.compile(r"[\s\-/]+")
# Farbwörter = alle einteiligen Schlüssel und Werte der Farbtabelle (dieselbe Bildung in farbcode_praefix.mjs)
WORT = set()
for _k, _v in FARBEN.items():
    for _w in (_k, _v):
        if not TRENN.search(_w):
            WORT.add(_w.lower())


def de_farbe(t):
    return FARBEN.get(t.strip().lower(), t.strip())


def farbwort(w):
    w = w.lower()
    return len(w) >= R["wort_min"] and (w in WORT or bool(ENDUNG.search(w)))


def rest_ist_farbe(rest):
    t = [x for x in TRENN.split(rest.strip()) if x]
    if not t:
        return False
    if farbwort(t[0]):
        return True
    return bool(MODIF.match(t[0])) and len(t) > 1 and farbwort(t[1])


def zerlege(w):
    """«646 Schwarz» → ("646", "Schwarz"); sonst None."""
    m = re.match(r"^(\S+)\s+(\S.*)$", (w or "").strip())
    if not m:
        return None
    code, rest = m[1], m[2]
    if not CODE.match(code) or EINHEIT.match(code) or BEKANNT.match(code) or not rest_ist_farbe(rest):
        return None
    return code, rest


def neu_werte(werte, titel=""):
    """Werte EINER Option → neue Werte (gleiche Reihenfolge) oder None (nichts zu tun, Kollision, Gerätetitel)."""
    if titel and FACH.search(titel):
        return None
    teile = [zerlege(w) for w in werte]
    codes = [t[0] for t in teile if t]
    if not codes:
        return None
    if any(c.isdigit() and len(c) <= 3 for c in codes) and (len(set(codes)) > 1 or len(werte) < 2):
        return None                                   # «110 Rot / 120 Blau»: kann Grösse sein
    neu = [de_farbe(t[1]) if t else w.strip() for w, t in zip(werte, teile)]
    if len({x.lower() for x in neu}) != len(neu) or any(not x for x in neu):
        return None
    return neu


def kanarien(still=False):
    f = n = 0
    for ein, soll in R["kanarien"]:
        n += 1
        ist = neu_werte(ein) or ein
        if ist != soll:
            f += 1; print(f"  ✗ {ein} → {ist} (soll {soll})")
    for titel, ein, soll in R["kanarien_titel"]:
        n += 1
        ist = neu_werte(ein, titel)
        if ist != soll:
            f += 1; print(f"  ✗ «{titel}» {ein} → {ist} (soll {soll})")
    if not still:
        print(f"FARBCODE-PRAEFIX-KANARIEN {n - f}/{n}")
    return f == 0


def paritaet():
    """py = js über alle Farb-/Ausführungsoptionen des Exports (mit Titel)."""
    gruppen = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        for o in p.get("options") or []:
            if OPT.match(o["name"]):
                gruppen.append([p.get("title") or "", [v["name"] for v in o["optionValues"]]])
    py = [neu_werte(w, t) for t, w in gruppen]
    js_code = ("import fs from 'node:fs'; import {praefixWeg} from './automation/farbcode_praefix.mjs';"
               "const g=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(JSON.stringify(g.map(([t,w])=>praefixWeg(w,t))));")
    r = subprocess.run(["/opt/node22/bin/node", "--input-type=module", "-e", js_code], input=json.dumps(gruppen),
                       capture_output=True, text=True, cwd=REPO, timeout=300)
    js = json.loads(r.stdout)
    ab = [(g, a, b) for g, a, b in zip(gruppen, py, js) if a != b]
    for g, a, b in ab[:5]:
        print("  ≠", g[1][:3], a and a[:3], b and b[:3])
    print(f"FARBCODE-PRAEFIX py=js: {len(gruppen)} Optionen, {sum(x is not None for x in py)} mit Code vorn, {len(ab)} Abweichungen")
    return not ab


def kandidaten():
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        if IDS and p["id"] not in IDS:
            continue
        werte = [[v["name"] for v in o["optionValues"]] for o in p.get("options") or [] if OPT.match(o["name"])]
        if any(neu_werte(w, "") for w in werte):      # Titelprüfung live in bearbeiten() (meldet Gerätetitel)
            yield p


def bearbeiten(pid):
    from kaufwille_zeile import gql
    p = gql('query($i:ID!){product(id:$i){id title status options{id name linkedMetafield{key} optionValues{id name}}}}',
            {"i": pid})["product"]
    if not p or p["status"] != "ACTIVE":
        return [("—", "", "nicht aktiv")]
    if FACH.search(p["title"] or ""):
        return [("—", "", "fach-titel (gemeldet)")]
    erg = []
    for o in p["options"]:
        if not OPT.match(o["name"]):
            continue
        alt = [v["name"] for v in o["optionValues"]]
        neu = neu_werte(alt, p["title"])
        if not neu:
            continue
        aend = " | ".join(f"{a}→{b}" for a, b in zip(alt, neu) if a != b)
        if o.get("linkedMetafield"):
            erg.append((o["name"], aend, "linkedMetafield")); continue
        if not SCHARF:
            erg.append((o["name"], aend, "trocken")); continue
        upd = [{"id": v["id"], "name": n} for v, n in zip(o["optionValues"], neu) if v["name"] != n]
        r = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,"
                "optionValuesToUpdate:$u,variantStrategy:LEAVE_AS_IS){userErrors{field message}}}",
                {"p": pid, "o": {"id": o["id"]}, "u": upd})["productOptionUpdate"]
        if r["userErrors"]:
            erg.append((o["name"], aend, "FEHLER " + r["userErrors"][0]["message"][:80])); continue
        rl = gql('query($i:ID!){product(id:$i){options{id optionValues{name}}}}', {"i": pid})["product"]["options"]
        o2 = next((x for x in rl if x["id"] == o["id"]), None)
        ok = o2 and [v["name"] for v in o2["optionValues"]] == neu
        erg.append((o["name"], aend, "ok" if ok else "RÜCKLESEN ABWEICHEND"))
    return erg or [("—", "", "live nichts zu tun")]


def main():
    if not kanarien():
        raise SystemExit("Kanarien rot")
    if "--kanarien" in sys.argv:
        return
    if "--selbsttest" in sys.argv:
        sys.exit(0 if paritaet() else 1)
    if not os.path.exists(EXPORT):
        raise SystemExit(f"Export fehlt: {EXPORT}")
    kand = list(kandidaten())
    if MAX:
        kand = kand[:MAX]
    print(f"START {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {len(kand)} Kandidaten · {'SCHARF' if SCHARF else 'TROCKEN'}")
    zahl = {}
    with open(LEDGER, "a", encoding="utf-8") as led:
        for p in kand:
            for opt, aend, st in bearbeiten(p["id"]):
                k = st.split(" ")[0]
                zahl[k] = zahl.get(k, 0) + 1
                print(f"  {st:10} {p['title'][:48]:48} {opt}: {aend[:160]}")
                if SCHARF:
                    led.write(f"{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{p['id']}\t{opt}\t{aend}\t{st}\n")
    print(f"FERTIG {datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {zahl}")


if __name__ == "__main__":
    main()
