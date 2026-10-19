#!/usr/bin/env python3
"""masse_groessenliste.py — «Masse: S,M,L, × L,2 × L» im Produktdetails-Block heilen (19.10.2026, Spähtrupp katalog K4).

URSACHE (Quelle jetzt behoben, automation/cj_specs.mjs extractSpecs): `.replace(/\\s*x\\s*/gi,' × ')` machte JEDES «x» zum Malzeichen — «XL, 2XL» wurde «× L, 2 × L».
220 aktive Produkte trugen das, 149 davon aus diesem Monat (Mode Herren 137, Damen 59, Haustier 16).

HEILUNG je `<li><strong>Masse:</strong> WERT</li>` mit «× L»-Muster (nur Buchstaben nach dem Malzeichen — echte Masse wie «20 × 30 cm» bleiben unberührt):
  · «× L» → «XL», «2 × L» → «2XL» (nur [SML] direkt nach dem Malzeichen, Wortgrenze).
  · Ist der Rest danach eine REINE Kleidergrössen-Liste («S,M,L,XL,2XL»), fliegt die Zeile ganz raus (Grössen gehören in die Option «Grösse», wie cj_specs.mjs es
    seit heute verlangt). Mischwerte («M 165–170 cm, L 170–178 cm, XL 178–185 cm») bleiben, mit korrigiertem XL.
Kandidaten: Export /tmp/versprechen_export.jsonl (Treffer-Liste), GEPRÜFT/GESCHRIEBEN wird gegen den LIVE-Text (nodes(ids)); Werbetest-Produkte ausgelassen;
Schreiben nur mit SCHARF=1, unter dem gemeinsamen Text-Schloss /tmp/lock_produkttext.lock, mit Rücklesen. Ledger dropship/_masse_groessenliste.tsv
(id<TAB>alte Zeile<TAB>neue Zeile oder «-») = Rückweg per String-Ersetzung.
    python3 automation/masse_groessenliste.py --selbsttest
    CAP=50 python3 automation/masse_groessenliste.py          # DRY: zeigt Vorher/Nachher
    SCHARF=1 CAP=300 python3 automation/masse_groessenliste.py
"""
import fcntl
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

EXPORT = os.environ.get("EXPORT", "/tmp/versprechen_export.jsonl")
LEDGER = "dropship/_masse_groessenliste.tsv"
VORHER = "dropship/_masse_groessenliste_vorher.jsonl"
CAP = int(os.environ.get("CAP", "300"))
SCHARF = os.environ.get("SCHARF") == "1"

LI = re.compile(r"<li>\s*<strong>(?:Masse|Gewicht|Länge|Breite|Höhe|Verpackungsmasse):</strong>\s*([^<]*?)\s*</li>", re.S)    # 19.10. Prüfung F3: auch Gewicht & Co. («S 640g - 3 × L 760g»)
MUSTER = re.compile(r"×\s*[SMLsml]\b")
NUR_GROESSEN = re.compile(r"^(?:\s*(?:XXS|XS|[SML]|\d{0,2}X{1,4}L)\s*[,/–-]?)+$", re.I)


def _v1(wert):
    """Erste (FALSCHE) Fassung vom 19.10. 13:10 — nur noch für die Reparatur der in dem Lauf halb geschriebenen Zeilen (ein «×» je Malzeichen, Mehrfach-«× ×» blieb stehen)."""
    if not MUSTER.search(wert):
        return wert, False
    neu = re.sub(r"(?<!\d)(\d?)\s*×\s*([SML])\b", lambda m: (m.group(1) or "") + "X" + m.group(2), wert)
    neu = re.sub(r"\s*,\s*", ", ", neu).strip()
    if NUR_GROESSEN.match(neu.replace(" ", "")) or NUR_GROESSEN.match(neu):
        return None, True
    return neu, neu != wert


# Umkehrung: der Importer machte aus JEDEM «x» ein « × » — «XL» → «× L», «XXL» → «× × L», «2XL» → «2 × L», «XS» → «× S»: n Malzeichen vor [SML] = n × «X».
KETTE = re.compile(r"(?<!\d)(\d?)\s*((?:×\s*)+)([SMLsml])\b")
# Prüfung F2: heilen nur, wenn der Wert NACH der Rückübersetzung nur aus Grössen-Token, Zahlen, cm/mm/kg/g und Trennern besteht —
# «3 × L Regal», «B × H × L», «Länge 30 cm × L», «S × M», «10 × 10 × L» sind Masse/Text, keine Grössenlisten.
GROESSE_TOK = re.compile(r"\b(?:XXS|XS|[SML]|[2-7]?X{1,4}L|[2-7]L)\b")      # «2L/3L/4L» = CJ-Schreibweise für 2XL/3XL/4XL
REST_OK = re.compile(r"^[\s,/–\-\d.()]*$")


