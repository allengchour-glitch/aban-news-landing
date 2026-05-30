# Schreibhandwerk — Selbstlern-Begleiter für den KI-Schriftsteller

Du musst kein routinierter Schreiber sein, um gute Bücher entstehen zu lassen.
Du musst gute Entscheidungen treffen und gut redigieren. Der KI-Schriftsteller
(siehe `schreibe_roman.py`, `roman.json`, `ueberarbeiten.py`) schreibt die Sätze.
Deine Aufgabe ist eine andere: Du legst fest, worum es geht, du erkennst, ob ein
Kapitel trägt, und du sagst, was besser werden muss. Genau das lässt sich lernen.

Dieser Leitfaden ist Werkstatt, nicht Vorlesung. Jedes Modul erklärt kurz die
Sache, sagt warum sie zählt, gibt dir ein oder zwei Übungen und zeigt, wie du das
Gelernte in `roman.json` oder beim Generieren einsetzt. Arbeite die Module in
Ruhe durch. Eine Übung pro Tag reicht.

Eine Vorbemerkung zum Anspruch: Es gibt keinen makellosen ersten Entwurf. Auch
geübte Autorinnen schreiben schwache Rohfassungen und retten sie beim Überarbeiten.
Mach dir das zunutze. Lass die KI den Entwurf liefern und stecke deine Energie in
die Überarbeitung — dort entscheidet sich die Qualität.

---

## Modul 1 — Prämisse & Konflikt

**Worum geht's.** Die Prämisse ist der Kern deiner Geschichte in ein, zwei Sätzen:
Wer will was, und was steht dem im Weg? Ohne einen echten Konflikt gibt es keine
Geschichte, nur eine Abfolge von Ereignissen.

**Warum wichtig.** Wenn du den Konflikt nicht in einem Satz sagen kannst, kann es
die KI auch nicht. Ein unscharfer Kern führt zu Kapiteln, die hübsch klingen, aber
ins Leere laufen. Der Konflikt ist der Motor — er zwingt Figuren zu Entscheidungen.

**Übung 1.** Schreibe deine Geschichte in einem Satz nach dem Muster:
„[Figur] will [Wunsch], aber [Hindernis], und steht vor [Preis]." Streiche jedes
Adjektiv, das nicht nötig ist. Bleibt der Satz spannend?

**Übung 2.** Nimm drei Bücher oder Filme, die du kennst, und schreibe ihren Konflikt
in je einem Satz auf. Du trainierst damit, das Wesentliche von der Verzierung zu
trennen.

**So wendest du es im Tool an.** Das Feld `praemisse` in `roman.json` ist genau
dieser eine Satz. Der `konflikt` unter `welt` benennt das große Hindernis. Schärfe
beides, bevor du ein Kapitel generierst. Beispiel aus der mitgelieferten Datei: Der
Konflikt — der Hohe Rat will das kollektive Vergessen auslösen, Mira hält den letzten
Beweis — sagt sofort, wer gegen wen steht und worum es geht.

---

## Modul 2 — Figuren: Wunsch, Hindernis, Geheimnis, Stimme

**Worum geht's.** Eine Figur lebt durch vier Dinge: Was sie **will** (Wunsch),
was ihr im **Weg** steht, was sie **verbirgt** (Geheimnis) und wie sie **klingt**
(Stimme). Diese vier Achsen machen aus einem Namen einen Menschen.

**Warum wichtig.** Leser folgen Figuren, nicht Schauplätzen. Ein klarer Wunsch
treibt Handlung an. Ein Geheimnis erzeugt Spannung unter der Oberfläche. Eine
eigene Stimme sorgt dafür, dass man Figuren auch ohne Namensnennung erkennt.

**Übung 1.** Wähle eine Figur und fülle vier Zeilen aus: Wunsch, Hindernis,
Geheimnis, Stimme (drei Stichworte, wie sie spricht). Wenn zwei Figuren dieselbe
Stimme haben, hast du erst eine Figur.

**Übung 2.** Schreibe denselben kurzen Satz „Es tut mir leid" für drei deiner
Figuren — so, dass man hört, wer spricht. Eine sagt es knapp, eine umständlich,
eine ausweichend. Das ist Stimme.

**So wendest du es im Tool an.** Im Block `figuren` in `roman.json` hat jede Figur
genau die Felder `wunsch`, `geheimnis` und `stimme`. Fülle sie konkret aus. Vage
Einträge erzeugen vage Figuren. Das `geheimnis` bleibt der Leserschaft verborgen und
gibt der KI etwas, das unter den Szenen mitschwingt, ohne ausgesprochen zu werden.

