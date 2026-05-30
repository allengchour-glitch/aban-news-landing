# Schreibhandwerk — Begleiter für den KI-Schriftsteller

Du musst kein routinierter Schreiber sein, um gute Bücher zu steuern. Du musst gute
Entscheidungen treffen und gut redigieren. Das Werkzeug (`schreibe_roman.py`,
`roman.json`, `ueberarbeiten.py`) schreibt die Sätze; du legst fest, worum es geht, und
sagst, was besser werden muss. Den makellosen ersten Entwurf gibt es nicht — die KI
liefert den Rohtext, du steckst deine Kraft ins Überarbeiten.

## 1 — Prämisse & Konflikt
Wer will was, und was steht dem im Weg? Ohne Konflikt gibt es nur Ereignisse. Sagst du
den Kern nicht in einem Satz, kann es die KI auch nicht.
**Übung.** Schreib: „[Figur] will [Wunsch], aber [Hindernis], und riskiert [Preis]."
**Im Tool.** `praemisse` und `welt.konflikt` in `roman.json` schärfen.

## 2 — Figuren: Wunsch, Hindernis, Geheimnis, Stimme
Eine Figur lebt durch das, was sie will, was sie aufhält, was sie verbirgt und wie sie
klingt. Das Geheimnis erzeugt Spannung, die Stimme macht sie erkennbar.
**Übung.** Lass drei Figuren „Es tut mir leid" sagen — knapp, umständlich, ausweichend.
**Im Tool.** Die Felder `wunsch`, `geheimnis`, `stimme` je Figur konkret füllen. Das
`geheimnis` bleibt verborgen und schwingt mit.

## 3 — Struktur & Spannungsbogen
Grob drei Akte: Akt 1 stellt Figur und Konflikt auf, Akt 2 verschärft die Lage, Akt 3
führt zur Entscheidung. Jede Einheit ist Szene (Ziel trifft Widerstand) plus Sequel
(reagieren, entscheiden). Ein Cliffhanger am Ende zieht weiter.
**Übung.** Prüfe ein Kapitel: Ziel der Figur? Was hält sie auf? Wie endet die Szene?
**Im Tool.** Jedes `kapitel` hat `ziel` und `beats`. Schreib Beats als Handlung, nicht als
Stimmung; der letzte Beat ist der Cliffhanger.

## 4 — Show, don't tell
Statt ein Gefühl zu benennen, zeig seine Wirkung über Handlung und Sinneseindruck.
„Tell" bleibt fürs Tempo nützlich — die Kunst liegt im Wechsel.
- Vorher: „Mira war nervös, als Caleb hereinkam."
- Nachher: „Caleb trat ein. Mira legte die Feder ab, doch ihre Finger blieben am Pult."
**Übung.** Schreib drei Sätze mit „war traurig / hatte Angst" als Handlung.
**Im Tool.** Die Stilregel steht in `stilregeln`. Beim Überarbeiten gezielt:
`--feedback "Mira ist im Einstieg zu erklärt — zeig die Anspannung am Körper."`

## 5 — Dialog & Subtext
Figuren sagen selten geradeheraus, was sie meinen. Dialog, in dem alle ehrlich reden, ist
tot — Subtext lässt die Leserschaft die Lücke füllen.
**Übung.** Schreib einen Streit, in dem keine Figur sagt, was sie ärgert.
**Im Tool.** Stütz die Stilregel über die `stimme` der Figuren: `--feedback "Renn redet
zu offen — gib ihm Ausweichen statt Geständnis."`

## 6 — Ton, Stil, Perspektive
Ton ist die Grundstimmung, Stil der Satzbau. Personale Perspektive in dritter Person
bleibt dicht an einer Figur und weiß nur, was diese weiß; deutsche Prosa erzählt meist im
Präteritum (er ging, sie sah). Springt sie in fremde Köpfe, bricht die Nähe.
**Übung.** Schreib eine Szene zweimal: in kurzen, harten Sätzen und in langen, atmenden.
**Im Tool.** `ton` und `erzaehlperspektive` in `roman.json` präzise halten — sie steuern
die Prosa. Perspektivbrüche zurückmelden.

## 7 — Überarbeiten: kritisch lesen
Einen Entwurf wie ein Fremder lesen und fragen, ob er hält. Der KI-Rohtext ist Rohstoff;
Gegenlesen plus gezieltes Feedback ist dein Hebel.
**Checkliste (je Punkt: hält / wackelt / fehlt):** (1) Klares Ziel der Figur? (2) Steht
ihr etwas im Weg? (3) Lage am Ende anders? (4) Gefühle gezeigt statt benannt? (5) Stimmen
unterscheidbar? (6) Subtext im Dialog? (7) Perspektive konsistent? (8) Kapitelende zieht?
**Übung.** Forme aus den „wackelt"-Punkten konkrete Sätze — nicht „mach es besser",
sondern „Absatz 3: Dialog zu offen".
**Im Tool.** `python3 ueberarbeiten.py --kapitel 2 --feedback "Mehr Subtext bei Renn"`.
Feedback geht auch über stdin; `--ziel-woerter` steuert die Länge.

## So arbeitest du mit dem KI-Schriftsteller
1. **Idee** — Konflikt in einem Satz (Modul 1).
2. **`roman.json` schärfen** — `praemisse`, `ton`, `erzaehlperspektive`, `stilregeln`,
   `welt`/`konflikt`, `figuren` und `kapitel` (`ziel`/`beats`) konkret füllen. Hier
   liegt dein Haupthebel.
3. **Generieren** — `python3 schreibe_roman.py --kapitel 1`. Das ist ein Entwurf.
4. **Gegenlesen** — mit der Checkliste aus Modul 7.
5. **Überarbeiten lassen** — Feedback an `ueberarbeiten.py`; zwei, drei Runden sind normal.
6. **Plot-Bibel nachziehen** — Neues über Figuren/Welt in `roman.json` eintragen.

Die Skripte halten Kontinuität: frühere Kapitel fließen als Kurzfassung ein.

## Lesen & Üben (Prinzipien, keine Rezepte)
- **Lies laut** — holprige Sätze und schiefer Dialog fallen sofort auf.
- **Schreib täglich kurz** — Übung schlägt Theorie.
- **Studiere Klassiker-Gattungen als Beispiele**: Märchen für klare Konfliktlinien,
  Kriminalgeschichten fürs Setzen und Auflösen von Fragen, das Drama für den Aufbau zum
  Wendepunkt — als Mechanik lesen, nicht als Vorschrift.
- **Überarbeite mehr, als du schreibst** — hier entsteht die Qualität.