def _kontext_ok(neu):
    if "×" in neu:
        return False
    rest = GROESSE_TOK.sub("", neu)
    rest = re.sub(r"(?<=\d)\s*(?:cm|mm|kg|g)\b", "", rest)
    return bool(REST_OK.match(rest))


def wert_heilen(wert):
    """→ (neuer Wert | None = Zeile entfernen, geändert?). Reine Grössenliste → entfernen, Mischwert → Grössen zurückübersetzt."""
    if not MUSTER.search(wert):
        return wert, False
    neu = KETTE.sub(lambda m: (m.group(1) or "") + "X" * m.group(2).count("×") + m.group(3).upper(), wert)
    neu = re.sub(r"\s*,\s*", ", ", neu).strip()
    if not _kontext_ok(neu):
        return wert, False                      # fremder Kontext (Masse, Wörter, Rest-«×»): nicht anfassen
    pur = neu.replace("×", "").replace(" ", "")
    if NUR_GROESSEN.match(pur):
        return None, True
    return neu, neu != wert


def html_heilen(html, originale=()):
    """→ (neues html, [(alte_zeile, neue_zeile oder '-')]). `originale` = die ursprünglichen Masse-Zeilen aus dem Export: steht statt ihrer die FALSCHE
    v1-Fassung im Live-Text (Lauf vom 19.10. 13:10), wird sie durch die richtige ersetzt."""
    aend = []

    def ersatz(m):
        neu, geaendert = wert_heilen(m.group(1))
        if not geaendert:
            return m.group(0)
        if neu is None:
            aend.append((m.group(0), "-"))
            return ""
        zeile = m.group(0).replace(m.group(1), neu)
        aend.append((m.group(0), zeile))
        return zeile
    html = LI.sub(ersatz, html)
    for orig in originale:                       # Reparatur: v1-Ausgabe → v2-Ausgabe
        mo = LI.search(orig)
        if not mo:
            continue
        v1, c1 = _v1(mo.group(1))
        v2, c2 = wert_heilen(mo.group(1))
        z1 = "" if v1 is None else orig.replace(mo.group(1), v1)
        z2 = "" if v2 is None else orig.replace(mo.group(1), v2)
        if c1 and c2 and z1 and z1 != z2 and z1 in html:      # Prüfung 19.10.: Reparatur nur, wenn die richtige Fassung WIRKLICH geheilt ist (sonst würde sie auf den Rohzustand zurücksetzen)
            html = html.replace(z1, z2, 1)
            aend.append((z1, z2 or "-"))
    return html, aend


def kandidaten():
    """→ {id: [originale Masse-Zeilen mit «× L»-Muster]} aus dem Export."""
    out = {}
    for l in open(EXPORT, encoding="utf-8"):
        if "×" not in l:
            continue
        try:
            p = json.loads(l)
        except ValueError:
            continue
        h = p.get("descriptionHtml") or ""
        z = [m.group(0) for m in LI.finditer(h) if MUSTER.search(m.group(1))]
        if z:
            out[p["id"]] = z
    return out


