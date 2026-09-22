---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-19 · 🔎 Der Klammer-Trick schützt den grep
gelernt: 2026-09-22
---
# Der Klammer-Trick schützt den grep, nicht die ganze Zeile

Zwei Prüfungen in EINER Befehlszeile widersprachen sich: awk auf fixer_keepalive.sh → nichts, grep -c "[f]ixer_keepalive" → 1. Die 1 war die eigene bash -c-Hülle, deren Kommandozeile den Namen im awk-Regex im Klartext trägt — und die Hülle steht genauso in ps. Der Aufseher war wirklich tot. Regel: der Klammer-Trick gilt pro Zeile, nicht pro Wort; eine argv-Prüfung ist nur sicher, wenn der Name im selben Aufruf NIRGENDS ungeschützt vorkommt, oder man sieht auf PID und Laufzeit — ein Treffer ohne plausible PID ist ein Echo.

Verwandt: [[Hypothese-mit-Datum]]
