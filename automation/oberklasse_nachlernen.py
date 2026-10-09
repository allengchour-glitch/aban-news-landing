#!/usr/bin/env python3
"""oberklasse_nachlernen.py — die geprüften KI-Urteile fliessen zurück in die Lerndaten (09.10.2026, Verbesserungsrunde).

ANLASS: GEMESSEN 09.10. 08:40 UTC: 459 aktive Neuimporte (14 T) stehen bei Google auf einer Oberklasse, 426 davon ohne
gelernte Regel. Die KI-Stufe (google_fein_ki, zwei Modelle unabhängig) beurteilt sie — aber ihr Ergebnis landete nur im Shop
und im Ledger dropship/_google_fein_ki.tsv (807 × «ok» = beide Modelle wählten denselben feineren Pfad, 1'219 × «keiner» =
beide: nichts passt besser). Die Lerndaten des Regel-Lerners (automation/data/oberklasse_training.jsonl) blieben auf dem Stand
vom 08.10. Folge: Jeden Tag beurteilt die KI dieselben Produkttypen neu, und ohne Kontingent (heute: OpenAI leer, Groq
erschöpft) bleibt die Neuware grob — obwohl die Antwort für «Hundeschüssel» längst geprüft vorliegt.
REGEL: «ok» → Beispiel {titel, alt, neu}; «keiner» → Beispiel {titel, alt, neu: ""} (= bleibt, das Veto zählt mit);
«uneinig» und Fehler nie. Titel aus dem aktuellen Bulk-Export (der Ledger kennt nur die ID). Doppelte (titel, alt) nie.
Ziel-Datei automation/data/oberklasse_training_ki.jsonl (getrennt von den Einzelurteilen vom 07./08.10.; oberklasse_lernen.py
liest beide). Die Gegenprobe 80/20 mit Präzision ≥ 95 % in oberklasse_lernen.py bleibt die Sperre vor jedem Schreiben.
Täglich im Aufseher VOR oberklasse_lernen.
  python3 automation/oberklasse_nachlernen.py           # schreibt (nur Lerndaten, nie den Shop)
  TROCKEN=1 python3 automation/oberklasse_nachlernen.py
"""
import collections, json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
LEDGER_KI = os.path.join(REPO, "dropship", "_google_fein_ki.tsv")
BASIS = os.path.join(HIER, "data", "oberklasse_training.jsonl")
ZIEL = os.path.join(HIER, "data", "oberklasse_training_ki.jsonl")
EXPORT = os.environ.get("EXPORT") or "/tmp/versprechen_export.jsonl"
TROCKEN = os.environ.get("TROCKEN") == "1"


def main():
    if not os.path.exists(EXPORT):
        print(f"OBERKLASSE-NACHLERNEN: kein Export {EXPORT} — nichts getan")
        return 0
    titel = {}
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" not in o and "title" in o:
            titel[o["id"]] = o["title"]
    gesehen = set()
    for f in (BASIS, ZIEL):
        if os.path.exists(f):
            for l in open(f, encoding="utf-8"):
                b = json.loads(l)
                gesehen.add((b["titel"], b["alt"]))
    neu, st = [], collections.Counter()
    letzte = {}
    for l in open(LEDGER_KI, encoding="utf-8"):
        t = l.rstrip("\n").split("\t")
        if len(t) >= 3:
            letzte[t[0]] = t                 # jüngstes Urteil je Produkt zählt
    for pid, t in letzte.items():
        status, alt = t[1], t[2]
        if status == "ok" and len(t) >= 4 and t[3]:
            ziel = t[3]
        elif status == "keiner":
            ziel = ""
        else:
            st["uneinig/anders"] += 1; continue
        tt = titel.get(pid)
        if not tt:
            st["nicht im Export"] += 1; continue
        if (tt, alt) in gesehen:
            st["schon gelernt"] += 1; continue
        gesehen.add((tt, alt))
        neu.append({"titel": tt, "alt": alt, "neu": ziel, "quelle": "ki-einig"})
        st["neu-" + ("verfeinert" if ziel else "bleibt")] += 1
    if neu and not TROCKEN:
        with open(ZIEL, "a", encoding="utf-8") as f:
            for b in neu:
                f.write(json.dumps(b, ensure_ascii=False) + "\n")
    gesamt = sum(1 for _ in open(ZIEL, encoding="utf-8")) if os.path.exists(ZIEL) else 0
    print(f"OBERKLASSE-NACHLERNEN: {len(neu)} neue Beispiele {'(TROCKEN)' if TROCKEN else 'angehängt'} · {dict(st)} · "
          f"KI-Lerndaten gesamt {gesamt}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
