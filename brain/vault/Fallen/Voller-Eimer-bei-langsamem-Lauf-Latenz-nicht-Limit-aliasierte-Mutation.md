---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 33 (23.09.2026)
gelernt: 2026-09-23
---
# Voller Eimer bei langsamem Lauf: Latenz, nicht Limit — aliasierte Mutationen laufen seriell

Kategorie-Lauf 23.09.: 100 Produkte/min bei throttleStatus 1999/2000. 25 aliasierte productUpdate je Anfrage führt Shopify nacheinander aus (~0,5 s je Produkt) — Batching spart Anfragen, keine Zeit. Fix: WORKER=3 parallele Batches → 350/min bei Eimer 1701; Eimer-Etikette bremst jeden Arbeiter. Erst messen, ob Limit oder Latenz bremst (throttleStatus + Zeit je Einzelaufruf). Ein Nachlauf, der länger dauert als der Container lebt, braucht einen Starter im Keepalive; zwei Starter für ein Skript brauchen die Sperre IM Skript.

Verwandt: [[Hypothese-mit-Datum]]
