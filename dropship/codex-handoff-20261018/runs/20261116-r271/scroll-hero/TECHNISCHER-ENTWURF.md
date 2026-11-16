# R271 – Begrenzter Scroll-Hero: technischer Entwurf

Lokaler Prototyp, keine Themeänderung und kein fertiger Film. Die Videoanalyse des YouTube-Links ist eine Gestaltungsreferenz; die dort gezeigte Parfümmarke, Assets und Hostingangebote werden nicht übernommen.

## Verhalten

- Ein eigener 15-Sekunden-Master wird innerhalb eines begrenzten Sticky-Abschnitts durch normales Seitenscrollen positioniert. Nach unten läuft die Position vorwärts, nach oben zurück; ohne Scrolländerung hält das Bild. Das ist Scrubbing und kein automatisch abgespieltes Video.
- Keine Wheel-/Touch-Sperre, kein `preventDefault`, kein künstliches `scrollTo`. Weiterer Seiteninhalt bleibt normal erreichbar. Der Sticky-Bereich sollte höchstens ungefähr zwei Bildschirmhöhen lang sein; seine tatsächliche mobile Höhe wird erst mit dem realen Header geprüft.
- Die aktuelle R269-Gestaltung und das vorhandene Atelier-Poster bleiben Basis. Ein eigener DOM-Owner `[data-scroll-video]` verhindert, dass das alte Hero-Skript seinen automatischen Videozweig übernimmt. `[data-hero-media]`, `[data-hero-video]` und `[data-hero-toggle]` dürfen im neuen Pfad nicht zusätzlich erscheinen.
- Es gibt einen sichtbaren Knopf zum Anhalten und Fortsetzen des Scroll-Effekts. Anhalten ist dauerhaft bis zur bewussten Fortsetzung. Eine native Fortschrittsleiste erlaubt Tastatursteuerung; ihre Bedienung friert die automatische Scrollbindung ein. Status: «Beim Scrollen», «Angehalten» oder «Manuelle Position».

## Zustände und Fallback

1. **Poster:** initial immer sichtbar, keine MP4-Quelle gesetzt. Keine JavaScript-Unterstützung, Fehler, Reduced Motion oder konservativ erkannte schwache Verbindung führen zum Poster.
2. **Laden:** erst im sichtbaren Abschnitt, ohne Reduced Motion oder Save Data, wird die bestätigte MP4-Quelle gesetzt. Kein `play()`-Aufruf.
3. **Scrollgebunden:** nach gültigen Metadaten wird `currentTime` höchstens einmal je Animation Frame gesetzt; solange ein Seek läuft, bleibt nur die neueste Zielposition relevant. `seeked` übernimmt danach den aktuellen Stand.
4. **Angehalten/manuell:** keine automatische Zeitänderung durch Scrollen. Der Nutzer kann mit der nativen Range-Steuerung Einzelpositionen wählen.
5. **Inaktiv:** ausserhalb des Viewports beziehungsweise bei verborgenem Tab Poster, keine laufende rAF-Schleife und keine neuen Seeks. Die intern gemerkte Position bleibt für die Rückkehr erhalten.
6. **Reduced Motion:** Poster und kein bewegtes Video, auch nicht durch einen Play-Knopf übersteuerbar. Die Auswahl wird bei Laufzeitänderung erneut berücksichtigt.

Die Geräteprüfung ist eine konservative Heuristik anhand von Save Data, 2G beziehungsweise gemeldeten höchstens 2 GB Gerätespeicher; sie ist kein Benchmark oder universeller Nachweis schwacher Hardware. Bei unbekannter Geräteleistung entscheidet vor allem ein begrenztes, praktisch getestetes Filmformat. Eine merchant-konfigurierbare `forcePoster`-Option bleibt möglich.

## Markup- und Integrationsvertrag

Der Controller erwartet einen Container mit `[data-scroll-stage]`, einem dekorativen `video[data-scroll-video][data-src]`, `[data-scroll-controls]`, einem echten Button `[data-scroll-hold]`, einer nativen Range `[data-scroll-range]` mit min=0/max=1000/step=1 und einem bestehenden höflichen Status-Livebereich `[data-scroll-status]`.

Alle sichtbaren Namen kommen aus übersetzten owning Section-/Block-Werten. Erwartete Root-Datenattribute: `data-hold-label`, `data-resume-label`, `data-scroll-label`, `data-paused-label`, `data-manual-label`, `data-poster-label`. Kein englischer UI-Fallback wird im Modul erfunden.

Statisches CSS gehört in den einzigen `stylesheet`-Block der owning Section. Der Namespace kann beispielsweise `.lx-scroll-hero` sein. Die Bühne nutzt `position: sticky` und einen tatsächlich bestätigten Header-Inset, das Video liegt wie das Poster bildfüllend hinter dem HTML-Titel. Über `[data-has-frame]` wird erst nach vorhandenem Videoframe zur Videobühne gewechselt. Ein zusätzliches `prefers-reduced-motion: reduce`-CSS muss den Videolayer unmittelbar ausblenden, unabhängig vom nächsten JavaScript-Frame. Kein zusätzlicher Loop-Timer, kein Karussell und keine Animation der Typografie erforderlich.

`mountScrollHero(root)` gibt eine Cleanup-Funktion zurück. Ein späterer Theme-Adapter muss diese beim Section-Unload und vor erneutem Mount aufrufen. Der Prototyp verändert das bestehende `luxe-edit.js` nicht und initialisiert sich nicht selbst. Vor produktiver Integration muss die native Theme-Component-/Section-Lifecycle-Anbindung geprüft werden; AGENTS verlangt für neue zustandsbehaftete Theme-Komponenten den vorhandenen `@theme/component`-Pfad.

## Abnahme vor Einbau

- Erst ein tatsächlich gerendertes, inhaltlich geprüftes MP4 verwenden. Dauer, FPS, Produktform/-farbe/-muster und tatsächlicher Loop bleiben offen. Die 90-Credit-Ausnahme ist noch nicht freigegeben; kein Job wurde hier erstellt.
- Progressive MP4 mit Range-Unterstützung und ausreichend kurzen Keyframe-Abständen für flüssige Seeks exportieren; 4K-Quelldatei ist nicht automatisch ein geeignetes mobiles Hero-Asset. Ein schneller Server allein garantiert keine flüssige Dekodierung auf dem iPhone.
- Reale Safari-/Chrome-Mobilprüfung mit Vorwärts-/Rückwärtsscrollen, Stillstand, schwachem Netz, reduziertem Bewegungswunsch, Sprungnavigation, Tastatur und erneutem Section-Mount durchführen.
- Videoauslieferung und Speichern/Rendern auf Shopify separat bestätigen. Dieser Prototyp ist kein Nachweis einer nativen Shopify-Vorschau und kein 100-%-Abschluss des Filmblocks.

## Hier lokal geprüft

Die aktuelle Theme-AGENTS-Datei und die Motion-Referenz wurden gelesen. Der vorhandene alte Hero-Controller wurde auf Selektor- und Autoplay-Kopplung geprüft. Node-Syntax und reine Zeit-/Scroll-Grenzfälle werden separat protokolliert. Ein echter Film fehlt; Dekodierung, Range-Requests, iPhone-Performance und Native-Theme-Lifecycle wurden noch nicht geprüft.
