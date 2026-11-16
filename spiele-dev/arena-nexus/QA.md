# Arena: Reaktor-Verteidigung

Stand 16.11.2026: implementiert, 18 CPU-/VM-Prüfungen bestanden. Echter Browserlauf:
10 bestandene Checks vor dem dokumentierten Station-Back-Fehler, danach 11
bestandene Checks im gezielten Station-/Native-Koop-Nachlauf. Beide Browser
geschlossen (`browserClosed: true`), GPU an Parent/Dungeon zurückgegeben.
Keine weiteren Browser- oder Produktänderungen nach dem Nachlauf.

Frisch geprüfter SHA256-Stand (erste zwölf Zeichen): `neon-survivor.html`
`dd64ba43b85e`, CSS `1484b0e2e6c3`, Reaktor-Regeln `c2442eec6beb`,
Reaktor-Ansicht `70d0f70939aa`, Browser-QA `02ddc1f43783`.
Alle drei Asset-Hashes stimmen mit den HTML-Referenzen überein. Namensraum
`survivor-reactor1`, Teilen auf `/neon-survivor.html?station=1`, echtes iframe-
`STATION` und stationDone sind geprüft. Alle 22 Bilder beider Läufe einzeln
mit `view_image` angesehen. Ergebnisse/Scope unten; dies ist kein natürlicher
Zehn-Minuten-Durchlauf und kein öffentlicher NAT-/TURN-Test.

Artefaktwurzel: `/workspace/aban-spiele-analyse/arcade-einzigartig/arena/`.
Der erste Rohbericht samt 14 PNGs bleibt unter `first-run/` erhalten; der grüne
gezielte Bericht samt acht PNGs liegt unter `targeted-02/`. `final-report.json`
fasst beide zusammen, ohne den historischen Fehler zu überschreiben.

## Mechanik und Grenzen

- SETZUNG: Reaktor mit 300 HP in der Mitte; kein Bau auf seiner Grundfläche.
- SETZUNG: Reparatur nur in Baupausen, 12 Schrott für höchstens 60 HP.
  Derselbe Vorrat bezahlt die vorhandenen Bauten und Turm-Upgrades.
- SETZUNG: Start mit 20 Schrott. Kleine orange Belagerer zuerst nach 8 Sekunden,
  dann alle 10 Sekunden; im Finale alle 12 Sekunden. Mauern blockieren,
  Stacheln verletzen und Türme bekämpfen sie. Belagerer hinterlassen 2 Schrott.
- SETZUNG: Kleine Angreifer verursachen 4 Reaktor-HP/s, Ansturm-Bosse 10 HP/s.
  Bei 0 HP endet der Lauf unabhängig von Spieler-Wiederbelebungen.
  Sieg erst nach NEXUS bei intaktem Reaktor. Zehn-Minuten-Struktur bleibt erhalten.
- Protokoll-Isolation: sämtliche Host-/Code-Beitritt-/offene Suchpfade verwenden
  `survivor-reactor1`, der feste offene Raum `aban-survivor-reactor1-OFEN`.
  Alte Tabs benutzen weiterhin `nsurv` / `aban-nsurv-…` und können deshalb weder
  über denselben Einladungscode noch über den offenen Raum verbunden werden.
  Der Namespace-Wechsel betrifft ausschließlich Vermittlung, keine Meta-,
  Profil-, Bestenlisten- oder sonstigen localStorage-Schlüssel.
- Teilen nach Sieg oder Niederlage verwendet Reaktor-Texte und den direkt
  spielbaren Link `https://abannews.com/neon-survivor.html?station=1`, sowohl
  nativ als auch beim Kopieren. Der Querystring allein aktiviert kein iframe-
  Stationsverhalten: `STATION` verlangt weiterhin zusätzlich einen echten Parent.
  `stationDone` und dessen Belohnungsschutz bleiben erhalten.
- GEMESSEN im kontrollierten VM-Fall ohne Gegenwehr/übrige Schwärme: erste Welle
  endet mit 234/300 Reaktor-HP. Ein vorhandener Turm verhindert im getesteten
  einzelnen Angriff sämtliche Reaktorschäden. Das belegt noch keine gesamte
  menschlich gespielte Zehn-Minuten-Balance.

## CPU: ohne Browser/GPU ausführbar

```sh
node --test spiele-dev/arena-nexus/reactor.test.cjs
```

