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

## 1. Was der Bot heute schon kann

Diese Templates sind aus echten Screenshots geschnitten und **funktionieren sofort**:

| Bereich | Erkennt | Tut |
|---|---|---|
| Belohnungen | grüner `Abholen`-Knopf, oranger `Abholen`-Knopf | tippt ihn — **immer**, überall, mit Vorrang vor allem anderen |
| Dialoge | blaues ✖, weisses ✖ | schliesst sie, damit nichts blockiert |
| Zuflucht | Kräuter-Knöpfe, Geschenk-Blasen, grünes Geschenk, Offline-Einnahmen | erntet alles ab |
| Navigation | Burg, Welt, Held, Allianz, Nachricht, Tasche, Tagesziele, Heilen, Lupe | wechselt zwischen den Bildschirmen |
| Events | „Wertvolles Event", „Spezielles Event" | öffnet sie und holt die Belohnungen |

Die restlichen Abläufe (Schild setzen, Gebäude aufwerten, Forschung, Truppe 1 leveln,
Sammeln, Chat) sind **fertig verdrahtet**, brauchen aber je 2–4 weitere Template-Ausschnitte.
`python3 bot.py check` listet genau auf, welche fehlen. Bis dahin überspringt der Bot
diese Schritte still — er läuft trotzdem.

---

## 2. Einrichten

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

### Die offene Liste (nach Nutzen sortiert)

| Priorität | Template | Wo abschneiden |
|---|---|---|
| ★★★ | `hud/schild_aktiv.png` | Schild-Symbol im HUD, wenn ein Schutzschild läuft |
| ★★★ | `schutz/schild_setzen.png`, `schutz/schild_bestaetigen.png` | Tasche → Spezial → Schutzschild |
| ★★★ | `hud/bauschlitz_frei.png` | der Hammer links (z. B. `3/3`), wenn ein Schlitz frei ist |
| ★★★ | `ui/btn_aufwerten.png`, `ui/btn_bestaetigen.png` | Gebäude-Dialog |
| ★★☆ | `hud/forschung_frei.png`, `ui/btn_forschen.png`, `forschung/empfehlung.png` | Forschungszentrum |
| ★★☆ | `held/team1.png`, `held/aufwerten.png`, `held/ausruesten.png` | Held → Team 1 |
| ★★☆ | `allianz/hilfe.png`, `allianz/geschenke.png` | Allianz-Menü |
| ★★☆ | `sammeln/*.png` | Weltkarte → Lupe → Ressource → Suchen → Sammeln → Marschieren |
| ★☆☆ | `chat/oeffnen.png`, `chat/eingabefeld.png`, `chat/senden.png` | Allianz-Chat |
| ★☆☆ | `nav/zuflucht.png` | Umschalter am linken Bildrand zur Zuflucht |
| ★☆☆ | `ui/ad_close.png`, `ui/reconnect.png` | Werbe-✖ und Verbindungsabbruch-Dialog |

---

## 4. Geld: was erlaubt ist und was nicht

* **Spiel-Währung ist frei.** Diamanten, Ressourcen und Beschleuniger darf der Bot
  ausgeben — das passiert in normalen Spieldialogen.
* **Echtes Geld ist gesperrt.** In `tabu_regionen` stehen Bildschirm-Bereiche, in die der
  Bot **niemals** tippt (Einkaufswagen und Diamanten-Aufladung oben rechts). Jeder Tipp
  dorthin wird verworfen und protokolliert — egal von welcher Regel er kommt.
* Deine eine Aufgabe dabei: **schneide nie ein Template von einem Knopf mit Preisschild**
  (CHF/EUR/USD). Dann kann auch nichts schiefgehen.

Ein Test hält das dauerhaft fest: `test_tabu_zone_blockiert_kauf_tipp`.

---

## 5. Chat (Allianz-Admin)

```json
{ "type_text": { "pool": "allianz_admin" } }
```

Die Texte stehen unter `texte` in der Konfiguration; der Bot wählt zufällig einen aus und
wiederholt nie zweimal denselben hintereinander.

**Umlaute:** `adb shell input text` kann nur ASCII — `ä/ö/ü/ß` werden automatisch zu
`ae/oe/ue/ss`, Emojis fallen weg. Wer echte Umlaute will, installiert die App
**ADBKeyboard**, aktiviert sie als Tastatur und setzt in der Konfiguration
`"input_method": "adbkeyboard"`.

Die Chat-Aufgabe läuft alle 4 Stunden und bleibt still, solange die drei
`chat/*`-Templates fehlen — so verschickt sie nichts, bevor du sie eingerichtet hast.

---

## 6. Mehrere Accounts / mehrere Geräte

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

## 7. Konfiguration in Kurzform

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
| `{"pixel": [0.5,0.5], "rgb": [0,200,0], "tolerance": 20}` | einzelnen Bildpunkt auf Farbe prüfen |
| `{"any": [...]}`, `{"all": [...]}`, `{"not": {...}}` | verknüpfen |
| `{"always": true}` | trifft immer |

**Aktionen** (`do`)

| Aktion | Wirkung |
|---|---|
| `{"tap_match": {}}` | tippt den Treffer der Bedingung an (mit Zufallsstreuung) |
| `{"tap_template": {"template": "x.png", "optional": true, "after": 2}}` | sucht neu und tippt; `after` = Pause danach |
| `{"tap_first": {"of": ["a.png","b.png"], "fallback": [0.5,0.9]}}` | erstes gefundenes antippen, sonst den Ersatzpunkt |
| `{"tap": [0.5, 0.9]}` / `{"swipe": [x1,y1,x2,y2,ms]}` | Punkt bzw. Wisch (relativ oder in Pixeln) |
| `{"key": "KEYCODE_BACK"}`, `{"back": true}` | Taste |
| `{"sleep": 1.5}` oder `{"sleep": [1,2]}` | Pause (Bereich = zufällig) |
| `{"wait_template": {"template": "x.png", "timeout": 60, "tap": true}}` | warten bis etwas erscheint |
| `{"wenn": {"match": {...}, "dann": [...], "sonst": [...]}}` | **Verzweigung** — damit entscheidet der Bot selbst |
| `{"repeat": {"times": 5, "do": [...]}}` | wiederholen |
| `{"type_text": {"pool": "name"}}` | Text tippen |
| `{"restart_app": 30}`, `{"start_app": true}`, `{"stop_app": true}` | App steuern |
| `{"screenshot": "name"}`, `{"log": "text"}`, `{"stop": true}` | Hilfsmittel |
| `{"run_task": "name"}` | andere Aufgabe ausführen |

---

## 8. Ohne Handy testen

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

## 9. Wenn etwas klemmt

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

## 10. Aufbau

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
tests/test_bot.py      42 Tests, laufen ohne Handy
```