---

## Modul 3 — Struktur & Spannungsbogen

**Worum geht's.** Die grobe Drei-Akt-Form: Akt 1 stellt Figur und Konflikt auf und
endet mit einem Ereignis, das kein Zurück mehr erlaubt. Akt 2 verschärft die Lage,
die Figur scheitert und lernt. Akt 3 führt zur Entscheidung und Auflösung. Innerhalb
davon arbeitet jede Einheit als **Szene** (Figur verfolgt ein Ziel, stößt auf
Widerstand) und **Sequel** (sie reagiert, fühlt, entscheidet das Nächste).

**Warum wichtig.** Struktur ist kein Korsett, sondern verhindert Durchhänger. Wenn
du weißt, an welchem Punkt des Bogens ein Kapitel steht, kannst du beurteilen, ob es
genug Druck aufbaut. Ein **Cliffhanger** am Kapitelende — eine offene Frage, eine
Wendung, eine Drohung — zieht die Leserschaft weiter.

**Übung 1.** Teile deine Geschichte in drei Akte und schreibe für jeden den
Wendepunkt am Ende auf. Drei Sätze genügen.

**Übung 2.** Nimm ein Kapitel und prüfe: Was ist das Ziel der Hauptfigur in dieser
Szene? Was hält sie auf? Womit endet die Szene — Sieg, Niederlage oder neue
Komplikation? Wenn du keine dieser Fragen beantworten kannst, fehlt der Szene ein
Rückgrat.

**So wendest du es im Tool an.** Jeder Eintrag unter `kapitel` in `roman.json` hat
ein `ziel` und konkrete `beats`. Schreibe die Beats als Handlungsschritte, nicht als
Stimmungen — „Mira konfrontiert Caleb" statt „Es wird düster". Der letzte Beat ist
dein Cliffhanger; die Stilregel „Jedes Kapitel endet mit einer offenen Spannung"
greift genau hier. Je konkreter die Beats, desto gezielter das Kapitel.

---

## Modul 4 — Show, don't tell

**Worum geht's.** Statt ein Gefühl zu benennen, zeige seine Wirkung: Handlung,
Körper, Sinneseindruck, gesprochenes Wort. Die Leserschaft soll schließen, nicht
belehrt werden.

**Warum wichtig.** Benannte Gefühle lassen den Leser kalt; gezeigte Gefühle erlebt
er mit. „Tell" ist trotzdem nicht verboten — für Tempo und Übergänge ist es nützlich.
Die Kunst liegt im Wechsel.

**Vorher/Nachher.**

- Vorher: „Mira war nervös, als Caleb hereinkam."
- Nachher: „Caleb trat ein. Mira legte die Feder ab, doch ihre Finger blieben am
  Rand des Pults liegen, als müssten sie sich festhalten."

- Vorher: „Renn war wütend."
- Nachher: „Renn sagte nichts. Er drehte den Aschestein in der Hand, einmal, zweimal,
  und legte ihn dann so behutsam ab, dass es lauter wirkte als ein Fluch."

