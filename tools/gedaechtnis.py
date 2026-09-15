#!/usr/bin/env python3
"""gedaechtnis.py — das Gedaechtnis dieses Repos durchsuchen statt lesen.

  python3 tools/gedaechtnis.py "review"      Fakten zum Stichwort, mit Quelle und Datum
  python3 tools/gedaechtnis.py --sackgassen  was nachweislich nicht funktioniert
  python3 tools/gedaechtnis.py --offen       was nur der User klicken kann
  python3 tools/gedaechtnis.py --stand       die neuesten Stand-Bloecke, kurz
  python3 tools/gedaechtnis.py --vault       alle Vault-Notizen auflisten
  python3 tools/gedaechtnis.py --selbsttest  Gegenprobe in beide Richtungen

Warum: CLAUDE.md und SHARED-MEMORY.md sind zusammen rund 158 KB Prosa. Linear gelesen kostet das
jede Session Kontext, ohne die eine Tatsache zu liefern, die gerade gebraucht wird.
"""
from __future__ import annotations
import re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VAULT = REPO / "brain" / "vault"
GROSS = ["CLAUDE.md", "SHARED-MEMORY.md", "dropship/AUTONOMER-MODUS.md",
         "dropship/USER-CHECKLISTE.md", "dropship/CJ-IMPORT-LOG.md", "automation/BRAIN.md",
         "spiele-dev/RUNBOOK-SPIELE.md", "spiele-dev/RUNBOOK-TRAUMHAUS.md"]
DATUM = re.compile(r"(\d{4}-\d{2}-\d{2})")


def bloecke(pfad: Path) -> list[tuple[str, str]]:
    """Teilt eine grosse Gedaechtnisdatei in Abschnitte (Titel, Text) — an 📌-Bloecken und
    Markdown-Ueberschriften, damit ein Treffer mit seinem Zusammenhang zurueckkommt."""
    txt = pfad.read_text(encoding="utf-8", errors="replace")
    teile = re.split(r"\n(?=(?:\*\*📌|#{1,3}\s|>\s*##))", txt)
    out = []
    for t in teile:
        if not t.strip():
            continue
        titel = t.strip().splitlines()[0].strip().lstrip("#>* ").rstrip("*: ")
        out.append((titel[:110], t))
    return out


