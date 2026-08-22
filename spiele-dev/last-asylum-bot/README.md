# 🦠 Last-Asylum-Bot

Selbstspielender Bildschirm-Bot für **Last Asylum: Plague** (Android, `com.phs.global`).
Er schaut per ADB auf den Bildschirm, erkennt Knöpfe an Bild-Vorlagen (Templates) und tippt
sie an — wie ein Mensch, nur ohne Pause.

**Keine Pflicht-Abhängigkeiten.** Reines Python 3.8+. `numpy` ist optional, macht die
Bildsuche aber ~20× schneller (0,1 s statt 2–5 s pro Suche) → unbedingt installieren.

```bash
pip install numpy        # optional, aber sehr empfohlen
python3 bot.py check     # prüft Konfiguration + Templates, braucht kein Handy
```

---

## 0. Claude einen Bildschirm zeigen

Claude läuft in der Cloud und kommt an diesen PC nicht heran. Statt von Hand
einen Screenshot zu schicken — der unterwegs meist auf ~500 px verkleinert wird
und dann zum Schneiden von Vorlagen unbrauchbar ist — nimmt der Bot ihn selbst
auf und schiebt ihn über das Repository:

```bash
python bot.py teilen --als versammlung
```

Das Bild landet in **voller Auflösung** unter `austausch/` und wird gepusht.
Danach genügt ein „Bild ist da" — Claude liest es aus dem Repository und kann
Knöpfe daraus schneiden. Es werden nur die letzten vier Bilder behalten, damit
das Repository nicht zuläuft.

Vorher im Spiel den Bildschirm hinstellen, um den es geht.

---

## 1. Was der Bot heute schon kann

Diese Templates sind aus echten Screenshots geschnitten und **funktionieren sofort**:

| Bereich | Erkennt | Tut |
|---|---|---|
| Belohnungen | grüner + oranger `Abholen`-Knopf | tippt ihn — **immer**, überall, mit Vorrang vor allem anderen |
| Dialoge | blaues ✖, weisses ✖ | schliesst sie, damit nichts blockiert |
| Erträge | die weissen Blasen über Farmen, Sägewerken, Kräuterhütten | sammelt sie reihum ein |
| Rundgang | — | schwenkt die Kamera über die ganze Basis und erntet nach jedem Schwenk ab |
| Bauen | den Bau-Vorschlag des Spiels, `Upgrade`-Knopf, `Upgrade`-Bestätigung | wertet auf, ohne Diamanten zu verbrennen |
| Truppe 1 | `Upgrade`-Reiter und `Verbessern` im Ausrüstungs-Dialog | zieht die Ausrüstung hoch, mehrfach pro Durchgang |
| Allianz | gelber Hilfe-Knopf, Allianz-Menü, Chat-Reiter | gibt Hilfe, holt Truhen, schreibt Admin-Nachrichten |
| Zuflucht | Kräuter, Geschenk-Blasen, Offline-Einnahmen, Angriffs-Zähler | erntet alles ab |
| Navigation | Burg, Welt, Startseite, Held, Allianz, Nachricht, Tasche, Tagesziele, Heilen, Lupe | wechselt zwischen den Bildschirmen |
| Events | „Wertvolles Event", „Spezielles Event" | öffnet sie und holt die Belohnungen |
| Sammeln | Lupe, Reiter `Sammeln`, Bauernhof, `Suchen`, `Versammeln` | schickt alle 10 Minuten bis zu vier Trupps los — je einen pro Marsch-Platz |
| Expedition | `Herausforderung`, `Kampf`, `Zurück` im Wachturm | spielt den Expeditionskampf allein durch |
| Taverne | `Rekrutieren` im Gebäude-Menü | nimmt den Gratis-Zug mit |

Dazu kommen drei Erkenner, die **ohne** exakte Vorlage arbeiten (Abschnitt 4): grüne Knöpfe an
der Farbe, rote Punkte als Belohnungs-Hinweis, und Schwellen, die er aus echten Läufen selbst
nachjustiert.

Offen ist im Wesentlichen noch das Schild-Setzen. `python3 bot.py check` listet auf, welche
Ausschnitte fehlen; bis dahin überspringt der Bot die betroffenen Schritte still.

---

## 2. Einrichten

### Windows: ein Befehl

```powershell
git clone --branch claude/last-asylum-android-bot-mi4cvn --single-branch `
  https://github.com/allengchour-glitch/aban-news-landing.git
