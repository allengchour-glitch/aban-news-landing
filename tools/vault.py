#!/usr/bin/env python3
"""vault.py — baut und prueft den Obsidian-Vault unter brain/vault/.

  python3 tools/vault.py bauen        Index + Zeitleiste neu erzeugen, dann pruefen
  python3 tools/vault.py pruefen      nur pruefen (Exit 1 bei kaputten Links)
  python3 tools/vault.py selbsttest   Gegenprobe: erkennt das Werkzeug einen kaputten Link?

Warum der Selbsttest: ein Pruefwerkzeug, das immer "alles gut" sagt, ist schlimmer als keines.
Siehe brain/vault/Fallen/Messgeraet-Gegenprobe.md.
"""
from __future__ import annotations
import re, sys, shutil, tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VAULT = REPO / "brain" / "vault"
INDEX = VAULT / "00 Start hier.md"
ZEITLEISTE = VAULT / "Stand" / "Zeitleiste.md"
LINK = re.compile(r"\[\[([^\]|#]+)")
CODEBLOCK = re.compile(r"```.*?```", re.S)
CODESPAN = re.compile(r"`[^`\n]*`")


def ohne_code(txt: str) -> str:
    """Entfernt Code-Bloecke und Inline-Code, damit Beispiel-Links in Backticks nicht
    als echte Verweise gezaehlt werden (sonst meldet der Pruefer Prosa als Fehler)."""
    return CODESPAN.sub("", CODEBLOCK.sub("", txt))
ERZEUGT = {INDEX.name, "Zeitleiste.md"}          # werden gebaut, nicht von Hand gepflegt


def notizen(vault: Path) -> list[Path]:
    return sorted(p for p in vault.rglob("*.md") if p.is_file())


def pruefen(vault: Path, still: bool = False) -> int:
    """Prueft, ob jeder [[Wikilink]] eine Notiz trifft. Rueckgabe: Zahl kaputter Links."""
    namen = {p.stem for p in notizen(vault)}
    kaputt: list[tuple[Path, str]] = []
    verweise = 0
    for p in notizen(vault):
        for ziel in LINK.findall(ohne_code(p.read_text(encoding="utf-8"))):
            verweise += 1
            if ziel.strip() not in namen:
                kaputt.append((p, ziel.strip()))
    if not still:
        print(f"{len(namen)} Notizen, {verweise} Wikilinks, {len(kaputt)} kaputt")
        for p, ziel in kaputt:
            print(f"  KAPUTT  {p.relative_to(vault)} → [[{ziel}]]")
        verwaist = namen - {z.strip() for p in notizen(vault)
                            for z in LINK.findall(ohne_code(p.read_text(encoding='utf-8')))} - {INDEX.stem}
        if verwaist:
            print(f"  {len(verwaist)} Notizen, auf die niemand verlinkt: "
                  + ", ".join(sorted(verwaist)))
    return len(kaputt)


def zeitleiste_bauen() -> int:
    """Zieht die 📌-Stand-Bloecke aus CLAUDE.md in eine kurze Zeitleiste."""
    md = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
    treffer = re.findall(r"\*\*📌\s*(\d{4}-\d{2}-\d{2})\s*\(([^)]*)\)", md)
    zeilen = ["---", "tags: [stand, erzeugt]", "quelle: CLAUDE.md", "---",
              "# Zeitleiste", "",
              "Erzeugt von `tools/vault.py bauen` aus den 📌-Bloecken in `CLAUDE.md`.",
              "**Nicht von Hand bearbeiten** — Aenderungen gehoeren in `CLAUDE.md`.", ""]
    gesehen = set()
    for datum, titel in treffer:
        if (datum, titel) in gesehen:
            continue
        gesehen.add((datum, titel))
        zeilen.append(f"- **{datum}** — {titel.strip()}")
    zeilen += ["", "Vollstaendig mit allen Zahlen: `CLAUDE.md`, Abschnitt `## Stand`.", ""]
    ZEITLEISTE.parent.mkdir(parents=True, exist_ok=True)
    ZEITLEISTE.write_text("\n".join(zeilen), encoding="utf-8")
    return len(gesehen)


