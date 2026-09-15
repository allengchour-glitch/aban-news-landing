#!/usr/bin/env python3
"""vault_qualitaet.py — misst den Obsidian-Vault jenseits kaputter Links.

`tools/vault.py pruefen` beantwortet «zeigt jeder Link irgendwohin?». Dieses Werkzeug
beantwortet «ist der Vault benutzbar?»: Waisen, Sackgassen, Obsidian-Merkmale,
Vernetzungsgrad, Abdeckung gegen das Journal.

  python3 tools/vault_qualitaet.py

⚠️ Waise = niemand verlinkt die Notiz. Sie ist dann nur ueber den Ordnerbaum auffindbar und
   im Graphen ein einzelner Punkt. Sackgasse = keine ausgehenden Links (bei der Zeitleiste
   ist das in Ordnung, sonst ein Zeichen fuer eine isoliert gedachte Notiz).
"""
import re, subprocess, collections
from pathlib import Path

V = Path(__file__).resolve().parent.parent / "brain" / "vault"
LINK = re.compile(r"\[\[([^\]|#]+)")
CODE = re.compile(r"```.*?```", re.S)


def main() -> int:
    notizen = {p.stem: p for p in V.rglob("*.md")}
    raus, rein = collections.defaultdict(set), collections.defaultdict(set)
    groesse, hat_fm, hat_tags = {}, set(), set()
    for stem, p in notizen.items():
        t = p.read_text(encoding="utf-8")
        groesse[stem] = len(t)
        if t.startswith("---\n"): hat_fm.add(stem)
        if re.search(r"(?m)^tags:", t): hat_tags.add(stem)
        for z in LINK.findall(CODE.sub("", t)):
            z = z.strip()
            if z != stem:
                raus[stem].add(z); rein[z].add(stem)

    print(f"NOTIZEN: {len(notizen)}\n")
    waisen = [s for s in notizen if not rein[s] and s != "00 Start hier"]
    sackgassen = [s for s in notizen if not raus[s]]
    print(f"🔸 Waisen (nichts verlinkt sie): {len(waisen)}")
    for s in sorted(waisen)[:10]: print(f"     {s[:70]}")
    print(f"🔸 Sackgassen (keine ausgehenden Links): {len(sackgassen)}")
    for s in sorted(sackgassen)[:10]: print(f"     {s[:70]}")

    ordner = [d for d in V.iterdir() if d.is_dir() and not d.name.startswith(".")]
    print(f"\n🔸 Obsidian-Merkmale")
    print(f"     YAML-Frontmatter : {len(hat_fm)}/{len(notizen)}")
    print(f"     Tags             : {len(hat_tags)}/{len(notizen)}")
    print(f"     .obsidian-Konfig : {'ja' if (V / '.obsidian').exists() else 'NEIN'}")
    print(f"     Graph-Farbgruppen: {'ja' if (V / '.obsidian' / 'graph.json').exists() else 'NEIN'}")
    print(f"     Ordner           : {len(ordner)}")

    index = (V / "00 Start hier.md")
    if index.exists():
        txt = index.read_text(encoding="utf-8")
        fehlend = [s for s in notizen if s != "00 Start hier" and f"[[{s}]]" not in txt]
        print(f"     im Index verlinkt: {len(notizen) - 1 - len(fehlend)}/{len(notizen) - 1}"
              + (f"  ⚠️ fehlt: {', '.join(sorted(fehlend)[:5])}" if fehlend else ""))

    grad = sorted(((len(rein[s]) + len(raus[s]), s) for s in notizen), reverse=True)
    print(f"\n🔸 Median-Groesse: {sorted(groesse.values())[len(groesse)//2]} Zeichen"
          f" · duenn (<500): {sum(1 for n in groesse.values() if n < 500)}")
    print(f"🔸 Bestvernetzt: " + ", ".join(f"{s} ({g})" for g, s in grad[:4]))
    print(f"🔸 Einsam (Grad ≤1): {sum(1 for g, _ in grad if g <= 1)}")

    j = Path(__file__).resolve().parent.parent / "GEDAECHTNIS-JOURNAL.md"
    if j.exists():
        n = len(re.findall(r"(?m)^## ", j.read_text(encoding="utf-8")))
        print(f"\n🔸 Abdeckung: Journal {n} Abschnitte · Vault {len(notizen)} Notizen"
              f" ({100*len(notizen)/max(1, n):.0f} %)")
    r = subprocess.run(["git", "log", "-1", "--format=%ci", "--", "brain/vault"],
                       capture_output=True, text=True)
    print(f"🔸 Letzte Vault-Aenderung im Git: {r.stdout.strip()[:19] or 'unbekannt'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
