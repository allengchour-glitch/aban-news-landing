# Google AI Pro (5 TB): Vorteile für den Shop nutzen (03.11.2026)

Besitzer 03.11.: «nutze alle vorteile die du kannst auf maximum». Quellen: Google-One-Seiten und Hilfe (one.google.com/about/google-ai-plans, support.google.com/googleone/answer/14534406), AI-Studio-Hilfe «Use Your Google AI Plan Credits» (aktualisiert 03.11.), ai.google.dev/gemini-api/docs/pricing (gelesen 03.11.). Marken: **GEMESSEN** = hier abgefragt · **QUELLE** = Seite gelesen · **Vermutung** · **unbekannt**.

## Stand der Gemini-API (GEMESSEN 03.11. 22:40 UTC)

- `GEMINI_API_KEY` ist in der Sitzung gesetzt (Länge 39). Die Modellliste (HTTP 200) zeigt `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-omni-flash-preview`, Nano Banana (`gemini-3.1-flash-image`, `gemini-3-pro-image`, `gemini-nano-banana-2.1`), `lyria-3.5`, mehrere TTS- und Live-Modelle.
- **Jeder Aufruf (`generateContent`, `gemini-4-argon`) endet mit HTTP 402 «Your prepayment credits are depleted».** Das Projekt hängt also an der bezahlten Stufe mit Prepaid-Guthaben, und das ist leer.
- Google-Cloud-Gutschriften (Besitzer-Screenshot): sechs Monatsguthaben des Developer-Programms je 8,32 CHF **verbraucht**, das aktuelle 8,29 CHF offen; «GenAI App Builder» 785,46 CHF gilt nur für Agent Search (Drittquellen, nicht für diesen Schlüssel).
- QUELLE AI-Studio-Hilfe: Promo-Credits werden vor dem Prepaid-Guthaben verbraucht, solange das Prepaid-Guthaben über 0 liegt. Mindesteinzahlung 5 USD. Die Credits sammeln sich an und gelten je 12 Monate: **Warten kostet nichts.**

## Zwei Wege, die Gemini-Vorteile zu nutzen (Entscheid und Handgriff beim Besitzer, ich kann nicht bezahlen und keinen Schlüssel anlegen)

