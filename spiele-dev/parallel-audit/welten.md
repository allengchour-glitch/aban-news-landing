# Welten — begrenzter Reparaturpass

Stand: 15.11.2026. Geteilter Worktree `/tmp/aban-neon-coop`, Zweig `codex/neon-flug-koop`. Keine Commits, Pushes oder Veröffentlichungen. Fremde Änderungen bleiben erhalten.

## Alle fünf Adressen

| Adresse | Einordnung und geprüfter Einstieg |
| --- | --- |
| `neon-wildnis.html` | Aktive Welt: echter Start, Bewegung, Fokusverlust, Pause, Touch. |
| `neon-park.html` | Eigenständig und als Station: Aufbau abwarten, Solo-Start, lokale Koop-Suche/Abbruch, Bewegung, Pause, Handy. |
| `neon-zusammen.html` | Tempel-Station; Direktaufruf ohne `station=1`/Raum leitet zur Wildnis um. Station separat getestet, einschließlich lokaler Koop-Suche/Abbruch. |
| `lebenspfad.html` | Aktives Brettspiel: echter Start, Menü, Tastatur-Würfeln; Lockstep-Zufall unverändert. |
| `neon-realm.html` | **Legacy-Weiterleitung**, kein separates aktives Spiel. `location.replace` nach 2,5 s, Meta-Fallback nach 3 s → Wildnis. Fusion in `spiele-dev/NEON-FUSION-PLAN.md` dokumentiert; kein Wiederbeleben des alten Spiels. Datei unverändert. |

## Bestätigte Fehler und Reparaturen

- **Wildnis:** GEMESSEN vor Änderung: `keydown(d)` → Fenster-`blur` ohne `keyup`: `keys.d=1`, Spieler x −1,2 → −1,6. Jetzt löscht Fokusverlust Tastatur, Stick, Kameragriffe und den gehaltenen Angriffs-Timer. Pause verwirft gehaltene Eingaben; ihre Tastenkürzel greifen nicht mehr in Texteingaben.
- **Zusammen:** GEMESSEN vor Änderung: dieselbe Eingabe ließ x −0,74 → 1,96 weiterlaufen. Esc änderte den Zustand nicht. Jetzt gemeinsames Zurücksetzen von Tastatur/Stick bei Fokusverlust und Pause. Solo friert die Simulation ein; Steuerknöpfe und Figurenwechsel sind währenddessen gesperrt. Beim Fortsetzen wird die Solo-Pausenzeit von der gewerteten Spielzeit abgezogen.
- **Park:** GEMESSEN vor Änderung: nach `keydown(w)` und `blur` z 49,48 → 49,22, anschließend Esc ohne Pause/Overlay. Jetzt Tastatur-/Stick-Rücksetzen und derselbe Solo-Pause-Vertrag einschließlich Fahrgeschäften/Zug und Spielzeit.
- **Park/Zusammen online:** Das Pause-Overlay sagt ausdrücklich, dass nur die eigene Steuerung pausiert und die gemeinsame Welt weiterläuft. Nachrichtenverarbeitung und Positionsmeldungen bleiben aktiv. Keine Behauptung einer gemeinsamen Netzpause.
- **Lebenspfad:** GEMESSEN vor Änderung: Start → Esc → Space ließ bei weiterhin offenem Menü die Phase `idle` → `rolling` wechseln. Jetzt sperrt `roll()` lokale Eingaben im Menü. Space in Textfeldern wird nicht abgefangen; gehaltenes Esc toggelt das Menü nicht wiederholt. `srand()`, `rollCore()`, Seed-Verbrauch und Netz-Queue-Verarbeitung bleiben unverändert.

## Gezielte QA

```sh
WELTEN_BASE_URL=http://127.0.0.1:8112 \
  node spiele-dev/parallel-audit/welten-qa.cjs
```

Konfigurierbar: `WELTEN_GAMES`, `WELTEN_OUT`, `PW_CHROME`, `PLAYWRIGHT_MODULE`. Ein frischer eigener Chromium je Adresse, nacheinander, 640×440 und 390×540; nach 120 s pro Adresse wird der Context geschlossen. Assertions liefern Exit 1 bei Fehlern; Contexts und Browser schließen in `finally`. Der Test fügt nur einen lesenden Zustandsgriff in die bestehende IIFE ein und erhält sämtliche echten Response-Header. Kein CSP-Abschalten, keine TLS-Ausnahme. Er prüft Start per Maus, verlorenes `keyup`, Touch-Abbruch, Solo-Pause/Fortsetzen, sichtbare Handyknöpfe und Menü-Würfelsperre. Legacy-Redirect wird als Redirect geprüft. Zusätzliche Kontrolle auf `pageerror` **und** `securitypolicyviolation`.

