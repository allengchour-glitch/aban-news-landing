# Google-Bildtausch: Wechselbetrieb statt fester Reihenfolge (03.10.2026, Verbesserungsrunde 12:25)

## GEMESSEN
- Erster vollständiger Google-Scan seit 02.10. (10:09 UTC, möglich durch die Fortsetzung von heute früh):
  - «Restricted adult content» **92 → 265**: 240 neu, fast nur frische Grind-Mode mit Modelfotos
  - «Inappropriate image» 250 → 199
- Der Bildtausch im Aufseher arbeitete die Klassen in fester Reihenfolge ab (Inappropriate → Adult → Überlagerung), je Klasse N=60 und 25 Min.
  - Durchsatz: 11 Produkte im Lauf 10:11 und **0** im Lauf 11:13. Der Lauf 11:13 zeigt keine einzige Zeile; vermutlich Wartezeiten des Zweitprüfers bei Groq-429.
  - Jeder Lauf endet spätestens mit dem stündlichen Container-Neustart. In keinem Lauf seit dem Scan kam die Klasse Adult an die Reihe.
  - Folge: 265 Adult-Produkte warteten ohne Ende hinter 63 «Inappropriate».

## GETAN
- `fixer_keepalive.sh`, Block Google-Bildtausch:
  - Jeder Lauf beginnt bei der nächsten Klasse (Zähler `/tmp/gbt_klasse_idx`, reihum 0/1/2).
  - Je Klasse höchstens **N=8** und 20 Min, damit alle drei Klassen in einem Container-Leben drankommen.
- Zitierung der Klassennamen mit Leerzeichen per Probe geprüft: `[Restricted adult content]` usw. kommen korrekt beim Skript an. `bash -n` ist ok.

## OFFEN / Nächste Schritte
- Nachmessung beim nächsten Vollscan (täglich): Adult-Zahl und Anteil «tausch» in dieser Klasse.
- Vorbeugung an der Quelle wäre eine Import-Regel: bei Wäsche/Bademode/Bodys ein Hauptbild ohne Model zuerst. Erst messen, ob die Bildtausch-Quote bei Adult ähnlich hoch ist wie bei Inappropriate (76–83 %).
