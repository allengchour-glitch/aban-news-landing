#!/usr/bin/env python3
"""Task-Board — koordiniert parallele Arbeit zwischen Aban, Code-Agent und
Browser-Agent. Geteilter Zustand im Repo (docs/_board.json), damit alle drei
gleichzeitig arbeiten und jeder den Stand sieht.

Nutzung:
  python3 tools/board.py                      # Board anzeigen (gruppiert)
  python3 tools/board.py add "Text" --who aban|code|browser [--note "..."]
  python3 tools/board.py start <id>           # → in Arbeit
  python3 tools/board.py done  <id>           # → erledigt
  python3 tools/board.py block <id> --note "warum"   # → blockiert
  python3 tools/board.py todo  <id>           # → zurück auf offen
  python3 tools/board.py note  <id> "Text"    # Notiz setzen
  python3 tools/board.py rm    <id>           # entfernen

Nach Änderungen committen + pushen, damit die anderen Sessions es sehen.
Kein externer Dependency — reine stdlib.
"""
import json, sys, datetime
from pathlib import Path

STORE = Path(__file__).resolve().parent.parent / "docs" / "_board.json"
WHO = {"aban": "🧑 Aban", "code": "🤖 Code", "browser": "🌐 Browser"}
STATUS = {"todo": "⬜ Offen", "doing": "🔵 In Arbeit", "blocked": "⛔ Blockiert", "done": "✅ Erledigt"}
ORDER = ["doing", "blocked", "todo", "done"]


def load():
    if STORE.exists():
        return json.loads(STORE.read_text(encoding="utf-8"))
    return {"next_id": 1, "tasks": []}


def save(d):
    STORE.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now():
    return datetime.date.today().isoformat()


def find(d, tid):
    for t in d["tasks"]:
        if t["id"] == tid:
            return t
    print(f"Task #{tid} nicht gefunden."); sys.exit(1)


def show(d):
    tasks = d["tasks"]
    if not tasks:
        print("Board ist leer. Mit `add` etwas anlegen."); return
    print("\n📋 TASK-BOARD\n" + "=" * 48)
    for st in ORDER:
        group = [t for t in tasks if t["status"] == st]
        if not group:
            continue
        print(f"\n{STATUS[st]}")
        for t in group:
            note = f"  — {t['note']}" if t.get("note") else ""
            print(f"  #{t['id']:>2} [{WHO.get(t['who'], t['who'])}] {t['task']}{note}")
    open_n = sum(1 for t in tasks if t["status"] in ("todo", "doing", "blocked"))
    print("\n" + "-" * 48)
    print(f"{open_n} offen · {sum(1 for t in tasks if t['status']=='done')} erledigt\n")


def main():
    a = sys.argv[1:]
    d = load()
    if not a or a[0] == "list":
        show(d); return
    cmd = a[0]
    if cmd == "add":
        text = a[1] if len(a) > 1 else ""
        who = "aban"
        note = ""
        if "--who" in a: who = a[a.index("--who") + 1]
        if "--note" in a: note = a[a.index("--note") + 1]
        if not text or who not in WHO:
            print("Nutzung: add \"Text\" --who aban|code|browser [--note \"...\"]"); sys.exit(1)
        t = {"id": d["next_id"], "task": text, "who": who, "status": "todo", "note": note, "updated": now()}
        d["tasks"].append(t); d["next_id"] += 1
        save(d); print(f"➕ #{t['id']} angelegt."); show(d)
    elif cmd in ("start", "done", "block", "todo"):
        t = find(d, int(a[1]))
        t["status"] = {"start": "doing", "done": "done", "block": "blocked", "todo": "todo"}[cmd]
        if "--note" in a: t["note"] = a[a.index("--note") + 1]
        t["updated"] = now(); save(d); show(d)
    elif cmd == "note":
        t = find(d, int(a[1])); t["note"] = a[2]; t["updated"] = now(); save(d); show(d)
    elif cmd == "rm":
        d["tasks"] = [t for t in d["tasks"] if t["id"] != int(a[1])]; save(d); show(d)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