cd aban-news-landing\spiele-dev\last-asylum-bot
powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
```

Das Skript sucht Python, installiert `numpy`, prüft die Konfiguration, findet `adb.exe`
(PATH, `C:\platform-tools`, Android-SDK) — **und lädt es bei Google herunter, wenn es fehlt** —,
verbindet Handy oder Emulator und startet einen **Trockenlauf**.
Sieht das Protokoll gut aus:

```powershell
.\start-windows.ps1 -Scharf              # 60 Minuten, tippt wirklich
.\start-windows.ps1 -Scharf -Minuten 180 # 3 Stunden
.\start-windows.ps1 -NurPruefen          # nur Konfiguration, kein Handy nötig
```

### Einmal einrichten, danach nie wieder tippen

```powershell
powershell -ExecutionPolicy Bypass -File .\autostart-einrichten.ps1 -Jetzt
```

Legt eine Startdatei im **Autostart-Ordner** an — dafür braucht es *keine* Administratorrechte.
Der Bot läuft danach ab jeder Anmeldung (drei Minuten Verzögerung, damit BlueStacks zuerst
hochkommt), ohne Zeitlimit, und beginnt nach einem Absturz nach einer Minute von vorn.
`-Jetzt` startet ihn zusätzlich sofort in einem eigenen Fenster.

Wer lieber die Windows-Aufgabenplanung nutzt: `-Aufgabenplanung` — das verlangt allerdings eine
PowerShell „Als Administrator ausführen", sonst kommt *Zugriff verweigert*.

| | |
|---|---|
| Anhalten | `New-Item STOP` im Bot-Ordner — er beendet sich beim nächsten Durchlauf |
| Weiterlaufen | Datei `STOP` wieder löschen |
| Ganz entfernen | `.\autostart-einrichten.ps1 -Entfernen` |

BlueStacks muss laufen und Last Asylum offen sein; deshalb die drei Minuten Verzögerung nach der
Anmeldung. Trägt BlueStacks sich selbst in den Autostart ein, passt das zusammen.

### BlueStacks statt Handy

Geht genauso — und ist bequemer, weil der PC durchlaufen kann, ohne dass dein Handy blockiert ist.

1. **Einstellungen → Erweitert → „Android Debug Bridge (ADB)"** einschalten.
2. **Einstellungen → Display → Bildschirmauflösung** von `Querformat` auf **`Hochformat`**
   umstellen und **1440 × 2560** wählen. Pixeldichte auf **240 DPI** lassen.
3. **Änderungen speichern** und BlueStacks **neu starten** — beides greift erst danach.
4. Last Asylum öffnen, dann `start-windows.ps1` starten. Das Skript verbindet sich selbst
   (liest den ADB-Port aus `bluestacks.conf`, probiert die üblichen Ports von LDPlayer, MEmu
   und Nox mit und wählt ein Gerät aus, falls sich BlueStacks doppelt meldet).

**Warum ausgerechnet 1440 × 2560?** Weil die Breite exakt der `base_width` der Templates
entspricht — die Bild-Vorlagen müssen dann gar nicht skaliert werden, das ist der genaueste
Fall. Beim Start meldet der Bot nichts über Skalierung; steht dort „Templates werden skaliert",
passt die Breite nicht.

Das Seitenverhältnis ist mit 16:9 flacher als das Handy (1440 × 3088). Die Bild-Vorlagen stört
das nicht, sie werden an ihrem Aussehen erkannt, nicht an der Position. Nur die Regionsangaben
(„unten rechts", „obere Leiste") sind etwas grosszügiger nötig — die vorhandenen sind es.
1080 × 1920 geht auch, dann skaliert der Bot auf 0,75.

Von Hand geht es auch:

```powershell
C:\platform-tools\adb.exe connect 127.0.0.1:5555   # Port steht in den BlueStacks-Einstellungen
python bot.py devices
```

### Von Hand (alle Systeme)

1. **Android-Platform-Tools** installieren (`adb` muss im PATH sein) —
   [developer.android.com/tools/releases/platform-tools](https://developer.android.com/tools/releases/platform-tools)
2. Am Handy: *Entwickleroptionen* → **USB-Debugging** an. Per Kabel anstecken und die
   Abfrage „Diesem Computer vertrauen?" bestätigen.
   *Kabellos:* `adb tcpip 5555` (einmal am Kabel), dann `adb connect <handy-ip>:5555`.
   *Emulator* (LDPlayer/BlueStacks/MEmu) geht genauso — meist `adb connect 127.0.0.1:5555`.
3. Prüfen:
   ```bash
   python3 bot.py devices     # muss eine Seriennummer zeigen
   python3 bot.py package     # zeigt das Paket der App im Vordergrund
   ```
4. Losfahren — **erst im Trockenlauf**, da wird nichts angetippt:
   ```bash
   python3 bot.py run --dry-run --minutes 5 --log-level debug
   ```
5. Wenn das Protokoll sinnvoll aussieht, scharf schalten:
   ```bash
   python3 bot.py run --minutes 60
   ```

**Anhalten:** `Strg+C`, oder eine Datei namens `STOP` neben `bot.py` legen
(`touch STOP`) — der Bot beendet sich beim nächsten Durchlauf von selbst.

---

## 3. Templates selbst schneiden

Ein Template ist ein kleiner PNG-Ausschnitt eines Knopfes. So legst du einen an:

```bash
# 1. Screenshot mit Koordinaten-Raster holen (dünne Linie alle 100 px, kräftige alle 500 px)
python3 bot.py capture --raster -o shots/menue.png

# 2. Ausschnitt am Raster ablesen und schneiden (links,oben,rechts,unten)
python3 bot.py crop shots/menue.png --box 1063,1352,1355,1448 -o templates/ui/btn_abholen.png

