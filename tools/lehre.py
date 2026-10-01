#!/usr/bin/env python3
"""lehre.py — eine neu gelernte Lehre ins zweite Gehirn aufnehmen.

  python3 tools/lehre.py --titel "Kurztitel" --text "Was passiert ist und was daraus folgt" \
                         [--art falle|sackgasse|blockiert|projekt|system] \
                         [--skill messgeraet-zuerst] [--quelle "wo es herkommt"]
  python3 tools/lehre.py --liste          die zuletzt aufgenommenen Lehren
  python3 tools/lehre.py --selbsttest     Gegenprobe

Das ist der Mechanismus hinter dem Versprechen "wird jeden Tag besser": was eine Session teuer
gelernt hat, landet als eigene Notiz im Vault, wird verlinkt und ist ab sofort durchsuchbar
(tools/gedaechtnis.py). Ohne diesen Schritt bleibt die Lehre im Sitzungsprotokoll und ist weg.

Idempotent: dieselbe Lehre zweimal aufzunehmen haengt den Text an, statt eine zweite Notiz
anzulegen.
"""
from __future__ import annotations
import argparse, re, subprocess, sys, tempfile, unicodedata
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VAULT = REPO / "brain" / "vault"
ORDNER = {"falle": "Fallen", "sackgasse": "Sackgassen", "blockiert": "Blockiert",
          "projekt": "Projekte", "system": "Systeme"}
TAGS = {"falle": "[falle, teuer-gelernt]", "sackgasse": "[sackgasse, nicht-erneut-versuchen]",
        "blockiert": "[blockiert, nur-user]", "projekt": "[projekt]", "system": "[system]"}


def dateiname(titel: str) -> str:
    # Umlaute ZUERST ersetzen — nach NFKD sind sie zerlegt und die Ersetzung greift nicht mehr.
    t = titel
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("Ä", "Ae"), ("Ö", "Oe"),
                 ("Ü", "Ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^A-Za-z0-9 \-]", "", t).strip()
    return re.sub(r"[\s_]+", "-", t)[:70] or "Lehre"


def aufnehmen(titel: str, text: str, art: str, skill: str | None, quelle: str,
              vault: Path = VAULT) -> tuple[Path, bool]:
    ordner = vault / ORDNER.get(art, "Fallen")
    ordner.mkdir(parents=True, exist_ok=True)
    ziel = ordner / f"{dateiname(titel)}.md"
    heute = date.today().isoformat()

    if ziel.exists():
        alt = ziel.read_text(encoding="utf-8")
        ziel.write_text(alt.rstrip() + f"\n\n## Ergaenzung {heute}\n\n{text.strip()}\n",
                        encoding="utf-8")
        return ziel, False

    zeilen = ["---", f"tags: {TAGS.get(art, '[falle, teuer-gelernt]')}",
              f"quelle: {quelle}", f"gelernt: {heute}", "---", f"# {titel.strip()}", "",
              text.strip(), ""]
    if skill:
        zeilen += ["", f"**Traegt der Skill `{skill}`** — dort gehoert die Regel hinein, damit sie",
                   "sich beim naechsten passenden Auftrag von selbst laedt.", ""]
    zeilen += ["Verwandt: [[Hypothese-mit-Datum]]", ""]
    ziel.write_text("\n".join(zeilen), encoding="utf-8")
    return ziel, True


def liste(n: int = 15) -> int:
    eintraege = []
    for p in sorted(VAULT.rglob("*.md")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        g = re.search(r"^gelernt:\s*(\S+)", txt, re.M)
        if g:
            eintraege.append((g.group(1), p))
    eintraege.sort(reverse=True)
    print(f"\n📚 Zuletzt gelernt ({len(eintraege)} datierte Notizen)\n")
    for datum, p in eintraege[:n]:
        print(f"  {datum}  {p.stem}   ({p.parent.name})")
    print()
    return len(eintraege)


def selbsttest() -> int:
    fehler = 0
    print("Selbsttest lehre.py\n" + "-" * 40)
    with tempfile.TemporaryDirectory() as td:
        v = Path(td) / "vault"
        v.mkdir()
        p1, neu1 = aufnehmen("Test Lehre mit Umläuten öäü", "Erster Text.", "falle",
                             "messgeraet-zuerst", "selbsttest", v)
        ok = neu1 and p1.exists() and p1.name == "Test-Lehre-mit-Umlaeuten-oeaeue.md"
        print(f"  {'OK ' if ok else 'FEHLER'} Notiz angelegt: {p1.name}")
        fehler += 0 if ok else 1

        txt = p1.read_text()
        ok = "gelernt: " in txt and "messgeraet-zuerst" in txt and "Erster Text." in txt
        print(f"  {'OK ' if ok else 'FEHLER'} Frontmatter, Skill-Verweis und Text vorhanden")
        fehler += 0 if ok else 1

        p2, neu2 = aufnehmen("Test Lehre mit Umläuten öäü", "Zweiter Text.", "falle",
                             None, "selbsttest", v)
        anzahl = len(list(v.rglob("*.md")))
        ok = (not neu2) and p2 == p1 and anzahl == 1 and "Zweiter Text." in p2.read_text()
        print(f"  {'OK ' if ok else 'FEHLER'} idempotent: {anzahl} Notiz, Ergaenzung angehaengt")
        fehler += 0 if ok else 1

        p3, _ = aufnehmen("Eine Sackgasse", "Geht nicht, weil.", "sackgasse", None, "selbsttest", v)
        ok = p3.parent.name == "Sackgassen" and "sackgasse" in p3.read_text()
        print(f"  {'OK ' if ok else 'FEHLER'} Art steuert Ordner und Tags: {p3.parent.name}")
        fehler += 0 if ok else 1
    print("-" * 40)
    print("SELBSTTEST BESTANDEN" if fehler == 0 else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True, description=__doc__)
    ap.add_argument("--titel")
    ap.add_argument("--text")
    ap.add_argument("--art", default="falle", choices=list(ORDNER))
    ap.add_argument("--skill", default=None)
    ap.add_argument("--quelle", default="Session")
    ap.add_argument("--liste", action="store_true")
    ap.add_argument("--selbsttest", action="store_true")
    a = ap.parse_args()

    if a.selbsttest:
        return selbsttest()
    if a.liste:
        liste(); return 0
    if not (a.titel and a.text):
        ap.print_help(); return 2

    ziel, neu = aufnehmen(a.titel, a.text, a.art, a.skill, a.quelle)
    print(f"{'Angelegt' if neu else 'Ergaenzt'}: {ziel.relative_to(REPO)}")
    subprocess.run([sys.executable, str(REPO / "tools" / "vault.py"), "bauen"], check=False)
    print("\nNoch zu tun, damit die Lehre wirklich haelt:")
    if a.skill:
        print(f"  1. Regel in .claude/skills/{a.skill}/SKILL.md eintragen")
    print("  2. Stand-Block in CLAUDE.md ergaenzen — mit Zahlen, nicht mit Eindruecken")
    print("  3. python3 tools/skills_pruefen.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
