#!/usr/bin/env python3
"""skills_pruefen.py — findet verrottete Verweise in .claude/skills/ und brain/vault/.

  python3 tools/skills_pruefen.py             pruefen (Exit 1 bei Befund)
  python3 tools/skills_pruefen.py --selbsttest Gegenprobe

Skills und Notizen verrotten leise: sie zeigen auf Dateien, die spaeter umbenannt oder geloescht
wurden. Eine Anleitung, die auf ein nicht existierendes Werkzeug zeigt, ist schlimmer als keine —
sie kostet die naechste Session Zeit und Vertrauen.

Geprueft wird:
  1. jede SKILL.md hat Frontmatter mit name und description, name == Ordnername
  2. jeder Pfad in Backticks (mit Schraegstrich und Endung) existiert
  3. jeder genannte Workflow-Dateiname (*.yml) ist im Repo auffindbar
"""
from __future__ import annotations
import re, sys, shutil, tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SKILLS = REPO / ".claude" / "skills"
VAULT = REPO / "brain" / "vault"

# Pfad in Backticks: mindestens ein Schraegstrich und eine Dateiendung
PFAD = re.compile(r"`([A-Za-z0-9_.][A-Za-z0-9_./\-]*\/[A-Za-z0-9_.\-]+\.[A-Za-z0-9]{2,4})`")
YML = re.compile(r"`([A-Za-z0-9_.\-]+\.ya?ml)`")
# Pfade, die absichtlich nicht im Repo liegen (Server, Container, fremde Systeme)
FREMD = ("/etc/", "/opt/", "/tmp/", "gid://", "http")


def dateien(basis: Path) -> list[Path]:
    if not basis.exists():
        return []
    return sorted(p for p in basis.rglob("*.md") if p.is_file())


def frontmatter_pruefen(p: Path, repo: Path = REPO) -> list[str]:
    txt = p.read_text(encoding="utf-8", errors="replace")
    mangel = []
    if not txt.startswith("---"):
        return [f"{p.relative_to(repo)}: kein Frontmatter"]
    kopf = txt.split("---")[1]
    name = re.search(r"^name:\s*(\S+)", kopf, re.M)
    desc = re.search(r"^description:\s*(.+)", kopf, re.M)
    if not name:
        mangel.append(f"{p.relative_to(repo)}: kein 'name:'")
    elif name.group(1) != p.parent.name:
        mangel.append(f"{p.relative_to(repo)}: name '{name.group(1)}' "
                      f"!= Ordner '{p.parent.name}'")
    if not desc:
        mangel.append(f"{p.relative_to(repo)}: keine 'description:'")
    elif len(desc.group(1).strip()) < 40:
        mangel.append(f"{p.relative_to(repo)}: description zu kurz "
                      f"({len(desc.group(1).strip())} Zeichen) — loest nicht zuverlaessig aus")
    return mangel


def verweise_pruefen(p: Path, repo: Path) -> list[str]:
    txt = p.read_text(encoding="utf-8", errors="replace")
    fehlt = []
    for pfad in sorted(set(PFAD.findall(txt))):
        if pfad.startswith(FREMD) or any(f in pfad for f in FREMD):
            continue
        if not (repo / pfad).exists():
            fehlt.append(f"{p.relative_to(repo)}: `{pfad}` existiert nicht")
    for y in sorted(set(YML.findall(txt))):
        if "/" in y:
            continue
        if not list(repo.rglob(y)):
            fehlt.append(f"{p.relative_to(repo)}: Workflow `{y}` nicht im Repo gefunden")
    return fehlt


def pruefen(repo: Path = REPO, still: bool = False) -> int:
    skills = dateien(repo / ".claude" / "skills")
    notizen = dateien(repo / "brain" / "vault")
    mangel: list[str] = []
    for p in skills:
        if p.name != "SKILL.md":
            continue
        mangel += frontmatter_pruefen(p, repo)
    for p in skills + notizen:
        mangel += verweise_pruefen(p, repo)
    if not still:
        print(f"{len([p for p in skills if p.name == 'SKILL.md'])} Skills, "
              f"{len(notizen)} Vault-Notizen, {len(mangel)} Befunde")
        for m in mangel:
            print(f"  BEFUND  {m}")
        if not mangel:
            print("  Alle Verweise zeigen auf existierende Dateien.")
    return len(mangel)


def selbsttest() -> int:
    fehler = 0
    print("Selbsttest skills_pruefen.py\n" + "-" * 40)
    sauber = pruefen(REPO, still=True)
    print(f"  echtes Repo: {sauber} Befunde")
    with tempfile.TemporaryDirectory() as td:
        kopie = Path(td) / "repo"
        (kopie / ".claude").mkdir(parents=True)
        shutil.copytree(SKILLS, kopie / ".claude" / "skills")
        shutil.copytree(VAULT, kopie / "brain" / "vault")
        for d in ("tools", "automation", "dropship", "docs", "spiele-dev/tools", "server"):
            (kopie / d).mkdir(parents=True, exist_ok=True)
        # alle echten Verweise mitkopieren, damit nur der EINE Fehler uebrig bleibt
        for p in dateien(kopie / ".claude" / "skills") + dateien(kopie / "brain" / "vault"):
            for pfad in set(PFAD.findall(p.read_text(encoding="utf-8", errors="replace"))):
                if pfad.startswith(FREMD) or any(f in pfad for f in FREMD):
                    continue
                ziel = kopie / pfad
                ziel.parent.mkdir(parents=True, exist_ok=True)
                ziel.touch()
            for y in set(YML.findall(p.read_text(encoding="utf-8", errors="replace"))):
                if "/" not in y:
                    (kopie / y).touch()
        basis = pruefen(kopie, still=True)
        print(f"  Kopie mit allen Zieldateien: {basis} Befunde")

        ziel = kopie / ".claude" / "skills" / "gedaechtnis" / "SKILL.md"
        # a) kaputter Pfad
        ziel.write_text(ziel.read_text() + "\n\nSiehe `tools/gibt-es-garantiert-nicht.py`.\n")
        a = pruefen(kopie, still=True)
        ok_a = a == basis + 1
        print(f"  {'OK ' if ok_a else 'FEHLER'} kaputter Pfad: {a} (erwartet {basis + 1})")
        fehler += 0 if ok_a else 1

        # b) name passt nicht zum Ordner
        t = ziel.read_text().replace("name: gedaechtnis", "name: falscher-name", 1)
        ziel.write_text(t)
        b = pruefen(kopie, still=True)
        ok_b = b == basis + 2
        print(f"  {'OK ' if ok_b else 'FEHLER'} falscher name: {b} (erwartet {basis + 2})")
        fehler += 0 if ok_b else 1
    print("-" * 40)
    print("SELBSTTEST BESTANDEN" if fehler == 0 else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(1 if pruefen() else 0)
