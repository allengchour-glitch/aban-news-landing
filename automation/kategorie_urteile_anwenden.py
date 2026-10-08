#!/usr/bin/env python3
"""kategorie_urteile_anwenden.py — Einzelurteile zu Kategorie-Widersprüchen schreiben (07.10.2026).

ANLASS (Betreiber «weiter genau das wollte ich, mach es alles perfekt, alles andere auch»). Nach den Regel-Läufen
(Taschen, Kosmetik, Haar, RC, Bettwaren, Elektronik) blieben 3'480 Shopify↔Google-Widersprüche über ~80 Paare plus
~470 Kosmetik-Reste — ein langer Schwanz, für den sich keine Wortregel lohnt. Jedes Produkt wurde einzeln am Titel
beurteilt (zwei Prüfer, je 7 Teile; jeder Google-Pfad gegen die Google-Taxonomie validiert):
  G = Google stimmt → Shopify = Shopifys Zuordnung der Google-Klasse
  S = Shopify stimmt → Google = gelieferter Pfad; Shopify nur verfeinert, wenn die Zuordnung eine Unterklasse ist
  X = beide falsch → beide aus dem gelieferten Pfad
  ? = Titel zu vage → nichts
Urteile: dropship/_kategorie_urteile_2026-10-07.jsonl. Schutz (Stichprobe vor dem Schreiben): bei G NIE eine feinere,
richtige Shopify-Klasse überschreiben — Drohnen (tg-5-12-2), Kinderkleidung (aa-1-25-*), 3D-Druck (el-13-*), und nie
auf eine Oberklasse der heutigen Shopify-Kategorie zurückfallen. Produkte, deren Google-Wert sich seit dem Urteil
geändert hat, werden übersprungen (frischer Export).

  python3 automation/kategorie_urteile_anwenden.py      # Trockenlauf  ·  SCHARF=1 … schreibt
  MODUS=grob python3 automation/kategorie_urteile_anwenden.py   # zweite Runde: grobe Google-Oberklassen verfeinert
      (dropship/_kategorie_grob_2026-10-07.jsonl, {"id","google"}; "" = bleibt; Eingaben ALT=/tmp/taxo/grob/g??.tsv)
(Ein Bereichsschutz «erste zwei ID-Stufen gleich → Shopify bleibt» wurde verworfen: er hätte auch richtige Umzüge wie
Zahnbürste Skin Care → Oral Care blockiert — beide «hb-3».)
"""
import collections, json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import kosmetik_fein as kos  # noqa: E402
import kategorie_fein as kf  # noqa: E402

GROB = os.environ.get("MODUS") == "grob"
# 08.10.2026: weitere Runden über URTEILE=/LEDGER= (Runde 3: Zweig-Widersprüche + Titelprobe-Reste, ALT=/tmp/taxo/r3)
URTEILE = os.environ.get("URTEILE") or os.path.join(REPO, "dropship", "_kategorie_grob_2026-10-07.jsonl" if GROB else "_kategorie_urteile_2026-10-07.jsonl")
ALT = os.environ.get("ALT", "/tmp/taxo/grob" if GROB else "/tmp/taxo/batch")   # Eingaben (Google-Wert zum Urteilszeitpunkt)
LEDGER = os.environ.get("LEDGER") or os.path.join(REPO, "dropship", "_kategorie_grob.tsv" if GROB else "_kategorie_urteile.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
SCHUTZ_G = ("tg-5-12-2", "aa-1-25", "el-13")


def main():
    import csv, glob
    gueltig = kos.google_taxonomie()
    karte = json.load(open(kf.KARTE, encoding="utf-8"))["karte"]
    damals = {}
    for f in glob.glob(os.path.join(ALT, "g??.tsv" if GROB else "b??.tsv")):
        for r in csv.DictReader(open(f, encoding="utf-8"), delimiter="\t"):
            damals[r["id"]] = r["google_jetzt"]
    kf.export_holen()
    jetzt = {}
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        jetzt[p["id"].split("/")[-1]] = (((p.get("category") or {}).get("id") or "").split("/")[-1],
                                         (p.get("metafield") or {}).get("value") or "", p["title"])
    try:
        erledigt = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8")}
    except OSError:
        erledigt = set()
    st = collections.Counter(); plan = []
    for l in open(URTEILE, encoding="utf-8"):
        d = json.loads(l); i = d["id"]; e = "X" if GROB else d["e"]; g = d.get("google") or ""
        gid = "gid://shopify/Product/" + i
        if e == "?" or not g:
            st["vage"] += 1; continue
        if i not in jetzt:
            st["nicht-aktiv"] += 1; continue
        if gid in erledigt:
            st["schon"] += 1; continue
        cid, gjetzt, _ = jetzt[i]
        if damals.get(i) is not None and gjetzt != damals[i]:
            st["inzwischen-geaendert"] += 1; continue
        if g not in gueltig:
            st["pfad-ungueltig"] += 1; continue
        ziel = kos.shopify_ziel(g, karte)
        if e == "S":
            sid = ziel if ziel and ziel.startswith(cid + "-") else cid
        else:
            sid = ziel or cid
            if e == "G" and (cid.startswith(SCHUTZ_G) or cid.startswith(sid + "-")):
                sid = cid
            if GROB and (cid.startswith(SCHUTZ_G) or cid.startswith(sid + "-")):
                sid = cid
        if g == gjetzt and sid == cid:
            st["nichts-zu-tun"] += 1; continue
        st[f"plan-{e}"] += 1
        plan.append((gid, g, sid))
    gs = kf.ids_pruefen({x[2] for x in plan})
    plan = [x for x in plan if x[2] in gs]
    print("Stand:", dict(st), "· Plan", len(plan))
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for k in range(0, len(plan), 25):
                for versuch in range(8):       # Drossel (mehrere Schreiber) → warten statt abbrechen
                    try:
                        antwort = kos.schreiben(plan[k:k + 25]); break
                    except RuntimeError as e:
                        if "hrottl" not in str(e) or versuch == 7:
                            raise
                        print(f"  gedrosselt, warte {30 * (versuch + 1)} s", flush=True); time.sleep(30 * (versuch + 1))
                for pid, s, g, sid, fehler in antwort:
                    f.write(f"{pid}\t{s}\t{g}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{fehler}\n")
                    ok += s == "gesetzt"; fe += s == "fehler"
                f.flush(); time.sleep(float(os.environ.get("PAUSE", "0.8")))
    print(f"KATEGORIE-URTEILE: {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}")


if __name__ == "__main__":
    main()
