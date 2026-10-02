---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-10-02
---
# Groq-Gratis hat ein Tageskontingent je Modell

02.10.: 200'000 Tokens pro Tag JE MODELL (gpt-oss-120b, qwen3.8-27b, gpt-oss-20b getrennt). Ein Massenlauf (Google-Feinkategorien) leerte zwei Modelle und blockierte Bestell-Bildvergleich und SEO-Prüfung. Regel: Massenläufe auf ein eigenes Modell (GROQ_MODELL=openai/gpt-oss-20b, GROQ_AUSWEICH=), 'per day' im 429 = sofort abbrechen, nicht warten.

Verwandt: [[Hypothese-mit-Datum]]
