# Kategorie-Kacheln: Menü-Links vom Typ HTTP (16.11.2026)

Anlass: Der Besitzer meldete am 16.11. «codex seite verbessert neue memory». Codex hat die
Kategorieseiten neu gebaut (R266 bis R268, Theme `214169584007` vom Besitzer veröffentlicht).
Codex schrieb selbst: geprüft wurden 4 Fälle, keine Vollprüfung aller Kategorieseiten. Diese
Prüfung holt das nach.

## Befund (GEMESSEN 16.11. abends)

- Codex' Abschnitte `lx-collection-welten` (Kopf und Bildkacheln) und `lx-collection-details`
  (Beschreibung und Nachbar-Kategorien unten) holen die Unterkategorien aus dem Metafeld
  `lux.unterfilter` und aus dem Hauptmenü. Im Menü zählen sie nur Einträge vom Typ
  `collection_link`.
- Im Hauptmenü sind die meisten Hauptpunkte und viele Unterpunkte als normaler Link (Admin:
  `type: HTTP`) auf `/collections/<handle>` gespeichert: Damen, Herren, Geschenke, Schuhe,
  Taschen, Uhren, Beauty, Wohnen, Elektronik, Gaming, Kinder, Haustiere, Highlights, Herbst,
  Sport & Party.
- Folge: **34 Übersichtsseiten zeigen 0 Kacheln**, obwohl das Menü 3 bis 28 Unterkategorien
  nennt (u. a. `damen-mode` 28, `fitness-training` 27, `fur-ihn` 23, `sub-taschen` 22,
  `premium-geschenke` 15, `elektronik-technik` 15, `sub-haustier` 12). Blattseiten unter einem
  HTTP-Eltern-Eintrag zeigen unten keine Nachbar-Kategorien (z. B. `haustier-hunde`).
  8 weitere Seiten verlieren einzelne Kacheln (HTTP-Kinder unter einem COLLECTION-Eintrag).
- Gleiche Ursache für Seiten, die im Menü mehrfach vorkommen: Codex nimmt den letzten Treffer.
  Zeigt ein Hauptpunkt auf eine Sammlung, die darunter nochmals als Unterpunkt ohne Kinder
  steht (Beauty & Pflege, Elektronik & Technik, Topseller), bleibt die Liste leer.

## Änderung

- Neues Snippet `snippets/lx-menu-knoten.liquid`: findet die Sammlung im Menü über den Handle
  aus der Link-URL (beide Linktypen, auch `/fr/`, Emoji-Handles per `url_decode`; Links mit
  Unterpfad, Seiten und Blogs zählen nicht). Ausgabe: Kinder = Vereinigung aller Einträge,
  die auf die Sammlung zeigen (Menüreihenfolge); Eltern und Geschwister = erster Treffer in
  Menüreihenfolge.
- `patch.py` ersetzt in beiden Abschnitten nur den Menü-Abgleich und die Schleifen über
  Menü-Kinder (Objekte über `collections[handle]`). Metafelder, Kachel-Snippet, CSS, Kompakt-
  Modus, Texte bleiben Codex' Stand. Jeder Anker muss genau einmal vorkommen, sonst Abbruch.
- `apply.mjs`: Trockenlauf Vorgabe; `LIVE=1` sichert die Live-Dateien nach `sicherung/`,
  prüft per Prüfsumme, dass sie dem gesicherten Codex-Stand entsprechen, schreibt Snippet,
  dann beide Abschnitte, liest zurück. Rücknahme: `ZURUECK=1 LIVE=1 node apply.mjs`
  (nur wenn die Dateien seither niemand geändert hat; das Snippet bleibt ungenutzt liegen).

## Prüfung vor dem Einspielen

- Testansicht: dieselben Dateien als neue Dateien `*-lxtest` plus `templates/collection.lxtest.json`
  im MAIN-Theme, abrufbar mit `?view=lxtest`; die Live-Vorlage blieb dabei unberührt.
- Orakel: Kinder, Eltern und Geschwister aus dem Admin-Menü unabhängig in JavaScript gerechnet
  und mit der gerenderten Testansicht verglichen (Ergebnis unten).
- Unabhängige Prüfer (Liquid-Verhalten, Rückschritte gegen Codex' Fassung, Wirkung auf
  Handy, Seitengrösse, Google) mit Gegenprüfung je Fund.

## Lehre

Ein Abruf direkt nach `themeFilesUpsert` zeigte für `damen-mode` noch den alten Stand
(0 Kacheln), der nächste Abruf 28. Nach einem Theme-Schreibzugriff 1 bis 2 Minuten warten oder
jede Messung wiederholen, bevor man einen Fehler meldet.