Die VM führt das vollständige Inline-Spiel mit echten three.js-Vektoren und
Geometrien aus. Renderer, DOM, Audio und Laden sind CPU-Stubs; rAF wird kontrolliert
weitergeschaltet. Kein Netz und kein Browser. Geprüft: Zielwahl, tatsächliches
Blockieren, Stacheln/Turm, Schrott-Entscheidung, persönliche/Koop-Wiederbelebung,
Sieg/Verlust/Retry/Menü, stationDone ohne doppelte Prämie, Host-Autorität,
Snapshot-Roundtrip inklusive Turm-HP/-Stufe, Pause, ungültige/veraltete Pakete,
beide Reihenfolgen von Endereignis und Snapshot und native Transport-Schnittstelle
bis zum Versand des terminalen Snapshots (Transport in der VM nur Fixture).
Die drei neuen HTML-Assetverweise tragen die ersten zwölf SHA256-Zeichen als
`?v=`. Ein CPU-Test prüft die Hashes und Marker mit und ohne Version. Die
Browser-Station-Fixture nutzt einen URL-Marker, keine exakten Skript-Tags;
ihre Injektion hängt deshalb ebenfalls nicht vom Asset-Querystring ab.

## Browser: erst nach ausdrücklicher GPU-Übergabe

```sh
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PW_CHROME=/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome \
ARENA_NET_RENDER=manual ARENA_GPU_GRANTED=1 \
node spiele-dev/arena-nexus/browser-qa.cjs
```

Optional: `PLAYWRIGHT_MODULE`, `PW_CHROME`, `ARENA_QA_BASE` (Vorgabe
`http://127.0.0.1:8182`), `ARENA_QA_OUT` (Vorgabe
`/tmp/aban-arena-nexus-browser`), `ARENA_QA_BUDGET_MS` (Vorgabe 300000).
`ARENA_QA_ONLY=station-native` beschränkt auf Station/Koop,
`ARENA_QA_ONLY=native` auf Koop. Der tatsächlich ausgeführte Nachlauf verwendete
`station-native`, 180000 ms und Ausgabe `arena/targeted-02`; kein wiederholter
Solo-/Touch-Gesamtlauf. Eine neue Ausführung erfordert eine neue GPU-Freigabe.
Optional `ARENA_NET_RENDER=manual`: ausschließlich beim Netz-Teilfall wird
`network-render-fixture.cjs` ins Test-HTML injiziert. Der Hook unterdrückt
automatisches `renderBloom`; Spiel, UI, rAF-Zeit und native Kanäle laufen normal.
Vor jedem Koop-Screenshot wird das echte Bild einmal gezeichnet. Bericht enthält
unterdrückte/gezeichnete Frames beider Seiten. Ohne Variable zeichnen beide normal.
Solo, Touch und Station behalten in beiden Varianten ihre echte Dauerzeichnung.
Kein eigener Ersatzserver; echte Survivor-CSP und SAMEORIGIN müssen ankommen.
Nur `PW_CHROME` oder Playwrights Standard-Browserpfad, kein System-Wrapper.
Startflags ausschließlich `--no-sandbox --enable-unsafe-swiftshader`; kein
erzwungenes ANGLE-Backend. Der konkrete Browserpfad steht im Ergebnisbericht.
Ohne Freigabevariable beendet sich das Skript vor dem Playwright-Import.
Browser und dessen konkreter Prozess werden im `finally` geschlossen; ein
begrenzter Kill-Fallback betrifft ausschließlich den selbst gestarteten Prozess.

Solo/Touch/Station nutzen echte rAF-Zeit, vollständiges WebGL und unverändertes Spiel-HTML.
Er prüft Desktop, Touch-Hoch-/Querformat, native Joystick-Ereignisse, echte Klicks
und Taps auf die neue Reparatur, kontrollierten Reaktor-Verlust und NEXUS-Sieg,
Retry/Menü sowie einen echten Stations-Iframe mit postMessage-Empfang.

Koop: zwei echte Seiten, UI-Raumcode-Beitritt, native RTCPeerConnection und
main/fast-DataChannels über `?mp=local`; Host-Reparatur muss beim Gast ankommen,
Gast darf keinen Reaktorstand/Sieg setzen, Gastinput muss Host-P2 bewegen,
Verlust/Retry/Sieg müssen übereinstimmen. Session-Ende wird geprüft.
Die Browser-Prüfung protokolliert zusätzlich, dass echte Host-/Beitrittsbuttons
`survivor-reactor1` an den Transport reichen. CPU-Fixtures decken auch offene
Suche und den festen Peer-Namen ab; gemeinsames `mp.js` bleibt unverändert.
Bei `ARENA_NET_RENDER=manual` ist diese Netz-Fixture ausdrücklich kein Beleg für
die Leistung zweier gleichzeitig zeichnender 3D-Seiten. Native Kommunikation
und Zustandsänderungen bleiben real; separate Screenshots werden inspiziert.

