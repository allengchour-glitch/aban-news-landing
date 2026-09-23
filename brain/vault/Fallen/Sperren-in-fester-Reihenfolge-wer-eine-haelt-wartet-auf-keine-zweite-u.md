---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 45
gelernt: 2026-09-23
---
# Sperren in fester Reihenfolge — wer eine hält, wartet auf keine zweite unbegrenzt

Aufseher-Starter nahmen die Produkttext-Sperre (fd 8) und warteten dann in shopify_schranke auf einen Platz; produkttexte_du_form hielt einen Platz den ganzen Lauf und nahm fd 8 je Produkt → Deadlock, 6 Tages-Waechter bis 3 h blockiert. Diagnose ueber /proc/locks und /proc/*/fd (Halter-PID tot, fd in Kindern). Fix: wer fd 8 haelt, wartet nie auf einen Platz; sonst hoechstens 45 min.

Verwandt: [[Hypothese-mit-Datum]]
