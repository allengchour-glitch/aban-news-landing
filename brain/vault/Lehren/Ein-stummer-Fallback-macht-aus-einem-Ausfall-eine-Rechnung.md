# Ein stummer Fallback macht aus einem Ausfall eine Rechnung

**Fall (14.09.2026):** Der Groq-Schlüssel der CJ-Importer war seit dem 05.09. ungültig (55 statt 56 Zeichen). Groq antwortete 401, DeepSeek 402 — und das bezahlte Gemini schrieb neun Tage lang alle ~2'050 Produkttexte. Der Runner meldete nur «✅»; welches Modell schrieb, stand nirgends. Der Betreiber wollte «alles kostenlos».

**Warum es unsichtbar blieb:** Ein Fallback ist dafür gebaut, den Ausfall zu verdecken. Genau deshalb braucht er eine eigene Meldung — sonst ist «es funktioniert» und «es kostet» dieselbe Zeile im Log.

**Regel:** Jeder Fallback, der etwas kostet (Geld, Punkte, Qualität), meldet sich beim Übernehmen — und ein Wächter prüft den PRIMÄREN Weg regelmässig, nicht nur das Ergebnis. Gemessen wird in der Umgebung des laufenden Prozesses (`/proc/<pid>/environ`), nicht im Gedächtnis.

Verwandt: [[Eine-Konfigurationsdatei-in-tmp-ist-keine]] · [[Katalog-Groesse-und-B2B]]