- 12 Inline-Skripte aller fünf HTML-Dateien mit `vm.Script` syntaktisch geprüft: OK.
- `node --check spiele-dev/parallel-audit/welten-qa.cjs`: OK.
- `git diff --check` für die vier geänderten Spiele: OK.
- **8112 Wildnis: PASS**, echter Start, Touch-Drag/Abbruch, verlorenes `keyup`, Pause/Fortsetzen; keine erfassten JS-/CSP-Verletzungen. Beleg `/tmp/aban-welten/final-8112.jsonl`.
- **8112 Park: TEILERGEBNIS, Exit 1** nach isoliertem Browserlauf mit 120-s-Frist. PASS: Lobby-Suche/Abbruch, Start, echter Touch-Drag/Abbruch, Eingaberücksetzen, Solo-Pause/Fortsetzen über Esc. Das mobile Pause-Overlay wurde fotografiert. Der anschließende Zugriff auf den sichtbaren `#pauseResume` wurde beim Fristende unterbrochen: **mobile Weiter-Schaltfläche und abschließende CSP-Abnahme nicht bestätigt**. Belege `/tmp/aban-welten/park-final/results.json` und `neon-park-pause-mobile.png`. Damit endete der erste Pass; der unten beschriebene gezielte Folgeauftrag ist separat protokolliert.
- Der vorangegangene Gesamtlauf auf 8112 wurde wegen des Park-Browserstillstands beendet. Danach fehlgeschlagene `newContext`-Aufrufe sind keine Spieltests. Diese Fehler bleiben im Rohprotokoll erhalten; die restlichen Adressen werden isoliert geprüft.
- 8110-Zwischenlauf: Zusammen und Lebenspfad bestanden ihre Eingabe-/Pause-Checks, Realm leitete um. Park scheiterte zunächst an der Stabilitätswartezeit der Test-Klickhilfe; diese wurde auf direktes Scrollen plus echten Mausklick umgestellt.
- **8112 isoliert: Zusammen, Lebenspfad und Realm PASS; gemeinsamer Exit 0.** Je Adresse frischer Browser. Zusammen einschließlich Touch-Abbruch, Solo-Pause und mobilem Weiter-Klick; Lebenspfad einschließlich Menü-Sperre und erneutem Würfeln nach Schließen; Realm einschließlich echter Weiterleitung. Keine erfassten JS-Fehler. Zusammen/Lebenspfad ohne CSP-Verletzung. Beleg `/tmp/aban-welten/rest-final/results.json`. Die Legacy-Realm-Seite meldete zusätzlich einen Ressourcen-404 in der Konsole; dessen URL wurde nicht erfasst, deshalb nicht als behoben gewertet.

## Offene Grenzen

- Kein Spiel ist damit „fertig“ oder vollständig durchgespielt. Kein belastbarer FPS-/Hardware-Handyvergleich; Park lädt und rendert im Software-Browser besonders schwer.
- Park zeigt weiterhin einen Hand-Aktionsknopf ohne verdrahtete Aktion; Pulte und Zug reagieren automatisch. In diesem Pass nicht umgestaltet.
- Lebenspfads Menü hält die laufende Simulation/zeitgesteuerte Ereignisse weiterhin nicht vollständig an. Nur die bestätigte versteckte Würfeleingabe wurde gesperrt; eine vollständige Pause braucht einen getrennten Entwurf für Timer und Online-Lockstep.
- Lokale Lobby-Suche/Abbruch ist kein Beweis für eine Internet-Verbindung, Voice oder vollständiges Koop-Durchspielen. Lebenspfad nutzt PeerJS direkt; sein Internet-Lobby-/Voice-Pfad ist hier nicht als erfolgreich verbunden nachgewiesen. Bestehender `__lp.nettest` bleibt lediglich eine Zustandssimulation.
- Die Elterninstanz bearbeitet `_headers`: alte Policies auf 8100/8110 blockierten GLB-Blobbilder bzw. eigene Stationen. Endgültige Prüfung nutzt 8112. Keine CSP- oder Shared-JS-Änderung in diesem Pass.

## Geänderte Pfade

`neon-wildnis.html`, `neon-park.html`, `neon-zusammen.html`, `lebenspfad.html`, `spiele-dev/parallel-audit/welten-qa.cjs`, `spiele-dev/parallel-audit/welten.md`.

## Gezielter Park-Folgeauftrag: Render-Leerlauf in Solo-Pause

Auf ausdrücklichen Folgeauftrag wurde ausschließlich der Solo-Pausenzweig in `neon-park.html` geändert: `if(paused&&!ONLINE)return;` statt zusätzlichem `renderer.render(scene,camera)`. Die rAF-Uhr wird davor weiterhin aktualisiert; Fortsetzen zeichnet die Welt wieder. Das verhindert das bisherige Weiterzeichnen der schweren Welt hinter dem Pause-Overlay. Online-Zweig unverändert.

```sh
WELTEN_BASE_URL=http://127.0.0.1:8112 WELTEN_GAMES=neon-park \
  WELTEN_PARK_MOBILE_ONLY=1 WELTEN_OUT=/tmp/aban-welten/park-idle-final \
  node spiele-dev/parallel-audit/welten-qa.cjs
```

Ein isolierter Browserlauf, 390×540, höchstens 120 s. Die neue QA-Option überspringt bereits belegte Lobby-/Tastaturprüfungen und prüft nur: echter Start, Pause, unveränderter `renderer.info.render.frame` über 300 ms, echter Touch-Tap auf Weiter, Pause geschlossen und Renderzähler wieder gestiegen. CSP/TLS bleiben unverändert. Park-Inline-JavaScript, QA-Syntax und `diff --check`: OK. **Ergebnis: PASS, Exit 0** auf 8112. Über 300 ms keine weiteren Render-Aufrufe in Solo-Pause; echter mobiler Weiter-Tap schloss die Pause, anschließend stieg der Renderzähler wieder. Keine erfassten JS-Fehler, CSP-Verletzungen oder Konsolenfehler. Beleg `/tmp/aban-welten/park-idle-final/results.json`, Screenshot daneben. Genau ein gezielter Folge-Lauf; die vorigen fehlgeschlagenen Rohprotokolle bleiben erhalten. Dieser Befund schließt die zuvor offene mobile Weiter-Schaltfläche für dieses Szenario; Hardware-FPS und Internet-Koop bleiben ungeprüft.