def suchen(wort: str, limit: int = 12) -> int:
    nadel = wort.lower()
    treffer = 0

    # 1) Vault zuerst — das ist die verdichtete Wahrheit
    vtreffer = []
    for p in sorted(VAULT.rglob("*.md")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        if "tags: [moc, erzeugt]" in txt or "tags: [stand, erzeugt]" in txt:
            continue   # erzeugte Uebersichten sind kein eigener Fund
        if nadel in txt.lower() or nadel in p.stem.lower():
            score = (3 if nadel in p.stem.lower() else 0) + txt.lower().count(nadel)
            vtreffer.append((score, p, txt))
    vtreffer.sort(key=lambda x: -x[0])
    if vtreffer:
        print(f"\n🧠 VAULT ({len(vtreffer)} Notizen)")
        for score, p, txt in vtreffer[:limit]:
            tags = re.search(r"^tags:\s*\[(.*?)\]", txt, re.M)
            gel = re.search(r"^gelernt:\s*(\S+)", txt, re.M)
            print(f"\n  ▸ {p.stem}   [{tags.group(1) if tags else '-'}]"
                  f"{'  · gelernt ' + gel.group(1) if gel else ''}")
            print(f"    {p.relative_to(REPO)}")
            for zeile in txt.splitlines():
                if nadel in zeile.lower() and not zeile.startswith(("tags:", "quelle:", "---")):
                    print(f"    | {zeile.strip()[:150]}")
                    treffer += 1
                    break

    # 2) Grosse Dateien als Historie
    print(f"\n📚 HISTORIE")
    gefunden = False
    for rel in GROSS:
        p = REPO / rel
        if not p.exists():
            continue
        for titel, block in bloecke(p):
            if nadel not in block.lower():
                continue
            d = DATUM.search(titel) or DATUM.search(block[:400])
            zeilen = [z.strip() for z in block.splitlines()
                      if nadel in z.lower() and len(z.strip()) > 12]
            if not zeilen:
                continue
            gefunden = True
            print(f"\n  ▸ {rel}{'  · ' + d.group(1) if d else ''}")
            print(f"    § {titel}")
            for z in zeilen[:3]:
                print(f"    | {z[:170]}")
                treffer += 1
    if not gefunden:
        print("  (nichts)")
    print()
    return treffer


def sackgassen() -> int:
    print("\n⛔ SACKGASSEN — nicht erneut versuchen\n")
    n = 0
    for p in sorted(VAULT.rglob("*.md")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        kopf = txt.split("---")[1] if txt.startswith("---") else ""
        if "sackgasse" in kopf or "verboten" in kopf or "nicht-erneut" in kopf:
            n += 1
            st = re.search(r"^status:\s*(\S+)", kopf, re.M)
            print(f"  ▸ {p.stem}" + (f"   [{st.group(1)}]" if st else ""))
            for z in txt.splitlines():
                z = z.strip()
                if z and not z.startswith(("#", "-", "|", ">", "`", "tags:", "quelle:",
                                           "gelernt:", "status:", "---")):
                    print(f"    {z[:150]}")
                    break
    print(f"\n  {n} Sackgassen. Volltext: brain/vault/Sackgassen/\n")
    return n


def offen() -> int:
    print("\n🟡 NUR DER USER KANN DAS — autonom nicht erreichbar\n")
    n = 0
    for p in sorted(VAULT.rglob("*.md")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        kopf = txt.split("---")[1] if txt.startswith("---") else ""
        if "nur-user" in kopf or "blockiert" in kopf or "wartet-auf" in kopf:
            n += 1
            st = re.search(r"^status:\s*(\S+)", kopf, re.M)
            print(f"  ▸ {p.stem}" + (f"   [{st.group(1)}]" if st else ""))
            for z in txt.splitlines():
                zs = z.strip().lstrip("#-* ").strip()
                if not zs or zs.startswith(("tags:", "quelle:", "gelernt:", "status:", "|", "`")):
                    continue
                if re.search(r"\bUser\b|nur der User|braucht|fehlen|setzen|Einspruch", zs):
                    print(f"    → {re.sub(r'[*`]', '', zs)[:140]}")
                    break
    print(f"\n  {n} Blockaden. Vollstaendig: dropship/USER-CHECKLISTE.md\n")
    return n


def stand(anzahl: int = 8) -> int:
    md = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
    t = re.findall(r"\*\*📌\s*(\d{4}-\d{2}-\d{2})\s*\(([^)]*)\)", md)
    print("\n🗓️  STAND (neueste zuerst, aus CLAUDE.md)\n")
    seen, n = set(), 0
    for datum, titel in t:
        if (datum, titel) in seen:
            continue
        seen.add((datum, titel))
        n += 1
        if n <= anzahl:
            print(f"  {datum}  {titel.strip()[:100]}")
    print(f"\n  {n} Stand-Bloecke insgesamt. Volltext: CLAUDE.md, Abschnitt '## Stand'\n")
    return n


def vault_liste() -> int:
    n = 0
    ordner = ""
    for p in sorted(VAULT.rglob("*.md")):
        o = p.parent.name if p.parent != VAULT else "."
        if o != ordner:
            ordner = o
            print(f"\n  {o}/")
        print(f"    {p.stem}")
        n += 1
    print(f"\n  {n} Notizen\n")
    return n


def selbsttest() -> int:
    """Gegenprobe in BEIDE Richtungen: bekannte Tatsache muss gefunden werden, Unsinn nicht."""
    fehler = 0
    print("Selbsttest gedaechtnis.py\n" + "-" * 40)

    import io, contextlib

    def still(fn, *a):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            r = fn(*a)
        return r, buf.getvalue()

    for wort, muss in [("Publish-Falle", True), ("Spam", True), ("Review", True),
                       ("Zzzqqxyz-Gibt-Es-Nicht", False)]:
        n, ausgabe = still(suchen, wort)
        ok = (n > 0) if muss else (n == 0)
        print(f"  {'OK ' if ok else 'FEHLER'}  '{wort}': {n} Treffer "
              f"(erwartet {'>0' if muss else '0'})")
        fehler += 0 if ok else 1

    for name, fn in [("--sackgassen", sackgassen), ("--offen", offen), ("--stand", stand)]:
        n, _ = still(fn)
        ok = n > 0
        print(f"  {'OK ' if ok else 'FEHLER'}  {name}: {n} Eintraege (erwartet >0)")
        fehler += 0 if ok else 1

    print("-" * 40)
    print("SELBSTTEST BESTANDEN" if fehler == 0 else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    a = sys.argv[1]
    if a == "--selbsttest":
        return selbsttest()
    if a == "--sackgassen":
        sackgassen(); return 0
    if a == "--offen":
        offen(); return 0
    if a == "--stand":
        stand(); return 0
    if a == "--vault":
        vault_liste(); return 0
    return 0 if suchen(" ".join(sys.argv[1:])) else 1


if __name__ == "__main__":
    sys.exit(main())
