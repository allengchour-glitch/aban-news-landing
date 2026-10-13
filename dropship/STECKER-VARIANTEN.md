# Netzstecker je Variante — Stand 2026-10-13

Waechter `automation/cj_stecker_pruefen.py --varianten` (taeglich im Aufseher). Klasse: aktive Produkte mit ≥ 2 Varianten, von denen mindestens eine einen fremden Stecker (US/UK/AU/CN/JP …) traegt.

- Produkte in der Klasse: **1** · Urteile: {'sperren': 1}
- in diesem Lauf gesperrt: **44** Varianten · gedraftet: **0** · Fehler: 0
- Varianten OHNE Steckerkennung werden nie angefasst (welche Version CJ schickt, ist nicht belegt).
- Rueckweg je Produkt: `python3 automation/cj_stecker_pruefen.py --rueckweg <pid>` (Ledger `dropship/_cj_stecker_varianten.tsv`).

| Produkt | Urteil | EU | fremd | ohne Kennung |
|---|---|---|---|---|
| `15450828636545` 3-in-1 Wireless Ladestation für mehrere Geräte | sperren | 3 | AU:12,UK:4,US:28 | 14 |
