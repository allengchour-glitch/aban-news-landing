#!/usr/bin/env python3
"""video-pipeline/publish_reel_to_site.py — Reels auf abannews.com sichtbar machen.

Kopiert ein gerendertes Reel nach media/reels/ (wird von Cloudflare Pages mit
ausgeliefert), hält ein rollendes Fenster der neuesten N Reels und baut
media/reels/manifest.json (Titel + Link je Reel). Die Seite /reels (ki-reels.html)
liest das Manifest und spielt die Reels stumm im Loop.

    python3 publish_reel_to_site.py <tool-id>   # ausgabe/tool-<id>/reel.mp4 -> Seite
    python3 publish_reel_to_site.py              # nur Manifest neu bauen
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUSGABE = ROOT / "video-pipeline" / "ausgabe"
REELS = ROOT / "media" / "reels"
KEEP = 8  # rollendes Fenster

TOOLS = {t["id"]: t for t in json.loads((ROOT / "data" / "tools.json").read_text(encoding="utf-8"))["tools"]}
HYPE = {f["id"]: f for f in json.loads((ROOT / "data" / "hype-watch.json").read_text(encoding="utf-8"))["faelle"]}


def title_link(stem):
    if stem.startswith("tool-"):
        t = TOOLS.get(stem[5:])
        name = t["name"] if t else stem[5:]
        return f"Lohnt sich {name}?", f"https://radar.abannews.com/tool/{stem[5:]}.html"
    f = HYPE.get(stem)
    title = f"Hype-Check: {f['claim']}" if f else stem.replace("-", " ").capitalize()
    return title, f"https://abannews.com/hype-watch/{stem}.html"


def publish(case_id):
    """ausgabe/<case_id>/reel.mp4 → media/reels/<case_id>.mp4 (case_id z. B. 'tool-claude')."""
    src = AUSGABE / case_id / "reel.mp4"
    if not src.exists():
        print(f"  ✗ {src} fehlt"); return False
    REELS.mkdir(parents=True, exist_ok=True)
    dst = REELS / f"{case_id}.mp4"
    shutil.copy2(src, dst)
    print(f"  ✓ veröffentlicht: media/reels/{dst.name}")
    return True


def prune_and_manifest():
    REELS.mkdir(parents=True, exist_ok=True)
    mp4s = sorted(REELS.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in mp4s[KEEP:]:
        old.unlink(); print(f"  – entfernt (Fenster {KEEP}): {old.name}")
    mp4s = mp4s[:KEEP]
    items = []
    for p in mp4s:
        title, link = title_link(p.stem)
        items.append({"file": f"/media/reels/{p.name}", "title": title, "link": link})
    (REELS / "manifest.json").write_text(
        json.dumps({"reels": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ manifest.json: {len(items)} Reels")


def publish_latest():
    """Neuestes ausgabe/tool-*/reel.mp4 veröffentlichen (für den Cron, ohne ID zu kennen)."""
    cands = sorted(AUSGABE.glob("tool-*/reel.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not cands:
        print("  ✗ kein ausgabe/tool-*/reel.mp4 gefunden"); return False
    return publish(cands[0].parent.name)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--latest" in sys.argv:
        publish_latest()
    elif args:
        publish(args[0])
    prune_and_manifest()


if __name__ == "__main__":
    main()
