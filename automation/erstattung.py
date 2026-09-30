"""erstattung.py — wie viel einer Bestellung ist WIRKLICH zurückgegangen? (30.09.2026)

GEMESSEN (#1019): Nach der Rückerstattung über Shopify Payments blieb die Bestellung «PAID» und `totalRefundedSet` = 0.00,
solange die REFUND-Buchungen auf PENDING stehen (1–2 Tage). Drei Zähler hielten sie deshalb für einen Verkauf:
Bestell-Ampel («erstattet» schon bei einer Teilerstattung), GROW-Zähler (2/3 statt 1/3), VERKAUF-ZIEL.
Regel: zurückgegangen = Summe der REFUND-Buchungen mit Status SUCCESS oder PENDING. GraphQL-Feld dazu:
  REFUND_FELD (in die Bestellabfrage einsetzen).
"""
REFUND_FELD = "refunds(first:5){ transactions(first:5){ nodes{ kind status amountSet{ shopMoney{ amount } } } } }"


def zurueck(o):
    """Erstatteter Betrag inkl. noch nicht gebuchter (PENDING) Rückbuchungen."""
    return sum(float(t["amountSet"]["shopMoney"]["amount"]) for r in (o.get("refunds") or [])
               for t in ((r.get("transactions") or {}).get("nodes") or [])
               if t.get("kind") == "REFUND" and t.get("status") in ("SUCCESS", "PENDING"))


def voll_erstattet(o, betrag):
    return zurueck(o) >= float(betrag) - 0.005


if __name__ == "__main__":
    # Kanarienvögel
    def b(*t): return {"refunds": [{"transactions": {"nodes": [{"kind": "REFUND", "status": s, "amountSet": {"shopMoney": {"amount": a}}} for s, a in t]}}]}
    assert voll_erstattet(b(("PENDING", "16.11"), ("PENDING", "7.0")), "23.11")      # #1019
    assert not voll_erstattet(b(("PENDING", "16.11")), "23.11")                      # Teilerstattung
    assert not voll_erstattet(b(("FAILURE", "23.11")), "23.11")                      # gescheitert zählt nicht
    assert not voll_erstattet({"refunds": []}, "36.90")                               # #1020
    print("erstattung.py: 4/4 Kanarienvögel ok")