# 3. Prüfen, ob er zuverlässig gefunden wird
python3 bot.py find templates/ui/btn_abholen.png --image shots/menue.png --threshold 0.8
```

**Faustregeln**

* Nur den Knopf einfassen, keinen wechselnden Text und keine Zahlen (Timer!) mitschneiden.
* Mindestens ~40×40 px, mit etwas Kontrast — einfarbige Flächen findet niemand wieder.
* Der Vergleich läuft in Graustufen. Ähnliche Knöpfe unterscheiden sich trotzdem deutlich:
  `Abholen` (grün) trifft mit **1.00**, das graue `Abgeholt` nur mit **0.62** — Schwelle 0.85 trennt sauber.
* Schwellenwert: 0.85–0.88 ist der Normalfall. Zu viele Fehltreffer → höher. Wird nichts
  gefunden → mit `bot.py find --threshold 0.6` messen, was tatsächlich herauskommt.
* Templates aus einem **1440 px breiten** Screenshot passen auch auf andere Auflösungen —
  `base_width` in der Konfiguration sorgt für die Umrechnung.

### Die offene Liste

Diese Vorlagen fehlen **im Repository**; die zugehörigen Schritte ruhen still, bis sie da sind.
Achtung: am PC können welche liegen, die hier nie ankamen — der Bot sichert `templates/`
inzwischen bei jedem Lebenszeichen mit, damit genau das nicht mehr passiert. Was der laufende
Bot wirklich vermisst, steht als `vorlagen_offen` in `austausch/lauf.json`.

| Priorität | Template | Wo abschneiden |
|---|---|---|
| ★★★ | `allianz/beitreten.png` | der blaue **Beitreten**-Knopf einer offenen Versammlung. Wichtigste Lücke überhaupt: eine Versammlung steht nur etwa eine Minute offen, und ohne diese Vorlage greift die Sofort-Regel nie |
| ★★★ | `allianz/versammlung_liste.png`, `allianz/versammlung_offen.png` | Allianz → Versammlung: die Liste selbst und der Eintrag einer offenen Versammlung |
| ★★★ | `hud/schild_aktiv.png` | Schild-Symbol im HUD, **während ein Schutzschild läuft** — erst danach darf die Schild-Aufgabe an (siehe unten) |
| ★★★ | `ui/btn_alles_abholen.png` | der orange `Alles abholen` im Beute-Fenster — räumt eine ganze Kiste auf einmal ab |
| ★★★ | `kaserne/gebaeude.png`, `kaserne/ausbilden_menue.png`, `kaserne/stufe_t8.png`, `kaserne/btn_ausbilden.png`, `ui/btn_max.png` | Kaserne → Ausbilden → **T8** wählen → Menge auf Maximum. Schneide wirklich die T8-Kachel, sonst trainiert er irgendeine Stufe |
| ★★☆ | `sammeln/reiter_monster.png`, `sammeln/angreifen.png` | Weltkarte → Lupe → Reiter `Ressourcen-Monster` und der Angriffs-Knopf |
| ★★☆ | `kampf/kiste_fremd.png`, `kampf/wagen_fremd.png` | Kiste und Wagen auf **gegnerischen** Servern — nur dort wird geplündert |
| ★★☆ | `held/team1.png` | Helden-Menü, Auswahl von Team 1 |
| ★★☆ | `chat/oeffnen.png`, `chat/teilen_marker.png`, `sammeln/ausgraben.png` | geteilte Schatz-Koordinaten im Allianz-Chat: der Chat-Einstieg, die `Teilen`-Zeile mit der grünen Ortsmarke, und der Ausgraben-Knopf auf der Karte |
| ★★☆ | `allianz/forschung.png`, `allianz/tech_empfehlung.png`, `allianz/spenden_ressourcen.png`, `allianz/spenden_diamant.png` | Allianz → Allianz-Forschung → Technologie: der **blaue** Spenden-Knopf (aktiv, nicht ausgegraut), die Empfehlung und der Diamant-Spenden-Knopf |
| ★☆☆ | `nav/chat.png`, `nav/zuflucht.png` | Einstiege, die der Bot noch nicht selbst findet |
| ★☆☆ | `falkenturm/schnelle_ausfuehrung.png` | Falkenturm, Knopf `Schnelle Ausführung` |
| ★☆☆ | `forschung/empfehlung.png`, `ui/btn_forschen.png` | Forschungszentrum |
| ★☆☆ | `ui/ad_close.png`, `ui/reconnect.png`, `hud/bau_fertig.png` | Werbe-✖, Verbindungsabbruch, fertige Produktion |
| ★☆☆ | `ui/btn_heilen.png` | Lazarett |

### ⚠ Die Schild-Aufgabe ist absichtlich AUS

`schild-pruefen` steht auf `"enabled": false`. Grund: ohne `hud/schild_aktiv.png` kann der Bot
nicht sehen, ob schon ein Schild läuft — er würde bei jedem Durchlauf ein neues verbrauchen und
deinen Vorrat (3× 8 h, 2× 12 h) in einem Nachmittag verheizen. Sobald das Symbol geschnitten ist,
in `config/last-asylum.json` auf `true` stellen.

Aus demselben Grund tippt der Bot beim Gebäude-Upgrade **nie** auf den orangen `Sofort`-Knopf
(kostet Diamanten pro Bau), sondern nur auf das grüne `Upgrade` mit Zeit.

---

## 4. Selber lernen — wenn nicht immer alles gleich aussieht

Feste Bild-Vorlagen sind schnell und genau, aber spröde: eine neue Event-Grafik, eine andere
Beschriftung, und der Treffer bleibt aus. Deshalb kann der Bot drei Dinge, die ohne exaktes
Vorbild auskommen.

### Knöpfe an der Farbe erkennen

```json
{ "farbknopf": { "rgb": [120, 181, 54], "tolerance": 38,
                 "min_w": 0.15, "max_w": 0.75, "min_h": 0.02, "max_h": 0.06,
                 "region": [0.0, 0.25, 1.0, 0.98], "min_fuellung": 0.55 } }