def selbsttest():
    f = []
    for roh, soll in [("S,M,L, × L,2 × L,3 × L,4 × L,5 × L", None), ("M, L, × L, 2 × L, 3 × L, 4 × L", None),
                      ("× × S, × S,S,M,L, × L, × × L, × × × L,4 × L,5 × L", None),
                      ("170/M,175/L,180/ × L,185/ × × L,190/ × × L", "170/M, 175/L, 180/XL, 185/XXL, 190/XXL"),
                      ("M 165–170 cm, L 170–178 cm, × L 178–185 cm", "M 165–170 cm, L 170–178 cm, XL 178–185 cm"),
                      ("20 × 30 cm", "20 × 30 cm"), ("5 × 5 × 5 cm", "5 × 5 × 5 cm"), ("S,M,L,XL", "S,M,L,XL")]:
        neu, _ = wert_heilen(roh)
        if neu != soll and not (soll == "S,M,L,XL" and neu == roh):
            f.append(f"{roh!r} → {neu!r}, soll {soll!r}")
    h = '<ul><li>\n<strong>Gewicht:</strong> 30 g</li>\n<li>\n<strong>Masse:</strong> M, L, × L, 2 × L</li>\n</ul>'
    n, a = html_heilen(h)
    if "Masse" in n or "Gewicht" not in n or len(a) != 1 or a[0][1] != "-":
        f.append("html_heilen: reine Grössenliste nicht entfernt")
    n2, a2 = html_heilen("<li><strong>Masse:</strong> 20 × 30 cm</li>")
    if a2:
        f.append("echte Masse angefasst")
    orig = "<li>\n<strong>Masse:</strong> 170/M,175/L,180/ × L,185/ × × L</li>"
    v1, _ = _v1("170/M,175/L,180/ × L,185/ × × L")
    halb = "<ul>" + orig.replace("170/M,175/L,180/ × L,185/ × × L", v1) + "</ul>"
    rep, ar = html_heilen(halb, [orig])
    if "XXL" not in rep or len(ar) != 1:
        f.append("Reparatur der v1-Zeile")
    # Prüfung 19.10.: fremder Kontext bleibt unberührt, Kleinbuchstaben und Gewicht werden mitgenommen
    for roh, soll in [("3 × L Regal", "3 × L Regal"), ("S × M", "S × M"), ("10 × 10 × L", "10 × 10 × L"), ("B × H × L", "B × H × L"),
                      ("Länge 30 cm × L", "Länge 30 cm × L"), ("3 × 3 × L", "3 × 3 × L"), ("M,L, × L,2 × l,3 × l,4 × l", None),
                      ("S 640g - 3 × L 760g", "S 640g - 3XL 760g")]:
        neu, _ = wert_heilen(roh)
        if neu != soll:
            f.append(f"Kontext {roh!r} → {neu!r}, soll {soll!r}")
    print(f"masse_groessenliste Selbsttest: {20 - len(f)}/20")
    for x in f:
        print("  FAIL", x)
    return not f


def main():
    import kollektion_leer as kl
    from werbetest_sperre import gesperrt
    kand = kandidaten()
    print(f"{len(kand)} Kandidaten im Export · CAP {CAP} · {'SCHARF' if SCHARF else 'DRY'}", flush=True)
    ids = [i for i in kand if not gesperrt(i)][:CAP]
    geaendert = geprueft = 0
    for k in range(0, len(ids), 40):
        d = kl.gql('query($i:[ID!]!){nodes(ids:$i){... on Product{id status descriptionHtml}}}', {"i": ids[k:k + 40]})
        for p in d.get("nodes") or []:
            if not p or p.get("status") != "ACTIVE":
                continue
            geprueft += 1
            neu, aend = html_heilen(p.get("descriptionHtml") or "", kand.get(p["id"], ()))
            if not aend:
                continue
            a1, n1 = re.sub(r"\s+", " ", aend[0][0])[:90], re.sub(r"\s+", " ", aend[0][1])[:90]
            print(f"  {p['id'].split('/')[-1]}: {a1}  →  {n1}", flush=True)
            if not SCHARF:
                continue
            with open(VORHER, "a", encoding="utf-8") as vf:      # Prüfung F4: ganzer alter Text als Rückweg (die Zeilen-Einträge im Ledger tragen keinen Anker)
                vf.write(json.dumps({"id": p["id"], "html": p.get("descriptionHtml") or ""}, ensure_ascii=False) + "\n")
            with open("/tmp/lock_produkttext.lock", "w") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                r = kl.gql('mutation($i:ProductUpdateInput!){productUpdate(product:$i){product{descriptionHtml} userErrors{message}}}',
                           {"i": {"id": p["id"], "descriptionHtml": neu}})
            pu = r.get("productUpdate") or {}
            zur = (pu.get("product") or {}).get("descriptionHtml") or ""
            if pu.get("userErrors") or KETTE.search("".join(m.group(1) for m in LI.finditer(zur))):
                print(f"  ⚠️ {p['id']}: {pu.get('userErrors')}", flush=True)
                continue
            geaendert += 1
            with open(LEDGER, "a", encoding="utf-8") as f:      # sofort — ein Abbruch verliert nichts
                for alt, nz in aend:
                    f.write(f"{p['id'].split('/')[-1]}\t{json.dumps(alt, ensure_ascii=False)}\t{json.dumps(nz, ensure_ascii=False)}\n")
            time.sleep(0.3)
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {geaendert} geändert, {geprueft} geprüft" + ("" if SCHARF else " (DRY)"), flush=True)
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    sys.exit(main())
