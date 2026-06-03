# Die Aschebund-Trilogie

Dark-Fantasy-Romantasy über Drachen. Originelle Welt, eigenständige Figuren -
gebaut nach den Genre-Mustern erfolgreicher Romantasy (Drachenbindung,
brutale Kriegsakademie, enemies-to-lovers, moralisch grauer Love Interest,
hoher Einsatz, Cliffhanger), aber ohne ein konkretes Werk zu kopieren.

## Die große Idee (USP)

In den meisten Drachengeschichten ist die Bindung eine Ehre. Hier ist sie
ein **Todesurteil mit Aufschub**: Drachen binden sich nur an Menschen, die
bereits im Sterben liegen. Die Bindung hält den Reiter am Leben - aber jeder
Zauber verbrennt Lebenszeit. Ein Drachenreiter weiß auf den Tag genau, wie
lange er noch hat. Romantik unter einer tickenden Uhr; Macht, die dich tötet,
während sie dich rettet.

## Welt (in allen drei Bänden gleich)

- **Reich:** Das Aschekonkordat von Vyr - neun Festungsstädte auf den Klippen
  über dem Aschemeer, einer Wüste aus erkalteter Drachenglut.
- **Magie (das Glutband):** Wer im Sterben liegt, kann von einem Drachen
  "entzündet" werden. Reiter und Drache teilen Herzschlag und Erinnerungen.
  Jeder Zauber kostet messbare Lebenszeit ("Asche"). Mächtige Reiter sind
  oft jung gealtert - mit zwanzig schon graues Haar.
- **Die Akademie Korvath:** Wohin Sterbende gebracht werden, in der Hoffnung,
  entzündet zu werden. Wer es nicht wird, stirbt. Wer es wird, geht in den
  Krieg. Brutale Ausbildung, hohe Sterblichkeit.
- **Der Konflikt:** Das Konkordat führt seit Generationen Krieg gegen die
  Sturmfürsten jenseits des Aschemeers. Aber der wahre Feind ist eine
  verschwiegene Wahrheit: Die Drachen sterben aus, weil das Konkordat sie
  benutzt - und der Krieg wird nur geführt, um diese Wahrheit zu begraben.

## Hauptfiguren (Bogen über die Trilogie)

- **Sayra Vael** - Protagonistin. Mit einer unheilbaren Krankheit zur
  Akademie gebracht; wird gegen jede Erwartung entzündet - von einem Drachen,
  der eigentlich keinen Reiter mehr nehmen sollte. Klug, störrisch, mit einem
  Gedächtnis, das nichts vergisst.
- **Drache Kaelith** - uralt, zynisch, todmüde. Hat schon viele Reiter
  überlebt und betrauert. Will eigentlich sterben. Bindet sich an Sayra fast
  gegen seinen Willen.
- **Renkar Stahl** - Ausbildungsoffizier, moralisch grau. Hart, verschlossen,
  loyal zum Konkordat - bis er Sayra begegnet. Der Love Interest:
  enemies-to-lovers, langsam brennend.
- **Tamsin** - Sayras Mitschülerin und einzige echte Freundin; bringt Wärme
  und Verlust in die Geschichte.
- **Hochmarschall Olvenne** - Antagonistin. Hält das Geheimnis um die Drachen.
  Überzeugt, dass die Lüge das Reich rettet.

## Die drei Bände

1. **Band 1 - Glut** (`roman-drachen-band1.json`): Sayras Ankunft, Entzündung,
   Ausbildung, erste Liebe, die erste Enthüllung. Endet mit dem Verrat, der
   alles verändert.
2. **Band 2 - Asche** (`roman-drachen-band2.json`): Krieg, Flucht, die ganze
   Wahrheit über die sterbenden Drachen; Sayra wird zur Gejagten; die Liebe
   wird auf die Probe gestellt; ein Verlust, der schmerzt.
3. **Band 3 - Sturm** (`roman-drachen-band3.json`): Aufstand gegen das
   Konkordat, der letzte Drachenflug, ein Opfer, ein Ende mit Preis -
   bittersüß, verdient, kein billiges Happy End.

## So schreibst du die Trilogie

Pro Band ist eine `roman.json` vorbereitet. Für ~1000+ Seiten brauchst du pro
Band rund 45-55 Kapitel a ~1500-1800 Woerter. Die mitgelieferten Bände haben
je einen ausgearbeiteten Kapitel-Auftakt; mit `plane_kapitel.py` fuellst du
auf die volle Kapitelzahl auf, mit `schreibe_roman.py` schreibst du, mit
`lektor.py` / `zweitmeinung.py` redigierst du, mit `buch_bauen.py` baust du
das ePub.

```bash
cd ki-schriftsteller
export ANTHROPIC_API_KEY="sk-ant-..."
# Band 1 auf volle Laenge planen (z.B. 50 Kapitel):
python3 plane_kapitel.py --roman drachen/roman-drachen-band1.json --anzahl 45 --schreiben
# schreiben:
python3 schreibe_roman.py --roman drachen/roman-drachen-band1.json --out drachen/kapitel-band1
# zusammenbauen:
python3 buch_bauen.py --roman drachen/roman-drachen-band1.json --kapitel-dir drachen/kapitel-band1
```

**Ehrlich:** 1000+ Seiten sind sehr viel Generierung (viele API-Aufrufe,
echte Kosten) und brauchen Ueberarbeitung. Das Tool liefert einen starken
Rohling - der Feinschliff bleibt deine Arbeit.
