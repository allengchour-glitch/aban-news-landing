---
tags: [blockiert, nur-user]
quelle: Session 2026-09-12, Messung an .github/workflows/
gelernt: 2026-09-12
---
# Vier Crons sind wieder aktiv trotz Nulldiaet

Das Gedaechtnis sagt seit 2026-06-13 (Cron-Nulldiaet, PR #828): **„ALLE ~60 `schedule:`-Blöcke
auskommentiert, 0 aktive Crons"**. Gemessen am 2026-09-12 stimmt das nicht mehr.

Von 167 Workflow-Dateien haben **vier** einen aktiven `schedule:`-Block mit `cron:`:

| Workflow | Cron |
|---|---|
| `bestseller-refresh.yml` | `0 6 * * *` (taeglich) |
| `shop-autopilot.yml` | `45 6 * * *` (taeglich) |
| `image-audit.yml` | `30 4 * * 2` (Di) |
| `shop-guards.yml` | `0 7 * * 1` (Mo) |

Messbefehl:

```bash
for f in .github/workflows/*.yml; do
  grep -qE "^\s*schedule:\s*$" "$f" && grep -qE "^\s*-\s*cron:" "$f" && echo "$f"
done
```

**Warum das zaehlt:** die Fair-Use-Sperre kam von zu vielen Laeufen. Solange Actions gesperrt ist,
laufen diese vier nicht — aber **in der Sekunde, in der die Sperre faellt, starten sie von selbst**.
Zwei davon taeglich. Wer dann noch weitere reaktiviert, geht von einer falschen Basis (0) aus.

**Bewusst nicht geaendert:** die vier gehoeren zum Shop-Autopilot und koennen absichtlich so
stehen. Das zu entscheiden ist Sache des Users beziehungsweise der Dropship-Session, nicht eines
Nebenbefunds. Festgehalten, damit die Zahl „0" nicht weiter als Tatsache gilt.

Verwandt: [[Hypothese-mit-Datum]]