```

Sucht zusammenhängende Farbflächen in Knopf-Grösse — egal was draufsteht. Damit greift **eine**
Regel für `Abholen`, `Upgrade`, `Los`, `Bestätigen`, `Suchen`. Getestet an echten Bildschirmen:
grüner Abholen-Knopf, grünes Upgrade, blaues Suchen und oranges Abholen werden alle gefunden,
Karten- und Basis-Ansichten liefern trotz grüner Wiese nichts.

Die weisse Schrift mitten im Knopf zerlegt die Fläche in Streifen — deshalb verbindet der
Erkenner Zeilen-Läufe über Überlappung statt über eine reine Zeilen-Projektion. Sonst zerfällt
jeder beschriftete Knopf in zwei Hälften, und zwei Knöpfe nebeneinander verschmelzen zu einem.

### Rote Punkte abklappern

Rote Punkte sind fast immer Belohnungen. Die Regel `roter-punkt-pruefen` sucht sie über Farbe
und Grösse in der rechten Knopfspalte, tippt den Knopf **darunter** an (`"offset"` beim
`tap_match`) und lässt die Abhol-Regeln aufräumen. Der Einkaufswagen oben rechts hat auch einen
roten Punkt — der liegt in der Tabu-Zone und wird geblockt.

### Zurück geht über den Pfeil, nicht über die Taste

In diesem Spiel führt der Pfeil oben links zuverlässig eine Ebene zurück. Die Android-Zurück-Taste
macht je nach Bildschirm etwas anderes — Ansicht wechseln, App minimieren. Überall, wo der Bot
zurück will, prüft er deshalb erst auf `ui/back_arrow.png` und nimmt die Taste nur ersatzweise:

```json
{ "wenn": { "match": { "template": "ui/back_arrow.png", "region": [0.0, 0.0, 0.30, 0.15] },
            "dann":  [ { "tap_match": {} } ],
            "sonst": [ { "key": "KEYCODE_BACK" } ] } }