def index_bauen() -> int:
    """Baut die Startnotiz: jede Notiz, nach Ordner gruppiert, mit erster Inhaltszeile."""
    gruppen: dict[str, list[Path]] = {}
    for p in notizen(VAULT):
        if p.name in ERZEUGT:
            continue
        gruppen.setdefault(p.parent.name if p.parent != VAULT else ".", []).append(p)

    kopf = ["---", "tags: [moc, erzeugt]", "---", "# Start hier", "",
            "Zweites Gehirn dieses Repos. Atomare Notizen, ueber `[[Wikilinks]]` verbunden.",
            "Die grossen Dateien `CLAUDE.md` und `SHARED-MEMORY.md` bleiben die Historie —",
            "dieser Vault ist der Zugriff darauf.", "",
            "```bash",
            'python3 tools/gedaechtnis.py "stichwort"   # Fakten mit Datum und Quelle',
            "python3 tools/gedaechtnis.py --sackgassen  # was nachweislich nicht funktioniert",
            "python3 tools/gedaechtnis.py --offen       # was nur der User klicken kann",
            "python3 tools/vault.py bauen               # diese Datei neu bauen, Links pruefen",
            "```", "",
            "**Diese Datei wird erzeugt** (`tools/vault.py bauen`) — nicht von Hand bearbeiten.", ""]

    titel = {"Systeme": "🏗️ Systeme — die fuenf aus dem Video",
             "Fallen": "🕳️ Fallen — teuer gelernt, gelten weiter",
             "Sackgassen": "⛔ Sackgassen — nicht erneut versuchen",
             "Blockiert": "🟡 Blockiert — wartet auf den User",
             "Projekte": "📦 Projekte",
             "Stand": "🗓️ Stand",
             ".": "📄 Einzelnotizen"}
    zahl = 0
    for ordner in ["Systeme", "Fallen", "Sackgassen", "Blockiert", "Projekte", "Stand", "."]:
        eintraege = gruppen.get(ordner)
        if not eintraege:
            continue
        kopf += [f"## {titel.get(ordner, ordner)}", ""]
        for p in eintraege:
            kopf.append(f"- [[{p.stem}]]{' — ' + erste_zeile(p) if erste_zeile(p) else ''}")
            zahl += 1
        kopf.append("")
    if ZEITLEISTE.exists():
        kopf += ["## 🗓️ Stand", "", "- [[Zeitleiste]] — alle Stand-Bloecke aus `CLAUDE.md`", ""]
        zahl += 1
    INDEX.write_text("\n".join(kopf), encoding="utf-8")
    return zahl


def erste_zeile(p: Path) -> str:
    """Kurzbeschreibung: erster echter Satz nach der H1, auf 90 Zeichen gekuerzt."""
    txt = p.read_text(encoding="utf-8")
    txt = re.sub(r"^---.*?---\s*", "", txt, flags=re.S)          # Frontmatter weg
    zeilen = [z.strip() for z in txt.splitlines()]
    nach_h1 = False
    for z in zeilen:
        if z.startswith("# "):
            nach_h1 = True
            continue
        if nach_h1 and z and not z.startswith(("#", "|", ">", "-", "`", "*tags")):
            z = re.sub(r"\[\[([^\]|]+)\]\]", r"\1", z)
            z = re.sub(r"[*`]", "", z)
            return (z[:90] + "…") if len(z) > 90 else z
    return ""


def selbsttest() -> int:
    """Gegenprobe: ein kuenstlich kaputter Link MUSS gefunden werden, ein saubererer Vault nicht."""
    if not VAULT.exists():
        print("FEHLER: kein Vault unter brain/vault/")
        return 1
    fehler = 0
    sauber = pruefen(VAULT, still=True)
    print(f"1) echter Vault: {sauber} kaputte Links")
    with tempfile.TemporaryDirectory() as td:
        kopie = Path(td) / "vault"
        shutil.copytree(VAULT, kopie)
        # a) kaputter Link wird eingebaut → muss auffallen
        ziel = next(p for p in notizen(kopie))
        ziel.write_text(ziel.read_text(encoding="utf-8")
                        + "\n\n[[Diese-Notiz-Gibt-Es-Garantiert-Nicht]]\n", encoding="utf-8")
        mit = pruefen(kopie, still=True)
        ok_a = mit == sauber + 1
        print(f"2) Gegenprobe kaputter Link: {mit} gefunden (erwartet {sauber + 1}) "
              f"→ {'OK' if ok_a else 'FEHLGESCHLAGEN'}")
        fehler += 0 if ok_a else 1
        # b) Notiz loeschen → alle Links darauf muessen auffallen
        shutil.rmtree(kopie)
        shutil.copytree(VAULT, kopie)
        opfer = kopie / "Fallen" / "Publish-Falle.md"
        if opfer.exists():
            opfer.unlink()
            ohne = pruefen(kopie, still=True)
            ok_b = ohne > sauber
            print(f"3) Gegenprobe geloeschte Notiz: {ohne} kaputte Links (erwartet > {sauber}) "
                  f"→ {'OK' if ok_b else 'FEHLGESCHLAGEN'}")
            fehler += 0 if ok_b else 1
    print("SELBSTTEST BESTANDEN" if fehler == 0 else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


def main() -> int:
    befehl = sys.argv[1] if len(sys.argv) > 1 else "bauen"
    if befehl == "selbsttest":
        return selbsttest()
    if befehl == "pruefen":
        return 1 if pruefen(VAULT) else 0
    if befehl == "bauen":
        n = zeitleiste_bauen()
        m = index_bauen()
        print(f"Zeitleiste: {n} Stand-Bloecke · Index: {m} Notizen")
        return 1 if pruefen(VAULT) else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
