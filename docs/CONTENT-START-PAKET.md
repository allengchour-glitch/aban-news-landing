# Content-Start-Paket — fertig zum Abschicken

> Copy-paste-Texte in Aban-Voice (anti-hype, du-Form), damit du sofort veröffentlichen
> kannst — ohne Kundenkontakt, ohne KI-Key. Reihenfolge: 1 Launch-Newsletter, dann
> 1–2 Social-Posts pro Woche. Vor dem Posten kurz quer­lesen und an deine Stimme anpassen.
> Voice-Check optional: `python3 tools/brand-voice-linter.py DATEI.md --strict`.

---

## 1. Launch-Newsletter

**Betreff:** Dein Stundensatz ist wahrscheinlich zu niedrig — hier rechnest du es nach

**Vorschau-Text:** Drei Rechner für Selbstständige, ganz ohne Tracking.

---

Hi,

kurze Frage: Weißt du, was deine Arbeitsstunde wirklich kosten muss?

Die meisten rechnen Wunschgehalt geteilt durch 160 Stunden — und liegen damit deutlich
daneben. Denn nur ein Teil deiner Zeit ist verrechenbar, und Steuern plus Betriebskosten
fehlen in der Rechnung.

Deshalb habe ich drei kleine Rechner gebaut, die im Browser laufen — nichts wird gesendet
oder gespeichert:

- **Stundensatz:** rückwärts gerechnet, mit realistisch verrechenbaren Stunden.
- **Steuer-Rücklage:** wie viel du von jeder Einnahme sofort zur Seite legst.
- **Puffer:** wie lange du ohne Einnahmen durchhältst.

→ Hier ausprobieren: abannews.com/finanz-rechner

Wenn du die Grundlagen lieber in Ruhe nachliest, habe ich sie hier zusammengefasst
(inklusive Gratis-Spickzettel als PDF): abannews.com/finanz-skills

Bis bald,
Aban

---

## 2. LinkedIn-/Social-Posts (1–2 pro Woche)

### Post A — der Stundensatz-Fehler
Der teuerste Fehler von Selbstständigen: Wunschgehalt ÷ 160 Stunden = Stundensatz.

Falsch. Nur 4–6 Stunden pro Tag sind verrechenbar — Akquise, Angebote und Buchhaltung
zahlt niemand direkt. Und Steuern fehlen auch noch.

Rechne rückwärts: Ziel-Netto + Steuern + Kosten, geteilt durch deine echten fakturierbaren
Stunden. Oft kommt da ein Drittel mehr raus als gedacht.

Nachrechnen (im Browser, kein Tracking): abannews.com/finanz-rechner

#Selbstständigkeit #Freelancing

### Post B — die Steuer-Rücklage
Ein einfacher Trick gegen die böseste Überraschung als Selbstständiger:

Leg von jeder Einnahme am Tag des Eingangs einen festen Anteil auf ein getrenntes Konto.
Grober Richtwert: 30–40 %.

Dann ist die Steuernachzahlung ein Nicht-Ereignis statt ein Schock. Klingt banal, rettet
aber mehr Existenzen als jeder Steuertipp.

#Steuern #Selbstständigkeit

### Post C — der Puffer (CH-Bezug)
Als Selbstständiger in der Schweiz zahlst du keine Arbeitslosenversicherung.

Heißt: Wenn drei Monate kein Auftrag kommt, fängt dich niemand auf — außer deinem Puffer.

3–6 Monate Fixkosten auf einem getrennten Konto sind kein Luxus. Sie sind der Unterschied
zwischen „ich kann Nein sagen" und „ich nehme jeden Auftrag zu jedem Preis".

#Selbstständigkeit #Finanzen

### Post D — Automatisierung ehrlich
„Automatisier doch einfach!" Klingt leicht, ist es selten.

Ein Automatisierungs-Tool spart erst Zeit, wenn der Prozess dahinter sauber durchdacht ist
— sonst automatisierst du nur das Chaos schneller. Und bei personenbezogenen Daten zählt,
wo das Tool hostet.

Ich habe 36 Tools ehrlich verglichen, mit EU-Hosting-Filter für den DACH-Raum:
automatisierung.abannews.com

#Automatisierung #KMU

### Post E — die Build-Falle (persönlich)
Eine ehrliche Lektion aus den letzten Wochen:

Ich habe viel gebaut — Tools, Vergleiche, Rechner. Bauen fühlt sich produktiv an und ist
sicher. Aber gebaut zu haben bringt noch keinen Franken.

Der unbequeme Teil ist: sichtbar werden. Veröffentlichen, statt im Stillen weiterzubauen.
Daran arbeite ich gerade.

#Aufbau #Lernen

---

## 3. So nutzt du das Paket
- **Newsletter:** Text 1 in beehiiv einfügen, Links prüfen, senden.
- **Social:** pro Woche 1–2 Posts (A–E), je in eigenen Worten leicht anpassen.
- **Nachschub automatisieren (optional):** mit gesetztem `ANTHROPIC_API_KEY`
  `cd automatisierung-radar && python3 ai/ki_helfer.py content --typ social` —
  liefert neue Entwürfe aus den echten Tool-Daten.
- **Regel:** lieber regelmäßig eine kleine Sache posten als selten eine große.