```

Ein Test hält fest, dass in der Konfiguration keine blinde Zurück-Taste mehr steht.

### Menüs schliessen, ohne die Ansicht zu verlassen

Tippt man ein Gebäude an, erscheint sein Knopf-Menü (`Details`, `Upgrade`, …). Das schliesst
man wieder, indem man **neben** das Gebäude tippt — die Zurück-Taste wechselt stattdessen die
ganze Ansicht. Der Bot macht das genauso; der Punkt dafür steht als `leerer_punkt` in der
Konfiguration (Standard `[0.35, 0.16]`, also links oben im Gelände). Liegt dort bei dir ein
Gebäude, verschieb ihn.

### Wirkungslose Tipps werden übersprungen

Beim Prüflauf über echte Spielbildschirme fielen **77 Tipps in 16 Bildern** auf — 63 davon auf
immer dieselben drei Stellen. Der Rundgang tippt eine Blase mehrfach an; im echten Spiel
verschwindet sie nach dem ersten Mal, aber wenn ein Tipp nicht wirkt, hämmert er ins Leere.

Der Bot merkt sich deshalb die letzte Tipp-Stelle samt Bildschirm. Will er dieselbe Stelle noch
einmal antippen und hat sich seither **nichts** geändert, überspringt er sie. Wiederholtes
Abholen an gleicher Position bleibt erlaubt — dort ändert sich ja jedes Mal etwas.

### Neustarts wiederholen nicht alles

Neunzehn Aufgaben sind auf Sofortstart gestellt. Ohne Gedächtnis würde nach jedem Absturz erneut
gespendet, aufgewertet und marschiert — die Neustart-Schleife des Autostarts macht das zum
Dauerzustand. Deshalb merkt sich der Bot in `zustand.json`, wann welche Aufgabe zuletzt lief, und
nimmt den Zeitplan nach einem Neustart dort wieder auf. Ein Test hält das fest.

Die Datei liegt neben `bot.py`; löscht man sie, fängt der Zeitplan von vorn an.

### Der Bot misst die Grösse der Oberfläche selbst

Das Spiel bemisst seine Oberfläche an der Bildschirm**höhe**, nicht an der Breite. In einem
flacheren Fenster ist bei gleicher Breite alles kleiner — Vorlagen aus einem 1440 × 3088-Bild
treffen in einem 1440 × 2560-Fenster dann nur noch mit 0,3 bis 0,65 statt über 0,9.

Statt jede Vorlage neu zu schneiden, probiert der Bot beim Start ein paar bekannte Vorlagen in
zwölf Grössen zwischen 0,50 und 1,10 durch und nimmt den Faktor, der am besten trifft — als
Median über mehrere Vorlagen, damit ein Ausreisser nichts verdirbt:

```
Groessen-Faktor der Oberflaeche neu bestimmt: 1.00 -> 0.65  belege=5
```

Der Faktor landet als `ui_skala` in der Konfiguration und gilt ab da für **alle** Vorlagen.
Danach wird alle sechs Stunden nachgeprüft; bestätigt er sich, passiert nichts.

**Faustregel fürs Protokoll:** Scores um 0,3–0,65 heissen „richtiges Motiv, falsche Grösse" —
dann ist die Kalibrierung dran. Unter 0,3 heisst „falsches Motiv".

### Der Bot lernt neue Sammel-Objekte selbst

Das Spiel bekommt laufend neue Gebäude und damit neue Ertrags-Blasen — für jede von Hand eine
Vorlage zu schneiden wäre eine Tretmühle. Deshalb lernt der Bot sie selbst:

Die Aufgabe `objekte-lernen` macht **zwei Aufnahmen im Abstand von fünf Sekunden**. Alles, was
sich dazwischen ändert und rundlich in Knopfgrösse ist, ist einsammelbar — Ertrags-Blasen tauchen
auf und verschwinden, der Rest des Bildes steht still. Diese Ausschnitte landen in
`templates/gelernt/blasen/`.

Die Regel `gelernte-objekte-einsammeln` greift sie über ein **Muster** ab:

```json
{ "match": { "template": "gelernt/blasen/*.png", "threshold": 0.90 } }
```

Ein Muster löst der Bot zur Laufzeit auf. Was immer im Ordner liegt, wird sofort mitbenutzt —
ohne dass jemand die Konfiguration anfasst. So kommen auch Blasen-Sorten dazu, die nie jemand
gesehen hat. Doppelte werden erkannt und nicht abgelegt, der Ordner ist auf 24 Vorlagen begrenzt.

Zwei Tests halten das fest: eine künstlich auftauchende Blase wird gelernt, und die gelernte
Vorlage findet sie danach wirklich.

### Jeder Lauf legt ein Bild ab

Beim Start schreibt der Bot `shots/<zeit>-start.png` in voller Auflösung. Daraus lassen sich
jederzeit neue Vorlagen schneiden — man muss nicht daran denken, vorher `capture` aufzurufen.

### Vorlagen selbst finden lassen

Knöpfe muss man nicht mehr von Hand ausmessen. `entdecke` sucht sie an ihrer Farbe und legt
jeden Fund nummeriert ab:

```bash
python3 bot.py entdecke                      # sucht im aktuellen Bildschirm
python3 bot.py entdecke --image shots/x.png  # oder in einer Datei
```

Ausgabe:

```
Bildschirm 1440x2560 – 8 Kandidaten:

  Nr  Farbe         Groesse  Lage
   1  rot          57x56     oben rechts (x=0.80 y=0.05)
   4  weiss        98x57     untere Mitte links (x=0.07 y=0.61)
   8  orange      122x127    unten links (x=0.09 y=0.93)