**Weg A: kostenlos, ohne Einzahlung (empfohlen für Massenarbeit).** QUELLE Preisseite: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` und die TTS-Modelle haben eine **Gratis-Stufe** («Free of charge» für Ein- und Ausgabe, mit Ratenlimits; die Gratis-Stufe darf Eingaben zur Produktverbesserung nutzen, also **keine Kundendaten** senden, Produktfotos und -titel sind unbedenklich). Argon, Omni Flash und Nano Banana gibt es dort **nicht**.
- Handgriff: in AI Studio ein **neues Projekt ohne Abrechnung** anlegen, dort einen API-Schlüssel erzeugen und als GitHub-Secret `GEMINI_API_KEY_FREI` (oder in der Sitzungsumgebung) setzen. Schlüssel nie in einen Chat oder ins Repo schreiben.
- Dann laufen Übersetzung, Bildprüfung und Texte über Flash-Lite ohne Kosten (Groq bleibt Rückfall). Ratenlimit der Gratis-Stufe: unbekannt, vor dem ersten Lauf auf der Seite «Rate limits» lesen.

**Weg B: Prepaid einzahlen und die Pro-Credits nutzen (nötig für Argon, Omni Flash, Nano Banana).** In AI Studio → Billing 5 USD Prepaid einzahlen, dann auf me.developers.google.com/benefits das Rechnungskonto auswählen; die 8,29 CHF werden zuerst verbraucht. Ob `GEMINI_API_KEY` an diesem Rechnungskonto hängt, ist **unbekannt**. Kosten pro Einheit (QUELLE Preisseite, Standardpreis):
- Nano Banana 2.1: 0,034 USD je 1K-Bild, 0,113 USD je 4K-Bild. Mit 8 CHF rund 240 Bilder in 1K.
- Omni Flash (Video): rund 0,10 USD je Sekunde 720p. Mit 8 CHF rund 80 s Video, also nur wenige Clips; **besser in Flow nutzen (inklusive, siehe unten).**
- Argon: 2 USD / 10 USD je 1 Mio. Token Ein-/Ausgabe bis 30.11., danach das Doppelte. Nur für schwere Denkaufgaben, nicht für Massenarbeit.
- Flash-Lite 3.1: 0,25 / 1,50 USD je 1 Mio. Token (Batch 50 % billiger). Eine Bildprüfung (Bild + kurze Frage + kurze Antwort, rund 1 500 Token) kostet etwa 0,0004 USD, 10 000 Prüfungen rund 4 USD (Rechnung, nicht gemessen).
- Lyria 3.5: 0,08 USD je Song (wird nicht gebraucht: Musikregel des Besitzers, fünf Mixkit-Stücke rotierend).

## Alle Pro-Vorteile und wer sie nutzen kann

| Vorteil | Nutzbar? | Wie |
|---|---|---|
| 5 TB Speicher, Familienfreigabe | ja, kaum Nutzen für den Shop | Optional Sicherung wichtiger Text-Dateien ausserhalb von GitHub (das GitHub-Konto war am 30.08. als Spam markiert); Besitzer entscheidet |
| Gemini-API-Credits 10 USD/Monat | **blockiert (402)** | Weg A oder B oben |
| Google Flow: 1 000 Credits/Monat, Omni Flash, 4K-Upscaling (Pro, QUELLE Tabelle; ob im Konto freigeschaltet: unbekannt) | nur über den Browser | Auftrag an PC-Claude: `dropship/BROWSER-BEFEHL-GOOGLE-AI-PRO-0311.md` |
| Gemini-App: Deep Research, Argon, 1 Mio. Token Kontext | nur über den Browser | gleicher Auftrag, Teil 2 (Marktrecherchen) |
| Gemini Notebook (in der Schweiz verfügbar, QUELLE) | nur Browser | optional: `dropship/` und Preisdaten als Quellen laden; kein Auftrag |
| Colab 200 Rechen-Einheiten, Antigravity, Android Studio, AI Studio | nicht nötig | Der Shop braucht keine Notebooks oder IDE-Agenten |
| Gemini in Gmail/Docs/Sheets/Meet | nur in der Google-Oberfläche | nicht per Werkzeug erreichbar |
| Google Home Premium, YouTube Premium Lite | irrelevant für den Shop | Schweiz-Verfügbarkeit nicht belegt |
| Nur USA/Indien (AI Inbox, Deep Search, Chrome auto browse, Gemini Spark) | in der Schweiz nicht | (QUELLE Google-Seiten) |

## Was ich mit Gratis-Gemini (Weg A) sofort erledigen würde

1. **Schrift auf Produktfotos prüfen** (`dropship/asiat-schrift-bilder-3010/`): 313 von 3 820 geprüften Produkten hatten deutliche Schrift, rund 52 000 Produkte sind ungeprüft. Flash-Lite mit Bildeingabe, Reihenfolge nach Besuchern; Treffer nur auf Entwurf setzen wie am 31.10.
2. **Optionswerte und Texte übersetzen** (Auswahl-Lauf, Text-Pipeline): Gemini zuerst, Groq als Rückfall, der Workflow ist schon so gebaut (`lib/uebersetzen.mjs`).
3. **Bild-Qualitätsprüfung der Social-Fotos** vor dem Einplanen (Auflösung, Personen, Marken im Bild: Fehler der ersten Reel-Muster).

Weg B zusätzlich: Nano Banana für Kategorie-Banner und Reel-Hintergründe (nur mit Sichtprüfung; Texte im Bild immer von Hand prüfen).

## Grenzen

- Nie Prepaid-Geld über die Gutschrift hinaus ausgeben, ohne dass der Besitzer es freigibt. Vor jedem bezahlten Lauf: Stückzahl mal Preis rechnen, Obergrenze setzen, Stichprobe von 20 vorab.
- KI-erzeugte Bilder und Videos in Beiträgen immer als KI-erzeugt kennzeichnen (Regel vom 02.11.); Produkte nie anders zeigen, als sie sind.