**Übung.** Suche in einem generierten Kapitel drei Sätze, die ein Gefühl benennen
(„war traurig", „freute sich", „hatte Angst"). Schreibe jeden so um, dass das Gefühl
nur über Handlung oder Sinneseindruck sichtbar wird.

**So wendest du es im Tool an.** Die Stilregel „Zeige durch Handlung und
Sinneseindruck, statt Gefühle zu benennen" steht schon in `stilregeln`. Beim
Überarbeiten gibst du gezieltes Feedback, etwa: `--feedback "Mira ist im ersten
Absatz zu erklärt — zeig ihre Anspannung über Körper und Handlung."`

---

## Modul 5 — Dialog & Subtext

**Worum geht's.** Guter Dialog klingt nicht wie ein Protokoll. Figuren sagen selten
geradeheraus, was sie meinen. Unter den Worten liegt **Subtext**: das eigentliche
Anliegen, der Druck, das Verschwiegene.

**Warum wichtig.** Dialog, in dem alle ehrlich und vollständig reden, ist tot. Subtext
erzeugt Spannung, weil die Leserschaft die Lücke zwischen Gesagtem und Gemeintem
selbst füllt. Dialog charakterisiert außerdem schneller als jede Beschreibung.

**Übung 1.** Schreibe einen kurzen Streit zwischen zwei Figuren, in dem das Wort
„Streit" nie fällt und keine der beiden direkt sagt, was sie ärgert. Lass sie über
etwas Belangloses reden, während der Konflikt darunter brodelt.

**Übung 2.** Streiche aus einem Dialog jedes „sagte wütend", „antwortete traurig".
Lass Haltung, Pause und Wortwahl die Emotion tragen. Prüfe, ob es noch funktioniert.

**So wendest du es im Tool an.** Die Stilregel „Dialoge tragen Subtext — Figuren
sagen selten direkt, was sie meinen" steht in `roman.json`. Stütze sie über die
`stimme` jeder Figur: Calebs „salbungsvoll, väterlich" und Renns „knapp, sarkastisch"
geben der KI den Ton vor. Wirkt ein Dialog zu glatt, überarbeite gezielt:
`--feedback "Renn redet zu offen — gib ihm Ausweichen und Sarkasmus statt Geständnis."`

---

## Modul 6 — Ton, Stil, Perspektive

**Worum geht's.** Ton ist die Grundstimmung (nüchtern, getragen, ironisch). Stil ist
die Art der Sätze (kurz und hart, oder lang und atmend). Perspektive klärt, wer
erzählt: Bei der **personalen Perspektive** in dritter Person bleibt die Erzählung
dicht an einer Figur und weiß nur, was diese weiß. Im Deutschen erzählt Prosa meist
im **Präteritum** (er ging, sie sah).

**Warum wichtig.** Eine konsistente Perspektive ist ein Vertrauensvertrag mit der
Leserschaft. Springt die Erzählung unmotiviert in fremde Köpfe, geht Nähe verloren.
Ton und Satzrhythmus sollten zur Szene passen — kurze Sätze in der Gewalt, lange in
der Ruhe.

**Übung 1.** Schreibe eine halbe Seite streng aus der Sicht einer Figur: nur, was
sie sieht, hört, denkt. Kein Wissen, das sie nicht haben kann. Wo rutschst du raus?

**Übung 2.** Schreibe dieselbe Szene einmal in kurzen, harten Sätzen und einmal in
langen, atmenden. Spüre, wie der Rhythmus die Wirkung ändert.

**So wendest du es im Tool an.** Die Felder `ton` und `erzaehlperspektive` in
`roman.json` legen das fest — in der Beispieldatei „Dritte Person, personal, dicht an
Miras Innenleben. Präteritum." Halte diese Felder präzise; sie steuern die gesamte
Prosa. Findest du beim Gegenlesen einen Perspektivbruch, melde ihn beim Überarbeiten
konkret zurück.

---

## Modul 7 — Überarbeiten: ein Kapitel kritisch lesen

**Worum geht's.** Überarbeiten heißt, einen Entwurf wie ein Fremder zu lesen und zu
fragen, ob er hält. Das ist eine eigene Fähigkeit — und die wichtigste für dich, weil
hier deine Kontrolle über die KI greift.

**Warum wichtig.** Die erste Fassung der KI ist ein Rohstoff, nicht das Ziel. Wer
gut gegenliest und gezielt Feedback gibt, holt aus demselben Werkzeug ein deutlich
besseres Buch.

**Craft-Checkliste (lies jedes Kapitel dagegen).**

1. **Ziel klar?** Verfolgt die Hauptfigur in der Szene ein erkennbares Ziel?
2. **Konflikt da?** Steht ihr etwas im Weg, oder läuft alles glatt durch?
3. **Bewegt es die Geschichte?** Ist die Lage am Ende anders als am Anfang?
4. **Show statt Tell?** Werden Gefühle gezeigt oder bloß benannt?
5. **Stimmen unterscheidbar?** Klingt jede Figur nach sich selbst?
6. **Subtext im Dialog?** Sagen Figuren weniger, als sie meinen?
7. **Perspektive konsistent?** Bleibt die Erzählung in einem Kopf?
8. **Tempo stimmig?** Satzlänge und Rhythmus passend zur Szene?
9. **Kapitelende zieht?** Offene Spannung, Frage oder Wendung am Schluss?
10. **Klischees raus?** Abgegriffene Bilder und Füllsätze gestrichen?

Markiere zu jedem Punkt: hält / wackelt / fehlt. Die „wackelt"- und „fehlt"-Punkte
werden dein Feedback.

**Übung.** Lies ein generiertes Kapitel mit der Checkliste und notiere zu jeder Zeile
ein Stichwort. Forme daraus zwei, drei konkrete Sätze Feedback — kein „mach es besser",
sondern „Absatz 3: Dialog zu offen, gib Renn Subtext".

**So wendest du es im Tool an.** `ueberarbeiten.py` nimmt genau dieses Feedback:
`python3 ueberarbeiten.py --kapitel 2 --feedback "Mehr Subtext in Renns Dialog;
Einstieg straffen."` Du kannst Feedback auch über stdin einleiten oder mit
`--ziel-woerter` die Länge steuern. Je genauer dein Hinweis, desto gezielter die neue
Fassung.

---

## So arbeitest du mit dem KI-Schriftsteller

Ein verlässlicher Ablauf, von der Idee zum überarbeiteten Kapitel:

1. **Idee festhalten.** Schreib den Konflikt in einem Satz auf (Modul 1). Wenn der
   Satz nicht trägt, trägt das Buch noch nicht.
2. **`roman.json` schärfen.** Fülle `praemisse`, `ton`, `erzaehlperspektive`,
   `stilregeln`, `welt`/`konflikt` und die `figuren` mit `wunsch`/`geheimnis`/`stimme`
   konkret aus. Plane die `kapitel` mit klarem `ziel` und handfesten `beats`. Diese
   Datei ist deine Plot-Bibel — fast jede Entscheidung triffst du hier, nicht im Text.
3. **Kapitel generieren.** Lass `schreibe_roman.py` schreiben, etwa
   `python3 schreibe_roman.py --kapitel 1`. Behandle das Ergebnis als Entwurf.
4. **Gegenlesen mit der Craft-Checkliste.** Geh das Kapitel mit den zehn Fragen aus
   Modul 7 durch und notiere, was wackelt oder fehlt.
5. **Überarbeiten lassen.** Gib dein Feedback an `ueberarbeiten.py --kapitel N
   --feedback "..."`. Wiederhole gegenlesen und überarbeiten, bis das Kapitel die
   Checkliste besteht. Zwei, drei Runden sind normal.
6. **Plot-Bibel nachziehen.** Was du beim Schreiben über Figuren oder Welt lernst,
   trag in `roman.json` nach, damit die folgenden Kapitel konsistent bleiben.

Zum übrigen Werkzeug im Ordner: Die README erklärt Installation und Aufrufe, und die
Skripte halten Kontinuität, indem frühere Kapitel als Kurzfassung in den nächsten
Aufruf einfließen. Generierte Kapitel landen in `kapitel/` und sind Entwürfe, keine
fertigen Texte.

Merke: Das Werkzeug schreibt schnell. Deine Hebel sind die Plot-Bibel davor und das
Feedback danach. Dort wird aus einem Entwurf ein Buch.

---

## Lese- und Übungsempfehlungen

Keine Geheimrezepte, sondern Prinzipien, die du selbst prüfen kannst:

- **Lies wie ein Handwerker.** Nimm ein Buch deines Genres und frage bei jeder Szene:
  Was will die Figur, was hält sie auf, wie endet die Szene? Du liest dann doppelt —
  als Leser und als Analytiker.
- **Lies laut.** Holprige Sätze, schiefer Rhythmus und falscher Dialog fallen beim
  Vorlesen sofort auf. Mach das mit jedem überarbeiteten Kapitel.
- **Schreib täglich kurz.** Eine halbe Seite reicht. Übung schlägt Theorie. Nutze die
  Übungen aus den Modulen oben als Startpunkte.
- **Sammle starke Anfänge und Enden.** Tippe Kapitelanfänge ab, die dich gepackt haben,
  und frage: Warum zieht das? Du baust dir so ein Gefühl für Spannung.
- **Studiere Klassiker-Gattungen, nicht Rezepte.** Märchen lehren klare Konfliktlinien,
  Kriminalgeschichten lehren das Setzen und Auflösen von Fragen, das klassische Drama
  lehrt den Aufbau zum Wendepunkt. Lies solche Formen als Beispiele für Mechanik, nicht
  als Vorschrift.
- **Hol dir Leser.** Gib ein Kapitel jemandem und frage nur: Wo warst du gelangweilt,
  wo verwirrt? Diese zwei Fragen bringen mehr als allgemeines Lob.
- **Überarbeite mehr, als du schreibst.** Plane für jedes Kapitel mehr Zeit fürs
  Gegenlesen und Schärfen als fürs Generieren. Hier entsteht die Qualität.