```

Die Lage-Angabe ist wichtig: damit lässt sich ein Fund **allein aus der Textausgabe** zuordnen,
ohne das Bild anzusehen. Praktisch, wenn Screenshots nur verkleinert weitergegeben werden können.

In `shots/entdeckt.png` sind alle Funde eingerahmt, die Einzelbilder liegen unter
`templates/entdeckt/01.png …`. Passt einer, wird er mit einem Befehl zur echten Vorlage:

```bash
python3 bot.py entdecke --nimm 6 --als ui/btn_alles_abholen
```

Findet er zu wenig, die Grenzen lockern: `--min-breite 60 --min-hoehe 40`.

**Ertrags-Blasen gehen ohne Zuordnen:**

```bash
python3 bot.py entdecke --blasen
```

Das übernimmt alle gefundenen Blasen auf einmal nach `templates/gelernt/blasen/` — genau dorthin,
wo die Sammel-Regel per Muster ohnehin nachschaut. Keine Nummern, kein Zuordnen, kein Neustart.

**Warum das nötig ist:** das Spiel skaliert seine Oberfläche nach der Bildschirm*höhe*. Vorlagen
aus einem 1440 × 3088-Screenshot sind in einem 1440 × 2560-Fenster zu gross und treffen dann mit
0,3 bis 0,65 statt über 0,9. Solche Werte im Protokoll heissen immer: richtiges Motiv, falsche
Grösse — dann neu schneiden.

### Schwellen aus echten Läufen nachjustieren

Jeder Bildvergleich landet mit seinem Score im Protokoll. Danach:

```bash
python3 bot.py run --minutes 60 --jsonl logs/lauf.jsonl
python3 bot.py lernen logs/*.jsonl              # nur anzeigen
python3 bot.py lernen logs/*.jsonl --anwenden   # in die Konfiguration schreiben
```

Die Auswertung zeigt pro Template, wie tief ein echter Treffer schon war und wie hoch der beste
Fehlschlag — und legt die Schwelle in die Lücke dazwischen. Bleibt eine Überlappung, steht
`unklar` da: dann ist das Template zu unspezifisch und sollte neu geschnitten werden.

### Täglich wechselnde Events

Der `Vorfall`-Bildschirm hat jeden Tag andere Reiter — Überlebenskampf, Käsefalle,
Untoten-Belagerung, „Weitere Events". Für jedes ein Template zu pflegen wäre eine Tretmühle.
Stattdessen erkennt der Bot nur die **Überschrift `Vorfall`** (sitzt in allen Ansichten mit
1.00, sonst nirgends), wischt die Reiterleiste durch und holt überall ab, was abholbar ist.

Der graue `Abholen` (noch nicht verdient) sieht dem grünen zum Verwechseln ähnlich — gemessen
liegt er bei unter 0.60 gegen die grüne Vorlage, wird also nicht angetippt.

### Aufgaben nur zu bestimmten Zeiten

```json
{ "name": "schild-pruefen", "wochentage": [4, 5, 6], "stunden": [[18, 23]] }
```

`wochentage` zählt ab Montag = 0. Gedacht für Schilde am Wochenende, wenn bei Events Spieler
von anderen Servern herüberkommen.

---

## 5. Die Tagesroutine

Im Spiel gibt es immer etwas zu tun — die Kunst ist, es *nicht* zu überbuchen. Die Takte sind so
gewählt, dass alle Aufgaben zusammen rund ein Viertel des Tages brauchen. Der Rest gehört den
reaktiven Regeln: Belohnungen, Ertrags-Blasen, Dialoge, Allianz-Hilfe. Stünde der Zeitplan zu
dicht, würden sich die Aufgaben stauen und genau diese Regeln kämen kaum noch dran.

| Takt | Aufgabe | Warum dieser Rhythmus |
|---|---|---|
| 15 min | Sammeln (4 Trupps) | wichtigste Dauerquelle — sobald ein Marsch-Platz frei wird, soll er wieder besetzt sein |
| 30 min | Zuflucht abernten, Rückkehr in die Basis | Kräuter wachsen laufend nach |
| 45 min | Basis-Rundgang | Kamera über die ganze Basis, Ertrags-Blasen abräumen |
| 60 min | Allianz-Geschenke, Forschung, Truppe 1, Heilen, Soldaten ausbilden | nichts läuft schneller voll |
| 90 min | Kisten öffnen | |
| 2 h | Tagesziele, Events, Chat-Schätze, Objekte lernen | |
| 4 h | **Bauen und Aufwerten**, Allianz-Spende, Nachrichten | bei hohem Gebiet-Level laufen Bauten *tagelang* — öfter nachsehen bringt nichts |
| 6 h | Admin-Nachricht im Allianz-Chat | mehr wäre Spam |
| 8 h | Beschleuniger einsetzen | Beschleuniger sind knapp; wer sie gar nicht automatisch verbrauchen will, setzt `"enabled": false` |

**Faustregel beim Ändern:** Laufzeit × Häufigkeit aufsummieren und unter der Hälfte des Tages
bleiben.

---

## 6. Geld: was erlaubt ist und was nicht

* **Spiel-Währung ist frei.** Diamanten, Ressourcen und Beschleuniger darf der Bot
  ausgeben — das passiert in normalen Spieldialogen.
* **Echtes Geld ist gesperrt.** In `tabu_regionen` steht der Bereich, in den der Bot **niemals**
  tippt: die rechte obere Ecke bis 14,5 % Bildhöhe — Einkaufswagen, Diamanten-Aufladung und das
  `Tagesangebot` mit CHF-Preis. Jeder Tipp dorthin wird verworfen und protokolliert, egal von
  welcher Regel er kommt.
* **Links oben darf nie gesperrt werden.** Dort sitzt der Zurück-Pfeil. Eine früher auf Verdacht
  angelegte Zone hat im Betrieb genau den blockiert — der Bot kam nicht mehr zurück. Ein Test
  prüft jetzt, dass keine Sperrzone in den Bereich `[0, 0, 0.30, 0.15]` ragt.
* Deine eine Aufgabe dabei: **schneide nie ein Template von einem Knopf mit Preisschild**
  (CHF/EUR/USD). Dann kann auch nichts schiefgehen.
* **Ausdauer-Fläschchen bleiben liegen.** Der Bot jagt Monster, bis die Ausdauer alle ist,
  füllt sie aber nie nach — weder über das Plus neben der Anzeige noch über ein Fläschchen aus
  der Tasche. Geht sie aus, öffnet das Spiel einen Nachfüll-Dialog; den **schliessen** die
  Dialog-Regeln (Priorität 199/200), bevor die generische Grün-Knopf-Regel (145) ihn bestätigen
  könnte. Ein Test hält diese Reihenfolge fest. Schneide entsprechend **nie** ein Template von
  einem `Benutzen` oder `Bestätigen` aus einem Ausdauer-Dialog.
* **Diamanten: der Bot kann Preise nicht lesen.** Für die Bildsuche sieht `2 Spenden` genauso
  aus wie `50 Spenden` oder `500 Spenden` — nur die Ziffern unterscheiden sich, und die sind
  bewusst nicht Teil der Vorlagen. Eine Obergrenze „bis 50 Diamanten pro Klick" liesse sich
  also nicht einhalten. Deshalb tippt der Bot **von sich aus nur Knöpfe an, die reine
  Ressourcen kosten** (blaue Spende, Kräuter). Die Diamanten-Spende liegt als eigene Aufgabe
  `allianz-spenden-diamanten` bereit und steht auf `"enabled": false`. Wer sie einschaltet,
  gibt die Kostenkontrolle ab — die Allianz-Spende beginnt bei 2 💎 und steigt mit jeder
  Spende. `Sofort` beim Gebäude-Upgrade (vierstellig) bleibt in jedem Fall unangetastet.
* Angebote tauchen auch ausserhalb der Tabu-Zone auf (z. B. „Toller Wert" mit CHF 17.50 auf
  halber Höhe). Die greifen trotzdem nicht: der einzige Erkenner ohne Vorlage sucht **grüne**
  Knöpfe, Preis-Knöpfe sind orange — und jede andere Berührung setzt ein Template voraus,
  das du selbst geschnitten hast.

Ein Test hält das dauerhaft fest: `test_tabu_zone_blockiert_kauf_tipp`.

---

## 7. Chat (Allianz-Admin)

```json
{ "type_text": { "pool": "allianz_admin" } }
```

Die Texte stehen unter `texte` in der Konfiguration; der Bot wählt zufällig einen aus und
wiederholt nie zweimal denselben hintereinander.

**Umlaute:** `adb shell input text` kann nur ASCII — `ä/ö/ü/ß` werden automatisch zu
`ae/oe/ue/ss`, Emojis fallen weg. Wer echte Umlaute will, installiert die App
**ADBKeyboard**, aktiviert sie als Tastatur und setzt in der Konfiguration
`"input_method": "adbkeyboard"`.

Die Chat-Aufgabe läuft alle 4 Stunden: Chat öffnen → Reiter `Allianz` → Eingabefeld → tippen →
senden. **Prüfe den ersten Lauf**: gesendet wird über den blauen `+`-Knopf rechts unten. Falls der
bei dir nur Anhänge öffnet statt zu senden, schneide den echten Sende-Knopf neu nach
`templates/chat/senden.png` — der Rest bleibt gleich.

---

## 8. Mehrere Accounts / mehrere Geräte

Der Bot ist pro Lauf an genau ein Gerät gebunden. Für mehrere Accounts startest du mehrere
Emulator-Instanzen und pro Instanz einen Bot:

```bash
python3 bot.py run -s 127.0.0.1:5555 --jsonl logs/haupt.jsonl  &
python3 bot.py run -s 127.0.0.1:5565 --jsonl logs/farm1.jsonl --config config/farm.json &
```

Accounts **anlegen** muss ein Mensch (Gast- oder Google-Login, ggf. 2FA). Beachte auch:
Mehrfach-Accounts und Automatisierung verstossen bei den meisten Mobile-Strategiespielen
gegen die Nutzungsbedingungen — im schlimmsten Fall wird gesperrt. Deshalb: menschliche
Tippstreuung und Pausen sind eingebaut (`loop_delay`, Zufalls-Versatz beim Tippen), aber
ein Restrisiko bleibt deine Entscheidung.

---

## 9. Konfiguration in Kurzform

Eine Konfiguration hat **Regeln** (reagieren auf das, was gerade zu sehen ist) und
**Aufgaben** (laufen nach Zeitplan).

```jsonc
{
  "package": "com.phs.global",
  "base_width": 1440,          // Breite, aus der die Templates stammen
  "default_threshold": 0.88,
  "loop_delay": [1.2, 2.4],    // zufällige Pause zwischen zwei Durchläufen
  "regel_vorrang": 190,        // Regeln ab dieser Priorität schlagen jede fällige Aufgabe
  "stuck_seconds": 300,        // bewegt sich das Bild so lange nicht → on_stuck
  "tabu_regionen": [ ... ],
  "texte":  { "allianz_admin": ["..."] },
  "rules":  [ { "name": "...", "priority": 200, "match": {...}, "do": [...] } ],
  "tasks":  [ { "name": "...", "every": 1800, "at_start": true, "do": [...] } ]
}
```

**Bedingungen** (`match`)

| Form | Bedeutung |
|---|---|
| `{"template": "x.png", "threshold": 0.88, "region": [l,t,r,b], "optional": true}` | Bild suchen. `region` in 0…1 relativ. `optional` = fehlt die Datei, gilt es als „nicht gefunden" statt als Fehler |
| `{"template": "gelernt/blasen/*.png"}` | **Muster** — alle passenden Dateien werden probiert, der beste Treffer gewinnt. Neue Dateien wirken sofort. |
| `{"pixel": [0.5,0.5], "rgb": [0,200,0], "tolerance": 20}` | einzelnen Bildpunkt auf Farbe prüfen |
| `{"farbknopf": {...}}` | Knopf an Farbe und Grösse finden, ohne Template (siehe Abschnitt 4) |
| `{"any": [...]}`, `{"all": [...]}`, `{"not": {...}}` | verknüpfen |
| `{"always": true}` | trifft immer |

**Aktionen** (`do`)

| Aktion | Wirkung |
|---|---|
| `{"tap_match": {"offset": [dx, dy]}}` | tippt den Treffer an (mit Zufallsstreuung); `offset` verschiebt das Ziel, z. B. vom roten Punkt auf den Knopf darunter |
| `{"tap_template": {"template": "x.png", "optional": true, "after": 2}}` | sucht neu und tippt; `after` = Pause danach |
| `{"tap_first": {"of": ["a.png","b.png"], "fallback": [0.5,0.9]}}` | erstes gefundenes antippen, sonst den Ersatzpunkt |
| `{"tap": [0.5, 0.9]}` | Punkt antippen; eine **Liste** von Punkten → einer davon wird zufällig gewählt |
| `{"swipe": [x1,y1,x2,y2,ms]}` | schneller Wisch — für Listen, die scrollen sollen |
| `{"drag": [x1,y1,x2,y2,ms]}` | gedrückt halten und ziehen (Standard 1200 ms) — **so** verschiebt man die Stadtansicht; ein kurzer Wisch bewegt sie nicht |
| `{"key": "KEYCODE_BACK"}`, `{"back": true}` | Taste |
| `{"sleep": 1.5}` oder `{"sleep": [1,2]}` | Pause (Bereich = zufällig) |
| `{"wait_template": {"template": "x.png", "timeout": 60, "tap": true}}` | warten bis etwas erscheint |
| `{"wenn": {"match": {...}, "dann": [...], "sonst": [...]}}` | **Verzweigung** — damit entscheidet der Bot selbst |
| `{"repeat": {"times": 5, "do": [...]}}` | wiederholen |
| `{"type_text": {"pool": "name"}}` | Text tippen |
| `{"lerne_objekte": {"ordner": "gelernt/blasen"}}` | zwei Aufnahmen vergleichen und neue Sammel-Objekte daraus lernen |
| `{"restart_app": 30}`, `{"start_app": true}`, `{"stop_app": true}` | App steuern |
| `{"screenshot": "name"}`, `{"log": "text"}`, `{"stop": true}` | Hilfsmittel |
| `{"run_task": "name"}` | andere Aufgabe ausführen |

---

## 10. Ohne Handy testen

```bash
# Spielzeug-Beispiel erzeugen und durchlaufen lassen
python3 tools/make_demo.py
python3 bot.py replay demo/frames --config config/demo.json

# Eigene Screenshots durchspielen: ein Bild = ein Durchlauf, es wird nichts angetippt
python3 bot.py replay shots/meine-bilder

# Tests
python3 -m unittest discover -s tests -v
```

`replay` ist das beste Werkzeug zum Einstellen: sammle Screenshots von allen Bildschirmen,
lass den Bot darüberlaufen und schau, welche Regel greift.

---

## 11. Wenn etwas klemmt

| Symptom | Ursache / Lösung |
|---|---|
| `adb nicht gefunden` | Platform-Tools installieren oder `--adb /pfad/zu/adb` |
| `Kein Gerät gefunden` | USB-Debugging aus, Kabel nur zum Laden, oder Vertrauens-Abfrage nicht bestätigt |
| Bildsuche dauert Sekunden | `pip install numpy` |
| Template wird nie gefunden | `bot.py find --threshold 0.6` und den echten Score ansehen; oft ist ein Timer mitgeschnitten |
| Bot tippt daneben | `base_width` stimmt nicht mit der Screenshot-Breite überein |
| Bot hängt in einem Menü | `on_unknown` / `on_stuck` greifen nach 5 bzw. 300 s; die Screenshots dazu landen in `shots/` |
| `screencap: unerwartetes Format` | seltene ROM — dann liefert `adb exec-out screencap -p` PNG, das wird automatisch erkannt |

Alle unbekannten Bildschirme landen als PNG in `shots/` — genau die sind die Vorlage für
die nächsten Templates.

---

## 12. Aufbau

```
bot.py                 Kommandozeile (devices, package, capture, crop, check, find, run, replay)
laa/image.py           Bild-Klasse, PNG lesen/schreiben, Skalierung — ohne PIL
laa/matcher.py         Template-Suche: grob (Integralbilder) → fein (volle Auflösung)
laa/adb.py             Gerätezugriff + FakeDevice für Tests
laa/config.py          JSON-Konfiguration laden und prüfen
laa/engine.py          die Schleife: sehen → entscheiden → tippen
laa/log.py             Konsole + JSONL
config/last-asylum.json  die echte Konfiguration
templates/             die Bild-Vorlagen
tests/test_bot.py      52 Tests, laufen ohne Handy
```
