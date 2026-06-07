"""mediakit/firefly.py — Datei-Staging für Adobe-Firefly-MCP-Edits.

EHRLICH: Die kreative KI-Bearbeitung (Hintergrund entfernen, generativ erweitern,
Farb-Grade, Video-Cut) macht der **Agent über die Adobe-MCP-Tools** — es gibt KEIN
Python, das die KI aufruft. Diese Helfer stellen nur Dateien bereit (prepare) und
holen das fertige Ergebnis zurück ins Repo (ingest). Rezepte: mediakit/FIREFLY.md.
"""
import shutil
from pathlib import Path

STAGE = Path(__file__).resolve().parent / ".firefly_stage"


def prepare(in_path, stage_dir=None):
    """Quell-Asset in einen vorhersehbaren Staging-Ordner kopieren; Pfad ausgeben."""
    stage = Path(stage_dir) if stage_dir else STAGE
    stage.mkdir(parents=True, exist_ok=True)
    src = Path(in_path)
    dst = stage / src.name
    shutil.copy2(src, dst)
    p = dst.resolve()
    print(f"Bereit für Firefly-MCP: {p}")
    print("Nächster Schritt (Agent): asset_initialize_file_upload/asset_add_file mit diesem Pfad,")
    print("dann z. B. image_remove_background / image_generative_expand / video_resize.")
    return p


def ingest(firefly_output, dest):
    """Fertiges Firefly-Asset zurück ins Repo holen."""
    src, dst = Path(firefly_output), Path(dest)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Ins Repo übernommen: {dst.resolve()}")
    print("Tipp: mit `mediakit image crop --aspect 9:16` markenkonform nachschneiden.")
    return dst