Fixture-Grenzen stehen zusätzlich in `result.json`: Debug-Hilfen stellen
Kampfzustände her, kein natürlicher Zehn-Minuten-Sieg. Die Elternseite wird aus
`station-fixture.html` unter der Survivor-URL mit unveränderten Headern geroutet;
Wildnis-Belohnungslogik selbst bleibt außerhalb der Prüfung. BroadcastChannel
ersetzt nur öffentliches Signaling; kein PeerJS-/TURN-/NAT-Beleg. Host/Gast teilen
localStorage; separate Belohnungsspeicher sind in den getrennten VMs geprüft.

## Ausgeführte Browser-/Sichtabnahme

Erstlauf: echtes WebGL (SwiftShader), laufende Frames und Bodentextur; echte
Desktop-Reparatur, kritischer/zerstörter Reaktor, Retry, kontrollierter NEXUS-Sieg,
Menü-Rückkehr sowie Touch-Reparatur/Joystick in 390×844 und 844×390 bestanden.
Alle 14 Erstlauf-PNGs einzeln angesehen. Maschinenzustand, HP, Entscheidung
Reparatur/Bau, Verlustgrund, Gewinn und Retry lesbar; Touch-Menü im Querformat
scrollt und der echte Weiter-Tap funktioniert.

Bestätigte Funde und lokale Korrekturen vor dem Nachlauf:

- `stationBack` lag mit z-index 9 unter Endoverlays (20) und war blockiert.
  Auf 21 erhöht. Nachlauf klickt denselben echten Button erfolgreich bei Verlust
  und Sieg; Parent empfängt je einmal `mini-back`. Genau zwei stationDone mit
  Score 10 für die zwei kontrollierten Enden, keine zusätzliche Cross-Game-XP.
- Desktop-NEXUS-Leiste überdeckte den Killzähler. CSS schiebt sie auf breiten,
  hohen Ansichten neben das HUD. Nachlauf prüft die Rechtecke und zeichnet
  `koop-host-nexus-layout.png`: HUD endet x=444, Bossleiste beginnt x=560.
  Der Fix greift nicht in die zuvor geprüften Touch-Größen ein.
- Erstlauf hatte drei unspezifische Ressourcen-404 im Konsolenlog. Separate
  HTTP-Probe: `/favicon.ico` 404, `/favicon.svg` 200. Expliziter SVG-Icon-Link
  ergänzt; Nachlauf: keine HTTP-, Konsolen- oder JavaScript-Seitenfehler.

Native lokale Verbindung im Nachlauf: tatsächliche RTCPeerConnection, ICE und
Connection `connected`, Signaling `stable`, Gathering `complete`, main/fast beide
`open`. Versionsnamespace über die echten Host-/Code-Buttons bestätigt. Host-
Reparatur erscheint beim Gast; lokale Gast-Mutationsversuche und gesendetes
gefälschtes Gewinnpaket ändern den Host nicht. Echte Gasttaste bewegt Host-P2.
Reaktor-Verlust, vom Gast angeforderter Retry und NEXUS-Sieg stimmen überein;
danach echter Kanalabschluss. Die erste erfasste PC-Instanz war offenbar eine
Fähigkeitsprobe (`getStats` enthielt keine DataChannel-Zähler); es wird deshalb
kein bestimmter Paketzähler behauptet. Session-Diagnose und reale Zustandsflüsse
belegen die Verbindung.

Nur Netz-Fixture zeichnete manuell: Host 175 unterdrückte Frames / zwei echte
Screenshot-Zeichnungen, Gast 602 / drei. Alle acht Nachlauf-PNGs einzeln angesehen,
inklusive Station-Zurück, Gast-Reparatur/Verlust/Sieg, Host-NEXUS und Host-Sieg.
Solo/Touch/Station zeichneten automatisch. Grenzen zu Zehn-Minuten-Balance,
öffentlichem Signaling und gemeinsamem localStorage bleiben wie oben angegeben.

Keine Solo-/Touch-Komplettwiederholung nach den drei lokalen Korrekturen;
finaler Produktstand gezielt über Station und natives Koop geprüft. Historische
Rohberichte bleiben unverändert. Keine Commits/Veröffentlichung.
