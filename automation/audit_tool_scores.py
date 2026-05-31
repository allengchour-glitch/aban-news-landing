#!/usr/bin/env python3
"""Score-Auditor für data/tools.json.

Rein lesender Report: Score-Verteilung, Ausreißer, fragwürdige Bewertungen
(z.B. Top-Score mit dünner Begründung), Frei/Bezahlt-Mix, Kategorie-Abdeckung.
Hilft, die Tool-DB ehrlich und konsistent zu halten, wenn sie wächst.

    python3 automation/audit_tool_scores.py
"""
import json
import statistics as st
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "data" / "tools.json"


def bar(n, total, width=24):
    filled = round(width * n / total) if total else 0
    return "█" * filled + "·" * (width - filled)


def main():
    d = json.loads(TOOLS.read_text(encoding="utf-8"))
    tools = d["tools"]
    n = len(tools)
    ws = [t["worth_it_score"] for t in tools if isinstance(t.get("worth_it_score"), (int, float))]
    dr = [t["dach_relevance"] for t in tools if isinstance(t.get("dach_relevance"), (int, float))]

    print(f"=== Tool-DB-Audit · {n} Tools · Stand {d.get('last_updated','?')} ===\n")

    print(f"Worth-it-Score:  ø {st.mean(ws):.2f}  · Median {st.median(ws):.1f}  · Min {min(ws)} · Max {max(ws)}")
    print(f"DACH-Relevanz:   ø {st.mean(dr):.2f}  · Median {st.median(dr):.1f}  · Min {min(dr)} · Max {max(dr)}\n")

    print("Worth-it-Verteilung:")
    buckets = Counter(int(x) for x in ws)
    for s in range(10, 0, -1):
        c = buckets.get(s, 0)
        if c:
            print(f"  {s:>2}  {bar(c, n)} {c}")

    print("\nTop 8 (worth-it):")
    for t in sorted(tools, key=lambda x: x.get("worth_it_score", 0), reverse=True)[:8]:
        print(f"  {t['worth_it_score']:>4}  {t['name']:<20} (DACH {t.get('dach_relevance','?')})")
    print("Schwächste 5 (worth-it):")
    for t in sorted(tools, key=lambda x: x.get("worth_it_score", 0))[:5]:
        print(f"  {t['worth_it_score']:>4}  {t['name']:<20} — {t.get('aban_note','')[:50]}")

    # Frei vs. bezahlt
    free = sum(1 for t in tools if t.get("pricing", {}).get("free_tier"))
    print(f"\nFree-Tier: {free}/{n} ({100*free//n}%)  ·  nur bezahlt: {n-free}")
    dach_strong = sum(1 for t in tools if (t.get("dach_relevance") or 0) >= 8)
    print(f"DACH-stark (≥8): {dach_strong}  ·  EU/DSGVO im dsgvo_note: "
          f"{sum(1 for t in tools if 'EU' in (t.get('dsgvo_note') or '') or 'DE' in (t.get('dsgvo_note') or '') or 'CH' in (t.get('dsgvo_note') or ''))}")

    # Verdächtig: Top-Score, aber sehr kurze Begründung
    print("\n⚠️  Prüfen — hoher Score (≥9), aber dünne Begründung (<70 Zeichen):")
    flagged = [t for t in tools if (t.get("worth_it_score") or 0) >= 9 and len(t.get("aban_note", "")) < 70]
    for t in flagged:
        print(f"   - {t['name']} ({t['worth_it_score']}): \"{t.get('aban_note','')}\"")
    if not flagged:
        print("   (keine — Top-Bewertungen sind alle begründet)")

    # Kategorie-Abdeckung
    cats = Counter(c for t in tools for c in t.get("category", []))
    print("\nTop-Kategorien:")
    for c, cnt in cats.most_common(10):
        print(f"  {cnt:>3}  {c}")

    print(f"\nFertig — {n} Tools auditiert (rein lesend, nichts geändert).")


if __name__ == "__main__":
    main()
